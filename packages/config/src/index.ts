import { buildApiConfig, buildCliConfig, buildCoreConfig, buildWorkerConfig } from "./build"
import { parseEnv } from "./load"
import {
  apiEnvSchema,
  cliEnvSchema,
  coreEnvSchema,
  webServerEnvSchema,
  workerEnvSchema,
} from "./schema"

export * from "./build"
export * from "./env-file"
export * from "./load"
export * from "./schema"

export const loadCoreConfig = () => buildCoreConfig(parseEnv(coreEnvSchema))
export const loadApiConfig = () => buildApiConfig(parseEnv(apiEnvSchema))
export const loadWorkerConfig = () => buildWorkerConfig(parseEnv(workerEnvSchema))
export const loadCliConfig = () => buildCliConfig(parseEnv(cliEnvSchema))
export const loadWebServerConfig = () => {
  const env = parseEnv(webServerEnvSchema)
  return { apiUrl: env.API_URL, apiBasePath: env.API_BASE_PATH }
}
