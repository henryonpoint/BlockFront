// ===================== wake.js : the Wake Island map =====================
// A Pacific atoll shaped like a U around a blue lagoon. Red dug in on the island: an airstrip, Quonset huts,
// concrete pillboxes and anti-aircraft guns behind the beaches. Blue attacks from the sea: an aircraft carrier
// with planes and helicopters on deck, a ramp down its stern to a dock full of landing boats, and warships
// standing offshore. Swim, sail or fly to the island and take it.
const WAKE_SMOKE = [];

function wkMat(c) { return new THREE.MeshLambertMaterial({ color: c }); }
function wkText(text, w, h, bg, fg) {
  const t = canvasTex(512, Math.round(512 * h / w), (g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${H * 0.62}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`; g.fillText(text, W / 2, H / 2 + 2); });
  t.magFilter = THREE.LinearFilter; return new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide });
}

// ---------- the aircraft carrier ----------
function wkCarrier() {
  const C = CARRIER, D = C.deck, grey = wkMat(0x5f666e), dark = wkMat(0x3f454c);
  // hull: just wider than the deck and topping out right under it, so the steel sides hide the ground's edge
  const hull = new THREE.Mesh(new THREE.BoxGeometry(C.hl * 2 + 2, D + 7, C.hw * 2 + 3), grey); hull.position.set(C.x, (D - 7) / 2 - 0.12, C.z); hull.castShadow = true; hull.receiveShadow = true; scene.add(hull);
  // the bow: a pointed wedge under an overhanging flight deck
  const bs = new THREE.Shape(); bs.moveTo(0, -C.hw - 1.5); bs.lineTo(-26, 0); bs.lineTo(0, C.hw + 1.5); bs.lineTo(0, -C.hw - 1.5);
  const bg = new THREE.ExtrudeGeometry(bs, { depth: D + 6.6, bevelEnabled: false }); bg.rotateX(Math.PI / 2);
  const bow = new THREE.Mesh(bg, grey); bow.position.set(C.x - C.hl - 1, D - 0.15, C.z); bow.castShadow = true; scene.add(bow);
  const fdeck = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, C.hw * 2), wkMat(0x5d6369)); fdeck.position.set(C.x - C.hl - 8, D - 0.3, C.z); scene.add(fdeck);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(C.hl * 2 + 2.2, 0.9, C.hw * 2 + 3.2), wkMat(0x2a2e33)); stripe.position.set(C.x, -0.2, C.z); scene.add(stripe);   // waterline
  const num = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wkText('12', 10, 5, '#5f666e', '#f2f2f2')); num.position.set(C.x - C.hl + 14, D - 3, C.z + C.hw + 1.55); scene.add(num);
  // deck markings
  const line = (x, z, w, d, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: col })); m.rotation.x = -Math.PI / 2; m.position.set(x, D + 0.04, z); scene.add(m); };
  for (let x = -C.hl + 6; x < C.hl - 6; x += 12) line(C.x + x, C.z + 0, 6, 0.4, 0xf2f2f2);
  line(C.x, C.z - C.hw + 0.8, C.hl * 2 - 6, 0.3, 0xe8c840); line(C.x, C.z + C.hw - 0.8, C.hl * 2 - 6, 0.3, 0xe8c840);
  const big = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), wkText('12', 12, 6, '#5d6369', '#f2f2f2')); big.rotation.x = -Math.PI / 2; big.rotation.z = -Math.PI / 2; big.position.set(C.x + C.hl - 14, D + 0.05, C.z); scene.add(big);
  // the island: bridge, funnel, mast and radar on the north side of the deck
  const ix = C.x + 30, iz = C.z - C.hw + 3.4;
  addBlock(ix, iz, 22, 7, 5.5, grey, { y: D });
  addBlock(ix - 2, iz, 14, 5, 5, grey, { y: D + 7 });
  addMesh(new THREE.BoxGeometry(10, 2.2, 5.6), dark, ix - 4, D + 13.2, iz);                     // bridge windows
  addMesh(new THREE.BoxGeometry(8, 9, 4.6), grey, ix + 6, D + 16, iz).rotation.z = -0.12;       // funnel
  addMesh(new THREE.BoxGeometry(8.2, 1.2, 4.8), wkMat(0x2a2e33), ix + 6.6, D + 20.6, iz);
  addMesh(new THREE.CylinderGeometry(0.25, 0.35, 16, 6), grey, ix - 6, D + 20, iz);
  const radar = addMesh(new THREE.BoxGeometry(5, 1.6, 0.3), dark, ix - 6, D + 27, iz); radar.userData.static = false; WAKE_SMOKE.push({ radar });   // it turns, so it must stay its own object
  const isl = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.2), wkText('CV-12', 5, 2.2, '#5f666e', '#f2f2f2')); isl.position.set(ix - 6, D + 9.5, iz + 2.8); scene.add(isl);
  WAKE_SMOKE.push({ x: ix + 6.8, y: D + 21, z: iz, t: 0, dark: true });
  // flag
  addMesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 6), MATS.steel, ix + 12, D + 10, iz);
  const fl = addMesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshLambertMaterial({ color: TEAM_COLOR.blue, side: THREE.DoubleSide }), ix + 13.3, D + 12.3, iz); fl.userData.static = false; baseFlags.push(fl);
  // anti-aircraft guns on the deck corners, and gun tubs along the sides
  for (const [dx, dz] of [[-C.hl + 6, -C.hw + 3], [-C.hl + 6, C.hw - 3], [C.hl - 30, C.hw - 3]]) makeTurret(C.x + dx, C.z + dz, 'mg', dx < 0 ? Math.PI / 2 : -Math.PI / 2);
  makeTurret(C.x - 55, C.z + C.hw - 3, 'launcher', 0);
  for (let i = 0; i < 6; i++) { const x = C.x - 80 + i * 32; addMesh(new THREE.CylinderGeometry(1.6, 1.6, 1.2, 10), grey, x, D - 1.5, C.z + C.hw + 2.6); addMesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 6), dark, x, D - 0.6, C.z + C.hw + 3.6).rotation.x = 1.1; }
  // a WWII wooden flight deck, anti-aircraft gun galleries along both sides, a dark camouflage band, radar on the mast
  { const t = canvasTex(256, 64, (g2, W, H) => { g2.fillStyle = '#8a7556'; g2.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 4) { g2.fillStyle = `rgba(60,44,28,${0.25 + Math.random() * 0.2})`; g2.fillRect(0, y, W, 1); } for (let i = 0; i < 40; i++) { g2.fillStyle = 'rgba(60,44,28,0.3)'; g2.fillRect(Math.random() * W, Math.floor(Math.random() * 16) * 4, 1, 4); } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(C.hl / 8, C.hw / 3);
    const wd = new THREE.Mesh(new THREE.PlaneGeometry(C.hl * 2, C.hw * 2), new THREE.MeshLambertMaterial({ map: t })); wd.rotation.x = -Math.PI / 2; wd.position.set(C.x, D + 0.02, C.z); wd.receiveShadow = true; scene.add(wd); }
  { const P = new Part();
    for (let x = -C.hl + 12; x < C.hl - 12; x += 18) for (const sd of [-1, 1]) {
      const z = C.z + sd * (C.hw + 3.2); P.box(6, 0.4, 3.6, 0x5f666e, C.x + x, D - 1.4, z); P.cyl(1.3, 1.4, 0.9, 0x5f666e, C.x + x, D - 0.75, z, 0, 0, 0, 1, 10);
      for (const o of [-0.4, -0.13, 0.13, 0.4]) P.cyl(0.07, 0.07, 2.0, 0x3f454c, C.x + x + o, D - 0.2, z + sd * 0.9, Math.PI / 2 - 0.5 * sd, 0, 0, 1, 6);
    }
    for (const sd of [-1, 1]) P.box(C.hl * 2, 3.0, 0.08, 0x3e4752, C.x, 1.4, C.z + sd * (C.hw + 1.56));   // camouflage band
    P.add(new THREE.SphereGeometry(1.6, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.35), 0x4a5058, ix - 6, D + 29, iz, -1.2, 0, 0);
    for (const dz of [-1.6, 1.6]) P.cyl(0.2, 0.3, 12, 0x3f454c, ix - 6.5, D + 21, iz + dz * 0.4, dz * 0.03, 0, 0, 1, 6);
    const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; scene.add(m); }
  // crates and a few parked planes' worth of gear at the stern
  for (let i = 0; i < 3; i++) addCrateStack(C.x + 60 + i * 3, C.z + C.hw - 4, 2);
  // the stern ramp walls and the wooden dock posts
  const rx0 = C.x + C.hl, rz = C.z + 9;
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(47, 1, 0.3), grey); w.position.set(rx0 + 23, D / 2 + 1, rz + s * 4.6); w.rotation.z = -Math.atan2(D - 0.5, 46); scene.add(w); }
  for (let x = rx0 + 46; x <= rx0 + 70; x += 4) for (const s of [-1, 1]) addMesh(new THREE.CylinderGeometry(0.25, 0.25, 4, 6), wkMat(0x5a4028), x, -1, C.z + 8 + s * 13);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.8), wkText('BOATS', 9, 1.8, '#20507a', '#ffffff')); sign.position.set(rx0 + 58, 3.2, C.z - 5.2); scene.add(sign);
  addMesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), MATS.steel, rx0 + 58, 1.6, C.z - 5.3);
}

// ---------- warships ----------
function wkWarship(x, z, len, big) {
  const g = new THREE.Group(), grey = wkMat(big ? 0x6a7078 : 0x707880), dark = wkMat(0x41474e);
  const hw = big ? 7 : 4.5, H = big ? 9 : 6;
  const hull = new THREE.Mesh(new THREE.BoxGeometry(len, H, hw * 2), grey); hull.position.y = H / 2 - 4; g.add(hull);
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(0.1, hw, len * 0.22, 3), grey); bow.rotation.z = Math.PI / 2; bow.rotation.x = Math.PI / 6; bow.scale.set(1, 1, 0.6); bow.position.set(-len / 2 - len * 0.1, H / 2 - 4, 0); g.add(bow);
  const sup = new THREE.Mesh(new THREE.BoxGeometry(len * 0.22, H * 0.8, hw * 1.2), grey); sup.position.set(-len * 0.05, H - 4 + H * 0.4, 0); g.add(sup);
  const brg = new THREE.Mesh(new THREE.BoxGeometry(len * 0.12, H * 0.5, hw), dark); brg.position.set(-len * 0.1, H - 4 + H * 0.95, 0); g.add(brg);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, H * 1.6, 6), dark); mast.position.set(-len * 0.05, H - 4 + H * 1.6, 0); g.add(mast);
  for (const fx of big ? [len * 0.08, len * 0.18] : [len * 0.12]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(hw * 0.35, hw * 0.4, H * 0.9, 10), grey); f.position.set(fx, H - 4 + H * 0.45, 0); g.add(f); WAKE_SMOKE.push({ x: x + fx, y: H - 4 + H * 0.9 + 1, z, t: rand(0, 1), dark: true }); }
  const turret = (tx, n) => { const t = new THREE.Group(); const base = new THREE.Mesh(new THREE.CylinderGeometry(hw * 0.5, hw * 0.55, 1.6, 12), grey); t.add(base); for (let i = 0; i < n; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, hw * 1.4, 8), dark); b.rotation.z = Math.PI / 2; b.position.set(-hw * 0.8, 0.3, (i - (n - 1) / 2) * 0.7); t.add(b); } t.position.set(tx, H - 4 + 0.8, 0); t.rotation.y = rand(-0.4, 0.4) + (tx > 0 ? Math.PI : 0); g.add(t); };
  turret(-len * 0.32, big ? 3 : 2); turret(-len * 0.2, big ? 3 : 1); turret(len * 0.32, big ? 3 : 2);
  g.position.set(x, 0, z); g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(g);
  SHIPS.push({ x, z, hl: len / 2 + len * 0.12, hw: hw + 1 });
  // the deck is solid, so you can climb aboard from a boat and stand on it
  addBlock(x, z, len, H, hw * 2, new THREE.MeshBasicMaterial({ visible: false }), { y: -4 }).userData.static = false;
}

// ---------- the island ----------
function wkQuonset(x, z, alongX, len = 14) {
  const y = heightAt(x, z), g = new THREE.Group(), r = 3.6;
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16, 1, true, 0, Math.PI), new THREE.MeshLambertMaterial({ color: 0x7c8466, side: THREE.DoubleSide }));
  shell.rotation.z = Math.PI / 2; shell.rotation.y = Math.PI / 2; g.add(shell);
  for (let i = 0; i < 6; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(r + 0.03, 0.05, 4, 16, Math.PI), wkMat(0x5a6048)); rib.position.x = -len / 2 + 0.3 + i * (len - 0.6) / 5; rib.rotation.y = Math.PI / 2; g.add(rib); }
  for (const s of [-1, 1]) { const end = new THREE.Mesh(new THREE.CircleGeometry(r, 16, 0, Math.PI), wkMat(0x6a5a42)); end.position.x = s * len / 2; end.rotation.y = s * Math.PI / 2; g.add(end); }
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), wkMat(0x3a3024)); door.position.set(len / 2 + 0.02, 1.1, 0); door.rotation.y = Math.PI / 2; g.add(door);
  g.position.set(x, y, z); g.rotation.y = alongX ? 0 : Math.PI / 2; g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(g);
  addBlock(x, z, alongX ? len : r * 1.8, r * 0.95, alongX ? r * 1.8 : len, new THREE.MeshBasicMaterial({ visible: false }), { y }).userData.static = false;
}
function wkPillbox(x, z, face) {
  const y = heightAt(x, z), conc = wkMat(0xa49e8c);
  addMesh(new THREE.CylinderGeometry(3.2, 3.6, 2.4, 6), conc, x, y + 1.2, z);
  addMesh(new THREE.CylinderGeometry(3.3, 3.3, 0.5, 6), wkMat(0x8e8876), x, y + 2.6, z);
  const slit = addMesh(new THREE.BoxGeometry(2.6, 0.4, 0.3), wkMat(0x1a1a1a), x - Math.sin(face) * 3.3, y + 1.8, z - Math.cos(face) * 3.3); slit.rotation.y = face;
  addCircle(x, z, 3.4, y + 2.8);
}
function wkAAGun(x, z) {
  const y = heightAt(x, z);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; addMesh(new THREE.BoxGeometry(1.8, 0.9, 0.9), MATS.sandbagShort, x + Math.cos(a) * 3.2, y + 0.45, z + Math.sin(a) * 3.2).rotation.y = -a; }
  addMesh(new THREE.CylinderGeometry(0.7, 0.9, 1.2, 8), wkMat(0x4a4f3a), x, y + 0.9, z);
  for (const s of [-0.3, 0.3]) { const b = addMesh(new THREE.CylinderGeometry(0.1, 0.12, 3.4, 6), wkMat(0x2a2a2a), x + s, y + 2.4, z - 0.9); b.rotation.x = -0.9; }
  addCircle(x, z, 1.2, y + 1.5);
}
function wkHedgehog(x, z) {
  const y = heightAt(x, z), m = wkMat(0x5a4a3a);
  for (let i = 0; i < 3; i++) { const b = addMesh(new THREE.BoxGeometry(0.25, 2.4, 0.25), m, x, y + 0.7, z); b.rotation.set(i === 0 ? 0.9 : i === 1 ? -0.9 : 0, i * 1.1, i === 2 ? 0.9 : 0); }
}
function wkPalms(spots) {
  if (!spots.length) return;
  const trunk = new Part(), crown = new Part();
  for (let i = 0; i < 6; i++) trunk.cyl(0.3 - i * 0.03, 0.34 - i * 0.03, 1.6, i % 2 ? 0x8a6a45 : 0x7a5c3a, Math.sin(i * 0.4) * 0.5, 0.8 + i * 1.55, 0);
  const FR = [[0.25, 9.6, 0.3], [1.3, 9.95, 0.62], [2.4, 9.85, 0.72], [3.3, 9.35, 0.55], [4.0, 8.55, 0.32], [4.4, 7.85, 0.12]];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + (i % 2) * 0.13, c = i % 3 === 0 ? 0x5a9a3a : i % 3 === 1 ? 0x4a8a30 : 0x3e7a28, k = i % 2 ? 0.82 : 1, up = i % 2 ? 0.35 : 0;
    for (let j = 0; j < FR.length - 1; j++) {
      const [r0, y0, w0] = FR[j], [r1, y1, w1] = FR[j + 1], R0 = r0 * k, R1 = r1 * k, Y0 = y0 + up * (1 - j / 5), Y1 = y1 + up * (1 - (j + 1) / 5);
      const len = Math.hypot(R1 - R0, Y1 - Y0), pitch = Math.atan2(Y0 - Y1, R1 - R0), g = new THREE.BoxGeometry((w0 + w1) / 2, 0.05, len + 0.12); g.rotateX(pitch);
      const rm = (R0 + R1) / 2; crown.add(g, c, 0.5 + Math.sin(a) * rm, (Y0 + Y1) / 2 - 0.35, Math.cos(a) * rm, 0, a, 0);
    }
  }
  crown.ball(0.45, 0x6b4a2b, 0.5, 9.2, 0); crown.ball(0.3, 0x5a3d22, 0.85, 9.05, 0.2);
  const tg = trunk.build(), cg = crown.build(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  for (const geo of [tg, cg]) {
    const im = new THREE.InstancedMesh(geo, VEH_MAT, spots.length);
    spots.forEach((t, i) => { q.setFromEuler(e.set(0, t.r, t.lean)); sc.setScalar(t.s); p.set(t.x, t.y, t.z); m4.compose(p, q, sc); im.setMatrixAt(i, m4); });
    im.castShadow = true; im.receiveShadow = true; scene.add(im);
  }
}
function wkIsland() {
  const free = (x, z, r) => { if (pathDist(x, z) < r + 3) return false; for (const p of POINTS_DEF) if (Math.hypot(x - p.x, z - p.z) < 20) return false; const rw = RUNWAYS.red; if (Math.abs(x - rw.x) < rw.len / 2 + 10 && Math.abs(z - rw.z) < rw.wid / 2 + 10) return false; if (Math.hypot(x - BASES.red.x, z - BASES.red.z) < 38) return false; for (const o of nearbyColliders(x, z)) if (o.kind === 'box' && x > o.minX - r && x < o.maxX + r && z > o.minZ - r && z < o.maxZ + r) return false; return true; };
  // Quonset huts near the base, the airstrip and the points
  const hutSpots = [[BASES.red.x + 40, BASES.red.z + 8], [BASES.red.x + 30, BASES.red.z + 30], [-60, 238], [60, 238], [-120, 238], [120, 238], [-322, 0], [322, -40], [-300, 160], [300, 160], [8, -32], [-322, -200]];
  for (const [x, z] of hutSpots) if (free(x, z, 8) && heightAt(x, z) > 1.5) wkQuonset(x, z, Math.abs(z) > 200 || Math.abs(x) < 30, rand(12, 16));
  // pillboxes and gun pits along the beaches, facing the sea
  for (let i = 0; i < WAKE_U.length - 1; i++) {
    const a = WAKE_U[i], b = WAKE_U[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z);
    for (let s = 40; s < L - 30; s += 70) {
      const t = s / L, cx = lerp(a.x, b.x, t), cz = lerp(a.z, b.z, t), nx = (b.z - a.z) / L, nz = -(b.x - a.x) / L;   // outward side
      for (const side of [1, -1]) {
        const x = cx + nx * side * 22, z = cz + nz * side * 22;
        if (heightAt(x, z) > 0.8 && free(x, z, 4)) { if ((i + Math.round(s / 70)) % 2) wkPillbox(x, z, Math.atan2(nx * side, nz * side)); else wkAAGun(x, z); }
        for (let k = 0; k < 4; k++) { const hx = cx + nx * side * rand(29, 33) + rand(-12, 12), hz = cz + nz * side * rand(29, 33) + rand(-12, 12); if (heightAt(hx, hz) > -0.3 && heightAt(hx, hz) < 1.6) wkHedgehog(hx, hz); }
      }
    }
  }
  // a couple of working machine guns for red behind the main beaches
  for (const [x, z] of [[-140, 236], [140, 236], [-300, 140], [300, 140]]) if (free(x, z, 3)) makeTurret(x, z, 'mg', Math.PI);
  // palms everywhere there is room, thickest along the beaches
  const palms = [];
  for (let i = 0; i < (LITE ? 220 : 420); i++) {
    const k = Math.floor(rand(0, WAKE_U.length - 1)), a = WAKE_U[k], b = WAKE_U[k + 1], t = Math.random(), off = rand(-30, 30);
    const L = Math.hypot(b.x - a.x, b.z - a.z), nx = (b.z - a.z) / L, nz = -(b.x - a.x) / L, x = lerp(a.x, b.x, t) + nx * off, z = lerp(a.z, b.z, t) + nz * off, h = heightAt(x, z);
    if (h < 1.2 || !free(x, z, 1.5)) continue;
    palms.push({ x, z, y: h, s: rand(0.85, 1.3), r: rand(0, 6.28), lean: rand(-0.3, 0.3) }); addCircle(x, z, 0.4, h + 9);
  }
  for (let i = 0; i < 12; i++) { const a = rand(0, 6.28), r = rand(8, 18), x = Math.cos(a) * r, z = -20 + Math.sin(a) * r; if (heightAt(x, z) > 1.2 && free(x, z, 1.5)) palms.push({ x, z, y: heightAt(x, z), s: rand(0.9, 1.2), r: rand(0, 6.28), lean: rand(-0.3, 0.3) }); }
  wkPalms(palms);
  // jungle bushes
  const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0x3a6a26, flatShading: true }), 300); let n = 0;
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 900 && n < 300; i++) { const x = rand(-340, 340), z = rand(-280, 280), h = heightAt(x, z); if (h < 2.4 || !free(x, z, 1)) continue; const s = rand(0.8, 1.8); m4.makeScale(s, s * 0.7, s).setPosition(x, h + 0.3, z); bush.setMatrixAt(n++, m4); }
  bush.count = n; bush.castShadow = true; bush.receiveShadow = true; scene.add(bush);
  // a wrecked landing craft on the beach and a big rusty wreck on the reef
  const wk = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(9, 2.2, 4), wkMat(0x5a5a4a)); box.position.y = 0.6; wk.add(box); const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.4, 3.8), wkMat(0x4a4a3a)); ramp.position.set(-5.2, -0.1, 0); ramp.rotation.z = 1.1; wk.add(ramp);
  wk.position.set(-160, heightAt(-160, 284), 284); wk.rotation.set(0.12, 0.4, 0.08); scene.add(wk);
  const rust = new THREE.Group(); const h1 = new THREE.Mesh(new THREE.BoxGeometry(40, 8, 8), wkMat(0x6a4a34)); h1.position.y = 1; rust.add(h1); const fun = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 7, 10), wkMat(0x4a3424)); fun.position.set(4, 8, 0); rust.add(fun);
  rust.position.set(380, -1, 120); rust.rotation.set(0.25, 0.6, 0.18); rust.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(rust);
  // the island sign and a radio mast at the base
  const s = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.2), wkText('WAKE ISLAND', 10, 2.2, '#6a4a2a', '#f2e8c8')); s.position.set(0, heightAt(0, 236) + 3.2, 236); scene.add(s);
  for (const k of [-1, 1]) addMesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 6), wkMat(0x5a4028), k * 4, heightAt(0, 236) + 1.6, 236);
  const mx = BASES.red.x + 16, mz = BASES.red.z - 14, my = heightAt(mx, mz);
  addMesh(new THREE.CylinderGeometry(0.15, 0.4, 26, 6), MATS.steel, mx, my + 13, mz); addCircle(mx, mz, 0.6, my + 26);
}

// ---------- vehicles ----------
function buildWakeVehicles() {
  const C = CARRIER, D = C.deck;
  // blue: landing boats at the dock, helicopters on deck
  const dockX = C.x + C.hl + 58;
  for (const [x, z, yaw] of [[dockX - 6, C.z + 26, 0], [dockX + 6, C.z + 26, 0], [dockX + 18, C.z + 26, 0], [dockX + 22, C.z + 4, Math.PI / 2], [dockX + 22, C.z + 16, Math.PI / 2], [dockX - 6, C.z - 10, Math.PI]]) if (waterDepth(x, z) > 1.2) makeGV('boat', 'blue', x, z, yaw, WATER_Y);
  for (const x of [C.x - 82, C.x + 72]) { const v = makeGV('heli', 'blue', x, C.z + C.hw - 6, Math.PI / 2); }
  // red: jeeps, trucks and tanks at the base and along the island, boats in the lagoon, one helicopter
  const tryPark = (type, x, z, yaw) => { for (let k = 0; k < 20; k++) { const px = x + rand(-10, 10), pz = z + rand(-10, 10); if (vehicleSpotFree(px, pz, 3.5)) { makeGV(type, 'red', px, pz, yaw); return true; } } return false; };
  const B = BASES.red;
  for (const [type, ox, oz] of [['jeep', 26, 30], ['tank', 10, 44], ['truck', -8, 40], ['jeep', 34, 46], ['apc', 20, 60]]) tryPark(type, B.x + ox, B.z + oz, Math.PI);
  for (const p of [PD.B, PD.C, PD.D, PD.E]) { tryPark('jeep', p.x + 20 * Math.sign(-p.x || 1), p.z - 18, 0); }
  tryPark('tank', PD.D.x + 30, PD.D.z - 15, 0);
  for (const [x, z] of [[-60, -30], [60, -20]]) if (waterDepth(x, z) > 1.2) makeGV('boat', 'red', x, z, Math.PI / 2, WATER_Y);
  for (let k = 0; k < 40; k++) { const x = B.x + rand(20, 60), z = B.z + rand(30, 90); if (vehicleSpotFree(x, z, 6.5)) { makeGV('heli', 'red', x, z, Math.PI); helipadMesh(x, heightAt(x, z), z); break; } }
}

// ---------- every frame ----------
function updateWake(dt) {
  for (const s of WAKE_SMOKE) {
    if (s.radar) { s.radar.rotation.y += dt * (s.spin || 1.6); continue; }
    s.t -= dt; if (s.t <= 0) { s.t = s.big ? 0.25 : 0.4; smokePuff(new THREE.Vector3(s.x, s.y, s.z), s.dark ? 0x4a4a4a : 0x9a9a9a, s.big ? 4 : 1.1, s.big ? 8 : 4, s.big ? 6 : 2.2); }
  }
}
// ---------- the smaller islands ----------
function wkIsles() {
  const palms = [];
  for (const I of WAKE_ISLES) {
    if (I.kind === 'volcano') {
      // a glowing crater, smoke rising from it, and black boulders on the slopes
      const cy = heightAt(I.x, I.z);
      const lava = new THREE.Mesh(new THREE.CircleGeometry(9, 24), new THREE.MeshBasicMaterial({ color: 0xff6a1a })); lava.rotation.x = -Math.PI / 2; lava.position.set(I.x, cy + 0.4, I.z); scene.add(lava);
      const glow = new THREE.PointLight(0xff7a30, 2.2, 90, 1.5); glow.position.set(I.x, cy + 8, I.z); scene.add(glow);
      for (let k = 0; k < 4; k++) WAKE_SMOKE.push({ x: I.x + rand(-5, 5), y: cy + 6, z: I.z + rand(-5, 5), t: rand(0, 1), dark: true, big: true });
      const rock = wkMat(0x2a2626);
      for (let k = 0; k < 40; k++) { const a = rand(0, 6.28), r = rand(20, I.r * 0.9), x = I.x + Math.cos(a) * r, z = I.z + Math.sin(a) * r, s = rand(1, 3.2); const m = addMesh(new THREE.DodecahedronGeometry(s, 0), rock, x, heightAt(x, z) + s * 0.4, z); m.rotation.set(rand(0, 3), rand(0, 3), 0); }
    } else if (I.kind === 'rocks') {
      // a red and white striped lighthouse on the highest rock, with a keeper's hut and a turning beam
      let bx = I.x, bz = I.z, by = -99; for (let k = 0; k < 60; k++) { const x = I.x + rand(-15, 15), z = I.z + rand(-15, 15), h = heightAt(x, z); if (h > by) { by = h; bx = x; bz = z; } }
      const P = new Part();
      for (let i = 0; i < 6; i++) P.cyl(2.6 - i * 0.22, 2.8 - i * 0.22, 3.2, i % 2 ? 0xc8302a : 0xf2f0ea, 0, 1.6 + i * 3.2, 0, 0, 0, 0, 1, 16);
      P.cyl(2.2, 2.2, 0.4, 0x2a2a2a, 0, 19.4, 0, 0, 0, 0, 1, 16); P.cyl(1.4, 1.4, 2.4, 0x9fd8ff, 0, 20.8, 0, 0, 0, 0, 1, 12); P.cyl(0.1, 1.7, 1.6, 0x2a2a2a, 0, 22.8, 0, 0, 0, 0, 1, 12);
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; P.box(0.08, 1, 0.08, 0x2a2a2a, Math.cos(a) * 2.1, 20.1, Math.sin(a) * 2.1); }
      const lh = new THREE.Mesh(P.build(), VEH_MAT); lh.position.set(bx, by - 0.3, bz); lh.castShadow = true; scene.add(lh); addCircle(bx, bz, 2.9, by + 22);
      const beam = new THREE.Mesh(new THREE.ConeGeometry(6, 70, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
      beam.geometry.translate(0, -35, 0); beam.rotation.z = Math.PI / 2 - 0.08; const pivot = new THREE.Group(); pivot.position.set(bx, by + 20.5, bz); pivot.add(beam); scene.add(pivot); WAKE_SMOKE.push({ radar: pivot, spin: 0.9 });
      house(bx + 8, bz + 5, 6, 5, 3.2, {});
    } else if (I.kind === 'sandbar') {
      // palms in a line along the bar, driftwood, and a wrecked fishing boat on its side
      for (let k = 0; k < 26; k++) { const x = I.x + rand(-I.r * 0.75, I.r * 0.75), z = I.z + rand(-8, 8), h = heightAt(x, z); if (h > 1) palms.push({ x, z, y: h, s: rand(0.8, 1.2), r: rand(0, 6.28), lean: rand(-0.35, 0.35) }); }
      for (let k = 0; k < 10; k++) { const x = I.x + rand(-60, 60), z = I.z + rand(-10, 10), h = heightAt(x, z); if (h > 0.5) addMesh(new THREE.CylinderGeometry(0.15, 0.2, rand(2, 4), 6), wkMat(0x9a8a6a), x, h + 0.15, z, false).rotation.set(Math.PI / 2, rand(0, 3), 0); }
      const W = new Part(); W.box(3, 2, 9, 0x6a4a30, 0, 1, 0); W.box(2.6, 0.2, 8.6, 0x8a6a48, 0, 2, 0); W.box(1.6, 1.6, 2, 0xd8d0c0, 0, 2.8, 1.5); W.cyl(0.08, 0.08, 5, 0x5a4028, 0, 4.5, -1);
      const wm = new THREE.Mesh(W.build(), VEH_MAT); wm.position.set(I.x + 30, heightAt(I.x + 30, I.z + 6), I.z + 6); wm.rotation.set(0.1, 0.6, 0.9); wm.castShadow = true; scene.add(wm);
    } else {
      // thick jungle, a concrete bunker hidden in it, a radio mast on the top, and a little dock
      for (let k = 0; k < 70; k++) { const a = rand(0, 6.28), r = rand(4, I.r * 0.85), x = I.x + Math.cos(a) * r, z = I.z + Math.sin(a) * r, h = heightAt(x, z); if (h > 1.4) palms.push({ x, z, y: h, s: rand(0.8, 1.35), r: rand(0, 6.28), lean: rand(-0.3, 0.3) }); }
      wkPillbox(I.x + 14, I.z - 18, Math.PI); wkPillbox(I.x - 20, I.z + 10, 0);
      const ty = heightAt(I.x, I.z); addMesh(new THREE.CylinderGeometry(0.15, 0.45, 24, 6), MATS.steel, I.x, ty + 12, I.z); addCircle(I.x, I.z, 0.7, ty + 24);
      for (let x = I.x + I.r - 6; x < I.x + I.r + 12; x += 3) addMesh(new THREE.BoxGeometry(3, 0.3, 4), wkMat(0x6a4a30), x, 0.4, I.z, false);
    }
  }
  wkPalms(palms);
}
function buildWakeExtras() {
  wkCarrier();
  wkWarship(-175, 432, 70, false); wkWarship(205, 515, 110, true); wkWarship(-60, 545, 64, false); wkWarship(330, 420, 60, false);
  wkIsland();
  wkIsles();
}
