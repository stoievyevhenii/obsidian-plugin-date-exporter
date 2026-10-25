import { describe, expect, it } from 'vitest';
import { buildReport, extractItems } from '../src/core';
import { parseDailyNote } from '../src/properties';

const all = { listMode: 'all' as const, includeCompleted: true };

describe('plain text alongside Markdown lists', () => {
  it('exports the screenshot example without requiring a list marker', () => {
    expect(extractItems('Проверка вчера', all)).toEqual(['Проверка вчера']);
  });
  it('preserves mixed body lines and nested lists without duplicating continuations', () => {
    const markdown = 'Первая строка\nВторая строка\n\n- Parent\n  continued\n  - Child\n- [ ] Task\n\nПоследняя строка';
    expect(extractItems(markdown, all)).toEqual(['Первая строка', 'Вторая строка', 'Parent continued', 'Child', 'Task', 'Последняя строка']);
  });
  it('preserves the checkbox-only filter', () => {
    const markdown = 'Body text\n\n- Ordinary\n- [ ] Pending\n- [x] Done';
    expect(extractItems(markdown, { listMode: 'checkboxes', includeCompleted: false })).toEqual(['Pending']);
  });
  it('cleans inline Markdown and separates hard and soft line breaks', () => {
    expect(extractItems('**First**  \n[Second](https://example.com)\nThird', all)).toEqual(['First', 'Second', 'Third']);
  });
  it('omits structural content and empty lines', () => {
    const markdown = '---\nCompany: Owner\nShip: Ship 1\n---\n# 2026-10-23\n\n<!-- hidden -->\n%% hidden %%\n\n~~~\nHidden code\n~~~\n\n    Indented code\n';
    expect(extractItems(markdown, all)).toEqual([]);
  });
  it('retains quoted lists without adding callout titles or quoted prose', () => {
    expect(extractItems('> [!todo] Title\n> Quoted prose\n> - Task\n\nBody text', all)).toEqual(['Task', 'Body text']);
  });
  it('exports properties followed by markerless text without generated numbering', () => {
    const note = parseDailyNote('2026-10-23', '---\nCompany: ShipCompany\nShip: Ship 1\n---\nПроверка вчера');
    expect(buildReport([note], all)).toEqual({ days: 1, items: 1, text: '**2026-10-23**\n\n| Свойство | Значение |\n| --- | --- |\n| **Company** | ShipCompany |\n| **Ship** | Ship 1 |\n\n=====\n\nПроверка вчера\n' });
  });
});
