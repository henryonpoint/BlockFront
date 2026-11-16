// ===================== net.js : online play =====================
// Everyone shares one live "room". Each player publishes their own state; the
// player who joined first (the host) also runs the soldiers, planes and points.
const net = {
  active: false, isHost: true, joinPerf: 0, w1: null, w2: null, myId: Math.random().toString(36).slice(2, 10), jt: 0, game: null,
  seq: 0, fx: [], hits: [], dd: [], req: [], kf: [], chat: [], cmd: [], lastSnap: [null, null], snapAt: [0, 0], snapGap: [250, 250], seen: {}, remotes: new Map(), sendT: 0, hostId: null, status: '',
};
const NPC_POOL = 100;   // up to 100 a team in solo battles (online games use up to 40, so every update stays small)
const TEAM_POOL = (typeof FOUR !== 'undefined' && FOUR) ? 24 : NPC_POOL;   // 4 teams share the work, so each gets fewer   // most computer soldiers a team can have (see the battle setup)
let npcs = [];
const r10 = v => Math.round(v * 10);

// ---------- outgoing ----------
function stamp(list, entry, max) { entry.unshift(++net.seq); entry.push(simTime); list.push(entry); while (list.length > max) list.shift(); }
let suppressFx = false;
function netFx(entry, ghost) { if (!net.active || ghost || suppressFx) return; stamp(net.fx, entry.slice(), 14); }
function netShot(from, to, kind) { if (!net.active) return; stamp(net.fx, ['s', r10(from.x), r10(from.y), r10(from.z), r10(to.x), r10(to.y), r10(to.z), kind], 14); }
function pushHit(entry) { stamp(net.hits, entry, 18); }
function netRequest(entry) { if (net.active) stamp(net.req, entry, 6); }
function attackerKey(a) {
  if (!a) return '';
  if (a === player) return 'p' + net.myId;
  if (a.isRemote) return 'p' + a.peerId;
  if (a.npcIdx !== undefined) return 'n' + a.npcIdx;
  if (a.plane !== undefined) return 'l' + a.plane;
  return '';
}
function resolveAttacker(key) {
  if (!key) return null;
  if (key[0] === 'n') return npcs[+key.slice(1)] || null;
  if (key[0] === 'p') { const id = key.slice(1); if (id === net.myId) return player; const r = net.remotes.get(id); return r ? r.char : null; }
  if (key[0] === 'l') { const pl = planes[+key.slice(1)]; return pl ? planeShooter(pl) : null; }
  return null;
}
// called from damage(): returns true when another computer decides this damage
function netRoute(c, amount, attacker, dir, force, head) {
  if (!net.active) return false;
  if (c.isRemote) {
    if (attacker === player || (net.isHost && attacker && !attacker.isRemote)) pushHit(['p', c.peerId, Math.round(amount), head ? 1 : 0, attackerKey(attacker)]);
    return true;
  }
  if (!c.isPlayer && !net.isHost) {
    if (attacker === player) pushHit(['n', net.hostId, c.npcIdx, Math.round(amount), head ? 1 : 0, dir ? +dir.x.toFixed(2) : 0, dir ? +dir.z.toFixed(2) : 0]);
    return true;
  }
  return false;
}
function netPlaneHit(pl, amt, attacker) {
  if (!net.active || pl.pilot === player) return false;
  if (pl.remote) { if (attacker === player || net.isHost) pushHit(['pl', pl.remote.peerId, pl.idx, Math.round(amt), attackerKey(attacker)]); return true; }
  if (!net.isHost) { if (attacker === player) pushHit(['pl', net.hostId, pl.idx, Math.round(amt), attackerKey(attacker)]); return true; }
  return false;
}
function netPlaneDown(pl) { if (net.active && pl.pilot === player && !net.isHost) stamp(net.fx, ['pd', pl.idx], 14); }
function netVehicleHit(v, amt, attacker) {
  if (!net.active || driverOf(v) === player) return false;
  if (v.remote) { if (attacker === player || net.isHost) pushHit(['v', v.remote.peerId, v.idx, Math.round(amt), attackerKey(attacker)]); return true; }
  if (!net.isHost) { if (attacker === player) pushHit(['v', net.hostId, v.idx, Math.round(amt), attackerKey(attacker)]); return true; }
  return false;
}
function netVehicleDown(v) { if (net.active && driverOf(v) === player && !net.isHost) stamp(net.fx, ['vd', v.idx], 14); }
function netBuildHit(b, amt) { if (net.active) pushHit(['b', b.ownerId, b.id, Math.round(amt)]); }
function netKill(c, attacker, head) {
  if (!net.active) return;
  if (c.isPlayer && !net.isHost) { stamp(net.dd, [attackerKey(attacker), head ? 1 : 0], 4); return; }
  if (net.isHost && !c.isRemote) hostKillfeed(attacker, c, head);
}
function hostKillfeed(attacker, victim, head) {
  stamp(net.kf, [attacker ? attacker.name : '', attacker ? teamIdx(attacker.team) : 9, victim.name || '', teamIdx(victim.team), head ? 1 : 0, attacker === player ? net.myId : attacker && attacker.isRemote ? attacker.peerId : ''], 8);
}

function buildPresence() {
  const p = player, o = {
    v: 2, id: net.myId, jt: net.jt, ig: 1, n: (p.name || 'Soldier').slice(0, 16), t: teamIdx(p.team),
    s: [r10(p.pos.x), r10(p.pos.y), r10(p.pos.z), Math.round(p.yaw * 100), Math.round(p.pitch * 100)],
    a: p.alive ? 1 : 0, w: p.cur, k: p.kills, d: p.deaths, m: 0, c: p.crouch ? 1 : 0, pc: p.gv || p.vehicle ? 0 : p.gliding ? 2 : p.parachute ? 1 : 0, cf: [WORLD.map, WORLD.mode],
  };
  if (p.turret) { o.m = 1; o.ti = turrets.indexOf(p.turret); o.s[3] = Math.round(p.turret.yaw * 100); o.s[4] = Math.round(p.turret.pitch * 100); }
  if (p.gv) {
    const v = p.gv; o.m = 3; o.gi = v.idx; o.gs = p.seat;
    if (p.seat === 0) o.gv = [r10(v.pos.x), r10(v.pos.y), r10(v.pos.z), Math.round(v.yaw * 100), Math.round(v.pitch * 100), Math.round(v.roll * 100), Math.round(v.turretYaw * 100), Math.round(v.gunPitch * 100), r10(v.speed)];
    if (v.T.seats[p.seat].role === 'gun') o.mg = v.T.seats[p.seat].gun ? [Math.round(v.mg2Yaw * 100), Math.round(v.mg2Pitch * 100)] : [Math.round(v.mgYaw * 100), Math.round(v.mgPitch * 100)];
  }
  if (p.planeGun) { o.m = 5; o.pg = p.planeGun.idx; }
  if (p.vehicle) { const pl = p.vehicle; o.m = 2; o.pi = pl.idx; o.pl = [r10(pl.pos.x), r10(pl.pos.y), r10(pl.pos.z), Math.round(pl.quat.x * 1000), Math.round(pl.quat.y * 1000), Math.round(pl.quat.z * 1000), Math.round(pl.quat.w * 1000), Math.round(pl.speed), pl.onGround ? 1 : 0, pl.bombs]; }
  const recent = (list, age) => list.filter(e => simTime - e[e.length - 1] < age).map(e => e.slice(0, -1));
  o.fx = recent(net.fx, 1.2); o.h = recent(net.hits, 2); o.dd = recent(net.dd, 3); o.rq = recent(net.req, 3); o.ch = recent(net.chat, 6); o.cm = recent(net.cmd, 3);
  o.b = myBuilds().slice(-24).map(b => [b.id.split('-')[1] | 0, BUILD_KEYS.indexOf(b.type), r10(b.x), r10(b.z), b.rot]);
  o.hc = net.isHost && !document.hidden ? 1 : 0;
  o.hb = net.tick || 0; o.aw = document.hidden ? 1 : 0;
  o.age = Math.round((performance.now() - net.joinPerf) / 100);
  return fitSize(o, ['fx', 'h', 'dd', 'rq', 'b', 'ch', 'cm']);
}
const _enc = new TextEncoder();
function fitSize(o, lists) {
  let n = _enc.encode(JSON.stringify(o)).length, guard = 0;
  while (n > 3800 && guard++ < 200) {
    const l = lists.find(k => Array.isArray(o[k]) && o[k].length);
    if (!l) break;
    o[l].shift(); n = _enc.encode(JSON.stringify(o)).length;
  }
  return o;
}
// the host's view of the battle, split over two extra rooms so each message stays small
function buildWorld1() {
  const o = { v: 2, id: net.myId };
  {
    o.N = npcs.map(n => {
      if (n.inactive) return 0;
      let f = (n.alive ? 1 : 0) | (n.tgtVisible || n.planeTarget ? 2 : 0) | (n.moving ? 4 : 0) | ((n.shots || 0) << 4);
      if (n.turret) f |= (turrets.indexOf(n.turret) + 1) << 8;
      const a = [Math.round(n.pos.x * 5), Math.round(n.pos.z * 5), Math.round(n.pos.y * 5), Math.round(n.heading * 20), f];
      if (n.gv) a.push((n.gv.idx + 1) * 8 + n.seat);   // which vehicle and seat (its own number: there are more vehicles than the old packed bits could hold)
      return a;
    });
    o.P = points.map(q => Math.round(q.progress * 100)); o.O = points.map(q => q.owner ? q.owner[0] : '-').join(''); if (FOUR) o.CT = points.map(q => q.capTeam ? q.capTeam[0] : '-').join('');
    o.TK = TEAMS.map(t => teamKills[t] || 0); o.KF = net.kf.filter(e => simTime - e[e.length - 1] < 8).map(e => e.slice(0, -1));
    if (gameOver) o.GO = winner;
    o.FPS = Math.round(typeof fpsNow === 'function' ? fpsNow() : 0);
    if (typeof towerMask === 'function' && TOWERS.length) o.TW = towerMask();
    if (typeof treasureState === 'function') o.TR = treasureState();
    if (typeof zombieState === 'function') { const zb = zombieState(); if (zb.length) o.ZB = zb; }
    if (typeof SHIPS2 !== 'undefined' && SHIPS2.length) o.SHP = shipState();
    if (GERMANY && typeof LEADER !== 'undefined' && LEADER.idx !== undefined) o.LB = LEADER.idx;
    if (DAM && typeof damState === 'function') o.DM = damState();
    o.CHT = net.allowCheats ? 1 : 0; net.cheatsAllowed = !!net.allowCheats;
    if (typeof SPAWNED !== 'undefined' && SPAWNED.length) o.VS = SPAWNED;
    o.CF = [BATTLE.points, BATTLE.soldiers, BATTLE.diff]; o.HS = [Math.round(holdScore.blue), Math.round(holdScore.red)]; if (typeof clownNetState === 'function') o.CL = clownNetState();
  }
  return fitSize(o, ['KF']);
}
function buildWorld2() {
  const o = { v: 2, id: net.myId };
  {
    o.PL = planes.map(pl => pl.remote || pl.pilot === player ? 0 : [pl.alive ? 1 : 0, r10(pl.pos.x), r10(pl.pos.y), r10(pl.pos.z), Math.round(pl.quat.x * 1000), Math.round(pl.quat.y * 1000), Math.round(pl.quat.z * 1000), Math.round(pl.quat.w * 1000), Math.round(pl.speed), pl.bombs]);
    o.GV = gvehicles.map(v => v.remote ? 0 : !v.alive ? [0] : (Math.abs(v.speed) < 0.05 && !occupants(v).length) ? [1, r10(v.pos.x), r10(v.pos.y), r10(v.pos.z), Math.round(v.yaw * 100)] : [v.alive ? 1 : 0, r10(v.pos.x), r10(v.pos.y), r10(v.pos.z), Math.round(v.yaw * 100), Math.round(v.pitch * 100), Math.round(v.roll * 100), Math.round(v.turretYaw * 100), Math.round(v.gunPitch * 100), Math.round(v.mgYaw * 100), Math.round(v.mgPitch * 100), r10(v.speed), ...(v.model.mg2Yaw ? [Math.round(v.mg2Yaw * 100), Math.round(v.mg2Pitch * 100)] : [])]);
    // vehicles that haven't changed since the last update are left out (0 = nothing new), with a full
    // refresh every few seconds so someone who just joined still learns where everything is
    net.w2n = (net.w2n || 0) + 1; const full = net.w2n % 16 === 1;
    net.w2last = net.w2last || [];
    net.w2same = net.w2same || [];
    // a change is sent a few more times after it stops changing, so a missed update can't leave it wrong for long
    o.GV = o.GV.map((e, i) => { const k = e === 0 ? '0' : e.join(','); if (net.w2last[i] === k) net.w2same[i] = (net.w2same[i] || 0) + 1; else { net.w2last[i] = k; net.w2same[i] = 0; } return !full && net.w2same[i] > 3 ? 0 : e; });
  }
  return o;
}

// ---------- connecting ----------
const GAME_BUILD = 73;   // bump when vehicles or the world change, so mismatched versions never mix
// the version number on the start screen and pause menu, so everyone can check they are on the same one
const GAME_DATE = 'Nov 15, 2026';
setTimeout(() => { const v = document.getElementById('verTag'); if (v) v.textContent = `Version ${GAME_BUILD}  \u00b7  ${GAME_DATE}`; const p = document.getElementById('verPause'); if (p) p.textContent = `Version ${GAME_BUILD}`; }, 0);
// field diagnostics, shown in the pause menu so a player who froze can read out what happened
const NETDIAG = { gaps: [], fails: 0 };
function netDiagGap(ms) { const now = performance.now(); NETDIAG.gaps.push([now, ms]); while (NETDIAG.gaps.length && now - NETDIAG.gaps[0][0] > 60000) NETDIAG.gaps.shift(); }
function netSendFail(e) { NETDIAG.fails++; if (typeof loopError === 'function' && NETDIAG.fails % 20 === 1) loopError('send', e); }
function netDiagText() {
  if (!net.active) return '';
  const worst = NETDIAG.gaps.reduce((m, g) => Math.max(m, g[1]), 0);
  const up = net.api && net.api.linksUp ? net.api.linksUp() + '/3 servers' : 'live room';
  return net.isHost ? `You host · ${up} · ${Math.round(fpsNow())} fps` : `Host ${net.hostFps || '?'} fps · longest wait ${(worst / 1000).toFixed(1)}s · ${up}`;
}
function netNote(t) { net.status = t; const e = document.querySelector('#connecting p'); if (e) e.textContent = t; }
// online needs either Claude's live rooms or (on the website) PeerJS
async function onlineApi(scope, first) {
  let t = 0;
  while (!window.STANDALONE && (typeof claude === 'undefined' || !claude.use) && t < 40) { await new Promise(r => setTimeout(r, 100)); t++; }
  if (typeof claude !== 'undefined' && claude.use) return { api: claude };
  // website: public message servers first (they work on almost any network), direct links as a backup
  if (typeof makeRelayClaude === 'function' && typeof WebSocket !== 'undefined' && window.BF_NET !== 'peer') {
    netNote('Connecting to the game servers...');
    const a = makeRelayClaude(scope);
    if (await a.ready()) return { api: a, close: a.close };
    a.close(); netNote('Trying a direct connection...');
  }
  if (window.Peer && typeof makePeerClaude === 'function') { const a = makePeerClaude(window.Peer, scope, first); return { api: a, close: a.close }; }
  return null;
}
async function roomsOf(scope, first) {
  const o = await onlineApi(scope, first); if (!o) return null;
  let room = null;
  try { room = await Promise.race([o.api.use('room'), new Promise(r => setTimeout(() => r(null), 20000))]); } catch (e) { room = null; }
  return room ? { room, close: o.close, api: o.api } : null;
}
// the public game list
const LOBBY = { room: null, list: null, close: null, opening: null };
async function openLobby() {
  if (LOBBY.list) return LOBBY.list;
  if (LOBBY.opening) return LOBBY.opening;
  LOBBY.opening = (async () => {
    const r = await roomsOf('lobby', 'any'); if (!r) return null;
    try { LOBBY.list = await r.room.join('bf-list-' + GAME_BUILD); LOBBY.close = r.close; } catch (e) { LOBBY.list = null; }
    return LOBBY.list;
  })();
  const l = await LOBBY.opening; LOBBY.opening = null; return l;
}
function publicGames() {
  if (!LOBBY.list) return [];
  const now = Date.now();
  return LOBBY.list.peers().filter(pe => !pe.isMe && pe.presence && pe.presence.g && pe.presence.g.pub && now - (pe.updatedAt || now) < 15000).map(pe => pe.presence.g);
}
// host or join one game. code: the game's code. asHost: true when making it
async function netConnect(code, asHost) {
  net.status = 'Connecting...'; net.code = code;
  const r = await roomsOf(code, asHost ? 'host' : 'join');
  if (!r) { netNote(asHost ? 'Could not set up an online game here' : 'Could not find a game with that code'); return false; }
  const base = 'g' + GAME_BUILD + '-' + code;
  let game = null;
  try { game = await r.room.join(base); net.w1 = await r.room.join(base + '-w1'); net.w2 = await r.room.join(base + '-w2'); } catch (e) { game = null; }
  if (!game) { netNote(asHost ? 'Could not set up the game. Try again.' : 'Could not find a game with that code. Check it and try again.'); return false; }
  net.game = game; net.closeGame = r.close; net.api = r.api; net.active = true; net.jt = Date.now(); net.joinPerf = performance.now();
  if (!asHost) { net.isHost = false; net.hostId = null; net.noHostUntil = performance.now() + 8000; net.joining = true; }   // a joiner never takes over the battle while it is still settling in
  if (asHost) { net.isHost = true; net.hostId = net.myId; return true; }
  // joining: wait until we can see the host, and read the game's map and mode
  for (let i = 0; i < 40; i++) {
    const hp = humanPeers();
    if (hp.length) { net.hostCf = (hp.find(pe => pe.presence.hc) || hp[0]).presence.cf || null; await new Promise(r2 => setTimeout(r2, 600)); net.joining = false; return true; }
    await new Promise(r2 => setTimeout(r2, 250));
  }
  netNote('Could not find a game with that code. Check it and try again.');
  net.joining = false; net.active = false; try { r.close && r.close(); } catch (e) { }
  return false;
}
// the host keeps its public listing up to date
let listT = 0;
function updateListing(dt) {
  if (!net.active || !net.isHost || !net.pub || !LOBBY.list) return;
  listT -= dt; if (listT > 0) return; listT = 3;
  LOBBY.list.presence({ g: { code: net.code, name: net.gameName, host: player.name, map: WORLD.map, mode: WORLD.mode, pts: BATTLE.points, sol: BATTLE.soldiers, n: humanPeers().length + 1, pub: true, bv: GAME_BUILD } }).catch(() => { });
}
let verWarnT = 0;
function checkVersions() {
  return;
  const ps = net.lobby.peers().filter(pe => !pe.sameTab && pe.presence && pe.presence.bv);
  const newer = ps.some(pe => pe.presence.bv > GAME_BUILD), older = ps.some(pe => pe.presence.bv < GAME_BUILD);
  if (newer || older) { verWarnT = performance.now() + 20000; showMessage(newer ? 'Someone has a newer version of the game. Reload this page to join them.' : 'Someone has an older version of the game. They need to reload their page to join you.', 8); }
}
function humanPeers() {
  if (!net.game) return [];
  return net.game.peers().filter(pe => !pe.sameTab && pe.presence && pe.presence.v === 2 && pe.presence.ig && typeof pe.presence.id === 'string');
}
function pickTeam(pref) {
  if (TEAMS.includes(pref)) return pref;
  const n = TEAMS.map(() => 0); for (const pe of humanPeers()) n[pe.presence.t] = (n[pe.presence.t] || 0) + 1;
  let best = 0; for (let i = 1; i < TEAMS.length; i++) if (n[i] < n[best]) best = i;
  return TEAMS[best];
}
// a player whose game has stopped updating (tab in the background, phone locked) can't run the battle
const hbSeen = new Map();
function peerAwake(pr) {
  if (pr.aw) return false;
  const s = hbSeen.get(pr.id), now = performance.now();
  if (!s || s.hb !== pr.hb) { hbSeen.set(pr.id, { hb: pr.hb, t: now }); return true; }
  return now - s.t < 3000;
}
function electHost() {
  if (net.joining) return;   // still connecting: never take the battle before we have even seen the host
  // the current host keeps the job; otherwise whoever has been here longest (measured by each computer's own timer, so clocks don't matter)
  const yielding = performance.now() < (net.noHostUntil || 0) && humanPeers().length > 0;
  const all = [...(document.hidden || yielding ? [] : [{ id: net.myId, age: (performance.now() - net.joinPerf) / 100, hc: net.isHost && net.hostId === net.myId }]),
    ...humanPeers().filter(pe => peerAwake(pe.presence)).map(pe => ({ id: pe.presence.id, age: pe.presence.age || 0, hc: !!pe.presence.hc }))];
  if (!all.length) return;
  const claim = all.filter(a => a.hc), pool = claim.length ? claim : all;
  pool.sort((a, b) => b.age - a.age || (a.id < b.id ? -1 : 1));
  const hostId = pool[0].id;
  const wasHost = net.isHost;
  net.hostId = hostId; net.isHost = hostId === net.myId;
  if (net.isHost && !wasHost) becomeHost();
}
function becomeHost() {
  showMessage('You are now running the battle for everyone', 2.5);
  for (const n of npcs) {
    n.target = null; n.tgtVisible = false; n.goalPoint = null; n.goal = null; n.thinkT = rand(0, 0.3); n.fireT = rand(0.3, 1);
    n.burstLeft = 0; n.mountTarget = null; n.steerT = 0; n.stuckT = 0; n.lastPos = n.pos.clone(); n.strafeT = 0; n.strafeDir = 0;
    n.avoidSide = n.avoidSide || 1; n.goalT = 0; if (n.turret) { n.turret.user = null; n.turret = null; }
    if (!n.alive && !n.inactive) n.respawnT = 3;
  }
  for (const pl of planes) { if (!pl.remote && pl.pilot !== player) { const e = new THREE.Euler().setFromQuaternion(pl.quat, 'YXZ'); pl.aiYaw = e.y; pl.aiPitch = e.x; pl.aiBank = e.z; pl.groundYaw = e.y; pl.wp = null; if (!pl.alive) pl.respawnT = 10; } }
}

// going into the background: hand the battle to someone else right away
document.addEventListener('visibilitychange', () => {
  if (!net.active || !net.game) return;
  if (document.hidden && net.isHost) { net.isHost = false; net.hostId = null; }
  net.game.presence(buildPresence()).catch(() => { });
  if (!document.hidden) { net.sendT = 0; electHost(); }
});

// ---------- remote players ----------
function remoteFor(pe) {
  const id = pe.presence.id;
  let r = net.remotes.get(id);
  const team = teamOf(pe.presence.t) || 'blue';
  if (r && r.char.team !== team) { dropRemote(id); r = null; }
  if (!r) {
    const c = new Char(team, false, 'rifle');
    c.isRemote = true; c.peerId = id; c.maxHp = 100; c.alive = false; c.model.root.visible = false;
    c.netPos = new THREE.Vector3(); c.walkPhase = 0; c.aimPitch = 0;
    r = { char: c, tag: null, name: '', planeIdx: -1, turretIdx: -1, builds: new Map() };
    net.remotes.set(id, r);
    showMessage(`${(typeof chatClean === 'function' ? chatClean : x => x)(String(pe.presence.n || 'Someone').slice(0, 16))} joined the ${teamName(team)} team`, 2.5);
  }
  return r;
}
function dropRemote(id) {
  const r = net.remotes.get(id); if (!r) return;
  const c = r.char;
  scene.remove(c.model.root); const i = chars.indexOf(c); if (i >= 0) chars.splice(i, 1);
  if (r.planeIdx >= 0 && planes[r.planeIdx]) planes[r.planeIdx].remote = null;
  if (c.planeGun && c.planeGun.gunnerRemote === c) c.planeGun.gunnerRemote = null;
  if (r.turretIdx >= 0 && turrets[r.turretIdx] && turrets[r.turretIdx].user === c) turrets[r.turretIdx].user = null;
  for (const b of r.builds.values()) removeBuild(b);
  net.remotes.delete(id);
  showMessage(`${r.name || 'A player'} left the battle`, 2);
}
function newEntries(peerId, listName, list) {
  if (!Array.isArray(list)) return [];
  const key = peerId + listName, last = net.seen[key] || 0;
  let mx = last; const out = [];
  for (const e of list) if (Array.isArray(e) && e[0] > last) { out.push(e); if (e[0] > mx) mx = e[0]; }
  net.seen[key] = mx; return out;
}
const v10 = (a, i) => new THREE.Vector3(a[i] / 10, a[i + 1] / 10, a[i + 2] / 10);

function netUpdate(dt) {
  checkVersions();
  if (!net.active) return;
  // our game was paused for a while (frozen tab, sleeping device): someone else has taken over, so don't grab it back
  const nowP = performance.now();
  if (net.lastUpd && nowP - net.lastUpd > 2500) { if (net.isHost) { net.isHost = false; net.hostId = null; } net.noHostUntil = nowP + 5000; }
  net.lastUpd = nowP;
  const peers = humanPeers();
  const ids = new Set(peers.map(pe => pe.presence.id));
  for (const id of [...net.remotes.keys()]) if (!ids.has(id)) dropRemote(id);
  electHost();
  for (const pe of peers) {
    const P = pe.presence, r = remoteFor(pe), c = r.char;
    const nm = (typeof chatClean === 'function' ? chatClean : x => x)(String(P.n || 'Soldier').replace(/[\u0000-\u001f]/g, '').slice(0, 16));
    if (nm !== r.name) { r.name = nm; c.name = nm; if (r.tag) c.model.root.remove(r.tag); r.tag = nameTag(nm, TEAM_CSS[c.team]); r.tag.position.y = 2.75; c.model.root.add(r.tag); }
    c.kills = P.k | 0; c.deaths = P.d | 0;
    const s = P.s || [0, 0, 0, 0, 0];
    c.netPos.set(s[0] / 10, s[1] / 10, s[2] / 10);
    const alive = P.a === 1;
    if (alive && !c.alive) { c.alive = true; c.pos.copy(c.netPos); c.model.root.visible = true; c.model.body.position.y = 0; c.model.root.quaternion.identity(); }
    if (!alive && c.alive) { c.alive = false; if (P.m !== 2) startRagdoll(c, new THREE.Vector3(0, 0, 1), 4); else c.model.root.visible = false; }
    // plane / turret seats
    const pi = P.m === 2 ? P.pi : -1;
    if (r.planeIdx !== pi) { if (r.planeIdx >= 0 && planes[r.planeIdx]) { planes[r.planeIdx].remote = null; planes[r.planeIdx].waitT = 15; } r.planeIdx = pi; }
    if (pi >= 0 && planes[pi] && P.pl) {
      const pl = planes[pi], a = P.pl; pl.remote = c; c.vehicle = pl;
      if (pl.pilot === player) { /* two people grabbed it at once: the host keeps it */ if (!net.isHost) interact(); }
      pl.pos.lerp(v10(a, 0), 0.5); pl.quat.slerp(new THREE.Quaternion(a[3] / 1000, a[4] / 1000, a[5] / 1000, a[6] / 1000).normalize(), 0.5);
      pl.speed = a[7]; pl.onGround = !!a[8]; pl.alive = true; pl.model.g.visible = true; pl.model.bomb.visible = a[9] > 0;
      c.model.root.visible = false;
    } else { c.vehicle = null; if (c.alive) c.model.root.visible = true; }
    // riding as a plane's gunner
    if (P.m === 5 && planes[P.pg] && c.alive) { const pl = planes[P.pg]; c.planeGun = pl; pl.gunnerRemote = c; c.model.root.visible = false; c.pos.copy(pl.pos); aimPlaneGun(pl, s[3] / 100, s[4] / 100); }
    else if (c.planeGun) { if (c.planeGun.gunnerRemote === c) c.planeGun.gunnerRemote = null; c.planeGun = null; }
    const ti = P.m === 1 ? P.ti : -1;
    if (r.turretIdx !== ti) { if (r.turretIdx >= 0 && turrets[r.turretIdx] && turrets[r.turretIdx].user === c) turrets[r.turretIdx].user = null; r.turretIdx = ti; }
    if (ti >= 0 && turrets[ti]) { const t = turrets[ti]; if (t.user && t.user !== c && t.user.turret === t && !t.user.isPlayer) { t.user.turret = null; } t.user = c; c.turret = t; t.yaw = s[3] / 100; t.pitch = s[4] / 100; updateTurretVisual(t); } else c.turret = null;
    // seats in ground vehicles
    if (P.m === 3 && gvehicles[P.gi] && c.alive) {
      const v = gvehicles[P.gi], gs = P.gs | 0;
      if (c.gv !== v || c.seat !== gs) {
        const occ = v.seats[gs];
        if (occ && occ !== c && !occ.isPlayer && !occ.isRemote) leaveSeat(occ);
        for (const o of occupants(v)) if (o !== c && o.team !== c.team && !o.isPlayer && !o.isRemote) { leaveSeat(o); o.noVehT = simTime + 30; }   // hijacked: the enemy crew is thrown out
        if (!v.seats[gs] || v.seats[gs] === c) enterSeat(c, v, gs);
      }
      if (gs === 0 && Array.isArray(P.gv)) {
        const a = P.gv; v.remote = c;
        const np = v10(a, 0); if (v.pos.distanceTo(np) > 15) v.pos.copy(np); else v.pos.lerp(np, 0.5);
        v.yaw += wrapAngle(a[3] / 100 - v.yaw) * 0.5; v.pitch = a[4] / 100; v.roll = a[5] / 100; v.turretYaw = a[6] / 100; v.gunPitch = a[7] / 100; v.speed = a[8] / 10;
        for (const w of v.model.wheels) w.rotation.x -= v.speed * dt / 0.45;
      } else if (v.remote === c) v.remote = null;
      if (Array.isArray(P.mg)) { if (v.T.seats[gs] && v.T.seats[gs].gun) { v.mg2Yaw = P.mg[0] / 100; v.mg2Pitch = P.mg[1] / 100; } else { v.mgYaw = P.mg[0] / 100; v.mgPitch = P.mg[1] / 100; } }
    } else if (c.gv) { const v = c.gv; if (v.remote === c) v.remote = null; leaveSeat(c, true); }
    // smooth movement + animation
    if (c.alive && !c.vehicle && !c.gv && !c.planeGun) {
      const before = c.pos.clone();
      if (c.pos.distanceTo(c.netPos) > 8) c.pos.copy(c.netPos); else c.pos.lerp(c.netPos, Math.min(1, dt * 12));
      const sp = before.distanceTo(c.pos) / Math.max(dt, 0.001);
      c.vel.copy(c.pos).sub(before).divideScalar(Math.max(dt, 0.001));
      c.heading = (c.turret ? s[3] / 100 : s[3] / 100) + Math.PI; c.aimPitch = -s[4] / 100 * -1; c.crouch = !!P.c; c.parachute = P.pc === 1; c.gliding = P.pc === 2;
      animateNPC(c, dt, sp > 0.5 ? Math.min(sp, 8) : 0, true);
      if (c.turret) { c.model.gun.visible = false; }
    }
    // effects they made
    for (const e of newEntries(P.id, 'fx', P.fx)) applyFx(e, c);
    for (const e of newEntries(P.id, 'h', P.h)) applyHitEntry(e, c);
    for (const e of newEntries(P.id, 'cm', P.cm)) if (typeof applyCheatCommand === 'function') applyCheatCommand(e, c);
    // chat from real players (cleaned again here, whatever their game sent)
    for (const e of newEntries(P.id, 'ch', P.ch)) if (typeof chatLine === 'function' && typeof e[1] === 'string') chatLine(r.name, c.team, e[1].slice(0, 80));
    if (net.isHost) {
      for (const e of newEntries(P.id, 'dd', P.dd)) {
        const killer = resolveAttacker(e[1]);
        if (killer) { teamKills[killer.team]++; if (killer === player) { player.kills++; addMoney(e[2] ? 150 : 100, e[2] ? 'Headshot' : 'Elimination'); SFX.kill(); } }
        hostKillfeed(killer, c, e[2]); addKillfeed(killer, c, e[2]);
      }
      for (const e of newEntries(P.id, 'rq', P.rq)) if (e[1] === 'tw') { if (typeof towerRequest === 'function') towerRequest(e); } else if (e[1] === 'tc') { if (typeof treasureRequest === 'function') treasureRequest(e, c); } else if (e[1] === 'vs') { if (typeof spawnRequest === 'function') spawnRequest(e); } else if (e[1] === 'hf') { if (typeof leaderFound === 'function') leaderFound(c.team, c.name); } else if (e[1] === 'md') { if (typeof dropRequest === 'function') dropRequest(e, c); } else if (e[1] === 'hj') { const v = gvehicles[e[2]]; if (v && v.alive) for (const o of occupants(v)) if (o.team !== c.team && !o.isPlayer && !o.isRemote) { leaveSeat(o); o.noVehT = simTime + 30; } } else if (e[1] === 'rec') recruitNPC(e[2]); else if (e[1] === 'wh' && typeof whistleForVehicle === 'function') { const v = gvehicles[e[2]]; if (v && v.alive) whistleForVehicle(v, teamOf(e[3]), v.pos); }
    }
    // their buildings
    const want = new Set();
    for (const bd of (Array.isArray(P.b) ? P.b : [])) {
      const id = P.id + '-' + bd[0]; want.add(id);
      if (!r.builds.has(id) && BUILD_KEYS[bd[1]]) { const b = createBuild(BUILD_KEYS[bd[1]], bd[2] / 10, bd[3] / 10, bd[4] | 0, c.team, 'remote', id); b.ownerId = P.id; b.ownerChar = c; r.builds.set(id, b); }
    }
    for (const [id, b] of [...r.builds]) if (!want.has(id)) { removeBuild(b); r.builds.delete(id); }
  }
  // the host's view of the battle
  if (!net.isHost) {
    for (const [k, w] of [[0, net.w1], [1, net.w2]]) {
      const hp = w.peers().find(pe => !pe.sameTab && pe.presence && pe.presence.id === net.hostId);
      if (!hp || hp.presence === net.lastSnap[k]) continue;   // nothing new from the host
      net.lastSnap[k] = hp.presence;
      const now = performance.now();
      if (net.snapAt[k]) net.snapGap[k] = lerp(net.snapGap[k], clamp(now - net.snapAt[k], 40, 1500), 0.2);
      if (net.snapAt[k] && started) netDiagGap(now - net.snapAt[k]);
      if (k === 0 && hp.presence.FPS) net.hostFps = hp.presence.FPS;
      net.snapAt[k] = now;
      try { applySnapshot(hp.presence, dt); } catch (e) { if (typeof loopError === 'function') loopError('snapshot', e); }
    }
    try { smoothProxies(dt); } catch (e) { if (typeof loopError === 'function') loopError('smooth', e); }
    // if the host goes quiet (their connection hiccups or their tab is hidden), say so instead of looking frozen
    const quiet = started && net.snapAt[0] && performance.now() - Math.max(net.snapAt[0], net.snapAt[1]) > 2500;
    let nw = document.getElementById('netWait');
    if (quiet && !nw) { nw = document.createElement('div'); nw.id = 'netWait'; nw.className = 'hud'; nw.style.cssText = 'position:fixed;top:120px;left:50%;transform:translateX(-50%);background:rgba(8,12,20,.8);color:#ffd54f;font:700 14px system-ui,sans-serif;padding:8px 16px;border-radius:10px;z-index:6;pointer-events:none'; nw.textContent = 'Waiting for the host... (their connection hiccupped)'; document.body.appendChild(nw); }
    if (nw) nw.style.display = quiet ? 'block' : 'none';
  }
  // publish: me about 12 times a second, the battle (host only) about 8 times a second
  // timed by the real clock: a slow computer's short (capped) frame times must not slow down what it sends
  const nowSend = performance.now();
  if (net.sendT <= 0 || nowSend - (net.lastSend || 0) >= 83) {
    net.sendT = 1; net.lastSend = nowSend; net.tick = (net.tick || 0) + 1;
    net.game.presence(buildPresence()).catch(netSendFail);
    if (net.isHost) {
      // website: soldiers and vehicles alternate every tick (each about 6 times a second); in Claude, two ticks out of three
      const fast = !!window.STANDALONE, which = fast ? net.tick % 2 : net.tick % 3;
      if (which === 0) net.w1.presence(buildWorld1()).catch(netSendFail);
      else if (which === 1) net.w2.presence(buildWorld2()).catch(netSendFail);
    }
  }
  $('online').textContent = `Online: ${peers.length + 1} player${peers.length ? 's' : ''}${net.isHost ? ' (you host)' : ''}   Code ${net.code}${net.isHost && !net.pub ? ' (private)' : ''}`;
  updateListing(dt);
}

function ghostOwner(teamBit, src) { return src && !src.isPlayer ? src : { team: teamOf(teamBit) || 'blue', name: 'Soldier', isPlayer: false, kills: 0 }; }
function applyFx(e, src) {
  const k = e[1];
  if (k === 's') {
    const from = v10(e, 2), to = v10(e, 5);
    shootTracer(from, to, e[8] === 3 ? 0x22e6ff : 0xffd98a, e[8] === 3 ? 900 : 420, e[8] === 3 ? 0.035 : 0.03, () => burst(to, 2, 0xbbbbbb, 3, 0.3, 0.05));
    playAt(e[8] === 1 ? 'mg' : e[8] === 3 ? 'laser' : 'rifle', from, 0.8);
  } else if (k === 'r') {
    spawnRocket(new THREE.Vector3(e[3], e[4], e[5]), new THREE.Vector3(e[6], e[7], e[8]).normalize(), ghostOwner(e[2], src), { ghost: true, speed: e[9], homing: !!e[10], radius: e[11], shell: !!e[12] });
    playAt('rocket', new THREE.Vector3(e[3], e[4], e[5]));
  } else if (k === 'b') {
    const bomb = e[9] === 1;
    spawnBall(new THREE.Vector3(e[3], e[4], e[5]), new THREE.Vector3(e[6], e[7], e[8]), ghostOwner(e[2], src), { ghost: true, type: bomb ? 'bomb' : 'grenade', bomb, r: bomb ? 0.32 : 0.12, mass: bomb ? 25 : 0.8, fuse: e[10], color: bomb ? 0x30343a : 0x2e7d32, radius: e[11], impact: bomb });
  } else if (k === 'np') {
    dropNapalm(new THREE.Vector3(e[3], 0, e[4]), (e[5] || 0) / 100, ghostOwner(e[2], src), true);
  } else if (k === 'nk') {
    dropNuke(new THREE.Vector3(e[3], 0, e[4]), ghostOwner(e[2], src), true, !!e[5]);
  } else if (k === 'zb') {
    playAt('yell', new THREE.Vector3(e[2], heightAt(e[2], e[3]) + 1, e[3]), 0.7);
  } else if (k === 'sk') {
    makeSticky(new THREE.Vector3(e[3], e[4], e[5]), new THREE.Vector3(e[6], e[7], e[8]), ghostOwner(e[2], src), true);
  } else if (k === 'w') {
    throwBalloon(new THREE.Vector3(e[2], e[3], e[4]), new THREE.Vector3(e[5], e[6], e[7]), e[8], BALLOON_COLS[e[9]] || 0x3fc4ff, true);
  } else if (k === 'cl' && net.isHost) {
    if (src && src.name) CLOWN.lastBy = src.name; clownHit(e[2], null);
  } else if (k === 'x') {
    explosion(new THREE.Vector3(e[2], e[3], e[4]), e[5], 30, null, 0, true);
  } else if (k === 'vd' && net.isHost) {
    const v = gvehicles[e[2]]; if (v && v.alive) { v.remote = null; v.alive = false; v.model.g.visible = false; v.respawnT = 35; for (const c of occupants(v)) { leaveSeat(c, true); if (!c.isRemote && c.alive && !c.isPlayer) kill(c, null, new THREE.Vector3(0, 1, 0), 10); } }
  } else if (k === 'pd' && net.isHost) {
    const pl = planes[e[2]]; if (pl && pl.alive) { pl.remote = null; pl.alive = false; pl.model.g.visible = false; pl.respawnT = 10; }
  }
}
function applyHitEntry(e, src) {
  const kind = e[1];
  if (kind === 'p' && e[2] === net.myId) {
    const att = resolveAttacker(e[5]) || src;
    damage(player, e[3], att, null, 4, !!e[4]);
  } else if (kind === 'n' && net.isHost && e[2] === net.myId) {
    const n = npcs[e[3]]; if (n) damage(n, e[4], src, new THREE.Vector3(e[6], 0.2, e[7]).normalize(), 6, !!e[5]);
  } else if (kind === 'pl' && e[2] === net.myId) {
    const pl = planes[e[3]]; if (pl && (pl.pilot === player || (net.isHost && !pl.remote))) damagePlane(pl, e[4], resolveAttacker(e[5]) || src);
  } else if (kind === 'v' && e[2] === net.myId) {
    const v = gvehicles[e[3]]; if (v && (driverOf(v) === player || (net.isHost && !v.remote))) damageVehicle(v, e[4], resolveAttacker(e[5]) || src);
  } else if (kind === 'b' && e[2] === net.myId) {
    const b = builds.find(x => x.owner === 'me' && x.id === e[3]);
    if (b) { if (b.type === 'mine' && e[4] >= 9999) removeBuild(b); else { b.hp -= e[4]; if (b.hp <= 0) destroyBuild(b); } }
  }
}
let lastOwners = '';
function applySnapshot(P, dt) {
  if (Array.isArray(P.CF) && (P.CF[0] !== appliedPoints || P.CF[1] !== BATTLE.soldiers) && net.cfKey !== P.CF[0] + '/' + P.CF[1]) { net.cfKey = P.CF[0] + '/' + P.CF[1]; applyBattle({ points: P.CF[0], soldiers: P.CF[1] }, true); }   // once per change, not on every update
  if (Array.isArray(P.P) && P.P.length !== points.length) return;   // setup still switching over
  if (Array.isArray(P.N)) P.N.forEach((d, i) => { try { applyNpcSnap(d, i); } catch (e) { if (typeof loopError === 'function') loopError('npc snapshot', e); } });
  applyRestOfSnapshot(P);
  if (P.TW && typeof applyTowerMask === 'function') applyTowerMask(P.TW);
  if (P.TR && typeof applyTreasure === 'function') applyTreasure(P.TR);
  if (P.CHT !== undefined) net.cheatsAllowed = !!P.CHT;
  if (P.SHP && typeof applyShipState === 'function') applyShipState(P.SHP);
  if (P.LB !== undefined && typeof LEADER !== 'undefined') LEADER.idx = P.LB;
  if (P.DM && typeof applyDamState === 'function') applyDamState(P.DM);   /* how damaged the dam is, and whether it has broken */   /* which bunker Hitler is in this game */
  if (typeof applyZombies === 'function') applyZombies(P.ZB);
  if (P.VS && typeof applySpawned === 'function') applySpawned(P.VS);
}
function applyNpcSnap(d, i) {
  {
    const n = npcs[i]; if (!n) return;
    if (d === 0) { if (!n.inactive) { n.inactive = true; n.alive = false; n.model.root.visible = false; } return; }
    n.inactive = false;
    const [x, z, y, h, f] = d, alive = !!(f & 1);
    n.netPos = n.netPos || new THREE.Vector3(); n.netPos.set(x / 5, y / 5, z / 5);
    pushSnap(n, x / 5, y / 5, z / 5, h / 20);
    if (alive && !n.alive) { n.alive = true; n.pos.copy(n.netPos); n.snaps = []; n.model.root.visible = true; n.model.body.position.y = 0; n.model.root.quaternion.identity(); }
    if (!alive && n.alive) { n.alive = false; startRagdoll(n, new THREE.Vector3(rand(-1, 1), 0.3, rand(-1, 1)).normalize(), 6); }
    n.netHeading = h / 20; n.netAim = !!(f & 2); n.moving = !!(f & 4);
    const shots = (f >> 4) & 7;
    if (n.alive && n.lastShots !== undefined && shots !== n.lastShots) {
      n.model.muzzle.getWorldPosition(_tmpV);
      const from = _tmpV.clone(), dir = new THREE.Vector3(Math.sin(n.heading), rand(-0.05, 0.05), Math.cos(n.heading));
      if (n.role === 'rocket') { } else {
        shootTracer(from, from.clone().addScaledVector(dir.add(new THREE.Vector3(rand(-0.04, 0.04), 0, rand(-0.04, 0.04))).normalize(), 45), n.role === 'sniper' ? 0xffffff : 0xffd98a, 260, 0.03, null);
        playAt(n.role === 'sniper' ? 'sniper' : 'rifle', from, 0.8);
      }
    }
    n.lastShots = shots;
    const g = d[5] | 0, gi = g ? Math.floor(g / 8) - 1 : -1, gs = g % 8;
    if (gi >= 0 && gvehicles[gi] && alive && gs < gvehicles[gi].T.seats.length) { const v = gvehicles[gi]; if ((n.gv !== v || n.seat !== gs) && (!v.seats[gs] || v.seats[gs] === n)) enterSeat(n, v, gs); }
    else if (n.gv) leaveSeat(n, true);
    const ti = ((f >> 8) & 31) - 1;
    if (ti >= 0 && turrets[ti]) { const t = turrets[ti]; t.user = n; n.turret = t; t.yaw = n.netHeading - Math.PI; updateTurretVisual(t); }
    else if (n.turret) { if (n.turret.user === n) n.turret.user = null; n.turret = null; }
  }
}
function applyRestOfSnapshot(P) {
  if (Array.isArray(P.P)) points.forEach((p, i) => {
    p.progress = (P.P[i] || 0) / 100;
    const o = (P.O || '')[i]; const owner = TEAMS.find(t => t[0] === o) || null; const ct = (P.CT || '')[i]; p.capTeam = TEAMS.find(t => t[0] === ct) || null;
    if (owner !== p.owner) { const before = p.owner; p.owner = owner; onOwnerChange(p, before); }
  });
  if (Array.isArray(P.PL)) P.PL.forEach((a, i) => {
    const pl = planes[i]; if (!pl || !a || pl.pilot === player || pl.remote) return;
    const alive = !!a[0];
    if (!alive && pl.alive) { pl.alive = false; pl.model.g.visible = false; }
    if (alive) {
      const q = new THREE.Quaternion(a[4] / 1000, a[5] / 1000, a[6] / 1000, a[7] / 1000).normalize();
      if (!pl.alive) { pl.pos.set(a[1] / 10, a[2] / 10, a[3] / 10); pl.quat.copy(q); pl.snaps = []; }
      pushSnap(pl, a[1] / 10, a[2] / 10, a[3] / 10, 0, q);
      pl.speed = a[8]; pl.alive = true; pl.model.g.visible = true; pl.model.bomb.visible = a[9] > 0; pl.bombs = a[9];
      pl.onGround = pl.pos.y - heightAt(pl.pos.x, pl.pos.z) < 2;
    }
  });
  if (Array.isArray(P.GV)) P.GV.forEach((a, i) => {
    const v = gvehicles[i]; if (!v || !a || v.remote || driverOf(v) === player) return;
    if (!a[0]) { if (v.alive) { v.alive = false; v.model.g.visible = false; if (player.gv === v && player.alive) kill(player, v.lastAttacker || null, new THREE.Vector3(0, 1, 0), 10); for (const c of occupants(v)) leaveSeat(c, true); } return; }
    if (!v.alive) { v.alive = true; v.hp = v.T.hp; v.model.g.visible = true; }
    if (a.length < 12) { v.pos.set(a[1] / 10, a[2] / 10, a[3] / 10); v.yaw = a[4] / 100; v.speed = 0; v.snaps = []; return; }   // parked: short form
    pushSnap(v, a[1] / 10, a[2] / 10, a[3] / 10, a[4] / 100);
    v.netPitch = a[5] / 100; v.netRoll = a[6] / 100; v.turretYaw = a[7] / 100; v.gunPitch = a[8] / 100;
    const mine = player.gv === v && v.T.seats[player.seat].role === 'gun', myGun = mine ? (v.T.seats[player.seat].gun || 0) : -1;
    if (myGun !== 0) { v.mgYaw = a[9] / 100; v.mgPitch = a[10] / 100; }
    if (a.length >= 14 && myGun !== 1) { v.mg2Yaw = a[12] / 100; v.mg2Pitch = a[13] / 100; }
    v.speed = a[11] / 10;
  });
  if (Array.isArray(P.TK)) TEAMS.forEach((t, i) => { teamKills[t] = P.TK[i] || 0; });
  if (Array.isArray(P.HS)) { holdScore.blue = P.HS[0]; holdScore.red = P.HS[1]; }
  if ('CL' in P && typeof clownNet === 'function') clownNet(P.CL);
  for (const e of newEntries(P.id, 'KF', P.KF)) {
    const team = t => teamOf(t);
    addKillfeed(e[1] ? { name: e[1], team: team(e[2]) } : null, { name: e[3], team: team(e[4]) }, !!e[5]);
    if (e[6] === net.myId) { player.kills++; addMoney(e[5] ? 150 : 100, e[5] ? 'Headshot' : 'Elimination'); SFX.kill(); showHitmarker(true); }
  }
  if (P.GO && !gameOver) endGame(P.GO);
}
// ---------- smooth movement on non-host computers ----------
// The host's updates arrive a few times a second. Instead of jumping to each one, everything is drawn a
// moment in the past, sliding smoothly between the two updates on either side of that moment (and guessing a
// little ahead if an update is late). That removes the stop-start jerking of soldiers, vehicles and planes.
function pushSnap(o, x, y, z, a, q) {
  const s = o.snaps || (o.snaps = []), t = performance.now(), last = s[s.length - 1];
  if (last && (Math.abs(last.x - x) + Math.abs(last.y - y) + Math.abs(last.z - z) > 40 || t - last.t > 1200)) s.length = 0;   // a teleport, a respawn or a long gap: start over
  s.push({ t, x, y, z, a, q: q ? q.clone() : null }); if (s.length > 6) s.shift();
}
const _sq = new THREE.Quaternion();
function sampleSnap(o, rt, out) {
  const s = o.snaps; if (!s || !s.length) return false;
  if (s.length === 1 || rt <= s[0].t) { const f = s[0]; out.x = f.x; out.y = f.y; out.z = f.z; out.a = f.a; out.q = f.q; return true; }
  for (let i = s.length - 2; i >= 0; i--) {
    const A = s[i], B = s[i + 1];
    if (rt >= A.t) {
      let k = (rt - A.t) / Math.max(1, B.t - A.t);
      k = Math.min(k, 1 + Math.min(0.3, 250 / Math.max(1, B.t - A.t)));   // late update: carry on a little, then wait
      out.x = A.x + (B.x - A.x) * k; out.y = A.y + (B.y - A.y) * k; out.z = A.z + (B.z - A.z) * k;
      out.a = A.a + wrapAngle(B.a - A.a) * Math.min(k, 1);
      if (A.q && B.q) { _sq.copy(A.q).slerp(B.q, Math.min(k, 1)); out.q = _sq; } else out.q = B.q;
      return true;
    }
  }
  return false;
}
const _smp = {};
function smoothProxies(dt) {
  const now = performance.now();
  const d1 = clamp(net.snapGap[0] * 1.35 + 35, 90, 700), d2 = clamp(net.snapGap[1] * 1.35 + 35, 90, 700);
  for (const n of npcs) if (!n.inactive && n.alive && !n.gv && n.snaps && sampleSnap(n, now - d1, _smp)) { n.smPos = n.smPos || new THREE.Vector3(); n.smPos.set(_smp.x, _smp.y, _smp.z); n.smHead = _smp.a; }
  for (const v of gvehicles) {
    if (!v.alive || v.remote || driverOf(v) === player || !v.snaps || !v.snaps.length) continue;
    if (!sampleSnap(v, now - d2, _smp)) continue;
    const ox = v.pos.x, oz = v.pos.z;
    v.pos.set(_smp.x, _smp.y, _smp.z); v.yaw = _smp.a;
    v.pitch += ((v.netPitch || 0) - v.pitch) * Math.min(1, dt * 8); v.roll += ((v.netRoll || 0) - v.roll) * Math.min(1, dt * 8);
    const moved = Math.hypot(v.pos.x - ox, v.pos.z - oz); for (const w of v.model.wheels) w.rotation.x -= moved * Math.sign(v.speed || 1) / 0.45;
  }
  for (const pl of planes) {
    if (!pl.alive || pl.pilot === player || pl.remote || !pl.snaps || !pl.snaps.length) continue;
    if (!sampleSnap(pl, now - d2, _smp)) continue;
    pl.pos.set(_smp.x, _smp.y, _smp.z); if (_smp.q) pl.quat.copy(_smp.q);
    pl.onGround = pl.pos.y - heightAt(pl.pos.x, pl.pos.z) < 2;
  }
}
// soldiers on a non-host computer just copy what the host says
function updateNPCProxy(n, dt) {
  if (n.inactive || !n.alive || !n.netPos || n.gv) return;
  const before = n.pos.clone();
  if (n.smPos) { n.pos.copy(n.smPos); n.heading = n.smHead; }   // smoothed path between the host's updates
  else { if (n.pos.distanceTo(n.netPos) > 10) n.pos.copy(n.netPos); else n.pos.lerp(n.netPos, Math.min(1, dt * 8)); n.heading += wrapAngle((n.netHeading || 0) - n.heading) * Math.min(1, dt * 10); }
  const sp = before.distanceTo(n.pos) / Math.max(dt, 0.001);
  if (n.turret) { const seat = turretSeat(n.turret); n.pos.set(seat.x, n.turret.y, seat.z); n.model.root.position.copy(n.pos); n.model.root.rotation.y = n.heading; n.model.gun.visible = false; return; }
  animateNPC(n, dt, sp > 0.4 ? Math.min(sp, 6) : 0, n.netAim);
}
