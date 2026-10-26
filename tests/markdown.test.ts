import { describe, expect, it } from 'vitest';
import { marked } from 'marked';
import { buildReport } from '../src/core';
const all = { listMode: 'all' as const, includeCompleted: true };

describe('rendered Markdown report', () => {
  it('renders a bold date and separate plain key-value property lines', async () => {
    const report = buildReport([{ date: '2026-10-24', properties: [
      { name: 'Company', value: 'Owner' }, { name: 'Ship', value: 'Ship 1' },
    ], markdown: '- [ ] Task' }], all);
    const view = document.createElement('div');
    view.innerHTML = await marked.parse(report.text);
    expect(view.querySelector('p > strong')?.textContent).toBe('2026-10-24');
    const properties = view.querySelectorAll('p')[1]!;
    expect(properties.textContent).toBe('Company - OwnerShip - Ship 1');
    expect(properties.querySelectorAll('br')).toHaveLength(1);
    expect(view.querySelector('table')).toBeNull();
    expect(properties.querySelector('strong')).toBeNull();
    expect(view.querySelector('li')?.textContent?.trim()).toBe('Task');
    expect(view.querySelector('h1, h2')).toBeNull();
    expect(view.querySelector('p')?.textContent).toBe('== 2026-10-24 ==');
    expect(report.text.split('\n')).not.toContain('=====');
  });
  it('retains literal property names and values without active formatting', async () => {
    const name = 'A|B **label** [link] _field_';
    const value = '<script>alert(1)</script> | [link](javascript:alert(1)) & `code`';
    const report = buildReport([{ date: '2026-10-24', properties: [{ name, value }], markdown: 'Body' }], all);
    const view = document.createElement('div');
    view.innerHTML = await marked.parse(report.text);
    expect(view.querySelectorAll('p')[1]?.textContent).toBe(name + ' - ' + value);
    expect(view.querySelector('table')).toBeNull();
    expect(view.querySelector('script, a, code')).toBeNull();
  });
});
