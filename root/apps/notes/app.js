/* Notes — iOS Style with Text Editor and Drawing */
(function () {
  'use strict';

  CP.register('notes', {
    async mount(root, cp) {
      let notes = [];
      let currentNote = null;
      let currentView = 'list'; // list | edit
      let searchQuery = '';

      const icons = {
        back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2 7h5l-4 4.5 1.5 7L12 17l-4.5 3.5L9 13.5 5 9h5z"/></svg>',
        pinFill: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 7h5l-4 4.5 1.5 7L12 17l-4.5 3.5L9 13.5 5 9h5z"/></svg>',
        pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
        pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
        marker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
        eraser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20H7L3 16c-.6-.6-.6-1.5 0-2.1L14.9 2c.6-.6 1.5-.6 2.1 0L22 7c.6.6.6 1.5 0 2.1L13 18"/><line x1="6" y1="11" x2="13" y2="18"/></svg>',
        undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
        redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
        save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
        text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
        draw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
        empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
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

      function fmtDate(ts) {
        return new Date(ts).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        });
      }

      root.innerHTML = `
        <div class="nt">
          <!-- List View -->
          <div class="nt-listview" id="ntListView">
            <header class="nt-head">
              <div class="nt-head-row">
                <h1 class="nt-title">Notes</h1>
                <button class="nt-newbtn" id="ntNewBtn">${svg('plus', 20)}</button>
              </div>
              <div class="nt-search">
                <span class="nt-search-icon">${svg('search', 18)}</span>
                <input class="nt-search-input" id="ntSearch" placeholder="Search notes">
              </div>
            </header>
            <div class="nt-grid" id="ntGrid"></div>
            <div class="nt-empty" id="ntEmpty" hidden>
              ${svg('empty', 64)}
              <h2>No notes yet</h2>
              <p>Tap + to create your first note</p>
            </div>
          </div>

          <!-- Edit View -->
          <div class="nt-editview" id="ntEditView" hidden>
            <header class="nt-edit-head">
              <button class="nt-back" id="ntBack">${svg('back', 20)}</button>
              <div class="nt-edit-actions">
                <button class="nt-iconbtn" id="ntPin" title="Pin">${svg('pin', 20)}</button>
                <button class="nt-iconbtn" id="ntDel" title="Delete">${svg('trash', 20)}</button>
              </div>
            </header>
            <div class="nt-edit-body">
              <input class="nt-title-input" id="ntTitleInput" placeholder="Title">
              <div class="nt-type-toggle">
                <button class="nt-type-btn active" data-type="text">${svg('text', 16)} Text</button>
                <button class="nt-type-btn" data-type="drawing">${svg('draw', 16)} Draw</button>
              </div>
              <textarea class="nt-text-input" id="ntTextInput" placeholder="Start writing..."></textarea>
              <div class="nt-canvas-wrap" id="ntCanvasWrap" hidden>
                <div class="nt-tools">
                  <button class="nt-tool active" data-tool="pen" title="Pen">${svg('pen', 18)}</button>
                  <button class="nt-tool" data-tool="pencil" title="Pencil">${svg('pencil', 18)}</button>
                  <button class="nt-tool" data-tool="marker" title="Marker">${svg('marker', 18)}</button>
                  <button class="nt-tool" data-tool="eraser" title="Eraser">${svg('eraser', 18)}</button>
                  <div class="nt-tools-divider"></div>
                  <button class="nt-tool" id="ntUndo" title="Undo">${svg('undo', 18)}</button>
                  <button class="nt-tool" id="ntRedo" title="Redo">${svg('redo', 18)}</button>
                  <button class="nt-tool" id="ntClear" title="Clear">${svg('trash', 18)}</button>
                </div>
                <div class="nt-options">
                  <div class="nt-colors">
                    <button class="nt-color active" data-color="#000000" style="background:#000"></button>
                    <button class="nt-color" data-color="#FF3B30" style="background:#FF3B30"></button>
                    <button class="nt-color" data-color="#FF9500" style="background:#FF9500"></button>
                    <button class="nt-color" data-color="#FFD60A" style="background:#FFD60A"></button>
                    <button class="nt-color" data-color="#34C759" style="background:#34C759"></button>
                    <button class="nt-color" data-color="#007AFF" style="background:#007AFF"></button>
                    <button class="nt-color" data-color="#AF52DE" style="background:#AF52DE"></button>
                    <input type="color" id="ntCustomColor" class="nt-custom-color" value="#000000">
                  </div>
                  <div class="nt-sizes">
                    <button class="nt-size" data-size="2" title="Thin"><span class="nt-size-dot" style="width:6px;height:6px"></span></button>
                    <button class="nt-size active" data-size="4" title="Medium"><span class="nt-size-dot" style="width:10px;height:10px"></span></button>
                    <button class="nt-size" data-size="8" title="Thick"><span class="nt-size-dot" style="width:14px;height:14px"></span></button>
                    <button class="nt-size" data-size="16" title="Marker"><span class="nt-size-dot" style="width:18px;height:18px"></span></button>
                  </div>
                </div>
                <canvas class="nt-canvas" id="ntCanvas"></canvas>
              </div>
              <button class="nt-save-btn" id="ntSaveBtn">${svg('save', 18)} Save Note</button>
            </div>
          </div>
        </div>`;

      const $ = s => root.querySelector(s);
      const listView = $('#ntListView');
      const editView = $('#ntEditView');
      const grid = $('#ntGrid');
      const emptyEl = $('#ntEmpty');
      const searchInput = $('#ntSearch');
      const titleInput = $('#ntTitleInput');
      const textInput = $('#ntTextInput');
      const canvasWrap = $('#ntCanvasWrap');
      const canvas = $('#ntCanvas');
      const ctx = canvas ? canvas.getContext('2d') : null;

      // Drawing state
      let drawing = {
        tool: 'pen',
        color: '#000000',
        size: 4,
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        history: [],
        historyIndex: -1,
      };

      async function loadNotes() {
        const url = searchQuery
          ? `${CP_BOOT.api.notes}?q=${encodeURIComponent(searchQuery)}`
          : CP_BOOT.api.notes;
        const d = await cp.api.get(url);
        notes = d.items || [];
        renderList();
      }

      function renderList() {
        if (notes.length === 0) {
          grid.innerHTML = '';
          emptyEl.hidden = false;
          return;
        }
        emptyEl.hidden = true;

        grid.innerHTML = notes.map(note => `
          <div class="nt-card ${note.pinned ? 'pinned' : ''}" data-id="${note.id}" style="--note-color:${note.color}">
            ${note.pinned ? `<div class="nt-card-pin">${svg('pinFill', 14)}</div>` : ''}
            ${note.preview_drawing ? `<div class="nt-card-preview"><img src="${note.preview_drawing}" alt=""></div>` : ''}
            <div class="nt-card-content">
              <h3 class="nt-card-title">${esc(note.title || 'Untitled')}</h3>
              ${note.content ? `<p class="nt-card-excerpt">${esc(note.content.slice(0, 80))}${note.content.length > 80 ? '...' : ''}</p>` : ''}
              <div class="nt-card-meta">
                <span>${fmtDate(note.updated_at)}</span>
                ${note.drawing_count > 0 ? `<span>•</span><span>${note.drawing_count} drawing${note.drawing_count > 1 ? 's' : ''}</span>` : ''}
              </div>
            </div>
          </div>
        `).join('');

        grid.querySelectorAll('.nt-card').forEach(card => {
          card.addEventListener('click', () => openNote(parseInt(card.dataset.id)));
        });
      }

      function showView(view) {
        currentView = view;
        if (view === 'list') {
          listView.hidden = false;
          editView.hidden = true;
        } else {
          listView.hidden = true;
          editView.hidden = false;
        }
      }

      function openNote(id) {
        currentNote = notes.find(n => n.id === id);
        if (!currentNote) return;

        titleInput.value = currentNote.title;
        textInput.value = currentNote.content;
        $('#ntPin').innerHTML = currentNote.pinned ? svg('pinFill', 20) : svg('pin', 20);

        // Reset to text mode
        setType('text');
        resizeCanvas();
        resetDrawing();

        showView('edit');
        setTimeout(() => titleInput.focus(), 100);
      }

      function newNote() {
        currentNote = null;
        titleInput.value = '';
        textInput.value = '';
        $('#ntPin').innerHTML = svg('pin', 20);
        setType('text');
        resizeCanvas();
        resetDrawing();
        showView('edit');
        setTimeout(() => titleInput.focus(), 100);
      }

      function setType(type) {
        document.querySelectorAll('.nt-type-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.type === type);
        });
        if (type === 'text') {
          textInput.style.display = '';
          canvasWrap.hidden = true;
        } else {
          textInput.style.display = 'none';
          canvasWrap.hidden = false;
          resizeCanvas();
        }
      }

      /* ---------- Drawing ---------- */
      function resizeCanvas() {
        if (!canvas || canvasWrap.hidden) return;
        const rect = canvasWrap.getBoundingClientRect();
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height - 100);
        if (ctx) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      function resetDrawing() {
        if (!ctx) return;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawing.history = [];
        drawing.historyIndex = -1;
        saveState();
      }

      function saveState() {
        drawing.historyIndex++;
        drawing.history = drawing.history.slice(0, drawing.historyIndex);
        drawing.history.push(canvas.toDataURL());
        if (drawing.history.length > 30) {
          drawing.history.shift();
          drawing.historyIndex--;
        }
      }

      function undo() {
        if (drawing.historyIndex <= 0) return;
        drawing.historyIndex--;
        restoreState();
      }

      function redo() {
        if (drawing.historyIndex >= drawing.history.length - 1) return;
        drawing.historyIndex++;
        restoreState();
      }

      function restoreState() {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = drawing.history[drawing.historyIndex];
      }

      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        return { x, y };
      }

      function startDraw(e) {
        if (!ctx) return;
        drawing.isDrawing = true;
        const pos = getPos(e);
        drawing.lastX = pos.x;
        drawing.lastY = pos.y;
        draw(e);
      }

      function draw(e) {
        if (!drawing.isDrawing || !ctx) return;
        e.preventDefault();
        
        const pos = getPos(e);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = drawing.tool === 'eraser' ? '#fff' : drawing.color;
        
        let size = drawing.size;
        let alpha = 1;
        
        if (drawing.tool === 'pencil') size = Math.max(1, drawing.size * 0.5);
        else if (drawing.tool === 'marker') { size = drawing.size * 3; alpha = 0.3; }
        else if (drawing.tool === 'pen') size = drawing.size;
        
        ctx.globalAlpha = drawing.tool === 'eraser' ? 1 : alpha;
        ctx.lineWidth = size;
        
        ctx.beginPath();
        ctx.moveTo(drawing.lastX, drawing.lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        
        drawing.lastX = pos.x;
        drawing.lastY = pos.y;
      }

      function endDraw() {
        if (drawing.isDrawing) {
          drawing.isDrawing = false;
          ctx.globalAlpha = 1;
          saveState();
        }
      }

      // Canvas events
      if (canvas) {
        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', endDraw);
        canvas.addEventListener('mouseleave', endDraw);
        
        // Touch support
        canvas.addEventListener('touchstart', e => {
          e.preventDefault();
          const touch = e.touches[0];
          startDraw(touch);
        }, { passive: false });
        
        canvas.addEventListener('touchmove', e => {
          e.preventDefault();
          const touch = e.touches[0];
          draw(touch);
        }, { passive: false });
        
        canvas.addEventListener('touchend', e => {
          e.preventDefault();
          endDraw();
        }, { passive: false });
      }

      // Tools
      root.querySelectorAll('.nt-tool[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
          drawing.tool = btn.dataset.tool;
          root.querySelectorAll('.nt-tool[data-tool]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      $('#ntUndo').addEventListener('click', undo);
      $('#ntRedo').addEventListener('click', redo);
      $('#ntClear').addEventListener('click', () => {
        if (confirm('Clear the drawing?')) resetDrawing();
      });

      // Colors
      root.querySelectorAll('.nt-color').forEach(btn => {
        btn.addEventListener('click', () => {
          drawing.color = btn.dataset.color;
          root.querySelectorAll('.nt-color').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      $('#ntCustomColor').addEventListener('input', e => {
        drawing.color = e.target.value;
        root.querySelectorAll('.nt-color').forEach(b => b.classList.remove('active'));
      });

      // Sizes
      root.querySelectorAll('.nt-size').forEach(btn => {
        btn.addEventListener('click', () => {
          drawing.size = parseInt(btn.dataset.size);
          root.querySelectorAll('.nt-size').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      // Type toggle
      root.querySelectorAll('.nt-type-btn').forEach(btn => {
        btn.addEventListener('click', () => setType(btn.dataset.type));
      });

      /* ---------- Save ---------- */
      async function saveNote() {
        const title = titleInput.value.trim() || 'Untitled';
        const content = textInput.value;
        const type = document.querySelector('.nt-type-btn.active').dataset.type;

        try {
          if (currentNote) {
            // Update existing
            const r = await cp.api.post(CP_BOOT.api.notes, {
              action: 'update',
              id: currentNote.id,
              title,
              content,
            });
            
            if (!r.ok) throw new Error(r.error);

            // Save drawing if in drawing mode
            if (type === 'drawing') {
              const imageData = canvas.toDataURL('image/png');
              const dr = await cp.api.post(CP_BOOT.api.notes, {
                action: 'save_drawing',
                note_id: currentNote.id,
                image: imageData,
                width: canvas.width,
                height: canvas.height,
              });
              if (!dr.ok) throw new Error(dr.error);
            }

            cp.toast('Note saved');
          } else {
            // Create new
            const fd = new FormData();
            fd.append('action', 'create');
            fd.append('title', title);
            fd.append('content', content);
            fd.append('type', type);
            fd.append('color', '#FFD60A');

            const createRes = await fetch(CP_BOOT.api.notes, { method: 'POST', body: fd });
            const cr = await createRes.json();
            if (!cr.ok) throw new Error(cr.error);

            // Save drawing if in drawing mode
            if (type === 'drawing') {
              const imageData = canvas.toDataURL('image/png');
              const dr = await cp.api.post(CP_BOOT.api.notes, {
                action: 'save_drawing',
                note_id: cr.id,
                image: imageData,
                width: canvas.width,
                height: canvas.height,
              });
              if (!dr.ok) throw new Error(dr.error);
            }

            cp.toast('Note created');
          }

          await loadNotes();
          showView('list');
        } catch (err) {
          cp.toast(err.message || 'Failed to save');
        }
      }

      $('#ntSaveBtn').addEventListener('click', saveNote);
      $('#ntBack').addEventListener('click', () => {
        showView('list');
        loadNotes();
      });
      $('#ntNewBtn').addEventListener('click', newNote);

      // Pin
      $('#ntPin').addEventListener('click', async () => {
        if (!currentNote) return;
        const r = await cp.api.post(CP_BOOT.api.notes, {
          action: 'pin',
          id: currentNote.id,
          pinned: !currentNote.pinned,
        });
        if (r.ok) {
          currentNote.pinned = !currentNote.pinned;
          $('#ntPin').innerHTML = currentNote.pinned ? svg('pinFill', 20) : svg('pin', 20);
          cp.toast(currentNote.pinned ? 'Pinned' : 'Unpinned');
        }
      });

      // Delete
      $('#ntDel').addEventListener('click', async () => {
        if (!currentNote) return;
        if (!confirm('Delete this note?')) return;
        const r = await cp.api.post(CP_BOOT.api.notes, {
          action: 'delete',
          id: currentNote.id,
        });
        if (r.ok) {
          cp.toast('Note deleted');
          showView('list');
          await loadNotes();
        }
      });

      // Search
      searchInput.addEventListener('input', e => {
        searchQuery = e.target.value;
        loadNotes();
      });

      // Window resize
      window.addEventListener('resize', resizeCanvas);
      this._resize = resizeCanvas;

      await loadNotes();
    },

    unmount(root, cp) {
      if (this._resize) {
        window.removeEventListener('resize', this._resize);
      }
    }
  });
})();