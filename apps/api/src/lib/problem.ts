import type { ApiErrorCode, Problem } from "@sequel/contracts"
import { apiErrorMessages } from "@sequel/copy"

export const PROBLEM_CONTENT_TYPE = "application/problem+json"
const PROBLEM_TYPE_BASE = "urn:sequel:problem:"

const TITLES: Record<number, string> = {
  400: "Bad Request",
  404: "Not Found",
  408: "Request Timeout",
  409: "Conflict",
  422: "Unprocessable Content",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
}

export function problem(
  status: number,
  code: ApiErrorCode,
  detail: string | undefined,
  instance: string,
  issues?: Problem["issues"],
): Problem {
  return {
    type: `${PROBLEM_TYPE_BASE}${code}`,
    title: TITLES[status] ?? TITLES[500]!,
    status,
    code,
    detail: detail ?? apiErrorMessages[code],
    instance,
    ...(issues ? { issues } : {}),
  }
}
