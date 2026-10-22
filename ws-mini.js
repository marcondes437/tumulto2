/* WebSocket mínimo (RFC 6455) só com módulos nativos do Node — sem dependências.
   Suporta o que o jogo precisa: mensagens de texto, ping/pong e fechamento. */
'use strict';
const crypto = require('crypto');
const { EventEmitter } = require('events');
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class Socket extends EventEmitter {
  constructor(sock, maxPayload) {
    super();
    this.sock = sock; this.maxPayload = maxPayload; this.buf = Buffer.alloc(0); this.readyState = 1; this.frag = null;
    sock.setNoDelay(true);
    sock.on('data', d => this._data(d));
    sock.on('close', () => this._closed());
    sock.on('error', () => this._closed());
  }
  _closed() { if (this.readyState === 3) return; this.readyState = 3; this.emit('close'); }
  _data(d) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    while (this.buf.length >= 2) {
      const b0 = this.buf[0], b1 = this.buf[1];
      const fin = (b0 & 0x80) !== 0, op = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; const hi = this.buf.readUInt32BE(2); len = this.buf.readUInt32BE(6); if (hi) return this.terminate(); off = 10; }
      if (len > this.maxPayload || !masked) return this.terminate();
      if (this.buf.length < off + 4 + len) return;
      const mask = this.buf.subarray(off, off + 4);
      const payload = Buffer.from(this.buf.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      this.buf = this.buf.subarray(off + 4 + len);
      if (op === 0x8) { this._frame(0x8, Buffer.alloc(0)); this.sock.end(); this._closed(); return; }
      if (op === 0x9) { this._frame(0xA, payload); continue; }
      if (op === 0xA) { this.emit('pong'); continue; }
      if (op === 0x1 || op === 0x2) { if (fin) this.emit('message', payload.toString('utf8')); else this.frag = [payload]; continue; }
      if (op === 0x0 && this.frag) {
        this.frag.push(payload);
        const total = this.frag.reduce((a, b) => a + b.length, 0);
        if (total > this.maxPayload) return this.terminate();
        if (fin) { const all = Buffer.concat(this.frag); this.frag = null; this.emit('message', all.toString('utf8')); }
      }
    }
  }
  _frame(op, data) {
    if (this.readyState !== 1) return;
    const len = data.length;
    let head;
    if (len < 126) { head = Buffer.alloc(2); head[1] = len; }
    else if (len < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2); }
    else { head = Buffer.alloc(10); head[1] = 127; head.writeUInt32BE(0, 2); head.writeUInt32BE(len, 6); }
    head[0] = 0x80 | op;
    try { this.sock.write(Buffer.concat([head, data])); } catch (e) { this._closed(); }
  }
  send(str) { this._frame(0x1, Buffer.from(str, 'utf8')); }
  ping() { this._frame(0x9, Buffer.alloc(0)); }
  close() { this._frame(0x8, Buffer.alloc(0)); this.readyState = 2; setTimeout(() => this.terminate(), 1000); }
  terminate() { try { this.sock.destroy(); } catch (e) { /* ignora */ } this._closed(); }
}

class WebSocketServer extends EventEmitter {
  constructor({ server, maxPayload }) {
    super();
    this.clients = new Set();
    server.on('upgrade', (req, sock) => {
      const key = req.headers['sec-websocket-key'];
      if (!key || String(req.headers.upgrade || '').toLowerCase() !== 'websocket') { sock.destroy(); return; }
      const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
      sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
      const ws = new Socket(sock, maxPayload || 65536);
      this.clients.add(ws);
      ws.on('close', () => this.clients.delete(ws));
      this.emit('connection', ws, req);
    });
  }
}

module.exports = { WebSocketServer };
