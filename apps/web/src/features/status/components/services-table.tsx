"use client"

import type { ServiceStatus } from "@sequel/contracts"
import { copy, serviceNameLabels, serviceStateLabels } from "@sequel/copy"
import { ServerCog } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/cn"
import { EMPTY_VALUE, formatDuration } from "@/lib/format"
import { serviceStateTone } from "@/lib/tones"

const servicesCopy = copy.status.services

export function ServicesTable({
  services,
  stale = false,
}: {
  services: readonly ServiceStatus[]
  stale?: boolean
}) {
  if (services.length === 0) {
    return (
      <Card>
        <EmptyState
          compact
          icon={ServerCog}
          title={servicesCopy.emptyTitle}
          description={servicesCopy.emptyDescription}
        />
      </Card>
    )
  }
  return (
    <TableContainer className={cn(stale && "opacity-60")}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{servicesCopy.columns.service}</TableHead>
            <TableHead>{servicesCopy.columns.state}</TableHead>
            <TableHead className="text-right">{servicesCopy.columns.latency}</TableHead>
            <TableHead>{servicesCopy.columns.detail}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.name}>
              <TableCell className="w-64">
                <div className="flex flex-col py-1">
                  <span className="font-medium text-fg">{serviceNameLabels[service.name]}</span>
                  <span className="font-mono text-2xs text-fg-subtle">{service.name}</span>
                </div>
              </TableCell>
              <TableCell className="w-40">
                <Badge tone={serviceStateTone[service.state]} dot>
                  {serviceStateLabels[service.state]}
                </Badge>
              </TableCell>
              <TableCell className="w-28 text-right font-mono text-xs tabular text-fg">
                {formatDuration(service.latencyMs)}
              </TableCell>
              <TableCell className="text-sm break-words text-fg-muted">
                {service.detail ?? <span className="text-fg-subtle">{EMPTY_VALUE}</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
