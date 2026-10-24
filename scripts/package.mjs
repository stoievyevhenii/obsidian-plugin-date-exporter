// Packaging only: these Node APIs are never included in main.js.
import { readFile, readdir, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve, join, relative, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const arg = process.argv.indexOf('--out');
const out = resolve(arg < 0 ? join(root, 'release') : process.argv[arg + 1] ?? 'release');
const sourceRelativeToOutput = relative(out, root);
assert.ok(sourceRelativeToOutput !== '' && (sourceRelativeToOutput.startsWith('..') || isAbsolute(sourceRelativeToOutput)), 'Output must not be the project directory or one of its ancestors');
const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
const id = manifest.id;
const version = manifest.version;
const runtimeNames = ['main.js', 'manifest.json', 'styles.css', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'VALIDATION.md'];
await mkdir(out, { recursive: true });

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Standard ZIP/deflate, UTF-8 names, deterministic timestamp; no external tools.
function zip(files) {
  const local = [], central = [];
  let offset = 0;
  for (const entry of files) {
    const name = Buffer.from(entry.name.replace(/\\/g, '/'), 'utf8');
    const data = entry.data;
    const compressed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(8, 8); header.writeUInt16LE(0x5d58, 12); // 2026-10-24
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(8, 10); dir.writeUInt16LE(0x5d58, 14); dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(compressed.length, 20); dir.writeUInt32LE(data.length, 24); dir.writeUInt16LE(name.length, 28); dir.writeUInt32LE(offset, 42);
    central.push(dir, name); offset += header.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

const runtime = [];
for (const name of runtimeNames) {
  const data = await readFile(join(root, name));
  const target = join(out, id, name); await mkdir(dirname(target), { recursive: true });
  await copyFile(join(root, name), target);
  runtime.push({ name: `${id}/${name}`, data });
}
const source = [];
// This is a source publication allowlist, not a recursive snapshot of a vault.
const sourceDirectories = new Set(['src', 'tests', 'scripts', 'examples', 'docs', '.github']);
const sourceRootFiles = new Set(['package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts', 'eslint.config.mjs', 'esbuild.config.mjs', 'manifest.json', 'versions.json', 'styles.css', 'README.md', 'README.ru.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'VALIDATION.md', 'SECURITY.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'PUBLICATION.md', '.gitignore', '.gitattributes']);
const allowedExtension = /\.(?:ts|mjs|json|md|ya?ml|css|txt)$/;
const excluded = new Set(['node_modules', '.git', '.obsidian', 'coverage', 'release', 'build-meta.json', 'data.json']);
async function walk(folder) {
  for (const item of (await readdir(folder, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(folder, item.name);
    if (excluded.has(item.name) || item.name.startsWith('.env') || path === out) continue;
    if (folder === root && !sourceRootFiles.has(item.name) && !sourceDirectories.has(item.name)) continue;
    if (item.isDirectory()) await walk(path);
    else if (item.isFile() && (sourceRootFiles.has(item.name) || allowedExtension.test(item.name))) source.push({ name: `${id}/${relative(root, path).replace(/\\/g, '/')}`, data: await readFile(path) });
  }
}
await walk(root);
const archives = [
  { name: `${id}-${version}.zip`, data: zip(runtime) },
  { name: `${id}-${version}-source.zip`, data: zip(source) },
];
for (const archive of archives) await writeFile(join(out, archive.name), archive.data);
const checksums = [...runtime.map(entry => ({ name: entry.name, data: entry.data })), ...archives]
  .map(entry => `${createHash('sha256').update(entry.data).digest('hex')}  ${entry.name}`).join('\n') + '\n';
await writeFile(join(out, 'SHA256SUMS.txt'), checksums);
console.log(`Packaged ${runtime.length} installation files; ${source.length} source files in ${out}`);
