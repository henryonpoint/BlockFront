// ===================== vmodels.js : detailed jeeps, tanks, trucks, quads and planes =====================
// Like the soldiers, each vehicle is a handful of merged, vertex-coloured meshes: lots of detail, few draw calls.
// Front of every ground vehicle is -Z.
const VEH_MAT = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 22, specular: 0x2a2a2a });
const VEH_GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });
const VPAINT = {
  blue: { a: 0x53698a, b: 0x3c4e69, c: 0x6b83a6, team: 0x2f6fe0, acc: 0x9cc4ff },
  red: { a: 0x86563f, b: 0x633d2c, c: 0xa26e52, team: 0xd93a3a, acc: 0xffa598 },
  green: { a: 0x55704a, b: 0x3e5536, c: 0x6d8a60, team: 0x2fa84f, acc: 0xa0f0b4 },
  yellow: { a: 0x8a7a4a, b: 0x665a36, c: 0xa6955e, team: 0xe0b020, acc: 0xffe9a0 },
};
const VC = { tire: 0x18181a, tire2: 0x26262a, hub: 0x8a8f94, steel: 0x6e747b, dark: 0x25282c, dark2: 0x3a3e44, seat: 0x3a2c22, wood: 0x8a6238, olive: 0x4f5536, canvas: 0x777a55, lamp: 0xfff4c0, tail: 0xff3b2a, amber: 0xffa726, white: 0xe9ecef, black: 0x111214, rust: 0x5a4334 };
const vgeo = {};
function vcached(key, make) { return vgeo[key] || (vgeo[key] = make().build()); }
const RX = Math.PI / 2;

// a chunky off-road wheel (axis along X): tyre with tread blocks, rim, lug nuts
function wheelGeo(r, w) {
  return vcached('wheel' + r + '_' + w, () => {
    const p = new Part();
    p.cyl(r, r, w, VC.tire, 0, 0, 0, 0, 0, RX, 1, 18);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; p.box(w * 1.04, r * 0.16, r * 0.2, VC.tire2, 0, Math.cos(a) * r * 0.99, Math.sin(a) * r * 0.99, a, 0, 0); }
    for (const s of [-1, 1]) {
      p.cyl(r * 0.62, r * 0.62, 0.03, VC.hub, s * (w / 2 + 0.005), 0, 0, 0, 0, RX, 1, 12);
      p.cyl(r * 0.2, r * 0.2, 0.06, VC.dark, s * (w / 2 + 0.02), 0, 0, 0, 0, RX, 1, 8);
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; p.box(0.04, r * 0.09, r * 0.09, VC.steel, s * (w / 2 + 0.02), Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42); }
    }
    return p;
  });
}
// a flat five-point star lying on its back, for team markings
function starGeo(r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.42 : r; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return g;
}
// a heavy .50 cal machine gun pointing down -Z, used on every vehicle gun mount
function hmgGeo(shield, P) {
  return vcached('hmg' + shield + P.a, () => {
    const p = new Part();
    p.box(0.22, 0.24, 0.85, VC.dark, 0, 0, -0.1); p.box(0.24, 0.05, 0.6, VC.dark2, 0, 0.145, -0.2);                 // receiver, feed cover
    for (let i = 0; i < 4; i++) p.box(0.235, 0.02, 0.04, VC.black, 0, 0.17, -0.42 + i * 0.1);                     // cover ribs
    p.box(0.18, 0.18, 0.12, VC.dark2, 0, 0, 0.37); for (const s of [-1, 1]) p.cyl(0.028, 0.028, 0.22, VC.black, 0.09 * s, -0.02, 0.5, RX);   // backplate, spade grips
    p.box(0.1, 0.04, 0.05, VC.steel, 0, -0.02, 0.44);                                                           // butterfly trigger
    p.cyl(0.085, 0.085, 0.75, VC.dark2, 0, 0.01, -0.86, RX, 0, 0, 1, 10);                                      // barrel jacket
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) p.box(0.03, 0.04, 0.05, VC.black, 0.075 * s, 0.03, -0.6 - i * 0.1);   // cooling holes
    for (let i = 0; i < 6; i++) p.box(0.03, 0.03, 0.05, VC.black, 0, 0.095, -0.6 - i * 0.1);
    p.cyl(0.045, 0.045, 0.55, VC.dark, 0, 0.01, -1.5, RX); p.cyl(0.08, 0.055, 0.2, VC.dark, 0, 0.01, -1.85, RX, 0, 0, 1, 10);   // barrel, flash hider
    p.cyl(0.02, 0.02, 0.3, VC.steel, 0, 0.17, -0.86, RX); for (const z of [-0.74, -0.98]) p.box(0.03, 0.08, 0.03, VC.steel, 0, 0.12, z);   // carry handle
    p.box(0.02, 0.07, 0.03, VC.dark, 0, 0.11, -1.72); p.box(0.06, 0.08, 0.02, VC.dark, 0, 0.18, 0.15);           // front and rear sight
    p.box(0.26, 0.24, 0.38, VC.olive, -0.28, -0.04, -0.15); p.box(0.27, 0.03, 0.16, VC.dark, -0.28, 0.09, -0.15);   // ammo can
    for (let i = 0; i < 5; i++) p.cyl(0.018, 0.018, 0.1, 0xd9a441, -0.14 + 0.012 * i, 0.06 - 0.012 * i, -0.08 - i * 0.04, 0, 0, RX);   // brass belt
    p.box(0.08, 0.14, 0.12, VC.dark, 0, -0.16, -0.05); p.cyl(0.05, 0.05, 0.12, VC.steel, 0, -0.25, -0.05);       // cradle and pintle
    if (shield) {
      p.box(0.62, 0.55, 0.05, P.a, 0, 0.12, -0.62); p.box(0.04, 0.13, 0.06, VC.black, 0, 0.08, -0.62);            // centre shield with gun slot
      for (const s of [-1, 1]) { p.box(0.32, 0.5, 0.05, P.b, 0.44 * s, 0.1, -0.56, 0, -0.45 * s, 0); p.box(0.16, 0.05, 0.08, VC.black, 0.18 * s, 0.33, -0.62); }   // angled wings, vision slots
      p.box(0.62, 0.05, 0.06, P.team, 0, 0.375, -0.62);                                                          // team stripe along the top
      for (const x of [-0.25, 0.25]) for (const y of [-0.1, 0.32]) p.ball(0.018, VC.steel, x, y, -0.65);           // rivets
    }
    return p;
  });
}
function mgGeo(shield, P) {
  return vcached('mg' + shield + P.a, () => {
    const p = new Part();
    p.box(0.16, 0.2, 0.7, VC.dark, 0, 0, -0.15); p.box(0.1, 0.1, 0.25, VC.dark2, 0, 0.02, 0.3);
    p.cyl(0.05, 0.05, 0.6, VC.dark2, 0, 0.01, -0.75, RX); for (let i = 0; i < 5; i++) p.cyl(0.058, 0.058, 0.03, VC.dark, 0, 0.01, -0.55 - i * 0.1, RX);
    p.cyl(0.03, 0.03, 0.4, VC.dark, 0, 0.01, -1.2, RX); p.cyl(0.045, 0.045, 0.1, VC.dark, 0, 0.01, -1.4, RX);
    p.box(0.22, 0.2, 0.3, VC.olive, -0.2, -0.06, -0.1); p.box(0.06, 0.03, 0.3, VC.steel, -0.07, 0.06, -0.1);   // ammo box and belt
    for (const s of [-1, 1]) p.cyl(0.02, 0.02, 0.2, VC.dark, 0.09 * s, -0.02, 0.42, RX);                       // spade grips
    if (shield) { for (const s of [-1, 1]) p.box(0.32, 0.5, 0.05, P.a, 0.21 * s, 0.08, -0.5, 0, -0.15 * s, 0); p.box(0.12, 0.2, 0.05, P.a, 0, 0.26, -0.5); }
    return p;
  });
}
function makeVehicleModel(type, team) {
  const P = VPAINT[team], g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const wheels = [], out = { g, body, wheels };
  const mesh = (geo, mat, parent = body, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const wheel = (x, y, z, r, w) => { wheels.push(mesh(wheelGeo(r, w), VEH_MAT, body, x, y, z)); };
  const glass = new Part(), glow = new Part();
  let main;

  if (type === 'jeep') {
    main = vcached('jeep' + team, () => {
      const p = new Part();
      p.box(1.86, 0.5, 3.9, P.a, 0, 0.86, 0); p.box(1.6, 0.14, 3.7, VC.dark, 0, 0.56, 0);                 // tub, underside
      p.box(1.72, 0.3, 1.25, P.a, 0, 1.25, -1.36); p.box(1.3, 0.05, 1.0, P.b, 0, 1.41, -1.36); p.box(0.36, 0.03, 1.0, P.team, 0, 1.44, -1.36);   // hood with stripe
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) p.box(0.22, 0.02, 0.05, VC.dark, 0.5 * s, 1.415, -1.6 + i * 0.12);                  // hood vents
      p.box(1.3, 0.42, 0.08, VC.dark, 0, 1.08, -2.0); for (let i = 0; i < 7; i++) p.box(0.07, 0.4, 0.05, P.c, -0.48 + i * 0.16, 1.08, -2.03);   // grille
      for (const s of [-1, 1]) {
        p.box(0.34, 0.1, 1.2, P.b, 0.99 * s, 1.16, -1.36); p.box(0.34, 0.3, 0.1, P.b, 0.99 * s, 1.03, -1.96, -0.4); p.box(0.34, 0.26, 0.1, P.b, 0.99 * s, 1.05, -0.78, 0.5);   // front arch
        p.box(0.34, 0.1, 1.2, P.b, 0.99 * s, 1.16, 1.36); p.box(0.34, 0.3, 0.1, P.b, 0.99 * s, 1.03, 0.76, -0.5); p.box(0.34, 0.26, 0.1, P.b, 0.99 * s, 1.05, 1.94, 0.4);      // rear arch
        p.cyl(0.14, 0.14, 0.1, VC.dark, 0.72 * s, 1.2, -2.0, RX); p.box(0.3, 0.07, 0.8, VC.dark2, 1.02 * s, 0.66, 0);     // lamp bucket, side step
        p.box(0.06, 0.34, 1.5, P.b, 0.93 * s, 1.28, 0.9);                                                                // rear side rail
        p.cyl(0.035, 0.035, 1.5, VC.dark, 0.86 * s, 1.95, -0.62, -0.25); p.cyl(0.035, 0.035, 1.55, VC.dark, 0.86 * s, 1.92, 0.5);   // windscreen post, roll hoop post
        p.cyl(0.035, 0.035, 1.25, VC.dark, 0.86 * s, 2.68, -0.1, RX); p.cyl(0.035, 0.035, 1.5, VC.dark, 0.86 * s, 2.0, 1.25, RX + 0.95);   // roof rail, rear brace
        p.box(0.1, 0.08, 0.06, VC.dark, 1.0 * s, 1.75, -0.72);                                                           // mirror
      }
      p.cyl(0.035, 0.035, 1.72, VC.dark, 0, 2.68, -0.72, 0, 0, RX); p.cyl(0.035, 0.035, 1.72, VC.dark, 0, 2.68, 0.5, 0, 0, RX); p.box(1.76, 0.07, 0.07, VC.dark, 0, 1.36, -0.5);   // cross bars, screen base
      for (const s of [-0.45, 0.45]) p.cyl(0.07, 0.07, 0.06, VC.dark, s, 2.74, -0.72, RX);                                 // roof lights housings
      p.box(1.7, 0.3, 0.3, VC.dark2, 0, 1.3, -0.66); p.box(0.3, 0.12, 0.05, VC.black, -0.45, 1.36, -0.5);                    // dash
      p.add(new THREE.TorusGeometry(0.17, 0.025, 6, 14), VC.black, -0.45, 1.52, -0.42, -0.5); p.cyl(0.02, 0.02, 0.3, VC.dark, -0.45, 1.42, -0.52, 1.0);   // steering wheel
      for (const [x, z] of [[-0.45, -0.05], [0.45, -0.05], [0.45, 1.0]]) { p.box(0.56, 0.16, 0.56, VC.seat, x, 1.18, z); p.box(0.56, 0.62, 0.12, VC.seat, x, 1.52, z + 0.3, -0.08); p.box(0.3, 0.16, 0.1, VC.seat, x, 1.92, z + 0.33); }
      p.box(0.1, 0.5, 0.1, VC.dark, 0, 1.3, -0.1); p.ball(0.05, VC.black, 0, 1.58, -0.1);                                    // gear stick
      p.box(1.96, 0.16, 0.22, VC.dark, 0, 0.7, -2.1); p.cyl(0.1, 0.1, 0.5, VC.steel, 0, 0.74, -2.2, 0, 0, RX); for (const s of [-1, 1]) p.box(0.08, 0.14, 0.14, VC.amber, 0.7 * s, 0.82, -2.18);   // bumper, winch, hooks
      p.box(1.96, 0.14, 0.16, VC.dark, 0, 0.7, 2.0);
      for (const s of [-1, 1]) { p.box(0.2, 0.46, 0.34, VC.olive, 0.62 * s, 1.22, 2.1); p.box(0.08, 0.06, 0.1, VC.dark, 0.62 * s, 1.47, 2.1); }   // jerry cans
      p.cyl(0.015, 0.015, 2.0, VC.dark, -0.84, 2.4, 1.85); p.box(0.02, 0.3, 0.46, P.team, -0.84, 3.2, 2.08);                  // whip antenna and pennant
      p.box(0.06, 0.06, 1.0, VC.wood, 0.9, 1.36, -1.3); p.box(0.16, 0.03, 0.22, VC.steel, 0.9, 1.36, -1.85);                  // shovel on the wing
      p.cyl(0.07, 0.09, 1.08, VC.dark, 0, 1.62, 1.35); p.cyl(0.3, 0.3, 0.05, VC.dark2, 0, 2.14, 1.35, 0, 0, 0, 1, 12); for (const s of [-1, 1]) p.cyl(0.03, 0.03, 0.9, VC.dark, 0.25 * s, 1.65, 1.35, 0, 0, -0.25 * s);   // tall gun post with braces          // gun pedestal and ring
      for (const z of [-1.35, 1.35]) { p.cyl(0.06, 0.06, 1.9, VC.dark, 0, 0.45, z, 0, 0, RX); p.ball(0.16, VC.dark2, 0, 0.45, z); }   // axles
      p.cyl(0.05, 0.05, 2.7, VC.dark, 0, 0.5, 0, RX);
      // camo patches over the paint
      for (const [x, y, z, w, d] of [[0.94, 0.9, -0.3, 0.02, 0.9], [-0.94, 0.95, 0.6, 0.02, 1.1], [0.94, 0.8, 1.2, 0.02, 0.6], [-0.94, 0.8, -0.9, 0.02, 0.5]]) p.box(w, 0.26, d, P.b, x, y, z);
      p.box(0.5, 0.012, 0.42, P.b, 0.42, 1.418, -1.1); p.box(0.4, 0.012, 0.3, P.b, -0.5, 1.418, -1.6);
      // team star on the hood
      p.cyl(0.28, 0.28, 0.012, VC.white, 0, 1.45, -1.25, 0, 0, 0, 1, 16); p.add(starGeo(0.24), P.team, 0, 1.458, -1.25, 0, Math.PI, 0);
      // armoured doors with rivets
      for (const s of [-1, 1]) {
        p.box(0.07, 0.55, 1.15, P.c, 0.99 * s, 1.08, -0.1); p.box(0.08, 0.06, 1.15, VC.dark, 1.0 * s, 1.37, -0.1);
        for (const z of [-0.6, -0.1, 0.4]) for (const y of [0.88, 1.28]) p.ball(0.025, VC.steel, 1.03 * s, y, z);
        p.box(0.5, 0.08, 1.35, VC.black, 1.03 * s, 1.2, -1.36); p.box(0.5, 0.08, 1.35, VC.black, 1.03 * s, 1.2, 1.36);   // chunky fender flares
      }
      // brush guard
      for (const s of [-1, 1]) { p.cyl(0.04, 0.04, 0.7, VC.black, 0.62 * s, 1.0, -2.28); p.cyl(0.04, 0.04, 0.35, VC.black, 0.62 * s, 1.3, -2.18, -0.6); }
      p.cyl(0.04, 0.04, 1.3, VC.black, 0, 1.32, -2.28, 0, 0, RX); p.cyl(0.04, 0.04, 1.3, VC.black, 0, 0.98, -2.28, 0, 0, RX);
      for (const s of [-1, 1]) p.box(0.08, 0.06, 0.32, VC.black, 0.72 * s, 1.2, -2.12);                           // headlight cages
      // snorkel up the right pillar
      p.cyl(0.07, 0.07, 1.3, VC.black, 0.98, 1.85, -0.75, -0.25); p.box(0.18, 0.14, 0.22, VC.black, 0.98, 2.5, -0.95);
      // roof light bar
      p.box(1.5, 0.12, 0.16, VC.black, 0, 2.78, -0.74);
      // ammo crates and sandbags around the gunner
      for (const s of [-1, 1]) { p.box(0.42, 0.26, 0.3, VC.olive, 0.62 * s, 1.24, 1.62); p.box(0.44, 0.04, 0.32, VC.dark, 0.62 * s, 1.38, 1.62); p.box(0.08, 0.06, 0.06, VC.amber, 0.62 * s, 1.24, 1.45); }
      for (let i = 0; i < 3; i++) p.add(new THREE.SphereGeometry(0.2, 8, 6), 0xa8935f, -0.55 + i * 0.55, 1.2, 1.95, 0, 0, 0, 1.3, 0.55, 0.8);
      // rolled camo net on the hood front
      p.cyl(0.13, 0.13, 1.3, 0x5b6438, 0, 1.5, -1.85, 0, 0, RX, 1, 8);
      return p;
    });
    glass.box(1.66, 0.82, 0.04, 0, 0, 1.82, -0.6, -0.25);
    for (let i = 0; i < 5; i++) glow.cyl(0.042, 0.042, 0.03, VC.lamp, -0.6 + i * 0.3, 2.78, -0.83, RX);
    for (const s of [-0.72, 0.72]) glow.cyl(0.115, 0.115, 0.05, VC.lamp, s, 1.2, -2.06, RX, 0, 0, 1, 12);
    for (const s of [-0.45, 0.45]) glow.cyl(0.055, 0.055, 0.03, VC.lamp, s, 2.74, -0.76, RX);
    for (const s of [-0.8, 0.8]) glow.box(0.16, 0.1, 0.04, VC.tail, s, 0.98, 1.97);
    mesh(wheelGeo(0.5, 0.38), VEH_MAT, body, 0, 1.3, 2.18).rotation.y = RX;
    for (const [x, z] of [[-1.04, -1.35], [1.04, -1.35], [-1.04, 1.35], [1.04, 1.35]]) wheel(x, 0.5, z, 0.5, 0.42);
    const mgYaw = new THREE.Group(); mgYaw.position.set(0, 2.32, 1.35); body.add(mgYaw);
    const mgPitch = new THREE.Group(); mgYaw.add(mgPitch); mesh(hmgGeo(true, P), VEH_MAT, mgPitch);
    const mz = new THREE.Object3D(); mz.position.z = -1.95; mgPitch.add(mz);
    Object.assign(out, { mgYaw, mgPitch, mgMuzzle: mz, mgBase: 2.32 });

  } else if (type === 'tank') {
    main = vcached('tank' + team, () => {
      const p = new Part();
      p.box(2.5, 0.85, 5.5, P.a, 0, 1.12, 0.1); p.box(2.5, 0.75, 1.5, P.a, 0, 1.0, -2.95, 0.62); p.box(2.5, 0.5, 1.0, P.b, 0, 0.72, -3.2, -0.5);   // hull, sloped glacis, lower nose
      p.box(3.36, 0.1, 6.3, P.a, 0, 1.36, 0); p.box(2.4, 0.16, 2.0, P.b, 0, 1.52, 2.0);                                              // deck, raised engine cover
      for (let i = 0; i < 7; i++) p.box(1.9, 0.04, 0.12, VC.dark, 0, 1.62, 1.25 + i * 0.25);                                          // engine grille
      for (const s of [-1, 1]) {
        // track run: flat bottom, rounded ends, links
        p.box(0.7, 0.72, 5.2, VC.dark, 1.36 * s, 0.56, 0); p.cyl(0.47, 0.47, 0.7, VC.dark, 1.36 * s, 0.6, -2.75, 0, 0, RX, 1, 12); p.cyl(0.47, 0.47, 0.7, VC.dark, 1.36 * s, 0.6, 2.75, 0, 0, RX, 1, 12);
        for (let i = 0; i < 22; i++) { p.box(0.74, 0.06, 0.14, VC.dark2, 1.36 * s, 0.95, -2.7 + i * 0.257); p.box(0.74, 0.06, 0.14, VC.dark2, 1.36 * s, 0.14, -2.7 + i * 0.257); }
        for (let i = 0; i < 5; i++) { const a = -0.3 - i * 0.55; p.box(0.74, 0.06, 0.14, VC.dark2, 1.36 * s, 0.6 - Math.cos(a) * 0.47 * -1, -2.75 + Math.sin(a) * 0.47, a, 0, 0); p.box(0.74, 0.06, 0.14, VC.dark2, 1.36 * s, 0.6 + Math.cos(a) * 0.47, 2.75 - Math.sin(a) * 0.47, -a, 0, 0); }
        p.cyl(0.4, 0.4, 0.2, VC.steel, 1.72 * s, 0.62, 2.75, 0, 0, RX, 1, 10); p.cyl(0.36, 0.36, 0.2, P.b, 1.72 * s, 0.62, -2.75, 0, 0, RX, 1, 10);     // sprocket, idler
        for (let i = 0; i < 3; i++) p.cyl(0.13, 0.13, 0.2, VC.steel, 1.72 * s, 1.02, -1.5 + i * 1.5, 0, 0, RX);                                    // return rollers
        // side skirts in panels, mud guards
        for (let i = 0; i < 5; i++) p.box(0.07, 0.5, 1.12, i % 2 ? P.b : P.a, 1.74 * s, 1.08, -2.4 + i * 1.2);
        p.box(0.72, 0.06, 0.7, P.b, 1.36 * s, 1.34, -3.05, 0.5); p.box(0.72, 0.06, 0.6, P.b, 1.36 * s, 1.3, 3.2, -0.4);
        p.cyl(0.13, 0.13, 0.12, VC.dark, 1.0 * s, 1.52, -2.95, RX); p.box(0.3, 0.04, 0.3, VC.dark, 1.0 * s, 1.68, -2.95);                           // headlamp with guard
        p.cyl(0.1, 0.1, 0.9, VC.rust, 0.95 * s, 1.5, 3.05, 0, 0, RX); p.cyl(0.07, 0.07, 0.5, VC.dark, 0.6 * s, 1.72, 2.9, RX);                        // exhaust, pipe
        p.cyl(0.28, 0.28, 0.9, VC.olive, 0.62 * s, 1.34, 3.42, 0, 0, RX, 1, 10); for (const k of [-0.25, 0.25]) p.cyl(0.29, 0.29, 0.05, VC.dark, (0.62 + k) * s, 1.34, 3.42, 0, 0, RX, 1, 10);   // fuel drums
        p.box(0.9, 0.16, 0.32, VC.olive, 1.2 * s, 1.5, 0.6); p.box(0.08, 0.05, 1.3, VC.wood, 1.3 * s, 1.44, -1.2);                                    // tool box, pry bar
      }
      for (let i = 0; i < 5; i++) p.box(0.34, 0.07, 0.22, VC.dark2, -0.8 + i * 0.4, 1.3, -2.72, 0.62);                                              // spare track links
      p.box(0.5, 0.2, 0.1, VC.dark, -0.6, 1.5, -1.9); p.box(0.4, 0.06, 0.4, P.b, 0.7, 1.44, -1.6);                                                   // driver periscope, hatch
      p.cyl(0.03, 0.03, 2.2, VC.steel, 0, 1.44, -3.45, 0, 0, RX);                                                                               // tow cable
      return p;
    });
    for (const s of [-1.0, 1.0]) glow.cyl(0.1, 0.1, 0.03, VC.lamp, s, 1.52, -3.02, RX);
    for (const s of [-1.5, 1.5]) glow.box(0.14, 0.1, 0.04, VC.tail, s, 1.2, 3.52);
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
      const w = mesh(vcached('roadwheel' + team, () => { const p = new Part(); p.cyl(0.36, 0.36, 0.22, VC.dark, 0, 0, 0, 0, 0, RX, 1, 12); p.cyl(0.3, 0.3, 0.26, P.b, 0, 0, 0, 0, 0, RX, 1, 12); p.cyl(0.1, 0.1, 0.3, VC.steel, 0, 0, 0, 0, 0, RX); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; p.box(0.28, 0.05, 0.05, VC.steel, 0, Math.cos(a) * 0.2, Math.sin(a) * 0.2); } return p; }), VEH_MAT, body, s * 1.72, 0.44, -2.1 + i * 0.84);
      wheels.push(w);
    }
    const turret = new THREE.Group(); turret.position.set(0, 1.6, 0.2); body.add(turret);
    mesh(vcached('turret' + team, () => {
      const p = new Part();
      p.cyl(1.32, 1.52, 0.8, P.a, 0, 0.42, 0.05, 0, Math.PI / 8, 0, 1.22, 8);                                    // cast turret
      p.box(1.5, 0.66, 0.9, P.a, 0, 0.42, -1.45, 0.12); p.box(1.1, 0.5, 0.3, P.b, 0, 0.44, -1.95);                   // cheeks, mantlet
      p.box(1.7, 0.5, 1.0, P.b, 0, 0.5, 1.75); for (let i = 0; i < 5; i++) p.cyl(0.02, 0.02, 0.5, VC.dark, -0.8 + i * 0.4, 0.55, 2.3);   // bustle and rack bars
      p.box(1.7, 0.03, 0.03, VC.dark, 0, 0.8, 2.3); p.box(0.7, 0.3, 0.4, VC.olive, -0.4, 0.92, 1.8); p.cyl(0.14, 0.14, 0.8, VC.canvas, 0.35, 0.9, 1.95, 0, 0, RX);   // stowage
      p.cyl(0.42, 0.46, 0.3, P.b, 0.55, 0.95, 0.7, 0, 0, 0, 1, 10); p.cyl(0.36, 0.36, 0.06, VC.dark, 0.55, 1.4, 1.05, -1.2, 0, 0, 1, 10);   // cupola with open hatch
      for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45; p.box(0.14, 0.08, 0.06, VC.dark, 0.55 + Math.sin(a) * 0.45, 1.06, 0.7 - Math.cos(a) * 0.45, 0, -a, 0); }   // vision blocks
      p.cyl(0.34, 0.34, 0.06, P.b, -0.6, 0.86, 0.6, 0, 0, 0, 1, 10); p.box(0.2, 0.05, 0.08, VC.dark, -0.6, 0.9, 0.6);                              // loader hatch
      p.box(0.9, 0.04, 0.9, P.team, 0, 0.845, -0.35); p.box(0.5, 0.045, 0.5, P.acc, 0, 0.85, -0.35);                                            // air recognition panel
      for (const s of [-1, 1]) {
        for (let i = 0; i < 3; i++) p.cyl(0.07, 0.07, 0.3, VC.dark, 1.42 * s, 0.6 + i * 0.01, -0.5 + i * 0.22, RX - 0.5, 0, -0.5 * s);             // smoke launchers
        p.box(0.04, 0.2, 1.0, P.team, 1.54 * s, 0.5, 0.5, 0, 0, 0.12 * s);                                                                    // team stripe
        p.cyl(0.012, 0.012, 2.0, VC.dark, 0.9 * s, 1.8, 1.6);                                                                                 // antennas
      }
      p.box(0.3, 0.2, 0.3, VC.dark, -0.5, 0.92, -0.9); p.box(0.22, 0.12, 0.02, 0x58c8ff, -0.5, 0.93, -1.06);                                    // gunner sight
      p.cyl(0.36, 0.36, 0.22, P.b, -1.5, 0.45, 0.9, 0, 0, RX, 1, 12);                                                                         // spare road wheel
      return p;
    }), VEH_MAT, turret);
    const barrel = new THREE.Group(); barrel.position.set(0, 0.45, -1.8); turret.add(barrel);
    mesh(vcached('barrel' + team, () => {
      const p = new Part();
      p.cyl(0.3, 0.34, 0.5, P.b, 0, 0, -0.3, RX, 0, 0, 1, 10); p.cyl(0.13, 0.15, 3.3, VC.dark2, 0, 0, -2.0, RX, 0, 0, 1, 12);
      p.cyl(0.2, 0.2, 0.8, P.b, 0, 0, -1.7, RX, 0, 0, 1, 12); for (const z of [-0.9, -2.5, -3.0]) p.cyl(0.165, 0.165, 0.06, VC.dark, 0, 0, z, RX, 0, 0, 1, 12);   // fume extractor, bands
      p.box(0.4, 0.3, 0.5, VC.dark, 0, 0, -3.72); for (const s of [-1, 1]) p.box(0.06, 0.16, 0.3, VC.black, 0.2 * s, 0, -3.72);                     // muzzle brake
      p.cyl(0.035, 0.035, 0.7, VC.dark, 0.3, 0.05, -0.75, RX);                                                                                // coaxial gun
      return p;
    }), VEH_MAT, barrel);
    const cmz = new THREE.Object3D(); cmz.position.z = -3.95; barrel.add(cmz);
    const mgYaw = new THREE.Group(); mgYaw.position.set(0.55, 1.15, 0.6); turret.add(mgYaw);
    const mgPitch = new THREE.Group(); mgYaw.add(mgPitch); mesh(hmgGeo(true, P), VEH_MAT, mgPitch);
    const mz = new THREE.Object3D(); mz.position.z = -1.95; mgPitch.add(mz);
    Object.assign(out, { turret, barrel, cannonMuzzle: cmz, mgYaw, mgPitch, mgMuzzle: mz });

  } else if (type === 'quad') {
    main = vcached('quad' + team, () => {
      const p = new Part();
      p.box(0.5, 0.3, 1.7, VC.dark, 0, 0.55, 0); p.box(0.44, 0.28, 0.5, VC.steel, 0, 0.56, 0.1);                            // frame, engine
      p.box(0.56, 0.22, 0.6, P.a, 0, 0.9, -0.42, -0.15); p.cyl(0.06, 0.06, 0.04, VC.dark, 0.12, 1.03, -0.45);                // tank and cap
      p.box(0.46, 0.14, 1.0, VC.seat, 0, 0.9, 0.4); p.box(0.46, 0.1, 0.3, VC.seat, 0, 0.97, 0.82, -0.3);                      // seat with a kick-up
      for (const s of [-1, 1]) {
        p.box(0.42, 0.06, 0.74, P.a, 0.52 * s, 0.86, -0.72, 0, 0, -0.12 * s); p.box(0.42, 0.2, 0.06, P.a, 0.52 * s, 0.78, -1.08, 0.5);     // front fender
        p.box(0.42, 0.06, 0.74, P.a, 0.52 * s, 0.86, 0.74, 0, 0, -0.12 * s); p.box(0.42, 0.2, 0.06, P.a, 0.52 * s, 0.78, 1.1, -0.5);       // rear fender
        p.box(0.2, 0.05, 0.4, VC.dark2, 0.42 * s, 0.5, 0.05);                                                                       // foot board
        p.cyl(0.025, 0.025, 0.5, VC.steel, 0.38 * s, 0.42, -0.7, 0, 0, RX + 0.3 * s); p.cyl(0.025, 0.025, 0.5, VC.steel, 0.38 * s, 0.42, 0.72, 0, 0, RX + 0.3 * s);   // suspension arms
        p.cyl(0.03, 0.03, 0.34, 0xd9a441, 0.4 * s, 0.62, -0.7, 0.3, 0, 0.5 * s); p.cyl(0.03, 0.03, 0.34, 0xd9a441, 0.4 * s, 0.62, 0.72, -0.3, 0, 0.5 * s);   // shocks
        p.cyl(0.035, 0.035, 0.14, VC.black, 0.44 * s, 1.3, -0.52, 0, 0, RX); p.box(0.03, 0.08, 0.03, VC.dark, 0.3 * s, 1.26, -0.56);                 // grips, levers
      }
      p.cyl(0.03, 0.03, 0.42, VC.dark, 0, 1.12, -0.56, 0.25); p.cyl(0.025, 0.025, 0.8, VC.dark, 0, 1.3, -0.52, 0, 0, RX);        // steering stem, handlebar
      p.box(0.4, 0.2, 0.16, P.b, 0, 1.08, -0.82, -0.2); p.box(0.14, 0.08, 0.02, VC.black, 0, 1.25, -0.62, -0.6);                 // headlamp pod, gauge
      for (const z of [-0.95, 0.95]) for (const x of [-0.3, 0, 0.3]) p.cyl(0.015, 0.015, 0.5, VC.dark, x, 0.95, z, RX);            // racks
      for (const z of [-1.2, -0.72, 0.72, 1.2]) p.cyl(0.015, 0.015, 0.66, VC.dark, 0, 0.95, z, 0, 0, RX);
      p.box(0.4, 0.18, 0.3, VC.olive, 0, 1.06, 1.0);                                                                            // pack on the rear rack
      p.cyl(0.03, 0.03, 0.7, VC.dark, 0, 0.5, -1.18, 0, 0, RX); for (const s of [-1, 1]) p.cyl(0.03, 0.03, 0.3, VC.dark, 0.3 * s, 0.62, -1.15, 0.3);   // bull bar
      p.cyl(0.04, 0.05, 0.9, VC.steel, 0.3, 0.52, 0.75, RX); p.cyl(0.06, 0.06, 0.3, VC.dark, 0.3, 0.55, 1.2, RX);                 // exhaust
      p.cyl(0.012, 0.012, 1.5, VC.dark, -0.3, 1.6, 1.15); p.box(0.02, 0.2, 0.32, P.team, -0.3, 2.22, 1.3);                        // whip flag
      p.box(0.5, 0.04, 0.3, P.team, 0, 0.985, 0.2);
      return p;
    });
    for (const s of [-0.11, 0.11]) glow.cyl(0.075, 0.075, 0.04, VC.lamp, s, 1.08, -0.92, RX - 0.2);
    glow.box(0.2, 0.06, 0.04, VC.tail, 0, 0.9, 1.14);
    for (const [x, z] of [[-0.62, -0.7], [0.62, -0.7], [-0.62, 0.72], [0.62, 0.72]]) wheel(x, 0.36, z, 0.36, 0.32);

  } else {
    main = vcached('truck' + team, () => {
      const p = new Part();
      for (const s of [-1, 1]) p.box(0.14, 0.24, 6.6, VC.dark, 0.55 * s, 0.86, 0);                                               // chassis rails
      for (const z of [-3.0, 1.1, 2.3]) { p.cyl(0.07, 0.07, 2.2, VC.dark, 0, 0.5, z, 0, 0, RX); p.ball(0.2, VC.dark2, 0, 0.5, z); }   // axles
      // cab: lower body, doors, roof, bonnet
      p.box(2.3, 1.05, 1.7, P.a, 0, 1.52, -2.25); p.box(2.3, 0.1, 1.75, P.b, 0, 2.98, -2.2);                                      // cab tub, roof
      p.box(2.3, 0.95, 0.1, P.a, 0, 2.5, -1.44); p.box(2.3, 0.14, 0.1, P.a, 0, 2.92, -3.08);                                      // rear wall, header
      for (const s of [-1, 1]) {
        p.box(0.1, 0.95, 0.12, P.a, 1.1 * s, 2.5, -3.06); p.box(0.1, 0.95, 0.12, P.a, 1.1 * s, 2.5, -1.46);                          // pillars
        p.box(0.05, 0.9, 1.3, P.b, 1.16 * s, 1.55, -2.25); p.box(0.03, 0.06, 0.2, VC.steel, 1.2 * s, 1.85, -1.8);                    // door panel, handle
        p.cyl(0.26, 0.26, 0.03, VC.white, 1.19 * s, 1.5, -2.25, 0, 0, RX, 1, 14); p.cyl(0.16, 0.16, 0.035, P.team, 1.195 * s, 1.5, -2.25, 0, 0, RX, 1, 14);   // roundel
        p.box(0.06, 0.3, 0.2, VC.dark, 1.3 * s, 2.3, -3.0); p.cyl(0.02, 0.02, 0.3, VC.dark, 1.2 * s, 2.25, -3.0, 0, 0, RX);         // mirror
        p.box(0.5, 0.12, 1.3, P.b, 1.05 * s, 1.5, -3.5); p.box(0.5, 0.4, 0.1, P.b, 1.05 * s, 1.34, -4.1, -0.3);                      // front wing
        p.box(0.34, 0.1, 0.9, VC.dark2, 1.2 * s, 0.82, -2.25);                                                                  // cab step
        p.cyl(0.16, 0.16, 0.14, VC.dark, 0.82 * s, 1.5, -4.14, RX, 0, 0, 1, 10);                                                // lamp bucket
        p.box(0.5, 0.5, 1.0, s > 0 ? VC.olive : VC.dark2, 0.95 * s, 0.86, -0.6);                                                 // tool box / fuel tank
        p.box(0.4, 0.5, 0.06, VC.dark, 1.1 * s, 0.7, 3.1);                                                                      // mud flap
      }
      p.box(1.9, 0.8, 1.2, P.a, 0, 1.5, -3.6); p.box(1.6, 0.06, 1.0, P.b, 0, 1.92, -3.6); p.box(0.4, 0.04, 1.0, P.team, 0, 1.95, -3.6);   // bonnet with stripe
      p.box(1.5, 0.66, 0.08, VC.dark, 0, 1.48, -4.21); for (let i = 0; i < 8; i++) p.box(0.07, 0.62, 0.05, P.c, -0.56 + i * 0.16, 1.48, -4.25);   // grille
      p.box(2.4, 0.26, 0.24, VC.dark, 0, 0.92, -4.3); for (const s of [-0.5, 0.5]) p.cyl(0.04, 0.04, 0.9, VC.dark, s, 1.4, -4.4);       // bumper, bull bar
      p.box(1.1, 0.04, 0.04, VC.dark, 0, 1.85, -4.4);
      for (const s of [-0.6, -0.2, 0.2, 0.6]) p.cyl(0.09, 0.09, 0.08, VC.dark, s, 3.1, -2.9, RX);                                       // roof lamps
      p.box(2.0, 0.3, 0.4, VC.dark2, 0, 2.0, -2.85); p.add(new THREE.TorusGeometry(0.2, 0.03, 6, 14), VC.black, -0.5, 2.2, -2.62, -0.9);   // dash, steering wheel
      for (const s of [-0.5, 0.5]) { p.box(0.6, 0.14, 0.6, VC.seat, s, 1.32, -2.1); p.box(0.6, 0.7, 0.12, VC.seat, s, 1.7, -1.7); }
      p.cyl(0.07, 0.07, 1.6, VC.rust, 1.0, 2.5, -1.3); p.cyl(0.09, 0.09, 0.3, VC.dark, 1.0, 3.3, -1.3);                                 // exhaust stack
      // cargo bed: plank floor, ribbed sides, tailgate, benches
      p.box(2.4, 0.12, 4.4, VC.wood, 0, 1.13, 0.9); for (let i = 0; i < 7; i++) p.box(0.02, 0.125, 4.4, VC.rust, -1.05 + i * 0.35, 1.135, 0.9);
      for (const s of [-1, 1]) {
        p.box(0.08, 0.6, 4.4, P.a, 1.17 * s, 1.48, 0.9); for (let i = 0; i < 6; i++) p.box(0.1, 0.62, 0.08, P.b, 1.19 * s, 1.48, -1.1 + i * 0.8);
        p.box(0.4, 0.1, 3.8, VC.wood, 0.85 * s, 1.4, 1.0); for (const z of [-0.6, 1.0, 2.6]) p.box(0.06, 0.26, 0.3, VC.dark, 0.85 * s, 1.25, z);
        for (const z of [-0.8, 0.9, 2.6]) p.cyl(0.035, 0.035, 1.0, VC.dark, 1.15 * s, 2.25, z);                                       // canopy posts
      }
      p.box(2.4, 0.6, 0.08, P.a, 0, 1.48, 3.08); p.box(2.4, 0.6, 0.08, P.a, 0, 1.48, -1.28); p.box(1.4, 0.1, 0.02, P.team, 0, 1.5, 3.13);
      p.box(2.5, 0.2, 0.2, VC.dark, 0, 0.9, 3.2);
      for (const s of [-1, 1]) { p.box(0.22, 0.48, 0.36, VC.olive, 0.4 * s, 1.44, -1.02); }                                            // jerry cans behind the cab
      return p;
    });
    glass.box(2.1, 0.86, 0.04, 0, 0, 2.48, -3.1); for (const s of [-1, 1]) glass.box(0.04, 0.8, 1.2, 0, 1.14 * s, 2.5, -2.26);
    for (const s of [-0.82, 0.82]) glow.cyl(0.13, 0.13, 0.05, VC.lamp, s, 1.5, -4.22, RX, 0, 0, 1, 12);
    for (const s of [-0.6, -0.2, 0.2, 0.6]) glow.cyl(0.07, 0.07, 0.03, VC.lamp, s, 3.1, -2.95, RX);
    for (const s of [-1.05, 1.05]) glow.box(0.18, 0.12, 0.04, VC.tail, s, 1.0, 3.31);
    mesh(wheelGeo(0.5, 0.4), VEH_MAT, body, 0, 1.9, -1.18).rotation.y = RX;                                                          // spare
    // canvas roof over the hoops (open sides so you can see the squad)
    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 4.3, 12, 1, true, Math.PI - 1.0, 2.0), VM2.canvas); canopy.rotation.x = RX; canopy.position.set(0, 2.2, 0.9); canopy.castShadow = true; body.add(canopy);
    for (const [x, z] of [[-1.1, -3.0], [1.1, -3.0], [-1.1, 1.1], [1.1, 1.1], [-1.1, 2.3], [1.1, 2.3]]) wheel(x, 0.5, z, 0.5, 0.42);
  }
  mesh(main, VEH_MAT);
  if (glass.pos.length) { const gm = new THREE.Mesh(glass.build(), VM2.glass); body.add(gm); }
  if (glow.pos.length) { const lm = new THREE.Mesh(glow.build(), VEH_GLOW); body.add(lm); }
  g.traverse(o => { if (o.isMesh) o.userData.isVehiclePart = true; });
  scene.add(g);
  return out;
}

// ---------- fighter plane (nose is -Z) ----------
function makePlaneModel(team) {
  const P = VPAINT[team], g = new THREE.Group();
  const C = { body: team === 'blue' ? 0x3f6fc8 : 0xc94a3a, belly: team === 'blue' ? 0xb9cdee : 0xf0c4bb, dark: team === 'blue' ? 0x2a4f96 : 0x8f2f25 };
  const m = new THREE.Mesh(vcached('plane' + team, () => {
    const p = new Part();
    p.cyl(0.85, 0.84, 4.2, C.body, 0, 0, -1.4, RX, 0, 0, 1, 16); p.cyl(0.84, 0.24, 4.6, C.body, 0, 0.12, 2.9, -RX, 0, 0, 1, 16);        // fuselage, tail boom
    p.cyl(0.87, 0.82, 1.0, VC.steel, 0, 0, -3.9, RX, 0, 0, 1, 16); p.cyl(0.9, 0.9, 0.08, C.dark, 0, 0, -3.42, RX, 0, 0, 1, 16);        // cowling, cowl ring
    p.cyl(0.6, 0.6, 0.1, VC.black, 0, 0, -4.42, RX, 0, 0, 1, 12);                                                                  // intake
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) p.cyl(0.06, 0.06, 0.3, VC.rust, 0.82 * s, 0.15, -3.9 + i * 0.2, RX + 0.5, 0, -0.4 * s);   // exhaust stubs
    for (const z of [-2.6, -0.2, 1.4]) p.cyl(0.86 - Math.max(0, z) * 0.12, 0.86 - Math.max(0, z) * 0.12, 0.03, C.dark, 0, z > 0 ? 0.04 : 0, z, RX, 0, 0, 1, 16);   // panel lines
    // shark mouth and eyes on the nose
    for (const s of [-1, 1]) {
      p.box(0.05, 0.3, 1.1, 0xb11818, 0.78 * s, -0.42, -3.6, 0, 0, -0.5 * s);
      for (let i = 0; i < 6; i++) { p.add(new THREE.ConeGeometry(0.07, 0.2, 4), VC.white, 0.83 * s, -0.3, -4.05 + i * 0.18, Math.PI, 0, -0.5 * s); p.add(new THREE.ConeGeometry(0.07, 0.2, 4), VC.white, 0.72 * s, -0.56, -3.96 + i * 0.18, 0, 0, -0.5 * s); }
      p.cyl(0.13, 0.13, 0.04, VC.white, 0.8 * s, 0.32, -3.95, 0, 0, RX + 0.35 * s, 1, 10); p.cyl(0.06, 0.06, 0.05, VC.black, 0.82 * s, 0.31, -3.98, 0, 0, RX + 0.35 * s, 1, 8);
    }
    // wings: main panel, rounded tips, flaps, stripes, roundels, guns
    for (const s of [-1, 1]) {
      p.box(5.6, 0.2, 2.1, C.belly, 3.4 * s, -0.3, -1.3, 0, 0, 0.05 * s); p.box(5.6, 0.06, 2.0, C.body, 3.4 * s, -0.18, -1.3, 0, 0, 0.05 * s);
      p.cyl(1.05, 1.05, 0.2, C.body, 6.2 * s, -0.16, -1.3, 0, 0, 0, 1, 14);
      p.box(2.6, 0.07, 0.5, C.dark, 4.4 * s, -0.12, -0.42, 0, 0, 0.05 * s); p.box(2.0, 0.07, 0.5, C.dark, 2.0 * s, -0.24, -0.42, 0, 0, 0.05 * s);   // aileron, flap
      for (let i = 0; i < 3; i++) p.box(0.34, 0.075, 2.05, i === 1 ? VC.black : VC.white, (5.0 + i * 0.36) * s, -0.085, -1.3, 0, 0, 0.05 * s);          // invasion stripes
      p.cyl(0.58, 0.58, 0.03, VC.white, 3.6 * s, -0.12, -1.3, 0, 0, 0.05 * s, 1, 16); p.cyl(0.36, 0.36, 0.035, P.team, 3.6 * s, -0.115, -1.3, 0, 0, 0.05 * s, 1, 16); p.cyl(0.14, 0.14, 0.04, VC.white, 3.6 * s, -0.11, -1.3, 0, 0, 0.05 * s, 1, 10);
      for (const x of [2.2, 2.7]) { p.cyl(0.05, 0.05, 0.9, VC.dark, x * s, -0.3, -2.6, RX); p.cyl(0.08, 0.08, 0.3, VC.dark2, x * s, -0.3, -2.3, RX); }   // wing guns
      // landing gear with spats
      p.cyl(0.07, 0.06, 1.0, VC.steel, 1.5 * s, -0.9, -1.5); p.box(0.3, 0.7, 0.9, C.body, 1.5 * s, -1.25, -1.5); p.cyl(0.36, 0.36, 0.24, VC.tire, 1.5 * s, -1.48, -1.5, 0, 0, RX, 1, 14); p.cyl(0.16, 0.16, 0.26, VC.hub, 1.5 * s, -1.48, -1.5, 0, 0, RX, 1, 10);
      // fuselage roundel and tail stripes
      p.cyl(0.42, 0.42, 0.03, VC.white, 0.74 * s, 0.1, 1.5, 0, 0, RX - 0.1 * s, 1, 14); p.cyl(0.26, 0.26, 0.035, P.team, 0.75 * s, 0.1, 1.5, 0, 0, RX - 0.1 * s, 1, 14);
      p.box(2.0, 0.14, 1.2, C.belly, 1.15 * s, 0.25, 4.6); p.cyl(0.6, 0.6, 0.14, C.belly, 2.1 * s, 0.25, 4.6, 0, 0, 0, 1, 12); p.box(1.9, 0.06, 0.36, C.dark, 1.2 * s, 0.3, 5.05);   // tailplane, elevator
    }
    p.box(0.14, 1.6, 1.3, C.body, 0, 1.0, 4.7, 0.25); p.box(0.15, 1.5, 0.4, C.dark, 0, 1.05, 5.25, 0.25);                                  // fin, rudder
    for (let i = 0; i < 3; i++) p.box(0.16, 0.2, 0.42, [P.team, VC.white, P.acc][i], 0, 1.5 - i * 0.22, 5.2 - i * 0.055, 0.25);              // rudder flash
    p.cyl(0.12, 0.12, 0.3, VC.steel, 0, -0.45, 4.9); p.cyl(0.16, 0.16, 0.12, VC.tire, 0, -0.62, 4.95, 0, 0, RX);                           // tail wheel
    p.cyl(0.02, 0.02, 0.9, VC.dark, 0, 1.3, 0.8); p.box(0.5, 0.5, 0.2, VC.seat, 0, 0.75, 0.35); p.box(0.6, 0.1, 0.5, VC.dark, 0, 0.62, -1.3);   // mast, headrest, gunsight shelf
    p.box(0.14, 0.12, 0.1, 0x58c8ff, 0, 0.75, -1.3);
    // canopy frame
    for (const z of [-1.55, -0.6, 0.35]) p.add(new THREE.TorusGeometry(0.6, 0.035, 5, 14, Math.PI), C.dark, 0, 0.58, z, 0, 0, 0);
    p.box(0.05, 0.05, 1.9, C.dark, 0, 1.17, -0.6);
    return p;
  }), VEH_MAT);
  m.castShadow = true; m.receiveShadow = true; g.add(m);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x9fd3f5, shininess: 100, transparent: true, opacity: 0.55 }));
  canopy.position.set(0, 0.6, -0.6); canopy.scale.set(1, 0.9, 1.9); g.add(canopy);
  const prop = new THREE.Group(); prop.position.z = -4.55; g.add(prop);
  const pm = new THREE.Mesh(vcached('prop', () => {
    const p = new Part();
    p.add(new THREE.ConeGeometry(0.34, 0.75, 12), 0xd9a441, 0, 0, -0.25, -RX);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; p.box(0.24, 1.5, 0.06, VC.black, -Math.sin(a) * 0.85, Math.cos(a) * 0.85, 0, 0, 0.25, a); p.box(0.24, 0.3, 0.065, 0xf2c230, -Math.sin(a) * 1.65, Math.cos(a) * 1.65, 0, 0, 0.25, a); }
    return p;
  }), VEH_MAT); pm.castShadow = true; prop.add(pm);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.8, 24), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); prop.add(disc);
  const bomb = new THREE.Mesh(vcached('bomb', () => {
    const p = new Part();
    p.add(new THREE.SphereGeometry(0.3, 10, 8), VC.olive, 0, 0, 0, 0, 0, 0, 1, 1, 2.4); p.cyl(0.31, 0.31, 0.1, 0xf2c230, 0, 0, -0.35, RX, 0, 0, 1, 10);
    for (let i = 0; i < 4; i++) p.box(0.03, 0.5, 0.4, VC.dark, 0, 0, 0.7, 0, 0, i * Math.PI / 4);
    return p;
  }), VEH_MAT); bomb.position.set(0, -1.0, -1.2); bomb.castShadow = true; g.add(bomb);
  scene.add(g);
  return { g, prop, bomb };
}

// ===================== more vehicle types: dirt bike, buggy, armoured carrier =====================
Object.assign(VTYPES, {
  bike: {
    name: 'Dirt bike', hp: 170, maxSpeed: 30, accel: 18, turn: 2.0, radius: 0.8, len: 2.2, wid: 0.8, bulletMult: 1, expMult: 1, camDist: 6, lean: true,
    seats: [{ p: [0, 1.12, 0.12], role: 'drive', pose: 'bike', exposed: true }, { p: [0, 1.18, 0.72], role: 'ride', pose: 'bike', exposed: true }],
  },
  buggy: {
    name: 'Buggy', hp: 340, maxSpeed: 33, accel: 15, turn: 1.9, radius: 1.7, len: 3.5, wid: 1.9, bulletMult: 0.8, expMult: 1, camDist: 8,
    seats: [{ p: [-0.42, 1.05, -0.15], role: 'drive', pose: 'sit', exposed: true }, { p: [0, 1.05, 1.05], role: 'gun', pose: 'stand', exposed: true }, { p: [0.42, 1.05, -0.15], role: 'ride', pose: 'sit', exposed: true }],
  },
  apc: {
    name: 'Armoured carrier', hp: 1000, maxSpeed: 19, accel: 9, turn: 1.1, radius: 2.9, len: 6.2, wid: 2.9, bulletMult: 0.12, expMult: 0.7, camDist: 12,
    seats: [{ p: [-0.5, 1.5, -1.9], role: 'drive', pose: 'hide', exposed: false }, { p: [0, 1.95, 0.2], role: 'gun', pose: 'stand', exposed: true },
      ...[0.9, 1.7, 2.5].flatMap(z => [{ p: [-0.6, 1.5, z], role: 'ride', pose: 'hide', exposed: false }, { p: [0.6, 1.5, z], role: 'ride', pose: 'hide', exposed: false }])],
  },
});
const makeVehicleModelBase = makeVehicleModel;
makeVehicleModel = function (type, team) {
  if (type !== 'bike' && type !== 'buggy' && type !== 'apc') return makeVehicleModelBase(type, team);
  const P = VPAINT[team], g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const wheels = [], out = { g, body, wheels };
  const mesh = (geo, mat, parent = body, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const wheel = (x, y, z, r, w) => { wheels.push(mesh(wheelGeo(r, w), VEH_MAT, body, x, y, z)); };
  const glow = new Part();
  let main;
  if (type === 'bike') {
    main = vcached('bike' + team, () => {
      const p = new Part();
      p.cyl(0.04, 0.04, 1.2, VC.dark, 0, 0.78, -0.02, RX - 0.25); p.cyl(0.035, 0.035, 0.9, VC.dark, 0, 0.55, 0.05, RX);                    // frame spine and cradle
      p.box(0.3, 0.34, 0.42, VC.steel, 0, 0.62, -0.05); p.cyl(0.12, 0.12, 0.32, VC.dark2, 0, 0.52, 0.12, 0, 0, RX); for (let i = 0; i < 4; i++) p.box(0.34, 0.02, 0.3, VC.dark, 0, 0.7 + i * 0.045, -0.12);   // engine with fins
      p.add(new THREE.SphereGeometry(0.22, 10, 8), P.team, 0, 1.0, -0.22, 0, 0, 0, 0.85, 0.7, 1.5); p.cyl(0.04, 0.04, 0.03, VC.dark, 0.05, 1.15, -0.3);   // fuel tank, cap
      for (const s of [-1, 1]) { p.box(0.04, 0.3, 0.46, P.a, 0.19 * s, 0.86, -0.42, 0.5, 0, 0); p.box(0.04, 0.2, 0.5, P.a, 0.17 * s, 0.9, 0.5, -0.2, 0, 0); }   // shrouds, side panels
      p.box(0.26, 0.1, 0.95, VC.seat, 0, 1.03, 0.4); p.box(0.24, 0.08, 0.3, VC.seat, 0, 1.09, 0.78, -0.25);                                    // long seat
      p.box(0.2, 0.04, 0.7, P.team, 0, 1.0, 1.02, -0.3); p.box(0.2, 0.04, 0.6, P.team, 0, 0.98, -1.0, 0.25);                                     // rear and front mudguards
      for (const s of [-1, 1]) {
        p.cyl(0.03, 0.03, 0.95, VC.steel, 0.12 * s, 0.88, -0.78, -0.42); p.cyl(0.04, 0.04, 0.3, 0xd9a441, 0.12 * s, 1.12, -0.66, -0.42);          // forks
        p.cyl(0.025, 0.025, 0.85, VC.dark, 0.11 * s, 0.5, 0.5, RX + 0.1);                                                                    // swing arm
        p.cyl(0.03, 0.03, 0.16, VC.black, 0.34 * s, 1.36, -0.6, 0, 0, RX); p.box(0.03, 0.03, 0.14, VC.dark, 0.28 * s, 0.42, 0.1);                // grips, foot pegs
      }
      p.cyl(0.02, 0.02, 0.74, VC.dark, 0, 1.34, -0.6, 0, 0, RX); p.cyl(0.02, 0.02, 0.16, VC.dark, 0, 1.3, -0.62);                                // handlebar and riser
      p.box(0.26, 0.26, 0.04, VC.white, 0, 1.2, -0.76, -0.3); p.box(0.1, 0.1, 0.045, P.team, 0, 1.2, -0.77, -0.3);                                // number plate
      p.cyl(0.035, 0.035, 0.4, 0xd9a441, 0, 0.75, 0.42, 0.5);                                                                              // rear shock
      p.cyl(0.035, 0.04, 0.9, VC.steel, 0.16, 0.86, 0.5, RX + 0.25); p.cyl(0.06, 0.06, 0.32, VC.dark, 0.17, 1.0, 1.0, RX + 0.25);                 // exhaust up the side
      p.box(0.03, 0.1, 0.6, VC.dark, -0.13, 0.5, 0.5);                                                                                     // chain guard
      return p;
    });
    glow.cyl(0.06, 0.06, 0.03, VC.lamp, 0, 1.2, -0.8, RX - 0.3); glow.box(0.1, 0.05, 0.03, VC.tail, 0, 0.96, 1.36);
    wheel(0, 0.42, -0.98, 0.42, 0.15); wheel(0, 0.42, 0.88, 0.42, 0.18);

  } else if (type === 'buggy') {
    main = vcached('buggy' + team, () => {
      const p = new Part();
      p.box(1.5, 0.12, 3.1, VC.dark, 0, 0.5, 0); p.box(1.3, 0.3, 1.9, P.a, 0, 0.72, -0.2);                                             // floor pan, tub
      p.box(1.1, 0.26, 1.0, P.a, 0, 0.82, -1.35, 0.28); p.box(0.3, 0.03, 0.9, P.team, 0, 0.965, -1.35, 0.28);                            // sloped nose with stripe
      p.box(1.5, 0.1, 0.12, VC.dark, 0, 0.56, -1.82); for (const s of [-1, 1]) p.cyl(0.035, 0.035, 0.5, VC.dark, 0.4 * s, 0.8, -1.8, 0.3);   // bumper and nudge bars
      for (const s of [-1, 1]) {
        p.cyl(0.04, 0.04, 1.45, VC.dark2, 0.7 * s, 1.5, -0.62, -0.5); p.cyl(0.04, 0.04, 1.5, VC.dark2, 0.7 * s, 1.55, 0.55); p.cyl(0.04, 0.04, 1.2, VC.dark2, 0.7 * s, 2.25, -0.02, RX);   // A pillar, B pillar, roof rail
        p.cyl(0.04, 0.04, 1.7, VC.dark2, 0.7 * s, 1.5, 1.2, RX - 0.95); p.cyl(0.035, 0.035, 2.0, VC.dark2, 0.78 * s, 0.75, -0.1, RX);       // rear stay, side nerf bar
        p.box(0.36, 0.06, 0.8, P.b, 0.86 * s, 1.0, -1.25); p.box(0.44, 0.06, 0.9, P.b, 0.9 * s, 1.12, 1.4);                                  // mudguards
        p.cyl(0.03, 0.03, 0.7, VC.steel, 0.6 * s, 0.5, -1.25, 0, 0, RX + 0.25 * s); p.cyl(0.035, 0.035, 0.5, 0xd9a441, 0.62 * s, 0.75, -1.25, 0, 0, 0.5 * s);   // wishbone, shock
        p.cyl(0.035, 0.035, 0.5, 0xd9a441, 0.62 * s, 0.85, 1.45, 0, 0, 0.5 * s);
        p.cyl(0.05, 0.06, 0.8, VC.steel, 0.3 * s, 1.0, 1.75, RX + 0.5); p.cyl(0.07, 0.07, 0.2, VC.dark, 0.3 * s, 1.26, 2.1, RX + 0.5);          // exhaust stacks
      }
      for (const z of [-0.6, 0.55]) p.cyl(0.04, 0.04, 1.4, VC.dark2, 0, 2.25, z, 0, 0, RX);
      p.cyl(0.04, 0.04, 1.4, VC.dark2, 0, 0.9, 1.9, 0, 0, RX);
      for (const s of [-0.42, 0.42]) { p.box(0.5, 0.14, 0.5, VC.seat, s, 0.94, -0.12); p.box(0.5, 0.66, 0.1, VC.seat, s, 1.3, 0.16, -0.12); p.box(0.3, 0.14, 0.08, VC.seat, s, 1.7, 0.2); }
      p.box(1.3, 0.2, 0.16, VC.dark2, 0, 1.0, -0.85); p.add(new THREE.TorusGeometry(0.16, 0.025, 6, 14), VC.black, -0.42, 1.2, -0.62, -0.6);   // dash, wheel
      p.box(0.9, 0.5, 0.7, VC.steel, 0, 0.95, 1.6); for (let i = 0; i < 4; i++) p.box(0.94, 0.03, 0.6, VC.dark, 0, 0.8 + i * 0.1, 1.6); p.cyl(0.2, 0.2, 0.12, VC.dark, 0, 1.26, 1.6);   // engine, air filter
      p.box(1.0, 0.06, 0.5, VC.dark2, 0, 0.68, 1.02);                                                                                 // gunner step
      p.cyl(0.05, 0.06, 0.9, VC.dark, 0, 1.3, 1.05); p.cyl(0.24, 0.24, 0.05, VC.dark2, 0, 1.74, 1.05, 0, 0, 0, 1, 12);                    // pedestal, ring
      for (const s of [-0.5, -0.17, 0.17, 0.5]) p.cyl(0.085, 0.085, 0.08, VC.dark, s, 2.36, -0.6, RX);                                  // light bar housings
      p.cyl(0.012, 0.012, 1.6, VC.dark, 0.66, 2.5, 1.5); p.box(0.02, 0.24, 0.36, P.team, 0.66, 3.15, 1.68);                              // whip flag
      return p;
    });
    for (const s of [-0.5, -0.17, 0.17, 0.5]) glow.cyl(0.065, 0.065, 0.03, VC.lamp, s, 2.36, -0.65, RX);
    for (const s of [-0.38, 0.38]) glow.cyl(0.09, 0.09, 0.04, VC.lamp, s, 0.86, -1.82, RX + 0.28);
    for (const s of [-0.6, 0.6]) glow.box(0.12, 0.08, 0.04, VC.tail, s, 0.92, 1.97);
    wheel(-0.95, 0.42, -1.25, 0.42, 0.3); wheel(0.95, 0.42, -1.25, 0.42, 0.3); wheel(-1.0, 0.5, 1.4, 0.5, 0.42); wheel(1.0, 0.5, 1.4, 0.5, 0.42);
    const mgYaw = new THREE.Group(); mgYaw.position.set(0, 1.78, 1.05); body.add(mgYaw);
    const mgPitch = new THREE.Group(); mgYaw.add(mgPitch); mesh(hmgGeo(true, P), VEH_MAT, mgPitch);
    const mz = new THREE.Object3D(); mz.position.z = -1.95; mgPitch.add(mz);
    Object.assign(out, { mgYaw, mgPitch, mgMuzzle: mz, mgBase: 1.78 });

  } else {
    main = vcached('apc' + team, () => {
      const p = new Part();
      p.box(2.5, 0.9, 5.4, P.a, 0, 1.2, 0.2); p.box(2.5, 0.9, 1.3, P.a, 0, 1.12, -2.75, 0.55); p.box(2.5, 0.5, 0.9, P.b, 0, 0.82, -2.95, -0.45);   // hull, glacis, lower nose
      p.box(2.1, 0.62, 4.6, P.a, 0, 1.95, 0.55); p.box(2.1, 0.7, 1.0, P.a, 0, 1.86, -1.95, 0.6);                                              // upper hull, windscreen slope
      for (const s of [-1, 1]) {
        p.box(0.3, 0.66, 4.6, P.b, 1.14 * s, 1.92, 0.55, 0, 0, 0.45 * s);                                                                  // sloped sides
        p.box(0.34, 0.1, 5.6, P.b, 1.36 * s, 1.34, 0.2);                                                                                  // wheel guard shelf
        for (const z of [-0.2, 1.0, 2.2]) { p.cyl(0.11, 0.11, 0.06, VC.dark, 1.28 * s, 1.95, z, 0, 0, RX + 0.45 * s); p.box(0.05, 0.14, 0.34, VC.dark2, 1.33 * s, 2.12, z, 0, 0, 0.45 * s); }   // firing ports and vision slits
        p.box(0.1, 0.16, 1.2, VC.wood, 1.42 * s, 1.52, 1.4); p.box(0.2, 0.44, 0.34, VC.olive, 1.42 * s, 1.62, -0.6);                             // tools, jerry can
        p.cyl(0.13, 0.13, 0.12, VC.dark, 0.95 * s, 1.55, -3.05, RX + 0.55); p.box(0.34, 0.04, 0.3, VC.dark, 0.95 * s, 1.74, -3.0);                // headlamp and guard
        for (let i = 0; i < 3; i++) p.cyl(0.07, 0.07, 0.3, VC.dark, 1.0 * s, 2.3, -1.3 + i * 0.2, RX - 0.5, 0, -0.4 * s);                          // smoke launchers
        p.cyl(0.012, 0.012, 2.0, VC.dark, 0.9 * s, 3.2, 2.6);
        p.box(0.04, 0.18, 1.6, P.team, 1.27 * s, 1.5, 1.2);                                                                              // team stripe
      }
      p.cyl(0.09, 0.09, 1.3, VC.rust, 1.45, 1.6, 0.4, RX); p.box(0.3, 0.3, 0.5, VC.dark, 1.42, 1.6, -0.25);                                     // exhaust and muffler
      p.box(1.6, 0.06, 0.9, P.b, 0, 1.56, -3.0, 0.55);                                                                                    // trim vane
      for (const s of [-0.5, 0.5]) { p.box(0.5, 0.16, 0.06, VC.dark, s, 2.12, -2.2, 0.6); }                                                  // driver periscopes
      p.cyl(0.42, 0.44, 0.14, P.b, 0, 2.3, 0.2, 0, 0, 0, 1, 12); p.cyl(0.36, 0.36, 0.05, VC.dark, 0, 2.62, 0.68, -1.25, 0, 0, 1, 12);            // commander ring, open hatch
      for (const z of [1.5, 2.3]) for (const s of [-0.5, 0.5]) { p.cyl(0.32, 0.32, 0.05, P.b, s, 2.28, z, 0, 0, 0, 1, 10); p.box(0.16, 0.04, 0.06, VC.dark, s, 2.32, z); }   // roof hatches
      p.box(0.9, 0.04, 0.9, P.team, 0, 2.28, -0.9); p.box(0.5, 0.045, 0.5, P.acc, 0, 2.285, -0.9);                                           // air recognition panel
      p.box(1.5, 1.3, 0.1, P.b, 0, 1.55, 2.92); p.box(0.3, 0.06, 0.06, VC.steel, 0.3, 1.6, 3.0); p.box(1.6, 0.1, 0.4, VC.dark, 0, 0.78, 3.0);    // rear door, handle, step
      for (const z of [-2.1, -0.7, 0.7, 2.1]) { p.cyl(0.08, 0.08, 2.4, VC.dark, 0, 0.6, z, 0, 0, RX); }
      p.box(0.8, 0.4, 0.5, VC.olive, 0, 2.45, 2.55); p.cyl(0.14, 0.14, 0.9, VC.canvas, 0, 2.38, 2.0, 0, 0, RX);                                // stowage on the roof
      return p;
    });
    for (const s of [-0.95, 0.95]) glow.cyl(0.1, 0.1, 0.03, VC.lamp, s, 1.56, -3.12, RX + 0.55);
    for (const s of [-1.0, 1.0]) glow.box(0.16, 0.12, 0.04, VC.tail, s, 1.4, 2.99);
    for (const s of [-0.5, 0.5]) glow.box(0.44, 0.1, 0.03, 0x58c8ff, s, 2.13, -2.24, 0.6);
    for (const z of [-2.1, -0.7, 0.7, 2.1]) for (const s of [-1, 1]) wheel(1.3 * s, 0.55, z, 0.55, 0.45);
    const mgYaw = new THREE.Group(); mgYaw.position.set(0, 2.65, 0.2); body.add(mgYaw);
    const mgPitch = new THREE.Group(); mgYaw.add(mgPitch); mesh(hmgGeo(true, P), VEH_MAT, mgPitch);
    const mz = new THREE.Object3D(); mz.position.z = -1.95; mgPitch.add(mz);
    Object.assign(out, { mgYaw, mgPitch, mgMuzzle: mz, mgBase: 2.65 });
  }
  mesh(main, VEH_MAT);
  if (glow.pos.length) body.add(new THREE.Mesh(glow.build(), VEH_GLOW));
  g.traverse(o => { if (o.isMesh) o.userData.isVehiclePart = true; });
  scene.add(g);
  return out;
};

// ---------- motor pools: more vehicles at each base, plus bikes and four wheelers near the forward points ----------
function vehicleSpotFree(x, z, r) {
  if (Math.abs(x) > EDGE - 30 || Math.abs(z) > EDGE - 30 || waterDepth(x, z) > 0) return false;
  const h = heightAt(x, z);
  for (const [ox, oz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (Math.abs(heightAt(x + ox, z + oz) - h) > r * 0.45) return false;
  for (const t of ['blue', 'red']) { const rw = RUNWAYS[t]; if (Math.abs(x - rw.x) < rw.len / 2 + 6 && Math.abs(z - rw.z) < rw.wid / 2 + 6) return false; }
  for (let gx = -r; gx <= r; gx += r / 2) for (let gz = -r; gz <= r; gz += r / 2)
    for (const o of nearbyColliders(x + gx, z + gz)) {
      if (o.kind === 'box') { if (o.maxY > h + 0.3 && o.minY < h + 3 && x + gx > o.minX - 0.6 && x + gx < o.maxX + 0.6 && z + gz > o.minZ - 0.6 && z + gz < o.maxZ + 0.6) return false; }
      else if (Math.hypot(x + gx - o.x, z + gz - o.z) < o.r + 0.8) return false;
    }
  for (const v of gvehicles) if (Math.abs(v.pos.y - h) < 6 && Math.hypot(v.pos.x - x, v.pos.z - z) < r + v.T.radius + 1) return false;
  for (const pl of planes) if (Math.hypot(pl.pos.x - x, pl.pos.z - z) < r + 9) return false;
  return true;
}
function parkVehicle(type, team, x, z, yaw) {
  const r = VTYPES[type].radius;
  for (let d = 0; d <= 40; d += 3) for (let k = 0; k < (d ? 10 : 1); k++) {
    const a = k / 10 * Math.PI * 2 + d * 0.37, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (vehicleSpotFree(px, pz, r)) return makeGV(type, team, px, pz, yaw);
  }
  return null;
}
function buildMotorPools() {
  for (const t of TEAMS) {
    const B = BASES[t], s = teamSide(t), yaw = s > 0 ? 0 : Math.PI;
    const row = [['bike', -30], ['jeep', -24], ['jeep', -18], ['jeep', -12], ['apc', -4], ['jeep', 5], ['jeep', 11], ['jeep', 17], ['buggy', 23], ['bike', 28]];
    for (const [type, dx] of row) parkVehicle(type, t, B.x + dx, B.z - s * 52, yaw);
    for (const name of t === 'blue' ? ['A', 'B'] : t === 'red' ? ['D', 'E'] : []) {
      const p = PD[name], toC = Math.atan2(-(0 - p.x), -(0 - p.z)), ox = Math.sign(p.x) * 26, oz = s * 22;
      [['jeep', 0], ['jeep', 6], ['bike', 11], ['quad', 14]].forEach(([type, k]) => parkVehicle(type, t, p.x + ox + k * 0.9, p.z + oz + (k % 2) * 3, toC));
    }
  }
}

// ===================== town cars: sedans, pickups, muscle cars and SUVs instead of plain boxes =====================
const CAR_GLASS = new THREE.MeshPhongMaterial({ color: 0x2b3d4f, transparent: true, opacity: 0.78, shininess: 120, specular: 0x8899aa });
function carWheelGeo(r, w, sport) {
  return vcached('cwheel' + r + w + sport, () => {
    const p = new Part();
    p.cyl(r, r, w, VC.tire, 0, 0, 0, 0, 0, RX, 1, 18); p.cyl(r * 0.8, r * 0.8, w + 0.01, VC.tire2, 0, 0, 0, 0, 0, RX, 1, 18);
    for (const s of [-1, 1]) {
      p.cyl(r * 0.66, r * 0.66, 0.02, sport ? 0x2a2c30 : 0xc9cdd2, s * (w / 2 + 0.005), 0, 0, 0, 0, RX, 1, 16);
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; p.box(0.03, r * 0.5, r * 0.11, sport ? 0xd9a441 : 0x9aa0a6, s * (w / 2 + 0.02), Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32, a, 0, 0); }
      p.cyl(r * 0.14, r * 0.14, 0.05, 0x55595e, s * (w / 2 + 0.03), 0, 0, 0, 0, RX, 1, 8);
    }
    return p;
  });
}
let carCount = 0;
function addCar(x, z, alongX, color) {
  const h = carCount++ % 4;                                            // same order on every computer, so everyone builds the same cars
  const kind = ['sedan', 'pickup', 'muscle', 'suv'][h];
  const g = new THREE.Group(), car = new THREE.Group(); car.position.y = -0.95; g.add(car);
  const p = new Part(), glass = new Part(), glow = new Part();
  const C = color, chrome = 0xc9cdd2, trim = 0x1e2024, dark = 0x2a2d31;
  const lower = new THREE.Color(C).multiplyScalar(0.72).getHex();
  let wheelR = 0.38, wheelW = 0.26, wz = 1.35, wx = 0.86, sport = false;
  const lamps = (y, zf, zr, wide) => {
    for (const s of [-1, 1]) {
      glow.box(0.36, 0.13, 0.03, VC.lamp, wide * s, y, zf - 0.015); p.box(0.4, 0.17, 0.04, trim, wide * s, y, zf);
      glow.box(0.34, 0.12, 0.03, VC.tail, wide * s, y, zr + 0.015); p.box(0.38, 0.16, 0.04, trim, wide * s, y, zr);
    }
  };
  const doors = (y0, y1, z0, z1, xo) => {
    for (const s of [-1, 1]) {
      for (const zz of [z0, (z0 + z1) / 2, z1]) p.box(0.02, y1 - y0, 0.025, trim, xo * s, (y0 + y1) / 2, zz);
      for (const zz of [z0 + 0.25, (z0 + z1) / 2 + 0.25]) p.box(0.03, 0.04, 0.16, chrome, (xo + 0.01) * s, y1 - 0.12, zz);
    }
  };
  if (kind === 'sedan' || kind === 'muscle') {
    const L = kind === 'muscle' ? 4.6 : 4.4, low = kind === 'muscle' ? -0.06 : 0;
    sport = kind === 'muscle'; if (sport) { wheelR = 0.4; wheelW = 0.32; }
    p.box(1.86, 0.5, L, C, 0, 0.66 + low, 0);                                                  // main body
    p.box(1.8, 0.16, L - 0.1, lower, 0, 0.36 + low, 0);                                        // lower sills
    p.box(1.8, 0.14, 1.35, C, 0, 0.92 + low, -1.45, -0.05);                                    // hood
    p.box(1.8, 0.14, 0.95, C, 0, 0.92 + low, 1.7, 0.06);                                       // trunk lid
    p.box(1.62, 0.07, 1.55, C, 0, 1.5 + low, 0.25);                                            // roof
    for (const s of [-1, 1]) {
      p.box(0.08, 0.6, 0.1, C, 0.79 * s, 1.22 + low, -0.69, 0.6, 0, 0);                         // A pillar
      p.box(0.08, 0.55, 0.12, C, 0.8 * s, 1.21 + low, 0.35);                                    // B pillar
      p.box(0.08, 0.56, 0.1, C, 0.79 * s, 1.22 + low, 1.14, -0.45, 0, 0);                           // C pillar
      p.box(0.16, 0.08, 0.2, trim, 0.98 * s, 1.03 + low, -0.55); p.box(0.04, 0.12, 0.16, chrome, 1.06 * s, 1.04 + low, -0.55);   // mirror
      for (const zz of [-wz, wz]) p.add(new THREE.CylinderGeometry(wheelR + 0.1, wheelR + 0.1, 0.12, 14, 1, false, 0, Math.PI), trim, 0.9 * s, wheelR + 0.02, zz, 0, 0, RX, 1, 1, 1);   // wheel arch trim
      glass.box(0.02, 0.42, 0.95, 0, 0.82 * s, 1.21 + low, -0.18); glass.box(0.02, 0.4, 0.75, 0, 0.82 * s, 1.21 + low, 0.8);   // side windows
    }
    glass.box(1.56, 0.6, 0.03, 0, 0, 1.22 + low, -0.69, 0.6, 0, 0);                          // windshield
    glass.box(1.56, 0.56, 0.03, 0, 0, 1.22 + low, 1.14, -0.45, 0, 0);                              // rear window
    p.box(1.9, 0.18, 0.16, chrome, 0, 0.42 + low, -L / 2 - 0.05); p.box(1.9, 0.18, 0.16, chrome, 0, 0.42 + low, L / 2 + 0.05);   // bumpers
    p.box(1.0, 0.24, 0.05, trim, 0, 0.66 + low, -L / 2 - 0.01); for (let i = 0; i < 4; i++) p.box(0.98, 0.025, 0.06, chrome, 0, 0.58 + i * 0.055 + low, -L / 2 - 0.02);   // grille
    p.box(0.5, 0.16, 0.03, VC.white, 0, 0.6 + low, L / 2 + 0.14); p.box(0.44, 0.03, 0.035, 0x1d3f8a, 0, 0.64 + low, L / 2 + 0.145);   // plate
    lamps(0.74 + low, -L / 2, L / 2, 0.62);
    doors(0.42 + low, 0.92 + low, -0.75, 1.15, 0.935);
    if (sport) {
      for (const s of [-0.22, 0.22]) { p.box(0.2, 0.012, L - 0.4, VC.white, s, 0.915, 0.05); p.box(0.2, 0.012, 1.6, VC.white, s, 1.54, 0.25); }   // racing stripes
      p.box(0.62, 0.14, 0.7, C, 0, 1.0, -1.35); p.box(0.5, 0.1, 0.05, trim, 0, 1.02, -1.71);     // hood scoop
      p.box(1.7, 0.05, 0.3, C, 0, 1.22, 2.08); for (const s of [-0.7, 0.7]) p.box(0.06, 0.24, 0.12, trim, s, 1.08, 2.08);   // rear spoiler
      for (const s of [-0.45, 0.45]) p.cyl(0.06, 0.06, 0.2, chrome, s, 0.36, L / 2 + 0.1, RX);   // twin exhausts
      for (const s of [-1, 1]) p.box(0.06, 0.32, 1.1, lower, 0.97 * s, 0.6, 1.3);                // wide rear haunches
    }
  } else if (kind === 'pickup') {
    wheelR = 0.44; wheelW = 0.3; wz = 1.5;
    p.box(1.94, 0.6, 4.8, C, 0, 0.82, 0); p.box(1.86, 0.18, 4.7, lower, 0, 0.47, 0);            // body
    p.box(1.9, 0.16, 1.35, C, 0, 1.18, -1.65, -0.04);                                           // hood
    p.box(1.86, 0.62, 1.55, C, 0, 1.47, -0.35); p.box(1.78, 0.07, 1.5, C, 0, 1.8, -0.35);        // cab
    for (const s of [-1, 1]) {
      glass.box(0.02, 0.42, 1.2, 0, 0.94 * s, 1.52, -0.35);
      p.box(0.08, 0.36, 2.0, C, 0.93 * s, 1.31, 1.4); p.box(0.1, 0.05, 2.0, chrome, 0.93 * s, 1.5, 1.4);   // bed sides with chrome rails
      p.box(0.18, 0.1, 0.24, trim, 1.03 * s, 1.48, -1.0);                                       // mirror
      for (const zz of [-wz, wz]) p.box(0.14, 0.14, 1.2, trim, 0.96 * s, 0.92, zz);             // fender flares
      p.box(0.24, 0.06, 1.6, chrome, 1.02 * s, 0.42, -0.2);                                     // side step
    }
    glass.box(1.74, 0.5, 0.03, 0, 0, 1.47, -1.13, 0.35, 0, 0); glass.box(1.6, 0.36, 0.03, 0, 0, 1.52, 0.43);
    p.box(1.8, 0.05, 2.0, dark, 0, 1.13, 1.4); p.box(1.86, 0.4, 0.08, C, 0, 1.3, 2.4);           // bed floor, tailgate
    p.cyl(0.04, 0.04, 1.8, trim, 0, 2.02, 0.5, 0, 0, RX); for (const s of [-0.88, 0.88]) p.cyl(0.04, 0.04, 0.9, trim, s, 1.6, 0.5);   // roll bar
    for (const s of [-0.4, 0, 0.4]) glow.box(0.18, 0.08, 0.03, VC.amber, s, 1.85, -1.11);         // cab lights
    p.box(2.0, 0.24, 0.2, chrome, 0, 0.62, -2.45); p.box(2.0, 0.2, 0.16, chrome, 0, 0.6, 2.47);
    p.box(1.3, 0.36, 0.05, chrome, 0, 0.94, -2.41); for (let i = 0; i < 3; i++) p.box(1.2, 0.05, 0.06, trim, 0, 0.84 + i * 0.1, -2.42);
    p.box(0.5, 0.16, 0.03, VC.white, 0, 0.8, 2.52);
    lamps(0.98, -2.4, 2.44, 0.7);
    doors(0.62, 1.14, -1.1, 0.4, 0.975);
    p.box(0.5, 0.3, 0.4, 0x7a4a24, 0.4, 1.3, 1.0); p.box(0.5, 0.3, 0.4, 0x7a4a24, -0.3, 1.3, 1.8);   // crates in the bed
  } else {
    wheelR = 0.42; wheelW = 0.3; wz = 1.4;
    p.box(1.96, 0.75, 4.5, C, 0, 0.88, 0); p.box(1.9, 0.18, 4.4, lower, 0, 0.45, 0);
    p.box(1.9, 0.16, 1.0, C, 0, 1.32, -1.75, -0.08);
    p.box(1.88, 0.66, 3.2, C, 0, 1.58, 0.55); p.box(1.8, 0.06, 3.1, C, 0, 1.94, 0.55);           // tall cabin
    for (const s of [-1, 1]) {
      glass.box(0.02, 0.46, 0.9, 0, 0.95 * s, 1.62, -0.55); glass.box(0.02, 0.46, 0.9, 0, 0.95 * s, 1.62, 0.5); glass.box(0.02, 0.46, 0.8, 0, 0.95 * s, 1.62, 1.55);
      for (const zz of [0, 1.05]) p.box(0.03, 0.5, 0.1, C, 0.955 * s, 1.62, zz);
      p.box(0.06, 0.06, 3.0, trim, 0.75 * s, 2.02, 0.55);                                       // roof rails
      p.box(0.18, 0.1, 0.22, trim, 1.04 * s, 1.5, -1.0);
      for (const zz of [-wz, wz]) p.box(0.12, 0.16, 1.15, trim, 0.98 * s, 0.98, zz);
    }
    for (const zz of [-0.2, 0.6, 1.4]) p.box(1.5, 0.05, 0.06, trim, 0, 2.06, zz);                 // roof rack bars
    p.box(1.0, 0.24, 0.8, 0x4b4f55, 0, 2.2, 0.6);                                                // roof box
    glass.box(1.76, 0.56, 0.03, 0, 0, 1.6, -1.07, 0.3, 0, 0); glass.box(1.6, 0.46, 0.03, 0, 0, 1.64, 2.16);
    p.box(2.0, 0.24, 0.2, trim, 0, 0.6, -2.3); p.box(2.0, 0.24, 0.2, trim, 0, 0.6, 2.32);
    p.box(1.3, 0.34, 0.05, trim, 0, 0.98, -2.26); for (let i = 0; i < 4; i++) p.box(0.06, 0.3, 0.06, chrome, -0.45 + i * 0.3, 0.98, -2.28);
    p.cyl(0.42, 0.42, 0.26, VC.tire, 0, 1.2, 2.42, RX, 0, 0, 1, 16); p.cyl(0.3, 0.3, 0.28, C, 0, 1.2, 2.42, RX, 0, 0, 1, 12);   // spare wheel with cover
    lamps(1.02, -2.26, 2.27, 0.68);
    doors(0.62, 1.24, -1.0, 1.1, 0.985);
  }
  car.add(new THREE.Mesh(p.build(), VEH_MAT));
  car.add(new THREE.Mesh(glass.build(), CAR_GLASS));
  car.add(new THREE.Mesh(glow.build(), VEH_GLOW));
  const wg = carWheelGeo(wheelR, wheelW, sport);
  for (const s of [-1, 1]) for (const zz of [-wz, wz]) { const w = new THREE.Mesh(wg, VEH_MAT); w.position.set((wx + (wheelW - 0.26) / 2 + 0.05) * s, wheelR, zz); car.add(w); }
  const half = kind === 'sedan' ? [0.95, 0.75, 2.2] : kind === 'muscle' ? [0.95, 0.72, 2.3] : [1.0, 0.95, 2.45];
  const b = new CANNON.Body({ mass: 70, shape: new CANNON.Box(new CANNON.Vec3(half[0], half[1], half[2])) });
  car.position.y = -half[1] - 0.2;
  b.position.set(x, heightAt(x, z) + half[1] + 0.2, z);
  if (alongX) b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
  return addProp(g, b, 'car', { hp: 8 });
}
