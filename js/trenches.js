// ===================== trenches.js : sniper trenches =====================
// Short dug-in trenches on high ground that look over the control points. A sandbag wall faces the
// point with gaps along the top: crouch and you are hidden, stand up and you can shoot through the gaps.
// Half of each trench has a camo net over it so planes have a harder time spotting you.
// Computer snipers go to them, peek out to shoot, and duck back down.
const NESTS = [];
const N_LEN = 16, N_DIG = 1.4;

// picked before the terrain is built (like the bunkers), so every computer picks the same spots
function chooseNestSites() {
  const AX = [[1, 0], [0, 1]];
  const order = SNOW ? ['C', 'B', 'D', 'A', 'E', 'F', 'G'] : ['C', 'A', 'E', 'B', 'D', 'F', 'G'];
  for (const name of order) {
    const P = PD[name]; if (!P) continue;
    const ph = rawHeight(P.x, P.z);
    const cands = [];
    for (const dist of [50, 62, 75, 88, 100, 112]) for (let k = 0; k < 24; k++) {
      const a = k * Math.PI / 12 + dist * 0.01, x = P.x + Math.cos(a) * dist, z = P.z + Math.sin(a) * dist;
      // face the point along whichever axis points at it best (walls must line up with the map grid)
      const dxp = P.x - x, dzp = P.z - z;
      const n = Math.abs(dxp) > Math.abs(dzp) ? [Math.sign(dxp), 0] : [0, Math.sign(dzp)];
      const ax = n[0] ? AX[1] : AX[0];
      const s = nestScore(x, z, ax, n, P, ph);
      if (s > -1e8) cands.push({ x, z, ax, n, s, a, name });
    }
    cands.sort((p, q) => q.s - p.s);
    let made = 0;
    for (const c of cands) {
      if (made >= 2 || NESTS.length >= 11) break;
      if (NESTS.some(o => Math.hypot(o.x - c.x, o.z - c.z) < 70)) continue;
      if (made === 1 && NESTS.some(o => o.name === name && Math.abs(wrapAngle(o.a - c.a)) < 1.8)) continue;   // the second one looks from a different side
      NESTS.push(c); made++;
    }
  }
  for (const t of NESTS) {
    t.H = Math.max(rawHeight(t.x, t.z), 1.2);
    FLATS.push({ ramp: true, x: t.x - t.ax[0] * (N_LEN / 2 + 1), z: t.z - t.ax[1] * (N_LEN / 2 + 1), dx: t.ax[0], dz: t.ax[1], len: N_LEN + 2, hw: 2.2, fade: 2.8, h0: t.H - N_DIG, h1: t.H - N_DIG });
    settlements.push({ x: t.x, z: t.z, r: N_LEN / 2 + 5 });     // keeps trees and houses off it
  }
}
function nestScore(x, z, ax, n, P, ph) {
  if (Math.abs(x) > EDGE - 40 || Math.abs(z) > EDGE - 40) return -1e9;
  const H = rawHeight(x, z);
  if (H < 1.5 || (SNOW ? H > ph + 45 : H > ph + 22)) return -1e9;
  // the trench and a bit around it must be fairly flat, dry, off roads and away from buildings and bases
  let lo = 1e9, hi = -1e9;
  for (let u = -N_LEN / 2 - 3; u <= N_LEN / 2 + 3; u += 3) for (let v = -4; v <= 4; v += 2) {
    const px = x + ax[0] * u + n[0] * v, pz = z + ax[1] * u + n[1] * v, h = rawHeight(px, pz);
    lo = Math.min(lo, h); hi = Math.max(hi, h);
    if (pathDist(px, pz) < 6) return -1e9;
    if (inRunwayZone(px, pz, 10)) return -1e9;
  }
  if (hi - lo > (SNOW ? 5 : 3.2)) return -1e9;
  for (const L of LAKES) if (Math.hypot(x - L.x, z - L.z) < L.r + 16) return -1e9;
  for (const t of TEAMS) if (Math.hypot(x - BASES[t].x, z - BASES[t].z) < 70) return -1e9;
  for (const b of bunkers) if (Math.hypot(x - b.x, z - b.z) < 45) return -1e9;
  for (const q of POINTS_DEF) if (Math.hypot(x - q.x, z - q.z) < 42) return -1e9;
  for (const s of settlements) if (Math.hypot(x - s.x, z - s.z) < s.r * 0.75) return -1e9;
  if (SNOW && Math.hypot(x, z) < 95) return -1e9;   // keep out of the big base in the middle
  // it must actually see the point
  const e = H + 1.5, pt = ph + 1.4, d = Math.hypot(P.x - x, P.z - z);
  for (let i = 2; i < 24; i++) { const f = i / 24, gx = lerp(x, P.x, f), gz = lerp(z, P.z, f); if (rawHeight(gx, gz) > lerp(e, pt, f) - 0.4) return -1e9; }
  return (H - ph) * 2.2 - Math.abs(d - 80) * 0.15 - (hi - lo) * 2;
}

// ---------- building ----------
function buildNests() {
  if (!NESTS.length) return;
  const bagCol = SNOW ? 0xe4e8ea : DESERT ? 0xcdb07a : 0xb9a06a, dirtCol = SNOW ? 0xf0f3f6 : DESERT ? 0xc49a62 : 0x6a5236;
  const bagMat = new THREE.MeshLambertMaterial({ color: bagCol, map: TEX.sandbag ? texRepeat(TEX.sandbag, 4, 1) : null });
    const plankMat = new THREE.MeshLambertMaterial({ color: SNOW ? 0x6e5440 : 0x7a5a38 });
  const netMat = new THREE.MeshLambertMaterial({ color: SNOW ? 0xdfe5e8 : DESERT ? 0xb59563 : 0x4f5f33, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
  for (const t of NESTS) {
    const F = heightAt(t.x, t.z);          // the dug floor
    t.floor = F;
    const ax = t.ax, n = t.n, along = ax[0] !== 0;
    const W = (l, th) => along ? [l, th] : [th, l];     // size along the trench / across it
    const at = (u, v) => [t.x + ax[0] * u + n[0] * v, t.z + ax[1] * u + n[1] * v];
    // earth banks the colour of the ground around them, so the trench looks dug in, not built on top
    const tc = terrainColor(t.x + n[0] * 5, t.z + n[1] * 5, t.H, 0.1).getHex();
    const dirtMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(tc).multiplyScalar(SNOW ? 0.97 : 0.88) });
    const dirtMat2 = new THREE.MeshLambertMaterial({ color: new THREE.Color(tc).multiplyScalar(SNOW ? 0.93 : 0.78) });
    const bank = (v0, v1, top, len, mat, solid = true) => { const [x, z] = at(0, (v0 + v1) / 2), [w, d] = W(len, Math.abs(v1 - v0)); return addBlock(x, z, w, top - (F - 0.8), d, mat, { y: F - 0.8, solid }); };
    // front: a high bank with sandbags on top (solid cover), and a lower step outside it
    bank(1.3, 2.5, F + 1.25, N_LEN + 1, dirtMat2);
    bank(2.5, 4.0, F + 0.75, N_LEN + 2, dirtMat, false);
    bank(4.0, 5.2, F + 0.25, N_LEN + 3, dirtMat, false);
    for (let u = -N_LEN / 2; u < N_LEN / 2; u += 2.6) {
      const [x, z] = at(u + 0.95, 1.85), [w, d] = W(1.9, 1.0);
      addBlock(x, z, w, 0.32, d, bagMat, { y: F + 1.25 });
    }
    // back: a low bank you can step over
    bank(-1.3, -2.4, F + 0.85, N_LEN - 5, dirtMat2, false);   // about ground level: walk straight over it into the trench
    bank(-2.4, -3.6, F + 0.35, N_LEN - 4, dirtMat, false);
    // wooden planks holding up the inside of the front wall, posts, and a duckboard floor
    const part = new Part();
    const pw = along ? [N_LEN, 1.2, 0.08] : [0.08, 1.2, N_LEN];
    { const [x, z] = at(0, 1.27); part.box(pw[0], pw[1], pw[2], 0x7a5a38, x - t.x, 0.6, z - t.z); }
    for (let u = -N_LEN / 2; u <= N_LEN / 2; u += 2) {
      const [x, z] = at(u, 1.25); part.box(0.16, 1.5, 0.16, 0x5a4028, x - t.x, 0.75, z - t.z);
      const [fx, fz] = at(u, 0); const fw = along ? [0.3, 0.06, 2.6] : [2.6, 0.06, 0.3]; part.box(fw[0], fw[1], fw[2], 0x8a6a44, fx - t.x, 0.05, fz - t.z);
    }
    // camo net on posts over half of the trench
    const s0 = t.s > 0 ? 1 : -1;
    for (const [u, v] of [[s0 * 1, 1.6], [s0 * 7.5, 1.6], [s0 * 1, -1.8], [s0 * 7.5, -1.8]]) { const [x, z] = at(u, v); part.cyl(0.06, 0.07, 2.4, 0x5a4028, x - t.x, 1.2, z - t.z); }
    // gear: ammo box, a sandbag rifle rest, a small field radio
    { const [x, z] = at(-s0 * 5.5, -1.1); part.box(0.8, 0.45, 0.5, 0x4b5a32, x - t.x, 0.25, z - t.z); part.box(0.82, 0.08, 0.52, 0x3a4628, x - t.x, 0.5, z - t.z); }
    { const [x, z] = at(-s0 * 2, 1.0); part.box(0.7, 0.25, 0.4, bagCol, x - t.x, 1.0, z - t.z); }
    { const [x, z] = at(-s0 * 6.6, -1.3); part.box(0.35, 0.45, 0.25, 0x3f4a3a, x - t.x, 0.25, z - t.z); part.cyl(0.015, 0.015, 0.9, 0x222222, x - t.x + 0.1, 0.9, z - t.z); }
    const pm = new THREE.Mesh(part.build(), VEH_MAT); pm.position.set(t.x, F, t.z); pm.castShadow = true; pm.receiveShadow = true; scene.add(pm);   // not merged: the merger drops the part colours
    // the net itself: a few sagging panels
    for (let i = 0; i < 3; i++) {
      const g = new THREE.PlaneGeometry(along ? 2.4 : 3.8, along ? 3.8 : 2.4); g.rotateX(-Math.PI / 2);
      const [x, z] = at(s0 * (1.6 + i * 2.2), -0.1), m = new THREE.Mesh(g, netMat);
      m.position.set(x, F + 2.25 - (i === 1 ? 0.15 : 0), z); m.rotation.z = along ? 0 : (i - 1) * 0.04; m.rotation.x = along ? (i - 1) * 0.04 : 0;
      m.receiveShadow = true; scene.add(m);
    }
    // a scruffy row of bushes or snow along the front so it blends in
    for (let u = -N_LEN / 2; u <= N_LEN / 2; u += 3) { const [x, z] = at(u + rand(-0.6, 0.6), 2.9 + rand(0, 0.6)); burstBush(x, z); }
    t.spots = [];
    for (let u = -N_LEN / 2 + 2; u <= N_LEN / 2 - 2; u += 3) { const [x, z] = at(u, 0.4); t.spots.push(new THREE.Vector3(x, F, z)); }
    t.by = null;
  }
}
function burstBush(x, z) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.5, 0.8), 0), new THREE.MeshLambertMaterial({ color: SNOW ? 0xf2f5f8 : DESERT ? 0x8a8a4a : 0x4a6a2e, flatShading: true }));
  m.position.set(x, heightAt(x, z) + 0.2, z); m.scale.y = 0.7; m.castShadow = true; m.userData.static = true; scene.add(m);
}

// ---------- soldiers ----------
function nestFree(t, n) { return !t.by || t.by === n || !t.by.alive || t.by.nest !== t || t.by.inactive; }
// called when a sniper picks where to go; returns true if it took a trench
function sniperTakeNest(n) {
  if (n.nest) { if (n.nest.by === n) n.nest.by = null; n.nest = null; }
  if (n.role !== 'sniper' || !NESTS.length || Math.random() < 0.15) return false;
  let best = null, bs = 1e9;
  for (const t of NESTS) {
    if (!nestFree(t, n)) continue;
    const d = Math.hypot(t.x - n.pos.x, t.z - n.pos.z); if (d > 320) continue;
    const P = PD[t.name], pt = points.find(p => p.name === t.name);
    if (!pt || (pt.flag && pt.flag.visible === false && WORLD.mode !== 'tdm')) continue;
    let s = d + rand(0, 60);
    if (pt.owner === n.team && Math.abs(pt.progress) >= 0.999 && foesIn(pt, n.team) === 0) s += 120;   // our point and quiet: less useful
    if (s < bs) { bs = s; best = t; }
  }
  if (!best) return false;
  n.nest = best; best.by = n; n.vehTarget = null; n.mountTarget = null;
  n.goalPoint = points.find(p => p.name === best.name) || n.goalPoint;
  n.goal = best.spots[Math.floor(Math.random() * best.spots.length)].clone();
  n.goalT = rand(80, 120); n.tplan = null; n.nestT = 0; n.nestStuck = 0;
  return true;
}
// walking to a trench from the front: go round the end of the sandbag wall instead of into it
function nestGoal(n, goal) {
  const t = n.nest; if (!t || !n.goal) return goal;
  const rx = n.pos.x - t.x, rz = n.pos.z - t.z;
  if (Math.hypot(rx, rz) > 40) return goal;
  const v = rx * t.n[0] + rz * t.n[1], u = rx * t.ax[0] + rz * t.ax[1];
  if (v > 0.9 && Math.abs(u) < N_LEN / 2 + 2.5) {
    const e = (u >= 0 ? 1 : -1) * (N_LEN / 2 + 3.5);
    return new THREE.Vector3(t.x + t.ax[0] * e - t.n[0] * 0.5, 0, t.z + t.ax[1] * e - t.n[1] * 0.5);
  }
  return n.goal;
}
// in the trench: peek out for a few seconds (stand), duck for a couple (crouch)
function nestStance(n, dt, tgt) {
  if (!n.nest || !n.goal) return false;
  if (Math.hypot(n.goal.x - n.pos.x, n.goal.z - n.pos.z) > 2.2) return false;
  n.nestStuck = 0; n.stuckT = 0;
  n.nestT = (n.nestT || 0) + dt;
  const cyc = n.nestT % 7;
  n.crouch = cyc > 4.6;
  if (!tgt) n.heading += wrapAngle(Math.atan2(n.nest.n[0], n.nest.n[1]) - n.heading) * Math.min(1, dt * 3);
  return true;
}
