# Security and publication review — 1.1.1

Checked October 24, 2026 for Yevhenii Stoiev and `stoievyevhenii/obsidian-plugin-date-exporter`.

## Outcome

The local publication package passes its automated checks. No confirmed first-party vulnerability was found in the independent static audit of the starting 1.1.0 snapshot. This does not constitute Obsidian approval or a guarantee of absence of vulnerabilities. Installed-app and physical Android validation remain open release checks, recorded honestly in `VALIDATION.md`.

## Corrections made

| Area | Initial state | Prepared 1.1.1 |
| --- | --- | --- |
| Author/repository | Generic contributor author; no repository metadata | Yevhenii Stoiev, exact GitHub repository and support links |
| Paths | Custom validation only | Validation before and after public normalizePath; generated paths normalized |
| Vault operations | Adapter.exists for report collisions | Public Vault lookup and Vault.create, retaining no-overwrite behavior |
| Read scope | Hidden descendants depended on host enumeration | Explicitly excludes hidden path segments |
| Write boundary | Dates checked only during preparation | Revalidates dates before any write |
| Settings UI | Redundant manual h2 heading | Removed |
| Minimum application version | Unverified 1.5.0 floor | 1.5.7, with a separate successful compilation against published 1.5.7 API types; real host execution still pending |
| Type safety | Generic lexer tokens allowed implicit any flows | Typed token guards; strict lint passes |
| Development dependencies | npm audit reported 4 affected packages, including critical advisories in test-tool dependency chains | Vitest 5.0.5, yaml 2.9.1, explicit Vite peer and development-only Moment 2.31.0 override; final full audit reports 0 |
| Source archive | Recursive denylist could include future local files | Root file/directory allowlists, environment/settings exclusions and a package-content regression test |
| Generated bundle | Bundled license notices not complete for three-file Community download | Full first-party and bundled third-party notices embedded in main.js |
| Release process | No CI or draft release automation | Read-only CI, locked dependencies and commit-pinned official Actions; manual draft-release workflow |
| Public documentation | Russian-only guide | English README, preserved Russian guide, privacy/security policy and current submission steps |

The advisory database result is a dependency/version assessment, not evidence that this plugin exposed a remotely reachable exploit. The affected test tools do not ship in main.js. The runtime dependencies remain marked and entities; Obsidian supplies parseYaml.

## Publication requirements checked

| Requirement | Local result / remaining external action |
| --- | --- |
| Valid unique plugin ID and English name | Schema and naming checks pass; no exact ID/name match in the official public registry snapshot. Directory validation at submission is authoritative. |
| Description | Action-oriented, under 250 characters and ends with a period. |
| Semantic version/tag | Prepared version 1.1.1; workflow uses the exact manifest version without a v prefix. A published remote release is still required. |
| Source, README, LICENSE, manifest at repository root | Included in source ZIP; upload/commit to the named public repository's default branch is still required. |
| main.js, manifest.json, styles.css as individual release assets | Present in installation folder and attached by the draft-release workflow. ZIP-only publication would be insufficient. |
| Mobile manifest / runtime | isDesktopOnly=false; only obsidian is external; no Node/Electron API in runtime. Actual Android run remains pending. |
| Private/offline usage | No telemetry, ads, accounts, payments, network requests or self-update code; privacy behavior is documented. |
| User content safety | Plaintext rendering, explicit copy/share clicks, no source-note writes, traversal rejection and report collision handling verified. |
| Maintainer submission | The owner must link GitHub to their Obsidian Community profile, review policies and submit through Plugins → New plugin. |

Two non-security compatibility exceptions are explicit in eslint.config.mjs: legacy settings display() supports pre-1.13 hosts, and execCommand('copy') remains a user-triggered fallback on older WebViews. There is no blanket lint suppression.

## Coverage and limitations

The independent scan covered all 37 first-party files of 1.1.0, including the shipped bundle as data, with a baseline auditor, separate architecture review, focused boundary investigation and parent reconciliation. Vendored node_modules, the Obsidian host implementation and physical-device behavior were excluded. Corrective 1.1.1 changes were reviewed locally and verified by 93 tests, the official linter, strict TypeScript, bundle checks, npm audit and publication/package checks; this is not represented as a second full independent scan.

Resource use remains proportional to selected notes and the generated report, held in memory. No arbitrary period limit was introduced. Host parser internals, filesystem mounts/symlinks, vault synchronization and receiving applications remain external assumptions. Keep Obsidian updated and perform the supplied installed-app checks before publishing.

## Official references

- [Submission workflow and individual release assets](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)
- [Plugin-specific submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)
- [Developer policies](https://docs.obsidian.md/community-directory/developer-policies)
- [Manifest schema and naming](https://docs.obsidian.md/Reference/Manifest)
- [Code review recommendations](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/Releasing/Plugin%20guidelines.md)
- [Official ESLint module](https://github.com/obsidianmd/eslint-plugin)
- [Vitest advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)
- [YAML advisory](https://github.com/advisories/GHSA-48c2-rrv3-qjmp)
