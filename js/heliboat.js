// ===================== heliboat.js : helicopters and gun boats =====================
// Both reuse the ground vehicle system (seats, guns, damage, online sync); only how they move is different.
Object.assign(VTYPES, {
  heli: {
    name: 'Helicopter', hp: 800, maxSpeed: 46, accel: 10, turn: 1.3, radius: 3.0, len: 9, wid: 2.6, bulletMult: 0.35, expMult: 0.8, camDist: 15, heli: true,
    seats: [{ p: [-0.42, 1.12, -1.75], role: 'drive', pose: 'sit', exposed: false },
      { p: [-0.75, 1.15, 0.05], role: 'gun', pose: 'sit', exposed: true },
      { p: [0.42, 1.12, -1.75], role: 'ride', pose: 'sit', exposed: false },
      { p: [0.75, 1.15, 0.05], role: 'gun', gun: 1, pose: 'sit', exposed: true },   // the right door gun
      { p: [0.8, 1.1, 0.75], role: 'ride', pose: 'sit', exposed: true, side: 1 },
      { p: [-0.8, 1.1, 0.95], role: 'ride', pose: 'sit', exposed: true, side: -1 }],
  },
  boat: {
    name: 'Gun boat', hp: 560, maxSpeed: 24, accel: 9, turn: 1.25, radius: 2.4, len: 6.2, wid: 2.4, bulletMult: 0.5, expMult: 1, camDist: 10, boat: true,
    seats: [{ p: [0, 1.0, 0.55], role: 'drive', pose: 'sit', exposed: true },
      { p: [0, 0.82, -1.15], role: 'gun', pose: 'stand', exposed: true },
      { p: [-0.62, 0.95, 1.75], role: 'ride', pose: 'sit', exposed: true },
      { p: [0.62, 0.95, 1.75], role: 'ride', pose: 'sit', exposed: true }],
  },
});

// ---------- models ----------
const makeVehicleModelLand = makeVehicleModel;
makeVehicleModel = function (type, team) {
  if (type !== 'heli' && type !== 'boat') return makeVehicleModelLand(type, team);
  const P = VPAINT[team], g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const out = { g, body, wheels: [] };
  const mesh = (geo, mat, parent = body, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const glass = new Part(), glow = new Part();
  let main;
  if (type === 'heli') {
    main = vcached('heli' + team, () => {
      const p = new Part();
      // cabin and nose: rounded shapes instead of boxes
      p.add(new THREE.CylinderGeometry(1.15, 1.15, 4.2, 16), P.a, 0, 1.75, 0, RX, 0, 0, 1, 1, 0.92);
      p.add(new THREE.SphereGeometry(1.15, 16, 12), P.a, 0, 1.75, -2.1, 0, 0, 0, 1, 0.92, 1.25);
      p.add(new THREE.SphereGeometry(1.15, 16, 12), P.a, 0, 1.78, 2.05, 0, 0, 0, 1, 0.9, 0.8);
      p.box(2.1, 0.3, 4.6, P.b, 0, 0.82, -0.1);                                                       // belly
      p.box(0.06, 0.12, 4.0, P.team, 1.08, 1.45, 0); p.box(0.06, 0.12, 4.0, P.team, -1.08, 1.45, 0);   // team stripes
      for (const s of [-1, 1]) {
        p.box(0.04, 1.05, 1.5, VC.black, 1.1 * s, 1.55, 0.35);                                        // open side doors
        p.box(0.05, 1.1, 0.06, VC.dark, 1.13 * s, 1.55, -0.42); p.box(0.05, 1.1, 0.06, VC.dark, 1.13 * s, 1.55, 1.12);
        p.box(0.05, 0.06, 1.6, VC.steel, 1.15 * s, 2.15, 1.1);                                        // door rail
        // stub wings with rocket pods
        p.box(1.0, 0.1, 0.7, P.b, 1.55 * s, 1.35, 0.25, 0, 0, -0.08 * s);
        p.cyl(0.2, 0.2, 1.2, VC.olive, 1.95 * s, 1.1, 0.2, RX, 0, 0, 1, 10); p.cyl(0.21, 0.21, 0.08, VC.dark, 1.95 * s, 1.1, -0.42, RX, 0, 0, 1, 10);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; p.cyl(0.045, 0.045, 0.04, VC.black, 1.95 * s + Math.cos(a) * 0.12, 1.1 + Math.sin(a) * 0.12, -0.47, RX); }
        // skids
        p.cyl(0.07, 0.07, 4.4, VC.dark, 1.2 * s, 0.1, -0.1, RX); p.cyl(0.07, 0.07, 0.5, VC.dark, 1.2 * s, 0.22, -2.4, RX + 0.6);
        for (const z of [-1.2, 1.1]) p.cyl(0.06, 0.06, 0.95, VC.dark, 1.0 * s, 0.5, z, 0, 0, 0.4 * s);
        // star and number
        p.add(new THREE.CircleGeometry(0.34, 16), VC.white, 1.08 * s, 1.85, 1.6, 0, RX * s, 0);
        p.add(starGeo(0.27).rotateX(Math.PI / 2), P.team, 1.1 * s, 1.85, 1.6, 0, RX * s, 0);
      }
      // engine housing, exhausts and rotor mast
      p.box(1.3, 0.55, 2.6, P.b, 0, 2.75, 0.4); p.add(new THREE.SphereGeometry(0.66, 12, 8), P.b, 0, 2.75, -0.9, 0, 0, 0, 1, 0.42, 0.9);
      for (const s of [-1, 1]) { p.cyl(0.16, 0.18, 0.6, VC.dark2, 0.5 * s, 2.85, 1.9, RX - 0.2); p.cyl(0.14, 0.14, 0.05, VC.black, 0.5 * s, 2.91, 2.2, RX - 0.2); }
      for (let i = 0; i < 5; i++) p.box(1.32, 0.03, 0.08, VC.dark, 0, 2.8, 0.9 + i * 0.18);
      p.cyl(0.12, 0.16, 0.5, VC.dark, 0, 3.15, 0.1);
      // tail boom, fin, stabilisers
      p.cyl(0.22, 0.48, 5.4, P.a, 0, 2.05, 4.95, RX + 0.04, 0, 0, 1, 12);
      p.box(0.12, 1.5, 1.0, P.a, 0, 2.75, 7.55, -0.35); p.box(0.13, 0.25, 0.8, P.team, 0, 3.35, 7.75, -0.35);
      p.box(2.0, 0.07, 0.55, P.a, 0, 2.0, 6.7); for (const s of [-1, 1]) p.box(0.06, 0.4, 0.5, P.b, 1.0 * s, 2.05, 6.7);
      p.cyl(0.03, 0.03, 0.9, VC.dark, 0, 0.85, -2.8, RX - 0.4);                                         // nose probe
      p.cyl(0.18, 0.18, 0.2, VC.dark, 0, 1.0, -2.9, 0, 0, 0, 1, 10);                                    // chin sensor
      p.cyl(0.015, 0.015, 1.0, VC.dark, 0.4, 2.7, 1.8, 0.4);                                            // antenna
      return p;
    });
    glass.add(new THREE.SphereGeometry(1.18, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, 0, 1.78, -2.25, -RX * 0.9, 0, 0, 0.97, 0.93, 1.05);
    for (const s of [-1, 1]) glass.box(0.03, 0.55, 0.9, 0, 1.13 * s, 2.0, -1.3);
    glow.ball(0.07, 0x44ff66, 1.0, 1.35, 0.6); glow.ball(0.07, 0xff3b2a, -1.0, 1.35, 0.6); glow.ball(0.08, 0xff3b2a, 0, 3.55, 7.85);
    glow.cyl(0.13, 0.13, 0.04, VC.lamp, 0, 0.72, -2.3, 0.4, 0, 0, 1, 12);
    // spinning rotors
    const rotor = new THREE.Group(); rotor.position.set(0, 3.42, 0.1); body.add(rotor);
    mesh(vcached('heliRotor', () => {
      const p = new Part();
      p.cyl(0.3, 0.3, 0.2, VC.dark, 0, 0, 0, 0, 0, 0, 1, 12); p.cyl(0.08, 0.08, 0.3, VC.steel, 0, 0.2, 0);
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; p.box(0.36, 0.05, 6.3, 0x24262a, Math.sin(a) * 3.25, 0.02, Math.cos(a) * 3.25, 0, a, 0); p.box(0.37, 0.055, 0.4, VC.amber, Math.sin(a) * 6.2, 0.02, Math.cos(a) * 6.2, 0, a, 0); }
      return p;
    }), VEH_MAT, rotor);
    const tail = new THREE.Group(); tail.position.set(0.18, 2.95, 7.7); body.add(tail);
    mesh(vcached('heliTail', () => {
      const p = new Part(); p.cyl(0.1, 0.1, 0.14, VC.dark, 0, 0, 0, 0, 0, RX);
      for (let i = 0; i < 2; i++) p.box(0.04, 1.4, 0.18, 0x24262a, 0.04, 0, 0, i * RX, 0, 0);
      return p;
    }), VEH_MAT, tail);
    // door gun on the left side
    const mgYaw = new THREE.Group(); mgYaw.position.set(-1.25, 1.75, 0.0); body.add(mgYaw);
    const mgPitch = new THREE.Group(); mgYaw.add(mgPitch); mesh(hmgGeo(false, P), VEH_MAT, mgPitch);
    const mz = new THREE.Object3D(); mz.position.z = -1.95; mgPitch.add(mz);
    const podL = new THREE.Object3D(); podL.position.set(-1.95, 1.1, -0.7); body.add(podL);
    const podR = new THREE.Object3D(); podR.position.set(1.95, 1.1, -0.7); body.add(podR);
    // and a second door gun on the right
    const mg2Yaw = new THREE.Group(); mg2Yaw.position.set(1.25, 1.75, 0.0); body.add(mg2Yaw);
    const mg2Pitch = new THREE.Group(); mg2Yaw.add(mg2Pitch); mesh(hmgGeo(false, P), VEH_MAT, mg2Pitch);
    const mz2 = new THREE.Object3D(); mz2.position.z = -1.95; mg2Pitch.add(mz2);
    Object.assign(out, { mgYaw, mgPitch, mgMuzzle: mz, mgBase: 1.75, mg2Yaw, mg2Pitch, mg2Muzzle: mz2, rotor, tail, pods: [podL, podR] });
  } else {
    main = vcached('boat' + team, () => {
      const p = new Part();
      const hullC = 0x2c3036;
      // hull: straight sides with a pointed bow, dark below the waterline
      p.box(2.3, 0.6, 4.4, hullC, 0, 0.0, 0.75); p.box(2.4, 0.5, 4.4, P.a, 0, 0.5, 0.75);
      for (const s of [-1, 1]) {
        p.box(0.12, 0.6, 2.0, hullC, 0.6 * s, 0.0, -2.1, 0, 0.55 * s, 0);
        p.box(0.14, 0.5, 2.05, P.a, 0.62 * s, 0.5, -2.1, 0, 0.55 * s, 0);
        p.box(0.06, 0.12, 4.3, P.team, 1.21 * s, 0.55, 0.75);                                          // team stripe
        for (const z of [-0.4, 0.8, 2.0]) p.cyl(0.16, 0.16, 0.22, VC.black, 1.27 * s, 0.35, z, 0, 0, RX);   // tyre fenders
        for (const z of [-0.9, 0.3, 1.5, 2.7]) p.cyl(0.025, 0.025, 0.5, VC.steel, 1.12 * s, 1.0, z);       // rail posts
        p.cyl(0.025, 0.025, 3.7, VC.steel, 1.12 * s, 1.25, 0.9, RX);
        p.add(new THREE.CircleGeometry(0.3, 16), VC.white, 1.215 * s, 0.6, -0.9, 0, RX * s, 0);
        p.add(starGeo(0.24).rotateX(Math.PI / 2), P.team, 1.225 * s, 0.6, -0.9, 0, RX * s, 0);
      }
      p.box(1.6, 0.6, 1.6, hullC, 0, 0.0, -2.4); p.box(1.0, 0.5, 0.9, hullC, 0, 0.0, -3.0);
      p.box(2.2, 0.06, 4.2, 0x9a9890, 0, 0.77, 0.8);                                                    // deck
      p.box(1.5, 0.06, 1.4, 0x9a9890, 0, 0.77, -1.7); p.box(0.7, 0.06, 0.8, 0x9a9890, 0, 0.77, -2.6);
      // console with windscreen
      p.box(1.3, 0.85, 0.9, P.b, 0, 1.2, 0.1); p.box(1.2, 0.08, 0.5, VC.dark, 0, 1.64, 0.25);
      p.box(0.3, 0.12, 0.05, VC.black, 0, 1.5, 0.56); p.add(new THREE.TorusGeometry(0.14, 0.022, 6, 14), VC.black, 0, 1.45, 0.6, -0.5);
      p.box(0.5, 0.15, 0.5, VC.seat, 0, 0.92, 0.85); p.box(0.5, 0.5, 0.1, VC.seat, 0, 1.2, 1.1);         // helm seat
      p.cyl(0.04, 0.04, 1.4, VC.dark, 0, 2.3, 0.3); p.box(0.7, 0.06, 0.12, VC.dark, 0, 2.95, 0.3);         // radar mast
      p.cyl(0.014, 0.014, 1.6, VC.dark, 0.5, 2.0, 0.5); p.box(0.02, 0.26, 0.42, P.team, 0.5, 2.7, 0.7);
      for (const s of [-1, 1]) { p.box(0.5, 0.14, 0.5, VC.seat, 0.62 * s, 0.88, 1.75); p.box(0.5, 0.4, 0.1, VC.seat, 0.62 * s, 1.1, 2.0); }
      p.box(0.4, 0.3, 0.3, VC.olive, -0.7, 0.95, 2.6); p.box(0.4, 0.3, 0.3, VC.olive, 0.7, 0.95, 2.6);
      // twin outboard motors
      for (const s of [-0.5, 0.5]) { p.box(0.42, 0.6, 0.5, VC.dark, s, 0.75, 3.2); p.box(0.44, 0.08, 0.52, P.team, s, 1.0, 3.2); p.box(0.14, 0.9, 0.2, VC.dark2, s, 0.05, 3.35); }
      // bow gun pedestal
      p.cyl(0.08, 0.12, 0.5, VC.dark, 0, 1.05, -1.65); p.cyl(0.26, 0.26, 0.05, VC.dark2, 0, 1.3, -1.65, 0, 0, 0, 1, 12);
      return p;
    });
    glass.box(1.25, 0.42, 0.04, 0, 0, 1.85, -0.25, 0.45, 0, 0);
    glow.ball(0.06, 0x44ff66, 1.2, 1.0, -1.5); glow.ball(0.06, 0xff3b2a, -1.2, 1.0, -1.5); glow.ball(0.06, VC.white, 0, 3.0, 0.3);
    const mgYaw = new THREE.Group(); mgYaw.position.set(0, 1.55, -1.65); body.add(mgYaw);
    const mgPitch = new THREE.Group(); mgYaw.add(mgPitch); mesh(hmgGeo(true, P), VEH_MAT, mgPitch);
    const mz = new THREE.Object3D(); mz.position.z = -1.95; mgPitch.add(mz);
    Object.assign(out, { mgYaw, mgPitch, mgMuzzle: mz, mgBase: 1.55 });
  }
  mesh(main, VEH_MAT);
  if (glass.pos.length) body.add(new THREE.Mesh(glass.build(), VM2.glass));
  if (glow.pos.length) body.add(new THREE.Mesh(glow.build(), VEH_GLOW));
  g.traverse(o => { if (o.isMesh) o.userData.isVehiclePart = true; });
  scene.add(g);
  return out;
};

// ---------- moving ----------
function moveVehicle(v, dt, inp) {
  if (v.T.rocket) return simMiniRocket(v, dt, inp);
  if (v.T.heli) return simHeli(v, dt, inp);
  if (v.T.boat) return simBoat(v, dt, inp);
  return simVehicle(v, dt, inp);
}
const _hv = new THREE.Vector3();
function heliBlocked(v, x, z) {
  const r = v.T.wid / 2 + 0.3;
  for (const o of nearbyColliders(x, z)) {
    if (o.kind === 'box') { if (o.maxY > v.pos.y + 0.3 && o.minY < v.pos.y + 3.2 && x > o.minX - r && x < o.maxX + r && z > o.minZ - r && z < o.maxZ + r) return true; }
    else if (o.top > v.pos.y + 0.4 && Math.hypot(x - o.x, z - o.z) < r + o.r * 0.7) return true;
  }
  return false;
}
function simHeli(v, dt, inp) {
  const T = v.T;
  if (!v.vel) { v.vel = new THREE.Vector3(); v.rotorSpin = 0; v.fireT = 0; }
  const piloted = !!driverOf(v);
  v.rotorSpin = piloted ? Math.min(1, v.rotorSpin + dt * 0.55) : Math.max(0, v.rotorSpin - dt * 0.2);
  if (T.agile) v.rotorSpin = piloted ? 1 : 0;   // the skateboard is ready at once
  const lift = v.rotorSpin, flying = lift > 0.85;
  const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
  const ground = groundAt(v.pos.x, v.pos.z, v.pos.y + 0.5);
  const onGround = v.pos.y <= ground + 0.05;
  // forward and back
  const thr = flying ? inp.thr : 0, want = thr * (thr > 0 ? T.maxSpeed : T.maxSpeed * 0.35);
  v.strafeIn = flying ? (inp.strafe || 0) : 0;
  const sw = flying ? (inp.strafe || 0) * T.maxSpeed * 0.45 : 0, rx = -fz, rz = fx;   // sideways slide (right is +)
  const vx = fx * want + rx * sw, vz = fz * want + rz * sw;
  const k = Math.min(1, dt * (T.agile ? 4 : thr || inp.strafe ? 0.9 : 0.55));
  v.vel.x += (vx - v.vel.x) * k;
  v.vel.z += (vz - v.vel.z) * k;
  // up and down: hover when flying, sink when the rotor slows
  const wantVy = flying ? (inp.up ? (T.agile ? 18 : 10) : 0) - (inp.down ? (T.agile ? 16 : 8) : 0) : -14 * (1 - lift);
  v.vel.y += (wantVy - v.vel.y) * Math.min(1, dt * (flying ? 2.2 : 1.2));
  if (flying || !onGround) v.yaw += (inp.steer || 0) * T.turn * dt;
  const px = v.pos.x, pz = v.pos.z;
  v.pos.addScaledVector(v.vel, dt);
  v.pos.y = Math.min(v.pos.y, 170);
  if (Math.abs(v.pos.x) > EDGE || Math.abs(v.pos.z) > EDGE || heliBlocked(v, v.pos.x, v.pos.z)) {
    const hs = Math.hypot(v.vel.x, v.vel.z);
    v.pos.x = px; v.pos.z = pz;
    if (hs > 12) { damageVehicle(v, hs * 6, null); burst(v.pos.clone().add(new THREE.Vector3(fx * 3, 2, fz * 3)), 8, 0x8a7a5a, 5, 0.5, 0.1); }
    v.vel.x *= -0.3; v.vel.z *= -0.3;
  }
  const g2 = groundAt(v.pos.x, v.pos.z, v.pos.y + 0.5);
  if (v.pos.y <= g2) {
    if (v.vel.y < -11 && !T.agile) damageVehicle(v, (-v.vel.y - 11) * 35, null);   // the skateboard lands softly
    v.pos.y = g2; v.vel.y = Math.max(0, v.vel.y);
    v.vel.x *= Math.exp(-dt * 5); v.vel.z *= Math.exp(-dt * 5);
  }
  v.airborne = v.pos.y > g2 + 0.3;
  const fwdSpeed = v.vel.x * fx + v.vel.z * fz, hs = Math.hypot(v.vel.x, v.vel.z);
  v.speed = fwdSpeed;
  v.pitch = lerp(v.pitch, v.airborne ? -clamp(fwdSpeed / T.maxSpeed, -0.4, 1) * 0.26 : 0, Math.min(1, dt * 3));
  v.roll = lerp(v.roll, v.airborne ? -(inp.steer || 0) * 0.2 * clamp(hs / 10, 0.3, 1) : 0, Math.min(1, dt * 3));
  // rotor wash kicks up dust near the ground
  if (lift > 0.5 && v.pos.y - heightAt(v.pos.x, v.pos.z) < 8 && Math.random() < dt * 14) {
    const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 3, gx = v.pos.x + Math.cos(a) * r, gz = v.pos.z + Math.sin(a) * r;
    smokePuff(new THREE.Vector3(gx, heightAt(gx, gz) + 0.3, gz), waterDepth(gx, gz) > 0 ? 0xe8f0f4 : 0xb8a580, 0.6, 0.9, 0.3);
  }
  // soldiers under a heli that lands on them
  if (v.vel.y < -3) for (const c of chars) {
    if (!c.alive || c.gv || c.inactive) continue;
    if (Math.hypot(c.pos.x - v.pos.x, c.pos.z - v.pos.z) < 2 && c.pos.y > v.pos.y - 2 && c.pos.y < v.pos.y + 0.5 && c.team !== v.team) damage(c, 200, driverOf(v) || null, new THREE.Vector3(0, -1, 0), 3);
  }
}
function heliRockets(v, shooter, dir) {
  v.fireT = v.T.rocketT || 0.55; v.podSide = 1 - (v.podSide || 0);
  const pod = v.model.pods[v.podSide];
  pod.getWorldPosition(_hv);
  spawnRocket(_hv.clone(), dir, shooter, { speed: 95, dmg: 160, radius: 5.5 });
  if (typeof fxMuzzle === 'function') fxMuzzle(_hv, dir, 2);
  netShot(_hv.clone(), _hv.clone().addScaledVector(dir, 3), 1);
}
function simBoat(v, dt, inp) {
  const T = v.T;
  const target = inp.thr > 0 ? T.maxSpeed * inp.thr : inp.thr < 0 ? -T.maxSpeed * 0.35 * -inp.thr : 0;
  if (inp.brake) v.speed *= Math.exp(-dt * 2.5);
  else if (inp.thr === 0) v.speed *= Math.exp(-dt * 0.6);
  else v.speed += clamp(target - v.speed, -T.accel * dt * 1.5, T.accel * dt);
  v.steer = lerp(v.steer, inp.steer, Math.min(1, dt * 4));
  v.yaw += v.steer * T.turn * dt * clamp(Math.abs(v.speed) / 5, 0.25, 1) * Math.sign(v.speed || 1);
  const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw), half = T.len / 2;
  const px = v.pos.x, pz = v.pos.z;
  v.pos.x += fx * v.speed * dt; v.pos.z += fz * v.speed * dt;
  // the boat stops at the shore
  const lead = Math.sign(v.speed || 1) * half * 0.85;
  if (waterDepth(v.pos.x + fx * lead, v.pos.z + fz * lead) < 0.7 || waterDepth(v.pos.x, v.pos.z) < 0.7) {
    v.pos.x = px; v.pos.z = pz;
    if (Math.abs(v.speed) > 10) damageVehicle(v, Math.abs(v.speed) * 3, null);
    v.speed *= -0.25;
  }
  for (const o of gvehicles) {
    if (o === v || !o.alive || !o.T.boat) continue;
    const dx = v.pos.x - o.pos.x, dz = v.pos.z - o.pos.z, d = Math.hypot(dx, dz), min = T.radius + o.T.radius - 0.4;
    if (d < min && d > 0.01) { v.pos.x += dx / d * (min - d) * 0.6; v.pos.z += dz / d * (min - d) * 0.6; v.speed *= 0.8; }
  }
  const t = performance.now() / 1000 + v.idx;
  v.pos.y = WATER_Y - 0.05 + Math.sin(t * 1.7) * 0.05;
  v.pitch = lerp(v.pitch, clamp(v.speed / T.maxSpeed, -0.3, 1) * 0.11 + Math.sin(t * 1.3) * 0.02, Math.min(1, dt * 3));
  v.roll = lerp(v.roll, -v.steer * 0.12 * clamp(Math.abs(v.speed) / 10, 0, 1) + Math.sin(t * 1.1) * 0.025, Math.min(1, dt * 3));
  if (Math.abs(v.speed) > 5 && typeof emitSpray === 'function') {   // spray off the bow and a rooster tail behind
    const k = Math.abs(v.speed) / T.maxSpeed, rx = Math.cos(v.yaw), rz = -Math.sin(v.yaw);
    for (let i = 0; i < k * 50 * dt; i++) for (const sd of [-1, 1]) emitSpray(v.pos.x + fx * half * 0.6 + rx * sd * 1.2, WATER_Y + 0.3, v.pos.z + fz * half * 0.6 + rz * sd * 1.2, rx * sd * rand(2, 4) + fx * v.speed * 0.4, rand(2, 3 + k * 3), rz * sd * rand(2, 4) + fz * v.speed * 0.4, rand(0.6, 1.1));
    for (let i = 0; i < k * 30 * dt; i++) emitSpray(v.pos.x - fx * (half + 0.4), WATER_Y + 0.3, v.pos.z - fz * (half + 0.4), -fx * rand(2, 5) + rand(-1, 1), rand(3, 5 + k * 4), -fz * rand(2, 5) + rand(-1, 1), rand(0.7, 1.2));
  }
  if (Math.abs(v.speed) > 4 && Math.random() < dt * 20) {
    for (const s of [-1, 1]) smokePuff(new THREE.Vector3(v.pos.x - fx * half * 0.4 + Math.cos(v.yaw) * s * 1.2, WATER_Y + 0.1, v.pos.z - fz * half * 0.4 - Math.sin(v.yaw) * s * 1.2), 0xf4f8fa, 0.4, 0.7, 0.4);
    smokePuff(new THREE.Vector3(v.pos.x - fx * (half + 0.5), WATER_Y + 0.15, v.pos.z - fz * (half + 0.5)), 0xffffff, 0.5, 1.0, 0.2);
  }
}
// rotors keep turning for helis flown by other players too
function spinRotors(dt) {
  for (const v of gvehicles) {
    if (!v.T.heli || !v.alive) continue;
    if (v.remote || (net.active && !net.isHost && !driverOf(v))) v.rotorSpin = (v.pos.y - heightAt(v.pos.x, v.pos.z) > 0.5 || occupants(v).length) ? 1 : Math.max(0, (v.rotorSpin || 0) - dt * 0.2);
    const s = v.rotorSpin || 0;
    v.model.rotor.rotation.y += s * dt * 26; v.model.tail.rotation.x += s * dt * 40;
  }
}

// ---------- where they start ----------
function helipadMesh(x, y, z) {
  const p = new Part();
  p.cyl(5.2, 5.4, 0.2, 0x8d8f91, 0, 0, 0, 0, 0, 0, 1, 24);
  p.cyl(4.6, 4.6, 0.21, 0xf2c230, 0, 0.005, 0, 0, 0, 0, 1, 24); p.cyl(4.3, 4.3, 0.22, 0x8d8f91, 0, 0.01, 0, 0, 0, 0, 1, 24);
  p.box(0.5, 0.23, 3.2, VC.white, -1.1, 0.02, 0); p.box(0.5, 0.23, 3.2, VC.white, 1.1, 0.02, 0); p.box(1.8, 0.23, 0.5, VC.white, 0, 0.02, 0);
  const m = new THREE.Mesh(p.build(), VEH_MAT); m.position.set(x, y + 0.02, z); m.receiveShadow = true; scene.add(m);
}
function buildHelisAndBoats() {
  for (const t of TEAMS) {   // every team gets helicopters, the 4-team corner bases too
    const B = BASES[t], s = teamSide(t), yaw = s > 0 ? 0 : Math.PI;
    for (const dx of (GERMANY || NORMANDY || WAKE) ? [] : [-62, 62]) {   /* no helicopters in WWII */
      let spot = null;
      for (let d = 0; d <= 60 && !spot; d += 4) for (let k = 0; k < (d ? 12 : 1) && !spot; k++) {
        const a = k / 12 * Math.PI * 2 + d * 0.3, x = B.x + dx + Math.cos(a) * d, z = B.z - s * 30 + Math.sin(a) * d;
        if (vehicleSpotFree(x, z, 6.5)) spot = [x, z];
      }
      if (!spot) continue;
      const v = makeGV('heli', t, spot[0], spot[1], yaw);
      helipadMesh(spot[0], v.pos.y, spot[1]);
    }
    if (AFGHAN && (t === 'blue' || t === 'red')) for (const [type, dx] of [['apache', -105], ['blackhawk', 105]]) {   // Desert Combat: an attack helicopter and a transport (Apache and Black Hawk, or Hind and Mi-8)
      let spot = null;
      for (let d = 0; d <= 60 && !spot; d += 4) for (let k = 0; k < (d ? 12 : 1) && !spot; k++) { const a = k / 12 * Math.PI * 2 + d * 0.3, x = B.x + dx + Math.cos(a) * d, z = B.z - s * 30 + Math.sin(a) * d; if (vehicleSpotFree(x, z, 9)) spot = [x, z]; }
      if (spot) { const v = makeGV(type, t, spot[0], spot[1], yaw); helipadMesh(spot[0], v.pos.y, spot[1]); }
    }
    // a gun boat on each of the two big lakes, on each team's side
    if (NORMANDY && t === 'blue') { for (const x of [-120, -40, 40, 120]) makeGV('boat', t, x, 390, Math.PI, WATER_Y); continue; }   // landing boats off the beach
    if (NORMANDY) continue;
    if (DAM) { if (t === 'blue' || t === 'red') makeGV('boat', t, t === 'blue' ? 60 : -60, t === 'blue' ? -110 : -320, t === 'blue' ? 0 : Math.PI, WATER_Y); continue; }   // boats on the reservoir
    if (t === 'blue' || t === 'red') for (const L of SNOW ? [] : [LAKES[0], LAKES[1]].filter(Boolean)) {
      const z = L.z + s * L.r * 0.45, x = L.x;
      makeGV('boat', t, x, z, t === 'blue' ? Math.PI * 0.5 : -Math.PI * 0.5, WATER_Y);
    } else if (!SNOW && LAKES.length) {   // green and yellow: a boat on the lake nearest their base, on the side facing it
      const L = LAKES.slice().sort((a, b) => Math.hypot(a.x - B.x, a.z - B.z) - Math.hypot(b.x - B.x, b.z - B.z))[0];
      const x = L.x + Math.sign(B.x - L.x) * L.r * 0.45;
      if (waterDepth(x, L.z) > 1.2) makeGV('boat', t, x, L.z, 0, WATER_Y);
    }
  }
}
