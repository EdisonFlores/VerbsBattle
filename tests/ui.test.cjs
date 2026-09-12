const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

// Small DOM double for executing the real page handlers without dependencies.
class Element {
  constructor(document, dataset = {}) {
    this.document = document; this.dataset = dataset; this.children = []; this.events = {};
    this.attributes = {}; this.style = {}; this.disabled = false; this.hidden = false;
    this.value = ''; this.textContent = ''; this.className = '';
    this.classList = {
      add: (...names) => { this.className += ' ' + names.join(' '); },
      remove: (...names) => { this.className = this.className.split(' ').filter(n => !names.includes(n)).join(' '); },
      contains: name => this.className.split(' ').includes(name)
    };
  }
  addEventListener(type, handler) { (this.events[type] ||= []).push(handler); }
  fire(type, extra = {}) { for (const handler of this.events[type] || []) handler({ target: this, preventDefault() {}, ...extra }); }
  click() { if (!this.disabled) this.fire('click'); }
  focus() { this.document.activeElement = this; }
  setAttribute(name, value) { this.attributes[name] = value; }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = children; }
  querySelectorAll() { return this.children; }
  querySelector() { return this.children[0]; }
}

async function boot(script, count = 2) {
  const nodes = new Map(), startup = [], answers = [];
  const document = {
    activeElement: null,
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, new Element(document)); return nodes.get(id); },
    createElement() { return new Element(document); },
    addEventListener(type, handler) { if (type === 'DOMContentLoaded') startup.push(handler); },
    querySelector(selector) { return this.getElementById(selector); },
    querySelectorAll(selector) { return lists[selector] || []; }
  };
  const modes = ['Normal', 'Flash', 'Examen', 'Estudio', 'Puzzle', 'Sorpresa'].map(mode => new Element(document, { mode }));
  const difficulties = ['Facil', 'Medio', 'Dificil'].map(difficulty => new Element(document, { difficulty }));
  const counts = [5,10,15,20,25].map(count => new Element(document, { count: String(count) }));
  const lists = { '.mode-btn': modes, '.diff-btn': difficulties, '.count-btn': counts };
  nodes.set('flash-mode', modes[1]);
  document.getElementById('verbCountModal').children = [...counts, document.getElementById('cancel-round-count')];
  const saved = new Map([['selectedMode','normal'],['selectedDifficulty','Facil'],['selectedTurns','5']]);
  const localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key,val) => saved.set(key,String(val)), removeItem: key => saved.delete(key) };
  const players = Array.from({length:count}, (_,i) => ({name:'Test '+i,profileId:'p'+i,score:0,timeSpent:0}));
  saved.set('players', JSON.stringify(players));
  let clock = 1000;
  const window = { location: { href: '' }, ProfileStore: {
    ready: async () => {}, preparePlayers: players => players, newId: () => 'attempt',
    recordAnswer: (id,answer) => answers.push(answer), completeGame: () => {},
    getProfile: id => id ? {id,name:'Test 0'} : null
  }, setInterval: () => 1, clearInterval: () => {} };
  const verb = {infinitive:'be',past:'was/were',pastParticiple:'been',meaning:'ser, estar'};
  saved.set('selectedExamProfileId','p0');
  saved.set('selectedExamVerbs',JSON.stringify([verb]));
  const context = vm.createContext({window,document,localStorage,console,Date:class extends Date { static now(){return clock;} },
    fetch:async()=>({ok:true,json:async()=>({facil:[verb]})}),alert:message=>{throw new Error(message);}});
  for(const name of ['game-utils.js','powers.js',script]) vm.runInContext(fs.readFileSync(path.join(root,'js',name),'utf8'),context);
  for(const start of startup) await start();
  return {nodes,document,modes,difficulties,counts,window,answers,saved,get players(){return JSON.parse(saved.get('players'));},advance:ms=>{clock+=ms;}};
}

test('cada modo navega a su página; los competitivos abren las rondas', async () => {
  const routes=['game-classic.html','game-flash.html','exam-select.html','study.html','game-puzzle.html','game-surprise.html'];
  for(let i=0;i<routes.length;i++) {
    const ui=await boot('mode.js'); ui.modes[i].click();
    if(![2,3].includes(i)) ui.difficulties[0].click();
    ui.nodes.get('start-game').click();
    if(![2,3].includes(i)) {
      assert.equal(ui.nodes.get('verbCountModal').style.display,'flex');
      assert.equal(ui.document.activeElement,ui.counts[0]); ui.counts[0].click();
    }
    assert.equal(ui.window.location.href,routes[i]);
  }
});

test('validación y cierre de rondas no bloquean el selector; Flash requiere dos jugadores', async () => {
  const ui=await boot('mode.js',1);
  assert.equal(ui.modes[1].disabled,true);
  ui.nodes.get('start-game').click(); assert.match(ui.nodes.get('mode-status').textContent,/Selecciona un modo/);
  ui.modes[0].click(); ui.nodes.get('start-game').click(); assert.match(ui.nodes.get('mode-status').textContent,/dificultad/);
  ui.difficulties[0].click(); ui.nodes.get('start-game').click(); ui.nodes.get('cancel-round-count').click();
  assert.equal(ui.nodes.get('verbCountModal').style.display,'none');
  assert.equal(ui.document.activeElement,ui.nodes.get('start-game'));
});

test('Clásico, Flash y Sorpresa arrancan con verbo, jugador y progreso sin errores', async () => {
  for(const script of ['game-classic.js','game-flash.js','game-surprise.js']) {
    const ui=await boot(script);
    assert.match(ui.nodes.get('verb').textContent,/ser, estar/);
    assert.match(ui.nodes.get('round-progress').textContent,/Ronda 1 de 5/);
    assert.equal(ui.nodes.get('submit-answer').disabled,false);
    assert.equal(ui.nodes.get('player-name-display').textContent,'Test 0');
  }
});

test('Puzzle acepta variantes, registra tiempo y bloquea una segunda corrección', async () => {
  const ui=await boot('game-puzzle.js',1), bank=ui.nodes.get('puzzle-bank');
  for(const value of ['be','was/were','been']) bank.children.find(card=>card.textContent===value).click();
  ui.advance(5200); ui.nodes.get('check-puzzle').click();
  assert.equal(ui.players[0].score,30);
  assert.equal(ui.answers.length,1); assert.equal(ui.answers[0].elapsedMs,5200);
  assert.deepEqual(Array.from(ui.answers[0].marks),[true,true,true]);
  assert.ok(ui.nodes.get('puzzle-slots').children.every(slot=>slot.disabled));
  ui.nodes.get('check-puzzle').fire('click'); assert.equal(ui.answers.length,1);
  assert.equal(ui.players[0].score,30);
  ui.nodes.get('next-verb').click(); assert.match(ui.nodes.get('round-progress').textContent,/Ronda 2 de 5/);
});

test('las 13 páginas usan estilos locales y un único sistema visual', () => {
  const pages=fs.readdirSync(root).filter(file=>file.endsWith('.html'));
  assert.equal(pages.length,13);
  for(const page of pages) {
    const html=fs.readFileSync(path.join(root,page),'utf8');
    assert.match(html,/css\/theme.css/); assert.match(html,/css\/tailwind-built.css/);
    assert.match(html,/css\/vendor\/bootstrap-grid.min.css/);
    assert.doesNotMatch(html,/<(?:script|link)[^>]+(?:src|href)="https?:/);
    assert.doesNotMatch(html,/<style\b/);
    assert.equal((html.match(/<main\b/g)||[]).length,1);
    assert.equal((html.match(/id="main-content"/g)||[]).length,1);
    assert.doesNotMatch(html,/class="modal"/);
  }
});

test('puntuación real de Normal y Flash: aciertos +10, errores -5 y envío idempotente', async () => {
  for (const script of ['game-classic.js','game-flash.js']) {
    for (const [answer,expected] of [['be was been',30],['be wrong been',15],['no no no',-15]]) {
      const ui=await boot(script);
      ui.nodes.get('answer').value=answer;
      ui.advance(4500);
      ui.nodes.get('submit-answer').click();
      assert.equal(ui.players[0].score,expected);
      assert.equal(ui.answers.length,1);
      assert.equal(ui.answers[0].elapsedMs,4500);
      ui.nodes.get('submit-answer').fire('click');
      assert.equal(ui.players[0].score,expected);
      assert.equal(ui.answers.length,1);
      ui.nodes.get('next-verb').click();
      assert.equal(ui.nodes.get('player-name-display').textContent,'Test 1');
    }
  }
});

test('examen: nota sobre diez, variantes, redondeo, omisión y resultado persistente', async () => {
  for(const [answer,score] of [['be were been',10],['be no been',6.7],['',0]]) {
    const ui=await boot('exam-play.js',1);ui.nodes.get('answer').value=answer;ui.advance(4000);
    ui.nodes.get(answer?'submitBtn':'skipBtn').click();
    const result=JSON.parse(ui.saved.get('lastExamResult'));
    assert.equal(result.scoreOutOf10,score);assert.equal(result.details[0].timeMs,4000);
    assert.equal(result.profileId,'p0');assert.equal(ui.window.location.href,'exam-result.html');
    ui.nodes.get('submitBtn').fire('click');assert.equal(ui.answers.length,1);
  }
});
