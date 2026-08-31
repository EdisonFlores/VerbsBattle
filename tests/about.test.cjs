const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

test('Acerca del proyecto presenta los datos del creador y se abre/cierra sin alertas', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /Juan Carlos Pashma Segovia/);
  assert.match(html, /Tecnologías de la Información \(TI\) en la ESPOCH, sede Morona Santiago/);
  assert.match(html, /aria-controls="about-project"/);
  assert.match(html, /<section id="about-project"[^>]* hidden>/);
  const nodes = new Map();
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, {
        hidden: true, attributes: {}, handlers: {},
        addEventListener(type, fn) { this.handlers[type] = fn; },
        setAttribute(key, val) { this.attributes[key] = val; }
      });
      return nodes.get(id);
    },
    querySelectorAll() { return []; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/index.js'), 'utf8'), {
    document, window: { ProfileStore: { listProfiles: () => [] } },
    alert() { assert.fail('Los créditos no deben abrir una alerta del navegador'); }
  });
  const button = nodes.get('credits-btn'), panel = nodes.get('about-project');
  button.handlers.click();
  assert.equal(panel.hidden, false);
  assert.equal(button.attributes['aria-expanded'], 'true');
  button.handlers.click();
  assert.equal(panel.hidden, true);
  assert.equal(button.attributes['aria-expanded'], 'false');
});
