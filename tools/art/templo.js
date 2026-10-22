/* MAPA 1 — TEMPLO CONGELADO
   Noite azul estrelada, montanhas com neve, névoa ciano, pagode distante,
   árvore estilizada com copas azul/violeta (duas copas são plataformas),
   bloco de cantaria com neve, rocha flutuante à direita e duas lanternas de pedra. */
MAPS.templo = {
  fallback: '#0d2350',
  async paint() {
    const ID = 'templo', ST = Sim.STAGES[ID];
    const { mix, rgba, rng, smooth, poly } = P;
    const out = [];
    const PAL = {
      skyTop: '#060d26', sky1: '#0c1f4d', sky2: '#17468a', sky3: '#2f8fc0', sky4: '#7fd9ea',
      fog: '#8ae8f2', mtnLit: '#4f8ccc', mtn: '#2b5c9c', mtnDark: '#1a3a72', snow: '#e8f6ff',
      stone: '#3a4c7c', stoneAlt: '#475a8c', stoneLight: '#a9d2f6', stoneDark: '#121a38', mortar: '#0d1330',
      out: '#0a0f28', snowTop: '#ffffff', snowMid: '#e3f1ff', snowSh: '#93b4e2',
      leaf: '#2f6fd0', leafLit: '#8fd2ff', leafDark: '#1b3c94', under: '#8c4fd6', underRim: '#f08ae6',
      bark: '#2c2546', barkMid: '#463c6c', barkLit: '#8a86c8', glow: '#9ff4ff',
    };

    // ------------------------------------------------------------ céu
    {
      const L = C.screen(0.01), { g, W, H } = L, R = rng(11);
      P.vgrad(g, 0, 0, W, H, [[0, PAL.skyTop], [0.28, PAL.sky1], [0.55, PAL.sky2], [0.78, PAL.sky3], [1, PAL.sky4]]);
      // nebulosa suave
      const neb = P.noiseTex(W, H, { scale: 0.0016, oct: 5, seed: 4, colorA: '#000000', colorB: '#3fd0ff', res: 0.25, warp: 1.2, gamma: 2.2 });
      P.overlayTex(g, neb, 'screen', 0.35);
      const neb2 = P.noiseTex(W, H, { scale: 0.0022, oct: 4, seed: 9, colorA: '#000000', colorB: '#a060ff', res: 0.25, warp: 1.5, gamma: 2.6 });
      P.overlayTex(g, neb2, 'screen', 0.22);
      // aurora discreta
      const au = P.cv(W, H), ag = au.getContext('2d');
      { const g = ag;
      for (let k = 0; k < 3; k++) {
        const y0 = L.V(0.08 + k * 0.05);
        for (let x = 0; x < W; x += 6) {
          const yy = y0 + Math.sin(x * 0.0025 + k * 1.7) * 60 + Math.sin(x * 0.007 + k) * 18;
          const hgt = 120 + 60 * Math.sin(x * 0.004 + k * 2);
          const gr = g.createLinearGradient(0, yy, 0, yy + hgt);
          gr.addColorStop(0, 'rgba(120,255,230,0)'); gr.addColorStop(0.7, `rgba(120,255,230,${0.06 + 0.04 * Math.sin(x * 0.01 + k)})`); gr.addColorStop(1, 'rgba(120,255,230,0)');
          g.fillStyle = gr; g.fillRect(x, yy, 6, hgt);
        }
      }
      }
      g.save(); g.globalCompositeOperation = 'screen'; g.drawImage(P.blurred(au, 18), 0, 0); g.restore();
      P.stars(g, W, H, 900, R, { maxY: 0.7, col: '#e8fbff', big: 0.035 });
      // brilho do luar atrás das montanhas
      P.radial(g, L.U(0.38), L.V(0.62), W * 0.55, '#6fe0ff', 0.28, 'screen');
      P.radial(g, L.U(0.38), L.V(0.7), W * 0.25, '#c8fbff', 0.25, 'screen');
      out.push({ src: 'sky.webp', space: 'screen', par: 0.01, zoom: 0.02, canvas: L.c });
      out.push({ fx: 'twinkle', space: 'screen', n: 45, top: 0.5 });
    }

    // ------------------------------------------------------------ montanhas distantes
    {
      const L = C.screen(0.035), { g, W, H } = L;
      const back = P.cv(W, H);
      C.mountains(back.getContext('2d'), { seed: 5, base: L.V(0.84), h: 0.5, n: 7, wid: 0.1, sharp: 1.15,
        peaks: [[0.12, 0.5, 0.14], [0.3, 0.36, 0.1], [0.7, 0.42, 0.12], [0.9, 0.52, 0.14], [0.52, 0.22, 0.12]],
        col: '#3768a6', lit: '#8ec0ec', dark: '#22477e', snow: '#eef8ff', snowLine: 0.3, fog: '#8ae8f2', fogA: 0.95, fogH: 0.7, strokes: 260 });
      g.drawImage(P.blurred(back, 3), 0, 0);
      const front = P.cv(W, H);
      C.mountains(front.getContext('2d'), { seed: 8, base: L.V(0.92), h: 0.36, n: 6, wid: 0.08, sharp: 1.1,
        peaks: [[0.02, 0.34, 0.1], [0.2, 0.26, 0.08], [0.82, 0.3, 0.09], [1.0, 0.36, 0.1]],
        col: '#21497f', lit: '#5d95cf', dark: '#162f5e', snow: '#dff1ff', snowLine: 0.22, fog: '#8ae8f2', fogA: 0.9, fogH: 0.6, strokes: 200 });
      g.drawImage(P.blurred(front, 1.5), 0, 0);
      P.vgrad(g, 0, L.V(0.6), W, H - L.V(0.6), [[0, rgba(PAL.fog, 0)], [0.6, rgba(PAL.fog, 0.4)], [1, rgba(PAL.fog, 0.75)]]);
      out.push({ src: 'far.webp', space: 'screen', par: 0.035, zoom: 0.06, canvas: L.c });
    }

    // ------------------------------------------------------------ plano médio: penhascos, pagode, luzes
    {
      const L = C.screen(0.08), { g, W, H } = L, R = rng(31);
      // penhasco nevado com pagode à esquerda
      const cliff = (cx, cy, w, h, col, lit) => {
        const pts = [[cx - w, cy + h * 2]];
        for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([cx - w + t * w * 2, cy - Math.sin(t * Math.PI) * h * 0.25 + (R() - 0.5) * 18]); }
        pts.push([cx + w, cy + h * 2]);
        smooth(g, pts, true);
        const gr = g.createLinearGradient(0, cy - h * 0.3, 0, cy + h * 1.2); gr.addColorStop(0, lit); gr.addColorStop(1, col);
        g.fillStyle = gr; g.fill();
      };
      const lay = P.cv(W, H), x = lay.getContext('2d');
      const gsave = g; // desenhar pagode num canvas separado para desfocar levemente
      {
        const g = x;
        const px = L.U(0.11), py = L.V(0.74), s = L.S(0.07);
        // base do penhasco
        smooth(g, [[px - s * 3.2, py + s * 3], [px - s * 2.6, py + s * 0.25], [px - s * 1.2, py - s * 0.05], [px + s * 0.8, py + s * 0.02], [px + s * 2.4, py + s * 0.3], [px + s * 3, py + s * 3]], true);
        g.fillStyle = '#1f4a80'; g.fill();
        // pagode de três andares (silhueta própria)
        const tier = (y, w, h, roofW) => {
          g.fillStyle = '#163a6c'; g.fillRect(px - w / 2, y - h, w, h);
          // janelas iluminadas
          for (let k = -2; k <= 2; k++) { g.fillStyle = '#c9fbff'; g.fillRect(px + k * w * 0.18 - w * 0.04, y - h * 0.7, w * 0.08, h * 0.4); }
          // telhado curvo
          g.beginPath(); g.moveTo(px - roofW / 2, y - h + 2);
          g.quadraticCurveTo(px - roofW * 0.3, y - h - s * 0.08, px - roofW * 0.18, y - h - s * 0.22);
          g.lineTo(px + roofW * 0.18, y - h - s * 0.22);
          g.quadraticCurveTo(px + roofW * 0.3, y - h - s * 0.08, px + roofW / 2, y - h + 2);
          g.quadraticCurveTo(px, y - h - s * 0.1, px - roofW / 2, y - h + 2);
          g.fillStyle = '#10305c'; g.fill();
          g.strokeStyle = rgba('#e8f8ff', 0.75); g.lineWidth = 3; g.stroke();
        };
        tier(py, s * 1.6, s * 0.45, s * 2.6);
        tier(py - s * 0.68, s * 1.2, s * 0.38, s * 2.0);
        tier(py - s * 1.28, s * 0.85, s * 0.32, s * 1.45);
        g.fillStyle = '#10305c'; g.fillRect(px - 3, py - s * 2.1, 6, s * 0.5);
        // fileira de luzes (lanternas flutuantes)
        for (let k = 0; k < 9; k++) {
          const lx = px - s * 2.6 + k * s * 0.62 + (R() - 0.5) * 10, ly = py + s * 0.35 + Math.sin(k) * 6;
          P.radial(g, lx, ly, s * 0.28, '#bff7ff', 0.55, 'lighter');
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(lx, ly, 4, 0, P.TAU); g.fill();
        }
      }
      g.drawImage(P.blurred(lay, 1.5), 0, 0);
      // massas de pedra escuras nas bordas (enquadramento)
      cliff(L.U(-0.02), L.V(0.9), L.S(0.16), L.S(0.12), '#13305e', '#24508a');
      cliff(L.U(1.03), L.V(0.88), L.S(0.18), L.S(0.14), '#13305e', '#24508a');
      // pequenas rochas flutuantes distantes (desfocadas)
      { const rc = P.cv(W, H), rg = rc.getContext('2d');
        for (const [u, v, sz] of [[0.86, 0.4, 0.035], [0.94, 0.56, 0.022], [0.66, 0.28, 0.016], [0.04, 0.42, 0.02]]) {
          const cx = L.U(u), cy = L.V(v), w = L.S(sz), Rr = rng(Math.floor(u * 1000));
          const pts = [[cx - w, cy], [cx - w * 0.6, cy - w * 0.08], [cx + w * 0.7, cy - w * 0.1], [cx + w, cy], [cx + w * 0.7, cy + w * 0.5], [cx + w * 0.2, cy + w * 1.4], [cx - w * 0.3, cy + w * 0.9], [cx - w * 0.8, cy + w * 0.4]];
          smooth(rg, pts, true);
          const gr = rg.createLinearGradient(cx - w, cy, cx + w, cy + w); gr.addColorStop(0, '#5f92cc'); gr.addColorStop(1, '#22477e');
          rg.fillStyle = gr; rg.fill();
          rg.beginPath(); rg.ellipse(cx, cy - w * 0.05, w * 1.02, w * 0.16, 0, 0, P.TAU); rg.fillStyle = '#e6f6ff'; rg.fill();
          for (let k = 0; k < 3; k++) { const ix = cx + (Rr() - 0.5) * w, iy = cy + w * (0.4 + Rr() * 0.7); rg.fillStyle = 'rgba(190,250,255,.6)'; P.poly(rg, [[ix - 4, iy], [ix + 4, iy], [ix, iy + 16 + Rr() * 18]]); rg.fill(); }
        }
        const fg2 = rg.createLinearGradient(0, 0, 0, H); fg2.addColorStop(0, 'rgba(0,0,0,0)'); rg.globalCompositeOperation = 'source-atop'; rg.fillStyle = rgba(PAL.fog, 0.25); rg.fillRect(0, 0, W, H);
        g.drawImage(P.blurred(rc, 2), 0, 0); }
      // véus de névoa
      { const vc = P.cv(W, H), vg = vc.getContext('2d');
        for (let k = 0; k < 14; k++) {
          const cx = R() * W, cy = L.V(0.72 + R() * 0.25), rw = L.S(0.12 + R() * 0.2), rh = rw * 0.18;
          vg.fillStyle = rgba('#bff6ff', 0.18 + R() * 0.2); vg.beginPath(); vg.ellipse(cx, cy, rw, rh, 0, 0, P.TAU); vg.fill();
        }
        g.drawImage(P.blurred(vc, 30), 0, 0); }
      P.vgrad(g, 0, L.V(0.78), W, H, [[0, rgba(PAL.fog, 0)], [0.35, rgba(PAL.fog, 0.55)], [1, rgba('#c9fbff', 0.85)]]);
      out.push({ src: 'mid.webp', space: 'screen', par: 0.08, zoom: 0.12, canvas: L.c });
    }

    // ------------------------------------------------------------ faixa de névoa que desliza (repete na horizontal)
    const fogBand = (seed, y0, y1, a) => {
      const W = 2560, H = 1440, c0 = P.cv(W, H), g = c0.getContext('2d'), R = rng(seed);
      for (let k = 0; k < 40; k++) {
        const cx = R() * W, cy = y0 + R() * (y1 - y0), rw = 120 + R() * 380, rh = rw * (0.12 + R() * 0.12);
        g.fillStyle = rgba('#d6fbff', a * (0.4 + R() * 0.6));
        for (const ox of [-W, 0, W]) { g.beginPath(); g.ellipse(cx + ox, cy, rw, rh, 0, 0, P.TAU); g.fill(); }
      }
      return P.blurred(c0, 26);
    };
    out.push({ src: 'fog.webp', space: 'screen', par: 0.12, zoom: 0.15, scroll: 0.25, canvas: fogBand(41, 980, 1400, 0.35) });
    out.push({ fx: 'snow', space: 'screen' });

    // ------------------------------------------------------------ palco (preso ao mundo)
    const X0 = -800, Y0 = -660, WW = 1620, HH = 1260, K = 2;
    const { c: stage, g } = P.worldCanvas(X0, Y0, WW, HH, K);
    const R = rng(51);
    const M = ST.solids[0], RK = ST.solids[1], A = ST.soft[0], Bp = ST.soft[1];

    // rocha pendurada sob o bloco principal (os primeiros 120 de altura têm colisão: solids[2])
    const underRock = (g) => {
      const pts = [[M.l + 12, M.b - 4], [M.r - 12, M.b - 4], [M.r - 40, 260], [282, 330], [250, 380], [150, 440], [120, 500], [40, 560], [-30, 520], [-90, 470], [-180, 420], [-250, 360], [-282, 320], [M.l + 30, 250]];
      smooth(g, pts, true);
      const gr = g.createLinearGradient(M.l, M.b, M.r, 560); gr.addColorStop(0, '#2a3c6c'); gr.addColorStop(0.5, '#1a2650'); gr.addColorStop(1, '#0e1636');
      g.fillStyle = gr; g.fill();
      g.save(); smooth(g, pts, true); g.clip();
      // estratos
      g.lineCap = 'round';
      for (let k = 0; k < 40; k++) {
        const y = M.b + 10 + R() * 340, x = -320 + R() * 600, L2 = 40 + R() * 160;
        g.strokeStyle = rgba(R() < 0.5 ? '#5f7fc0' : '#0a1028', 0.35); g.lineWidth = 2 + R() * 4;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + L2 / 2, y + (R() - 0.5) * 16, x + L2, y + R() * 20 - 4); g.stroke();
      }
      // luz ciano na lateral esquerda
      const rl = g.createLinearGradient(-340, 0, -120, 0); rl.addColorStop(0, rgba('#7fe8ff', 0.45)); rl.addColorStop(1, rgba('#7fe8ff', 0));
      g.fillStyle = rl; g.fillRect(-360, M.b, 260, 380);
      g.restore();
      smooth(g, pts, true); C.outline(g, PAL.out, 4);
      // pingentes de gelo
      for (const [x, y, s] of [[40, 556, 1], [150, 440, 0.6], [-180, 420, 0.7], [250, 380, 0.5]]) {
        g.save(); g.shadowColor = '#7ff4ff'; g.shadowBlur = 16;
        poly(g, [[x - 12 * s, y - 8], [x + 12 * s, y - 8], [x, y + 60 * s]]); g.fillStyle = '#aef8ff'; g.fill(); g.restore();
      }
    };
    // ponta rochosa sob a rocha flutuante
    const rockTip = (g) => {
      const pts = [[RK.l + 8, RK.b - 4], [RK.r - 8, RK.b - 4], [RK.r - 30, 40], [590, 90], [548, 150], [500, 80], [RK.l + 18, 30]];
      smooth(g, pts, true);
      const gr = g.createLinearGradient(RK.l, RK.b, RK.r, 150); gr.addColorStop(0, '#2a3c6c'); gr.addColorStop(1, '#101838');
      g.fillStyle = gr; g.fill(); C.outline(g, PAL.out, 4);
    };
    underRock(g);
    rockTip(g);
    // dissolve a parte de baixo na névoa
    g.save(); g.globalCompositeOperation = 'destination-out';
    let fgr = g.createLinearGradient(0, 380, 0, 600); fgr.addColorStop(0, 'rgba(0,0,0,0)'); fgr.addColorStop(1, 'rgba(0,0,0,0.9)');
    g.fillStyle = fgr; g.fillRect(X0, 380, WW, 400);
    fgr = g.createLinearGradient(0, 60, 0, 170); fgr.addColorStop(0, 'rgba(0,0,0,0)'); fgr.addColorStop(1, 'rgba(0,0,0,0.85)');
    g.fillStyle = fgr; g.fillRect(RK.l - 20, 60, RK.r - RK.l + 40, 200);
    g.restore();

    // ---- árvore
    const LEAF = { lit: PAL.leafLit, mid: PAL.leaf, dark: PAL.leafDark, under: PAL.under, rim: PAL.underRim, outline: '#0d0c2a' };
    const trunkPts = C.cpts([-185, 40], [-120, -150], [-265, -300], [-125, -470], 28);
    const crownPts = C.cpts([-125, -470], [-95, -505], [-75, -525], [-70, -560], 8);
    const branch = (p0, p1, p2, w0, w1) => () => C.ribbon(g, C.qpts(p0, p1, p2, 16), w0, w1);
    const paintBark = (pathFn) => {
      pathFn(); g.fillStyle = PAL.bark; g.fill();
      g.save(); pathFn(); g.clip();
      const gr = g.createLinearGradient(-330, 0, -60, 0); gr.addColorStop(0, rgba(PAL.barkLit, 0.9)); gr.addColorStop(0.4, rgba(PAL.barkMid, 0.6)); gr.addColorStop(1, rgba('#120e24', 0.75));
      g.fillStyle = gr; g.fillRect(-700, -700, 1100, 800);
      P.strokes(g, -520, -640, 760, 700, 700, R, ['#120e24', PAL.barkLit, '#5a4f86', '#2a2246'], { len: [16, 60], width: [1.5, 5], ang: -Math.PI / 2, angJ: 0.7, alpha: [0.15, 0.45] });
      // brilho ciano na borda esquerda
      g.globalCompositeOperation = 'lighter';
      const rim = g.createLinearGradient(-300, 0, -200, 0); rim.addColorStop(0, rgba('#5fd8ff', 0.0)); rim.addColorStop(0.5, rgba('#5fd8ff', 0.18)); rim.addColorStop(1, rgba('#5fd8ff', 0));
      g.fillStyle = rim; g.fillRect(-320, -640, 160, 700);
      g.restore();
      pathFn(); C.outline(g, '#0c0a1c', 4);
    };
    const limbs = [
      branch([-200, -330], [-290, -385], [-375, -405], 30, 14),
      branch([-125, -440], [10, -480], [160, -455], 30, 14),
      () => C.ribbon(g, trunkPts, 96, 42),
      () => C.ribbon(g, crownPts, 44, 26),
      branch([-178, -60], [-300, -100], [-430, -100], 40, 16),
      branch([-210, -250], [-120, -262], [-10, -240], 36, 16),
      // raízes
      branch([-200, 10], [-250, 10], [-292, 2], 30, 10),
      branch([-160, 10], [-110, 8], [-60, 4], 26, 8),
    ];
    const snowTops = (cu, Rd) => {
      g.save(); cu.body(); g.clip();
      for (const [x, y, r] of cu.circles) {
        const sg = g.createLinearGradient(0, y - r, 0, y - r * 0.2); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#bcd6ff');
        g.fillStyle = sg; g.beginPath(); g.ellipse(x + r * 0.05, y - r * 0.72, r * 0.98, r * (0.42 + Rd() * 0.14), 0, 0, P.TAU); g.fill();
      }
      g.restore();
    };
    const dome = (cx, cy, w, h, seed) => { const Rd = rng(seed); const cu = C.cushion(g, cx, cy, w, h, Rd, LEAF, { bumps: Math.round(w / 34) }); snowTops(cu, Rd); };
    const pad = (P0, seed) => {
      const Rd = rng(seed), w = P0.r - P0.l + 34, cx = (P0.l + P0.r) / 2;
      C.cushion(g, cx, P0.t + 30, w, 46, Rd, LEAF, { bumps: Math.round(w / 30), under: 0.45 });
      P.snowCap(g, P0.l, P0.r, P0.t, Rd, { top: PAL.snowTop, mid: PAL.snowMid, shadow: '#a8b8f0', outline: '#1a1f4a' }, { thick: 14, drip: 16, over: 14 });
    };
    // ordem: copas do fundo -> galhos/tronco -> copa do topo -> copas-plataforma
    for (const f of limbs) paintBark(f);
    dome(-385, -415, 290, 95, 61);
    dome(175, -455, 330, 100, 62);
    dome(-70, -565, 420, 125, 63);
    pad(A, 64); pad(Bp, 65);
    // monte de neve na base do tronco (decoração atrás dos lutadores)
    {
      const mound = [[-310, 6], [-285, -18], [-250, -30], [-215, -46], [-170, -50], [-125, -38], [-90, -24], [-55, -10], [-35, 6]];
      smooth(g, mound, true);
      const mg = g.createLinearGradient(-300, -50, -60, 6); mg.addColorStop(0, '#ffffff'); mg.addColorStop(0.6, '#d3e6ff'); mg.addColorStop(1, '#8fb0e0');
      g.fillStyle = mg; g.fill(); C.outline(g, '#1a2550', 3);
      g.save(); smooth(g, mound, true); g.clip();
      for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(120,150,220,.25)'; g.beginPath(); g.ellipse(-280 + k * 45 + R() * 20, -8 + R() * 10, 30, 8, 0.1, 0, P.TAU); g.fill(); }
      g.restore();
    }

    // ---- lanternas de pedra (decoração, não bloqueiam)
    const lantern = (x, s) => {
      const y = M.t, st = '#3a4a78', dk = '#1a2246', lt = '#7f9fd8';
      const box = (bx, by, bw, bh, col) => { g.fillStyle = col; g.fillRect(bx, by, bw, bh); g.strokeStyle = PAL.out; g.lineWidth = 3; g.strokeRect(bx, by, bw, bh); };
      box(x - 20 * s, y - 12 * s, 40 * s, 12 * s, st);
      box(x - 7 * s, y - 46 * s, 14 * s, 34 * s, dk);
      box(x - 18 * s, y - 52 * s, 36 * s, 7 * s, st);
      box(x - 14 * s, y - 80 * s, 28 * s, 28 * s, st);
      g.fillStyle = '#e8ffff'; g.fillRect(x - 8 * s, y - 75 * s, 16 * s, 18 * s);
      g.fillStyle = '#7fe8ff'; g.fillRect(x - 8 * s, y - 62 * s, 16 * s, 5 * s);
      g.strokeStyle = dk; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 75 * s); g.lineTo(x, y - 57 * s); g.stroke();
      // telhado com beirais curvos
      g.beginPath(); g.moveTo(x - 30 * s, y - 80 * s); g.quadraticCurveTo(x - 14 * s, y - 86 * s, x - 8 * s, y - 100 * s); g.lineTo(x + 8 * s, y - 100 * s); g.quadraticCurveTo(x + 14 * s, y - 86 * s, x + 30 * s, y - 80 * s); g.closePath();
      g.fillStyle = st; g.fill(); C.outline(g, PAL.out, 3);
      g.beginPath(); g.moveTo(x - 28 * s, y - 82 * s); g.quadraticCurveTo(x - 12 * s, y - 89 * s, x - 7 * s, y - 101 * s); g.lineTo(x + 7 * s, y - 101 * s); g.quadraticCurveTo(x + 12 * s, y - 89 * s, x + 28 * s, y - 82 * s); g.quadraticCurveTo(x, y - 92 * s, x - 28 * s, y - 82 * s);
      g.fillStyle = '#f2f9ff'; g.fill();
      g.beginPath(); g.arc(x, y - 106 * s, 5 * s, 0, P.TAU); g.fillStyle = st; g.fill(); C.outline(g, PAL.out, 2.5);
      g.fillStyle = rgba(lt, 0.6); g.fillRect(x - 20 * s, y - 12 * s, 40 * s, 2.5);
    };
    lantern(135, 1); lantern(250, 0.92);

    // ---- bloco principal de cantaria
    const blockPath = (B, r) => { g.beginPath(); g.moveTo(B.l, B.t + r); g.quadraticCurveTo(B.l, B.t, B.l + r, B.t); g.lineTo(B.r - r, B.t); g.quadraticCurveTo(B.r, B.t, B.r, B.t + r); g.lineTo(B.r, B.b - r); g.quadraticCurveTo(B.r, B.b, B.r - r, B.b); g.lineTo(B.l + r, B.b); g.quadraticCurveTo(B.l, B.b, B.l, B.b - r); g.closePath(); };
    const block = (B, seed) => {
      const Rd = rng(seed);
      g.save(); blockPath(B, 10); g.clip();
      P.stoneWall(g, B.l, B.t, B.r - B.l, B.b - B.t, Rd, { mortar: PAL.mortar, stone: PAL.stone, alt: PAL.stoneAlt, light: PAL.stoneLight, dark: PAL.stoneDark }, { rowH: [28, 52], stoneW: [44, 130], gap: 4.5 });
      const sh = g.createLinearGradient(0, B.t, 0, B.b); sh.addColorStop(0, 'rgba(10,16,48,0.0)'); sh.addColorStop(1, 'rgba(10,16,48,0.55)');
      g.fillStyle = sh; g.fillRect(B.l, B.t, B.r - B.l, B.b - B.t);
      const rl = g.createLinearGradient(B.l, 0, B.l + 90, 0); rl.addColorStop(0, rgba('#8ff0ff', 0.4)); rl.addColorStop(1, rgba('#8ff0ff', 0));
      g.fillStyle = rl; g.fillRect(B.l, B.t, 90, B.b - B.t);
      // sombra projetada pela neve
      const ss = g.createLinearGradient(0, B.t, 0, B.t + 46); ss.addColorStop(0, 'rgba(8,12,40,0.6)'); ss.addColorStop(1, 'rgba(8,12,40,0)');
      g.fillStyle = ss; g.fillRect(B.l, B.t, B.r - B.l, 46);
      g.restore();
      blockPath(B, 10); C.outline(g, PAL.out, 5);
      P.snowCap(g, B.l, B.r, B.t, Rd, { top: PAL.snowTop, mid: PAL.snowMid, shadow: PAL.snowSh, outline: '#1a2550' }, { thick: 20, drip: 30, over: 14 });
    };
    block(M, 71);
    block(RK, 72);

    // textura de pintura sobre tudo (só onde há pixels)
    const tex = P.noiseTex(stage.width, stage.height, { scale: 0.004, oct: 4, seed: 77, lo: 40, hi: 215, res: 0.25 });
    P.texturize(stage, tex, 'soft-light', 0.45);
    P.texturize(stage, P.grain(stage.width, stage.height, 0.3, 5), 'overlay', 0.12);
    out.push({ src: 'stage.webp', space: 'world', x: X0, y: Y0, w: WW, h: HH, canvas: stage });

    // ------------------------------------------------------------ brilhos animados (lanternas, copas)
    {
      const { c, g } = P.worldCanvas(X0, Y0, WW, HH, 1);
      for (const [x, s] of [[135, 1], [250, 0.92]]) {
        P.radial(g, x, -66 * s, 120 * s, '#7ff0ff', 0.55);
        P.radial(g, x, -66 * s, 34 * s, '#e8ffff', 0.9);
        P.radial(g, x, -6, 90 * s, '#7ff0ff', 0.25);
      }
      for (const P0 of [A, Bp]) P.radial(g, (P0.l + P0.r) / 2, P0.t + 40, (P0.r - P0.l) * 0.6, '#e08aff', 0.16);
      out.push({ src: 'glow.webp', space: 'world', x: X0, y: Y0, w: WW, h: HH, blend: 'lighter', anim: 'pulse', speed: 0.035, canvas: c });
    }

    // ------------------------------------------------------------ frente: névoa baixa e neve
    out.push({ src: 'fogfront.webp', space: 'screen', par: 0.3, zoom: 0.35, scroll: 0.6, front: true, alpha: 0.75, canvas: fogBand(91, 1260, 1480, 0.5) });
    out.push({ fx: 'snow', space: 'screen', front: true });
    return out;
  },
};
