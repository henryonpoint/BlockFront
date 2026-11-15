// ===================== city.js : people and traffic in Houston =====================
// Civilians stroll the sidewalks and plazas. When shooting or explosions start close by they put their
// hands up and run. Cars, pickups, taxis, vans and buses drive the streets and freeways, keep to their lane,
// and brake for anyone in the road. A big enough blast wrecks a car: it burns, then gets towed away later.
// Hitting a civilian costs you $100. Like the animals, these are local scenery and not shared online.
const civs = [], traffic = [];

// ---------- civilians ----------
const SKIN = [0xf1c8a8, 0xd9a47e, 0xb07850, 0x8a5a3a, 0x5e3c26], HAIR = [0x2a1d14, 0x5a3a20, 0xc8a050, 0x111111, 0x8a8a8a, 0xa04a20];
const SHIRT = [0xd8262a, 0x2a6ab8, 0xf2f2f2, 0x2e8b57, 0xf2b630, 0x7a3ab8, 0xff7a3a, 0x1d1d22, 0x3ab8b0, 0xe8a0c0];
const PANTS = [0x2a3a5a, 0x1d1d22, 0x6a5a40, 0x4a4a4a, 0xc8b890, 0x3a4a2a];
function buildCiv() {
  const g = new THREE.Group(), skin = pick(SKIN), shirt = pick(SHIRT), pants = pick(PANTS), body = new Part();
  body.box(0.46, 0.62, 0.26, shirt, 0, 1.22, 0);
  body.box(0.24, 0.24, 0.24, skin, 0, 1.68, 0); body.box(0.26, 0.09, 0.26, pick(HAIR), 0, 1.82, -0.01);
  if (Math.random() < 0.3) { body.box(0.34, 0.06, 0.34, pick([0xd8262a, 0x1d1d22, 0xc8b070, 0x2a6ab8]), 0, 1.88, 0.03); body.box(0.24, 0.12, 0.24, pick([0xd8262a, 0x1d1d22, 0xc8b070]), 0, 1.93, 0); }   // cap
  body.box(0.48, 0.12, 0.27, pants, 0, 0.92, 0);
  const bm = new THREE.Mesh(body.build(), VEH_MAT); bm.castShadow = true; g.add(bm);
  const limb = (w, h, col, col2) => { const p = new Part(); p.box(w, h, w, col, 0, -h / 2, 0); p.box(w * 1.05, 0.1, w * 1.3, col2, 0, -h, 0.03); const m = new THREE.Mesh(p.build(), VEH_MAT); m.castShadow = true; const piv = new THREE.Group(); piv.add(m); g.add(piv); return piv; };
  const legL = limb(0.18, 0.86, pants, 0x222222), legR = limb(0.18, 0.86, pants, 0x222222);
  legL.position.set(-0.11, 0.88, 0); legR.position.set(0.11, 0.88, 0);
  const armL = limb(0.13, 0.6, shirt, skin), armR = limb(0.13, 0.6, shirt, skin);
  armL.position.set(-0.3, 1.5, 0); armR.position.set(0.3, 1.5, 0);
  scene.add(g);
  return { g, legL, legR, armL, armR };
}
function civSpotOk(x, z) {
  if (Math.abs(x) > EDGE - 30 || Math.abs(z) > EDGE - 30 || waterDepth(x, z) > 0.1) return false;
  if (blockedAt(x, z, heightAt(x, z), 0.5, true)) return false;
  for (const t of TEAMS) if (Math.hypot(x - BASES[t].x, z - BASES[t].z) < 60) return false;
  if (freewayDist(x, z) < 10) return false;
  return true;
}
function spawnCivs() {
  const homes = [{ x: 0, z: 0, r: 160, n: 34 }, { x: PD.A.x, z: PD.A.z, r: 60, n: 8 }, { x: PD.B.x, z: PD.B.z + 40, r: 70, n: 8 }, { x: PD.D.x, z: PD.D.z, r: 65, n: 8 }, { x: PD.F.x, z: PD.F.z, r: 60, n: 9 }, { x: PD.G.x, z: PD.G.z, r: 55, n: 6 }, { x: PD.E.x, z: PD.E.z, r: 55, n: 4 }];
  const scale = LITE ? 0.55 : 1;
  for (const h of homes) for (let i = 0; i < Math.round(h.n * scale); i++) {
    let x = 0, z = 0, ok = false;
    for (let k = 0; k < 30 && !ok; k++) { x = h.x + rand(-h.r, h.r); z = h.z + rand(-h.r, h.r); ok = civSpotOk(x, z); }
    if (!ok) continue;
    civs.push({ m: buildCiv(), pos: new THREE.Vector3(x, heightAt(x, z), z), home: h, yaw: rand(0, 6.28), goal: null, t: rand(0, 3), state: 'idle', phase: rand(0, 6), alive: true, deadT: 0, speed: rand(1.1, 1.6) });
  }
}
function civRay(origin, dir, maxD) {
  let best = null, bd = maxD;
  for (const c of civs) {
    if (!c.alive || !c.m.g.visible) continue;
    const t = raySphere(origin, dir, _cvC.set(c.pos.x, c.pos.y + 1.1, c.pos.z), 0.5);
    if (t !== null && t < bd) { bd = t; best = c; }
  }
  return best ? { c: best, dist: bd } : null;
}
const _cvC = new THREE.Vector3();
function civHit(c, byPlayer) {
  if (!c.alive) return;
  c.alive = false; c.deadT = 0;
  burst(c.pos.clone().setY(c.pos.y + 1), 6, 0x8a1a1a, 3, 0.4, 0.06);
  if (byPlayer) { addMoney(-100, 'Civilian hit'); showMessage('Watch out for civilians! -$100', 2); }
}

// ---------- traffic ----------
function buildTrafficCar(kind) {
  const p = new Part(), col = kind === 'taxi' ? 0xf2c230 : kind === 'bus' ? 0x2a6ab8 : kind === 'police' ? 0xf2f2f2 : pick([0xffffff, 0x1d1d22, 0xd8262a, 0x2a5aa8, 0x8a8a8a, 0xc8c8c8, 0x2e6b3a, 0x7a2a2a, 0xd8a020]);
  const glass = 0x6a90b0;
  if (kind === 'bus') {
    p.box(2.5, 2.6, 11, col, 0, 1.75, 0); p.box(2.52, 0.9, 10.4, glass, 0, 2.3, 0); p.box(2.52, 0.4, 11, 0xf2f2f2, 0, 0.75, 0);
    p.box(2.2, 1, 0.05, glass, 0, 2.2, 5.51);
  } else if (kind === 'pickup') {
    p.box(2, 0.8, 5.2, col, 0, 0.85, 0); p.box(1.9, 0.75, 2, col, 0, 1.6, 0.8); p.box(1.92, 0.5, 1.8, glass, 0, 1.65, 0.8);
    p.box(1.9, 0.5, 0.1, col, 0, 1.4, -2.5); p.box(0.1, 0.5, 2.3, col, 0.95, 1.4, -1.3); p.box(0.1, 0.5, 2.3, col, -0.95, 1.4, -1.3);
  } else if (kind === 'van') {
    p.box(2, 2, 5, col, 0, 1.45, 0); p.box(2.02, 0.7, 1.4, glass, 0, 1.85, 1.9);
  } else {
    p.box(1.9, 0.7, 4.4, col, 0, 0.8, 0); p.box(1.72, 0.62, 2.3, col, 0, 1.42, -0.1); p.box(1.74, 0.46, 2.1, glass, 0, 1.45, -0.1);
    if (kind === 'taxi') p.box(0.7, 0.25, 0.3, 0xffffff, 0, 1.86, -0.1);
    if (kind === 'police') { p.box(1.92, 0.3, 1.6, 0x1d1d22, 0, 0.85, 0.3); p.box(0.4, 0.15, 0.25, 0xd8262a, -0.3, 1.8, -0.1); p.box(0.4, 0.15, 0.25, 0x2a6ab8, 0.3, 1.8, -0.1); }
  }
  const len = kind === 'bus' ? 11 : kind === 'pickup' ? 5.2 : kind === 'van' ? 5 : 4.4, wid = kind === 'bus' ? 2.5 : 2;
  for (const s of [-1, 1]) for (const z of kind === 'bus' ? [-3.8, 3.8] : [-len * 0.32, len * 0.32]) p.cyl(0.38, 0.38, 0.3, 0x1a1a1a, s * (wid / 2), 0.38, z, 0, 0, Math.PI / 2);
  for (const s of [-1, 1]) { p.box(0.32, 0.16, 0.05, 0xfff4c8, s * wid * 0.32, 0.85, len / 2 + 0.01); p.box(0.32, 0.16, 0.05, 0xd8262a, s * wid * 0.32, 0.85, -len / 2 - 0.01); }
  const m = new THREE.Mesh(p.build(), VEH_MAT); m.castShadow = true; scene.add(m);
  return { m, len, wid };
}
// the road network as lanes: each road gives a lane each way
let LANES = null;
function buildLanes() {
  LANES = [];
  PATHS.forEach(([a, b], i) => {
    const fw = i < H_FREEWAYS.length, off = fw ? 4.3 : 2.3, L = Math.hypot(b.x - a.x, b.z - a.z);
    if (L < 20) return;
    for (const dirn of [1, -1]) {
      const s = dirn > 0 ? a : b, e = dirn > 0 ? b : a, ux = (e.x - s.x) / L, uz = (e.z - s.z) / L, rx = -uz, rz = ux;   // drive on the right
      LANES.push({ s: { x: s.x + rx * off, z: s.z + rz * off }, e: { x: e.x + rx * off, z: e.z + rz * off }, ux, uz, L, fw, speed: fw ? rand(19, 24) : rand(10, 13) });
    }
  });
}
function nextLane(car) {
  const end = car.lane.e;
  const opts = LANES.filter(l => l !== car.lane && Math.hypot(l.s.x - end.x, l.s.z - end.z) < 14 && (l.ux * car.lane.ux + l.uz * car.lane.uz) > -0.9);
  if (opts.length) return pick(opts);
  // nothing joins here: turn round onto the lane going back
  return LANES.find(l => Math.hypot(l.s.x - end.x, l.s.z - end.z) < 10 && (l.ux * car.lane.ux + l.uz * car.lane.uz) < -0.9) || pick(LANES);
}
function spawnTraffic() {
  buildLanes();
  const n = LITE ? 22 : 42;
  const kinds = ['car', 'car', 'car', 'car', 'pickup', 'pickup', 'taxi', 'van', 'police', 'bus'];
  for (let i = 0; i < n; i++) {
    const lane = pick(LANES), d = rand(10, lane.L - 10);
    const kind = pick(kinds), vm = buildTrafficCar(kind);
    traffic.push({ ...vm, kind, lane, d, v: lane.speed * 0.6, alive: true, wreckT: 0 });
  }
}
function carPos(c) { return { x: c.lane.s.x + c.lane.ux * c.d, z: c.lane.s.z + c.lane.uz * c.d }; }
function wreckCar(c) {
  if (!c.alive) return;
  c.alive = false; c.wreckT = 0; c.v = 0;
  c.m.material = new THREE.MeshLambertMaterial({ color: 0x2a2624 });
  const p = carPos(c); burst(new THREE.Vector3(p.x, heightAt(p.x, p.z) + 1, p.z), 14, 0xffa040, 8, 0.8, 0.15);
}

// ---------- every frame ----------
function updateCity(dt) {
  if (!HOUSTON) return;
  const cam = camera.position;
  // civilians
  for (const c of civs) {
    if (!c.alive) {
      c.deadT += dt; c.m.g.rotation.x = lerp(c.m.g.rotation.x, -Math.PI / 2, Math.min(1, dt * 7)); c.m.g.position.y = c.pos.y + 0.2;
      if (c.deadT > 25 && c.pos.distanceTo(cam) > 120) { c.alive = true; c.m.g.rotation.x = 0; for (let k = 0; k < 20; k++) { const x = c.home.x + rand(-c.home.r, c.home.r), z = c.home.z + rand(-c.home.r, c.home.r); if (civSpotOk(x, z)) { c.pos.set(x, heightAt(x, z), z); break; } } }
      continue;
    }
    const far = c.pos.distanceTo(cam) > 230;
    c.m.g.visible = !far || c.pos.distanceTo(cam) < 330;
    c.thinkT = (c.thinkT || 0) - dt;
    if (c.thinkT <= 0) {
      c.thinkT = far ? 1 : 0.35;
      let scare = null;
      for (const nz of animalNoise) if (Math.hypot(nz.x - c.pos.x, nz.z - c.pos.z) < nz.r * 0.8) { scare = nz; break; }
      if (!scare) for (const ch of chars) if (ch.alive && !ch.inactive && ch.target && Math.abs(ch.pos.x - c.pos.x) < 14 && Math.abs(ch.pos.z - c.pos.z) < 14) { scare = ch.pos; break; }
      if (scare) { c.state = 'flee'; c.t = rand(4, 8); c.from = { x: scare.x, z: scare.z }; }
    }
    c.t -= dt;
    let sp = 0, want = null;
    if (c.state === 'flee') { sp = 4.8; want = Math.atan2(c.pos.x - c.from.x, c.pos.z - c.from.z); if (c.t <= 0) { c.state = 'idle'; c.t = rand(2, 5); } }
    else if (c.state === 'walk') { sp = c.speed; if (!c.goal || Math.hypot(c.goal.x - c.pos.x, c.goal.z - c.pos.z) < 1 || c.t <= 0) { c.state = 'idle'; c.t = rand(1, 6); } else want = Math.atan2(c.goal.x - c.pos.x, c.goal.z - c.pos.z); }
    else if (c.t <= 0) { c.state = 'walk'; c.t = rand(8, 18); c.goal = { x: c.pos.x + rand(-30, 30), z: c.pos.z + rand(-30, 30) }; }
    if (want !== null) {
      c.yaw += wrapAngle(want - c.yaw) * Math.min(1, dt * 5);
      const nx = c.pos.x + Math.sin(c.yaw) * sp * dt, nz = c.pos.z + Math.cos(c.yaw) * sp * dt;
      if (civSpotOk(nx, nz) && Math.hypot(nx - c.home.x, nz - c.home.z) < c.home.r * 1.5) { c.pos.x = nx; c.pos.z = nz; c.pos.y = heightAt(nx, nz); }
      else { c.yaw += rand(1.5, 3); c.goal = null; }
    }
    if (far) continue;
    c.phase += dt * sp * 3.2;
    const sw = sp > 0 ? Math.sin(c.phase) * (sp > 3 ? 0.9 : 0.5) : 0;
    c.m.g.position.copy(c.pos); c.m.g.rotation.y = c.yaw;
    c.m.legL.rotation.x = sw; c.m.legR.rotation.x = -sw;
    if (c.state === 'flee') { c.m.armL.rotation.x = c.m.armR.rotation.x = -2.9; c.m.armL.rotation.z = 0.2; c.m.armR.rotation.z = -0.2; }   // hands up, running
    else { c.m.armL.rotation.x = -sw * 0.8; c.m.armR.rotation.x = sw * 0.8; c.m.armL.rotation.z = c.m.armR.rotation.z = 0; }
  }
  // traffic
  for (const c of traffic) {
    const p = carPos(c);
    if (!c.alive) {
      c.wreckT += dt; if (c.wreckT < 20 && Math.random() < dt * 4) smokePuff(new THREE.Vector3(p.x, heightAt(p.x, p.z) + 1.5, p.z), 0x2a2a2a, 0.6, 2.5, 1.5);
      if (c.wreckT > 30 && Math.hypot(p.x - cam.x, p.z - cam.z) > 150) { scene.remove(c.m); const n = buildTrafficCar(c.kind); Object.assign(c, n); c.lane = pick(LANES); c.d = rand(10, c.lane.L - 10); c.alive = true; c.v = 0; }
      continue;
    }
    // brake for people, vehicles and other cars ahead
    let block = false;
    const ax = p.x + c.lane.ux * (c.len / 2 + 5), az = p.z + c.lane.uz * (c.len / 2 + 5), lookR = 4 + c.v * 0.25;
    for (const ch of chars) if (ch.alive && !ch.inactive && Math.abs(ch.pos.x - ax) < lookR && Math.abs(ch.pos.z - az) < lookR) { block = true; break; }
    if (!block) for (const cv of civs) if (cv.alive && Math.abs(cv.pos.x - ax) < 3 && Math.abs(cv.pos.z - az) < 3) { block = true; break; }
    if (!block) for (const v of gvehicles) if (v.alive && Math.hypot(v.pos.x - ax, v.pos.z - az) < lookR + 2) { block = true; break; }
    if (!block) for (const o of traffic) if (o !== c && o.lane === c.lane && o.d > c.d && o.d - c.d < c.len / 2 + o.len / 2 + 4 + c.v * 0.4) { block = true; break; }
    const target = block ? 0 : c.lane.speed;
    c.v += clamp(target - c.v, -14 * dt, 4 * dt);
    c.d += c.v * dt;
    if (c.d > c.lane.L - 2) { c.lane = nextLane(c); c.d = 2; }
    const q = carPos(c), y = heightAt(q.x, q.z);
    c.m.position.set(q.x, y + (bayouDist(q.x, q.z) < 14 ? Math.max(0, 2.06 - y) : 0) + 0.02, q.z);
    const yaw = Math.atan2(c.lane.ux, c.lane.uz); c.m.rotation.y += wrapAngle(yaw - c.m.rotation.y) * Math.min(1, dt * 6);
    c.m.visible = Math.hypot(q.x - cam.x, q.z - cam.z) < 420;
  }
}
// explosions wreck cars and knock down civilians nearby
function cityBlast(pos, radius) {
  if (!HOUSTON) return;
  for (const c of traffic) { if (!c.alive) continue; const p = carPos(c); if (Math.hypot(p.x - pos.x, p.z - pos.z) < radius + 2) wreckCar(c); }
  for (const c of civs) if (c.alive && c.pos.distanceTo(pos) < radius) civHit(c, false);
}
if (HOUSTON) { spawnCivs(); spawnTraffic(); }
