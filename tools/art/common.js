/* Utilidades comuns aos pintores de arena. */
window.MAPS = {};
window.C = (() => {
  const W = 2560, H = 1440;
  const clamp = P.clamp;
  // mesma conta do jogo (game.js camDefault): enquadramento padrão da câmera
  function camDefault(id) {
    const Cm = Sim.STAGES[id].cam;
    const bw = Cm.r - Cm.l + 420, bh = Cm.b - Cm.t + 340;
    return { x: (Cm.l + Cm.r) / 2, y: (Cm.t + Cm.b) / 2, z: clamp(Math.min(1280 / bw, 720 / bh), Cm.zmin, Cm.zmax) };
  }
  // ponto do mundo -> coordenada normalizada da tela (0..1) com a câmera padrão
  function w2v(id, x, y) { const d = camDefault(id); return [0.5 + (x - d.x) * d.z / 1280, 0.5 + (y - d.y) * d.z / 720]; }
  // camada de tela: mapeia coordenadas normalizadas da tela visível para pixels da imagem
  function screen(par) {
    const c = P.cv(W, H), g = c.getContext('2d');
    const m = 1.06 + (par || 0) * 2.2;
    const U = u => W / 2 + (u - 0.5) * W / m;
    const V = v => H / 2 + (v - 0.5) * H / m;
    const S = f => f * W / m;      // tamanho relativo à largura visível
    return { c, g, m, U, V, S, W, H };
  }
  // fita afunilada ao longo de uma linha central (troncos, galhos)
  function ribbon(g, pts, w0, w1) {
    const L = [], Rr = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const w = P.lerp(w0, w1, i / (n - 1)) / 2;
      L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); Rr.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    const all = L.concat(Rr.reverse());
    P.smooth(g, all, true);
    return all;
  }
  // curva de Bézier quadrática amostrada
  function qpts(p0, p1, p2, n) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, cc = t * t; o.push([a * p0[0] + b * p1[0] + cc * p2[0], a * p0[1] + b * p1[1] + cc * p2[1]]); } return o; }
  function cpts(p0, p1, p2, p3, n) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return o; }
  // apaga gradualmente para baixo (dissolve na névoa)
  function fadeDown(g, x, y0, w, y1) {
    g.save(); g.globalCompositeOperation = 'destination-out';
    const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = gr; g.fillRect(x, y0, w, y1 - y0 + 2000); g.restore();
  }
  // borda escura de contorno ao redor de uma silhueta (desenha o caminho atual)
  function outline(g, col, w) { g.lineJoin = 'round'; g.strokeStyle = col; g.lineWidth = w; g.stroke(); }
  // cordilheira: cume por soma de picos + ruído; faces iluminadas à esquerda; neve opcional; névoa na base
  function mountains(g, o) {
    const R = P.rng(o.seed || 1), W = g.canvas.width, H = g.canvas.height;
    const xs = [], ys = [];
    const peaks = [];
    for (let i = 0; i < o.n; i++) peaks.push([-0.1 + R() * 1.2, o.h * (0.45 + R() * 0.55), o.wid * (0.5 + R() * 0.9)]);
    if (o.peaks) for (const p of o.peaks) peaks.push(p);
    const N = P.Noise(o.seed * 7 + 3);
    for (let x = -60; x <= W + 60; x += 6) {
      const u = x / W;
      let hgt = 0;
      for (const [pu, ph, pw] of peaks) { const d = (u - pu) / pw; hgt = Math.max(hgt, ph * Math.max(0, 1 - Math.pow(Math.abs(d), o.sharp || 1.25))); }
      hgt += (N.fbm(u * 18, 0.5, 4) - 0.5) * o.h * 0.12 + (N.fbm(u * 70, 3.3, 2) - 0.5) * o.h * 0.03;
      xs.push(x); ys.push(o.base - hgt * H);
    }
    const sil = () => { g.beginPath(); g.moveTo(xs[0], H + 10); for (let i = 0; i < xs.length; i++) g.lineTo(xs[i], ys[i]); g.lineTo(xs[xs.length - 1], H + 10); g.closePath(); };
    sil(); g.fillStyle = o.col; g.fill();
    g.save(); sil(); g.clip();
    // faces iluminadas: de cada pico até o vale à esquerda
    for (let i = 1; i < xs.length - 1; i++) {
      if (!(ys[i] < ys[i - 1] && ys[i] <= ys[i + 1])) continue;
      let j = i; while (j > 0 && ys[j - 1] >= ys[j] - 0.5) j--;
      if (i - j < 2) continue;
      const pts = [[xs[i], ys[i]]];
      for (let k = i; k >= j; k--) pts.push([xs[k], ys[k]]);
      const drop = (o.base - ys[i]) * (0.9 + R() * 0.3);
      pts.push([xs[j] + (xs[i] - xs[j]) * 0.2, ys[i] + drop]); pts.push([xs[i] + (R() - 0.3) * 30, ys[i] + drop * 1.1]);
      P.poly(g, pts);
      const gr = g.createLinearGradient(xs[j], ys[i], xs[i], ys[i] + drop);
      gr.addColorStop(0, P.rgba(o.lit, 0.95)); gr.addColorStop(1, P.rgba(o.lit, 0.15));
      g.fillStyle = gr; g.fill();
    }
    if (o.snow) {
      const sp = [];
      for (let i = 0; i < xs.length; i++) sp.push([xs[i], ys[i] - 2]);
      for (let i = xs.length - 1; i >= 0; i--) {
        const hgt = o.base - ys[i], depth = Math.max(0, hgt - o.snowLine * H) * (0.35 + 0.4 * N.fbm(xs[i] * 0.02, 9, 3)) + (N.v(xs[i] * 0.08, 2) - 0.5) * 14;
        sp.push([xs[i], ys[i] + Math.max(0, depth)]);
      }
      P.poly(g, sp);
      const sg = g.createLinearGradient(0, o.base - o.h * H, 0, o.base - o.snowLine * H);
      sg.addColorStop(0, P.rgba(o.snow, 0.95)); sg.addColorStop(1, P.rgba(o.snow, 0.55));
      g.fillStyle = sg; g.fill();
    }
    if (o.strokes) P.strokes(g, 0, o.base - o.h * H, W, o.h * H, o.strokes, R, [o.lit, o.col, o.dark || o.col], { len: [20, 90], width: [2, 7], ang: Math.PI / 2, angJ: 0.6, alpha: [0.05, 0.16] });
    if (o.fog) {
      const fg = g.createLinearGradient(0, o.base - o.h * H * (o.fogH || 0.6), 0, o.base);
      fg.addColorStop(0, P.rgba(o.fog, 0)); fg.addColorStop(1, P.rgba(o.fog, o.fogA || 0.9));
      g.fillStyle = fg; g.fillRect(0, 0, W, H);
    }
    g.restore();
    return { xs, ys };
  }
  // almofada de folhagem com borda em "escamas" (copas estilizadas)
  function cushion(g, cx, cy, w, h, R, pal, o) {
    o = Object.assign({ flatTop: null, bumps: 9, under: 0.32 }, o);
    const circles = [];
    for (let i = 0; i < o.bumps; i++) {
      const t = (i + 0.5) / o.bumps, a = Math.PI * (1 - t);
      const r = h * (0.38 + R() * 0.22) * (0.75 + 0.5 * Math.sin(t * Math.PI));
      circles.push([cx + Math.cos(a) * (w / 2 - r * 0.6), cy - Math.sin(a) * (h * 0.75 - r * 0.6) * 0.9, r]);
    }
    const body = () => {
      g.beginPath();
      g.ellipse(cx, cy, w / 2, h * o.under + 6, 0, 0, P.TAU);
      for (const [x, y, r] of circles) { g.moveTo(x + r, y); g.arc(x, y, r, 0, P.TAU); }
    };
    // contorno: desenha a união engrossada por baixo
    g.save(); g.lineJoin = 'round'; body(); g.lineWidth = 7; g.strokeStyle = pal.outline; g.stroke(); g.restore();
    body(); g.fillStyle = pal.dark; g.fill();
    g.save(); body(); g.clip();
    const gr = g.createLinearGradient(0, cy - h, 0, cy + h * o.under + 6);
    gr.addColorStop(0, pal.lit); gr.addColorStop(0.35, pal.mid); gr.addColorStop(0.7, pal.dark); gr.addColorStop(0.86, pal.under); gr.addColorStop(1, pal.rim);
    g.fillStyle = gr; g.fillRect(cx - w, cy - h * 1.4, w * 2, h * 2.4);
    // volume de cada escama
    for (const [x, y, r] of circles) {
      const rg = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      rg.addColorStop(0, P.rgba(pal.lit, 0.55)); rg.addColorStop(0.7, P.rgba(pal.mid, 0.0)); rg.addColorStop(1, P.rgba(pal.dark, 0.35));
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, P.TAU); g.fill();
    }
    P.strokes(g, cx - w / 2, cy - h, w, h * 1.2, Math.floor(w * 0.6), R, [pal.lit, pal.dark, pal.mid], { len: [6, 18], width: [2, 5], ang: -0.3, angJ: 1.2, alpha: [0.12, 0.3] });
    g.restore();
    return { circles, body };
  }
  return { mountains, cushion, W, H, camDefault, w2v, screen, ribbon, qpts, cpts, fadeDown, outline };
})();
