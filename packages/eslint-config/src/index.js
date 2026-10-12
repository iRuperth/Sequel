import js from "@eslint/js"
import prettier from "eslint-config-prettier"
import globals from "globals"
import tseslint from "typescript-eslint"
import { sequelPlugin } from "./no-comments-rule.js"

export const ignores = {
  ignores: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "**/.turbo/**",
    "**/coverage/**",
    "**/next-env.d.ts",
    "**/migrations/meta/**",
  ],
}

export const baseConfig = [
  ignores,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: { sequel: sequelPlugin },
    languageOptions: {
      globals: { ...globals.node },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
      noInlineConfig: true,
    },
    rules: {
      "sequel/no-comments": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "error",
    },
  },
]

export const nodeConfig = baseConfig
