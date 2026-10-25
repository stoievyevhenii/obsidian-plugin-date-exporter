import { normalizePath, TFolder, type TFile, type Vault } from 'obsidian';
import { buildReport, compileNameFormat, validateRange, type DailyNote, type Report } from './core';
import { validateSettings, type ExportSettings } from './settings';
import { parseDailyNote } from './properties';

export interface PreparedReport extends Report {
  matchedFiles: number;
  start: string;
  end: string;
}

function assertActive(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Экспорт отменён.', 'AbortError');
}

export async function prepareReport(
  vault: Vault, settings: ExportSettings, start: string, end: string,
  progress?: (read: number, total: number) => void, signal?: AbortSignal,
): Promise<PreparedReport> {
  validateRange(start, end);
  const config = validateSettings(settings);
  if (config.dailyFolder) {
    const folder = vault.getAbstractFileByPath(config.dailyFolder);
    if (!(folder instanceof TFolder)) throw new Error(`Папка ежедневных заметок не найдена: ${config.dailyFolder}`);
  }
  const parseName = compileNameFormat(config.nameFormat);
  const prefix = config.dailyFolder ? `${config.dailyFolder}/` : '';
  const candidates: { file: TFile; date: string }[] = [];
  for (const file of vault.getMarkdownFiles()) {
    if (!file.path.startsWith(prefix)) continue;
    if (file.path.split('/').some(segment => segment.startsWith('.'))) continue;
    let relative = file.path.slice(prefix.length);
    let date = parseName(relative);
    while (!date && config.includeSubfolders && relative.includes('/')) {
      relative = relative.slice(relative.indexOf('/') + 1);
      date = parseName(relative);
    }
    if (date && date >= start && date <= end) candidates.push({ file, date });
  }
  candidates.sort((a, b) => a.date.localeCompare(b.date) || a.file.path.localeCompare(b.file.path));
  const notes: DailyNote[] = [];
  progress?.(0, candidates.length);
  for (const [index, entry] of candidates.entries()) {
    assertActive(signal);
    let markdown: string;
    try {
      markdown = await vault.cachedRead(entry.file);
    } catch {
      throw new Error(`Не удалось прочитать «${entry.file.path}». Отчёт не сохранён; проверьте доступ и повторите.`);
    }
    try { notes.push(parseDailyNote(entry.date, markdown)); }
    catch (error) {
      const reason = error instanceof Error ? error.message : 'Неверные properties.';
      throw new Error(`Не удалось обработать properties в «${entry.file.path}»: ${reason} Отчёт не сохранён.`);
    }
    assertActive(signal);
    progress?.(index + 1, candidates.length);
    if (index % 10 === 9) await new Promise(resolve => window.setTimeout(resolve, 0));
  }
  assertActive(signal);
  return { ...buildReport(notes, config), start, end, matchedFiles: candidates.length };
}

async function ensureFolder(vault: Vault, folder: string): Promise<void> {
  let path = '';
  for (const segment of folder.split('/').filter(Boolean)) {
    path = normalizePath(path ? `${path}/${segment}` : segment);
    let existing = vault.getAbstractFileByPath(path);
    if (!existing) {
      try { await vault.createFolder(path); }
      catch (error) {
        // Another export / sync may have just created it.
        existing = vault.getAbstractFileByPath(path);
        if (!(existing instanceof TFolder)) throw error;
      }
    } else if (!(existing instanceof TFolder)) {
      throw new Error(`Вместо папки «${path}» существует файл.`);
    }
  }
}

/** create() never overwrites an existing file; collisions use a numeric suffix. */
export async function saveReport(vault: Vault, settings: ExportSettings, report: PreparedReport): Promise<TFile> {
  const config = validateSettings(settings);
  validateRange(report.start, report.end);
  if (!report.text) throw new Error('В выбранном периоде нет непустых пунктов. MD не создан.');
  await ensureFolder(vault, config.outputFolder);
  const prefix = config.outputFolder ? `${config.outputFolder}/` : '';
  const stem = `${prefix}Daily-report_${report.start}_${report.end}`;
  for (let suffix = 1; suffix <= 10000; suffix++) {
    const path = normalizePath(`${stem}${suffix === 1 ? '' : ` (${suffix})`}.md`);
    if (vault.getAbstractFileByPath(path)) continue;
    try { return await vault.create(path, report.text); }
    catch (error) {
      if (vault.getAbstractFileByPath(path)) continue;
      throw error;
    }
  }
  throw new Error('Слишком много файлов с таким именем. Выберите другую папку отчётов.');
}
