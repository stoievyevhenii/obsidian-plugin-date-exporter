# Changelog

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
