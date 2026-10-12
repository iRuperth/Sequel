import { type ApiErrorCode, type Problem, problemSchema } from "@sequel/contracts"
import { apiErrorMessages, copy, interpolate } from "@sequel/copy"
import type { z } from "zod"
import { publicConfig } from "@/config/public"

export type ApiErrorKind = "problem" | "network" | "invalid_response" | "http"

type ApiErrorInit = {
  kind: ApiErrorKind
  message: string
  status?: number | null
  code?: ApiErrorCode | null
  problem?: Problem | null
  issues?: readonly { path: string; message: string }[]
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly code: ApiErrorCode | null
  readonly problem: Problem | null
  readonly issues: readonly { path: string; message: string }[]

  constructor(init: ApiErrorInit) {
    super(init.message)
    this.name = "ApiError"
    this.kind = init.kind
    this.status = init.status ?? null
    this.code = init.code ?? null
    this.problem = init.problem ?? null
    this.issues = init.issues ?? []
  }

  get friendlyMessage(): string {
    if (this.code) {
      return apiErrorMessages[this.code]
    }
    if (this.kind === "network") {
      return copy.errors.network
    }
    if (this.kind === "invalid_response") {
      return copy.errors.invalidResponse
    }
    return interpolate(copy.errors.statusCode, { status: this.status ?? 0 })
  }

  get detail(): string | null {
    const detail = this.problem?.detail
    if (detail && detail !== this.friendlyMessage) {
      return detail
    }
    return null
  }

  get isNotFound(): boolean {
    return this.code === "not_found" || this.status === 404
  }
}

export type DescribedError = {
  message: string
  detail: string | null
}

export function describeError(error: unknown): DescribedError {
  if (error instanceof ApiError) {
    return { message: error.friendlyMessage, detail: error.detail }
  }
  if (error instanceof Error && error.message) {
    return { message: copy.errors.unexpected, detail: error.message }
  }
  return { message: copy.errors.unexpected, detail: null }
}

export type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue | readonly QueryValue[]>

export function toSearchParams(query: QueryParams | undefined): string {
  if (!query) {
    return ""
  }
  const params = new URLSearchParams()
  for (const [key, raw] of Object.entries(query)) {
    const values = Array.isArray(raw) ? raw : [raw]
    for (const value of values) {
      if (value === undefined || value === null || value === "") {
        continue
      }
      params.append(key, String(value))
    }
  }
  const search = params.toString()
  return search ? `?${search}` : ""
}

export function apiUrl(path: string, query?: QueryParams): string {
  return `${publicConfig.apiBasePath}${path}${toSearchParams(query)}`
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export type RequestOptions = {
  method?: HttpMethod
  query?: QueryParams
  body?: unknown
  signal?: AbortSignal
}

const SERVER_ERROR_THRESHOLD = 500

function fallbackCode(status: number): ApiErrorCode | null {
  if (status === 404) {
    return "not_found"
  }
  if (status === 409) {
    return "conflict"
  }
  if (status === 400 || status === 422) {
    return "validation_failed"
  }
  return null
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { accept: "application/json" }
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers,
    signal: options.signal,
    cache: "no-store",
  }
  if (options.body !== undefined) {
    headers["content-type"] = "application/json"
    init.body = JSON.stringify(options.body)
  }
  let response: Response
  try {
    response = await fetch(apiUrl(path, options.query), init)
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error
    }
    throw new ApiError({
      kind: "network",
      message: error instanceof Error ? error.message : copy.errors.network,
    })
  }
  if (response.ok) {
    return response
  }
  const payload = await readJson(response)
  const problem = problemSchema.safeParse(payload)
  if (problem.success) {
    throw new ApiError({
      kind: "problem",
      message: problem.data.detail || problem.data.title,
      status: response.status,
      code: problem.data.code,
      problem: problem.data,
      issues: problem.data.issues,
    })
  }
  if (response.status >= SERVER_ERROR_THRESHOLD) {
    throw new ApiError({
      kind: "network",
      message: response.statusText || copy.errors.network,
      status: response.status,
    })
  }
  throw new ApiError({
    kind: "http",
    message: response.statusText,
    status: response.status,
    code: fallbackCode(response.status),
  })
}

export async function apiRequest<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  options: RequestOptions = {},
): Promise<z.output<TSchema>> {
  const response = await send(path, options)
  const payload = await readJson(response)
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    throw new ApiError({
      kind: "invalid_response",
      message: copy.errors.invalidResponse,
      status: response.status,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    })
  }
  return parsed.data
}

export async function apiRequestVoid(path: string, options: RequestOptions = {}): Promise<void> {
  await send(path, options)
}

export const api = {
  get: <TSchema extends z.ZodType>(
    path: string,
    schema: TSchema,
    query?: QueryParams,
    signal?: AbortSignal,
  ) => apiRequest(path, schema, { method: "GET", query, signal }),
  post: <TSchema extends z.ZodType>(path: string, schema: TSchema, body?: unknown) =>
    apiRequest(path, schema, { method: "POST", body: body ?? {} }),
  put: <TSchema extends z.ZodType>(path: string, schema: TSchema, body: unknown) =>
    apiRequest(path, schema, { method: "PUT", body }),
  patch: <TSchema extends z.ZodType>(path: string, schema: TSchema, body: unknown) =>
    apiRequest(path, schema, { method: "PATCH", body }),
  postVoid: (path: string, body?: unknown) =>
    apiRequestVoid(path, { method: "POST", body: body ?? {} }),
  putVoid: (path: string, body: unknown) => apiRequestVoid(path, { method: "PUT", body }),
  delete: (path: string) => apiRequestVoid(path, { method: "DELETE" }),
}
