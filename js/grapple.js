// ===================== grapple.js : the wrist grappling hook =====================
// Buy it in the shop (yours until you go down). Aim at anything and press Z: a steel cable shoots from your wrist,
// hooks on and swiftly reels you in, and you hang right there on the spot. Press Z again to swing on to the next
// spot, or Space to let go (with a little hop). Hook onto a moving jeep, tank, boat, plane or ship and you ride
// along with it. Works on walls, rooftops, cliffs, trees, towers: anything solid.
const GRAP = { range: 160, line: null, hook: null };
function grappleFire() {
  if (!player.alive || !player.grapple || player.vehicle || player.gv || player.turret || player.planeGun || player.ship) return;
  if ((GRAP.cool || 0) > simTime) return;
  GRAP.cool = simTime + 0.25;
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  let hit = rayHit(camera.position, dir, GRAP.range, '__grapple__', { noChars: true });   // any team's planes count
  // ships are not in the usual hit list: check their hulls too
  if (typeof SHIPS2 !== 'undefined' && SHIPS2.length) {
    raycaster.set(camera.position, dir); raycaster.far = hit ? hit.dist : GRAP.range;
    const sh = raycaster.intersectObjects(SHIPS2.map(s => s.g), true)[0];
    if (sh) { const s = SHIPS2.find(q => { let o = sh.object; while (o) { if (o === q.g) return true; o = o.parent; } return false; }); hit = { dist: sh.distance, point: sh.point.clone(), ship: s }; }
  }
  if (!hit) { showMessage('Too far for the grappling hook', 1); playAt('click', player.pos, 0.6); return; }
  // remember the spot on whatever we hit, so a moving thing carries the hook with it
  let obj = null;
  if (hit.gv) obj = hit.gv.model.g; else if (hit.plane) obj = hit.plane.model.g; else if (hit.ship) obj = hit.ship.g;
  const back = dir.clone().multiplyScalar(-0.45);   // hang just in front of the surface, not inside it
  const p = hit.point.clone().add(back);
  player.grap = { mode: 'pull', obj, local: obj ? (obj.updateMatrixWorld(true), obj.worldToLocal(p.clone())) : null, point: p, speed: 8, alive: hit.gv || hit.plane || hit.ship || null };
  player.parachute = false; player.gliding = false; player.velY = 0;
  playAt('thump', player.pos, 0.5);
}
function grappleRelease(hop) {
  if (!player.grap) return;
  player.grap = null;
  if (hop) { player.velY = 7; const f = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); player.push.addScaledVector(f, 4); }
}
function grappleAnchor(G) {
  if (G.obj) { G.obj.updateMatrixWorld(true); return G.obj.localToWorld(G.local.clone()); }
  return G.point.clone();
}
// runs after the normal on-foot movement and puts you where the cable says
function grappleUpdate(dt) {
  const G = player.grap;
  if (!G) { if (GRAP.line) { GRAP.line.visible = false; GRAP.hook.visible = false; } return; }
  if (!player.alive || player.vehicle || player.gv || player.turret || player.ship || (G.alive && G.alive.alive === false)) { grappleRelease(false); grappleUpdate(dt); return; }
  if (keys.Space) { keys.Space = false; grappleRelease(true); grappleUpdate(dt); return; }
  const A = grappleAnchor(G);
  const hold = A.clone(); hold.y -= 1.5;   // your hands at the hook, your feet below
  const g = heightAt(hold.x, hold.z); if (hold.y < g) hold.y = g;
  if (G.mode === 'pull') {
    if (!G.pos) G.pos = player.pos.clone();
    if (G.lastA) G.pos.add(A.clone().sub(G.lastA));   // the hook is on something moving: get carried with it while you reel in
    G.speed = Math.min(48, G.speed + dt * 110);   // a hard yank that gets faster
    const to = hold.clone().sub(G.pos), d = to.length(), stepL = G.speed * dt;
    if (d <= stepL + 0.05) { G.pos.copy(hold); G.mode = 'hang'; playAt('click', hold, 0.7); }
    else G.pos.addScaledVector(to.multiplyScalar(1 / d), stepL);
    player.pos.copy(G.pos); player.onGround = false;
  } else {
    player.pos.copy(hold); player.onGround = true;   // hanging on: you can aim and shoot from here
  }
  G.lastA = A.clone();
  player.velY = 0; player.vel.set(0, 0, 0); player.push.set(0, 0, 0);
  // the cable from your wrist to the hook
  if (!GRAP.line) {
    GRAP.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x2a2c30 }));
    GRAP.line.frustumCulled = false; scene.add(GRAP.line);
    const P = new Part(); P.cyl(0.05, 0.08, 0.3, 0x8a8e94, 0, 0, 0); for (const a of [0, 2.1, 4.2]) P.box(0.04, 0.04, 0.28, 0x6a6e74, Math.sin(a) * 0.12, -0.12, Math.cos(a) * 0.12, 0.6, a, 0);
    GRAP.hook = new THREE.Mesh(P.build(), VEH_MAT); scene.add(GRAP.hook);
  }
  const f = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)), r = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const wrist = player.pos.clone().add(new THREE.Vector3(0, 1.25, 0)).addScaledVector(r, 0.3).addScaledVector(f, 0.35);
  const pos = GRAP.line.geometry.attributes.position; pos.setXYZ(0, wrist.x, wrist.y, wrist.z); pos.setXYZ(1, A.x, A.y, A.z); pos.needsUpdate = true;
  GRAP.line.visible = true; GRAP.hook.visible = true; GRAP.hook.position.copy(A);
}
addEventListener('keydown', e => {
  if (e.code !== 'KeyZ' || e.repeat || typeof started === 'undefined' || !started || !playing) return;
  if (!player.grapple) { if (player.alive && !player.vehicle && !player.gv && !player.ship) showMessage('Buy the grappling hook in the shop (B) to use Z', 1.5); return; }
  grappleFire();
});
// on a tablet or phone: a HOOK button next to JUMP, shown on foot once you have the hook (JUMP lets go)
setInterval(() => {
  const b = document.getElementById('tHook'); if (!b) return;
  const on = typeof IS_TOUCH !== 'undefined' && IS_TOUCH && player.alive && player.grapple && !player.vehicle && !player.gv && !player.turret && !player.planeGun && !player.ship;
  b.style.display = on ? 'flex' : 'none';
}, 300);
GEAR.splice(GEAR.findIndex(g => g.id === 'glider') + 1, 0, { id: 'grapple', name: 'Grappling Hook', desc: 'Aim at anything and press Z: it pulls you there and you hang on. Z again for the next spot, Space to let go. Rides moving vehicles. Yours until you go down', price: 900, buy: () => { player.grapple = true; showMessage(typeof IS_TOUCH !== 'undefined' && IS_TOUCH ? 'Grappling hook on your wrist! Aim and tap HOOK. JUMP lets go' : 'Grappling hook on your wrist! Aim and press Z. Space lets go', 3); } });
