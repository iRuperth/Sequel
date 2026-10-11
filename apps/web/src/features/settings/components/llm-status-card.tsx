"use client"

import { copy } from "@sequel/copy"
import { Sparkles, TriangleAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { DescriptionList } from "@/components/ui/description-list"
import { ErrorState } from "@/components/ui/error-state"
import { SkeletonRows } from "@/components/ui/skeleton"
import { useLlmStatus } from "../api"

const llmCopy = copy.settings.llm
const SKELETON_ROWS = 2

export function LlmStatusCard() {
  const query = useLlmStatus()
  const status = query.data
  return (
    <Card>
      <CardHeader icon={<Sparkles />} title={llmCopy.title} description={llmCopy.description} />
      {query.isPending ? (
        <CardBody>
          <SkeletonRows rows={SKELETON_ROWS} rowClassName="h-9" />
        </CardBody>
      ) : !status ? (
        <ErrorState
          compact
          error={query.error}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <CardBody className="flex flex-col gap-4">
          <DescriptionList
            columns={2}
            items={[
              { label: llmCopy.provider, value: llmCopy.providers[status.provider] },
              { label: llmCopy.model, value: status.model, mono: true },
              {
                label: llmCopy.status,
                value: (
                  <Badge tone={status.configured ? "success" : "warning"} dot>
                    {status.configured ? llmCopy.configured : llmCopy.notConfigured}
                  </Badge>
                ),
              },
              {
                label: llmCopy.feedback,
                value: status.feedbackEnabled ? copy.common.enabled : copy.common.disabled,
              },
            ]}
          />
          {status.configured ? null : (
            <div className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-fg-muted">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
              <p>{llmCopy.notConfiguredHint}</p>
            </div>
          )}
        </CardBody>
      )}
    </Card>
  )
}
