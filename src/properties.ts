import { parseYaml } from 'obsidian';
import type { DailyNote } from './core';

function propertyValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((entry: unknown) => propertyValue(entry)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).replace(/\s+/g, ' ').trim();
  }
  throw new Error('Неподдерживаемый тип значения properties.');
}

/** Read properties from the same content snapshot as the tasks, without cache lag. */
export function parseDailyNote(date: string, markdown: string): DailyNote {
  const source = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const opening = /^---[ \t]*\n/.exec(source);
  if (!opening) return { date, markdown: source };
  const tail = source.slice(opening[0].length);
  const closing = /^(?:---|\.\.\.)[ \t]*$/m.exec(tail);
  if (!closing) throw new Error('Блок properties начинается с --- и должен заканчиваться строкой ---.');
  const data: unknown = parseYaml(tail.slice(0, closing.index));
  if (data !== null && data !== undefined && (typeof data !== 'object' || Array.isArray(data))) {
    throw new Error('Properties должны быть YAML-объектом с именованными полями.');
  }
  const properties = (data ?? {}) as Record<string, unknown>;
  return {
    date,
    markdown: tail.slice(closing.index + closing[0].length).replace(/^\n/, ''),
    properties: Object.entries(properties).map(([name, value]) => ({
      name: name.replace(/\s+/g, ' ').trim(),
      value: propertyValue(value),
    })),
  };
}
