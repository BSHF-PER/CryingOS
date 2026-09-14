/* Camera — iOS Style */
(function () {
  'use strict';

  let stream = null;

  CP.register('camera', {
    async mount(root, cp) {
      let facingMode = 'user';
      let currentFilter = 'normal';
      let flashMode = 'off'; // off | on
      let timerMode = 0; // 0 | 3 | 10
      let ratio = '43'; // 43 | 11 | 169
      let camMode = 'photo'; // photo | square | filters
      let timerCountdown = null;

      // ---------- Filters ----------
      const filters = [
        { id: 'normal', name: 'Normal', css: 'none', canvas: 'none' },
        { id: 'vivid', name: 'Vivid', css: 'saturate(1.5) contrast(1.1)', canvas: 'saturate(1.5) contrast(1.1)' },
        { id: 'mono', name: 'Mono', css: 'grayscale(1) contrast(1.1)', canvas: 'grayscale(1) contrast(1.1)' },
        { id: 'warm', name: 'Warm', css: 'sepia(0.3) saturate(1.3)', canvas: 'sepia(0.3) saturate(1.3)' },
        { id: 'cool', name: 'Cool', css: 'hue-rotate(15deg) saturate(1.2)', canvas: 'hue-rotate(15deg) saturate(1.2)' },
        { id: 'dramatic', name: 'Dramatic', css: 'contrast(1.4) brightness(0.9)', canvas: 'contrast(1.4) brightness(0.9)' },
        { id: 'fade', name: 'Fade', css: 'contrast(0.85) brightness(1.1) saturate(0.8)', canvas: 'contrast(0.85) brightness(1.1) saturate(0.8)' },
      ];

      // ---------- SVG Icons ----------
      const icons = {
        flashOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
        flashOn: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
        timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg>',
        ratio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>',
        flip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>',
        shutter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',
        gallery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        cameraOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 1l22 22"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"/></svg>',
      };

      function svg(name, size = 20) {
        const i = icons[name] || '';
        return i.replace('<svg', `<svg width="${size}" height="${size}"`);
      }

      // ---------- Render ----------
      root.innerHTML = `
        <div class="cam">
          <!-- Top Controls -->
          <div class="cam-top">
            <button class="cam-ctrl" id="camFlash" title="Flash">
              ${svg('flashOff', 20)}
            </button>
            <button class="cam-ctrl" id="camTimer" title="Timer">
              ${svg('timer', 20)}
              <span class="cam-badge" id="camTimerBadge" hidden></span>
            </button>
            <button class="cam-ctrl" id="camRatio" title="Aspect ratio">
              ${svg('ratio', 20)}
              <span class="cam-badge" id="camRatioBadge">4:3</span>
            </button>
          </div>

          <!-- Timer Countdown Overlay -->
          <div class="cam-countdown" id="camCountdown" hidden>
            <span id="camCountNum">3</span>
          </div>

          <!-- Flash Effect -->
          <div class="cam-flashfx" id="camFlashFx"></div>

          <!-- Viewport -->
          <div class="cam-viewport cam-ratio-43" id="camViewport">
            <video class="cam-video" id="camVideo" autoplay playsinline muted></video>
            <div class="cam-noperm" id="camNoperm" hidden>
              <div class="cam-noperm-icon">${svg('cameraOff', 48)}</div>
              <p class="cam-noperm-title">Camera Unavailable</p>
              <p class="cam-noperm-sub">Please allow camera access or use HTTPS</p>
            </div>
          </div>

          <!-- Filter Bar (shown in filters mode) -->
          <div class="cam-filters" id="camFilters" hidden>
            ${filters.map(f => `
              <button class="cam-filter ${f.id === 'normal' ? 'active' : ''}" data-filter="${f.id}">
                <span class="cam-filter-prev" style="filter:${f.css}"></span>
                <span class="cam-filter-name">${f.name}</span>
              </button>
            `).join('')}
          </div>

          <!-- Mode Selector -->
          <div class="cam-modes">
            <button class="cam-mode" data-mode="square">Square</button>
            <button class="cam-mode active" data-mode="photo">Photo</button>
            <button class="cam-mode" data-mode="filters">Filters</button>
          </div>

          <!-- Bottom Controls -->
          <div class="cam-bottom">
            <button class="cam-thumb" id="camGallery" title="Open Photos">
              ${svg('gallery', 20)}
            </button>
            <button class="cam-shutter" id="camShutter" title="Capture">
              <span class="cam-shutter-inner"></span>
            </button>
            <button class="cam-flipbtn" id="camFlip" title="Switch camera">
              ${svg('flip', 22)}
            </button>
          </div>
        </div>`;

      const $ = s => root.querySelector(s);
      const video = $('#camVideo');
      const viewport = $('#camViewport');
      const noperm = $('#camNoperm');
      const filtersBar = $('#camFilters');
      const flashBtn = $('#camFlash');
      const timerBtn = $('#camTimer');
      const timerBadge = $('#camTimerBadge');
      const ratioBtn = $('#camRatio');
      const ratioBadge = $('#camRatioBadge');
      const countdown = $('#camCountdown');
      const countNum = $('#camCountNum');
      const flashFx = $('#camFlashFx');
      const shutter = $('#camShutter');

      // ---------- Camera ----------
      async function startCamera() {
        stopCamera();
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
          });
          video.srcObject = stream;
          noperm.hidden = true;
        } catch (e) {
          noperm.hidden = false;
          stream = null;
        }
      }

      function stopCamera() {
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
          stream = null;
        }
      }

      // ---------- Capture ----------
      async function capture() {
        if (!stream) {
          cp.toast('Camera not available');
          return;
        }

        // Flash effect
        if (flashMode === 'on') {
          flashFx.classList.add('on');
          setTimeout(() => flashFx.classList.remove('on'), 300);
        }

        // Shutter animation
        shutter.classList.add('capturing');
        setTimeout(() => shutter.classList.remove('capturing'), 300);

        // Determine dimensions based on ratio
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        let tw, th;
        
        if (ratio === '11') {
          const s = Math.min(vw, vh);
          tw = th = s;
        } else if (ratio === '169') {
          if (vw / vh > 16 / 9) {
            th = vh;
            tw = vh * 16 / 9;
          } else {
            tw = vw;
            th = vw * 9 / 16;
          }
        } else { // 4:3
          if (vw / vh > 4 / 3) {
            th = vh;
            tw = vh * 4 / 3;
          } else {
            tw = vw;
            th = vw * 3 / 4;
          }
        }

        // Draw to canvas with filter
        const canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext('2d');

        const filter = filters.find(f => f.id === currentFilter);
        if (filter && filter.canvas !== 'none') {
          ctx.filter = filter.canvas;
        }

        const sx = (vw - tw) / 2;
        const sy = (vh - th) / 2;
        ctx.drawImage(video, sx, sy, tw, th, 0, 0, tw, th);

        // Mirror front camera
        if (facingMode === 'user') {
          const temp = document.createElement('canvas');
          temp.width = tw;
          temp.height = th;
          const tctx = temp.getContext('2d');
          tctx.translate(tw, 0);
          tctx.scale(-1, 1);
          tctx.drawImage(canvas, 0, 0);
          ctx.filter = 'none';
          ctx.clearRect(0, 0, tw, th);
          ctx.drawImage(temp, 0, 0);
        }

        // Convert to blob and upload
        canvas.toBlob(async (blob) => {
          if (!blob) {
            cp.toast('Failed to capture');
            return;
          }
          const file = new File([blob], `camera-${Date.now()}.png`, { type: 'image/png' });
          const r = await cp.gallery.upload(file);
          if (r.ok) {
            cp.toast('Saved to Photos');
          } else {
            cp.toast('Failed to save');
          }
        }, 'image/png');
      }

      function captureWithTimer() {
        if (timerMode === 0) {
          capture();
          return;
        }
        let count = timerMode;
        countdown.hidden = false;
        countNum.textContent = count;
        
        timerCountdown = setInterval(() => {
          count--;
          if (count <= 0) {
            clearInterval(timerCountdown);
            countdown.hidden = true;
            capture();
          } else {
            countNum.textContent = count;
            countNum.classList.remove('pop');
            void countNum.offsetWidth;
            countNum.classList.add('pop');
          }
        }, 1000);
      }

      // ---------- Event Listeners ----------
      shutter.addEventListener('click', captureWithTimer);

      $('#camFlip').addEventListener('click', () => {
        facingMode = facingMode === 'user' ? 'environment' : 'user';
        startCamera();
      });

      $('#camGallery').addEventListener('click', () => {
        cp.openApp('gallery');
      });

      // Flash toggle
      flashBtn.addEventListener('click', () => {
        flashMode = flashMode === 'off' ? 'on' : 'off';
        flashBtn.innerHTML = svg(flashMode === 'on' ? 'flashOn' : 'flashOff', 20);
        flashBtn.classList.toggle('active', flashMode === 'on');
        cp.toast(`Flash ${flashMode === 'on' ? 'On' : 'Off'}`);
      });

      // Timer cycle
      timerBtn.addEventListener('click', () => {
        const modes = [0, 3, 10];
        const i = modes.indexOf(timerMode);
        timerMode = modes[(i + 1) % modes.length];
        if (timerMode === 0) {
          timerBadge.hidden = true;
          timerBtn.classList.remove('active');
        } else {
          timerBadge.hidden = false;
          timerBadge.textContent = `${timerMode}s`;
          timerBtn.classList.add('active');
        }
        cp.toast(timerMode === 0 ? 'Timer Off' : `Timer ${timerMode}s`);
      });

      // Ratio cycle
      ratioBtn.addEventListener('click', () => {
        const ratios = ['43', '11', '169'];
        const labels = { '43': '4:3', '11': '1:1', '169': '16:9' };
        const i = ratios.indexOf(ratio);
        ratio = ratios[(i + 1) % ratios.length];
        ratioBadge.textContent = labels[ratio];
        
        viewport.className = `cam-viewport cam-ratio-${ratio}`;
        applyVideoFilter();
        cp.toast(`Aspect Ratio ${labels[ratio]}`);
      });

      // Mode selector
      root.querySelectorAll('.cam-mode').forEach(btn => {
        btn.addEventListener('click', () => {
          camMode = btn.dataset.mode;
          root.querySelectorAll('.cam-mode').forEach(b => b.classList.toggle('active', b === btn));
          
          // Toggle filter bar
          filtersBar.hidden = camMode !== 'filters';
          
          // Square mode forces 1:1
          if (camMode === 'square') {
            ratio = '11';
            ratioBadge.textContent = '1:1';
          } else if (camMode === 'photo') {
            ratio = '43';
            ratioBadge.textContent = '4:3';
          }
          viewport.className = `cam-viewport cam-ratio-${ratio}`;
          applyVideoFilter();
        });
      });

      // Filter selection
      root.querySelectorAll('.cam-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          currentFilter = btn.dataset.filter;
          root.querySelectorAll('.cam-filter').forEach(b => b.classList.toggle('active', b === btn));
          applyVideoFilter();
        });
      });

      function applyVideoFilter() {
        const filter = filters.find(f => f.id === currentFilter);
        if (filter && filter.css !== 'none') {
          video.style.filter = filter.css;
        } else {
          video.style.filter = 'none';
        }
        // Mirror front camera
        video.style.transform = facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
      }

      // Cleanup on unmount
      this._cleanup = () => {
        stopCamera();
        if (timerCountdown) clearInterval(timerCountdown);
      };

      // Start
      startCamera();
    },

    unmount(root, cp) {
      if (this._cleanup) this._cleanup();
    }
  });
})();