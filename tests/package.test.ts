import {execFile} from 'node:child_process';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,resolve} from 'node:path';
import {promisify} from 'node:util';
import {expect,it} from 'vitest';

const run = promisify(execFile);

function zipNames(data: Buffer): string[] {
  const end = data.length - 22;
  expect(data.readUInt32LE(end)).toBe(0x06054b50);
  let offset = data.readUInt32LE(end + 16);
  const count = data.readUInt16LE(end + 10);
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    expect(data.readUInt32LE(offset)).toBe(0x02014b50);
    const length = data.readUInt16LE(offset + 28);
    names.push(data.subarray(offset + 46, offset + 46 + length).toString('utf8'));
    offset += 46 + length + data.readUInt16LE(offset + 30) + data.readUInt16LE(offset + 32);
  }
  return names;
}

it('packages only allowlisted source and excludes local settings, environment files and built runtime', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'daily-export-package-test-'));
  try {
    await mkdir(join(fixture, 'scripts'));
    await mkdir(join(fixture, 'src'));
    await writeFile(join(fixture, 'scripts', 'package.mjs'), await readFile('scripts/package.mjs'));
    await writeFile(join(fixture, 'manifest.json'), JSON.stringify({ id: 'daily-notes-txt-export', version: '1.1.2' }));
    for (const name of ['main.js', 'styles.css', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'VALIDATION.md']) await writeFile(join(fixture, name), 'dummy test fixture');
    await writeFile(join(fixture, 'src', 'main.ts'), 'export const fixture = true;');
    for (const name of ['.env', '.env.local', 'data.json', 'debug.log', 'private-note.md']) await writeFile(join(fixture, name), 'not real sensitive data');
    await writeFile(join(fixture, 'src', '.env'), 'not real sensitive data');
    await writeFile(join(fixture, 'src', 'data.json'), '{}');
    const release = join(fixture, 'release');
    await run(process.execPath, [join(fixture, 'scripts', 'package.mjs'), '--out', release]);
    const names = zipNames(await readFile(join(release, 'daily-notes-txt-export-1.1.2-source.zip')));
    expect(names).toContain('daily-notes-txt-export/src/main.ts');
    expect(names).not.toContain('daily-notes-txt-export/main.js');
    expect(names.some(name => /(?:\.env|data\.json|private-note|debug\.log)/.test(name))).toBe(false);
    await expect(run(process.execPath, [join(fixture, 'scripts', 'package.mjs'), '--out', fixture])).rejects.toThrow();
  } finally {
    const path = resolve(fixture);
    const withinTemp = relative(resolve(tmpdir()), path);
    if (!withinTemp.startsWith('..') && withinTemp !== '') await rm(path, { recursive: true, force: true });
  }
}, 15000);
