import { splitMatches } from "../model/catalog"

export function HighlightMatch({ text, term }: { text: string; term: string }) {
  const segments = splitMatches(text, term)
  return (
    <>
      {segments.map((segment, index) =>
        segment.match ? (
          <mark key={index} className="rounded-xs bg-accent/25 text-fg">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  )
}
