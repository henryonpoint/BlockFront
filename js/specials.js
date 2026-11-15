// ===================== specials.js : special vehicles =====================
// Race car, speed boat, Black Hawk, flying skateboard, hot air balloon, blimp (ground and air vehicles),
// plus two new planes: the F-18 fighter jet and the stealth bomber.
// They come from the cheat console, and the dogfight level uses the planes.
Object.assign(VTYPES, {
  racecar: {
    name: 'Race car', hp: 300, maxSpeed: 62, accel: 30, turn: 2.2, radius: 1.6, len: 4.4, wid: 1.9, bulletMult: 0.9, expMult: 1, camDist: 8,
    seats: [{ p: [0, 0.55, 0.2], role: 'drive', pose: 'sit', exposed: true }],
  },
  speedboat: {
    name: 'Speed boat', hp: 380, maxSpeed: 46, accel: 22, turn: 1.6, radius: 2.0, len: 5.6, wid: 2.0, bulletMult: 0.7, expMult: 1, camDist: 10, boat: true,
    seats: [{ p: [0, 0.95, 0.2], role: 'drive', pose: 'sit', exposed: true }, { p: [-0.5, 0.95, 1.4], role: 'ride', pose: 'sit', exposed: true }, { p: [0.5, 0.95, 1.4], role: 'ride', pose: 'sit', exposed: true }],
  },
  blackhawk: {
    name: 'Black Hawk', hp: 1100, maxSpeed: 52, accel: 11, turn: 1.3, radius: 3.2, len: 10, wid: 2.8, bulletMult: 0.3, expMult: 0.75, camDist: 16, heli: true,
    seats: VTYPES.heli.seats,
  },
  apache: {
    name: 'Apache', hp: 1500, maxSpeed: 58, accel: 12, turn: 1.5, radius: 3.0, len: 10, wid: 2.4, bulletMult: 0.22, expMult: 0.6, camDist: 16, heli: true, rocketT: 0.28,
    seats: [VTYPES.heli.seats[0], VTYPES.heli.seats[2]],
  },
  hoverboard: {
    name: 'Flying skateboard', hp: 150, maxSpeed: 100, accel: 55, turn: 4.2, radius: 0.9, len: 1.6, wid: 0.6, bulletMult: 1, expMult: 1, camDist: 6, heli: true, unarmed: true, agile: true,
    seats: [{ p: [0, 0.34, 0], role: 'drive', pose: 'surf', exposed: true }],
  },
  balloon: {
    name: 'Hot air balloon', hp: 300, maxSpeed: 9, accel: 4, turn: 0.6, radius: 2.4, len: 3, wid: 3, bulletMult: 0.5, expMult: 1, camDist: 20, heli: true, unarmed: true,
    seats: [{ p: [0, 1.15, 0.3], role: 'drive', pose: 'stand', exposed: true }, { p: [-0.45, 1.15, -0.4], role: 'ride', pose: 'stand', exposed: true }, { p: [0.45, 1.15, -0.4], role: 'ride', pose: 'stand', exposed: true }],
  },
  blimp: {
    name: 'Blimp', hp: 900, maxSpeed: 16, accel: 5, turn: 0.5, radius: 4, len: 24, wid: 6, bulletMult: 0.4, expMult: 0.8, camDist: 42, heli: true, unarmed: true,
    seats: [{ p: [0, 0.4, -1.4], role: 'drive', pose: 'sit', exposed: false }, { p: [-0.5, 0.4, 0.2], role: 'ride', pose: 'sit', exposed: false }, { p: [0.5, 0.4, 0.2], role: 'ride', pose: 'sit', exposed: false }, { p: [0, 0.4, 1.4], role: 'ride', pose: 'sit', exposed: false }],
  },
});

const makeVehicleModelPre = makeVehicleModel;
makeVehicleModel = function (type, team) {
  const SPECIAL = ['racecar', 'speedboat', 'blackhawk', 'hoverboard', 'balloon', 'blimp', 'apache'];
  if (!SPECIAL.includes(type)) return makeVehicleModelPre(type, team);
  if (type === 'apache') {   // an attack helicopter: dark olive, slimmer, with stub wings full of rockets and missiles
    const out = makeVehicleModelPre('heli', team);
    out.g.traverse(o => {
      if (!o.isMesh || !o.geometry.attributes.color || o.material === VEH_GLOW) return;
      o.geometry = o.geometry.clone(); const c = o.geometry.attributes.color;
      for (let i = 0; i < c.count; i++) { const r = c.getX(i), g = c.getY(i), b = c.getZ(i), l = (r + g + b) / 3; if (l > 0.85) continue; c.setXYZ(i, 0.12 + l * 0.32, 0.15 + l * 0.36, 0.08 + l * 0.22); }
    });
    out.body.scale.set(0.82, 0.95, 1.08);
    const p = new Part(), oc = 0x3a4228, dk = 0x22261a;
    for (const sd of [-1, 1]) {
      p.box(1.9, 0.12, 0.9, oc, sd * 1.45, 0.95, -0.2, 0, 0, sd * 0.12);                                   // stub wing
      for (const dx of [0.95, 1.85]) {
        p.cyl(0.22, 0.22, 1.5, dk, sd * dx, 0.62, -0.25, Math.PI / 2, 0, 0, 1, 10);                        // rocket pod
        p.cyl(0.18, 0.18, 0.04, 0x111111, sd * dx, 0.62, -1.01, Math.PI / 2, 0, 0, 1, 10);
      }
      for (const dy of [0.42, 0.72]) p.cyl(0.07, 0.07, 1.1, 0x6a6e60, sd * 2.35, dy, -0.2, Math.PI / 2, 0, 0, 1, 6);   // missiles on the wingtips
    }
    p.box(0.3, 0.3, 0.5, dk, 0, 0.35, -3.3); p.cyl(0.05, 0.05, 1.2, 0x111111, 0, 0.3, -3.9, Math.PI / 2, 0, 0, 1, 6);   // chin gun
    p.ball(0.32, 0x1a1c18, 0, 1.0, -4.0, 1, 1, 1);                                                          // nose sensor ball
    const add = new THREE.Mesh(p.build(), VEH_MAT); add.castShadow = true; out.body.add(add);
    return out;
  }
  if (type === 'blackhawk') {   // the helicopter, bigger and painted black
    const out = makeVehicleModelPre('heli', team);
    out.g.traverse(o => {
      if (!o.isMesh || !o.geometry.attributes.color || o.material === VEH_GLOW) return;
      o.geometry = o.geometry.clone(); const c = o.geometry.attributes.color;
      for (let i = 0; i < c.count; i++) { const r = c.getX(i), g = c.getY(i), b = c.getZ(i), l = (r + g + b) / 3; if (l > 0.85) continue; c.setXYZ(i, r * 0.3 + 0.03, g * 0.3 + 0.03, b * 0.3 + 0.035); }
    });
    out.g.scale.setScalar(1.12);
    return out;
  }
  const P = VPAINT[team] || VPAINT.blue, g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const wheels = [], out = { g, body, wheels };
  const mesh = (geo, mat, parent = body, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const glow = new Part(); let main;
  if (type === 'racecar') {
    main = vcached('racecar' + team, () => {
      const p = new Part();
      p.box(0.9, 0.36, 4.0, P.team, 0, 0.42, 0); p.box(0.5, 0.26, 1.2, P.team, 0, 0.36, -2.4, -0.12);          // body and nose
      for (const s of [-1, 1]) p.box(0.5, 0.34, 1.6, P.team, 0.66 * s, 0.4, 0.5);                                  // side pods
      p.box(2.0, 0.06, 0.5, VC.black, 0, 0.24, -2.9); for (const s of [-1, 1]) p.box(0.06, 0.24, 0.5, P.acc, 0.98 * s, 0.32, -2.9);   // front wing
      p.box(1.8, 0.07, 0.55, VC.black, 0, 1.05, 1.95); for (const s of [-1, 1]) p.box(0.06, 0.6, 0.6, P.team, 0.88 * s, 0.8, 1.95);   // rear wing
      p.box(0.5, 0.42, 0.9, P.team, 0, 0.78, 0.9, -0.15); p.cyl(0.18, 0.18, 0.3, VC.black, 0, 0.92, 0.5, RX);       // engine cover, air intake
      p.box(0.56, 0.1, 0.9, VC.black, 0, 0.62, -0.2); p.add(new THREE.TorusGeometry(0.34, 0.035, 6, 16, Math.PI), VC.dark, 0, 0.72, -0.5, 0, 0, 0);   // cockpit rim, halo
      p.box(0.2, 0.04, 3.4, VC.white, 0, 0.61, -0.4);                                                               // stripe
      return p;
    });
    for (const [x, z, r] of [[-0.95, -1.7, 0.36], [0.95, -1.7, 0.36], [-0.95, 1.4, 0.42], [0.95, 1.4, 0.42]]) wheels.push(mesh(wheelGeo(r, 0.42), VEH_MAT, body, x, r, z));
    for (const s of [-0.3, 0.3]) glow.box(0.12, 0.06, 0.03, VC.tail, s, 0.8, 2.25);
  } else if (type === 'speedboat') {
    main = vcached('speedboat' + team, () => {
      const p = new Part();
      p.box(1.9, 0.6, 4.4, VC.white, 0, 0.5, 0.3); p.box(1.3, 0.5, 1.6, VC.white, 0, 0.5, -2.5, 0, Math.PI / 4); // hull, pointed bow
      p.box(1.95, 0.12, 4.4, P.team, 0, 0.62, 0.3); p.box(1.7, 0.05, 3.6, 0x8a6238, 0, 0.82, 0.6);               // stripe, deck
      p.box(1.5, 0.4, 0.08, 0x9fc5e8, 0, 1.1, -0.5, -0.5);                                                         // windscreen
      p.box(0.6, 0.5, 0.6, VC.dark, 0, 0.9, 2.4); p.box(0.25, 0.5, 0.25, VC.dark2, 0, 0.45, 2.6);                  // outboard motor
      return p;
    });
  } else if (type === 'hoverboard') {
    main = vcached('hover' + team, () => {
      const p = new Part();
      p.box(0.75, 0.08, 1.8, P.team, 0, 0.26, 0); p.box(0.7, 0.06, 0.35, P.team, 0, 0.3, -0.95, 0.3); p.box(0.7, 0.06, 0.35, P.team, 0, 0.3, 0.95, -0.3);   // deck with kicked ends
      p.box(0.68, 0.012, 1.6, VC.black, 0, 0.305, 0); p.box(0.1, 0.014, 1.5, 0xffd54f, 0, 0.31, 0);                                                                // grip tape
      for (const z of [-0.5, 0.5]) p.cyl(0.18, 0.2, 0.1, VC.dark2, 0, 0.18, z, 0, 0, 0, 1, 12);                     // hover pads
      return p;
    });
    for (const z of [-0.6, 0.6]) glow.cyl(0.24, 0.24, 0.02, 0x58c8ff, 0, 0.12, z, 0, 0, 0, 1, 12);
  } else if (type === 'balloon') {
    main = vcached('balloon' + team, () => {
      const p = new Part();
      p.box(1.6, 0.9, 1.6, 0x8a6238, 0, 0.45, 0); p.box(1.66, 0.12, 1.66, 0x5a4024, 0, 0.92, 0);                  // wicker basket
      for (const [x, z] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) p.cyl(0.02, 0.02, 2.6, 0x5a4024, x * 1.2, 2.2, z * 1.2, z * 0.14, 0, -x * 0.14);   // ropes
      p.cyl(0.25, 0.3, 0.4, VC.steel, 0, 3.3, 0, 0, 0, 0, 1, 10);                                                    // burner
      for (let i = 0; i < 8; i++) p.add(new THREE.SphereGeometry(4.2, 16, 12, i * Math.PI / 4, Math.PI / 4), i % 2 ? P.team : 0xf2f2ee, 0, 7.6, 0, 0, 0, 0, 1, 1.2, 1);   // striped envelope
      p.cyl(1.0, 0.4, 1.4, P.team, 0, 3.3 + 0.9, 0, 0, 0, 0, 1, 16);                                                 // skirt
      return p;
    });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 8), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85 })); flame.position.y = 3.9; body.add(flame); out.flame = flame;
  } else {   // blimp
    main = vcached('blimp' + team, () => {
      const p = new Part();
      p.ball(1, 0xd8dce2, 0, 7, 0, 5.2, 5.2, 13);                                                                     // envelope
      p.ball(1, P.team, 0, 7, 0, 5.25, 1.0, 12.5);                                                                    // team band
      for (const [rz, x, y] of [[0, 0, 11.2], [0, 0, 2.8], [RX, 4.2, 7], [RX, -4.2, 7]]) p.box(rz ? 3.2 : 0.25, rz ? 0.25 : 3.2, 3.6, P.team, x, y, 11.2, 0, 0, 0);   // tail fins
      p.box(2.0, 1.4, 4.2, VC.white, 0, 0.9, 0); p.box(2.05, 0.4, 4.25, 0x9fc5e8, 0, 1.3, 0);                          // gondola and windows
      p.cyl(0.08, 0.08, 1.8, VC.dark, 0, 1.9, -1.5); p.cyl(0.08, 0.08, 1.8, VC.dark, 0, 1.9, 1.5);                    // struts
      for (const s of [-1, 1]) p.cyl(0.35, 0.35, 0.9, VC.dark2, 1.5 * s, 1.0, 1.2, RX);                               // engines
      return p;
    });
  }
  mesh(main, VEH_MAT);
  if (glow.pos.length) body.add(new THREE.Mesh(glow.build(), VEH_GLOW));
  if (VTYPES[type].heli) { out.rotor = new THREE.Object3D(); out.tail = new THREE.Object3D(); body.add(out.rotor, out.tail); out.pods = [new THREE.Object3D(), new THREE.Object3D()]; body.add(...out.pods); }
  g.traverse(o => { if (o.isMesh) o.userData.isVehiclePart = true; });
  scene.add(g);
  return out;
};
// a little life for the hoverboard (bob) and balloon (burner flame)
function updateSpecials(dt) {
  if (!_railsBuilt) buildRails();
  for (const v of gvehicles) {
    if (!v.alive) continue;
    if (v.type === 'balloon' && v.model.flame) { const up = driverOf(v) && driverOf(v).isPlayer ? keys.Space : v.vel && v.vel.y > 1; v.model.flame.visible = !!up || Math.random() < 0.05; v.model.flame.scale.setScalar(0.8 + Math.random() * 0.5); }
    if (v.type === 'hoverboard') {
      v.model.body.position.y = Math.sin(simTime * 3 + v.idx) * 0.05;
      const yr = dt > 0 ? wrapAngle(v.yaw - (v._lastYaw === undefined ? v.yaw : v._lastYaw)) / dt : 0; v._lastYaw = v.yaw;
      const side = v.vel ? (v.vel.x * Math.cos(v.yaw) - v.vel.z * Math.sin(v.yaw)) : 0;   // sliding right is +
      v.lean = lerp(v.lean || 0, clamp(yr * 0.35 + side * 0.025, -0.7, 0.7), Math.min(1, dt * 6));
      v.model.body.rotation.z = -v.lean;   // the board tilts with the rider
    }
  }
}

// ---------- planes ----------
function jetModel(team, kind) {
  const P = VPAINT[team] || VPAINT.blue, g = new THREE.Group();
  const geo = vcached(kind + team, () => {
    const p = new Part();
    if (kind === 'f18' || kind === 'f22') {
      const F22 = kind === 'f22', main = F22 ? 0x6e747c : 0x8d96a0, dark = F22 ? 0x50565d : 0x6a737d, black = 0x1c1e22;
      // a flat plate from a top-view outline (right half, mirrored), and a fin standing on edge
      const plate = (half, y, t, col) => { const sh = new THREE.Shape(), pts = half.concat(half.slice().reverse().map(([x, z]) => [-x, z])); pts.forEach(([x, z], i) => i ? sh.lineTo(x, z) : sh.moveTo(x, z)); sh.closePath(); p.add(new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false }), col, 0, y, 0, RX, 0, 0); };
      const fin = (side, x, cant, outline, col) => { const sh = new THREE.Shape(); outline.forEach(([z, y], i) => i ? sh.lineTo(z, y) : sh.moveTo(z, y)); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.rotateZ(cant * side); g.translate(x * side, 0, 0); p.add(g, col, 0, 0.2, 0); };
      // fuselage: long and slim, flattened, with a sharp nose (six-sided on the F-22 for its angular stealth look)
      const seg = F22 ? 6 : 14;
      p.add(new THREE.CylinderGeometry(0.62, 0.7, 7.6, seg), main, 0, 0, 0.6, RX, 0, 0, 1.25, 1, 0.78);
      p.add(new THREE.CylinderGeometry(0.08, 0.62, 2.8, seg), main, 0, 0, -4.6, -RX, 0, 0, 1.25, 1, 0.75);
      p.add(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), black, 0, 0, -6.2, RX, 0, 0);   // pitot tip
      if (F22) {
        plate([[0.3, -5.4], [1.0, -2.4], [5.4, 1.5], [5.3, 2.2], [1.0, 3.0], [0.2, 3.0]], 0.05, 0.12, main);          // diamond wing with chines
        plate([[0.8, 3.1], [2.9, 4.5], [2.7, 5.4], [0.7, 5.1]], 0.0, 0.08, main);                                    // tailplanes
        for (const sd of [-1, 1]) { fin(sd, 1.05, 0.45, [[2.2, 0], [4.4, 0], [4.9, 1.9], [3.7, 1.9]], main);
          p.box(0.75, 0.75, 2.6, dark, 1.05 * sd, -0.15, -1.0, 0, 0, 0.2 * sd);                                   // angled intakes
          p.box(0.6, 0.55, 0.12, black, 1.05 * sd, -0.15, -2.32, 0, 0, 0.2 * sd);
          p.box(0.75, 0.32, 0.7, dark, 0.48 * sd, 0, 4.65); p.box(0.6, 0.2, 0.05, black, 0.48 * sd, 0, 5.02); }      // flat thrust nozzles
      } else {
        plate([[0.45, -4.6], [1.0, -1.4], [2.0, 0.0], [5.4, 1.5], [5.4, 2.3], [2.2, 2.6], [0.3, 2.6]], 0.02, 0.1, main);   // wings with long leading-edge strakes
        plate([[0.6, 3.4], [2.3, 4.4], [2.4, 5.2], [0.6, 5.0]], -0.05, 0.08, main);                                // tailplanes
        for (const sd of [-1, 1]) { fin(sd, 0.95, 0.35, [[2.0, 0], [4.5, 0], [4.9, 2.1], [4.0, 2.1]], main);
          p.box(0.55, 0.6, 2.2, dark, 0.95 * sd, -0.4, -0.7); p.box(0.5, 0.5, 0.1, black, 0.95 * sd, -0.4, -1.82);   // intakes under the strakes
          p.cyl(0.4, 0.36, 0.7, dark, 0.45 * sd, -0.02, 4.9, RX, 0, 0, 1, 12); p.cyl(0.32, 0.32, 0.05, black, 0.45 * sd, -0.02, 5.26, RX, 0, 0, 1, 12);   // round nozzles
          p.box(0.12, 0.12, 0.9, 0xc8ccd0, 5.45 * sd, 0.05, 1.9); }                                               // wingtip missiles
      }
      p.box(0.3, 0.04, 2.4, P.team, 0, 0.56, 1.4);   // team colour stripe along the spine
    } else {   // stealth bomber: a B-2 style flying wing, swept leading edge and a sawtooth trailing edge
      const grey = 0x3c4047, dark = 0x2b2e33, half = [[0, -5.6], [10.5, 2.3], [9.6, 3.2], [6.0, 0.9], [3.4, 3.3], [1.6, 1.8], [0, 3.0]];
      const sh = new THREE.Shape(); const pts = half.concat(half.slice(1, -1).reverse().map(([x, z]) => [-x, z]));
      pts.forEach(([x, z], i) => i ? sh.lineTo(x, z) : sh.moveTo(x, z)); sh.closePath();
      p.add(new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 1 }), grey, 0, 0.1, 0, RX, 0, 0);
      p.ball(1, dark, 0, 0.32, -1.2, 1.5, 0.62, 3.6);                                                     // the raised middle with the crew
      for (const [x, z] of [[-0.42, -3.2], [0.42, -3.2]]) p.box(0.5, 0.08, 0.35, 0x111316, x, 0.72, z, -0.35, 0, 0);   // cockpit windows
      for (const s of [-1, 1]) for (const x of [1.9, 3.0]) {
        p.ball(1, dark, x * s, 0.26, -0.2, 0.5, 0.34, 1.9);                                              // engine humps on top
        p.box(0.6, 0.1, 0.22, 0x111316, x * s, 0.5, -1.4);                                              // intakes
        p.box(0.7, 0.06, 0.5, 0x6a5040, x * s, 0.32, 1.7);                                              // exhaust trench
      }
      p.box(0.9, 0.03, 0.35, P.team, 7.2, 0.24, 1.4); p.box(0.9, 0.03, 0.35, P.team, -7.2, 0.24, 1.4);   // small team marks
    }
    return p;
  });
  const m = new THREE.Mesh(geo, VEH_MAT); m.castShadow = true; g.add(m);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshPhongMaterial({ color: 0x223344, transparent: true, opacity: 0.6, shininess: 100 }));
  canopy.scale.set(0.8, 0.6, 2.2); canopy.position.set(0, kind === 'stealth' ? 0.75 : 0.62, kind === 'stealth' ? -2.2 : -3.4); g.add(canopy);
  const prop = new THREE.Object3D(); g.add(prop);
  const bomb = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 10), new THREE.MeshLambertMaterial({ color: 0x30343a })); bomb.rotation.x = RX; bomb.position.set(0, -0.6, 0); g.add(bomb);
  const gunYaw = new THREE.Group(); gunYaw.position.set(0, 0.6, 2.5); g.add(gunYaw); const gunPitch = new THREE.Group(); gunYaw.add(gunPitch);
  g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  scene.add(g);
  return { g, prop, bomb, canopy, gunYaw, gunPitch };
}
// speed (times the normal plane), toughness, bombs and how fast they reload
const PLANE_KINDS = {
  prop: { name: 'Fighter plane', spd: 1, hp: 320, bombs: 1, regen: 25, model: team => makePlaneModel(team) },
  f18: { name: 'F-18 Hornet', spd: 1.75, hp: 420, bombs: 2, regen: 15, model: team => jetModel(team, 'f18') },
  f22: { name: 'F-22 Raptor', spd: 2.0, hp: 480, bombs: 2, regen: 12, model: team => jetModel(team, 'f22') },
  stealth: { name: 'Stealth bomber', spd: 1.35, hp: 700, bombs: 2, regen: 30, bombBig: true, model: team => jetModel(team, 'stealth') },
};

// ---------- the mini rocket: climb on, press W or Space, and it blasts you straight up ----------
VTYPES.minirocket = {
  name: 'Mini rocket', hp: 200, maxSpeed: 0, accel: 0, turn: 0, radius: 0.8, len: 1, wid: 1, bulletMult: 1, expMult: 1, camDist: 9, rocket: true,
  seats: [{ p: [0, 1.0, 0.55], role: 'drive', pose: 'stand', exposed: true }],
};
const makeVehicleModelPre2 = makeVehicleModel;
makeVehicleModel = function (type, team) {
  if (type !== 'minirocket') return makeVehicleModelPre2(type, team);
  const P = VPAINT[team] || VPAINT.blue, g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const geo = vcached('minirocket' + team, () => {
    const p = new Part();
    p.cyl(0.32, 0.36, 3.0, VC.white, 0, 1.9, 0, 0, 0, 0, 1, 14); p.cyl(0.01, 0.32, 0.9, P.team, 0, 3.85, 0, 0, 0, 0, 1, 14);   // body, nose cone
    p.cyl(0.37, 0.37, 0.3, P.team, 0, 2.6, 0, 0, 0, 0, 1, 14); p.cyl(0.3, 0.22, 0.4, VC.dark, 0, 0.25, 0, 0, 0, 0, 1, 12);       // band, nozzle
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; p.box(0.06, 0.8, 0.5, P.team, Math.sin(a) * 0.45, 0.75, Math.cos(a) * 0.45, 0, a, 0); }   // fins
    p.box(0.5, 0.06, 0.3, VC.dark2, 0, 0.98, 0.5); p.box(0.5, 0.06, 0.06, VC.steel, 0, 2.2, 0.38);                          // footrest and handle
    return p;
  });
  const m = new THREE.Mesh(geo, VEH_MAT); m.castShadow = true; body.add(m);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.8, 10), new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.rotation.x = Math.PI; flame.position.y = -0.8; flame.visible = false; body.add(flame);
  g.traverse(o => { if (o.isMesh) o.userData.isVehiclePart = true; });
  scene.add(g);
  return { g, body, wheels: [], flame };
};
function simMiniRocket(v, dt, inp) {
  if (!v.vel) v.vel = new THREE.Vector3();
  const ground = groundAt(v.pos.x, v.pos.z, v.pos.y + 0.5), drv = driverOf(v);
  v.pitch = 0; v.roll = 0;
  if (!v.launched) {
    v.pos.y = ground; v.speed = 0; v.airborne = false;
    if (drv && (inp.thr > 0 || inp.up)) { v.launched = true; v.burn = 1.3; v.vel.set(0, 8, 0); playAt('rocket', v.pos, 1.2); if (drv.isPlayer) showMessage('3... 2... 1... LIFT OFF!', 2); }
    return;
  }
  v.airborne = true;
  if (v.burn > 0) {
    v.burn -= dt; v.vel.y = Math.min(110, v.vel.y + 150 * dt);
    v.smokeT = (v.smokeT || 0) - dt; if (v.smokeT <= 0) { v.smokeT = 0.03; smokePuff(v.pos.clone().add(new THREE.Vector3(rand(-0.2, 0.2), -0.6, rand(-0.2, 0.2))), 0xdddddd, 0.6, 2.2, 0.1); }
    if (drv && drv.isPlayer) camShake = Math.max(camShake, 0.02);
  } else v.vel.y -= 22 * dt;
  if (v.model.flame) { v.model.flame.visible = v.burn > 0; v.model.flame.scale.set(1, 0.8 + Math.random() * 0.6, 1); }
  v.pos.y += v.vel.y * dt;
  // at the top: riders jump off with a parachute
  if (v.burn <= 0 && v.vel.y < 8) for (const c of occupants(v)) {
    if (c.isRemote) continue;
    leaveSeat(c);
    if (c === player) { player.pos.copy(v.pos).add(new THREE.Vector3(1.5, 0, 0)); player.velY = 0; openChute(); showMessage(`${Math.round(v.pos.y - ground)} meters up! Steer your parachute down`, 3); }
    else { c.pos.copy(v.pos); }
  }
  if (v.vel.y < 0 && v.pos.y <= ground) { v.pos.y = ground; explosion(v.pos.clone(), 7, 30, drv || null, 120); damageVehicle(v, 99999, null); }
}

// ---------- minecarts run on rails in the tunnels ----------
let _rsegs = null, _railsBuilt = false;
function buildRails() {
  _railsBuilt = true;
  if (typeof TNODES === 'undefined' || !TNODES.size || typeof TUN_Y === 'undefined') return;
  const p = new Part(), seen = new Set();
  for (const [k, n] of TNODES) for (const [k2] of n.edges) {
    const id = k < k2 ? k + '|' + k2 : k2 + '|' + k; if (seen.has(id)) continue; seen.add(id);
    const m = TNODES.get(k2); if (!m) continue;
    const dx = m.x - n.x, dz = m.z - n.z, L = Math.hypot(dx, dz); if (L < 0.5) continue;
    const ry = Math.atan2(dx, dz), ux = dx / L, uz = dz / L, rx = uz, rz = -ux;
    for (const s of [-0.55, 0.55]) p.box(0.08, 0.1, L + 0.6, 0x9aa0a6, (n.x + m.x) / 2 + rx * s, TUN_Y + 0.08, (n.z + m.z) / 2 + rz * s, 0, ry, 0);   // the two rails
    for (let t = 0.6; t < L; t += 1.4) p.box(1.6, 0.06, 0.25, 0x5a4024, n.x + ux * t, TUN_Y + 0.02, n.z + uz * t, 0, ry, 0);                       // sleepers
  }
  if (!p.pos.length) return;
  const mesh = new THREE.Mesh(p.build(), VEH_MAT); mesh.receiveShadow = true; scene.add(mesh);
}
// moves a cart along the tunnel lines. A or D at a junction picks the left or right branch. Returns false off the rails.
function railStep(v, dt, inp) {
  if (typeof TNODES === 'undefined' || !TNODES.size) return false;
  const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw), rx = Math.cos(v.yaw), rz = -Math.sin(v.yaw);
  if (!v.rail) {   // get onto the nearest line, facing the way the cart points
    let best = null, bd = 5;
    for (const [k, n] of TNODES) for (const [k2] of n.edges) { const m = TNODES.get(k2); if (!m) continue; const d = distToSeg(v.pos.x, v.pos.z, n.x, n.z, m.x, m.z); if (d < bd) { bd = d; best = [n, m]; } }
    if (!best) return false;
    let [a, b] = best; if ((b.x - a.x) * fx + (b.z - a.z) * fz < 0) [a, b] = [b, a];
    const L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    v.rail = { a, b, t: clamp(((v.pos.x - a.x) * (b.x - a.x) + (v.pos.z - a.z) * (b.z - a.z)) / L, 0, L) };
  }
  const R = v.rail;
  const pickNext = (from, avoid, ux, uz) => {   // which line to take at a junction
    const opts = from.edges.map(e => TNODES.get(e[0])).filter(n => n && n !== avoid);
    if (!opts.length) return null;
    let best = null, bs = -Infinity;
    for (const n of opts) { const L = Math.hypot(n.x - from.x, n.z - from.z) || 1, cx = (n.x - from.x) / L, cz = (n.z - from.z) / L; const straight = cx * ux + cz * uz, side = cx * -uz + cz * ux;   // side > 0: to the left
      const score = inp.steer > 0.1 ? side * 2 + straight * 0.3 : inp.steer < -0.1 ? -side * 2 + straight * 0.3 : straight; if (score > bs) { bs = score; best = n; } }
    return best;
  };
  let move = v.speed * dt;
  for (let guard = 0; guard < 8; guard++) {
    const L = Math.hypot(R.b.x - R.a.x, R.b.z - R.a.z) || 1, ux = (R.b.x - R.a.x) / L, uz = (R.b.z - R.a.z) / L;
    R.t += move; move = 0;
    if (R.t > L) { const over = R.t - L, nx = pickNext(R.b, R.a, ux, uz); if (!nx) { const ta = R.a; R.a = R.b; R.b = ta; R.t = 0; v.speed = Math.min(v.speed, 4); if (driverOf(v) && driverOf(v).isPlayer) showMessage('End of the line: turning around', 1.2); break; } /* end of the line: the cart turns round */ R.a = R.b; R.b = nx; R.t = 0; move = over; continue; }
    if (R.t < 0) { const back = R.t, pv = pickNext(R.a, R.b, -ux, -uz); if (!pv) { R.t = 0; v.speed = 0; break; } R.b = R.a; R.a = pv; R.t = Math.hypot(R.b.x - R.a.x, R.b.z - R.a.z); move = back; continue; }
    break;
  }
  const L = Math.hypot(R.b.x - R.a.x, R.b.z - R.a.z) || 1, ux = (R.b.x - R.a.x) / L, uz = (R.b.z - R.a.z) / L;
  v.pos.x = R.a.x + ux * R.t; v.pos.z = R.a.z + uz * R.t;
  v.yaw += wrapAngle(Math.atan2(-ux, -uz) - v.yaw) * Math.min(1, dt * 14);
  return true;
}
