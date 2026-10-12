"use client"

import type { Preferences } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import type { CSSProperties } from "react"
import { SqlCode } from "@/components/ui/sql-code"
import { cn } from "@/lib/cn"
import { PREVIEW_LINE_HEIGHT_RATIO } from "../model/preferences"

const PREVIEW_LINES = copy.settings.editor.previewSql.split("\n")
const EMPTY_LINE = " "

type EditorPreviewProps = Pick<
  Preferences,
  "editorFontSize" | "editorTabSize" | "editorWordWrap" | "editorLineNumbers"
>

export function EditorPreview({
  editorFontSize,
  editorTabSize,
  editorWordWrap,
  editorLineNumbers,
}: EditorPreviewProps) {
  const style = {
    "--preview-font-size": `${editorFontSize}px`,
    "--preview-line-height": `${Math.round(editorFontSize * PREVIEW_LINE_HEIGHT_RATIO)}px`,
    tabSize: editorTabSize,
  } as CSSProperties
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg-muted">{copy.settings.editor.preview}</span>
      <div
        className="overflow-auto rounded-md border border-border bg-background py-2"
        style={style}
        aria-label={copy.settings.editor.preview}
      >
        <div className={cn("flex flex-col", editorWordWrap ? "w-full" : "w-max min-w-full")}>
          {PREVIEW_LINES.map((line, index) => (
            <div key={index} className="flex">
              {editorLineNumbers ? (
                <span
                  aria-hidden
                  className="w-10 shrink-0 pr-3 text-right font-mono text-(length:--preview-font-size) leading-(--preview-line-height) tabular text-fg-subtle select-none"
                >
                  {index + 1}
                </span>
              ) : (
                <span aria-hidden className="w-3 shrink-0" />
              )}
              <SqlCode
                sql={line || EMPTY_LINE}
                wrap={editorWordWrap}
                className="min-w-0 flex-1 overflow-visible pr-3 text-(length:--preview-font-size) leading-(--preview-line-height)"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
