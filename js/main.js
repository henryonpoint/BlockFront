// ===================== main.js : game flow and loop =====================
const teamKills = { blue: 0, red: 0, green: 0, yellow: 0 };
let gameOver = false, winner = null;
const recruits = { blue: 0, red: 0, green: 0, yellow: 0 };

// build the same world on every computer
seeded(777, () => {
  buildWorld();
  buildTurrets();
  buildPlanes();
  buildGroundVehicles();
  for (const team of TEAMS) for (let i = 0; i < TEAM_POOL; i++) {
    const role = i % 7 === 3 ? 'sniper' : i % 7 === 5 ? 'rocket' : 'rifle';
    const c = new Char(team, false, role);
    c.npcIdx = npcs.length; c.inactive = true; npcs.push(c);
  }
});
function balanceTeams(initial) {
  if (net.active && !net.isHost) return;
  for (const t of TEAMS) {
    let humans = player.team === t ? 1 : 0;
    for (const r of net.remotes.values()) if (r.char.team === t) humans++;
    const want = clamp(BATTLE.soldiers - humans + (recruits[t] || 0), 2, TEAM_POOL);
    npcs.filter(n => n.team === t).forEach((n, i) => {
      if (i < want && n.inactive) { n.inactive = false; n.alive = false; n.respawnT = initial ? 0 : 1; }
      if (i >= want && !n.inactive) { n.inactive = true; n.alive = false; n.model.root.visible = false; if (n.turret) { n.turret.user = null; n.turret = null; } }
    });
  }
}
function recruitNPC(team) { recruits[team] = Math.min((recruits[team] || 0) + 1, 6); balanceTeams(); }
spawnChar(player);
player.pos.set(BASES.blue.x + 3, heightAt(BASES.blue.x + 3, BASES.blue.z - 8), BASES.blue.z - 8);

function applyTeamLook() {
  if (player.body3p) scene.remove(player.body3p.root);
  player.body3p = makeCharacter(player.team, 'rifle'); player.body3p.root.visible = false; scene.add(player.body3p.root);
  VM.sleeve.color.setHex(TEAM_LOOK[player.team].uni); VM.band.color.setHex(TEAM_LOOK[player.team].accent);
  parachuteMesh.children[0].material.color.setHex(TEAM_COLOR[player.team]);
  $('youTeam').textContent = teamName(player.team);
}
function startGame() {
  if (!net.active || net.isHost) applyBattle(BATTLE); else applyPointCount(BATTLE.points);
  balanceTeams(true); STATS.t0 = simTime;
  const B = BASES[player.team], s = -teamSide(player.team);
  player.pos.set(B.x + 3, heightAt(B.x + 3, B.z + s * 8), B.z + s * 8);
  player.yaw = teamSide(player.team) > 0 ? 0 : Math.PI;
  showMessage(`${WORLD.mode === 'tdm' ? 'First team to ' + tdmTarget() + ' takedowns wins!' : WORLD.mode === 'koth' ? 'Hold point C to win!' : 'Capture all ' + points.length + ' points to win!'} Go ${player.team === 'blue' ? 'Blue' : 'Red'} team!`, 4);
}
let teamPref = 'auto';
document.querySelectorAll('#teamPick .chip.four').forEach(c => { c.style.display = FOUR ? '' : 'none'; });
document.querySelectorAll('#teamPick .chip').forEach(ch => ch.addEventListener('click', () => {
  teamPref = ch.dataset.t; document.querySelectorAll('#teamPick .chip').forEach(o => o.classList.toggle('on', o === ch));
}));
try { const saved = localStorage.getItem('bf_name'); if (saved) $('nameIn').value = saved; } catch (e) { }
$('nameIn').addEventListener('keydown', e => e.stopPropagation());
// kind: 'solo', 'host' or 'join'. opts: { code, pub, name } for online games
async function launch(kind, opts = {}) {
  if (kind === true) kind = 'join';
  if (kind === false || !kind) kind = 'solo';
  initAudio();
  const nm = $('nameIn').value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16) || 'Soldier';
  player.name = nm; try { localStorage.setItem('bf_name', nm); } catch (e) { }
  if (kind !== 'solo') {
    $('connecting').style.display = 'flex';
    document.querySelector('#connecting h1').textContent = kind === 'host' ? 'Starting your game...' : 'Joining game ' + opts.code + '...';
    const ok = await netConnect(opts.code, kind === 'host');
    $('connecting').style.display = 'none';
    if (!ok) {
      net.active = false;
      if (kind === 'join') { if (typeof joinFailed === 'function') joinFailed(net.status || 'Could not join that game'); return; }
      showMessage('Could not start an online game here, so this is a solo battle', 6);
    } else if (kind === 'host') {
      net.pub = !!opts.pub; net.gameName = opts.name || (nm + "'s battle");
      if (net.pub) openLobby().then(() => { listT = 0; });
    } else {
      // the game uses a different map or mode: reload into it, then join automatically
      const cf = net.hostCf;
      if (cf && (cf[0] !== WORLD.map || cf[1] !== WORLD.mode)) {
        try { sessionStorage.setItem('bf_force', JSON.stringify({ map: cf[0], mode: cf[1], join: opts.code, name: nm, team: teamPref })); } catch (e) { }
        try { net.closeGame && net.closeGame(); } catch (e) { }
        document.querySelector('#connecting h1').textContent = 'Loading the ' + (MAPS[cf[0]] || 'game') + ' map...';
        $('connecting').style.display = 'flex'; location.reload(); return;
      }
      if (LOBBY.close) { try { LOBBY.close(); } catch (e) { } LOBBY.list = null; }
    }
  }
  if (typeof closeLobbyPanels === 'function') closeLobbyPanels();
  $('start').style.display = 'none'; document.body.classList.add('started'); endMenuCinema();
  player.team = net.active ? pickTeam(teamPref) : (TEAMS.includes(teamPref) ? teamPref : 'blue');
  applyTeamLook();
  if (net.active) electHost();
  started = true; startGame();
  // build every shader now, while the screen is changing, instead of in the middle of a fight
  try { renderer.compile(scene, camera); } catch (e) { }
  player.alive = false; player.respawnT = 0;
  showDeployScreen(true);
}
$('playSolo').addEventListener('click', e => { e.stopPropagation(); launch('solo'); });

// ---------- control points ----------
function updatePointsLogic(dt) {
  if (WORLD.mode === 'tdm') {          // team battle: only takedowns count
    for (const t of TEAMS) if (!gameOver && teamKills[t] >= tdmTarget()) endGame(t);
    return;
  }
  for (const p of points) {
    const cnt = countOnPoint(p, true), before = p.owner;
    if (FOUR) capFour(p, cnt, dt);
    else {
      const b = cnt.blue, r = cnt.red, diff = b - r;
      if (diff !== 0) p.progress = clamp(p.progress + 0.075 * Math.min(Math.abs(diff), 4) * Math.sign(diff) * dt, -1, 1);
      else if (b === 0 && r === 0 && !p.owner) p.progress *= Math.exp(-dt * 0.1);
      if (p.owner === 'blue' && p.progress <= 0) p.owner = null;
      if (p.owner === 'red' && p.progress >= 0) p.owner = null;
      if (!p.owner && p.progress >= 1) p.owner = 'blue';
      if (!p.owner && p.progress <= -1) p.owner = 'red';
    }
    if (p.owner !== before) onOwnerChange(p, before);
  }
  if (WORLD.mode === 'koth') {        // king of the hill: time holding the point
    const p = points[0];
    if (p && p.owner && !p.contested) holdScore[p.owner] += dt;
    for (const t of TEAMS) if (!gameOver && holdScore[t] >= KOTH_TIME) endGame(t);
    return;
  }
  if (!gameOver) for (const t of TEAMS) if (points.every(p => p.owner === t)) endGame(t);
}
// counts soldiers of each team on a point and marks it contested when more than one team is there
function countOnPoint(p, checkY) {
  const cnt = {}; for (const t of TEAMS) cnt[t] = 0;
  for (const c of chars) {
    if (!c.alive || c.vehicle || c.inactive) continue;
    if (Math.hypot(c.pos.x - p.x, c.pos.z - p.z) < p.r && (!checkY || Math.abs(c.pos.y - p.y) < 6)) cnt[c.team] = (cnt[c.team] || 0) + 1;
  }
  p.cnt = cnt; p.blueIn = cnt.blue; p.redIn = cnt.red;
  let teams = 0; for (const t of TEAMS) if (cnt[t] > 0) teams++;
  p.contested = teams > 1;
  return cnt;
}
// 4 teams: the only team on a point first empties another team's bar, then fills its own
function capFour(p, cnt, dt) {
  if (p.progress < 0) p.progress = -p.progress;
  let here = null, n = 0;
  for (const t of TEAMS) if (cnt[t] > 0) { n++; here = t; }
  if (n === 0) { if (!p.owner) { p.progress *= Math.exp(-dt * 0.1); if (p.progress < 0.01) { p.progress = 0; p.capTeam = null; } } return; }
  if (n > 1) return;                                   // contested: nothing moves
  const step = 0.075 * Math.min(cnt[here], 4) * dt;
  if (!p.capTeam || p.capTeam === here) {
    p.capTeam = here; p.progress = Math.min(1, p.progress + step);
    if (p.progress >= 1 && p.owner !== here) p.owner = here;
  } else {
    p.progress -= step;
    if (p.progress <= 0) { p.progress = 0; p.capTeam = here; if (p.owner && p.owner !== here) p.owner = null; }
  }
}
function onOwnerChange(p, before) {
  if (p.owner) {
    showMessage(`${teamName(p.owner)} team captured point ${p.name}!`, 3);
    if (p.owner === player.team) {
      SFX.capture();
      if (player.alive && Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < p.r) { addMoney(250, `Captured ${p.name}`); STATS.caps++; }
      else addMoney(50, 'Team capture');
    } else SFX.lose();
  } else showMessage(`Point ${p.name} is now neutral`, 2);
}
function updatePointsVisual() {
  if (net.active && !net.isHost) for (const p of points) countOnPoint(p, false);
  for (const p of points) {
    const pt = progTeam(p), col = Math.abs(p.progress) < 0.02 || !pt ? 0xffffff : TEAM_COLOR[pt];
    p.flagMat.color.setHex(col);
    p.flag.position.y = p.y + 2 + Math.abs(p.progress) * 7.2;
    p.flag.rotation.y = Math.sin(performance.now() * 0.002 + p.x) * 0.25;
    p.ringMat.color.setHex(p.owner ? TEAM_COLOR[p.owner] : 0xffffff);
    const cssCol = p.owner ? TEAM_CSS[p.owner] : '#ffffff';
    if (p.shownColor !== cssCol) { p.shownColor = cssCol; const k = p.name + cssCol; p.spriteMat.map = _letterCache[k] || (_letterCache[k] = letterTex(p.name, cssCol)); p.spriteMat.needsUpdate = true; }
  }
}
const _letterCache = {};
function endGame(team) {
  if (gameOver) return;
  gameOver = true; winner = team;
  const won = team === player.team;
  $('endTitle').textContent = won ? 'VICTORY!' : 'DEFEAT';
  $('endTitle').style.color = TEAM_CSS[team];
  $('endText').textContent = `${teamName(team)} team ${WORLD.mode === 'tdm' ? 'reached ' + tdmTarget() + ' takedowns' : WORLD.mode === 'koth' ? 'held the hill the longest' : 'holds every control point'}. You took out ${player.kills} ${player.kills === 1 ? 'enemy' : 'enemies'} and finished with $${player.money}.`;
  showEndStats();
  setTimeout(() => {
    $('end').style.display = 'flex'; playing = false; uiOpen = 'end';
    try { document.exitPointerLock(); } catch (e) { }
  }, 2500);
  (won ? SFX.capture : SFX.lose)();
}
$('again').addEventListener('click', () => location.reload());

// ---------- loop ----------
let last = performance.now(), simTime = 0;
const now0 = () => performance.now() / 1000;
let balanceT = 2;
function step(dt) {
  simTime += dt;
  soundBudget = 8;
  netUpdate(dt);
  updatePlayer(dt);
  const host = !net.active || net.isHost;
  for (const c of chars) { if (c.isPlayer || c.isRemote) continue; if (host) updateNPC(c, dt); else updateNPCProxy(c, dt); }
  updateGroundVehicles(dt);
  updateOccupants();
  updatePlanes(dt);
  suppressFx = true; updateProjectiles(dt); suppressFx = false;
  updateBuilds(dt);
  updateBullets(dt);
  if (typeof updateClown === 'function') updateClown(dt);
  if (typeof updateCraters === 'function') updateCraters(dt);
  if (typeof updateTopView === 'function') updateTopView(dt);
  if (typeof updateAnimals === 'function') updateAnimals(dt);
  if (typeof updateLoot === 'function') updateLoot(dt);
  if (typeof updateStickies === 'function') updateStickies(dt);
  if (typeof updateNukes === 'function') updateNukes(dt);
  if (typeof updateCity === 'function') updateCity(dt);
  if (HOUSTON && typeof updateHouston === 'function') updateHouston(dt);
  if (WAKE && typeof updateWake === 'function') updateWake(dt);
  balanceT -= dt; if (balanceT <= 0) { balanceT = 2; balanceTeams(); }
  const ce = console.error, cw = console.warn; console.error = console.warn = () => { };
  // one physics update per frame, never more: catching up with extra updates on a slow frame made the next frame slower still, until the game locked up
  try { world.step(Math.min(dt, 1 / 30)); } finally { console.error = ce; console.warn = cw; }
  for (const p of props) if (!p.exploded) { p.mesh.position.copy(p.body.position); p.mesh.quaternion.copy(p.body.quaternion); if (p.body.position.y < -30) { p.exploded = true; scene.remove(p.mesh); world.removeBody(p.body); } }
  updateRagdolls(dt);
  if (host) updatePointsLogic(dt);
  updatePointsVisual();
  for (const t of turrets) if (!t.user) { t.yawG.rotation.y = t.yaw; t.pitchG.rotation.x = t.pitch * 0.9; }
}
function render(dt) {
  updateEffects(dt);
  if (typeof updateExtras === 'function') updateExtras(dt);
  if (SNOW || DESERT) updateSnowfall(dt);
  updateFx(dt);
  if (typeof updateSound === "function") updateSound(dt);
  flashLight.intensity *= Math.exp(-dt * 18);
  for (const c of clouds) { c.position.x += dt * 3; if (c.position.x > 1300) c.position.x = -1300; }
  for (const w of windmills) w.rotation.z += dt * 0.8;
  updateBirds(dt, simTime + now0());
  if (waterMesh) waterMesh.position.y = WATER_Y + Math.sin(simTime * 0.8) * 0.05;
  for (const f of baseFlags) f.rotation.y = Math.sin(simTime * 2 + f.position.x) * 0.2;
  updateBunkerLight();
  updatePlaneAim();
  if (typeof updatePolish === 'function') updatePolish(dt);
  sky.position.copy(camera.position);
  sunLight.position.copy(camera.position).addScaledVector(SUN_DIR, 200);
  sunLight.target.position.copy(camera.position);
  vmCam.aspect = camera.aspect;
  updateHUD(dt);
  if (typeof TOPVIEW !== 'undefined' && TOPVIEW.on) { renderTopView(); return; }
  renderer.clear();
  renderer.render(scene, camera);
  if (started && player.alive && !player.vehicle && !player.turret && !player.gv) { renderer.clearDepth(); renderer.render(vmScene, vmCam); }
}
// ---------- title screen: a slow cinematic tour of the battlefield ----------
let menuShots = null, menuHeli = null;
function buildMenuShots() {
  const B = BASES.blue, R = BASES.red, g = (x, z) => heightAt(x, z);
  const jeeps = gvehicles.filter(v => v.type === 'jeep' && v.team === 'blue' && v.spawn.y === undefined);
  const boat = gvehicles.find(v => v.type === 'boat'), tank = gvehicles.find(v => v.type === 'tank' && v.team === 'red');
  const j = jeeps[3] || jeeps[0];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const shots = [];
  if (j) shots.push({ a: V(j.pos.x - 14, j.pos.y + 2.2, j.pos.z - 9), b: V(j.pos.x + 14, j.pos.y + 3.2, j.pos.z - 9), la: V(j.pos.x - 4, j.pos.y + 1.4, j.pos.z), lb: V(j.pos.x + 4, j.pos.y + 1.4, j.pos.z) });
  shots.push({ heli: true });
  if (boat) shots.push({ a: V(boat.pos.x + 30, 8, boat.pos.z + 26), b: V(boat.pos.x + 8, 4, boat.pos.z + 16), la: boat.pos.clone(), lb: boat.pos.clone() });
  shots.push({ a: V(46, g(46, 30) + 4, 30), b: V(20, g(20, 26) + 24, 26), la: V(0, 3, 0), lb: V(0, 6, 0) });
  if (tank) shots.push({ a: V(tank.pos.x + 12, tank.pos.y + 1.6, tank.pos.z + 10), b: V(tank.pos.x + 6, tank.pos.y + 4, tank.pos.z + 14), la: V(tank.pos.x, tank.pos.y + 1.6, tank.pos.z), lb: V(tank.pos.x, tank.pos.y + 1.8, tank.pos.z) });
  return shots;
}
function menuCinema(now, dt) {
  if (!menuShots) {
    menuShots = buildMenuShots(); menuHeli = gvehicles.find(v => v.type === 'heli' && v.team === 'blue');
    const f = document.createElement('div'); f.id = 'menuFade'; document.body.appendChild(f);
  }
  const DUR = 8500, k = Math.floor(now / DUR) % menuShots.length, t = (now % DUR) / DUR, e = t * t * (3 - 2 * t);
  const fade = document.getElementById('menuFade'); if (fade) fade.style.opacity = t < 0.08 ? 1 - t / 0.08 : t > 0.92 ? (t - 0.92) / 0.08 : 0;
  // a helicopter circles the town the whole time
  if (menuHeli) {
    const a = now * 0.00012, r = 70;
    menuHeli.pos.set(Math.cos(a) * r, heightAt(Math.cos(a) * r, Math.sin(a) * r) + 28 + Math.sin(a * 3) * 3, Math.sin(a) * r);
    menuHeli.yaw = -a + Math.PI; menuHeli.pitch = -0.18; menuHeli.roll = 0.22;
    placeVehicleModel(menuHeli); menuHeli.model.rotor.rotation.y += dt * 26; menuHeli.model.tail.rotation.x += dt * 40;
  }
  const s = menuShots[k];
  if (s.heli && menuHeli) {
    const h = menuHeli.pos, a = now * 0.00012 - 0.35;
    camera.position.set(Math.cos(a) * 84, h.y + 4 - e * 3, Math.sin(a) * 84);
    camera.lookAt(h.x, h.y, h.z);
  } else if (s.a) {
    camera.position.lerpVectors(s.a, s.b, e);
    const la = s.la.clone().lerp(s.lb, e); camera.lookAt(la);
  }
  if (camera.fov !== 55) { camera.fov = 55; camera.updateProjectionMatrix(); }
}
function endMenuCinema() {
  const f = document.getElementById('menuFade'); if (f) f.remove();
  if (menuHeli) resetVehicle(menuHeli);
  if (camera.fov !== (SET.fov || 75)) { camera.fov = SET.fov || 75; camera.updateProjectionMatrix(); }
}
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (started && (playing || net.active || uiOpen === 'death' || uiOpen === 'topview')) step(dt);
  else if (!started) {
    menuCinema(now, dt);
  }
  render(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
addEventListener('resize', () => {
  camera.aspect = vmCam.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// gun sight and bomb landing marker while flying
const _aimV = new THREE.Vector3();
function updatePlaneAim() {
  const pa = $('planeAim'), ba = $('bombAim');
  const pl = player.vehicle;
  if (!pl || !pl.alive) { pa.style.display = 'none'; ba.style.display = 'none'; return; }
  _aimV.copy(pl.pos).addScaledVector(planeFwd(pl), 140);
  camera.updateMatrixWorld(); _aimV.project(camera);
  if (_aimV.z < 1) { pa.style.display = 'block'; pa.style.left = ((_aimV.x + 1) / 2 * innerWidth) + 'px'; pa.style.top = ((1 - _aimV.y) / 2 * innerHeight) + 'px'; } else pa.style.display = 'none';
  // where a bomb dropped now would land
  if (pl.bombs > 0 && !pl.onGround) {
    const v = planeFwd(pl).multiplyScalar(pl.speed * 0.9), p = pl.pos.clone().add(new THREE.Vector3(0, -1.6, 0));
    for (let i = 0; i < 80; i++) { v.y -= 20 * 0.1; p.addScaledVector(v, 0.1); if (p.y < heightAt(p.x, p.z)) break; }
    _aimV.copy(p).project(camera);
    if (_aimV.z < 1) { ba.style.display = 'block'; ba.style.left = ((_aimV.x + 1) / 2 * innerWidth) + 'px'; ba.style.top = ((1 - _aimV.y) / 2 * innerHeight) + 'px'; } else ba.style.display = 'none';
  } else ba.style.display = 'none';
}
