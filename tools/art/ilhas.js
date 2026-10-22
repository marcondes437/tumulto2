/* MAPA 2 — ILHAS CELESTIAIS
   Céu claro com grandes nuvens pintadas, terras altas gramadas com farol ao longe,
   rochas esculpidas flutuando, bloco principal largo com grama e duas lajes superiores. */
MAPS.ilhas = {
  fallback: '#6fb0e6',
  async paint() {
    const ID = 'ilhas', ST = Sim.STAGES[ID];
    const { rgba, rng, smooth, poly, mix } = P;
    const out = [];
    const CL = { light: '#fffdf8', mid: '#f3ecef', shadow: '#c2b8dc', base: '#a79fcf', rim: '#ffffff' };
    const CLFAR = { light: '#ffffff', mid: '#eef0f6', shadow: '#c3c9e4', base: '#b4bde0' };
    const GR = { top: '#a7d43c', hi: '#e4f87a', mid: '#79ab25', dark: '#3d6a17', outline: '#1d2a0e' };
    const STN = { base: '#47454f', light: '#9896a6', dark: '#1d1c24', carve: '#23222b', carveHi: '#a8a7b6' };

    // ------------------------------------------------------------ céu
    {
      const L = C.screen(0.01), { g, W, H } = L, R = rng(101);
      P.vgrad(g, 0, 0, W, H, [[0, '#2a74c8'], [0.3, '#4f9be0'], [0.6, '#9ccdf0'], [0.85, '#dcecf4'], [1, '#f3efe8']]);
      P.radial(g, L.U(0.16), L.V(0.08), W * 0.45, '#fff4d8', 0.55, 'screen');
      // pinceladas de vento no céu
      P.strokes(g, 0, 0, W, H * 0.6, 260, R, ['#ffffff', '#cfe6fb', '#8fc0ec'], { len: [80, 260], width: [6, 18], ang: -0.12, angJ: 0.2, alpha: [0.02, 0.06] });
      const tex = P.noiseTex(W, H, { scale: 0.002, oct: 5, seed: 7, colorA: '#000000', colorB: '#ffffff', res: 0.25, warp: 2, gamma: 1.6 });
      P.overlayTex(g, tex, 'soft-light', 0.25);
      // nuvens altas e distantes
      const far = P.cv(W, H), fg = far.getContext('2d');
      for (let k = 0; k < 9; k++) P.cloud(fg, R() * W, L.V(0.55 + R() * 0.3), L.S(0.12 + R() * 0.16), L.S(0.04 + R() * 0.03), R, CLFAR, { n: 12 });
      // grandes massas de nuvem no céu (atmosféricas)
      const big = [[0.16, 0.26, 0.42, 0.13], [0.64, 0.14, 0.34, 0.09], [0.97, 0.34, 0.36, 0.12], [0.44, 0.44, 0.3, 0.07]];
      for (const [u, v, w, h] of big) {
        for (let j = 0; j < 2; j++) P.cloud(fg, L.U(u + (R() - 0.5) * w * 0.5), L.V(v + j * 0.05), L.S(w * (0.7 + R() * 0.4)), L.S(h * (0.7 + R() * 0.4)), R, { light: '#ffffff', mid: '#f4eef4', shadow: '#c9c2e2', base: '#b9b3dc' }, { n: 16, soft: 3 });
      }
      const fadeTop = fg.createLinearGradient(0, 0, 0, H); fadeTop.addColorStop(0, 'rgba(0,0,0,0.25)'); fadeTop.addColorStop(1, 'rgba(0,0,0,0)');
      fg.globalCompositeOperation = 'destination-out'; fg.fillStyle = fadeTop; fg.fillRect(0, 0, W, H); fg.globalCompositeOperation = 'source-over';
      g.globalAlpha = 0.82; g.drawImage(P.blurred(far, 3), 0, 0); g.globalAlpha = 1;
      out.push({ src: 'sky.webp', space: 'screen', par: 0.01, zoom: 0.02, canvas: L.c });
    }

    // ------------------------------------------------------------ ao longe: vale nevado e ilhas pálidas
    {
      const L = C.screen(0.03), { g, W, H } = L, R = rng(111);
      const m = P.cv(W, H);
      C.mountains(m.getContext('2d'), { seed: 12, base: L.V(0.78), h: 0.2, n: 5, wid: 0.07, sharp: 1.3,
        peaks: [[0.78, 0.2, 0.08], [0.9, 0.17, 0.07], [1.02, 0.22, 0.08], [0.66, 0.12, 0.06]],
        col: '#a8a6d8', lit: '#f2eefa', dark: '#8a8ac0', snow: '#ffffff', snowLine: 0.05, fog: '#e6eef8', fogA: 0.95, fogH: 0.8, strokes: 150 });
      g.drawImage(P.blurred(m, 2.5), 0, 0);
      // ilhas flutuantes distantes
      const isl = P.cv(W, H), ig = isl.getContext('2d');
      for (const [u, v, sz, seed] of [[0.32, 0.36, 0.045, 1], [0.56, 0.27, 0.025, 2], [0.74, 0.43, 0.035, 3], [0.06, 0.28, 0.03, 4]]) {
        const cx = L.U(u), cy = L.V(v), w = L.S(sz), Rr = rng(seed + 50);
        const pts = [[cx - w, cy]];
        for (let i = 1; i < 9; i++) { const t = i / 9; pts.push([cx - w + t * w * 2, cy + Math.sin(t * Math.PI) * w * (0.9 + Rr() * 0.8) * (0.6 + 0.6 * Math.sin(t * 7 + seed))]); }
        pts.push([cx + w, cy]);
        poly(ig, pts);
        const gr = ig.createLinearGradient(cx - w, cy, cx + w * 0.5, cy + w); gr.addColorStop(0, '#a9b9da'); gr.addColorStop(1, '#7f8fb8');
        ig.fillStyle = gr; ig.fill();
        ig.save(); poly(ig, pts); ig.clip(); P.strokes(ig, cx - w, cy, w * 2, w * 1.6, 40, Rr, ['#c9d4ec', '#6f7fa8'], { len: [6, 20], width: [2, 4], ang: Math.PI / 2, angJ: 0.5, alpha: [0.2, 0.4] }); ig.restore();
        ig.beginPath(); ig.ellipse(cx, cy - w * 0.03, w * 1.02, w * 0.13, 0, 0, P.TAU); ig.fillStyle = '#b6d39a'; ig.fill();
        for (let k = 0; k < 4; k++) { ig.beginPath(); ig.ellipse(cx + (Rr() - 0.5) * w * 1.4, cy - w * 0.1, w * 0.18, w * 0.12, 0, 0, P.TAU); ig.fillStyle = '#9fc082'; ig.fill(); }
      }
      g.drawImage(P.blurred(isl, 2), 0, 0);
      out.push({ src: 'far.webp', space: 'screen', par: 0.03, zoom: 0.05, canvas: L.c });
    }

    // ------------------------------------------------------------ plano médio: penhascos gramados, farol, rochas flutuantes
    {
      const L = C.screen(0.075), { g, W, H } = L, R = rng(121);
      const lay = P.cv(W, H), x = lay.getContext('2d');
      const cliffMass = (pts, topY, seed) => {
        const Rr = rng(seed);
        smooth(x, pts, true);
        const gr = x.createLinearGradient(0, topY, 0, topY + L.S(0.2)); gr.addColorStop(0, '#8b6a52'); gr.addColorStop(1, '#5d4a52');
        x.fillStyle = gr; x.fill();
        x.save(); smooth(x, pts, true); x.clip();
        P.strokes(x, 0, topY, W, H - topY, 500, Rr, ['#b48a64', '#4a3a40', '#c9a07a'], { len: [20, 70], width: [3, 9], ang: Math.PI / 2, angJ: 0.4, alpha: [0.1, 0.3] });
        // topo gramado
        const tp = pts.slice(1, -1).map(p => [p[0], p[1]]);
        x.beginPath(); x.moveTo(tp[0][0], tp[0][1]);
        for (const p of tp) x.lineTo(p[0], p[1]);
        for (let i = tp.length - 1; i >= 0; i--) x.lineTo(tp[i][0], tp[i][1] + L.S(0.012) + Rr() * L.S(0.02));
        x.closePath();
        const gg = x.createLinearGradient(0, topY - 10, 0, topY + L.S(0.03)); gg.addColorStop(0, '#b8e05a'); gg.addColorStop(1, '#5f9a2a');
        x.fillStyle = gg; x.fill();
        x.restore();
      };
      // penhasco à esquerda com farol e casas
      const lx0 = L.U(-0.06), lx1 = L.U(0.3), ly = L.V(0.6);
      cliffMass([[lx0, H], [lx0, ly - 10], [L.U(0.05), ly - 22], [L.U(0.15), ly - 12], [L.U(0.24), ly + 8], [lx1, ly + 40], [L.U(0.33), ly + 120], [L.U(0.3), H]], ly - 22, 1);
      // farol
      {
        const fx = L.U(0.05), fy = ly - 18, s = L.S(0.012);
        x.fillStyle = '#e9e2d6'; poly(x, [[fx - s * 1.4, fy], [fx + s * 1.4, fy], [fx + s, fy - s * 9], [fx - s, fy - s * 9]]); x.fill();
        x.fillStyle = '#c45a4a'; for (let k = 1; k < 4; k++) x.fillRect(fx - s * (1.38 - k * 0.1), fy - s * (k * 2.2), s * 2 * (1.38 - k * 0.1), s * 0.8);
        x.fillStyle = '#4a3a3a'; x.fillRect(fx - s * 1.3, fy - s * 10.4, s * 2.6, s * 1.4);
        x.fillStyle = '#fff2b0'; x.fillRect(fx - s * 0.8, fy - s * 10.2, s * 1.6, s);
        x.fillStyle = '#7a3a3a'; poly(x, [[fx - s * 1.5, fy - s * 10.4], [fx + s * 1.5, fy - s * 10.4], [fx, fy - s * 12.2]]); x.fill();
        // casinhas
        for (const [u, w2, h2] of [[0.1, 1.6, 1.4], [0.135, 1.2, 1.2], [0.165, 1.8, 1.5]]) {
          const hx = L.U(u), hy = ly - 14 + (u - 0.1) * 120;
          x.fillStyle = '#efe6d8'; x.fillRect(hx - s * w2, hy - s * h2 * 1.6, s * w2 * 2, s * h2 * 1.6);
          x.fillStyle = '#a8483c'; poly(x, [[hx - s * w2 * 1.2, hy - s * h2 * 1.6], [hx + s * w2 * 1.2, hy - s * h2 * 1.6], [hx, hy - s * h2 * 2.7]]); x.fill();
          x.fillStyle = '#5a6a8a'; x.fillRect(hx - s * 0.3, hy - s * h2, s * 0.6, s * 0.7);
        }
      }
      // terra à direita, mais baixa
      const rx = L.U(0.72), ry = L.V(0.74);
      cliffMass([[rx, H], [rx, ry + 30], [L.U(0.8), ry], [L.U(0.92), ry - 14], [L.U(1.08), ry - 6], [L.U(1.08), H]], ry - 14, 2);
      g.drawImage(P.blurred(lay, 1.2), 0, 0);
      // névoa atmosférica sobre os penhascos
      P.vgrad(g, 0, L.V(0.5), W, H, [[0, 'rgba(230,240,250,0)'], [1, 'rgba(230,240,250,0.35)']]);
      // rochas flutuantes à direita (médio)
      const rocks = P.cv(W, H), rg = rocks.getContext('2d');
      for (const [u, v, s, seed] of [[0.9, 0.38, 0.045, 5], [0.97, 0.14, 0.035, 6], [0.82, 0.6, 0.022, 7]]) {
        const cx = L.U(u), cy = L.V(v), w = L.S(s), Rr = rng(seed);
        const top = [[cx - w, cy], [cx - w * 0.3, cy - w * 0.12], [cx + w * 0.5, cy - w * 0.1], [cx + w, cy + w * 0.02]];
        const bot = [[cx + w * 0.85, cy + w * 0.5], [cx + w * 0.45, cy + w * 0.9], [cx + w * 0.15, cy + w * 1.9], [cx - w * 0.2, cy + w * 1.1], [cx - w * 0.75, cy + w * 0.55]];
        const pts = top.concat(bot);
        poly(rg, pts); rg.fillStyle = '#4e5068'; rg.fill();
        // faceta iluminada
        poly(rg, [[cx - w, cy], [cx + w * 0.1, cy + w * 0.02], [cx + w * 0.15, cy + w * 1.9], [cx - w * 0.2, cy + w * 1.1], [cx - w * 0.75, cy + w * 0.55]]);
        const lg = rg.createLinearGradient(cx - w, cy, cx, cy + w * 1.5); lg.addColorStop(0, '#9a9cb6'); lg.addColorStop(1, '#5e6080'); rg.fillStyle = lg; rg.fill();
        rg.save(); poly(rg, pts); rg.clip();
        P.strokes(rg, cx - w, cy, w * 2, w * 2, 50, Rr, ['#2e3046', '#b2b4ca'], { len: [6, 18], width: [1.5, 3.5], ang: Math.PI / 2, angJ: 1.2, alpha: [0.25, 0.5] });
        rg.restore();
        poly(rg, pts); rg.lineWidth = 3; rg.strokeStyle = 'rgba(30,30,50,.6)'; rg.stroke();
        rg.beginPath(); rg.moveTo(cx - w * 1.05, cy + w * 0.04);
        for (let i = 0; i <= 12; i++) { const t2 = i / 12; rg.lineTo(cx - w * 1.05 + t2 * w * 2.1, cy - w * 0.12 - Math.sin(t2 * Math.PI) * w * 0.06 - Rr() * w * 0.06); }
        rg.lineTo(cx + w * 1.02, cy + w * 0.08); rg.closePath(); rg.fillStyle = '#a3cf48'; rg.fill(); rg.lineWidth = 2; rg.strokeStyle = 'rgba(40,60,20,.6)'; rg.stroke();
      }
      rg.globalCompositeOperation = 'source-atop'; rg.fillStyle = 'rgba(200,220,245,.25)'; rg.fillRect(0, 0, W, H);
      g.drawImage(P.blurred(rocks, 1), 0, 0);
      out.push({ src: 'mid.webp', space: 'screen', par: 0.075, zoom: 0.11, canvas: L.c });
      out.push({ fx: 'birds', space: 'screen' });
    }

    // ------------------------------------------------------------ mar de nuvens (desliza, repete)
    const cloudSea = (seed, y0, y1, n, scale, pal, blur) => {
      const W = 2560, H = 1440, c0 = P.cv(W, H), g = c0.getContext('2d'), R = rng(seed);
      const list = [];
      for (let k = 0; k < n; k++) list.push([R() * W, y0 + (y1 - y0) * Math.pow(R(), 0.7), (560 + R() * 620) * scale, (170 + R() * 170) * scale]);
      list.sort((a, b) => a[1] - b[1]);
      for (const [cx, cy, w, h] of list) for (const ox of [-W, 0, W]) if (cx + ox > -w && cx + ox < W + w) P.cloud(g, cx + ox, cy, w, h, rng(Math.floor(cx)), pal, { n: 13, soft: 3 });
      // preenche abaixo para não aparecer buraco
      P.vgrad(g, 0, y1 - 40, W, H - y1 + 40, [[0, rgba(pal.shadow, 0)], [0.4, rgba(pal.shadow, 0.95)], [1, pal.shadow]]);
      return blur ? P.blurred(c0, blur) : c0;
    };
    out.push({ src: 'clouds.webp', space: 'screen', par: 0.12, zoom: 0.16, scroll: 0.35, canvas: cloudSea(131, 1040, 1330, 13, 1, CL, 2) });

    // ------------------------------------------------------------ palco
    const X0 = -800, Y0 = -660, WW = 1600, HH = 1180, K = 2;
    const { c: stage, g } = P.worldCanvas(X0, Y0, WW, HH, K);
    const R = rng(141);
    const [M, LP, RB] = ST.solids, [S1, S2] = ST.soft;

    // entalhes: sulco escuro + borda clara (aparência de pedra esculpida)
    const carve = (pathFn, w) => {
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      g.translate(0, 1.6); pathFn(); g.strokeStyle = rgba(STN.carveHi, 0.55); g.lineWidth = w; g.stroke();
      g.translate(0, -1.6); pathFn(); g.strokeStyle = STN.carve; g.lineWidth = w; g.stroke();
      g.restore();
    };
    const spiral = (x, y, r, turns) => () => { g.beginPath(); for (let i = 0; i <= 80; i++) { const t = i / 80, a = t * turns * P.TAU, rr = r * (1 - t * 0.9); if (!i) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } };
    const keySpiral = (x, y, s) => () => { const p = [[0, 0], [4, 0], [4, 4], [-4, 4], [-4, -4], [8, -4], [8, 8], [-8, 8]]; g.beginPath(); p.forEach(([a, b], i) => (i ? g.lineTo(x + a * s, y + b * s) : g.moveTo(x + a * s, y + b * s))); };
    const tri = (x, y, s, up) => () => { g.beginPath(); g.moveTo(x - s, y + (up ? s : -s) * 0.8); g.lineTo(x, y - (up ? s : -s) * 0.8); g.lineTo(x + s, y + (up ? s : -s) * 0.8); g.closePath(); };
    const meander = (x0, x1, y, s) => () => { g.beginPath(); g.moveTo(x0, y); for (let x = x0; x < x1 - s * 2; x += s * 2) { g.lineTo(x, y - s); g.lineTo(x + s, y - s); g.lineTo(x + s, y); g.lineTo(x + s * 2, y); } };

    // laje de pedra entalhada com grama no topo
    const slab = (pts, top, bounds, seed, decor) => {
      const Rd = rng(seed);
      poly(g, pts); g.fillStyle = STN.base; g.fill();
      g.save(); poly(g, pts); g.clip();
      const [bx0, by0, bx1, by1] = bounds;
      const gr = g.createLinearGradient(bx0, by0, bx1 * 0.3 + bx0 * 0.7, by1);
      gr.addColorStop(0, '#6c6a78'); gr.addColorStop(0.5, STN.base); gr.addColorStop(1, '#25242e');
      g.fillStyle = gr; g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
      // placas de rocha (rachaduras grandes)
      g.strokeStyle = rgba(STN.dark, 0.7); g.lineWidth = 3;
      for (let k = 0; k < (bx1 - bx0) * (by1 - by0) / 9000; k++) {
        let px = bx0 + Rd() * (bx1 - bx0), py = by0 + Rd() * (by1 - by0);
        g.beginPath(); g.moveTo(px, py);
        for (let j = 0; j < 5; j++) { px += (Rd() - 0.5) * 60; py += (Rd() - 0.3) * 40; g.lineTo(px, py); }
        g.stroke();
      }
      P.strokes(g, bx0, by0, bx1 - bx0, by1 - by0, Math.floor((bx1 - bx0) * (by1 - by0) / 300), Rd, [STN.light, STN.dark, '#5a5866', '#7b6f6a'], { len: [8, 30], width: [2, 6], angJ: 3.2, alpha: [0.08, 0.22] });
      // bisel: borda esquerda iluminada, direita e base escuras
      const lb = g.createLinearGradient(bx0, 0, bx0 + 34, 0); lb.addColorStop(0, 'rgba(210,215,240,.45)'); lb.addColorStop(1, 'rgba(210,215,240,0)');
      g.fillStyle = lb; g.fillRect(bx0, by0, 34, by1 - by0);
      const rb = g.createLinearGradient(bx1 - 40, 0, bx1, 0); rb.addColorStop(0, 'rgba(10,8,20,0)'); rb.addColorStop(1, 'rgba(10,8,20,.55)');
      g.fillStyle = rb; g.fillRect(bx1 - 40, by0, 40, by1 - by0);
      // facetas claras nas placas de rocha
      for (let k = 0; k < (bx1 - bx0) * (by1 - by0) / 14000; k++) {
        const fx = bx0 + Rd() * (bx1 - bx0), fy = by0 + 20 + Rd() * (by1 - by0 - 20), fw = 30 + Rd() * 70, fh = 16 + Rd() * 30;
        poly(g, [[fx, fy], [fx + fw, fy - fh * 0.2], [fx + fw * 0.8, fy + fh], [fx - fw * 0.1, fy + fh * 0.8]]);
        g.fillStyle = rgba(Rd() < 0.6 ? '#8c8a9c' : '#2a2933', 0.18); g.fill();
      }
      if (decor) decor(Rd);
      // musgo
      P.strokes(g, bx0, top + 14, bx1 - bx0, Math.min(60, by1 - top), Math.floor((bx1 - bx0) / 5), Rd, ['#6f9a2c', '#4f7a22', '#8fbf3a'], { len: [4, 14], width: [2, 5], ang: Math.PI / 2, angJ: 0.8, alpha: [0.25, 0.55] });
      // luz do sol pela esquerda/topo, sombra embaixo
      const sh = g.createLinearGradient(0, top, 0, by1); sh.addColorStop(0, 'rgba(255,240,210,.12)'); sh.addColorStop(1, 'rgba(20,16,40,.45)');
      g.fillStyle = sh; g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
      g.restore();
      poly(g, pts); C.outline(g, '#15141c', 5);
    };
    // trepadeiras pendentes
    const vines = (x0, x1, y, n, maxL, seed) => {
      const Rd = rng(seed); g.save(); g.lineCap = 'round';
      for (let k = 0; k < n; k++) {
        const x = x0 + Rd() * (x1 - x0), L2 = maxL * (0.3 + Rd() * 0.7);
        g.strokeStyle = Rd() < 0.5 ? '#5a8a22' : '#3d6a17'; g.lineWidth = 2.5 + Rd() * 2;
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + (Rd() - 0.5) * 20, y + L2 * 0.4, x + (Rd() - 0.5) * 30, y + L2 * 0.7, x + (Rd() - 0.5) * 16, y + L2); g.stroke();
        for (let j = 0; j < L2 / 12; j++) { g.fillStyle = Rd() < 0.5 ? '#8fbf3a' : '#5f9a2a'; g.beginPath(); g.ellipse(x + (Rd() - 0.5) * 14, y + j * 12 + 6, 4, 2.4, Rd() * 3, 0, P.TAU); g.fill(); }
      }
      g.restore();
    };

    // bloco principal (com chanfro inferior decorativo dentro do retângulo de colisão)
    const ch = 26;
    slab([[M.l, M.t], [M.r, M.t], [M.r, M.b - ch * 2], [M.r - ch * 3, M.b], [M.l + ch * 3, M.b], [M.l, M.b - ch * 2]], M.t, [M.l, M.t, M.r, M.b], 151, (Rd) => {
      // faixa de meandro e espirais esculpidas
      carve(meander(M.l + 30, M.r - 30, M.t + 62, 14), 5);
      for (const [x, y, r] of [[-300, 150, 44], [-110, 190, 36], [90, 140, 48], [300, 200, 40]]) carve(spiral(x, y, r, 2.4), 6);
      for (let x = M.l + 60; x < M.r - 40; x += 70) carve(tri(x, M.b - 40, 16, Rd() < 0.5), 4);
      carve(keySpiral(-200, 230, 4), 5); carve(keySpiral(210, 100, 4), 5);
      g.strokeStyle = rgba(STN.carve, 0.8); g.lineWidth = 4; g.beginPath(); g.moveTo(M.l + 20, M.t + 90); g.lineTo(M.r - 20, M.t + 90); g.stroke();
    });
    vines(M.l - 10, M.l + 120, M.t + 20, 6, 120, 152); vines(M.r - 160, M.r + 10, M.t + 20, 7, 140, 153);
    P.grassTop(g, M.l, M.r, M.t, R, GR, { thick: 18, hang: 26, over: 16, blade: 20 });

    // lajes superiores com fenda em V no meio
    const sh2 = 46;
    slab([[S1.l, S1.t], [S1.r, S1.t], [S1.r - 26, S1.t + sh2], [S1.l + 30, S1.t + sh2], [S1.l, S1.t + 22]], S1.t, [S1.l, S1.t, S1.r, S1.t + sh2], 154, () => {
      carve(meander(S1.l + 40, S1.r - 40, S1.t + 32, 8), 4);
    });
    slab([[S2.l, S2.t], [S2.r, S2.t], [S2.r, S2.t + 22], [S2.r - 30, S2.t + sh2], [S2.l + 26, S2.t + sh2]], S2.t, [S2.l, S2.t, S2.r, S2.t + sh2], 155, () => {
      carve(meander(S2.l + 40, S2.r - 40, S2.t + 32, 8), 4);
    });
    vines(S1.l + 20, S1.r - 30, S1.t + 30, 6, 70, 156); vines(S2.l + 30, S2.r - 20, S2.t + 30, 6, 70, 157);
    P.grassTop(g, S1.l, S1.r, S1.t, R, GR, { thick: 12, hang: 14, over: 8, blade: 13 });
    P.grassTop(g, S2.l, S2.r, S2.t, R, GR, { thick: 12, hang: 14, over: 8, blade: 13 });

    // pilar da esquerda (ponta inferior decorativa curta)
    slab([[LP.l, LP.t], [LP.r, LP.t], [LP.r, LP.b], [LP.r - 60, LP.b + 36], [LP.l, LP.b - 40]], LP.t, [LP.l, LP.t, LP.r, LP.b + 40], 158, (Rd) => {
      carve(spiral((LP.l + LP.r) / 2, LP.t + 120, 46, 2.4), 6);
      for (let y = LP.t + 210; y < LP.b - 30; y += 52) carve(tri((LP.l + LP.r) / 2, y, 22, true), 5);
      carve(meander(LP.l + 20, LP.r - 20, LP.t + 50, 10), 4);
    });
    P.grassTop(g, LP.l, LP.r, LP.t, R, GR, { thick: 14, hang: 20, over: 12, blade: 16 });
    vines(LP.l, LP.r, LP.t + 18, 5, 90, 159);

    // bloco da direita (ponta inferior esquerda decorativa)
    slab([[RB.l, RB.t], [RB.r, RB.t], [RB.r, RB.b], [RB.l + 60, RB.b + 40], [RB.l, RB.b - 10]], RB.t, [RB.l, RB.t, RB.r, RB.b + 40], 160, () => {
      carve(spiral(RB.l + 110, RB.t + 120, 40, 2.2), 6);
      carve(keySpiral(RB.l + 50, RB.t + 70, 3.2), 4);
    });
    P.grassTop(g, RB.l, RB.r, RB.t, R, GR, { thick: 14, hang: 20, over: 12, blade: 16 });
    vines(RB.l + 10, RB.r - 10, RB.t + 18, 5, 70, 161);

    P.texturize(stage, P.noiseTex(stage.width, stage.height, { scale: 0.005, oct: 4, seed: 171, lo: 40, hi: 215, res: 0.25 }), 'soft-light', 0.45);
    P.texturize(stage, P.grain(stage.width, stage.height, 0.3, 172), 'overlay', 0.1);
    out.push({ src: 'stage.webp', space: 'world', x: X0, y: Y0, w: WW, h: HH, canvas: stage });

    // ------------------------------------------------------------ frente: nuvens baixas
    out.push({ src: 'cloudsfront.webp', space: 'screen', par: 0.32, zoom: 0.38, scroll: 0.8, front: true, alpha: 0.95, canvas: cloudSea(181, 1320, 1440, 10, 0.95, CL, 2) });
    return out;
  },
};
