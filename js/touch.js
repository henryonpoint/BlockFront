// ===================== touch.js : phone and tablet controls =====================
(function () {
  if (!IS_TOUCH) return;
  document.body.classList.add('touch');
  const ui = $('touchUI');
  const press = (code, key) => dispatchEvent(new KeyboardEvent('keydown', { code, key: key || '' }));
  const release = (code, key) => dispatchEvent(new KeyboardEvent('keyup', { code, key: key || '' }));
  const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, look = { id: null, x: 0, y: 0 };
  const knob = $('tKnob'), base = $('tStick');
  const SENS = 2.2;

  function setMoveKeys() {
    const m = document.body.dataset.mode;
    const dz = 0.28;
    keys.KeyW = stick.y < -dz; keys.KeyS = stick.y > dz; keys.KeyA = stick.x < -dz; keys.KeyD = stick.x > dz;
    if (m === 'foot' || m === 'place') keys.ShiftLeft = Math.hypot(stick.x, stick.y) > 0.92;
  }
  // full screen layer: left side = move stick, right side = look
  setTimeout(() => { const h = $('tHint'); if (h) h.style.display = 'none'; }, 25000);
  ui.addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth * 0.42 && stick.id === null) {
        stick.id = t.identifier; stick.ox = t.clientX; stick.oy = t.clientY; stick.x = stick.y = 0;
        base.style.display = 'block'; base.style.left = (t.clientX - 60) + 'px'; base.style.top = (t.clientY - 60) + 'px';
        knob.style.transform = 'translate(0px,0px)';
      } else if (look.id === null) { look.id = t.identifier; look.x = t.clientX; look.y = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  ui.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === stick.id) {
        let dx = t.clientX - stick.ox, dy = t.clientY - stick.oy; const d = Math.hypot(dx, dy), max = 55;
        if (d > max) { dx = dx / d * max; dy = dy / d * max; }
        stick.x = dx / max; stick.y = dy / max; knob.style.transform = `translate(${dx}px,${dy}px)`;
        setMoveKeys();
      } else if (t.identifier === look.id) {
        if (playing) lookDelta((t.clientX - look.x) * SENS, (t.clientY - look.y) * SENS);
        look.x = t.clientX; look.y = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });
  const endTouch = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === stick.id) { stick.id = null; stick.x = stick.y = 0; base.style.display = 'none'; setMoveKeys(); keys.ShiftLeft = false; }
      if (t.identifier === look.id) look.id = null;
    }
  };
  ui.addEventListener('touchend', endTouch); ui.addEventListener('touchcancel', endTouch);

  // buttons
  function btn(id, down, up, lookToo) {
    const el = $(id); if (!el) return;
    let tid = null, lx = 0, ly = 0;
    el.addEventListener('touchstart', e => {
      e.preventDefault(); e.stopPropagation();
      const t = e.changedTouches[0]; tid = t.identifier; lx = t.clientX; ly = t.clientY;
      el.classList.add('down'); initAudio(); if (down) down();
    }, { passive: false });
    el.addEventListener('touchmove', e => {
      e.preventDefault(); e.stopPropagation();
      if (!lookToo) return;
      for (const t of e.changedTouches) if (t.identifier === tid) { if (playing) lookDelta((t.clientX - lx) * SENS, (t.clientY - ly) * SENS); lx = t.clientX; ly = t.clientY; }
    }, { passive: false });
    const end = e => { e.preventDefault(); e.stopPropagation(); el.classList.remove('down'); tid = null; if (up) up(); };
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
  }
  const mode = () => document.body.dataset.mode;
  btn('tFire', () => {
    if (placing) { confirmPlace(); return; }
    mouse.left = true; mouse.fresh = true;
  }, () => { mouse.left = false; }, true);
  btn('tAim', () => {
    if (placing) { cancelPlace(); return; }
    if (player.vehicle) { mouse.right = true; return; }
    const w = curW();
    if (w.zoom) zoom = !zoom; else ads = !ads;
  }, () => { mouse.right = false; });
  btn('tJump', () => { keys.Space = true; }, () => { keys.Space = false; });
  btn('tReload', () => press('KeyR'), () => release('KeyR'));
  btn('tUse', () => { if (player.vehicle) press('KeyF'); else press('KeyE'); }, () => { release('KeyE'); release('KeyF'); });
  btn('tSwap', () => {
    if (player.gv) { press('KeyF'); return; }
    const owned = WEAPONS.map((w, i) => i).filter(i => player.owned[WEAPONS[i].id]);
    const k = owned.indexOf(switching ? pending : player.cur);
    selectWeapon(owned[(k + 1) % owned.length]);
  });
  btn('tGren', () => press('KeyG'));
  btn('tView', () => {   // change the camera: plane cockpit or outside, helicopter views, ship views
    if (player.ship && typeof shipNextView === 'function') shipNextView();
    else if (player.vehicle) press('KeyV');
    else if (player.gv && player.gv.T.heli && player.seat === 0) press('KeyV');
  });
  setInterval(() => { const b = $('tView'); if (b) b.style.display = player.alive && (player.vehicle || player.ship || (player.gv && player.gv.T.heli && player.seat === 0)) ? 'flex' : 'none'; }, 300);
  btn('tPos', () => { if (typeof b17NextPos === 'function') b17NextPos(); });   // B-17: step to the next crew position
  btn('tHook', () => { if (typeof grappleFire === 'function') grappleFire(); });   // the grappling hook: aim with the look side, tap to fire
  btn('tAir', () => press('KeyT'));
  btn('tShop', () => press('KeyB'));
  btn('tBuild', () => press('KeyV'));
  btn('tMap', () => press('KeyM'));
  btn('tCrouch', () => press('KeyC'));
  btn('tMusic', () => { initAudio(); setMusic(!musicOn); });
  btn('tScore', () => { const sb = $('scoreboard'); showScoreboard(sb.style.display !== 'flex'); });
  btn('tThrUp', () => { keys.ShiftLeft = true; }, () => { keys.ShiftLeft = false; });
  btn('tThrDn', () => { keys.KeyC = true; }, () => { keys.KeyC = false; });
  btn('tBomb', () => { keys.KeyX = true; }, () => { keys.KeyX = false; });
  btn('tRudL', () => { keys.KeyQ = true; }, () => { keys.KeyQ = false; });
  btn('tRudR', () => { keys.KeyE = true; }, () => { keys.KeyE = false; });
  btn('tPause', () => {
    playing = false; mouse.left = mouse.right = false; zoom = ads = false; for (const k in keys) keys[k] = false;
    $('pauseTitle').textContent = 'Paused'; $('pauseText').textContent = net.active ? 'The battle keeps going online! Tap to jump back in.' : 'Tap to jump back in.';
    $('pause').style.display = 'flex';
  });
  $('fullBtn').addEventListener('click', () => { try { const d = document.documentElement; const r = (d.requestFullscreen || d.webkitRequestFullscreen).call(d); if (r && r.catch) r.catch(() => { }); } catch (e) { } });
  btn('tFull', () => { try { const d = document.documentElement; (d.requestFullscreen || d.webkitRequestFullscreen).call(d).catch(() => { }); } catch (e) { } });
  // keep the page from scrolling or zooming
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('touchmove', e => { if (e.target === document.body) e.preventDefault(); }, { passive: false });
})();
