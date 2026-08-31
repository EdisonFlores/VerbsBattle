const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { inventory } = require('./check-resources.cjs');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
require('./stamp-assets.cjs');
const files = inventory(root);
// dist is generated only. Refuse to overwrite a folder that this build did not own.
if (fs.existsSync(out) && !fs.existsSync(path.join(out, '.verbsbattle-build'))) throw new Error('dist ya existe y no fue generado por este script. Renómbralo antes de compilar.');
if (fs.existsSync(out)) {
  if (fs.lstatSync(out).isSymbolicLink() || path.dirname(fs.realpathSync(out)) !== fs.realpathSync(root)) throw new Error('Directorio dist no seguro');
  fs.rmSync(out, {recursive:true});
}
fs.mkdirSync(out);
fs.writeFileSync(path.join(out, '.verbsbattle-build'), 'generated\n');
const digest = crypto.createHash('sha256');
for (const file of files) {
  const content = fs.readFileSync(path.join(root, file));
  digest.update(file); digest.update(content);
  const target = path.join(out, file);
  fs.mkdirSync(path.dirname(target), {recursive:true}); fs.writeFileSync(target, content);
}
const template = fs.readFileSync(path.join(__dirname, 'sw-template.js'), 'utf8');
digest.update(template);
const version = digest.digest('hex').slice(0,16);
fs.writeFileSync(path.join(out, 'sw.js'), template.replace('__VERSION__',version).replace('__ASSETS__',JSON.stringify(files)));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
inventory(out);
console.log(`dist listo: ${files.length} recursos, versión ${version}. Shuar, legacy, tests y configuración privada excluidos.`);
