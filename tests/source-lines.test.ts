import { describe, expect, it } from 'vitest';
import { buildReport, extractSourceLines } from '../src/core';
import { parseDailyNote } from '../src/properties';
const all = { listMode: 'all' as const, includeCompleted: true };
describe('source lines in MD reports', () => {
  it('copies original list numbers, bullets, inline formatting and checkboxes', () => {
    const lines = ['7) **First**', '8) [Link](https://example.com)', '- [ ] Pending', '- [x] Done', '* [[Note|Alias]]'];
    expect(extractSourceLines(lines.join('\n'), all)).toEqual(lines);
  });
  it('preserves nested indentation and multiline items exactly once', () => {
    const lines = ['- parent', '  continued', '  - [ ] child', '    second line', '  - sibling', '- next'];
    expect(extractSourceLines(lines.join('\n'), all)).toEqual(lines);
  });
  it('filters completed parents without dropping their pending children', () => {
    const source = '- [x] Done\n  continuation\n  - [ ] Child\n- Ordinary\n  - [!] Urgent\n\nBody';
    expect(extractSourceLines(source, { listMode: 'checkboxes', includeCompleted: false }))
      .toEqual(['  - [ ] Child', '  - [!] Urgent']);
  });
  it('excludes code blocks, frontmatter, headings, blank items and comments', () => {
    const source = '---\ntags: [hidden]\n---\n# Heading\n\n- [ ]\n- %% hidden %%\n- Visible %% secret %% end\n\n~~~\n- code\n~~~\n\n<!-- hidden -->\n%%\n- hidden\n%%\nBody';
    expect(extractSourceLines(source, all)).toEqual(['- Visible  end', 'Body']);
  });
  it('copies plain text, spaces and line breaks without generating any numbers', () => {
    expect(extractSourceLines('First  line  \r\nSecond line', all)).toEqual(['First  line  ', 'Second line']);
  });
  it('does not leak excluded nested code or duplicate continuation lines', () => {
    expect(extractSourceLines('- parent\n\n  ~~~\n  - code\n  ~~~\n\n- next', all)).toEqual(['- parent', '- next']);
  });
  it('separates properties and lines with exactly five equals signs', () => {
    const note = parseDailyNote('2026-10-24', '---\nCompany: Owner\nShip: Ship 1\ntags: [work, urgent]\n---\nA plain line\n\n- [ ] A task');
    expect(buildReport([note], all)).toEqual({ days: 1, items: 2, text:
      '**2026-10-24**\n\n| Свойство | Значение |\n| --- | --- |\n| **Company** | Owner |\n| **Ship** | Ship 1 |\n| **tags** | work, urgent |\n\n=====\n\nA plain line\n- [ ] A task\n' });
  });
  it('keeps children of empty parent items and quoted lists on their source lines', () => {
    expect(extractSourceLines('-\n  - Child\n\n>\n> - Quoted', all)).toEqual(['  - Child', '> - Quoted']);
  });
  it('does not create a report from invisible-only text or property-only pages', () => {
    const note = parseDailyNote('2026-10-24', '---\nCompany: Owner\n---\n\u200b\n&nbsp;');
    expect(buildReport([note], all)).toEqual({ text: '', days: 0, items: 0 });
  });
  it('keeps literal comment delimiters inside inline code', () => {
    expect(extractSourceLines('- Keep `%% literal` and **bold %% hidden %% end**', all))
      .toEqual(['- Keep `%% literal` and **bold  end**']);
  });
  it('includes a separator but does not invent properties when frontmatter is absent', () => {
    expect(buildReport([{ date: '2026-10-24', markdown: 'Body' }], all).text).toBe('**2026-10-24**\n\n=====\n\nBody\n');
  });
});
