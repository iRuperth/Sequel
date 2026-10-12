"use client"

import type { ColumnNode, SchemaKind, TableNode } from "@sequel/contracts"
import { copy, interpolate, relationKindLabels, schemaKindLabels } from "@sequel/copy"
import {
  BookOpen,
  ChevronRight,
  Copy,
  Database,
  Ellipsis,
  Eye,
  KeyRound,
  Link2,
  PanelLeftClose,
  RefreshCw,
  SquareTerminal,
  Table2,
  TextCursorInput,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ErrorState } from "@/components/ui/error-state"
import { RelativeTime } from "@/components/ui/relative-time"
import { SearchInput } from "@/components/ui/search-input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip } from "@/components/ui/tooltip"
import { EmptyState } from "@/components/ui/empty-state"
import { routeTo } from "@/config/routes"
import { cn } from "@/lib/cn"
import { copyToClipboard } from "@/lib/clipboard"
import { formatCompact } from "@/lib/format"
import { qualifiedName, quoteIdent, shortTypeName } from "@/lib/sql-templates"
import type { Tone } from "@/lib/tones"
import { toast } from "@/components/ui/toast"
import { useSchemaTree } from "../api"
import { type FilteredTable, filterSchemaTree, schemaKey, tableKey } from "../model/filter"

const KIND_TONE: Record<SchemaKind, Tone> = {
  dataset: "accent",
  scratch: "warning",
  system: "neutral",
}

const ROW_INDENT_PX = 14

type SchemaBrowserProps = {
  onInsert: (text: string) => void
  onPreview: (schema: string, table: string) => void
  onInsertSelect: (schema: string, table: string, columns: readonly string[]) => void
  onCollapse?: () => void
}

type TableActionsProps = {
  schema: string
  schemaKind: SchemaKind
  table: TableNode
  onInsert: SchemaBrowserProps["onInsert"]
  onPreview: SchemaBrowserProps["onPreview"]
  onInsertSelect: SchemaBrowserProps["onInsertSelect"]
}

function useTableActions({
  schema,
  schemaKind,
  table,
  onInsert,
  onPreview,
  onInsertSelect,
}: TableActionsProps) {
  const router = useRouter()
  const name = qualifiedName(schema, table.name)
  return [
    {
      key: "insert",
      icon: TextCursorInput,
      label: copy.schemaBrowser.actions.insertName,
      run: () => onInsert(name),
    },
    {
      key: "select",
      icon: SquareTerminal,
      label: copy.schemaBrowser.actions.insertSelect,
      run: () =>
        onInsertSelect(
          schema,
          table.name,
          table.columns.map((column) => column.name),
        ),
    },
    {
      key: "preview",
      icon: Eye,
      label: copy.schemaBrowser.actions.preview,
      run: () => onPreview(schema, table.name),
    },
    ...(schemaKind === "dataset"
      ? [
          {
            key: "catalog",
            icon: BookOpen,
            label: copy.schemaBrowser.actions.openInCatalog,
            run: () => router.push(routeTo.catalogTable(schema, table.name)),
          },
        ]
      : []),
    {
      key: "copy",
      icon: Copy,
      label: copy.schemaBrowser.actions.copyName,
      run: async () => {
        if (await copyToClipboard(name)) {
          toast.success(copy.states.copiedToClipboard, name)
        }
      },
    },
  ]
}

function ColumnRow({
  column,
  depth,
  onInsert,
}: {
  column: ColumnNode
  depth: number
  onInsert: (text: string) => void
}) {
  const reference = column.references
    ? `${column.references.schema}.${column.references.table}.${column.references.column}`
    : null
  const icon = column.isPrimaryKey ? (
    <KeyRound className="size-3 text-warning" />
  ) : reference ? (
    <Link2 className="size-3 text-fg-muted" />
  ) : (
    <span className="mx-[5px] size-[3px] rounded-full bg-fg-subtle" />
  )
  const tooltip = [
    column.isPrimaryKey ? copy.schemaBrowser.primaryKey : null,
    reference ? interpolate(copy.schemaBrowser.foreignKey, { target: reference }) : null,
    column.isNullable ? copy.schemaBrowser.nullable : null,
  ]
    .filter(Boolean)
    .join(` ${copy.common.separator} `)
  return (
    <Tooltip content={tooltip || null} side="right" delayDuration={500}>
      <button
        type="button"
        onClick={() => onInsert(quoteIdent(column.name))}
        className="group flex h-6 w-full items-center gap-1.5 rounded-sm pr-2 text-left hover:bg-surface-2"
        style={{ paddingLeft: depth * ROW_INDENT_PX + 18 }}
      >
        <span className="flex w-3 shrink-0 items-center justify-center">{icon}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-fg">{column.name}</span>
        <span className="shrink-0 truncate font-mono text-2xs text-fg-subtle">
          {shortTypeName(column.dataType)}
        </span>
      </button>
    </Tooltip>
  )
}

function TableRow({
  schema,
  schemaKind,
  entry,
  expanded,
  onToggle,
  onInsert,
  onPreview,
  onInsertSelect,
}: {
  schema: string
  schemaKind: SchemaKind
  entry: FilteredTable
  expanded: boolean
  onToggle: () => void
} & Pick<SchemaBrowserProps, "onInsert" | "onPreview" | "onInsertSelect">) {
  const { table, columns } = entry
  const actions = useTableActions({
    schema,
    schemaKind,
    table,
    onInsert,
    onPreview,
    onInsertSelect,
  })
  const name = qualifiedName(schema, table.name)
  return (
    <li>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className="group flex h-6 items-center gap-1 rounded-sm pr-1 hover:bg-surface-2"
            style={{ paddingLeft: ROW_INDENT_PX }}
          >
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-label={expanded ? copy.actions.collapse : copy.actions.expand}
              className="flex size-4 shrink-0 items-center justify-center rounded-xs text-fg-subtle hover:text-fg"
            >
              <ChevronRight
                className={cn("size-3 transition-transform", expanded && "rotate-90")}
              />
            </button>
            <Tooltip content={copy.schemaBrowser.rowHint} side="right" delayDuration={700}>
              <button
                type="button"
                onClick={onToggle}
                onDoubleClick={() => onPreview(schema, table.name)}
                aria-expanded={expanded}
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              >
                <Table2 className="size-3.5 shrink-0 text-fg-muted" />
                <span className="min-w-0 truncate font-mono text-xs text-fg">{table.name}</span>
                {table.kind !== "table" ? (
                  <span className="shrink-0 text-2xs text-fg-subtle">
                    {relationKindLabels[table.kind]}
                  </span>
                ) : null}
              </button>
            </Tooltip>
            {table.rowEstimate !== null ? (
              <span className="shrink-0 font-mono text-2xs text-fg-subtle tabular group-hover:hidden">
                {formatCompact(table.rowEstimate)}
              </span>
            ) : null}
            <Tooltip content={copy.schemaBrowser.actions.preview} side="top">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={copy.schemaBrowser.actions.preview}
                onClick={() => onPreview(schema, table.name)}
                className="hidden size-5 group-hover:inline-flex"
              >
                <Eye />
              </Button>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={copy.schemaBrowser.actions.menu}
                  className="hidden size-5 group-hover:inline-flex data-[state=open]:inline-flex"
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right">
                <DropdownMenuLabel className="font-mono normal-case tracking-normal">
                  {name}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {actions.map((action) => (
                  <DropdownMenuItem key={action.key} onSelect={() => void action.run()}>
                    <action.icon />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>{name}</ContextMenuLabel>
          <ContextMenuSeparator />
          {actions.map((action) => (
            <ContextMenuItem key={action.key} onSelect={() => void action.run()}>
              <action.icon />
              {action.label}
            </ContextMenuItem>
          ))}
        </ContextMenuContent>
      </ContextMenu>
      {expanded ? (
        <ul>
          {columns.map((column) => (
            <li key={column.name}>
              <ColumnRow column={column} depth={1} onInsert={onInsert} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function SchemaBrowserSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {Array.from({ length: 9 }, (_, index) => (
        <Skeleton key={index} className={cn("h-3.5", index % 3 === 0 ? "w-2/3" : "ml-4 w-1/2")} />
      ))}
    </div>
  )
}

export function SchemaBrowser({
  onInsert,
  onPreview,
  onInsertSelect,
  onCollapse,
}: SchemaBrowserProps) {
  const query = useSchemaTree()
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [initialized, setInitialized] = useState(false)
  const filtered = useMemo(
    () => (query.data ? filterSchemaTree(query.data, search) : []),
    [query.data, search],
  )

  if (query.data && !initialized) {
    setInitialized(true)
    const first = filtered.find((entry) => entry.schema.kind === "dataset")
    if (first) {
      setExpanded(new Set([schemaKey(first.schema.name)]))
    }
  }

  const searching = search.trim().length > 0
  const isOpen = (key: string, forceOpen: boolean) => forceOpen || expanded.has(key)
  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border pr-1.5 pl-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Database className="size-3.5 shrink-0 text-fg-muted" />
          <span className="truncate text-xs font-semibold text-fg">{copy.schemaBrowser.title}</span>
        </div>
        <div className="flex shrink-0 items-center">
          <Tooltip content={copy.schemaBrowser.refresh}>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={copy.schemaBrowser.refresh}
              onClick={() => void query.refetch()}
            >
              <RefreshCw className={cn(query.isFetching && "animate-spin")} />
            </Button>
          </Tooltip>
          {onCollapse ? (
            <Tooltip content={copy.schemaBrowser.collapse}>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={copy.schemaBrowser.collapse}
                onClick={onCollapse}
              >
                <PanelLeftClose />
              </Button>
            </Tooltip>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 px-2 py-2">
        <SearchInput
          size="xs"
          value={search}
          onValueChange={setSearch}
          placeholder={copy.schemaBrowser.searchPlaceholder}
          aria-label={copy.schemaBrowser.searchPlaceholder}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
        {query.isPending ? (
          <SchemaBrowserSkeleton />
        ) : query.isError ? (
          <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            compact
            icon={Database}
            title={searching ? copy.schemaBrowser.noMatches : copy.schemaBrowser.empty}
          />
        ) : (
          <ul className="flex flex-col">
            {filtered.map(({ schema, tables }) => {
              const key = schemaKey(schema.name)
              const open = isOpen(key, searching)
              return (
                <li key={schema.name}>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    aria-expanded={open}
                    className="group flex h-7 w-full items-center gap-1 rounded-sm pr-2 text-left hover:bg-surface-2"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center text-fg-subtle">
                      <ChevronRight
                        className={cn("size-3 transition-transform", open && "rotate-90")}
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-fg">
                      {schema.name}
                    </span>
                    <Badge tone={KIND_TONE[schema.kind]} className="h-4 px-1 text-2xs">
                      {schemaKindLabels[schema.kind]}
                    </Badge>
                    <span className="w-6 shrink-0 text-right font-mono text-2xs text-fg-subtle tabular">
                      {schema.tables.length}
                    </span>
                  </button>
                  {open ? (
                    <ul>
                      {tables.map((entry) => {
                        const tKey = tableKey(schema.name, entry.table.name)
                        return (
                          <TableRow
                            key={entry.table.name}
                            schema={schema.name}
                            schemaKind={schema.kind}
                            entry={entry}
                            expanded={isOpen(tKey, entry.columnMatch)}
                            onToggle={() => toggle(tKey)}
                            onInsert={onInsert}
                            onPreview={onPreview}
                            onInsertSelect={onInsertSelect}
                          />
                        )
                      })}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {query.data ? (
        <div className="flex shrink-0 items-center gap-1 truncate border-t border-border px-3 py-1.5 text-2xs text-fg-subtle">
          <Tooltip content={copy.schemaBrowser.database}>
            <span className="truncate font-mono">{query.data.database}</span>
          </Tooltip>
          <span>{copy.common.separator}</span>
          {interpolate(copy.schemaBrowser.tables, {
            count: query.data.schemas.reduce((total, schema) => total + schema.tables.length, 0),
          })}
          <span>{copy.common.separator}</span>
          <RelativeTime value={query.data.refreshedAt} />
        </div>
      ) : null}
    </div>
  )
}
