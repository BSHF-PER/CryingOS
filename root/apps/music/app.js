/* Music Player — Full Featured with Background Playback */
(function () {
  'use strict';

  CP.register('music', {
    async mount(root, cp) {
      var musicService = cp.music;
      
      var tracks = [];
      var playlists = [];
      var favorites = [];
      var currentTab = 'library';
      var currentPlaylist = null;
      
      var icons = {
        play: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
        pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
        next: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><rect x="16" y="4" width="3" height="16"/></svg>',
        prev: '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="19 4 9 12 19 20 19 4"/><rect x="5" y="4" width="3" height="16"/></svg>',
        shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
        repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
        repeatOne: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="12" y="15" text-anchor="middle" font-size="8" fill="currentColor">1</text></svg>',
        heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        heartFill: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
        list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></svg>',
        back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
        upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>'
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

      function fmtDuration(ms) {
        if (!ms) return '--:--';
        var totalSec = Math.floor(ms / 1000);
        var min = Math.floor(totalSec / 60);
        var sec = totalSec % 60;
        return min + ':' + (sec < 10 ? '0' : '') + sec;
      }

      function getCoverUrl(trackId) {
        return CP_BOOT.api.music + '?cover=' + trackId;
      }

      root.innerHTML = 
        '<div class="mu">' +
        '  <div class="mu-main" id="muMain">' +
        '    <header class="mu-head">' +
        '      <h1 class="mu-title" id="muTitle">Music</h1>' +
        '      <div class="mu-head-actions">' +
        '        <button class="mu-uploadbtn" id="muUploadBtn" title="Upload">' + svg('upload', 20) + '</button>' +
        '      </div>' +
        '    </header>' +
        '    <div class="mu-tabs">' +
        '      <button class="mu-tab active" data-tab="library">' + svg('music', 18) + '<span>Library</span></button>' +
        '      <button class="mu-tab" data-tab="playlists">' + svg('list', 18) + '<span>Playlists</span></button>' +
        '      <button class="mu-tab" data-tab="favorites">' + svg('heart', 18) + '<span>Favorites</span></button>' +
        '    </div>' +
        '    <div class="mu-content" id="muContent"></div>' +
        '  </div>' +
        '  <div class="mu-player" id="muPlayer">' +
        '    <div class="mu-player-info" id="muPlayerInfo">' +
        '      <div class="mu-player-art" id="muPlayerArt">' + svg('music', 32) + '</div>' +
        '      <div class="mu-player-text">' +
        '        <div class="mu-player-title" id="muPlayerTitle">No track selected</div>' +
        '        <div class="mu-player-artist" id="muPlayerArtist">Select a song to play</div>' +
        '      </div>' +
        '    </div>' +
        '    <div class="mu-player-controls">' +
        '      <button class="mu-ctrl-btn mu-shuffle" id="muShuffle">' + svg('shuffle', 18) + '</button>' +
        '      <button class="mu-ctrl-btn" id="muPrev">' + svg('prev', 20) + '</button>' +
        '      <button class="mu-ctrl-btn mu-playbtn" id="muPlayPause">' + svg('play', 24) + '</button>' +
        '      <button class="mu-ctrl-btn" id="muNext">' + svg('next', 20) + '</button>' +
        '      <button class="mu-ctrl-btn mu-repeat" id="muRepeat">' + svg('repeat', 18) + '</button>' +
        '    </div>' +
        '    <div class="mu-progress">' +
        '      <span class="mu-time" id="muCurrentTime">0:00</span>' +
        '      <div class="mu-progress-bar" id="muProgressBar">' +
        '        <div class="mu-progress-fill" id="muProgressFill"></div>' +
        '        <div class="mu-progress-thumb" id="muProgressThumb"></div>' +
        '      </div>' +
        '      <span class="mu-time" id="muTotalTime">0:00</span>' +
        '    </div>' +
        '  </div>' +
        '</div>';

      var content = root.querySelector('#muContent');
      var playerTitle = root.querySelector('#muPlayerTitle');
      var playerArtist = root.querySelector('#muPlayerArtist');
      var playerArt = root.querySelector('#muPlayerArt');
      var playPauseBtn = root.querySelector('#muPlayPause');
      var currentTimeEl = root.querySelector('#muCurrentTime');
      var totalTimeEl = root.querySelector('#muTotalTime');
      var progressBar = root.querySelector('#muProgressBar');
      var progressFill = root.querySelector('#muProgressFill');
      var progressThumb = root.querySelector('#muProgressThumb');
      var shuffleBtn = root.querySelector('#muShuffle');
      var repeatBtn = root.querySelector('#muRepeat');

      function loadTracks() {
        return cp.api.get(CP_BOOT.api.music + '?view=tracks').then(function(d) {
          tracks = d.items || [];
        });
      }

      function loadPlaylists() {
        return cp.api.get(CP_BOOT.api.music + '?view=playlists').then(function(d) {
          playlists = d.items || [];
        });
      }

      function loadFavorites() {
        return cp.api.get(CP_BOOT.api.music + '?view=favorites').then(function(d) {
          favorites = d.items || [];
        });
      }

      function loadAll() {
        return Promise.all([loadTracks(), loadPlaylists(), loadFavorites()]).then(function() {
          render();
        });
      }

      function render() {
        if (currentTab === 'library') renderLibrary();
        else if (currentTab === 'playlists') renderPlaylists();
        else if (currentTab === 'favorites') renderFavorites();
        updatePlayerFromService();
      }

      function renderLibrary() {
        if (tracks.length === 0) {
          content.innerHTML = 
            '<div class="mu-empty">' +
            '  ' + svg('music', 64) +
            '  <h2>No music yet</h2>' +
            '  <p>Tap the upload button to add your first track</p>' +
            '</div>';
          return;
        }

        var html = '<div class="mu-track-list">';
        for (var i = 0; i < tracks.length; i++) {
          var t = tracks[i];
          var isCurrent = musicService.track && musicService.track.id === t.id;
          var playingClass = isCurrent && musicService.isPlaying ? ' playing' : '';
          var currentClass = isCurrent ? ' current' : '';
          
          var iconHtml;
          if (t.cover_filename) {
            iconHtml = '<img src="' + getCoverUrl(t.id) + '" alt="" class="mu-track-cover">';
          } else {
            iconHtml = isCurrent && musicService.isPlaying ? svg('pause', 24) : svg('play', 24);
          }
          
          html += 
            '<div class="mu-track' + currentClass + playingClass + '" data-id="' + t.id + '">' +
            '  <div class="mu-track-icon">' + iconHtml + '</div>' +
            '  <div class="mu-track-info">' +
            '    <div class="mu-track-title">' + esc(t.title) + '</div>' +
            '    <div class="mu-track-meta">' +
            (t.artist ? '<span>' + esc(t.artist) + '</span><span>•</span>' : '') +
            '      <span>' + fmtDuration(t.duration_ms) + '</span>' +
            '    </div>' +
            '  </div>' +
            '  <button class="mu-track-fav" data-fav="' + t.id + '">' +
            (t.is_favorite ? svg('heartFill', 18) : svg('heart', 18)) +
            '  </button>' +
            '  <button class="mu-track-more" data-more="' + t.id + '">' + svg('more', 18) + '</button>' +
            '</div>';
        }
        html += '</div>';
        content.innerHTML = html;

        bindTrackEvents(content);
      }

      function bindTrackEvents(container) {
        container.querySelectorAll('.mu-track').forEach(function(el) {
          el.addEventListener('click', function(e) {
            if (e.target.closest('.mu-track-fav') || 
                e.target.closest('.mu-track-more') || 
                e.target.closest('.mu-track-del')) return;
            var trackId = parseInt(el.getAttribute('data-id'));
            playFromTrackId(trackId);
          });
        });

        container.querySelectorAll('.mu-track-fav').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleFavorite(parseInt(btn.getAttribute('data-fav')));
          });
        });

        container.querySelectorAll('.mu-track-more').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            showTrackMenu(parseInt(btn.getAttribute('data-more')));
          });
        });

        container.querySelectorAll('.mu-track-del').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteTrack(parseInt(btn.getAttribute('data-del')));
          });
        });
      }

      function showTrackMenu(trackId) {
        var modal = 
          '<div class="mu-modal" id="muTrackMenu">' +
          '  <div class="mu-modal-backdrop"></div>' +
          '  <div class="mu-modal-content">' +
          '    <h2 class="mu-modal-title">Track Options</h2>' +
          '    <div class="mu-menu-list">' +
          '      <button class="mu-menu-item" id="muAddToPlaylist">' + svg('plus', 18) + ' Add to Playlist</button>' +
          '      <button class="mu-menu-item mu-menu-danger" id="muDeleteTrack">' + svg('trash', 18) + ' Delete Track</button>' +
          '    </div>' +
          '    <button class="mu-btn mu-btn-secondary mu-menu-cancel" id="muMenuCancel">Cancel</button>' +
          '  </div>' +
          '</div>';
        
        root.insertAdjacentHTML('beforeend', modal);
        var modalEl = root.querySelector('#muTrackMenu');

        function closeMenu() { modalEl.remove(); }
        modalEl.querySelector('#muMenuCancel').addEventListener('click', closeMenu);
        modalEl.querySelector('.mu-modal-backdrop').addEventListener('click', closeMenu);

        modalEl.querySelector('#muAddToPlaylist').addEventListener('click', function() {
          modalEl.remove();
          showPlaylistPicker(trackId);
        });

        modalEl.querySelector('#muDeleteTrack').addEventListener('click', function() {
          modalEl.remove();
          deleteTrack(trackId);
        });
      }

      function showPlaylistPicker(trackId) {
        var html = 
          '<div class="mu-modal" id="muPlaylistPicker">' +
          '  <div class="mu-modal-backdrop"></div>' +
          '  <div class="mu-modal-content">' +
          '    <h2 class="mu-modal-title">Add to Playlist</h2>' +
          '    <div class="mu-playlist-picker">';
        
        if (playlists.length === 0) {
          html += '<p class="mu-picker-empty">No playlists yet. Create one first!</p>';
        } else {
          for (var i = 0; i < playlists.length; i++) {
            var p = playlists[i];
            html += '<button class="mu-picker-item" data-playlist="' + p.id + '">' +
              svg('music', 18) + '<span>' + esc(p.name) + '</span></button>';
          }
        }
        
        html += '</div>' +
          '    <button class="mu-btn mu-btn-secondary mu-menu-cancel" id="muPickerCancel">Cancel</button>' +
          '  </div>' +
          '</div>';
        
        root.insertAdjacentHTML('beforeend', html);
        var modalEl = root.querySelector('#muPlaylistPicker');

        function closePicker() { modalEl.remove(); }
        modalEl.querySelector('#muPickerCancel').addEventListener('click', closePicker);
        modalEl.querySelector('.mu-modal-backdrop').addEventListener('click', closePicker);

        modalEl.querySelectorAll('.mu-picker-item').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var playlistId = parseInt(btn.getAttribute('data-playlist'));
            cp.api.post(CP_BOOT.api.music, {
              action: 'add_to_playlist',
              playlist_id: playlistId,
              track_id: trackId
            }).then(function(r) {
              if (r.ok) {
                cp.toast('Added to playlist');
              } else {
                cp.toast(r.error || 'Failed');
              }
              closePicker();
            });
          });
        });
      }

      function renderPlaylists() {
        var html = '<div class="mu-playlist-actions">' +
          '<button class="mu-newplaylist" id="muNewPlaylist">' + svg('plus', 18) + ' New Playlist</button>' +
          '</div>';

        if (playlists.length === 0) {
          html += '<div class="mu-empty">' +
            '  ' + svg('list', 64) +
            '  <h2>No playlists</h2>' +
            '  <p>Create your first playlist</p>' +
            '</div>';
        } else {
          html += '<div class="mu-playlist-list">';
          for (var i = 0; i < playlists.length; i++) {
            var p = playlists[i];
            html += 
              '<div class="mu-playlist" data-id="' + p.id + '">' +
              '  <div class="mu-playlist-icon">' + svg('music', 24) + '</div>' +
              '  <div class="mu-playlist-info">' +
              '    <div class="mu-playlist-name">' + esc(p.name) + '</div>' +
              '    <div class="mu-playlist-meta">' + p.track_count + ' track' + (p.track_count !== 1 ? 's' : '') + '</div>' +
              '  </div>' +
              '  <button class="mu-playlist-del" data-del="' + p.id + '">' + svg('trash', 16) + '</button>' +
              '</div>';
          }
          html += '</div>';
        }
        content.innerHTML = html;

        root.querySelector('#muNewPlaylist').addEventListener('click', showNewPlaylistModal);

        content.querySelectorAll('.mu-playlist').forEach(function(el) {
          el.addEventListener('click', function(e) {
            if (e.target.closest('.mu-playlist-del')) return;
            var playlistId = parseInt(el.getAttribute('data-id'));
            openPlaylist(playlistId);
          });
        });

        content.querySelectorAll('.mu-playlist-del').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            deletePlaylist(parseInt(btn.getAttribute('data-del')));
          });
        });
      }

      function renderFavorites() {
        if (favorites.length === 0) {
          content.innerHTML = 
            '<div class="mu-empty">' +
            '  ' + svg('heart', 64) +
            '  <h2>No favorites</h2>' +
            '  <p>Tap the heart on songs you love</p>' +
            '</div>';
          return;
        }

        var html = '<div class="mu-track-list">';
        for (var i = 0; i < favorites.length; i++) {
          var t = favorites[i];
          var isCurrent = musicService.track && musicService.track.id === t.id;
          var playingClass = isCurrent && musicService.isPlaying ? ' playing' : '';
          var currentClass = isCurrent ? ' current' : '';
          
          var iconHtml;
          if (t.cover_filename) {
            iconHtml = '<img src="' + getCoverUrl(t.id) + '" alt="" class="mu-track-cover">';
          } else {
            iconHtml = isCurrent && musicService.isPlaying ? svg('pause', 24) : svg('play', 24);
          }
          
          html += 
            '<div class="mu-track' + currentClass + playingClass + '" data-id="' + t.id + '">' +
            '  <div class="mu-track-icon">' + iconHtml + '</div>' +
            '  <div class="mu-track-info">' +
            '    <div class="mu-track-title">' + esc(t.title) + '</div>' +
            '    <div class="mu-track-meta">' +
            (t.artist ? '<span>' + esc(t.artist) + '</span><span>•</span>' : '') +
            '      <span>' + fmtDuration(t.duration_ms) + '</span>' +
            '    </div>' +
            '  </div>' +
            '  <button class="mu-track-fav" data-fav="' + t.id + '">' + svg('heartFill', 18) + '</button>' +
            '</div>';
        }
        html += '</div>';
        content.innerHTML = html;

        content.querySelectorAll('.mu-track').forEach(function(el) {
          el.addEventListener('click', function(e) {
            if (e.target.closest('.mu-track-fav')) return;
            var trackId = parseInt(el.getAttribute('data-id'));
            playFromTrackId(trackId);
          });
        });

        content.querySelectorAll('.mu-track-fav').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleFavorite(parseInt(btn.getAttribute('data-fav')));
          });
        });
      }

      function openPlaylist(playlistId) {
        currentPlaylist = playlists.find(function(p) { return p.id === playlistId; });
        if (!currentPlaylist) return;

        cp.api.get(CP_BOOT.api.music + '?view=playlist_tracks&playlist_id=' + playlistId).then(function(d) {
          var playlistTracks = d.items || [];
          renderPlaylistView(playlistTracks);
        });
      }

      function renderPlaylistView(playlistTracks) {
        var html = 
          '<div class="mu-playlist-head">' +
          '  <button class="mu-backbtn" id="muPlaylistBack">' + svg('back', 20) + '</button>' +
          '  <div class="mu-playlist-head-info">' +
          '    <h2 class="mu-playlist-head-title">' + esc(currentPlaylist.name) + '</h2>' +
          '    <span class="mu-playlist-head-count">' + playlistTracks.length + ' tracks</span>' +
          '  </div>' +
          '  <button class="mu-playbtn-sm" id="muPlaylistPlay">' + svg('play', 20) + '</button>' +
          '</div>';

        if (playlistTracks.length === 0) {
          html += '<div class="mu-empty"><h2>Empty playlist</h2><p>Add songs from your library</p></div>';
        } else {
          html += '<div class="mu-track-list">';
          for (var i = 0; i < playlistTracks.length; i++) {
            var t = playlistTracks[i];
            var isCurrent = musicService.track && musicService.track.id === t.id;
            var playingClass = isCurrent && musicService.isPlaying ? ' playing' : '';
            var currentClass = isCurrent ? ' current' : '';
            
            html += 
              '<div class="mu-track' + currentClass + playingClass + '" data-id="' + t.id + '">' +
              '  <div class="mu-track-num">' + (i + 1) + '</div>' +
              '  <div class="mu-track-info">' +
              '    <div class="mu-track-title">' + esc(t.title) + '</div>' +
              '    <div class="mu-track-meta">' +
              (t.artist ? '<span>' + esc(t.artist) + '</span><span>•</span>' : '') +
              '      <span>' + fmtDuration(t.duration_ms) + '</span>' +
              '    </div>' +
              '  </div>' +
              '  <button class="mu-track-del" data-del="' + t.id + '">' + svg('close', 16) + '</button>' +
              '</div>';
          }
          html += '</div>';
        }
        content.innerHTML = html;

        root.querySelector('#muPlaylistBack').addEventListener('click', function() {
          currentPlaylist = null;
          render();
        });

        root.querySelector('#muPlaylistPlay').addEventListener('click', function() {
          if (playlistTracks.length > 0) {
            musicService.setQueue(playlistTracks, 0);
          }
        });

        content.querySelectorAll('.mu-track').forEach(function(el) {
          el.addEventListener('click', function(e) {
            if (e.target.closest('.mu-track-del')) return;
            var trackId = parseInt(el.getAttribute('data-id'));
            var idx = playlistTracks.findIndex(function(t) { return t.id === trackId; });
            if (idx >= 0) {
              musicService.setQueue(playlistTracks, idx);
            }
          });
        });

        content.querySelectorAll('.mu-track-del').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var trackId = parseInt(btn.getAttribute('data-del'));
            cp.api.post(CP_BOOT.api.music, {
              action: 'remove_from_playlist',
              playlist_id: currentPlaylist.id,
              track_id: trackId
            }).then(function(r) {
              if (r.ok) {
                cp.toast('Removed from playlist');
                openPlaylist(currentPlaylist.id);
              }
            });
          });
        });
      }

      function playFromTrackId(trackId) {
        var track = tracks.find(function(t) { return t.id === trackId; });
        if (!track) {
          track = favorites.find(function(t) { return t.id === trackId; });
        }
        if (!track) return;

        var queue = [];
        if (currentTab === 'library') queue = tracks;
        else if (currentTab === 'favorites') queue = favorites;
        else queue = tracks;
        
        var idx = queue.findIndex(function(t) { return t.id === trackId; });
        if (idx >= 0) {
          musicService.setQueue(queue, idx);
        } else {
          musicService.play(track);
        }
      }

      function updatePlayerFromService() {
        var st = musicService.getState();
        
        if (st.track) {
          playerTitle.textContent = st.track.title;
          playerArtist.textContent = st.track.artist || 'Unknown Artist';
          
          if (st.track.cover_filename) {
            playerArt.innerHTML = '<img src="' + getCoverUrl(st.track.id) + '" alt="" class="mu-cover-img">';
          } else {
            playerArt.innerHTML = svg('music', 32);
          }
        } else {
          playerTitle.textContent = 'No track selected';
          playerArtist.textContent = 'Select a song to play';
          playerArt.innerHTML = svg('music', 32);
        }
        
        playPauseBtn.innerHTML = st.isPlaying ? svg('pause', 24) : svg('play', 24);
        updateModeButtons();
        updatePlayButton();
      }

      function updateModeButtons() {
        var mode = musicService.mode;
        shuffleBtn.classList.remove('active');
        repeatBtn.classList.remove('active', 'repeat-one');
        
        if (mode === 'shuffle') {
          shuffleBtn.classList.add('active');
          repeatBtn.innerHTML = svg('repeat', 18);
        } else if (mode === 'repeat_all') {
          repeatBtn.classList.add('active');
          repeatBtn.innerHTML = svg('repeat', 18);
        } else if (mode === 'repeat_one') {
          repeatBtn.classList.add('active', 'repeat-one');
          repeatBtn.innerHTML = svg('repeatOne', 18);
        } else {
          repeatBtn.innerHTML = svg('repeat', 18);
        }
      }

      function updatePlayButton() {
        content.querySelectorAll('.mu-track').forEach(function(el) {
          var trackId = parseInt(el.getAttribute('data-id'));
          var track = tracks.find(function(t) { return t.id === trackId; }) ||
                      favorites.find(function(t) { return t.id === trackId; });
          var isCurrent = musicService.track && musicService.track.id === trackId;
          var iconEl = el.querySelector('.mu-track-icon');
          if (iconEl && track) {
            if (isCurrent && musicService.isPlaying) {
              el.classList.add('current', 'playing');
              if (track.cover_filename) {
                iconEl.innerHTML = '<img src="' + getCoverUrl(track.id) + '" alt="" class="mu-track-cover">';
              } else {
                iconEl.innerHTML = svg('pause', 24);
              }
            } else if (isCurrent) {
              el.classList.add('current');
              el.classList.remove('playing');
              if (track.cover_filename) {
                iconEl.innerHTML = '<img src="' + getCoverUrl(track.id) + '" alt="" class="mu-track-cover">';
              } else {
                iconEl.innerHTML = svg('play', 24);
              }
            } else {
              el.classList.remove('current', 'playing');
              if (track.cover_filename) {
                iconEl.innerHTML = '<img src="' + getCoverUrl(track.id) + '" alt="" class="mu-track-cover">';
              } else {
                iconEl.innerHTML = svg('play', 24);
              }
            }
          }
        });
      }

      function updateProgress(current, duration) {
        if (!duration) return;
        var percent = (current / duration) * 100;
        progressFill.style.width = percent + '%';
        progressThumb.style.left = percent + '%';
        currentTimeEl.textContent = fmtDuration(current * 1000);
        totalTimeEl.textContent = fmtDuration(duration * 1000);
      }

      function seekTo(e) {
        if (!musicService.audio.duration) return;
        var rect = progressBar.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var percent = Math.max(0, Math.min(1, x / rect.width));
        musicService.audio.currentTime = percent * musicService.audio.duration;
        updateProgress(musicService.audio.currentTime, musicService.audio.duration);
      }

      function toggleFavorite(trackId) {
        cp.api.post(CP_BOOT.api.music, {
          action: 'toggle_favorite',
          track_id: trackId
        }).then(function(r) {
          if (r.ok) {
            var track = tracks.find(function(t) { return t.id === trackId; });
            if (track) track.is_favorite = r.is_favorite ? 1 : 0;
            
            var favTrack = favorites.find(function(t) { return t.id === trackId; });
            if (favTrack && !r.is_favorite) {
              favorites = favorites.filter(function(t) { return t.id !== trackId; });
            } else if (track && r.is_favorite && !favTrack) {
              favorites.push(track);
            }
            
            render();
            cp.toast(r.is_favorite ? 'Added to favorites' : 'Removed from favorites');
          }
        });
      }

      function deleteTrack(trackId) {
        if (!confirm('Delete this track?')) return;
        cp.api.post(CP_BOOT.api.music, {
          action: 'delete_track',
          track_id: trackId
        }).then(function(r) {
          if (r.ok) {
            tracks = tracks.filter(function(t) { return t.id !== trackId; });
            favorites = favorites.filter(function(t) { return t.id !== trackId; });
            
            if (musicService.track && musicService.track.id === trackId) {
              musicService.stop();
            }
            
            render();
            cp.toast('Track deleted');
          }
        });
      }

      function showNewPlaylistModal() {
        var modal = 
          '<div class="mu-modal" id="muModal">' +
          '  <div class="mu-modal-backdrop"></div>' +
          '  <div class="mu-modal-content">' +
          '    <h2 class="mu-modal-title">New Playlist</h2>' +
          '    <input class="mu-modal-input" id="muPlaylistName" placeholder="Playlist name" maxlength="100">' +
          '    <div class="mu-modal-btns">' +
          '      <button class="mu-btn mu-btn-secondary" id="muModalCancel">Cancel</button>' +
          '      <button class="mu-btn mu-btn-primary" id="muModalSave">Create</button>' +
          '    </div>' +
          '  </div>' +
          '</div>';
        
        root.insertAdjacentHTML('beforeend', modal);
        var modalEl = root.querySelector('#muModal');

        modalEl.querySelector('#muModalCancel').addEventListener('click', function() { modalEl.remove(); });
        modalEl.querySelector('.mu-modal-backdrop').addEventListener('click', function() { modalEl.remove(); });

        modalEl.querySelector('#muModalSave').addEventListener('click', function() {
          var name = root.querySelector('#muPlaylistName').value.trim();
          if (!name) {
            cp.toast('Name required');
            return;
          }
          cp.api.post(CP_BOOT.api.music, {
            action: 'create_playlist',
            name: name
          }).then(function(r) {
            if (r.ok) {
              cp.toast('Playlist created');
              modalEl.remove();
              loadPlaylists().then(render);
            } else {
              cp.toast(r.error || 'Failed');
            }
          });
        });
      }

      function deletePlaylist(playlistId) {
        if (!confirm('Delete this playlist?')) return;
        cp.api.post(CP_BOOT.api.music, {
          action: 'delete_playlist',
          playlist_id: playlistId
        }).then(function(r) {
          if (r.ok) {
            playlists = playlists.filter(function(p) { return p.id !== playlistId; });
            render();
            cp.toast('Playlist deleted');
          }
        });
      }

      // ✨ Upload with Cover
      root.querySelector('#muUploadBtn').addEventListener('click', function() {
        showUploadModal();
      });

      function showUploadModal() {
        var modal = 
          '<div class="mu-modal" id="muUploadModal">' +
          '  <div class="mu-modal-backdrop"></div>' +
          '  <div class="mu-modal-content">' +
          '    <h2 class="mu-modal-title">Upload Track</h2>' +
          '    <div class="mu-upload-file-row">' +
          '      <button class="mu-btn mu-btn-secondary" id="muSelectFile" style="width:100%">' +
          '        ' + svg('upload', 18) + ' Select Audio File' +
          '      </button>' +
          '      <span class="mu-upload-file-name" id="muFileName">No file selected</span>' +
          '    </div>' +
          '    <input type="file" id="muFileInput" accept="audio/*" hidden>' +
          '    <input class="mu-modal-input" id="muTrackTitle" placeholder="Title (optional)" maxlength="200">' +
          '    <input class="mu-modal-input" id="muTrackArtist" placeholder="Artist (optional)" maxlength="100">' +
          '    <div class="mu-cover-upload">' +
          '      <div class="mu-cover-preview" id="muCoverPreview">' + svg('music', 32) + '</div>' +
          '      <button class="mu-btn mu-btn-secondary" id="muSelectCover">Choose Cover</button>' +
          '      <input type="file" id="muCoverInput" accept="image/*" hidden>' +
          '    </div>' +
          '    <div class="mu-modal-btns">' +
          '      <button class="mu-btn mu-btn-secondary" id="muUploadCancel">Cancel</button>' +
          '      <button class="mu-btn mu-btn-primary" id="muUploadSave">Upload</button>' +
          '    </div>' +
          '  </div>' +
          '</div>';
        
        root.insertAdjacentHTML('beforeend', modal);
        var modalEl = root.querySelector('#muUploadModal');
        var audioFile = null;
        var coverFile = null;
        var coverPreview = modalEl.querySelector('#muCoverPreview');
        var fileNameEl = modalEl.querySelector('#muFileName');
        
        modalEl.querySelector('#muSelectFile').addEventListener('click', function() {
          modalEl.querySelector('#muFileInput').click();
        });
        
        modalEl.querySelector('#muFileInput').addEventListener('change', function(e) {
          var f = e.target.files[0];
          if (f && f.type.startsWith('audio/')) {
            audioFile = f;
            fileNameEl.textContent = f.name;
            // Auto-fill title
            var titleInput = modalEl.querySelector('#muTrackTitle');
            if (!titleInput.value) {
              titleInput.value = f.name.replace(/\.[^/.]+$/, '');
            }
          }
        });
        
        modalEl.querySelector('#muSelectCover').addEventListener('click', function() {
          modalEl.querySelector('#muCoverInput').click();
        });
        
        modalEl.querySelector('#muCoverInput').addEventListener('change', function(e) {
          var cover = e.target.files[0];
          if (cover && cover.type.startsWith('image/')) {
            coverFile = cover;
            var reader = new FileReader();
            reader.onload = function(ev) {
              coverPreview.innerHTML = '<img src="' + ev.target.result + '" alt="" class="mu-cover-img">';
            };
            reader.readAsDataURL(cover);
          }
        });

        modalEl.querySelector('#muUploadCancel').addEventListener('click', function() { modalEl.remove(); });
        modalEl.querySelector('.mu-modal-backdrop').addEventListener('click', function() { modalEl.remove(); });

        modalEl.querySelector('#muUploadSave').addEventListener('click', function() {
          if (!audioFile) {
            cp.toast('Please select an audio file');
            return;
          }
          
          var title = modalEl.querySelector('#muTrackTitle').value.trim();
          var artist = modalEl.querySelector('#muTrackArtist').value.trim();
          
          modalEl.remove();
          cp.toast('Uploading...');
          
          var tempAudio = new Audio();
          var objectUrl = URL.createObjectURL(audioFile);
          tempAudio.src = objectUrl;
          
          tempAudio.addEventListener('loadedmetadata', function() {
            var duration = tempAudio.duration * 1000;
            URL.revokeObjectURL(objectUrl);
            doUpload(audioFile, coverFile, title, artist, Math.floor(duration));
          });
          
          tempAudio.addEventListener('error', function() {
            URL.revokeObjectURL(objectUrl);
            doUpload(audioFile, coverFile, title, artist, 0);
          });
        });
      }

      function doUpload(audioFile, coverFile, title, artist, duration) {
        var fd = new FormData();
        fd.append('audio', audioFile);
        fd.append('title', title || audioFile.name.replace(/\.[^/.]+$/, ''));
        fd.append('artist', artist);
        fd.append('duration', duration);
        if (coverFile) {
          fd.append('cover', coverFile);
        }
        
        fetch(CP_BOOT.api.music, { method: 'POST', body: fd })
          .then(function(r) { return r.json(); })
          .then(function(r) {
            if (r.ok) {
              cp.toast('Track uploaded');
              loadAll();
            } else {
              cp.toast(r.error || 'Upload failed');
            }
          })
          .catch(function() {
            cp.toast('Upload failed');
          });
      }

      root.querySelectorAll('.mu-tab').forEach(function(btn) {
        btn.addEventListener('click', function() {
          currentTab = btn.getAttribute('data-tab');
          currentPlaylist = null;
          root.querySelectorAll('.mu-tab').forEach(function(b) {
            b.classList.toggle('active', b === btn);
          });
          render();
        });
      });

      playPauseBtn.addEventListener('click', function() {
        musicService.toggle();
      });
      
      root.querySelector('#muPrev').addEventListener('click', function() {
        musicService.prev();
      });
      
      root.querySelector('#muNext').addEventListener('click', function() {
        musicService.next();
      });
      
      shuffleBtn.addEventListener('click', function() {
        if (musicService.mode === 'shuffle') {
          musicService.setMode('normal');
        } else {
          musicService.setMode('shuffle');
        }
      });
      
      repeatBtn.addEventListener('click', function() {
        var modes = ['normal', 'repeat_all', 'repeat_one'];
        var idx = modes.indexOf(musicService.mode);
        musicService.setMode(modes[(idx + 1) % modes.length]);
      });

      progressBar.addEventListener('click', seekTo);
      
      var isDragging = false;
      progressThumb.addEventListener('mousedown', function(e) {
        isDragging = true;
        e.preventDefault();
      });
      document.addEventListener('mousemove', function(e) {
        if (isDragging) seekTo(e);
      });
      document.addEventListener('mouseup', function() {
        isDragging = false;
      });

      var unsubscribe = musicService.subscribe(function() {
        updatePlayerFromService();
        updatePlayButton();
      });

      musicService.onProgress(updateProgress);

      this._cleanup = function() {
        unsubscribe();
      };

      await loadAll();
      updatePlayerFromService();
    },

    unmount: function(root, cp) {
      if (this._cleanup) this._cleanup();
    }
  });
})();