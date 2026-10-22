/* Biblioteca de pintura procedural usada para gerar (assar) as camadas das arenas.
   Roda no Chromium (tools/bake-maps.js). Nada aqui roda durante o jogo. */
window.P = (() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    const f = () => { s = (s + 0x6D2B79F5) | 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.r = (a, b) => a + (b - a) * f();
    f.i = (a, b) => Math.floor(a + (b - a + 1) * f());
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    return f;
  }
  function cv(w, h) { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; }

  // ---------------------------------------------------------------- cor
  function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hex(r, g, b) { return '#' + ((1 << 24) | (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)).toString(16).slice(1); }
  function mix(a, b, t) { const A = rgb(a), B = rgb(b); return hex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }
  function rgba(h, a) { const c = rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
  function jitterCol(h, R, amt) { const c = rgb(h); const k = (R() - 0.5) * amt; return hex(c[0] * (1 + k), c[1] * (1 + k), c[2] * (1 + k)); }

  // ---------------------------------------------------------------- ruído
  function Noise(seed) {
    const R = rng(seed), p = new Uint16Array(512), vals = new Float32Array(256);
    const perm = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    for (let i = 0; i < 256; i++) vals[i] = R();
    const v = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf), X = xi & 255, Y = yi & 255;
      const a = vals[p[p[X] + Y]], b = vals[p[p[X + 1] + Y]], c = vals[p[p[X] + Y + 1]], d = vals[p[p[X + 1] + Y + 1]];
      return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
    };
    const fbm = (x, y, o = 5, gain = 0.5) => { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * v(x * f + i * 17.3, y * f - i * 9.1); n += a; a *= gain; f *= 2.03; } return s / n; };
    return { v, fbm };
  }
  // textura de ruído (calculada em resolução reduzida e ampliada suavemente)
  function noiseTex(w, h, o) {
    o = Object.assign({ scale: 0.01, oct: 5, seed: 1, lo: 0, hi: 255, alpha: 255, sx: 1, sy: 1, res: 0.5, gamma: 1, warp: 0, colorA: null, colorB: null }, o);
    const W = Math.max(2, Math.round(w * o.res)), H = Math.max(2, Math.round(h * o.res));
    const N = Noise(o.seed), c = cv(W, H), x = c.getContext('2d'), id = x.createImageData(W, H), d = id.data;
    const A = o.colorA ? rgb(o.colorA) : null, Bc = o.colorB ? rgb(o.colorB) : null;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      let px = i / o.res * o.scale * o.sx, py = j / o.res * o.scale * o.sy;
      if (o.warp) { const q = N.fbm(px * 0.5 + 3.1, py * 0.5 - 1.7, 3); px += q * o.warp; py += q * o.warp * 0.6; }
      let n = N.fbm(px, py, o.oct);
      n = clamp((n - 0.2) / 0.6, 0, 1);
      if (o.gamma !== 1) n = Math.pow(n, o.gamma);
      const k = (j * W + i) * 4;
      if (A) { d[k] = lerp(A[0], Bc[0], n); d[k + 1] = lerp(A[1], Bc[1], n); d[k + 2] = lerp(A[2], Bc[2], n); d[k + 3] = o.alpha; }
      else { const g = lerp(o.lo, o.hi, n); d[k] = d[k + 1] = d[k + 2] = g; d[k + 3] = o.alpha; }
    }
    x.putImageData(id, 0, 0);
    if (W === w && H === h) return c;
    const out = cv(w, h), ox = out.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(c, 0, 0, w, h); return out;
  }
  // granulado fino (pixel a pixel)
  function grain(w, h, amt, seed) {
    const R = rng(seed || 3), c = cv(w, h), x = c.getContext('2d'), id = x.createImageData(w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = 128 + (R() - 0.5) * 255 * amt; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    x.putImageData(id, 0, 0); return c;
  }
  // aplica uma textura sobre o que já está desenhado, só onde há pixels (source-atop)
  function overlayTex(g, tex, mode, alpha, x, y, w, h) {
    g.save(); g.globalCompositeOperation = mode || 'overlay'; g.globalAlpha = alpha == null ? 0.3 : alpha;
    g.drawImage(tex, x || 0, y || 0, w || tex.width, h || tex.height); g.restore();
  }
  function blurred(src, px) {
    const c = cv(src.width, src.height), x = c.getContext('2d');
    x.filter = `blur(${px}px)`; x.drawImage(src, 0, 0); x.filter = 'none'; return c;
  }
  // restringe uma pintura à silhueta já existente em "c" (para texturas e luz)
  function within(c, fn) {
    const t = cv(c.width, c.height), x = t.getContext('2d');
    fn(x, t);
    const g = c.getContext('2d');
    g.save(); g.globalCompositeOperation = 'source-atop'; g.drawImage(t, 0, 0); g.restore();
  }

  // mistura uma textura (overlay/soft-light...) preservando a transparência original
  function texturize(c, tex, mode, alpha) {
    const keep = cv(c.width, c.height); keep.getContext('2d').drawImage(c, 0, 0);
    const g = c.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = mode; g.globalAlpha = alpha; g.drawImage(tex, 0, 0, c.width, c.height);
    g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.drawImage(keep, 0, 0);
    g.restore();
  }

  // ---------------------------------------------------------------- formas
  function smooth(g, pts, closed) {
    const n = pts.length; if (n < 2) return;
    g.beginPath();
    if (closed) {
      const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
      g.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
      g.closePath();
    } else {
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) { const a = pts[i], b = pts[i + 1]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
      g.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
  }
  function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
  function blobPts(cx, cy, rx, ry, n, jit, R, rot) {
    const pts = [], ph = R() * TAU;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (rot || 0);
      const k = 1 + (R() - 0.5) * jit + Math.sin(a * 3 + ph) * jit * 0.25;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return pts;
  }
  // linha subdividida com deslocamento (bordas orgânicas)
  function roughPts(x0, y0, x1, y1, seg, jit, R) {
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1;
      const j = (i === 0 || i === seg) ? 0 : (R() - 0.5) * jit;
      pts.push([lerp(x0, x1, t) + nx / l * j, lerp(y0, y1, t) + ny / l * j]);
    }
    return pts;
  }
  // cume de montanha por deslocamento do ponto médio
  function ridge(R, x0, x1, y0, y1, rough, depth) {
    let pts = [[x0, y0], [x1, y1]];
    let amp = (x1 - x0) * rough;
    for (let d = 0; d < depth; d++) {
      const np = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        np.push(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (R() - 0.5) * amp]);
      }
      np.push(pts[pts.length - 1]); pts = np; amp *= 0.55;
    }
    return pts;
  }

  // ---------------------------------------------------------------- elementos
  // nuvem pintada (cel shading): cada bolha recebe sombra, meio-tom e luz deslocados para a fonte de luz;
  // bolhas da frente cobrem as de trás e deixam um crescente de sombra que dá volume. Renderiza em buffer próprio.
  function cloud(g, x, y, w, h, R, pal, o) {
    o = Object.assign({ n: 14, light: [-0.55, -0.8], soft: 1.2, flat: true }, o);
    const puffs = [];
    for (let i = 0; i < o.n; i++) {
      const u = R();
      const px = x + (u - 0.5) * w * 0.9;
      const bell = 1 - Math.pow((u - 0.5) * 2, 2);
      const r = h * (0.14 + 0.5 * Math.pow(bell, 1.5)) * (0.6 + R() * 0.8);
      const py = y + h * 0.5 - r * (0.3 + R() * 0.45) - bell * h * 0.35 * R();
      puffs.push([px, py, r]);
    }
    puffs.sort((a, b) => a[1] - b[1]);
    const pad = h * 0.6 + 8, bx = x - w / 2 - pad, by = y - h * 1.3 - pad, bw = w + pad * 2, bh = h * 1.8 + pad * 2;
    const base = y + h * 0.5;
    const k = Math.max(0.25, Math.min(1, 1600 / Math.max(bw, bh)));
    const c = cv(Math.ceil(bw * k), Math.ceil(bh * k)), t = c.getContext('2d');
    t.scale(k, k); t.translate(-bx, -by);
    const lx = o.light[0], ly = o.light[1];
    const midShadow = mix(pal.mid, pal.shadow, 0.35), crescent = mix(pal.mid, pal.shadow, 0.6);
    for (const [px, py, r] of puffs) {
      t.fillStyle = crescent; t.beginPath(); t.arc(px, py, r, 0, TAU); t.fill();
      t.fillStyle = midShadow; t.beginPath(); t.arc(px + lx * r * 0.06, py + ly * r * 0.06, r * 0.94, 0, TAU); t.fill();
      t.fillStyle = pal.mid; t.beginPath(); t.arc(px + lx * r * 0.14, py + ly * r * 0.14, r * 0.84, 0, TAU); t.fill();
      const gr = t.createRadialGradient(px + lx * r * 0.42, py + ly * r * 0.42, 0, px + lx * r * 0.3, py + ly * r * 0.3, r * 0.62);
      gr.addColorStop(0, pal.light); gr.addColorStop(0.75, pal.light); gr.addColorStop(1, rgba(pal.light, 0));
      t.fillStyle = gr; t.beginPath(); t.arc(px + lx * r * 0.3, py + ly * r * 0.3, r * 0.62, 0, TAU); t.fill();
    }
    t.globalCompositeOperation = 'source-atop';
    const vg = t.createLinearGradient(0, y - h * 0.3, 0, base);
    vg.addColorStop(0, rgba(pal.shadow, 0)); vg.addColorStop(0.65, rgba(pal.shadow, 0.2)); vg.addColorStop(1, rgba(pal.base || pal.shadow, 0.75));
    t.fillStyle = vg; t.fillRect(bx, y - h * 0.3, bw, base - y + h * 0.3 + 1);
    if (o.flat) { t.globalCompositeOperation = 'destination-out'; t.fillStyle = '#000'; t.fillRect(bx, base, bw, bh); }
    const img = o.soft ? blurred(c, o.soft * k) : c;
    g.drawImage(img, bx, by, bw, bh);
  }

  function stars(g, w, h, n, R, o) {
    o = Object.assign({ maxY: 0.6, col: '#ffffff', big: 0.04 }, o);
    for (let i = 0; i < n; i++) {
      const x = R() * w, yy = Math.pow(R(), 1.6) * h * o.maxY, s = R();
      const r = s < 0.85 ? 0.6 + R() * 0.9 : 1.2 + R() * 1.6;
      g.globalAlpha = 0.35 + R() * 0.65; g.fillStyle = o.col;
      g.beginPath(); g.arc(x, yy, r, 0, TAU); g.fill();
      if (R() < o.big) {
        const L = 6 + R() * 14; g.globalAlpha = 0.55;
        const gr = g.createRadialGradient(x, yy, 0, x, yy, L);
        gr.addColorStop(0, rgba(o.col, 0.6)); gr.addColorStop(1, rgba(o.col, 0));
        g.fillStyle = gr; g.fillRect(x - L, yy - L, L * 2, L * 2);
        g.fillStyle = o.col; g.fillRect(x - L, yy - 0.6, L * 2, 1.2); g.fillRect(x - 0.6, yy - L, 1.2, L * 2);
      }
    }
    g.globalAlpha = 1;
  }

  // muro de pedras irregulares (cantaria). Pinta dentro do retângulo dado.
  function stoneWall(g, x, y, w, h, R, pal, o) {
    o = Object.assign({ rowH: [26, 40], stoneW: [44, 90], gap: 3.5, round: 9, bevel: 0.35, light: 'top' }, o);
    g.save();
    g.fillStyle = pal.mortar; g.fillRect(x, y, w, h);
    let yy = y - R() * 10;
    while (yy < y + h) {
      const rh = R.r(o.rowH[0], o.rowH[1]);
      let xx = x - R() * o.stoneW[1];
      while (xx < x + w) {
        const sw = R.r(o.stoneW[0], o.stoneW[1]);
        const gx = xx + o.gap / 2, gy = yy + o.gap / 2, ww = sw - o.gap, hh = rh - o.gap;
        const pts = [];
        const jj = Math.min(ww, hh) * 0.12;
        const corners = [[gx, gy], [gx + ww, gy], [gx + ww, gy + hh], [gx, gy + hh]];
        for (let k = 0; k < 4; k++) {
          const a = corners[k], b = corners[(k + 1) % 4];
          for (let s = 0; s < 3; s++) { const t = s / 3; pts.push([lerp(a[0], b[0], t) + (R() - 0.5) * jj, lerp(a[1], b[1], t) + (R() - 0.5) * jj]); }
        }
        const base = jitterCol(R() < 0.15 ? pal.alt || pal.stone : pal.stone, R, 0.22);
        smooth(g, pts, true);
        const gr = g.createLinearGradient(gx, gy, gx + ww * 0.3, gy + hh);
        gr.addColorStop(0, mix(base, pal.light, o.bevel)); gr.addColorStop(0.45, base); gr.addColorStop(1, mix(base, pal.dark, 0.55));
        g.fillStyle = gr; g.fill();
        // aresta iluminada superior
        g.save(); g.clip();
        g.strokeStyle = rgba(pal.light, 0.55); g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(gx + 3, gy + 2.5); g.lineTo(gx + ww - 4, gy + 2.5); g.stroke();
        g.strokeStyle = rgba(pal.dark, 0.6); g.lineWidth = 3;
        g.beginPath(); g.moveTo(gx + 2, gy + hh - 1); g.lineTo(gx + ww - 1, gy + hh - 1); g.lineTo(gx + ww - 1, gy + 3); g.stroke();
        // rachaduras e manchas
        if (R() < 0.35) { g.strokeStyle = rgba(pal.dark, 0.5); g.lineWidth = 1.2; g.beginPath(); let cx2 = gx + R() * ww, cy2 = gy + R() * hh * 0.3; g.moveTo(cx2, cy2); for (let k = 0; k < 4; k++) { cx2 += (R() - 0.5) * 14; cy2 += R() * 9; g.lineTo(cx2, cy2); } g.stroke(); }
        for (let k = 0; k < 3; k++) { g.fillStyle = rgba(R() < 0.5 ? pal.light : pal.dark, 0.12); g.beginPath(); g.ellipse(gx + R() * ww, gy + R() * hh, 3 + R() * 9, 2 + R() * 5, R() * 3, 0, TAU); g.fill(); }
        g.restore();
        xx += sw;
      }
      yy += rh;
    }
    g.restore();
  }

  // franja de grama sobre uma borda horizontal (topo em y), pendendo pela frente
  function grassTop(g, x0, x1, y, R, pal, o) {
    o = Object.assign({ thick: 16, hang: 22, density: 1.6, over: 14, blade: 16 }, o);
    // faixa base
    const pts = [[x0 - o.over, y + 1]];
    for (let x = x0 - o.over; x <= x1 + o.over; x += 6) pts.push([x, y + 1 + (R() - 0.5) * 1.2]);
    pts.push([x1 + o.over, y + 1]);
    for (let x = x1 + o.over; x >= x0 - o.over; x -= 10) pts.push([x, y + o.thick + R() * o.hang * (0.3 + 0.7 * Math.pow(R(), 2))]);
    smooth(g, pts, true);
    const gr = g.createLinearGradient(0, y, 0, y + o.thick + o.hang);
    gr.addColorStop(0, pal.top); gr.addColorStop(0.25, pal.mid); gr.addColorStop(1, pal.dark);
    g.fillStyle = gr; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = rgba(pal.outline || pal.dark, 0.9); g.stroke();
    // lâminas pendendo
    g.lineCap = 'round';
    const n = Math.floor((x1 - x0 + o.over * 2) * o.density / 4);
    for (let i = 0; i < n; i++) {
      const x = x0 - o.over + R() * (x1 - x0 + o.over * 2);
      const len = o.blade * (0.4 + R() * 1.1), bend = (R() - 0.5) * 10;
      const col = R() < 0.5 ? pal.mid : R() < 0.5 ? pal.dark : pal.top;
      g.strokeStyle = col; g.lineWidth = 1.5 + R() * 2.5;
      const yy = y + o.thick * (0.4 + R() * 0.7);
      g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + bend * 0.4, yy + len * 0.6, x + bend, yy + len); g.stroke();
    }
    // tufos para cima (sem passar muito do topo da colisão)
    for (let i = 0; i < n * 0.6; i++) {
      const x = x0 - o.over * 0.5 + R() * (x1 - x0 + o.over);
      const len = 3 + R() * 7, bend = (R() - 0.5) * 6;
      g.strokeStyle = R() < 0.6 ? pal.top : pal.hi || pal.top; g.lineWidth = 1.2 + R() * 1.8;
      g.beginPath(); g.moveTo(x, y + 4); g.quadraticCurveTo(x + bend * 0.3, y + 1 - len * 0.5, x + bend, y + 2 - len); g.stroke();
    }
    // luz no topo
    g.strokeStyle = rgba(pal.hi || '#ffffff', 0.5); g.lineWidth = 2;
    g.beginPath(); g.moveTo(x0 - o.over + 6, y + 2); g.lineTo(x1 + o.over - 6, y + 2); g.stroke();
  }

  // camada de neve sobre topo (y), com bordas onduladas e "gotas" penduradas
  function snowCap(g, x0, x1, y, R, pal, o) {
    o = Object.assign({ thick: 18, drip: 26, over: 12, bumps: 0 }, o);
    const pts = [[x0 - o.over, y + o.thick * 0.6]];
    pts.push([x0 - o.over - 2, y + 4]);
    for (let x = x0 - o.over + 8; x < x1 + o.over - 8; x += 18) pts.push([x, y - (o.bumps ? R() * o.bumps : 0) + 0.5]);
    pts.push([x1 + o.over + 2, y + 4]);
    pts.push([x1 + o.over, y + o.thick * 0.6]);
    for (let x = x1 + o.over - 6; x > x0 - o.over + 6; x -= 14 + R() * 18) {
      const d = R() < 0.35 ? o.drip * (0.4 + R()) : R() * 6;
      pts.push([x, y + o.thick + d]);
      pts.push([x - 6 - R() * 6, y + o.thick + R() * 3]);
    }
    smooth(g, pts, true);
    const gr = g.createLinearGradient(0, y, 0, y + o.thick + o.drip);
    gr.addColorStop(0, pal.top); gr.addColorStop(0.35, pal.mid); gr.addColorStop(1, pal.shadow);
    g.fillStyle = gr; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = rgba(pal.outline, 0.85); g.stroke();
    // brilho superior
    g.strokeStyle = rgba('#ffffff', 0.9); g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x0 - o.over + 6, y + 2.5); g.lineTo(x1 + o.over - 6, y + 2.5); g.stroke();
    // cintilâncias
    for (let i = 0; i < (x1 - x0) / 14; i++) { g.fillStyle = rgba('#ffffff', 0.5 + R() * 0.5); g.beginPath(); g.arc(x0 + R() * (x1 - x0), y + 4 + R() * o.thick * 0.6, 0.8 + R() * 1.2, 0, TAU); g.fill(); }
  }

  // raios de luz suaves
  function rays(g, x, y, ang, spread, len, n, R, col, a) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const aa = ang + (R() - 0.5) * spread, w = 0.01 + R() * 0.04, L = len * (0.6 + R() * 0.4);
      const gr = g.createLinearGradient(x, y, x + Math.cos(aa) * L, y + Math.sin(aa) * L);
      gr.addColorStop(0, rgba(col, a * (0.5 + R() * 0.5))); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(x, y);
      g.lineTo(x + Math.cos(aa - w) * L, y + Math.sin(aa - w) * L); g.lineTo(x + Math.cos(aa + w) * L, y + Math.sin(aa + w) * L); g.closePath(); g.fill();
    }
    g.restore();
  }
  function radial(g, x, y, r, col, a, mode) {
    g.save(); if (mode) g.globalCompositeOperation = mode;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
  }
  function vgrad(g, x, y, w, h, stops) {
    const gr = g.createLinearGradient(0, y, 0, y + h);
    for (const [t, c] of stops) gr.addColorStop(t, c);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  // pincelada solta (marcas de pintura)
  function strokes(g, x, y, w, h, n, R, cols, o) {
    o = Object.assign({ len: [8, 26], width: [2, 6], ang: 0, angJ: 0.4, alpha: [0.08, 0.25] }, o);
    g.save(); g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const px = x + R() * w, py = y + R() * h, L = R.r(o.len[0], o.len[1]), a = o.ang + (R() - 0.5) * o.angJ;
      g.strokeStyle = R.pick(cols); g.globalAlpha = R.r(o.alpha[0], o.alpha[1]); g.lineWidth = R.r(o.width[0], o.width[1]);
      g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + Math.cos(a) * L * 0.5 + (R() - 0.5) * 4, py + Math.sin(a) * L * 0.5 + (R() - 0.5) * 4, px + Math.cos(a) * L, py + Math.sin(a) * L); g.stroke();
    }
    g.restore();
  }
  // tubo de neon: brilho largo + cor + núcleo claro
  function neon(g, pathFn, col, w, glow, core) {
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.globalCompositeOperation = 'lighter';
    g.shadowColor = col; g.shadowBlur = glow; g.strokeStyle = rgba(col, 0.55); g.lineWidth = w * 2.6; pathFn(); g.stroke();
    g.shadowBlur = glow * 0.5; g.strokeStyle = col; g.lineWidth = w; pathFn(); g.stroke();
    g.shadowBlur = 0; g.strokeStyle = core || '#ffffff'; g.lineWidth = Math.max(1, w * 0.38); pathFn(); g.stroke();
    g.restore();
  }

  // canvas no espaço do mundo: px por unidade = k; desenhe usando coordenadas do jogo
  function worldCanvas(x, y, w, h, k) {
    const c = cv(w * k, h * k), g = c.getContext('2d');
    g.setTransform(k, 0, 0, k, -x * k, -y * k);
    c.world = { x, y, w, h, k };
    return { c, g };
  }

  return { TAU, clamp, lerp, rng, cv, rgb, hex, mix, rgba, jitterCol, Noise, noiseTex, grain, overlayTex, blurred, within, texturize, smooth, poly, blobPts, roughPts, ridge, cloud, stars, stoneWall, grassTop, snowCap, rays, radial, vgrad, strokes, neon, worldCanvas };
})();
