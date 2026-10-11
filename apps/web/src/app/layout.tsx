import { HTML_LANG, copy } from "@sequel/copy"
import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { THEME_CONFIG } from "@/config/theme"
import "@/styles/globals.css"
import { fontVariables } from "./fonts"
import { Providers } from "./providers"

const EMPTY_ICON = "data:,"

export const metadata: Metadata = {
  title: {
    default: copy.app.name,
    template: copy.app.titleTemplate,
  },
  description: copy.app.tagline,
  applicationName: copy.app.name,
  icons: { icon: EMPTY_ICON },
}

export const viewport: Viewport = {
  colorScheme: "light dark",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang={HTML_LANG}
      className={`${fontVariables} ${THEME_CONFIG.defaultTheme}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
