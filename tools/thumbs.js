/* Gera as miniaturas das arenas (public/maps/<arena>/thumb.webp) a partir do jogo rodando.
   Uso: node tools/thumbs.js  (depois de node tools/bake-maps.js) */
'use strict';
const fs = require('fs');
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const Sim = require('../public/sim.js');
(async () => {
  process.env.PORT = process.env.PORT || '3918';
  require(path.join(__dirname, '..', 'server.js'));
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  for (const id of Sim.STAGE_KEYS) {
    await p.goto(`http://localhost:${process.env.PORT}/?vista=${id}`);
    await p.waitForTimeout(2500);
    const png = await p.screenshot();
    const webp = await p.evaluate(async src => {
      const im = new Image(); im.src = src; await im.decode();
      const c = document.createElement('canvas'); c.width = 480; c.height = 270;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, 480, 270);
      return c.toDataURL('image/webp', 0.85);
    }, 'data:image/png;base64,' + png.toString('base64'));
    fs.writeFileSync(path.join(__dirname, '..', 'public', 'maps', id, 'thumb.webp'), Buffer.from(webp.split(',')[1], 'base64'));
    console.log('miniatura:', id);
  }
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
