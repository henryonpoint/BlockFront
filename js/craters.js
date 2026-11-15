// ===================== craters.js : bombs dig holes =====================
// A bomb that hits the ground pushes the earth down into a bowl with a raised rim, darkens it with scorch,
// throws up dirt and leaves smoking embers for a while. Soldiers and vehicles walk and drive through the dip,
// and you can take cover in it. Every computer makes the same crater because every computer sees the bomb land.
const craters = [];
const _crScorch = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  r.addColorStop(0, 'rgba(20,16,12,0.9)'); r.addColorStop(0.55, 'rgba(35,28,20,0.65)'); r.addColorStop(1, 'rgba(40,32,24,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, d = 30 + Math.random() * 32; g.fillStyle = 'rgba(25,20,15,0.5)'; g.beginPath(); g.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 2 + Math.random() * 4, 0, 6.28); g.fill(); }
  const t = new THREE.CanvasTexture(c); return t;
})();
const _crMat = new THREE.MeshBasicMaterial({ map: _crScorch, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });

function makeCrater(at, blast, huge) {
  if (!terrainMesh || !isFinite(at.x)) return;
  const ground = heightAt(at.x, at.z);
  if (at.y > ground + (huge ? 12 : 3)) return;                                   // went off in the air
  if (waterDepth(at.x, at.z) > 0 || (typeof undergroundAt === 'function' && undergroundAt(at.x, at.z, at.y - 1))) return;
  if (SNOW && at.y < ICE_Y + 0.4 && LAKES.some(L => Math.hypot(at.x - L.x, at.z - L.z) < L.r)) return;   // frozen lakes stay flat
  const r = huge ? 22 : clamp(blast * 0.42, 4, 9), depth = huge ? 5 : clamp(blast * 0.12, 1, 2.4);
  const geo = terrainMesh.geometry, pos = geo.attributes.position, col = geo.attributes.color, nor = geo.attributes.normal;
  const i0 = Math.max(1, Math.floor((at.x - r * 1.5 + HALF) / CELL)), i1 = Math.min(GRID - 1, Math.ceil((at.x + r * 1.5 + HALF) / CELL));
  const j0 = Math.max(1, Math.floor((at.z - r * 1.5 + HALF) / CELL)), j1 = Math.min(GRID - 1, Math.ceil((at.z + r * 1.5 + HALF) / CELL));
  for (let iz = j0; iz <= j1; iz++) for (let ix = i0; ix <= i1; ix++) {
    const x = -HALF + ix * CELL, z = -HALF + iz * CELL, d = Math.hypot(x - at.x, z - at.z) / r;
    if (d > 1.5) continue;
    let dh = 0;
    if (d < 1) dh = -depth * (1 - d * d);                          // the bowl
    else dh = depth * 0.22 * Math.sin((d - 1) / 0.5 * Math.PI);     // a raised rim of thrown-up earth
    const k = iz * W1 + ix;
    HGRID[k] += dh; pos.setY(k, HGRID[k]);
    const s = d < 1.1 ? 0.55 + 0.35 * d * d : 1;                   // scorched earth
    col.setXYZ(k, col.getX(k) * s, col.getY(k) * s * 0.97, col.getZ(k) * s * 0.92);
    if (TERRAIN_HF) TERRAIN_HF.data[ix][GRID - iz] = HGRID[k];
  }
  // fresh normals for the changed patch (same sum as when the ground was first built)
  for (let iz = j0 - 1; iz <= j1 + 1; iz++) for (let ix = i0 - 1; ix <= i1 + 1; ix++) {
    if (ix < 1 || iz < 1 || ix >= GRID || iz >= GRID) continue;
    const hx = HGRID[iz * W1 + ix + 1] - HGRID[iz * W1 + ix - 1], hz = HGRID[(iz + 1) * W1 + ix] - HGRID[(iz - 1) * W1 + ix];
    const nx = -hx, ny = 2 * CELL, nz = -hz, l = Math.hypot(nx, ny, nz);
    nor.setXYZ(iz * W1 + ix, nx / l, ny / l, nz / l);
  }
  pos.needsUpdate = true; col.needsUpdate = true; nor.needsUpdate = true;
  geo.computeBoundingSphere();
  if (TERRAIN_HF) { try { TERRAIN_HF.updateMaxValue(); TERRAIN_HF.updateMinValue(); TERRAIN_HF._cachedPillars = {}; } catch (e) { } }
  // scorch mark, dirt and smoke
  const sc = new THREE.Mesh(new THREE.CircleGeometry(r * 1.35, 20), _crMat); sc.rotation.x = -Math.PI / 2; sc.rotation.z = Math.random() * 6.28;
  sc.position.set(at.x, heightAt(at.x, at.z) + 0.12, at.z); scene.add(sc);
  // the scorch disc sits flat, so lay it on the bowl by bending its vertices to the ground
  const sp = sc.geometry.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const lx = sp.getX(i), ly = sp.getY(i), c = Math.cos(sc.rotation.z), s = Math.sin(sc.rotation.z);
    const wx = at.x + lx * c - ly * s, wz = at.z - (lx * s + ly * c);
    sp.setZ(i, heightAt(wx, wz) + 0.12 - sc.position.y);
  }
  sp.needsUpdate = true;
  const dirt = SNOW ? 0xd8dde2 : DESERT ? 0xb08a5a : 0x5a4630;
  burst(new THREE.Vector3(at.x, ground + 0.5, at.z), 30, dirt, 14, 1.4, 0.3);
  craters.push({ x: at.x, z: at.z, y: heightAt(at.x, at.z), r, t: 0, mesh: sc });
  if (craters.length > 40) { const o = craters.shift(); scene.remove(o.mesh); o.mesh.geometry.dispose(); }
}
// craters smoulder for a while after the blast
function updateCraters(dt) {
  for (const c of craters) {
    if (c.t > 25) continue;
    c.t += dt; c.smT = (c.smT || 0) - dt;
    if (c.smT <= 0) { c.smT = 0.35 + c.t * 0.05; smokePuff(new THREE.Vector3(c.x + rand(-c.r, c.r) * 0.4, c.y + 0.3, c.z + rand(-c.r, c.r) * 0.4), 0x3a3a3a, 0.5, 2.2, 1.2); }
  }
}
