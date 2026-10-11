"use client"

import { HTML_LANG, copy } from "@sequel/copy"
import { THEME_CONFIG } from "@/config/theme"
import "@/styles/globals.css"
import { ErrorView } from "@/components/layout/error-view"
import { TooltipProvider } from "@/components/ui/tooltip"
import { fontVariables } from "./fonts"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang={HTML_LANG} className={`${fontVariables} ${THEME_CONFIG.defaultTheme}`}>
      <body>
        <TooltipProvider>
          <ErrorView
            standalone
            digest={error.digest}
            onRetry={reset}
            title={copy.systemPages.error.globalTitle}
            description={copy.systemPages.error.globalDescription}
          />
        </TooltipProvider>
      </body>
    </html>
  )
}
