/* MAPA 3 — ARENA CÓSMICA
   Crepúsculo dramático: zênite azul-índigo com estrelas, horizonte laranja; lua grande e planeta anelado;
   formações rochosas fantásticas com torres e cachoeiras luminosas; montanhas distantes em silhueta;
   ilha-pilar cilíndrica no centro, iluminada por trás (luz de borda laranja). */
MAPS.cosmica = {
  fallback: '#2a1d55',
  async paint() {
    const ID = 'cosmica', ST = Sim.STAGES[ID];
    const { rgba, rng, smooth, poly, mix } = P;
    const out = [];
    const ORANGE = '#ff9a52', GOLD = '#ffd58a', ROCK = '#4e4373', ROCKD = '#2b2448', ROCKL = '#8a76b0';

    // ------------------------------------------------------------ céu
    {
      const L = C.screen(0.01), { g, W, H } = L, R = rng(201);
      P.vgrad(g, 0, 0, W, H, [[0, '#070a26'], [0.2, '#141a52'], [0.4, '#33307a'], [0.55, '#7a3f86'], [0.66, '#d0577a'], [0.76, '#ff8a52'], [0.86, '#ffc879'], [1, '#ffe2a8']]);
      const neb = P.noiseTex(W, H, { scale: 0.0018, oct: 5, seed: 21, colorA: '#000000', colorB: '#6a8cff', res: 0.25, warp: 1.6, gamma: 2.4 });
      P.overlayTex(g, neb, 'screen', 0.3);
      const neb2 = P.noiseTex(W, H, { scale: 0.0024, oct: 5, seed: 22, colorA: '#000000', colorB: '#ff6ad0', res: 0.25, warp: 2, gamma: 2.8 });
      P.overlayTex(g, neb2, 'screen', 0.18);
      // escurece de novo o topo para as estrelas aparecerem
      P.vgrad(g, 0, 0, W, H * 0.45, [[0, 'rgba(5,6,24,.55)'], [1, 'rgba(5,6,24,0)']]);
      P.stars(g, W, H, 1100, R, { maxY: 0.62, col: '#eaf0ff', big: 0.04 });
      // brilho do sol que acabou de se pôr
      P.radial(g, L.U(0.55), L.V(0.86), W * 0.6, '#ff9a52', 0.45, 'screen');
      P.radial(g, L.U(0.55), L.V(0.9), W * 0.25, '#fff0c0', 0.5, 'screen');
      // raios
      P.rays(g, L.U(0.55), L.V(0.95), -Math.PI / 2, 2.2, H * 0.9, 18, R, '#ffc890', 0.08);
      // lua
      {
        const mx = L.U(0.79), my = L.V(0.2), mr = L.S(0.065);
        P.radial(g, mx, my, mr * 4, '#b8c8ff', 0.25, 'screen');
        P.radial(g, mx, my, mr * 1.8, '#e8ecff', 0.35, 'screen');
        const mg = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
        mg.addColorStop(0, '#ffffff'); mg.addColorStop(0.7, '#dfe2f6'); mg.addColorStop(1, '#a9aed8');
        g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, P.TAU); g.fill();
        g.save(); g.beginPath(); g.arc(mx, my, mr, 0, P.TAU); g.clip();
        const Rm = rng(7);
        for (let k = 0; k < 14; k++) {
          const a = Rm() * P.TAU, d = Math.sqrt(Rm()) * mr * 0.9, cr = mr * (0.04 + Rm() * 0.14);
          const cx = mx + Math.cos(a) * d, cy = my + Math.sin(a) * d;
          g.fillStyle = 'rgba(120,124,170,.16)'; g.beginPath(); g.arc(cx, cy, cr, 0, P.TAU); g.fill();
          g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, cr, Math.PI * 0.9, Math.PI * 1.8); g.stroke();
        }
        for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(140,146,190,.25)'; g.beginPath(); g.ellipse(mx + (Rm() - 0.5) * mr, my + (Rm() - 0.5) * mr, mr * (0.2 + Rm() * 0.3), mr * (0.15 + Rm() * 0.2), Rm() * 3, 0, P.TAU); g.fill(); }
        // terminador (lado em sombra, do lado oposto ao horizonte)
        const tg = g.createLinearGradient(mx - mr, my - mr, mx + mr, my + mr); tg.addColorStop(0, 'rgba(40,40,110,.45)'); tg.addColorStop(0.5, 'rgba(40,40,110,0)');
        g.fillStyle = tg; g.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
        g.restore();
      }
      // planeta anelado ao longe
      {
        const px = L.U(0.13), py = L.V(0.13), pr = L.S(0.022);
        P.radial(g, px, py, pr * 3, '#a0b0ff', 0.18, 'screen');
        g.save(); g.translate(px, py); g.rotate(-0.35);
        g.strokeStyle = 'rgba(220,200,255,.55)'; g.lineWidth = pr * 0.18; g.beginPath(); g.ellipse(0, 0, pr * 2.1, pr * 0.5, 0, Math.PI, P.TAU); g.stroke();
        const pg = g.createRadialGradient(-pr * 0.3, -pr * 0.3, pr * 0.1, 0, 0, pr); pg.addColorStop(0, '#f4d6ff'); pg.addColorStop(1, '#7a5ab8');
        g.fillStyle = pg; g.beginPath(); g.arc(0, 0, pr, 0, P.TAU); g.fill();
        g.strokeStyle = 'rgba(240,220,255,.75)'; g.beginPath(); g.ellipse(0, 0, pr * 2.1, pr * 0.5, 0, 0, Math.PI); g.stroke();
        g.restore();
      }
      out.push({ src: 'sky.webp', space: 'screen', par: 0.01, zoom: 0.02, canvas: L.c });
      out.push({ fx: 'twinkle', space: 'screen', n: 50, top: 0.5, col: '#e8efff' });
      out.push({ fx: 'shooting', space: 'screen' });
    }

    // ------------------------------------------------------------ montanhas em silhueta no horizonte
    {
      const L = C.screen(0.03), { g, W, H } = L;
      const m1 = P.cv(W, H);
      C.mountains(m1.getContext('2d'), { seed: 31, base: L.V(0.9), h: 0.22, n: 9, wid: 0.06, sharp: 1.1,
        col: '#6a3f78', lit: '#ff9a6a', dark: '#4a2e62', fog: '#ff9a62', fogA: 0.7, fogH: 0.7, strokes: 120 });
      g.drawImage(P.blurred(m1, 3), 0, 0);
      const m2 = P.cv(W, H);
      C.mountains(m2.getContext('2d'), { seed: 32, base: L.V(0.97), h: 0.2, n: 7, wid: 0.07, sharp: 1.2,
        col: '#3a2858', lit: '#a0507a', dark: '#2a1c44', fog: '#d2607a', fogA: 0.6, fogH: 0.5, strokes: 100 });
      g.drawImage(P.blurred(m2, 1.5), 0, 0);
      out.push({ src: 'far.webp', space: 'screen', par: 0.03, zoom: 0.05, canvas: L.c });
    }

    // ------------------------------------------------------------ formações rochosas com torres e cachoeiras
    {
      const L = C.screen(0.07), { g, W, H } = L, R = rng(221);
      const lay = P.cv(W, H), x = lay.getContext('2d');
      const rockMass = (pts, seed) => {
        const Rr = rng(seed);
        smooth(x, pts, true);
        let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9; for (const [a, b] of pts) { minX = Math.min(minX, a); maxX = Math.max(maxX, a); minY = Math.min(minY, b); maxY = Math.max(maxY, b); }
        const gr = x.createLinearGradient(0, minY, 0, maxY); gr.addColorStop(0, '#6c5a92'); gr.addColorStop(0.6, ROCK); gr.addColorStop(1, '#3a2f5c');
        x.fillStyle = gr; x.fill();
        x.save(); smooth(x, pts, true); x.clip();
        // pedregulhos/lóbulos com luz quente no alto-direita e sombra fria embaixo-esquerda
        const nl = Math.floor((maxX - minX) * (maxY - minY) / 5200);
        for (let k = 0; k < nl; k++) {
          const ex = minX + Rr() * (maxX - minX), ey = minY + Rr() * (maxY - minY), ew = 40 + Rr() * 160, eh = ew * (0.35 + Rr() * 0.5);
          const lg = x.createLinearGradient(ex + ew * 0.6, ey - eh, ex - ew * 0.6, ey + eh);
          lg.addColorStop(0, rgba(Rr() < 0.5 ? '#d89a9a' : '#a08ac0', 0.55)); lg.addColorStop(0.5, rgba(ROCK, 0.2)); lg.addColorStop(1, rgba('#1e1838', 0.6));
          x.fillStyle = lg; x.beginPath(); x.ellipse(ex, ey, ew, eh, (Rr() - 0.5) * 0.5, 0, P.TAU); x.fill();
          x.strokeStyle = 'rgba(20,14,40,.14)'; x.lineWidth = 3; x.beginPath(); x.ellipse(ex, ey, ew, eh, (Rr() - 0.5) * 0.5, 0.2, Math.PI * 0.9); x.stroke();
        }
        // saliências horizontais (beirais) com sombra embaixo
        x.ledges = [];
        for (let k = 0; k < 9; k++) {
          const ly2 = minY + (0.15 + Rr() * 0.75) * (maxY - minY), lx2 = minX + Rr() * (maxX - minX) * 0.8, lw = 80 + Rr() * 260;
          x.fillStyle = 'rgba(20,14,40,.45)'; x.fillRect(lx2, ly2, lw, 10 + Rr() * 8);
          x.fillStyle = 'rgba(255,190,150,.35)'; x.fillRect(lx2, ly2 - 4, lw, 4);
          x.ledges.push([lx2, ly2, lw]);
        }
        P.strokes(x, minX, minY, maxX - minX, maxY - minY, Math.floor((maxX - minX) * (maxY - minY) / 1400), Rr, [ROCKL, ROCKD, '#7a6aa0', '#c08a8a'], { len: [14, 50], width: [2, 7], ang: 0.1, angJ: 0.6, alpha: [0.08, 0.2] });
        // luz de borda laranja vinda do horizonte (por trás, à direita/baixo)
        x.globalCompositeOperation = 'source-atop';
        const rim = x.createLinearGradient(minX, maxY, maxX, minY); rim.addColorStop(0, 'rgba(255,150,90,0.0)'); rim.addColorStop(0.7, 'rgba(255,150,90,0.12)'); rim.addColorStop(1, 'rgba(255,180,110,0.35)');
        x.fillStyle = rim; x.fillRect(minX, minY, maxX - minX, maxY - minY);
        x.restore();
        smooth(x, pts, true); x.lineWidth = 6; x.strokeStyle = 'rgba(255,170,110,.35)'; x.stroke();
        const ledges = x.ledges; x.ledges = null;
        return { minX, maxX, minY, maxY, ledges, pts };
      };
      const tower = (tx, ty, w, h, seed) => {
        const Rr = rng(seed);
        x.fillStyle = '#8a7aa8'; x.fillRect(tx - w / 2, ty - h, w, h);
        const tg = x.createLinearGradient(tx - w / 2, 0, tx + w / 2, 0); tg.addColorStop(0, 'rgba(255,190,130,.4)'); tg.addColorStop(0.5, 'rgba(0,0,0,0)'); tg.addColorStop(1, 'rgba(30,20,60,.45)');
        x.fillStyle = tg; x.fillRect(tx - w / 2, ty - h, w, h);
        // ameias pontiagudas
        for (let k = 0; k < 5; k++) { const sx = tx - w / 2 + (k + 0.5) * w / 5; poly(x, [[sx - w * 0.06, ty - h], [sx + w * 0.06, ty - h], [sx, ty - h - w * (0.25 + Rr() * 0.2)]]); x.fillStyle = '#e8d8c8'; x.fill(); }
        // janelas acesas
        for (let k = 0; k < 3; k++) { const wy = ty - h * (0.25 + k * 0.25); x.fillStyle = '#2a1c40'; x.fillRect(tx - w * 0.08 + (k % 2 ? w * 0.18 : -w * 0.18), wy, w * 0.12, w * 0.22); if (Rr() < 0.75) { x.fillStyle = '#ffd27a'; x.fillRect(tx - w * 0.06 + (k % 2 ? w * 0.18 : -w * 0.18), wy + 2, w * 0.08, w * 0.16); } }
      };
      // casas escavadas na rocha, em fileiras sobre os beirais (só dentro da silhueta)
      const dwellings = (b, n, seed) => {
        const Rr = rng(seed);
        x.save(); smooth(x, b.pts, true); x.clip();
        for (const [lx2, ly2, lw] of b.ledges) {
          const cnt = Math.max(1, Math.floor(lw / 60 * (n / 10)));
          for (let k = 0; k < cnt; k++) {
            const dx = lx2 + 10 + Rr() * (lw - 20), s = L.S(0.0035 + Rr() * 0.0025), dy = ly2 - s * 1.7;
            x.fillStyle = '#1e1634'; x.beginPath(); x.moveTo(dx - s, dy + s * 1.6); x.lineTo(dx - s, dy); x.arc(dx, dy, s, Math.PI, 0); x.lineTo(dx + s, dy + s * 1.6); x.fill();
            if (Rr() < 0.55) { x.fillStyle = Rr() < 0.5 ? '#ffd27a' : '#ffb060'; x.beginPath(); x.moveTo(dx - s * 0.55, dy + s * 1.4); x.lineTo(dx - s * 0.55, dy); x.arc(dx, dy, s * 0.55, Math.PI, 0); x.lineTo(dx + s * 0.55, dy + s * 1.4); x.fill(); P.radial(x, dx, dy + s * 0.6, s * 3, '#ffc070', 0.25, 'lighter'); }
          }
        }
        x.restore();
      };
      // grande arco à esquerda
      const A = rockMass([[L.U(-0.08), L.V(1.1)], [L.U(-0.06), L.V(0.3)], [L.U(0.0), L.V(0.16)], [L.U(0.1), L.V(0.12)], [L.U(0.22), L.V(0.16)], [L.U(0.3), L.V(0.28)], [L.U(0.33), L.V(0.5)], [L.U(0.3), L.V(0.72)], [L.U(0.25), L.V(0.75)], [L.U(0.21), L.V(0.5)], [L.U(0.15), L.V(0.42)], [L.U(0.1), L.V(0.52)], [L.U(0.09), L.V(1.1)]], 1);
      dwellings(A, 22, 2);
      tower(L.U(0.06), L.V(0.15), L.S(0.035), L.S(0.06), 3);
      tower(L.U(0.24), L.V(0.19), L.S(0.03), L.S(0.05), 4);
      tower(L.U(0.17), L.V(0.13), L.S(0.025), L.S(0.04), 5);
      // crescente rochoso à direita
      const Bm = rockMass([[L.U(0.78), L.V(1.1)], [L.U(0.8), L.V(0.7)], [L.U(0.88), L.V(0.45)], [L.U(0.95), L.V(0.28)], [L.U(0.93), L.V(0.12)], [L.U(0.88), L.V(0.06)], [L.U(0.97), L.V(0.08)], [L.U(1.03), L.V(0.22)], [L.U(1.04), L.V(0.5)], [L.U(0.99), L.V(0.78)], [L.U(0.95), L.V(1.1)]], 6);
      dwellings(Bm, 12, 7);
      tower(L.U(0.88), L.V(0.08), L.S(0.022), L.S(0.035), 8);
      // torre média ao centro-direita
      const Cm = rockMass([[L.U(0.62), L.V(1.1)], [L.U(0.63), L.V(0.6)], [L.U(0.66), L.V(0.48)], [L.U(0.71), L.V(0.46)], [L.U(0.74), L.V(0.58)], [L.U(0.75), L.V(1.1)]], 9);
      dwellings(Cm, 6, 10);
      tower(L.U(0.685), L.V(0.47), L.S(0.028), L.S(0.05), 11);
      // cachoeiras luminosas
      for (const [u0, v0, len, wd] of [[0.14, 0.42, 0.5, 0.012], [0.18, 0.45, 0.45, 0.008], [0.26, 0.6, 0.4, 0.01]]) {
        const fx = L.U(u0), fy = L.V(v0), fl = L.S(len), fw = L.S(wd);
        const wg = x.createLinearGradient(0, fy, 0, fy + fl); wg.addColorStop(0, 'rgba(200,240,255,.9)'); wg.addColorStop(1, 'rgba(200,240,255,0)');
        x.fillStyle = wg; x.fillRect(fx - fw / 2, fy, fw, fl);
        x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 2;
        for (let k = 0; k < 4; k++) { const sx = fx - fw / 2 + R() * fw; x.beginPath(); x.moveTo(sx, fy); x.lineTo(sx, fy + fl * (0.4 + R() * 0.5)); x.stroke(); }
      }
      g.drawImage(P.blurred(lay, 1.2), 0, 0);
      // névoa da base
      P.vgrad(g, 0, L.V(0.55), W, H, [[0, 'rgba(255,140,110,0)'], [0.6, 'rgba(255,150,110,0.35)'], [1, 'rgba(255,190,140,0.7)']]);
      // cristais flutuando (elementos celestiais)
      for (const [u, v, s] of [[0.36, 0.3, 0.012], [0.6, 0.22, 0.009], [0.42, 0.55, 0.008], [0.57, 0.62, 0.01]]) {
        const cx = L.U(u), cy = L.V(v), sz = L.S(s);
        P.radial(g, cx, cy, sz * 5, '#8ff0ff', 0.35, 'lighter');
        poly(g, [[cx, cy - sz * 2.2], [cx + sz * 0.8, cy], [cx, cy + sz * 1.6], [cx - sz * 0.8, cy]]);
        const cg = g.createLinearGradient(cx - sz, cy, cx + sz, cy); cg.addColorStop(0, '#e8ffff'); cg.addColorStop(1, '#5fb8e8'); g.fillStyle = cg; g.fill();
      }
      out.push({ src: 'mid.webp', space: 'screen', par: 0.07, zoom: 0.1, canvas: L.c });
      out.push({ fx: 'motes', space: 'screen', n: 36, col: 'rgba(255,200,130,1)' });
    }

    // ------------------------------------------------------------ névoa rosada que desliza
    const mist = (seed, y0, y1, a, col) => {
      const W = 2560, H = 1440, c0 = P.cv(W, H), g = c0.getContext('2d'), R = rng(seed);
      for (let k = 0; k < 44; k++) {
        const cx = R() * W, cy = y0 + R() * (y1 - y0), rw = 140 + R() * 420, rh = rw * (0.12 + R() * 0.14);
        g.fillStyle = rgba(col, a * (0.4 + R() * 0.6));
        for (const ox of [-W, 0, W]) { g.beginPath(); g.ellipse(cx + ox, cy, rw, rh, 0, 0, P.TAU); g.fill(); }
      }
      P.vgrad(g, 0, y1 - 60, W, H - y1 + 60, [[0, rgba(col, 0)], [1, rgba(col, a * 0.9)]]);
      return P.blurred(c0, 24);
    };
    out.push({ src: 'mist.webp', space: 'screen', par: 0.11, zoom: 0.14, scroll: 0.3, canvas: mist(231, 1000, 1400, 0.45, '#ffb48a') });

    // ------------------------------------------------------------ palco: ilha-pilar
    const X0 = -620, Y0 = -260, WW = 1240, HH = 1040, K = 2;
    const { c: stage, g } = P.worldCanvas(X0, Y0, WW, HH, K);
    const R = rng(241);
    const [LIP, PIL] = ST.solids;
    const cx = 0;
    // corpo cilíndrico
    {
      const top = PIL.t - 4, bot = 760, l = PIL.l, r = PIL.r;
      const body = () => { g.beginPath(); g.moveTo(l, top); g.lineTo(r, top); g.lineTo(r, bot); g.lineTo(l, bot); g.closePath(); };
      body(); const cg = g.createLinearGradient(l, 0, r, 0);
      cg.addColorStop(0, '#2a2246'); cg.addColorStop(0.18, '#5a4a7e'); cg.addColorStop(0.45, '#7a6696'); cg.addColorStop(0.75, '#4a3c6c'); cg.addColorStop(0.92, '#2a2244'); cg.addColorStop(1, '#ff9a62');
      g.fillStyle = cg; g.fill();
      g.save(); body(); g.clip();
      // fiadas curvas de pedra (sugerem o cilindro)
      for (let y = top + 34; y < bot; y += 46 + R() * 10) {
        g.strokeStyle = 'rgba(20,14,40,.6)'; g.lineWidth = 4;
        g.beginPath(); g.ellipse(cx, y - 30, (r - l) / 2, 30, 0, 0.08, Math.PI - 0.08); g.stroke();
        g.strokeStyle = 'rgba(200,180,230,.18)'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(cx, y - 27, (r - l) / 2, 30, 0, 0.2, Math.PI - 0.2); g.stroke();
        // juntas verticais com espaçamento que encolhe nas bordas
        for (let a = 0.15 + R() * 0.2; a < Math.PI - 0.1; a += 0.32 + R() * 0.12) {
          const jx = cx - Math.cos(a) * (r - l) / 2, jy = y - 30 + Math.sin(a) * 30;
          g.strokeStyle = 'rgba(20,14,40,.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(jx, jy - 40); g.lineTo(jx, jy - 4); g.stroke();
        }
      }
      P.strokes(g, l, top, r - l, bot - top, 600, R, ['#a08ac8', '#1a1430', '#c08a9a'], { len: [8, 30], width: [2, 6], angJ: 3, alpha: [0.08, 0.2] });
      // janelas-runa verticais
      for (const sx of [-150, 0, 150]) {
        const wy = 170 + (sx === 0 ? 40 : 0);
        g.fillStyle = '#120c26'; g.beginPath(); g.moveTo(sx - 16, wy + 120); g.lineTo(sx - 16, wy); g.arc(sx, wy, 16, Math.PI, 0); g.lineTo(sx + 16, wy + 120); g.closePath(); g.fill();
        g.fillStyle = '#7ff4ff'; g.beginPath(); g.moveTo(sx - 7, wy + 108); g.lineTo(sx - 7, wy); g.arc(sx, wy, 7, Math.PI, 0); g.lineTo(sx + 7, wy + 108); g.closePath(); g.fill();
      }
      // anel entalhado com runas
      g.strokeStyle = 'rgba(15,10,30,.7)'; g.lineWidth = 6; g.beginPath(); g.ellipse(cx, 380, (r - l) / 2, 32, 0, 0.05, Math.PI - 0.05); g.stroke();
      for (let a = 0.35; a < Math.PI - 0.3; a += 0.24) { const rx = cx - Math.cos(a) * (r - l) / 2 * 0.98, ry = 380 + Math.sin(a) * 32 - 18; g.fillStyle = 'rgba(127,244,255,.8)'; g.fillRect(rx - 3, ry - 10, 6, 20); g.fillRect(rx - 8, ry - 3, 16, 5); }
      // raízes/trepadeiras pendendo da borda
      g.restore();
      body(); C.outline(g, '#140e26', 5);
      g.save(); g.globalCompositeOperation = 'destination-out';
      const fg = g.createLinearGradient(0, 520, 0, 760); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = fg; g.fillRect(l - 20, 520, r - l + 40, 260); g.restore();
    }
    // borda/anel do topo (bloco sólido LIP)
    {
      const l = LIP.l, r = LIP.r, t = LIP.t, b = LIP.b;
      const band = () => { g.beginPath(); g.moveTo(l, t + 6); g.lineTo(r, t + 6); g.lineTo(r, b - 14); g.quadraticCurveTo(r - 20, b + 2, r - 60, b + 4); g.quadraticCurveTo(cx, b + 26, l + 60, b + 4); g.quadraticCurveTo(l + 20, b + 2, l, b - 14); g.closePath(); };
      band(); const bg = g.createLinearGradient(l, 0, r, 0);
      bg.addColorStop(0, '#3a2e5a'); bg.addColorStop(0.3, '#8a78aa'); bg.addColorStop(0.6, '#6e5c92'); bg.addColorStop(0.9, '#3a2e5a'); bg.addColorStop(1, '#ffa06a');
      g.fillStyle = bg; g.fill();
      g.save(); band(); g.clip();
      for (let x = l + 30; x < r; x += 60 + R() * 30) { g.strokeStyle = 'rgba(20,14,40,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, t + 20); g.lineTo(x + 4, b + 10); g.stroke(); }
      g.strokeStyle = 'rgba(20,14,40,.6)'; g.lineWidth = 4; g.beginPath(); g.moveTo(l, t + 40); g.quadraticCurveTo(cx, t + 58, r, t + 40); g.stroke();
      P.strokes(g, l, t, r - l, b - t + 30, 220, R, ['#b8a2d8', '#1a1430'], { len: [8, 24], width: [2, 5], angJ: 3, alpha: [0.1, 0.25] });
      g.restore();
      band(); C.outline(g, '#140e26', 5);
      // musgo/grama do topo, com luz de borda quente
      P.grassTop(g, l, r, t, R, { top: '#4f8a5a', hi: '#ffc48a', mid: '#2f6a4e', dark: '#1a3a36', outline: '#0e1a1e' }, { thick: 22, hang: 26, over: 20, blade: 18, density: 2.4 });
      // musgo pendurado nas bordas
      g.save(); g.lineCap = 'round';
      for (let k = 0; k < 70; k++) {
        const side = R() < 0.5 ? -1 : 1, bx = side * (LIP.r - R() * 120), L2 = 20 + R() * 60;
        g.strokeStyle = R() < 0.5 ? '#2f6a4e' : '#1f4a3e'; g.lineWidth = 3 + R() * 4;
        g.beginPath(); g.moveTo(bx, t + 14); g.quadraticCurveTo(bx + side * 6, t + 14 + L2 * 0.6, bx + side * (4 + R() * 8), t + 14 + L2); g.stroke();
      }
      g.restore();
      P.grassTop(g, l + 10, r - 10, t, rng(9), { top: '#5f9a62', hi: '#ffd09a', mid: '#3a7a52', dark: '#1a3a36', outline: '#0e1a1e' }, { thick: 10, hang: 6, over: 6, blade: 8, density: 1 });
    }
    P.texturize(stage, P.noiseTex(stage.width, stage.height, { scale: 0.005, oct: 4, seed: 251, lo: 40, hi: 215, res: 0.25 }), 'soft-light', 0.45);
    P.texturize(stage, P.grain(stage.width, stage.height, 0.3, 252), 'overlay', 0.1);
    out.push({ src: 'stage.webp', space: 'world', x: X0, y: Y0, w: WW, h: HH, canvas: stage });

    // ------------------------------------------------------------ brilho animado das runas + borda quente
    {
      const { c, g } = P.worldCanvas(X0, Y0, WW, HH, 1);
      for (const sx of [-150, 0, 150]) { const wy = 230 + (sx === 0 ? 40 : 0); P.radial(g, sx, wy, 90, '#6ff0ff', 0.5); }
      for (let a = 0.35; a < Math.PI - 0.3; a += 0.24) { const rx = -Math.cos(a) * 300 * 0.98, ry = 380 + Math.sin(a) * 32 - 18; P.radial(g, rx, ry, 30, '#7ff4ff', 0.6); }
      P.radial(g, LIP.r + 10, 0, 160, '#ff9a52', 0.25);
      out.push({ src: 'glow.webp', space: 'world', x: X0, y: Y0, w: WW, h: HH, blend: 'lighter', anim: 'pulse', speed: 0.03, canvas: c });
    }
    out.push({ src: 'mistfront.webp', space: 'screen', par: 0.3, zoom: 0.35, scroll: 0.7, front: true, alpha: 0.7, canvas: mist(261, 1300, 1460, 0.5, '#ffc09a') });
    return out;
  },
};
