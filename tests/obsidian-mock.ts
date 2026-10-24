import { vi } from 'vitest';
import { parse } from 'yaml';

// Emulate the host's public YAML parser with a real YAML implementation.
export const parseYaml = (text: string): unknown => parse(text);
export const normalizePath = (text: string): string => (text.replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/^\/+|\/+$/g, '').replace(/\u00a0/g, ' ').normalize('NFC')) || '/';
export class TFolder { constructor(public path: string) {} }
export class TFile {
  constructor(public path: string) {}
  get name(): string { return this.path.split('/').pop()!; }
}
export class Notice {
  static messages: string[] = [];
  constructor(message: string) { Notice.messages.push(message); }
}
export class Modal {
  modalEl = document.createElement('div');
  contentEl = document.createElement('div');
  constructor(public app: unknown) { this.modalEl.className = 'modal'; this.contentEl.className = 'modal-content'; this.modalEl.append(this.contentEl); }
  setTitle(title: string) { this.modalEl.setAttribute('aria-label', title); }
  open() { document.body.append(this.modalEl); this.onOpen(); }
  close() { this.onClose(); this.modalEl.remove(); }
  onOpen(): void {}
  onClose(): void {}
}
export class Plugin {
  loadData = vi.fn(async () => null);
  saveData = vi.fn(async (_value: unknown) => {});
  addCommand = vi.fn();
  addRibbonIcon = vi.fn();
  addSettingTab = vi.fn();
  constructor(public app: unknown) {}
}
export class PluginSettingTab {
  containerEl = document.createElement('div');
  constructor(public app: unknown, public plugin: unknown) {}
}
class Component {
  constructor(public el: HTMLInputElement | HTMLSelectElement | HTMLButtonElement) {}
  setPlaceholder(value: string) { (this.el as HTMLInputElement).placeholder = value; return this; }
  setValue(value: string | boolean) {
    if (typeof value === 'boolean') (this.el as HTMLInputElement).checked = value;
    else this.el.value = value;
    return this;
  }
  onChange(callback: (value: never) => void) {
    this.el.addEventListener('change', () => callback((this.el.type === 'checkbox' ? (this.el as HTMLInputElement).checked : this.el.value) as never));
    return this;
  }
  addOption(value: string, text: string) {
    const option = document.createElement('option'); option.value = value; option.text = text; this.el.append(option); return this;
  }
  setButtonText(text: string) { this.el.textContent = text; return this; }
  setCta() { return this; }
  setDisabled(disabled: boolean) { this.el.disabled = disabled; return this; }
  onClick(callback: () => void) { this.el.addEventListener('click', callback); return this; }
}
export class Setting {
  el: HTMLDivElement;
  constructor(container: HTMLElement) { this.el = document.createElement('div'); this.el.className = 'setting-item'; container.append(this.el); }
  setName(name: string) { const span = document.createElement('span'); span.textContent = name; this.el.append(span); return this; }
  setDesc(text: string) { const span = document.createElement('small'); span.textContent = text; this.el.append(span); return this; }
  add(tag: string, callback: (component: Component) => void, type?: string) {
    const el = document.createElement(tag) as HTMLInputElement;
    if (type) el.type = type;
    this.el.append(el); callback(new Component(el)); return this;
  }
  addText(callback: (c: Component) => void) { return this.add('input', callback, 'text'); }
  addDropdown(callback: (c: Component) => void) { return this.add('select', callback); }
  addToggle(callback: (c: Component) => void) { return this.add('input', callback, 'checkbox'); }
  addButton(callback: (c: Component) => void) { return this.add('button', callback, 'button'); }
}
