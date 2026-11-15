// ===================== chars.js : blocky soldiers, damage, effects, explosions =====================
const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#d4a373'];
const NAMES = ['Ace', 'Bolt', 'Brick', 'Comet', 'Dash', 'Echo', 'Flint', 'Ghost', 'Hawk', 'Jet', 'Kodiak', 'Lynx', 'Maverick', 'Nova', 'Onyx', 'Pike', 'Quake', 'Rex', 'Rook', 'Sarge', 'Tank', 'Viper', 'Wolf', 'Zed', 'Blaze', 'Rocket', 'Scout', 'Moose', 'Fox', 'Titan'];
const faceMats = {};
function faceMat(skin) {
  if (faceMats[skin]) return faceMats[skin];
  const c = document.createElement('canvas'); c.width = c.height = 8;
  const g = c.getContext('2d');
  g.fillStyle = skin; g.fillRect(0, 0, 8, 8);
  g.fillStyle = '#ffffff'; g.fillRect(1, 3, 2, 1); g.fillRect(5, 3, 2, 1);
  g.fillStyle = '#2b1d14'; g.fillRect(2, 3, 1, 1); g.fillRect(5, 3, 1, 1);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(3, 6, 2, 1);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  return (faceMats[skin] = new THREE.MeshLambertMaterial({ map: t }));
}
const CHAR_MATS = {
  blue: { shirt: new THREE.MeshLambertMaterial({ color: 0x2f6fe0 }), vest: new THREE.MeshLambertMaterial({ color: 0x1f4fa8 }), pants: new THREE.MeshLambertMaterial({ color: 0x2b3a55 }), helmet: new THREE.MeshLambertMaterial({ color: 0x23488f }), pack: new THREE.MeshLambertMaterial({ color: 0x4a5a3a }) },
  red: { shirt: new THREE.MeshLambertMaterial({ color: 0xd93a3a }), vest: new THREE.MeshLambertMaterial({ color: 0xa82525 }), pants: new THREE.MeshLambertMaterial({ color: 0x55302b }), helmet: new THREE.MeshLambertMaterial({ color: 0x8f2323 }), pack: new THREE.MeshLambertMaterial({ color: 0x5a4a3a }) },
  boot: new THREE.MeshLambertMaterial({ color: 0x1f1a16 }),
  goggle: new THREE.MeshPhongMaterial({ color: 0x223344, shininess: 80 }),
  gun: new THREE.MeshLambertMaterial({ color: 0x24262a }),
  tube: new THREE.MeshLambertMaterial({ color: 0x55602a }),
};
function bx(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m;
}
function makeCharacter(team, role) {
  const M = CHAR_MATS[team], skin = pick(SKINS);
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.2, 0.95, 0); legR.position.set(0.2, 0.95, 0); body.add(legL, legR);
  for (const leg of [legL, legR]) { bx(0.36, 0.8, 0.38, M.pants, 0, -0.4, 0, leg).castShadow = true; bx(0.38, 0.2, 0.46, CHAR_MATS.boot, 0, -0.85, 0.04, leg); }
  bx(0.82, 0.85, 0.46, M.shirt, 0, 1.37, 0, body).castShadow = true;
  bx(0.86, 0.55, 0.5, M.vest, 0, 1.45, 0, body);
  bx(0.84, 0.1, 0.48, CHAR_MATS.boot, 0, 1.0, 0, body);
  bx(0.6, 0.62, 0.26, M.pack, 0, 1.42, -0.37, body);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.62, 8), M.pants); roll.rotation.z = Math.PI / 2; roll.position.set(0, 1.8, -0.4); body.add(roll);
  for (const px of [-0.24, 0, 0.24]) bx(0.16, 0.2, 0.1, M.pack, px, 1.22, 0.27, body);
  const nm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10), new THREE.MeshBasicMaterial({ color: ({ blue: 0x9fc4ff, red: 0xffb0b0, green: 0xa8f0b8, yellow: 0xfff0a0 })[team] || 0xffffff })); nm.rotation.z = Math.PI / 2; nm.position.set(-0.43, 1.62, 0); body.add(nm);
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.56, 1.72, 0); armR.position.set(0.56, 1.72, 0); body.add(armL, armR);
  for (const arm of [armL, armR]) { bx(0.3, 0.62, 0.32, M.shirt, 0, -0.3, 0, arm); const h = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), skinMat); h.position.y = -0.72; h.scale.set(1, 1.2, 1); arm.add(h); }
  const head = new THREE.Group(); head.position.y = 1.8; body.add(head);
  const fm = faceMat(skin);
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), [skinMat, skinMat, skinMat, skinMat, fm, skinMat]);
  headMesh.position.y = 0.3; headMesh.castShadow = true; head.add(headMesh);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.43, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.helmet);
  helm.position.y = 0.52; helm.scale.set(1, 0.85, 1.05); helm.castShadow = true; head.add(helm);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.47, 0.06, 12), M.helmet); rim.position.y = 0.53; head.add(rim);
  const strap = bx(0.62, 0.05, 0.05, CHAR_MATS.boot, 0, 0.12, 0.28, head);
  if (Math.random() < 0.5) { const gog = bx(0.5, 0.12, 0.08, CHAR_MATS.goggle, 0, 0.68, 0.36, head); gog.rotation.x = -0.3; }
  // weapon in right hand (local -y points forward when arm is raised)
  const gun = new THREE.Group(); armR.add(gun); gun.position.set(0, -0.8, 0.12);
  if (role === 'rocket') { const t = bx(0.22, 1.3, 0.22, CHAR_MATS.tube, 0, -0.3, 0.12, gun); bx(0.26, 0.3, 0.26, CHAR_MATS.gun, 0, -0.95, 0.12, gun); }
  else if (role === 'sniper') { bx(0.1, 1.35, 0.14, CHAR_MATS.gun, 0, -0.35, 0, gun); bx(0.1, 0.35, 0.1, CHAR_MATS.gun, 0, -0.1, 0.12, gun); }
  else { bx(0.12, 0.85, 0.16, CHAR_MATS.gun, 0, -0.2, 0, gun); bx(0.08, 0.18, 0.2, CHAR_MATS.gun, 0, -0.05, -0.15, gun); }
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, role === 'sniper' ? -1.05 : -0.65, 0.05); gun.add(muzzle);
  headMesh.userData.head = true;
  return { root, body, legL, legR, armL, armR, head, headMesh, gun, muzzle };
}

function nameTag(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 34px system-ui, sans-serif'; const w = Math.min(250, g.measureText(text).width + 24);
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); if (g.roundRect) g.roundRect(128 - w / 2, 8, w, 48, 12); else g.rect(128 - w / 2, 8, w, 48); g.fill();
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 33);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  sp.scale.set(2.6, 0.65, 1); sp.renderOrder = 20; sp.raycast = () => { }; return sp;
}
const chars = [];
class Char {
  constructor(team, isPlayer = false, role = 'rifle') {
    this.team = team; this.isPlayer = isPlayer; this.role = role;
    this.name = isPlayer ? 'You' : pick(NAMES);
    this.hp = 100; this.armor = 0; this.alive = false;
    this.pos = new THREE.Vector3(); this.heading = 0; this.vel = new THREE.Vector3();
    this.kills = 0; this.deaths = 0; this.respawnT = 0;
    this.vehicle = null; this.turret = null;
    if (!isPlayer) {
      this.model = makeCharacter(team, role);
      this.model.root.traverse(o => { if (o.isMesh) o.userData.char = this; });
      this.model.root.visible = false;
      scene.add(this.model.root);
    }
    chars.push(this);
  }
  chest() { return new THREE.Vector3(this.pos.x, this.pos.y + (this.crouch ? 0.9 : 1.35), this.pos.z); }
  eye() { return new THREE.Vector3(this.pos.x, this.pos.y + (this.crouch ? 1.1 : 1.65), this.pos.z); }
}

// ---------- effects ----------
const effects = [];
function addEffect(obj, life, update) { scene.add(obj); effects.push({ obj, life, max: life, update }); }
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const scorchGeo = new THREE.CircleGeometry(1, 12);
const unitSphere = new THREE.SphereGeometry(1, 10, 8);
const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
const UPV = new THREE.Vector3(0, 1, 0);
function beam(a, b, color, width, life) {
  if (effects.length > 700) return;
  const dir = b.clone().sub(a); const len = dir.length(); if (len < 0.05) return;
  const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.scale.set(width, len, width); m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UPV, dir.normalize());
  addEffect(m, life, (o, t) => { o.material.opacity = 0.85 * (1 - t); });
}
const bullets = [], bulletMats = {};
const bulletGeo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true); bulletGeo.rotateX(Math.PI / 2);
function shootTracer(from, to, color, speed, width, onArrive) {
  const dir = to.clone().sub(from), dist = dir.length();
  if (dist < 0.5) { if (onArrive) onArrive(); return; }
  dir.normalize();
  const mat = bulletMats[color] || (bulletMats[color] = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  const m = new THREE.Mesh(bulletGeo, mat), len = Math.min(3.2, dist * 0.35);
  m.scale.set(width, width, len); m.position.copy(from); m.lookAt(to); scene.add(m);
  if (color !== 0x22e6ff && from.distanceToSquared(camera.position) > 2.2) fxMuzzle(from, dir, width > 0.045 ? 1.8 : 1);
  bullets.push({ m, from: from.clone(), dir, dist, t: 0, speed, onArrive, len, nearPlayer: false });
}
function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]; b.t += b.speed * dt;
    if (b.t >= b.dist) { scene.remove(b.m); bullets.splice(i, 1); if (b.onArrive) b.onArrive(); continue; }
    b.m.position.copy(b.from).addScaledVector(b.dir, Math.max(0, b.t - b.len / 2));
    if (!b.nearPlayer && player.alive && b.m.position.distanceTo(camera.position) < 2.5 && b.from.distanceTo(camera.position) > 6) { b.nearPlayer = true; SFX.whiz(); }
  }
}
function decal(point, normal) {
  if (!normal || effects.length > 600) return;
  const m = new THREE.Mesh(decalGeo, decalMat);
  m.position.copy(point).addScaledVector(normal, 0.03); m.lookAt(point.clone().add(normal));
  addEffect(m, 12, () => { });
}
const decalGeo = new THREE.CircleGeometry(0.07, 6), decalMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
function burst(pos, count, color, speed, life, size) {
  if (effects.length > 600) return;
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(unitBox, new THREE.MeshBasicMaterial({ color, transparent: true }));
    m.scale.setScalar(size * (0.5 + Math.random())); m.position.copy(pos);
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.1, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random()));
    addEffect(m, life * (0.5 + Math.random()), (o, t, dt) => {
      v.y -= 14 * dt; o.position.addScaledVector(v, dt); o.material.opacity = 1 - t;
      const gh = heightAt(o.position.x, o.position.z);
      if (o.position.y < gh + 0.03) { o.position.y = gh + 0.03; v.multiplyScalar(0.4); v.y = Math.abs(v.y); }
    });
  }
}
function smokePuff(pos, color = 0x999999, size = 0.25, life = 0.9, rise = 0.6) {
  if (effects.length > 650) return;
  const m = new THREE.Mesh(unitSphere, new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false }));
  m.position.copy(pos); m.scale.setScalar(size);
  addEffect(m, life, (o, t, dt) => { o.scale.setScalar(size * (1 + t * 3)); o.material.opacity = 0.6 * (1 - t); o.position.y += dt * rise; });
}
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i]; e.life -= dt;
    e.update(e.obj, Math.min(1, 1 - e.life / e.max), dt);
    if (e.life <= 0) { scene.remove(e.obj); if (e.obj.material && e.obj.material !== decalMat) e.obj.material.dispose(); effects.splice(i, 1); }
  }
}

// ---------- damage / death ----------
let camShake = 0;
function damage(c, amount, attacker, dir, force = 4, headshot = false) {
  if (!c.alive || gameOver) return;
  if (attacker && attacker.team === c.team && attacker !== c) return;
  if (c.isPlayer && simTime < (c.protUntil || 0)) return;   // spawn shield
  if (c.isPlayer && typeof godOn === 'function' && godOn()) return;   // god mode: nothing hurts you
  if (c.isPlayer && attacker && !attacker.isPlayer) showHitDir(attacker.pos || attacker.chest && attacker.chest());
  if (c.isPlayer && amount > 3) sfxHurt();
  if (netRoute(c, amount, attacker, dir, force, headshot)) return;
  if (c.armor > 0) { const absorbed = Math.min(c.armor, amount * 0.6); c.armor -= absorbed; amount -= absorbed; }
  c.hp -= amount;
  c.lastAttacker = attacker;
  if (c.isPlayer) onPlayerHurt(amount, attacker);
  if (!c.isPlayer && attacker && attacker !== c) c.alertedBy = attacker;
  if (c.hp <= 0) kill(c, attacker, dir || new THREE.Vector3(0, 0, 1), force, headshot);
}
function kill(c, attacker, dir, force, headshot) {
  if (!c.alive) return;
  if (c.isPlayer && typeof godOn === 'function' && godOn() && !gameOver) { c.hp = 100; return; }
  c.alive = false; c.hp = 0; c.deaths++;
  if (typeof dropAmmo === 'function') dropAmmo(c);
  c.respawnT = c.isPlayer ? 6 : 7 + Math.random() * 3;
  if (c.turret) { c.turret.user = null; c.turret = null; }
  if (c.gv) leaveSeat(c, true);
  if (c.vehicle) { const v = c.vehicle; c.vehicle = null; if (v.pilot === c) v.pilot = null; }
  if (attacker && attacker !== c) {
    attacker.kills++;
    teamKills[attacker.team]++;
    if (attacker === player) { addMoney(headshot ? 150 : 100, headshot ? 'Headshot' : 'Elimination'); SFX.kill(); showHitmarker(true); onPlayerKill(c, headshot); }
  }
  netKill(c, attacker, headshot);
  if (!net.active || net.isHost) addKillfeed(attacker, c, headshot);
  if (c.isPlayer) onPlayerDeath(attacker);
  else startRagdoll(c, dir, force);
}
const ragdolls = [];
function startRagdoll(c, dir, force) {
  const m = c.model;
  const body = new CANNON.Body({ mass: 6, shape: new CANNON.Box(new CANNON.Vec3(0.42, 0.95, 0.25)), linearDamping: 0.1, angularDamping: 0.3 });
  body.position.set(c.pos.x, c.pos.y + 0.97, c.pos.z);
  body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), c.heading);
  const f = Math.min(force, 40);
  body.velocity.set(dir.x * f, Math.max(dir.y * f, 0) + 2 + f * 0.25, dir.z * f);
  body.angularVelocity.set(rand(-3, 3), rand(-2, 2), rand(-3, 3));
  if (undergroundAt(c.pos.x, c.pos.z, c.pos.y)) { body.collisionFilterMask = 1; body.underground = true; }
  world.addBody(body);
  m.body.position.y = -0.97; m.body.rotation.x = 0; limbsStraight(m);
  m.armL.rotation.set(0, 0, -1.2); m.armR.rotation.set(0, 0, 1.2); m.legL.rotation.set(0, 0, -0.25); m.legR.rotation.set(0, 0, 0.25); m.head.rotation.set(0, 0, 0);
  ragdolls.push({ c, body, t: 0 });
}
function updateRagdolls(dt) {
  for (let i = ragdolls.length - 1; i >= 0; i--) {
    const r = ragdolls[i], root = r.c.model.root;
    r.t += dt;
    root.position.copy(r.body.position); root.quaternion.copy(r.body.quaternion);
    if (r.t > 4.5) root.position.y -= (r.t - 4.5) * 1.2;
    if (r.t > 5.5 || r.c.alive) {
      world.removeBody(r.body); ragdolls.splice(i, 1);
      if (!r.c.alive) root.visible = false;
      r.c.model.body.position.y = 0; root.quaternion.identity();
    }
  }
}

// ---------- explosions ----------
function explosion(pos, radius, power, attacker, dmg = 130, ghost = false) {
  if (typeof cityBlast === 'function') cityBlast(pos, radius);
  if (typeof animals !== 'undefined' && animals.length) { scareAnimals(pos.x, pos.z, radius * 7); for (const a of animals) if (a.alive && a.pos.distanceTo(pos) < radius) animalHit(a, 999); }
  playAt('boom', pos, 1.2);
  fxExplosion(pos, radius);
  flashLight.position.copy(pos); flashLight.intensity = 6; flashLight.distance = radius * 5;
  // scorch mark
  const gh = heightAt(pos.x, pos.z);
  if (pos.y - gh < 2) {
    const sc = new THREE.Mesh(scorchGeo, new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.55, depthWrite: false }));
    sc.scale.setScalar(radius * 0.35); sc.rotation.x = -Math.PI / 2; sc.position.set(pos.x, gh + 0.07, pos.z);
    addEffect(sc, 25, (o, t) => { o.material.opacity = 0.55 * (1 - t * t); });
  }
  const p = new CANNON.Vec3(pos.x, pos.y, pos.z);
  for (const pr of props) {
    if (pr.exploded) continue;
    const d = pr.body.position.vsub(p), dd = d.norm(); if (dd > radius) continue;
    const fall = 1 - dd / radius; d.normalize(); d.y += 0.6;
    pr.body.wakeUp();
    const off = new CANNON.Vec3(rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.3, 0.3));
    pr.body.applyImpulse(d.scale(power * fall * Math.min(pr.body.mass, 12) * 0.35), pr.body.position.vadd(off));
    if (pr.kind === 'barrel') setTimeout(() => explodeBarrel(pr, attacker), 120 + Math.random() * 150);
  }
  for (const r of ragdolls) {
    const d = r.body.position.vsub(p), dd = d.norm(); if (dd > radius) continue;
    d.normalize(); d.y += 0.5; r.body.applyImpulse(d.scale(power * (1 - dd / radius) * 1.5), r.body.position);
  }
  netFx(['x', +pos.x.toFixed(1), +pos.y.toFixed(1), +pos.z.toFixed(1), radius], ghost);
  if (!ghost) for (const v of gvehicles) { if (!v.alive) continue; const d = v.pos.distanceTo(pos); if (d < radius + 3) damageVehicle(v, dmg * 2 * (1 - d / (radius + 3)) * v.T.expMult, attacker); }
  for (const c of chars) {
    if (!c.alive || c.vehicle || (c.gv && !c.exposed)) continue;
    const cc = c.chest(); const d = cc.distanceTo(pos); if (d > radius) continue;
    if (!!undergroundAt(pos.x, pos.z, pos.y - 1) !== !!undergroundAt(c.pos.x, c.pos.z, c.pos.y)) continue;
    if (ghost) { if (c.isPlayer && attacker && attacker.team === c.team) pushPlayerFrom(pos, radius, d); continue; }
    if (c.isPlayer && (!attacker || attacker === c || attacker.team === c.team)) { pushPlayerFrom(pos, radius, d); continue; }
    if (attacker && attacker.team === c.team) continue;
    const dir = cc.clone().sub(pos).normalize();
    damage(c, dmg * (1 - d / radius) + 8, attacker, dir, power * (1 - d / radius) * 1.2);
    if (c.isPlayer) pushPlayerFrom(pos, radius, d);
  }
  if (!ghost) for (const pl of planes) if (pl.alive && pl.pos.distanceTo(pos) < radius + 4 && (!attacker || pl.team !== attacker.team)) damagePlane(pl, dmg * 0.8, attacker);
  if (!ghost) damageBuilds(pos, radius, dmg, attacker);
  camShake = Math.max(camShake, clamp(1 - camera.position.distanceTo(pos) / 45, 0, 1) * 0.12);
}
function explodeBarrel(pr, attacker) {
  if (pr.exploded) return;
  pr.exploded = true;
  const pos = new THREE.Vector3().copy(pr.body.position);
  scene.remove(pr.mesh); world.removeBody(pr.body);
  explosion(pos, 7, 30, attacker, 110);
}
