// ===================== hangar.js : the aircraft hangar by each runway =====================
// Every map with a runway gets a big open-fronted hangar beside it. Walk in to the lit terminal and press U for the
// plane shop: upgrades for any plane you fly (armour, engine, guns, bombs, faster reload) and new planes to buy, which
// roll out onto the runway. Upgrades stay with you for the battle and apply to whatever plane you take off in.
const PH = { built: false, list: [], open: false, near: null };
const PLANE_UPGRADES = [
  { id: 'armor', name: 'Armour plating', desc: 'Your plane takes 60% more hits', cost: 1200 },
  { id: 'engine', name: 'Engine tune-up', desc: '15% more top speed', cost: 1500 },
  { id: 'guns', name: 'Heavy guns', desc: 'Your guns hit 35% harder', cost: 1400 },
  { id: 'bombs', name: 'Extra bomb rack', desc: 'Carry one more bomb', cost: 900 },
  { id: 'reload', name: 'Quick reload crew', desc: 'Bombs and missiles come back 40% faster', cost: 1000 },
];
const PLANE_SHOP = [
  { kind: 'prop', name: 'Fighter plane', cost: 1500 }, { kind: 'biplane', name: 'Biplane', cost: 1200 }, { kind: 'triplane', name: 'Red triplane', cost: 1400 },
  { kind: 'f18', name: 'F-18 jet', cost: 4000 }, { kind: 'f22', name: 'F-22 jet', cost: 5500 }, { kind: 'stealth', name: 'Stealth bomber', cost: 9000 },
];
function buildPlaneHangars() {
  PH.built = true;
  if (GERMANY || NORMANDY) for (let i = PLANE_SHOP.length - 1; i >= 0; i--) if (PLANE_SHOP[i].kind !== 'prop') PLANE_SHOP.splice(i, 1);   // WWII: no jets or WW1 planes for sale
  if (DOGFIGHT) return;   // dogfights are fought in the air: no ground base
  for (const t of ['blue', 'red']) {
    const r = RUNWAYS[t]; if (!r) continue;
    if (r.carrier) {   // Normandy's carrier: the shop stands on its flight deck beside the island and rides along with the ship
      const cv = typeof SHIPS2 !== 'undefined' && SHIPS2.find(q => q.team === t && q.kind === 'carrier');
      if (cv) PH.list.push({ team: t, ship: cv, u: 30, v: 13, runway: r });
      continue;
    }
    if (WAKE && t === 'blue') {   // Wake's carrier deck is the runway: a shop booth at its edge, out of the way of take-offs
      const C = CARRIER, x = C.x + 40, z = C.z - C.hw + 2.5;
      const g = buildTerminal(0); g.position.set(x, C.deck, z); scene.add(g);
      PH.list.push({ team: t, x, z, y: C.deck, runway: r });
      continue;
    }
    if (NORMANDY && t === 'red') {   // the German airfield already has big open arched hangars: the shop goes in the middle one
      const x = r.x + 6, z = r.z + (r.wid / 2 + 22) + 6, y = heightAt(x, z);
      const g = buildTerminal(Math.PI); g.position.set(x, y, z); scene.add(g);
      PH.list.push({ team: t, x, z, y, runway: r });
      continue;
    }
    const s = Math.sign(r.z) || 1, x = r.x - r.len * 0.18, z = r.z - s * (r.wid / 2 + 20);
    buildPlaneHangar(x, z, s > 0 ? Math.PI : 0, t, r);   // on the inland side of the strip, its open front facing the runway
  }
}
// the shop terminal: a desk with a glowing screen and a yellow sign
function buildTerminal(rotY) {
  const P = new Part(), G = new Part();
  P.box(2.2, 1.0, 1.0, 0x3a3e42, 0, 0.5, 0); P.box(1.6, 1.0, 0.1, 0x111316, 0, 1.5, 0.4); G.box(1.4, 0.8, 0.02, 0x5ad0ff, 0, 1.5, 0.34);
  P.box(0.1, 3.2, 0.1, 0x3a3e42, -1.5, 1.6, 0.45); P.box(0.1, 3.2, 0.1, 0x3a3e42, 1.5, 1.6, 0.45); G.box(3.2, 0.7, 0.05, 0xffd54f, 0, 3, 0.45);
  const g = new THREE.Group(); g.add(new THREE.Mesh(P.build(), VEH_MAT)); g.add(new THREE.Mesh(G.build(), new THREE.MeshBasicMaterial({ vertexColors: true })));
  g.rotation.y = rotY; g.userData.settleSkip = true; return g;
}
// a big arched hangar: a concrete floor, back and side walls you can't walk through, an arched roof, a parked plane,
// tool benches, crates, a fuel cart, lights, and the lit shop terminal
function buildPlaneHangar(x, z, face, team, runway) {
  const W = 34, D = 26, H = 12;
  // level the ground under it to the average height, blending out at the edges
  let sum = 0, n = 0; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { sum += heightAt(x + i * W / 5, z + j * D / 5); n++; }
  const y = sum / n - 0.5;
  if (typeof terrainEdit === 'function') terrainEdit(x - W / 2 - 8, x + W / 2 + 8, z - W / 2 - 8, z + W / 2 + 8, (px, pz, hh) => lerp(hh, y + 0.5, smooth(W / 2 + 8, W / 2, Math.max(Math.abs(px - x), Math.abs(pz - z)))));
  if (typeof clearAround === 'function') clearAround(new THREE.Vector3(x, y, z), 0, W / 2 + 6);   // trees standing where it goes are cleared
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = face; g.userData.settleSkip = true; scene.add(g);
  const P = new Part(), G = new Part(), wall = 0x7c8466, steel = 0x5a5e62, conc = 0x6e706c;
  P.box(W, 0.6, D, conc, 0, 0.32, 0);                                                     // floor, flush with the levelled ground
  for (let i = 0; i < 12; i++) { const a = Math.PI * i / 12, b = Math.PI * (i + 1) / 12, R = W / 2;   // arched roof panels
    const ax = Math.cos(a) * R, ay = Math.sin(a) * H, bx = Math.cos(b) * R, by = Math.sin(b) * H, mx = (ax + bx) / 2, my = (ay + by) / 2, len = Math.hypot(bx - ax, by - ay);
    P.box(len + 0.2, 0.3, D, i % 2 ? wall : 0x727a5e, mx, my + 0.6, 0, 0, 0, Math.atan2(by - ay, bx - ax)); }
  for (let i = -2; i <= 2; i++) P.box(0.4, 0.4, D, steel, i * 6, H - Math.abs(i) * 1.2 + 0.5, 0);   // roof beams
  P.box(W, H, 0.4, wall, 0, H / 2 + 0.6, D / 2);                                          // back wall (the arch's end)
  P.box(6, 1.4, 0.2, 0x2a6a3a, 0, H - 1.5, -D / 2 + 0.3);                                  // sign over the door
  // inside: benches with tools, crates, a fuel cart, oil drums, a ladder, ceiling lamps
  for (const sx of [-1, 1]) { P.box(6, 1, 1.4, 0x6a5a48, sx * (W / 2 - 4), 1.1, D / 2 - 2); P.box(6, 2.2, 0.15, 0x3a3e42, sx * (W / 2 - 4), 2.4, D / 2 - 0.5); for (let k = 0; k < 5; k++) P.box(0.1, 0.6, 0.05, 0x9a9a9a, sx * (W / 2 - 4) - 2 + k, 2.2, D / 2 - 0.6); }
  for (let k = 0; k < 4; k++) P.box(1.4, 1.4, 1.4, 0x7a6a4a, -W / 2 + 2 + (k % 2) * 1.5, 1.3 + Math.floor(k / 2) * 1.4, -2 + k * 0.2);
  P.box(2.4, 1.2, 1.4, 0xc8302a, W / 2 - 3, 1.2, -4); P.cyl(0.4, 0.4, 2.2, 0x2a2a2a, W / 2 - 3, 0.6, -4, 0, 0, Math.PI / 2, 1, 10);   // fuel cart
  for (let k = 0; k < 3; k++) P.cyl(0.45, 0.45, 1.1, 0x2a5a8a, W / 2 - 2, 1.15, 2 + k * 1.1, 0, 0, 0, 1, 10);
  for (let k = -1; k <= 1; k++) G.box(3, 0.1, 0.5, 0xfff2c8, k * 9, H - 1.6, 0);
  // the shop terminal against the right wall: a desk, a glowing screen and a sign
  const tx = -W / 2 + 3, tz = D / 2 - 6;
  P.box(2.2, 1.0, 1.0, 0x3a3e42, tx, 1.1, tz); P.box(1.6, 1.0, 0.1, 0x111316, tx, 2.1, tz + 0.4); G.box(1.4, 0.8, 0.02, 0x5ad0ff, tx, 2.1, tz + 0.34);
  G.box(3.2, 0.7, 0.05, 0xffd54f, tx, 3.6, tz + 0.45);
  const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; m.receiveShadow = true; g.add(m);
  g.add(new THREE.Mesh(G.build(), new THREE.MeshBasicMaterial({ vertexColors: true })));
  // a plane parked inside (just for show)
  if (typeof makePlaneModel === 'function') { const pm = makePlaneModel(team); scene.remove(pm.g); pm.g.position.set(4, 2.2, 1); pm.g.rotation.y = Math.PI; g.add(pm.g); }
  // walls you can't walk through: back and both sides (the front is open)
  const toW = (lx, lz) => { const c = Math.cos(face), sn = Math.sin(face); return { x: x + lx * c + lz * sn, z: z - lx * sn + lz * c }; };
  const along = Math.abs(Math.sin(face)) < 0.5;   // walls along x (faces 0 or PI)
  const bw = toW(0, D / 2); addBlock(bw.x, bw.z, along ? W : 0.6, H, along ? 0.6 : W, LV_HIDDEN(), { y });
  for (const sx of [-1, 1]) { const sw = toW(sx * W / 2, 0); addBlock(sw.x, sw.z, along ? 0.6 : D, 5, along ? D : 0.6, LV_HIDDEN(), { y }); }
  const tw = toW(tx, tz); PH.list.push({ team, x: tw.x, z: tw.z, y: y + 0.6, runway });
}
function LV_HIDDEN() { return new THREE.MeshBasicMaterial({ visible: false }); }
function terminalPos(h) { if (h.ship) { const w = shipWorld(h.ship, h.u, h.v); return { x: w.x, z: w.z, y: h.ship.mainY + WATER_Y }; } return h; }
function buildShipTerminal(h) {
  if (h.mesh) return;
  const g = buildTerminal(Math.PI); g.position.set(h.u, h.ship.mainY + 0.6, h.v); h.ship.g.add(g); h.mesh = g;
}
// ---------- upgrades on the plane you fly ----------
function applyPlaneUpgrades(pl) {
  const U = player.planeUp || {}; if (pl._upg) return;
  pl._upg = { maxHp: pl.maxHp, spdMul: pl.spdMul, maxBombs: pl.maxBombs, bombRegenT: pl.bombRegenT };
  if (U.armor) { pl.maxHp *= 1.6; pl.hp *= 1.6; }
  if (U.engine) pl.spdMul *= 1.15;
  if (U.bombs) { pl.maxBombs = (pl.maxBombs || 0) + 1; pl.bombs = (pl.bombs || 0) + 1; }
  if (U.reload) pl.bombRegenT *= 0.6;
  pl.gunMul = U.guns ? 1.35 : 1;
}
function restorePlaneUpgrades(pl) {
  if (!pl._upg) return; const b = pl._upg; pl._upg = null;
  pl.hp = Math.min(pl.hp, b.maxHp); pl.maxHp = b.maxHp; pl.spdMul = b.spdMul; pl.maxBombs = b.maxBombs; pl.bombs = Math.min(pl.bombs, b.maxBombs); pl.bombRegenT = b.bombRegenT; pl.gunMul = 1;
}
// ---------- every frame ----------
function updatePlaneHangars(dt) {
  if (!PH.built) buildPlaneHangars();
  for (const h of PH.list) if (h.ship) buildShipTerminal(h);
  if (typeof planes !== 'undefined') for (const pl of planes) { if (pl.pilot === player && !pl._upg) applyPlaneUpgrades(pl); else if (pl.pilot !== player && pl._upg) restorePlaneUpgrades(pl); }
  PH.near = null;
  if (player.alive && !player.vehicle && !player.gv) for (const h of PH.list) { if (h.team !== player.team) continue; const p = terminalPos(h); if (Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < 3 && Math.abs(player.pos.y - p.y) < 2.5) PH.near = h; }
  let el = document.getElementById('phPrompt');
  if (!el) { el = document.createElement('div'); el.id = 'phPrompt'; el.className = 'hud'; el.style.cssText = 'position:fixed;left:50%;top:62%;transform:translateX(-50%);background:rgba(0,0,0,.55);color:#fff;padding:6px 14px;border-radius:8px;font:600 14px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;pointer-events:none'; el.textContent = 'Press U for the plane shop: upgrades and new planes'; document.body.appendChild(el); }
  el.style.display = PH.near && !PH.open ? 'block' : 'none';
}
// ---------- the shop ----------
(function () {
  const st = document.createElement('style');
  st.textContent = `#phShop{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(4,8,14,.55);font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#fff}
  #phShop .box{width:min(760px,94vw);max-height:88vh;overflow:auto;background:rgba(14,20,30,.96);border:2px solid rgba(90,208,255,.5);border-radius:16px;padding:18px 22px}
  #phShop h2{margin:0 0 4px;font-size:22px}#phShop .sub{color:#b8c4d0;font-size:13px;margin-bottom:10px}#phShop h3{margin:14px 0 6px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#5ad0ff}
  #phShop .it{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border-radius:10px;background:#1a2436;margin-bottom:6px}
  #phShop .it b{font-size:15px}#phShop .it span{color:#b8c4d0;font-size:13px;display:block}
  #phShop button{font:600 14px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#fff;background:#26324a;border:1px solid #3c4c6a;border-radius:9px;padding:8px 14px;cursor:pointer;white-space:nowrap}
  #phShop button:hover{background:#33446a}#phShop button.own{background:#2e7d4a;border-color:#4fbf78;cursor:default}#phShop button.no{opacity:.45;cursor:default}#phShop .close{float:right}#phShop .out{color:#9fe0b0;font-size:13px;min-height:18px;margin-top:6px}`;
  document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'phShop'; document.body.appendChild(el);
  let wasPlaying = false, msg = '';
  function render() {
    const U = player.planeUp || {}, money = player.money;
    el.innerHTML = `<div class="box"><button class="close" data-a="close">Close (U)</button><h2>Plane hangar</h2><div class="sub">You have <b style="color:#9be38a">$${money}</b>. Upgrades work on any plane you fly for the rest of the battle.</div>
      <h3>Upgrades</h3>${PLANE_UPGRADES.map(u => `<div class="it"><div><b>${u.name}</b><span>${u.desc}</span></div>${U[u.id] ? '<button class="own">Owned</button>' : `<button data-up="${u.id}" class="${money < u.cost ? 'no' : ''}">$${u.cost}</button>`}</div>`).join('')}
      <h3>Buy a plane</h3><div class="sub" style="margin:0 0 6px">It rolls out onto the runway, ready for you.</div>${PLANE_SHOP.map(p => `<div class="it"><div><b>${p.name}</b></div><button data-buy="${p.kind}" class="${money < p.cost ? 'no' : ''}">$${p.cost}</button></div>`).join('')}
      <div class="out">${msg}</div></div>`;
    el.querySelectorAll('[data-a=close]').forEach(b => b.onclick = close);
    el.querySelectorAll('[data-up]').forEach(b => b.onclick = () => buyUpgrade(b.dataset.up));
    el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buyPlane(b.dataset.buy));
  }
  function buyUpgrade(id) {
    const u = PLANE_UPGRADES.find(q => q.id === id); player.planeUp = player.planeUp || {};
    if (player.planeUp[id] || player.money < u.cost) return;
    player.money -= u.cost; player.planeUp[id] = true; msg = u.name + ' fitted!'; render();
  }
  function buyPlane(kind) {
    const p = PLANE_SHOP.find(q => q.kind === kind), h = PH.near; if (!h || player.money < p.cost) return;
    if (net.active && !net.isHost) { msg = 'Online, only the host can roll out new planes'; render(); return; }
    const r = h.runway, s = Math.sign(r.z) || 1, key = Object.keys(PLANE_SPAWN).find(k => PLANE_SPAWN[k] === kind);
    let x, z, yaw;
    x = r.x - r.len * 0.18 + rand(-10, 10); z = r.z; yaw = r.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    const pl = typeof hostSpawn === 'function' ? hostSpawn(key, player.team, x, z, yaw) : null;
    if (!pl) { msg = 'There is no room for another plane right now'; render(); return; }
    player.money -= p.cost;
    if (r.carrier) {   // off the carrier: it is launched with you in the cockpit
      pl.parked = false; resetPlane(pl, 0); close(); boardPlane(pl); showMessage(p.name + ' launched. You are flying it!', 3); return;
    }
    msg = p.name + ' is on the runway. Walk to it and press E'; render();
  }
  function open() {
    if (PH.open || !PH.near) return;
    PH.open = true; wasPlaying = playing; playing = false; uiOpen = uiOpen || 'hangar'; msg = '';
    mouse.left = mouse.right = false; for (const k in keys) keys[k] = false;
    try { document.exitPointerLock(); } catch (e) { }
    render(); el.style.display = 'flex';
  }
  function close() {
    if (!PH.open) return;
    PH.open = false; el.style.display = 'none'; if (uiOpen === 'hangar') uiOpen = null;
    if (wasPlaying && player.alive && !gameOver) { playing = true; if (!IS_TOUCH && typeof lockPointer === 'function') lockPointer(); }
  }
  addEventListener('keydown', e => {
    if (e.code !== 'KeyU' || e.repeat || typeof started === 'undefined' || !started) return;
    if (document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    PH.open ? close() : open();
  });
})();
