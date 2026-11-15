// ===================== animals.js : wildlife =====================
// Each map has its own animals wandering around: grazing, sniffing about, and running off when soldiers
// come close or something blows up nearby. Ducks paddle on the lakes. They can get hit like anyone else,
// so watch your aim. Animals are just scenery: every computer has its own, they are not shared online.
const animals = [];
const animalNoise = [];   // recent bangs that make animals bolt
const SPECIES = {
  deer: { len: 1.3, leg: 0.78, w: 0.42, col: 0x8a5a32, belly: 0xd8c3a0, head: 0.22, neck: 0.45, tail: 'short', speed: 1.3, run: 9, flee: 26, herd: [2, 4], antlers: 0.5 },
  elk: { len: 1.7, leg: 0.95, w: 0.55, col: 0x6a4a30, belly: 0xb89a70, head: 0.27, neck: 0.55, tail: 'short', speed: 1.2, run: 8, flee: 30, herd: [2, 3], antlers: 1 },
  rabbit: { len: 0.36, leg: 0.12, w: 0.22, col: 0x9b8670, belly: 0xe6dccc, head: 0.12, neck: 0.05, tail: 'puff', ears: 'long', speed: 0.8, run: 8, flee: 14, herd: [1, 3], hop: true },
  hare: { len: 0.42, leg: 0.14, w: 0.24, col: 0xf2f4f6, belly: 0xffffff, head: 0.13, neck: 0.05, tail: 'puff', ears: 'long', speed: 0.9, run: 9, flee: 16, herd: [1, 2], hop: true },
  cow: { len: 1.7, leg: 0.7, w: 0.78, col: 0xf2efe8, belly: 0xf2efe8, spots: 0x222222, head: 0.3, neck: 0.25, tail: 'rope', speed: 0.7, run: 3.5, flee: 7, herd: [3, 5], horns: 0.15 },
  longhorn: { len: 1.7, leg: 0.72, w: 0.75, col: 0xa0582a, belly: 0xe8d8c0, spots: 0xf0e6d6, head: 0.3, neck: 0.25, tail: 'rope', speed: 0.7, run: 4, flee: 8, herd: [2, 4], horns: 0.75 },
  fox: { len: 0.72, leg: 0.3, w: 0.26, col: 0xc8642a, belly: 0xf3ead8, head: 0.15, neck: 0.12, tail: 'bushy', ears: 'point', speed: 1.4, run: 8, flee: 20, herd: [1, 1] },
  wolf: { len: 1.1, leg: 0.55, w: 0.34, col: 0x8a8c90, belly: 0xd6d6d6, head: 0.2, neck: 0.18, tail: 'bushy', ears: 'point', speed: 1.5, run: 9, flee: 22, herd: [2, 4] },
  bear: { len: 1.7, leg: 0.62, w: 0.9, col: 0x5a3a24, belly: 0x4a2e1c, head: 0.32, neck: 0.15, tail: 'stub', ears: 'round', speed: 0.9, run: 6, flee: 14, herd: [1, 1] },
  camel: { len: 1.8, leg: 1.25, w: 0.62, col: 0xc9a066, belly: 0xe0c08a, head: 0.24, neck: 0.85, tail: 'rope', speed: 0.9, run: 5, flee: 12, herd: [2, 4], humps: 2 },
  goat: { len: 0.9, leg: 0.5, w: 0.36, col: 0xd8d0c0, belly: 0xf0ebe0, head: 0.17, neck: 0.25, tail: 'stub', speed: 1, run: 6, flee: 15, herd: [2, 4], horns: 0.3 },
  lizard: { len: 0.55, leg: 0.06, w: 0.13, col: 0x8a7a40, belly: 0xb8a868, head: 0.08, neck: 0.02, tail: 'lizard', speed: 1.1, run: 7, flee: 9, herd: [1, 1], low: true },
  armadillo: { len: 0.62, leg: 0.12, w: 0.32, col: 0x8f8678, belly: 0xc8b8a0, head: 0.1, neck: 0.04, tail: 'lizard', speed: 0.7, run: 3, flee: 9, herd: [1, 1], shell: true },
  squirrel: { len: 0.3, leg: 0.1, w: 0.16, col: 0x7a6a5a, belly: 0xd8ccbc, head: 0.1, neck: 0.04, tail: 'squirrel', ears: 'point', speed: 1.2, run: 7, flee: 10, herd: [1, 2], hop: true },
  duck: { len: 0.45, leg: 0, w: 0.3, col: 0x6a5a40, belly: 0x8a7a5a, head: 0.12, neck: 0.15, tail: 'duck', speed: 0.6, run: 2.4, flee: 12, herd: [3, 5], swim: true, duck: true },
  crab: { len: 0.4, leg: 0.1, w: 0.42, col: 0xd8502a, belly: 0xf0a070, head: 0.08, neck: 0.02, tail: 'stub', speed: 0.9, run: 4, flee: 7, herd: [2, 4], low: true },
  turtle: { len: 0.9, leg: 0.14, w: 0.7, col: 0x5a6a3a, belly: 0xc8b878, head: 0.13, neck: 0.12, tail: 'stub', speed: 0.3, run: 0.8, flee: 4, herd: [1, 2], shell: true },
  gator: { len: 2.6, leg: 0.12, w: 0.55, col: 0x3e4a2a, belly: 0x8a9060, head: 0.2, neck: 0.02, tail: 'gator', speed: 0.5, run: 2, flee: 10, herd: [1, 1], swim: true, low: true, snout: true },
};
function animalSet() {
  if (WAKE) return { land: ['crab', 'crab', 'turtle', 'crab'], water: [] };
  if (typeof HOUSTON !== 'undefined' && HOUSTON) return { land: ['squirrel', 'squirrel', 'armadillo', 'longhorn', 'rabbit', 'fox'], water: ['duck', 'gator'] };
  if (SNOW) return { land: ['wolf', 'hare', 'hare', 'elk', 'bear', 'fox'], water: [] };
  if (DESERT) return { land: ['camel', 'goat', 'lizard', 'lizard', 'fox', 'rabbit'], water: ['duck'] };
  return { land: ['deer', 'deer', 'rabbit', 'rabbit', 'cow', 'fox', 'squirrel'], water: ['duck'] };
}

// ---------- models ----------
function buildAnimal(kind) {
  const S = SPECIES[kind], g = new THREE.Group(), body = new Part();
  const L = S.len, W = S.w, H = S.leg, by = H + W * 0.42, c = S.col, b = S.belly;
  if (S.duck) {
    body.ball(W * 0.5, c, 0, 0.12, 0); body.box(W * 0.8, W * 0.5, L * 0.9, c, 0, 0.12, 0); body.box(W * 0.6, 0.06, L * 0.5, b, 0, 0.0, 0);
    body.cyl(0.04, 0.05, S.neck, kind === 'duck' && Math.random() < 0.5 ? 0x1f6a3a : c, 0, 0.3, L * 0.35); body.ball(S.head, Math.random() < 0.5 ? 0x1f6a3a : c, 0, 0.42, L * 0.38);
    body.box(0.07, 0.03, 0.12, 0xe8a020, 0, 0.4, L * 0.38 + 0.13); body.box(W * 0.5, 0.06, 0.12, c, 0, 0.18, -L * 0.48, 0.4);
  } else {
    // torso, belly, neck, head
    body.box(W, W * 0.85, L, c, 0, by, 0);
    body.box(W * 0.8, W * 0.2, L * 0.85, b, 0, by - W * 0.38, 0);
    if (S.shell) for (let i = 0; i < 5; i++) body.box(W * 1.08, W * 0.7, L * 0.15, i % 2 ? 0x7a7266 : S.col, 0, by + 0.04, -L * 0.3 + i * L * 0.15);
    if (S.humps) for (let i = 0; i < S.humps; i++) body.ball(W * 0.42, c, 0, by + W * 0.5, -L * 0.18 + i * L * 0.36);
    if (S.spots) for (let i = 0; i < 5; i++) body.box(W * 1.02, W * 0.3, L * 0.18, S.spots, 0, by + (Math.random() - 0.3) * W * 0.4, (Math.random() - 0.5) * L * 0.8);
    const nz = L / 2, ny = by + W * 0.25 + S.neck * 0.5;
    if (S.neck > 0.1) body.cyl(W * 0.22, W * 0.3, S.neck, c, 0, ny, nz + 0.02, 0.5);
    const hy = by + W * 0.2 + S.neck * 0.95, hz = nz + S.neck * 0.3 + S.head * 0.6;
    body.box(S.head * 1.2, S.head * 1.1, S.head * 1.7, c, 0, hy, hz);
    body.box(S.head * 0.8, S.head * 0.7, S.head * 0.9, S.snout ? c : b, 0, hy - S.head * 0.15, hz + S.head * (S.snout ? 1.8 : 1.1), 0, 0, 0);
    if (S.snout) body.box(S.head * 0.9, S.head * 0.5, S.head * 2.6, c, 0, hy - S.head * 0.15, hz + S.head * 2.3);
    body.box(S.head * 0.25, S.head * 0.25, 0.04, 0x111111, S.head * 0.4, hy + S.head * 0.2, hz + S.head * 0.6); body.box(S.head * 0.25, S.head * 0.25, 0.04, 0x111111, -S.head * 0.4, hy + S.head * 0.2, hz + S.head * 0.6);
    if (S.ears === 'long') { body.box(0.05, 0.22, 0.08, c, 0.05, hy + 0.17, hz - 0.03, -0.2); body.box(0.05, 0.22, 0.08, c, -0.05, hy + 0.17, hz - 0.03, -0.2); }
    else if (S.ears === 'point') { body.box(0.05, S.head * 0.6, S.head * 0.4, c, S.head * 0.35, hy + S.head * 0.7, hz - S.head * 0.4, 0, 0, -0.2); body.box(0.05, S.head * 0.6, S.head * 0.4, c, -S.head * 0.35, hy + S.head * 0.7, hz - S.head * 0.4, 0, 0, 0.2); }
    else if (S.ears === 'round') { body.ball(S.head * 0.25, c, S.head * 0.45, hy + S.head * 0.55, hz - S.head * 0.4); body.ball(S.head * 0.25, c, -S.head * 0.45, hy + S.head * 0.55, hz - S.head * 0.4); }
    if (S.horns) for (const s of [-1, 1]) body.box(S.horns, 0.05, 0.05, 0xe8e0c8, s * (S.head * 0.6 + S.horns * 0.5), hy + S.head * 0.55, hz - S.head * 0.3, 0, 0, s * (S.horns > 0.5 ? -0.25 : 0.4));
    if (S.antlers && Math.random() < 0.6) for (const s of [-1, 1]) {
      const a = S.antlers;
      body.box(0.04, 0.4 * a, 0.04, 0xd8c8a8, s * 0.1, hy + S.head * 0.6 + 0.2 * a, hz - 0.08, 0, 0, s * -0.4);
      for (let i = 0; i < 3; i++) body.box(0.03, 0.22 * a, 0.03, 0xd8c8a8, s * (0.18 + i * 0.07) * a, hy + S.head * 0.6 + (0.25 + i * 0.12) * a, hz - 0.08 + i * 0.04, 0.3, 0, s * -0.9);
    }
    // tail
    const tz = -L / 2;
    if (S.tail === 'bushy') { body.box(W * 0.35, W * 0.35, L * 0.55, c, 0, by - W * 0.05, tz - L * 0.25, 0.6); body.box(W * 0.3, W * 0.3, L * 0.12, 0xf5f0e6, 0, by - W * 0.35, tz - L * 0.48, 0.6); }
    else if (S.tail === 'puff') body.ball(W * 0.28, 0xffffff, 0, by + W * 0.1, tz);
    else if (S.tail === 'rope') { body.box(0.05, H * 0.8, 0.05, c, 0, by - H * 0.35, tz - 0.03); body.box(0.1, 0.15, 0.1, 0x222222, 0, by - H * 0.8, tz - 0.03); }
    else if (S.tail === 'squirrel') body.box(W * 0.6, L * 1.0, W * 0.5, c, 0, by + L * 0.4, tz - 0.05, -0.35);
    else if (S.tail === 'lizard' || S.tail === 'gator') { body.box(W * 0.45, W * 0.35, L * 0.45, c, 0, by - W * 0.1, tz - L * 0.2); body.box(W * 0.25, W * 0.2, L * 0.4, c, 0, by - W * 0.15, tz - L * 0.6); }
    else body.box(W * 0.25, W * 0.25, W * 0.3, c, 0, by + W * 0.15, tz - 0.05);
    if (S.tail === 'gator') for (let i = 0; i < 8; i++) body.box(0.08, 0.08, 0.12, 0x2a3420, 0, by + W * 0.45, -L * 0.45 + i * L * 0.12);
  }
  const m = new THREE.Mesh(body.build(), VEH_MAT); m.castShadow = true; g.add(m);
  // legs swing from the hips
  const legs = [];
  if (S.leg > 0.01) for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const lp = new Part(); lp.box(W * 0.22, H + 0.05, W * 0.22, c, 0, -H / 2, 0); lp.box(W * 0.24, Math.min(0.12, H * 0.2), W * 0.26, S.hop ? c : 0x2a2420, 0, -H, 0);
    const lm = new THREE.Mesh(lp.build(), VEH_MAT); lm.castShadow = true;
    const piv = new THREE.Group(); piv.position.set(x * W * 0.33, H + 0.02, z * L * 0.36); piv.add(lm); g.add(piv); legs.push(piv);
  }
  scene.add(g);
  return { g, legs, body: m };
}

// ---------- placing ----------
function animalSpotOk(x, z, S) {
  if (Math.abs(x) > EDGE - 40 || Math.abs(z) > EDGE - 40) return false;
  const water = waterDepth(x, z);
  if (S.swim) return water > 1.2;
  if (water > 0.2) return false;
  for (const t of TEAMS) if (Math.hypot(x - BASES[t].x, z - BASES[t].z) < 70) return false;
  for (const p of POINTS_DEF) if (Math.hypot(x - p.x, z - p.z) < 35) return false;
  if (typeof blockedAt === 'function' && blockedAt(x, z, heightAt(x, z), 0.8, true)) return false;
  if (SNOW && heightAt(x, z) > 70) return false;
  return true;
}
function spawnHerd(kind) {
  const S = SPECIES[kind];
  let cx = 0, cz = 0, ok = false;
  for (let k = 0; k < 60 && !ok; k++) {
    if (S.swim) { const L = typeof waterSpots === 'function' ? waterSpots() : LAKES; if (!L.length) return; const W = L[Math.floor(Math.random() * L.length)]; const a = rand(0, 6.28), r = rand(0, (W.r || 10) * 0.7); cx = W.x + Math.cos(a) * r; cz = W.z + Math.sin(a) * r; }
    else { cx = rand(-EDGE + 60, EDGE - 60); cz = rand(-EDGE + 60, EDGE - 60); }
    ok = animalSpotOk(cx, cz, S);
  }
  if (!ok) return;
  const n = Math.floor(rand(S.herd[0], S.herd[1] + 0.99));
  for (let i = 0; i < n; i++) {
    let x = cx + rand(-6, 6), z = cz + rand(-6, 6);
    if (!animalSpotOk(x, z, S)) { x = cx; z = cz; }
    const a = { kind, S, m: buildAnimal(kind), pos: new THREE.Vector3(x, 0, z), yaw: rand(0, 6.28), home: new THREE.Vector3(cx, 0, cz), state: 'idle', t: rand(0, 4), goal: null, phase: rand(0, 6), alive: true, deadT: 0, hp: S.len > 1.2 ? 3 : 1 };
    a.pos.y = animalY(a); animals.push(a);
  }
}
function animalY(a) { return a.S.swim ? WATER_Y - (a.S.duck ? 0.05 : 0.35) : heightAt(a.pos.x, a.pos.z); }
function buildAnimals() {
  const set = animalSet(), want = LITE ? 9 : 16;
  for (let i = 0; i < want; i++) spawnHerd(set.land[i % set.land.length]);
  for (let i = 0; i < (set.water.length ? (LITE ? 2 : 4) : 0); i++) spawnHerd(set.water[i % set.water.length]);
}

// ---------- behaviour ----------
function scareAnimals(x, z, r) { animalNoise.push({ x, z, r, t: simTime }); }
function animalHit(a, dmg) {
  if (!a.alive) return;
  a.hp -= dmg > 60 ? 3 : 1;
  burst(a.pos.clone().setY(a.pos.y + a.S.leg + a.S.w * 0.4), 6, 0x8a1a1a, 3, 0.4, 0.06);
  if (a.hp <= 0) { a.alive = false; a.deadT = 0; } else { a.state = 'flee'; a.t = rand(4, 7); a.fleeFrom = player.pos.clone(); }
}
function updateAnimals(dt) {
  if (!animals.length) return;
  while (animalNoise.length && simTime - animalNoise[0].t > 2) animalNoise.shift();
  const cam = camera.position;
  for (const a of animals) {
    const S = a.S;
    if (!a.alive) {
      a.deadT += dt;
      a.m.g.rotation.z = lerp(a.m.g.rotation.z, Math.PI / 2, Math.min(1, dt * 6));
      a.m.g.position.y = animalY(a) + S.w * 0.35;
      if (a.deadT > 30 && a.pos.distanceTo(cam) > 120) {   // a new one wanders in somewhere else later
        a.alive = true; a.hp = S.len > 1.2 ? 3 : 1; a.m.g.rotation.z = 0; a.state = 'idle';
        for (let k = 0; k < 30; k++) { const x = a.home.x + rand(-40, 40), z = a.home.z + rand(-40, 40); if (animalSpotOk(x, z, S)) { a.pos.set(x, 0, z); break; } }
      }
      continue;
    }
    const far = a.pos.distanceTo(cam) > 260;
    a.thinkT = (a.thinkT || 0) - dt;
    if (a.thinkT <= 0) {
      a.thinkT = far ? 1.2 : 0.3;
      // danger: soldiers close by, or a bang
      let dang = null;
      for (const c of chars) if (c.alive && !c.inactive && Math.abs(c.pos.x - a.pos.x) < S.flee && Math.abs(c.pos.z - a.pos.z) < S.flee && c.pos.distanceTo(a.pos) < S.flee) { dang = c.pos; break; }
      if (!dang) for (const v of gvehicles) if (v.alive && Math.abs(v.speed) > 2 && v.pos.distanceTo(a.pos) < S.flee * 1.6) { dang = v.pos; break; }
      if (!dang) for (const nz of animalNoise) if (Math.hypot(nz.x - a.pos.x, nz.z - a.pos.z) < nz.r) { dang = new THREE.Vector3(nz.x, 0, nz.z); break; }
      if (dang) { a.state = 'flee'; a.t = rand(3, 6); a.fleeFrom = dang.clone(); }
    }
    a.t -= dt;
    let sp = 0, want = null;
    if (a.state === 'flee') {
      sp = S.run; want = Math.atan2(a.pos.x - a.fleeFrom.x, a.pos.z - a.fleeFrom.z);
      if (a.t <= 0) { a.state = 'idle'; a.t = rand(2, 5); a.home.copy(a.pos); }
    } else if (a.state === 'walk') {
      sp = S.speed;
      if (!a.goal || Math.hypot(a.goal.x - a.pos.x, a.goal.z - a.pos.z) < 1 || a.t <= 0) { a.state = 'idle'; a.t = rand(2, 7); }
      else want = Math.atan2(a.goal.x - a.pos.x, a.goal.z - a.pos.z);
    } else if (a.t <= 0) {
      a.state = 'walk'; a.t = rand(5, 12);
      a.goal = new THREE.Vector3(a.home.x + rand(-25, 25), 0, a.home.z + rand(-25, 25));
    }
    if (want !== null && sp > 0) {
      a.yaw += wrapAngle(want - a.yaw) * Math.min(1, dt * (a.state === 'flee' ? 6 : 2.5));
      const nx = a.pos.x + Math.sin(a.yaw) * sp * dt, nz = a.pos.z + Math.cos(a.yaw) * sp * dt;
      if (animalSpotOk(nx, nz, S) || (S.swim ? waterDepth(nx, nz) > 1 : (waterDepth(nx, nz) < 0.2 && Math.abs(nx) < EDGE - 30 && Math.abs(nz) < EDGE - 30 && !blockedAt(nx, nz, heightAt(nx, nz), 0.5, true)))) { a.pos.x = nx; a.pos.z = nz; }
      else { a.yaw += rand(1.5, 3); if (a.state === 'walk') a.goal = null; }
    }
    if (far) { a.m.g.visible = a.pos.distanceTo(cam) < 520; a.m.g.position.set(a.pos.x, animalY(a), a.pos.z); a.m.g.rotation.y = a.yaw; continue; }
    a.m.g.visible = true;
    // animate: legs swing with speed, hoppers bounce, grazers dip their heads while idle
    a.phase += dt * (sp > 0 ? 4 + sp * 1.2 : 0);
    let y = animalY(a);
    if (S.hop && sp > 0) y += Math.abs(Math.sin(a.phase * 0.8)) * (0.15 + sp * 0.03);
    if (S.swim) y += Math.sin(simTime * 2 + a.phase) * 0.03;
    a.m.g.position.set(a.pos.x, y, a.pos.z); a.m.g.rotation.y = a.yaw;
    const sw = sp > 0 ? Math.sin(a.phase) * Math.min(0.7, 0.25 + sp * 0.05) : 0;
    a.m.legs.forEach((l, i) => { l.rotation.x = S.hop ? (sp > 0 ? (i < 2 ? -1 : 1) * Math.abs(Math.sin(a.phase * 0.8)) * 0.6 : 0) : (i === 0 || i === 3 ? sw : -sw); });
    a.m.body.rotation.x = a.state === 'idle' && !S.swim && !S.low ? Math.max(0, Math.sin(simTime * 0.7 + a.phase)) * 0.12 : 0;
  }
}
// bullets: a quick sphere test per animal
function animalRay(origin, dir, maxD) {
  let best = null, bd = maxD;
  for (const a of animals) {
    if (!a.alive || !a.m.g.visible) continue;
    const c = _anC.set(a.pos.x, a.m.g.position.y + a.S.leg + a.S.w * 0.4, a.pos.z), r = Math.max(0.25, Math.max(a.S.w, a.S.len * 0.5) * 0.75);
    const t = raySphere(origin, dir, c, r);
    if (t !== null && t < bd) { bd = t; best = a; }
  }
  return best ? { a: best, dist: bd } : null;
}
const _anC = new THREE.Vector3();

// this file loads after the world is built, so let the animals out now
buildAnimals();
