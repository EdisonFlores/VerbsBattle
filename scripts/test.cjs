const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
// Expand paths here: Windows shells and older Node versions do not expand globs.
const tests = fs.readdirSync(path.join(root, 'tests')).filter(name => name.endsWith('.test.cjs'))
  .sort().map(name => path.join(root, 'tests', name));
if (!tests.length) throw new Error('No se encontraron pruebas');
const result = spawnSync(process.execPath, ['--test', ...tests], { stdio: 'inherit', cwd: root });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
