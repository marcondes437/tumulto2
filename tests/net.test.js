/* Teste de multiplayer real: servidor + clientes WebSocket. node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 3990 + Math.floor(Math.random() * 9);
let srv;

function client() {
  const ws = new WebSocket(`ws://localhost:${PORT}`);
  const c = { ws, msgs: [], waiters: [] };
  ws.onmessage = e => {
    const m = JSON.parse(e.data); c.msgs.push(m);
    for (const w of c.waiters.slice()) if (w.pred(m)) { c.waiters.splice(c.waiters.indexOf(w), 1); w.res(m); }
  };
  c.open = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  c.send = o => ws.send(JSON.stringify(o));
  c.wait = (pred, ms = 4000) => new Promise((res, rej) => {
    const found = c.msgs.find(pred); if (found) { c.msgs.splice(c.msgs.indexOf(found), 1); return res(found); }
    const w = { pred, res }; c.waiters.push(w);
    setTimeout(() => { const i = c.waiters.indexOf(w); if (i >= 0) { c.waiters.splice(i, 1); rej(new Error('tempo esgotado esperando mensagem')); } }, ms);
  });
  return c;
}

test.before(async () => {
  srv = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { const r = await fetch(`http://localhost:${PORT}/health`); if (r.ok) return; } catch (e) { /* ainda subindo */ } await new Promise(r => setTimeout(r, 100)); }
  throw new Error('servidor não subiu');
});
test.after(() => { if (srv) srv.kill(); });

test('arte das arenas é servida', async () => {
  for (const f of ['maps/manifest.js', 'maps/neon/stage.webp', 'maps/templo/thumb.webp', 'arena.js']) {
    const r = await fetch(`http://localhost:${PORT}/${f}`);
    assert.strictEqual(r.status, 200, f);
    if (f.endsWith('.webp')) assert.strictEqual(r.headers.get('content-type'), 'image/webp');
  }
});

test('duas salas simultâneas, cada uma com sua arena, sincronizadas pelo servidor', async () => {
  const A = client(), Bc = client(), C2 = client(), D = client();
  await Promise.all([A.open, Bc.open, C2.open, D.open]);

  // sala 1: A cria, B entra, A escolhe Cidade Neon
  A.send({ t: 'create', name: 'Ana', char: 'brasa' });
  const l1 = await A.wait(m => m.t === 'lobby');
  Bc.send({ t: 'join', code: l1.code, name: 'Beto', char: 'tora' });
  await Bc.wait(m => m.t === 'lobby' && m.members.length === 2);
  Bc.send({ t: 'stage', k: 'cosmica' }); // não é anfitrião: deve ser ignorado
  A.send({ t: 'stage', k: 'neon' });
  const lb = await Bc.wait(m => m.t === 'lobby' && m.stage === 'neon');
  assert.strictEqual(lb.stage, 'neon');

  // sala 2: C cria, D entra, arena Templo Congelado
  C2.send({ t: 'create', name: 'Caio', char: 'lume', stage: 'templo' });
  const l2 = await C2.wait(m => m.t === 'lobby');
  assert.notStrictEqual(l2.code, l1.code);
  assert.strictEqual(l2.stage, 'templo');
  D.send({ t: 'join', code: l2.code, name: 'Duda', char: 'mare' });
  await D.wait(m => m.t === 'lobby' && m.members.length === 2);
  C2.send({ t: 'stage', k: 'invalida' }); // arena inexistente vira a padrão
  await C2.wait(m => m.t === 'lobby' && m.stage === 'templo');

  A.send({ t: 'start' }); C2.send({ t: 'start' });
  const [sa, sb, sc, sd] = await Promise.all([A.wait(m => m.t === 'start'), Bc.wait(m => m.t === 'start'), C2.wait(m => m.t === 'start'), D.wait(m => m.t === 'start')]);
  assert.strictEqual(sa.stage, 'neon'); assert.strictEqual(sb.stage, 'neon');
  assert.strictEqual(sc.stage, 'templo'); assert.strictEqual(sd.stage, 'templo');
  assert.strictEqual(sa.you, 0); assert.strictEqual(sb.you, 1);

  // espera a contagem acabar; B anda para a direita segurando o botão
  const B_R = 2;
  Bc.send({ t: 'in', h: B_R, c: [0, 0, 0, 0] });
  const first = await Bc.wait(m => m.t === 's' && m.s.cd === 0, 6000);
  assert.strictEqual(first.s.m, 'neon');
  const x0 = first.s.p[1][1];
  await new Promise(r => setTimeout(r, 400));
  Bc.msgs.length = 0;
  const later = await Bc.wait(m => m.t === 's');
  assert.ok(later.s.p[1][1] > x0 + 40, `Beto deveria ter andado (x ${x0} -> ${later.s.p[1][1]})`);
  // os dois clientes da sala 1 recebem o mesmo estado do servidor
  A.msgs.length = 0;
  const aSnap = await A.wait(m => m.t === 's');
  assert.strictEqual(aSnap.s.m, 'neon');
  // sala 2 não foi afetada pelo movimento da sala 1
  const dSnap = await D.wait(m => m.t === 's' && m.s.cd === 0, 6000);
  assert.strictEqual(dSnap.s.m, 'templo');
  assert.deepStrictEqual([dSnap.s.p[0][1], dSnap.s.p[1][1]], [-220, 220]);

  for (const c of [A, Bc, C2, D]) c.ws.close();
});

test('sala aceita até 10 lutadores e recusa o 11º', async () => {
  const cs = Array.from({ length: 11 }, () => client());
  await Promise.all(cs.map(c => c.open));
  cs[0].send({ t: 'create', name: 'Host' });
  const l = await cs[0].wait(m => m.t === 'lobby');
  for (let i = 1; i < 10; i++) { cs[i].send({ t: 'join', code: l.code, name: 'J' + i }); await cs[i].wait(m => m.t === 'lobby'); }
  cs[10].send({ t: 'join', code: l.code, name: 'Extra' });
  const err = await cs[10].wait(m => m.t === 'err');
  assert.match(err.msg, /10/);
  cs[0].send({ t: 'start' });
  const st = await cs[9].wait(m => m.t === 'start');
  assert.strictEqual(st.roster.length, 10); assert.strictEqual(st.you, 9);
  for (const c of cs) c.ws.close();
});
