import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { builtinModules } from 'node:module';

const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(manifest.isDesktopOnly, false);
assert.equal(manifest.version, pkg.version);
const meta = JSON.parse(await readFile('build-meta.json', 'utf8'));
const code = await readFile('main.js', 'utf8');
for (const [name, output] of Object.entries(meta.outputs)) {
  assert.ok(name.endsWith('main.js'));
  assert.deepEqual([...new Set(output.imports.map(i => i.path))], ['obsidian']);
}
for (const name of Object.keys(meta.inputs)) {
  assert.ok(!builtinModules.includes(name) && !name.startsWith('node:'), `Node module: ${name}`);
}
assert.doesNotMatch(code, /\b(?:process|Buffer|__dirname|__filename)\b/);
const requires = [...code.matchAll(/\brequire\(["']([^"']+)["']\)/g)].map(match => match[1]);
assert.ok(requires.length >= 1 && requires.every(name => name === 'obsidian'));

// Load the final CommonJS bundle with only the public host module available.
// No Node globals or browser DOM are needed just to import / register a command.
const commands = [];
class Plugin {
  async loadData() { return null; }
  addCommand(command) { commands.push(command); }
  addRibbonIcon() {}
  addSettingTab() {}
}
class PluginSettingTab {}
class Modal {}
const module = { exports: {} };
const host = { Plugin, PluginSettingTab, Modal };
new Script(code, { filename: 'main.js' }).runInNewContext({
  module, exports: module.exports,
  require(name) { assert.equal(name, 'obsidian'); return host; },
});
const instance = new module.exports.default();
await instance.onload();
assert.equal(commands[0].id, 'export-date-range');
instance.onunload();
console.log(`Bundle OK: ${Buffer.byteLength(code)} bytes; external module: obsidian only; isDesktopOnly=false; final bundle onload smoke passed.`);
