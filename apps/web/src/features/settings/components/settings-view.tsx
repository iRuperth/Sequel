"use client"

import { copy } from "@sequel/copy"
import { Info } from "lucide-react"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { DescriptionList } from "@/components/ui/description-list"
import { ErrorState } from "@/components/ui/error-state"
import { PageContainer, PageHeader } from "@/components/ui/page-header"
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton"
import { publicConfig } from "@/config/public"
import { usePreferencesQuery } from "../api"
import { LlmStatusCard } from "./llm-status-card"
import { PreferencesForm } from "./preferences-form"
import { SandboxCard } from "./sandbox-card"

const SKELETON_CARDS = [5, 1, 2] as const

function PreferencesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {SKELETON_CARDS.map((rows, index) => (
        <Card key={index}>
          <div className="flex h-10 items-center border-b border-border px-4">
            <Skeleton className="h-3 w-28" />
          </div>
          <CardBody>
            <SkeletonRows rows={rows} rowClassName="h-9" />
          </CardBody>
        </Card>
      ))}
    </div>
  )
}

function AboutCard() {
  return (
    <Card>
      <CardHeader icon={<Info />} title={copy.settings.about.title} />
      <CardBody>
        <DescriptionList
          items={[
            { label: copy.settings.about.webVersion, value: publicConfig.appVersion, mono: true },
          ]}
        />
      </CardBody>
    </Card>
  )
}

export function SettingsView() {
  const query = usePreferencesQuery()
  return (
    <PageContainer>
      <PageHeader title={copy.settings.title} description={copy.settings.description} />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          {query.isPending ? (
            <PreferencesSkeleton />
          ) : query.data ? (
            <PreferencesForm preferences={query.data} />
          ) : (
            <Card>
              <ErrorState
                error={query.error}
                onRetry={() => void query.refetch()}
                retrying={query.isFetching}
              />
            </Card>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <LlmStatusCard />
          <SandboxCard />
          <AboutCard />
        </div>
      </div>
    </PageContainer>
  )
}
