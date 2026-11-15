// ===================== relaynet.js : online play through public message servers =====================
// Direct browser-to-browser links (PeerJS) often fail on school wifi, phone data and strict home routers.
// This sends game data through free public MQTT servers over secure websockets instead, which almost
// every network allows. It talks to several servers at once and keeps the newest message from any of them,
// so one server going down does not end the game. Same small room API as Claude's live rooms.
const RELAY_SERVERS = window.BF_BROKERS || [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];

// ---- a tiny MQTT 3.1.1 client (connect, subscribe, publish, ping) ----
const _te = new TextEncoder(), _td = new TextDecoder();
function _mqStr(s) { const b = _te.encode(s); const o = new Uint8Array(2 + b.length); o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2); return o; }
function _mqLen(n) { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return o; }
function _mqPacket(head, ...parts) {
  let len = 0; for (const p of parts) len += p.length;
  const L = _mqLen(len), o = new Uint8Array(1 + L.length + len);
  o[0] = head; o.set(L, 1); let i = 1 + L.length; for (const p of parts) { o.set(p, i); i += p.length; }
  return o;
}
function mqttLink(url, clientId, will, onMsg, onState) {
  let ws = null, buf = new Uint8Array(0), up = false, dead = false, pingT = null, pid = 1, lastRx = 0;
  const subs = new Set();
  function send(u8) { try { if (ws && ws.readyState === 1) { ws.send(u8); return true; } } catch (e) { } return false; }
  function subscribe(topic) {
    subs.add(topic); if (!up) return;
    pid = pid % 60000 + 1;
    send(_mqPacket(0x82, new Uint8Array([pid >> 8, pid & 255]), _mqStr(topic), new Uint8Array([0])));
  }
  function publish(topic, text, retain) { if (!up) return false; return send(_mqPacket(0x30 | (retain ? 1 : 0), _mqStr(topic), _te.encode(text))); }
  function bufferedAmount() { try { return ws ? ws.bufferedAmount : 0; } catch (e) { return 0; } }
  function parse() {
    while (buf.length >= 2) {
      let mul = 1, len = 0, i = 1, b;
      do { if (i >= buf.length) return; b = buf[i++]; len += (b & 127) * mul; mul *= 128; } while (b & 128);
      if (buf.length < i + len) return;
      const head = buf[0], body = buf.subarray(i, i + len);
      buf = buf.slice(i + len);
      const type = head >> 4;
      if (type === 2) {                                   // CONNACK
        if (body[1] === 0) { up = true; lastRx = Date.now(); for (const s of subs) { pid = pid % 60000 + 1; send(_mqPacket(0x82, new Uint8Array([pid >> 8, pid & 255]), _mqStr(s), new Uint8Array([0]))); } onState(true); }
        else { dead = true; try { ws.close(); } catch (e) { } }
      } else if (type === 3) {                            // PUBLISH
        const tl = (body[0] << 8) | body[1], topic = _td.decode(body.subarray(2, 2 + tl));
        let k = 2 + tl; if ((head >> 1) & 3) k += 2;
        try { onMsg(topic, _td.decode(body.subarray(k))); } catch (e) { }
      }
    }
  }
  function open() {
    if (dead) return;
    try { ws = new WebSocket(url, ['mqtt']); } catch (e) { onState(false); return; }
    ws.binaryType = 'arraybuffer';
    const t0 = setTimeout(() => { if (!up) try { ws.close(); } catch (e) { } }, 7000);
    ws.onopen = () => {
      const flags = 0x02 | (will ? 0x04 : 0);
      const parts = [_mqStr('MQTT'), new Uint8Array([4, flags, 0, 30]), _mqStr(clientId)];
      if (will) parts.push(_mqStr(will.topic), _mqStr(will.text));
      send(_mqPacket(0x10, ...parts));
    };
    ws.onmessage = e => { lastRx = Date.now(); const d = new Uint8Array(e.data); const n = new Uint8Array(buf.length + d.length); n.set(buf); n.set(d, buf.length); buf = n; parse(); };
    ws.onclose = () => {
      clearTimeout(t0); const was = up; up = false; buf = new Uint8Array(0); onState(false, was);
      if (!dead) setTimeout(open, was ? 800 : 4000);     // keep trying quietly
    };
    ws.onerror = () => { };
  }
  // keep the line busy and notice a dead one fast: a connection can look open after wifi drops or a laptop
  // sleeps, and without this the game would sit frozen for up to a minute before noticing
  pingT = setInterval(() => {
    if (!up) return;
    send(new Uint8Array([0xC0, 0]));
    if (Date.now() - lastRx > 7000) { try { ws.close(); } catch (e) { } }
  }, 2500);
  open();
  return { subscribe, publish, bufferedAmount, isUp: () => up, close() { dead = true; clearInterval(pingT); try { ws && ws.close(); } catch (e) { } } };
}

// ---- rooms on top of the links ----
function makeRelayClaude(scope = 'main') {
  const me = Math.random().toString(36).slice(2, 10);
  const base = 'blockfront/v' + (typeof GAME_BUILD !== 'undefined' ? GAME_BUILD : 0) + '/' + String(scope).toLowerCase().replace(/[^a-z0-9-]/g, '');
  const rooms = new Map();          // name -> { mine, mineS, seq, sentS, sentT, others: Map(id -> {p, t, seq}), snap }
  const KEEP = 1200, STALE = 5000, MAX_BUF = 96 * 1024;
  const note = t => { if (typeof netNote === 'function') netNote(t); };
  const roomOf = n => { if (!rooms.has(n)) rooms.set(n, { mine: {}, mineS: '{}', seq: 0, sentS: '', sentT: 0, others: new Map(), snap: [] }); return rooms.get(n); };
  const safe = n => encodeURIComponent(n).replace(/[%+#/]/g, '_');
  const byTopic = new Map();        // safe room name -> room name
  let alive = true, readyRes = null;
  const readyP = new Promise(r => { readyRes = r; });

  function rebuild(r) {
    const now = Date.now();
    for (const [k, v] of r.others) if (now - v.t > STALE) r.others.delete(k);
    r.snap = Object.freeze([{ peer: me, isMe: true, sameTab: true, presence: r.mine, updatedAt: now },
      ...[...r.others.entries()].map(([k, v]) => ({ peer: k, isMe: false, sameTab: false, presence: v.p, updatedAt: v.t }))]);
  }
  function onMsg(topic, text) {
    // topic: base/room/<safeRoom>/<id>   or   base/bye/<id>
    const rest = topic.slice(base.length + 1).split('/');
    if (rest[0] === 'bye') { for (const r of rooms.values()) { r.others.delete(rest[1]); rebuild(r); } return; }
    if (rest[0] !== 'room' || rest[2] === me) return;
    const name = byTopic.get(rest[1]); if (!name) return;
    const r = roomOf(name);
    if (!text) { r.others.delete(rest[2]); rebuild(r); return; }
    let m; try { m = JSON.parse(text); } catch (e) { return; }
    const o = r.others.get(rest[2]);
    if (o && m.s <= o.seq && m.s > o.seq - 1e6) { o.t = Date.now(); return; }   // older copy from a slower server
    r.others.set(rest[2], { p: m.p || {}, t: Date.now(), seq: m.s });
    rebuild(r);
  }
  const links = RELAY_SERVERS.map((url, i) => mqttLink(url, 'bf' + me + i, { topic: base + '/bye/' + me, text: '1' }, onMsg, (up, was) => {
    if (up) setTimeout(() => readyRes(true), 900);      // a moment for the other servers to join in
    else if (was && links.every(l => !l.isUp())) note('Connection lost, reconnecting...');
  }));
  links.forEach(l => l.subscribe(base + '/bye/+'));
  setTimeout(() => readyRes(links.some(l => l.isUp())), 9000);

  function tick() {
    if (!alive) return;
    const now = Date.now();
    for (const [name, r] of rooms) {
      rebuild(r);
      if (r.sentS === r.mineS && now - r.sentT < KEEP) continue;
      r.seq++;
      const msg = '{"s":' + r.seq + ',"p":' + r.mineS + '}', topic = base + '/room/' + safe(name) + '/' + me;
      let sent = false;
      for (const l of links) if (l.isUp() && l.bufferedAmount() < MAX_BUF) sent = l.publish(topic, msg) || sent;   // a slow server skips a beat instead of piling up
      if (sent) { r.sentS = r.mineS; r.sentT = now; }
    }
  }
  const iv = setInterval(tick, 100);
  function bye() { for (const name of rooms.keys()) for (const l of links) l.publish(base + '/room/' + safe(name) + '/' + me, ''); for (const l of links) l.publish(base + '/bye/' + me, '1'); }
  addEventListener('pagehide', () => { try { bye(); } catch (e) { } });

  const lobby = {
    async join(name) {
      if (!(await readyP)) throw new Error('could not connect');
      const r = roomOf(name);
      if (!byTopic.has(safe(name))) { byTopic.set(safe(name), name); links.forEach(l => l.subscribe(base + '/room/' + safe(name) + '/+')); }
      rebuild(r);
      return {
        name,
        presence(patch) { r.mine = Object.assign({}, r.mine, patch); r.mineS = JSON.stringify(r.mine); rebuild(r); return Promise.resolve(); },
        peers() { return r.snap; },
        leave() { return Promise.resolve(); },
      };
    },
  };
  const close = () => { if (!alive) return; alive = false; try { bye(); } catch (e) { } clearInterval(iv); setTimeout(() => links.forEach(l => l.close()), 150); };
  return { close, ready: () => readyP, use: async n => n === 'room' ? lobby : null, _debug: () => ({ me, up: links.map(l => l.isUp()), rooms: [...rooms.keys()] }) };
}
