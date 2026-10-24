import { cleanFolder, compileNameFormat, type ExtractOptions } from './core';
import { normalizePath } from 'obsidian';

export interface ExportSettings extends ExtractOptions {
  dailyFolder: string;
  nameFormat: string;
  outputFolder: string;
  includeSubfolders: boolean;
}

export const DEFAULT_SETTINGS: ExportSettings = {
  dailyFolder: '',
  nameFormat: 'YYYY-MM-DD',
  outputFolder: 'Reports',
  includeSubfolders: true,
  listMode: 'all',
  includeCompleted: true,
};

export function validateSettings(settings: ExportSettings): ExportSettings {
  // Reject traversal and absolute paths before Obsidian's cross-platform cleanup,
  // then validate again in case normalization changed a path segment.
  const folder = (value: string): string => cleanFolder(normalizePath(cleanFolder(value)));
  const normalized = {
    ...settings,
    dailyFolder: folder(settings.dailyFolder),
    outputFolder: folder(settings.outputFolder),
    nameFormat: settings.nameFormat.trim(),
  };
  compileNameFormat(normalized.nameFormat);
  if (!['all', 'checkboxes'].includes(normalized.listMode) || typeof normalized.includeCompleted !== 'boolean' || typeof normalized.includeSubfolders !== 'boolean') {
    throw new Error('Неверный режим списка.');
  }
  return normalized;
}

export function loadSettings(data: unknown): ExportSettings {
  const result = { ...DEFAULT_SETTINGS };
  if (!data || typeof data !== 'object') return result;
  const saved = data as Record<string, unknown>;
  for (const key of ['dailyFolder', 'nameFormat', 'outputFolder'] as const) {
    if (typeof saved[key] === 'string') result[key] = saved[key];
  }
  if (saved.listMode === 'all' || saved.listMode === 'checkboxes') result.listMode = saved.listMode;
  if (typeof saved.includeCompleted === 'boolean') result.includeCompleted = saved.includeCompleted;
  if (typeof saved.includeSubfolders === 'boolean') result.includeSubfolders = saved.includeSubfolders;
  // Keep invalid strings visible for correction; validate at use / explicit save.
  return result;
}
