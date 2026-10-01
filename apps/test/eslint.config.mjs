import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // Fixture Playwright tanpa dependensi wajib ditulis `async ({}, use) => …`.
    rules: {
      "no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }],
    },
  },
  globalIgnores(["test-results/**", "playwright-report/**", "blob-report/**"]),
]);
