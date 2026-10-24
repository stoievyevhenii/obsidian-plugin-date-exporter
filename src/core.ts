import { Marked, type Token, type Tokens } from 'marked';
import { decodeHTML } from 'entities';

export type ListMode = 'all' | 'checkboxes';
export interface ExtractOptions {
  listMode: ListMode;
  includeCompleted: boolean;
}
export interface DailyNote { date: string; markdown: string; company?: unknown; ship?: unknown }
export interface Report { text: string; days: number; items: number }
export const DEFAULT_START = '2026-10-01';
export const DEFAULT_END = '2026-10-23';

/** Strict civil dates: no locale, timezone, or Date.parse rollover. */
export function validateDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Введите дату в формате ГГГГ-ММ-ДД.');
  }
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > (monthDays[month - 1] ?? 0)) {
    throw new Error(`Несуществующая дата: ${value}.`);
  }
  return value;
}

export function validateRange(start: string, end: string): void {
  validateDate(start);
  validateDate(end);
  if (start > end) throw new Error('Начало периода должно быть не позже конца.');
}

/** Paths are relative to the vault. Reject traversal before any normalization. */
export function cleanFolder(value: string): string {
  const path = value.trim().replace(/\\/g, '/').normalize('NFC');
  if (path === '') return '';
  if (path.startsWith('/') || /^[a-z]:/i.test(path)) {
    throw new Error('Укажите относительную папку внутри vault.');
  }
  const parts = path.replace(/\/+$/, '').split('/');
  if (parts.some(p => !p || p === '.' || p === '..' || p.startsWith('.') || /[<>:"|?*]/.test(p) || [...p].some(char => char.charCodeAt(0) < 32) || /[. ]$/.test(p))) {
    throw new Error('Недопустимая папка: скрытые папки, .. и специальные символы запрещены.');
  }
  return parts.join('/');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Deliberately explicit, locale-independent subset: YYYY, MM, DD and [literal]. */
export function compileNameFormat(input: string): (relativePath: string) => string | null {
  const format = input.trim().replace(/\.md$/i, '');
  const captures: string[] = [];
  let pattern = '';
  let sample = '';
  for (let index = 0; index < format.length;) {
    if (format[index] === '[') {
      const end = format.indexOf(']', index + 1);
      if (end < 0) throw new Error('Незакрытая [скобка] в формате имени.');
      const literal = format.slice(index + 1, end);
      pattern += escapeRegExp(literal);
      sample += literal;
      index = end + 1;
      continue;
    }
    const token = ['YYYY', 'MM', 'DD'].find(t => format.startsWith(t, index));
    if (token) {
      captures.push(token);
      pattern += token === 'YYYY' ? '(\\d{4})' : '(\\d{2})';
      sample += token === 'YYYY' ? '2026' : token === 'MM' ? '10' : '23';
      index += token.length;
      continue;
    }
    const char = format[index] ?? '';
    if (/[A-Za-z]/.test(char) || char === '[' || char === ']') throw new Error('Допустимы YYYY, MM, DD; буквальный текст заключайте в [скобки].');
    pattern += escapeRegExp(char);
    sample += char;
    index++;
  }
  if (!['YYYY', 'MM', 'DD'].every(t => captures.includes(t))) {
    throw new Error('Формат имени должен содержать YYYY, MM и DD. Пример: YYYY-MM-DD.');
  }
  cleanFolder(sample);
  const regex = new RegExp(`^${pattern}\\.md$`, 'i');
  return relativePath => {
    const match = regex.exec(relativePath.normalize('NFC'));
    if (!match) return null;
    const fields: Record<string, string> = {};
    for (let i = 0; i < captures.length; i++) {
      const token = captures[i]!;
      const value = match[i + 1]!;
      if (fields[token] !== undefined && fields[token] !== value) return null;
      fields[token] = value;
    }
    const date = `${fields.YYYY}-${fields.MM}-${fields.DD}`;
    try { return validateDate(date); } catch { return null; }
  };
}

function inlineText(tokens: Token[], lineBreak = ' '): string {
  return tokens.map(token => {
    if (token.type === 'html') return '';
    if (token.type === 'br') return lineBreak;
    if ('tokens' in token && Array.isArray(token.tokens)) return inlineText(token.tokens, lineBreak);
    if ('text' in token && typeof token.text === 'string') return token.text;
    return '';
  }).join('');
}

function plainText(text: string): string {
  return decodeHTML(text)
    .replace(/!?\[\[([^\]\n]+)\]\]/g, (_match, target: string) => target.split('|').pop() ?? target)
    .replace(/[\u200b\ufeff]/g, '')
    .replace(/\s+/g, ' ').trim();
}

// Lexer extensions keep comments out of reports without altering code blocks or
// code spans that happen to contain comment delimiters.
const markdownLexer = new Marked({
  gfm: true,
  extensions: [
    {
      name: 'obsidianCommentBlock', level: 'block',
      start: source => source.indexOf('%%'),
      tokenizer(source) {
        const match = /^ {0,3}%%[\s\S]*?(?:%%|$)[ \t]*(?:\n|$)/.exec(source);
        if (match) return { type: 'obsidianCommentBlock', raw: match[0] };
      },
    },
    {
      name: 'obsidianCommentInline', level: 'inline',
      start: source => source.indexOf('%%'),
      tokenizer(source) {
        const match = /^%%[\s\S]*?(?:%%|$)/.exec(source);
        if (match) return { type: 'obsidianCommentInline', raw: match[0] };
      },
    },
  ],
});

/** A list item's own paragraphs only; nested lists are emitted separately. */
function isTextBlock(token: Token): token is Tokens.Text | Tokens.Paragraph | Tokens.Heading {
  return token.type === 'text' || token.type === 'paragraph' || token.type === 'heading';
}

function isList(token: Token): token is Tokens.List { return token.type === 'list'; }
function isBlockquote(token: Token): token is Tokens.Blockquote { return token.type === 'blockquote'; }
function isParagraph(token: Token): token is Tokens.Paragraph { return token.type === 'paragraph'; }

function ownText(item: Tokens.ListItem): string {
  return plainText(item.tokens.flatMap(token => {
    if (isTextBlock(token)) {
      return [token.tokens ? inlineText(token.tokens) : token.text];
    }
    return [];
  }).join(' '));
}

export function extractItems(markdown: string, options: ExtractOptions): string[] {
  const source = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
    .replace(/^---[ \t]*\n[\s\S]*?\n(?:---|\.\.\.)[ \t]*(?:\n|$)/, '');
  const result: string[] = [];
  function walk(tokens: Token[], includePlainText = true): void {
    for (const token of tokens) {
      if (isList(token)) {
        for (const item of token.items) {
          let text = ownText(item);
          // GFM handles [ ] / [x]; Obsidian also allows custom single-character statuses.
          const custom = !item.task ? /^\[([^\]])\](?:\s+|$)/.exec(item.text.trimStart()) : null;
          const checkbox = Boolean(item.task || custom);
          const complete = item.checked === true || Boolean(custom && /^[xX]$/.test(custom[1]!));
          if (custom) text = text.replace(/^\[[^\]]\](?:\s+|$)/, '').trim();
          if (text && (options.listMode === 'all' || checkbox) && (options.includeCompleted || !complete)) {
            result.push(text);
          }
          walk(item.tokens, false);
        }
      } else if (isBlockquote(token)) {
        // Keep existing list support in quotes without exporting callout titles.
        walk(token.tokens, false);
      } else if (includePlainText && options.listMode === 'all' && isParagraph(token)) {
        // List item continuations are handled by ownText(), so only standalone
        // body paragraphs reach this branch. Preserve one item per source line.
        for (const line of inlineText(token.tokens, '\n').split(/\r?\n/)) {
          const text = plainText(line);
          if (text) result.push(text);
        }
      }
    }
  }
  walk(markdownLexer.lexer(source));
  return result;
}

/** Properties may be text, a link, or an Obsidian list of text values. */
export function propertyLabel(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  const values = Array.isArray(value) ? value : [value];
  const labels = values.flatMap(entry => {
    if (entry === null || entry === undefined) return [];
    if (typeof entry !== 'string' && typeof entry !== 'number' && typeof entry !== 'boolean') {
      throw new Error('Company и Ship должны быть текстом или списком простых значений.');
    }
    let label = String(entry).normalize('NFC').replace(/[\u200b\ufeff]/g, '').replace(/\s+/g, ' ').trim();
    const link = /^\[\[([^\]]+)\]\]$/.exec(label);
    if (link) label = (link[1]!.split('|').pop() ?? '').trim();
    return label ? [label] : [];
  });
  return [...new Set(labels)].join(', ') || fallback;
}

export function buildReport(notes: DailyNote[], options: ExtractOptions): Report {
  const grouped = new Map<string, Map<string, Map<string, string[]>>>();
  for (const note of notes) {
    validateDate(note.date);
    const items = extractItems(note.markdown, options);
    if (!items.length) continue;
    const company = propertyLabel(note.company, 'Без компании');
    const ship = propertyLabel(note.ship, 'Без судна');
    let companies = grouped.get(note.date);
    if (!companies) { companies = new Map(); grouped.set(note.date, companies); }
    let ships = companies.get(company);
    if (!ships) { ships = new Map(); companies.set(company, ships); }
    ships.set(ship, [...(ships.get(ship) ?? []), ...items]);
  }
  let count = 0;
  const compare = ([a]: [string, unknown], [b]: [string, unknown]): number => a.localeCompare(b, 'ru', { numeric: true });
  const blocks = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, companies]) => {
    const lines = [date];
    for (const [company, ships] of [...companies.entries()].sort(compare)) {
      lines.push(`[${company}]`);
      for (const [ship, items] of [...ships.entries()].sort(compare)) {
        count += items.length;
        lines.push(`  ${ship}:`, ...items.map((item, i) => `    ${i + 1}) ${item}`));
      }
    }
    return lines.join('\n');
  });
  return { text: blocks.length ? `${blocks.join('\n\n')}\n` : '', days: blocks.length, items: count };
}
