// ===================== setup.js : battle setup chosen before playing =====================
// How many control points are in play, and how many soldiers each team has (computer soldiers fill
// every spot that a real player is not using). Online, the host's setup is used by everyone.
const POINT_SETS = { 3: ['A', 'C', 'E'], 5: ['A', 'B', 'C', 'D', 'E'], 7: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] };
const SOLDIER_CHOICES = [6, 10, 14, 20, 30, 40];
const BATTLE = { points: 7, soldiers: 14, diff: 'normal', clown: false, god: false };
// god mode only works in your own solo battles, so it never spoils an online game
const godOn = () => BATTLE.god && !net.active;
// how good the computer soldiers are at fighting real players (fights between computer soldiers stay the same)
const DIFFS = {
  easy: { name: 'Easy', acc: -0.18, dmg: 0.6, react: 1.6 },
  normal: { name: 'Normal', acc: 0, dmg: 1, react: 1 },
  hard: { name: 'Hard', acc: 0.1, dmg: 1.25, react: 0.75 },
  insane: { name: 'Insane', acc: 0.22, dmg: 1.6, react: 0.5 },
};
const DIFF = () => DIFFS[BATTLE.diff] || DIFFS.normal;
try { const b = JSON.parse(localStorage.getItem('bf_battle') || '{}'); if (POINT_SETS[b.points]) BATTLE.points = b.points; if (SOLDIER_CHOICES.includes(b.soldiers)) BATTLE.soldiers = b.soldiers; if (DIFFS[b.diff]) BATTLE.diff = b.diff; BATTLE.clown = b.clown === true; BATTLE.god = b.god === true; } catch (e) { }
function saveBattle(extra) {
  try { const old = JSON.parse(localStorage.getItem('bf_battle') || '{}'); localStorage.setItem('bf_battle', JSON.stringify(Object.assign(old, { points: BATTLE.points, soldiers: BATTLE.soldiers, diff: BATTLE.diff, clown: BATTLE.clown, god: BATTLE.god }, extra || {}))); } catch (e) { }
}
// a new map or mode means building a different world, so the page reloads
function chooseWorld(key, val) {
  if (WORLD[key] === val) return;
  saveBattle({ [key]: val, map: key === 'map' ? val : WORLD.map, mode: key === 'mode' ? val : WORLD.mode });
  try { sessionStorage.removeItem('bf_force'); sessionStorage.setItem('bf_reopen', '1'); } catch (e) { }
  document.body.classList.add('reloading'); location.reload();
}

let allPoints = null, appliedPoints = 0;
const KOTH_TIME = 150;
const holdScore = { blue: 0, red: 0, green: 0, yellow: 0 };
function tdmTarget() { return 40 + BATTLE.soldiers * 3; }
function centerPoint() { return points.find(p => p.name === 'C') || points[0]; }
function buildPointHud() {
  pointsEl.innerHTML = '';
  for (const p of points) { const d = document.createElement('div'); d.className = 'pt'; d.innerHTML = `<div class="fill"></div><span>${p.name}</span>`; pointsEl.appendChild(d); }
}
// switch control points on or off; the order in `points` stays the same on every computer
function applyPointCount(n) {
  if (!POINT_SETS[n]) n = 7;
  if (!allPoints) allPoints = points.slice();
  if (appliedPoints === n) return;
  appliedPoints = n;
  const want = WORLD.mode === 'koth' ? ['C'] : POINT_SETS[n];
  const hidden = WORLD.mode === 'tdm';   // team battle: points only guide the soldiers around, nobody captures them
  points.length = 0;
  for (const p of allPoints) {
    const on = want.includes(p.name);
    p.flag.visible = on && !hidden; p.ringMat.visible = on && !hidden; p.spriteMat.visible = on && !hidden;
    if (!on) { p.owner = null; p.progress = 0; p.blueIn = p.redIn = 0; p.cnt = null; p.contested = false; p.capTeam = null; }
    else points.push(p);
  }
  for (const c of chars) if (c.goalPoint && !points.includes(c.goalPoint)) { c.goalPoint = null; c.goal = null; c.goalT = 0; }
  buildPointHud();
  pointsEl.style.display = hidden ? 'none' : '';
}
// called at the start of a battle, and when an online host's setup arrives
function applyBattle(cfg, fromHost) {
  const changed = cfg.points !== BATTLE.points || cfg.soldiers !== BATTLE.soldiers;
  if (POINT_SETS[cfg.points]) BATTLE.points = cfg.points;
  if (SOLDIER_CHOICES.includes(cfg.soldiers)) BATTLE.soldiers = cfg.soldiers;
  if (cfg.diff && DIFFS[cfg.diff]) BATTLE.diff = cfg.diff;
  applyPointCount(BATTLE.points);
  if (fromHost && changed && started) showMessage(`Using the host's battle setup: ${BATTLE.points} control points, ${BATTLE.soldiers} soldiers per team`, 5);
  syncBattleUI();
}

// ---------- the setup card on the start screen ----------
function syncBattleUI() {
  document.querySelectorAll('#battleMap .chip').forEach(c => c.classList.toggle('on', c.dataset.v === WORLD.map));
  document.querySelectorAll('#battleMode .chip').forEach(c => c.classList.toggle('on', c.dataset.v === WORLD.mode));
  document.querySelectorAll('#battlePts .chip').forEach(c => c.classList.toggle('on', +c.dataset.v === BATTLE.points));
  document.querySelectorAll('#battleSol .chip').forEach(c => c.classList.toggle('on', +c.dataset.v === BATTLE.soldiers));
  document.querySelectorAll('#battleDiff .chip').forEach(c => c.classList.toggle('on', c.dataset.v === BATTLE.diff));
  document.querySelectorAll('#battleClown .chip').forEach(c => c.classList.toggle('on', (c.dataset.v === 'on') === BATTLE.clown));
  document.querySelectorAll('#battleGod .chip').forEach(c => c.classList.toggle('on', (c.dataset.v === 'on') === BATTLE.god));
  const ptsRow = $('battlePts'); if (ptsRow) { ptsRow.style.display = WORLD.mode === 'conquest' || WORLD.mode === 'four' ? '' : 'none'; ptsRow.previousElementSibling.style.display = ptsRow.style.display; }
  const note = $('battleNote');
  if (note) note.textContent = WORLD.mode === 'four' ? 'Four armies, one map. Blue, red, green and yellow each start in their own corner. Hold every point to win.' : WORLD.mode === 'tdm' ? `Team battle: first team to ${tdmTarget()} takedowns wins.` : WORLD.mode === 'koth' ? `King of the hill: hold point C for ${KOTH_TIME} seconds in total to win.` : BATTLE.soldiers >= 30 ? 'Big battles need a fast computer. If it gets slow, pick fewer soldiers.' : BATTLE.points === 3 ? 'Small map: the fight stays in the middle.' : BATTLE.points === 5 ? 'Medium map: the far left and right points are off.' : 'Full map: all seven points.';
}
(function buildBattleUI() {
  const box = $('battleSetup'); if (!box) return;
  box.innerHTML = `
    <div class="fieldLabel">Map</div>
    <div class="chips" id="battleMap">${Object.entries(MAPS).map(([k, v]) => `<div class="chip" data-v="${k}">${v}</div>`).join('')}</div>
    <div class="fieldLabel">Game mode</div>
    <div class="chips" id="battleMode">${Object.entries(MODES).map(([k, v]) => `<div class="chip" data-v="${k}">${v}</div>`).join('')}</div>
    <div class="fieldLabel">Control points</div>
    <div class="chips" id="battlePts">${[3, 5, 7].map(n => `<div class="chip" data-v="${n}">${n}</div>`).join('')}</div>
    <div class="fieldLabel">Soldiers per team</div>
    <div class="chips" id="battleSol">${SOLDIER_CHOICES.map(n => `<div class="chip" data-v="${n}">${n}</div>`).join('')}</div>
    <div class="fieldLabel">Enemy difficulty</div>
    <div class="chips" id="battleDiff">${Object.entries(DIFFS).map(([k, v]) => `<div class="chip" data-v="${k}">${v.name}</div>`).join('')}</div>
    <div class="fieldLabel">Crazy clown</div>
    <div class="chips" id="battleClown"><div class="chip" data-v="off">Off</div><div class="chip" data-v="on">On</div></div>
    <div class="fieldLabel">Cheats (solo only)</div>
    <div class="chips" id="battleGod"><div class="chip" data-v="off">Off</div><div class="chip" data-v="on">God mode</div></div>
    <p class="small" id="battleNote"></p>`;
  box.querySelectorAll('#battleMap .chip').forEach(c => c.addEventListener('click', () => chooseWorld('map', c.dataset.v)));
  box.querySelectorAll('#battleMode .chip').forEach(c => c.addEventListener('click', () => chooseWorld('mode', c.dataset.v)));
  box.querySelectorAll('#battlePts .chip').forEach(c => c.addEventListener('click', () => { BATTLE.points = +c.dataset.v; saveBattle(); syncBattleUI(); }));
  box.querySelectorAll('#battleSol .chip').forEach(c => c.addEventListener('click', () => { BATTLE.soldiers = +c.dataset.v; saveBattle(); syncBattleUI(); }));
  box.querySelectorAll('#battleDiff .chip').forEach(c => c.addEventListener('click', () => { BATTLE.diff = c.dataset.v; saveBattle(); syncBattleUI(); }));
  box.querySelectorAll('#battleClown .chip').forEach(c => c.addEventListener('click', () => { BATTLE.clown = c.dataset.v === 'on'; saveBattle(); syncBattleUI(); }));
  box.querySelectorAll('#battleGod .chip').forEach(c => c.addEventListener('click', () => { BATTLE.god = c.dataset.v === 'on'; saveBattle(); syncBattleUI(); }));
  syncBattleUI();
})();
