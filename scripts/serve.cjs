const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { inventory } = require('./check-resources.cjs');
const root = path.resolve(__dirname, '..', process.argv[2] || '.');
const port = Number(process.env.PORT || 8000);
const base = process.env.BASE_PATH || '/';
if (!base.startsWith('/') || !base.endsWith('/')) throw new Error('BASE_PATH debe empezar y terminar con /');
const allowed = new Set(inventory(root));
if (fs.existsSync(path.join(root,'sw.js'))) allowed.add('sw.js');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405).end();return;}
  const relative = pathname.startsWith(base) ? pathname.slice(base.length) || 'index.html' : '';
  if (!allowed.has(relative)) {res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Recurso no encontrado');return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(relative)] || 'text/plain','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD')res.end();else fs.createReadStream(path.join(root,relative)).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Verb Battle: http://127.0.0.1:${port}${base} (${root})`));
