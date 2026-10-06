import { Redis, type RedisOptions } from "ioredis"

export type RedisRole = "client" | "subscriber" | "bullmq"

export function createRedis(url: string, role: RedisRole = "client"): Redis {
  const options: RedisOptions = {
    lazyConnect: false,
    enableReadyCheck: true,
    connectionName: `sequel-${role}`,
    maxRetriesPerRequest: role === "client" ? 3 : null,
  }
  return new Redis(url, options)
}
