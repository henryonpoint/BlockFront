// ===================== b17.js : the B-17 bomber's crew positions =====================
// Eight places to sit: 1 pilot, 2 bombardier (bombsight in the glass nose), 3 nose gunner, 4 top turret, 5 ball
// turret underneath, 6 and 7 the waist gunners, 8 the tail gunner. Press 1 to 8 to move between them (on a tablet,
// the POS button). Every gun position you leave empty is manned by the computer crew, who shoot at enemy planes
// that come into their part of the sky. With no pilot aboard, a computer pilot flies the bomber on bombing runs.
const B17_ST = [
  { name: 'Pilot' },
  { name: 'Bombardier', pos: [0, -0.7, -10.95], yc: 0, yr: 0.7, pmin: -1.52, pmax: -0.2, bomb: true, hide: 'chin' },
  { name: 'Nose gunner', pos: [0, -0.92, -9.75], yc: 0, yr: 1.2, pmin: -0.9, pmax: 0.35, tur: 'chin', gun: [0, -1.1, -9.6] },
  { name: 'Top turret', pos: [0, 2.35, -5.2], yc: 0, yr: Math.PI, pmin: -0.08, pmax: 1.35, tur: 'top', gun: [0, 1.55, -5.2] },
  { name: 'Ball turret', pos: [0, -1.32, 0.95], yc: 0, yr: Math.PI, pmin: -1.52, pmax: 0.08, tur: 'ball', gun: [0, -1.45, 0.9] },
  { name: 'Left waist gunner', pos: [-1.32, 0.38, 5.2], yc: Math.PI / 2 + 0.4, yr: 1.0, pmin: -0.9, pmax: 0.8, gun: [-1.5, 0.35, 5.2] },
  { name: 'Right waist gunner', pos: [1.32, 0.38, 5.2], yc: -Math.PI / 2 - 0.4, yr: 1.0, pmin: -0.9, pmax: 0.8, gun: [1.5, 0.35, 5.2] },
  { name: 'Tail gunner', pos: [0, 0.72, 12.1], yc: Math.PI, yr: 1.0, pmin: -0.7, pmax: 0.7, tur: 'tail', gun: [0, 0.3, 12.2] },
];
const _bq = new THREE.Quaternion(), _bv = new THREE.Vector3(), _be = new THREE.Euler();
function b17Yaw(pl) { return _be.setFromQuaternion(pl.quat, 'YXZ').y; }
function b17World(pl, p) { pl.model.g.position.copy(pl.pos); pl.model.g.quaternion.copy(pl.quat); pl.model.g.updateMatrixWorld(true); return new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(pl.model.g.matrixWorld); }
// take a crew position (1..7) as a gunner or the bombardier
function b17Take(pl, i) {
  pl.crew[i] = player; player.planeGun = pl; player.b17st = i; zoom = false; ads = false; if (typeof cancelPlace === 'function') cancelPlace();
  player.gunT = 0; player.gunBombT = 0;
  if (!pl.pilot && !pl.remote) pl.waitT = Math.min(pl.waitT || 0, 4);   // a computer pilot takes off soon
  const S = B17_ST[i]; player.yaw = b17Yaw(pl) + S.yc; player.pitch = S.bomb ? -1.2 : clamp(0.1, S.pmin, S.pmax);
  showMessage(`${S.name}: ${S.bomb ? 'click drops bombs, right click zooms the bombsight' : 'mouse aims, click fires'}. 1 to 8 change position, E bails out`, 3.5);
}
function b17Free(pl, i) { return i === 0 ? !pl.pilot && !pl.remote : !pl.crew[i]; }
// the pilot gets out of the seat but stays aboard: the computer flies on
function b17LeavePilot(pl) {
  pl.pilot = null; player.vehicle = null; planeBodyVisible(pl, true);
  if (typeof _cockpit !== 'undefined' && _cockpit) { _cockpit.visible = false; pl.model.g.remove(_cockpit); }
  if (typeof updateNoseMarker === 'function') updateNoseMarker(null); pl.aimYaw = undefined;
  const e = _be.setFromQuaternion(pl.quat, 'YXZ'); pl.aiYaw = e.y; pl.aiPitch = 0; pl.aiBank = 0; pl.wp = null; pl.waitT = pl.onGround ? 4 : 0;
}
function b17Switch(pl, i) {
  if (i < 0 || i >= B17_ST.length || !pl.alive) return;
  const cur = player.vehicle === pl ? 0 : player.planeGun === pl ? player.b17st : -1;
  if (cur === i) return;
  if (!b17Free(pl, i)) { showMessage(`${B17_ST[i].name} is taken`, 1.2); return; }
  if (cur === 0) b17LeavePilot(pl); else if (cur > 0) { pl.crew[cur] = null; player.planeGun = null; }
  if (i === 0) { boardPlane(pl); showMessage('Pilot: fly the bomber. 2 to 8 to move to a gun or the bombsight', 3); }
  else b17Take(pl, i);
}
// boarding from the ground: the gunner option picks the first free gun
const _boardPlaneGunPre = boardPlaneGun;
boardPlaneGun = function (pl) {
  if (pl.kind !== 'b17') return _boardPlaneGunPre(pl);
  for (let i = 1; i < B17_ST.length; i++) if (!pl.crew[i]) { b17Take(pl, i); return; }
  showMessage('Every crew position is taken', 1.5);
};
const _leavePlaneGunPre = leavePlaneGun;
leavePlaneGun = function () {
  const pl = player.planeGun;
  if (pl && pl.kind === 'b17') { pl.crew[player.b17st] = null; player.b17st = 0; b17Hud(null); }
  return _leavePlaneGunPre();
};
const _updatePlaneGunPre = updatePlaneGun;
updatePlaneGun = function (dt) {
  const pl = player.planeGun;
  if (!pl || pl.kind !== 'b17') return _updatePlaneGunPre(dt);
  if (!pl.alive) { pl.crew[player.b17st] = null; player.planeGun = null; b17Hud(null); return; }
  const S = B17_ST[player.b17st];
  zoom = false; ads = false;
  player.pos.copy(pl.pos); player.pos.y -= 1.6; player.vel.copy(planeFwd(pl)).multiplyScalar(pl.speed);
  // keep the aim inside this position's part of the sky
  const py = b17Yaw(pl), rel = clamp(wrapAngle(player.yaw - py - S.yc), -S.yr, S.yr);
  player.yaw = py + S.yc + rel; player.pitch = clamp(player.pitch, S.pmin, S.pmax);
  const seat = b17World(pl, S.pos);
  camera.position.copy(seat);
  camera.rotation.set(player.pitch + (Math.random() - 0.5) * camShake * 0.3, player.yaw, 0, 'YXZ');
  const fov = S.bomb && mouse.right ? 22 : (SET.fov || 75) + 5; if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 10); camera.updateProjectionMatrix(); }
  for (const k in pl.model.turrets) { const T = pl.model.turrets[k]; T.housing.visible = k !== S.tur && k !== S.hide; T.yaw.visible = k !== S.hide; }   // nothing of your own turret in the way
  if (S.tur) pl.tAim = Object.assign(pl.tAim || {}, { [S.tur]: { yaw: rel + (S.tur === 'tail' ? 0 : S.yc), pitch: player.pitch } });
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  player.gunT -= dt; player.gunBombT -= dt;
  if (S.bomb) {
    b17Sight(pl, true);
    if (mouse.left && player.gunBombT <= 0) {
      if (pl.onGround) { if (mouse.fresh) showMessage('Get airborne first', 1); }
      else if (pl.bombs > 0) {
        player.gunBombT = 0.45; pl.bombs--; pl.bayT = 3;
        const from = b17World(pl, [rand(-0.3, 0.3), -1.7, -1.6]);
        spawnBall(from, planeFwd(pl).multiplyScalar(pl.speed * 0.9), player, { type: 'bomb', bomb: true, r: 0.32, mass: 25, fuse: 14, color: 0x30343a, radius: 20, dmg: 260, power: 95, impact: true });
        if (typeof sfxBombDrop === 'function') sfxBombDrop(); playAt('thump', pl.pos, 0.6);
        if (pl.bombs === 0) showMessage('Bomb bay empty. Bombs load back in over time', 2);
      } else if (mouse.fresh) showMessage('Bomb bay empty. Bombs load back in over time', 1.5);
    }
  } else {
    b17Sight(pl, false);
    if (mouse.left && player.gunT <= 0) {
      player.gunT = 0.085;
      const g = b17World(pl, S.gun);
      for (const sx of [-0.12, 0.12]) {
        const o = g.clone().add(new THREE.Vector3(sx, 0, 0).applyQuaternion(pl.quat)).addScaledVector(dir, 1.2);
        const d = dir.clone().add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(0.012)).normalize();
        const hit = rayHit(o, d, 360, player.team, { ignorePlane: pl });
        const end = hit ? hit.point : o.clone().addScaledVector(d, 360);
        shootTracer(o, end, 0xffd060, 400, 0.05, () => { if (applyHit(hit, d, { dmg: 18, force: 6 }, player)) showHitmarker(false); });
        netShot(o, end, 2);
      }
      playAt('mg', camera.position, 0.7); camShake = Math.max(camShake, 0.01);
    }
  }
  b17Hud(pl);
  mouse.fresh = false;
};
// the bombsight: a ring on the ground where the next bomb will land
let _bSightMark = null;
function b17Sight(pl, on) {
  let el = document.getElementById('b17Sight');
  if (!el) { el = document.createElement('div'); el.id = 'b17Sight'; el.style.cssText = 'position:fixed;left:50%;top:50%;width:160px;height:160px;margin:-80px 0 0 -80px;border:2px solid rgba(255,220,120,.85);border-radius:50%;pointer-events:none;z-index:4;box-shadow:inset 0 0 0 1px rgba(0,0,0,.4)'; el.innerHTML = '<div style="position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:rgba(255,220,120,.7)"></div><div style="position:absolute;top:50%;left:0;right:0;height:2px;margin-top:-1px;background:rgba(255,220,120,.7)"></div>'; document.body.appendChild(el); }
  el.style.display = on ? 'block' : 'none';
  if (!_bSightMark) { _bSightMark = new THREE.Mesh(new THREE.RingGeometry(6, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false })); _bSightMark.rotation.x = -Math.PI / 2; _bSightMark.renderOrder = 5; scene.add(_bSightMark); }
  _bSightMark.visible = on && !pl.onGround;
  if (!on || pl.onGround) return;
  const f = planeFwd(pl), v = f.clone().multiplyScalar(pl.speed * 0.9);
  let x = pl.pos.x, y = pl.pos.y - 1.7, z = pl.pos.z, vy = v.y;   // step the fall: where the bomb meets the ground
  for (let i = 0; i < 400; i++) { vy -= 20 * 0.05; x += v.x * 0.05; z += v.z * 0.05; y += vy * 0.05; if (y <= heightAt(x, z)) break; }
  _bSightMark.position.set(x, heightAt(x, z) + 0.5, z);
}
// the crew list on screen, while you are aboard
function b17Hud(pl) {
  let el = document.getElementById('b17Hud');
  if (!pl) { if (el) el.style.display = 'none'; if (_bSightMark) _bSightMark.visible = false; const s = document.getElementById('b17Sight'); if (s) s.style.display = 'none'; return; }
  if (!el) { el = document.createElement('div'); el.id = 'b17Hud'; el.className = 'hud'; el.style.cssText = 'position:fixed;right:12px;top:230px;background:rgba(0,0,0,.55);color:#fff;padding:8px 12px;border-radius:10px;font:600 13px system-ui,sans-serif;line-height:1.55;pointer-events:none;z-index:4'; document.body.appendChild(el); }
  el.style.display = 'block';
  const me = player.vehicle === pl ? 0 : player.b17st;
  el.innerHTML = `<b>B-17 Flying Fortress</b> &nbsp; bombs ${pl.bombs}<br>` + B17_ST.map((S, i) => {
    const who = i === me ? 'you' : i === 0 ? (pl.pilot || pl.remote ? 'player' : 'computer') : pl.crew[i] ? 'player' : (S.bomb ? 'empty' : 'computer');
    return `<span style="${i === me ? 'color:#ffd36a' : 'opacity:.85'}">${i + 1} ${S.name}</span> <span style="opacity:.6">(${who})</span>`;
  }).join('<br>') + `<br><span style="opacity:.7">1 to 8 change position, E bails out</span>`;
}
// every frame for each B-17: spin the propellers, turn the turrets, open the bomb doors, and let the computer gunners shoot
function b17Tick(pl, dt) {
  const M = pl.model;
  if (player.planeGun !== pl) for (const k in M.turrets) { M.turrets[k].housing.visible = true; M.turrets[k].yaw.visible = true; }
  for (let i = 1; i < pl.crew.length; i++) if (pl.crew[i] === player && (player.planeGun !== pl || player.b17st !== i)) pl.crew[i] = null;   // you went down or moved on: the seat is free again
  for (const pr of M.props) pr.rotation.z += (6 + pl.speed * 0.9) * dt * (pl.onGround && pl.speed < 1 && !pl.pilot && pl.waitT > 1 ? 0.15 : 1);
  pl.bayT = Math.max(0, (pl.bayT || 0) - dt);
  for (const [k, h] of M.bay.entries()) h.rotation.z += ((pl.bayT > 0 ? (k ? 1.3 : -1.3) : 0) - h.rotation.z) * Math.min(1, dt * 4);
  if (player.vehicle === pl) b17Hud(pl);
  // the computer crew: only the host (or a solo game) runs them; everyone sees their tracers
  const crewAI = !pl.remote && (!net.active || net.isHost) && !pl.onGround;
  pl.aiGunT = (pl.aiGunT || 0) - dt;
  if (crewAI && pl.aiGunT <= 0) {
    pl.aiGunT = 0.13;
    const foes = planes.filter(o => o.alive && o.team !== pl.team && !o.onGround && o.pos.distanceToSquared(pl.pos) < 380 * 380)
      .concat(gvehicles.filter(v => v.alive && v.T.heli && v.team !== pl.team && v.airborne && v.pos.distanceToSquared(pl.pos) < 300 * 300));
    if (foes.length) {
      const inv = _bq.copy(pl.quat).invert(), shooter = planeShooter(pl);
      for (let i = 2; i < B17_ST.length; i++) {
        if (pl.crew[i]) continue;
        const S = B17_ST[i], g = b17World(pl, S.gun);
        let best = null, bd = Infinity;
        for (const t of foes) {
          const to = t.pos.clone().sub(g), d = to.length(); if (d >= bd) continue;
          const l = to.clone().applyQuaternion(inv), yawL = Math.atan2(-l.x, -l.z), pitchL = Math.atan2(l.y, Math.hypot(l.x, l.z));
          if (Math.abs(wrapAngle(yawL - S.yc)) > S.yr || pitchL < S.pmin || pitchL > S.pmax) continue;
          bd = d; best = { t, yawL, pitchL, d };
        }
        if (!best) continue;
        if (S.tur) pl.tAim = Object.assign(pl.tAim || {}, { [S.tur]: { yaw: S.tur === 'tail' ? wrapAngle(best.yawL - Math.PI) : best.yawL, pitch: best.pitchL } });
        if (Math.random() < 0.55) {
          const lead = best.t.pos.clone().addScaledVector(best.t.vel || planeFwdSafe(best.t), best.d / 400);
          const d = lead.sub(g).normalize().add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(0.02)).normalize();
          const o = g.clone().addScaledVector(d, 1.4), hit = rayHit(o, d, 380, pl.team, { ignorePlane: pl });
          const end = hit ? hit.point : o.clone().addScaledVector(d, 380);
          shootTracer(o, end, 0xffd060, 400, 0.04, () => applyHit(hit, d, { dmg: 13, force: 4 }, shooter));
          if (net.active) netShot(o, end, 2);
          if (pl.pos.distanceToSquared(camera.position) < 200 * 200 && Math.random() < 0.3) playAt('mg', g, 0.4);
        }
      }
    }
  }
  // turn the turrets toward whatever they are aiming at
  if (pl.tAim) for (const k in pl.tAim) {
    const T = M.turrets[k], A = pl.tAim[k]; if (!T) continue;
    const baseY = k === 'tail' ? Math.PI : 0;
    T.yaw.rotation.y += (wrapAngle(baseY + A.yaw - T.yaw.rotation.y)) * Math.min(1, dt * 8);
    T.pitch.rotation.x += (A.pitch - T.pitch.rotation.x) * Math.min(1, dt * 8);
  }
}
function planeFwdSafe(t) { return t.quat ? planeFwd(t).multiplyScalar(t.speed || 0) : new THREE.Vector3(); }
// 1 to 8 move you between the positions while you are aboard
addEventListener('keydown', e => {
  if (e.repeat || !player.alive) return;
  const pl = player.vehicle && player.vehicle.kind === 'b17' ? player.vehicle : player.planeGun && player.planeGun.kind === 'b17' ? player.planeGun : null;
  if (!pl) return;
  const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5, Digit7: 6, Digit8: 7 }[e.code];
  if (n !== undefined) b17Switch(pl, n);
});
// on a tablet: a POS button steps to the next free position
setInterval(() => {
  const b = document.getElementById('tPos'); if (!b) return;
  const pl = player.vehicle && player.vehicle.kind === 'b17' ? player.vehicle : player.planeGun && player.planeGun.kind === 'b17' ? player.planeGun : null;
  b.style.display = typeof IS_TOUCH !== 'undefined' && IS_TOUCH && pl ? 'flex' : 'none';
  if (!pl) b17Hud(null);
}, 300);
function b17NextPos() {
  const pl = player.vehicle && player.vehicle.kind === 'b17' ? player.vehicle : player.planeGun && player.planeGun.kind === 'b17' ? player.planeGun : null; if (!pl) return;
  const cur = player.vehicle === pl ? 0 : player.b17st;
  for (let k = 1; k <= B17_ST.length; k++) { const i = (cur + k) % B17_ST.length; if (b17Free(pl, i)) { b17Switch(pl, i); return; } }
}
