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
// the height of a ship's waterline: a submarine that has dived sits lower
function shipY(s) { return WATER_Y - (s.depth || 0); }
function inHull(s, u, v, pad = 0) { if (Math.abs(u) > s.L / 2 + pad) return false; return Math.abs(v) <= s.halfW(u) + pad; }
// the floor under (u, v) for feet at height fy: the highest deck you are standing on (or just stepping up onto)
function shipFloor(s, u, v, fy) {
  let best = -Infinity;
  for (const d of s.decks) {
    if (u < d.u0 || u > d.u1 || v < d.v0 || v > d.v1) continue;
    let y = d.y;
    if (d.ramp) { const t = clamp(((d.ramp === 'u' ? u : v) - (d.ramp === 'u' ? d.u0 : d.v0)) / ((d.ramp === 'u' ? d.u1 - d.u0 : d.v1 - d.v0) || 1), 0, 1); y = lerp(d.ya, d.yb, t); }
    y += shipY(s);
    if (y <= fy + 0.9 && y > best) best = y;
  }
  if (inHull(s, u, v) && s.mainY + shipY(s) <= fy + 0.9) best = Math.max(best, s.mainY + shipY(s));
  return best;
}
function shipUnder(x, z, fy) {   // the ship and floor height under a point, if any
  for (const s of SHIPS2) {
    if (Math.abs(x - s.x) > s.L / 2 + 30 || Math.abs(z - s.z) > s.L / 2 + 30) continue;
    if ((s.depth || 0) > 1.2) continue;   // a submarine's deck is under water once it dives: nobody stands on it
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
    s.turrets.push({ g: tg, pitch, u, base: fwd ? 0 : Math.PI, yaw: fwd ? 0 : Math.PI, p: 0, bar: [-3.2, 0, 3.2], piv: new THREE.Vector3(0, 4.5, -5.5), len: 22, dmg: 520, rad: 16, spd: 240 });
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
  addShipDeckRamps(s); battleshipExtras(s);
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
    const j = PLANE_KINDS[NORMANDY ? 'prop' : 'f18'].model(team);   // WWII propeller fighters on the Normandy carrier scene.remove(j.g); j.g.position.set(u, h + 1.6, v); j.g.rotation.y = Math.PI / 2; j.g.scale.setScalar(0.9); g.add(j.g);
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
  addShipDeckRamps(s); carrierExtras(s);
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
function placeShip(s) { s.g.position.set(s.x, shipY(s) + Math.sin((typeof simTime !== 'undefined' ? simTime : 0) * 0.5 + s.x) * 0.15 * Math.max(0, 1 - (s.depth || 0)), s.z); s.g.rotation.set((s.lean || 0) + (s.waveRoll || 0), s.yaw + Math.PI / 2, (s.divePitch || 0) + (s.wavePitch || 0), 'YXZ'); }   // the models are built along +x (u), so turn them to face their heading

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
      if ((s.depth || 0) > 1.2) continue;
      const fy = feetY - shipY(s);
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
  const _af = applyFx; applyFx = function (e, src) { if (e && e[1] === 'tp') { const s = SHIPS2[e[2]]; if (s) fireTorpedo(s, true); return; } return _af.apply(this, arguments); };
  const _fw = fireWeapon;
  fireWeapon = function () { if (player.ship) return; return _fw.apply(this, arguments); };   // in command, the click fires the ship's guns
}

// ---------- a destroyer: small, quick, with three twin gun turrets you can fire ----------
function shipTurret(s, u, fwd, y, size) {   // a turret whose barrels lift and that the captain fires (size 1: destroyer, 0.6: a deck gun)
  const tg = new THREE.Group(); tg.position.set(u, y, 0); s.g.add(tg);
  const TP = new Part(), grey = 0x737a82, dark = 0x4e545c, k = size;
  TP.cyl(2.1 * k, 2.3 * k, 0.8, dark, 0, 0.4, 0, 0, 0, 0, 1, 14); TP.box(3.8 * k, 2.2 * k, 4.8 * k, grey, 0, 0.8 + 1.1 * k, 0.5 * k); TP.box(3.9 * k, 0.2, 4.9 * k, dark, 0, 0.8 + 2.2 * k, 0.5 * k);
  TP.box(3.6 * k, 1.6 * k, 0.3, grey, 0, 0.8 + 1.0 * k, -1.95 * k, -0.35, 0, 0);   // the sloped gun-house face
  tg.add(new THREE.Mesh(TP.build(), VEH_MAT));
  const pitch = new THREE.Group(); pitch.position.set(0, 0.8 + 1.0 * k, -1.8 * k); tg.add(pitch);
  const bar = size >= 1 ? [-0.65, 0.65] : [0], len = 7.5 * k, BP = new Part();
  for (const vv of bar) { BP.cyl(0.17 * k + 0.05, 0.22 * k + 0.05, len, dark, vv, 0, -len / 2, Math.PI / 2, 0, 0, 1, 8); }
  pitch.add(new THREE.Mesh(BP.build(), VEH_MAT));
  tg.rotation.y = fwd ? 0 : Math.PI;
  s.turrets.push({ g: tg, pitch, u, base: fwd ? 0 : Math.PI, yaw: fwd ? 0 : Math.PI, p: 0, bar, piv: pitch.position.clone(), len, dmg: size >= 1 ? 170 : 110, rad: size >= 1 ? 7 : 5, spd: 200 });
  s.walls.push({ u0: u - 2.4 * k, u1: u + 2.4 * k, v0: -2.4 * k, v1: 2.4 * k, y0: y, y1: y + 0.8 + 2.2 * k });
}
function buildDestroyer(x, z, yaw, team, L = 100) {
  const B = 11, mainY = 5;
  const s = { kind: 'destroyer', name: 'Destroyer', team, x, z, yaw, L, B, mainY, speed: 0, throttle: 0, rudder: 0, decks: [], walls: [], turrets: [], fireT: 0, reload: 1.6, topSpeed: 22 };
  s.halfW = u => u > L * 0.15 ? lerp(B / 2, 0.9, Math.pow(clamp((u - L * 0.15) / (L * 0.35), 0, 1), 1.6)) : u < -L * 0.38 ? lerp(B / 2, B / 2 - 1.6, clamp((-u - L * 0.38) / (L * 0.12), 0, 1)) : B / 2;
  const g = new THREE.Group(); scene.add(g); s.g = g;
  const P = new Part(), grey = 0x737a82, dark = 0x4e545c, hullC = 0x6a7078, deckC = 0x5a5e62, navy = 0x3e4752;
  shipSlab(P, s, mainY, mainY + 3.4, hullC); shipSlab(P, s, -3.4, 1.4, 0x6a2a24, -0.05); shipSlab(P, s, mainY + 0.25, 0.25, deckC, 0.3);
  shipSlab(P, s, 2.2, 2.4, navy, -0.06);                                                          // dark band at the waterline
  for (const [u, w, a] of [[L * 0.3, 14, 0.4], [0, 12, -0.35], [-L * 0.3, 12, 0.3]]) for (const sd of [-1, 1]) P.box(w, 1.6, 0.08, navy, u, mainY - 2, sd * (s.halfW(u) + 0.06), 0, 0, a * sd);   // dazzle camouflage
  P.box(L * 0.42, 1.2, 0.3, hullC, L * 0.35, mainY + 0.6, 0);                                     // raised forecastle line
  // superstructure: deckhouse, bridge with windows, a director on top, a tripod mast, two raked funnels
  const su = L * 0.08;
  P.box(L * 0.24, 2.6, 6.4, grey, su - 3, mainY + 1.3, 0); P.box(9, 3, 5.6, grey, su + 2, mainY + 4.1, 0); P.box(9.2, 0.9, 5.8, 0x1c2228, su + 2, mainY + 4.9, 0);
  P.box(3.6, 1.8, 3.6, dark, su + 1, mainY + 6.5, 0); P.cyl(0.9, 0.9, 0.6, dark, su + 1, mainY + 7.7, 0, 0, 0, 0, 1, 10);
  for (const dv of [-1, 0, 1]) P.cyl(0.14, 0.2, 9, dark, su - 2.5 + (dv === 0 ? -1 : 0), mainY + 9.5, dv * 0.8, 0, 0, dv * 0.08, 1, 6); P.box(5, 0.2, 0.2, dark, su - 3, mainY + 12.5, 0);
  for (const fu of [su - 12, su - 21]) { P.cyl(1.3, 1.5, 6, grey, fu, mainY + 5, 0, 0, 0, 0.12, 1, 12); P.cyl(1.35, 1.35, 0.6, 0x1c1e22, fu - 0.35, mainY + 8, 0, 0, 0, 0.12, 1, 12); }
  // torpedo tubes amidships, depth charge racks at the stern, 40 mm guns, lifeboats, railings
  for (const tu of [su - 30, su - 38]) { P.cyl(1.2, 1.2, 0.6, dark, tu, mainY + 0.55, 0, 0, 0, 0, 1, 10); for (const o of [-0.9, -0.3, 0.3, 0.9]) P.cyl(0.24, 0.24, 6.5, dark, tu, mainY + 1.15, o, 0, 0, Math.PI / 2, 1, 8); }
  for (const sd of [-1, 1]) { P.box(5, 0.9, 0.9, dark, -L / 2 + 4, mainY + 0.7, sd * 2.4); for (let i = 0; i < 4; i++) P.cyl(0.35, 0.35, 0.7, 0x2a2e34, -L / 2 + 2.4 + i * 1.1, mainY + 1.5, sd * 2.4, 0, 0, 0, 1, 8); }
  for (const [u, v] of [[su - 26, -4], [su - 26, 4], [su + 9, -3.6], [su + 9, 3.6]]) shipBofors(P, u, v, mainY, grey, dark);
  for (const sd of [-1, 1]) { P.box(5, 1, 1.6, 0xd8d4c8, su - 16, mainY + 3.3, sd * 3.6); }
  for (let u = -L / 2 + 2; u < L / 2 - 4; u += 4) for (const sd of [-1, 1]) P.box(4, 0.08, 0.08, dark, u + 2, mainY + 1.15, sd * (s.halfW(u + 2) - 0.25));
  for (let u = -L / 2 + 6; u < L * 0.2; u += 4) for (const sd of [-1, 1]) P.cyl(0.28, 0.28, 0.1, 0x1c2228, u, mainY - 1.6, sd * (s.halfW(u) + 0.02), Math.PI / 2, 0, 0, 1, 8);   // portholes
  P.cyl(0.07, 0.07, 4, dark, L / 2 - 2, mainY + 2.5, 0); P.cyl(0.07, 0.07, 4, dark, -L / 2 + 1, mainY + 2.5, 0);
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; m.receiveShadow = true; g.add(m);
  shipTurret(s, L * 0.36, true, mainY, 1); shipTurret(s, L * 0.25, true, mainY + 1.2, 1); shipTurret(s, -L * 0.38, false, mainY, 1);
  s.walls.push({ u0: su - 3 - L * 0.12, u1: su - 3 + L * 0.12, v0: -3.2, v1: 3.2, y0: mainY, y1: mainY + 2.6 });
  s.walls.push({ u0: su - 2.5, u1: su + 6.5, v0: -2.8, v1: 2.8, y0: mainY + 2.6, y1: mainY + 5.6 });
  s.helm = { u: su - 3 - L * 0.12 - 1.5, v: 0, y: mainY };   // the wheel at the back of the deckhouse
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 6, 14), new THREE.MeshLambertMaterial({ color: 0x6b4a2a })); wheel.position.set(s.helm.u, mainY + 1.1, 0); wheel.rotation.y = Math.PI / 2; g.add(wheel);
  addShipDeckRamps(s);
  SHIPS2.push(s); placeShip(s); return s;
}
// ---------- a submarine: runs on the surface, fires torpedoes from its bow tubes and has a deck gun ----------
function buildSub(x, z, yaw, team) {
  const L = 76, B = 7.4, mainY = 2.3;
  const s = { kind: 'sub', name: 'Submarine', team, x, z, yaw, L, B, mainY, speed: 0, throttle: 0, rudder: 0, decks: [], walls: [], turrets: [], fireT: 0, reload: 1.2, topSpeed: 18, torpT: 0, torps: 4 };
  s.halfW = u => Math.max(0.6, 2.2 * Math.sqrt(Math.max(0, 1 - Math.pow(u / (L / 2), 2))));   // the narrow walking deck along the top
  const g = new THREE.Group(); scene.add(g); s.g = g;
  const P = new Part(), hullC = 0x3c4248, dark = 0x2a2e33, deckC = 0x4a4038, red = 0x5a2420;
  // the pressure hull: long and round, tapering to a point at both ends, sitting low in the water
  const prof = []; for (let i = 0; i <= 24; i++) { const t = i / 24, u = (t - 0.5) * L, r = B / 2 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t - 0.5) * 2, 2.6)), 0.55); prof.push(new THREE.Vector2(Math.max(0.05, r), u)); }
  const hull = new THREE.LatheGeometry(prof, 18); hull.rotateZ(-Math.PI / 2);
  P.add(hull, hullC, 0, -0.35, 0, 0, 0, 0, 1, 0.78, 1);
  P.add(new THREE.LatheGeometry(prof, 18).rotateZ(-Math.PI / 2), red, 0, -0.75, 0, 0, 0, 0, 0.995, 0.7, 0.995);   // red below the waterline
  shipSlab(P, s, mainY, 1.4, hullC); shipSlab(P, s, mainY + 0.08, 0.08, deckC, 0.25);   // the deck casing follows the hull's taper, wooden slats on top
  for (let u = -L * 0.42; u < L * 0.42; u += 1.2) P.box(0.08, 0.02, s.halfW(u) * 2 - 0.6, 0x3a3028, u, mainY + 0.1, 0);
  for (const sd of [-1, 1]) for (let i = 0; i < 14; i++) { const u = -L * 0.35 + i * 3.4; P.box(0.9, 0.25, 0.06, 0x1c1e22, u, mainY - 0.6, sd * (s.halfW(u) + 0.01)); }   // flood holes along the casing
  // the conning tower: a streamlined fin with a bridge, periscopes, a radio mast and a gun platform behind
  const tu = 6, TP = [[-5, 0], [-3.5, 1.9], [3, 1.9], [6.5, 0.8], [7.4, 0], [6.5, -0.8], [3, -1.9], [-3.5, -1.9]];
  const sh = new THREE.Shape(); TP.forEach(([a, b], i) => i ? sh.lineTo(a, b) : sh.moveTo(a, b)); sh.closePath();
  P.add(new THREE.ExtrudeGeometry(sh, { depth: 4.2, bevelEnabled: false }), 0x4a5058, tu, mainY + 4.2, 0, Math.PI / 2, 0, 0);
  P.box(10.4, 0.12, 3.6, 0x2a2e33, tu + 0.8, mainY + 4.26, 0);                                   // bridge floor
  for (const sd of [-1, 1]) P.box(9, 1.1, 0.12, hullC, tu + 1, mainY + 4.8, sd * 1.85);           // bridge screen
  P.box(1.1, 1.1, 2.6, 0x1c2228, tu + 6.2, mainY + 4.8, 0, 0, 0, -0.4);
  P.cyl(0.16, 0.2, 5.5, dark, tu + 2.5, mainY + 7, 0.3, 0, 0, 0, 1, 8); P.cyl(0.12, 0.16, 4.5, dark, tu + 1.2, mainY + 6.6, -0.3, 0, 0, 0, 1, 8); P.box(0.4, 0.5, 0.3, dark, tu + 2.5, mainY + 9.8, 0.3);   // periscopes
  P.cyl(0.07, 0.07, 5, dark, tu - 1, mainY + 6.6, 0); P.box(0.1, 0.1, 2.4, dark, tu - 1, mainY + 8.6, 0);   // radio mast
  P.box(5, 0.12, 3.4, 0x2a2e33, tu - 6.5, mainY + 2.6, 0); P.cyl(0.08, 0.08, 1, dark, tu - 7.5, mainY + 3.1, 1.6); P.cyl(0.08, 0.08, 1, dark, tu - 7.5, mainY + 3.1, -1.6);   // the gun platform ("winter garden")
  P.cyl(0.35, 0.4, 0.9, dark, tu - 7, mainY + 3.1, 0, 0, 0, 0, 1, 8); for (const o of [-0.25, 0.25]) P.cyl(0.06, 0.06, 2, dark, tu - 7, mainY + 3.6, o, Math.PI / 2 - 0.5, 0, 0, 1, 6);
  // jumping wires, hydroplanes, rudder, propellers, bow tubes, a painted number
  for (const [u0, u1, y0, y1] of [[tu + 7, L / 2 - 2, mainY + 4.2, mainY + 0.3], [tu - 5, -L / 2 + 3, mainY + 4, mainY + 0.3]]) { const len = Math.hypot(u1 - u0, y1 - y0); P.cyl(0.03, 0.03, len, dark, (u0 + u1) / 2, (y0 + y1) / 2, 0, 0, 0, Math.atan2(y1 - y0, u1 - u0) - Math.PI / 2, 1, 4); }
  for (const sd of [-1, 1]) { P.box(2.4, 0.12, 1.6, dark, L / 2 - 8, -0.4, sd * 2.8); P.box(2.4, 0.12, 1.6, dark, -L / 2 + 6, -1.2, sd * 2.4); }
  P.box(3, 2.6, 0.12, dark, -L / 2 + 2, -1.2, 0); for (const sd of [-1, 1]) { P.cyl(0.5, 0.2, 0.5, 0x8a6a3a, -L / 2 + 3.2, -1.8, sd * 1.3, 0, 0, Math.PI / 2, 1, 8); }
  for (const sd of [-1, 1]) for (const o of [-0.7, 0.7]) P.cyl(0.32, 0.32, 0.1, 0x101214, L / 2 - 4, -0.9 + o, sd * 1.1, Math.PI / 2, 0, 0, 1, 10);
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; m.receiveShadow = true; g.add(m);
  shipTurret(s, tu + 13, true, mainY, 0.6);                                                       // the deck gun in front of the tower
  const peri = new THREE.Group(), PP = new Part(); PP.cyl(0.13, 0.13, 1, 0x2a2e33, 0, 0.5, 0, 0, 0, 0, 1, 8); peri.add(new THREE.Mesh(PP.build(), VEH_MAT));
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.35), new THREE.MeshLambertMaterial({ color: 0x2a2e33 })); peri.add(head);
  peri.position.set(tu + 2.5, mainY + 4.2, 0.3); g.add(peri); s.peri = { g: peri, head, u: tu + 2.5 };
  s.walls.push({ u0: tu - 5, u1: tu + 7.4, v0: -1.9, v1: 1.9, y0: mainY, y1: mainY + 4.2 });
  s.helm = { u: tu - 7, v: 0, y: mainY };                                                         // steer from the deck aft of the tower
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 14), new THREE.MeshLambertMaterial({ color: 0x6b4a2a })); wheel.position.set(s.helm.u, mainY + 1.0, 0); wheel.rotation.y = Math.PI / 2; g.add(wheel);
  SHIPS2.push(s); placeShip(s); return s;
}
// torpedoes: run straight just under the surface, leave a trail of bubbles, and blow up on the first hull, boat or shore they meet
const TORPS = [];
function fireTorpedo(s, ghost) {
  const b = shipBasis(s);
  for (const sd of [-1, 1]) {
    const p = shipWorld(s, s.L / 2 + 1, sd * 1.1), mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 6, 8), new THREE.MeshLambertMaterial({ color: 0x2a2e33 }));
    mesh.rotation.order = 'YXZ'; mesh.rotation.set(Math.PI / 2, s.yaw, 0); scene.add(mesh);
    TORPS.push({ x: p.x, z: p.z, y: Math.min(WATER_Y - 0.5, shipY(s) - 0.5), fx: b.fx, fz: b.fz, sp: 0, life: 16, src: s, mesh, ghost, owner: player, goal: !ghost && SH.view === 'periscope' ? player.yaw : null, age: 0 });
  }
  if (!ghost && typeof netFx === 'function' && net.active) netFx(['tp', SHIPS2.indexOf(s)]);
  playAt('thump', player.pos, 0.9);
}
function updateTorpedoes(dt) {
  for (let i = TORPS.length - 1; i >= 0; i--) {
    const t = TORPS[i]; t.sp = Math.min(30, t.sp + dt * 20); t.life -= dt; t.age += dt;
    if (t.goal !== null && t.goal !== undefined && t.age > 0.5) {   // the gyro turns it onto the bearing set in the periscope
      const cur = Math.atan2(-t.fx, -t.fz); let d = t.goal - cur; d = Math.atan2(Math.sin(d), Math.cos(d));
      const a = cur + clamp(d, -dt * 1.2, dt * 1.2); t.fx = -Math.sin(a); t.fz = -Math.cos(a); t.mesh.rotation.y = a;
    }
    t.x += t.fx * t.sp * dt; t.z += t.fz * t.sp * dt; t.y += (WATER_Y - 0.6 - t.y) * Math.min(1, dt * 0.8); t.mesh.position.set(t.x, t.y, t.z);
    if (Math.random() < 0.7) emitSpray(t.x - t.fx * 3, WATER_Y + 0.1, t.z - t.fz * 3, rand(-0.3, 0.3), rand(0.4, 1.2), rand(-0.3, 0.3), 1.6);   // the bubble trail
    let hit = t.life <= 0 ? 'fizzle' : null;
    if (!hit && heightAt(t.x, t.z) > WATER_Y - 1.2 && !SHIPS2.some(q => q !== t.src && inHull(q, ...Object.values(shipLocal(q, t.x, t.z))))) hit = 'shore';
    for (const q of SHIPS2) { if (hit || q === t.src) continue; const l = shipLocal(q, t.x, t.z); if (inHull(q, l.u, l.v, 1.2)) { hit = q; } }
    for (const v of gvehicles) { if (hit || !v.alive || !v.T.boat) continue; if (Math.hypot(v.pos.x - t.x, v.pos.z - t.z) < 4) hit = 'boat'; }
    if (!hit) continue;
    scene.remove(t.mesh); t.mesh.geometry.dispose(); TORPS.splice(i, 1);
    if (hit === 'fizzle') continue;
    const p = new THREE.Vector3(t.x, WATER_Y + 0.5, t.z);
    for (let k = 0; k < 60; k++) emitSpray(t.x + rand(-2, 2), WATER_Y + 0.5, t.z + rand(-2, 2), rand(-3, 3), rand(10, 26), rand(-3, 3), 2.6);   // a tall column of water
    if (!t.ghost) explosion(p, 11, 40, t.owner, 380);
    else { playAt('boom', p, 1.2); fxExplosion(p, 9); }
    if (hit && hit.kind && !t.ghost) shipHit(hit, t.owner);
  }
}
// a big ship hit by torpedoes lists, slows and smokes; three hits leave it dead in the water for a minute
function shipHit(s, by) {
  s.dmg = (s.dmg || 0) + (s.kind === 'battleship' || s.kind === 'carrier' ? 1 : 1.6);
  s.smokeT = 999;
  if (by === player) showMessage(s.dmg >= 3 ? `The ${s.name.toLowerCase()} is dead in the water!` : `Torpedo hit on the ${s.name.toLowerCase()}!`, 2.5);
  if (s.dmg >= 3) { s.disabledT = 60; s.throttle = 0; }
}
// ---------- building them on the maps ----------
function buildShips() {
  SH.built = true;
  if (!NORMANDY && !WAKE && !PACIFIC) return;
  installShipHooks();
  if (NORMANDY) { buildBattleship(-420, 470, -Math.PI / 2, 'blue'); buildCarrier(410, 475, Math.PI / 2, 'blue'); buildDestroyer(330, 410, -Math.PI / 2, 'blue', 96); buildSub(-420, 512, -Math.PI / 2, 'blue'); buildSub(-330, 522, -Math.PI / 2, 'blue'); buildSub(470, 515, Math.PI / 2, 'blue'); }
  if (PACIFIC) {   // a fleet for each side, offshore from its home island
    buildCarrier(330, 470, Math.PI / 2, 'blue'); buildBattleship(-330, 468, -Math.PI / 2, 'blue'); buildDestroyer(-200, 518, -Math.PI / 2, 'blue', 96); buildDestroyer(200, 520, Math.PI / 2, 'blue', 92);
    buildSub(-460, 360, -Math.PI / 2, 'blue'); buildSub(57, 337, Math.PI / 2, 'blue');   // the second sub tied up off the end of the pier
    buildCarrier(-330, -470, -Math.PI / 2, 'red'); buildBattleship(330, -468, Math.PI / 2, 'red'); buildDestroyer(200, -518, Math.PI / 2, 'red', 96); buildDestroyer(-200, -520, -Math.PI / 2, 'red', 92);
    buildSub(95, -301, 0, 'red'); buildSub(-460, -350, -Math.PI / 2, 'red');
  }
  if (WAKE) { buildBattleship(-410, 470, -Math.PI / 2, 'blue'); buildDestroyer(-215, 425, -Math.PI / 2, 'blue', 92); buildDestroyer(225, 515, -Math.PI / 2, 'blue', 104); buildDestroyer(345, 420, -Math.PI / 2, 'blue', 84); buildSub(-60, 515, -Math.PI / 2, 'blue'); buildSub(-230, 480, -Math.PI / 2, 'blue'); buildSub(140, 395, Math.PI / 2, 'blue'); buildSub(40, -440, Math.PI / 2, 'red'); }
}

// ---------- finer, more true-to-life detail on the warships (looks only: decks, walls and hulls are unchanged) ----------
function shipGun5(P, u, v, y, facing, grey, dark) {   // a twin 5-inch gun turret
  P.box(3.6, 1.9, 4.2, grey, u, y + 0.95, v); P.box(3.7, 0.25, 4.3, dark, u, y + 1.95, v);
  for (const o of [-0.7, 0.7]) P.cyl(0.18, 0.2, 4.2, dark, u + o, y + 1.1, v + facing * 3.9, Math.PI / 2, 0, 0, 1, 8);
}
function shipBofors(P, u, v, y, grey, dark) {   // a quad 40 mm anti-aircraft mount in its round tub
  P.cyl(1.5, 1.6, 1.0, grey, u, y + 0.5, v, 0, 0, 0, 1, 12); P.box(1.4, 0.8, 1.2, dark, u, y + 1.2, v);
  for (const o of [-0.45, -0.15, 0.15, 0.45]) P.cyl(0.07, 0.07, 2.2, dark, u + o, y + 1.6, v + (v > 0 ? 1 : -1) * 1.0, Math.PI / 2 - 0.5 * (v > 0 ? 1 : -1), 0, 0, 1, 6);
}
function shipFloatplane(P, u, v, y, col) {   // a little scout seaplane on the stern catapult
  P.box(1.0, 0.04, 22, 0x4a4e54, u, y + 0.6, v, 0, Math.PI / 2, 0);   // catapult rail (across the stern)
  P.cyl(0.45, 0.35, 6.5, col, u, y + 1.6, v, 0, 0, Math.PI / 2, 1, 10); P.box(1.6, 0.12, 10, col, u - 0.6, y + 2.1, v); P.box(1.2, 1.2, 0.1, col, u + 3, y + 2.1, v);
  P.box(4.6, 0.5, 0.7, 0xb0b4b8, u - 0.3, y + 0.6, v); for (const sd of [-1, 1]) P.box(0.5, 0.3, 0.4, 0xb0b4b8, u - 0.6, y + 1.6, v + sd * 4.6);
  P.cyl(0.25, 0.25, 0.2, 0x2a2a2a, u - 3.3, y + 1.6, v, 0, 0, Math.PI / 2, 1, 8);
}
function battleshipExtras(s) {
  const P = new Part(), grey = 0x7a8088, dark = 0x4e545c, navy = 0x3e4752, mY = s.mainY;
  shipSlab(P, s, 3.6, 3.4, navy, -0.06);                                              // dark camouflage band along the waterline
  for (const [u, w, a] of [[60, 14, 0.35], [10, 18, -0.3], [-40, 16, 0.25]]) for (const sd of [-1, 1]) P.box(w, 2.2, 0.08, navy, u, mY - 3.2, sd * (s.halfW(u) + 0.06), 0, 0, a * sd);   // dazzle slashes
  // the tripod foremast with the main gun director on top
  for (const [du, dv] of [[0, 0], [-3, -2.2], [-3, 2.2]]) { const len = 14; P.cyl(0.35, 0.45, len, dark, -2 + du * 0.5, mY + 21 + len / 2 - 2, dv * 0.5, du * 0.02, 0, dv * 0.02, 1, 8); }
  P.box(5, 2.6, 4, dark, -2, mY + 33.5, 0); P.box(9, 0.8, 0.8, dark, -2, mY + 35.3, 0);
  // twin 5-inch turrets on the first superstructure level, quad 40 mm mounts round the deck
  for (const v of [-9, 9]) for (const u of [-24, -10, 4]) shipGun5(P, u, v, mY + 6, v > 0 ? 1 : -1, grey, dark);
  for (const [u, v] of [[34, -11], [34, 11], [-44, -11], [-44, 11], [-70, -10], [-70, 10], [62, -9], [62, 9]]) shipBofors(P, u, v, mY, grey, dark);
  shipFloatplane(P, -84, 0, mY, 0x8a9298);
  P.cyl(0.08, 0.08, 6, dark, 92, mY + 3, 0); P.box(0.05, 1.4, 2.2, 0xd8d8d8, 92, mY + 5.6, 1.1);   // jack staff at the bow
  P.cyl(0.08, 0.08, 7, dark, -94, mY + 3.5, 0);
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; s.g.add(m);
}
function carrierExtras(s) {
  const P = new Part(), grey = 0x737a82, dark = 0x4e545c, mY = s.mainY;
  if (NORMANDY) { shipSlab(P, s, mY + 0.66, 0.05, 0x8a7556, 0.4); for (let u = -108; u < 108; u += 1.6) P.box(0.05, 0.02, s.halfW(u) * 2 - 1.2, 0x6e5c40, u, mY + 0.7, 0); }   // a WWII wooden flight deck
  shipSlab(P, s, 3.0, 3.2, 0x3e4752, 2.95);                                                // dark band at the waterline
  // a tripod mast with a radar dish, guns fore and aft of the island, and 40 mm mounts on sponsons along the sides
  for (const dv of [-1.6, 1.6]) P.cyl(0.3, 0.4, 16, dark, -10 + (dv > 0 ? 1 : -1) * 0.6, mY + 28, 15 + dv * 0.4, 0, 0, dv * 0.04, 1, 8);
  P.add(new THREE.SphereGeometry(1.8, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.35), 0x5a6068, -10, mY + 37, 15, -1.2, 0, 0);
  shipGun5(P, 12, 15, mY, 1, grey, dark); shipGun5(P, -34, 15, mY, 1, grey, dark);
  for (let u = -96; u < 78; u += 22) for (const sd of [-1, 1]) { const v = sd * (s.halfW(u) + 2.6); P.box(5, 0.4, 4, grey, u, mY - 1.6, v); shipBofors(P, u, v, mY - 1.4, grey, dark); }
  // the island in more detail: a band of bridge windows, an open bridge wing, a raked funnel with a black cap, AA tubs on its roof, a crane
  for (let i = 0; i < 9; i++) P.box(1.2, 0.8, 0.05, 0x1c2228, -19 + i * 1.9, mY + 15.5, 11.45);
  P.box(6, 0.3, 4, grey, 1, mY + 12, 12.5); for (const sd of [-1, 1]) P.box(6, 0.8, 0.1, dark, 1, mY + 12.5, 12.5 + sd * 2);
  P.cyl(2.6, 3.0, 7, grey, -24, mY + 21, 15, 0, 0, 0.14, 1, 14); P.cyl(2.65, 2.65, 1, 0x1a1c20, -24.5, mY + 24.8, 15, 0, 0, 0.14, 1, 14);
  for (const u of [-2, -20]) shipBofors(P, u, 15, mY + 12, grey, dark);
  P.cyl(0.25, 0.3, 9, dark, 10, mY + 4.5, 17.5, 0, 0, 0, 1, 8); P.box(9, 0.35, 0.35, dark, 6, mY + 9, 17.5, 0, 0, -0.35);   // the deck crane
  for (const sd of [-1, 1]) { P.box(0.08, 2.4, 1.4, 0xd8d8d8, -60 + sd * 40, mY + 0.8, -18.6); }   // flight deck numbers' backing boards
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; s.g.add(m);
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
      const big = s.kind === 'battleship' || s.kind === 'carrier';
      if (s.disabledT > 0) { s.disabledT -= dt; s.throttle = 0; if (s.disabledT <= 0) { s.dmg = 0; s.smokeT = 0; if (captain) showMessage('Repairs done: engines back on line', 2); } }
      s.speed += (s.throttle * (s.topSpeed || 15) - s.speed) * dt * (big ? 0.22 : 0.45);   // big ships build speed gradually; destroyers and the sub pick up quicker
      const turn = s.rudder * (big ? 0.11 : 0.24) * clamp(0.25 + Math.abs(s.speed) / 6, 0, 1) * Math.sign(s.speed || 1);
      s.lean = (s.lean || 0) + (-s.rudder * clamp(Math.abs(s.speed) / 15, 0, 1) * 0.035 - (s.lean || 0)) * Math.min(1, dt * 1.5);   // heel over a little in a hard turn
      const b = shipBasis(s), nx = s.x + b.fx * s.speed * dt, nz = s.z + b.fz * s.speed * dt, ny = s.yaw + turn * dt;
      // stay in deep water: check the bow, the stern and both sides at the new spot
      const t = { x: nx, z: nz, yaw: ny, L: s.L, halfW: s.halfW }; let ok = true;
      for (const [u, v] of [[s.L / 2, 0], [-s.L / 2, 0], [0, s.B / 2], [0, -s.B / 2], [s.L / 3, s.B / 2], [s.L / 3, -s.B / 2]]) { const p = shipWorld(t, u, v); if (Math.abs(p.x) > HALF + 120 || Math.abs(p.z) > HALF + 120) { ok = false; break; } if (Math.abs(p.x) < HALF && Math.abs(p.z) < HALF && heightAt(p.x, p.z) > WATER_Y - 4) { ok = false; break; } }
      if (!ok) { if (Math.abs(s.speed) > 2 && captain) showMessage('The ship is running aground!', 1); s.speed *= -0.2; }
      else moveShip(s, nx - s.x, nz - s.z, ny - s.yaw);
    }
    updateShipFx(s, dt);
    if (s.dmg > 0 && Math.random() < dt * (2 + s.dmg * 2)) { const p = shipWorld(s, rand(-s.L / 4, s.L / 4), 0); smokePuff(new THREE.Vector3(p.x, WATER_Y + s.mainY + 2, p.z), 0x3a3a3a, 3 + s.dmg, 5, 4); }   // smoke from a damaged ship
    if (s.kind === 'sub') {
      s.torpT = (s.torpT || 0) - dt; if (captain && keys.Space && s.torpT <= 0) { s.torpT = 4; fireTorpedo(s); showMessage('Torpedoes away!', 1.2); }
      // diving: Q to go down, Z to come up. How deep it can go depends on the water under it
      const floor = Math.min(...[[s.L / 2, 0], [0, 0], [-s.L / 2, 0]].map(([u, v]) => { const p = shipWorld(s, u, v); return WATER_Y - heightAt(p.x, p.z); }));
      const maxD = clamp(floor - 4.5, 0, 16);   // keep a few metres between the keel and the sea bed
      if (captain) { if (keys.KeyQ) s.wantDepth = Math.min(maxD, (s.wantDepth || 0) + dt * 3); if (keys.KeyZ) s.wantDepth = Math.max(0, (s.wantDepth || 0) - dt * 4); }
      s.wantDepth = Math.min(s.wantDepth || 0, maxD);
      const was = s.depth || 0; s.depth = was + clamp((s.wantDepth || 0) - was, -dt * 2.4, dt * 1.8);
      if (s.depth > 0.3 && Math.random() < dt * 8) { const p = shipWorld(s, rand(-s.L / 3, s.L / 3), rand(-2, 2)); emitSpray(p.x, WATER_Y + 0.1, p.z, rand(-0.4, 0.4), rand(0.6, 1.6), rand(-0.4, 0.4), 1.2); }   // air bubbles breaking the surface
      if (was < 1.2 && s.depth >= 1.2) { for (const c of chars) if (c !== s.captain && c.alive && !c.gv && !c.vehicle) { const l = shipLocal(s, c.pos.x, c.pos.z); if (inHull(s, l.u, l.v, 0.5) && c.pos.y > WATER_Y) c.velY = 0; } if (captain) showMessage('Diving! Anyone on deck is in the water now', 2); }
      if (captain && was > 1.2 && s.depth <= 1.2) showMessage('Surfaced', 1.2);
      if (s.peri) {   // the periscope: run up to just above the waves when the boat is under, down when it surfaces
        const base = shipY(s) + s.mainY + 4.2, want = s.depth > 2.5 ? clamp(WATER_Y + 1.6 - base, 0.4, 10) : 0.4, P = s.peri;
        P.len = lerp(P.len || 0.4, want, Math.min(1, dt * 2)); P.g.children[0].scale.y = P.len; P.head.position.y = P.len + 0.2;
        P.up = s.depth > 2.5 && base + P.len > WATER_Y + 0.5;
        if (P.up && Math.abs(s.speed) > 1 && Math.random() < dt * 10) { const p = shipWorld(s, P.u, 0.3); emitSpray(p.x, WATER_Y + 0.1, p.z, rand(-0.5, 0.5), rand(0.5, 1.4), rand(-0.5, 0.5), 1); }   // the feather of spray a periscope leaves
      }
      s.divePitch = lerp(s.divePitch || 0, clamp(((s.wantDepth || 0) - s.depth) * 0.04, -0.07, 0.07), Math.min(1, dt * 2));   // nose down as it dives, up as it rises
    }
    if (captain) {
      const hw = shipWorld(s, s.helm.u, s.helm.v); player.pos.set(hw.x, s.helm.y + shipY(s), hw.z); player.velY = 0; player.onGround = true;
      if (player.body3p && player.body3p.root) player.body3p.root.visible = !((s.depth || 0) > 1);   // inside the hull once it dives
      shipCamera(s, dt);
      if (s.turrets.length) aimShipGuns(s, dt);
      updateShipHud(s);
    }
  }
  updateShipPrompt();
  if (TORPS.length) updateTorpedoes(dt);
}
// three views at the wheel: C cycles a chase camera behind the ship, the bridge, and (battleship) the gun sight
const SHIP_VIEWS = ['chase', 'bridge', 'guns'];
// the periscope eyepiece: a round view with a crosshair and the bearing, black around the edge
function zPeriscopeOverlay(on, s, flooded) {
  let el = document.getElementById('periView');
  if (!el) {
    if (!on) return;
    el = document.createElement('div'); el.id = 'periView';
    el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:6;background:radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0, rgba(0,0,0,0) 36vmin, rgba(0,20,30,0.55) 40vmin, #000 41vmin);font:600 15px system-ui,sans-serif;color:#cfe;';
    el.innerHTML = '<div style="position:absolute;left:50%;top:50%;width:62vmin;height:1px;margin-left:-31vmin;background:rgba(200,240,230,0.55)"></div><div style="position:absolute;left:50%;top:50%;width:1px;height:62vmin;margin-top:-31vmin;background:rgba(200,240,230,0.55)"></div>' +
      '<div id="periTicks" style="position:absolute;left:50%;top:50%;width:62vmin;margin-left:-31vmin;margin-top:-10px;display:flex;justify-content:space-between;opacity:0.7">' + '<span>|</span>'.repeat(9) + '</div>' +
      '<div id="periBear" style="position:absolute;left:0;right:0;bottom:7vh;text-align:center;text-shadow:0 1px 2px #000"></div>';
    document.body.appendChild(el);
  }
  el.style.display = on ? 'block' : 'none';
  if (!on) return;
  const brg = Math.round(((-player.yaw * 180 / Math.PI) % 360 + 360) % 360);
  document.getElementById('periBear').innerHTML = flooded ? 'Too deep to see: rise to periscope depth (Z)' : `Bearing ${String(brg).padStart(3, '0')}° &nbsp;·&nbsp; right mouse to zoom &nbsp;·&nbsp; Space: torpedoes run to this bearing`;
  el.style.background = flooded ? '#02141c' : 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0, rgba(0,0,0,0) 36vmin, rgba(0,20,30,0.55) 40vmin, #000 41vmin)';
}
function shipCamera(s, dt) {
  const view = s.turrets.length || SH.view !== 'guns' ? SH.view || 'chase' : 'chase';
  const dir = new THREE.Vector3(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch));
  let fov = SET.fov || 75;
  if (view === 'chase') {
    const dist = s.kind === 'carrier' ? 190 : s.kind === 'battleship' ? 165 : s.L * 1.1 + 20, c = new THREE.Vector3(s.x, WATER_Y + s.mainY + (s.L > 120 ? 10 : 4), s.z);
    camera.position.copy(c).addScaledVector(dir, -dist); camera.position.y = Math.max(camera.position.y + (s.L > 120 ? 30 : 14), WATER_Y + 6);
  } else if (view === 'periscope' && s.peri) {
    const p = shipWorld(s, s.peri.u, 0.3), top = shipY(s) + s.mainY + 4.2 + (s.peri.len || 0.4) + 0.3;
    camera.position.set(p.x, Math.max(top, WATER_Y + 0.9), p.z);
    fov = mouse.right ? 14 : 40;
    zPeriscopeOverlay(true, s, top < WATER_Y + 0.4);
  } else if (view === 'guns') {
    const t = s.turrets[1] || s.turrets[0], tw = shipWorld(s, t.u, 0);
    camera.position.set(tw.x, WATER_Y + s.mainY + (s.L > 120 ? 16 : 7), tw.z).addScaledVector(new THREE.Vector3(dir.x, 0, dir.z).normalize(), s.L > 120 ? -26 : -12);
    fov = mouse.right ? 18 : 50;
  }
  if (view !== 'periscope') zPeriscopeOverlay(false);
  if (view !== 'bridge') camera.rotation.set(view === 'periscope' ? clamp(player.pitch, -0.15, 0.25) : player.pitch, player.yaw, 0, 'YXZ');
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
  const onShip = (p, y) => { const { u, v } = shipLocal(s, p.x, p.z); return (s.depth || 0) < 1.2 && inHull(s, u, v, 0.5) && y > shipY(s) + 1; };
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
    const dist = Math.hypot(lx, lz), wantP = clamp(Math.atan2(target.y - (s.mainY + t.piv.y + shipY(s)), dist), -0.08, 0.6);
    t.p += clamp(wantP - t.p, -0.4 * dt, 0.4 * dt);
    t.g.rotation.y = t.yaw; t.pitch.rotation.x = t.p;   /* barrels lift with the aim */
    if (mouse.left && s.fireT <= 0 && canBear && Math.abs(wrapAngle(want - t.yaw)) < 0.08) {
      for (const vv of t.bar) {
        const m = new THREE.Vector3(vv, 0, -t.len).applyEuler(new THREE.Euler(t.p, 0, 0)).add(t.piv).applyEuler(new THREE.Euler(0, t.yaw, 0)).add(new THREE.Vector3(t.u, s.mainY, 0));
        const wp = new THREE.Vector3(m.z * 0, 0, 0); s.g.localToWorld(wp.set(m.x, m.y, m.z));
        const d = target.clone().sub(wp).normalize();
        spawnRocket(wp, d, player, { speed: t.spd, dmg: t.dmg, radius: t.rad, shell: true });
        burst(wp, t.len > 12 ? 12 : 6, 0xffc060, 8, t.len > 12 ? 0.5 : 0.3, 0.15); smokePuff(wp.clone(), 0x9a9a9a, t.len > 12 ? 3 : 1.4, 3, 1);
      }
      fired++;
    }
  }
  if (fired) { s.fireT = s.reload || 3; playAt('boom', player.pos, s.kind === 'battleship' ? 1.3 : 0.9); camShake = Math.max(camShake, s.kind === 'battleship' ? 0.12 : 0.05); if (s.kind === 'battleship') showMessage('FIRE! Main guns reloading...', 1.5); }
}
function updateShipHud(s) {
  let el = document.getElementById('shipHud');
  if (!el) { el = document.createElement('div'); el.id = 'shipHud'; el.className = 'hud'; el.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:rgba(0,0,0,.5);color:#fff;padding:8px 16px;border-radius:10px;font:600 13px system-ui,sans-serif;text-align:center;pointer-events:none'; document.body.appendChild(el); }
  el.style.display = 'block';
  const rud = Math.round(s.rudder * 100), view = s.turrets.length ? (SH.view || 'chase') : (SH.view === 'guns' ? 'chase' : SH.view || 'chase');
  const torp = s.kind === 'sub' ? `<br>Depth: ${(s.depth || 0) < 0.5 ? 'surfaced' : Math.round(s.depth) + ' m' + (s.depth > 1.2 ? ' (submerged)' : '')} &nbsp; Q dive, Z rise<br>Torpedoes: ${s.torpT > 0 ? `reloading ${s.torpT.toFixed(1)}s` : '<b style="color:#9be38a">READY</b>'} &nbsp; Space to fire &nbsp; C: periscope view` : '';
  const dmgTxt = s.disabledT > 0 ? `<br><b style="color:#ff8a7a">Dead in the water: repairs ${Math.ceil(s.disabledT)}s</b>` : s.dmg > 0 ? '<br><b style="color:#ffb060">Damaged</b>' : '';
  const guns = s.turrets.length ? `<br>Guns: ${s.fireT > 0 ? `reloading ${s.fireT.toFixed(1)}s` : `<b style="color:#9be38a">READY</b>`} &nbsp; ${s.onTarget}/${s.turrets.length} turrets on target &nbsp; Click to fire${view === 'guns' ? ', right click to zoom' : ''}` : '';
  el.innerHTML = `<b>${s.name}</b> &nbsp; ${Math.round(Math.abs(s.speed) * 1.94)} knots &nbsp; Throttle ${Math.round(s.throttle * 100)}% &nbsp; Rudder ${rud > 0 ? 'left ' + rud : rud < 0 ? 'right ' + -rud : 'centre'}${guns}${torp}${dmgTxt}<br><span style="opacity:.8">W/S throttle, X stop &nbsp; A/D steer &nbsp; C change view (${view === 'chase' ? 'behind the ship' : view === 'bridge' ? 'bridge' : 'gun sight'}) &nbsp; E leave the wheel</span>`;
}
function updateShipPrompt() {
  let near = null;
  if (player.alive && !player.gv && !player.vehicle) for (const s of SHIPS2) { const hw = shipWorld(s, s.helm.u, s.helm.v); if (Math.hypot(player.pos.x - hw.x, player.pos.z - hw.z) < 3 && Math.abs(player.pos.y - (s.helm.y + WATER_Y)) < 2) near = s; }
  SH.near = near;
  // swimming (or standing on a pier) beside a hull, below its deck: you can climb the ladder up to the wheel
  let climb = null;
  if (!near && !player.ship && player.alive && !player.gv && !player.vehicle) for (const s of SHIPS2) {
    if ((s.depth || 0) > 1.2) continue;
    const l = shipLocal(s, player.pos.x, player.pos.z); if (inHull(s, l.u, l.v, 3.5) && player.pos.y < WATER_Y + s.mainY - 0.15) { climb = s; break; }
  }
  SH.climb = climb;
  let el = document.getElementById('shipPrompt');
  if (!el) { el = document.createElement('div'); el.id = 'shipPrompt'; el.className = 'hud'; el.style.cssText = 'position:fixed;left:50%;top:62%;transform:translateX(-50%);background:rgba(0,0,0,.55);color:#fff;padding:6px 14px;border-radius:8px;font:600 14px system-ui,sans-serif;pointer-events:none'; document.body.appendChild(el); }
  el.style.display = (near || climb) && !player.ship ? 'block' : 'none';
  if (climb) el.textContent = `Press E to climb aboard the ${climb.name.toLowerCase()}`;
  if (near) el.textContent = net.active && !net.isHost ? 'Only the host can steer ships online' : `Press E to take command of the ${near.name.toLowerCase()}`;
  const hud = document.getElementById('shipHud'); if (hud && !player.ship) { hud.style.display = 'none'; zPeriscopeOverlay(false); }
}
addEventListener('keydown', e => {
  if (e.code === 'KeyC' && player.ship && !e.repeat) { const opts = player.ship.kind === 'sub' ? ['chase', 'periscope', 'guns'] : player.ship.turrets.length ? SHIP_VIEWS : ['chase', 'bridge']; SH.view = opts[(opts.indexOf(SH.view || 'chase') + 1) % opts.length]; return; }
  if (e.code !== 'KeyE' || e.repeat || typeof started === 'undefined' || !started) return;
  if (player.ship) { if (player.ship.marker) player.ship.marker.visible = false; player.ship.captain = null; player.ship = null; if (camera.fov !== (SET.fov || 75)) { camera.fov = SET.fov || 75; camera.updateProjectionMatrix(); } showMessage('You left the wheel', 1.5); return; }
  if (!SH.near && SH.climb) {   // up the ladder and straight to the wheel
    const c = SH.climb, hw = shipWorld(c, c.helm.u, c.helm.v); player.pos.set(hw.x, c.helm.y + WATER_Y + 0.1, hw.z); player.velY = 0;
    SH.climb = null; showMessage(`You climbed aboard the ${c.name.toLowerCase()}. Press E at the wheel to take command`, 3); return;
  }
  if (SH.near && !(net.active && !net.isHost) && !SH.near.captain) { SH.near.captain = player; player.ship = SH.near; showMessage(`You have command of the ${SH.near.name.toLowerCase()}! W/S throttle, A/D steer`, 3); }
});
// online: the host sends where the ships are; everyone else moves theirs to match (carrying whoever is aboard)
function shipState() { return SHIPS2.map(s => [Math.round(s.x * 10), Math.round(s.z * 10), Math.round(s.yaw * 1000), s.turrets.map(t => Math.round(t.yaw * 100)), Math.round((s.depth || 0) * 10)]); }
function applyShipState(st) {
  if (!Array.isArray(st)) return;
  st.forEach((a, i) => { const s = SHIPS2[i]; if (!s || !a) return; moveShip(s, a[0] / 10 - s.x, a[1] / 10 - s.z, a[2] / 1000 - s.yaw); (a[3] || []).forEach((y, k) => { const t = s.turrets[k]; if (t) { t.yaw = y / 100; t.g.rotation.y = t.yaw; } }); if (a[4] !== undefined) { s.depth = a[4] / 10; placeShip(s); } });
}
