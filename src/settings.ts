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
  const folder = (value: string, label: string): string => {
    try {
      const relative = cleanFolder(value);
      // Obsidian represents normalizePath('') as '/'. Keep the plugin's empty
      // root sentinel before normalizing actual relative subfolder paths.
      return relative === '' ? '' : cleanFolder(normalizePath(relative));
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Недопустимый путь.';
      throw new Error(label + ': ' + reason);
    }
  };
  const normalized = {
    ...settings,
    dailyFolder: folder(settings.dailyFolder, 'Папка Daily Notes'),
    outputFolder: folder(settings.outputFolder, 'Папка отчётов'),
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
