import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(here, '..');
const sourcePath = resolve(packageDir, 'src/client/index.cjs');
const outputPath = resolve(packageDir, 'client/client.js');
const source = readFileSync(sourcePath, 'utf8');

mkdirSync(dirname(outputPath), { recursive: true });

const output = `window.__ModuleLoader__.load({
  id: 'internal-skill-workshop',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
${source.split('\n').map((line) => line ? `    ${line}` : '').join('\n')}
    return module.exports;
  }
});
`;

writeFileSync(outputPath, output);
