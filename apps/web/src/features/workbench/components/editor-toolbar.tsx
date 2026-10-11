"use client"

import type { InteractiveExecutionMode } from "@sequel/contracts"
import { copy, executionModeLabels, interpolate } from "@sequel/copy"
import {
  ChevronDown,
  Eye,
  FlaskConical,
  GitBranch,
  Play,
  Save,
  Square,
  TextAlignStart,
  TextCursorInput,
} from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { KeyCombo } from "@/components/ui/kbd"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Spinner } from "@/components/ui/spinner"
import { ToolbarSeparator } from "@/components/ui/toolbar"
import { Tooltip } from "@/components/ui/tooltip"
import { useKeyLabels } from "@/lib/hooks/use-platform"
import type { RunKind, RunPhase } from "../model/run-store"

type EditorToolbarProps = {
  phase: RunPhase
  kind: RunKind | null
  hasSelection: boolean
  mode: InteractiveExecutionMode
  scratchSchema: string | null
  scratchStarting: boolean
  saving: boolean
  onRun: () => void
  onRunSelection: () => void
  onExplain: (analyze: boolean) => void
  onCancel: () => void
  onFormat: () => void
  onSave: () => void
  onSaveAs: () => void
  onModeChange: (mode: InteractiveExecutionMode) => void
}

function ShortcutTooltip({
  label,
  keys,
  children,
}: {
  label: string
  keys: readonly string[]
  children: ReactNode
}) {
  return (
    <Tooltip
      content={
        <span className="flex items-center gap-2">
          {label}
          <KeyCombo keys={keys} />
        </span>
      }
    >
      {children}
    </Tooltip>
  )
}

export function EditorToolbar({
  phase,
  kind,
  hasSelection,
  mode,
  scratchSchema,
  scratchStarting,
  saving,
  onRun,
  onRunSelection,
  onExplain,
  onCancel,
  onFormat,
  onSave,
  onSaveAs,
  onModeChange,
}: EditorToolbarProps) {
  const keys = useKeyLabels()
  const busy = phase !== "idle"
  const cancellable = busy && kind === "execute"
  return (
    <div
      role="toolbar"
      aria-label={copy.workbench.toolbar.label}
      className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-2"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {cancellable ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={phase === "cancelling"}
          >
            {phase === "cancelling" ? (
              <Spinner className="size-3.5" />
            ) : (
              <Square className="fill-current" />
            )}
            {copy.workbench.toolbar.cancel}
          </Button>
        ) : (
          <ShortcutTooltip label={copy.workbench.shortcuts.run} keys={[keys.mod, keys.enter]}>
            <Button variant="primary" size="sm" onClick={onRun} loading={busy}>
              {busy ? null : <Play className="fill-current" />}
              {copy.workbench.toolbar.run}
            </Button>
          </ShortcutTooltip>
        )}
        <Button variant="ghost" size="sm" onClick={onRunSelection} disabled={!hasSelection || busy}>
          <TextCursorInput />
          {copy.workbench.toolbar.runSelection}
        </Button>
        <div className="flex items-center">
          <ShortcutTooltip
            label={copy.workbench.shortcuts.explain}
            keys={[keys.shift, keys.mod, keys.enter]}
          >
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-none"
              onClick={() => onExplain(false)}
              disabled={busy}
            >
              <GitBranch />
              {copy.workbench.toolbar.explain}
            </Button>
          </ShortcutTooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="w-5 rounded-l-none"
                aria-label={copy.workbench.toolbar.explainMenu}
                disabled={busy}
              >
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => onExplain(false)}>
                <GitBranch />
                {copy.workbench.toolbar.explain}
                <DropdownMenuShortcut>
                  {[keys.shift, keys.mod, keys.enter].join(" ")}
                </DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onExplain(true)}>
                <Eye />
                {copy.workbench.toolbar.explainAnalyze}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ToolbarSeparator />
        <Button variant="ghost" size="sm" onClick={onFormat} disabled={busy}>
          <TextAlignStart />
          {copy.workbench.toolbar.format}
        </Button>
        <div className="flex items-center">
          <ShortcutTooltip label={copy.workbench.shortcuts.save} keys={[keys.mod, keys.s]}>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-none"
              onClick={onSave}
              loading={saving}
            >
              {saving ? null : <Save />}
              {copy.workbench.toolbar.save}
            </Button>
          </ShortcutTooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="w-5 rounded-l-none"
                aria-label={copy.workbench.toolbar.saveMenu}
              >
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={onSave}>
                <Save />
                {copy.workbench.toolbar.save}
                <DropdownMenuShortcut>{[keys.mod, keys.s].join(" ")}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onSaveAs}>
                <Save />
                {copy.workbench.toolbar.saveAs}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {mode === "scratch" ? (
          <span className="flex items-center gap-1.5 text-xs text-fg-muted">
            {scratchStarting ? (
              <>
                <Spinner className="size-3" />
                {copy.workbench.toolbar.scratchStarting}
              </>
            ) : scratchSchema ? (
              <span className="font-mono text-2xs">
                {interpolate(copy.workbench.toolbar.scratchSchema, { schema: scratchSchema })}
              </span>
            ) : null}
          </span>
        ) : null}
        <SegmentedControl
          ariaLabel={copy.workbench.toolbar.modeLabel}
          value={mode}
          onValueChange={onModeChange}
          options={[
            {
              value: "read",
              label: (
                <Tooltip content={copy.workbench.modes.read}>
                  <span className="flex items-center gap-1.5">
                    <Eye />
                    {executionModeLabels.read}
                  </span>
                </Tooltip>
              ),
            },
            {
              value: "scratch",
              label: (
                <Tooltip content={copy.workbench.modes.scratch}>
                  <span className="flex items-center gap-1.5">
                    <FlaskConical />
                    {executionModeLabels.scratch}
                  </span>
                </Tooltip>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
