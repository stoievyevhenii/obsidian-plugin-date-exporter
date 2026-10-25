import { describe, expect, it } from 'vitest';
import { parseDailyNote } from '../src/properties';

describe('all frontmatter properties', () => {
  it('retains all field names and their order and separates the body', () => {
    expect(parseDailyNote('2026-10-24', '---\nCompany: Owner\nShip: Ship 1\nStatus: Active\n---\n- task\n'))
      .toEqual({ date: '2026-10-24', properties: [
        { name: 'Company', value: 'Owner' }, { name: 'Ship', value: 'Ship 1' }, { name: 'Status', value: 'Active' },
      ], markdown: '- task\n' });
  });
  it('supports BOM, CRLF, quoted strings and literal links', () => {
    expect(parseDailyNote('2026-10-24', '\ufeff---\r\nCompany: "Морская: компания" # comment\r\nShip: \'[[Ships/1|Ship 1]]\'\r\n---\r\n- task').properties)
      .toEqual([{ name: 'Company', value: 'Морская: компания' }, { name: 'Ship', value: '[[Ships/1|Ship 1]]' }]);
  });
  it('formats lists, numbers, booleans, null, multiline text and nested objects', () => {
    const note = parseDailyNote('2026-10-24', '---\ntags: [work, urgent]\ncount: 3\nactive: false\nempty: null\ntext: |\n  First\n  second\nextra: { nested: value }\n---\nBody');
    expect(note.properties).toEqual([
      { name: 'tags', value: 'work, urgent' }, { name: 'count', value: '3' }, { name: 'active', value: 'false' },
      { name: 'empty', value: '' }, { name: 'text', value: 'First second' }, { name: 'extra', value: '{"nested":"value"}' },
    ]);
  });
  it.each(['---\n---\n- task', '---\n{}\n---\n- task'])('accepts empty properties: %s', source => {
    expect(parseDailyNote('2026-10-24', source).properties).toEqual([]);
  });
  it('does not infer properties from body fields', () => {
    expect(parseDailyNote('2026-10-24', '# Title\nCompany: body\n---\nShip: body').properties).toBeUndefined();
  });
  it.each(['---\nCompany: [invalid\n---\n- task', '---\nCompany: A\n- task', '---\n- not a mapping\n---\n- task'])('rejects malformed YAML or non-mappings: %s', source => {
    expect(() => parseDailyNote('2026-10-24', source)).toThrow();
  });
});
