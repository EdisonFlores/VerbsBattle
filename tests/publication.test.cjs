const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {inventory}=require('../scripts/check-resources.cjs');
const root=path.resolve(__dirname,'..');
test('inventario offline completo, sin Shuar, prototipos ni recursos externos',()=>{
  const files=inventory(root);
  for(const file of ['data/verbs.json','data/all_verbs.json','data/achievements.json','js/pwa.js','game-classic.html','study.html'])assert.ok(files.includes(file),file);
  assert.ok(!files.some(file=>/Shuar|legacy|\.idea|tests\//.test(file)));
});
test('verificador detecta enlaces rotos, anclas y diferencias de mayúsculas',()=>{
  // Isolated copy of the public graph; never mutate application source.
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'verbsbattle-check-'));
  try {
    for(const file of inventory(root)) {const dest=path.join(temp,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
    const original=fs.readFileSync(path.join(temp,'index.html'),'utf8');
    for(const href of ['missing.html','Index.html','index.html#missing','/index.html']) {
      fs.writeFileSync(path.join(temp,'index.html'),original+`<a href="${href}">Test</a>`);
      assert.throws(()=>inventory(temp));
    }
  } finally {fs.rmSync(temp,{recursive:true});}
});
test('manifest portable e iconos PNG con dimensiones correctas',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest')));
  assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./index.html');assert.equal(manifest.display,'standalone');
  for(const icon of manifest.icons){const bytes=fs.readFileSync(path.join(root,icon.src));const size=Number(icon.sizes.split('x')[0]);assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
});
function worker(scope='https://example.test/verbsbattle/',fail=false){
  const events={}, stores=new Map(),deleted=[];
  const caches={
    async open(name){if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return {async addAll(requests){if(fail)throw Error('offline');for(const request of requests)store.set(request.url,new Response(request.url));},async match(url){return store.get(url)?.clone();}};},
    async keys(){return [...stores.keys()];},async delete(name){deleted.push(name);return stores.delete(name);}
  };
  const self={registration:{scope},clients:{claim:async()=>{}},addEventListener:(type,fn)=>{events[type]=fn;}};
  const template=fs.readFileSync(path.join(root,'scripts/sw-template.js'),'utf8').replace('__VERSION__','test').replace('__ASSETS__',JSON.stringify(['index.html','game-classic.html','data/verbs.json']));
  vm.runInNewContext(template,{self,caches,Request,Response,URL,fetch:async()=>{throw Error('network unavailable');}});
  return {stores,deleted,async run(type){let result;events[type]({waitUntil:promise=>{result=promise;}});return result;},async get(url,method='GET'){let result;events.fetch({request:{url,method},respondWith:promise=>{result=promise;}});return result;}};
}
test('service worker: navegación y datos funcionan offline en raíz y subcarpeta',async()=>{
  for(const scope of ['https://example.test/','https://example.test/repo/']){
    const sw=worker(scope);await sw.run('install');await sw.run('activate');
    assert.equal(await (await sw.get(scope)).text(),scope+'index.html');
    assert.equal(await (await sw.get(scope+'game-classic.html?player=test')).text(),scope+'game-classic.html');
    assert.equal(await (await sw.get(scope+'data/verbs.json')).text(),scope+'data/verbs.json');
    assert.equal(await sw.get(scope+'missing.json'),undefined);
    assert.equal(await sw.get('https://external.test/'),undefined);
    assert.equal(await sw.get(scope+'index.html','POST'),undefined);
  }
});
test('actualización limpia solo la caché propia y descarga fallida no reemplaza la anterior',async()=>{
  const sw=worker();const prefix='verb-battle:'+encodeURIComponent('https://example.test/verbsbattle/')+':';
  sw.stores.set(prefix+'old',new Map());sw.stores.set('otra-app',new Map());
  await sw.run('install');await sw.run('activate');
  assert.ok(sw.deleted.includes(prefix+'old'));assert.ok(sw.stores.has('otra-app'));
  const bad=worker(undefined,true);bad.stores.set(prefix+'old',new Map());
  await assert.rejects(bad.run('install'));assert.ok(bad.stores.has(prefix+'old'));assert.ok(!bad.stores.has(prefix+'test'));
});
