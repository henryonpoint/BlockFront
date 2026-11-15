// ===================== world.js : terrain, buildings, nature, props, control points =====================
const obstacles = [];   // axis aligned boxes
const solidMeshes = []; // meshes bullets can hit
const circles = [];     // round colliders (trees, rocks, tanks)
const CG = 16, colGrid = new Map();
function cgKey(cx, cz) { return (cx + 64) * 256 + (cz + 64); }
function gridAdd(o, minX, maxX, minZ, maxZ) {
  for (let cx = Math.floor(minX / CG); cx <= Math.floor(maxX / CG); cx++)
    for (let cz = Math.floor(minZ / CG); cz <= Math.floor(maxZ / CG); cz++) {
      const k = cgKey(cx, cz); let a = colGrid.get(k); if (!a) colGrid.set(k, a = []); a.push(o);
    }
}
// reuses a few arrays instead of making a new one on every call (results are always used right away)
const _ncRing = [[], [], [], [], [], [], [], []]; let _ncI = 0;
function nearbyColliders(x, z) {
  const out = _ncRing[_ncI = (_ncI + 1) & 7]; out.length = 0; const cx = Math.floor(x / CG), cz = Math.floor(z / CG);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const a = colGrid.get(cgKey(cx + i, cz + j)); if (a) for (const o of a) out.push(o); }
  return out;
}
function addCircle(x, z, r, top) { const c = { kind: 'circ', x, z, r, top, base: heightAt(x, z) }; circles.push(c); gridAdd(c, x - r, x + r, z - r, z + r); return c; }

// ---------- textures ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.anisotropy = 4; return t;
}
function texRepeat(t, rx, ry) { const c = t.clone(); c.needsUpdate = true; c.repeat.set(rx, ry); return c; }
function speckle(g, w, h, amt) {
  for (let i = 0; i < w * h / 5; i++) {
    g.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${Math.random() * amt})` : `rgba(255,255,255,${Math.random() * amt})`;
    g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 2, 2);
  }
}
function wallTex(base) {
  return canvasTex(64, 64, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 64, 64); speckle(g, 64, 64, 0.08);
    g.fillStyle = '#f2f2ee'; g.fillRect(17, 13, 30, 34);
    g.fillStyle = '#2e4a6e'; g.fillRect(20, 16, 24, 28);
    g.fillStyle = '#5b7fa8'; g.fillRect(20, 16, 11, 13); g.fillRect(33, 31, 11, 13);
    g.fillStyle = '#f2f2ee'; g.fillRect(31, 16, 2, 28); g.fillRect(20, 29, 24, 2);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(15, 47, 34, 3);
  });
}
const TEX = {
  walls: ['#e8dcc0', '#c9d8e6', '#e6b9a6', '#cfe0c3', '#f1efe8', '#e3cf9a'].map(wallTex),
  brick: canvasTex(64, 64, (g) => {
    g.fillStyle = '#9a4b35'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#c8b9a4';
    for (let y = 0; y < 64; y += 8) { g.fillRect(0, y, 64, 1); for (let x = (y / 8) % 2 ? 8 : 0; x < 64; x += 16) g.fillRect(x, y, 1, 8); }
    speckle(g, 64, 64, 0.12);
  }),
  concrete: canvasTex(64, 64, (g) => { g.fillStyle = '#9b9c98'; g.fillRect(0, 0, 64, 64); speckle(g, 64, 64, 0.1); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 31, 64, 2); g.fillRect(31, 0, 2, 64); }),
  sandbag: canvasTex(64, 32, (g) => {
    g.fillStyle = '#8c7a55'; g.fillRect(0, 0, 64, 32);
    for (let r = 0; r < 4; r++) for (let i = -1; i < 4; i++) {
      g.fillStyle = r % 2 ? '#c2ad7e' : '#b8a273';
      const x = i * 20 + (r % 2) * 10; g.fillRect(x + 1, r * 8 + 1, 18, 6);
    }
    speckle(g, 64, 32, 0.1);
  }),
  metal: canvasTex(64, 64, (g) => { g.fillStyle = '#8f979e'; g.fillRect(0, 0, 64, 64); for (let x = 0; x < 64; x += 6) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x, 0, 2, 64); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x + 2, 0, 1, 64); } }),
  crate: canvasTex(64, 64, (g) => {
    g.fillStyle = '#b5803f'; g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 11) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y, 64, 1); }
    g.strokeStyle = '#6b4520'; g.lineWidth = 6; g.strokeRect(3, 3, 58, 58);
    g.beginPath(); g.moveTo(3, 3); g.lineTo(61, 61); g.stroke();
  }),
  barrel: canvasTex(64, 64, (g) => {
    g.fillStyle = '#c62828'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#8e1b1b'; g.fillRect(0, 10, 64, 5); g.fillRect(0, 49, 64, 5);
    g.fillStyle = '#ffd54f'; g.beginPath(); g.moveTo(32, 20); g.lineTo(44, 42); g.lineTo(20, 42); g.closePath(); g.fill();
    g.fillStyle = '#222'; g.fillRect(31, 26, 2, 9); g.fillRect(31, 37, 2, 2);
  }),
  drum: canvasTex(32, 32, (g) => { g.fillStyle = '#2f5d8c'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#1d3b5a'; g.fillRect(0, 6, 32, 3); g.fillRect(0, 23, 32, 3); }),
  hay: canvasTex(32, 32, (g) => { g.fillStyle = '#d8b75a'; g.fillRect(0, 0, 32, 32); for (let i = 0; i < 60; i++) { g.fillStyle = Math.random() < 0.5 ? '#b8963c' : '#f0d27a'; g.fillRect(Math.random() * 32 | 0, Math.random() * 32 | 0, 1 + Math.random() * 5 | 0, 1); } }),
  roof: canvasTex(32, 32, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 32, 32); for (let y = 0; y < 32; y += 6) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y, 32, 1); } }),
};
const MATS = {
  roofs: [0x9c3b2e, 0x6b4a33, 0x4f5966, 0x7e2f2f, 0x3f5f45].map(c => new THREE.MeshLambertMaterial({ color: c, map: TEX.roof })),
  door: new THREE.MeshLambertMaterial({ color: 0x5a3a22 }),
  concrete: new THREE.MeshLambertMaterial({ map: texRepeat(TEX.concrete, 3, 1) }),
  concreteBig: new THREE.MeshLambertMaterial({ map: texRepeat(TEX.concrete, 4, 2) }),
  sandbag: new THREE.MeshLambertMaterial({ map: texRepeat(TEX.sandbag, 3, 1) }),
  sandbagShort: new THREE.MeshLambertMaterial({ map: texRepeat(TEX.sandbag, 1, 1) }),
  metal: new THREE.MeshLambertMaterial({ map: texRepeat(TEX.metal, 4, 2) }),
  brick: new THREE.MeshLambertMaterial({ map: texRepeat(TEX.brick, 2, 2) }),
  wood: new THREE.MeshLambertMaterial({ color: 0x7a5232 }),
  darkWood: new THREE.MeshLambertMaterial({ color: 0x4e3420 }),
  white: new THREE.MeshLambertMaterial({ color: 0xf0f0ea }),
  black: new THREE.MeshLambertMaterial({ color: 0x1b1b1b }),
  steel: new THREE.MeshLambertMaterial({ color: 0x6d747b }),
  olive: new THREE.MeshLambertMaterial({ color: 0x55602a }),
  tent: new THREE.MeshLambertMaterial({ color: 0x5c6b3a }),
  lamp: new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
  water: new THREE.MeshPhongMaterial({ color: 0x3d8fd1, transparent: true, opacity: 0.82, shininess: 90, specular: 0xffffff }),
  crate: new THREE.MeshLambertMaterial({ map: TEX.crate }),
  barrel: new THREE.MeshLambertMaterial({ map: TEX.barrel }),
  drum: new THREE.MeshLambertMaterial({ map: TEX.drum }),
  hay: new THREE.MeshLambertMaterial({ map: TEX.hay }),
};

if (SNOW) {
  // log cabins (izbas) with white carved window frames and blue shutters, and faded Soviet plaster
  const logTex = (base, dark) => canvasTex(64, 64, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) { g.fillStyle = dark; g.fillRect(0, y + 6, 64, 2); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, y + 1, 64, 2); }
    speckle(g, 64, 64, 0.1);
    g.fillStyle = '#f4f1ea'; g.fillRect(16, 12, 32, 36); g.fillRect(13, 9, 38, 4); g.fillRect(14, 48, 36, 3);
    g.fillStyle = '#2d4766'; g.fillRect(20, 16, 24, 28);
    g.fillStyle = '#6f8fb5'; g.fillRect(20, 16, 11, 13); g.fillRect(33, 31, 11, 13);
    g.fillStyle = '#f4f1ea'; g.fillRect(31, 16, 2, 28); g.fillRect(20, 29, 24, 2);
    g.fillStyle = '#3c6fa3'; g.fillRect(8, 14, 7, 32); g.fillRect(49, 14, 7, 32);
  });
  TEX.walls = [logTex('#7a5233', '#4a3020'), logTex('#8a6240', '#553a24'), logTex('#6b4a2e', '#40291a'), logTex('#94704b', '#5e4229'), wallTex('#d9cf9e'), wallTex('#b9c9b3')];
  MATS.roofs = [0xf4f7fb, 0xeef2f7, 0xe8edf3, 0xf7f9fc].map(c => new THREE.MeshLambertMaterial({ color: c, map: TEX.roof }));
}
if (DESERT) {
  // sun-baked mud brick and sandstone
  TEX.walls = ['#d9b98a', '#e3c79c', '#cfa874', '#e8d4b0', '#c99a66', '#dcc08f'].map(wallTex);
  MATS.roofs = [0xb98a5a, 0xa8794c, 0xc9a070].map(c => new THREE.MeshLambertMaterial({ color: c, map: TEX.roof }));
}
function prismGeo(span, rise, length) {
  const s = new THREE.Shape(); s.moveTo(-span / 2, 0); s.lineTo(span / 2, 0); s.lineTo(0, rise); s.lineTo(-span / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false }); g.translate(0, 0, -length / 2); return g;
}
function groundMin(x, z, hw, hd) {
  return Math.min(heightAt(x - hw, z - hd), heightAt(x + hw, z - hd), heightAt(x - hw, z + hd), heightAt(x + hw, z + hd), heightAt(x, z));
}
function addMesh(geo, mat, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true; m.userData.static = true; scene.add(m); return m;
}
// solid axis-aligned block standing on the ground (or at y)
function addBlock(x, z, w, h, d, mat, opts = {}) {
  const base = opts.y !== undefined ? opts.y : groundMin(x, z, w / 2, d / 2) - 0.4;
  const H = opts.y !== undefined ? h : h + 0.4;
  const m = addMesh(new THREE.BoxGeometry(w, H, d), mat, x, base + H / 2, z);
  if (opts.solid !== false) {
    solidMeshes.push(m);
    const bb = { kind: 'box', minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, minY: base, maxY: base + H, los: opts.los !== false };
    obstacles.push(bb); gridAdd(bb, bb.minX, bb.maxX, bb.minZ, bb.maxZ);
    const b = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(w / 2, H / 2, d / 2)) });
    b.position.set(x, base + H / 2, z); world.addBody(b);
  }
  m.userData.top = base + H;
  return m;
}

// ---------- terrain ----------
let terrainMesh, waterMesh, TERRAIN_HF = null;
function terrainColorSnow(x, z, h, slope) {
  const n = vnoise(x * 0.05, z * 0.05), nf = vnoise(x * 0.23 + 9, z * 0.23 - 3);
  const c = new THREE.Color().setRGB(0.86 + n * 0.08, 0.89 + n * 0.07, 0.94 + n * 0.05).multiplyScalar(0.95 + nf * 0.07);
  if (h < 3) c.lerp(new THREE.Color(0.8, 0.85, 0.93), 0.35);                               // blue shadows in the hollows
  const pd = pathDist(x, z);
  if (pd < 4.5) c.lerp(new THREE.Color(0.66, 0.64, 0.62), smooth(4.5, 1.5, pd) * 0.75);    // trodden, muddy snow on the roads
  for (const t of TEAMS) { const d = Math.hypot(x - BASES[t].x, z - BASES[t].z); if (d < 48) c.lerp(new THREE.Color(0.72, 0.72, 0.72), smooth(48, 30, d) * 0.5); }
  for (const L of LAKES) { const ld = Math.hypot(x - L.x, z - L.z); if (ld < L.r + 4) c.lerp(new THREE.Color(0.68, 0.8, 0.9), smooth(L.r + 4, L.r - 6, ld)); }
  // bare dark rock on steep slopes and high up, with snow only where it can settle
  const rn = vnoise(x * 0.11, z * 0.11), streak = 0.5 + 0.5 * Math.sin(h * 1.3 + rn * 5);
  const rocky = clamp((slope - 0.24) * 2.4, 0, 1) * (0.55 + nf * 0.45) + clamp((h - 16) / 14, 0, 0.6) * (0.4 + rn * 0.6);
  if (rocky > 0) c.lerp(new THREE.Color(0.25 + rn * 0.1, 0.26 + rn * 0.1, 0.29 + rn * 0.1).multiplyScalar(0.85 + streak * 0.3), clamp(rocky, 0, 0.92));
  return c;
}
function terrainColorDesert(x, z, h, slope) {
  const n = vnoise(x * 0.05, z * 0.05), nf = vnoise(x * 0.21 + 9, z * 0.21 - 3);
  const c = new THREE.Color().setRGB(0.86 + n * 0.06, 0.73 + n * 0.06, 0.5 + n * 0.05).multiplyScalar(0.94 + nf * 0.06);
  const hk = clamp((h + 4) / 22, 0, 1);                                      // dune hollows warmer and darker, crests paler
  c.lerp(new THREE.Color(0.74, 0.56, 0.36), (1 - hk) * 0.45).lerp(new THREE.Color(0.95, 0.86, 0.66), hk * hk * 0.35);
  const pd = pathDist(x, z); if (pd < 4.5) c.lerp(new THREE.Color(0.68, 0.56, 0.4), smooth(4.5, 1.5, pd) * 0.7);
  for (const L of LAKES) { const ld = Math.hypot(x - L.x, z - L.z); if (ld < L.r + 26) c.lerp(new THREE.Color(0.42, 0.56, 0.26), smooth(L.r + 26, L.r + 4, ld) * 0.85); }   // green around the oases
  if (slope > 0.35 || h > 22) { const strata = 0.5 + 0.5 * Math.sin(h * 1.1 + nf * 3); c.lerp(new THREE.Color(0.72 + strata * 0.1, 0.42 + strata * 0.08, 0.26), clamp(Math.max((slope - 0.35) * 2.5, (h - 22) / 5), 0, 0.9)); }   // red sandstone cliffs
  return c;
}
function freewayDist(x, z) { let m = Infinity; for (const f of H_FREEWAYS) m = Math.min(m, distToSeg(x, z, f[0].x, f[0].z, f[1].x, f[1].z)); return m; }
const H_LOTS = [];   // parking lots, filled in by houston.js before the ground is coloured
function terrainColorHouston(x, z, h, slope) {
  const n = vnoise(x * 0.05, z * 0.05), nf = vnoise(x * 0.21 + 9, z * 0.21 - 3);
  const c = new THREE.Color().setRGB(lerp(0.29, 0.42, n), lerp(0.5, 0.62, n), lerp(0.19, 0.25, n)).multiplyScalar(0.9 + nf * 0.14);
  const bd = bayouDist(x, z); if (bd < 22) c.lerp(new THREE.Color(0.24, 0.36, 0.17), smooth(22, 12, bd) * 0.8);   // shady bayou banks
  if (Math.max(Math.abs(x), Math.abs(z)) < 174) c.lerp(new THREE.Color(0.62, 0.61, 0.58).multiplyScalar(0.94 + nf * 0.08), 0.92);   // downtown sidewalks and plazas
  for (const L of H_LOTS) if (Math.abs(x - L.x) < L.hw && Math.abs(z - L.z) < L.hd) c.lerp(new THREE.Color(0.34, 0.34, 0.35), 0.9);
  for (const t of TEAMS) { const d = Math.hypot(x - BASES[t].x, z - BASES[t].z); if (d < 30) c.lerp(new THREE.Color(0.58, 0.58, 0.55), smooth(30, 26, d)); }
  if (freewayDist(x, z) < 9 || pathDist(x, z) < 5) c.lerp(new THREE.Color(0.3, 0.3, 0.32), 0.95);   // asphalt
  if (h < 0.3) c.lerp(new THREE.Color(0.42, 0.38, 0.28), smooth(0.3, -0.8, h));
  return c;
}
function terrainColorWake(x, z, h, slope) {
  const C = CARRIER;
  if (h > C.deck - 0.5 && Math.abs(x - C.x) < C.hl + 2 && Math.abs(z - C.z) < C.hw + 2) return new THREE.Color(0.36, 0.38, 0.4).multiplyScalar(0.94 + vnoise(x * 0.3, z * 0.3) * 0.1);   // grey steel deck
  if (x > C.x + C.hl - 2 && x < C.x + C.hl + 72 && Math.abs(z - C.z - 8) < 15 && h > 0.2) return h > 0.6 ? new THREE.Color(0.42, 0.44, 0.46) : new THREE.Color(0.5, 0.38, 0.24);   // ramp and wooden dock
  const n = vnoise(x * 0.05, z * 0.05), nf = vnoise(x * 0.21 + 9, z * 0.21 - 3);
  const c = new THREE.Color().setRGB(lerp(0.2, 0.32, n), lerp(0.44, 0.56, n), lerp(0.14, 0.2, n)).multiplyScalar(0.9 + nf * 0.14);   // jungle green
  const sand = new THREE.Color(0.92, 0.85, 0.64).multiplyScalar(0.94 + nf * 0.08);
  if (h < 2.6) c.lerp(sand, smooth(2.6, 1.4, h));                    // beaches
  if (h < -0.4) c.lerp(new THREE.Color(0.78, 0.74, 0.56), 0.6);          // sand under the shallow water
  if (pathDist(x, z) < 4.5) c.lerp(new THREE.Color(0.7, 0.62, 0.46), 0.8);
  const r = RUNWAYS.red; if (Math.abs(x - r.x) < r.len / 2 + 8 && Math.abs(z - r.z) < r.wid / 2 + 6) c.lerp(new THREE.Color(0.66, 0.62, 0.52), 0.85);   // coral airstrip
  const b = BASES.red, bd = Math.hypot(x - b.x, z - b.z); if (bd < 30) c.lerp(new THREE.Color(0.7, 0.64, 0.5), smooth(30, 24, bd));
  return c;
}
function terrainColor(x, z, h, slope) {
  if (WAKE) return terrainColorWake(x, z, h, slope);
  if (HOUSTON) return terrainColorHouston(x, z, h, slope);
  if (SNOW) return terrainColorSnow(x, z, h, slope);
  if (DESERT) return terrainColorDesert(x, z, h, slope);
  const n = vnoise(x * 0.05, z * 0.05), nf = vnoise(x * 0.21 + 9, z * 0.21 - 3), nb = vnoise(x * 0.008 - 20, z * 0.008 + 5);
  const c = new THREE.Color().setRGB(lerp(0.27, 0.42, n), lerp(0.48, 0.63, n), lerp(0.17, 0.25, n));
  c.multiplyScalar(0.9 + nf * 0.16);                                           // small light and dark patches in the grass
  if (nb < 0.4) c.lerp(new THREE.Color(0.22, 0.42, 0.18), clamp((0.4 - nb) * 2.2, 0, 0.55));   // deeper green meadows
  const n2 = vnoise(x * 0.015 + 40, z * 0.015);
  if (n2 > 0.62) c.lerp(new THREE.Color(0.6, 0.62, 0.3), clamp((n2 - 0.62) * 2.5, 0, 0.7));
  const pd = pathDist(x, z);
  if (pd < 5) c.lerp(new THREE.Color(0.56, 0.45, 0.31).offsetHSL(0, 0, (n - 0.5) * 0.06), smooth(5, 2, pd));
  for (const t of [BASES.blue, BASES.red]) { const d = Math.hypot(x - t.x, z - t.z); if (d < 30) c.lerp(new THREE.Color(0.58, 0.58, 0.55), smooth(30, 26, d)); }
  if (Math.hypot(x, z) < 15) c.lerp(new THREE.Color(0.62, 0.6, 0.55), smooth(15, 12, Math.hypot(x, z)));
  if (h < 0.4 && LAKES.some(L => Math.hypot(x - L.x, z - L.z) < L.r + 30)) c.lerp(new THREE.Color(0.86, 0.8, 0.56), smooth(0.4, -0.6, h));
  if (slope > 0.55 || h > 20) {
    const strata = 0.5 + 0.5 * Math.sin(h * 0.9 + vnoise(x * 0.06, z * 0.06) * 6), rn = vnoise(x * 0.11 + 3, z * 0.11);
    const rock = new THREE.Color().setRGB(0.42 + rn * 0.12, 0.4 + rn * 0.1, 0.38 + rn * 0.08).multiplyScalar(0.82 + strata * 0.25);
    if (h > 18 && h < 30 && slope < 0.9) rock.lerp(new THREE.Color(0.3, 0.42, 0.24), clamp(0.6 - slope * 0.6, 0, 0.5) * (1 - rn));   // grassy ledges
    c.lerp(rock, clamp(Math.max((slope - 0.55) * 3, (h - 20) / 8), 0, 1));
  }
  const snowLine = 34 + vnoise(x * 0.04 + 7, z * 0.04) * 6;
  if (h > snowLine) c.lerp(new THREE.Color(0.95, 0.96, 0.99), clamp((h - snowLine) / 4, 0, 1) * (slope > 1.4 ? 0.6 : 1));
  return c;
}
// a soft lumpy ball: smooth normals, darker underneath and lighter on top
function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function blobGeo(r, detail, lumpy = 0.18, shade = [0.62, 1.12], flat = false) {
  const g = new THREE.IcosahedronGeometry(1, detail), pos = g.attributes.position, nor = g.attributes.normal;
  const col = new Float32Array(pos.count * 3), d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    const n = hash3(Math.round(d.x * 50), Math.round(d.y * 50), Math.round(d.z * 50));
    const k = r * (1 + (n - 0.5) * 2 * lumpy);
    pos.setXYZ(i, d.x * k, d.y * k, d.z * k);
    if (!flat) nor.setXYZ(i, d.x, d.y, d.z);
    const t = shade[0] + (shade[1] - shade[0]) * (d.y * 0.5 + 0.5) + (n - 0.5) * 0.08;
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = t;
  }
  if (flat) g.computeVertexNormals();
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
// shade any geometry from dark at the bottom to light at the top
function shadeY(g, lo = 0.65, hi = 1.1) {
  g.computeBoundingBox(); const b = g.boundingBox, pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const t = lo + (hi - lo) * (pos.getY(i) - b.min.y) / Math.max(0.001, b.max.y - b.min.y); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = t; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
function buildTerrain() {
  // flatten important places
  for (const p of POINTS_DEF) addFlatCircle(p.x, p.z, 17, 18);
  if (SNOW) {
    // big level sites for the Russian landmarks
    addFlatCircle(0, 0, 60, 26, Math.max(rawHeight(0, 0), 1) + 4);           // the Kremlin sits a little above the passes
    for (const [n, r] of [['A', 58], ['E', 58], ['B', 52], ['D', 52], ['G', 54], ['F', 34]]) addFlatCircle(PD[n].x, PD[n].z, r, 22);
  } else if (!WAKE) {
  addFlatCircle(0, 0, 58, 25);
  for (const p of [PD.F, PD.G, PD.A]) addFlatCircle(p.x, p.z, 36, 20);
  }
  for (const t of TEAMS) {
    if (WAKE && t === 'blue') continue;   // the carrier deck is already flat
    addFlatCircle(BASES[t].x, BASES[t].z, 34, 22);
    const r = RUNWAYS[t]; if (r) addFlatRect(r.x, r.z, r.len / 2 + (SNOW ? 140 : 8), r.wid / 2 + (SNOW ? 24 : 6), SNOW ? 40 : 22);
  }
  if (!WAKE) chooseBunkerSites();
  if (typeof chooseNestSites === 'function') chooseNestSites();
  buildHeights();

  const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, GRID, GRID);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const ix = i % W1, iz = Math.floor(i / W1);
    const h = HGRID[i]; pos.setY(i, h);
    const hx = HGRID[iz * W1 + Math.min(ix + 1, GRID)] - HGRID[iz * W1 + Math.max(ix - 1, 0)];
    const hz = HGRID[Math.min(iz + 1, GRID) * W1 + ix] - HGRID[Math.max(iz - 1, 0) * W1 + ix];
    const slope = Math.hypot(hx, hz) / (2 * CELL);
    const c = terrainColor(pos.getX(i), pos.getZ(i), h, slope);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  // a fine speckle texture over the vertex colours so the ground has detail up close
  const dtex = canvasTex(256, 256, (g) => {
    g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5200; i++) { const v = 200 + Math.random() * 55 | 0; g.fillStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.5})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5); }
    for (let i = 0; i < 1400; i++) { const v = 150 + Math.random() * 50 | 0; g.fillStyle = `rgba(${v},${v},${v},${0.2 + Math.random() * 0.35})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1, 2 + Math.random() * 4); }
  });
  dtex.magFilter = THREE.LinearFilter; dtex.wrapS = dtex.wrapT = THREE.RepeatWrapping; dtex.repeat.set(HALF * 2 / 9, HALF * 2 / 9); dtex.anisotropy = LITE ? 1 : 4;
  terrainMesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 0, specular: 0x000000, map: dtex }));
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // outer ground ring so the edge of the world is never visible
  if (SNOW) {
    // far below the mountain top: a pale snowfield lost in the haze
    const outer = new THREE.Mesh(new THREE.RingGeometry(HALF * 0.95, 1400, 48, 1), new THREE.MeshBasicMaterial({ color: 0xd9e0e8 }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -95; scene.add(outer);
  } else if (WAKE) {
    // nothing: the ocean runs to the horizon
  } else {
    const outer = new THREE.Mesh(new THREE.RingGeometry(HALF * 1.35, 1400, 48, 1), new THREE.MeshLambertMaterial({ color: DESERT ? 0xc9a46c : 0x8f9a86 }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = 35; scene.add(outer);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(HALF * 1.36, HALF * 1.42, 40, 48, 1, true), new THREE.MeshLambertMaterial({ color: DESERT ? 0xb08a55 : 0x7d8a76, side: THREE.DoubleSide }));
    skirt.position.y = 20; scene.add(skirt);
  }

  // physics heightfield
  const data = [];
  for (let ix = 0; ix <= GRID; ix++) { const row = []; for (let j = 0; j <= GRID; j++) row.push(HGRID[(GRID - j) * W1 + ix]); data.push(row); }
  const hf = new CANNON.Body({ mass: 0 });
  hf.addShape(new CANNON.Heightfield(data, { elementSize: CELL })); TERRAIN_HF = hf.shapes[0];
  hf.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  hf.position.set(-HALF, 0, HALF);
  hf.collisionFilterGroup = 2;   // things underground (mask 1) pass under the terrain surface
  world.addBody(hf);

  // lake
  waterMesh = new THREE.Group(); scene.add(waterMesh);
  if (SNOW) { const ice = new THREE.MeshPhongMaterial({ color: 0xbfd8ea, shininess: 110, specular: 0xffffff, transparent: true, opacity: 0.85 }); for (const L of LAKES) { const im = new THREE.Mesh(new THREE.CircleGeometry(L.r + 2, 48), ice); im.rotation.x = -Math.PI / 2; im.position.set(L.x, ICE_Y + 0.06, L.z); im.receiveShadow = true; scene.add(im); } return; }
  if (WAKE) { const sea = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3200, 1, 1), waterMat); sea.rotation.x = -Math.PI / 2; sea.position.y = WATER_Y; waterMesh.add(sea); }
  if (HOUSTON) {   // Buffalo Bayou: a ribbon of water along its winding line
    const pts = []; for (let i = 0; i < BAYOU.length - 1; i++) { const a = BAYOU[i], b = BAYOU[i + 1], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 6); for (let k = 0; k < n; k++) pts.push({ x: lerp(a.x, b.x, k / n), z: lerp(a.z, b.z, k / n) }); }
    pts.push(BAYOU[BAYOU.length - 1]);
    const pos = [], idx = [];
    pts.forEach((p, i) => { const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)], dx = q.x - o.x, dz = q.z - o.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l; pos.push(p.x + nx * 13, 0, p.z + nz * 13, p.x - nx * 13, 0, p.z - nz * 13); if (i) idx.push(i * 2 - 2, i * 2, i * 2 - 1, i * 2 - 1, i * 2, i * 2 + 1); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const rm = new THREE.Mesh(g, waterMat); rm.position.y = WATER_Y; waterMesh.add(rm);
  }
  for (const L of LAKES) { const wm = new THREE.Mesh(new THREE.CircleGeometry(L.r + 8, 64), waterMat); wm.rotation.x = -Math.PI / 2; wm.position.set(L.x, WATER_Y, L.z); waterMesh.add(wm); }
}

// ---------- buildings ----------
const wallMatCache = {};
let HOUSE_TRIM = null;
function house(x, z, w, d, h, opts = {}) {
  if (DESERT) opts = Object.assign({}, opts, { flat: true });   // desert houses always have flat roofs
  if (!HOUSE_TRIM) HOUSE_TRIM = new THREE.MeshLambertMaterial({ vertexColors: true });
  const tex = opts.tex || pick(TEX.walls);
  const rx = Math.max(1, Math.round(Math.max(w, d) / 3.3)), ry = Math.max(1, Math.round(h / 3.2)), key = tex.uuid + rx + '_' + ry;
  const mat = wallMatCache[key] || (wallMatCache[key] = new THREE.MeshLambertMaterial({ map: texRepeat(tex, rx, ry) }));
  const m = addBlock(x, z, w, h, d, mat);
  const top = m.userData.top, base = top - h - 0.4;
  if (opts.flat && DESERT) {
    // a desert roof: low parapet wall, a water tank or satellite dish, and a cloth awning over the door
    const dp = new Part(), wc = 0xd8b88a;
    dp.box(w + 0.3, 0.3, d + 0.3, 0xc9a878, 0, 0.15, 0);
    for (const s of [-1, 1]) { dp.box(w + 0.3, 0.7, 0.25, wc, 0, 0.6, s * (d / 2 + 0.03)); dp.box(0.25, 0.7, d + 0.3, wc, s * (w / 2 + 0.03), 0.6, 0); }
    const r = Math.random();
    if (r < 0.4) { dp.cyl(0.7, 0.7, 1.4, 0x2b2b2b, w * 0.25, 1.0, -d * 0.2); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) dp.box(0.08, 0.5, 0.08, 0x555555, w * 0.25 + a * 0.5, 0.45, -d * 0.2 + b * 0.5); }
    else if (r < 0.7) { dp.add(new THREE.SphereGeometry(0.6, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.4), 0xe8e8e8, -w * 0.25, 1.1, d * 0.2, -1.0, 0, 0); dp.cyl(0.05, 0.05, 0.8, 0x777777, -w * 0.25, 0.6, d * 0.2); }
    else { dp.box(1.6, 0.9, 1.6, wc, -w * 0.2, 0.75, 0); dp.box(0.9, 0.1, 0.9, 0x6b4a33, -w * 0.2, 1.25, 0); }   // roof access hut
    for (let i = 0; i < 3; i++) dp.box(0.12, 0.12, 0.12, 0x6b4a33, -w / 2 + 0.6 + i * (w - 1.2) / 2, -0.9, d / 2 + 0.06);   // roof beam ends
    const dm = new THREE.Mesh(dp.build(), HOUSE_TRIM); dm.position.set(x, top, z); dm.castShadow = true; scene.add(dm);
  } else if (opts.flat) {
    addMesh(new THREE.BoxGeometry(w + 0.3, 0.5, d + 0.3), MATS.concrete, x, top + 0.25, z);
  } else {
    const alongX = w > d;
    const roof = addMesh(prismGeo((alongX ? d : w) + 1, Math.min(w, d) * 0.42, (alongX ? w : d) + 1), opts.roof || pick(MATS.roofs), x, top, z);
    if (alongX) roof.rotation.y = Math.PI / 2;
    const hasChimney = SNOW || Math.random() < 0.45, chx = x + (alongX ? w * 0.25 : 0.6), chz = z + (alongX ? 0.6 : d * 0.25);
    if (hasChimney) addMesh(new THREE.CylinderGeometry(0.4, 0.45, 2.2, 8), MATS.brick, chx, top + 1.4, chz);
    if (SNOW) {
      // icicles hanging from the eaves, and snow drifted up against the walls; the stove is lit, so the chimney smokes
      const ip = new Part(), ew = (alongX ? w : d) + 1, eo = (alongX ? d : w) / 2 + 0.5;
      for (const s of [-1, 1]) for (let k = -ew / 2 + 0.3; k < ew / 2; k += 0.55) { const L = 0.25 + ((k * 7.3 + s) % 1 + 1) % 1 * 0.6; ip.add(new THREE.ConeGeometry(0.06, L, 4), 0xdff0fb, alongX ? k : s * eo, -L / 2, alongX ? s * eo : k, Math.PI, 0, 0); }
      for (const s of [-1, 1]) { ip.box(alongX ? w + 0.6 : 0.9, 0.5, alongX ? 0.9 : d + 0.6, 0xf4f7fb, alongX ? 0 : s * (w / 2 + 0.3), -(top - base) + 0.65, alongX ? s * (d / 2 + 0.3) : 0); }
      const im = new THREE.Mesh(ip.build(), HOUSE_TRIM); im.position.set(x, top, z); scene.add(im);
      if (typeof chimneys !== 'undefined') chimneys.push({ x: chx, y: top + 2.6, z: chz, t: Math.random() * 2, small: true });
    }
  }
  {
    const tp = new Part(), trimC = 0xe9e4d8, baseC = 0x7d756b;
    tp.box(w + 0.24, 0.7, d + 0.24, baseC, 0, base + 0.35, 0);                                         // stone plinth
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tp.box(0.22, h, 0.22, trimC, cx * (w / 2 + 0.02), base + 0.4 + h / 2, cz * (d / 2 + 0.02));   // corner trims
    tp.box(w + 0.3, 0.22, d + 0.3, trimC, 0, top - 0.11, 0);                                            // eaves band
    const tm = new THREE.Mesh(tp.build(), HOUSE_TRIM); tm.position.set(x, 0, z); tm.castShadow = true; tm.receiveShadow = true; scene.add(tm);
  }
  const face = opts.face !== undefined ? opts.face : (z > 0 ? -1 : 1);
  const dz = z + face * (d / 2 + 0.06), dx = x + (opts.doorX || 0);
  if (DESERT) {   // striped cloth awning over the door
    const ap = new Part(), cols = [0xc8302c, 0x2f6fb0, 0x3f8a4a, 0xd9ae4a], c = cols[Math.floor(Math.random() * cols.length)];
    for (let i = 0; i < 5; i++) ap.box(0.62, 0.06, 1.5, i % 2 ? 0xf4ede0 : c, -1.24 + i * 0.62, 0, 0.75 * face, 0.32 * face, 0, 0);
    for (const s of [-1, 1]) ap.cyl(0.04, 0.04, 2.3, 0x6b4a33, s * 1.5, -1.15, 1.45 * face);
    const am = new THREE.Mesh(ap.build(), HOUSE_TRIM); am.position.set(dx, base + 0.4 + 2.8, dz); scene.add(am);
  }
  addMesh(new THREE.BoxGeometry(1.3, 2.3, 0.14), MATS.door, dx, base + 0.4 + 1.15, dz, false);
  addMesh(new THREE.SphereGeometry(0.06, 6, 4), MATS.steel, dx + 0.45, base + 0.4 + 1.1, dz + face * 0.09, false);
  addMesh(new THREE.BoxGeometry(2.2, 0.25, 0.9), MATS.concrete, dx, base + 0.45, z + face * (d / 2 + 0.45));
  if (!opts.flat || Math.random() < 0.5) {
    const c = addMesh(new THREE.BoxGeometry(2.6, 0.12, 1.4), opts.roof || MATS.roofs[1], dx, base + 0.4 + 2.75, z + face * (d / 2 + 0.7));
    c.rotation.x = face * 0.25;
    for (const sx of [-1.15, 1.15]) addMesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), MATS.white, dx + sx, base + 0.4 + 1.3, z + face * (d / 2 + 1.25));
  }
  if (Math.random() < 0.6) for (const sx of [-w / 4, w / 4]) {
    const fb = addMesh(new THREE.BoxGeometry(1.4, 0.3, 0.35), MATS.darkWood, x + sx, base + 0.4 + 1.2, z + face * (d / 2 + 0.18), false);
    for (let i = 0; i < 4; i++) addMesh(new THREE.SphereGeometry(0.13, 6, 4), new THREE.MeshLambertMaterial({ color: pick([0xe53935, 0xffeb3b, 0xffffff, 0xab47bc]) }), x + sx - 0.5 + i * 0.33, base + 0.4 + 1.42, z + face * (d / 2 + 0.18), false);
  }
  return m;
}
function tower(x, z) {
  const m = addBlock(x, z, 5, 15, 5, new THREE.MeshLambertMaterial({ map: texRepeat(TEX.walls[4], 1, 4) }));
  const roof = addMesh(new THREE.ConeGeometry(4.1, 6, 4), MATS.roofs[3], x, m.userData.top + 3, z);
  roof.rotation.y = Math.PI / 4;
  addMesh(new THREE.BoxGeometry(0.25, 2.4, 0.25), MATS.black, x, m.userData.top + 7, z);
  addMesh(new THREE.BoxGeometry(1.4, 0.25, 0.25), MATS.black, x, m.userData.top + 7.4, z);
}
function lamp(x, z) {
  const y = heightAt(x, z);
  addMesh(new THREE.CylinderGeometry(0.08, 0.12, 4.2, 8), MATS.black, x, y + 2.1, z);
  addMesh(new THREE.CylinderGeometry(0.15, 0.35, 0.3, 8), MATS.black, x, y + 4.35, z);
  addMesh(new THREE.SphereGeometry(0.22, 10, 8), MATS.lamp, x, y + 4.15, z, false);
}
function stall(x, z, color) {
  const y = heightAt(x, z);
  for (const [dx, dz] of [[-1.4, -1], [1.4, -1], [-1.4, 1], [1.4, 1]]) addMesh(new THREE.BoxGeometry(0.15, 2.4, 0.15), MATS.wood, x + dx, y + 1.2, z + dz);
  addMesh(new THREE.BoxGeometry(3.4, 0.15, 2.6), new THREE.MeshLambertMaterial({ color }), x, y + 2.45, z);
  addBlock(x, z, 2.8, 0.9, 1.2, MATS.wood, { los: false });
  for (let i = 0; i < 5; i++) addMesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshLambertMaterial({ color: pick([0xe53935, 0xfdd835, 0x43a047, 0xfb8c00]) }), x - 1 + i * 0.5, y + 1.5, z + rand(-0.3, 0.3), false);
}
function fence(x1, z1, x2, z2) {
  const len = Math.hypot(x2 - x1, z2 - z1), n = Math.ceil(len / 2.5), ang = Math.atan2(x2 - x1, z2 - z1);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = lerp(x1, x2, t), z = lerp(z1, z2, t), y = heightAt(x, z);
    addMesh(new THREE.BoxGeometry(0.18, 1.3, 0.18), MATS.wood, x, y + 0.6, z);
    if (i < n) {
      const xm = lerp(x1, x2, (i + 0.5) / n), zm = lerp(z1, z2, (i + 0.5) / n), ym = heightAt(xm, zm);
      for (const hy of [0.45, 0.95]) { const r = addMesh(new THREE.BoxGeometry(0.08, 0.12, len / n), MATS.wood, xm, ym + hy, zm); r.rotation.y = ang; }
    }
  }
}
function sandbagWall(x, z, w, d) { addBlock(x, z, w, 1.15, d, w > d ? MATS.sandbag : MATS.sandbagShort, { los: true }); }
function tent(x, z, alongX) {
  const y = heightAt(x, z);
  const t = addMesh(prismGeo(4.2, 2.6, 5.5), MATS.tent, x, y - 0.05, z);
  if (alongX) t.rotation.y = Math.PI / 2;
  const bb = { kind: 'box', minX: x - (alongX ? 2.75 : 2.1), maxX: x + (alongX ? 2.75 : 2.1), minZ: z - (alongX ? 2.1 : 2.75), maxZ: z + (alongX ? 2.1 : 2.75), minY: y, maxY: y + 2.2, los: true };
  obstacles.push(bb); gridAdd(bb, bb.minX, bb.maxX, bb.minZ, bb.maxZ); solidMeshes.push(t);
}
function watchtower(x, z) {
  const y = heightAt(x, z);
  for (const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) addMesh(new THREE.BoxGeometry(0.3, 7, 0.3), MATS.darkWood, x + dx, y + 3.5, z + dz);
  addMesh(new THREE.BoxGeometry(3.4, 0.3, 3.4), MATS.wood, x, y + 7, z);
  for (const [dx, dz, w, d] of [[0, -1.6, 3.4, 0.15], [0, 1.6, 3.4, 0.15], [-1.6, 0, 0.15, 3.4], [1.6, 0, 0.15, 3.4]]) addMesh(new THREE.BoxGeometry(w, 1, d), MATS.wood, x + dx, y + 7.6, z + dz);
  const r = addMesh(prismGeo(4, 1.4, 4), MATS.darkWood, x, y + 9.3, z);
  addCircle(x, z, 2, y + 7);
}
function container(x, z, alongX, color, y) {
  const w = alongX ? 6 : 2.5, d = alongX ? 2.5 : 6;
  const mat = new THREE.MeshLambertMaterial({ color, map: texRepeat(TEX.metal, 3, 1) });
  return addBlock(x, z, w, 2.6, d, mat, y !== undefined ? { y } : {});
}
function fuelTank(x, z) {
  const y = heightAt(x, z);
  addMesh(new THREE.CylinderGeometry(3, 3, 7, 20), MATS.white, x, y + 3.5, z);
  addMesh(new THREE.CylinderGeometry(3.05, 3.05, 0.5, 20), MATS.steel, x, y + 6.2, z);
  addCircle(x, z, 3.1, y + 7);
  const bb = { kind: 'box', minX: x - 2.6, maxX: x + 2.6, minZ: z - 2.6, maxZ: z + 2.6, minY: y, maxY: y + 7, los: true }; obstacles.push(bb);
  const b = new CANNON.Body({ mass: 0, shape: new CANNON.Cylinder(3, 3, 7, 12) });
  b.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); b.position.set(x, y + 3.5, z); world.addBody(b);
}
const windmills = [];
function windmill(x, z) {
  const y = heightAt(x, z);
  const base = addMesh(new THREE.CylinderGeometry(2, 3, 12, 8), MATS.white, x, y + 6, z);
  solidMeshes.push(base); addCircle(x, z, 2.8, y + 12);
  addMesh(new THREE.ConeGeometry(2.6, 3, 8), MATS.roofs[0], x, y + 13.5, z);
  const hub = new THREE.Group(); hub.position.set(x, y + 11.5, z + 2.4); scene.add(hub);
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; hub.add(arm);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7, 0.15), MATS.wood); b.position.y = 4; b.castShadow = true; arm.add(b);
  }
  windmills.push(hub);
}
function runway(team) {
  const r = RUNWAYS[team], y = heightAt(r.x, r.z) + 0.06;
  const tex = canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = '#3b3d40'; g.fillRect(0, 0, w, h); speckle(g, w, h, 0.08);
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 6, w, 4); g.fillRect(0, h - 10, w, 4);
    for (let x = 90; x < w - 90; x += 46) g.fillRect(x, h / 2 - 2, 26, 4);
    for (const x0 of [12, w - 52]) for (let i = 0; i < 8; i++) g.fillRect(x0, 18 + i * 12, 40, 7);
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.magFilter = THREE.LinearFilter;
  const m = addMesh(new THREE.PlaneGeometry(r.len, r.wid), new THREE.MeshLambertMaterial({ map: tex }), r.x, y, r.z, false);
  m.rotation.x = -Math.PI / 2;
  for (let x = r.x - r.len / 2; x <= r.x + r.len / 2; x += 10)
    for (const s of [-1, 1]) addMesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), MATS.lamp, x, y + 0.15, r.z + s * (r.wid / 2 + 0.6), false);
  // windsock
  const wx = r.x, wz = r.z + (team === 'blue' ? -1 : 1) * (r.wid / 2 + 5);
  addMesh(new THREE.BoxGeometry(0.15, 5, 0.15), MATS.steel, wx, heightAt(wx, wz) + 2.5, wz);
  const sock = addMesh(new THREE.CylinderGeometry(0.4, 0.2, 2, 8), new THREE.MeshLambertMaterial({ color: 0xff6a00 }), wx + 1, heightAt(wx, wz) + 4.7, wz);
  sock.rotation.z = Math.PI / 2;
}
function hangar(x, z) {
  const m = addBlock(x, z, 22, 7, 16, MATS.metal);
  const roof = addMesh(new THREE.CylinderGeometry(8.2, 8.2, 22.4, 16, 1, false, 0, Math.PI), MATS.steel, x, m.userData.top, z);
  roof.rotation.z = Math.PI / 2; roof.scale.set(0.45, 1, 1);
  addMesh(new THREE.BoxGeometry(12, 6, 0.2), MATS.black, x, m.userData.top - 3.6, z + (z > 0 ? -8.05 : 8.05), false);
}

function buildBase(team) {
  const B = BASES[team], s = teamSide(team);
  const flagColor = TEAM_COLOR[team];
  // HQ
  house(B.x, B.z + s * 20, 16, 9, 6, { tex: TEX.concrete, flat: true, face: -s });
  addMesh(new THREE.BoxGeometry(3, 1.5, 0.2), new THREE.MeshLambertMaterial({ color: flagColor }), B.x, heightAt(B.x, B.z + s * 20) + 5, B.z + s * (20 - 4.6), false);
  // tents
  tent(B.x - 18, B.z + s * 6, false); tent(B.x - 18, B.z - s * 4, false); tent(B.x + 18, B.z + s * 8, false);
  // watchtowers
  watchtower(B.x - 27, B.z - s * 22); watchtower(B.x + 27, B.z - s * 22);
  // barriers
  for (const dx of [-24, -16, 16, 24]) addBlock(B.x + dx, B.z - s * 26, 4, 1.1, 0.9, MATS.concrete);
  // flag pole
  const fy = heightAt(B.x, B.z);
  addMesh(new THREE.CylinderGeometry(0.12, 0.12, 12, 8), MATS.steel, B.x, fy + 6, B.z);
  const fl = addMesh(new THREE.BoxGeometry(3.2, 2, 0.06), new THREE.MeshLambertMaterial({ color: flagColor }), B.x + 1.7, fy + 10.8, B.z);
  fl.userData.static = false;
  baseFlags.push(fl);
  // hangar near runway
  const r = RUNWAYS[team];
  if (r) hangar(r.x - s * 30, r.z - s * 28); else hangar(B.x - Math.sign(B.x) * 30, B.z + s * 26);
  // supplies
  for (let i = 0; i < 3; i++) addCrateStack(B.x + 10 + i * 2.5, B.z + s * 14, 2);
  addBarrel(B.x - 8, B.z + s * 14); addBarrel(B.x - 9.2, B.z + s * 14.6); addDrum(B.x - 7.8, B.z + s * 15.6);
  addCar(B.x + 12, B.z - s * 6, false, 0x556b2f); addCar(B.x - 10, B.z - s * 14, false, 0x556b2f);
  if (r) runway(team);
}
const baseFlags = [];

function buildTown() {
  // roads already painted; houses on lots away from roads
  const lots = [];
  for (const gx of [-47, -31, 31, 47]) for (const gz of [-47, -31, 31, 47]) lots.push([gx, gz]);
  for (const gx of [-47, -31, 31, 47]) for (const gz of [-14, 14]) lots.push([gx, gz]);
  for (const gz of [-47, -31, 31, 47]) for (const gx of [-14, 14]) lots.push([gx, gz]);
  let towerDone = false;
  for (const [lx, lz] of lots) {
    const x = lx + rand(-1.5, 1.5), z = lz + rand(-1.5, 1.5);
    if (pathDist(x, z) < 9.5) continue;
    if (!towerDone && Math.abs(lx) === 31 && Math.abs(lz) === 31) { tower(x, z); towerDone = true; continue; }
    const big = Math.random() < 0.25;
    house(x, z, rand(7, 10), rand(6, 9), big ? rand(7.5, 9) : rand(4, 6), { flat: big });
  }
  // fountain on the plaza
  const fy = heightAt(6, -6);
  addMesh(new THREE.CylinderGeometry(2.4, 2.6, 0.9, 16), MATS.concrete, 6, fy + 0.45, -6);
  addMesh(new THREE.CylinderGeometry(2.1, 2.1, 0.1, 16), MATS.water, 6, fy + 0.85, -6, false);
  addMesh(new THREE.CylinderGeometry(0.4, 0.5, 2.2, 8), MATS.concrete, 6, fy + 1.4, -6);
  addCircle(6, -6, 2.5, fy + 0.9);
  // market stalls and lamps
  const sc = [0xd84315, 0x1e88e5, 0x43a047, 0xfdd835, 0x8e24aa];
  [[-17, 8], [-17, -8], [17, 8], [17, -8], [8, 18], [-8, -18]].forEach(([x, z], i) => { if (pathDist(x, z) > 4) stall(x, z, sc[i % sc.length]); });
  for (const t of [-55, -40, -25, 25, 40, 55]) { lamp(4.5, t); lamp(-4.5, t + 7); lamp(t, 4.5); lamp(t + 7, -4.5); }
  // parked cars and benches
  [[3.5, 22, false, 0xc62828], [-3.5, -26, false, 0x1565c0], [24, 3.5, true, 0xf9a825], [-30, -3.5, true, 0x2e7d32], [3.5, -40, false, 0x6d4c41], [-38, 3.5, true, 0xeeeeee]]
    .forEach(([x, z, ax, c]) => addCar(x, z, ax, c));
  for (let i = 0; i < 4; i++) addCrateStack(rand(-12, 12), rand(-12, 12), 1 + (Math.random() * 2 | 0));
  addBarrel(-9, 10); addBarrel(10, 9); addDrum(-10, 11);
}
const settlements = [
  { x: PD.A.x + 35, z: PD.A.z + 35, r: 48 }, { x: PD.E.x + 25, z: PD.E.z - 25, r: 48 }, { x: PD.F.x, z: PD.F.z, r: 46 },
  { x: PD.G.x, z: PD.G.z, r: 40 }, { x: PD.B.x, z: PD.B.z, r: 32 }, { x: PD.D.x, z: PD.D.z, r: 32 },
];
if (WAKE) settlements.length = 0, settlements.push({ x: BASES.red.x, z: BASES.red.z, r: 45 }, { x: RUNWAYS.red.x, z: RUNWAYS.red.z, r: 95 });
if (HOUSTON) settlements.length = 0, settlements.push(   // the city districts (keeps trees and stray houses out)
  { x: 0, z: 0, r: 185 }, { x: PD.A.x, z: PD.A.z, r: 70 }, { x: PD.B.x + 10, z: PD.B.z + 60, r: 80 }, { x: PD.E.x, z: PD.E.z, r: 80 },
  { x: PD.F.x, z: PD.F.z, r: 70 }, { x: PD.G.x, z: PD.G.z, r: 70 }, { x: PD.D.x, z: PD.D.z, r: 75 });

function okLot(x, z, clear = 9) {
  if (pathDist(x, z) < clear) return false;
  if (inRunwayZone(x, z, 6)) return false;
  for (const p of POINTS_DEF) if (Math.hypot(x - p.x, z - p.z) < 18) return false;
  return true;
}
function ruins(P) {
  for (let i = 0; i < 9; i++) {
    const a = rand(0, Math.PI * 2), r = rand(19, 30), x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
    if (pathDist(x, z) < 5) continue;
    if (Math.random() < 0.5) addBlock(x, z, rand(4, 8), rand(1.5, 5), 0.9, MATS.brick); else addBlock(x, z, 0.9, rand(1.5, 5), rand(4, 8), MATS.brick);
  }
  for (let i = 0; i < 3; i++) addCrateStack(P.x + rand(-14, 14), P.z + rand(-14, 14), 1 + (Math.random() * 2 | 0));
}
function village(P, n, rmin, rmax) {
  let made = 0;
  for (let i = 0; i < n * 4 && made < n; i++) {
    const a = rand(0, Math.PI * 2), r = rand(rmin, rmax), x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
    if (!okLot(x, z)) continue;
    if (SNOW || DESERT) { const hs = [heightAt(x - 6, z - 6), heightAt(x + 6, z - 6), heightAt(x - 6, z + 6), heightAt(x + 6, z + 6), heightAt(x, z)]; if (Math.max(...hs) - Math.min(...hs) > 1.8) continue; }
    let clash = false; for (const o of nearbyColliders(x, z)) if (o.kind === 'box' && x > o.minX - 7 && x < o.maxX + 7 && z > o.minZ - 7 && z < o.maxZ + 7) clash = true;
    if (clash) continue;
    house(x, z, rand(7, 9.5), rand(6, 8.5), rand(4, 6.5), { face: z > P.z ? -1 : 1 }); made++;
  }
  for (let i = 0; i < 4; i++) { const a = rand(0, 6.28), x = P.x + Math.cos(a) * rand(12, 22), z = P.z + Math.sin(a) * rand(12, 22); if (okLot(x, z, 4)) lamp(x, z); }
}
function buildFarm() {
  // farm village around A
  const A = PD.A, fx = A.x + 40, fz = A.z + 40;
  house(fx - 8, fz + 18, 9, 7, 5);
  house(fx + 14, fz + 22, 12, 9, 7, { tex: TEX.brick, roof: MATS.roofs[4] });
  windmill(fx + 32, fz - 6);
  fence(fx - 20, fz - 10, fx + 14, fz - 10); fence(fx + 14, fz - 10, fx + 14, fz + 8); fence(fx - 20, fz + 8, fx + 14, fz + 8);
  const rows = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.9, 1), new THREE.MeshLambertMaterial({ color: 0xd9b84a }), 300);
  let k = 0;
  for (let x = fx - 18; x <= fx + 12 && k < 300; x += 2.4) for (let z = fz - 8; z <= fz + 6 && k < 300; z += 1.2) rows.setMatrixAt(k++, new THREE.Matrix4().makeTranslation(x, heightAt(x, z) + 0.4, z));
  rows.count = k; rows.receiveShadow = true; scene.add(rows);
  for (let i = 0; i < 7; i++) addHay(fx + 22 + rand(-5, 5), fz + 10 + rand(-5, 5));
  addCar(fx + 4, fz + 14, true, 0x2e7d32);
  village(A, 4, 22, 34);
  ruins(PD.B); house(PD.B.x + 30, PD.B.z + 25, 9, 8, 5);
  ruins(PD.D); house(PD.D.x - 30, PD.D.z - 25, 10, 8, 5);
  // industrial yard near E
  const E = PD.E, ex = E.x + 30, ez = E.z - 28;
  house(ex + 18, ez - 14, 20, 12, 8, { tex: TEX.metal, flat: true });
  container(ex - 12, ez + 18, true, 0xc0392b); container(ex - 12, ez + 21.5, true, 0x2471a3); container(ex - 12, ez + 19.8, true, 0x27ae60, heightAt(ex - 12, ez + 20) + 2.6);
  container(ex - 22, ez - 18, false, 0xd68910); container(ex - 25.5, ez - 18, false, 0x7d3c98);
  fuelTank(ex + 26, ez + 12); fuelTank(ex + 26, ez + 26);
  for (let i = 0; i < 6; i++) addBarrel(ex + 6 + rand(-4, 4), ez + 6 + rand(-4, 4));
  for (let i = 0; i < 3; i++) addDrum(ex + 2 + rand(-3, 3), ez + 10 + rand(-3, 3));
  addCrateStack(ex - 4, ez - 6, 3); addCar(ex + 4, ez - 22, true, 0x37474f);
  // lakeside village at F
  village(PD.F, 8, 20, 40);
  addCar(PD.F.x + 20, PD.F.z + 4, false, 0x1565c0); addCar(PD.F.x - 22, PD.F.z - 6, true, 0xc62828);
  // hill fort at G: stone walls with gaps and towers
  const G = PD.G, stone = new THREE.MeshLambertMaterial({ color: 0x8d8a82, map: texRepeat(TEX.concrete, 4, 1) });
  for (const [dx, dz, w, d] of [[-14, -26, 20, 2], [14, -26, 20, 2], [-14, 26, 20, 2], [14, 26, 20, 2], [-26, -14, 2, 20], [-26, 14, 2, 20], [26, -14, 2, 20], [26, 14, 2, 20]]) {
    if (pathDist(G.x + dx, G.z + dz) < 6) continue;
    addBlock(G.x + dx, G.z + dz, w, 3, d, stone);
  }
  for (const [dx, dz] of [[-26, -26], [26, -26], [-26, 26], [26, 26]]) watchtower(G.x + dx, G.z + dz);
  // scattered farmhouses across the countryside
  let made = 0;
  for (let i = 0; i < 200 && made < 14; i++) {
    const x = rand(-EDGE + 40, EDGE - 40), z = rand(-EDGE + 60, EDGE - 60);
    if (!okLot(x, z, 14) || Math.hypot(x, z) < 80 || heightAt(x, z) < 1 || heightAt(x, z) > 18) continue;
    if (settlements.some(s => Math.hypot(x - s.x, z - s.z) < s.r + 10) || Math.abs(Math.abs(z) - 450) < 60) continue;
    if (groundMin(x, z, 6, 6) < heightAt(x, z) - 2) continue;
    house(x, z, rand(7, 10), rand(6, 8), rand(4, 6)); if (Math.random() < 0.5) addHay(x + 8, z + rand(-4, 4));
    settlements.push({ x, z, r: 14 }); made++;
  }
}
function fortifyPoint(p) {
  const r = 9.5;
  sandbagWall(p.x, p.z - r, 6, 1); sandbagWall(p.x, p.z + r, 6, 1);
  sandbagWall(p.x - r, p.z, 1, 6); sandbagWall(p.x + r, p.z, 1, 6);
  addCrateStack(p.x + 5, p.z + 5.5, 2); addCrateStack(p.x - 6, p.z - 4, 1);
  addBarrel(p.x - 4, p.z + 6); addBarrel(p.x + 6, p.z - 5);
}

// ---------- nature ----------
let treeTrunks = null;
function buildNature() {
  const oaks = [], pines = [], rocks = [], bushes = [];
  const okSpot = (x, z, clear) => {
    if (Math.abs(x) > EDGE - 4 || Math.abs(z) > EDGE - 4) return false;
    for (const p of POINTS_DEF) if (Math.hypot(x - p.x, z - p.z) < 26) return false;
    for (const t of TEAMS) {
      if (Math.hypot(x - BASES[t].x, z - BASES[t].z) < 46) return false;
      if (inRunwayZone(x, z)) return false;
    }
    if (Math.hypot(x, z) < 64) return false;
    for (const s of settlements) if (Math.hypot(x - s.x, z - s.z) < s.r) return false;
    if (pathDist(x, z) < clear) return false;
    const h = heightAt(x, z);
    return h > 0.6 && h < 30;
  };
  let tries = 0;
  while (oaks.length + pines.length < (DESERT ? 260 : 2600) && tries++ < 60000) {
    const x = rand(-EDGE, EDGE), z = rand(-EDGE, EDGE);
    if (vnoise(x * 0.02 + 100, z * 0.02) < 0.42 && Math.random() < 0.8) continue;
    if (!okSpot(x, z, 10)) continue;
    const s = rand(0.8, 1.35), h = heightAt(x, z);
    (heightAt(x, z) > 12 || Math.random() < 0.4 ? pines : oaks).push({ x, z, y: h, s, r: rand(0, Math.PI) });
    addCircle(x, z, 0.55 * s, h + 7 * s);
  }
  tries = 0;
  while (rocks.length < 700 && tries++ < 20000) {
    const x = rand(-HALF + 10, HALF - 10), z = rand(-HALF + 10, HALF - 10);
    const h = heightAt(x, z);
    if (!(okSpot(x, z, 8) || (h > 15 && Math.abs(x) < HALF - 12 && Math.abs(z) < HALF - 12 && pathDist(x, z) > 8))) continue;
    const s = Math.random() < 0.15 ? rand(2.5, 4.5) : rand(0.5, 2);
    rocks.push({ x, z, y: h, s, r: rand(0, 6) });
    if (s > 0.9) addCircle(x, z, s * 0.85, h + s * 0.8);
  }
  tries = 0;
  while (bushes.length < (DESERT ? 700 : 1800) && tries++ < 25000) {
    const x = rand(-EDGE, EDGE), z = rand(-EDGE, EDGE);
    if (!okSpot(x, z, 4)) continue;
    bushes.push({ x, z, y: heightAt(x, z), s: rand(0.6, 1.3), r: rand(0, 6) });
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function inst(geo, mat, list, partY, colorFn, shadow = true) {
    if (!list.length) return new THREE.Object3D();
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((t, i) => {
      q.setFromAxisAngle(up, t.r); sc.set(t.s, t.s, t.s); p.set(t.x, t.y + partY * t.s, t.z);
      m4.compose(p, q, sc); im.setMatrixAt(i, m4);
      if (colorFn) im.setColorAt(i, colorFn(t));
    });
    im.castShadow = shadow; im.receiveShadow = true; scene.add(im); return im;
  }
  const leafCol = DESERT ? () => new THREE.Color().setHSL(rand(0.17, 0.22), rand(0.3, 0.42), rand(0.3, 0.38)) : SNOW ? () => new THREE.Color().setHSL(rand(0.55, 0.6), rand(0.05, 0.12), rand(0.8, 0.9)) : () => new THREE.Color().setHSL(rand(0.22, 0.32), rand(0.45, 0.62), rand(0.27, 0.38));
  const pineCol = DESERT ? () => new THREE.Color().setHSL(rand(0.2, 0.26), rand(0.25, 0.35), rand(0.24, 0.3)) : SNOW ? () => new THREE.Color().setHSL(rand(0.38, 0.44), rand(0.25, 0.4), rand(0.14, 0.2)) : () => new THREE.Color().setHSL(rand(0.36, 0.42), rand(0.35, 0.5), rand(0.2, 0.28));
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
  const leafMat = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true, shininess: 0, specular: 0x000000 });
  // soft rounded leaves and needles, shaded darker underneath
  const softLeaf = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
  const DET = 1, BDET = 1;
  const birches = oaks.filter((t, i) => i % 5 === 0), broad = oaks.filter((t, i) => i % 5 !== 0);
  const trunkGeo = shadeY(new THREE.CylinderGeometry(0.24, 0.48, 3.6, 10), 0.7, 1.05);
  const trunkMatV = new THREE.MeshLambertMaterial({ color: 0x6b4a2b, vertexColors: true });
  const t1 = inst(trunkGeo, trunkMatV, broad, 1.8);
  inst(new THREE.CylinderGeometry(0.09, 0.16, 1.8, 6).rotateZ(-0.9).translate(0.7, 0.9, 0), trunkMat, broad, 1.8, null, false);   // a branch
  inst(blobGeo(2.4, DET, 0.16), softLeaf, broad, 4.8, leafCol);
  inst(blobGeo(1.8, LITE ? 0 : BDET, 0.2).translate(1.5, -0.4, 0.5), softLeaf, broad, 4.8, leafCol, false);
  inst(blobGeo(1.7, LITE ? 0 : BDET, 0.2).translate(-1.3, 0.3, -0.7), softLeaf, broad, 4.8, leafCol, false);
  inst(blobGeo(1.4, LITE ? 0 : BDET, 0.2).translate(0.2, 1.5, 0.3), softLeaf, broad, 4.8, leafCol, false);
  const birchGeo = shadeY(new THREE.CylinderGeometry(0.18, 0.28, 5, 9), 0.8, 1.05);
  const t3 = inst(birchGeo, new THREE.MeshLambertMaterial({ color: 0xe8e4da, vertexColors: true }), birches, 2.5);
  inst(blobGeo(1.6, DET, 0.18).scale(1, 1.6, 1), softLeaf, birches, 5.6, SNOW ? leafCol : () => new THREE.Color().setHSL(rand(0.16, 0.24), 0.6, rand(0.38, 0.48)));
  inst(blobGeo(1.0, LITE ? 0 : BDET, 0.2).translate(0.9, -0.9, 0.2), softLeaf, birches, 5.6, SNOW ? leafCol : () => new THREE.Color().setHSL(rand(0.16, 0.24), 0.6, rand(0.4, 0.5)), false);
  const t2 = inst(shadeY(new THREE.CylinderGeometry(0.2, 0.4, 2.6, 9), 0.7, 1.0), trunkMatV, pines, 1.3);
  const pineGeo = (r, h) => {
    const g = new THREE.ConeGeometry(r, h, 10, 1), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < -h / 2 + 0.01) { const a = Math.atan2(pos.getZ(i), pos.getX(i)); pos.setY(i, pos.getY(i) - (Math.sin(a * 6) * 0.5 + 0.5) * 0.35); }   // ragged, drooping hem
    g.computeVertexNormals(); return shadeY(g, 0.55, 1.12);
  };
  [[2.9, 3.0, 3.4], [2.3, 2.6, 4.9], [1.6, 2.2, 6.3], [0.9, 1.7, 7.5]].forEach(([r, h, y], i) => inst(pineGeo(r, h), softLeaf, pines, y, pineCol, i < 2));
  // snow lying on each layer of the pines
  if (SNOW) [[2.4, 1.3, 4.25], [1.9, 1.1, 5.75], [1.3, 0.95, 7.05], [0.7, 0.8, 8.0]].forEach(([r, h, y]) => inst(shadeY(new THREE.ConeGeometry(r, h, 10, 1), 0.85, 1.05), softLeaf, pines, y, () => new THREE.Color(0xf2f6fb), false));
  treeTrunks = [t1, t2, t3];
  // rocks: more facets, mossy on top
  const rockMat = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true, shininess: 4, vertexColors: true });
  const rockGeo = blobGeo(1, 1, 0.24, [0.7, 1.08], true).scale(1.25, 0.78, 1.05);
  { const c = rockGeo.attributes.color, pos = rockGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0.45) { c.setXYZ(i, c.getX(i) * 0.82, c.getY(i) * 1.02, c.getZ(i) * 0.72); } }
  inst(rockGeo, rockMat, rocks, 0.3, () => new THREE.Color().setHSL(0.1, 0.05, rand(0.42, 0.6)), false);
  if (LITE) bushes.splice(0, Math.floor(bushes.length * 0.6));
  const bushCol = DESERT ? () => new THREE.Color().setHSL(rand(0.1, 0.15), 0.3, rand(0.38, 0.48)) : SNOW ? () => new THREE.Color().setHSL(0.58, 0.08, rand(0.86, 0.94)) : leafCol;   // on the snow map bushes are buried in snow
  inst(blobGeo(0.85, LITE ? 0 : 1, 0.22).scale(1.2, SNOW ? 0.6 : 0.8, 1.1), softLeaf, bushes, SNOW ? 0.3 : 0.5, bushCol, false);
  inst(blobGeo(0.6, 0, 0.22).translate(0.7, 0.1, 0.3), softLeaf, bushes, 0.4, leafCol, false);
  solidMeshes.push(...treeTrunks);

  // grass tufts and flowers
  const tufts = [], flowers = [];
  for (let i = 0; i < 10000; i++) {
    const x = rand(-EDGE, EDGE), z = rand(-EDGE, EDGE), h = heightAt(x, z);
    if (h < 0.5 || h > 20 || pathDist(x, z) < 3) continue;
    let ok = true; for (const t of TEAMS) if (Math.hypot(x - BASES[t].x, z - BASES[t].z) < 32) ok = false;
    if (Math.hypot(x, z) < 16) ok = false;
    if (!ok) continue;
    if (Math.random() < 0.18) flowers.push({ x, z, y: h, s: 1, r: rand(0, 6) }); else tufts.push({ x, z, y: h, s: rand(0.7, 1.4), r: rand(0, 6) });
  }
  if (LITE) { tufts.length = 0; flowers.length = 0; }
  if (SNOW || DESERT) { flowers.length = 0; tufts.length = Math.floor(tufts.length * (DESERT ? 0.35 : 0.25)); }   // only a little dry grass pokes out of the snow
  const tuftCol = SNOW || DESERT ? () => new THREE.Color().setHSL(rand(0.09, 0.13), 0.35, rand(0.45, 0.58)) : () => new THREE.Color().setHSL(rand(0.22, 0.3), 0.55, rand(0.3, 0.42));
  inst(shadeY(new THREE.ConeGeometry(0.14, 0.7, 4), 0.6, 1.15), softLeaf, tufts, 0.3, tuftCol, false);
  inst(shadeY(new THREE.ConeGeometry(0.1, 0.55, 4).translate(0.18, -0.05, 0.1), 0.6, 1.15), softLeaf, tufts, 0.3, tuftCol, false);
  inst(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 3), new THREE.MeshLambertMaterial({ color: 0x3f7a2a }), flowers, 0.25, null, false);
  inst(blobGeo(0.14, 1, 0.1, [0.85, 1.1]), new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }), flowers, 0.52, () => new THREE.Color(pick([0xffeb3b, 0xffffff, 0xe53935, 0xab47bc, 0xff9800])), false);
}

// ---------- clouds ----------
const clouds = [];
const birds = [];
function buildClouds() {
  const mat = new THREE.MeshPhongMaterial({ color: SNOW ? 0xc9d0d8 : 0xffffff, emissive: SNOW ? 0x8f99a5 : 0x7d8a98, shininess: 0, specular: 0x000000, vertexColors: true });
  for (let i = 0; i < (SNOW ? 160 : DESERT ? 25 : 110); i++) {
    const g = new THREE.Group();
    const n = 5 + (Math.random() * 7 | 0), len = rand(30, 70);
    for (let j = 0; j < n; j++) {
      const r = rand(7, 15) * (1 - Math.abs(j / n - 0.5));
      const b = new THREE.Mesh(blobGeo(Math.max(r, 5), 1, 0.12, [0.78, 1.08]), mat);
      b.scale.set(1.3, 0.75, 1.1);
      b.position.set((j / n - 0.5) * len + rand(-4, 4), rand(-2, 4), rand(-10, 10)); g.add(b);
    }
    g.position.set(rand(-1300, 1300), SNOW ? rand(85, 130) : rand(120, 190), rand(-1300, 1300));
    g.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    const merged = new THREE.Mesh(mergeGeos(g.children.map(b => prepGeo(b, inv))), mat);
    merged.position.copy(g.position);
    scene.add(merged); clouds.push(merged);
  }
  // flocks of birds
  const bm = new THREE.MeshLambertMaterial({ color: 0x2b2b2b, side: THREE.DoubleSide });
  for (let f = 0; f < 12; f++) {
    const flock = new THREE.Group(); const cx = rand(-HALF * 0.7, HALF * 0.7), cz = rand(-HALF * 0.7, HALF * 0.7), alt = rand(45, 75), r = rand(40, 90), sp = rand(0.12, 0.25) * (Math.random() < 0.5 ? -1 : 1);
    const wings = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Group(); b.position.set(-Math.abs(i - 2.5) * 2.2, rand(-0.6, 0.6), (i - 2.5) * 2.2);
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.7, 4), bm); body.rotation.z = -Math.PI / 2; b.add(body);
      const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1.1), bm); wl.position.z = 0.5; wl.rotation.x = Math.PI / 2;
      const wr = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1.1), bm); wr.position.z = -0.5; wr.rotation.x = Math.PI / 2;
      const pl = new THREE.Group(); pl.add(wl); const pr = new THREE.Group(); pr.add(wr);
      b.add(pl, pr); wings.push([pl, pr, rand(0, 6)]); flock.add(b);
    }
    scene.add(flock); birds.push({ flock, wings, cx, cz, alt, r, sp, a: rand(0, 6) });
  }
}
function updateBirds(dt, t) {
  for (const b of birds) {
    b.a += b.sp * dt;
    b.flock.position.set(b.cx + Math.cos(b.a) * b.r, b.alt + Math.sin(t * 0.5 + b.cx) * 3, b.cz + Math.sin(b.a) * b.r);
    b.flock.rotation.y = -b.a + (b.sp > 0 ? Math.PI : 0) + Math.PI / 2;
    for (const [l, r, ph] of b.wings) { const f = Math.sin(t * 9 + ph) * 0.6; l.rotation.x = f; r.rotation.x = -f; }
  }
}

// ---------- physics props ----------
const props = [];
function addProp(mesh, body, kind, extra = {}) {
  mesh.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const p = Object.assign({ mesh, body, kind, hp: 3, exploded: false }, extra);
  mesh.traverse(o => { if (o.isMesh) o.userData.prop = p; });
  body.sleepSpeedLimit = 0.3; body.sleepTimeLimit = 0.6;
  scene.add(mesh); world.addBody(body); props.push(p);
  return p;
}
function addCrate(x, y, z, s = 1) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), MATS.crate);
  const b = new CANNON.Body({ mass: 3 * s, shape: new CANNON.Box(new CANNON.Vec3(s / 2, s / 2, s / 2)) });
  b.position.set(x, y, z); b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rand(-0.2, 0.2));
  return addProp(m, b, 'crate');
}
function addCrateStack(x, z, n) {
  const y = heightAt(x, z);
  for (let r = 0; r < n; r++) for (let i = 0; i < n - r; i++) addCrate(x + (i - (n - r - 1) / 2) * 1.05, y + 0.55 + r * 1.02, z, 1);
}
function addBarrel(x, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1, 14), MATS.barrel);
  const b = new CANNON.Body({ mass: 4, shape: new CANNON.Box(new CANNON.Vec3(0.33, 0.5, 0.33)) });
  b.position.set(x, heightAt(x, z) + 0.55, z);
  return addProp(m, b, 'barrel');
}
function addDrum(x, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1, 14), MATS.drum);
  const b = new CANNON.Body({ mass: 4, shape: new CANNON.Box(new CANNON.Vec3(0.33, 0.5, 0.33)) });
  b.position.set(x, heightAt(x, z) + 0.55, z);
  return addProp(m, b, 'drum');
}
function addHay(x, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.5), MATS.hay);
  const b = new CANNON.Body({ mass: 6, shape: new CANNON.Box(new CANNON.Vec3(0.75, 0.55, 0.75)) });
  b.position.set(x, heightAt(x, z) + 0.6, z);
  return addProp(m, b, 'hay');
}
function addCar(x, z, alongX, color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 4.2), paint); body.position.y = -0.15; g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2), paint); cab.position.set(0, 0.55, 0.2); g.add(cab);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.45, 2.0), new THREE.MeshLambertMaterial({ color: 0x9fc5e8 })); glass.position.set(0, 0.58, 0.2); glass.scale.set(1.01, 1, 0.9); g.add(glass);
  for (const [wx, wz] of [[-0.95, -1.3], [0.95, -1.3], [-0.95, 1.3], [0.95, 1.3]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14), MATS.black); w.rotation.z = Math.PI / 2; w.position.set(wx, -0.5, wz); g.add(w);
    const hc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 10), MATS.steel); hc.rotation.z = Math.PI / 2; hc.position.set(wx, -0.5, wz); g.add(hc);
  }
  for (const s of [-0.6, 0.6]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 10), MATS.lamp); l.rotation.x = Math.PI / 2; l.position.set(s, -0.05, -2.11); g.add(l);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: 0xc62828 })); t.position.set(s, -0.05, 2.11); g.add(t);
  }
  for (const z of [-2.15, 2.15]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.18, 0.12), MATS.steel); b.position.set(0, -0.42, z); g.add(b); }
  const roofR = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2.0, 12, 1, false, -Math.PI / 2, Math.PI), paint); roofR.rotation.x = Math.PI / 2; roofR.scale.set(1, 1, 0.3); roofR.position.set(0, 0.86, 0.2); g.add(roofR);
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.2), MATS.black); m.position.set(s * 0.95, 0.35, -0.85); g.add(m); }
  const b = new CANNON.Body({ mass: 70, shape: new CANNON.Box(new CANNON.Vec3(0.95, 0.65, 2.1)) });
  b.position.set(x, heightAt(x, z) + 0.95, z);
  if (alongX) b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
  return addProp(g, b, 'car', { hp: 8 });
}

// ---------- control points ----------
const points = [];
function letterTex(letter, color) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
  g.lineWidth = 8; g.strokeStyle = color; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
  g.fillStyle = color; g.font = 'bold 72px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letter, 64, 68);
  return new THREE.CanvasTexture(c);
}
function buildPoints() {
  for (const def of POINTS_DEF) {
    const y = heightAt(def.x, def.z);
    addMesh(new THREE.CylinderGeometry(2, 2.3, 0.35, 16), MATS.concrete, def.x, y + 0.1, def.z);
    addMesh(new THREE.CylinderGeometry(0.12, 0.12, 10, 8), MATS.steel, def.x, y + 5, def.z);
    const flagMat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const flag = addMesh(new THREE.BoxGeometry(2.6, 1.6, 0.06), flagMat, def.x + 1.4, y + 2.5, def.z);
    flag.userData.static = false;
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(14.2, 15, 64), ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.set(def.x, y + 0.25, def.z); scene.add(ring);
    const spriteMat = new THREE.SpriteMaterial({ map: letterTex(def.n, '#ffffff'), depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(spriteMat); sprite.scale.set(5, 5, 1); sprite.position.set(def.x, y + 14, def.z); sprite.renderOrder = 10; scene.add(sprite);
    points.push({ name: def.n, x: def.x, z: def.z, y, r: 15, owner: null, progress: 0, flag, flagMat, ringMat, spriteMat, shownColor: '', blueIn: 0, redIn: 0 });
    fortifyPoint(def);
  }
}

function mergeGeos(geos) {
  let n = 0; for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of geos) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += c;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  m.computeBoundingSphere(); m.computeBoundingBox();
  return m;
}
function prepGeo(mesh, inverse) {
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const mat = inverse ? inverse.clone().multiply(mesh.matrixWorld) : mesh.matrixWorld;
  g.applyMatrix4(mat); return g;
}
// combine static meshes that share a material into one draw call
function mergeStatic() {
  scene.updateMatrixWorld(true);
  const groups = new Map();
  for (const m of [...scene.children]) {
    if (!m.isMesh || !m.userData.static || Array.isArray(m.material)) continue;
    let a = groups.get(m.material); if (!a) groups.set(m.material, a = []); a.push(m);
  }
  const solidSet = new Set(solidMeshes);
  for (const [mat, list] of groups) {
    if (list.length < 2) continue;
    const mm = new THREE.Mesh(mergeGeos(list.map(m => prepGeo(m))), mat);
    mm.castShadow = list.some(m => m.castShadow); mm.receiveShadow = true;
    scene.add(mm);
    let solid = false;
    for (const m of list) { scene.remove(m); m.geometry.dispose(); if (solidSet.has(m)) { solidSet.delete(m); solid = true; } }
    if (solid) solidSet.add(mm);
  }
  solidMeshes.length = 0; solidMeshes.push(...solidSet);
}

function buildWorld() {
  buildTerrain();
  if (!WAKE) buildBunkers();
  if (typeof buildNests === 'function') buildNests();
  if (!SNOW && !HOUSTON && !WAKE) { buildTown(); buildFarm(); }
  TEAMS.forEach(t => { if (!(WAKE && t === 'blue')) buildBase(t); });
  buildPoints();
  if (!WAKE) buildTunnels();
  if (!WAKE) buildNature();
  buildClouds();
  if (SNOW && typeof buildSnowExtras === 'function') buildSnowExtras();
  if (DESERT && typeof buildDesertExtras === 'function') buildDesertExtras();
  if (HOUSTON && typeof buildHoustonExtras === 'function') buildHoustonExtras();
  if (WAKE && typeof buildWakeExtras === 'function') buildWakeExtras();
  mergeStatic();
}
