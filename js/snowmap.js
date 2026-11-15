// ===================== snowmap.js : the snowy Russian mountain map =====================
// Extra buildings and scenery for the snow map, plus the falling snow.
function snowSpot(x0, z0, clear, maxR = 60) {
  for (let r = 0; r <= maxR; r += 4) for (let k = 0; k < (r ? 14 : 1); k++) {
    const a = k / 14 * Math.PI * 2 + r * 0.21, x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
    if (pathDist(x, z) < clear * 0.6 || inRunwayZone(x, z, clear)) continue;
    let ok = true;
    for (const o of nearbyColliders(x, z)) if (o.kind === 'box' && x > o.minX - clear && x < o.maxX + clear && z > o.minZ - clear && z < o.maxZ + clear) { ok = false; break; }
    for (const p of POINTS_DEF) if (Math.hypot(x - p.x, z - p.z) < 20) ok = false;
    if (ok && Math.abs(heightAt(x + clear, z) - heightAt(x - clear, z)) < 3 && Math.abs(heightAt(x, z + clear) - heightAt(x, z - clear)) < 3) return [x, z];
  }
  return null;
}
const SNOWMATS = {
  plaster: new THREE.MeshLambertMaterial({ color: 0xf1ece0 }),
  blue: new THREE.MeshLambertMaterial({ color: 0x3d6fa8 }),
};
const _matCache = {};
function texMat(tex, rx, ry) { const k = tex.uuid + '_' + Math.round(rx) + '_' + Math.round(ry); return _matCache[k] || (_matCache[k] = new THREE.MeshLambertMaterial({ map: texRepeat(tex, Math.max(1, Math.round(rx)), Math.max(1, Math.round(ry))) })); }
const brickMat = (w, h) => texMat(TEX.brick, w / 3, h / 3);
function deco(p, x, y, z, ry = 0) { const m = new THREE.Mesh(p.build(), VEH_MAT); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; }
// a sign with Cyrillic writing
function signTex(text, bg = '#f4f1ea', fg = '#1d2b3a', w = 256, h = 64) {
  return canvasTex(w, h, g => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = fg; g.font = `bold ${Math.floor(h * 0.5)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2); });
}
function signBoard(text, x, y, z, w, h, ry, bg, fg) {
  const t = signTex(text, bg, fg); t.magFilter = THREE.LinearFilter;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m;
}
function roadSign(text, x, z, ry) {
  const y = heightAt(x, z);
  addMesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), MATS.steel, x, y + 1.3, z);
  signBoard(text, x, y + 2.6, z, 2.8, 0.75, ry, '#1f5fa8', '#ffffff');
}
// a red star, standing up
function redStar(p, x, y, z, r, ry = 0) {
  const g = starGeo(r); g.rotateX(Math.PI / 2);
  for (const s of [-1, 1]) p.add(g.clone(), 0xd8262a, x + Math.sin(ry) * 0.05 * s, y, z + Math.cos(ry) * 0.05 * s, 0, ry, 0);
}
// an Orthodox church with onion domes
function onionChurch(x, z, domeCol = 0xd9ae4a, sideCol = 0x2f7d5b, scale = 1) {
  const S = scale, m = addBlock(x, z, 10 * S, 9 * S, 14 * S, SNOWMATS.plaster);
  const top = m.userData.top, base = top - 9 * S;
  addBlock(x, z + 9.5 * S, 5 * S, 15 * S, 5 * S, SNOWMATS.plaster);
  const p = new Part(), gold = 0xd9ae4a, H = top - base;
  p.box(10.6 * S, 0.6, 14.6 * S, 0xdfd6c4, 0, H + 0.3, 0);
  p.add(new THREE.CylinderGeometry(3.2 * S, 3.2 * S, 4.5 * S, 16), 0xf1ece0, 0, H + 2.8 * S, 0);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; p.box(0.5 * S, 2.2 * S, 0.12, 0x2d4766, Math.cos(a) * 3.22 * S, H + 2.8 * S, Math.sin(a) * 3.22 * S, 0, -a + Math.PI / 2, 0); }
  const dome = (dx, dy, dz, r, col) => {
    p.add(new THREE.SphereGeometry(r, 16, 12), col, dx, dy, dz, 0, 0, 0, 1, 1.15, 1);
    p.add(new THREE.ConeGeometry(r * 0.55, r * 1.3, 16), col, dx, dy + r * 1.35, dz);
    p.cyl(0.08 * S, 0.08 * S, r * 1.4, gold, dx, dy + r * 2.4, dz); p.box(0.9 * S, 0.1 * S, 0.1 * S, gold, dx, dy + r * 2.6, dz);
  };
  dome(0, H + 6.4 * S, 0, 3.3 * S, domeCol);
  for (const [dx, dz] of [[-3.6, -5], [3.6, -5], [-3.6, 5], [3.6, 5]]) { p.cyl(1.1 * S, 1.1 * S, 2.4 * S, 0xf1ece0, dx * S, H + 1.6 * S, dz * S); dome(dx * S, H + 3.6 * S, dz * S, 1.4 * S, sideCol); }
  p.add(new THREE.CylinderGeometry(0.01, 3.4 * S, 4 * S, 4), 0x3a6f9e, 0, H + 8 * S, 9.5 * S, 0, Math.PI / 4, 0);
  dome(0, H + 10.4 * S, 9.5 * S, 1.2 * S, domeCol);
  for (let i = 0; i < 3; i++) p.box(1.2 * S, 2.2 * S, 0.14, 0x2d4766, (-2.5 + i * 2.5) * S, 3 * S, -7.08 * S);
  p.box(2.2 * S, 3.4 * S, 0.3, 0x5a3a22, 0, 1.7 * S, -7.1 * S);
  p.box(10.8 * S, 0.25, 14.8 * S, 0xf6f9fc, 0, H + 0.68, 0);
  deco(p, x, base, z);
}
// ---------- the Kremlin: red brick walls, towers with tent roofs and red stars, and a cathedral inside ----------
function tentTower(x, z, base, w, h, roofH, withClock, face) {
  addBlock(x, z, w, h, w, brickMat(w, h), { y: base - 0.4 });
  const p = new Part(), top = h - 0.4;
  p.box(w + 0.8, 0.8, w + 0.8, 0xe8e0d0, 0, top + 0.4, 0);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; p.box(1.2, 1.6, 0.6, 0x9a3a2c, Math.sin(a) * (w / 2 + 0.1), top + 1.6, Math.cos(a) * (w / 2 + 0.1), 0, a, 0); }   // merlons
  p.box(w * 0.7, roofH * 0.25, w * 0.7, 0xa8422f, 0, top + 0.8 + roofH * 0.12, 0);
  p.add(new THREE.ConeGeometry(w * 0.55, roofH, 4), 0x2f7d4a, 0, top + 0.8 + roofH * 0.25 + roofH / 2, 0, 0, Math.PI / 4, 0);   // green tent roof
  p.cyl(0.12, 0.12, 2.5, 0xd9ae4a, 0, top + 0.8 + roofH * 1.25 + 1.2, 0);
  redStar(p, 0, top + 0.8 + roofH * 1.25 + 3.2, 0, 1.6, face || 0);
  if (withClock) { const fx = Math.sin(face) * (w / 2 + 0.06), fz = Math.cos(face) * (w / 2 + 0.06); p.add(new THREE.CircleGeometry(2.2, 24), 0xf5f2e8, fx, h * 0.72, fz, 0, face, 0); p.add(new THREE.RingGeometry(2.0, 2.3, 24), 0xd9ae4a, fx * 1.002, h * 0.72, fz * 1.002, 0, face, 0); p.box(0.18, 1.6, 0.06, 0x111111, fx * 1.004, h * 0.72 + 0.6, fz * 1.004, 0, face, 0); p.box(1.2, 0.18, 0.06, 0x111111, fx * 1.004 + Math.cos(face) * 0.5, h * 0.72, fz * 1.004 - Math.sin(face) * 0.5, 0, face, 0); }
  deco(p, x, base - 0.4, z);
}
function kremlin(cx, cz) {
  const base = heightAt(cx, cz), S = 46, T = 3, H = 9, gap = 7;
  // four walls, each with a gate in the middle
  for (const [ax, az, horiz] of [[0, -S, true], [0, S, true], [-S, 0, false], [S, 0, false]]) {
    for (const sgn of [-1, 1]) {
      const len = S - gap, mid = sgn * (gap + len / 2);
      const x = cx + (horiz ? mid : ax), z = cz + (horiz ? az : mid), w = horiz ? len : T, d = horiz ? T : len;
      addBlock(x, z, w, H, d, brickMat(Math.max(w, d), H), { y: base - 0.4 });
      // swallowtail battlements along the top
      const p = new Part();
      for (let k = -len / 2 + 1; k < len / 2; k += 2.4) {
        const ox = horiz ? k : 0, oz = horiz ? 0 : k;
        p.box(horiz ? 1.3 : T + 0.2, 1.4, horiz ? T + 0.2 : 1.3, 0x9a3a2c, ox, H - 0.4 + 0.7, oz);
        p.box(horiz ? 0.4 : T + 0.25, 0.7, horiz ? T + 0.25 : 0.4, 0x9a3a2c, ox + (horiz ? 0.45 : 0), H - 0.4 + 1.75, oz + (horiz ? 0 : 0.45));
        p.box(horiz ? 0.4 : T + 0.25, 0.7, horiz ? T + 0.25 : 0.4, 0x9a3a2c, ox - (horiz ? 0.45 : 0), H - 0.4 + 1.75, oz - (horiz ? 0 : 0.45));
      }
      p.box(horiz ? len : T + 0.3, 0.3, horiz ? T + 0.3 : len, 0xf4f7fb, 0, H - 0.25, 0);   // snow on the wall walk
      deco(p, x, base - 0.4, z);
    }
  }
  // corner towers and the big gate towers (the gate stays open underneath)
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tentTower(cx + dx * S, cz + dz * S, base, 8, 16, 9, false, Math.atan2(dx, dz));
  for (const [dx, dz, face] of [[0, -S, Math.PI], [0, S, 0], [-S, 0, -Math.PI / 2], [S, 0, Math.PI / 2]]) {
    const x = cx + dx, z = cz + dz;
    const tw = 11, th = 26, under = 8;
    addBlock(x, z, tw, th - under, tw, brickMat(tw, th), { y: base - 0.4 + under });       // tower body above the gate arch
    for (const sgn of [-1, 1]) { const px = x + (dz ? sgn * (gap - 1.2) : 0), pz = z + (dx ? sgn * (gap - 1.2) : 0); addBlock(px, pz, dz ? 2.4 : tw, under, dx ? 2.4 : tw, brickMat(3, under), { y: base - 0.4 }); }
    const p = new Part(), top = th - 0.4;
    p.box(tw + 0.8, 0.8, tw + 0.8, 0xe8e0d0, 0, top + 0.4, 0);
    p.box(tw * 0.65, 6, tw * 0.65, 0xa8422f, 0, top + 3.8, 0); p.box(tw * 0.68, 0.5, tw * 0.68, 0xe8e0d0, 0, top + 6.9, 0);
    p.add(new THREE.ConeGeometry(tw * 0.45, 12, 8), 0x2f7d4a, 0, top + 13, 0, 0, Math.PI / 8, 0);
    p.cyl(0.14, 0.14, 3, 0xd9ae4a, 0, top + 20.2, 0);
    redStar(p, 0, top + 22.6, 0, 2.2, face);
    const fx = Math.sin(face) * (tw / 2 + 0.06), fz = Math.cos(face) * (tw / 2 + 0.06);
    p.add(new THREE.CircleGeometry(2.8, 28), 0xf5f2e8, fx, 17, fz, 0, face, 0);
    p.add(new THREE.RingGeometry(2.6, 3.0, 28), 0xd9ae4a, fx * 1.002, 17, fz * 1.002, 0, face, 0);
    p.box(0.2, 2.0, 0.06, 0x111111, fx * 1.004, 17.8, fz * 1.004, 0, face, 0);
    deco(p, x, base - 0.4, z);
  }
  // inside: a great cathedral and a tall white bell tower
  onionChurch(cx + 25, cz - 24, 0xd9ae4a, 0xd9ae4a, 1.25);
  const bt = addBlock(cx - 27, cz + 26, 7, 30, 7, SNOWMATS.plaster);
  const p = new Part();
  for (let i = 0; i < 3; i++) p.box(7.6 - i * 1.2, 0.6, 7.6 - i * 1.2, 0xe0d8c6, 0, 8 + i * 9, 0);
  p.add(new THREE.SphereGeometry(2.6, 16, 12), 0xd9ae4a, 0, 31.6, 0, 0, 0, 0, 1, 1.2, 1);
  p.add(new THREE.ConeGeometry(1.4, 3.2, 16), 0xd9ae4a, 0, 34.8, 0); p.cyl(0.1, 0.1, 2.4, 0xd9ae4a, 0, 37.3, 0); p.box(1.2, 0.12, 0.12, 0xd9ae4a, 0, 37.7, 0);
  deco(p, cx - 27, bt.userData.top - 30, cz + 26);
  // a tank on a plinth outside the south gate
  const tx = cx + 16, tz = cz + S + 18, ty = heightAt(tx, tz);
  addBlock(tx, tz, 9, 2.5, 5, MATS.concrete);
  const tk = new Part(), g = 0x3d5a32;
  tk.box(6.6, 1.2, 3.4, g, 0, 3.4, 0); tk.box(7, 0.9, 1, 0x2a2a2a, 0, 2.9, 1.6); tk.box(7, 0.9, 1, 0x2a2a2a, 0, 2.9, -1.6);
  tk.add(new THREE.CylinderGeometry(1.4, 1.6, 1.1, 10), g, -0.4, 4.5, 0); tk.cyl(0.14, 0.18, 4.2, g, -3.0, 4.6, 0, 0, 0, Math.PI / 2);
  redStar(tk, -0.4, 4.6, 1.42, 0.45, 0); redStar(tk, -0.4, 4.6, -1.42, 0.45, Math.PI);
  deco(tk, tx, ty, tz);
  signBoard('КРЕМЛЬ', cx, base + 5.5, cz + S + 1.8, 6, 1.4, 0, '#7a1f1f', '#f1d999');
  signBoard('КРЕМЛЬ', cx, base + 5.5, cz - S - 1.8, 6, 1.4, Math.PI, '#7a1f1f', '#f1d999');
}
// ---------- Soviet housing blocks ----------
let panelTex = null;
function sovietBlock(x, z, alongX, floors = 9) {
  if (!panelTex) panelTex = canvasTex(64, 64, (g) => {
    g.fillStyle = '#b9b5ab'; g.fillRect(0, 0, 64, 64); speckle(g, 64, 64, 0.12);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 64, 1); g.fillRect(0, 0, 1, 64);
    g.fillStyle = '#e8e4da'; g.fillRect(14, 14, 36, 30); g.fillStyle = '#34465a'; g.fillRect(17, 17, 30, 24);
    g.fillStyle = '#e8e4da'; g.fillRect(31, 17, 2, 24); g.fillStyle = '#f5d77a'; g.fillRect(17, 17, 14, 11);
    g.fillStyle = '#8f8a80'; g.fillRect(12, 46, 40, 4);
  });
  const h = floors * 3, w = alongX ? 40 : 12, d = alongX ? 12 : 40;
  const m = addBlock(x, z, w, h, d, texMat(panelTex, Math.max(w, d) / 3.3, floors));
  const top = m.userData.top;
  addMesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), MATS.concrete, x, top + 0.25, z);
  addMesh(new THREE.BoxGeometry(w + 0.5, 0.3, d + 0.5), MATS.white, x, top + 0.6, z);
  const p = new Part();
  for (let i = 0; i < 3; i++) { const o = (-1 + i) * (Math.max(w, d) / 3); p.box(alongX ? 3 : 0.6, 2.6, alongX ? 0.6 : 3, 0x5a3a22, alongX ? o : (w / 2 + 0.3) * (z > 0 ? -1 : 1), 1.3 - h + h, alongX ? (d / 2 + 0.3) * (z > 0 ? -1 : 1) : o); }
  p.box(1.4, 3, 1.4, 0x7d7a74, alongX ? w / 2 - 3 : 0, h + 1.5, alongX ? 0 : d / 2 - 3);   // lift housing on the roof
  deco(p, x, top - h, z);
}
function gastronom(x, z, ry) {
  const m = addBlock(x, z, 18, 5, 10, MATS.concreteBig);
  signBoard('ГАСТРОНОМ', x + Math.sin(ry) * 5.1, m.userData.top - 1.2, z + Math.cos(ry) * 5.1, 9, 1.6, ry, '#c8302c', '#ffffff');
}
function soldierStatue(x, z, ry) {
  const y = heightAt(x, z);
  addBlock(x, z, 5, 4, 5, MATS.concrete);
  const p = new Part(), c = 0x6f7a6a;
  p.box(1.4, 2.6, 0.9, c, 0, 6.1, 0); p.box(0.55, 2.4, 0.6, c, -0.4, 3.9, 0); p.box(0.55, 2.4, 0.6, c, 0.45, 3.9, 0.3);
  p.ball(0.5, c, 0, 7.8, 0); p.box(0.4, 2.2, 0.4, c, 0.95, 7.6, 0, 0, 0, -0.5); p.box(0.4, 1.8, 0.4, c, -0.9, 6.3, 0.2, 0.3, 0, 0.3);
  p.box(0.15, 0.15, 2.6, 0x4a5246, 1.4, 8.6, 0.2, -0.9, 0, 0); p.box(1.6, 1.0, 0.05, 0xc8302c, 1.9, 9.4, 0.6);   // raised rifle and flag
  deco(p, x, y, z, ry);
}
function microDistrict(P, flip) {
  const o = flip ? -1 : 1;
  sovietBlock(P.x - 30 * o, P.z - 36 * o, true, 9); sovietBlock(P.x + 34 * o, P.z - 22 * o, false, 9);
  sovietBlock(P.x - 36 * o, P.z + 26 * o, false, 5); sovietBlock(P.x + 22 * o, P.z + 36 * o, true, 5);
  gastronom(P.x + 6 * o, P.z - 24 * o, flip ? 0 : Math.PI);
  soldierStatue(P.x - 16 * o, P.z + 4 * o, flip ? Math.PI : 0);
}
// ---------- rail yards with a train ----------
function wagon(x, z, y, col, tanker) {
  const p = new Part();
  if (tanker) { p.cyl(1.4, 1.4, 9, col, 0, 2.3, 0, 0, 0, Math.PI / 2, 1, 14); p.cyl(0.4, 0.4, 0.5, col, 0, 3.8, 0); }
  else { p.box(10, 3.1, 3, col, 0, 2.5, 0); p.box(10.2, 0.25, 3.2, 0xf4f7fb, 0, 4.15, 0); p.box(2.2, 2.4, 0.06, 0x3a2a1c, 0, 2.4, 1.53); p.box(2.2, 2.4, 0.06, 0x3a2a1c, 0, 2.4, -1.53); }
  p.box(9.4, 0.4, 2.4, 0x222222, 0, 0.8, 0);
  for (const wx of [-3.6, -2.6, 2.6, 3.6]) for (const s of [-1, 1]) p.cyl(0.42, 0.42, 0.2, 0x2a2a2a, wx, 0.5, s * 0.75, Math.PI / 2, 0, 0);
  deco(p, x, y, z);
  const cb = addBlock(x, z, 10, 4.2, 3, MATS.metal, { y }); cb.visible = false; cb.userData.static = false;   // an invisible solid box, so bullets and people stop at the wagon
}
function locomotive(x, z, y) {
  const p = new Part(), g = 0x2f6b3a, r = 0xc8302c;
  p.box(15, 3.2, 3.1, g, 0, 2.6, 0); p.box(15.1, 0.4, 3.2, r, 0, 1.6, 0); p.box(4, 1.4, 3.2, g, -5.2, 4.9, 0);
  p.box(3.6, 0.9, 0.06, 0x2d4766, -5.2, 4.9, 1.61); p.box(3.6, 0.9, 0.06, 0x2d4766, -5.2, 4.9, -1.61); p.box(0.06, 0.9, 2.6, 0x2d4766, -7.21, 4.9, 0);
  p.box(15.2, 0.3, 3.3, 0xf4f7fb, 0, 4.35, 0); p.box(4.2, 0.3, 3.4, 0xf4f7fb, -5.2, 5.75, 0);
  p.cyl(0.35, 0.35, 0.2, 0xfff2b0, -7.6, 3.4, 0, 0, 0, Math.PI / 2);
  redStar(p, -7.58, 2.5, 0, 0.55, -Math.PI / 2);
  p.box(14.4, 0.5, 2.4, 0x222222, 0, 0.8, 0);
  for (const wx of [-5.5, -4.2, -2.9, 2.9, 4.2, 5.5]) for (const s of [-1, 1]) p.cyl(0.5, 0.5, 0.2, 0x2a2a2a, wx, 0.55, s * 0.75, Math.PI / 2, 0, 0);
  deco(p, x, y, z);
  const cb = addBlock(x, z, 15, 6, 3.1, MATS.metal, { y }); cb.visible = false; cb.userData.static = false;
}
function railYard(P, flip) {
  const y = heightAt(P.x, P.z), o = flip ? -1 : 1, len = 110;
  const sleepers = [], rails = new Part();
  for (const tz of [-14, -8, 18]) {
    const zz = P.z + tz * o;
    for (const s of [-0.75, 0.75]) rails.box(len, 0.16, 0.12, 0x6d747b, 0, 0.25, tz * o + s);
    for (let k = -len / 2; k < len / 2; k += 1.2) sleepers.push([P.x + k, zz]);
  }
  deco(rails, P.x, y, P.z - 0 * o).castShadow = false;
  const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.14, 2.4), MATS.darkWood, sleepers.length), m4 = new THREE.Matrix4();
  sleepers.forEach(([sx, sz], i) => { m4.makeTranslation(sx, y + 0.12, sz); sl.setMatrixAt(i, m4); }); sl.receiveShadow = true; scene.add(sl);
  locomotive(P.x - 30 * o, P.z - 14 * o, y);
  const cols = [0x7a3b26, 0x5d4a2e, 0x7a3b26, 0x3f5a6b];
  for (let i = 0; i < 4; i++) wagon(P.x - 18 * o + i * 11 * o, P.z - 14 * o, y, cols[i], i === 3);
  for (let i = 0; i < 3; i++) wagon(P.x + 8 * o + i * 11 * o, P.z - 8 * o, y, cols[(i + 1) % 4], i === 1);
  // station building
  const st = addBlock(P.x + 6 * o, P.z + 32 * o, 26, 8, 10, wallMatCache.st || (wallMatCache.st = new THREE.MeshLambertMaterial({ color: 0xe3cf8a })));
  addMesh(prismGeo(11, 3, 27), MATS.roofs[0], P.x + 6 * o, st.userData.top, P.z + 32 * o).rotation.y = Math.PI / 2;
  signBoard('СТАНЦИЯ', P.x + 6 * o, st.userData.top - 1.6, P.z + 32 * o - 5.1 * o, 8, 1.5, flip ? 0 : Math.PI, '#1f5fa8', '#ffffff');
  // water tower
  const wx = P.x - 40 * o, wz = P.z + 30 * o, wy = heightAt(wx, wz), wt = new Part();
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) wt.box(0.4, 9, 0.4, 0x4e3420, a * 2, 4.5, b * 2);
  wt.cyl(3, 3, 4, 0x5a3a22, 0, 11, 0); wt.add(new THREE.ConeGeometry(3.3, 1.6, 16), 0xf4f7fb, 0, 13.8, 0);
  deco(wt, wx, wy, wz); addCircle(wx, wz, 3, wy + 13);
}
// ---------- the factory with smokestacks ----------
const chimneys = [];
function factory(P, flip) {
  const o = flip ? -1 : 1, hx = P.x + 22 * o, hz = P.z - 24 * o;
  const hall = addBlock(hx, hz, 50, 14, 26, brickMat(50, 14));
  const top = hall.userData.top, p = new Part();
  for (let i = 0; i < 6; i++) { const x = -21 + i * 8.4; p.add(prismGeo(26, 4, 8).rotateY(Math.PI / 2), 0x6d747b, x, 0, 0); p.box(0.3, 3.6, 25, 0x8fb0c8, x + 3.9, 1.9, 0); }   // saw-tooth roof with skylights
  p.box(50.4, 0.3, 26.4, 0xf4f7fb, 0, 0.1, 0);
  deco(p, hx, top, hz);
  signBoard('ЗАВОД', hx, top - 3, hz + 13.1 * o, 10, 2, flip ? Math.PI : 0, '#c8302c', '#ffffff');
  const stars = new Part(); redStar(stars, 0, 0, 0, 2.4, flip ? Math.PI : 0); deco(stars, hx, top - 7.5, hz + 13.2 * o);
  for (const [cx2, cz2] of [[P.x - 26 * o, P.z - 30 * o], [P.x - 34 * o, P.z - 18 * o]]) {
    const y = heightAt(cx2, cz2), c = new Part();
    c.cyl(1.6, 2.4, 44, 0x8f3a2a, 0, 22, 0, 0, 0, 0, 1, 14);
    for (const b of [36, 40]) c.cyl(1.75, 1.8, 2, b === 36 ? 0xf2f2ee : 0xc8302c, 0, b, 0, 0, 0, 0, 1, 14);
    deco(c, cx2, y, cz2); addCircle(cx2, cz2, 2.4, y + 44); chimneys.push({ x: cx2, y: y + 44.5, z: cz2, t: Math.random() });
  }
  for (const [tx, tz] of [[P.x + 30 * o, P.z + 20 * o], [P.x + 40 * o, P.z + 8 * o]]) {
    const y = heightAt(tx, tz), t = new Part(); t.cyl(4, 4, 8, 0xb9bdc2, 0, 4, 0, 0, 0, 0, 1, 18); t.cyl(4.1, 4.1, 0.4, 0xf4f7fb, 0, 8.2, 0, 0, 0, 0, 1, 18);
    deco(t, tx, y, tz); addCircle(tx, tz, 4, y + 8);
  }
}
// ---------- the monastery high in the mountains ----------
function monastery(P) {
  const y = heightAt(P.x, P.z), S = 26;
  for (const [ax, az, horiz] of [[0, -S, true], [0, S, true], [-S, 0, false], [S, 0, false]]) for (const sgn of [-1, 1]) {
    const len = S - 5, mid = sgn * (5 + len / 2), x = P.x + (horiz ? mid : ax), z = P.z + (horiz ? az : mid);
    addBlock(x, z, horiz ? len : 2, 5, horiz ? 2 : len, SNOWMATS.plaster, { y: y - 0.4 });
    addMesh(new THREE.BoxGeometry(horiz ? len + 0.3 : 2.4, 0.3, horiz ? 2.4 : len + 0.3), MATS.white, x, y + 4.75, z);
  }
  onionChurch(P.x + 10, P.z - 8, 0x3d6fa8, 0x3d6fa8, 0.9);
}
// ---------- the big Soviet military base in the middle ----------
function concreteMat(w, h) { return texMat(TEX.concrete, w / 4, h / 4); }
function militaryBase(cx, cz) {
  const base = heightAt(cx, cz), S = 50, H = 6, gap = 9;
  // thick concrete walls with a gate on every side
  for (const [ax, az, horiz] of [[0, -S, true], [0, S, true], [-S, 0, false], [S, 0, false]]) for (const sgn of [-1, 1]) {
    const len = S - gap, mid = sgn * (gap + len / 2), x = cx + (horiz ? mid : ax), z = cz + (horiz ? az : mid);
    addBlock(x, z, horiz ? len : 2.5, H, horiz ? 2.5 : len, concreteMat(len, H), { y: base - 0.4 });
    const p = new Part();
    p.box(horiz ? len : 2.8, 0.35, horiz ? 2.8 : len, 0xf4f7fb, 0, H - 0.2, 0);
    for (let k = -len / 2 + 2; k < len / 2; k += 3) p.cyl(0.25, 0.25, 0.9, 0x5f646a, horiz ? k : 0, H + 0.2, horiz ? 0 : k, 0, 0, Math.PI / 2 * (horiz ? 0 : 0));   // barbed wire coils
    p.box(horiz ? len : 0.1, 0.4, horiz ? 0.1 : len, 0xc8302c, 0, H * 0.55, horiz ? (az > 0 ? 1.3 : -1.3) : 0);   // red stripe
    deco(p, x, base - 0.4, z);
  }
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) watchtower(cx + dx * (S - 4), cz + dz * (S - 4));
  for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { sandbagWall(cx + dx * (S + 7) + dz * 6, cz + dz * (S + 7) + dx * 6, dz ? 7 : 1.4, dz ? 1.4 : 7); sandbagWall(cx + dx * (S + 7) - dz * 6, cz + dz * (S + 7) - dx * 6, dz ? 7 : 1.4, dz ? 1.4 : 7); }
  // command building: three storeys of concrete, antenna mast and a red star
  const hq = addBlock(cx - 26, cz - 26, 26, 12, 18, concreteMat(26, 12));
  const p = new Part(), t = hq.userData.top - (base - 0.4);
  p.box(26.4, 0.5, 18.4, 0xf4f7fb, 0, t + 0.25, 0);
  for (let f = 0; f < 3; f++) for (let i = -4; i <= 4; i++) { p.box(1.6, 1.4, 0.08, 0x2d4766, i * 2.6, 2.2 + f * 3.8, 9.05); p.box(1.6, 1.4, 0.08, 0x2d4766, i * 2.6, 2.2 + f * 3.8, -9.05); }
  p.cyl(0.25, 0.4, 22, 0x8a8f96, 8, t + 11, -4); for (let i = 0; i < 4; i++) p.box(2.6 - i * 0.5, 0.12, 0.12, 0x8a8f96, 8, t + 6 + i * 4.5, -4);
  p.ball(0.4, 0xff3b2a, 8, t + 22.3, -4);
  redStar(p, 0, t - 2.6, 9.2, 2.2, 0);
  p.box(10, 1.6, 0.1, 0x7a1f1f, 0, t - 0.6, 9.12);
  deco(p, cx - 26, base - 0.4, cz - 26);
  // two big hangars, a radar dish, fuel tanks and a missile on its launcher
  hangar(cx + 24, cz - 26); hangar(cx + 24, cz + 26);
  fuelTank(cx - 34, cz + 16); fuelTank(cx - 24, cz + 16);
  const rx = cx - 30, rz = cz + 34, ry = heightAt(rx, rz), r = new Part();
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) r.box(0.35, 10, 0.35, 0x6d747b, a * 1.6, 5, b * 1.6);
  r.box(4, 0.4, 4, 0x6d747b, 0, 10, 0);
  r.add(new THREE.SphereGeometry(5, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.32), 0xd9dde2, 0, 12, 1.5, -1.1, 0, 0);
  r.cyl(0.12, 0.12, 4.5, 0x6d747b, 0, 13.5, 3.4, -1.1, 0, 0);
  deco(r, rx, ry, rz); addCircle(rx, rz, 2.5, ry + 14);
  const mx = cx + 4, mz = cz + 30, my = heightAt(mx, mz), m = new Part();
  m.box(14, 1.4, 4, 0x4b5320, 0, 1.2, 0); for (const wx of [-5, -2, 2, 5]) for (const s of [-1, 1]) m.cyl(0.8, 0.8, 0.6, 0x222222, wx, 0.8, s * 2.1, Math.PI / 2, 0, 0);
  m.cyl(0.9, 0.9, 16, 0xe8e4da, -1, 7.5, 0, 0, 0, -1.2, 1, 14); m.add(new THREE.ConeGeometry(0.9, 2.6, 14), 0xc8302c, 6.3, 10.6, 0, 0, 0, -1.2);
  for (const s of [-1, 1]) m.box(1.6, 0.1, 1.2, 0x4b5320, -7.6, 3.4, s * 0.9, 0, 0, -1.2);
  redStar(m, -1, 7.5, 0.92, 0.6, 0);
  deco(m, mx, my, mz); { const cb = addBlock(mx, mz, 14, 4, 4, MATS.metal); cb.visible = false; cb.userData.static = false; }
  // flagpole, floodlights and oil drums
  { const fx = cx + 4, fz = cz - 6, fy = heightAt(fx, fz), f = new Part();
    f.box(2.4, 0.6, 2.4, 0x9b9c98, 0, 0.3, 0); f.cyl(0.1, 0.12, 14, 0xc9cdd2, 0, 7.6, 0);
    for (let i = 0; i < 6; i++) f.box(0.5, 2.4, 0.05, 0xc8302c, 0.5 + i * 0.5, 13.2 + Math.sin(i * 0.9) * 0.15, Math.sin(i * 0.9) * 0.25);   // the flag, mid-wave
    redStar(f, 0.9, 13.9, 0.27, 0.35, 0);
    deco(f, fx, fy, fz); addCircle(fx, fz, 0.6, fy + 14); }
  for (const [dx, dz] of [[-40, -40], [40, -40], [-40, 40], [40, 40], [0, -20], [-10, 20]]) {
    const lx = cx + dx * 0.8, lz = cz + dz * 0.8, ly = heightAt(lx, lz), l = new Part();
    l.cyl(0.12, 0.16, 9, 0x6d747b, 0, 4.5, 0); l.box(1.8, 0.5, 0.6, 0x3a3f45, 0, 9.1, 0);
    deco(l, lx, ly, lz); const gl = new Part(); gl.box(1.6, 0.3, 0.06, 0xfff2c0, 0, 8.95, 0.32); const gm = new THREE.Mesh(gl.build(), VEH_GLOW); gm.position.set(lx, ly, lz); scene.add(gm);
  }
  for (let i = 0; i < 8; i++) addDrum(cx - 36 + (i % 4) * 1.3, cz - 4 + Math.floor(i / 4) * 1.3);
  // trucks, containers and sandbag nests around the yard
  container(cx + 6, cz - 36, true, 0x4b5320); container(cx + 6, cz - 32, true, 0x6b4a33);
  for (const [dx, dz] of [[-8, 8], [10, -6], [-12, -8]]) { sandbagWall(cx + dx, cz + dz - 2.5, 5, 1.2); sandbagWall(cx + dx - 2.5, cz + dz, 1.2, 4); }
}
function buildSnowExtras() {
  militaryBase(PD.C.x, PD.C.z);
  microDistrict(PD.B, false); microDistrict(PD.D, true);
  railYard(PD.A, false); railYard(PD.E, true);
  factory(PD.G, false);
  monastery(PD.F);
  // log cabin villages along the mountain roads
  for (const [a, b, n] of [[PD.A, PD.F, 6], [PD.B, PD.G, 6], [PD.F, PD.D, 6], [PD.G, PD.E, 6], [BASES.blue, PD.B, 4], [PD.D, BASES.red, 4], [PD.A, PD.B, 5], [PD.D, PD.E, 5]])
    village({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }, n, 16, 40);
  // road signs
  roadSign('МОСКВА 1250', PD.B.x + 22, PD.B.z + 50, 0.4); roadSign('КРЕМЛЬ 2', PD.B.x - 30, PD.B.z - 52, 0.2);
  roadSign('ЗАВОД', PD.G.x - 40, PD.G.z + 44, -0.6); roadSign('СТАНЦИЯ', PD.A.x + 50, PD.A.z - 30, 1.2);
  roadSign('МОНАСТЫРЬ', PD.F.x + 40, PD.F.z + 30, 2.2); roadSign('СТАНЦИЯ', PD.E.x - 50, PD.E.z + 30, -1.9);
  buildBorder();
  buildFarPeaks();
}

// the border along the edge of the map: snowy fence with barbed wire and striped border posts
function buildBorder() {
  const posts = [], wires = [], poles = [], B = EDGE + 3;
  const sides = [[-B, -B, B, -B], [B, -B, B, B], [B, B, -B, B], [-B, B, -B, -B]];
  for (const [x1, z1, x2, z2] of sides) {
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.floor(len / 6);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, ax = lerp(x1, x2, t0), az = lerp(z1, z2, t0), bx = lerp(x1, x2, t1), bz = lerp(z1, z2, t1);
      const ha = heightAt(ax, az), hb = heightAt(bx, bz);
      posts.push({ x: ax, z: az, y: ha });
      wires.push({ ax, az, ha, bx, bz, hb });
      if (i % 10 === 5) poles.push({ x: ax + (x1 === x2 ? 0 : 0), z: az, y: ha });
    }
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const postGeo = new THREE.CylinderGeometry(0.07, 0.09, 2.2, 6).translate(0, 1.1, 0);
  const pm = new THREE.InstancedMesh(postGeo, MATS.darkWood, posts.length);
  posts.forEach((o, i) => { p.set(o.x, o.y, o.z); m4.compose(p, q.identity(), s); pm.setMatrixAt(i, m4); });
  pm.castShadow = true; scene.add(pm);
  const wireGeo = new THREE.BoxGeometry(1, 0.025, 0.025);
  const wm = new THREE.InstancedMesh(wireGeo, MATS.steel, wires.length * 3);
  let k = 0;
  for (const w of wires) for (const hgt of [0.7, 1.35, 2.0]) {
    const dx = w.bx - w.ax, dz = w.bz - w.az, dy = w.hb - w.ha, len = Math.hypot(dx, dy, dz);
    p.set((w.ax + w.bx) / 2, (w.ha + w.hb) / 2 + hgt, (w.az + w.bz) / 2);
    q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(dx, dy, dz).normalize());
    m4.compose(p, q, new THREE.Vector3(len, 1, 1)); wm.setMatrixAt(k++, m4);
  }
  scene.add(wm);
  // striped border posts, the way old Soviet borders were marked
  const pp = new Part();
  for (let i = 0; i < 8; i++) pp.box(0.3, 0.42, 0.3, i % 2 ? 0x2f7d3a : 0xc8302c, 0, 0.21 + i * 0.42, 0);
  pp.box(0.5, 0.5, 0.06, 0xd9ae4a, 0, 3.0, 0.18);
  const poleGeo = pp.build();
  const plm = new THREE.InstancedMesh(poleGeo, VEH_MAT, poles.length);
  poles.forEach((o, i) => { p.set(o.x, o.y, o.z); q.setFromAxisAngle(up, Math.atan2(-o.x, -o.z)); m4.compose(p, q, s); plm.setMatrixAt(i, m4); });
  plm.castShadow = true; scene.add(plm);
}
// huge snowy peaks far beyond the border, fading into the falling snow
function buildFarPeaks() {
  const fog = FOG_COLOR, mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  for (let i = 0; i < 34; i++) {
    const a = i / 34 * Math.PI * 2 + Math.sin(i * 7.3) * 0.08, r = 640 + (i % 3) * 110 + Math.sin(i * 3.1) * 40;
    const hgt = 170 + ((i * 37) % 9) * 22, rad = 150 + ((i * 53) % 7) * 18, x = Math.cos(a) * r, z = Math.sin(a) * r, k = 0.72 + (r - 640) / 900;
    const g = new THREE.ConeGeometry(rad, hgt, 9, 4), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    for (let j = 0; j < pos.count; j++) {
      const t = (pos.getY(j) + hgt / 2) / hgt, jag = Math.sin(j * 12.9898) * 0.08;
      const ridge = Math.sin(Math.atan2(pos.getZ(j), pos.getX(j)) * 5 + i) * 0.12 * (1 - t);
      pos.setX(j, pos.getX(j) * (1 + jag + ridge)); pos.setZ(j, pos.getZ(j) * (1 - jag + ridge)); if (t > 0.05 && t < 0.98) pos.setY(j, pos.getY(j) + Math.sin(j * 4.1) * hgt * 0.04);
      const c = new THREE.Color(t > 0.5 + jag ? 0xf3f6fa : 0x6a717c).lerp(fog, Math.min(0.96, k + (1 - t) * 0.22));
      col[j * 3] = c.r; col[j * 3 + 1] = c.g; col[j * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, mat); m.position.set(x, hgt / 2 - 150, z); m.renderOrder = -5; scene.add(m);
  }
}
// ---------- falling snow ----------
let snowfall = null;
function buildSnowfall() {
  const tex = canvasTex(32, 32, (g) => {
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  });
  tex.magFilter = THREE.LinearFilter;
  const layer = (n, size, opacity, box) => {
    const pos = new Float32Array(n * 3), spd = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * box; pos[i * 3 + 1] = (Math.random() - 0.5) * box * 0.6; pos[i * 3 + 2] = (Math.random() - 0.5) * box; spd[i] = 1.4 + Math.random() * 1.6; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ size: DESERT ? size * 0.6 : size, map: tex, transparent: true, opacity: DESERT ? opacity * 0.55 : opacity, depthWrite: false, color: DESERT ? 0xe2c590 : 0xffffff, fog: true }));
    m.frustumCulled = false; scene.add(m);
    return { m, pos, spd, box, n };
  };
  snowfall = DESERT ? [layer(LITE ? 500 : 1200, 0.16, 0.95, 60)] : [layer(LITE ? 1100 : 2600, 0.16, 0.95, 70), layer(LITE ? 120 : 260, 0.5, 0.45, 18)];   // fine snow, and big soft flakes right next to you
}
function updateSnowfall(dt) {
  if (!SNOW && !DESERT) return;
  if (!snowfall) buildSnowfall();
  for (const c of chimneys) { c.t -= dt; if (c.t <= 0 && camera.position.distanceTo(c) < (c.small ? 140 : 400)) { c.t = c.small ? 0.7 : 0.35; smokePuff(new THREE.Vector3(c.x + rand(-0.3, 0.3), c.y, c.z + rand(-0.3, 0.3)), c.small ? 0x9a9690 : 0x6f6c68, c.small ? 0.7 : 2.2, c.small ? 4 : 6, c.small ? 1.2 : 2.5); } }
  const t = performance.now() / 1000, wind = DESERT ? 7 + Math.sin(t * 0.3) * 3 : Math.sin(t * 0.21) * 2.2 + 1.5, fall = DESERT ? 0.15 : 1;
  const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  for (const L of snowfall) {
    const P = L.pos, h = L.box / 2, hy = L.box * 0.3;
    for (let i = 0; i < L.n; i++) {
      const j = i * 3;
      P[j + 1] -= L.spd[i] * dt * fall; P[j] += (wind + Math.sin(t * 1.3 + i) * 0.6) * dt; P[j + 2] += Math.cos(t * 1.1 + i * 0.7) * 0.5 * dt;
      // keep every flake in a box around the camera, wrapping round as you move
      let rx = P[j] - cx, ry = P[j + 1] - cy, rz = P[j + 2] - cz;
      if (rx > h) P[j] -= L.box; else if (rx < -h) P[j] += L.box;
      if (rz > h) P[j + 2] -= L.box; else if (rz < -h) P[j + 2] += L.box;
      if (ry < -hy) P[j + 1] += hy * 2; else if (ry > hy) P[j + 1] -= hy * 2;
    }
    L.m.geometry.attributes.position.needsUpdate = true;
  }
}

// ===================== the desert map's extras =====================
function buildDesertExtras() {
  // palm trees around the oases and along the town edge
  const palms = [];
  const tryPalm = (x, z) => { if (pathDist(x, z) < 5 || waterDepth(x, z) > 0) return; for (const o of nearbyColliders(x, z)) if (o.kind === 'box' && x > o.minX - 2 && x < o.maxX + 2 && z > o.minZ - 2 && z < o.maxZ + 2) return; palms.push({ x, z, y: heightAt(x, z), s: rand(0.85, 1.25), r: rand(0, 6.28), lean: rand(-0.25, 0.25) }); addCircle(x, z, 0.4, heightAt(x, z) + 8); };
  for (const L of LAKES) for (let i = 0; i < 26; i++) { const a = rand(0, 6.28), r = L.r + rand(2, 18); tryPalm(L.x + Math.cos(a) * r, L.z + Math.sin(a) * r); }
  for (let i = 0; i < 30; i++) { const a = rand(0, 6.28), r = rand(62, 80); tryPalm(Math.cos(a) * r, Math.sin(a) * r); }
  const trunk = new Part(), crown = new Part();
  for (let i = 0; i < 6; i++) trunk.cyl(0.32 - i * 0.03, 0.36 - i * 0.03, 1.5, i % 2 ? 0x8a6a45 : 0x7a5c3a, Math.sin(i * 0.35) * 0.4, 0.75 + i * 1.45, 0);
  // each frond is one smooth arc: it rises from the top of the trunk, then droops, wide in the middle
  const FR = [[0.25, 9.15, 0.3], [1.3, 9.5, 0.62], [2.4, 9.4, 0.72], [3.3, 8.9, 0.55], [4.0, 8.1, 0.32], [4.4, 7.4, 0.12]];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + (i % 2) * 0.13, c = i % 3 === 0 ? 0x6a9440 : i % 3 === 1 ? 0x557f34 : 0x48702c;
    const k = i % 2 ? 0.82 : 1, up = i % 2 ? 0.35 : 0;        // every other frond is shorter and higher
    for (let j = 0; j < FR.length - 1; j++) {
      const [r0, y0, w0] = FR[j], [r1, y1, w1] = FR[j + 1];
      const R0 = r0 * k, R1 = r1 * k, Y0 = y0 + up * (1 - j / 5), Y1 = y1 + up * (1 - (j + 1) / 5);
      const len = Math.hypot(R1 - R0, Y1 - Y0), pitch = Math.atan2(Y0 - Y1, R1 - R0);
      const g = new THREE.BoxGeometry((w0 + w1) / 2, 0.05, len + 0.12); g.rotateX(pitch);
      const rm = (R0 + R1) / 2, cy = (Y0 + Y1) / 2 - 0.35;
      crown.add(g, c, 0.4 + Math.sin(a) * rm, cy, Math.cos(a) * rm, 0, a, 0);
      // a thin rib down the middle of the frond
      const rib = new THREE.BoxGeometry(0.06, 0.08, len + 0.12); rib.rotateX(pitch);
      crown.add(rib, 0x7a8a3a, 0.4 + Math.sin(a) * rm, cy + 0.03, Math.cos(a) * rm, 0, a, 0);
    }
  }
  crown.ball(0.45, 0x6b4a2b, 0.4, 8.75, 0); crown.ball(0.3, 0x5a3d22, 0.75, 8.6, 0.2); crown.ball(0.3, 0x5a3d22, 0.1, 8.62, -0.25);   // coconuts
  const tg = trunk.build(), cg = crown.build();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  for (const geo of [tg, cg]) {
    const im = new THREE.InstancedMesh(geo, VEH_MAT, palms.length);
    palms.forEach((t, i) => { q.setFromEuler(e.set(0, t.r, t.lean)); sc.setScalar(t.s); p.set(t.x, t.y, t.z); m4.compose(p, q, sc); im.setMatrixAt(i, m4); });
    im.castShadow = true; im.receiveShadow = true; scene.add(im);
  }
  // nomad camps and a market by the town
  for (const [x, z] of [[-150, 180], [160, -200], [-330, -120], [330, 110]]) { const s = snowSpot(x, z, 6, 30); if (s) { tent(s[0], s[1], true); tent(s[0] + 7, s[1] + 3, false); addCrateStack(s[0] - 4, s[1] + 6, 3); } }
  // sandstone pillars and arches standing in the dunes
  const rock = new THREE.MeshLambertMaterial({ color: 0xb8714a });
  for (let i = 0; i < 18; i++) {
    const x = rand(-EDGE + 30, EDGE - 30), z = rand(-EDGE + 30, EDGE - 30);
    if (pathDist(x, z) < 18 || Math.hypot(x, z) < 90) continue;
    let near = false; for (const q2 of POINTS_DEF) if (Math.hypot(x - q2.x, z - q2.z) < 50) near = true; if (near) continue;
    const h = rand(9, 20), w = rand(3, 6);
    if (i % 3 === 0) { addBlock(x - w, z, w, h, w, rock); addBlock(x + w, z, w, h, w, rock); addBlock(x, z, w * 3, w * 0.9, w, rock, { y: heightAt(x, z) + h - w * 0.9 }); }   // an arch
    else addBlock(x, z, w, h, w * rand(0.8, 1.3), rock);
  }
}
