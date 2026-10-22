/* Captura de tela do jogo para conferência visual.
   node tools/shot.js "<query>" saida.png [largura altura] [espera_ms] [js] */
'use strict';
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const [, , query = '', out = 'shot.png', w = '1280', h = '720', wait = '2500', js = ''] = process.argv;
(async () => {
  process.env.PORT = process.env.PORT || '3917';
  require(path.join(__dirname, '..', 'server.js'));
  const b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', e => console.log('erro na página:', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
  await p.goto(`http://localhost:${process.env.PORT}/${query}`);
  await p.waitForTimeout(+wait);
  if (js) { await p.evaluate(js); await p.waitForTimeout(400); }
  await p.screenshot({ path: out });
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
