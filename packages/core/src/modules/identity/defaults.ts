import type { Preferences } from "@sequel/contracts"

export const DEFAULT_PREFERENCES: Preferences = {
  editorFontSize: 13,
  editorTabSize: 2,
  editorWordWrap: false,
  editorLineNumbers: true,
  editorAutocomplete: true,
  resultPageSize: 100,
  defaultTrack: "data_engineer",
  llmFeedbackEnabled: true,
}
