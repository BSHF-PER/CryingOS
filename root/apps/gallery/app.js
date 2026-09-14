/* Photos — iOS Photos Style with Video Support */
(function () {
  'use strict';

  CP.register('gallery', {
    async mount(root, cp) {
      var items = [];
      var stats = { total: 0, images: 0, videos: 0, favorites: 0 };
      var currentView = 'grid'; // grid | list
      var currentTab = 'all'; // all | images | videos | favorites
      var selectedIds = [];
      var selectionMode = false;
      var lightboxIndex = -1;
      var lightboxItems = [];
      var lightboxVideo = null;
      var searchQuery = '';

      var icons = {
        grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
        list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
        upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        heartFill: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
        prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
        next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>',
        play: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
        pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
        video: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
        image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
        all: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
        empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
        select: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
        share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        fullscreen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>'
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
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
      }

      function fmtDuration(ms) {
        if (!ms) return '';
        var totalSec = Math.floor(ms / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        if (h > 0) return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        return m + ':' + (s < 10 ? '0' : '') + s;
      }

      function fmtDate(ts) {
        try {
          return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch(e) { return ''; }
      }

      function getFilteredItems() {
        var filtered = items;
        if (searchQuery) {
          var q = searchQuery.toLowerCase();
          filtered = filtered.filter(function(it) {
            return (it.title && it.title.toLowerCase().indexOf(q) !== -1) ||
                   it.filename.toLowerCase().indexOf(q) !== -1;
          });
        }
        return filtered;
      }

      root.innerHTML =
        '<div class="ph">' +
        '  <header class="ph-head">' +
        '    <div class="ph-head-row">' +
        '      <h1 class="ph-title">Photos</h1>' +
        '      <div class="ph-actions">' +
        '        <button class="ph-icon-btn" id="phViewToggle" title="Toggle view">' + svg('grid', 20) + '</button>' +
        '        <button class="ph-icon-btn ph-upload-btn" id="phUploadBtn" title="Upload">' + svg('upload', 20) + '</button>' +
        '      </div>' +
        '    </div>' +
        '    <div class="ph-search">' +
        '      <span class="ph-search-icon">' + svg('search', 18) + '</span>' +
        '      <input class="ph-search-input" id="phSearchInput" placeholder="Search photos & videos">' +
        '      <span class="ph-count" id="phCount">0</span>' +
        '    </div>' +
        '    <div class="ph-tabs">' +
        '      <button class="ph-tab active" data-tab="all">' + svg('all', 16) + '<span>All</span></button>' +
        '      <button class="ph-tab" data-tab="images">' + svg('image', 16) + '<span>Photos</span></button>' +
        '      <button class="ph-tab" data-tab="videos">' + svg('video', 16) + '<span>Videos</span></button>' +
        '      <button class="ph-tab" data-tab="favorites">' + svg('heart', 16) + '<span>Favorites</span></button>' +
        '    </div>' +
        '  </header>' +
        '  <div class="ph-selbar" id="phSelBar" hidden>' +
        '    <button class="ph-selbtn" id="phSelCancel">' + svg('close', 18) + ' Cancel</button>' +
        '    <span class="ph-selcount" id="phSelCount">0 selected</span>' +
        '    <div class="ph-selactions">' +
        '      <button class="ph-selbtn ph-seldanger" id="phSelDelete">' + svg('trash', 18) + ' Delete</button>' +
        '    </div>' +
        '  </div>' +
        '  <main class="ph-main" id="phMain"></main>' +
        '  <input type="file" id="phFileInput" accept="image/*,video/*" multiple hidden>' +
        '</div>';

      var mainEl = root.querySelector('#phMain');
      var selBar = root.querySelector('#phSelBar');
      var selCount = root.querySelector('#phSelCount');
      var countEl = root.querySelector('#phCount');
      var searchInput = root.querySelector('#phSearchInput');
      var viewToggleBtn = root.querySelector('#phViewToggle');
      var uploadBtn = root.querySelector('#phUploadBtn');
      var fileInput = root.querySelector('#phFileInput');

      function loadItems() {
        return cp.api.get(CP_BOOT.api.gallery + '?filter=' + currentTab).then(function(d) {
          items = d.items || [];
          stats = d.stats || stats;
          render();
        });
      }

      function render() {
        var filtered = getFilteredItems();
        countEl.textContent = filtered.length;

        if (items.length === 0 && !searchQuery) {
          renderEmpty();
          return;
        }

        if (currentView === 'grid') renderGrid(filtered);
        else renderList(filtered);

        updateSelectionUI();
      }

      function renderEmpty() {
        var msg = 'Upload your first photo or video';
        if (currentTab === 'videos') msg = 'No videos yet';
        else if (currentTab === 'images') msg = 'No photos yet';
        else if (currentTab === 'favorites') msg = 'No favorites yet';

        mainEl.innerHTML =
          '<div class="ph-empty">' +
          '  <div class="ph-empty-icon">' + svg('empty', 48) + '</div>' +
          '  <h2>No ' + (currentTab === 'all' ? 'media' : currentTab) + '</h2>' +
          '  <p>' + msg + '</p>' +
          '  <button class="ph-empty-btn" id="phEmptyUpload">' + svg('upload', 18) + ' Upload</button>' +
          '</div>';
        
        root.querySelector('#phEmptyUpload').addEventListener('click', function() {
          fileInput.click();
        });
      }

      function renderGrid(filtered) {
        if (filtered.length === 0) {
          mainEl.innerHTML = '<div class="ph-empty"><h2>No results</h2><p>Try a different search</p></div>';
          return;
        }

        // Group by date
        var groups = {};
        for (var i = 0; i < filtered.length; i++) {
          var date = fmtDate(filtered[i].created_at);
          if (!groups[date]) groups[date] = [];
          groups[date].push(filtered[i]);
        }

        var html = '<div class="ph-grid">';
        for (var date in groups) {
          html += '<div class="ph-group">' +
            '<div class="ph-group-head">' +
            '  <h3 class="ph-group-title">' + esc(date) + '</h3>' +
            '  <span class="ph-group-count">' + groups[date].length + '</span>' +
            '</div>' +
            '<div class="ph-grid ph-grid-medium">';
          
          for (var j = 0; j < groups[date].length; j++) {
            var item = groups[date][j];
            var selected = selectedIds.indexOf(item.id) !== -1;
            var thumbUrl = item.media_type === 'video' ? 
              (item.thumb_url || item.url) : 
              item.url;
            
            html +=
              '<div class="ph-item" data-id="' + item.id + '"' + (selected ? ' data-select="true"' : '') + '>' +
              '  <img src="' + thumbUrl + '" alt="" loading="lazy">' +
              (item.media_type === 'video' ? 
                '  <div class="ph-item-video-badge">' + 
                svg('play', 14) + 
                (item.duration_ms ? '<span>' + fmtDuration(item.duration_ms) + '</span>' : '') +
                '  </div>' : '') +
              (item.is_favorite ? '<div class="ph-item-fav">' + svg('heartFill', 14) + '</div>' : '') +
              (selectionMode ? '<div class="ph-item-check">' + (selected ? svg('check', 14) : '') + '</div>' : '') +
              '</div>';
          }
          html += '</div></div>';
        }
        html += '</div>';
        mainEl.innerHTML = html;

        mainEl.querySelectorAll('.ph-item').forEach(function(el) {
          el.addEventListener('click', function(e) {
            var id = parseInt(el.getAttribute('data-id'));
            if (selectionMode) {
              toggleSelection(id);
            } else {
              openLightbox(id);
            }
          });

          // Long press for selection
          var timer = null;
          el.addEventListener('pointerdown', function() {
            timer = setTimeout(function() {
              var id = parseInt(el.getAttribute('data-id'));
              if (!selectionMode) enterSelectionMode();
              toggleSelection(id);
            }, 500);
          });
          ['pointerup', 'pointerleave', 'pointercancel'].forEach(function(ev) {
            el.addEventListener(ev, function() { clearTimeout(timer); });
          });
        });
      }

      function renderList(filtered) {
        if (filtered.length === 0) {
          mainEl.innerHTML = '<div class="ph-empty"><h2>No results</h2><p>Try a different search</p></div>';
          return;
        }

        var html = '<div class="ph-list"><div class="ph-list-wrap">';
        for (var i = 0; i < filtered.length; i++) {
          var item = filtered[i];
          var thumbUrl = item.media_type === 'video' ? 
            (item.thumb_url || item.url) : 
            item.url;
          
          html +=
            '<div class="ph-listitem" data-id="' + item.id + '">' +
            '  <img class="ph-listitem-img" src="' + thumbUrl + '" alt="" loading="lazy">' +
            '  <div class="ph-listitem-info">' +
            '    <div class="ph-listitem-name">' + esc(item.title || item.filename) + '</div>' +
            '    <div class="ph-listitem-meta">' +
            '      <span>' + (item.media_type === 'video' ? '🎬' : '🖼️') + ' ' + (item.media_type === 'video' ? 'Video' : 'Photo') + '</span>' +
            (item.duration_ms ? '<span>• ' + fmtDuration(item.duration_ms) + '</span>' : '') +
            '      <span>• ' + fmtSize(item.size) + '</span>' +
            '      <span>• ' + fmtDate(item.created_at) + '</span>' +
            '    </div>' +
            '  </div>' +
            '  <button class="ph-listitem-fav ' + (item.is_favorite ? 'is-fav' : '') + '" data-fav="' + item.id + '">' +
            (item.is_favorite ? svg('heartFill', 18) : svg('heart', 18)) +
            '  </button>' +
            '  <button class="ph-listitem-open" data-open="' + item.id + '">' + svg('fullscreen', 18) + '</button>' +
            '</div>';
        }
        html += '</div></div>';
        mainEl.innerHTML = html;

        mainEl.querySelectorAll('.ph-listitem').forEach(function(el) {
          el.addEventListener('click', function(e) {
            if (e.target.closest('.ph-listitem-fav') || e.target.closest('.ph-listitem-open')) return;
            var id = parseInt(el.getAttribute('data-id'));
            openLightbox(id);
          });
        });

        mainEl.querySelectorAll('[data-fav]').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleFavorite(parseInt(btn.getAttribute('data-fav')));
          });
        });

        mainEl.querySelectorAll('[data-open]').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            openLightbox(parseInt(btn.getAttribute('data-open')));
          });
        });
      }

      function openLightbox(id) {
        lightboxItems = getFilteredItems();
        lightboxIndex = lightboxItems.findIndex(function(it) { return it.id === id; });
        if (lightboxIndex < 0) return;
        renderLightbox();
      }

      function renderLightbox() {
        if (lightboxIndex < 0 || lightboxIndex >= lightboxItems.length) return;
        var item = lightboxItems[lightboxIndex];

        var existingLb = root.querySelector('.ph-lb');
        if (existingLb) existingLb.remove();

        // Stop previous video if any
        if (lightboxVideo) {
          lightboxVideo.pause();
          lightboxVideo = null;
        }

        var mediaHtml;
        if (item.media_type === 'video') {
          mediaHtml =
            '<video class="ph-lb-video" id="phLbVideo" controls autoplay playsinline preload="metadata">' +
            '  <source src="' + item.url + '">' +
            '  Your browser does not support video.' +
            '</video>';
        } else {
          mediaHtml = '<img class="ph-lb-img" src="' + item.url + '" alt="">';
        }

        var lb = document.createElement('div');
        lb.className = 'ph-lb';
        lb.innerHTML =
          '<div class="ph-lb-bg"></div>' +
          '<div class="ph-lb-top">' +
          '  <button class="ph-lb-btn" id="phLbClose">' + svg('close', 20) + '</button>' +
          '  <div class="ph-lb-info">' +
          '    <span class="ph-lb-title">' + esc(item.title || item.filename) + '</span>' +
          '    <span class="ph-lb-sub">' + (item.media_type === 'video' ? 'Video' : 'Photo') + ' • ' + fmtSize(item.size) + ' • ' + fmtDate(item.created_at) + '</span>' +
          '  </div>' +
          '  <div class="ph-lb-actions">' +
          '    <button class="ph-lb-btn" id="phLbFav">' + (item.is_favorite ? svg('heartFill', 18) : svg('heart', 18)) + '</button>' +
          '    <button class="ph-lb-btn ph-lb-del" id="phLbDel">' + svg('trash', 18) + '</button>' +
          '  </div>' +
          '</div>' +
          '<div class="ph-lb-stage">' +
          mediaHtml +
          (lightboxIndex > 0 ? '<button class="ph-lb-nav ph-lb-prev" id="phLbPrev">' + svg('prev', 24) + '</button>' : '') +
          (lightboxIndex < lightboxItems.length - 1 ? '<button class="ph-lb-nav ph-lb-next" id="phLbNext">' + svg('next', 24) + '</button>' : '') +
          '</div>' +
          '<div class="ph-lb-counter">' + (lightboxIndex + 1) + ' of ' + lightboxItems.length + '</div>';
        
        root.appendChild(lb);

        if (item.media_type === 'video') {
          lightboxVideo = root.querySelector('#phLbVideo');
        }

        root.querySelector('#phLbClose').addEventListener('click', closeLightbox);
        root.querySelector('.ph-lb-bg').addEventListener('click', closeLightbox);
        
        var prevBtn = root.querySelector('#phLbPrev');
        var nextBtn = root.querySelector('#phLbNext');
        if (prevBtn) prevBtn.addEventListener('click', function() {
          lightboxIndex--;
          renderLightbox();
        });
        if (nextBtn) nextBtn.addEventListener('click', function() {
          lightboxIndex++;
          renderLightbox();
        });

        root.querySelector('#phLbFav').addEventListener('click', function() {
          toggleFavorite(item.id);
        });
        
        root.querySelector('#phLbDel').addEventListener('click', function() {
          deleteItem(item.id, function() {
            closeLightbox();
          });
        });

        // Keyboard navigation
        var keyHandler = function(e) {
          if (e.key === 'Escape') { closeLightbox(); document.removeEventListener('keydown', keyHandler); }
          else if (e.key === 'ArrowLeft' && lightboxIndex > 0) { lightboxIndex--; renderLightbox(); }
          else if (e.key === 'ArrowRight' && lightboxIndex < lightboxItems.length - 1) { lightboxIndex++; renderLightbox(); }
        };
        document.addEventListener('keydown', keyHandler);
        lb._keyHandler = keyHandler;
      }

      function closeLightbox() {
        if (lightboxVideo) {
          lightboxVideo.pause();
          lightboxVideo = null;
        }
        var lb = root.querySelector('.ph-lb');
        if (lb) {
          if (lb._keyHandler) document.removeEventListener('keydown', lb._keyHandler);
          lb.remove();
        }
        lightboxIndex = -1;
      }

      function toggleFavorite(id) {
        cp.api.post(CP_BOOT.api.gallery, { action: 'toggle_favorite', id: id }).then(function(r) {
          if (r.ok) {
            var item = items.find(function(it) { return it.id === id; });
            if (item) item.is_favorite = r.is_favorite ? 1 : 0;
            render();
            // Update lightbox if open
            if (lightboxIndex >= 0) renderLightbox();
            cp.toast(r.is_favorite ? 'Added to favorites' : 'Removed from favorites');
          }
        });
      }

      function deleteItem(id, callback) {
        if (!confirm('Delete this item?')) return;
        cp.api.post(CP_BOOT.api.gallery, { action: 'delete', id: id }).then(function(r) {
          if (r.ok) {
            items = items.filter(function(it) { return it.id !== id; });
            render();
            cp.toast('Deleted');
            if (callback) callback();
          }
        });
      }

      function bulkDelete() {
        if (selectedIds.length === 0) return;
        if (!confirm('Delete ' + selectedIds.length + ' items?')) return;
        cp.api.post(CP_BOOT.api.gallery, { action: 'bulk_delete', ids: selectedIds }).then(function(r) {
          if (r.ok) {
            items = items.filter(function(it) { return selectedIds.indexOf(it.id) === -1; });
            cp.toast('Deleted ' + r.deleted + ' items');
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

      // Upload
      uploadBtn.addEventListener('click', function() { fileInput.click(); });
      
      fileInput.addEventListener('change', function(e) {
        var files = e.target.files;
        if (!files || files.length === 0) return;
        
        cp.toast('Uploading ' + files.length + ' file' + (files.length > 1 ? 's' : '') + '...');
        
        var fd = new FormData();
        for (var i = 0; i < files.length; i++) {
          fd.append('images[]', files[i]);
        }
        
        fetch(CP_BOOT.api.gallery, { method: 'POST', body: fd })
          .then(function(r) { return r.json(); })
          .then(function(r) {
            if (r.ok) {
              cp.toast('Uploaded ' + r.uploaded + ' file' + (r.uploaded > 1 ? 's' : ''));
              loadItems();
            } else {
              cp.toast(r.error || 'Upload failed');
            }
            fileInput.value = '';
          })
          .catch(function() {
            cp.toast('Upload failed');
            fileInput.value = '';
          });
      });

      // Drag and drop
      root.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (!root.querySelector('.ph-drop')) {
          var drop = document.createElement('div');
          drop.className = 'ph-drop';
          drop.innerHTML = 
            '<div class="ph-drop-content">' + 
            svg('upload', 64) + 
            '<p>Drop files here</p>' +
            '<small>Photos and videos</small>' +
            '</div>';
          root.appendChild(drop);
        }
      });

      root.addEventListener('dragleave', function(e) {
        if (e.target === root || !root.contains(e.relatedTarget)) {
          var drop = root.querySelector('.ph-drop');
          if (drop) drop.remove();
        }
      });

      root.addEventListener('drop', function(e) {
        e.preventDefault();
        var drop = root.querySelector('.ph-drop');
        if (drop) drop.remove();
        
        var files = e.dataTransfer.files;
        if (!files || files.length === 0) return;
        
        cp.toast('Uploading...');
        var fd = new FormData();
        for (var i = 0; i < files.length; i++) {
          fd.append('images[]', files[i]);
        }
        
        fetch(CP_BOOT.api.gallery, { method: 'POST', body: fd })
          .then(function(r) { return r.json(); })
          .then(function(r) {
            if (r.ok) {
              cp.toast('Uploaded ' + r.uploaded + ' file' + (r.uploaded > 1 ? 's' : ''));
              loadItems();
            }
          });
      });

      // Tabs
      root.querySelectorAll('.ph-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
          currentTab = tab.getAttribute('data-tab');
          root.querySelectorAll('.ph-tab').forEach(function(t) {
            t.classList.toggle('active', t === tab);
          });
          loadItems();
        });
      });

      // View toggle
      viewToggleBtn.addEventListener('click', function() {
        currentView = currentView === 'grid' ? 'list' : 'grid';
        viewToggleBtn.innerHTML = svg(currentView === 'grid' ? 'grid' : 'list', 20);
        render();
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
      root.querySelector('#phSelCancel').addEventListener('click', exitSelectionMode);
      root.querySelector('#phSelDelete').addEventListener('click', bulkDelete);

      // Cleanup
      this._cleanup = function() {
        closeLightbox();
      };

      await loadItems();
    },

    unmount: function(root, cp) {
      if (this._cleanup) this._cleanup();
    }
  });
})();