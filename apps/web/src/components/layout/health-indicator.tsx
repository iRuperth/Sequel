"use client"

import { copy, serviceNameLabels, serviceStateLabels } from "@sequel/copy"
import Link from "next/link"
import { StatusDot } from "@/components/ui/status-dot"
import { Tooltip } from "@/components/ui/tooltip"
import { ROUTES } from "@/config/routes"
import { usePlatformStatus } from "@/features/status/api"
import { type OverallState, overallState } from "@/features/status/model/overall"
import { OVERALL_TONE } from "@/features/status/model/presentation"
import { type Tone, serviceStateTone } from "@/lib/tones"

const OVERALL_LABEL: Record<OverallState, string> = {
  operational: copy.shell.health.operational,
  degraded: copy.shell.health.degraded,
  down: copy.shell.health.down,
}

export function HealthIndicator() {
  const { data, isPending, isError } = usePlatformStatus()
  const state = data ? overallState(data.services) : null
  const tone: Tone = state ? OVERALL_TONE[state] : isError ? "danger" : "neutral"
  const label = state
    ? OVERALL_LABEL[state]
    : isPending
      ? copy.shell.health.checking
      : copy.shell.health.unknown
  const content = (
    <div className="flex min-w-48 flex-col gap-1.5 py-0.5">
      <span className="font-medium">{label}</span>
      {data ? (
        <ul className="flex flex-col gap-1">
          {data.services.map((service) => (
            <li key={service.name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-fg-muted">
                <StatusDot tone={serviceStateTone[service.state]} className="size-1.5" />
                {serviceNameLabels[service.name]}
              </span>
              <span>{serviceStateLabels[service.state]}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
  return (
    <Tooltip content={content} align="end">
      <Link
        href={ROUTES.status}
        aria-label={`${copy.shell.health.label}: ${label}`}
        className="flex h-7 items-center gap-2 rounded-md px-2 text-xs text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <StatusDot tone={tone} pulse={isPending} />
        <span className="hidden xl:inline">{copy.shell.health.label}</span>
      </Link>
    </Tooltip>
  )
}
