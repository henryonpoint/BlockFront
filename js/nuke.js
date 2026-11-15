// ===================== nuke.js : mini nukes =====================
// Buy one in the shop, press Y and pick a spot from above (like the airstrike). A siren sounds, a bomb on a
// parachute floats down for 6 seconds, then: a blinding flash, a fireball, a shock wave rolling across the
// ground, a huge crater, and a mushroom cloud that rises and hangs over the battlefield. Get clear: it hurts
// everyone close, including you. Your teammates are safe.
const NUKE_R = 48, nukeFx = [];
SFX.siren = (v = 1) => { for (let i = 0; i < 3; i++) { tn('sawtooth', 420, 780, 0.9, 0.07 * v, i * 1.8); tn('sawtooth', 780, 420, 0.9, 0.07 * v, i * 1.8 + 0.9); } };
SFX.nuke = (v = 1) => { SFX.boom(1.4 * v); tn('sine', 60, 18, 3.5, 1.2 * v); nz('lowpass', 300, 4, 0.9 * v); nz('lowpass', 900, 2, 0.5 * v, 1, 0.3); setTimeout(() => { nz('lowpass', 200, 5, 0.6 * v); tn('sine', 45, 25, 4, 0.6 * v); }, 400); };

function openNukeView() {
  if ((player.nukes || 0) <= 0) { showMessage('No mini nukes. Buy one in the shop (B)', 1.6); return; }
  openTopView({ mode: 'nuke', span: 640, blast: NUKE_R, onPick: p => { closeTopView(); launchNuke(p); return true; } });
}
addEventListener('keydown', e => { if (e.code === 'KeyY' && playing && !e.repeat && player.alive && !player.vehicle) openNukeView(); });

function launchNuke(at) {
  if ((player.nukes || 0) <= 0) return;
  player.nukes--;
  showMessage('MINI NUKE INBOUND! GET CLEAR!', 5);
  dropNuke(at, player, false);
  netFx(['nk', teamIdx(player.team), +at.x.toFixed(1), +at.z.toFixed(1)]);
}
function dropNuke(at, owner, ghost, mega) {
  SFX.siren(1);
  const g = new THREE.Group(), p = new Part();
  p.cyl(0.55, 0.55, 2.4, 0xd8c230, 0, 0, 0); p.ball(0.55, 0xd8c230, 0, 1.2, 0); p.cyl(0.55, 0.2, 0.7, 0x2a2a2a, 0, -1.55, 0);
  for (let i = 0; i < 4; i++) p.box(0.06, 0.8, 0.9, 0x2a2a2a, 0, -1.7, 0, 0, i * Math.PI / 2, 0);
  p.box(1.12, 0.5, 0.02, 0x1a1a1a, 0, 0.3, 0.56);
  const m = new THREE.Mesh(p.build(), VEH_MAT); m.castShadow = true; g.add(m);
  const chute = new THREE.Mesh(new THREE.SphereGeometry(3.2, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xe8e2d0, side: THREE.DoubleSide }));
  chute.position.y = 6; g.add(chute);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 5.4, 3), new THREE.MeshBasicMaterial({ color: 0x333333 })); l.position.set(Math.cos(a) * 1.5, 3.5, Math.sin(a) * 1.5); l.rotation.z = Math.cos(a) * 0.5; l.rotation.x = -Math.sin(a) * 0.5; g.add(l); }
  const gy = heightAt(at.x, at.z);
  g.position.set(at.x, gy + 70, at.z); scene.add(g);
  // a red smoke marker at the target
  const mk = new THREE.Mesh(new THREE.RingGeometry(NUKE_R - 1, NUKE_R, 64), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  mk.rotation.x = -Math.PI / 2; mk.position.set(at.x, gy + 0.3, at.z); scene.add(mk);
  nukeFx.push({ kind: 'drop', g, mk, at: new THREE.Vector3(at.x, gy, at.z), t: 0, owner, ghost, mega });
}
function detonateNuke(at, owner, ghost) {
  // the damage: a huge blast, then a second ring further out
  explosion(at.clone().setY(at.y + 1), NUKE_R * 0.55, 160, owner, 1200, ghost);
  explosion(at.clone().setY(at.y + 1), NUKE_R, 120, owner, 260, ghost);
  if (!ghost) for (const v of gvehicles) if (v.alive && v.pos.distanceTo(at) < NUKE_R) damageVehicle(v, 3000, owner);
  if (!ghost) for (const pl of planes) if (pl.alive && pl.pos.distanceTo(at) < NUKE_R + 30) destroyPlane(pl, owner);
  if (typeof makeCrater === 'function') makeCrater(at, NUKE_R, true);
  if (typeof scareAnimals === 'function') scareAnimals(at.x, at.z, 400);
  // the show
  const d = camera.position.distanceTo(at);
  SFX.nuke(clamp(1.3 - d / 900, 0.35, 1.3));
  camShake = Math.max(camShake, clamp(0.6 - d / 800, 0.05, 0.6));
  let fl = document.getElementById('nukeFlash');
  if (!fl) { fl = document.createElement('div'); fl.id = 'nukeFlash'; fl.style.cssText = 'position:fixed;inset:0;background:#fff8e8;pointer-events:none;z-index:40;opacity:0;transition:opacity 2.5s ease-out'; document.body.appendChild(fl); }
  fl.style.transition = 'none'; fl.style.opacity = String(clamp(1.2 - d / 700, 0.25, 1)); void fl.offsetWidth; fl.style.transition = 'opacity 2.5s ease-out'; fl.style.opacity = '0';
  flashLight.position.copy(at).setY(at.y + 30); flashLight.intensity = 8; flashLight.distance = 400;
  const cloud = new THREE.Group(); cloud.position.copy(at); scene.add(cloud);
  const fire = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 1 }));
  cloud.add(fire);
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
  wave.rotation.x = -Math.PI / 2; wave.position.y = 0.8; cloud.add(wave);
  const puffs = [], pg = new THREE.IcosahedronGeometry(1, 1);
  const mk = (role, a, r, h, s) => { const m = new THREE.Mesh(pg, new THREE.MeshLambertMaterial({ color: 0xffa040, emissive: 0x803000, transparent: true, opacity: 0.95, flatShading: true })); m.userData = { role, a, r, h, s, sp: rand(0.6, 1.4) }; cloud.add(m); puffs.push(m); };
  for (let i = 0; i < 14; i++) mk('stem', rand(0, 6.28), rand(0, 3), i / 14, rand(5, 8));            // the column
  for (let i = 0; i < 26; i++) mk('cap', i / 26 * Math.PI * 2, rand(0.6, 1), rand(-0.15, 0.25), rand(9, 14));   // the rolling cap
  for (let i = 0; i < 8; i++) mk('top', rand(0, 6.28), rand(0, 0.5), rand(0.1, 0.4), rand(10, 14));
  for (let i = 0; i < 18; i++) mk('base', i / 18 * Math.PI * 2, 1, 0, rand(6, 9));                   // the dust ring along the ground
  nukeFx.push({ kind: 'cloud', cloud, fire, wave, puffs, t: 0 });
}
function updateNukes(dt) {
  for (let i = nukeFx.length - 1; i >= 0; i--) {
    const f = nukeFx[i]; f.t += f.mega ? dt * 0.5 : dt;   // a mega cloud rises slowly and hangs in the sky
    if (f.kind === 'drop') {
      f.g.position.y -= 11 * dt; f.g.rotation.y += dt * 0.6; f.mk.material.opacity = 0.3 + Math.sin(f.t * 8) * 0.2;
      if (f.g.position.y <= f.at.y + 1.5 || f.t > 7) { scene.remove(f.g); scene.remove(f.mk); nukeFx.splice(i, 1); detonateNuke(f.at, f.owner, f.ghost, f.mega); }
      continue;
    }
    const t = f.t;
    // fireball swells then fades into the cloud
    const fr = Math.min(1, t / 1.2);
    f.fire.scale.setScalar(4 + fr * 26); f.fire.position.y = 6 + t * 7; f.fire.material.opacity = Math.max(0, 1 - t / 3);
    f.fire.material.color.setHSL(0.1 - Math.min(0.08, t * 0.03), 1, 0.7 - Math.min(0.3, t * 0.1));
    // shock wave across the ground
    const wr = Math.min(NUKE_R * 3.5, t * 140); f.wave.scale.setScalar(wr); f.wave.material.opacity = Math.max(0, 0.8 - t / 2.4);
    // the mushroom: column climbs, cap rolls outward, colours go from fire to smoke
    const rise = Math.min(1, t / 9), H = 20 + rise * 95, fade = t > 22 ? Math.max(0, 1 - (t - 22) / 10) : 1;
    const heat = Math.max(0, 1 - t / 7);
    for (const m of f.puffs) {
      const u = m.userData, roll = t * 0.4 * u.sp;
      if (u.role === 'stem') { m.position.set(Math.cos(u.a) * u.r, u.h * H * 0.92, Math.sin(u.a) * u.r); m.scale.setScalar(u.s * (0.5 + rise * 0.7)); }
      else if (u.role === 'cap') { const R = 8 + rise * 26; m.position.set(Math.cos(u.a + roll * 0.2) * R * u.r, H + u.h * 20 + Math.sin(roll + u.a * 3) * 3, Math.sin(u.a + roll * 0.2) * R * u.r); m.scale.setScalar(u.s * (0.4 + rise * 0.9)); }
      else if (u.role === 'top') { m.position.set(Math.cos(u.a) * u.r * 14, H + 10 + u.h * 20, Math.sin(u.a) * u.r * 14); m.scale.setScalar(u.s * (0.4 + rise * 0.9)); }
      else { const R = Math.min(NUKE_R * 1.4, 10 + t * 30); m.position.set(Math.cos(u.a) * R, 3 + Math.min(4, t), Math.sin(u.a) * R); m.scale.setScalar(u.s * Math.min(1, 0.4 + t * 0.3)); }
      m.rotation.y += dt * 0.2 * u.sp;
      m.material.color.setRGB(lerp(0.42, 1, heat), lerp(0.38, 0.62, heat), lerp(0.34, 0.22, heat));
      m.material.emissive.setRGB(0.5 * heat, 0.18 * heat, 0);
      m.material.opacity = (u.role === 'base' ? Math.max(0, 0.9 - t / 6) : 0.95) * fade;   /* the ground dust clears quickly; the mushroom stays */
    }
    if (t > 32) { scene.remove(f.cloud); f.puffs.forEach(m => m.material.dispose()); nukeFx.splice(i, 1); }
  }
}

// radiation: after a nuke a glowing green zone lingers, slowly hurting anyone inside it, then fades away
const RADZ = [];
function addRadiation(at, r, life, dps) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x7dff4a, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.scale.setScalar(r); m.position.set(at.x, heightAt(at.x, at.z) + 1, at.z); m.renderOrder = 3; scene.add(m);
  const edge = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64), new THREE.MeshBasicMaterial({ color: 0x9dff5a, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
  edge.rotation.x = -Math.PI / 2; edge.scale.setScalar(r); edge.position.copy(m.position); scene.add(edge);
  RADZ.push({ x: at.x, z: at.z, r, life, t: 0, dps, m, edge, hurtT: 0 });
}
function updateRadiation(dt) {
  const host = !net.active || net.isHost;
  for (let i = RADZ.length - 1; i >= 0; i--) {
    const z = RADZ[i]; z.t += dt;
    const k = Math.max(0, 1 - z.t / z.life); z.m.material.opacity = 0.16 * k + Math.sin(z.t * 3) * 0.03 * k; z.edge.material.opacity = 0.5 * k;
    z.m.position.y = z.edge.position.y = heightAt(z.x, z.z) + 1;
    if (z.t >= z.life) { scene.remove(z.m); scene.remove(z.edge); RADZ.splice(i, 1); continue; }
    z.hurtT -= dt; if (z.hurtT > 0) continue; z.hurtT = 1;
    for (const c of chars) {
      if (!c.alive || c.isRemote || (!host && !c.isPlayer) || c.vehicle) continue;
      if (Math.hypot(c.pos.x - z.x, c.pos.z - z.z) > z.r) continue;
      damage(c, z.dps * (0.4 + 0.6 * k), null, new THREE.Vector3(0, 1, 0), 0);
      if (c.isPlayer && !CHEAT.god) { showMessage('RADIATION! Get out of the green zone', 1); if (typeof tn === 'function' && actx) for (let j = 0; j < 4; j++) tn('square', rand(2000, 4000), rand(2000, 4000), 0.02, 0.05, j * 0.05); }
    }
  }
}
