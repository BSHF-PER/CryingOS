/* Messages — iOS iMessage Style with Search & Clear */
(function () {
  'use strict';

  CP.register('messages', {
    async mount(root, cp) {
      var conversations = [];
      var currentConversation = null;
      var currentView = 'list';
      var pollInterval = null;
      var lastMessageCount = 0;
      var searchQuery = '';

      var icons = {
        back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>',
        send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
        block: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
        plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
        trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
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

      function fmtTime(ts) {
        try { return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }
        catch(e) { return ''; }
      }

      function fmtDate(ts) {
        try {
          var d = new Date(ts);
          var now = new Date();
          if (d.toDateString() === now.toDateString()) return fmtTime(ts);
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch(e) { return ''; }
      }

      function getAvatarColor(name) {
        var colors = ['#FF3B30', '#FF9500', '#FFD60A', '#34C759', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55'];
        var index = 0;
        for (var i = 0; i < name.length; i++) index += name.charCodeAt(i);
        return colors[index % colors.length];
      }

      function playNotification() {
        try {
          var AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          var ctx = new AudioCtx();
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.2);
          setTimeout(function() { ctx.close(); }, 300);
        } catch(e) {}
      }

      function highlightText(text, query) {
        if (!query) return esc(text);
        var escaped = esc(text);
        var regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        return escaped.replace(regex, '<mark class="mg-highlight">$1</mark>');
      }

      root.innerHTML = 
        '<div class="mg">' +
        '  <div class="mg-listview" id="mgListView">' +
        '    <header class="mg-head">' +
        '      <h1 class="mg-title">Messages</h1>' +
        '      <div class="mg-head-actions">' +
        '        <button class="mg-iconbtn" id="mgSearchToggle">' + svg('search', 20) + '</button>' +
        '        <button class="mg-newbtn" id="mgNewBtn">' + svg('plus', 20) + '</button>' +
        '      </div>' +
        '    </header>' +
        '    <div class="mg-searchbar" id="mgSearchBar" hidden>' +
        '      <span class="mg-search-icon">' + svg('search', 16) + '</span>' +
        '      <input class="mg-search-input" id="mgSearchInput" placeholder="Search messages...">' +
        '      <button class="mg-search-clear" id="mgSearchClear" hidden>' + svg('close', 16) + '</button>' +
        '    </div>' +
        '    <div class="mg-conversations" id="mgConversations"></div>' +
        '    <div class="mg-search-results" id="mgSearchResults" hidden></div>' +
        '    <div class="mg-empty" id="mgEmpty" hidden>' +
        '      ' + svg('empty', 64) +
        '      <h2>No messages</h2>' +
        '      <p>Tap + to start a conversation</p>' +
        '    </div>' +
        '  </div>' +
        '  <div class="mg-chatview" id="mgChatView" hidden>' +
        '    <header class="mg-chat-head">' +
        '      <button class="mg-backbtn" id="mgBackBtn">' + svg('back', 20) + '</button>' +
        '      <div class="mg-chat-info">' +
        '        <span class="mg-chat-name" id="mgChatName"></span>' +
        '        <span class="mg-chat-number" id="mgChatNumber"></span>' +
        '      </div>' +
        '      <button class="mg-iconbtn mg-trashbtn" id="mgClearBtn" title="Clear history">' + svg('trash', 18) + '</button>' +
        '    </header>' +
        '    <div class="mg-messages" id="mgMessages"></div>' +
        '    <div class="mg-input-bar">' +
        '      <input class="mg-input" id="mgInput" placeholder="Message..." maxlength="1000">' +
        '      <button class="mg-sendbtn" id="mgSendBtn">' + svg('send', 20) + '</button>' +
        '    </div>' +
        '  </div>' +
        '</div>';

      var listView = root.querySelector('#mgListView');
      var chatView = root.querySelector('#mgChatView');
      var conversationsEl = root.querySelector('#mgConversations');
      var searchResultsEl = root.querySelector('#mgSearchResults');
      var emptyEl = root.querySelector('#mgEmpty');
      var messagesEl = root.querySelector('#mgMessages');
      var inputEl = root.querySelector('#mgInput');
      var searchBar = root.querySelector('#mgSearchBar');
      var searchInput = root.querySelector('#mgSearchInput');
      var searchClear = root.querySelector('#mgSearchClear');

      async function ensureMyInfo() {
        if (!cp.phone.id || !cp.phone.phone_number) {
          try {
            var res = await fetch('api/profile.php');
            var data = await res.json();
            if (data.ok) {
              cp.phone.phone_number = data.phone_number;
              cp.phone.id = data.id;
            }
          } catch(e) {}
        }
      }

      function loadConversations() {
        return cp.api.get(CP_BOOT.api.messages).then(function(d) {
          var oldUnread = getTotalUnread();
          conversations = d.items || [];
          var newUnread = getTotalUnread();
          
          if (newUnread > oldUnread && oldUnread >= 0) {
            playNotification();
          }
          
          if (currentView === 'list' && !searchQuery) renderConversations();
        });
      }

      function getTotalUnread() {
        var total = 0;
        for (var i = 0; i < conversations.length; i++) {
          total += conversations[i].unread_count || 0;
        }
        return total;
      }

      function renderConversations() {
        if (conversations.length === 0) {
          conversationsEl.innerHTML = '';
          emptyEl.hidden = false;
          return;
        }
        emptyEl.hidden = true;

        var html = '';
        for (var i = 0; i < conversations.length; i++) {
          var conv = conversations[i];
          var name = conv.contact_name || conv.other_name || conv.other_phone || 'Unknown';
          var initial = name.charAt(0).toUpperCase();
          var unreadClass = conv.unread_count > 0 ? ' unread' : '';
          var unreadBadge = conv.unread_count > 0 ? '<span class="mg-unread">' + conv.unread_count + '</span>' : '';
          
          html += 
            '<div class="mg-conv' + unreadClass + '" data-id="' + conv.other_id + '" data-number="' + esc(conv.other_phone) + '">' +
            '  <div class="mg-conv-avatar" style="background:' + getAvatarColor(name) + '">' + initial + '</div>' +
            '  <div class="mg-conv-info">' +
            '    <div class="mg-conv-top">' +
            '      <span class="mg-conv-name">' + esc(name) + '</span>' +
            '      <span class="mg-conv-time">' + fmtDate(conv.last_message_time) + '</span>' +
            '    </div>' +
            '    <div class="mg-conv-preview">' +
            '      <span class="mg-conv-text">' + esc(conv.last_message || 'No messages yet') + '</span>' +
            '      ' + unreadBadge +
            '    </div>' +
            '  </div>' +
            '</div>';
        }
        conversationsEl.innerHTML = html;

        var convItems = conversationsEl.querySelectorAll('.mg-conv');
        for (var j = 0; j < convItems.length; j++) {
          (function(item) {
            item.addEventListener('click', function() {
              var otherId = parseInt(item.getAttribute('data-id'));
              var otherNumber = item.getAttribute('data-number');
              var conv = null;
              for (var k = 0; k < conversations.length; k++) {
                if (conversations[k].other_id === otherId) { conv = conversations[k]; break; }
              }
              openChat(otherId, otherNumber, conv);
            });
          })(convItems[j]);
        }
      }

      // ✨ Search
      function performSearch() {
        var query = searchInput.value.trim();
        searchQuery = query;
        searchClear.hidden = !query;
        
        if (!query) {
          searchResultsEl.hidden = true;
          conversationsEl.hidden = false;
          emptyEl.hidden = conversations.length === 0;
          renderConversations();
          return;
        }

        cp.api.post(CP_BOOT.api.messages, {
          action: 'search',
          query: query
        }).then(function(r) {
          if (!r.ok) return;
          var results = r.items || [];
          renderSearchResults(results, query);
        });
      }

      function renderSearchResults(results, query) {
        conversationsEl.hidden = true;
        emptyEl.hidden = true;
        searchResultsEl.hidden = false;

        if (results.length === 0) {
          searchResultsEl.innerHTML = 
            '<div class="mg-search-empty">' +
            '  <p>No results for "' + esc(query) + '"</p>' +
            '</div>';
          return;
        }

        var html = '<div class="mg-search-count">' + results.length + ' result' + (results.length !== 1 ? 's' : '') + '</div>';
        for (var i = 0; i < results.length; i++) {
          var r = results[i];
          var otherName = r.contact_name || r.other_name || r.other_phone || 'Unknown';
          var initial = otherName.charAt(0).toUpperCase();
          var isMine = parseInt(r.sender_id) === parseInt(cp.phone.id);
          var prefix = isMine ? 'You: ' : '';
          
          html += 
            '<div class="mg-search-result" data-id="' + r.other_id + '" data-number="' + esc(r.other_phone) + '">' +
            '  <div class="mg-search-avatar" style="background:' + getAvatarColor(otherName) + '">' + initial + '</div>' +
            '  <div class="mg-search-info">' +
            '    <div class="mg-search-top">' +
            '      <span class="mg-search-name">' + esc(otherName) + '</span>' +
            '      <span class="mg-search-time">' + fmtDate(r.created_at) + '</span>' +
            '    </div>' +
            '    <div class="mg-search-text">' + prefix + highlightText(r.content, query) + '</div>' +
            '  </div>' +
            '</div>';
        }
        searchResultsEl.innerHTML = html;

        searchResultsEl.querySelectorAll('.mg-search-result').forEach(function(item) {
          item.addEventListener('click', function() {
            var otherId = parseInt(item.getAttribute('data-id'));
            var otherNumber = item.getAttribute('data-number');
            openChat(otherId, otherNumber, null);
            // Reset search
            searchInput.value = '';
            searchQuery = '';
            searchClear.hidden = true;
            searchResultsEl.hidden = true;
            conversationsEl.hidden = false;
          });
        });
      }

      function openChat(otherId, otherNumber, conv) {
        currentConversation = {
          otherId: otherId,
          otherNumber: otherNumber,
          contact: conv
        };

        var name = (conv && conv.contact_name) || (conv && conv.other_name) || otherNumber;
        root.querySelector('#mgChatName').textContent = name;
        root.querySelector('#mgChatNumber').textContent = otherNumber;

        listView.hidden = true;
        chatView.hidden = false;
        currentView = 'chat';

        lastMessageCount = 0;
        loadMessages(otherId);
      }

      function loadMessages(otherId) {
        if (!otherId && currentConversation) otherId = currentConversation.otherId;
        if (!otherId) return;
        
        cp.api.get(CP_BOOT.api.messages + '?with=' + otherId).then(function(d) {
          var messages = d.items || [];
          var wasAtBottom = isAtBottom();
          
          var myId = cp.phone.id;
          var newCount = 0;
          for (var i = 0; i < messages.length; i++) {
            if (parseInt(messages[i].sender_id) !== parseInt(myId)) newCount++;
          }
          
          if (lastMessageCount > 0 && newCount > lastMessageCount && messages.length > lastMessageCount) {
            var lastMsg = messages[messages.length - 1];
            if (lastMsg && parseInt(lastMsg.sender_id) !== parseInt(myId)) {
              playNotification();
            }
          }
          lastMessageCount = newCount;
          
          renderMessages(messages);
          if (wasAtBottom) messagesEl.scrollTop = messagesEl.scrollHeight;
        });
      }

      function isAtBottom() {
        return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 50;
      }

      function renderMessages(messages) {
        var myNumber = cp.phone.phone_number;
        var myId = cp.phone.id;
        var html = '';
        var lastDate = '';
        
        for (var i = 0; i < messages.length; i++) {
          var msg = messages[i];
          var msgDate = '';
          try { msgDate = new Date(msg.created_at).toDateString(); } catch(e) {}
          
          if (msgDate && msgDate !== lastDate) {
            var dateLabel = '';
            try { dateLabel = new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
            catch(e) {}
            html += '<div class="mg-date-divider">' + dateLabel + '</div>';
            lastDate = msgDate;
          }
          
          var isMine = false;
          if (myId && msg.sender_id) {
            isMine = (parseInt(msg.sender_id) === parseInt(myId));
          } else if (myNumber && msg.sender_phone) {
            isMine = (msg.sender_phone === myNumber);
          }
          
          var msgClass = isMine ? 'mg-msg-mine' : 'mg-msg-theirs';
          var timeStr = '';
          try { timeStr = fmtTime(msg.created_at); } catch(e) {}
          
          html += 
            '<div class="mg-msg ' + msgClass + '">' +
            '  <div class="mg-msg-bubble">' + esc(msg.content) + '</div>' +
            '  <span class="mg-msg-time">' + timeStr + '</span>' +
            '</div>';
        }
        
        if (messages.length === 0) {
          html = '<div class="mg-date-divider">Send the first message</div>';
        }
        
        messagesEl.innerHTML = html;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      function sendMessage() {
        var content = inputEl.value.trim();
        if (!content || !currentConversation) return;

        cp.api.post(CP_BOOT.api.messages, {
          action: 'send',
          to: currentConversation.otherNumber,
          content: content
        }).then(function(r) {
          if (r.ok) {
            inputEl.value = '';
            loadMessages(currentConversation.otherId);
          } else {
            cp.toast(r.error || 'Failed to send');
          }
        });
      }

      // ✨ پاک کردن تاریخچه
      function clearHistory() {
        if (!currentConversation || !currentConversation.otherId) return;
        var name = root.querySelector('#mgChatName').textContent;
        if (!confirm('Delete all messages with ' + name + '? This cannot be undone.')) return;

        cp.api.post(CP_BOOT.api.messages, {
          action: 'clear_history',
          with: currentConversation.otherId
        }).then(function(r) {
          if (r.ok) {
            cp.toast('History cleared');
            renderMessages([]);
            lastMessageCount = 0;
          } else {
            cp.toast(r.error || 'Failed');
          }
        });
      }

      function showNewMessageModal() {
        var modal = 
          '<div class="mg-modal" id="mgModal">' +
          '  <div class="mg-modal-backdrop"></div>' +
          '  <div class="mg-modal-content">' +
          '    <h2 class="mg-modal-title">New Message</h2>' +
          '    <input class="mg-modal-input" id="mgNewNumber" placeholder="Phone number (01XXXXXXXXX)" maxlength="11" dir="ltr">' +
          '    <div class="mg-modal-btns">' +
          '      <button class="mg-btn mg-btn-secondary" id="mgCancel">Cancel</button>' +
          '      <button class="mg-btn mg-btn-primary" id="mgStart">Start Chat</button>' +
          '    </div>' +
          '  </div>' +
          '</div>';
        
        root.insertAdjacentHTML('beforeend', modal);
        var modalEl = root.querySelector('#mgModal');

        modalEl.querySelector('#mgCancel').addEventListener('click', function() { modalEl.remove(); });
        modalEl.querySelector('.mg-modal-backdrop').addEventListener('click', function() { modalEl.remove(); });

        modalEl.querySelector('#mgStart').addEventListener('click', function() {
          var number = root.querySelector('#mgNewNumber').value.trim();
          if (!/^01\d{9}$/.test(number)) {
            cp.toast('Invalid number format');
            return;
          }
          modalEl.remove();
          openChat(null, number, null);
        });
      }

      function realtimePoll() {
        if (currentView === 'list' && !searchQuery) loadConversations();
        else if (currentView === 'chat' && currentConversation && currentConversation.otherId) {
          loadMessages(currentConversation.otherId);
        }
      }

      pollInterval = setInterval(realtimePoll, 3000);

      // Events
      root.querySelector('#mgBackBtn').addEventListener('click', function() {
        chatView.hidden = true;
        listView.hidden = false;
        currentView = 'list';
        currentConversation = null;
        lastMessageCount = 0;
        loadConversations();
      });

      root.querySelector('#mgNewBtn').addEventListener('click', showNewMessageModal);
      root.querySelector('#mgSendBtn').addEventListener('click', sendMessage);
      root.querySelector('#mgClearBtn').addEventListener('click', clearHistory);
      
      inputEl.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
      });

      // Search events
      root.querySelector('#mgSearchToggle').addEventListener('click', function() {
        searchBar.hidden = !searchBar.hidden;
        if (!searchBar.hidden) searchInput.focus();
        else {
          searchInput.value = '';
          searchQuery = '';
          searchClear.hidden = true;
          searchResultsEl.hidden = true;
          conversationsEl.hidden = false;
          renderConversations();
        }
      });

      var searchTimer = null;
      searchInput.addEventListener('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(performSearch, 300);
      });

      searchClear.addEventListener('click', function() {
        searchInput.value = '';
        searchQuery = '';
        searchClear.hidden = true;
        performSearch();
      });

    

      var visHandler = function() {
        if (!document.hidden) realtimePoll();
      };
      document.addEventListener('visibilitychange', visHandler);

      this._cleanup = function() {
        if (pollInterval) clearInterval(pollInterval);
        document.removeEventListener('visibilitychange', visHandler);
      };

      await ensureMyInfo();
      loadConversations();
    },

    unmount: function(root, cp) {
      if (this._cleanup) this._cleanup();
    }
  });
})();