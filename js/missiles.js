// ===================== missiles.js : guided missiles you ride =====================
// When you fire a guided missile (modern jets, gun boats, the missile launchers at the bases, the cheat Missile
// Launcher) the camera rides it and the mouse steers it through the air. It bursts close to an enemy plane or
// helicopter, and nudges itself onto one that is nearly dead ahead. When it goes off, the camera watches the
// explosion from the side for a few seconds, then you are back where you fired from. Right click returns early.
let MC = null;
// first person: a nose section fixed in front of the camera, and a ring showing where you are steering
const FPN = {};
function fpNose(kind) {
  for (const k in FPN) FPN[k].visible = false;
  if (!kind) { const r = document.getElementById('fpRing'); if (r) r.style.display = 'none'; return null; }
  if (!FPN[kind]) {
    const P = new Part(), g = new THREE.Group();
    if (kind === 'missile') {
      P.cyl(0.13, 0.13, 1.0, 0xe2e4e6, 0, 0, -0.75, Math.PI / 2, 0, 0, 1, 16);                         // the white body
      P.cyl(0.02, 0.13, 0.45, 0xd0d3d6, 0, 0, -1.47, -Math.PI / 2, 0, 0, 1, 16);                       // the pointed nose
      P.ball(0.07, 0x1a2a3a, 0, 0, -1.66, 1, 1, 1.2);                                                  // the seeker's glass eye
      P.cyl(0.135, 0.135, 0.06, 0xd03a2a, 0, 0, -1.0, Math.PI / 2, 0, 0, 1, 16);                       // a red warhead band
      for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) P.box(0.02, 0.22, 0.2, 0xb8bcc0, Math.sin(a) * 0.2, Math.cos(a) * 0.2, -1.12, 0, 0, a);   // the steering fins
    } else {
      P.cyl(0.2, 0.2, 1.2, 0x2a2e33, 0, 0, -0.8, Math.PI / 2, 0, 0, 1, 16);                           // dark steel body
      P.ball(0.2, 0x2a2e33, 0, 0, -1.4, 1, 1, 1.3);                                                    // rounded warhead nose
      P.cyl(0.205, 0.205, 0.05, 0x8a6a2a, 0, 0, -1.1, Math.PI / 2, 0, 0, 1, 16);                       // a brass band
    }
    const m = new THREE.Mesh(P.build(), VEH_MAT); m.frustumCulled = false; g.add(m); m.position.set(0, -0.3, 0); scene.add(g); FPN[kind] = g;
  }
  const g = FPN[kind]; g.visible = true; g.position.copy(camera.position); g.quaternion.copy(camera.quaternion);
  return g;
}
function fpRing(dir) {   // dir: where you want to go; the ring sits where that is on the screen
  let r = document.getElementById('fpRing');
  if (!r) { r = document.createElement('div'); r.id = 'fpRing'; r.style.cssText = 'position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border:3px solid rgba(255,90,60,.9);border-radius:50%;pointer-events:none;z-index:6;box-shadow:0 0 6px rgba(0,0,0,.6)'; document.body.appendChild(r); }
  camera.updateMatrixWorld(true);   // the camera just moved: refresh its matrices before projecting
  const v = camera.position.clone().addScaledVector(dir, 200).project(camera);
  if (v.z > 1) { r.style.display = 'none'; return; }
  r.style.display = 'block'; r.style.left = (clamp(v.x, -0.95, 0.95) * 0.5 + 0.5) * innerWidth + 'px'; r.style.top = (-clamp(v.y, -0.95, 0.95) * 0.5 + 0.5) * innerHeight + 'px';
}
function guidedWanted() { return !MC && player.alive; }
function fireGuidedMissile(from, dir, opts = {}) {
  dir = dir.clone().normalize();
  spawnRocket(from, dir, player, { speed: opts.speed || 110, dmg: opts.dmg || 300, radius: opts.radius || 7 });
  const pr = projectiles[projectiles.length - 1];
  pr.steer = true; pr.homing = false; pr.target = null; pr.life = opts.life || 10; pr.mesh.scale.setScalar(1.8);
  MC = { mode: 'fly', pr, yaw: Math.atan2(-dir.x, -dir.z), pitch: Math.asin(clamp(dir.y, -1, 1)), rightUp: !mouse.right, name: opts.name || 'Guided missile' };
  playAt('rocket', from);
  return pr;
}
// called from updateProjectiles for a missile someone is riding: turn toward where you look, burst near aircraft
function steerMissile(pr, dt) {
  if (MC && MC.pr === pr && MC.mode === 'fly') {
    const want = new THREE.Vector3(-Math.sin(MC.yaw) * Math.cos(MC.pitch), Math.sin(MC.pitch), -Math.cos(MC.yaw) * Math.cos(MC.pitch));
    // a little help: an enemy aircraft almost dead ahead pulls the missile onto it
    let best = null, bc = 0.94;
    const pos = pr.mesh.position, cur = pr.vel.clone().normalize();
    for (const t of planes.filter(p => p.alive && p.team !== pr.owner.team && !p.onGround).concat(gvehicles.filter(v => v.alive && v.T.heli && v.team !== pr.owner.team && v.airborne))) {
      const to = t.pos.clone().sub(pos), d = to.length(); if (d > 350) continue;
      const c = to.normalize().dot(cur); if (c > bc) { bc = c; best = to; }
    }
    if (best) want.lerp(best, 0.6).normalize();
    const sp = pr.vel.length(), ang = cur.angleTo(want), maxA = dt * 2.3;
    if (ang > 1e-4) cur.lerp(want, Math.min(1, maxA / ang)).normalize();
    pr.vel.copy(cur).multiplyScalar(sp); pr.mesh.lookAt(pos.clone().add(pr.vel));
  }
  if (pr.ghost) return false;
  const pos = pr.mesh.position;
  for (const pl of planes) if (pl.alive && pl.team !== pr.owner.team && pl.pos.distanceTo(pos) < 8) { const at = pos.clone(); if (MC && MC.pr === pr) MC.what = 'plane'; removeProjectile(pr); damagePlane(pl, pr.dmg, pr.owner); explosion(at, pr.radius, 34, pr.owner, pr.dmg); return true; }
  for (const v of gvehicles) if (v.alive && v.T.heli && v.team !== pr.owner.team && v.airborne && v.pos.distanceTo(pos) < 8) { const at = pos.clone(); if (MC && MC.pr === pr) MC.what = 'helicopter'; removeProjectile(pr); damageVehicle(v, pr.dmg * 2, pr.owner); explosion(at, pr.radius, 34, pr.owner, pr.dmg); return true; }
  return false;
}
// when the missile you ride is gone, switch to the side view of the blast
const _rmProj = removeProjectile;
removeProjectile = function (pr) {
  if (MC && MC.pr === pr && MC.mode === 'fly') {
    const d = pr.vel.clone().normalize();
    const P = pr.mesh.position.clone();
    MC = { mode: 'hit', p: P, dir: d, t: 0, what: MC.what, rightUp: !mouse.right, puffT: 0 };
    if (typeof fxExplosion === 'function') fxExplosion(P, 10);   // a big fireball for the camera to watch
  }
  return _rmProj.apply(this, arguments);
};
function endMissileCam() { MC = null; fpNose(null); for (const id of ['crosshair', 'slots']) { const e = document.getElementById(id); if (e) e.style.visibility = ''; } const el = document.getElementById('msHud'); if (el) el.style.display = 'none'; }
// runs just before the frame is drawn, after every other camera has had its turn
function missileCamera(dt) {
  if (!MC) return;
  if (!player.alive || !started) { endMissileCam(); return; }
  let el = document.getElementById('msHud');
  if (!el) { el = document.createElement('div'); el.id = 'msHud'; el.className = 'hud'; el.style.cssText = 'position:fixed;left:50%;top:14%;transform:translateX(-50%);background:rgba(0,0,0,.55);color:#fff;padding:6px 14px;border-radius:8px;font:600 14px system-ui,sans-serif;pointer-events:none;text-align:center;z-index:5'; document.body.appendChild(el); }
  el.style.display = 'block';
  for (const id of ['crosshair', 'slots']) { const e = document.getElementById(id); if (e) e.style.visibility = 'hidden'; }
  if (!mouse.right) MC.rightUp = true;
  const back = MC.rightUp && mouse.right;
  const fov = SET.fov || 75; if (Math.abs(camera.fov - fov) > 0.1) { camera.fov = fov; camera.updateProjectionMatrix(); }
  if (MC.mode === 'fly') {
    const pr = MC.pr; if (!projectiles.includes(pr)) { endMissileCam(); return; }
    mouse.left = false;   // no shooting while you steer
    const p = pr.mesh.position, d = pr.vel.clone().normalize();
    camera.position.copy(p).addScaledVector(d, 0.6);                       // on the missile, looking down its nose
    camera.up.set(0, 1, 0); camera.lookAt(camera.position.clone().add(d));
    if (camShake > 0) camera.rotation.z += (Math.random() - 0.5) * camShake;
    pr.mesh.visible = false; fpNose('missile');
    fpRing(new THREE.Vector3(-Math.sin(MC.yaw) * Math.cos(MC.pitch), Math.sin(MC.pitch), -Math.cos(MC.yaw) * Math.cos(MC.pitch)));
    el.innerHTML = `${MC.name} &nbsp; ${Math.max(0, pr.life).toFixed(0)}s of fuel &nbsp; height ${Math.max(0, Math.round(p.y - Math.max(WATER_Y, heightAt(p.x, p.z))))} m<br><span style="opacity:.8">Move the mouse to put the nose on the red ring's target &nbsp; right click to go back</span>`;
    if (back) { pr.mesh.visible = true; endMissileCam(); }
  } else {
    fpNose(null);
    MC.t += dt; MC.puffT -= dt;
    if (MC.puffT <= 0 && MC.t < 2.2) { MC.puffT = 0.12; const q = MC.p.clone().add(new THREE.Vector3(rand(-2, 2), MC.t * 3 + rand(0, 2), rand(-2, 2))); smokePuff(q, MC.t < 0.6 ? 0xff8a30 : 0x3a3a3a, 3 + MC.t * 1.5, 4, 2); }   // fire, then a column of black smoke
    let s = new THREE.Vector3(MC.dir.z, 0, -MC.dir.x); if (s.lengthSq() < 0.01) s.set(1, 0, 0); s.normalize();
    const R = 30 + MC.t * 4, P = MC.p;
    camera.position.set(P.x + s.x * R - MC.dir.x * 8, P.y + 5 + MC.t * 1.5, P.z + s.z * R - MC.dir.z * 8);
    const g = Math.max(WATER_Y, heightAt(camera.position.x, camera.position.z)); if (camera.position.y < g + 2) camera.position.y = g + 2;
    camera.lookAt(P.x, P.y + 2, P.z);
    el.innerHTML = MC.what === 'plane' ? 'Direct hit on a plane!' : MC.what === 'helicopter' ? 'Direct hit on a helicopter!' : 'Missile impact!';
    if (MC.t > 3.2 || back) endMissileCam();
  }
}
