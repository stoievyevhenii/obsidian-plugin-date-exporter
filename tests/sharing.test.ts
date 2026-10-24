import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyReport, selectReport, shareReport } from '../src/sharing';

let area: HTMLTextAreaElement;
beforeEach(() => { area = document.createElement('textarea'); area.value = '01-10-2026\n1) Тест\n'; document.body.append(area); });
afterEach(() => { vi.restoreAllMocks(); area.remove(); });
function navProperty(name: string, value: unknown) { Object.defineProperty(navigator, name, { configurable: true, value }); }

describe('clipboard and sharing fallback', () => {
  it('copies Unicode through clipboard', async () => {
    const writeText = vi.fn(async () => {}); navProperty('clipboard', { writeText });
    expect(await copyReport(area.value, area)).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(area.value);
  });
  it('tries selection based copy after clipboard rejection', async () => {
    navProperty('clipboard', { writeText: vi.fn(async () => { throw new Error('Denied'); }) });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => true) });
    expect(await copyReport(area.value, area)).toBe('copied');
    expect(area.selectionEnd).toBe(area.value.length);
  });
  it('leaves the report selected when all automatic copy methods fail', async () => {
    navProperty('clipboard', undefined);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
    expect(await copyReport(area.value, area)).toBe('selected');
    expect(area.selectionStart).toBe(0);
    expect(area.selectionEnd).toBe(area.value.length);
  });
  it('selects the visible textarea for Android native actions', () => {
    selectReport(area); expect(document.activeElement).toBe(area); expect(area.selectionEnd).toBe(area.value.length);
  });
  it('shares a TXT file when the platform supports it', async () => {
    const share = vi.fn(async (_data: ShareData) => {}); navProperty('share', share); navProperty('canShare', () => true);
    expect(await shareReport(area.value, 'report.txt', area)).toBe('shared');
    const data = share.mock.calls[0]![0];
    expect(data.files?.[0]?.name).toBe('report.txt');
    expect(data.text).toBeUndefined();
  });
  it('shares text when file sharing is unsupported', async () => {
    const share = vi.fn(async (_data: ShareData) => {}); navProperty('share', share); navProperty('canShare', () => false);
    expect(await shareReport(area.value, 'report.txt', area)).toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'report.txt', text: area.value });
  });
  it('quietly handles user cancellation', async () => {
    navProperty('share', async () => { throw new DOMException('Cancelled', 'AbortError'); });
    expect(await shareReport(area.value, 'report.txt', area)).toBe('cancelled');
  });
  it('reports unavailable and denied sharing without dropping report text', async () => {
    navProperty('share', undefined);
    expect(await shareReport(area.value, 'report.txt', area)).toBe('unavailable');
    navProperty('share', async () => { throw new Error('Denied'); });
    expect(await shareReport(area.value, 'report.txt', area)).toBe('unavailable');
    expect(area.value).toContain('Тест');
  });
});
