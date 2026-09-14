/* Phone — Your number and profile (Direct API) */
(function () {
  'use strict';

  CP.register('phone', {
    async mount(root, cp) {
      function esc(s) {
        return String(s || '').replace(/[&<>"']/g, function(c) {
          return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
        });
      }

      // اول لودینگ نشون بده
      root.innerHTML = 
        '<div class="ph">' +
        '  <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8e8e93">Loading...</div>' +
        '</div>';

      // ✨ دریافت مستقیم پروفایل از API (نه از boot)
      var profile = {
        phone_number: 'Loading...',
        display_name: 'Crying OS User',
        status_message: 'Hello! I am using Crying OS',
        uuid: cp.phone.uuid || '',
        created_at: cp.phone.created_at || null
      };

      try {
        var res = await fetch('api/profile.php');
        var data = await res.json();
        console.log('📞 Profile API response:', data);
        
        if (data.ok) {
          profile.phone_number = data.phone_number || 'Not set';
          profile.display_name = data.display_name || 'Crying OS User';
          profile.status_message = data.status_message || 'Hello! I am using Crying OS';
          profile.uuid = data.uuid || cp.phone.uuid;
          profile.created_at = data.created_at || cp.phone.created_at;
          
          // آپدیت cp.phone برای استفاده در سایر اپ‌ها
          cp.phone.phone_number = data.phone_number;
          cp.phone.id = data.id;
          cp.phone.display_name = data.display_name;
        } else {
          profile.phone_number = 'Error loading';
        }
      } catch (e) {
        console.error('Profile load error:', e);
        profile.phone_number = 'Network error';
      }

      var memberSince = 'Unknown';
      try {
        if (profile.created_at) {
          memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
          });
        }
      } catch(e) {}

      var isSet = profile.phone_number && profile.phone_number !== 'Not set' && profile.phone_number !== 'Loading...';

      root.innerHTML = 
        '<div class="ph">' +
        '  <header class="ph-head">' +
        '    <h1 class="ph-title">Phone</h1>' +
        '  </header>' +
        '  <div class="ph-content">' +
        '    <div class="ph-avatar">' +
        '      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
        '    </div>' +
        '    <div class="ph-number-label">YOUR NUMBER</div>' +
        '    <div class="ph-number" id="phNumber">' + esc(profile.phone_number) + '</div>' +
        (isSet ? 
        '    <button class="ph-copy-btn" id="phCopyBtn">' +
        '      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
        '      Copy Number' +
        '    </button>'
        : 
        '    <div class="ph-number-hint">This number is unique to your phone</div>'
        ) +
        '    <div class="ph-section">' +
        '      <h2 class="ph-section-title">PROFILE</h2>' +
        '      <div class="ph-card">' +
        '        <div class="ph-row">' +
        '          <span class="ph-row-label">Name</span>' +
        '          <input class="ph-input" id="phName" value="' + esc(profile.display_name) + '" maxlength="50">' +
        '        </div>' +
        '        <div class="ph-row">' +
        '          <span class="ph-row-label">Status</span>' +
        '          <input class="ph-input" id="phStatus" value="' + esc(profile.status_message) + '" maxlength="100">' +
        '        </div>' +
        '        <button class="ph-save-btn" id="phSaveBtn">Save Profile</button>' +
        '      </div>' +
        '    </div>' +
        '    <div class="ph-section">' +
        '      <h2 class="ph-section-title">INFO</h2>' +
        '      <div class="ph-card">' +
        '        <div class="ph-info-row"><span>Phone ID</span><span class="ph-info-value">' + esc(profile.uuid) + '</span></div>' +
        '        <div class="ph-info-row"><span>Member since</span><span class="ph-info-value">' + esc(memberSince) + '</span></div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';

      // Copy number
      var copyBtn = root.querySelector('#phCopyBtn');
      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          if (navigator.clipboard && profile.phone_number) {
            navigator.clipboard.writeText(profile.phone_number).then(function() {
              cp.toast('Number copied: ' + profile.phone_number);
            });
          } else {
            cp.toast(profile.phone_number);
          }
        });
      }

      // Save profile
      root.querySelector('#phSaveBtn').addEventListener('click', function() {
        var name = root.querySelector('#phName').value.trim();
        var status = root.querySelector('#phStatus').value.trim();
        
        fetch('api/profile.php', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            action: 'update',
            display_name: name,
            status_message: status
          })
        }).then(function(r) { return r.json(); }).then(function(r) {
          if (r.ok) {
            cp.toast('Profile saved');
            cp.phone.display_name = name;
            cp.phone.status_message = status;
          } else {
            cp.toast(r.error || 'Failed to save');
          }
        }).catch(function() {
          cp.toast('Network error');
        });
      });
    }
  });
})();