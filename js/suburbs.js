// ===================== suburbs.js : Houston's neighbourhoods =====================
// Fills the open ground around the city with suburbs, the way Houston sprawls:
//   streets of homes in different sizes (little bungalows, ranch houses, family homes with garages,
//   big two-storey houses), driveways, mailboxes, back fences and shade trees,
//   strip malls and big grocery stores along the freeways, each with a parking lot full of cars,
//   and gas stations with a canopy and pumps.
// Everything is placed from the map's fixed random seed, so every player gets the same streets.
const HOOD = { houses: [], homes: [], rects: [], stores: [], trees: { oak: [], myrtle: [], palm: [] } };
const HOOD_ROW = 42, HOOD_CROSS = 120;   // street spacing: rows run east to west, cross streets every 120 m

// open ground where suburbs can go: away from the districts, bases, airstrips, lakes, bayou and freeways
function hoodFree(x, z, pad = 0) {
  if (!HOUSTON) return false;
  if (Math.abs(x) > EDGE - 28 || Math.abs(z) > EDGE - 28) return false;
  for (const s of settlements) if (Math.hypot(x - s.x, z - s.z) < s.r + 6 + pad) return false;
  for (const t of TEAMS) if (Math.hypot(x - BASES[t].x, z - BASES[t].z) < 72 + pad) return false;
  if (inRunwayZone(x, z, 12 + pad)) return false;
  for (const L of LAKES) if (Math.hypot(x - L.x, z - L.z) < L.r + 14 + pad) return false;
  if (bayouDist(x, z) < 22 + pad) return false;
  if (freewayDist(x, z) < 15 + pad) return false;
  for (const p of POINTS_DEF) if (Math.hypot(x - p.x, z - p.z) < 34 + pad) return false;
  return true;
}
// where the neighbourhoods are (the rest stays as fields and woods between them)
function hoodAt(x, z) { return hoodFree(x, z) && vnoise(x * 0.0065 + 3, z * 0.0065 - 9) > 0.3; }
function hoodClash(minX, maxX, minZ, maxZ) { for (const r of HOOD.rects) if (minX < r[1] && maxX > r[0] && minZ < r[3] && maxZ > r[2]) return true; return false; }

// shared materials, so the whole suburb merges into a handful of draw calls
let HM = null;
function hoodMats() {
  if (HM) return HM;
  const lam = c => new THREE.MeshLambertMaterial({ color: c });
  const wall = (hex, rx, ry) => new THREE.MeshLambertMaterial({ map: texRepeat(wallTex(hex), rx, ry) });
  const walls = ['#e8dcc0', '#c9d8e6', '#e6b9a6', '#cfe0c3', '#f1efe8', '#e3cf9a', '#d8c8b0', '#bfcad6'];
  HM = {
    wallS: walls.map(c => wall(c, 2, 1)), wallM: walls.map(c => wall(c, 3, 1)), wallL: walls.map(c => wall(c, 4, 2)),
    brickM: new THREE.MeshLambertMaterial({ map: texRepeat(TEX.brick, 4, 1) }), brickL: new THREE.MeshLambertMaterial({ map: texRepeat(TEX.brick, 5, 2) }),
    roofs: [0x5a5d62, 0x6b4a3a, 0x7a6a5a, 0x46484c, 0x8a5a3a, 0x3e4a5a].map(lam),
    trim: lam(0xf2efe8), garage: lam(0xe8e6e0), concrete: lam(0xb8b4aa), asphalt: lam(0x3a3b3e), fence: lam(0x9a7a52),
    mailbox: lam(0x2a2a2e), glass: lam(0x2e4a5e), stucco: lam(0xe2d6c0), stucco2: lam(0xcfc2aa), dark: lam(0x2a2e34),
    awn: [0xc0392b, 0x2a6ab8, 0x2e8b57, 0xd8a020, 0x7a3ab8, 0x1d1d22].map(lam), canopy: lam(0xf2f2f0), red: lam(0xc8262a), pump: lam(0xdcdcdc),
  };
  return HM;
}

// a terrain-hugging flat strip (streets, lots), collected and drawn as one mesh per surface
const _hoodStrips = new Map();
function hoodStrip(key, x0, z0, x1, z1, w, lift, uvLen, uvW) {
  const L = Math.hypot(x1 - x0, z1 - z0); if (L < 1) return;
  const ux = (x1 - x0) / L, uz = (z1 - z0) / L, rx = -uz * w / 2, rz = ux * w / 2, n = Math.max(1, Math.ceil(L / 4));
  let a = _hoodStrips.get(key); if (!a) _hoodStrips.set(key, a = { pos: [], uv: [] });
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, P = [];
    for (const [t, s] of [[t0, -1], [t0, 1], [t1, 1], [t0, -1], [t1, 1], [t1, -1]]) {
      const x = x0 + (x1 - x0) * t + rx * s, z = z0 + (z1 - z0) * t + rz * s;
      a.pos.push(x, heightAt(x, z) + lift, z); a.uv.push(s < 0 ? 0 : (uvW ? w / uvW : 1), t * L / uvLen);
    }
  }
}
function flushHoodStrips() {
  const T = hTex();
  const lot = canvasTex(64, 64, g => { g.fillStyle = '#45474b'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 160; i++) { const v = 58 + Math.random() * 22 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); } g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, 2, 40); g.fillRect(32, 0, 2, 40); });
  for (const [key, a] of _hoodStrips) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2)); g.computeVertexNormals();
    let map = key === 'street' ? T.road.clone() : key === 'lot' ? lot : null;
    if (map) { map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.magFilter = THREE.LinearFilter; }
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map, color: map ? 0xffffff : 0xaaa69c, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.receiveShadow = true; scene.add(m);
  }
  _hoodStrips.clear();
}

// ---------- homes ----------
// kind 0 bungalow, 1 ranch house, 2 family home with a garage, 3 big two-storey house with a double garage
function hoodHome(x, z, face, kind, st) {
  const M = hoodMats();
  const dims = [[8, 7, 3.3], [14, 7.5, 3.4], [11, 8, 3.6], [13, 10, 6.6]][kind];
  const [w, d, h] = dims;
  const brick = Math.random() < (kind === 3 ? 0.55 : 0.3);
  const ci = Math.floor(Math.random() * 8);
  const wallMat = brick ? (kind === 3 ? M.brickL : M.brickM) : (kind === 3 ? M.wallL : kind === 0 ? M.wallS : M.wallM)[ci];
  const m = addBlock(x, z, w, h, d, wallMat);
  const top = m.userData.top, base = top - h - 0.4, roofM = pick(M.roofs);
  // gable roof along the long side, with a trim band under the eaves
  const roof = addMesh(prismGeo(d + 1, d * (kind === 3 ? 0.36 : 0.4), w + 1), roofM, x, top, z); roof.rotation.y = Math.PI / 2;
  addMesh(new THREE.BoxGeometry(w + 0.3, 0.22, d + 0.3), M.trim, x, top - 0.11, z, false);
  if (Math.random() < 0.35) addMesh(new THREE.CylinderGeometry(0.4, 0.45, 2, 6), MATS.brick, x + w * 0.3, top + 1.5, z - face * 0.8);
  const fz = z + face * (d / 2 + 0.07);
  // front door with a little porch roof and step
  const doorX = x + (kind === 1 ? -w * 0.15 : 0);
  addMesh(new THREE.BoxGeometry(1.2, 2.2, 0.14), MATS.door, doorX, base + 0.4 + 1.1, fz, false);
  addMesh(new THREE.BoxGeometry(2.2, 0.25, 1.1), M.concrete, doorX, base + 0.5, z + face * (d / 2 + 0.55), false);
  const porch = addMesh(new THREE.BoxGeometry(2.8, 0.12, 1.5), roofM, doorX, base + 0.4 + 2.75, z + face * (d / 2 + 0.75), false); porch.rotation.x = face * 0.25;
  for (const sx of [-1.25, 1.25]) addMesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6), M.trim, doorX + sx, base + 0.4 + 1.3, z + face * (d / 2 + 1.4), false);
  // garage on one side, facing the street, with a driveway out to the curb
  const gs = Math.random() < 0.5 ? -1 : 1, streetEdge = st - face * 3.6;
  let driveX = x + gs * (w / 2 - 1.8), driveW = 3.2;
  if (kind >= 2) {
    const gw = kind === 3 ? 7 : 4.6, gx = x + gs * (w / 2 + gw / 2 - 0.05), gd = d - 1;
    const gm = addBlock(gx, z + face * 0.5, gw, 3, gd, brick ? M.brickM : M.wallM[ci]);
    const gr = addMesh(prismGeo(gw + 0.6, 1.1, gd + 0.6), roofM, gx, gm.userData.top, z + face * 0.5);
    addMesh(new THREE.BoxGeometry(gw - 1, 2.3, 0.1), M.garage, gx, gm.userData.top - 3 + 1.2, z + face * (0.5 + gd / 2 + 0.06), false);
    driveX = gx; driveW = gw - 0.6;
    HOOD.rects.push([gx - gw / 2, gx + gw / 2, z - d / 2, z + d / 2]);
  }
  // driveway and a path to the front door
  const dz0 = z + face * (d / 2 - (kind >= 2 ? 0.5 : -0.1)), dLen = Math.abs(streetEdge - dz0);
  hoodStrip('concrete', driveX, dz0, driveX, streetEdge, driveW, 0.05, 4);
  if (kind < 2) hoodStrip('concrete', doorX, z + face * (d / 2 + 1.1), doorX, streetEdge, 1.2, 0.045, 4);
  // mailbox at the curb
  const mx = driveX + gs * (driveW / 2 + 1.2), mz = streetEdge - face * 0.5, my = heightAt(mx, mz);
  addMesh(new THREE.BoxGeometry(0.1, 1.1, 0.1), M.fence, mx, my + 0.55, mz, false);
  addMesh(new THREE.BoxGeometry(0.28, 0.3, 0.5), M.mailbox, mx, my + 1.2, mz, false);
  // a wooden fence along the back of some yards
  if (Math.random() < 0.45) { const bz = st - face * (HOOD_ROW / 2), by = heightAt(x, bz); addMesh(new THREE.BoxGeometry(15.5, 1.7, 0.1), M.fence, x, by + 0.8, bz, false); }
  // shade trees: one in the back yard, sometimes one out front
  if (Math.random() < 0.75) hoodTree(x + rand(-w / 2, w / 2), z - face * (d / 2 + rand(2.5, 4.5)), Math.random() < 0.7 ? 'oak' : 'myrtle');
  if (Math.random() < 0.35) hoodTree(x - gs * (w / 2 - 1), z + face * (d / 2 + 3.5), Math.random() < 0.5 ? 'myrtle' : Math.random() < 0.5 ? 'palm' : 'oak');
  HOOD.rects.push([x - w / 2 - 1, x + w / 2 + 1, z - d / 2 - 1, z + d / 2 + 1]);
  HOOD.houses.push({ x, z, face, kind, drive: { x: driveX, z: (dz0 + streetEdge) / 2, len: dLen } });
}
function hoodTree(x, z, kind) {
  if (pathDist(x, z) < 6 || freewayDist(x, z) < 12) return;
  const s = kind === 'oak' ? rand(0.9, 1.35) : kind === 'palm' ? rand(0.85, 1.15) : rand(0.8, 1.1), y = heightAt(x, z);
  HOOD.trees[kind].push({ x, z, y, s, r: rand(0, 6.28) });
  addCircle(x, z, (kind === 'oak' ? 0.5 : 0.3) * s, y + 6 * s);
}
function buildHoodTrees() {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const geos = {
    // a Houston live oak: short thick trunk and a wide, low, dark canopy
    oak: (() => { const P = new Part(); P.cyl(0.32, 0.5, 3.2, 0x5a4030, 0, 1.6, 0, 0, 0, 0, 1, 8); P.cyl(0.14, 0.22, 2.4, 0x5a4030, 0.9, 2.9, 0, 0, 0, -0.8, 1, 6); P.cyl(0.14, 0.22, 2.4, 0x5a4030, -0.8, 2.9, 0.3, 0, 0, 0.8, 1, 6);
      for (const [bx, by, bz, r] of [[0, 4.6, 0, 2.6], [1.9, 4.1, 0.6, 1.9], [-1.8, 4.2, -0.5, 2], [0.4, 4.3, 1.9, 1.8], [-0.5, 4.4, -1.8, 1.8]]) P.add(blobGeo(r, 1, 0.16), 0xffffff, bx, by, bz, 0, 0, 0, 1, 0.72, 1);
      return P.build(); })(),
    // crepe myrtle: thin grey trunks and a round puff of pink, purple or white flowers
    myrtle: (() => { const P = new Part(); for (const a of [0, 2.1, 4.2]) P.cyl(0.06, 0.1, 2.6, 0x8a8078, Math.cos(a) * 0.25, 1.3, Math.sin(a) * 0.25, Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15, 1, 5);
      P.add(blobGeo(1.5, 1, 0.22), 0xffffff, 0, 3.2, 0, 0, 0, 0, 1.1, 0.85, 1.1); return P.build(); })(),
    // palm: tall thin trunk with a crown of drooping fronds
    palm: (() => { const P = new Part(); P.cyl(0.18, 0.28, 8, 0x8a7458, 0, 4, 0, 0, 0, 0, 1, 7);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; P.box(0.5, 0.06, 2.6, 0xffffff, Math.sin(a) * 1.2, 7.9, Math.cos(a) * 1.2, 0.45, a, 0); }
      P.ball(0.35, 0x6a5a40, 0, 8.05, 0); return P.build(); })(),
  };
  const tint = { oak: () => col.setHSL(rand(0.24, 0.3), rand(0.4, 0.55), rand(0.22, 0.3)), myrtle: () => col.setHex(pick([0xe06aa8, 0xc070d0, 0xf2f0f0, 0xe0508a])), palm: () => col.setHSL(rand(0.22, 0.28), 0.5, rand(0.3, 0.38)) };
  for (const k of ['oak', 'myrtle', 'palm']) {
    const list = HOOD.trees[k]; if (!list.length) continue;
    const im = new THREE.InstancedMesh(geos[k], mat, list.length);
    list.forEach((t, i) => { q.setFromAxisAngle(up, t.r); sc.set(t.s, t.s, t.s); p.set(t.x, t.y - 0.1, t.z); m4.compose(p, q, sc); im.setMatrixAt(i, m4); im.setColorAt(i, tint[k]()); });
    // trunks stay brown: the canopy colour is in the vertex colours (white), the trunk colours are dark and barely tinted
    im.castShadow = true; im.receiveShadow = true; scene.add(im);
  }
}

// ---------- stores ----------
const STORE_NAMES = ['TACOS', 'DONUTS', 'PHARMACY', 'BBQ', 'PIZZA', 'NAILS', 'PHO', 'TIRES', 'LAUNDRY', 'BOOTS', 'BANK', 'KOLACHES', 'HARDWARE', 'PAWN', 'CAFE', 'BURGERS', 'VIDEO GAMES', 'BARBER', 'DENTIST', 'SUSHI', 'GYM', 'PET SHOP', 'PHONES', 'ICE CREAM'];
const SIGN_COLS = [['#c0392b', '#ffffff'], ['#1d3a6b', '#ffffff'], ['#f2f2f2', '#c0392b'], ['#2e7d4a', '#ffffff'], ['#1d1d22', '#f2c230'], ['#f2c230', '#1d1d22'], ['#7a3ab8', '#ffffff'], ['#ffffff', '#1d3a6b']];
// a site beside a freeway: a is the direction along the road, n points from the road to the building
function hoodSite(cx, cz, a, n, lu, lv) {
  const W = Math.abs(a.x) * lu + Math.abs(n.x) * lv, D = Math.abs(a.z) * lu + Math.abs(n.z) * lv;
  return { minX: cx - W / 2, maxX: cx + W / 2, minZ: cz - D / 2, maxZ: cz + D / 2, W, D };
}
function streetDist(x, z) { let m = Infinity; for (let i = H_FREEWAYS.length; i < PATHS.length; i++) { const [a, b] = PATHS[i]; m = Math.min(m, distToSeg(x, z, a.x, a.z, b.x, b.z)); } return m; }
function storeSiteOk(o, lu, lv, r) {
  // the front edge sits right on the freeway, so only the back half has to be clear of it
  for (const u of [-lu / 2, 0, lu / 2]) for (const v of [lv * 0.45, lv]) { const p = sL2W(o, u, v); if (!hoodFree(p.x, p.z, -3)) return false; }
  for (const u of [-lu / 2, 0, lu / 2]) for (const v of [2, lv * 0.5, lv]) { const p = sL2W(o, u, v); if (streetDist(p.x, p.z) < 9) return false; for (const sv of settlements) if (Math.hypot(p.x - sv.x, p.z - sv.z) < sv.r) return false; }
  return !hoodClash(r.minX - 4, r.maxX + 4, r.minZ - 4, r.maxZ + 4);
}
// local frame helpers: u along the road, v away from it
function sL2W(o, u, v) { return { x: o.x + o.a.x * u + o.n.x * v, z: o.z + o.a.z * u + o.n.z * v }; }
function sbox(o, u, v, lu, lv) { return { x: o.x + o.a.x * u + o.n.x * v, z: o.z + o.a.z * u + o.n.z * v, w: Math.abs(o.a.x) * lu + Math.abs(o.n.x) * lv, d: Math.abs(o.a.z) * lu + Math.abs(o.n.z) * lv }; }
function signYaw(o) { const fx = -o.n.x, fz = -o.n.z; return Math.atan2(fx, fz); }   // faces back towards the road

function stripMall(o, big) {
  const M = hoodMats(), lu = big ? 46 : 52, lv = big ? 30 : 14, park = 20, ry = signYaw(o);
  const bv = park + lv / 2 + 2;                         // building centre, measured from the site front
  const b = sbox(o, 0, bv, lu, lv);
  const bm = addBlock(b.x, b.z, b.w, big ? 8 : 5.5, b.d, Math.random() < 0.5 ? M.stucco : M.stucco2);
  const top = bm.userData.top, base = top - (big ? 8 : 5.5) - 0.4, fv = bv - lv / 2 - 0.06;
  const par = sbox(o, 0, fv - 0.25, lu + 0.4, 0.6); addMesh(new THREE.BoxGeometry(par.w, 1.6, par.d), M.dark, par.x, top + 0.4, par.z);
  const n = big ? 1 : 5, names = [];
  for (let i = 0; i < n; i++) {
    const su = -lu / 2 + (i + 0.5) * lu / n, sw = lu / n, name = big ? pick(['GROCERY', 'SUPERMARKET', 'FOOD MART']) : pick(STORE_NAMES.filter(s => !names.includes(s))); names.push(name);
    const gl = sbox(o, su, fv, sw - (big ? 14 : 2.6), 0.12); addMesh(new THREE.BoxGeometry(gl.w, 2.5, gl.d), M.glass, gl.x, base + 0.4 + 1.5, gl.z, false);
    const dr = sbox(o, su + (big ? 0 : sw * 0.3), fv - 0.04, big ? 4 : 1.4, 0.14); addMesh(new THREE.BoxGeometry(dr.w, 2.4, dr.d), M.dark, dr.x, base + 0.4 + 1.2, dr.z, false);
    const aw = sbox(o, su, fv - 0.9, sw - 1, 1.8), am = addMesh(new THREE.BoxGeometry(aw.w, 0.14, aw.d), pick(M.awn), aw.x, base + 0.4 + 3.1, aw.z, false);
    const [bg, fg] = pick(SIGN_COLS), sp = sL2W(o, su, fv - 0.35);
    hSign(name, sp.x, base + 0.4 + (big ? 6 : 4.4), sp.z, big ? 18 : Math.min(sw - 1.6, 8.5), big ? 2.6 : 1.3, ry, bg, fg, false);
  }
  // the parking lot in front, with rows of parked cars and tall lights
  const p0 = sL2W(o, -lu / 2, 1), p1 = sL2W(o, lu / 2, 1), pm = sL2W(o, 0, 1 + park / 2);
  const lotStart = sL2W(o, 0, 0.5), lotEnd = sL2W(o, 0, park + 1.5);
  hoodStrip('lot', lotStart.x, lotStart.z, lotEnd.x, lotEnd.z, lu, 0.06, 10, 6.4);
  for (const lv2 of [5.5, 14]) for (let u = -lu / 2 + 3; u < lu / 2 - 2; u += 3.2) if (Math.random() < (big ? 0.3 : 0.22)) {
    const c = sL2W(o, u + rand(-0.2, 0.2), lv2 + rand(-0.3, 0.3));
    addCar(c.x, c.z, Math.abs(o.n.x) > 0.5, pick([0xffffff, 0x1d1d22, 0xd8262a, 0x2a5aa8, 0x8a8a8a, 0xc8c8c8, 0x2e6b3a, 0x7a2a2a, 0xd8a020]));
  }
  for (const u of [-lu / 3, lu / 3]) { const lp = sL2W(o, u, park / 2 + 1), ly = heightAt(lp.x, lp.z); addMesh(new THREE.CylinderGeometry(0.15, 0.22, 9, 6), MATS.steel, lp.x, ly + 4.5, lp.z); addMesh(new THREE.BoxGeometry(1.4, 0.3, 0.6), MATS.steel, lp.x, ly + 9, lp.z); addCircle(lp.x, lp.z, 0.25, ly + 9); }
  // a tall roadside sign
  const rs = sL2W(o, lu / 2 - 3, 2), rsy = heightAt(rs.x, rs.z);
  addMesh(new THREE.BoxGeometry(0.5, 9, 0.5), MATS.steel, rs.x, rsy + 4.5, rs.z); addCircle(rs.x, rs.z, 0.35, rsy + 9);
  hSign(big ? 'GROCERY' : 'SHOPS', rs.x, rsy + 10, rs.z, 5, 2.4, ry, '#1d3a6b', '#ffffff', false);
  HOOD.homes.push({ x: pm.x, z: pm.z, r: 30, n: big ? 4 : 3 });
}
function gasStation(o) {
  const M = hoodMats(), ry = signYaw(o);
  // canopy on four posts over the pumps
  const cv = 12, cy = heightAt(sL2W(o, 0, cv).x, sL2W(o, 0, cv).z);
  const cb = sbox(o, 0, cv, 18, 10); addMesh(new THREE.BoxGeometry(cb.w, 0.9, cb.d), M.canopy, cb.x, cy + 5.4, cb.z);
  const band = sbox(o, 0, cv - 5.05, 18, 0.1); addMesh(new THREE.BoxGeometry(band.w, 0.5, band.d), M.red, band.x, cy + 5.4, band.z, false);
  for (const [u, v] of [[-7, -3.5], [7, -3.5], [-7, 3.5], [7, 3.5]]) { const pp = sL2W(o, u, cv + v); addMesh(new THREE.BoxGeometry(0.4, 5, 0.4), M.canopy, pp.x, cy + 2.5, pp.z); addCircle(pp.x, pp.z, 0.3, cy + 5); }
  for (const u of [-4.5, 0, 4.5]) { const pp = sbox(o, u, cv, 1.2, 0.7); addBlock(pp.x, pp.z, pp.w, 1.8, pp.d, M.pump, { los: false }); }
  const lotS = sL2W(o, 0, 1), lotE = sL2W(o, 0, 26);
  hoodStrip('concrete', lotS.x, lotS.z, lotE.x, lotE.z, 26, 0.055, 6);
  // the little shop behind
  const sb = sbox(o, 0, 30, 14, 9); const sm = addBlock(sb.x, sb.z, sb.w, 4, sb.d, M.stucco);
  const sg = sbox(o, 0, 25.44, 9, 0.12); addMesh(new THREE.BoxGeometry(sg.w, 2.3, sg.d), M.glass, sg.x, sm.userData.top - 4 + 1.4, sg.z, false);
  const sp = sL2W(o, 0, 25.1); hSign('FOOD MART', sp.x, sm.userData.top - 0.8, sp.z, 7, 1.1, ry, '#c8262a', '#ffffff', false);
  // price sign on a pole by the road
  const ps = sL2W(o, -11, 2), psy = heightAt(ps.x, ps.z);
  addMesh(new THREE.BoxGeometry(0.4, 7, 0.4), MATS.steel, ps.x, psy + 3.5, ps.z); addCircle(ps.x, ps.z, 0.3, psy + 7);
  hSign('GAS\n$2.79', ps.x, psy + 8, ps.z, 3.2, 3, ry, '#c8262a', '#ffffff', false);
  if (Math.random() < 0.7) { const c = sL2W(o, rand(-4.5, 4.5) + 2.2, cv); addCar(c.x, c.z, Math.abs(o.a.x) > 0.5, pick([0xffffff, 0x1d1d22, 0xd8262a, 0x8a8a8a])); }
  HOOD.homes.push({ x: lotE.x, z: lotE.z, r: 18, n: 2 });
}
let STORE_PLAN = null;
function planStores() {
  if (STORE_PLAN) return STORE_PLAN;
  STORE_PLAN = [];
  const sites = [];
  // frontage along I-10 (runs east-west) and I-45 (north-south), both sides, outside the 610 Loop
  for (let x = -520; x <= 520; x += 64) for (const s of [-1, 1]) sites.push({ x, z: 190 + s * 9.5, a: { x: 1, z: 0 }, n: { x: 0, z: s } });
  for (let z = -500; z <= 500; z += 64) for (const s of [-1, 1]) sites.push({ x: 110 + s * 9.5, z, a: { x: 0, z: 1 }, n: { x: s, z: 0 } });
  let i = 0; const cap = LITE ? 8 : 16;
  for (const st of sites) {
    if (STORE_PLAN.length >= cap) break;
    const kind = ['mall', 'gas', 'mall', 'big', 'gas', 'mall'][i % 6];
    const lu = kind === 'gas' ? 26 : kind === 'big' ? 46 : 52, lv = kind === 'gas' ? 36 : kind === 'big' ? 54 : 38;
    const o = { x: st.x, z: st.z, a: st.a, n: st.n };
    const c = sL2W(o, 0, lv / 2), r = hoodSite(c.x, c.z, o.a, o.n, lu, lv);
    if (!storeSiteOk(o, lu, lv, r)) continue;
    i++;
    STORE_PLAN.push({ kind, o, x: c.x, z: c.z, r });
    HOOD.rects.push([r.minX, r.maxX, r.minZ, r.maxZ]);
  }
  return STORE_PLAN;
}
// is this spot on a store's lot? (keeps trees, rocks and grass off the parking)
function storeAt(x, z) { if (!HOUSTON) return false; for (const s of planStores()) if (x > s.r.minX - 3 && x < s.r.maxX + 3 && z > s.r.minZ - 3 && z < s.r.maxZ + 3) return true; return false; }
function buildStores() {
  for (const s of planStores()) {
    if (s.kind === 'gas') gasStation(s.o); else stripMall(s.o, s.kind === 'big');
    HOOD.stores.push(s);
  }
}

// ---------- streets of homes ----------
function buildHoodStreets() {
  const rows = new Map();                      // row street z -> list of house x
  let made = 0; const cap = LITE ? 220 : 560;
  const crossNear = x => Math.abs(x - (Math.round((x - 60) / HOOD_CROSS) * HOOD_CROSS + 60));
  for (let zs = -EDGE + 40; zs < EDGE - 30; zs += HOOD_ROW) {
    for (const side of [-1, 1]) {
      const hz = zs + side * 13, face = -side;
      for (let x = -EDGE + 30 + (side > 0 ? 0 : 8); x < EDGE - 30; x += 16) {
        if (made >= cap) break;
        if (crossNear(x) < 12) continue;
        if (!hoodAt(x, hz) || !hoodAt(x - 8, hz - 7) || !hoodAt(x + 8, hz + 7) || !hoodAt(x - 8, hz + 7) || !hoodAt(x + 8, hz - 7)) continue;
        if (pathDist(x, hz) < 13 || pathDist(x, zs) < 4 || freewayDist(x, zs) < 14) continue;
        if (hoodClash(x - 9, x + 9, hz - 7, hz + 7)) continue;
        // neighbourhoods have a character: some streets are little bungalows, some big houses
        const rich = vnoise(x * 0.011 + 40, zs * 0.011 - 12), r = Math.random();
        const kind = rich > 0.62 ? (r < 0.7 ? 3 : 2) : rich > 0.42 ? (r < 0.5 ? 2 : r < 0.8 ? 1 : 3) : (r < 0.55 ? 0 : r < 0.85 ? 1 : 2);
        hoodHome(x, hz, face, kind, zs); made++;
        let a = rows.get(zs); if (!a) rows.set(zs, a = []); a.push(x);
      }
    }
  }
  // paint the streets: each row street where it has houses, then the cross streets joining neighbouring rows
  const runs = new Map();
  for (const [zs, xs] of rows) {
    xs.sort((a, b) => a - b); const list = []; let s = xs[0], e = xs[0];
    for (const x of xs.slice(1)) { if (x - e > 40) { list.push([s, e]); s = x; } e = x; }
    list.push([s, e]); runs.set(zs, list);
    for (const [a, b] of list) {
      const x0 = Math.max(-EDGE + 20, a - 10), x1 = Math.min(EDGE - 20, b + 10);
      hoodStrip('street', x0, zs, x1, zs, 7, 0.06, 8);
      // street trees in the front yards, on the lot lines
      for (let x = a; x <= b; x += 16) for (const s2 of [-1, 1]) if (Math.random() < 0.35) hoodTree(x + 8, zs + s2 * 5.6, Math.random() < 0.65 ? 'oak' : Math.random() < 0.6 ? 'myrtle' : 'palm');
      // street lamps now and then
      for (let x = a + 4; x <= b; x += 48) { const lz = zs + 4.2; if (pathDist(x, lz) > 5) lamp(x, lz); }
    }
  }
  const covers = (zs, x) => (runs.get(zs) || []).some(([a, b]) => x >= a - 12 && x <= b + 12);
  for (let cx = 60 - HOOD_CROSS * 5; cx <= EDGE; cx += HOOD_CROSS) {
    for (const zs of [...runs.keys()].sort((a, b) => a - b)) {
      if (covers(zs, cx) && covers(zs + HOOD_ROW, cx) && pathDist(cx, zs + HOOD_ROW / 2) > 6) hoodStrip('street2', cx, zs - 3.5, cx, zs + HOOD_ROW + 3.5, 7, 0.075, 8);
      // a dead end street still gets a short stub out to the nearest main road when one is close
    }
  }
  // cars parked in some driveways
  let cars = 0; const carCap = LITE ? 20 : 48;
  for (const h of HOOD.houses) { if (cars >= carCap) break; if (h.kind > 0 && Math.random() < 0.22) { addCar(h.drive.x, h.drive.z + h.face * 0.5, false, pick([0xffffff, 0x1d1d22, 0xd8262a, 0x2a5aa8, 0x8a8a8a, 0xc8c8c8, 0x2e6b3a, 0x7a2a2a])); cars++; } }
  // every so often a group of homes becomes a place where civilians live and walk
  HOOD.houses.forEach((h, i) => { if (i % 14 === 4) HOOD.homes.push({ x: h.x, z: h.z + h.face * 8, r: 40, n: 2 }); });
}
function buildSuburbs() {
  if (!HOUSTON) return;
  buildStores();
  buildHoodStreets();
  // cross streets reuse the street texture
  const s2 = _hoodStrips.get('street2'); if (s2) { const s1 = _hoodStrips.get('street') || { pos: [], uv: [] }; s1.pos = s1.pos.concat(s2.pos); s1.uv = s1.uv.concat(s2.uv); _hoodStrips.set('street', s1); _hoodStrips.delete('street2'); }
  flushHoodStrips();
  buildHoodTrees();
}
