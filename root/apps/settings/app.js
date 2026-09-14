/* Settings — iOS Style */
(function () {
  'use strict';

  CP.register('settings', {
    async mount(root, cp) {
      let currentView = 'main';
      let lockEnabled = cp.phone.lock_enabled || false;
      let viewStack = [];

      const icons = {
        back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
        chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>',
        lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
        brush: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>',
        palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
        storage: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
        copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
        camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
        image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
        user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
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

      function getPhoneAge() {
        const created = new Date(cp.phone.created_at);
        const now = new Date();
        const diff = Math.floor((now - created) / 86400000);
        return diff === 0 ? 'Today' : diff === 1 ? '1 day' : `${diff} days`;
      }

      async function copyUUID() {
        try {
          await navigator.clipboard.writeText(cp.phone.uuid);
          cp.toast('UUID copied to clipboard');
        } catch (e) {
          cp.toast('Failed to copy');
        }
      }

      function render() {
        if (currentView === 'main') renderMain();
        else if (currentView === 'security') renderSecurity();
        else if (currentView === 'appearance') renderAppearance();
        else if (currentView === 'storage') renderStorage();
        else if (currentView === 'about') renderAbout();
        else if (currentView === 'reset') renderReset();
      }

      function shell(title, back, content) {
        root.innerHTML = `
          <div class="st">
            <header class="st-head">
              ${back ? `<button class="st-back" id="stBack">${svg('back', 20)}</button>` : '<span></span>'}
              <h1 class="st-title">${esc(title)}</h1>
              <span class="st-head-spacer"></span>
            </header>
            <main class="st-main">
              ${content}
            </main>
          </div>`;
        
        if (back) {
          root.querySelector('#stBack').addEventListener('click', () => {
            currentView = viewStack.pop() || 'main';
            render();
          });
        }
      }

      function row(icon, iconBg, title, subtitle, action = 'chevron') {
        const right = action === 'chevron'
          ? `<span class="st-row-chevron">${svg('chevron', 18)}</span>`
          : action === 'none' ? '' : action;
        return `
          <div class="st-row" data-row="${title}">
            <span class="st-row-icon" style="--row-bg:${iconBg}">${svg(icon, 18)}</span>
            <div class="st-row-text">
              <span class="st-row-title">${esc(title)}</span>
              ${subtitle ? `<span class="st-row-sub">${esc(subtitle)}</span>` : ''}
            </div>
            ${right}
          </div>`;
      }

      function group(label, rows) {
        return `
          <section class="st-group">
            ${label ? `<h2 class="st-group-label">${esc(label)}</h2>` : ''}
            <div class="st-card">${rows}</div>
          </section>`;
      }

      function renderMain() {
        const content = `
          <div class="st-profile">
            <div class="st-avatar">${svg('user', 40)}</div>
            <div class="st-profile-info">
              <div class="st-profile-name">Crying OS</div>
              <div class="st-profile-uuid" id="stProfileUuid">${esc(cp.phone.uuid)}</div>
            </div>
            <button class="st-copy" id="stProfileCopy">${svg('copy', 18)}</button>
          </div>

          ${group('GENERAL',
            row('shield', '#34C759', 'Security', lockEnabled ? 'Passcode is on' : 'Passcode is off', 'chevron') +
            row('palette', '#007AFF', 'Appearance', 'Wallpaper & theme', 'chevron')
          )}

          ${group('DATA',
            row('storage', '#8E8E93', 'Storage', 'Manage your data', 'chevron')
          )}

          ${group('INFORMATION',
            row('info', '#48484A', 'About', 'Version & details', 'chevron')
          )}

          ${group('',
            row('reset', '#FF3B30', 'Reset', '', 'chevron')
          )}
        `;

        shell('Settings', false, content);

        root.querySelector('#stProfileCopy').addEventListener('click', copyUUID);
        root.querySelector('#stProfileUuid').addEventListener('click', copyUUID);

        root.querySelectorAll('.st-row').forEach(r => {
          r.addEventListener('click', () => {
            const t = r.dataset.row;
            if (t === 'Security') goTo('security');
            else if (t === 'Appearance') goTo('appearance');
            else if (t === 'Storage') goTo('storage');
            else if (t === 'About') goTo('about');
            else if (t === 'Reset') goTo('reset');
          });
        });
      }

      function goTo(view) {
        viewStack.push(currentView);
        currentView = view;
        render();
      }

      function renderSecurity() {
        const content = `
          <section class="st-group">
            <div class="st-card">
              <div class="st-row st-row-toggle" id="stLockRow">
                <span class="st-row-icon" style="--row-bg:#34C759">${svg('lock', 18)}</span>
                <div class="st-row-text">
                  <span class="st-row-title">Passcode</span>
                  <span class="st-row-sub">${lockEnabled ? 'Your phone is protected' : 'No passcode set'}</span>
                </div>
                <button class="st-toggle ${lockEnabled ? 'on' : ''}" id="stLockToggle">
                  <span class="st-toggle-knob"></span>
                </button>
              </div>
            </div>
          </section>

          <div id="stLockArea"></div>

          <section class="st-group">
            <p class="st-note">When enabled, you'll need to enter your passcode every time the phone locks.</p>
          </section>
        `;

        shell('Security', true, content);

        const toggle = root.querySelector('#stLockToggle');
        toggle.addEventListener('click', () => {
          if (lockEnabled) {
            showRemovePasscode();
          } else {
            showSetPasscode();
          }
        });

        renderLockArea();
      }

      function renderLockArea() {
        const area = root.querySelector('#stLockArea');
        if (!area) return;
        if (!lockEnabled) { area.innerHTML = ''; return; }

        area.innerHTML = `
          <section class="st-group">
            <div class="st-card">
              <div class="st-row" data-action="change">
                <span class="st-row-icon" style="--row-bg:#007AFF">${svg('key', 18)}</span>
                <div class="st-row-text">
                  <span class="st-row-title">Change Passcode</span>
                </div>
                ${svg('chevron', 18)}
              </div>
            </div>
          </section>
        `;

        area.querySelector('[data-action="change"]').addEventListener('click', () => {
          showSetPasscode('change');
        });
      }

      function showSetPasscode(mode = 'new') {
        const isChange = mode === 'change';
        const modal = `
          <div class="st-modal" id="stModal">
            <div class="st-modal-backdrop"></div>
            <div class="st-modal-content">
              <h2 class="st-modal-title">${isChange ? 'Change Passcode' : 'Set Passcode'}</h2>
              <p class="st-modal-sub">Enter a passcode (min 4 characters)</p>
              ${isChange ? `
                <input class="st-input" type="password" id="stCurPass" placeholder="Current passcode" autocomplete="off">
              ` : ''}
              <input class="st-input" type="password" id="stNewPass" placeholder="New passcode" autocomplete="off">
              <input class="st-input" type="password" id="stConfPass" placeholder="Confirm passcode" autocomplete="off">
              <div class="st-modal-err" id="stModalErr" hidden></div>
              <div class="st-modal-btns">
                <button class="st-btn st-btn-secondary" id="stModalCancel">Cancel</button>
                <button class="st-btn st-btn-primary" id="stModalSave">Save</button>
              </div>
            </div>
          </div>`;
        
        root.insertAdjacentHTML('beforeend', modal);
        const modalEl = root.querySelector('#stModal');

        modalEl.querySelector('#stModalCancel').addEventListener('click', () => modalEl.remove());
        modalEl.querySelector('.st-modal-backdrop').addEventListener('click', () => modalEl.remove());

        modalEl.querySelector('#stModalSave').addEventListener('click', async () => {
          const err = modalEl.querySelector('#stModalErr');
          const newPass = modalEl.querySelector('#stNewPass').value;
          const confPass = modalEl.querySelector('#stConfPass').value;

          if (isChange) {
            const curPass = modalEl.querySelector('#stCurPass').value;
            const check = await cp.api.post(CP_BOOT.api.settings, { action: 'check_password', password: curPass });
            if (!check.ok) {
              err.textContent = 'Current passcode is incorrect';
              err.hidden = false;
              return;
            }
          }

          if (newPass.length < 4) {
            err.textContent = 'Passcode must be at least 4 characters';
            err.hidden = false;
            return;
          }
          if (newPass !== confPass) {
            err.textContent = 'Passcodes do not match';
            err.hidden = false;
            return;
          }

          const r = await cp.api.post(CP_BOOT.api.settings, { action: 'set_password', password: newPass });
          if (r.ok) {
            lockEnabled = true;
            cp.phone.lock_enabled = true;
            cp.toast('Passcode saved');
            modalEl.remove();
            render();
          } else {
            err.textContent = r.error || 'Failed to save';
            err.hidden = false;
          }
        });
      }

      function showRemovePasscode() {
        const modal = `
          <div class="st-modal" id="stModal">
            <div class="st-modal-backdrop"></div>
            <div class="st-modal-content">
              <h2 class="st-modal-title">Turn Off Passcode</h2>
              <p class="st-modal-sub">Enter your current passcode to continue</p>
              <input class="st-input" type="password" id="stCurPass" placeholder="Current passcode" autocomplete="off">
              <div class="st-modal-err" id="stModalErr" hidden></div>
              <div class="st-modal-btns">
                <button class="st-btn st-btn-secondary" id="stModalCancel">Cancel</button>
                <button class="st-btn st-btn-danger" id="stModalSave">Turn Off</button>
              </div>
            </div>
          </div>`;
        
        root.insertAdjacentHTML('beforeend', modal);
        const modalEl = root.querySelector('#stModal');

        modalEl.querySelector('#stModalCancel').addEventListener('click', () => modalEl.remove());
        modalEl.querySelector('.st-modal-backdrop').addEventListener('click', () => modalEl.remove());

        modalEl.querySelector('#stModalSave').addEventListener('click', async () => {
          const err = modalEl.querySelector('#stModalErr');
          const curPass = modalEl.querySelector('#stCurPass').value;
          const check = await cp.api.post(CP_BOOT.api.settings, { action: 'check_password', password: curPass });
          if (!check.ok) {
            err.textContent = 'Incorrect passcode';
            err.hidden = false;
            return;
          }
          const r = await cp.api.post(CP_BOOT.api.settings, { action: 'clear_password' });
          if (r.ok) {
            lockEnabled = false;
            cp.phone.lock_enabled = false;
            cp.toast('Passcode turned off');
            modalEl.remove();
            render();
          }
        });
      }

      async function renderAppearance() {
        const presets = [
          { id: 'midnight', name: 'Midnight', css: 'linear-gradient(180deg,#0b1430,#f0a35e)' },
          { id: 'ocean', name: 'Ocean', css: 'linear-gradient(180deg,#2E3192,#1BFFFF)' },
          { id: 'sunset', name: 'Sunset', css: 'linear-gradient(180deg,#FF512F,#DD2476)' },
          { id: 'forest', name: 'Forest', css: 'linear-gradient(180deg,#134E5E,#71B280)' },
          { id: 'aurora', name: 'Aurora', css: 'linear-gradient(135deg,#7F00FF,#E100FF)' },
          { id: 'dawn', name: 'Dawn', css: 'linear-gradient(135deg,#667eea,#764ba2)' },
          { id: 'cherry', name: 'Cherry', css: 'linear-gradient(180deg,#EB3349,#F45C43)' },
          { id: 'royal', name: 'Royal', css: 'linear-gradient(180deg,#141E30,#243B55)' },
          { id: 'graphite', name: 'Graphite', css: 'linear-gradient(180deg,#232526,#414345)' },
        ];

        // Get current wallpaper from boot data
        const currentWall = window.CP_BOOT.wallpaper || { type: 'preset', value: 'midnight' };
        
        const content = `
          <section class="st-group">
            <h2 class="st-group-label">PRESETS</h2>
            <div class="st-wall-grid" id="stWallGrid">
              ${presets.map(w => `
                <div class="st-wall ${currentWall.value === w.id && currentWall.type === 'preset' ? 'active' : ''}" data-wall="${w.id}">
                  <div class="st-wall-preview" style="background:${w.css}"></div>
                  <span class="st-wall-name">${esc(w.name)}</span>
                </div>
              `).join('')}
            </div>
          </section>

          <section class="st-group">
            <h2 class="st-group-label">CUSTOM</h2>
            <div class="st-card">
              <div class="st-row" id="stUploadWall">
                <span class="st-row-icon" style="--row-bg:#007AFF">
                  ${svg('upload', 18)}
                </span>
                <div class="st-row-text">
                  <span class="st-row-title">Upload Photo</span>
                  <span class="st-row-sub">Use your own image as wallpaper</span>
                </div>
                ${svg('chevron', 18)}
              </div>
              ${currentWall.type === 'upload' ? `
                <div class="st-row st-row-divider" id="stRemoveWall">
                  <span class="st-row-icon" style="--row-bg:#FF3B30">
                    ${svg('trash', 18)}
                  </span>
                  <div class="st-row-text">
                    <span class="st-row-title">Remove Custom Wallpaper</span>
                    <span class="st-row-sub">Switch back to a preset</span>
                  </div>
                </div>
              ` : ''}
            </div>
            <input type="file" id="stWallFile" accept="image/*" hidden>
          </section>
        `;

        shell('Appearance', true, content);

        // Preset selection
        root.querySelectorAll('.st-wall').forEach(w => {
          w.addEventListener('click', async () => {
            const preset = w.dataset.wall;
            cp.toast('Setting wallpaper...');
            const r = await cp.api.post(CP_BOOT.api.wallpaper, { action: 'set_preset', preset });
            if (r.ok) {
              cp.setWallpaper('preset', preset, null);
              cp.toast(`Wallpaper set to ${preset}`);
              render();
            } else {
              cp.toast(r.error || 'Failed to set wallpaper');
            }
          });
        });

        // Upload custom wallpaper
        const fileInput = root.querySelector('#stWallFile');
        root.querySelector('#stUploadWall').addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', async e => {
          const file = e.target.files[0];
          if (!file) return;
          
          if (!file.type.startsWith('image/')) {
            cp.toast('Please select an image');
            return;
          }
          if (file.size > 5 * 1024 * 1024) {
            cp.toast('Max file size is 5MB');
            return;
          }
          
          cp.toast('Uploading wallpaper...');
          const fd = new FormData();
          fd.append('wallpaper', file);
          
          const r = await (await fetch(CP_BOOT.api.wallpaper, { method: 'POST', body: fd })).json();
          if (r.ok) {
            cp.setWallpaper('upload', r.value, r.url);
            cp.toast('Wallpaper updated');
            render();
          } else {
            cp.toast(r.error || 'Upload failed');
          }
        });

        // Remove custom wallpaper
        const removeBtn = root.querySelector('#stRemoveWall');
        if (removeBtn) {
          removeBtn.addEventListener('click', async () => {
            cp.toast('Removing wallpaper...');
            const r = await cp.api.post(CP_BOOT.api.wallpaper, { action: 'set_preset', preset: 'midnight' });
            if (r.ok) {
              cp.setWallpaper('preset', 'midnight', null);
              cp.toast('Custom wallpaper removed');
              render();
            }
          });
        }
      }

      async function renderStorage() {
        shell('Storage', true, `
          <section class="st-group">
            <h2 class="st-group-label">USAGE</h2>
            <div class="st-card">
              <div class="st-storage-load" id="stStorageLoad">Loading...</div>
            </div>
          </section>
        `);

        try {
          const d = await cp.api.get(CP_BOOT.api.gallery);
          const items = d.items || [];
          const totalBytes = items.reduce((s, i) => s + (i.size || 0), 0);
          const mb = (totalBytes / 1024 / 1024).toFixed(2);
          const loadEl = root.querySelector('#stStorageLoad');
          if (loadEl) {
            loadEl.innerHTML = `
              <div class="st-storage-summary">
                <div class="st-storage-item">
                  <span class="st-storage-icon" style="--row-bg:#007AFF">${svg('image', 20)}</span>
                  <span class="st-storage-num">${items.length}</span>
                  <span class="st-storage-label">Photos</span>
                </div>
                <div class="st-storage-item">
                  <span class="st-storage-icon" style="--row-bg:#FF9500">${svg('storage', 20)}</span>
                  <span class="st-storage-num">${mb} MB</span>
                  <span class="st-storage-label">Used</span>
                </div>
              </div>`;
          }
        } catch (e) {
          const loadEl = root.querySelector('#stStorageLoad');
          if (loadEl) loadEl.textContent = 'Could not load storage info';
        }
      }

      async function renderAbout() {
        let appsCount = 0;
        try {
          const d = await cp.api.get(CP_BOOT.api.apps);
          appsCount = (d.apps || []).length;
        } catch (e) {}

        const content = `
          <div class="st-about-hero">
            <div class="st-about-icon">${svg('phone', 40)}</div>
            <h2 class="st-about-name">Crying OS</h2>
            <span class="st-about-ver">Version 2.0</span>
          </div>

          ${group('IDENTITY',
            `
            <div class="st-row st-row-copy">
              <span class="st-row-icon" style="--row-bg:#007AFF">${svg('phone', 18)}</span>
              <div class="st-row-text">
                <span class="st-row-title">UUID</span>
                <span class="st-row-sub st-uuid">${esc(cp.phone.uuid)}</span>
              </div>
              <button class="st-copy" id="stAboutCopy">${svg('copy', 18)}</button>
            </div>
            `
          )}

          ${group('DETAILS', `
            <div class="st-row st-row-static">
              <span class="st-row-text"><span class="st-row-title">Version</span></span>
              <span class="st-row-value">2.0.0</span>
            </div>
            <div class="st-row st-row-static">
              <span class="st-row-text"><span class="st-row-title">Created</span></span>
              <span class="st-row-value">${esc(new Date(cp.phone.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }))}</span>
            </div>
            <div class="st-row st-row-static">
              <span class="st-row-text"><span class="st-row-title">Phone Age</span></span>
              <span class="st-row-value">${esc(getPhoneAge())}</span>
            </div>
            <div class="st-row st-row-static">
              <span class="st-row-text"><span class="st-row-title">Installed Apps</span></span>
              <span class="st-row-value">${appsCount}</span>
            </div>
            <div class="st-row st-row-static">
              <span class="st-row-text"><span class="st-row-title">Security</span></span>
              <span class="st-row-value">${lockEnabled ? 'Passcode On' : 'No Passcode'}</span>
            </div>
          `)}
        `;

        shell('About', true, content);
        root.querySelector('#stAboutCopy').addEventListener('click', copyUUID);
      }

      function renderReset() {
        const content = `
          <section class="st-group">
            <p class="st-note">These actions can't be undone. Please be careful.</p>
          </section>

          <section class="st-group">
            <div class="st-card">
              <div class="st-row" data-reset="fav">
                <span class="st-row-icon" style="--row-bg:#FF9500">${svg('trash', 18)}</span>
                <div class="st-row-text">
                  <span class="st-row-title">Clear Favorites</span>
                  <span class="st-row-sub">Remove all favorite marks</span>
                </div>
              </div>
              <div class="st-row st-row-divider" data-reset="apps">
                <span class="st-row-icon" style="--row-bg:#FF3B30">${svg('trash', 18)}</span>
                <div class="st-row-text">
                  <span class="st-row-title">Remove All Apps</span>
                  <span class="st-row-sub">Uninstall everything except system apps</span>
                </div>
              </div>
              <div class="st-row st-row-divider" data-reset="passcode">
                <span class="st-row-icon" style="--row-bg:#8E8E93">${svg('key', 18)}</span>
                <div class="st-row-text">
                  <span class="st-row-title">Remove Passcode</span>
                  <span class="st-row-sub">Disable phone lock</span>
                </div>
              </div>
            </div>
          </section>
        `;

        shell('Reset', true, content);

        root.querySelectorAll('[data-reset]').forEach(btn => {
          btn.addEventListener('click', () => handleReset(btn.dataset.reset));
        });
      }

      async function handleReset(type) {
        if (type === 'fav') {
          localStorage.removeItem('cp_gallery_favs');
          cp.toast('Favorites cleared');
        } else if (type === 'apps') {
          if (!confirm('Remove all installed apps?')) return;
          const d = await cp.api.get(CP_BOOT.api.apps);
          const removable = (d.apps || []).filter(a => a.removable && a.installed !== false);
          let removed = 0;
          for (const app of removable) {
            const r = await cp.api.post(CP_BOOT.api.apps, { action: 'remove', slug: app.slug });
            if (r.ok) {
              removed++;
              cp.emit('app:removed', app.slug);
            }
          }
          cp.toast(`Removed ${removed} apps`);
          render();
        } else if (type === 'passcode') {
          if (!confirm('Remove your passcode?')) return;
          const r = await cp.api.post(CP_BOOT.api.settings, { action: 'clear_password' });
          if (r.ok) {
            lockEnabled = false;
            cp.phone.lock_enabled = false;
            cp.toast('Passcode removed');
            render();
          }
        }
      }

      render();
    }
  });
})();
