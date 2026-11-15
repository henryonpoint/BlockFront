// ===================== sound.js : music, ambience, engines, footsteps and richer effects =====================
let musicOn = true, musicOut = null, musicFilter = null, ambOut = null, windGain = null, windFilter = null, humGain = null;
let combatT = -99, musicInt = 0.3, nextStep = 0, stepIdx = 0, barIdx = 0, lastPh = 0, wasOnGround = true, lastVelY = 0;
let birdT = 4, distantT = 5, dripT = 3, heartT = 0;
const engineVoices = [];
try { if (localStorage.getItem('bf-music') === 'off') musicOn = false; } catch (e) { }

function noteCombat(d) { combatT = simTime; }

// noise through a chosen filter (for cracks, swishes, footsteps)
function nz(type, freq, dur, vol, q = 1, delay = 0) {
  if (!actx || vol < 0.005) return;
  const t = actx.currentTime + delay;
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = type === 'lowpass' ? freq * clamp(1 - sndDist / 200, 0.18, 1) : freq; f.Q.value = q;
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxOut); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
function tn(type, f0, f1, dur, vol, delay = 0, out = null) {
  if (!actx || vol < 0.005) return;
  const t = actx.currentTime + delay;
  const o = actx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g); g.connect(out || sfxOut); o.start(t); o.stop(t + dur + 0.02);
}
// a layered gunshot: sharp crack, body and a low punch (far shots lose the crack)
function shot(v, crack, body, bodyDur, low, lowF) {
  const near = clamp(1 - sndDist / 90, 0, 1);
  nz('highpass', crack, 0.05, 0.45 * v * near);
  noiseHit(body, bodyDur, 0.75 * v);
  tn('sine', lowF, 38, 0.16, low * v * (0.4 + 0.6 * near));
}
// a frightened civilian's yelp: a short rising then falling voice-like cry
function yelp(v) { const f = 420 + Math.random() * 260; tn('triangle', f, f * 1.35, 0.12, 0.09 * v); tn('triangle', f * 1.35, f * 0.8, 0.45, 0.08 * v, 0.11); tn('sawtooth', f * 0.5, f * 0.42, 0.5, 0.025 * v, 0.02); }
Object.assign(SFX, {
  yell: (v = 1) => yelp(v),
  pistol: (v = 1) => shot(v, 3500, 2600, 0.2, 0.35, 150),
  rifle: (v = 1) => shot(v * 0.85, 4200, 2900, 0.17, 0.4, 130),
  smg: (v = 1) => shot(v * 0.65, 5000, 3600, 0.1, 0.25, 160),
  shotgun: (v = 1) => { shot(v * 1.1, 2500, 1500, 0.45, 0.7, 110); nz('lowpass', 500, 0.6, 0.25 * v); },
  sniper: (v = 1) => { shot(v * 1.2, 5000, 3800, 0.5, 0.75, 120); nz('lowpass', 800, 1.2, 0.18 * v, 1, 0.06); },
  minigun: (v = 1) => shot(v * 0.5, 4500, 3300, 0.08, 0.2, 140),
  mg: (v = 1) => shot(v * 0.8, 3200, 2200, 0.14, 0.45, 110),
  boom: (v = 1) => { noiseHit(700, 0.25, 1.1 * v); noiseHit(260, 1.8, 1.1 * v); tn('sine', 80, 22, 1.0, 1.0 * v); nz('lowpass', 1800, 0.9, 0.12 * v, 1, 0.12); },
  rocket: (v = 1) => { nz('bandpass', 900, 0.7, 0.6 * v, 0.7); noiseHit(500, 0.5, 0.5 * v); tn('sawtooth', 260, 70, 0.5, 0.08 * v); },
  thump: (v = 1) => { tn('sine', 200, 55, 0.18, 0.7 * v); nz('bandpass', 700, 0.12, 0.3 * v); },
  click: (v = 1) => { tn('square', 1500, 1100, 0.025, 0.06 * v); },
  reload: (v = 1) => { nz('bandpass', 2200, 0.05, 0.25 * v, 3); nz('bandpass', 1500, 0.06, 0.3 * v, 3, 0.28); tn('square', 520, 380, 0.05, 0.05 * v, 0.55); nz('bandpass', 3000, 0.04, 0.3 * v, 4, 0.6); },
});
function sfxLadder() { for (let i = 0; i < 4; i++) { tn('triangle', 900 + Math.random() * 200, 700, 0.12, 0.12, i * 0.16); nz('bandpass', 2500, 0.05, 0.15, 6, i * 0.16); } }
function sfxGrenade() { nz('bandpass', 4000, 0.04, 0.25, 5); tn('triangle', 2400, 2300, 0.08, 0.06, 0.05); nz('bandpass', 600, 0.3, 0.2, 0.8, 0.12); }
function sfxBombDrop() { tn('sine', 1900, 500, 1.8, 0.12); }
function sfxHurt() { noiseHit(400, 0.15, 0.5); tn('sine', 130, 70, 0.15, 0.25); }
function sfxJump() { nz('bandpass', 700, 0.12, 0.08, 0.8); }

// ---------- setup (runs once the audio context exists) ----------
function soundSetup() {
  musicOut = actx.createGain(); musicOut.gain.value = musicOn ? 0.17 : 0;
  musicFilter = actx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 9000;
  musicOut.connect(musicFilter); musicFilter.connect(master);
  ambOut = actx.createGain(); ambOut.gain.value = 1; ambOut.connect(master);
  // wind: looping noise through a moving band filter
  const ws = actx.createBufferSource(); ws.buffer = noiseBuf; ws.loop = true;
  windFilter = actx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 420; windFilter.Q.value = 0.6;
  windGain = actx.createGain(); windGain.gain.value = 0;
  ws.connect(windFilter); windFilter.connect(windGain); windGain.connect(ambOut); ws.start();
  // underground hum
  humGain = actx.createGain(); humGain.gain.value = 0; humGain.connect(ambOut);
  for (const [f, type] of [[55, 'sine'], [110.5, 'triangle']]) { const o = actx.createOscillator(); o.type = type; o.frequency.value = f; const g = actx.createGain(); g.gain.value = type === 'sine' ? 1 : 0.3; o.connect(g); g.connect(humGain); o.start(); }
  // engine voices (reused for the nearest vehicles)
  for (let i = 0; i < 3; i++) {
    const o = actx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50;
    const o2 = actx.createOscillator(); o2.type = 'square'; o2.frequency.value = 25;
    const n = actx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const nf = actx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 300; nf.Q.value = 0.8;
    const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
    const g = actx.createGain(); g.gain.value = 0;
    const g2 = actx.createGain(); g2.gain.value = 0.35;
    o.connect(f); o2.connect(g2); g2.connect(f); n.connect(nf); nf.connect(f); f.connect(g); g.connect(sfxOut);
    o.start(); o2.start(); n.start();
    engineVoices.push({ o, o2, nf, f, g });
  }
  nextStep = actx.currentTime + 0.1;
}
function setMusic(on) {
  musicOn = on;
  try { localStorage.setItem('bf-music', on ? 'on' : 'off'); } catch (e) { }
  if (musicOut) musicOut.gain.setTargetAtTime(on ? 0.17 : 0, actx.currentTime, 0.3);
  showMessage(on ? 'Music on (N to turn off)' : 'Music off (N to turn on)', 1.5);
  const b = $('tMusic'); if (b) b.classList.toggle('off', !on);
}

// ---------- music: a looping 4-bar march in A minor that gets busier during fights ----------
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];   // Am F C G
const MEL = [76, -1, 74, 72, -1, 71, 72, -1, 69, -1, 67, 69, -1, -1, 64, -1];
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
function mNote(type, freq, t, dur, vol, cutoff = 2400) {
  const o = actx.createOscillator(); o.type = type; o.frequency.value = freq;
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(f); f.connect(g); g.connect(musicOut); o.start(t); o.stop(t + dur + 0.05);
}
function mNoise(type, freq, t, dur, vol) {
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = actx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  s.connect(f); f.connect(g); g.connect(musicOut); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
function scheduleMusic() {
  if (!actx || !musicOut) return;
  const spb = 60 / 96 / 4;   // one 16th note
  if (nextStep < actx.currentTime - 0.5) nextStep = actx.currentTime + 0.05;
  while (nextStep < actx.currentTime + 0.25) {
    const t = nextStep, s = stepIdx % 16, ch = CHORDS[barIdx % 4], I = musicInt;
    if (musicOn) {
      // pad at the start of each bar
      if (s === 0) for (const m of ch) { mNote('sawtooth', midi(m), t, spb * 16, 0.05, 900 + I * 900); mNote('sawtooth', midi(m) * 1.004, t, spb * 16, 0.04, 900); }
      // bass
      if ([0, 3, 6, 8, 11, 14].includes(s)) mNote('sawtooth', midi(ch[0] - 24 + (s === 6 || s === 14 ? 12 : 0)), t, spb * 2, 0.16, 500 + I * 500);
      // drums: kick and snare always, hats and rolls when the fighting is close
      if (s === 0 || s === 8 || (I > 0.6 && (s === 6 || s === 10))) { mNote('sine', 120, t, 0.18, 0.5, 400); }
      if (s === 4 || s === 12) mNoise('bandpass', 1800, t, 0.16, 0.25 + I * 0.15);
      if (I > 0.45 && s % 2 === 0) mNoise('highpass', 7000, t, 0.04, 0.06 + I * 0.05);
      if (I > 0.75 && barIdx % 4 === 3 && s >= 12) mNoise('bandpass', 2000, t, 0.08, 0.18);
      // arpeggio in fights, melody when calm (every other loop)
      if (I > 0.55) mNote('triangle', midi(ch[s % 3] + 12), t, spb * 0.9, 0.05, 3000);
      else if (Math.floor(barIdx / 4) % 2 === 1 && MEL[s] > 0 && barIdx % 2 === 0) mNote('triangle', midi(MEL[s] - (barIdx % 4 === 2 ? 2 : 0)), t, spb * 2.5, 0.06, 2600);
    }
    nextStep += spb; stepIdx++;
    if (stepIdx % 16 === 0) barIdx++;
  }
}

// ---------- engines ----------
function updateEngines() {
  const cands = [];
  const cam = camera.position;
  for (const pl of planes) {
    if (!pl.alive) continue;
    const mine = player.vehicle === pl, d = mine ? 0 : pl.pos.distanceTo(cam);
    if (!mine && (d > 260 || (pl.onGround && pl.speed < 2 && !pl.pilot))) continue;
    cands.push({ d, kind: 'plane', s: pl.speed, thr: pl.throttle || 0, mine });
  }
  for (const v of gvehicles) {
    if (!v.alive) continue;
    const mine = player.gv === v, d = mine ? 0 : v.pos.distanceTo(cam);
    const running = v.seats.some(s => s);
    if (!mine && (d > (v.T.heli ? 260 : 120) || !(running || (v.rotorSpin || 0) > 0.1))) continue;
    cands.push({ d, kind: v.type, s: Math.abs(v.speed || 0), mine });
  }
  cands.sort((a, b) => a.d - b.d);
  const t = actx.currentTime;
  engineVoices.forEach((ev, i) => {
    const c = cands[i];
    if (!c) { ev.g.gain.setTargetAtTime(0, t, 0.15); return; }
    const far = c.kind === 'plane' ? 260 : c.kind === 'heli' ? 220 : 120;
    let vol = c.mine ? 0.11 : 0.16 * Math.pow(clamp(1 - c.d / far, 0, 1), 1.5);
    let f, cut, nf;
    if (c.kind === 'plane') { f = 55 + c.s * 1.3 + c.thr * 20; cut = 500 + c.s * 22; nf = 600 + c.s * 15; vol *= 0.7 + c.thr * 0.5; }
    else if (c.kind === 'tank') { f = 32 + c.s * 2.2; cut = 260 + c.s * 25; nf = 180; vol *= 1.2; }
    else if (c.kind === 'heli') { f = 30 + c.s * 0.5; cut = 420; nf = 520; vol *= 1.3 * (0.45 + 0.55 * Math.pow(Math.max(0, Math.sin(performance.now() / 1000 * Math.PI * 2 * 6.5)), 2)); }
    else if (c.kind === 'boat') { f = 58 + c.s * 4; cut = 600 + c.s * 40; nf = 700; vol *= 0.9; }
    else if (c.kind === 'bike') { f = 85 + c.s * 7; cut = 900 + c.s * 70; nf = 1100; vol *= 0.75; }
    else if (c.kind === 'apc') { f = 36 + c.s * 2.4; cut = 280 + c.s * 26; nf = 220; vol *= 1.1; }
    else if (c.kind === 'quad') { f = 70 + c.s * 6; cut = 700 + c.s * 60; nf = 900; vol *= 0.8; }
    else if (c.kind === 'truck') { f = 40 + c.s * 2.6; cut = 320 + c.s * 30; nf = 260; }
    else { f = 50 + c.s * 4; cut = 420 + c.s * 40; nf = 400; }
    if (undergroundAt(cam.x, cam.z, cam.y - 1.7)) { vol *= 0.25; cut = Math.min(cut, 300); }
    ev.o.frequency.setTargetAtTime(f, t, 0.1); ev.o2.frequency.setTargetAtTime(f / 2, t, 0.1);
    ev.f.frequency.setTargetAtTime(cut, t, 0.1); ev.nf.frequency.setTargetAtTime(nf, t, 0.2);
    ev.g.gain.setTargetAtTime(vol, t, c.kind === 'heli' ? 0.015 : 0.12);
  });
}

// ---------- every frame ----------
function updateSound(dt) {
  if (!actx || !sfxOut) return;
  const t = actx.currentTime, cam = camera.position;
  const under = !!undergroundAt(cam.x, cam.z, cam.y - 1.7);
  const fighting = simTime - combatT < 8;
  musicInt += ((fighting ? 1 : under ? 0.15 : 0.3) - musicInt) * Math.min(1, dt * (fighting ? 1.5 : 0.25));
  scheduleMusic();
  musicFilter.frequency.setTargetAtTime(under ? 1100 : 9000, t, 0.4);
  revSend.gain.setTargetAtTime(under ? 0.5 : 0.12, t, 0.3);
  // wind gets stronger up high and in fast planes; hum underground
  const alt = clamp((cam.y - heightAt(cam.x, cam.z)) / 80, 0, 1), pspeed = player.vehicle ? player.vehicle.speed : 0;
  const wind = under ? 0 : (0.035 + alt * 0.05 + pspeed * 0.0018) * (0.75 + 0.25 * Math.sin(simTime * 0.37) * Math.sin(simTime * 0.13));
  windGain.gain.setTargetAtTime(playing ? wind : 0, t, 0.3);
  windFilter.frequency.setTargetAtTime(380 + alt * 250 + pspeed * 6 + Math.sin(simTime * 0.5) * 60, t, 0.3);
  humGain.gain.setTargetAtTime(under && playing ? 0.03 : 0, t, 0.5);
  if (!playing) { engineVoices.forEach(ev => ev.g.gain.setTargetAtTime(0, t, 0.1)); return; }
  updateEngines();
  // birds when it's quiet outside, drips in the tunnels, a war going on in the distance
  if (!under && !fighting && !player.vehicle && (birdT -= dt) < 0) {
    birdT = rand(3, 9);
    const base = rand(2400, 3800), n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) tn('sine', base * rand(0.9, 1.15), base * rand(1.1, 1.4), 0.09, 0.03, i * rand(0.1, 0.16), ambOut);
  }
  if (under && (dripT -= dt) < 0) { dripT = rand(1.5, 5); const f = rand(1400, 2400); tn('sine', f, f * 0.55, 0.12, 0.05); }
  if ((distantT -= dt) < 0) {
    distantT = rand(2.5, 7);
    const m = under ? 0.35 : 1;
    sndDist = 190;
    if (Math.random() < 0.4) { noiseHit(220, 1.6, 0.1 * m); tn('sine', 60, 25, 1.2, 0.08 * m); }
    else { const k = 3 + Math.floor(Math.random() * 6), gap = rand(0.08, 0.13); for (let i = 0; i < k; i++) nz('lowpass', 900, 0.08, 0.05 * m, 1, i * gap); }
    sndDist = 0;
  }
  // footsteps (concrete sounds sharper than grass), landing thud, low-health heartbeat
  if (player.alive && !player.vehicle && !player.gv && !player.turret) {
    const ph = Math.floor(bobT / Math.PI);
    if (ph !== lastPh && player.onGround) {
      const hard = under || !!nearbyColliders(player.pos.x, player.pos.z).find(o => o.kind === 'box' && Math.abs(o.maxY - player.pos.y) < 0.1);
      const run = keys.ShiftLeft || keys.ShiftRight;
      if (hard) { nz('bandpass', rand(1800, 2400), 0.06, run ? 0.16 : 0.11, 1.5); tn('sine', 160, 90, 0.04, 0.05); }
      else nz('lowpass', rand(700, 1000), 0.09, run ? 0.14 : 0.1);
    }
    lastPh = ph;
    if (player.onGround && !wasOnGround && lastVelY < -7) { noiseHit(500, 0.18, 0.4); tn('sine', 110, 50, 0.15, 0.3); }
    if (!player.onGround && wasOnGround && player.velY > 3) sfxJump();
    wasOnGround = player.onGround; lastVelY = player.velY;
    if (player.hp < 30 && (heartT -= dt) < 0) { heartT = 0.85; tn('sine', 70, 45, 0.12, 0.35); tn('sine', 65, 40, 0.12, 0.25, 0.18); }
  }
}

// menu clicks
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.btn, .chip, .shopItem, .spawnOpt, .item')) { initAudio(); SFX.click(); } }, true);
addEventListener('keydown', e => { if (e.code === 'KeyN' && started) { initAudio(); setMusic(!musicOn); } });
