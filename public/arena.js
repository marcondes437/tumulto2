/* TUMULTO — renderizador das arenas.
   A arte de cada arena é um conjunto de camadas (imagens) descrito em maps/manifest.js:
     space 'screen' = fundo com parallax (cobre a tela inteira, recorta em vez de esticar)
     space 'world'  = preso ao mundo do jogo (plataformas, árvore, letreiro), alinhado às colisões
     front: true    = desenhado na frente dos lutadores
     fx: '<nome>'   = efeito animado procedural inserido nessa posição da pilha
   A física NÃO depende dessas imagens: ela vem de Sim.STAGES (sim.js). */
(function () {
  'use strict';
  const MAN = window.TUMULTO_ARENAS || {};
  const cache = {};
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function load(key) {
    const A = MAN[key];
    if (!A) return Promise.resolve(null);
    if (cache[key]) return cache[key].ready;
    const entry = { imgs: {}, ready: null, done: false };
    cache[key] = entry;
    const jobs = A.layers.filter(L => L.src).map(L => new Promise(res => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => { entry.imgs[L.src] = im; res(); }); };
      im.onerror = () => res();
      im.src = A.base + L.src + (A.v ? '?v=' + A.v : '');
    }));
    entry.ready = Promise.all(jobs).then(() => { entry.done = true; return entry; });
    return entry.ready;
  }
  function isReady(key) { return !!(cache[key] && cache[key].done); }

  // ------------------------------------------------------------ efeitos animados
  const R = (() => { let s = 99; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const fxState = {};
  function pool(name, n, mk) {
    if (!fxState[name]) { fxState[name] = []; for (let i = 0; i < n; i++) fxState[name].push(mk(i)); }
    return fxState[name];
  }

  const FX = {
    // neve caindo, duas profundidades (camada de trás e da frente)
    snow(g, c, t, o) {
      const front = !!o.front, n = front ? 26 : 90;
      const ps = pool('snow' + (front ? 'F' : 'B'), n, () => ({ x: R(), y: R(), s: front ? 2.2 + R() * 2.5 : 0.8 + R() * 1.6, v: 0.6 + R() * 0.8, ph: R() * 6.28 }));
      const dt = c.dt / 16.67;
      const par = front ? 0.9 : 0.25;
      g.fillStyle = front ? 'rgba(235,248,255,.55)' : 'rgba(225,245,255,.8)';
      for (const p of ps) {
        p.y += (front ? 0.0022 : 0.0012) * p.v * dt;
        p.x += (Math.sin(t * 0.02 + p.ph) * 0.0004 + 0.00025) * dt;
        if (p.y > 1.05) { p.y = -0.05; p.x = R(); }
        let x = ((p.x - c.dx * par * 0.0004) % 1 + 1) % 1, y = ((p.y - c.dy * par * 0.0004) % 1.1 + 1.1) % 1.1 - 0.05;
        const r = p.s * c.B;
        g.globalAlpha = front ? 0.5 : 0.35 + 0.5 * (p.s / 2.4);
        g.beginPath(); g.arc(x * c.VW, y * c.VH, r, 0, 6.283); g.fill();
      }
      g.globalAlpha = 1;
    },
    // brilhos de estrelas por cima do céu pintado
    twinkle(g, c, t, o) {
      const ps = pool('tw' + (o.top || 0.5), o.n || 40, () => ({ x: R(), y: R() * (o.top || 0.5), p: R() * 6.28, s: 0.6 + R() * 1.4, sp: 0.02 + R() * 0.05 }));
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const p of ps) {
        const a = Math.max(0, Math.sin(t * p.sp + p.p));
        if (a < 0.05) continue;
        const x = p.x * c.VW - c.dx * 0.01 * c.z, y = p.y * c.VH - c.dy * 0.01 * c.z, r = p.s * c.B * (1 + a);
        g.globalAlpha = a * 0.9; g.fillStyle = o.col || '#dff6ff';
        g.fillRect(x - r * 3, y - 0.5, r * 6, 1); g.fillRect(x - 0.5, y - r * 3, 1, r * 6);
        g.beginPath(); g.arc(x, y, r * 0.8, 0, 6.283); g.fill();
      }
      g.restore();
    },
    // estrelas cadentes ocasionais
    shooting(g, c, t) {
      const st = fxState.shoot || (fxState.shoot = { next: 120, list: [] });
      st.next -= c.dt / 16.67;
      if (st.next <= 0) { st.next = 200 + R() * 400; st.list.push({ x: 0.1 + R() * 0.8, y: 0.03 + R() * 0.25, a: 0.35 + R() * 0.3, life: 1 }); }
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (let i = st.list.length - 1; i >= 0; i--) {
        const s = st.list[i]; s.life -= 0.022 * c.dt / 16.67;
        if (s.life <= 0) { st.list.splice(i, 1); continue; }
        const u = 1 - s.life, L = 0.14;
        const x = (s.x + Math.cos(s.a) * u * 0.35) * c.VW, y = (s.y + Math.sin(s.a) * u * 0.35) * c.VH;
        const gr = g.createLinearGradient(x, y, x - Math.cos(s.a) * L * c.VW, y - Math.sin(s.a) * L * c.VW);
        gr.addColorStop(0, `rgba(255,240,210,${s.life})`); gr.addColorStop(1, 'rgba(255,200,150,0)');
        g.strokeStyle = gr; g.lineWidth = 2 * c.B;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(s.a) * L * c.VW, y - Math.sin(s.a) * L * c.VW); g.stroke();
      }
      g.restore();
    },
    // partículas de luz subindo (vagalumes / brasas)
    motes(g, c, t, o) {
      const ps = pool('motes' + (o.col || ''), o.n || 40, () => ({ x: R(), y: R(), v: 0.4 + R(), s: 1 + R() * 2.2, p: R() * 6.28 }));
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const p of ps) {
        p.y -= 0.0007 * p.v * c.dt / 16.67;
        if (p.y < -0.05) { p.y = 1.05; p.x = R(); }
        const x = ((p.x + Math.sin(t * 0.01 + p.p) * 0.01 - c.dx * 0.0002) % 1 + 1) % 1 * c.VW;
        const y = p.y * c.VH;
        const a = 0.35 + 0.35 * Math.sin(t * 0.05 + p.p);
        const r = p.s * c.B;
        const gr = g.createRadialGradient(x, y, 0, x, y, r * 4);
        gr.addColorStop(0, o.col || 'rgba(255,210,140,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
      }
      g.restore();
    },
    // pássaros cruzando o céu de vez em quando
    birds(g, c, t) {
      const st = fxState.birds || (fxState.birds = { next: 60, flocks: [] });
      st.next -= c.dt / 16.67;
      if (st.next <= 0) {
        st.next = 500 + R() * 600;
        const dir = R() < 0.5 ? 1 : -1, n = 3 + Math.floor(R() * 4), y = 0.12 + R() * 0.25;
        st.flocks.push({ dir, x: dir > 0 ? -0.1 : 1.1, y, b: Array.from({ length: n }, (_, i) => [i * 0.018 + R() * 0.01, (i % 2 ? 1 : -1) * i * 0.008 + R() * 0.006, R() * 6]) });
      }
      g.save(); g.strokeStyle = 'rgba(60,80,110,.75)'; g.lineWidth = 1.6 * c.B; g.lineCap = 'round';
      for (let i = st.flocks.length - 1; i >= 0; i--) {
        const f = st.flocks[i]; f.x += f.dir * 0.0008 * c.dt / 16.67;
        if (f.x < -0.3 || f.x > 1.3) { st.flocks.splice(i, 1); continue; }
        for (const b of f.b) {
          const x = (f.x - f.dir * b[0]) * c.VW, y = (f.y + b[1]) * c.VH, w = 6 * c.B, fl = Math.sin(t * 0.35 + b[2]) * 3 * c.B;
          g.beginPath(); g.moveTo(x - w, y - fl); g.quadraticCurveTo(x - w * 0.4, y - 2 * c.B, x, y); g.quadraticCurveTo(x + w * 0.4, y - 2 * c.B, x + w, y - fl); g.stroke();
        }
      }
      g.restore();
    },
    // holofotes varrendo o céu (cidade)
    searchlights(g, c, t, o) {
      const beams = o.beams || [[0.12, 0.3, '#7fd8ff'], [0.2, 1.7, '#c58bff'], [0.86, 2.6, '#7fd8ff'], [0.78, 4.1, '#ff8ad8']];
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const [bx, ph, col] of beams) {
        const x0 = bx * c.VW - c.dx * 0.05 * c.z, y0 = c.VH * 1.02;
        const a = -Math.PI / 2 + Math.sin(t * 0.008 + ph) * 0.42, L = c.VH * 1.3, w = 0.05;
        const gr = g.createLinearGradient(x0, y0, x0 + Math.cos(a) * L, y0 + Math.sin(a) * L);
        gr.addColorStop(0, hexA(col, 0.22)); gr.addColorStop(1, hexA(col, 0));
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(x0, y0);
        g.lineTo(x0 + Math.cos(a - w) * L, y0 + Math.sin(a - w) * L);
        g.lineTo(x0 + Math.cos(a + w) * L, y0 + Math.sin(a + w) * L); g.closePath(); g.fill();
      }
      g.restore();
    },
    // tráfego aéreo: faixas de luzes atravessando o céu
    traffic(g, c, t) {
      const lanes = pool('lanes', 5, i => ({ y: 0.14 + i * 0.075 + R() * 0.03, sp: (0.4 + R() * 0.8) * (i % 2 ? 1 : -1), d: 0.5 + i * 0.12, cars: Array.from({ length: 5 + Math.floor(R() * 5) }, () => [R(), R() < 0.5 ? '#ff6ad5' : (R() < 0.5 ? '#7ff0ff' : '#ffd36b')]) }));
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const L of lanes) {
        const y = L.y * c.VH - c.dy * 0.02 * c.z * L.d;
        for (const car of L.cars) {
          car[0] = (car[0] + L.sp * 0.00025 * c.dt / 16.67 + 1) % 1;
          const x = ((car[0] - c.dx * 0.00004 * L.d) % 1 + 1) % 1 * c.VW;
          const len = 26 * c.B * L.d * Math.sign(L.sp);
          const gr = g.createLinearGradient(x, y, x - len, y);
          gr.addColorStop(0, hexA(car[1], 0.95)); gr.addColorStop(1, hexA(car[1], 0));
          g.strokeStyle = gr; g.lineWidth = 2.2 * c.B * L.d;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x - len, y); g.stroke();
        }
      }
      g.restore();
    },
    // luzes vermelhas piscando em antenas (posições normalizadas na camada)
    beacons(g, c, t, o) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const [x, y, ph] of o.pts || []) {
        const on = Math.sin(t * 0.06 + ph) > 0.6;
        if (!on) continue;
        const px = x * c.VW - c.dx * (o.par || 0.04) * c.z, py = y * c.VH - c.dy * (o.par || 0.04) * c.z, r = 7 * c.B;
        const gr = g.createRadialGradient(px, py, 0, px, py, r);
        gr.addColorStop(0, 'rgba(255,90,90,1)'); gr.addColorStop(1, 'rgba(255,40,40,0)');
        g.fillStyle = gr; g.fillRect(px - r, py - r, r * 2, r * 2);
      }
      g.restore();
    },
  };
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

  // intensidade animada de uma camada brilhante
  function animAlpha(L, t) {
    const a = L.alpha == null ? 1 : L.alpha;
    if (L.anim === 'pulse') return a * (0.75 + 0.25 * Math.sin(t * (L.speed || 0.04) + (L.phase || 0)));
    if (L.anim === 'flicker') {
      const k = Math.floor(t / 3 + (L.phase || 0) * 50);
      const h = Math.sin(k * 12.9898 + (L.phase || 0) * 78.233) * 43758.5453;
      const r = h - Math.floor(h);
      const buzz = 0.92 + 0.08 * Math.sin(t * 0.9);
      return a * (r < (L.drop || 0.03) ? 0.25 : buzz);
    }
    return a;
  }

  // ------------------------------------------------------------ desenho
  // c = { VW, VH, B (escala base), z (zoom total), cx, cy (centro da câmera), dx, dy (desvio do centro padrão), dt }
  function drawScreenLayer(g, im, L, c, t) {
    const iw = im.width, ih = im.height;
    const zoomK = 1 + (L.zoom || 0) * (c.zr - 1);
    const m = 1.06 + (L.par || 0) * 2.2;
    let s = Math.max(c.VW / iw, c.VH / ih) * m * Math.max(0.92, zoomK);
    const dw = iw * s, dh = ih * s;
    const mx = (dw - c.VW) / 2, my = (dh - c.VH) / 2;
    let ox = -c.dx * (L.par || 0) * c.z, oy = -c.dy * (L.par || 0) * c.z;
    ox = clamp(ox, -mx, mx); oy = clamp(oy, -my, my);
    const x = (c.VW - dw) / 2 + ox, y = (c.VH - dh) / 2 + oy + (L.oy || 0) * dh;
    g.globalAlpha = animAlpha(L, t);
    if (L.scroll) {
      let off = ((t * L.scroll * s) % dw + dw) % dw;
      g.drawImage(im, x + off - dw, y, dw, dh);
      g.drawImage(im, x + off, y, dw, dh);
    } else g.drawImage(im, x, y, dw, dh);
    g.globalAlpha = 1;
  }
  function drawWorldLayer(g, im, L, c, t) {
    g.globalAlpha = animAlpha(L, t);
    g.drawImage(im, L.x, L.y, L.w, L.h);
    g.globalAlpha = 1;
  }

  // pass: 'back' (antes do mundo), 'world' (preso ao mundo, atrás dos lutadores), 'front' (na frente)
  function draw(g, key, pass, c, t, worldXf) {
    const A = MAN[key], E = cache[key];
    if (!A) return false;
    if (!E || !E.done) { if (!E) load(key); if (pass === 'back') { g.fillStyle = A.fallback || '#203050'; g.fillRect(0, 0, c.VW, c.VH); } return false; }
    for (const L of A.layers) {
      const space = L.space || 'screen';
      const lpass = L.front ? 'front' : space === 'world' ? 'world' : 'back';
      if (lpass !== pass) continue;
      if (L.blend) g.globalCompositeOperation = L.blend;
      if (L.fx) {
        if (space === 'world') { g.save(); worldXf(); }
        FX[L.fx] && FX[L.fx](g, c, t, L);
        if (space === 'world') g.restore();
      } else {
        const im = E.imgs[L.src];
        if (im) {
          if (space === 'world') { g.save(); worldXf(); drawWorldLayer(g, im, L, c, t); g.restore(); }
          else drawScreenLayer(g, im, L, c, t);
        }
      }
      g.globalCompositeOperation = 'source-over';
    }
    return true;
  }

  window.Arena = { load, isReady, draw, manifest: MAN, FX };
})();
