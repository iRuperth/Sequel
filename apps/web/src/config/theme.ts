export const THEMES = {
  light: "light",
  dark: "dark",
} as const

export type ThemeName = (typeof THEMES)[keyof typeof THEMES]

export const THEME_CONFIG = {
  attribute: "class",
  defaultTheme: THEMES.light,
  storageKey: "sequel.theme.v2",
  themes: [THEMES.light, THEMES.dark],
} as const
