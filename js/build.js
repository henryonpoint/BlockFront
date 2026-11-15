// ===================== build.js : things you can buy and place =====================
const BUILDS = {
  sandbag: { name: 'Sandbag Wall', price: 75, desc: 'Waist-high cover', w: 3.2, d: 1.1, h: 1.15, hp: 400, solid: true },
  barrier: { name: 'Concrete Barrier', price: 120, desc: 'Tall wall that stops bullets', w: 3.2, d: 0.9, h: 2.1, hp: 900, solid: true },
  wire: { name: 'Barbed Wire', price: 60, desc: 'Slows and hurts enemies', w: 4, d: 1.2, h: 0.9, hp: 160 },
  mine: { name: 'Landmine', price: 100, desc: 'Blows up when an enemy steps on it', w: 0.8, d: 0.8, h: 0.15, hp: 40 },
  sentry: { name: 'Sentry Gun', price: 650, desc: 'Shoots enemies all by itself', w: 1.3, d: 1.3, h: 1.5, hp: 320, solid: true },
  ammo: { name: 'Ammo Box', price: 80, desc: 'Stand near it to refill ammo', w: 1.3, d: 0.8, h: 0.75, hp: 150, solid: true },
  med: { name: 'Medical Station', price: 150, desc: 'Heals your team nearby', w: 1.2, d: 1.2, h: 1.4, hp: 220, solid: true },
  pad: { name: 'Jump Pad', price: 120, desc: 'Launches you high into the air', w: 2.2, d: 2.2, h: 0.25, hp: 200 },
};
const BUILD_KEYS = Object.keys(BUILDS);
const builds = [];
let buildSeq = 0;
const BM = {
  bag: new THREE.MeshLambertMaterial({ color: 0xbca679 }), wire: new THREE.MeshLambertMaterial({ color: 0x8a8f94 }),
  mine: new THREE.MeshLambertMaterial({ color: 0x4a5229 }), red: new THREE.MeshBasicMaterial({ color: 0xff2222 }),
  green: new THREE.MeshBasicMaterial({ color: 0x33ff66 }), crossRed: new THREE.MeshLambertMaterial({ color: 0xd32f2f }),
  yellow: new THREE.MeshLambertMaterial({ color: 0xf2c200 }),
};
function makeBuildMesh(type, team) {
  const g = new THREE.Group(), T = TEAM_COLOR[team];
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  if (type === 'sandbag') {
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - (r === 2 ? 1 : 0); i++) {
      const b = add(new THREE.SphereGeometry(0.5, 10, 6), BM.bag, -1.2 + i * 0.8 + (r % 2) * 0.4, 0.22 + r * 0.36, 0);
      b.scale.set(0.85, 0.42, 0.95);
    }
  } else if (type === 'barrier') {
    const s = new THREE.Shape(); s.moveTo(-0.45, 0); s.lineTo(0.45, 0); s.lineTo(0.2, 0.5); s.lineTo(0.15, 2.1); s.lineTo(-0.15, 2.1); s.lineTo(-0.2, 0.5); s.lineTo(-0.45, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 3.2, bevelEnabled: false }); geo.translate(0, 0, -1.6); geo.rotateY(Math.PI / 2);
    add(geo, MATS.concrete, 0, 0, 0);
    add(new THREE.BoxGeometry(3.2, 0.15, 0.32), new THREE.MeshLambertMaterial({ color: T }), 0, 1.6, 0);
  } else if (type === 'wire') {
    for (const x of [-1.9, 0, 1.9]) add(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 5), MATS.darkWood, x, 0.5, 0);
    for (let i = 0; i < 9; i++) add(new THREE.TorusGeometry(0.42, 0.02, 4, 12), BM.wire, -1.8 + i * 0.45, 0.45, 0, 0, Math.PI / 2 + 0.25, 0);
  } else if (type === 'mine') {
    add(new THREE.CylinderGeometry(0.32, 0.36, 0.12, 12), BM.mine, 0, 0.04, 0);
    add(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), MATS.steel, 0, 0.12, 0);
    add(new THREE.SphereGeometry(0.035, 6, 4), team === player.team ? BM.green : BM.red, 0.18, 0.12, 0);
  } else if (type === 'sentry') {
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; add(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 6), MATS.black, Math.sin(a) * 0.35, 0.5, Math.cos(a) * 0.35, Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4); }
    const head = new THREE.Group(); head.position.y = 1.05; g.add(head);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.7), MATS.olive); hb.castShadow = true; head.add(hb);
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 8), MATS.black); br.rotation.x = Math.PI / 2; br.position.z = -0.7; head.add(br);
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.08, 0.72), new THREE.MeshLambertMaterial({ color: T })); st.position.y = 0.12; head.add(st);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), BM.red); eye.position.set(0.15, 0.08, -0.36); head.add(eye);
    const mz = new THREE.Object3D(); mz.position.z = -1.15; head.add(mz);
    g.userData.head = head; g.userData.muzzle = mz;
  } else if (type === 'ammo') {
    add(new THREE.BoxGeometry(1.2, 0.6, 0.7), MATS.olive, 0, 0.32, 0);
    add(new THREE.BoxGeometry(1.22, 0.12, 0.72), BM.yellow, 0, 0.45, 0);
    for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8), BM.yellow, -0.2 + i * 0.2, 0.72, 0);
  } else if (type === 'med') {
    add(new THREE.BoxGeometry(1.0, 0.9, 1.0), MATS.white, 0, 0.45, 0);
    for (const z of [-0.51, 0.51]) { add(new THREE.BoxGeometry(0.5, 0.15, 0.02), BM.crossRed, 0, 0.5, z); add(new THREE.BoxGeometry(0.15, 0.5, 0.02), BM.crossRed, 0, 0.5, z); }
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), MATS.steel, 0.35, 1.2, 0);
    add(new THREE.SphereGeometry(0.1, 8, 6), BM.green, 0.35, 1.52, 0);
  } else if (type === 'pad') {
    add(new THREE.CylinderGeometry(1.1, 1.2, 0.22, 20), MATS.steel, 0, 0.11, 0);
    const ring = add(new THREE.TorusGeometry(0.75, 0.08, 6, 24), new THREE.MeshBasicMaterial({ color: T }), 0, 0.24, 0, Math.PI / 2);
    add(new THREE.ConeGeometry(0.3, 0.4, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 0.3, 0);
    g.userData.ring = ring;
  }
  return g;
}
function buildBox(b) {
  const D = BUILDS[b.type], odd = b.rot % 2 === 1, hw = (odd ? D.d : D.w) / 2, hd = (odd ? D.w : D.d) / 2;
  return { minX: b.x - hw, maxX: b.x + hw, minZ: b.z - hd, maxZ: b.z + hd };
}
function createBuild(type, x, z, rot, team, owner, id) {
  const D = BUILDS[type];
  const y = Math.min(heightAt(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, c]) => heightAt(x + a * D.w / 2, z + c * D.d / 2)));
  const mesh = makeBuildMesh(type, team);
  mesh.position.set(x, y - 0.02, z); mesh.rotation.y = rot * Math.PI / 2; scene.add(mesh);
  const b = { id, type, x, z, y, rot, team, owner, mesh, hp: D.hp, fireT: 0, healT: 0, yaw: rot * Math.PI / 2, ownerChar: null };
  mesh.traverse(o => { if (o.isMesh) o.userData.build = b; });
  if (D.solid) {
    const bb = buildBox(b);
    b.collider = { kind: 'box', ...bb, minY: y - 0.3, maxY: y + D.h, los: type !== 'sentry' && type !== 'ammo' };
    obstacles.push(b.collider); gridAdd(b.collider, bb.minX, bb.maxX, bb.minZ, bb.maxZ);
    b.body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3((bb.maxX - bb.minX) / 2, D.h / 2, (bb.maxZ - bb.minZ) / 2)) });
    b.body.position.set(x, y + D.h / 2, z); world.addBody(b.body);
  }
  builds.push(b);
  return b;
}
function removeBuild(b) {
  const i = builds.indexOf(b); if (i < 0) return;
  builds.splice(i, 1); scene.remove(b.mesh);
  if (b.collider) {
    const k = obstacles.indexOf(b.collider); if (k >= 0) obstacles.splice(k, 1);
    for (let cx = Math.floor(b.collider.minX / CG); cx <= Math.floor(b.collider.maxX / CG); cx++)
      for (let cz = Math.floor(b.collider.minZ / CG); cz <= Math.floor(b.collider.maxZ / CG); cz++) {
        const a = colGrid.get(cgKey(cx, cz)); if (a) { const j = a.indexOf(b.collider); if (j >= 0) a.splice(j, 1); }
      }
  }
  if (b.body) world.removeBody(b.body);
}
function buildMeshes() { return builds.map(b => b.mesh); }
function myBuilds() { return builds.filter(b => b.owner === 'me'); }
function damageBuild(b, amt, attacker) {
  if (attacker && attacker.team === b.team) return;
  if (b.owner !== 'me' && net.active) { netBuildHit(b, amt); return; }
  if (b.owner !== 'me' && !net.active) return;
  b.hp -= amt;
  if (b.hp <= 0) destroyBuild(b);
}
function destroyBuild(b) {
  const pos = new THREE.Vector3(b.x, b.y + 0.5, b.z);
  burst(pos, 14, 0x8a7a5a, 7, 0.9, 0.12); smokePuff(pos, 0x777777, 0.6, 1.2);
  if (b.type === 'mine') explosion(pos, 6, 30, b.ownerChar || player, 140);
  removeBuild(b);
}
function damageBuilds(pos, radius, dmg, attacker) {
  for (const b of [...builds]) {
    const d = Math.hypot(b.x - pos.x, b.z - pos.z); if (d > radius) continue;
    if (b.type === 'mine' && b.owner === 'me') continue;
    damageBuild(b, dmg * (1 - d / radius) * 1.5, attacker);
  }
}

// ---------- placement mode ----------
let placing = null;
function startPlacing(type) {
  cancelPlace();
  const ghost = makeBuildMesh(type, player.team);
  const mat = new THREE.MeshBasicMaterial({ color: 0x33ff66, transparent: true, opacity: 0.45, depthWrite: false });
  ghost.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; } });
  scene.add(ghost);
  placing = { type, ghost, mat, rot: Math.round(((-player.yaw / (Math.PI / 2)) % 4 + 4) % 4), valid: false, x: 0, z: 0 };
  showMessage(`Placing ${BUILDS[type].name}: click to place, R to rotate, right click to cancel`, 3);
}
function cancelPlace() { if (placing) { scene.remove(placing.ghost); placing = null; } }
function placingKey(e) {
  if (e.code === 'KeyR') placing.rot = (placing.rot + 1) % 4;
  if (e.code === 'Escape' || e.code === 'KeyQ') cancelPlace();
  if (e.code === 'KeyV') { const n = nextInventory(placing.type); if (n) startPlacing(n); }
}
function updatePlacing() {
  if (!placing) return;
  const dir = aimDir(0);
  const hit = rayHit(camera.position, dir, 9, player.team, { noChars: true });
  let p;
  if (hit && hit.terrain) p = hit.point;
  else { p = camera.position.clone().addScaledVector(new THREE.Vector3(dir.x, 0, dir.z).normalize(), hit ? Math.min(hit.dist, 6) : 6); p.y = heightAt(p.x, p.z); }
  placing.x = p.x; placing.z = p.z;
  const D = BUILDS[placing.type], tmp = { type: placing.type, x: p.x, z: p.z, rot: placing.rot }, bb = buildBox(tmp);
  let ok = !undergroundAt(player.pos.x, player.pos.z, player.pos.y) && Math.abs(p.x) < EDGE - 6 && Math.abs(p.z) < EDGE - 6 && waterDepth(p.x, p.z) === 0;
  const corners = [[bb.minX, bb.minZ], [bb.maxX, bb.minZ], [bb.minX, bb.maxZ], [bb.maxX, bb.maxZ]].map(([x, z]) => heightAt(x, z));
  if (Math.max(...corners) - Math.min(...corners) > 1.4) ok = false;
  const gy = heightAt(p.x, p.z);
  for (const o of nearbyColliders(p.x, p.z)) {
    if (o.kind === 'box') { if (bb.maxX > o.minX && bb.minX < o.maxX && bb.maxZ > o.minZ && bb.minZ < o.maxZ && o.maxY > gy + 0.2) ok = false; }
    else if (o.x > bb.minX - o.r && o.x < bb.maxX + o.r && o.z > bb.minZ - o.r && o.z < bb.maxZ + o.r) ok = false;
  }
  if (TEAMS.some(t => t !== player.team && Math.hypot(p.x - BASES[t].x, p.z - BASES[t].z) < 55)) ok = false;
  if (D.solid && Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < 1.2) ok = false;
  placing.valid = ok;
  placing.mat.color.setHex(ok ? 0x33ff66 : 0xff3333);
  placing.ghost.position.set(p.x, Math.min(...corners), p.z); placing.ghost.rotation.y = placing.rot * Math.PI / 2;
}
function confirmPlace() {
  if (!placing) return;
  if (!placing.valid) { showMessage("Can't build there", 1); return; }
  const type = placing.type;
  if (!player.inventory[type]) { cancelPlace(); return; }
  player.inventory[type]--;
  const mine = myBuilds();
  if (mine.length >= 30) removeBuild(mine[0]);
  if (type === 'sentry' && mine.filter(b => b.type === 'sentry').length >= 2) removeBuild(mine.find(b => b.type === 'sentry'));
  const b = createBuild(type, placing.x, placing.z, placing.rot, player.team, 'me', `${net.myId}-${++buildSeq}`);
  b.ownerChar = player;
  SFX.build();
  if (player.inventory[type] > 0) startPlacing(type);
  else { const n = nextInventory(type); if (n) startPlacing(n); else cancelPlace(); }
}
function nextInventory(after) {
  const ks = BUILD_KEYS.filter(k => player.inventory[k] > 0);
  if (!ks.length) return null;
  const i = ks.indexOf(after);
  return ks[(i + 1) % ks.length];
}

// ---------- what builds do each frame ----------
function buildEffectsOnChar(c, dt) {
  if (!c.alive) return;
  c.slowT = Math.max(0, (c.slowT || 0) - dt);
  for (const b of builds) {
    const dx = c.pos.x - b.x, dz = c.pos.z - b.z;
    if (Math.abs(dx) > 5 || Math.abs(dz) > 5) continue;
    if (b.type === 'wire' && b.team !== c.team) {
      const bb = buildBox(b);
      if (c.pos.x > bb.minX && c.pos.x < bb.maxX && c.pos.z > bb.minZ && c.pos.z < bb.maxZ) {
        c.slowT = 0.4; c.wireT = (c.wireT || 0) - dt;
        if (c.wireT <= 0) { c.wireT = 0.5; damage(c, 5, b.ownerChar, null, 0); }
      }
    } else if (b.type === 'mine' && b.team !== c.team && Math.hypot(dx, dz) < 1.1 && c.pos.y - b.y < 0.8) {
      SFX.beep(); triggerMine(b);
    } else if (b.type === 'med' && b.team === c.team && Math.hypot(dx, dz) < 4.5) {
      if (c.hp < (c.maxHp || 100)) { c.hp = Math.min(c.maxHp || 100, c.hp + 12 * dt); if (c.isPlayer && Math.random() < dt * 3) burst(c.chest(), 1, 0x44ff66, 1, 0.6, 0.06); }
    } else if (b.type === 'ammo' && b.team === c.team && c.isPlayer && Math.hypot(dx, dz) < 3) {
      c.ammoT = (c.ammoT || 0) - dt;
      if (c.ammoT <= 0) {
        c.ammoT = 1; let any = false;
        WEAPONS.forEach(w => { const a = player.ammo[w.id]; if (a.reserve < w.reserve) { a.reserve = Math.min(w.reserve, a.reserve + w.mag); any = true; } });
        if (player.grenades < 2) { player.grenades++; any = true; }
        if (any) showMessage('Resupplying ammo...', 0.8);
      }
    } else if (b.type === 'pad' && Math.hypot(dx, dz) < 1.1 && c.isPlayer && player.onGround && !c.vehicle) {
      player.velY = 21; player.onGround = false; player.push.add(new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)).multiplyScalar(8));
      SFX.thump(); burst(new THREE.Vector3(b.x, b.y + 0.3, b.z), 8, TEAM_COLOR[b.team], 5, 0.5, 0.08);
    }
  }
}
function triggerMine(b) {
  if (b.triggered) return;
  b.triggered = true;
  const pos = new THREE.Vector3(b.x, b.y + 0.3, b.z);
  if (b.owner === 'me') { removeBuild(b); explosion(pos, 6, 35, player, 150); }
  else { b.mesh.visible = false; explosion(pos, 6, 35, b.ownerChar || { team: b.team, name: 'Landmine', isPlayer: false, kills: 0 }, 150); if (net.active) netBuildHit(b, 9999); else removeBuild(b); }
}
const _sv = new THREE.Vector3();
function updateBuilds(dt) {
  for (const b of builds) {
    if (b.type === 'pad' && b.mesh.userData.ring) b.mesh.userData.ring.rotation.z += dt * 2;
    if (b.type !== 'sentry' || b.owner !== 'me') continue;
    b.fireT -= dt; b.thinkT = (b.thinkT || 0) - dt;
    const eye = new THREE.Vector3(b.x, b.y + 1.1, b.z);
    if (b.thinkT <= 0) {
      b.thinkT = 0.3; b.target = null;
      let bd = 60;
      for (const c of chars) {
        if (!c.alive || c.team === b.team || c.vehicle || c.inactive) continue;
        const d = c.pos.distanceTo(eye); if (d < bd && los(eye, c.chest())) { bd = d; b.target = c; }
      }
    }
    const head = b.mesh.userData.head;
    if (b.target && b.target.alive) {
      const t = b.target.chest(), want = Math.atan2(-(t.x - b.x), -(t.z - b.z));
      b.yaw += clamp(wrapAngle(want - b.yaw), -4 * dt, 4 * dt);
      head.rotation.y = b.yaw - b.mesh.rotation.y;
      if (b.fireT <= 0 && Math.abs(wrapAngle(want - b.yaw)) < 0.1) {
        b.fireT = 0.13;
        b.mesh.userData.muzzle.getWorldPosition(_sv);
        const from = _sv.clone(), dir = t.clone().sub(from).normalize().add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(0.025)).normalize();
        const hit = rayHit(from, dir, 80, b.team, { player: b.team !== player.team });
        const end = hit ? hit.point : from.clone().addScaledVector(dir, 80);
        shootTracer(from, end, 0xffd27a, 320, 0.03, () => applyHit(hit, dir, { dmg: 11, force: 3 }, player));
        netShot(from, end, 1); playAt('smg', from, 0.7);
      }
    } else head.rotation.y += dt * 0.6;
  }
}
