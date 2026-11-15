// ===================== gvehicles.js : jeeps, tanks and trucks =====================
const VTYPES = {
  jeep: {
    name: 'Jeep', hp: 450, maxSpeed: 28, accel: 11, turn: 1.7, radius: 2.1, len: 4.2, wid: 2.0, bulletMult: 0.6, expMult: 1, camDist: 9,
    seats: [{ p: [-0.45, 1.25, -0.1], role: 'drive', pose: 'sit', exposed: true }, { p: [0, 1.4, 1.62], role: 'gun', pose: 'stand', exposed: true },
      { p: [0.45, 1.25, -0.1], role: 'ride', pose: 'sit', exposed: true }, { p: [0.45, 1.25, 1.0], role: 'ride', pose: 'sit', exposed: true }],
  },
  tank: {
    name: 'Tank', hp: 1400, maxSpeed: 13, accel: 8, turn: 0.9, radius: 3.3, len: 6.4, wid: 3.4, bulletMult: 0.06, expMult: 0.55, camDist: 13,
    seats: [{ p: [0, 1.2, 0], role: 'drive', pose: 'hide', exposed: false }, { p: [0.55, 2.35, 0.9], role: 'gun', pose: 'stand', exposed: true }],
  },
  quad: {
    name: 'Tunnel quad', hp: 280, maxSpeed: 17, accel: 11, turn: 2.3, radius: 0.9, len: 2.4, wid: 1.3, bulletMult: 0.8, expMult: 1, camDist: 5.5,
    seats: [{ p: [0, 1.0, 0.05], role: 'drive', pose: 'sit', exposed: true }, { p: [0, 1.12, 0.8], role: 'ride', pose: 'sit', exposed: true }],
  },
  truck: {
    name: 'Truck', hp: 750, maxSpeed: 22, accel: 8, turn: 1.25, radius: 2.7, len: 6.6, wid: 2.4, bulletMult: 0.5, expMult: 1, camDist: 12,
    seats: [{ p: [-0.5, 1.4, -2.15], role: 'drive', pose: 'sit', exposed: true }, { p: [0.5, 1.4, -2.15], role: 'ride', pose: 'sit', exposed: true },
      ...[0.1, 1.2, 2.3].flatMap(z => [{ p: [-0.75, 1.75, z], role: 'ride', pose: 'sit', exposed: true, side: 1 }, { p: [0.75, 1.75, z], role: 'ride', pose: 'sit', exposed: true, side: -1 }])],
  },
};
const gvehicles = [];
const VM2 = {
  tire: new THREE.MeshLambertMaterial({ color: 0x1c1c1c }), hub: new THREE.MeshLambertMaterial({ color: 0x8a8f94 }),
  dark: new THREE.MeshLambertMaterial({ color: 0x2c2f33 }), glass: new THREE.MeshPhongMaterial({ color: 0x9fc5e8, transparent: true, opacity: 0.55, shininess: 90 }),
  seat: new THREE.MeshLambertMaterial({ color: 0x3a2c22 }), canvas: new THREE.MeshLambertMaterial({ color: 0x6b6b4a, side: THREE.DoubleSide }),
  track: new THREE.MeshLambertMaterial({ color: 0x2a2a2a }), lamp: new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
};
const hullColor = { blue: 0x55657a, red: 0x7a5a45 };
function makeVehicleModelOld(type, team) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const paint = new THREE.MeshLambertMaterial({ color: hullColor[team] }), tcol = new THREE.MeshLambertMaterial({ color: TEAM_COLOR[team] });
  const add = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const R = Math.PI / 2, wheels = [], out = { g, body, wheels };
  const wheel = (x, y, z, r, w) => { const wg = new THREE.Group(); wg.position.set(x, y, z); body.add(wg); add(wg, new THREE.CylinderGeometry(r, r, w, 16), VM2.tire, 0, 0, 0, 0, 0, R); add(wg, new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 10), VM2.hub, 0, 0, 0, 0, 0, R); wheels.push(wg); };
  if (type === 'jeep') {
    add(body, new THREE.BoxGeometry(1.9, 0.55, 4.0), paint, 0, 0.85, 0);
    add(body, new THREE.BoxGeometry(1.8, 0.35, 1.3), paint, 0, 1.25, -1.35);
    add(body, new THREE.BoxGeometry(0.5, 0.06, 1.0), tcol, 0, 1.44, -1.35);
    for (const s of [-1, 1]) { add(body, new THREE.BoxGeometry(0.3, 0.12, 1.1), paint, s * 0.98, 1.18, -1.35); add(body, new THREE.BoxGeometry(0.3, 0.12, 1.1), paint, s * 0.98, 1.18, 1.35); }
    add(body, new THREE.BoxGeometry(1.8, 0.7, 0.05), VM2.glass, 0, 1.6, -0.62, -0.25);
    add(body, new THREE.BoxGeometry(1.85, 0.06, 0.08), VM2.dark, 0, 1.96, -0.7);
    for (const x of [-0.45, 0.45]) { add(body, new THREE.BoxGeometry(0.6, 0.18, 0.6), VM2.seat, x, 1.18, -0.05); add(body, new THREE.BoxGeometry(0.6, 0.6, 0.12), VM2.seat, x, 1.45, 0.25); add(body, new THREE.BoxGeometry(0.6, 0.18, 0.6), VM2.seat, x, 1.18, 1.0); }
    const bar = add(body, new THREE.TorusGeometry(0.9, 0.05, 6, 16, Math.PI), VM2.dark, 0, 1.15, 0.55); bar.rotation.set(0, 0, 0);
    add(body, new THREE.CylinderGeometry(0.42, 0.42, 0.25, 14), VM2.tire, 0, 1.15, 2.05, R);
    for (const s of [-0.6, 0.6]) add(body, new THREE.CylinderGeometry(0.12, 0.12, 0.06, 10), VM2.lamp, s, 1.2, -2.03, R);
    add(body, new THREE.BoxGeometry(1.9, 0.12, 0.15), VM2.dark, 0, 0.7, -2.05);
    add(body, new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4), VM2.dark, -0.85, 1.9, 1.8);
    add(body, new THREE.BoxGeometry(0.02, 0.35, 0.5), tcol, -0.85, 2.55, 2.05);
    for (const [x, z] of [[-1.0, -1.35], [1.0, -1.35], [-1.0, 1.35], [1.0, 1.35]]) wheel(x, 0.45, z, 0.45, 0.35);
    add(body, new THREE.CylinderGeometry(0.06, 0.08, 0.7, 8), VM2.dark, 0, 1.45, 1.35);
    const mgYaw = new THREE.Group(); mgYaw.position.set(0, 1.85, 1.35); body.add(mgYaw);
    const mgPitch = new THREE.Group(); mgYaw.add(mgPitch);
    add(mgPitch, new THREE.BoxGeometry(0.2, 0.22, 0.8), VM2.dark, 0, 0, -0.2);
    add(mgPitch, new THREE.CylinderGeometry(0.04, 0.05, 0.9, 8), VM2.dark, 0, 0, -0.95, R);
    add(mgPitch, new THREE.BoxGeometry(0.7, 0.45, 0.05), paint, 0, 0.05, -0.45);
    const mz = new THREE.Object3D(); mz.position.z = -1.45; mgPitch.add(mz);
    Object.assign(out, { mgYaw, mgPitch, mgMuzzle: mz, mgBase: 1.85 });
  } else if (type === 'tank') {
    add(body, new THREE.BoxGeometry(2.6, 0.9, 5.6), paint, 0, 1.15, 0);
    add(body, new THREE.BoxGeometry(2.6, 0.5, 1.2), paint, 0, 1.05, -3.0, 0.5);
    add(body, new THREE.BoxGeometry(3.4, 0.12, 6.2), paint, 0, 1.35, 0);
    for (const s of [-1, 1]) {
      add(body, new THREE.BoxGeometry(0.75, 0.95, 6.3), VM2.track, s * 1.35, 0.55, 0);
      for (let i = 0; i < 6; i++) { const w = add(body, new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12), VM2.hub, s * 1.75, 0.42, -2.4 + i * 0.96, 0, 0, R); wheels.push(w); }
      add(body, new THREE.BoxGeometry(0.06, 0.45, 5.6), paint, s * 1.73, 1.0, 0);
    }
    add(body, new THREE.BoxGeometry(0.5, 0.3, 0.6), VM2.dark, -0.8, 1.7, 2.6); add(body, new THREE.BoxGeometry(0.5, 0.3, 0.6), VM2.dark, 0.8, 1.7, 2.6);
    const turret = new THREE.Group(); turret.position.set(0, 1.6, 0.2); body.add(turret);
    const tb = add(turret, new THREE.CylinderGeometry(1.35, 1.55, 0.85, 8), paint, 0, 0.42, 0); tb.scale.z = 1.25;
    add(turret, new THREE.BoxGeometry(0.9, 0.06, 0.9), tcol, 0, 0.86, 0.8);
    add(turret, new THREE.CylinderGeometry(0.35, 0.35, 0.12, 12), VM2.dark, 0.55, 0.9, 0.9);
    add(turret, new THREE.BoxGeometry(0.9, 0.6, 0.5), paint, 0, 0.42, -1.65);
    const barrel = new THREE.Group(); barrel.position.set(0, 0.45, -1.8); turret.add(barrel);
    add(barrel, new THREE.CylinderGeometry(0.12, 0.15, 3.6, 12), VM2.dark, 0, 0, -1.8, R);
    add(barrel, new THREE.CylinderGeometry(0.2, 0.2, 0.4, 12), VM2.dark, 0, 0, -3.55, R);
    const cmz = new THREE.Object3D(); cmz.position.z = -3.9; barrel.add(cmz);
    const mgYaw = new THREE.Group(); mgYaw.position.set(0.55, 1.15, 0.6); turret.add(mgYaw);
    const mgPitch = new THREE.Group(); mgYaw.add(mgPitch);
    add(mgPitch, new THREE.BoxGeometry(0.18, 0.2, 0.7), VM2.dark, 0, 0, -0.2);
    add(mgPitch, new THREE.CylinderGeometry(0.035, 0.045, 0.8, 8), VM2.dark, 0, 0, -0.85, R);
    const mz = new THREE.Object3D(); mz.position.z = -1.3; mgPitch.add(mz);
    Object.assign(out, { turret, barrel, cannonMuzzle: cmz, mgYaw, mgPitch, mgMuzzle: mz });
  } else if (type === 'quad') {
    add(body, new THREE.BoxGeometry(1.0, 0.35, 2.0), paint, 0, 0.6, 0);
    add(body, new THREE.BoxGeometry(1.3, 0.1, 0.7), paint, 0, 0.82, -0.75); add(body, new THREE.BoxGeometry(1.3, 0.1, 0.6), paint, 0, 0.82, 0.8);
    add(body, new THREE.BoxGeometry(0.5, 0.18, 1.1), VM2.seat, 0, 0.9, 0.45);
    add(body, new THREE.BoxGeometry(0.5, 0.3, 0.45), paint, 0, 0.95, -0.55);
    add(body, new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), VM2.dark, 0, 1.2, -0.62);
    add(body, new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), VM2.dark, 0, 1.45, -0.62, 0, 0, R);
    add(body, new THREE.BoxGeometry(0.5, 0.05, 0.3), tcol, 0, 0.9, 1.05);
    for (const s of [-0.25, 0.25]) add(body, new THREE.CylinderGeometry(0.09, 0.09, 0.05, 10), VM2.lamp, s, 0.85, -1.02, R);
    add(body, new THREE.BoxGeometry(0.9, 0.06, 0.06), VM2.dark, 0, 0.55, -1.1);
    for (const [x, z] of [[-0.62, -0.7], [0.62, -0.7], [-0.62, 0.72], [0.62, 0.72]]) wheel(x, 0.36, z, 0.36, 0.32);
  } else {
    add(body, new THREE.BoxGeometry(2.0, 0.35, 6.4), VM2.dark, 0, 0.85, 0);
    add(body, new THREE.BoxGeometry(2.3, 1.5, 1.7), paint, 0, 1.85, -2.25);
    add(body, new THREE.BoxGeometry(2.1, 0.9, 1.1), paint, 0, 1.45, -3.55);
    add(body, new THREE.BoxGeometry(2.15, 0.6, 0.05), VM2.glass, 0, 2.25, -3.11);
    add(body, new THREE.BoxGeometry(0.8, 0.1, 0.8), tcol, 0, 2.62, -2.25);
    for (const s of [-0.75, 0.75]) add(body, new THREE.CylinderGeometry(0.14, 0.14, 0.06, 10), VM2.lamp, s, 1.45, -4.11, R);
    add(body, new THREE.BoxGeometry(2.2, 0.2, 0.2), VM2.dark, 0, 1.0, -4.15);
    add(body, new THREE.BoxGeometry(2.4, 0.14, 4.4), paint, 0, 1.12, 0.9);
    for (const s of [-1, 1]) { add(body, new THREE.BoxGeometry(0.08, 0.55, 4.4), paint, s * 1.17, 1.45, 0.9); add(body, new THREE.BoxGeometry(0.4, 0.12, 3.6), VM2.seat, s * 0.85, 1.38, 1.15); }
    add(body, new THREE.BoxGeometry(2.4, 0.55, 0.08), paint, 0, 1.45, 3.08);
    for (const z of [-0.8, 0.9, 2.6]) { const hoop = add(body, new THREE.TorusGeometry(1.15, 0.04, 6, 16, Math.PI), VM2.dark, 0, 1.75, z); }
    for (const [x, z] of [[-1.1, -3.0], [1.1, -3.0], [-1.1, 1.1], [1.1, 1.1], [-1.1, 2.3], [1.1, 2.3]]) wheel(x, 0.5, z, 0.5, 0.4);
  }
  g.traverse(o => { if (o.isMesh) o.userData.isVehiclePart = true; });
  scene.add(g);
  return out;
}

function makeGV(type, team, x, z, yaw, y) {
  const T = VTYPES[type], m = makeVehicleModel(type, team);
  const v = { idx: gvehicles.length, type, T, team, model: m, pos: new THREE.Vector3(x, y !== undefined ? y : heightAt(x, z), z), yaw, speed: 0, vy: 0, pitch: 0, roll: 0,
    hp: T.hp, alive: true, seats: T.seats.map(() => null), turretYaw: 0, gunPitch: 0, mgYaw: yaw, mgPitch: 0, fireT: 0, mgT: 0,
    spawn: { x, z, yaw, y }, respawnT: 0, remote: null, departT: 0, aiGoal: null, stuckT: 0, revT: 0, idleT: 0, steer: 0, lastGround: 0 };
  v.lastGround = v.pos.y;
  m.g.traverse(o => { if (o.isMesh) o.userData.gv = v; });
  gvehicles.push(v); placeVehicleModel(v);
  return v;
}
function buildGroundVehicles() {
  if (WAKE && typeof buildWakeVehicles === 'function') { buildWakeVehicles(); return; }
  for (const t of TEAMS) {
    const B = BASES[t], s = teamSide(t), yaw = s > 0 ? 0 : Math.PI;
    makeGV('jeep', t, B.x - 21, B.z - s * 38, yaw); makeGV('tank', t, B.x - 8, B.z - s * 38, yaw);
    makeGV('truck', t, B.x + 8, B.z - s * 38, yaw); makeGV('jeep', t, B.x + 21, B.z - s * 38, yaw);
  }
  buildTunnelQuads();
  buildMotorPools();
  buildHelisAndBoats();
}
// small quads parked in the tunnels: two at the HQ, one under each bunker and base hatch
function buildTunnelQuads() {
  if (!HUB) return;
  const along = (key, avoid) => {   // a parking spot a little way down the tunnel from a graph node, facing along it
    const n = TNODES.get(key); if (!n) return null;
    for (const [k2] of n.edges) {
      if (k2 === avoid) continue;
      const m = TNODES.get(k2), d = Math.hypot(m.x - n.x, m.z - n.z); if (d < 3) continue;
      const ux = (m.x - n.x) / d, uz = (m.z - n.z) / d, t = Math.min(7, d / 2);
      return { x: n.x + ux * t + uz * 1.0, z: n.z + uz * t - ux * 1.0, yaw: Math.atan2(-ux, -uz) };
    }
    const a = avoid && TNODES.get(avoid);
    if (a) { const d = Math.hypot(a.x - n.x, a.z - n.z) || 1, ux = (n.x - a.x) / d, uz = (n.z - a.z) / d; return { x: n.x + uz * 1.0, z: n.z - ux * 1.0, yaw: Math.atan2(ux, uz) }; }
    return null;
  };
  makeGV('quad', 'blue', HUB.x - 12, HUB.z - 6, 0, TUN_Y); makeGV('quad', 'red', HUB.x + 12, HUB.z + 6, Math.PI, TUN_Y);
  for (const b of bunkers) { const p = along('b2' + b.name, 'b' + b.name); if (p) makeGV('quad', b.z > 0 ? 'blue' : 'red', p.x, p.z, p.yaw, TUN_Y); }
  for (const h of HATCHES) if (/base/.test(h.name)) { const p = along('h' + h.name, null); if (p) makeGV('quad', /Blue/.test(h.name) ? 'blue' : 'red', p.x, p.z, p.yaw, TUN_Y); }
}
const _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
function vehicleQuat(v) { _e.set(v.pitch, v.yaw, v.roll, 'YXZ'); return _q.setFromEuler(_e); }
function placeVehicleModel(v) {
  v.model.g.position.copy(v.pos); v.model.g.quaternion.copy(vehicleQuat(v));
  if (v.model.turret) { v.model.turret.rotation.y = v.turretYaw; v.model.barrel.rotation.x = v.gunPitch; }
  if (v.model.mgYaw) {
    const parentYaw = v.yaw + (v.model.turret ? v.turretYaw : 0);
    v.model.mgYaw.rotation.y = wrapAngle(v.mgYaw - parentYaw); v.model.mgPitch.rotation.x = v.mgPitch;
  }
}
function seatWorld(v, i) {
  const p = v.T.seats[i].p;
  return new THREE.Vector3(p[0], p[1], p[2]).applyQuaternion(vehicleQuat(v)).add(v.pos);
}
function freeSeat(v, prefer) {
  if (prefer !== undefined && !v.seats[prefer]) return prefer;
  for (let i = 0; i < v.seats.length; i++) if (!v.seats[i]) return i;
  return -1;
}
function enterSeat(c, v, i) {
  if (v.seats[i] && v.seats[i] !== c) return false;
  if (c.gv) leaveSeat(c, true);
  v.seats[i] = c; c.gv = v; c.seat = i; c.exposed = v.T.seats[i].exposed;
  if (!v.homeTeam) v.homeTeam = v.team; v.team = c.team;   // whoever climbs in owns it (stealing works)
  if (c.turret) { c.turret.user = null; c.turret = null; }
  if (i === 0) { v.departT = c.isPlayer || c.isRemote ? 0 : 5 + v.idx % 4 * 2; v.stuckT = 0; }
  return true;
}
function leaveSeat(c, switching) {
  const v = c.gv; if (!v) return;
  if (v.seats[c.seat] === c) v.seats[c.seat] = null;
  c.gv = null; c.seat = -1; c.exposed = false;
  c.noVehT = simTime + 25; c.vehTarget = null;
  if (switching) return;
  const right = new THREE.Vector3(Math.cos(v.yaw), 0, -Math.sin(v.yaw));
  for (const side of [1, -1, 0]) {
    const p = side ? v.pos.clone().addScaledVector(right, side * (v.T.wid / 2 + 1.3)) : v.pos.clone().add(new THREE.Vector3(Math.sin(v.yaw), 0, Math.cos(v.yaw)).multiplyScalar(v.T.len / 2 + 1.5));
    const gy = groundAt(p.x, p.z, v.pos.y + 0.5);
    if (!blockedAt(p.x, p.z, gy, 0.4) || side === 0) { c.pos.set(p.x, gy, p.z); break; }
  }
  if (c.model) { c.model.root.visible = c.alive; c.model.legL.rotation.set(0, 0, 0); c.model.legR.rotation.set(0, 0, 0); }
}
function occupants(v) { return v.seats.filter(Boolean); }
function driverOf(v) { return v.seats[0]; }

// ---------- driving physics (simple, arcade) ----------
function simVehicle(v, dt, inp) {
  const T = v.T, vy0 = v.pos.y + 0.5, GH = (x, z) => groundAt(x, z, vy0), under = !!undergroundAt(v.pos.x, v.pos.z, vy0);
  const target = inp.thr > 0 ? T.maxSpeed * inp.thr : inp.thr < 0 ? -T.maxSpeed * 0.4 * -inp.thr : 0;
  if (inp.brake) { v.speed *= Math.exp(-dt * 4); if (Math.abs(v.speed) < 0.4 && !v.airborne) v.speed = 0; }
  else if (inp.thr === 0) v.speed *= Math.exp(-dt * 0.9);
  else v.speed += clamp(target - v.speed, -T.accel * dt * 1.8, T.accel * dt);
  const gh = GH(v.pos.x, v.pos.z);
  if (waterDepth(v.pos.x, v.pos.z) > 0.6) v.speed = clamp(v.speed, -3, 4);
  const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw), half = T.len / 2;
  const hF = GH(v.pos.x + fx * half, v.pos.z + fz * half), hB = GH(v.pos.x - fx * half, v.pos.z - fz * half);
  // hills only nudge the speed a little (engines are strong)
  if (!v.airborne && !(inp.brake && v.speed === 0) && inp.thr === 0) v.speed -= clamp((hF - hB) / T.len, -0.5, 0.5) * 3 * dt;
  v.steer = lerp(v.steer, inp.steer, Math.min(1, dt * 6));
  if (!v.airborne) v.yaw += v.steer * T.turn * dt * clamp(Math.abs(v.speed) / 6, 0, 1) * Math.sign(v.speed || 1);
  const px = v.pos.x, pz = v.pos.z;
  v.pos.x += fx * v.speed * dt; v.pos.z += fz * v.speed * dt;
  // hitting buildings, trees and rocks
  const probe = (x, z) => {
    for (const off of [-half * 0.6, 0, half * 0.6]) {
      const cx = x + fx * off, cz = z + fz * off, r = T.wid / 2 + 0.1;
      for (const o of nearbyColliders(cx, cz)) {
        if (o.kind === 'box') { if (o.maxY > v.pos.y + 0.8 && o.minY < v.pos.y + 1.6 && cx > o.minX - r && cx < o.maxX + r && cz > o.minZ - r && cz < o.maxZ + r) return { o, cx, cz }; }
        else if (!under && o.top > v.pos.y + 0.8 && Math.hypot(cx - o.x, cz - o.z) < r + o.r * 0.8) return { o, cx, cz };
      }
    }
    return null;
  };
  let hit = probe(v.pos.x, v.pos.z);
  if (hit && probe(px, pz)) {
    // already touching before this move (usually from turning next to a wall): ease away from it instead of sticking
    const o = hit.o, nx = o.kind === 'box' ? clamp(hit.cx, o.minX, o.maxX) : o.x, nz = o.kind === 'box' ? clamp(hit.cz, o.minZ, o.maxZ) : o.z;
    let dx = hit.cx - nx, dz = hit.cz - nz; const d = Math.hypot(dx, dz);
    if (d < 0.01) { dx = v.pos.x - (o.kind === 'box' ? (o.minX + o.maxX) / 2 : o.x); dz = v.pos.z - (o.kind === 'box' ? (o.minZ + o.maxZ) / 2 : o.z); }
    const k = Math.hypot(dx, dz) || 1;
    v.pos.x = px + dx / k * Math.max(0.05, Math.abs(v.speed) * dt * 0.5 + 0.03); v.pos.z = pz + dz / k * Math.max(0.05, Math.abs(v.speed) * dt * 0.5 + 0.03);
    v.speed *= 0.9; hit = null;
  }
  if (Math.abs(v.pos.x) > EDGE || Math.abs(v.pos.z) > EDGE) hit = true;
  if (hit) {
    v.pos.x = px; v.pos.z = pz;
    if (Math.abs(v.speed) > 9) { damageVehicle(v, Math.abs(v.speed) * 4, null); burst(v.pos.clone().add(new THREE.Vector3(fx * half, 1, fz * half)), 6, 0x8a7a5a, 4, 0.5, 0.08); }
    v.speed *= -0.25;
  }
  // other vehicles
  for (const o of gvehicles) {
    if (o === v || !o.alive || Math.abs(o.pos.y - v.pos.y) > 4) continue;
    if (o.type === 'quad' && o.spawn.y !== undefined && !o.seats.some(q => q)) continue;   // a parked quad never blocks a tunnel
    const dx = v.pos.x - o.pos.x, dz = v.pos.z - o.pos.z, d = Math.hypot(dx, dz), min = T.radius + o.T.radius - 0.6;
    if (d < min && d > 0.01) { v.pos.x += dx / d * (min - d) * 0.6; v.pos.z += dz / d * (min - d) * 0.6; v.speed *= 0.7; }
  }
  // ground, jumps and tilt
  const g2 = GH(v.pos.x, v.pos.z);
  if (!v.airborne) { v.vy = clamp((g2 - v.lastGround) / Math.max(dt, 0.001), -30, 9); v.pos.y = g2; }
  else { v.vy -= 20 * dt; v.pos.y += v.vy * dt; }
  if (v.airborne && v.pos.y <= g2) { if (v.vy < -14) damageVehicle(v, (-v.vy - 14) * 12, null); v.airborne = false; v.pos.y = g2; v.vy = 0; }
  else if (!v.airborne && v.lastGround - g2 > Math.abs(v.speed) * dt * 0.7 + 0.08 && Math.abs(v.speed) > 14) { v.airborne = true; v.pos.y = v.lastGround; v.vy = Math.max(v.vy, 0); }
  v.lastGround = g2;
  if (!v.airborne) {
    const lx = Math.cos(v.yaw), lz = -Math.sin(v.yaw), hw = T.wid / 2;
    const hF2 = GH(v.pos.x + fx * half, v.pos.z + fz * half), hB2 = GH(v.pos.x - fx * half, v.pos.z - fz * half);
    const hR = GH(v.pos.x + lx * hw, v.pos.z + lz * hw), hL = GH(v.pos.x - lx * hw, v.pos.z - lz * hw);
    v.pitch = lerp(v.pitch, Math.atan2(hF2 - hB2, T.len), Math.min(1, dt * 10));
    v.roll = lerp(v.roll, T.lean ? v.steer * clamp(Math.abs(v.speed) / 16, 0, 1) * 0.5 : Math.atan2(hR - hL, T.wid), Math.min(1, dt * (T.lean ? 6 : 10)));
  } else v.pitch = lerp(v.pitch, clamp(v.vy * 0.03, -0.5, 0.3), dt * 2);
  // props, and soldiers in the way
  const sp = Math.abs(v.speed);
  if (sp > 1) for (const p of props) {
    if (p.exploded) continue;
    const b = p.body.position, dx = b.x - v.pos.x, dz = b.z - v.pos.z, d = Math.hypot(dx, dz);
    if (d > T.radius + 0.8 || b.y > v.pos.y + 3) continue;
    p.body.wakeUp();
    p.body.applyImpulse(new CANNON.Vec3((dx / d * 2 + fx * Math.sign(v.speed)) * sp * p.body.mass * 0.4, sp * p.body.mass * 0.15, (dz / d * 2 + fz * Math.sign(v.speed)) * sp * p.body.mass * 0.4), new CANNON.Vec3(b.x, b.y + 0.2, b.z));
    if (p.kind === 'barrel' && sp > 10) setTimeout(() => explodeBarrel(p, driverOf(v)), 50);
  }
  if (sp > 3) for (const c of chars) {
    if (!c.alive || c.gv || c.vehicle || c.inactive) continue;
    const dx = c.pos.x - v.pos.x, dz = c.pos.z - v.pos.z, d = Math.hypot(dx, dz);
    if (d > T.radius * 0.85 + 0.4 || Math.abs(c.pos.y - v.pos.y) > 2.5) continue;
    if (c.team !== v.team) damage(c, sp * 7, driverOf(v) || null, new THREE.Vector3(dx / (d || 1), 0.5, dz / (d || 1)), sp * 1.4);
    else if (c.isPlayer) player.push.add(new THREE.Vector3(dx / (d || 1), 0, dz / (d || 1)).multiplyScalar(6));
    else if (!c.isRemote) { c.pos.x += dx / (d || 1) * 0.5; c.pos.z += dz / (d || 1) * 0.5; }
  }
  for (const w of v.model.wheels) w.rotation.x -= v.speed * dt / 0.45;
  if (false) smokePuff(v.pos.clone().add(new THREE.Vector3(-fx * half, 0.3, -fz * half)), 0xb8a580, 0.4, 0.8, 0.5);
}

// ---------- weapons ----------
function vehicleMG(v, dir, shooter) {
  v.mgT = 0.1;
  v.model.mgMuzzle.getWorldPosition(_tmpV);
  const from = _tmpV.clone();
  if (typeof fxMuzzle === 'function') fxMuzzle(from, dir, 1.6);
  if (shooter === player) camShake = Math.max(camShake, 0.025);
  const d = dir.clone().add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(shooter === player ? 0.01 : 0.03)).normalize();
  const hit = rayHit(from, d, 260, v.team, { player: v.team !== player.team, ignoreGV: v });
  const end = hit ? hit.point : from.clone().addScaledVector(d, 260);
  shootTracer(from, end, 0xffc860, 360, 0.07, () => applyHit(hit, d, { dmg: 26, force: 9 }, shooter));
  netShot(from, end, 1); playAt('mg', from, 1.0);
}
function tankFire(v, shooter) {
  v.fireT = 3.2;
  v.model.cannonMuzzle.getWorldPosition(_tmpV);
  const from = _tmpV.clone();
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(v.model.cannonMuzzle.getWorldQuaternion(new THREE.Quaternion()));
  spawnRocket(from, dir, shooter, { speed: 120, dmg: 320, radius: 8.5, shell: true });
  for (let i = 0; i < 6; i++) smokePuff(from.clone().addScaledVector(dir, rand(0, 2)), 0xcfc8b8, 0.5, 1.2, 0.5);
  burst(from, 6, 0xffc060, 6, 0.3, 0.12);
  flashLight.position.copy(from); flashLight.intensity = 4;
  playAt('boom', from, 0.9);
  v.speed += 0.8;
  if (shooter === player) camShake = Math.max(camShake, 0.04);
}
function aimTurretAt(v, target, dt, rate = 1.2) {
  const p = v.model.barrel.getWorldPosition(new THREE.Vector3());
  const dx = target.x - p.x, dz = target.z - p.z, dy = target.y - p.y;
  const wantWorld = Math.atan2(-dx, -dz), want = wrapAngle(wantWorld - v.yaw);
  v.turretYaw += clamp(wrapAngle(want - v.turretYaw), -rate * dt, rate * dt);
  const wantP = clamp(Math.atan2(dy, Math.hypot(dx, dz)) - v.pitch, -0.15, 0.35);
  v.gunPitch += clamp(wantP - v.gunPitch, -0.6 * dt, 0.6 * dt);
  return Math.abs(wrapAngle(want - v.turretYaw)) < 0.05 && Math.abs(wantP - v.gunPitch) < 0.05;
}
function aimMGAt(v, target, dt) {
  v.model.mgYaw.getWorldPosition(_tmpV);
  const dx = target.x - _tmpV.x, dz = target.z - _tmpV.z, dy = target.y - _tmpV.y;
  const want = Math.atan2(-dx, -dz);
  v.mgYaw += clamp(wrapAngle(want - v.mgYaw), -3 * dt, 3 * dt);
  v.mgPitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)) - v.pitch, -0.4, 0.9);
  return Math.abs(wrapAngle(want - v.mgYaw)) < 0.08;
}
function mgDir(v) { return new THREE.Vector3(0, 0, -1).applyQuaternion(v.model.mgPitch.getWorldQuaternion(new THREE.Quaternion())); }

// ---------- damage ----------
function damageVehicle(v, amt, attacker) {
  if (!v.alive) return;
  v.restT = 0;
  if (attacker && attacker.team === v.team) return;
  if (attacker === player) showHitmarker(false);
  if (netVehicleHit(v, amt, attacker)) return;
  v.hp -= amt; v.lastAttacker = attacker || v.lastAttacker;
  if (driverOf(v) === player || player.gv === v) showHitDir(attacker && attacker.pos);
  if (v.hp <= 0) destroyVehicle(v, attacker || v.lastAttacker);
}
function destroyVehicle(v, attacker) {
  if (!v.alive) return;
  v.alive = false; v.respawnT = 35; v.model.g.visible = false;
  const pos = v.pos.clone().add(new THREE.Vector3(0, 1, 0));
  explosion(pos, 9, 40, attacker && attacker.team !== v.team ? attacker : null, 150);
  burst(pos, 26, 0x3a3a3a, 14, 2.5, 0.35);
  for (let i = 0; i < 6; i++) setTimeout(() => smokePuff(pos.clone().add(new THREE.Vector3(rand(-1, 1), rand(0, 1), rand(-1, 1))), 0x222222, 1.2, 3, 2), i * 400);
  if (attacker === player) addMoney(v.type === 'tank' ? 400 : 200, `${v.T.name} destroyed`);
  netVehicleDown(v);
  if (!net.active || net.isHost) addKillfeed(attacker || null, { name: teamName(v.team) + ' ' + v.T.name.toLowerCase(), team: v.team }, false);
  for (const c of occupants(v)) {
    leaveSeat(c, true);
    if (c === player || (!c.isRemote && (!net.active || net.isHost))) { if (c.alive) kill(c, attacker && attacker !== c ? attacker : null, new THREE.Vector3(0, 1, 0), 12); }
    else if (c.isRemote && net.active) pushHit(['p', c.peerId, 999, 0, attackerKey(attacker)]);
  }
}
function resetVehicle(v) {
  if (v.homeTeam) v.team = v.homeTeam;
  for (const c of occupants(v)) leaveSeat(c);
  v.pos.set(v.spawn.x, v.spawn.y !== undefined ? v.spawn.y : heightAt(v.spawn.x, v.spawn.z), v.spawn.z); v.lastGround = v.pos.y; v.yaw = v.spawn.yaw; v.speed = 0; v.vy = 0; v.pitch = 0; v.roll = 0;
  v.hp = v.T.hp; v.alive = true; v.turretYaw = 0; v.gunPitch = 0; v.mgYaw = v.yaw; v.aiGoal = null; v.route = null; v.airborne = false; v.lastGround = v.pos.y; if (v.vel) v.vel.set(0, 0, 0); v.rotorSpin = 0; v.restT = 0;
  v.model.g.visible = true; placeVehicleModel(v);
}

// ---------- computer drivers and gunners ----------
// a soldier driving a boat: head for the shore nearest the objective, beach it and everyone jumps out
function aiBoat(v, n, dt) {
  const inp = { thr: 0, steer: 0, brake: false };
  if (v.departT > 0) { v.departT -= dt; if (occupants(v).length < v.seats.length && v.departT > 0) { inp.brake = true; return inp; } v.departT = 0; }
  if (!v.aiGoal) v.aiGoal = n.goalPoint;
  const gp = v.aiGoal; if (!gp) { inp.brake = true; return inp; }
  const want = Math.atan2(-(gp.x - v.pos.x), -(gp.z - v.pos.z));
  let best = null;
  for (const o of [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1, 1.6, -1.6]) {
    const a = want + o * (v.avoidSide || 1), fx = -Math.sin(a), fz = -Math.cos(a);
    if ([6, 12, 20].every(d => waterDepth(v.pos.x + fx * d, v.pos.z + fz * d) > 0.9)) { best = a; break; }
  }
  const near = Math.hypot(gp.x - v.pos.x, gp.z - v.pos.z) < 140;
  if (best === null || (near && waterDepth(v.pos.x - Math.sin(v.yaw) * 9, v.pos.z - Math.cos(v.yaw) * 9) < 0.9)) {
    if (near || best === null) { inp.brake = true; v.arrived = (v.arrived || 0) + dt; return inp; }
  }
  v.arrived = 0;
  const err = wrapAngle(best - v.yaw);
  inp.steer = clamp(err * 1.5, -1, 1); inp.thr = Math.abs(err) > 1 ? 0.4 : 0.95;
  return inp;
}
function aiDrive(v, n, dt) {
  if (v.T.boat) return aiBoat(v, n, dt);
  const inp = { thr: 0, steer: 0, brake: false };
  if (v.departT > 0) {
    v.departT -= dt;
    if (occupants(v).length < v.seats.length && v.type !== 'tank') { inp.brake = true; return inp; }
    v.departT = 0;
  }
  if (!v.aiGoal) v.aiGoal = n.goalPoint;
  const gp = v.aiGoal; if (!gp) { inp.brake = true; return inp; }
  const dx = gp.x - v.pos.x, dz = gp.z - v.pos.z, d = Math.hypot(dx, dz);
  if (d < (v.type === 'tank' ? 22 : 30)) { inp.brake = true; v.arrived = (v.arrived || 0) + dt; return inp; }
  v.arrived = 0;
  if (v.revT > 0) { v.revT -= dt; return { thr: -0.7, steer: v.revSteer, brake: false }; }
  if (!v.route || v.routeGoal !== gp.name) planRoute(v, gp);
  const tgt = pursuitPoint(v);
  const want = Math.atan2(-(tgt.x - v.pos.x), -(tgt.z - v.pos.z));
  let best = want;
  for (const o of [0, 0.3, -0.3, 0.6, -0.6, 1.0, -1.0, 1.5, -1.5]) {
    const a = want + o * (v.avoidSide || 1), fx = -Math.sin(a), fz = -Math.cos(a);
    let ok = true;
    for (const dist of [4, 8, 12]) {
      const x = v.pos.x + fx * dist, z = v.pos.z + fz * dist, y = heightAt(x, z);
      if (vehBlocked(x, z, y, v.T.wid / 2 + 0.4, v) || waterDepth(x, z) > 0.5 || Math.abs(y - v.pos.y) > dist * 0.75) { ok = false; break; }
    }
    if (ok) { best = a; break; }
  }
  const err = wrapAngle(best - v.yaw);
  inp.steer = clamp(err * 1.6, -1, 1);
  inp.thr = Math.abs(err) > 1.2 ? 0.35 : Math.abs(err) > 0.5 ? 0.6 : 0.9;
  if (Math.abs(v.speed) < 1.5) { v.stuckT += dt; if (v.stuckT > 2.5) { v.stuckT = 0; v.revT = 1.8; v.revSteer = -Math.sign(err || 1); v.avoidSide = -(v.avoidSide || 1); } }
  else v.stuckT = 0;
  return inp;
}
// roads: drive along the dirt roads between bases and points (there are no trees on them)
const RNODES = [BASES.blue, BASES.red, ...POINTS_DEF];
function planRoute(v, gp) {
  v.route = routeBetween(v.pos, gp); v.seg = 0; v.routeGoal = gp.name;
}
// shortest way along the roads from a position to a control point (a list of road junctions)
function routeBetween(pos, gp) {
  const goal = PD[gp.name] || gp;
  let start = RNODES[0], sd = Infinity;
  for (const nd of RNODES) { const d = Math.hypot(nd.x - pos.x, nd.z - pos.z); if (d < sd) { sd = d; start = nd; } }
  const dist = new Map(RNODES.map(nd => [nd, Infinity])), prev = new Map(), todo = new Set(RNODES);
  dist.set(start, 0);
  while (todo.size) {
    let u = null; for (const nd of todo) if (!u || dist.get(nd) < dist.get(u)) u = nd;
    todo.delete(u); if (u === goal) break;
    for (const [a, b] of PATHS) {
      const w = a === u ? b : b === u ? a : null; if (!w || !todo.has(w)) continue;
      const alt = dist.get(u) + Math.hypot(a.x - b.x, a.z - b.z);
      if (alt < dist.get(w)) { dist.set(w, alt); prev.set(w, u); }
    }
  }
  const route = [goal]; let c = goal; while (prev.has(c)) { c = prev.get(c); route.unshift(c); }
  if (route[0] !== start) route.unshift(start);
  return route;
}
function pursuitPoint(v) {
  const R = v.route;
  if (R.length < 2) return R[R.length - 1];
  while (v.seg < R.length - 2) {
    const b = R[v.seg + 1];
    if (Math.hypot(b.x - v.pos.x, b.z - v.pos.z) < 14) v.seg++; else break;
  }
  const a = R[v.seg], b = R[v.seg + 1], sx = b.x - a.x, sz = b.z - a.z, L = Math.hypot(sx, sz);
  const t = clamp(((v.pos.x - a.x) * sx + (v.pos.z - a.z) * sz) / (L * L), 0, 1);
  const px = a.x + sx * t, pz = a.z + sz * t;
  const off = Math.hypot(px - v.pos.x, pz - v.pos.z);
  let along = t * L + (off > 25 ? 0 : 16);
  if (along > L && v.seg + 2 < R.length) { const c = R[v.seg + 2]; const ex = along - L, nx = c.x - b.x, nz = c.z - b.z, nl = Math.hypot(nx, nz); return { x: b.x + nx / nl * Math.min(ex, nl), z: b.z + nz / nl * Math.min(ex, nl) }; }
  along = Math.min(along, L);
  const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
  while (along < L && ((a.x + sx / L * along - v.pos.x) * fx + (a.z + sz / L * along - v.pos.z) * fz) < 4 && Math.abs(v.speed) < 8) along += 8;
  along = Math.min(along, L);
  return { x: a.x + sx / L * along, z: a.z + sz / L * along };
}
function vehBlocked(x, z, y, r, self) {
  if (Math.abs(x) > EDGE - 3 || Math.abs(z) > EDGE - 3) return true;
  if (self) for (const o of gvehicles) if (o !== self && o.alive && Math.hypot(x - o.pos.x, z - o.pos.z) < r + o.T.radius) return true;
  for (const o of nearbyColliders(x, z)) {
    if (o.kind === 'box') { if (o.maxY > y + 0.8 && o.minY < y + 1.6 && x > o.minX - r && x < o.maxX + r && z > o.minZ - r && z < o.maxZ + r) return true; }
    else if (!(o.base !== undefined && y < o.base - 2) && o.top > y + 0.8 && Math.hypot(x - o.x, z - o.z) < r + o.r * 0.8) return true;
  }
  return false;
}
function findVehicleTarget(n, range) {
  let best = null, bd = range;
  for (const o of gvehicles) {
    if (!o.alive || o.team === n.team) continue;
    const d = o.pos.distanceTo(n.pos); if (d < bd && los(n.eye(), o.pos.clone().add(new THREE.Vector3(0, 1.5, 0)))) { bd = d; best = o; }
  }
  return best;
}
// a soldier sitting in a vehicle (host / solo)
function npcInVehicle(n, dt) {
  const v = n.gv, role = v.T.seats[n.seat].role;
  if (!v.alive) { leaveSeat(n); return; }
  if (role === 'drive') {
    simVehicle(v, dt, aiDrive(v, n, dt));
    if (v.arrived > 0.5 && v.T.boat) { for (const c of occupants(v)) if (!c.isPlayer && !c.isRemote) { leaveSeat(c); c.noVehT = simTime + 30; } v.aiGoal = null; return; }   // beached: everybody out
    if (v.arrived > 0.5) {
      for (const c of occupants(v)) if (c !== n && v.T.seats[c.seat].role === 'ride' && !c.isPlayer && !c.isRemote) leaveSeat(c);
      if (v.type !== 'tank' && v.arrived > 1.2) { leaveSeat(n); v.aiGoal = null; return; }
      if (v.type === 'tank') {
        const gp = v.aiGoal;
        if (gp && gp.owner === n.team && Math.abs(gp.progress) > 0.99 && foesIn(gp, n.team) === 0 && Math.random() < dt * 0.1) { chooseObjective(n, gp); v.aiGoal = n.goalPoint; }
      }
    }
    if (v.type === 'tank') {
      v.fireT -= dt;
      const tv = n.gvTarget, tc = n.target && n.tgtVisible ? n.target : null;
      const aim = tv ? tv.pos.clone().add(new THREE.Vector3(0, 1.2, 0)) : tc ? tc.chest() : null;
      if (aim) { if (aimTurretAt(v, aim, dt) && v.fireT <= 0) { v.gunPitch += rand(-0.02, 0.02); tankFire(v, n); } }
      else v.turretYaw *= Math.exp(-dt);
    }
  } else if (role === 'gun') {
    v.mgT -= dt;
    const tc = n.target && n.tgtVisible ? n.target : null;
    const aim = n.gvTarget && v.type === 'jeep' ? n.gvTarget.pos.clone().add(new THREE.Vector3(0, 1.2, 0)) : tc ? tc.chest() : n.planeTarget ? n.planeTarget.pos.clone() : null;
    if (aim) {
      n.burstT = (n.burstT || 0) - dt;
      if (aimMGAt(v, aim, dt) && v.mgT <= 0 && n.burstT < 0.9) { vehicleMG(v, mgDir(v), n); if (n.burstT < 0) n.burstT = rand(1.2, 2.2); }
    } else v.mgYaw += wrapAngle(v.yaw - v.mgYaw) * dt;
  } else {
    const drv = driverOf(v);
    if (!drv && Math.abs(v.speed) < 1) { n.alone = (n.alone || 0) + dt; if (n.alone > 2) { n.alone = 0; leaveSeat(n); } }
  }
}
// should this soldier hop into a vehicle?
function npcConsiderVehicle(n) {
  if (n.gv || n.turret || n.mountTarget || !n.goalPoint || n.tplan) return;
  if (simTime < (n.noVehT || 0)) return;
  if (n.vehTarget) {
    const v = n.vehTarget;
    if (!v.alive || v.remote || freeSeat(v) < 0 || Math.abs(v.speed) > 2) n.vehTarget = null;
    return;
  }
  const far = Math.hypot(n.goalPoint.x - n.pos.x, n.goalPoint.z - n.pos.z) > 160;
  for (const v of gvehicles) {
    if (!v.alive || v.team !== n.team || v.remote || Math.abs(v.speed) > 1) continue;
    const d = v.pos.distanceTo(n.pos);
    if (v.type === 'quad' && v.spawn.y !== undefined && !(driverOf(v) && driverOf(v).isPlayer)) continue;
    if ((v.T.heli || (v.T.boat && !WAKE)) && !(driverOf(v) && (driverOf(v).isPlayer || driverOf(v).isRemote))) continue;   // on Wake Island soldiers take the boats
    if (d > 45) continue;
    const drv = driverOf(v);
    if (drv && drv.isPlayer) { if (d < 25 && freeSeat(v, 1) > 0 && Math.random() < 0.5) { n.vehTarget = v; return; } continue; }
    if (!far && !(v.type === 'tank' && n.role === 'rifle' && !drv && Math.random() < 0.3)) continue;
    if (drv && v.aiGoal && v.aiGoal !== n.goalPoint) continue;
    if (Math.hypot(n.goalPoint.x - v.pos.x, n.goalPoint.z - v.pos.z) < 160 && v.type !== 'tank') continue;
    if (freeSeat(v) < 0) continue;
    n.vehTarget = v; return;
  }
}
function npcBoard(n) {
  const v = n.vehTarget; n.vehTarget = null;
  if (!v || !v.alive || Math.abs(v.speed) > 2) return;
  let seat = -1;
  if (!v.seats[0] && !v.remote && !v.T.heli && !v.T.boat) seat = 0;
  else { for (let i = 1; i < v.seats.length; i++) if (!v.seats[i] && v.T.seats[i].role === 'gun') { seat = i; break; } if (seat < 0) seat = freeSeat(v); }
  if (seat < 0) return;
  enterSeat(n, v, seat);
  if (seat === 0) v.aiGoal = n.goalPoint;
}
// put everyone sitting in vehicles in the right place and pose
function updateOccupants() {
  for (const c of chars) {
    if (!c.gv) continue;
    const v = c.gv, S = v.T.seats[c.seat];
    if (!S) { leaveSeat(c, true); continue; }   // a bad seat number must never stop everyone else being placed
    const p = seatWorld(v, c.seat);
    if (S.pose === 'stand') c.pos.set(p.x, p.y - 1.0, p.z); else c.pos.set(p.x, p.y - 0.95, p.z);
    const m = c.isPlayer ? player.body3p : c.model; if (!m) continue;
    m.root.visible = c.alive && S.pose !== 'hide' && !(c.isPlayer && S.role === 'gun');
    m.root.position.copy(c.pos);
    limbsStraight(m); m.body.rotation.x = 0;
    if (S.role === 'gun') { m.root.rotation.set(0, v.mgYaw + Math.PI, 0); m.armR.rotation.set(-Math.PI / 2 - v.mgPitch, 0, 0); m.armL.rotation.set(-Math.PI / 2 - v.mgPitch, 0.3, 0); m.legL.rotation.x = 0; m.legR.rotation.x = 0; m.gun.visible = false; }
    else if (S.pose === 'bike') {
      m.root.rotation.set(v.pitch, v.yaw + Math.PI, -v.roll, 'YXZ');
      m.legL.rotation.set(-1.0, 0, -0.3); m.legR.rotation.set(-1.0, 0, 0.3); m.shinL.rotation.x = m.shinR.rotation.x = 1.5;
      m.armR.rotation.set(-1.25, 0, 0.12); m.armL.rotation.set(-1.25, 0, -0.12); m.body.rotation.x = S.role === 'drive' ? 0.25 : 0.1; m.gun.visible = false;
    } else {
      m.root.rotation.set(v.pitch * (S.side ? 0 : 1), v.yaw + Math.PI + (S.side ? S.side * Math.PI / 2 : 0), 0);
      m.legL.rotation.set(-1.45, 0, 0); m.legR.rotation.set(-1.45, 0, 0); m.shinL.rotation.x = m.shinR.rotation.x = 1.35;
      if (S.role === 'drive') { m.armR.rotation.set(-1.1, 0, 0); m.armL.rotation.set(-1.1, 0, 0); m.gun.visible = false; }
      else { poseGun(m, 0, 1, 0); m.gun.visible = true; }
    }
  }
}
const _brakeInp = { thr: 0, steer: 0, brake: true };
function updateGroundVehicles(dt) {
  const host = !net.active || net.isHost;
  for (const v of gvehicles) {
    if (!v.alive) { if (host) { v.respawnT -= dt; if (v.respawnT <= 0) resetVehicle(v); } continue; }
    const drv = driverOf(v);
    if (drv === player) { /* driven in updatePlayer */ }
    else if (v.remote) { /* pose comes from that player */ }
    else if (host) {
      // a parked vehicle that has come to rest sleeps until something moves or hits it
      const resting = !drv && !v.T.boat && Math.abs(v.speed) < 0.02 && !v.airborne && (v.rotorSpin || 0) < 0.01 && !occupants(v).length;
      v.restT = resting ? (v.restT || 0) + dt : 0;
      if (v.restT > 1.5) {
        v.idleT += dt;
        if (v.idleT > 120 && Math.hypot(v.pos.x - v.spawn.x, v.pos.z - v.spawn.z) > 60 && v.pos.distanceTo(player.pos) > 80) { resetVehicle(v); placeVehicleModel(v); }
        continue;
      }
      if (!drv || drv.isRemote) moveVehicle(v, dt, _brakeInp);
      if (!drv && occupants(v).length === 0) { v.idleT += dt; } else v.idleT = 0;
      // abandoned far from base for a long time: send it back
      if (v.idleT > 120 && Math.hypot(v.pos.x - v.spawn.x, v.pos.z - v.spawn.z) > 60 && v.pos.distanceTo(player.pos) > 80) resetVehicle(v);
    }
    placeVehicleModel(v);
  }
  spinRotors(dt);
}
