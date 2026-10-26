import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { App, PluginManifest } from 'obsidian';
import DailyNotesTxtExport, { ExportModal, ResultModal } from '../src/main';
import { TFile, Notice } from './obsidian-mock';
import { DEFAULT_SETTINGS } from '../src/settings';

let plugin: DailyNotesTxtExport;
let app: App;
let create: ReturnType<typeof vi.fn>;
beforeEach(() => {
  create = vi.fn(async (path: string, _content: string) => new TFile(path));
  const file = new TFile('2026-10-01.md');
  app = { vault: {
    getMarkdownFiles: () => [file], getAbstractFileByPath: () => null,
    cachedRead: vi.fn(async () => '---\nCompany: ShipCompany\nShip: Ship 1\n---\n- [ ] Проверить экспорт'),
    createFolder: vi.fn(async () => {}), adapter: { exists: vi.fn(async () => false) }, create,
  } } as unknown as App;
  plugin = new DailyNotesTxtExport(app, {} as PluginManifest);
  Notice.messages = [];
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 25, 12));
});
afterEach(() => { vi.useRealTimers(); plugin.onunload(); document.body.replaceChildren(); });

describe('mobile / desktop export dialog flow', () => {
  it('exports markerless body text through the full dialog and save flow', async () => {
    vi.mocked(app.vault.cachedRead).mockResolvedValue('---\nCompany: ShipCompany\nShip: Ship 1\n---\nПроверка вчера');
    plugin.track(new ExportModal(app, plugin));
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(document.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('== **2026-10-01** ==\n\nCompany - ShipCompany  \nShip - Ship 1\n\nПроверка вчера\n');
  });
  it('registers the command and opens the dialog with the requested default range', async () => {
    await plugin.onload();
    const addCommand = vi.mocked(plugin.addCommand);
    addCommand.mock.calls[0]![0].callback!();
    const dates = document.querySelectorAll<HTMLInputElement>('input[type=date]');
    expect(dates[0]?.value).toBe('2026-10-01');
    expect(dates[1]?.value).toBe('2026-10-31');
    plugin.onunload(); expect(document.querySelector('.modal')).toBeNull();
  });
  it.each([
    [new Date(2026, 10, 7, 12), '2026-10-01', '2026-10-31'],
    [new Date(2026, 10, 8, 12), '2026-11-01', '2026-11-30'],
    [new Date(2027, 0, 1, 12), '2026-12-01', '2026-12-31'],
  ])('prefills the monthly range on opening at %s', (today, start, end) => {
    vi.setSystemTime(today as Date);
    plugin.track(new ExportModal(app, plugin));
    const dates = document.querySelectorAll<HTMLInputElement>('input[type=date]');
    expect(dates[0]?.value).toBe(start);
    expect(dates[1]?.value).toBe(end);
  });
  it('recomputes dates on reopening after the 7th and permits a manual range', async () => {
    vi.setSystemTime(new Date(2026, 10, 7, 12));
    const first = new ExportModal(app, plugin); plugin.track(first); first.close();
    vi.setSystemTime(new Date(2026, 10, 8, 12));
    plugin.track(new ExportModal(app, plugin));
    const dates = document.querySelectorAll<HTMLInputElement>('input[type=date]');
    expect(dates[0]?.value).toBe('2026-11-01');
    expect(dates[1]?.value).toBe('2026-11-30');
    dates[0]!.value = '2026-10-01'; dates[0]!.dispatchEvent(new Event('input'));
    dates[1]!.value = '2026-10-02'; dates[1]!.dispatchEvent(new Event('input'));
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0]![0]).toBe('Reports/Daily-report_2026-10-01_2026-10-02.md');
  });
  it('blocks a reverse range and displays an inline error', () => {
    plugin.track(new ExportModal(app, plugin));
    const dates = document.querySelectorAll<HTMLInputElement>('input[type=date]');
    dates[0]!.value = '2026-11-01'; dates[0]!.dispatchEvent(new Event('input'));
    expect(document.querySelector<HTMLButtonElement>('button[type=submit]')?.disabled).toBe(true);
    expect(document.querySelector('[role=status]')?.textContent).toContain('не позже');
    expect(create).not.toHaveBeenCalled();
  });
  it('builds a report, automatically saves exactly once, and exposes mobile actions', async () => {
    plugin.track(new ExportModal(app, plugin));
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const area = document.querySelector<HTMLTextAreaElement>('textarea')!;
    expect(area.value).toBe('== **2026-10-01** ==\n\nCompany - ShipCompany  \nShip - Ship 1\n\n- [ ] Проверить экспорт\n');
    expect(document.body.textContent).toContain('Копировать');
    expect(document.body.textContent).toContain('Поделиться');
    expect(document.body.textContent).toContain('Выделить всё');
    expect(create.mock.calls[0]![0]).toBe('Reports/Daily-report_2026-10-01_2026-10-31.md');
    const saveButton = document.querySelector<HTMLButtonElement>('.dn-txt-actions button')!;
    await vi.waitFor(() => expect(saveButton.disabled).toBe(true));
    saveButton.click(); expect(create).toHaveBeenCalledTimes(1);
  });
  it('retains text after a failed write and permits retry', async () => {
    create.mockRejectedValueOnce(new Error('Disk full'));
    const report = { text: '01-10-2026\n1) Task\n', days: 1, items: 1, start: '2026-10-01', end: '2026-10-01', matchedFiles: 1 };
    plugin.track(new ResultModal(app, plugin, DEFAULT_SETTINGS, report));
    await vi.waitFor(() => expect(document.body.textContent).toContain('Повторить сохранение'));
    expect(document.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe(report.text);
    document.querySelector<HTMLButtonElement>('.dn-txt-actions button')!.click();
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(document.body.textContent).toContain('Сохранено: Reports/'));
  });
  it('cancels pending reads when the export dialog closes', async () => {
    let resolve!: (text: string) => void;
    vi.mocked(app.vault.cachedRead).mockImplementation(() => new Promise<string>(r => { resolve = r; }));
    const modal = new ExportModal(app, plugin); plugin.track(modal);
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    modal.close(); resolve('- Task');
    await new Promise(r => setTimeout(r, 30));
    expect(create).not.toHaveBeenCalled(); expect(document.querySelector('textarea')).toBeNull();
  });
  it('previews hostile-looking note content strictly as plain text', async () => {
    vi.mocked(app.vault.cachedRead).mockResolvedValue('---\nCompany: "<img src=x onerror=alert(1)>"\nShip: "<script>alert(1)</script>"\n---\n- Safe &lt;img src=x onerror=alert(1)&gt;');
    plugin.track(new ExportModal(app, plugin));
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(document.querySelector('textarea')?.value).toContain('\\<img');
    expect(document.querySelector('img, script')).toBeNull();
  });
});
