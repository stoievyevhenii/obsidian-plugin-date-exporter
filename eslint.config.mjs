import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
  { ignores: ['main.js', 'node_modules/**', 'tests/**', 'scripts/**', 'esbuild.config.mjs', 'vitest.config.ts', 'eslint.config.mjs'] },
  ...obsidianmd.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      'obsidianmd/ui/sentence-case': ['warn', { brands: ['Daily Notes', 'Daily Notes TXT Export', 'Company', 'Ship', 'Android', 'WebView', 'Markdown'], acronyms: ['TXT', 'MD'] }],
      // The optional declarative settings API requires 1.13; retain display()
      // while supporting 1.5. This is an advisory compatibility exception.
      'obsidianmd/settings-tab/prefer-setting-definitions': 'off',
    },
  },
  {
    files: ['src/sharing.ts'],
    rules: {
      // The sole deprecated API is a best-effort fallback for older Android
      // WebViews. It is user-initiated, receives no HTML and has manual fallback.
      '@typescript-eslint/no-deprecated': ['warn', { allow: [{ from: 'lib', name: 'execCommand' }] }],
    },
  },
]);
