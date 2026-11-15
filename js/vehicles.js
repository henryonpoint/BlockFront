// ===================== vehicles.js : turrets and planes =====================
const turrets = [];
function makeTurret(x, z, type, yaw) {
  const y = heightAt(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); scene.add(g);
  const sb = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.8, 10), MATS.sandbagShort); sb.position.y = 0.4; g.add(sb);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 8), MATS.steel); ped.position.y = 1.2; g.add(ped);
  const yawG = new THREE.Group(); yawG.position.y = 1.65; g.add(yawG);
  const pitchG = new THREE.Group(); yawG.add(pitchG);
  const muzzle = new THREE.Object3D();
  if (type === 'mg') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 1.0), MATS.black); b.position.z = -0.2; pitchG.add(b);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.1, 8), MATS.steel); br.rotation.x = Math.PI / 2; br.position.z = -1.2; pitchG.add(br);
    const sh = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.75, 0.07), MATS.olive); sh.position.set(0, 0.05, -0.55); pitchG.add(sh);
    const ammo = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.35), MATS.olive); ammo.position.set(0.3, -0.05, -0.15); pitchG.add(ammo);
    for (const s of [-0.18, 0.18]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), MATS.black); h.position.set(s, -0.05, 0.35); pitchG.add(h); }
    muzzle.position.set(0, 0, -1.8);
  } else {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.3), MATS.olive); pod.position.z = -0.2; pitchG.add(pod);
    for (const [dx, dy] of [[-0.24, -0.18], [0.24, -0.18], [-0.24, 0.18], [0.24, 0.18]]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 10), MATS.black); t.rotation.x = Math.PI / 2; t.position.set(dx, dy, -0.86); pitchG.add(t); }
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.3), MATS.black); sight.position.set(-0.6, 0.25, 0); pitchG.add(sight);
    muzzle.position.set(0, 0, -1.1);
  }
  pitchG.add(muzzle);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  solidMeshes.push(sb); addCircle(x, z, 1.4, y + 0.8);
  const t = { type, g, yawG, pitchG, muzzle, x, z, y, yaw, pitch: 0, user: null, fireT: 0, idleT: 0 };
  turrets.push(t);
  return t;
}
function turretSeat(t) { return new THREE.Vector3(t.x + Math.sin(t.yaw) * 1.25, t.y, t.z + Math.cos(t.yaw) * 1.25); }
function turretDir(t) { return new THREE.Vector3(-Math.sin(t.yaw) * Math.cos(t.pitch), Math.sin(t.pitch), -Math.cos(t.yaw) * Math.cos(t.pitch)); }
function turretFire(t, dir, shooter) {
  t.muzzle.getWorldPosition(_tmpV);
  const origin = _tmpV.clone();
  if (t.type === 'mg') {
    t.fireT = 0.08;
    const d = dir.clone().add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(0.012)).normalize();
    const hit = rayHit(origin, d, 300, shooter.team, { player: shooter.team !== player.team });
    const end = hit ? hit.point : origin.clone().addScaledVector(d, 300);
    shootTracer(origin, end, 0xffd27a, 320, 0.05, () => applyHit(hit, d, { dmg: 19, force: 6 }, shooter));
    netShot(origin, end, 1);
    playAt('mg', origin);
    flashLight.position.copy(origin); flashLight.intensity = Math.max(flashLight.intensity, 1.2);
  } else {
    t.fireT = 2.4;
    spawnRocket(origin.addScaledVector(dir, 0.6), dir, shooter, { speed: 55, homing: true, dmg: 160, radius: 7 });
    playAt('rocket', origin);
  }
}
const _tmpV = new THREE.Vector3();
function buildTurrets() {
  for (const p of points) {
    makeTurret(p.x + 3, p.z - 7.5, 'mg', 0);
    makeTurret(p.x - 3, p.z + 7.5, 'mg', Math.PI);
  }
  makeTurret(-8, 8, 'launcher', Math.PI / 4);
  makeTurret(PD.B.x - 6, PD.B.z, 'launcher', Math.PI / 2);
  makeTurret(PD.D.x + 6, PD.D.z, 'launcher', -Math.PI / 2);
  for (const t of TEAMS) {
    if (WAKE && t === 'blue') continue;   // the carrier gets its own guns
    const B = BASES[t], s = teamSide(t), f = s > 0 ? 0 : Math.PI;
    makeTurret(B.x - 12, B.z - s * 22, 'launcher', f);
    makeTurret(B.x + 12, B.z - s * 22, 'mg', f);
    if (RUNWAYS[t]) makeTurret(RUNWAYS[t].x, RUNWAYS[t].z - s * 16, 'launcher', f);
  }
}
function updateTurretVisual(t) { t.yawG.rotation.y = t.yaw - (t.user ? 0 : 0); t.pitchG.rotation.x = t.pitch; }

// ---------- planes ----------
const planes = [];
function makePlaneModel(team) {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhongMaterial({ color: TEAM_COLOR[team], shininess: 30 });
  const light = new THREE.MeshPhongMaterial({ color: team === 'blue' ? 0xb7cdf2 : 0xf2bdbd, shininess: 30 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
  const R = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.85, 0.82, 4.2, 14), paint, 0, 0, -1.4, R);           // front fuselage
  add(new THREE.CylinderGeometry(0.82, 0.25, 4.6, 14), paint, 0, 0.12, 2.9, -R);        // tapered tail boom
  add(new THREE.CylinderGeometry(0.88, 0.85, 1.0, 16), MATS.steel, 0, 0, -3.9, R);       // engine cowling
  add(new THREE.ConeGeometry(0.32, 0.7, 12), MATS.black, 0, 0, -4.75, -R);              // spinner
  const prop = new THREE.Group(); prop.position.z = -4.55; g.add(prop);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.8, 0.06), MATS.black); b.position.y = 0.9; const arm = new THREE.Group(); arm.rotation.z = i * Math.PI * 2 / 3; arm.add(b); prop.add(arm); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.8, 24), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); prop.add(disc);
  const canopy = add(new THREE.SphereGeometry(0.62, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0x9fd3f5, shininess: 90, transparent: true, opacity: 0.8 }), 0, 0.6, -0.6);
  canopy.scale.set(1, 0.9, 1.9);
  for (const s of [-1, 1]) {
    const wing = add(new THREE.BoxGeometry(5.6, 0.22, 2.1), light, s * 3.4, -0.3, -1.3, 0, 0, s * 0.05);
    add(new THREE.CylinderGeometry(1.05, 1.05, 0.22, 16, 1, false, 0, Math.PI), light, s * 6.2, -0.3 + 0.15, -1.3, 0, s > 0 ? Math.PI : 0, s * 0.05).rotation.order = 'YXZ';
    add(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 16), MATS.white, s * 4.0, -0.14, -1.3);
    add(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 16), paint, s * 4.0, -0.12, -1.3);
    add(new THREE.CylinderGeometry(0.08, 0.06, 1.1, 6), MATS.black, s * 1.5, -0.95, -1.5);
    add(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 14), MATS.black, s * 1.5, -1.45, -1.5, 0, 0, R);
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), MATS.black, s * 2.4, -0.3, -2.7, R);
  }
  add(new THREE.BoxGeometry(4.2, 0.16, 1.2), light, 0, 0.25, 4.6);
  add(new THREE.BoxGeometry(0.16, 1.7, 1.4), paint, 0, 1.0, 4.7, 0.25);
  add(new THREE.SphereGeometry(0.18, 8, 6), MATS.black, 0, -0.55, 4.9);
  const bomb = add(new THREE.SphereGeometry(0.3, 10, 8), MATS.black, 0, -1.0, -1.2); bomb.scale.z = 2.4;
  // the rear gunner's seat: a ring mount behind the canopy with a twin machine gun
  add(new THREE.CylinderGeometry(0.5, 0.55, 0.22, 14), MATS.steel, 0, 0.9, 1.05);
  const gunYaw = new THREE.Group(); gunYaw.position.set(0, 1.05, 1.05); g.add(gunYaw);
  const gunPitch = new THREE.Group(); gunYaw.add(gunPitch);
  for (const sx of [-0.1, 0.1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.1, 6), MATS.black); b.rotation.x = Math.PI / 2; b.position.set(sx, 0.05, -0.55); gunPitch.add(b); }
  const gb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.4), MATS.steel); gb.position.set(0, 0.05, 0); gunPitch.add(gb);
  scene.add(g);
  g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  return { g, prop, bomb, canopy, gunYaw, gunPitch };
}
function makePlane(team, x, z, yaw, wait, kind) {
  const K = (typeof PLANE_KINDS !== 'undefined' && PLANE_KINDS[kind]) || null;
  const m = K ? K.model(team) : makePlaneModel(team);
  const pl = { idx: planes.length, team, model: m, kind: kind || 'prop', spdMul: K ? K.spd : 1, maxBombs: K ? K.bombs : 1, bombRegenT: K ? K.regen : 25, bombBig: !!(K && K.bombBig), pos: new THREE.Vector3(), quat: new THREE.Quaternion(), speed: 0, throttle: 0, hp: K ? K.hp : 320, maxHp: K ? K.hp : 320, alive: true,
    pilot: null, remote: null, onGround: true, spawn: { x, z, yaw }, gunT: 0, bombs: 1, bombT: 0, bombRegen: 0, respawnT: 0, waitT: wait,
    aiYaw: yaw, aiPitch: 0, aiBank: 0, groundYaw: yaw, wp: null, wpT: 0, smokeT: 0, lastAttacker: null, inP: 0, inR: 0, inY: 0 };
  resetPlane(pl, wait);
  planes.push(pl);
  return pl;
}
function resetPlane(pl, wait = 6) {
  if (pl.homeTeam) pl.team = pl.homeTeam;
  if (pl.parked) wait = 1e9;   // spawned from the console: stays parked for a player
  pl.alive = true; pl.hp = pl.maxHp; pl.speed = 0; pl.throttle = 0; pl.onGround = true; pl.bombs = pl.maxBombs || 1; pl.waitT = wait;
  pl.groundYaw = pl.aiYaw = pl.spawn.yaw; pl.aiPitch = 0; pl.aiBank = 0; pl.wp = null;
  pl.pos.set(pl.spawn.x, heightAt(pl.spawn.x, pl.spawn.z) + 1.6, pl.spawn.z);
  pl.quat.setFromEuler(new THREE.Euler(0, pl.spawn.yaw, 0, 'YXZ'));
  pl.model.g.visible = true; pl.model.bomb.visible = true;
  pl.model.g.position.copy(pl.pos); pl.model.g.quaternion.copy(pl.quat);
}
function buildPlanes() {
  [[30, 6], [52, 30], [70, 55]].forEach(([off, wait]) => makePlane('blue', RUNWAYS.blue.x + off, RUNWAYS.blue.z, Math.PI / 2, wait));
  [[-30, 6], [-52, 30], [-70, 55]].forEach(([off, wait]) => makePlane('red', RUNWAYS.red.x + off, RUNWAYS.red.z, -Math.PI / 2, wait));
}
function aimPlaneGun(pl, yaw, pitch) {
  if (!pl.model.gunYaw) return;
  const d = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)).applyQuaternion(pl.quat.clone().invert());
  pl.model.gunYaw.rotation.y = Math.atan2(-d.x, -d.z); pl.model.gunPitch.rotation.x = Math.asin(clamp(d.y, -1, 1));
}
function planeFwd(pl) { return new THREE.Vector3(0, 0, -1).applyQuaternion(pl.quat); }
function planeShooter(pl) { return pl.aiPilot || (pl.aiPilot = { team: pl.team, name: teamName(pl.team) + ' pilot', isPlayer: false, kills: 0, pos: pl.pos }); }
function damagePlane(pl, amt, attacker) {
  if (!pl.alive) return;
  if (attacker && attacker.isPlayer) showHitmarker(false);
  if (netPlaneHit(pl, amt, attacker)) return;
  pl.hp -= amt; pl.lastAttacker = attacker;
  if (pl.pilot === player) showHitDir(attacker && attacker.pos);
  if (pl.hp <= 0) destroyPlane(pl, attacker);
}
function destroyPlane(pl, attacker) {
  if (!pl.alive) return;
  pl.alive = false; pl.model.g.visible = false; pl.respawnT = 10;
  const pos = pl.pos.clone();
  explosion(pos, 8, 30, attacker && attacker.team !== pl.team ? attacker : null, 90);
  burst(pos, 24, TEAM_COLOR[pl.team], 18, 2.5, 0.4);
  if (attacker === player && attacker.team !== pl.team) addMoney(300, 'Plane destroyed');
  netPlaneDown(pl, attacker);
  if (!net.active || net.isHost) addKillfeed(attacker && attacker !== pl.pilot ? attacker : null, { name: teamName(pl.team) + ' plane', team: pl.team }, false);
  if (pl.pilot) { const p = pl.pilot; pl.pilot = null; p.vehicle = null; if (p.alive) kill(p, attacker && attacker !== p ? attacker : null, new THREE.Vector3(0, 1, 0), 10); }
  if (pl.gunner) { const g = pl.gunner; pl.gunner = null; g.planeGun = null; if (g.alive) kill(g, attacker && attacker !== g ? attacker : null, new THREE.Vector3(0, 1, 0), 10); }
}
function planeGroundCheck(pl) {
  const gh = heightAt(pl.pos.x, pl.pos.z);
  const fwd = planeFwd(pl), right = new THREE.Vector3(1, 0, 0).applyQuaternion(pl.quat);
  if (pl.pos.y - 1.6 < gh) {
    const gentle = pl.speed < 40 && fwd.y > -0.22 && fwd.y < 0.4 && Math.abs(right.y) < 0.35;
    if (gentle) { pl.onGround = true; pl.groundYaw = Math.atan2(-fwd.x, -fwd.z); pl.pos.y = gh + 1.6; return true; }
    destroyPlane(pl, pl.lastAttacker); return false;
  }
  for (const o of nearbyColliders(pl.pos.x, pl.pos.z)) {
    if (o.kind === 'box') { if (pl.pos.x > o.minX - 1 && pl.pos.x < o.maxX + 1 && pl.pos.z > o.minZ - 1 && pl.pos.z < o.maxZ + 1 && pl.pos.y - 1 < o.maxY) { destroyPlane(pl, pl.lastAttacker); return false; } }
    else if (Math.hypot(pl.pos.x - o.x, pl.pos.z - o.z) < o.r + 1.5 && pl.pos.y - 1 < o.top) { destroyPlane(pl, pl.lastAttacker); return false; }
  }
  return true;
}
function planeGuns(pl, shooter, accurate) {
  pl.gunT = 0.07;
  const fwd = planeFwd(pl), right = new THREE.Vector3(1, 0, 0).applyQuaternion(pl.quat);
  for (const s of [-1, 1]) {
    const o = pl.pos.clone().addScaledVector(right, s * 2.4).addScaledVector(fwd, 2);
    const d = fwd.clone().add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(accurate ? 0.012 : 0.035)).normalize();
    const hit = rayHit(o, d, 320, pl.team, { player: pl.team !== player.team, ignorePlane: pl });
    const end = hit ? hit.point : o.clone().addScaledVector(d, 320);
    shootTracer(o, end, 0xffd060, 380, 0.06, () => applyHit(hit, d, { dmg: 20, force: 8 }, shooter));
    netShot(o, end, 2);
  }
  playAt('mg', pl.pos, 0.8);
}
function planeBomb(pl, shooter) {
  if (pl.bombs <= 0 || pl.bombT > 0) return;
  pl.bombs--; pl.bombT = 0.5; pl.model.bomb.visible = pl.bombs > 0;
  if (pl === player.vehicle || pl.pos.distanceTo(camera.position) < 140) sfxBombDrop();
  const v = planeFwd(pl).multiplyScalar(pl.speed * 0.9);
  spawnBall(pl.pos.clone().add(new THREE.Vector3(0, -1.6, 0)), v, shooter, { type: 'bomb', bomb: true, r: 0.32, mass: 25, fuse: 14, color: 0x30343a, radius: pl.bombBig ? 28 : 20, dmg: pl.bombBig ? 340 : 260, power: 95, impact: true });   // big plane bombs: wide blast, and they leave a crater
  playAt('thump', pl.pos, 0.7);
  if (pl.pilot === player) showMessage(pl.bombs > 0 ? `Bomb away! ${pl.bombs} left` : `Bomb away! Next bomb loads in ${pl.bombRegenT || 25} seconds`, 2);
}
function planeTick(pl, dt) {
  pl.model.prop.rotation.z += (5 + pl.speed) * dt;
  if (pl.hp < pl.maxHp * 0.45) { pl.smokeT -= dt; if (pl.smokeT <= 0) { pl.smokeT = 0.05; smokePuff(pl.pos.clone(), pl.hp < pl.maxHp * 0.2 ? 0x222222 : 0x777777, 0.6, 1.6, 0.2); } }
  if (pl.bombs < (pl.maxBombs || 1)) { pl.bombRegen += dt; if (pl.bombRegen > (pl.bombRegenT || 25)) { pl.bombRegen = 0; pl.bombs++; pl.model.bomb.visible = true; if (pl.pilot === player) showMessage('Bomb loaded', 1.5); } }
  pl.bombT -= dt; pl.gunT -= dt;
}

// ----- player flying (keyboard) -----
// ----- cockpit view with easy flying -----
// V switches between the chase camera and sitting in the cockpit. In the cockpit the plane flies where you look:
// move the mouse to put the crosshair where you want to go and the plane banks and turns there by itself.
// W/S and A/D still nudge it. It keeps itself from stalling, levels its wings, and pulls up before hitting the
// ground (unless the throttle is low, which means you are coming in to land).
let planeView = 'chase';
let _cockpit = null;
function cockpitModel() {
  if (_cockpit) return _cockpit;
  const P = new Part(), frame = 0x2a2d31, dash = 0x1d1f22;   // the pilot sits high, eyes at (0, 1.6, -0.3), so the view stays open
  P.box(1.1, 0.16, 0.34, dash, 0, 1.0, -1.3);                                     // a low, slim dashboard
  P.box(1.14, 0.04, 0.4, frame, 0, 1.09, -1.32);
  for (const [x, y] of [[-0.33, 1.02], [-0.11, 1.03], [0.11, 1.03], [0.33, 1.02]]) {
    P.cyl(0.055, 0.055, 0.025, 0xf2f2ee, x, y, -1.12, Math.PI / 2, 0, 0, 1, 14);  // dials
    P.box(0.009, 0.04, 0.01, 0xd8262a, x, y + 0.014, -1.105);                     // needles
  }
  P.box(0.025, 0.36, 0.025, frame, -0.62, 1.22, -1.55, 0, 0, -0.35); P.box(0.025, 0.36, 0.025, frame, 0.62, 1.22, -1.55, 0, 0, 0.35);   // thin windscreen posts, low and wide
  const g = new THREE.Group(); g.add(new THREE.Mesh(P.build(), new THREE.MeshLambertMaterial({ vertexColors: true })));
  g.visible = false; _cockpit = g; return g;
}
function setPlaneView(v) {
  planeView = v; const pl = player.vehicle;
  const c = cockpitModel();
  if (pl) { pl.model.g.add(c); c.visible = v === 'cockpit'; const e = new THREE.Euler().setFromQuaternion(pl.quat, 'YXZ'); pl.aimYaw = e.y; pl.aimPitch = clamp(e.x, -0.6, 0.6); }
  else c.visible = false;
  try { localStorage.setItem('bf_planeView', v); } catch (e) { }
}
function togglePlaneView() {
  setPlaneView(planeView === 'chase' ? 'cockpit' : 'chase');
  showMessage(planeView === 'cockpit' ? 'Cockpit view: the plane flies where you look. Move the mouse to steer. V for the outside view' : 'Outside view: W/S pitch, A/D roll. V for the cockpit', 3);
}
try { if (localStorage.getItem('bf_planeView') === 'cockpit') planeView = 'cockpit'; } catch (e) { }
const _eE = new THREE.Euler();
function easyFly(pl, dt) {
  // keys nudge where you are aiming, so they work alongside the mouse
  const pitchIn = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0), turnIn = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + ((keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0)) * 0.5;
  if (pl.aimYaw === undefined) { _eE.setFromQuaternion(pl.quat, 'YXZ'); pl.aimYaw = _eE.y; pl.aimPitch = _eE.x; }
  pl.aimYaw -= turnIn * 0.9 * dt; pl.aimPitch = clamp(pl.aimPitch + pitchIn * 0.7 * dt, -0.9, 0.9);
  _eE.setFromQuaternion(pl.quat, 'YXZ');
  let yaw = _eE.y, pitch = _eE.x, roll = _eE.z;
  const ctrl = clamp(pl.speed / 28, 0.3, 1);
  // turn towards the aim, banking into the turn like a real plane, and level out when on course
  const err = wrapAngle(pl.aimYaw - yaw), yawRate = clamp(err * 1.6, -0.95, 0.95) * ctrl;
  yaw += yawRate * dt;
  roll += (clamp(yawRate * 1.15, -1.05, 1.05) - roll) * Math.min(1, dt * 3);   // lean into the turn: turning right drops the right wing
  // nose towards the aim; a slow plane can't climb steeply (stall protection)
  const maxUp = pl.speed < 26 ? 0.15 : 0.7;
  let wantPitch = clamp(pl.aimPitch, -0.75, maxUp);
  // ground warning: look ahead and pull up early (skipped when the throttle is low: you are landing)
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  let ground = skyAt(pl.pos.x, pl.pos.z); for (const d of [20, 45, 80, 130]) ground = Math.max(ground, skyAt(pl.pos.x + fx * d, pl.pos.z + fz * d));
  const clear = pl.pos.y - ground, landing = pl.throttle < 0.3 && pl.speed < 38;
  pl.pullUp = false;
  if (!landing && clear < 28) { wantPitch = Math.max(wantPitch, clamp((28 - clear) / 28, 0.15, 0.6)); pl.pullUp = true; }
  pitch += clamp(wantPitch - pitch, -1.1 * dt, 1.1 * dt) * ctrl;
  pl.quat.setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));
  // keep enough speed to stay up
  if (pl.speed < 24 && !landing) pl.throttle = Math.max(pl.throttle, 0.85);
  const f = planeFwd(pl);
  pl.pos.addScaledVector(f, pl.speed * dt);
  pl.pos.y -= (1 - clamp(pl.speed / 26, 0, 1)) * 8 * dt;
  if (!landing) { const need = skyAt(pl.pos.x, pl.pos.z) + 6 - pl.pos.y; if (need > 0) pl.pos.y += Math.min(need, 25 * dt); }   // last-moment save
  if (pl.pos.y > 260) pl.pos.y = 260;
  if (Math.max(Math.abs(pl.pos.x), Math.abs(pl.pos.z)) > HALF + 40) { pl.aimYaw = Math.atan2(pl.pos.x, pl.pos.z); showMessage('Return to the battlefield!', 0.5); }
}
function updatePlayerPlane(pl, dt) {
  const up = keys.ShiftLeft || keys.ShiftRight || keys.ArrowUp, down = keys.KeyC || keys.ArrowDown;
  pl.throttle = clamp(pl.throttle + ((up ? 1 : 0) - (down ? 1 : 0)) * dt * 0.7, 0, 1);
  const pitchIn = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
  const rollIn = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const yawIn = (keys.KeyQ ? 1 : 0) - (keys.KeyE ? 1 : 0);
  pl.inP = lerp(pl.inP, pitchIn, Math.min(1, dt * 5)); pl.inR = lerp(pl.inR, rollIn, Math.min(1, dt * 5)); pl.inY = lerp(pl.inY, yawIn, Math.min(1, dt * 5));
  const fwd = planeFwd(pl);
  pl.speed += (pl.throttle * 52 * (pl.spdMul || 1) - pl.speed) * dt * 0.4;
  if (!pl.onGround) pl.speed -= fwd.y * 10 * dt;
  pl.speed = clamp(pl.speed, 0, 70 * (pl.spdMul || 1));
  if (pl.onGround) {
    if (pl.throttle < 0.05 || down) pl.speed = Math.max(0, pl.speed - 14 * dt);
    pl.groundYaw += (-pl.inR + pl.inY) * 0.9 * dt * clamp(pl.speed / 10, 0.3, 1);
    pl.quat.setFromEuler(new THREE.Euler(0, pl.groundYaw, 0, 'YXZ'));
    pl.pos.addScaledVector(planeFwd(pl), pl.speed * dt);
    pl.pos.y = heightAt(pl.pos.x, pl.pos.z) + 1.6;
    if (pl.speed > 24 && (pitchIn > 0 || (planeView === 'cockpit' && pl.aimPitch > 0.12))) { pl.onGround = false; pl.aimPitch = Math.max(pl.aimPitch || 0, 0.25); pl.quat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0, 0))); pl.pos.y += 0.5; }
    for (const o of nearbyColliders(pl.pos.x, pl.pos.z)) if (o.kind === 'box' && pl.pos.x > o.minX - 1 && pl.pos.x < o.maxX + 1 && pl.pos.z > o.minZ - 1 && pl.pos.z < o.maxZ + 1 && pl.pos.y - 1.5 < o.maxY) { if (pl.speed > 15) { destroyPlane(pl, null); return; } pl.speed = 0; }
  } else if (planeView === 'cockpit') {
    easyFly(pl, dt);
    if (!planeGroundCheck(pl)) return;
  } else {
    const ctrl = clamp(pl.speed / 30, 0.15, 1);
    let right = new THREE.Vector3(1, 0, 0).applyQuaternion(pl.quat);
    let rollRate = -pl.inR * 1.5;
    if (Math.abs(rollIn) < 0.01) rollRate += -right.y * 1.3;   // wings slowly level themselves
    const pitchRate = pl.inP * 0.8, yawRate = pl.inY * 0.5;
    pl.quat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(pitchRate * dt * ctrl, yawRate * dt * ctrl, rollRate * dt * ctrl, 'XYZ')));
    right = new THREE.Vector3(1, 0, 0).applyQuaternion(pl.quat);
    pl.quat.premultiply(new THREE.Quaternion().setFromAxisAngle(UPV, right.y * 1.2 * dt * ctrl));
    if (pl.speed < 20) pl.quat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-(20 - pl.speed) / 20 * 0.5 * dt, 0, 0)));
    pl.quat.normalize();
    const f = planeFwd(pl);
    pl.pos.addScaledVector(f, pl.speed * dt);
    pl.pos.y -= (1 - clamp(pl.speed / 26, 0, 1)) * 12 * dt;
    if (pl.pos.y > 260) pl.pos.y = 260;
    if (Math.max(Math.abs(pl.pos.x), Math.abs(pl.pos.z)) > HALF + 40) {
      const toC = Math.atan2(pl.pos.x, pl.pos.z), cur = Math.atan2(-f.x, -f.z);
      pl.quat.premultiply(new THREE.Quaternion().setFromAxisAngle(UPV, clamp(wrapAngle(toC - cur), -1, 1) * dt));
      showMessage('Return to the battlefield!', 0.5);
    }
    if (!planeGroundCheck(pl)) return;
  }
  if ((mouse.left || keys.Space) && pl.gunT <= 0) planeGuns(pl, player, true);
  if ((mouse.right || keys.KeyX) && !pl.onGround) planeBomb(pl, player);
  planeTick(pl, dt);
  if (planeView === 'cockpit' && typeof cockpitCamera === 'function') cockpitCamera(pl);
}

// ----- AI flying -----
function chooseAIWaypoint(pl) {
  const foes = planes.filter(p => p.alive && p.team !== pl.team && !p.onGround && p.pos.distanceTo(pl.pos) < 320);
  if (foes.length && (Math.random() < 0.5 || pl.bombs === 0)) { pl.wp = { plane: pick(foes) }; pl.wpT = 10; return; }
  let cands = points.filter(p => (p.owner && p.owner !== pl.team) || foesIn(p, pl.team) > 0);
  if (!cands.length) cands = points.filter(p => p.owner !== pl.team);
  if (!cands.length) cands = points;
  const p = pick(cands);
  pl.wp = { x: p.x, z: p.z, point: p, alt: heightAt(p.x, p.z) + 60 }; pl.wpT = 30;
}
function updateAIPlane(pl, dt) {
  if (pl.onGround) {
    if (pl.waitT > 0) { pl.waitT -= dt; pl.speed = 0; planeTick(pl, dt); return; }
    pl.speed += 16 * dt;
    pl.quat.setFromEuler(new THREE.Euler(0, pl.groundYaw, 0, 'YXZ'));
    pl.pos.addScaledVector(planeFwd(pl), pl.speed * dt);
    pl.pos.y = heightAt(pl.pos.x, pl.pos.z) + 1.6;
    if (pl.speed > 28) { pl.onGround = false; pl.aiYaw = pl.groundYaw; pl.aiPitch = 0.3; pl.climbT = 5; }
    planeTick(pl, dt); return;
  }
  pl.wpT -= dt;
  if (!pl.wp || pl.wpT <= 0 || (pl.wp.plane && !pl.wp.plane.alive)) chooseAIWaypoint(pl);
  let tx, ty, tz;
  if (pl.wp.plane) { const t = pl.wp.plane; tx = t.pos.x; ty = t.pos.y; tz = t.pos.z; }
  else { tx = pl.wp.x; tz = pl.wp.z; ty = pl.wp.alt; }
  const dx = tx - pl.pos.x, dz = tz - pl.pos.z, hd = Math.hypot(dx, dz);
  let desiredYaw = Math.atan2(-dx, -dz);
  if (Math.abs(pl.pos.x) > EDGE - 70 || Math.abs(pl.pos.z) > EDGE - 70) desiredYaw = Math.atan2(pl.pos.x, pl.pos.z);   // near the border: head back towards the middle
  if (pl.climbT > 0) { pl.climbT -= dt; if (pl.pos.y - skyAt(pl.pos.x, pl.pos.z) < 45) desiredYaw = pl.aiYaw; else pl.climbT = 0; }   // just took off: climb straight out before turning
  if (!pl.wp.plane && hd < 40) desiredYaw = pl.aiYaw;
  const err = wrapAngle(desiredYaw - pl.aiYaw);
  const yawRate = clamp(err * 1.1, -0.6, 0.6);
  pl.aiYaw += yawRate * dt;
  pl.aiBank = lerp(pl.aiBank, yawRate * 1.4, dt * 2);
  // look well ahead along the flight path; climb hard and turn away from mountains early
  const fx0 = -Math.sin(pl.aiYaw), fz0 = -Math.cos(pl.aiYaw);
  let ahead = skyAt(pl.pos.x, pl.pos.z), near = ahead;
  for (const d of [30, 60, 100, 150, 210, 280]) { const hh = skyAt(pl.pos.x + fx0 * d, pl.pos.z + fz0 * d); ahead = Math.max(ahead, hh); if (d <= 210) near = Math.max(near, hh); }
  const floor = ahead + (SNOW ? 58 : 42);
  const below = skyAt(pl.pos.x, pl.pos.z);
  const danger = near - below > 5 && pl.pos.y - near < 48;   // only ground that rises ahead counts, not the runway under you
  if (danger) {                                  // terrain close ahead: bank towards whichever side is lower (never out past the border)
    const side = (a) => { const x = pl.pos.x - Math.sin(pl.aiYaw + a) * 150, z = pl.pos.z - Math.cos(pl.aiYaw + a) * 150; return skyAt(x, z) + (Math.abs(x) > EDGE - 40 || Math.abs(z) > EDGE - 40 ? 300 : 0); };
    pl.aiYaw += (side(0.8) < side(-0.8) ? 1 : -1) * (pl.pos.y - near < 18 ? 1.5 : 0.8) * dt;
  }
  const wantY = Math.max(ty, floor);
  const wantPitch = clamp(Math.atan2(wantY - pl.pos.y, Math.max(hd, 60)), -0.3, danger ? 0.75 : 0.5);
  pl.aiPitch = lerp(pl.aiPitch, wantPitch, dt * (danger ? 3 : 1.5));
  pl.quat.setFromEuler(new THREE.Euler(pl.aiPitch, pl.aiYaw, pl.aiBank, 'YXZ'));
  pl.speed = lerp(pl.speed, 42, dt * 0.5);
  pl.pos.addScaledVector(planeFwd(pl), pl.speed * dt);
  // last-moment pull up: never fly into the ground just ahead
  { let g = skyAt(pl.pos.x, pl.pos.z); for (const d of [15, 35, 60]) g = Math.max(g, skyAt(pl.pos.x + fx0 * d, pl.pos.z + fz0 * d)); const need = g + 12 - pl.pos.y; if (need > 0) { pl.pos.y += Math.min(need, 30 * dt); pl.aiPitch = Math.max(pl.aiPitch, 0.5); } }
  const shooter = planeShooter(pl);
  if (!pl.wp.plane && pl.wp.point && pl.bombs > 0) {
    const alt = pl.pos.y - heightAt(tx, tz);
    const fall = Math.sqrt(2 * Math.max(alt, 5) / 20), lead = pl.speed * fall * 0.9;
    const fx = -Math.sin(pl.aiYaw), fz = -Math.cos(pl.aiYaw);
    const along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
    if (Math.abs(along - lead) < 18 && side < 14) planeBomb(pl, shooter);
  }
  if (pl.gunT <= 0) {
    for (const o of planes) {
      if (!o.alive || o.team === pl.team || o.onGround) continue;
      const to = o.pos.clone().sub(pl.pos), d = to.length();
      if (d < 200 && to.normalize().dot(planeFwd(pl)) > 0.97) { planeGuns(pl, shooter, false); break; }
    }
  }
  planeTick(pl, dt);
  planeGroundCheck(pl);
}
function updatePlanes(dt) {
  for (const pl of planes) {
    if (pl.remote) { if (pl.alive) { pl.model.g.position.copy(pl.pos); pl.model.g.quaternion.copy(pl.quat); pl.model.prop.rotation.z += (5 + pl.speed) * dt; } continue; }
    if (!pl.alive) { if (!net.active || net.isHost) { pl.respawnT -= dt; if (pl.respawnT <= 0) resetPlane(pl); } continue; }
    if (pl.pilot === player) updatePlayerPlane(pl, dt);
    else if (net.active && !net.isHost) { pl.model.prop.rotation.z += (5 + pl.speed) * dt; }
    else if (pl.pilot === null) updateAIPlane(pl, dt);
    if (!pl.alive) continue;
    pl.model.g.position.copy(pl.pos); pl.model.g.quaternion.copy(pl.quat);
  }
}
