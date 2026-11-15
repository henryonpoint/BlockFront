// ===================== ships.js : huge warships you can board, walk around and steer =====================
// A battleship (three big gun turrets) and an aircraft carrier (flight deck with jets, a hangar deck below).
// Each ship is a moving platform: its decks, ramps and walls are checked by the same ground and wall code that
// soldiers, vehicles and players already use, so everyone can walk around on it, and whatever stands on it is
// carried along when it moves. Walk up to the wheel on the bridge and press E to take command: W/S throttle,
// A/D steer, and on the battleship, click to fire the main guns where you aim. Online, the host steers.
const SHIPS2 = [];
const SH = { built: false, prompt: null };
// ship-local coordinates: u forward along the ship, v to the right, y up from the water
function shipBasis(s) { return { fx: -Math.sin(s.yaw), fz: -Math.cos(s.yaw), rx: Math.cos(s.yaw), rz: -Math.sin(s.yaw) }; }
function shipLocal(s, x, z) { const b = shipBasis(s), dx = x - s.x, dz = z - s.z; return { u: dx * b.fx + dz * b.fz, v: dx * b.rx + dz * b.rz }; }
function shipWorld(s, u, v) { const b = shipBasis(s); return { x: s.x + b.fx * u + b.rx * v, z: s.z + b.fz * u + b.rz * v }; }
function inHull(s, u, v, pad = 0) { if (Math.abs(u) > s.L / 2 + pad) return false; return Math.abs(v) <= s.halfW(u) + pad; }
// the floor under (u, v) for feet at height fy: the highest deck you are standing on (or just stepping up onto)
function shipFloor(s, u, v, fy) {
  let best = -Infinity;
  for (const d of s.decks) {
    if (u < d.u0 || u > d.u1 || v < d.v0 || v > d.v1) continue;
    let y = d.y;
    if (d.ramp) { const t = clamp(((d.ramp === 'u' ? u : v) - (d.ramp === 'u' ? d.u0 : d.v0)) / ((d.ramp === 'u' ? d.u1 - d.u0 : d.v1 - d.v0) || 1), 0, 1); y = lerp(d.ya, d.yb, t); }
    y += WATER_Y;
    if (y <= fy + 0.9 && y > best) best = y;
  }
  if (inHull(s, u, v) && s.mainY + WATER_Y <= fy + 0.9) best = Math.max(best, s.mainY + WATER_Y);
  return best;
}
function shipUnder(x, z, fy) {   // the ship and floor height under a point, if any
  for (const s of SHIPS2) {
    if (Math.abs(x - s.x) > s.L / 2 + 30 || Math.abs(z - s.z) > s.L / 2 + 30) continue;
    const { u, v } = shipLocal(s, x, z); if (!inHull(s, u, v, 0.5)) continue;
    const f = shipFloor(s, u, v, fy); if (f > -Infinity) return { s, f, u, v };
  }
  return null;
}

// ---------- the models ----------
// a smooth one-piece hull or deck from the ship's outline (seen from above), extruded downwards from y
function shipSlab(P, s, top, depth, color, shrink = 0) {
  const sh = new THREE.Shape(), pts = [];
  for (let u = -s.L / 2; u <= s.L / 2 + 0.01; u += 2) pts.push([u, Math.max(0.3, s.halfW(Math.min(u, s.L / 2 - 0.01)) - shrink)]);
  pts.forEach(([u, v], i) => i ? sh.lineTo(u, v) : sh.moveTo(u, v));
  for (let i = pts.length - 1; i >= 0; i--) sh.lineTo(pts[i][0], -pts[i][1]);
  sh.closePath();
  P.add(new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 1 }), color, 0, top, 0, Math.PI / 2, 0, 0);
}

function buildBattleship(x, z, yaw, team) {
  const L = 190, B = 30, mainY = 8;
  const s = { kind: 'battleship', name: 'Battleship', team, x, z, yaw, L, B, mainY, speed: 0, throttle: 0, rudder: 0, decks: [], walls: [], turrets: [], fireT: 0 };
  s.halfW = u => u > 50 ? lerp(B / 2, 2, clamp((u - 50) / 45, 0, 1)) : u < -80 ? lerp(B / 2, B / 2 - 6, clamp((-u - 80) / 15, 0, 1)) : B / 2;
  const g = new THREE.Group(); scene.add(g); s.g = g;
  const P = new Part(), grey = 0x7a8088, dark = 0x5a6068, deck = 0x9a7a52, hullC = 0x6a7078, red = 0x6a2a24;
  // hull, built in slices so the bow comes to a point
  shipSlab(P, s, mainY, mainY + 4.6, hullC); shipSlab(P, s, -4.6, 1.6, red, -0.05); shipSlab(P, s, mainY + 0.3, 0.3, deck, 0.4);
  for (let u = -90; u < 90; u += 3) P.box(0.08, 0.02, s.halfW(u) * 2 - 1, 0x7a5e3e, u, mainY + 0.31, 0);   // deck planking lines
  // superstructure: two levels and a tall bridge tower, two funnels, a mast
  P.box(40, 6, 22, grey, -10, mainY + 3, 0); P.box(24, 6, 14, grey, -12, mainY + 9, 0); P.box(10, 8, 10, dark, -6, mainY + 16, 0);
  P.box(10.4, 1.4, 10.4, 0x1c2228, -6, mainY + 18.6, 0);
  P.box(5, 0.5, 14, grey, 2.5, mainY + 11.75, 0); for (const sd of [-1, 1]) P.box(5, 1, 0.15, dark, 2.5, mainY + 12.6, sd * 7); P.box(0.15, 1, 14, dark, 5, mainY + 12.6, 0);   // bridge wing with a railing                                 // bridge windows
  P.cyl(2.6, 3, 10, dark, -20, mainY + 14, 0); P.cyl(2.4, 2.8, 9, dark, -30, mainY + 13, 0);
  P.cyl(0.4, 0.5, 18, dark, -2, mainY + 29, 0); P.box(8, 0.4, 0.4, dark, -2, mainY + 34, 0);
  for (const v of [-9, 9]) for (const u of [-28, -18, -4, 6]) P.box(3, 2, 3, dark, u, mainY + 7, v);   // secondary gun mounts
  for (let i = 0; i < 10; i++) P.box(1, 1.2, 1, 0x3a3e44, -40 + i * 8, mainY + 0.8, (i % 2 ? 1 : -1) * 13.5);   // anti-aircraft guns along the rails
  // railings along the deck edge
  for (let u = -94; u < 94; u += 4) for (const sd of [-1, 1]) P.box(4, 0.1, 0.1, dark, u + 2, mainY + 1.1, sd * (s.halfW(u + 2) - 0.3));
  // finer detail: portholes along the hull, anchors at the bow, lifeboats, searchlights, a range finder on the bridge
  for (let u = -80; u < 60; u += 5) for (const sd of [-1, 1]) P.cyl(0.35, 0.35, 0.1, 0x1c2228, u, mainY - 2.5, sd * (s.halfW(u) + 0.02), Math.PI / 2, 0, 0, 1, 8);
  for (const sd of [-1, 1]) { P.box(1.4, 2, 0.4, 0x2a2e34, 82, mainY - 3, sd * (s.halfW(82) + 0.2)); P.box(0.3, 4, 0.3, 0x2a2e34, 82, mainY - 1, sd * (s.halfW(82) + 0.1)); }
  for (const sd of [-1, 1]) for (const u of [-36, -26]) { P.box(6, 1.4, 2, 0xd8d4c8, u, mainY + 7.6, sd * 11.6); P.box(6.2, 0.3, 2.2, 0x5a6068, u, mainY + 8.4, sd * 11.6); }
  for (const sd of [-1, 1]) P.cyl(0.7, 0.7, 0.8, 0xd8d8c8, -6, mainY + 20.6, sd * 5.4, 0, 0, Math.PI / 2, 1, 10);
  P.box(12, 1.2, 1.4, dark, -6, mainY + 21, 0); P.cyl(1.4, 1.4, 1.6, dark, -6, mainY + 21, 0, 0, 0, 0, 1, 10);
  for (let u = -90; u < 90; u += 15) P.box(0.2, 0.05, s.halfW(u) * 2 - 2, 0x8a6a42, u, mainY + 0.32, 0);
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; m.receiveShadow = true; g.add(m);
  { const r = new THREE.Group(); r.position.set(-2, mainY + 36, 0); const RP = new Part(); RP.box(6, 2.4, 0.3, 0x3a3e44, 0, 0, 0); RP.box(0.4, 0.4, 1.2, 0x3a3e44, 0, -1.2, 0.5); r.add(new THREE.Mesh(RP.build(), VEH_MAT)); g.add(r); s.radar = r; }
  // the big gun turrets: two forward, one aft. Each turns and its three barrels lift.
  for (const [u, fwd] of [[42, true], [24, true], [-58, false]]) {
    const tg = new THREE.Group(); tg.position.set(u, mainY, 0); g.add(tg);
    const TP = new Part(); TP.cyl(6.5, 7, 2.5, dark, 0, 1.25, 0, 0, 0, 0, 1, 16); TP.box(13, 5, 15, grey, 0, 4.5, 1); TP.box(13.4, 0.4, 15.4, dark, 0, 7.1, 1);
    tg.add(new THREE.Mesh(TP.build(), VEH_MAT));
    const pitch = new THREE.Group(); pitch.position.set(0, 4.5, -5.5); tg.add(pitch);
    const BP = new Part(); for (const vv of [-3.2, 0, 3.2]) { BP.cyl(0.65, 0.75, 22, dark, vv, 0, -11, Math.PI / 2, 0, 0, 1, 10); BP.cyl(0.85, 0.85, 1.4, 0x3a3e44, vv, 0, -21.5, Math.PI / 2, 0, 0, 1, 10); }
    pitch.add(new THREE.Mesh(BP.build(), VEH_MAT));
    tg.rotation.y = fwd ? 0 : Math.PI;
    s.turrets.push({ g: tg, pitch, u, base: fwd ? 0 : Math.PI, yaw: fwd ? 0 : Math.PI, p: 0 });
    s.walls.push({ u0: u - 7.5, u1: u + 7.5, v0: -7.5, v1: 7.5, y0: mainY, y1: mainY + 7 });
  }
  // walkable decks: superstructure levels, connected by ramps, and the bridge with the wheel
  s.decks.push({ u0: -30, u1: 10, v0: -11, v1: 11, y: mainY + 6 });                          // first level (its roof)
  s.decks.push({ u0: 10, u1: 22, v0: 7, v1: 11, ramp: 'u', ya: mainY + 6, yb: mainY, flip: true });   // ramp down to the main deck (starboard)
  s.decks.push({ u0: -24, u1: 5, v0: -7, v1: 7, y: mainY + 12 });                            // second level, with a bridge wing out front where the wheel stands
  s.decks.push({ u0: -30, u1: -24, v0: -7, v1: -3, ramp: 'u', ya: mainY + 6, yb: mainY + 12 });  // ramp up from the first level
  s.walls.push({ u0: -30, u1: 10, v0: -11, v1: 11, y0: mainY, y1: mainY + 5.6, door: { u0: 10, u1: 10.5, v0: 6, v1: 11 } });   // first level block
  s.walls.push({ u0: -24, u1: 0, v0: -7, v1: 7, y0: mainY + 6, y1: mainY + 11.6, door: { u0: -24.5, u1: -24, v0: -7, v1: -3 } });
  s.walls.push({ u0: -11, u1: -1, v0: -5, v1: 5, y0: mainY + 12, y1: mainY + 20 });           // bridge tower
  s.walls.push({ u0: -23, u1: -17, v0: -3, v1: 3, y0: mainY + 12, y1: mainY + 20 });          // funnel
  s.helm = { u: 2, v: 0, y: mainY + 12 };                                                       // the wheel, in front of the bridge
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 6, 16), new THREE.MeshLambertMaterial({ color: 0x6b4a2a })); wheel.position.set(2, mainY + 13.2, 0); wheel.rotation.y = Math.PI / 2; g.add(wheel);
  addShipDeckRamps(s);
  SHIPS2.push(s); placeShip(s); return s;
}
function buildCarrier(x, z, yaw, team) {
  const L = 220, B = 38, mainY = 18, hangY = 8;
  const s = { kind: 'carrier', name: 'Aircraft carrier', team, x, z, yaw, L, B, mainY, speed: 0, throttle: 0, rudder: 0, decks: [], walls: [], turrets: [], fireT: 0 };
  s.halfW = u => u > 80 ? lerp(B / 2, 8, clamp((u - 80) / 30, 0, 1)) : B / 2;
  const g = new THREE.Group(); scene.add(g); s.g = g;
  const P = new Part(), grey = 0x737a82, dark = 0x50565e, deck = 0x3a3d42, hullC = 0x666d75, red = 0x6a2a24;
  shipSlab(P, s, hangY, hangY + 5, hullC, 3); shipSlab(P, s, -5.5, 1.4, red, 3.05);                          // lower hull, waterline
  shipSlab(P, s, mainY + 0.6, 0.6, deck); shipSlab(P, s, hangY + 0.3, 0.3, 0x6a6e72, 3);                   // flight deck, hangar floor
  for (let u = -110; u < 110; u += 4) { const w = s.halfW(u + 2) * 2; for (const sd of [-1, 1]) P.box(4.05, mainY - hangY, 3, hullC, u + 2, (mainY + hangY) / 2, sd * (w / 2 - 1.5)); }   // the hangar's outer walls
  P.box(200, 0.05, 0.6, 0xf2f2f2, -5, mainY + 0.62, 0); for (let u = -100; u < 100; u += 12) P.box(6, 0.05, 0.5, 0xf2d040, u, mainY + 0.63, -6);   // deck markings
  P.box(60, 0.05, 0.6, 0xf2f2f2, 40, mainY + 0.62, -10, 0, -0.16, 0);                                         // angled landing line
  // the island: a tall superstructure on the right side with bridge windows, radar and a funnel
  P.box(30, 12, 8, grey, -10, mainY + 6, 15); P.box(18, 8, 7, grey, -12, mainY + 16, 15); P.box(18.3, 1.4, 7.3, 0x1c2228, -12, mainY + 18.5, 15);
  P.box(8, 6, 6, dark, -22, mainY + 15, 15); P.cyl(0.4, 0.5, 14, dark, -10, mainY + 27, 15); P.box(6, 1.5, 0.3, dark, -10, mainY + 32, 15);
  // finer detail: catapult tracks at the bow, the aircraft lift outlines, deck edge nets, portholes, anchors, guns at the corners
  for (const v of [-6, 6]) P.box(70, 0.06, 0.3, 0x8a8e92, 70, mainY + 0.64, v);
  for (const [u, v] of [[-30, -12], [60, 12]]) { P.box(16, 0.06, 0.3, 0xf2d040, u, mainY + 0.64, v - 7); P.box(16, 0.06, 0.3, 0xf2d040, u, mainY + 0.64, v + 7); P.box(0.3, 0.06, 14, 0xf2d040, u - 8, mainY + 0.64, v); P.box(0.3, 0.06, 14, 0xf2d040, u + 8, mainY + 0.64, v); }
  for (let u = -105; u < 80; u += 6) for (const sd of [-1, 1]) P.box(6, 0.1, 2, 0x2a2e34, u, mainY + 0.3, sd * (B / 2 + 1), sd * 0.25, 0, 0);
  for (let u = -100; u < 80; u += 6) for (const sd of [-1, 1]) P.cyl(0.35, 0.35, 0.1, 0x1c2228, u, hangY + 2.4, sd * (s.halfW(u) + 0.02), Math.PI / 2, 0, 0, 1, 8);
  for (const sd of [-1, 1]) P.box(1.6, 2.2, 0.4, 0x2a2e34, 98, hangY + 2, sd * (s.halfW(98) + 0.2));
  for (const [u, v] of [[-100, -19], [-100, 19], [78, -19], [70, 19]]) { P.cyl(1.6, 1.8, 1.2, dark, u, mainY + 1, v, 0, 0, 0, 1, 10); P.box(0.3, 0.3, 4, 0x2a2e34, u, mainY + 2, v - 1.5 * Math.sign(v) * 0); }
  P.box(18.4, 0.3, 7.6, 0x2a2e34, -12, mainY + 20.2, 15);
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; m.receiveShadow = true; g.add(m);
  { const r = new THREE.Group(); r.position.set(-10, mainY + 34, 15); const RP = new Part(); RP.box(7, 2.6, 0.3, 0x3a3e44, 0, 0, 0); RP.box(0.4, 0.4, 1.2, 0x3a3e44, 0, -1.3, 0.5); r.add(new THREE.Mesh(RP.build(), VEH_MAT)); g.add(r); s.radar = r; }
  // jets parked on the flight deck and in the hangar
  for (const [u, v, h] of [[-80, -10, mainY], [-62, -10, mainY], [-44, -10, mainY], [-80, 4, mainY], [-62, 4, mainY], [30, 6, mainY], [-40, -4, hangY], [-10, 4, hangY], [20, -4, hangY], [50, 4, hangY]]) {
    if (typeof PLANE_KINDS === 'undefined') break;
    const j = PLANE_KINDS.f18.model(team); scene.remove(j.g); j.g.position.set(u, h + 1.6, v); j.g.rotation.y = Math.PI / 2; j.g.scale.setScalar(0.9); g.add(j.g);
  }
  const lamp = new THREE.MeshBasicMaterial({ color: 0xfff2c8 });   // lights along the hangar ceiling
  for (let u = -95; u < 85; u += 10) for (const v of [-8, 8]) { const l = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.5), lamp); l.position.set(u, mainY - 0.55, v); g.add(l); }
  // decks: the hangar inside (under the flight deck), a long ramp down to it (an aircraft lift), the island walls
  s.decks.push({ u0: -100, u1: 85, v0: -16, v1: 16, y: hangY, under: mainY - 0.5 });
  s.decks.push({ u0: 85, u1: 105, v0: -18, v1: -10, ramp: 'u', ya: hangY, yb: mainY });      // the ramp up at the stern... (u grows toward the bow)
  s.walls.push({ u0: -25, u1: 5, v0: 11, v1: 19, y0: mainY, y1: mainY + 20 });               // the island
  s.walls.push({ u0: -100, u1: 85, v0: 16, v1: 17, y0: hangY, y1: mainY - 0.4 });            // hangar side walls
  s.walls.push({ u0: -100, u1: 85, v0: -17, v1: -16, y0: hangY, y1: mainY - 0.4, door: { u0: 84, u1: 86, v0: -18, v1: -10 } });
  s.helm = { u: 6, v: 9, y: mainY };                                                            // the steering station by the island
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 6, 16), new THREE.MeshLambertMaterial({ color: 0x6b4a2a })); wheel.position.set(6, mainY + 1.2, 9); wheel.rotation.y = Math.PI / 2; g.add(wheel);
  addShipDeckRamps(s);
  SHIPS2.push(s); placeShip(s); return s;
}
// a boarding ramp from the water up to the main deck on the left side, so swimmers and boats can get aboard
function addShipDeckRamps(s) {
  const top = s.kind === 'carrier' ? 8 : s.mainY, u0 = -40, u1 = -10, v = -(s.halfW(-25)) - 6;
  s.decks.push({ u0, u1, v0: v - 3, v1: v + 3, ramp: 'u', ya: 0.4, yb: top });
  s.decks.push({ u0: u1, u1: u1 + 4, v0: v - 3, v1: -(s.halfW(-10)) + 1, y: top });
  const RP = new Part(); RP.box(u1 - u0, 0.3, 6, 0x5a5e62, 0, 0, 0); for (let i = 0; i < 12; i++) RP.box(0.2, 0.2, 6, 0x3a3e42, -(u1 - u0) / 2 + i * 2.5, 0.2, 0);
  const rm = new THREE.Mesh(RP.build(), VEH_MAT); const len = u1 - u0, ang = Math.atan2(top - 0.4, len);
  rm.position.set((u0 + u1) / 2, WATER_Y + (top + 0.4) / 2, v); rm.rotation.z = ang; rm.scale.x = Math.hypot(len, top) / len; s.g.add(rm);
  const landing = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, Math.abs(v - 3 + s.halfW(-10)) + 1), new THREE.MeshLambertMaterial({ color: 0x5a5e62 })); landing.position.set(u1 + 2, WATER_Y + top, (v - 3 - s.halfW(-10) + 1) / 2); s.g.add(landing);
}
function placeShip(s) { s.g.position.set(s.x, WATER_Y + Math.sin((typeof simTime !== 'undefined' ? simTime : 0) * 0.5 + s.x) * 0.15, s.z); s.g.rotation.set((s.lean || 0) + (s.waveRoll || 0), s.yaw + Math.PI / 2, s.wavePitch || 0, 'YXZ'); }   // the models are built along +x (u), so turn them to face their heading

// ---------- hooking into ground, walls and water ----------
function installShipHooks() {
  const _g = groundAt;
  groundAt = function (x, z, y) {
    const base = _g(x, z, y);
    if (!SHIPS2.length || y === undefined) return base;
    const h = shipUnder(x, z, y); return h ? Math.max(base, h.f) : base;
  };
  const _w = waterDepth;
  waterDepth = function (x, z) {
    for (const s of SHIPS2) { if (Math.abs(x - s.x) > s.L / 2 + 5 || Math.abs(z - s.z) > s.L / 2 + 5) continue; const { u, v } = shipLocal(s, x, z); if (inHull(s, u, v)) return 0; }
    return _w(x, z);
  };
  const _p = pushOut;
  pushOut = function (pos, r, feetY) {
    let floor = _p(pos, r, feetY);
    for (const s of SHIPS2) {
      if (Math.abs(pos.x - s.x) > s.L / 2 + 10 || Math.abs(pos.z - s.z) > s.L / 2 + 10) continue;
      let { u, v } = shipLocal(s, pos.x, pos.z), moved = false;
      const fy = feetY - WATER_Y;
      for (const w of s.walls) {
        if (fy >= w.y1 - 0.65 || fy + 1.7 < w.y0) continue;
        if (u < w.u0 - r || u > w.u1 + r || v < w.v0 - r || v > w.v1 + r) continue;
        if (w.door && u > w.door.u0 - 0.5 && u < w.door.u1 + 0.5 && v > w.door.v0 && v < w.door.v1) continue;
        const a = u - (w.u0 - r), b = (w.u1 + r) - u, c = v - (w.v0 - r), d = (w.v1 + r) - v, mn = Math.min(a, b, c, d);
        if (mn === a) u = w.u0 - r; else if (mn === b) u = w.u1 + r; else if (mn === c) v = w.v0 - r; else v = w.v1 + r; moved = true;
      }
      // railings: on a deck you don't fall off the side by accident (the boarding ramp side is open)
      if (fy > s.mainY - 1 && Math.abs(u) < s.L / 2 && Math.abs(v) > s.halfW(u) - r - 0.3 && !(u > -42 && u < -6 && v < 0)) { v = Math.sign(v) * (s.halfW(u) - r - 0.3); moved = true; }
      if (moved) { const wp = shipWorld(s, u, v); pos.x = wp.x; pos.z = wp.z; }
      const h = shipUnder(pos.x, pos.z, feetY); if (h) floor = Math.max(floor, h.f);
    }
    return floor;
  };
  const _fw = fireWeapon;
  fireWeapon = function () { if (player.ship) return; return _fw.apply(this, arguments); };   // in command, the click fires the ship's guns
}

// ---------- building them on the maps ----------
function buildShips() {
  SH.built = true;
  if (!NORMANDY && !WAKE) return;
  installShipHooks();
  if (NORMANDY) { buildBattleship(-420, 470, -Math.PI / 2, 'blue'); buildCarrier(410, 475, Math.PI / 2, 'blue'); }
  if (WAKE) buildBattleship(-410, 470, -Math.PI / 2, 'blue');
}
// ---------- moving, carrying, steering, firing ----------
function updateShips(dt) {
  updateSpray(dt);
  if (!SH.built) buildShips();
  if (!SHIPS2.length) return;
  const host = !net.active || net.isHost;
  for (const s of SHIPS2) {
    const captain = s.captain === player ? player : null;
    if (host) {
      let wantRudder = 0;
      if (captain) { s.throttle = clamp(s.throttle + ((keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0)) * dt * 0.5, -0.4, 1); if (keys.KeyX) s.throttle = 0; wantRudder = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0); }
      else if (!s.captain) s.throttle *= Math.exp(-dt * 0.3);
      s.rudder += clamp(wantRudder - s.rudder, -dt * 1.5, dt * 1.5);              // the rudder swings over smoothly, and centres when you let go
      s.speed += (s.throttle * 15 - s.speed) * dt * 0.22;                       // big ships still build speed gradually
      const turn = s.rudder * 0.11 * clamp(0.25 + Math.abs(s.speed) / 6, 0, 1) * Math.sign(s.speed || 1);
      s.lean = (s.lean || 0) + (-s.rudder * clamp(Math.abs(s.speed) / 15, 0, 1) * 0.035 - (s.lean || 0)) * Math.min(1, dt * 1.5);   // heel over a little in a hard turn
      const b = shipBasis(s), nx = s.x + b.fx * s.speed * dt, nz = s.z + b.fz * s.speed * dt, ny = s.yaw + turn * dt;
      // stay in deep water: check the bow, the stern and both sides at the new spot
      const t = { x: nx, z: nz, yaw: ny, L: s.L, halfW: s.halfW }; let ok = true;
      for (const [u, v] of [[s.L / 2, 0], [-s.L / 2, 0], [0, s.B / 2], [0, -s.B / 2], [s.L / 3, s.B / 2], [s.L / 3, -s.B / 2]]) { const p = shipWorld(t, u, v); if (Math.abs(p.x) > HALF + 120 || Math.abs(p.z) > HALF + 120) { ok = false; break; } if (Math.abs(p.x) < HALF && Math.abs(p.z) < HALF && heightAt(p.x, p.z) > WATER_Y - 4) { ok = false; break; } }
      if (!ok) { if (Math.abs(s.speed) > 2 && captain) showMessage('The ship is running aground!', 1); s.speed *= -0.2; }
      else moveShip(s, nx - s.x, nz - s.z, ny - s.yaw);
    }
    updateShipFx(s, dt);
    if (captain) {
      const hw = shipWorld(s, s.helm.u, s.helm.v); player.pos.set(hw.x, s.helm.y + WATER_Y, hw.z); player.velY = 0; player.onGround = true;
      shipCamera(s, dt);
      if (s.turrets.length) aimShipGuns(s, dt);
      updateShipHud(s);
    }
  }
  updateShipPrompt();
}
// three views at the wheel: C cycles a chase camera behind the ship, the bridge, and (battleship) the gun sight
const SHIP_VIEWS = ['chase', 'bridge', 'guns'];
function shipCamera(s, dt) {
  const view = s.kind === 'battleship' || SH.view !== 'guns' ? SH.view || 'chase' : 'chase';
  const dir = new THREE.Vector3(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch));
  let fov = SET.fov || 75;
  if (view === 'chase') {
    const dist = s.kind === 'carrier' ? 190 : 165, c = new THREE.Vector3(s.x, WATER_Y + s.mainY + 10, s.z);
    camera.position.copy(c).addScaledVector(dir, -dist); camera.position.y = Math.max(camera.position.y + 30, WATER_Y + 6);
  } else if (view === 'guns') {
    const t = s.turrets[1] || s.turrets[0], tw = shipWorld(s, t.u, 0);
    camera.position.set(tw.x, WATER_Y + s.mainY + 16, tw.z).addScaledVector(new THREE.Vector3(dir.x, 0, dir.z).normalize(), -26);
    fov = mouse.right ? 18 : 50;
  }
  if (view !== 'bridge') camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 10); camera.updateProjectionMatrix(); }
}
// a white wake behind the stern and foam at the bow that grow with speed; a radar that turns
function updateShipFx(s, dt) {
  if (!s.fx) {
    const foam = new THREE.MeshBasicMaterial({ color: 0xf4f8fa, transparent: true, opacity: 0, depthWrite: false });
    const wake = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), foam); wake.rotation.x = -Math.PI / 2; s.g.add(wake);
    const bow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), foam.clone()); bow.rotation.x = -Math.PI / 2; s.g.add(bow);
    s.fx = { wake, bow };
  }
  const k = clamp(Math.abs(s.speed) / 15, 0, 1);
  s.fx.wake.visible = s.fx.bow.visible = k > 0.03;
  if (k > 0.03) {
    const len = 30 + k * 160, w = s.B * (0.8 + k * 0.8);
    s.fx.wake.scale.set(len, w, 1); s.fx.wake.position.set(-s.L / 2 - len / 2 + 6, 0.15, 0); s.fx.wake.material.opacity = 0.18 + k * 0.32;
    s.fx.bow.scale.set(14, s.B * 0.5 + k * 10, 1); s.fx.bow.position.set(s.L / 2 - 4, 0.2, 0); s.fx.bow.material.opacity = k * 0.6;
  }
  if (s.radar) s.radar.rotation.y += dt * 1.5;
  // spray thrown up by the bow, foam churned along the sides and behind the propellers, and ripples spreading out
  if (k > 0.05) {
    const b = shipBasis(s), bowU = s.L / 2 - 6, rate = k * 90 * dt;
    for (const sd of [-1, 1]) for (let i = 0; i < rate; i++) {
      const u = bowU - rand(0, 14), v = sd * (s.halfW(u) + 0.6), p = shipWorld(s, u, v);
      emitSpray(p.x, WATER_Y + 0.4, p.z, b.rx * sd * rand(3, 5 + k * 8) + b.fx * s.speed * 0.3, rand(3, 5 + k * 9), b.rz * sd * rand(3, 5 + k * 8) + b.fz * s.speed * 0.3, rand(1.1, 2));
    }
    for (let i = 0; i < rate * 0.6; i++) { const p = shipWorld(s, -s.L / 2 + rand(0, 6), rand(-s.B / 3, s.B / 3)); emitSpray(p.x, WATER_Y + 0.3, p.z, rand(-1.5, 1.5) - b.fx * 2, rand(1, 3 + k * 3), rand(-1.5, 1.5) - b.fz * 2, rand(0.8, 1.4)); }
    s.ringT = (s.ringT || 0) - dt;
    if (s.ringT <= 0) { s.ringT = lerp(1.2, 0.35, k); for (const sd of [-1, 1]) { const p = shipWorld(s, bowU - 10, sd * (s.halfW(bowU - 10) + 3)); emitRipple(p.x, p.z, s.B * 0.6, 3 + k * 4); } }
  }
  // the hull rides the swell: a slow pitch and roll on top of any heel in a turn
  const t = typeof simTime !== 'undefined' ? simTime : 0;
  s.wavePitch = Math.sin(t * 0.45 + s.x * 0.01) * (0.006 + k * 0.006); s.waveRoll = Math.sin(t * 0.6 + s.z * 0.01) * 0.01;
  placeShip(s);
}
// a shared pool of spray droplets (white specks that fly up and fall back) and spreading ripple rings
const SPRAY = { n: 0, max: 1600, pos: null, vel: null, life: null, pts: null, rings: [] };
function emitSpray(x, y, z, vx, vy, vz, life) {
  if (!SPRAY.pts) {
    const g = new THREE.BufferGeometry(); SPRAY.pos = new Float32Array(SPRAY.max * 3); SPRAY.vel = new Float32Array(SPRAY.max * 3); SPRAY.life = new Float32Array(SPRAY.max);
    for (let i = 0; i < SPRAY.max; i++) SPRAY.pos[i * 3 + 1] = -999;
    g.setAttribute('position', new THREE.BufferAttribute(SPRAY.pos, 3));
    SPRAY.pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xf2f8fc, size: 0.55, transparent: true, opacity: 0.85, depthWrite: false }));
    SPRAY.pts.frustumCulled = false; scene.add(SPRAY.pts);
  }
  const i = SPRAY.n = (SPRAY.n + 1) % SPRAY.max;
  SPRAY.pos[i * 3] = x; SPRAY.pos[i * 3 + 1] = y; SPRAY.pos[i * 3 + 2] = z; SPRAY.vel[i * 3] = vx; SPRAY.vel[i * 3 + 1] = vy; SPRAY.vel[i * 3 + 2] = vz; SPRAY.life[i] = life;
}
function emitRipple(x, z, r0, grow) {
  if (SPRAY.rings.length > 40) return;
  const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, WATER_Y + 0.12, z); m.scale.setScalar(r0); scene.add(m); SPRAY.rings.push({ m, grow, t: 0 });
}
function updateSpray(dt) {
  if (SPRAY.pts) {
    const P = SPRAY.pos, V = SPRAY.vel, L = SPRAY.life;
    for (let i = 0; i < SPRAY.max; i++) {
      if (L[i] <= 0) continue;
      L[i] -= dt; V[i * 3 + 1] -= 9.8 * dt;
      P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
      if (P[i * 3 + 1] < WATER_Y || L[i] <= 0) { L[i] = 0; P[i * 3 + 1] = -999; }   // back into the sea
    }
    SPRAY.pts.geometry.attributes.position.needsUpdate = true;
  }
  for (let i = SPRAY.rings.length - 1; i >= 0; i--) {
    const r = SPRAY.rings[i]; r.t += dt; r.m.scale.multiplyScalar(1 + r.grow * dt / Math.max(4, r.m.scale.x)); r.m.material.opacity = Math.max(0, 0.35 - r.t * 0.12);
    if (r.t > 3) { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); SPRAY.rings.splice(i, 1); }
  }
}
// move the ship and everything standing on it (soldiers, players, vehicles, props)
function moveShip(s, dx, dz, dyaw) {
  if (!dx && !dz && !dyaw) return;
  const c = Math.cos(-dyaw), sn = Math.sin(-dyaw);
  const carry = (p) => { const rx = p.x - s.x, rz = p.z - s.z; p.x = s.x + rx * c - rz * sn + dx; p.z = s.z + rx * sn + rz * c + dz; };
  const onShip = (p, y) => { const { u, v } = shipLocal(s, p.x, p.z); return inHull(s, u, v, 0.5) && y > WATER_Y + 1; };
  for (const ch of chars) if (ch.alive && !ch.gv && !ch.vehicle && onShip(ch.pos, ch.pos.y) && ch !== s.captain) { carry(ch.pos); if (ch.isPlayer) player.yaw -= dyaw; else if (ch.heading !== undefined) ch.heading -= dyaw; }
  for (const v of gvehicles) if (v.alive && onShip(v.pos, v.pos.y)) { carry(v.pos); v.yaw -= dyaw; }
  s.x += dx; s.z += dz; s.yaw += dyaw; placeShip(s);
}
// turrets swing round to where you aim; click fires every turret that can bear
function aimShipGuns(s, dt) {
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  let hit = rayHit(camera.position, dir, 3000, player.team, {});
  if (dir.y < 0) { const tw = (camera.position.y - WATER_Y) / -dir.y; if (!hit || tw < hit.dist) hit = { dist: tw, point: camera.position.clone().addScaledVector(dir, tw) }; }   // shells splash on the sea, not the seabed
  const target = hit ? hit.point : camera.position.clone().addScaledVector(dir, 3000);
  if (!s.marker) { s.marker = new THREE.Mesh(new THREE.RingGeometry(9, 12, 32), new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false })); s.marker.rotation.x = -Math.PI / 2; s.marker.renderOrder = 5; scene.add(s.marker); }
  s.marker.visible = true; s.marker.position.set(target.x, Math.max(target.y, WATER_Y) + 0.4, target.z); s.marker.scale.setScalar(1 + target.distanceTo(camera.position) / 900);
  s.onTarget = 0;
  s.fireT -= dt;
  let fired = 0;
  for (const t of s.turrets) {
    const tw = shipWorld(s, t.u, 0), lx = target.x - tw.x, lz = target.z - tw.z;
    const want = wrapAngle(Math.atan2(-lx, -lz) - s.yaw);                       // the gun's heading relative to the ship
    const rel = wrapAngle(want - t.base);
    const canBear = Math.abs(rel) < 2.4;                                         // a turret can't fire through the ship's own superstructure
    if (canBear) t.yaw += clamp(wrapAngle(want - t.yaw), -0.9 * dt, 0.9 * dt);
    if (canBear && Math.abs(wrapAngle(want - t.yaw)) < 0.08) s.onTarget++;
    const dist = Math.hypot(lx, lz), wantP = clamp(Math.atan2(target.y - (s.mainY + 4.5 + WATER_Y), dist), -0.08, 0.6);
    t.p += clamp(wantP - t.p, -0.4 * dt, 0.4 * dt);
    t.g.rotation.y = t.yaw; t.pitch.rotation.x = t.p;   /* barrels lift with the aim */
    if (mouse.left && s.fireT <= 0 && canBear && Math.abs(wrapAngle(want - t.yaw)) < 0.08) {
      for (const vv of [-3.2, 0, 3.2]) {
        const m = new THREE.Vector3(vv, 0, -22).applyEuler(new THREE.Euler(t.p, 0, 0)).add(new THREE.Vector3(0, 4.5, -5.5)).applyEuler(new THREE.Euler(0, t.yaw, 0)).add(new THREE.Vector3(t.u, s.mainY, 0));
        const wp = new THREE.Vector3(m.z * 0, 0, 0); s.g.localToWorld(wp.set(m.x, m.y, m.z));
        const d = target.clone().sub(wp).normalize();
        spawnRocket(wp, d, player, { speed: 240, dmg: 520, radius: 16, shell: true });
        burst(wp, 12, 0xffc060, 8, 0.5, 0.15); smokePuff(wp.clone(), 0x9a9a9a, 3, 3, 1);
      }
      fired++;
    }
  }
  if (fired) { s.fireT = 3; playAt('boom', player.pos, 1.3); camShake = Math.max(camShake, 0.12); showMessage('FIRE! Main guns reloading...', 1.5); }
}
function updateShipHud(s) {
  let el = document.getElementById('shipHud');
  if (!el) { el = document.createElement('div'); el.id = 'shipHud'; el.className = 'hud'; el.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:rgba(0,0,0,.5);color:#fff;padding:8px 16px;border-radius:10px;font:600 13px system-ui,sans-serif;text-align:center;pointer-events:none'; document.body.appendChild(el); }
  el.style.display = 'block';
  const rud = Math.round(s.rudder * 100), view = s.kind === 'battleship' ? (SH.view || 'chase') : (SH.view === 'guns' ? 'chase' : SH.view || 'chase');
  const guns = s.turrets.length ? `<br>Guns: ${s.fireT > 0 ? `reloading ${s.fireT.toFixed(1)}s` : `<b style="color:#9be38a">READY</b>`} &nbsp; ${s.onTarget}/${s.turrets.length} turrets on target &nbsp; Click to fire${view === 'guns' ? ', right click to zoom' : ''}` : '';
  el.innerHTML = `<b>${s.name}</b> &nbsp; ${Math.round(Math.abs(s.speed) * 1.94)} knots &nbsp; Throttle ${Math.round(s.throttle * 100)}% &nbsp; Rudder ${rud > 0 ? 'left ' + rud : rud < 0 ? 'right ' + -rud : 'centre'}${guns}<br><span style="opacity:.8">W/S throttle, X stop &nbsp; A/D steer &nbsp; C change view (${view === 'chase' ? 'behind the ship' : view === 'bridge' ? 'bridge' : 'gun sight'}) &nbsp; E leave the wheel</span>`;
}
function updateShipPrompt() {
  let near = null;
  if (player.alive && !player.gv && !player.vehicle) for (const s of SHIPS2) { const hw = shipWorld(s, s.helm.u, s.helm.v); if (Math.hypot(player.pos.x - hw.x, player.pos.z - hw.z) < 3 && Math.abs(player.pos.y - (s.helm.y + WATER_Y)) < 2) near = s; }
  SH.near = near;
  let el = document.getElementById('shipPrompt');
  if (!el) { el = document.createElement('div'); el.id = 'shipPrompt'; el.className = 'hud'; el.style.cssText = 'position:fixed;left:50%;top:62%;transform:translateX(-50%);background:rgba(0,0,0,.55);color:#fff;padding:6px 14px;border-radius:8px;font:600 14px system-ui,sans-serif;pointer-events:none'; document.body.appendChild(el); }
  el.style.display = near && !player.ship ? 'block' : 'none';
  if (near) el.textContent = net.active && !net.isHost ? 'Only the host can steer ships online' : `Press E to take command of the ${near.name.toLowerCase()}`;
  const hud = document.getElementById('shipHud'); if (hud && !player.ship) hud.style.display = 'none';
}
addEventListener('keydown', e => {
  if (e.code === 'KeyC' && player.ship && !e.repeat) { const opts = player.ship.turrets.length ? SHIP_VIEWS : ['chase', 'bridge']; SH.view = opts[(opts.indexOf(SH.view || 'chase') + 1) % opts.length]; return; }
  if (e.code !== 'KeyE' || e.repeat || typeof started === 'undefined' || !started) return;
  if (player.ship) { if (player.ship.marker) player.ship.marker.visible = false; player.ship.captain = null; player.ship = null; if (camera.fov !== (SET.fov || 75)) { camera.fov = SET.fov || 75; camera.updateProjectionMatrix(); } showMessage('You left the wheel', 1.5); return; }
  if (SH.near && !(net.active && !net.isHost) && !SH.near.captain) { SH.near.captain = player; player.ship = SH.near; showMessage(`You have command of the ${SH.near.name.toLowerCase()}! W/S throttle, A/D steer`, 3); }
});
// online: the host sends where the ships are; everyone else moves theirs to match (carrying whoever is aboard)
function shipState() { return SHIPS2.map(s => [Math.round(s.x * 10), Math.round(s.z * 10), Math.round(s.yaw * 1000), s.turrets.map(t => Math.round(t.yaw * 100))]); }
function applyShipState(st) {
  if (!Array.isArray(st)) return;
  st.forEach((a, i) => { const s = SHIPS2[i]; if (!s || !a) return; moveShip(s, a[0] / 10 - s.x, a[1] / 10 - s.z, a[2] / 1000 - s.yaw); (a[3] || []).forEach((y, k) => { const t = s.turrets[k]; if (t) { t.yaw = y / 100; t.g.rotation.y = t.yaw; } }); });
}
