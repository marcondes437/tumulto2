/* Testes da simulação por arena: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const Sim = require('../public/sim.js');
const { B } = Sim;

function game(stage, n = 1) {
  const roster = [];
  for (let i = 0; i < n; i++) roster.push({ name: 'P' + i, char: ['mare', 'tora', 'lume', 'brasa'][i % 4] });
  return Sim.createGame(roster, { stage, noCountdown: true, seed: 42 });
}
function place(p, x, y) { Object.assign(p, { x, y, vx: 0, vy: 0, ground: false, plat: -1, dropT: 0, stun: 0, inv: 0 }); }
function run(s, ticks, input) {
  for (let t = 0; t < ticks; t++) { if (input) Sim.setInput(s, 0, input(t)); Sim.step(s); }
}
const hold = h => () => ({ h, c: [0, 0, 0, 0] });

for (const key of Sim.STAGE_KEYS) {
  const ST = Sim.STAGES[key];

  test(`${key}: dados válidos`, () => {
    assert.ok(ST.solids.length >= 1);
    assert.strictEqual(ST.spawns.length, 4);
    for (const M of ST.solids) assert.ok(M.l < M.r && M.t < M.b);
    for (const P of ST.soft) assert.ok(P.l < P.r);
    const Z = ST.blast;
    for (const M of ST.solids) assert.ok(M.l > Z.l && M.r < Z.r && M.t > Z.t);
  });

  test(`${key}: todos os spawns pousam em algo sólido ou semissólido`, () => {
    const s = game(key, 4);
    run(s, 180);
    for (const p of s.players) {
      assert.ok(p.ground, `${p.name} deveria estar no chão (x=${p.x}, y=${p.y})`);
      assert.strictEqual(p.stocks, 3);
    }
  });

  test(`${key}: pousa no topo de cada bloco sólido`, () => {
    ST.solids.forEach((M, i) => {
      const covered = ST.solids.some(o => o !== M && o.b === M.t && o.l <= M.l && o.r >= M.r);
      if (covered) return; // topo escondido sob outro bloco (pilar da Arena Cósmica)
      const s = game(key); const p = s.players[0];
      place(p, (M.l + M.r) / 2, M.t - 120);
      run(s, 60);
      assert.ok(p.ground, `bloco ${i}`); assert.strictEqual(p.plat, -2 - i); assert.strictEqual(p.y, M.t);
    });
  });

  test(`${key}: pousa em cada plataforma semissólida`, () => {
    ST.soft.forEach((P, i) => {
      const s = game(key); const p = s.players[0];
      place(p, (P.l + P.r) / 2, P.t - 100);
      run(s, 60);
      assert.ok(p.ground); assert.strictEqual(p.plat, i); assert.strictEqual(p.y, P.t);
    });
  });

  test(`${key}: atravessa semissólida de baixo para cima`, () => {
    ST.soft.forEach((P, i) => {
      const s = game(key); const p = s.players[0];
      place(p, (P.l + P.r) / 2, P.t + 60); p.vy = -16;
      run(s, 70);
      assert.ok(p.ground && p.plat === i, `deveria terminar em cima da plataforma ${i} (plat=${p.plat}, y=${p.y})`);
    });
  });

  test(`${key}: segurar baixo desce da semissólida`, () => {
    ST.soft.forEach((P, i) => {
      const s = game(key); const p = s.players[0];
      place(p, (P.l + P.r) / 2, P.t - 2); run(s, 10);
      assert.strictEqual(p.plat, i);
      run(s, 12, hold(B.D));
      assert.ok(p.plat !== i && p.y > P.t, 'deveria ter descido');
    });
  });

  test(`${key}: baixo + pular desce da semissólida na hora`, () => {
    ST.soft.forEach((P, i) => {
      const s = game(key); const p = s.players[0];
      place(p, (P.l + P.r) / 2, P.t - 2); run(s, 10);
      run(s, 3, t => ({ h: B.D, c: [t >= 1 ? 1 : 0, 0, 0, 0] }));
      assert.ok(p.plat !== i && p.y > P.t);
    });
  });

  test(`${key}: queda rápida atravessa semissólidas`, () => {
    ST.soft.forEach((P, i) => {
      const s = game(key); const p = s.players[0];
      place(p, (P.l + P.r) / 2, P.t - 150);
      run(s, 40, hold(B.D));
      assert.ok(p.plat !== i, 'não deveria ter parado na semissólida');
    });
  });

  test(`${key}: paredes laterais dos sólidos bloqueiam`, () => {
    ST.solids.forEach((M, i) => {
      const s = game(key); const p = s.players[0]; const hw = Sim.CHARS[p.char].w / 2;
      const midY = Math.min(M.b - 5, M.t + 110);
      place(p, M.l - hw - 40, midY); p.vx = 12;
      Sim.step(s); Sim.step(s); Sim.step(s); Sim.step(s); Sim.step(s);
      assert.ok(p.x + hw <= M.l + 0.001, `bloco ${i}: atravessou a parede esquerda (x=${p.x})`);
    });
  });

  test(`${key}: sair pelos limites elimina e reaparece`, () => {
    const s = game(key, 2); const p = s.players[0];
    run(s, 30);
    place(p, ST.blast.r + 10, -100);
    Sim.step(s);
    assert.strictEqual(p.stocks, 2); assert.ok(p.dead > 0);
    run(s, 95);
    assert.strictEqual(p.dead, 0); assert.ok(p.inv > 0);
    run(s, 200);
    assert.ok(p.ground, 'reaparece e pousa no palco');
  });

  test(`${key}: determinístico e sem NaN em partida de 4 CPUs`, () => {
    const mk = () => Sim.createGame([0, 1, 2, 3].map(i => ({ name: 'C' + i, char: Sim.CHAR_KEYS[i], cpu: true, lvl: 3 })), { stage: key, seed: 777, stocks: 3 });
    const a = mk(), b = mk();
    for (let t = 0; t < 60 * 60; t++) {
      Sim.step(a); Sim.step(b);
      if (t % 300 === 0) assert.deepStrictEqual(Sim.snapshot(a).p, Sim.snapshot(b).p);
    }
    for (const p of a.players) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.strictEqual(Sim.snapshot(a).m, key);
  });
}

test('arena desconhecida usa a primeira', () => {
  const s = Sim.createGame([{ char: 'mare' }, { char: 'tora' }], { stage: 'nada' });
  assert.strictEqual(s.stage, Sim.STAGE_KEYS[0]);
});

test('cosmica: teto sob a borda do palco bloqueia o pulo', () => {
  const s = game('cosmica'); const p = s.players[0];
  place(p, -370, 160); p.vy = -15;
  run(s, 8);
  assert.ok(p.y - Sim.CHARS[p.char].h >= 70 - 0.001, 'cabeça não pode passar da base da borda');
});

test('10 lutadores: todos nascem em cima do palco e a partida roda em todas as arenas', () => {
  assert.strictEqual(Sim.MAX_PLAYERS, 10);
  for (const key of Sim.STAGE_KEYS) {
    const roster = Array.from({ length: 12 }, (_, i) => ({ name: 'C' + i, char: Sim.CHAR_KEYS[i % 4], cpu: true, lvl: 2 }));
    const s = Sim.createGame(roster, { stage: key, seed: 5 });
    assert.strictEqual(s.players.length, 10, 'limite de 10 lutadores');
    for (let t = 0; t < 140; t++) Sim.step(s);
    for (const p of s.players) assert.ok(p.ground, `${key}: ${p.name} deveria ter pousado (x=${p.x}, y=${p.y})`);
    for (let t = 0; t < 60 * 40; t++) Sim.step(s);
    for (const p of s.players) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  }
});

// ---------------------------------------------------------------- armas que caem do céu
test('armas: todos entram desarmados e armas caem do céu até o chão', () => {
  const s = game('templo', 2);
  for (const p of s.players) assert.strictEqual(p.armed, false);
  let landed = null;
  for (let t = 0; t < 60 * 20 && !landed; t++) { Sim.step(s); landed = s.items.find(it => it.st === 1); }
  assert.ok(landed, 'uma arma deveria ter caído e pousado');
  const tops = [...Sim.STAGES.templo.solids.map(M => M.t), ...Sim.STAGES.templo.soft.map(P => P.t)];
  assert.ok(tops.includes(landed.y), `arma pousou numa superfície (y=${landed.y})`);
  assert.ok(Sim.snapshot(s).w.some(w => w[0] === landed.id && w[3] === 1), 'arma vai no estado enviado pela rede');
});

test('armas: pegar arma troca os golpes e arremessar acerta o rival', () => {
  const s = game('neon', 2); const [a, b] = s.players;
  run(s, 30);
  s.items.push({ id: 99, x: a.x, y: a.y, vx: 0, vy: 0, st: 1, t: 0, own: -1 });
  let n = 0; // contadores de botão são cumulativos (cada aperto soma 1)
  const press = btn => t => { if (t === 0) n++; const c = [0, 0, 0, 0, n]; return { h: 0, c }; };
  run(s, 3, press(4));
  assert.strictEqual(a.armed, true, 'deveria ter pegado a arma');
  assert.ok(!s.items.some(it => it.id === 99 && it.st <= 1), 'arma saiu do chão');
  // arremessa no rival à frente
  place(b, a.x + a.face * 160, a.y); b.ground = true; b.plat = a.plat;
  const d0 = b.dmg;
  run(s, 2, () => ({ h: 0, c: [0, 0, 0, 0, n] }));
  run(s, 30, press(4));
  assert.strictEqual(a.armed, false, 'arremessou a arma');
  assert.ok(b.dmg > d0, `arma arremessada deveria causar dano (${d0} -> ${b.dmg})`);
});

test('armas: golpe desarmado é mais fraco que armado', () => {
  for (const k of Sim.CHAR_KEYS) {
    const u = Sim.moveOf(k, 'sH', false), w = Sim.moveOf(k, 'sH', true);
    const dmg = m => (m.hits ? m.hits.reduce((a, h) => a + h.d, 0) : m.d);
    assert.ok(dmg(u) < dmg(w), k);
  }
});

test('armas: perder uma vida perde a arma', () => {
  const s = game('ilhas', 2); const p = s.players[0];
  run(s, 30); p.armed = true;
  place(p, Sim.STAGES.ilhas.blast.r + 20, -100); Sim.step(s);
  assert.strictEqual(p.armed, false);
});
