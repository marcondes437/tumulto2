/* Gera (assa) as camadas de arte das arenas em public/maps/<arena>/*.webp e o manifesto.
   Uso: node tools/bake-maps.js [arena ...]
   Requer Playwright + Chromium (só para gerar a arte; o jogo em si não precisa). */
'use strict';
const fs = require('fs');
const path = require('path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const Sim = require('../public/sim.js');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'maps');
const MAN = path.join(OUT, 'manifest.json');

(async () => {
  const want = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const ids = want.length ? want : Sim.STAGE_KEYS;
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined;
  const browser = await pw.chromium.launch({ executablePath: exe, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('[pintor]', m.text()); });
  page.on('pageerror', e => console.log('[pintor] erro:', e.message));
  await page.goto('file://' + path.join(__dirname, 'art', 'index.html'));
  const manifest = fs.existsSync(MAN) ? JSON.parse(fs.readFileSync(MAN, 'utf8')) : {};
  const v = Date.now().toString(36);
  for (const id of ids) {
    const t0 = Date.now();
    const res = await page.evaluate(id => window.bake(id, 0.9), id);
    const dir = path.join(OUT, id); fs.mkdirSync(dir, { recursive: true });
    const layers = [];
    let bytes = 0;
    for (const L of res.layers) {
      const o = Object.assign({}, L);
      if (L.data) {
        const buf = Buffer.from(L.data.split(',')[1], 'base64');
        fs.writeFileSync(path.join(dir, L.src), buf); bytes += buf.length;
        delete o.data;
      }
      layers.push(o);
    }
    manifest[id] = { base: 'maps/' + id + '/', v, fallback: res.fallback, layers };
    console.log(`${id}: ${layers.length} camadas, ${(bytes / 1048576).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  fs.writeFileSync(MAN, JSON.stringify(manifest, null, 1));
  fs.writeFileSync(path.join(OUT, 'manifest.js'), '/* gerado por tools/bake-maps.js — não edite à mão */\nwindow.TUMULTO_ARENAS = ' + JSON.stringify(manifest) + ';\n');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
