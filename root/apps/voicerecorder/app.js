/* Voice Memos — iOS Style */
(function () {
  'use strict';

  let mediaRecorder = null;
  let audioContext = null;
  let analyser = null;
  let animFrame = null;
  let currentAudio = null;

  CP.register('voicerecorder', {
    async mount(root, cp) {
      let recordings = [];
      let isRecording = false;
      let recordStart = 0;
      let timerInterval = null;
      let playingId = null;

      const icons = {
        mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>',
        stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
        play: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
        pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        waveform: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h2M6 6v12M10 3v18M14 8v8M18 6v12M22 12h-2"/></svg>',
        empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      };

      function svg(name, size = 20) {
        const i = icons[name] || '';
        return i.replace('<svg', `<svg width="${size}" height="${size}"`);
      }

      function esc(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
      }

      function fmtTime(ms) {
        const sec = Math.floor(ms / 1000);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }

      function fmtDate(ts) {
        return new Date(ts).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      }

      root.innerHTML = `
        <div class="vm">
          <header class="vm-head">
            <h1 class="vm-title">Voice Memos</h1>
            <span class="vm-count" id="vmCount">0 recordings</span>
          </header>

          <main class="vm-list" id="vmList"></main>

          <div class="vm-empty" id="vmEmpty" hidden>
            ${svg('empty', 64)}
            <h2>No recordings yet</h2>
            <p>Tap the red button to start recording</p>
          </div>

          <!-- Recorder Panel -->
          <div class="vm-recorder" id="vmRecorder" hidden>
            <div class="vm-rec-timer" id="vmRecTimer">00:00</div>
            <canvas class="vm-rec-wave" id="vmRecWave" width="300" height="80"></canvas>
            <div class="vm-rec-actions">
              <button class="vm-rec-cancel" id="vmRecCancel">Cancel</button>
              <button class="vm-rec-stop" id="vmRecStop">
                ${svg('stop', 24)}
              </button>
              <button class="vm-rec-save" id="vmRecSave">Done</button>
            </div>
          </div>

          <!-- Record Button -->
          <button class="vm-fab" id="vmFab" title="Start recording">
            <span class="vm-fab-inner">${svg('mic', 28)}</span>
          </button>
        </div>`;

      const $ = s => root.querySelector(s);
      const listEl = $('#vmList');
      const emptyEl = $('#vmEmpty');
      const countEl = $('#vmCount');
      const recorderEl = $('#vmRecorder');
      const timerEl = $('#vmRecTimer');
      const waveCanvas = $('#vmRecWave');
      const fab = $('#vmFab');
      const waveCtx = waveCanvas.getContext('2d');

      async function loadRecordings() {
        const d = await cp.api.get(CP_BOOT.api.voice);
        recordings = d.items || [];
        render();
      }

      function render() {
        countEl.textContent = `${recordings.length} recording${recordings.length !== 1 ? 's' : ''}`;
        
        if (recordings.length === 0) {
          listEl.innerHTML = '';
          emptyEl.hidden = false;
          return;
        }
        emptyEl.hidden = true;

        listEl.innerHTML = recordings.map(rec => `
          <div class="vm-item ${playingId === rec.id ? 'playing' : ''}" data-id="${rec.id}">
            <button class="vm-item-play" data-play="${rec.id}">
              ${playingId === rec.id ? svg('pause', 18) : svg('play', 18)}
            </button>
            <div class="vm-item-info">
              <div class="vm-item-title">${esc(rec.title)}</div>
              <div class="vm-item-meta">
                <span>${fmtDate(rec.created_at)}</span>
                <span>•</span>
                <span>${fmtTime(rec.duration_ms)}</span>
              </div>
            </div>
            <button class="vm-item-edit" data-edit="${rec.id}" title="Rename">
              ${svg('edit', 16)}
            </button>
            <button class="vm-item-del" data-del="${rec.id}" title="Delete">
              ${svg('trash', 16)}
            </button>
          </div>
        `).join('');

        listEl.querySelectorAll('[data-play]').forEach(b => {
          b.addEventListener('click', e => {
            e.stopPropagation();
            togglePlay(parseInt(b.dataset.play));
          });
        });

        listEl.querySelectorAll('[data-del]').forEach(b => {
          b.addEventListener('click', e => {
            e.stopPropagation();
            deleteRecording(parseInt(b.dataset.del));
          });
        });

        listEl.querySelectorAll('[data-edit]').forEach(b => {
          b.addEventListener('click', e => {
            e.stopPropagation();
            renameRecording(parseInt(b.dataset.edit));
          });
        });

        listEl.querySelectorAll('.vm-item').forEach(el => {
          el.addEventListener('click', () => togglePlay(parseInt(el.dataset.id)));
        });
      }

      async function togglePlay(id) {
        const rec = recordings.find(r => r.id === id);
        if (!rec) return;

        if (playingId === id && currentAudio) {
          currentAudio.pause();
          currentAudio = null;
          playingId = null;
          render();
          return;
        }

        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }

        currentAudio = new Audio(rec.url);
        playingId = id;
        render();

        currentAudio.addEventListener('ended', () => {
          playingId = null;
          currentAudio = null;
          render();
        });

        currentAudio.addEventListener('error', () => {
          cp.toast('Failed to play audio');
          playingId = null;
          currentAudio = null;
          render();
        });

        try {
          await currentAudio.play();
        } catch (e) {
          cp.toast('Playback failed');
          playingId = null;
          currentAudio = null;
          render();
        }
      }

      async function deleteRecording(id) {
        if (!confirm('Delete this recording?')) return;
        const r = await cp.api.post(CP_BOOT.api.voice, { action: 'delete', id });
        if (r.ok) {
          if (playingId === id && currentAudio) {
            currentAudio.pause();
            currentAudio = null;
            playingId = null;
          }
          cp.toast('Recording deleted');
          await loadRecordings();
        } else {
          cp.toast(r.error || 'Failed to delete');
        }
      }

      async function renameRecording(id) {
        const rec = recordings.find(r => r.id === id);
        if (!rec) return;
        const newTitle = prompt('Rename recording:', rec.title);
        if (newTitle === null) return;
        const r = await cp.api.post(CP_BOOT.api.voice, { action: 'rename', id, title: newTitle });
        if (r.ok) {
          cp.toast('Renamed');
          await loadRecordings();
        } else {
          cp.toast(r.error || 'Failed');
        }
      }

      /* ---------- Recording ---------- */
      async function startRecording() {
        if (isRecording) return;

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          // Setup audio context for visualization
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioContext.createMediaStreamSource(stream);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 128;
          source.connect(analyser);

          // Determine supported format
          let mimeType = 'audio/webm;codecs=opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = '';
            }
          }

          mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
          const chunks = [];

          mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          mediaRecorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            if (animFrame) cancelAnimationFrame(animFrame);
            if (audioContext) { audioContext.close(); audioContext = null; }
            
            if (chunks.length === 0) {
              hideRecorder();
              return;
            }

            const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
            const duration = Date.now() - recordStart;

            // Upload
            cp.toast('Saving recording...');
            const fd = new FormData();
            fd.append('audio', blob, `rec-${Date.now()}.webm`);
            fd.append('duration', String(duration));
            fd.append('title', `Recording ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);

            const r = await (await fetch(CP_BOOT.api.voice, { method: 'POST', body: fd })).json();
            if (r.ok) {
              cp.toast('Recording saved');
              await loadRecordings();
            } else {
              cp.toast(r.error || 'Failed to save');
            }

            hideRecorder();
          };

          mediaRecorder.start(100);
          isRecording = true;
          recordStart = Date.now();

          // Start timer
          timerEl.textContent = '00:00';
          timerInterval = setInterval(() => {
            timerEl.textContent = fmtTime(Date.now() - recordStart);
          }, 100);

          // Start waveform visualization
          drawWaveform();

          showRecorder();
          fab.classList.add('recording');

        } catch (e) {
          cp.toast('Microphone access denied');
        }
      }

      function stopRecording() {
        if (!isRecording || !mediaRecorder) return;
        isRecording = false;
        clearInterval(timerInterval);
        fab.classList.remove('recording');
        mediaRecorder.stop();
      }

      function cancelRecording() {
        if (!isRecording || !mediaRecorder) return;
        isRecording = false;
        clearInterval(timerInterval);
        fab.classList.remove('recording');
        
        // Override onstop to not save
        mediaRecorder.onstop = () => {
          if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(t => t.stop());
          }
          if (animFrame) cancelAnimationFrame(animFrame);
          if (audioContext) { audioContext.close(); audioContext = null; }
          hideRecorder();
        };
        mediaRecorder.stop();
      }

      function showRecorder() {
        recorderEl.hidden = false;
        listEl.style.visibility = 'hidden';
        emptyEl.style.visibility = 'hidden';
        fab.style.display = 'none';
      }

      function hideRecorder() {
        recorderEl.hidden = true;
        listEl.style.visibility = '';
        emptyEl.style.visibility = '';
        fab.style.display = '';
        // Clear canvas
        waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
      }

      function drawWaveform() {
        if (!analyser) return;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        function draw() {
          animFrame = requestAnimationFrame(draw);
          analyser.getByteFrequencyData(dataArray);

          const w = waveCanvas.width;
          const h = waveCanvas.height;
          waveCtx.clearRect(0, 0, w, h);

          const barCount = 40;
          const barWidth = w / barCount;
          const gap = 2;

          for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor(i * bufferLength / barCount);
            const value = dataArray[dataIndex];
            const barHeight = (value / 255) * h * 0.9;

            // Gradient color from red to orange
            const hue = 0 + (i / barCount) * 20;
            waveCtx.fillStyle = `hsl(${hue}, 90%, 55%)`;
            
            const x = i * barWidth;
            const y = (h - barHeight) / 2;
            waveCtx.fillRect(x + gap/2, y, barWidth - gap, barHeight);
          }
        }

        draw();
      }

      /* ---------- Events ---------- */
      fab.addEventListener('click', () => {
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      });

      $('#vmRecStop').addEventListener('click', stopRecording);
      $('#vmRecCancel').addEventListener('click', cancelRecording);
      $('#vmRecSave').addEventListener('click', stopRecording);

      // Cleanup on unmount
      this._cleanup = () => {
        if (isRecording && mediaRecorder) {
          try { mediaRecorder.stop(); } catch(e){}
        }
        if (currentAudio) {
          currentAudio.pause();
          currentAudio = null;
        }
        if (animFrame) cancelAnimationFrame(animFrame);
        if (audioContext) {
          try { audioContext.close(); } catch(e){}
        }
        clearInterval(timerInterval);
      };

      await loadRecordings();
    },

    unmount(root, cp) {
      if (this._cleanup) this._cleanup();
    }
  });
})();
