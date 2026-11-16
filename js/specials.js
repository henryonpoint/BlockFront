// ===================== specials.js : special vehicles =====================
// Race car, speed boat, Black Hawk, flying skateboard, hot air balloon, blimp (ground and air vehicles),
// plus two new planes: the F-18 fighter jet and the stealth bomber.
// They come from the cheat console, and the dogfight level uses the planes.
Object.assign(VTYPES, {
  racecar: {
    name: 'Race car', hp: 300, maxSpeed: 62, accel: 30, turn: 2.2, radius: 1.6, len: 4.4, wid: 1.9, bulletMult: 0.9, expMult: 1, camDist: 8,
    seats: [{ p: [0, 0.55, 0.2], role: 'drive', pose: 'sit', exposed: true }],
  },
  timecar: {
    name: 'Time Racer', hp: 360, maxSpeed: 68, accel: 32, turn: 2.0, radius: 1.7, len: 4.3, wid: 1.9, bulletMult: 0.8, expMult: 1, camDist: 8,
    seats: [{ p: [-0.38, 0.85, 0.1], role: 'drive', pose: 'sit', exposed: false }, { p: [0.38, 0.85, 0.1], role: 'ride', pose: 'sit', exposed: false }],
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
    seats: [{ p: [0, 1.55, -0.85], role: 'drive', pose: 'sit', exposed: false }, { p: [0, 1.25, -2.15], role: 'ride', pose: 'sit', exposed: false }],   // pilot behind, gunner in front
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
  const SPECIAL = ['racecar', 'speedboat', 'blackhawk', 'hoverboard', 'balloon', 'blimp', 'apache', 'timecar'];
  if (!SPECIAL.includes(type)) return makeVehicleModelPre(type, team);
  if (type === 'blackhawk' || type === 'apache') return heliCustomModel(type, team);
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
  } else if (type === 'timecar') {   // an original time machine: a stainless steel wedge with glowing blue strips and an energy core
    main = vcached('timecar' + team, () => {
      const p = new Part(), steel = 0xc6cacf, dark = 0x24262a;
      p.box(1.9, 0.55, 4.2, steel, 0, 0.62, 0); p.box(1.85, 0.3, 1.4, steel, 0, 0.82, -1.5, 0.18, 0, 0);    // body, sloping nose
      p.box(1.6, 0.5, 1.6, steel, 0, 1.12, 0.25, -0.12, 0, 0); p.box(1.5, 0.42, 1.2, 0x2a3440, 0, 1.15, -0.3, 0.45, 0, 0);   // cabin roof, raked windscreen
      for (let i = 0; i < 6; i++) p.box(1.45, 0.04, 0.1, dark, 0, 1.18 - i * 0.05, 0.95 + i * 0.12, -0.5, 0, 0);   // louvres over the back window
      p.box(1.9, 0.12, 0.2, dark, 0, 0.5, -2.08); p.box(1.9, 0.18, 0.25, dark, 0, 0.62, 2.1);               // bumpers
      for (const sd of [-1, 1]) { p.box(0.04, 0.06, 3.4, dark, sd * 0.96, 0.55, 0); p.box(0.3, 0.06, 0.25, dark, sd * 0.7, 0.5, -2.1); }   // side trim, grille
      p.box(1.0, 0.35, 0.55, dark, 0, 1.0, 1.7);                                                             // the box for the energy core
      return p;
    });
    for (const [x, z] of [[-0.95, -1.35], [0.95, -1.35], [-0.95, 1.35], [0.95, 1.35]]) wheels.push(mesh(wheelGeo(0.36, 0.3), VEH_MAT, body, x, 0.36, z));
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x3ad8ff, transparent: true, opacity: 0.85 });
    const strips = new THREE.Group(); body.add(strips);
    for (const sd of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 3.6), glowMat); st.position.set(sd * 0.98, 0.42, 0); strips.add(st); }
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 12), glowMat); core.rotation.z = Math.PI / 2; core.position.set(0, 1.22, 1.7); strips.add(core);
    for (const sd of [-0.55, 0.55]) glow.box(0.3, 0.1, 0.03, VC.lamp, sd, 0.72, -2.12);
    out.timeGlow = glowMat;
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
    if (v.type === 'timecar') {   // hold it at top speed for 2 seconds and it jumps through time: 250 m ahead in a flash
      const drv = driverOf(v), fast = drv && v.speed > v.T.maxSpeed * 0.9;
      v.charge = fast ? (v.charge || 0) + dt : Math.max(0, (v.charge || 0) - dt * 2);
      if (v.model.timeGlow) { v.model.timeGlow.opacity = 0.5 + Math.min(1, v.charge / 2) * 0.5 * (0.6 + Math.random() * 0.4); v.model.timeGlow.color.setHex(v.charge > 1.2 ? 0xffffff : 0x3ad8ff); }
      if (v.charge > 0.4 && Math.random() < v.charge * dt * 6) burst(v.pos.clone().add(new THREE.Vector3(rand(-1, 1), 0.6, rand(-2, 2))), 3, 0x6ae4ff, 3, 0.25, 0.05);   // blue sparks
      if (v.charge > 2 && drv && (drv.isPlayer || !net.active || net.isHost)) {
        v.charge = 0;
        const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw), from = v.pos.clone();
        let tx = clamp(v.pos.x + fx * 250, -EDGE + 20, EDGE - 20), tz = clamp(v.pos.z + fz * 250, -EDGE + 20, EDGE - 20);
        if (waterDepth(tx, tz) > 0.5 || blockedAt(tx, tz, heightAt(tx, tz), 2, true)) { tx = clamp(v.pos.x + fx * 120, -EDGE + 20, EDGE - 20); tz = clamp(v.pos.z + fz * 120, -EDGE + 20, EDGE - 20); }
        v.pos.set(tx, heightAt(tx, tz), tz); v.lastGround = v.pos.y;
        for (const p of [from, v.pos]) { burst(p.clone().add(new THREE.Vector3(0, 1, 0)), 30, 0x6ae4ff, 12, 0.8, 0.2); playAt('laser', p, 1.2); }
        if (drv.isPlayer) { if (typeof unlock === 'function') unlock('timejump'); showMessage('TIME JUMP!', 1.5); camShake = Math.max(camShake, 0.08); }
      }
    }
    if (v.type === 'hoverboard') {
      v.model.body.position.y = Math.sin(simTime * 3 + v.idx) * 0.05;
      const yr = dt > 0 ? wrapAngle(v.yaw - (v._lastYaw === undefined ? v.yaw : v._lastYaw)) / dt : 0; v._lastYaw = v.yaw;
      const side = v.vel ? (v.vel.x * Math.cos(v.yaw) - v.vel.z * Math.sin(v.yaw)) : 0;   // sliding right is +
      v.lean = lerp(v.lean || 0, clamp(yr * 0.3 - (v.strafeIn || 0) * 0.4, -0.55, 0.55), Math.min(1, dt * 5));   // lean the way you steer or slide (left is +)
      v.model.body.rotation.z = v.lean;   // the board carves: its inside edge dips into the turn, under the rider
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
      // finer detail: a darker radar nose, gun port, canopy frame and headrest, panel lines, leading-edge strips,
      // lights, nozzle petals, tail stripes, and (on the F-18) missiles on pylons and a centre fuel tank
      const radome = F22 ? 0x5a6068 : 0x6c747c, panel = F22 ? 0x5e646b : 0x7a838d, lite = 0xb8ffb0;
      p.add(new THREE.CylinderGeometry(0.06, 0.34, 1.2, F22 ? 6 : 14), radome, 0, 0, -5.45, -RX, 0, 0, 1.25, 1, 0.75);
      p.box(0.12, 0.06, 0.25, black, 0.42, 0.22, -3.6);                                                      // gun port
      p.box(0.04, 0.04, 1.9, black, 0, 0.93, -3.4); p.box(0.7, 0.04, 0.05, black, 0, 0.82, -2.9);                // canopy frame
      p.box(0.34, 0.32, 0.12, black, 0, 0.72, -2.75); p.box(0.22, 0.08, 0.3, 0x2a2e33, 0, 0.62, -4.3);      // ejection seat headrest, coaming
      for (const z of [-2.2, -0.8, 0.6, 2.0, 3.4]) p.box(1.05, 0.015, 0.03, panel, 0, 0.5, z);               // panel lines across the spine
      p.box(0.03, 0.015, 6.0, panel, 0.32, 0.49, 0.4); p.box(0.03, 0.015, 6.0, panel, -0.32, 0.49, 0.4);
      for (const sd of [-1, 1]) {
        p.box(0.4, 0.04, 0.08, lite, 1.2 * sd, 0.55, 0.3);                                                  // formation lights
        p.box(0.08, 0.06, 0.12, sd > 0 ? 0x30d040 : 0xe03030, 5.35 * sd, 0.06, 1.85);                       // wingtip nav lights
      }
      if (!F22) {
        for (const sd of [-1, 1]) for (const x of [2.6, 3.9]) {
          p.box(0.12, 0.3, 0.9, panel, x * sd, -0.15, 1.6);                                                 // pylon
          p.cyl(0.1, 0.1, 2.4, 0xd8dadc, x * sd, -0.4, 1.5, RX, 0, 0, 1, 10); p.cyl(0.01, 0.1, 0.35, 0x8a8e92, x * sd, -0.4, 0.15, -RX, 0, 0, 1, 10);   // missile and its nose
          for (let f = 0; f < 4; f++) p.box(0.02, 0.28, 0.28, 0xb0b4b8, x * sd, -0.4, 2.55, 0, 0, f * Math.PI / 4);   // tail fins
        }
        p.cyl(0.32, 0.32, 3.0, 0x9aa2aa, 0, -0.75, 0.6, RX, 0, 0, 1, 14); p.cyl(0.02, 0.32, 0.7, 0x9aa2aa, 0, -0.75, -1.25, -RX, 0, 0, 1, 14); p.cyl(0.02, 0.32, 0.7, 0x9aa2aa, 0, -0.75, 2.45, RX, 0, 0, 1, 14);   // centre fuel tank
        p.box(0.1, 0.08, 0.9, black, 0, -0.42, 4.6, 0.25, 0, 0);                                          // tail hook
        for (const sd of [-1, 1]) for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; p.box(0.1, 0.03, 0.22, 0x5a5048, 0.45 * sd + Math.cos(a) * 0.38, -0.02 + Math.sin(a) * 0.38, 5.32); }   // nozzle petals
      } else {
        for (const sd of [-1, 1]) { p.box(0.7, 0.015, 1.6, panel, 0.55 * sd, -0.5, 0.2); p.box(0.03, 0.015, 1.6, black, 0.9 * sd, -0.5, 0.2); }   // weapon bay doors underneath
        p.box(1.6, 0.015, 0.03, panel, 0, -0.5, -0.6); p.box(1.6, 0.015, 0.03, panel, 0, -0.5, 1.0);
      }
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
  if (kind === 'f18' || kind === 'f22') {   // afterburner flames, shown while the afterburner is on
    const ab = new THREE.Group(); ab.visible = false; g.add(ab);
    const fm = new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const cm = new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const sd of [-1, 1]) {
      const x = sd * (kind === 'f22' ? 0.48 : 0.45), z = kind === 'f22' ? 5.2 : 5.4;
      const outer = new THREE.Mesh(new THREE.ConeGeometry(0.4, 3.2, 10), fm); outer.rotation.x = Math.PI / 2; outer.position.set(x, 0, z + 1.6); ab.add(outer);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.6, 8), cm); inner.rotation.x = Math.PI / 2; inner.position.set(x, 0, z + 0.8); ab.add(inner);
    }
    g.userData.ab = ab;
  }
  return { g, prop, bomb, canopy, gunYaw, gunPitch };
}
// World War 1 fighters: a red triplane (three stacked wings, like the famous Red Baron's) and a two-winged biplane
function ww1Model(team, kind) {
  const tri = kind === 'triplane', g = new THREE.Group();
  const body = tri ? 0xb8221a : 0x8c7a4c, wingTop = tri ? 0xc42a20 : 0xd9ceb0, wingUnder = tri ? 0x9c1c16 : 0xc8bc98, metal = 0x7a7c80, wood = 0x6b4a2a, dark = 0x24201c;
  const geo = vcached('ww1b_' + kind + team, () => {
    const p = new Part();
    // a round body that tapers to the tail, with a metal cowling around the engine at the front
    p.cyl(0.62, 0.68, 1.6, body, 0, 0, -1.2, Math.PI / 2, 0, 0, 1, 14);
    p.cyl(0.68, 0.42, 2.4, body, 0, 0.02, 0.8, Math.PI / 2, 0, 0, 1, 14);
    p.cyl(0.42, 0.1, 2.2, body, 0, 0.08, 3.1, Math.PI / 2, 0, 0, 1, 12);
    p.cyl(0.72, 0.72, 0.5, metal, 0, 0, -2.1, Math.PI / 2, 0, 0, 1, 16);                     // cowling
    p.cyl(0.5, 0.5, 0.3, 0x3a3a3a, 0, 0, -2.4, Math.PI / 2, 0, 0, 1, 14);                     // engine face
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; p.box(0.12, 0.12, 0.3, 0x555555, Math.sin(a) * 0.42, Math.cos(a) * 0.42, -2.45); }   // rotary engine cylinders
    // wings with rounded tips: stacked one above another, the top one painted, the undersides a shade darker
    const wing = (y, span, chord) => {
      p.box(span - chord, 0.12, chord, wingTop, 0, y, -0.9);
      for (const sd of [-1, 1]) p.add(new THREE.CylinderGeometry(chord / 2, chord / 2, 0.12, 14, 1, false, sd > 0 ? 0 : Math.PI, Math.PI), wingTop, sd * (span - chord) / 2, y, -0.9, 0, 0, 0);
      p.box(span - chord, 0.02, chord - 0.1, wingUnder, 0, y - 0.07, -0.9);
      for (let x = -span / 2 + 0.6; x < span / 2 - 0.4; x += 0.7) p.box(0.04, 0.13, chord - 0.05, wingUnder, x, y + 0.005, -0.9);   // ribs
    };
    const wings = tri ? [[-0.45, 6.4, 1.15], [0.45, 6.8, 1.15], [1.35, 7.4, 1.15]] : [[-0.45, 8.2, 1.4], [1.25, 8.6, 1.4]];
    wings.forEach(([y, sp, ch]) => wing(y, sp, ch));
    const lo = wings[0][0], hi = wings[wings.length - 1][0];
    for (const sd of [-1, 1]) {
      for (const dz of [-1.35, -0.45]) p.box(0.06, hi - lo, 0.06, wood, sd * (tri ? 2.6 : 3.2), (lo + hi) / 2, dz);     // outer struts
      p.box(0.05, hi - 0.3, 0.05, dark, sd * 0.45, (0.3 + hi) / 2 - 0.15, -1.4);                                       // cabane struts
      p.box(0.05, 0.05, Math.hypot(hi - lo, tri ? 2.6 : 3.2), 0x9a9a9a, sd * (tri ? 1.3 : 1.6), (lo + hi) / 2, -0.9, 0, 0, sd * Math.atan2(hi - lo, tri ? 2.6 : 3.2));   // bracing wire
      p.box(0.06, 0.9, 0.06, dark, sd * 0.55, -0.85, -1.3, 0.25, 0, -sd * 0.25); p.cyl(0.36, 0.36, 0.14, 0x1a1a1a, sd * 0.75, -1.35, -1.25, 0, 0, Math.PI / 2, 1, 14); p.cyl(0.14, 0.14, 0.16, metal, sd * 0.75, -1.35, -1.25, 0, 0, Math.PI / 2, 1, 8);   // landing gear
    }
    p.box(1.4, 0.06, 0.12, wood, 0, -1.35, -1.25);                                                                     // axle
    // tail: a flat tailplane with an elevator and a rounded rudder
    p.box(2.6, 0.07, 0.8, wingTop, 0, 0.1, 4.0); p.box(2.6, 0.06, 0.35, wingUnder, 0, 0.1, 4.55);
    p.add(new THREE.CylinderGeometry(0.55, 0.55, 0.07, 14, 1, false, 0, Math.PI), body, 0, 0.55, 4.0, 0, Math.PI / 2, Math.PI / 2);
    p.box(0.06, 0.25, 0.25, dark, 0, -0.35, 4.1);                                                                      // tail skid
    // the open cockpit, with the pilot's head and goggles, and twin guns on top of the nose
    p.cyl(0.42, 0.42, 0.12, dark, 0, 0.62, 0.15, 0, 0, 0, 1, 12);
    p.ball(0.24, 0x5a3a24, 0, 0.88, 0.2); p.box(0.36, 0.08, 0.1, 0x1a1a1a, 0, 0.92, 0.0);                              // helmet, goggles
    for (const sd of [-0.16, 0.16]) p.cyl(0.05, 0.05, 1.1, 0x1a1a1a, sd, 0.68, -1.1, Math.PI / 2, 0, 0, 1, 6);
    // markings: team colour bands on the body and roundels on the top wing (no flags or emblems)
    const tc = (VPAINT[team] || VPAINT.blue).team;
    p.cyl(0.7, 0.7, 0.25, tri ? 0xf2f2f2 : tc, 0, 0.0, 2.0, Math.PI / 2, 0, 0, 1, 14);
    for (const sd of [-1, 1]) { p.cyl(0.45, 0.45, 0.02, 0xf2f2f2, sd * (wings[wings.length - 1][1] / 2 - 1.1), hi + 0.07, -0.9, 0, 0, 0, 1, 16); p.cyl(0.3, 0.3, 0.025, tc, sd * (wings[wings.length - 1][1] / 2 - 1.1), hi + 0.075, -0.9, 0, 0, 0, 1, 16); }
    return p;
  });
  const m = new THREE.Mesh(geo, VEH_MAT); m.castShadow = true; g.add(m);
  const prop = new THREE.Group(); prop.position.set(0, 0, -2.62); g.add(prop);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.5, 0.07), new THREE.MeshLambertMaterial({ color: wood })); prop.add(blade);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshLambertMaterial({ color: metal })); prop.add(hub);
  const canopy = new THREE.Object3D(); g.add(canopy);
  const bomb = new THREE.Object3D(); g.add(bomb);
  const gunYaw = new THREE.Group(); g.add(gunYaw); const gunPitch = new THREE.Group(); gunYaw.add(gunPitch);
  scene.add(g);
  return { g, prop, bomb, canopy, gunYaw, gunPitch };
}
function P_TEAM_RING(team) { return (VPAINT[team] || VPAINT.blue).team; }
// speed (times the normal plane), toughness, bombs and how fast they reload
const PLANE_KINDS = {
  prop: { name: 'Fighter plane', spd: 1, hp: 320, bombs: 1, regen: 25, model: team => makePlaneModel(team) },
  f18: { name: 'F-18 Hornet', spd: 1.75, hp: 420, bombs: 2, regen: 15, model: team => jetModel(team, 'f18') },
  f22: { name: 'F-22 Raptor', spd: 2.0, hp: 480, bombs: 2, regen: 12, model: team => jetModel(team, 'f22') },
  triplane: { name: 'Red triplane', spd: 0.72, hp: 200, bombs: 0, regen: 999, model: team => ww1Model(team, 'triplane') },
  biplane: { name: 'Biplane', spd: 0.78, hp: 220, bombs: 0, regen: 999, model: team => ww1Model(team, 'biplane') },
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
    if (c === player) { if (typeof unlock === 'function') unlock('rocket'); player.pos.copy(v.pos).add(new THREE.Vector3(1.5, 0, 0)); player.velY = 0; openChute(); showMessage(`${Math.round(v.pos.y - ground)} meters up! Steer your parachute down`, 3); }
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


// ---------- the two military helicopters, built to look like the real ones ----------
function heliCustomModel(type, team) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const out = { g, body, wheels: [] };
  const mesh = (geo, parent = body) => { const m = new THREE.Mesh(geo, VEH_MAT); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const AP = type === 'apache', glassC = 0x1c2630, frameC = 0x1a1c18, HIND = typeof AFGHAN !== 'undefined' && AFGHAN && team === 'red';   // Desert Combat: the Iraqi side flies a Hind and an Mi-8
  mesh(vcached(type + team, () => {
    const p = new Part();
    if (HIND && AP) {
      // Mi-24 Hind: a big armoured body with two bubble canopies stepped one behind the other, stub wings
      // loaded with rocket pods, and a troop cabin behind; desert camouflage
      const c = 0xae9868, d = 0x7a6a46, cm = 0x6e5a3a;
      p.box(1.7, 1.6, 4.4, c, 0, 1.35, 0.2); p.box(1.5, 1.3, 1.6, c, 0, 1.2, -2.5, 0.1, 0, 0);               // cabin, forward body
      p.box(0.9, 0.7, 1.0, c, 0, 0.9, -3.55, 0.3, 0, 0);                                                     // the nose
      p.add(new THREE.SphereGeometry(0.62, 12, 9, 0, Math.PI * 2, 0, Math.PI / 2), glassC, 0, 1.2, -3.55, 0, 0, 0, 1, 0.9, 1.2);   // gunner's bubble
      p.add(new THREE.SphereGeometry(0.68, 12, 9, 0, Math.PI * 2, 0, Math.PI / 2), glassC, 0, 1.85, -2.35, 0, 0, 0, 1, 0.9, 1.25);   // pilot's bubble, higher
      for (const [x, z, w] of [[0.4, -0.5, 1.6], [-0.5, 1.2, 1.4], [0.3, 1.8, 0.9]]) p.box(0.02, 0.9, w, cm, 0.86, 1.4, z);   // camouflage patches
      for (const [x, z, w] of [[0.4, -0.5, 1.6], [-0.5, 1.2, 1.4], [0.3, 1.8, 0.9]]) p.box(0.02, 0.9, w, cm, -0.86, 1.4, z + 0.4);
      for (const sd of [-1, 1]) {
        p.box(0.6, 0.6, 2.4, d, sd * 0.55, 2.4, 0.2); p.cyl(0.26, 0.26, 0.3, 0x1a1a1a, sd * 0.55, 2.4, 1.5, Math.PI / 2, 0, 0, 1, 8);   // engines on the roof
        p.box(1.9, 0.14, 1.0, c, sd * 1.65, 1.5, 0.2, 0, 0, sd * -0.18);                                    // stub wing, drooping
        for (const k of [1.1, 1.9]) { p.cyl(0.24, 0.24, 1.3, d, sd * (0.9 + k * 0.55), 1.15 - k * 0.1, 0.2, Math.PI / 2, 0, 0, 1, 8); p.cyl(0.22, 0.22, 0.04, 0x111111, sd * (0.9 + k * 0.55), 1.15 - k * 0.1, -0.46, Math.PI / 2, 0, 0, 1, 8); }   // rocket pods
        p.box(0.1, 0.12, 1.2, 0x5a5e52, sd * 2.6, 1.15, 0.2);                                               // missile rail on the wingtip
        p.box(0.4, 0.5, 0.7, 0x2a2a2a, sd * 0.86, 1.3, 0.6);                                                // cabin window
        p.box(0.08, 0.7, 0.08, frameC, sd * 0.8, 0.45, 0.8); p.cyl(0.3, 0.3, 0.2, 0x151515, sd * 0.85, 0.3, 0.8, 0, 0, Math.PI / 2, 1, 10);   // main wheels
      }
      p.box(0.25, 0.25, 0.5, d, 0, 0.55, -3.7); p.cyl(0.05, 0.05, 1.0, 0x111111, 0, 0.5, -4.2, Math.PI / 2, 0, 0, 1, 6);   // chin gun
      p.box(0.55, 0.55, 5.6, c, 0, 1.6, 4.6, -0.04, 0, 0); p.box(0.16, 1.6, 1.0, c, 0, 2.4, 7.2, -0.35, 0, 0); p.box(2.2, 0.08, 0.6, c, 0, 1.55, 6.6);   // tail boom, fin, stabiliser
      p.cyl(0.18, 0.18, 0.12, 0x151515, 0, 0.35, 6.4, 0, 0, Math.PI / 2, 1, 8);
      p.cyl(0.2, 0.24, 0.7, d, 0, 2.75, -0.1, 0, 0, 0, 1, 8);                                                 // rotor mast
      p.box(0.04, 0.3, 0.3, VPAINT[team] ? VPAINT[team].team : 0xd93a3a, 0.87, 1.7, -1.0);                   // team mark
    } else if (HIND) {
      // Mi-8 Hip: a big rounded transport with a glazed nose, a row of round windows and clamshell doors at the back
      const c = 0x9a9068, d = 0x6c6646;
      p.box(2.3, 2.0, 6.4, c, 0, 1.6, 0.2); p.box(2.1, 1.7, 1.4, c, 0, 1.5, -3.5, 0.15, 0, 0);
      p.add(new THREE.SphereGeometry(1.0, 12, 9, 0, Math.PI * 2, 0, Math.PI / 2), glassC, 0, 1.6, -4.15, -Math.PI / 2 + 0.2, 0, 0, 1, 0.6, 1);   // glazed nose
      for (const sd of [-1, 1]) { for (let i = 0; i < 5; i++) p.cyl(0.22, 0.22, 0.04, glassC, sd * 1.16, 2.05, -1.8 + i * 0.95, 0, 0, Math.PI / 2, 1, 10);
        p.box(0.5, 0.18, 1.6, 0x4a4632, sd * 1.25, 1.0, 1.0);                                              // fuel tanks on the sides
        p.box(0.08, 0.7, 0.08, frameC, sd * 1.0, 0.45, 0.8); p.cyl(0.32, 0.32, 0.24, 0x151515, sd * 1.05, 0.3, 0.8, 0, 0, Math.PI / 2, 1, 10);
        p.box(0.7, 0.6, 2.6, d, sd * 0.5, 2.9, -0.6); }
      p.cyl(0.32, 0.32, 0.6, 0x151515, 0, 0.3, -3.2, 0, 0, Math.PI / 2, 1, 10);                              // nose wheel
      p.box(0.8, 0.8, 6.4, c, 0, 2.1, 5.6, -0.05, 0, 0); p.box(0.2, 2.0, 1.2, c, 0, 2.9, 8.5, -0.3, 0, 0);   // tail boom, fin
      p.cyl(0.2, 0.24, 0.6, d, 0, 3.0, 0.0, 0, 0, 0, 1, 8);
      p.box(0.04, 0.6, 0.6, VPAINT[team] ? VPAINT[team].team : 0xd93a3a, 1.17, 2.0, -1.6);
    } else if (AP) {
      // AH-64 Apache: a narrow, angular body, two seats one behind the other under flat glass panels
      const c = 0x3b4230, d = 0x2b3024, t = 0x4a523d;
      p.box(1.15, 1.25, 4.6, c, 0, 1.15, -0.9); p.box(1.0, 1.0, 1.4, c, 0, 1.0, -3.9, 0.12, 0, 0);          // fuselage and nose
      p.box(0.9, 0.55, 0.9, d, 0, 0.55, -4.25); p.box(0.55, 0.5, 0.55, 0x222222, 0, 0.75, -4.75);          // sensor turret on the nose
      p.box(1.05, 0.62, 1.15, glassC, 0, 1.98, -2.15, 0.15, 0, 0); p.box(1.05, 0.75, 1.3, glassC, 0, 2.3, -0.85, 0.12, 0, 0);   // stepped canopies
      for (const z of [-2.75, -1.55, -0.25]) p.box(1.1, 0.08, 0.08, frameC, 0, z < -1 ? 2.3 : 2.66, z);
      for (const sd of [-1, 1]) {
        p.box(0.55, 0.65, 2.6, t, sd * 0.85, 1.75, 0.35); p.cyl(0.24, 0.24, 0.3, 0x1a1a1a, sd * 0.85, 1.75, 1.75, Math.PI / 2, 0, 0, 1, 8);   // engines either side, exhausts
        p.box(1.7, 0.12, 0.8, c, sd * 1.4, 1.3, -0.3);                                                      // stub wing
        p.cyl(0.22, 0.22, 1.4, d, sd * 1.2, 0.98, -0.35, Math.PI / 2, 0, 0, 1, 8); p.cyl(0.2, 0.2, 0.04, 0x111111, sd * 1.2, 0.98, -1.06, Math.PI / 2, 0, 0, 1, 8);   // rocket pods
        for (const dy of [0.95, 1.15]) p.box(0.12, 0.12, 1.1, 0x5a5e52, sd * 2.1, dy, -0.35);               // missiles on the tips
        p.box(0.08, 0.7, 0.08, frameC, sd * 0.9, 0.45, -1.6); p.cyl(0.3, 0.3, 0.2, 0x151515, sd * 0.95, 0.3, -1.6, 0, 0, Math.PI / 2, 1, 10);   // main wheels
      }
      p.box(0.3, 0.3, 0.6, d, 0, 0.35, -3.0); p.cyl(0.05, 0.05, 1.4, 0x111111, 0, 0.32, -3.9, Math.PI / 2, 0, 0, 1, 6);   // chin gun
      p.box(0.5, 0.5, 6.0, c, 0, 1.45, 4.3); p.box(0.16, 1.6, 1.0, c, 0, 2.35, 7.2, -0.35, 0, 0);          // tail boom, swept fin
      p.box(2.0, 0.08, 0.6, c, 0, 1.25, 7.0);                                                                // tail stabiliser
      p.cyl(0.18, 0.18, 0.12, 0x151515, 0, 0.25, 6.6, 0, 0, Math.PI / 2, 1, 8);                               // tail wheel
      p.cyl(0.18, 0.22, 0.7, d, 0, 2.6, -0.1, 0, 0, 0, 1, 8); p.box(0.5, 0.3, 0.5, d, 0, 3.0, -0.1);          // rotor mast and its sight
      p.box(0.04, 0.3, 0.3, VPAINT[team] ? VPAINT[team].team : 0x2f6fe0, 0.6, 1.3, 0.3);                       // team mark
    } else {
      // UH-60 Black Hawk: a long low cabin with big sliding doors, engines on the roof, a tail that rises to a
      // tall fin with the tail rotor on the right and a big flat stabiliser
      const c = 0x2c3129, d = 0x20241e, t = 0x3a4035;
      p.box(2.4, 1.85, 4.8, c, 0, 1.5, -0.2); p.box(2.2, 0.35, 4.6, d, 0, 0.5, -0.2);                       // cabin, belly
      p.box(2.2, 1.5, 1.7, c, 0, 1.4, -3.3, 0.1, 0, 0); p.box(1.9, 0.9, 0.9, c, 0, 1.0, -4.3, 0.25, 0, 0);    // cockpit and sloping nose
      p.box(2.1, 0.9, 1.4, glassC, 0, 2.0, -3.4, -0.35, 0, 0); for (const sd of [-1, 1]) p.box(0.06, 0.8, 1.3, glassC, sd * 1.12, 1.7, -3.3);   // windscreen and side windows
      for (const sd of [-1, 1]) {
        p.box(0.06, 1.25, 1.7, 0x15181a, sd * 1.22, 1.55, 0.05);                                            // open door gaps
        p.box(0.08, 0.1, 4.0, frameC, sd * 1.22, 2.25, 0.0);                                                // door rails
        p.box(0.9, 0.6, 2.6, t, sd * 0.6, 2.65, 0.3); p.cyl(0.26, 0.26, 0.3, 0x111111, sd * 0.6, 2.65, 1.65, Math.PI / 2, 0, 0, 1, 8);   // twin engines and exhausts
        p.box(0.1, 0.9, 0.1, frameC, sd * 1.3, 0.55, -2.4); p.cyl(0.36, 0.36, 0.25, 0x151515, sd * 1.35, 0.36, -2.4, 0, 0, Math.PI / 2, 1, 10);   // main wheels on struts
        p.box(1.3, 0.1, 0.6, c, sd * 1.75, 1.95, -0.6); p.cyl(0.2, 0.2, 1.1, d, sd * 2.1, 1.65, -0.6, Math.PI / 2, 0, 0, 1, 8);   // small stub wings with pods
      }
      p.box(1.4, 0.4, 1.0, d, 0, 2.55, -1.2);                                                                  // roof fairing
      p.box(0.75, 0.75, 6.2, c, 0, 1.9, 4.9, -0.07, 0, 0);                                                   // tail boom, rising slightly
      p.box(0.2, 2.1, 1.3, c, 0, 2.9, 8.4, -0.3, 0, 0);                                                       // tall swept tail fin
      p.box(2.8, 0.09, 0.85, c, 0, 2.05, 8.3);                                                                 // stabiliser
      p.box(0.1, 0.5, 0.1, frameC, 0, 0.95, 7.0); p.cyl(0.2, 0.2, 0.15, 0x151515, 0, 0.7, 7.0, 0, 0, Math.PI / 2, 1, 8);   // tail wheel
      p.box(0.04, 0.6, 0.6, VPAINT[team] ? VPAINT[team].team : 0x2f6fe0, 1.22, 2.0, -1.6);                     // team mark
    }
    return p;
  }));
  // rotors (the main rotor and the tail rotor are what spin)
  const rotor = new THREE.Group(); rotor.position.set(0, AP ? 3.2 : 3.25, AP ? -0.1 : 0.0); body.add(rotor);
  mesh(vcached(type + 'Rotor', () => { const p = new Part(); p.cyl(0.25, 0.25, 0.2, 0x1e1e1e, 0, 0, 0, 0, 0, 0, 1, 10); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2, R = AP ? 2.6 : 2.95; p.box(0.32, 0.05, R * 2, 0x1c1d1f, Math.sin(a) * R, 0.02, Math.cos(a) * R, 0, a, 0); } return p; }), rotor);
  const tail = new THREE.Group(); tail.position.set(AP ? -0.22 : 0.22, AP ? 2.55 : 3.1, AP ? 7.45 : 8.75); body.add(tail);
  mesh(vcached(type + 'Tail', () => { const p = new Part(); p.cyl(0.08, 0.08, 0.14, 0x1e1e1e, 0, 0, 0, 0, 0, Math.PI / 2); for (let i = 0; i < 2; i++) p.box(0.04, AP ? 1.3 : 1.6, 0.16, 0x1c1d1f, 0, 0, 0, i * Math.PI / 2 + (AP ? 0.6 : 0), 0, 0); return p; }), tail);
  const podL = new THREE.Object3D(), podR = new THREE.Object3D();
  podL.position.set(AP ? -1.2 : -2.1, AP ? 0.98 : 1.65, -1.2); podR.position.set(AP ? 1.2 : 2.1, AP ? 0.98 : 1.65, -1.2); body.add(podL, podR);
  out.rotor = rotor; out.tail = tail; out.pods = [podL, podR];
  if (!AP) {   // door guns in both doors, for the gunner seats
    const P2 = VPAINT[team] || VPAINT.blue;
    const gun = (x) => { const yw = new THREE.Group(); yw.position.set(x, 1.75, 0.0); body.add(yw); const pt = new THREE.Group(); yw.add(pt); mesh(hmgGeo(false, P2), pt); const mz = new THREE.Object3D(); mz.position.z = -1.95; pt.add(mz); return [yw, pt, mz]; };
    const [a1, b1, c1] = gun(-1.3), [a2, b2, c2] = gun(1.3);
    Object.assign(out, { mgYaw: a1, mgPitch: b1, mgMuzzle: c1, mgBase: 1.75, mg2Yaw: a2, mg2Pitch: b2, mg2Muzzle: c2 });
  }
  g.traverse(o => { if (o.isMesh) o.userData.isVehiclePart = true; });
  scene.add(g);
  return out;
}
