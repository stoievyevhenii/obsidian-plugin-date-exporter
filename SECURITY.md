# Security policy

## Scope

The current release is maintained by Yevhenii Stoiev. Report a vulnerability against the latest release; older releases may require an update.

The plugin reads selected daily Markdown notes through Obsidian's Vault API, parses properties with the host's public YAML parser, and creates a plaintext Markdown report inside the same vault. It does not modify source notes. All YAML properties and the selected source lines are exported into the report; property names do not define access controls.

Runtime has no telemetry, network requests, remote code loading, credentials, account requirement, self-update mechanism, or Node/Electron dependency. Copy and Share are explicit user actions. Once copied or shared, content is subject to the operating system and the selected receiving application's handling. Saved reports follow the vault's synchronization settings.

Obsidian is a trusted host. Plugins are not isolated from other code with the same host authority. Filesystem mounts/symlinks, host parser internals, operating-system clipboard permissions and Web Share availability are outside this plugin's control. Large selected notes can consume significant memory; export only content you trust and keep Obsidian updated.

## Reporting

If private vulnerability reporting is enabled, use [GitHub private vulnerability reporting](https://github.com/stoievyevhenii/obsidian-plugin-date-exporter/security/advisories/new). Otherwise contact the maintainer through their [GitHub profile](https://github.com/stoievyevhenii) to arrange a private channel. Do not post private notes, credentials or exploit details in a public issue before coordination.

Include the plugin/Obsidian versions, operating system, minimal dummy-note reproduction, impact and affected code. Remove personal and company information from test notes.

## Development and releases

Run `npm ci`, `npm run verify` and `npm audit --audit-level=moderate`. Source packaging uses explicit root-file/directory allowlists, omits local settings/environment files and does not follow symbolic links. Full first-party and third-party license notices are embedded in `main.js`, because Community installs download the three runtime assets directly.

CI has read-only repository permissions. Release creation is manual and creates a draft; the release job alone has contents write permission. Official GitHub Actions are pinned by commit. No release token is stored in source. Review the draft and installed-app test checklist before publication.
