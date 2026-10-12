import { EditorView } from "@codemirror/view"

const LINE_HEIGHT = 1.65

export function editorTheme(fontSize: number, dark: boolean) {
  return EditorView.theme(
    {
      "&": {
        height: "100%",
        fontSize: `${fontSize}px`,
        backgroundColor: "var(--cm-background)",
        color: "var(--cm-identifier)",
      },
      "&.cm-focused": { outline: "none" },
      ".cm-scroller": {
        fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
        lineHeight: String(LINE_HEIGHT),
      },
      ".cm-content": {
        caretColor: "var(--cm-cursor)",
        padding: "10px 0",
      },
      ".cm-line": { padding: "0 14px 0 10px" },
      ".cm-gutters": {
        backgroundColor: "var(--cm-gutter)",
        color: "var(--cm-gutter-fg)",
        border: "none",
        borderRight: "1px solid var(--border)",
      },
      ".cm-lineNumbers .cm-gutterElement": {
        minWidth: "36px",
        padding: "0 8px 0 10px",
      },
      ".cm-activeLine": { backgroundColor: "var(--cm-active-line)" },
      ".cm-activeLineGutter": {
        backgroundColor: "var(--cm-active-gutter)",
        color: "var(--fg-muted)",
      },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--cm-cursor)", borderLeftWidth: "2px" },
      "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        { backgroundColor: "var(--cm-selection)" },
      ".cm-selectionMatch": { backgroundColor: "var(--cm-match)" },
      "&.cm-focused .cm-matchingBracket": {
        backgroundColor: "var(--cm-match)",
        outline: "1px solid var(--border-strong)",
      },
      ".cm-placeholder": { color: "var(--fg-subtle)", fontStyle: "italic" },
      ".cm-tooltip": {
        backgroundColor: "var(--surface)",
        color: "var(--fg)",
        border: "1px solid var(--border-strong)",
        borderRadius: "6px",
        overflow: "hidden",
      },
      ".cm-tooltip.cm-tooltip-autocomplete > ul": {
        fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
        fontSize: "12px",
        maxHeight: "260px",
        padding: "4px",
      },
      ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
        padding: "3px 8px",
        borderRadius: "4px",
        lineHeight: "18px",
      },
      ".cm-tooltip-autocomplete ul li[aria-selected]": {
        backgroundColor: "var(--surface-3)",
        color: "var(--fg)",
      },
      ".cm-completionDetail": {
        color: "var(--fg-subtle)",
        fontStyle: "normal",
        marginLeft: "12px",
        float: "right",
      },
      ".cm-completionMatchedText": {
        textDecoration: "none",
        color: "var(--accent-2)",
        fontWeight: "600",
      },
      ".cm-completionIcon": { opacity: "0.6", width: "1.4em" },
      ".cm-panels": {
        backgroundColor: "var(--surface-2)",
        color: "var(--fg)",
        borderColor: "var(--border)",
      },
      ".cm-panels.cm-panels-top": { borderBottom: "1px solid var(--border)" },
      ".cm-panel.cm-search": { padding: "6px 10px", fontFamily: "var(--font-inter), sans-serif" },
      ".cm-panel.cm-search input, .cm-panel.cm-search button": {
        backgroundColor: "var(--surface)",
        color: "var(--fg)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        backgroundImage: "none",
      },
      ".cm-searchMatch": {
        backgroundColor: "var(--cm-match)",
        outline: "1px solid var(--border-strong)",
      },
      ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "var(--cm-selection)" },
      ".cm-foldPlaceholder": {
        backgroundColor: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: "var(--fg-muted)",
      },
    },
    { dark },
  )
}
