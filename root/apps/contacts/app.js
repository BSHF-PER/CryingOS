/* Contacts — iOS Style */
(function () {
  'use strict';

  CP.register('contacts', {
    async mount(root, cp) {
      var contacts = [];
      var searchQuery = '';

      var icons = {
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        block: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
        user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
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

      root.innerHTML = 
        '<div class="ct">' +
        '  <header class="ct-head">' +
        '    <div class="ct-head-row">' +
        '      <h1 class="ct-title">Contacts</h1>' +
        '      <button class="ct-addbtn" id="ctAddBtn">' + svg('plus', 20) + '</button>' +
        '    </div>' +
        '    <div class="ct-search">' +
        '      <span class="ct-search-icon">' + svg('search', 18) + '</span>' +
        '      <input class="ct-search-input" id="ctSearch" placeholder="Search contacts">' +
        '    </div>' +
        '  </header>' +
        '  <div class="ct-list" id="ctList"></div>' +
        '  <div class="ct-empty" id="ctEmpty" hidden>' +
        '    ' + svg('empty', 64) +
        '    <h2>No contacts</h2>' +
        '    <p>Tap + to add your first contact</p>' +
        '  </div>' +
        '</div>';

      var listEl = root.querySelector('#ctList');
      var emptyEl = root.querySelector('#ctEmpty');
      var searchInput = root.querySelector('#ctSearch');

      function loadContacts() {
        return cp.api.get(CP_BOOT.api.contacts).then(function(d) {
          contacts = d.items || [];
          render();
        });
      }

      function render() {
        var filtered = contacts;
        if (searchQuery) {
          var q = searchQuery.toLowerCase();
          filtered = contacts.filter(function(c) {
            return c.name.toLowerCase().indexOf(q) !== -1 ||
                   c.phone_number.indexOf(q) !== -1;
          });
        }

        if (filtered.length === 0) {
          listEl.innerHTML = '';
          emptyEl.hidden = false;
          return;
        }
        emptyEl.hidden = true;

        var html = '';
        for (var i = 0; i < filtered.length; i++) {
          var c = filtered[i];
          var initial = c.name.charAt(0).toUpperCase();
          var blockedClass = c.is_blocked ? ' blocked' : '';
          var blockedBadge = c.is_blocked ? '<span class="ct-blocked-badge">Blocked</span>' : '';
          var statusMsg = c.status_message ? '<div class="ct-contact-status">' + esc(c.status_message) + '</div>' : '';
          var unreadBadge = c.unread_count > 0 ? '<span class="ct-unread">' + c.unread_count + '</span>' : '';
          
          html += 
            '<div class="ct-contact' + blockedClass + '" data-id="' + c.id + '">' +
            '  <div class="ct-avatar" style="background:' + getAvatarColor(c.name) + '">' + initial + '</div>' +
            '  <div class="ct-info">' +
            '    <div class="ct-name-row">' +
            '      <span class="ct-name">' + esc(c.name) + '</span>' +
            '      ' + blockedBadge + unreadBadge +
            '    </div>' +
            '    <div class="ct-number">' + esc(c.phone_number) + '</div>' +
            '    ' + statusMsg +
            '  </div>' +
            '  <div class="ct-actions">' +
            '    <button class="ct-act-btn ct-block-btn" data-action="block" data-id="' + c.id + '" title="' + (c.is_blocked ? 'Unblock' : 'Block') + '">' +
            '      ' + svg('block', 18) +
            '    </button>' +
            '    <button class="ct-act-btn ct-edit-btn" data-action="edit" data-id="' + c.id + '">' + svg('edit', 18) + '</button>' +
            '    <button class="ct-act-btn ct-del-btn" data-action="delete" data-id="' + c.id + '">' + svg('trash', 18) + '</button>' +
            '  </div>' +
            '</div>';
        }
        listEl.innerHTML = html;

        // Bind events
        var actionBtns = listEl.querySelectorAll('[data-action]');
        for (var j = 0; j < actionBtns.length; j++) {
          (function(btn) {
            btn.addEventListener('click', function(e) {
              e.stopPropagation();
              var action = btn.getAttribute('data-action');
              var id = parseInt(btn.getAttribute('data-id'));
              var contact = contacts.find(function(c) { return c.id === id; });
              if (!contact) return;

              if (action === 'block') {
                toggleBlock(contact);
              } else if (action === 'edit') {
                showEditModal(contact);
              } else if (action === 'delete') {
                deleteContact(contact);
              }
            });
          })(actionBtns[j]);
        }
      }

      function getAvatarColor(name) {
        var colors = ['#FF3B30', '#FF9500', '#FFD60A', '#34C759', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55'];
        var index = 0;
        for (var i = 0; i < name.length; i++) {
          index += name.charCodeAt(i);
        }
        return colors[index % colors.length];
      }

      function toggleBlock(contact) {
        var newBlocked = !contact.is_blocked;
        cp.api.post(CP_BOOT.api.contacts, {
          action: 'toggle_block',
          id: contact.id,
          blocked: newBlocked
        }).then(function(r) {
          if (r.ok) {
            contact.is_blocked = newBlocked;
            cp.toast(newBlocked ? contact.name + ' blocked' : contact.name + ' unblocked');
            render();
          }
        });
      }

      function deleteContact(contact) {
        if (!confirm('Delete ' + contact.name + '?')) return;
        cp.api.post(CP_BOOT.api.contacts, {
          action: 'delete',
          id: contact.id
        }).then(function(r) {
          if (r.ok) {
            cp.toast('Contact deleted');
            loadContacts();
          }
        });
      }

      function showAddModal() {
        var modal = 
          '<div class="ct-modal" id="ctModal">' +
          '  <div class="ct-modal-backdrop"></div>' +
          '  <div class="ct-modal-content">' +
          '    <h2 class="ct-modal-title">New Contact</h2>' +
          '    <input class="ct-modal-input" id="ctName" placeholder="Name" maxlength="100">' +
          '    <input class="ct-modal-input" id="ctNumber" placeholder="Phone number (01XXXXXXXXX)" maxlength="11" dir="ltr">' +
          '    <input class="ct-modal-input" id="ctNote" placeholder="Note (optional)" maxlength="255">' +
          '    <div class="ct-modal-btns">' +
          '      <button class="ct-btn ct-btn-secondary" id="ctCancel">Cancel</button>' +
          '      <button class="ct-btn ct-btn-primary" id="ctSave">Add</button>' +
          '    </div>' +
          '  </div>' +
          '</div>';
        
        root.insertAdjacentHTML('beforeend', modal);
        var modalEl = root.querySelector('#ctModal');

        modalEl.querySelector('#ctCancel').addEventListener('click', function() { modalEl.remove(); });
        modalEl.querySelector('.ct-modal-backdrop').addEventListener('click', function() { modalEl.remove(); });

        modalEl.querySelector('#ctSave').addEventListener('click', function() {
          var name = root.querySelector('#ctName').value.trim();
          var number = root.querySelector('#ctNumber').value.trim();
          var note = root.querySelector('#ctNote').value.trim();

          if (!name) { cp.toast('Name is required'); return; }
          if (!/^01\d{9}$/.test(number)) { cp.toast('Number must be 11 digits starting with 01'); return; }

          cp.api.post(CP_BOOT.api.contacts, {
            action: 'add',
            name: name,
            phone_number: number,
            note: note
          }).then(function(r) {
            if (r.ok) {
              cp.toast('Contact added');
              modalEl.remove();
              loadContacts();
            } else {
              cp.toast(r.error || 'Failed to add');
            }
          });
        });
      }

      function showEditModal(contact) {
        var modal = 
          '<div class="ct-modal" id="ctModal">' +
          '  <div class="ct-modal-backdrop"></div>' +
          '  <div class="ct-modal-content">' +
          '    <h2 class="ct-modal-title">Edit Contact</h2>' +
          '    <input class="ct-modal-input" id="ctName" value="' + esc(contact.name) + '" maxlength="100">' +
          '    <input class="ct-modal-input" id="ctNote" value="' + esc(contact.note || '') + '" placeholder="Note" maxlength="255">' +
          '    <div class="ct-modal-btns">' +
          '      <button class="ct-btn ct-btn-secondary" id="ctCancel">Cancel</button>' +
          '      <button class="ct-btn ct-btn-primary" id="ctSave">Save</button>' +
          '    </div>' +
          '  </div>' +
          '</div>';
        
        root.insertAdjacentHTML('beforeend', modal);
        var modalEl = root.querySelector('#ctModal');

        modalEl.querySelector('#ctCancel').addEventListener('click', function() { modalEl.remove(); });
        modalEl.querySelector('.ct-modal-backdrop').addEventListener('click', function() { modalEl.remove(); });

        modalEl.querySelector('#ctSave').addEventListener('click', function() {
          var name = root.querySelector('#ctName').value.trim();
          var note = root.querySelector('#ctNote').value.trim();

          if (!name) { cp.toast('Name is required'); return; }

          cp.api.post(CP_BOOT.api.contacts, {
            action: 'update',
            id: contact.id,
            name: name,
            note: note
          }).then(function(r) {
            if (r.ok) {
              cp.toast('Contact updated');
              modalEl.remove();
              loadContacts();
            }
          });
        });
      }

      // Events
      root.querySelector('#ctAddBtn').addEventListener('click', showAddModal);
      searchInput.addEventListener('input', function() {
        searchQuery = this.value;
        render();
      });

      loadContacts();
    }
  });
})();