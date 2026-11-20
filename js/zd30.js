// ===================== zd30.js : Zero Dark 30 (the Abbottabad raid) and co-op mode =====================
// Zero Dark 30 is a night mission based on the raid of 2 May 2011 on the walled compound in Bilal Town,
// Abbottabad. What follows the record: walls up to 18 feet high topped with barbed wire, two security gates,
// a three-storey main house with few outside windows and a 7-foot privacy wall round the third-floor terrace,
// a smaller guest house, one helicopter coming down inside the walls in the animal pen, the team blowing their
// way through the inner walls and gates, clearing the guest house first, then the house floor by floor, with a
// locked metal gates on the stairs and the target in a third-floor room. Invented for the game: more armed guards,
// fighters from the streets coming in waves, the mission clock, and the helicopter that picks you up at the end.
// Only armed fighters are in the game: no families, no civilians.
//
// Co-op (Berlin and this raid): every player is on blue. The computer side comes in waves, and the battle is won by
// taking down the target (Hitler in Berlin, the target on the third floor here).
const ZD_GRID = [
  [
    "###########dd#############",
    "#        #    #    #     #",
    "#                  #     #",
    "#        #    #          #",
    "#        ##  ##    #     #",
    "#         #  ##    #     #",
    "#         #  ##    #     #",
    "###########  #############",
    "#         #  #     #SS####",
    "#            #     #SS####",
    "####      #        #SS####",
    "#   #     #  #     #SS####",
    "#         #  #     #SS####",
    "#   #     #  #     #gg####",
    "#                         ",
    "#                        #",
    "### ##### #### #### ### ##",
    "#      #   #      #  #   #",
    "#      #   #      #  #   #",
    "#      #   #      #  #   #",
    "#      #   #      #  #   #",
    "##########################",
  ],
  [
    "##########################",
    "#      #   #      #      #",
    "#      #   #      #      #",
    "#      #   #      #      #",
    "#      #   #      #      #",
    "### ##### #### ###### ####",
    "#                        #",
    "#                     #gg#",
    "###########  #######oo#UU#",
    "#         #  #     #oo#UU#",
    "#         #  #     #oo#UU#",
    "#                  #oo#UU#",
    "#         #  #     #oo#UU#",
    "#         #  #     #######",
    "###########  #############",
    "#   #     #  #       #   #",
    "#         #  #       #   #",
    "#   #                #   #",
    "####      #  #           #",
    "#         #  #       #   #",
    "#         #  #       #   #",
    "###########  #############",
  ],
  [
    "qqqqqqqqqqqqqqqqqqqqqqqqqq",
    "qrrrrrrrrrrrrrrrrrrrrrrrrq",
    "qrrrrrrrrrrrrrrrrrrrrrrrrq",
    "qrrrrrrrrrrrrrrrrrrrrrrrrq",
    "pppppppppppp##############",
    "pTTTTTTTTTTT#     #   #  #",
    "pTTTTTTTTTTT#         #  #",
    "pTTTTTTTTTTT#  B  #   ####",
    "pTTTTTTTTTTTT     #####oo#",
    "pTTTTTTTTTTT#     #   #oo#",
    "pTTTTTTTTTTT#     #   #oo#",
    "pTTTTTTTTTTT#     #   #oo#",
    "pTTTTTTTTTTT#### ### ##oo#",
    "pTTTTTTTTTTT#            #",
    "pTTTTTTTTTTT#            #",
    "pTTTTTTTTTTT### #### ## ##",
    "pTTTTTTTTTTT#     #   #  #",
    "pTTTTTTTTTTT#     #   #  #",
    "pppppppppppp##############",
    "qrrrrrrrrrrrrrrrrrrrrrrrrq",
    "qrrrrrrrrrrrrrrrrrrrrrrrrq",
    "qqqqqqqqqqqqqqqqqqqqqqqqqq",
  ],
];
// the rooms (floor, kind, first and last column, first and last row): furniture, lamps and who lives where
const ZD_ROOMS = [{k: 0, name: "living", c0: 1, c1: 8, r0: 1, r1: 6}, {k: 0, name: "bedroom", c0: 1, c1: 9, r0: 8, r1: 13}, {k: 0, name: "bath", c0: 1, c1: 3, r0: 11, r1: 13}, {k: 0, name: "kitchen", c0: 15, c1: 18, r0: 1, r1: 6}, {k: 0, name: "storage", c0: 20, c1: 24, r0: 1, r1: 6}, {k: 0, name: "storage", c0: 14, c1: 18, r0: 8, r1: 13}, {k: 0, name: "bedroom", c0: 1, c1: 6, r0: 17, r1: 20}, {k: 0, name: "bath", c0: 8, c1: 10, r0: 17, r1: 20}, {k: 0, name: "bedroom", c0: 12, c1: 17, r0: 17, r1: 20}, {k: 0, name: "bath", c0: 19, c1: 20, r0: 17, r1: 20}, {k: 0, name: "bedroom", c0: 22, c1: 24, r0: 17, r1: 20}, {k: 1, name: "bedroom", c0: 1, c1: 6, r0: 1, r1: 4}, {k: 1, name: "bath", c0: 8, c1: 10, r0: 1, r1: 4}, {k: 1, name: "bedroom", c0: 12, c1: 17, r0: 1, r1: 4}, {k: 1, name: "kitchen", c0: 19, c1: 24, r0: 1, r1: 4}, {k: 1, name: "classroom", c0: 1, c1: 9, r0: 9, r1: 13}, {k: 1, name: "bedroom", c0: 1, c1: 9, r0: 15, r1: 20}, {k: 1, name: "bath", c0: 1, c1: 3, r0: 15, r1: 17}, {k: 1, name: "bedroom", c0: 14, c1: 18, r0: 9, r1: 13}, {k: 1, name: "bedroom", c0: 14, c1: 20, r0: 15, r1: 20}, {k: 1, name: "bath", c0: 22, c1: 24, r0: 15, r1: 20}, {k: 2, name: "master", c0: 13, c1: 17, r0: 5, r1: 11}, {k: 2, name: "bath", c0: 19, c1: 21, r0: 5, r1: 7}, {k: 2, name: "kitchenette", c0: 19, c1: 21, r0: 9, r1: 11}, {k: 2, name: "study", c0: 13, c1: 17, r0: 16, r1: 17}, {k: 2, name: "media", c0: 19, c1: 21, r0: 16, r1: 17}, {k: 2, name: "store", c0: 23, c1: 24, r0: 16, r1: 17}];
const ZD_TOP = { c0: 12, c1: 25, r0: 4, r1: 18 };   // where the third floor stands on the roof


// ---------- the compound plan (metres; north is -z) ----------
const ZC = { x0: -70, x1: 52, z0: -30, z1: 34, wallH: 5.5, innerH: 3.6, HX0: 2, HZ0: -14, CS: 1.25, FH: 4, SLAB: 0.3, gy: 0, fb: 0, lz: { x: 0, z: -80 } };
const ZW = { done: false };
const ZD = {
  built: false, breaches: [], posts: [], postI: 0, target: null, down: false, downBy: '', downT: 0, heli: null, heliBoom: false,
  pick: null, clock: 20 * 60, nvg: (() => { try { return localStorage.getItem('bf_nvg') !== '0'; } catch (e) { return true; } })(), hud: null, prompt: null, phase: '', blown: 0, guardsLeft: 0, laser: null,
};
const ZM = {
  wall: new THREE.MeshLambertMaterial({ color: 0xc7bca6 }), wallIn: new THREE.MeshLambertMaterial({ color: 0xd6cdbd }),
  house: new THREE.MeshLambertMaterial({ color: 0xcfc6b2 }), floor: new THREE.MeshLambertMaterial({ color: 0x8c7f6a }),
  gate: new THREE.MeshLambertMaterial({ color: 0x3f5240 }), door: new THREE.MeshLambertMaterial({ color: 0x5a4030 }),
  wire: new THREE.MeshLambertMaterial({ color: 0x2c2c2c }), win: new THREE.MeshLambertMaterial({ color: 0x23262a }),
  step: new THREE.MeshLambertMaterial({ color: 0xb8ae98 }), nosing: new THREE.MeshLambertMaterial({ color: 0x7a7060 }), rail: new THREE.MeshLambertMaterial({ color: 0x4a3a2a }), hidden: new THREE.MeshBasicMaterial({ visible: false }), lamp: new THREE.MeshBasicMaterial({ color: 0xffd890 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xffc070 }), green: new THREE.MeshLambertMaterial({ color: 0x3e5a2c }),
};
if (typeof TEX !== 'undefined' && TEX.concrete && typeof texRepeat === 'function') {   // rough concrete and plaster
  ZM.wall.map = texRepeat(TEX.concrete, 8, 1); ZM.wallIn.map = texRepeat(TEX.concrete, 3, 1); ZM.house.map = texRepeat(TEX.concrete, 5, 2); ZM.floor.map = texRepeat(TEX.concrete, 4, 4);
  for (const m of [ZM.wall, ZM.wallIn, ZM.house, ZM.floor]) m.needsUpdate = true;
}
const zx = a => ZC.HX0 + a * ZC.CS, zz = a => ZC.HZ0 + a * ZC.CS;   // house plan (in cells, 1.25 m each) to world
// inside: painted walls (cream downstairs, pale green on the family floor, off-white at the top), terrazzo tile floors, white ceilings
ZD.paintHex = [0xe2d8bf, 0xcfdac8, 0xe4ddd0];
ZM.paint = ZD.paintHex.map(c => new THREE.MeshLambertMaterial({ color: c }));
ZM.tile = new THREE.MeshLambertMaterial({ color: 0xffffff, map: canvasTile() });
ZM.ceil = new THREE.MeshLambertMaterial({ color: 0xf4f2ec });
ZM.slabMats = [ZM.floor, ZM.floor, ZM.tile, ZM.ceil, ZM.floor, ZM.floor];
function zTileUV(m) {   // tiles at their real size (about 60 cm), whatever the size of the slab
  const g = m.geometry, p = g.parameters, uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * p.width / 1.25, uv.getY(i) * p.depth / 1.25);
  uv.needsUpdate = true; return m;
}
function canvasTile() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#d8cdb4' : '#cfc3a8'; g.fillRect(i * 64, j * 64, 64, 64); for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(${90 + Math.random() * 80},${80 + Math.random() * 60},${60 + Math.random() * 50},0.35)`; g.fillRect(i * 64 + Math.random() * 64, j * 64 + Math.random() * 64, 2, 2); } }
  g.strokeStyle = '#a89c84'; g.lineWidth = 2; for (const v of [0, 64, 128]) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, 128); g.stroke(); g.beginPath(); g.moveTo(0, v); g.lineTo(128, v); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); return t;
}
const zcx = c => zx(c + 0.5), zcz = r => zz(r + 0.5);
const zfy = k => ZC.fb + k * ZC.FH;                               // floor k surface height

function zBox(x0, x1, z0, z1, y0, y1, mat) { return addBlock((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, mat, { y: y0 }); }
// a wall or gate that a breach charge can blow open
function zBreachable(name, x0, x1, z0, z1, y0, y1, mat, msg) {
  const m = addMesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.userData.static = false; solidMeshes.push(m);
  const bb = { kind: 'box', minX: x0, maxX: x1, minZ: z0, maxZ: z1, minY: y0, maxY: y1, los: true }; obstacles.push(bb); gridAdd(bb, x0, x1, z0, z1);
  const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3((x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2)) });
  body.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); world.addBody(body);
  const b = { name, msg, x: (x0 + x1) / 2, y: y0, z: (z0 + z1) / 2, mesh: m, bb, body, done: false, fuse: 0, charge: null };
  ZD.breaches.push(b); return b;
}
function zOpen(b, ghost, byEnemy) {
  if (b.done) return; b.done = true;
  scene.remove(b.mesh); const i = solidMeshes.indexOf(b.mesh); if (i >= 0) solidMeshes.splice(i, 1);
  b.bb.minY = b.bb.maxY = -999; world.removeBody(b.body);
  const p = new THREE.Vector3(b.x, b.y + 1.2, b.z);
  if (b.soft && !b.charge) {   // the lock breaks and the door crashes in
    for (let i = 0; i < 10; i++) burst(p.clone().add(new THREE.Vector3(rand(-0.4, 0.4), rand(-0.9, 0.9), rand(-0.4, 0.4))), 3, 0x7a5434, 4, 0.3, 0.06);
    if (typeof SFX !== 'undefined' && SFX.hit) SFX.hit();
    zNoise(p, 10, 0.7); ZD.noise = (ZD.noise || 0) + 0.5; showMessage('Door is open!', 1.5); return;
  }
  if (b.charge) { scene.remove(b.charge); b.charge = null; }
  explosion(p, 4.5, 8, byEnemy ? null : (player.team === 'blue' ? player : null), byEnemy ? 0 : 90, !!ghost || !!byEnemy);
  for (let i = 0; i < 6; i++) smokePuff(p.clone().add(new THREE.Vector3(rand(-1.5, 1.5), rand(-0.5, 1.5), rand(-1.5, 1.5))), 0x8a8478, rand(1, 2), 3, 0.6);
  ZD.blown++; zNoise(p, 12, 1.15); ZD.noise = (ZD.noise || 0) + 3;
  if (byEnemy) showMessage(`Fighters blew the ${b.name}! They are coming in`, 4); else if (b.msg) showMessage(b.msg, 3);
}
// barbed wire along the top of a wall
function zWire(x0, z0, x1, z1, y) {   // barbed wire strung on short posts along the top of a wall
  const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0), P = new Part();
  for (let t = 0; t <= len; t += 2.6) P.box(0.05, 0.9, 0.05, 0x2a2a2a, 0, 0.45, t - len / 2, 0.12);
  for (const h of [0.3, 0.55, 0.8]) P.box(0.015, 0.015, len, 0x3a3a3a, 0, h, 0);
  for (let t = 0.5; t < len; t += 0.9) P.add(new THREE.TorusGeometry(0.12, 0.012, 3, 7), 0x3a3a3a, 0, 0.55, t - len / 2, 0, Math.PI / 2, 0);
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.rotation.y = a; scene.add(m);
}
// a wall at any angle: one long box you see, and a row of small invisible blocks that stop you and bullets
function zDiag(x0, z0, x1, z1, h, t, mat) {
  if (x0 === x1 || z0 === z1) return zWall(x0, z0, x1, z1, h, t, mat);
  const len = Math.hypot(x1 - x0, z1 - z0), gy = ZC.gy;
  const m = addMesh(new THREE.BoxGeometry(t, h + 0.4, len + t), mat, (x0 + x1) / 2, gy - 0.4 + (h + 0.4) / 2, (z0 + z1) / 2); m.rotation.y = Math.atan2(x1 - x0, z1 - z0);
  for (let d = 0; d <= len; d += 0.6) { const x = lerp(x0, x1, d / len), z = lerp(z0, z1, d / len); addBlock(x, z, 0.85, h, 0.85, LV.hidden, { y: gy - 0.4 }); }
  return gy + h;
}
function zInPoly(x, z, poly = ZD_OUTLINE) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside; }
  return inside;
}
// the outline, after the CIA diagram: a wedge with a long open yard pointing west, the house in the north part,
// a walled annex to the east, the driveway, gates and guest house along the south
const ZD_OUTLINE = [[-70, -6], [-30, -30], [44, -30], [52, 4], [46, 34], [-6, 34]];
// a straight wall along x or z, with gaps [from, to] left open (filled by breach gates)
function zWall(x0, z0, x1, z1, h, t, mat, gaps = [], y0) {
  const alongX = z0 === z1, a0 = Math.min(alongX ? x0 : z0, alongX ? x1 : z1), a1 = Math.max(alongX ? x0 : z0, alongX ? x1 : z1), base = y0 !== undefined ? y0 : ZC.gy - 0.4, top = (y0 !== undefined ? y0 : ZC.gy) + h;
  const cuts = [a0]; for (const [g0, g1] of gaps.slice().sort((p, q) => p[0] - q[0])) cuts.push(g0, g1); cuts.push(a1);
  for (let i = 0; i < cuts.length; i += 2) {
    const s0 = cuts[i], s1 = cuts[i + 1]; if (s1 - s0 < 0.05) continue;
    if (alongX) zBox(s0, s1, z0 - t / 2, z0 + t / 2, base, top, mat); else zBox(x0 - t / 2, x0 + t / 2, s0, s1, base, top, mat);
  }
  return top;
}

// ---------- the main house: three floors read from the plans above ----------
// '#' wall, ' ' room, 'd' the front door, 'g' a locked metal gate on the stairs, 'S' stairs up (climbing north), 'U' stairs up (climbing south), 'o' stair hole,
// 'e' an open side door, 'T' the terrace, 'p' the 7-foot privacy wall, 'q' the low roof wall, 'r' open roof, 'B' the target
function zRuns(g, want) {   // merge cells into boxes: rows first, then whatever is left in columns
  const H = g.length, W = g[0].length, used = g.map(r => r.split('').map(() => false)), out = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (used[r][c] || !want(g[r][c])) continue;
    let e = c; while (e + 1 < W && !used[r][e + 1] && want(g[r][e + 1])) e++;
    if (e > c) { for (let k = c; k <= e; k++) used[r][k] = true; out.push([c, e, r, r]); }
  }
  for (let c = 0; c < W; c++) for (let r = 0; r < H; r++) {
    if (used[r][c] || !want(g[r][c])) continue;
    let e = r; while (e + 1 < H && !used[e + 1][c] && want(g[e + 1][c])) e++;
    for (let k = r; k <= e; k++) used[k][c] = true; out.push([c, c, r, e]);
  }
  return out;
}
function zRects(g, want) {   // solid rectangles (for floor slabs)
  const runs = []; const H = g.length, W = g[0].length;
  for (let r = 0; r < H; r++) { let c = 0; while (c < W) { if (!want(g[r][c])) { c++; continue; } let e = c; while (e + 1 < W && want(g[r][e + 1])) e++; runs.push([c, e, r, r]); c = e + 1; } }
  const out = [];
  for (const q of runs) { const prev = out.find(o => o[0] === q[0] && o[1] === q[1] && o[3] === q[2] - 1); if (prev) prev[3] = q[2]; else out.push(q.slice()); }
  return out;
}
const zCellBox = ([c0, c1, r0, r1], y0, y1, mat) => zBox(zx(c0), zx(c1 + 1), zz(r0), zz(r1 + 1), y0, y1, mat);
function zStairs(g, k) {
  for (const ch of ['S', 'U']) {
    let c0 = 99, c1 = -1, r0 = 99, r1 = -1;
    g.forEach((row, r) => row.split('').forEach((cc, c) => { if (cc === ch) { c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r); } }));
    if (c1 < 0) continue;
    const F = zfy(k), x0 = zx(c0), x1 = zx(c1 + 1), za = zz(r0), zb = zz(r1 + 1), run = (r1 - r0 + 1) * ZC.CS / 10, north = ch === 'S';   // ten steps of 40 cm
    for (let i = 1; i <= 10; i++) {
      const s0 = north ? zb - run * i : za + run * (i - 1), s1 = north ? zb - run * (i - 1) : za + run * i;
      zBox(x0, x1, Math.min(s0, s1), Math.max(s0, s1), F, F + 0.4 * i, ZM.step);
      addMesh(new THREE.BoxGeometry(x1 - x0 + 0.01, 0.04, 0.06), ZM.nosing, (x0 + x1) / 2, F + 0.4 * i + 0.01, north ? s0 + 0.03 : s1 - 0.03, false);   // the edge of each tread
    }
    for (const xx of [x0 + 0.06, x1 - 0.06]) {   // a handrail up each side
      const len = Math.hypot(4, run * 10), r = addMesh(new THREE.BoxGeometry(0.05, 0.05, len), ZM.rail, xx, F + 2.0 + 0.0, (za + zb) / 2, false);
      r.rotation.x = (north ? 1 : -1) * Math.atan2(4, run * 10); r.userData.static = false;
    }
    ZD.stairs = ZD.stairs || []; ZD.stairs.push({ k, x: (x0 + x1) / 2, zFoot: north ? zb + 0.6 : za - 0.6, zTop: north ? za - 0.6 : zb + 0.6, north });
  }
}
function zBuildHouse() {
  const [G0, G1, G2] = ZD_GRID, wallTop = 3.7, M = ZM.house, T = ZD_TOP;
  const slab = (g, k) => zRects(g, ch => ch !== 'o').forEach(r => { const m = zTileUV(zCellBox(r, zfy(k) - ZC.SLAB, zfy(k), ZM.floor)); m.material = ZM.slabMats; m.userData.static = false; });
  const gs = zTileUV(zCellBox([0, 25, 0, 21], ZC.gy - 0.6, ZC.fb, ZM.floor)); gs.material = ZM.slabMats; gs.userData.static = false;   // the ground-floor slab
  for (const [k, g] of [[0, G0], [1, G1]]) {
    const F = zfy(k);
    for (const r of zRuns(g, ch => ch === '#')) zCellBox(r, F, F + wallTop, (r[2] === 0 || r[3] === 21 || r[0] === 0 || r[1] === 25) ? M : ZM.paint[k]);   // outside walls plaster, inside painted
    for (const r of zRuns(g, ch => ch === 'd' || ch === 'g')) zCellBox(r, F + 2.5, F + wallTop, (r[2] === 0) ? M : ZM.paint[k]);   // over the door and the gates
    zStairs(g, k);
  }
  slab(G1, 1); slab(G2, 2);
  // third floor: its walls, the privacy wall round the terrace, the low wall round the roof, and its own roof
  const F = zfy(2);
  for (const r of zRuns(G2, ch => ch === '#')) zCellBox(r, F, F + wallTop, (r[2] === T.r0 || r[3] === T.r1 || r[0] === T.c0 || r[1] === T.c1) ? M : ZM.paint[2]);
  for (const r of zRuns(G2, ch => ch === 'p')) zCellBox(r, F, F + 2.13, M);
  for (const r of zRuns(G2, ch => ch === 'q')) zCellBox(r, F, F + 1.0, M);
  const roof = zBox(zx(T.c0) - 0.1, zx(T.c1 + 1) + 0.1, zz(T.r0) - 0.1, zz(T.r1 + 1) + 0.1, F + wallTop, F + wallTop + 0.35, ZM.floor); roof.material = ZM.slabMats; roof.userData.static = false;
  // doors and gates you blow open: the front door, and the locked metal gates at the foot of each flight of stairs
  for (const [k, g] of [[0, G0], [1, G1]]) for (const r of zRuns(g, ch => ch === 'd' || ch === 'g')) {
    const door = g[r[2]][r[0]] === 'd', zc = r[2] === 0 ? zz(0) + 0.35 : zcz(r[2]), x0 = zx(r[0]), x1 = zx(r[1] + 1);
    const b = zBreachable(door ? 'front door' : k === 0 ? 'lower stair gate' : 'stair gate', x0 + 0.05, x1 - 0.05, zc - 0.12, zc + 0.12, zfy(k), zfy(k) + 2.5, door ? ZM.door : ZM.gate,
      door ? 'Front door is open. Clear the ground floor!' : k === 0 ? 'The gate at the foot of the stairs is down. Up to the second floor!' : 'The locked door to his floor is down. Up to the third floor!');
    if (door) { ZD.frontDoor = { x: (x0 + x1) / 2, z: zz(0) }; zDoorLook(b, x1 - x0); } else zGateLook(b, x1 - x0);
  }
  zInteriorDoors(); zDressHouse(); zFurnish();
  G2.forEach((row, r) => { const c = row.indexOf('B'); if (c >= 0) ZD.targetAt = new THREE.Vector3(zcx(c), zfy(2), zcz(r)); });
}
// the front door: two panelled leaves with handles (blown off together)
function zDoorLook(b, w) {
  const P = new Part(), hw = w / 2 - 0.1;
  for (const sd of [-1, 1]) {
    P.box(hw - 0.02, 2.4, 0.05, 0x6a4a30, sd * hw / 2, 0, 0.14); P.box(hw - 0.02, 2.4, 0.05, 0x6a4a30, sd * hw / 2, 0, -0.14);
    for (const [y, h] of [[0.55, 0.7], [-0.5, 1.0]]) for (const f of [1, -1]) P.box(hw - 0.3, h, 0.03, 0x5a3c24, sd * hw / 2, y, f * 0.17);
    for (const f of [1, -1]) P.box(0.04, 0.16, 0.05, 0xb8a060, sd * 0.12, 0.0, f * 0.19);
  }
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.position.set(0, 0.05, 0); b.mesh.add(m); b.mesh.material = ZM.hidden;
  const fr = new Part(); for (const sd of [-1, 1]) fr.box(0.14, 2.6, 0.5, 0xf2eee4, sd * (w / 2 + 0.07), 1.3, 0); fr.box(w + 0.42, 0.16, 0.5, 0xf2eee4, 0, 2.58, 0);
  const fm = new THREE.Mesh(fr.build(), VEH_MAT); fm.position.set(b.x, b.y, b.z); scene.add(fm);
}
// a stair gate: a heavy steel door in a frame with a padlocked bolt
function zGateLook(b, w) {
  const P = new Part();
  for (const f of [1, -1]) { P.box(w - 0.15, 2.35, 0.03, 0x3e4a3e, 0, 0, f * 0.13); for (let i = 0; i < 4; i++) P.box(w - 0.3, 0.05, 0.04, 0x2e382e, 0, -0.9 + i * 0.6, f * 0.15); }
  P.box(0.3, 0.08, 0.06, 0x8a8a84, w / 2 - 0.35, 0.05, 0.17); P.box(0.08, 0.12, 0.05, 0xb89a40, w / 2 - 0.2, -0.06, 0.2);
  const m = new THREE.Mesh(P.build(), VEH_MAT); b.mesh.add(m); b.mesh.material = ZM.hidden;
}
// doorways between rooms: a painted frame, a lintel, and the wooden door standing open against the wall
// doors that are shut and locked: break the lock with gunfire or the knife, or set a charge on them
const ZD_LOCKED = [[0, 9, 10], [0, 10, 13], [0, 16, 14], [1, 5, 14], [1, 11, 13], [1, 17, 13], [2, 12, 16], [2, 15, 15]];
function zLockedDoor(k, r, c, ew) {
  const CS = ZC.CS, y0 = zfy(k), x = zcx(c), z = zcz(r), t = 0.07;
  const b = ew ? zBreachable('locked door', x - CS / 2 + 0.06, x + CS / 2 - 0.06, z - t, z + t, y0, y0 + 2.2, ZM.door, '')
               : zBreachable('locked door', x - t, x + t, z - CS / 2 + 0.06, z + CS / 2 - 0.06, y0, y0 + 2.2, ZM.door, '');
  b.locked = true; b.soft = true; b.hp = 300;
  const P = new Part(), w = CS - 0.16;   // panels on both faces, a handle and a padlocked hasp
  for (const f of [1, -1]) {
    for (const [yy, h] of [[0.45, 0.7], [-0.45, 0.85]]) ew ? P.box(w - 0.3, h, 0.02, 0x4a3220, 0, yy, f * (t + 0.01)) : P.box(0.02, h, w - 0.3, 0x4a3220, f * (t + 0.01), yy, 0);
    ew ? P.box(0.05, 0.14, 0.05, 0xb8a060, w / 2 - 0.12, 0, f * (t + 0.03)) : P.box(0.05, 0.14, 0.05, 0xb8a060, f * (t + 0.03), 0, w / 2 - 0.12);
    ew ? P.box(0.08, 0.1, 0.04, 0x8a8a84, w / 2 - 0.12, -0.18, f * (t + 0.03)) : P.box(0.04, 0.1, 0.08, 0x8a8a84, f * (t + 0.03), -0.18, w / 2 - 0.12);
  }
  const m = new THREE.Mesh(P.build(), VEH_MAT); b.mesh.add(m);
  return b;
}
function zRayBox(o, d, bb, maxD) {   // where a ray first meets a box, or null
  let t0 = 0, t1 = maxD;
  for (const [oa, da, lo, hi] of [[o.x, d.x, bb.minX, bb.maxX], [o.y, d.y, bb.minY, bb.maxY], [o.z, d.z, bb.minZ, bb.maxZ]]) {
    if (Math.abs(da) < 1e-9) { if (oa < lo || oa > hi) return null; continue; }
    let a = (lo - oa) / da, c = (hi - oa) / da; if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return null;
  }
  return t0;
}
function zDoorRay(o, d, maxD, best) {
  for (const b of ZD.breaches) {
    if (!b.locked || b.done) continue;
    const t = zRayBox(o, d, b.bb, maxD);
    if (t !== null && t < (best ? best.dist + 0.05 : maxD)) best = { dist: t, point: o.clone().addScaledVector(d, t), zdDoor: b };
  }
  return best;
}
function zDoorHit(b, hit, wpn) {
  if (b.done) return;
  b.hp -= (wpn && wpn.dmg) || 30;
  burst(hit.point, 5, 0x8a6a44, 3, 0.25, 0.05);
  zNoise(hit.point, wpn && wpn.knife ? 4 : 6, 0.3);
  if (b.hp <= 0) { zOpen(b); netFx(['zb', ZD.breaches.indexOf(b)]); }
  else if (wpn && !wpn.knife && b.hp < 150 && !b.cracked) { b.cracked = true; showMessage('The lock is giving way...', 1.2); }
}
function zInteriorDoors() {
  const P = new Part(), CS = ZC.CS, locked = new Set(ZD_LOCKED.map(q => q.join(',')));
  for (const [k, g] of ZD_GRID.entries()) {
    const F = zfy(k) - ZC.fb, H = g.length, W = g[0].length;
    for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) {
      if (g[r][c] !== ' ') continue;
      const ew = g[r][c - 1] === '#' && g[r][c + 1] === '#' && g[r - 1][c] !== '#' && g[r + 1][c] !== '#';   // a gap in a wall running east-west
      const ns = g[r - 1][c] === '#' && g[r + 1][c] === '#' && g[r][c - 1] !== '#' && g[r][c + 1] !== '#';   // a gap in a wall running north-south
      if ((!ew && !ns) || (k === 1 && r === 6 && c === 22)) continue;   // (that one is the stair landing, not a door)
      const x = (c + 0.5) * CS, z = (r + 0.5) * CS, wall = 0xf4f0e6, wood = pick([0x7a5434, 0x6a4a2e, 0x8a6a48]), shut = locked.has(k + ',' + r + ',' + c);
      if (shut) zLockedDoor(k, r, c, ew);
      if (ew) {
        P.box(CS, wallTopOf(k) - 2.25, CS, ZD.paintHex[k], x, F + (2.25 + wallTopOf(k)) / 2, z);   // lintel
        for (const sd of [-1, 1]) P.box(0.08, 2.25, CS + 0.02, wall, x + sd * (CS / 2 - 0.04), F + 1.125, z);
        if (!shut) P.box(0.05, 2.1, CS - 0.16, wood, x - CS / 2 + 0.12, F + 1.05, z + (CS - 0.16) / 2 + 0.05);   // the door, swung open against the wall
      } else {
        P.box(CS, wallTopOf(k) - 2.25, CS, ZD.paintHex[k], x, F + (2.25 + wallTopOf(k)) / 2, z);
        for (const sd of [-1, 1]) P.box(CS + 0.02, 2.25, 0.08, wall, x, F + 1.125, z + sd * (CS / 2 - 0.04));
        if (!shut) P.box(CS - 0.16, 2.1, 0.05, wood, x + (CS - 0.16) / 2 + 0.05, F + 1.05, z - CS / 2 + 0.12);
      }
    }
  }
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.position.set(ZC.HX0, ZC.fb, ZC.HZ0); scene.add(m);
}
function wallTopOf(k) { return 3.7; }
// the things a big family leaves about: carpets and runners, prayer mats, cushions, blankets, shoes by the door,
// clothes on hooks and on a line, wall hangings and calligraphy, a clock, thermos flasks and tea glasses, toys
const ZRUG = [0x7a2420, 0x8a3a24, 0x5a2a3a, 0x2a3a5a, 0x6a4a2a, 0x3a5a4a, 0x9a6a30];
function zRugAt(P, x, z, w, d, F, col) {   // a patterned carpet: field, border and a medallion
  const c = col || pick(ZRUG), b = pick([0xd8b860, 0xe0d0b0, 0x2a2a3a, 0x9a2a24]);
  const L = k => F + 0.012 * k - 0.006;   // layer k's centre: tops at 1.2, 2.4, 3.6, 4.8 cm
  P.box(w, 0.012, d, b, x, L(1), z); P.box(w - 0.16, 0.012, d - 0.16, c, x, L(2), z);
  P.box(w - 0.3, 0.012, 0.04, b, x, L(3), z - d / 2 + 0.2); P.box(w - 0.3, 0.012, 0.04, b, x, L(3), z + d / 2 - 0.2);
  P.box(Math.min(w, d) * 0.35, 0.012, Math.min(w, d) * 0.35, b, x, L(3), z, 0, Math.PI / 4, 0);
  P.box(Math.min(w, d) * 0.2, 0.012, Math.min(w, d) * 0.2, c, x, L(4), z, 0, Math.PI / 4, 0);
}
function zLivedIn(P) {
  const CS = ZC.CS;
  // runners down the halls and corridors
  for (const [k, c0, c1, r0, r1] of [[0, 11, 12, 1, 13], [0, 1, 24, 14, 15], [1, 1, 24, 6, 7], [1, 11, 12, 8, 20], [2, 13, 24, 13, 14]]) {
    const F = zfy(k) - ZC.fb, x0 = c0 * CS, x1 = (c1 + 1) * CS, z0 = r0 * CS, z1 = (r1 + 1) * CS, long = (x1 - x0) > (z1 - z0);
    const n = Math.max(1, Math.round((long ? x1 - x0 : z1 - z0) / 6));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = long ? lerp(x0, x1, t) : (x0 + x1) / 2, z = long ? (z0 + z1) / 2 : lerp(z0, z1, t);
      zRugAt(P, x, z, long ? (x1 - x0) / n - 0.6 : (x1 - x0) * 0.6, long ? (z1 - z0) * 0.6 : (z1 - z0) / n - 0.6, F);
    }
  }
  for (const R of ZD_ROOMS) {
    const F = zfy(R.k) - ZC.fb, X0 = R.c0 * CS, X1 = (R.c1 + 1) * CS, Z0 = R.r0 * CS, Z1 = (R.r1 + 1) * CS, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2, w = X1 - X0, d = Z1 - Z0;
    const big = w > 3.5 && d > 3;
    // on the walls: a framed verse of calligraphy, a woven hanging or a calendar, a clock
    if (R.name !== 'bath' && R.name !== 'storage' && R.name !== 'store') {
      const fw = Math.min(1.1, w * 0.3); P.box(fw + 0.08, 0.5, 0.03, 0x6a4a24, X0 + w * 0.3, F + 1.75, Z0 + 0.02); P.box(fw, 0.42, 0.035, pick([0x1e5a3a, 0x1a1a1a, 0xe8e0c8]), X0 + w * 0.3, F + 1.75, Z0 + 0.03);
      for (let i = 0; i < 4; i++) P.box(fw * 0.16, 0.05, 0.04, 0xd8c070, X0 + w * 0.3 - fw * 0.3 + i * fw * 0.2, F + 1.75 + (i % 2 ? 0.05 : -0.04), Z0 + 0.04);   // the gold script
      if (big) { P.box(0.03, 1.2, Math.min(1.6, d * 0.4), pick(ZRUG), X0 + 0.02, F + 1.6, cz); P.box(0.035, 1.0, Math.min(1.4, d * 0.34), pick([0xd8b860, 0xe0d0b0]), X0 + 0.025, F + 1.6, cz); }   // a hanging carpet
      if (Math.random() < 0.6) { P.cyl(0.15, 0.15, 0.04, 0xf2f0e8, X1 - 0.9, F + 2.4, Z0 + 0.03, Math.PI / 2, 0, 0, 1, 14); P.box(0.015, 0.1, 0.01, 0x1a1a1a, X1 - 0.9, F + 2.43, Z0 + 0.06); }   // a clock
      P.box(0.04, 0.04, 0.6, 0x8a6a44, X1 - 0.03, F + 1.85, Z0 + 0.6);   // a row of hooks, and what hangs on them
      for (let i = 0; i < 3; i++) P.box(0.05, rand(0.6, 0.9), 0.32, pick([0xe8e4d8, 0x3a4a6a, 0x7a3a4a, 0x5a6a4a, 0x2a2a2e]), X1 - 0.07, F + 1.45, Z0 + 0.4 + i * 0.22);
    }
    // on the floor: shoes left by the door, cushions, a folded pile of quilts, prayer mats facing west
    for (let i = 0; i < (R.name === 'bath' ? 1 : 3); i++) { const sx = cx + rand(-w / 3, w / 3), sz = Z1 - 0.25; for (const o of [-0.06, 0.06]) P.box(0.09, 0.05, 0.24, pick([0x2a2a2a, 0x6a4a30, 0x8a2a2a, 0x3a5a8a]), sx + o, F + 0.025, sz, 0, rand(-0.3, 0.3), 0); }
    if (R.name === 'bedroom' || R.name === 'master' || R.name === 'living' || R.name === 'classroom') {
      for (let i = 0; i < 3; i++) P.box(0.5, 0.14, 0.5, pick([0x8a2a2a, 0xa07a30, 0x3a5a7a, 0x6a3a6a]), X0 + 0.45 + i * 0.6, F + 0.07, Z0 + 0.45);   // floor cushions
      for (let i = 0; i < 4; i++) P.box(0.9, 0.09, 0.6, pick([0xd04a4a, 0x4a7ab0, 0xe0c050, 0x6aa06a, 0xe8e4d8]), X1 - 0.65, F + 0.05 + i * 0.09, Z1 - 0.55);   // folded quilts
      P.box(0.62, 0.012, 1.1, pick([0x1e5a3a, 0x7a2420, 0x2a3a5a]), X0 + w * 0.6, F + 0.036, cz, 0, Math.PI / 2, 0);   // a prayer mat
      P.box(0.2, 0.012, 0.3, 0xd8b860, X0 + w * 0.6 - 0.3, F + 0.05, cz);
      if (big) { P.cyl(0.07, 0.07, 0.3, pick([0xd0d0d0, 0x2a6a4a, 0xb02a2a]), cx + 0.6, F + 0.15, cz - 0.5, 0, 0, 0, 1, 10); for (let i = 0; i < 3; i++) P.cyl(0.03, 0.025, 0.08, 0xd8a050, cx + 0.8 + i * 0.1, F + 0.04, cz - 0.4, 0, 0, 0, 1, 8); P.box(0.4, 0.012, 0.3, 0xb8b8b0, cx + 0.85, F + 0.036, cz - 0.4); }   // thermos and tea glasses on a tray
    }
    if (R.name === 'bedroom' && R.k < 2) {   // the children's things
      for (let i = 0; i < 4; i++) P.box(rand(0.12, 0.25), rand(0.1, 0.2), rand(0.12, 0.25), pick([0xe04a4a, 0x3a8ad0, 0xf0c030, 0x4ac04a]), cx + rand(-w / 4, w / 4), F + 0.08, cz + rand(-d / 4, d / 4), 0, rand(0, 3), 0);
      P.ball(0.12, pick([0xe04a4a, 0xf0f0f0, 0x3a8ad0]), cx + rand(-0.8, 0.8), F + 0.12, cz + rand(0.2, 0.8));   // a ball
      if (Math.random() < 0.5) { P.box(0.8, 0.45, 0.5, 0x8a6a44, X0 + 0.5, F + 0.3, cz); P.box(0.75, 0.04, 0.45, 0xe8e0d0, X0 + 0.5, F + 0.55, cz); }   // a cradle
    }
    if (R.name === 'bedroom' || R.name === 'master') {   // a washing line strung across a corner, clothes drying
      P.box(0.01, 0.01, d * 0.6, 0xd0d0d0, X1 - 0.5, F + 2.2, cz);
      for (let i = 0; i < 4; i++) P.box(0.04, rand(0.5, 0.8), 0.35, pick([0xe8e4d8, 0x5a7ab0, 0xb04a6a, 0x6a6a4a, 0xd8a038]), X1 - 0.5, F + 1.85, cz - d * 0.22 + i * d * 0.15);
      P.box(0.4, 0.5, 0.3, pick([0x3a2a20, 0x5a3a2a]), X0 + 0.3, F + 0.25, Z1 - 0.3); P.box(0.36, 0.3, 0.02, 0x6a8090, X0 + 0.3, F + 0.75, Z1 - 0.44);   // a small chest and a hand mirror on it
      // the window: heavy curtains drawn
      P.box(w * 0.5, 1.4, 0.04, pick([0x6a2a2a, 0x2a4a3a, 0x4a3a6a, 0x8a7a5a]), cx, F + 1.75, Z1 - 0.04);
      P.box(w * 0.55, 0.06, 0.06, 0x6a5a40, cx, F + 2.5, Z1 - 0.05);
    }
    if (R.name === 'kitchen' || R.name === 'kitchenette') {
      for (let i = 0; i < 5; i++) P.cyl(0.12, 0.1, 0.12, pick([0xa8a8a0, 0x7a7a74, 0xb88a50]), X0 + 0.4 + i * 0.35, F + 1.85, Z0 + 0.15, 0, 0, 0, 1, 10);   // pots on a shelf
      P.box(w - 0.4, 0.04, 0.3, 0x6a5038, cx, F + 1.78, Z0 + 0.15);
      for (let i = 0; i < 6; i++) P.box(0.3, 0.3, 0.3, pick([0xd8d0b0, 0xb8a888]), X1 - 0.3, F + 0.15 + (i % 3) * 0.3, Z1 - 0.3 - Math.floor(i / 3) * 0.32);   // sacks of flour and rice
      P.box(0.6, 0.012, 0.6, 0x1a1a1a, cx, F + 0.036, Z1 - 0.6); P.cyl(0.25, 0.25, 0.02, 0xd0c8a0, cx, F + 0.055, Z1 - 0.6, 0, 0, 0, 1, 14);   // a mat with a round of bread dough
    }
    if (R.name === 'living' || R.name === 'media' || R.name === 'study') {
      P.box(0.4, 0.04, 0.4, 0x8a6a44, cx, F + 0.42, cz); for (const [ox, oz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) P.box(0.03, 0.42, 0.03, 0x6a4a30, cx + ox, F + 0.21, cz + oz);   // a little table
      P.cyl(0.25, 0.25, 0.03, 0xf2f0e8, cx, F + 3.4, cz, 0, 0, 0, 1, 12); for (const a of [0, 2.1, 4.2]) P.box(0.9, 0.01, 0.12, 0xd8d0c0, cx + Math.cos(a) * 0.45, F + 3.38, cz + Math.sin(a) * 0.45, 0, -a, 0);   // a ceiling fan
    }
    if (R.name === 'bath') { P.box(0.05, 0.3, 0.6, 0xe8e4d8, X1 - 0.03, F + 1.6, cz); P.cyl(0.06, 0.06, 0.2, 0x3a8a4a, X0 + 0.25, F + 0.1, Z0 + 0.25, 0, 0, 0, 1, 8); P.box(0.3, 0.22, 0.2, 0xd04a4a, X0 + 0.3, F + 0.11, Z1 - 0.3); }   // towel, a lota (water jug), a plastic stool
  }
}
// furniture by room: low beds and mattresses, cupboards, carpets and floor cushions, a kitchen with a gas stove,
// washrooms, the children's classroom with a whiteboard, his study with crude wooden shelves and a computer
function zFurnish() {
  const P = new Part(), CS = ZC.CS, lamps = [];
  for (const R of ZD_ROOMS) {
    const F = zfy(R.k) - ZC.fb, x0 = R.c0 * CS + 0.15, x1 = (R.c1 + 1) * CS - 0.15, z0 = R.r0 * CS + 0.15, z1 = (R.r1 + 1) * CS - 0.15, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    const rug = (col) => P.box(w * 0.7, 0.02, d * 0.6, col, cx, F + 0.012, cz);
    P.box(0.25, 0.05, 0.25, 0xf6f0d8, cx, F + 3.66, cz); lamps.push([cx, F, cz]);   // ceiling light
    if (R.name === 'bedroom' || R.name === 'master') {
      rug(pick([0x7a2e2a, 0x4a3a6a, 0x2f5a52, 0x8a5a34]));
      const bw = Math.min(2.0, w - 0.4); P.box(bw, 0.35, 1.9, 0x5a4030, x0 + bw / 2 + 0.1, F + 0.18, z1 - 1.05); P.box(bw - 0.1, 0.18, 1.8, pick([0xd8d2c2, 0xb8c4d8, 0xd8c0b0]), x0 + bw / 2 + 0.1, F + 0.44, z1 - 1.05); P.box(0.5, 0.12, 0.35, 0xf0ece4, x0 + 0.45, F + 0.58, z1 - 0.3);   // bed, sheet, pillow
      P.box(1.0, 2.0, 0.55, 0x6a4a30, x1 - 0.6, F + 1.0, z0 + 0.3); P.box(0.02, 1.8, 0.02, 0x3a2a1a, x1 - 0.6, F + 1.0, z0 + 0.58);   // cupboard
      if (w > 4) P.box(0.9, 0.12, 2.0, pick([0x8a5a5a, 0x5a6a8a]), x1 - 0.6, F + 0.06, cz + 0.4);   // a floor mattress for the children
    } else if (R.name === 'living') {
      rug(0x8a2a24); for (const [sx, sz, sw, sd] of [[x0 + 0.35, cz, 0.6, d - 0.6], [x1 - 0.35, cz, 0.6, d - 0.6], [cx, z0 + 0.35, w - 1.2, 0.6]]) { P.box(sw, 0.2, sd, 0x8a6a3a, sx, F + 0.1, sz); P.box(sw === 0.6 ? 0.15 : sw, 0.45, sw === 0.6 ? sd : 0.15, 0xa07a44, sx + (sw === 0.6 ? (sx < cx ? -0.22 : 0.22) : 0), F + 0.35, sz + (sw === 0.6 ? 0 : -0.22)); }   // floor cushions round the walls
      P.box(1.2, 0.8, 0.45, 0x4a3424, cx, F + 0.4, z1 - 0.25); P.box(0.8, 0.5, 0.06, 0x111111, cx, F + 1.05, z1 - 0.28);   // a stand with a television
    } else if (R.name === 'kitchen' || R.name === 'kitchenette') {
      P.box(w - 0.2, 0.9, 0.6, 0xbab2a2, cx, F + 0.45, z0 + 0.3); P.box(w - 0.2, 0.04, 0.62, 0x6a6a64, cx, F + 0.92, z0 + 0.3);   // counter
      P.box(0.6, 0.06, 0.45, 0x2a2a2a, x0 + 0.5, F + 0.96, z0 + 0.3); for (const dx of [-0.15, 0.15]) P.cyl(0.08, 0.08, 0.03, 0x1a1a1a, x0 + 0.5 + dx, F + 1.0, z0 + 0.3);   // gas stove
      P.cyl(0.16, 0.16, 0.6, 0x2a5a8a, x0 + 0.3, F + 0.3, z0 + 0.95); P.box(0.4, 0.4, 0.4, 0xd0c8b8, x1 - 0.4, F + 1.3, z0 + 0.25);   // gas cylinder, a cupboard on the wall
      P.cyl(0.18, 0.15, 0.3, 0x9a9a94, cx, F + 1.1, z0 + 0.3);   // a cooking pot
    } else if (R.name === 'bath') {
      P.box(0.5, 0.06, 0.7, 0xeeeeea, x0 + 0.35, F + 0.03, z1 - 0.45); P.box(0.5, 0.2, 0.4, 0xe8e8e4, x1 - 0.35, F + 0.85, z0 + 0.25); P.cyl(0.03, 0.03, 0.8, 0xcfcfcf, x1 - 0.35, F + 0.4, z0 + 0.25);   // floor toilet, basin
      P.cyl(0.18, 0.15, 0.32, 0x3a6aa8, cx, F + 0.16, cz); P.box(0.4, 0.5, 0.03, 0xa8b8c0, x1 - 0.35, F + 1.5, z0 + 0.03);   // bucket, mirror
      P.box(w, 0.01, d, 0xd8dce0, cx, F + 0.01, cz);   // tiles
    } else if (R.name === 'storage' || R.name === 'store') {
      for (let i = 0; i < 6; i++) { const bx = rand(x0 + 0.4, x1 - 0.4), bz = rand(z0 + 0.4, z1 - 0.4), s = rand(0.4, 0.8); P.box(s, s * rand(0.6, 1.2), s, pick([0x8a6a44, 0x9a7a54, 0x6a6a5a]), bx, F + s * 0.4, bz); }   // boxes and sacks
      P.box(w - 0.3, 0.05, 0.5, 0x6a5038, cx, F + 1.4, z0 + 0.25); P.box(w - 0.3, 0.05, 0.5, 0x6a5038, cx, F + 1.9, z0 + 0.25);   // shelves
    } else if (R.name === 'classroom') {
      rug(0x3a4a6a); P.box(2.0, 1.1, 0.05, 0xf8f8f4, cx, F + 1.5, z0 + 0.03); P.box(2.1, 0.06, 0.08, 0x8a8a8a, cx, F + 0.92, z0 + 0.06);   // whiteboard
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) P.box(0.7, 0.3, 0.45, 0x7a5a3a, cx - 1.2 + i * 1.2, F + 0.15, cz + j * 1.1);   // low desks
    } else if (R.name === 'study' || R.name === 'media') {
      rug(0x5a3a2a); P.box(w - 0.3, 0.04, 0.35, 0x8a6a44, cx, F + 0.8, z0 + 0.2); P.box(w - 0.3, 0.04, 0.35, 0x8a6a44, cx, F + 1.4, z0 + 0.2); P.box(w - 0.3, 0.04, 0.35, 0x8a6a44, cx, F + 2.0, z0 + 0.2);   // crude wooden shelves
      for (let i = 0; i < 10; i++) P.box(0.05, 0.25, 0.18, pick([0x6a2a2a, 0x2a4a6a, 0x3a5a3a, 0x8a7a5a]), x0 + 0.3 + i * (w - 0.6) / 10, F + 0.95 + (i % 3) * 0.6, z0 + 0.2);   // books
      P.box(1.2, 0.05, 0.6, 0x6a4a30, cx, F + 0.72, z1 - 0.5); P.box(0.5, 0.35, 0.05, 0x1a1a1a, cx, F + 0.95, z1 - 0.65); P.box(0.4, 0.03, 0.15, 0x2a2a2a, cx, F + 0.76, z1 - 0.4);   // desk, computer screen, keyboard
      if (R.name === 'media') { P.box(0.6, 0.4, 0.4, 0x2a2a2a, x1 - 0.4, F + 0.2, z1 - 0.3); P.box(0.7, 0.5, 0.06, 0x111111, x1 - 0.4, F + 0.65, z1 - 0.12); }
    }
  }
  zLivedIn(P);
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.position.set(ZC.HX0, ZC.fb, ZC.HZ0); m.receiveShadow = true; scene.add(m);
  // a few rooms still have a lamp burning (most of the house was dark: the power was cut that night)
  ZD.houseLights = [];
  const pickL = [ZD_ROOMS.findIndex(R => R.name === 'kitchen'), ZD_ROOMS.findIndex(R => R.k === 1 && R.name === 'classroom'), ZD_ROOMS.findIndex(R => R.name === 'master'), ZD_ROOMS.findIndex(R => R.name === 'study')];
  // (two real lights at most, moved to whichever lamps are nearest you: every extra light costs every pixel on screen)
  ZD.lampSpots = pickL.filter(i => i >= 0).map(i => { const [x, F, z] = lamps[i]; return new THREE.Vector3(ZC.HX0 + x, ZC.fb + F + 2.6, ZC.HZ0 + z); });
  for (let i = 0; i < 2; i++) { const L = new THREE.PointLight(0xffc880, 0.9, 9, 1.8); L.position.copy(ZD.lampSpots[i] || ZD.lampSpots[0]); scene.add(L); ZD.houseLights.push(L); }
}

// ---------- walls, gates, the guest house and the yards ----------
function zBuildCompound() {
  const gy = ZC.gy, brick = typeof MATS !== 'undefined' && MATS.brick ? MATS.brick : ZM.wall, O = ZD_OUTLINE;
  // the outer wall: 10 to 18 feet, part brick and part grey concrete, barbed wire on posts along the top.
  // Two gates: the main gate in the south onto the lane, and a second gate in the north wall by the house.
  const H = [3.4, 3.7, 3.4, 5.5, 3.7, 3.4], M = [brick, ZM.wall, ZM.wall, ZM.wall, ZM.wall, brick];
  for (let i = 0; i < O.length; i++) {
    const [x0, z0] = O[i], [x1, z1] = O[(i + 1) % O.length];
    if (i === 1) { zWall(x0, z0, x1, z1, H[i], 0.6, M[i], [[-2, 2]]); zBox(-2, 2, z0 - 0.3, z0 + 0.3, gy + 3.0, gy + H[i], M[i]); zBreachable('north gate', -2, 2, z0 - 0.25, z0 + 0.25, gy - 0.2, gy + 3.0, ZM.gate, 'North gate is open: the quickest way to the field outside'); }
    else if (i === 4) { zWall(x0, z0, x1, z1, H[i], 0.6, M[i], [[20, 26]]); zBox(20, 26, z0 - 0.3, z0 + 0.3, gy + 3.2, gy + H[i], M[i]); zBreachable('main gate', 20, 26, z0 - 0.25, z0 + 0.25, gy - 0.2, gy + 3.2, ZM.gate, 'Main gate is down!'); }
    else zDiag(x0, z0, x1, z1, H[i], 0.6, M[i]);
    zWire(x0, z0, x1, z1, gy + H[i]);
  }
  // inner walls: the west yard (the animal pen, where the helicopter came down and the trash was burned);
  // the driveway and the guest house in the south; the annex with the vegetable garden in the east
  const IH = ZC.innerH;
  zWall(-12, -30, -12, 30.3, IH, 0.5, brick, [[-12, -8]]);
  zBox(-12.25, -11.75, -12, -8, gy + 2.6, gy + IH, brick);
  zBreachable('pen gate', -12.2, -11.8, -12, -8, gy - 0.2, gy + 2.6, ZM.door, 'Pen gate is open: the main courtyard and the house are through here');
  zWall(-12, 20, 48.8, 20, IH, 0.5, ZM.wallIn, [[0, 4]]);
  zBox(0, 4, 19.75, 20.25, gy + 3.0, gy + IH, ZM.wallIn);
  zBreachable('inner gate', 0, 4, 19.8, 20.2, gy - 0.2, gy + 3.0, ZM.gate, 'Inner gate is open. The main house is across the courtyard');
  zWall(40, -30, 40, 20, 3.0, 0.4, ZM.wallIn, [[-6, -2]]);   // the annex (an open doorway)
  for (const [a, b, c, d] of [[-12, -30, -12, 30.3], [-12, 20, 48.8, 20]]) zWire(a, b, c, d, gy + IH);
  // the guest house, where the courier lived: one storey, two rooms, doors onto the driveway
  const gh = 3.4;
  zWall(-4, 22.5, 14, 22.5, gh, 0.4, ZM.house, [[2, 4], [9, 11]], gy); zWall(-4, 32.5, 14, 32.5, gh, 0.4, ZM.house, [], gy);
  zWall(-4, 22.5, -4, 32.5, gh, 0.4, ZM.house, [], gy); zWall(14, 22.5, 14, 32.5, gh, 0.4, ZM.house, [], gy);
  zWall(5, 22.5, 5, 32.5, gh, 0.3, ZM.wallIn, [[26, 28]], gy);
  zBox(-4.3, 14.3, 22.2, 32.8, gy + gh, gy + gh + 0.3, ZM.floor);
  // the main house
  zBuildHouse();
  // the yards: water tanks, the burned trash in the west yard, the vegetable garden in the annex, a car under a lean-to
  for (const [x, z] of [[-14.5, -27], [44, 26], [37, -27]]) { addMesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 12), ZM.gate, x, gy + 0.8, z); addCircle(x, z, 0.95, gy + 1.6); }
  ZD.trash = new THREE.Vector3(-46, gy + 0.2, -6);
  addMesh(new THREE.CylinderGeometry(1.2, 1.4, 0.5, 10), new THREE.MeshLambertMaterial({ color: 0x2a2622 }), -46, gy + 0.25, -6);
  for (let i = 0; i < 7; i++) addMesh(new THREE.BoxGeometry(6, 0.25, 0.7), ZM.green, 45, gy + 0.12, -24 + i * 2, false);
  zBox(30, 35, 22, 26.5, gy + 2.6, gy + 2.8, ZM.gate); for (const [x, z] of [[30.2, 22.2], [34.8, 22.2]]) zBox(x - 0.1, x + 0.1, z - 0.1, z + 0.1, gy, gy + 2.6, ZM.wire);
  zBox(31, 34, 23, 26, gy, gy + 1.5, ZM.win);   // the car
  for (const [x, z] of [[-20, -31], [10, -31], [30, -31], [23, 35]]) addMesh(new THREE.BoxGeometry(0.4, 0.25, 0.25), ZM.lamp, x, gy + 4.2, z, false);
}

// ---------- the crashed helicopter in the animal pen ----------
function zBuildCrash() {
  if (typeof heliCustomModel !== 'function') return;
  const m = heliCustomModel('blackhawk', 'blue'), g = m.g, x = -32, z = 2;
  g.position.set(x, ZC.gy + 0.6, z); g.rotation.set(0.12, 0.6, -0.22); scene.add(g);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material = o.material; } });
  if (m.rotor) m.rotor.rotation.y = 0.7;
  ZD.heli = { g, x, z };
  addBlock(x, z, 4, 2.6, 10, LV.hidden);   // you can't walk through it
}

// ---------- Bilal Town round the compound ----------
function zBuildTown() {
  const lit = [], P = new Part();
  for (let x = -270; x <= 270; x += 32) for (let z = -270; z <= 270; z += 30) {
    const hx = x + rand(-6, 6), hz = z + rand(-6, 6);
    if (Math.hypot(hx, hz) > 290) continue;
    if (hx > -88 && hx < 66 && hz > -58 && hz < 50) continue;   // the compound and the lanes
    if (Math.abs(hx) < 60 && hz < -50 && hz > -130) continue;   // the field north of it (the landing zone)
    if (pathDist(hx, hz) < 10) continue;
    const w = rand(9, 15), d = rand(8, 13), h = rand(3.6, 7.6);
    house(hx, hz, w, d, h, { flat: true });
    if (Math.random() < 0.45) lit.push([hx + rand(-w / 3, w / 3), heightAt(hx, hz) + rand(1.4, h - 1), hz + (Math.random() < 0.5 ? -1 : 1) * (d / 2 + 0.06)]);
  }
  for (const [x, y, z] of lit) P.box(0.9, 0.7, 0.05, 0xffc87a, x, y, z);
  if (lit.length) scene.add(new THREE.Mesh(P.build(), new THREE.MeshBasicMaterial({ vertexColors: true })));
  // a few street lamps along the roads
  const L = new Part();
  for (let i = 0; i < 40; i++) { const x = rand(-260, 260), z = pick([-45, 50, 140, 230]) + 6; if (Math.abs(x) < 50 && z < 0) continue; L.box(0.5, 0.25, 0.3, 0xffe0a0, x, heightAt(x, z) + 5, z); }
  scene.add(new THREE.Mesh(L.build(), new THREE.MeshBasicMaterial({ vertexColors: true })));
}

// ---------- the night: no moon (the raid was timed for a moonless night), stars, and night vision goggles ----------
function zBuildSky() {
  const n = 1400, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, e = Math.asin(Math.random() * 0.95 + 0.04), r = 1300; pos[i * 3] = Math.cos(a) * Math.cos(e) * r; pos[i * 3 + 1] = Math.sin(e) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  ZD.stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 2.2, sizeAttenuation: false, fog: false, depthWrite: false }));
  ZD.stars.renderOrder = -9; scene.add(ZD.stars);
}
const ZNIGHT = { hemi: [0x50608a, 0x0c1016, 0.26], sun: [0x8fa4d8, 0.14], fog: 0x0a0f18, far: 300 };
const ZNVG = { hemi: [0xe8ffe8, 0x606a60, 1.25], sun: [0xe0ffe0, 0.55], fog: 0x1c241c, far: 320 };
function zApplyLight() {
  const L = ZD.nvg ? ZNVG : ZNIGHT;
  hemiLight.color.setHex(L.hemi[0]); hemiLight.groundColor.setHex(L.hemi[1]); hemiLight.intensity = L.hemi[2];
  sunLight.color.setHex(L.sun[0]); sunLight.intensity = L.sun[1];
  scene.fog.color.setHex(L.fog); scene.fog.far = LITE ? L.far * 0.75 : L.far;
  const u = sky.material.uniforms;
  u.top.value.setHex(ZD.nvg ? 0x0c140c : 0x02040a); u.mid.value.setHex(ZD.nvg ? 0x142014 : 0x050912); u.hor.value.setHex(L.fog); u.low.value.setHex(0x030403); u.glow.value = 0;
}
function setNVG(on) {
  ZD.nvg = !!on; zApplyLight();
  try { localStorage.setItem('bf_nvg', ZD.nvg ? '1' : '0'); } catch (e) { }
  showMessage(ZD.nvg ? 'Night vision ON (press L to turn it off)' : 'Night vision OFF: using your weapon light (press L to turn it back on)', 2);
  if (ZD.nvgBtn) ZD.nvgBtn.classList.toggle('on', ZD.nvg);
  if (typeof SFX !== 'undefined' && SFX.click) try { SFX.click(); } catch (e) { }
}
// the goggles: a green tint, grain and the round edge of the tubes, drawn over the picture (cheap: one quad)
let _nvgScene = null, _nvgCam = null, _nvgMat = null;
function renderNVG() {
  if (!ZD30 || !ZD.nvg || !started) return;
  if (!_nvgScene) {
    _nvgScene = new THREE.Scene(); _nvgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    _nvgMat = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, asp: { value: 1 } }, depthTest: false, depthWrite: false, transparent: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform float t, asp; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 p = (vUv - 0.5) * vec2(asp, 1.0);
          float r = length(p * vec2(0.82, 1.0)), edge = 1.0 - smoothstep(0.58, 0.7, r);
          float g = 0.8 + 0.2 * h(floor(gl_FragCoord.xy / 1.5) + floor(t * 30.0));
          gl_FragColor = vec4(vec3(0.32, 1.0, 0.42) * g * edge, 1.0);
        }`,
    });
    _nvgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), _nvgMat));
  }
  _nvgMat.uniforms.t.value = simTime; _nvgMat.uniforms.asp.value = camera.aspect;
  renderer.clearDepth(); renderer.render(_nvgScene, _nvgCam);
}
addEventListener('keydown', e => {
  if (!ZD30 || e.code !== 'KeyL' || e.repeat || typeof started === 'undefined' || !started) return;
  if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  setNVG(!ZD.nvg);
});

// ---------- the guards ----------
function zPosts() {
  const P = [], F = (k, r, c, face) => P.push({ x: zcx(c), y: zfy(k), z: zcz(r), face: face !== undefined ? face : rand(0, 6.28), floor: k });
  // inside the house, waiting round corners
  for (const [k, r, c] of [[0, 3, 6], [0, 11, 7], [0, 4, 16], [0, 10, 16], [0, 18, 15], [0, 15, 23], [1, 6, 22], [1, 2, 4], [1, 2, 14], [1, 11, 5], [1, 11, 16], [1, 18, 6], [1, 17, 17], [2, 13, 14], [2, 16, 15], [2, 16, 20]]) F(k, r, c);
  const O = (x, z, patrol) => P.push({ x, y: ZC.gy, z, face: rand(0, 6.28), floor: -1, patrol: patrol ? patrol.map(([a, b]) => ({ x: a, z: b })) : null });
  O(1, 29); O(10, 30);                                        // the guest house
  O(18, 26, [[18, 26], [44, 26]]); O(-7, 25);                 // the driveway
  O(-6, -22, [[-6, -22], [36, -22]]); O(-6, 16); O(37.2, 17, [[37.2, 17], [37.2, -20]]); O(46, -10);   // the courtyard round the house, the annex
  O(-30, -36, [[-30, -36], [44, -36]]); O(40, 40, [[40, 40], [-6, 40]]);             // the lanes outside the walls
  return P;
}
// ---------- stealth: guards have to notice you first ----------
// A guard who hasn't noticed you builds up suspicion while you are in front of him and in sight: faster when you
// are close, moving or using the white weapon light, slower when you crouch, almost none from behind. Noise adds
// to it too: suppressed shots barely, loud guns and explosions a lot. Full suspicion and he raises the alarm:
// the whole compound wakes up and fighters start coming from the streets. Lose them for a while and it calms down.
function zMovingFast(c) { return c.vel && (c.vel.x * c.vel.x + c.vel.z * c.vel.z) > 6; }
function zCrouched(c) { return c.isPlayer ? !!player.crouch : !!c.crouch; }
function zAlert(n, by, quiet) {
  if (!n.alive || n.zAware) return;
  n.zAware = true; n.zSus = 1; n.zBangT = simTime; n.alertedBy = by || n.alertedBy;
  n.fireT = Math.max(n.fireT || 0, rand(0.9, 1.4) * DIFF().react);   // he has to bring his gun up first
  if (quiet) return;
  n.zShoutAt = simTime + 1.5; n.zShoutBy = by;   // a second and a half to drop him before he shouts
}
function zShout(n) {
  n.zShoutAt = 0;
  for (const o of npcs) if (o !== n && o.alive && o.zPost && !o.zAware && o.pos.distanceTo(n.pos) < 16 && Math.abs(o.pos.y - n.pos.y) < 2.5) { o.zSus = Math.max(o.zSus || 0, 0.7); o.zNoiseAt = n.pos.clone(); }   // his shout
  zRaiseAlarm();
}
function zRaiseAlarm() {
  ZD.lastSeenT = simTime;
  if (ZD.alarm) return;
  ZD.noise = (ZD.noise || 0) + 6; ZD.alarm = true; showMessage('COMPROMISED! They know you are here. Fighters will come from the streets', 4);
  if (typeof SFX !== 'undefined' && SFX.lose) SFX.lose(0.5);
  WAVE.t = Math.min(WAVE.t, 25); netFx(['za', 1]);
}
function zNoise(pos, r, amount) {
  if (net.active && !net.isHost) return;
  for (const n of npcs) {
    if (!n.alive || !n.zPost || n.zAware) continue;
    const dy = Math.abs(n.pos.y - pos.y), rr = dy > 2.5 ? r * 0.45 : r, d = n.pos.distanceTo(pos);
    if (d > rr) continue;
    n.zSus = (n.zSus || 0) + amount * (1 - d / rr); n.zNoiseAt = pos.clone();
    if (n.zSus >= 1) zAlert(n, null);
  }
}
function zGuardThink(n) {
  const dt = Math.min(0.6, simTime - (n.zLastThink || simTime)); n.zLastThink = simTime;
  let best = null, bd = 60, gain = 0, from = null;
  const eye = n.eye(), indoor = n.zPost.floor >= 0;
  for (const c of chars) {
    if (!c.alive || c.team === n.team || c.vehicle || c.inactive) continue;
    const d = c.pos.distanceTo(n.pos); if (d > 60) continue;
    if (Math.abs(c.pos.y - n.pos.y) > 3.2 && d < 20 && indoor) continue;   // a different floor of the house
    if (n.zAware) { if (d < bd && los(eye, c.chest())) { best = c; bd = d; } continue; }
    let R = indoor ? 12 : 17;
    if (zCrouched(c)) R *= 0.6;
    if (c.isPlayer && ZD30 && !ZD.nvg) R *= 1.45;          // the white light gives you away
    if (!c.isPlayer && !c.isRemote) R *= 0.45;              // the team moves quietly and keeps behind you
    if (ZD.alarm) R *= 1.4;
    if (d > R || !los(eye, c.chest())) continue;
    const ang = Math.abs(wrapAngle(Math.atan2(c.pos.x - n.pos.x, c.pos.z - n.pos.z) - n.heading));
    let g = 0;
    if (ang < 0.8) g = 0.25 + 1.5 * (1 - d / R);            // in front of him
    else if (ang < 1.5) g = 0.15 * (1 - d / R);             // the corner of his eye
    else if (d < 2.6 && zMovingFast(c)) g = 0.6;            // he hears you right behind him
    if (zMovingFast(c)) g *= 1.3;
    if (!c.isPlayer && !c.isRemote) g *= 0.5;
    if (ZD.alarm) g *= 2.5;
    if (g > gain) { gain = g; from = c; }
  }
  if (n.zAware) {
    if (best && best !== n.prevTgt && (best.isPlayer || best.isRemote)) n.fireT = Math.max(n.fireT, rand(0.4, 0.8) * DIFF().react);
    n.prevTgt = best; n.target = best; n.tgtVisible = !!best;
    if (best) { ZD.lastSeenT = simTime; for (const o of npcs) if (o !== n && o.alive && o.zPost && o.pos.distanceTo(n.pos) < 14 && Math.abs(o.pos.y - n.pos.y) < 2) { if (!o.zAware) zAlert(o, best, true); else if (!o.target) o.alertedBy = best; } }
    return;
  }
  n.target = null; n.tgtVisible = false;
  if (gain > 0) { n.zSus = (n.zSus || 0) + gain * dt; n.zSusFrom = from; n.zNoiseAt = from.pos.clone(); }
  else n.zSus = Math.max(0, (n.zSus || 0) - 0.18 * dt);
  if (n.zSus >= 1) zAlert(n, from);
}
// the "?" and "!" over a guard's head
let _zMarkTex = null;
function zMark(n) {
  if (!_zMarkTex) _zMarkTex = ['?', '!'].map((ch, i) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.font = 'bold 52px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeText(ch, 32, 34); g.fillStyle = i ? '#ff4030' : '#ffd23a'; g.fillText(ch, 32, 34); const t = new THREE.CanvasTexture(c); return t; });
  if (!n.zSpr) { n.zSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: _zMarkTex[0], depthTest: false, transparent: true })); n.zSpr.scale.set(0.5, 0.5, 1); n.zSpr.renderOrder = 12; scene.add(n.zSpr); }
  const bang = n.zAware && simTime - (n.zBangT || 0) < 3, sus = !n.zAware && (n.zSus || 0) > 0.2;
  n.zSpr.visible = n.alive && (bang || sus);
  if (n.zSpr.visible) { n.zSpr.material.map = _zMarkTex[bang ? 1 : 0]; n.zSpr.material.opacity = bang ? 1 : clamp(n.zSus * 1.3, 0.35, 1); n.zSpr.position.set(n.pos.x, n.pos.y + 2.45, n.pos.z); }
}
function zGuard(n, dt) {
  const S = ROLE_STATS[n.role] || ROLE_STATS.rifle, P = n.zPost;
  n.thinkT -= dt; if (n.thinkT <= 0) { n.thinkT = rand(0.25, 0.4); zGuardThink(n); }
  if (n.target && !n.target.alive) { n.target = null; n.tgtVisible = false; }
  const tgt = n.tgtVisible ? n.target : null;
  let moving = false, mx = 0, mz = 0, speed = 1.7;
  const sus = !n.zAware && (n.zSus || 0) > 0.3;
  if (!tgt && P.patrol && !n.alertedBy && !sus) {
    n.zPi = n.zPi || 0; const w = P.patrol[n.zPi], dx = w.x - n.pos.x, dz = w.z - n.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.8) n.zPi = (n.zPi + 1) % P.patrol.length;
    else { mx = dx / d; mz = dz / d; const nx = n.pos.x + mx * speed * dt, nz = n.pos.z + mz * speed * dt; if (!blockedAt(nx, nz, n.pos.y)) { n.pos.x = nx; n.pos.z = nz; moving = true; } else n.zPi = (n.zPi + 1) % P.patrol.length; }
  } else if (!P.patrol) { n.pos.x += (P.x - n.pos.x) * Math.min(1, dt * 2); n.pos.z += (P.z - n.pos.z) * Math.min(1, dt * 2); }
  const floor = pushOut(n.pos, 0.4, n.pos.y); n.pos.y = lerp(n.pos.y, floor, Math.min(1, dt * 12)); if (Math.abs(n.pos.y - floor) > 2) n.pos.y = floor;
  let face = P.face + Math.sin(simTime * 0.35 + n.npcIdx) * 0.9;   // looking about
  if (sus && n.zNoiseAt) face = Math.atan2(n.zNoiseAt.x - n.pos.x, n.zNoiseAt.z - n.pos.z);   // what was that?
  if (tgt) face = Math.atan2(tgt.pos.x - n.pos.x, tgt.pos.z - n.pos.z);
  else if (n.zAware && n.alertedBy && n.alertedBy.alive) { face = Math.atan2(n.alertedBy.pos.x - n.pos.x, n.alertedBy.pos.z - n.pos.z); if ((n.alertT = (n.alertT || 0) + dt) > 8) { n.alertedBy = null; n.alertT = 0; } }
  else if (moving) face = Math.atan2(mx, mz);
  n.heading += wrapAngle(face - n.heading) * Math.min(1, dt * 7);
  n.moving = moving;
  if (n.crouchT === undefined || (n.crouchT -= dt) <= 0) { n.crouchT = rand(2, 5); n.wantCrouch = Math.random() < 0.35; }
  n.crouch = !!(tgt && n.wantCrouch && !moving);
  if (n.zAware && n.zShoutAt && simTime > n.zShoutAt) zShout(n);
  if (n.zAware) npcShoot(n, S, dt);
  animateNPC(n, dt, moving ? speed : 0, !!tgt || (n.zAware && !!n.alertedBy));
  zMark(n);
}

// ---------- the target ----------
function zBuildTarget() {
  if (!ZD.targetAt) return;
  // a tall man (he was 6 ft 4 in) in a tan shalwar kameez and a dark waistcoat, a white cap, a long greying beard
  const P = new Part(), cloth = 0xc8b48c, cloth2 = 0xb8a47e, vest = 0x4a4a40, skin = 0xb98a66, beard = 0x6a6660, cap = 0xf2f0ea;
  for (const sd of [-1, 1]) { P.cyl(0.085, 0.075, 0.62, cloth2, 0.11 * sd, 0.36, 0, 0, 0, 0, 1, 8); P.box(0.13, 0.07, 0.26, 0x3a2e24, 0.11 * sd, 0.035, 0.04); }   // trousers, sandals
  P.cyl(0.25, 0.3, 0.62, cloth, 0, 0.86, 0, 0, 0, 0, 0.7, 12);    // the long shirt, down to the knees
  P.cyl(0.24, 0.25, 0.58, cloth, 0, 1.42, 0, 0, 0, 0, 0.62, 12);
  P.cyl(0.255, 0.26, 0.5, vest, 0, 1.45, 0, 0, 0, 0, 0.66, 12);
  for (const sd of [-1, 1]) { P.cyl(0.075, 0.07, 0.62, cloth, 0.31 * sd, 1.42, 0, 0, 0, 0.08 * sd, 1, 8); P.ball(0.06, skin, 0.34 * sd, 1.08, 0); }
  P.cyl(0.065, 0.07, 0.09, skin, 0, 1.76, 0, 0, 0, 0, 1, 8);
  P.add(new THREE.SphereGeometry(0.14, 12, 10), skin, 0, 1.9, 0.01, 0, 0, 0, 0.92, 1.15, 1.0);
  P.add(new THREE.SphereGeometry(0.12, 10, 8), beard, 0, 1.78, 0.06, 0, 0, 0, 0.95, 1.5, 0.75);   // the beard
  for (const sd of [-1, 1]) { P.box(0.04, 0.02, 0.012, 0xf0ece4, 0.05 * sd, 1.93, 0.133); P.box(0.02, 0.02, 0.014, 0x2a1e16, 0.05 * sd, 1.93, 0.137); P.box(0.055, 0.014, 0.012, 0x3a3630, 0.05 * sd, 1.965, 0.13); }
  P.box(0.03, 0.06, 0.04, skin, 0, 1.88, 0.14, 0.25);
  P.cyl(0.15, 0.15, 0.09, cap, 0, 2.02, 0, 0, 0, 0, 1, 14);
  const g = new THREE.Mesh(P.build(), VEH_MAT); g.scale.setScalar(1.06); g.position.copy(ZD.targetAt); g.castShadow = true; scene.add(g);
  ZD.target = { g, at: ZD.targetAt.clone() };
}
function zTargetRay(origin, dir, maxD, team, best) {
  if (!ZD.target || ZD.down || team !== 'blue') return best;
  const t = raySphere(origin, dir, _zdC.set(ZD.target.at.x, ZD.target.at.y + 1.3, ZD.target.at.z), 0.7);
  if (t !== null && t < (best ? best.dist : maxD)) return { dist: t, point: origin.clone().addScaledVector(dir, t), zdTarget: true };
  return best;
}
const _zdC = new THREE.Vector3();
function zTargetDown(name, fromNet) {
  if (ZD.down) return;
  ZD.down = true; ZD.downBy = name || 'The team'; ZD.downT = simTime;
  const g = ZD.target && ZD.target.g; if (g) { g.rotation.x = -Math.PI / 2; g.position.y = ZD.target.at.y + 0.2; }
  showMessage(`${ZD.downBy}: "For God and country. Geronimo, Geronimo, Geronimo... Geronimo E-KIA." Bag him (E) and drag him to the helicopter north of the compound!`, 9);
  if (typeof unlock === 'function' && !fromNet) try { unlock('zd30'); } catch (e) { }
  if (!fromNet) netFx(['zk', ZD.downBy]);
  if (typeof SFX !== 'undefined' && SFX.capture) SFX.capture();
}
// ---------- the body: bag him and drag him to the helicopter ----------
function zBagMake() {
  if (ZD.bag) return ZD.bag;
  const P = new Part(), wh = 0xeeeeea;
  P.cyl(0.3, 0.3, 1.7, wh, 0, 0.26, 0, Math.PI / 2, 0, 0, 1, 12, 0.8, 1);
  P.ball(0.3, wh, 0, 0.26, 0.85); P.ball(0.3, wh, 0, 0.26, -0.85);
  for (const z of [-0.5, 0, 0.5]) P.cyl(0.31, 0.31, 0.06, 0x9a9a94, 0, 0.26, z, Math.PI / 2, 0, 0, 1, 12, 0.8, 1);   // straps
  P.box(0.06, 0.04, 0.5, 0x6a6a64, 0.1, 0.5, 1.05); P.box(0.06, 0.04, 0.5, 0x6a6a64, -0.1, 0.5, 1.05);   // the handles you pull it by
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true;
  const at = ZD.target ? ZD.target.at : new THREE.Vector3();
  m.position.set(at.x, at.y, at.z); scene.add(m);
  if (ZD.target && ZD.target.g) ZD.target.g.visible = false;
  ZD.bag = { m, pos: m.position, carrier: null };
  return ZD.bag;
}
function zNearBag(c) {
  if (!ZD.down || !c || !c.alive) return false;
  const at = ZD.bag ? ZD.bag.pos : ZD.target && ZD.target.at; if (!at) return false;
  return Math.hypot(c.pos.x - at.x, c.pos.z - at.z) < 2.3 && Math.abs(c.pos.y - at.y) < 1.4;
}
function zBagGrab(c, fromNet) {
  const B = zBagMake(); if (B.carrier && B.carrier !== c) return;
  B.carrier = c;
  if (c === player) { player.speedMul = 0.55; showMessage('You have him. Drag him to the helicopter! (E to drop him and fight)', 3); }
  if (!fromNet) netFx(['zg']);
}
function zBagDrop(fromNet, x, y, z) {
  const B = ZD.bag; if (!B) return;
  if (B.carrier === player) player.speedMul = 1;
  B.carrier = null;
  if (x !== undefined) B.pos.set(x, y, z);
  if (!fromNet) netFx(['zd', Math.round(B.pos.x * 10) / 10, Math.round(B.pos.y * 10) / 10, Math.round(B.pos.z * 10) / 10]);
}
function zBagPrompt() {
  if (!ZD.down || ZD.exfil) return '';
  const B = ZD.bag;
  if (B && B.carrier === player) return '';
  if (B && B.carrier) return '';
  if (zNearBag(player)) return B ? 'Press E to pick up the body bag' : 'Press E to put him in the body bag and drag him out';
  return '';
}
function zBagUpdate(dt) {
  const B = ZD.bag; if (!B) return;
  const c = B.carrier;
  if (c && !c.alive) { if (c === player) zBagDrop(); else B.carrier = null; return; }
  if (c === player && player.speedMul !== 0.55) player.speedMul = 0.55;
  if (!c) return;
  // it slides along behind whoever has it, on the end of their arm
  const dx = B.pos.x - c.pos.x, dz = B.pos.z - c.pos.z, d = Math.hypot(dx, dz) || 1, L = 1.25;
  const tx = c.pos.x + dx / d * L, tz = c.pos.z + dz / d * L;
  if (!blockedAt(tx, tz, c.pos.y, 0.25) || d > 2.5) { B.pos.x = tx; B.pos.z = tz; }
  B.pos.y += (c.pos.y - B.pos.y) * Math.min(1, dt * 8);
  B.m.rotation.y = Math.atan2(c.pos.x - B.pos.x, c.pos.z - B.pos.z);
  if (d > 4) { B.pos.x = c.pos.x - Math.sin(B.m.rotation.y) * L; B.pos.z = c.pos.z - Math.cos(B.m.rotation.y) * L; }
}
function coopTargetDone() { return ZD30 ? ZD.exfil : (typeof LEADER !== 'undefined' && LEADER.found); }

// ---------- the pick-up helicopter, and blowing up the one that crashed ----------
function zExfilUpdate(dt) {
  if (!ZD.down) return;
  const lz = ZC.lz, gy = heightAt(lz.x, lz.z);
  if (!ZD.pick && typeof heliCustomModel === 'function') { const m = heliCustomModel('blackhawk', 'blue'); ZD.pick = m; m.g.position.set(lz.x + 120, gy + 60, lz.z - 80); scene.add(m.g); }
  if (ZD.pick) {
    const g = ZD.pick.g, want = new THREE.Vector3(lz.x, gy + 0.2, lz.z), d = g.position.distanceTo(want);
    if (d > 0.3) { g.position.lerp(want, Math.min(1, dt * (d > 30 ? 0.4 : 0.8))); g.rotation.y = Math.atan2(g.position.x - lz.x, g.position.z - lz.z) * 0.2; }
    if (ZD.pick.rotor) ZD.pick.rotor.rotation.y += dt * 24;
    if (Math.random() < dt * 8) smokePuff(new THREE.Vector3(lz.x + rand(-2, 2), gy + 0.3, lz.z + rand(-2, 2)), 0x6ad06a, rand(0.8, 1.6), 3, 1.2);   // green marker smoke
  }
  if (!ZD.heliBoom && ZD.heli && simTime - ZD.downT > 20) {   // the crashed helicopter is blown up so nothing of it is left behind
    ZD.heliBoom = true; const p = new THREE.Vector3(ZD.heli.x, ZC.gy + 1.5, ZD.heli.z);
    explosion(p, 7, 10, null, 0, true); fxExplosion(p, 9); showMessage('Demolition charges: the crashed helicopter is destroyed', 3);
    ZD.heli.g.traverse(o => { if (o.isMesh) o.material = new THREE.MeshLambertMaterial({ color: 0x1e1c1a }); });
    ZD.fire = p;
  }
  if (ZD.fire && Math.random() < dt * 14) smokePuff(ZD.fire.clone().add(new THREE.Vector3(rand(-2, 2), rand(0, 1.5), rand(-3, 3))), Math.random() < 0.4 ? 0xff8a30 : 0x2a2622, rand(1, 2.4), 2.5, 2);
  // the battle is won when someone from the team reaches the helicopter
  if (!ZD.exfil && (!net.active || net.isHost)) {
    const humans = [player, ...(net.remotes ? [...net.remotes.values()].map(r => r.char) : [])].filter(c => c && c.alive && c.team === 'blue');
    const B = ZD.bag, bagIn = B && Math.hypot(B.pos.x - lz.x, B.pos.z - lz.z) < 9;
    if (bagIn && humans.some(c => Math.hypot(c.pos.x - lz.x, c.pos.z - lz.z) < 10)) { ZD.exfil = true; zBagDrop(); if (B) B.m.visible = false; endGame('blue'); }
    else if (!bagIn && !ZD.lzWarn && humans.some(c => Math.hypot(c.pos.x - lz.x, c.pos.z - lz.z) < 10)) { ZD.lzWarn = true; showMessage('Not without the body. Go back and bring the bag!', 3); }
  }
}

// ---------- breach charges ----------
function zNearBreach() {
  if (!player.alive || player.vehicle || player.gv) return null;
  let best = null, bd = 2.6;
  for (const b of ZD.breaches) {
    if (b.done || b.charge) continue;
    if (Math.abs(player.pos.y - b.y) > 1.6) continue;
    const dx = Math.max(Math.abs(player.pos.x - b.x) - (b.bb.maxX - b.bb.minX) / 2, 0), dz = Math.max(Math.abs(player.pos.z - b.z) - (b.bb.maxZ - b.bb.minZ) / 2, 0), d = Math.hypot(dx, dz);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function zPlaceCharge(b, mine) {
  if (b.done || b.charge) return;
  const P = new Part(); P.box(0.35, 0.25, 0.1, 0x4a5030, 0, 0, 0); P.box(0.08, 0.06, 0.12, 0x222222, 0.1, 0.1, 0);
  const g = new THREE.Mesh(P.build(), VEH_MAT), side = Math.sign(player.pos.z - b.z) || 1, sideX = Math.sign(player.pos.x - b.x) || 1, thinZ = (b.bb.maxZ - b.bb.minZ) < (b.bb.maxX - b.bb.minX);
  g.position.set(thinZ ? b.x : b.x + sideX * ((b.bb.maxX - b.bb.minX) / 2 + 0.06), b.y + 1.2, thinZ ? b.z + side * ((b.bb.maxZ - b.bb.minZ) / 2 + 0.06) : b.z);
  if (!thinZ) g.rotation.y = Math.PI / 2;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff2a1a })); lamp.position.set(0.1, 0.16, 0); g.add(lamp); g.lamp = lamp;
  scene.add(g); b.charge = g; b.fuse = 3; b.mine = mine;
  if (mine) { showMessage('Charge set! Stand back...', 2); netFx(['zc', ZD.breaches.indexOf(b)]); }
}
function zBreachUpdate(dt) {
  for (const b of ZD.breaches) {
    if (!b.charge || b.done) continue;
    b.fuse -= dt; b.charge.lamp.visible = Math.sin(simTime * (b.fuse < 1 ? 30 : 12)) > 0;
    if (b.mine && b.fuse <= 0) { zOpen(b); netFx(['zb', ZD.breaches.indexOf(b)]); }
    else if (!b.mine && b.fuse < -8) { scene.remove(b.charge); b.charge = null; }   // its owner left: nothing happened
  }
  const near = zNearBreach();
  ZD.near = near;
  if (!ZD.prompt) { const el = document.createElement('div'); el.id = 'zdPrompt'; el.className = 'hud'; el.style.cssText = 'position:fixed;left:50%;top:60%;transform:translateX(-50%);background:rgba(0,0,0,.55);color:#fff;padding:6px 14px;border-radius:8px;font:600 15px system-ui,sans-serif;pointer-events:none;display:none;z-index:5'; document.body.appendChild(el); ZD.prompt = el; }
  const bagP = zBagPrompt();
  ZD.prompt.style.display = near || bagP ? 'block' : 'none';
  if (bagP) ZD.prompt.textContent = bagP;
  else if (near) ZD.prompt.textContent = near.locked ? 'Locked door. Shoot the lock, use the knife, or press E for a breach charge' : `Press E to set a breach charge on the ${near.name}`;
}

// ---------- the mission: objectives, the clock and the HUD ----------
function zInHouse(c) { return c.pos.x > zx(0) && c.pos.x < zx(26) && c.pos.z > zz(0) && c.pos.z < zz(22); }
function zUpdate(dt) {
  if (!started) return;
  zBreachUpdate(dt); zBagUpdate(dt); zExfilUpdate(dt); zLightsUpdate(); zCivUpdate(dt); zVillageUpdate(dt);
  if (ZD.target && !ZD.down) {   // he watches the door
    const g = ZD.target.g; g.rotation.y = Math.atan2(player.pos.x - ZD.target.at.x, player.pos.z - ZD.target.at.z) * 0.6 + Math.PI * 0.75;
    if (!ZD.seen && player.alive && player.pos.distanceTo(ZD.target.at) < 8 && Math.abs(player.pos.y - ZD.target.at.y) < 1.5) { ZD.seen = true; showMessage('Third floor. There he is: take the shot!', 3); }
  }
  if (ZD.trash && Math.random() < dt * 3) smokePuff(ZD.trash.clone().add(new THREE.Vector3(rand(-0.6, 0.6), 0.3, rand(-0.6, 0.6))), 0x4a4440, rand(0.5, 1), 4, 0.8);
  if (!gameOver) ZD.clock = Math.max(0, ZD.clock - dt);
  // the alarm dies down once nobody has seen the team for a while; those who were hunting stay jumpy
  if (ZD.alarm && (!net.active || net.isHost) && simTime - (ZD.lastSeenT || 0) > 40) {
    ZD.alarm = false; netFx(['za', 0]); showMessage('Quiet again. They lost you... for now', 3);
    for (const n of npcs) if (n.zPost && n.alive && n.zAware) { n.zAware = false; n.zSus = 0.6; n.target = null; n.tgtVisible = false; n.alertedBy = null; }
  }
  // how close they are to spotting you: green, amber, red
  const susMax = npcs.reduce((m, n) => n.alive && n.zPost && !n.zAware ? Math.max(m, n.zSus || 0) : m, 0);
  const state = ZD.alarm ? 2 : susMax > 0.45 ? 1 : 0;
  if (!ZD.edge) { const el = document.createElement('div'); el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:3;transition:box-shadow .3s'; document.body.appendChild(el); ZD.edge = el; }
  const pulse = 0.5 + 0.5 * Math.sin(simTime * 6);
  ZD.edge.style.boxShadow = state === 2 ? `inset 0 0 ${60 + pulse * 50}px rgba(220,30,20,${0.35 + pulse * 0.25})` : state === 1 ? 'inset 0 0 70px rgba(230,170,30,0.28)' : 'none';
  ZD.stateTxt = state === 2 ? '<span style="color:#ff6a5a">COMPROMISED</span>' : state === 1 ? '<span style="color:#ffd23a">SUSPICIOUS</span>' : '<span style="color:#7dff8a">UNDETECTED</span>';
  if (ZD.clock <= 0 && !gameOver && !ZD.exfil && (!net.active || net.isHost)) { ZD.lost = true; endGame('red'); }
  // objective line
  let obj;
  const k = player.pos.y > zfy(2) - 0.5 ? 2 : player.pos.y > zfy(1) - 0.5 ? 1 : 0, inH = zInHouse(player);
  if (ZD.down && (!ZD.bag || !ZD.bag.carrier) && !ZD.exfil) obj = ZD.bag ? 'The body bag is on the ground. Pick it up (E) and get it to the helicopter' : 'GERONIMO E-KIA. Bag the body (E) and drag it to the helicopter north of the compound';
  else if (ZD.exfil) obj = 'Wheels up. Mission complete';
  else if (ZD.down) obj = ZD.bag.carrier === player ? 'Drag him to the helicopter on the landing zone north (green smoke). You are slow: E to drop him and fight' : `${ZD.bag.carrier.name || 'A teammate'} has the body. Cover them to the helicopter (green smoke, north)`;
  else if (inH && k === 2) obj = 'Third floor. Turn right at the top of the stairs. He is in the bedroom';
  else if (inH && k === 1) obj = ZD.breaches.find(b => b.name === 'stair gate').done ? 'Second floor. The stairs to his floor go up beside the ones you came up' : 'Second floor. The stairs to his floor are right beside the ones you came up, behind a locked metal door: blow it';
  else if (inH) obj = ZD.breaches.find(b => b.name === 'lower stair gate').done ? 'Ground floor. Up the stairs at the back of the house' : 'Ground floor. Clear the rooms. The stairs are at the back of the house (east side of the hall), behind a locked gate';
  else if (zZone(player.pos) === 'pen') obj = 'You came down in the animal pen, the big west yard. Blow the pen gate (east wall) into the main courtyard';
  else if (zZone(player.pos) === 'drive') obj = 'The driveway and the guest house. Blow the inner gate (north) into the main courtyard';
  else obj = 'Get into the main house: blow the front door (north side)';
  const left = chars.filter(c => c.alive && c.team === 'red' && zInPoly(c.pos.x, c.pos.z)).length;   // inside the walls (works online too)
  if (!ZD.hud) { const el = document.createElement('div'); el.id = 'zdHud'; el.className = 'hud'; el.style.cssText = 'position:fixed;left:50%;top:44px;transform:translateX(-50%);color:#e8ffe8;text-align:center;font:600 14px system-ui,sans-serif;text-shadow:0 1px 3px #000;pointer-events:none;max-width:80vw;z-index:4'; document.body.appendChild(el); ZD.hud = el; }
  const mm = Math.floor(ZD.clock / 60), ss = Math.floor(ZD.clock % 60);
  const html = `<div style="font-size:12px;opacity:.85">OPERATION NEPTUNE SPEAR &nbsp;·&nbsp; ${ZD.stateTxt || ''} &nbsp;·&nbsp; Night vision ${ZD.nvg ? 'ON' : 'OFF'} (L) &nbsp;·&nbsp; Pakistani response in ${mm}:${ss < 10 ? '0' : ''}${ss} &nbsp;·&nbsp; Enemies inside the walls: ${left}</div><div>${obj}</div>`;
  if (html !== ZD.hudHtml) { ZD.hud.innerHTML = html; ZD.hudHtml = html; }
}

// ---------- co-op: everyone on blue, enemy waves, win by taking down the target ----------
const WAVE = { n: 0, t: ZD30 ? 25 : 45 };
function coopUpdate(dt) {
  if (!started || gameOver || (net.active && !net.isHost)) return;
  if (ZD30 && !ZD.alarm && !ZD.down) return;   // the streets stay quiet until you are spotted (or the shooting upstairs is over)
  WAVE.t -= dt; if (WAVE.t > 0) return;
  WAVE.t = ZD30 ? (ZD.down ? 35 : 60) : 40;
  const held = npcs.filter(n => n.team === 'red' && !n.inactive && !n.alive && n.cw === 'held');
  if (!held.length) return;
  WAVE.n++;
  if (ZD30 && WAVE.n === 1) for (const nm of ['main gate', 'inner gate']) { const b = ZD.breaches.find(q => q.name === nm); if (!b.done) { zOpen(b, false, true); netFx(['zb', ZD.breaches.indexOf(b)]); } }   // they blow their way in
  const k = Math.min(held.length, ZD30 ? 1 + Math.floor(Math.random() * (WAVE.n > 2 ? 3 : 2)) : 8 + WAVE.n * 3);   // on the raid: one or two at a time, never a flood
  for (let i = 0; i < k; i++) { held[i].cw = 'go'; held[i].respawnT = rand(0.2, 4); }
  const msg = ZD30 ? (k === 1 ? 'Radio: an armed man is moving in from the street. Watch the crowd' : `Radio: ${k} armed men among the crowd, coming your way`) : `WAVE ${WAVE.n}: ${k} enemy soldiers counter-attacking!`;
  showMessage(msg, 4); netFx(['zw', msg]);
}
// street fighters find their way in: through the main gate, across the driveway, through the inner gate, to the front door
function zZone(p) {
  if (!zInPoly(p.x, p.z)) return 'out';
  if (zInHouse({ pos: p })) return 'house';
  if (p.x < -12) return 'pen';
  return p.z > 20 ? 'drive' : 'court';
}
function zFighterGoal(n, T) {
  const z = zZone(n.pos), tz = zZone(T.pos), done = nm => ZD.breaches.find(b => b.name === nm).done, near = (x, zz) => Math.hypot(n.pos.x - x, n.pos.z - zz) < 2.5;
  const V = (x, zz) => new THREE.Vector3(x, 0, zz), fx = ZD.frontDoor.x;
  if (z === tz && z !== 'out') return V(T.pos.x, T.pos.z);
  if (z === 'out') { if (tz === 'out') return V(T.pos.x, T.pos.z); if (!done('main gate')) return V(23, 41); return near(23, 37) || n.zGate ? (n.zGate = true, V(23, 27)) : V(23, 37); }
  n.zGate = false;
  if (z === 'drive') { if (tz === 'out') return V(23, 37); return done('inner gate') ? (near(2, 22.5) || n.zIn ? (n.zIn = true, V(2, 16)) : V(2, 22.5)) : V(2, 23); }
  n.zIn = false;
  if (z === 'pen') return done('pen gate') ? (near(-15, -10) || n.zPg ? (n.zPg = true, V(-8, -10)) : V(-15, -10)) : V(-16, -10);
  n.zPg = false;
  if (z === 'court') {
    if (tz === 'house') return done('front door') ? (near(fx, zz(0) - 2) || n.zDoor ? (n.zDoor = true, V(fx, zz(0) + 3)) : V(fx, zz(0) - 2)) : V(fx, zz(0) - 2.5);
    n.zDoor = false;
    if (tz === 'pen') return done('pen gate') ? V(-15, -10) : V(-9, -10);
    return done('inner gate') ? V(2, 23) : V(2, 17);
  }
  return V(T.pos.x, T.pos.z);   // in the house: straight for you
}
function zBlueLeader(n) {
  let best = null, bd = Infinity;
  for (const c of chars) { if (!c.alive || c.team !== 'blue' || !(c.isPlayer || c.isRemote) || c.vehicle) continue; const d = c.pos.distanceTo(n.pos); if (d < bd) { bd = d; best = c; } }
  return best;
}
function installCoopHooks() {
  if (installCoopHooks.done) return; installCoopHooks.done = true;
  // computer soldiers on the red side come back in waves, not one by one; on the raid the guards don't come back at all
  const upd = updateNPC;
  updateNPC = function (n, dt) {
    if (n.team === 'red' && !n.inactive) {
      if (n.alive) { n.zLived = true; n.cw = undefined; }
      else {
        if (ZD30 && n.zPost === undefined) { const P = ZD.posts[ZD.postI]; if (P && n.role === 'rifle') { n.zPost = P; ZD.postI++; } else n.zPost = null; }
        if (ZD30 && n.zPost) { if (n.zLived) return; }
        else if (n.cw !== 'go' && (ZD30 || n.zLived)) { n.cw = 'held'; return; }
      }
      if (ZD30 && n.zPost && n.alive) { zGuard(n, dt); return; }
    }
    if (ZD30 && n.team === 'blue' && n.alive && !n.inactive) {   // the team stays with you: anyone left far behind or out of sight catches up
      const L = zBlueLeader(n);
      if (L && L.isPlayer) {   // in front of your gun? step aside at once
        const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), dx = n.pos.x - L.pos.x, dz = n.pos.z - L.pos.z, along = dx * fx + dz * fz, across = dx * -fz + dz * fx;
        if (along > 0 && along < 14 && Math.abs(across) < 1.1 && Math.abs(n.pos.y - L.pos.y) < 1.5) {
          const sd = across >= 0 ? 1 : -1, nx = n.pos.x + -fz * sd * 4.5 * dt - fx * 2 * dt, nz = n.pos.z + fx * sd * 4.5 * dt - fz * 2 * dt;
          if (!blockedAt(nx, nz, n.pos.y)) { n.pos.x = nx; n.pos.z = nz; }
        }
      }
      if (L) {
        n.zFollowT = (n.zFollowT || 0) + dt;
        if (n.zFollowT > 1) {
          n.zFollowT = 0; const d = L.pos.distanceTo(n.pos), seen = d < 30 && los(n.eye(), L.eye());
          n.zLostT = seen ? 0 : (n.zLostT || 0) + 1;
          if (d > 45 || (d > 7 && n.zLostT > 4) || Math.abs(L.pos.y - n.pos.y) > 3.5) {
            const back = new THREE.Vector3(Math.sin(L.yaw !== undefined ? L.yaw : L.heading), 0, Math.cos(L.yaw !== undefined ? L.yaw : L.heading));
            for (const s of [1.8, 1.2, 2.6, 0.7]) { const x = L.pos.x + back.x * s + rand(-0.6, 0.6), z = L.pos.z + back.z * s + rand(-0.6, 0.6); if (!blockedAt(x, z, L.pos.y)) { n.pos.set(x, L.pos.y, z); n.zLostT = 0; break; } }
          }
        }
      }
    }
    return upd(n, dt);
  };
  const think = npcThink;
  npcThink = function (n, S) {
    think(n, S);
    if (ZD30 && n.team === 'red' && !n.zPost) {   // a street fighter: head for the nearest of the team
      const L = zBlueLeader(n) || player;
      if (L) { n.goal = zFighterGoal(n, L); n.goalT = 30; n.goalPoint = n.goalPoint || points[0]; }
      if (n.target && n.pos.distanceTo(n.target.pos) > 32) { n.target = null; n.tgtVisible = false; }   // gun held low, walking with the crowd, until he is close
    }
    if (ZD30 && n.team === 'blue' && !ZD.alarm && n.target && n.target.zPost && !n.target.zAware) { n.target = null; n.tgtVisible = false; }   // weapons tight until you are spotted
    if (ZD30 && n.team === 'blue') {
      const L = zBlueLeader(n);
      if (L) {   // a stack behind you, a step to either side, never between you and what you are aiming at
        const yaw = L.isPlayer ? player.yaw : (L.heading || 0) + Math.PI, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = -fz, rz = fx;
        const i = n.npcIdx % 5, back = 2.2 + Math.floor(i / 2) * 1.3, side = (i % 2 ? 1 : -1) * (0.9 + (i % 3) * 0.3);
        n.goal = new THREE.Vector3(L.pos.x - fx * back + rx * side, 0, L.pos.z - fz * back + rz * side); n.goalT = 30;
      }
    }
  };
  const fs = findSpawn;
  findSpawn = function (team, pref) {
    if (ZD30 && team === 'blue') {   // the team starts (and comes back) by the crashed helicopter in the animal pen
      for (let i = 0; i < 60; i++) { const x = rand(-44, -16), z = rand(-16, 18); if (zInPoly(x, z) && zInPoly(x - 3, z) && zInPoly(x, z + 3) && zInPoly(x, z - 3) && Math.hypot(x - ZD.heli.x, z - ZD.heli.z) > 6.5 && !blockedAt(x, z, heightAt(x, z))) return { x, z }; }
      return { x: -18, z: 8 };
    }
    if (ZD30 && team === 'red') {   // fighters arrive from the streets of the town
      for (let i = 0; i < 40; i++) { const a = rand(0, 6.28), r = rand(85, 140), x = Math.cos(a) * r, z = Math.sin(a) * r; if (pathDist(x, z) < 6 && !blockedAt(x, z, heightAt(x, z))) return { x, z }; }
    }
    return fs(team, pref);
  };
  const sc = spawnChar;
  spawnChar = function (c, pref) {
    sc(c, pref);
    if (ZD30 && c.zPost) { const P = c.zPost; c.pos.set(P.x, P.y, P.z); c.heading = P.face; c.zPi = 0; c.lastPos && c.lastPos.copy(c.pos); }
  };
  if (ZD30) {
    const ia = interact; interact = function () {
      if (!player.vehicle && !player.gv && player.alive) {
        if (ZD.bag && ZD.bag.carrier === player) { zBagDrop(); showMessage('Body down. Fight!', 1.5); return; }
        if (ZD.down && !ZD.exfil && (!ZD.bag || !ZD.bag.carrier) && zNearBag(player)) { zBagGrab(player); return; }
        if (ZD.near) { zPlaceCharge(ZD.near, true); return; }
      }
      return ia.apply(this, arguments);
    };
    const rh = rayHit; rayHit = function (o, d, m, team, opts) { return zVillRay(o, d, m, team, zDoorRay(o, d, m, zTargetRay(o, d, m, team, rh(o, d, m, team, opts)))); };   // (the families are never hit: bullets pass them by)
    const ah = applyHit; applyHit = function (hit, d, wpn, shooter) { if (hit && hit.zdDoor) { zDoorHit(hit.zdDoor, hit, wpn); return true; } if (hit && hit.zdVill) { zVillHit(hit.zdVill, shooter || player); return false; } if (hit && hit.zdCiv) { if (shooter === player) zCivHit(hit.zdCiv); return false; } if (hit && hit.zdTarget) { if (shooter && (shooter === player || shooter.isPlayer)) zTargetDown(player.name); return false; } return ah.apply(this, arguments); };
    const fw = fireWeapon;
    fireWeapon = function () { const w = curW(), r = fw.apply(this, arguments); if (w && w.type === 'hit' && w.sfx !== 'supp') ZD.noise = (ZD.noise || 0) + 0.25; if (w && w.type === 'hit') zNoise(player.pos, w.sfx === 'supp' ? 4.5 : 45, w.sfx === 'supp' ? 0.35 : 2.2); return r; };
    const ex = explosion;
    explosion = function (pos, radius) { ZD.noise = (ZD.noise || 0) + 1.5; const r = ex.apply(this, arguments); zNoise(pos, Math.max(18, radius * 5), 2); return r; };
    const dm = damage;
    damage = function (c, amount, attacker) {
      if (c && c.zPost && c.alive && attacker && attacker.team === 'blue') {
        if (!c.zAware) amount *= 5;   // caught unaware: one or two quiet shots, or the knife, drop him
        const r = dm.apply(this, [c, amount, ...Array.prototype.slice.call(arguments, 2)]);
        if (c.alive) zAlert(c, attacker); else zNoise(c.pos, 5, 0.45);   // a body falling: only those right beside him hear it
        return r;
      }
      return dm.apply(this, arguments);
    };
    const bt = balanceTeams;
    balanceTeams = function (initial) {
      if (net.active && !net.isHost) return;
      let humans = 1; if (net.remotes) humans += net.remotes.size;
      const cap = net.active ? Math.min(40, TEAM_POOL) : TEAM_POOL;
      const want = { blue: clamp(6 - humans, 2, 6), red: Math.min(cap, ZD.posts.length + (net.active ? 6 : 9)) };
      for (const t of TEAMS) npcs.filter(n => n.team === t).forEach((n, i) => {
        if (i < want[t] && n.inactive) { n.inactive = false; n.alive = false; n.respawnT = initial ? 0 : 1; }
        if (i >= want[t] && !n.inactive) { n.inactive = true; n.alive = false; n.model.root.visible = false; }
      });
    };
    updateBunkerLight = function () { };   // no bunkers: the night lighting stays as set
  }
  const ul = updateLevel;
  updateLevel = function (dt) { ul(dt); coopUpdate(dt); if (ZD30) zUpdate(dt); };
  const pt = pickTeam; pickTeam = function (pref) { return COOP ? 'blue' : pt(pref); };
  const af = applyFx;
  applyFx = function (e, src) {
    const k = e[1];
    if (k === 'zb') { const b = ZD.breaches[e[2]]; if (b) zOpen(b, true); return; }
    if (k === 'zc') { const b = ZD.breaches[e[2]]; if (b) zPlaceCharge(b, false); return; }
    if (k === 'zk') { zTargetDown(e[2], true); return; }
    if (k === 'zg') { if (!ZD.down) zTargetDown('The team', true); if (ZD.bag && ZD.bag.carrier === player) zBagDrop(true); zBagGrab(src, true); return; }
    if (k === 'zd') { zBagMake(); zBagDrop(true, e[2], e[3], e[4]); return; }
    if (k === 'zw') { showMessage(e[2], 4); return; }
    if (k === 'za') { if (e[2] && !ZD.alarm) ZD.noise = (ZD.noise || 0) + 6; ZD.alarm = !!e[2]; if (ZD.alarm) showMessage('COMPROMISED! They know you are here', 3); else showMessage('Quiet again. They lost you', 3); return; }
    return af.apply(this, arguments);
  };
  // the team picker: co-op has only one team
  document.querySelectorAll('#teamPick .chip').forEach(c => { if (c.dataset.t !== 'auto' && c.dataset.t !== 'blue') c.style.display = 'none'; });
}

// ---------- building it all ----------
function buildZD30() {
  if (!ZD30 || ZD.built) return; ZD.built = true;
  ZC.gy = heightAt(0, 0); ZC.fb = ZC.gy + 0.3;
  renderer.shadowMap.enabled = false; sunLight.castShadow = false;   // a moonless night: no shadows to see, and drawing them doubled the work
  zBuildCompound(); zBuildCrash(); zBuildTarget(); zBuildTown(); zBuildSky(); zBuildLights(); zArmTeam(); zFakeDoor(); zPlaceFamilies();
  ZD.posts = zPosts();
  zApplyLight();
  if (IS_TOUCH) {   // a night vision button for phones and tablets
    const b = document.createElement('div'); b.textContent = 'NVG'; b.className = 'tbtn' + (ZD.nvg ? ' on' : '');
    b.style.cssText = 'position:fixed;right:14px;top:38%;width:54px;height:54px;border-radius:50%;background:rgba(40,90,40,.55);color:#cfffcf;font:700 14px system-ui;display:flex;align-items:center;justify-content:center;z-index:20;user-select:none';
    b.addEventListener('touchstart', e => { e.preventDefault(); setNVG(!ZD.nvg); }, { passive: false });
    document.body.appendChild(b); ZD.nvgBtn = b;
  }
}

// ---------- the team's weapons on the raid: a suppressed assault rifle, a suppressed pistol and a knife ----------
// (in slots 2, 1 and 3; everything else in the shop still works). Accurate, quiet, small flashes.
function zGunMats() {
  return {
    blk: new THREE.MeshPhongMaterial({ color: 0x1d1e21, shininess: 40, specular: 0x3a3c40 }), fde: new THREE.MeshPhongMaterial({ color: 0x8c7a58, shininess: 14, specular: 0x2a2620 }),
    sup: new THREE.MeshPhongMaterial({ color: 0x2a2c2f, shininess: 22, specular: 0x2c2e32 }), steel: new THREE.MeshPhongMaterial({ color: 0x55595f, shininess: 70, specular: 0x8a9098 }),
    blade: new THREE.MeshPhongMaterial({ color: 0x8e949a, shininess: 110, specular: 0xffffff }), grip: new THREE.MeshLambertMaterial({ color: 0x23211e }),
  };
}
function zRifleModel(M) {
  const g = new THREE.Group();
  vbox(g, 0.058, 0.068, 0.3, M.blk, 0, 0.035, -0.08); vbox(g, 0.052, 0.058, 0.2, M.fde, 0, -0.025, -0.03);    // upper and lower receiver
  vbox(g, 0.02, 0.02, 0.07, M.steel, 0.031, 0.04, -0.07);                                                     // ejection port
  vbox(g, 0.064, 0.066, 0.32, M.fde, 0, 0.032, -0.39);                                                       // free-float rail
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) vbox(g, 0.004, 0.018, 0.03, M.blk, s * 0.032, 0.03, -0.27 - i * 0.045);
  vrail(g, 0.072, 0.07, -0.55);
  vcyl(g, 0.012, 0.012, 0.06, M.steel, 0, 0.033, -0.58); vcyl(g, 0.027, 0.027, 0.24, M.sup, 0, 0.033, -0.72);   // barrel and the long suppressor
  for (let i = 0; i < 3; i++) vcyl(g, 0.0285, 0.0285, 0.008, M.blk, 0, 0.033, -0.62 - i * 0.07);
  vbox(g, 0.044, 0.13, 0.055, M.grip, 0, -0.1, 0.085, -0.3);                                                  // grip
  vbox(g, 0.038, 0.16, 0.068, M.blk, 0, -0.125, -0.1, 0.12);                                                  // magazine
  vcyl(g, 0.019, 0.019, 0.2, M.blk, 0, 0.025, 0.17); vbox(g, 0.05, 0.1, 0.16, M.fde, 0, 0.0, 0.31); vbox(g, 0.052, 0.12, 0.022, M.grip, 0, -0.005, 0.395);   // stock
  vbox(g, 0.032, 0.09, 0.034, M.grip, 0, -0.05, -0.43);                                                       // foregrip
  vbox(g, 0.042, 0.034, 0.075, M.fde, 0.045, 0.04, -0.45); vcyl(g, 0.008, 0.008, 0.01, VM.glow, 0.055, 0.045, -0.49);   // the IR laser box
  vbox(g, 0.06, 0.012, 0.1, M.blk, 0, 0.083, -0.1); vreddot(g, 0.118, -0.11, 0.046);                          // holographic sight
  vbox(g, 0.008, 0.026, 0.01, M.blk, 0, 0.09, -0.52);
  vhand(g, 0, -0.12, 0.1, -0.3); vhand(g, -0.02, -0.095, -0.43, 0, -0.45);
  return { g, ...vmuzzle(g, 0, 0.033, -0.85, 0.035, 0xffd59a), pos: [0.17, -0.17, -0.4], sight: 0.118 };
}
function zPistolModel(M) {
  const g = new THREE.Group();
  vbox(g, 0.048, 0.054, 0.24, M.blk, 0, 0.04, -0.07); for (let i = 0; i < 5; i++) vbox(g, 0.051, 0.04, 0.007, M.steel, 0, 0.04, 0.01 + i * 0.014);   // slide
  vbox(g, 0.044, 0.034, 0.19, M.blk, 0, -0.002, -0.06);
  vcyl(g, 0.011, 0.011, 0.04, M.steel, 0, 0.04, -0.2); vcyl(g, 0.022, 0.022, 0.17, M.sup, 0, 0.04, -0.3);       // threaded barrel and suppressor
  vbox(g, 0.045, 0.15, 0.066, M.grip, 0, -0.085, 0.035, -0.22);
  vbox(g, 0.008, 0.012, 0.07, M.blk, 0, -0.048, -0.04);
  vbox(g, 0.008, 0.022, 0.012, M.blk, 0, 0.078, -0.17); for (const s of [-1, 1]) vbox(g, 0.008, 0.022, 0.012, M.blk, s * 0.014, 0.078, 0.035);   // raised sights to see over the can
  vbox(g, 0.004, 0.006, 0.004, VM.glow, 0, 0.088, -0.17);
  vhand(g, 0, -0.1, 0.05, -0.25);
  return { g, ...vmuzzle(g, 0, 0.04, -0.39, 0.03, 0xffd59a), pos: [0.2, -0.17, -0.42], sight: 0.086 };
}
function zKnifeModel(M) {
  const g = new THREE.Group(), pivot = new THREE.Group(); g.add(pivot);
  vcy(pivot, 0.018, 0.13, M.grip, 0, 0, 0); vbox(pivot, 0.07, 0.012, 0.03, M.blk, 0, 0.07, 0);               // handle and guard
  vbox(pivot, 0.006, 0.19, 0.032, M.blade, 0, 0.17, 0); vbox(pivot, 0.006, 0.04, 0.018, M.blade, 0, 0.28, 0.006, 0.5);   // blade and point
  vbox(pivot, 0.007, 0.15, 0.005, M.steel, 0, 0.16, -0.014);
  pivot.rotation.set(-0.5, 0, -0.35); vhand(pivot, 0, -0.03, 0.0, -Math.PI / 2);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001), new THREE.MeshBasicMaterial({ visible: false, transparent: true }));
  pivot.add(glow);
  return { g, ...vmuzzle(g, 0, 0, -0.3, 0.01), pivot, glow, pos: [0.22, -0.26, -0.4], sight: 0.2, swingT: 0 };
}
function zArmTeam() {
  if (ZW.done || typeof WEAPONS === 'undefined') return; ZW.done = true;
  const M = zGunMats(), set = (id, props, model) => {
    const w = WEAPONS.find(q => q.id === id); if (!w) return;
    const vis = w.model.g.visible; w.model.g.visible = false; vmHolder.remove(w.model.g);
    Object.assign(w, props); w.model = model; model.g.visible = vis; vmHolder.add(model.g);
  };
  set('rifle', { name: 'Suppressed Rifle', spread: 0.005, rate: 0.085, dmg: 34, recoil: 0.018, sfx: 'supp', tracer: 0x9affb0 }, zRifleModel(M));
  set('pistol', { name: 'Suppressed Pistol', spread: 0.004, rate: 0.16, dmg: 42, mag: 15, recoil: 0.035, sfx: 'supp' }, zPistolModel(M));
  set('smg', { name: 'Knife', build: 'knife', type: 'melee', knife: true, rate: 0.42, dmg: 220, force: 6, range: 2.4, recoil: 0, sfx: 'click', mag: 1, reserve: Infinity, reloadT: 0.1, price: 0, auto: false }, zKnifeModel(M));
  player.owned.smg = true; if (typeof refillAmmo === 'function') refillAmmo();
  const se = document.getElementById('slots');   // slot labels
  if (se) WEAPONS.forEach((w, i) => { const d = se.children[i]; if (d && i < 3) d.innerHTML = `<b>${i + 1}</b>${w.name.replace('Suppressed ', '')}`; });
  // quiet shots: a soft cough and the click of the action instead of a bang
  SFX.supp = (v = 1) => {
    if (typeof nz === 'function' && typeof tn === 'function') { nz('bandpass', 1500, 0.05, 0.32 * v, 1.3); nz('lowpass', 420, 0.08, 0.3 * v); tn('square', 2600, 1800, 0.015, 0.03 * v, 0.02); }
    else noiseHit(1400, 0.06, 0.25 * v);
  };
  SFX.knife = (v = 1) => { if (typeof nz === 'function') nz('highpass', 2200, 0.12, 0.12 * v, 0.8); };
  // the knife: one quick, short-range strike where you aim
  const ss = saberSwing;
  saberSwing = function (w) {
    if (!w.knife) return ss.apply(this, arguments);
    w.model.swingT = 1; w.model.swingDir = -(w.model.swingDir || 1); SFX.knife();
    for (const ang of [0, 0.14, -0.14]) {
      const d = aimDir(0); d.applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
      const hit = rayHit(camera.position, d, w.range, player.team);
      if (hit && (hit.char || hit.zdTarget || hit.zdCiv || hit.zdDoor || hit.zdVill)) { if (applyHit(hit, d, w, player)) { showHitmarker(false); SFX.hit(); } return; }
    }
  };
  // the team's own rifles are suppressed too (the computer soldiers on blue)
  const ns = npcShoot;
  npcShoot = function (n) { ZD.quietShot = n.team === 'blue'; try { return ns.apply(this, arguments); } finally { ZD.quietShot = false; } };
  const pa = playAt;
  playAt = function (name, pos, vol) { if (ZD.quietShot && name === 'rifle') name = 'supp'; return pa.call(this, name, pos, vol); };
}

// ---------- the goggles' IR light and the weapon light ----------
// Night vision on: an infrared illuminator lights what is close (things fade with distance) and your rifle's
// IR laser shows as a thin beam. Night vision off: a white light on your gun lights where you aim.
function zBuildLights() {
  ZD.ir = new THREE.PointLight(0xffffff, 0, 38, 1.6); scene.add(ZD.ir);
  ZD.torch = new THREE.SpotLight(0xfff2dc, 0, 55, 0.42, 0.55, 1.4); scene.add(ZD.torch, ZD.torch.target);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  ZD.beam = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xd8ffd8, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  ZD.beam.frustumCulled = false; ZD.beam.visible = false; scene.add(ZD.beam);
  ZD.dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })); ZD.dot.visible = false; scene.add(ZD.dot);
}
const _zf = new THREE.Vector3(), _zr = new THREE.Vector3();
function zLampsUpdate() {
  if (!ZD.lampSpots || simTime - (ZD.lampT || -9) < 0.5) return; ZD.lampT = simTime;
  const near = ZD.lampSpots.slice().sort((a, b) => a.distanceToSquared(player.pos) - b.distanceToSquared(player.pos));
  ZD.houseLights.forEach((L, i) => { const want = near[i]; if (want && !L.position.equals(want)) L.userData.next = want; });
}
function zLampsFade(dt) {   // a lamp that needs to move fades out first, moves, then fades back in: no sudden jumps in the lighting
  for (const L of ZD.houseLights || []) {
    const goal = L.userData.next ? 0 : 0.9;
    L.intensity += clamp(goal - L.intensity, -dt * 3, dt * 3);
    if (L.userData.next && L.intensity <= 0.01) { L.position.copy(L.userData.next); L.userData.next = null; }
  }
}
function zLightsUpdate() {
  zLampsUpdate(); zLampsFade(1 / 60);
  if (!ZD.ir) return;
  const on = started && player.alive && !player.vehicle && !player.gv;
  ZD.ir.intensity = on && ZD.nvg ? 1.5 : 0; ZD.ir.position.copy(camera.position);
  if (ZD.ir.visible !== !!ZD.nvg) { ZD.ir.visible = !!ZD.nvg; ZD.torch.visible = !ZD.nvg; }
  camera.getWorldDirection(_zf); _zr.set(-_zf.z, 0, _zf.x).normalize();
  ZD.torch.intensity = on && !ZD.nvg ? 2.4 : 0;
  ZD.torch.position.copy(camera.position).addScaledVector(_zr, 0.18).add(new THREE.Vector3(0, -0.12, 0)); ZD.torch.target.position.copy(camera.position).addScaledVector(_zf, 10);
  const laser = on && ZD.nvg && curW() && curW().id === 'rifle' && !zoom;
  ZD.beam.visible = ZD.dot.visible = !!laser;
  if (laser) {
    if (!ZD.beamT || (ZD.beamT -= 1) <= 0) { ZD.beamT = 3; const h = rayHit(camera.position, _zf.clone(), 120, player.team); ZD.beamLen = h ? h.dist : 120; }
    const a = camera.position.clone().addScaledVector(_zr, 0.09).add(new THREE.Vector3(0, -0.07, 0)).addScaledVector(_zf, 0.6), b = camera.position.clone().addScaledVector(_zf, ZD.beamLen - 0.05);
    const p = ZD.beam.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true;
    ZD.dot.position.copy(b);
  }
}

// ---------- the outside of the house, as described ----------
// A plain white concrete house that needed paint: opaque (frosted) windows, few of them facing out; the third
// floor has windows on one side only, four of its five just slits high up; balconies behind 7-foot privacy walls;
// satellite dishes on the roof; a concrete porch over the front door.
function zDressHouse() {
  ZM.house.map = null; ZM.house.color.setHex(0xebe2cb); ZM.house.needsUpdate = true;   // painted plaster, cream, a bit weathered
  ZM.wallIn.color.setHex(0xe6e0d2);
  const P = new Part(), glass = 0x2e3a42, frost = 0xc4ccc8, frame = 0xf2eee4, X0 = zx(0), X1 = zx(26), Z0 = zz(0), Z1 = zz(22), o = 0.04;
  // a window: frame, panes with a cross bar, a sill; some with a sloped awning over them, some with a vent or AC unit
  const win = (face, a, y, w, h, opts = {}) => {
    const pane = opts.frosted ? frost : glass, ns = face === 'n' || face === 's', out = face === 'n' || face === 'w' ? -1 : 1;
    const at = (u, v, d) => ns ? [X0 + a + u, y + v, (face === 'n' ? Z0 : Z1) + out * (o + d)] : [(face === 'w' ? X0 : X1) + out * (o + d), y + v, Z0 + a + u];
    const bx = (sw, sh, sd, col, u, v, d, rx = 0) => { const [x, yy, z] = at(u, v, d); if (ns) P.box(sw, sh, sd, col, x, yy, z, rx * -out); else P.box(sd, sh, sw, col, x, yy, z, 0, 0, rx * out); };
    bx(w + 0.16, h + 0.16, 0.06, frame, 0, 0, 0); bx(w, h, 0.08, pane, 0, 0, 0.01);
    if (!opts.frosted) { bx(0.05, h, 0.1, frame, 0, 0, 0.02); if (h > 0.6) bx(w, 0.05, 0.1, frame, 0, h * 0.15, 0.02); }
    bx(w + 0.3, 0.07, 0.2, 0xd8d0bc, 0, -h / 2 - 0.1, 0.08);
    if (opts.awning) bx(w + 0.3, 0.06, 0.6, 0xb8b0a0, 0, h / 2 + 0.22, 0.28, 0.35);
    if (opts.ac) { bx(0.62, 0.42, 0.45, 0xd8d8d2, w / 2 + 0.55, h / 2 - 0.25, 0.25); bx(0.4, 0.3, 0.02, 0x8a8a84, w / 2 + 0.55, h / 2 - 0.25, 0.48); }
  };
  const y0 = 1.55, y1 = 4 + 1.6, y2 = 8;   // window centres above the ground-floor level (the mesh sits at the ground floor)
  // ground and second floors: ordinary glass windows, most onto the courtyard (north), fewer on the other sides
  for (const [a, aw, ac] of [[3.2, 1, 0], [8.5, 1, 1], [20.5, 0, 0], [25, 1, 0], [29.5, 0, 1]]) win('n', a, y0, 1.3, 1.25, { awning: aw, ac });
  for (const [a, aw, ac] of [[3.5, 1, 0], [9, 0, 1], [15, 1, 0], [21, 1, 0], [27.5, 0, 1]]) win('n', a, y1, 1.3, 1.25, { awning: aw, ac });
  for (const a of [4, 20.5, 27]) win('s', a, y0, 1.2, 1.1, { awning: 1 });
  for (const a of [4, 23.5, 28.5]) win('s', a, y1, 1.2, 1.1, { awning: a > 25, ac: a === 4 });
  for (const a of [8, 20]) { win('e', a, y0, 1.1, 1.0, { awning: 1 }); win('e', a, y1, 1.1, 1.0, { ac: a === 8 }); }
  win('w', 12, y0 + 0.5, 0.7, 0.5); win('w', 12, y1 + 0.5, 0.7, 0.5);   // small ones toward the outer wall
  // third floor: windows on one side only (north), opaque, four of five just slits high up
  { const zt = zz(ZD_TOP.r0) - o, slit = (x, y, w, h) => { P.box(w + 0.16, h + 0.16, 0.06, frame, x, y, zt); P.box(w, h, 0.08, frost, x, y, zt - 0.012); P.box(w + 0.3, 0.07, 0.2, 0xd8d0bc, x, y - h / 2 - 0.1, zt - 0.08); };
    for (const c of [13.5, 15.5, 21, 23.5]) slit(zx(c), y2 + 2.6, 1.2, 0.24); slit(zx(18.2), y2 + 1.8, 1.0, 0.9); }
  // the deep concrete ledges round every floor and the roof (rings, so nothing covers a stair opening)
  const ring = (x0, x1, z0, z1, y, d, col) => {
    P.box(x1 - x0 + d * 2, 0.2, d, col, (x0 + x1) / 2, y, z0 - d / 2); P.box(x1 - x0 + d * 2, 0.2, d, col, (x0 + x1) / 2, y, z1 + d / 2);
    P.box(d, 0.2, z1 - z0, col, x0 - d / 2, y, (z0 + z1) / 2); P.box(d, 0.2, z1 - z0, col, x1 + d / 2, y, (z0 + z1) / 2);
  };
  ring(X0, X1, Z0, Z1, 3.55, 0.9, 0xe6dcc4); ring(X0, X1, Z0, Z1, 7.55, 0.9, 0xe6dcc4);
  ring(zx(ZD_TOP.c0), zx(ZD_TOP.c1 + 1), zz(ZD_TOP.r0), zz(ZD_TOP.r1 + 1), 8 + 3.75, 1.1, 0xe6dcc4);
  for (const [x, z] of [[X0 + 0.15, Z0 - 0.12], [X1 - 0.15, Z0 - 0.12], [X1 - 0.15, Z1 + 0.12], [X0 + 0.15, Z1 + 0.12]]) P.cyl(0.06, 0.06, 8, 0x8a8a84, x, 4, z);
  // the porch over the front door
  const dx = ZD.frontDoor ? ZD.frontDoor.x : zx(12);
  P.box(3.6, 0.18, 1.7, 0xd8d0bc, dx, 2.95, Z0 - 0.85); for (const s of [-1, 1]) P.box(0.12, 0.5, 1.6, 0xd8d0bc, dx + s * 1.74, 2.7, Z0 - 0.8);   // a concrete canopy on brackets
  P.box(0.3, 0.3, 0.12, 0xf6f0d0, dx + 1.6, 2.2, Z0 - 0.06);   // an outside light by the door
  // satellite dishes and water tanks on the roofs; security cameras on the corners
  const roof2 = zfy(2) + 3.7 + 0.35 - ZC.fb, roof1 = zfy(2) - ZC.fb;
  for (const [x, z, y] of [[zx(15), zz(10), roof2], [zx(22), zz(16), roof2], [zx(5), zz(2), roof1]]) {
    P.add(new THREE.SphereGeometry(0.55, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.42), 0xe6e6e2, x, y + 1.0, z, -1.0, 0.8, 0);
    P.cyl(0.04, 0.04, 0.9, 0x777777, x, y + 0.45, z); P.box(0.4, 0.06, 0.4, 0x666666, x, y + 0.03, z);
  }
  for (const [x, z] of [[zx(19), zz(6)], [zx(21), zz(6)]]) { P.cyl(0.55, 0.55, 1.1, 0x26292b, x, roof2 + 0.85, z); P.cyl(0.6, 0.6, 0.3, 0x3a3d3f, x, roof2 + 0.15, z); }
  for (const [x, z, a] of [[X0 - 0.15, Z0 - 0.15, -0.8], [X1 + 0.15, Z0 - 0.15, 0.8]]) { P.box(0.16, 0.12, 0.26, 0xdddddd, x, 3.6, z, -0.3, a); P.cyl(0.04, 0.04, 0.03, 0x111111, x, 3.6, z - 0.14, 1.2); }
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.position.set(0, ZC.fb, 0); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  zBox(dx - 1.7, dx + 1.7, Z0 - 1.2, Z0, ZC.gy - 0.3, ZC.fb - 0.12, ZM.step);   // the step up to the door
  // the second-floor balcony on the south side, behind its 7-foot privacy wall (a door leads out from the room behind)
  const bx0 = zx(8), bx1 = zx(16), bz = Z1 + 1.9, F1 = zfy(1);
  zBox(bx0, bx1, Z1, bz, F1 - 0.3, F1, ZM.floor);
  zBox(bx0, bx1, bz - 0.25, bz, F1, F1 + 2.13, ZM.house); zBox(bx0, bx0 + 0.25, Z1, bz, F1, F1 + 2.13, ZM.house); zBox(bx1 - 0.25, bx1, Z1, bz, F1, F1 + 2.13, ZM.house);
}
// a door in the outer wall that opens onto a brick wall (the team on the second helicopter found one)
function zFakeDoor() {
  const z = ZC.z0, x0 = 13.5, x1 = 15.7, gy = ZC.gy;
  if (typeof MATS !== 'undefined' && MATS.brick) addMesh(new THREE.BoxGeometry(x1 - x0, 2.6, 0.04), MATS.brick, (x0 + x1) / 2, gy + 1.3, z - 0.32, false).userData.static = false;   // bricks right behind it
  return zBreachable('metal door', x0, x1, z - 0.56, z - 0.34, gy - 0.2, gy + 2.6, ZM.gate, 'A door to nowhere: there is a brick wall right behind it! The way in is the main gate');
}
// ---------- the guards: local clothes (shalwar kameez, waistcoats, shawls, caps and turbans), AK rifles ----------
const ZLOCAL = { skins: ['#c69a74', '#b08060', '#9c6e4e', '#d0a47e', '#8a5e40'], cloth: [0xd8d2c2, 0x9a958a, 0x7a6a54, 0x5e6658, 0xa8a090, 0x6a5e50, 0x3e4044], vest: [0x2c2c2e, 0x3e3428, 0x4a4a3e, null] };
function zFighterTorso(v, cloth, vest) {
  const p = new Part();
  p.cyl(0.33, 0.28, 0.5, cloth, 0, 0.82, 0, 0, 0, 0, 0.66, 12);   // the long kameez, down past the knees
  p.box(0.5, 0.2, 0.3, cloth, 0, 1.02, 0);
  p.cyl(0.3, 0.29, 0.32, cloth, 0, 1.27, 0, 0, 0, 0, 0.62); p.cyl(0.35, 0.3, 0.42, cloth, 0, 1.6, 0, 0, 0, 0, 0.6);
  p.cyl(0.12, 0.12, 0.08, cloth, 0, 1.82, 0); p.box(0.06, 0.24, 0.02, 0xd0c8b8, 0.03, 1.66, 0.2);   // collar, button placket
  if (vest !== null) { p.cyl(0.365, 0.315, 0.44, vest, 0, 1.56, 0, 0, 0, 0, 0.62); p.box(0.06, 0.46, 0.04, cloth, 0, 1.56, 0.205); }   // waistcoat open at the front
  if (v === 1) { p.box(0.5, 0.26, 0.08, 0x5a5a40, 0, 1.42, 0.2); for (let i = 0; i < 3; i++) p.box(0.12, 0.16, 0.06, 0x4a4a32, -0.14 + i * 0.14, 1.36, 0.25); }   // a chest rig of AK magazines
  if (v === 2) { p.box(0.16, 0.9, 0.06, 0x8a7a62, 0.06, 1.48, 0.2, 0, 0, -0.75); p.box(0.16, 0.9, 0.06, 0x8a7a62, -0.02, 1.48, -0.2, 0, 0, -0.75); }   // a woollen shawl over one shoulder
  return p;
}
function zFighterHead(v, skin, hat) {
  const p = new Part(), S = parseInt(skin.slice(1), 16), beard = pick([0x1a1612, 0x2a2420, 0x4a4440]);
  p.cyl(0.085, 0.095, 0.1, S, 0, 0.03, 0);
  p.add(new THREE.SphereGeometry(0.21, 12, 9), S, 0, 0.25, 0, 0, 0, 0, 0.95, 1.1, 1.02);
  p.add(new THREE.SphereGeometry(0.17, 10, 8), beard, 0, 0.12, 0.08, 0, 0, 0, 1.0, 1.15, 0.85);   // full beard
  p.box(0.05, 0.055, 0.06, S, 0, 0.225, 0.21);
  for (const sd of [-1, 1]) { p.box(0.06, 0.03, 0.02, 0xf0ece4, 0.078 * sd, 0.285, 0.197); p.box(0.03, 0.03, 0.022, 0x1b1410, 0.072 * sd, 0.285, 0.201); p.box(0.075, 0.02, 0.024, 0x1a1612, 0.078 * sd, 0.322, 0.19); }
  if (hat === 0) { p.cyl(0.24, 0.23, 0.1, 0xb8a888, 0, 0.44, -0.01, 0, 0, 0, 1, 16); p.cyl(0.25, 0.25, 0.07, 0xa49474, 0, 0.4, -0.01, 0, 0, 0, 1, 16); }   // a pakol (flat wool cap with a rolled brim)
  else if (hat === 1) { for (let i = 0; i < 3; i++) p.cyl(0.25 - i * 0.02, 0.25 - i * 0.015, 0.08, pick([0xf0eee8, 0x2a2a2a, 0x8a8a84]), 0, 0.38 + i * 0.07, -0.01, 0.1 * (i % 2 ? 1 : -1), 0, 0, 1, 14); }   // a turban
  else if (hat === 2) p.dome(0.215, 0xf2f0ea, 0, 0.36, 0, 1, 0.5, 1);   // a white prayer cap
  else p.dome(0.22, 0x1a1612, 0, 0.32, -0.01, 1, 0.7, 1);   // bare-headed, black hair
  return p;
}
function zFighterLeg(cloth, side) { const p = new Part(); p.cyl(0.19, 0.16, 0.5, cloth, 0, -0.23, 0); return p; }   // loose shalwar trousers
function zFighterShin(cloth) { const p = new Part(); p.cyl(0.16, 0.12, 0.42, cloth, 0, -0.22, 0); p.box(0.2, 0.08, 0.34, 0x4a3424, 0, -0.45, 0.05); return p; }   // and sandals
function zFighterArm(cloth) { const p = new Part(); p.cyl(0.125, 0.105, 0.38, cloth, 0, -0.19, 0); return p; }
function zFighterFore(cloth, skin) { const p = new Part(); p.cyl(0.105, 0.09, 0.36, cloth, 0, -0.18, 0); p.box(0.1, 0.12, 0.11, parseInt(skin.slice(1), 16), 0, -0.43, 0); return p; }
function zFighterGun(role) {
  const p = new Part(), R = Math.PI / 2, wood = 0x8a4a22, wood2 = 0x6a3618, st = 0x2c2e30, st2 = 0x45484c;
  if (role === 'rocket') {   // RPG-7: a tube with wooden heat guards and the pointed warhead
    p.cyl(0.04, 0.04, 1.0, st, 0, 0.1, 0.35, R); p.cyl(0.05, 0.05, 0.22, wood, 0, 0.1, 0.32, R);
    p.cyl(0.0, 0.07, 0.2, 0x4a5030, 0, 0.1, 1.05, R); p.cyl(0.07, 0.07, 0.12, 0x4a5030, 0, 0.1, 0.91, R); p.cyl(0.06, 0.04, 0.14, st, 0, 0.1, -0.2, R);
    p.box(0.04, 0.12, 0.05, st, 0, -0.03, 0.3, 0.2); p.box(0.04, 0.12, 0.05, st, 0, -0.03, 0.5);
  } else if (role === 'sniper') {   // a long Dragunov with its skeleton stock and scope
    p.box(0.05, 0.12, 0.3, wood, 0, -0.02, 0.06); p.box(0.05, 0.06, 0.34, wood, 0, 0.0, 0.5); p.box(0.045, 0.06, 0.2, st, 0, 0.03, 0.28);
    p.cyl(0.013, 0.013, 0.7, st2, 0, 0.03, 0.95, R); p.cyl(0.024, 0.024, 0.26, st, 0, 0.11, 0.3, R); p.box(0.034, 0.12, 0.06, st, 0, -0.08, 0.36, -0.15);
  } else {   // AK-47: wooden stock and handguard, steel receiver, the curved magazine, gas tube over the barrel
    p.box(0.05, 0.11, 0.26, wood, 0, -0.03, 0.04); p.box(0.05, 0.13, 0.05, wood2, 0, -0.05, -0.08);
    p.box(0.052, 0.075, 0.24, st, 0, 0.0, 0.3); p.box(0.05, 0.06, 0.16, wood, 0, 0.0, 0.5); p.box(0.034, 0.03, 0.18, wood2, 0, 0.045, 0.52);
    p.cyl(0.012, 0.012, 0.26, st2, 0, 0.01, 0.72, R); p.box(0.02, 0.04, 0.02, st, 0, 0.045, 0.82);
    p.box(0.04, 0.1, 0.05, wood2, 0, -0.08, 0.2, 0.3);
    for (let i = 0; i < 5; i++) p.box(0.034, 0.05, 0.05, 0x3a2a1a, 0, -0.07 - i * 0.045, 0.34 + i * 0.022, -0.3 - i * 0.07);
  }
  return p;
}
function makeLocalFighter(role) {
  const v = Math.floor(Math.random() * 3), skin = pick(ZLOCAL.skins), cloth = pick(ZLOCAL.cloth), vest = pick(ZLOCAL.vest), hat = Math.floor(Math.random() * 4);
  const key = 'zd' + role + v + cloth + '_' + vest;
  const mesh = (geo, parent, shadow) => { const m = new THREE.Mesh(geo, SOLDIER_MAT); m.castShadow = !!shadow; parent.add(m); return m; };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  mesh(cached('zt' + key, () => zFighterTorso(v, cloth, vest)), body, true);
  const legL = new THREE.Group(), legR = new THREE.Group(), shinL = new THREE.Group(), shinR = new THREE.Group();
  legL.position.set(-0.17, 0.97, 0); legR.position.set(0.17, 0.97, 0); body.add(legL, legR);
  mesh(cached('zl' + cloth, () => zFighterLeg(cloth)), legL, true); mesh(cached('zl' + cloth, () => zFighterLeg(cloth)), legR, true);
  shinL.position.y = shinR.position.y = -0.47; legL.add(shinL); legR.add(shinR);
  mesh(cached('zs' + cloth, () => zFighterShin(cloth)), shinL, true); mesh(cached('zs' + cloth, () => zFighterShin(cloth)), shinR, true);
  const armL = new THREE.Group(), armR = new THREE.Group(), foreL = new THREE.Group(), foreR = new THREE.Group();
  armL.position.set(-SHOULDER_X, SHOULDER_Y, 0); armR.position.set(SHOULDER_X, SHOULDER_Y, 0); body.add(armL, armR);
  mesh(cached('zu' + cloth, () => zFighterArm(cloth)), armL); mesh(cached('zu' + cloth, () => zFighterArm(cloth)), armR);
  foreL.position.y = foreR.position.y = -ARM_L1; armL.add(foreL); armR.add(foreR);
  mesh(cached('zf' + cloth + skin, () => zFighterFore(cloth, skin)), foreL); mesh(cached('zf' + cloth + skin, () => zFighterFore(cloth, skin)), foreR);
  const head = new THREE.Group(); head.position.y = 1.83; body.add(head);
  const headMesh = mesh(cached('zh' + v + skin + hat, () => zFighterHead(v, skin, hat)), head, true); headMesh.userData.head = true;
  const aim = new THREE.Group(); body.add(aim); const gun = new THREE.Group(); aim.add(gun);
  mesh(cached('zg' + role, () => zFighterGun(role)), gun, true).scale.set(1.35, 1.3, 1.08);
  const H = GUN_HOLD[role] || GUN_HOLD.rifle, muzzle = new THREE.Object3D(); muzzle.position.set(...H.muzzle); gun.add(muzzle);
  const m = { root, body, legL, legR, shinL, shinR, armL, armR, foreL, foreR, head, headMesh, gun, aim, muzzle, hold: H, role };
  poseGun(m, 0, 1, 0); return m;
}
if (ZD30) { const mc = makeCharacter; makeCharacter = function (team, role) { return team === 'red' ? makeLocalFighter(role) : mc(team, role); }; }

// ---------- the families: women and children who live in the houses. They can't be hurt. ----------
// Shooting at them (or near them, with the knife) costs you money and points; they crouch down and cover their heads.
const ZCIV = [];
function zCivModel(kind) {
  // proportions by age: a child has a larger head for its height, shorter legs; adults wear the full-length kameez
  const P = new Part(), child = kind === 'child', man = kind === 'man', S = child ? 0.6 : 1;
  const skin = parseInt(pick(ZLOCAL.skins).slice(1), 16), hairC = pick([0x1a1410, 0x241a14, 0x2e2018]);
  const cloth = man ? pick([0xe8e4d8, 0xd8d0c0, 0x9a958a, 0x6a6458, 0x8a7a64, 0x3a3c40]) : child ? pick([0x3a7ab8, 0xc84a4a, 0x5aa05a, 0xd8a038, 0x8a5ab0, 0xe07a9a]) : pick([0x6a3a4a, 0x2e4a6a, 0x5a4a3a, 0x7a6a8a, 0x3a5a4a, 0x8a3a3a, 0x2a2a2e]);
  const trim = pick([0xd8b860, 0xe8e0d0, 0xb84a4a, 0x4a6ab8]), trou = man ? cloth : pick([0xe8e4d8, cloth, 0x2a2a2e]), scarf = pick([0x2a2a2e, 0xd8d2c8, 0x5a3a5a, 0x3a4a5a, 0x7a5a3a]);
  const legH = child ? 0.55 : 0.8, hip = legH + 0.05, torso = child ? 0.45 : 0.58, neck = hip + torso, headR = child ? 0.15 / S * 0.6 + 0.1 : 0.125;
  for (const sd of [-1, 1]) {
    P.cyl(0.09, 0.075, legH, trou, 0.1 * sd, legH / 2 + 0.04, 0, 0, 0, 0, 1, 8);                       // shalwar trousers, gathered at the ankle
    P.box(0.1, 0.05, 0.22, pick([0x3a2a20, 0x6a4a30, 0x8a2a2a]), 0.1 * sd, 0.025, 0.04);                 // sandals
    P.ball(0.045, skin, 0.1 * sd, 0.07, 0.1);
  }
  const kLen = man || !child ? legH * 0.85 : legH * 0.6;   // the kameez reaches past the knee
  P.cyl(0.22, 0.27, kLen, cloth, 0, hip - kLen / 2 + 0.04, 0, 0, 0, 0, 0.72, 14);
  P.cyl(0.2, 0.22, torso, cloth, 0, hip + torso / 2, 0, 0, 0, 0, 0.66, 14);
  P.cyl(0.11, 0.12, 0.035, trim, 0, neck - 0.03, 0.02, 0, 0, 0, 0.75, 12); P.box(0.03, torso * 0.25, 0.012, trim, 0, neck - torso * 0.15, 0.155);   // embroidered round neck and a short slit
  P.cyl(0.272, 0.272, 0.04, trim, 0, hip - kLen + 0.07, 0, 0, 0, 0, 0.72, 14);                        // embroidered hem
  for (const sd of [-1, 1]) {
    P.cyl(0.06, 0.055, torso + 0.05, cloth, (0.24) * sd, hip + torso * 0.5, 0.02, 0.15, 0, 0.12 * sd, 1, 8);   // sleeves
    P.ball(0.045, skin, 0.26 * sd, hip + 0.04, 0.08);                                                // hands
  }
  P.cyl(0.05, 0.055, 0.07, skin, 0, neck + 0.03, 0, 0, 0, 0, 1, 8);
  const hy = neck + 0.07 + headR;
  P.add(new THREE.SphereGeometry(headR, 14, 11), skin, 0, hy, 0.01, 0, 0, 0, 0.9, 1.1, 0.98);
  for (const sd of [-1, 1]) {
    P.box(headR * 0.28, headR * 0.13, 0.01, 0xf0ece4, headR * 0.36 * sd, hy + headR * 0.15, headR * 0.92); P.box(headR * 0.13, headR * 0.13, 0.012, 0x1b1410, headR * 0.34 * sd, hy + headR * 0.15, headR * 0.94);   // eyes
    P.box(headR * 0.34, headR * 0.06, 0.012, hairC, headR * 0.36 * sd, hy + headR * 0.36, headR * 0.9, 0, 0, 0.1 * sd);   // brows
  }
  P.box(headR * 0.16, headR * 0.34, headR * 0.2, skin, 0, hy - headR * 0.02, headR * 0.98);           // nose
  P.box(headR * 0.36, headR * 0.06, 0.01, 0x9a5a4a, 0, hy - headR * 0.4, headR * 0.92);               // mouth
  if (man) { P.dome(headR * 1.08, pick([0xf2f0ea, 0xb8a888, 0x1a1612]), 0, hy + headR * 0.25, -0.01, 1, 0.6, 1); P.add(new THREE.SphereGeometry(headR * 0.85, 10, 8), pick([0x1a1612, 0x3a3430, 0x6a6660]), 0, hy - headR * 0.6, headR * 0.35, 0, 0, 0, 0.95, 1.15, 0.8); P.cyl(0.21, 0.22, torso * 0.9, pick([0x2c2c2e, 0x3e3428, cloth]), 0, hip + torso * 0.5, 0, 0, 0, 0, 0.7, 12); }   // cap, beard, waistcoat
  else if (child) { P.dome(headR * 1.04, hairC, 0, hy + headR * 0.1, -0.02, 1, 0.95, 1); if (Math.random() < 0.5) { P.dome(headR * 1.1, scarf, 0, hy + headR * 0.08, -0.02, 1, 1.0, 1); } }
  else {   // a dupatta over the hair, wrapped round the shoulders and hanging down the back
    P.dome(headR * 1.16, scarf, 0, hy + headR * 0.02, -0.035, 1, 1.05, 1.0);                          // over the hair, the face left open
    P.add(new THREE.SphereGeometry(headR * 1.12, 12, 8), scarf, 0, hy - headR * 0.1, -0.06, 0, 0, 0, 1, 1.05, 0.85);   // falling round the back of the head
    P.cyl(0.13, 0.25, 0.14, scarf, 0, neck - 0.02, -0.01, 0, 0, 0, 0.8, 14);                            // over the shoulders
    P.box(0.36, torso * 1.1, 0.04, scarf, 0, hip + torso * 0.5, -0.17, 0.06, 0, 0);                      // down the back
    P.box(0.09, torso * 0.9, 0.04, scarf, 0.15, hip + torso * 0.45, 0.16, -0.06, 0, 0.1);
  }
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.scale.setScalar(S); m.castShadow = true; return m;
}
function zPlaceFamilies() {
  const spots = [   // [floor, row, col, kind] in the house; the courier's family in the guest house
    [0, 18, 3, 'woman'], [0, 19, 4, 'child'], [0, 18, 23, 'child'], [0, 12, 7, 'woman'],
    [1, 2, 3, 'woman'], [1, 3, 5, 'child'], [1, 2, 15, 'woman'], [1, 11, 3, 'child'], [1, 12, 5, 'child'], [1, 17, 16, 'woman'], [1, 19, 18, 'child'],
    [2, 6, 14, 'woman'], [2, 10, 16, 'child'], [2, 16, 14, 'child'],
  ];
  const add = (x, y, z, kind) => {
    const g = new THREE.Group(), up = zCivModel(kind); g.add(up);
    g.position.set(x, y, z); g.rotation.y = rand(0, 6.28); scene.add(g);
    ZCIV.push({ g, up, kind, pos: g.position, home: g.position.clone(), s: kind === 'child' ? 0.62 : 1, scaredT: 0, goal: null, ph: rand(0, 6) });
  };
  for (const [k, r, c, kind] of spots) add(zcx(c), zfy(k), zcz(r), kind);
  add(-1, ZC.gy, 30.5, 'woman'); add(1.5, ZC.gy, 31, 'child');
}
function zCivRay(origin, dir, maxD, team, best) {
  if (team !== 'blue' || !ZCIV.length) return best;
  for (const c of ZCIV) {
    const down = c.scaredT > 0, cy = c.pos.y + (down ? 0.6 : 1.1) * c.s, r = (down ? 0.5 : 0.42) * c.s;
    const t = raySphere(origin, dir, _zdC.set(c.pos.x, cy, c.pos.z), r);
    if (t !== null && t < (best ? best.dist : maxD)) best = { dist: t, point: origin.clone().addScaledVector(dir, t), zdCiv: c };
    if (t === null && down === false) {   // the lower body too
      const t2 = raySphere(origin, dir, _zdC.set(c.pos.x, c.pos.y + 0.5 * c.s, c.pos.z), 0.36 * c.s);
      if (t2 !== null && t2 < (best ? best.dist : maxD)) best = { dist: t2, point: origin.clone().addScaledVector(dir, t2), zdCiv: c };
    }
  }
  return best;
}
function zCivHit(c) {
  c.scaredT = 8;
  if (simTime - c.hitT < 1.5) return; c.hitT = simTime;   // one penalty per burst
  player.money = Math.max(0, player.money - 250); player.kills = Math.max(0, player.kills - 1); teamKills.blue = Math.max(0, teamKills.blue - 1);
  const d = document.createElement('div'); d.className = 'cash'; d.style.color = '#ff8a7a'; d.textContent = '-$250 Hold fire!'; const cf = document.getElementById('cashfeed'); if (cf) { cf.appendChild(d); setTimeout(() => d.remove(), 2200); }
  showMessage(`HOLD FIRE! That ${c.kind === 'child' ? 'child' : 'woman'} is unarmed. -$250 and -1 point`, 2.5);
  if (typeof SFX !== 'undefined' && SFX.lose) SFX.lose(0.6);
}
function zCivUpdate(dt) {
  // anyone from the team close by (or shooting near them) and they get up and run, away from you, inside the house or yard they are in
  for (const c of ZCIV) {
    let near = null, nd = 9;
    for (const ch of chars) { if (!ch.alive || ch.team !== 'blue' || ch.vehicle) continue; const d = ch.pos.distanceTo(c.pos); if (d < nd && Math.abs(ch.pos.y - c.pos.y) < 2) { nd = d; near = ch; } }
    if (near) c.scaredT = 4;
    c.scaredT = Math.max(0, c.scaredT - dt);
    const inside = zInHouse({ pos: c.home }), sp = c.kind === 'child' ? 3.2 : 2.6;
    if (c.scaredT > 0 && near && (!c.goal || c.pos.distanceTo(c.goal) < 0.6 || Math.random() < dt * 0.5)) {   // pick somewhere further from the danger
      let best = null, bs = -1;
      for (let k = 0; k < 24; k++) {
        const a = rand(0, 6.28), r = rand(2.5, 10), x = c.pos.x + Math.cos(a) * r, z = c.pos.z + Math.sin(a) * r;
        if (inside ? !zInHouse({ pos: { x, z } }) : !zInPoly(x, z)) continue;
        let clear = true; for (let t = 0.2; t <= 1 && clear; t += 0.2) if (blockedAt(lerp(c.pos.x, x, t), lerp(c.pos.z, z, t), c.pos.y, 0.3)) clear = false;   // a way they can actually run
        if (!clear) continue;
        const sc = Math.hypot(x - near.pos.x, z - near.pos.z); if (sc > bs) { bs = sc; best = new THREE.Vector3(x, c.pos.y, z); }
      }
      c.goal = best;
    }
    let moving = false;
    if (c.goal && c.scaredT > 0) {
      const dx = c.goal.x - c.pos.x, dz = c.goal.z - c.pos.z, d = Math.hypot(dx, dz);
      if (d > 0.5) {
        const nx = c.pos.x + dx / d * sp * dt, nz = c.pos.z + dz / d * sp * dt;
        if (!blockedAt(nx, nz, c.pos.y, 0.3)) { c.pos.x = nx; c.pos.z = nz; moving = true; c.g.rotation.y = Math.atan2(dx, dz); }
        else c.goal = null;   // a wall: try another way
      }
      const fl = pushOut(c.pos, 0.3, c.pos.y); if (Math.abs(fl - c.pos.y) < 0.7) c.pos.y = fl;
    }
    c.ph += dt * (moving ? 11 : 0);
    c.up.position.y = moving ? Math.abs(Math.sin(c.ph)) * 0.06 : 0;
    c.up.rotation.z = moving ? Math.sin(c.ph) * 0.05 : 0;
  }
}

// ---------- the neighbours: the louder it gets, the more people come out and gather round the walls ----------
// (On the night, neighbours came out to see what was happening; the team kept them back.) They are unarmed and
// can't be hurt: they stand and watch from outside the walls.
const ZVILL = [];
function zVillagerSpot() {   // a place just outside the walls, on a line out from the middle of the compound
  for (let k = 0; k < 20; k++) {
    const north = ZD.down && Math.random() < 0.65, a = north ? rand(3.7, 5.7) : rand(0, 6.28), dx = Math.cos(a), dz = Math.sin(a); let r = 5;   // after the shooting, many come out on the north side, where the helicopter waits
    while (r < 120 && zInPoly(dx * r, dz * r)) r += 2;
    const out = north ? rand(5, 40) : rand(5, 13), x = dx * (r + out) + rand(-6, 6), z = dz * (r + out);
    if (Math.hypot(x - ZC.lz.x, z - ZC.lz.z) < 14) continue;   // not on the landing zone itself
    if (Math.abs(x) < EDGE - 10 && Math.abs(z) < EDGE - 10 && !blockedAt(x, z, heightAt(x, z))) return { x, z, a };
  }
  return null;
}
function zVillageUpdate(dt) {
  const want = Math.min(LITE ? 18 : 34, Math.floor((ZD.noise || 0) * 1.6) + (ZD.down ? 14 : 4));
  if (ZVILL.length < want && Math.random() < dt * 2) {
    const S = zVillagerSpot();
    if (S) {
      const kind = Math.random() < 0.85 ? 'man' : 'child', g = new THREE.Group(), m = zCivModel(kind); g.add(m);
      const from = { x: S.x + Math.cos(S.a) * rand(40, 70), z: S.z + Math.sin(S.a) * rand(40, 70) };
      g.position.set(from.x, heightAt(from.x, from.z), from.z); scene.add(g);
      if (Math.random() < 0.3) { const ph = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.02), new THREE.MeshBasicMaterial({ color: 0xbfe0ff })); ph.position.set(0.18, 1.45, 0.25); m.add(ph); }   // a phone held up
      ZVILL.push({ g, m, goal: S, ph: rand(0, 6), sp: rand(1.3, 2.2) });
      if (ZVILL.length === 5) showMessage('Neighbours are coming out and gathering outside the walls', 3);
    }
  }
  for (const v of ZVILL) {
    if (v.flee > 0) { v.flee -= dt; if (v.flee <= 0) v.goal = zVillagerSpot() || v.goal; }
    const p = v.g.position, dx = v.goal.x - p.x, dz = v.goal.z - p.z, d = Math.hypot(dx, dz);
    if (d > 0.6) { p.x += dx / d * v.sp * dt; p.z += dz / d * v.sp * dt; p.y = heightAt(p.x, p.z); v.g.rotation.y = Math.atan2(dx, dz); v.ph += dt * 10; v.m.position.y = Math.abs(Math.sin(v.ph)) * 0.05; }
    else { v.g.rotation.y = Math.atan2(-p.x, -p.z); v.m.position.y = 0; }   // watching the compound
  }
}
function zVillRay(o, d, maxD, team, best) {
  if (team !== 'blue') return best;
  for (const v of ZVILL) {
    const p = v.g.position; if (Math.abs(p.x - o.x) > maxD + 2 || Math.abs(p.z - o.z) > maxD + 2) continue;
    const t = raySphere(o, d, _zdC.set(p.x, p.y + 1.15, p.z), 0.42);
    if (t !== null && t < (best ? best.dist : maxD)) best = { dist: t, point: o.clone().addScaledVector(d, t), zdVill: v };
  }
  return best;
}
function zVillHit(v, shooter) {   // they are not hurt: they scatter. But it costs you
  v.flee = 6; const p = v.g.position, a = Math.atan2(p.z - shooter.pos.z, p.x - shooter.pos.x);
  v.goal = { x: p.x + Math.cos(a) * 30, z: p.z + Math.sin(a) * 30 }; v.sp = 3.6;
  for (const u of ZVILL) if (u !== v && u.g.position.distanceTo(p) < 9) { u.flee = 5; const b = Math.atan2(u.g.position.z - p.z, u.g.position.x - p.x); u.goal = { x: u.g.position.x + Math.cos(b) * 25, z: u.g.position.z + Math.sin(b) * 25 }; u.sp = 3.4; }
  if (shooter !== player || simTime - (v.hitT || -9) < 1.5) return; v.hitT = simTime;
  player.money = Math.max(0, player.money - 250); player.kills = Math.max(0, player.kills - 1); teamKills.blue = Math.max(0, teamKills.blue - 1);
  showMessage('HOLD FIRE! He was unarmed. -$250 and -1 point', 2.5);
  if (typeof SFX !== 'undefined' && SFX.lose) SFX.lose(0.6);
}
