// ===================== console.js : the cheat console =====================
// Press ` (the key left of 1) or tap CHEATS to open it, in the middle of a battle.
//   Cheats: god mode, endless ammo, endless money, a quick $10,000
//   Weapons: get any weapon straight away
//   Vehicles: drop any vehicle right next to you
//   Teleport: pick a spot from above, jump to another player, or bring another player to you
//   Settings: difficulty, mouse speed, view width, music, the clown
// There is also a line to type commands into (type help).
// Solo, cheats always work. Online, the host decides: the host's "Allow cheats" switch turns them on for everyone.
const CHEAT = { god: false, ammo: false, money: false };
function cheatsOK() { return !net.active || !!net.cheatsAllowed; }
(function () {
  const css = `
  #con { position: fixed; inset: 0; z-index: 60; display: none; align-items: center; justify-content: center; background: rgba(4,8,14,.55);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #fff; }
  #con .box { width: min(860px, 94vw); max-height: 88vh; overflow: auto; background: rgba(14,20,30,.96); border: 2px solid rgba(255,213,79,.5); border-radius: 16px; padding: 18px 22px; box-shadow: 0 10px 40px rgba(0,0,0,.5); }
  #con h2 { margin: 0 0 4px; font-size: 22px; } #con .sub { color: #b8c4d0; font-size: 13px; margin-bottom: 10px; }
  #con h3 { margin: 14px 0 6px; font-size: 14px; letter-spacing: .08em; text-transform: uppercase; color: #ffd54f; }
  #con .row { display: flex; flex-wrap: wrap; gap: 6px; }
  #con button { font: 600 14px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #fff; background: #26324a; border: 1px solid #3c4c6a; border-radius: 9px; padding: 8px 12px; cursor: pointer; }
  #con button:hover { background: #33446a; } #con button.on { background: #2e7d4a; border-color: #4fbf78; } #con button.off { opacity: .45; cursor: default; }
  #con input[type=text] { width: 100%; box-sizing: border-box; margin-top: 8px; padding: 10px 12px; border-radius: 10px; border: 2px solid #3c4c6a; background: #0b1018; color: #fff; font: 500 15px ui-monospace, Menlo, Consolas, monospace; }
  #con .out { margin-top: 6px; min-height: 20px; color: #9fe0b0; font-size: 13px; white-space: pre-wrap; }
  #con .close { float: right; } #con .lock { color: #ffb4a8; font-size: 13px; margin-top: 6px; }
  #con label { font-size: 13px; color: #c8d2dc; margin-right: 6px; } #con input[type=range] { vertical-align: middle; width: 160px; }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'con'; document.body.appendChild(el);
  let open = false, wasPlaying = false;

  function out(t) { const o = el.querySelector('.out'); if (o) o.textContent = t; }
  function need() { if (cheatsOK()) return true; out('Cheats are off in this online game. The host can turn them on.'); return false; }
  function give(id) {
    const i = WEAPONS.findIndex(w => w.id === id || w.name.toLowerCase() === String(id).toLowerCase()); if (i < 0) return out('No weapon called ' + id);
    if (!need()) return;
    const w = WEAPONS[i]; player.owned[w.id] = true; const a = player.ammo[w.id]; if (a) { a.mag = w.mag; if (isFinite(w.reserve)) a.reserve = w.reserve; }
    if (player.alive) selectWeapon(i); out('You have the ' + w.name);
  }
  function spawnVehicle(type) {
    if (!need()) return;
    if (typeof cheatSpawnVehicle === 'function') return out(cheatSpawnVehicle(type));
    out('Vehicles can not be spawned here yet');
  }
  function teleportTo(x, z, y) {
    if (!need()) return;
    if (!player.alive) return out('Deploy first');
    if (player.gv) leaveSeat(player); if (player.vehicle) interact(); if (player.planeGun) leavePlaneGun();
    const gy = y !== undefined ? y : heightAt(x, z);
    player.pos.set(clamp(x, -EDGE, EDGE), gy + 0.1, clamp(z, -EDGE, EDGE)); player.velY = 0; player.onGround = false;
    out(`Teleported to ${Math.round(x)}, ${Math.round(z)}`);
  }
  function others() { return [...net.remotes.values()].map(r => r.char).filter(c => c.alive); }
  function findPlayer(name) { const n = String(name || '').toLowerCase(); return others().find(c => c.name.toLowerCase().startsWith(n)); }
  function bring(c) {
    if (!need()) return;
    stamp(net.cmd, ['tp', c.peerId, r10(player.pos.x + 2), r10(player.pos.y), r10(player.pos.z + 2)], 6);
    out(`Bringing ${c.name} to you`);
  }
  function setDiff(d) { if (!DIFFS[d]) return; if (net.active && !net.isHost) return out('Only the host can change the difficulty'); BATTLE.diff = d; try { const b = JSON.parse(localStorage.getItem('bf_battle') || '{}'); b.diff = d; localStorage.setItem('bf_battle', JSON.stringify(b)); } catch (e) { } render(); out('Difficulty: ' + DIFFS[d].name); }

  function render() {
    const ok = cheatsOK(), host = net.active && net.isHost;
    const b = (label, on, fn, dis) => `<button data-fn="${fn}" class="${on ? 'on' : ''}${dis ? ' off' : ''}">${label}</button>`;
    let h = `<div class="box"><button class="close" data-fn="close">Close (\`)</button><h2>Console</h2>
      <div class="sub">Cheats and settings, any time in the battle.${net.active ? (ok ? ' Cheats are ON in this online game.' : ' Online: cheats are off unless the host turns them on.') : ''}</div>`;
    if (host) h += `<div class="row">${b(net.allowCheats ? 'Cheats allowed for everyone' : 'Allow cheats for everyone', net.allowCheats, 'allow')}</div>`;
    h += `<h3>Cheats</h3><div class="row">${b('God mode', CHEAT.god, 'god', !ok)}${b('Endless ammo', CHEAT.ammo, 'ammo', !ok)}${b('Endless money', CHEAT.money, 'money', !ok)}${b('+$10,000', false, 'cash', !ok)}${b('Full health', false, 'heal', !ok)}</div>`;
    if (typeof ZOMBIE !== 'undefined') h += `<h3>Zombies</h3><div class="row">${b(ZOMBIE.on ? 'Zombie mode on' : 'Zombie mode', ZOMBIE.on, 'zombie', !ok || (net.active && !net.isHost))}${b('Start an outbreak', false, 'outbreak', !ok || !ZOMBIE.on || (net.active && !net.isHost))}</div><div class="sub">With zombie mode on, soldiers killed by a nuke get back up as zombies, and anyone a zombie kills turns too.</div>`;
    h += `<h3>Weapons</h3><div class="row">${WEAPONS.map(w => b(w.name, player.owned[w.id], 'give:' + w.id, !ok)).join('')}</div>`;
    const vlist = typeof CHEAT_VEHICLES !== 'undefined' ? CHEAT_VEHICLES : [];
    if (vlist.length) h += `<h3>Spawn a vehicle next to you</h3><div class="row">${vlist.map(v => b(v.name, false, 'veh:' + v.id, !ok)).join('')}</div>`;
    h += `<h3>Teleport</h3><div class="row">${b('Pick a spot from above', false, 'tpmap', !ok)}${others().map(c => b('Go to ' + c.name, false, 'tpto:' + c.peerId, !ok) + b('Bring ' + c.name + ' here', false, 'bring:' + c.peerId, !ok)).join('')}</div>`;
    h += `<h3>Settings</h3><div class="row">${Object.keys(DIFFS).map(d => b(DIFFS[d].name, BATTLE.diff === d, 'diff:' + d, net.active && !net.isHost)).join('')}${b(musicOn ? 'Music on' : 'Music off', musicOn, 'music')}${b(BATTLE.clown ? 'Clown on' : 'Clown off', BATTLE.clown, 'clown', net.active && !net.isHost)}</div>
      <div class="row" style="margin-top:8px"><label>Mouse speed</label><input type="range" min="0.3" max="2.5" step="0.1" value="${SET.sens || 1}" data-set="sens"><label style="margin-left:14px">View width</label><input type="range" min="60" max="100" step="1" value="${SET.fov || 75}" data-set="fov"></div>`;
    h += `<input type="text" placeholder="Type a command (help for the list) and press Enter" autocomplete="off"><div class="out"></div></div>`;
    el.innerHTML = h;
    const inp = el.querySelector('input[type=text]');
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { run(inp.value); inp.value = ''; } if (e.key === 'Escape' || e.code === 'Backquote') { e.preventDefault(); close(); } });
    inp.addEventListener('keyup', e => e.stopPropagation());
    el.querySelectorAll('input[type=range]').forEach(r => r.addEventListener('input', () => { SET[r.dataset.set] = +r.value; if (typeof saveSettings === 'function') saveSettings(); }));
  }
  el.addEventListener('click', e => {
    const t = e.target.closest('[data-fn]'); if (!t) { if (e.target === el) close(); return; }
    const [fn, arg] = t.dataset.fn.split(':');
    if (fn === 'close') return close();
    if (fn === 'allow') { net.allowCheats = !net.allowCheats; net.cheatsAllowed = net.allowCheats; out(net.allowCheats ? 'Cheats are on for everyone in this game' : 'Cheats are off'); }
    else if (fn === 'god' && need()) CHEAT.god = !CHEAT.god;
    else if (fn === 'ammo' && need()) CHEAT.ammo = !CHEAT.ammo;
    else if (fn === 'money' && need()) CHEAT.money = !CHEAT.money;
    else if (fn === 'cash' && need()) { addMoney(10000, 'Cheat'); }
    else if (fn === 'heal' && need()) { player.hp = 100; player.armor = 100; }
    else if (fn === 'zombie' && need() && !(net.active && !net.isHost)) { ZOMBIE.on = !ZOMBIE.on; out(ZOMBIE.on ? 'Zombie mode on: nuke some soldiers, or start an outbreak' : 'Zombie mode off'); }
    else if (fn === 'outbreak' && need() && ZOMBIE.on && !(net.active && !net.isHost)) { startOutbreak(); out('Outbreak! Eight soldiers have turned'); }
    else if (fn === 'give') give(arg);
    else if (fn === 'veh') spawnVehicle(arg);
    else if (fn === 'tpmap' && need()) { close(); openTopView({ mode: 'tp', span: 700, blast: 3, onPick: p => { closeTopView(); teleportTo(p.x, p.z); showMessage('Teleported!', 1.5); return true; } }); return; }
    else if (fn === 'tpto') { const c = others().find(o => o.peerId === arg); if (c) teleportTo(c.pos.x + 2, c.pos.z + 2, c.pos.y); }
    else if (fn === 'bring') { const c = others().find(o => o.peerId === arg); if (c) bring(c); }
    else if (fn === 'diff') setDiff(arg);
    else if (fn === 'music') { initAudio(); setMusic(!musicOn); }
    else if (fn === 'clown') { if (!(net.active && !net.isHost)) { BATTLE.clown = !BATTLE.clown; } }
    const msg = el.querySelector('.out') && el.querySelector('.out').textContent; render(); if (msg) out(msg);
  });
  function run(line) {
    const [cmd, ...a] = String(line).trim().split(/\s+/), c = (cmd || '').toLowerCase();
    if (!c) return;
    if (c === 'help') return out('god, ammo, money, cash [amount], heal, give <weapon>, spawn <vehicle>, tp <x> <z>, tp <player>, bring <player>, diff <easy|normal|hard|insane>, weapons, vehicles');
    if (c === 'weapons') return out(WEAPONS.map(w => w.id).join(', '));
    if (c === 'vehicles') return out((typeof CHEAT_VEHICLES !== 'undefined' ? CHEAT_VEHICLES : []).map(v => v.id).join(', '));
    if (c === 'god' && need()) { CHEAT.god = !CHEAT.god; return out('God mode ' + (CHEAT.god ? 'on' : 'off')); }
    if (c === 'ammo' && need()) { CHEAT.ammo = !CHEAT.ammo; return out('Endless ammo ' + (CHEAT.ammo ? 'on' : 'off')); }
    if (c === 'money' && need()) { CHEAT.money = !CHEAT.money; return out('Endless money ' + (CHEAT.money ? 'on' : 'off')); }
    if (c === 'cash' && need()) { const n = Math.min(1e7, Math.max(0, parseInt(a[0], 10) || 10000)); addMoney(n, 'Cheat'); return out('+$' + n); }
    if (c === 'heal' && need()) { player.hp = 100; player.armor = 100; return out('Healed'); }
    if (c === 'give') return give(a.join(' '));
    if (c === 'spawn') return spawnVehicle(a[0]);
    if (c === 'tp') { if (a.length >= 2 && !isNaN(+a[0])) return teleportTo(+a[0], +a[1]); const p = findPlayer(a[0]); return p ? teleportTo(p.pos.x + 2, p.pos.z + 2, p.pos.y) : out('No player called ' + a[0]); }
    if (c === 'bring') { const p = findPlayer(a[0]); return p ? bring(p) : out('No player called ' + a[0]); }
    if (c === 'diff') return setDiff((a[0] || '').toLowerCase());
    out('Unknown command. Type help');
  }
  function openCon() {
    if (open || !started) return;
    open = true; wasPlaying = playing; playing = false; uiOpen = uiOpen || 'console';
    mouse.left = mouse.right = false; zoom = false; ads = false; for (const k in keys) keys[k] = false;
    try { document.exitPointerLock(); } catch (e) { }
    render(); el.style.display = 'flex'; setTimeout(() => { const i = el.querySelector('input[type=text]'); if (i && !IS_TOUCH) i.focus(); }, 0);
  }
  function close() {
    if (!open) return;
    open = false; el.style.display = 'none'; if (uiOpen === 'console') uiOpen = null;
    if (wasPlaying && player.alive && !gameOver) { playing = true; if (!IS_TOUCH && typeof lockPointer === 'function') lockPointer(); }
  }
  window.openConsole = openCon;
  addEventListener('keydown', e => {
    if (e.code !== 'Backquote' || !started) return;
    if (document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) && !open) return;
    e.preventDefault(); open ? close() : openCon();
  });
  // a CHEATS button for phones and tablets
  const side = document.getElementById('tSide');
  if (side) {
    const b = document.createElement('div'); b.className = 'tb sm'; b.id = 'tCon'; b.textContent = 'CHEATS'; b.style.fontSize = '8px'; side.appendChild(b);
    const tap = e => { e.preventDefault(); e.stopPropagation(); open ? close() : openCon(); };
    b.addEventListener('touchstart', tap, { passive: false }); b.addEventListener('click', tap);
  }
})();

// every frame: keep the cheats topped up, and follow "bring" requests from other players
function updateCheats(dt) {
  if (!started) return;
  const ok = cheatsOK();
  if (ok && CHEAT.god && player.alive) { player.hp = 100; player.armor = 100; }
  if (ok && CHEAT.ammo) { for (const w of WEAPONS) { const a = player.ammo[w.id]; if (a) { a.mag = w.mag; if (isFinite(w.reserve)) a.reserve = w.reserve; } } player.grenades = Math.max(player.grenades, 5); player.stickies = Math.max(player.stickies || 0, 3); }
  if (ok && CHEAT.money) player.money = Math.max(player.money, 999999);
  let tag = document.getElementById('cheatTag');
  const any = ok && (CHEAT.god || CHEAT.ammo || CHEAT.money);
  if (any && !tag) { tag = document.createElement('div'); tag.id = 'cheatTag'; tag.className = 'hud'; tag.style.cssText = 'position:fixed;top:108px;left:50%;transform:translateX(-50%);color:#ffd54f;font:800 12px system-ui,sans-serif;letter-spacing:.15em;text-shadow:0 1px 3px #000;pointer-events:none'; document.body.appendChild(tag); }
  if (tag) { tag.style.display = any ? 'block' : 'none'; tag.textContent = [CHEAT.god && 'GOD', CHEAT.ammo && 'AMMO', CHEAT.money && 'MONEY'].filter(Boolean).join(' · ') + ' CHEATS'; }
}
// a "bring here" from another player (cheats on): move to where they asked
function applyCheatCommand(e, from) {
  if (e[1] !== 'tp' || e[2] !== net.myId || !net.cheatsAllowed || !player.alive) return;
  if (player.gv) leaveSeat(player); if (player.vehicle) interact(); if (player.planeGun) leavePlaneGun();
  player.pos.set(e[3] / 10, e[4] / 10 + 0.2, e[5] / 10); player.velY = 0;
  showMessage(`${from ? from.name : 'Someone'} brought you to them`, 2.5);
}

// ---------- spawning vehicles (works online: the host makes them and tells everyone) ----------
// every vehicle in the game, plus the three planes
const CHEAT_VEHICLES = Object.keys(VTYPES).map(id => ({ id, name: VTYPES[id].name }))
  .concat([{ id: 'plane', name: 'Old fighter plane' }, { id: 'f18', name: 'F-18 Hornet' }, { id: 'f22', name: 'F-22 Raptor' }, { id: 'stealth', name: 'Stealth bomber' }, { id: 'triplane', name: 'Red triplane' }, { id: 'biplane', name: 'Biplane' }]);
const PLANE_SPAWN = { plane: 'prop', f18: 'f18', f22: 'f22', stealth: 'stealth', triplane: 'triplane', biplane: 'biplane' };
const SPAWNED = [];   // [index, type, team, x*10, z*10, yaw*100] for every vehicle made from the console, in order
const SPAWN_CAP = 30;
function spawnSpot() {
  const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
  for (const d of [6, 9, 12, 4]) for (const side of [0, 3, -3]) { const x = player.pos.x + fx * d - fz * side, z = player.pos.z + fz * d + fx * side; if (!blockedAt(x, z, heightAt(x, z), 2, true)) return { x, z }; }
  return { x: player.pos.x + fx * 6, z: player.pos.z + fz * 6 };
}
function hostSpawn(type, team, x, z, yaw) {
  if (SPAWNED.length >= SPAWN_CAP) return null;
  if (PLANE_SPAWN[type]) {   // planes live in their own list
    const pl = makePlane(team, x, z, yaw, 1e9, PLANE_SPAWN[type]); pl.parked = true; pl.homeTeam = team;
    SPAWNED.push([pl.idx, 'plane:' + PLANE_SPAWN[type], team, r10(x), r10(z), Math.round(yaw * 100)]);
    return pl;
  }
  if (!VTYPES[type]) return null;
  const water = VTYPES[type].boat;
  const v = makeGV(type, team, x, z, yaw, water ? WATER_Y : undefined);
  SPAWNED.push([v.idx, type, team, r10(x), r10(z), Math.round(yaw * 100)]);
  return v;
}
function cheatSpawnVehicle(type) {
  type = String(type || '').toLowerCase();
  if (!VTYPES[type] && !PLANE_SPAWN[type]) return 'No vehicle called ' + type + '. Type vehicles for the list';
  if (!player.alive) return 'Deploy first';
  const nm = PLANE_SPAWN[type] ? PLANE_KINDS[PLANE_SPAWN[type]].name : VTYPES[type].name;
  let s = spawnSpot();
  if (PLANE_SPAWN[type]) { const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw); s = { x: player.pos.x + fx * 12, z: player.pos.z + fz * 12 }; }
  if (VTYPES[type] && VTYPES[type].boat && waterDepth(s.x, s.z) < 1.2) {   // boats go in the nearest deep water
    let best = null;
    for (let r = 10; r <= 600 && !best; r += 10) for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, x = player.pos.x + Math.cos(a) * r, z = player.pos.z + Math.sin(a) * r; if (Math.abs(x) < EDGE && Math.abs(z) < EDGE && waterDepth(x, z) > 1.5) { best = { x, z }; break; } }
    if (!best) return 'There is no water deep enough for a boat on this map';
    s = best;
  }
  const yaw = player.yaw;
  if (net.active && !net.isHost) { netRequest(['vs', type, r10(s.x), r10(s.z), Math.round(yaw * 100), teamIdx(player.team)]); return 'Asking the host to drop a ' + nm; }
  const v = hostSpawn(type, player.team, s.x, s.z, yaw);
  return v ? `${nm} dropped next to you${PLANE_SPAWN[type] ? ' (press E at it to fly)' : ''}` : 'Too many spawned vehicles in this battle';
}
function spawnRequest(e) {   // host: a joiner asked for a vehicle
  if (!net.cheatsAllowed) return;
  hostSpawn(e[2], teamOf(e[6]) || 'blue', e[3] / 10, e[4] / 10, e[5] / 100);
}
function applySpawned(list) {   // everyone else: make the host's spawned vehicles, in the same order
  if (!Array.isArray(list)) return;
  for (const [idx, type, team, x, z, yaw] of list) {
    if (SPAWNED.some(e => e[0] === idx && e[1] === type)) continue;
    if (String(type).startsWith('plane:')) {
      if (idx !== planes.length) continue;
      const pl = makePlane(team, x / 10, z / 10, yaw / 100, 1e9, type.slice(6)); pl.parked = true; pl.homeTeam = team;
      SPAWNED.push([idx, type, team, x, z, yaw]); continue;
    }
    if (idx < gvehicles.length || !VTYPES[type]) continue;
    if (idx !== gvehicles.length) break;   // wait until the ones before it exist
    makeGV(type, team, x / 10, z / 10, yaw / 100, VTYPES[type].boat ? WATER_Y : undefined);
    SPAWNED.push([idx, type, team, x, z, yaw]);
  }
}
