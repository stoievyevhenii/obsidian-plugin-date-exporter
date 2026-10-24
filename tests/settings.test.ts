import { describe, expect, it } from 'vitest';
import { normalizePath } from 'obsidian';
import { DEFAULT_SETTINGS, validateSettings } from '../src/settings';

describe('vault root folder normalization', () => {
  it.each([
    ['Daily//Notes/', 'Daily/Notes'],
    ['Daily' + String.fromCharCode(92) + 'Notes', 'Daily/Notes'],
    ['Daily' + String.fromCharCode(160) + 'Notes', 'Daily Notes'],
  ])('models host path cleanup for %s', (input, expected) => {
    expect(normalizePath(input)).toBe(expected);
  });
  it('models the host root sentinel and accepts the default source folder', () => {
    expect(normalizePath('')).toBe('/');
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });
  it.each([
    { dailyFolder: '', outputFolder: 'Reports' },
    { dailyFolder: 'Daily Notes', outputFolder: '' },
    { dailyFolder: '', outputFolder: '' },
    { dailyFolder: '   ', outputFolder: '  ' },
  ])('preserves root folders without passing them through normalizePath: %j', folders => {
    const settings = validateSettings({ ...DEFAULT_SETTINGS, ...folders });
    expect(settings.dailyFolder).toBe(folders.dailyFolder.trim());
    expect(settings.outputFolder).toBe(folders.outputFolder.trim());
  });
  it('identifies the incorrect field while retaining absolute-path rejection', () => {
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, dailyFolder: '/Daily Notes' })).toThrow('Папка Daily Notes:');
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, outputFolder: 'C:/Reports' })).toThrow('Папка отчётов:');
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, outputFolder: '../Reports' })).toThrow('Папка отчётов:');
  });
});
