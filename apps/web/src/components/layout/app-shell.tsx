"use client"

import type { ReactNode } from "react"
import { CommandPalette } from "./command-palette"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="main" className="relative min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
