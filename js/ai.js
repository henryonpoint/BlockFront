// ===================== ai.js : soldier brains, collision helpers, spawning =====================
const ROLE_STATS = {
  rifle: { range: 80, rate: 0.13, burst: [4, 9], pause: [0.45, 1.1], dmg: 9, acc: 0.52, speed: 4.6, keep: 24 },
  sniper: { range: 150, rate: 2.4, burst: [1, 1], pause: [0, 0], dmg: 45, acc: 0.6, speed: 4.0, keep: 75 },
  rocket: { range: 90, rate: 4.5, burst: [1, 1], pause: [0, 0], dmg: 120, acc: 1, speed: 4.2, keep: 35 },
};

// ---------- geometry helpers ----------
function segBox(ax, ay, az, bx, by, bz, o) {
  let t0 = 0, t1 = 1;
  const d = [bx - ax, by - ay, bz - az], a = [ax, ay, az], mn = [o.minX, o.minY, o.minZ], mx = [o.maxX, o.maxY, o.maxZ];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) { if (a[i] < mn[i] || a[i] > mx[i]) return false; }
    else {
      let ta = (mn[i] - a[i]) / d[i], tb = (mx[i] - a[i]) / d[i];
      if (ta > tb) { const t = ta; ta = tb; tb = t; }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) return false;
    }
  }
  return true;
}
function los(a, b) {
  const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x), minZ = Math.min(a.z, b.z), maxZ = Math.max(a.z, b.z);
  for (const o of obstacles) {
    if (!o.los || o.maxX < minX || o.minX > maxX || o.maxZ < minZ || o.minZ > maxZ) continue;
    if (segBox(a.x, a.y, a.z, b.x, b.y, b.z, o)) return false;
  }
  const ua = undergroundAt(a.x, a.z, a.y - 1.6), ub = undergroundAt(b.x, b.z, b.y - 1.4);
  if (!!ua !== !!ub) return false;   // earth between inside and outside
  if (ua) return true;
  const d = a.distanceTo(b), steps = Math.ceil(d / 4);
  for (let i = 1; i < steps; i++) {
    const t = i / steps, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, z = a.z + (b.z - a.z) * t;
    if (y < heightAt(x, z) + 0.15) return false;
  }
  return true;
}
function blockedAt(x, z, y, r = 0.45, terrainOk = false) {
  if (Math.abs(x) > EDGE || Math.abs(z) > EDGE) return true;
  if (!terrainOk && groundAt(x, z, y) - y > 1.2) return true;
  for (const o of nearbyColliders(x, z)) {
    if (o.kind === 'box') { if (y + 0.6 < o.maxY && y + 1.6 > o.minY && x > o.minX - r && x < o.maxX + r && z > o.minZ - r && z < o.maxZ + r) return true; }
    else if (y < o.top && !(y < o.base - 2) && Math.hypot(x - o.x, z - o.z) < r + o.r) return true;
  }
  return false;
}
// push a standing character out of solid things; returns floor height (for standing on top of boxes)
function pushOut(pos, r, feetY) {
  let floor = groundAt(pos.x, pos.z, feetY);
  for (const o of nearbyColliders(pos.x, pos.z)) {
    if (o.kind === 'box') {
      if (pos.x > o.minX - r && pos.x < o.maxX + r && pos.z > o.minZ - r && pos.z < o.maxZ + r) {
        if (feetY >= o.maxY - 0.65) { if (pos.x > o.minX - 0.2 && pos.x < o.maxX + 0.2 && pos.z > o.minZ - 0.2 && pos.z < o.maxZ + 0.2) floor = Math.max(floor, o.maxY); continue; }
        if (feetY + 1.7 < o.minY) continue;
        const px1 = pos.x - (o.minX - r), px2 = (o.maxX + r) - pos.x, pz1 = pos.z - (o.minZ - r), pz2 = (o.maxZ + r) - pos.z;
        const m = Math.min(px1, px2, pz1, pz2);
        if (m === px1) pos.x = o.minX - r; else if (m === px2) pos.x = o.maxX + r; else if (m === pz1) pos.z = o.minZ - r; else pos.z = o.maxZ + r;
      }
    } else {
      if (feetY < o.base - 2) continue;
      const dx = pos.x - o.x, dz = pos.z - o.z, d = Math.hypot(dx, dz), rr = r + o.r;
      if (d < rr && feetY < o.top - 0.5) {
        if (d < 0.001) { pos.x += rr; continue; }
        pos.x = o.x + dx / d * rr; pos.z = o.z + dz / d * rr;
      } else if (d < o.r * 0.8 && feetY >= o.top - 0.5) floor = Math.max(floor, o.top);
    }
  }
  return floor;
}
function pushProps(pos, vx, vz, strength) {
  for (const p of props) {
    if (p.exploded) continue;
    const b = p.body.position, dx = b.x - pos.x, dz = b.z - pos.z;
    const lim = p.kind === 'car' ? 2.3 : 1.05;
    if (Math.abs(dx) > lim || Math.abs(dz) > lim || b.y > pos.y + 2.2 || b.y < pos.y - 0.6) continue;
    const d = Math.hypot(dx, dz) || 0.01;
    if (d > lim) continue;
    p.body.wakeUp();
    const k = strength * (p.kind === 'car' ? 12 : 1.5);
    p.body.applyImpulse(new CANNON.Vec3(dx / d * k + vx * 0.15, 0.2, dz / d * k + vz * 0.15), new CANNON.Vec3(b.x, b.y + 0.2, b.z));
  }
}

// ---------- spawning ----------
function enemiesNear(p, team, extra = 10) {
  let n = 0; for (const c of chars) if (c.alive && c.team !== team && !c.vehicle && Math.hypot(c.pos.x - p.x, c.pos.z - p.z) < p.r + extra) n++;
  return n;
}
function findSpawn(team, pref) {
  let spot = BASES[team];
  if (WAKE && team === 'blue' && Math.random() < 0.5) spot = { x: CARRIER.x + CARRIER.hl + 58, z: CARRIER.z + 8 };   // half the carrier crew starts down on the dock by the boats
  if (pref && pref !== 'auto') {
    const p = points.find(q => q.name === pref && q.owner === team && enemiesNear(q, team, 15) === 0);
    if (pref === 'base' || p) { spot = p || BASES[team]; return spotNear(spot); }
  }
  const owned = points.filter(p => p.owner === team && Math.abs(p.progress) > 0.99 && enemiesNear(p, team, 25) === 0);
  const contested = points.filter(p => p.owner !== team);
  if (owned.length && Math.random() < 0.7) {
    let best = null, bs = Infinity;
    for (const p of owned) {
      let s = contested.length ? Math.min(...contested.map(q => Math.hypot(q.x - p.x, q.z - p.z))) : 0;
      s += rand(0, 60);
      if (s < bs) { bs = s; best = p; }
    }
    spot = best;
  }
  return spotNear(spot);
}
function spotNear(spot) {
  for (let i = 0; i < 25; i++) {
    const a = rand(0, Math.PI * 2), r = rand(3, 11), x = spot.x + Math.cos(a) * r, z = spot.z + Math.sin(a) * r;
    if (!blockedAt(x, z, heightAt(x, z))) return { x, z };
  }
  return { x: spot.x + 4, z: spot.z + 4 };
}
function spawnChar(c, pref) {
  const sp = findSpawn(c.team, pref);
  c.pos.set(sp.x, heightAt(sp.x, sp.z), sp.z);
  c.maxHp = c.isPlayer ? 100 : 150;
  c.hp = c.maxHp; c.armor = c.isPlayer ? c.armor : 0; c.alive = true; c.vehicle = null; c.turret = null;
  c.vel.set(0, 0, 0);
  if (!c.isPlayer) {
    c.model.root.visible = true; c.model.body.position.y = 0; c.model.root.quaternion.identity();
    c.target = null; c.tgtVisible = false; c.goalPoint = null; c.goal = null; c.thinkT = rand(0, 0.3); c.fireT = rand(0.3, 1);
    if (c.gv) leaveSeat(c, true);
    c.vehTarget = null; c.gvTarget = null; c.tplan = null; c.crouch = false; c.crouchK = 0;
    c.burstLeft = 0; c.mountTarget = null; c.moveDir = 0; c.steerT = 0; c.stuckT = 0; c.lastPos = c.pos.clone();
    c.strafeT = 0; c.strafeDir = 0; c.walkPhase = 0; c.alertedBy = null; c.planeTarget = null; c.aimPitch = 0;
    c.heading = Math.atan2(-c.pos.x, -c.pos.z);
    c.avoidSide = c.avoidSide || pick([-1, 1]); c.goalT = 0; c.moving = false;
  }
}

// ---------- objectives ----------
function headingTo(p, team) { let n = 0; for (const c of chars) if (c.alive && !c.isPlayer && c.team === team && c.goalPoint === p) n++; return n; }
function randomInPoint(p, f = 0.6) { const a = rand(0, Math.PI * 2), r = rand(0, p.r * f); return new THREE.Vector3(p.x + Math.cos(a) * r, 0, p.z + Math.sin(a) * r); }
function chooseObjective(n, exclude) {
  if (n.tplan && n.goalPoint && undergroundAt(n.pos.x, n.pos.z, n.pos.y)) { n.goalT = 30; return; }
  if (typeof sniperTakeNest === 'function' && sniperTakeNest(n)) return;
  let best = null, bs = Infinity;
  for (const p of points) {
    if (p === exclude) continue;
    let s = Math.hypot(p.x - n.pos.x, p.z - n.pos.z);
    const secured = p.owner === n.team && Math.abs(p.progress) >= 0.999;
    if (secured) s += 500 - (foesIn(p, n.team) > 0 ? 470 : 0);
    else if (p.owner && p.owner !== n.team) s -= 15;
    s += headingTo(p, n.team) * 14 + rand(0, 140);
    if (s < bs) { bs = s; best = p; }
  }
  n.goalPoint = best || centerPoint();
  n.goal = randomInPoint(n.goalPoint);
  n.goalT = rand(25, 45);
  n.tplan = null;
  if (!n.gv && Math.random() < 0.35) planTunnel(n);
}

// ---------- think (a few times per second) ----------
function npcThink(n, S) {
  const eye = n.eye();
  const cands = [];
  for (const c of chars) {
    if (!c.alive || c.team === n.team || c.vehicle || c.inactive || (c.gv && !c.exposed)) continue;
    const d = c.pos.distanceTo(n.pos);
    if (d < S.range) cands.push([d - (c === n.alertedBy ? 30 : 0), c]);
  }
  cands.sort((a, b) => a[0] - b[0]);
  let best = null;
  for (let i = 0; i < cands.length && i < 4; i++) if (los(eye, cands[i][1].chest())) { best = cands[i][1]; break; }
  if (best && best !== n.prevTgt && (best.isPlayer || best.isRemote)) n.fireT = Math.max(n.fireT, rand(0.25, 0.7) * DIFF().react);   // a moment to react to a real player
  n.prevTgt = best;
  n.target = best; n.tgtVisible = !!best;

  n.planeTarget = null;
  if ((n.role === 'rocket' || n.turret) && (!best || n.turret)) {
    for (const pl of planes) {
      if (!pl.alive || pl.team === n.team || pl.onGround) continue;
      const d = pl.pos.distanceTo(n.pos);
      if (d < (n.turret ? (n.turret.type === 'launcher' ? 260 : 170) : 140) && los(eye, pl.pos)) { n.planeTarget = pl; break; }
    }
  }
  n.gvTarget = (n.role === 'rocket' || (n.gv && (n.gv.type === 'tank' || n.gv.T.seats[n.seat].role === 'gun')) || (n.turret && n.turret.type === 'launcher')) ? findVehicleTarget(n, n.gv && n.gv.type === 'tank' ? 160 : 110) : null;
  if (!n.nest) npcConsiderVehicle(n);   // snipers on the way to a trench stay on foot
  // grab a nearby turret when fighting
  if (!n.gv && !n.nest && !n.vehTarget && !n.turret && !n.mountTarget && (best || n.planeTarget) && Math.random() < 0.3) {
    for (const t of turrets) {
      if (t.user || t.reservedBy) continue;
      const d = Math.hypot(t.x - n.pos.x, t.z - n.pos.z);
      if (d < 22) { n.mountTarget = t; t.reservedBy = n; break; }
    }
  }
  if (n.mountTarget && n.mountTarget.user) { n.mountTarget.reservedBy = null; n.mountTarget = null; }

  // objective logic
  n.goalT -= 0.35;
  if (!n.goalPoint || n.goalT <= 0) chooseObjective(n);
  const gp = n.goalPoint || (n.goalPoint = centerPoint());
  if (!n.goal) n.goal = randomInPoint(gp);
  const dz = Math.hypot(gp.x - n.pos.x, gp.z - n.pos.z);
  const secured = gp.owner === n.team && Math.abs(gp.progress) >= 0.999;
  if (dz < gp.r * 0.8) {
    if (secured && foesIn(gp, n.team) === 0) {
      const mates = chars.filter(c => c.alive && c.team === n.team && c !== n && Math.hypot(c.pos.x - gp.x, c.pos.z - gp.z) < gp.r).length;
      if (mates >= 2 || Math.random() < 0.15) chooseObjective(n, gp);
    }
    if (!n.goal || Math.hypot(n.goal.x - n.pos.x, n.goal.z - n.pos.z) < 1.5 || Math.random() < 0.08) n.goal = randomInPoint(gp, 0.7);
  }
}

// getting a stuck soldier loose: first a detour to one side, then a small hop onto open ground,
// and if it keeps happening, a whole new objective
function unstickNPC(n, hard) {
  if (n.tplan) return;
  const free = (x, z) => !blockedAt(x, z, groundAt(x, z, n.pos.y + 1), 0.5, true) && waterDepth(x, z) < 1.2 && Math.abs(x) < EDGE - 3 && Math.abs(z) < EDGE - 3;
  // a detour point to the side, so the walk goes round whatever is in the way
  const a = (n.moveDir || 0) + n.avoidSide * rand(1.2, 1.9);
  for (const d of [9, 14, 6]) { const x = n.pos.x + Math.sin(a) * d, z = n.pos.z + Math.cos(a) * d; if (free(x, z)) { n.detour = new THREE.Vector3(x, 0, z); n.detourT = 4; break; } }
  if (n.stuckCount >= 3 || hard) {
    // wedged in: hop to the nearest open spot close by
    for (let r = 1; r <= 4 && !n.unstuck; r += 1) for (let k = 0; k < 12; k++) {
      const b = k / 12 * Math.PI * 2, x = n.pos.x + Math.cos(b) * r, z = n.pos.z + Math.sin(b) * r;
      if (free(x, z)) { n.pos.x = x; n.pos.z = z; n.pos.y = groundAt(x, z, n.pos.y + 1); n.unstuck = true; break; }
    }
    n.unstuck = false;
  }
  if (hard || n.stuckCount >= 6) { n.stuckCount = 0; n.detour = null; chooseObjective(n, n.goalPoint); }
}
function steerAngle(n, ang) {
  const offs = [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.3, -2.3, 3.0];
  // in the mountains: climb what can be climbed, and read the slope a few steps ahead to pick the easier way
  if ((SNOW || DESERT) && !undergroundAt(n.pos.x, n.pos.z, n.pos.y)) {
    const h0 = heightAt(n.pos.x, n.pos.z);
    let best = null, bestRise = Infinity;
    for (const o of offs) {
      const a = ang + o * n.avoidSide, sx = Math.sin(a), sz = Math.cos(a);
      if (blockedAt(n.pos.x + sx * 1.6, n.pos.z + sz * 1.6, n.pos.y, 0.45, true) || blockedAt(n.pos.x + sx * 0.8, n.pos.z + sz * 0.8, n.pos.y, 0.45, true)) continue;
      const rise = Math.max(heightAt(n.pos.x + sx * 3, n.pos.z + sz * 3) - h0, (heightAt(n.pos.x + sx * 7, n.pos.z + sz * 7) - h0) * 0.6);
      if (rise < 3.2) return a;                                   // gentle enough: go
      const cost = rise + Math.abs(o) * 1.5;                       // otherwise remember the least steep way round
      if (cost < bestRise) { bestRise = cost; best = a; }
    }
    if (best !== null) return best;
    return ang + Math.PI;
  }
  for (const o of offs) {
    const a = ang + o * n.avoidSide;
    if (!blockedAt(n.pos.x + Math.sin(a) * 1.6, n.pos.z + Math.cos(a) * 1.6, n.pos.y) && !blockedAt(n.pos.x + Math.sin(a) * 0.8, n.pos.z + Math.cos(a) * 0.8, n.pos.y)) return a;
  }
  return ang + Math.PI;
}

// on the mountain map, walking straight at a far point runs into cliffs, so soldiers follow the roads through the passes
function footGoal(n) {
  if (!SNOW || !n.goalPoint || !n.goal) return n.goal;
  const gp = n.goalPoint;
  if (Math.hypot(gp.x - n.pos.x, gp.z - n.pos.z) < 70) { n.froute = null; return n.goal; }
  if (n.frouteFor !== gp || !n.froute) { n.froute = routeBetween(n.pos, gp); n.frouteFor = gp; n.fri = 0; }
  while (n.fri < n.froute.length - 1) {
    const w = n.froute[n.fri], nx = n.froute[n.fri + 1];
    // reached this junction, or already further along the road than it: aim for the next one
    if (Math.hypot(w.x - n.pos.x, w.z - n.pos.z) < 22 || Math.hypot(nx.x - n.pos.x, nx.z - n.pos.z) < Math.hypot(nx.x - w.x, nx.z - w.z)) n.fri++;
    else break;
  }
  const w = n.froute[Math.min(n.fri, n.froute.length - 1)];
  return w === PD[gp.name] ? n.goal : w;
}
// ---------- per frame ----------
function updateNPC(n, dt) {
  if (n.inactive) return;
  if (!n.alive) { n.respawnT -= dt; if (n.respawnT <= 0 && !gameOver) spawnChar(n); return; }
  buildEffectsOnChar(n, dt);
  const S = ROLE_STATS[n.role];
  n.thinkT -= dt;
  if (n.thinkT <= 0) { n.thinkT = rand(0.28, 0.42); npcThink(n, S); }
  if (n.target && !n.target.alive) { n.target = null; n.tgtVisible = false; }
  if (n.gv) { npcInVehicle(n, dt); return; }
  if (n.turret) { npcTurret(n, dt); return; }

  if (n.nest) { n.vehTarget = null; n.mountTarget = null; }
  let goal = n.tplan && !n.vehTarget && !n.mountTarget ? tunnelGoal(n) : footGoal(n), speed = S.speed, mx = 0, mz = 0;
  if (n.nest && !n.tplan) goal = nestGoal(n, goal);
  if (n.detour && !n.tplan) { n.detourT -= dt; if (n.detourT <= 0 || Math.hypot(n.detour.x - n.pos.x, n.detour.z - n.pos.z) < 1.5) n.detour = null; else goal = n.detour; }
  if (n.vehTarget) {
    const v = n.vehTarget; goal = v.pos;
    if (Math.hypot(v.pos.x - n.pos.x, v.pos.z - n.pos.z) < v.T.radius + 1.8) { npcBoard(n); return; }
  }
  if (n.mountTarget) {
    const seat = turretSeat(n.mountTarget);
    goal = seat;
    if (Math.hypot(seat.x - n.pos.x, seat.z - n.pos.z) < 1.2) { n.turret = n.mountTarget; n.turret.user = n; n.turret.reservedBy = null; n.mountTarget = null; n.turret.idleT = 0; return; }
  }
  if (n.scaredT > 0 && n.fleeTo) {          // panicking (the clown!): run away and forget about fighting
    goal = n.fleeTo; n.target = null; n.tgtVisible = false; speed *= 1.3; n.vehTarget = null; n.mountTarget = null;
  }
  const tgt = n.target && n.tgtVisible ? n.target : null;
  let strafing = false;
  if (tgt && !n.mountTarget) {
    const d = tgt.pos.distanceTo(n.pos);
    if (d < S.keep) {
      strafing = true;
      n.strafeT -= dt;
      if (n.strafeT <= 0) { n.strafeT = rand(0.7, 1.8); n.strafeDir = pick([-1, -1, 0, 1, 1]); }
      const a = Math.atan2(tgt.pos.x - n.pos.x, tgt.pos.z - n.pos.z) + Math.PI / 2;
      mx = Math.sin(a) * n.strafeDir; mz = Math.cos(a) * n.strafeDir; speed *= 0.6;
    } else speed *= 0.85;
  }
  if (!strafing && goal) {
    const dx = goal.x - n.pos.x, dz = goal.z - n.pos.z, d = Math.hypot(dx, dz);
    if (d > 0.8) {
      n.steerT -= dt;
      if (n.steerT <= 0) { n.steerT = 0.2; n.moveDir = steerAngle(n, Math.atan2(dx, dz)); }
      mx = Math.sin(n.moveDir); mz = Math.cos(n.moveDir);
    }
  }
  if (waterDepth(n.pos.x, n.pos.z) > 0.7) speed *= 0.5;
  if (n.slowT > 0) speed *= 0.45;
  const moving = (mx !== 0 || mz !== 0);
  if (moving) {
    const hill = (SNOW || DESERT) && !undergroundAt(n.pos.x, n.pos.z, n.pos.y);
    if (hill) { const g = heightAt(n.pos.x + mx * 1.2, n.pos.z + mz * 1.2) - heightAt(n.pos.x, n.pos.z); if (g > 0.5) speed *= clamp(1.25 - g * 0.5, 0.45, 1); }
    const nx = n.pos.x + mx * speed * dt, nz = n.pos.z + mz * speed * dt;
    if (!blockedAt(nx, nz, n.pos.y, 0.45, hill)) { n.pos.x = nx; n.pos.z = nz; }
    else if (strafing) n.strafeDir *= -1;
    pushProps(n.pos, mx * speed, mz * speed, 0.25);
  }
  // keep apart from teammates
  for (const c of chars) {
    if (c === n || !c.alive || c.isPlayer || c.vehicle) continue;
    const dx = n.pos.x - c.pos.x, dz = n.pos.z - c.pos.z, d2 = dx * dx + dz * dz;
    if (d2 < 0.64 && d2 > 0.0001) { const d = Math.sqrt(d2); n.pos.x += dx / d * (0.8 - d) * 0.5; n.pos.z += dz / d * (0.8 - d) * 0.5; }
  }
  let floor = pushOut(n.pos, 0.4, n.pos.y);
  if (waterDepth(n.pos.x, n.pos.z) > 1.35) floor = Math.max(floor, WATER_Y - 1.25 + Math.sin(simTime * 2.2 + n.pos.x) * 0.06);   // swimming
  n.pos.y = lerp(n.pos.y, floor, Math.min(1, dt * 12));
  if (Math.abs(n.pos.y - floor) > 3) n.pos.y = floor;
  n.pos.x = clamp(n.pos.x, -EDGE + 1, EDGE - 1); n.pos.z = clamp(n.pos.z, -EDGE + 1, EDGE - 1);

  // stuck detection
  n.stuckT += dt;
  // watchdog: a soldier that has barely moved for a long time while not fighting starts fresh somewhere open
  if (!tgt && !n.turret) {
    if (!n.wdPos || n.pos.distanceTo(n.wdPos) > 4) { n.wdPos = n.pos.clone(); n.wdT = 0; }
    else if ((n.wdT += dt) > (n.nest ? 140 : 18) && moving) { n.wdT = 0; unstickNPC(n, true); }
  }
  if (n.stuckT > 2.5) {
    if (moving && n.pos.distanceTo(n.lastPos) < 1.0) {
      n.stuckCount = (n.stuckCount || 0) + 1;
      if (n.stuckCount >= 2 && !n.nest) unstickNPC(n, n.stuckCount >= 5);
      n.avoidSide = -n.avoidSide; n.steerT = 0;
      if (n.nest) {   // heading for a sniper trench: try another spot in it, and give up after a few tries
        if (++n.nestStuck > 4) { if (n.nest.by === n) n.nest.by = null; n.nest = null; n.nestStuck = 0; n.goal = n.goalPoint ? randomInPoint(n.goalPoint, 0.9) : n.goal; }
        else n.goal = n.nest.spots[Math.floor(Math.random() * n.nest.spots.length)].clone();
      } else n.goal = n.goalPoint ? randomInPoint(n.goalPoint, 0.9) : n.goal;
      // stuck on the way through the tunnels: skip ahead to the next waypoint
      if (n.tplan && ++n.tStuck >= 3) { const w = n.tplan[0]; n.pos.set(w.x, w.teleTo ? n.pos.y : groundAt(w.x, w.z, n.pos.y), w.z); n.tStuck = 0; }
    } else { if (n.tplan) n.tStuck = 0; if (n.pos.distanceTo(n.lastPos) > 3) n.stuckCount = 0; }
    n.stuckT = 0; n.lastPos.copy(n.pos);
  }

  // facing
  let face = n.heading;
  if (tgt) face = Math.atan2(tgt.pos.x - n.pos.x, tgt.pos.z - n.pos.z);
  else if (n.planeTarget) face = Math.atan2(n.planeTarget.pos.x - n.pos.x, n.planeTarget.pos.z - n.pos.z);
  else if (n.gvTarget && n.role === 'rocket') face = Math.atan2(n.gvTarget.pos.x - n.pos.x, n.gvTarget.pos.z - n.pos.z);
  else if (moving) face = Math.atan2(mx, mz);
  n.heading += wrapAngle(face - n.heading) * Math.min(1, dt * 8);
  n.moving = moving;
  if (n.crouchT === undefined || (n.crouchT -= dt) <= 0) { n.crouchT = rand(1.5, 4); n.wantCrouch = Math.random() < (n.role === 'sniper' ? 0.85 : 0.4); }
  n.crouch = !!(tgt && n.wantCrouch && (!moving || speed < 2.5));
  if (n.nest && typeof nestStance === 'function') nestStance(n, dt, tgt);
  npcShoot(n, S, dt);
  animateNPC(n, dt, moving ? speed : 0, !!(tgt || n.planeTarget));
}

function npcShoot(n, S, dt) {
  n.fireT -= dt;
  if (n.fireT > 0) return;
  if (n.role === 'rocket' && n.gvTarget && n.gvTarget.alive) {
    const v = n.gvTarget, from = n.eye(), d = v.pos.distanceTo(from);
    if (d > 10) { const aim = v.pos.clone().add(new THREE.Vector3(-Math.sin(v.yaw) * v.speed * d / 45, 1.2, -Math.cos(v.yaw) * v.speed * d / 45)).add(new THREE.Vector3(rand(-1, 1), rand(-0.5, 0.5), rand(-1, 1))); spawnRocket(from, aim.sub(from).normalize(), n, { speed: 45, dmg: 150, radius: 6.5 }); playAt('rocket', from); n.fireT = S.rate * rand(1, 1.3); return; }
  }
  if (n.role === 'rocket' && n.planeTarget && !n.target) {
    const pl = n.planeTarget, from = n.eye();
    const lead = pl.pos.clone().addScaledVector(planeFwd(pl), pl.speed * from.distanceTo(pl.pos) / 50);
    spawnRocket(from, lead.sub(from).normalize(), n, { speed: 50, homing: true, dmg: 150 });
    playAt('rocket', from); n.fireT = S.rate * rand(1, 1.4); return;
  }
  const tgt = n.target;
  if (!tgt || !n.tgtVisible || !tgt.alive) { n.burstLeft = 0; return; }
  const d = tgt.pos.distanceTo(n.pos);
  n.aimPitch = Math.atan2(tgt.pos.y + 1.3 - (n.pos.y + 1.6), Math.max(d, 1));
  n.model.muzzle.getWorldPosition(_tmpV); const from = _tmpV.clone();
  if (n.role === 'rocket') {
    if (d < 12) { n.fireT = 0.8; return; }
    const aim = tgt.chest().addScaledVector(tgt.vel, d / 45).add(new THREE.Vector3(rand(-1.5, 1.5), rand(-0.8, 0.5), rand(-1.5, 1.5)));
    spawnRocket(from, aim.sub(from).normalize(), n, { speed: 45, dmg: 120, radius: 6.5 });
    playAt('rocket', from); n.fireT = S.rate * rand(0.9, 1.3); return;
  }
  if (n.burstLeft <= 0) n.burstLeft = Math.round(rand(S.burst[0], S.burst[1]));
  n.burstLeft--;
  n.fireT = n.burstLeft > 0 ? S.rate : S.rate + rand(S.pause[0], S.pause[1]);
  let p = S.acc - d / (n.role === 'sniper' ? 330 : 170);
  if (n.moving) p -= 0.1;
  if (tgt.isPlayer) { p -= 0.08; if (tgt.vel.lengthSq() > 25) p -= 0.08; if (tgt.turret) p -= 0.1; }
  const human = tgt.isPlayer || tgt.isRemote;
  if (human) p += DIFF().acc;
  p = clamp(p, 0.04, human && BATTLE.diff === "insane" ? 0.85 : 0.7);
  const aim = tgt.chest();
  const dir = aim.clone().sub(from).normalize();
  let end, onHit = null;
  n.shots = ((n.shots || 0) + 1) % 8;
  if (Math.random() < p) {
    end = aim.clone().add(new THREE.Vector3(rand(-0.2, 0.2), rand(-0.3, 0.3), rand(-0.2, 0.2)));
    const dmg = S.dmg * rand(0.8, 1.2) * (human ? DIFF().dmg : 1), head = Math.random() < 0.06;
    onHit = () => { if (n.alive || true) damage(tgt, dmg, n, dir, n.role === 'sniper' ? 14 : 4, head); };
  } else {
    end = aim.clone().add(new THREE.Vector3(rand(-1, 1), rand(-0.6, 1), rand(-1, 1)).normalize().multiplyScalar(rand(0.8, 2.5)));
    end.addScaledVector(end.clone().sub(from).normalize(), 15);
    const gh = heightAt(end.x, end.z); if (end.y < gh) end.y = gh;
    onHit = () => burst(end, 2, 0x6b5a3e, 3, 0.3, 0.05);
  }
  shootTracer(from, end, n.role === 'sniper' ? 0xffffff : 0xffd98a, n.role === 'sniper' ? 500 : 260, n.role === 'sniper' ? 0.04 : 0.03, onHit);
  playAt(n.role === 'sniper' ? 'sniper' : 'rifle', from, 0.8);
}

function npcTurret(n, dt) {
  const t = n.turret;
  const seat = turretSeat(t);
  n.pos.set(seat.x, t.y, seat.z);
  n.heading = t.yaw + Math.PI;
  let aim = null;
  if (n.planeTarget && n.planeTarget.alive) {
    const pl = n.planeTarget, d = pl.pos.distanceTo(n.pos);
    aim = pl.pos.clone().addScaledVector(planeFwd(pl), pl.speed * d / (t.type === 'mg' ? 300 : 60));
  } else if (n.target && n.tgtVisible && n.target.alive) aim = n.target.chest();
  else if (n.gvTarget && n.gvTarget.alive) aim = n.gvTarget.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
  t.fireT -= dt;
  if (aim) {
    t.idleT = 0;
    const origin = new THREE.Vector3(t.x, t.y + 1.65, t.z);
    const dx = aim.x - origin.x, dy = aim.y - origin.y, dz = aim.z - origin.z;
    const wantYaw = Math.atan2(-dx, -dz), wantPitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.35, 1.2);
    const ey = wrapAngle(wantYaw - t.yaw);
    t.yaw += clamp(ey, -2.2 * dt, 2.2 * dt); t.pitch += clamp(wantPitch - t.pitch, -1.5 * dt, 1.5 * dt);
    if (Math.abs(ey) < 0.08 && t.fireT <= 0) {
      if (t.type === 'launcher' && !n.planeTarget && Math.hypot(dx, dz) < 15) { t.fireT = 1; }
      else {
        const dir = turretDir(t).add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(t.type === 'mg' ? 0.03 : 0.01)).normalize();
        turretFire(t, dir, n);
        if (t.type === 'mg') t.fireT = 0.1;
      }
    }
  } else {
    t.idleT += dt;
    if (t.idleT > 9) { t.user = null; n.turret = null; }
  }
  updateTurretVisual(t);
  const m = n.model;
  m.root.position.copy(n.pos); m.root.rotation.y = n.heading;
  m.legL.rotation.x = 0; m.legR.rotation.x = 0; limbsStraight(m); m.body.rotation.x = 0;
  m.armR.rotation.set(-1.3, 0, 0); m.armL.rotation.set(-1.3, 0, 0);
  m.gun.visible = false;
}

function animateNPC(n, dt, speed, aiming) {
  const m = n.model;
  m.gun.visible = true;
  m.root.position.copy(n.pos); m.root.rotation.y = n.heading;
  n.walkPhase += speed * dt * 2.1;
  const sw = speed > 0.2 ? Math.sin(n.walkPhase) * (n.crouch ? 0.35 : 0.75) : 0;
  n.crouchK = (n.crouchK || 0) + ((n.crouch ? 1 : 0) - (n.crouchK || 0)) * Math.min(1, dt * 10);
  const ck = n.crouchK;
  const walking = speed > 0.2, cph = Math.cos(n.walkPhase), kb = n.crouch ? 0.5 : 0.95;
  m.body.position.y = -0.5 * ck + (walking ? Math.abs(cph) * 0.035 : 0);
  m.body.rotation.x = (speed > 5 ? 0.1 : walking ? 0.04 : 0) * (1 - ck);
  m.legL.rotation.x = sw - 1.25 * ck; m.legR.rotation.x = -sw + 0.45 * ck;
  // knees bend as each leg swings forward, and fold when kneeling
  m.shinL.rotation.x = (walking ? Math.max(0, -cph) * kb : 0) + 1.45 * ck; m.shinR.rotation.x = (walking ? Math.max(0, cph) * kb : 0) + 1.35 * ck;
  n.readyK = (n.readyK === undefined ? 1 : n.readyK) + ((aiming ? 0 : 1) - (n.readyK === undefined ? 1 : n.readyK)) * Math.min(1, dt * 9);
  const ap = aiming ? n.aimPitch || 0 : 0;
  poseGun(m, ap, n.readyK, walking ? sw : 0);
  m.head.rotation.x = -ap * 0.6 * (1 - n.readyK); m.head.rotation.y = n.readyK * Math.sin(n.walkPhase * 0.23 + (n.npcIdx || 0)) * 0.25;
}
