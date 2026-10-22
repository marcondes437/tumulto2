/* TUMULTO — cliente: desenho, som, controles, menus e rede. */
(() => {
  'use strict';
  const S = window.Sim, B = S.B, CH = S.CHARS;
  const IS_ARTIFACT = window.TUMULTO_BUILD === 'artifact';
  const STEP = 1000 / 60;
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const SLOT = ['#ff5a5a', '#4aa8ff', '#5be08a', '#ffd23f', '#c77dff', '#ff9a3d', '#3de0d0', '#ff6fb5', '#b8e04a', '#e8e8f0'];
  const MAXP = S.MAX_PLAYERS;
  const OUT = '#1b1030';
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------ armazenamento
  const store = {
    get(k, d) { try { const v = localStorage.getItem('tumulto.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('tumulto.' + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } },
  };
  let toastT = 0;
  function toast(msg, ms) {
    const t = $('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms || 2800);
  }

  // ------------------------------------------------------------ canvas
  const cv = $('cv'), g = cv.getContext('2d');
  let VW = 1280, VH = 720, DPR = 1, BASE = 1;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    VW = window.innerWidth; VH = window.innerHeight;
    cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
    BASE = Math.min(VW / 1280, VH / 720);
  }
  window.addEventListener('resize', resize); resize();

  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  function limb(c, x1, y1, x2, y2, w, col) {
    c.lineCap = 'round';
    c.strokeStyle = OUT; c.lineWidth = w + 5;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = col; c.lineWidth = w;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function fillOut(c, col, lw) { c.fillStyle = col; c.fill(); c.lineWidth = lw || 3; c.strokeStyle = OUT; c.stroke(); }
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }

  // ------------------------------------------------------------ som
  const Sfx = {
    ac: null, on: store.get('sound', true), master: null, nbuf: null,
    init() {
      if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
      try {
        this.ac = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ac.createGain(); this.master.gain.value = 0.45; this.master.connect(this.ac.destination);
        const len = this.ac.sampleRate; this.nbuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
        const d = this.nbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { this.ac = null; }
    },
    tone(f, dur, type, vol, f2) {
      if (!this.ac || !this.on) return;
      const t = this.ac.currentTime, o = this.ac.createOscillator(), gn = this.ac.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      gn.gain.setValueAtTime(vol || 0.1, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(gn); gn.connect(this.master); o.start(t); o.stop(t + dur + 0.03);
    },
    noise(dur, vol, freq, type) {
      if (!this.ac || !this.on) return;
      const t = this.ac.currentTime, src = this.ac.createBufferSource(), f = this.ac.createBiquadFilter(), gn = this.ac.createGain();
      src.buffer = this.nbuf; f.type = type || 'bandpass'; f.frequency.value = freq || 1000;
      gn.gain.setValueAtTime(vol || 0.2, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(gn); gn.connect(this.master); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.03);
    },
    hit(d) { const k = Math.min(1, d / 20); this.noise(0.1 + k * 0.18, 0.25 + k * 0.35, 1100 - k * 600, 'lowpass'); this.tone(200 - k * 90, 0.1 + k * 0.15, 'triangle', 0.35, 45); },
    swing() { this.noise(0.08, 0.06, 2600, 'highpass'); },
    jump() { this.tone(300, 0.08, 'square', 0.04, 520); },
    land() { this.noise(0.06, 0.07, 380, 'lowpass'); },
    dodge() { this.noise(0.14, 0.06, 3600, 'bandpass'); },
    ko() { this.noise(0.9, 0.55, 260, 'lowpass'); this.tone(95, 0.8, 'sawtooth', 0.22, 28); this.tone(1100, 0.45, 'square', 0.05, 180); },
    beep(hi) { this.tone(hi ? 880 : 520, hi ? 0.4 : 0.15, 'square', 0.07); },
    ui() { this.tone(640, 0.05, 'square', 0.035, 900); },
    pickup() { this.tone(520, 0.07, 'square', 0.05, 780); setTimeout(() => this.tone(1040, 0.12, 'triangle', 0.06), 60); this.noise(0.12, 0.05, 4200, 'highpass'); },
  };
  function updMute() { $('btn-mute').textContent = Sfx.on ? '🔊' : '🔇'; }
  $('btn-mute').onclick = () => { Sfx.init(); Sfx.on = !Sfx.on; store.set('sound', Sfx.on); updMute(); };
  updMute();
  window.addEventListener('pointerdown', () => Sfx.init(), { once: false, passive: true });

  // ------------------------------------------------------------ controles
  const keys = new Set();
  const SCH = {
    a: { 0: ['Space'], 1: ['KeyJ'], 2: ['KeyK'], 3: ['KeyL', 'ShiftLeft'], 4: ['KeyI', 'KeyH'], L: ['KeyA'], R: ['KeyD'], U: ['KeyW'], D: ['KeyS'] },
    b: { 0: ['Enter', 'Numpad0', 'NumpadEnter'], 1: ['Comma', 'Numpad1'], 2: ['Period', 'Numpad2'], 3: ['Slash', 'IntlRo', 'Numpad3'], 4: ['Quote', 'Numpad4'], L: ['ArrowLeft'], R: ['ArrowRight'], U: ['ArrowUp'], D: ['ArrowDown'] },
  };
  const GAME_CODES = new Set([].concat(...Object.values(SCH).map(m => [].concat(m[0], m[1], m[2], m[3], m[4], m.L, m.R, m.U, m.D))));
  const ACT_BITS = [B.J, B.LT, B.HV, B.DG, B.PU];
  const NB = ACT_BITS.length;
  const Touch = { h: 0, held: [0, 0, 0, 0, 0] };

  class Pad {
    constructor(schemes, gps, touch) { this.sch = schemes; this.gps = gps; this.touch = touch; this.c = [0, 0, 0, 0, 0]; this.gpPrev = {}; }
    onKey(code) { for (const s of this.sch) for (let i = 0; i < NB; i++) if (SCH[s][i].indexOf(code) >= 0) this.c[i]++; }
    read() {
      let h = 0;
      for (const s of this.sch) {
        const m = SCH[s];
        if (m.L.some(k => keys.has(k))) h |= B.L;
        if (m.R.some(k => keys.has(k))) h |= B.R;
        if (m.U.some(k => keys.has(k))) h |= B.U;
        if (m.D.some(k => keys.has(k))) h |= B.D;
        for (let i = 0; i < NB; i++) if (m[i].some(k => keys.has(k))) h |= ACT_BITS[i];
      }
      const gl = navigator.getGamepads ? navigator.getGamepads() : [];
      for (let gi = 0; gi < gl.length; gi++) {
        const gp = gl[gi];
        if (!gp || (this.gps !== 'all' && this.gps.indexOf(gi) < 0)) continue;
        const bt = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
        const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        if (ax < -0.45 || bt(14)) h |= B.L;
        if (ax > 0.45 || bt(15)) h |= B.R;
        if (ay < -0.5 || bt(12)) h |= B.U;
        if (ay > 0.5 || bt(13)) h |= B.D;
        const acts = [bt(0), bt(2), bt(1), bt(4) || bt(5) || bt(6) || bt(7), bt(3)];
        const prev = this.gpPrev[gi] || [false, false, false, false, false];
        for (let i = 0; i < NB; i++) { if (acts[i]) h |= ACT_BITS[i]; if (acts[i] && !prev[i]) this.c[i]++; }
        this.gpPrev[gi] = acts;
      }
      if (this.touch) { h |= Touch.h; for (let i = 0; i < NB; i++) if (Touch.held[i]) h |= ACT_BITS[i]; }
      return { h, c: this.c.slice() };
    }
  }

  window.addEventListener('keydown', e => {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (App.inGame && GAME_CODES.has(e.code)) e.preventDefault();
    if (e.code === 'Escape' && App.inGame) { togglePause(); return; }
    if (e.code === 'F2') { e.preventDefault(); DEBUG.on = !DEBUG.on; toast(DEBUG.on ? 'Colisões visíveis (F2 esconde)' : 'Colisões ocultas'); return; }
    if (e.repeat) return;
    keys.add(e.code);
    if (App.inGame && !App.paused) for (const p of App.pads) if (p) p.onKey(e.code);
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  // controles de toque
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0 && window.matchMedia && matchMedia('(pointer: coarse)').matches);
  (function setupTouch() {
    const stick = $('stick'), knob = stick.querySelector('i');
    let sid = null;
    const upd = e => {
      const r = stick.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const l = Math.hypot(dx, dy), m = r.width / 2;
      const k = l > m ? m / l : 1;
      knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
      let h = 0; const dz = m * 0.35;
      if (dx < -dz) h |= B.L; if (dx > dz) h |= B.R; if (dy < -dz) h |= B.U; if (dy > dz) h |= B.D;
      Touch.h = h;
    };
    stick.addEventListener('pointerdown', e => { sid = e.pointerId; stick.setPointerCapture(sid); upd(e); e.preventDefault(); });
    stick.addEventListener('pointermove', e => { if (e.pointerId === sid) upd(e); });
    const end = e => { if (e.pointerId === sid) { sid = null; Touch.h = 0; knob.style.transform = ''; } };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
    document.querySelectorAll('#tbtns button').forEach(b => {
      const i = +b.dataset.b;
      b.addEventListener('pointerdown', e => { e.preventDefault(); Touch.held[i] = 1; b.classList.add('on'); if (App.pads[0]) App.pads[0].c[i]++; });
      const up = () => { Touch.held[i] = 0; b.classList.remove('on'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    });
  })();

  // ------------------------------------------------------------ visual dos lutadores
  const LOOK = {
    brasa: { skin: '#d99a6a', top: '#2b2233', top2: '#c62f2c', leg: '#2a2030', shoe: '#b3262a', arm: '#d99a6a', hand: '#c8302a', hair: '#2a1a16', hair2: '#d2541e' },
    tora: { skin: '#c88a58', top: '#2f6e3c', top2: '#1d4a28', leg: '#5a3e2a', shoe: '#2a1a12', arm: '#c88a58', hand: '#5a3a22', hair: '#3a2418', fur: '#ece0c4' },
    lume: { skin: '#f3d8c6', top: '#cdd8ee', top2: '#2c3a9c', leg: '#1f2352', shoe: '#c4d0ea', arm: '#f3d8c6', hand: '#c4d0ea', hair: '#f4e0a0', hair2: '#cfa860' },
    mare: { skin: '#b9784c', top: '#1d3a7a', top2: '#4a8ad8', leg: '#1a2550', shoe: '#2a2230', arm: '#b9784c', hand: '#2a2230', hair: '#2a1a14', gold: '#f2c24a' },
  };
  const IDLE_ANG = { fists: 15, axe: 8, spear: -12, sword: 25, unarmed: 15 };
  const easeO = u => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - (1 - u) * (1 - u));

  function weaponPose(key, mvIdx, mf, charge, t, armed) {
    const wpn = armed === false ? 'unarmed' : CH[key].weapon, idle = IDLE_ANG[wpn];
    const r = { ang: idle + Math.sin(t * 0.06) * 3, ext: 0, trail: null, kick: null, kickU: 0, active: false, chg: 0, spin: false };
    if (mvIdx == null || mvIdx < 0) return r;
    const m = S.MOVES[wpn][S.MOVE_KEYS[mvIdx]];
    if (!m) return r;
    r.key = S.MOVE_KEYS[mvIdx];
    r.spin = m.v === 'spin';
    if (mf < m.s) { r.phase = 'wind'; r.u = mf / m.s; } else if (mf < m.s + m.a) { r.phase = 'act'; r.u = m.untilLand ? 0.5 : (mf - m.s + 1) / m.a; } else { r.phase = 'rec'; r.u = clamp((mf - m.s - m.a) / m.r, 0, 1); }
    if (mf < m.s) {
      const u = easeO(mf / m.s);
      if (m.v === 'spin') r.ang = idle - 40 * u;
      else if (m.v === 'kick') { r.kick = m.arc[0]; r.kickU = u * 0.35; r.ang = idle - 25 * u; }
      else {
        const a0 = m.arc[0], a1 = m.arc[1];
        const wind = m.v === 'thrust' ? a0 : a0 - (a1 - a0) * 0.25;
        r.ang = idle + (wind - idle) * u;
        if (m.v === 'thrust') r.ext = -0.35 * u;
      }
      if (m.charge && mf >= m.s - 1 && charge > 0) r.chg = charge / 45;
    } else if (mf < m.s + m.a) {
      r.active = true;
      const u = m.untilLand ? 1 : (mf - m.s + 1) / m.a;
      if (m.v === 'spin') { r.ang = idle - 40 + 360 * easeO(u); r.spin = true; r.trail = [idle - 40, r.ang]; }
      else if (m.v === 'kick') { r.kick = m.arc[0]; r.kickU = 1; }
      else {
        const a0 = m.arc[0], a1 = m.arc[1];
        r.ang = a0 + (a1 - a0) * easeO(u);
        r.ext = m.v === 'thrust' ? 1 : 0.3;
        if (a0 !== a1) r.trail = [a0, r.ang]; else r.thrust = true;
      }
    } else {
      const u = easeO((mf - m.s - m.a) / m.r);
      if (m.v === 'spin') r.ang = lerp(idle + 320, idle + 360, u);
      else if (m.v === 'kick') { r.kick = m.arc[0]; r.kickU = 1 - u; }
      else { r.ang = lerp(m.arc[1], idle, u); if (m.v === 'thrust') r.ext = 1 - u; }
    }
    return r;
  }

  function eyes(c, cx, cy, r, mode, glow) {
    if (mode === 'hurt') {
      c.strokeStyle = OUT; c.lineWidth = 2.5; c.lineCap = 'round';
      for (const ex of [cx + r * 0.2, cx + r * 0.62]) {
        c.beginPath(); c.moveTo(ex - r * 0.12, cy - r * 0.18); c.lineTo(ex + r * 0.12, cy + r * 0.06);
        c.moveTo(ex + r * 0.12, cy - r * 0.18); c.lineTo(ex - r * 0.12, cy + r * 0.06); c.stroke();
      }
      return;
    }
    for (const ex of [cx + r * 0.2, cx + r * 0.62]) {
      c.beginPath(); c.ellipse(ex, cy - r * 0.05, r * 0.11, r * 0.19, 0, 0, Math.PI * 2);
      c.fillStyle = glow || OUT; c.fill();
      if (glow) { c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); }
      else { c.beginPath(); c.arc(ex + r * 0.03, cy - r * 0.12, r * 0.045, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); }
    }
    if (mode === 'angry') {
      c.strokeStyle = OUT; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx + r * 0.05, cy - r * 0.38); c.lineTo(cx + r * 0.35, cy - r * 0.28);
      c.moveTo(cx + r * 0.5, cy - r * 0.28); c.lineTo(cx + r * 0.8, cy - r * 0.38); c.stroke();
    }
  }

  function flameTongue(c, x, y, s, t, ph) {
    const f = Math.sin(t * 0.5 + ph) * 0.25;
    c.beginPath(); c.moveTo(x - s * 0.5, y);
    c.quadraticCurveTo(x - s * 0.6, y - s * 0.9, x + s * f, y - s * (1.6 + f));
    c.quadraticCurveTo(x + s * 0.6, y - s * 0.9, x + s * 0.5, y); c.closePath();
  }

  function drawWeapon(c, key, C, L, pose, hx, hy, dx, dy, t) {
    const H = C.h, nx = -dy, ny = dx;
    const wp = C.weapon;
    if (wp === 'fists') {
      const r = H * 0.092;
      // chamas ao redor da manopla (maiores durante o golpe)
      const fs = r * (pose.active ? 1.5 : 0.9);
      c.save(); c.globalAlpha *= pose.active ? 0.95 : 0.75;
      for (let i = 0; i < 3; i++) { flameTongue(c, hx - r * 0.5 + i * r * 0.5, hy - r * 0.2, fs * (i === 1 ? 1.2 : 0.85), t, i * 2); c.fillStyle = i === 1 ? '#ffd23f' : '#ff7a1f'; c.fill(); }
      c.restore();
      if (pose.active) { c.save(); c.globalAlpha *= 0.6; circle(c, hx, hy, r * 1.7); c.fillStyle = 'rgba(255,120,30,.45)'; c.fill(); c.restore(); }
      circle(c, hx, hy, r); fillOut(c, L.hand);
      c.beginPath(); c.arc(hx, hy, r * 0.6, -Math.PI * 0.2, Math.PI * 0.8); c.strokeStyle = '#ff9a5a'; c.lineWidth = 2.5; c.stroke();
      c.beginPath(); c.arc(hx - dx * r * 0.9, hy - dy * r * 0.9, r * 0.55, 0, Math.PI * 2); c.fillStyle = '#f2c24a'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    } else if (wp === 'axe') {
      limb(c, hx - dx * H * 0.14, hy - dy * H * 0.14, hx + dx * H * 0.52, hy + dy * H * 0.52, H * 0.055, '#4a2e1c');
      for (let k = 0; k < 4; k++) { const u = -0.08 + k * 0.06; c.strokeStyle = '#8a6a44'; c.lineWidth = 2; c.beginPath(); c.moveTo(hx + dx * H * u - nx * H * 0.03, hy + dy * H * u - ny * H * 0.03); c.lineTo(hx + dx * H * (u + 0.03) + nx * H * 0.03, hy + dy * H * (u + 0.03) + ny * H * 0.03); c.stroke(); }
      const tx = hx + dx * H * 0.48, ty = hy + dy * H * 0.48;
      c.beginPath();
      c.moveTo(tx + dx * H * 0.08, ty + dy * H * 0.08);
      c.lineTo(tx + nx * H * 0.24 + dx * H * 0.18, ty + ny * H * 0.24 + dy * H * 0.18);
      c.quadraticCurveTo(tx + nx * H * 0.36, ty + ny * H * 0.36, tx + nx * H * 0.24 - dx * H * 0.18, ty + ny * H * 0.24 - dy * H * 0.18);
      c.lineTo(tx - dx * H * 0.08, ty - dy * H * 0.08);
      c.lineTo(tx - nx * H * 0.1, ty - ny * H * 0.1);
      c.closePath(); fillOut(c, '#a2a7ae');
      c.beginPath(); c.moveTo(tx + nx * H * 0.06, ty + ny * H * 0.06); c.lineTo(tx + nx * H * 0.18 + dx * H * 0.06, ty + ny * H * 0.18 + dy * H * 0.06); c.lineTo(tx + nx * H * 0.12 - dx * H * 0.05, ty + ny * H * 0.12 - dy * H * 0.05);
      c.strokeStyle = '#6a6e76'; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.moveTo(tx + nx * H * 0.25 + dx * H * 0.15, ty + ny * H * 0.25 + dy * H * 0.15);
      c.quadraticCurveTo(tx + nx * H * 0.32, ty + ny * H * 0.32, tx + nx * H * 0.25 - dx * H * 0.15, ty + ny * H * 0.25 - dy * H * 0.15);
      c.strokeStyle = '#eef2f6'; c.lineWidth = 3; c.stroke();
    } else if (wp === 'spear') {
      limb(c, hx - dx * H * 0.42, hy - dy * H * 0.42, hx + dx * H * 0.74, hy + dy * H * 0.74, H * 0.035, '#e8ecf8');
      limb(c, hx - dx * H * 0.06, hy - dy * H * 0.06, hx + dx * H * 0.06, hy + dy * H * 0.06, H * 0.045, '#f2c24a');
      const bx = hx + dx * H * 0.72, by = hy + dy * H * 0.72;
      c.save(); c.shadowColor = '#a88cff'; c.shadowBlur = pose.active ? 24 : 12;
      c.beginPath(); c.moveTo(bx + dx * H * 0.26, by + dy * H * 0.26);
      c.lineTo(bx + nx * H * 0.06, by + ny * H * 0.06); c.lineTo(bx - dx * H * 0.03, by - dy * H * 0.03); c.lineTo(bx - nx * H * 0.06, by - ny * H * 0.06);
      c.closePath(); fillOut(c, '#d8e4ff', 2.5);
      c.beginPath(); c.moveTo(bx + dx * H * 0.2, by + dy * H * 0.2); c.lineTo(bx + dx * H * 0.02, by + dy * H * 0.02); c.strokeStyle = '#8f7aff'; c.lineWidth = 2; c.stroke();
      c.restore();
      c.beginPath(); c.moveTo(bx - dx * H * 0.02, by - dy * H * 0.02);
      c.quadraticCurveTo(bx - dx * H * 0.1 - nx * H * 0.08 + Math.sin(t * 0.3) * 4, by - dy * H * 0.1 - ny * H * 0.08, bx - dx * H * 0.22 - nx * H * 0.03, by - dy * H * 0.22 - ny * H * 0.03 + Math.cos(t * 0.25) * 4);
      c.strokeStyle = '#8f7aff'; c.lineWidth = 4; c.lineCap = 'round'; c.stroke();
    } else {
      limb(c, hx - dx * H * 0.08, hy - dy * H * 0.08, hx, hy, H * 0.045, '#2a1a12');
      const L2 = H * 0.6, tipx = hx + dx * L2 + nx * H * 0.06, tipy = hy + dy * L2 + ny * H * 0.06;
      c.beginPath();
      c.moveTo(hx + nx * H * 0.03, hy + ny * H * 0.03);
      c.quadraticCurveTo(hx + dx * L2 * 0.65 + nx * H * 0.14, hy + dy * L2 * 0.65 + ny * H * 0.14, tipx, tipy);
      c.quadraticCurveTo(hx + dx * L2 * 0.55 + nx * H * 0.02, hy + dy * L2 * 0.55 + ny * H * 0.02, hx - nx * H * 0.03, hy - ny * H * 0.03);
      c.closePath(); fillOut(c, '#e6edf5', 2.5);
      c.beginPath(); c.moveTo(hx + nx * H * 0.02 + dx * H * 0.05, hy + ny * H * 0.02 + dy * H * 0.05); c.quadraticCurveTo(hx + dx * L2 * 0.6 + nx * H * 0.1, hy + dy * L2 * 0.6 + ny * H * 0.1, tipx, tipy);
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.stroke();
      c.beginPath(); c.moveTo(hx + nx * H * 0.09, hy + ny * H * 0.09); c.quadraticCurveTo(hx + dx * H * 0.03, hy + dy * H * 0.03, hx - nx * H * 0.09, hy - ny * H * 0.09);
      c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 9; c.stroke(); c.strokeStyle = '#f2c24a'; c.lineWidth = 5; c.stroke();
    }
  }
  const TIP = { fists: 0.32, axe: 0.86, spear: 1.15, sword: 0.84, unarmed: 0.3 };

  // ================================================================ LUTADORES (esqueleto articulado + sombreado em células)
  // Coordenadas locais: pés em y=0, para cima é negativo, olhando para +x. H = altura do personagem.
  const LIGHT = [0.55, -0.83];
  const BUILD = {
    brasa: { sw: 0.18, ww: 0.12, limb: 1.05, head: 0.165, eye: '#b8501c' },
    tora: { sw: 0.24, ww: 0.17, limb: 1.3, head: 0.145, eye: '#5a3418' },
    lume: { sw: 0.16, ww: 0.105, limb: 0.92, head: 0.165, eye: '#2f7ad8' },
    mare: { sw: 0.17, ww: 0.115, limb: 1.0, head: 0.165, eye: '#a8381e' },
  };
  function ik(ax, ay, tx, ty, l1, l2, bend) {
    let dx = tx - ax, dy = ty - ay, d = Math.hypot(dx, dy);
    const max = l1 + l2 - 0.01;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    if (d < 0.01) { d = 0.01; dy = 0.01; }
    const a = Math.atan2(dy, dx);
    const A = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const ja = a + bend * A;
    return { jx: ax + Math.cos(ja) * l1, jy: ay + Math.sin(ja) * l1, ex: ax + dx, ey: ay + dy };
  }
  // segmento afunilado com pontas redondas, sombra do lado oposto à luz, brilho de borda e contorno
  function seg(c, x1, y1, x2, y2, w1, w2, col, sh) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const an = Math.atan2(ny, nx);
    const path = () => {
      c.beginPath();
      c.moveTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); c.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2);
      c.arc(x2, y2, w2 / 2, an, an - Math.PI, true);
      c.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2);
      c.arc(x1, y1, w1 / 2, an + Math.PI, an, true);
      c.closePath();
    };
    path(); c.fillStyle = col; c.fill();
    const lit = nx * LIGHT[0] + ny * LIGHT[1] > 0 ? 1 : -1;
    c.save(); path(); c.clip();
    c.beginPath();
    c.moveTo(x1 - lit * nx * w1 * 0.08, y1 - lit * ny * w1 * 0.08); c.lineTo(x2 - lit * nx * w2 * 0.08, y2 - lit * ny * w2 * 0.08);
    c.lineTo(x2 - lit * nx * w2 * 2, y2 - lit * ny * w2 * 2); c.lineTo(x1 - lit * nx * w1 * 2, y1 - lit * ny * w1 * 2); c.closePath();
    c.fillStyle = sh || shade(col, -0.28); c.fill();
    c.beginPath(); c.moveTo(x1 + lit * nx * w1 * 0.3, y1 + lit * ny * w1 * 0.3); c.lineTo(x2 + lit * nx * w2 * 0.3, y2 + lit * ny * w2 * 0.3);
    c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = Math.max(1.2, w2 * 0.16); c.lineCap = 'round'; c.stroke();
    c.restore();
    path(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.lineJoin = 'round'; c.stroke();
  }
  // preenche um caminho com sombra de um lado (gradiente duro) e contorno
  function shapeFill(c, pathFn, col, opt) {
    opt = opt || {};
    pathFn(); c.fillStyle = col; c.fill();
    c.save(); pathFn(); c.clip();
    if (opt.shadeX != null) { c.fillStyle = opt.sh || shade(col, -0.3); c.fillRect(opt.shadeX - 400, -400, 400, 800); }
    if (opt.shadeY != null) { c.fillStyle = opt.sh2 || shade(col, -0.22); c.fillRect(-400, opt.shadeY, 800, 400); }
    if (opt.hi) { c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(opt.hi[0], opt.hi[1], opt.hi[2], opt.hi[3]); }
    if (opt.extra) opt.extra();
    c.restore();
    pathFn(); c.lineWidth = opt.lw || 2.6; c.strokeStyle = OUT; c.lineJoin = 'round'; c.stroke();
  }

  // forma macia feita de círculos unidos (pele, nuvenzinhas): contorno só por fora
  function blob(c, circles, col, sh) {
    c.beginPath(); for (const [x, y, rr2] of circles) { c.moveTo(x + rr2, y); c.arc(x, y, rr2, 0, TAU); }
    c.lineWidth = 5; c.strokeStyle = OUT; c.lineJoin = 'round'; c.stroke();
    c.fillStyle = col; c.fill();
    if (sh) { c.save(); c.clip(); c.fillStyle = sh; for (const [x, y, rr2] of circles) { c.beginPath(); c.arc(x - rr2 * 0.25, y + rr2 * 0.55, rr2 * 0.8, 0, TAU); c.fill(); } c.restore(); }
  }
  const LOOK2 = {
    brasa: { skin: '#e3a476', hair: '#2a1a18', hair2: '#d0482a', top: '#2c2436', top2: '#c62f2c', pants: '#2a2234', boot: '#b8262c', hand: '#c8302a', fore: '#c8302a', cuff: '#f2c24a' },
    tora: { skin: '#c8875a', hair: '#3a2418', hair2: '#6a4430', top: '#2f7040', top2: '#1d4a28', pants: '#5c3e2a', boot: '#3a2a1e', hand: '#c8875a', fore: '#6a4428', cuff: '#4a2e1c', fur: '#ece0c4' },
    lume: { skin: '#f5dac8', hair: '#f6e2a4', hair2: '#c9a45c', top: '#2c3c9e', top2: '#d8e0f2', pants: '#22297a', boot: '#ccd6ee', hand: '#ccd6ee', fore: '#ccd6ee', cuff: '#f2c24a', fur: '#f4ecd8' },
    mare: { skin: '#b97a4e', hair: '#2a1a14', hair2: '#4a3024', top: '#1f3d80', top2: '#4a8ad8', pants: '#1c2858', boot: '#2a2232', hand: '#2a2232', fore: '#b97a4e', cuff: '#f2c24a', gold: '#f2c24a' },
  };

  function drawEyes(c, k, hx, hy, r, mode, B) {
    const eye = (ex, ey, w, h, front) => {
      if (mode === 'hurt') {
        c.strokeStyle = OUT; c.lineWidth = 2.4; c.lineCap = 'round';
        c.beginPath(); c.moveTo(ex - w, ey - h * 0.5); c.lineTo(ex + w * 0.6, ey); c.lineTo(ex - w, ey + h * 0.4); c.stroke();
        return;
      }
      c.beginPath(); c.ellipse(ex, ey, w, h, 0, 0, TAU); c.fillStyle = '#ffffff'; c.fill();
      c.save(); c.beginPath(); c.ellipse(ex, ey, w, h, 0, 0, TAU); c.clip();
      const ix = ex + w * 0.3;
      c.beginPath(); c.ellipse(ix, ey + h * 0.08, w * 0.58, h * 0.68, 0, 0, TAU); c.fillStyle = B.eye; c.fill();
      c.beginPath(); c.ellipse(ix, ey + h * 0.38, w * 0.48, h * 0.32, 0, 0, TAU); c.fillStyle = shade(B.eye, 0.4); c.fill();
      c.beginPath(); c.ellipse(ix + w * 0.06, ey + h * 0.05, w * 0.26, h * 0.34, 0, 0, TAU); c.fillStyle = '#120a14'; c.fill();
      c.beginPath(); c.arc(ix - w * 0.16, ey - h * 0.25, w * 0.22, 0, TAU); c.fillStyle = '#ffffff'; c.fill();
      c.restore();
      // pálpebra superior grossa
      c.beginPath(); c.ellipse(ex, ey, w * 1.05, h * 1.0, 0, Math.PI * 1.05, Math.PI * 1.95);
      c.strokeStyle = OUT; c.lineWidth = front ? 3 : 2.4; c.lineCap = 'round'; c.stroke();
    };
    const ey = hy + r * 0.16;
    eye(hx + r * 0.1, ey, r * 0.14, r * 0.25, false);
    eye(hx + r * 0.55, ey, r * 0.19, r * 0.28, true);
    // sobrancelhas
    if (mode !== 'normal' || k === 'tora') {
      const ang = mode === 'angry' ? 0.35 : mode === 'hurt' ? -0.3 : 0.12;
      c.strokeStyle = k === 'lume' ? '#b8904a' : OUT; c.lineWidth = k === 'tora' ? r * 0.16 : r * 0.09; c.lineCap = 'round';
      for (const [bx, w] of [[hx + r * 0.08, r * 0.15], [hx + r * 0.55, r * 0.21]]) {
        c.beginPath(); c.moveTo(bx - w, ey - r * 0.4 - Math.sin(ang) * w * 0.6); c.lineTo(bx + w, ey - r * 0.37 + Math.sin(ang) * w * 0.6); c.stroke();
      }
    }
  }
  function drawMouth(c, hx, hy, r, mode) {
    const mx = hx + r * 0.55, my = hy + r * 0.62;
    c.strokeStyle = OUT; c.lineWidth = 2; c.lineCap = 'round';
    if (mode === 'angry') {
      c.beginPath(); c.moveTo(mx - r * 0.14, my - r * 0.02); c.lineTo(mx + r * 0.14, my - r * 0.06); c.lineTo(mx + r * 0.1, my + r * 0.1); c.lineTo(mx - r * 0.1, my + r * 0.1); c.closePath();
      c.fillStyle = '#5a1a22'; c.fill(); c.stroke();
      c.fillStyle = '#ffffff'; c.fillRect(mx - r * 0.1, my - r * 0.03, r * 0.2, r * 0.05);
    } else if (mode === 'hurt') {
      c.beginPath(); c.ellipse(mx, my + r * 0.03, r * 0.08, r * 0.1, 0, 0, TAU); c.fillStyle = '#5a1a22'; c.fill(); c.stroke();
    } else {
      c.beginPath(); c.moveTo(mx - r * 0.12, my); c.quadraticCurveTo(mx, my + r * 0.05, mx + r * 0.12, my - r * 0.03); c.stroke();
    }
  }
  // cabeça base (crânio + mandíbula voltada para a frente), sombra atrás, orelha
  function drawHeadBase(c, hx, hy, r, skin, bald) {
    const p = () => {
      c.beginPath(); c.arc(hx, hy, r, 0, TAU);
      c.moveTo(hx + r * 0.95, hy + r * 0.25); c.ellipse(hx + r * 0.18, hy + r * 0.3, r * 0.8, r * 0.7, 0, 0, TAU);
    };
    p(); c.fillStyle = skin; c.fill();
    c.save(); p(); c.clip();
    c.beginPath(); c.arc(hx + r * 0.38, hy - r * 0.05, r * 1.02, 0, TAU); c.rect(hx - r * 3, hy - r * 3, r * 6, r * 6);
    c.fillStyle = shade(skin, -0.2); c.fill('evenodd');
    c.fillStyle = 'rgba(255,170,150,.35)'; c.beginPath(); c.ellipse(hx + r * 0.62, hy + r * 0.35, r * 0.16, r * 0.09, 0, 0, TAU); c.fill();
    if (bald) { c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(hx + r * 0.1, hy - r * 0.62, r * 0.36, r * 0.16, -0.25, 0, TAU); c.fill(); }
    c.restore();
    c.save(); c.globalCompositeOperation = 'destination-over'; p(); c.lineWidth = 5.2; c.strokeStyle = OUT; c.stroke(); c.restore();
    // nariz e orelha
    c.strokeStyle = shade(skin, -0.35); c.lineWidth = 1.8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(hx + r * 0.84, hy + r * 0.12); c.lineTo(hx + r * 0.9, hy + r * 0.3); c.lineTo(hx + r * 0.8, hy + r * 0.32); c.stroke();
    c.beginPath(); c.ellipse(hx - r * 0.2, hy + r * 0.12, r * 0.14, r * 0.2, 0.2, 0, TAU); c.fillStyle = shade(skin, -0.08); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
  }

  function hairShape(c, pts, col, col2) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.lineJoin = 'round'; c.stroke();
  }

  // partes que ficam atrás do corpo (cabelo comprido, fitas, capa)
  function drawBack(c, k, L, H, hx, hy, r, P, t) {
    const sway = Math.sin(t * 0.17) * 3 - (P.vx || 0) * 0.9 * (P.face || 1);
    const fall = (P.vy || 0) * 0.5;
    if (k === 'brasa') {
      for (const [oy, len] of [[-0.42, 1.1], [-0.2, 0.9]]) {
        const bx = hx - r * 0.85, by = hy + r * oy;
        const tx = bx - r * (1.2 + len) + sway, ty = by + r * 0.35 - fall + Math.sin(t * 0.3 + oy * 5) * 3;
        c.beginPath(); c.moveTo(bx, by - r * 0.13);
        c.quadraticCurveTo(bx - r * 1.1, by - r * 0.15 + sway * 0.3, tx, ty);
        c.lineTo(tx + r * 0.25, ty + r * 0.3);
        c.quadraticCurveTo(bx - r * 0.9, by + r * 0.2, bx, by + r * 0.13); c.closePath();
        c.fillStyle = L.top2; c.fill(); c.lineWidth = 2.4; c.strokeStyle = OUT; c.stroke();
      }
      // ponta do cachecol
      const sx0 = -H * 0.05, sy0 = -H * 0.68;
      c.beginPath(); c.moveTo(sx0, sy0 - H * 0.03);
      c.quadraticCurveTo(-H * 0.25, sy0 - H * 0.03 + sway * 0.3, -H * 0.42 + sway, sy0 + H * 0.06 - fall + Math.cos(t * 0.3) * 3);
      c.lineTo(-H * 0.36 + sway, sy0 + H * 0.13 - fall);
      c.quadraticCurveTo(-H * 0.2, sy0 + H * 0.05, sx0, sy0 + H * 0.04); c.closePath();
      shapeFill(c, () => { c.beginPath(); c.moveTo(sx0, sy0 - H * 0.03); c.quadraticCurveTo(-H * 0.25, sy0 - H * 0.03 + sway * 0.3, -H * 0.42 + sway, sy0 + H * 0.06 - fall + Math.cos(t * 0.3) * 3); c.lineTo(-H * 0.36 + sway, sy0 + H * 0.13 - fall); c.quadraticCurveTo(-H * 0.2, sy0 + H * 0.05, sx0, sy0 + H * 0.04); c.closePath(); }, L.top2, { shadeY: sy0 + H * 0.04 });
    } else if (k === 'lume' || k === 'mare') {
      const long = k === 'lume' ? 0.42 : 0.4;
      const p = () => {
        c.beginPath(); c.moveTo(hx + r * 0.1, hy - r * 1.02);
        c.quadraticCurveTo(hx - r * 1.5, hy - r * 1.0, hx - r * 1.35 + sway * 0.5, hy + r * 0.6);
        c.quadraticCurveTo(-H * 0.3 + sway, -H * long - fall * 0.5, -H * 0.24 + sway * 1.3, -H * (long - 0.1) - fall);
        c.lineTo(-H * 0.18 + sway, -H * (long - 0.02) - fall);
        c.lineTo(-H * 0.12 + sway * 0.8, -H * (long - 0.06) - fall * 0.7);
        c.quadraticCurveTo(-H * 0.06, -H * 0.62, hx - r * 0.2, hy + r * 0.7); c.closePath();
      };
      shapeFill(c, p, L.hair, { shadeX: hx - r * 0.9, sh: shade(L.hair, -0.25), extra: () => {
        c.strokeStyle = L.hair2; c.lineWidth = 2; c.lineCap = 'round';
        for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(hx - r * (0.6 + i * 0.25), hy - r * 0.6); c.quadraticCurveTo(hx - r * (1.3 + i * 0.2) + sway * 0.5, hy + r * 0.8, -H * (0.18 + i * 0.03) + sway, -H * (long - 0.04) - fall); c.stroke(); }
      } });
      if (k === 'mare') {
        const sx0 = -H * 0.04, sy0 = -H * 0.66;
        shapeFill(c, () => { c.beginPath(); c.moveTo(sx0, sy0 - H * 0.03); c.quadraticCurveTo(-H * 0.22, sy0 + sway * 0.3, -H * 0.34 + sway, sy0 + H * 0.12 - fall); c.lineTo(-H * 0.25 + sway, sy0 + H * 0.15 - fall); c.quadraticCurveTo(-H * 0.14, sy0 + H * 0.06, sx0, sy0 + H * 0.04); c.closePath(); }, L.top2, { shadeY: sy0 + H * 0.05 });
      }
    } else if (k === 'tora') {
      blob(c, [[-H * 0.22, -H * 0.62, H * 0.055], [-H * 0.15, -H * 0.65, H * 0.06], [-H * 0.08, -H * 0.66, H * 0.05]], shade(L.fur, -0.15), 'rgba(140,120,80,.4)');
    }
  }

  function drawHead(c, k, L, B, hx, hy, r, mode, P, t) {
    if (k === 'brasa') {
      // espetos de trás
      const spikes = [[-2.9, 1.5], [-2.55, 1.75], [-2.2, 1.8], [-1.85, 1.7], [-1.5, 1.55], [-1.15, 1.35]];
      for (const [a, len] of spikes) {
        const fl = Math.sin(t * 0.2 + a * 3) * 0.04, tip = a - 0.5 + fl;
        hairShape(c, [[hx + Math.cos(a - 0.25) * r * 0.8, hy + Math.sin(a - 0.25) * r * 0.8], [hx + Math.cos(tip) * r * len, hy + Math.sin(tip) * r * len], [hx + Math.cos(a + 0.25) * r * 0.8, hy + Math.sin(a + 0.25) * r * 0.8]], L.hair);
        c.strokeStyle = L.hair2; c.lineWidth = 1.8; c.beginPath(); c.moveTo(hx + Math.cos(a) * r * 0.9, hy + Math.sin(a) * r * 0.9); c.lineTo(hx + Math.cos(tip) * r * len * 0.8, hy + Math.sin(tip) * r * len * 0.8); c.stroke();
      }
      drawHeadBase(c, hx, hy, r, L.skin);
      // franja espetada sobre a testa
      hairShape(c, [[hx - r * 0.95, hy + r * 0.1], [hx - r * 1.0, hy - r * 0.7], [hx - r * 0.3, hy - r * 1.1], [hx + r * 0.5, hy - r * 1.02], [hx + r * 1.05, hy - r * 0.55], [hx + r * 1.15, hy - r * 0.05], [hx + r * 0.8, hy - r * 0.38], [hx + r * 0.72, hy + r * 0.05], [hx + r * 0.45, hy - r * 0.4], [hx + r * 0.2, hy - r * 0.08], [hx + r * 0.0, hy - r * 0.45], [hx - r * 0.35, hy - r * 0.1], [hx - r * 0.45, hy + r * 0.25]], L.hair);
      c.strokeStyle = L.hair2; c.lineWidth = 1.6; c.beginPath(); c.moveTo(hx - r * 0.3, hy - r * 0.95); c.lineTo(hx + r * 0.6, hy - r * 0.75); c.stroke();
      drawEyes(c, k, hx, hy, r, mode, B); drawMouth(c, hx, hy, r, mode);
      // bandana
      const band = () => { c.beginPath(); c.moveTo(hx - r * 1.0, hy - r * 0.62); c.quadraticCurveTo(hx, hy - r * 0.95, hx + r * 1.02, hy - r * 0.62); c.lineTo(hx + r * 1.0, hy - r * 0.36); c.quadraticCurveTo(hx, hy - r * 0.66, hx - r * 1.0, hy - r * 0.32); c.closePath(); };
      shapeFill(c, band, L.top2, { shadeY: hy - r * 0.45 });
      shapeFill(c, () => { c.beginPath(); c.ellipse(hx - r * 0.98, hy - r * 0.46, r * 0.2, r * 0.17, 0, 0, TAU); }, shade(L.top2, -0.1));
    } else if (k === 'tora') {
      drawHeadBase(c, hx, hy, r, L.skin, true);
      drawEyes(c, k, hx, hy - r * 0.04, r, mode, B);
      // barba
      const beard = () => {
        c.beginPath(); c.moveTo(hx - r * 0.35, hy + r * 0.0);
        c.quadraticCurveTo(hx - r * 0.75, hy + r * 1.3, hx - r * 0.05, hy + r * 2.25);
        c.lineTo(hx + r * 0.3, hy + r * 1.85); c.lineTo(hx + r * 0.6, hy + r * 2.35); c.lineTo(hx + r * 0.85, hy + r * 1.9);
        c.quadraticCurveTo(hx + r * 1.45, hy + r * 1.2, hx + r * 1.1, hy + r * 0.3);
        c.quadraticCurveTo(hx + r * 0.85, hy + r * 0.6, hx + r * 0.6, hy + r * 0.5);
        c.quadraticCurveTo(hx + r * 0.2, hy + r * 0.62, hx - r * 0.35, hy + r * 0.0); c.closePath();
      };
      shapeFill(c, beard, L.hair, { shadeX: hx + r * 0.1, extra: () => {
        c.strokeStyle = L.hair2; c.lineWidth = 1.8; c.lineCap = 'round';
        for (const [x0, y0, x1, y1] of [[0.2, 0.9, 0.05, 1.9], [0.6, 0.95, 0.55, 2.0], [0.95, 0.7, 0.95, 1.5], [-0.1, 0.5, -0.3, 1.3]]) { c.beginPath(); c.moveTo(hx + r * x0, hy + r * y0); c.quadraticCurveTo(hx + r * (x0 + 0.1), hy + r * (y0 + y1) / 2, hx + r * x1, hy + r * y1); c.stroke(); }
      } });
      // bigode
      if (mode === 'angry') { c.fillStyle = '#5a1a22'; c.beginPath(); c.ellipse(hx + r * 0.62, hy + r * 0.82, r * 0.15, r * 0.08, 0, 0, TAU); c.fill(); }
      shapeFill(c, () => { c.beginPath(); c.moveTo(hx + r * 0.2, hy + r * 0.62); c.quadraticCurveTo(hx + r * 0.55, hy + r * 0.38, hx + r * 1.05, hy + r * 0.5); c.quadraticCurveTo(hx + r * 1.2, hy + r * 0.75, hx + r * 0.95, hy + r * 0.85); c.quadraticCurveTo(hx + r * 0.6, hy + r * 0.66, hx + r * 0.2, hy + r * 0.85); c.closePath(); }, shade(L.hair, 0.1));
    } else if (k === 'lume') {
      drawHeadBase(c, hx, hy, r, L.skin);
      // mechas da frente
      hairShape(c, [[hx + r * 0.95, hy - r * 0.3], [hx + r * 1.12, hy + r * 0.5], [hx + r * 0.95, hy + r * 1.0], [hx + r * 0.82, hy + r * 0.3]], L.hair);
      hairShape(c, [[hx - r * 0.55, hy - r * 0.3], [hx - r * 0.85, hy + r * 0.7], [hx - r * 0.7, hy + r * 1.25], [hx - r * 0.35, hy + r * 0.4]], L.hair);
      drawEyes(c, k, hx, hy, r, mode, B); drawMouth(c, hx, hy, r, mode);
      // elmo
      const helm = () => {
        c.beginPath(); c.moveTo(hx - r * 1.05, hy + r * 0.25);
        c.quadraticCurveTo(hx - r * 1.15, hy - r * 1.15, hx + r * 0.15, hy - r * 1.12);
        c.quadraticCurveTo(hx + r * 1.15, hy - r * 1.05, hx + r * 1.08, hy - r * 0.32);
        c.lineTo(hx + r * 0.62, hy - r * 0.22); c.lineTo(hx + r * 0.5, hy - r * 0.42); c.lineTo(hx + r * 0.2, hy - r * 0.3);
        c.lineTo(hx - r * 0.1, hy - r * 0.42); c.lineTo(hx - r * 0.45, hy - r * 0.05); c.lineTo(hx - r * 0.55, hy + r * 0.45); c.closePath();
      };
      shapeFill(c, helm, '#dfe6f6', { shadeX: hx - r * 0.35, sh: '#8e9cc6', hi: [hx - r * 0.2, hy - r * 1.1, r * 0.9, r * 0.22] });
      c.strokeStyle = '#f2c24a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(hx - r * 0.1, hy - r * 0.42); c.quadraticCurveTo(hx + r * 0.4, hy - r * 0.62, hx + r * 1.05, hy - r * 0.36); c.stroke();
      // asas
      const wing = (bx, by, s) => {
        const fe = [[-1.9, 2.3], [-1.6, 2.1], [-1.3, 1.8], [-1.0, 1.4]];
        for (let i = fe.length - 1; i >= 0; i--) {
          const [a, len] = fe[i];
          const tx = bx + Math.cos(a - 0.5) * r * len * s, ty = by + Math.sin(a - 0.5) * r * len * s;
          shapeFill(c, () => { c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + Math.cos(a - 0.2) * r * len * 0.6 * s, by + Math.sin(a - 0.2) * r * len * 0.6 * s, tx, ty); c.quadraticCurveTo(bx + Math.cos(a - 0.55) * r * len * 0.55 * s, by + Math.sin(a - 0.55) * r * len * 0.55 * s, bx - r * 0.05, by + r * 0.12); c.closePath(); }, i % 2 ? '#e8eefc' : '#ffffff', { lw: 2.2, shadeY: by - r * 0.1, sh2: '#b8c4e4' });
        }
      };
      wing(hx - r * 0.38, hy - r * 0.32, 1);
      shapeFill(c, () => { c.beginPath(); c.arc(hx - r * 0.38, hy - r * 0.25, r * 0.3, 0, TAU); }, '#c9d3ec', { shadeX: hx - r * 0.42, sh: '#8e9cc6' });
      shapeFill(c, () => { c.beginPath(); c.arc(hx - r * 0.38, hy - r * 0.25, r * 0.13, 0, TAU); }, '#f2c24a', { lw: 1.6 });
    } else {
      drawHeadBase(c, hx, hy, r, L.skin);
      // cabelo + franja
      hairShape(c, [[hx - r * 1.08, hy + r * 0.55], [hx - r * 1.15, hy - r * 0.6], [hx - r * 0.5, hy - r * 1.1], [hx + r * 0.45, hy - r * 1.08], [hx + r * 1.02, hy - r * 0.62], [hx + r * 1.1, hy - r * 0.05], [hx + r * 0.85, hy - r * 0.35], [hx + r * 0.7, hy + r * 0.05], [hx + r * 0.5, hy - r * 0.32], [hx + r * 0.25, hy - r * 0.05], [hx + r * 0.05, hy - r * 0.38], [hx - r * 0.3, hy - r * 0.15], [hx - r * 0.48, hy + r * 0.25], [hx - r * 0.65, hy + r * 0.7]], L.hair);
      c.strokeStyle = L.hair2; c.lineWidth = 1.6; c.beginPath(); c.moveTo(hx - r * 0.5, hy - r * 0.95); c.quadraticCurveTo(hx + r * 0.2, hy - r * 1.0, hx + r * 0.8, hy - r * 0.6); c.stroke();
      drawEyes(c, k, hx, hy, r, mode, B); drawMouth(c, hx, hy, r, mode);
      // tiara dourada
      shapeFill(c, () => { c.beginPath(); c.moveTo(hx - r * 1.02, hy - r * 0.5); c.quadraticCurveTo(hx, hy - r * 0.92, hx + r * 1.02, hy - r * 0.55); c.lineTo(hx + r * 1.0, hy - r * 0.38); c.quadraticCurveTo(hx, hy - r * 0.74, hx - r * 1.0, hy - r * 0.32); c.closePath(); }, L.gold, { shadeY: hy - r * 0.48, sh2: '#c08a2a' });
      // pluma vermelha
      const sw = Math.sin(t * 0.2) * 2 - (P.vx || 0) * 0.5 * (P.face || 1);
      shapeFill(c, () => { c.beginPath(); c.moveTo(hx - r * 0.45, hy - r * 0.95); c.quadraticCurveTo(hx - r * 0.3, hy - r * 2.0, hx - r * 1.05 + sw, hy - r * 2.55); c.quadraticCurveTo(hx - r * 0.95, hy - r * 1.7, hx - r * 0.78, hy - r * 0.9); c.closePath(); }, '#d8303a', { shadeX: hx - r * 0.62, sh: '#9a1e2a' });
      shapeFill(c, () => { c.beginPath(); c.arc(hx - r * 0.6, hy - r * 0.95, r * 0.18, 0, TAU); }, L.gold, { lw: 2 });
    }
  }

  function drawTorso(c, k, L, B, H, top, bot) {
    const sw = H * B.sw, ww = H * B.ww;
    const p = () => {
      c.beginPath(); c.moveTo(-sw, top + sw * 0.3);
      c.quadraticCurveTo(-sw, top, -sw * 0.55, top); c.lineTo(sw * 0.55, top); c.quadraticCurveTo(sw, top, sw, top + sw * 0.3);
      c.quadraticCurveTo(sw * 0.98, (top + bot) * 0.5, ww, bot); c.lineTo(-ww, bot);
      c.quadraticCurveTo(-sw * 0.98, (top + bot) * 0.5, -sw, top + sw * 0.3); c.closePath();
    };
    if (k === 'brasa') {
      shapeFill(c, p, L.top, { shadeX: -sw * 0.25, extra: () => {
        c.fillStyle = L.skin; c.beginPath(); c.moveTo(-sw * 0.3, top); c.lineTo(sw * 0.5, top); c.lineTo(sw * 0.1, top + H * 0.12); c.closePath(); c.fill();
        c.strokeStyle = L.top2; c.lineWidth = 2.5; c.beginPath(); c.moveTo(sw * 0.6, top + H * 0.02); c.lineTo(ww * 0.7, bot); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(sw * 0.2, top, sw, bot - top);
      } });
      // cachecol enrolado
      shapeFill(c, () => { c.beginPath(); c.moveTo(-sw * 1.05, top + H * 0.03); c.quadraticCurveTo(0, top - H * 0.07, sw * 1.05, top + H * 0.02); c.quadraticCurveTo(sw * 0.9, top + H * 0.1, sw * 0.2, top + H * 0.1); c.quadraticCurveTo(-sw * 0.6, top + H * 0.12, -sw * 1.05, top + H * 0.03); c.closePath(); }, L.top2, { shadeY: top + H * 0.05 });
      shapeFill(c, () => { c.beginPath(); c.moveTo(sw * 0.15, top + H * 0.08); c.quadraticCurveTo(sw * 0.55, top + H * 0.16, sw * 0.4, top + H * 0.24); c.lineTo(sw * 0.1, top + H * 0.2); c.closePath(); }, shade(L.top2, -0.08));
    } else if (k === 'tora') {
      shapeFill(c, p, L.top, { shadeX: -sw * 0.2, extra: () => {
        c.fillStyle = L.skin; c.beginPath(); c.moveTo(-sw * 0.1, top); c.lineTo(sw * 0.9, top); c.lineTo(sw * 0.9, top + H * 0.1); c.lineTo(sw * 0.25, top + H * 0.13); c.closePath(); c.fill();
        c.fillStyle = shade(L.top, -0.18); c.fillRect(-sw, bot - H * 0.08, sw * 2, H * 0.1);
      } });
      // colar de contas
      for (let i = 0; i <= 9; i++) {
        const u = i / 9, bx = lerp(-sw * 0.6, sw * 0.85, u), by = top + H * 0.03 + Math.sin(u * Math.PI) * H * 0.15;
        shapeFill(c, () => { c.beginPath(); c.arc(bx, by, H * 0.03, 0, TAU); }, '#7a4422', { lw: 1.8, shadeX: bx - H * 0.005, sh: '#4a2410' });
      }
      // manto de pele nos ombros
      const fc = []; for (let i = 0; i < 9; i++) { const u = i / 8; fc.push([lerp(-sw * 1.1, sw * 1.1, u), top + H * 0.01 - Math.sin(u * Math.PI) * H * 0.02 + (i % 2) * H * 0.012, H * (0.045 + (i % 3) * 0.008)]); }
      blob(c, fc, L.fur, 'rgba(160,140,100,.45)');
    } else if (k === 'lume') {
      shapeFill(c, p, L.top, { shadeX: -sw * 0.25 });
      // peitoral prateado
      const plate = () => { c.beginPath(); c.moveTo(-sw * 0.92, top + H * 0.02); c.lineTo(sw * 0.92, top + H * 0.02); c.quadraticCurveTo(sw * 0.95, top + H * 0.16, sw * 0.4, top + H * 0.21); c.lineTo(0, top + H * 0.24); c.lineTo(-sw * 0.4, top + H * 0.21); c.quadraticCurveTo(-sw * 0.95, top + H * 0.16, -sw * 0.92, top + H * 0.02); c.closePath(); };
      shapeFill(c, plate, L.top2, { shadeX: -sw * 0.1, sh: '#8e9cc6', hi: [sw * 0.15, top + H * 0.03, sw * 0.5, H * 0.04] });
      c.strokeStyle = '#8e9cc6'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, top + H * 0.04); c.lineTo(0, top + H * 0.22); c.stroke();
      shapeFill(c, () => { c.beginPath(); c.moveTo(0, top + H * 0.06); c.lineTo(H * 0.025, top + H * 0.1); c.lineTo(0, top + H * 0.14); c.lineTo(-H * 0.025, top + H * 0.1); c.closePath(); }, '#4a7cff', { lw: 1.6 });
      // gola de pele
      const fc = []; for (let i = 0; i < 7; i++) { const u = i / 6; fc.push([lerp(-sw * 0.95, sw * 0.95, u), top + (i % 2) * H * 0.01, H * 0.036]); }
      blob(c, fc, L.fur, 'rgba(170,150,110,.4)');
    } else {
      shapeFill(c, p, L.top, { shadeX: -sw * 0.25, extra: () => { c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(sw * 0.2, top, sw, bot - top); } });
      shapeFill(c, () => { c.beginPath(); c.moveTo(-sw * 1.08, top + H * 0.03); c.quadraticCurveTo(0, top - H * 0.08, sw * 1.08, top + H * 0.02); c.quadraticCurveTo(sw * 0.8, top + H * 0.13, 0, top + H * 0.13); c.quadraticCurveTo(-sw * 0.8, top + H * 0.13, -sw * 1.08, top + H * 0.03); c.closePath(); }, L.top2, { shadeY: top + H * 0.06, extra: () => { c.strokeStyle = shade(L.top2, -0.3); c.lineWidth = 1.6; c.beginPath(); c.moveTo(-sw * 0.6, top + H * 0.05); c.quadraticCurveTo(0, top + H * 0.1, sw * 0.6, top + H * 0.04); c.stroke(); } });
    }
  }

  function drawHips(c, k, L, B, H, hipY) {
    const ww = H * B.ww * 1.05;
    shapeFill(c, () => { c.beginPath(); c.moveTo(-ww, hipY - H * 0.05); c.lineTo(ww, hipY - H * 0.05); c.lineTo(ww * 1.05, hipY + H * 0.05); c.quadraticCurveTo(0, hipY + H * 0.09, -ww * 1.05, hipY + H * 0.05); c.closePath(); }, L.pants, { shadeX: -ww * 0.3 });
    const belt = k === 'brasa' ? L.top2 : k === 'mare' ? L.gold : k === 'lume' ? L.cuff : '#4a2e1c';
    shapeFill(c, () => { c.beginPath(); c.rect(-ww * 1.05, hipY - H * 0.07, ww * 2.1, H * 0.055); }, belt, { shadeY: hipY - H * 0.04, lw: 2.2 });
    const bk = k === 'tora' ? '#c0c8d0' : k === 'mare' ? '#c8862a' : '#f2c24a';
    shapeFill(c, () => { c.beginPath(); c.rect(ww * 0.15, hipY - H * 0.075, H * (k === 'tora' ? 0.07 : 0.05), H * 0.065); }, bk, { lw: 2 });
    if (k === 'brasa') shapeFill(c, () => { c.beginPath(); c.moveTo(-ww * 0.6, hipY - H * 0.03); c.quadraticCurveTo(-ww * 1.4, hipY + H * 0.08, -ww * 1.2, hipY + H * 0.16); c.lineTo(-ww * 0.7, hipY + H * 0.12); c.closePath(); }, L.top2, { lw: 2.2 });
    if (k === 'lume') for (const ox of [-ww * 0.95, ww * 0.05]) shapeFill(c, () => { c.beginPath(); c.moveTo(ox, hipY - H * 0.02); c.lineTo(ox + ww * 0.9, hipY - H * 0.02); c.lineTo(ox + ww * 0.82, hipY + H * 0.14); c.lineTo(ox + ww * 0.08, hipY + H * 0.14); c.closePath(); }, L.top, { lw: 2.2, shadeX: ox + ww * 0.3, extra: () => { c.strokeStyle = L.cuff; c.lineWidth = 2; c.beginPath(); c.moveTo(ox + ww * 0.1, hipY + H * 0.12); c.lineTo(ox + ww * 0.8, hipY + H * 0.12); c.stroke(); } });
  }

  function drawLeg(c, k, L, B, H, hx, hy, tx, ty, back) {
    const m = B.limb, l1 = H * 0.175, l2 = H * 0.175;
    const j = ik(hx, hy, tx, ty, l1, l2, -1);
    const dk = back ? -0.18 : 0;
    const thigh = shade(L.pants, dk), shin = shade(k === 'mare' ? L.pants : L.boot, dk);
    const wT = H * 0.1 * m * (k === 'mare' ? 1.15 : 1), wK = H * 0.08 * m, wA = H * 0.068 * m;
    seg(c, j.jx, j.jy, j.ex, j.ey, wK, wA, shin);
    if (k === 'brasa' || k === 'lume') shapeFill(c, () => { c.beginPath(); c.ellipse(j.jx, j.jy, wK * 0.62, wK * 0.5, 0, 0, TAU); }, shade(k === 'lume' ? '#e8eefa' : '#8a1a20', dk), { lw: 2 });
    if (k === 'tora') { c.strokeStyle = shade('#6a4a30', dk); c.lineWidth = 2; for (let i = 1; i < 4; i++) { const u = i / 4; c.beginPath(); c.moveTo(lerp(j.jx, j.ex, u) - wK * 0.45, lerp(j.jy, j.ey, u) - 2); c.lineTo(lerp(j.jx, j.ex, u) + wK * 0.45, lerp(j.jy, j.ey, u) + 2); c.stroke(); } }
    seg(c, hx, hy, j.jx, j.jy, wT, wK * 1.02, thigh);
    // pé
    const fa = Math.atan2(j.ey - j.jy, j.ex - j.jx) - Math.PI / 2;
    const footA = clamp(fa * 0.6, -0.6, 0.9);
    const shoe = shade(k === 'mare' ? L.boot : L.boot, dk - 0.05);
    c.save(); c.translate(j.ex, j.ey); c.rotate(footA);
    // bota grande (pés e mãos grandes deixam a silhueta mais legível em movimento)
    const f = wA * 1.25;
    const boot = () => { c.beginPath(); c.moveTo(-f * 0.6, -f * 0.45); c.lineTo(f * 0.35, -f * 0.5); c.quadraticCurveTo(f * 1.55, -f * 0.25, f * 1.6, f * 0.42); c.lineTo(-f * 0.68, f * 0.5); c.closePath(); };
    shapeFill(c, boot, shoe, { lw: 2.3, shadeY: f * 0.12, extra: () => {
      c.fillStyle = shade(shoe, -0.35); c.fillRect(-f, f * 0.24, f * 3, f);
      c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(f * 0.75, -f * 0.18, f * 0.4, f * 0.14, 0.25, 0, TAU); c.fill();
    } });
    c.restore();
  }

  function drawArm(c, k, L, B, H, sx, sy, tx, ty, back, hand) {
    const m = B.limb, l1 = H * 0.15, l2 = H * 0.14;
    const j = ik(sx, sy, tx, ty, l1, l2, 1);
    const dk = back ? -0.2 : 0;
    const wS = H * 0.085 * m, wE = H * 0.07 * m, wW = H * 0.062 * m;
    const upper = shade(k === 'lume' ? L.skin : L.skin, dk);
    const fore = shade(L.fore, dk);
    seg(c, sx, sy, j.jx, j.jy, wS, wE, upper);
    if (k === 'mare') shapeFill(c, () => { c.beginPath(); c.ellipse(lerp(sx, j.jx, 0.55), lerp(sy, j.jy, 0.55), wE * 0.62, wE * 0.62, 0, 0, TAU); }, shade(L.gold, dk), { lw: 2 });
    if (back && (k === 'tora' || k === 'lume')) blob(c, [[sx - wS * 0.3, sy - wS * 0.1, wS * 0.55], [sx + wS * 0.25, sy - wS * 0.2, wS * 0.6], [sx, sy + wS * 0.3, wS * 0.5]], shade(L.fur, dk - 0.05), 'rgba(160,140,100,.4)');
    seg(c, j.jx, j.jy, j.ex, j.ey, wE, wW, fore);
    if (k === 'brasa' || k === 'mare' || k === 'lume') {
      const cx = lerp(j.jx, j.ex, 0.82), cy = lerp(j.jy, j.ey, 0.82);
      shapeFill(c, () => { c.beginPath(); c.ellipse(cx, cy, wW * 0.68, wW * 0.68, 0, 0, TAU); }, shade(L.cuff, dk), { lw: 2 });
    }
    if (k === 'tora') { c.strokeStyle = shade('#a07850', dk); c.lineWidth = 1.6; for (let i = 1; i < 3; i++) { const u = 0.4 + i * 0.18; c.beginPath(); c.arc(lerp(j.jx, j.ex, u), lerp(j.jy, j.ey, u), wE * 0.5, 0, Math.PI); c.stroke(); } }
    if (hand) shapeFill(c, () => { c.beginPath(); c.arc(j.ex, j.ey, wW * 0.8, 0, TAU); }, shade(L.hand, dk), { lw: 2.2, shadeX: j.ex - wW * 0.2 });
    return j;
  }

  // coreografia do corpo por golpe: W = fim da preparação, A = auge do golpe (H = altura)
  // lean: inclinação (+ para a frente), crouch: abaixa o quadril, step: avanço do pé da frente,
  // stretch: estica o corpo, flip: cambalhota durante o golpe, turn: giro horizontal (golpes "spin")
  const MOTION = {
    nL: { W: { lean: -0.08, crouch: 0.02, step: 0 }, A: { lean: 0.2, crouch: 0.03, step: 0.08 } },
    sL: { W: { lean: -0.2, crouch: 0.06, step: -0.02 }, A: { lean: 0.42, crouch: 0.07, step: 0.17, stretch: 1.05 } },
    dL: { W: { lean: 0.08, crouch: 0.12, step: 0 }, A: { lean: 0.32, crouch: 0.17, step: 0.19 } },
    nH: { W: { lean: 0.18, crouch: 0.15, step: 0.02 }, A: { lean: -0.32, crouch: -0.04, step: 0.05, stretch: 1.09 } },
    sH: { W: { lean: -0.38, crouch: 0.1, step: -0.05 }, A: { lean: 0.52, crouch: 0.09, step: 0.22, stretch: 1.07 } },
    dH: { W: { lean: 0.05, crouch: 0.13, step: 0.04 }, A: { lean: 0.1, crouch: 0.17, step: 0.08, turn: 1 } },
    nA: { W: { lean: -0.15, crouch: 0, step: 0 }, A: { lean: 0, crouch: 0, step: 0, flip: 1 } },
    sA: { W: { lean: -0.25, crouch: 0, step: 0 }, A: { lean: 0.48, crouch: 0, step: 0, stretch: 1.05 } },
    dA: { W: { lean: -0.15, crouch: 0, step: 0 }, A: { lean: 0.3, crouch: 0, step: 0, tuck: 1 } },
    rec: { W: { lean: 0.15, crouch: 0.12, step: 0 }, A: { lean: -0.3, crouch: -0.03, step: 0, stretch: 1.12 } },
    gp: { W: { lean: -0.2, crouch: 0, step: 0, tuck: 1 }, A: { lean: 0.15, crouch: 0, step: 0, tuck: 1, dive: 1 } },
  };
  const ZERO = { lean: 0, crouch: 0, step: 0, stretch: 1 };
  function mixM(a, b, u) {
    return { lean: lerp(a.lean || 0, b.lean || 0, u), crouch: lerp(a.crouch || 0, b.crouch || 0, u), step: lerp(a.step || 0, b.step || 0, u), stretch: lerp(a.stretch || 1, b.stretch || 1, u) };
  }
  function bodyMotion(pose, wpKey) {
    if (!pose.key || !MOTION[pose.key]) return Object.assign({}, ZERO);
    const M = MOTION[pose.key];
    let m, flip = 0, turn = 1, tuck = 0;
    const easeIO = u => u * u * (3 - 2 * u);
    if (pose.phase === 'wind') m = mixM(ZERO, M.W, easeO(pose.u));
    else if (pose.phase === 'act') {
      m = mixM(M.W, M.A, Math.min(1, pose.u * 2.2));
      if (M.A.flip) flip = -Math.PI * 2 * easeIO(pose.u);
      if (M.A.turn || (pose.key === 'rec' && pose.spin)) turn = Math.cos(pose.u * Math.PI * 2);
      if (pose.key === 'rec' && pose.spin) flip = -Math.PI * 2 * easeIO(pose.u);
      tuck = M.A.tuck ? 1 : 0;
    } else m = mixM(M.A, ZERO, easeIO(pose.u));
    if (pose.phase !== 'act' && (M.W.tuck || M.A.tuck)) tuck = pose.phase === 'wind' ? pose.u : 1 - pose.u;
    m.flip = flip; m.turn = Math.sign(turn) * Math.max(0.28, Math.abs(turn)) || 1; m.tuck = tuck; m.dive = !!M.A.dive && pose.phase === 'act';
    return m;
  }

  // rastro em meia-lua (lâminas) e risco de velocidade (estocadas)
  function drawSmear(c, C, sx, sy, rad, a0, a1, u, thrust, dx, dy) {
    c.save();
    const fade = clamp(1.15 - u * 0.6, 0, 1);
    if (thrust) {
      const L2 = rad + 26, w = 9;
      const nx = -dy, ny = dx;
      const tipx = sx + dx * L2, tipy = sy + dy * L2, bx = sx + dx * rad * 0.15, by = sy + dy * rad * 0.15;
      c.globalAlpha *= 0.85 * fade;
      c.beginPath(); c.moveTo(tipx, tipy); c.lineTo(bx + nx * w, by + ny * w); c.lineTo(bx - nx * w, by - ny * w); c.closePath();
      const g2 = c.createLinearGradient(bx, by, tipx, tipy); g2.addColorStop(0, hexA(C.accent, 0)); g2.addColorStop(0.7, hexA(C.accent, 0.55)); g2.addColorStop(1, 'rgba(255,255,255,0.95)');
      c.fillStyle = g2; c.fill();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.lineCap = 'round';
      for (const o of [-1.6, 1.6]) { c.beginPath(); c.moveTo(bx + nx * w * o - dx * 18, by + ny * w * o - dy * 18); c.lineTo(bx + nx * w * o + dx * rad * 0.5, by + ny * w * o + dy * rad * 0.5); c.stroke(); }
      c.restore(); return;
    }
    const span = a1 - a0;
    if (Math.abs(span) < 0.05) { c.restore(); return; }
    const N = 18, R = rad + 10, thick = Math.max(14, rad * 0.42);
    c.globalAlpha *= 0.9 * fade;
    c.beginPath();
    for (let i = 0; i <= N; i++) { const k = i / N, a = a0 + span * k; c[i ? 'lineTo' : 'moveTo'](sx + Math.cos(a) * R, sy + Math.sin(a) * R); }
    for (let i = N; i >= 0; i--) { const k = i / N, a = a0 + span * k, rr2 = R - thick * Math.pow(k, 0.7); c.lineTo(sx + Math.cos(a) * rr2, sy + Math.sin(a) * rr2); }
    c.closePath();
    const am = a0 + span * 0.5;
    const g2 = c.createLinearGradient(sx + Math.cos(a0) * R, sy + Math.sin(a0) * R, sx + Math.cos(a1) * R, sy + Math.sin(a1) * R);
    g2.addColorStop(0, hexA(C.accent, 0)); g2.addColorStop(0.55, hexA(C.accent, 0.5)); g2.addColorStop(1, 'rgba(255,255,255,0.95)');
    c.fillStyle = g2; c.fill();
    c.beginPath();
    for (let i = Math.floor(N * 0.35); i <= N; i++) { const k = i / N, a = a0 + span * k; c[i === Math.floor(N * 0.35) ? 'moveTo' : 'lineTo'](sx + Math.cos(a) * R, sy + Math.sin(a) * R); }
    c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2.5; c.stroke();
    c.restore();
  }

  function fighterAlpha(P, t) {
    if (P.st === 5) return 0.45;
    if (P.fl & 1) return (Math.floor(t / 4) % 2) ? 0.5 : 0.9;
    return 1;
  }
  // Lutador com contorno externo grosso (linha de silhueta mais pesada que as linhas internas, como nos
  // jogos de luta em arte vetorial), luz de borda no topo e piscar branco ao levar golpe.
  // O corpo é desenhado num canvas à parte e composto na tela; rastros e auras ficam fora do contorno.
  const OL = { a: null, b: null };
  function olCanvas(k, w, h) {
    let cv = OL[k];
    if (!cv) { cv = OL[k] = document.createElement('canvas'); }
    if (cv.width < w || cv.height < h) { cv.width = Math.max(cv.width, w); cv.height = Math.max(cv.height, h); }
    return cv;
  }
  function drawFighterPro(c, key, P, t, flash) {
    drawFighter(c, key, P, t, { layer: 'fx' });
    const m = c.getTransform(), s = Math.abs(m.a);
    const H = CH[key].h, bx = H * 1.7, byT = H * 2.1, byB = H * 0.7;
    const W = Math.ceil((bx * 2) * s), Hh = Math.ceil((byT + byB) * s);
    if (!(s > 0) || W > 2048 || Hh > 2048 || W < 8) { drawFighter(c, key, P, t); return; }
    const A = olCanvas('a', W, Hh), Bc = olCanvas('b', W, Hh);
    const a = A.getContext('2d'), b = Bc.getContext('2d');
    a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, W + 2, Hh + 2);
    a.setTransform(s, 0, 0, s, bx * s, byT * s);
    drawFighter(a, key, Object.assign({}, P, { x: 0, y: 0 }), t, { layer: 'body' });
    // silhueta escura
    b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, W + 2, Hh + 2);
    b.globalCompositeOperation = 'source-over'; b.drawImage(A, 0, 0);
    b.globalCompositeOperation = 'source-in'; b.fillStyle = OUT; b.fillRect(0, 0, W, Hh);
    b.globalCompositeOperation = 'source-over';
    const sx = m.a * (P.x - bx) + m.c * (P.y - byT) + m.e, sy = m.b * (P.x - bx) + m.d * (P.y - byT) + m.f;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha *= fighterAlpha(P, t);
    const o = clamp(H * 0.022 * s, 1.2, 5);
    for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; c.drawImage(Bc, 0, 0, W, Hh, sx + Math.cos(an) * o, sy + Math.sin(an) * o, W, Hh); }
    c.drawImage(A, 0, 0, W, Hh, sx, sy, W, Hh);
    // luz de borda: silhueta clara menos ela mesma deslocada para baixo
    b.clearRect(0, 0, W + 2, Hh + 2);
    b.drawImage(A, 0, 0);
    b.globalCompositeOperation = 'source-in'; b.fillStyle = flash ? '#ffffff' : 'rgba(255,248,230,1)'; b.fillRect(0, 0, W, Hh);
    if (!flash) { b.globalCompositeOperation = 'destination-out'; b.drawImage(A, 0, 0, W, Hh, -o * 0.5, o * 0.9, W, Hh); }
    b.globalCompositeOperation = 'source-over';
    c.globalAlpha *= flash ? 0.75 : 0.32;
    c.drawImage(Bc, 0, 0, W, Hh, sx, sy, W, Hh);
    c.restore();
  }

  function drawFighter(c, key, P, t, opt) {
    opt = opt || {};
    const armed = !!(P.fl & 128) || !!opt.armed;
    const C = CH[key], L = LOOK2[key], B = BUILD[key], H = C.h, wp = armed ? C.weapon : 'unarmed';
    const pose = weaponPose(key, P.mv, P.mf, P.ch, t, armed);
    const st = P.st, grounded = !!(P.fl & 2);
    const air = st === 2 || (!grounded && (st === 3 || st === 5 || st === 4));
    const mode = st === 4 ? 'hurt' : (st === 3 || pose.chg > 0) ? 'angry' : 'normal';
    const fisty = wp === 'fists' || wp === 'unarmed';
    c.save();
    c.translate(P.x, P.y);
    c.scale(P.face || 1, 1);
    const layer = opt.layer || 'all', doFx = layer !== 'body', doBody = layer !== 'fx';
    if (layer !== 'body') c.globalAlpha *= fighterAlpha(P, t);
    if (pose.chg > 0) c.translate(Math.sin(t * 1.7) * 2 * pose.chg, 0);
    if (pose.chg > 0 && doFx) {
      const rad = H * (0.6 + pose.chg * 0.35 + Math.sin(t * 0.5) * 0.04);
      const gr = c.createRadialGradient(0, -H * 0.5, rad * 0.2, 0, -H * 0.5, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, hexA(C.accent, 0.25 + pose.chg * 0.3)); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr; circle(c, 0, -H * 0.5, rad); c.fill();
    }

    // ---- pose do corpo
    const ph = t * 0.32;
    const mo = st === 3 ? bodyMotion(pose, wp) : Object.assign({}, ZERO, { flip: 0, turn: 1, tuck: 0 });
    let bob = 0, lean = 0, rot = 0, squash = 1;
    let fF = [H * 0.1, -H * 0.03], fB = [-H * 0.09, -H * 0.03];
    const hipY0 = -H * 0.34;
    if (st === 0) { bob = Math.sin(t * 0.09) * H * 0.012 + H * 0.025; fF = [H * 0.11, -H * 0.03]; fB = [-H * 0.1, -H * 0.03]; }
    if (st === 1) {
      bob = H * 0.035 - Math.abs(Math.sin(ph)) * H * 0.04; lean = 0.2;
      const leg = p => [Math.sin(p) * H * 0.16 + H * 0.03, -H * 0.03 - Math.max(0, Math.cos(p)) * H * 0.11];
      fF = leg(ph); fB = leg(ph + Math.PI);
    }
    if (st === 7) { bob = H * 0.09; squash = 1.05; fF = [H * 0.12, -H * 0.03]; fB = [-H * 0.11, -H * 0.03]; }
    if (air && st !== 4 && st !== 5) {
      lean = clamp((P.vx || 0) * 0.018 * (P.face || 1), -0.15, 0.25);
      if ((P.vy || 0) < 0) { fF = [H * 0.13, hipY0 + H * 0.19]; fB = [-H * 0.06, hipY0 + H * 0.3]; }
      else { fF = [H * 0.08, hipY0 + H * 0.31]; fB = [-H * 0.1, hipY0 + H * 0.28]; }
    }
    if (st === 4) {
      lean = -0.4 + Math.sin(t * 0.6) * 0.08;
      fF = [H * 0.15 + Math.sin(t * 0.5) * H * 0.05, hipY0 + H * 0.25]; fB = [-H * 0.15, hipY0 + H * 0.26 + Math.cos(t * 0.5) * H * 0.04];
      const spd = Math.hypot(P.vx || 0, P.vy || 0);
      if (!grounded && spd > 13) rot = -t * 0.45; // rodopia quando lançado longe
    }
    if (st === 5) { fF = [H * 0.1, hipY0 + H * 0.17]; fB = [-H * 0.02, hipY0 + H * 0.19]; lean = 0.32; }
    if (st === 3) {
      lean = mo.lean + (air ? clamp((P.vx || 0) * 0.01 * (P.face || 1), -0.1, 0.1) : 0);
      rot = mo.flip;
      if (grounded) {
        bob = H * (0.03 + mo.crouch);
        fF = [H * (0.12 + mo.step), -H * 0.03]; fB = [-H * (0.11 + mo.step * 0.25), -H * 0.03];
      } else if (mo.tuck) {
        fF = [H * 0.1, hipY0 + H * 0.14]; fB = [-H * 0.02, hipY0 + H * 0.17];
      } else { fF = [H * 0.12, hipY0 + H * 0.25]; fB = [-H * 0.08, hipY0 + H * 0.3]; }
      if (pose.phase === 'act' && pose.u < 0.25) squash = mo.stretch > 1 ? 0.96 : 1.03;
    }
    if (pose.kick != null && pose.kickU > 0) {
      const k = pose.kick * Math.PI / 180, u = pose.kickU;
      const kx = H * 0.04 + Math.sin(k) * H * 0.36, ky = hipY0 + bob + Math.cos(k) * H * 0.36;
      fF = [lerp(fF[0], kx, u), lerp(fF[1], ky, u)];
    }
    // pivô no centro do corpo: inclinação, cambalhota, giro e esticada
    const piv = -H * 0.45;
    c.translate(0, piv); c.rotate(lean + rot); c.scale(mo.turn || 1, (mo.stretch || 1)); c.translate(0, -piv);
    const hipY = hipY0 + bob;
    const top = -H * 0.64 + bob, bot = hipY - H * 0.02;
    const r = H * B.head, hx = H * 0.04 + lean * H * 0.04, hy = top - r * 0.88;

    // mão da arma
    const a = pose.ang * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
    const sx = H * B.sw * 0.45, sy = top + H * 0.05;
    const handD = fisty ? H * (0.2 + 0.2 * pose.ext) : wp === 'spear' ? H * (0.18 + 0.16 * pose.ext) : wp === 'sword' ? H * (0.22 + 0.1 * pose.ext) : H * 0.22;
    const whx = sx + dx * handD, why = sy + dy * handD;

    // rastro do golpe
    if (doFx && pose.active && (pose.trail || pose.thrust || pose.kick != null)) {
      const rad = H * TIP[wp];
      if (pose.trail) drawSmear(c, C, sx, sy, rad, pose.trail[0] * Math.PI / 180, pose.trail[1] * Math.PI / 180, pose.u, false);
      else if (pose.thrust) drawSmear(c, C, sx, sy, rad, 0, 0, pose.u, true, dx, dy);
      if (pose.kick != null) { const k = Math.PI / 2 - pose.kick * Math.PI / 180; drawSmear(c, C, H * 0.04, hipY, H * 0.32, k + 0.9, k, pose.u, false); }
    }

    if (!doBody) { c.restore(); return; }
    drawBack(c, key, L, H, hx, hy, r, P, t);

    // braço de trás
    const bsx = -H * B.sw * 0.55, bsy = top + H * 0.05;
    let bhx, bhy;
    if (wp === 'axe' || wp === 'spear') { bhx = whx - dx * H * 0.14; bhy = why - dy * H * 0.14; }
    else if (fisty) {
      // guarda perto do queixo; no golpe recua (puxa o braço de trás)
      const pull = pose.phase === 'act' ? 1 : pose.phase === 'wind' ? 0 : 0.5;
      bhx = H * lerp(0.14, -0.06, pose.ext > 0.3 ? pull : 0) + Math.sin(t * 0.09) * 2; bhy = top + H * lerp(0.1, 0.16, pull);
      if (st === 1) { bhx = -H * 0.05 - Math.sin(ph) * H * 0.08; bhy = top + H * 0.18; }
    }
    else { bhx = -H * 0.16 + (st === 1 ? -Math.sin(ph) * H * 0.1 : 0); bhy = top + H * 0.26; }
    const bj = drawArm(c, key, L, B, H, bsx, bsy, bhx, bhy, true, !fisty);
    if (fisty) { const fl2 = Math.hypot(bj.ex - bj.jx, bj.ey - bj.jy) || 1; drawFist(c, key, L, H, bj.ex, bj.ey, (bj.ex - bj.jx) / fl2, (bj.ey - bj.jy) / fl2, false, t, true, wp === 'fists'); }

    // pernas
    drawLeg(c, key, L, B, H, -H * B.ww * 0.5, hipY, fB[0], fB[1], true);
    drawLeg(c, key, L, B, H, H * B.ww * 0.5, hipY, fF[0], fF[1], false);
    drawHips(c, key, L, B, H, hipY);
    c.save(); if (squash !== 1) { c.translate(0, bot); c.scale(squash, 2 - squash); c.translate(0, -bot); }
    drawTorso(c, key, L, B, H, top, bot);
    c.restore();
    drawHead(c, key, L, B, hx, hy, r, mode, P, t);

    // braço da frente + arma
    if (wp === 'sword' || fisty) {
      const j = drawArm(c, key, L, B, H, sx, sy, whx, why, false, wp === 'sword');
      if (fisty) { const fl2 = Math.hypot(j.ex - j.jx, j.ey - j.jy) || 1; drawFist(c, key, L, H, j.ex, j.ey, (j.ex - j.jx) / fl2, (j.ey - j.jy) / fl2, pose.active && pose.kick == null, t, false, wp === 'fists'); }
      else drawWeapon(c, key, C, L, pose, j.ex, j.ey, dx, dy, t);
      if (wp === 'sword') shapeFill(c, () => { c.beginPath(); c.arc(j.ex, j.ey, H * 0.036, 0, TAU); }, L.hand, { lw: 2.2 });
    } else {
      drawWeapon(c, key, C, L, pose, whx, why, dx, dy, t);
      drawArm(c, key, L, B, H, sx, sy, whx, why, false, true);
    }
    c.restore();
  }
  // punho em forma de luva (mitten): bloco arredondado apontado na direção do golpe, nó dos dedos e polegar
  // Brasa armada: manopla vermelha com punho de ouro e chamas; desarmado: mão/luva comum
  const FIST = { brasa: '#e0a479', tora: '#6a4428', lume: '#c4d0ea', mare: '#2a2232' };
  function drawFist(c, key, L, H, x, y, dx, dy, active, t, back, flame) {
    const r = H * (flame ? 0.078 : 0.068);
    if (Math.hypot(dx, dy) < 0.1) { dx = 1; dy = 0; }
    const an = Math.atan2(dy, dx);
    if (flame) {
      const fs = r * (active ? 1.7 : 1.0);
      c.save(); c.globalAlpha *= active ? 0.95 : 0.8;
      for (let i = 0; i < 3; i++) { flameTongue(c, x - r * 0.55 + i * r * 0.55, y - r * 0.15, fs * (i === 1 ? 1.25 : 0.85), t, i * 2 + (back ? 3 : 0)); c.fillStyle = i === 1 ? '#ffd23f' : '#ff7a1f'; c.fill(); }
      c.restore();
    }
    const col0 = flame ? L.hand : FIST[key], col = back ? shade(col0, -0.2) : col0;
    c.save(); c.translate(x, y); c.rotate(an);
    const len = r * 1.25, wid = r * 1.0;
    const body = () => { c.beginPath(); c.moveTo(-len * 0.45, -wid); c.lineTo(len * 0.35, -wid); c.quadraticCurveTo(len * 0.8, -wid, len * 0.8, -wid * 0.35); c.lineTo(len * 0.8, wid * 0.35); c.quadraticCurveTo(len * 0.8, wid, len * 0.35, wid); c.lineTo(-len * 0.45, wid); c.quadraticCurveTo(-len * 0.75, 0, -len * 0.45, -wid); c.closePath(); };
    body(); c.fillStyle = col; c.fill();
    c.save(); body(); c.clip(); c.fillStyle = shade(col, -0.3); c.fillRect(-len, wid * 0.25, len * 2, wid); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(-len * 0.3, -wid * 0.85, len * 0.9, wid * 0.28); c.restore();
    body(); c.lineWidth = 2.6; c.strokeStyle = OUT; c.lineJoin = 'round'; c.stroke();
    // dedos dobrados
    c.strokeStyle = shade(col, -0.45); c.lineWidth = 1.5; c.lineCap = 'round';
    for (const k of [-0.33, 0.33]) { c.beginPath(); c.moveTo(len * 0.38, wid * k); c.lineTo(len * 0.74, wid * k); c.stroke(); }
    // polegar
    c.beginPath(); c.ellipse(len * 0.05, wid * 0.85, len * 0.33, wid * 0.32, 0.2, 0, TAU); c.fillStyle = shade(col, -0.12); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    // punho da manopla
    if (flame) { c.beginPath(); c.rect(-len * 0.75, -wid * 1.12, len * 0.42, wid * 2.24); c.fillStyle = '#f2c24a'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = OUT; c.stroke(); }
    c.restore();
    if (active) { // estalo de impacto na ponta
      const ix = x + dx * len * 0.9, iy = y + dy * len * 0.9, f = 0.6 + Math.sin(t * 2.3) * 0.2;
      c.save(); c.globalAlpha *= 0.85; c.strokeStyle = flame ? '#ffd23f' : '#ffffff'; c.lineWidth = 2.2; c.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { const a2 = an + i * 0.42; c.beginPath(); c.moveTo(ix + Math.cos(a2) * r * 0.9, iy + Math.sin(a2) * r * 0.9); c.lineTo(ix + Math.cos(a2) * r * (1.5 + f * (i % 2 ? 0.3 : 0.7)), iy + Math.sin(a2) * r * (1.5 + f * (i % 2 ? 0.3 : 0.7))); c.stroke(); }
      c.restore();
    }
  }


  function star(c, x, y, r, col) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    c.closePath(); c.fillStyle = col; c.fill();
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    const f = v => clamp(Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k), 0, 255);
    return '#' + ((1 << 24) | (f(r) << 16) | (f(gg) << 8) | f(b)).toString(16).slice(1);
  }

  // ------------------------------------------------------------ cenário (camadas em arena.js + maps/)
  const AR = window.Arena;
  const cam = { x: 0, y: -170, z: 0.85, shake: 0 };
  let stageKey = S.STAGE_KEYS[0];
  const DEBUG = { on: /[?&]debug=1/.test(location.search) };
  function stOf(k) { return S.STAGES[k] || S.STAGES[S.STAGE_KEYS[0]]; }
  function camDefault(k) {
    const C = stOf(k).cam;
    const bw = C.r - C.l + 420, bh = C.b - C.t + 340;
    return { x: (C.l + C.r) / 2, y: (C.t + C.b) / 2, z: clamp(Math.min(1280 / bw, 720 / bh), C.zmin, C.zmax) };
  }
  function setStage(k) {
    if (!S.STAGES[k]) k = S.STAGE_KEYS[0];
    if (k !== stageKey) {
      stageKey = k;
      const d = camDefault(k); cam.x = d.x; cam.y = d.y; cam.z = d.z;
    }
    if (AR) AR.load(k);
  }
  // desenho simples usado só enquanto as imagens da arena carregam
  function drawFallbackStage() {
    const ST = stOf(stageKey);
    g.fillStyle = 'rgba(40,40,70,.9)';
    for (const M of ST.solids) { rr(g, M.l, M.t, M.r - M.l, M.b - M.t, 10); g.fill(); }
    g.fillStyle = 'rgba(200,220,255,.8)';
    for (const P of ST.soft) { rr(g, P.l, P.t - 2, P.r - P.l, 12, 6); g.fill(); }
  }
  function drawDebug(view, roster) {
    const ST = stOf(stageKey);
    g.save();
    g.lineWidth = 2 / (cam.z * BASE);
    for (const M of ST.solids) { g.fillStyle = 'rgba(255,60,60,.22)'; g.fillRect(M.l, M.t, M.r - M.l, M.b - M.t); g.strokeStyle = '#ff4040'; g.strokeRect(M.l, M.t, M.r - M.l, M.b - M.t); }
    for (const P of ST.soft) { g.strokeStyle = '#30f0ff'; g.lineWidth = 4 / (cam.z * BASE); g.beginPath(); g.moveTo(P.l, P.t); g.lineTo(P.r, P.t); g.stroke(); }
    g.lineWidth = 2 / (cam.z * BASE);
    for (const [x, y] of ST.spawns) { g.fillStyle = '#ffe040'; circle(g, x, y, 8); g.fill(); }
    for (const [x, y] of ST.respawn) { g.strokeStyle = '#ffe040'; circle(g, x, y, 10); g.stroke(); }
    const Z = ST.blast; g.setLineDash([20, 12]); g.strokeStyle = '#ff40ff'; g.strokeRect(Z.l, Z.t, Z.r - Z.l, Z.b - Z.t);
    const C = ST.cam; g.strokeStyle = '#40ff80'; g.strokeRect(C.l, C.t, C.r - C.l, C.b - C.t); g.setLineDash([]);
    if (view && roster) for (const p of view.players) {
      const r = roster[p.id]; if (!r || p.st === 6 || p.st === 8) continue;
      const Cc = CH[r.char];
      g.strokeStyle = '#40ff80'; g.strokeRect(p.x - Cc.w / 2, p.y - Cc.h, Cc.w, Cc.h);
      if (p.mv >= 0) {
        const m = S.MOVES[(p.fl & 128) ? Cc.weapon : 'unarmed'][S.MOVE_KEYS[p.mv]];
        if (m && p.mf >= m.s && p.mf < m.s + m.a) {
          const hx = p.x + p.face * m.hb[0], hy = p.y + m.hb[1];
          g.fillStyle = 'rgba(255,40,40,.35)'; g.fillRect(hx - m.hb[2] / 2, hy - m.hb[3] / 2, m.hb[2], m.hb[3]);
        }
      }
    }
    g.restore();
  }
  function groundBelow(x, y) {
    const ST = stOf(stageKey); let best = null;
    for (const M of ST.solids) if (x > M.l && x < M.r && M.t >= y - 1 && (best === null || M.t < best)) best = M.t;
    for (const P of ST.soft) if (x > P.l && x < P.r && P.t >= y - 1 && (best === null || P.t < best)) best = P.t;
    return best;
  }

  // ------------------------------------------------------------ efeitos
  const fx = [];
  let flashA = 0;
  const hitFlash = {};
  function addP(o) { if (fx.length < 700) fx.push(o); }
  function burst(x, y, n, col, spd, life, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random() * 0.8);
      addP({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), max: life, col, size: size || 3 });
    }
  }
  function dust(x, y, n, big) {
    for (let i = 0; i < n; i++) addP({ k: 'dust', x: x + (Math.random() - 0.5) * 30, y: y - 4, vx: (Math.random() - 0.5) * (big ? 8 : 3), vy: -Math.random() * 1.5, life: 30, max: 30, size: (big ? 12 : 7) + Math.random() * 6 });
  }
  function handleEvent(e, roster, sound) {
    const [, ty, x, y, a, b, c] = e;
    const pl = roster && roster[a];
    const col = pl ? CH[pl.char].accent : '#fff';
    switch (ty) {
      case 1: {
        const big = b >= 13;
        burst(x, y, 8 + b, big ? '#fff3a0' : '#ffffff', 6 + b * 0.5, 22, big ? 4 : 3);
        addP({ k: 'ring', x, y, life: 16, max: 16, size: 20 + b * 3, col: big ? '#ffd23f' : '#ffffff' });
        addP({ k: 'star', x, y, life: 8, max: 8, size: 28 + b * 3 });
        if (big) cam.shake = Math.max(cam.shake, Math.min(16, b * 0.7));
        hitFlash[a] = performance.now();
        if (sound) Sfx.hit(b);
        break;
      }
      case 2: {
        const ang = Math.atan2(cam.y - y, cam.x - x);
        addP({ k: 'beam', x, y, ang, life: 50, max: 50, col: pl ? SLOT[a] : '#fff' });
        burst(clamp(x, cam.x - 900, cam.x + 900), clamp(y, cam.y - 600, cam.y + 600), 40, col, 16, 40, 5);
        cam.shake = 22; flashA = 0.35;
        if (sound) Sfx.ko();
        break;
      }
      case 3: if (b) addP({ k: 'ring', x, y: y - 6, life: 14, max: 14, size: 30, col: 'rgba(255,255,255,.8)', flat: 1 }); else dust(x, y, 4); if (sound) Sfx.jump(); break;
      case 4: dust(x, y, b ? 8 : 5, !!b); if (sound) Sfx.land(); break;
      case 5: if (sound) Sfx.swing(); if (c > 30) cam.shake = Math.max(cam.shake, 4); break;
      case 6: dust(x, y, 14, true); addP({ k: 'ring', x, y: y - 4, life: 18, max: 18, size: 90, col: '#ffffff', flat: 1 }); cam.shake = Math.max(cam.shake, 8); if (sound) Sfx.land(); break;
      case 7: for (let i = 0; i < 18; i++) addP({ k: 'spark', x: x + (Math.random() - 0.5) * 60, y: y + Math.random() * 40, vx: 0, vy: 3 + Math.random() * 4, life: 40, max: 40, col: SLOT[a] || '#fff', size: 3 }); break;
      case 8: addP({ k: 'ring', x, y: y - 45, life: 12, max: 12, size: 50, col: 'rgba(200,240,255,.7)' }); if (sound) Sfx.dodge(); break;
      case 9: if (pl && sound) toast(pl.name + ' saiu da partida.'); break;
      case 10: addP({ k: 'ring', x, y: y - 2, life: 10, max: 10, size: 22, col: 'rgba(255,255,255,.6)', flat: 1 }); break;
      case 11: // pegou a arma
        burst(x, y - 20, 14, col, 7, 22, 3);
        addP({ k: 'ring', x, y: y - 20, life: 14, max: 14, size: 46, col: '#ffffff' });
        if (sound) Sfx.pickup(); break;
      case 12: // arremessou
        addP({ k: 'ring', x, y, life: 10, max: 10, size: 30, col: 'rgba(255,255,255,.7)' });
        if (sound) Sfx.swing(); break;
      case 13: break; // arma surgiu lá em cima (desenhada pelo próprio item)
      case 14: // arma caiu no chão
        dust(x, y, 6); addP({ k: 'ring', x, y: y - 3, life: 18, max: 18, size: 60, col: 'rgba(255,240,180,.8)', flat: 1 });
        if (sound) Sfx.land(); break;
    }
  }
  function drawFx(dt) {
    const k = dt / STEP;
    for (let i = fx.length - 1; i >= 0; i--) {
      const p = fx[i];
      p.life -= k;
      if (p.life <= 0) { fx.splice(i, 1); continue; }
      const u = p.life / p.max;
      if (p.k === 'spark') {
        p.x += p.vx * k; p.y += p.vy * k; p.vx *= 0.92; p.vy = p.vy * 0.92 + 0.15 * k;
        g.strokeStyle = p.col; g.globalAlpha = u; g.lineWidth = p.size; g.lineCap = 'round';
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 2, p.y - p.vy * 2); g.stroke();
      } else if (p.k === 'dust') {
        p.x += p.vx * k; p.y += p.vy * k; p.vx *= 0.9;
        g.globalAlpha = u * 0.6; g.fillStyle = '#efe3ff'; circle(g, p.x, p.y, p.size * (1.6 - u)); g.fill();
      } else if (p.k === 'ring') {
        g.globalAlpha = u; g.strokeStyle = p.col; g.lineWidth = 4 * u + 1;
        const r = p.size * (1.3 - u);
        g.beginPath(); if (p.flat) g.ellipse(p.x, p.y, r * 1.6, r * 0.4, 0, 0, Math.PI * 2); else g.arc(p.x, p.y, r, 0, Math.PI * 2); g.stroke();
      } else if (p.k === 'star') {
        g.globalAlpha = u; star(g, p.x, p.y, p.size * (1.2 - u * 0.4), '#ffffff');
      } else if (p.k === 'beam') {
        g.save(); g.translate(p.x, p.y); g.rotate(p.ang);
        const w = 140 * u + 10;
        const gr = g.createLinearGradient(0, 0, 1600, 0);
        gr.addColorStop(0, p.col); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.globalAlpha = Math.min(1, u * 1.5);
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, -w * 0.15); g.lineTo(1600, -w); g.lineTo(1600, w); g.lineTo(0, w * 0.15); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.globalAlpha = u; g.beginPath(); g.moveTo(0, -w * 0.05); g.lineTo(1600, -w * 0.3); g.lineTo(1600, w * 0.3); g.lineTo(0, w * 0.05); g.fill();
        g.restore();
      }
      g.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------ desenho do quadro
  function updateCamera(view, dt) {
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, n = 0;
    if (view) for (const p of view.players) {
      if (p.st === 6 || p.st === 8) continue;
      const Z = stOf(stageKey).blast;
      if (p.x < Z.l - 50 || p.x > Z.r + 50 || p.y > Z.b + 100 || p.y < Z.t - 150) continue;
      const h = 100;
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y - h); maxY = Math.max(maxY, p.y); n++;
    }
    const CB = stOf(stageKey).cam, d0 = camDefault(stageKey);
    let tx = d0.x, ty = d0.y, tz = d0.z;
    if (n) {
      minX = Math.min(minX, CB.l); maxX = Math.max(maxX, CB.r); minY = Math.min(minY, CB.t); maxY = Math.max(maxY, CB.b);
      tx = (minX + maxX) / 2; ty = (minY + maxY) / 2;
      const bw = maxX - minX + 420, bh = maxY - minY + 340;
      tz = clamp(Math.min((VW / BASE) / bw, (VH / BASE) / bh), CB.zmin, CB.zmax);
    }
    const k = 1 - Math.pow(0.92, dt / STEP);
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.z += (tz - cam.z) * k;
    cam.shake *= Math.pow(0.86, dt / STEP);
  }

  function dmgColor(d) {
    const st = [[0, [255, 255, 255]], [50, [255, 230, 90]], [100, [255, 150, 40]], [150, [255, 60, 60]], [220, [150, 10, 20]]];
    for (let i = 1; i < st.length; i++) {
      if (d <= st[i][0]) {
        const u = (d - st[i - 1][0]) / (st[i][0] - st[i - 1][0]), a = st[i - 1][1], b = st[i][1];
        return `rgb(${Math.round(lerp(a[0], b[0], u))},${Math.round(lerp(a[1], b[1], u))},${Math.round(lerp(a[2], b[2], u))})`;
      }
    }
    return 'rgb(150,10,20)';
  }
  function txt(s, x, y, size, col, align, font) {
    g.font = `${size}px ${font || 'Bungee, Impact, sans-serif'}`; g.textAlign = align || 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = Math.max(3, size * 0.16); g.strokeStyle = OUT; g.strokeText(s, x, y);
    g.fillStyle = col; g.fillText(s, x, y);
  }

  function drawPortraitAt(c, key, x, y, size, t) {
    const im = HEAD_IMG[key];
    if (im && im.complete && im.naturalWidth) { const s2 = size * 1.25; c.drawImage(im, x - s2 / 2, y - s2 / 2, s2, s2); return; }
    const C = CH[key];
    const sc = size / (C.h * 0.62);
    c.save(); c.translate(x, y + C.h * 0.86 * sc * 0.82); c.scale(sc, sc);
    drawFighterPro(c, key, { x: 0, y: 0, face: 1, st: 0, mv: -1, mf: 0, ch: 0, fl: 2 | 128, vx: 0, vy: 0 }, t);
    c.restore();
  }

  // ------------------------------------------------------------ armas que caem do céu
  // ícone genérico (espada + machado cruzados dentro de um emblema); arremessada vira a arma do dono, girando
  function itemIcon(c, s) {
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.rotate(-0.78);
    // lâmina
    c.beginPath(); c.moveTo(0, -s * 0.95); c.lineTo(s * 0.17, -s * 0.7); c.lineTo(s * 0.14, s * 0.25); c.lineTo(-s * 0.14, s * 0.25); c.lineTo(-s * 0.17, -s * 0.7); c.closePath();
    c.fillStyle = '#eef3fa'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.moveTo(0, -s * 0.8); c.lineTo(0, s * 0.2); c.strokeStyle = '#a9b6c8'; c.lineWidth = 1.5; c.stroke();
    c.lineWidth = 7; c.strokeStyle = OUT; c.beginPath(); c.moveTo(-s * 0.36, s * 0.3); c.lineTo(s * 0.36, s * 0.3); c.stroke();
    c.lineWidth = 4; c.strokeStyle = '#f2c24a'; c.stroke();
    c.lineWidth = 6; c.strokeStyle = OUT; c.beginPath(); c.moveTo(0, s * 0.32); c.lineTo(0, s * 0.62); c.stroke();
    c.lineWidth = 3; c.strokeStyle = '#7a4a2a'; c.stroke();
    c.restore();
    c.save(); c.rotate(0.78);
    c.lineWidth = 6; c.strokeStyle = OUT; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, s * 0.7); c.lineTo(0, -s * 0.75); c.stroke();
    c.lineWidth = 3; c.strokeStyle = '#8a5a34'; c.stroke();
    c.beginPath(); c.moveTo(s * 0.05, -s * 0.78); c.quadraticCurveTo(s * 0.55, -s * 0.72, s * 0.5, -s * 0.28); c.lineTo(s * 0.05, -s * 0.42); c.closePath();
    c.fillStyle = '#c8ced6'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
    c.restore();
  }
  function drawItem(c, it, roster, t) {
    if (it.st === 4) return;
    c.save(); c.translate(it.x, it.y);
    if (it.st === 2) {
      const o = roster && roster[it.own], key = o ? o.char : 'brasa';
      const C = CH[key], L = LOOK2[key], H = C.h;
      // rastro
      c.save(); c.globalAlpha = 0.5; c.strokeStyle = hexA(C.accent, 0.6); c.lineWidth = 10; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-it.vx * 3, 0); c.stroke(); c.restore();
      c.rotate(it.t * 0.5 * Math.sign(it.vx || 1));
      const pose = { ang: 0, ext: 0, active: true, chg: 0 };
      c.translate(-H * 0.25, 0);
      if (C.weapon === 'fists') drawFist(c, key, L, H, H * 0.25, 0, 1, 0, true, t, false, true);
      else drawWeapon(c, key, C, L, pose, 0, 0, 1, 0, t);
      c.restore(); return;
    }
    let a = 1;
    if (it.st === 3) a = clamp(1 - it.t / 20, 0, 1) * ((Math.floor(it.t / 2) % 2) ? 0.4 : 1);
    if (it.st === 1 && it.t > 60 * 18) a = (Math.floor(t / 5) % 2) ? 0.45 : 1; // vai sumir
    c.globalAlpha *= a;
    const s = 24;
    const bob = it.st === 1 ? Math.sin(t * 0.08 + it.id) * 3 : 0;
    const cy = -s - 6 + bob;
    if (it.st === 0) {
      // feixe de queda
      const gr = c.createLinearGradient(0, cy - 260, 0, cy);
      gr.addColorStop(0, 'rgba(255,240,190,0)'); gr.addColorStop(1, 'rgba(255,240,190,.55)');
      c.fillStyle = gr; c.beginPath(); c.moveTo(-s * 0.7, cy); c.lineTo(-s * 0.25, cy - 260); c.lineTo(s * 0.25, cy - 260); c.lineTo(s * 0.7, cy); c.fill();
    } else {
      // luz no chão
      c.save(); c.globalAlpha *= 0.5 + Math.sin(t * 0.12 + it.id) * 0.2; c.fillStyle = 'rgba(255,235,160,.6)';
      c.beginPath(); c.ellipse(0, -2, s * 1.4, 6, 0, 0, TAU); c.fill(); c.restore();
    }
    // halo
    const pulse = 1 + Math.sin(t * 0.15 + it.id) * 0.08;
    const gr = c.createRadialGradient(0, cy, s * 0.3, 0, cy, s * 1.9 * pulse);
    gr.addColorStop(0, 'rgba(255,250,220,.9)'); gr.addColorStop(0.45, 'rgba(255,210,90,.45)'); gr.addColorStop(1, 'rgba(255,200,60,0)');
    c.fillStyle = gr; circle(c, 0, cy, s * 1.9 * pulse); c.fill();
    // emblema
    c.beginPath(); for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + Math.PI / 6; c[i ? 'lineTo' : 'moveTo'](Math.cos(an) * s, cy + Math.sin(an) * s); } c.closePath();
    const eg = c.createLinearGradient(0, cy - s, 0, cy + s); eg.addColorStop(0, '#3a3f7a'); eg.addColorStop(1, '#1d1f44');
    c.fillStyle = eg; c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 2.5; c.strokeStyle = '#f2c24a'; c.stroke();
    c.translate(0, cy); c.rotate(it.st === 0 ? Math.sin(t * 0.2) * 0.25 : 0);
    itemIcon(c, s * 0.8);
    c.restore();
  }

  function render(view, roster, now, dt, showHud) {
    const t = now / STEP;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (view && view.m && view.m !== stageKey) setStage(view.m);
    updateCamera(view, dt);
    const sh = cam.shake;
    const ox = (Math.random() - 0.5) * sh, oy = (Math.random() - 0.5) * sh;
    const z = cam.z * BASE;
    const d0 = camDefault(stageKey);
    const ac = { VW, VH, B: BASE, z, zr: cam.z / d0.z, dx: cam.x - d0.x, dy: cam.y - d0.y, dt };
    const worldXf = () => { g.translate(ox, oy); g.translate(VW / 2, VH / 2); g.scale(z, z); g.translate(-cam.x, -cam.y); };
    const hasArt = AR && AR.draw(g, stageKey, 'back', ac, t);
    if (!AR) { g.fillStyle = '#203050'; g.fillRect(0, 0, VW, VH); }
    g.save();
    worldXf();
    if (hasArt) AR.draw(g, stageKey, 'world', ac, t, () => {});
    else drawFallbackStage();
    if (view && roster) {
      if (view.events) for (const e of view.events) handleEvent(e, roster, showHud);
      for (const p of view.players) {
        if (p.st === 6 || p.st === 8) continue;
        const gy = groundBelow(p.x, p.y);
        if (gy !== null && gy - p.y < 400) {
          const hgt = clamp((gy - p.y) / 400, 0, 1);
          g.globalAlpha = 0.35 * (1 - hgt); g.fillStyle = '#10081e';
          g.beginPath(); g.ellipse(p.x, gy - 1, 30 * (1 - hgt * 0.5), 6, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
        }
      }
      if (view.items) for (const it of view.items) drawItem(g, it, roster, t);
      for (const p of view.players) {
        if (p.st === 6 || p.st === 8) continue;
        const r = roster[p.id]; if (!r) continue;
        if (showHud) {
          g.globalAlpha = 0.85; g.strokeStyle = SLOT[p.id]; g.lineWidth = 4;
          g.beginPath(); g.ellipse(p.x, p.y - 1, 26, 6, 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
        }
        const hf = hitFlash[p.id];
        drawFighterPro(g, r.char, p, t + p.id * 37, !!(hf && now - hf < 90));
        if (showHud) {
          const hy = p.y - CH[r.char].h - 34;
          g.font = '900 15px Nunito, sans-serif';
          const label = r.name + (p.id === App.me && App.kind === 'online' ? ' (você)' : '');
          txt(label, p.x, hy, 15, SLOT[p.id], 'center', 'Nunito, sans-serif');
          g.fillStyle = SLOT[p.id]; g.beginPath(); g.moveTo(p.x - 6, hy + 10); g.lineTo(p.x + 6, hy + 10); g.lineTo(p.x, hy + 17); g.fill();
        }
      }
    }
    drawFx(dt);
    if (DEBUG.on) drawDebug(view, roster);
    g.restore();
    if (hasArt) AR.draw(g, stageKey, 'front', ac, t, worldXf);

    if (flashA > 0) { g.fillStyle = `rgba(255,255,255,${flashA})`; g.fillRect(0, 0, VW, VH); flashA = Math.max(0, flashA - 0.02 * dt / STEP); }

    if (!view || !roster || !showHud) return;
    // indicadores fora da tela
    for (const p of view.players) {
      if (p.st === 6 || p.st === 8) continue;
      const r = roster[p.id]; if (!r) continue;
      const sx = VW / 2 + (p.x - cam.x) * z, sy = VH / 2 + (p.y - 50 - cam.y) * z;
      const m = 34;
      if (sx < -10 || sx > VW + 10 || sy < -10 || sy > VH + 10) {
        const cx = clamp(sx, m, VW - m), cy = clamp(sy, m, VH - 120);
        const ang = Math.atan2(sy - cy, sx - cx);
        g.save(); g.translate(cx, cy);
        g.fillStyle = SLOT[p.id]; g.beginPath(); g.moveTo(Math.cos(ang) * 34, Math.sin(ang) * 34);
        g.lineTo(Math.cos(ang + 0.5) * 24, Math.sin(ang + 0.5) * 24); g.lineTo(Math.cos(ang - 0.5) * 24, Math.sin(ang - 0.5) * 24); g.fill();
        circle(g, 0, 0, 26); g.fillStyle = 'rgba(20,10,40,.85)'; g.fill(); g.lineWidth = 3; g.strokeStyle = SLOT[p.id]; g.stroke();
        g.save(); circle(g, 0, 0, 24); g.clip(); drawPortraitAt(g, r.char, 0, 0, 40, now / STEP); g.restore();
        g.restore();
      }
    }
    drawHud(view, roster, now);
    // contagem e vitória
    if (view.cd > 0) {
      const n = Math.ceil(view.cd / 50);
      const u = (view.cd % 50) / 50;
      if (App.lastCd !== n) { App.lastCd = n; Sfx.beep(false); }
      txt(String(n), VW / 2, VH * 0.4, (120 + u * 60) * BASE, '#ffd23f');
    } else if (App.lastCd > 0) { App.lastCd = 0; App.goT = now; Sfx.beep(true); }
    if (App.goT && now - App.goT < 800) txt('LUTEM!', VW / 2, VH * 0.4, 110 * BASE, '#ff8a3d');
    if (view.o != null) {
      const w = roster[view.o];
      txt(w ? 'VITÓRIA!' : 'FIM!', VW / 2, VH * 0.34, 100 * BASE, '#ffd23f');
      if (w) txt(w.name, VW / 2, VH * 0.34 + 90 * BASE, 50 * BASE, SLOT[view.o]);
    }
  }

  function drawHud(view, roster, now) {
    const n = view.players.length; if (!n) return;
    const hs = clamp(BASE, 0.5, 1.1), cw = 214, chh = 76, gap = 12;
    const perRow = n > 5 ? Math.ceil(n / 2) : n, rows = Math.ceil(n / perRow);
    const total = perRow * cw + (perRow - 1) * gap;
    const sc = Math.min(hs * (rows > 1 ? 0.8 : 1), (VW - 20) / total);
    g.save(); g.translate(VW / 2 - total * sc / 2, VH - (rows * (chh + gap)) * sc); g.scale(sc, sc);
    view.players.forEach((p, i) => {
      const r = roster[p.id]; if (!r) return;
      const row = Math.floor(i / perRow), inRow = Math.min(perRow, n - row * perRow);
      const x = (i % perRow) * (cw + gap) + (perRow - inRow) * (cw + gap) / 2;
      g.save(); g.translate(0, row * (chh + gap));
      const outP = p.st === 8;
      g.globalAlpha = outP ? 0.45 : 1;
      rr(g, x, 0, cw, chh, 16); g.fillStyle = 'rgba(20,12,40,.82)'; g.fill(); g.lineWidth = 3; g.strokeStyle = SLOT[p.id]; g.stroke();
      g.save(); circle(g, x + 40, chh / 2, 30); g.fillStyle = hexA(CH[r.char].color, 0.35); g.fill(); g.clip();
      drawPortraitAt(g, r.char, x + 40, chh / 2 - 2, 50, now / STEP); g.restore();
      g.font = '900 15px Nunito, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = SLOT[p.id];
      let nm = r.name; while (nm.length > 3 && g.measureText(nm).width > cw - 78 - Math.min(p.stocks, 8) * 15 - 14) nm = nm.slice(0, -1);
      g.fillText(nm === r.name ? nm : nm + '…', x + 78, 18);
      const hf = hitFlash[p.id], shake = hf && now - hf < 200 ? (Math.random() - 0.5) * 6 : 0;
      txt(outP ? 'FORA' : Math.round(p.dmg) + '%', x + 78 + shake, 50 + shake, 30, outP ? '#9a8fb8' : dmgColor(p.dmg), 'left');
      for (let k = 0; k < Math.min(p.stocks, 8); k++) { circle(g, x + cw - 16 - k * 15, 18, 5.5); g.fillStyle = SLOT[p.id]; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); }
      g.globalAlpha = 1;
      g.restore();
    });
    g.restore();
  }

  // ------------------------------------------------------------ buffer de snapshots
  class SnapBuf {
    constructor(delay) { this.list = []; this.delay = delay; this.base = null; this.evq = []; this.maxEv = 0; }
    push(snap) {
      const now = performance.now(), L = this.list;
      if (!snap || !Array.isArray(snap.p)) return;
      if (L.length && snap.k <= L[L.length - 1].k) return;
      L.push(snap); if (L.length > 90) L.shift();
      if (Array.isArray(snap.e)) for (const e of snap.e) if (e[0] > this.maxEv) { this.maxEv = e[0]; this.evq.push(e); }
      const off = snap.k - now * 0.06;
      if (this.base === null || Math.abs(off - this.base) > 40) this.base = off;
      else if (off > this.base) this.base += (off - this.base) * 0.2; else this.base += (off - this.base) * 0.02;
    }
    sample(now) {
      const L = this.list; if (!L.length) return null;
      let rt = now * 0.06 + this.base - this.delay;
      const last = L[L.length - 1], first = L[0];
      if (rt > last.k) rt = last.k; if (rt < first.k) rt = first.k;
      let a = last, b = last;
      for (let i = L.length - 1; i > 0; i--) if (L[i - 1].k <= rt) { a = L[i - 1]; b = L[i]; break; }
      const t = b.k === a.k ? 1 : clamp((rt - a.k) / (b.k - a.k), 0, 1);
      const near = t < 0.5 ? a : b;
      const players = b.p.map((pb, idx) => {
        const pa = a.p[idx] || pb, pn = near.p[idx] || pb;
        const jump = Math.abs(pb[1] - pa[1]) > 250 || Math.abs(pb[2] - pa[2]) > 250;
        const L2 = (u, v) => (jump ? v : u + (v - u) * t);
        let mf = pn[6];
        if (pa[5] === pb[5] && pa[5] >= 0 && pb[6] >= pa[6]) mf = pa[6] + (pb[6] - pa[6]) * t;
        return { id: pb[0], x: L2(pa[1], pb[1]), y: L2(pa[2], pb[2]), face: pn[3], st: pn[4], mv: pn[5], mf, ch: pn[7], dmg: pn[8], stocks: pn[9], fl: pn[10], vx: pn[11], vy: pn[12] };
      });
      const due = [];
      while (this.evq.length && this.evq[0][7] <= rt) due.push(this.evq.shift());
      // armas: interpola por id entre os dois estados
      const items = [];
      const wa = a.w || [], wb = b.w || [];
      for (const ib of wb) {
        const ia = wa.find(q => q[0] === ib[0]);
        const lerpOk = ia && ia[3] === ib[3];
        const iv = t < 0.5 && ia ? ia : ib;
        items.push({ id: ib[0], x: lerpOk ? ia[1] + (ib[1] - ia[1]) * t : ib[1], y: lerpOk ? ia[2] + (ib[2] - ia[2]) * t : ib[2], st: iv[3], own: ib[4], vx: ib[5], t: lerpOk ? ia[6] + (ib[6] - ia[6]) * t : ib[6] });
      }
      return { k: rt, cd: near.cd, o: near.o, players, events: due, items };
    }
  }

  class LocalSession {
    constructor(roster, opts, pads) {
      this.s = S.createGame(roster, opts);
      setStage(this.s.stage); this.pads = pads || []; this.acc = 0; this.paused = false;
      this.buf = new SnapBuf(1.2); this.buf.push(S.snapshot(this.s));
    }
    update(dt) {
      if (this.paused) return;
      this.acc += dt; let n = 0;
      while (this.acc >= STEP && n < 8) {
        this.pads.forEach((pd, i) => { if (pd) S.setInput(this.s, i, pd.read()); });
        S.step(this.s); this.buf.push(S.snapshot(this.s)); this.acc -= STEP; n++;
      }
      if (n >= 8) this.acc = 0;
    }
  }

  // ------------------------------------------------------------ rede: servidor WebSocket
  class WSNet {
    constructor(cb) { this.cb = cb; this.ws = null; this.id = null; this.rtt = 0; this.lastIn = ''; this.lastInT = 0; this.ready = null; }
    open() {
      if (this.ws && this.ws.readyState <= 1 && this.ready) return this.ready;
      this.ready = new Promise((res, rej) => {
        let ws;
        const host = String(window.TUMULTO_SERVER || '').replace(/^(https?|wss?):\/\//, '').replace(/\/+$/, '') || location.host;
        try { ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + host); } catch (e) { rej(e); return; }
        this.ws = ws;
        ws.onopen = () => { res(); this.pi = setInterval(() => this.send({ t: 'ping', ts: performance.now() }), 2000); };
        ws.onerror = () => rej(new Error('conn'));
        ws.onclose = () => { clearInterval(this.pi); this.ready = null; if (this.cb.closed) this.cb.closed(); };
        ws.onmessage = e => this.msg(e.data);
      });
      return this.ready;
    }
    msg(d) {
      let m; try { m = JSON.parse(d); } catch (e) { return; }
      switch (m.t) {
        case 'hello': this.id = m.id; break;
        case 'pong': this.rtt = performance.now() - m.ts; break;
        case 'lobby': this.cb.lobby({ code: m.code, hostId: m.host, meId: this.id, isHost: m.host === this.id, stocks: m.stocks, stage: m.stage, playing: m.playing, members: m.members }); break;
        case 'start': this.cb.start(m.roster, m.you, m.stage); break;
        case 's': this.cb.snap(m.s); break;
        case 'end': this.cb.end(m.r); break;
        case 'err': this.cb.error(m.msg); break;
        case 'rooms': this.cb.rooms(m.list); break;
        case 'left': if (this.cb.left) this.cb.left(); break;
      }
    }
    send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
    async create(name, char) { await this.open(); this.send({ t: 'create', name, char }); }
    async join(code, name, char) { await this.open(); this.send({ t: 'join', code, name, char }); }
    setChar(c) { this.send({ t: 'char', char: c }); }
    addCpu(l) { this.send({ t: 'addcpu', lvl: l }); }
    rmCpu(id) { this.send({ t: 'rmcpu', id }); }
    setStocks(n) { this.send({ t: 'stocks', n }); }
    setStage(k) { this.send({ t: 'stage', k }); }
    start() { this.send({ t: 'start' }); }
    input(inp, now) {
      const k = inp.h + ',' + inp.c.join(',');
      if (k !== this.lastIn || now - this.lastInT > 250) { this.lastIn = k; this.lastInT = now; this.send({ t: 'in', h: inp.h, c: inp.c }); }
    }
    async listRooms() { try { await this.open(); this.send({ t: 'list' }); } catch (e) { this.cb.rooms(null); } }
    leave() { this.send({ t: 'leave' }); }
    info() { return this.rtt ? 'ping ' + Math.round(this.rtt) + ' ms' : ''; }
    delay() { return 3.5 + Math.min(6, this.rtt * 0.03); }
    inviteText(code) { return location.origin + location.pathname + '?sala=' + code; }
  }

  // ------------------------------------------------------------ rede: sala do Claude (página publicada)
  class RoomNet {
    constructor(cb, room) {
      this.cb = cb; this.room = room; this.r = null; this.myPeer = null; this.isHost = false;
      this.cpus = []; this.stocks = 3; this.stage = S.STAGE_KEYS[0]; this.gid = 0; this.seenGid = 0; this.seenEnd = 0; this.sim = null; this.hadHost = false;
      this.lastIn = ''; this.localInput = { h: 0, c: [0, 0, 0, 0, 0] }; this.missing = {};
      room.onPeers(() => { if (App.screen === 'online') this.listRooms(); });
    }
    static async get() {
      try { if (!window.claude || typeof window.claude.use !== 'function') return null; return await window.claude.use('room'); } catch (e) { return null; }
    }
    listRooms() {
      const list = this.room.peers().filter(p => p.presence && typeof p.presence.sala === 'string' && !p.sameTab)
        .map(p => ({ code: String(p.presence.sala).slice(0, 6), host: String(p.presence.n || '?').slice(0, 16), n: p.presence.cnt | 0, playing: !!p.presence.pl }));
      this.cb.rooms(list);
    }
    async create(name, char) {
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = '';
      for (let i = 0; i < 4; i++) c += A[Math.floor(Math.random() * A.length)];
      await this._enter(c, name, char, true);
    }
    async join(code, name, char) { await this._enter(code, name, char, false); }
    async _enter(code, name, char, host) {
      if (this.r) this.leave();
      code = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (!code) { this.cb.error('Código inválido.'); return; }
      this.code = code; this.name = name; this.char = char; this.isHost = host; this.cpus = []; this.sim = null; this.hadHost = false; this.seenGid = 0; this.seenEnd = 0;
      this.jt = Date.now();
      try { this.r = await this.room.join('tumulto-' + code.toLowerCase()); }
      catch (e) { this.cb.error('Não foi possível entrar na sala (' + ((e && e.code) || 'erro') + ').'); return; }
      this.r.onPeers(() => this._update(), () => { this.cb.error('Conexão com a sala perdida.'); this.leave(); if (this.cb.left) this.cb.left(); });
      await this._pres({ n: name, c: char, jt: this.jt, h: host ? 1 : 0, ph: 'lobby', st: this.stocks, sg: this.stage, cpu: [] });
      if (host) this._advertise();
      else setTimeout(() => { if (this.r && !this.hadHost) { this.cb.error('Sala ' + code + ' não encontrada.'); this.leave(); if (this.cb.left) this.cb.left(); } }, 5000);
      this._update();
    }
    _pres(p) { return this.r ? this.r.presence(p).catch(() => {}) : Promise.resolve(); }
    _advertise() {
      if (!this.isHost || !this.r) return;
      const cnt = this._humans().length + this.cpus.length;
      const key = this.code + cnt + (this.sim ? 1 : 0);
      if (key === this.advKey) return; this.advKey = key;
      this.room.presence({ sala: this.code, n: this.name, cnt, pl: this.sim ? 1 : 0 }).catch(() => {});
    }
    _peers() { return this.r ? this.r.peers() : []; }
    _hostPeer() {
      const hs = this._peers().filter(p => p.presence && p.presence.h === 1);
      hs.sort((a, b) => (a.presence.jt || 0) - (b.presence.jt || 0) || (a.peer < b.peer ? -1 : 1));
      return hs[0] || null;
    }
    _humans() { return this._peers().filter(p => p.presence && typeof p.presence.n === 'string').sort((a, b) => (a.presence.jt || 0) - (b.presence.jt || 0)); }
    _update() {
      if (!this.r) return;
      const me = this._peers().find(p => p.sameTab); if (me) this.myPeer = me.peer;
      const hp = this._hostPeer();
      if (!hp) {
        if (this.hadHost && !this.isHost) { this.cb.error('O anfitrião saiu da sala.'); this.leave(); if (this.cb.left) this.cb.left(); }
        return;
      }
      this.hadHost = true;
      if (this.isHost && this.myPeer && hp.peer !== this.myPeer) this.isHost = false;
      const H = hp.presence;
      const cpus = this.isHost ? this.cpus : (Array.isArray(H.cpu) ? H.cpu : []);
      const members = this._humans().map(p => ({ id: p.peer, name: String(p.presence.n).slice(0, 16) || 'Jogador', char: CH[p.presence.c] ? p.presence.c : 'mare', cpu: false }));
      cpus.forEach((c, i) => members.push({ id: 'cpu' + i, name: String(c[0]).slice(0, 16), char: CH[c[1]] ? c[1] : 'mare', cpu: true, lvl: c[2] | 0 }));
      this.cb.lobby({ code: this.code, hostId: hp.peer, meId: this.myPeer, isHost: this.isHost, stocks: (this.isHost ? this.stocks : H.st | 0) || 3, stage: this.isHost ? this.stage : (S.STAGES[H.sg] ? H.sg : S.STAGE_KEYS[0]), playing: H.ph === 'game', members });
      if (this.isHost) { this._advertise(); return; }
      if (H.ph === 'game' && Array.isArray(H.ro) && H.gid && H.gid !== this.seenGid) {
        this.seenGid = H.gid; this.lastK = -1;
        const roster = H.ro.slice(0, MAXP).map(r => ({ name: String(r[1]).slice(0, 16), char: CH[r[2]] ? r[2] : 'mare', cpu: !!r[3], peer: r[0] }));
        const you = roster.findIndex(r => r.peer && r.peer === this.myPeer);
        this.cb.start(roster, you, S.STAGES[H.sg] ? H.sg : undefined);
      }
      if (H.ph === 'game' && H.gid === this.seenGid && H.g && typeof H.g.k === 'number' && H.g.k > this.lastK) { this.lastK = H.g.k; this.cb.snap(H.g); }
      if (H.ph === 'end' && H.gid === this.seenGid && this.seenEnd !== H.gid && Array.isArray(H.res)) { this.seenEnd = H.gid; this.cb.end(H.res); }
    }
    setChar(c) { this.char = c; this._pres({ c }); }
    setStocks(n) { if (!this.isHost) return; this.stocks = n; this._pres({ st: n }); this._update(); }
    setStage(k) { if (!this.isHost || !S.STAGES[k]) return; this.stage = k; this._pres({ sg: k }); this._update(); }
    addCpu(lvl) {
      if (!this.isHost) return;
      if (this._humans().length + this.cpus.length >= MAXP) { toast('A sala já tem ' + MAXP + ' lutadores.'); return; }
      const k = S.CHAR_KEYS[Math.floor(Math.random() * S.CHAR_KEYS.length)];
      this.cpus.push(['CPU ' + ['Fácil', 'Normal', 'Difícil'][lvl - 1], k, lvl]);
      this._pres({ cpu: this.cpus }); this._update();
    }
    rmCpu(id) { if (!this.isHost) return; const i = parseInt(String(id).slice(3), 10); this.cpus.splice(i, 1); this._pres({ cpu: this.cpus }); this._update(); }
    start() {
      if (!this.isHost || this.sim) return;
      let ro = this._humans().map(p => [p.peer, String(p.presence.n).slice(0, 16), CH[p.presence.c] ? p.presence.c : 'mare', 0, 2]);
      this.cpus.forEach(c => ro.push(['', c[0], c[1], 1, c[2]]));
      ro = ro.slice(0, MAXP);
      if (ro.length < 2) { toast('Precisa de pelo menos 2 lutadores (chame um amigo ou adicione CPU).'); return; }
      this.gid = (Date.now() % 1000000000) || 1;
      const roster = ro.map(r => ({ name: r[1], char: r[2], cpu: !!r[3], lvl: r[4] || 2, peer: r[0] }));
      this.ro = ro; this.peerIdx = {}; roster.forEach((r, i) => { if (r.peer) this.peerIdx[r.peer] = i; });
      this.myIdx = this.peerIdx[this.myPeer];
      this.sim = S.createGame(roster, { stocks: this.stocks, stage: this.stage, seed: Math.floor(Math.random() * 1e9) });
      this.last = performance.now(); this.endAt = 0; this.missing = {};
      this._pres({ ph: 'game', gid: this.gid, ro: ro.map(r => r.slice(0, 4)), g: S.snapshot(this.sim), res: null });
      this._advertise();
      this.cb.start(roster, this.myIdx === undefined ? -1 : this.myIdx, this.stage);
      clearInterval(this.loop); this.loop = setInterval(() => this._tick(), 4);
    }
    _tick() {
      const s = this.sim; if (!s) return;
      const now = performance.now();
      const peers = this._peers(), present = new Set();
      for (const p of peers) {
        present.add(p.peer);
        const i = this.peerIdx[p.peer];
        if (i === undefined || p.peer === this.myPeer) continue;
        const inp = p.presence && p.presence.i;
        if (Array.isArray(inp)) S.setInput(s, i, { h: inp[0], c: inp.slice(1, 6) });
      }
      this.ro.forEach((r, i) => {
        if (!r[0] || r[0] === this.myPeer || s.players[i].out) return;
        if (present.has(r[0])) { delete this.missing[r[0]]; return; }
        if (!this.missing[r[0]]) this.missing[r[0]] = now;
        else if (now - this.missing[r[0]] > 5000) S.removePlayer(s, i);
      });
      if (this.myIdx !== undefined) S.setInput(s, this.myIdx, this.localInput);
      let n = 0;
      while (now - this.last >= STEP && n < 8) {
        S.step(s); this.last += STEP; n++;
        const snap = S.snapshot(s); this.cb.snap(snap);
        if (s.tick % 2 === 0) this._pres({ g: snap });
      }
      if (n >= 8) this.last = now;
      if (s.over && !this.endAt) this.endAt = now + 3500;
      if (this.endAt && now >= this.endAt) {
        const res = S.results(s);
        clearInterval(this.loop); this.sim = null; this.advKey = '';
        this._pres({ ph: 'end', res, g: null });
        this.cb.end(res);
        setTimeout(() => { if (this.r && this.isHost && !this.sim) this._pres({ ph: 'lobby' }); this._advertise(); }, 1500);
      }
    }
    input(inp) {
      if (this.isHost) { this.localInput = inp; return; }
      const k = inp.h + ',' + inp.c.join(',');
      if (k !== this.lastIn) { this.lastIn = k; this._pres({ i: [inp.h].concat(inp.c) }); }
    }
    leave() {
      clearInterval(this.loop); this.sim = null;
      if (this.isHost) this.room.presence({ sala: null, n: null, cnt: null, pl: null }).catch(() => {});
      this.advKey = '';
      if (this.r) { const r = this.r; this.r = null; r.leave().catch(() => {}); }
      this.isHost = false; this.hadHost = false;
    }
    info() { return this.isHost ? 'você é o anfitrião' : ''; }
    delay() { return this.isHost ? 1.2 : 6; }
    inviteText(code) { return 'Bora jogar Tumulto! Abra a página do jogo, clique em "Jogar online" e entre na sala ' + code; }
  }

  // ------------------------------------------------------------ aplicação / telas
  const App = {
    screen: 'title', inGame: false, kind: null, local: null, net: null, buf: null, roster: null, me: -1,
    pads: [], paused: false, lobby: null, sel: null, endAt: 0, lastCd: 0, goT: 0, demo: null, demoRoster: null, roomOk: null,
  };

  function show(name) {
    App.screen = name;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === 'scr-' + name));
    $('ui').style.display = name ? 'flex' : 'none';
    if (name === 'online') refreshRooms();
  }
  function myName() {
    const v = $('in-name').value.trim().replace(/[^\p{L}\p{N} _\-.]/gu, '').slice(0, 16);
    return v || 'Jogador';
  }
  $('in-name').value = store.get('name', '');
  $('in-name').addEventListener('change', () => store.set('name', $('in-name').value.trim()));

  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    Sfx.init(); Sfx.ui();
    const go = b.dataset.go;
    if (go === 'cpu' || go === 'local') startSelect(go);
    else if (go === 'online') goOnline();
    else show(go);
  }));

  // arte dos personagens (public/chars): card grande e rosto
  const CHAR_ART = {
    brasa: { tint: '#3a1216', ico: '<path d="M12 2c1 3.2-1.6 4.6-1.6 7.4 0 1.3.8 2.3 1.8 2.6-.4-1.6.6-3 1.8-3.8.2 2.2 2.6 3.2 2.6 6.2A4.6 4.6 0 0 1 12 19a4.6 4.6 0 0 1-4.6-4.6c0-4 3.4-6.2 3.4-9.4 0-1 .4-2.2 1.2-3z" fill="currentColor"/>' },
    tora: { tint: '#14281a', ico: '<path d="M2 19 9 7l3.2 5.2L15 8l7 11z" fill="currentColor"/><path d="M9 7l1.8 3H7.2z" fill="#14281a" opacity=".55"/>' },
    lume: { tint: '#211a48', ico: '<path d="M12 2c.6 5 2 7.4 7 8.6v.8c-5 1.2-6.4 3.6-7 8.6h-.8c-.6-5-2-7.4-7-8.6v-.8c5-1.2 6.4-3.6 7-8.6z" fill="currentColor"/>' },
    mare: { tint: '#0e2246', ico: '<path d="M12 2.5S5.5 10 5.5 14.2a6.5 6.5 0 0 0 13 0C18.5 10 12 2.5 12 2.5z" fill="currentColor"/><path d="M9 14.5a3 3 0 0 0 3 3" stroke="#fff" stroke-width="1.4" fill="none" opacity=".7"/>' },
  };
  const HEAD_IMG = {};
  for (const k of S.CHAR_KEYS) { const im = new Image(); im.src = 'chars/' + k + '-head.webp'; HEAD_IMG[k] = im; }
  function headImg(key, size) {
    const im = document.createElement('img'); im.src = 'chars/' + key + '-head.webp'; im.alt = CH[key].name; im.className = 'head'; im.width = size; im.height = size; return im;
  }

  // seleção de personagem
  const portraits = [];
  function makePortrait(key, size) {
    const c = document.createElement('canvas'); c.width = size; c.height = size; c.dataset.key = key;
    portraits.push(c); return c;
  }
  function drawPortraits(now) {
    const t = now / STEP;
    for (const c of portraits) {
      if (!c.offsetParent) continue;
      const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
      const key = c.dataset.key, C = CH[key];
      const sc = c.width / (C.h * 1.55);
      x.save(); x.translate(c.width * 0.46, c.height * 0.88); x.scale(sc, sc);
      drawFighterPro(x, key, { x: 0, y: 0, face: 1, st: 0, mv: -1, mf: 0, ch: 0, fl: 2 | 128, vx: 0, vy: 0 }, t + key.length * 13);
      x.restore();
    }
  }
  const STATS = [['Velocidade', C => (C.run - 5) / 2.6], ['Força', C => (C.power - 0.85) / 0.35], ['Peso', C => (C.weight - 0.75) / 0.5], ['Alcance', C => C.reach / 5], ['Pulos', C => (C.airJumps - 1) / 2.2]];
  (function buildCards() {
    const wrap = $('sel-chars');
    for (const key of S.CHAR_KEYS) {
      const C = CH[key];
      const A = CHAR_ART[key];
      const d = document.createElement('div'); d.className = 'card'; d.dataset.key = key; d.style.setProperty('--c', C.color); d.style.setProperty('--tint', A.tint);
      d.tabIndex = 0; d.setAttribute('role', 'button'); d.setAttribute('aria-label', C.name + ', ' + C.title);
      d.innerHTML = `<div class="art"><img src="chars/${key}-card.webp" alt=""></div>
        <div class="id"><span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">${A.ico}</svg></span><div class="idt"><div class="nm">${C.name}</div><div class="tt">${C.title}</div></div></div>
        <div class="stats">${STATS.map(([n, f]) => `<div class="stat"><span>${n}</span><div class="bar"><i style="width:${Math.round(clamp(f(C), 0.08, 1) * 100)}%"></i></div></div>`).join('')}</div>`;
      d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); d.click(); } });
      d.addEventListener('click', () => { Sfx.ui(); pickChar(key); });
      wrap.appendChild(d);
    }
  })();
  document.querySelectorAll('#sel-opts .seg').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    App.sel.opts[seg.dataset.opt] = +b.dataset.v; Sfx.ui();
  }));

  function startSelect(kind) {
    App.sel = { kind, step: 0, picks: [store.get('char', 'brasa'), store.get('char2', 'tora')], opts: { cpus: kind === 'cpu' ? 1 : 0, lvl: 2, stocks: 3 }, stage: S.STAGES[store.get('stage')] ? store.get('stage') : S.STAGE_KEYS[0] };
    const segC = document.querySelector('[data-opt="cpus"]');
    const vals = kind === 'cpu' ? [1, 2, 3, 5, 9] : [0, 1, 2, 4, 8];
    segC.innerHTML = vals.map(v => `<button data-v="${v}" class="${v === App.sel.opts.cpus ? 'on' : ''}">${v}</button>`).join('');
    document.querySelectorAll('[data-opt="lvl"] button').forEach(b => b.classList.toggle('on', b.dataset.v === '2'));
    document.querySelectorAll('[data-opt="stocks"] button').forEach(b => b.classList.toggle('on', b.dataset.v === '3'));
    refreshSelect(); renderMapPicker($('sel-maps'), App.sel.stage, true); show('select');
  }
  function pickChar(key) {
    const s = App.sel; s.picks[s.step] = key;
    if (s.kind === 'local' && s.step === 0) s.step = 1; else if (s.kind === 'local') s.step = 0;
    refreshSelect();
  }
  function refreshSelect() {
    const s = App.sel;
    $('sel-title').textContent = s.kind === 'local' ? (s.step === 0 ? 'Jogador 1, escolha' : 'Jogador 2, escolha') : 'Escolha seu lutador';
    document.querySelectorAll('#sel-chars .card').forEach(c => {
      const k = c.dataset.key; c.querySelectorAll('.badge').forEach(b => b.remove());
      const tags = [];
      if (s.picks[0] === k) tags.push(['J1', SLOT[0]]);
      if (s.kind === 'local' && s.picks[1] === k) tags.push(['J2', SLOT[1]]);
      c.classList.toggle('sel', tags.length > 0);
      tags.forEach(([t, col], i) => { const b = document.createElement('span'); b.className = 'badge'; b.textContent = t; b.style.background = col; b.style.left = (8 + i * 40) + 'px'; c.appendChild(b); });
    });
    const cur = s.picks[s.step] || s.picks[0];
    $('sel-desc').textContent = CH[cur].name + ': ' + CH[cur].desc;
    $('opt-lvl').style.display = (s.kind === 'cpu' || s.opts.cpus > 0 || s.kind === 'local') ? '' : 'none';
  }
  $('sel-go').addEventListener('click', () => {
    Sfx.init(); Sfx.ui();
    const s = App.sel;
    store.set('char', s.picks[0]); if (s.kind === 'local') store.set('char2', s.picks[1]);
    const roster = [{ name: myName(), char: s.picks[0] }];
    if (s.kind === 'local') roster.push({ name: 'Jogador 2', char: s.picks[1] });
    const lvlName = ['Fácil', 'Normal', 'Difícil'][s.opts.lvl - 1];
    let pool = S.CHAR_KEYS.filter(k => !roster.some(r => r.char === k)).sort(() => Math.random() - 0.5);
    if (s.opts.cpus > pool.length) pool = pool.concat(S.CHAR_KEYS.slice().sort(() => Math.random() - 0.5));
    for (let i = 0; i < s.opts.cpus && roster.length < MAXP; i++) roster.push({ name: 'CPU ' + lvlName + (s.opts.cpus > 1 ? ' ' + (i + 1) : ''), char: pool.length ? pool[i % pool.length] : S.CHAR_KEYS[i % S.CHAR_KEYS.length], cpu: true, lvl: s.opts.lvl });
    if (roster.length < 2) roster.push({ name: 'CPU ' + lvlName, char: 'mare', cpu: true, lvl: s.opts.lvl });
    store.set('stage', s.stage);
    startLocal(s.kind, roster, s.opts.stocks, s.stage);
  });

  function startLocal(kind, roster, stocks, stage) {
    App.kind = kind;
    App.pads = kind === 'local' ? [new Pad(['a'], [0], true), new Pad(['b'], [1], false)] : [new Pad(['a', 'b'], 'all', true)];
    const pads = roster.map((r, i) => (r.cpu ? null : App.pads[i] || null));
    App.local = new LocalSession(roster, { stocks, stage, seed: Math.floor(Math.random() * 1e9) }, pads);
    App.lastRoster = { kind, roster, stocks, stage };
    enterGame(roster, 0);
  }

  function enterGame(roster, me) {
    App.roster = roster; App.me = me; App.inGame = true; App.paused = false; App.endAt = 0; App.lastCd = 0; App.goT = 0;
    fx.length = 0; cam.shake = 0;
    show(null);
    $('btn-pause').classList.remove('hide');
    $('touch').classList.toggle('on', isTouch);
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
  }
  function leaveGame() {
    App.inGame = false; App.local = null; App.buf = null; App.paused = false;
    $('pause').classList.remove('on'); $('btn-pause').classList.add('hide'); $('touch').classList.remove('on');
  }
  function togglePause() {
    if (!App.inGame) return;
    App.paused = !App.paused;
    if (App.local) App.local.paused = App.paused;
    $('pause').classList.toggle('on', App.paused);
    $('pz-quit').textContent = App.kind === 'online' ? 'Sair da sala' : 'Sair da partida';
  }
  $('btn-pause').onclick = togglePause;
  $('pz-resume').onclick = togglePause;
  $('pz-quit').onclick = () => {
    const online = App.kind === 'online';
    leaveGame();
    if (online && App.net) { App.net.leave(); App.lobby = null; show('online'); } else show('title');
  };

  function showResults(res, online) {
    leaveGame();
    const w = res.find(r => r.place === 1);
    $('rs-title').textContent = w ? w.name + ' venceu!' : 'Fim de jogo';
    $('rs-body').innerHTML = res.map(r => `<tr><td class="pos" style="color:${SLOT[r.id] || '#fff'}">${r.place}º</td><td>${esc(r.name)} <span class="muted">· ${CH[r.char] ? CH[r.char].name : ''}${r.cpu ? ' (CPU)' : ''}</span></td><td>${r.kos | 0}</td><td>${r.falls | 0}</td><td>${r.dealt | 0}%</td></tr>`).join('');
    const foot = $('rs-foot'); foot.innerHTML = '';
    const btn = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = () => { Sfx.ui(); fn(); }; foot.appendChild(b); };
    if (online) btn('Voltar à sala', '', () => { show('lobby'); renderLobby(); });
    else {
      btn('Jogar de novo', '', () => { const L = App.lastRoster; startLocal(L.kind, L.roster, L.stocks, L.stage); });
      btn('Trocar lutador', 'alt', () => startSelect(App.lastRoster.kind));
      btn('Menu', 'ghost', () => show('title'));
    }
    show('results');
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // ---- online
  const netCb = {
    lobby(L) {
      App.lobby = L;
      if (App.screen === 'online' && !App.inGame) show('lobby');
      if (App.screen === 'lobby') renderLobby();
    },
    start(roster, you, stage) {
      App.kind = 'online';
      setStage(stage || (App.lobby && App.lobby.stage));
      App.pads = [new Pad(['a', 'b'], 'all', true)];
      App.buf = new SnapBuf(App.net.delay());
      enterGame(roster, you);
      if (you < 0) toast('Partida em andamento — você está assistindo.');
    },
    snap(s) { if (App.buf) App.buf.push(s); },
    end(res) { if (App.inGame && App.kind === 'online') { App.pendingRes = res; App.endAt = performance.now() + 300; } },
    error(msg) { toast(msg, 4000); },
    rooms(list) { renderRooms(list); },
    left() { if (App.inGame) leaveGame(); App.lobby = null; show('online'); },
    closed() { if (App.screen === 'lobby' || (App.inGame && App.kind === 'online')) { toast('Conexão com o servidor caiu.', 4000); if (App.inGame) leaveGame(); App.lobby = null; show('online'); } },
  };

  async function ensureNet() {
    if (App.net) return App.net;
    if (IS_ARTIFACT) {
      const room = await RoomNet.get();
      if (!room) return null;
      App.net = new RoomNet(netCb, room);
    } else {
      if (location.protocol === 'file:') return null;
      App.net = new WSNet(netCb);
    }
    return App.net;
  }
  async function goOnline() {
    show('online');
    $('on-rooms').innerHTML = '<span class="muted">Conectando…</span>';
    const net = await ensureNet();
    const ok = !!net;
    $('on-create').disabled = !ok; $('on-join').disabled = !ok;
    if (!ok) {
      $('on-help').innerHTML = IS_ARTIFACT
        ? 'O modo online desta página só funciona aberto dentro do Claude, por pessoas com acesso a ela. Para jogar com qualquer amigo, use a versão com servidor (pasta <b>tumulto</b>, arquivo <b>iniciar.bat</b>).'
        : 'Abra o jogo pelo servidor: rode <b>iniciar.bat</b> e acesse <b>http://localhost:3000</b>.';
      $('on-rooms').innerHTML = '';
      return;
    }
    $('on-help').textContent = IS_ARTIFACT
      ? 'Crie uma sala e passe o código para quem também tem acesso a esta página.'
      : 'Crie uma sala e mande o convite para seus amigos, ou entre na sala de alguém.';
    refreshRooms();
  }
  let roomsTimer = 0;
  function refreshRooms() {
    clearTimeout(roomsTimer);
    if (App.screen !== 'online' || !App.net) return;
    App.net.listRooms();
    roomsTimer = setTimeout(refreshRooms, 3000);
  }
  function renderRooms(list) {
    const el = $('on-rooms');
    if (!list) { el.innerHTML = '<span class="muted">Não foi possível conectar ao servidor do jogo. O modo online precisa do <b>server.js</b> rodando (veja o README). CPU e 2 jogadores no mesmo PC funcionam sem ele.</span>'; return; }
    if (!list.length) { el.innerHTML = '<span class="muted">Nenhuma sala aberta agora. Crie a sua!</span>'; return; }
    el.innerHTML = '';
    for (const r of list) {
      const d = document.createElement('div'); d.className = 'room';
      d.innerHTML = `<span style="font-family:Bungee;color:var(--accent-2)">${esc(r.code)}</span><span>${esc(r.host)}</span><span class="muted">${r.n}/${MAXP}${r.playing ? ' · jogando' : ''}</span><span class="spacer"></span>`;
      const b = document.createElement('button'); b.className = 'btn alt small'; b.textContent = 'Entrar'; b.disabled = r.playing || r.n >= MAXP;
      b.onclick = () => joinRoom(r.code);
      d.appendChild(b); el.appendChild(d);
    }
  }
  async function joinRoom(code) {
    Sfx.init(); Sfx.ui();
    const net = await ensureNet(); if (!net) return;
    store.set('name', $('in-name').value.trim());
    try { await net.join(code, myName(), store.get('char', 'brasa')); } catch (e) { toast('Não consegui conectar ao servidor.'); }
  }
  $('on-create').onclick = async () => {
    Sfx.init(); Sfx.ui();
    const net = await ensureNet(); if (!net) return;
    try { await net.create(myName(), store.get('char', 'brasa')); } catch (e) { toast('Não consegui conectar ao servidor.'); }
  };
  $('on-join').onclick = () => { const c = $('in-code').value.trim().toUpperCase(); if (!c) { toast('Digite o código da sala.'); return; } joinRoom(c); };
  $('in-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('on-join').click(); });

  (function buildLobbyChars() {
    const w = $('lb-chars');
    for (const key of S.CHAR_KEYS) {
      const b = document.createElement('button'); b.dataset.key = key; b.title = CH[key].name; b.style.setProperty('--c', CH[key].color);
      b.appendChild(headImg(key, 56));
      b.onclick = () => { Sfx.ui(); store.set('char', key); if (App.net) App.net.setChar(key); };
      w.appendChild(b);
    }
  })();
  $('lb-stocks').addEventListener('click', e => { const b = e.target.closest('button'); if (b && App.net) { Sfx.ui(); App.net.setStocks(+b.dataset.v); } });
  document.querySelectorAll('[data-cpu]').forEach(b => b.onclick = () => { Sfx.ui(); if (App.net) App.net.addCpu(+b.dataset.cpu); });
  $('lb-start').onclick = () => { Sfx.init(); Sfx.ui(); if (App.net) App.net.start(); };
  $('lb-leave').onclick = () => { if (App.net) App.net.leave(); App.lobby = null; show('online'); };
  $('lb-copy').onclick = async () => {
    if (!App.lobby || !App.net) return;
    const txt2 = App.net.inviteText(App.lobby.code);
    try { await navigator.clipboard.writeText(txt2); toast('Convite copiado! Mande para seus amigos.'); }
    catch (e) { toast(txt2, 6000); }
  };

  let lobbyKey = '';
  const lobbyPortraits = {};
  function renderLobby() {
    const L = App.lobby; if (!L) return;
    const key = JSON.stringify(L);
    if (key === lobbyKey && $('lb-players').childElementCount) return;
    lobbyKey = key;
    $('lb-code').textContent = L.code;
    const list = $('lb-players'); list.innerHTML = '';
    const mine = L.members.find(m => m.id === L.meId);
    L.members.forEach((m, i) => {
      const d = document.createElement('div'); d.className = 'pl'; d.style.setProperty('--c', i < MAXP ? SLOT[i] : '#666');
      d.appendChild(headImg(m.char, 52));
      const info = document.createElement('div');
      info.innerHTML = `<div class="n">${esc(m.name)}${m.id === L.hostId ? ' 👑' : ''}${m.id === L.meId ? ' <span class="muted">(você)</span>' : ''}</div><div class="s">${CH[m.char].name}${m.cpu ? ' · CPU' : ''}${i >= MAXP ? ' · assistindo (sala cheia)' : ''}</div>`;
      d.appendChild(info);
      if (m.cpu && L.isHost) {
        const sp = document.createElement('span'); sp.className = 'spacer'; d.appendChild(sp);
        const rm = document.createElement('button'); rm.className = 'btn ghost small'; rm.textContent = 'Remover'; rm.onclick = () => App.net.rmCpu(m.id); d.appendChild(rm);
      }
      list.appendChild(d);
    });
    document.querySelectorAll('#lb-chars button').forEach(b => b.classList.toggle('on', !!mine && b.dataset.key === mine.char));
    $('lb-host').style.display = L.isHost ? '' : 'none';
    $('lb-stocks').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === L.stocks));
    renderMapPicker($('lb-maps'), L.stage || S.STAGE_KEYS[0], L.isHost);
    if (L.stage) AR && AR.load(L.stage);
    $('lb-start').disabled = L.members.length < 2;
    $('lb-wait').textContent = L.isHost
      ? (L.members.length < 2 ? 'Esperando amigos… mande o código ' + L.code + ' ou adicione uma CPU.' : (IS_ARTIFACT ? 'Você é o anfitrião: a partida roda no seu navegador, então deixe esta aba aberta e visível.' : ''))
      : (L.playing ? 'Partida em andamento…' : 'Esperando o anfitrião começar a partida. Vidas: ' + L.stocks + ' · Arena: ' + stOf(L.stage).name);
  }

  // ------------------------------------------------------------ escolha de arena
  function renderMapPicker(el, cur, editable) {
    if (!el) return;
    const key = cur + '|' + editable;
    if (el.dataset.k === key) return;
    el.dataset.k = key; el.innerHTML = '';
    for (const k of S.STAGE_KEYS) {
      const st = S.STAGES[k];
      const b = document.createElement('button'); b.type = 'button'; b.className = 'map' + (k === cur ? ' on' : ''); b.disabled = !editable && k !== cur;
      b.innerHTML = `<img alt="" src="maps/${k}/thumb.webp" onerror="this.style.visibility='hidden'"><span class="mn">${st.name}</span><span class="ms">${st.sub}</span>`;
      if (editable) b.onclick = () => {
        Sfx.ui();
        if (App.screen === 'select' && App.sel) { App.sel.stage = k; renderMapPicker(el, k, true); AR && AR.load(k); }
        else if (App.net) App.net.setStage(k);
      };
      el.appendChild(b);
    }
  }

  // ------------------------------------------------------------ demo no fundo do menu
  function newDemo() {
    const ks = S.CHAR_KEYS.slice().sort(() => Math.random() - 0.5);
    App.demoRoster = ks.map((k, i) => ({ name: CH[k].name, char: k, cpu: true, lvl: 2 + (i % 2) }));
    App.demoIdx = ((App.demoIdx == null ? Math.floor(Math.random() * S.STAGE_KEYS.length) : App.demoIdx + 1)) % S.STAGE_KEYS.length;
    App.demo = new LocalSession(App.demoRoster, { stocks: 3, noCountdown: true, stage: S.STAGE_KEYS[App.demoIdx], seed: Math.floor(Math.random() * 1e9) }, []);
  }
  newDemo();

  // ------------------------------------------------------------ laço principal
  let lastT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(100, now - lastT); lastT = now;
    let view = null, roster = null;
    if (App.inGame) {
      if (App.local) App.local.update(dt);
      if (App.kind === 'online' && App.net && App.me >= 0 && App.pads[0]) App.net.input(App.paused ? { h: 0, c: App.pads[0].c.slice() } : App.pads[0].read(), now);
      const buf = App.local ? App.local.buf : App.buf;
      view = buf ? buf.sample(now) : null;
      roster = App.roster;
      if (App.local && view && view.o != null && !App.endAt) App.endAt = now + 3200;
      if (App.endAt && now >= App.endAt) {
        App.endAt = 0;
        if (App.local) showResults(S.results(App.local.s), false);
        else if (App.pendingRes) { const r = App.pendingRes; App.pendingRes = null; showResults(r, true); }
      }
    } else if (App.vista) {
      view = null; roster = null;
    } else {
      if (App.demo.s.stage !== stageKey) setStage(App.demo.s.stage);
      App.demo.update(dt);
      if (App.demo.s.over && App.demo.s.tick - App.demo.s.over.t > 200) newDemo();
      view = App.demo.buf.sample(now); roster = App.demoRoster;
    }
    render(view, roster, now, dt, App.inGame);
    if (!App.inGame && !App.vista) { g.setTransform(DPR, 0, 0, DPR, 0, 0); g.fillStyle = 'rgba(15,8,30,.35)'; g.fillRect(0, 0, VW, VH); }
    drawPortraits(now);
    const ni = $('netinfo');
    const info = App.inGame && App.kind === 'online' && App.net ? App.net.info() : '';
    if (ni.textContent !== info) ni.textContent = info;
  }
  requestAnimationFrame(frame);

  // vista da arena sem lutadores nem menus: ?vista=<arena> (usado para gerar miniaturas)
  try {
    const q = new URLSearchParams(location.search).get('vista');
    if (q && S.STAGES[q]) { App.vista = q; setStage(q); $('ui').style.display = 'none'; $('hudbtns').style.display = 'none'; }
  } catch (e) { /* sem parâmetros */ }

  // atalho de teste: ?teste=<arena> abre uma partida contra CPUs nessa arena
  try {
    const q = new URLSearchParams(location.search).get('teste');
    if (q && S.STAGES[q]) {
      const ks = S.CHAR_KEYS;
      startLocal('cpu', [{ name: myName(), char: ks[0] }, { name: 'CPU', char: ks[1], cpu: true, lvl: 2 }, { name: 'CPU', char: ks[2], cpu: true, lvl: 2 }, { name: 'CPU', char: ks[3], cpu: true, lvl: 2 }], 3, q);
    }
  } catch (e) { /* sem parâmetros */ }

  // link de convite (?sala=XXXX)
  try {
    const q = new URLSearchParams(location.search).get('sala');
    if (q) { $('in-code').value = q.toUpperCase().slice(0, 6); goOnline(); }
  } catch (e) { /* sem parâmetros */ }

  window.__tumulto = { App, S, cam, DEBUG, setStage, drawFighter, drawFighterPro };
})();
