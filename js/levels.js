// ===================== levels.js : Normandy beach, Germany 1944 and The Dam =====================
// Ground colours and the buildings for the three newer maps. The big shapes (beach, bluffs, gorge, dam crest)
// are in the terrain itself (core.js rawHeight), so soldiers and vehicles walk and drive on them properly.
// Everything placed here uses the seeded random numbers, so every player builds exactly the same map.
const G_GRID = [-150, -90, -30, 30, 90, 150];
const BERLIN_LANDMARK_BLOCKS = [[0, -60], [60, -60], [-120, -120], [-60, 60], [60, 60]];   // parliament, cathedral, flak tower   // the old town's street grid (Germany 1944)
const TOWN_R = 178;
function townStreetDist(x, z) {
  let m = Infinity;
  for (const g of G_GRID) { if (Math.abs(z) < TOWN_R) m = Math.min(m, Math.abs(x - g)); if (Math.abs(x) < TOWN_R) m = Math.min(m, Math.abs(z - g)); }
  return m;
}
function terrainColorLevel(x, z, h, slope) {
  const n = vnoise(x * 0.05, z * 0.05), nf = vnoise(x * 0.21 + 9, z * 0.21 - 3), pd = pathDist(x, z);
  let c;
  if (AFGHAN) {
    // dusty tan valley, grey-brown rock on the slopes, snow on the high peaks, green irrigated fields by the riverbed
    c = new THREE.Color().setRGB(0.66 + n * 0.08, 0.57 + n * 0.07, 0.43 + n * 0.05).multiplyScalar(0.9 + nf * 0.14);
    const wz = Math.sin(x * 0.006 + 1) * 80 + 60, wd = Math.abs(z - wz);
    if (wd < 9) c.lerp(new THREE.Color(0.72, 0.7, 0.64), smooth(9, 4, wd));                                           // pale stones of the dry riverbed
    else if (wd < 40 && vnoise(x * 0.03 + 5, z * 0.03) > 0.52 && h < 9) c.lerp(new THREE.Color(0.36 + nf * 0.06, 0.5, 0.22), 0.75);   // fields
    c.lerp(new THREE.Color(0.5 + nf * 0.05, 0.46 + nf * 0.05, 0.41), clamp((slope - 0.35) * 2.2 + (h - 30) / 40, 0, 0.85));   // rock
    if (h > 105) c.lerp(new THREE.Color(0.93, 0.94, 0.96), clamp((h - 105) / 12, 0, 1) * (slope > 1.5 ? 0.5 : 1));             // snow caps
    if (pd < 4.5) c.lerp(new THREE.Color(0.6, 0.52, 0.4), smooth(4.5, 1.5, pd));
    return c;
  }
  if (GERMANY) {
    c = new THREE.Color().setRGB(0.36 + n * 0.08, 0.41 + n * 0.08, 0.24 + n * 0.05).multiplyScalar(0.9 + nf * 0.14);   // tired late-war grass
    const fld = vnoise(x * 0.012 + 3, z * 0.012 - 6); if (fld > 0.6) c.lerp(new THREE.Color(0.52, 0.45, 0.3), 0.55);   // ploughed fields
    if (vnoise(x * 0.04 + 20, z * 0.04) > 0.72) c.lerp(new THREE.Color(0.3, 0.26, 0.2), 0.6);                          // shell holes and mud
    const r = Math.hypot(x, z);
    if (r < TOWN_R + 8) {
      c.lerp(new THREE.Color(0.47 + nf * 0.05, 0.44 + nf * 0.05, 0.4 + nf * 0.04), smooth(TOWN_R + 8, TOWN_R - 6, r));   // town ground: old paving
      const sd = townStreetDist(x, z); if (sd < 5) c.lerp(new THREE.Color(0.34, 0.33, 0.32).multiplyScalar(0.9 + nf * 0.2), smooth(5, 3.5, sd));   // cobbled streets
    }
    if (pd < 5) c.lerp(new THREE.Color(0.45, 0.38, 0.28), smooth(5, 2, pd));
  } else if (NORMANDY) {
    // farmland in a patchwork of fields, grassy bluffs, a wide sand beach, wet sand at the water
    const cell = Math.floor((x + 600) / 70) * 31 + Math.floor((z + 600) / 55) * 17, tone = (Math.sin(cell * 12.9898) * 43758.5453) % 1;
    c = new THREE.Color().setRGB(0.32 + n * 0.08, 0.5 + n * 0.08, 0.2 + n * 0.05).multiplyScalar(0.88 + Math.abs(tone) * 0.22);
    if (Math.abs(tone) > 0.7) c.lerp(new THREE.Color(0.62, 0.58, 0.32), 0.5);                                           // ripe fields
    if (slope > 0.45) c.lerp(new THREE.Color(0.42, 0.42, 0.3), clamp((slope - 0.45) * 2, 0, 0.8));                       // bluff faces
    if (z > 225) c.lerp(new THREE.Color(0.85 + nf * 0.05, 0.78 + nf * 0.05, 0.6), smooth(225, 240, z));                  // beach sand
    if (z > 318) c.lerp(new THREE.Color(0.62, 0.56, 0.42), smooth(318, 338, z));                                       // wet sand
    if (h < WATER_Y) c.lerp(new THREE.Color(0.46, 0.5, 0.42), 0.6);
    if (pd < 4.5 && z < 236) c.lerp(new THREE.Color(0.55, 0.47, 0.33), smooth(4.5, 1.5, pd));
  } else {   // The Dam
    c = new THREE.Color().setRGB(0.3 + n * 0.08, 0.45 + n * 0.08, 0.22 + n * 0.05).multiplyScalar(0.9 + nf * 0.14);
    const rock = new THREE.Color().setRGB(0.42 + nf * 0.08, 0.4 + nf * 0.07, 0.37 + nf * 0.06);
    c.lerp(rock, clamp(Math.max((slope - 0.5) * 2.5, (h - 30) / 14), 0, 1));
    if (h > 26 && slope < 0.7) c.lerp(new THREE.Color(0.28, 0.4, 0.22), 0.45 * (1 - slope));   // grassy ledges on the mountains                                           // grey granite cliffs
    if (h < -6 && z > -54 && z < 140) c.lerp(new THREE.Color(0.5, 0.47, 0.42), 0.7);                                   // gravel on the gorge floor
    if (h < WATER_Y - 0.5) c.lerp(new THREE.Color(0.32, 0.34, 0.3), 0.7);
    if (h > 66) c.lerp(new THREE.Color(0.94, 0.95, 0.97), clamp((h - 66) / 6, 0, 1));                                  // snow on the peaks
    if (pd < 4.5) c.lerp(new THREE.Color(0.4, 0.4, 0.4), smooth(4.5, 1.5, pd));                                       // tarmac roads
  }
  return c;
}

// ---------- building helpers ----------
const LV = {
  stone: new THREE.MeshLambertMaterial({ color: 0x9a948a }), plaster: new THREE.MeshLambertMaterial({ color: 0xcfc4ad }),
  concrete: new THREE.MeshLambertMaterial({ color: 0xa9aaa5 }), dark: new THREE.MeshLambertMaterial({ color: 0x1b1c1e }),
  hedge: new THREE.MeshLambertMaterial({ color: 0x3e5a2a }), hidden: new THREE.MeshBasicMaterial({ visible: false }),
  rail: new THREE.MeshLambertMaterial({ color: 0x5a5e62 }), rust: new THREE.MeshLambertMaterial({ color: 0x5a3e2c }),
};
function lvFree(x, z, r) {   // away from roads, points and bases
  if (pathDist(x, z) < r + 3) return false;
  for (const p of POINTS_DEF) if (Math.hypot(x - p.x, z - p.z) < 20 + r) return false;
  for (const t of TEAMS) if (Math.hypot(x - BASES[t].x, z - BASES[t].z) < 40 + r) return false;
  if (inRunwayZone(x, z, r + 4)) return false;
  return true;
}
// a pile of broken stone and timber: a low solid lump to hide behind, with loose blocks on top
function rubble(x, z, s = 1) {
  const p = new Part(), gy = heightAt(x, z);
  for (let i = 0; i < 9; i++) p.box(rand(0.6, 1.8) * s, rand(0.3, 0.9) * s, rand(0.6, 1.6) * s, pick([0x8a847a, 0x7a746c, 0x9c8f7c, 0x6b4a32]), rand(-1.6, 1.6) * s, rand(0.1, 0.9) * s, rand(-1.6, 1.6) * s, rand(-0.5, 0.5), rand(0, 3), rand(-0.5, 0.5));
  const m = new THREE.Mesh(p.build(), VEH_MAT); m.position.set(x, gy, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  addBlock(x, z, 2.6 * s, 0.9 * s, 2.6 * s, LV.hidden);
}
// a ruined house: broken outer walls of different heights, no roof, rubble inside
function ruinedHouse(x, z, w, d) {
  const mat = Math.random() < 0.5 ? MATS.brick : LV.stone, t = 0.7;
  const side = (cx, cz, len, alongX) => {
    let a = -len / 2;
    while (a < len / 2 - 0.5) {
      const seg = Math.min(rand(1.5, 4), len / 2 - a), mid = a + seg / 2;
      if (Math.random() > 0.22) { const hh = rand(1.2, 7); alongX ? addBlock(cx + mid, cz, seg, hh, t, mat) : addBlock(cx, cz + mid, t, hh, seg, mat); }   // gaps are blown-out holes
      a += seg;
    }
  };
  side(x, z - d / 2, w, true); side(x, z + d / 2, w, true); side(x - w / 2, z, d, false); side(x + w / 2, z, d, false);
  rubble(x + rand(-1, 1), z + rand(-1, 1), rand(0.9, 1.3));
}
// a Czech hedgehog: three steel beams crossed, the classic beach obstacle
let _hedgeGeo = null;
function hedgehog(x, z) {
  if (!_hedgeGeo) { const p = new Part(); for (const [rx, ry, rz] of [[0, 0, 0.78], [0, Math.PI / 2, 0.78], [Math.PI / 2, 0, 0]]) p.box(2.6, 0.22, 0.22, 0x3a3634, 0, 0.75, 0, rx, ry, rz); _hedgeGeo = p.build(); }
  const m = new THREE.Mesh(_hedgeGeo, VEH_MAT); m.position.set(x, heightAt(x, z), z); m.rotation.y = rand(0, 3); m.castShadow = true; scene.add(m);
  addBlock(x, z, 1.4, 1.3, 1.4, LV.hidden);
}
// a concrete bunker with a dark firing slit, facing the beach (south)
function casemate(x, z) {
  addBlock(x, z, 11, 4.2, 8, LV.concrete);
  const gy = heightAt(x, z + 4.1);
  addMesh(new THREE.BoxGeometry(6, 0.7, 0.3), LV.dark, x, gy + 2.3, z + 4.05, false);
  addMesh(new THREE.BoxGeometry(12, 0.5, 9), LV.concrete, x, heightAt(x, z) + 4.4, z, true);   // overhanging roof
}

// ---------- the three maps ----------
function buildLevelExtras() {
  if (GERMANY) buildGermany();
  if (NORMANDY) buildNormandy();
  if (DAM) buildDam();
  if (AFGHAN) buildAfghan();
  if (GERMANY || NORMANDY) buildIntensity();
}
function buildGermany() {
  // the old town: blocks of tall houses along a cobbled street grid; about a third are bombed-out ruins
  for (let i = 0; i < G_GRID.length + 1; i++) for (let j = 0; j < G_GRID.length + 1; j++) {
    const x0 = i ? G_GRID[i - 1] : -TOWN_R, x1 = i < G_GRID.length ? G_GRID[i] : TOWN_R, z0 = j ? G_GRID[j - 1] : -TOWN_R, z1 = j < G_GRID.length ? G_GRID[j] : TOWN_R;
    if (x1 - x0 < 20 || z1 - z0 < 20) continue;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (Math.hypot(cx, cz) > TOWN_R - 10) continue;
    if (BERLIN_LANDMARK_BLOCKS.some(([lx, lz]) => Math.abs(cx - lx) < 5 && Math.abs(cz - lz) < 5)) continue;   // a landmark stands here
    if (Math.abs(cx) < 5 && Math.abs(cz) < 5) {   // the town square: a fountain, rubble, and the church on its north side
      rubble(-14, 12); rubble(15, -10, 1.2); rubble(-6, -20);
      continue;
    }
    // houses round the edge of the block, facing the streets
    for (const [ax, az, len, alongX] of [[cx, z0 + 7, x1 - x0 - 12, true], [cx, z1 - 7, x1 - x0 - 12, true], [x0 + 7, cz, z1 - z0 - 26, false], [x1 - 7, cz, z1 - z0 - 26, false]]) {
      let a = -len / 2;
      while (a < len / 2 - 6) {
        const w = Math.min(rand(8, 11.5), len / 2 - a); if (w < 6) break;
        const hx = alongX ? ax + a + w / 2 : ax, hz = alongX ? az : az + a + w / 2;
        a += w + 0.4;
        if (!lvFree(hx, hz, 3) && pathDist(hx, hz) < 6) continue;
        let near = false; for (const p of POINTS_DEF) if (Math.hypot(hx - p.x, hz - p.z) < 24) near = true; if (near) continue;
        if (Math.random() < 0.33) ruinedHouse(hx, hz, alongX ? w : 9, alongX ? 9 : w);
        else house(hx, hz, alongX ? w : 9, alongX ? 9 : w, rand(7, 12.5), { face: alongX ? (az < cz ? -1 : 1) : 0 });
      }
    }
  }
  buildBerlinLandmarks();
  // war damage across the countryside: tank traps, sandbags, wrecked cars and more rubble
  for (let i = 0; i < 70; i++) { const a = rand(0, 6.28), r = rand(60, 520), x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) > EDGE - 20 || Math.abs(z) > EDGE - 20) continue; if (lvFree(x, z, 3) && waterDepth(x, z) === 0) (Math.random() < 0.5 ? rubble : hedgehog)(x, z); }
  for (let i = 0; i < 14; i++) { const x = rand(-TOWN_R + 10, TOWN_R - 10), z = rand(-TOWN_R + 10, TOWN_R - 10); if (townStreetDist(x, z) < 2.5 && Math.hypot(x, z) < TOWN_R - 10) { let near = false; for (const p of POINTS_DEF) if (Math.hypot(x - p.x, z - p.z) < 14) near = true; if (!near && typeof addCar === 'function') addCar(x, z, Math.random() < 0.5, 0x2a2826); } }
}
// ===================== Desert Combat: Afghanistan =====================
const AFG = { tan: new THREE.MeshLambertMaterial({ color: 0xa88c64 }), mud: new THREE.MeshLambertMaterial({ color: 0xb09670 }), hesco: new THREE.MeshLambertMaterial({ color: 0xb3a47e }) };
// a walled family compound (a qalat): thick mud walls with round corner towers, a gate, and houses inside
function qalat(cx, cz, S, rot) {
  const h = 4.2, t = 1.1, gate = 5;
  for (const [ax, az, len, alongX] of [[0, -S / 2, S, true], [0, S / 2, S, true], [-S / 2, 0, S, false], [S / 2, 0, S, false]]) {
    const gateHere = (rot % 4 === 0 && az > 0 && alongX) || (rot % 4 === 1 && ax > 0 && !alongX) || (rot % 4 === 2 && az < 0 && alongX) || (rot % 4 === 3 && ax < 0 && !alongX);
    const parts = gateHere ? [[-len / 2, -gate / 2], [gate / 2, len / 2]] : [[-len / 2, len / 2]];
    for (const [a0, a1] of parts) { const mid = (a0 + a1) / 2, L = a1 - a0; if (alongX) addBlock(cx + mid, cz + az, L, h, t, AFG.mud); else addBlock(cx + ax, cz + mid, t, h, L, AFG.mud); }
  }
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = cx + dx * S / 2, z = cz + dz * S / 2; addMesh(new THREE.CylinderGeometry(1.6, 1.9, h + 1.8, 10), AFG.mud, x, heightAt(x, z) + (h + 1.8) / 2 - 0.3, z); addCircle(x, z, 1.9, heightAt(x, z) + h + 1.5); }
  house(cx - S * 0.18, cz - S * 0.15, S * 0.4, S * 0.32, 3.4, { flat: true }); if (S > 24) house(cx + S * 0.2, cz + S * 0.18, S * 0.3, S * 0.3, 3.0, { flat: true });
}
// a HESCO blast wall: wire baskets full of earth, in a long row
function hesco(x0, z0, x1, z1) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.2));
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, (i + 0.5) / n), z = lerp(z0, z1, (i + 0.5) / n);
    if (pathDist(x, z) < 6 || inRunwayZone(x, z, 2)) continue;
    addBlock(x, z, 2.1, 2.3, 2.1, AFG.hesco);
  }
}
function buildAfghan() {
  // the blue forward operating base: HESCO walls round the base, guard towers, tents, shipping containers, a helipad and a radio mast
  const B = BASES.blue, R = 78;
  hesco(B.x - R, B.z - R * 0.7, B.x + R, B.z - R * 0.7); hesco(B.x - R, B.z - R * 0.7, B.x - R, B.z); hesco(B.x + R, B.z - R * 0.7, B.x + R, B.z);
  for (const [dx, dz] of [[-R, -R * 0.7], [R, -R * 0.7]]) {
    const x = B.x + dx, z = B.z + dz, y = heightAt(x, z), P = new Part();
    for (const sx of [-1.3, 1.3]) for (const sz of [-1.3, 1.3]) P.box(0.25, 6, 0.25, 0x6a5a40, sx, 3, sz);
    P.box(3.4, 0.25, 3.4, 0x7a6a50, 0, 6, 0); for (const [a, b] of [[0, 1.6], [0, -1.6], [1.6, 0], [-1.6, 0]]) P.box(a ? 0.3 : 3.4, 1.1, a ? 3.4 : 0.3, 0xb3a47e, a, 6.7, b); P.box(3.8, 0.15, 3.8, 0x5a5040, 0, 8, 0);
    const m = new THREE.Mesh(P.build(), VEH_MAT); m.position.set(x, y, z); m.castShadow = true; scene.add(m); addBlock(x, z, 3, 6, 3, LV.hidden);
  }
  for (let i = 0; i < 4; i++) { const x = B.x - 50 + i * 12, z = B.z + 10; if (!lvFree(x, z, 0) && pathDist(x, z) < 6) continue; const m = addMesh(new THREE.CylinderGeometry(3, 3, 9, 12, 1, false, 0, Math.PI), new THREE.MeshLambertMaterial({ color: 0xb8aa86, side: THREE.DoubleSide }), x, heightAt(x, z), z); m.rotation.set(0, 0, Math.PI / 2); m.rotation.order = 'ZXY'; m.rotation.set(Math.PI / 2, 0, Math.PI / 2); }   // long tents
  for (const [dx, dz, c] of [[40, 8, 0x8a5a3a], [40, 12, 0x3a5a6a], [46, 8, 0x6a6a5a]]) { const x = B.x + dx, z = B.z + dz; if (pathDist(x, z) > 5) addBlock(x, z, 6, 2.6, 2.4, new THREE.MeshLambertMaterial({ color: c })); }   // shipping containers
  { const x = B.x - 40, z = B.z - 30, y = heightAt(x, z); addMesh(new THREE.CylinderGeometry(9, 9, 0.2, 24), LV.concrete, x, y + 0.1, z, false);
    const H = new Part(); H.box(1, 0.05, 6, 0xf2f2f2, -1.8, 0, 0); H.box(1, 0.05, 6, 0xf2f2f2, 1.8, 0, 0); H.box(2.6, 0.05, 1, 0xf2f2f2, 0, 0, 0); const hm = new THREE.Mesh(H.build(), VEH_MAT); hm.position.set(x, y + 0.23, z); scene.add(hm); }
  { const x = B.x + 55, z = B.z - 20, y = heightAt(x, z); addMesh(new THREE.CylinderGeometry(0.15, 0.4, 26, 6), LV.rail, x, y + 13, z); addMesh(new THREE.BoxGeometry(2, 0.1, 0.1), LV.rail, x, y + 22, z); addCircle(x, z, 0.6, y + 26); }
  // the red side: walled compounds round their base and across the valley, with lookout posts on the hills
  const Rb = BASES.red;
  for (const [dx, dz, S] of [[-60, 30, 30], [60, 30, 30], [-90, -10, 24], [90, -10, 24]]) { const x = Rb.x + dx, z = Rb.z + dz; if (lvFree(x, z, S / 2 - 30)) qalat(x, z, S, dz > 0 ? 0 : 2); }
  let made = 0;
  for (let i = 0; i < 400 && made < 14; i++) {
    const x = rand(-420, 420), z = rand(-400, 380), S = rand(20, 30);
    if (!lvFree(x, z, S * 0.7) || Math.hypot(x - B.x, z - B.z) < 140 || heightAt(x, z) > 14) continue;
    const hs = [heightAt(x - S / 2, z - S / 2), heightAt(x + S / 2, z - S / 2), heightAt(x - S / 2, z + S / 2), heightAt(x + S / 2, z + S / 2)];
    if (Math.max(...hs) - Math.min(...hs) > 3) continue;
    let near = false; for (const o of nearbyColliders(x, z)) if (o.kind === 'box' && Math.abs(o.minX - x) < S && Math.abs(o.minZ - z) < S) near = true; if (near) continue;
    qalat(x, z, S, Math.floor(rand(0, 4))); made++;
  }
  // wrecked vehicles and sandbag posts dotted around
  for (let i = 0; i < 18; i++) { const x = rand(-420, 420), z = rand(-400, 400); if (!lvFree(x, z, 3)) continue; const y = heightAt(x, z), P = new Part(); P.box(2, 1, 4.2, 0x3a3430, 0, 0.7, 0); P.box(1.8, 0.8, 1.8, 0x2a2622, 0, 1.5, 0.5); for (const sx of [-1, 1]) for (const sz of [-1.4, 1.4]) P.cyl(0.45, 0.45, 0.3, 0x1a1a1a, sx * 1.05, 0.45, sz, 0, 0, Math.PI / 2, 1, 8); const m = new THREE.Mesh(P.build(), VEH_MAT); m.position.set(x, y, z); m.rotation.set(rand(-0.1, 0.1), rand(0, 6.28), rand(-0.3, 0.3)); scene.add(m); addBlock(x, z, 2.4, 1.8, 2.4, LV.hidden); }
  for (let i = 0; i < 20; i++) { const x = rand(-430, 430), z = rand(-420, 420); if (!lvFree(x, z, 3)) continue; const y = heightAt(x, z), P = new Part(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 1.6; P.add(new THREE.SphereGeometry(0.5, 7, 5), 0xa8935f, Math.cos(a) * 2.2, 0.35, Math.sin(a) * 2.2, 0, 0, 0, 1.4, 0.6, 1); P.add(new THREE.SphereGeometry(0.5, 7, 5), 0x9a8552, Math.cos(a + 0.15) * 2.2, 0.9, Math.sin(a + 0.15) * 2.2, 0, 0, 0, 1.4, 0.6, 1); } const m = new THREE.Mesh(P.build(), VEH_MAT); m.position.set(x, y, z); m.rotation.y = rand(0, 6.28); scene.add(m); }
}
function buildNormandy() {
  // a low concrete sea wall at the top of the beach, open where the roads come up from the sand
  for (let x = -EDGE; x < EDGE; x += 6) { if (pathDist(x + 3, 240) < 9) continue; addBlock(x + 3, 240, 6, 1.6, 1.0, LV.concrete); }
  // beach obstacles: steel hedgehogs and wooden stakes
  for (let i = 0; i < 160; i++) { const x = rand(-EDGE + 20, EDGE - 20), z = rand(252, 334); if (lvFree(x, z, 2)) hedgehog(x, z); }
  for (let i = 0; i < 80; i++) {
    const x = rand(-EDGE + 20, EDGE - 20), z = rand(300, 345); if (!lvFree(x, z, 1)) continue;
    addMesh(new THREE.CylinderGeometry(0.14, 0.16, 2.6, 6), MATS.wood || LV.rust, x, heightAt(x, z) + 0.9, z).rotation.x = -0.45;
  }
  // concrete bunkers along the top of the bluffs, looking down at the sand
  for (let x = -500; x <= 500; x += 40) { const z = 198 + rand(-5, 5); if (lvFree(x, z, 6)) casemate(x, z); }          // a wall of bunkers along the bluffs
  for (let x = -460; x <= 460; x += 60) { const z = 165 + rand(-6, 6); if (lvFree(x + 20, z, 6)) casemate(x + 20, z); }   // a second line behind
  for (let i = 0; i < 40; i++) { const x = rand(-500, 500), z = rand(205, 228); if (lvFree(x, z, 2)) for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; addBlock(x + Math.cos(a) * 2.2, z + Math.sin(a) * 2.2, 1.4, 0.9, 1.4, MATS.sandbag || LV.hedge); } }   // sandbagged gun pits
  // hedgerows: thick earth banks topped with bushes, boxing in the fields inland
  for (let z = 100; z > -500; z -= 75) for (let x = -520; x < 520; x += 8) {
    if (!lvFree(x, z, 2) || waterDepth(x, z) > 0) continue;
    addBlock(x, z, 8, 1.8 + vnoise(x * 0.3, z * 0.3) * 0.8, 2.2, LV.hedge);
  }
  for (let x = -450; x <= 450; x += 90) for (let z = 80; z > -480; z -= 9) {
    if (!lvFree(x, z, 2) || Math.random() < 0.15) continue;
    addBlock(x, z, 2.2, 1.8 + vnoise(x * 0.3, z * 0.3) * 0.8, 9, LV.hedge);
  }
  buildLandingCraft();
  // airfields: big arched hangars and a control tower beside each runway
  for (const t of ['red']) {   // only the defenders have airfields; blue's planes come from the carrier
    const r = RUNWAYS[t], side = t === 'blue' ? -1 : 1, hz = r.z + side * (r.wid / 2 + 22);
    for (const dx of [-45, 0, 45]) {
      const hx = r.x + dx; if (!lvFree(hx, hz, 0) && pathDist(hx, hz) < 8) continue;
      const hy = heightAt(hx, hz), arch = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 30, 18, 1, false, 0, Math.PI), new THREE.MeshLambertMaterial({ color: t === 'blue' ? 0x7a8068 : 0x6e7066, side: THREE.DoubleSide }));
      arch.rotation.set(0, 0, Math.PI / 2); arch.rotation.order = 'ZYX'; arch.position.set(hx, hy, hz); arch.rotation.set(Math.PI / 2, 0, Math.PI / 2); scene.add(arch);
      addBlock(hx, hz - side * 0, 30, 1.0, 0.6, LV.hidden);
      for (const s of [-1, 1]) addBlock(hx + s * 15, hz, 0.6, 9, 22, LV.concrete);   // end walls with the doors open towards the runway
    }
    const tx = r.x + 75, tz = hz; addBlock(tx, tz, 6, 12, 6, LV.concrete); addMesh(new THREE.BoxGeometry(7, 3, 7), new THREE.MeshLambertMaterial({ color: 0x223040 }), tx, heightAt(tx, tz) + 13.5, tz);   // control tower with its glass room
  }
  // French villages inland
  village(PD.F, 8, 20, 40); village(PD.G, 8, 20, 40); village({ x: -120, z: -60 }, 5, 12, 30); village({ x: 140, z: -40 }, 5, 12, 30);
  // wrecked tanks and landing craft on the sand
  for (let i = 0; i < 6; i++) { const x = rand(-450, 450), z = rand(262, 320); if (lvFree(x, z, 5)) rubble(x, z, 1.6); }
}
function buildDam() {
  // the dam: a concrete deck along the crest, walls along both edges, and the huge face dropping into the gorge
  const crestY = 4.2;
  // built in 10 m sections, so the middle can break away when the dam is destroyed
  for (let x = -170; x < 170; x += 10) {
    const P = new Part(), cx = x + 5, c = 0xa8a9a4, rc = 0x9d9e99;
    P.box(10.05, 0.5, 13, c, 0, crestY + 0.05, -60);                                              // the crest deck
    P.add(new THREE.BoxGeometry(10.05, 34, 3), c, 0, crestY - 16.5, -52.2, -0.12, 0, 0);          // the face over the gorge
    if (((cx + 170) / 10) % 2 === 1) P.add(new THREE.BoxGeometry(2.2, 34, 2), rc, 0, crestY - 16.5, -50.6, -0.12, 0, 0);   // ribs
    P.box(10.05, 14, 1.5, c, 0, crestY - 6.8, -67.2);                                             // the reservoir side
    P.box(10.05, 44, 15, c, 0, crestY - 22.5, -59.5);                                             // the solid core, down past the deepest ground
    const m = new THREE.Mesh(P.build(), VEH_MAT); m.position.x = cx; m.receiveShadow = true; m.castShadow = true; m.userData.kept = true; scene.add(m);
    const walls = []; for (const z of [-66.6, -53.4]) walls.push(addBlock(cx, z, 10, 1.1, 0.6, LV.concrete, { y: crestY }));
    DAMWALL.segs.push({ x: cx, m, walls });
  }
  // control buildings at each end, with lamp posts along the crest
  for (const s of [-1, 1]) { addBlock(s * 182, -44, 14, 8, 10, LV.concrete); addMesh(new THREE.BoxGeometry(14.6, 0.5, 10.6), LV.rail, s * 182, heightAt(s * 182, -44) + 8, -44); }
  for (let x = -150; x <= 150; x += 30) { addMesh(new THREE.CylinderGeometry(0.1, 0.12, 5, 6), LV.rail, x, crestY + 2.5, -66); addMesh(new THREE.BoxGeometry(0.5, 0.25, 1.2), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }), x, crestY + 5, -65.5); }
  // the bungee platform sticking out over the gorge from the middle of the crest
  addBlock(0, -48.5, 6, 0.4, 9, LV.rail, { y: crestY - 0.2 });
  for (const s of [-1, 1]) addBlock(s * 2.9, -48.5, 0.2, 1.1, 9, LV.rail, { y: crestY + 0.2, solid: false });
  addMesh(new THREE.BoxGeometry(2.2, 0.2, 0.8), new THREE.MeshBasicMaterial({ color: 0xffd23f }), 0, crestY + 0.25, -44.6, false);
  // a radar dish and guard huts on the banks
  const dish = new THREE.Group(), dy = heightAt(250, 40);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3), new THREE.MeshLambertMaterial({ color: 0xe8eaec, side: THREE.DoubleSide })); bowl.rotation.x = Math.PI * 0.75; bowl.position.y = 9; dish.add(bowl);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 9, 10), LV.rail); mast.position.y = 4.5; dish.add(mast);
  dish.position.set(250, dy, 40); scene.add(dish); addBlock(250, 40, 2.6, 6, 2.6, LV.hidden);
  for (const [x, z] of [[-230, 60], [230, -150], [-240, -150], [120, 200], [-120, 200]]) if (lvFree(x, z, 4)) addBlock(x, z, 5, 3.2, 5, LV.concrete);
}
// ---------- the dam can be destroyed ----------
// Explosions near the wall wear it down. Cracks spread across the face as it weakens and water starts spraying
// through. At zero the middle of the wall gives way: the concrete tumbles into the gorge, a waterfall pours through
// the gap and a flood surges down the gorge, sweeping away and drowning anyone caught in it.
const DAMWALL = { hp: 6000, max: 6000, segs: [], cracks: 0, broken: false, t: 0, chunks: [], flood: null, falls: null, told: {} };
function damFloor(z) { return lerp(-28, 2, smooth(-54, 140, z)); }
function damHit(pos, radius, dmg) {
  if (!DAM || DAMWALL.broken || Math.abs(pos.x) > 175) return;
  const dz = pos.z < -67 ? -67 - pos.z : pos.z > -50 ? pos.z + 50 : 0, dy = pos.y > 5 ? pos.y - 5 : pos.y < -30 ? -30 - pos.y : 0, d = Math.hypot(dz, dy);
  const reach = radius + 12; if (d > reach) return;
  DAMWALL.hp -= dmg * (1 - d / reach) * (radius > 40 ? 3 : 1);   // nukes hit it very hard
  if (DAMWALL.hp <= 0 && !DAMWALL.broken) breakDam();
}
function installDamHooks() {
  if (installDamHooks.done || typeof explosion !== 'function') return; installDamHooks.done = true;
  const ex = explosion; explosion = function (pos, radius, power, attacker, dmg = 130, ghost = false) { if (!ghost && (!net.active || net.isHost)) damHit(pos, radius, dmg); return ex.apply(this, arguments); };
}
const DAM_CRACK = [0.8, 0.55, 0.3, 0.12];
function updateDamCracks() {
  const k = DAMWALL.hp / DAMWALL.max;
  while (DAMWALL.cracks < DAM_CRACK.length && k < DAM_CRACK[DAMWALL.cracks]) {
    const lvl = DAMWALL.cracks++, mat = new THREE.MeshBasicMaterial({ color: 0x1a1a18 });
    // jagged cracks running across the face, more and longer each time, centred on the middle of the dam
    for (let n = 0; n < 6 + lvl * 6; n++) {
      let x = rand(-60 - lvl * 25, 60 + lvl * 25), y = rand(-26, 2), a = rand(0, 6.28);
      for (let seg = 0; seg < 4 + lvl * 2; seg++) {
        const len = rand(1.5, 4 + lvl), m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.18 + lvl * 0.06, 0.1), mat);
        m.position.set(x + Math.cos(a) * len / 2, 4.2 + y + Math.sin(a) * len / 2, -50.6 + 0.12 * (4.2 + y - (4.2 - 16.5)) * 0); m.position.z = -52.2 + 1.55 - (m.position.y - (4.2 - 16.5)) * Math.tan(0.12) + 0.05;
        m.rotation.set(-0.12, 0, a); if (m.position.y < 3.6 && Math.abs(m.position.x) < 168) { scene.add(m); (DAMWALL.crackMeshes = DAMWALL.crackMeshes || []).push(m); }   /* only on the face itself */
        x += Math.cos(a) * len; y += Math.sin(a) * len; a += rand(-0.9, 0.9);
      }
    }
    if (lvl >= 2) DAMWALL.leaks = (DAMWALL.leaks || []).concat(Array.from({ length: lvl * 3 }, () => new THREE.Vector3(rand(-60, 60), rand(-24, -4), 0)));
    const say = ['Cracks are spreading across the dam!', 'The dam is badly cracked!', 'Water is spraying through the dam!', 'The dam is about to give way!'][lvl];
    if (!DAMWALL.told[lvl]) { DAMWALL.told[lvl] = true; showMessage(say, 3); }
  }
}
function breakDam() {
  if (DAMWALL.broken) return; DAMWALL.broken = true; DAMWALL.t = 0; DAMWALL.hp = 0;
  updateDamCracks();
  for (const m of DAMWALL.crackMeshes || []) if (Math.abs(m.position.x) < 62) m.visible = false;   // cracks go with the broken part
  // the middle 120 m breaks away and tumbles into the gorge
  for (const sg of DAMWALL.segs) {
    if (Math.abs(sg.x) > 60) continue;
    sg.m.visible = false;
    for (const w of sg.walls) if (w) { w.visible = false; const i = solidMeshes.indexOf(w); if (i >= 0) solidMeshes.splice(i, 1); }
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(rand(3, 6), rand(3, 7), rand(2, 4)), LV.concrete); c.position.set(sg.x + rand(-4, 4), rand(-10, 4), rand(-62, -52)); c.castShadow = true; scene.add(c);
      DAMWALL.chunks.push({ m: c, v: new THREE.Vector3(rand(-3, 3), rand(0, 4), rand(8, 18)), r: new THREE.Vector3(rand(-2, 2), rand(-2, 2), rand(-2, 2)) });
    }
  }
  for (const b of obstacles) if (b.kind === 'box' && Math.abs((b.minX + b.maxX) / 2) < 62 && (b.minZ + b.maxZ) / 2 > -70 && (b.minZ + b.maxZ) / 2 < -48 && b.maxY > 2) b.minY = b.maxY = -1e4;
  for (const b of world.bodies.slice()) { if (b.mass !== 0 || !b.shapes[0] || b.shapes[0].type === CANNON.Shape.types.HEIGHTFIELD) continue; if (Math.abs(b.position.x) < 62 && b.position.z > -70 && b.position.z < -48 && b.position.y > 2) world.removeBody(b); }
  // cut the gap into the ground, from the reservoir down to the gorge floor
  if (typeof terrainEdit === 'function') terrainEdit(-62, 62, -72, -48, (x, z, h) => { const edge = smooth(62, 50, Math.abs(x)); return lerp(h, Math.min(h, z < -60 ? -10 : damFloor(z) - 1), edge); });
  if (typeof clearAround === 'function') clearAround(new THREE.Vector3(0, 0, -58), 62, 0);   /* lamp posts, the bungee platform and anything else on the broken part */
  // the waterfall through the gap, and the flood that sweeps down the gorge
  const wm = new THREE.MeshLambertMaterial({ color: 0x7fb3c8, transparent: true, opacity: 0.8, side: THREE.DoubleSide, emissive: 0x1a3440 });
  DAMWALL.falls = new THREE.Mesh(new THREE.PlaneGeometry(116, 30), wm); DAMWALL.falls.position.set(0, -12, -53); DAMWALL.falls.rotation.x = -0.35; scene.add(DAMWALL.falls);
  const fg = new THREE.PlaneGeometry(300, 196, 1, 40); fg.rotateX(-Math.PI / 2);
  DAMWALL.flood = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ color: 0x5f8fa2, transparent: true, opacity: 0.85, emissive: 0x10242c })); DAMWALL.flood.position.set(0, 0, 44); scene.add(DAMWALL.flood);
  SFX.boom && SFX.boom(1.6); camShake = Math.max(camShake, 0.4);
  if (typeof tn === 'function' && actx) { nz('lowpass', 260, 6, 1.0); tn('sine', 50, 25, 5, 0.8); }
  showMessage('THE DAM HAS BROKEN! The flood is coming down the gorge. Get to high ground!', 6);
}
function updateDam(dt) {
  if (!DAM) return;
  installDamHooks();
  updateDamCracks();
  if (!DAMWALL.broken) {   // water spraying through the worst cracks
    if (DAMWALL.leaks && Math.random() < dt * 8) { const l = pick(DAMWALL.leaks); smokePuff(new THREE.Vector3(l.x, 4.2 + l.y, -49), 0xd8eef8, rand(0.8, 1.6), 1.6, -2); }
    return;
  }
  DAMWALL.t += dt; const t = DAMWALL.t;
  for (let i = DAMWALL.chunks.length - 1; i >= 0; i--) {   // falling concrete
    const c = DAMWALL.chunks[i]; if (c.done) continue;
    c.v.y -= 20 * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += c.r.x * dt; c.m.rotation.y += c.r.y * dt; c.m.rotation.z += c.r.z * dt;
    const g = heightAt(c.m.position.x, c.m.position.z); if (c.m.position.y < g + 1) { c.m.position.y = g + 1; c.done = true; burst(c.m.position.clone(), 10, 0x9a9a94, 8, 1, 0.3); }
  }
  // the flood: a front races down the gorge, deep at first, then settles into a river
  const front = -54 + 196 * clamp(t / 9, 0, 1), surge = lerp(14, 3, clamp((t - 6) / 20, 0, 1));
  const pos = DAMWALL.flood.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i) + 44, deep = z < front ? surge * lerp(1, 0.5, (z + 54) / 196) : -6; pos.setY(i, damFloor(z) + deep); }
  pos.needsUpdate = true; DAMWALL.flood.geometry.computeVertexNormals();
  DAMWALL.falls.material.opacity = 0.65 + Math.sin(t * 8) * 0.1;
  if (Math.random() < dt * 20) smokePuff(new THREE.Vector3(rand(-55, 55), damFloor(-50) + rand(0, 6), rand(-50, -40)), 0xe8f4fa, rand(2, 4), 2, 3);   // spray at the foot of the falls
  if (Math.random() < dt * 10 && front < 140) smokePuff(new THREE.Vector3(rand(-100, 100), damFloor(front) + surge * 0.6, front), 0xdaeef6, rand(2, 4), 1.4, 2);   // foam on the front
  // anyone caught in the water is swept along and drowns; vehicles are wrecked
  const host = !net.active || net.isHost;
  DAMWALL.hurtT = (DAMWALL.hurtT || 0) - dt; const tick = DAMWALL.hurtT <= 0; if (tick) DAMWALL.hurtT = 0.5;
  for (const c of chars) {
    if (!c.alive || c.isRemote || (!host && !c.isPlayer) || c.vehicle) continue;
    const z = c.pos.z; if (z < -54 || z > 142 || z > front || Math.abs(c.pos.x) > 140) continue;
    const surf = damFloor(z) + surge * lerp(1, 0.5, (z + 54) / 196); if (c.pos.y > surf - 0.5) continue;
    c.pos.z += 9 * dt; if (c.isPlayer) { player.velY = Math.max(player.velY, -2); }
    if (tick) { damage(c, t < 25 ? 55 : 22, null, new THREE.Vector3(0, 0, 1), 6); if (c.isPlayer) showMessage('You are being swept away by the flood!', 1); }
  }
  if (host && tick) for (const v of gvehicles) if (v.alive && !v.T.boat && v.pos.z > -54 && v.pos.z < front && Math.abs(v.pos.x) < 140 && v.pos.y < damFloor(v.pos.z) + surge - 1) damageVehicle(v, 400, null);
}
function damState() { return [Math.round(Math.max(0, DAMWALL.hp)), DAMWALL.broken ? 1 : 0]; }
function applyDamState(d) { if (!Array.isArray(d)) return; DAMWALL.hp = d[0]; if (d[1] && !DAMWALL.broken) breakDam(); }
// the bungee jump: drop off the dam into the gorge and a parachute opens for you
function updateLevel(dt) {
  if (DAM) updateDam(dt);
  if (GERMANY) { installLeaderHooks(); installGuardHook(); updateBombers(dt); updateLeader(dt); }
  if ((GERMANY || NORMANDY) && started) updateBarrage(dt);
  if (AFGHAN && started && !AFG.told && player.alive) { AFG.told = true; showMessage('Desert Combat: Afghanistan. Blue holds the base in the south of the valley, red holds the mountain villages. Humvees, jets and helicopters are at your base', 7); }
  if ((GERMANY || NORMANDY) && started && !BARRAGE.told && player.alive) { BARRAGE.told = true; showMessage(NORMANDY ? 'June 6, 1944: D-Day. Blue storms the beach, red holds the bunkers' : 'Berlin, April 1945: the last battle in Europe. Hitler hides in one of the bunkers. Blue: find the clues by the landmarks (red blinking lights) to track him down', 8); }
  if (NORMANDY) {
    updateLandingCraft();
    if (player.inBoat && player.alive) { rideBoat(player); player.velY = 0; player.yaw = player.yaw; }
  }
  if (!DAM || !player.alive || player.gv || player.vehicle || player.parachute) return;
  if (player.pos.z > -54 && player.pos.z < 60 && Math.abs(player.pos.x) < 150 && player.velY < -9 && player.pos.y - heightAt(player.pos.x, player.pos.z) > 8 && typeof openChute === 'function') {
    openChute(); showMessage('Bungee! Your parachute opened', 2); if (typeof unlock === 'function') unlock('bungee');
  }
}

// ---------- Normandy: the landing craft ----------
// Six flat-bottomed landing boats run in from the sea, drop their front ramp on the sand, let the soldiers out,
// then back off and come round again. The boats follow the clock (not each player's game time), so every player
// sees them in the same place. Blue soldiers, and blue players who pick the beach, ride in until the ramp opens.
const LCVP = { boats: [], period: 40, lanes: Array.from({ length: 16 }, (_, i) => -270 + i * 36), now: () => Date.now() };   // twenty landing boats
function lcvpModel() {
  const P = new Part(), hull = 0x56604a, dark = 0x3a4232;
  P.box(3.4, 0.4, 9, dark, 0, 0.2, 0);                                            // flat bottom
  for (const s of [-1, 1]) P.box(0.18, 1.9, 9, hull, s * 1.62, 1.15, 0);           // high sides
  P.box(3.4, 1.9, 0.18, hull, 0, 1.15, 4.4);                                     // back wall
  P.box(1.2, 0.9, 1.2, dark, 0.8, 2.3, 3.6);                                     // the coxswain's spot
  for (const s of [-1, 1]) P.box(0.1, 0.5, 0.1, 0x222222, s * 1.3, 2.3, 3.2);
  const g = new THREE.Group(), m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; g.add(m);
  const rampPivot = new THREE.Group(); rampPivot.position.set(0, 0.3, -4.5); g.add(rampPivot);
  const RP = new Part(); RP.box(3.3, 1.9, 0.2, hull, 0, 0.95, 0); for (let i = 0; i < 5; i++) RP.box(3.0, 0.06, 0.06, dark, 0, 0.3 + i * 0.35, -0.12);
  const ramp = new THREE.Mesh(RP.build(), VEH_MAT); rampPivot.add(ramp); g.rampPivot = rampPivot;
  scene.add(g); return g;
}
function lcvpState(i, t) {   // where boat i is at clock time t: z position, ramp angle (0 up, 1 down), and the stage
  const P = LCVP.period, ph = ((t / 1000 + i * (P / LCVP.boats.length)) % P + P) % P, beachZ = 352, farZ = 560;
  if (ph < 16) return { z: lerp(farZ, beachZ, ph / 16), ramp: 0, stage: 'in' };
  if (ph < 17.5) return { z: beachZ, ramp: (ph - 16) / 1.5, stage: 'drop' };
  if (ph < 23) return { z: beachZ, ramp: 1, stage: 'open' };
  if (ph < 24.5) return { z: beachZ, ramp: 1 - (ph - 23) / 1.5, stage: 'close' };
  return { z: lerp(beachZ, farZ, (ph - 24.5) / 15.5), ramp: 0, stage: 'out' };
}
function buildLandingCraft() { installLandingHooks(); for (const x of LCVP.lanes) { const g = lcvpModel(); g.position.set(x, WATER_Y - 0.3, 560); LCVP.boats.push({ g, x, st: null }); } }
function updateLandingCraft() {
  const t = LCVP.now();
  LCVP.boats.forEach((b, i) => {
    const s = lcvpState(i, t); b.st = s;
    b.g.position.set(b.x, WATER_Y - 0.3 + Math.sin(t / 700 + i) * 0.12, s.z); b.g.rotation.z = Math.sin(t / 900 + i) * 0.03;
    b.g.rampPivot.rotation.x = -s.ramp * 1.45;   // the ramp swings down onto the sand
    if (s.stage === 'drop' && !b.splashed) { b.splashed = true; if (b.g.position.distanceTo(camera.position) < 120) playAt('thump', b.g.position, 1); burst(new THREE.Vector3(b.x, WATER_Y + 0.4, s.z - 6), 12, 0xdfe8ee, 5, 0.6, 0.15); }
    if (s.stage !== 'drop') b.splashed = false;
  });
}
// the next boat that is still coming in, and a standing spot inside it
function lcvpBoardingSpot() {
  const t = LCVP.now(); let best = -1, bt = Infinity;
  LCVP.boats.forEach((b, i) => { const s = lcvpState(i, t); if (s.stage !== 'in' || s.z < 380) return; const left = (s.z - 352) / ((560 - 352) / 16); if (left < bt) { bt = left; best = i; } });
  if (best < 0) return null;
  return { boat: best, dx: rand(-1.1, 1.1), dz: rand(-3, 3.2) };
}
function rideBoat(c) {   // keep a rider standing in its boat; let go once the ramp is down
  const b = LCVP.boats[c.inBoat.boat]; if (!b || !b.st) { c.inBoat = null; return false; }
  if (b.st.stage === 'open' || b.st.stage === 'close' || b.st.stage === 'out') {
    c.inBoat = null;
    if (c.isPlayer) { player.pos.set(b.x + c.inBoatDx, heightAt(b.x, 344), 344); showMessage('Ramp down! GO GO GO!', 2); }
    return false;
  }
  const y = b.g.position.y + 0.45;
  c.pos.set(b.x + c.inBoat.dx, y, b.st.z + c.inBoat.dz); c.inBoatDx = c.inBoat.dx;
  return true;
}
function installLandingHooks() {   // installed when the beach is built (the soldier code loads after this file)
const _updNpcL = updateNPC;
updateNPC = function (n, dt) {
  if (n.inBoat && n.alive) { if (rideBoat(n)) { n.heading = Math.PI; animateNPC(n, dt, 0, false); return; } }
  return _updNpcL.call(this, n, dt);
};
const _spawnL = spawnChar;
spawnChar = function (c, pref) {
  const r = _spawnL.apply(this, arguments);
  if (NORMANDY && c.team === 'blue' && c.pos.z > 330 && (!net.active || net.isHost || c.isPlayer)) {   // landed by the sea: board the next boat instead
    const s = lcvpBoardingSpot(); if (s) { c.inBoat = s; if (c.isPlayer) showMessage('In the landing boat... hold on! The ramp drops at the beach', 3); }
  }
  return r;
};
}


// ===================== Berlin 1945 =====================
function buildBerlinLandmarks() {
  const stone = LV.stone, sand = new THREE.MeshLambertMaterial({ color: 0xb8ab90 }), conc = LV.concrete;
  // the parliament: a long stone building with corner towers and a columned front facing the square, its dome
  // burned out to a bare steel frame (as it was in 1945)
  const px = 0, pz = -62;
  addBlock(px, pz, 46, 15, 26, sand);
  for (const [dx, dz] of [[-21, -11], [21, -11], [-21, 11], [21, 11]]) addBlock(px + dx, pz + dz, 8, 21, 8, sand);
  const gy = heightAt(px, pz + 15);
  for (let i = 0; i < 6; i++) addBlock(px - 10 + i * 4, pz + 15.5, 1.3, 13, 1.3, stone);                          // columns
  addMesh(new THREE.BoxGeometry(24, 2.4, 4), sand, px, gy + 14.2, pz + 15.2);                                         // the beam over them
  const pd = new THREE.Mesh(new THREE.ConeGeometry(13, 4, 4, 1), sand); pd.position.set(px, gy + 17.4, pz + 15); pd.rotation.y = Math.PI / 4; pd.scale.set(1, 1, 0.3); scene.add(pd);   // pediment
  const dy = heightAt(px, pz) + 15; const steel = new THREE.MeshLambertMaterial({ color: 0x3a3e42 });
  for (let i = 0; i < 12; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(7, 0.18, 4, 16, Math.PI), steel); rib.position.set(px, dy, pz); rib.rotation.y = i * Math.PI / 12; scene.add(rib); }   // the bare dome
  addMesh(new THREE.CylinderGeometry(7.4, 7.4, 2.4, 20, 1, true), stone, px, dy + 1.2, pz);
  // the cathedral: a big domed church with four corner towers
  const cx = 60, cz = -60, cy = heightAt(cx, cz);
  addBlock(cx, cz, 26, 16, 22, stone);
  addMesh(new THREE.CylinderGeometry(7, 7, 6, 16), stone, cx, cy + 19, cz);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(7.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x5f8f7a })); dome.position.set(cx, cy + 22, cz); dome.castShadow = true; scene.add(dome);
  addMesh(new THREE.CylinderGeometry(0.6, 1.2, 4, 8), new THREE.MeshLambertMaterial({ color: 0x5f8f7a }), cx, cy + 30.5, cz);
  for (const [dx, dz] of [[-11, -9], [11, -9], [-11, 9], [11, 9]]) { addBlock(cx + dx, cz + dz, 4, 21, 4, stone); const cap = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), dome.material); cap.position.set(cx + dx, cy + 21, cz + dz); scene.add(cap); }
  // the flak tower: a huge concrete block with a gun platform on each corner
  const fx = -120, fz = -120, fy = heightAt(fx, fz);
  addBlock(fx, fz, 30, 36, 30, conc);
  for (const [dx, dz] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) {
    addMesh(new THREE.CylinderGeometry(4.2, 4.2, 3, 12), conc, fx + dx, fy + 37.5, fz + dz);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 7, 8), LV.rail); gun.rotation.set(-0.9, (dx > 0 ? 1 : -1) * 0.6, 0); gun.position.set(fx + dx, fy + 41, fz + dz + 2); scene.add(gun);
  }
  for (let i = 0; i < 6; i++) addMesh(new THREE.BoxGeometry(1.4, 1, 0.4), LV.dark, fx - 12 + i * 4.8, fy + 20, fz + 15.1, false);   // gun slits
  // the Reichstag's front: rows of tall windows and a carved band under the roof
  { const P = new Part(), gy0 = heightAt(px, pz), win = 0x2a2c30, carve = 0x9a8e74;
    for (let i = 0; i < 9; i++) for (const yy of [4, 9]) { const x = px - 20 + i * 5; if (Math.abs(x - px) < 13) continue; P.box(1.6, 3, 0.1, win, x, gy0 + yy, pz + 13.05); P.box(1.6, 3, 0.1, win, x, gy0 + yy, pz - 13.05); }
    P.box(46.2, 1, 26.2, carve, px, gy0 + 14.6, pz); P.box(24.4, 1.2, 0.3, 0x5a5448, px, gy0 + 15.6, pz + 17.2);
    const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; scene.add(m); }
  // the Brandenburg Gate on the road into the city: twelve columns in two rows, five passages, the stone attic,
  // and the four-horse chariot on top
  const gx = -205, gzy = heightAt(gx, 0);
  for (const z of [-15, -9, -3, 3, 9, 15]) for (const dx of [-3, 3]) { if (Math.abs(z) > 4) addBlock(gx + dx, z, 1.8, 13, 1.8, sand); else addMesh(new THREE.CylinderGeometry(0.9, 1, 13, 12), sand, gx + dx, gzy + 6.5, z); }
  { const P = new Part(), c = 0xb8ab90, d = 0x9a8e74, bronze = 0x4f6a5a;
    for (const z of [-15, -9, -3, 3, 9, 15]) for (const dx of [-3, 3]) if (Math.abs(z) > 4) P.cyl(0.95, 1.05, 13, c, gx + dx, gzy + 6.5, z, 0, 0, 0, 1, 12);   // fluted columns over the solid cores
    P.box(9, 2.2, 38, c, gx, gzy + 14.1, 0); P.box(9.4, 0.4, 38.4, d, gx, gzy + 15.4, 0);                     // the beam
    P.box(7, 3, 22, c, gx, gzy + 17, 0); P.box(7.4, 0.4, 22.4, d, gx, gzy + 18.7, 0);                          // the stepped attic
    for (const sd of [-1, 1]) { P.box(10, 9, 6, c, gx, gzy + 4.5, sd * 22); P.box(10.4, 0.6, 6.4, d, gx, gzy + 9.2, sd * 22); }   // the side wings
    P.box(3, 1.4, 2.2, bronze, gx - 1.5, gzy + 19.7, 0);                                                        // the chariot
    for (const z of [-2.1, -0.7, 0.7, 2.1]) { P.box(2.6, 1.2, 0.6, bronze, gx + 1.4, gzy + 20.3, z); P.box(0.8, 1.2, 0.5, bronze, gx + 2.8, gzy + 21.1, z, 0, 0, -0.5); for (const lx of [0.4, 2.2]) P.box(0.25, 1.2, 0.25, bronze, gx + lx, gzy + 19.3, z); }   // four horses
    P.box(0.6, 2.4, 0.6, bronze, gx - 1.6, gzy + 21.6, 0); P.box(0.15, 2.4, 0.15, bronze, gx - 1.2, gzy + 23, 0.5); P.add(new THREE.TorusGeometry(0.5, 0.1, 6, 12), bronze, gx - 1.2, gzy + 24.4, 0.5, 0, Math.PI / 2, 0);   // the goddess with her staff and wreath
    const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; scene.add(m); }
  addBlock(gx, 0, 9, 3.2, 38, sand, { y: gzy + 13, solid: false });
  // the Victory Column on its roundabout further out: red granite base, a ring of columns, the tall banded shaft
  // and the golden winged figure on top
  { const vx = -290, vz = 0, vy = heightAt(vx, vz), P = new Part(), gran = 0x8a4a40, st = 0xc8bca0, gold = 0xd8b040;
    addBlock(vx, vz, 12, 6, 12, new THREE.MeshLambertMaterial({ color: gran }));
    P.cyl(5, 5, 5, st, vx, vy + 8.5, vz, 0, 0, 0, 1, 20); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; P.cyl(0.35, 0.35, 5, 0xe8e0c8, vx + Math.cos(a) * 5.3, vy + 8.5, vz + Math.sin(a) * 5.3, 0, 0, 0, 1, 8); }
    P.cyl(5.8, 5.8, 0.6, st, vx, vy + 11.3, vz, 0, 0, 0, 1, 20);
    for (let k = 0; k < 3; k++) { P.cyl(1.7 - k * 0.15, 1.8 - k * 0.15, 9, st, vx, vy + 16.2 + k * 9.4, vz, 0, 0, 0, 1, 16); P.cyl(1.95 - k * 0.15, 1.95 - k * 0.15, 0.6, gold, vx, vy + 20.9 + k * 9.4, vz, 0, 0, 0, 1, 16); }
    P.cyl(2.4, 1.6, 1.6, st, vx, vy + 41.5, vz, 0, 0, 0, 1, 16); P.cyl(1.2, 1.2, 1.4, st, vx, vy + 43, vz, 0, 0, 0, 1, 12);
    P.box(0.8, 3.4, 0.7, gold, vx, vy + 45.4, vz); P.ball(0.45, gold, vx, vy + 47.4, vz); for (const sd of [-1, 1]) P.box(0.2, 2.6, 1.6, gold, vx + sd * 0.7, vy + 46.4, vz - 0.3, 0, 0, sd * 0.35); P.box(0.12, 3.6, 0.12, gold, vx + 0.6, vy + 46, vz + 0.4);
    const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; scene.add(m); }
  // the Kaiser Wilhelm Memorial Church: a tall stone spire over a long nave with a round end
  { const kx = -60, kz = 60, ky = heightAt(kx, kz), P = new Part(), st = 0x9c8e78, dk = 0x6a5e50, roof = 0x4a5a5a;
    addBlock(kx, kz + 6, 16, 14, 28, new THREE.MeshLambertMaterial({ color: st })); addBlock(kx, kz - 14, 10, 34, 10, new THREE.MeshLambertMaterial({ color: st }));
    P.cyl(8, 8, 12, st, kx, ky + 6, kz + 20, 0, 0, 0, 1, 16);                                                  // the round end
    P.cyl(0.1, 11.5, 7, roof, kx, ky + 17.5, kz + 6, 0, Math.PI / 4, 0, 1, 4); P.box(1, 7, 28, roof, kx, ky + 17.5, kz + 6, 0, 0, 0);   // nave roof
    P.cyl(0.4, 7.2, 22, roof, kx, ky + 45, kz - 14, 0, Math.PI / 4, 0, 1, 4);                                  // the pointed spire
    for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) P.box(0.12, 6, 2.2, dk, kx + sd * 8.05, ky + 7, kz - 4 + i * 6);   // tall arched windows
    for (const f of [-1, 1]) { P.box(2.2, 6, 0.12, dk, kx, ky + 26, kz - 14 + f * 5.05); P.cyl(1.4, 1.4, 0.15, 0xf2f0e6, kx, ky + 30.5, kz - 14 + f * 5.1, Math.PI / 2, 0, 0, 1, 16); }   // belfry openings, clock faces
    for (const f of [-1, 1]) P.box(0.12, 6, 2.2, dk, kx + f * 5.05, ky + 26, kz - 14);
    const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; scene.add(m); }
  // the Red Town Hall: a long red brick hall with rows of arched windows and a tall clock tower in the middle
  { const rx = 60, rz = 60, ry = heightAt(rx, rz), P = new Part(), brick = 0xa04a36, dk = 0x2a2a2e, trim = 0xc8b898;
    addBlock(rx, rz, 40, 16, 26, new THREE.MeshLambertMaterial({ color: brick })); addBlock(rx, rz + 15, 8, 36, 8, new THREE.MeshLambertMaterial({ color: brick }));
    for (const f of [-1, 1]) for (let i = 0; i < 10; i++) for (const yy of [4, 10]) P.box(1.6, 3.2, 0.12, dk, rx - 18 + i * 4, ry + yy, rz + f * 13.06);
    P.box(40.4, 0.6, 26.4, trim, rx, ry + 7, rz); P.box(40.6, 1, 26.6, trim, rx, ry + 15.8, rz);
    for (const f of [-1, 1]) { P.cyl(1.6, 1.6, 0.15, 0xf2f0e6, rx, ry + 30, rz + 15 + f * 4.1, Math.PI / 2, 0, 0, 1, 16); P.box(0.2, 1.2, 0.1, dk, rx, ry + 30.3, rz + 15 + f * 4.2); }
    for (let c = 0; c < 4; c++) P.box(1.2, 2.4, 1.2, brick, rx + (c % 2 ? 3.6 : -3.6), ry + 37.2, rz + 15 + (c < 2 ? 3.6 : -3.6));   // corner turrets
    P.cyl(0.5, 3.4, 6, 0x4a5a5a, rx, ry + 39, rz + 15, 0, Math.PI / 4, 0, 1, 4); P.cyl(0.08, 0.08, 4, 0x3a3e42, rx, ry + 44, rz + 15);
    const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; scene.add(m); }
}

// ---------- bombers over Berlin ----------
// A formation of big four-engine bombers crosses the city every 50 seconds and drops bombs on it. Like the landing
// craft, everything follows the clock and a seed made from it, so every player sees the same planes and blasts.
const BOMBERS = { meshes: [], bombs: [], wave: -1, period: 50, alt: 175, speed: 62 };
let _b17Geo = null;
function b17Model() {
  if (!_b17Geo) {
    const P = new Part(), body = 0x8e949a, dark = 0x5c6268;
    P.cyl(1.2, 1.0, 16, body, 0, 0, 0, Math.PI / 2, 0, 0, 1, 12); P.cyl(0.25, 1.2, 4, body, 0, 0, -10, -Math.PI / 2, 0, 0, 1, 12); P.cyl(1.0, 0.4, 6, body, 0, 0.2, 11, Math.PI / 2, 0, 0, 1, 12);
    P.box(32, 0.35, 4.2, body, 0, -0.2, -1.5); P.box(11, 0.25, 2.6, body, 0, 0.3, 12.5);                           // wings, tailplane
    P.add(new THREE.BoxGeometry(0.3, 5, 4.5), body, 0, 2.8, 12.3, -0.3, 0, 0);                                       // tall tail fin
    for (const x of [-10, -5, 5, 10]) { P.cyl(0.8, 0.7, 3.4, dark, x, -0.2, -3.6, Math.PI / 2, 0, 0, 1, 10); P.cyl(0.35, 0.35, 0.5, 0x222222, x, -0.2, -5.4, Math.PI / 2, 0, 0, 1, 8); for (const r of [0, 2.1, 4.2]) P.box(0.18, 3.4, 0.06, 0x2a2a2a, x, -0.2, -5.6, 0, 0, r); }   // engines and prop discs
    P.box(1.2, 0.5, 1.6, 0x223344, 0, 0.9, -7);                                                                     // cockpit glass
    P.box(0.5, 0.05, 2, 0xffffff, 12, 0.0, -1.5); P.box(0.5, 0.05, 2, 0xffffff, -12, 0.0, -1.5);                     // white wing stars
    _b17Geo = P.build();
  }
  const m = new THREE.Mesh(_b17Geo, VEH_MAT); m.castShadow = true; m.visible = false; scene.add(m); return m;
}
function seeded01(k) { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function bomberWave(k) {   // the path of wave k: a heading across the middle of the map
  const ang = seeded01(k) * Math.PI * 2, off = (seeded01(k + 0.5) - 0.5) * 200;
  const dir = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang)), side = new THREE.Vector3(dir.z, 0, -dir.x);
  const start = dir.clone().multiplyScalar(-1300).addScaledVector(side, off);
  return { dir, side, start };
}
function bomberPos(w, j, t) {   // plane j of the V formation, t seconds into the wave
  const row = Math.ceil(j / 2), sgn = j % 2 ? 1 : -1;
  return w.start.clone().addScaledVector(w.dir, BOMBERS.speed * t - row * 22).addScaledVector(w.side, sgn * row * 26).setY(BOMBERS.alt + row * 4);
}
function updateBombers(dt) {
  if (!BOMBERS.meshes.length) for (let j = 0; j < 5; j++) BOMBERS.meshes.push(b17Model());
  const now = Date.now() / 1000, k = Math.floor(now / BOMBERS.period), t = now - k * BOMBERS.period, w = bomberWave(k);
  const host = !net.active || net.isHost;
  if (k !== BOMBERS.wave) { BOMBERS.wave = k; BOMBERS.dropped = new Set(); if (SFX.siren && started) SFX.siren(0.7); }   // air raid sirens as each wave comes in
  let near = Infinity;
  BOMBERS.meshes.forEach((m, j) => {
    const p = bomberPos(w, j, t); m.visible = t < 42; m.position.copy(p); m.rotation.set(0, Math.atan2(-w.dir.x, -w.dir.z), 0);
    near = Math.min(near, p.distanceTo(camera.position));
    // over the city: one bomb every 1.3 seconds
    const flat = Math.hypot(p.x, p.z);
    if (flat < 240) { const slot = Math.floor(t / 1.3), id = j * 1000 + slot; if (!BOMBERS.dropped.has(id)) { BOMBERS.dropped.add(id); dropBerlinBomb(p.clone(), w.dir, host); } }
  });
  if (near < 500 && Math.random() < dt * 2 && typeof tn === 'function' && typeof actx !== 'undefined' && actx) tn('sawtooth', 62, 58, 0.5, 0.035 * (1 - near / 500));   // the drone of the engines
  for (let i = BOMBERS.bombs.length - 1; i >= 0; i--) {
    const b = BOMBERS.bombs[i]; b.vel.y -= 20 * dt; b.m.position.addScaledVector(b.vel, dt); b.m.lookAt(b.m.position.clone().add(b.vel));
    const gh = heightAt(b.m.position.x, b.m.position.z);
    if (b.m.position.y <= gh + 0.5) { scene.remove(b.m); BOMBERS.bombs.splice(i, 1); explosion(new THREE.Vector3(b.m.position.x, gh + 0.5, b.m.position.z), 9, 40, null, 140, !b.host); if (typeof makeCrater === 'function') makeCrater(new THREE.Vector3(b.m.position.x, gh, b.m.position.z), 9); }
  }
}
function dropBerlinBomb(p, dir, host) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.4, 8), new THREE.MeshLambertMaterial({ color: 0x30343a })); m.geometry.rotateX(Math.PI / 2);
  m.position.copy(p).y -= 1.5; scene.add(m);
  BOMBERS.bombs.push({ m, vel: dir.clone().multiplyScalar(BOMBERS.speed * 0.8), host });
  if (BOMBERS.bombs.length > 60) { const o = BOMBERS.bombs.shift(); scene.remove(o.m); }
}

// ---------- the bunker ----------
// Hitler hides in a deep room of one of the city's bunkers, a different one every game (the host picks it and
// tells everyone). Clues at the landmarks lead to it; red soldiers guard it. A blue player has to shoot him to end
// the war. Eva Braun is in the room with him; she is not a target, and she surrenders when he falls.
const LEADER = { at: null, found: false, g: null, eva: null, idx: undefined, clues: [], got: 0, seen: false, smoke: null };
function leaderBunker() { return LEADER.idx === undefined ? null : bunkers[LEADER.idx % Math.max(1, bunkers.length)]; }
function placeLeader() {
  if (!bunkers.length) return;
  if (LEADER.idx === undefined && (!net.active || net.isHost)) LEADER.idx = Math.floor(Math.random() * bunkers.length);
  if (LEADER.idx === undefined || (LEADER.g && LEADER.placed === LEADER.idx)) return;
  for (const o of [LEADER.g, LEADER.eva, LEADER.desk]) if (o) scene.remove(o);
  const b = leaderBunker(); LEADER.placed = LEADER.idx;
  const w = bW(b, 18, 13); LEADER.at = new THREE.Vector3(w.x, b.F, w.z); LEADER.bunker = b.name;
  const P = new Part(), coat = 0x6a6e66, dark = 0x2b2c2a, skin = 0xe2b896;
  P.box(0.62, 0.95, 0.36, coat, 0, 1.15, 0); P.box(0.66, 0.5, 0.4, coat, 0, 0.62, 0);
  for (const s of [-1, 1]) { P.box(0.2, 0.62, 0.22, dark, s * 0.15, 0.31, 0); P.box(0.18, 0.75, 0.18, coat, s * 0.42, 1.2, 0, 0, 0, s * 0.12); }
  P.box(0.34, 0.36, 0.32, skin, 0, 1.82, 0); P.box(0.12, 0.04, 0.02, 0x1a1a1a, 0, 1.75, 0.165);
  P.box(0.42, 0.08, 0.42, coat, 0, 2.03, 0.02); P.box(0.36, 0.1, 0.36, dark, 0, 2.1, 0); P.box(0.36, 0.03, 0.14, dark, 0, 2.0, 0.24);
  LEADER.g = new THREE.Mesh(P.build(), VEH_MAT); LEADER.g.position.copy(LEADER.at); scene.add(LEADER.g);
  const E = new Part(), dress = 0x2a3a5a, hair = 0xc8a060;   // Eva: a dark blue dress, fair hair
  E.box(0.5, 0.8, 0.32, dress, 0, 1.2, 0); E.cyl(0.36, 0.26, 0.75, dress, 0, 0.45, 0, 0, 0, 0, 1, 10);
  for (const s of [-1, 1]) { E.box(0.14, 0.7, 0.14, skin, s * 0.34, 1.2, 0, 0, 0, s * 0.1); E.box(0.12, 0.12, 0.2, 0x1a1a1a, s * 0.1, 0.05, 0.03); }
  E.box(0.3, 0.32, 0.28, skin, 0, 1.78, 0); E.box(0.36, 0.22, 0.34, hair, 0, 1.94, -0.03); E.box(0.36, 0.3, 0.12, hair, 0, 1.75, -0.16);
  const ew = bW(b, 17, 11.2); LEADER.eva = new THREE.Mesh(E.build(), VEH_MAT); LEADER.eva.position.set(ew.x, b.F, ew.z); scene.add(LEADER.eva);
  const desk = bW(b, 20.5, 13); LEADER.desk = addMesh(new THREE.BoxGeometry(2.2, 0.85, 1.1), MATS.darkWood, desk.x, b.F + 0.43, desk.z);
  placeClues();
}
// clues: briefcases with a blinking red lamp beside the landmarks; each one found tells you more
const CLUE_SPOTS = [[8, -40], [60, -40], [-195, 24], [-276, 12], [-60, 34], [60, 38]];
function placeClues() {
  if (LEADER.clues.length) return;
  for (const [x, z] of CLUE_SPOTS) {
    const y = groundAt(x, z, heightAt(x, z) + 2), g = new THREE.Group(); g.position.set(x, y, z);
    const P = new Part(); P.box(0.7, 0.5, 0.2, 0x5a3a22, 0, 0.25, 0); P.box(0.3, 0.06, 0.06, 0x2a2a2a, 0, 0.53, 0); P.box(0.72, 0.04, 0.22, 0xb89a4a, 0, 0.36, 0);
    g.add(new THREE.Mesh(P.build(), VEH_MAT));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3020 })); lamp.position.set(0, 0.62, 0); g.add(lamp); g.lamp = lamp;
    scene.add(g); LEADER.clues.push({ g, got: false });
  }
}
function clueText(n) {
  const b = leaderBunker(); if (!b) return '';
  const c = bW(b, 0, 0), dirs = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  const dir = dirs[Math.round(((Math.atan2(c.x, -c.z) * 180 / Math.PI) + 360) % 360 / 45) % 8];
  if (n === 1) return `Captured orders: the Führer's bunker is in the ${dir} part of the battlefield`;
  if (n === 2) return `Radio intercept: his bunker is the one near control point ${b.name}`;
  if (n === 3) return `A captured guard talks: the bunker is ${Math.round(Math.hypot(player.pos.x - c.x, player.pos.z - c.z) / 10) * 10} m from where you stand`;
  return 'Bunker map found! Red smoke now marks the entrance. He is in the deepest room';
}
function updateLeader(dt) {
  placeLeader(); if (!LEADER.g) return;
  // blinking clue lamps, and picking clues up
  const blink = Math.sin(simTime * 6) > 0;
  for (const c of LEADER.clues) {
    if (c.got) continue; c.g.lamp.visible = blink;
    if (player.alive && player.pos.distanceTo(c.g.position) < 2.2) {
      c.got = true; scene.remove(c.g); LEADER.got++;
      showMessage(`CLUE ${Math.min(LEADER.got, 4)} of 4. ${clueText(Math.min(LEADER.got, 4))}`, 7);
      if (LEADER.got >= 4 && !LEADER.smoke) { const b = leaderBunker(), e = bW(b, -B_TRENCH + 2, 0); LEADER.smoke = new THREE.Vector3(e.x, heightAt(e.x, e.z), e.z); }
    }
  }
  if (LEADER.smoke && Math.random() < dt * 12) smokePuff(LEADER.smoke.clone().add(new THREE.Vector3(rand(-1, 1), rand(0, 3), rand(-1, 1))), 0xd83020, rand(1.5, 2.6), 4, 4);
  if (LEADER.found) return;
  LEADER.g.position.y = LEADER.at.y + Math.abs(Math.sin(simTime * 6)) * 0.03;   // trembling
  LEADER.g.rotation.y = Math.atan2(player.pos.x - LEADER.at.x, player.pos.z - LEADER.at.z);
  LEADER.eva.rotation.y = Math.atan2(player.pos.x - LEADER.eva.position.x, player.pos.z - LEADER.eva.position.z);
  if (!LEADER.seen && player.alive && player.team === 'blue' && player.pos.distanceTo(LEADER.at) < 9) { LEADER.seen = true; showMessage('You found Hitler in his bunker! Take him down to end the war. (Leave Eva Braun, she is unarmed)', 5); }
}
// bullets: Hitler can be hit (by the attackers); Eva cannot
function leaderRayHit(origin, dir, maxD, team, best) {
  if (!LEADER.g || LEADER.found || team !== 'blue') return best;
  const t = raySphere(origin, dir, _ldC.set(LEADER.at.x, LEADER.at.y + 1.2, LEADER.at.z), 0.75);
  if (t !== null && t < (best ? best.dist : maxD)) return { dist: t, point: origin.clone().addScaledVector(dir, t), leader: true };
  return best;
}
const _ldC = new THREE.Vector3();
function installLeaderHooks() {
  if (installLeaderHooks.done || typeof rayHit !== 'function' || typeof applyHit !== 'function') return; installLeaderHooks.done = true;
  const rh = rayHit; rayHit = function (o, d, m, team, opts) { return leaderRayHit(o, d, m, team, rh(o, d, m, team, opts)); };
  const ah = applyHit; applyHit = function (hit, d, wpn, shooter) {
    if (hit && hit.leader) { if (shooter && (shooter === player || shooter.isPlayer) && !LEADER.found) { if (typeof unlock === 'function') unlock('warend'); if (!net.active || net.isHost) leaderFound('blue', player.name); else netRequest(['hf']); } return; }
    return ah.apply(this, arguments);
  };
}
function leaderFound(team, name) {
  if (gameOver || team !== 'blue') return;
  LEADER.found = true;
  if (LEADER.g) { LEADER.g.rotation.x = -Math.PI / 2; LEADER.g.position.y = LEADER.at.y + 0.2; }   // he falls
  showMessage(`${name} took down Hitler in his bunker. Eva Braun surrenders. The war in Europe is over!`, 8);
  if (typeof endGame === 'function') endGame('blue');
}
// a third of the red army guards the bunker entrance instead of chasing control points
function installGuardHook() {
  if (installGuardHook.done || typeof chooseObjective !== 'function') return; installGuardHook.done = true;
  const co = chooseObjective; chooseObjective = function (n, exclude) {
    const b = leaderBunker();
    if (GERMANY && b && n.team === 'red' && chars.indexOf(n) % 3 === 0) {
      const e = bW(b, -8, 0); n.goalPoint = { x: e.x, z: e.z, r: 22, owner: 'red', progress: -1, guard: true }; n.goal = randomInPoint(n.goalPoint); n.goalT = rand(40, 70); n.tplan = null; return;
    }
    return co.apply(this, arguments);
  };
}
// ===================== making the battles intense =====================
// Shells: every couple of seconds one lands somewhere in the battle zones, with a whistle first. Like the boats and
// bombers, it follows the clock and a seed, so every player sees the same shell land in the same place.
const BARRAGE = { slot: -1, pending: [], smoke: [], smokeT: 0, shipFlash: [] };
function barrageZones() {
  if (NORMANDY) return [
    { x0: -440, x1: 440, z0: 255, z1: 338, from: 'german' },     // German artillery and mortars falling on the beach
    { x0: -480, x1: 480, z0: 140, z1: 215, from: 'navy' },       // the warships shelling the bunkers on the bluffs
    { x0: -440, x1: 440, z0: 255, z1: 338, from: 'german' },
  ];
  return [{ x0: -190, x1: 190, z0: -190, z1: 190, from: 'artillery' }];   // Berlin: artillery pounding the city
}
function updateBarrage(dt) {
  const every = NORMANDY ? 1.7 : 3.2, now = Date.now() / 1000, slot = Math.floor(now / every);
  if (slot !== BARRAGE.slot) {
    BARRAGE.slot = slot;
    const zs = barrageZones(), z = zs[slot % zs.length];
    const at = new THREE.Vector3(lerp(z.x0, z.x1, seeded01(slot * 3.17)), 0, lerp(z.z0, z.z1, seeded01(slot * 7.71)));
    if (waterDepth(at.x, at.z) > 0.5) at.z -= 20;
    at.y = heightAt(at.x, at.z);
    BARRAGE.pending.push({ at, t: now + 1.3 });
    const d = at.distanceTo(camera.position);
    if (d < 160 && typeof tn === 'function' && typeof actx !== 'undefined' && actx) tn('sine', 1400, 380, 1.25, 0.05 * (1 - d / 160));   // the incoming whistle
    if (z.from === 'navy') { const sh = BARRAGE.ships[Math.floor(seeded01(slot) * BARRAGE.ships.length)]; if (sh) { sh.flash.visible = true; sh.flashT = 0.15; } }
  }
  const host = !net.active || net.isHost;
  for (let i = BARRAGE.pending.length - 1; i >= 0; i--) {
    const p = BARRAGE.pending[i]; if (now < p.t) continue;
    BARRAGE.pending.splice(i, 1);
    explosion(p.at.clone().setY(p.at.y + 0.5), 7, 35, null, 110, !host);
    if (typeof makeCrater === 'function') makeCrater(p.at, 7);
  }
  for (const sh of BARRAGE.ships || []) if (sh.flashT > 0) { sh.flashT -= dt; if (sh.flashT <= 0) sh.flash.visible = false; }
  // smoke rising from burning wrecks and buildings
  BARRAGE.smokeT -= dt;
  if (BARRAGE.smokeT <= 0) { BARRAGE.smokeT = 0.12; for (const s of BARRAGE.smoke) if (s.distanceTo(camera.position) < 450) { smokePuff(s.clone().add(new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1))), Math.random() < 0.2 ? 0xff7a2a : 0x2a2a2a, rand(1.2, 2.2), 4, 3); } }
}
function buildIntensity() {
  // fires that keep burning
  const spots = NORMANDY ? [[-380, 300], [-210, 320], [-90, 280], [70, 305], [230, 290], [400, 315], [-300, 190], [120, 185], [330, 200]]
    : [[-60, 40], [45, -115], [110, 60], [-135, 70], [20, 130], [-100, -20], [140, -140], [-160, 140]];
  for (const [x, z] of spots) BARRAGE.smoke.push(new THREE.Vector3(x, heightAt(x, z) + (GERMANY ? 9 : 1), z));
  if (NORMANDY) {
    // warships out at sea, their big guns flashing as they fire on the bluffs
    BARRAGE.ships = [];
    for (const x of [-520, -170, 180, 520]) {
      const g = new THREE.Group(), P = new Part(), grey = 0x6a7076, dark = 0x4a5056;
      P.box(14, 5, 90, grey, 0, 2.5, 0); P.box(10, 6, 26, dark, 0, 8, -4); P.box(5, 10, 8, dark, 0, 15, -4);   // hull, superstructure, bridge
      P.cyl(1.4, 1.8, 14, dark, 0, 14, 10); for (const z of [-30, -18, 22, 34]) { P.box(6, 2.6, 7, dark, 0, 6.3, z); P.box(0.8, 0.8, 9, dark, 0, 6.6, z - (z < 0 ? 6 : -6)); }   // funnel, gun turrets
      const m = new THREE.Mesh(P.build(), VEH_MAT); g.add(m);
      const flash = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd080 })); flash.position.set(-9, 7, -36); flash.visible = false; g.add(flash);
      g.position.set(x, WATER_Y - 1, 760); g.rotation.y = Math.PI / 2; scene.add(g);
      BARRAGE.ships.push({ g, flash, flashT: 0 });
    }
    // German machine guns in front of the bunkers, for the defenders to man
    for (let x = -480; x <= 480; x += 120) { const z = 206; if (lvFree(x, z, 4) && typeof makeTurret === 'function') makeTurret(x, z, 'mg', Math.PI); }   // facing the sea
  }
}
