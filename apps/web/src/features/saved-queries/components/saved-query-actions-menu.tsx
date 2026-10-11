"use client"

import type { SavedQuery } from "@sequel/contracts"
import { copy } from "@sequel/copy"
import { Copy, Ellipsis, Pencil, SquareTerminal, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { routeTo } from "@/config/routes"
import { copySqlToClipboard } from "../model/actions"

type SavedQueryActionsMenuProps = {
  query: SavedQuery
  onEdit: (query: SavedQuery) => void
  onDelete: (query: SavedQuery) => void
}

export function SavedQueryActionsMenu({ query, onEdit, onDelete }: SavedQueryActionsMenuProps) {
  const router = useRouter()
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={copy.savedQueries.actions.menu}
          onClick={(event) => event.stopPropagation()}
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuItem onSelect={() => router.push(routeTo.workbenchWithSavedQuery(query.id))}>
          <SquareTerminal />
          {copy.savedQueries.actions.open}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onEdit(query)}>
          <Pencil />
          {copy.savedQueries.actions.edit}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copySqlToClipboard(query.sqlText)}>
          <Copy />
          {copy.savedQueries.actions.copySql}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => onDelete(query)}>
          <Trash2 />
          {copy.savedQueries.actions.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
