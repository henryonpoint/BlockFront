// ===================== fx.js : particles, explosions, water, graphics quality =====================
// All smoke, fire, sparks and dust are drawn as two big batches of soft dots (one glowing, one normal),
// which looks better than the old little boxes and costs far less to draw.

// ---------- settings (saved on this device) ----------
const SET = { quality: 'auto', sens: 1, vol: 1 };
try { Object.assign(SET, JSON.parse(localStorage.getItem('bf_settings') || '{}')); } catch (e) { }
function saveSettings() { try { localStorage.setItem('bf_settings', JSON.stringify(SET)); } catch (e) { } }

// ---------- particle pools ----------
const softTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
function makePool(max, additive) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(max * 3), col = new Float32Array(max * 4), size = new Float32Array(max);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: softTex }, scale: { value: 400 }, fogColor: { value: FOG_COLOR }, fogNear: { value: 110 }, fogFar: { value: 520 }, dim: { value: 1 } },
    vertexShader: `attribute vec4 aColor; attribute float aSize; uniform float scale, fogNear, fogFar; varying vec4 vCol; varying float vFog;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = min(aSize * scale / -mv.z, 420.0); vCol = aColor; vFog = smoothstep(fogNear, fogFar, -mv.z); }`,
    fragmentShader: additive
      ? `uniform sampler2D map; varying vec4 vCol; varying float vFog; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vCol.rgb * a * vCol.a * (1.0 - vFog), 1.0); }`
      : `uniform sampler2D map; uniform vec3 fogColor; uniform float dim; varying vec4 vCol; varying float vFog; void main(){ float a = texture2D(map, gl_PointCoord).a * vCol.a; if (a < 0.01) discard; gl_FragColor = vec4(mix(vCol.rgb * dim, fogColor, vFog), a * (1.0 - vFog * 0.6)); }`,
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = additive ? 12 : 11; scene.add(pts);
  return { max, n: 0, P: [], pos, col, size, geo, mat, pts };
}
const PMAX = LITE ? 350 : 900;
const poolSmoke = makePool(PMAX, false), poolGlow = makePool(PMAX, true);
const _c = new THREE.Color();
// o: {vx,vy,vz, life, s0, s1 (start/end size in metres), color (hex), a (opacity), grav, drag, c1 (end color hex), under}
function emit(pool, x, y, z, o) {
  if (pool.P.length >= pool.max) { if (o.keep) pool.P.shift(); else return; }
  _c.setHex(o.color);
  const p = { x, y, z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life: o.life, max: o.life, s0: o.s0, s1: o.s1 === undefined ? o.s0 : o.s1, r: _c.r, g: _c.g, b: _c.b, a: o.a === undefined ? 1 : o.a, grav: o.grav || 0, drag: o.drag || 0, fin: o.fadeIn || 0 };
  if (o.c1 !== undefined) { _c.setHex(o.c1); p.r1 = _c.r; p.g1 = _c.g; p.b1 = _c.b; }
  pool.P.push(p);
}
function updatePool(pool, dt) {
  const P = pool.P; let n = 0;
  for (let i = 0; i < P.length; i++) {
    const p = P[i]; p.life -= dt; if (p.life <= 0) continue;
    if (p.drag) { const k = Math.exp(-dt * p.drag); p.vx *= k; p.vy *= k; p.vz *= k; }
    p.vy -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const t = 1 - p.life / p.max, j = n * 3, k4 = n * 4;
    pool.pos[j] = p.x; pool.pos[j + 1] = p.y; pool.pos[j + 2] = p.z;
    if (p.r1 !== undefined) { pool.col[k4] = p.r + (p.r1 - p.r) * t; pool.col[k4 + 1] = p.g + (p.g1 - p.g) * t; pool.col[k4 + 2] = p.b + (p.b1 - p.b) * t; }
    else { pool.col[k4] = p.r; pool.col[k4 + 1] = p.g; pool.col[k4 + 2] = p.b; }
    pool.col[k4 + 3] = p.a * (1 - t * t) * (p.fin ? Math.min(1, t / p.fin) : 1);
    pool.size[n] = p.s0 + (p.s1 - p.s0) * Math.sqrt(t);
    P[n++] = p;
  }
  P.length = n;
  pool.geo.setDrawRange(0, n);
  pool.geo.attributes.position.needsUpdate = pool.geo.attributes.aColor.needsUpdate = pool.geo.attributes.aSize.needsUpdate = true;
}

// ---------- drop-in replacements for the old box effects ----------
function smokePuff(pos, color = 0x999999, size = 0.25, life = 0.9, rise = 0.6) {
  emit(poolSmoke, pos.x, pos.y, pos.z, { color, life: life * 1.3, s0: size * 2.2, s1: size * 8, a: 0.5, vy: rise, vx: rand(-0.25, 0.25), vz: rand(-0.25, 0.25), drag: 0.6 });
}
function burst(pos, count, color, speed, life, size) {
  _c.setHex(color);
  const bright = _c.r + _c.g + _c.b > 1.9 && _c.r > 0.75;   // sparks glow, dirt and chips don't
  for (let i = 0; i < count; i++) {
    const vx = Math.random() - 0.5, vy = Math.random() * 0.8 + 0.1, vz = Math.random() - 0.5, k = speed * (0.4 + Math.random()) / Math.hypot(vx, vy, vz);
    emit(bright ? poolGlow : poolSmoke, pos.x, pos.y, pos.z, { color, life: life * (0.5 + Math.random()), s0: size * (bright ? 2.2 : 3), s1: size * (bright ? 0.6 : 2), a: bright ? 1 : 0.9, vx: vx * k, vy: vy * k, vz: vz * k, grav: 14, drag: 0.4 });
  }
}
const ringGeo = new THREE.RingGeometry(0.82, 1, 40);
function fxExplosion(pos, radius) {
  const R = radius, far = camera.position.distanceTo(pos) > 220, k = far || LITE ? 0.5 : 1;
  // white-hot flash, rolling fireball, dark smoke column
  emit(poolGlow, pos.x, pos.y + 0.5, pos.z, { color: 0xfff2c8, life: 0.1, s0: R * 0.9, s1: R * 1.5, a: 0.8, keep: true });
  for (let i = 0; i < 12 * k; i++) {
    const a = Math.random() * 6.28, u = Math.random(), sp = R * rand(0.6, 1.5);
    emit(poolGlow, pos.x, pos.y + 0.4, pos.z, { color: 0xffb040, c1: 0xb02800, life: rand(0.35, 0.7), s0: R * 0.28, s1: R * rand(0.55, 0.85), a: 0.6, vx: Math.cos(a) * sp * (1 - u * 0.6), vy: sp * (0.4 + u), vz: Math.sin(a) * sp * (1 - u * 0.6), drag: 3, keep: true });
  }
  for (let i = 0; i < 14 * k; i++) {
    const a = Math.random() * 6.28, sp = R * rand(0.2, 0.7);
    emit(poolSmoke, pos.x + rand(-1, 1) * R * 0.15, pos.y + rand(0.3, 1.5), pos.z + rand(-1, 1) * R * 0.15, { color: 0x2c2926, c1: 0x6a6660, life: rand(1.8, 3.4), s0: R * 0.3, s1: R * rand(0.8, 1.25), a: 0.7, vx: Math.cos(a) * sp, vy: rand(1.5, 4.5), vz: Math.sin(a) * sp, drag: 1.2, fadeIn: 0.08, keep: true });
  }
  // sparks, and a ring of dust racing out along the ground
  for (let i = 0; i < 26 * k; i++) {
    const a = Math.random() * 6.28, up = rand(0.2, 1), sp = rand(10, 26);
    emit(poolGlow, pos.x, pos.y + 0.3, pos.z, { color: 0xffd070, c1: 0xff5a10, life: rand(0.4, 1.1), s0: 0.32, s1: 0.08, vx: Math.cos(a) * sp * (1 - up * 0.5), vy: up * sp * 0.8, vz: Math.sin(a) * sp * (1 - up * 0.5), grav: 16, drag: 0.8 });
  }
  const under = !!undergroundAt(pos.x, pos.z, pos.y - 1), gh = under ? pos.y - 0.4 : heightAt(pos.x, pos.z);
  if (pos.y - gh < 3) {
    for (let i = 0; i < 14 * k; i++) {
      const a = i / 14 * 6.28 + rand(-0.2, 0.2), sp = R * rand(1.6, 2.4);
      emit(poolSmoke, pos.x, gh + 0.4, pos.z, { color: under ? 0x8a8378 : 0xa3906a, life: rand(1.0, 1.7), s0: R * 0.2, s1: R * 0.6, a: 0.45, vx: Math.cos(a) * sp, vy: rand(0.3, 1.2), vz: Math.sin(a) * sp, drag: 2.6 });
    }
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, gh + 0.25, pos.z);
    addEffect(ring, 0.35, (o, t) => { o.scale.setScalar(0.5 + t * R * 1.5); o.material.opacity = 0.6 * (1 - t); });
    // chunks of dirt thrown up
    for (let i = 0; i < 10 * k; i++) {
      const a = Math.random() * 6.28, sp = rand(4, 11);
      emit(poolSmoke, pos.x, gh + 0.3, pos.z, { color: 0x3d3226, life: rand(0.8, 1.5), s0: rand(0.25, 0.5), s1: 0.2, a: 1, vx: Math.cos(a) * sp, vy: rand(6, 14), vz: Math.sin(a) * sp, grav: 20 });
    }
  }
}
// muzzle flash and a wisp of smoke at a gun barrel in the world (NPCs, vehicles, other players)
function fxMuzzle(pos, dir, big = 1) {
  if (camera.position.distanceTo(pos) > 160) return;
  emit(poolGlow, pos.x + dir.x * 0.25, pos.y + dir.y * 0.25, pos.z + dir.z * 0.25, { color: 0xffd98a, life: 0.06, s0: 0.9 * big, s1: 1.3 * big, a: 0.9 });
  if (Math.random() < 0.5) emit(poolSmoke, pos.x + dir.x * 0.3, pos.y + dir.y * 0.3, pos.z + dir.z * 0.3, { color: 0xbdbdbd, life: 0.7, s0: 0.3 * big, s1: 1.1 * big, a: 0.25, vx: dir.x * 1.5, vy: 0.5 + dir.y * 1.5, vz: dir.z * 1.5, drag: 2 });
}
// brass flying out of your own gun
const casingGeo = new THREE.BoxGeometry(0.018, 0.018, 0.05), casingMat = new THREE.MeshLambertMaterial({ color: 0xd9a441 });
function fxCasing() {
  if (LITE || effects.length > 300) return;
  const m = new THREE.Mesh(casingGeo, casingMat); m.userData.keepMat = true;
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  m.position.copy(camera.position).addScaledVector(right, 0.22).addScaledVector(fwd, 0.45).add(new THREE.Vector3(0, -0.13, 0));
  const v = right.multiplyScalar(rand(1.8, 3)).add(new THREE.Vector3(0, rand(1.8, 2.8), 0)).addScaledVector(fwd, rand(-0.5, 0.5)).add(player.vel.clone().setY(0));
  const rv = new THREE.Vector3(rand(-20, 20), rand(-20, 20), rand(-20, 20));
  addEffect(m, 0.9, (o, t, dt) => { v.y -= 14 * dt; o.position.addScaledVector(v, dt); o.rotation.x += rv.x * dt; o.rotation.y += rv.y * dt; o.rotation.z += rv.z * dt; });
}
// keep shared materials alive when an effect ends
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i]; e.life -= dt;
    e.update(e.obj, Math.min(1, 1 - e.life / e.max), dt);
    if (e.life <= 0) { scene.remove(e.obj); if (e.obj.material && e.obj.material !== decalMat && !e.obj.userData.keepMat) e.obj.material.dispose(); effects.splice(i, 1); }
  }
}

// ---------- water ----------
const waterMat = new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 }, sun: { value: SUN_DIR }, fogColor: { value: FOG_COLOR }, fogNear: { value: 110 }, fogFar: { value: 520 } },
  vertexShader: `varying vec3 vW; varying float vDepth; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float time, fogNear, fogFar; uniform vec3 sun, fogColor; varying vec3 vW; varying float vDepth;
    void main(){
      vec2 p = vW.xz; float t = time;
      // slope of a few crossing waves gives the surface normal
      float dx = 0.35 * cos(p.x * 0.35 + t * 1.3) + 0.3 * cos((p.x + p.y) * 0.6 + t * 1.9) + 0.42 * cos((p.x - p.y) * 1.7 + t * 2.7) + 0.5 * cos(p.x * 3.1 + p.y * 1.3 + t * 3.4);
      float dz = 0.28 * cos(p.y * 0.28 - t * 1.1) + 0.3 * cos((p.x + p.y) * 0.6 + t * 1.9) - 0.42 * cos((p.x - p.y) * 1.7 + t * 2.7) + 0.2 * cos(p.x * 3.1 + p.y * 1.3 + t * 3.4);
      vec3 n = normalize(vec3(-dx * 0.16, 1.0, -dz * 0.16));
      vec3 V = normalize(cameraPosition - vW);
      float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
      vec3 deep = vec3(0.05, 0.27, 0.42), shallow = vec3(0.16, 0.52, 0.66), skyc = vec3(0.72, 0.87, 0.98);
      vec3 c = mix(deep, shallow, clamp(0.5 + dx * 0.25, 0.0, 1.0));
      c = mix(c, skyc, fres * 0.75);
      float spec = pow(max(dot(reflect(-sun, n), V), 0.0), 140.0);
      c += vec3(1.0, 0.95, 0.8) * spec * 1.6;
      float fog = smoothstep(fogNear, fogFar, vDepth);
      gl_FragColor = vec4(mix(c, fogColor, fog), mix(0.78, 0.96, fres));
    }`,
  transparent: true,
});

// ---------- graphics quality: fixed levels, or "auto" which follows the frame rate ----------
const GFX = { ratio: 1, maxRatio: Math.min(devicePixelRatio || 1, 1.5), shadows: !LITE, slowT: 0, fastT: 0, fps: 60, acc: 0, frames: 0, step: 0, ceil: 0, shadowEvery: 1, sf: 0, worst: 0, wacc: 0 };
// Turning shadows fully on or off makes the browser rebuild every shader at once, which can freeze a
// slower computer for seconds. So during a battle "auto" only makes shadows cheaper, never switches them off.
function setShadowRes(size) {
  if (sunLight.shadow.mapSize.x === size) return;
  sunLight.shadow.mapSize.set(size, size);
  if (sunLight.shadow.map) { sunLight.shadow.map.dispose(); sunLight.shadow.map = null; }
}
// the auto ladder, from best to lightest
const AUTO_STEPS = [
  { r: 1.5, s: 3072, e: 1 }, { r: 1.25, s: 2048, e: 1 }, { r: 1.0, s: 2048, e: 1 }, { r: 1.0, s: 1024, e: 2 },
  { r: 0.85, s: 1024, e: 2 }, { r: 0.75, s: 1024, e: 3 }, { r: 0.62, s: 768, e: 4 },
];
function applyAutoStep(i) {
  GFX.step = clamp(i, 0, AUTO_STEPS.length - 1);
  const st = AUTO_STEPS[GFX.step];
  setRatio(Math.min(st.r, LITE ? 1 : GFX.maxRatio)); setShadowRes(LITE ? 1024 : st.s); GFX.shadowEvery = st.e;
}
function setRatio(r) { r = clamp(r, 0.5, GFX.maxRatio); if (Math.abs(r - GFX.ratio) < 0.01) return; GFX.ratio = r; renderer.setPixelRatio(r); renderer.setSize(innerWidth, innerHeight); }
function setShadows(on) { if (GFX.shadows === on) return; GFX.shadows = on; sunLight.castShadow = on; }
function applyQuality() {
  const q = SET.quality;
  GFX.ratio = -1;
  if (q === 'low') { setRatio(Math.min(0.75, GFX.maxRatio)); setShadows(false); }
  else if (q === 'medium') { setRatio(1); setShadows(!LITE); }
  else if (q === 'high') { setRatio(GFX.maxRatio); setShadows(true); }
  else { setShadows(!LITE); GFX.ceil = 0; applyAutoStep(LITE ? 2 : (GFX.maxRatio > 1.2 ? 0 : 2)); }
  if (q !== 'auto') { GFX.shadowEvery = q === 'low' ? 2 : 1; setShadowRes(q === 'high' ? 3072 : 2048); }
  renderer.domElement.style.filter = '';      // a CSS filter on the whole game is slow on many computers
  GFX.slowT = GFX.fastT = 0;
}
function updateQuality(dt) {
  GFX.acc += dt; GFX.frames++;
  if (GFX.acc < 1) return;
  GFX.fps = GFX.frames / GFX.acc; GFX.acc = 0; GFX.frames = 0;
  if (SET.quality !== 'auto' || document.hidden || !started) return;
  if (GFX.fps < 40) { GFX.slowT++; GFX.fastT = 0; } else if (GFX.fps > 57) { GFX.fastT++; GFX.slowT = 0; } else { GFX.slowT = 0; GFX.fastT = 0; }
  if (GFX.slowT >= 2) {                         // slow for 2 seconds: one step lighter, and never come back above it
    GFX.slowT = 0; GFX.ceil = GFX.step + 1;
    if (GFX.step < AUTO_STEPS.length - 1) applyAutoStep(GFX.step + 1);
  }
  if (GFX.fastT >= 30 && GFX.step - 1 >= GFX.ceil) { GFX.fastT = 0; applyAutoStep(GFX.step - 1); }
}

// ---------- every frame ----------
let _dustT = 0;
function updateFx(dt) {
  updateQuality(dt);
  renderer.shadowMap.autoUpdate = GFX.shadowEvery <= 1;
  if (GFX.shadowEvery > 1 && (++GFX.sf % GFX.shadowEvery === 0)) renderer.shadowMap.needsUpdate = true;
  const sc = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
  poolSmoke.mat.uniforms.scale.value = poolGlow.mat.uniforms.scale.value = sc;
  for (const m of [poolSmoke.mat, poolGlow.mat, waterMat]) { m.uniforms.fogNear.value = scene.fog.near; m.uniforms.fogFar.value = scene.fog.far; }
  poolSmoke.mat.uniforms.dim.value = typeof _ugDim !== 'undefined' ? 1 - _ugDim * 0.45 : 1;
  waterMat.uniforms.time.value = performance.now() / 1000 % 10000;
  // dust behind moving vehicles on the surface
  _dustT -= dt;
  if (_dustT <= 0) {
    _dustT = 0.07;
    for (const v of gvehicles) {
      if (!v.alive || Math.abs(v.speed) < 5 || v.airborne || v.pos.distanceTo(camera.position) > 170) continue;
      if (undergroundAt(v.pos.x, v.pos.z, v.pos.y + 0.5) || waterDepth(v.pos.x, v.pos.z) > 0) continue;
      const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw), s = Math.sign(v.speed), half = v.T.len / 2;
      for (const side of [-1, 1]) emit(poolSmoke, v.pos.x - fx * half * s + fz * side * v.T.wid * 0.4, v.pos.y + 0.3, v.pos.z - fz * half * s - fx * side * v.T.wid * 0.4,
        { color: 0xb09a72, life: rand(0.9, 1.6), s0: 0.7, s1: rand(2.4, 3.6), a: 0.28, vx: rand(-0.6, 0.6), vy: rand(0.4, 1.1), vz: rand(-0.6, 0.6), drag: 1 });
    }
  }
  updatePool(poolSmoke, dt); updatePool(poolGlow, dt);
}
applyQuality();
