// ===================== achievements.js : achievements =====================
// Saved on this computer (localStorage). A gold box pops up when you unlock one, and the Achievements button on
// the main menu and the pause menu shows them all with your progress.
const ACHIEVEMENTS = [
  { id: 'welcome', name: 'Welcome, soldier!', desc: 'Play Blockfront for the first time' },
  { id: 'tank', name: 'Human War Tank', desc: 'Take out 200 enemies', goal: 200, stat: 'kills' },
  { id: 'bourne', name: 'Jason Bourne', desc: 'Take out 5 enemies while in a parachute', goal: 5, stat: 'chuteKills' },
  { id: 'nopeace', name: 'No Peace', desc: 'Launch a mega nuke' },
  { id: 'noplanes', name: 'No Planes Go', desc: 'Shoot down 100 planes', goal: 100, stat: 'planes' },
  // combat
  { id: 'sharp', name: 'Sharpshooter', desc: 'Get 50 headshots', goal: 50, stat: 'heads' },
  { id: 'unstop', name: 'Unstoppable', desc: 'Get a 25 kill streak without dying' },
  { id: 'oneshot', name: 'One Shot, One Kill', desc: 'Take out an enemy from more than 200 m with a sniper rifle' },
  { id: 'golden', name: 'Golden Touch', desc: 'Take out 10 enemies with the Golden Gun', goal: 10, stat: 'goldKills' },
  { id: 'jedi', name: 'Jedi in Training', desc: 'Take out 20 enemies with the lightsaber', goal: 20, stat: 'saberKills' },
  { id: 'pocket', name: 'Pocket Artillery', desc: 'Take out 3 enemies with one blast' },
  // vehicles and air
  { id: 'road', name: 'Road Rage', desc: 'Run over 25 enemies with a vehicle', goal: 25, stat: 'roadKills' },
  { id: 'ace', name: 'Ace', desc: 'Shoot down 5 planes in a single life' },
  { id: 'topgun', name: 'Top Gun', desc: 'Win a jets dogfight' },
  { id: 'baron', name: 'Red Baron', desc: 'Win the WW1 triplane dogfight' },
  { id: 'rocket', name: 'Rocket Man', desc: 'Ride the mini rocket to the top' },
  { id: 'timejump', name: 'Time Traveler', desc: 'Do a time jump in the Time Racer' },
  { id: 'thief', name: 'Car Thief', desc: 'Steal an enemy vehicle' },
  // levels
  { id: 'dday', name: 'D-Day', desc: 'Hold all three bluff bunkers in Normandy (C, D and E)' },
  { id: 'warend', name: 'The End of the War', desc: 'Find the bunker in Berlin' },
  { id: 'bungee', name: 'Bungee!', desc: 'Jump off the dam' },
  { id: 'island', name: 'Island Hopper', desc: 'Win a battle on Wake Island' },
  { id: 'tour', name: 'World Tour', desc: 'Play every map at least once' },
  // fun and money
  { id: 'treasure', name: 'Treasure Hunter', desc: 'Find 10 treasure chests', goal: 10, stat: 'chests' },
  { id: 'rich', name: 'Rich Kid', desc: 'Have $50,000 at once (no money cheat)' },
  { id: 'bag', name: 'Bag Snatcher', desc: "Pick up another player's money bag" },
  { id: 'zero', name: 'Patient Zero', desc: 'Start a zombie outbreak' },
  { id: 'slayer', name: 'Zombie Slayer', desc: 'Take out 100 zombies', goal: 100, stat: 'zombieKills' },
  { id: 'hang', name: 'Hang Time', desc: 'Glide for 30 seconds without landing' },
  // online
  { id: 'squad', name: 'Squad Up', desc: 'Play an online game' },
  { id: 'host', name: 'Host with the Most', desc: 'Host a game with 3 or more real players' },
  { id: 'chatty', name: 'Chatterbox', desc: 'Send 50 chat messages', goal: 50, stat: 'chats' },
];
const ACH = (() => { try { return Object.assign({ got: {}, kills: 0, chuteKills: 0, planes: 0 }, JSON.parse(localStorage.getItem('bf_ach') || '{}')); } catch (e) { return { got: {}, kills: 0, chuteKills: 0, planes: 0 }; } })();
function achSave() { try { localStorage.setItem('bf_ach', JSON.stringify(ACH)); } catch (e) { } }
function unlock(id) {
  if (ACH.got[id]) return;
  const a = ACHIEVEMENTS.find(x => x.id === id); if (!a) return;
  ACH.got[id] = Date.now(); achSave(); achToast(a);
}
function achCount(stat, n = 1) {
  ACH[stat] = (ACH[stat] || 0) + n;
  for (const a of ACHIEVEMENTS) if (a.stat === stat && ACH[stat] >= a.goal) unlock(a.id);
  achSave();
}
function achToast(a) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:150px;left:50%;transform:translateX(-50%) translateY(-12px);opacity:0;z-index:70;background:linear-gradient(180deg,#3a2c08,#1f1804);border:2px solid #ffd54f;border-radius:14px;padding:12px 20px;color:#fff;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.5);transition:all .35s;pointer-events:none';
  el.innerHTML = `<div style="font:700 11px system-ui,sans-serif;letter-spacing:.18em;color:#ffd54f">ACHIEVEMENT UNLOCKED</div><div style="font:800 20px system-ui,sans-serif;margin-top:3px">🏆 ${a.name}</div><div style="font-size:13px;color:#e8dcc0;margin-top:2px">${a.desc}</div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(-50%)'; });
  try { if (typeof tn === 'function' && typeof actx !== 'undefined' && actx) { tn('triangle', 880, 880, 0.12, 0.12); tn('triangle', 1320, 1320, 0.2, 0.12, 0.12); tn('triangle', 1760, 1760, 0.3, 0.1, 0.26); } } catch (e) { }
  setTimeout(() => { el.style.opacity = '0'; }, 4200); setTimeout(() => el.remove(), 4700);
}
// the list, with progress bars
function showAchievements() {
  let ov = document.getElementById('achList');
  if (!ov) {
    ov = document.createElement('div'); ov.id = 'achList';
    ov.style.cssText = 'position:fixed;inset:0;z-index:65;background:rgba(4,8,14,.7);display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#fff';
    ov.addEventListener('click', e => { if (e.target === ov || e.target.dataset.close) ov.style.display = 'none'; });
    document.body.appendChild(ov);
  }
  const done = ACHIEVEMENTS.filter(a => ACH.got[a.id]).length;
  ov.innerHTML = `<div style="width:min(560px,92vw);max-height:86vh;overflow:auto;background:#121a26;border:2px solid rgba(255,213,79,.5);border-radius:16px;padding:18px 22px">
    <div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0;font-size:22px">Achievements</h2><div class="btn" data-close="1" style="cursor:pointer;padding:6px 12px;border-radius:8px;background:#26324a">Close</div></div>
    <div style="color:#b8c4d0;font-size:13px;margin:4px 0 12px">${done} of ${ACHIEVEMENTS.length} unlocked</div>
    ${ACHIEVEMENTS.map(a => { const got = !!ACH.got[a.id], pr = a.goal ? Math.min(ACH[a.stat] || 0, a.goal) : (got ? 1 : 0), of = a.goal || 1;
      return `<div style="display:flex;gap:12px;align-items:center;padding:10px;margin-bottom:8px;border-radius:10px;background:${got ? 'rgba(255,213,79,.12)' : 'rgba(255,255,255,.04)'};border:1px solid ${got ? 'rgba(255,213,79,.5)' : 'rgba(255,255,255,.08)'}">
        <div style="font-size:28px;filter:${got ? 'none' : 'grayscale(1) opacity(.35)'}">🏆</div>
        <div style="flex:1"><div style="font-weight:800;font-size:15px">${a.name}</div><div style="font-size:13px;color:#c8d2dc">${a.desc}</div>
        ${a.goal ? `<div style="height:6px;background:rgba(255,255,255,.1);border-radius:3px;margin-top:6px"><div style="height:100%;width:${pr / of * 100}%;background:#ffd54f;border-radius:3px"></div></div><div style="font-size:11px;color:#9aa6b2;margin-top:2px">${pr} / ${of}</div>` : ''}</div></div>`; }).join('')}
  </div>`;
  ov.style.display = 'flex';
}
// buttons on the main menu and the pause menu
(function () {
  const mk = () => { const b = document.createElement('div'); b.className = 'btn'; b.textContent = '🏆 Achievements'; b.style.background = '#4a3a10'; b.addEventListener('click', e => { e.stopPropagation(); showAchievements(); }); return b; };
  const pb = document.querySelector('#pause .pauseBtns'); if (pb) pb.appendChild(mk());
  const start = document.getElementById('start');
  if (start) { const row = start.querySelector('.btnRow') || start.querySelector('.box') || start; const b = mk(); b.style.marginTop = '8px'; row.appendChild(b); }
})();

// ---------- what unlocks them ----------
const _launchA = launch;
launch = function (kind) {
  unlock('welcome');
  if (kind === 'host' || kind === 'join') unlock('squad');
  ACH.maps = ACH.maps || {}; ACH.maps[WORLD.map] = 1; achSave();
  if (Object.keys(MAPS).every(m => ACH.maps[m])) unlock('tour');
  return _launchA.apply(this, arguments);
};
const _killA = onPlayerKill;
onPlayerKill = function (victim, headshot) {
  achCount('kills');
  if (player.parachute) achCount('chuteKills');
  if (headshot) achCount('heads');
  if (victim && victim.zombie) achCount('zombieKills');
  const w = typeof curW === 'function' && !player.gv && !player.vehicle ? curW() : null;
  if (w && w.id === 'golden') achCount('goldKills');
  if (w && w.id === 'saber') achCount('saberKills');
  if (w && (w.id === 'sniper' || w.id === 'fifty') && victim && victim.pos.distanceTo(player.pos) > 200) unlock('oneshot');
  if (player.gv && player.seat === 0 && victim && victim.pos.distanceTo(player.gv.pos) < 7) achCount('roadKills');
  ACH_RUN.blast.push(simTime); ACH_RUN.blast = ACH_RUN.blast.filter(t => simTime - t < 0.35); if (ACH_RUN.blast.length >= 3) unlock('pocket');
  const r = _killA.apply(this, arguments);
  if (typeof streak !== 'undefined' && streak >= 25) unlock('unstop');
  return r;
};
const _planeDownA = destroyPlane;
destroyPlane = function (pl, attacker) {
  const was = pl.alive;
  _planeDownA.apply(this, arguments);
  if (was && !pl.alive && attacker === player && pl.team !== player.team) { achCount('planes'); ACH_RUN.lifePlanes++; if (ACH_RUN.lifePlanes >= 5) unlock('ace'); }
};
const _bombA = planeBomb;
planeBomb = function (pl, shooter) {
  const before = pl.bombs;
  _bombA.apply(this, arguments);
  if (pl.kind === 'stealth' && shooter === player && pl.bombs < before) unlock('nopeace');
};

// things that last only this game
const ACH_RUN = { blast: [], lifePlanes: 0, glideT: 0 };
const _deathA = onPlayerDeath;
onPlayerDeath = function () { ACH_RUN.lifePlanes = 0; return _deathA.apply(this, arguments); };
const _hijackA = hijackVehicle;
hijackVehicle = function (v, by) { const r = _hijackA.apply(this, arguments); if (!by || by === player) unlock('thief'); return r; };
const _endA = endGame;
endGame = function (team) {
  const r = _endA.apply(this, arguments);
  if (team === player.team) { if (JETFIGHT) unlock('topgun'); if (WWIFIGHT) unlock('baron'); if (WAKE) unlock('island'); }
  return r;
};
const _treasureA = gotTreasure;
gotTreasure = function (value, id, bag) { const fresh = !TREASURE.seenAward.has(id); const r = _treasureA.apply(this, arguments); if (fresh) { if (bag) unlock('bag'); else achCount('chests'); } return r; };
const _outbreakA = startOutbreak;
startOutbreak = function () { unlock('zero'); return _outbreakA.apply(this, arguments); };
// checked every frame
function updateAchievements(dt) {
  if (!started) return;
  if (player.money >= 50000 && !(typeof CHEAT !== 'undefined' && CHEAT.money)) unlock('rich');
  ACH_RUN.glideT = player.gliding ? ACH_RUN.glideT + dt : 0; if (ACH_RUN.glideT >= 30) unlock('hang');
  if (NORMANDY && player.team === 'blue' && ['C', 'D', 'E'].every(n => { const p = points.find(q => q.name === n); return p && p.owner === 'blue'; })) unlock('dday');
  if (net.active && net.isHost && net.remotes.size >= 3) unlock('host');
}
