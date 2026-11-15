// ===================== bunker.js : underground bunkers =====================
const bunkers = [];
const bunkerLight = new THREE.PointLight(0xffe2b0, 0, 28, 1.2); scene.add(bunkerLight);
const B_DEPTH = 8, B_TRENCH = 26, B_TW = 3.4, B_CEIL = 3.4;
const DIRS4 = [[0, 1], [0, -1], [1, 0], [-1, 0]];
function bW(b, u, v) { return { x: b.x + b.dx * u + b.dz * v, z: b.z + b.dz * u - b.dx * v }; }   // local (u along, v across) to world
// pick flat spots near the control points (done before the terrain is built, so every computer picks the same ones)
function chooseBunkerSites() {
  const order = ['A', 'B', 'D', 'E', 'F', 'G', 'C'];
  for (const name of order) {
    const P = PD[name];
    let found = null;
    for (const dist of [62, 80, 98, 116, 134, 152]) {
      for (let k = 0; k < 12 && !found; k++) {
        const a = k * Math.PI / 6 + 0.3, cx = P.x + Math.cos(a) * dist, cz = P.z + Math.sin(a) * dist;
        for (const [dx, dz] of DIRS4) {
          const b = { x: cx - dx * 14, z: cz - dz * 14, dx, dz };
          if (siteOk(b)) { found = b; break; }
        }
      }
      if (found) break;
    }
    if (found && bunkers.length < 7) { found.name = name; found.H = rawHeight(found.x, found.z); found.F = found.H - B_DEPTH; bunkers.push(found); }
  }
  for (const b of bunkers) {
    const s = bW(b, -B_TRENCH, 0);
    FLATS.push({ ramp: true, x: s.x, z: s.z, dx: b.dx, dz: b.dz, len: B_TRENCH, hw: B_TW + 0.4, fade: 3.5, h0: rawHeight(s.x, s.z), h1: b.F });
    const c = bW(b, 12, 0);
    settlements.push({ x: c.x, z: c.z, r: 26 }); const t = bW(b, -13, 0); settlements.push({ x: t.x, z: t.z, r: 16 });
  }
}
function siteOk(b) {
  const H = rawHeight(b.x, b.z);
  if (H < 2.5 || H > 24) return false;
  if (bunkers.some(o => Math.hypot(o.x - b.x, o.z - b.z) < 110)) return false;
  for (let u = -B_TRENCH - 4; u <= 32; u += 4) for (let v = -19; v <= 19; v += 4) {
    if (u < 0 && Math.abs(v) > 7) continue;
    const p = bW(b, u, v), h = rawHeight(p.x, p.z);
    if (Math.abs(p.x) > EDGE - 30 || Math.abs(p.z) > EDGE - 30) return false;
    if (pathDist(p.x, p.z) < 6) return false;
    if (u >= 0 ? (h < H - 3 || h > H + 7) : Math.abs(h - H) > 4) return false;
    for (const q of POINTS_DEF) if (Math.hypot(p.x - q.x, p.z - q.z) < 38) return false;
    for (const s of settlements) if (Math.hypot(p.x - s.x, p.z - s.z) < s.r + 4) return false;
    for (const t of TEAMS) { if (Math.hypot(p.x - BASES[t].x, p.z - BASES[t].z) < 75) return false; const r = RUNWAYS[t]; if (r && Math.abs(p.x - r.x) < r.len / 2 + 25 && Math.abs(p.z - r.z) < r.wid / 2 + 25) return false; }
    for (const L of LAKES) if (Math.hypot(p.x - L.x, p.z - L.z) < L.r + 26) return false;
  }
  return true;
}
const BMAT = {
  wall: new THREE.MeshLambertMaterial({ color: 0x8a8a84, map: texRepeat(TEX.concrete, 3, 1), emissive: 0x2a2924 }),
  floor: new THREE.MeshLambertMaterial({ color: 0x5b5d5a, map: texRepeat(TEX.concrete, 6, 6), emissive: 0x1e1e1c }),
  ceil: new THREE.MeshLambertMaterial({ color: 0x4a4b49, emissive: 0x1a1a18 }),
  light: new THREE.MeshBasicMaterial({ color: 0xfff1c0 }), red: new THREE.MeshBasicMaterial({ color: 0xff3030 }),
  green: new THREE.MeshLambertMaterial({ color: 0x3f5a2e }), gold: new THREE.MeshBasicMaterial({ color: 0xffcc33 }),
  bed: new THREE.MeshLambertMaterial({ color: 0x55603f }), steel: MATS.steel,
};
// a box given in bunker coordinates
function lbox(b, u0, u1, v0, v1, y0, y1, mat, solid = true) {
  const p0 = bW(b, u0, v0), p1 = bW(b, u1, v1);
  const minX = Math.min(p0.x, p1.x), maxX = Math.max(p0.x, p1.x), minZ = Math.min(p0.z, p1.z), maxZ = Math.max(p0.z, p1.z);
  if (!solid) return addMesh(new THREE.BoxGeometry(maxX - minX, y1 - y0, maxZ - minZ), mat, (minX + maxX) / 2, (y0 + y1) / 2, (minZ + maxZ) / 2);
  return addBlock((minX + maxX) / 2, (minZ + maxZ) / 2, maxX - minX, y1 - y0, maxZ - minZ, mat, { y: y0 });
}
function underVolume(b, u0, u1, v0, v1) {
  const p0 = bW(b, u0, v0), p1 = bW(b, u1, v1);
  UNDER.push({ minX: Math.min(p0.x, p1.x), maxX: Math.max(p0.x, p1.x), minZ: Math.min(p0.z, p1.z), maxZ: Math.max(p0.z, p1.z), floor: b.F, ceil: b.F + B_CEIL, h: B_CEIL, bunker: b });
}
function buildBunkers() {
  for (const b of bunkers) {
    const F = b.F, C = F + B_CEIL, top = b.H + 0.8, h0 = FLATS.find(f => f.ramp && Math.abs(f.h1 - F) < 0.01).h0;
    // trench walls, stepping down with the ramp
    for (let i = 0; i < 4; i++) {
      const u0 = -B_TRENCH + i * 6.5, u1 = u0 + 6.5, low = lerp(h0, F, (u1 + B_TRENCH) / B_TRENCH) - 0.6;
      lbox(b, u0, u1, B_TW, B_TW + 0.6, low, top, BMAT.wall); lbox(b, u0, u1, -B_TW - 0.6, -B_TW, low, top, BMAT.wall);
    }
    // entrance face with a door
    lbox(b, -0.2, 0.8, -7, -1.8, F - 0.5, top + 0.6, BMAT.wall); lbox(b, -0.2, 0.8, 1.8, 7, F - 0.5, top + 0.6, BMAT.wall);
    lbox(b, -0.2, 0.8, -1.8, 1.8, F + 3.0, top + 0.6, BMAT.wall);
    lbox(b, -1.2, -0.2, -2.2, 2.2, F + 3.0, F + 3.2, BMAT.ceil, false);
    lbox(b, -0.3, -0.2, -0.3, 0.3, F + 3.25, F + 3.5, BMAT.red, false);
    // corridor
    lbox(b, 0.8, 10, -2.4, 2.4, F - 0.4, F, BMAT.floor); lbox(b, 0.8, 10, -2.6, 2.6, C, C + 0.4, BMAT.ceil);
    lbox(b, 0.8, 10, 2, 2.6, F, C, BMAT.wall); lbox(b, 0.8, 10, -2.6, -2, F, C, BMAT.wall);
    // main hall
    lbox(b, 10, 28, -9.6, 9.6, F - 0.4, F, BMAT.floor); lbox(b, 9.4, 28.6, -9.6, 9.6, C, C + 0.4, BMAT.ceil);
    lbox(b, 9.4, 10, -9.6, -2, F, C, BMAT.wall); lbox(b, 9.4, 10, 2, 9.6, F, C, BMAT.wall);
    for (const s of [1, -1]) {
      const vi = s > 0 ? [9, 9.6] : [-9.6, -9], vo = s > 0 ? [17, 17.6] : [-17.6, -17], vr = s > 0 ? [9.6, 17] : [-17, -9.6];
      lbox(b, 10, 16, vi[0], vi[1], F, C, BMAT.wall); lbox(b, 20, 28, vi[0], vi[1], F, C, BMAT.wall);
      // side room
      lbox(b, 13, 23, vr[0], vr[1], F - 0.4, F, BMAT.floor); lbox(b, 12.4, 23.6, Math.min(vr[0], vo[0]), Math.max(vr[1], vo[1]), C, C + 0.4, BMAT.ceil);
      lbox(b, 13, 23, vo[0], vo[1], F, C, BMAT.wall); lbox(b, 12.4, 13, vr[0], vr[1], F, C, BMAT.wall); lbox(b, 23, 23.6, vr[0], vr[1], F, C, BMAT.wall);
      underVolume(b, 12.6, 23.4, s > 0 ? 8.6 : -17, s > 0 ? 17 : -8.6);
    }
    underVolume(b, -1.2, 10.6, -2, 2); underVolume(b, 9.8, 28, -9.2, 9.2);
    // lights
    for (const u of [4, 8]) lbox(b, u - 0.4, u + 0.4, -0.4, 0.4, C - 0.08, C, BMAT.light, false);
    for (const u of [14, 19, 24]) for (const v of [-5, 5]) lbox(b, u - 0.5, u + 0.5, v - 0.3, v + 0.3, C - 0.08, C, BMAT.light, false);
    for (const s of [1, -1]) lbox(b, 17.6, 18.4, s * 13 - 0.3, s * 13 + 0.3, C - 0.08, C, BMAT.light, false);
    // furniture: map table, crates, bunk beds
    lbox(b, 17, 21, -1.5, 1.5, F, F + 0.9, MATS.darkWood);
    lbox(b, 17.3, 20.7, -1.2, 1.2, F + 0.9, F + 0.93, new THREE.MeshLambertMaterial({ color: 0xd8c9a0 }), false);
    for (const [u, v] of [[26, -7], [26, -5.8], [11.5, 7], [26, 7]]) lbox(b, u - 0.5, u + 0.5, v - 0.5, v + 0.5, F, F + 1, MATS.crate);
    lbox(b, 25.6, 26.4, -6.9, -5.9, F + 1, F + 2, MATS.crate);
    for (let i = 0; i < 3; i++) {
      const u = 14.5 + i * 3;
      lbox(b, u - 0.6, u + 0.6, -16.6, -14.2, F + 0.4, F + 0.6, BMAT.bed); lbox(b, u - 0.6, u + 0.6, -16.6, -14.2, F + 1.6, F + 1.8, BMAT.bed);
      for (const [du, dv] of [[-0.55, -16.5], [0.55, -16.5], [-0.55, -14.3], [0.55, -14.3]]) lbox(b, u + du - 0.05, u + du + 0.05, dv - 0.05, dv + 0.05, F, F + 1.85, BMAT.steel, false);
    }
    // supply room: ammo, medical, and a cache with money
    const am = bW(b, 15, 15.5), md = bW(b, 21, 15.5), ca = bW(b, 18, 16.2);
    lbox(b, 14.4, 15.6, 15, 16.2, F, F + 0.8, MATS.olive); lbox(b, 14.4, 15.6, 15, 16.2, F + 0.8, F + 0.9, BM.yellow, false);
    lbox(b, 20.5, 21.5, 15, 16.2, F, F + 1.1, MATS.white);
    lbox(b, 20.8, 21.2, 14.98, 15, F + 0.6, F + 0.75, BM.crossRed, false); lbox(b, 20.93, 21.07, 14.98, 15, F + 0.45, F + 0.9, BM.crossRed, false);
    lbox(b, 17.3, 18.7, 15.6, 16.8, F, F + 0.8, BMAT.green); lbox(b, 17.3, 18.7, 15.6, 16.8, F + 0.8, F + 0.95, BMAT.gold, false);
    b.ammo = { x: am.x, z: am.z }; b.med = { x: md.x, z: md.z }; b.cache = { x: ca.x, z: ca.z }; b.cacheT = 0; b.found = false;
    const mid = bW(b, 18, 0); b.cx = mid.x; b.cz = mid.z;
    // a sign post at the top of the trench
    const sp = bW(b, -B_TRENCH - 1.5, B_TW + 1.5);
    addMesh(new THREE.BoxGeometry(0.15, 2.2, 0.15), MATS.darkWood, sp.x, heightAt(sp.x, sp.z) + 1.1, sp.z);
    const sign = addMesh(new THREE.BoxGeometry(1.6, 0.6, 0.08), new THREE.MeshLambertMaterial({ map: signTex() }), sp.x, heightAt(sp.x, sp.z) + 2.1, sp.z);
    sign.rotation.y = Math.atan2(b.dx, b.dz) + Math.PI; sign.userData.static = false;
  }
}
let _signTex = null;
function signTex() {
  if (_signTex) return _signTex;
  _signTex = canvasTex(128, 48, (g) => { g.fillStyle = '#3b2a1a'; g.fillRect(0, 0, 128, 48); g.fillStyle = '#ffd54f'; g.font = 'bold 26px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BUNKER', 64, 25); });
  _signTex.magFilter = THREE.LinearFilter; return _signTex;
}
// supplies inside bunkers (any team can use them)
function bunkerEffects(dt) {
  if (!player.alive || player.vehicle || player.gv) return;
  const u = undergroundAt(player.pos.x, player.pos.z, player.pos.y);
  if (!u) return;
  const b = u.bunker;
  if (!b) return;
  if (!b.found) {
    b.found = true; SFX.capture(0.5);
    showMessage(b.tunnel ? 'You\'re in the tunnels! They link every bunker, the HQ under C and ladder hatches.' : b.isHub ? 'Underground HQ: ammo, medkits and a supply cache' : 'You found an underground bunker! Bombs and planes can\'t hurt you down here.', 3.5);
  }
  if (!b.med) return;
  if (Math.hypot(player.pos.x - b.med.x, player.pos.z - b.med.z) < 3 && player.hp < 100) { player.hp = Math.min(100, player.hp + 15 * dt); if (Math.random() < dt * 3) burst(player.chest(), 1, 0x44ff66, 1, 0.6, 0.06); }
  if (Math.hypot(player.pos.x - b.ammo.x, player.pos.z - b.ammo.z) < 2.8) {
    player.ammoT = (player.ammoT || 0) - dt;
    if (player.ammoT <= 0) {
      player.ammoT = 1; let any = false;
      WEAPONS.forEach(w => { const a = player.ammo[w.id]; if (a.reserve < w.reserve) { a.reserve = Math.min(w.reserve, a.reserve + w.mag); any = true; } });
      if (player.grenades < 3) { player.grenades++; any = true; }
      if (any) showMessage('Resupplying ammo...', 0.8);
    }
  }
}
function openCache(b) {
  if (simTime < b.cacheT) { showMessage(`The cache is empty. It refills in ${Math.ceil(b.cacheT - simTime)} seconds`, 2); return; }
  b.cacheT = simTime + 120;
  addMoney(250, 'Bunker cache'); SFX.cash();
  player.grenades += 2; WEAPONS.forEach(w => { player.ammo[w.id].reserve = w.reserve; });
  if (Math.random() < 0.5) { player.armor = 100; showMessage('Cache: $250, grenades, full ammo and body armor!', 3); }
  else showMessage('Cache: $250, grenades and full ammo!', 3);
}

let _ugDim = 0;
function updateBunkerLight() {
  const ug = undergroundAt(camera.position.x, camera.position.z, camera.position.y - 1.7);
  bunkerLight.intensity = ug ? 1.7 : 0;
  // daylight fades out when you go underground
  _ugDim += ((ug ? 1 : 0) - _ugDim) * 0.12;
  hemiLight.intensity = 0.62 * (1 - _ugDim * 0.6); sunLight.intensity = 0.95 * (1 - _ugDim * 0.8);
  if (ug) bunkerLight.position.set(camera.position.x, underCeil(ug, camera.position.x, camera.position.z) - 0.4, camera.position.z);
}
