import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "**/.next/**",
      "**/.turbo/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**"
    ]
  },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  },
  prettier
];
