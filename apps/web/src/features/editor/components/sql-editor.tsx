"use client"

import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { PostgreSQL, sql } from "@codemirror/lang-sql"
import {
  bracketMatching,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import { Compartment, EditorSelection, EditorState, Prec } from "@codemirror/state"
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExtension,
  rectangularSelection,
} from "@codemirror/view"
import type { SchemaTree } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { type Ref, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/cn"
import { sqlTokenHighlighter } from "@/lib/sql-highlight"
import { buildCompletionNamespace } from "../model/completion"
import { errorMarkerField, setErrorOffset } from "../model/error-marker"
import { editorTheme } from "../model/theme"

export type SqlEditorSelection = {
  text: string
  from: number
  to: number
}

export type SqlEditorCursor = {
  line: number
  column: number
  selectionLength: number
}

export type SqlEditorHandle = {
  focus: () => void
  getValue: () => string
  getSelection: () => SqlEditorSelection | null
  insertText: (text: string) => void
  setValue: (value: string) => void
  revealOffset: (offset: number) => void
}

export type SqlEditorProps = {
  value: string
  onChange?: (value: string) => void
  completionSchema?: SchemaTree | null
  fontSize: number
  tabSize: number
  wordWrap: boolean
  lineNumbers: boolean
  autocomplete: boolean
  dark: boolean
  readOnly?: boolean
  placeholder?: string
  ariaLabel?: string
  autoFocus?: boolean
  errorOffset?: number | null
  onRun?: () => void
  onExplain?: () => void
  onSave?: () => void
  onCursorChange?: (cursor: SqlEditorCursor) => void
  handleRef?: Ref<SqlEditorHandle>
  className?: string
}

type Compartments = {
  language: Compartment
  completion: Compartment
  theme: Compartment
  gutter: Compartment
  wrap: Compartment
  tabSize: Compartment
  readOnly: Compartment
}

function createCompartments(): Compartments {
  return {
    language: new Compartment(),
    completion: new Compartment(),
    theme: new Compartment(),
    gutter: new Compartment(),
    wrap: new Compartment(),
    tabSize: new Compartment(),
    readOnly: new Compartment(),
  }
}

function gutterExtension(enabled: boolean) {
  return enabled ? [lineNumbers(), highlightActiveLineGutter()] : []
}

function tabSizeExtension(size: number) {
  return [EditorState.tabSize.of(size), indentUnit.of(" ".repeat(size))]
}

function readOnlyExtension(readOnly: boolean) {
  return [EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]
}

function completionExtension(enabled: boolean) {
  return enabled ? autocompletion({ activateOnTyping: true, icons: true }) : []
}

export function SqlEditor({
  value,
  onChange,
  completionSchema,
  fontSize,
  tabSize,
  wordWrap,
  lineNumbers: showLineNumbers,
  autocomplete,
  dark,
  readOnly = false,
  placeholder = copy.editor.placeholder,
  ariaLabel = copy.editor.ariaLabel,
  autoFocus = false,
  errorOffset = null,
  onRun,
  onExplain,
  onSave,
  onCursorChange,
  handleRef,
  className,
}: SqlEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [compartments] = useState(createCompartments)
  const namespace = useMemo(() => buildCompletionNamespace(completionSchema), [completionSchema])
  const callbacksRef = useRef({ onChange, onRun, onExplain, onSave, onCursorChange })
  const initialRef = useRef({
    value,
    namespace,
    fontSize,
    dark,
    showLineNumbers,
    wordWrap,
    tabSize,
    readOnly,
    autocomplete,
    placeholder,
    ariaLabel,
    autoFocus,
  })

  useEffect(() => {
    callbacksRef.current = { onChange, onRun, onExplain, onSave, onCursorChange }
  })

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) {
      return
    }
    const initial = initialRef.current
    const runCommand = (name: "onRun" | "onExplain" | "onSave") => () => {
      const callback = callbacksRef.current[name]
      if (!callback) {
        return false
      }
      callback()
      return true
    }
    const shortcuts = Prec.highest(
      keymap.of([
        { key: "Mod-Enter", run: runCommand("onRun"), preventDefault: true },
        { key: "Shift-Mod-Enter", run: runCommand("onExplain"), preventDefault: true },
        { key: "Mod-s", run: runCommand("onSave"), preventDefault: true },
      ]),
    )
    const listener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        callbacksRef.current.onChange?.(update.state.doc.toString())
      }
      if (update.selectionSet || update.docChanged) {
        const range = update.state.selection.main
        const line = update.state.doc.lineAt(range.head)
        callbacksRef.current.onCursorChange?.({
          line: line.number,
          column: range.head - line.from + 1,
          selectionLength: Math.abs(range.to - range.from),
        })
      }
    })
    const state = EditorState.create({
      doc: initial.value,
      extensions: [
        shortcuts,
        compartments.gutter.of(gutterExtension(initial.showLineNumbers)),
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        rectangularSelection(),
        crosshairCursor(),
        syntaxHighlighting(sqlTokenHighlighter),
        compartments.language.of(
          sql({ dialect: PostgreSQL, schema: initial.namespace, upperCaseKeywords: true }),
        ),
        compartments.completion.of(completionExtension(initial.autocomplete)),
        compartments.theme.of(editorTheme(initial.fontSize, initial.dark)),
        compartments.wrap.of(initial.wordWrap ? EditorView.lineWrapping : []),
        compartments.tabSize.of(tabSizeExtension(initial.tabSize)),
        compartments.readOnly.of(readOnlyExtension(initial.readOnly)),
        placeholderExtension(initial.placeholder),
        EditorView.contentAttributes.of({ "aria-label": initial.ariaLabel }),
        errorMarkerField,
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        listener,
      ],
    })
    const view = new EditorView({ state, parent })
    viewRef.current = view
    if (initial.autoFocus) {
      view.focus()
    }
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [compartments])

  useEffect(() => {
    const view = viewRef.current
    if (!view || view.state.doc.toString() === value) {
      return
    }
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
  }, [value])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: compartments.language.reconfigure(
        sql({ dialect: PostgreSQL, schema: namespace, upperCaseKeywords: true }),
      ),
    })
  }, [namespace, compartments])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: compartments.completion.reconfigure(completionExtension(autocomplete)),
    })
  }, [autocomplete, compartments])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: compartments.theme.reconfigure(editorTheme(fontSize, dark)),
    })
  }, [fontSize, dark, compartments])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: compartments.gutter.reconfigure(gutterExtension(showLineNumbers)),
    })
  }, [showLineNumbers, compartments])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: compartments.wrap.reconfigure(wordWrap ? EditorView.lineWrapping : []),
    })
  }, [wordWrap, compartments])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: compartments.tabSize.reconfigure(tabSizeExtension(tabSize)),
    })
  }, [tabSize, compartments])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: compartments.readOnly.reconfigure(readOnlyExtension(readOnly)),
    })
  }, [readOnly, compartments])

  useEffect(() => {
    const view = viewRef.current
    if (!view) {
      return
    }
    view.dispatch({ effects: setErrorOffset.of(errorOffset) })
    if (errorOffset !== null) {
      const position = Math.min(Math.max(errorOffset, 0), view.state.doc.length)
      view.dispatch({ effects: EditorView.scrollIntoView(position, { y: "center" }) })
    }
  }, [errorOffset])

  useImperativeHandle(
    handleRef,
    () => ({
      focus: () => viewRef.current?.focus(),
      getValue: () => viewRef.current?.state.doc.toString() ?? "",
      getSelection: () => {
        const view = viewRef.current
        if (!view) {
          return null
        }
        const range = view.state.selection.main
        if (range.empty) {
          return null
        }
        const text = view.state.sliceDoc(range.from, range.to)
        return text.trim() ? { text, from: range.from, to: range.to } : null
      },
      insertText: (text: string) => {
        const view = viewRef.current
        if (!view) {
          return
        }
        view.dispatch(
          view.state.changeByRange((range) => ({
            changes: { from: range.from, to: range.to, insert: text },
            range: EditorSelection.cursor(range.from + text.length),
          })),
        )
        view.focus()
      },
      setValue: (next: string) => {
        const view = viewRef.current
        if (!view) {
          return
        }
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } })
      },
      revealOffset: (offset: number) => {
        const view = viewRef.current
        if (!view) {
          return
        }
        const position = Math.min(Math.max(offset, 0), view.state.doc.length)
        view.dispatch({
          selection: EditorSelection.cursor(position),
          effects: EditorView.scrollIntoView(position, { y: "center" }),
        })
        view.focus()
      },
    }),
    [],
  )

  return <div ref={containerRef} className={cn("h-full min-h-0 overflow-hidden", className)} />
}
