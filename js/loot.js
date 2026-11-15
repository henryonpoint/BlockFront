// ===================== loot.js : ammo off the fallen, health packs, and the whistle =====================
// - Soldiers who fall drop an ammo pouch. Walk over it to fill up your guns (and sometimes get a grenade).
// - Health packs sit around the map. Walk over one to heal; it comes back after a while.
// - Press H in a vehicle to whistle: teammates nearby run over and climb into the free seats.
//   Whistle again while they are aboard and they all hop out.

// ---------- ammo pouches ----------
const ammoDrops = [];
let _pouchGeo = null;
function pouchGeo() {
  if (_pouchGeo) return _pouchGeo;
  const p = new Part();
  p.box(0.42, 0.22, 0.28, 0x4f5a2e, 0, 0.11, 0); p.box(0.44, 0.06, 0.3, 0x3a4322, 0, 0.21, 0); p.box(0.44, 0.04, 0.06, 0xe8c040, 0, 0.12, 0.15);
  for (let i = 0; i < 4; i++) p.cyl(0.025, 0.025, 0.12, 0xd8a840, -0.12 + i * 0.08, 0.3, 0);     // bullets peeking out
  _pouchGeo = p.build(); return _pouchGeo;
}
function dropAmmo(c) {
  if (!c || c.isPlayer || !c.pos) return;
  const y = heightAt(c.pos.x, c.pos.z);
  if (c.pos.y > y + 4 || waterDepth(c.pos.x, c.pos.z) > 0.5) return;   // fell from a plane or into a lake
  const m = new THREE.Mesh(pouchGeo(), VEH_MAT); m.castShadow = true;
  m.position.set(c.pos.x + rand(-0.4, 0.4), Math.max(c.pos.y, y) + 0.05, c.pos.z + rand(-0.4, 0.4)); m.rotation.y = rand(0, 6.28); scene.add(m);
  ammoDrops.push({ m, t: 0 });
  if (ammoDrops.length > 30) { const o = ammoDrops.shift(); scene.remove(o.m); }
}
function takeAmmo() {
  let got = false;
  WEAPONS.forEach(w => {
    if (!player.owned[w.id]) return;
    const a = player.ammo[w.id]; if (!isFinite(w.reserve) || a.reserve >= w.reserve) return;
    a.reserve = Math.min(w.reserve, a.reserve + w.mag * (w === curW() ? 2 : 1)); got = true;
  });
  let nade = false; if (Math.random() < 0.35 && player.grenades < 6) { player.grenades++; nade = true; }
  showMessage(got || nade ? `Picked up ammo${nade ? ' and a grenade' : ''}` : 'Your ammo is already full', 1.4);
  if (got || nade) SFX.reload(0.7);
  return got || nade;
}

// ---------- health packs ----------
const medkits = [];
let _medGeo = null;
function medGeo() {
  if (_medGeo) return _medGeo;
  const p = new Part();
  p.box(0.55, 0.32, 0.38, 0xf2f2f2, 0, 0.16, 0); p.box(0.57, 0.05, 0.4, 0xd0d0d0, 0, 0.32, 0); p.box(0.16, 0.06, 0.06, 0x707070, 0, 0.37, 0);
  for (const s of [-1, 1]) { p.box(0.3, 0.08, 0.02, 0xd8262a, 0, 0.17, s * 0.2); p.box(0.08, 0.24, 0.02, 0xd8262a, 0, 0.17, s * 0.2); }   // red crosses
  p.box(0.08, 0.02, 0.24, 0xd8262a, 0, 0.33, 0); p.box(0.24, 0.02, 0.08, 0xd8262a, 0, 0.33, 0);
  _medGeo = p.build(); return _medGeo;
}
function buildMedkits() {
  const spots = [];
  const tryAdd = (x, z) => {
    if (Math.abs(x) > EDGE - 30 || Math.abs(z) > EDGE - 30 || waterDepth(x, z) > 0.1) return false;
    if (typeof blockedAt === 'function' && blockedAt(x, z, heightAt(x, z), 0.6, true)) return false;
    if (spots.some(s => Math.hypot(s.x - x, s.z - z) < 30)) return false;
    spots.push({ x, z }); return true;
  };
  // near every control point, along the roads between them, in the trenches and around the map
  for (const p of POINTS_DEF) for (let k = 0; k < 10; k++) { const a = rand(0, 6.28), r = rand(22, 34); if (tryAdd(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r)) break; }
  if (typeof NESTS !== 'undefined') for (const t of NESTS) if (t.spots && t.spots[0]) tryAdd(t.spots[0].x - t.n[0] * 0.2, t.spots[0].z - t.n[1] * 0.2);
  for (let i = 0; i < 80 && spots.length < (LITE ? 18 : 28); i++) tryAdd(rand(-EDGE + 50, EDGE - 50), rand(-EDGE + 50, EDGE - 50));
  for (const s of spots) {
    const g = new THREE.Group(), m = new THREE.Mesh(medGeo(), VEH_MAT); m.castShadow = true; g.add(m);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 24), new THREE.MeshBasicMaterial({ color: 0x5dff7a, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
    g.position.set(s.x, heightAt(s.x, s.z), s.z); scene.add(g);
    medkits.push({ g, m, ring, x: s.x, z: s.z, t: 0 });
  }
}

// ---------- the whistle ----------
SFX.whistleCall = (v = 1) => { tn('sine', 1500, 2300, 0.18, 0.18 * v); tn('sine', 2300, 1700, 0.3, 0.18 * v, 0.22); };
function whistleForVehicle(v, team, from) {
  const aboard = occupants(v).filter(c => !c.isPlayer && !c.isRemote);
  if (aboard.length && !v.whistleIn) { for (const c of aboard) { leaveSeat(c); c.noVehT = simTime + 8; } return -aboard.length; }   // everybody out
  let free = 0; for (let i = 0; i < v.seats.length; i++) if (!v.seats[i]) free++;
  const near = npcs.filter(n => n.alive && !n.inactive && n.team === team && !n.gv && !n.turret && !n.nest && !(n.scaredT > 0) && n.pos.distanceTo(from) < 55)
    .sort((a, b) => a.pos.distanceTo(from) - b.pos.distanceTo(from)).slice(0, free);
  for (const n of near) { n.vehTarget = v; n.mountTarget = null; n.tplan = null; n.noVehT = 0; n.target = null; }
  v.whistleIn = near.length > 0; setTimeout(() => { v.whistleIn = false; }, 15000);
  return near.length;
}
function whistle() {
  if (!player.alive) return;
  const v = player.gv;
  SFX.whistleCall(1);
  if (!v) { showMessage('Get in a vehicle first, then whistle (H) to call your team in', 2); return; }
  if (net.active && !net.isHost) { netRequest(['wh', gvehicles.indexOf(v), teamIdx(player.team)]); showMessage('Whistled! Stop so your team can climb in', 2); return; }
  const n = whistleForVehicle(v, player.team, player.pos);
  showMessage(n > 0 ? `Whistled! ${n} soldier${n > 1 ? 's are' : ' is'} coming. Stop so they can climb in` : n < 0 ? 'Everybody out!' : 'No teammates close enough, or no free seats', 2.2);
}
addEventListener('keydown', e => { if (e.code === 'KeyH' && playing && !e.repeat) whistle(); });

// ---------- every frame ----------
function updateLoot(dt) {
  const t = simTime;
  const canTake = player.alive && !player.vehicle && !player.gv && !player.turret && !player.planeGun;
  for (let i = ammoDrops.length - 1; i >= 0; i--) {
    const d = ammoDrops[i]; d.t += dt;
    d.m.rotation.y += dt * 0.8;
    if (canTake && Math.hypot(player.pos.x - d.m.position.x, player.pos.z - d.m.position.z) < 1.6 && Math.abs(player.pos.y - d.m.position.y) < 2) {
      if (takeAmmo()) { scene.remove(d.m); ammoDrops.splice(i, 1); continue; }
    }
    if (d.t > 45) { scene.remove(d.m); ammoDrops.splice(i, 1); }
  }
  for (const k of medkits) {
    if (k.t > 0) { k.t -= dt; if (k.t <= 0) k.g.visible = true; continue; }
    k.m.rotation.y += dt * 0.9; k.m.position.y = 0.12 + Math.sin(t * 2.5 + k.x) * 0.06; k.ring.material.opacity = 0.35 + Math.sin(t * 3 + k.z) * 0.2;
    if (canTake && player.hp < 100 && Math.hypot(player.pos.x - k.x, player.pos.z - k.z) < 1.5 && Math.abs(player.pos.y - k.g.position.y) < 2.5) {
      player.hp = Math.min(100, player.hp + 60); k.t = 40; k.g.visible = false;
      showMessage('+60 health', 1.3); if (SFX.capture) SFX.capture(0.4);
    }
  }
}

// this file loads after the world is built, so place the health packs now
buildMedkits();
