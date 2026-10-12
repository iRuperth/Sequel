"use client"

import { useTheme } from "next-themes"
import { THEMES } from "@/config/theme"
import { useSchemaTree } from "@/features/schema-browser/api"
import { usePreferences } from "@/features/settings/api"
import type { SqlEditorProps } from "./sql-editor"
import { LazySqlEditor } from "./sql-editor-lazy"

export type ConfiguredSqlEditorProps = Omit<
  SqlEditorProps,
  "fontSize" | "tabSize" | "wordWrap" | "lineNumbers" | "autocomplete" | "dark" | "completionSchema"
>

export function ConfiguredSqlEditor(props: ConfiguredSqlEditorProps) {
  const preferences = usePreferences()
  const schema = useSchemaTree()
  const { resolvedTheme } = useTheme()
  return (
    <LazySqlEditor
      {...props}
      completionSchema={schema.data ?? null}
      fontSize={preferences.editorFontSize}
      tabSize={preferences.editorTabSize}
      wordWrap={preferences.editorWordWrap}
      lineNumbers={preferences.editorLineNumbers}
      autocomplete={preferences.editorAutocomplete}
      dark={resolvedTheme !== THEMES.light}
    />
  )
}
