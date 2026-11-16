// ===================== ww2w.js : WWII weapons you hold =====================
// On the WWII maps (Berlin, Normandy) your guns in first person become the ones each side really carried:
// Allies: Colt M1911, M1 Garand, Thompson, Springfield sniper, bazooka. Germans: Luger, StG 44, MP 40, scoped
// Kar98k, Panzerschreck. The hands have bare skin and the sleeve of your side's uniform.
const WW2W = { team: null, cache: {} };
const WM = {
  wood: new THREE.MeshLambertMaterial({ color: 0x7a4a24 }), wood2: new THREE.MeshLambertMaterial({ color: 0x5a3519 }),
  blued: new THREE.MeshPhongMaterial({ color: 0x23262b, shininess: 50, specular: 0x4a5058 }), steel: new THREE.MeshPhongMaterial({ color: 0x4a4e54, shininess: 60, specular: 0x6a7078 }),
  od: new THREE.MeshLambertMaterial({ color: 0x4d5530 }), grey: new THREE.MeshLambertMaterial({ color: 0x4c524c }), black: new THREE.MeshLambertMaterial({ color: 0x141414 }),
  lens: new THREE.MeshBasicMaterial({ color: 0x2a3a66 }), skin: new THREE.MeshLambertMaterial({ color: 0xd9a77a }),
  sleeve: { blue: new THREE.MeshLambertMaterial({ color: 0x6e6846 }), red: new THREE.MeshLambertMaterial({ color: 0x69705f }) },
  band: { blue: new THREE.MeshLambertMaterial({ color: 0x5b8ad8 }), red: new THREE.MeshLambertMaterial({ color: 0xc8463c }) },
};
function whand(g, team, x, y, z, rx = 0, ry = 0, rz = 0) {
  const h = new THREE.Group();
  vbox(h, 0.09, 0.1, 0.1, WM.skin, 0, 0, 0);
  for (let i = 0; i < 4; i++) vbox(h, 0.019, 0.05, 0.05, WM.skin, -0.033 + i * 0.022, -0.012 - i * 0.004, -0.07, 0.5);
  vbox(h, 0.026, 0.03, 0.08, WM.skin, 0.052, 0.03, -0.03, 0, 0.25);
  vcyl(h, 0.045, 0.062, 0.7, WM.sleeve[team], 0, -0.004, 0.42); vcyl(h, 0.048, 0.048, 0.05, WM.sleeve[team], 0, -0.004, 0.09);   // sleeve and cuff
  h.position.set(x, y, z); h.rotation.set(rx, ry, rz); g.add(h); return h;
}
const WW2_GUNS = {
  m1911(team) {
    const g = new THREE.Group();
    vbox(g, 0.045, 0.05, 0.22, WM.blued, 0, 0.04, -0.07); vbox(g, 0.042, 0.035, 0.18, WM.blued, 0, 0.0, -0.06);
    vbox(g, 0.044, 0.15, 0.065, WM.wood2, 0, -0.08, 0.035, -0.18); vbox(g, 0.008, 0.012, 0.012, WM.black, 0, 0.07, -0.17);
    whand(g, team, 0, -0.1, 0.05, -0.25);
    return { g, ...vmuzzle(g, 0, 0.04, -0.2, 0.07), pos: [0.2, -0.17, -0.42], sight: 0.075 };
  },
  luger(team) {
    const g = new THREE.Group();
    vcyl(g, 0.014, 0.014, 0.16, WM.blued, 0, 0.05, -0.12); vbox(g, 0.04, 0.05, 0.12, WM.blued, 0, 0.04, 0.0); vbox(g, 0.03, 0.03, 0.04, WM.blued, 0, 0.075, 0.03);   // barrel, frame, toggle
    vbox(g, 0.042, 0.15, 0.06, WM.wood2, 0, -0.065, 0.06, -0.45);
    whand(g, team, 0, -0.1, 0.07, -0.4);
    return { g, ...vmuzzle(g, 0, 0.05, -0.21, 0.07), pos: [0.2, -0.17, -0.42], sight: 0.08 };
  },
  garand(team) {
    const g = new THREE.Group();
    vbox(g, 0.055, 0.1, 0.34, WM.wood, 0, -0.01, 0.22); vbox(g, 0.05, 0.12, 0.05, WM.wood2, 0, -0.02, 0.4);   // butt and plate
    vbox(g, 0.05, 0.065, 0.2, WM.blued, 0, 0.035, -0.04); vbox(g, 0.05, 0.06, 0.42, WM.wood, 0, 0.0, -0.33); vbox(g, 0.042, 0.03, 0.26, WM.wood2, 0, 0.045, -0.36);   // receiver, stock, upper handguard
    vcyl(g, 0.013, 0.013, 0.34, WM.steel, 0, 0.04, -0.68); vbox(g, 0.03, 0.03, 0.05, WM.blued, 0, 0.02, -0.78); vbox(g, 0.008, 0.03, 0.012, WM.blued, 0, 0.065, -0.83);   // barrel, gas cylinder, front sight
    vbox(g, 0.03, 0.035, 0.03, WM.blued, 0, 0.085, 0.04);                         // rear sight
    vbox(g, 0.044, 0.12, 0.05, WM.wood, 0, -0.08, 0.08, -0.4);                   // wrist of the stock
    whand(g, team, 0, -0.12, 0.1, -0.3); whand(g, team, -0.02, -0.08, -0.42, 0, -0.45);
    return { g, ...vmuzzle(g, 0, 0.04, -0.86), pos: [0.17, -0.17, -0.4], sight: 0.1 };
  },
  stg44(team) {
    const g = new THREE.Group();
    vbox(g, 0.056, 0.08, 0.36, WM.blued, 0, 0.03, -0.12); vbox(g, 0.05, 0.06, 0.16, WM.steel, 0, 0.03, -0.38);   // receiver, gas tube
    vcyl(g, 0.013, 0.013, 0.2, WM.steel, 0, 0.03, -0.55); vcyl(g, 0.019, 0.019, 0.05, WM.blued, 0, 0.03, -0.66);
    vbox(g, 0.05, 0.1, 0.24, WM.wood, 0, 0.0, 0.18); vbox(g, 0.052, 0.12, 0.03, WM.blued, 0, 0.0, 0.31);   // wooden butt, plate
    vbox(g, 0.04, 0.12, 0.05, WM.blued, 0, -0.09, 0.04, -0.3);                   // grip
    for (let i = 0; i < 5; i++) vbox(g, 0.034, 0.05, 0.05, WM.blued, 0, -0.05 - i * 0.045, -0.12 + i * 0.02, -0.3 - i * 0.06);   // curved magazine
    vbox(g, 0.01, 0.03, 0.01, WM.black, 0, 0.08, -0.6); vbox(g, 0.03, 0.025, 0.04, WM.black, 0, 0.08, -0.02);
    whand(g, team, 0, -0.12, 0.08, -0.3); whand(g, team, -0.02, -0.06, -0.36, 0, -0.45);
    return { g, ...vmuzzle(g, 0, 0.03, -0.7), pos: [0.17, -0.17, -0.4], sight: 0.105 };
  },
  thompson(team) {
    const g = new THREE.Group();
    vbox(g, 0.058, 0.08, 0.28, WM.blued, 0, 0.03, -0.08); vcyl(g, 0.02, 0.02, 0.2, WM.blued, 0, 0.035, -0.32);
    for (let i = 0; i < 8; i++) vcyl(g, 0.026, 0.026, 0.008, WM.blued, 0, 0.035, -0.25 - i * 0.02);   // cooling fins
    vbox(g, 0.05, 0.1, 0.24, WM.wood, 0, 0.0, 0.2); vbox(g, 0.04, 0.12, 0.05, WM.wood, 0, -0.09, 0.04, -0.3);   // butt, rear grip
    vbox(g, 0.04, 0.11, 0.05, WM.wood, 0, -0.07, -0.24, 0.1);                    // front grip
    vbox(g, 0.036, 0.2, 0.05, WM.blued, 0, -0.12, -0.1);                          // stick magazine
    vbox(g, 0.01, 0.03, 0.01, WM.black, 0, 0.08, -0.38);
    whand(g, team, 0, -0.12, 0.06, -0.3); whand(g, team, 0, -0.12, -0.24, 0, -0.3);
    return { g, ...vmuzzle(g, 0, 0.035, -0.45, 0.09), pos: [0.19, -0.16, -0.42], sight: 0.105 };
  },
  mp40(team) {
    const g = new THREE.Group();
    vcyl(g, 0.03, 0.03, 0.32, WM.blued, 0, 0.035, -0.08); vcyl(g, 0.014, 0.014, 0.16, WM.steel, 0, 0.035, -0.32); vbox(g, 0.03, 0.02, 0.03, WM.blued, 0, 0.015, -0.38);   // tube, barrel, rest bar
    vbox(g, 0.04, 0.1, 0.06, WM.black, 0, -0.06, 0.06, -0.25);                    // bakelite grip
    vbox(g, 0.032, 0.24, 0.042, WM.blued, 0, -0.13, -0.16);                        // long straight magazine
    for (const s of [-1, 1]) vcyl(g, 0.006, 0.006, 0.28, WM.blued, s * 0.02, 0.0, 0.2); vbox(g, 0.05, 0.08, 0.015, WM.blued, 0, -0.01, 0.34);   // folding stock
    vbox(g, 0.01, 0.03, 0.01, WM.black, 0, 0.07, -0.33);
    whand(g, team, 0, -0.11, 0.08, -0.25); whand(g, team, 0, -0.14, -0.16, 0, -0.2);
    return { g, ...vmuzzle(g, 0, 0.035, -0.42, 0.08), pos: [0.19, -0.16, -0.42], sight: 0.1 };
  },
  scoped(team) {   // Springfield or Kar98k with a scope
    const g = new THREE.Group();
    vbox(g, 0.056, 0.1, 0.36, WM.wood, 0, -0.01, 0.24); vbox(g, 0.05, 0.06, 0.46, WM.wood, 0, 0.0, -0.3);
    vbox(g, 0.048, 0.06, 0.2, WM.blued, 0, 0.03, -0.02); vcyl(g, 0.012, 0.012, 0.42, WM.steel, 0, 0.035, -0.72);
    vcyl(g, 0.009, 0.009, 0.08, WM.steel, 0.05, 0.03, 0.06); vcyl(g, 0.016, 0.016, 0.02, WM.steel, 0.09, 0.03, 0.06);   // bolt handle
    vcyl(g, 0.024, 0.024, 0.3, WM.blued, 0, 0.1, -0.04); vcyl(g, 0.032, 0.028, 0.06, WM.blued, 0, 0.1, -0.21); vcyl(g, 0.026, 0.026, 0.01, WM.lens, 0, 0.1, -0.24);   // scope
    for (const z of [-0.1, 0.04]) vbox(g, 0.02, 0.05, 0.02, WM.blued, 0, 0.07, z);
    vbox(g, 0.044, 0.12, 0.05, WM.wood, 0, -0.08, 0.1, -0.4);
    whand(g, team, 0, -0.12, 0.12, -0.3); whand(g, team, -0.02, -0.07, -0.42, 0, -0.45);
    return { g, ...vmuzzle(g, 0, 0.035, -0.94, 0.14), pos: [0.17, -0.17, -0.4], sight: 0.1 };
  },
  tube(team) {   // bazooka or Panzerschreck
    const us = team === 'blue', g = new THREE.Group(), M = us ? WM.od : WM.grey;
    vcyl(g, 0.065, 0.065, 1.2, M, 0, 0, -0.15); vcyl(g, 0.085, 0.065, 0.12, M, 0, 0, 0.45); vcyl(g, 0.075, 0.075, 0.06, WM.blued, 0, 0, -0.74);
    if (us) vbox(g, 0.06, 0.1, 0.22, WM.wood, 0, -0.08, 0.2);                       // shoulder stock
    else { vbox(g, 0.36, 0.3, 0.02, M, 0.16, 0.08, -0.28); vbox(g, 0.08, 0.05, 0.025, WM.lens, 0.1, 0.12, -0.285); }   // blast shield with its window
    const warhead = new THREE.Group(); g.add(warhead);
    vcyl(warhead, 0.055, 0.055, 0.12, WM.od, 0, 0, -0.8);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 12), WM.steel); cone.rotation.x = -Math.PI / 2; cone.position.set(0, 0, -0.93); warhead.add(cone);
    vbox(g, 0.04, 0.14, 0.06, WM.wood2, 0, -0.12, 0.02, -0.25); vbox(g, 0.04, 0.12, 0.06, WM.wood2, 0, -0.11, -0.3);
    vbox(g, 0.01, 0.07, 0.01, WM.black, 0, 0.1, -0.5); vbox(g, 0.03, 0.05, 0.01, WM.black, 0, 0.1, 0.0);
    whand(g, team, 0, -0.16, 0.04, -0.25); whand(g, team, 0, -0.15, -0.3, 0, -0.45);
    return { g, ...vmuzzle(g, 0, 0, -0.9, 0.2), pos: [0.2, -0.1, -0.35], warhead, sight: 0.1525 };
  },
};
// Desert Combat (Gulf War): the Iraqi side carries the AK-47 and the RPG-7; names follow the mod's lists
WW2_GUNS.ak47 = function (team) {
  const g = new THREE.Group();
  vbox(g, 0.056, 0.07, 0.3, WM.blued, 0, 0.03, -0.08); vbox(g, 0.05, 0.03, 0.26, WM.steel, 0, 0.075, -0.06);    // receiver and dust cover
  vbox(g, 0.05, 0.06, 0.2, WM.wood, 0, 0.01, -0.33); vbox(g, 0.04, 0.03, 0.2, WM.wood, 0, 0.065, -0.33);        // wooden handguard
  vcyl(g, 0.012, 0.012, 0.26, WM.steel, 0, 0.03, -0.55); vcyl(g, 0.009, 0.009, 0.22, WM.steel, 0, 0.065, -0.52); vbox(g, 0.012, 0.04, 0.012, WM.black, 0, 0.065, -0.66);   // barrel, gas tube, front sight
  vbox(g, 0.05, 0.1, 0.26, WM.wood, 0, -0.01, 0.2, 0.08); vbox(g, 0.04, 0.12, 0.05, WM.wood2, 0, -0.08, 0.03, -0.3);   // wooden stock, grip
  for (let i = 0; i < 5; i++) vbox(g, 0.034, 0.05, 0.05, WM.blued, 0, -0.04 - i * 0.045, -0.13 - i * 0.025, 0.3 + i * 0.07);   // the banana magazine
  whand(g, team, 0, -0.12, 0.06, -0.3); whand(g, team, -0.02, -0.06, -0.34, 0, -0.45);
  return { g, ...vmuzzle(g, 0, 0.03, -0.7), pos: [0.17, -0.17, -0.4], sight: 0.105 };
};
WW2_GUNS.rpg7 = function (team) {
  const g = new THREE.Group();
  vcyl(g, 0.045, 0.045, 1.0, WM.steel, 0, 0, -0.1); vcyl(g, 0.06, 0.045, 0.14, WM.steel, 0, 0, 0.45);          // tube, flared back
  vcyl(g, 0.05, 0.05, 0.3, WM.wood, 0, 0, -0.05);                                                            // wooden heat guard
  const warhead = new THREE.Group(); g.add(warhead);
  vcyl(warhead, 0.04, 0.04, 0.12, WM.od, 0, 0, -0.66); vcyl(warhead, 0.085, 0.04, 0.16, WM.od, 0, 0, -0.8);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.2, 12), WM.od); cone.rotation.x = -Math.PI / 2; cone.position.set(0, 0, -0.98); warhead.add(cone);
  vbox(g, 0.04, 0.13, 0.06, WM.wood2, 0, -0.1, 0.02, -0.25); vbox(g, 0.04, 0.12, 0.06, WM.blued, 0, -0.1, -0.22);
  vbox(g, 0.02, 0.08, 0.04, WM.black, -0.05, 0.08, -0.1);                                                     // the optical sight
  whand(g, team, 0, -0.14, 0.04, -0.25); whand(g, team, 0, -0.14, -0.22, 0, -0.45);
  return { g, ...vmuzzle(g, 0, 0, -1.05, 0.2), pos: [0.2, -0.1, -0.35], warhead, sight: 0.1 };
};
const GULF_MAP = {
  pistol: { blue: ['M9'], red: ['Browning Hi-Power'] },
  rifle: { blue: ['M16A2'], red: ['AK-47', 'ak47'] },
  smg: { blue: ['MP5'], red: ['Scorpion'] },
  sniper: { blue: ['M25 Sniper'], red: ['Tabuk Sniper'] },
  rpg: { blue: ['SMAW'], red: ['RPG-7', 'rpg7'] },
};
const WW2_MAP = {
  pistol: { blue: ['Colt M1911', 'm1911'], red: ['Luger P08', 'luger'] },
  rifle: { blue: ['M1 Garand', 'garand'], red: ['StG 44', 'stg44'] },
  smg: { blue: ['Thompson', 'thompson'], red: ['MP 40', 'mp40'] },
  sniper: { blue: ['Springfield Sniper', 'scoped'], red: ['Kar98k Sniper', 'scoped'] },
  rpg: { blue: ['Bazooka', 'tube'], red: ['Panzerschreck', 'tube'] },
  shotgun: { blue: ['M97 Trench Gun'], red: ['Trench Shotgun'] },
};
function applyWW2Weapons(team) {
  const gulf = typeof AFGHAN !== 'undefined' && AFGHAN, MAP = gulf ? GULF_MAP : WW2_MAP;
  if (!(gulf || (typeof GERMANY !== 'undefined' && (GERMANY || NORMANDY))) || (team !== 'blue' && team !== 'red') || WW2W.team === team) return;
  WW2W.team = team;
  for (const w of WEAPONS) {
    const m = MAP[w.id]; if (!m) continue;
    if (!w._orig) w._orig = { name: w.name, model: w.model };
    const [name, build] = m[team]; w.name = name;
    if (!build) { if (w.model !== w._orig.model) { const vis = w.model.g.visible; w.model.g.visible = false; w.model = w._orig.model; w.model.g.visible = vis; } continue; }
    const key = team + w.id; let model = WW2W.cache[key];
    if (!model) { model = WW2W.cache[key] = WW2_GUNS[build](team); model.g.visible = false; vmHolder.add(model.g); }
    const vis = w.model.g.visible; w.model.g.visible = false; w.model = model; model.g.visible = vis;
  }
}
