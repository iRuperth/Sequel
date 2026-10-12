import { isAppError } from "@sequel/core"
import type { FastifyError } from "fastify"
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod"
import type { AppInstance } from "../lib/types"
import { PROBLEM_CONTENT_TYPE, problem } from "../lib/problem"

const BAD_REQUEST = 400
const NOT_FOUND = 404
const INTERNAL = 500
const PAYLOAD_TOO_LARGE = 413

export function registerErrorHandling(app: AppInstance) {
  app.setNotFoundHandler((request, reply) => {
    void reply
      .status(NOT_FOUND)
      .type(PROBLEM_CONTENT_TYPE)
      .send(problem(NOT_FOUND, "not_found", undefined, request.url))
  })

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const issues = error.validation.map((issue) => ({
        path: issue.instancePath || String(issue.params?.issue ?? ""),
        message: issue.message ?? "",
      }))
      return reply
        .status(BAD_REQUEST)
        .type(PROBLEM_CONTENT_TYPE)
        .send(problem(BAD_REQUEST, "validation_failed", undefined, request.url, issues))
    }
    if (isAppError(error)) {
      return reply
        .status(error.status)
        .type(PROBLEM_CONTENT_TYPE)
        .send(problem(error.status, error.code, error.message, request.url))
    }
    if (isResponseSerializationError(error)) {
      request.log.error({ err: error, cause: error.cause }, "response serialization failed")
    } else if ((error.statusCode ?? INTERNAL) < INTERNAL) {
      const status = error.statusCode ?? BAD_REQUEST
      const code = status === NOT_FOUND ? "not_found" : "validation_failed"
      return reply
        .status(status === PAYLOAD_TOO_LARGE ? BAD_REQUEST : status)
        .type(PROBLEM_CONTENT_TYPE)
        .send(
          problem(
            status === PAYLOAD_TOO_LARGE ? BAD_REQUEST : status,
            code,
            error.message,
            request.url,
          ),
        )
    } else {
      request.log.error({ err: error }, "unhandled error")
    }
    return reply
      .status(INTERNAL)
      .type(PROBLEM_CONTENT_TYPE)
      .send(problem(INTERNAL, "internal_error", undefined, request.url))
  })
}
