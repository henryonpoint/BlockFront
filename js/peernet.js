// ===================== peernet.js : online play outside Claude (PeerJS) =====================
// Gives the same small room API the game uses inside Claude (room.join(name) -> presence(), peers()).
// One player's browser acts as a relay "hub" with a fixed id; everyone else connects to it.
// If the hub leaves, the others race to take over the hub id.
const PEER_HUB = 'blockfront-leo-battle-v2';
// TURN relays let phones and computers on different networks (home wifi, school, mobile data) reach each other
async function peerIce() {
  const ice = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.relay.metered.ca:80'] },
    { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }];
  try {
    const user = (Math.floor(Date.now() / 1000) + 24 * 3600) + ':blockfront', enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode('openrelayprojectsecret'), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(user)));
    ice.push({ urls: ['turn:staticauth.openrelay.metered.ca:80', 'turn:staticauth.openrelay.metered.ca:443?transport=tcp'], username: user, credential: btoa(String.fromCharCode(...sig)) });
  } catch (e) { }
  return ice;
}
// scope: which channel ('lobby', or a game code). first: 'host' (make the channel), 'join' (it must already exist) or 'any'
function makePeerClaude(PeerCls, scope = 'main', first = 'any') {
  const me = Math.random().toString(36).slice(2, 10);
  const rooms = new Map();          // name -> { mine, mineS, sentS, sentT, others: Map(peer -> {p, t}), snap }
  let ICE = null; const opts = () => ({ debug: 0, config: { iceServers: ICE || [] } });
  const note = t => { if (typeof netNote === 'function') netNote(t); };
  const HUB_ID = PEER_HUB + '-b' + (typeof GAME_BUILD !== 'undefined' ? GAME_BUILD : 0) + '-' + String(scope).toLowerCase().replace(/[^a-z0-9]/g, '');   // each version and each game has its own hub
  const MAX_BUF = 64 * 1024, KEEP = 1500, STALE = 5000;
  let lastHubMsg = 0, peer = null, isHub = false, hubConn = null, clients = new Map(), ready = null, alive = true, paused = false;
  // the hub keeps one entry per player per room and sends each client only what changed
  const entries = new Map();        // 'id|room' -> { id, room, p, s, ver, t }
  const roomOf = n => { if (!rooms.has(n)) rooms.set(n, { mine: {}, mineS: '{}', sentS: '', sentT: 0, others: new Map(), snap: [] }); return rooms.get(n); };
  const buf = c => { try { return (c.dataChannel && c.dataChannel.bufferedAmount) || 0; } catch (e) { return 0; } };
  const canSend = c => c && c.open && buf(c) < MAX_BUF;

  function rebuild(r) {
    const now = Date.now();
    for (const [k, v] of r.others) if (now - v.t > STALE) r.others.delete(k);
    r.snap = Object.freeze([{ peer: me, isMe: true, sameTab: true, presence: r.mine, updatedAt: now },
      ...[...r.others.entries()].map(([k, v]) => ({ peer: k, isMe: false, sameTab: false, presence: v.p, updatedAt: v.t }))]);
  }
  function gotPresence(id, room, p) { if (id === me) return; const r = roomOf(room); r.others.set(id, { p, t: Date.now() }); rebuild(r); }
  function setEntry(id, room, p, s) {
    const k = id + '|' + room, e = entries.get(k), now = Date.now();
    if (e) { if (e.s !== s) { e.p = p; e.s = s; e.ver++; } e.t = now; }
    else entries.set(k, { id, room, p, s, ver: 1, t: now });
  }

  // hub: every tick, each client gets the entries that changed (or a keep-alive), one small message each
  function hubTick() {
    const now = Date.now();
    for (const [name, r] of rooms) setEntry(me, name, r.mine, r.mineS);
    for (const [k, e] of entries) if (now - e.t > STALE) entries.delete(k);
    for (const c of clients.values()) {
      if (!c.open) continue;
      if (!c.sent) c.sent = new Map();
      for (const [k, e] of entries) {
        if (e.id === c.cid) continue;
        const st = c.sent.get(k);
        if (st && st.ver === e.ver && now - st.t < KEEP) continue;
        if (!canSend(c)) break;                      // slow connection: skip this round instead of piling up
        try { c.send({ t: 'p', id: e.id, room: e.room, p: e.p }); c.sent.set(k, { ver: e.ver, t: now }); } catch (er) { break; }
      }
    }
  }
  // client: send my rooms when they change, plus a keep-alive
  function clientTick() {
    if (!canSend(hubConn)) return;
    const now = Date.now();
    for (const [name, r] of rooms) {
      if (r.sentS === r.mineS && now - r.sentT < KEEP) continue;
      try { hubConn.send({ t: 'p', id: me, room: name, p: r.mine }); r.sentS = r.mineS; r.sentT = now; } catch (e) { return; }
      if (!canSend(hubConn)) return;
    }
  }

  function becomeHub() {
    return new Promise(res => {
      const p = new PeerCls(HUB_ID, opts());
      let settled = false;
      p.on('open', () => { settled = true; peer = p; isHub = true; entries.clear(); res(true); });
      p.on('error', err => { if (!settled) { settled = true; try { p.destroy(); } catch (e) { } res(false); } });
      p.on('connection', c => {
        c.on('open', () => clients.set(c.peer, c));
        c.on('data', d => {
          if (!d || d.t !== 'p' || typeof d.room !== 'string') return;
          c.cid = d.id;
          setEntry(d.id, d.room, d.p, JSON.stringify(d.p));
          gotPresence(d.id, d.room, d.p);
        });
        const drop = () => { clients.delete(c.peer); if (c.cid) for (const k of [...entries.keys()]) if (k.startsWith(c.cid + '|')) entries.delete(k); };
        c.on('close', drop); c.on('error', drop);
      });
      p.on('disconnected', () => { if (isHub && peer === p && alive && !paused) { try { p.reconnect(); } catch (e) { } } });
      setTimeout(() => { if (!settled) { settled = true; try { p.destroy(); } catch (e) { } res(false); } }, 8000);
    });
  }
  function joinHub() {
    return new Promise(res => {
      const p = new PeerCls(undefined, opts());
      let done = false;
      const fail = () => { if (!done) { done = true; try { p.destroy(); } catch (e) { } res(false); } };
      p.on('error', fail);
      p.on('open', () => {
        const c = p.connect(HUB_ID, { reliable: false, serialization: 'json' });
        c.on('open', () => { done = true; peer = p; hubConn = c; isHub = false; lastHubMsg = Date.now(); for (const r of rooms.values()) r.sentS = ''; res(true); });
        c.on('data', d => { lastHubMsg = Date.now(); if (d && d.t === 'p') gotPresence(d.id, d.room, d.p); });
        c.on('close', () => { if (hubConn === c) { hubConn = null; reconnect(); } });
        c.on('error', fail);
        setTimeout(fail, 8000);
      });
      setTimeout(fail, 10000);
    });
  }
  async function connectAny(how = 'any') {
    if (!ICE) ICE = await peerIce();
    if (how === 'host') {                         // a new game: this browser becomes its hub
      note('Setting up your game...');
      for (let tries = 0; tries < 3 && alive; tries++) { if (await becomeHub()) { note('Your game is ready'); return true; } await new Promise(r => setTimeout(r, 800)); }
      return false;
    }
    if (how === 'join') {                         // joining by code: the game has to exist already
      for (let tries = 0; tries < 4 && alive; tries++) {
        note(tries ? 'Still looking for that game (try ' + (tries + 1) + ' of 4)...' : 'Looking for the game...');
        if (await joinHub()) { note('Connected to the game'); return true; }
        await new Promise(r => setTimeout(r, 700));
      }
      return false;
    }
    for (let tries = 0; tries < 6 && alive; tries++) {
      note(tries ? 'Still trying to reach the other players (try ' + (tries + 1) + ' of 6)...' : 'Looking for other players...');
      if (await joinHub()) { note('Connected to the battle'); return true; }
      if (await becomeHub()) { note('Connected. Waiting for others to join'); return true; }
      await new Promise(r => setTimeout(r, 600 + Math.random() * 900));
    }
    return false;
  }
  let reconnecting = false;
  async function reconnect() {
    if (reconnecting || !alive || paused) return; reconnecting = true;
    try { if (peer) peer.destroy(); } catch (e) { }
    peer = null; isHub = false; hubConn = null; clients.clear();
    await new Promise(r => setTimeout(r, Math.random() * 1200));
    while (alive && !paused && !(await connectAny())) await new Promise(r => setTimeout(r, 3000));
    reconnecting = false;
  }
  setInterval(() => {
    if (paused) return;
    for (const r of rooms.values()) rebuild(r);
    if (isHub) hubTick(); else clientTick();
    if (!isHub && hubConn && !document.hidden && Date.now() - lastHubMsg > 6000) { const c = hubConn; hubConn = null; try { c.close(); } catch (e) { } reconnect(); }
  }, 100);
  // a phone that gets locked or switches apps stops running the page; if it is the hub, hand the hub to someone else
  let hideT = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hideT = setTimeout(() => { if (document.hidden && isHub) { paused = true; isHub = false; try { peer && peer.destroy(); } catch (e) { } peer = null; clients.clear(); } }, 2500);
    } else {
      clearTimeout(hideT);
      if (paused) { paused = false; reconnect(); }
      else if (!isHub && !hubConn && !reconnecting) reconnect();
    }
  });
  addEventListener('beforeunload', () => { alive = false; try { peer && peer.destroy(); } catch (e) { } });
  addEventListener('pagehide', () => { try { if (isHub && peer) peer.destroy(); } catch (e) { } });

  const lobby = {
    async join(name) {
      if (!ready) ready = connectAny(first);
      if (!(await ready)) throw new Error('could not connect');
      const r = roomOf(name);
      return {
        name,
        presence(patch) { r.mine = Object.assign({}, r.mine, patch); r.mineS = JSON.stringify(r.mine); rebuild(r); return Promise.resolve(); },
        peers() { return r.snap; },
        leave() { return Promise.resolve(); },
      };
    },
  };
  const close = () => { alive = false; try { peer && peer.destroy(); } catch (e) { } peer = null; clients.clear(); hubConn = null; };
  return { close, use: async n => n === 'room' ? lobby : null, _debug: () => ({ me, isHub, clients: clients.size, hub: !!hubConn, paused, entries: entries.size }) };
}
