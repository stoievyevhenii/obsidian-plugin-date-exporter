import { describe, expect, it } from 'vitest';
import { parseDailyNote } from '../src/properties';

describe('properties from frontmatter', () => {
  it('reads exact Company and Ship keys and removes YAML from the task body', () => {
    expect(parseDailyNote('2026-10-24', '---\nCompany: ShipCompany\nShip: Ship 1\ntags:\n - hidden\n---\n- task\n'))
      .toEqual({ date: '2026-10-24', company: 'ShipCompany', ship: 'Ship 1', markdown: '- task\n' });
  });
  it('supports quoted names, escaped Unicode, BOM and CRLF', () => {
    const note = parseDailyNote('2026-10-24', '\ufeff---\r\nCompany: "Морская: компания" # comment\r\nShip: \'[[Ships/1|Ship 1]]\'\r\n---\r\n- task');
    expect(note.company).toBe('Морская: компания'); expect(note.ship).toBe('Ship 1'); expect(note.markdown).toBe('- task');
  });
  it('supports Obsidian list properties as a single combined label', () => {
    const note = parseDailyNote('2026-10-24', '---\nCompany:\n - Company A\n - Company B\nShip: ["Ship 1", "Ship 2"]\n---\n- task');
    expect(note.company).toBe('Company A, Company B'); expect(note.ship).toBe('Ship 1, Ship 2');
  });
  it.each(['---\n---\n- task', '---\nCompany:\nShip: ""\n---\n- task'])('uses fallback groups for empty properties %s', source => {
    const note = parseDailyNote('2026-10-24', source); expect(note.company).toBe('Без компании'); expect(note.ship).toBe('Без судна');
  });
  it('does not treat body fields or a later YAML-looking section as page properties', () => {
    expect(parseDailyNote('2026-10-24', '# Title\nCompany: body\n---\nShip: body').company).toBeUndefined();
  });
  it.each(['---\nCompany: [invalid\n---\n- task', '---\nCompany: A\n- task', '---\n- not a mapping\n---\n- task', '---\nCompany: { nested: value }\n---\n- task'])('rejects malformed or unsupported properties %s', source => {
    expect(() => parseDailyNote('2026-10-24', source)).toThrow();
  });
});
