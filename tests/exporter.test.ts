import { describe, expect, it, vi } from 'vitest';
import type { Vault } from 'obsidian';
import { prepareReport, saveReport } from '../src/exporter';
import { DEFAULT_SETTINGS } from '../src/settings';
import { TFile, TFolder } from './obsidian-mock';

export function mockVault(markdown: Record<string, string>) {
  const entries = new Map<string, TFile | TFolder>();
  for (const path of Object.keys(markdown)) {
    entries.set(path, new TFile(path));
    const parts = path.split('/'); parts.pop();
    while (parts.length) { const folder = parts.join('/'); entries.set(folder, new TFolder(folder)); parts.pop(); }
  }
  const saved = new Map<string, string>();
  const vault = {
    getMarkdownFiles: () => [...entries.values()].filter((file): file is TFile => file instanceof TFile && file.path.endsWith('.md')),
    getAbstractFileByPath: (path: string) => entries.get(path) ?? null,
    cachedRead: vi.fn(async (file: TFile) => markdown[file.path]!),
    createFolder: vi.fn(async (path: string) => { entries.set(path, new TFolder(path)); }),
    adapter: { exists: vi.fn(async (path: string) => entries.has(path)) },
    create: vi.fn(async (path: string, content: string) => {
      if (entries.has(path)) throw new Error('Exists');
      const file = new TFile(path); entries.set(path, file); saved.set(path, content); return file;
    }),
  };
  return { vault: vault as unknown as Vault, api: vault, entries, saved };
}

describe('vault export', () => {
  it('reads only the configured folder and inclusive range, sorts, saves one UTF-8 report', async () => {
    const { vault, api, saved } = mockVault({
      'Daily/2026-10-23.md': '- Last', 'Daily/2026-10-01.md': '- First',
      'Daily/2026-10-02.md': '# Empty', 'Daily/2026-09-30.md': '- Before',
      'Daily/2026-10-24.md': '- After', 'Daily-other/2026-10-01.md': '- Wrong',
      'Daily/nested/2026-10-01.md': '- Wrong depth', '2026-10-01.md': '- Root',
    });
    const settings = { ...DEFAULT_SETTINGS, dailyFolder: 'Daily', includeSubfolders: false };
    const report = await prepareReport(vault, settings, '2026-10-01', '2026-10-23');
    expect(report.text).toBe('== **2026-10-01** ==\n\n- First\n\n== **2026-10-23** ==\n\n- Last\n');
    expect(api.cachedRead).toHaveBeenCalledTimes(3);
    expect(api.create).not.toHaveBeenCalled();
    const file = await saveReport(vault, settings, report);
    expect(file.path).toBe('Reports/Daily-report_2026-10-01_2026-10-23.md');
    expect([...saved.values()]).toEqual([report.text]);
  });
  it('supports a nested date filename format', async () => {
    const { vault } = mockVault({ 'Daily/2026/10/23.10.2026.md': '- OK' });
    const report = await prepareReport(vault, { ...DEFAULT_SETTINGS, dailyFolder: 'Daily', nameFormat: 'YYYY/MM/DD.MM.YYYY' }, '2026-10-23', '2026-10-23');
    expect(report.items).toBe(1);
  });
  it('keeps same-date pages separate in file-path order with their own properties', async () => {
    const { vault } = mockVault({
      'Daily/Other/2026-10-24.md': '---\nCompany: Company B\nShip: Ship 1\n---\n- B',
      'Daily/Folder 1/2026-10-24.md': '---\nCompany: ShipCompany\nShip: Ship 1\n---\n- First\n- Second',
      'Daily/Folder 2/2026-10-24.md': '---\nCompany: ShipCompany\nShip: Ship 2\n---\n- Third',
      'Daily/Empty/2026-10-24.md': '---\nCompany: Empty\nShip: Empty\n---\n- [ ]',
      'Daily-other/2026-10-24.md': '- not included',
    });
    const report = await prepareReport(vault, { ...DEFAULT_SETTINGS, dailyFolder: 'Daily' }, '2026-10-24', '2026-10-24');
    expect(report.matchedFiles).toBe(4);
    expect(report.text).toBe('== **2026-10-24** ==\n\nCompany - ShipCompany  \nShip - Ship 1\n\n- First\n- Second\n\n== **2026-10-24** ==\n\nCompany - ShipCompany  \nShip - Ship 2\n\n- Third\n\n== **2026-10-24** ==\n\nCompany - Company B  \nShip - Ship 1\n\n- B\n');
  });
  it('reports invalid YAML with the source path and writes nothing', async () => {
    const { vault, api } = mockVault({ 'Daily/2026-10-24.md': '---\nCompany: [broken\n---\n- task' });
    await expect(prepareReport(vault, { ...DEFAULT_SETTINGS, dailyFolder: 'Daily' }, '2026-10-24', '2026-10-24')).rejects.toThrow('Daily/2026-10-24.md');
    expect(api.create).not.toHaveBeenCalled();
  });
  it('excludes hidden child folders even if the host enumerates them', async () => {
    const { vault, api } = mockVault({ 'Daily/.hidden/2026-10-24.md': '- Hidden', 'Daily/Visible/2026-10-24.md': '- Visible' });
    const report = await prepareReport(vault, { ...DEFAULT_SETTINGS, dailyFolder: 'Daily' }, '2026-10-24', '2026-10-24');
    expect(report.matchedFiles).toBe(1); expect(report.text).not.toContain('Hidden'); expect(api.cachedRead).toHaveBeenCalledTimes(1);
  });
  it('rejects forged report date paths before any write', async () => {
    const { vault, api } = mockVault({});
    await expect(saveReport(vault, DEFAULT_SETTINGS, { start: '../outside', end: '2026-10-24', text: 'Task', days: 1, items: 1, matchedFiles: 1 })).rejects.toThrow();
    expect(api.createFolder).not.toHaveBeenCalled(); expect(api.create).not.toHaveBeenCalled();
  });
  it('fails clearly for a missing daily folder', async () => {
    const { vault } = mockVault({});
    await expect(prepareReport(vault, { ...DEFAULT_SETTINGS, dailyFolder: 'Missing' }, '2026-10-01', '2026-10-23')).rejects.toThrow('Папка');
  });
  it('aborts on read failure without writing a partial report', async () => {
    const { vault, api } = mockVault({ '2026-10-01.md': '- A', '2026-10-02.md': '- B' });
    api.cachedRead.mockRejectedValueOnce(new Error('Permission'));
    await expect(prepareReport(vault, DEFAULT_SETTINGS, '2026-10-01', '2026-10-23')).rejects.toThrow('2026-10-01.md');
    expect(api.create).not.toHaveBeenCalled();
  });
  it('handles cancellation and invalid dates before reading', async () => {
    const { vault, api } = mockVault({ '2026-10-01.md': '- A' });
    const abort = new AbortController(); abort.abort();
    await expect(prepareReport(vault, DEFAULT_SETTINGS, '2026-10-01', '2026-10-23', undefined, abort.signal)).rejects.toMatchObject({ name: 'AbortError' });
    await expect(prepareReport(vault, DEFAULT_SETTINGS, '2026-10-23', '2026-10-01')).rejects.toThrow();
    expect(api.cachedRead).not.toHaveBeenCalled();
  });
  it('never overwrites reports and creates nested output folders', async () => {
    const { vault, saved } = mockVault({ '2026-10-01.md': '- Task' });
    const settings = { ...DEFAULT_SETTINGS, outputFolder: 'Reports/2026' };
    const report = await prepareReport(vault, settings, '2026-10-01', '2026-10-01');
    const first = await saveReport(vault, settings, report);
    const second = await saveReport(vault, settings, report);
    expect(first.path).not.toEqual(second.path);
    expect(second.path).toContain(' (2).md');
    expect(saved.size).toBe(2);
  });
  it('does not create an empty MD and reports file/folder conflicts', async () => {
    const { vault, entries, api } = mockVault({ '2026-10-01.md': '' });
    const report = await prepareReport(vault, DEFAULT_SETTINGS, '2026-10-01', '2026-10-01');
    await expect(saveReport(vault, DEFAULT_SETTINGS, report)).rejects.toThrow('MD не создан');
    expect(api.createFolder).not.toHaveBeenCalled();
    entries.set('Reports', new TFile('Reports'));
    await expect(saveReport(vault, DEFAULT_SETTINGS, { ...report, text: 'Text' })).rejects.toThrow('Вместо папки');
  });
  it('preserves a write error and retries a collision that occurred during creation', async () => {
    const { vault, api, entries } = mockVault({ '2026-10-01.md': '- Task' });
    const report = await prepareReport(vault, DEFAULT_SETTINGS, '2026-10-01', '2026-10-01');
    api.create.mockImplementationOnce(async (path: string) => { entries.set(path, new TFile(path)); throw new Error('Race'); });
    expect((await saveReport(vault, DEFAULT_SETTINGS, report)).path).toContain(' (2).md');
    api.create.mockRejectedValueOnce(new Error('Disk full'));
    await expect(saveReport(vault, DEFAULT_SETTINGS, report)).rejects.toThrow('Disk full');
  });
});
