/* TUMULTO — servidor: entrega o jogo e roda as partidas online (autoritativo, 60 ticks/s). */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('./ws-mini.js');
const Sim = require('./public/sim.js');

const PORT = Number(process.env.PORT) || 3000;
const PUB = path.join(__dirname, 'public');
const STEP = 1000 / 60;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  let u;
  try { u = decodeURIComponent((req.url || '/').split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (u === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (u === '/' || u === '') u = '/index.html';
  const f = path.normalize(path.join(PUB, u));
  if (!f.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
    const ext = path.extname(f);
    const cache = (ext === '.webp' || ext === '.png' || ext === '.jpg') ? 'public, max-age=3600' : 'no-cache';
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, maxPayload: 4096 });
const rooms = new Map();
let nextId = 1;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  let c;
  do { c = ''; for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; } while (rooms.has(c));
  return c;
}
function cleanName(s) { return String(s || '').replace(/[^\p{L}\p{N} _\-.]/gu, '').trim().slice(0, 16) || 'Jogador'; }
function validChar(c) { return Sim.CHARS[c] ? c : 'brasa'; }
function validStage(k) { return Object.prototype.hasOwnProperty.call(Sim.STAGES, k) ? k : Sim.STAGE_KEYS[0]; }
function send(ws, o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function bcast(room, o) { const s = JSON.stringify(o); for (const m of room.members) if (m.ws && m.ws.readyState === 1) m.ws.send(s); }
function pushLobby(room) {
  bcast(room, {
    t: 'lobby', code: room.code, host: room.host, stocks: room.stocks, stage: room.stage, playing: !!room.game,
    members: room.members.map(m => ({ id: m.id, name: m.name, char: m.char, cpu: !!m.cpu, lvl: m.lvl || 0 })),
  });
}

wss.on('connection', ws => {
  const me = { id: nextId++, ws, name: 'Jogador', char: 'brasa', room: null, gi: -1 };
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  send(ws, { t: 'hello', id: me.id });
  let budget = 120, lastRefill = Date.now();
  ws.on('message', raw => {
    const now = Date.now();
    budget = Math.min(240, budget + (now - lastRefill) * 0.12); lastRefill = now;
    if (--budget < 0) return; // limite simples contra spam
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m && typeof m === 'object') handle(me, m);
  });
  ws.on('close', () => leave(me));
});
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false; try { ws.ping(); } catch (e) { /* ignora */ }
  }
}, 15000);

function handle(me, m) {
  const room = me.room;
  const isHost = room && room.host === me.id;
  switch (m.t) {
    case 'create': {
      if (me.room) leave(me);
      me.name = cleanName(m.name); me.char = validChar(m.char);
      const r = { code: newCode(), host: me.id, members: [me], stocks: 3, stage: validStage(m.stage), game: null, last: 0, endAt: 0 };
      rooms.set(r.code, r); me.room = r;
      log(`sala ${r.code} criada por ${me.name}`);
      pushLobby(r);
      break;
    }
    case 'join': {
      const r = rooms.get(String(m.code || '').toUpperCase().trim());
      if (!r) return send(me.ws, { t: 'err', msg: 'Sala não encontrada.' });
      if (r === me.room) return pushLobby(r);
      if (r.members.length >= Sim.MAX_PLAYERS) return send(me.ws, { t: 'err', msg: 'Sala cheia (máximo ' + Sim.MAX_PLAYERS + ' lutadores).' });
      if (r.game) return send(me.ws, { t: 'err', msg: 'Essa sala está no meio de uma partida. Tente de novo em instantes.' });
      if (me.room) leave(me);
      me.name = cleanName(m.name); me.char = validChar(m.char);
      r.members.push(me); me.room = r;
      log(`${me.name} entrou na sala ${r.code}`);
      pushLobby(r);
      break;
    }
    case 'char': if (room && !room.game) { me.char = validChar(m.char); pushLobby(room); } break;
    case 'stage': if (isHost && !room.game) { room.stage = validStage(String(m.k || '')); pushLobby(room); } break;
    case 'stocks': if (isHost && !room.game) { const n = m.n | 0; room.stocks = [1, 2, 3, 5].includes(n) ? n : 3; pushLobby(room); } break;
    case 'addcpu':
      if (isHost && !room.game && room.members.length < Sim.MAX_PLAYERS) {
        const lvl = Math.min(3, Math.max(1, m.lvl | 0 || 2));
        room.members.push({ id: nextId++, name: 'CPU ' + ['Fácil', 'Normal', 'Difícil'][lvl - 1], char: Sim.CHAR_KEYS[Math.floor(Math.random() * Sim.CHAR_KEYS.length)], cpu: true, lvl, gi: -1 });
        pushLobby(room);
      }
      break;
    case 'rmcpu':
      if (isHost && !room.game) { room.members = room.members.filter(x => !(x.cpu && x.id === m.id)); pushLobby(room); }
      break;
    case 'start':
      if (isHost && !room.game) {
        if (room.members.length < 2) return send(me.ws, { t: 'err', msg: 'Precisa de pelo menos 2 lutadores.' });
        startGame(room);
      }
      break;
    case 'in':
      if (room && room.game && me.gi >= 0) Sim.setInput(room.game, me.gi, { h: m.h, c: m.c });
      break;
    case 'list': {
      const list = [];
      for (const r of rooms.values()) {
        const host = r.members.find(x => x.id === r.host);
        list.push({ code: r.code, host: host ? host.name : '?', n: r.members.length, playing: !!r.game });
      }
      send(me.ws, { t: 'rooms', list: list.slice(0, 30) });
      break;
    }
    case 'ping': send(me.ws, { t: 'pong', ts: m.ts }); break;
    case 'leave': leave(me); send(me.ws, { t: 'left' }); break;
  }
}

function startGame(room) {
  const roster = room.members.slice(0, Sim.MAX_PLAYERS).map(m => ({ name: m.name, char: m.char, cpu: !!m.cpu, lvl: m.lvl || 2 }));
  room.members.forEach((m, i) => { m.gi = i < Sim.MAX_PLAYERS ? i : -1; });
  room.game = Sim.createGame(roster, { stocks: room.stocks, stage: room.stage, seed: Math.floor(Math.random() * 1e9) });
  room.last = performance.now(); room.endAt = 0;
  for (const m of room.members) send(m.ws, { t: 'start', roster, you: m.gi, stage: room.stage });
  pushLobby(room);
  log(`partida começou na sala ${room.code} — ${Sim.STAGES[room.stage].name} (${roster.map(r => r.name).join(', ')})`);
}

function leave(me) {
  const room = me.room; if (!room) return;
  me.room = null;
  room.members = room.members.filter(x => x !== me);
  if (room.game && me.gi >= 0) Sim.removePlayer(room.game, me.gi);
  me.gi = -1;
  const humans = room.members.filter(x => !x.cpu);
  if (!humans.length) { rooms.delete(room.code); log(`sala ${room.code} fechada`); return; }
  if (room.host === me.id) room.host = humans[0].id;
  pushLobby(room);
}

setInterval(() => {
  const now = performance.now();
  for (const room of rooms.values()) {
    const g = room.game; if (!g) continue;
    let n = 0;
    while (now - room.last >= STEP && n < 10) {
      Sim.step(g); room.last += STEP; n++;
      if (g.tick % 2 === 0) bcast(room, { t: 's', s: Sim.snapshot(g) });
    }
    if (n >= 10) room.last = now;
    if (g.over && !room.endAt) room.endAt = now + 3500;
    if (room.endAt && now >= room.endAt) {
      bcast(room, { t: 'end', r: Sim.results(g) });
      room.game = null; room.endAt = 0;
      for (const m of room.members) m.gi = -1;
      pushLobby(room);
    }
  }
}, 4);

function log(s) { console.log(new Date().toLocaleTimeString('pt-BR') + '  ' + s); }

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   TUMULTO rodando!                       ║');
  console.log(`  ║   Abra: http://localhost:${String(PORT).padEnd(16)}║`);
  console.log('  ║   (deixe esta janela aberta enquanto joga)║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});
