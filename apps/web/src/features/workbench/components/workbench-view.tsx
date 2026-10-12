"use client"

import type { InteractiveExecutionMode, SavedQuery } from "@sequel/contracts"
import { copy, interpolate } from "@sequel/copy"
import { PanelLeftOpen } from "lucide-react"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import { Tooltip } from "@/components/ui/tooltip"
import { useLayoutStore } from "@/components/layout/layout-store"
import { LAYOUT } from "@/config/constants"
import { ConfiguredSqlEditor } from "@/features/editor/components/configured-sql-editor"
import type { SqlEditorCursor, SqlEditorHandle } from "@/features/editor/components/sql-editor"
import { useEnsureSandboxSession, useSandboxSession } from "@/features/sandbox/api"
import { useUpdateSavedQuery } from "@/features/saved-queries/api"
import { SchemaBrowser } from "@/features/schema-browser/components/schema-browser"
import { useSchemaTree } from "@/features/schema-browser/api"
import { usePreferences } from "@/features/settings/api"
import { ApiError } from "@/lib/api-client"
import { useHotkey } from "@/lib/hooks/use-hotkey"
import { previewSql, qualifiedName, selectColumnsSql } from "@/lib/sql-templates"
import { formatSql } from "../model/format-sql"
import { useWorksheetRun } from "../model/run-store"
import { useWorkbenchRunner } from "../model/use-runner"
import { useWorksheetStore, useWorksheetsHydrated } from "../model/worksheets-store"
import { EditorToolbar } from "./editor-toolbar"
import { ResultsPanel } from "./results-panel"
import { SaveQueryDialog } from "./save-query-dialog"
import { StatusBar } from "./status-bar"
import { UrlIntake } from "./url-intake"
import { VerticalSplit } from "./vertical-split"
import { WorksheetTabs } from "./worksheet-tabs"

const HOTKEYS = {
  run: { key: "Enter", mod: true },
  explain: { key: "Enter", mod: true, shift: true },
  save: { key: "s", mod: true },
} as const

function WorkbenchSkeleton() {
  return (
    <div className="flex h-full">
      <div className="hidden w-[280px] shrink-0 flex-col gap-2 border-r border-border bg-surface p-3 lg:flex">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton
            key={index}
            className="h-3.5"
            style={{ width: `${50 + ((index * 17) % 40)}%` }}
          />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-9 border-b border-border bg-surface" />
        <div className="h-10 border-b border-border bg-surface" />
        <div className="flex-1 bg-[var(--cm-background)]" />
        <div className="h-[42%] border-t border-border bg-surface" />
      </div>
    </div>
  )
}

type SaveDialogState = { open: boolean; saveAs: boolean }

function WorkbenchWorkspace() {
  const worksheets = useWorksheetStore((state) => state.worksheets)
  const activeId = useWorksheetStore((state) => state.activeId)
  const ensureWorksheet = useWorksheetStore((state) => state.ensureWorksheet)
  const updateSql = useWorksheetStore((state) => state.updateSql)
  const setMode = useWorksheetStore((state) => state.setMode)
  const createWorksheet = useWorksheetStore((state) => state.createWorksheet)
  const linkSaved = useWorksheetStore((state) => state.linkSaved)
  const schemaBrowserOpen = useLayoutStore((state) => state.schemaBrowserOpen)
  const setSchemaBrowserOpen = useLayoutStore((state) => state.setSchemaBrowserOpen)
  const resultsRatio = useLayoutStore((state) => state.resultsRatio)
  const setResultsRatio = useLayoutStore((state) => state.setResultsRatio)
  const preferences = usePreferences()
  const schemaTree = useSchemaTree()
  const runner = useWorkbenchRunner()
  const ensureSession = useEnsureSandboxSession()
  const updateSaved = useUpdateSavedQuery()
  const editorRef = useRef<SqlEditorHandle>(null)
  const [cursorState, setCursorState] = useState<{
    worksheetId: string
    cursor: SqlEditorCursor
  } | null>(null)
  const [saveDialog, setSaveDialog] = useState<SaveDialogState>({ open: false, saveAs: false })

  useEffect(() => {
    ensureWorksheet()
  }, [ensureWorksheet, worksheets.length])

  const worksheet = worksheets.find((item) => item.id === activeId) ?? worksheets[0] ?? null
  const run = useWorksheetRun(worksheet?.id)
  const cursor =
    cursorState && cursorState.worksheetId === worksheet?.id ? cursorState.cursor : null
  const scratchMode = worksheet?.mode === "scratch"
  const session = useSandboxSession(scratchMode)
  const scratchSchema =
    session.data?.session?.schemaName ?? ensureSession.data?.session?.schemaName ?? null

  const runCurrent = useCallback(
    (selectionOnly: boolean) => {
      if (!worksheet) {
        return
      }
      const selection = editorRef.current?.getSelection() ?? null
      if (selectionOnly && !selection) {
        return
      }
      void runner.run({
        worksheetId: worksheet.id,
        sql: selection ? selection.text : worksheet.sql,
        offset: selection ? selection.from : 0,
        document: worksheet.sql,
        mode: worksheet.mode,
      })
    },
    [worksheet, runner],
  )

  const explainCurrent = useCallback(
    (analyze: boolean) => {
      if (!worksheet) {
        return
      }
      const selection = editorRef.current?.getSelection() ?? null
      void runner.explain(
        {
          worksheetId: worksheet.id,
          sql: selection ? selection.text : worksheet.sql,
          offset: selection ? selection.from : 0,
          document: worksheet.sql,
          mode: worksheet.mode,
        },
        analyze,
      )
    },
    [worksheet, runner],
  )

  const cancelCurrent = useCallback(() => {
    if (worksheet) {
      void runner.cancel(worksheet.id)
    }
  }, [worksheet, runner])

  const save = useCallback(
    (saveAs: boolean) => {
      if (!worksheet) {
        return
      }
      if (saveAs || !worksheet.savedQueryId) {
        setSaveDialog({ open: true, saveAs })
        return
      }
      const savedQueryId = worksheet.savedQueryId
      updateSaved.mutate(
        { id: savedQueryId, body: { sqlText: worksheet.sql } },
        {
          onSuccess: (saved) => {
            linkSaved(worksheet.id, saved.id, saved.name, saved.sqlText)
            toast.success(copy.workbench.saveDialog.updated, saved.name)
          },
          onError: (error) => {
            if (error instanceof ApiError && error.isNotFound) {
              setSaveDialog({ open: true, saveAs: false })
              return
            }
            toast.fromError(error)
          },
        },
      )
    },
    [worksheet, updateSaved, linkSaved],
  )

  const onSaved = (saved: SavedQuery) => {
    if (!worksheet) {
      return
    }
    linkSaved(worksheet.id, saved.id, saved.name, saved.sqlText)
  }

  const formatCurrent = () => {
    if (!worksheet) {
      return
    }
    try {
      updateSql(worksheet.id, formatSql(worksheet.sql, preferences.editorTabSize))
    } catch {
      toast.error(copy.workbench.toolbar.formatFailed)
    }
  }

  const changeMode = (mode: InteractiveExecutionMode) => {
    if (!worksheet || mode === worksheet.mode) {
      return
    }
    const worksheetId = worksheet.id
    setMode(worksheetId, mode)
    if (mode === "scratch") {
      ensureSession.mutate(undefined, {
        onError: (error) => {
          setMode(worksheetId, "read")
          toast.fromError(error, copy.workbench.toolbar.scratchFailed)
        },
      })
    }
  }

  const openPreview = (schema: string, table: string) => {
    const sql = previewSql(schema, table)
    const id = createWorksheet({
      title: interpolate(copy.schemaBrowser.previewTabTitle, { table }),
      sql,
    })
    void runner.run({ worksheetId: id, sql, offset: 0, document: sql, mode: "read" })
  }

  const firstDataset = schemaTree.data?.schemas.find((schema) => schema.kind === "dataset")
  const previewSuggestions = (firstDataset?.tables ?? [])
    .slice(0, LAYOUT.previewSuggestions)
    .map((table) => ({
      key: `${firstDataset?.name}.${table.name}`,
      label: qualifiedName(firstDataset?.name ?? "", table.name),
      onSelect: () => openPreview(firstDataset?.name ?? "", table.name),
    }))

  const insertSelect = (schema: string, table: string, columns: readonly string[]) => {
    editorRef.current?.insertText(selectColumnsSql(schema, table, columns))
  }

  const loadFromHistory = (sql: string) => {
    createWorksheet({ sql })
    toast.info(copy.workbench.notices.loadedFromHistory)
  }

  useHotkey(HOTKEYS.run, () => runCurrent(false))
  useHotkey(HOTKEYS.explain, () => explainCurrent(false))
  useHotkey(HOTKEYS.save, () => save(false))

  if (!worksheet) {
    return <WorkbenchSkeleton />
  }

  const errorOffset = run.phase === "idle" ? (run.errorLocation?.offset ?? null) : null

  return (
    <div className="flex h-full min-h-0">
      {schemaBrowserOpen ? (
        <div
          className="hidden shrink-0 border-r border-border lg:block"
          style={{ width: LAYOUT.schemaBrowserWidth }}
        >
          <SchemaBrowser
            onInsert={(text) => editorRef.current?.insertText(text)}
            onPreview={openPreview}
            onInsertSelect={insertSelect}
            onCollapse={() => setSchemaBrowserOpen(false)}
          />
        </div>
      ) : (
        <div className="hidden w-10 shrink-0 flex-col items-center border-r border-border bg-surface py-1.5 lg:flex">
          <Tooltip content={copy.schemaBrowser.expand} side="right">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={copy.schemaBrowser.expand}
              onClick={() => setSchemaBrowserOpen(true)}
            >
              <PanelLeftOpen />
            </Button>
          </Tooltip>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <WorksheetTabs />
        <EditorToolbar
          phase={run.phase}
          kind={run.kind}
          hasSelection={(cursor?.selectionLength ?? 0) > 0}
          mode={worksheet.mode}
          scratchSchema={scratchSchema}
          scratchStarting={ensureSession.isPending}
          saving={updateSaved.isPending}
          onRun={() => runCurrent(false)}
          onRunSelection={() => runCurrent(true)}
          onExplain={explainCurrent}
          onCancel={cancelCurrent}
          onFormat={formatCurrent}
          onSave={() => save(false)}
          onSaveAs={() => save(true)}
          onModeChange={changeMode}
        />
        <VerticalSplit
          ratio={resultsRatio}
          onRatioChange={setResultsRatio}
          top={
            <ConfiguredSqlEditor
              key={worksheet.id}
              handleRef={editorRef}
              value={worksheet.sql}
              onChange={(value) => updateSql(worksheet.id, value)}
              onRun={() => runCurrent(false)}
              onExplain={() => explainCurrent(false)}
              onSave={() => save(false)}
              onCursorChange={(next) => setCursorState({ worksheetId: worksheet.id, cursor: next })}
              errorOffset={errorOffset}
              autoFocus
            />
          }
          bottom={
            <ResultsPanel
              worksheetId={worksheet.id}
              run={run}
              onCancel={cancelCurrent}
              onReveal={(offset) => editorRef.current?.revealOffset(offset)}
              onLoadSql={loadFromHistory}
              suggestions={previewSuggestions}
            />
          }
        />
        <StatusBar
          run={run}
          cursor={cursor}
          mode={worksheet.mode}
          database={schemaTree.data?.database ?? null}
          scratchSchema={scratchSchema}
        />
      </div>
      <SaveQueryDialog
        open={saveDialog.open}
        onOpenChange={(open) => setSaveDialog((state) => ({ ...state, open }))}
        sql={worksheet.sql}
        saveAs={saveDialog.saveAs}
        initial={{ name: worksheet.title }}
        onSaved={onSaved}
      />
    </div>
  )
}

function WorkbenchGate() {
  const hydrated = useWorksheetsHydrated()
  if (!hydrated) {
    return <WorkbenchSkeleton />
  }
  return (
    <>
      <UrlIntake />
      <WorkbenchWorkspace />
    </>
  )
}

export function WorkbenchView() {
  return (
    <Suspense fallback={<WorkbenchSkeleton />}>
      <WorkbenchGate />
    </Suspense>
  )
}
