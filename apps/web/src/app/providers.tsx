"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { type ReactNode, useState } from "react"
import { StoreHydrator } from "@/components/layout/store-hydrator"
import { Toaster } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import { THEME_CONFIG } from "@/config/theme"
import { createQueryClient } from "@/lib/query-client"

const TOOLTIP_DELAY_MS = 350

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  return (
    <ThemeProvider
      attribute={THEME_CONFIG.attribute}
      defaultTheme={THEME_CONFIG.defaultTheme}
      storageKey={THEME_CONFIG.storageKey}
      themes={[...THEME_CONFIG.themes]}
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
          <StoreHydrator />
          {children}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
