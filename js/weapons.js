// ===================== weapons.js : player weapons, viewmodel, hitscan, projectiles =====================
const vmScene = new THREE.Scene();
const vmCam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 10);
vmScene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.85));
const vmSun = new THREE.DirectionalLight(0xffffff, 0.75); vmSun.position.set(1, 2, 1); vmScene.add(vmSun);

const VM = {
  metal: new THREE.MeshPhongMaterial({ color: 0x2b2d31, shininess: 55, specular: 0x555a60 }), steel: new THREE.MeshPhongMaterial({ color: 0x5f656d, shininess: 70, specular: 0x8a9098 }),
  wood: new THREE.MeshLambertMaterial({ color: 0x7a4a24 }), olive: new THREE.MeshLambertMaterial({ color: 0x55602a }),
  black: new THREE.MeshLambertMaterial({ color: 0x111111 }), skin: new THREE.MeshLambertMaterial({ color: 0xe0ac69 }),
  glove: new THREE.MeshLambertMaterial({ color: 0x1f1a16 }), sleeve: new THREE.MeshLambertMaterial({ color: 0x2f6fe0 }),
  white: new THREE.MeshLambertMaterial({ color: 0xe8eaed }), glow: new THREE.MeshBasicMaterial({ color: 0x22e6ff }),
  lens: new THREE.MeshBasicMaterial({ color: 0x3355aa }),
};
function vbox(g, w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; }
function vcyl(g, r1, r2, len, mat, x, y, z) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 14), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); g.add(m); return m; }
Object.assign(VM, {
  tan: new THREE.MeshPhongMaterial({ color: 0xa8905f, shininess: 12, specular: 0x333333 }), rubber: new THREE.MeshLambertMaterial({ color: 0x17181a }),
  brass: new THREE.MeshPhongMaterial({ color: 0xd9a441, shininess: 80, specular: 0xffe0a0 }), dot: new THREE.MeshBasicMaterial({ color: 0xff3020 }),
  glass: new THREE.MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.16, depthWrite: false }), shell: new THREE.MeshLambertMaterial({ color: 0xc0392b }),
  band: new THREE.MeshLambertMaterial({ color: 0x7db4ff }), knuckle: new THREE.MeshPhongMaterial({ color: 0x3a3d42, shininess: 40 }), dark2: new THREE.MeshPhongMaterial({ color: 0x1b1c1f, shininess: 35, specular: 0x444444 }),
});
// vertical cylinder (along Y) with optional tilt
function vcy(g, r, len, mat, x, y, z, rx = 0, rz = 0) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m; }
// a gloved hand gripping forward, with a sleeved forearm running back towards you
function vhand(g, x, y, z, rx = 0, ry = 0, rz = 0) {
  const h = new THREE.Group();
  vbox(h, 0.09, 0.1, 0.1, VM.glove, 0, 0, 0);                                   // palm
  vbox(h, 0.092, 0.03, 0.07, VM.knuckle, 0, 0.04, -0.02);                        // knuckle guard
  for (let i = 0; i < 4; i++) vbox(h, 0.019, 0.05, 0.05, VM.glove, -0.033 + i * 0.022, -0.012 - i * 0.004, -0.07, 0.5);   // fingers
  vbox(h, 0.026, 0.03, 0.08, VM.glove, 0.052, 0.03, -0.03, 0, 0.25);             // thumb
  vbox(h, 0.094, 0.104, 0.035, VM.rubber, 0, 0, 0.06);                           // wrist strap
  vcyl(h, 0.04, 0.06, 0.7, VM.sleeve, 0, -0.004, 0.44);                          // forearm sleeve
  vbox(h, 0.07, 0.03, 0.2, VM.knuckle, 0, 0.04, 0.3); vbox(h, 0.05, 0.01, 0.16, VM.band, 0, 0.056, 0.3);   // forearm guard
  vcyl(h, 0.044, 0.044, 0.025, VM.band, 0, -0.003, 0.12);                           // team cuff
  vbox(h, 0.05, 0.012, 0.045, VM.rubber, 0, 0.05, 0.1); vbox(h, 0.034, 0.006, 0.03, VM.glow, 0, 0.058, 0.1);   // wrist screen
  h.position.set(x, y, z); h.rotation.set(rx, ry, rz); g.add(h); return h;
}
function vmuzzle(g, x, y, z, size = 0.12, color = 0xffb050) {
  const mz = new THREE.Object3D(); mz.position.set(x, y, z); g.add(mz);
  const fl = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  fl.add(new THREE.Mesh(new THREE.OctahedronGeometry(size * 0.75, 0), mat));
  for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(size * 2.3, size * 0.55), mat); p.rotation.z = i * Math.PI / 3; fl.add(p); }   // star flash
  const cone = new THREE.Mesh(new THREE.ConeGeometry(size * 0.7, size * 2.4, 6, 1, true), mat); cone.rotation.x = -Math.PI / 2; cone.position.z = -size * 1.1; fl.add(cone);
  fl.visible = false; mz.add(fl); return { mz, fl };
}
// a little open sight window with a glowing dot, for looking down the gun
function vreddot(g, y, z, w = 0.05) {
  vbox(g, w * 0.9, 0.018, 0.07, VM.black, 0, y - w * 0.62, z);
  for (const s of [-1, 1]) vbox(g, 0.007, w, 0.06, VM.black, s * w / 2, y, z);
  vbox(g, w + 0.007, 0.007, 0.06, VM.black, 0, y + w / 2, z); vbox(g, w + 0.007, 0.007, 0.06, VM.black, 0, y - w / 2, z);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, w), VM.glass); gl.position.set(0, y, z - 0.02); g.add(gl);
  vbox(g, 0.005, 0.005, 0.005, VM.dot, 0, y, z - 0.021);
}
function vrail(g, y, z0, z1) { vbox(g, 0.026, 0.01, z0 - z1, VM.black, 0, y, (z0 + z1) / 2); for (let z = z1 + 0.015; z < z0; z += 0.03) vbox(g, 0.03, 0.006, 0.012, VM.dark2, 0, y + 0.007, z); }
const BUILD = {
  pistol() {
    const g = new THREE.Group();
    vbox(g, 0.05, 0.055, 0.27, VM.steel, 0, 0.04, -0.08);                         // slide
    for (let i = 0; i < 5; i++) vbox(g, 0.053, 0.04, 0.008, VM.dark2, 0, 0.04, 0.0 + i * 0.016);   // slide grooves
    vbox(g, 0.02, 0.012, 0.06, VM.black, 0.017, 0.058, -0.1);                     // ejection port
    vbox(g, 0.046, 0.035, 0.21, VM.dark2, 0, -0.003, -0.07);                      // frame
    vcyl(g, 0.012, 0.012, 0.03, VM.black, 0, 0.04, -0.225);                       // barrel tip
    vbox(g, 0.03, 0.03, 0.09, VM.black, 0, -0.035, -0.14); vcyl(g, 0.014, 0.014, 0.012, VM.glow, 0, -0.035, -0.19);   // rail light
    vbox(g, 0.046, 0.16, 0.07, VM.rubber, 0, -0.09, 0.035, -0.22); vbox(g, 0.049, 0.11, 0.05, VM.dark2, 0, -0.085, 0.04, -0.22);   // grip
    vbox(g, 0.008, 0.012, 0.07, VM.dark2, 0, -0.05, -0.04); vbox(g, 0.008, 0.04, 0.01, VM.dark2, 0, -0.035, -0.075);   // trigger guard
    vbox(g, 0.008, 0.016, 0.012, VM.black, 0, 0.076, -0.2); for (const s of [-1, 1]) vbox(g, 0.008, 0.016, 0.012, VM.black, s * 0.014, 0.076, 0.04);   // sights
    vbox(g, 0.004, 0.006, 0.004, VM.dot, 0, 0.083, -0.2);
    vhand(g, 0, -0.1, 0.05, -0.25);
    return { g, ...vmuzzle(g, 0, 0.04, -0.25, 0.07), pos: [0.2, -0.17, -0.42], sight: 0.082 };
  },
  rifle() {
    const g = new THREE.Group();
    vbox(g, 0.06, 0.07, 0.3, VM.metal, 0, 0.035, -0.08); vbox(g, 0.054, 0.06, 0.2, VM.dark2, 0, -0.025, -0.03);   // upper and lower receiver
    vbox(g, 0.02, 0.022, 0.07, VM.steel, 0.032, 0.04, -0.07); vbox(g, 0.012, 0.012, 0.03, VM.steel, 0.034, 0.02, -0.01);   // ejection port, forward assist
    vbox(g, 0.064, 0.064, 0.3, VM.tan, 0, 0.033, -0.38);                           // handguard
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) vbox(g, 0.004, 0.02, 0.035, VM.black, s * 0.032, 0.035, -0.27 - i * 0.052);   // vents
    vrail(g, 0.074, 0.07, -0.53);
    vcyl(g, 0.013, 0.013, 0.14, VM.steel, 0, 0.033, -0.6); vcyl(g, 0.021, 0.021, 0.07, VM.black, 0, 0.033, -0.69);   // barrel, muzzle brake
    for (let i = 0; i < 3; i++) vbox(g, 0.044, 0.006, 0.008, VM.steel, 0, 0.033, -0.67 - i * 0.018);
    vbox(g, 0.05, 0.012, 0.03, VM.steel, 0, 0.075, 0.075);                         // charging handle
    vbox(g, 0.045, 0.13, 0.055, VM.rubber, 0, -0.1, 0.085, -0.3);                  // grip
    vbox(g, 0.008, 0.01, 0.08, VM.dark2, 0, -0.06, 0.01);                          // trigger guard
    vbox(g, 0.04, 0.17, 0.07, VM.metal, 0, -0.13, -0.1, 0.2); vbox(g, 0.043, 0.02, 0.074, VM.tan, 0, -0.205, -0.115, 0.2);   // magazine with base
    vcyl(g, 0.019, 0.019, 0.2, VM.dark2, 0, 0.025, 0.17);                          // buffer tube
    vbox(g, 0.05, 0.1, 0.17, VM.tan, 0, 0.0, 0.31); vbox(g, 0.052, 0.125, 0.022, VM.rubber, 0, -0.005, 0.4); vbox(g, 0.03, 0.03, 0.1, VM.dark2, 0, -0.06, 0.29);   // stock
    vbox(g, 0.034, 0.1, 0.036, VM.rubber, 0, -0.055, -0.42);                       // foregrip
    vbox(g, 0.028, 0.03, 0.07, VM.black, -0.05, 0.035, -0.47); vcyl(g, 0.011, 0.011, 0.01, VM.dot, -0.05, 0.035, -0.507);   // side laser
    vreddot(g, 0.125, -0.09);
    vbox(g, 0.008, 0.03, 0.01, VM.black, 0, 0.095, -0.5);
    vhand(g, 0, -0.12, 0.1, -0.3); vhand(g, -0.02, -0.1, -0.42, 0, -0.45);
    return { g, ...vmuzzle(g, 0, 0.033, -0.75), pos: [0.17, -0.17, -0.4], sight: 0.125 };
  },
  smg() {
    const g = new THREE.Group();
    vbox(g, 0.062, 0.1, 0.3, VM.dark2, 0, 0.005, -0.08); vbox(g, 0.066, 0.03, 0.2, VM.tan, 0, -0.03, -0.1);   // body with tan panel
    vrail(g, 0.06, 0.07, -0.23);
    vbox(g, 0.02, 0.02, 0.06, VM.steel, 0.033, 0.02, -0.06);
    vcyl(g, 0.03, 0.03, 0.2, VM.black, 0, 0.012, -0.33); for (let i = 0; i < 4; i++) vcyl(g, 0.032, 0.032, 0.008, VM.dark2, 0, 0.012, -0.26 - i * 0.04);   // suppressor with rings
    vbox(g, 0.036, 0.26, 0.05, VM.metal, 0, -0.17, -0.12, 0.08); vbox(g, 0.04, 0.02, 0.055, VM.tan, 0, -0.3, -0.13, 0.08);   // stick magazine
    vbox(g, 0.044, 0.12, 0.055, VM.rubber, 0, -0.1, 0.035, -0.3);
    vbox(g, 0.012, 0.012, 0.24, VM.steel, 0.022, 0.03, 0.18); vbox(g, 0.012, 0.012, 0.24, VM.steel, -0.022, 0.03, 0.18); vbox(g, 0.06, 0.09, 0.02, VM.rubber, 0, 0.01, 0.3);   // wire stock
    vbox(g, 0.03, 0.07, 0.03, VM.rubber, 0, -0.08, -0.2, 0.3);                     // angled foregrip
    vreddot(g, 0.105, -0.07, 0.045);
    vhand(g, 0, -0.12, 0.05, -0.3); vhand(g, -0.02, -0.12, -0.2, 0.2, -0.4);
    return { g, ...vmuzzle(g, 0, 0.012, -0.45, 0.08), pos: [0.19, -0.16, -0.42], sight: 0.105 };
  },
  shotgun() {
    const g = new THREE.Group();
    vcyl(g, 0.026, 0.026, 0.72, VM.steel, 0, 0.035, -0.36); vcyl(g, 0.021, 0.021, 0.52, VM.metal, 0, -0.018, -0.3);   // barrel, tube
    vbox(g, 0.062, 0.03, 0.34, VM.dark2, 0, 0.062, -0.38); for (let i = 0; i < 6; i++) vbox(g, 0.066, 0.008, 0.02, VM.black, 0, 0.068, -0.24 - i * 0.05);   // heat shield
    vbox(g, 0.03, 0.03, 0.02, VM.steel, 0, 0.01, -0.57);                           // barrel clamp
    const pump = new THREE.Group(); pump.position.set(0, -0.018, -0.42); g.add(pump);
    vbox(pump, 0.072, 0.068, 0.2, VM.tan, 0, 0, 0); for (let i = 0; i < 5; i++) vbox(pump, 0.076, 0.072, 0.012, VM.rubber, 0, 0, -0.08 + i * 0.04);   // ribbed pump
    vbox(g, 0.066, 0.1, 0.26, VM.metal, 0, 0.012, 0.03); vbox(g, 0.02, 0.03, 0.09, VM.black, 0.034, 0.02, 0.0);   // receiver
    for (let i = 0; i < 4; i++) { vcyl(g, 0.012, 0.012, 0.055, VM.shell, -0.045, -0.02, 0.1 - i * 0.07); vcyl(g, 0.0125, 0.0125, 0.012, VM.brass, -0.045, -0.02, 0.132 - i * 0.07); }   // spare shells
    vbox(g, 0.05, 0.13, 0.055, VM.rubber, 0, -0.085, 0.14, -0.35);                 // pistol grip
    vbox(g, 0.052, 0.11, 0.3, VM.tan, 0, -0.03, 0.33, 0.1); vbox(g, 0.054, 0.13, 0.022, VM.rubber, 0, -0.045, 0.485, 0.1);   // stock
    vbox(g, 0.01, 0.014, 0.01, VM.brass, 0, 0.084, -0.7); vrail(g, 0.066, 0.12, -0.04);
    vhand(g, 0, -0.1, 0.15, -0.3); const lh = vhand(g, -0.02, -0.07, -0.42, 0, -0.45);
    return { g, ...vmuzzle(g, 0, 0.035, -0.74, 0.16), pos: [0.17, -0.17, -0.4], pump, lh, sight: 0.09 };
  },
  sniper() {
    const g = new THREE.Group();
    vbox(g, 0.062, 0.085, 0.36, VM.metal, 0, 0.01, -0.02);                         // action
    vbox(g, 0.066, 0.075, 0.42, VM.olive, 0, -0.02, -0.3); vbox(g, 0.05, 0.03, 0.42, VM.dark2, 0, -0.058, -0.3);   // chassis forend
    vcyl(g, 0.02, 0.016, 0.62, VM.steel, 0, 0.022, -0.5); for (let i = 0; i < 4; i++) vbox(g, 0.008, 0.045, 0.3, VM.dark2, 0, 0.022, -0.45).rotation.z = i * Math.PI / 4;   // fluted barrel
    vbox(g, 0.06, 0.05, 0.11, VM.black, 0, 0.022, -0.85); for (let i = 0; i < 3; i++) vbox(g, 0.064, 0.02, 0.012, VM.steel, 0, 0.022, -0.82 - i * 0.03);   // muzzle brake
    vcyl(g, 0.034, 0.034, 0.32, VM.black, 0, 0.1, -0.05); vcyl(g, 0.046, 0.04, 0.09, VM.black, 0, 0.1, -0.24); vcyl(g, 0.042, 0.036, 0.06, VM.black, 0, 0.1, 0.13);   // scope
    vcyl(g, 0.04, 0.04, 0.005, VM.lens, 0, 0.1, -0.286); vcy(g, 0.016, 0.04, VM.dark2, 0, 0.14, -0.04); vcy(g, 0.016, 0.04, VM.dark2, 0.04, 0.1, -0.04, 0, Math.PI / 2);
    for (const z of [-0.14, 0.04]) vbox(g, 0.03, 0.04, 0.03, VM.dark2, 0, 0.065, z);
    vcy(g, 0.008, 0.07, VM.steel, 0.06, 0.005, 0.08, 0, Math.PI / 2 - 0.5); const kn = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), VM.black); kn.position.set(0.095, -0.012, 0.08); g.add(kn);   // bolt
    vbox(g, 0.06, 0.12, 0.3, VM.olive, 0, -0.035, 0.3); vbox(g, 0.05, 0.03, 0.16, VM.tan, 0, 0.045, 0.27); vbox(g, 0.062, 0.14, 0.022, VM.rubber, 0, -0.04, 0.455);   // stock, cheek rest
    vbox(g, 0.045, 0.13, 0.06, VM.rubber, 0, -0.1, 0.09, -0.3); vbox(g, 0.042, 0.1, 0.08, VM.metal, 0, -0.09, -0.09);   // grip, magazine
    for (const s of [-1, 1]) { vcyl(g, 0.008, 0.008, 0.28, VM.dark2, s * 0.03, -0.085, -0.36); vbox(g, 0.014, 0.014, 0.03, VM.rubber, s * 0.03, -0.085, -0.5); }   // bipod
    vhand(g, 0, -0.12, 0.1, -0.3); vhand(g, -0.02, -0.08, -0.33, 0, -0.45);
    return { g, ...vmuzzle(g, 0, 0.022, -0.92, 0.14), pos: [0.17, -0.17, -0.4], sight: 0.1 };
  },
  minigun() {
    const g = new THREE.Group();
    vbox(g, 0.17, 0.17, 0.36, VM.metal, 0, -0.02, 0.03); vbox(g, 0.175, 0.04, 0.3, VM.olive, 0, 0.05, 0.03); vcyl(g, 0.075, 0.075, 0.12, VM.dark2, 0, -0.02, 0.26);   // housing, motor
    const spin = new THREE.Group(); spin.position.set(0, 0, -0.2); g.add(spin);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; vcyl(spin, 0.014, 0.014, 0.62, VM.steel, Math.cos(a) * 0.045, Math.sin(a) * 0.045, -0.3); }
    vcyl(spin, 0.072, 0.072, 0.03, VM.metal, 0, 0, -0.56); vcyl(spin, 0.072, 0.072, 0.03, VM.metal, 0, 0, -0.34); vcyl(spin, 0.072, 0.072, 0.03, VM.metal, 0, 0, -0.12); vcyl(spin, 0.02, 0.02, 0.6, VM.dark2, 0, 0, -0.3);
    vbox(g, 0.03, 0.03, 0.26, VM.black, 0, 0.14, -0.02); for (const z of [-0.13, 0.09]) vbox(g, 0.03, 0.08, 0.03, VM.black, 0, 0.1, z);   // carry handle
    vbox(g, 0.1, 0.14, 0.16, VM.olive, 0.14, -0.06, 0.05); vbox(g, 0.104, 0.02, 0.164, VM.tan, 0.14, 0.015, 0.05);   // ammo box
    for (let i = 0; i < 6; i++) vcy(g, 0.009, 0.05, VM.brass, 0.1 - i * 0.004, 0.04 + Math.sin(i * 0.6) * 0.012, 0.04 - i * 0.022, 0, Math.PI / 2);   // belt
    vhand(g, 0, -0.14, 0.17, -0.3); vhand(g, -0.1, -0.06, -0.08, 0, -0.5);
    return { g, ...vmuzzle(g, 0, 0, -0.84, 0.18), pos: [0.17, -0.2, -0.45], spin, sight: 0.1525 };
  },
  rpg() {
    const g = new THREE.Group();
    vcyl(g, 0.065, 0.065, 1.1, VM.olive, 0, 0, -0.15); vcyl(g, 0.072, 0.072, 0.34, VM.wood, 0, 0, -0.02); for (const z of [-0.2, 0.16]) vcyl(g, 0.074, 0.074, 0.02, VM.steel, 0, 0, z);   // tube, wood wrap, bands
    vcyl(g, 0.1, 0.07, 0.14, VM.olive, 0, 0, 0.45); vcyl(g, 0.105, 0.105, 0.012, VM.dark2, 0, 0, 0.52);
    const warhead = new THREE.Group(); g.add(warhead);
    vcyl(warhead, 0.07, 0.06, 0.15, VM.olive, 0, 0, -0.77); vcyl(warhead, 0.1, 0.07, 0.08, VM.dark2, 0, 0, -0.86);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 14), VM.metal); cone.rotation.x = -Math.PI / 2; cone.position.set(0, 0, -1.02); warhead.add(cone);
    vcyl(warhead, 0.015, 0.015, 0.05, VM.steel, 0, 0, -1.15); vcyl(warhead, 0.102, 0.102, 0.012, VM.shell, 0, 0, -0.9);
    vbox(g, 0.04, 0.14, 0.06, VM.rubber, 0, -0.12, 0.02, -0.25); vbox(g, 0.04, 0.12, 0.06, VM.rubber, 0, -0.11, -0.3); vbox(g, 0.03, 0.03, 0.3, VM.dark2, 0, -0.075, -0.14);
    vbox(g, 0.03, 0.07, 0.14, VM.black, -0.08, 0.07, -0.2); vcyl(g, 0.018, 0.018, 0.005, VM.lens, -0.08, 0.075, -0.272); vbox(g, 0.01, 0.06, 0.01, VM.black, 0, 0.09, -0.55);   // optic, front post
    vhand(g, 0, -0.16, 0.04, -0.25); vhand(g, 0, -0.15, -0.3, 0, -0.45);
    return { g, ...vmuzzle(g, 0, 0, -1.0, 0.2), pos: [0.2, -0.1, -0.35], warhead, sight: 0.1525 };
  },
  grenade() {
    const g = new THREE.Group();
    vcyl(g, 0.047, 0.047, 0.36, VM.steel, 0, 0.03, -0.3); vcyl(g, 0.052, 0.052, 0.04, VM.dark2, 0, 0.03, -0.47); for (let i = 0; i < 3; i++) vcyl(g, 0.05, 0.05, 0.01, VM.dark2, 0, 0.03, -0.2 - i * 0.07);   // fat barrel
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.15, 12), VM.metal); drum.rotation.x = Math.PI / 2; drum.position.set(0, -0.02, -0.02); g.add(drum);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; vcy(drum, 0.026, 0.156, VM.brass, Math.cos(a) * 0.055, 0, Math.sin(a) * 0.055); }   // chambers turn with the drum
    vbox(g, 0.05, 0.05, 0.3, VM.dark2, 0, 0.06, 0.02); vrail(g, 0.09, 0.14, -0.1);
    vbox(g, 0.012, 0.012, 0.26, VM.steel, 0.022, 0.03, 0.24); vbox(g, 0.012, 0.012, 0.26, VM.steel, -0.022, 0.03, 0.24); vbox(g, 0.06, 0.1, 0.022, VM.rubber, 0, 0.0, 0.37);   // stock
    vbox(g, 0.045, 0.13, 0.06, VM.rubber, 0, -0.12, 0.1, -0.3); vbox(g, 0.04, 0.12, 0.05, VM.rubber, 0, -0.08, -0.3);
    vbox(g, 0.008, 0.07, 0.008, VM.black, 0.02, 0.13, -0.05); vbox(g, 0.008, 0.07, 0.008, VM.black, -0.02, 0.13, -0.05); vbox(g, 0.05, 0.006, 0.008, VM.dot, 0, 0.15, -0.05);   // ladder sight
    vhand(g, 0, -0.14, 0.12, -0.3); vhand(g, -0.02, -0.11, -0.3, 0, -0.45);
    return { g, ...vmuzzle(g, 0, 0.03, -0.5, 0.1), pos: [0.18, -0.17, -0.4], drum, sight: 0.15 };
  },
  mortar() {
    const g = new THREE.Group();
    vcyl(g, 0.068, 0.068, 0.62, VM.metal, 0, 0.02, -0.26); vcyl(g, 0.078, 0.078, 0.045, VM.dark2, 0, 0.02, -0.57);   // the tube and its muzzle ring
    vcyl(g, 0.085, 0.085, 0.06, VM.dark2, 0, 0.02, 0.07); vbox(g, 0.2, 0.025, 0.2, VM.dark2, 0, -0.07, 0.12);       // breech and base plate
    vbox(g, 0.014, 0.2, 0.014, VM.steel, 0.055, -0.07, -0.24, 0.35); vbox(g, 0.014, 0.2, 0.014, VM.steel, -0.055, -0.07, -0.24, 0.35);   // folded bipod
    vbox(g, 0.04, 0.05, 0.07, VM.dark2, 0.08, 0.05, -0.12); vbox(g, 0.008, 0.03, 0.008, VM.dot, 0.08, 0.09, -0.12);   // sight
    vhand(g, 0.02, -0.1, -0.05, -0.3); vhand(g, -0.03, -0.09, -0.38, 0, -0.45);
    return { g, ...vmuzzle(g, 0, 0.02, -0.62, 0.12), pos: [0.2, -0.2, -0.45], sight: 0.15 };
  },
  laser() {
    const g = new THREE.Group();
    vbox(g, 0.07, 0.09, 0.46, VM.white, 0, 0, -0.15); vbox(g, 0.074, 0.016, 0.36, VM.glow, 0, 0.02, -0.15); vbox(g, 0.076, 0.03, 0.3, VM.dark2, 0, -0.035, -0.16);
    vcyl(g, 0.032, 0.032, 0.1, VM.glow, 0, 0, -0.43); for (let i = 0; i < 3; i++) vcyl(g, 0.04, 0.04, 0.012, VM.white, 0, 0, -0.4 - i * 0.03);   // emitter with cooling rings
    for (const s of [-1, 1]) { vbox(g, 0.01, 0.07, 0.16, VM.white, s * 0.045, 0, -0.33); vbox(g, 0.012, 0.012, 0.2, VM.glow, s * 0.045, 0.0, -0.36); }   // prongs
    vbox(g, 0.03, 0.05, 0.2, VM.white, 0, 0.065, -0.08); vbox(g, 0.008, 0.07, 0.14, VM.dark2, 0, 0.09, -0.06);   // top fin
    vcy(g, 0.03, 0.1, VM.glow, 0.05, -0.02, 0.0); vcy(g, 0.034, 0.02, VM.dark2, 0.05, 0.03, 0.0); vcy(g, 0.034, 0.02, VM.dark2, 0.05, -0.07, 0.0);   // energy cell
    vbox(g, 0.045, 0.13, 0.06, VM.dark2, 0, -0.09, 0.03, -0.25); vbox(g, 0.06, 0.08, 0.14, VM.white, 0, 0.0, 0.14); vbox(g, 0.062, 0.1, 0.02, VM.dark2, 0, 0, 0.22);
    vhand(g, 0, -0.12, 0.05, -0.25); vhand(g, -0.02, -0.08, -0.28, 0, -0.45);
    return { g, ...vmuzzle(g, 0, 0, -0.5, 0.09, 0x66f0ff), pos: [0.18, -0.17, -0.42], sight: 0.13 };
  },
  m16() {   // classic M16: carry handle, triangle handguard, black furniture
    const g = new THREE.Group();
    vbox(g, 0.058, 0.07, 0.3, VM.metal, 0, 0.035, -0.08); vbox(g, 0.052, 0.06, 0.2, VM.dark2, 0, -0.025, -0.03);
    vbox(g, 0.02, 0.06, 0.2, VM.metal, 0, 0.1, -0.06); vbox(g, 0.05, 0.02, 0.2, VM.metal, 0, 0.13, -0.06);   // carry handle
    vbox(g, 0.008, 0.03, 0.02, VM.black, 0, 0.15, 0.03);                                                      // rear sight
    vcyl(g, 0.04, 0.03, 0.3, VM.black, 0, 0.03, -0.38);                                                        // round handguard
    for (let i = 0; i < 6; i++) vbox(g, 0.082, 0.006, 0.012, VM.dark2, 0, 0.03, -0.26 - i * 0.045);
    vbox(g, 0.012, 0.09, 0.012, VM.black, 0, 0.09, -0.56); vbox(g, 0.004, 0.02, 0.004, VM.dot, 0, 0.14, -0.56);  // front sight post
    vcyl(g, 0.012, 0.012, 0.18, VM.steel, 0, 0.033, -0.62); vcyl(g, 0.02, 0.016, 0.06, VM.black, 0, 0.033, -0.73);
    vbox(g, 0.044, 0.15, 0.07, VM.metal, 0, -0.1, -0.08, 0.15);                                                // curved magazine
    vbox(g, 0.045, 0.13, 0.06, VM.rubber, 0, -0.09, 0.07, -0.3);
    vbox(g, 0.055, 0.08, 0.28, VM.black, 0, -0.005, 0.2); vbox(g, 0.058, 0.1, 0.02, VM.rubber, 0, -0.01, 0.34);  // fixed stock
    vhand(g, 0, -0.12, 0.08, -0.3); vhand(g, -0.02, -0.06, -0.36, 0, -0.45);
    return { g, ...vmuzzle(g, 0, 0.033, -0.77, 0.12), pos: [0.17, -0.18, -0.4], sight: 0.14 };
  },
  fifty() {   // a huge .50 cal anti-material rifle with a big muzzle brake and scope
    const g = new THREE.Group();
    vbox(g, 0.08, 0.11, 0.5, VM.metal, 0, 0.0, -0.05); vbox(g, 0.075, 0.07, 0.4, VM.dark2, 0, 0.01, -0.45);
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) vbox(g, 0.004, 0.035, 0.04, VM.black, s * 0.038, 0.01, -0.3 - i * 0.05);
    vcyl(g, 0.026, 0.024, 0.55, VM.steel, 0, 0.02, -0.75);
    vbox(g, 0.1, 0.06, 0.14, VM.black, 0, 0.02, -1.05); for (const s of [-1, 1]) vbox(g, 0.012, 0.05, 0.1, VM.steel, s * 0.056, 0.02, -1.05);   // brake
    vcyl(g, 0.04, 0.04, 0.36, VM.black, 0, 0.11, -0.05); vcyl(g, 0.055, 0.045, 0.1, VM.black, 0, 0.11, -0.26); vcyl(g, 0.05, 0.05, 0.005, VM.lens, 0, 0.11, -0.312);
    vbox(g, 0.06, 0.12, 0.1, VM.metal, 0, -0.11, -0.1);                                                          // big magazine
    vbox(g, 0.045, 0.13, 0.06, VM.rubber, 0, -0.1, 0.12, -0.3);
    vbox(g, 0.07, 0.11, 0.26, VM.metal, 0, -0.01, 0.32); vbox(g, 0.072, 0.13, 0.03, VM.rubber, 0, -0.02, 0.46);
    for (const s of [-1, 1]) vcyl(g, 0.009, 0.009, 0.3, VM.dark2, s * 0.035, -0.07, -0.55);
    vhand(g, 0, -0.12, 0.12, -0.3); vhand(g, -0.02, -0.07, -0.38, 0, -0.45);
    return { g, ...vmuzzle(g, 0, 0.02, -1.13, 0.2), pos: [0.17, -0.17, -0.38], sight: 0.11 };
  },
  golden() {   // the golden gun: a slim gold pistol with a long barrel
    const g = new THREE.Group(), gold = new THREE.MeshPhongMaterial({ color: 0xe8b830, shininess: 120, specular: 0xfff0a0, emissive: 0x2a1c00 });
    vbox(g, 0.042, 0.05, 0.22, gold, 0, 0.04, -0.06); vcyl(g, 0.014, 0.014, 0.2, gold, 0, 0.045, -0.26);
    vcyl(g, 0.02, 0.02, 0.02, gold, 0, 0.045, -0.36); vbox(g, 0.044, 0.15, 0.06, gold, 0, -0.08, 0.04, -0.2);
    vbox(g, 0.008, 0.03, 0.06, gold, 0, -0.025, -0.03); vbox(g, 0.008, 0.016, 0.012, gold, 0, 0.072, -0.14);
    vhand(g, 0, -0.1, 0.05, -0.25);
    const m = { g, ...vmuzzle(g, 0, 0.045, -0.38, 0.08, 0xffd040), pos: [0.2, -0.17, -0.42], sight: 0.075 };
    return m;
  },
  blaster() {   // a red laser blaster pistol
    const g = new THREE.Group(), red = new THREE.MeshBasicMaterial({ color: 0xff3a30 });
    vbox(g, 0.05, 0.07, 0.24, VM.dark2, 0, 0.04, -0.07); vbox(g, 0.054, 0.014, 0.2, red, 0, 0.06, -0.07);
    vcyl(g, 0.022, 0.03, 0.12, VM.white, 0, 0.04, -0.24); vcyl(g, 0.016, 0.016, 0.03, red, 0, 0.04, -0.31);
    for (let i = 0; i < 3; i++) vcyl(g, 0.034, 0.034, 0.01, VM.steel, 0, 0.04, -0.2 - i * 0.03);
    vbox(g, 0.044, 0.14, 0.06, VM.rubber, 0, -0.07, 0.04, -0.25); vcy(g, 0.016, 0.07, red, 0.035, 0.03, 0.02);
    vhand(g, 0, -0.1, 0.05, -0.25);
    return { g, ...vmuzzle(g, 0, 0.04, -0.33, 0.07, 0xff4030), pos: [0.2, -0.17, -0.42], sight: 0.08 };
  },
  saber() {   // a lightsaber: metal hilt and a glowing blade on a pivot so it can swing
    const g = new THREE.Group(), pivot = new THREE.Group(); g.add(pivot);
    vcy(pivot, 0.024, 0.26, VM.steel, 0, 0, 0); for (let i = 0; i < 5; i++) vcy(pivot, 0.027, 0.012, VM.black, 0, -0.08 + i * 0.03, 0);
    vcy(pivot, 0.03, 0.04, VM.metal, 0, 0.14, 0); vbox(pivot, 0.012, 0.03, 0.012, VM.dot, 0.026, 0.02, 0);
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 1.0, 10), new THREE.MeshBasicMaterial({ color: 0xeafcff })); blade.position.y = 0.66; pivot.add(blade);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 1.04, 12), new THREE.MeshBasicMaterial({ color: 0x3aa0ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })); glow.position.y = 0.66; pivot.add(glow);
    pivot.rotation.set(-0.5, 0, -0.35);
    vhand(pivot, 0, -0.04, 0.0, -Math.PI / 2);
    const f = vmuzzle(g, 0, 0, -0.3, 0.01);
    return { g, ...f, pivot, glow, pos: [0.2, -0.3, -0.42], sight: 0.2, swingT: 0 };
  },
};

const WEAPONS = [
  { id: 'pistol', name: 'Pistol', build: 'pistol', type: 'hit', rate: 0.18, spread: 0.008, dmg: 28, force: 5, pellets: 1, recoil: 0.06, sfx: 'pistol', mag: 12, reserve: Infinity, reloadT: 1.1, price: 0, tracer: 0xffe9a0 },
  { id: 'rifle', name: 'Assault Rifle', build: 'rifle', type: 'hit', auto: true, rate: 0.095, spread: 0.014, dmg: 24, force: 5, pellets: 1, recoil: 0.03, sfx: 'rifle', mag: 30, reserve: 210, reloadT: 1.8, price: 0, tracer: 0xffe9a0 },
  { id: 'smg', name: 'SMG', build: 'smg', type: 'hit', auto: true, rate: 0.065, spread: 0.028, dmg: 17, force: 3, pellets: 1, recoil: 0.02, sfx: 'smg', mag: 35, reserve: 245, reloadT: 1.4, price: 250, tracer: 0xffe9a0 },
  { id: 'shotgun', name: 'Shotgun', build: 'shotgun', type: 'hit', rate: 0.85, spread: 0.065, dmg: 15, force: 4, pellets: 10, recoil: 0.16, sfx: 'shotgun', mag: 8, reserve: 48, reloadT: 2.3, price: 350, tracer: 0xffd080 },
  { id: 'sniper', name: 'Sniper Rifle', build: 'sniper', type: 'hit', rate: 1.2, spread: 0.03, dmg: 110, force: 22, pellets: 1, recoil: 0.2, sfx: 'sniper', mag: 5, reserve: 35, reloadT: 2.5, price: 600, zoom: true, tracer: 0xffffff },
  { id: 'minigun', name: 'Minigun', build: 'minigun', type: 'hit', auto: true, spinUp: true, rate: 0.042, spread: 0.035, dmg: 15, force: 4, pellets: 1, recoil: 0.012, sfx: 'minigun', mag: 200, reserve: 400, reloadT: 3.2, price: 1200, tracer: 0xffe9a0 },
  { id: 'rpg', name: 'RPG', build: 'rpg', type: 'rocket', rate: 1.4, recoil: 0.22, sfx: 'rocket', mag: 1, reserve: 9, reloadT: 1.6, price: 900 },
  { id: 'gl', name: 'Grenade Launcher', build: 'grenade', type: 'grenade', rate: 0.6, recoil: 0.1, sfx: 'thump', mag: 6, reserve: 24, reloadT: 2.4, price: 700 },
  { id: 'laser', name: 'Laser Rifle', build: 'laser', type: 'hit', auto: true, laser: true, rate: 0.05, spread: 0, dmg: 9, force: 2.5, pellets: 1, recoil: 0.004, sfx: 'laser', mag: 120, reserve: 360, reloadT: 2, price: 1500, tracer: 0x22e6ff },
  { id: 'mortar', name: 'Mortar', build: 'mortar', type: 'mortar', rate: 1.1, recoil: 0, sfx: 'thump', mag: 4, reserve: 16, reloadT: 2.6, price: 1100 },
  { id: 'm16', name: 'M16', build: 'm16', type: 'hit', burst: 3, rate: 0.36, spread: 0.009, dmg: 30, force: 6, pellets: 1, recoil: 0.035, sfx: 'rifle', mag: 30, reserve: 180, reloadT: 1.9, price: 800, tracer: 0xffe9a0 },
  { id: 'fifty', name: '.50 Cal Rifle', build: 'fifty', type: 'hit', rate: 1.7, spread: 0.03, dmg: 300, force: 45, pellets: 1, recoil: 0.32, sfx: 'sniper', mag: 5, reserve: 25, reloadT: 3.0, price: 2000, zoom: true, tracer: 0xffffff },
  { id: 'golden', name: 'Golden Gun', build: 'golden', type: 'hit', autoAim: true, rate: 0.6, spread: 0.004, dmg: 99999, force: 30, pellets: 1, recoil: 0.12, sfx: 'pistol', mag: 1, reserve: Infinity, reloadT: 1.5, price: 5000, tracer: 0xffd040 },
  { id: 'blaster', name: 'Laser Blaster', build: 'blaster', type: 'hit', laser: true, rate: 0.16, spread: 0.004, dmg: 32, force: 3, pellets: 1, recoil: 0.02, sfx: 'laser', mag: 24, reserve: 240, reloadT: 1.4, price: 900, tracer: 0xff3a30 },
  { id: 'saber', name: 'Lightsaber', build: 'saber', type: 'melee', rate: 0.45, dmg: 160, force: 14, range: 3.6, recoil: 0, sfx: 'click', mag: 1, reserve: Infinity, reloadT: 0.1, price: 1500 },
];
const vmHolder = new THREE.Group(); vmHolder.scale.setScalar(0.8); vmScene.add(vmHolder);
WEAPONS.forEach(w => { w.model = BUILD[w.build](); w.model.g.visible = false; vmHolder.add(w.model.g); });

// ---------- generic hitscan against the world ----------
const raycaster = new THREE.Raycaster();
raycaster.camera = camera;
function aliveCharRoots(excludeTeam) {
  const out = [];
  for (const c of chars) if (c.alive && !c.isPlayer && !c.vehicle && !(c.gv && !c.exposed) && c.team !== excludeTeam && c.model && c.model.root.visible) out.push(c.model.root);
  return out;
}
function propMeshes() { const out = []; for (const p of props) if (!p.exploded) out.push(p.mesh); return out; }
function terrainRay(o, d, maxD) {
  if (undergroundAt(o.x, o.z, o.y - 1.6)) return null;
  let prevT = 0;
  for (let t = 0.5; t <= maxD; t += 1.5) {
    const y = o.y + d.y * t, gh = heightAt(o.x + d.x * t, o.z + d.z * t);
    if (y < gh) {
      let lo = prevT, hi = t;
      for (let i = 0; i < 6; i++) { const m = (lo + hi) / 2; if (o.y + d.y * m < heightAt(o.x + d.x * m, o.z + d.z * m)) hi = m; else lo = m; }
      return hi;
    }
    prevT = t;
  }
  return null;
}
function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z, cc = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - cc;
  if (disc < 0) return null; const t = -b - Math.sqrt(disc); return t > 0 ? t : null;
}
// returns nearest hit {dist, point, char, head, prop, plane, terrain}
const _clownC = new THREE.Vector3();
function rayHit(origin, dir, maxD, shooterTeam, opts = {}) {
  raycaster.set(origin, dir); raycaster.far = maxD;
  const targets = [...solidMeshes, ...propMeshes(), ...buildMeshes()];
  for (const v of gvehicles) if (v.alive && v !== opts.ignoreGV) targets.push(v.model.g);
  if (!opts.noChars) targets.push(...aliveCharRoots(opts.includeOwnTeam ? null : shooterTeam));
  const hits = raycaster.intersectObjects(targets, true);
  let best = null;
  if (hits.length) {
    const h = hits[0], ud = h.object.userData;
    best = { dist: h.distance, point: h.point.clone(), char: ud.char || null, head: !!ud.head, prop: ud.prop || null, build: ud.build || null, gv: ud.gv || null, normal: h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : null };
  }
  const td = terrainRay(origin, dir, best ? best.dist : maxD);
  if (td !== null && (!best || td < best.dist)) best = { dist: td, point: origin.clone().addScaledVector(dir, td), terrain: true };
  if (opts.player && player.alive && player.vehicle && player.vehicle !== opts.ignorePlane) { /* plane handled below */ }
  for (const pl of planes) {
    if (!pl.alive || pl.team === shooterTeam || pl === opts.ignorePlane) continue;
    const t = raySphere(origin, dir, pl.pos, 4.2);
    if (t !== null && t < (best ? best.dist : maxD)) best = { dist: t, point: origin.clone().addScaledVector(dir, t), plane: pl };
  }
  if (typeof CLOWN !== 'undefined' && CLOWN.state && CLOWN.state !== 'leave') {
    for (const [hy, r] of [[2.0, 0.85], [3.0, 0.62]]) {
      const t = raySphere(origin, dir, _clownC.set(CLOWN.pos.x, CLOWN.pos.y + hy, CLOWN.pos.z), r);
      if (t !== null && t < (best ? best.dist : maxD)) best = { dist: t, point: origin.clone().addScaledVector(dir, t), clown: true, head: hy > 2.5 };
    }
  }
  if (typeof civRay === 'function' && civs.length) { const ch = civRay(origin, dir, best ? best.dist : maxD); if (ch) best = { dist: ch.dist, point: origin.clone().addScaledVector(dir, ch.dist), civ: ch.c }; }
  if (typeof animalRay === 'function') { const ah = animalRay(origin, dir, best ? best.dist : maxD); if (ah) best = { dist: ah.dist, point: origin.clone().addScaledVector(dir, ah.dist), animal: ah.a }; }
  // the player can be hit by NPC fire through rayHit only when requested
  if (opts.player && player.alive && !player.vehicle && !player.planeGun) {
    const t = raySphere(origin, dir, player.chest(), 0.75);
    if (t !== null && t < (best ? best.dist : maxD)) best = { dist: t, point: origin.clone().addScaledVector(dir, t), char: player };
  }
  return best;
}
function applyHit(hit, dir, w, shooter) {
  if (!hit) return false;
  let hitEnemy = false;
  if (hit.char && !hit.char.alive) return false;
  if (hit.civ) { civHit(hit.civ, shooter === player); return false; }
  if (hit.animal) { animalHit(hit.animal, w.dmg || 30); return false; }
  if (hit.clown) {
    const dmg = w.dmg * (hit.head ? 2 : 1);
    clownHit(dmg, shooter); if (shooter === player) dmgNumber(hit.point, dmg, hit.head);
    burst(hit.point, 5, [0xff4fa0, 0xffd23f, 0x6ef07a][Math.floor(Math.random() * 3)], 4, 0.4, 0.08);
    return true;
  }
  if (hit.char && (hit.char.team !== shooter.team || hit.char.zombie)) {
    const dmg = w.dmg * (hit.head ? 2 : 1);
    damage(hit.char, dmg, shooter, dir, w.force * 2.5, hit.head);
    if (shooter === player) dmgNumber(hit.point, dmg, hit.head);
    burst(hit.point, 4, TEAM_COLOR[hit.char.team], 3, 0.3, 0.06);
    hitEnemy = true;
  } else if (hit.prop) {
    const pr = hit.prop;
    pr.body.wakeUp();
    pr.body.applyImpulse(new CANNON.Vec3(dir.x * w.force * 1.4, dir.y * w.force * 1.4, dir.z * w.force * 1.4), new CANNON.Vec3(hit.point.x, hit.point.y, hit.point.z));
    if (pr.kind === 'barrel') { pr.hp -= w.dmg / 30; if (pr.hp <= 0) setTimeout(() => explodeBarrel(pr, shooter), 60); }
    burst(hit.point, 3, pr.kind === 'crate' ? 0x8a5a2b : 0xffdd88, 3, 0.4, 0.05);
  } else if (hit.plane) {
    damagePlane(hit.plane, Math.min(w.dmg, 200) * 0.6, shooter);   // the Golden Gun one-shots people, not planes
    burst(hit.point, 5, 0xffdd88, 5, 0.3, 0.05);
    hitEnemy = true;
  } else if (hit.gv) {
    damageVehicle(hit.gv, Math.min(w.dmg || 15, 300) * hit.gv.T.bulletMult, shooter);
    burst(hit.point, 4, 0xffdd88, 4, 0.3, 0.05);
    if (hit.gv.team !== shooter.team) hitEnemy = true;
  } else if (hit.build) {
    damageBuild(hit.build, w.dmg * 0.5, shooter);
    burst(hit.point, 4, 0xc2ad7e, 3, 0.4, 0.06);
  } else {
    burst(hit.point, 4, hit.terrain ? 0x6b5a3e : 0xbbbbbb, 3.5, 0.4, 0.06);
    if (!w.laser) { smokePuff(hit.point, hit.terrain ? 0x9a8460 : 0xaaaaaa, 0.12, 0.6, 0.4); if (!hit.terrain) decal(hit.point, hit.normal); }
  }
  return hitEnemy;
}

// ---------- projectiles ----------
const projectiles = [];
// rockets and balls share their shapes and colours; making new ones for every shot slowly used up graphics memory
const PJ = {
  body: new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), tip: new THREE.ConeGeometry(0.08, 0.22, 8),
  green: new THREE.MeshLambertMaterial({ color: 0x4b5320 }), dark: new THREE.MeshLambertMaterial({ color: 0x333333 }),
  flame: new THREE.MeshBasicMaterial({ color: 0xffaa33 }), shell: new THREE.MeshBasicMaterial({ color: 0xffd060 }),
  ball: new THREE.SphereGeometry(1, 12, 10), ballMats: {},
};
function spawnRocket(origin, dir, owner, opts = {}) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(PJ.body, PJ.green); b.rotation.x = Math.PI / 2; g.add(b);
  const tip = new THREE.Mesh(PJ.tip, PJ.dark); tip.rotation.x = -Math.PI / 2; tip.position.z = -0.34; g.add(tip);
  const fl = new THREE.Mesh(unitSphere, PJ.flame); fl.scale.set(0.07, 0.07, 0.2); fl.position.z = 0.32; g.add(fl);
  g.position.copy(origin); g.lookAt(origin.clone().add(dir)); scene.add(g);
  projectiles.push({ type: 'rocket', mesh: g, vel: dir.clone().multiplyScalar(opts.speed || 42), life: 5, smokeT: 0, owner, homing: !!opts.homing, dmg: opts.dmg || 140, radius: opts.radius || 7, ghost: !!opts.ghost, shell: !!opts.shell });
  if (opts.shell) { b.material = PJ.shell; tip.material = PJ.shell; }
  if (!opts.ghost) netFx(['r', teamIdx(owner.team), ...v3(origin), ...v3(dir, 3), opts.speed || 42, opts.homing ? 1 : 0, opts.radius || 7, opts.shell ? 1 : 0]);
}
// a proper hand grenade: ridged olive body, a grey fuse on top and a red light that blinks faster as it is about to go off
let _grenGeo = null;
function grenadeGeo() {
  if (_grenGeo) return _grenGeo;
  const p = new Part(), O = 0x4f5a2e, D = 0x3a4322;
  const s = new THREE.SphereGeometry(1, 14, 10); s.scale(0.9, 1.15, 0.9); p.add(s, O, 0, 0, 0);
  for (let i = -1; i <= 1; i++) { const t = new THREE.TorusGeometry(0.9 * Math.cos(i * 0.5), 0.07, 5, 18); t.rotateX(Math.PI / 2); p.add(t, D, 0, i * 0.5, 0); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI; p.box(0.06, 2.1, 1.82, D, 0, 0, 0, 0, a, 0); }
  p.cyl(0.32, 0.4, 0.35, 0x8a8f94, 0, 1.25, 0); p.cyl(0.2, 0.2, 0.2, 0x6a6f74, 0, 1.5, 0);
  p.box(0.18, 1.2, 0.12, 0x9a9fa4, 0.55, 0.85, 0, 0, 0, -0.35);                       // the lever
  const ring = new THREE.TorusGeometry(0.28, 0.05, 5, 14); p.add(ring, 0xc0c4c8, -0.45, 1.35, 0, 0, Math.PI / 2, 0);   // pull ring
  _grenGeo = p.build(); return _grenGeo;
}
function spawnBall(origin, vel, owner, opts) {
  const own = opts.type === 'grenade';     // grenades blink, so each has its own colour
  const mat = own ? new THREE.MeshBasicMaterial({ color: 0x2e7d32 }) : PJ.ballMats[opts.color] || (PJ.ballMats[opts.color] = new THREE.MeshLambertMaterial({ color: opts.color }));
  let mesh;
  if (own) {
    mesh = new THREE.Group(); mesh.scale.setScalar(opts.r * 1.05);
    const gb = new THREE.Mesh(grenadeGeo(), VEH_MAT); gb.castShadow = true; mesh.add(gb);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat); light.position.set(0, 1.62, 0); mesh.add(light);
    mesh.material = mat;
  } else { mesh = new THREE.Mesh(PJ.ball, mat); mesh.scale.setScalar(opts.r); }
  if (opts.bomb) { mesh.scale.set(opts.r, opts.r, opts.r * 2.2); }
  mesh.castShadow = true; mesh.position.copy(origin); scene.add(mesh);
  const body = new CANNON.Body({ mass: opts.mass, shape: new CANNON.Sphere(opts.r), linearDamping: 0.02 });
  body.position.set(origin.x, origin.y, origin.z); body.velocity.set(vel.x, vel.y, vel.z);
  if (undergroundAt(origin.x, origin.z, origin.y - 1.5)) { body.collisionFilterMask = 1; body.underground = true; }
  world.addBody(body);
  const pr = { ownMat: own ? mat : null, type: opts.type, mesh, body, life: opts.fuse, owner, radius: opts.radius || 6, dmg: opts.dmg || 120, power: opts.power || 32, impact: !!opts.impact, ghost: !!opts.ghost };
  if (!opts.ghost) netFx(['b', teamIdx(owner.team), ...v3(origin), ...v3(vel), opts.type === 'bomb' ? 1 : 0, opts.fuse, pr.radius]);
  if (pr.impact) body.addEventListener('collide', () => { if (pr.life > 0.02 && pr.age > 0.05) pr.life = 0.01; });
  pr.age = 0;
  projectiles.push(pr);
}
function v3(v, d = 1) { return [+v.x.toFixed(d), +v.y.toFixed(d), +v.z.toFixed(d)]; }
function removeProjectile(pr) {
  const i = projectiles.indexOf(pr); if (i >= 0) projectiles.splice(i, 1);
  scene.remove(pr.mesh); if (pr.body) world.removeBody(pr.body); if (pr.ownMat) pr.ownMat.dispose();
}
const _fwd = new THREE.Vector3();
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    pr.life -= dt; pr.age = (pr.age || 0) + dt;
    if (pr.type === 'rocket') {
      if (pr.homing) {
        let best = null, bd = 260;
        for (const pl of planes) {
          if (!pl.alive || pl.team === pr.owner.team) continue;
          const to = pl.pos.clone().sub(pr.mesh.position); const d = to.length();
          if (d < bd && to.normalize().dot(_fwd.copy(pr.vel).normalize()) > 0.5) { bd = d; best = pl; }
        }
        if (best) {
          const sp = pr.vel.length();
          const want = best.pos.clone().sub(pr.mesh.position).normalize().multiplyScalar(sp);
          pr.vel.lerp(want, Math.min(1, dt * 2.6)).setLength(sp);
          pr.mesh.lookAt(pr.mesh.position.clone().add(pr.vel));
          if (bd < 4.5) { const at = pr.mesh.position.clone(); removeProjectile(pr); explosion(at, pr.radius, 30, pr.owner, pr.dmg, pr.ghost); continue; }
        }
      }
      const step = pr.vel.clone().multiplyScalar(dt), len = step.length(), dir = step.clone().normalize();
      const hit = rayHit(pr.mesh.position, dir, len + 0.4, pr.owner.team, { player: pr.owner.team !== player.team, includeRemote: true });
      pr.smokeT -= dt;
      if (pr.smokeT <= 0 && !pr.shell) { pr.smokeT = 0.025; smokePuff(pr.mesh.position.clone(), 0xc8c8c8, 0.16, 0.9, 0.3); }
      if (hit || pr.life <= 0) {
        const at = hit ? hit.point.clone().addScaledVector(dir, -0.3) : pr.mesh.position.clone();
        removeProjectile(pr); explosion(at, pr.radius, 34, pr.owner, pr.dmg, pr.ghost);
      } else pr.mesh.position.add(step);
    } else {
      pr.mesh.position.copy(pr.body.position); pr.mesh.quaternion.copy(pr.body.quaternion);
      if (pr.type === 'bomb') { const v = pr.body.velocity; pr.mesh.lookAt(pr.mesh.position.x + v.x, pr.mesh.position.y + v.y, pr.mesh.position.z + v.z); if (pr.mesh.position.y < heightAt(pr.mesh.position.x, pr.mesh.position.z) + 0.6) pr.life = 0; }
      if (pr.type === 'grenade') {
        pr.mesh.material.color.setHex(Math.floor(pr.life * (pr.life < 1 ? 14 : 6)) % 2 ? 0x2e7d32 : 0xff3333);
        pr.trT = (pr.trT || 0) - dt; if (pr.trT <= 0 && pr.body.velocity.length() > 3) { pr.trT = 0.04; smokePuff(pr.mesh.position.clone(), 0xb8b8b8, 0.08, 0.5, 0.2); }   // a thin fuse trail while it flies
      }
      if (pr.life <= 0) { const at = pr.mesh.position.clone(); removeProjectile(pr); explosion(at, pr.radius, pr.power, pr.owner, pr.dmg, pr.ghost); if (pr.type === 'bomb' && typeof makeCrater === 'function') makeCrater(at, pr.radius); }
    }
  }
}
