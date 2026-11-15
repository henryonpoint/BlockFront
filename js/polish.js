// ===================== polish.js : compass, kill banners, damage numbers, settings, game feel =====================
const STATS = { headshots: 0, caps: 0, bestStreak: 0, t0: 0 };
let streak = 0, multi = 0, multiT = 0, bannerT = 0;

// ---------- kills, streaks and rewards ----------
function onPlayerKill(victim, headshot) {
  streak++; multi = multiT > 0 ? multi + 1 : 1; multiT = 4.5;
  if (headshot) { STATS.headshots++; tn('sine', 1900, 2500, 0.12, 0.22); tn('sine', 2850, 2850, 0.18, 0.12, 0.05); }
  STATS.bestStreak = Math.max(STATS.bestStreak, streak);
  let line = '';
  if (multi === 2) line = 'DOUBLE KILL'; else if (multi === 3) line = 'TRIPLE KILL'; else if (multi >= 4) line = 'MULTI KILL';
  if (streak === 3) { line = '3 STREAK  +$150'; addMoney(150, 'Streak bonus'); }
  if (streak === 5) { line = '5 STREAK  FREE AIRSTRIKE (T)'; player.airstrikes++; SFX.capture(0.6); }
  if (streak === 8) { line = '8 STREAK  +$500'; addMoney(500, 'Streak bonus'); }
  if (streak >= 10 && streak % 5 === 0) { line = `${streak} STREAK  UNSTOPPABLE`; player.airstrikes++; addMoney(300, 'Streak bonus'); SFX.capture(0.6); }
  const b = $('killBanner');
  b.children[0].textContent = headshot ? 'HEADSHOT' : 'ELIMINATED';
  b.children[1].innerHTML = `<span style="color:${TEAM_CSS[victim.team]}">${victim.name.replace(/[<>&]/g, '')}</span><small>+$${headshot ? 150 : 100}</small>`;
  b.children[2].textContent = line;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); bannerT = line ? 2.6 : 1.8;
}

// ---------- floating damage numbers ----------
const dmgNums = [], _dv = new THREE.Vector3();
function dmgNumber(point, amount, head) {
  if (SET.dmgNums === false) return;
  if (dmgNums.length > 14) { const o = dmgNums.shift(); o.el.remove(); }
  const el = document.createElement('div'); el.className = 'dmgNum' + (head ? ' head' : ''); el.textContent = Math.round(amount);
  document.body.appendChild(el);
  dmgNums.push({ el, p: point.clone().add(new THREE.Vector3(rand(-0.25, 0.25), 0.3, rand(-0.25, 0.25))), t: 0 });
}
function updateDmgNums(dt) {
  for (let i = dmgNums.length - 1; i >= 0; i--) {
    const d = dmgNums[i]; d.t += dt;
    if (d.t > 0.8) { d.el.remove(); dmgNums.splice(i, 1); continue; }
    _dv.copy(d.p); _dv.y += d.t * 1.4; _dv.project(camera);
    if (_dv.z > 1) { d.el.style.opacity = 0; continue; }
    d.el.style.left = ((_dv.x + 1) / 2 * innerWidth) + 'px'; d.el.style.top = ((1 - _dv.y) / 2 * innerHeight) + 'px';
    d.el.style.opacity = d.t < 0.5 ? 1 : 1 - (d.t - 0.5) / 0.3;
  }
}

// ---------- compass strip ----------
const cmp = $('compass'), cg = cmp.getContext('2d');
function drawCompass() {
  const W = cmp.width, H = cmp.height, span = 2.2;   // radians shown across the strip
  cg.clearRect(0, 0, W, H);
  const gr = cg.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(8,12,20,0)'); gr.addColorStop(0.2, 'rgba(8,12,20,0.55)'); gr.addColorStop(0.8, 'rgba(8,12,20,0.55)'); gr.addColorStop(1, 'rgba(8,12,20,0)');
  cg.fillStyle = gr; cg.fillRect(0, 8, W, H - 16);
  camera.getWorldDirection(_dv);
  const head = Math.atan2(_dv.x, -_dv.z);   // clockwise from north (north is up on the map)
  const X = b => W / 2 + wrapAngle(b - head) / span * W;
  cg.textAlign = 'center'; cg.textBaseline = 'middle';
  for (let d = 0; d < 360; d += 15) {
    const x = X(d * Math.PI / 180); if (x < 20 || x > W - 20) continue;
    const major = d % 90 === 0, fade = 1 - Math.abs(x - W / 2) / (W / 2);
    cg.globalAlpha = Math.min(1, fade * 2);
    cg.fillStyle = '#fff';
    if (major) { cg.font = 'bold 26px system-ui, sans-serif'; cg.fillText('NESW'[d / 90], x, H / 2 + 1); }
    else if (d % 45 === 0) { cg.font = '600 16px system-ui, sans-serif'; cg.fillText(['NE', 'SE', 'SW', 'NW'][(d - 45) / 90], x, H / 2 + 1); }
    else cg.fillRect(x - 1, H / 2 - 7, 2, 14);
  }
  for (const p of points) {
    const b = Math.atan2(p.x - player.pos.x, -(p.z - player.pos.z)), x = X(b); if (x < 26 || x > W - 26) continue;
    cg.globalAlpha = Math.min(1, (1 - Math.abs(x - W / 2) / (W / 2)) * 2.5);
    cg.fillStyle = p.owner ? TEAM_CSS[p.owner] : '#e5e7eb'; cg.beginPath(); cg.arc(x, H / 2, 17, 0, 7); cg.fill();
    cg.strokeStyle = 'rgba(0,0,0,0.6)'; cg.lineWidth = 3; cg.stroke();
    cg.fillStyle = p.owner ? '#fff' : '#111'; cg.font = 'bold 20px system-ui, sans-serif'; cg.fillText(p.name, x, H / 2 + 1);
  }
  cg.globalAlpha = 1; cg.fillStyle = '#fbbf24'; cg.beginPath(); cg.moveTo(W / 2 - 8, 0); cg.lineTo(W / 2 + 8, 0); cg.lineTo(W / 2, 11); cg.fill();
}

// ---------- settings panel (title screen and pause screen) ----------
function buildSettings(el) {
  el.innerHTML = `<div class="row"><span>Graphics</span><div class="chips">${['auto', 'low', 'medium', 'high'].map(q => `<div class="chip" data-q="${q}">${q[0].toUpperCase() + q.slice(1)}</div>`).join('')}</div></div>
    <div class="row"><span>Look speed</span><input type="range" min="0.3" max="2.5" step="0.05" data-k="sens"></div>
    <div class="row"><span>Volume</span><input type="range" min="0" max="1.5" step="0.05" data-k="vol"></div>`;
  for (const ev of ['click', 'mousedown', 'touchstart', 'pointerdown']) el.addEventListener(ev, e => e.stopPropagation());
  el.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => { SET.quality = ch.dataset.q; saveSettings(); applyQuality(); syncSettings(); }));
  el.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { SET[inp.dataset.k] = +inp.value; saveSettings(); applySound(); }));
}
function syncSettings() {
  document.querySelectorAll('.settings .chip').forEach(ch => ch.classList.toggle('on', ch.dataset.q === SET.quality));
  document.querySelectorAll('.settings input').forEach(inp => { inp.value = SET[inp.dataset.k]; });
}
function applySound() { if (master) master.gain.value = 0.5 * SET.vol; }
buildSettings($('setStart')); buildSettings($('setPause')); syncSettings();

// ---------- end of battle stats ----------
function showEndStats() {
  const mins = Math.max(1, Math.round((simTime - STATS.t0) / 60));
  const kd = player.deaths ? (player.kills / player.deaths).toFixed(1) : player.kills;
  $('endStats').innerHTML = [['Takedowns', player.kills], ['Deaths', player.deaths], ['K/D', kd], ['Headshots', STATS.headshots], ['Best streak', STATS.bestStreak], ['Points taken', STATS.caps], ['Money', '$' + player.money], ['Minutes', mins]]
    .map(([k, v]) => `<div><b>${v}</b>${k}</div>`).join('');
}

// ---------- every frame ----------
let camDip = 0, camRoll = 0, _wasGround = true, _lastVy = 0, polishT = 0;
function updatePolish(dt) {
  applySoundOnce();
  updateDmgNums(dt);
  if (multiT > 0) multiT -= dt;
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('killBanner').classList.remove('show'); }
  if (!player.alive) { streak = 0; multi = 0; }
  // god mode: full health, endless money, ammo and throwables
  if (started && godOn()) {
    player.hp = 100; player.armor = 100; player.money = 999999;
    player.grenades = Math.max(player.grenades, 9); player.stickies = Math.max(player.stickies || 0, 9); player.airstrikes = Math.max(player.airstrikes, 9); player.nukes = Math.max(player.nukes || 0, 9);
    for (const w of WEAPONS) { const a = player.ammo[w.id]; if (a) { a.mag = w.mag; if (isFinite(w.reserve)) a.reserve = w.reserve; } }
    let gm = document.getElementById('godTag'); if (!gm) { gm = document.createElement('div'); gm.id = 'godTag'; gm.className = 'hud'; gm.style.cssText = 'position:fixed;top:92px;left:50%;transform:translateX(-50%);color:#ffd54f;font:800 13px system-ui,sans-serif;letter-spacing:.2em;text-shadow:0 1px 3px #000;pointer-events:none'; gm.textContent = 'GOD MODE'; document.body.appendChild(gm); }
  }
  // the kill streak counter on screen, with the next reward to aim for
  let sk = document.getElementById('streakBox');
  if (!sk) {
    sk = document.createElement('div'); sk.id = 'streakBox'; sk.className = 'hud';
    sk.style.cssText = 'position:fixed;left:16px;top:50%;transform:translateY(-50%);background:rgba(8,12,20,.62);border:2px solid rgba(255,190,70,.6);border-radius:12px;padding:8px 14px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff;text-align:center;pointer-events:none;display:none;transition:transform .15s';
    document.body.appendChild(sk);
  }
  const next = streak < 3 ? [3, '+$150'] : streak < 5 ? [5, 'airstrike'] : streak < 8 ? [8, '+$500'] : [Math.ceil((streak + 1) / 5) * 5, 'airstrike'];
  const html = `<div style="font-size:11px;letter-spacing:.14em;opacity:.8">KILL STREAK</div><div style="font-size:30px;font-weight:800;color:${streak >= 5 ? '#ff7a3a' : '#ffd54f'};line-height:1.1">${streak}</div><div style="font-size:11px;opacity:.75">${next[0] - streak} more: ${next[1]}</div>`;
  sk.style.display = started && player.alive && streak > 0 ? 'block' : 'none';
  if (sk.dataset.v !== String(streak)) { sk.dataset.v = String(streak); sk.innerHTML = html; sk.style.transform = 'translateY(-50%) scale(1.25)'; setTimeout(() => { sk.style.transform = 'translateY(-50%) scale(1)'; }, 150); }
  const onFoot = player.alive && !player.vehicle && !player.gv && !player.turret;
  // health comes back slowly once you have been out of the fight for a while
  if (player.alive && started && player.hp < 100 && simTime - (player.lastHurt || 0) > 6) player.hp = Math.min(100, player.hp + 9 * dt);
  // landing dip and a little lean when strafing
  if (onFoot) {
    if (player.onGround && !_wasGround && _lastVy < -5) camDip = Math.min(0.32, -_lastVy * 0.022);
    _wasGround = player.onGround; _lastVy = player.velY;
    const strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    camRoll += (-strafe * 0.014 - camRoll) * Math.min(1, dt * 8);
  } else { camRoll = 0; }
  camDip *= Math.exp(-dt * 9);
  // crosshair opens with spread
  if (onFoot) {
    const w = curW(), proj = (innerHeight / 2) / Math.tan(camera.fov * Math.PI / 360);
    const spread = w.type === 'hit' ? w.spread * (ads ? 0.3 : 1) * (player.onGround ? 1 : 1.8) * (player.crouch ? 0.6 : 1) * (1 + bloom) : 0.02;
    $('crosshair').style.setProperty('--gap', (3 + Math.tan(spread) * proj).toFixed(1) + 'px');
  }
  polishT -= dt; if (polishT > 0) return; polishT = 0.05;
  if (cmp.offsetParent !== null || getComputedStyle(cmp).display !== 'none') drawCompass();
  const low = player.hp < 35;
  $('hpNum').classList.toggle('low', low); $('hpFill').classList.toggle('low', low);
  $('arNum').style.display = player.armor > 0 ? '' : 'none';
  if (onFoot) { const w = curW(), a = player.ammo[w.id]; $('wammo').className = a.mag === 0 ? 'empty' : a.mag <= w.mag * 0.25 ? 'low' : ''; }
  [...pointsEl.children].forEach((d, i) => d.classList.toggle('contest', !!points[i].contested));
  $('protect').style.display = player.alive && simTime < (player.protUntil || 0) ? 'block' : 'none';
  $('compass').style.visibility = player.alive && started ? 'visible' : 'hidden';
}
let _sndApplied = false;
function applySoundOnce() { if (!_sndApplied && master) { _sndApplied = true; applySound(); } }
