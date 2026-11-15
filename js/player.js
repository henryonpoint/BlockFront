// ===================== player.js : you! controls, weapons, shop, HUD =====================
const player = new Char(BLUE, true);
Object.assign(player, {
  money: 800, owned: { pistol: true, rifle: true }, ammo: {}, cur: 1, grenades: 2, stickies: 2, nukes: 0, airstrikes: 0, inventory: {}, name: 'Soldier',
  yaw: Math.PI, pitch: -0.05, velY: 0, onGround: true, push: new THREE.Vector3(), parachute: false,
});
function refillAmmo() { WEAPONS.forEach(w => { player.ammo[w.id] = { mag: w.mag, reserve: w.reserve }; }); }
refillAmmo();

const keys = {}, mouse = { left: false, right: false };
const camOrbit = { yaw: 0, pitch: 0, t: 0 };
let playing = false, started = false, locked = false, dragLook = false, uiOpen = null;
const $ = id => document.getElementById(id);

// ---------- weapon state ----------
let pending = -1, switchT = 0, switching = 0, cooldown = 0, kick = 0, flashT = 0, spinSpeed = 0, zoom = false, ads = false, adsT = 0, bloom = 0, reloadLeft = 0, swayX = 0, swayY = 0, bobT = 0;
function curW() { return WEAPONS[player.cur]; }
WEAPONS[player.cur].model.g.visible = true;
function selectWeapon(i) {
  if (i < 0 || i >= WEAPONS.length) return;
  if (!player.owned[WEAPONS[i].id]) { showMessage(`${WEAPONS[i].name} is locked. Buy it in the shop (B)`, 1.5); return; }
  if (i === player.cur && !switching) return;
  pending = i; switching = 1; zoom = false; ads = false; reloadLeft = 0; SFX.click();
}
function startReload() {
  const w = curW(), a = player.ammo[w.id];
  if (reloadLeft > 0 || a.mag >= w.mag || a.reserve <= 0) return;
  reloadLeft = w.reloadT; zoom = false; ads = false; SFX.reload();
}
const _tv = new THREE.Vector3();
function muzzleWorld() {
  const m = curW().model.mz;
  vmHolder.updateMatrixWorld(true); m.getWorldPosition(_tv);
  if (zoom) return camera.position.clone().add(new THREE.Vector3(0, -0.1, 0));
  camera.updateMatrixWorld();
  return camera.localToWorld(_tv.clone());
}
function aimDir(spread) {
  return new THREE.Vector3((Math.random() - 0.5) * 2 * spread, (Math.random() - 0.5) * 2 * spread, -1).normalize().applyQuaternion(camera.quaternion);
}
function fireWeapon(burstShot) {
  const w = curW(), a = player.ammo[w.id];
  if (w.type === 'melee') { cooldown = w.rate; saberSwing(w); return; }
  if (w.type === 'mortar') { cooldown = 0.4; mouse.left = false; openMortarView(); return; }   // the mortar aims from above
  if (a.mag <= 0) { if (a.reserve > 0) startReload(); else { SFX.click(); cooldown = 0.3; } return; }
  a.mag--; player.protUntil = 0;
  cooldown = w.rate; kick += w.recoil;
  SFX[w.sfx]();
  if (w.type === 'hit' && !w.laser) fxCasing();
  w.model.fl.visible = true; flashT = w.laser ? 0.03 : 0.05; w.model.fl.rotation.z = Math.random() * Math.PI;
  if (!w.laser) { flashLight.position.copy(camera.position); flashLight.intensity = Math.max(flashLight.intensity, 1.4); flashLight.distance = 10; }
  const origin = muzzleWorld();
  if (w.type === 'hit') {
    const spread = zoom ? 0 : w.spread * (ads ? 0.3 : 1) * (player.onGround ? 1 : 1.8) * (player.crouch ? 0.6 : 1) * (1 + bloom);
    const speed = w.laser ? 900 : w.id === 'sniper' ? 750 : 430;
    for (let i = 0; i < w.pellets; i++) {
      const dir = aimDir(spread);
      const hit = rayHit(camera.position, dir, 400, player.team);
      const end = hit ? hit.point : camera.position.clone().addScaledVector(dir, 400);
      shootTracer(origin, end, w.tracer, speed, w.laser ? 0.035 : w.pellets > 1 ? 0.018 : 0.026, () => { if (applyHit(hit, dir, w, player)) { showHitmarker(false); SFX.hit(); } });
      if (i === 0 || Math.random() < 0.3) netShot(origin, end, w.laser ? 3 : 0);
    }
    if (typeof scareAnimals === 'function') scareAnimals(player.pos.x, player.pos.z, w.laser ? 25 : 50);
    bloom = Math.min(1.6, bloom + w.recoil * (ads ? 2 : 4));
    player.pitch = clamp(player.pitch + w.recoil * (ads ? 0.1 : 0.16), -1.5, 1.5);
    player.yaw += rand(-1, 1) * w.recoil * 0.05;
    if (w.burst && !burstShot) for (let k = 1; k < w.burst; k++) setTimeout(() => { if (curW() === w && player.alive && !switching && player.ammo[w.id].mag > 0) fireWeapon(true); }, k * 75);   // M16: three-round burst
  } else if (w.type === 'rocket') {
    spawnRocket(origin, aimDir(0), player, { speed: 46, homing: true, dmg: 150, radius: 7 });
    w.model.warhead.visible = false;
    for (let i = 0; i < 5; i++) smokePuff(camera.position.clone().addScaledVector(aimDir(0.3), -3.5), 0xcccccc, 0.25, 0.8);
    camShake = Math.max(camShake, 0.03);
  } else if (w.type === 'grenade') {
    spawnBall(origin, aimDir(0).multiplyScalar(26).add(new THREE.Vector3(0, 3, 0)), player, { type: 'grenade', r: 0.12, mass: 0.8, fuse: 2.0, color: 0x2e7d32, radius: 6.5, dmg: 120, power: 30 });
  }
  if (a.mag === 0 && a.reserve > 0) setTimeout(() => { if (curW() === w) startReload(); }, 200);
}
// lightsaber: a swing that hits everything in a short arc in front of you
function saberSwing(w) {
  w.model.swingT = 1; w.model.swingDir = -(w.model.swingDir || 1);
  if (SFX.saber) SFX.saber();
  const hitChars = new Set(); let any = false;
  for (let i = -3; i <= 3; i++) for (const up of [-0.25, 0, 0.2]) {
    const d = aimDir(0); d.applyAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.22); d.y += up; d.normalize();
    const hit = rayHit(camera.position, d, w.range, player.team);
    if (!hit) continue;
    const key = hit.char || hit.gv || hit.prop || hit.plane || hit.civ || hit.animal || hit.clown || hit.build;
    if (!key || hitChars.has(key)) continue; hitChars.add(key);
    if (applyHit(hit, d, w, player)) any = true;
    burst(hit.point, 6, 0x66c8ff, 4, 0.3, 0.05);
  }
  if (any) { showHitmarker(false); SFX.hit(); }
}
function toggleCrouch(force) {
  player.crouch = force !== undefined ? force : !player.crouch;
  const b = $('tCrouch'); if (b) b.classList.toggle('on', player.crouch);
}
let crouchK = 0;
function throwGrenade() {
  if (player.grenades <= 0) { showMessage('No grenades. Buy more in the shop (B)', 1.2); return; }
  player.grenades--; sfxGrenade();
  const dir = aimDir(0);
  spawnBall(camera.position.clone().addScaledVector(dir, 0.6), dir.multiplyScalar(26).add(new THREE.Vector3(0, 5.5, 0)).add(new THREE.Vector3(player.vel.x, 0, player.vel.z)), player, { type: 'grenade', r: 0.13, mass: 0.6, fuse: 2.8, color: 0x2e7d32, radius: 10.5, dmg: 155, power: 40 });   // longer throw, bigger bang
  SFX.click();
}
function callAirstrike() { openAirstrikeView(); }
// bombs fall in a line through `at`, along direction `yaw`
function airstrikeAt(at, yaw) {
  if (player.airstrikes <= 0) return;
  player.airstrikes--;
  at = at.clone();
  showMessage('Airstrike inbound! Get clear!', 2.5);
  let t = 0;
  const marker = setInterval(() => { smokePuff(at.clone().add(new THREE.Vector3(0, 0.5, 0)), 0xff3b30, 0.6, 2.5, 3); t += 0.15; if (t > 3) clearInterval(marker); }, 150);
  setTimeout(() => {
    for (let i = 0; i < 7; i++) {
      const off = (i - 3) * 6, x = at.x - Math.sin(yaw) * off, z = at.z - Math.cos(yaw) * off;
      setTimeout(() => spawnBall(new THREE.Vector3(x + rand(-1, 1), at.y + 90, z + rand(-1, 1)), new THREE.Vector3(0, -45, 0), player, { type: 'bomb', bomb: true, r: 0.35, mass: 20, fuse: 10, color: 0x30343a, radius: 13, dmg: 180, power: 60, impact: true }), i * 140);
    }
    for (let i = 0; i < 3; i++) setTimeout(() => SFX.rocket(0.5), i * 300);
  }, 3000);
}

// ---------- interaction ----------
function nearestInteract() {
  if (player.vehicle || player.turret || player.gv || player.planeGun) return null;
  let best = null, bd = Infinity;
  for (const t of turrets) {
    if (t.user) continue;
    const s = turretSeat(t), d = Math.hypot(s.x - player.pos.x, s.z - player.pos.z);
    if (d < 2.6 && d < bd) { bd = d; best = { kind: 'turret', t, text: `Press E to use ${t.type === 'mg' ? 'machine gun' : 'rocket launcher'}` }; }
  }
  for (const b of HUB ? [...bunkers, HUB] : bunkers) {
    if (!b.cache) continue;
    const d = Math.hypot(b.cache.x - player.pos.x, b.cache.z - player.pos.z);
    if (d < 2.3 && d < bd && Math.abs(player.pos.y - b.F) < 2) { bd = d; best = { kind: 'cache', b, text: 'Press E to open the supply cache' }; }
  }
  const ti = typeof towerInteract === 'function' ? towerInteract() : null;
  if (ti && ti.d < bd) { bd = ti.d; best = ti; }
  const hi = hatchInteract();
  if (hi) { const d = Math.hypot(hi.h.x - player.pos.x, hi.h.z - player.pos.z); if (d < bd) { bd = d; best = hi; } }
  for (const v of gvehicles) {
    if (!v.alive) continue;
    const d = Math.hypot(v.pos.x - player.pos.x, v.pos.z - player.pos.z);
    if (d > v.T.radius + 2.4 || d >= bd) continue;
    // enemies inside: if it is slow enough to grab and no other player is in it, you can haul them out and take it
    const foes = occupants(v).filter(c => c.team !== player.team);
    if (foes.length) {
      if (Math.abs(v.speed) > 4 || v.remote || foes.some(c => c.isRemote) || (v.T.heli && v.pos.y - heightAt(v.pos.x, v.pos.z) > 3)) continue;
      bd = d; best = { kind: 'gv', v, seat: 0, hijack: true, text: `Press E to hijack the ${teamName(v.team).toLowerCase()} ${v.T.name}` };
      continue;
    }
    const seat = !v.seats[0] && !v.remote ? 0 : freeSeat(v);
    if (seat < 0) continue;
    const role = v.T.seats[seat].role;
    bd = d; best = { kind: 'gv', v, seat, text: `Press E to ${v.team !== player.team ? 'steal' : role === 'drive' ? 'drive' : role === 'gun' ? 'use the gun on' : 'ride in'} the ${v.team !== player.team ? teamName(v.team).toLowerCase() + ' ' : ''}${v.T.name}` };
  }
  for (const pl of planes) {
    if (!pl.alive || !pl.onGround || pl.speed > 5) continue;
    const d = pl.pos.distanceTo(player.pos.clone().add(new THREE.Vector3(0, 1.6, 0)));
    if (d >= 7 || d >= bd) continue;
    const gunFree = !pl.gunner && !pl.gunnerRemote && pl.team === player.team;
    if (pl.pilot || pl.remote) { if (gunFree) { bd = d; best = { kind: 'planeGun', pl, text: 'Press E to ride as the gunner and bomber' }; } continue; }
    bd = d; best = { kind: 'plane', pl, text: gunFree ? 'Press E to fly the plane   F to ride as the gunner' : 'Press E to fly the plane' };
  }
  return best;
}
function interact() {
  if (!player.alive) return;
  if (player.planeGun) { leavePlaneGun(); return; }
  if (player.gv) {
    // jumping out of a flying helicopter: drop clear of it and pop the parachute
    const v = player.gv, high = v.T.heli && v.pos.y - groundAt(v.pos.x, v.pos.z, v.pos.y) > 5;
    leaveSeat(player); player.velY = 0; player.body3p.root.visible = false;
    if (high) { const right = new THREE.Vector3(Math.cos(v.yaw), 0, -Math.sin(v.yaw)); player.pos.copy(v.pos).addScaledVector(right, v.T.wid / 2 + 1.6); player.pos.y = v.pos.y - 1.2; player.yaw = v.yaw + Math.PI; openChute(); }
    return;
  }
  if (player.vehicle) {
    const pl = player.vehicle;
    if (pl.onGround && pl.speed < 12) {
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(pl.quat);
      player.pos.copy(pl.pos).addScaledVector(right, 4); player.pos.y = heightAt(player.pos.x, player.pos.z);
      pl.throttle = 0;
    } else {
      player.pos.copy(pl.pos).add(new THREE.Vector3(0, 2.5, 0)); openChute(); player.velY = 6;
    }
    pl.pilot = null; player.vehicle = null; pl.waitT = 15; if (_cockpit) { _cockpit.visible = false; pl.model.g.remove(_cockpit); } if (pl.model.canopy) pl.model.canopy.visible = true; updateNoseMarker(null); pl.aimYaw = undefined;
    const f = planeFwd(pl); player.yaw = Math.atan2(-f.x, -f.z); player.pitch = 0;
    return;
  }
  if (player.turret) {
    const t = player.turret; t.user = null; player.turret = null;
    return;
  }
  const it = nearestInteract();
  if (!it) return;
  if (it.kind === 'cache') { openCache(it.b); return; }
  if (it.kind === 'hatch') { useHatch(it); return; }
  if (it.kind === 'planeGun') { boardPlaneGun(it.pl); return; }
  if (it.kind === 'tower') { climbTower(it.t); return; }
  if (it.kind === 'gv') {
    if (it.hijack) hijackVehicle(it.v, player);
    enterSeat(player, it.v, it.seat); zoom = false; ads = false; cancelPlace();
    camOrbit.yaw = 0; camOrbit.pitch = 0.15; camOrbit.wyaw = it.v.yaw; player.yaw = it.v.yaw; player.pitch = 0;
    const role = it.v.T.seats[it.seat].role;
    showMessage(role === 'drive' && it.v.T.heli ? 'Mouse turns and aims, W/S forward and back, A/D slide sideways, Space up, Shift down. Left click: nose gun. Right click: rockets. F switch seat, E get out' : role === 'drive' && it.v.T.boat ? 'W/S drive, A/D steer, Space slow down. F switch seat, E get out' : role === 'drive' ? (it.v.type === 'tank' ? 'W/S drive, A/D turn, mouse aims the cannon, click to fire. F switch seat, E get out' : 'W/S drive, A/D steer, Space brake. F switch seat, E get out') : role === 'gun' ? 'Mouse to aim, click to fire. F switch seat, E get out' : 'Riding along! F switch seat, E get out', 4);
    return;
  }
  if (it.kind === 'turret') {
    player.turret = it.t; it.t.user = player; it.t.reservedBy = null; it.t.yaw = player.yaw; it.t.pitch = clamp(player.pitch, -0.35, 1.2); zoom = false;
  } else {
    boardPlane(it.pl);
  }
}
function updatePlayer(dt) {
  if (!player.alive) {
    player.respawnT -= dt;
    if ((player.chipT = (player.chipT || 0) - dt) <= 0) { player.chipT = 1; renderSpawnChoices(); }
    const btn = $('deploy');
    btn.textContent = player.respawnT > 0 ? `Deploy in ${Math.ceil(player.respawnT)}` : 'Deploy!';
    btn.className = 'btn' + (player.respawnT > 0 ? ' wait' : '');
    if (player.respawnT <= 0 && player.wantDeploy && !gameOver) deployPlayer();
    return;
  }
  if (player.planeGun) { updatePlaneGun(dt); return; }
  if (player.vehicle) {
    const pl = player.vehicle;
    player.pos.copy(pl.pos); player.pos.y -= 1.6; player.vel.copy(planeFwd(pl)).multiplyScalar(pl.speed);
    if (planeView === 'cockpit') {
      cockpitCamera(pl);
      updateNoseMarker(pl);
      return;
    }
    if (_cockpit) _cockpit.visible = false; if (pl.model.canopy) pl.model.canopy.visible = true;
    updateNoseMarker(null);
    camOrbit.t -= dt; if (camOrbit.t <= 0) { camOrbit.yaw *= Math.exp(-dt * 3); camOrbit.pitch *= Math.exp(-dt * 3); }
    const off = new THREE.Vector3(0, 3.6, 14).applyAxisAngle(new THREE.Vector3(1, 0, 0), camOrbit.pitch).applyAxisAngle(UPV, camOrbit.yaw).applyQuaternion(pl.quat);
    const want = pl.pos.clone().add(off);
    want.y = Math.max(want.y, heightAt(want.x, want.z) + 1.5);
    camera.position.lerp(want, 1 - Math.exp(-dt * 10));
    camera.lookAt(camOrbit.t > 0 || Math.abs(camOrbit.yaw) > 0.2 ? pl.pos : pl.pos.clone().addScaledVector(planeFwd(pl), 30).add(new THREE.Vector3(0, 2, 0)));
    return;
  }
  if (player.gv) { updatePlayerInVehicle(dt); return; }
  if (player.body3p) player.body3p.root.visible = false;
  if (player.turret) {
    const t = player.turret, s = turretSeat(t);
    player.pos.set(s.x, t.y, s.z); player.vel.set(0, 0, 0);
    t.fireT -= dt;
    if (mouse.left && t.fireT <= 0) turretFire(t, turretDir(t), player);
    updateTurretVisual(t);
    camera.position.set(s.x, t.y + 2.4, s.z);
    camera.rotation.set(t.pitch + (Math.random() - 0.5) * camShake, t.yaw, 0);
    return;
  }
  // ----- on foot -----
  if (heliMark) heliMark.visible = false;
  const water = waterDepth(player.pos.x, player.pos.z) > 0.7;
  if (player.crouch && (player.vehicle || player.gv || player.turret || player.planeGun || !player.alive)) toggleCrouch(false);
  crouchK += ((player.crouch ? 1 : 0) - crouchK) * Math.min(1, dt * 12);
  const speed = (player.crouch ? 2.8 : keys.ShiftLeft || keys.ShiftRight ? 8.5 : 5.6) * (water ? (waterDepth(player.pos.x, player.pos.z) > 1.35 ? 0.42 : 0.6) : 1) * (zoom ? 0.5 : ads ? 0.65 : 1) * (player.slowT > 0 ? 0.45 : 1);
  bloom *= Math.exp(-dt * 4);
  buildEffectsOnChar(player, dt);
  updatePlacing(dt);
  const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const mv = new THREE.Vector3();
  if (keys.KeyW) mv.add(fwd); if (keys.KeyS) mv.sub(fwd); if (keys.KeyD) mv.add(right); if (keys.KeyA) mv.sub(right);
  const moving = mv.lengthSq() > 0;
  if (moving) mv.normalize().multiplyScalar(speed);
  if (!player.onGround && !moving) mv.copy(player.vel).setY(0).multiplyScalar(0.98);
  // under a parachute: W glides forward, A/D/S steer, and with no keys you drift slowly the way you face
  if (player.parachute) { if (moving) mv.normalize().multiplyScalar(keys.KeyW ? 9 : 5); else mv.copy(fwd).multiplyScalar(2.5); }
  // gliding: always flying forward; W dives (faster, sinks quicker), S flares (slower, floats), A/D drift, the mouse steers
  if (player.gliding) {
    const want = keys.KeyW ? 23 : keys.KeyS ? 10 : 16;
    player.glideSpd = lerp(player.glideSpd || 14, want, Math.min(1, dt * 1.2));
    mv.copy(fwd).multiplyScalar(player.glideSpd).addScaledVector(right, ((keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0)) * 3);
  }
  player.vel.set(mv.x, player.velY, mv.z);
  const prevX = player.pos.x, prevZ = player.pos.z, wasUnder = !!undergroundAt(prevX, prevZ, player.pos.y);
  player.pos.x += (mv.x + player.push.x) * dt; player.pos.z += (mv.z + player.push.z) * dt;
  player.push.multiplyScalar(player.onGround ? Math.exp(-dt * 8) : Math.exp(-dt * 1.2));
  if (moving && player.onGround) bobT += dt * speed * 1.4;
  if (keys.Space && player.onGround) { if (player.crouch) { toggleCrouch(false); keys.Space = false; } else { player.velY = 7.5; player.onGround = false; } }
  player.velY -= 20 * dt;
  if (player.parachute) player.velY = Math.max(player.velY, -6);
  if (player.gliding) player.velY = keys.KeyW ? -5.5 : keys.KeyS ? -1.2 : -2.4;
  player.pos.y += player.velY * dt;
  let floor = pushOut(player.pos, 0.4, player.pos.y);
  // deep water: swim at the surface with your head out, instead of walking along the bottom
  const deep = waterDepth(player.pos.x, player.pos.z);
  player.swimming = deep > 1.35 && !undergroundAt(player.pos.x, player.pos.z, player.pos.y);
  if (player.swimming) {
    floor = Math.max(floor, WATER_Y - 1.25 + Math.sin(simTime * 2.2) * 0.06);
    if (player.velY < -3) { player.velY *= 0.4; if (!player.splashT || simTime - player.splashT > 1) { player.splashT = simTime; burst(new THREE.Vector3(player.pos.x, WATER_Y + 0.2, player.pos.z), 18, 0xdff3ff, 5, 0.7, 0.12); if (SFX.splash) SFX.splash(0.7); } }
    if (moving && Math.random() < dt * 6) smokePuff(new THREE.Vector3(player.pos.x, WATER_Y + 0.1, player.pos.z), 0xf2f8fb, 0.35, 0.8, 0.2);
  }
  // never pop up through the earth: underground, a floor far above you is a wall
  if (wasUnder && floor - player.pos.y > 1.3) { player.pos.x = prevX; player.pos.z = prevZ; floor = pushOut(player.pos, 0.4, player.pos.y); }
  if (player.pos.y <= floor || (player.onGround && player.pos.y - floor < 0.7 && player.velY <= 0)) {
    if (player.velY < -24 && !player.parachute && !player.gliding) damage(player, (-player.velY - 24) * 4, null);
    player.pos.y = floor; player.velY = 0; player.onGround = true; player.parachute = false; if (player.gliding) { player.gliding = false; showMessage('Landed. Space in the air to glide again', 1.5); }
  } else player.onGround = false;
  const und = undergroundAt(player.pos.x, player.pos.z, player.pos.y);
  if (und) { const ce = underCeil(und, player.pos.x, player.pos.z); if (player.pos.y + 1.85 > ce) { player.pos.y = ce - 1.85; player.velY = Math.min(player.velY, 0); } }
  bunkerEffects(dt);
  player.pos.x = clamp(player.pos.x, -EDGE, EDGE); player.pos.z = clamp(player.pos.z, -EDGE, EDGE);
  if (moving) pushProps(player.pos, mv.x, mv.z, 0.4);
  gliderMesh.visible = !!player.gliding;
  if (player.gliding) poseGlider(gliderMesh, player.pos, player.yaw, (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), keys.KeyW ? 1 : keys.KeyS ? -1 : 0);
  parachuteMesh.visible = player.parachute;
  if (player.parachute) {
    player.chuteT = Math.min(1, (player.chuteT || 0) + dt * 1.8);
    poseChute(parachuteMesh, player.pos, player.yaw, player.chuteT, keys.KeyW ? 1 : 0, (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0));
  }

  // ----- weapons -----
  cooldown -= dt;
  const w = curW();
  if (reloadLeft > 0) {
    reloadLeft -= dt;
    if (reloadLeft <= 0) { const a = player.ammo[w.id], take = Math.min(w.mag - a.mag, a.reserve); a.mag += take; a.reserve -= take; reloadLeft = 0; if (w.model.warhead) w.model.warhead.visible = true; }
  }
  if (!switching && reloadLeft <= 0 && cooldown <= 0 && mouse.left && !placing) {
    if (w.auto) { if (!w.spinUp || spinSpeed > 20) fireWeapon(); }
    else if (mouse.fresh) fireWeapon();
  }
  mouse.fresh = false;
  updateViewmodel(dt, moving);

  camShake *= Math.exp(-dt * 6);
  const sprinting = moving && player.onGround && !player.crouch && (keys.ShiftLeft || keys.ShiftRight) && !ads && !zoom;
  const hb = moving && player.onGround ? Math.abs(Math.sin(bobT)) * (sprinting ? 0.045 : 0.022) * (1 - adsT * 0.8) : 0;
  camera.position.set(player.pos.x, player.pos.y + 1.65 - 0.6 * crouchK - camDip + hb, player.pos.z);
  camera.rotation.set(player.pitch + kick * 0.15 + (Math.random() - 0.5) * camShake, player.yaw + (Math.random() - 0.5) * camShake, camRoll + (Math.random() - 0.5) * camShake * 0.5);
  const baseFov = SET.fov || 75, targetFov = zoom ? 20 : ads ? baseFov * 0.69 : sprinting ? baseFov + 7 : baseFov;
  if (Math.abs(camera.fov - targetFov) > 0.1) { camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 15); camera.updateProjectionMatrix(); }
}
// throw the enemy crew out of a vehicle so it can be stolen
function hijackVehicle(v, by) {
  for (const c of occupants(v)) {
    if (c.team === by.team || c.isPlayer || c.isRemote) continue;
    leaveSeat(c);
    c.noVehT = simTime + 30;   // and they don't jump straight back in
  }
  if (!v.homeTeam) v.homeTeam = v.team;
  showMessage(`Hijacked the ${v.T.name}! It's yours now`, 2);
  if (typeof netRequest === 'function' && net.active && !net.isHost) netRequest(['hj', v.idx]);
}
// sitting in the pilot's seat, looking where you are steering (also called right after the plane moves, so it never lags)
function cockpitCamera(pl) {
  if (cockpitModel().parent !== pl.model.g) setPlaneView('cockpit');
  cockpitModel().visible = true;
  pl.model.g.position.copy(pl.pos); pl.model.g.quaternion.copy(pl.quat);
  camera.position.copy(new THREE.Vector3(0, 1.6, -0.3).applyQuaternion(pl.quat).add(pl.pos));
  if (pl.model.canopy) pl.model.canopy.visible = false;
  if (pl.aimYaw === undefined) { const e = new THREE.Euler().setFromQuaternion(pl.quat, 'YXZ'); pl.aimYaw = e.y; pl.aimPitch = 0; }
  if (pl.onGround) pl.aimYaw = pl.groundYaw + clamp(wrapAngle(pl.aimYaw - pl.groundYaw), -1.2, 1.2);
  const roll = new THREE.Euler().setFromQuaternion(pl.quat, 'YXZ').z;
  camera.rotation.set(pl.aimPitch || 0, pl.aimYaw, roll * 0.3 + (Math.random() - 0.5) * camShake * 0.3, 'YXZ');
  const fov = (SET.fov || 75) + 12; if (Math.abs(camera.fov - fov) > 0.1) { camera.fov = fov; camera.updateProjectionMatrix(); }   // a wider view from the cockpit
}
// in the cockpit: a small ring showing where the guns point (the nose), which chases the crosshair as the plane turns
let _noseEl = null;
function updateNoseMarker(pl) {
  if (!_noseEl) { _noseEl = document.createElement('div'); _noseEl.className = 'hud'; _noseEl.style.cssText = 'position:fixed;width:26px;height:26px;margin:-13px 0 0 -13px;border:2px solid #ffd54f;border-radius:50%;pointer-events:none;z-index:5;display:none;box-shadow:0 0 4px rgba(0,0,0,.6)'; document.body.appendChild(_noseEl); }
  if (!pl) { _noseEl.style.display = 'none'; return; }
  camera.updateMatrixWorld();
  const p = pl.pos.clone().addScaledVector(planeFwd(pl), 250).project(camera);
  if (p.z > 1 || Math.abs(p.x) > 1.2 || Math.abs(p.y) > 1.2) { _noseEl.style.display = 'none'; return; }
  _noseEl.style.display = 'block'; _noseEl.style.left = ((p.x + 1) / 2 * innerWidth) + 'px'; _noseEl.style.top = ((1 - p.y) / 2 * innerHeight) + 'px';
}
// a round parachute: canopy panels in team colour and white, with lines down to the harness
function makeChute(color) {
  const g = new THREE.Group(), R = 4, TH = Math.PI / 2.3, team = new Part(), white = new Part(), lines = new Part();
  for (let i = 0; i < 10; i++) (i % 2 ? white : team).add(new THREE.SphereGeometry(R, 3, 6, i / 10 * Math.PI * 2, Math.PI * 2 / 10, 0, TH), 0xffffff, 0, 0, 0, 0, 0, 0, 1, 0.55, 1);
  team.add(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 10), 0xffffff, 0, R * 0.55 + 0.02, 0);   // the vent at the top
  const rimY = Math.cos(TH) * R * 0.55, rimR = Math.sin(TH) * R, up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2, A = new THREE.Vector3(Math.cos(a) * rimR, rimY, Math.sin(a) * rimR), B = new THREE.Vector3(0, -5.3, 0);
    const d = B.clone().sub(A), len = d.length(); q.setFromUnitVectors(up, d.normalize()); e.setFromQuaternion(q);
    lines.add(new THREE.CylinderGeometry(0.02, 0.02, len, 3), 0x333333, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2, e.x, e.y, e.z);
  }
  const tm = new THREE.Mesh(team.build(), new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
  const wm = new THREE.Mesh(white.build(), new THREE.MeshLambertMaterial({ color: 0xf2f2ee, side: THREE.DoubleSide }));
  const lm = new THREE.Mesh(lines.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));
  tm.castShadow = wm.castShadow = true;
  g.add(tm, wm, lm); g.visible = false; scene.add(g); return g;
}
// place a parachute over someone: pops open over half a second, leans into the glide and sways
function poseChute(g, pos, yaw, open, fwd, side) {
  const k = 1 - Math.pow(1 - open, 3), sw = Math.sin(simTime * 1.7 + pos.x * 0.1) * 0.05;
  g.scale.set(0.25 + 0.75 * k, 0.4 + 0.6 * k, 0.25 + 0.75 * k);
  g.position.set(pos.x, pos.y + 1.6 + 5.3 * (0.4 + 0.6 * k), pos.z);
  g.rotation.set(-fwd * 0.18 + sw, yaw, -side * 0.22 + sw * 0.6, 'YXZ');
}
function openChute() {
  player.parachute = true; player.chuteT = 0; player.onGround = false;
  showMessage(IS_TOUCH ? 'Parachute open! Drag to turn and aim, FIRE to shoot' : 'Parachute open! Mouse turns and aims, W glides, click fires', 3);
  if (typeof SFX !== 'undefined' && SFX.thump) SFX.thump(0.5);
}
const parachuteMesh = makeChute(0x2f6fe0);
// a hang glider: a swept wing in team colour over a triangle frame, held from below
function makeGlider(color) {
  const g = new THREE.Group(), P = new Part(), F = new Part();
  const wing = new THREE.Shape(); wing.moveTo(0, -1.6); wing.lineTo(4.6, 1.3); wing.lineTo(3.9, 1.6); wing.lineTo(0, 0.5); wing.lineTo(-3.9, 1.6); wing.lineTo(-4.6, 1.3); wing.lineTo(0, -1.6);
  const wg = new THREE.ShapeGeometry(wing); wg.rotateX(-Math.PI / 2);
  const wm = new THREE.Mesh(wg, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide })); wm.castShadow = true;
  const stripe = new THREE.Shape(); stripe.moveTo(0, -1.6); stripe.lineTo(0.5, -0.8); stripe.lineTo(0.5, 0.75); stripe.lineTo(0, 0.5); stripe.lineTo(-0.5, 0.75); stripe.lineTo(-0.5, -0.8); stripe.lineTo(0, -1.6);
  const sg = new THREE.ShapeGeometry(stripe); sg.rotateX(-Math.PI / 2); sg.translate(0, 0.01, 0);
  const sm = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ color: 0xf2f2ee, side: THREE.DoubleSide }));
  F.box(0.05, 0.05, 3.0, 0x2a2d31, 0, 0, 0.0);                                    // keel
  F.box(8.6, 0.05, 0.05, 0x2a2d31, 0, 0, 1.1);                                    // cross bar
  for (const s of [-1, 1]) F.box(0.04, 1.6, 0.04, 0x2a2d31, s * 0.45, -0.75, -0.1, 0.25, 0, s * -0.28);   // A-frame down to the bar you hold
  F.box(1.0, 0.04, 0.04, 0x9aa0a6, 0, -1.5, -0.3);                                // control bar
  g.add(wm, sm, new THREE.Mesh(F.build(), new THREE.MeshLambertMaterial({ vertexColors: true })));
  g.visible = false; scene.add(g); return g;
}
function poseGlider(g, pos, yaw, side, pitch) {
  g.position.set(pos.x, pos.y + 3.3, pos.z);
  g.rotation.set(-pitch * 0.18 + 0.06, yaw, -side * 0.3, 'YXZ');
}
const gliderMesh = makeGlider(0x2f6fe0);
function toggleGlide() {
  if (player.gliding) { player.gliding = false; showMessage('Glider folded', 1); return; }
  if (player.pos.y - heightAt(player.pos.x, player.pos.z) < 3) { showMessage('Too low to glide: jump off something higher', 1.5); return; }
  player.gliding = true; player.parachute = false; player.glideSpd = Math.max(12, Math.hypot(player.vel.x, player.vel.z));
  gliderMesh.children[0].material.color.setHex(TEAM_COLOR[player.team]);
  showMessage('Gliding! Mouse steers, W dives faster, S floats slower. Space to fold it', 3);
}
function pushPlayerFrom(pos, radius, d) {
  const fall = 1 - d / radius;
  const dir = player.pos.clone().sub(pos).setY(0).normalize();
  player.velY = Math.max(player.velY, 4 + 11 * fall); player.onGround = false;
  player.push.addScaledVector(dir, 14 * fall);
}

// ---------- viewmodel ----------
function updateViewmodel(dt, moving) {
  const w = curW();
  if (switching === 1) {
    switchT += dt * 7;
    if (switchT >= 1) {
      switchT = 1; w.model.g.visible = false; w.model.fl.visible = false;
      player.cur = pending; WEAPONS[player.cur].model.g.visible = true; switching = 2;
      const nw = WEAPONS[player.cur]; if (nw.model.warhead) nw.model.warhead.visible = player.ammo[nw.id].mag > 0;
      cooldown = Math.min(cooldown, 0.1); spinSpeed = 0;
    }
  } else if (switching === 2) { switchT -= dt * 6; if (switchT <= 0) { switchT = 0; switching = 0; } }
  const W = curW(), m = W.model;
  kick *= Math.exp(-dt * 12); swayX *= Math.exp(-dt * 6); swayY *= Math.exp(-dt * 6);
  const bx = moving ? Math.sin(bobT) * 0.012 : 0, by = moving ? Math.abs(Math.cos(bobT)) * 0.012 : 0;
  const rl = reloadLeft > 0 ? Math.sin(Math.min(1, 1 - reloadLeft / W.reloadT) * Math.PI) : 0;
  adsT += ((ads ? 1 : 0) - adsT) * Math.min(1, dt * 12);
  const px = lerp(m.pos[0], 0, adsT), py = lerp(m.pos[1] - 0.02, -(m.sight || 0.1525) * 0.8, adsT), pz = lerp(m.pos[2] - 0.06, -0.3, adsT), bm = 1 - adsT * 0.8;
  vmHolder.position.set(px + (bx + swayX) * bm, py + (-by + swayY) * bm - switchT * 0.45 - rl * 0.12, pz + kick * (ads ? 0.4 : 0.8));
  vmHolder.rotation.set(kick * (ads ? 1 : 2.2) - switchT * 0.6 - rl * 0.5, swayX * 2 * bm, rl * 0.4);
  vmHolder.visible = !zoom;
  if (flashT > 0) { flashT -= dt; if (flashT <= 0) m.fl.visible = false; }
  if (m.fl.visible) { m.fl.scale.setScalar(0.8 + Math.random() * 0.6); m.fl.rotation.z = Math.random() * 6.28; }
  if (m.spin) { spinSpeed += ((mouse.left && !switching ? 30 : 0) - spinSpeed) * Math.min(1, dt * 3); m.spin.rotation.z += spinSpeed * dt; }
  if (m.drum) m.drum.rotation.y += (cooldown > 0 ? 12 : 0) * dt;
  if (m.pivot) {   // lightsaber swing and hum
    if (m.swingT > 0) m.swingT = Math.max(0, m.swingT - dt * 4);
    const s = Math.sin((1 - m.swingT) * Math.PI) * (m.swingT > 0 ? 1 : 0), dir = m.swingDir || 1;
    m.pivot.rotation.set(-0.5 - s * 1.1, s * 0.6 * dir, -0.35 + s * 1.6 * dir);
    m.glow.material.opacity = 0.38 + Math.random() * 0.14;
  }
  if (m.pump) { const t = cooldown > 0 ? Math.sin(Math.min(1, (W.rate - cooldown) / W.rate * 1.6) * Math.PI) : 0; m.pump.position.z = -0.42 + t * 0.12; m.lh.position.z = -0.42 + t * 0.12; }
}

// ---------- input ----------
addEventListener('keydown', e => {
  if (e.code === 'Tab') e.preventDefault();
  keys[e.code] = true;
  if (uiOpen === 'shop') { if (e.code === 'KeyB' || e.code === 'Escape') closeShop(); return; }
  if (e.code === 'Tab') { showScoreboard(true); return; }
  if (e.code === 'KeyM') { toggleBigMap(!bigOpen); return; }
  if (!playing) return;
  if (placing) { placingKey(e); return; }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 9 && !player.vehicle && !player.turret) selectWeapon(n - 1);
  if (n === 0 && e.code === 'Digit0' && !player.vehicle && !player.turret) selectWeapon(9);
  if (e.code === 'Space' && !e.repeat && player.glider && player.alive && !player.onGround && !player.vehicle && !player.gv && !player.planeGun && !player.turret) toggleGlide();
  if (e.code === 'KeyR') startReload();
  if (e.code === 'KeyE' && !player.vehicle) interact();
  if (e.code === 'KeyF' && player.vehicle) interact();
  if (e.code === 'KeyF' && player.planeGun) leavePlaneGun();
  else if (e.code === 'KeyF' && !player.vehicle && !player.gv && player.alive) { const it = nearestInteract(); if (it && it.kind === 'plane' && !it.pl.gunner && !it.pl.gunnerRemote && it.pl.team === player.team) boardPlaneGun(it.pl); }
  if (e.code === 'KeyV' && player.vehicle && !e.repeat) togglePlaneView();
  if (e.code === 'KeyF' && player.gv) switchSeat();
  if (e.code === 'KeyC' && player.alive && !player.vehicle && !player.gv && !player.turret) toggleCrouch();
  if (e.code === 'KeyG' && player.alive && !player.vehicle) throwGrenade();
  if (e.code === 'KeyT' && player.alive && !player.vehicle) callAirstrike();
  if (e.code === 'KeyB') openShop();
  if (e.code === 'KeyV' && player.gv && player.gv.T.heli && player.seat === 0 && !e.repeat) { toggleHeliView(); return; }
  if (e.code === 'KeyV' && player.alive && !player.vehicle && !player.turret && !player.gv) { const n = nextInventory(null); if (n) startPlacing(n); else showMessage('Nothing to build. Buy things in the shop (B)', 1.5); }
});
addEventListener('keyup', e => { keys[e.code] = false; if (e.code === 'Tab') showScoreboard(false); });
addEventListener('wheel', e => {
  if (!playing || player.vehicle || player.turret) return;
  const owned = WEAPONS.map((w, i) => i).filter(i => player.owned[WEAPONS[i].id]);
  const base = switching ? pending : player.cur;
  const k = owned.indexOf(base);
  selectWeapon(owned[(k + (e.deltaY > 0 ? 1 : -1) + owned.length) % owned.length]);
}, { passive: true });
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
renderer.domElement.addEventListener('mousedown', e => {
  if (!playing) return;
  if (placing) { if (e.button === 0) confirmPlace(); else cancelPlace(); return; }
  if (e.button === 0) { mouse.left = true; mouse.fresh = true; }
  if (e.button === 2) { mouse.right = true; if (!switching && !player.vehicle && !player.turret && reloadLeft <= 0) { if (curW().zoom) zoom = true; else ads = true; } }
});
addEventListener('mouseup', e => { if (e.button === 0) mouse.left = false; if (e.button === 2) { mouse.right = false; zoom = false; ads = false; } });
addEventListener('mousemove', e => {
  if (!playing || IS_TOUCH) return;
  if (!(locked || (dragLook && (mouse.left || mouse.right)))) return;
  lookDelta(e.movementX, e.movementY);
});
function lookDelta(mx, my) {
  mx *= SET.sens; my *= SET.sens; if (SET.invert) my = -my;
  if (player.vehicle && planeView === 'cockpit') { const pl = player.vehicle; if (pl.aimYaw === undefined) setPlaneView('cockpit'); pl.aimYaw -= mx * 0.0024; pl.aimPitch = clamp((pl.aimPitch || 0) - my * 0.0024, -0.9, 0.9); return; }
  if (player.vehicle) { camOrbit.yaw = clamp(camOrbit.yaw - mx * 0.003, -2.5, 2.5); camOrbit.pitch = clamp(camOrbit.pitch - my * 0.003, -0.6, 0.8); camOrbit.t = 2; return; }
  if (player.turret) { const t = player.turret; t.yaw -= mx * 0.0022; t.pitch = clamp(t.pitch - my * 0.0022, -0.35, 1.2); return; }
  if (player.gv && player.gv.T.heli && player.seat === 0) {   // helicopter pilot: mouse left/right turns, up/down aims
    player.gv.yaw -= mx * 0.0026; camOrbit.yaw = 0; camOrbit.pitch = clamp(camOrbit.pitch - my * 0.0028, -0.2, 1.25); return;
  }
  if (player.gv && player.gv.T.seats[player.seat].role !== 'gun') {
    camOrbit.wyaw -= mx * 0.003; camOrbit.yaw = clamp(camOrbit.yaw - mx * 0.003, -3, 3); camOrbit.pitch = clamp(camOrbit.pitch - my * 0.003, -0.3, 0.9); camOrbit.t = 1.5; return;
  }
  const sens = zoom ? 0.0008 : ads ? 0.0015 : 0.0024;
  player.yaw -= mx * sens; player.pitch = clamp(player.pitch - my * sens, -1.5, 1.5);
  swayX = clamp(swayX - mx * 0.0003, -0.04, 0.04); swayY = clamp(swayY + my * 0.0003, -0.04, 0.04);
}
let lockFails = 0;
function lockFailed() {
  lockFails++;
  if (lockFails >= 3) { dragLook = true; showMessage('Hold a mouse button and drag to look around', 3); }
  else if (playing && !uiOpen) showMessage('Click the game to take control of the mouse', 2.5);
}
function lockPointer() {
  if (IS_TOUCH) return;
  const el = renderer.domElement;
  if (!el.requestPointerLock) { dragLook = true; return; }
  try {
    const p = el.requestPointerLock();
    if (p && p.catch) p.catch(lockFailed);
  } catch (err) { lockFailed(); }
}
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;
  if (locked) { lockFails = 0; dragLook = false; }
  if (!locked && playing && !uiOpen && !gameOver) { playing = false; mouse.left = mouse.right = false; zoom = false; ads = false; for (const k in keys) keys[k] = false; $('pauseTitle').textContent = 'Paused'; $('pauseText').textContent = net.active ? 'The battle keeps going online! Click to jump back in.' : 'Click to jump back in.'; $('pause').style.display = 'flex'; }
});
document.addEventListener('pointerlockerror', lockFailed);
// clicking the game while the mouse is free grabs it again
renderer.domElement.addEventListener('click', () => { if (!IS_TOUCH && started && !locked && !uiOpen) { if (!playing) resume(); else lockPointer(); } });
function resume() {
  if (!started) return;
  initAudio(); $('pause').style.display = 'none';
  playing = true; lockPointer();
}
$('pause').addEventListener('click', resume);
$('resumeBtn').addEventListener('click', e => { e.stopPropagation(); resume(); });
// leave the battle and go back to the start screen (online, this also leaves the game cleanly)
$('exitMenu').addEventListener('click', e => {
  e.stopPropagation();
  const b = $('exitMenu'); if (net.active && !b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Click again to leave the battle'; setTimeout(() => { b.dataset.sure = ''; b.textContent = 'Exit to main menu'; }, 3000); return; }
  try { net.closeGame && net.closeGame(); } catch (er) { }
  try { LOBBY.close && LOBBY.close(); } catch (er) { }
  try { sessionStorage.removeItem('bf_force'); sessionStorage.setItem('bf_intro', '1'); } catch (er) { }
  document.body.classList.add('reloading'); setTimeout(() => location.reload(), 120);
});

// ---------- shop ----------
const GEAR = [
  { id: 'medkit', name: 'Medkit', desc: 'Heal to full health', price: 150, buy: () => { player.hp = 100; } },
  { id: 'armor', name: 'Body Armor', desc: 'Blocks part of incoming damage', price: 250, buy: () => { player.armor = 100; } },
  { id: 'ammo', name: 'Ammo Crate', desc: 'Refill all your ammo', price: 100, buy: () => { WEAPONS.forEach(w => { player.ammo[w.id].reserve = w.reserve; }); } },
  { id: 'nades', name: 'Grenades x3', desc: 'Throw with G', price: 200, buy: () => { player.grenades += 3; } },
  { id: 'squad', name: 'Recruit Soldier', desc: 'A new soldier joins your team', price: 400, buy: () => { if (net.active && !net.isHost) netRequest(['rec', player.team]); else recruitNPC(player.team); } },
  { id: 'sticky', name: 'Sticky Bombs x2', desc: 'Throw with X. They stick to tanks and blow up hard', price: 300, buy: () => { player.stickies = (player.stickies || 0) + 2; } },
  { id: 'nuke', name: 'Mini Nuke', desc: 'Press Y, pick a spot from above. Huge blast with a mushroom cloud', price: 3000, buy: () => { player.nukes = (player.nukes || 0) + 1; } },
  { id: 'glider', name: 'Glider', desc: 'Jump off a tower, roof or cliff, then press Space in the air to glide. Yours until you go down', price: 700, buy: () => { player.glider = true; showMessage('Glider ready! Jump off something high, then press Space in the air', 3); } },
  { id: 'air', name: 'Airstrike', desc: 'Press T, then pick the exact spot on the map', price: 1500, buy: () => { player.airstrikes++; } },
];
function shopZone() {
  if (Math.hypot(player.pos.x - BASES[player.team].x, player.pos.z - BASES[player.team].z) < 42) return true;
  return points.some(p => p.owner === player.team && Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < p.r + 4);
}
function openShop() {
  if (!player.alive || player.vehicle) return;
  if (!shopZone()) { showMessage('The shop is open at your base or at points your team owns', 2); return; }
  uiOpen = 'shop'; playing = false; mouse.left = mouse.right = false; zoom = false; ads = false; for (const k in keys) keys[k] = false;
  try { document.exitPointerLock(); } catch (e) { }
  renderShop(); $('shop').style.display = 'flex';
}
function closeShop() {
  $('shop').style.display = 'none'; uiOpen = null; playing = true; lockPointer();
  if (player.placeNext && player.inventory[player.placeNext] > 0) startPlacing(player.placeNext);
  player.placeNext = null;
}
$('shopClose').addEventListener('click', closeShop);
function renderShop() {
  $('shopMoney').textContent = `Money: $${player.money}`;
  const grid = $('shopGrid'); grid.innerHTML = '';
  const make = (title, desc, price, state, onBuy) => {
    const d = document.createElement('div'); d.className = 'item' + (state ? ' ' + state : '');
    d.innerHTML = `<b>${title}</b><span>${desc}</span><i>${state === 'owned' ? 'Owned' : '$' + price}</i>`;
    if (!state) d.addEventListener('click', () => {
      if (player.money < price) return;
      player.money -= price; onBuy(); SFX.cash(); renderShop();
    });
    grid.appendChild(d);
  };
  const h1 = document.createElement('h3'); h1.textContent = 'Weapons'; grid.appendChild(h1);
  WEAPONS.forEach((w, i) => {
    const owned = player.owned[w.id];
    make(`${i + 1}. ${w.name}`, owned ? 'Ready in slot ' + (i + 1) : 'Unlocks slot ' + (i + 1), w.price, owned ? 'owned' : (player.money < w.price ? 'poor' : ''), () => { player.owned[w.id] = true; selectWeapon(i); });
  });
  const h2 = document.createElement('h3'); h2.textContent = 'Gear and support'; grid.appendChild(h2);
  GEAR.forEach(g => make(g.name, g.desc, g.price, player.money < g.price ? 'poor' : '', g.buy));
  const h3 = document.createElement('h3'); h3.textContent = 'Build (press V in battle to place)'; grid.appendChild(h3);
  BUILD_KEYS.forEach(k => { const D = BUILDS[k], have = player.inventory[k] || 0; make(D.name + (have ? ` (have ${have})` : ''), D.desc, D.price, player.money < D.price ? 'poor' : '', () => { player.inventory[k] = (player.inventory[k] || 0) + 1; player.placeNext = k; }); });
}

// ---------- HUD ----------
let msgT = 0;
function showMessage(text, dur = 2) { $('msg').textContent = text; $('msg').style.opacity = 1; msgT = dur; }
let vignette = 0;
function onPlayerHurt(amount) { vignette = Math.min(1, vignette + amount / 40); player.lastHurt = simTime; }
function showDeployScreen(first) {
  $('deathTitle').textContent = first ? 'Choose where to deploy' : "You're down!";
  if (first) $('deathBy').textContent = net.active ? (net.isHost ? 'You are the first one in this battle.' : 'Joining the battle in progress.') : '';
  uiOpen = 'death'; player.wantDeploy = false; renderSpawnChoices();
  $('death').style.display = 'flex';
}
function onPlayerDeath(attacker) {
  if (typeof onKilledByPlayer === 'function') onKilledByPlayer(attacker);
  $('deathTitle').textContent = "You're down!";
  zoom = false; ads = false; mouse.left = false; cancelPlace(); player.wantDeploy = false;
  uiOpen = 'death'; try { document.exitPointerLock(); } catch (e) { }
  renderSpawnChoices();
  if (player.turret) { player.turret.user = null; player.turret = null; }
  $('deathBy').textContent = attacker ? `Taken out by ${attacker.name} (${teamName(attacker.team)} team)` : 'You were taken out';
  $('death').style.display = 'flex'; parachuteMesh.visible = false;
}
let hitT = 0;
function showHitmarker(isKill) { const h = $('hitmarker'); h.className = isKill ? 'hud kill' : 'hud'; void h.offsetWidth; h.classList.add('pop'); hitT = isKill ? 0.35 : 0.15; h.style.opacity = 1; }
function addMoney(n, reason) {
  player.money += n;
  const d = document.createElement('div'); d.className = 'cash'; d.textContent = `+$${n} ${reason}`;
  $('cashfeed').appendChild(d); setTimeout(() => d.remove(), 2200);
}
function addKillfeed(att, vic, head) {
  const d = document.createElement('div');
  const nm = c => c ? `<span style="color:${TEAM_CSS[c.team]}">${c.name}</span>` : '';
  d.innerHTML = att ? `${nm(att)} <em>${head ? 'headshot' : 'took out'}</em> ${nm(vic)}` : `${nm(vic)} <em>was taken out</em>`;
  if (att === player || vic === player) d.className = 'mine';
  $('killfeed').prepend(d);
  while ($('killfeed').children.length > 6) $('killfeed').lastChild.remove();
  setTimeout(() => d.remove(), 7000);
}
// minimap (local, north up) and full map (M)
const mm = $('minimap'), mmg = mm.getContext('2d');
const MMB = 560;
let mmBg = null, bigOpen = false;
function buildMinimapBg() {
  const c = document.createElement('canvas'); c.width = c.height = MMB;
  const g = c.getContext('2d'), img = g.createImageData(MMB, MMB), cols = terrainMesh.geometry.attributes.color;
  for (let y = 0; y < MMB; y++) for (let x = 0; x < MMB; x++) {
    const wx = (x / MMB) * HALF * 2 - HALF, wz = (y / MMB) * HALF * 2 - HALF;
    const ix = Math.round((wx + HALF) / CELL), iz = Math.round((wz + HALF) / CELL), i = iz * W1 + ix, k = (y * MMB + x) * 4;
    let r = cols.getX(i), gg = cols.getY(i), b = cols.getZ(i);
    if (waterDepth(wx, wz) > 0) { r = 0.24; gg = 0.56; b = 0.82; }
    const sh = 0.85 + (heightAt(wx + 3, wz + 3) - heightAt(wx, wz)) * 0.05;
    img.data[k] = clamp(r * sh, 0, 1) * 255; img.data[k + 1] = clamp(gg * sh, 0, 1) * 255; img.data[k + 2] = clamp(b * sh, 0, 1) * 255; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const s = MMB / (HALF * 2), P = v => (v + HALF) * s;
  // trees and rocks, so forests on the map match the world
  for (const c of circles) {
    const gh = heightAt(c.x, c.z);
    if (c.r < 1.3 && c.top - gh > 4) { g.fillStyle = 'rgba(26,74,30,0.75)'; g.beginPath(); g.arc(P(c.x), P(c.z), Math.max(1.2, 2.4 * s * 1.4), 0, 7); g.fill(); }
    else if (c.r >= 0.8) { g.fillStyle = 'rgba(120,120,120,0.8)'; g.beginPath(); g.arc(P(c.x), P(c.z), Math.max(1, c.r * s), 0, 7); g.fill(); }
  }
  // buildings and walls that stand above ground (bunker rooms are underground, so they are left off)
  for (const o of obstacles) {
    const cx = (o.minX + o.maxX) / 2, cz = (o.minZ + o.maxZ) / 2;
    if (o.maxY < heightAt(cx, cz) + 0.3) continue;
    const big = (o.maxX - o.minX) * (o.maxZ - o.minZ) > 20;
    g.fillStyle = big ? 'rgba(92,70,58,0.95)' : 'rgba(60,60,60,0.85)';
    g.fillRect(P(o.minX), P(o.minZ), Math.max(1, (o.maxX - o.minX) * s), Math.max(1, (o.maxZ - o.minZ) * s));
    if (big) { g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.5; g.strokeRect(P(o.minX), P(o.minZ), Math.max(1, (o.maxX - o.minX) * s), Math.max(1, (o.maxZ - o.minZ) * s)); }
  }
  g.fillStyle = '#3b3d40';
  for (const t of ['blue', 'red']) { const r = RUNWAYS[t]; g.fillRect(P(r.x - r.len / 2), P(r.z - r.wid / 2), r.len * s, r.wid * s); }
  mmBg = c;
}
function drawMap(ctx, S, cx, cz, R, big) {
  // world (cx,cz) at the centre, R metres to each edge
  const k = S / (2 * R), P = (x, z) => [(x - cx) * k + S / 2, (z - cz) * k + S / 2];
  const sb = MMB / (HALF * 2);
  ctx.fillStyle = '#5f7a4a'; ctx.fillRect(0, 0, S, S);
  ctx.drawImage(mmBg, (cx - R + HALF) * sb, (cz - R + HALF) * sb, 2 * R * sb, 2 * R * sb, 0, 0, S, S);
  for (const t of TEAMS) { const [x, y] = P(BASES[t].x, BASES[t].z); ctx.fillStyle = TEAM_CSS[t]; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(x, y, 34 * k, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  if (big) for (const t of TEAMS) { const [x, y] = P(BASES[t].x, BASES[t].z + teamSide(t) * 40); ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(teamName(t).toUpperCase() + ' BASE', x, y); }
  for (const bk of bunkers) {
    const [x, y] = P(bk.cx, bk.cz), s2 = big ? 9 : 6;
    ctx.fillStyle = '#3b2a1a'; ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 1.5; ctx.fillRect(x - s2, y - s2, s2 * 2, s2 * 2); ctx.strokeRect(x - s2, y - s2, s2 * 2, s2 * 2);
    ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.moveTo(x - s2 * 0.6, y - s2 * 0.4); ctx.lineTo(x + s2 * 0.6, y - s2 * 0.4); ctx.lineTo(x, y + s2 * 0.6); ctx.closePath(); ctx.fill();
  }
  for (const t of NESTS) {              // sniper trenches: a small brown bar with a crosshair dot
    const [x, y] = P(t.x, t.z), L = (big ? 7 : 5), hz = t.ax[0] !== 0;
    ctx.fillStyle = '#4a3420'; ctx.strokeStyle = '#e8c46a'; ctx.lineWidth = 1;
    ctx.fillRect(x - (hz ? L : 2.5), y - (hz ? 2.5 : L), hz ? L * 2 : 5, hz ? 5 : L * 2); ctx.strokeRect(x - (hz ? L : 2.5), y - (hz ? 2.5 : L), hz ? L * 2 : 5, hz ? 5 : L * 2);
    if (big) { ctx.fillStyle = '#e8c46a'; ctx.font = '600 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText('sniper trench', x, y - 8); }
  }
  // tunnels: faint on the surface, clear when you are down there (or on the big map)
  const under = !!undergroundAt(player.pos.x, player.pos.z, player.pos.y);
  ctx.fillStyle = under ? 'rgba(52,36,22,0.95)' : big ? 'rgba(52,36,22,0.55)' : 'rgba(52,36,22,0.28)';
  for (const r of TRECTS) { const [x0, y0] = P(r.minX, r.minZ), [x1, y1] = P(r.maxX, r.maxZ); ctx.fillRect(x0, y0, Math.max(1.5, x1 - x0), Math.max(1.5, y1 - y0)); }
  if (under || big) for (const h of HATCHES) {
    const [x, y] = P(h.x, h.z), s2 = big ? 6 : 4.5;
    ctx.fillStyle = '#222'; ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, s2, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd54f'; ctx.fillRect(x - s2 * 0.15, y - s2 * 0.55, s2 * 0.3, s2 * 1.1); ctx.fillRect(x - s2 * 0.55, y - s2 * 0.1, s2 * 1.1, s2 * 0.2);
  }
  if (HUB && (under || big)) { const [x, y] = P(HUB.x, HUB.z + 22); ctx.fillStyle = '#ffd54f'; ctx.font = `bold ${big ? 11 : 9}px system-ui`; ctx.textAlign = 'center'; ctx.fillText('HQ', x, y); }
  const pr = big ? 13 : 8;
  for (const p of points) {
    const [x, y] = P(p.x, p.z);
    ctx.fillStyle = p.owner ? TEAM_CSS[p.owner] : '#e5e5e5';
    ctx.beginPath(); ctx.arc(x, y, pr, 0, 7); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#111'; ctx.font = `bold ${big ? 15 : 10}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.name, x, y + 0.5);
  }
  for (const v of gvehicles) {
    if (!v.alive || (v.team !== player.team && v.pos.distanceTo(player.pos) > 120)) continue;
    const [x, y] = P(v.pos.x, v.pos.z);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-v.yaw); ctx.fillStyle = TEAM_CSS[v.team]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    const w = { tank: 7, apc: 7, truck: 6, bike: 3, quad: 4, heli: 8, boat: 6 }[v.type] || 5; ctx.fillRect(-w / 2, -w * 0.8, w, w * 1.6); ctx.strokeRect(-w / 2, -w * 0.8, w, w * 1.6); ctx.restore();
  }
  for (const c of chars) {
    if (!c.alive || c.isPlayer || c.vehicle || c.inactive) continue;
    let show = c.team === player.team;
    if (!show) { if (c.pos.distanceTo(player.pos) < 80) show = true; else for (const o of chars) if (o.alive && o.team === player.team && o.target === c) { show = true; break; } }
    if (!show) continue;
    const [x, y] = P(c.pos.x, c.pos.z);
    ctx.fillStyle = TEAM_CSS[c.team]; ctx.fillRect(x - 2, y - 2, 4, 4);
    if (c.isRemote) { ctx.strokeStyle = '#fff'; ctx.strokeRect(x - 3, y - 3, 6, 6); if (big) { ctx.fillStyle = '#fff'; ctx.font = '11px system-ui'; ctx.fillText(c.name, x, y - 10); } }
  }
  for (const pl of planes) {
    if (!pl.alive) continue;
    const f = planeFwd(pl), a = Math.atan2(f.x, -f.z), [x, y] = P(pl.pos.x, pl.pos.z);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = TEAM_CSS[pl.team]; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(5, 5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore();
  }
  let a = -player.yaw;
  if (player.vehicle) { const f = planeFwd(player.vehicle); a = Math.atan2(f.x, -f.z); }
  else if (player.gv) a = -player.gv.yaw;
  else if (player.turret) a = -player.turret.yaw;
  const [px, py] = P(player.pos.x, player.pos.z);
  ctx.save(); ctx.translate(px, py); ctx.rotate(a); const sc = big ? 1.4 : 1; ctx.scale(sc, sc);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 2); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}
function drawMinimap() {
  if (!mmBg) buildMinimapBg();
  const R = player.vehicle ? 380 : 230;
  drawMap(mmg, mm.width, clamp(player.pos.x, -HALF + R, HALF - R), clamp(player.pos.z, -HALF + R, HALF - R), R, false);
  if (bigOpen) { const bm = $('bigmap'); drawMap(bm.getContext('2d'), bm.width, 0, 0, HALF, true); }
}
function toggleBigMap(on) { bigOpen = on; $('bigmapWrap').style.display = on ? 'flex' : 'none'; }
// tap or click anywhere on the open map to close it (phones have no M key)
['pointerdown', 'touchstart'].forEach(ev => document.getElementById('bigmapWrap').addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); if (bigOpen) toggleBigMap(false); }, { passive: false }));
const slotsEl = $('slots');
WEAPONS.forEach((w, i) => { const d = document.createElement('div'); d.innerHTML = `<b>${(i + 1) % 10}</b>${w.name.replace('Grenade Launcher', 'Launcher').replace('Assault ', '')}`; slotsEl.appendChild(d); });
const pointsEl = $('points');
POINTS_DEF.forEach(p => { const d = document.createElement('div'); d.className = 'pt'; d.innerHTML = `<div class="fill"></div><span>${p.n}</span>`; pointsEl.appendChild(d); });
let hudT = 0;
function updateHUD(dt) {
  if (msgT > 0) { msgT -= dt; if (msgT <= 0) $('msg').style.opacity = 0; }
  if (hitT > 0) { hitT -= dt; if (hitT <= 0) $('hitmarker').style.opacity = 0; }
  vignette = Math.max(0, vignette - dt * 0.8);
  if (hitDirT > 0) { hitDirT -= dt; $('hitdir').style.opacity = Math.max(0, hitDirT); }
  $('vignette').style.opacity = player.alive ? Math.max(vignette, player.hp < 35 ? 0.35 : 0) : 0;
  hudT -= dt; if (hudT > 0) return; hudT = 0.1;
  const w = curW(), a = player.ammo[w.id];
  $('hpFill').style.width = Math.max(0, player.hp) + '%'; $('hpNum').textContent = Math.max(0, Math.ceil(player.hp));
  $('arFill').style.width = player.armor + '%'; $('arNum').textContent = Math.ceil(player.armor);
  $('money').textContent = `$${player.money}`;
  const onFoot = !player.vehicle && !player.turret && !player.gv && !player.planeGun;
  $('ammo').style.display = onFoot && player.alive ? 'block' : 'none';
  $('slots').style.display = onFoot && player.alive ? 'flex' : 'none';
  $('wname').textContent = w.name + (reloadLeft > 0 ? '  (reloading)' : '');
  $('wammo').innerHTML = `${a.mag}<small> / ${a.reserve === Infinity ? '∞' : a.reserve}</small>`;
  const inv = BUILD_KEYS.filter(k => player.inventory[k] > 0).map(k => `${BUILDS[k].name} x${player.inventory[k]}`).join(', ');
  $('extras').textContent = `Grenades (G): ${player.grenades}   Sticky (X): ${player.stickies || 0}   Airstrikes (T): ${player.airstrikes}${player.nukes ? `   Nukes (Y): ${player.nukes}` : ''}` + (inv ? `   Build (V): ${inv}` : '');
  [...slotsEl.children].forEach((d, i) => { d.className = (i === player.cur ? 'on ' : '') + (player.owned[WEAPONS[i].id] ? '' : 'locked'); });
  points.forEach((p, i) => {
    const d = pointsEl.children[i];
    d.style.borderColor = p.owner ? TEAM_CSS[p.owner] : '#ddd';
    d.style.background = p.owner ? TEAM_CSS[p.owner] + '55' : 'rgba(0,0,0,0.45)';
    const f = d.firstChild; f.style.height = Math.abs(p.progress) * 100 + '%'; f.style.background = TEAM_CSS[progTeam(p)] || '#fff';
  });
  // capture bar
  const inP = points.find(p => player.alive && !player.vehicle && Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < p.r);
  if (inP) {
    $('capture').style.display = 'block';
    const contested = !!inP.contested;
    $('captureLabel').textContent = contested ? `Point ${inP.name} is contested!` : inP.owner === player.team && Math.abs(inP.progress) >= 0.999 ? `Point ${inP.name} is secure` : `Capturing point ${inP.name}`;
    $('captureFill').style.width = Math.abs(inP.progress) * 100 + '%';
    $('captureFill').style.background = TEAM_CSS[progTeam(inP)] || '#fff';
  } else $('capture').style.display = 'none';
  const it = player.alive && playing ? nearestInteract() : null;
  let prompt = it ? it.text : '';
  if (player.turret) prompt = 'Click to fire, E to leave';
  if (player.vehicle) prompt = '';
  if (!prompt && onFoot && player.alive && shopZone()) prompt = 'Press B to open the shop';
  if (IS_TOUCH) prompt = prompt.replace('Press E to', 'Tap USE to').replace('Press B to open the shop', 'Tap SHOP to buy things').replace('Click to fire, E to leave', 'FIRE to shoot, USE to leave');
  $('prompt').textContent = prompt;
  if (IS_TOUCH) document.body.dataset.mode = !player.alive ? 'dead' : player.vehicle ? 'plane' : player.gv ? 'gv' : player.turret ? 'turret' : placing ? 'place' : 'foot';
  const _ts = WORLD.mode === 'tdm' ? [teamKills.blue, `of ${tdmTarget()}`, teamKills.red] : WORLD.mode === 'koth' ? [Math.floor(holdScore.blue), `of ${KOTH_TIME} s`, Math.floor(holdScore.red)] : [points.filter(p => p.owner === 'blue').length, 'points', points.filter(p => p.owner === 'red').length];
  if (FOUR) $('teamstat').innerHTML = TEAMS.map(t => `<span style="color:${TEAM_CSS[t]}">${teamName(t).toUpperCase()} ${points.filter(p => p.owner === t).length}</span>`).join(' &nbsp; ') + `<br><small>Points held. Takedowns ${TEAMS.map(t => teamKills[t] || 0).join(' : ')}</small>`;
  else $('teamstat').innerHTML = `<span style="color:${TEAM_CSS.blue}">BLUE ${_ts[0]}</span> &nbsp; ${_ts[1]} &nbsp; <span style="color:${TEAM_CSS.red}">${_ts[2]} RED</span><br><small>Takedowns ${teamKills.blue} : ${teamKills.red}</small>`;
  const gvAim = player.gv && (player.gv.T.seats[player.seat].role === 'gun' || (player.gv.type === 'tank' && player.seat === 0) || (player.gv.T.heli && player.seat === 0));
  $('crosshair').style.display = (onFoot || player.turret || gvAim || player.planeGun) && !zoom && player.alive ? 'block' : 'none';
  const vh = $('vehHud');
  if (player.gv) {
    const v = player.gv, role = v.T.seats[player.seat].role;
    vh.style.display = 'block';
    $('vName').textContent = `${v.T.name}: ${role === 'drive' ? 'Driver' : role === 'gun' ? 'Gunner' : 'Passenger'} (seat ${player.seat + 1} of ${v.seats.length})`;
    $('vHp').style.width = Math.max(0, v.hp / v.T.hp * 100) + '%';
    $('vInfo').textContent = `${Math.round(Math.abs(v.speed) * 3.6)} km/h` + (v.type === 'tank' && player.seat === 0 ? (v.fireT > 0 ? `   Cannon reloading ${v.fireT.toFixed(1)}s` : '   Cannon ready') : '') + (v.T.heli ? `   Height ${Math.max(0, Math.round(v.pos.y - heightAt(v.pos.x, v.pos.z)))} m` + (player.seat === 0 ? (v.fireT > 0 ? '   Rockets loading (right click)' : '   Rockets ready (right click)') + '   Gun: left click' : '') : '') + `   ${occupants(v).length} aboard`;
  } else vh.style.display = 'none';
  $('crosshair').style.transform = `scale(${(ads ? 0.6 : 1) * (1 + bloom * 0.8)})`;
  $('scope').style.display = zoom ? 'block' : 'none';
  const ph = $('planeHud');
  if (player.vehicle) {
    const pl = player.vehicle; ph.style.display = 'block';
    $('pSpeed').textContent = Math.round(pl.speed * 3.6) + ' km/h'; $('pAlt').textContent = Math.round(pl.pos.y - heightAt(pl.pos.x, pl.pos.z)) + ' m';
    $('pThr').textContent = Math.round(pl.throttle * 100) + '%'; $('pBombs').textContent = pl.bombs; $('pHp').textContent = Math.max(0, Math.round(pl.hp / pl.maxHp * 100)) + '%';
    const ck = planeView === 'cockpit';
    $('pTip').textContent = IS_TOUCH ? (pl.onGround ? (pl.speed < 24 ? 'Hold THR + to speed up' : 'Pull the stick DOWN to lift off!') : 'Stick: pitch and roll   FIRE guns   BOMB   USE bails out')
      : pl.onGround ? (pl.speed < 24 ? 'Hold Shift to speed up (C to slow down)' : ck ? 'Look up (or press S) to lift off!' : 'Press S to lift off!')
      : pl.pullUp ? 'PULL UP! Ground ahead' : ck ? 'Mouse: steer where you look   Shift/C throttle   Click guns   Right click bomb   V outside view   F bail out' : 'W/S pitch   A/D roll   Q/E rudder   Shift/C throttle   Space guns   X bomb   V cockpit   F bail out';
    $('pTip').style.color = pl.pullUp ? '#ff6b5a' : '';
  } else ph.style.display = 'none';
  $('crosshair').style.display = player.vehicle ? (planeView === 'cockpit' ? 'block' : 'none') : $('crosshair').style.display;
  if (!player.vehicle && _cockpit && _cockpit.visible) { _cockpit.visible = false; updateNoseMarker(null); }
  drawMinimap();
}

// ---------- respawn choice ----------
function renderSpawnChoices() {
  const box = $('spawnPick'); box.innerHTML = '';
  if (!player.spawnPref) player.spawnPref = 'auto';
  const free = readyPlanes().length;
  const opts = [['auto', 'Best spot'], ['base', 'Base'], ['plane', free ? `Plane (${free} ready)` : 'Plane (none ready)']];
  for (const p of points) if (p.owner === player.team) opts.push([p.name, 'Point ' + p.name]);
  if (!opts.some(o => o[0] === player.spawnPref)) player.spawnPref = 'auto';
  for (const [k, label] of opts) {
    const b = document.createElement('div'); b.className = 'chip' + (player.spawnPref === k ? ' on' : ''); b.textContent = label;
    b.addEventListener('click', () => { player.spawnPref = k; renderSpawnChoices(); });
    box.appendChild(b);
  }
}
function readyPlanes() { return planes.filter(pl => pl.team === player.team && pl.alive && !pl.pilot && !pl.remote && pl.onGround && pl.speed < 5); }
function boardPlane(pl) {
  if (!pl.homeTeam) pl.homeTeam = pl.team; pl.team = player.team;   // a stolen plane flies for your team
  player.vehicle = pl; pl.pilot = player; pl.throttle = 0; pl.waitT = 999; zoom = false; ads = false; cancelPlace();
  player.pos.copy(pl.pos); player.pos.y -= 1.6;
  showMessage(IS_TOUCH ? 'Hold THR + to speed up, then pull the stick down to lift off' : 'Hold Shift to speed up, then press S to lift off', 4);
}
function deployPlayer() {
  player.glider = false; player.gliding = false;
  if (player.planeGun) { player.planeGun.gunner = null; player.planeGun = null; }
  const wantPlane = player.spawnPref === 'plane';
  spawnChar(player, wantPlane ? 'base' : player.spawnPref); refillAmmo();
  if (wantPlane) {
    const pl = readyPlanes()[0];
    if (pl) { $('death').style.display = 'none'; uiOpen = null; player.wantDeploy = false; boardPlane(pl); playing = true; lockPointer(); return; }
    showMessage('No plane is ready right now, so you deployed at base', 3);
  }
  $('death').style.display = 'none'; uiOpen = null; player.wantDeploy = false;
  player.pitch = 0; player.velY = 0; player.push.set(0, 0, 0); player.protUntil = simTime + 3; player.lastHurt = -99;
  const tgt = points.find(p => p.owner !== player.team) || centerPoint();
  player.yaw = Math.atan2(-(tgt.x - player.pos.x), -(tgt.z - player.pos.z));
  playing = true; lockPointer();
}
$('deploy').addEventListener('click', () => { initAudio(); if (player.respawnT <= 0) deployPlayer(); else player.wantDeploy = true; });

// ---------- damage direction ----------
let hitDirT = 0;
function showHitDir(pos) {
  if (!pos) return;
  const dx = pos.x - player.pos.x, dz = pos.z - player.pos.z;
  let yaw = player.yaw; if (player.turret) yaw = player.turret.yaw;
  const rel = wrapAngle(Math.atan2(-dx, -dz) - yaw);
  $('hitdir').style.transform = `rotate(${-rel}rad)`; $('hitdir').style.opacity = 1; hitDirT = 1.2;
}

// ---------- scoreboard ----------
function showScoreboard(on) {
  const sb = $('scoreboard');
  if (!on) { sb.style.display = 'none'; return; }
  const col = t => {
    const list = chars.filter(c => c.team === t && !c.inactive).sort((a, b) => b.kills - a.kills);
    return `<div class="col"><h3 style="color:${TEAM_CSS[t]}">${teamName(t).toUpperCase()} TEAM <small>${teamKills[t] || 0} takedowns</small></h3>` +
      '<div class="row hdr"><span>Name</span><b>K</b><b>D</b></div>' +
      list.map(c => `<div class="row${c.isPlayer ? ' me' : c.isRemote ? ' human' : ''}"><span>${escapeHtml(c.isPlayer ? (player.name || 'You') + ' (you)' : c.name)}${c.isRemote ? ' 🎮' : ''}</span><b>${c.kills}</b><b>${c.deaths}</b></div>`).join('') + '</div>';
  };
  sb.innerHTML = TEAMS.map(col).join(''); sb.classList.toggle('four', FOUR);
  sb.style.display = 'flex';
}
function escapeHtml(t) { return String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

// ---------- riding in ground vehicles ----------
function switchSeat() {
  const v = player.gv; if (!v) return;
  for (let k = 1; k <= v.seats.length; k++) {
    const i = (player.seat + k) % v.seats.length;
    if (!v.seats[i] && !(i === 0 && v.remote)) { enterSeat(player, v, i); player.yaw = v.yaw; player.pitch = 0; camOrbit.wyaw = v.yaw; SFX.click(); return; }
  }
  showMessage('No free seat', 1);
}
// ---------- flying a helicopter: the crosshair aims, left click fires the nose gun, right click fires rockets ----------
let heliMark = null;
const _hAim = new THREE.Vector3(), _hFrom = new THREE.Vector3();
function heliAimPoint(v) {
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const hit = rayHit(camera.position, dir, 700, player.team, { ignoreGV: v });
  return { point: hit ? hit.point : camera.position.clone().addScaledVector(dir, 700), hit };
}
function heliPilotWeapons(v, dt) {
  v.fireT -= dt; v.gunT = (v.gunT || 0) - dt;
  const aim = heliAimPoint(v);
  // a red ring on the ground (or target) where the crosshair is pointing
  if (!heliMark) { heliMark = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.8, 28), new THREE.MeshBasicMaterial({ color: 0xff4030, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide })); heliMark.rotation.x = -Math.PI / 2; heliMark.renderOrder = 10; scene.add(heliMark); }
  heliMark.visible = !!aim.hit; if (aim.hit) { heliMark.position.copy(aim.point).y += 0.15; const d = aim.point.distanceTo(camera.position); heliMark.scale.setScalar(clamp(d / 60, 0.6, 4)); }
  if (!v.airborne && v.pos.y - heightAt(v.pos.x, v.pos.z) < 1.5) return;   // no shooting while sitting on the pad
  // nose gun: fast, accurate, good against soldiers and light vehicles
  if (mouse.left && v.gunT <= 0) {
    v.gunT = 0.075;
    const fwd = new THREE.Vector3(-Math.sin(v.yaw), 0, -Math.cos(v.yaw));
    _hFrom.set(v.pos.x + fwd.x * 3.8, v.pos.y + 0.7, v.pos.z + fwd.z * 3.8);
    const d = aim.point.clone().sub(_hFrom).normalize().add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(0.012)).normalize();
    const hit = rayHit(_hFrom, d, 400, player.team, { ignoreGV: v });
    const end = hit ? hit.point : _hFrom.clone().addScaledVector(d, 400);
    shootTracer(_hFrom.clone(), end, 0xffc860, 420, 0.06, () => { if (applyHit(hit, d, { dmg: 22, force: 6 }, player)) { showHitmarker(false); SFX.hit(); } });
    if (typeof fxMuzzle === 'function') fxMuzzle(_hFrom, d, 1.4);
    netShot(_hFrom.clone(), end, 1); playAt('mg', _hFrom, 0.9); camShake = Math.max(camShake, 0.012);
  }
  // rockets: slower, big blast, great against tanks and groups
  if (mouse.right && v.fireT <= 0) {
    v.model.pods[1 - (v.podSide || 0)].getWorldPosition(_tv);
    heliRockets(v, player, aim.point.clone().sub(_tv).normalize());
  }
}
function updatePlayerInVehicle(dt) {
  const v = player.gv, S = v.T.seats[player.seat];
  if (heliMark && !(v.T.heli && player.seat === 0)) heliMark.visible = false;
  if (!v.alive) { leaveSeat(player); return; }
  player.vel.set(-Math.sin(v.yaw) * v.speed, 0, -Math.cos(v.yaw) * v.speed);
  if (S.role === 'drive') {
    const heliPilot = v.T.heli;
    moveVehicle(v, dt, { thr: (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), steer: heliPilot ? 0 : (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0), strafe: heliPilot ? (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) : 0, brake: !!keys.Space, up: !!keys.Space, down: !!(keys.ShiftLeft || keys.ShiftRight) });
    if (heliPilot) heliPilotWeapons(v, dt);
    if (v.type === 'tank') {
      v.fireT -= dt;
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const hit = rayHit(camera.position, dir, 500, player.team, { ignoreGV: v, noChars: true });
      const aim = hit ? hit.point : camera.position.clone().addScaledVector(dir, 500);
      aimTurretAt(v, aim, dt, 1.1);
      if (mouse.left && v.fireT <= 0) tankFire(v, player);
    }
  }
  camOrbit.t -= dt;
  if (S.role === 'gun') withGun(v, S.gun, () => {
    v.mgT -= dt;
    if (v.T.heli) {
      // door gunner: the gun swings through the open doorway on its own side (front, out to the side, round to the back)
      const side = S.gun ? -1 : 1, centre = v.yaw + side * Math.PI / 2;
      player.yaw = centre + clamp(wrapAngle(player.yaw - centre), -1.65, 1.65);
      player.pitch = clamp(player.pitch, -1.25, 0.5);
    }
    v.mgYaw = player.yaw; v.mgPitch = clamp(player.pitch - v.pitch, v.T.heli ? -1.25 : -0.4, 0.9);
    placeVehicleModel(v);
    v.model.mgYaw.getWorldPosition(_tv);
    if (v.T.heli) {
      // sit right behind the gun, out in the doorway, so nothing of the helicopter is in the way
      const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
      camera.position.set(_tv.x - fx * 0.3, _tv.y + 0.68, _tv.z - fz * 0.3);
    } else camera.position.set(_tv.x + Math.sin(player.yaw) * 1.7, _tv.y + 0.75, _tv.z + Math.cos(player.yaw) * 1.7);
    camera.rotation.set(player.pitch + (Math.random() - 0.5) * camShake, player.yaw, 0, 'YXZ');
    if (mouse.left && v.mgT <= 0) vehicleMG(v, new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), player);
  }); else {
    const tank = v.type === 'tank' && S.role === 'drive';
    if (!tank && camOrbit.t <= 0) camOrbit.yaw *= Math.exp(-dt * 2.5);
    const cy = tank ? camOrbit.wyaw : v.yaw + camOrbit.yaw, cp = camOrbit.pitch, dist = v.T.camDist;
    const lift = v.T.heli ? 3.5 : 2.8;
    const want = new THREE.Vector3(v.pos.x + Math.sin(cy) * dist * Math.cos(cp), v.pos.y + lift + Math.sin(cp) * dist, v.pos.z + Math.cos(cy) * dist * Math.cos(cp));
    const vu = undergroundAt(v.pos.x, v.pos.z, v.pos.y + 0.5);
    if (vu) {
      // underground: pull the camera in so it stays below the ceiling and inside the tunnel
      want.set(v.pos.x + Math.sin(cy) * 4.5, v.pos.y + 2.3, v.pos.z + Math.cos(cy) * 4.5);
      for (let k = 10; k >= 0; k--) {
        const t = k / 10, x = lerp(v.pos.x, want.x, t), z = lerp(v.pos.z, want.z, t), u2 = undergroundAt(x, z, v.pos.y + 0.5);
        if (u2) { want.x = x; want.z = z; want.y = Math.min(want.y, underCeil(u2, x, z) - 0.35); break; }
      }
    } else want.y = Math.max(want.y, heightAt(want.x, want.z) + 1.2);
    camera.position.lerp(want, 1 - Math.exp(-dt * 12));
    if (v.T.heli && S.role === 'drive' && heliView === 'cockpit') {
      // in the pilot's seat: looking out through the big nose window, mouse up and down aims the guns
      camera.position.copy(new THREE.Vector3(0, 1.95, -2.0).applyQuaternion(vehicleQuat(v)).add(v.pos));
      camera.rotation.set(-cp * 0.9 + v.pitch * 0.5, v.yaw, -v.roll * 0.4, 'YXZ');
      const fov = (SET.fov || 75) + 10; if (Math.abs(camera.fov - fov) > 0.1) { camera.fov = fov; camera.updateProjectionMatrix(); }
      if (player.body3p) player.body3p.root.visible = false;
      camShake *= Math.exp(-dt * 6);
      return;
    }
    if (v.T.heli && S.role === 'drive') { const ahead = 22 + 34 * Math.max(0, Math.sin(cp)); camera.lookAt(v.pos.x - Math.sin(cy) * ahead, v.pos.y + 2.2 - Math.max(0, Math.sin(cp)) * 30 + Math.min(0, cp) * 10, v.pos.z - Math.cos(cy) * ahead); }   // aim well ahead so the helicopter sits low on screen, out of the way
    else camera.lookAt(v.pos.x - Math.sin(cy) * 6, v.pos.y + (v.T.heli ? 2.2 : 2.4) + (v.T.heli ? -Math.sin(cp) * 4 : 0), v.pos.z - Math.cos(cy) * 6);
  }
  camShake *= Math.exp(-dt * 6);
  if (camera.fov !== (SET.fov || 75)) { camera.fov = SET.fov || 75; camera.updateProjectionMatrix(); }
}
// ---------- the plane's rear gunner and bomber ----------
// Ride along behind the pilot (a player or a computer pilot): the mouse swings the twin gun all round, left click
// fires, right click (or X) drops a bomb. E or F gets out (with a parachute if you are in the air).
function boardPlaneGun(pl) {
  player.planeGun = pl; pl.gunner = player; zoom = false; ads = false; cancelPlace(); player.gunT = 0; player.gunBombT = 0;
  if (!pl.pilot && !pl.remote) pl.waitT = Math.min(pl.waitT || 0, 3);   // a computer pilot takes off soon
  const e = new THREE.Euler().setFromQuaternion(pl.quat, 'YXZ'); player.yaw = e.y + Math.PI; player.pitch = 0.15;
  showMessage('Gunner and bomber: mouse aims the rear gun, click fires, right click drops a bomb. E to get out', 4);
}
function leavePlaneGun() {
  const pl = player.planeGun; if (!pl) return;
  pl.gunner = null; player.planeGun = null;
  if (pl.onGround && pl.speed < 12) { const right = new THREE.Vector3(1, 0, 0).applyQuaternion(pl.quat); player.pos.copy(pl.pos).addScaledVector(right, -4); player.pos.y = heightAt(player.pos.x, player.pos.z); player.velY = 0; }
  else { player.pos.copy(pl.pos).add(new THREE.Vector3(0, 2.5, 0)); openChute(); player.velY = 4; }
}
function updatePlaneGun(dt) {
  const pl = player.planeGun;
  if (!pl.alive) { pl.gunner = null; player.planeGun = null; return; }
  zoom = false; ads = false;
  player.pos.copy(pl.pos); player.pos.y -= 1.6; player.vel.copy(planeFwd(pl)).multiplyScalar(pl.speed);
  player.pitch = clamp(player.pitch, -0.8, 1.25);
  pl.model.g.position.copy(pl.pos); pl.model.g.quaternion.copy(pl.quat); pl.model.g.updateMatrixWorld(true);
  const seat = new THREE.Vector3(0, 1.75, 1.35).applyMatrix4(pl.model.g.matrixWorld);
  camera.position.copy(seat);
  camera.rotation.set(player.pitch + (Math.random() - 0.5) * camShake * 0.3, player.yaw, 0, 'YXZ');
  const fov = (SET.fov || 75) + 5; if (Math.abs(camera.fov - fov) > 0.1) { camera.fov = fov; camera.updateProjectionMatrix(); }
  aimPlaneGun(pl, player.yaw, player.pitch);
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  player.gunT -= dt; player.gunBombT -= dt;
  if (mouse.left && player.gunT <= 0) {
    player.gunT = 0.085;
    for (const sx of [-0.1, 0.1]) {
      const o = seat.clone().add(new THREE.Vector3(sx, -0.6, 0).applyQuaternion(pl.quat)).addScaledVector(dir, 1.4);
      const d = dir.clone().add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(0.014)).normalize();
      const hit = rayHit(o, d, 320, player.team, { ignorePlane: pl });
      const end = hit ? hit.point : o.clone().addScaledVector(d, 320);
      shootTracer(o, end, 0xffd060, 380, 0.05, () => applyHit(hit, d, { dmg: 18, force: 6 }, player));
      netShot(o, end, 2);
    }
    playAt('mg', camera.position, 0.7); camShake = Math.max(camShake, 0.01);
  }
  if ((mouse.right || keys.KeyX) && !pl.onGround && player.gunBombT <= 0) {
    player.gunBombT = 10;
    const v = planeFwd(pl).multiplyScalar(pl.speed * 0.9);
    spawnBall(pl.pos.clone().add(new THREE.Vector3(0, -1.6, 0)), v, player, { type: 'bomb', bomb: true, r: 0.32, mass: 25, fuse: 14, color: 0x30343a, radius: 20, dmg: 260, power: 95, impact: true });
    sfxBombDrop(); playAt('thump', pl.pos, 0.7);
    showMessage('Bomb away! Next bomb in 10 seconds', 2);
  }
  mouse.fresh = false;
}
// helicopter pilot: V switches between the outside camera and the cockpit (remembered)
let heliView = 'chase';
try { if (localStorage.getItem('bf_heliView') === 'cockpit') heliView = 'cockpit'; } catch (e) { }
function toggleHeliView() {
  heliView = heliView === 'chase' ? 'cockpit' : 'chase';
  try { localStorage.setItem('bf_heliView', heliView); } catch (e) { }
  showMessage(heliView === 'cockpit' ? 'Cockpit view: mouse turns and aims, the crosshair shows where your guns and rockets go. V for the outside view' : 'Outside view. V for the cockpit', 3);
}
// other players floating down under their parachutes (online games)
const _chutePool = [], _gliderPool = [];
function updateChutes(dt) {
  let n = 0, ng = 0;
  for (const c of chars) {
    if (c.gliding && c.alive && !c.vehicle && !c.gv && c.model) { let gg = _gliderPool[ng]; if (!gg) gg = _gliderPool[ng] = makeGlider(TEAM_COLOR[c.team] || 0x888888); gg.children[0].material.color.setHex(TEAM_COLOR[c.team] || 0x888888); gg.visible = true; poseGlider(gg, c.pos, c.heading + Math.PI, 0, 0); ng++; continue; }
    if (!c.parachute || !c.alive || c.vehicle || c.gv || c === player || !c.model) continue;
    let g = _chutePool[n]; if (!g) { g = _chutePool[n] = makeChute(TEAM_COLOR[c.team] || 0x888888); }
    g.children[0].material.color.setHex(TEAM_COLOR[c.team] || 0x888888);
    c.chuteT = Math.min(1, (c.chuteT || 0) + dt * 1.8);
    g.visible = true; poseChute(g, c.pos, c.heading + Math.PI, c.chuteT, 0, 0); n++;
  }
  for (let i = n; i < _chutePool.length; i++) _chutePool[i].visible = false;
  for (let i = ng; i < _gliderPool.length; i++) _gliderPool[i].visible = false;
  for (const c of chars) if (!c.parachute) c.chuteT = 0;
}
