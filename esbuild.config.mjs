import { build, context } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const license = await readFile('LICENSE', 'utf8');
const notices = await readFile('THIRD_PARTY_NOTICES.md', 'utf8');

const options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2020',
  external: ['obsidian'],
  outfile: 'main.js',
  metafile: true,
  sourcemap: false,
  minifySyntax: true,
  minifyWhitespace: true,
  minifyIdentifiers: false,
  keepNames: true,
  legalComments: 'eof',
  banner: { js: `/* Daily Notes TXT Export ${manifest.version} | Generated from src/main.ts.\n${license.replace(/\*\//g, '* /')}*/` },
  // Obsidian downloads only main.js, manifest.json and styles.css. Keep full
  // third-party notices in the bundle as well as in the source repository.
  footer: { js: `/*\n${notices.replace(/\*\//g, '* /')}*/` },
};
if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  const result = await build(options);
  await writeFile('build-meta.json', JSON.stringify(result.metafile, null, 2));
}
