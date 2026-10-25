import { describe, expect, it } from 'vitest';
import { marked } from 'marked';
import { buildReport } from '../src/core';
const all = { listMode: 'all' as const, includeCompleted: true };

describe('rendered Markdown report', () => {
  it('renders a bold date and a two-column table with bold property names', async () => {
    const report = buildReport([{ date: '2026-10-24', properties: [
      { name: 'Company', value: 'Owner' }, { name: 'Ship', value: 'Ship 1' },
    ], markdown: '- [ ] Task' }], all);
    const view = document.createElement('div');
    view.innerHTML = await marked.parse(report.text);
    expect(view.querySelector('p > strong')?.textContent).toBe('2026-10-24');
    const rows = view.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(Array.from(rows).map(row => row.children.length)).toEqual([2, 2]);
    expect(view.querySelector('tbody td strong')?.textContent).toBe('Company');
    expect(view.querySelector('li')?.textContent?.trim()).toBe('Task');
    expect(view.querySelector('h1, h2')).toBeNull();
    expect(view.textContent).toContain('=====');
  });
  it('retains literal property text without breaking the table or its bold labels', async () => {
    const name = 'A|B **label** [link] _field_';
    const value = '<script>alert(1)</script> | [link](javascript:alert(1)) & `code`';
    const report = buildReport([{ date: '2026-10-24', properties: [{ name, value }], markdown: 'Body' }], all);
    const view = document.createElement('div');
    view.innerHTML = await marked.parse(report.text);
    expect(view.querySelector('tbody tr')?.children).toHaveLength(2);
    expect(view.querySelector('tbody td strong')?.textContent).toBe(name);
    expect(view.querySelectorAll('tbody td')[1]?.textContent).toBe(value);
    expect(view.querySelector('script, a, code')).toBeNull();
  });
});
