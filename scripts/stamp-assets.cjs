// Refresh local asset URLs after editing JS/CSS, without changing file names.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
for (const page of fs.readdirSync(root).filter(name => name.endsWith('.html'))) {
  const file = path.join(root, page);
  const html = fs.readFileSync(file, 'utf8').replace(
    /((?:src|href)=")((?:js|css)\/[^"?]+)(?:\?v=[^"&]+)?"/g,
    (_, prefix, asset) => {
      const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, asset))).digest('hex').slice(0, 12);
      return `${prefix}${asset}?v=${hash}"`;
    });
  fs.writeFileSync(file, html);
}
