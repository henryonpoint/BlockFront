// ===================== towers.js : sniper towers =====================
// A wooden sniper tower stands near each control point: four legs, a ladder, a railed platform 9 m up with a
// roof. Press E at the bottom to climb up; jump off or walk off the edge to get down. Computer snipers climb them too.
// They can be knocked down: rockets, grenades, tank shells and bombs that go off close by wear them down until
// the tower tips over and falls. A fallen tower is rebuilt after two minutes.
// Online, the host keeps track of the damage and tells everyone which towers are down.
const TOWERS = [];
const TOWER_H = 9, TOWER_W = 3.4, TOWER_HP = 240, TOWER_REBUILD = 120;
(function buildTowers() {
  if (WAKE) return;
  seeded(9137, () => {
    const wood = new THREE.MeshLambertMaterial({ color: 0x8a6238 }), dark = new THREE.MeshLambertMaterial({ color: 0x5e4128 }), roofM = new THREE.MeshLambertMaterial({ color: 0x4a5a3a });
    for (const P of points) {
      // a spot 24 to 40 m from the flag on open, fairly flat ground
      let spot = null;
      for (let k = 0; k < 60 && !spot; k++) {
        const a = Math.random() * Math.PI * 2, r = 24 + Math.random() * 16, x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
        if (pathDist(x, z) < 6 || waterDepth(x, z) > 0.05 || undergroundAt(x, z, heightAt(x, z) - 1)) continue;
        const hs = [heightAt(x - 2, z - 2), heightAt(x + 2, z - 2), heightAt(x - 2, z + 2), heightAt(x + 2, z + 2)];
        if (Math.max(...hs) - Math.min(...hs) > 1.2) continue;
        let clear = true;
        for (let dx = -3; dx <= 3 && clear; dx += 1.5) for (let dz = -3; dz <= 3 && clear; dz += 1.5) if (blockedAt(x + dx, z + dz, heightAt(x + dx, z + dz), 0.5, true)) clear = false;
        if (!clear || TOWERS.some(t => Math.hypot(t.x - x, t.z - z) < 20)) continue;
        if (typeof NESTS !== 'undefined' && NESTS.some(n => Math.hypot(n.x - x, n.z - z) < 14)) continue;
        spot = { x, z };
      }
      if (!spot) continue;
      const base = Math.min(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => heightAt(spot.x + a * 1.5, spot.z + b * 1.5))) - 0.2;
      const top = base + TOWER_H, h = TOWER_W / 2;
      const g = new THREE.Group(); g.position.set(spot.x, base, spot.z); scene.add(g);
      const add = (geo, mat, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.BoxGeometry(0.28, TOWER_H + 0.2, 0.28), dark, a * (h - 0.15), TOWER_H / 2, b * (h - 0.15));
      for (const y of [2.8, 5.8]) for (const s of [-1, 1]) {                        // cross braces
        add(new THREE.BoxGeometry(0.12, 3.4, 0.12), wood, s * (h - 0.15), y, 0, 0.75, 0).rotation.order = 'XYZ';
        add(new THREE.BoxGeometry(0.12, 3.4, 0.12), wood, 0, y, s * (h - 0.15), 0, 0.75);
      }
      const floor = add(new THREE.BoxGeometry(TOWER_W + 0.4, 0.3, TOWER_W + 0.4), wood, 0, TOWER_H + 0.05, 0);
      const rails = [];
      for (const [x, z, w, d] of [[0, -h - 0.15, TOWER_W + 0.4, 0.12], [0, h + 0.15, TOWER_W + 0.4, 0.12], [-h - 0.15, 0, 0.12, TOWER_W + 0.4], [h + 0.15, 0.6, 0.12, TOWER_W - 0.8]]) rails.push(add(new THREE.BoxGeometry(w, 1.05, d), wood, x, TOWER_H + 0.72, z));
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.BoxGeometry(0.14, 2.4, 0.14), dark, a * (h + 0.1), TOWER_H + 1.3, b * (h + 0.1));
      const roof = add(new THREE.ConeGeometry(TOWER_W * 0.85, 1.3, 4), roofM, 0, TOWER_H + 3.1, 0); roof.rotation.y = Math.PI / 4;
      // ladder up the open side
      for (const s of [-0.35, 0.35]) add(new THREE.BoxGeometry(0.08, TOWER_H + 0.6, 0.08), dark, h + 0.3, TOWER_H / 2 + 0.3, s);
      for (let y = 0.5; y < TOWER_H + 0.5; y += 0.45) add(new THREE.BoxGeometry(0.06, 0.06, 0.74), wood, h + 0.3, y, 0);
      // collision: a floor to stand on, railings for cover, legs to bump into
      const cols = [];
      const box = (x0, x1, z0, z1, y0, y1) => { const bb = { kind: 'box', minX: spot.x + x0, maxX: spot.x + x1, minZ: spot.z + z0, maxZ: spot.z + z1, minY: base + y0, maxY: base + y1, los: true }; obstacles.push(bb); gridAdd(bb, bb.minX, bb.maxX, bb.minZ, bb.maxZ); cols.push({ o: bb, y0: bb.minY, y1: bb.maxY }); };
      box(-h - 0.2, h + 0.2, -h - 0.2, h + 0.2, TOWER_H - 0.1, TOWER_H + 0.2);
      box(-h - 0.2, h + 0.2, -h - 0.25, -h - 0.05, TOWER_H + 0.2, TOWER_H + 1.25); box(-h - 0.2, h + 0.2, h + 0.05, h + 0.25, TOWER_H + 0.2, TOWER_H + 1.25);
      box(-h - 0.25, -h - 0.05, -h - 0.2, h + 0.2, TOWER_H + 0.2, TOWER_H + 1.25); box(h + 0.05, h + 0.25, -h + 0.8, h + 0.2, TOWER_H + 0.2, TOWER_H + 1.25);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const c = addCircle(spot.x + a * (h - 0.15), spot.z + b * (h - 0.15), 0.22, base + TOWER_H - 0.2); cols.push({ c, top: c.top, base: c.base }); }
      for (const m of [floor, ...rails]) solidMeshes.push(m);
      TOWERS.push({ i: TOWERS.length, x: spot.x, z: spot.z, base, top: top + 0.2, g, cols, solid: [floor, ...rails], hp: TOWER_HP, up: true, fallT: 0, downT: 0, fallDir: 0, by: null, ladder: { x: spot.x + h + 0.9, z: spot.z } });
    }
  });
})();

function towerColliders(t, on) {
  for (const c of t.cols) {
    if (c.o) { c.o.minY = on ? c.y0 : -999; c.o.maxY = on ? c.y1 : -999; }
    else { c.c.top = on ? c.top : -999; c.c.base = on ? c.base : -999; }
  }
  for (const m of t.solid) { const k = solidMeshes.indexOf(m); if (on && k < 0) solidMeshes.push(m); if (!on && k >= 0) solidMeshes.splice(k, 1); }
}
function knockTower(t, from) {
  if (!t.up) return;
  t.up = false; t.fallT = 0.001; t.downT = 0; t.hp = 0;
  t.fallDir = from ? Math.atan2(t.x - from.x, t.z - from.z) : Math.random() * 6.28;
  towerColliders(t, false);
  playAt('boom', new THREE.Vector3(t.x, t.base + 4, t.z), 0.8);
  burst(new THREE.Vector3(t.x, t.base + 5, t.z), 20, 0x8a6238, 8, 1.2, 0.2);
  for (const n of npcs) if (n.tower === t) n.tower = null;
}
function raiseTower(t) {
  t.up = true; t.hp = TOWER_HP; t.fallT = 0; t.g.visible = true; t.g.rotation.set(0, 0, 0); t.g.position.y = t.base;
  towerColliders(t, true);
}
// explosions wear towers down (online, only the host decides; a joiner reports the blasts it caused)
function towerBlast(pos, radius, dmg, attacker, ghost) {
  if (!TOWERS.length) return;
  for (const t of TOWERS) {
    if (!t.up) continue;
    const d = Math.hypot(pos.x - t.x, pos.z - t.z), dy = pos.y - t.base;
    if (d > radius + 3 || dy < -3 || dy > TOWER_H + 5) continue;
    const amt = dmg * (1 - Math.min(1, d / (radius + 3)) * 0.6);
    if (net.active && !net.isHost) { if (attacker === player && !ghost) netRequest(['tw', t.i, Math.round(amt), r10(pos.x), r10(pos.z)]); continue; }
    if (ghost && net.active) continue;   // the person who fired it sends the damage
    t.hp -= amt;
    if (t.hp <= 0) knockTower(t, pos);
    else if (amt > 20) burst(new THREE.Vector3(t.x, t.base + 4 + Math.random() * 4, t.z), 8, 0x8a6238, 5, 0.8, 0.15);
  }
}
function towerRequest(e) {   // host: a joiner's blast hit a tower
  const t = TOWERS[e[2]]; if (!t || !t.up) return;
  t.hp -= Math.min(400, e[3] | 0);
  if (t.hp <= 0) knockTower(t, { x: e[4] / 10, z: e[5] / 10 });
}
// which towers are down, for the host's updates
function towerMask() { return TOWERS.map(t => t.up ? '1' : '0').join(''); }
function applyTowerMask(m) {
  if (typeof m !== 'string') return;
  TOWERS.forEach((t, i) => { const up = m[i] !== '0'; if (up && !t.up) raiseTower(t); else if (!up && t.up) knockTower(t, null); });
}

// climbing
function towerInteract() {
  for (const t of TOWERS) {
    if (!t.up) continue;
    const d = Math.hypot(player.pos.x - t.ladder.x, player.pos.z - t.ladder.z);
    if (d < 2.4 && player.pos.y < t.base + 3) return { kind: 'tower', t, d, text: 'Press E to climb the sniper tower' };
  }
  return null;
}
function climbTower(t) {
  player.pos.set(t.x, t.top + 0.05, t.z); player.velY = 0; player.onGround = true;
  showMessage('Up the tower! Crouch (C) behind the railing. Jump off to get down', 2.5);
}

// every frame: falling towers, rebuilding, and computer snipers climbing up
function updateTowers(dt) {
  if (!TOWERS.length) return;
  const host = !net.active || net.isHost;
  for (const t of TOWERS) {
    if (!t.up && t.fallT > 0) {
      t.fallT += dt;
      const k = Math.min(1, t.fallT / 1.6), tilt = k * k * 1.45;
      t.g.rotation.set(Math.cos(t.fallDir) * tilt, 0, -Math.sin(t.fallDir) * tilt, 'XZY');
      if (k >= 1) { t.g.position.y = t.base - Math.min(3, (t.fallT - 1.6) * 2); if (t.fallT > 1.65 && t.fallT < 1.7) { playAt('thump', new THREE.Vector3(t.x, t.base, t.z), 1); burst(new THREE.Vector3(t.x + Math.sin(t.fallDir) * 6, t.base + 0.5, t.z + Math.cos(t.fallDir) * 6), 26, 0xb89a70, 9, 1.6, 0.3); } }
      if (t.fallT > 4) { t.g.visible = false; t.fallT = 0; }
    }
    if (!t.up && host) { t.downT += dt; if (t.downT > TOWER_REBUILD) raiseTower(t); }
  }
  if (!host) return;
  for (const n of npcs) {
    const t = n.tower; if (!t) continue;
    if (!n.alive || n.inactive || !t.up || n.gv) { n.tower = null; continue; }
    const onTop = n.pos.y > t.top - 0.6;
    if (!onTop && (Math.hypot(n.pos.x - t.ladder.x, n.pos.z - t.ladder.z) < 3 || Math.hypot(n.pos.x - t.x, n.pos.z - t.z) < TOWER_W)) { n.pos.set(t.x, t.top + 0.05, t.z); n.lastPos = n.pos.clone(); n.stuckT = 0; }
    n.goal = onTop ? new THREE.Vector3(t.x, 0, t.z) : new THREE.Vector3(t.ladder.x, 0, t.ladder.z);
    n.goalT = Math.max(n.goalT || 0, 20); n.vehTarget = null; n.mountTarget = null; n.tplan = null; n.detour = onTop ? null : n.detour;
    if (!onTop && Math.hypot(n.pos.x - t.x, n.pos.z - t.z) > 140) n.tower = null;   // too far to bother
  }
}
// computer snipers sometimes pick a tower instead of a trench
if (typeof sniperTakeNest === 'function') {
  const _take = sniperTakeNest;
  window.sniperTakeNest = function (n) {
    if (n.tower && n.tower.up && n.alive) { n.goal = new THREE.Vector3(n.tower.ladder.x, 0, n.tower.ladder.z); n.goalT = 90; return true; }   // stay on the tower we have
    n.tower = null;
    if (n.role === 'sniper' && TOWERS.length && Math.random() < 0.45) {
      let best = null, bd = 110;
      for (const t of TOWERS) { if (!t.up || npcs.some(o => o !== n && o.tower === t && o.alive)) continue; const d = Math.hypot(t.x - n.pos.x, t.z - n.pos.z); if (d < bd) { bd = d; best = t; } }
      if (best) { if (n.nest) { if (n.nest.by === n) n.nest.by = null; n.nest = null; } n.tower = best; n.goal = new THREE.Vector3(best.ladder.x, 0, best.ladder.z); n.goalT = 90; n.tplan = null; n.vehTarget = null; n.mountTarget = null; return true; }
    }
    return _take(n);
  };
}
