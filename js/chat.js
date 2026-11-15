// ===================== chat.js : text chat for online games =====================
// Only real people playing online can chat; computer soldiers never do. Press Enter to type, Enter again to
// send, Esc to cancel (on phones and tablets, the CHAT button). Messages show bottom left for a few seconds.
// Every message is checked for bad words on the computer that sends it AND on every computer that shows it,
// so an old or modified game can't sneak them through. Bad words become ****. Names are cleaned the same way.
// A short limit on how fast you can send stops spam.
(function () {
  // ---------- the word filter ----------
  // anywhere inside a word (these never turn up inside ordinary words)
  const ROOTS = ['fuck', 'fuk', 'fvck', 'phuck', 'shit', 'bitch', 'biatch', 'cunt', 'nigg', 'niga', 'faggot', 'fagot', 'whore', 'slut', 'pussy', 'penis', 'vagina',
    'porn', 'retard', 'bastard', 'asshole', 'arsehole', 'motherf', 'wank', 'twat', 'dildo', 'jizz', 'titties', 'boob', 'blowjob', 'handjob', 'horny',
    'nude', 'naked', 'testicle', 'scrotum', 'butthole', 'fck', 'btch', 'biotch', 'douche', 'skank', 'hitler', 'nazi', 'kkk', 'killyourself', 'killurself', 'kysnow'];
  // only as a whole word (they are parts of normal words: class, cockpit, document, therapist...)
  const WORDS = new Set(['ass', 'asses', 'arse', 'fag', 'fags', 'dick', 'dicks', 'dik', 'cock', 'cocks', 'cum', 'tit', 'tits', 'sex', 'sexy', 'rape', 'raped', 'raping',
    'damn', 'dammit', 'hell', 'crap', 'piss', 'pissed', 'wtf', 'stfu', 'gtfo', 'kys', 'milf', 'thot', 'hoe', 'hoes', 'spic', 'chink', 'kike', 'coon', 'tranny', 'homo', 'anus', 'sht', 'azz', 'a55', 'rapist', 'rapists']);
  // hurtful phrases, checked across the whole message with spaces and symbols squeezed out
  const PHRASES = ['killyourself', 'killurself', 'killyoself', 'gokillyourself', 'godie', 'hopeyoudie'];
  const LEET = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b', '9': 'g', '(': 'c', '¢': 'c', 'ph': 'f' };
  const norm = s => s.toLowerCase().replace(/ph/g, 'f').replace(/[0-9!|@$+(¢]/g, ch => LEET[ch] || ch).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  const squash = s => s.replace(/(.)\1+/g, '$1');                  // "fuuuuck" -> "fuck"
  function bad(word) {
    const n = norm(word); if (!n) return false;
    for (const v of [n, squash(n)]) {
      if (WORDS.has(v) || WORDS.has(v.replace(/s$/, ''))) return true;
      for (const r of ROOTS) if (v.includes(r)) return true;
    }
    return false;
  }
  function clean(text) {
    let s = String(text || '').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '').slice(0, 80);
    const parts = s.split(/(\s+)/);
    // single letters spelled out with spaces ("f u c k") or dots: check them joined together too
    for (let i = 0; i < parts.length; i++) {
      if (!parts[i].trim()) continue;
      let j = i, joined = '', idx = [];
      while (j < parts.length && (parts[j].trim() === '' || norm(parts[j]).length <= 1)) { if (parts[j].trim()) { joined += parts[j]; idx.push(j); } j++; }
      if (idx.length >= 3 && bad(joined)) for (const k of idx) parts[k] = '*';
    }
    for (let i = 0; i < parts.length; i++) if (parts[i].trim() && bad(parts[i])) parts[i] = '*'.repeat(Math.min(8, Math.max(3, parts[i].length)));
    const out = parts.join(''), whole = squash(norm(out));
    for (const ph of PHRASES) if (whole.includes(squash(ph))) return '****';
    return out;
  }
  window.chatClean = clean;

  // ---------- the chat box ----------
  const css = `
  #chatBox { position: fixed; left: 18px; bottom: 120px; width: min(420px, 60vw); z-index: 7; pointer-events: none;
    font: 500 15px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
  #chatLog div { color: #fff; background: rgba(8, 12, 20, .55); padding: 4px 10px; border-radius: 8px; margin-top: 4px; width: fit-content; max-width: 100%;
    word-wrap: break-word; text-shadow: 0 1px 2px rgba(0,0,0,.6); transition: opacity .8s ease; }
  #chatLog div b { font-weight: 700; margin-right: 6px; }
  #chatLog div.sys { color: #c8d2dc; font-style: italic; }
  #chatIn { display: none; pointer-events: auto; margin-top: 6px; width: 100%; box-sizing: border-box; padding: 9px 12px; border-radius: 10px; border: 2px solid rgba(255,255,255,.35);
    background: rgba(8, 12, 20, .85); color: #fff; font: 500 15px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; outline: none; }
  #chatIn:focus { border-color: #ffd54f; }
  #chatHint { display: none; color: #c8d2dc; font-size: 12px; margin-top: 4px; text-shadow: 0 1px 2px rgba(0,0,0,.7); }
  #tChat { display: none; }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const box = document.createElement('div'); box.id = 'chatBox'; box.className = 'hud';
  box.innerHTML = '<div id="chatLog"></div><input id="chatIn" maxlength="80" autocomplete="off" placeholder="Say something to the other players..."><div id="chatHint">Enter to send, Esc to cancel</div>';
  document.body.appendChild(box);
  const log = box.querySelector('#chatLog'), inp = box.querySelector('#chatIn'), hint = box.querySelector('#chatHint');
  const lines = [];   // { el, t }
  let open = false;

  function addLine(name, team, text, sys) {
    const d = document.createElement('div');
    if (sys) { d.className = 'sys'; d.textContent = text; }
    else {
      const b = document.createElement('b'); b.textContent = clean(name || 'Soldier').slice(0, 16) + ':';
      b.style.color = (typeof TEAM_CSS !== 'undefined' && TEAM_CSS[team]) || '#fff';
      d.appendChild(b); d.appendChild(document.createTextNode(clean(text)));
    }
    log.appendChild(d); lines.push({ el: d, t: performance.now() });
    while (lines.length > 30) { const o = lines.shift(); o.el.remove(); }
    showLines();
  }
  window.chatLine = addLine;
  function showLines() {
    const now = performance.now();
    lines.forEach((l, i) => {
      const recent = i >= lines.length - (open ? 10 : 6);
      const age = (now - l.t) / 1000;
      l.el.style.display = recent ? '' : 'none';
      l.el.style.opacity = open ? 1 : age < 10 ? 1 : age < 12 ? 0.25 : 0;
    });
  }
  setInterval(showLines, 500);

  // ---------- typing ----------
  let wasPlaying = false;
  function openChat() {
    if (open || !online()) return;
    open = true; wasPlaying = playing;
    for (const k in keys) keys[k] = false; mouse.left = mouse.right = false;
    playing = false; uiOpen = uiOpen || 'chat';
    inp.style.display = 'block'; hint.style.display = 'block'; inp.value = '';
    setTimeout(() => inp.focus(), 0);
    showLines();
  }
  function closeChat() {
    if (!open) return;
    open = false; inp.blur(); inp.style.display = 'none'; hint.style.display = 'none';
    if (uiOpen === 'chat') uiOpen = null;
    if (wasPlaying && player.alive) { playing = true; if (!IS_TOUCH && typeof lockPointer === 'function' && !locked) lockPointer(); }
    for (const k in keys) keys[k] = false;
    showLines();
  }
  const sent = [];
  function send() {
    const raw = inp.value.trim(); closeChat();
    if (!raw || !online()) return;
    const now = performance.now();
    while (sent.length && now - sent[0] > 10000) sent.shift();
    if (sent.length >= 5 || (sent.length && now - sent[sent.length - 1] < 1200)) { addLine('', '', 'Slow down a little before sending another message.', true); return; }
    sent.push(now);
    const text = clean(raw);
    if (!text.replace(/\*/g, '').trim()) { addLine('', '', 'That message was blocked by the word filter.', true); return; }
    stamp(net.chat, [text], 8);
    addLine(player.name, player.team, text);
  }
  inp.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); send(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeChat(); }
  });
  inp.addEventListener('keyup', e => e.stopPropagation());
  inp.addEventListener('blur', () => { if (open) setTimeout(() => { if (open && document.activeElement !== inp) closeChat(); }, 100); });
  const online = () => typeof net !== 'undefined' && net.active && started;
  addEventListener('keydown', e => {
    if (e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
    if (open || !started || document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    if (!online()) { if (playing) showMessage('Chat works in online games with other players', 2); return; }
    if (uiOpen && uiOpen !== 'chat') return;
    e.preventDefault(); openChat();
  });

  // a CHAT button for phones and tablets, shown only in online games
  const side = document.getElementById('tSide');
  if (side) {
    const b = document.createElement('div'); b.className = 'tb sm'; b.id = 'tChat'; b.textContent = 'CHAT'; side.appendChild(b);
    const tap = e => { e.preventDefault(); e.stopPropagation(); open ? closeChat() : openChat(); };
    b.addEventListener('touchstart', tap, { passive: false }); b.addEventListener('click', tap);
    setInterval(() => { b.style.display = online() ? '' : 'none'; }, 1000);
  }
})();
