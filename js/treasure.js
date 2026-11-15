// ===================== treasure.js : treasure chests (online games) =====================
// In online games a dozen treasure chests are hidden around the map, each holding $500 to $5000.
// Walk into one to grab it. A faint gold light rises from each chest so you can spot it from a distance.
// The host decides where they are and who got each one, so two players can't both take the same chest.
// A grabbed chest turns up somewhere new a little later.
const CHESTS = new Map();      // id -> { id, x, z, value, g }
const TREASURE = { n: 12, nextId: 1, respawn: [], awarded: [], seenAward: new Set(), asked: new Map() };
let _chestGeo = null;
let _bagGeo = null;
function bagModel() {
  if (!_bagGeo) {
    const P = new Part();
    P.add(new THREE.SphereGeometry(0.42, 12, 10), 0x3f7a3a, 0, 0.38, 0, 0, 0, 0, 1, 0.9, 1);   // the bag
    P.cyl(0.14, 0.22, 0.22, 0x3f7a3a, 0, 0.82, 0); P.cyl(0.16, 0.16, 0.06, 0xc8a040, 0, 0.78, 0);   // neck and tie
    P.box(0.3, 0.3, 0.02, 0xf2f2ee, 0, 0.42, 0.4);                                                   // a white patch for the $ sign
    _bagGeo = P.build();
  }
  const g = new THREE.Group();
  const m = new THREE.Mesh(_bagGeo, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x0c2a0c })); m.castShadow = true; g.add(m);
  const t = canvasTex(64, 64, c => { c.fillStyle = '#2e7d32'; c.font = '800 54px system-ui, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', 32, 36); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshBasicMaterial({ map: t, transparent: true })); sign.position.set(0, 0.42, 0.42); g.add(sign);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.5, 18, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 9; g.add(beam);
  scene.add(g); return g;
}
function chestModel() {
  if (!_chestGeo) {
    const P = new Part(), wood = 0x7a4a24, dark = 0x5a3418, gold = 0xe8c040;
    P.box(1.2, 0.6, 0.8, wood, 0, 0.3, 0); P.add(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12, 1, false, 0, Math.PI), wood, 0, 0.6, 0, 0, 0, Math.PI / 2);   // box and round lid
    for (const x of [-0.45, 0, 0.45]) { P.box(0.08, 0.62, 0.84, gold, x, 0.31, 0); P.add(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 12, 1, false, 0, Math.PI), gold, x, 0.6, 0, 0, 0, Math.PI / 2); }   // gold bands
    P.box(1.22, 0.06, 0.82, dark, 0, 0.6, 0);
    P.box(0.2, 0.24, 0.06, gold, 0, 0.5, 0.42); P.box(0.08, 0.08, 0.04, 0x2a1d10, 0, 0.47, 0.455);   // lock
    _chestGeo = P.build();
  }
  const g = new THREE.Group();
  const m = new THREE.Mesh(_chestGeo, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x2a1c00 })); m.castShadow = true; g.add(m);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 26, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 13; g.add(beam);
  scene.add(g); return g;
}
function chestSpot() {
  for (let k = 0; k < 80; k++) {
    const x = rand(-EDGE + 40, EDGE - 40), z = rand(-EDGE + 40, EDGE - 40), y = heightAt(x, z);
    if (waterDepth(x, z) > 0.05 || y > 26) continue;
    if (TEAMS.some(t => Math.hypot(x - BASES[t].x, z - BASES[t].z) < 70)) continue;
    if (blockedAt(x, z, y, 1, true) || undergroundAt(x, z, y - 1)) continue;
    if ([...CHESTS.values()].some(c => Math.hypot(c.x - x, c.z - z) < 90)) continue;
    return { x, z };
  }
  return null;
}
function addChest(id, x, z, value, bag) {
  const c = { id, x, z, value, bag: !!bag, g: bag ? bagModel() : chestModel() };
  c.g.position.set(x, heightAt(x, z), z); c.g.rotation.y = (id * 2.399) % 6.28;
  CHESTS.set(id, c); return c;
}
function removeChest(id) { const c = CHESTS.get(id); if (!c) return; scene.remove(c.g); CHESTS.delete(id); }
function hostSpawnChest() {
  const s = chestSpot(); if (!s) return;
  addChest(TREASURE.nextId++, s.x, s.z, Math.round(rand(500, 5000) / 100) * 100);
}
// host: someone (me or a joiner) reached a chest first
function grantChest(id, peerId, name) {
  const c = CHESTS.get(id); if (!c) return;
  TREASURE.awarded.push([id, peerId, c.value, String(name || 'Someone').slice(0, 16), simTime]);
  while (TREASURE.awarded.length > 8) TREASURE.awarded.shift();
  removeChest(id);
  if (!c.bag) TREASURE.respawn.push(simTime + rand(30, 60));
  if (peerId === net.myId) gotTreasure(c.value, id, c.bag);
  else showMessage(`${typeof chatClean === 'function' ? chatClean(name) : name} ${c.bag ? 'picked up a money bag' : 'found a treasure chest'} with $${c.value}!`, 2.5);
}
function gotTreasure(value, id, bag) {
  if (TREASURE.seenAward.has(id)) return; TREASURE.seenAward.add(id);
  addMoney(value, bag ? 'Money bag' : 'Treasure chest'); SFX.cash && SFX.cash();
  showMessage(bag ? `Money bag! +$${value}` : `Treasure! +$${value}`, 3);
}
// for the host's updates: the chests, and who got the last few
function treasureState() {
  return { c: [...CHESTS.values()].map(c => c.bag ? [c.id, Math.round(c.x * 5), Math.round(c.z * 5), c.value, 1] : [c.id, Math.round(c.x * 5), Math.round(c.z * 5), c.value]), a: TREASURE.awarded.filter(e => simTime - e[4] < 6).map(e => e.slice(0, 4)) };
}
function applyTreasure(T) {
  if (!T || !Array.isArray(T.c)) return;
  const want = new Set(T.c.map(e => e[0]));
  for (const id of [...CHESTS.keys()]) if (!want.has(id)) removeChest(id);
  for (const [id, x, z, value, bag] of T.c) { const c = CHESTS.get(id); if (c && (Math.abs(c.x - x / 5) > 0.5 || Math.abs(c.z - z / 5) > 0.5 || c.value !== value)) removeChest(id); if (!CHESTS.has(id)) addChest(id, x / 5, z / 5, value, bag); }   // the host's copy always wins
  for (const [id, peer, value, name] of (T.a || [])) {
    if (peer === net.myId) gotTreasure(value, id, CHESTS.get(id) && CHESTS.get(id).bag);
    else if (!TREASURE.seenAward.has('o' + id)) { TREASURE.seenAward.add('o' + id); showMessage(`${typeof chatClean === 'function' ? chatClean(name) : name} found a treasure chest with $${value}!`, 2.5); }
  }
}
function treasureRequest(e, c) {   // host: a joiner says they reached a chest
  grantChest(e[2], c.peerId, c.name);
}
function updateTreasure(dt) {
  if (!net.active) { if (CHESTS.size) for (const id of [...CHESTS.keys()]) removeChest(id); return; }
  const host = net.isHost;
  if (host && !net.joining) {
    if (!TREASURE.started) {   // (a new host after a hand-over keeps the chests it already knows about)
      TREASURE.started = true; TREASURE.nextId = Math.max(TREASURE.nextId, ...[...CHESTS.keys()].map(k => k + 1));
      for (let i = [...CHESTS.values()].filter(c => !c.bag).length; i < TREASURE.n; i++) hostSpawnChest();
    }
    for (const c of [...CHESTS.values()]) if (c.bag && c.expire && simTime > c.expire) removeChest(c.id);
    TREASURE.respawn = TREASURE.respawn.filter(t => { if (simTime >= t) { if ([...CHESTS.values()].filter(c => !c.bag).length < TREASURE.n) hostSpawnChest(); return false; } return true; });
  }
  // spin and bob, and grab one when you walk into it
  for (const c of CHESTS.values()) {
    c.g.position.y = heightAt(c.x, c.z) + 0.15 + Math.sin(simTime * 2 + c.id) * 0.08;
    if (Math.random() < dt * 3) smokePuff(new THREE.Vector3(c.x + rand(-0.5, 0.5), c.g.position.y + 0.9, c.z + rand(-0.5, 0.5)), 0xffe08a, 0.12, 0.6, 1.2);
    if (!player.alive || player.vehicle || player.planeGun) continue;
    if (Math.hypot(player.pos.x - c.x, player.pos.z - c.z) < 1.8 && Math.abs(player.pos.y - c.g.position.y) < 2.5) {
      if (host) grantChest(c.id, net.myId, player.name);
      else if (!TREASURE.asked.has(c.id) || simTime - TREASURE.asked.get(c.id) > 2) { TREASURE.asked.set(c.id, simTime); netRequest(['tc', c.id]); showMessage('Opening the chest...', 1); }
    }
  }
}

// ---------- money bags ----------
// Taken out by another real player (online): you lose all your money, and it drops where you fell as a money
// bag that any real player can pick up (computer soldiers can't). Bags vanish after three minutes.
function dropMoneyBag(x, z, amount) {   // host
  if (amount <= 0) return;
  const c = addChest(TREASURE.nextId++, x, z, Math.round(amount), true);
  c.expire = simTime + 180;
}
function dropRequest(e) { dropMoneyBag(e[2] / 10, e[3] / 10, Math.min(1e7, e[4] | 0)); }   // host: a joiner fell and dropped their money
function onKilledByPlayer(attacker) {
  if (!net.active || !attacker || !attacker.isRemote) return;
  const amount = player.money; if (amount <= 0) return;
  player.money = 0;
  showMessage(`${attacker.name} took you out: you dropped your $${amount}!`, 3);
  if (net.isHost) dropMoneyBag(player.pos.x, player.pos.z, amount);
  else netRequest(['md', r10(player.pos.x), r10(player.pos.z), amount]);
}
