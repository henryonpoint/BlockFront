// ===================== intro.js : the opening credits =====================
// Three short cards before the start screen: C.C.C.C, Netlify and Claude.
// Plays once per visit (a page reload for a new map skips it). Click, tap or any key skips it.
(function () {
  let seen = false;
  try { seen = sessionStorage.getItem('bf_intro') === '1' || !!sessionStorage.getItem('bf_force'); } catch (e) { }
  if (seen) return;
  try { sessionStorage.setItem('bf_intro', '1'); } catch (e) { }

  const css = `
  #intro { position: fixed; inset: 0; z-index: 9999; background: #05070b; display: flex; align-items: center; justify-content: center;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #fff; overflow: hidden; cursor: pointer;
    transition: opacity .7s ease; }
  #intro.out { opacity: 0; pointer-events: none; }
  #intro canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  #intro .card { position: absolute; text-align: center; opacity: 0; transform: scale(.94); transition: opacity .55s ease, transform 2.4s cubic-bezier(.2,.7,.2,1); }
  #intro .card.on { opacity: 1; transform: scale(1); }
  #intro .card.off { opacity: 0; transform: scale(1.04); transition: opacity .45s ease, transform .45s ease; }
  #intro .big { font-size: clamp(44px, 11vw, 120px); font-weight: 800; letter-spacing: .04em; line-height: 1; }
  #intro .small { margin-top: 18px; font-size: clamp(13px, 2.2vw, 18px); font-weight: 500; letter-spacing: .32em; text-transform: uppercase; opacity: .7; }
  #intro .tag { font-size: clamp(13px, 2vw, 16px); font-weight: 500; letter-spacing: .3em; text-transform: uppercase; opacity: .65; margin-bottom: 16px; }
  #intro .ccc span { display: inline-block; opacity: 0; transform: translateY(-60px) scale(1.4); filter: blur(6px);
    transition: opacity .35s ease, transform .5s cubic-bezier(.2,1.5,.4,1), filter .4s ease; color: #e8c46a; text-shadow: 0 0 28px rgba(232,196,106,.55); }
  #intro .ccc span.dot { color: #fff; text-shadow: none; }
  #intro .ccc.go span { opacity: 1; transform: none; filter: none; }
  #intro .bar { width: 0; height: 3px; margin: 22px auto 0; background: linear-gradient(90deg, transparent, currentColor, transparent); transition: width 1.4s ease .5s; }
  #intro .card.on .bar { width: min(420px, 70vw); }
  #intro .net { color: #32e6e2; }
  #intro .net .big { color: #fff; }
  #intro .net .big b { color: #32e6e2; font-weight: 800; }
  #intro .cla { color: #e8875a; }
  #intro .cla .big { color: #fff; }
  #intro .cla .big b { color: #e8875a; font-weight: 800; }
  #intro .skip { position: absolute; bottom: 22px; right: 26px; font-size: 13px; opacity: .45; letter-spacing: .08em; }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const el = document.createElement('div'); el.id = 'intro';
  const letters = 'C.C.C.C'.split('').map(ch => `<span class="${ch === '.' ? 'dot' : ''}">${ch}</span>`).join('');
  el.innerHTML = `<canvas></canvas>
    <div class="card" id="introA"><div class="big ccc">${letters}</div><div class="small">presents</div></div>
    <div class="card net" id="introB"><div class="tag">Online on</div><div class="big"><b>Netlify</b></div><div class="bar"></div><div class="small">Where the game lives online</div></div>
    <div class="card cla" id="introC"><div class="tag">Built with</div><div class="big"><b>Claude</b></div><div class="bar"></div><div class="small">Code, maps and soldiers' brains</div></div>
    <div class="skip">Click or press any key to skip</div>`;
  (document.body || document.documentElement).appendChild(el);

  // drifting sparks behind the cards, tinted to the card on screen
  const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
  let tint = [232, 196, 106], W = 0, H = 0, raf = 0, done = false;
  const sparks = [];
  function size() { W = cv.width = innerWidth * Math.min(devicePixelRatio || 1, 2); H = cv.height = innerHeight * Math.min(devicePixelRatio || 1, 2); }
  size(); addEventListener('resize', size);
  for (let i = 0; i < 90; i++) sparks.push({ x: Math.random(), y: Math.random(), v: 0.02 + Math.random() * 0.06, r: 0.5 + Math.random() * 2, a: Math.random() * 6.28 });
  let last = performance.now();
  function draw(now) {
    if (done) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
    g.addColorStop(0, `rgba(${tint[0]},${tint[1]},${tint[2]},0.13)`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const s of sparks) {
      s.y -= s.v * dt; s.a += dt; if (s.y < -0.02) { s.y = 1.02; s.x = Math.random(); }
      const al = 0.25 + 0.35 * Math.sin(s.a);
      ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${al})`;
      ctx.beginPath(); ctx.arc((s.x + Math.sin(s.a * 0.5) * 0.01) * W, s.y * H, s.r * (W / innerWidth), 0, 6.283); ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  const cards = [
    { id: 'introA', tint: [232, 196, 106], ms: 2300, start: c => { const w = c.querySelector('.ccc'); setTimeout(() => w.classList.add('go'), 60); w.querySelectorAll('span').forEach((s, i) => { s.style.transitionDelay = (0.08 + i * 0.11) + 's'; }); } },
    { id: 'introB', tint: [50, 230, 226], ms: 2100 },
    { id: 'introC', tint: [232, 135, 90], ms: 2300 },
  ];
  const timers = [];
  function finish() {
    if (done) return; done = true;
    timers.forEach(clearTimeout); cancelAnimationFrame(raf);
    el.classList.add('out'); setTimeout(() => el.remove(), 800);
    removeEventListener('keydown', finish, true);
  }
  function run() {
    let t = 150;
    cards.forEach(c => {
      timers.push(setTimeout(() => { const n = document.getElementById(c.id); tint = c.tint; n.classList.add('on'); c.start && c.start(n); }, t));
      timers.push(setTimeout(() => { const n = document.getElementById(c.id); n.classList.remove('on'); n.classList.add('off'); }, t + c.ms));
      t += c.ms + 450;
    });
    timers.push(setTimeout(finish, t));
  }
  // the game is still setting up for a moment after the page appears; wait until frames come smoothly
  // so the first card is not skipped (gives up waiting after 5 seconds)
  let calm = 0, prev = performance.now(); const t0 = prev;
  (function wait(now) {
    if (done) return;
    calm = now - prev < 70 ? calm + 1 : 0; prev = now;
    if (calm >= 4 || now - t0 > 5000) run(); else requestAnimationFrame(wait);
  })(prev);
  // for checking the look of each card
  window.__introShow = i => { done = true; timers.forEach(clearTimeout); cards.forEach((c, k) => { const n = document.getElementById(c.id); n.className = 'card ' + (n.classList.contains('net') ? 'net ' : n.classList.contains('cla') ? 'cla ' : '') + (k === i ? 'on' : ''); if (k === i) { tint = c.tint; c.start && c.start(n); } }); done = false; last = performance.now(); draw(last); done = true; };
  el.addEventListener('pointerdown', e => { e.stopPropagation(); finish(); });
  addEventListener('keydown', finish, true);
})();
