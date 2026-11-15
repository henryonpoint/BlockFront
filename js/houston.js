// ===================== houston.js : the Houston city map =====================
// A flat, green, sprawling city inspired by Houston, Texas:
//   C  Downtown: a cluster of glass skyscrapers around a plaza with big HOUSTON letters
//   A  Medical Center: white hospital towers joined by sky bridges, with a rooftop helipad
//   B  The Dome: a huge domed stadium in a sea of parking
//   D  The Heights: old bungalows on leafy streets, with a water tower
//   E  Ship Channel: oil refinery tanks, a flare stack, pipes and container cranes
//   F  Galleria: a long glass-roofed mall next to a tall office tower
//   G  Space Center: a giant rocket standing on its pad and mission control
// The 610 Loop circles downtown, I-45 and I-10 cross the city, and Buffalo Bayou winds past the north side.
if (HOUSTON) {
  // parking lots are painted onto the ground, so they are listed before the ground is coloured
  H_LOTS.push({ x: PD.B.x + 10, z: PD.B.z + 60, hw: 78, hd: 70 }, { x: PD.F.x + 20, z: PD.F.z + 40, hw: 40, hd: 22 }, { x: PD.G.x - 20, z: PD.G.z + 45, hw: 30, hd: 18 });
}

// ---------- textures ----------
function hWinTex(base, glass, frame, lit) {
  // one floor tall, two windows wide; repeated across each face by the face size
  return canvasTex(64, 64, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 2; i++) {
      const gr = g.createLinearGradient(0, 8, 0, 54); gr.addColorStop(0, glass[0]); gr.addColorStop(1, glass[1]);
      g.fillStyle = gr; g.fillRect(4 + i * 32, 8, 24, 46);
      if (lit && Math.random() < 0.15) { g.fillStyle = 'rgba(255,236,170,0.55)'; g.fillRect(4 + i * 32, 8, 24, 46); }
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(6 + i * 32, 10, 6, 40);
    }
    g.fillStyle = frame; g.fillRect(0, 58, 64, 6);
  });
}
let HT = null;
function hTex() {
  if (HT) return HT;
  const lin = t => { t.magFilter = THREE.LinearFilter; return t; };
  HT = {
    blue: lin(hWinTex('#3a5a7a', ['#9cc8ee', '#4a7aa8'], '#2a4460', true)),
    dark: lin(hWinTex('#1d2730', ['#3c5466', '#18242e'], '#11181e', true)),
    green: lin(hWinTex('#3a6260', ['#a0dcd2', '#3a8a80'], '#2a4a48', true)),
    stone: lin(hWinTex('#c9bba0', ['#4f6a80', '#26384a'], '#a89a80', false)),
    white: lin(hWinTex('#e8e6e0', ['#7aa0bc', '#3a5a74'], '#c8c6c0', false)),
    brick: lin(hWinTex('#8a4a36', ['#5a7488', '#2a3c4c'], '#6a3828', false)),
    roof: lin(canvasTex(64, 64, g => { g.fillStyle = '#6a6c70'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 90; i++) { const v = 90 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v},${v},${v + 4})`; g.fillRect(Math.random() * 64, Math.random() * 64, 3, 3); } })),
    road: lin(canvasTex(64, 128, g => { g.fillStyle = '#3a3b3e'; g.fillRect(0, 0, 64, 128); for (let i = 0; i < 300; i++) { const v = 50 + Math.random() * 25 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * 64, Math.random() * 128, 2, 2); } g.fillStyle = '#e8c840'; g.fillRect(30, 0, 4, 64); })),
    freeway: lin(canvasTex(128, 128, g => { g.fillStyle = '#404246'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 500; i++) { const v = 56 + Math.random() * 26 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); } g.fillStyle = '#f2f2f2'; for (const x of [30, 96]) g.fillRect(x, 0, 3, 56); g.fillStyle = '#e8c840'; g.fillRect(61, 0, 3, 128); g.fillRect(65, 0, 3, 128); g.fillStyle = '#f2f2f2'; g.fillRect(2, 0, 3, 128); g.fillRect(123, 0, 3, 128); })),
  };
  return HT;
}
const _hMats = {};
function hMat(key) { if (!_hMats[key]) { const t = hTex()[key]; _hMats[key] = new THREE.MeshLambertMaterial({ map: t }); } return _hMats[key]; }
// a box whose window texture repeats once per floor, whatever its size
function towerGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) { const [a, b] = faces[f]; for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * a / 7, uv.getY(i) * b / 3.6); } }
  return g;
}
function towerBox(x, z, w, h, d, skin, y0) {
  const base = y0 !== undefined ? y0 : groundMin(x, z, w / 2, d / 2) - 0.3;
  const m = addBlock(x, z, w, h, d, hMat(skin), { y: base });
  m.geometry.dispose(); m.geometry = towerGeo(w, h, d);
  m.material = [hMat(skin), hMat(skin), hMat('roof'), hMat('roof'), hMat(skin), hMat(skin)];
  m.userData.static = false;
  if (base + h > 25) TALL.push({ x, z, hw: w / 2, hd: d / 2, top: base + h + 6 });
  return { top: base + h, base };
}
function solidCyl(x, z, r, h, mat, y0) {
  const y = y0 !== undefined ? y0 : heightAt(x, z);
  addMesh(new THREE.CylinderGeometry(r, r, h, 24), mat, x, y + h / 2, z);
  addCircle(x, z, r, y + h);
  const s = r * 0.8; const bb = { kind: 'box', minX: x - s, maxX: x + s, minZ: z - s, maxZ: z + s, minY: y, maxY: y + h, los: true }; obstacles.push(bb); gridAdd(bb, bb.minX, bb.maxX, bb.minZ, bb.maxZ);
  const b = new CANNON.Body({ mass: 0, shape: new CANNON.Cylinder(r, r, h, 12) }); b.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); b.position.set(x, y + h / 2, z); world.addBody(b);
  if (y + h > 25) TALL.push({ x, z, hw: r, hd: r, top: y + h + 6 });
}
function hSign(text, x, y, z, w, h, ry, bg = '#1d5e3a', fg = '#ffffff', post = true) {
  const t = canvasTex(512, Math.round(512 * h / w), (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H); g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(10, 10, W - 20, H - 20);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = text.split('\n'); const fs = Math.min(H * 0.62 / lines.length, W * 1.6 / Math.max(...lines.map(l => l.length)));
    g.font = `700 ${fs}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * fs * 1.15));
  });
  t.magFilter = THREE.LinearFilter;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
  if (post) { const gy = heightAt(x, z); for (const s of [-1, 1]) addMesh(new THREE.CylinderGeometry(0.12, 0.12, y - gy, 6), MATS.steel || new THREE.MeshLambertMaterial({ color: 0x777777 }), x + Math.cos(ry) * s * w * 0.4, gy + (y - gy) / 2 - h / 2, z - Math.sin(ry) * s * w * 0.4); }
  return m;
}

// ---------- roads ----------
function hRoads() {
  const T = hTex();
  const strip = (a, b, w, tex, y, perM) => {
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz);
    const g = new THREE.PlaneGeometry(w, L); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * L / perM);
    const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: t, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2); m.rotation.y = Math.atan2(dx, dz); m.receiveShadow = true; scene.add(m);
  };
  // freeways: wide, with a concrete median and lamp posts
  for (const [a, b, name] of H_FREEWAYS) {
    strip(a, b, 17, T.freeway, 2.06, 16);
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
    const med = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, L), new THREE.MeshLambertMaterial({ color: 0xbdbab2 }));
    med.position.set((a.x + b.x) / 2, 2.4, (a.z + b.z) / 2); med.rotation.y = Math.atan2(dx, dz); med.castShadow = true; scene.add(med);
    for (let s = 30; s < L - 20; s += 60) { const x = a.x + ux * s, z = a.z + uz * s; addMesh(new THREE.CylinderGeometry(0.1, 0.13, 9, 6), MATS.steel, x, 6.5, z); const arm = addMesh(new THREE.BoxGeometry(0.15, 0.15, 3), MATS.steel, x, 11, z); arm.rotation.y = Math.atan2(dx, dz) + Math.PI / 2; }
    // big green signs across the freeway
    for (let s = 90; s < L - 60; s += 260) {
      const x = a.x + ux * s, z = a.z + uz * s, ry = Math.atan2(dx, dz);
      const gx = -uz, gz = ux;
      for (const k of [-1, 1]) addMesh(new THREE.BoxGeometry(0.35, 8, 0.35), MATS.steel, x + gx * k * 9.5, 6, z + gz * k * 9.5);
      const beam = addMesh(new THREE.BoxGeometry(19.5, 0.4, 0.4), MATS.steel, x, 9.6, z); beam.rotation.y = ry + 0;
      beam.rotation.y = Math.atan2(gx, gz) + Math.PI / 2;
      const label = name === '610' ? '610 LOOP' : name === 'I-45' ? (uz < 0 ? 'I-45 NORTH\nDallas' : 'I-45 SOUTH\nGalveston') : (ux > 0 ? 'I-10 EAST\nBeaumont' : 'I-10 WEST\nSan Antonio');
      hSign(label, x + gx * 3.5, 8.3, z + gz * 3.5, 7, 2.4, ry + Math.PI, '#1d6b3a', '#ffffff', false);
    }
  }
  // city streets
  for (const [a, b] of PATHS.slice(H_FREEWAYS.length)) strip(a, b, 9, T.road, 2.04, 8);
  // bridges where roads cross the bayou
  for (const [a, b] of PATHS) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 4);
    for (let k = 0; k <= n; k++) {
      const x = lerp(a.x, b.x, k / n), z = lerp(a.z, b.z, k / n);
      if (bayouDist(x, z) < 3) { hBridge(x, z, Math.atan2(b.x - a.x, b.z - a.z), H_FREEWAYS.some(f => f[0] === a && f[1] === b) ? 19 : 11); break; }
    }
  }
}
function hBridge(x, z, ry, w) {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, 30), new THREE.MeshLambertMaterial({ color: 0xa8a49c })); deck.position.y = -0.25; g.add(deck);
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 30), new THREE.MeshLambertMaterial({ color: 0xc8c4bc })); rail.position.set(s * (w / 2 - 0.2), 0.5, 0); g.add(rail);
    for (let i = -1; i <= 1; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 6, 1.2), new THREE.MeshLambertMaterial({ color: 0x8e8a82 })); p.position.set(s * (w / 2 - 1), -3.5, i * 9); g.add(p); }
  }
  g.position.set(x, 2.06, z); g.rotation.y = ry; g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(g);
}

// ---------- districts ----------
function hDowntown() {
  // blocks between the grid streets; the middle block is the plaza with the control point
  const skins = ['blue', 'dark', 'green', 'stone', 'blue', 'brick', 'white', 'green'];
  const hsh = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
  for (const bx of [-120, -60, 0, 60, 120]) for (const bz of [-120, -60, 0, 60, 120]) {
    if (bx === 0 && bz === 0) continue;
    const ring = Math.max(Math.abs(bx), Math.abs(bz)) / 60;                 // 1 next to the plaza, 2 at the edge
    const skin = skins[Math.floor(hsh(bx, bz) * skins.length)];
    const tall = ring === 1 ? rand(65, 98) : rand(28, 58);
    const w = rand(24, 34), d = rand(24, 34), kind = Math.floor(hsh(bz + 3, bx - 7) * 5);
    if (kind === 0) {             // stepped tower with a crown
      const a = towerBox(bx, bz, w, tall * 0.55, d, skin);
      const b = towerBox(bx, bz, w * 0.72, tall * 0.3, d * 0.72, skin, a.top);
      const c = towerBox(bx, bz, w * 0.45, tall * 0.15, d * 0.45, skin, b.top);
      addMesh(new THREE.ConeGeometry(w * 0.3, 10, 4), new THREE.MeshLambertMaterial({ color: 0x3a4048 }), bx, c.top + 5, bz).rotation.y = Math.PI / 4;
    } else if (kind === 1) {      // round glass tower
      solidCyl(bx, bz, Math.min(w, d) * 0.45, tall, new THREE.MeshLambertMaterial({ map: (() => { const t = hTex().green.clone(); t.needsUpdate = true; t.repeat.set(9, tall / 3.6); return t; })() }));
      addMesh(new THREE.CylinderGeometry(Math.min(w, d) * 0.47, Math.min(w, d) * 0.47, 1.2, 24), new THREE.MeshLambertMaterial({ color: 0x2a3036 }), bx, heightAt(bx, bz) + tall + 0.6, bz);
    } else if (kind === 2) {      // tall slab with a spire
      const a = towerBox(bx, bz, w, tall, d * 0.7, skin);
      addMesh(new THREE.CylinderGeometry(0.2, 0.6, 18, 6), MATS.steel, bx, a.top + 9, bz);
      addMesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030 }), bx, a.top + 18.4, bz);
    } else {                      // plain tower with rooftop machinery
      const a = towerBox(bx, bz, w, tall, d, skin);
      for (let i = 0; i < 3; i++) addMesh(new THREE.BoxGeometry(rand(3, 6), rand(1.5, 3), rand(3, 6)), new THREE.MeshLambertMaterial({ color: 0x8a8c90 }), bx + rand(-w / 4, w / 4), a.top + 1, bz + rand(-d / 4, d / 4));
      if (kind === 4) { addMesh(new THREE.CylinderGeometry(4.5, 4.5, 0.3, 16), new THREE.MeshLambertMaterial({ color: 0x3a3a3a }), bx, a.top + 0.2, bz); hSign('H', bx, a.top + 0.36, bz, 5, 5, 0, '#3a3a3a', '#ffffff', false).rotation.x = -Math.PI / 2; }
    }
    // a lobby band at street level
    addMesh(new THREE.BoxGeometry(w + 0.6, 4, d + 0.6), new THREE.MeshLambertMaterial({ color: 0x2a2e34 }), bx, heightAt(bx, bz) + 2, bz);
  }
  // the plaza: big letters, a fountain, trees and benches
  const y = heightAt(0, 0);
  const letters = 'HOUSTON';
  letters.split('').forEach((ch, i) => {
    const t = canvasTex(128, 128, (g) => { g.clearRect(0, 0, 128, 128); g.fillStyle = '#ffffff'; g.font = '800 120px system-ui, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 70); });
    t.magFilter = THREE.LinearFilter;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: 0xd8262a }));
    m.position.set(-8 + i * 2.7, y + 1.4, 24); scene.add(m);
  });
  addMesh(new THREE.BoxGeometry(20, 0.3, 1.2), new THREE.MeshLambertMaterial({ color: 0x5a5a5a }), 0, y + 0.15, 24);
  addMesh(new THREE.CylinderGeometry(4, 4.4, 0.8, 24), new THREE.MeshLambertMaterial({ color: 0xb8b2a6 }), -22, y + 0.4, -20);
  addMesh(new THREE.CylinderGeometry(3.7, 3.7, 0.1, 24), waterMat, -22, y + 0.82, -20);
  addMesh(new THREE.CylinderGeometry(0.4, 0.6, 2.2, 10), new THREE.MeshLambertMaterial({ color: 0xb8b2a6 }), -22, y + 1.5, -20);
  addCircle(-22, -20, 4.2, y + 0.8);
}
function hMedical() {
  const P = PD.A;
  const spots = [[-38, -30, 22, 40], [36, -32, 20, 32], [-40, 32, 24, 46], [34, 34, 18, 28]];
  const tops = [];
  for (const [ox, oz, w, h] of spots) { const t = towerBox(P.x + ox, P.z + oz, w, h, w * 0.8, 'white'); tops.push([P.x + ox, P.z + oz, t.top, w]); hSign('+', P.x + ox, t.top - 4, P.z + oz + w * 0.4 + 0.05, 4, 4, 0, '#d8262a', '#ffffff', false); }
  // sky bridges between the towers
  for (const [a, b] of [[0, 2], [1, 3]]) { const A = tops[a], B = tops[b]; const y = Math.min(A[2], B[2]) * 0.55; addMesh(new THREE.BoxGeometry(4, 3.5, Math.abs(A[1] - B[1]) - A[3] * 0.4), hMat('white'), (A[0] + B[0]) / 2, y, (A[1] + B[1]) / 2); }
  addMesh(new THREE.CylinderGeometry(6, 6, 0.4, 20), new THREE.MeshLambertMaterial({ color: 0x3a3a3a }), tops[2][0], tops[2][2] + 0.2, tops[2][1]);
  hSign('H', tops[2][0], tops[2][2] + 0.42, tops[2][1], 6, 6, 0, '#3a3a3a', '#ffffff', false).rotation.x = -Math.PI / 2;
  hSign('MEDICAL CENTER', P.x, heightAt(P.x, P.z + 22) + 3.4, P.z + 22, 9, 2, 0, '#20507a');
  for (let i = 0; i < 4; i++) addCar(P.x + rand(-20, 20), P.z + rand(16, 20), true, pick([0xffffff, 0xd8262a, 0x2a5aa8]));
}
function hDome() {
  const P = PD.B, cx = P.x + 10, cz = P.z + 80, y = heightAt(cx, cz), R = 46;
  // ring wall, then the big dome
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 1, 12, 48, 1, true), new THREE.MeshLambertMaterial({ color: 0xd8d4cc, side: THREE.DoubleSide }));
  wall.position.set(cx, y + 6, cz); wall.castShadow = true; scene.add(wall);
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; addMesh(new THREE.BoxGeometry(1.2, 13, 1.2), new THREE.MeshLambertMaterial({ color: 0xb8b4ac }), cx + Math.cos(a) * (R + 0.6), y + 6.5, cz + Math.sin(a) * (R + 0.6)); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0xeceae4, shininess: 40 }));
  dome.scale.y = 0.42; dome.position.set(cx, y + 12, cz); dome.castShadow = true; dome.receiveShadow = true; scene.add(dome);
  for (let i = 0; i < 16; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(R, 0.25, 4, 48, Math.PI), new THREE.MeshLambertMaterial({ color: 0xc0bcb4 })); rib.scale.set(1, 0.42, 1); rib.rotation.y = i / 16 * Math.PI; rib.position.set(cx, y + 12, cz); scene.add(rib); }
  addCircle(cx, cz, R + 1, y + 31);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const bb = { kind: 'box', minX: cx + Math.min(0, dx) * R * 0.7, maxX: cx + Math.max(0, dx) * R * 0.7, minZ: cz + Math.min(0, dz) * R * 0.7, maxZ: cz + Math.max(0, dz) * R * 0.7, minY: y, maxY: y + 30, los: true }; obstacles.push(bb); gridAdd(bb, bb.minX, bb.maxX, bb.minZ, bb.maxZ); }
  const b = new CANNON.Body({ mass: 0, shape: new CANNON.Cylinder(R, R, 30, 16) }); b.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); b.position.set(cx, y + 15, cz); world.addBody(b);
  TALL.push({ x: cx, z: cz, hw: R, hd: R, top: y + 38 });
  hSign('THE DOME', cx, y + 9, cz - R - 1.3, 14, 3.4, Math.PI, '#b8262a', '#ffffff', false);
  // parking: rows of cars and tall light poles
  for (let r = 0; r < 5; r++) for (let i = 0; i < 9; i++) if (Math.random() < 0.55) {
    const x = P.x - 50 + i * 9 + rand(-1, 1), z = P.z + 20 + r * 6 * (r % 2 ? 1 : 1) - 40;
    if (Math.hypot(x - P.x, z - P.z) > 20 && Math.hypot(x - cx, z - cz) > R + 6 && pathDist(x, z) > 6) addCar(x, z, false, pick([0xffffff, 0x222222, 0xd8262a, 0x2a5aa8, 0x8a8a8a, 0xc8b040]));
  }
  for (const [ox, oz] of [[-60, 20], [70, 20], [-60, 130], [70, 130]]) { const x = cx + ox, z = P.z + oz - 20; addMesh(new THREE.CylinderGeometry(0.3, 0.45, 22, 8), MATS.steel, x, heightAt(x, z) + 11, z); addMesh(new THREE.BoxGeometry(3, 1.4, 1), new THREE.MeshBasicMaterial({ color: 0xfff6d8 }), x, heightAt(x, z) + 22.4, z); }
}
function hHeights() {
  const P = PD.D;
  village(P, 16, 22, 70);
  // a tall old water tower
  const x = P.x + 34, z = P.z + 30, y = heightAt(x, z);
  for (const [dx, dz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) addMesh(new THREE.CylinderGeometry(0.3, 0.3, 18, 6), MATS.steel, x + dx, y + 9, z + dz);
  addMesh(new THREE.CylinderGeometry(5, 5, 6, 20), new THREE.MeshLambertMaterial({ color: 0xd8d4c8 }), x, y + 21, z);
  addMesh(new THREE.ConeGeometry(5.3, 2.5, 20), new THREE.MeshLambertMaterial({ color: 0x8a8c90 }), x, y + 25.2, z);
  hSign('THE HEIGHTS', x, y + 21, z + 5.05, 7, 1.6, 0, '#d8d4c8', '#20507a', false);
  addCircle(x, z, 3.2, y + 24);
  hSign('THE HEIGHTS', P.x, heightAt(P.x, P.z + 22) + 3.4, P.z + 22, 8, 2, 0, '#7a3a28');
}
const H_FLARES = [];
function hShipChannel() {
  const P = PD.E;
  // storage tanks
  for (let i = 0; i < 6; i++) { const x = P.x - 50 + (i % 3) * 22, z = P.z + (i < 3 ? -42 : 42); if (pathDist(x, z) > 12) fuelTank(x, z); }
  for (let i = 0; i < 3; i++) { const x = P.x + 45, z = P.z - 30 + i * 24; if (pathDist(x, z) > 10) solidCyl(x, z, 6, 9, new THREE.MeshLambertMaterial({ color: 0xe8e6e0 })); }
  // distillation columns, pipes and a flare stack with a flame
  for (let i = 0; i < 3; i++) { const x = P.x + 30 + i * 6, z = P.z + 46; solidCyl(x, z, 1.4, 22 + i * 6, new THREE.MeshLambertMaterial({ color: 0xb8bcc0 })); addMesh(new THREE.TorusGeometry(1.6, 0.18, 4, 12), MATS.steel, x, heightAt(x, z) + 10 + i * 3, z).rotation.x = Math.PI / 2; }
  const pr = new THREE.Mesh(new THREE.BoxGeometry(60, 0.6, 0.6), new THREE.MeshLambertMaterial({ color: 0x8a6a2a })); pr.position.set(P.x - 10, heightAt(P.x, P.z + 60) + 4, P.z + 62); scene.add(pr);
  for (let i = 0; i < 6; i++) addMesh(new THREE.BoxGeometry(0.4, 4, 0.4), MATS.steel, P.x - 38 + i * 11, heightAt(P.x, P.z + 62) + 2, P.z + 62);
  const fx = P.x + 60, fz = P.z + 60, fy = heightAt(fx, fz);
  solidCyl(fx, fz, 0.9, 34, new THREE.MeshLambertMaterial({ color: 0xc83a2a }));
  const flame = new THREE.Mesh(new THREE.ConeGeometry(1.4, 5, 8), new THREE.MeshBasicMaterial({ color: 0xff9a2a, transparent: true, opacity: 0.85 })); flame.position.set(fx, fy + 37, fz); scene.add(flame);
  H_FLARES.push({ m: flame, x: fx, y: fy + 39, z: fz, t: 0 });
  // containers and a gantry crane by the channel
  for (let i = 0; i < 10; i++) container(P.x - 60 + (i % 5) * 7, P.z - 75 + Math.floor(i / 5) * 3.2, true, pick([0xc0392b, 0x2a6ab8, 0x2e8b57, 0xd8a020, 0x8a8a8a]));
  const cx = P.x - 30, cz = P.z - 90, cy = heightAt(cx, cz);
  for (const s of [-1, 1]) for (const t of [-1, 1]) addMesh(new THREE.BoxGeometry(1, 26, 1), new THREE.MeshLambertMaterial({ color: 0xd8a020 }), cx + s * 8, cy + 13, cz + t * 6);
  addMesh(new THREE.BoxGeometry(18, 1.5, 34), new THREE.MeshLambertMaterial({ color: 0xd8a020 }), cx, cy + 26, cz - 6);
  hSign('SHIP CHANNEL', P.x, heightAt(P.x, P.z + 22) + 3.4, P.z + 22, 8, 2, 0, '#20507a');
}
function hGalleria() {
  const P = PD.F, y = heightAt(P.x, P.z - 40);
  // the long mall with a glass roof
  addBlock(P.x, P.z - 48, 90, 12, 30, new THREE.MeshLambertMaterial({ color: 0xd8d2c4 }), { y: y - 0.3 });
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 88, 16, 1, false, 0, Math.PI), new THREE.MeshPhongMaterial({ color: 0x9ac8e0, transparent: true, opacity: 0.75, shininess: 90 }));
  roof.rotation.z = Math.PI / 2; roof.rotation.y = 0; roof.position.set(P.x, y + 11.7, P.z - 48); scene.add(roof);
  hSign('GALLERIA', P.x, y + 9, P.z - 32.9, 14, 3, 0, '#2a2e34', '#ffffff', false);
  // the tall office tower with a beacon
  const tx = P.x + 52, tz = P.z + 30, t = towerBox(tx, tz, 22, 92, 22, 'blue');
  addMesh(new THREE.ConeGeometry(11.5, 14, 4), new THREE.MeshLambertMaterial({ color: 0x2a4a66 }), tx, t.top + 7, tz).rotation.y = Math.PI / 4;
  addMesh(new THREE.SphereGeometry(0.8, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), tx, t.top + 14.5, tz);
  for (let i = 0; i < 12; i++) addCar(P.x + 5 + (i % 6) * 8, P.z + 34 + Math.floor(i / 6) * 8, false, pick([0xffffff, 0x222222, 0xd8262a, 0x2a5aa8, 0x8a8a8a]));
}
function hSpace() {
  const P = PD.G, rx = P.x + 34, rz = P.z - 40, y = heightAt(rx, rz);
  // launch pad, tower and the giant rocket
  addBlock(rx, rz, 22, 2, 22, new THREE.MeshLambertMaterial({ color: 0x8a8a86 }), { y: y - 0.5 });
  const W = new THREE.MeshLambertMaterial({ color: 0xf2f2f0 }), K = new THREE.MeshLambertMaterial({ color: 0x1d1d22 });
  const stages = [[5, 22, W], [5, 1.2, K], [4.2, 18, W], [4.2, 1, K], [3.4, 12, W]];
  let h = y + 1.5;
  for (const [r, L, m] of stages) { addMesh(new THREE.CylinderGeometry(r, r, L, 24), m, rx, h + L / 2, rz); h += L; }
  addMesh(new THREE.ConeGeometry(3.4, 8, 24), W, rx, h + 4, rz); addMesh(new THREE.CylinderGeometry(0.25, 0.25, 6, 6), W, rx, h + 11, rz);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; const f = addMesh(new THREE.BoxGeometry(0.4, 7, 3), K, rx + Math.cos(a) * 5.6, y + 5, rz + Math.sin(a) * 5.6); f.rotation.y = -a; }
  for (let i = 0; i < 6; i++) { const s = canvasTex(64, 16, g => { g.fillStyle = '#f2f2f0'; g.fillRect(0, 0, 64, 16); g.fillStyle = '#1d1d22'; g.font = '700 13px system-ui, Arial'; g.textAlign = 'center'; g.fillText('USA', 32, 13); }); }
  solidCyl(rx, rz, 5, h - y + 8, new THREE.MeshBasicMaterial({ visible: false }));
  // service tower
  for (let k = 0; k < 4; k++) addMesh(new THREE.BoxGeometry(0.6, 62, 0.6), new THREE.MeshLambertMaterial({ color: 0xc83a2a }), rx + 11 + (k % 2) * 4, y + 31, rz - 2 + Math.floor(k / 2) * 4);
  for (let i = 0; i < 12; i++) addMesh(new THREE.BoxGeometry(4.6, 0.3, 4.6), new THREE.MeshLambertMaterial({ color: 0xc83a2a }), rx + 13, y + 5 + i * 5, rz);
  addCircle(rx + 13, rz, 3.5, y + 62);
  // mission control and a big dish
  addBlock(P.x - 40, P.z - 36, 30, 9, 18, new THREE.MeshLambertMaterial({ color: 0xe8e6e0 }), { y: heightAt(P.x - 40, P.z - 36) - 0.3 });
  hSign('MISSION CONTROL', P.x - 40, heightAt(P.x - 40, P.z - 36) + 7, P.z - 26.9, 12, 1.8, 0, '#20507a', '#ffffff', false);
  const dx = P.x - 30, dz = P.z + 40, dy = heightAt(dx, dz);
  addMesh(new THREE.CylinderGeometry(0.6, 0.9, 8, 8), MATS.steel, dx, dy + 4, dz);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(7, 20, 8, 0, Math.PI * 2, 0, 1.0), new THREE.MeshLambertMaterial({ color: 0xf0f0f0, side: THREE.DoubleSide }));
  dish.position.set(dx, dy + 12, dz); dish.rotation.x = Math.PI * 0.8; scene.add(dish); addCircle(dx, dz, 1.2, dy + 9);
  hSign('SPACE CENTER', P.x, heightAt(P.x, P.z + 22) + 3.4, P.z + 22, 9, 2, 0, '#1d2a5a');
}
function updateHouston(dt) {
  for (const f of H_FLARES) {
    f.t -= dt; f.m.scale.set(1 + Math.sin(simTime * 13) * 0.12, 1 + Math.sin(simTime * 9.7) * 0.2, 1);
    if (f.t <= 0) { f.t = 0.25; smokePuff(new THREE.Vector3(f.x, f.y + 2, f.z), 0x4a4a4a, 1.2, 4, 3); }
  }
}
function waterSpots() {
  if (!HOUSTON) return LAKES;
  const out = LAKES.slice();
  for (let i = 1; i < BAYOU.length - 1; i += 2) out.push({ x: BAYOU[i].x, z: BAYOU[i].z, r: 7 });
  return out;
}
function buildHoustonExtras() {
  hRoads(); hDowntown(); hMedical(); hDome(); hHeights(); hShipChannel(); hGalleria(); hSpace();
  if (typeof buildSuburbs === 'function') buildSuburbs();
}
