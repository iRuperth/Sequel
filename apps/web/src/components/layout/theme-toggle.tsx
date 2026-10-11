"use client"

import { copy } from "@sequel/copy"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import { THEMES } from "@/config/theme"
import { useMounted } from "@/lib/hooks/use-platform"

export function useThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme !== THEMES.light
  return {
    isDark,
    toggle: () => setTheme(isDark ? THEMES.light : THEMES.dark),
  }
}

export function ThemeToggle() {
  const mounted = useMounted()
  const { isDark, toggle } = useThemeToggle()
  const label = isDark ? copy.shell.theme.switchToLight : copy.shell.theme.switchToDark
  return (
    <Tooltip content={label}>
      <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={copy.shell.theme.toggle}>
        {mounted && !isDark ? <Moon /> : <Sun />}
      </Button>
    </Tooltip>
  )
}
