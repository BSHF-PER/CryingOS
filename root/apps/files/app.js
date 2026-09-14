/* Files — File Manager */
(function () {
  'use strict';

  CP.register('files', {
    async mount(root, cp) {
      var files = [];
      var stats = {};
      var currentFilter = 'all';
      var selectedIds = [];
      var selectionMode = false;
      var searchQuery = '';

      var icons = {
        image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
        video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
        audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
        drawing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
        all: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
        download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        storage: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>'
      };

      function svg(name, size) {
        size = size || 20;
        var i = icons[name] || '';
        return i.replace('<svg', '<svg width="' + size + '" height="' + size + '"');
      }

      function esc(s) {
        return String(s || '').replace(/[&<>"']/g, function(c) {
          return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
        });
      }

      function fmtSize(bytes) {
        if (!bytes) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
      }

      function fmtDate(ts) {
        try {
          return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch(e) { return ''; }
      }

      function getTypeIcon(type) {
        var iconMap = {
          'image': 'image',
          'video': 'video',
          'audio': 'audio',
          'drawing': 'drawing'
        };
        return iconMap[type] || 'image';
      }

      function getTypeLabel(type) {
        var labels = {
          'image': 'Photo',
          'video': 'Video',
          'audio': 'Audio',
          'drawing': 'Drawing'
        };
        return labels[type] || 'File';
      }

      function getFilteredFiles() {
        var filtered = files;
        
        if (currentFilter !== 'all') {
          filtered = filtered.filter(function(f) { return f.type === currentFilter; });
        }
        
        if (searchQuery) {
          var q = searchQuery.toLowerCase();
          filtered = filtered.filter(function(f) {
            return f.name.toLowerCase().indexOf(q) !== -1 ||
                   f.filename.toLowerCase().indexOf(q) !== -1;
          });
        }
        
        return filtered;
      }

      root.innerHTML =
        '<div class="fi">' +
        '  <header class="fi-head">' +
        '    <h1 class="fi-title">Files</h1>' +
        '    <div class="fi-stats" id="fiStats"></div>' +
        '  </header>' +
        '  <div class="fi-search">' +
        '    <span class="fi-search-icon">' + svg('search', 18) + '</span>' +
        '    <input class="fi-search-input" id="fiSearchInput" placeholder="Search files">' +
        '  </div>' +
        '  <div class="fi-tabs">' +
        '    <button class="fi-tab active" data-filter="all">' + svg('all', 16) + '<span>All</span></button>' +
        '    <button class="fi-tab" data-filter="image">' + svg('image', 16) + '<span>Photos</span></button>' +
        '    <button class="fi-tab" data-filter="video">' + svg('video', 16) + '<span>Videos</span></button>' +
        '    <button class="fi-tab" data-filter="audio">' + svg('audio', 16) + '<span>Audio</span></button>' +
        '    <button class="fi-tab" data-filter="drawing">' + svg('drawing', 16) + '<span>Drawings</span></button>' +
        '  </div>' +
        '  <div class="fi-selbar" id="fiSelBar" hidden>' +
        '    <button class="fi-selbtn" id="fiSelCancel">' + svg('close', 18) + ' Cancel</button>' +
        '    <span class="fi-selcount" id="fiSelCount">0 selected</span>' +
        '    <button class="fi-selbtn fi-seldanger" id="fiSelDelete">' + svg('trash', 18) + ' Delete</button>' +
        '  </div>' +
        '  <main class="fi-main" id="fiMain"></main>' +
        '</div>';

      var mainEl = root.querySelector('#fiMain');
      var statsEl = root.querySelector('#fiStats');
      var selBar = root.querySelector('#fiSelBar');
      var selCount = root.querySelector('#fiSelCount');
      var searchInput = root.querySelector('#fiSearchInput');

      function loadFiles() {
        return cp.api.get(CP_BOOT.api.files).then(function(d) {
          files = d.files || [];
          stats = d.stats || {};
          render();
        });
      }

      function render() {
        renderStats();
        var filtered = getFilteredFiles();
        
        if (filtered.length === 0) {
          renderEmpty();
          return;
        }
        
        renderFileList(filtered);
        updateSelectionUI();
      }

      function renderStats() {
        statsEl.innerHTML =
          '<div class="fi-stat">' +
          '  <div class="fi-stat-icon">' + svg('storage', 20) + '</div>' +
          '  <div class="fi-stat-info">' +
          '    <div class="fi-stat-value">' + fmtSize(stats.total_size || 0) + '</div>' +
          '    <div class="fi-stat-label">Total Storage</div>' +
          '  </div>' +
          '</div>' +
          '<div class="fi-stat-grid">' +
          '  <div class="fi-stat-mini">' +
          '    <span class="fi-stat-num">' + (stats.images || 0) + '</span>' +
          '    <span class="fi-stat-lbl">Photos</span>' +
          '  </div>' +
          '  <div class="fi-stat-mini">' +
          '    <span class="fi-stat-num">' + (stats.videos || 0) + '</span>' +
          '    <span class="fi-stat-lbl">Videos</span>' +
          '  </div>' +
          '  <div class="fi-stat-mini">' +
          '    <span class="fi-stat-num">' + (stats.audio || 0) + '</span>' +
          '    <span class="fi-stat-lbl">Audio</span>' +
          '  </div>' +
          '  <div class="fi-stat-mini">' +
          '    <span class="fi-stat-num">' + (stats.drawings || 0) + '</span>' +
          '    <span class="fi-stat-lbl">Drawings</span>' +
          '  </div>' +
          '</div>';
      }

      function renderEmpty() {
        mainEl.innerHTML =
          '<div class="fi-empty">' +
          '  <div class="fi-empty-icon">' + svg('storage', 64) + '</div>' +
          '  <h2>No files</h2>' +
          '  <p>Upload files from Photos, Music, Voice Recorder, or Notes to see them here</p>' +
          '</div>';
      }

      function renderFileList(filtered) {
        var html = '<div class="fi-list">';
        
        for (var i = 0; i < filtered.length; i++) {
          var f = filtered[i];
          var selected = selectedIds.indexOf(f.id) !== -1;
          
          html +=
            '<div class="fi-item" data-id="' + f.id + '"' + (selected ? ' data-select="true"' : '') + '>' +
            '  <div class="fi-item-icon">' + svg(getTypeIcon(f.type), 24) + '</div>' +
            '  <div class="fi-item-info">' +
            '    <div class="fi-item-name">' + esc(f.name) + '</div>' +
            '    <div class="fi-item-meta">' +
            '      <span>' + getTypeLabel(f.type) + '</span>' +
            '      <span>•</span>' +
            '      <span>' + fmtSize(f.size) + '</span>' +
            '      <span>•</span>' +
            '      <span>' + fmtDate(f.created_at) + '</span>' +
            '    </div>' +
            '  </div>' +
            '  <div class="fi-item-actions">' +
            '    <a class="fi-item-btn" href="' + f.url + '" download="' + esc(f.filename) + '" title="Download">' +
            svg('download', 18) +
            '    </a>' +
            '    <button class="fi-item-btn fi-item-del" data-del="' + f.id + '" title="Delete">' +
            svg('trash', 18) +
            '    </button>' +
            (selectionMode ?
              '    <div class="fi-item-check">' + (selected ? svg('check', 14) : '') + '</div>'
              : '') +
            '  </div>' +
            '</div>';
        }
        
        html += '</div>';
        mainEl.innerHTML = html;

        // Bind events
        mainEl.querySelectorAll('.fi-item').forEach(function(el) {
          el.addEventListener('click', function(e) {
            if (e.target.closest('.fi-item-btn')) return;
            
            var id = el.getAttribute('data-id');
            
            if (selectionMode) {
              toggleSelection(id);
            } else {
              // Long press to enter selection mode
            }
          });

          // Long press for selection
          var timer = null;
          el.addEventListener('pointerdown', function() {
            timer = setTimeout(function() {
              var id = el.getAttribute('data-id');
              if (!selectionMode) enterSelectionMode();
              toggleSelection(id);
            }, 500);
          });
          ['pointerup', 'pointerleave', 'pointercancel'].forEach(function(ev) {
            el.addEventListener(ev, function() { clearTimeout(timer); });
          });
        });

        mainEl.querySelectorAll('[data-del]').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteFile(btn.getAttribute('data-del'));
          });
        });
      }

      function deleteFile(fileId, callback) {
        if (!confirm('Delete this file?')) return;
        
        cp.api.post(CP_BOOT.api.files, { action: 'delete', file_id: fileId }).then(function(r) {
          if (r.ok) {
            files = files.filter(function(f) { return f.id !== fileId; });
            render();
            cp.toast('File deleted');
            if (callback) callback();
          } else {
            cp.toast(r.error || 'Failed to delete');
          }
        });
      }

      function bulkDelete() {
        if (selectedIds.length === 0) return;
        if (!confirm('Delete ' + selectedIds.length + ' files?')) return;
        
        cp.api.post(CP_BOOT.api.files, { action: 'bulk_delete', file_ids: selectedIds }).then(function(r) {
          if (r.ok) {
            files = files.filter(function(f) { return selectedIds.indexOf(f.id) === -1; });
            cp.toast('Deleted ' + r.deleted + ' files');
            exitSelectionMode();
            render();
          }
        });
      }

      function enterSelectionMode() {
        selectionMode = true;
        selectedIds = [];
        selBar.hidden = false;
        render();
      }

      function exitSelectionMode() {
        selectionMode = false;
        selectedIds = [];
        selBar.hidden = true;
        render();
      }

      function toggleSelection(id) {
        var idx = selectedIds.indexOf(id);
        if (idx === -1) selectedIds.push(id);
        else selectedIds.splice(idx, 1);
        updateSelectionUI();
        render();
      }

      function updateSelectionUI() {
        selCount.textContent = selectedIds.length + ' selected';
      }

      // Tabs
      root.querySelectorAll('.fi-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          currentFilter = tab.getAttribute('data-filter');
          root.querySelectorAll('.fi-tab').forEach(function(t) {
            t.classList.toggle('active', t === tab);
          });
          render();
        });
      });

      // Search
      var searchTimer = null;
      searchInput.addEventListener('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
          searchQuery = searchInput.value.trim();
          render();
        }, 200);
      });

      // Selection mode buttons
      root.querySelector('#fiSelCancel').addEventListener('click', exitSelectionMode);
      root.querySelector('#fiSelDelete').addEventListener('click', bulkDelete);

      await loadFiles();
    }
  });
})();