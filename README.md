# Daily Notes TXT Export

Export daily Markdown lists for an inclusive date range to a single Markdown report, with each file’s properties followed by its original text/list lines. Works with Obsidian desktop and Android using public Vault and Web APIs.

[Русская инструкция](README.ru.md) · [Publication guide](PUBLICATION.md) · [Security policy](SECURITY.md)

## Features

- On days 1–7, prefill the full previous month; from day 8, prefill the full current month. The device’s local date is read each time the dialog opens. You can edit both dates.
- Configure the daily-note folder and filename format (`YYYY-MM-DD` by default).
- Find same-date notes in different ship subfolders; recursive search is enabled by default.
- Export plain body text, ordinary Markdown list items and checkboxes, or checkboxes only; optionally exclude completed tasks. Each nonempty standalone body line becomes an item.
- Render the date in bold and all YAML properties as `key - value` lines, followed by a blank line and the selected source lines. No automatic numbering or Company/Ship grouping.
- Skip empty items, pages and dates. Keep source notes unchanged and give repeated exports a new filename.
- Preview and automatically save one UTF-8 Markdown inside the vault; explicitly copy or share it afterward.

The interface currently uses Russian labels. The command is **Daily Notes TXT Export: Экспорт заметок за период в MD** (export notes for a date range).

## Installation

After the plugin is approved in the Community directory, install it from **Settings → Community plugins → Browse**. The repository being public or having a release does not itself mean directory approval.

For manual installation, download `main.js`, `manifest.json` and `styles.css` from the [GitHub release](https://github.com/stoievyevhenii/obsidian-plugin-date-exporter/releases) or use the installation ZIP. Put them in:

```text
<vault>/<configDir>/plugins/daily-notes-txt-export/
```

`configDir` is `.obsidian` unless you changed it in Obsidian. Restart Obsidian and enable **Daily Notes TXT Export**. Android file managers may need hidden-file visibility and access to the selected vault. For updates, replace the three runtime files and retain your existing `data.json`.

Minimum Obsidian version: **1.5.7**. `isDesktopOnly` is `false`. Source compilation was additionally checked against the published 1.5.7 API types. The exact installed-app and automated test coverage is documented in [VALIDATION.md](VALIDATION.md).

## Usage

1. Open the plugin settings. Set the daily-note folder, filename format and output folder, then select **Сохранить настройки** (save settings). These settings are independent of the built-in Daily Notes plugin.
2. Run the export command from the command palette, ribbon or mobile actions menu.
3. Choose an inclusive range. Expand **Папки, формат имени и задачи** to override folders/filters for that export only.
4. Select **Сформировать отчёт** (generate report). The preview opens and saves one Markdown automatically. Wait for the saved path, or retry a failed write without losing the preview text.

The default output is `Reports/Daily-report_2026-10-01_2026-10-31.md`. Repeated exports add ` (2)`, ` (3)` and so on; they do not overwrite existing reports. Output uses UTF-8 without a BOM and LF line endings.

## Properties and example

All YAML properties at the beginning of a note are exported in `key - value` lines. Special characters in property text are escaped so they remain literal and do not become active Markdown or HTML. For example:

```markdown
---
Company: ShipCompany
Ship: Ship 1
tags: [work, urgent]
---
- [x] Prepare report
- [ ] Call the team
```

Output:

```markdown
== **2026-10-24** ==

Company - ShipCompany  
Ship - Ship 1  
tags - work, urgent

- [x] Prepare report
- [ ] Call the team
```

Each file produces a separate Markdown block: a date line formatted as `== **YYYY-MM-DD** ==`, `key - value` property lines, then the selected source lines. Property lines use Markdown hard breaks; blank lines separate the sections; no divider is added. Dates sort ascending; same-date files retain file-path order, with no merging by Company or Ship. A blank line separates file blocks. If properties are absent, only the formatted date precedes the lines. Pages without included text/list lines are skipped even if they have properties.

List-valued properties are comma-separated; numbers and booleans are text, null is empty, multiline property text becomes one line, and nested objects use compact JSON. Wikilinks remain as written. Invalid YAML or a non-mapping frontmatter stops the export and identifies the source file.

The `examples/` folder contains sample notes and exact expected Markdown files. The two-page example uses October 24; choose a range that includes it.

## Filename and task rules

Supported filename tokens are the literal numeric tokens `YYYY`, `MM`, `DD`; all three are required. Examples: `YYYY-MM-DD`, `DD.MM.YYYY.md`, `YYYY/MM/YYYY-MM-DD`, `[Journal-]YYYY-MM-DD`. The `.md` extension is optional in settings. This is a deliberately limited token set, not the full Moment format language. With recursive search enabled, the format matches the end of the relative path inside the configured daily-note folder.

Bullet/ordered lists, standard and custom single-character checkbox statuses, nested items and multiline items are supported. Source markers, checkbox states, existing list numbers, inline Markdown, indentation and continuation lines are retained. No numbering is generated. Blank lines/items, headings, code blocks and comments are excluded; YAML is exported as property lines above the body, and lists in blockquotes/callouts are included. Dataview/Tasks query results and embedded notes are not evaluated.

Dates are validated as real civil dates. Absolute paths, traversal segments, hidden folders and invalid cross-platform path characters are rejected. All selected notes must be read and parsed successfully before a report can be saved; empty exports create no Markdown.

## Mobile copy and share

**Копировать** (copy) uses the Clipboard API, then a user-initiated legacy copy fallback. If both are unavailable, text remains selected for Android's native text actions. **Поделиться** (share) sends a Markdown file through Web Share when file sharing is available, otherwise shares text. A separate click invokes these actions after preparation, preserving user activation.

Native Web Share is not guaranteed on every Android WebView. Manual selection, copying/pasting and the saved Markdown remain available. You can also share the saved file from Android's file manager. No internal Capacitor bridges are used.

## Privacy and permissions

The plugin is free and open source. It requires no payment, account, API key, external service or internet connection. Runtime makes no network requests and includes no telemetry, advertisements, remote code loading or self-update mechanism. It accesses notes and writes reports only through Obsidian's Vault API; it does not intentionally access files outside the vault.

Reports contain selected note text in plaintext and follow your vault's synchronization/storage settings. Copy/share transfers content only when you press the corresponding button; the operating system and selected receiving application then control its handling. All page properties are included in the plaintext report. See [SECURITY.md](SECURITY.md) for host assumptions and reporting guidance.

## Development

Use Node.js **22.22 or newer in the 22.x line** and npm:

```sh
npm ci
npm run verify
npm audit --audit-level=moderate
npm run package
```

`verify` runs the official Obsidian ESLint rules, conversion/integration tests, strict TypeScript, a browser-targeted CommonJS build, final-bundle checks and publication-metadata checks. `package` verifies again and creates `release/` with installation files, an installation ZIP, an allowlisted source ZIP and SHA-256 checksums. It excludes `main.js` from the source archive/repository; the bundle is a release attachment.

Only `marked` and `entities` are bundled. Obsidian supplies its public YAML parser. Node APIs in `scripts/` are development-only and never included in `main.js`. CI verifies pull requests with read-only access. The manual release workflow creates a **draft** for review; it does not submit or approve a Community listing.

## License

MIT, copyright © 2026 Yevhenii Stoiev. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The full notices are also embedded in `main.js` so that direct Community installations retain them.
