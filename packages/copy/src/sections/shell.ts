export const shellCopy = {
  sidebar: {
    label: "Primary navigation",
    collapse: "Collapse sidebar",
    expand: "Expand sidebar",
  },
  topbar: {
    breadcrumbLabel: "Breadcrumb",
    searchPlaceholder: "Search or jump to",
    openCommandPalette: "Open command palette",
    environmentLabel: "Environment",
    environmentHint: "Shared training warehouse. Data is synthetic and resets on reseed.",
  },
  health: {
    label: "Platform health",
    operational: "All systems operational",
    degraded: "Some services are degraded",
    down: "Service disruption",
    unknown: "Health status unavailable",
    checking: "Checking services",
    viewStatus: "View platform status",
  },
  theme: {
    toggle: "Toggle theme",
    dark: "Dark",
    light: "Light",
    switchToLight: "Switch to light theme",
    switchToDark: "Switch to dark theme",
  },
  user: {
    menuLabel: "Account menu",
    fallbackRole: "Workspace member",
    workspace: "Local workspace",
    version: "Version {version}",
  },
  palette: {
    title: "Command palette",
    placeholder: "Type a command or search",
    empty: "No matching commands.",
    groups: {
      actions: "Actions",
      navigation: "Go to",
      savedQueries: "Saved queries",
      preferences: "Preferences",
    },
    actions: {
      newQuery: "New query",
      newTask: "New task",
      toggleTheme: "Toggle theme",
      openSavedQuery: "Open {name}",
    },
    footer: {
      navigate: "Navigate",
      select: "Select",
      close: "Close",
    },
  },
  shortcuts: {
    commandPalette: "Command palette",
  },
} as const
