import { REDIS_KEYS, type Redis } from "@sequel/queue"
import type { JobSnapshot } from "@sequel/contracts"

export type JobListener = (snapshot: JobSnapshot) => void

export class JobEventHub {
  private readonly listeners = new Map<string, Set<JobListener>>()
  private started = false

  constructor(private readonly subscriber: Redis) {}

  async start(): Promise<void> {
    if (this.started) {
      return
    }
    this.started = true
    this.subscriber.on("pmessage", (_pattern: string, channel: string, message: string) => {
      const jobId = channel.slice(REDIS_KEYS.jobChannelPrefix.length)
      const listeners = this.listeners.get(jobId)
      if (!listeners) {
        return
      }
      const snapshot = JSON.parse(message) as JobSnapshot
      for (const listener of listeners) {
        listener(snapshot)
      }
    })
    await this.subscriber.psubscribe(REDIS_KEYS.jobChannelPattern)
  }

  subscribe(jobId: string, listener: JobListener): () => void {
    const set = this.listeners.get(jobId) ?? new Set<JobListener>()
    set.add(listener)
    this.listeners.set(jobId, set)
    return () => {
      set.delete(listener)
      if (set.size === 0) {
        this.listeners.delete(jobId)
      }
    }
  }
}
