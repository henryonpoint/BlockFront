// ===================== levels.js : Normandy beach, Germany 1944 and The Dam =====================
// Ground colours and the buildings for the three newer maps. The big shapes (beach, bluffs, gorge, dam crest)
// are in the terrain itself (core.js rawHeight), so soldiers and vehicles walk and drive on them properly.
// Everything placed here uses the seeded random numbers, so every player builds exactly the same map.
const G_GRID = [-150, -90, -30, 30, 90, 150];   // the old town's street grid (Germany 1944)
const TOWN_R = 178;
function townStreetDist(x, z) {
  let m = Infinity;
  for (const g of G_GRID) { if (Math.abs(z) < TOWN_R) m = Math.min(m, Math.abs(x - g)); if (Math.abs(x) < TOWN_R) m = Math.min(m, Math.abs(z - g)); }
  return m;
}
function terrainColorLevel(x, z, h, slope) {
  const n = vnoise(x * 0.05, z * 0.05), nf = vnoise(x * 0.21 + 9, z * 0.21 - 3), pd = pathDist(x, z);
  let c;
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
}
function buildGermany() {
  // the old town: blocks of tall houses along a cobbled street grid; about a third are bombed-out ruins
  for (let i = 0; i < G_GRID.length + 1; i++) for (let j = 0; j < G_GRID.length + 1; j++) {
    const x0 = i ? G_GRID[i - 1] : -TOWN_R, x1 = i < G_GRID.length ? G_GRID[i] : TOWN_R, z0 = j ? G_GRID[j - 1] : -TOWN_R, z1 = j < G_GRID.length ? G_GRID[j] : TOWN_R;
    if (x1 - x0 < 20 || z1 - z0 < 20) continue;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (Math.hypot(cx, cz) > TOWN_R - 10) continue;
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
  // the church: a long nave and a tall bell tower with a broken spire
  const chx = 0, chz = -52;
  addBlock(chx, chz, 13, 11, 24, LV.stone);
  addBlock(chx, chz + 15, 7.5, 24, 7.5, LV.stone);
  const ty = heightAt(chx, chz + 15) + 24;
  const spire = new THREE.Mesh(new THREE.ConeGeometry(5, 9, 4), new THREE.MeshLambertMaterial({ color: 0x4a5560 })); spire.position.set(chx, ty + 3.5, chz + 15); spire.rotation.set(0.15, Math.PI / 4, 0.1); spire.castShadow = true; scene.add(spire);
  addMesh(new THREE.BoxGeometry(13.6, 0.6, 24.6), LV.stone, chx, heightAt(chx, chz) + 11, chz);
  // war damage across the countryside: tank traps, sandbags, wrecked cars and more rubble
  for (let i = 0; i < 70; i++) { const a = rand(0, 6.28), r = rand(60, 520), x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) > EDGE - 20 || Math.abs(z) > EDGE - 20) continue; if (lvFree(x, z, 3) && waterDepth(x, z) === 0) (Math.random() < 0.5 ? rubble : hedgehog)(x, z); }
  for (let i = 0; i < 14; i++) { const x = rand(-TOWN_R + 10, TOWN_R - 10), z = rand(-TOWN_R + 10, TOWN_R - 10); if (townStreetDist(x, z) < 2.5 && Math.hypot(x, z) < TOWN_R - 10) { let near = false; for (const p of POINTS_DEF) if (Math.hypot(x - p.x, z - p.z) < 14) near = true; if (!near && typeof addCar === 'function') addCar(x, z, Math.random() < 0.5, 0x2a2826); } }
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
  for (let x = -480; x <= 480; x += 80) { const z = 196 + rand(-6, 6); if (lvFree(x, z, 7)) casemate(x, z); }
  // hedgerows: thick earth banks topped with bushes, boxing in the fields inland
  for (let z = 100; z > -500; z -= 75) for (let x = -520; x < 520; x += 8) {
    if (!lvFree(x, z, 2) || waterDepth(x, z) > 0) continue;
    addBlock(x, z, 8, 1.8 + vnoise(x * 0.3, z * 0.3) * 0.8, 2.2, LV.hedge);
  }
  for (let x = -450; x <= 450; x += 90) for (let z = 80; z > -480; z -= 9) {
    if (!lvFree(x, z, 2) || Math.random() < 0.15) continue;
    addBlock(x, z, 2.2, 1.8 + vnoise(x * 0.3, z * 0.3) * 0.8, 9, LV.hedge);
  }
  // French villages inland
  village(PD.F, 8, 20, 40); village(PD.G, 8, 20, 40); village({ x: -120, z: -60 }, 5, 12, 30); village({ x: 140, z: -40 }, 5, 12, 30);
  // wrecked tanks and landing craft on the sand
  for (let i = 0; i < 6; i++) { const x = rand(-450, 450), z = rand(262, 320); if (lvFree(x, z, 5)) rubble(x, z, 1.6); }
}
function buildDam() {
  // the dam: a concrete deck along the crest, walls along both edges, and the huge face dropping into the gorge
  const crestY = 4.2;
  addMesh(new THREE.BoxGeometry(344, 0.5, 13), LV.concrete, 0, crestY + 0.05, -60);
  for (const z of [-66.6, -53.4]) for (let x = -170; x < 170; x += 10) addBlock(x + 5, z, 10, 1.1, 0.6, LV.concrete, { y: crestY });
  const face = new THREE.Mesh(new THREE.BoxGeometry(340, 34, 3), LV.concrete); face.position.set(0, crestY - 16.5, -52.2); face.rotation.x = -0.12; face.receiveShadow = true; scene.add(face);
  for (let x = -160; x <= 160; x += 20) { const rib = new THREE.Mesh(new THREE.BoxGeometry(2.2, 34, 2), new THREE.MeshLambertMaterial({ color: 0x9d9e99 })); rib.position.set(x, crestY - 16.5, -50.6); rib.rotation.x = -0.12; scene.add(rib); }
  // the reservoir side of the wall
  const back = new THREE.Mesh(new THREE.BoxGeometry(340, 14, 1.5), LV.concrete); back.position.set(0, crestY - 6.8, -67.2); scene.add(back);
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
// the bungee jump: drop off the dam into the gorge and a parachute opens for you
function updateLevel(dt) {
  if (!DAM || !player.alive || player.gv || player.vehicle || player.parachute) return;
  if (player.pos.z > -54 && player.pos.z < 60 && Math.abs(player.pos.x) < 150 && player.velY < -9 && player.pos.y - heightAt(player.pos.x, player.pos.z) > 8 && typeof openChute === 'function') {
    openChute(); showMessage('Bungee! Your parachute opened', 2);
  }
}
