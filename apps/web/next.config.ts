import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import type { NextConfig } from "next"
import { z } from "zod"

const WORKSPACE_MARKER = "pnpm-workspace.yaml"
const ENV_FILE_NAME = ".env"

function findWorkspaceRoot(start: string): string {
  let current = resolve(start)
  while (!existsSync(join(current, WORKSPACE_MARKER))) {
    const parent = dirname(current)
    if (parent === current) {
      return resolve(start)
    }
    current = parent
  }
  return current
}

const workspaceRoot = findWorkspaceRoot(process.cwd())
const envFilePath = join(workspaceRoot, ENV_FILE_NAME)
if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath)
}

const webEnvSchema = z.object({
  API_URL: z.url(),
  API_BASE_PATH: z
    .string()
    .trim()
    .regex(/^\/[A-Za-z0-9/_-]*[A-Za-z0-9_-]$/),
  JOB_POLL_INTERVAL_MS: z.coerce.number().int().positive(),
  APP_VERSION: z.string().trim().min(1),
})

const parsedEnv = webEnvSchema.safeParse(process.env)
if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
  throw new Error(`Invalid web configuration:\n${issues.join("\n")}`)
}
const env = parsedEnv.data
const apiOrigin = env.API_URL.replace(/\/+$/, "")

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  turbopack: { root: workspaceRoot },
  transpilePackages: ["@sequel/contracts", "@sequel/copy"],
  compress: false,
  poweredByHeader: false,
  reactStrictMode: true,
  agentRules: false,
  devIndicators: false,
  env: {
    NEXT_PUBLIC_API_BASE_PATH: env.API_BASE_PATH,
    NEXT_PUBLIC_JOB_POLL_INTERVAL_MS: String(env.JOB_POLL_INTERVAL_MS),
    NEXT_PUBLIC_APP_VERSION: env.APP_VERSION,
  },
  async rewrites() {
    return [
      {
        source: `${env.API_BASE_PATH}/:path*`,
        destination: `${apiOrigin}${env.API_BASE_PATH}/:path*`,
      },
    ]
  },
}

export default nextConfig
