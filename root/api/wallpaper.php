<?php
declare(strict_types=1);
require_once __DIR__ . '/../core/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');

$phoneId = (int)$PHONE['id'];
$wallDir = ROOT_PATH . '/uploads/wallpapers';
if (!is_dir($wallDir)) mkdir($wallDir, 0775, true);

/* ---------- GET: دریافت بک‌گراند فعلی ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // دریافت تصویر آپلودی
    if (isset($_GET['image'])) {
        $file = basename((string)$_GET['image']);
        $path = $wallDir . '/' . $file;
        if (is_file($path)) {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            header('Content-Type: ' . $finfo->file($path));
            header('Content-Length: ' . filesize($path));
            readfile($path);
            exit;
        }
        http_response_code(404);
        exit('not found');
    }

    // اطلاعات بک‌گراند فعلی
    $st = db()->prepare('SELECT wallpaper_type, wallpaper_value FROM telephones WHERE id = ?');
    $st->execute([$phoneId]);
    $row = $st->fetch();
    
    echo json_encode([
        'ok' => true,
        'type' => $row['wallpaper_type'] ?? 'preset',
        'value' => $row['wallpaper_value'] ?? 'midnight',
        'url' => ($row['wallpaper_type'] ?? '') === 'upload' 
            ? 'api/wallpaper.php?image=' . urlencode($row['wallpaper_value'])
            : null,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- POST ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // آپلود تصویر جدید
    if (!empty($_FILES['wallpaper'])) {
        $f = $_FILES['wallpaper'];
        if ($f['error'] !== UPLOAD_ERR_OK) {
            echo json_encode(['ok' => false, 'error' => 'Upload failed'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        if ($f['size'] > 5 * 1024 * 1024) {
            echo json_encode(['ok' => false, 'error' => 'Max 5MB'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($allowed[$mime])) {
            echo json_encode(['ok' => false, 'error' => 'Invalid format'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        // حذف بک‌گراند قدیمی
        $st = db()->prepare('SELECT wallpaper_type, wallpaper_value FROM telephones WHERE id = ?');
        $st->execute([$phoneId]);
        $old = $st->fetch();
        if ($old['wallpaper_type'] === 'upload') {
            @unlink($wallDir . '/' . basename($old['wallpaper_value']));
        }
        
        $name = $PHONE['uuid'] . '_' . bin2hex(random_bytes(6)) . '.' . $allowed[$mime];
        if (!move_uploaded_file($f['tmp_name'], $wallDir . '/' . $name)) {
            echo json_encode(['ok' => false, 'error' => 'Save failed'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        db()->prepare('UPDATE telephones SET wallpaper_type = "upload", wallpaper_value = ? WHERE id = ?')
            ->execute([$name, $phoneId]);
        
        echo json_encode([
            'ok' => true,
            'type' => 'upload',
            'value' => $name,
            'url' => 'api/wallpaper.php?image=' . urlencode($name),
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // تنظیم بک‌گراند پیش‌فرض
    $in = json_decode((string)file_get_contents('php://input'), true) ?: [];
    if (($in['action'] ?? '') === 'set_preset') {
        $preset = (string)($in['preset'] ?? 'midnight');
        // اعتبارسنجی
        $valid = ['midnight', 'ocean', 'sunset', 'forest', 'aurora', 'dawn', 'cherry', 'royal', 'graphite'];
        if (!in_array($preset, $valid)) {
            echo json_encode(['ok' => false, 'error' => 'Invalid preset'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        db()->prepare('UPDATE telephones SET wallpaper_type = "preset", wallpaper_value = ? WHERE id = ?')
            ->execute([$preset, $phoneId]);
        echo json_encode(['ok' => true, 'type' => 'preset', 'value' => $preset], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    echo json_encode(['ok' => false, 'error' => 'Invalid action'], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);