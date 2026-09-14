<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/uuid.php';
require_once __DIR__ . '/apps.php';
require_once __DIR__ . '/phone.php';

apps_sync_catalog();        // ماژولار: همیشه با پوشهٔ apps/ همگام است
$PHONE = phone_resolve();  // هویت کاربر در همهٔ فایل‌ها آماده است
