<?php
declare(strict_types=1);
require_once __DIR__ . '/core/bootstrap.php';

$installed = phone_installed_apps((int)$PHONE['id']);
$bootApps = [];
foreach ($installed as $a) {
    $bootApps[] = [
        'slug'      => $a['slug'],
        'name'      => $a['name'],
        'icon'      => $a['icon'],
        'iconType'  => $a['icon_type'] ?? 'emoji',
        'iconSrc'   => $a['icon_src'] ?? '',
        'color'     => $a['color'],
        'removable' => (bool)$a['removable'],
        'entry'     => $a['entry'],
        'styles'    => json_decode($a['styles'] ?: '[]', true) ?: [],
    ];
}

$lockInfo = phone_get_lock_info((int)$PHONE['id']);

// دریافت بک‌گراند
$wallSt = db()->prepare('SELECT wallpaper_type, wallpaper_value FROM telephones WHERE id = ?');
$wallSt->execute([(int)$PHONE['id']]);
$wall = $wallSt->fetch();
$wallType = $wall['wallpaper_type'] ?? 'preset';
$wallValue = $wall['wallpaper_value'] ?? 'midnight';
$wallUrl = $wallType === 'upload' ? 'api/wallpaper.php?image=' . urlencode($wallValue) : null;

$boot = [
    'phone' => [
        'id' => (int)$PHONE['id'],
        'uuid' => $PHONE['uuid'],
        'name' => $PHONE['name'],
        'created_at' => $PHONE['created_at'],
        'lock_enabled' => $lockInfo['lock_enabled'],
        'phone_number' => $phoneNumber,
        'display_name' => $phoneProfile['display_name'] ?? null,
        'status_message' => $phoneProfile['status_message'] ?? null,
    ],
    'apps' => $bootApps,
    'api' => [
        'apps'     => 'api/apps.php',
        'gallery'  => 'api/gallery.php',
        'settings' => 'api/settings.php',
        'wallpaper'=> 'api/wallpaper.php',
        'voice'     => 'api/voice.php',
        'notes' => 'api/notes.php',
        'clock' => 'api/clock.php',
        'contacts' => 'api/contacts.php',
        'messages' => 'api/messages.php',
        'music' => 'api/music.php',
        'files' => 'api/files.php',
    ],
    'proxy' => 'proxy.php',
    'wallpaper' => [
        'type' => $wallType,
        'value' => $wallValue,
        'url' => $wallUrl,
    ],
];
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Crying OS</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='24' fill='%23007AFF'/><path d='M30 40 Q50 20 70 40 L70 70 Q70 80 60 80 L40 80 Q30 80 30 70 Z' fill='white'/></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/phone.css">
</head>
<body>

<div class="screen" id="screen">

  <div class="statusbar">
    <span class="sb-carrier">
      <svg class="sb-signal" viewBox="0 0 16 12" width="16" height="12">
        <rect x="0" y="8" width="3" height="4" rx="0.5" fill="currentColor"/>
        <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="currentColor"/>
        <rect x="9" y="2" width="3" height="10" rx="0.5" fill="currentColor"/>
        <rect x="13" y="0" width="3" height="12" rx="0.5" fill="currentColor" opacity="0.4"/>
      </svg>
      Crying OS
    </span>
    <span class="sb-clock" id="sbClock">--:--</span>
    <span class="sb-right">
      <svg class="sb-wifi" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
      <span class="battery"><i></i></span>
    </span>
  </div>

  <div class="main-area" id="mainArea">
    <div class="home" id="home">
      <div class="wallpaper" id="wallpaper"></div>
      <div class="home-info">
        <span class="hi-uuid" id="hiUuid"><?= htmlspecialchars($PHONE['uuid']) ?></span>
      </div>
      <div class="grid" id="grid"></div>
      <div class="home-hint">Long press an app to manage</div>
    </div>

    <div class="win-layer" id="winLayer" style="display:none"></div>
  </div>

  <nav class="navbar" id="navbar">
    <button class="nav-btn" id="navBack" title="Back">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <button class="nav-btn nav-home" id="navHome" title="Home">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/></svg>
    </button>
    <button class="nav-btn" id="navLock" title="Lock">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    </button>
  </nav>

  <div class="lock" id="lock">
    <div class="lock-icon">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </div>
    <div class="lock-clock" id="lockClock">--:--</div>
    <div class="lock-date" id="lockDate"></div>
    <div class="lock-pin" id="lockPin" hidden>
      <div class="pin-label">Enter your passcode</div>
      <div class="pin-dots">
        <span class="pin-dot"></span><span class="pin-dot"></span>
        <span class="pin-dot"></span><span class="pin-dot"></span>
      </div>
      <input class="pin-input" id="pinInput" type="password" autocomplete="off" maxlength="32">
      <div class="pin-keys" id="pinKeys">
        <button data-k="1">1</button><button data-k="2">2</button><button data-k="3">3</button>
        <button data-k="4">4</button><button data-k="5">5</button><button data-k="6">6</button>
        <button data-k="7">7</button><button data-k="8">8</button><button data-k="9">9</button>
        <button data-k="C" class="pin-alt">C</button>
        <button data-k="0">0</button>
        <button data-k="OK" class="pin-ok">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="pin-error" id="pinError" hidden>Incorrect passcode</div>
    </div>
    <div class="lock-hint" id="lockHint">Tap to unlock</div>
  </div>

  <div class="toasts" id="toasts"></div>
</div>

<script>window.CP_BOOT = <?= json_encode($boot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;</script>
<script src="assets/js/phone.js"></script>
</body>
</html>
