import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, type TFile } from 'obsidian';
import { DEFAULT_END, DEFAULT_START, validateRange } from './core';
import { prepareReport, saveReport, type PreparedReport } from './exporter';
import { copyReport, selectReport, shareReport } from './sharing';
import { DEFAULT_SETTINGS, loadSettings, validateSettings, type ExportSettings } from './settings';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Неизвестная ошибка. Повторите операцию.';
}

/** DOM-only fields work in Obsidian desktop and its Android WebView. */
function settingsFields(container: HTMLElement, draft: ExportSettings): void {
  new Setting(container).setName('Папка Daily Notes')
    .setDesc('Путь внутри vault, например Daily Notes. Пустое поле — корень. Настройка задаётся здесь независимо от основного плагина Daily Notes.')
    .addText(text => text.setPlaceholder('Daily Notes').setValue(draft.dailyFolder).onChange(value => { draft.dailyFolder = value; }));
  new Setting(container).setName('Включать вложенные папки')
    .setDesc('Позволяет читать заметки с одинаковой датой в папках разных компаний и судов. Группировка берётся из properties Company и Ship.')
    .addToggle(toggle => toggle.setValue(draft.includeSubfolders).onChange(value => { draft.includeSubfolders = value; }));
  new Setting(container).setName('Формат имени')
    .setDesc('YYYY-MM-DD или DD.MM.YYYY. Расширение .md необязательно. Подпапки: YYYY/MM/YYYY-MM-DD. Текст: [Дневник-]YYYY-MM-DD.')
    .addText(text => text.setValue(draft.nameFormat).onChange(value => { draft.nameFormat = value; }));
  new Setting(container).setName('Папка отчётов')
    .setDesc('Будет создана при сохранении. Пустое поле — корень vault.')
    .addText(text => text.setValue(draft.outputFolder).onChange(value => { draft.outputFolder = value; }));
  new Setting(container).setName('Какие пункты включать')
    .addDropdown(dropdown => dropdown.addOption('all', 'Все пункты списков').addOption('checkboxes', 'Только чекбоксы')
      .setValue(draft.listMode).onChange(value => { draft.listMode = value === 'checkboxes' ? 'checkboxes' : 'all'; }));
  new Setting(container).setName('Включать выполненные задачи')
    .setDesc('Если выключено, завершённые чекбоксы исключаются. Остальные статусы включаются.')
    .addToggle(toggle => toggle.setValue(draft.includeCompleted).onChange(value => { draft.includeCompleted = value; }));
}

export default class DailyNotesTxtExport extends Plugin {
  exportSettings: ExportSettings = { ...DEFAULT_SETTINGS };
  private modals = new Set<Modal>();

  override async onload(): Promise<void> {
    try { this.exportSettings = loadSettings(await this.loadData()); }
    catch { new Notice('Daily Notes TXT Export: настройки не удалось прочитать; используются значения по умолчанию.'); }
    this.addCommand({ id: 'export-date-range', name: 'Экспорт заметок за период в TXT', callback: () => this.openExporter() });
    this.addRibbonIcon('file-output', 'Экспорт Daily Notes в TXT', () => this.openExporter());
    this.addSettingTab(new ExportSettingTab(this.app, this));
  }

  private openExporter(): void { this.track(new ExportModal(this.app, this)); }

  track(modal: Modal): void {
    this.modals.add(modal);
    modal.open();
  }

  release(modal: Modal): void { this.modals.delete(modal); }

  override onunload(): void {
    for (const modal of [...this.modals]) modal.close();
    this.modals.clear();
  }

  async storeSettings(draft: ExportSettings): Promise<void> {
    const settings = validateSettings(draft);
    await this.saveData(settings);
    this.exportSettings = settings;
  }
}

class ExportSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: DailyNotesTxtExport) { super(app, plugin); }

  override display(): void {
    this.containerEl.empty();
    this.containerEl.addClass('dn-txt-settings');
    const draft = { ...this.plugin.exportSettings };
    settingsFields(this.containerEl, draft);
    new Setting(this.containerEl).addButton(button => button.setButtonText('Сохранить настройки').setCta().onClick(async () => {
      button.setDisabled(true);
      try { await this.plugin.storeSettings(draft); new Notice('Настройки сохранены.'); }
      catch (error) { new Notice(errorMessage(error), 8000); }
      finally { button.setDisabled(false); }
    }));
  }
}

export class ExportModal extends Modal {
  private readonly abort = new AbortController();
  private busy = false;
  constructor(app: App, private readonly plugin: DailyNotesTxtExport) { super(app); }

  override onOpen(): void {
    this.modalEl.addClass('dn-txt-modal');
    this.setTitle('Экспорт Daily Notes');
    const draft = { ...this.plugin.exportSettings };
    this.contentEl.createEl('p', { text: 'Один TXT: дата → Company → Ship. Пустые дни пропускаются, нумерация начинается заново для каждого судна.', cls: 'dn-txt-hint' });
    const form = this.contentEl.createEl('form', { cls: 'dn-txt-form' });
    const dates = form.createDiv({ cls: 'dn-txt-dates' });
    const dateField = (label: string, value: string): HTMLInputElement => {
      const el = dates.createEl('label', { cls: 'dn-txt-date-field' });
      el.createSpan({ text: label });
      const input = el.createEl('input', { type: 'date' });
      input.value = value;
      input.required = true;
      input.min = '0001-01-01';
      input.max = '9999-12-31';
      return input;
    };
    const start = dateField('С даты включительно', DEFAULT_START);
    const end = dateField('По дату включительно', DEFAULT_END);
    const details = form.createEl('details', { cls: 'dn-txt-details' });
    details.createEl('summary', { text: 'Папки, формат имени и задачи' });
    settingsFields(details, draft);
    details.createEl('p', { text: 'Изменения здесь действуют для этого экспорта. Постоянные значения задаются в настройках плагина.', cls: 'dn-txt-hint' });
    // Obsidian Setting buttons are not submit controls inside this form.
    details.querySelectorAll('button').forEach(button => { button.type = 'button'; });
    const status = form.createDiv({ cls: 'dn-txt-status', attr: { role: 'status', 'aria-live': 'polite' } });
    const submit = form.createEl('button', { text: 'Сформировать отчёт', type: 'submit', cls: 'mod-cta dn-txt-primary' });
    const validate = (): boolean => {
      try { validateRange(start.value, end.value); status.setText(''); submit.disabled = this.busy; return true; }
      catch (error) { status.setText(errorMessage(error)); submit.disabled = true; return false; }
    };
    start.addEventListener('input', validate);
    end.addEventListener('input', validate);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (this.busy || !validate()) return;
      this.busy = true;
      const config = { ...draft };
      const startDate = start.value;
      const endDate = end.value;
      submit.disabled = true;
      // Lock inputs while reading so the displayed result always matches the form.
      const controls = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input, select, button');
      controls.forEach(control => { control.disabled = true; });
      void prepareReport(this.app.vault, config, startDate, endDate, (read, total) => {
        status.setText(`Чтение заметок: ${read} из ${total}…`);
      }, this.abort.signal).then(report => {
        if (this.abort.signal.aborted) return;
        if (!report.text) {
          status.setText(`Непустые пункты не найдены. Подходящих заметок: ${report.matchedFiles}. Проверьте папку, формат имени и фильтры. TXT не создан.`);
          return;
        }
        this.plugin.track(new ResultModal(this.app, this.plugin, config, report));
        this.close();
      }).catch(error => {
        if (!this.abort.signal.aborted) status.setText(errorMessage(error));
      }).finally(() => {
        this.busy = false;
        controls.forEach(control => { control.disabled = false; });
      });
    });
  }

  override onClose(): void {
    this.abort.abort();
    this.plugin.release(this);
    this.contentEl.empty();
  }
}

export class ResultModal extends Modal {
  private file: TFile | null = null;
  private saving = false;
  constructor(app: App, private readonly plugin: DailyNotesTxtExport, private readonly settings: ExportSettings, private readonly report: PreparedReport) { super(app); }

  override onOpen(): void {
    this.modalEl.addClass('dn-txt-modal');
    this.setTitle('Отчёт готов');
    this.contentEl.createEl('p', { text: `Дней: ${this.report.days} · пунктов: ${this.report.items} · прочитано заметок: ${this.report.matchedFiles}`, cls: 'dn-txt-hint' });
    const label = this.contentEl.createEl('label', { cls: 'dn-txt-preview-label', text: 'Предпросмотр TXT' });
    const area = label.createEl('textarea', { cls: 'dn-txt-preview' });
    area.readOnly = true;
    area.spellcheck = false;
    area.value = this.report.text;
    area.setAttribute('aria-label', 'Текст отчёта для копирования');
    const status = this.contentEl.createDiv({ cls: 'dn-txt-status', attr: { role: 'status', 'aria-live': 'polite' } });
    status.setText('Сохранение TXT…');
    const actions = this.contentEl.createDiv({ cls: 'dn-txt-actions' });
    const save = actions.createEl('button', { text: 'Сохранение…', cls: 'mod-cta', type: 'button' });
    const persist = async (): Promise<void> => {
      if (this.saving || this.file) return;
      this.saving = true;
      save.disabled = true;
      try {
        this.file = await saveReport(this.app.vault, this.settings, this.report);
        status.setText(`Сохранено: ${this.file.path}`);
        save.setText('Сохранено в vault');
        // Also report completion if the user closed the modal during the write.
        new Notice(`TXT сохранён: ${this.file.path}`, 7000);
      } catch (error) {
        status.setText(`Не удалось сохранить TXT: ${errorMessage(error)} Текст можно скопировать или повторить сохранение.`);
        save.setText('Повторить сохранение');
      } finally { this.saving = false; save.disabled = this.file !== null; }
    };
    save.addEventListener('click', () => { void persist(); });
    const copy = actions.createEl('button', { text: 'Копировать', type: 'button' });
    copy.addEventListener('click', () => {
      void copyReport(this.report.text, area).then(result => {
        new Notice(result === 'copied' ? 'Отчёт скопирован.' : 'Текст выделен. Нажмите и удерживайте текст → «Копировать» или «Поделиться».', 7000);
      });
    });
    const share = actions.createEl('button', { text: 'Поделиться', type: 'button' });
    share.addEventListener('click', () => {
      const filename = this.file?.name ?? `Daily-report_${this.report.start}_${this.report.end}.txt`;
      void shareReport(this.report.text, filename, area).then(result => {
        if (result === 'unavailable') {
          selectReport(area);
          new Notice('Системный обмен недоступен. Используйте «Копировать» или удерживайте выделенный текст → «Поделиться». Сохранённый TXT также можно отправить из файлового менеджера Android.', 10000);
        }
      });
    });
    const select = actions.createEl('button', { text: 'Выделить всё', type: 'button' });
    select.addEventListener('click', () => selectReport(area));
    this.contentEl.createEl('p', { text: 'На Android доступность системного меню обмена зависит от WebView. Можно скопировать текст и вставить его в нужное приложение.', cls: 'dn-txt-hint' });
    void persist();
  }

  override onClose(): void { this.plugin.release(this); this.contentEl.empty(); }
}
