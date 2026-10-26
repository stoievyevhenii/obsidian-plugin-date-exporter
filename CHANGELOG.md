# Changelog

## Unreleased

- Display properties as separate key - value lines instead of a table.

- Format each date line as == **YYYY-MM-DD** == and remove the standalone equals-sign divider below properties.

- Save Markdown (.md) reports with bold dates and key-value property lines.
- Default to the full previous month on days 1–7 and the full current month from day 8, using the local date at each dialog opening. Keep manual date overrides.
- Keep each source note in a separate block, retaining its source list numbers, checkbox markers, inline Markdown and indentation. Company/Ship grouping and generated numbering are removed.
- Escape property text to preserve its literal Markdown representation.
- Share Markdown with its matching extension and media type.
- Retain date sorting, empty-page skipping, checkbox filters, vault-root support and unique report filenames.

## 1.1.1

- Prepare the repository and draft-release workflow for Obsidian Community publication.
- Set the author to Yevhenii Stoiev and add repository/support metadata.
- Set the minimum app version to 1.5.7 after checking the source against its published API types.
- Apply Obsidian path normalization after validation, use Vault lookups for report collisions, and explicitly exclude hidden source folders.
- Validate report dates again at the write boundary and preserve text-only rendering.
- Remove the redundant settings heading and pass the official Obsidian ESLint checks with documented compatibility exceptions.
- Restrict source archives to publication files; exclude local settings, environment files and the generated bundle.
- Update vulnerable development dependencies and embed license notices in the standalone runtime bundle.

## 1.1.0

- Group output by date, Company and Ship; restart task numbering for each ship.
- Support recursive discovery of same-date notes in separate ship folders.

## 1.0.0

- Initial local TXT date-range exporter with mobile copy/share fallbacks.
