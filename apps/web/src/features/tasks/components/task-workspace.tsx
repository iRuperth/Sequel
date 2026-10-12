"use client"

import type { TaskDetail } from "@sequel/contracts"
import { copy, jobStageLabels, taskModeLabels } from "@sequel/copy"
import { useQueryClient } from "@tanstack/react-query"
import { Check, FileCode, Play, Send, TriangleAlert } from "lucide-react"
import { useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { KeyCombo } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import { Tooltip } from "@/components/ui/tooltip"
import { ConfiguredSqlEditor } from "@/features/editor/components/configured-sql-editor"
import type { SqlEditorHandle } from "@/features/editor/components/sql-editor"
import { useJob } from "@/features/jobs/model/use-job"
import { useEnsureSandboxSession } from "@/features/sandbox/api"
import { useExecuteQuery } from "@/features/workbench/api"
import { cn } from "@/lib/cn"
import { createId } from "@/lib/ids"
import { useKeyLabels } from "@/lib/hooks/use-platform"
import { toneDotClass, verdictTone } from "@/lib/tones"
import { taskKeys, useSubmitTask } from "../api"
import { RESULT_TAB, type ResultTab } from "../model/constants"
import { errorOffsetFor } from "../model/sql-error"
import { type DraftState, useDraftAutosave } from "../model/use-draft-autosave"
import { GradingPanel } from "./grading-panel"
import { JobProgressRow } from "./job-progress-row"
import { type RunOutcome, RunResults } from "./run-results"
import { SubmissionsList } from "./submissions-list"

type ErrorFocus = "run" | "submission"

function DraftIndicator({ state }: { state: DraftState }) {
  if (state === "idle") {
    return null
  }
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        state === "error" ? "text-danger" : "text-fg-subtle",
      )}
    >
      {state === "saving" ? <Spinner className="size-3" /> : null}
      {state === "saved" ? <Check className="size-3 text-success" /> : null}
      {state === "dirty" ? <span className="size-1.5 rounded-full bg-fg-subtle" /> : null}
      {state === "error" ? <TriangleAlert className="size-3" /> : null}
      {state === "saving"
        ? copy.states.saving
        : state === "saved"
          ? copy.states.saved
          : state === "dirty"
            ? copy.states.unsaved
            : copy.tasks.workspace.draftFailed}
    </span>
  )
}

export function TaskWorkspace({ task }: { task: TaskDetail }) {
  const queryClient = useQueryClient()
  const keys = useKeyLabels()
  const editorRef = useRef<SqlEditorHandle>(null)
  const [initialSql] = useState(() => task.draftSql ?? "")
  const [sql, setSql] = useState(initialSql)
  const [tab, setTab] = useState<ResultTab>(
    task.latestSubmission ? RESULT_TAB.grading : RESULT_TAB.results,
  )
  const [outcome, setOutcome] = useState<RunOutcome | null>(null)
  const [errorFocus, setErrorFocus] = useState<ErrorFocus>("submission")
  const [gradingJobId, setGradingJobId] = useState<string | null>(null)
  const [feedbackJob, setFeedbackJob] = useState<{ submissionId: string; jobId: string } | null>(
    null,
  )

  const execute = useExecuteQuery()
  const ensureSandbox = useEnsureSandboxSession()
  const submit = useSubmitTask(task.id)
  const draft = useDraftAutosave(task.id, sql, initialSql, () => {
    if (task.status === "open") {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(task.id) })
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    }
  })

  const latest = task.latestSubmission
  const trackedGradingJobId = gradingJobId ?? (latest?.status === "pending" ? latest.jobId : null)
  const gradingJob = useJob(trackedGradingJobId, {
    onSettled: () => setTab(RESULT_TAB.grading),
  })
  const grading = trackedGradingJobId !== null && !gradingJob.isTerminal
  const running = execute.isPending || ensureSandbox.isPending
  const feedbackJobId =
    feedbackJob && latest?.id === feedbackJob.submissionId ? feedbackJob.jobId : null

  const runErrorOffset =
    outcome?.kind === "response" && outcome.source === sql
      ? errorOffsetFor(outcome.response.error, outcome.base)
      : null
  const submissionErrorOffset =
    latest && latest.verdict === "error" && latest.sqlText === sql
      ? errorOffsetFor(latest.error)
      : null
  const errorOffset = errorFocus === "run" ? runErrorOffset : submissionErrorOffset

  const run = async () => {
    if (running) {
      return
    }
    const selection = editorRef.current?.getSelection() ?? null
    const text = selection ? selection.text : sql
    if (!text.trim()) {
      toast.info(copy.tasks.workspace.emptySql)
      return
    }
    const source = sql
    const base = selection ? selection.from : 0
    setTab(RESULT_TAB.results)
    setErrorFocus("run")
    try {
      if (task.mode === "scratch") {
        await ensureSandbox.mutateAsync()
      }
      const response = await execute.mutateAsync({
        sql: text,
        mode: task.mode,
        requestId: createId(),
      })
      setOutcome({ kind: "response", response, source, base })
    } catch (error) {
      setOutcome({ kind: "failure", error })
    }
  }

  const onSubmit = () => {
    const text = sql
    if (!text.trim()) {
      toast.info(copy.tasks.workspace.emptySql)
      return
    }
    setErrorFocus("submission")
    submit.mutate(text, {
      onSuccess: ({ jobId }) => {
        draft.markSaved(text)
        setGradingJobId(jobId)
        toast.info(copy.tasks.workspace.submitted)
      },
      onError: (error) => toast.fromError(error),
    })
  }

  const loadSql = (value: string, message: string) => {
    setSql(value)
    editorRef.current?.focus()
    toast.info(message)
  }

  const reveal = (offset: number) => editorRef.current?.revealOffset(offset)

  const onFeedbackJob = (jobId: string) => {
    if (latest) {
      setFeedbackJob({ submissionId: latest.id, jobId })
    }
  }

  const gradingRow = grading ? (
    <JobProgressRow
      label={copy.tasks.workspace.grading}
      snapshot={gradingJob.snapshot}
      fallbackStage={jobStageLabels.queued}
      transport={gradingJob.transport}
      className="border-b border-border"
    />
  ) : null

  return (
    <section
      aria-label={copy.tasks.workspace.label}
      className="flex min-h-[720px] min-w-0 flex-1 flex-col gap-3 bg-background p-3 lg:min-h-0"
    >
      <div className="flex min-h-56 shrink-0 basis-[46%] flex-col overflow-hidden rounded-md border border-border bg-surface">
        <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border px-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <FileCode className="size-3.5 shrink-0 text-fg-muted" />
            <span className="truncate font-mono text-xs text-fg">
              {copy.tasks.workspace.editorTitle}
            </span>
            <Tooltip content={copy.workbench.modes[task.mode]}>
              <Badge variant="outline" className="cursor-default">
                {taskModeLabels[task.mode]}
              </Badge>
            </Tooltip>
            <DraftIndicator state={draft.state} />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Tooltip
              content={
                <span className="flex items-center gap-2">
                  {copy.tasks.workspace.runHint}
                  <KeyCombo keys={[keys.mod, keys.enter]} />
                </span>
              }
            >
              <Button size="sm" variant="secondary" onClick={() => void run()} loading={running}>
                {running ? null : <Play />}
                {copy.actions.run}
              </Button>
            </Tooltip>
            <Tooltip content={copy.tasks.workspace.submitHint}>
              <Button
                size="sm"
                variant="primary"
                onClick={onSubmit}
                loading={submit.isPending}
                disabled={grading}
              >
                {submit.isPending ? null : <Send />}
                {copy.actions.submit}
              </Button>
            </Tooltip>
          </div>
        </div>
        <ConfiguredSqlEditor
          value={sql}
          onChange={setSql}
          onRun={() => void run()}
          errorOffset={errorOffset}
          handleRef={editorRef}
          className="min-h-0 flex-1"
        />
      </div>
      <Tabs
        value={tab}
        onValueChange={(next) => setTab(next as ResultTab)}
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-surface"
      >
        <TabsList variant="underline" className="px-2">
          <TabsTrigger value={RESULT_TAB.results}>{copy.tasks.workspace.tabs.results}</TabsTrigger>
          <TabsTrigger value={RESULT_TAB.grading}>
            {copy.tasks.workspace.tabs.grading}
            {latest?.verdict ? (
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", toneDotClass[verdictTone[latest.verdict]])}
              />
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value={RESULT_TAB.submissions}
            count={task.attempts > 0 ? task.attempts : undefined}
          >
            {copy.tasks.workspace.tabs.submissions}
          </TabsTrigger>
        </TabsList>
        {gradingRow}
        <TabsContent value={RESULT_TAB.results} className="min-h-0 flex-1">
          <RunResults running={running} outcome={outcome} onReveal={reveal} />
        </TabsContent>
        <TabsContent value={RESULT_TAB.grading} className="min-h-0 flex-1 overflow-y-auto">
          <GradingPanel
            taskId={task.id}
            submission={latest}
            grading={
              grading || latest?.status === "pending" ? (
                <p className="flex items-center gap-2 text-sm text-fg-muted">
                  <Spinner className="size-3.5" />
                  {copy.tasks.grading.inProgress}
                </p>
              ) : null
            }
            feedbackJobId={feedbackJobId}
            onFeedbackJob={onFeedbackJob}
            onUseSql={(value) => loadSql(value, copy.tasks.review.loadedIntoEditor)}
            onReveal={latest?.sqlText === sql ? reveal : undefined}
          />
        </TabsContent>
        <TabsContent value={RESULT_TAB.submissions} className="min-h-0 flex-1 overflow-y-auto">
          <SubmissionsList
            taskId={task.id}
            onLoad={(value) => loadSql(value, copy.tasks.submissions.loaded)}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}
