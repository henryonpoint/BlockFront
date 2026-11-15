// ===================== sticky.js : sticky bombs =====================
// Press X to throw a sticky bomb. It sticks to whatever it hits first: a tank, a jeep, a soldier, a wall
// or the ground. Then it beeps faster and faster and blows up after 3 seconds, much harder than a grenade.
// Stuck right on a vehicle, it does a lot of extra damage: two of them finish off a tank.
const stickies = [];
let _stickyGeo = null;
function stickyGeo() {
  if (_stickyGeo) return _stickyGeo;
  const p = new Part();
  p.box(0.34, 0.12, 0.24, 0xc8b88a, 0, 0, 0);                          // the putty block
  p.box(0.36, 0.13, 0.05, 0x2a2a2a, -0.08, 0, 0); p.box(0.36, 0.13, 0.05, 0x2a2a2a, 0.1, 0, 0, 0, Math.PI / 2, 0);   // black tape
  p.box(0.12, 0.05, 0.08, 0x30353a, 0.06, 0.08, 0);                     // the timer box
  p.cyl(0.008, 0.008, 0.2, 0xd8262a, -0.04, 0.1, 0.05, 0, 0, 1.2); p.cyl(0.008, 0.008, 0.2, 0x2f6fe0, -0.04, 0.1, -0.05, 0, 0, 1.2);   // wires
  _stickyGeo = p.build(); return _stickyGeo;
}
SFX.beep = (v = 1) => tn('square', 1900, 1900, 0.05, 0.08 * v);
function makeSticky(origin, vel, owner, ghost) {
  const g = new THREE.Group(), m = new THREE.Mesh(stickyGeo(), VEH_MAT); m.castShadow = true; g.add(m);
  const lmat = new THREE.MeshBasicMaterial({ color: 0x441111 }), light = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), lmat); light.position.set(0.06, 0.12, 0); g.add(light);
  g.position.copy(origin); scene.add(g);
  stickies.push({ g, lmat, vel: vel.clone(), owner, ghost, stuck: null, local: null, fuse: 3, beepT: 0, life: 8, spin: new THREE.Vector3(rand(-8, 8), rand(-8, 8), rand(-8, 8)) });
  if (!ghost) netFx(['sk', teamIdx(owner.team), +origin.x.toFixed(2), +origin.y.toFixed(2), +origin.z.toFixed(2), +vel.x.toFixed(2), +vel.y.toFixed(2), +vel.z.toFixed(2)]);
}
function throwSticky() {
  if (!player.alive || player.vehicle || player.gv || player.turret) return;
  if ((player.stickies || 0) <= 0) { showMessage('No sticky bombs. Buy them in the shop (B)', 1.4); return; }
  player.stickies--;
  const dir = aimDir(0);
  makeSticky(camera.position.clone().addScaledVector(dir, 0.7), dir.multiplyScalar(21).add(new THREE.Vector3(player.vel.x, 3.5 + player.vel.y * 0.3, player.vel.z)), player, false);
  sfxGrenade();
}
addEventListener('keydown', e => { if (e.code === 'KeyX' && playing && !e.repeat) throwSticky(); });
const _skStep = new THREE.Vector3(), _skDir = new THREE.Vector3(), _skInv = new THREE.Matrix4();
function updateStickies(dt) {
  for (let i = stickies.length - 1; i >= 0; i--) {
    const s = stickies[i];
    if (!s.stuck) {
      s.vel.y -= 18 * dt;
      _skStep.copy(s.vel).multiplyScalar(dt); const len = _skStep.length(); _skDir.copy(_skStep).normalize();
      const hit = rayHit(s.g.position, _skDir, len + 0.15, s.owner.team, { includeOwnTeam: false, player: s.owner !== player, includeRemote: true });
      s.g.rotation.x += s.spin.x * dt; s.g.rotation.y += s.spin.y * dt; s.g.rotation.z += s.spin.z * dt;
      s.life -= dt;
      if (hit) {
        s.g.position.copy(hit.point).addScaledVector(_skDir, -0.05);
        SFX.thump(0.4);
        if (!hit.gv && !hit.char && !hit.terrain) for (const v of gvehicles) if (v.alive && v.pos.distanceTo(hit.point) < v.T.radius + 1.2) { hit.gv = v; break; }   // hit a vehicle part
        if (hit.gv) { s.stuck = { gv: hit.gv }; hit.gv.model.g.updateMatrixWorld(); _skInv.copy(hit.gv.model.g.matrixWorld).invert(); s.local = s.g.position.clone().applyMatrix4(_skInv); }
        else if (hit.char && hit.char.alive) { s.stuck = { char: hit.char }; s.local = s.g.position.clone().sub(hit.char.pos); }
        else s.stuck = { ground: true };
        if (hit.normal) s.g.lookAt(s.g.position.clone().add(hit.normal));
      } else if (s.life <= 0) s.stuck = { ground: true };
      else s.g.position.add(_skStep);
      if (s.g.position.y < heightAt(s.g.position.x, s.g.position.z)) { s.g.position.y = heightAt(s.g.position.x, s.g.position.z) + 0.05; s.stuck = { ground: true }; }
      continue;
    }
    // stuck: ride along with whatever it is on, beep, then blow
    if (s.stuck.gv) { const v = s.stuck.gv; if (v.alive) { v.model.g.updateMatrixWorld(); s.g.position.copy(s.local).applyMatrix4(v.model.g.matrixWorld); } }
    else if (s.stuck.char) { const c = s.stuck.char; if (c.alive) s.g.position.copy(c.pos).add(s.local); }
    s.fuse -= dt; s.beepT -= dt;
    if (s.beepT <= 0) { s.beepT = Math.max(0.08, s.fuse * 0.22); s.lmat.color.setHex(0xff2020); playAt('beep', s.g.position, 0.9); setTimeout(() => s.lmat.color.setHex(0x441111), 60); }
    if (s.fuse <= 0) {
      const at = s.g.position.clone(), onV = s.stuck.gv && s.stuck.gv.alive ? s.stuck.gv : null;
      scene.remove(s.g); stickies.splice(i, 1);
      explosion(at, 9, 70, s.owner, 230, s.ghost);
      if (onV && !s.ghost) damageVehicle(onV, 700, s.owner);       // right on the armour: the big hit
      if (typeof makeCrater === 'function' && !onV && !s.stuck.char) makeCrater(at, 9);
    }
  }
}
