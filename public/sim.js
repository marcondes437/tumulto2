/* TUMULTO — simulação do jogo (compartilhada entre servidor, anfitrião e modo local).
   Tudo aqui é determinístico e roda a 60 ticks por segundo. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Sim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Bits dos botões segurados
  const B = { L: 1, R: 2, U: 4, D: 8, J: 16, LT: 32, HV: 64, DG: 128, PU: 256 };
  const NBTN = 5; // contadores de toque: 0 pulo, 1 leve, 2 pesado, 3 esquiva, 4 pegar/arremessar arma

  /* ARENAS — geometria física (independente da arte).
     Unidades do mundo: y cresce para baixo; t = topo, b = base.
     solids: blocos sólidos (chão, paredes, teto). O primeiro é sempre o palco principal.
     soft:   plataformas semissólidas (atravessáveis de baixo para cima; baixo/queda rápida atravessa).
     blast:  limites de eliminação. spawns: início da partida (4 vagas). respawn: x de reaparecimento.
     cam:    caixa que a câmera sempre enquadra + limites de zoom. */
  const STAGES = {
    templo: {
      name: 'Templo Congelado', sub: 'Pico das Lanternas',
      solids: [
        { l: -350, r: 350, t: 0, b: 210 },
        { l: 450, r: 640, t: -235, b: -20 },
        { l: -280, r: 280, t: 210, b: 330 },
      ],
      soft: [
        { l: -545, r: -305, t: -125 },
        { l: -115, r: 115, t: -255 },
      ],
      blast: { l: -1350, r: 1350, t: -1050, b: 800 },
      spawns: [[-220, -40], [220, -40], [0, -300], [545, -280]],
      respawn: [[-120, -600], [120, -600], [-260, -600], [260, -600]],
      cam: { l: -560, r: 660, t: -380, b: 120, zmin: 0.5, zmax: 1.1 },
    },
    ilhas: {
      name: 'Ilhas Celestiais', sub: 'Ruínas sobre as nuvens',
      solids: [
        { l: -450, r: 450, t: 0, b: 300 },
        { l: -725, r: -530, t: -420, b: -40 },
        { l: 515, r: 720, t: -565, b: -330 },
      ],
      soft: [
        { l: -360, r: -18, t: -290 },
        { l: 18, r: 360, t: -290 },
      ],
      blast: { l: -1400, r: 1400, t: -1150, b: 850 },
      spawns: [[-250, -40], [250, -40], [-190, -335], [190, -335]],
      respawn: [[-120, -650], [120, -650], [-280, -650], [280, -650]],
      cam: { l: -740, r: 740, t: -380, b: 120, zmin: 0.5, zmax: 1.1 },
    },
    cosmica: {
      name: 'Arena Cósmica', sub: 'Santuário do Eclipse',
      solids: [
        { l: -440, r: 440, t: 0, b: 70 },
        { l: -300, r: 300, t: 70, b: 680 },
      ],
      soft: [],
      blast: { l: -1300, r: 1300, t: -1050, b: 820 },
      spawns: [[-260, -40], [260, -40], [-100, -40], [100, -40]],
      respawn: [[-120, -600], [120, -600], [-280, -600], [280, -600]],
      cam: { l: -620, r: 620, t: -300, b: 120, zmin: 0.5, zmax: 1.05 },
    },
    neon: {
      name: 'Cidade Neon', sub: 'Telhado do Distrito 9',
      solids: [
        { l: -405, r: 405, t: 0, b: 340 },
      ],
      soft: [
        { l: -360, r: -140, t: -205 },
        { l: 140, r: 360, t: -205 },
      ],
      blast: { l: -1300, r: 1300, t: -1050, b: 820 },
      spawns: [[-250, -40], [250, -40], [-250, -250], [250, -250]],
      respawn: [[-120, -600], [120, -600], [-260, -600], [260, -600]],
      cam: { l: -640, r: 640, t: -300, b: 120, zmin: 0.5, zmax: 1.05 },
    },
  };
  const STAGE_KEYS = Object.keys(STAGES);
  const MAX_PLAYERS = 10;
  // pontos de início: os 4 da arena e, a partir do 5º jogador, espalhados sobre o palco principal
  function spawnPoint(st, i) {
    if (i < st.spawns.length) return st.spawns[i];
    const M = st.solids[0], k = i - st.spawns.length;
    const u = [0.5, 0.15, 0.85, 0.32, 0.68, 0.05, 0.95, 0.42][k % 8];
    return [Math.round(M.l + 50 + (M.r - M.l - 100) * u), M.t - 60 - (k >= 8 ? 120 : 0)];
  }
  const STAGE = STAGES.templo; // compatibilidade

  const CHARS = {
    brasa: {
      name: 'Brasa', title: 'A Punhos de Fogo', weapon: 'fists',
      desc: 'Rápida e agressiva. Manoplas flamejantes para combos curtos e um soco-cometa devastador.',
      color: '#ff6a2b', accent: '#ffd23f',
      w: 46, h: 86, run: 7.4, air: 6.6, accel: 1.15, jump: 15.5, airJump: 13.5, airJumps: 2,
      grav: 0.62, fall: 13, fastFall: 19, weight: 0.95, power: 0.95, reach: 1,
    },
    tora: {
      name: 'Tora', title: 'O Lenhador da Montanha', weapon: 'axe',
      desc: 'Pesado e difícil de derrubar. Cada golpe de machado é lento, mas arrasa.',
      color: '#3f9b57', accent: '#e0b070',
      w: 62, h: 104, run: 5.7, air: 5.3, accel: 0.85, jump: 15.2, airJump: 13, airJumps: 2,
      grav: 0.7, fall: 15, fastFall: 21, weight: 1.22, power: 1.15, reach: 3,
    },
    lume: {
      name: 'Lume', title: 'Lanceira da Aurora', weapon: 'spear',
      desc: 'Leve, com três pulos no ar e a lança de maior alcance da ilha.',
      color: '#7b61ff', accent: '#7ef9ff',
      w: 42, h: 88, run: 6.9, air: 6.7, accel: 1.0, jump: 15.5, airJump: 13, airJumps: 3,
      grav: 0.58, fall: 12, fastFall: 18, weight: 0.84, power: 1.0, reach: 5,
    },
    mare: {
      name: 'Maré', title: 'Capitã das Correntes', weapon: 'sword',
      desc: 'Equilibrada em tudo. O sabre dela serve para qualquer situação.',
      color: '#2f8cf0', accent: '#ffd36b',
      w: 48, h: 90, run: 6.6, air: 6.1, accel: 1.0, jump: 15.5, airJump: 13.5, airJumps: 2,
      grav: 0.62, fall: 13.5, fastFall: 19.5, weight: 1.0, power: 1.0, reach: 3,
    },
  };
  const CHAR_KEYS = Object.keys(CHARS);

  // mv(startup, ativo, recuperação, [x,y,w,h] da hitbox, dano, kb base, kb crescimento, ângulo, extras)
  function mv(s, a, r, hb, d, b, g, ang, x) { return Object.assign({ s, a, r, hb, d, b, g, ang }, x || {}); }
  const MOVE_KEYS = ['nL', 'sL', 'dL', 'nA', 'sA', 'dA', 'nH', 'sH', 'dH', 'rec', 'gp'];
  const AIR = { nA: 1, sA: 1, dA: 1, rec: 1 };

  const MOVES = {
    // desarmado (todo mundo começa assim): socos e chutes rápidos e fracos
    unarmed: {
      nL: mv(4, 3, 8, [34, -58, 38, 24], 4, 4, 0.05, 30, { v: 'thrust', arc: [0, 0] }),
      sL: mv(6, 4, 12, [40, -52, 44, 28], 6, 5, 0.065, 25, { v: 'thrust', arc: [-5, -5], vx: 8 }),
      dL: mv(5, 4, 12, [42, -10, 54, 20], 5, 5, 0.06, 70, { v: 'kick', arc: [80, 80], vx: 5 }),
      nA: mv(5, 7, 10, [0, -46, 84, 80], 6, 5, 0.065, 55, { v: 'spin' }),
      sA: mv(6, 5, 12, [40, -38, 50, 30], 7, 5, 0.07, 30, { v: 'kick', arc: [88, 88], vx: 3 }),
      dA: mv(7, 6, 14, [4, 2, 44, 30], 7, 5, 0.07, -70, { v: 'kick', arc: [12, 12] }),
      nH: mv(13, 6, 20, [26, -82, 44, 72], 11, 7, 0.17, 82, { v: 'thrust', arc: [-80, -80], charge: 1 }),
      sH: mv(15, 7, 22, [46, -52, 52, 34], 12, 8, 0.19, 35, { v: 'thrust', arc: [0, 0], vx: 12, hold: 1, charge: 1 }),
      dH: mv(14, 8, 22, [0, -14, 130, 30], 11, 7, 0.16, 45, { v: 'kick', arc: [82, 82], charge: 1 }),
      rec: mv(4, 13, 18, [14, -74, 46, 82], 8, 6, 0.12, 85, { v: 'thrust', arc: [-82, -82], vy: -16, once: 1 }),
      gp: mv(8, 999, 16, [0, -6, 52, 38], 10, 7, 0.15, -60, { v: 'kick', arc: [0, 0], untilLand: 1 }),
    },
    fists: {
      nL: mv(4, 3, 8, [36, -56, 40, 26], 6, 4, 0.06, 30, { v: 'thrust', arc: [0, 0] }),
      sL: mv(6, 4, 12, [42, -52, 46, 30], 8, 5, 0.08, 25, { v: 'thrust', arc: [-5, -5], vx: 7 }),
      dL: mv(5, 4, 12, [38, -14, 52, 22], 7, 5, 0.07, 70, { v: 'kick', arc: [70, 70] }),
      nA: mv(5, 8, 10, [0, -46, 92, 84], 8, 5, 0.08, 50, { v: 'spin' }),
      sA: mv(6, 5, 12, [42, -50, 46, 30], 9, 6, 0.09, 30, { v: 'thrust', arc: [0, 0], vx: 3 }),
      dA: mv(7, 6, 14, [0, -4, 46, 30], 9, 5, 0.09, -70, { v: 'kick', arc: [5, 5] }),
      nH: mv(14, 6, 22, [28, -74, 48, 72], 15, 8, 0.22, 80, { v: 'thrust', arc: [-80, -80], charge: 1 }),
      sH: mv(16, 8, 24, [50, -52, 58, 38], 17, 9, 0.24, 35, { v: 'thrust', arc: [0, 0], vx: 14, hold: 1, charge: 1 }),
      dH: mv(14, 8, 24, [0, -20, 150, 36], 15, 8, 0.21, 40, { v: 'spin', charge: 1 }),
      rec: mv(4, 14, 18, [16, -72, 52, 84], 10, 7, 0.14, 85, { v: 'thrust', arc: [-80, -80], vy: -17, vx: 2, once: 1 }),
      gp: mv(8, 999, 16, [0, -8, 58, 40], 13, 8, 0.18, -60, { v: 'kick', arc: [0, 0], untilLand: 1 }),
    },
    axe: {
      nL: mv(7, 4, 12, [48, -62, 58, 44], 9, 6, 0.08, 40, { v: 'swing', arc: [-100, 20] }),
      sL: mv(8, 5, 14, [58, -48, 72, 36], 10, 6, 0.09, 30, { v: 'swing', arc: [-40, 40], vx: 4 }),
      dL: mv(8, 5, 14, [58, -14, 82, 28], 10, 6, 0.08, 65, { v: 'swing', arc: [20, 80] }),
      nA: mv(8, 8, 12, [0, -50, 132, 104], 11, 6, 0.09, 50, { v: 'spin' }),
      sA: mv(9, 5, 14, [56, -50, 66, 54], 12, 7, 0.1, 35, { v: 'swing', arc: [-80, 50] }),
      dA: mv(10, 6, 16, [16, -4, 72, 44], 12, 6, 0.1, -70, { v: 'swing', arc: [-10, 110] }),
      nH: mv(20, 6, 26, [36, -92, 84, 92], 20, 9, 0.25, 75, { v: 'swing', arc: [60, -150], charge: 1 }),
      sH: mv(22, 6, 28, [70, -52, 104, 64], 22, 10, 0.27, 30, { v: 'swing', arc: [-130, 40], vx: 6, charge: 1 }),
      dH: mv(22, 8, 30, [0, -24, 224, 48], 20, 9, 0.24, 50, { v: 'swing', arc: [-120, 90], charge: 1 }),
      rec: mv(6, 14, 20, [8, -72, 92, 96], 12, 7, 0.14, 80, { v: 'spin', vy: -16, once: 1 }),
      gp: mv(10, 999, 22, [0, -14, 92, 52], 16, 9, 0.2, -60, { v: 'swing', arc: [90, 90], untilLand: 1 }),
    },
    spear: {
      nL: mv(5, 4, 10, [68, -58, 84, 20], 7, 5, 0.07, 25, { v: 'thrust', arc: [-5, -5] }),
      sL: mv(7, 5, 12, [78, -50, 98, 22], 9, 6, 0.08, 20, { v: 'thrust', arc: [0, 0], vx: 5 }),
      dL: mv(6, 5, 12, [72, -12, 104, 20], 8, 5, 0.07, 60, { v: 'thrust', arc: [25, 25] }),
      nA: mv(6, 10, 10, [0, -50, 152, 44], 8, 5, 0.08, 55, { v: 'spin' }),
      sA: mv(7, 6, 12, [78, -50, 98, 24], 10, 6, 0.09, 30, { v: 'thrust', arc: [0, 0] }),
      dA: mv(8, 8, 14, [8, 12, 26, 82], 10, 5, 0.09, -75, { v: 'thrust', arc: [88, 88] }),
      nH: mv(15, 6, 22, [20, -118, 32, 112], 15, 8, 0.23, 85, { v: 'thrust', arc: [-85, -85], charge: 1 }),
      sH: mv(16, 8, 24, [100, -50, 142, 26], 17, 9, 0.24, 28, { v: 'thrust', arc: [0, 0], vx: 12, hold: 1, charge: 1 }),
      dH: mv(15, 8, 24, [0, -14, 244, 26], 15, 8, 0.21, 45, { v: 'spin', charge: 1 }),
      rec: mv(5, 14, 18, [10, -84, 42, 114], 10, 7, 0.14, 85, { v: 'thrust', arc: [-88, -88], vy: -18, once: 1 }),
      gp: mv(8, 999, 16, [0, 4, 30, 72], 13, 8, 0.19, -70, { v: 'thrust', arc: [90, 90], untilLand: 1 }),
    },
    sword: {
      nL: mv(5, 4, 10, [50, -58, 62, 38], 7, 5, 0.07, 35, { v: 'swing', arc: [-80, 30] }),
      sL: mv(6, 5, 12, [58, -50, 74, 36], 9, 6, 0.08, 30, { v: 'swing', arc: [-40, 40], vx: 6 }),
      dL: mv(6, 5, 12, [56, -14, 82, 26], 8, 5, 0.07, 65, { v: 'swing', arc: [20, 80] }),
      nA: mv(6, 8, 10, [0, -50, 122, 92], 9, 5, 0.08, 50, { v: 'spin' }),
      sA: mv(7, 5, 12, [56, -50, 72, 52], 10, 6, 0.09, 35, { v: 'swing', arc: [-80, 50] }),
      dA: mv(8, 6, 14, [14, -4, 62, 42], 10, 5, 0.09, -65, { v: 'swing', arc: [0, 120] }),
      nH: mv(16, 6, 22, [30, -92, 82, 92], 16, 8, 0.23, 80, { v: 'swing', arc: [60, -150], charge: 1 }),
      sH: mv(17, 6, 24, [64, -50, 92, 52], 18, 9, 0.25, 32, { v: 'swing', arc: [-110, 50], vx: 9, charge: 1 }),
      dH: mv(16, 8, 24, [0, -20, 192, 40], 16, 8, 0.22, 45, { v: 'spin', charge: 1 }),
      rec: mv(5, 14, 18, [14, -72, 82, 92], 11, 7, 0.14, 82, { v: 'spin', vy: -17, once: 1 }),
      gp: mv(9, 999, 18, [0, -10, 72, 46], 14, 8, 0.19, -65, { v: 'swing', arc: [90, 90], untilLand: 1 }),
    },
  };

  function moveOf(charKey, key, armed) { return MOVES[armed === false ? 'unarmed' : CHARS[charKey].weapon][key]; }
  function movesFor(p) { return MOVES[p.armed ? CHARS[p.char].weapon : 'unarmed']; }

  function rng(s) {
    s.seed = (s.seed + 0x6D2B79F5) | 0;
    let t = s.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function ev(s, ty, x, y, a, b, c) {
    s.events.push({ id: ++s.evId, t: s.tick, ty, x: Math.round(x), y: Math.round(y), a: a | 0, b: b | 0, c: c | 0 });
  }

  function createGame(roster, opts) {
    opts = opts || {};
    const s = {
      stage: STAGES[opts.stage] ? opts.stage : STAGE_KEYS[0], st: null,
      tick: 0, seed: (opts.seed | 0) || 12345, stocks: clamp(opts.stocks | 0 || 3, 1, 99), cd: opts.noCountdown ? 0 : 150,
      players: [], events: [], evId: 0, over: null,
      items: [], itemId: 0, itemT: 60,
    };
    s.st = STAGES[s.stage];
    roster.slice(0, MAX_PLAYERS).forEach((r, i) => {
      const key = CHARS[r.char] ? r.char : 'mare';
      const C = CHARS[key];
      const sp = spawnPoint(s.st, i);
      s.players.push({
        id: i, name: String(r.name || 'Jogador').slice(0, 16), char: key, cpu: !!r.cpu, lvl: clamp(r.lvl | 0 || 2, 1, 3),
        x: sp[0], y: sp[1], vx: 0, vy: 0, face: sp[0] < 0 ? 1 : -1,
        ground: false, plat: -1, jumps: C.airJumps, wallJumps: 3, recUsed: false, airDodged: false,
        dodgeT: 0, dodgeCd: 0, dodgeGround: false, atk: null, atkKey: '', mf: 0, charge: 0, hitSet: [],
        stun: 0, freeze: 0, inv: 0, landLag: 0, wall: 0, dropT: 0, downT: 0, ff: false, armed: false,
        dmg: 0, stocks: s.stocks, dead: 0, out: false, place: 0, kos: 0, falls: 0, dealt: 0,
        lastHitBy: -1, lastHitT: -9999,
        in: { h: 0, c: [0, 0, 0, 0, 0] }, prevC: [0, 0, 0, 0, 0], buf: [0, 0, 0, 0, 0], bot: null,
      });
    });
    return s;
  }

  function setInput(s, i, inp) {
    const p = s.players[i];
    if (!p || p.cpu || !inp) return;
    const c = Array.isArray(inp.c) ? inp.c : [0, 0, 0, 0, 0];
    p.in = { h: (inp.h | 0) & 511, c: [c[0] | 0, c[1] | 0, c[2] | 0, c[3] | 0, c[4] | 0] };
  }

  function removePlayer(s, i) {
    const p = s.players[i];
    if (!p || p.out) return;
    p.out = true; p.stocks = 0; p.dead = 0; p.atk = null;
    p.place = s.players.filter(q => !q.out).length + 1;
    ev(s, 9, p.x, p.y, p.id);
  }

  // ---------------------------------------------------------------- passo
  function step(s) {
    s.tick++;
    if (s.cd > 0) s.cd--;
    for (const p of s.players) {
      if (p.out) continue;
      if (p.cpu) p.in = botInput(s, p);
      const c = p.in.c;
      for (let i = 0; i < NBTN; i++) {
        if ((c[i] | 0) !== p.prevC[i]) { p.prevC[i] = c[i] | 0; if (s.cd === 0 && !s.over) p.buf[i] = 9; }
      }
      if (p.dead > 0) { p.dead--; if (p.dead === 0) respawn(s, p); continue; }
      if (p.freeze > 0) { p.freeze--; continue; }
      updatePlayer(s, p);
    }
    hits(s);
    stepItems(s);
    for (const p of s.players) if (!p.out && p.dead === 0) checkBlast(s, p);
    const minT = s.tick - 50;
    while (s.events.length && s.events[0].t < minT) s.events.shift();
    if (!s.over && s.players.length >= 2) {
      const alive = s.players.filter(p => !p.out);
      if (alive.length <= 1) {
        s.over = { winner: alive.length ? alive[0].id : -1, t: s.tick };
        if (alive[0]) alive[0].place = 1;
      }
    }
  }

  function updatePlayer(s, p) {
    const C = CHARS[p.char];
    const held = (s.cd > 0 || s.over) ? 0 : p.in.h;
    const dx = ((held & B.R) ? 1 : 0) - ((held & B.L) ? 1 : 0);
    const up = !!(held & B.U), down = !!(held & B.D);
    for (let i = 0; i < NBTN; i++) if (p.buf[i] > 0) p.buf[i]--;
    if (p.inv > 0) p.inv--;
    if (p.dodgeCd > 0) p.dodgeCd--;
    if (p.dropT > 0) p.dropT--;
    p.ff = false;

    if (p.stun > 0) {
      p.stun--;
      p.vx *= 0.955;
    } else if (p.dodgeT > 0) {
      p.dodgeT--;
      if (p.dodgeGround) p.vx *= 0.88;
      else if (p.dodgeT < 6) { p.vx *= 0.8; p.vy *= 0.8; }
    } else if (p.atk) {
      runMove(s, p, held, dx);
    } else if (p.landLag > 0) {
      p.landLag--; p.vx *= 0.7;
    } else {
      control(s, p, C, held, dx, up, down);
    }
    physics(s, p, C, down);
  }

  function control(s, p, C, held, dx, up, down) {
    if (p.ground) {
      // segurar baixo sobre plataforma semissólida (sem atacar) = descer por ela
      p.downT = (down && !dx && p.plat >= 0) ? p.downT + 1 : 0;
      if (p.downT >= 5 && !p.buf[1] && !p.buf[2] && !p.buf[3]) {
        p.downT = 0; p.ground = false; p.plat = -1; p.dropT = 14; p.y += 3; p.vy = 3; ev(s, 10, p.x, p.y, p.id);
        return;
      }
      if (dx) { p.vx += (dx * C.run - p.vx) * 0.3 * C.accel; p.face = dx; }
      else { p.vx *= 0.72; if (Math.abs(p.vx) < 0.2) p.vx = 0; }
      if (p.buf[0] > 0) {
        p.buf[0] = 0;
        if (down && p.plat >= 0) { p.ground = false; p.plat = -1; p.dropT = 14; p.y += 3; p.vy = 3; ev(s, 10, p.x, p.y, p.id); }
        else { p.vy = -C.jump; p.ground = false; p.plat = -1; ev(s, 3, p.x, p.y, p.id); }
      }
    } else {
      if (dx) { p.vx += (dx * C.air - p.vx) * 0.12 * C.accel; p.face = dx; }
      else p.vx *= 0.985;
      if (down && p.vy > -1) p.ff = true;
      if (p.wall && dx === p.wall && p.vy > 2.5) p.vy = 2.5;
      if (p.buf[0] > 0) {
        if (p.wall && p.wallJumps > 0) {
          p.buf[0] = 0; p.wallJumps--; p.vy = -C.airJump; p.vx = -p.wall * 8; p.face = -p.wall; ev(s, 3, p.x, p.y, p.id, 1);
        } else if (p.jumps > 0) {
          p.buf[0] = 0; p.jumps--; p.vy = -C.airJump; if (dx) p.vx = dx * C.air; ev(s, 3, p.x, p.y, p.id, 1);
        }
      }
    }
    // esquiva
    if (p.buf[3] > 0 && p.dodgeCd === 0 && (p.ground || !p.airDodged)) {
      p.buf[3] = 0;
      if (p.ground) {
        p.dodgeGround = true; p.dodgeT = 20; p.inv = Math.max(p.inv, 16); p.vx = dx * 10; p.dodgeCd = 45;
      } else {
        const dy = (down ? 1 : 0) - (up ? 1 : 0);
        const l = Math.hypot(dx, dy) || 1;
        p.dodgeGround = false; p.dodgeT = 18; p.inv = Math.max(p.inv, 14); p.airDodged = true; p.dodgeCd = 60;
        if (dx || dy) { p.vx = dx / l * 11; p.vy = dy / l * 11; } else { p.vx *= 0.2; p.vy = 0; }
      }
      ev(s, 8, p.x, p.y, p.id);
      return;
    }
    // pegar / arremessar arma
    if (p.buf[4] > 0) {
      p.buf[4] = 0;
      if (p.armed) { throwWeapon(s, p, dx, up, down); return; }
      const it = itemInReach(s, p);
      if (it) { it.st = 4; it.t = 0; p.armed = true; ev(s, 11, it.x, it.y, p.id); return; }
    }
    // ataques
    if (p.buf[1] > 0 || p.buf[2] > 0) {
      const heavy = p.buf[2] > p.buf[1];
      p.buf[1] = 0; p.buf[2] = 0;
      let key;
      if (p.ground) {
        if (!heavy) key = down ? 'dL' : dx ? 'sL' : 'nL';
        else key = up ? 'rec' : down ? 'dH' : dx ? 'sH' : 'nH';
      } else {
        if (!heavy) key = down ? 'dA' : dx ? 'sA' : 'nA';
        else key = down ? 'gp' : dx ? 'sH' : 'rec';
      }
      if (key === 'rec' && p.recUsed) key = null;
      if (key) startMove(s, p, key, dx);
    }
  }

  function startMove(s, p, key, dx) {
    const m = movesFor(p)[key];
    p.atk = m; p.atkKey = key; p.mf = 0; p.charge = 0; p.hitSet = [];
    if (dx) p.face = dx;
    if (m.once) p.recUsed = true;
  }

  function runMove(s, p, held, dx) {
    const m = p.atk, C = CHARS[p.char];
    if (m.charge && p.mf === m.s - 1 && (held & B.HV) && p.charge < 45 && p.ground) p.charge++;
    else p.mf++;
    if (p.mf === m.s) {
      if (m.vx) p.vx = p.face * m.vx;
      if (m.vy) { p.vy = m.vy; p.ground = false; p.plat = -1; }
      ev(s, 5, p.x, p.y, p.id, MOVE_KEYS.indexOf(p.atkKey), p.charge);
    }
    const active = p.mf >= m.s && p.mf < m.s + m.a;
    if (m.untilLand && p.mf >= m.s && !p.ground) { p.mf = m.s; p.vy = Math.max(p.vy, 17); p.vx *= 0.9; }
    if (m.hold && active) p.vx = p.face * m.vx;
    if (p.ground) { if (!(m.vx && active)) p.vx *= 0.82; }
    else if (dx && !m.untilLand) p.vx += (dx * C.air * 0.7 - p.vx) * 0.06;
    if (p.mf >= m.s + m.a + m.r) { p.atk = null; p.atkKey = ''; p.charge = 0; }
  }

  function physics(s, p, C, down) {
    const px = p.x, py = p.y;
    if (!p.ground) {
      let g = C.grav;
      if (p.dodgeT > 0 && !p.dodgeGround) g = 0;
      p.vy += g;
      if (p.ff && p.vy < C.fastFall) p.vy = Math.min(C.fastFall, p.vy + 2.2);
      const cap = p.stun > 0 ? C.fall * 2.2 : p.ff ? C.fastFall : (p.atk && p.atk.untilLand) ? 20 : C.fall;
      if (p.vy > cap) p.vy = Math.max(cap, p.vy * 0.9);
    }
    p.x += p.vx; p.y += p.vy;
    collide(s, p, C, px, py, down);
  }

  // plat: -1 = no ar, >= 0 = índice da plataforma semissólida, <= -2 = sólido (-2 - índice)
  function collide(s, p, C, px, py, down) {
    const ST = s.st, hw = C.w / 2, h = C.h;
    p.wall = 0;
    if (p.ground) {
      if (p.plat <= -2) {
        const M = ST.solids[-2 - p.plat];
        if (!M || p.x < M.l - hw * 0.6 || p.x > M.r + hw * 0.6) { p.ground = false; p.plat = -1; }
        else { p.y = M.t; p.vy = 0; }
      } else {
        const P = ST.soft[p.plat];
        if (!P || p.x < P.l - 4 || p.x > P.r + 4) { p.ground = false; p.plat = -1; }
        else { p.y = P.t; p.vy = 0; }
      }
    }
    for (let i = 0; i < ST.solids.length; i++) {
      const M = ST.solids[i];
      if (!(p.x + hw > M.l && p.x - hw < M.r && p.y > M.t && p.y - h < M.b)) continue;
      if (!p.ground && py <= M.t + 0.5) land(s, p, M.t, -2 - i);
      else if (py - h >= M.b - 0.5) { p.y = M.b + h; if (p.vy < 0) p.vy = p.stun > 0 ? -p.vy * 0.4 : 0; }
      else {
        p.x = px < (M.l + M.r) / 2 ? M.l - hw : M.r + hw;
        if (p.stun > 0 && Math.abs(p.vx) > 6) p.vx = -p.vx * 0.5; else p.vx = 0;
      }
    }
    if (!p.ground && p.vy >= 0 && p.dropT === 0 && !(down && p.stun === 0)) {
      for (let i = 0; i < ST.soft.length; i++) {
        const P = ST.soft[i];
        if (py <= P.t + 0.5 && p.y >= P.t && p.x >= P.l - 4 && p.x <= P.r + 4) { land(s, p, P.t, i); break; }
      }
    }
    if (!p.ground) {
      for (const M of ST.solids) {
        if (!(p.y > M.t + 12 && p.y - h < M.b + 40)) continue;
        if (Math.abs(p.x + hw - M.l) < 2) { p.wall = 1; break; }
        if (Math.abs(p.x - hw - M.r) < 2) { p.wall = -1; break; }
      }
    }
  }

  function land(s, p, y, plat) {
    if (p.stun > 0 && p.vy > 9) { p.y = y; p.vy = -p.vy * 0.45; ev(s, 4, p.x, y, p.id, 1); return; }
    const hard = p.vy;
    p.y = y; p.vy = 0; p.ground = true; p.plat = plat;
    const C = CHARS[p.char];
    p.jumps = C.airJumps; p.wallJumps = 3; p.recUsed = false; p.airDodged = false;
    if (p.stun > 8) p.stun = 8;
    if (p.atk) {
      const m = p.atk;
      if (m.untilLand && p.mf >= m.s) { p.mf = m.s + m.a; ev(s, 6, p.x, y, p.id); }
      else if (AIR[p.atkKey] || m.untilLand) { p.atk = null; p.atkKey = ''; p.landLag = 7; }
    }
    if (p.dodgeT > 0 && !p.dodgeGround) p.dodgeT = 0;
    if (hard > 7) ev(s, 4, p.x, y, p.id, 0);
  }

  function hits(s) {
    for (const a of s.players) {
      if (!a.atk || a.dead || a.out || a.freeze > 0) continue;
      const m = a.atk;
      if (!(a.mf >= m.s && a.mf < m.s + m.a)) continue;
      const hx = a.x + a.face * m.hb[0], hy = a.y + m.hb[1], hw2 = m.hb[2] / 2, hh2 = m.hb[3] / 2;
      for (const v of s.players) {
        if (v === a || v.dead || v.out || v.inv > 0 || a.hitSet.indexOf(v.id) >= 0) continue;
        const VC = CHARS[v.char];
        if (hx + hw2 < v.x - VC.w / 2 || hx - hw2 > v.x + VC.w / 2 || hy + hh2 < v.y - VC.h || hy - hh2 > v.y) continue;
        a.hitSet.push(v.id);
        applyHit(s, a, v, m, hx, hy);
      }
    }
  }

  function applyHit(s, a, v, m, hx, hy) {
    const AC = CHARS[a.char], VC = CHARS[v.char];
    const ch = a.charge / 45;
    const d = Math.max(1, Math.round(m.d * AC.power * (1 + ch * 0.4)));
    v.dmg = Math.min(999, v.dmg + d); a.dealt += d;
    const kb = (m.b + v.dmg * m.g) * (1 + ch * 0.25) / VC.weight;
    let ang = m.ang;
    if (ang < 0 && v.ground) ang = 25;
    const dir = m.hb[0] === 0 ? (v.x >= a.x ? 1 : -1) : a.face;
    const r = ang * Math.PI / 180;
    v.vx = Math.cos(r) * kb * dir; v.vy = -Math.sin(r) * kb;
    if (v.vy < 0) { v.ground = false; v.plat = -1; v.y -= 1; }
    v.stun = Math.min(65, Math.round(6 + kb * 1.5));
    v.atk = null; v.atkKey = ''; v.charge = 0; v.dodgeT = 0; v.landLag = 0;
    v.airDodged = false; v.recUsed = false; if (v.jumps < 1) v.jumps = 1;
    v.lastHitBy = a.id; v.lastHitT = s.tick;
    v.face = -dir;
    const f = Math.min(14, 3 + Math.floor(d * 0.35));
    a.freeze = f; v.freeze = f;
    ev(s, 1, (hx + v.x) / 2, (hy + v.y - VC.h / 2) / 2, v.id, d, Math.round(kb));
  }

  // ---------------------------------------------------------------- armas que caem do céu
  // estados: 0 caindo, 1 no chão (pode pegar), 2 arremessada, 3 sumindo, 4 pega (removida)
  const ITEM_MAX = 3, ITEM_LIFE = 60 * 22;
  function surfaces(st) {
    const out = [];
    for (const M of st.solids) if (!st.solids.some(o => o !== M && o.b === M.t && o.l <= M.l && o.r >= M.r)) out.push(M);
    for (const P of st.soft) out.push(P);
    return out;
  }
  function spawnItem(s) {
    const surf = surfaces(s.st);
    let tot = 0; for (const S of surf) tot += S.r - S.l;
    let k = rng(s) * tot, S = surf[0];
    for (const q of surf) { if (k < q.r - q.l) { S = q; break; } k -= q.r - q.l; }
    const x = Math.round(S.l + 40 + rng(s) * Math.max(1, S.r - S.l - 80));
    const it = { id: ++s.itemId, x, y: s.st.blast.t + 200, vx: 0, vy: 3, st: 0, t: 0, own: -1 };
    s.items.push(it);
    ev(s, 13, x, it.y, it.id);
  }
  function landY(s, x, py, y) {
    let best = null;
    for (const M of s.st.solids) if (x >= M.l && x <= M.r && py <= M.t + 0.5 && y >= M.t && (best === null || M.t < best)) best = M.t;
    for (const P of s.st.soft) if (x >= P.l && x <= P.r && py <= P.t + 0.5 && y >= P.t && (best === null || P.t < best)) best = P.t;
    return best;
  }
  function itemInReach(s, p) {
    const C = CHARS[p.char];
    let best = null, bd = 1e9;
    for (const it of s.items) {
      if (it.st > 1) continue;
      const dx = Math.abs(it.x - p.x);
      if (dx > C.w / 2 + 40 || it.y < p.y - C.h - 30 || it.y > p.y + 40) continue;
      if (dx < bd) { bd = dx; best = it; }
    }
    return best;
  }
  function throwWeapon(s, p, dx, up, down) {
    const C = CHARS[p.char];
    let vx = p.face * 17 + dx * 2, vy = -3;
    if (up) { vx = p.face * 4; vy = -17; }
    else if (down && !p.ground) { vx = p.face * 3; vy = 15; }
    s.items.push({ id: ++s.itemId, x: p.x + p.face * 24, y: p.y - C.h * 0.62, vx, vy, st: 2, t: 0, own: p.id });
    p.armed = false;
    if (p.ground) p.landLag = 8;
    ev(s, 12, p.x, p.y - C.h * 0.6, p.id);
  }
  function stepItems(s) {
    if (s.cd === 0 && !s.over && --s.itemT <= 0) {
      if (s.items.filter(it => it.st <= 1).length < ITEM_MAX) spawnItem(s);
      s.itemT = 300 + Math.floor(rng(s) * 240);
    }
    const Z = s.st.blast;
    for (const it of s.items) {
      it.t++;
      if (it.st === 0) {
        const py = it.y; it.vy = Math.min(it.vy + 0.45, 10); it.y += it.vy;
        const ly = landY(s, it.x, py, it.y);
        if (ly !== null) { it.y = ly; it.vy = 0; it.st = 1; it.t = 0; ev(s, 14, it.x, ly, it.id); }
      } else if (it.st === 1) {
        if (it.t > ITEM_LIFE) { it.st = 3; it.t = 0; }
      } else if (it.st === 2) {
        const py = it.y; it.x += it.vx; it.vy += 0.35; it.y += it.vy;
        for (const v of s.players) {
          if (v.id === it.own || v.dead || v.out || v.inv > 0) continue;
          const VC = CHARS[v.char];
          if (Math.abs(it.x - v.x) > VC.w / 2 + 20 || it.y < v.y - VC.h - 20 || it.y > v.y + 20) continue;
          throwHit(s, it, v); it.st = 3; it.t = 0; break;
        }
        if (it.st === 2) {
          const hitSolid = s.st.solids.some(M => it.x > M.l && it.x < M.r && it.y > M.t && it.y < M.b);
          if (hitSolid || landY(s, it.x, py, it.y) !== null || it.t > 100) { it.st = 3; it.t = 0; }
        }
      }
      if (it.y > Z.b || it.x < Z.l || it.x > Z.r) { it.st = 4; }
    }
    s.items = s.items.filter(it => it.st !== 4 && !(it.st === 3 && it.t > 30));
  }
  function throwHit(s, it, v) {
    const VC = CHARS[v.char], a = s.players[it.own];
    const d = 9;
    v.dmg = Math.min(999, v.dmg + d); if (a) a.dealt += d;
    const kb = (6 + v.dmg * 0.1) / VC.weight, dir = it.vx >= 0 ? 1 : -1, r = 38 * Math.PI / 180;
    v.vx = Math.cos(r) * kb * dir; v.vy = -Math.sin(r) * kb;
    if (v.vy < 0) { v.ground = false; v.plat = -1; v.y -= 1; }
    v.stun = Math.min(55, Math.round(6 + kb * 1.4));
    v.atk = null; v.atkKey = ''; v.charge = 0; v.dodgeT = 0; v.landLag = 0;
    v.lastHitBy = it.own; v.lastHitT = s.tick; v.face = -dir; v.freeze = 6;
    ev(s, 1, it.x, it.y, v.id, d, Math.round(kb));
  }

  function checkBlast(s, p) {
    const Z = s.st.blast;
    if (p.x < Z.l || p.x > Z.r || p.y < Z.t || p.y > Z.b) {
      p.stocks--; p.falls++;
      if (p.lastHitBy >= 0 && s.tick - p.lastHitT < 480 && s.players[p.lastHitBy]) s.players[p.lastHitBy].kos++;
      ev(s, 2, clamp(p.x, Z.l, Z.r), clamp(p.y, Z.t, Z.b), p.id);
      p.dead = 90; p.armed = false; p.atk = null; p.atkKey = ''; p.stun = 0; p.vx = 0; p.vy = 0; p.freeze = 0; p.dodgeT = 0; p.lastHitBy = -1;
      if (p.stocks <= 0) {
        p.out = true; p.dead = 0;
        p.place = s.players.filter(q => !q.out).length + 1;
      }
    }
  }

  function respawn(s, p) {
    const C = CHARS[p.char];
    const rp = s.st.respawn[p.id % s.st.respawn.length];
    p.x = rp[0]; p.y = rp[1];
    p.vx = 0; p.vy = 0; p.dmg = 0; p.inv = 120; p.ground = false; p.plat = -1;
    p.jumps = C.airJumps; p.recUsed = false; p.airDodged = false; p.wallJumps = 3;
    p.stun = 0; p.atk = null; p.atkKey = ''; p.landLag = 0; p.downT = 0; p.armed = false;
    ev(s, 7, p.x, p.y, p.id);
  }

  // ---------------------------------------------------------------- CPU
  function botInput(s, p) {
    const b = p.bot || (p.bot = { c: [0, 0, 0, 0, 0], react: 40, jumpCd: 0, puCd: 0 });
    if (b.puCd > 0) b.puCd--;
    const C = CHARS[p.char], M = s.st.solids[0], lvl = p.lvl || 2;
    const R = () => rng(s);
    let h = 0;
    if (b.jumpCd > 0) b.jumpCd--;
    if (b.react > 0) b.react--;
    const out = () => ({ h, c: b.c.slice() });
    if (p.dead || s.cd > 0 || s.over) return out();
    const cx = (M.l + M.r) / 2;
    const off = !p.ground && (p.x < M.l - 5 || p.x > M.r + 5 || p.y > M.t + 2);
    if (off && p.stun === 0) {
      // embaixo do palco: primeiro sai pela lateral, depois volta subindo
      const side = p.x < cx ? -1 : 1, hw = C.w / 2;
      const outside = side < 0 ? p.x < M.l - hw - 6 : p.x > M.r + hw + 6;
      const toward = (p.y > M.t - 10 && !outside) ? side : -side;
      h |= toward > 0 ? B.R : B.L;
      const below = p.y > M.t - 30;
      if (p.vy > 0 && b.jumpCd === 0) {
        if (p.wall && p.wallJumps > 0) { b.c[0]++; b.jumpCd = 8; }
        else if (p.jumps > 0 && (below || p.y > -140)) { b.c[0]++; b.jumpCd = 14; }
        else if (p.jumps === 0 && !p.recUsed && below) { h |= B.U; b.c[2]++; b.jumpCd = 24; }
      }
      return out();
    }
    let t = null, bd = 1e9;
    for (const o of s.players) {
      if (o === p || o.dead || o.out) continue;
      const d = Math.abs(o.x - p.x) + Math.abs(o.y - p.y) * 0.7;
      if (d < bd) { bd = d; t = o; }
    }
    // desarmado: vai buscar a arma mais próxima no chão
    if (!p.armed && p.stun === 0) {
      let it = null, id2 = 1e9;
      for (const q of s.items) { if (q.st !== 1) continue; const d2 = Math.abs(q.x - p.x) + Math.abs(q.y - p.y) * 1.5; if (d2 < id2) { id2 = d2; it = q; } }
      const enemyClose = t && Math.abs(t.x - p.x) < 120 && Math.abs(t.y - p.y) < 90;
      if (it && id2 < 900 && !enemyClose) {
        const ddx = it.x - p.x, ddy = it.y - p.y;
        if (Math.abs(ddx) > 30) h |= ddx > 0 ? B.R : B.L;
        if (p.ground && ddy < -60 && b.jumpCd === 0) { b.c[0]++; b.jumpCd = 22; }
        if (!p.ground && ddy < -40 && p.vy > 0 && p.jumps > 0 && b.jumpCd === 0) { b.c[0]++; b.jumpCd = 18; }
        if (p.ground && p.plat >= 0 && ddy > 60 && b.jumpCd === 0) { h |= B.D; b.c[0]++; b.jumpCd = 26; }
        if (Math.abs(ddx) < 40 && Math.abs(ddy) < 60 && b.puCd === 0) { b.c[4]++; b.puCd = 20; }
        if (p.ground && p.plat <= -2) {
          const G = s.st.solids[-2 - p.plat];
          if (G && ((p.x < G.l + 30 && (h & B.L)) || (p.x > G.r - 30 && (h & B.R)))) h &= ~(B.L | B.R);
        }
        return out();
      }
    }
    if (!t) return out();
    const dx = t.x - p.x, dy = t.y - p.y, adx = Math.abs(dx);
    // armado: às vezes arremessa a arma em quem está longe
    if (p.armed && !p.atk && adx > 220 && adx < 520 && Math.abs(dy) < 50 && b.puCd === 0 && R() < 0.004 * lvl) { b.c[4]++; b.puCd = 120; h |= dx > 0 ? B.R : B.L; return out(); }
    const tOff = t.x < M.l - 20 || t.x > M.r + 20;
    const wantX = tOff ? clamp(t.x, M.l + 60, M.r - 60) : t.x;
    const mdx = wantX - p.x;
    const reach = p.armed ? { fists: 70, axe: 95, spear: 130, sword: 95 }[C.weapon] : 60;
    if (Math.abs(mdx) > reach * 0.7) h |= mdx > 0 ? B.R : B.L;
    if (p.ground && dy < -110 && b.jumpCd === 0 && R() < 0.05 * lvl) { b.c[0]++; b.jumpCd = 25; }
    if (!p.ground && dy < -60 && p.vy > 0 && p.jumps > 0 && b.jumpCd === 0 && R() < 0.04 * lvl) { b.c[0]++; b.jumpCd = 20; }
    if (p.ground && p.plat >= 0 && dy > 80 && b.jumpCd === 0 && R() < 0.05) { h |= B.D; b.c[0]++; b.jumpCd = 30; }
    if (t.atk && adx < 140 && Math.abs(dy) < 100 && p.dodgeCd === 0 && !p.atk && R() < 0.02 * lvl) { b.c[3]++; return out(); }
    if (b.react === 0 && !p.atk && adx < reach + 20 && Math.abs(dy) < 100 && !t.inv) {
      b.react = [34, 20, 10][lvl - 1] + Math.floor(R() * 16);
      h &= ~(B.L | B.R);
      const face = dx > 0 ? B.R : B.L;
      const r = R();
      if (dy < -60) { h |= B.U; if (p.ground) b.c[2]++; else b.c[1]++; }
      else if (t.dmg > 80 + 40 * R() && r < 0.55) { h |= face; b.c[2]++; }
      else if (r < 0.65) { h |= face; b.c[1]++; }
      else if (r < 0.82) { h |= B.D; b.c[1]++; }
      else { h |= face; b.c[2]++; }
    }
    if (p.ground && p.plat <= -2) {
      const G = s.st.solids[-2 - p.plat];
      if (G && ((p.x < G.l + 30 && (h & B.L)) || (p.x > G.r - 30 && (h & B.R)))) h &= ~(B.L | B.R);
    }
    return out();
  }

  // ---------------------------------------------------------------- saída
  function stateCode(p) {
    if (p.out) return 8;
    if (p.dead) return 6;
    if (p.atk) return 3;
    if (p.stun) return 4;
    if (p.dodgeT) return 5;
    if (p.landLag) return 7;
    if (p.ground) return Math.abs(p.vx) > 0.6 ? 1 : 0;
    return 2;
  }
  function flags(p) {
    return (p.inv > 0 ? 1 : 0) | (p.ground ? 2 : 0) | (p.wall ? 4 : 0) | (p.ff ? 8 : 0) |
      (p.out ? 16 : 0) | (p.freeze > 0 ? 32 : 0) | (p.dodgeGround ? 64 : 0) | (p.armed ? 128 : 0);
  }
  function snapshot(s) {
    return {
      k: s.tick, cd: s.cd, o: s.over ? s.over.winner : null, m: s.stage,
      p: s.players.map(p => [p.id, Math.round(p.x), Math.round(p.y), p.face, stateCode(p),
        p.atk ? MOVE_KEYS.indexOf(p.atkKey) : -1, p.mf, p.charge, p.dmg, p.stocks, flags(p),
        Math.round(p.vx * 10) / 10, Math.round(p.vy * 10) / 10]),
      e: s.events.map(e => [e.id, e.ty, e.x, e.y, e.a, e.b, e.c, e.t]),
      w: s.items.map(it => [it.id, Math.round(it.x), Math.round(it.y), it.st, it.own, Math.round(it.vx * 10) / 10, it.t]),
    };
  }
  function results(s) {
    return s.players.map(p => ({ id: p.id, name: p.name, char: p.char, cpu: p.cpu, place: p.place || 1, kos: p.kos, falls: p.falls, dealt: p.dealt }))
      .sort((a, b) => a.place - b.place);
  }

  return { B, NBTN, MAX_PLAYERS, STAGE, STAGES, STAGE_KEYS, CHARS, CHAR_KEYS, MOVES, MOVE_KEYS, moveOf, createGame, setInput, removePlayer, step, snapshot, results };
});
