import { baseConfig } from "@sequel/eslint-config"

export default [
  ...baseConfig,
  {
    ignores: ["apps/**", "packages/**", "tests/**"],
  },
]
