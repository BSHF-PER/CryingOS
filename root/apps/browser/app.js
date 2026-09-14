/* Browser — Secure Web Proxy */
(function () {
  'use strict';

  CP.register('browser', {
    async mount(root, cp) {
      var currentUrl = '';
      var history = [];
      var historyIndex = -1;
      var isLoading = false;
      
      // Bookmarks (localStorage)
      var bookmarksKey = 'cp_browser_bookmarks_' + (cp.phone.uuid || '');
      var bookmarks = [];
      try {
        bookmarks = JSON.parse(localStorage.getItem(bookmarksKey)) || [];
      } catch(e) { bookmarks = []; }

      // ✨ Build absolute proxy path
      function getProxyBase() {
        var path = window.location.pathname;
        var base = path.substring(0, path.lastIndexOf('/') + 1);
        if (!base.endsWith('/')) base += '/';
        return base + 'api/browser.php?url=';
      }
      
      var PROXY_BASE = getProxyBase();
      console.log('🌐 Proxy base:', PROXY_BASE);

      var icons = {
        back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
        forward: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>',
        reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
        home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        go: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
        bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
        bookmarkFill: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        star: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
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

      function normalizeUrl(input) {
        input = input.trim();
        if (!input) return '';
        
        if (/^https?:\/\//i.test(input)) return input;
        
        if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(input)) {
          return 'https://' + input;
        }
        
        return 'https://duckduckgo.com/?q=' + encodeURIComponent(input) + '&ia=web';
      }

      function getDomain(url) {
        try {
          return new URL(url).hostname;
        } catch(e) {
          return '';
        }
      }

      function isBookmarked(url) {
        return bookmarks.some(function(b) { return b.url === url; });
      }

      function toggleBookmark() {
        if (!currentUrl) return;
        var idx = bookmarks.findIndex(function(b) { return b.url === currentUrl; });
        if (idx !== -1) {
          bookmarks.splice(idx, 1);
          cp.toast('Bookmark removed');
        } else {
          bookmarks.push({
            url: currentUrl,
            title: getDomain(currentUrl),
            added: Date.now()
          });
          cp.toast('Bookmark added');
        }
        try {
          localStorage.setItem(bookmarksKey, JSON.stringify(bookmarks));
        } catch(e) {}
        updateBookmarkBtn();
      }

      function updateBookmarkBtn() {
        var btn = root.querySelector('#brBookmark');
        if (!btn) return;
        btn.innerHTML = isBookmarked(currentUrl) ? svg('bookmarkFill', 18) : svg('bookmark', 18);
        btn.classList.toggle('is-bookmarked', isBookmarked(currentUrl));
      }

      // Build UI
      root.innerHTML =
        '<div class="br">' +
        '  <header class="br-toolbar">' +
        '    <div class="br-nav">' +
        '      <button class="br-btn" id="brBack" title="Back">' + svg('back', 18) + '</button>' +
        '      <button class="br-btn" id="brForward" title="Forward">' + svg('forward', 18) + '</button>' +
        '      <button class="br-btn" id="brReload" title="Reload">' + svg('reload', 18) + '</button>' +
        '      <button class="br-btn" id="brHome" title="Home">' + svg('home', 18) + '</button>' +
        '    </div>' +
        '    <form class="br-url-form" id="brUrlForm">' +
        '      <span class="br-url-icon" id="brUrlIcon">' + svg('globe', 14) + '</span>' +
        '      <input class="br-url-input" id="brUrlInput" placeholder="Search or enter website" autocomplete="off" spellcheck="false">' +
        '      <button class="br-go-btn" type="submit" title="Go">' + svg('go', 16) + '</button>' +
        '    </form>' +
        '    <button class="br-btn" id="brBookmark" title="Bookmark">' + svg('bookmark', 18) + '</button>' +
        '  </header>' +
        '  <div class="br-progress" id="brProgress"><div class="br-progress-bar"></div></div>' +
        '  <div class="br-stage" id="brStage">' +
        '    <div class="br-home" id="brHomeScreen">' +
        '      <div class="br-home-inner">' +
        '        <div class="br-home-logo">' + svg('globe', 64) + '</div>' +
        '        <h1 class="br-home-title">Browser</h1>' +
        '        <p class="br-home-sub">Secure private browsing via proxy</p>' +
        '        <div class="br-shortcuts" id="brShortcuts">' +
        '          <button class="br-shortcut" data-url="https://www.google.com/webhp?igu=1">' +
        '            <div class="br-shortcut-icon" style="background:#4285F4">G</div>' +
        '            <span>Google</span>' +
        '          </button>' +
        '          <button class="br-shortcut" data-url="https://duckduckgo.com">' +
        '            <div class="br-shortcut-icon" style="background:#DE5833">D</div>' +
        '            <span>DuckDuckGo</span>' +
        '          </button>' +
        '          <button class="br-shortcut" data-url="https://en.wikipedia.org">' +
        '            <div class="br-shortcut-icon" style="background:#000">W</div>' +
        '            <span>Wikipedia</span>' +
        '          </button>' +
        '          <button class="br-shortcut" data-url="https://github.com">' +
        '            <div class="br-shortcut-icon" style="background:#24292e">GH</div>' +
        '            <span>GitHub</span>' +
        '          </button>' +
        '        </div>' +
        '        <div class="br-bookmarks" id="brBookmarks"></div>' +
        '        <div class="br-home-footer">' +
        '          <p>🔒 Your browsing is protected by server-side proxy</p>' +
        '          <p class="br-home-note">Your real IP is never exposed</p>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '    <iframe class="br-iframe" id="brIframe" hidden sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe>' +
        '  </div>' +
        '</div>';

      var urlInput = root.querySelector('#brUrlInput');
      var urlForm = root.querySelector('#brUrlForm');
      var backBtn = root.querySelector('#brBack');
      var forwardBtn = root.querySelector('#brForward');
      var reloadBtn = root.querySelector('#brReload');
      var homeBtn = root.querySelector('#brHome');
      var bookmarkBtn = root.querySelector('#brBookmark');
      var iframe = root.querySelector('#brIframe');
      var homeScreen = root.querySelector('#brHomeScreen');
      var progressBar = root.querySelector('#brProgress');
      var urlIcon = root.querySelector('#brUrlIcon');
      var bookmarksEl = root.querySelector('#brBookmarks');

      function navigate(url, addToHistory) {
        if (addToHistory === undefined) addToHistory = true;
        url = normalizeUrl(url);
        if (!url) return;
        
        currentUrl = url;
        isLoading = true;
        
        urlInput.value = url;
        homeScreen.hidden = true;
        iframe.hidden = false;
        progressBar.classList.add('loading');
        urlIcon.innerHTML = url.startsWith('https://') ? svg('lock', 14) : svg('globe', 14);
        
        // ✨ استفاده از PROXY_BASE مطلق
        var proxyUrl = PROXY_BASE + encodeURIComponent(url);
        iframe.src = proxyUrl;
        
        if (addToHistory) {
          history = history.slice(0, historyIndex + 1);
          history.push(url);
          historyIndex = history.length - 1;
        }
        
        updateNavButtons();
        updateBookmarkBtn();
      }

      function goBack() {
        if (historyIndex > 0) {
          historyIndex--;
          navigate(history[historyIndex], false);
        } else if (historyIndex === 0) {
          showHome();
          historyIndex = -1;
          history = [];
        }
      }

      function goForward() {
        if (historyIndex < history.length - 1) {
          historyIndex++;
          navigate(history[historyIndex], false);
        }
      }

      function reload() {
        if (currentUrl) {
          iframe.src = iframe.src;
          progressBar.classList.add('loading');
        }
      }

      function showHome() {
        currentUrl = '';
        urlInput.value = '';
        homeScreen.hidden = false;
        iframe.hidden = true;
        try { iframe.src = 'about:blank'; } catch(e) {}
        progressBar.classList.remove('loading');
        urlIcon.innerHTML = svg('globe', 14);
        updateBookmarkBtn();
        renderBookmarks();
      }

      function updateNavButtons() {
        backBtn.disabled = historyIndex <= 0 && !currentUrl;
        forwardBtn.disabled = historyIndex >= history.length - 1;
      }

      function renderBookmarks() {
        if (bookmarks.length === 0) {
          bookmarksEl.innerHTML = '';
          return;
        }
        
        var html = '<h3 class="br-bookmarks-title">Bookmarks</h3><div class="br-bookmarks-list">';
        for (var i = 0; i < bookmarks.length; i++) {
          var b = bookmarks[i];
          var domain = getDomain(b.url);
          html +=
            '<button class="br-bookmark-item" data-url="' + esc(b.url) + '">' +
            '  <span class="br-bookmark-star">' + svg('star', 14) + '</span>' +
            '  <span class="br-bookmark-text">' + esc(b.title || domain) + '</span>' +
            '  <span class="br-bookmark-domain">' + esc(domain) + '</span>' +
            '  <span class="br-bookmark-del" data-del="' + i + '">' + svg('close', 14) + '</span>' +
            '</button>';
        }
        html += '</div>';
        bookmarksEl.innerHTML = html;
        
        bookmarksEl.querySelectorAll('.br-bookmark-item').forEach(function(el) {
          el.addEventListener('click', function(e) {
            if (e.target.closest('.br-bookmark-del')) return;
            navigate(el.getAttribute('data-url'));
          });
        });
        
        bookmarksEl.querySelectorAll('.br-bookmark-del').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var idx = parseInt(btn.getAttribute('data-del'));
            bookmarks.splice(idx, 1);
            try { localStorage.setItem(bookmarksKey, JSON.stringify(bookmarks)); } catch(e){}
            renderBookmarks();
            cp.toast('Bookmark removed');
          });
        });
      }

      // Events
      urlForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var val = urlInput.value.trim();
        if (val) navigate(val);
      });

      backBtn.addEventListener('click', goBack);
      forwardBtn.addEventListener('click', goForward);
      reloadBtn.addEventListener('click', reload);
      homeBtn.addEventListener('click', showHome);
      bookmarkBtn.addEventListener('click', toggleBookmark);

      root.querySelectorAll('.br-shortcut').forEach(function(btn) {
        btn.addEventListener('click', function() {
          navigate(btn.getAttribute('data-url'));
        });
      });

      iframe.addEventListener('load', function() {
        isLoading = false;
        progressBar.classList.remove('loading');
        
        try {
          var match = iframe.src.match(/[?&]url=([^&]+)/);
          if (match) {
            var decoded = decodeURIComponent(match[1]);
            if (decoded !== currentUrl) {
              currentUrl = decoded;
              urlInput.value = decoded;
              if (history[historyIndex] !== decoded) {
                history = history.slice(0, historyIndex + 1);
                history.push(decoded);
                historyIndex = history.length - 1;
                updateNavButtons();
              }
            }
            urlIcon.innerHTML = decoded.startsWith('https://') ? svg('lock', 14) : svg('globe', 14);
            updateBookmarkBtn();
          }
        } catch(e) {}
      });

      urlInput.addEventListener('focus', function() {
        urlInput.select();
      });

      var keyHandler = function(e) {
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'l') {
            e.preventDefault();
            urlInput.focus();
          } else if (e.key === 'r') {
            e.preventDefault();
            reload();
          } else if (e.key === 'd') {
            e.preventDefault();
            toggleBookmark();
          }
        }
      };
      document.addEventListener('keydown', keyHandler);

      this._cleanup = function() {
        document.removeEventListener('keydown', keyHandler);
        try { iframe.src = 'about:blank'; } catch(e) {}
      };

      renderBookmarks();
      updateNavButtons();
    },

    unmount: function(root, cp) {
      if (this._cleanup) this._cleanup();
    }
  });
})();