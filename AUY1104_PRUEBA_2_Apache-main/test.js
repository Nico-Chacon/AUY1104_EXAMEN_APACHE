#!/usr/bin/env node
/**
 * Ejecuta la suite Jest sin depender de npx en PATH.
 * Uso:
 *   node test.js --coverage   (npm test ya lo pasa por defecto)
 *   node test.js              (solo tests, sin coverage)
 *   npm test                  (siempre con --coverage vía package.json)
 *
 * Los argumentos extra se reenvían a Jest (p. ej. --watch, --coverage).
 */
const { spawnSync } = require('child_process');
const path = require('path');

const jestBin = path.join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js');
const passthrough = process.argv.slice(2);
const result = spawnSync(process.execPath, [jestBin, '--runInBand', ...passthrough], {
  stdio: 'inherit',
  cwd: __dirname,
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);
