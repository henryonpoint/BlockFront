// ===================== tunnels.js : the underground tunnel network =====================
// One deep level of tunnels links every bunker (by long staircases), an underground HQ under point C,
// and ladder hatches near C, E, F and both bases. Everything is axis aligned, so walls can be worked out
// from the union of rectangles.
const TUN_Y = -19, T_H = 3.4, T_HW = 2, STAIR_SLOPE = 0.6, TG = 16;
const TRECTS = [];          // floor rectangles {minX,maxX,minZ,maxZ, stair?}
const HATCHES = [];         // ladder shafts {x,z,h,name, stand:{x,z}}
const TNODES = new Map();   // graph for NPCs: key -> {x,z,edges:[[key,d]]}
const TENTR = [];           // entrances NPCs can use: {x,z (surface), node, way:[waypoints from outside to the node]}
const TUNNET = { name: 'tunnels', tunnel: true, found: false };
let HUB = null;
const TMAT = {
  wall: new THREE.MeshLambertMaterial({ color: 0x6a6258, map: texRepeat(TEX.concrete, 4, 1), emissive: 0x231f1a }),
  floor: new THREE.MeshLambertMaterial({ color: 0x5a524a, map: texRepeat(TEX.concrete, 4, 4), emissive: 0x1c1915 }),
  ceil: new THREE.MeshLambertMaterial({ color: 0x47423c, emissive: 0x181512 }),
  beam: new THREE.MeshLambertMaterial({ color: 0x6b4a2b, emissive: 0x24180c }),
  rail: new THREE.MeshLambertMaterial({ color: 0x9aa0a6, emissive: 0x2a2c2e }),
  hole: new THREE.MeshBasicMaterial({ color: 0x050505 }),
  lamp: new THREE.MeshBasicMaterial({ color: 0xffe7a8 }), red: new THREE.MeshBasicMaterial({ color: 0xff4040 }),
};

function underFloor(u, x, z) {
  if (!u.ramp) return u.floor;
  const r = u.ramp, a = r.axis === 'x' ? x : z, t = clamp((a - r.a0) / (r.a1 - r.a0), 0, 1);
  return r.f0 + (r.f1 - r.f0) * t;
}
function underCeil(u, x, z) { return u.ramp ? underFloor(u, x, z) + T_H : u.ceil; }
function inRect(r, x, z, pad = 0) { return x > r.minX - pad && x < r.maxX + pad && z > r.minZ - pad && z < r.maxZ + pad; }
function rectFloor(r, x, z) { return r.stair ? underFloor(r.under, x, z) : TUN_Y; }

// hatch sites are chosen once the buildings exist, so they never land inside one
function hatchSiteOk(x, z) {
  if (Math.abs(x) > EDGE - 40 || Math.abs(z) > EDGE - 40) return false;
  if (pathDist(x, z) < 6) return false;
  for (const L of LAKES) if (Math.hypot(x - L.x, z - L.z) < L.r + 16) return false;
  for (const p of POINTS_DEF) if (Math.hypot(x - p.x, z - p.z) < 20) return false;
  for (const t of ['blue', 'red']) { const r = RUNWAYS[t]; if (Math.abs(x - r.x) < r.len / 2 + 12 && Math.abs(z - r.z) < r.wid / 2 + 12) return false; }
  for (const b of bunkers) if (Math.hypot(x - b.cx, z - b.cz) < 50) return false;
  const h = heightAt(x, z);
  if (h < TUN_Y + T_H + 6 || waterDepth(x, z) > 0) return false;
  for (const [ox, oz] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]) if (Math.abs(heightAt(x + ox, z + oz) - h) > 1.2) return false;
  for (let gx = -5; gx <= 5; gx += 2.5) for (let gz = -5; gz <= 5; gz += 2.5)
    for (const o of nearbyColliders(x + gx, z + gz)) {
      if (o.kind === 'box' && o.maxY > heightAt(x + gx, z + gz) + 0.3 && x + gx > o.minX - 1 && x + gx < o.maxX + 1 && z + gz > o.minZ - 1 && z + gz < o.maxZ + 1) return false;
      if (o.kind !== 'box' && Math.hypot(x + gx - o.x, z + gz - o.z) < o.r + 1) return false;
    }
  return true;
}
function findHatchSite(cx, cz, d0, d1) {
  for (let d = d0; d <= d1; d += 6) for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8 + d * 0.05, x = Math.round(cx + Math.cos(a) * d), z = Math.round(cz + Math.sin(a) * d);
    if (hatchSiteOk(x, z)) return { x, z };
  }
  return null;
}

function buildTunnels() {
  const N = Math.ceil(HALF * 2 / TG), cc = i => -HALF + (i + 0.5) * TG, ci = v => clamp(Math.floor((v + HALF) / TG), 0, N - 1);
  const stairs = [];
  // ----- staircases from each bunker hall down to the tunnel level -----
  for (const b of bunkers) {
    const L = (b.F - TUN_Y) / STAIR_SLOPE;
    const p0 = bW(b, 27.6, -1.8), p1 = bW(b, 28 + L, 1.8);
    const r = { minX: Math.min(p0.x, p1.x), maxX: Math.max(p0.x, p1.x), minZ: Math.min(p0.z, p1.z), maxZ: Math.max(p0.z, p1.z), stair: true, b, L };
    const axis = b.dx !== 0 ? 'x' : 'z', s0 = bW(b, 28.6, 0), s1 = bW(b, 28 + L, 0);
    r.under = { minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ, floor: TUN_Y, ceil: b.F + T_H, h: T_H, bunker: b,
      ramp: { axis, a0: axis === 'x' ? s0.x : s0.z, a1: axis === 'x' ? s1.x : s1.z, f0: b.F, f1: TUN_Y } };
    TRECTS.push(r); stairs.push(r); b.stair = r;
  }
  // ----- the hub under C -----
  const C = PD.C;
  HUB = { name: 'HQ', isHub: true, x: C.x, z: C.z, F: TUN_Y, cx: C.x, cz: C.z, found: false, cacheT: 0 };
  const hubR = { minX: C.x - 16, maxX: C.x + 16, minZ: C.z - 16, maxZ: C.z + 16, hub: true };
  TRECTS.push(hubR);
  // ----- hatches -----
  const want = [['C', C.x, C.z, 26, 70], ['E', PD.E.x, PD.E.z, 26, 80], ['F', PD.F.x, PD.F.z, 26, 80],
    ['Blue base', BASES.blue.x, BASES.blue.z, 30, 90], ['Red base', BASES.red.x, BASES.red.z, 30, 90]];
  for (const [name, x, z, d0, d1] of want) {
    const s = findHatchSite(x, z, d0, d1);
    if (s) { HATCHES.push({ name, x: s.x, z: s.z, h: heightAt(s.x, s.z) }); settlements.push({ x: s.x, z: s.z, r: 6 }); }
  }
  // ----- grid search for the tunnel routes -----
  const okCell = new Uint8Array(N * N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = cc(i), z = cc(j);
    let ok = Math.abs(x) < EDGE - 24 && Math.abs(z) < EDGE - 24;
    for (let a = -1; a <= 1 && ok; a++) for (let c = -1; c <= 1 && ok; c++) if (heightAt(x + a * TG * 0.5, z + c * TG * 0.5) < TUN_Y + T_H + 5) ok = false;
    for (const Lk of LAKES) if (Math.hypot(x - Lk.x, z - Lk.z) < Lk.r + 14) ok = false;
    for (const s of stairs) if (x > s.minX - TG / 2 - 4 && x < s.maxX + TG / 2 + 4 && z > s.minZ - TG / 2 - 4 && z < s.maxZ + TG / 2 + 4) ok = false;
    okCell[i * N + j] = ok ? 1 : 0;
  }
  const net = new Uint8Array(N * N);
  for (let i = ci(hubR.minX + 2); i <= ci(hubR.maxX - 2); i++) for (let j = ci(hubR.minZ + 2); j <= ci(hubR.maxZ - 2); j++) { net[i * N + j] = 1; okCell[i * N + j] = 1; }
  const node = (key, x, z) => { if (!TNODES.has(key)) TNODES.set(key, { key, x, z, edges: [] }); return key; };
  const link = (a, b) => { const A = TNODES.get(a), B = TNODES.get(b), d = Math.hypot(A.x - B.x, A.z - B.z); if (a === b || A.edges.some(e => e[0] === b)) return; A.edges.push([b, d]); B.edges.push([a, d]); };
  node('hub', C.x, C.z);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (net[i * N + j]) link(node('c' + (i * N + j), cc(i), cc(j)), 'hub');
  const segs = [];   // [x0,z0,x1,z1]
  function route(sx, sz) {
    // Dijkstra over grid cells (state = cell + direction, so turns can cost extra), ends at any network cell
    const si = ci(sx), sj = ci(sz), start = si * N + sj;
    if (net[start]) return [start];
    const dist = new Float32Array(N * N * 4).fill(Infinity), prev = new Int32Array(N * N * 4).fill(-1);
    const open = [];
    for (let d = 0; d < 4; d++) { dist[start * 4 + d] = 0; open.push([0, start * 4 + d]); }
    const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let end = -1;
    while (open.length) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
      const [dc, st] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (dc > dist[st]) continue;
      const cell = st >> 2, dir = st & 3, i = Math.floor(cell / N), j = cell % N;
      if (net[cell] && cell !== start) { end = st; break; }
      for (let d = 0; d < 4; d++) {
        const ni = i + DIR[d][0], nj = j + DIR[d][1];
        if (ni < 0 || nj < 0 || ni >= N || nj >= N || !okCell[ni * N + nj]) continue;
        const ns = (ni * N + nj) * 4 + d, nd = dc + 1 + (d !== dir ? 1.5 : 0);
        if (nd < dist[ns]) { dist[ns] = nd; prev[ns] = st; open.push([nd, ns]); }
      }
    }
    if (end < 0) return null;
    const cells = []; for (let s = end; s >= 0; s = prev[s]) { const c = s >> 2; if (cells[cells.length - 1] !== c) cells.push(c); }
    return cells.reverse();
  }
  // lay a path through points (consecutive points get an L-joint if they are not lined up)
  function layPath(pts) {
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1];
      if (Math.abs(a.x - b.x) > 0.01 && Math.abs(a.z - b.z) > 0.01) {
        const m = { x: b.x, z: a.z, key: a.key + '/' + b.key };
        node(m.key, m.x, m.z); link(a.key, m.key); link(m.key, b.key);
        segs.push([a.x, a.z, m.x, m.z], [m.x, m.z, b.x, b.z]);
      } else { link(a.key, b.key); segs.push([a.x, a.z, b.x, b.z]); }
    }
  }
  function connect(sx, sz, keyPrefix, lead) {
    // lead = extra points (each {x,z,key}) before reaching the grid
    const from = lead[lead.length - 1];
    const cells = route(from.x, from.z);
    if (!cells) { console.warn('no tunnel route for', keyPrefix); return false; }
    const pts = lead.map(p => ({ ...p, key: node(p.key, p.x, p.z) }));
    for (const c of cells) { const i = Math.floor(c / N), j = c % N; pts.push({ x: cc(i), z: cc(j), key: node('c' + c, cc(i), cc(j)) }); net[c] = 1; }
    layPath(pts);
    return true;
  }
  const ends = [];
  for (const b of bunkers) {
    const S = bW(b, 28 + b.stair.L + 2, 0), S2 = bW(b, 28 + b.stair.L + 10, 0);
    ends.push({ d: Math.hypot(S.x - C.x, S.z - C.z), go: () => {
      const ok = connect(S.x, S.z, 'b' + b.name, [{ x: S.x, z: S.z, key: 'b' + b.name }, { x: S2.x, z: S2.z, key: 'b2' + b.name }]);
      if (!ok) return;
      segs.push([S.x, S.z, S.x, S.z]);
      const way = [[-34, 0], [-12, 0], [4, 0], [12, 0], [14, 4.5], [25.5, 4.5], [26.6, 0]].map(([u, v]) => bW(b, u, v));
      TENTR.push({ kind: 'bunker', b, x: way[0].x, z: way[0].z, node: 'b' + b.name, way: [...way, { x: S.x, z: S.z }] });
    } });
  }
  for (const h of HATCHES) ends.push({ d: Math.hypot(h.x - C.x, h.z - C.z), go: () => {
    const ok = connect(h.x, h.z, 'h' + h.name, [{ x: h.x, z: h.z, key: 'h' + h.name }]);
    if (!ok) { h.dead = true; return; }
    segs.push([h.x, h.z, h.x, h.z]);
    let st = null;
    for (const [ox, oz] of [[2.4, 0], [-2.4, 0], [0, 2.4], [0, -2.4]]) if (!blockedAt(h.x + ox, h.z + oz, heightAt(h.x + ox, h.z + oz))) { st = { x: h.x + ox, z: h.z + oz }; break; }
    h.stand = st || { x: h.x + 2.4, z: h.z };
    h.low = { x: h.x + (h.x - h.stand.x) * 0 + 1.1, z: h.z };    // where you arrive at the bottom of the ladder
    TENTR.push({ kind: 'hatch', hatch: h, x: h.stand.x, z: h.stand.z, node: 'h' + h.name,
      way: [{ x: h.stand.x, z: h.stand.z, teleTo: { x: h.low.x, y: TUN_Y, z: h.low.z } }, { x: h.x, z: h.z }],
      wayUp: [{ x: h.low.x, z: h.low.z, teleTo: { x: h.stand.x, y: heightAt(h.stand.x, h.stand.z), z: h.stand.z } }] });
  } });
  ends.sort((a, b) => a.d - b.d).forEach(e => e.go());
  for (let k = HATCHES.length - 1; k >= 0; k--) if (HATCHES[k].dead) HATCHES.splice(k, 1);

  // ----- merge segments into rectangles -----
  const rects = mergeSegs(segs);
  for (const r of rects) TRECTS.push(r);
  // underground volumes (the hub counts as the HQ, everything else as "tunnels")
  for (const r of TRECTS) {
    if (r.stair) { UNDER.push(r.under); continue; }
    UNDER.push({ minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ, floor: TUN_Y, ceil: TUN_Y + T_H, h: T_H, bunker: r.hub ? HUB : TUNNET });
  }
  // ----- geometry -----
  for (const r of TRECTS) { if (r.stair) buildStair(r); else if (!r.hub) buildTunnelRect(r); }
  buildHub(hubR);
  for (const h of HATCHES) buildHatch(h);
}

// segments (with zero-length ones as landings) to axis-aligned rectangles, merging overlapping collinear ones
function mergeSegs(segs) {
  const rs = segs.map(([x0, z0, x1, z1]) => ({ minX: Math.min(x0, x1) - T_HW, maxX: Math.max(x0, x1) + T_HW, minZ: Math.min(z0, z1) - T_HW, maxZ: Math.max(z0, z1) + T_HW }));
  let merged = true;
  while (merged) {
    merged = false;
    for (let a = 0; a < rs.length && !merged; a++) for (let b = a + 1; b < rs.length && !merged; b++) {
      const A = rs[a], B = rs[b];
      const sameZ = Math.abs(A.minZ - B.minZ) < 0.01 && Math.abs(A.maxZ - B.maxZ) < 0.01 && A.minX <= B.maxX + 0.01 && B.minX <= A.maxX + 0.01;
      const sameX = Math.abs(A.minX - B.minX) < 0.01 && Math.abs(A.maxX - B.maxX) < 0.01 && A.minZ <= B.maxZ + 0.01 && B.minZ <= A.maxZ + 0.01;
      const inside = (P, Q) => P.minX >= Q.minX - 0.01 && P.maxX <= Q.maxX + 0.01 && P.minZ >= Q.minZ - 0.01 && P.maxZ <= Q.maxZ + 0.01;
      if (sameZ || sameX || inside(A, B) || inside(B, A)) {
        rs[a] = { minX: Math.min(A.minX, B.minX), maxX: Math.max(A.maxX, B.maxX), minZ: Math.min(A.minZ, B.minZ), maxZ: Math.max(A.maxZ, B.maxZ) };
        rs.splice(b, 1); merged = true;
      }
    }
  }
  return rs;
}

function tBox(minX, maxX, minZ, maxZ, y0, y1, mat, solid) {
  let m;
  if (solid) m = addBlock((minX + maxX) / 2, (minZ + maxZ) / 2, maxX - minX, y1 - y0, maxZ - minZ, mat, { y: y0 });
  else m = addMesh(new THREE.BoxGeometry(maxX - minX, y1 - y0, maxZ - minZ), mat, (minX + maxX) / 2, (y0 + y1) / 2, (minZ + maxZ) / 2, false);
  m.castShadow = false; return m;
}
// is the spot just outside a wall part of another open space at tunnel level?
function openAt(self, x, z) {
  for (const r of TRECTS) if (r !== self && inRect(r, x, z) && Math.abs(rectFloor(r, x, z) - TUN_Y) < 1.2) return true;
  return false;
}
function buildTunnelRect(r) {
  const F = TUN_Y, C = F + T_H;
  tBox(r.minX, r.maxX, r.minZ, r.maxZ, F - 0.4, F, TMAT.floor, true);
  tBox(r.minX - 0.5, r.maxX + 0.5, r.minZ - 0.5, r.maxZ + 0.5, C, C + 0.4, TMAT.ceil, false);
  // walls: walk each side, leave gaps where another tunnel joins
  const sides = [['z', r.minZ, -1], ['z', r.maxZ, 1], ['x', r.minX, -1], ['x', r.maxX, 1]];
  for (const [ax, at, s] of sides) {
    const a0 = ax === 'z' ? r.minX : r.minZ, a1 = ax === 'z' ? r.maxX : r.maxZ;
    let run = null;
    const flush = (end) => {
      if (run === null) return;
      let lo = run, hi = end;
      if (lo <= a0 + 0.01) lo -= 0.5; if (hi >= a1 - 0.01) hi += 0.5;
      if (ax === 'z') tBox(lo, hi, s > 0 ? at : at - 0.5, s > 0 ? at + 0.5 : at, F, C, TMAT.wall, true);
      else tBox(s > 0 ? at : at - 0.5, s > 0 ? at + 0.5 : at, lo, hi, F, C, TMAT.wall, true);
      run = null;
    };
    for (let t = a0; t < a1 - 0.001; t += 0.5) {
      const m = Math.min(a1, t + 0.25), ox = ax === 'z' ? m : at + s * 0.3, oz = ax === 'z' ? at + s * 0.3 : m;
      if (openAt(r, ox, oz)) flush(t); else if (run === null) run = t;
    }
    flush(a1);
  }
  if (r.hub) return;
  // support beams, lamps and some cover along the length
  const alongX = r.maxX - r.minX > r.maxZ - r.minZ, len = alongX ? r.maxX - r.minX : r.maxZ - r.minZ;
  const step = LITE ? 12 : 6;
  for (let t = 3; t < len - 2; t += step) {
    const p = (alongX ? r.minX : r.minZ) + t;
    if (alongX) {
      if (!openAt(r, p, r.minZ - 0.3)) tBox(p - 0.15, p + 0.15, r.minZ, r.minZ + 0.25, F, C, TMAT.beam, false);
      if (!openAt(r, p, r.maxZ + 0.3)) tBox(p - 0.15, p + 0.15, r.maxZ - 0.25, r.maxZ, F, C, TMAT.beam, false);
      tBox(p - 0.15, p + 0.15, r.minZ, r.maxZ, C - 0.25, C, TMAT.beam, false);
    } else {
      if (!openAt(r, r.minX - 0.3, p)) tBox(r.minX, r.minX + 0.25, p - 0.15, p + 0.15, F, C, TMAT.beam, false);
      if (!openAt(r, r.maxX + 0.3, p)) tBox(r.maxX - 0.25, r.maxX, p - 0.15, p + 0.15, F, C, TMAT.beam, false);
      tBox(r.minX, r.maxX, p - 0.15, p + 0.15, C - 0.25, C, TMAT.beam, false);
    }
  }
  for (let t = 6; t < len - 3; t += 12) {
    const p = (alongX ? r.minX : r.minZ) + t, cx = alongX ? p : (r.minX + r.maxX) / 2, cz = alongX ? (r.minZ + r.maxZ) / 2 : p;
    tBox(cx - 0.35, cx + 0.35, cz - 0.35, cz + 0.35, C - 0.33, C - 0.25, TMAT.lamp, false);
  }
  // cover: sandbag walls and crates on alternating sides of long tunnels
  if (len > 30) {
    let side = Math.random() < 0.5 ? 1 : -1;
    for (let t = 14 + Math.random() * 8; t < len - 12; t += 22 + Math.random() * 14) {
      const p = (alongX ? r.minX : r.minZ) + t;
      if (alongX ? (openAt(r, p, r.minZ - 0.3) || openAt(r, p, r.maxZ + 0.3)) : (openAt(r, r.minX - 0.3, p) || openAt(r, r.maxX + 0.3, p))) continue;
      const w0 = side > 0 ? (alongX ? r.maxZ : r.maxX) - 0.7 : (alongX ? r.minZ : r.minX), w1 = w0 + 0.7;
      if (Math.random() < 0.55) {
        if (alongX) tBox(p - 0.8, p + 0.8, w0, w1, TUN_Y, TUN_Y + 0.95, BM.sand, true); else tBox(w0, w1, p - 0.8, p + 0.8, TUN_Y, TUN_Y + 0.95, BM.sand, true);
      } else {
        if (alongX) tBox(p - 0.45, p + 0.45, w0, w1, TUN_Y, TUN_Y + 0.9, MATS.crate, true); else tBox(w0, w1, p - 0.45, p + 0.45, TUN_Y, TUN_Y + 0.9, MATS.crate, true);
      }
      side = -side;
    }
  }
}
function buildStair(r) {
  const b = r.b, F = b.F, L = r.L;
  // open the back wall of the hall (replaced with a doorway)
  lbox(b, 28, 28.6, -9.6, -1.8, F, F + B_CEIL, BMAT.wall); lbox(b, 28, 28.6, 1.8, 9.6, F, F + B_CEIL, BMAT.wall);
  // side walls, full height
  lbox(b, 28, 28 + L, 1.8, 2.3, TUN_Y - 0.4, F + T_H + 0.4, BMAT.wall); lbox(b, 28, 28 + L, -2.3, -1.8, TUN_Y - 0.4, F + T_H + 0.4, BMAT.wall);
  // steps and a stepped ceiling
  const n = Math.ceil(L / 0.5);
  for (let k = 0; k < n; k++) {
    const u0 = 28.6 + k * (L - 0.6) / n, u1 = 28.6 + (k + 1) * (L - 0.6) / n, top = F - (k + 1) * (F - TUN_Y) / n;
    const m = lbox(b, u0, u1 + 0.02, -1.8, 1.8, top - 0.35, top + 0.02, BMAT.floor, false); m.castShadow = false;
  }
  for (let u = 28; u < 28 + L; u += 2) {
    const ceil = F - Math.max(0, u - 28.6) * STAIR_SLOPE + T_H;
    const m = lbox(b, u, u + 2.05, -2.3, 2.3, ceil, ceil + 0.4, BMAT.ceil, false); m.castShadow = false;
    if (Math.round(u) % 6 === 0) lbox(b, u + 0.6, u + 1.4, -0.3, 0.3, ceil - 0.06, ceil, BMAT.light, false);
  }
  // a red lamp and sign over the doorway
  lbox(b, 27.8, 28, -0.3, 0.3, F + 3.0, F + 3.2, BMAT.red, false);
}
function buildHub(r) {
  const F = TUN_Y, C = F + T_H, cx = (r.minX + r.maxX) / 2, cz = (r.minZ + r.maxZ) / 2;
  buildTunnelRect(r);
  const hb = (x0, x1, z0, z1, y0, y1, m, s = true) => tBox(cx + x0, cx + x1, cz + z0, cz + z1, F + y0, F + y1, m, s);
  for (const [x, z] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) hb(x - 0.7, x + 0.7, z - 0.7, z + 0.7, 0, T_H, BMAT.wall);
  for (const [x, z] of [[-11, -11], [11, -11], [-11, 11], [11, 11], [0, -7], [0, 7], [-7, 0], [7, 0]]) hb(x - 0.6, x + 0.6, z - 0.2, z + 0.2, 0.6 + 2.2, 2.8, TMAT.lamp, false);
  for (let x = -14; x <= 14; x += 7) for (let z = -14; z <= 14; z += 7) hb(x - 0.5, x + 0.5, z - 0.3, z + 0.3, T_H - 0.08, T_H, TMAT.lamp, false);
  // command table and cover
  hb(-2, 2, -1.2, 1.2, 0, 0.9, MATS.darkWood); hb(-1.8, 1.8, -1, 1, 0.9, 0.93, new THREE.MeshLambertMaterial({ color: 0xd8c9a0 }), false);
  for (const [x, z, w, d] of [[-11, 3, 0.8, 2.6], [11, -3, 0.8, 2.6], [3, 11, 2.6, 0.8], [-3, -11, 2.6, 0.8]]) hb(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, 1.0, BM.sand);
  for (const [x, z] of [[13.5, 13.5], [12.5, 13.5], [13.5, 12.5], [-13.5, -13.5]]) hb(x - 0.5, x + 0.5, z - 0.5, z + 0.5, 0, 1, MATS.crate);
  // supplies along one wall: ammo, medical, cache
  const yw = r.minZ + 1;
  hb(-5.6, -4.4, -15.6, -14.4, 0, 0.8, MATS.olive); hb(-5.6, -4.4, -15.6, -14.4, 0.8, 0.9, BM.yellow, false);
  hb(4.5, 5.5, -15.6, -14.4, 0, 1.1, MATS.white); hb(4.8, 5.2, -14.42, -14.4, 0.6, 0.75, BM.crossRed, false); hb(4.93, 5.07, -14.42, -14.4, 0.45, 0.9, BM.crossRed, false);
  hb(-0.7, 0.7, -15.6, -14.4, 0, 0.8, BMAT.green); hb(-0.7, 0.7, -15.6, -14.4, 0.8, 0.95, BMAT.gold, false);
  HUB.ammo = { x: cx - 5, z: cz - 15 }; HUB.med = { x: cx + 5, z: cz - 15 }; HUB.cache = { x: cx, z: cz - 15 };
  void yw;
}
function buildHatch(h) {
  const y = h.h;
  // concrete collar with an open steel lid
  tBox(h.x - 1.2, h.x + 1.2, h.z - 1.2, h.z + 1.2, groundMin(h.x, h.z, 1.2, 1.2) - 0.3, y + 0.55, BMAT.wall, true);
  tBox(h.x - 0.75, h.x + 0.75, h.z - 0.75, h.z + 0.75, y + 0.55, y + 0.57, TMAT.hole, false);
  const lid = addMesh(new THREE.BoxGeometry(1.6, 0.08, 1.6), MATS.steel, h.x - 0.8, y + 1.35, h.z);
  lid.rotation.z = 1.2; lid.position.x = h.x - 1.15; lid.userData.static = false;
  // hand rails, a yellow sign
  for (const s of [-1, 1]) tBox(h.x + 0.85 * s - 0.04, h.x + 0.85 * s + 0.04, h.z - 0.04, h.z + 0.04, y + 0.55, y + 1.5, TMAT.rail, false);
  tBox(h.x - 0.9, h.x + 0.9, h.z - 0.04, h.z + 0.04, y + 1.46, y + 1.54, TMAT.rail, false);
  const sp = { x: h.x + 1.6, z: h.z + 1.6 };
  addMesh(new THREE.BoxGeometry(0.15, 2.2, 0.15), MATS.darkWood, sp.x, heightAt(sp.x, sp.z) + 1.1, sp.z);
  const sign = addMesh(new THREE.BoxGeometry(1.6, 0.6, 0.08), new THREE.MeshLambertMaterial({ map: tunnelSignTex() }), sp.x, heightAt(sp.x, sp.z) + 2.1, sp.z);
  sign.rotation.y = Math.PI / 4; sign.userData.static = false;
  // in the tunnel: ladder up into a dark shaft
  const F = TUN_Y, C = F + T_H;
  tBox(h.x - 0.8, h.x + 0.8, h.z - 0.8, h.z + 0.8, C - 0.02, C + 0.02, TMAT.hole, false);
  for (const s of [-1, 1]) tBox(h.x - 0.65, h.x - 0.55, h.z + 0.35 * s - 0.04, h.z + 0.35 * s + 0.04, F, C, TMAT.rail, false);
  for (let y2 = F + 0.35; y2 < C; y2 += 0.35) tBox(h.x - 0.65, h.x - 0.55, h.z - 0.35, h.z + 0.35, y2 - 0.03, y2 + 0.03, TMAT.rail, false);
  tBox(h.x - 0.3, h.x + 0.3, h.z + 1.3, h.z + 1.6, C - 0.4, C - 0.25, TMAT.lamp, false);
}
let _tSignTex = null;
function tunnelSignTex() {
  if (_tSignTex) return _tSignTex;
  _tSignTex = canvasTex(128, 48, (g) => { g.fillStyle = '#2a2a2a'; g.fillRect(0, 0, 128, 48); g.fillStyle = '#ffd54f'; g.font = 'bold 24px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TUNNEL', 64, 25); });
  _tSignTex.magFilter = THREE.LinearFilter; return _tSignTex;
}

// ---------- ladders for the player ----------
function hatchInteract() {
  const p = player.pos, under = undergroundAt(p.x, p.z, p.y);
  for (const h of HATCHES) {
    if (!under && Math.hypot(p.x - h.x, p.z - h.z) < 2.8 && Math.abs(p.y - h.h) < 2.5) return { kind: 'hatch', h, down: true, text: 'Press E to climb down into the tunnels' };
    if (under && Math.hypot(p.x - h.x, p.z - h.z) < 2.2 && p.y < TUN_Y + 2) return { kind: 'hatch', h, down: false, text: 'Press E to climb up the ladder' };
  }
  return null;
}
function useHatch(it) {
  const h = it.h;
  if (it.down) { player.pos.set(h.low.x, TUN_Y, h.low.z); }
  else { player.pos.set(h.stand.x, heightAt(h.stand.x, h.stand.z), h.stand.z); }
  player.velY = 0; player.onGround = true; player.push.set(0, 0, 0);
  if (typeof sfxLadder === 'function') sfxLadder();
  const f = $('fade'); if (f) { f.style.transition = 'none'; f.style.opacity = 1; requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = 0; }); setTimeout(() => { f.style.transition = 'opacity .5s'; f.style.opacity = 0; }, 60); }
  showMessage(it.down ? 'You climbed down into the tunnels' : 'Back on the surface', 1.5);
}

// ---------- tunnel routes for NPCs ----------
function tunnelDists(from) {
  const dist = new Map([[from, 0]]), prev = new Map(), open = [[0, from]], done = new Set();
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
    const [d, key] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    if (done.has(key)) continue; done.add(key);
    for (const [to, w] of TNODES.get(key).edges) { const nd = d + w; if (nd < (dist.has(to) ? dist.get(to) : Infinity)) { dist.set(to, nd); prev.set(to, key); open.push([nd, to]); } }
  }
  return { dist, prev };
}
const _tdCache = new Map();
function tunnelDistsCached(k) { if (!_tdCache.has(k)) _tdCache.set(k, tunnelDists(k)); return _tdCache.get(k); }
// maybe send an NPC through the tunnels towards its goal point
function planTunnel(n) {
  n.tplan = null;
  if (!TENTR.length || !n.goalPoint || undergroundAt(n.pos.x, n.pos.z, n.pos.y)) return;
  const gp = n.goalPoint, direct = Math.hypot(gp.x - n.pos.x, gp.z - n.pos.z);
  if (direct < 140) return;
  let best = null, bs = Infinity;
  for (const e1 of TENTR) {
    const d1 = Math.hypot(e1.x - n.pos.x, e1.z - n.pos.z);
    if (d1 > 150) continue;
    const { dist } = tunnelDistsCached(e1.node);
    for (const e2 of TENTR) {
      if (e2 === e1 || !dist.has(e2.node)) continue;
      const d3 = Math.hypot(e2.x - gp.x, e2.z - gp.z);
      if (d3 > 110) continue;
      const s = d1 + dist.get(e2.node) + d3;
      if (s < bs) { bs = s; best = [e1, e2]; }
    }
  }
  if (!best || bs > direct * 1.7 + 80) return;
  const [e1, e2] = best, { prev } = tunnelDistsCached(e1.node);
  const mid = []; for (let k = e2.node; k && k !== e1.node; k = prev.get(k)) mid.push(k);
  mid.reverse();
  const plan = e1.way.map(w => ({ ...w }));
  for (const k of mid) { const nd = TNODES.get(k); plan.push({ x: nd.x, z: nd.z }); }
  if (e2.kind === 'hatch') plan.push(...e2.wayUp.map(w => ({ ...w })));
  else plan.push(...e2.way.slice().reverse().map(w => ({ x: w.x, z: w.z })));
  n.tplan = plan; n.tStuck = 0;
  n.goalT = Math.max(n.goalT, 90);
}
// called from updateNPC: returns the current waypoint (and handles ladders)
function tunnelGoal(n) {
  const w = n.tplan[0];
  if (Math.hypot(w.x - n.pos.x, w.z - n.pos.z) < (w.teleTo ? 1.6 : 2.2)) {
    if (w.teleTo) { n.pos.set(w.teleTo.x, w.teleTo.y, w.teleTo.z); n.lastPos.copy(n.pos); }
    n.tplan.shift();
    if (!n.tplan.length) { n.tplan = null; return n.goal; }
  }
  return n.tplan[0];
}
