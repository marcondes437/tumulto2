/* MAPA 4 — CIDADE NEON
   Metrópole futurista à noite: arranha-céus em camadas, emblema holográfico, letreiros luminosos,
   holofotes e tráfego aéreo animados; palco = topo de um grande letreiro com moldura de neon
   sobre uma torre treliçada, com duas passarelas metálicas sobre andaimes. */
MAPS.neon = {
  fallback: '#140c36',
  async paint() {
    const ID = 'neon', ST = Sim.STAGES[ID];
    const { rgba, rng, smooth, poly, mix } = P;
    const out = [];
    const PINK = '#ff4fd8', CYAN = '#4ff0ff', VIOLET = '#9a6bff', YEL = '#ffd23f', ORA = '#ff7a2f', RED = '#ff4a5a', GREEN = '#5bff9a';

    // fonte de traços para letreiros de neon (letras próprias, caixa 0..0.7 x 0..1)
    const GLYPH = {
      T: [[[0, 0], [0.7, 0]], [[0.35, 0], [0.35, 1]]],
      U: [[[0, 0], [0, 0.72], [0.08, 0.92], [0.35, 1], [0.62, 0.92], [0.7, 0.72], [0.7, 0]]],
      M: [[[0, 1], [0, 0], [0.35, 0.55], [0.7, 0], [0.7, 1]]],
      L: [[[0, 0], [0, 1], [0.62, 1]]],
      O: [[[0.35, 0], [0.6, 0.08], [0.7, 0.3], [0.7, 0.7], [0.6, 0.92], [0.35, 1], [0.1, 0.92], [0, 0.7], [0, 0.3], [0.1, 0.08], [0.35, 0]]],
      A: [[[0, 1], [0.35, 0], [0.7, 1]], [[0.15, 0.62], [0.55, 0.62]]],
      R: [[[0, 1], [0, 0], [0.48, 0], [0.66, 0.12], [0.66, 0.38], [0.48, 0.5], [0, 0.5]], [[0.36, 0.5], [0.7, 1]]],
      E: [[[0.65, 0], [0, 0], [0, 1], [0.65, 1]], [[0, 0.5], [0.5, 0.5]]],
      N: [[[0, 1], [0, 0], [0.7, 1], [0.7, 0]]],
      H: [[[0, 0], [0, 1]], [[0.7, 0], [0.7, 1]], [[0, 0.5], [0.7, 0.5]]],
      B: [[[0, 1], [0, 0], [0.5, 0], [0.64, 0.1], [0.64, 0.38], [0.5, 0.48], [0, 0.48]], [[0.5, 0.48], [0.68, 0.6], [0.68, 0.88], [0.52, 1], [0, 1]]],
      C: [[[0.68, 0.12], [0.5, 0], [0.2, 0], [0, 0.22], [0, 0.78], [0.2, 1], [0.5, 1], [0.68, 0.88]]],
      D: [[[0, 0], [0, 1], [0.42, 1], [0.66, 0.8], [0.7, 0.5], [0.66, 0.2], [0.42, 0], [0, 0]]],
      I: [[[0.35, 0], [0.35, 1]]],
      2: [[[0, 0.2], [0.12, 0.04], [0.35, 0], [0.58, 0.06], [0.68, 0.25], [0.6, 0.45], [0, 1], [0.7, 1]]],
      4: [[[0.55, 1], [0.55, 0], [0, 0.7], [0.75, 0.7]]],
      '•': [[[0.3, 0.45], [0.4, 0.45], [0.4, 0.55], [0.3, 0.55], [0.3, 0.45]]],
      ' ': [],
    };
    const textPaths = (str, x, y, size, sp) => {
      const paths = []; let cx = x;
      const ADV = { L: -0.14, I: -0.3, ' ': -0.4, '•': -0.25 };
      for (const ch of str) { const gl = GLYPH[ch] || []; for (const pl of gl) paths.push(pl.map(([a, b]) => [cx + a * size, y + b * size])); cx += size * ((sp || 0.95) + (ADV[ch] || 0)); }
      return { paths, w: cx - x - size * ((sp || 0.95) - 0.7) };
    };
    const strokePaths = (g, paths) => () => { g.beginPath(); for (const pl of paths) { g.moveTo(pl[0][0], pl[0][1]); for (let i = 1; i < pl.length; i++) g.lineTo(pl[i][0], pl[i][1]); } };

    // ------------------------------------------------------------ céu
    {
      const L = C.screen(0.01), { g, W, H } = L, R = rng(301);
      P.vgrad(g, 0, 0, W, H, [[0, '#07061e'], [0.3, '#171650'], [0.55, '#2f2a86'], [0.75, '#5a46b8'], [0.9, '#5fa6e8'], [1, '#8fe2ff']]);
      const neb = P.noiseTex(W, H, { scale: 0.0016, oct: 5, seed: 31, colorA: '#000000', colorB: '#ff4fd8', res: 0.25, warp: 1.6, gamma: 2.6 });
      P.overlayTex(g, neb, 'screen', 0.22);
      const neb2 = P.noiseTex(W, H, { scale: 0.002, oct: 5, seed: 32, colorA: '#000000', colorB: '#4ff0ff', res: 0.25, warp: 1.6, gamma: 2.6 });
      P.overlayTex(g, neb2, 'screen', 0.18);
      P.stars(g, W, H, 260, R, { maxY: 0.4, col: '#d8e8ff', big: 0.01 });
      // linhas de dados / rotas aéreas holográficas
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 60; k++) {
        const x0 = R() * W, y0 = L.V(0.05 + R() * 0.35), len = 80 + R() * 340, a = 0.25 + (R() - 0.5) * 0.2;
        g.strokeStyle = rgba(R() < 0.6 ? '#b8a8ff' : '#ff8ad8', 0.12 + R() * 0.2); g.lineWidth = 1.5 + R() * 2;
        g.setLineDash([6 + R() * 18, 4 + R() * 12]);
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len); g.stroke();
      }
      g.setLineDash([]); g.restore();
      P.radial(g, L.U(0.5), L.V(1.05), W * 0.6, '#7fd8ff', 0.35, 'screen');
      out.push({ src: 'sky.webp', space: 'screen', par: 0.01, zoom: 0.02, canvas: L.c });
      out.push({ fx: 'traffic', space: 'screen' });
    }

    // prédio genérico com grade de janelas
    const building = (g, x, y, w, h, R, o) => {
      o = Object.assign({ col: '#1c1f5c', lit: '#2c3a8a', win: [CYAN, '#b8f6ff', PINK, YEL], winP: 0.35, winS: 6, top: 'flat', haze: null }, o);
      g.fillStyle = o.col; g.fillRect(x, y, w, h);
      const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, rgba(o.lit, 0.9)); gr.addColorStop(0.35, rgba(o.lit, 0)); gr.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      if (o.top === 'step') { g.fillStyle = o.col; g.fillRect(x + w * 0.15, y - h * 0.06, w * 0.7, h * 0.06); g.fillRect(x + w * 0.3, y - h * 0.11, w * 0.4, h * 0.05); }
      if (o.top === 'spire') { g.fillStyle = o.col; poly(g, [[x + w * 0.35, y], [x + w * 0.65, y], [x + w * 0.5, y - h * 0.3]]); g.fill(); g.fillRect(x + w * 0.49, y - h * 0.45, w * 0.02, h * 0.2); }
      if (o.top === 'dome') { g.fillStyle = o.col; g.beginPath(); g.ellipse(x + w / 2, y, w * 0.45, w * 0.25, 0, Math.PI, P.TAU); g.fill(); }
      const s = o.winS, gap = s * 1.6;
      for (let yy = y + s * 2; yy < y + h - s; yy += gap * 1.3) {
        const rowOn = R() < 0.65;
        for (let xx = x + s; xx < x + w - s; xx += gap) {
          if (!rowOn || R() > o.winP) continue;
          g.fillStyle = rgba(R.pick(o.win), 0.55 + R() * 0.45); g.fillRect(xx, yy, s, s * 1.2);
        }
      }
      if (o.haze) { const hz = g.createLinearGradient(0, y, 0, y + h); hz.addColorStop(0, rgba(o.haze, 0)); hz.addColorStop(1, rgba(o.haze, 0.7)); g.fillStyle = hz; g.fillRect(x - 2, y - h * 0.5, w + 4, h * 1.5); }
    };
    // letreiro vertical de neon (caixa com glifos)
    const vSign = (g, x, y, w, h, col, R, text) => {
      g.fillStyle = '#0c0a24'; g.fillRect(x, y, w, h);
      P.neon(g, () => { g.beginPath(); g.rect(x + 3, y + 3, w - 6, h - 6); }, col, 3, 18);
      if (text) {
        const sz = w * 0.55, tp = [];
        let yy = y + w * 0.3;
        for (const ch of text) { const gl = GLYPH[ch] || []; for (const pl of gl) tp.push(pl.map(([a, b]) => [x + (w - sz * 0.7) / 2 + a * sz, yy + b * sz])); yy += sz * 1.3; }
        P.neon(g, strokePaths(g, tp), col, 2.5, 14);
      } else {
        for (let yy = y + w * 0.4; yy < y + h - w * 0.4; yy += w * 0.75) {
          const gp = [];
          const k = Math.floor(R() * 4);
          if (k === 0) gp.push([[x + w * 0.25, yy], [x + w * 0.75, yy], [x + w * 0.5, yy + w * 0.5]]);
          else if (k === 1) gp.push([[x + w * 0.3, yy], [x + w * 0.3, yy + w * 0.5], [x + w * 0.7, yy + w * 0.5]], [[x + w * 0.7, yy], [x + w * 0.5, yy + w * 0.25]]);
          else if (k === 2) gp.push([[x + w * 0.25, yy + w * 0.25], [x + w * 0.75, yy + w * 0.25]], [[x + w * 0.5, yy], [x + w * 0.5, yy + w * 0.5]]);
          else gp.push([[x + w * 0.3, yy], [x + w * 0.7, yy + w * 0.5]], [[x + w * 0.7, yy], [x + w * 0.3, yy + w * 0.5]]);
          P.neon(g, strokePaths(g, gp), col, 2.5, 12);
        }
      }
    };

    // ------------------------------------------------------------ megatorres ao longe + emblema holográfico
    {
      const L = C.screen(0.03), { g, W, H } = L, R = rng(311);
      const lay = P.cv(W, H), x = lay.getContext('2d');
      const tops = ['flat', 'step', 'spire', 'dome'];
      // fileira de trás (mais clara/enevoada) e da frente
      for (let k = 0; k < 18; k++) {
        const u = -0.05 + R() * 1.1, w = L.S(0.02 + R() * 0.04), h = L.S(0.1 + R() * 0.22);
        building(x, L.U(u) - w / 2, L.V(0.95) - h, w, h + L.S(0.1), R, { col: '#3a4aa6', lit: '#6a86e0', win: ['#bff0ff'], winP: 0.08, winS: 3, top: R.pick(tops), haze: '#8fd4ff' });
      }
      for (let k = 0; k < 16; k++) {
        const u = -0.05 + R() * 1.1, w = L.S(0.03 + R() * 0.045), h = L.S(0.12 + R() * 0.26);
        building(x, L.U(u) - w / 2, L.V(0.98) - h, w, h + L.S(0.1), R, { col: '#26307e', lit: '#4a62c8', win: ['#9fe8ff', '#c8b8ff', '#ff9ae8'], winP: 0.14, winS: 4, top: R.pick(tops), haze: '#7fc8ff' });
      }
      // torre do emblema
      const ex = L.U(0.5), ew = L.S(0.07), eh = L.S(0.42);
      building(x, ex - ew / 2, L.V(0.95) - eh, ew, eh + L.S(0.1), R, { col: '#2c3890', lit: '#5070d8', win: ['#9fe8ff'], winP: 0.15, winS: 4, top: 'step', haze: '#7fc8ff' });
      g.drawImage(P.blurred(lay, 2.2), 0, 0);
      // emblema circular holográfico (desenho próprio)
      {
        const cx = ex, cy = L.V(0.95) - eh + L.S(0.07), r = L.S(0.045);
        g.save(); g.globalCompositeOperation = 'lighter';
        P.radial(g, cx, cy, r * 2.4, '#7fe8ff', 0.35);
        g.strokeStyle = rgba('#bff6ff', 0.85); g.lineWidth = r * 0.12; g.beginPath(); g.arc(cx, cy, r, 0, P.TAU); g.stroke();
        g.lineWidth = r * 0.05; g.beginPath(); g.arc(cx, cy, r * 0.72, 0.3, P.TAU - 0.3); g.stroke();
        g.fillStyle = rgba('#bff6ff', 0.85);
        poly(g, [[cx - r * 0.1, cy - r * 0.5], [cx + r * 0.32, cy - r * 0.5], [cx + r * 0.05, cy - r * 0.02], [cx + r * 0.3, cy - r * 0.02], [cx - r * 0.22, cy + r * 0.58], [cx - r * 0.02, cy + r * 0.1], [cx - r * 0.26, cy + r * 0.1]]); g.fill();
        g.restore();
      }
      P.vgrad(g, 0, L.V(0.6), W, H, [[0, 'rgba(120,200,255,0)'], [1, 'rgba(140,220,255,0.55)']]);
      out.push({ src: 'far.webp', space: 'screen', par: 0.03, zoom: 0.05, canvas: L.c });
      out.push({ fx: 'searchlights', space: 'screen' });
      out.push({ fx: 'beacons', space: 'screen', par: 0.03, pts: [[0.5, 0.08, 0], [0.64, 0.22, 2], [0.86, 0.3, 4], [0.32, 0.28, 1]] });
    }

    // ------------------------------------------------------------ prédios médios com letreiros
    {
      const L = C.screen(0.07), { g, W, H } = L, R = rng(321);
      const lay = P.cv(W, H), x = lay.getContext('2d');
      const blocks = [[-0.04, 0.12, 0.42], [0.08, 0.1, 0.55], [0.17, 0.08, 0.36], [0.72, 0.1, 0.4], [0.82, 0.09, 0.58], [0.93, 0.12, 0.46], [0.3, 0.06, 0.2], [0.62, 0.07, 0.24]];
      for (const [u, wd, ht] of blocks) {
        const w = L.S(wd), h = L.S(ht);
        building(x, L.U(u), L.V(1.0) - h, w, h + L.S(0.1), R, { col: '#1d1a5a', lit: '#3a3aa0', winP: 0.22, winS: 6, top: R() < 0.5 ? 'step' : 'flat' });
      }
      // letreiros verticais
      vSign(x, L.U(0.115), L.V(0.52), L.S(0.022), L.S(0.2), CYAN, R, 'HOTEL');
      vSign(x, L.U(0.205), L.V(0.68), L.S(0.018), L.S(0.12), PINK, R, 'BAR');
      vSign(x, L.U(0.78), L.V(0.6), L.S(0.018), L.S(0.16), GREEN, R, null);
      vSign(x, L.U(0.885), L.V(0.44), L.S(0.022), L.S(0.235), PINK, R, 'ARCADE');
      vSign(x, L.U(0.96), L.V(0.62), L.S(0.016), L.S(0.1), YEL, R, '24H');
      // anel holográfico rosa (como o da referência, mas com desenho próprio)
      {
        const cx = L.U(0.835), cy = L.V(0.6), r = L.S(0.02);
        P.neon(x, () => { x.beginPath(); x.arc(cx, cy, r, 0, P.TAU); }, CYAN, 4, 20);
        P.neon(x, () => { x.beginPath(); x.arc(cx, cy, r * 0.45, 0, P.TAU); }, CYAN, 3, 14);
        P.neon(x, () => { x.beginPath(); x.moveTo(cx - r * 1.4, cy - r * 1.6); x.lineTo(cx - r * 0.5, cy - r * 1.6); x.moveTo(cx + r * 0.5, cy + r * 1.6); x.lineTo(cx + r * 1.4, cy + r * 1.6); }, CYAN, 3, 12);
      }
      // holofotes no chão (bases)
      g.drawImage(P.blurred(lay, 1), 0, 0);
      P.vgrad(g, 0, L.V(0.7), W, H, [[0, 'rgba(90,60,200,0)'], [1, 'rgba(90,70,200,0.4)']]);
      out.push({ src: 'mid.webp', space: 'screen', par: 0.07, zoom: 0.1, canvas: L.c });
    }

    // ------------------------------------------------------------ bordas próximas (enquadram a cena)
    {
      const L = C.screen(0.12), { g, W, H } = L, R = rng(331);
      const lay = P.cv(W, H), x = lay.getContext('2d');
      const side = (u0, u1, top, flip) => {
        const x0 = L.U(u0), x1 = L.U(u1), y0 = L.V(top);
        x.fillStyle = '#140f3c'; x.fillRect(x0, y0, x1 - x0, H - y0);
        const gr = x.createLinearGradient(flip ? x1 : x0, 0, flip ? x0 : x1, 0); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(90,80,220,.25)');
        x.fillStyle = gr; x.fillRect(x0, y0, x1 - x0, H - y0);
        // varandas e janelas grandes
        for (let yy = y0 + L.S(0.03); yy < H; yy += L.S(0.05)) {
          x.fillStyle = '#0c0a2a'; x.fillRect(x0, yy, x1 - x0, L.S(0.006));
          for (let xx = x0 + L.S(0.01); xx < x1 - L.S(0.02); xx += L.S(0.028)) {
            if (R() < 0.5) continue;
            const c2 = R.pick(['#5ff0ff', '#ff6ad5', '#c8b8ff', '#ffd36b']);
            x.fillStyle = rgba(c2, 0.35 + R() * 0.4); x.fillRect(xx, yy + L.S(0.012), L.S(0.018), L.S(0.022));
          }
        }
        // tubulações
        x.strokeStyle = '#2a2470'; x.lineWidth = L.S(0.004);
        for (let k = 0; k < 3; k++) { const px = x0 + (x1 - x0) * (0.2 + k * 0.3); x.beginPath(); x.moveTo(px, y0); x.lineTo(px, H); x.stroke(); }
      };
      side(-0.06, 0.07, 0.18, false);
      side(0.93, 1.06, 0.12, true);
      vSign(x, L.U(0.035), L.V(0.36), L.S(0.028), L.S(0.26), PINK, R, null);
      vSign(x, L.U(0.945), L.V(0.3), L.S(0.028), L.S(0.3), CYAN, R, null);
      // painel de tela grande à direita (silhueta de janela com ícone)
      x.fillStyle = '#0c0a24'; x.fillRect(L.U(0.975), L.V(0.68), L.S(0.05), L.S(0.06));
      P.neon(x, () => { x.beginPath(); x.rect(L.U(0.98), L.V(0.69), L.S(0.04), L.S(0.04)); }, VIOLET, 3, 16);
      g.drawImage(P.blurred(lay, 0.6), 0, 0);
      out.push({ src: 'near.webp', space: 'screen', par: 0.12, zoom: 0.16, canvas: L.c });
    }

    // ------------------------------------------------------------ palco
    const X0 = -560, Y0 = -330, WW = 1120, HH = 1180, K = 2;
    const { c: stage, g } = P.worldCanvas(X0, Y0, WW, HH, K);
    const R = rng(341);
    const [BB] = ST.solids, [S1, S2] = ST.soft;
    const METAL = '#5a6690', METALL = '#a8b8e0', METALD = '#1e2242';
    const glowJobs = [];   // tubos que recebem brilho extra na camada animada

    // torre treliçada abaixo do letreiro
    {
      const topY = BB.b - 4, botY = 860, wt = 300, wb = 130;
      const legL = [[-wt / 2, topY], [-wb / 2, botY]], legR = [[wt / 2, topY], [wb / 2, botY]];
      const at = (leg, t) => [P.lerp(leg[0][0], leg[1][0], t), P.lerp(leg[0][1], leg[1][1], t)];
      g.lineCap = 'round';
      const beam = (a, b, w) => { g.strokeStyle = '#0a0a18'; g.lineWidth = w + 5; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.strokeStyle = '#2a2e48'; g.lineWidth = w; g.stroke(); g.strokeStyle = 'rgba(160,180,255,.35)'; g.lineWidth = 2; g.stroke(); };
      for (let k = 0; k < 6; k++) {
        const t0 = k / 6, t1 = (k + 1) / 6;
        beam(at(legL, t0), at(legR, t1), 9); beam(at(legR, t0), at(legL, t1), 9); beam(at(legL, t1), at(legR, t1), 8);
      }
      beam(legL[0], legL[1], 16); beam(legR[0], legR[1], 16);
      // tubos de neon nas pernas
      const tubes = [[[-wt / 2 + 14, topY + 4], [-wb / 2 + 8, botY]], [[wt / 2 - 14, topY + 4], [wb / 2 - 8, botY]], [[-30, topY + 4], [-14, botY]], [[30, topY + 4], [14, botY]]];
      const cols = [YEL, YEL, ORA, CYAN];
      tubes.forEach((tb, i) => { const f = () => { g.beginPath(); g.moveTo(tb[0][0], tb[0][1]); g.lineTo(tb[1][0], tb[1][1]); }; P.neon(g, f, cols[i], 4, 16); glowJobs.push([tb, cols[i]]); });
      C.fadeDown(g, -400, 560, 800, 860);
    }
    // andaimes sob as passarelas (decoração, ficam atrás dos lutadores)
    const scaffold = (cx, top, bot, w) => {
      g.lineCap = 'butt';
      const post = (x) => { g.fillStyle = '#0a0a18'; g.fillRect(x - 6, top, 12, bot - top); g.fillStyle = '#262a46'; g.fillRect(x - 4, top, 8, bot - top); g.fillStyle = 'rgba(150,170,240,.4)'; g.fillRect(x - 4, top, 2, bot - top); };
      post(cx - w / 2); post(cx + w / 2);
      const n = 4, step = (bot - top) / n;
      for (let k = 0; k < n; k++) {
        const y0 = top + k * step, y1 = y0 + step;
        g.strokeStyle = '#0a0a18'; g.lineWidth = 7; g.beginPath(); g.moveTo(cx - w / 2, y0); g.lineTo(cx + w / 2, y1); g.moveTo(cx + w / 2, y0); g.lineTo(cx - w / 2, y1); g.stroke();
        g.strokeStyle = '#30365a'; g.lineWidth = 4; g.stroke();
        g.fillStyle = '#262a46'; g.fillRect(cx - w / 2, y1 - 3, w, 6);
      }
    };
    scaffold((S1.l + S1.r) / 2, S1.t + 12, BB.t - 10, 64);
    scaffold((S2.l + S2.r) / 2, S2.t + 12, BB.t - 10, 64);

    // letreiro (bloco sólido)
    {
      const l = BB.l, r = BB.r, t = BB.t, b = BB.b;
      // face superior (onde se pisa)
      poly(g, [[l - 8, t + 6], [l + 6, t - 14], [r - 6, t - 14], [r + 8, t + 6]]);
      const tg = g.createLinearGradient(0, t - 14, 0, t + 6); tg.addColorStop(0, '#c8d4f4'); tg.addColorStop(1, '#7c88b4');
      g.fillStyle = tg; g.fill(); C.outline(g, '#0a0c1e', 4);
      // moldura externa
      g.fillStyle = METAL; g.fillRect(l - 8, t + 6, r - l + 16, b - t - 6);
      const fg = g.createLinearGradient(0, t, 0, b); fg.addColorStop(0, 'rgba(255,255,255,.18)'); fg.addColorStop(1, 'rgba(0,0,0,.4)');
      g.fillStyle = fg; g.fillRect(l - 8, t + 6, r - l + 16, b - t - 6);
      g.strokeStyle = '#0a0c1e'; g.lineWidth = 4; g.strokeRect(l - 8, t + 6, r - l + 16, b - t - 6);
      // rebites
      for (let x = l + 6; x < r; x += 38) for (const y of [t + 14, b - 10]) { g.fillStyle = METALL; g.beginPath(); g.arc(x, y, 2.6, 0, P.TAU); g.fill(); }
      // painel interno escuro
      const il = l + 14, ir = r - 14, it = t + 24, ib = b - 20;
      g.fillStyle = '#0b0c26'; g.fillRect(il, it, ir - il, ib - it);
      g.save(); g.beginPath(); g.rect(il, it, ir - il, ib - it); g.clip();
      const pg = g.createRadialGradient(0, (it + ib) / 2, 20, 0, (it + ib) / 2, 500); pg.addColorStop(0, 'rgba(60,40,140,.6)'); pg.addColorStop(1, 'rgba(10,10,40,0)');
      g.fillStyle = pg; g.fillRect(il, it, ir - il, ib - it);
      // estrutura interna (vigas vistas pelo vidro)
      g.strokeStyle = 'rgba(80,90,160,.35)'; g.lineWidth = 6;
      for (let x = il + 40; x < ir; x += 120) { g.beginPath(); g.moveTo(x, it); g.lineTo(x + 60, ib); g.moveTo(x + 60, it); g.lineTo(x, ib); g.stroke(); }
      g.strokeStyle = 'rgba(120,130,200,.12)'; g.lineWidth = 1;
      for (let y = it; y < ib; y += 8) { g.beginPath(); g.moveTo(il, y); g.lineTo(ir, y); g.stroke(); }
      g.restore();
      g.strokeStyle = '#0a0c1e'; g.lineWidth = 3; g.strokeRect(il, it, ir - il, ib - it);
      // moldura de neon amarela dupla
      const frame = (pad, col, w) => { const f = () => { g.beginPath(); const x0 = il + pad, y0 = it + pad, x1 = ir - pad, y1 = ib - pad, rr = 14; g.moveTo(x0 + rr, y0); g.lineTo(x1 - rr, y0); g.quadraticCurveTo(x1, y0, x1, y0 + rr); g.lineTo(x1, y1 - rr); g.quadraticCurveTo(x1, y1, x1 - rr, y1); g.lineTo(x0 + rr, y1); g.quadraticCurveTo(x0, y1, x0, y1 - rr); g.lineTo(x0, y0 + rr); g.quadraticCurveTo(x0, y0, x0 + rr, y0); }; P.neon(g, f, col, w, 18); return f; };
      frame(10, YEL, 6); frame(22, ORA, 3);
      glowJobs.push(['frame', il + 10, it + 10, ir - 10, ib - 10, YEL]);
      // ícone: punho-raio dentro de um círculo
      const icx = il + 120, icy = (it + ib) / 2;
      P.neon(g, () => { g.beginPath(); g.arc(icx, icy, 72, 0, P.TAU); }, CYAN, 6, 20);
      P.neon(g, () => { g.beginPath(); g.moveTo(icx + 10, icy - 52); g.lineTo(icx - 26, icy + 6); g.lineTo(icx + 2, icy + 6); g.lineTo(icx - 14, icy + 54); g.lineTo(icx + 30, icy - 10); g.lineTo(icx + 2, icy - 10); g.closePath(); }, PINK, 5, 18);
      glowJobs.push(['circle', icx, icy, 72, CYAN]);
      // título
      const tt = textPaths('TUMULTO', il + 230, it + 60, 74, 0.92);
      P.neon(g, strokePaths(g, tt.paths), YEL, 7, 22);
      glowJobs.push(['paths', tt.paths, YEL]);
      // sublinhado e subtítulo
      P.neon(g, () => { g.beginPath(); g.moveTo(il + 230, it + 160); g.lineTo(ir - 50, it + 160); }, RED, 5, 16);
      P.neon(g, () => { g.beginPath(); g.moveTo(il + 260, it + 178); g.lineTo(ir - 90, it + 178); }, ORA, 3, 10);
      const st2 = textPaths('ARENA • 24H', il + 300, it + 200, 34, 0.9);
      P.neon(g, strokePaths(g, st2.paths), PINK, 4, 14);
      glowJobs.push(['paths', st2.paths, PINK]);
    }
    // passarelas metálicas (plataformas semissólidas)
    const catwalk = (S) => {
      const l = S.l - 10, r = S.r + 10, t = S.t;
      poly(g, [[l, t + 4], [l + 8, t - 10], [r - 8, t - 10], [r, t + 4]]);
      const tg = g.createLinearGradient(0, t - 10, 0, t + 4); tg.addColorStop(0, '#d0dcf8'); tg.addColorStop(1, '#8090c0'); g.fillStyle = tg; g.fill(); C.outline(g, '#0a0c1e', 3.5);
      g.fillStyle = '#3a4268'; g.fillRect(l, t + 4, r - l, 18); g.strokeStyle = '#0a0c1e'; g.lineWidth = 3.5; g.strokeRect(l, t + 4, r - l, 18);
      g.fillStyle = 'rgba(200,210,255,.25)'; g.fillRect(l + 2, t + 6, r - l - 4, 3);
      for (let x = l + 12; x < r; x += 24) { g.fillStyle = METALL; g.beginPath(); g.arc(x, t + 14, 2, 0, P.TAU); g.fill(); }
      const f = () => { g.beginPath(); g.moveTo(l + 8, t + 26); g.lineTo(r - 8, t + 26); };
      P.neon(g, f, ORA, 4, 16);
      glowJobs.push([[[l + 8, t + 26], [r - 8, t + 26]], ORA]);
    };
    catwalk(S1); catwalk(S2);
    P.texturize(stage, P.noiseTex(stage.width, stage.height, { scale: 0.006, oct: 4, seed: 351, lo: 60, hi: 200, res: 0.25 }), 'soft-light', 0.3);
    out.push({ src: 'stage.webp', space: 'world', x: X0, y: Y0, w: WW, h: HH, canvas: stage });

    // ------------------------------------------------------------ brilho do neon (pisca)
    const glowLayer = (filter) => {
      const { c, g } = P.worldCanvas(X0, Y0, WW, HH, 1);
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const j of glowJobs) {
        if (!filter(j)) continue;
        let col, fn;
        if (j[0] === 'frame') { col = j[5]; fn = () => { g.beginPath(); g.rect(j[1], j[2], j[3] - j[1], j[4] - j[2]); }; }
        else if (j[0] === 'circle') { col = j[4]; fn = () => { g.beginPath(); g.arc(j[1], j[2], j[3], 0, P.TAU); }; }
        else if (j[0] === 'paths') { col = j[2]; fn = strokePaths(g, j[1]); }
        else { col = j[1]; const tb = j[0]; fn = () => { g.beginPath(); g.moveTo(tb[0][0], tb[0][1]); g.lineTo(tb[1][0], tb[1][1]); }; }
        g.shadowColor = col; g.shadowBlur = 30; g.strokeStyle = rgba(col, 0.5); g.lineWidth = 14; fn(); g.stroke();
        g.shadowBlur = 0; g.strokeStyle = rgba(col, 0.25); g.lineWidth = 34; fn(); g.stroke();
      }
      return c;
    };
    out.push({ src: 'glow.webp', space: 'world', x: X0, y: Y0, w: WW, h: HH, blend: 'lighter', anim: 'flicker', drop: 0.02, phase: 0.1, canvas: glowLayer(j => j[0] !== 'paths' || j[2] !== PINK) });
    out.push({ src: 'glow2.webp', space: 'world', x: X0, y: Y0, w: WW, h: HH, blend: 'lighter', anim: 'flicker', drop: 0.08, phase: 0.7, canvas: glowLayer(j => j[0] === 'paths' && j[2] === PINK) });
    return out;
  },
};
