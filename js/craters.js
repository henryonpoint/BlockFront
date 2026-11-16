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
  const r = huge === 'mega' ? 140 : huge ? 22 : clamp(blast * 0.42, 4, 9), depth = huge === 'mega' ? 24 : huge ? 5 : clamp(blast * 0.12, 1, 2.4);   // the mega nuke leaves a giant bowl
  const geo = terrainMesh.geometry, pos = geo.attributes.position, col = geo.attributes.color, nor = geo.attributes.normal;
  const i0 = Math.max(1, Math.floor((at.x - r * 1.5 + HALF) / CELL)), i1 = Math.min(GRID - 1, Math.ceil((at.x + r * 1.5 + HALF) / CELL));
  const j0 = Math.max(1, Math.floor((at.z - r * 1.5 + HALF) / CELL)), j1 = Math.min(GRID - 1, Math.ceil((at.z + r * 1.5 + HALF) / CELL));
  for (let iz = j0; iz <= j1; iz++) for (let ix = i0; ix <= i1; ix++) {
    const x = -HALF + ix * CELL, z = -HALF + iz * CELL, d = Math.hypot(x - at.x, z - at.z) / r;
    if (d > 1.5) continue;
    if (DAM && Math.abs(x) < 180 && z > -74 && z < -44 && !(typeof DAMWALL !== 'undefined' && DAMWALL.broken && Math.abs(x) < 62)) continue;   /* the dam is solid concrete: blasts crack it, they don't dig under it */
    let dh = 0;
    if (d < 1) dh = -depth * (1 - d * d);                          // the bowl
    else dh = depth * 0.22 * Math.sin((d - 1) / 0.5 * Math.PI);     // a raised rim of thrown-up earth
    if (!huge) for (const P of POINTS_DEF) { const pd = Math.hypot(x - P.x, z - P.z); if (pd < 6) dh *= smooth(2.5, 6, pd); }   /* small blasts leave the flag a mound; a nuke takes it down with the ground */   // the flag keeps a little mound to stand on
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
  // a nuke drops the control points with the ground: move each flag, pole and ring down to the new surface
  if (huge) for (const p of points) {
    if (Math.hypot(p.x - at.x, p.z - at.z) > r * 1.5) continue;
    const dy = heightAt(p.x, p.z) - p.y; if (Math.abs(dy) < 0.05) continue;
    for (const o of scene.children) if (Math.hypot(o.position.x - p.x, o.position.z - p.z) < 3 && o.position.y > p.y - 1 && o.position.y < p.y + 16) o.position.y += dy;
    p.y += dy;
  }
  // everything standing on the ground the blast moved goes down (or up the rim) with it, so nothing is left floating:
  // turrets, flags, crates, fences, wrecks, sheds, signs, and the instanced trees and rocks
  settleOnCrater(at, r, depth);
  // the ground itself is scorched (its colours above); no separate scorch disc, which used to stay behind as a
  // floating layer once later blasts dug the ground out from under it
  clearAround(at, huge === 'mega' ? 230 : huge ? 34 : 0, huge === 'mega' ? 320 : huge ? 46 : r * 1.1);
  const sc = null;
  const dirt = SNOW ? 0xd8dde2 : DESERT ? 0xb08a5a : 0x5a4630;
  burst(new THREE.Vector3(at.x, ground + 0.5, at.z), 30, dirt, 14, 1.4, 0.3);
  craters.push({ x: at.x, z: at.z, y: heightAt(at.x, at.z), r, t: 0, mesh: sc });
  if (craters.length > 40) craters.shift();
}
// craters smoulder for a while after the blast
function updateCraters(dt) {
  for (const c of craters) {
    if (c.t > 9) continue;   /* smoke for a few seconds, then the view clears */
    c.t += dt; c.smT = (c.smT || 0) - dt;
    if (c.smT <= 0) { c.smT = 0.35 + c.t * 0.05; smokePuff(new THREE.Vector3(c.x + rand(-c.r, c.r) * 0.4, c.y + 0.3, c.z + rand(-c.r, c.r) * 0.4), 0x3a3a3a, 0.5, 2.2, 1.2); }
  }
}

// what a blast takes away: trees, buildings and props it blows apart (so nothing is left floating over a crater).
// Underground rooms (bunkers, tunnels) are left alone.
function clearAround(at, rBuild, rTree) {
  const ground0 = rawHeight(at.x, at.z);
  if (rTree > 0) scene.traverse(o => {
    if (!o.isInstancedMesh || o.userData.kept) return;
    const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); let ch = false;
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); m4.decompose(p, q, sc); if (sc.x < 1e-3) continue; if (Math.hypot(p.x - at.x, p.z - at.z) < rTree && p.y > rawHeight(p.x, p.z) - 3) { sc.setScalar(0); m4.compose(p, q, sc); o.setMatrixAt(i, m4); ch = true; } }
    if (ch) o.instanceMatrix.needsUpdate = true;
  });
  for (const c of circles) if (c.r > 0 && Math.hypot(c.x - at.x, c.z - at.z) < Math.max(rTree, rBuild) && c.top > c.base - 1) { c.r = 0; c.top = -1e4; }
  if (rBuild <= 0) return;
  const gone = new Set(), box = new THREE.Box3(), ctr = new THREE.Vector3(), v = new THREE.Vector3();
  for (const o of scene.children) {
    if (!o.isMesh || o.isInstancedMesh || o === terrainMesh || o === waterMesh || (typeof sky !== 'undefined' && o === sky) || !o.visible || o.userData.char || o.userData.gv || o.userData.kept) continue;
    if (o.material && o.material.transparent) continue;                       // water and see-through effects stay
    box.setFromObject(o); if (box.isEmpty()) continue; box.getCenter(ctr);
    if (box.min.y > rawHeight(ctr.x, ctr.z) + 80) continue;                    // clouds and things high in the sky stay
    const big = box.max.x - box.min.x > 120 || box.max.z - box.min.z > 120;
    if (!big) {
      if (Math.hypot(ctr.x - at.x, ctr.z - at.z) > rBuild) continue;
      const lowG = Math.min(heightAt(box.min.x, box.min.z), heightAt(box.max.x, box.max.z), heightAt(box.min.x, box.max.z), heightAt(box.max.x, box.min.z), heightAt(ctr.x, ctr.z));
      if (box.max.y < rawHeight(ctr.x, ctr.z) - 1.5 && box.max.y < lowG - 0.3) continue;   // still underground: bunkers and tunnels stay (unless the blast dug them out)
      o.visible = false; gone.add(o); continue;
    }
    // a merged mesh (many buildings in one): remove just the pieces inside the blast
    if (box.min.x > at.x + rBuild || box.max.x < at.x - rBuild || box.min.z > at.z + rBuild || box.max.z < at.z - rBuild) continue;
    const g = o.geometry, pos = g.attributes.position; if (!pos) continue;
    o.updateMatrixWorld(); const mw = o.matrixWorld, idx = g.index, n = idx ? idx.count : pos.count; let ch = false;
    for (let t = 0; t < n; t += 3) {
      let cx = 0, cy = 0, cz = 0, out = false;
      for (let k = 0; k < 3; k++) { v.fromBufferAttribute(pos, idx ? idx.getX(t + k) : t + k).applyMatrix4(mw); cx += v.x; cy += v.y; cz += v.z; if (v.y > heightAt(v.x, v.z) - 0.3) out = true; }
      cx /= 3; cy /= 3; cz /= 3;
      if (Math.hypot(cx - at.x, cz - at.z) > rBuild || (cy < rawHeight(cx, cz) - 1.5 && !out)) continue;   /* underground pieces stay unless the blast dug them out */
      if (idx) { const a0 = idx.getX(t); idx.setX(t + 1, a0); idx.setX(t + 2, a0); }
      else { const x0 = pos.getX(t), y0 = pos.getY(t), z0 = pos.getZ(t); pos.setXYZ(t + 1, x0, y0, z0); pos.setXYZ(t + 2, x0, y0, z0); }
      ch = true;
    }
    if (ch) { if (idx) idx.needsUpdate = true; else pos.needsUpdate = true; }
  }
  for (let i = solidMeshes.length - 1; i >= 0; i--) if (gone.has(solidMeshes[i])) solidMeshes.splice(i, 1);
  for (const b of obstacles) { const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2; if (Math.hypot(cx - at.x, cz - at.z) < rBuild && (b.maxY > rawHeight(cx, cz) - 1.5 || b.maxY > heightAt(cx, cz) - 0.3)) { b.minY = b.maxY = -1e4; } }
  for (const b of world.bodies.slice()) { if (b.mass !== 0 || !b.shapes[0] || b.shapes[0].type === CANNON.Shape.types.HEIGHTFIELD) continue; const p = b.position; if (Math.hypot(p.x - at.x, p.z - at.z) < rBuild && (p.y > rawHeight(p.x, p.z) - 1.5 || p.y > heightAt(p.x, p.z) - 0.3)) world.removeBody(b); }
  if (typeof props !== 'undefined') for (const p of props) if (!p.exploded && p.mesh && Math.hypot(p.mesh.position.x - at.x, p.mesh.position.z - at.z) < rBuild) { p.exploded = true; p.mesh.visible = false; }
}

function craterDh(d, depth) { return d < 1 ? -depth * (1 - d * d) : d < 1.5 ? depth * 0.22 * Math.sin((d - 1) / 0.5 * Math.PI) : 0; }
function settleOnCrater(at, r, depth) {
  const R = r * 1.5, box = new THREE.Box3(), c = new THREE.Vector3();
  for (const o of scene.children) {
    if (o === terrainMesh || o === waterMesh || (typeof sky !== 'undefined' && o === sky) || o.isLight || o.isCamera || o.userData.char || o.userData.gv || o.userData.settleSkip) continue;
    if (!o.isMesh && !o.isGroup) continue;
    if (Math.hypot(o.position.x - at.x, o.position.z - at.z) > R + 30) continue;   // quick reject on the origin
    if (points.some(q => Math.hypot(o.position.x - q.x, o.position.z - q.z) < 3.5)) continue;   // control point flags are moved with their point
    if (o.isMesh && o.material && o.material.transparent) continue;
    box.setFromObject(o); if (box.isEmpty()) continue; box.getCenter(c);
    if (box.max.x - box.min.x > 60 || box.max.z - box.min.z > 60) continue;          // big merged meshes are trimmed by clearAround instead
    const d = Math.hypot(c.x - at.x, c.z - at.z) / r; if (d > 1.5) continue;
    const dh = craterDh(d, depth); if (Math.abs(dh) < 0.05) continue;
    const oldG = heightAt(c.x, c.z) - dh;
    if (box.min.y < oldG - 2 || box.min.y > oldG + 3) continue;                       // only things that were sitting on the ground (not bunkers, not birds)
    o.position.y += dh; o.updateMatrixWorld(true);
  }
  if (typeof turrets !== 'undefined') for (const t of turrets) { const d = Math.hypot(t.x - at.x, t.z - at.z) / r; if (d < 1.5) { const dh = craterDh(d, depth); if (Math.abs(t.y - (heightAt(t.x, t.z) - dh)) < 3) { t.y += dh; t.g.position.y = t.y; } } }
  if (typeof obstacles !== 'undefined') for (const b of obstacles) { const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2, d = Math.hypot(cx - at.x, cz - at.z) / r; if (d < 1.5 && b.maxX - b.minX < 60 && b.maxZ - b.minZ < 60) { const dh = craterDh(d, depth), og = heightAt(cx, cz) - dh; if (b.minY !== undefined && b.minY > og - 2 && b.minY < og + 3) { b.minY += dh; b.maxY += dh; } } }
  scene.traverse(o => {   // instanced trees, rocks and bushes
    if (!o.isInstancedMesh) return;
    const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); let ch = false;
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); m4.decompose(p, q, sc); if (sc.x < 1e-3) continue; const d = Math.hypot(p.x - at.x, p.z - at.z) / r; if (d >= 1.5) continue; const dh = craterDh(d, depth); if (Math.abs(dh) < 0.05) continue; p.y += dh; m4.compose(p, q, sc); o.setMatrixAt(i, m4); ch = true; }
    if (ch) o.instanceMatrix.needsUpdate = true;
  });
}
// change the ground in a rectangle (used when the dam breaks): fn(x, z, height) gives the new height
function terrainEdit(x0, x1, z0, z1, fn) {
  if (!terrainMesh) return;
  const geo = terrainMesh.geometry, pos = geo.attributes.position, nor = geo.attributes.normal;
  const i0 = Math.max(1, Math.floor((x0 + HALF) / CELL)), i1 = Math.min(GRID - 1, Math.ceil((x1 + HALF) / CELL));
  const j0 = Math.max(1, Math.floor((z0 + HALF) / CELL)), j1 = Math.min(GRID - 1, Math.ceil((z1 + HALF) / CELL));
  for (let iz = j0; iz <= j1; iz++) for (let ix = i0; ix <= i1; ix++) {
    const x = -HALF + ix * CELL, z = -HALF + iz * CELL, k = iz * W1 + ix;
    HGRID[k] = fn(x, z, HGRID[k]); pos.setY(k, HGRID[k]); if (TERRAIN_HF) TERRAIN_HF.data[ix][GRID - iz] = HGRID[k];
  }
  for (let iz = j0 - 1; iz <= j1 + 1; iz++) for (let ix = i0 - 1; ix <= i1 + 1; ix++) {
    if (ix < 1 || iz < 1 || ix >= GRID || iz >= GRID) continue;
    const hx = HGRID[iz * W1 + ix + 1] - HGRID[iz * W1 + ix - 1], hz = HGRID[(iz + 1) * W1 + ix] - HGRID[(iz - 1) * W1 + ix];
    const nx = -hx, ny = 2 * CELL, nz = -hz, l = Math.hypot(nx, ny, nz); nor.setXYZ(iz * W1 + ix, nx / l, ny / l, nz / l);
  }
  pos.needsUpdate = true; nor.needsUpdate = true; geo.computeBoundingSphere();
  if (TERRAIN_HF) { try { TERRAIN_HF.updateMaxValue(); TERRAIN_HF.updateMinValue(); TERRAIN_HF._cachedPillars = {}; } catch (e) { } }
}
