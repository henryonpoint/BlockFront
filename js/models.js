// ===================== models.js : detailed soldiers (kneecaps, elbows, armour) and their weapons =====================
// Each body part is ONE mesh built from many coloured shapes, so a soldier with far more detail than
// before still takes fewer draw calls. Arms use two-bone IK so both hands really hold the gun.
const SOLDIER_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
const TEAM_LOOK = {
  blue: { uni: 0x3d5275, uni2: 0x2c3b55, armor: 0x2a62d0, armorD: 0x1c459a, accent: 0x7db4ff },
  red: { uni: 0x75443d, uni2: 0x55302c, armor: 0xcc3232, armorD: 0x962222, accent: 0xff8a7a },
  green: { uni: 0x3f5a3a, uni2: 0x2d4229, armor: 0x2f9a4a, armorD: 0x1f6e33, accent: 0x8ff0a8 },
  yellow: { uni: 0x6b5a32, uni2: 0x4e4124, armor: 0xd4a52a, armorD: 0x9a771c, accent: 0xffe58a },
};
if (typeof AFGHAN !== 'undefined' && AFGHAN) {   // Desert Combat: US troops in desert tan, the Iraqi army in olive green
  Object.assign(TEAM_LOOK.blue, { uni: 0xb8a27a, uni2: 0x9a855e, armor: 0xa88e62, armorD: 0x7e6a48, accent: 0x7db4ff });
  Object.assign(TEAM_LOOK.red, { uni: 0x5c6240, uni2: 0x474c31, armor: 0x50563a, armorD: 0x3c412a, accent: 0xff8a7a });
}
// WWII maps: US Army olive drab with M1 helmets and khaki webbing; German army field grey with steel helmets,
// black leather belts and jackboots. A small coloured armband still shows the team at a glance.
const WW2S = typeof GERMANY !== 'undefined' && (GERMANY || NORMANDY);
const TEAM_LOOK_WW2 = {
  blue: { uni: 0x6e6846, uni2: 0x5c5638, armor: 0x4d5531, armorD: 0x3c4326, accent: 0x5b8ad8, web: 0x9a8a5c, boot: 0x5a3c26 },
  red: { uni: 0x69705f, uni2: 0x5a6052, armor: 0x4c524c, armorD: 0x3a3f3a, accent: 0xc8463c, web: 0x1c1b19, boot: 0x141312 },
};
const GEARC = { olive: 0x4f5536, tan: 0x9a8560, dark: 0x1d1c1a, steel: 0x6a7078, gun: 0x25272b, gun2: 0x3a3d43, wood: 0x7a4a24, lens: 0x58c8ff, red: 0xff4a3a };

// ---- tiny geometry merger ----
const _mmx = new THREE.Matrix4(), _mqt = new THREE.Quaternion(), _meu = new THREE.Euler(), _mcl = new THREE.Color();
function Part() { this.pos = []; this.nor = []; this.col = []; }
Part.prototype.add = function (geo, color, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  _mmx.compose(new THREE.Vector3(x, y, z), _mqt.setFromEuler(_meu.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  g.applyMatrix4(_mmx);
  const p = g.attributes.position.array, n = g.attributes.normal.array; _mcl.setHex(color);
  for (let i = 0; i < p.length; i += 3) { this.pos.push(p[i], p[i + 1], p[i + 2]); this.nor.push(n[i], n[i + 1], n[i + 2]); this.col.push(_mcl.r, _mcl.g, _mcl.b); }
  g.dispose(); return this;
};
Part.prototype.box = function (w, h, d, color, x, y, z, rx, ry, rz) { return this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz); };
// cylinder along Y (r1 = top radius, r2 = bottom radius); sz squashes it front to back
Part.prototype.cyl = function (r1, r2, len, color, x, y, z, rx = 0, ry = 0, rz = 0, sz = 1, seg = 8) { return this.add(new THREE.CylinderGeometry(r1, r2, len, seg), color, x, y, z, rx, ry, rz, 1, 1, sz); };
Part.prototype.ball = function (r, color, x, y, z, sx = 1, sy = 1, sz = 1) { return this.add(new THREE.SphereGeometry(r, 8, 6), color, x, y, z, 0, 0, 0, sx, sy, sz); };
Part.prototype.dome = function (r, color, x, y, z, sx = 1, sy = 1, sz = 1) { return this.add(new THREE.SphereGeometry(r, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), color, x, y, z, 0, 0, 0, sx, sy, sz); };
Part.prototype.build = function () {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
  g.computeBoundingSphere(); return g;
};
const partCache = {};
function cached(key, make) { return partCache[key] || (partCache[key] = make().build()); }

// ---- body parts ----
function geoTorso(T, role, v) {
  const p = new Part(), heavy = role === 'rocket';
  p.box(0.5, 0.2, 0.3, T.uni2, 0, 1.02, 0);                                  // hips
  p.cyl(0.3, 0.27, 0.32, T.uni, 0, 1.27, 0, 0, 0, 0, 0.62);                   // waist
  p.cyl(0.37, 0.3, 0.4, T.uni, 0, 1.6, 0, 0, 0, 0, 0.6);                      // chest
  p.cyl(0.1, 0.11, 0.1, T.uni2, 0, 1.84, 0);                                 // collar
  p.box(0.54, 0.07, 0.33, GEARC.dark, 0, 1.12, 0);                           // belt
  p.box(0.07, 0.07, 0.035, GEARC.steel, 0, 1.12, 0.17);                      // buckle
  // plate carrier front and back, shoulder straps
  p.box(0.5, 0.46, 0.1, T.armor, 0, 1.52, 0.2); p.box(0.44, 0.1, 0.1, T.armorD, 0, 1.3, 0.21);
  p.box(0.5, 0.48, 0.09, T.armorD, 0, 1.52, -0.2);
  for (const s of [-1, 1]) { p.box(0.1, 0.06, 0.46, T.armorD, 0.19 * s, 1.79, 0); p.box(0.05, 0.3, 0.3, T.armorD, 0.3 * s, 1.42, 0); }
  p.box(0.2, 0.08, 0.02, T.accent, -0.1, 1.68, 0.255);                       // name tape
  p.box(0.05, 0.22, 0.04, GEARC.dark, 0.2, 1.42, 0.3, 0, 0, 0.5); p.box(0.03, 0.08, 0.045, GEARC.steel, 0.25, 1.5, 0.3, 0, 0, 0.5);   // chest knife
  p.box(0.26, 0.26, 0.02, T.accent, 0, 1.56, -0.25); p.box(0.14, 0.14, 0.025, T.armor, 0, 1.56, -0.252);   // back emblem
  for (const [x, y, z, w] of [[-0.22, 1.27, 0.16, 0.16], [0.2, 1.24, -0.15, 0.2], [-0.3, 1.62, -0.02, 0.12], [0.31, 1.3, 0.06, 0.12]]) p.box(w, 0.12, 0.06, T.uni2, x, y, z);   // camo patches
  for (const s of [-1, 1]) p.ball(0.045, GEARC.olive, 0.08 * s + 0.2, 1.22, 0.22);   // grenades on the belt
  // magazine pouches, radio, grenade
  for (const x of [-0.16, 0, 0.16]) { p.box(0.13, 0.2, 0.07, GEARC.olive, x, 1.38, 0.275); p.box(0.13, 0.03, 0.075, GEARC.dark, x, 1.47, 0.277); }
  p.box(0.09, 0.16, 0.06, GEARC.dark, 0.2, 1.64, 0.26); p.cyl(0.008, 0.008, 0.3, GEARC.dark, 0.23, 1.85, 0.24);
  p.ball(0.055, GEARC.olive, -0.27, 1.2, 0.14, 1, 1.25, 1);
  for (const s of [-1, 1]) p.box(0.1, 0.16, 0.14, GEARC.olive, 0.3 * s, 1.13, -0.03);   // hip pouches
  // backpack
  if (role === 'sniper') { p.box(0.34, 0.36, 0.14, GEARC.olive, 0, 1.5, -0.3); p.cyl(0.07, 0.07, 0.4, GEARC.tan, 0, 1.72, -0.31, 0, 0, Math.PI / 2); }
  else {
    p.box(0.42, heavy ? 0.56 : 0.46, 0.2, GEARC.olive, 0, 1.5, -0.33); p.box(0.3, 0.2, 0.08, GEARC.tan, 0, 1.42, -0.46);
    p.cyl(0.085, 0.085, 0.46, T.uni2, 0, heavy ? 1.84 : 1.78, -0.34, 0, 0, Math.PI / 2);
    if (v === 1) p.cyl(0.007, 0.007, 0.6, GEARC.dark, -0.16, 2.0, -0.4);       // long antenna
    if (heavy) for (const s of [-1, 1]) p.cyl(0.05, 0.05, 0.5, GEARC.olive, 0.13 * s, 1.55, -0.47, 0.1);   // spare rockets
  }
  return p;
}
function geoHead(T, role, v, skin) {
  const p = new Part(), S = parseInt(skin.slice(1), 16);
  p.cyl(0.085, 0.095, 0.1, S, 0, 0.03, 0);                                    // neck
  p.add(new THREE.SphereGeometry(0.21, 12, 9), S, 0, 0.25, 0, 0, 0, 0, 0.95, 1.1, 1.02);   // head
  p.box(0.05, 0.055, 0.06, S, 0, 0.225, 0.21);                                   // nose
  for (const s of [-1, 1]) { p.box(0.06, 0.034, 0.02, 0xf4f4f4, 0.078 * s, 0.285, 0.197); p.box(0.03, 0.034, 0.022, 0x1b1410, 0.072 * s, 0.285, 0.201); p.box(0.075, 0.018, 0.024, 0x2a1d14, 0.078 * s, 0.322, 0.198); }
  if (v === 1 || role === 'sniper') { p.cyl(0.2, 0.17, 0.2, role === 'sniper' ? GEARC.olive : GEARC.dark, 0, 0.14, 0.01, 0, 0, 0, 1.05); }   // face wrap
  else p.box(0.09, 0.016, 0.02, 0x6b3a2a, 0, 0.155, 0.2);                    // mouth
  if (role === 'sniper') {
    // boonie hat with a scrim
    p.cyl(0.36, 0.38, 0.03, GEARC.olive, 0, 0.4, 0, 0.06); p.cyl(0.2, 0.23, 0.15, GEARC.olive, 0, 0.47, 0); p.cyl(0.235, 0.235, 0.03, T.accent, 0, 0.42, 0);
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 2.2; p.box(0.07, 0.2, 0.02, i % 2 ? GEARC.tan : GEARC.olive, Math.sin(a) * 0.27, 0.3, Math.cos(a) * 0.27, 0.2, a, 0); }
  } else {
    p.dome(0.255, T.armor, 0, 0.3, -0.01, 1, 0.92, 1.1);                        // helmet shell
    p.box(0.46, 0.17, 0.26, T.armor, 0, 0.225, -0.13); p.box(0.4, 0.06, 0.2, T.armorD, 0, 0.12, -0.14);   // back of the helmet and neck guard
    p.cyl(0.258, 0.258, 0.035, T.accent, 0, 0.345, -0.01, 0, 0, 0, 1.1, 10);     // team band
    p.box(0.3, 0.05, 0.14, T.armorD, 0, 0.31, 0.24, -0.25);                     // brim
    for (const s of [-1, 1]) { p.box(0.05, 0.16, 0.15, T.armorD, 0.235 * s, 0.24, -0.02); p.cyl(0.06, 0.06, 0.05, GEARC.dark, 0.25 * s, 0.24, 0, 0, 0, Math.PI / 2); }   // ear cups
    p.box(0.06, 0.05, 0.05, GEARC.dark, 0, 0.47, 0.22);                         // NVG mount
    p.box(0.03, 0.03, 0.3, GEARC.dark, 0, 0.54, -0.02);                         // top rail
    p.cyl(0.008, 0.008, 0.16, GEARC.dark, 0.17, 0.2, 0.14, 0.9); p.box(0.03, 0.03, 0.03, GEARC.dark, 0.13, 0.15, 0.2);   // mic boom
    if (v === 2 || role === 'rocket') { p.box(0.34, 0.1, 0.06, GEARC.dark, 0, 0.3, 0.19); p.box(0.14, 0.075, 0.02, GEARC.lens, -0.08, 0.3, 0.222); p.box(0.14, 0.075, 0.02, GEARC.lens, 0.08, 0.3, 0.222); }   // goggles down
    else { p.box(0.3, 0.07, 0.05, GEARC.dark, 0, 0.44, 0.2, -0.5); p.box(0.26, 0.05, 0.02, GEARC.lens, 0, 0.445, 0.225, -0.5); }   // goggles up on the helmet
    p.box(0.02, 0.2, 0.02, GEARC.dark, 0.19, 0.16, 0.08, 0, 0, 0.25); p.box(0.02, 0.2, 0.02, GEARC.dark, -0.19, 0.16, 0.08, 0, 0, -0.25);   // chin straps
  }
  return p;
}
function geoThigh(T, side) {
  const p = new Part();
  p.cyl(0.185, 0.145, 0.5, T.uni2, 0, -0.23, 0); p.box(0.14, 0.12, 0.05, T.uni, 0.02 * side, -0.36, 0.14); p.box(0.12, 0.1, 0.05, T.uni, -0.05 * side, -0.12, -0.15);   // thigh with camo patches
  p.box(0.17, 0.2, 0.1, T.uni2, 0.13 * side, -0.2, 0);                        // cargo pocket
  if (side > 0) { p.box(0.08, 0.2, 0.13, GEARC.dark, 0.2, -0.22, 0.02); p.box(0.05, 0.1, 0.05, GEARC.gun2, 0.21, -0.1, -0.03); }   // holster and pistol grip
  else p.box(0.07, 0.15, 0.12, GEARC.olive, -0.2, -0.24, 0.02);              // drop pouch
  return p;
}
function geoShin(T) {
  const p = new Part();
  p.box(0.22, 0.17, 0.1, T.armorD, 0, 0.0, 0.12); p.box(0.17, 0.06, 0.11, T.accent, 0, 0.0, 0.13);   // knee pad
  p.cyl(0.145, 0.12, 0.38, T.uni2, 0, -0.2, 0);
  p.cyl(0.13, 0.135, 0.16, GEARC.dark, 0, -0.38, 0);                          // boot shaft
  p.box(0.24, 0.13, 0.4, GEARC.dark, 0, -0.44, 0.07); p.box(0.25, 0.04, 0.42, 0x0f0e0d, 0, -0.485, 0.07);   // boot and sole
  return p;
}
function geoUpperArm(T, side) {
  const p = new Part();
  p.ball(0.135, T.armor, 0.02 * side, -0.02, 0, 1, 0.8, 1.1);                  // shoulder guard
  p.cyl(0.125, 0.105, 0.38, T.uni, 0, -0.19, 0);
  p.cyl(0.125, 0.125, 0.06, T.accent, 0, -0.2, 0);                           // team armband
  return p;
}
function geoForearm(T) {
  const p = new Part();
  p.box(0.17, 0.14, 0.17, T.armorD, 0, -0.01, -0.02);                         // elbow pad
  p.cyl(0.1, 0.082, 0.36, T.uni, 0, -0.2, 0);
  p.cyl(0.086, 0.086, 0.05, GEARC.dark, 0, -0.37, 0);                        // glove cuff
  p.box(0.12, 0.14, 0.13, GEARC.dark, 0, -0.44, 0); p.box(0.12, 0.035, 0.135, GEARC.steel, 0, -0.41, 0.005);   // glove, knuckle guard
  return p;
}
// guns point along +Z with +Y up; (0,0,0) is the shoulder pocket
function geoGun(role) {
  const p = new Part(), G = GEARC, R = Math.PI / 2;
  if (role === 'rocket') {
    p.cyl(0.07, 0.07, 1.15, G.olive, 0, 0.1, 0.25, R); p.cyl(0.075, 0.075, 0.3, G.wood, 0, 0.1, 0.3, R);
    p.cyl(0.11, 0.07, 0.16, G.olive, 0, 0.1, -0.38, R);                       // rear flare
    p.cyl(0.085, 0.07, 0.14, G.olive, 0, 0.1, 0.87, R); p.add(new THREE.ConeGeometry(0.1, 0.26, 8), G.gun2, 0, 0.1, 1.07, R);   // warhead
    p.box(0.04, 0.13, 0.05, G.dark, 0, -0.03, 0.3, 0.2); p.box(0.04, 0.12, 0.05, G.dark, 0, -0.03, 0.55);
    p.box(0.035, 0.07, 0.12, G.dark, -0.085, 0.17, 0.42);                     // optic
  } else if (role === 'sniper') {
    p.box(0.055, 0.09, 0.34, G.gun, 0, 0, 0.32); p.box(0.05, 0.11, 0.3, G.olive, 0, -0.02, 0.06); p.box(0.05, 0.03, 0.14, G.olive, 0, 0.05, 0.07);
    p.box(0.055, 0.06, 0.34, G.olive, 0, -0.01, 0.62);
    p.cyl(0.016, 0.014, 0.62, G.gun2, 0, 0.012, 1.05, R); p.box(0.045, 0.045, 0.1, G.gun, 0, 0.012, 1.38);   // barrel and brake
    p.cyl(0.032, 0.032, 0.3, G.gun, 0, 0.1, 0.36, R); p.cyl(0.042, 0.036, 0.07, G.gun, 0, 0.1, 0.54, R); p.cyl(0.036, 0.036, 0.012, G.lens, 0, 0.1, 0.58, R);
    p.cyl(0.015, 0.015, 0.05, G.gun, 0, 0.14, 0.36); p.box(0.03, 0.03, 0.03, G.gun, 0, 0.06, 0.28); p.box(0.03, 0.03, 0.03, G.gun, 0, 0.06, 0.44);
    p.box(0.04, 0.12, 0.05, G.dark, 0, -0.09, 0.3, 0.25); p.box(0.04, 0.1, 0.07, G.gun, 0, -0.08, 0.42);
    for (const s of [-1, 1]) p.cyl(0.008, 0.008, 0.26, G.gun, 0.03 * s, -0.05, 0.74, R);   // folded bipod
    p.ball(0.018, G.steel, 0.05, 0.02, 0.26);
  } else {
    p.box(0.055, 0.075, 0.3, G.gun, 0, 0, 0.32);                              // receiver
    p.box(0.06, 0.06, 0.28, G.tan, 0, 0.005, 0.6);                            // handguard
    p.box(0.03, 0.014, 0.5, G.dark, 0, 0.046, 0.5);                           // top rail
    p.cyl(0.013, 0.013, 0.16, G.gun2, 0, 0.005, 0.82, R); p.cyl(0.02, 0.02, 0.06, G.gun, 0, 0.005, 0.92, R);   // barrel, flash hider
    p.cyl(0.017, 0.017, 0.2, G.gun2, 0, 0, 0.1, R); p.box(0.045, 0.1, 0.15, G.gun, 0, -0.015, 0.04); p.box(0.047, 0.12, 0.02, G.dark, 0, -0.02, -0.04);   // stock
    p.box(0.04, 0.12, 0.05, G.dark, 0, -0.09, 0.26, 0.3);                     // grip
    p.box(0.038, 0.17, 0.065, G.gun2, 0, -0.11, 0.4, -0.2);                   // magazine
    p.box(0.032, 0.09, 0.032, G.dark, 0, -0.07, 0.62);                        // foregrip
    p.box(0.04, 0.02, 0.07, G.dark, 0, 0.06, 0.36); for (const s of [-1, 1]) p.box(0.008, 0.05, 0.06, G.dark, 0.022 * s, 0.09, 0.36); p.box(0.05, 0.008, 0.06, G.dark, 0, 0.115, 0.36);   // red dot sight
    p.box(0.008, 0.008, 0.008, G.red, 0, 0.09, 0.36);
    p.box(0.012, 0.03, 0.012, G.dark, 0, 0.06, 0.72);
  }
  return p;
}
const GUN_HOLD = {   // where the hands grip and where the muzzle is, in gun space
  rifle: { grip: [0, -0.1, 0.27], fore: [0, -0.08, 0.62], muzzle: [0, 0.005, 0.96] },
  sniper: { grip: [0, -0.1, 0.3], fore: [0, -0.06, 0.66], muzzle: [0, 0.012, 1.44] },
  rocket: { grip: [0, -0.07, 0.3], fore: [0, -0.07, 0.55], muzzle: [0, 0.1, 1.2] },
};
const ARM_L1 = 0.38, ARM_L2 = 0.46, SHOULDER_X = 0.4, SHOULDER_Y = 1.74;

function makeCharacter(team, role) {
  if (WW2S && TEAM_LOOK_WW2[team]) return makeCharacterWW2(team, role);
  const T = TEAM_LOOK[team], skin = pick(SKINS), v = Math.floor(Math.random() * 3), key = team + role;
  const mesh = (geo, parent, shadow) => { const m = new THREE.Mesh(geo, SOLDIER_MAT); m.castShadow = !!shadow; parent.add(m); return m; };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  mesh(cached('torso' + key + v, () => geoTorso(T, role, v)), body, true);
  const legL = new THREE.Group(), legR = new THREE.Group(), shinL = new THREE.Group(), shinR = new THREE.Group();
  legL.position.set(-0.17, 0.97, 0); legR.position.set(0.17, 0.97, 0); body.add(legL, legR);
  mesh(cached('thighL' + team, () => geoThigh(T, -1)), legL, true); mesh(cached('thighR' + team, () => geoThigh(T, 1)), legR, true);
  shinL.position.y = shinR.position.y = -0.47; legL.add(shinL); legR.add(shinR);
  mesh(cached('shin' + team, () => geoShin(T)), shinL, true); mesh(cached('shin' + team, () => geoShin(T)), shinR, true);
  const armL = new THREE.Group(), armR = new THREE.Group(), foreL = new THREE.Group(), foreR = new THREE.Group();
  armL.position.set(-SHOULDER_X, SHOULDER_Y, 0); armR.position.set(SHOULDER_X, SHOULDER_Y, 0); body.add(armL, armR);
  mesh(cached('uarmL' + team, () => geoUpperArm(T, -1)), armL); mesh(cached('uarmR' + team, () => geoUpperArm(T, 1)), armR);
  foreL.position.y = foreR.position.y = -ARM_L1; armL.add(foreL); armR.add(foreR);
  mesh(cached('fore' + team, () => geoForearm(T)), foreL); mesh(cached('fore' + team, () => geoForearm(T)), foreR);
  const head = new THREE.Group(); head.position.y = 1.83; body.add(head);
  const headMesh = mesh(cached('head' + key + v + skin, () => geoHead(T, role, v, skin)), head, true);
  headMesh.userData.head = true;
  // the gun sits in an aim pivot at the right shoulder; the hands are solved to reach it
  const aim = new THREE.Group(); body.add(aim);
  const gun = new THREE.Group(); aim.add(gun);
  mesh(cached('gun' + role, () => geoGun(role)), gun, true).scale.set(1.35, 1.3, 1.08);
  const H = GUN_HOLD[role] || GUN_HOLD.rifle;
  const muzzle = new THREE.Object3D(); muzzle.position.set(...H.muzzle); gun.add(muzzle);
  const m = { root, body, legL, legR, shinL, shinR, armL, armR, foreL, foreR, head, headMesh, gun, aim, muzzle, hold: H, role };
  poseGun(m, 0, 1, 0);
  return m;
}

// ---- posing ----
const _ms = new THREE.Vector3(), _mt = new THREE.Vector3(), _md = new THREE.Vector3(), _mel = new THREE.Vector3(), _mpl = new THREE.Vector3(), _mq1 = new THREE.Quaternion(), _mq2 = new THREE.Quaternion(), _MDOWN = new THREE.Vector3(0, -1, 0);
function solveArm(arm, fore, tx, ty, tz, px, py, pz) {
  _ms.copy(arm.position); _mt.set(tx, ty, tz); _md.subVectors(_mt, _ms);
  const dist = clamp(_md.length(), 0.12, ARM_L1 + ARM_L2 - 0.004); _md.normalize();
  const ca = clamp((ARM_L1 * ARM_L1 + dist * dist - ARM_L2 * ARM_L2) / (2 * ARM_L1 * dist), -1, 1), sa = Math.sqrt(1 - ca * ca);
  _mpl.set(px, py, pz).addScaledVector(_md, -(_md.x * px + _md.y * py + _md.z * pz)).normalize();   // elbow direction, square to the reach
  _mel.copy(_md).multiplyScalar(ca).addScaledVector(_mpl, sa);                                   // shoulder -> elbow (unit)
  arm.quaternion.setFromUnitVectors(_MDOWN, _mel);
  _mt.copy(_ms).addScaledVector(_md, dist).sub(_ms.addScaledVector(_mel, ARM_L1)).normalize();        // elbow -> hand (unit)
  _mq1.setFromUnitVectors(_MDOWN, _mt);
  fore.quaternion.copy(_mq2.copy(arm.quaternion).invert()).multiply(_mq1);
}
// pitch = aim up/down, ready = 0 (shouldered, aiming) .. 1 (carried low across the chest), sway = running bob
function poseGun(m, pitch, ready, sway) {
  const a = m.aim, heavy = m.role === 'rocket';
  a.position.set(0.15 + 0.05 * ready, (heavy ? 1.72 : 1.63) - 0.17 * ready + Math.abs(sway) * 0.03, 0.1 + 0.04 * ready);
  a.rotation.set(-pitch * (1 - ready) + ready * (heavy ? 0.3 : 0.55), -ready * (heavy ? 0.25 : 0.7) + sway * 0.08, ready * 0.25);
  a.updateMatrix();
  const H = m.hold;
  _mt.set(H.grip[0], H.grip[1], H.grip[2]).applyMatrix4(a.matrix);
  solveArm(m.armR, m.foreR, _mt.x, _mt.y, _mt.z, 0.9, -1, -0.5);
  _mt.set(H.fore[0], H.fore[1], H.fore[2]).applyMatrix4(a.matrix);
  solveArm(m.armL, m.foreL, _mt.x, _mt.y, _mt.z, -0.8, -1, 0.1);
}
// straight arms and legs, for poses that set the shoulder angles themselves (driving, turrets, ragdolls)
function limbsStraight(m) { m.foreL.quaternion.identity(); m.foreR.quaternion.identity(); m.shinL.rotation.x = 0; m.shinR.rotation.x = 0; }


// ---------- WWII soldiers ----------
function geoTorsoWW2(T, team, role, v) {
  const p = new Part(), us = team === 'blue', W = T.web;
  p.box(0.5, 0.2, 0.3, T.uni2, 0, 1.02, 0);                                   // hips
  p.cyl(0.3, 0.27, 0.32, T.uni, 0, 1.27, 0, 0, 0, 0, 0.62);                    // waist
  p.cyl(0.36, 0.3, 0.42, T.uni, 0, 1.6, 0, 0, 0, 0, 0.6);                      // tunic
  p.cyl(0.13, 0.12, 0.1, us ? T.uni : 0x3e4a3a, 0, 1.84, 0);                   // collar (German: dark green)
  for (let i = 0; i < 4; i++) p.ball(0.018, us ? 0x3a3424 : 0x8a8a80, 0, 1.75 - i * 0.12, 0.22);   // buttons
  for (const sd of [-1, 1]) { p.box(0.14, 0.1, 0.04, T.uni2, 0.15 * sd, 1.62, 0.2); p.box(0.14, 0.12, 0.04, T.uni2, 0.16 * sd, 1.28, 0.19); }   // pockets
  p.box(0.54, 0.07, 0.33, W, 0, 1.12, 0); p.box(0.07, 0.07, 0.035, us ? 0x8a8a80 : 0x6a6a64, 0, 1.12, 0.17);   // belt, buckle (plain)
  if (us) {   // suspenders, cartridge belt pockets, canteen, first-aid pouch, a light pack
    for (const sd of [-1, 1]) { p.box(0.06, 0.62, 0.04, W, 0.14 * sd, 1.48, 0.2); p.box(0.06, 0.62, 0.04, W, 0.14 * sd, 1.48, -0.2); }
    for (const x of [-0.2, -0.1, 0.1, 0.2]) p.box(0.09, 0.1, 0.06, W, x, 1.12, 0.2);
    p.cyl(0.07, 0.07, 0.18, 0x5a5a40, 0.28, 1.08, -0.12); p.box(0.1, 0.1, 0.06, W, -0.28, 1.1, 0.06);
    if (role !== 'sniper') { p.box(0.36, 0.32, 0.14, W, 0, 1.5, -0.3); p.box(0.3, 0.06, 0.1, 0x7a6a44, 0, 1.68, -0.32); p.cyl(0.03, 0.03, 0.44, 0x6a5a3a, 0, 1.3, -0.34, 0, 0, Math.PI / 2); }   // pack, entrenching tool handle
  } else {    // Y-straps, black ammo pouches, bread bag, mess tin and the fluted gas-mask canister
    for (const sd of [-1, 1]) { p.box(0.05, 0.6, 0.035, W, 0.13 * sd, 1.48, 0.2, 0, 0, -0.12 * sd); p.box(0.1, 0.12, 0.08, W, 0.15 * sd, 1.17, 0.2); p.box(0.08, 0.1, 0.08, W, 0.25 * sd, 1.17, 0.17); }
    p.box(0.05, 0.6, 0.035, W, 0, 1.48, -0.2);
    p.box(0.2, 0.2, 0.08, 0x6a6a52, 0.25, 1.06, -0.15); p.cyl(0.07, 0.07, 0.16, 0x4a4a3a, 0.3, 1.0, -0.2);   // bread bag, canteen
    p.cyl(0.08, 0.08, 0.32, 0x5a6052, -0.1, 1.24, -0.27, 0.15, 0, 0, 1, 10); for (let i = 0; i < 4; i++) p.cyl(0.083, 0.083, 0.02, 0x4a5044, -0.1, 1.14 + i * 0.07, -0.26, 0.15, 0, 0, 1, 10);   // gas-mask canister
    p.box(0.16, 0.12, 0.06, 0x5a5a50, 0.12, 1.5, -0.24);                       // mess tin
  }
  if (role === 'rocket') for (const sd of [-1, 1]) p.cyl(0.05, 0.05, 0.5, 0x4a5030, 0.13 * sd, 1.55, -0.42, 0.1);   // spare rockets
  return p;
}
function geoHeadWW2(T, team, role, v, skin) {
  const p = new Part(), S = parseInt(skin.slice(1), 16), us = team === 'blue';
  p.cyl(0.085, 0.095, 0.1, S, 0, 0.03, 0);
  p.add(new THREE.SphereGeometry(0.21, 12, 9), S, 0, 0.25, 0, 0, 0, 0, 0.95, 1.1, 1.02);
  p.box(0.05, 0.055, 0.06, S, 0, 0.225, 0.21);
  for (const sd of [-1, 1]) { p.box(0.06, 0.034, 0.02, 0xf4f4f4, 0.078 * sd, 0.285, 0.197); p.box(0.03, 0.034, 0.022, 0x1b1410, 0.072 * sd, 0.285, 0.201); p.box(0.075, 0.018, 0.024, 0x2a1d14, 0.078 * sd, 0.322, 0.19); }
  p.box(0.09, 0.016, 0.02, 0x6b3a2a, 0, 0.155, 0.2);
  if (!us && role === 'sniper') {   // the German soft field cap
    p.box(0.4, 0.13, 0.36, T.uni, 0, 0.43, -0.01); p.box(0.36, 0.04, 0.34, T.uni2, 0, 0.5, -0.01); p.box(0.26, 0.05, 0.06, T.uni2, 0, 0.4, 0.2);
  } else if (us) {   // the M1: a round pot with a narrow brim all round, chin strap hanging loose
    p.dome(0.27, T.armor, 0, 0.31, 0, 1, 0.95, 1.05); p.cyl(0.3, 0.31, 0.03, T.armorD, 0, 0.31, 0, 0, 0, 0, 1, 16);
    if (v === 1) for (let i = 0; i < 6; i++) p.box(0.02, 0.02, 0.5, 0x4a4a30, -0.15 + i * 0.06, 0.48, 0, 0, 0, 0.3 * (i % 2 ? 1 : -1));   // helmet netting
    p.box(0.02, 0.2, 0.02, 0x7a6a44, 0.24, 0.2, 0.05, 0, 0, 0.3); p.box(0.02, 0.2, 0.02, 0x7a6a44, -0.24, 0.2, 0.05, 0, 0, -0.3);
    if (role === 'rocket' || v === 2) { p.box(0.08, 0.03, 0.04, 0xf2f2f2, 0, 0.42, 0.24); p.box(0.03, 0.08, 0.04, 0xf2f2f2, 0, 0.42, 0.24); }   // a medic-style white mark on some
  } else {   // the German steel helmet: deep dome with the flared skirt over the ears and neck
    p.dome(0.265, T.armor, 0, 0.32, -0.01, 1, 0.95, 1.08);
    p.cyl(0.27, 0.33, 0.13, T.armor, 0, 0.27, -0.03, 0, 0, 0, 1.05, 16);       // the flared skirt
    p.box(0.3, 0.03, 0.08, T.armorD, 0, 0.33, 0.25, -0.2);                     // short front brim
    p.box(0.02, 0.18, 0.02, 0x1c1b19, 0.22, 0.2, 0.06, 0, 0, 0.25); p.box(0.02, 0.18, 0.02, 0x1c1b19, -0.22, 0.2, 0.06, 0, 0, -0.25);
  }
  return p;
}
function geoThighWW2(T, side) {
  const p = new Part();
  p.cyl(0.18, 0.145, 0.5, T.uni2, 0, -0.23, 0); p.box(0.15, 0.16, 0.06, T.uni2, 0.12 * side, -0.16, 0.06);
  return p;
}
function geoShinWW2(T, team) {
  const p = new Part(), us = team === 'blue';
  if (us) { p.cyl(0.14, 0.12, 0.2, T.uni2, 0, -0.08, 0); p.cyl(0.14, 0.135, 0.24, 0x9a8a5c, 0, -0.3, 0); for (let i = 0; i < 4; i++) p.box(0.02, 0.02, 0.03, 0x6a5a3a, 0.13, -0.22 - i * 0.05, 0.03); }   // canvas leggings
  else p.cyl(0.15, 0.14, 0.44, T.boot, 0, -0.24, 0);                          // tall black jackboots
  p.box(0.24, 0.13, 0.4, T.boot, 0, -0.44, 0.07); p.box(0.25, 0.04, 0.42, 0x0f0e0d, 0, -0.485, 0.07);
  return p;
}
function geoUpperArmWW2(T) {
  const p = new Part();
  p.cyl(0.125, 0.105, 0.38, T.uni, 0, -0.19, 0); p.cyl(0.128, 0.128, 0.07, T.accent, 0, -0.12, 0);   // sleeve, team armband
  return p;
}
function geoForearmWW2(T, skin) {
  const p = new Part();
  p.cyl(0.1, 0.085, 0.36, T.uni, 0, -0.18, 0); p.cyl(0.088, 0.088, 0.05, T.uni2, 0, -0.35, 0);    // sleeve and cuff
  p.box(0.11, 0.13, 0.12, parseInt(skin.slice(1), 16), 0, -0.44, 0);                              // bare hand
  return p;
}
// the period weapons, pointing along +Z like the modern ones (the same hand and muzzle points)
function geoGunWW2(team, role) {
  const p = new Part(), G = GEARC, R = Math.PI / 2, us = team === 'blue', wood = 0x7a4a24, wood2 = 0x5e3a1c;
  if (role === 'rocket') {
    if (us) {   // bazooka: a long olive tube with a flared front and a shoulder stock
      p.cyl(0.065, 0.065, 1.5, 0x4d5530, 0, 0.1, 0.4, R); p.cyl(0.085, 0.065, 0.14, 0x4d5530, 0, 0.1, -0.36, R); p.cyl(0.09, 0.07, 0.12, 0x3a4024, 0, 0.1, 1.12, R);
      p.box(0.06, 0.12, 0.2, wood, 0, -0.01, 0.08); p.box(0.04, 0.13, 0.05, G.dark, 0, -0.04, 0.3, 0.2); p.box(0.03, 0.06, 0.04, G.dark, 0, 0.19, 0.6);
    } else {    // Panzerschreck: a thicker tube with a blast shield and a little window
      p.cyl(0.08, 0.08, 1.45, 0x4c524c, 0, 0.1, 0.4, R); p.cyl(0.09, 0.09, 0.08, 0x3a3f3a, 0, 0.1, 1.12, R);
      p.box(0.34, 0.34, 0.02, 0x4c524c, 0.12, 0.12, 0.62); p.box(0.07, 0.05, 0.02, 0x22283a, 0.06, 0.18, 0.61);   // shield with window
      p.box(0.04, 0.13, 0.05, G.dark, 0, -0.03, 0.3, 0.2); p.box(0.04, 0.12, 0.05, G.dark, 0, -0.03, 0.55);
    }
  } else if (role === 'sniper') {   // Springfield or Kar98k: a long bolt-action with a wooden stock and a scope
    p.box(0.055, 0.1, 0.42, wood, 0, -0.01, 0.12); p.box(0.05, 0.05, 0.45, wood, 0, 0.0, 0.62); p.box(0.05, 0.12, 0.08, wood2, 0, -0.04, -0.06);   // stock and fore-end
    p.cyl(0.014, 0.014, 0.9, G.gun2, 0, 0.03, 0.95, R); p.box(0.04, 0.05, 0.22, G.gun, 0, 0.04, 0.34);   // barrel, receiver
    p.cyl(0.01, 0.01, 0.08, G.steel, 0.06, 0.04, 0.3, 0, 0, R); p.ball(0.018, G.steel, 0.1, 0.04, 0.3);   // bolt handle
    p.cyl(0.026, 0.026, 0.3, G.gun, 0, 0.11, 0.36, R); p.cyl(0.034, 0.03, 0.06, G.gun, 0, 0.11, 0.53, R); p.cyl(0.03, 0.03, 0.01, G.lens, 0, 0.11, 0.565, R);
    for (const z of [0.3, 0.44]) p.box(0.02, 0.05, 0.02, G.gun, 0, 0.075, z);
  } else if (us) {   // M1 Garand: long wooden stock, upper handguard, steel barrel and the rear sight
    p.box(0.055, 0.1, 0.3, wood, 0, -0.03, 0.06); p.box(0.05, 0.12, 0.08, wood2, 0, -0.05, -0.08);   // butt
    p.box(0.05, 0.06, 0.48, wood, 0, 0.0, 0.52); p.box(0.04, 0.03, 0.3, wood2, 0, 0.04, 0.58);         // fore-end, upper handguard
    p.box(0.045, 0.06, 0.18, G.gun, 0, 0.03, 0.26); p.cyl(0.013, 0.013, 0.36, G.gun2, 0, 0.03, 0.9, R); p.box(0.02, 0.03, 0.03, G.gun, 0, 0.065, 0.2);   // receiver, barrel, sight
    p.box(0.04, 0.03, 0.04, G.gun, 0, 0.0, 1.0); p.box(0.04, 0.08, 0.05, wood2, 0, -0.07, 0.22, 0.3);   // gas cylinder, grip
  } else {           // StG 44: steel receiver, curved magazine, wooden butt, pistol grip
    p.box(0.05, 0.08, 0.36, G.gun, 0, 0.0, 0.36); p.box(0.05, 0.06, 0.14, G.gun2, 0, 0.0, 0.62);    // receiver, handguard
    p.cyl(0.012, 0.012, 0.22, G.gun2, 0, 0.01, 0.8, R); p.cyl(0.018, 0.018, 0.05, G.gun, 0, 0.01, 0.92, R);
    p.box(0.05, 0.1, 0.22, wood, 0, -0.03, 0.06); p.box(0.04, 0.11, 0.05, G.gun, 0, -0.09, 0.24, 0.3);   // wooden butt, grip
    for (let i = 0; i < 4; i++) p.box(0.034, 0.06, 0.05, G.gun2, 0, -0.08 - i * 0.05, 0.42 + i * 0.022, -0.35 - i * 0.05);   // curved magazine
    p.box(0.012, 0.03, 0.012, G.dark, 0, 0.055, 0.75); p.box(0.02, 0.025, 0.03, G.dark, 0, 0.05, 0.3);
  }
  return p;
}
function makeCharacterWW2(team, role) {
  const T = TEAM_LOOK_WW2[team], skin = pick(SKINS), v = Math.floor(Math.random() * 3), key = 'ww2' + team + role;
  const mesh = (geo, parent, shadow) => { const m = new THREE.Mesh(geo, SOLDIER_MAT); m.castShadow = !!shadow; parent.add(m); return m; };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  mesh(cached('torso' + key, () => geoTorsoWW2(T, team, role, v)), body, true);
  const legL = new THREE.Group(), legR = new THREE.Group(), shinL = new THREE.Group(), shinR = new THREE.Group();
  legL.position.set(-0.17, 0.97, 0); legR.position.set(0.17, 0.97, 0); body.add(legL, legR);
  mesh(cached('ww2thighL' + team, () => geoThighWW2(T, -1)), legL, true); mesh(cached('ww2thighR' + team, () => geoThighWW2(T, 1)), legR, true);
  shinL.position.y = shinR.position.y = -0.47; legL.add(shinL); legR.add(shinR);
  mesh(cached('ww2shin' + team, () => geoShinWW2(T, team)), shinL, true); mesh(cached('ww2shin' + team, () => geoShinWW2(T, team)), shinR, true);
  const armL = new THREE.Group(), armR = new THREE.Group(), foreL = new THREE.Group(), foreR = new THREE.Group();
  armL.position.set(-SHOULDER_X, SHOULDER_Y, 0); armR.position.set(SHOULDER_X, SHOULDER_Y, 0); body.add(armL, armR);
  mesh(cached('ww2uarm' + team, () => geoUpperArmWW2(T)), armL); mesh(cached('ww2uarm' + team, () => geoUpperArmWW2(T)), armR);
  foreL.position.y = foreR.position.y = -ARM_L1; armL.add(foreL); armR.add(foreR);
  mesh(cached('ww2fore' + team + skin, () => geoForearmWW2(T, skin)), foreL); mesh(cached('ww2fore' + team + skin, () => geoForearmWW2(T, skin)), foreR);
  const head = new THREE.Group(); head.position.y = 1.83; body.add(head);
  const headMesh = mesh(cached('head' + key + v + skin, () => geoHeadWW2(T, team, role, v, skin)), head, true);
  headMesh.userData.head = true;
  const aim = new THREE.Group(); body.add(aim);
  const gun = new THREE.Group(); aim.add(gun);
  mesh(cached('ww2gun' + team + role, () => geoGunWW2(team, role)), gun, true).scale.set(1.35, 1.3, 1.08);
  const H = GUN_HOLD[role] || GUN_HOLD.rifle;
  const muzzle = new THREE.Object3D(); muzzle.position.set(...H.muzzle); gun.add(muzzle);
  const m = { root, body, legL, legR, shinL, shinR, armL, armR, foreL, foreR, head, headMesh, gun, aim, muzzle, hold: H, role };
  poseGun(m, 0, 1, 0);
  return m;
}
