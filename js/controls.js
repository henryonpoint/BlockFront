// ===================== controls.js : change keys, crosshair and other settings =====================
// Changing a key works by translating it: if "move forward" is set to the Up arrow, pressing Up is passed
// to the game as W. That way every part of the game keeps working without changes.
const ACTIONS = [
  ['KeyW', 'Move forward'], ['KeyS', 'Move back'], ['KeyA', 'Move left'], ['KeyD', 'Move right'],
  ['Space', 'Jump / helicopter up'], ['ShiftLeft', 'Run / helicopter down'], ['KeyC', 'Crouch'], ['KeyR', 'Reload'],
  ['KeyE', 'Use / get in'], ['KeyF', 'Switch seat'], ['KeyG', 'Grenade'], ['KeyT', 'Airstrike'], ['KeyH', 'Whistle (team into your vehicle)'], ['KeyX', 'Sticky bomb'], ['KeyY', 'Mini nuke'], ['Enter', 'Chat (online games)'], ['Backquote', 'Console and cheats'],
  ['KeyB', 'Shop'], ['KeyV', 'Place what you built'], ['Tab', 'Scoreboard'], ['KeyM', 'Big map'], ['KeyN', 'Music on or off'],
];
let BINDS = {};    // game key -> the key the player chose
try { BINDS = JSON.parse(localStorage.getItem('bf_keys') || '{}') || {}; } catch (e) { BINDS = {}; }
function saveBinds() { try { localStorage.setItem('bf_keys', JSON.stringify(BINDS)); } catch (e) { } }
let REMAP = {}, SWALLOW = new Set();
function rebuildRemap() {
  REMAP = {}; SWALLOW = new Set();
  for (const [def] of ACTIONS) { const k = BINDS[def]; if (k && k !== def) { REMAP[k] = def; SWALLOW.add(def); } }
  for (const k of Object.keys(REMAP)) SWALLOW.delete(k);     // a key used for another action still works for that action
}
rebuildRemap();
const keyName = c => !c ? '?' : c.startsWith('Key') ? c.slice(3) : c.startsWith('Digit') ? c.slice(5) : c.startsWith('Arrow') ? c.slice(5) + ' arrow' : ({ ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift', ControlLeft: 'Left Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Left Alt', Space: 'Space', Tab: 'Tab', CapsLock: 'Caps Lock', Backquote: '`' })[c] || c;
let rebinding = null;
const isTyping = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
for (const type of ['keydown', 'keyup']) {
  addEventListener(type, e => {
    if (e.__bf || isTyping(e.target)) return;
    if (rebinding && type === 'keydown') {          // waiting for the new key
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.code !== 'Escape') { BINDS[rebinding] = e.code; saveBinds(); rebuildRemap(); }
      rebinding = null; drawControls(); return;
    }
    const to = REMAP[e.code];
    if (to) {
      e.preventDefault(); e.stopImmediatePropagation();
      const ev = new KeyboardEvent(type, { code: to, key: to.startsWith('Key') ? to.slice(3).toLowerCase() : e.key, bubbles: true, cancelable: true, repeat: e.repeat, shiftKey: e.shiftKey });
      ev.__bf = true; (e.target || window).dispatchEvent(ev); return;
    }
    if (SWALLOW.has(e.code)) { e.stopImmediatePropagation(); }   // its action moved to another key
  }, true);
}

// ---------- extra settings: crosshair, field of view, invert look, FPS counter, shake, damage numbers ----------
const XH = { style: 'cross', color: '#ffffff', size: 1, gap: 1 };
Object.assign(XH, SET.xh || {});
const XH_STYLES = [['cross', 'Cross'], ['dot', 'Dot'], ['crossdot', 'Cross + dot'], ['circle', 'Circle'], ['tee', 'T shape']];
const XH_COLORS = ['#ffffff', '#4ade80', '#facc15', '#22d3ee', '#f87171', '#f472b6'];
if (SET.fov === undefined) SET.fov = 75;
if (SET.invert === undefined) SET.invert = false;
if (SET.fps === undefined) SET.fps = false;
if (SET.shake === undefined) SET.shake = true;
if (SET.dmgNums === undefined) SET.dmgNums = true;
function applyCrosshair() {
  const c = $('crosshair'); if (!c) return;
  c.dataset.style = XH.style;
  c.style.setProperty('--xc', XH.color); c.style.setProperty('--xs', XH.size); c.style.setProperty('--xg', XH.gap);
  SET.xh = XH; saveSettings();
}
let fpsEl = null, fpsAcc = 0, fpsN = 0;
function updateExtras(dt) {
  if (SET.fps) {
    if (!fpsEl) { fpsEl = document.createElement('div'); fpsEl.id = 'fpsCounter'; document.body.appendChild(fpsEl); }
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 0.5) { fpsEl.textContent = Math.round(fpsN / fpsAcc) + ' FPS'; fpsAcc = 0; fpsN = 0; }
    fpsEl.style.display = 'block';
  } else if (fpsEl) fpsEl.style.display = 'none';
  if (!SET.shake) camShake = 0;
}

// ---------- the panels ----------
function drawControls() {
  for (const el of document.querySelectorAll('.controlsList')) {
    el.innerHTML = ACTIONS.map(([def, label]) => `<div class="krow"><span>${label}</span><div class="kbtn${rebinding === def ? ' wait' : ''}" data-k="${def}">${rebinding === def ? 'Press a key...' : keyName(BINDS[def] || def)}</div></div>`).join('');
    el.querySelectorAll('.kbtn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); rebinding = b.dataset.k; drawControls(); }));
  }
}
function buildExtraSettings(el) {
  el.innerHTML = `
    <div class="row"><span>Crosshair</span><div class="chips" data-g="style">${XH_STYLES.map(([k, v]) => `<div class="chip" data-v="${k}">${v}</div>`).join('')}</div></div>
    <div class="row"><span>Colour</span><div class="swatches">${XH_COLORS.map(c => `<div class="sw" data-c="${c}" style="background:${c}"></div>`).join('')}</div></div>
    <div class="row"><span>Size</span><input type="range" min="0.6" max="2" step="0.1" data-x="size"></div>
    <div class="row"><span>Gap</span><input type="range" min="0" max="3" step="0.1" data-x="gap"></div>
    <div class="row"><span>Field of view</span><input type="range" min="60" max="100" step="1" data-s="fov"></div>
    <div class="row"><span>Invert look up/down</span><div class="tog" data-t="invert"></div></div>
    <div class="row"><span>Show FPS</span><div class="tog" data-t="fps"></div></div>
    <div class="row"><span>Screen shake</span><div class="tog" data-t="shake"></div></div>
    <div class="row"><span>Damage numbers</span><div class="tog" data-t="dmgNums"></div></div>
    <div class="row"><span>Keys</span><div class="btn alt small" data-act="keys">Change keys</div></div>`;
  for (const ev of ['click', 'mousedown', 'touchstart', 'pointerdown']) el.addEventListener(ev, e => e.stopPropagation());
  el.querySelectorAll('[data-g="style"] .chip').forEach(c => c.addEventListener('click', () => { XH.style = c.dataset.v; applyCrosshair(); syncExtras(); }));
  el.querySelectorAll('.sw').forEach(s => s.addEventListener('click', () => { XH.color = s.dataset.c; applyCrosshair(); syncExtras(); }));
  el.querySelectorAll('input[data-x]').forEach(i => i.addEventListener('input', () => { XH[i.dataset.x] = +i.value; applyCrosshair(); }));
  el.querySelectorAll('input[data-s]').forEach(i => i.addEventListener('input', () => { SET[i.dataset.s] = +i.value; saveSettings(); }));
  el.querySelectorAll('.tog').forEach(t => t.addEventListener('click', () => { SET[t.dataset.t] = !SET[t.dataset.t]; saveSettings(); syncExtras(); }));
  el.querySelectorAll('[data-act="keys"]').forEach(b => b.addEventListener('click', () => { $('keysPanel').classList.add('on'); drawControls(); }));
}
function syncExtras() {
  document.querySelectorAll('[data-g="style"] .chip').forEach(c => c.classList.toggle('on', c.dataset.v === XH.style));
  document.querySelectorAll('.sw').forEach(s => s.classList.toggle('on', s.dataset.c === XH.color));
  document.querySelectorAll('input[data-x]').forEach(i => { i.value = XH[i.dataset.x]; });
  document.querySelectorAll('input[data-s]').forEach(i => { i.value = SET[i.dataset.s]; });
  document.querySelectorAll('.tog').forEach(t => t.classList.toggle('on', !!SET[t.dataset.t]));
}
(function buildKeysPanel() {
  const p = document.createElement('div'); p.id = 'keysPanel';
  p.innerHTML = `<div class="keysBox"><h2>Change keys</h2><p class="small">Click an action, then press the key you want. Esc cancels.</p><div class="controlsList"></div>
    <div class="btnRow"><div class="btn alt" id="keysReset">Reset to normal</div><div class="btn" id="keysDone">Done</div></div></div>`;
  document.body.appendChild(p);
  for (const ev of ['click', 'mousedown', 'touchstart', 'pointerdown']) p.addEventListener(ev, e => e.stopPropagation());
  $('keysReset').addEventListener('click', () => { BINDS = {}; saveBinds(); rebuildRemap(); drawControls(); });
  $('keysDone').addEventListener('click', () => { rebinding = null; p.classList.remove('on'); });
})();
document.querySelectorAll('.extraSettings').forEach(buildExtraSettings);
applyCrosshair(); syncExtras();
