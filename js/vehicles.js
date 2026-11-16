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
  if (ZD30) return;   // no gun posts on the raid
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
    if (RUNWAYS[t] && !RUNWAYS[t].carrier) makeTurret(RUNWAYS[t].x, RUNWAYS[t].z - s * 16, 'launcher', f);
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
  pl.alive = true; pl.hp = pl.maxHp; pl.speed = 0; pl.throttle = 0; pl.onGround = true; pl.bombs = pl.maxBombs !== undefined ? pl.maxBombs : 1; pl.waitT = wait;
  pl.groundYaw = pl.aiYaw = pl.spawn.yaw; pl.aiPitch = 0; pl.aiBank = 0; pl.wp = null;
  pl.pos.set(pl.spawn.x, heightAt(pl.spawn.x, pl.spawn.z) + 1.6, pl.spawn.z);
  pl.quat.setFromEuler(new THREE.Euler(0, pl.spawn.yaw, 0, 'YXZ'));
  planeBodyVisible(pl, true); pl.model.g.visible = true; pl.model.bomb.visible = true;
  if (!pl.parked && wait < 1e8 && (DOGFIGHT || (RUNWAYS[pl.team] && RUNWAYS[pl.team].carrier))) {   /* a plane dropped from the cheat menu (parked) waits on the ground, even in a dogfight */   // straight into the air (dogfights, and planes launched from a carrier), flying towards the enemy
    pl.onGround = false; pl.waitT = 0; pl.pos.set(pl.spawn.x, Math.max(130, skyAt(pl.spawn.x, pl.spawn.z) + 90) + (pl.idx % 4) * 14, pl.spawn.z);   /* always well above the hills */
    pl.speed = 45 * (pl.spdMul || 1); pl.throttle = 1; pl.aiYaw = pl.spawn.yaw; pl.aiPitch = 0; pl.climbT = 0;
    pl.quat.setFromEuler(new THREE.Euler(0, pl.spawn.yaw, 0, 'YXZ'));
  }
  pl.model.g.position.copy(pl.pos); pl.model.g.quaternion.copy(pl.quat);
}
function buildPlanes() {
  if (ZD30) return;   // no airfield
  if (DOGFIGHT) {   // the dogfight: a squadron per team, starting in the air (players take over a plane when they deploy)
    for (const t of ['blue', 'red']) for (let i = 0; i < 9; i++) {
      const B = BASES[t], s = teamSide(t), kind = JETFIGHT ? (i % 2 ? 'f22' : 'f18') : WWIFIGHT ? (t === 'red' ? 'triplane' : 'biplane') : 'prop';
      makePlane(t, B.x + (i - 4) * 45, B.z - s * 120, s > 0 ? 0 : Math.PI, 0, kind);
    }
    return;
  }
  const HK = { blue: ['f18', 'harrier', 'f22'], red: ['f22', 'harrier', 'f18'] };   /* Houston: modern jets, and a Harrier each */
  [[30, 6], [52, 30], [70, 55]].forEach(([off, wait], i) => makePlane('blue', RUNWAYS.blue.x + off, RUNWAYS.blue.z, RUNWAYS.blue.carrier ? 0 : Math.PI / 2, wait, HOUSTON ? HK.blue[i] : AFGHAN ? 'f18' : undefined));
  [[-30, 6], [-52, 30], [-70, 55]].forEach(([off, wait], i) => makePlane('red', RUNWAYS.red.x + off, RUNWAYS.red.z, -Math.PI / 2, wait, HOUSTON ? HK.red[i] : AFGHAN ? 'f18' : undefined));   /* Desert Combat: modern jets */
  if (NORMANDY) {   // a big air battle over the beach: more fighters on both sides, up quickly
    [[8, 1], [-14, 12]].forEach(([off, wait]) => makePlane('blue', RUNWAYS.blue.x + off, RUNWAYS.blue.z, 0, wait));
    [[-8, 1], [14, 12]].forEach(([off, wait]) => makePlane('red', RUNWAYS.red.x + off, RUNWAYS.red.z, -Math.PI / 2, wait));
  }
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
  const pos = pl.pos.clone(), crash = pos.y - heightAt(pos.x, pos.z) < 8;
  explosion(pos, crash ? 14 : 10, crash ? 60 : 30, attacker && attacker.team !== pl.team ? attacker : null, crash ? 160 : 110);
  burst(pos, 24, TEAM_COLOR[pl.team], 18, 2.5, 0.4); burst(pos, 40, 0xffa030, 24, 1.2, 0.6); burst(pos, 26, 0x2a2a2a, 14, 2.8, 0.35);   // fireball and flying wreckage
  for (let i = 0; i < 10; i++) smokePuff(pos.clone().add(new THREE.Vector3(rand(-3, 3), rand(0, 6), rand(-3, 3))), i < 4 ? 0xff8a30 : 0x2e2e2e, rand(2, 4), rand(2, 4), 3);
  if (crash) { const g = new THREE.Vector3(pos.x, heightAt(pos.x, pos.z), pos.z); if (typeof makeCrater === 'function') makeCrater(g, 16); if (typeof addFire === 'function') addFire(g); camShake = Math.max(camShake, clamp(0.3 - camera.position.distanceTo(g) / 400, 0, 0.3)); }
  if (attacker === player && attacker.team !== pl.team) addMoney(300, 'Plane destroyed');
  netPlaneDown(pl, attacker);
  if (!net.active || net.isHost) addKillfeed(attacker && attacker !== pl.pilot ? attacker : null, { name: teamName(pl.team) + ' plane', team: pl.team }, false);
  if (DOGFIGHT && !pl.pilot && attacker && attacker.team && attacker.team !== pl.team && (!net.active || net.isHost)) { teamKills[attacker.team]++; if (attacker.kills !== undefined) attacker.kills++; }   // computer planes count in a dogfight
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
// the player's aim assist: the enemy plane nearest the nose, and where it will be when the bullets get there
function planeLeadTarget(pl, maxAng = 0.26, range = 520) {
  const f = planeFwd(pl); let best = null, bs = Infinity;
  for (const t of planes) {
    if (t === pl || !t.alive || t.team === pl.team || t.onGround) continue;
    const v = t.pos.clone().sub(pl.pos), d = v.length(); if (d > range || d < 6) continue;
    const ang = Math.acos(clamp(v.dot(f) / d, -1, 1)); if (ang > maxAng) continue;
    if (ang * 300 + d * 0.2 < bs) { bs = ang * 300 + d * 0.2; best = t; }
  }
  if (!best) return null;
  const d = best.pos.distanceTo(pl.pos), lead = best.pos.clone().addScaledVector(planeFwd(best), best.speed * d / 380);
  return { t: best, lead };
}
function planeGuns(pl, shooter, accurate) {
  pl.gunT = 0.07;
  const fwd = planeFwd(pl), right = new THREE.Vector3(1, 0, 0).applyQuaternion(pl.quat);
  const lock = shooter === player ? planeLeadTarget(pl) : null;   // bullets bend towards the enemy in front of you
  for (const s of [-1, 1]) {
    const o = pl.pos.clone().addScaledVector(right, s * 2.4).addScaledVector(fwd, 2);
    const aim = lock ? lock.lead.clone().sub(o).normalize() : fwd.clone();
    const d = aim.add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(lock ? 0.006 : accurate ? 0.012 : (DOGFIGHT ? 0.05 : 0.035))).normalize();
    let hit = rayHit(o, d, 520, pl.team, { player: pl.team !== player.team, ignorePlane: pl });
    if (lock && (!hit || !hit.plane) && Math.random() < 0.6) hit = { plane: lock.t, point: lock.t.pos.clone() };   // a near miss on the locked plane still counts most of the time
    const end = hit ? hit.point : o.clone().addScaledVector(d, 320);
    shootTracer(o, end, 0xffd060, 380, 0.06, () => applyHit(hit, d, { dmg: shooter === player ? 24 * (pl.gunMul || 1) : DOGFIGHT ? 8 : 20, force: 8 }, shooter));   // computer pilots hit softer in a dogfight
    netShot(o, end, 2);
  }
  playAt('mg', pl.pos, 0.8);
}
function planeBomb(pl, shooter) {
  if (pl.bombs <= 0 || pl.bombT > 0) return;
  pl.bombs--; pl.bombT = 0.5; pl.model.bomb.visible = pl.bombs > 0;
  if (pl === player.vehicle || pl.pos.distanceTo(camera.position) < 140) sfxBombDrop();
  if (pl.kind === 'stealth' && typeof dropNuke === 'function') {   // the stealth bomber drops a mini nuke on a parachute
    const f = planeFwd(pl); f.y = 0; f.normalize(); const ahead = Math.min(4, Math.sqrt(2 * Math.max(5, pl.pos.y - heightAt(pl.pos.x, pl.pos.z)) / 20)) * pl.speed;
    const at = new THREE.Vector3(clamp(pl.pos.x + f.x * ahead, -EDGE, EDGE), 0, clamp(pl.pos.z + f.z * ahead, -EDGE, EDGE));
    dropNuke(at, shooter, false, true); if (typeof netFx === 'function') netFx(['nk', teamIdx(pl.team), +at.x.toFixed(1), +at.z.toFixed(1), 1]);   // a MEGA nuke
    if (pl.pilot === player) showMessage(pl.bombs > 0 ? `MEGA NUKE AWAY! Get clear! ${pl.bombs} left` : `NUKE AWAY! Get clear! Next one loads in ${pl.bombRegenT} seconds`, 3);
    return;
  }
  const v = planeFwd(pl).multiplyScalar(pl.speed * 0.9);
  spawnBall(pl.pos.clone().add(new THREE.Vector3(0, -1.6, 0)), v, shooter, { type: 'bomb', bomb: true, r: 0.32, mass: 25, fuse: 14, color: 0x30343a, radius: pl.bombBig ? 28 : 20, dmg: pl.bombBig ? 340 : 260, power: 95, impact: true });   // big plane bombs: wide blast, and they leave a crater
  playAt('thump', pl.pos, 0.7);
  if (pl.pilot === player) showMessage(pl.bombs > 0 ? `Bomb away! ${pl.bombs} left` : `Bomb away! Next bomb loads in ${pl.bombRegenT || 25} seconds`, 2);
}
// guided missile from a modern fighter: locks onto the enemy aircraft in the red diamond nearest the nose
function missileTarget(pl) {
  const f = planeFwd(pl); let best = null, bs = Infinity;
  const list = planes.filter(p => p !== pl && p.alive && p.team !== pl.team && !p.onGround).concat(gvehicles.filter(v => v.alive && v.T.heli && v.team !== pl.team && v.airborne));
  for (const t of list) { const v = t.pos.clone().sub(pl.pos), d = v.length(); if (d > 900 || d < 15) continue; const ang = Math.acos(clamp(v.dot(f) / d, -1, 1)); if (ang > 0.6) continue; const sc = ang * 400 + d * 0.3; if (sc < bs) { bs = sc; best = t; } }
  return best;
}
function planeMissile(pl) {
  if ((pl.missileT || 0) > 0) return;
  pl.missileT = 1.4;
  const t = pl.locked ? pl.lockTgt : null, f = planeFwd(pl), side = (pl.mSide = -(pl.mSide || 1));
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(pl.quat), from = pl.pos.clone().addScaledVector(right, side * 2.6).add(new THREE.Vector3(0, -0.4, 0)).addScaledVector(f, 2);
  spawnRocket(from, t ? t.pos.clone().sub(from).normalize() : f, player, { speed: 160, homing: true, dmg: 420, radius: 6 });
  const pr = projectiles[projectiles.length - 1]; if (pr) { pr.target = t || null; pr.life = 6; }
  showMessage(t ? 'FOX TWO! Missile locked on and tracking' : 'Missile away (no lock: keep an enemy near your nose to lock on)', 1.6);
}
function planeTick(pl, dt) {
  if (pl.missileT > 0) pl.missileT -= dt;
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
let cockpitFull = false;   // the third view: the full cockpit, with dashboard, dials, gunsight and canopy frame
// each kind of plane has its own cockpit, built like the real one. tub: floor, walls, seat, stick and the nose ahead
// (shown in both cockpit views); full: the dashboard, sights and canopy frame (the full cockpit view only)
const _cockpits = {};
function cockpitStyle(pl) { const k = pl && (pl.kind === 'harrier' ? 'f18' : pl.kind); return k === 'triplane' || k === 'biplane' ? k : k === 'f18' || k === 'f22' || k === 'stealth' ? k : 'prop'; }
function cockpitModel() {
  const st = cockpitStyle(player.vehicle || (_cockpit && { kind: _cockpit.userData.style }));
  if (_cockpit && _cockpit.userData.style === st) return _cockpit;
  if (_cockpit) { _cockpit.visible = false; if (_cockpit.parent) _cockpit.parent.remove(_cockpit); }
  _cockpit = _cockpits[st] || (_cockpits[st] = buildCockpit(st));
  _cockpit.full.visible = cockpitFull; return _cockpit;
}
function buildCockpit(st) {
  const g = new THREE.Group(); g.userData.cockpit = true; g.userData.style = st;
  const T = new Part(), P = new Part(), G = new Part();   // tub, full cockpit, glowing screens and lamps
  const glassMat = new THREE.MeshPhongMaterial({ color: st === 'f22' ? 0xd8c078 : 0x9fd8ff, transparent: true, opacity: st === 'f22' ? 0.1 : 0.16, shininess: 120, depthWrite: false });
  const glass = [];   // [w, h, x, y, z, rx]
  const dial = (Q, x, y, z, r, face = 0xf2f2ee, rim = 0x111111) => { Q.cyl(r, r, 0.02, face, x, y, z, Math.PI / 2, 0, 0, 1, 14); Q.cyl(r * 1.15, r * 1.15, 0.015, rim, x, y, z - 0.006, Math.PI / 2, 0, 0, 1, 14); Q.box(r * 0.14, r * 0.8, 0.01, 0xd8262a, x, y + r * 0.3, z + 0.012); };
  const screen = (x, y, z, w, h, col) => { P.box(w + 0.04, h + 0.04, 0.03, 0x111316, x, y, z - 0.02); G.box(w, h, 0.01, 0x0a1a12, x, y, z); for (let i = 0; i < 4; i++) G.box(w * (0.4 + (i % 3) * 0.15), 0.012, 0.012, col, x - w * 0.15, y + h * 0.3 - i * h * 0.18, z + 0.008); G.box(w * 0.2, h * 0.2, 0.012, col, x + w * 0.25, y - h * 0.15, z + 0.008); };
  const ww1 = st === 'triplane' || st === 'biplane', jet = st === 'f18' || st === 'f22';
  if (ww1) {
    // an open cockpit: doped linen sides, a padded leather rim, a little wooden panel, twin guns on the nose and a
    // ring sight, the top wing overhead held up by struts
    const linen = st === 'triplane' ? 0xb8221a : 0x8c7a4c, wood = 0x6b4a2a, leather = 0x3a2416, brass = 0xc8a040, wing = st === 'triplane' ? 0xc42a20 : 0xd9ceb0;
    T.box(1.1, 0.05, 2.2, wood, 0, 0.5, -0.3); for (const s of [-1, 1]) { T.box(0.05, 0.6, 2.4, linen, s * 0.58, 0.78, -0.3); T.box(0.16, 0.1, 1.6, leather, s * 0.55, 1.1, -0.1); }
    T.box(1.2, 0.1, 0.16, leather, 0, 1.1, -0.95); T.box(1.2, 0.1, 0.16, leather, 0, 1.1, 0.75);                         // padded rim round the opening
    T.box(0.55, 0.08, 0.5, 0x8a6a40, 0, 0.62, 0.35); T.box(0.55, 0.55, 0.08, 0x8a6a40, 0, 0.9, 0.62);                     // wicker seat
    T.box(0.04, 0.45, 0.04, 0x2a2a2a, 0, 0.78, -0.4); T.box(0.2, 0.04, 0.05, 0x2a2a2a, 0, 1.0, -0.4);                      // stick with a spade grip
    T.box(0.7, 0.05, 0.08, wood, 0, 0.56, -1.3);                                                                     // rudder bar
    T.cyl(0.62, 0.68, 2.6, linen, 0, 0.55, -2.3, -Math.PI / 2, 0, 0, 1, 14); T.cyl(0.7, 0.7, 0.5, 0x7a7c80, 0, 0.55, -3.7, Math.PI / 2, 0, 0, 1, 16);   // fuselage and engine cowl ahead
    for (const x of [-0.18, 0.18]) { T.cyl(0.06, 0.06, 1.3, 0x1a1a1a, x, 1.17, -1.6, Math.PI / 2, 0, 0, 1, 8); T.box(0.12, 0.12, 0.35, 0x2a2a2a, x, 1.15, -0.95); }   // twin guns
    T.add(new THREE.TorusGeometry(0.11, 0.008, 4, 16), 0x1a1a1a, 0, 1.36, -1.15); T.box(0.01, 0.12, 0.01, 0x1a1a1a, 0, 1.3, -1.15); T.box(0.02, 0.05, 0.02, 0x1a1a1a, 0, 1.3, -2.2);   // ring and bead sight
    T.box(7.4, 0.08, 1.3, wing, 0, st === 'triplane' ? 2.05 : 2.25, -0.95);                                           // top wing overhead
    for (const s of [-1, 1]) { T.box(0.05, 1.2, 0.05, 0x2b2c2a, s * 0.45, 1.55, -1.35); T.box(0.05, 1.2, 0.05, 0x2b2c2a, s * 0.45, 1.55, -0.55); }   // cabane struts
    P.box(0.9, 0.3, 0.05, wood, 0, 0.92, -0.85); for (const [x, y] of [[-0.25, 0.94], [0, 0.97], [0.25, 0.94]]) dial(P, x, y, -0.82, 0.05, 0xf0e6c8, brass);   // little wooden panel, brass dials
    glass.push([0.5, 0.18, 0, 1.24, -1.05, -0.5]);                                                                     // tiny windscreen
  } else if (st === 'prop') {
    // a WW2 fighter: green-grey interior, a black panel crowded with round dials, a reflector gunsight, a heavily framed canopy
    const zinc = 0x5a6a52, blk = 0x1a1a1a, frame = 0x3a4038, paint = 0x55606a;
    T.box(1.2, 0.05, 2.4, 0x3a3e38, 0, 0.5, -0.35); for (const s of [-1, 1]) { T.box(0.05, 0.6, 2.4, zinc, s * 0.62, 0.8, -0.35); T.box(0.2, 0.06, 1.0, zinc, s * 0.5, 0.92, 0.1); T.box(0.05, 0.14, 0.05, 0xd8c040, s * 0.48, 1.0, -0.2); }
    T.box(1.22, 0.5, 0.06, zinc, 0, 0.78, -1.5); T.box(0.6, 0.1, 0.55, 0x4a3a2a, 0, 0.6, 0.35); T.box(0.7, 0.85, 0.08, 0x2a2e2a, 0, 1.05, 0.66);   // seat with an armour plate
    T.box(0.04, 0.42, 0.04, blk, 0, 0.76, -0.45); T.box(0.1, 0.14, 0.08, blk, 0, 1.0, -0.45); T.box(0.03, 0.03, 0.06, 0xc02020, 0.04, 1.06, -0.47);   // stick with a red gun button
    T.cyl(0.38, 0.66, 3.2, paint, 0, 0.52, -3.0, -Math.PI / 2, 0, 0, 1, 16); for (const s of [-1, 1]) for (let i = 0; i < 4; i++) T.box(0.1, 0.06, 0.14, 0x2a2622, s * 0.5, 0.75, -2.0 - i * 0.3);   // long nose, exhaust stubs
    P.box(1.1, 0.34, 0.05, blk, 0, 0.92, -0.86); P.box(1.14, 0.05, 0.3, 0x2a2a2a, 0, 1.1, -0.98);                       // black panel, glare shield
    for (const [x, y] of [[-0.42, 1.0], [-0.26, 1.0], [-0.1, 1.0], [0.1, 1.0], [0.26, 1.0], [0.42, 1.0], [-0.34, 0.86], [-0.17, 0.86], [0.17, 0.86], [0.34, 0.86], [0, 0.85]]) dial(P, x, y, -0.83, 0.05);
    P.box(0.06, 0.12, 0.08, blk, 0, 1.17, -1.0); glass.push([0.16, 0.13, 0, 1.3, -1.0, -0.4]);                          // reflector gunsight
    for (const s of [-1, 1]) { P.box(0.04, 0.55, 0.04, frame, s * 0.42, 1.35, -1.12, -0.5, 0, s * 0.35); P.box(0.04, 0.04, 1.8, frame, s * 0.6, 1.12, -0.2); }
    P.box(0.04, 0.5, 0.04, frame, 0, 1.36, -1.18, -0.55, 0, 0);                                                         // centre windscreen post
    for (const z of [-0.65, -0.05, 0.5]) P.add(new THREE.TorusGeometry(0.6, 0.02, 5, 20, Math.PI), frame, 0, 1.12, z);   // canopy bars over your head
    P.box(0.04, 0.04, 1.4, frame, 0, 1.72, -0.1);
    glass.push([0.82, 0.5, 0, 1.33, -1.15, -0.55]);
  } else if (jet) {
    // a modern jet: dark grey, glass screens, a head-up display, a bubble canopy with almost no frame
    const F22 = st === 'f22', grey = 0x2a2e33, cons = 0x1e2125, frame = 0x1c1e22;
    T.box(1.2, 0.05, 2.4, 0x202326, 0, 0.5, -0.35);
    for (const s of [-1, 1]) {
      T.box(0.05, 0.55, 2.4, grey, s * 0.62, 0.78, -0.35); T.box(0.26, 0.06, 1.2, cons, s * 0.48, 0.92, 0.05);
      for (let i = 0; i < 6; i++) T.box(0.05, 0.02, 0.05, [0xd8d8d8, 0xd8c040, 0x808080][i % 3], s * (0.42 + (i % 2) * 0.08), 0.955, -0.4 + Math.floor(i / 2) * 0.2);
    }
    T.box(1.22, 0.5, 0.06, grey, 0, 0.78, -1.5);
    T.box(0.6, 0.12, 0.55, 0x2a2a2a, 0, 0.62, 0.35); T.box(0.62, 0.95, 0.12, 0x2a2a2a, 0, 1.08, 0.66); T.box(0.3, 0.06, 0.05, 0xd8c040, 0, 1.58, 0.6);   // ejection seat with its yellow handle
    if (F22) { T.box(0.05, 0.16, 0.05, 0x111111, 0.48, 1.02, -0.25); T.box(0.07, 0.08, 0.08, 0x111111, 0.48, 1.12, -0.27); }   // side stick on the right console
    else { T.box(0.04, 0.42, 0.04, 0x111111, 0, 0.76, -0.45); T.box(0.09, 0.14, 0.08, 0x111111, 0, 1.0, -0.45); }      // centre stick
    T.box(0.08, 0.12, 0.2, 0x111111, -0.48, 1.0, -0.05);                                                              // throttle
    T.cyl(0.08, 0.6, 3.6, F22 ? 0x6e747c : 0x8d96a0, 0, 0.52, -3.3, -Math.PI / 2, 0, 0, 1, F22 ? 6 : 16);           // the long pointed nose
    P.box(1.1, 0.36, 0.06, 0x16181b, 0, 0.9, -0.86); P.box(1.14, 0.05, 0.32, frame, 0, 1.1, -0.98);                    // panel, glare shield
    if (F22) { screen(0, 0.9, -0.82, 0.42, 0.3, 0x7dffb0); screen(-0.38, 0.92, -0.82, 0.22, 0.22, 0xffc060); screen(0.38, 0.92, -0.82, 0.22, 0.22, 0x7dd0ff); }   // big touch screens
    else { screen(-0.32, 0.92, -0.82, 0.22, 0.22, 0x7dffb0); screen(0.32, 0.92, -0.82, 0.22, 0.22, 0x7dffb0); screen(0, 0.86, -0.82, 0.24, 0.2, 0xffc060); P.box(0.3, 0.1, 0.04, 0x16181b, 0, 1.03, -0.86); for (let i = 0; i < 5; i++) G.box(0.035, 0.03, 0.01, 0x7dffb0, -0.1 + i * 0.05, 1.03, -0.835); }   // three screens, up-front keypad
    P.box(0.03, 0.12, 0.03, frame, -0.1, 1.17, -1.0); P.box(0.03, 0.12, 0.03, frame, 0.1, 1.17, -1.0); glass.push([0.26, 0.2, 0, 1.3, -1.0, -0.3]);   // head-up display glass
    if (!F22) for (const s of [-1, 1]) P.box(0.03, 0.5, 0.03, frame, s * 0.46, 1.32, -1.25, -0.6, 0, s * 0.3);           // slim windscreen bow (the F-22's canopy has none)
    for (const s of [-1, 1]) P.box(0.03, 0.03, 1.8, frame, s * 0.6, 1.1, -0.25);
    P.add(new THREE.TorusGeometry(0.62, 0.016, 5, 24, Math.PI), frame, 0, 1.1, 0.6);                                   // canopy frame far behind your head
  } else {
    // the stealth bomber: a wide two-seat flight deck under a roof, small angled windows, screens and two sticks
    const grey = 0x2e3236, frame = 0x1c1e22;
    T.box(2.4, 0.05, 2.4, 0x222428, 0.55, 0.5, -0.35); for (const x of [-0.65, 1.75]) T.box(0.05, 0.6, 2.4, grey, x, 0.8, -0.35);
    for (const x of [0, 1.1]) { T.box(0.6, 0.12, 0.55, 0x2a2a2a, x, 0.62, 0.35); T.box(0.62, 0.95, 0.12, 0x2a2a2a, x, 1.08, 0.66); T.box(0.04, 0.4, 0.04, 0x111111, x, 0.76, -0.45); T.box(0.09, 0.14, 0.08, 0x111111, x, 0.98, -0.45); }
    T.box(0.3, 0.2, 1.0, 0x1e2125, 0.55, 0.62, -0.2); for (let i = 0; i < 4; i++) T.box(0.05, 0.12, 0.05, 0x111111, 0.45 + i * 0.07, 0.78, -0.4);   // centre console with four throttles
    T.box(2.4, 0.5, 0.06, grey, 0.55, 0.78, -1.5); T.box(6, 0.12, 3, 0x3c4047, 0.55, 0.6, -3.2, 0.12, 0, 0);          // the wide flat wing ahead, sloping away
    P.box(2.3, 0.4, 0.06, 0x16181b, 0.55, 0.9, -0.86); P.box(2.36, 0.05, 0.32, frame, 0.55, 1.12, -0.98);
    for (const x of [-0.3, 0.2, 0.9, 1.4]) screen(x, 0.92, -0.82, 0.3, 0.24, x < 0.5 ? 0x7dffb0 : 0xffc060);
    P.box(2.4, 0.06, 2.0, grey, 0.55, 1.95, -0.2); for (let i = 0; i < 8; i++) G.box(0.04, 0.02, 0.04, i % 3 ? 0x7dffb0 : 0xffc060, -0.2 + i * 0.2, 1.915, -0.5);   // the roof with its overhead switches
    for (const x of [-0.62, 0.42, 0.78, 1.72]) P.box(0.035, 0.85, 0.035, frame, x, 1.55, -1.1, -0.55, 0, 0);            // slim posts between the windows, none in front of your sight
    glass.push([2.3, 0.7, 0.55, 1.55, -1.12, -0.55]);
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const tub = new THREE.Mesh(T.build(), mat); g.add(tub); g.tub = tub;
  const full = new THREE.Group(); g.add(full); g.full = full; full.visible = false;
  full.add(new THREE.Mesh(P.build(), mat)); if (G.pos.length) full.add(new THREE.Mesh(G.build(), new THREE.MeshBasicMaterial({ vertexColors: true })));
  for (const [w, h, x, y, z, rx] of glass) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat); m.position.set(x, y, z); m.rotation.x = rx; m.renderOrder = 6; full.add(m); }
  g.visible = false; return g;
}
// the plane's own body is hidden from its pilot in cockpit view (it only blocked the view)
function planeBodyVisible(pl, on) { for (const o of pl.model.g.children) if (!o.userData.cockpit) o.visible = on; if (!on && pl.model.bomb) pl.model.bomb.visible = false; }
function setPlaneView(v) {
  planeView = v; const pl = player.vehicle;
  const c = cockpitModel();
  if (pl) { pl.model.g.add(c); c.visible = v === 'cockpit' && cockpitFull; planeBodyVisible(pl, v !== 'cockpit'); const e = new THREE.Euler().setFromQuaternion(pl.quat, 'YXZ'); pl.aimYaw = e.y; pl.aimPitch = clamp(e.x, -0.6, 0.6); }
  else c.visible = false;
  try { localStorage.setItem('bf_planeView', v); } catch (e) { }
}
function togglePlaneView() {   // V: outside view, then the open cockpit, then the full cockpit
  if (planeView === 'chase') { cockpitFull = false; setPlaneView('cockpit'); }
  else if (!cockpitFull) cockpitFull = true;
  else { cockpitFull = false; setPlaneView('chase'); }
  cockpitModel().full.visible = planeView === 'cockpit' && cockpitFull; cockpitModel().visible = planeView === 'cockpit' && cockpitFull;
  showMessage(planeView !== 'cockpit' ? 'Outside view: W/S pitch, A/D roll. V for the cockpit' : cockpitFull ? 'Full cockpit view. V for the outside view' : 'Open cockpit view: the plane flies where you look. V for the full cockpit', 3);
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
  // like a real plane: roll into the bank first, and the bank is what turns the plane (more bank, tighter turn)
  // every rate eases in and out (no snapping), so turns, rolls and pull-ups feel smooth
  const err = wrapAngle(pl.aimYaw - yaw), k = (r) => Math.min(1, dt * r);
  const wantRoll = clamp(err * 1.6, -1.1, 1.1);
  pl.rollV = (pl.rollV || 0) + (clamp((wantRoll - roll) * 3, -2.4, 2.4) - (pl.rollV || 0)) * k(6);
  roll += pl.rollV * dt;
  const yawCap = (Math.abs(Math.sin(roll)) * 1.3 + 0.12) * ctrl, wantYawV = clamp(err * 2.4, -yawCap, yawCap);
  pl.yawV = (pl.yawV || 0) + (wantYawV - (pl.yawV || 0)) * k(5);
  yaw += pl.yawV * dt;
  // nose towards the aim; a slow plane can't climb steeply (stall protection)
  const maxUp = pl.speed < 26 ? 0.15 : 0.7;
  let wantPitch = clamp(pl.aimPitch, -0.75, maxUp);
  // ground warning: look ahead and pull up early (skipped when the throttle is low: you are landing)
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  let ground = skyAt(pl.pos.x, pl.pos.z); for (const d of [20, 45, 80, 130]) ground = Math.max(ground, skyAt(pl.pos.x + fx * d, pl.pos.z + fz * d));
  const clear = pl.pos.y - ground, landing = pl.throttle < 0.3 && pl.speed < 38;
  pl.pullUp = false;
  if (!landing && clear < 28) pl.pullUp = true;   /* a warning only: the pilot has to pull up */
  pl.pitchV = (pl.pitchV || 0) + (clamp((wantPitch - pitch) * 2.6, -1.2, 1.2) * ctrl - (pl.pitchV || 0)) * k(pl.pullUp ? 9 : 5);
  pitch += pl.pitchV * dt;
  pl.quat.setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));
  // keep enough speed to stay up
  if (pl.speed < 24 && !landing) pl.throttle = Math.max(pl.throttle, 0.85);
  const f = planeFwd(pl);
  pl.pos.addScaledVector(f, pl.speed * dt);
  pl.pos.y -= (1 - clamp(pl.speed / 26, 0, 1)) * 8 * dt;
  if (pl.pullUp && pl.pilot === player && typeof tn === 'function' && actx) { pl.puT = (pl.puT || 0) - dt; if (pl.puT <= 0) { pl.puT = 0.45; tn('square', 880, 880, 0.12, 0.14); tn('square', 660, 660, 0.12, 0.14, 0.15); } }   // a warning tone; no automatic save
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
  // afterburner (modern jets): keep holding Shift at full throttle; it uses a boost bar that fills back up
  const jetAB = pl.kind === 'f18' || pl.kind === 'f22';
  if (pl.abFuel === undefined) pl.abFuel = 1;
  pl.ab = jetAB && (keys.ShiftLeft || keys.ShiftRight) && pl.throttle >= 0.99 && pl.abFuel > 0.02 && !pl.onGround;
  pl.abFuel = clamp(pl.abFuel + (pl.ab ? -dt / 6 : dt / 14), 0, 1);
  if (pl.model.g.userData.ab) { pl.model.g.userData.ab.visible = pl.ab; if (pl.ab) pl.model.g.userData.ab.scale.set(1, 1, 0.8 + Math.random() * 0.5); }
  if (pl.ab) camShake = Math.max(camShake, 0.01);
  // missile lock: keep an enemy near your nose and it locks on (a beep while locking, a steady tone once locked)
  if ((jetAB || pl.kind === 'harrier') && typeof missileTarget === 'function') {
    const t = missileTarget(pl);
    if (t && t === pl.lockTgt) pl.lockT += dt; else { pl.lockTgt = t; pl.lockT = 0; }
    pl.locked = !!t && pl.lockT >= 1.2;
    pl.beepT = (pl.beepT || 0) - dt;
    if (t && pl.beepT <= 0 && typeof tn === 'function' && typeof actx !== 'undefined' && actx) { pl.beepT = pl.locked ? 0.12 : 0.3; tn('square', pl.locked ? 1650 : 1100, pl.locked ? 1650 : 1100, pl.locked ? 0.1 : 0.07, pl.locked ? 0.16 : 0.11); /* loud enough to hear over the engine */ }
  }
  if (!jetAB && DOGFIGHT && pl.pilot === player && typeof planeLeadTarget === 'function') {   // older planes: a clear double beep when the guns lock onto someone
    const g = planeLeadTarget(pl), had = pl.gunLock; pl.gunLock = g ? g.t : null;
    if (g && g.t !== had && typeof tn === 'function' && actx) { tn('square', 1300, 1300, 0.07, 0.15); tn('square', 1700, 1700, 0.07, 0.15, 0.09); }
  }
  if (pl.kind === 'harrier' && !pl.vtolHint) { pl.vtolHint = true; showMessage('AV-8B Harrier: press J to hover (take off straight up, land anywhere)', 4); }
  if (pl.hover) harrierHover(pl, dt); else {
  pl.speed += (pl.throttle * 52 * (pl.spdMul || 1) * (pl.ab ? 1.6 : 1) - pl.speed) * dt * (pl.ab ? 0.8 : 0.4);
  if (!pl.onGround) pl.speed -= fwd.y * 10 * dt;
  pl.speed = clamp(pl.speed, 0, 70 * (pl.spdMul || 1) * (pl.ab ? 1.6 : 1));
  if (pl.onGround) {
    if (pl.throttle < 0.05 || down) pl.speed = Math.max(0, pl.speed - 14 * dt);
    pl.groundYaw += (-pl.inR + pl.inY) * 0.9 * dt * clamp(pl.speed / 10, 0.3, 1);
    pl.quat.setFromEuler(new THREE.Euler(0, pl.groundYaw, 0, 'YXZ'));
    pl.pos.addScaledVector(planeFwd(pl), pl.speed * dt);
    pl.pos.y = heightAt(pl.pos.x, pl.pos.z) + 1.6;
    if (pl.speed > 24 && (pitchIn > 0 || (planeView === 'cockpit' && pl.aimPitch > 0.12))) { pl.onGround = false; pl.aimPitch = Math.max(pl.aimPitch || 0, 0.25); pl.quat.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0, 0))); pl.pos.y += 0.5; }
    for (const o of nearbyColliders(pl.pos.x, pl.pos.z)) if (o.kind === 'box' && pl.pos.x > o.minX - 1 && pl.pos.x < o.maxX + 1 && pl.pos.z > o.minZ - 1 && pl.pos.z < o.maxZ + 1 && pl.pos.y - 1.5 < o.maxY) { if (pl.speed > 15) { destroyPlane(pl, null); return; } pl.speed = 0; }
  } else if (planeView === 'cockpit' || DOGFIGHT) {   // dogfights use the easy mouse flying in every view
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
  }
  if ((mouse.left || keys.Space) && pl.gunT <= 0) planeGuns(pl, player, true);
  const jet = pl.kind === 'f18' || pl.kind === 'f22' || pl.kind === 'harrier';
  if ((mouse.right || keys.KeyX) && !pl.onGround) { if (jet) planeMissile(pl); else planeBomb(pl, player); }   // modern fighters fire guided missiles
  planeTick(pl, dt);
  if (planeView === 'cockpit' && typeof cockpitCamera === 'function') cockpitCamera(pl);
}

// ----- the Harrier's hover: its nozzles swing down and it hangs in the air like a helicopter -----
// W/S forward and back, A/D turn, Q/E slide sideways, Shift up, C down. J again to swing the nozzles back and fly.
function harrierHover(pl, dt) {
  if (pl.hYaw === undefined) { const e = new THREE.Euler().setFromQuaternion(pl.quat, 'YXZ'); pl.hYaw = e.y; }
  const fwdIn = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), turn = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0), side = (keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0);
  const up = keys.ShiftLeft || keys.ShiftRight || keys.ArrowUp, down = keys.KeyC || keys.ArrowDown;
  pl.hYaw += turn * 1.3 * dt;
  const fx = -Math.sin(pl.hYaw), fz = -Math.cos(pl.hYaw); pl.hv = pl.hv || new THREE.Vector3();
  pl.hv.x = lerp(pl.hv.x, (fx * fwdIn - fz * side) * 16, Math.min(1, dt * 1.8)); pl.hv.z = lerp(pl.hv.z, (fz * fwdIn + fx * side) * 16, Math.min(1, dt * 1.8));
  pl.hv.y = lerp(pl.hv.y, (up ? 8 : 0) - (down ? 8 : 0), Math.min(1, dt * 3));
  pl.pos.addScaledVector(pl.hv, dt);
  const g = Math.max(heightAt(pl.pos.x, pl.pos.z), typeof groundAt === 'function' ? groundAt(pl.pos.x, pl.pos.z) : -99) + 1.6;
  for (const o of nearbyColliders(pl.pos.x, pl.pos.z)) if (o.kind === 'box' && pl.pos.x > o.minX - 1 && pl.pos.x < o.maxX + 1 && pl.pos.z > o.minZ - 1 && pl.pos.z < o.maxZ + 1 && pl.pos.y > o.maxY - 0.5) { if (pl.pos.y < o.maxY + 1.6) { pl.pos.y = o.maxY + 1.6; pl.hv.y = Math.max(0, pl.hv.y); } }   // land on a roof
  if (pl.pos.y < g) { pl.pos.y = g; pl.hv.y = Math.max(0, pl.hv.y); }
  pl.onGround = pl.pos.y <= g + 0.05 && !up;
  if (pl.pos.y > 260) pl.pos.y = 260;
  pl.pos.x = clamp(pl.pos.x, -HALF - 30, HALF + 30); pl.pos.z = clamp(pl.pos.z, -HALF - 30, HALF + 30);
  pl.speed = Math.hypot(pl.hv.x, pl.hv.z); pl.throttle = 0.5;
  pl.quat.setFromEuler(new THREE.Euler(-fwdIn * 0.1, pl.hYaw, -side * 0.14 - turn * 0.06, 'YXZ'));
  if (pl.groundYaw !== undefined) pl.groundYaw = pl.hYaw;
  if (!pl.onGround && Math.random() < dt * 20) smokePuff(new THREE.Vector3(pl.pos.x, g - 1.2, pl.pos.z).add(new THREE.Vector3(rand(-2, 2), 0, rand(-2, 2))), 0xd8d2c4, rand(0.8, 1.6), 0.8, 0.6);   // the jets blasting the ground
}
addEventListener('keydown', e => {
  if (e.code !== 'KeyJ' || e.repeat || typeof player === 'undefined' || !player.vehicle || player.vehicle.kind !== 'harrier') return;
  const pl = player.vehicle;
  if (!pl.hover) { pl.hover = true; pl.hYaw = undefined; pl.hv = planeFwd(pl).multiplyScalar(Math.min(pl.speed, 30) * 0.5); pl.hv.y = pl.onGround ? 4 : 0; pl.onGround = false; showMessage('Hover: W/S move, A/D turn, Q/E slide, Shift up, C down. J to fly', 3); }
  else { pl.hover = false; pl.speed = Math.max(pl.speed, 34); pl.throttle = 1; pl.onGround = false; pl.aimYaw = undefined; pl.quat.setFromEuler(new THREE.Euler(0.05, pl.hYaw || 0, 0, 'YXZ')); showMessage('Nozzles back: flying', 1.5); }
});

// ----- AI flying -----
function chooseAIWaypoint(pl) {
  if (DOGFIGHT) {   // nothing to bomb: always hunt the nearest enemy plane
    let best = null, bd = Infinity; for (const p of planes) if (p.alive && p.team !== pl.team && !p.onGround) { const d = p.pos.distanceTo(pl.pos); if (d < bd) { bd = d; best = p; } }
    if (best) { pl.wp = { plane: best }; pl.wpT = 8; return; }
    { const x = rand(-HALF * 0.6, HALF * 0.6), z = rand(-HALF * 0.6, HALF * 0.6); pl.wp = { x, z, alt: Math.max(140, skyAt(x, z) + 70) }; pl.wpT = 12; return; }
  }
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
  pl.speed = lerp(pl.speed, 42 * (pl.spdMul || 1), dt * 0.5);   // jets fly faster, for the computer too
  pl.pos.addScaledVector(planeFwd(pl), pl.speed * dt);
  // last-moment pull up: never fly into the ground just ahead
  { let g = skyAt(pl.pos.x, pl.pos.z); for (const d of [15, 35, 60]) g = Math.max(g, skyAt(pl.pos.x + fx0 * d, pl.pos.z + fz0 * d)); const need = g + 12 - pl.pos.y; if (need > 0) { pl.pos.y += Math.min(need, 30 * dt); pl.aiPitch = Math.max(pl.aiPitch, 0.5); } }
  const shooter = planeShooter(pl);
  if (!pl.wp.plane && pl.wp.point && pl.bombs > 0 && !pl.parked) {   // computer pilots never fly off with a console plane's bombs or nukes
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
