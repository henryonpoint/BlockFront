// ===================== zombies.js : zombie mode (a cheat) and the stealth bomber's mega nuke =====================
// With zombie mode on, computer soldiers killed by a nuke (or by a zombie) climb back up as zombies: grey-green
// skin, glowing red eyes, blood, arms out, hunched and lurching. Zombies are on nobody's side: they chase the
// nearest living person of any team, and everyone they kill becomes a zombie too, so it spreads like a virus.
// Everyone (soldiers and players) can shoot them. The host runs the zombies; other players see them from its data.
const ZOMBIE = { on: false };
let _inNuke = false;
const ZMAT = new THREE.MeshLambertMaterial({ vertexColors: true, color: 0x7a9a5c, emissive: 0x0e1a08 });
const ZEYE = new THREE.MeshBasicMaterial({ color: 0xff2414 });
const ZBLOOD = new THREE.MeshLambertMaterial({ color: 0x5a0a08 });
function zombieLook(n, on) {
  const m = n.model; if (!m || !!m.zLook === on) return;
  m.zLook = on;
  m.root.traverse(o => { if (!o.isMesh || o.userData.zExtra) return; if (on && o.material !== ZMAT) { o.userData.zOld = o.material; o.material = ZMAT; } else if (!on && o.userData.zOld) o.material = o.userData.zOld; });
  if (on) {
    if (!m.zParts) {
      m.zParts = new THREE.Group();
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, 0.03), ZEYE); e.position.set(s * 0.085, 0.13, 0.2); e.userData.zExtra = true; m.zParts.add(e); }   // glowing red eyes
      m.head.add(m.zParts);
      m.zBlood = new THREE.Group();
      for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(rand(0.12, 0.26), rand(0.08, 0.22), 0.04), ZBLOOD); b.position.set(rand(-0.22, 0.22), rand(1.05, 1.6), 0.2 * (Math.random() < 0.6 ? 1 : -1)); b.rotation.z = rand(-0.6, 0.6); b.userData.zExtra = true; m.zBlood.add(b); }
      m.body.add(m.zBlood);
    }
    m.zParts.visible = m.zBlood.visible = true; m.gun.visible = false;
  } else if (m.zParts) { m.zParts.visible = m.zBlood.visible = false; }
}
function makeZombie(n) {
  n.zombie = true; n.zAttackT = 0; n.zTgtT = 0; n.target = null; n.maxHp = 420; n.hp = 420;   // hard to put down: aim for the head
  zombieLook(n, true);
}
function unZombie(n) { n.zombie = false; n.zRiseT = 0; zombieLook(n, false); }

// ---------- who becomes a zombie ----------
const _killZ = kill;
kill = function (c, attacker, dir, force, headshot) {
  const was = c.alive;
  _killZ.apply(this, arguments);
  if (!was || c.alive) return;
  if (c.zombie) { unZombie(c); return; }   // shot dead for good: back to normal at respawn
  if (ZOMBIE.on && !c.isPlayer && !c.isRemote && (!net.active || net.isHost) && (_inNuke || (attacker && attacker.zombie))) {
    c.zRiseT = simTime + rand(2.5, 4.5); c.zDeath = c.pos.clone(); c.respawnT = 999;   // stays down, then gets back up
  }
};
const _spawnZ = spawnChar;
spawnChar = function (c, pref) { if (c.zombie || c.zRiseT) unZombie(c); return _spawnZ.apply(this, arguments); };
// nukes: soldiers they kill can rise again, and the stealth bomber's mega nuke takes out every enemy soldier on the map
const _detZ = detonateNuke;
detonateNuke = function (at, owner, ghost, mega) {
  _inNuke = true;
  try {
    _detZ.call(this, at, owner, ghost);
    if (mega) {   // a giant mushroom cloud, a mega crater, and everything for hundreds of meters is flattened
      const fx = nukeFx[nukeFx.length - 1]; if (fx && fx.kind === 'cloud') { fx.cloud.scale.setScalar(4.5); fx.mega = true; }
      if (typeof makeCrater === 'function') makeCrater(at, NUKE_R * 3, 'mega');
      if (!ghost || !net.active || net.isHost) {
        for (const c of chars) if (c.alive && c.pos.distanceTo(at) < 330) kill(c, owner && owner.team && c !== owner ? owner : null, new THREE.Vector3(c.pos.x - at.x, 4, c.pos.z - at.z).normalize(), 18);
        for (const v of gvehicles) if (v.alive && v.pos.distanceTo(at) < 330) damageVehicle(v, 99999, owner);
        for (const pl of planes) if (pl.alive && pl.pos.distanceTo(at) < 400) destroyPlane(pl, owner);
      }
    }
    if (mega && (!net.active || net.isHost)) {
      for (const n of npcs) if (n.alive && !n.inactive && (!owner || n.team !== owner.team || n.zombie)) kill(n, owner && owner.team ? owner : null, new THREE.Vector3(n.pos.x - at.x, 3, n.pos.z - at.z).normalize(), 12);
    }
  } finally { _inNuke = false; }
  if (mega) megaFlash();
};
function megaFlash() {
  const f = document.createElement('div'); f.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:40;pointer-events:none;transition:opacity 2.5s';
  document.body.appendChild(f); requestAnimationFrame(() => setTimeout(() => { f.style.opacity = '0'; }, 120)); setTimeout(() => f.remove(), 2800);
  showMessage('MEGA NUKE! Every enemy soldier on the map is down', 4); camShake = Math.max(camShake, 0.15);
}

// ---------- zombies move and bite (host or solo) ----------
const _updNpcZ = updateNPC;
updateNPC = function (n, dt) {
  if (n.zombie && n.alive) return zombieThink(n, dt);
  return _updNpcZ.call(this, n, dt);
};
function zombieThink(n, dt) {
  n.zTgtT -= dt;
  if (n.zTgtT <= 0 || !n.target || !n.target.alive || n.target.zombie) {
    n.zTgtT = 0.5; let best = null, bd = 160;
    for (const c of chars) { if (!c.alive || c.zombie || c.inactive || c.vehicle || (c.gv && !c.exposed)) continue; const d = c.pos.distanceTo(n.pos); if (d < bd) { bd = d; best = c; } }
    n.target = best;
  }
  const t = n.target; let speed = 0;
  if (t) {
    const dx = t.pos.x - n.pos.x, dz = t.pos.z - n.pos.z, d = Math.hypot(dx, dz) || 1;
    n.heading = Math.atan2(dx, dz);
    if (d > 1.5) {
      speed = d < 10 ? 6.2 : 4.4;   // lurch, then lunge when close
      const step = speed * dt, nx = n.pos.x + dx / d * step, nz = n.pos.z + dz / d * step, y = n.pos.y;
      if (!blockedAt(nx, nz, y, 0.4)) { n.pos.x = nx; n.pos.z = nz; }
      else if (!blockedAt(nx, n.pos.z, y, 0.4)) n.pos.x = nx;
      else if (!blockedAt(n.pos.x, nz, y, 0.4)) n.pos.z = nz;
      else { n.pos.x += dz / d * step; n.pos.z -= dx / d * step; }   // feel along the wall
    }
    n.zAttackT -= dt;
    if (d < 1.9 && Math.abs(t.pos.y - n.pos.y) < 2 && n.zAttackT <= 0) {
      n.zAttackT = 0.9;
      damage(t, 45, n, new THREE.Vector3(dx / d, 0.3, dz / d), 3);
      playAt('yell', n.pos, 0.7);
      if (typeof netFx === 'function') netFx(['zb', +n.pos.x.toFixed(1), +n.pos.z.toFixed(1)]);
    }
  } else { n.heading += dt * 0.4; }
  n.pos.y = groundAt(n.pos.x, n.pos.z, n.pos.y + 0.5);
  n.vel && n.vel.set(0, 0, 0);
  if (Math.random() < dt * 0.15 && n.pos.distanceTo(player.pos) < 40) zombieMoan(n.pos);
  animateNPC(n, dt, speed, false);
}
function zombieMoan(pos) {
  if (typeof actx === 'undefined' || !actx || typeof tn !== 'function') return;
  const d = pos.distanceTo(camera.position), v = clamp(1 - d / 40, 0, 1) * 0.5; if (v < 0.03) return;
  const f = rand(85, 120); tn('sawtooth', f, f * 0.7, 0.9, 0.06 * v); tn('triangle', f * 2.02, f * 1.4, 0.8, 0.05 * v, 0.05);
}
// the zombie walk: hunched, arms stretched out, a dragging limp, head lolling
const _animZ = animateNPC;
animateNPC = function (n, dt, speed, aiming) {
  if (!n.zombie) { if (n.model && n.model.zLook) zombieLook(n, false); return _animZ.apply(this, arguments); }
  const m = n.model; if (!m.zLook) zombieLook(n, true);
  m.root.position.copy(n.pos); m.root.rotation.y = n.heading;
  n.walkPhase = (isFinite(n.walkPhase) ? n.walkPhase : 0) + speed * dt * 1.7;
  const ph = n.walkPhase, sw = speed > 0.2 ? Math.sin(ph) : 0;
  limbsStraight(m);
  m.body.rotation.x = 0.38 + Math.sin(ph * 0.5) * 0.05; m.body.rotation.z = Math.sin(ph) * 0.08;
  m.legL.rotation.x = sw * 0.55; m.legR.rotation.x = -sw * 0.35; m.shinL.rotation.x = Math.max(0, -sw) * 0.6; m.shinR.rotation.x = 0.25;   // one leg drags
  m.armL.rotation.set(-1.45 + Math.sin(ph * 1.3) * 0.12, 0, 0.1); m.armR.rotation.set(-1.35 + Math.cos(ph * 1.1) * 0.15, 0, -0.12);
  m.head.rotation.set(0.25, Math.sin(ph * 0.4) * 0.3, 0.35 + Math.sin(ph * 0.7) * 0.15);
  m.gun.visible = false;
};
// raising the fallen, and the list of zombies for other players
function updateZombies(dt) {
  if (!net.active || net.isHost) {
    for (const n of npcs) if (!n.alive && n.zRiseT && simTime > n.zRiseT) {
      n.zRiseT = 0; spawnChar(n); if (n.zDeath) { n.pos.copy(n.zDeath); n.pos.y = groundAt(n.pos.x, n.pos.z, n.pos.y + 1); }
      makeZombie(n); burst(n.pos.clone().add(new THREE.Vector3(0, 0.3, 0)), 10, 0x3a2a1a, 3, 0.6, 0.12);
      if (n.pos.distanceTo(player.pos) < 60) zombieMoan(n.pos);
    }
  }
  let zt = document.getElementById('zombieTag');
  const count = npcs.filter(n => n.alive && n.zombie).length;
  if ((ZOMBIE.on || count) && !zt) { zt = document.createElement('div'); zt.id = 'zombieTag'; zt.className = 'hud'; zt.style.cssText = 'position:fixed;top:124px;left:50%;transform:translateX(-50%);color:#9cff7a;font:800 12px system-ui,sans-serif;letter-spacing:.12em;text-shadow:0 1px 3px #000;pointer-events:none'; document.body.appendChild(zt); }
  if (zt) { zt.style.display = ZOMBIE.on || count ? 'block' : 'none'; zt.textContent = `ZOMBIES: ${count}`; }
}
function zombieState() { return npcs.filter(n => n.alive && n.zombie).map(n => n.npcIdx); }
function applyZombies(list) {
  const set = new Set(list || []);
  for (const n of npcs) { const z = set.has(n.npcIdx); if (z !== !!n.zombie) { n.zombie = z; zombieLook(n, z); } }
}
function startOutbreak() {   // the console's "start an outbreak": four soldiers turn at once
  const alive = npcs.filter(n => n.alive && !n.zombie && !n.gv && !n.inactive);
  for (let i = 0; i < 8 && alive.length; i++) makeZombie(alive.splice(Math.floor(Math.random() * alive.length), 1)[0]);
}
