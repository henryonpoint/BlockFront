// ===================== topview.js : looking straight down to pick a target =====================
// Used by the mortar and the airstrike. The real 3D battlefield is drawn from high above (no haze or clouds),
// with your team, spotted enemies and the control points marked on top. Click or tap where you want it.
// The battle keeps going while you look, so do not stand in the open for too long.
const TOPVIEW = { on: false, mode: '', cx: 0, cz: 0, span: 300, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 3000), mx: -1, my: -1, opts: null, keys: {}, airYaw: 0 };
const mortarQ = [];
let tvEl = null, tvCv = null, tvCtx = null, tvInfo = null;

function tvBuildUI() {
  if (tvEl) return;
  const st = document.createElement('style'); st.textContent = 'body.topview .hud, body.topview #touchUI, body.topview #message, body.topview #prompt { display: none !important; }'; document.head.appendChild(st);
  tvEl = document.createElement('div'); tvEl.id = 'topview';
  tvEl.style.cssText = 'position:fixed;inset:0;z-index:60;display:none;cursor:crosshair;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff;user-select:none;-webkit-user-select:none;touch-action:none;';
  tvEl.innerHTML = `<canvas style="position:absolute;inset:0;width:100%;height:100%"></canvas>
    <div id="tvTop" style="position:absolute;top:12px;left:50%;transform:translateX(-50%);background:rgba(8,12,20,.78);padding:8px 16px;border-radius:10px;text-align:center;font-size:14px;line-height:1.45;pointer-events:none"></div>
    <div id="tvClose" style="position:absolute;top:12px;right:14px;background:rgba(8,12,20,.8);border:2px solid rgba(255,255,255,.25);padding:8px 14px;border-radius:10px;font-weight:700;cursor:pointer">Close (Esc)</div>
    <div id="tvRot" style="position:absolute;bottom:18px;left:50%;transform:translateX(-50%);display:none;gap:8px">
      <div class="tvb" data-r="-1" style="background:rgba(8,12,20,.8);border:2px solid rgba(255,255,255,.25);padding:8px 14px;border-radius:10px;font-weight:700;cursor:pointer;display:inline-block">Turn left (Q)</div>
      <div class="tvb" data-r="1" style="background:rgba(8,12,20,.8);border:2px solid rgba(255,255,255,.25);padding:8px 14px;border-radius:10px;font-weight:700;cursor:pointer;display:inline-block">Turn right (E)</div></div>`;
  document.body.appendChild(tvEl);
  tvCv = tvEl.querySelector('canvas'); tvCtx = tvCv.getContext('2d'); tvInfo = tvEl.querySelector('#tvTop');
  tvEl.querySelector('#tvClose').addEventListener('pointerdown', e => { e.stopPropagation(); closeTopView(); });
  tvEl.querySelectorAll('.tvb').forEach(b => b.addEventListener('pointerdown', e => { e.stopPropagation(); TOPVIEW.airYaw += +b.dataset.r * Math.PI / 8; }));
  tvEl.addEventListener('pointermove', e => { TOPVIEW.mx = e.clientX; TOPVIEW.my = e.clientY; });
  tvEl.addEventListener('pointerdown', e => {
    if (e.button === 2) { closeTopView(); return; }
    TOPVIEW.mx = e.clientX; TOPVIEW.my = e.clientY;
    const p = tvToWorld(e.clientX, e.clientY);
    const o = TOPVIEW.opts; if (!o) return;
    if (o.maxR && Math.hypot(p.x - player.pos.x, p.z - player.pos.z) > o.maxR) { tvFlash('Too far! Pick a spot inside the circle'); return; }
    if (o.minR && Math.hypot(p.x - player.pos.x, p.z - player.pos.z) < o.minR) { tvFlash('Too close to you!'); return; }
    if (!o.onPick(p)) closeTopView();
  });
  tvEl.addEventListener('contextmenu', e => e.preventDefault());
  tvEl.addEventListener('wheel', e => { e.preventDefault(); tvZoom(e.deltaY > 0 ? 1.15 : 1 / 1.15); }, { passive: false });
  addEventListener('keydown', e => {
    if (!TOPVIEW.on) return;
    TOPVIEW.keys[e.code] = true;
    if (e.code === 'Escape' || e.code === 'KeyM') { closeTopView(); e.stopImmediatePropagation(); }
    if (e.code === 'KeyQ') TOPVIEW.airYaw -= Math.PI / 8;
    if (e.code === 'KeyE') TOPVIEW.airYaw += Math.PI / 8;
    if (e.code === 'Equal' || e.code === 'NumpadAdd') tvZoom(1 / 1.15);
    if (e.code === 'Minus' || e.code === 'NumpadSubtract') tvZoom(1.15);
  }, true);
  addEventListener('keyup', e => { TOPVIEW.keys[e.code] = false; }, true);
}
let tvFlashT = 0, tvFlashMsg = '';
function tvFlash(m) { tvFlashMsg = m; tvFlashT = 1.6; }
function tvZoom(k) { const o = TOPVIEW.opts; TOPVIEW.span = clamp(TOPVIEW.span * k, 90, o && o.maxSpan ? o.maxSpan : 1250); }
function tvHalf() { const a = innerWidth / innerHeight, hh = TOPVIEW.span / 2; return [hh * a, hh]; }
function tvToWorld(sx, sy) { const [hw, hh] = tvHalf(); const x = TOPVIEW.cx + (sx / innerWidth - 0.5) * 2 * hw, z = TOPVIEW.cz + (sy / innerHeight - 0.5) * 2 * hh; return new THREE.Vector3(x, heightAt(x, z), z); }
function tvToScreen(x, z) { const [hw, hh] = tvHalf(); return [((x - TOPVIEW.cx) / (2 * hw) + 0.5) * innerWidth, ((z - TOPVIEW.cz) / (2 * hh) + 0.5) * innerHeight]; }

function openTopView(opts) {
  tvBuildUI();
  TOPVIEW.on = true; TOPVIEW.opts = opts; TOPVIEW.mode = opts.mode;
  TOPVIEW.cx = player.pos.x; TOPVIEW.cz = player.pos.z; TOPVIEW.span = opts.span || 300; TOPVIEW.airYaw = player.yaw; TOPVIEW.keys = {};
  TOPVIEW.mx = innerWidth / 2; TOPVIEW.my = innerHeight / 2 - 60;
  uiOpen = 'topview'; playing = false; mouse.left = mouse.right = false; zoom = false; ads = false; for (const k in keys) keys[k] = false;
  try { document.exitPointerLock(); } catch (e) { }
  tvEl.style.display = 'block'; document.body.classList.add('topview');
  tvEl.querySelector('#tvRot').style.display = opts.mode === 'air' ? 'block' : 'none';
  SFX.click();
}
function closeTopView() {
  if (!TOPVIEW.on) return;
  TOPVIEW.on = false; tvEl.style.display = 'none'; document.body.classList.remove('topview');
  if (uiOpen === 'topview') uiOpen = null;
  if (started && player.alive && !gameOver) { if (IS_TOUCH) { playing = true; } else resume(); }
}

// ---------- drawing ----------
function renderTopView() {
  const T = TOPVIEW, cam = T.cam, [hw, hh] = tvHalf();
  // pan with WASD or the arrow keys
  const k = T.keys, pan = T.span * 0.9 * (1 / 60);
  if (k.KeyW || k.ArrowUp) T.cz -= pan; if (k.KeyS || k.ArrowDown) T.cz += pan;
  if (k.KeyA || k.ArrowLeft) T.cx -= pan; if (k.KeyD || k.ArrowRight) T.cx += pan;
  if (T.opts && T.opts.maxR) { const d = Math.hypot(T.cx - player.pos.x, T.cz - player.pos.z), m = T.opts.maxR * 0.6; if (d > m) { T.cx = player.pos.x + (T.cx - player.pos.x) / d * m; T.cz = player.pos.z + (T.cz - player.pos.z) / d * m; } }
  T.cx = clamp(T.cx, -HALF, HALF); T.cz = clamp(T.cz, -HALF, HALF);
  cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh; cam.updateProjectionMatrix();
  cam.position.set(T.cx, 900, T.cz); cam.up.set(0, 0, -1); cam.lookAt(T.cx, 0, T.cz);
  const fog = scene.fog; scene.fog = null;
  const hid = [];
  for (const c of clouds) if (c.visible) { c.visible = false; hid.push(c); }
  if (typeof snowfall !== 'undefined' && snowfall) for (const L of snowfall) if (L.m.visible) { L.m.visible = false; hid.push(L.m); }
  sunLight.position.set(T.cx, 0, T.cz).addScaledVector(SUN_DIR, 400); sunLight.target.position.set(T.cx, 0, T.cz);
  renderer.clear(); renderer.render(scene, cam);
  scene.fog = fog; for (const o of hid) o.visible = true;
  tvDrawOverlay();
}
function tvDrawOverlay() {
  const T = TOPVIEW, o = T.opts || {}, W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  if (tvCv.width !== W * dpr || tvCv.height !== H * dpr) { tvCv.width = W * dpr; tvCv.height = H * dpr; }
  const g = tvCtx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const pxPerM = H / T.span;
  // control points
  for (const p of points) {
    if (p.flag && p.flag.visible === false) continue;
    const [x, y] = tvToScreen(p.x, p.z), c = p.owner ? TEAM_CSS[p.owner] : '#ffffff';
    g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.arc(x, y, Math.max(10, p.r * pxPerM), 0, 7); g.stroke();
    g.fillStyle = 'rgba(8,12,20,.75)'; g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill();
    g.fillStyle = c; g.font = '700 13px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.name, x, y + 1);
  }
  // soldiers: your team always, enemies only if someone on your team can see them
  const mates = chars.filter(c => c.alive && !c.inactive && c.team === player.team);
  for (const c of chars) {
    if (!c.alive || c.inactive) continue;
    const mine = c.team === player.team;
    if (!mine && !mates.some(m => Math.abs(m.pos.x - c.pos.x) < 90 && Math.abs(m.pos.z - c.pos.z) < 90)) continue;
    const [x, y] = tvToScreen(c.pos.x, c.pos.z);
    if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
    g.fillStyle = TEAM_CSS[c.team]; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x, y, c.isPlayer ? 6 : 4, 0, 7); g.fill(); g.stroke();
    if (c.isPlayer) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 10, 0, 7); g.stroke(); }
  }
  for (const v of gvehicles) if (v.alive && v.team !== player.team && occupants(v).length && mates.some(m => m.pos.distanceTo(v.pos) < 110)) {
    const [x, y] = tvToScreen(v.pos.x, v.pos.z); g.fillStyle = TEAM_CSS[v.team]; g.fillRect(x - 6, y - 4, 12, 8); g.strokeStyle = '#000'; g.strokeRect(x - 6, y - 4, 12, 8);
  }
  // range rings for the mortar
  const [px, py] = tvToScreen(player.pos.x, player.pos.z);
  if (o.maxR) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.arc(px, py, o.maxR * pxPerM, 0, 7); g.stroke(); g.setLineDash([]); }
  if (o.minR) { g.strokeStyle = 'rgba(255,90,90,.75)'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, o.minR * pxPerM, 0, 7); g.stroke(); }
  // shells on the way
  for (const s of mortarQ) { const [x, y] = tvToScreen(s.x, s.z); g.strokeStyle = 'rgba(255,200,60,.9)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, s.blast * pxPerM, 0, 7); g.stroke(); }
  // the aiming mark under the mouse
  const tw = tvToWorld(T.mx, T.my), dist = Math.hypot(tw.x - player.pos.x, tw.z - player.pos.z);
  const ok = (!o.maxR || dist <= o.maxR) && (!o.minR || dist >= o.minR);
  const col = ok ? '#ffd54f' : '#ff5a5a', br = (o.blast || 10) * pxPerM;
  g.strokeStyle = col; g.lineWidth = 2.5;
  g.beginPath(); g.arc(T.mx, T.my, br, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(T.mx - br - 10, T.my); g.lineTo(T.mx - 4, T.my); g.moveTo(T.mx + 4, T.my); g.lineTo(T.mx + br + 10, T.my);
  g.moveTo(T.mx, T.my - br - 10); g.lineTo(T.mx, T.my - 4); g.moveTo(T.mx, T.my + 4); g.lineTo(T.mx, T.my + br + 10); g.stroke();
  if (o.mode === 'air') {   // the line the bombs will fall along
    const L = 21 * pxPerM, dx = -Math.sin(T.airYaw), dy = -Math.cos(T.airYaw);
    g.strokeStyle = 'rgba(255,60,48,.9)'; g.lineWidth = 3; g.setLineDash([10, 6]);
    g.beginPath(); g.moveTo(T.mx - dx * L, T.my - dy * L); g.lineTo(T.mx + dx * L, T.my + dy * L); g.stroke(); g.setLineDash([]);
    for (let i = -3; i <= 3; i++) { g.fillStyle = 'rgba(255,60,48,.85)'; g.beginPath(); g.arc(T.mx + dx * i * 6 * pxPerM, T.my + dy * i * 6 * pxPerM, 3, 0, 7); g.fill(); }
  }
  g.fillStyle = col; g.font = '600 13px system-ui'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText(`${Math.round(dist)} m`, T.mx + br + 12, T.my - 6);
  // north arrow
  g.fillStyle = 'rgba(8,12,20,.75)'; g.beginPath(); g.arc(34, H - 40, 20, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = '700 12px system-ui'; g.textAlign = 'center'; g.fillText('N', 34, H - 47); g.beginPath(); g.moveTo(34, H - 31); g.lineTo(29, H - 40); g.lineTo(39, H - 40); g.fill();
  // instructions
  let txt = o.mode === 'nuke' ? `<b style="color:#ff3020">MINI NUKE</b>   ${player.nukes || 0} left<br>Click where it should land. The red circle is the blast. Stay well outside it!` : o.mode === 'air' ? `<b style="color:#ff6b5a">AIRSTRIKE</b>   ${player.airstrikes} left<br>Click where the bombs should land. Q and E turn the bomb line.` :
    `<b style="color:#ffd54f">MORTAR</b>   Shells ${o.ammoText ? o.ammoText() : ''}<br>Click to fire. You turn to face the target and watch the shell land.`;
  txt += '<br><span style="opacity:.75">Scroll to zoom, WASD to move the view, Esc to close</span>';
  if (tvFlashT > 0) txt += `<br><b style="color:#ff8a7a">${tvFlashMsg}</b>`;
  if (tvInfo.innerHTML !== txt) tvInfo.innerHTML = txt;
}

// ---------- the mortar ----------
SFX.whistle = (v = 1) => { tn('sine', 1700, 520, 1.05, 0.12 * v); tn('sine', 1720, 540, 1.05, 0.05 * v, 0.02); };
SFX.mortar = (v = 1) => { tn('sine', 140, 45, 0.35, 0.8 * v); nz('lowpass', 900, 0.35, 0.5 * v); nz('bandpass', 2400, 0.08, 0.2 * v, 2, 0.02); };
const MORTAR_RANGE = 240, MORTAR_MIN = 25, MORTAR_BLAST = 8;
let mortarReloadT = 0;
function openMortarView() {
  const w = WEAPONS.find(x => x.id === 'mortar'), a = player.ammo.mortar;
  openTopView({
    mode: 'mortar', span: 330, maxSpan: 620, maxR: MORTAR_RANGE, minR: MORTAR_MIN, blast: MORTAR_BLAST,
    ammoText: () => mortarReloadT > 0 ? 'reloading...' : `${a.mag} / ${a.reserve}`,
    onPick: p => {
      if (mortarReloadT > 0) { tvFlash('Reloading...'); return true; }
      if (a.mag <= 0) { if (a.reserve > 0) { mortarReloadT = w.reloadT; SFX.reload(); tvFlash('Reloading...'); } else tvFlash('Out of shells. Buy ammo in the shop'); return true; }
      if (TOPVIEW.lastShot && simTime - TOPVIEW.lastShot < w.rate) return true;
      TOPVIEW.lastShot = simTime; a.mag--;
      fireMortar(p);
      if (a.mag <= 0 && a.reserve > 0) { mortarReloadT = w.reloadT; SFX.reload(); }
      // back to first person, turned to face where the shell will land so you can watch it hit
      const dx = p.x - player.pos.x, dz = p.z - player.pos.z, dist = Math.hypot(dx, dz);
      player.yaw = Math.atan2(-dx, -dz);
      player.pitch = clamp(Math.atan2(p.y - (player.pos.y + 1.6), dist), -0.35, 0.25);
      return false;
    },
  });
}
function fireMortar(p) {
  const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z), spread = 1 + d * 0.018;
  const x = p.x + rand(-spread, spread), z = p.z + rand(-spread, spread);
  SFX.mortar(1);
  const tube = new THREE.Vector3(player.pos.x, player.pos.y + 1.2, player.pos.z);
  for (let i = 0; i < 6; i++) smokePuff(tube.clone().add(new THREE.Vector3(rand(-0.3, 0.3), i * 0.4, rand(-0.3, 0.3))), 0xcfcfcf, 0.4, 1.4, 1.5);
  burst(tube, 6, 0xffd27a, 6, 0.25, 0.08);
  camShake = Math.max(camShake, 0.04);
  mortarQ.push({ x, z, t: 2.0 + d / 95, whistled: false, blast: MORTAR_BLAST });
}
function updateMortar(dt) {
  if (mortarReloadT > 0) { mortarReloadT -= dt; if (mortarReloadT <= 0) { const w = WEAPONS.find(x => x.id === 'mortar'), a = player.ammo.mortar, n = Math.min(w.mag - a.mag, a.reserve); a.mag += n; a.reserve -= n; } }
  for (let i = mortarQ.length - 1; i >= 0; i--) {
    const s = mortarQ[i]; s.t -= dt;
    if (!s.whistled && s.t < 1.05) { s.whistled = true; playAt('whistle', new THREE.Vector3(s.x, heightAt(s.x, s.z), s.z), 1.2); }
    if (s.t <= 0.9) {
      const gy = heightAt(s.x, s.z);
      spawnBall(new THREE.Vector3(s.x, gy + 36, s.z), new THREE.Vector3(0, -40, 0), player, { type: 'bomb', bomb: true, r: 0.16, mass: 8, fuse: 6, color: 0x3d4a2c, radius: MORTAR_BLAST, dmg: 150, power: 42, impact: true });
      mortarQ.splice(i, 1);
    }
  }
}
function updateTopView(dt) {
  updateMortar(dt);
  if (tvFlashT > 0) tvFlashT -= dt;
  if (TOPVIEW.on && (!player.alive || gameOver || player.vehicle || player.gv)) closeTopView();
}

// ---------- the airstrike ----------
function openAirstrikeView() {
  if (player.airstrikes <= 0) { showMessage('No airstrikes. Buy one in the shop (B)', 1.2); return; }
  openTopView({
    mode: 'air', span: 520, blast: 13,
    onPick: p => { closeTopView(); airstrikeAt(p, TOPVIEW.airYaw); return true; },
  });
}
