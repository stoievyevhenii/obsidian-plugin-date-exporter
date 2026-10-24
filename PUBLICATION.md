# Publication guide — 1.1.1

Prepared for **Yevhenii Stoiev**, repository:

`https://github.com/stoievyevhenii/obsidian-plugin-date-exporter`

This package prepares a publication; it is not a Community approval. Official instructions checked on October 24, 2026 use the Community directory submission form, not a legacy registry pull request.

## 1. Upload the source repository

Extract the source ZIP. Commit the contents of its `daily-notes-txt-export/` folder to the root of the named repository's default branch. Keep `README.md`, `LICENSE`, `manifest.json`, lockfile, source, tests, scripts and `.github` at the repository root. Do not commit generated `main.js`, installation ZIPs, `node_modules`, local settings or vault data. `.gitignore` already excludes these.

The repository must be public and the source accessible for review. The repository appeared empty during preparation; no remote commits, releases or directory submission were performed by this local preparation.

## 2. Verify and test

Run `npm ci`, `npm run verify`, `npm audit --audit-level=moderate`, then `npm run package`. The files appear under `release/`.

Before publishing, install the three runtime files in a disposable desktop vault and Android vault, run both supplied examples, confirm the result against the expected TXT, check clipboard/share fallback, repeated export naming and plugin disable/re-enable. Record actual device/app versions in `VALIDATION.md`; do not turn an unperformed device check into a claimed pass.

## 3. Prepare and publish the GitHub release

In GitHub, open **Actions → Prepare draft release → Run workflow** on the default branch. It verifies the source and dependencies, packages the result and creates a draft with tag **`1.1.1`**. The tag is read from `manifest.json`; it has **no `v` prefix**. For later versions, update `manifest.json`, `package.json`, `package-lock.json`, `versions.json` and release notes together.

Review the draft and attach at least these files as individual release assets with these exact names:

- `main.js`
- `manifest.json`
- `styles.css`

The workflow attaches all three, license notices, installation/source ZIPs and checksums. Obsidian downloads the individual runtime assets; a ZIP alone is insufficient. When the draft is verified, publish it. If a release with that tag already exists, inspect it rather than overwriting a published version.

## 4. Submit to the Community directory

1. Open [community.obsidian.md](https://community.obsidian.md) and sign in with the author's Obsidian account.
2. In the community profile, connect the GitHub account **stoievyevhenii**. Account linking must be done by the owner.
3. Open **Plugins → New plugin**.
4. Enter `https://github.com/stoievyevhenii/obsidian-plugin-date-exporter` and choose the owner.
5. Review the developer policies and maintenance commitment, then submit.

The directory reads `manifest.json` from the default branch and requires the corresponding published GitHub release. The author must review and agree to the policies personally. The ID and name had no exact match in the official public registry snapshot checked on October 24, 2026; the directory makes the authoritative uniqueness/approval decision at submission time.

## Review responses and limits

The local checks do not replace Obsidian's automated/manual review. Fix feedback, increment the release version, commit the source and publish a new matching release. Do not mark untested Android Web Share or the minimum Obsidian version as verified. The optional declarative settings-search API is intentionally not used while retaining pre-1.13 compatibility; the corresponding advisory lint exception is documented in `eslint.config.mjs`. A narrowly permitted deprecated clipboard fallback remains for older WebViews.

## Official sources

- [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)
- [Submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)
- [Developer policies](https://docs.obsidian.md/community-directory/developer-policies)
- [Set up and claim](https://docs.obsidian.md/community-directory/set-up-and-claim)
- [Manifest schema](https://docs.obsidian.md/Reference/Manifest)
- [Official ESLint plugin](https://github.com/obsidianmd/eslint-plugin)
