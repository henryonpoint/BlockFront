// ---------- Pacific War ----------
// A chain of tiny islands joined by knee-deep coral reefs in the open ocean. Each side has a home island with an
// airstrip, and a fleet offshore: a carrier, a battleship, destroyers and submarines you can take command of.
// The patrol boats are for players; the soldiers wade along the reefs from island to island.

function buildPacificExtras() {
  // palms on every island, thicker on the bigger ones, none on the airstrips or bases
  const spots = [];
  for (const I of PAC_ISLES) {
    const n = Math.round((I.rx * I.rz) / (I.home ? 70 : 55)) + 2;
    for (let k = 0, tries = 0; k < n && tries < n * 8; tries++) {
      const a = rand(0, 6.28), r = Math.sqrt(Math.random()) * 0.85, x = I.x + Math.cos(a) * I.rx * r, z = I.z + Math.sin(a) * I.rz * r;
      if (pacIsleD(I, x, z) > 0.9 || heightAt(x, z) < 0.8) continue;
      if (POINTS_DEF.some(p => Math.hypot(p.x - x, p.z - z) < 14)) continue;
      if (['blue', 'red'].some(t => { const R = RUNWAYS[t], B = BASES[t]; return (Math.abs(x - R.x) < R.len / 2 + 12 && Math.abs(z - R.z) < R.wid / 2 + 10) || Math.hypot(x - B.x, z - B.z) < 36; })) continue;
      spots.push({ x, y: heightAt(x, z) - 0.2, z, r: rand(0, 6.28), lean: rand(-0.18, 0.18), s: rand(0.75, 1.15) }); k++;
    }
  }
  wkPalms(spots);
  // each point island: a sandbagged gun pit, a palm-thatched hut, a few crates and an observation post
  for (const p of POINTS_DEF) {
    const P = new Part(), y = heightAt(p.x + 12, p.z + 9);
    for (let i = 0; i < 9; i++) { const a = i / 9 * 5.2 - 2.6; P.box(1.1, 0.4, 0.6, 0xa89a72, p.x + 12 + Math.cos(a) * 3.2, y + 0.2 + (i % 2) * 0.38, p.z + 9 + Math.sin(a) * 3.2, 0, -a, 0); }
    const hx = p.x - 13, hz = p.z - 8, hy = heightAt(hx, hz);
    for (const [ox, oz] of [[-2, -1.6], [2, -1.6], [-2, 1.6], [2, 1.6]]) P.cyl(0.12, 0.12, 2.4, 0x7a5c3a, hx + ox, hy + 1.2, hz + oz);
    P.box(4.6, 0.1, 3.6, 0x8a7a4a, hx, hy + 0.6, hz); P.box(5.4, 0.25, 4.4, 0xb8a060, hx, hy + 2.55, hz, 0, 0, 0.18); P.box(5.4, 0.25, 4.4, 0xa89050, hx, hy + 2.55, hz, 0, 0, -0.18);
    for (let i = 0; i < 4; i++) P.box(0.9, 0.7, 0.9, 0x6a5a3a, p.x + 6 + (i % 2) * 1, heightAt(p.x + 6, p.z - 12) + 0.35 + Math.floor(i / 2) * 0.7, p.z - 12 + (i % 2) * 0.3);
    const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; m.userData.static = true; scene.add(m);
    addBlock(hx, hz, 4.6, 0.65, 3.6, LV.hidden, { y: hy });
  }
  // home islands: a wooden pier out into deep water with the patrol boats, a hangar and fuel drums by the strip
  for (const t of ['blue', 'red']) {
    const I = PAC_ISLES.find(q => q.home === t), sd = Math.sign(I.z), P = new Part(), wood = 0x7a5c3a;
    const px = I.x + 95, pz0 = I.z - sd * (I.rz - 6), pz1 = I.z - sd * (I.rz + 40);
    for (let z = Math.min(pz0, pz1); z < Math.max(pz0, pz1); z += 2) P.box(6, 0.2, 1.8, wood, px, 1.3, z + 1);
    for (let z = Math.min(pz0, pz1); z <= Math.max(pz0, pz1); z += 6) for (const o of [-2.6, 2.6]) P.cyl(0.2, 0.2, 26, 0x5a4028, px + o, -11.5, z);
    const R = RUNWAYS[t], hx = R.x - R.len / 2 - 22, hz = R.z, hy = heightAt(hx, hz);
    P.box(18, 7, 14, t === 'blue' ? 0x7a8068 : 0x7a7458, hx, hy + 3.5, hz); P.cyl(9, 9, 18, t === 'blue' ? 0x6a7058 : 0x6a6448, hx, hy + 7, hz, 0, 0, Math.PI / 2, 0.5, 16);
    for (let i = 0; i < 8; i++) P.cyl(0.35, 0.35, 0.9, i % 3 ? 0x5a6a3a : 0x8a3a2a, R.x + R.len / 2 + 14 + (i % 4) * 0.8, heightAt(R.x + R.len / 2 + 14, R.z) + 0.45, R.z + 8 + Math.floor(i / 4) * 0.8, 0, 0, 0, 1, 10);
    const m = new THREE.Mesh(P.build(), VEH_MAT); m.castShadow = true; m.receiveShadow = true; m.userData.static = true; scene.add(m);
    addBlock(px, (pz0 + pz1) / 2, 6, 0.3, Math.abs(pz1 - pz0), LV.hidden, { y: 1.15 });   // you can walk out along the pier
    addBlock(hx, hz, 18, 9, 14, LV.hidden, { y: hy });
  }
}

function buildPacificVehicles() {
  const tryPark = (type, team, x, z, yaw) => { for (let k = 0; k < 24; k++) { const px = x + rand(-10, 10), pz = z + rand(-8, 8); if (heightAt(px, pz) > 0.9 && vehicleSpotFree(px, pz, 3.5)) { makeGV(type, team, px, pz, yaw); return true; } } return false; };
  for (const t of ['blue', 'red']) {
    const I = PAC_ISLES.find(q => q.home === t), sd = Math.sign(I.z), B = BASES[t];
    // patrol boats moored along the pier, and a couple more off the beach
    const px = I.x + 95;
    for (let k = 0; k < 4; k++) { const x = px + (k % 2 ? 7 : -7), z = I.z - sd * (I.rz + 10 + Math.floor(k / 2) * 14); if (waterDepth(x, z) > 1.2) makeGV('boat', t, x, z, sd > 0 ? Math.PI : 0, WATER_Y); }
    for (const ox of [-80, -40]) { const x = I.x + ox, z = I.z - sd * (I.rz + 16); if (waterDepth(x, z) > 1.2) makeGV('boat', t, x, z, sd > 0 ? Math.PI : 0, WATER_Y); }
    // a jeep and a light tank on the home island
    tryPark('jeep', t, B.x + 30, B.z - sd * 6, sd > 0 ? Math.PI : 0); tryPark('jeep', t, B.x - 40, B.z - sd * 4, sd > 0 ? Math.PI : 0); tryPark('tank', t, B.x + 60, B.z - sd * 8, sd > 0 ? Math.PI : 0);
  }
  // a boat moored at each of the outer point islands, for whoever holds it
  for (const n of ['A', 'B', 'D', 'E']) {
    const p = PD[n], I = PAC_ISLES.find(q => q.x === p.x && q.z === p.z), side = Math.sign(p.x);
    for (let k = 0; k < 10; k++) { const x = p.x + side * (I.rx + 10 + k * 2), z = p.z + rand(-6, 6); if (waterDepth(x, z) > 1.5) { makeGV('boat', p.z > 0 ? 'blue' : 'red', x, z, Math.PI / 2, WATER_Y); break; } }
  }
}
