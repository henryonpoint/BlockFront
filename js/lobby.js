// ===================== lobby.js : host a game, or join one from the list or with a code =====================
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O or 1/I, so codes are easy to read out
function newCode() { let c = ''; for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return c; }
const cleanCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
let hostVis = 'pub', listTimer = null;

function openPanel(id) { closeLobbyPanels(); $(id).classList.add('on'); }
function closeLobbyPanels() {
  $('hostPanel').classList.remove('on'); $('joinPanel').classList.remove('on');
  if (listTimer) { clearInterval(listTimer); listTimer = null; }
}
function setupSummary() {
  const pts = WORLD.mode === 'conquest' || WORLD.mode === 'four' ? `${BATTLE.points} control points, ` : '';
  return `${MAPS[WORLD.map]}, ${MODES[WORLD.mode]}, ${pts}${BATTLE.soldiers} soldiers per team. Change these in Battle setup.`;
}

// ---------- hosting ----------
$('hostBtn').addEventListener('click', e => {
  e.stopPropagation();
  const nm = $('nameIn').value.trim() || 'Soldier';
  if (!$('gameNameIn').value) $('gameNameIn').value = nm + "'s battle";
  $('hostSummary').textContent = setupSummary();
  openPanel('hostPanel');
});
document.querySelectorAll('#hostVis .chip').forEach(c => c.addEventListener('click', () => {
  hostVis = c.dataset.v; document.querySelectorAll('#hostVis .chip').forEach(o => o.classList.toggle('on', o === c));
}));
$('gameNameIn').addEventListener('keydown', e => e.stopPropagation());
$('hostBack').addEventListener('click', e => { e.stopPropagation(); closeLobbyPanels(); });
$('hostGo').addEventListener('click', e => {
  e.stopPropagation();
  const name = $('gameNameIn').value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24) || 'Battle';
  launch('host', { code: newCode(), pub: hostVis === 'pub', name });
});

// ---------- joining ----------
function joinFailed(msg) { openPanel('joinPanel'); startListing(); $('joinErr').textContent = msg; }
function joinGame(code) {
  code = cleanCode(code);
  if (code.length !== 4) { $('joinErr').textContent = 'Codes are 4 letters or numbers.'; return; }
  $('joinErr').textContent = '';
  launch('join', { code });
}
function drawList() {
  const box = $('gameList'); if (!box || !$('joinPanel').classList.contains('on')) return;
  if (!LOBBY.list) { box.innerHTML = '<p class="small">Looking for games...</p>'; return; }
  const games = publicGames();
  if (!games.length) { box.innerHTML = '<p class="small">No public games right now. Host one, or join a friend with their code.</p>'; return; }
  box.innerHTML = '';
  for (const g of games) {
    const d = document.createElement('div'); d.className = 'game';
    const esc = s => String(s || '').replace(/[<>&]/g, '');
    d.innerHTML = `<div><b>${esc(g.name)}</b><span>${esc(MAPS[g.map] || g.map)}, ${esc(MODES[g.mode] || g.mode)}, ${g.sol} per team. Host: ${esc(g.host)}</span></div><div class="gp">${g.n} playing</div>`;
    d.addEventListener('click', ev => { ev.stopPropagation(); joinGame(g.code); });
    box.appendChild(d);
  }
}
function startListing() {
  openLobby().then(drawList);
  if (!listTimer) listTimer = setInterval(drawList, 1500);
  drawList();
}
$('joinBtn').addEventListener('click', e => { e.stopPropagation(); $('joinErr').textContent = ''; openPanel('joinPanel'); startListing(); });
$('joinBack').addEventListener('click', e => { e.stopPropagation(); closeLobbyPanels(); });
$('joinRefresh').addEventListener('click', e => { e.stopPropagation(); drawList(); });
$('codeIn').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') joinGame($('codeIn').value); });
$('codeIn').addEventListener('input', () => { $('codeIn').value = cleanCode($('codeIn').value); });
$('codeGo').addEventListener('click', e => { e.stopPropagation(); joinGame($('codeIn').value); });
// clicks inside the panels should not start the game or lock the mouse
document.querySelectorAll('.lobbyBox').forEach(b => b.addEventListener('click', e => e.stopPropagation()));

// ---------- after a reload: finish joining a game that needed a different map or mode ----------
if (WORLD.force && WORLD.force.join) {
  const f = WORLD.force;
  try { sessionStorage.removeItem('bf_force'); } catch (e) { }
  if (f.name) $('nameIn').value = f.name;
  if (f.team) { teamPref = f.team; document.querySelectorAll('#teamPick .chip').forEach(o => o.classList.toggle('on', o.dataset.t === f.team)); }
  setTimeout(() => launch('join', { code: f.join }), 400);
}
