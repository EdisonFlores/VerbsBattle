const fs = require('node:fs');
const path = require('node:path');
function inventory(root) {
  root = path.resolve(root);
  const files = new Set(), queue = [], external = new Set();
  function add(from, raw, rootRelative = false) {
    if (!raw || /^(data:|mailto:|tel:)/i.test(raw)) return;
    if (/^(https?:)?\/\//i.test(raw)) { external.add(raw); return; }
    if (raw.startsWith('/')) throw new Error(`Ruta absoluta incompatible con GitHub Pages: ${from}: ${raw}`);
    const [pathname, fragment] = raw.split('#');
    const clean = decodeURIComponent(pathname.split('?')[0]);
    const relative = path.posix.normalize(path.posix.join(rootRelative ? '' : path.posix.dirname(from), clean || path.posix.basename(from)));
    if (relative.startsWith('../') || path.isAbsolute(relative)) throw new Error(`Fuera del sitio: ${raw}`);
    const parts = relative.split('/'); let current = root;
    for (const part of parts) {
      if (!fs.readdirSync(current).includes(part)) throw new Error(`Recurso inexistente o mayúsculas incorrectas: ${from} -> ${relative}`);
      current = path.join(current, part);
    }
    if (!fs.statSync(current).isFile()) throw new Error(`Se esperaba un archivo: ${relative}`);
    if (fragment && relative.endsWith('.html')) {
      const source = fs.readFileSync(current, 'utf8');
      if (![...source.matchAll(/\bid=["']([^"']+)["']/g)].some(m => m[1] === decodeURIComponent(fragment))) throw new Error(`Ancla inexistente: ${from} -> ${raw}`);
    }
    if (!files.has(relative)) { files.add(relative); queue.push(relative); }
  }
  for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html'))) add('index.html', file);
  add('index.html', 'manifest.webmanifest');
  // Dynamic avatars are selected at runtime; keep the explicit supported set.
  for (const color of ['amarillo','azul','rojo','verde','rosado','gris']) add('index.html', `assets/img/ui/avatars/avatar-${color}.png`);
  for (const license of ['bootstrap-LICENSE','tailwind-LICENSE']) add('index.html', `css/vendor/${license}`);
  while (queue.length) {
    const file = queue.shift(), ext = path.extname(file);
    if (!['.html','.css','.js','.json','.webmanifest'].includes(ext)) continue;
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    if (ext === '.html') {
      for (const m of source.matchAll(/\b(?:src|href|poster)=["']([^"']+)["']/g)) add(file, m[1]);
    } else if (ext === '.css') {
      for (const m of source.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g)) add(file, m[1]);
      for (const m of source.matchAll(/@import\s+["']([^"']+)["']/g)) add(file, m[1]);
    } else if (ext === '.js') {
      // Page routes, JSON requests, and literal image references in active scripts.
      for (const m of source.matchAll(/["']((?:data|assets)\/[^"'`$]+\.(?:json|png|jpg|svg)|[\w-]+\.html)(?:\?[^"']*)?["']/g)) add(file, m[1], true);
    } else {
      const data = JSON.parse(source);
      if (ext === '.webmanifest') {
        add(file, data.start_url.replace(/^\.\//,''));
        for (const icon of data.icons || []) add(file, icon.src);
      } else {
        const visit = value => {
          if (!value || typeof value !== 'object') return;
          if (typeof value.image === 'string') add('index.html', value.image);
          Object.values(value).forEach(visit);
        }; visit(data);
      }
    }
  }
  if (external.size) throw new Error('Recursos externos no disponibles offline: ' + [...external].join(', '));
  return [...files].sort();
}
module.exports = { inventory };
if (require.main === module) {
  const files = inventory(process.argv[2] || path.resolve(__dirname, '..'));
  console.log(`OK: ${files.length} archivos activos; enlaces, anclas, JSON y recursos locales verificados.`);
}
