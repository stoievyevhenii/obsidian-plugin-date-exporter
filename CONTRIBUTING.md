# Contributing

Use Node.js 22.22 or newer in the 22.x line and npm. Run `npm ci` then `npm run verify`; the latter checks the official Obsidian ESLint rules, tests, TypeScript, the browser-targeted CommonJS bundle and publication metadata.

Keep runtime free of Node.js/Electron APIs and network access. Use the Vault API, validate relative paths before normalization, render note text through text-only DOM APIs, and preserve existing notes and reports. Add focused tests for changed behavior. Never commit real vault data, `data.json`, environment files or credentials.

The development-only Moment override updates the transitive dependency of the Obsidian type/lint packages; Moment is not bundled or used by this plugin. The local ESLint config documents two narrow compatibility exceptions: legacy settings `display()` for Obsidian before 1.13, and the user-triggered `execCommand('copy')` fallback for older WebViews. Do not disable security rules to bypass new findings.

For a release, update manifest/package/versions metadata together, run `npm run package`, inspect the allowlisted source ZIP, and follow [PUBLICATION.md](PUBLICATION.md). Commit source and lockfiles; `main.js` is a generated release asset and is ignored by Git.
