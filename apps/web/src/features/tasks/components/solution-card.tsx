"use client"

import { copy } from "@sequel/copy"
import { BookOpen, SquareTerminal } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { CopyButton } from "@/components/ui/copy-button"
import { SqlCode } from "@/components/ui/sql-code"
import { routeTo } from "@/config/routes"
import { useOpenInWorkbench } from "@/features/workbench/model/open-in-workbench"
import { cn } from "@/lib/cn"
import { REFERENCE_SQL_MAX_HEIGHT } from "../model/constants"

export function SolutionCard({
  solution,
}: {
  solution: { referenceSql: string; explanation: string }
}) {
  const { linkHandler } = useOpenInWorkbench()
  return (
    <Card>
      <CardHeader
        icon={<BookOpen />}
        title={copy.tasks.solution.title}
        description={copy.tasks.solution.description}
        actions={
          <>
            <CopyButton value={solution.referenceSql} label={copy.tasks.solution.copySql} />
            <Button size="xs" variant="ghost" asChild>
              <Link
                href={routeTo.workbenchWithSql(solution.referenceSql)}
                onClick={linkHandler(solution.referenceSql)}
              >
                <SquareTerminal />
                {copy.actions.openInWorkbench}
              </Link>
            </Button>
          </>
        }
      />
      <div className="border-b border-border bg-surface-2/40 px-4 py-3">
        <SqlCode sql={solution.referenceSql} className={cn(REFERENCE_SQL_MAX_HEIGHT)} />
      </div>
      {solution.explanation ? (
        <CardBody className="flex flex-col gap-1.5">
          <h4 className="text-xs font-medium text-fg-muted">{copy.tasks.solution.explanation}</h4>
          <p className="text-sm leading-relaxed whitespace-pre-line text-fg">
            {solution.explanation}
          </p>
        </CardBody>
      ) : null}
    </Card>
  )
}
