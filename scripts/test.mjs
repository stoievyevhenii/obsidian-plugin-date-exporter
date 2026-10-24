import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
// Resolve declared dependencies locally instead of Vitest's optional package
// auto-installer, which can inspect malformed unrelated ancestor package.jsons.
require.resolve('jsdom');
const cli = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
const child = spawn(process.execPath, [cli, 'run', ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, VITEST_SKIP_INSTALL_CHECKS: '1' },
});
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
