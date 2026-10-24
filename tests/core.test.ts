import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { buildReport, cleanFolder, compileNameFormat, extractItems, propertyLabel, validateDate, validateRange } from '../src/core';
import { parseDailyNote } from '../src/properties';
import { DEFAULT_SETTINGS, loadSettings, validateSettings } from '../src/settings';

const all = { listMode: 'all' as const, includeCompleted: true };
describe('civil dates and filenames', () => {
  it.each(['2026-02-29', '2026-04-31', '2026-13-01', '0000-01-01', '2026-00-01', '2026-01-00', '26-10-01', '2026-1-01', '2026-10-01 ', '2026-10-01T00:00:00Z'])('rejects %s', value => {
    expect(() => validateDate(value)).toThrow();
  });
  it.each(['2024-02-29', '2000-02-29', '0001-01-01', '9999-12-31'])('accepts %s', value => {
    expect(validateDate(value)).toBe(value);
  });
  it('rejects a century leap day and reverse range; permits a single day', () => {
    expect(() => validateDate('1900-02-29')).toThrow();
    expect(() => validateRange('2026-10-23', '2026-10-01')).toThrow();
    expect(() => validateRange('2026-10-01', '2026-10-01')).not.toThrow();
  });
  it('requires a strict full match, including directory boundaries', () => {
    const parse = compileNameFormat('YYYY-MM-DD.md');
    expect(parse('2026-10-01.md')).toBe('2026-10-01');
    for (const path of ['2026-10-01.md.bak', 'other/2026-10-01.md', '2026-02-29.md', '2026-1-01.md']) expect(parse(path)).toBeNull();
  });
  it('supports literals, alternate order and date subfolders with consistent duplicates', () => {
    expect(compileNameFormat('[День-]DD.MM.YYYY')('День-23.10.2026.md')).toBe('2026-10-23');
    const parse = compileNameFormat('YYYY/MM/YYYY-MM-DD');
    expect(parse('2026/10/2026-10-23.md')).toBe('2026-10-23');
    expect(parse('2025/10/2026-10-23.md')).toBeNull();
  });
  it.each(['YYYY-MM', 'yyyy-MM-dd', 'YYYY-M-D', '[YYYY]-MM-DD', '[unclosed', '../YYYY-MM-DD', '/YYYY-MM-DD', 'YYYY//MM/DD'])('rejects ambiguous or unsafe format %s', value => {
    expect(() => compileNameFormat(value)).toThrow();
  });
  it.each(['../Reports', '/tmp', 'C:\\Reports', '.obsidian', 'Reports/../Daily', 'a//b', 'a/?', 'a/..', 'a/b.'])('rejects unsafe folder %s', value => {
    expect(() => cleanFolder(value)).toThrow();
  });
  it('accepts root, nested folders and Windows separators', () => {
    expect(cleanFolder('')).toBe('');
    expect(cleanFolder('Reports\\2026/')).toBe('Reports/2026');
  });
});

describe('Markdown conversion', () => {
  it('reads all bullet / ordered markers and both checkbox states; drops blanks', () => {
    expect(extractItems('- alpha\n* beta\n+ gamma\n\n1. first\n2) second\n\n- [ ] pending\n- [x] done\n- [X] DONE\n- [ ]\n- [x]   \n-\n', all))
      .toEqual(['alpha', 'beta', 'gamma', 'first', 'second', 'pending', 'done', 'DONE']);
  });
  it('emits nested items separately and keeps a multiline item on one output line', () => {
    expect(extractItems('- parent\n  continued\n  - [ ] child\n    second line\n  - sibling\n\n- next\n', all))
      .toEqual(['parent continued', 'child second line', 'sibling', 'next']);
  });
  it('ignores YAML, prose, comments, fenced and indented code', () => {
    const md = '---\ntags:\n - not a task\n---\n# Title\nProse\n<!--\n- hidden\n-->\n%%\n- hidden\n%%\n```md\n- code\n```\n\n    - indented code\n\n- visible\n';
    expect(extractItems(md, all)).toEqual(['visible']);
  });
  it('supports CRLF, BOM, loose lists, callouts, inline styles, links, entities and wikilinks', () => {
    const md = '\ufeff- **Bold** *italic* `code` [link](https://example.com) &amp; [[Note|alias]]\r\n\r\n- Next\r\n\r\n> [!todo]\r\n> - [ ] Quoted task\r\n';
    expect(extractItems(md, all)).toEqual(['Bold italic code link & alias', 'Next', 'Quoted task']);
  });
  it('checkbox mode still walks children of ordinary bullets', () => {
    expect(extractItems('- parent\n  - [ ] pending\n  - [x] done\n- [/] doing\n- [!] urgent\n', { listMode: 'checkboxes', includeCompleted: false }))
      .toEqual(['pending', 'doing', 'urgent']);
  });
  it('normalizes whitespace after custom checkboxes without losing task text', () => {
    expect(extractItems('- [!]    urgent\n- [/]\t doing\n', { listMode: 'checkboxes', includeCompleted: true })).toEqual(['urgent', 'doing']);
  });
  it('does not treat escaped checkbox-looking text as a task', () => {
    expect(extractItems('- \\[x] literal\n', { listMode: 'checkboxes', includeCompleted: true })).toEqual([]);
  });
  it('drops invisible and markup-only items', () => {
    expect(extractItems('- ** **\n- [ ] \u200b\n- <!-- comment -->\n', all)).toEqual([]);
  });
  it('does not include a task code block in the parent text', () => {
    expect(extractItems('- parent\n\n  ```\n  - fake\n  ```\n\n- real\n', all)).toEqual(['parent', 'real']);
  });
  it('does not interpret comment delimiters inside code; preserves joined emoji', () => {
    expect(extractItems('```\n<!--\n%%\n```\n\n- 👩‍💻 Task `%% literal`\n', all)).toEqual(['👩‍💻 Task %% literal']);
  });
  it('omits Obsidian comments inline, in a list item, and in a blockquote', () => {
    expect(extractItems('- visible %% hidden %% end\n- %% hidden %%\n> %%\n> - hidden task\n> %%\n> - shown\n', all)).toEqual(['visible end', 'shown']);
  });
  it('sorts across month/year, resets numbering, skips empty days and merges duplicate dates', () => {
    const report = buildReport([
      { date: '2027-01-01', markdown: '- Вторая дата', company: 'Company', ship: 'Ship' },
      { date: '2026-12-31', markdown: '- Первый\n- Второй', company: 'Company', ship: 'Ship' },
      { date: '2026-12-30', markdown: 'Prose\n- [ ]' },
      { date: '2026-12-31', markdown: '- Третий', company: 'Company', ship: 'Ship' },
    ], all);
    expect(report).toEqual({ text: '2026-12-31\n[Company]\n  Ship:\n    1) Первый\n    2) Второй\n    3) Третий\n\n2027-01-01\n[Company]\n  Ship:\n    1) Вторая дата\n', days: 2, items: 4 });
  });
  it('returns no file content when there are no items', () => {
    expect(buildReport([{ date: '2026-10-01', markdown: '# Empty' }], all)).toEqual({ text: '', days: 0, items: 0 });
  });
  it('matches the shipped Russian example exactly', async () => {
    const notes = await Promise.all(['2026-10-01', '2026-10-02', '2026-10-03'].map(async date =>
      parseDailyNote(date, await readFile(`examples/Daily Notes/${date}.md`, 'utf8'))));
    const expected = await readFile('examples/expected.txt', 'utf8');
    expect(buildReport(notes, all).text).toBe(expected);
  });
});

describe('Company / Ship grouping', () => {
  it('matches the shipped same-date two-ship example exactly', async () => {
    const notes = await Promise.all(['Ship 1', 'Ship 2'].map(async ship =>
      parseDailyNote('2026-10-24', await readFile(`examples/Grouped/${ship}/2026-10-24.md`, 'utf8'))));
    expect(buildReport(notes, all).text).toBe(await readFile('examples/grouped-expected.txt', 'utf8'));
  });
  it('sorts companies and ships, merges each group and resets numbers per ship and date', () => {
    const report = buildReport([
      { date: '2026-10-24', company: 'B', ship: 'Ship 1', markdown: '- B task' },
      { date: '2026-10-24', company: 'A', ship: 'Ship 2', markdown: '- Second ship' },
      { date: '2026-10-24', company: 'A', ship: 'Ship 1', markdown: '- First\n- Second' },
      { date: '2026-10-24', company: 'A', ship: 'Ship 1', markdown: '- Third' },
      { date: '2026-10-25', company: 'A', ship: 'Ship 1', markdown: '- Next day' },
    ], all);
    expect(report).toEqual({ days: 2, items: 6, text:
      '2026-10-24\n[A]\n  Ship 1:\n    1) First\n    2) Second\n    3) Third\n  Ship 2:\n    1) Second ship\n[B]\n  Ship 1:\n    1) B task\n\n2026-10-25\n[A]\n  Ship 1:\n    1) Next day\n' });
  });
  it('omits companies, ships and days with no included items', () => {
    const report = buildReport([
      { date: '2026-10-24', company: 'Empty', ship: 'Empty', markdown: '- [x] done' },
      { date: '2026-10-25', company: 'A', ship: 'Empty', markdown: '- [ ]' },
      { date: '2026-10-25', company: 'A', ship: 'Active', markdown: '- [ ] pending' },
    ], { listMode: 'checkboxes', includeCompleted: false });
    expect(report).toEqual({ days: 1, items: 1, text: '2026-10-25\n[A]\n  Active:\n    1) pending\n' });
  });
  it('keeps tasks when properties are missing', () => {
    expect(buildReport([{ date: '2026-10-24', markdown: '- Task' }], all).text)
      .toBe('2026-10-24\n[Без компании]\n  Без судна:\n    1) Task\n');
  });
  it('normalizes text, links and lists without duplicating tasks', () => {
    expect(propertyLabel([' [[Company|ShipCompany]] ', 'ShipCompany', 'Partner'], 'fallback')).toBe('ShipCompany, Partner');
    expect(propertyLabel('Ship\n  1', 'fallback')).toBe('Ship 1');
    expect(propertyLabel([], 'fallback')).toBe('fallback');
    expect(propertyLabel('  ', 'fallback')).toBe('fallback');
    expect(() => propertyLabel({ wrong: 'type' }, 'fallback')).toThrow('Company');
  });
});

describe('settings', () => {
  it('merges old / corrupt data without trusting invalid types', () => {
    expect(loadSettings({ listMode: 'bogus', includeCompleted: 'false', dailyFolder: 3 })).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
  it('validates before saving', () => {
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, dailyFolder: '../' })).toThrow();
    expect(validateSettings({ ...DEFAULT_SETTINGS, outputFolder: 'Reports/2026/' }).outputFolder).toBe('Reports/2026');
  });
});
