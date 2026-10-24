import { parseYaml } from 'obsidian';
import { propertyLabel, type DailyNote } from './core';

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
    throw new Error('Properties должны быть YAML-объектом с полями Company и Ship.');
  }
  const properties = (data ?? {}) as Record<string, unknown>;
  return {
    date,
    markdown: tail.slice(closing.index + closing[0].length).replace(/^\n/, ''),
    company: propertyLabel(properties.Company, 'Без компании'),
    ship: propertyLabel(properties.Ship, 'Без судна'),
  };
}
