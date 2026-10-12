import type { Redis } from "@sequel/queue"

export class JsonCache {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key)
    return value ? (JSON.parse(value) as T) : null
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds)
  }

  async delete(...keys: string[]): Promise<void> {
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    let cursor = "0"
    do {
      const [next, keys] = await this.redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 200)
      cursor = next
      await this.delete(...keys)
    } while (cursor !== "0")
  }
}
