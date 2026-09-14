/* App Store — iOS Liquid Glass Design */
(function () {
  'use strict';

  CP.register('appstore', {
    async mount(root, cp) {
      const d = await cp.api.get(CP_BOOT.api.apps + '?all=1');
      const apps = d.apps || [];

      const categories = [
        { id: 'all', name: 'All Apps', icon: 'apps' },
        { id: 'system', name: 'System', icon: 'settings' },
        { id: 'tools', name: 'Utilities', icon: 'tools' },
        { id: 'media', name: 'Media', icon: 'media' },
        { id: 'social', name: 'Social', icon: 'social' },
      ];

      const appCategories = {
        calculator: 'tools',
        gallery: 'media',
        camera: 'media',
        browser: 'tools',
        settings: 'system',
        appstore: 'system',
      };

      let activeCat = 'all';
      let searchQuery = '';

      root.innerHTML = `
        <div class="as">
          <header class="as-head">
            <div class="as-greeting">
              <span class="as-date" id="asDate"></span>
              <h1 class="as-title">App Store</h1>
            </div>
            <div class="as-search">
              <svg class="as-search-icon" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <input class="as-search-input" id="asSearch" placeholder="Search apps">
            </div>
          </header>

          <section class="as-featured" id="asFeatured"></section>
          <nav class="as-cats" id="asCats"></nav>
          <section class="as-list" id="asList"></section>

          <footer class="as-foot">
            <p>Crying OS App Store v2.0</p>
            <p class="as-foot-small">Designed for you</p>
          </footer>
        </div>`;

      const $ = s => root.querySelector(s);
      const featuredEl = $('#asFeatured');
      const catsEl = $('#asCats');
      const listEl = $('#asList');
      const searchInput = $('#asSearch');
      const dateEl = $('#asDate');

      const now = new Date();
      dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

      function esc(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
      }

      function getSVG(name, size = 24) {
        const icons = {
          apps: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="2" stroke="currentColor" stroke-width="2"/></svg>`,
          settings: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2"/></svg>`,
          tools: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2"/></svg>`,
          media: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" stroke="currentColor" stroke-width="2"/><path d="m10 8 6 4-6 4V8z" stroke="currentColor" stroke-width="2"/></svg>`,
          social: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2"/></svg>`,
          star: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
          close: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
        };
        return icons[name] || icons.apps;
      }

      function getAppIcon(app, size = 56) {
        if (app.iconType === 'image' && app.iconSrc) {
          return `<span class="as-icon-img" style="width:${size}px;height:${size}px">
                    <img src="${esc(app.iconSrc)}" alt="${esc(app.name)}"
                         onerror="this.parentElement.innerHTML='${esc(app.icon)}';this.parentElement.classList.add('as-icon-emoji')">
                  </span>`;
        }
        return `<span class="as-icon-emoji" style="--accent:${app.color};width:${size}px;height:${size}px">${esc(app.icon)}</span>`;
      }

      function renderFeatured() {
        const featured = apps.find(a => a.removable && a.slug !== 'appstore');
        if (!featured) {
          featuredEl.hidden = true;
          return;
        }

        featuredEl.innerHTML = `
          <div class="as-feat-card" style="--accent:${featured.color}">
            <div class="as-feat-bg"></div>
            <div class="as-feat-content">
              <span class="as-feat-tag">APP OF THE DAY</span>
              <h2 class="as-feat-title">${esc(featured.name)}</h2>
              <p class="as-feat-desc">${esc(featured.description || '')}</p>
              <button class="as-feat-btn" data-slug="${featured.slug}">
                ${featured.installed ? 'OPEN' : 'GET'}
              </button>
            </div>
            <div class="as-feat-icon">
              ${getAppIcon(featured, 80)}
            </div>
          </div>`;

        featuredEl.querySelector('.as-feat-btn').addEventListener('click', e => {
          handleAction(e.currentTarget, featured);
        });
      }

      function renderCats() {
        catsEl.innerHTML = categories.map(c =>
          `<button class="as-cat ${c.id === activeCat ? 'active' : ''}" data-cat="${c.id}">
            <span class="as-cat-icon">${getSVG(c.icon, 16)}</span>
            <span class="as-cat-name">${esc(c.name)}</span>
          </button>`
        ).join('');

        catsEl.querySelectorAll('.as-cat').forEach(btn => {
          btn.addEventListener('click', () => {
            activeCat = btn.dataset.cat;
            renderCats();
            renderList();
          });
        });
      }

      function renderList() {
        let filtered = apps.filter(a => a.slug !== 'appstore');

        if (activeCat !== 'all') {
          filtered = filtered.filter(a => appCategories[a.slug] === activeCat);
        }

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(a =>
            a.name.toLowerCase().includes(q) ||
            (a.description || '').toLowerCase().includes(q)
          );
        }

        if (filtered.length === 0) {
          listEl.innerHTML = `<div class="as-empty">
            <div class="as-empty-icon">${getSVG('apps', 48)}</div>
            <p>No apps found</p>
          </div>`;
          return;
        }

        listEl.innerHTML = filtered.map(app => `
          <div class="as-card" data-slug="${app.slug}">
            <div class="as-card-icon">
              ${getAppIcon(app, 56)}
            </div>
            <div class="as-card-info">
              <h3 class="as-card-name">${esc(app.name)}</h3>
              <p class="as-card-desc">${esc(app.description || '')}</p>
              <div class="as-card-meta">
                <span class="as-card-rating">${getSVG('star', 12)} 4.8</span>
                <span class="as-card-ver">v${esc(app.version)}</span>
              </div>
            </div>
            <div class="as-card-action">
              ${app.installed
                ? (app.removable
                    ? `<button class="as-btn as-btn-open">OPEN</button>
                       <button class="as-btn as-btn-del">${getSVG('close', 16)}</button>`
                    : `<span class="as-btn as-btn-system">SYSTEM</span>`)
                : `<button class="as-btn as-btn-get">GET</button>`}
            </div>
          </div>
        `).join('');

        listEl.querySelectorAll('.as-card').forEach(card => {
          const slug = card.dataset.slug;
          const app = apps.find(a => a.slug === slug);

          const getBtn = card.querySelector('.as-btn-get');
          const openBtn = card.querySelector('.as-btn-open');
          const delBtn = card.querySelector('.as-btn-del');

          if (getBtn) getBtn.addEventListener('click', e => handleAction(e.currentTarget, app));
          if (openBtn) openBtn.addEventListener('click', e => handleAction(e.currentTarget, app));
          if (delBtn) delBtn.addEventListener('click', e => handleAction(e.currentTarget, app));
        });
      }

      async function handleAction(btn, app) {
        if (btn.classList.contains('as-btn-get')) {
          const r = await cp.api.post(CP_BOOT.api.apps, { action: 'install', slug: app.slug });
          if (r.ok) {
            app.installed = true;
            renderList();
            renderFeatured();
            cp.emit('app:installed', app);
            cp.toast(`${app.name} installed`);
          } else {
            cp.toast(r.error || 'Error');
          }
        } else if (btn.classList.contains('as-btn-del')) {
          const r = await cp.api.post(CP_BOOT.api.apps, { action: 'remove', slug: app.slug });
          if (r.ok) {
            app.installed = false;
            renderList();
            renderFeatured();
            cp.emit('app:removed', app.slug);
            cp.toast(`${app.name} removed`);
          } else {
            cp.toast(r.error || 'Error');
          }
        } else if (btn.classList.contains('as-btn-open')) {
          cp.openApp(app.slug);
        }
      }

      searchInput.addEventListener('input', e => {
        searchQuery = e.target.value;
        renderList();
      });

      renderFeatured();
      renderCats();
      renderList();
    }
  });
})();