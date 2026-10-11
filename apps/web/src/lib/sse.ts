export type EventStreamHandlers = {
  onEvent: (name: string, data: string) => void
  onError: (event: Event) => void
}

export function openEventStream(
  url: string,
  eventNames: readonly string[],
  handlers: EventStreamHandlers,
): () => void {
  if (typeof EventSource === "undefined") {
    handlers.onError(new Event("error"))
    return () => undefined
  }
  const source = new EventSource(url)
  const listeners = eventNames.map((name) => {
    const listener = (event: MessageEvent<string>) => handlers.onEvent(name, event.data)
    source.addEventListener(name, listener)
    return { name, listener }
  })
  const onError = (event: Event) => {
    handlers.onError(event)
  }
  source.addEventListener("error", onError)
  return () => {
    for (const { name, listener } of listeners) {
      source.removeEventListener(name, listener)
    }
    source.removeEventListener("error", onError)
    source.close()
  }
}
