/* Crying OS — Main UI with dynamic wallpaper */
(function () {
  'use strict';

  const boot = window.CP_BOOT;
  const $ = (s, r = document) => r.querySelector(s);
  const grid = $('#grid');
  const winLayer = $('#winLayer');
  const toasts = $('#toasts');
  const home = $('#home');
  const wallpaperEl = $('#wallpaper');

  winLayer.style.display = 'none';
  winLayer.style.pointerEvents = 'none';

  // ---------- Wallpaper Presets ----------
  const WALLPRESETS = {
    midnight: 'linear-gradient(180deg, #0b1430 0%, #1a2a52 40%, #b06a3f 85%, #f0a35e 100%)',
    ocean:    'linear-gradient(180deg, #2E3192 0%, #1BFFFF 100%)',
    sunset:   'linear-gradient(180deg, #FF512F 0%, #DD2476 100%)',
    forest:   'linear-gradient(180deg, #134E5E 0%, #71B280 100%)',
    aurora:   'linear-gradient(135deg, #7F00FF 0%, #E100FF 100%)',
    dawn:     'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    cherry:   'linear-gradient(180deg, #EB3349 0%, #F45C43 100%)',
    royal:    'linear-gradient(180deg, #141E30 0%, #243B55 100%)',
    graphite: 'linear-gradient(180deg, #232526 0%, #414345 100%)',
  };

  function applyWallpaper() {
    const wp = boot.wallpaper || { type: 'preset', value: 'midnight' };
    if (wp.type === 'upload' && wp.url) {
      wallpaperEl.style.backgroundImage = `url(${wp.url})`;
      wallpaperEl.style.backgroundSize = 'cover';
      wallpaperEl.style.backgroundPosition = 'center';
      wallpaperEl.classList.add('wallpaper-img');
    } else {
      wallpaperEl.style.background = WALLPRESETS[wp.value] || WALLPRESETS.midnight;
      wallpaperEl.classList.remove('wallpaper-img');
    }
  }

  applyWallpaper();

  window.addEventListener('cp:wallpaper', e => {
    boot.wallpaper = e.detail;
    applyWallpaper();
  });

  const state = {
    apps: new Map(),
    editing: false,
    openSlug: null,
    modules: {},
    loaded: {},
    appHistory: [],
    passwordSet: boot.phone.lock_enabled,
  };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
    
  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  
  function toast(msg, ms = 2600) {
    const t = el('div', 'toast', msg);
    toasts.append(t);
    requestAnimationFrame(() => t.classList.add('on'));
    setTimeout(() => {
      t.classList.remove('on');
      setTimeout(() => t.remove(), 300);
    }, ms);
  }

  const api = {
    async get(url) {
      const r = await fetch(url);
      return r.json();
    },
    async post(url, data) {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return r.json();
    },
    async upload(file) {
      const fd = new FormData();
      fd.append('images[]', file, file.name || 'photo.png');
      const r = await fetch(boot.api.gallery, { method: 'POST', body: fd });
      return r.json();
    }
  };

  const bus = new EventTarget();
  const on = (n, f) => bus.addEventListener(n, f);
  const emit = (n, d) => bus.dispatchEvent(new CustomEvent(n, { detail: d }));

  window.CP = {
    phone: boot.phone,
    api, toast, on, emit,
    register(slug, mod) { state.modules[slug] = mod; },
    openApp, closeApp,
    goHome, goBack,
    setWallpaper(type, value, url) {
      boot.wallpaper = { type, value, url };
      applyWallpaper();
      window.dispatchEvent(new CustomEvent('cp:wallpaper', { detail: boot.wallpaper }));
    },
    gallery: { upload: api.upload, url: id => `${boot.api.gallery}?image=${id}` },
  };

  /* ---------- Clock ---------- */
  function tick() {
    const now = new Date();
    const t = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    $('#sbClock') && ($('#sbClock').textContent = t);
    $('#lockClock') && ($('#lockClock').textContent = t);
    $('#lockDate') && ($('#lockDate').textContent = now.toLocaleDateString('en-US', { 
      weekday: 'long', month: 'long', day: 'numeric' 
    }));
  }
  setInterval(tick, 1000);
  tick();

  /* ---------- Lock Screen ---------- */
  const lock = $('#lock'), lockPin = $('#lockPin'), lockHint = $('#lockHint');
  const pinInput = $('#pinInput'), pinKeys = $('#pinKeys');
  const pinError = $('#pinError');
  const pinDots = [...document.querySelectorAll('.pin-dot')];

  function setupLockScreen() {
    if (state.passwordSet) {
      lock.classList.add('locked-cursor');
      lockHint.hidden = true;
      lockPin.hidden = false;
      setTimeout(() => pinInput.focus(), 100);
    } else {
      lock.classList.remove('locked-cursor');
      lockHint.hidden = false;
      lockPin.hidden = true;
    }
  }
  setupLockScreen();

  function updateDots() {
    const val = pinInput.value;
    pinDots.forEach((d, i) => {
      d.classList.toggle('filled', i < val.length);
      d.classList.remove('error');
    });
    pinError.hidden = true;
  }

  pinInput.addEventListener('input', () => {
    updateDots();
    if (pinInput.value.length >= 4) setTimeout(tryUnlock, 120);
  });

  pinKeys.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    const k = b.dataset.k;
    if (k === 'C') {
      pinInput.value = '';
      updateDots();
    } else if (k === 'OK') {
      tryUnlock();
    } else {
      if (pinInput.value.length < 16) {
        pinInput.value += k;
        updateDots();
        if (pinInput.value.length >= 4) setTimeout(tryUnlock, 120);
      }
    }
  });

  async function tryUnlock() {
    const val = pinInput.value;
    if (val.length < 4) return;
    const r = await api.post(boot.api.settings, { action: 'check_password', password: val });
    if (r.ok) {
      unlock();
    } else {
      pinError.hidden = false;
      pinError.classList.remove('show');
      void pinError.offsetWidth;
      pinError.classList.add('show');
      pinDots.forEach(d => { d.classList.add('error'); d.classList.remove('filled'); });
      setTimeout(() => {
        pinInput.value = '';
        updateDots();
        pinInput.focus();
      }, 600);
    }
  }

  function unlock() {
    lock.classList.add('gone');
    setTimeout(() => lock.style.display = 'none', 650);
  }

  function lockPhone() {
    lock.style.display = '';
    lock.classList.remove('gone');
    pinInput.value = '';
    updateDots();
    setupLockScreen();
    closeApp();
    state.appHistory = [];
    setTimeout(() => pinInput.focus(), 100);
  }

  if (!state.passwordSet) {
    lock.addEventListener('click', unlock);
  }

  /* ---------- Navigation Bar ---------- */
  $('#navHome').addEventListener('click', goHome);
  $('#navBack').addEventListener('click', goBack);
  $('#navLock').addEventListener('click', lockPhone);

  function goHome() {
    if (state.openSlug) {
      closeApp();
    }
  }

  function goBack() {
    if (!state.openSlug) return;
    if (state.appHistory.length > 1) {
      state.appHistory.pop();
      const prev = state.appHistory[state.appHistory.length - 1];
      const win = winLayer.querySelector('.window');
      if (win) {
        const mod = state.modules[win.dataset.slug];
        try { mod && mod.unmount && mod.unmount(win.querySelector('.winbody'), window.CP); } catch(e){}
        win.remove();
      }
      winLayer.style.display = 'none';
      winLayer.style.pointerEvents = 'none';
      state.openSlug = null;
      openAppInternal(prev);
      updateMiniPlayerVisibility();
    } else {
      closeApp();
    }
  }

  /* ---------- App Icons ---------- */
  function makeIcon(app) {
    const b = el('button', 'icon');
    b.dataset.slug = app.slug;
    b.type = 'button';
    
    const tile = el('span', 'tile');
    
    if (app.iconType === 'image' && app.iconSrc) {
      const img = el('img');
      img.src = app.iconSrc;
      img.alt = app.name;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit;';
      tile.appendChild(img);
    } else {
      tile.textContent = app.icon;
      tile.style.setProperty('--tile', app.color);
    }
    
    const lbl = el('span', 'lbl');
    lbl.textContent = app.name;
    const xbadge = el('span', 'xbadge', '×');
    b.append(tile, lbl, xbadge);

    let timer = null;
    b.addEventListener('pointerdown', () => {
      timer = setTimeout(enterEdit, 550);
    });
    ['pointerup','pointerleave','pointercancel'].forEach(ev =>
      b.addEventListener(ev, () => clearTimeout(timer)));
    b.addEventListener('contextmenu', e => { e.preventDefault(); enterEdit(); });

    b.addEventListener('click', e => {
      e.stopPropagation();
      if (e.target.closest('.xbadge')) { removeApp(app); return; }
      if (state.editing) { exitEdit(); return; }
      openApp(app.slug);
    });
    return b;
  }

  function renderIcons() {
    grid.innerHTML = '';
    [...state.apps.values()].forEach(a => grid.append(makeIcon(a)));
  }

  function enterEdit() { if (!state.editing) { state.editing = true; home.classList.add('editing'); } }
  function exitEdit() { if (state.editing) { state.editing = false; home.classList.remove('editing'); } }
  home.addEventListener('click', e => { if (!e.target.closest('.icon') && state.editing) exitEdit(); });

  async function removeApp(app) {
    if (!app.removable) { toast('This app cannot be removed'); return; }
    const r = await api.post(boot.api.apps, { action: 'remove', slug: app.slug });
    if (!r.ok) { toast(r.error || 'Error'); return; }
    state.apps.delete(app.slug);
    renderIcons();
    exitEdit();
    toast(`${app.name} removed`);
    emit('app:removed', app.slug);
  }

  on('app:installed', e => {
    const app = e.detail;
    if (app && !state.apps.has(app.slug)) {
      state.apps.set(app.slug, app);
      renderIcons();
    }
  });
  on('app:removed', e => {
    if (state.apps.has(e.detail)) {
      state.apps.delete(e.detail);
      renderIcons();
    }
  });

  /* ---------- Module Loader ---------- */
  async function loadModule(app) {
    if (state.loaded[app.slug]) return state.loaded[app.slug];
    (app.styles || []).forEach(href => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const l = el('link');
      l.rel = 'stylesheet';
      l.href = href;
      document.head.append(l);
    });
    await new Promise((res, rej) => {
      const s = el('script');
      s.src = app.entry;
      s.onload = res;
      s.onerror = () => rej(new Error('script load failed: ' + app.entry));
      document.head.append(s);
    });
    const mod = state.modules[app.slug];
    if (!mod) throw new Error('module not registered: ' + app.slug);
    state.loaded[app.slug] = mod;
    return mod;
  }

  /* ---------- App Window ---------- */
  async function openApp(slug) {
    if (state.openSlug && state.openSlug !== slug) {
      state.appHistory.push(state.openSlug);
    }
    openAppInternal(slug);
  }

  async function openAppInternal(slug) {
    const app = state.apps.get(slug);
    if (!app) { toast('App not installed'); return; }

    const win = el('div', 'window');
    win.dataset.slug = slug;

    const bar = el('header', 'winbar');
    bar.style.setProperty('--app', app.color);
    
    let iconHtml = '';
    if (app.iconType === 'image' && app.iconSrc) {
      iconHtml = `<img src="${app.iconSrc}" alt="" style="width:20px;height:20px;border-radius:5px;object-fit:cover">`;
    } else {
      iconHtml = `<span>${app.icon}</span>`;
    }
    bar.innerHTML = `
      <span class="wintitle">${iconHtml}<span>${esc(app.name)}</span></span>
      <button class="winclose" title="Close">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;

    bar.querySelector('.winclose').addEventListener('click', e => {
      e.stopPropagation();
      closeApp();
    });

    const body = el('div', 'winbody');
    win.append(bar, body);

    winLayer.innerHTML = '';
    winLayer.append(win);
    winLayer.style.display = 'flex';
    winLayer.style.pointerEvents = 'auto';
    state.openSlug = slug;

    // ✨ آپدیت نوار شناور
    updateMiniPlayerVisibility();

    try {
      const mod = await loadModule(app);
      await mod.mount(body, window.CP);
    } catch (err) {
      body.innerHTML = `<div class="app-error">Failed to launch app</div>`;
    }
  }

  function closeApp() {
    const win = winLayer.querySelector('.window');
    if (!win) return;
    const mod = state.modules[win.dataset.slug];
    try { mod && mod.unmount && mod.unmount(win.querySelector('.winbody'), window.CP); } catch(e){}
    win.remove();
    winLayer.style.display = 'none';
    winLayer.style.pointerEvents = 'none';
    state.openSlug = null;
    state.appHistory = [];
    
    // ✨ آپدیت نوار شناور
    updateMiniPlayerVisibility();
  }

  /* ---------- Keyboard shortcuts ---------- */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (state.openSlug) closeApp();
    }
  });

  /* ---------- UUID click to copy ---------- */
  $('#hiUuid').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(boot.phone.uuid);
      toast('UUID copied');
    } catch(e) {}
  });

  /* ---------- Music Service (Background Playback) ---------- */
  window.CP.music = (function() {
    var audio = new Audio();
    var service = {
      audio: audio,
      track: null,
      queue: [],
      queueIndex: -1,
      mode: 'normal',
      isPlaying: false,
      listeners: [],
      
      subscribe: function(fn) {
        service.listeners.push(fn);
        return function() {
          service.listeners = service.listeners.filter(function(l) { return l !== fn; });
        };
      },
      
      notify: function() {
        var state = service.getState();
        for (var i = 0; i < service.listeners.length; i++) {
          service.listeners[i](state);
        }
      },
      
      getState: function() {
        return {
          track: service.track,
          isPlaying: service.isPlaying,
          queue: service.queue,
          queueIndex: service.queueIndex,
          mode: service.mode
        };
      },
      
      setQueue: function(tracks, startIndex) {
        service.queue = tracks || [];
        service.queueIndex = startIndex || 0;
        if (service.queue.length > 0) {
          service.play(service.queue[service.queueIndex]);
        }
      },
      
      play: function(track) {
        service.track = track;
        audio.src = boot.api.music + '?audio=' + track.id;
        audio.play().then(function() {
          service.isPlaying = true;
          service.notify();
        }).catch(function(e) {
          console.error('Music play error:', e);
        });
        service.notify();
      },
      
      pause: function() {
        audio.pause();
        service.isPlaying = false;
        service.notify();
      },
      
      toggle: function() {
        if (!service.track) return;
        if (service.isPlaying) {
          service.pause();
        } else {
          audio.play();
          service.isPlaying = true;
          service.notify();
        }
      },
      
      next: function() {
        if (service.queue.length === 0) return;
        var nextIndex;
        if (service.mode === 'shuffle') {
          nextIndex = Math.floor(Math.random() * service.queue.length);
          if (nextIndex === service.queueIndex && service.queue.length > 1) {
            nextIndex = (nextIndex + 1) % service.queue.length;
          }
        } else {
          nextIndex = service.queueIndex + 1;
          if (nextIndex >= service.queue.length) {
            if (service.mode === 'repeat_all') nextIndex = 0;
            else { service.pause(); return; }
          }
        }
        service.queueIndex = nextIndex;
        service.play(service.queue[nextIndex]);
      },
      
      prev: function() {
        if (service.queue.length === 0) return;
        if (audio.currentTime > 3) {
          audio.currentTime = 0;
          return;
        }
        var prevIndex = service.queueIndex - 1;
        if (prevIndex < 0) {
          if (service.mode === 'repeat_all') prevIndex = service.queue.length - 1;
          else { audio.currentTime = 0; return; }
        }
        service.queueIndex = prevIndex;
        service.play(service.queue[prevIndex]);
      },
      
      setMode: function(mode) {
        service.mode = mode;
        service.notify();
      },
      
      cycleMode: function() {
        var modes = ['normal', 'shuffle', 'repeat_all', 'repeat_one'];
        var idx = modes.indexOf(service.mode);
        service.mode = modes[(idx + 1) % modes.length];
        service.notify();
        return service.mode;
      },
      
      stop: function() {
        audio.pause();
        audio.src = '';
        service.track = null;
        service.isPlaying = false;
        service.queue = [];
        service.queueIndex = -1;
        service.notify();
      }
    };
    
    audio.addEventListener('ended', function() {
      if (service.mode === 'repeat_one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        service.next();
      }
    });
    
    audio.addEventListener('timeupdate', function() {
      if (service.progressListeners) {
        for (var i = 0; i < service.progressListeners.length; i++) {
          service.progressListeners[i](audio.currentTime, audio.duration);
        }
      }
    });
    
    service.progressListeners = [];
    service.onProgress = function(fn) {
      service.progressListeners.push(fn);
    };
    
    return service;
  })();

  /* ---------- Music Mini Player (Background) ---------- */
  var miniPlayer = null;
  var miniTitle = null;
  var miniArtist = null;
  var miniCover = null;
  var miniPlayBtn = null;
  
  function updateMiniPlayerVisibility() {
    if (!miniPlayer) return;
    var musicAppOpen = (state.openSlug === 'music');
    var isMusicPlaying = window.CP.music.isPlaying;
    var hasTrack = !!window.CP.music.track;
    
    // فقط وقتی پخش فعاله و اپ موزیک بسته‌ست، نوار نمایش داده بشه
    if (isMusicPlaying && hasTrack && !musicAppOpen) {
      miniPlayer.hidden = false;
    } else {
      miniPlayer.hidden = true;
    }
  }
  
  function buildMiniPlayer() {
    var playSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>';
    var pauseSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
    var nextSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><rect x="16" y="4" width="3" height="16"/></svg>';
    var musicSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
    
    miniPlayer = document.createElement('div');
    miniPlayer.className = 'music-miniplayer';
    miniPlayer.hidden = true;
    miniPlayer.innerHTML = 
      '<div class="music-mini-progress"><div class="music-mini-progress-fill" id="musicMiniProgress"></div></div>' +
      '<div class="music-mini-content">' +
      '  <div class="music-mini-icon" id="musicMiniCover">' + musicSvg + '</div>' +
      '  <div class="music-mini-info">' +
      '    <div class="music-mini-title" id="musicMiniTitle">Not Playing</div>' +
      '    <div class="music-mini-artist" id="musicMiniArtist">Select a song</div>' +
      '  </div>' +
      '  <div class="music-mini-controls">' +
      '    <button class="music-mini-btn" id="musicMiniPlay">' + playSvg + '</button>' +
      '    <button class="music-mini-btn" id="musicMiniNext">' + nextSvg + '</button>' +
      '  </div>' +
      '</div>';
    
    document.body.appendChild(miniPlayer);
    
    miniTitle = miniPlayer.querySelector('#musicMiniTitle');
    miniArtist = miniPlayer.querySelector('#musicMiniArtist');
    miniCover = miniPlayer.querySelector('#musicMiniCover');
    miniPlayBtn = miniPlayer.querySelector('#musicMiniPlay');
    var miniNextBtn = miniPlayer.querySelector('#musicMiniNext');
    var miniProgress = miniPlayer.querySelector('#musicMiniProgress');
    
    miniPlayer.addEventListener('click', function(e) {
      if (e.target.closest('.music-mini-btn')) return;
      if (state.apps.has('music')) {
        openApp('music');
      }
    });
    
    miniPlayBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      window.CP.music.toggle();
    });
    
    miniNextBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      window.CP.music.next();
    });
    
    window.CP.music.subscribe(function(s) {
      if (s.track) {
        miniTitle.textContent = s.track.title;
        miniArtist.textContent = s.track.artist || 'Unknown Artist';
        miniPlayBtn.innerHTML = s.isPlaying ? pauseSvg : playSvg;
        
        if (s.track.cover_filename) {
          miniCover.innerHTML = '<img src="' + boot.api.music + '?cover=' + s.track.id + '" alt="" class="music-mini-cover-img">';
        } else {
          miniCover.innerHTML = musicSvg;
        }
      }
      
      updateMiniPlayerVisibility();
    });
    
    window.CP.music.onProgress(function(current, duration) {
      if (duration && miniProgress) {
        miniProgress.style.width = ((current / duration) * 100) + '%';
      }
    });
  }

  /* ---------- Init ---------- */
  boot.apps.forEach(a => state.apps.set(a.slug, a));
  renderIcons();
  buildMiniPlayer();
})();
