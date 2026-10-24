// Model only the documented DOM helpers used by this plugin.
const proto = HTMLElement.prototype;
Object.assign(proto, {
  empty(this: HTMLElement) { this.replaceChildren(); },
  addClass(this: HTMLElement, cls: string) { this.classList.add(cls); },
  setText(this: HTMLElement, text: string) { this.textContent = text; },
  createEl(this: HTMLElement, tag: string, options: Record<string, unknown> = {}) {
    const el = this.ownerDocument.createElement(tag);
    if (typeof options.text === 'string') el.textContent = options.text;
    if (typeof options.cls === 'string') el.className = options.cls;
    if (typeof options.type === 'string') el.setAttribute('type', options.type);
    if (options.attr && typeof options.attr === 'object') {
      for (const [name, value] of Object.entries(options.attr)) el.setAttribute(name, String(value));
    }
    this.append(el);
    return el;
  },
  createDiv(this: HTMLElement, options: Record<string, unknown>) { return this.createEl('div', options); },
  createSpan(this: HTMLElement, options: Record<string, unknown>) { return this.createEl('span', options); },
});
