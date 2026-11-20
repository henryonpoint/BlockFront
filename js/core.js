// The built-in Math.hypot is slow and makes garbage on every call; the game calls it thousands of times
// a frame, so use a plain version for 2 or 3 numbers (the clean-up pauses showed up as freezes).
(() => { const slow = Math.hypot; Math.hypot = function (a, b, c) { return arguments.length > 3 ? slow.apply(Math, arguments) : Math.sqrt(a * a + (b === undefined ? 0 : b * b) + (c === undefined ? 0 : c * c)); }; })();
// ---------- which map and game mode this page builds ----------
// The world is built once when the page loads, so changing the map or mode reloads the page.
// A join that needs a different map stores what it needs in sessionStorage first ('bf_force').
const MAPS = { green: 'Green valley', snow: 'Snow mountain', desert: 'Desert', houston: 'Houston city', wake: 'Wake Island', normandy: 'Normandy beach', europe: 'Berlin 1945', dam: 'The Dam', afghan: 'Desert Combat', dogfight: 'Dogfight: old planes', jetfight: 'Dogfight: jets', wwifight: 'Dogfight: WW1 triplanes', zd30: 'Zero Dark 30' };
const MODES = { conquest: 'Conquest', tdm: 'Team battle', koth: 'King of the hill', four: '4 teams', coop: 'Co-op' };
const WORLD = (() => {
  let w = { map: 'green', mode: 'conquest' };
  try { const b = JSON.parse(localStorage.getItem('bf_battle') || '{}'); if (MAPS[b.map]) w.map = b.map; if (MODES[b.mode]) w.mode = b.mode; } catch (e) { }
  try { const f = JSON.parse(sessionStorage.getItem('bf_force') || 'null'); if (f) { if (MAPS[f.map]) w.map = f.map; if (MODES[f.mode]) w.mode = f.mode; w.force = f; } } catch (e) { }
  if ((w.map === 'wake' || w.map === 'normandy') && w.mode === 'four') w.mode = 'conquest';   // only room for two sides
  if (w.map === 'zd30') w.mode = 'coop';   // the raid is always a co-op mission
  else if (w.map === 'europe' && !w.force) {   // Berlin starts out as co-op the first time it is played (an old saved mode is moved over once)
    try { const b = JSON.parse(localStorage.getItem('bf_battle') || '{}'); if (!b.coopV) { w.mode = 'coop'; b.coopV = 1; b.mode = 'coop'; localStorage.setItem('bf_battle', JSON.stringify(b)); } } catch (e) { }
  }
  if (w.mode === 'coop' && w.map !== 'europe' && w.map !== 'zd30') w.mode = 'conquest';   // co-op is only for the maps with a target to hunt
  if (w.map === 'dogfight' || w.map === 'jetfight' || w.map === 'wwifight') w.mode = 'tdm';   // dogfights are scored on planes shot down   // the island only has room for two sides
  return w;
})();
const AFGHAN = WORLD.map === 'afghan';   // Desert Combat: the Gulf War, Iraq 1991 (flat desert, a river with palm groves, a town, oil fields)
const RIVER_Z = x => Math.sin(x * 0.006 + 1) * 80 + 60;   // the Desert Combat map's river line
const SNOW = WORLD.map === 'snow', DESERT = WORLD.map === 'desert' || AFGHAN, HOUSTON = WORLD.map === 'houston', WAKE = WORLD.map === 'wake';
const NORMANDY = WORLD.map === 'normandy', GERMANY = WORLD.map === 'europe', DAM = WORLD.map === 'dam';
const DOGFIGHT = WORLD.map === 'dogfight' || WORLD.map === 'jetfight' || WORLD.map === 'wwifight', JETFIGHT = WORLD.map === 'jetfight', WWIFIGHT = WORLD.map === 'wwifight';
const ZD30 = WORLD.map === 'zd30';   // Zero Dark 30: the night raid on the Abbottabad compound, 2 May 2011
const COOP = WORLD.mode === 'coop';   // co-op: every player on blue, against waves of computer enemies, to take down the target
const NO_TUNNELS = WAKE || DAM || ZD30;   // tunnels sit at a fixed depth: they would break into the dam's gorge
// ===================== core.js : setup, sky, sound, terrain math =====================
const HALF = DOGFIGHT ? 1800 : 560, GRID = DOGFIGHT ? 400 : 336,   // dogfights get a huge map (3.6 km across) for long canyon runs
  CELL = (HALF * 2) / GRID, W1 = GRID + 1;
const MTN = HALF - 50, EDGE = HALF - 24;   // mountains start, players stay inside
const BLUE = 'blue', RED = 'red';
const TEAM_COLOR = { blue: 0x2f6fe0, red: 0xd93a3a, green: 0x2fa84f, yellow: 0xe0b020 };
const TEAM_CSS = { blue: '#4f8ff7', red: '#f05252', green: '#3ecf6a', yellow: '#f5c542' };
// 4 teams mode adds a green and a yellow army in the two empty corners of the map
const FOUR = WORLD.mode === 'four';
const TEAMS = FOUR ? ['blue', 'red', 'green', 'yellow'] : ['blue', 'red'];
const teamName = t => t ? t[0].toUpperCase() + t.slice(1) : '';
const teamIdx = t => Math.max(0, TEAMS.indexOf(t));
const teamOf = i => TEAMS[i] || null;
// how many soldiers from teams other than `team` stand on point p
function foesIn(p, team) { let n = 0; if (p.cnt) for (const t of TEAMS) if (t !== team) n += p.cnt[t] || 0; return n; }
// which team the capture bar of point p belongs to, and how full it is (0 to 1)
const progTeam = p => FOUR ? p.capTeam : (p.progress > 0 ? 'blue' : p.progress < 0 ? 'red' : null);
const ENEMY = { blue: 'red', red: 'blue' };
const WATER_Y = -0.6;

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// run a function with a fixed random seed so every player builds the same world
function seeded(seed, fn) { const mr = Math.random; Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = mr; } }
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const wrapAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

// ---------- device ----------
const IS_TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
const LITE = IS_TOUCH && Math.min(screen.width, screen.height) < 900;   // phones get lighter graphics
// ---------- renderer / scene / camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(LITE ? 1 : Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = !LITE;
renderer.shadowMap.type = THREE.PCFShadowMap;   // the standard filter: the soft one sampled many more times for every lit pixel
renderer.autoClear = false;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const FOG_COLOR = new THREE.Color(ZD30 ? 0x0a0f18 : SNOW ? 0xdde4ec : DESERT ? 0xe8d6b0 : HOUSTON ? 0xd7e0e4 : WAKE ? 0xcfe6f0 : GERMANY ? 0x9e9a92 : NORMANDY ? 0xc5d2dc : DAM ? 0xc6d3dc : 0xcfe3f2);
// the snow map is thick with falling snow, so the distance blurs out much sooner
if (SNOW) {
  // snowstorm haze: thickens quickly with distance (near and far are kept for the few custom shaders)
  scene.fog = new THREE.FogExp2(FOG_COLOR, LITE ? 0.013 : 0.0112); scene.fog.near = 8; scene.fog.far = 230;
} else if (ZD30) scene.fog = new THREE.Fog(FOG_COLOR, 20, LITE ? 220 : 300);   // a moonless night
else if (AFGHAN) scene.fog = new THREE.Fog(FOG_COLOR, LITE ? 100 : 150, LITE ? 500 : 720);   // hot hazy desert air
else if (DESERT) scene.fog = new THREE.Fog(FOG_COLOR, LITE ? 60 : 90, LITE ? 340 : 470);   // a light dusty haze
else if (WAKE) scene.fog = new THREE.Fog(FOG_COLOR, LITE ? 90 : 140, LITE ? 480 : 720);   // clear tropical air over the ocean
else if (HOUSTON) scene.fog = new THREE.Fog(FOG_COLOR, LITE ? 80 : 130, LITE ? 420 : 640);   // warm, humid city haze
else if (GERMANY) scene.fog = new THREE.Fog(FOG_COLOR, LITE ? 50 : 75, LITE ? 320 : 450);   // smoke and ash over the burning city
else if (NORMANDY) scene.fog = new THREE.Fog(FOG_COLOR, LITE ? 80 : 120, LITE ? 420 : 620);   // sea mist over the beach
else if (DAM) scene.fog = new THREE.Fog(FOG_COLOR, LITE ? 90 : 140, LITE ? 460 : 700);   // cool mountain air
else if (DOGFIGHT) scene.fog = new THREE.Fog(FOG_COLOR, LITE ? 160 : 260, LITE ? 650 : 950);   // clear air: you can see far down the canyons
else scene.fog = new THREE.Fog(FOG_COLOR, LITE ? 70 : 110, LITE ? 360 : 520);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, DOGFIGHT ? 3200 : 2000);
camera.rotation.order = 'YXZ';

// ---------- sky dome with sun ----------
const SUN_DIR = new THREE.Vector3(0.5, 0.62, 0.35).normalize();
const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 20), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    top: { value: new THREE.Color(SNOW ? 0x8e9cae : DESERT ? 0x3a7cc8 : 0x1f5fc4) }, mid: { value: new THREE.Color(SNOW ? 0xc0cad5 : DESERT ? 0x9cc6e6 : 0x6eaee8) },
    hor: { value: FOG_COLOR }, low: { value: new THREE.Color(SNOW ? 0xd8dfe6 : DESERT ? 0xd8c094 : 0x9fb9cc) }, sun: { value: SUN_DIR }, glow: { value: SNOW ? 0.18 : DESERT ? 1.4 : 1 },
  },
  vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform vec3 top, mid, hor, low, sun; uniform float glow; varying vec3 vDir;
    void main(){
      vec3 d = normalize(vDir); float h = d.y;
      vec3 c = mix(hor, mid, smoothstep(0.0, 0.22, h));
      c = mix(c, top, smoothstep(0.22, 0.95, h));
      c = mix(c, low, smoothstep(0.0, -0.25, h));
      float s = max(dot(d, sun), 0.0);
      c += vec3(1.0, 0.92, 0.75) * (pow(s, 1200.0) * 3.0 + pow(s, 60.0) * 0.35 + pow(s, 6.0) * 0.12) * glow;
      gl_FragColor = vec4(c, 1.0);
    }`,
}));
sky.renderOrder = -10;
scene.add(sky);

// ---------- lights ----------
const hemiLight = SNOW ? new THREE.HemisphereLight(0xeef3fa, 0x9aa3ae, 0.8) : DESERT ? new THREE.HemisphereLight(0xfff4e0, 0xb48a52, 0.62) : new THREE.HemisphereLight(0xe2efff, 0x5a6a3a, 0.62); scene.add(hemiLight);
const sunLight = new THREE.DirectionalLight(SNOW ? 0xe6edff : DESERT ? 0xfff0cc : 0xfff0d8, SNOW ? 0.62 : DESERT ? 0.98 : 0.95);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(LITE ? 1024 : 3072, LITE ? 1024 : 3072); sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.04;
Object.assign(sunLight.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 450 });
sunLight.shadow.bias = -0.0006;
scene.add(sunLight, sunLight.target);
const flashLight = new THREE.PointLight(0xffc070, 0, 14);
scene.add(flashLight);

// ---------- physics ----------
const world = new CANNON.World();
world.gravity.set(0, -20, 0);
// Only moving things need collision checks, so look up the fixed pieces of the world near each moving body
// in a grid (the stock checker compared everything with everything, which got slow with long tunnel walls).
function NearBroadphase() { CANNON.Broadphase.call(this); this.useBoundingBoxes = true; this.cell = 16; this.statics = new Map(); this.globals = []; this.count = -1; this.age = 0; this.stamp = 0; }
NearBroadphase.prototype = Object.create(CANNON.Broadphase.prototype);
NearBroadphase.prototype.constructor = NearBroadphase;
NearBroadphase.prototype.rebuild = function (world) {
  this.statics.clear(); this.globals.length = 0; const C = this.cell;
  for (const b of world.bodies) {
    if (b.type !== CANNON.Body.STATIC) continue;
    b.computeAABB();   // fixed bodies are moved into place after they are made, so their bounds must be worked out again
    const x0 = Math.floor(b.aabb.lowerBound.x / C), x1 = Math.floor(b.aabb.upperBound.x / C), z0 = Math.floor(b.aabb.lowerBound.z / C), z1 = Math.floor(b.aabb.upperBound.z / C);
    if ((x1 - x0 + 1) * (z1 - z0 + 1) > 64) { this.globals.push(b); continue; }
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const k = x * 100003 + z; let l = this.statics.get(k); if (!l) this.statics.set(k, l = []); l.push(b); }
  }
  this.staticDirty = false; this.age = 0;
};
NearBroadphase.prototype.collisionPairs = function (world, p1, p2) {
  if (this.staticDirty || this.count < 0 || ++this.age > 900) { this.count = 0; this.rebuild(world); }   // only when fixed pieces come or go (a shell or a ragdoll does not need it)
  const C = this.cell, dyn = [], dgrid = new Map();
  for (const b of world.bodies) if (b.type !== CANNON.Body.STATIC) {
    if (b.aabbNeedsUpdate) b.computeAABB();
    dyn.push(b);
    const x0 = Math.floor(b.aabb.lowerBound.x / C), x1 = Math.floor(b.aabb.upperBound.x / C), z0 = Math.floor(b.aabb.lowerBound.z / C), z1 = Math.floor(b.aabb.upperBound.z / C);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const k = x * 100003 + z; let l = dgrid.get(k); if (!l) dgrid.set(k, l = []); l.push(b); }
  }
  for (const a of dyn) {
    if (a.sleepState === CANNON.Body.SLEEPING) continue;
    const st = ++this.stamp; a._bp = st;
    const test = b => {
      if (b._bp === st) return; b._bp = st;
      if (b.type !== CANNON.Body.STATIC && b.sleepState !== CANNON.Body.SLEEPING && b.id < a.id) return;   // the other awake body handles this pair
      if (this.needBroadphaseCollision(a, b)) this.intersectionTest(a, b, p1, p2);
    };
    for (const b of this.globals) test(b);
    const x0 = Math.floor(a.aabb.lowerBound.x / C), x1 = Math.floor(a.aabb.upperBound.x / C), z0 = Math.floor(a.aabb.lowerBound.z / C), z1 = Math.floor(a.aabb.upperBound.z / C);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const k = x * 100003 + z, ls = this.statics.get(k), ld = dgrid.get(k);
      if (ls) for (const b of ls) test(b);
      if (ld) for (const b of ld) test(b);
    }
  }
};
world.broadphase = new NearBroadphase(); world.broadphase.setWorld(world);
// the terrain is in group 2; moving things hit it unless they started underground (those only hit group 1: floors and walls)
const _addBody = world.addBody.bind(world);
world.addBody = function (b) { if (b.type !== CANNON.Body.STATIC && !b.underground && b.collisionFilterMask === 1) b.collisionFilterMask = -1; if (b.type === CANNON.Body.STATIC) world.broadphase.staticDirty = true; return _addBody(b); };
const _removeBody = world.removeBody.bind(world);
world.removeBody = function (b) { if (b.type === CANNON.Body.STATIC) world.broadphase.staticDirty = true; return _removeBody(b); };
// remember only the pairs that touch (the default table has a slot for every pair of objects and is cleared every update)
world.collisionMatrix = new CANNON.ObjectCollisionMatrix(); world.collisionMatrixPrevious = new CANNON.ObjectCollisionMatrix();
world.solver.iterations = 8;
world.allowSleep = true;
world.defaultContactMaterial.friction = 0.45;
world.defaultContactMaterial.restitution = 0.15;

// ---------- sound (synthesized) ----------
let actx = null, master = null, noiseBuf = null, soundBudget = 8, sfxOut = null, revSend = null, sndDist = 0;
function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = actx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(actx.destination);
    master = actx.createGain(); master.gain.value = 0.5; master.connect(comp);
    noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // effects go through sfxOut, which also feeds a reverb (stronger underground)
    sfxOut = actx.createGain(); sfxOut.connect(master);
    const ir = actx.createBuffer(2, actx.sampleRate * 2, actx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const a = ir.getChannelData(ch); for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / a.length, 3); }
    const conv = actx.createConvolver(); conv.buffer = ir; conv.connect(master);
    revSend = actx.createGain(); revSend.gain.value = 0.12; sfxOut.connect(revSend); revSend.connect(conv);
    if (typeof soundSetup === 'function') soundSetup();
  } catch (e) { actx = null; }
}
function noiseHit(freq, dur, vol) {
  if (!actx || vol < 0.01) return;
  const t = actx.currentTime;
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq * clamp(1 - sndDist / 200, 0.18, 1);
  const g = actx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxOut || master); s.start(t, Math.random() * 0.5); s.stop(t + dur);
}
function tone(type, f0, f1, dur, vol) {
  if (!actx || vol < 0.01) return;
  const t = actx.currentTime;
  const o = actx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = actx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(sfxOut || master); o.start(t); o.stop(t + dur);
}
const SFX = {
  pistol: (v = 1) => noiseHit(2500, 0.18, 0.7 * v),
  rifle: (v = 1) => noiseHit(3000, 0.13, 0.55 * v),
  smg: (v = 1) => noiseHit(3600, 0.09, 0.45 * v),
  shotgun: (v = 1) => { noiseHit(1400, 0.35, 1.0 * v); tone('sine', 120, 40, 0.2, 0.4 * v); },
  sniper: (v = 1) => { noiseHit(4000, 0.45, 1.0 * v); tone('sine', 160, 40, 0.3, 0.4 * v); },
  minigun: (v = 1) => noiseHit(3500, 0.07, 0.35 * v),
  mg: (v = 1) => noiseHit(2200, 0.12, 0.6 * v),
  rocket: (v = 1) => { noiseHit(800, 0.6, 0.8 * v); tone('sawtooth', 300, 80, 0.4, 0.12 * v); },
  thump: (v = 1) => { tone('sine', 220, 60, 0.15, 0.6 * v); noiseHit(600, 0.1, 0.3 * v); },
  laser: (v = 1) => tone('sawtooth', 1600, 300, 0.09, 0.08 * v),
  boom: (v = 1) => { noiseHit(500, 1.4, 1.2 * v); tone('sine', 90, 25, 0.8, 0.9 * v); },
  click: (v = 1) => tone('square', 900, 600, 0.04, 0.08 * v),
  hit: (v = 1) => tone('square', 1800, 1500, 0.05, 0.12 * v),
  kill: (v = 1) => { tone('square', 1200, 1200, 0.06, 0.12 * v); setTimeout(() => tone('square', 1800, 1800, 0.08, 0.12 * v), 70); },
  cash: (v = 1) => { tone('triangle', 1300, 1300, 0.07, 0.15 * v); setTimeout(() => tone('triangle', 1900, 1900, 0.12, 0.15 * v), 80); },
  reload: (v = 1) => { tone('square', 400, 300, 0.05, 0.08 * v); setTimeout(() => tone('square', 600, 500, 0.05, 0.08 * v), 250); },
  capture: (v = 1) => { tone('triangle', 660, 660, 0.15, 0.2 * v); setTimeout(() => tone('triangle', 880, 880, 0.15, 0.2 * v), 150); setTimeout(() => tone('triangle', 1100, 1100, 0.3, 0.2 * v), 300); },
  beep: (v = 1) => tone('square', 1400, 1400, 0.08, 0.15 * v),
  build: (v = 1) => { tone('square', 300, 200, 0.06, 0.15 * v); noiseHit(900, 0.12, 0.3 * v); },
  whiz: (v = 1) => tone('sine', 2400, 900, 0.12, 0.05 * v),
  lose: (v = 1) => { tone('triangle', 600, 600, 0.2, 0.2 * v); setTimeout(() => tone('triangle', 400, 400, 0.35, 0.2 * v), 200); },
};
function playAt(name, pos, vol = 1) {
  if (soundBudget <= 0) return;
  const d = camera.position.distanceTo(pos);
  const v = Math.pow(clamp(1 - d / 160, 0, 1), 1.6) * vol;
  if (!(v >= 0.03)) return;   // also skips a sound from a bad (not-a-number) position
  soundBudget--;
  if (d < 70 && vol >= 0.5 && typeof noteCombat === 'function') noteCombat(d);
  sndDist = d; SFX[name](v); sndDist = 0;
}

// ---------- noise + terrain height ----------
function hash2(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hash2(xi, zi), hash2(xi + 1, zi), u), lerp(hash2(xi, zi + 1), hash2(xi + 1, zi + 1), u), v);
}
function fbm(x, z) {
  return vnoise(x * 0.008, z * 0.008) * 0.6 + vnoise(x * 0.025 + 7, z * 0.025 + 3) * 0.3 + vnoise(x * 0.07 + 11, z * 0.07 + 5) * 0.1;
}

// ---------- map layout ----------
// the snow map has its own layout: A and E are rail yards, B and D Soviet housing blocks, C the Kremlin,
// F a monastery high in the mountains and G a factory
// Wake Island: a U-shaped atoll. Red holds the island, blue comes in from an aircraft carrier to the south
// a curving horseshoe whose arms bow out and curl in at the tips (like the real atoll), not a squared-off U
const WAKE_U = [[-298, -282], [-336, -200], [-322, -110], [-314, 0], [-302, 95], [-272, 190], [-222, 243], [-150, 258], [-50, 264], [50, 264], [150, 258], [226, 240], [282, 196], [306, 105], [320, 0], [324, -120], [306, -210], [266, -268]].map(([x, z]) => ({ x, z }));
const WAKE_SPINE = (() => {   // a smooth curve through those points
  const P = WAKE_U, out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < 8; k++) { const t = k / 8, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); out.push({ x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) }); }
  }
  out.push(P[P.length - 1]); return out;
})();
function wakeDist(x, z) {
  let m = Infinity; const S = WAKE_SPINE;
  for (let i = 0; i < S.length - 1; i++) m = Math.min(m, distToSeg(x, z, S[i].x, S[i].z, S[i + 1].x, S[i + 1].z));
  const a = S[0], b = S[S.length - 1], tip = Math.min(Math.hypot(x - a.x, z - a.z), Math.hypot(x - b.x, z - b.z));
  if (tip < 90) m += (1 - tip / 90) * 22;   // the arms thin out towards their tips
  return Math.min(m, Math.hypot(x, z + 20) + 2);
}
const CARRIER = { x: 0, z: 470, hl: 105, hw: 17, deck: 13 };
// the smaller islands round Wake, each one different
const WAKE_ISLES = [
  { kind: 'volcano', x: 400, z: -400, r: 95 },     // a smoking volcano with a crater
  { kind: 'rocks', x: 462, z: -70, r: 42 },        // a rocky outcrop with a lighthouse
  { kind: 'sandbar', x: -470, z: 80, r: 85 },      // a long low sandbar with palms and a wreck
  { kind: 'jungle', x: -330, z: 360, r: 52 },      // a hilly jungle island with a hidden bunker
  { kind: 'jungle', x: -440, z: -330, r: 52 },     // a Wilkes-like islet off the tip of the west arm
  { kind: 'sandbar', x: 170, z: -380, r: 62 },     // a Peale-like low island off the mouth of the lagoon
  { kind: 'rocks', x: -150, z: -400, r: 30 },      // rocks with a light, between them
];
function wakeIsles(x, z) {
  let h = -99;
  for (const I of WAKE_ISLES) {
    const dx = x - I.x, dz = z - I.z, d = Math.hypot(dx, dz); if (d > I.r + 40) continue;
    const n = vnoise(x * 0.05 + I.x, z * 0.05 + I.z), shore = lerp(-14, 0.4, smooth(I.r + 35, I.r, d));
    let g = shore;
    if (I.kind === 'volcano') { const t = clamp(1 - d / I.r, 0, 1); g = Math.max(shore, 0.4 + Math.pow(t, 1.35) * 78 + n * 4); if (d < 18) g -= (18 - d) * 2.4; }
    else if (I.kind === 'rocks') { g = Math.max(shore, smooth(I.r, I.r * 0.45, d) * (16 + n * 10) + Math.pow(vnoise(x * 0.12, z * 0.12), 2) * 8 * smooth(I.r, 10, d)); }
    else if (I.kind === 'sandbar') { const e = Math.hypot(dx / 1.0, dz / 0.3); g = lerp(-14, 1.6 + n * 0.8, smooth(I.r + 30, I.r * 0.75, e)); }
    else { const t = smooth(I.r, I.r * 0.2, d); g = Math.max(shore, 2 + t * (14 + n * 9)); }
    h = Math.max(h, g);
  }
  return h;
}
// Normandy: two zig-zag trench lines dug across the beach, with gaps to run through. They are part of the ground itself
const N_TRENCH = [{ z: 286, amp: 5, per: 34, phase: 0 }, { z: 257, amp: 4, per: 28, phase: 11 }];
function normTrenchLine(x, T) { const t = ((x + 900 + T.phase) / T.per) % 1; return T.z + T.amp * (Math.abs(t * 4 - 2) - 1); }
function normTrench(x, z) {
  if (typeof NORMANDY === 'undefined' || !NORMANDY || z < 246 || z > 296 || Math.abs(x) > HALF - 60) return 0;
  let dep = 0;
  for (const T of N_TRENCH) {
    if (Math.abs(z - T.z) > T.amp + 4) continue;
    if (((x + 900 + T.phase * 3) % 70) < 9) continue;                      // a gap every 70 m
    const d = Math.abs(z - normTrenchLine(x, T)); dep = Math.max(dep, 1.6 * smooth(2.8, 1.1, d));
  }
  return dep;
}
const POINTS_DEF = ZD30 ? [   // Zero Dark 30: hidden points that only guide the soldiers round the compound and the streets
  { n: 'A', x: 0, z: -78 }, { n: 'B', x: -25, z: -14 }, { n: 'C', x: 12, z: 0 },
  { n: 'D', x: -26, z: 16 }, { n: 'E', x: 70, z: 10 }, { n: 'F', x: -75, z: -45 }, { n: 'G', x: 10, z: 70 },
] : NORMANDY ? [
  { n: 'A', x: -300, z: 285 }, { n: 'B', x: 300, z: 285 }, { n: 'C', x: 0, z: 160 },
  { n: 'D', x: -260, z: 145 }, { n: 'E', x: 260, z: 145 }, { n: 'F', x: -250, z: -220 }, { n: 'G', x: 250, z: -220 },
] : DAM ? [
  { n: 'A', x: -205, z: -60 }, { n: 'B', x: 205, z: -60 }, { n: 'C', x: 0, z: -60 },
  { n: 'D', x: 0, z: 70 }, { n: 'E', x: -215, z: -250 }, { n: 'F', x: 215, z: -250 }, { n: 'G', x: 0, z: 270 },
] : WAKE ? [
  { n: 'A', x: -318, z: -120 }, { n: 'B', x: -308, z: 90 }, { n: 'C', x: -170, z: 252 },
  { n: 'D', x: 170, z: 252 }, { n: 'E', x: 308, z: 90 }, { n: 'F', x: 318, z: -150 }, { n: 'G', x: 0, z: -20 },
] : GERMANY ? [   // Berlin: the control points sit at the landmarks
  { n: 'A', x: -245, z: 30 }, { n: 'B', x: 250, z: -30 }, { n: 'C', x: 0, z: -30 },
  { n: 'D', x: -125, z: -75 }, { n: 'E', x: 95, z: 95 }, { n: 'F', x: -95, z: 95 }, { n: 'G', x: 150, z: -150 },
] : AFGHAN ? [   // Desert Combat: strung out along the valley and the riverbed
  { n: 'A', x: -300, z: 280 }, { n: 'B', x: 260, z: 320 }, { n: 'C', x: 40, z: 70 },
  { n: 'D', x: -260, z: -300 }, { n: 'E', x: 300, z: -260 }, { n: 'F', x: -430, z: 60 }, { n: 'G', x: 430, z: -60 },
] : DESERT ? [   // Desert: a diamond across the dunes, a fort on the middle mesa, and the oasis town round point G
  { n: 'A', x: -150, z: 300 }, { n: 'B', x: 370, z: 210 }, { n: 'C', x: 0, z: 10 },
  { n: 'D', x: 150, z: -300 }, { n: 'E', x: -370, z: -210 }, { n: 'F', x: -330, z: -20 }, { n: 'G', x: 330, z: 20 },
] : SNOW ? [
  { n: 'A', x: -400, z: 270 }, { n: 'B', x: 70, z: 300 }, { n: 'C', x: 0, z: 0 },
  { n: 'D', x: -70, z: -300 }, { n: 'E', x: 400, z: -270 }, { n: 'F', x: -320, z: -140 }, { n: 'G', x: 320, z: 140 },
] : [
  { n: 'A', x: -300, z: 250 }, { n: 'B', x: 300, z: 240 }, { n: 'C', x: 0, z: 0 },
  { n: 'D', x: -300, z: -250 }, { n: 'E', x: 300, z: -250 }, { n: 'F', x: -430, z: 0 }, { n: 'G', x: 430, z: 0 },
];
const PD = Object.fromEntries(POINTS_DEF.map(p => [p.n, p]));
// where each map's town stands (null: no town)
const TOWN_AT = ZD30 || DOGFIGHT || GERMANY || SNOW || HOUSTON || WAKE || DAM || NORMANDY ? null : AFGHAN ? { x: -170, z: 175 } : DESERT ? { x: PD.G.x, z: PD.G.z } : { x: 0, z: 0 };
const BASES = ZD30 ? { blue: { x: 0, z: -80 }, red: { x: 0, z: 300 } } : NORMANDY ? { blue: { x: 0, z: 318 }, red: { x: 0, z: -450 } } : DAM ? { blue: { x: 0, z: 455 }, red: { x: 0, z: -455 } } : WAKE ? { blue: { x: 50, z: 470 }, red: { x: -322, z: -262 } } : SNOW ? { blue: { x: -250, z: 460 }, red: { x: 250, z: -460 } } : { blue: { x: 0, z: 450 }, red: { x: 0, z: -450 } };
if (FOUR) { BASES.green = { x: -440, z: -420 }; BASES.yellow = { x: 440, z: 420 }; }
// which way a team's base faces: +1 looks north (towards -z), -1 looks south
const teamSide = t => Math.sign(BASES[t].z) || 1;
const RUNWAYS = NORMANDY ? { blue: { x: 410, z: 475, len: 160, wid: 18, dir: -1, carrier: true },   // Normandy: blue has no strip on the beach, its planes fly from the carrier
  red: { x: -170, z: -470, len: 160, wid: 18, dir: 1 } } : DAM ? { blue: { x: 175, z: 470, len: 160, wid: 18, dir: -1 }, red: { x: -175, z: -470, len: 160, wid: 18, dir: 1 } } : WAKE ? { blue: { x: -15, z: 470, len: 170, wid: 16, dir: -1 }, red: { x: 0, z: 262, len: 170, wid: 18, dir: 1 } } : SNOW ? { blue: { x: -20, z: 468, len: 160, wid: 18, dir: -1 }, red: { x: 20, z: -468, len: 160, wid: 18, dir: 1 } }
  : { blue: { x: 170, z: 470, len: 160, wid: 18, dir: -1 }, red: { x: -170, z: -470, len: 160, wid: 18, dir: 1 } };
const LAKES = ZD30 || WAKE || NORMANDY || DAM || AFGHAN || DOGFIGHT ? [] : GERMANY ? [{ x: -250, z: -60, r: 38 }, { x: 260, z: 40, r: 30 }] : SNOW ? [{ x: -190, z: 130, r: 34 }, { x: 190, z: -130, r: 34 }] : HOUSTON ? [{ x: -205, z: 345, r: 28 }, { x: 225, z: 355, r: 24 }] : [{ x: -225, z: 20, r: 48 }, { x: 215, z: -30, r: 40 }, { x: -170, z: 440, r: 24 }];
const LAKE = LAKES[0];
// Houston: downtown in the middle, the 610 Loop around it, I-45 and I-10 crossing, and Buffalo Bayou winding past the north side
const BAYOU = [[-575, -120], [-470, -150], [-360, -130], [-260, -175], [-150, -200], [-50, -190], [50, -210], [160, -185], [260, -205], [360, -170], [470, -195], [575, -170]].map(([x, z]) => ({ x, z }));
function bayouDist(x, z) { let m = Infinity; for (let i = 0; i < BAYOU.length - 1; i++) m = Math.min(m, distToSeg(x, z, BAYOU[i].x, BAYOU[i].z, BAYOU[i + 1].x, BAYOU[i + 1].z)); return m; }
const H_LOOP = [[-180, -235], [180, -235], [250, -165], [250, 165], [180, 235], [-180, 235], [-250, 165], [-250, -165]].map(([x, z]) => ({ x, z }));
const H_FREEWAYS = HOUSTON ? [
  ...H_LOOP.map((p, i) => [p, H_LOOP[(i + 1) % H_LOOP.length], '610']),
  [{ x: 110, z: -430 }, { x: 110, z: 425 }, 'I-45'], [{ x: -560, z: 190 }, { x: 560, z: 190 }, 'I-10'],
] : [];
const H_GRID = [-150, -90, -30, 30, 90, 150];
const PATHS = ZD30 ? [   // Bilal Town: the lane past the compound's north side, the roads round it, and the streets of the neighbourhood
  [{ x: -300, z: -45 }, { x: 300, z: -45 }], [{ x: -52, z: -300 }, { x: -52, z: 300 }], [{ x: 55, z: -45 }, { x: 55, z: 300 }],
  [{ x: -300, z: 50 }, { x: 300, z: 50 }], [{ x: -300, z: 140 }, { x: 300, z: 140 }], [{ x: -300, z: 230 }, { x: 300, z: 230 }],
  [{ x: 150, z: -300 }, { x: 150, z: 300 }], [{ x: -150, z: -300 }, { x: -150, z: 300 }], [{ x: 0, z: 50 }, BASES.red],
] : NORMANDY ? [
  [BASES.blue, PD.A], [BASES.blue, PD.B], [PD.A, PD.D], [PD.B, PD.E], [BASES.blue, PD.C], [PD.D, PD.C], [PD.C, PD.E],
  [PD.C, { x: 0, z: 0 }], [PD.D, PD.F], [PD.E, PD.G], [{ x: 0, z: 0 }, PD.F], [{ x: 0, z: 0 }, PD.G], [PD.F, BASES.red], [PD.G, BASES.red], [{ x: 0, z: 0 }, BASES.red],
] : DAM ? [
  [BASES.blue, PD.G], [PD.G, PD.D], [PD.G, { x: 205, z: 120 }], [{ x: 205, z: 120 }, PD.B], [PD.G, { x: -205, z: 120 }], [{ x: -205, z: 120 }, PD.A],
  [PD.A, PD.C], [PD.C, PD.B], [PD.A, PD.E], [PD.B, PD.F], [PD.E, BASES.red], [PD.F, BASES.red], [PD.D, { x: 0, z: -40 }],
] : WAKE ? [
  [BASES.red, PD.A], [PD.A, PD.B], [PD.B, { x: -280, z: 240 }], [{ x: -280, z: 240 }, PD.C], [PD.C, PD.D], [PD.D, { x: 280, z: 240 }], [{ x: 280, z: 240 }, PD.E], [PD.E, PD.F],
] : HOUSTON ? [
  ...H_FREEWAYS.map(f => [f[0], f[1]]),
  ...H_GRID.map(x => [{ x, z: -150 }, { x, z: 150 }]), ...H_GRID.map(z => [{ x: -150, z }, { x: 150, z }]),
  [BASES.blue, PD.A], [BASES.blue, PD.B], [BASES.blue, PD.C], [PD.A, PD.C], [PD.B, PD.C],
  [PD.C, PD.D], [PD.C, PD.E], [PD.D, BASES.red], [PD.E, BASES.red], [PD.C, BASES.red],
  [PD.A, PD.F], [PD.F, PD.D], [PD.B, PD.G], [PD.G, PD.E], [PD.C, PD.F], [PD.C, PD.G],
] : GERMANY ? [
  [BASES.blue, PD.F], [BASES.blue, PD.E], [PD.F, PD.A], [PD.F, PD.C], [PD.E, PD.C], [PD.E, PD.B], [PD.A, PD.D], [PD.C, PD.D],
  [PD.C, PD.G], [PD.B, PD.G], [PD.D, BASES.red], [PD.G, BASES.red], [PD.A, { x: -330, z: 0 }],
] : AFGHAN ? [
  [BASES.blue, PD.A], [BASES.blue, PD.B], [PD.A, PD.F], [PD.A, { x: -170, z: 160 }], [{ x: -170, z: 160 }, PD.C], [PD.B, PD.C], [PD.B, PD.G],
  [PD.C, { x: 60, z: -120 }], [{ x: 60, z: -120 }, PD.D], [{ x: 60, z: -120 }, PD.E], [PD.F, PD.D], [PD.G, PD.E], [PD.D, BASES.red], [PD.E, BASES.red],
] : DESERT ? [
  [BASES.blue, PD.A], [BASES.blue, PD.B], [PD.A, PD.F], [PD.B, PD.G], [PD.A, { x: -60, z: 140 }], [{ x: -60, z: 140 }, PD.C], [PD.B, PD.C],
  [PD.C, PD.D], [PD.C, { x: 60, z: -140 }], [{ x: 60, z: -140 }, PD.E], [PD.F, PD.E], [PD.G, PD.D], [PD.D, BASES.red], [PD.E, BASES.red],
] : SNOW ? [
  [BASES.blue, PD.A], [BASES.blue, PD.B], [PD.A, PD.F], [PD.B, PD.C], [PD.B, PD.G], [PD.F, PD.C], [PD.G, PD.C],
  [PD.C, PD.D], [PD.F, PD.D], [PD.G, PD.E], [PD.D, BASES.red], [PD.E, BASES.red], [PD.A, PD.B], [PD.D, PD.E],
] : [
  [BASES.blue, PD.A], [BASES.blue, PD.B], [BASES.blue, PD.C], [PD.A, PD.C], [PD.B, PD.C],
  [PD.C, PD.D], [PD.C, PD.E], [PD.D, BASES.red], [PD.E, BASES.red], [PD.C, BASES.red],
  [PD.A, PD.F], [PD.F, PD.D], [PD.B, PD.G], [PD.G, PD.E],
];
// the strip past each runway end that planes climb through: kept flat and clear on the mountain map
const RUNWAY_PAD = SNOW ? { x: 150, z: 30 } : { x: 14, z: 14 };
function inRunwayZone(x, z, pad = 0) { for (const t of ['blue', 'red']) { const r = RUNWAYS[t]; if (Math.abs(x - r.x) < r.len / 2 + RUNWAY_PAD.x + pad && Math.abs(z - r.z) < r.wid / 2 + RUNWAY_PAD.z + pad) return true; } return false; }
function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
function pathDist(x, z) { let m = Infinity; for (const [a, b] of PATHS) m = Math.min(m, distToSeg(x, z, a.x, a.z, b.x, b.z)); return m; }

function rawHeight(x, z) {
  let h = (fbm(x, z) - 0.5) * 30;
  h += Math.pow(vnoise(x * 0.013 + 50, z * 0.013 + 20), 2) * 16 - 4;
  h += (vnoise(x * 0.045 + 9, z * 0.045 + 31) - 0.5) * 3;
  const d = Math.max(Math.abs(x), Math.abs(z));
  if (WAKE) {
    // the carrier: a flat steel deck standing out of the sea, a ramp down its stern to a floating dock
    const C = CARRIER;
    if (Math.abs(x - C.x) < C.hl && Math.abs(z - C.z) < C.hw) return C.deck;
    if (x >= C.x + C.hl && x < C.x + C.hl + 46 && Math.abs(z - (C.z + 9)) < 4.5) return lerp(C.deck, 0.5, (x - C.x - C.hl) / 46);
    if (x >= C.x + C.hl + 46 && x < C.x + C.hl + 70 && Math.abs(z - (C.z + 8)) < 13) return 0.45;
    // the atoll: jungle in the middle, sandy beaches, shallow water, then the deep ocean
    const d = (wakeDist(x, z) + (vnoise(x * 0.035 + 7, z * 0.035 - 3) - 0.5) * 16 + (vnoise(x * 0.012 - 5, z * 0.012 + 9) - 0.5) * 26) * 0.62 * lerp(0.82, 1.22, vnoise(x * 0.0065 + 11, z * 0.0065 + 3)), bump = vnoise(x * 0.03 + 4, z * 0.03 - 7) * 3.2 + vnoise(x * 0.09, z * 0.09) * 0.8;   // a wide atoll: the land runs about 33 m either side of its spine
    const sea = -14 + vnoise(x * 0.01, z * 0.01) * 4;
    let g;
    if (d < 20) g = 3.2 + bump * smooth(14, 4, d) * smooth(6, 30, pathDist(x, z));
    else if (d < 34) g = lerp(3.2, 0.2, (d - 20) / 14);
    else if (d < 46) g = lerp(0.2, -2.6, (d - 34) / 12);
    else g = lerp(-2.6, sea, smooth(46, 80, d));
    return Math.max(g, wakeIsles(x, z));
  }
  if (DOGFIGHT) {
    // tall mountains cut by a network of long, deep, winding canyons that all join up, so a canyon run never ends
    // at the edge of the world: an outer ring canyon loops right round the map, a middle ring inside it, six
    // winding canyons run out from the open middle valley to the outer ring like spokes, and one long straight
    // "trench" crosses the whole map. Beyond the outer ring the mountains rise into a high wall.
    const ridge = (f, ox, oz) => 1 - Math.abs(vnoise(x * f + ox, z * f + oz) * 2 - 1);
    const r = Math.hypot(x, z), th = Math.atan2(z, x);
    const mtn = 60 + Math.pow(ridge(0.0032, 7, 3), 1.6) * 170 + vnoise(x * 0.02, z * 0.02) * 16 + smooth(1420, 1760, r) * 170;
    const Rout = 1270 + Math.sin(th * 3 + 1) * 110 + Math.sin(th * 7) * 45, Rmid = 790 + Math.sin(th * 4 + 2) * 80 + Math.sin(th * 9) * 30;
    let cd = Math.min(Math.abs(r - Rout) - 8 - vnoise(th * 9, 3) * 18, Math.abs(r - Rmid) - vnoise(th * 11, 7) * 14);
    if (r > 300 && r < Rout + 20) for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3 + 0.35 + Math.sin(r * 0.0055 + k * 1.7) * 0.22 + Math.sin(r * 0.017 + k) * 0.05;
      let da = th - a; da = Math.atan2(Math.sin(da), Math.cos(da));
      cd = Math.min(cd, Math.abs(da) * r - (k % 2 ? 4 : 10));
    }
    const tz = Math.sin(x * 0.0021 + 0.5) * 140 + Math.sin(x * 0.009) * 25;   // the trench, east to west, between the outer ring's walls
    if (Math.abs(x) < Rout) cd = Math.min(cd, Math.abs(z - tz) - 2);
    const valley = Math.hypot(x / 1.35, z / 1.15) - 380;                           // the open middle where both squadrons start
    const open = Math.min(cd - 24, valley);
    const floor = 4 + vnoise(x * 0.015, z * 0.015) * 8;
    return lerp(floor, mtn, Math.pow(smooth(0, 75, open), 1.35)) + h * 0.12;
  }
  if (NORMANDY) {
    // the beach: the sea to the south, wide sand, a low sea wall, steep bluffs cut by gullies (the roads), then
    // flat farmland with hedgerows inland
    const land = h * 0.32 + 9;
    const pd = pathDist(x, z), gully = smooth(26, 8, pd);
    let g;
    if (z < 150) g = land;
    else if (z < 236) { const t = smooth(150, 236, z); g = lerp(land, 2.4, Math.pow(t, 0.7)); g = lerp(g, lerp(land, 2.4, smooth(130, 250, z)), gully); }
    else if (z < 336) g = lerp(2.4, 0.15, (z - 236) / 100) + (vnoise(x * 0.05, z * 0.05) - 0.5) * 0.3 - normTrench(x, z);
    else g = lerp(0.15, -9 + vnoise(x * 0.01, z * 0.01) * 2, smooth(336, 400, z));
    if (d > MTN && z < 300) g += Math.pow((d - MTN) / 45, 2) * 40;
    return g;
  }
  if (DAM) {
    // a deep mountain valley running north to south. The dam crosses it at z = -60: the reservoir lies to the
    // north at the dam's top, a dry gorge drops far below it to the south. Banks beside the dam, cliffs beyond.
    const ax = Math.abs(x), pd = pathDist(x, z), ridge = (f, ox, oz) => 1 - Math.abs(vnoise(x * f + ox, z * f + oz) * 2 - 1);
    const mtn = 22 + Math.pow(ridge(0.008, 3, 9), 2.2) * 55 + vnoise(x * 0.05, z * 0.05) * 4;
    const bank = 6 + (vnoise(x * 0.02, z * 0.02) - 0.5) * 2;
    let g;
    if (z < -66 && z > -380) {   // the reservoir: steep shores, deep in the middle
      const w = 168 + vnoise(z * 0.01, 3) * 20;
      g = ax < w ? lerp(-9, bank, smooth(w - 26, w, ax)) : lerp(bank, mtn, smooth(w + 50, w + 120, ax) * smooth(18, 50, pd));
      if (z < -340) g = lerp(g, bank - 1, smooth(-340, -380, z));
    } else if (z > -54 && z < 140) {   // the gorge below the dam
      const floor = lerp(-28, 2, smooth(-54, 140, z)), w = lerp(150, 120, smooth(-54, 140, z));
      g = ax < w ? floor + Math.pow(smooth(w - 60, w, ax), 2.2) * (bank - floor) : lerp(bank, mtn, smooth(w + 70, w + 140, ax) * smooth(18, 50, pd));
    } else if (z >= -66 && z <= -54) {   // the dam itself: a flat crest across the whole valley
      g = ax < 170 ? 4.2 : lerp(bank, mtn, smooth(240, 320, ax) * smooth(18, 50, pd));
    } else {   // open land at both ends
      g = lerp(h * 0.25 + 4, mtn, smooth(220, 330, ax) * smooth(18, 60, pd));
    }
    if (d > MTN) g += Math.pow((d - MTN) / 45, 2) * 55;
    return g;
  }
  if (ZD30) {
    // Abbottabad: a flat valley floor of fields and houses, with steep wooded hills rising all round
    const r = Math.hypot(x, z), ridge = 1 - Math.abs(vnoise(x * 0.007 + 3, z * 0.007 - 5) * 2 - 1);
    h = h * 0.18 + 2.4;
    h = lerp(h, 2.5, smooth(140, 70, r));                                  // the compound and the field beside it: dead flat
    h += smooth(300, 470, r) * (18 + Math.pow(ridge, 1.6) * 42) * smooth(8, 30, pathDist(x, z));
  }
  if (GERMANY) {
    // gentle farmland around a flat old town in the middle
    h = h * 0.4 + 1.6;
    h = lerp(h, 2.2, smooth(215, 160, Math.hypot(x, z)));
  }
  if (HOUSTON) {
    // Houston is famously flat: gentle bumps away from the streets, the bayou cut into the ground, and the lakes
    const pd = pathDist(x, z);
    h = 2 + (vnoise(x * 0.01 + 5, z * 0.01 - 8) - 0.5) * 0.5 * smooth(5, 26, pd);   // nearly dead flat, so neighbourhood streets sit on the ground
    const bd = bayouDist(x, z);
    h = lerp(h, -4.2, smooth(17, 6, bd) * smooth(8, 15, pd));          // roads cross the bayou on bridges
    if (d > MTN) h += Math.pow((d - MTN) / 45, 2) * 18;
    for (const L of LAKES) { const ld = Math.hypot(x - L.x, z - L.z); if (ld < L.r + 16) h = lerp(h, -4, smooth(L.r + 2, L.r - 8, ld)); if (ld > L.r - 4 && ld < L.r + 30) h = Math.max(h, lerp(-4, WATER_Y + 0.4, smooth(L.r - 4, L.r + 1.5, ld))); }
    return h;
  }
  if (SNOW) {
    // jagged mountains: sharp ridges and peaks, cut by passes where the roads run, a snow bank at the border,
    // then a long drop into the snow haze
    const ridge = (f, ox, oz) => 1 - Math.abs(vnoise(x * f + ox, z * f + oz) * 2 - 1);
    const big = Math.pow(ridge(0.0065, 11, 3), 2.6), mid = Math.pow(ridge(0.019, 4, 17), 2.2), fine = vnoise(x * 0.06 + 2, z * 0.06 + 9);
    const mtn = big * 64 + mid * 18 + fine * 3 - 8;
    const road = (fbm(x, z) - 0.5) * 10 + 2;
    const pass = smooth(9, 48, pathDist(x, z));
    h = lerp(road, Math.max(road, mtn), pass);
    if (d > MTN) h += Math.min(d - MTN, 30) * 0.25;
    if (d > EDGE + 6) h -= Math.pow((d - EDGE - 6) / 18, 2) * 85 * (0.8 + 0.4 * vnoise(x * 0.05, z * 0.05));
    for (const L of LAKES) { const ld = Math.hypot(x - L.x, z - L.z); if (ld < L.r + 18) h = lerp(h, ICE_Y, smooth(L.r + 18, L.r - 4, ld)); }   // frozen lakes are flat ice
    return h;
  }
  if (AFGHAN) {
    // southern Iraq: open, nearly flat desert with low dunes, a long rocky ridge, a shallow river with green banks
    // (the roads cross it on raised causeways), and low sandy hills round the edge instead of mountains
    const ridge = (f, ox, oz) => 1 - Math.abs(vnoise(x * f + ox, z * f + oz) * 2 - 1);
    let pd2 = Infinity; for (const P of POINTS_DEF) pd2 = Math.min(pd2, Math.hypot(x - P.x, z - P.z));
    const bd = Math.min(Math.hypot(x - 0, z - 450), Math.hypot(x - 0, z + 450), Math.hypot(x - 170, z - 470) * 1.5, Math.hypot(x + 170, z + 470) * 1.5);   // bases and runways stay on open ground
    const road = smooth(8, 26, pathDist(x, z)), open = smooth(45, 110, pd2) * smooth(110, 190, bd) * road;
    let floor = 4 + (vnoise(x * 0.006, z * 0.006) - 0.5) * 5 + ridge(0.02, 3, 8) * 1.2;
    const dir = 0.9, ph = (x * Math.cos(dir) + z * Math.sin(dir)) * 0.03 + vnoise(x * 0.005, z * 0.005) * 3;   // low dunes
    floor += Math.pow(0.5 + 0.5 * Math.sin(ph), 2) * 4 * open;
    { const t = clamp(((x + 420) * 300 + (z + 160) * 100) / (300 * 300 + 100 * 100), 0, 1), rx = -420 + t * 300, rz = -160 + t * 100, rd = Math.hypot(x - rx, z - rz);   // the long rocky ridge
      floor += Math.max(0, 1 - rd / 34) ** 1.5 * (16 + ridge(0.05, 1, 1) * 6) * smooth(0, 0.12, t) * smooth(1, 0.88, t) * smooth(12, 36, pathDist(x, z)) * smooth(40, 80, pd2); }
    const wd = Math.abs(z - RIVER_Z(x)), rv = smooth(17, 8, wd) * smooth(6, 12, pathDist(x, z));   // the river (shallow enough to wade)
    floor = lerp(floor, WATER_Y - 0.95, rv) - smooth(30, 17, wd) * 1.2 * smooth(6, 12, pathDist(x, z));
    const e = Math.max(Math.abs(x) / 470, Math.abs(z) / 490), hill = 18 + Math.pow(ridge(0.008, 5, 2), 1.5) * 34 + vnoise(x * 0.03, z * 0.03) * 5;
    return lerp(floor, hill, smooth(0.86, 1.03, e) * smooth(14, 50, pathDist(x, z)));
  }
  if (DESERT) {
    // rolling sand dunes, and flat-topped rock mesas with cliff sides (kept off the roads)
    // big slow swells, then long smooth dune ridges on top: no small bumps, so driving and running feel steady
    h = (vnoise(x * 0.0045 + 3, z * 0.0045 - 9) - 0.5) * 14 + (vnoise(x * 0.011, z * 0.011) - 0.5) * 4 + 2;
    const dir = 0.6 + (vnoise(x * 0.002 + 7, z * 0.002 - 3) - 0.5) * 0.9;           // dunes mostly line up with the wind
    const ph = (x * Math.cos(dir) + z * Math.sin(dir)) * 0.036 + vnoise(x * 0.006, z * 0.006) * 3;
    const ridge = 0.5 + 0.5 * Math.sin(ph + 0.35 * Math.sin(ph));                     // gentle slope on one side, a bit steeper on the other
    h += ridge * ridge * 8 * (0.6 + 0.6 * vnoise(x * 0.008 - 5, z * 0.008 + 2)) * smooth(6, 30, pathDist(x, z));
    const m = vnoise(x * 0.0085 + 40, z * 0.0085 - 20), keep = smooth(12, 40, pathDist(x, z));
    h += smooth(0.66, 0.7, m) * (20 + vnoise(x * 0.03, z * 0.03) * 6) * keep;
  }
  if (d > MTN) h += Math.pow((d - MTN) / 45, 2) * 55 * (0.7 + 0.5 * vnoise(x * 0.04, z * 0.04));
  for (const L of LAKES) {
    const ld = Math.hypot(x - L.x, z - L.z);
    if (ld < L.r + 18) h = lerp(h, -5, smooth(L.r + 18, L.r - 10, ld));
    // a proper shore: past the water's edge the ground always rises above the water, so the lake never spills
    // out over low ground and the water surface never hangs in the air over a dip
    if (ld > L.r - 4 && ld < L.r + 45) h = Math.max(h, lerp(-5, WATER_Y + 0.35 + Math.max(0, ld - L.r) * 0.05, smooth(L.r - 4, L.r + 1.5, ld)));
  }
  return h;
}
const FLATS = [];
function addFlatCircle(x, z, r, fade, h) { FLATS.push({ c: true, x, z, r, fade, h: h !== undefined ? h : Math.max(rawHeight(x, z), 1) }); }
function addFlatRect(x, z, hw, hd, fade) { FLATS.push({ c: false, x, z, hw, hd, fade, h: Math.max(rawHeight(x, z), 1) }); }
function genHeight(x, z) {
  let h = rawHeight(x, z);
  // keep paths gently smoothed
  for (const f of FLATS) {
    let dd;
    if (f.ramp) {
      // sloped trench: u runs along the ramp, v across it
      const rx = x - f.x, rz = z - f.z, u = rx * f.dx + rz * f.dz, v = Math.abs(rx * f.dz - rz * f.dx);
      if (u < -f.fade || u > f.len + 1 || v > f.hw + f.fade) continue;
      const target = lerp(f.h0, f.h1, clamp(u / f.len, 0, 1));
      const k = smooth(f.hw + f.fade, f.hw, v) * smooth(-f.fade, 0, u);
      h = lerp(h, target, k);
      continue;
    }
    if (f.c) dd = Math.hypot(x - f.x, z - f.z) - f.r;
    else dd = Math.hypot(Math.max(Math.abs(x - f.x) - f.hw, 0), Math.max(Math.abs(z - f.z) - f.hd, 0));
    if (dd < f.fade) h = lerp(h, f.h, smooth(f.fade, 0, dd));
  }
  return h;
}
const HGRID = new Float32Array(W1 * W1);
function buildHeights() {
  for (let iz = 0; iz <= GRID; iz++)
    for (let ix = 0; ix <= GRID; ix++)
      HGRID[iz * W1 + ix] = genHeight(-HALF + ix * CELL, -HALF + iz * CELL);
}
// exact height of the rendered triangle mesh
function heightAt(x, z) {
  const gx = clamp((x + HALF) / CELL, 0, GRID - 0.0001), gz = clamp((z + HALF) / CELL, 0, GRID - 0.0001);
  const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const ha = HGRID[iz * W1 + ix], hd = HGRID[iz * W1 + ix + 1], hb = HGRID[(iz + 1) * W1 + ix], hc = HGRID[(iz + 1) * W1 + ix + 1];
  if (fx + fz <= 1) return ha + (hd - ha) * fx + (hb - ha) * fz;
  return hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);
}

// ---------- underground spaces (bunkers) ----------
const UNDER = [];
const NUKED = [];   // nuke craters: tunnels and bunkers they dug out are gone (no invisible floors left hanging in the air)
function undergroundAt(x, z, y) {
  for (const u of UNDER) {
    if (x <= u.minX || x >= u.maxX || z <= u.minZ || z >= u.maxZ) continue;
    const f = u.ramp ? underFloor(u, x, z) : u.floor;
    if (NUKED.length && f > heightAt(x, z) + 0.3 && NUKED.some(c => (x - c.x) * (x - c.x) + (z - c.z) * (z - c.z) < c.r2)) continue;
    if (y < f + u.h + 0.6 && y > f - 4) return u;
  }
  return null;
}
function groundAt(x, z, y) { const u = y !== undefined ? undergroundAt(x, z, y) : null; return u ? (u.ramp ? underFloor(u, x, z) : u.floor) : heightAt(x, z); }

// water only exists in the lakes (other low ground is just dry valleys)
function nearLake(x, z) { for (const L of LAKES) if (Math.hypot(x - L.x, z - L.z) < L.r + 20) return true; return WAKE || (NORMANDY && z > 300) || (DAM && z < -60 && z > -400) || (HOUSTON && bayouDist(x, z) < 16) || (AFGHAN && Math.abs(z - RIVER_Z(x)) < 22); }
const ICE_Y = 0.15;
// skyscrapers: planes flown by the computer look out for these as well as the ground
const TALL = [];
function skyAt(x, z) { let h = heightAt(x, z); for (const t of TALL) if (Math.abs(x - t.x) < t.hw + 14 && Math.abs(z - t.z) < t.hd + 14) h = Math.max(h, t.top); return h; }
const SHIPS = [];   // warship hulls on Wake Island (boats bump into them)
function waterDepth(x, z) { if (SNOW || !nearLake(x, z)) return 0; if (WAKE) for (const s of SHIPS) if (Math.abs(x - s.x) < s.hl && Math.abs(z - s.z) < s.hw) return 0; return Math.max(0, WATER_Y - heightAt(x, z)); }
