// ===================== clown.js : the secret clown =====================
// Every so often a giant creepy clown named Giggles drops out of the sky, lands with a BOING,
// laughs, and hurls water balloons at everyone. Soldiers who get soaked or come too close panic and
// run. Water does no harm, but it slows you down and blurs your screen. Shoot him enough and he
// bounces back into the sky, and you get a reward. Secret: type the word "clown" during a battle to call him.
const CLOWN = { state: null, t: 0, hp: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, model: null, nextT: rand(120, 260), throwT: 0, hopT: 0, laughT: 0, lastBy: null, netState: 0 };
const CLOWN_HP = 900, CLOWN_ACT = 24;
const balloons = [];

// ---------- sounds ----------
SFX.clownLaugh = (v = 1) => {
  // a wobbly "ha ha ha ha", sliding down, with a creepy low hum under it
  for (let i = 0; i < 7; i++) {
    const f = 620 - i * 38 + (i % 2) * 40;
    tn('sawtooth', f, f * 0.72, 0.13, 0.11 * v, i * 0.15);
    tn('square', f * 1.5, f * 1.1, 0.1, 0.04 * v, i * 0.15 + 0.02);
    nz('bandpass', 1400, 0.09, 0.08 * v, 3, i * 0.15);
  }
  tn('sine', 90, 60, 1.3, 0.18 * v);
};
SFX.boing = (v = 1) => { tn('sine', 120, 640, 0.32, 0.45 * v); tn('triangle', 240, 900, 0.25, 0.15 * v, 0.03); nz('lowpass', 300, 0.2, 0.3 * v); };
SFX.splash = (v = 1) => { nz('bandpass', 1800, 0.28, 0.45 * v, 0.9); nz('highpass', 3500, 0.18, 0.2 * v); tn('sine', 500, 180, 0.12, 0.12 * v); };
SFX.honk = (v = 1) => { tn('square', 330, 300, 0.22, 0.12 * v); tn('square', 415, 380, 0.22, 0.08 * v); };

// ---------- the model (big: about 3.4 m tall) ----------
function buildClown() {
  const g = new THREE.Group(), body = new Part(), P = 0x5a2a8a, G = 0x2f7f3a, Y = 0xf2c230, W = 0xf4f1ea;
  // giant floppy shoes
  body.box(0.62, 0.32, 1.25, 0xd8322e, -0.36, 0.16, 0.22); body.box(0.62, 0.32, 1.25, 0xd8322e, 0.36, 0.16, 0.22);
  body.ball(0.36, 0xd8322e, -0.36, 0.26, 0.78); body.ball(0.36, 0xd8322e, 0.36, 0.26, 0.78);
  // baggy two-colour suit with pompom buttons
  body.cyl(0.26, 0.34, 1.0, P, -0.3, 0.85, 0); body.cyl(0.26, 0.34, 1.0, G, 0.3, 0.85, 0);
  body.cyl(0.62, 0.55, 1.15, P, 0, 1.9, 0, 0, 0, 0, 1, 10);
  body.box(0.6, 1.14, 1.12, G, 0.3, 1.9, 0);
  for (let i = 0; i < 3; i++) body.ball(0.09, [Y, 0xd8322e, 0x2f7fe0][i], 0, 2.3 - i * 0.36, 0.6);
  for (let i = 0; i < 12; i++) body.ball(0.05, W, (Math.random() - 0.5) * 0.9, 1.45 + Math.random() * 0.9, 0.56);   // polka dots
  // frilly ruff collar
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; body.ball(0.2, i % 2 ? W : Y, Math.sin(a) * 0.55, 2.55, Math.cos(a) * 0.55); }
  // head: pale face, big blue nose, wild orange hair tufts, tiny lopsided hat
  body.ball(0.48, W, 0, 3.0, 0);
  body.ball(0.13, 0x2f7fe0, 0, 3.0, 0.48);
  for (const e of [-1, 1]) {
    body.box(0.2, 0.2, 0.05, 0x2a1030, e * 0.17, 3.12, 0.43, 0, 0, Math.PI / 4);           // dark diamond eye sockets
    body.box(0.06, 0.32, 0.04, 0x2a1030, e * 0.17, 3.0, 0.45, 0, 0, 0);                     // painted lines down the cheeks
    body.ball(0.055, 0xff2a2a, e * 0.17, 3.12, 0.47);                                       // red glowing eyes
    body.box(0.22, 0.05, 0.05, 0x14141a, e * 0.18, 3.3, 0.42, 0, 0, e * 0.45);              // angry eyebrows
  }
  body.box(0.58, 0.1, 0.05, 0x8a0f24, 0, 2.8, 0.44);                                         // a grin far too wide
  body.box(0.14, 0.1, 0.05, 0x8a0f24, -0.32, 2.88, 0.41, 0, 0, 0.7); body.box(0.14, 0.1, 0.05, 0x8a0f24, 0.32, 2.88, 0.41, 0, 0, -0.7);
  for (let i = 0; i < 6; i++) body.box(0.05, 0.07, 0.03, W, -0.2 + i * 0.08, 2.81, 0.47, 0, 0, Math.PI / 4);      // pointy teeth
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) body.ball(0.2 + (i % 2) * 0.05, 0xf07a1c, s * (0.5 + i * 0.05), 3.0 + i * 0.12 - 0.1, -0.05 - i * 0.04);
  body.cyl(0.18, 0.24, 0.32, 0x1d1d24, 0.12, 3.58, 0, 0, 0, 0.25); body.cyl(0.32, 0.32, 0.04, 0x1d1d24, 0.08, 3.43, 0, 0, 0, 0.25); body.ball(0.08, Y, 0.18, 3.78, 0);
  const bm = new THREE.Mesh(body.build(), VEH_MAT); bm.castShadow = true; g.add(bm);
  // arms swing for throwing
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new Part();
    a.cyl(0.16, 0.2, 0.95, s < 0 ? P : G, 0, -0.45, 0); a.ball(0.2, W, 0, -1.0, 0);
    const m = new THREE.Mesh(a.build(), VEH_MAT); m.castShadow = true;
    const piv = new THREE.Group(); piv.position.set(s * 0.72, 2.35, 0); piv.add(m); g.add(piv); arms.push(piv);
  }
  // the balloon in his hand
  const held = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshLambertMaterial({ color: 0x3fc4ff })); held.position.set(0, -1.15, 0.05); arms[1].add(held);
  g.visible = false; scene.add(g);
  return { g, arms, held };
}

// ---------- balloons ----------
const BALLOON_COLS = [0x3fc4ff, 0xff4fa0, 0xffd23f, 0x6ef07a, 0xb07aff, 0xff8a3a];
const _bGeo = new THREE.SphereGeometry(0.22, 10, 8);
function throwBalloon(from, to, T, col, ghost) {
  const v = new THREE.Vector3((to.x - from.x) / T, (to.y - from.y) / T + 0.5 * 18 * T, (to.z - from.z) / T);
  const m = new THREE.Mesh(_bGeo, new THREE.MeshLambertMaterial({ color: col })); m.scale.set(1, 1.15, 1); m.position.copy(from); scene.add(m);
  balloons.push({ m, v, t: 0, T: T + 0.6, ghost });
  if (!ghost) netFx(['w', +from.x.toFixed(1), +from.y.toFixed(1), +from.z.toFixed(1), +to.x.toFixed(1), +to.y.toFixed(1), +to.z.toFixed(1), +T.toFixed(2), BALLOON_COLS.indexOf(col)]);
}
function splashAt(p, col, ghost) {
  burst(p, 16, 0x9fdcff, 6, 0.6, 0.12); burst(p, 6, col, 4, 0.4, 0.1);
  playAt('splash', p, 0.9);
  // everyone close gets soaked
  if (player.alive && !player.vehicle && player.pos.distanceTo(p) < 3.6) soakPlayer();
  if (!ghost && (!net.active || net.isHost)) for (const c of chars) if (c.alive && !c.isPlayer && !c.isRemote && !c.vehicle && !c.gv && c.pos.distanceTo(p) < 3.6) scare(c, p, 3.5);
}
function updateBalloons(dt) {
  for (let i = balloons.length - 1; i >= 0; i--) {
    const b = balloons[i];
    b.t += dt; b.v.y -= 18 * dt; b.m.position.addScaledVector(b.v, dt);
    b.m.rotation.x += dt * 5; b.m.rotation.z += dt * 3;
    const p = b.m.position;
    let hit = p.y <= heightAt(p.x, p.z) + 0.15 || b.t > b.T;
    if (!hit) for (const c of chars) if (c.alive && !c.vehicle && Math.abs(c.pos.x - p.x) < 0.6 && Math.abs(c.pos.z - p.z) < 0.6 && p.y > c.pos.y && p.y < c.pos.y + 2) { hit = true; break; }
    if (hit) { splashAt(p, b.m.material.color.getHex(), b.ghost); scene.remove(b.m); b.m.material.dispose(); balloons.splice(i, 1); }
  }
}

// ---------- panic ----------
function scare(n, from, secs) {
  if (n.isPlayer || n.isRemote) return;
  const a = Math.atan2(n.pos.x - from.x, n.pos.z - from.z) + rand(-0.6, 0.6), d = rand(26, 40);
  n.fleeTo = new THREE.Vector3(clamp(n.pos.x + Math.sin(a) * d, -HALF + 30, HALF - 30), 0, clamp(n.pos.z + Math.cos(a) * d, -HALF + 30, HALF - 30));
  n.scaredT = Math.max(n.scaredT || 0, secs); n.slowT = Math.max(n.slowT || 0, secs * 0.4);
}
let soakEl = null;
function soakPlayer() {
  player.soakT = 3.2; SFX.splash(0.8);
  if (!soakEl) {
    soakEl = document.createElement('div'); soakEl.id = 'soak';
    soakEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:6;opacity:0;transition:opacity .25s;background:radial-gradient(ellipse at center, rgba(120,200,255,0) 35%, rgba(90,170,240,0.55) 100%);';
    let dots = ''; for (let i = 0; i < 26; i++) { const s = 10 + Math.random() * 34; dots += `<i style="position:absolute;left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${s}px;height:${s * 1.3}px;border-radius:50%;background:radial-gradient(circle at 35% 30%, rgba(255,255,255,.75), rgba(140,210,255,.35) 45%, rgba(80,160,230,.15));"></i>`; }
    soakEl.innerHTML = dots + '<b style="position:absolute;left:50%;top:22%;transform:translateX(-50%);font:700 22px system-ui,sans-serif;color:#dff3ff;text-shadow:0 2px 6px #036">SPLASH! You got soaked!</b>';
    document.body.appendChild(soakEl);
  }
  soakEl.style.opacity = '1';
}

// ---------- the clown's brain (solo, or the host in online games) ----------
function pickLanding() {
  // right into the biggest crowd of soldiers (or next to the player sometimes)
  if (player.alive && !player.vehicle && Math.random() < 0.4) return new THREE.Vector3(player.pos.x + rand(-12, 12), 0, player.pos.z + rand(-12, 12));
  let best = null, bn = -1;
  for (const c of chars) {
    if (!c.alive || c.inactive || c.vehicle) continue;
    let n = 0; for (const o of chars) if (o.alive && !o.inactive && Math.abs(o.pos.x - c.pos.x) < 25 && Math.abs(o.pos.z - c.pos.z) < 25) n++;
    if (n > bn) { bn = n; best = c; }
  }
  return best ? new THREE.Vector3(best.pos.x + rand(-6, 6), 0, best.pos.z + rand(-6, 6)) : new THREE.Vector3(0, 0, 0);
}
function summonClown() {
  if (CLOWN.state || gameOver || !started) return;
  if (!CLOWN.model) CLOWN.model = buildClown();
  const L = pickLanding();
  CLOWN.pos.set(L.x, heightAt(L.x, L.z) + 110, L.z); CLOWN.vel.set(0, -10, 0);
  CLOWN.state = 'drop'; CLOWN.t = 0; CLOWN.hp = CLOWN_HP; CLOWN.lastBy = null;
  showMessage('You hear laughing from the sky...', 4);
  SFX.clownLaugh(0.9);
}
function clownLeave(scaredOff) {
  if (!CLOWN.state || CLOWN.state === 'leave') return;
  CLOWN.state = 'leave'; CLOWN.t = 0; CLOWN.vel.set(rand(-6, 6), 48, rand(-6, 6));
  SFX.boing(1); SFX.clownLaugh(0.7);
  burst(CLOWN.pos.clone().setY(CLOWN.pos.y + 1), 40, 0xffd23f, 10, 1.2, 0.12);
  if (scaredOff) {
    showMessage(CLOWN.lastBy ? `${CLOWN.lastBy} scared off the clown!` : 'The clown bounced away!', 4);
    if (CLOWN.lastBy === (player.name || 'You')) addMoney(400, 'Scared off the clown');
  } else showMessage('The clown bounced back into the sky. For now...', 4);
}
function clownHit(dmg, shooter) {
  if (!CLOWN.state || CLOWN.state === 'leave') return;
  if (net.active && !net.isHost) { CLOWN.pend = (CLOWN.pend || 0) + dmg; return; }   // sent in one bundle a few times a second
  CLOWN.hp -= dmg; if (shooter) CLOWN.lastBy = shooter.isPlayer ? (player.name || 'You') : shooter.name || null;
  if (Math.random() < 0.25) playAt('honk', CLOWN.pos, 1);
  if (CLOWN.hp <= 0) clownLeave(true);
}
function clownTargets() {
  const out = [];
  for (const c of chars) if (c.alive && !c.vehicle && !c.inactive && c.pos.distanceTo(CLOWN.pos) < 42) out.push(c);
  return out;
}
function clownBrain(dt) {
  const C = CLOWN;
  if (!C.state) {
    if (!started || gameOver || !playing || !BATTLE.clown) return;   // only when switched on in the battle setup
    C.nextT -= dt;
    if (C.nextT <= 0) { C.nextT = rand(260, 520); if (Math.random() < 0.75) summonClown(); }
    return;
  }
  C.t += dt;
  const ground = heightAt(C.pos.x, C.pos.z);
  if (C.state === 'drop') {
    C.vel.y -= 22 * dt; C.pos.addScaledVector(C.vel, dt);
    if (C.pos.y <= ground) {
      C.pos.y = ground; C.state = 'act'; C.t = 0; C.hopT = 1.2; C.throwT = 0.8; C.laughT = 1.5;
      playAt('boing', C.pos, 1); burst(C.pos.clone().setY(ground + 0.5), 50, 0xff4fa0, 9, 1.0, 0.12); burst(C.pos.clone().setY(ground + 0.5), 30, 0x6ef07a, 8, 1.0, 0.12);
      for (const c of chars) if (c.alive && c.pos.distanceTo(C.pos) < 24) scare(c, C.pos, 4.5);
      if (player.alive && player.pos.distanceTo(C.pos) < 24 && typeof addShake === 'function') addShake(0.6);
    }
  } else if (C.state === 'act') {
    const tg = clownTargets();
    // hop toward the crowd
    C.hopT -= dt;
    if (C.pos.y <= ground + 0.01 && C.hopT <= 0) {
      C.hopT = rand(1.1, 2.0);
      let goal = null; if (tg.length) goal = tg[Math.floor(Math.random() * tg.length)].pos;
      else { let bd = 160; for (const c of chars) if (c.alive && !c.inactive && !c.vehicle) { const d = c.pos.distanceTo(C.pos); if (d < bd) { bd = d; goal = c.pos; } } }   // nobody close: chase the nearest
      const a = goal ? Math.atan2(goal.x - C.pos.x, goal.z - C.pos.z) : rand(0, 6.28), sp = goal ? (tg.length ? rand(3, 7) : 11) : 3;
      C.vel.set(Math.sin(a) * sp, rand(7, 11), Math.cos(a) * sp);
      playAt('boing', C.pos, 0.5);
    }
    C.vel.y -= 22 * dt; C.pos.addScaledVector(C.vel, dt);
    if (C.pos.y <= ground) { C.pos.y = ground; C.vel.set(0, 0, 0); }
    if (Math.abs(C.pos.x) > HALF - 40 || Math.abs(C.pos.z) > HALF - 40) { C.pos.x = clamp(C.pos.x, -HALF + 40, HALF - 40); C.pos.z = clamp(C.pos.z, -HALF + 40, HALF - 40); }
    // throw balloons
    C.throwT -= dt;
    if (C.throwT <= 0 && tg.length) {
      C.throwT = rand(0.55, 1.0);
      const t = tg[Math.floor(Math.random() * tg.length)], d = t.pos.distanceTo(C.pos), T = clamp(d / 17, 0.7, 2.2);
      const to = t.pos.clone(); if (t.vel) to.addScaledVector(t.vel, T * 0.6);
      to.x += rand(-1.2, 1.2); to.z += rand(-1.2, 1.2); to.y = heightAt(to.x, to.z) + 1;
      C.yaw = Math.atan2(to.x - C.pos.x, to.z - C.pos.z);
      const from = new THREE.Vector3(C.pos.x + Math.sin(C.yaw + 0.6) * 0.8, C.pos.y + 3.3, C.pos.z + Math.cos(C.yaw + 0.6) * 0.8);
      throwBalloon(from, to, T, BALLOON_COLS[Math.floor(Math.random() * BALLOON_COLS.length)], false);
      C.armT = 0.35;
    }
    C.laughT -= dt; if (C.laughT <= 0) { C.laughT = rand(3.5, 6); playAt('clownLaugh', C.pos, 1); }
    if (C.t > CLOWN_ACT) clownLeave(false);
  } else if (C.state === 'leave') {
    C.vel.y -= 6 * dt; C.pos.addScaledVector(C.vel, dt);
    if (C.t > 3.2) { C.state = null; if (C.model) C.model.g.visible = false; }
  }
}
// online: the host shares where the clown is, everyone else just shows him there
function clownNetState() { const C = CLOWN; return C.state ? [Math.round(C.pos.x * 10), Math.round(C.pos.y * 10), Math.round(C.pos.z * 10), Math.round(C.yaw * 100), ['drop', 'act', 'leave'].indexOf(C.state)] : 0; }
function clownNet(a) {
  const C = CLOWN;
  if (!a) { if (C.state) { C.state = null; if (C.model) C.model.g.visible = false; } return; }
  if (!C.model) C.model = buildClown();
  const st = ['drop', 'act', 'leave'][a[4]];
  if (st !== C.state) {
    if (st === 'drop') { showMessage('You hear laughing from the sky...', 4); SFX.clownLaugh(0.9); }
    if (st === 'act') playAt('boing', C.pos, 1);
    if (st === 'leave') SFX.boing(1);
    C.state = st;
  }
  C.netPos = new THREE.Vector3(a[0] / 10, a[1] / 10, a[2] / 10); C.yaw = a[3] / 100;
  if (!C.pos.lengthSq() || C.pos.distanceTo(C.netPos) > 30) C.pos.copy(C.netPos);
}

// ---------- every frame ----------
let clownTyped = '';
addEventListener('keydown', e => {
  if (!e.key || e.key.length !== 1) return;
  clownTyped = (clownTyped + e.key.toLowerCase()).slice(-5);
  if (clownTyped === 'clown' && started && playing && BATTLE.clown && (!net.active || net.isHost)) { clownTyped = ''; CLOWN.nextT = 9999; summonClown(); }
});
function updateClown(dt) {
  const host = !net.active || net.isHost;
  if (host) clownBrain(dt);
  else {
    if (CLOWN.state && CLOWN.netPos) CLOWN.pos.lerp(CLOWN.netPos, Math.min(1, dt * 10));
    CLOWN.sendT = (CLOWN.sendT || 0) - dt;
    if (CLOWN.pend > 0 && CLOWN.sendT <= 0) { CLOWN.sendT = 0.25; netFx(['cl', Math.round(CLOWN.pend)]); CLOWN.pend = 0; }
  }
  updateBalloons(dt);
  // soaked: slow, and the screen drips
  if (player.soakT > 0) {
    player.soakT -= dt; player.slowT = Math.max(player.slowT || 0, 0.15);
    if (player.soakT <= 0 && soakEl) soakEl.style.opacity = '0';
  }
  // panicking soldiers run instead of fighting
  if (host) for (const n of npcs) if (n.scaredT > 0) { n.scaredT -= dt; if (n.scaredT <= 0) n.fleeTo = null; }
  // place the model
  const C = CLOWN; if (!C.model) return;
  const g = C.model.g;
  g.visible = !!C.state;
  if (!C.state) return;
  g.position.copy(C.pos);
  g.rotation.y = C.yaw;
  const air = C.pos.y - heightAt(C.pos.x, C.pos.z);
  const tt = performance.now() * 0.001;
  g.scale.set(1, air < 0.2 && C.state === 'act' ? 1 - 0.06 * Math.abs(Math.sin(tt * 7)) : 1.05, 1);
  g.rotation.z = Math.sin(tt * 3) * 0.08;
  C.armT = Math.max(0, (C.armT || 0) - dt);
  C.model.arms[1].rotation.x = C.armT > 0 ? -2.6 + (0.35 - C.armT) * 9 : -0.3 + Math.sin(tt * 4) * 0.2;
  C.model.arms[0].rotation.x = C.state === 'drop' || C.state === 'leave' ? -2.8 : Math.sin(tt * 4 + 1) * 0.4;
  C.model.arms[0].rotation.z = C.state === 'drop' || C.state === 'leave' ? -0.4 : 0;
  C.model.held.visible = C.state === 'act' && C.armT <= 0.05;
}
