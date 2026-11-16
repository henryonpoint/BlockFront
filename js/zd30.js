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
    "#####dd###################",
    "#     #         #        #",
    "#     #         #        #",
    "#     #  #####  #        #",
    "#     #  #   #  #        #",
    "#        #   #  #####    #",
    "#        #   #           #",
    "###  #####   #####  ######",
    "#                        #",
    "#                        #",
    "#####  ######  ###########",
    "#   #  #    #  #         #",
    "#   #  #    #  #         #",
    "#   #  #    #  #   ####  #",
    "#   #  #    #  #   #SS#  #",
    "#   #  #    #  #   #SS#  #",
    "###### ####  ###   #SS#  #",
    "#              #   #SS#  #",
    "#              #   #SS#  #",
    "#  ####  ###            ee",
    "#  #          #          #",
    "##########################",
  ],
  [
    "##########################",
    "#      #          #      #",
    "# #### #          #  #   #",
    "# #SS# #             #   #",
    "# #SS# #   #####     #   #",
    "# #SS#     #   #  #      #",
    "# #SS#     #   #  #  #   #",
    "# #SS# #   #  ##  #  #   #",
    "# #gg# #          #  #####",
    "#      ##  ########      #",
    "#      #   #             #",
    "#          #             #",
    "#          #   ########  #",
    "#      #       #         #",
    "#      #       #   #oo#  #",
    "#      #   #   #   #oo#  #",
    "#####  #####   #   #oo#  #",
    "#                  #oo#  #",
    "#                  #oo#  #",
    "#              #   ####  #",
    "#              #         #",
    "##########################",
  ],
  [
    "##################pppppppp",
    "#        #  #    #TTTTTTTp",
    "#        #       #TTTTTTTp",
    "# #oo#   #  #    #TTTTTTTp",
    "# #oo#   #  #     TTTTTTTp",
    "# #oo#   #  #  B  TTTTTTTp",
    "# #oo#####  #    #TTTTTTTp",
    "# #oo#   #  #    #TTTTTTTp",
    "# ####   #  #    #TTTTTTTp",
    "# ####   ## ######TTTTTTTp",
    "#           #    #TTTTTTTp",
    "#           #    #TTTTTTTp",
    "#        ####  ###TTTTTTTp",
    "#  ##            #TTTTTTTp",
    "#                #TTTTTTTp",
    "##################pppTTppp",
    "qrrrrrrrrrrrrrrrrrrrrrrrrq",
    "qrrrrrrrrrrrrrrrrrrrrrrrrq",
    "qrrrrrrrrrrrrrrrrrrrrrrrrq",
    "qrrrrrrrrrrrrrrrrrrrrrrrrq",
    "qrrrrrrrrrrrrrrrrrrrrrrrrq",
    "qqqqqqqqqqqqqqqqqqqqqqqqqq",
  ],
];

// ---------- the compound plan (metres; north is -z) ----------
const ZC = { x0: -38, x1: 38, z0: -28, z1: 28, wallH: 5.5, innerH: 3.6, HX0: 2, HZ0: -12, FH: 4, SLAB: 0.3, gy: 0, fb: 0, lz: { x: 0, z: -80 } };
const ZD = {
  built: false, breaches: [], posts: [], postI: 0, target: null, down: false, downBy: '', downT: 0, heli: null, heliBoom: false,
  pick: null, clock: 20 * 60, nvg: true, hud: null, prompt: null, phase: '', blown: 0, guardsLeft: 0, laser: null,
};
const ZM = {
  wall: new THREE.MeshLambertMaterial({ color: 0xc7bca6 }), wallIn: new THREE.MeshLambertMaterial({ color: 0xd6cdbd }),
  house: new THREE.MeshLambertMaterial({ color: 0xcfc6b2 }), floor: new THREE.MeshLambertMaterial({ color: 0x8c7f6a }),
  gate: new THREE.MeshLambertMaterial({ color: 0x3f5240 }), door: new THREE.MeshLambertMaterial({ color: 0x5a4030 }),
  wire: new THREE.MeshLambertMaterial({ color: 0x2c2c2c }), win: new THREE.MeshLambertMaterial({ color: 0x23262a }),
  step: new THREE.MeshLambertMaterial({ color: 0xa49880 }), lamp: new THREE.MeshBasicMaterial({ color: 0xffd890 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xffc070 }), green: new THREE.MeshLambertMaterial({ color: 0x3e5a2c }),
};
const zcx = c => ZC.HX0 + c + 0.5, zcz = r => ZC.HZ0 + r + 0.5;   // house grid cell to world
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
  if (b.charge) { scene.remove(b.charge); b.charge = null; }
  const p = new THREE.Vector3(b.x, b.y + 1.2, b.z);
  explosion(p, 4.5, 8, byEnemy ? null : (player.team === 'blue' ? player : null), byEnemy ? 0 : 90, !!ghost || !!byEnemy);
  for (let i = 0; i < 6; i++) smokePuff(p.clone().add(new THREE.Vector3(rand(-1.5, 1.5), rand(-0.5, 1.5), rand(-1.5, 1.5))), 0x8a8478, rand(1, 2), 3, 0.6);
  ZD.blown++;
  if (byEnemy) showMessage(`Fighters blew the ${b.name}! They are coming in`, 4); else if (b.msg) showMessage(b.msg, 3);
}
// barbed wire along the top of a wall
function zWire(x0, z0, x1, z1, y) {
  const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0), P = new Part();
  for (let s = 0.4; s < len; s += 0.55) P.add(new THREE.TorusGeometry(0.22, 0.018, 4, 10), 0x3a3a3a, 0, 0.22, s - len / 2, 0, Math.PI / 2 + 0.3, 0);
  P.box(0.03, 0.03, len, 0x2a2a2a, 0, 0.05, 0);
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.rotation.y = a; scene.add(m);
}
// a straight wall along x or z, with gaps [from, to] left open (filled by breach gates)
function zWall(x0, z0, x1, z1, h, t, mat, gaps = [], y0) {
  const alongX = z0 === z1, a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1, base = y0 !== undefined ? y0 : ZC.gy - 0.4, top = (y0 !== undefined ? y0 : ZC.gy) + h;
  const cuts = [a0]; for (const [g0, g1] of gaps.slice().sort((p, q) => p[0] - q[0])) cuts.push(g0, g1); cuts.push(a1);
  for (let i = 0; i < cuts.length; i += 2) {
    const s0 = cuts[i], s1 = cuts[i + 1]; if (s1 - s0 < 0.05) continue;
    if (alongX) zBox(s0, s1, z0 - t / 2, z0 + t / 2, base, top, mat); else zBox(x0 - t / 2, x0 + t / 2, s0, s1, base, top, mat);
  }
  return top;
}

// ---------- the main house: three floors read from the plans above ----------
// '#' wall, ' ' room, 'd' the front door, 'g' the locked metal gate on the stairs, 'S' stairs up, 'o' stair hole,
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
const zCellBox = ([c0, c1, r0, r1], y0, y1, mat) => zBox(ZC.HX0 + c0, ZC.HX0 + c1 + 1, ZC.HZ0 + r0, ZC.HZ0 + r1 + 1, y0, y1, mat);
function zStairs(g, k) {
  let c0 = 99, c1 = -1, r0 = 99, r1 = -1;
  g.forEach((row, r) => row.split('').forEach((ch, c) => { if (ch === 'S') { c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r); } }));
  if (c1 < 0) return;
  const F = zfy(k), x0 = ZC.HX0 + c0, x1 = ZC.HX0 + c1 + 1, zb = ZC.HZ0 + r1 + 1, run = (r1 - r0 + 1) / 10;   // ten steps, climbing north
  for (let i = 1; i <= 10; i++) zBox(x0, x1, zb - run * i, zb - run * (i - 1), F, F + 0.4 * i, ZM.step);
  ZD.stairs = ZD.stairs || []; ZD.stairs.push({ k, x: (x0 + x1) / 2, zFoot: zb + 0.6, zTop: ZC.HZ0 + r0 - 0.6 });
}
function zBuildHouse() {
  const [G0, G1, G2] = ZD_GRID, wallTop = 3.7, M = ZM.house;
  zBox(ZC.HX0 - 0.2, ZC.HX0 + 26.2, ZC.HZ0 - 0.2, ZC.HZ0 + 22.2, ZC.gy - 0.6, ZC.fb, ZM.floor);   // the ground-floor slab
  for (const [k, g] of [[0, G0], [1, G1]]) {
    const F = zfy(k);
    for (const r of zRuns(g, ch => ch === '#')) zCellBox(r, F, F + wallTop, k === 0 && (r[2] === 0 || r[3] === 21 || r[0] === 0 || r[1] === 25) ? M : ZM.wallIn);
    for (const r of zRuns(g, ch => ch === 'd' || ch === 'g')) zCellBox(r, F + 2.6, F + wallTop, ZM.wallIn);   // lintels over the door and the gate
    zStairs(g, k);
  }
  // floor slabs, with holes over the stairs
  zRects(G1, ch => ch !== 'o').forEach(r => zCellBox(r, zfy(1) - ZC.SLAB, zfy(1), ZM.floor));
  zRects(G2, ch => ch !== 'o').forEach(r => zCellBox(r, zfy(2) - ZC.SLAB, zfy(2), ZM.floor));
  // third floor: walls, the low roof walls, the privacy wall, and its own roof
  const F = zfy(2);
  for (const r of zRuns(G2, ch => ch === '#')) zCellBox(r, F, F + wallTop, ZM.wallIn);
  for (const r of zRuns(G2, ch => ch === 'p')) zCellBox(r, F, F + 2.1, M);
  for (const r of zRuns(G2, ch => ch === 'q')) zCellBox(r, F, F + 1.0, M);
  zBox(ZC.HX0 - 0.1, ZC.HX0 + 18.1, ZC.HZ0 - 0.1, ZC.HZ0 + 16.1, F + wallTop, F + wallTop + 0.35, ZM.floor);
  // the front door and the stair gate (blown open with breach charges)
  zBreachable('front door', ZC.HX0 + 5, ZC.HX0 + 7, ZC.HZ0 + 0.1, ZC.HZ0 + 0.9, zfy(0), zfy(0) + 2.6, ZM.door, 'Front door is open. Clear the ground floor!');
  zBox(ZC.HX0 + 20, ZC.HX0 + 22, ZC.HZ0 + 19.15, ZC.HZ0 + 19.65, zfy(0) + 2.6, zfy(0) + 3.7, ZM.wallIn);
  zBreachable('lower stair gate', ZC.HX0 + 20, ZC.HX0 + 22, ZC.HZ0 + 19.2, ZC.HZ0 + 19.6, zfy(0), zfy(0) + 2.6, ZM.gate, 'Lower stair gate is down. Up to the second floor!');
  zBreachable('stair gate', ZC.HX0 + 3, ZC.HX0 + 5, ZC.HZ0 + 8.3, ZC.HZ0 + 8.7, zfy(1), zfy(1) + 2.6, ZM.gate, 'The gate on the stairs is down. Up to the third floor!');
  // few windows to the outside: dark, small, high up
  const P = new Part();
  for (const k of [0, 1, 2]) for (let i = 0; i < (k === 2 ? 3 : 5); i++) {
    const y = zfy(k) + 2.1 - ZC.fb + (k ? 0 : 0.2), x = 3.5 + i * (k === 2 ? 5.5 : 5.2);
    P.box(1.0, 0.7, 0.08, 0x1d2024, x, y, -0.05); P.box(1.0, 0.7, 0.08, 0x1d2024, x, y, 22.05);
  }
  const wm = new THREE.Mesh(P.build(), VEH_MAT); wm.position.set(ZC.HX0, ZC.fb, ZC.HZ0); scene.add(wm);
  // where the target is
  G2.forEach((row, r) => { const c = row.indexOf('B'); if (c >= 0) ZD.targetAt = new THREE.Vector3(zcx(c), zfy(2), zcz(r)); });
}

// ---------- walls, gates, the guest house and the yards ----------
function zBuildCompound() {
  const H = ZC.wallH, gy = ZC.gy;
  // outer wall: up to 18 feet high, barbed wire on top; the main gate in the north wall onto the lane
  zWall(ZC.x0, ZC.z0, ZC.x1, ZC.z0, H, 0.6, ZM.wall, [[-32, -26]]);
  zWall(ZC.x0, ZC.z1, ZC.x1, ZC.z1, H, 0.6, ZM.wall);
  zWall(ZC.x0, ZC.z0, ZC.x0, ZC.z1, H, 0.6, ZM.wall);
  zWall(ZC.x1, ZC.z0, ZC.x1, ZC.z1, H, 0.6, ZM.wall);
  zBox(-32, -26, ZC.z0 - 0.3, ZC.z0 + 0.3, gy + 4.4, gy + H, ZM.wall);   // over the gate
  zBreachable('main gate', -32, -26, ZC.z0 - 0.25, ZC.z0 + 0.25, gy - 0.2, gy + 4.4, ZM.gate, 'Main gate is down!');
  for (const [a, b, c, d] of [[ZC.x0, ZC.z0, ZC.x1, ZC.z0], [ZC.x0, ZC.z1, ZC.x1, ZC.z1], [ZC.x0, ZC.z0, ZC.x0, ZC.z1], [ZC.x1, ZC.z0, ZC.x1, ZC.z1]]) zWire(a, b, c, d, gy + H);
  // inner walls: the animal pen (where the helicopter came down) and the driveway with the guest house
  const IH = ZC.innerH;
  zWall(ZC.x0, 2, -12, 2, IH, 0.5, ZM.wallIn, [[-25, -22.6]]);
  zBox(-25, -22.6, 1.75, 2.25, gy + 2.6, gy + IH, ZM.wallIn);
  zBreachable('pen door', -25, -22.6, 1.8, 2.2, gy - 0.2, gy + 2.6, ZM.door, 'Pen door is open: the driveway and the guest house are through here');
  zWall(-12, ZC.z0, -12, ZC.z1, IH, 0.5, ZM.wallIn, [[-17, -13], [17, 19.4]]);
  zBox(-12.25, -11.75, -17, -13, gy + 3.0, gy + IH, ZM.wallIn); zBox(-12.25, -11.75, 17, 19.4, gy + 2.6, gy + IH, ZM.wallIn);
  zBreachable('inner gate', -12.2, -11.8, -17, -13, gy - 0.2, gy + 3.0, ZM.gate, 'Inner gate is open. The main house is across the courtyard');
  zBreachable('pen gate', -12.2, -11.8, 17, 19.4, gy - 0.2, gy + 2.6, ZM.door, 'Through into the main courtyard!');
  for (const [a, b, c, d] of [[ZC.x0, 2, -12, 2], [-12, ZC.z0, -12, ZC.z1]]) zWire(a, b, c, d, gy + IH);
  // the guest house, where the courier lived: one storey, two rooms, a door onto the driveway
  const g0 = gy, gh = 3.4;
  zWall(-37.6, -25, -27, -25, gh, 0.4, ZM.house, [], g0); zWall(-37.6, -7, -27, -7, gh, 0.4, ZM.house, [], g0);
  zWall(-27, -25, -27, -7, gh, 0.4, ZM.house, [[-19, -17], [-12, -10]], g0);
  zWall(-37.6, -16, -27, -16, gh, 0.3, ZM.wallIn, [[-31, -29.4]], g0);
  zBox(-37.7, -26.8, -25.2, -6.8, g0 + gh, g0 + gh + 0.3, ZM.floor);
  // the main house
  zBuildHouse();
  // the yards: water tanks, the trash they burned instead of putting it out, a vegetable garden, a car under a lean-to
  for (const [x, z] of [[-14.5, -25], [35, 25], [30, -25]]) { addMesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 12), ZM.gate, x, gy + 0.8, z); addCircle(x, z, 0.95, gy + 1.6); }
  ZD.trash = new THREE.Vector3(-4, gy + 0.2, 24);
  addMesh(new THREE.CylinderGeometry(1.2, 1.4, 0.5, 10), new THREE.MeshLambertMaterial({ color: 0x2a2622 }), -4, gy + 0.25, 24);
  for (let i = 0; i < 6; i++) addMesh(new THREE.BoxGeometry(12, 0.25, 0.7), ZM.green, 16, gy + 0.12, 15 + i * 2, false);
  zBox(-10, -5, -27.5, -23, gy + 2.6, gy + 2.8, ZM.gate); for (const [x, z] of [[-9.8, -23.2], [-5.2, -23.2]]) zBox(x - 0.1, x + 0.1, z - 0.1, z + 0.1, gy, gy + 2.6, ZM.wire);
  zBox(-9, -6, -27, -24, gy, gy + 1.5, ZM.win);   // the car
  // the lane outside the north wall, and a few lamps
  for (const [x, z] of [[-30, -31], [10, -31], [30, -31]]) { addMesh(new THREE.BoxGeometry(0.4, 0.25, 0.25), ZM.lamp, x, gy + 4.2, z, false); }
}

// ---------- the crashed helicopter in the animal pen ----------
function zBuildCrash() {
  if (typeof heliCustomModel !== 'function') return;
  const m = heliCustomModel('blackhawk', 'blue'), g = m.g, x = -24, z = 15;
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
    if (Math.abs(hx) < 62 && hz > -58 && hz < 46) continue;   // the compound and the lane
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
  showMessage(ZD.nvg ? 'Night vision ON (L)' : 'Night vision OFF (L)', 1.2);
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
  for (const [k, r, c] of [[0, 2, 3], [0, 5, 11], [0, 8, 23], [0, 12, 9], [0, 17, 8], [0, 20, 17], [1, 1, 11], [1, 5, 13], [1, 10, 23], [1, 17, 5], [1, 14, 12], [1, 15, 24], [1, 10, 3], [2, 11, 3], [2, 13, 13], [2, 7, 10]]) F(k, r, c);
  const O = (x, z, patrol) => P.push({ x, y: ZC.gy, z, face: rand(0, 6.28), floor: -1, patrol: patrol ? patrol.map(([a, b]) => ({ x: a, z: b })) : null });
  O(-33, -20); O(-31, -11);                                   // the guest house
  O(-20, -22, [[-20, -22], [-20, -5]]); O(-16, -25);          // the driveway
  O(-5, -22, [[-5, -22], [34, -22]]); O(-6, 22); O(34, 18, [[34, 18], [34, -20]]);   // the courtyard round the house
  O(-36, -34, [[-36, -34], [36, -34]]); O(44, -25, [[44, -25], [44, 25]]);           // the lanes outside the walls
  return P;
}
function zGuardThink(n) {
  let best = null, bd = 60;
  const eye = n.eye();
  for (const c of chars) {
    if (!c.alive || c.team === n.team || c.vehicle || c.inactive) continue;
    const d = c.pos.distanceTo(n.pos); if (d > bd) continue;
    if (Math.abs(c.pos.y - n.pos.y) > 3.2 && d < 20 && n.zPost.floor >= 0) continue;   // a different floor of the house
    if (los(eye, c.chest())) { best = c; bd = d; }
  }
  if (best && best !== n.prevTgt && (best.isPlayer || best.isRemote)) n.fireT = Math.max(n.fireT, rand(0.5, 0.95) * DIFF().react);   // a moment to react
  n.prevTgt = best; n.target = best; n.tgtVisible = !!best;
  if (best) for (const o of npcs) if (o !== n && o.alive && o.zPost && !o.target && o.pos.distanceTo(n.pos) < 14 && Math.abs(o.pos.y - n.pos.y) < 2) o.alertedBy = best;
}
function zGuard(n, dt) {
  const S = ROLE_STATS[n.role] || ROLE_STATS.rifle, P = n.zPost;
  n.thinkT -= dt; if (n.thinkT <= 0) { n.thinkT = rand(0.25, 0.4); zGuardThink(n); }
  if (n.target && !n.target.alive) { n.target = null; n.tgtVisible = false; }
  const tgt = n.tgtVisible ? n.target : null;
  let moving = false, mx = 0, mz = 0, speed = 1.7;
  if (!tgt && P.patrol && !n.alertedBy) {
    n.zPi = n.zPi || 0; const w = P.patrol[n.zPi], dx = w.x - n.pos.x, dz = w.z - n.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.8) n.zPi = (n.zPi + 1) % P.patrol.length;
    else { mx = dx / d; mz = dz / d; const nx = n.pos.x + mx * speed * dt, nz = n.pos.z + mz * speed * dt; if (!blockedAt(nx, nz, n.pos.y)) { n.pos.x = nx; n.pos.z = nz; moving = true; } else n.zPi = (n.zPi + 1) % P.patrol.length; }
  } else if (!P.patrol) { n.pos.x += (P.x - n.pos.x) * Math.min(1, dt * 2); n.pos.z += (P.z - n.pos.z) * Math.min(1, dt * 2); }
  const floor = pushOut(n.pos, 0.4, n.pos.y); n.pos.y = lerp(n.pos.y, floor, Math.min(1, dt * 12)); if (Math.abs(n.pos.y - floor) > 2) n.pos.y = floor;
  let face = P.face + Math.sin(simTime * 0.35 + n.npcIdx) * 0.9;   // looking about
  if (tgt) face = Math.atan2(tgt.pos.x - n.pos.x, tgt.pos.z - n.pos.z);
  else if (n.alertedBy && n.alertedBy.alive) { face = Math.atan2(n.alertedBy.pos.x - n.pos.x, n.alertedBy.pos.z - n.pos.z); if ((n.alertT = (n.alertT || 0) + dt) > 8) { n.alertedBy = null; n.alertT = 0; } }
  else if (moving) face = Math.atan2(mx, mz);
  n.heading += wrapAngle(face - n.heading) * Math.min(1, dt * 7);
  n.moving = moving;
  if (n.crouchT === undefined || (n.crouchT -= dt) <= 0) { n.crouchT = rand(2, 5); n.wantCrouch = Math.random() < 0.35; }
  n.crouch = !!(tgt && n.wantCrouch && !moving);
  npcShoot(n, S, dt);
  animateNPC(n, dt, moving ? speed : 0, !!tgt);
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
  showMessage(`${ZD.downBy}: "For God and country. Geronimo, Geronimo, Geronimo... Geronimo E-KIA." Now get to the landing zone north of the compound!`, 9);
  if (typeof unlock === 'function' && !fromNet) try { unlock('zd30'); } catch (e) { }
  if (!fromNet) netFx(['zk', ZD.downBy]);
  if (typeof SFX !== 'undefined' && SFX.capture) SFX.capture();
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
    if (humans.some(c => Math.hypot(c.pos.x - lz.x, c.pos.z - lz.z) < 10)) { ZD.exfil = true; endGame('blue'); }
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
  ZD.prompt.style.display = near ? 'block' : 'none';
  if (near) ZD.prompt.textContent = `Press E to set a breach charge on the ${near.name}`;
}

// ---------- the mission: objectives, the clock and the HUD ----------
function zInHouse(c) { return c.pos.x > ZC.HX0 && c.pos.x < ZC.HX0 + 26 && c.pos.z > ZC.HZ0 && c.pos.z < ZC.HZ0 + 22; }
function zUpdate(dt) {
  if (!started) return;
  zBreachUpdate(dt); zExfilUpdate(dt);
  if (ZD.target && !ZD.down) {   // he watches the door
    const g = ZD.target.g; g.rotation.y = Math.atan2(player.pos.x - ZD.target.at.x, player.pos.z - ZD.target.at.z) * 0.6 + Math.PI * 0.75;
    if (!ZD.seen && player.alive && player.pos.distanceTo(ZD.target.at) < 8 && Math.abs(player.pos.y - ZD.target.at.y) < 1.5) { ZD.seen = true; showMessage('Third floor. There he is: take the shot!', 3); }
  }
  if (ZD.trash && Math.random() < dt * 3) smokePuff(ZD.trash.clone().add(new THREE.Vector3(rand(-0.6, 0.6), 0.3, rand(-0.6, 0.6))), 0x4a4440, rand(0.5, 1), 4, 0.8);
  if (!gameOver) ZD.clock = Math.max(0, ZD.clock - dt);
  if (ZD.clock <= 0 && !gameOver && !ZD.exfil && (!net.active || net.isHost)) { ZD.lost = true; endGame('red'); }
  // objective line
  let obj;
  const k = player.pos.y > zfy(2) - 0.5 ? 2 : player.pos.y > zfy(1) - 0.5 ? 1 : 0, inH = zInHouse(player);
  if (ZD.down) obj = 'GERONIMO E-KIA. Get to the helicopter on the landing zone north of the compound (green smoke)';
  else if (inH && k === 2) obj = 'Third floor. Find the target';
  else if (inH && k === 1) obj = ZD.breaches.find(b => b.name === 'stair gate').done ? 'Second floor. Up the stairs in the north-west to the third floor' : 'Second floor. The stairs up are behind a locked metal gate in the north-west: blow it';
  else if (inH) obj = ZD.breaches.find(b => b.name === 'lower stair gate').done ? 'Ground floor. Up the stairs in the south-east corner' : 'Ground floor. The stairs up (south-east corner) are behind a locked metal gate: blow it';
  else if (player.pos.x < -12 && player.pos.z > 2 && player.pos.x > ZC.x0) obj = 'You came down in the animal pen. Blow a door: the pen door (north) or the pen gate (east)';
  else if (player.pos.x < -12 && player.pos.x > ZC.x0 && player.pos.z > ZC.z0) obj = 'Clear the guest house, then blow the inner gate (east) into the main courtyard';
  else obj = 'Get into the main house: blow the front door (north side)';
  const left = chars.filter(c => c.alive && c.team === 'red' && c.pos.x > ZC.x0 - 1 && c.pos.x < ZC.x1 + 1 && c.pos.z > ZC.z0 - 1 && c.pos.z < ZC.z1 + 1).length;   // inside the walls (works online too)
  if (!ZD.hud) { const el = document.createElement('div'); el.id = 'zdHud'; el.className = 'hud'; el.style.cssText = 'position:fixed;left:50%;top:44px;transform:translateX(-50%);color:#e8ffe8;text-align:center;font:600 14px system-ui,sans-serif;text-shadow:0 1px 3px #000;pointer-events:none;max-width:80vw;z-index:4'; document.body.appendChild(el); ZD.hud = el; }
  const mm = Math.floor(ZD.clock / 60), ss = Math.floor(ZD.clock % 60);
  const html = `<div style="font-size:12px;opacity:.85">OPERATION NEPTUNE SPEAR &nbsp;·&nbsp; Pakistani response in ${mm}:${ss < 10 ? '0' : ''}${ss} &nbsp;·&nbsp; Enemies inside the walls: ${left}</div><div>${obj}</div>`;
  if (html !== ZD.hudHtml) { ZD.hud.innerHTML = html; ZD.hudHtml = html; }
}

// ---------- co-op: everyone on blue, enemy waves, win by taking down the target ----------
const WAVE = { n: 0, t: ZD30 ? 80 : 45 };
function coopUpdate(dt) {
  if (!started || gameOver || (net.active && !net.isHost)) return;
  WAVE.t -= dt; if (WAVE.t > 0) return;
  WAVE.t = ZD30 ? 55 : 40;
  const held = npcs.filter(n => n.team === 'red' && !n.inactive && !n.alive && n.cw === 'held');
  if (!held.length) return;
  WAVE.n++;
  if (ZD30 && WAVE.n === 1) for (const nm of ['main gate', 'inner gate']) { const b = ZD.breaches.find(q => q.name === nm); if (!b.done) { zOpen(b, false, true); netFx(['zb', ZD.breaches.indexOf(b)]); } }   // they blow their way in
  const k = Math.min(held.length, ZD30 ? 3 + WAVE.n * 2 : 8 + WAVE.n * 3);
  for (let i = 0; i < k; i++) { held[i].cw = 'go'; held[i].respawnT = rand(0.2, 4); }
  const msg = ZD30 ? `WAVE ${WAVE.n}: ${k} fighters coming in from the streets!` : `WAVE ${WAVE.n}: ${k} enemy soldiers counter-attacking!`;
  showMessage(msg, 4); netFx(['zw', msg]);
}
// street fighters find their way in: through the main gate, across the driveway, through the inner gate, to the front door
function zZone(p) {
  if (p.x < ZC.x0 || p.x > ZC.x1 || p.z < ZC.z0 || p.z > ZC.z1) return 'out';
  if (zInHouse({ pos: p })) return 'house';
  if (p.x < -12) return p.z < 2 ? 'drive' : 'pen';
  return 'court';
}
function zFighterGoal(n, T) {
  const z = zZone(n.pos), tz = zZone(T.pos), done = nm => ZD.breaches.find(b => b.name === nm).done, near = (x, zz) => Math.hypot(n.pos.x - x, n.pos.z - zz) < 2.5;
  const V = (x, zz) => new THREE.Vector3(x, 0, zz);
  if (z === tz && z !== 'out') return V(T.pos.x, T.pos.z);
  if (z === 'out') { if (tz === 'out') return V(T.pos.x, T.pos.z); if (!done('main gate')) return V(-29, -36); return near(-29, -33) || n.zGate ? (n.zGate = true, V(-29, -22)) : V(-29, -33); }
  n.zGate = false;
  if (z === 'drive') { if (tz === 'out') return V(-29, -33); if (tz === 'pen' && done('pen door')) return V(-23.8, 4); return done('inner gate') ? V(-9, -15) : V(-14, -15); }
  if (z === 'pen') { if (tz === 'court' || tz === 'house') { if (done('pen gate')) return V(-9, 18.2); } return done('pen door') ? V(-23.8, -1) : V(-20, 10); }
  if (z === 'court') {
    if (tz === 'house') return done('front door') ? (near(8, -14) || n.zDoor ? (n.zDoor = true, V(8, -9)) : V(8, -14)) : V(8, -15);
    n.zDoor = false;
    if (tz === 'pen') return done('pen gate') ? V(-14, 18.2) : V(-9, 18.2);
    return done('inner gate') ? V(-15, -15) : V(-9, -15);
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
    }
    if (ZD30 && n.team === 'blue') {
      const L = zBlueLeader(n);
      if (L) { const a = (n.npcIdx % 5) * 1.25, r = 2.5 + (n.npcIdx % 3); n.goal = new THREE.Vector3(L.pos.x + Math.sin(a) * r, 0, L.pos.z + Math.cos(a) * r); n.goalT = 30; }
    }
  };
  const fs = findSpawn;
  findSpawn = function (team, pref) {
    if (ZD30 && team === 'blue') {   // the team starts (and comes back) by the crashed helicopter in the animal pen
      for (let i = 0; i < 40; i++) { const x = rand(-35, -15), z = rand(5, 26); if (Math.hypot(x - ZD.heli.x, z - ZD.heli.z) > 6.5 && !blockedAt(x, z, heightAt(x, z))) return { x, z }; }
      return { x: -16, z: 6 };
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
    const ia = interact; interact = function () { if (ZD.near && !player.vehicle && !player.gv) { zPlaceCharge(ZD.near, true); return; } return ia.apply(this, arguments); };
    const rh = rayHit; rayHit = function (o, d, m, team, opts) { return zTargetRay(o, d, m, team, rh(o, d, m, team, opts)); };
    const ah = applyHit; applyHit = function (hit, d, wpn, shooter) { if (hit && hit.zdTarget) { if (shooter && (shooter === player || shooter.isPlayer)) zTargetDown(player.name); return false; } return ah.apply(this, arguments); };
    const bt = balanceTeams;
    balanceTeams = function (initial) {
      if (net.active && !net.isHost) return;
      let humans = 1; if (net.remotes) humans += net.remotes.size;
      const cap = net.active ? Math.min(40, TEAM_POOL) : TEAM_POOL;
      const want = { blue: clamp(6 - humans, 2, 6), red: Math.min(cap, ZD.posts.length + (net.active ? 14 : 34)) };
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
    if (k === 'zw') { showMessage(e[2], 4); return; }
    return af.apply(this, arguments);
  };
  // the team picker: co-op has only one team
  document.querySelectorAll('#teamPick .chip').forEach(c => { if (c.dataset.t !== 'auto' && c.dataset.t !== 'blue') c.style.display = 'none'; });
}

// ---------- building it all ----------
function buildZD30() {
  if (!ZD30 || ZD.built) return; ZD.built = true;
  ZC.gy = heightAt(0, 0); ZC.fb = ZC.gy + 0.3;
  zBuildCompound(); zBuildCrash(); zBuildTarget(); zBuildTown(); zBuildSky();
  ZD.posts = zPosts();
  zApplyLight();
  if (IS_TOUCH) {   // a night vision button for phones and tablets
    const b = document.createElement('div'); b.textContent = 'NVG'; b.className = 'tbtn on';
    b.style.cssText = 'position:fixed;right:14px;top:38%;width:54px;height:54px;border-radius:50%;background:rgba(40,90,40,.55);color:#cfffcf;font:700 14px system-ui;display:flex;align-items:center;justify-content:center;z-index:20;user-select:none';
    b.addEventListener('touchstart', e => { e.preventDefault(); setNVG(!ZD.nvg); }, { passive: false });
    document.body.appendChild(b); ZD.nvgBtn = b;
  }
}
