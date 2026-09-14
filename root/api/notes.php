<?php
declare(strict_types=1);
require_once __DIR__ . '/../core/bootstrap.php';

$pdo = db();
$phoneId = (int)$PHONE['id'];
$drawDir = ROOT_PATH . '/uploads/notes';
if (!is_dir($drawDir)) mkdir($drawDir, 0775, true);

/* ---------- نمایش تصویر نقاشی ---------- */
if (isset($_GET['drawing'])) {
    $st = $pdo->prepare(
        'SELECT nd.filename FROM note_drawings nd
         JOIN notes n ON n.id = nd.note_id
         WHERE nd.id = ? AND n.phone_id = ?'
    );
    $st->execute([(int)$_GET['drawing'], $phoneId]);
    $row = $st->fetch();
    if (!$row) { http_response_code(404); exit('not found'); }

    $path = $drawDir . '/' . basename($row['filename']);
    if (!is_file($path)) { http_response_code(410); exit('gone'); }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    header('Content-Type: ' . $finfo->file($path));
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: private, max-age=3600');
    readfile($path);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

/* ---------- GET: لیست یادداشت‌ها ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $search = trim((string)($_GET['q'] ?? ''));
    
    $sql = 'SELECT id, title, content, type, color, pinned, created_at, updated_at FROM notes WHERE phone_id = ?';
    $params = [$phoneId];
    
    if ($search !== '') {
        $sql .= ' AND (title LIKE ? OR content LIKE ?)';
        $searchParam = '%' . $search . '%';
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    $sql .= ' ORDER BY pinned DESC, updated_at DESC';
    
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $items = $st->fetchAll();
    
    // دریافت تعداد نقاشی‌ها برای هر یادداشت
    foreach ($items as &$item) {
        $dst = $pdo->prepare('SELECT COUNT(*) FROM note_drawings WHERE note_id = ?');
        $dst->execute([$item['id']]);
        $item['drawing_count'] = (int)$dst->fetchColumn();
        
        // دریافت اولین نقاشی برای پیش‌نمایش
        $ps = $pdo->prepare('SELECT id FROM note_drawings WHERE note_id = ? ORDER BY id DESC LIMIT 1');
        $ps->execute([$item['id']]);
        $drawingId = $ps->fetchColumn();
        $item['preview_drawing'] = $drawingId ? 'api/notes.php?drawing=' . $drawingId : null;
    }
    
    echo json_encode(['ok' => true, 'items' => $items], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- POST ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // ایجاد یادداشت جدید
    if (isset($_POST['action']) && $_POST['action'] === 'create') {
        $title = trim((string)($_POST['title'] ?? ''));
        $content = (string)($_POST['content'] ?? '');
        $type = in_array($_POST['type'] ?? 'text', ['text', 'drawing']) ? $_POST['type'] : 'text';
        $color = (string)($_POST['color'] ?? '#FFD60A');
        
        $pdo->prepare('INSERT INTO notes (phone_id, title, content, type, color) VALUES (?,?,?,?,?)')
            ->execute([$phoneId, $title, $content, $type, $color]);
        
        echo json_encode(['ok' => true, 'id' => (int)$pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    $in = json_decode((string)file_get_contents('php://input'), true) ?: [];
    
    // آپلود نقاشی
    if (($in['action'] ?? '') === 'save_drawing') {
        $noteId = (int)($in['note_id'] ?? 0);
        $imageData = (string)($in['image'] ?? '');
        $width = (int)($in['width'] ?? 800);
        $height = (int)($in['height'] ?? 600);
        
        // بررسی مالکیت
        $st = $pdo->prepare('SELECT id FROM notes WHERE id = ? AND phone_id = ?');
        $st->execute([$noteId, $phoneId]);
        if (!$st->fetch()) {
            echo json_encode(['ok' => false, 'error' => 'Note not found']); exit;
        }
        
        // Decode base64
        $data = $imageData;
        if (strpos($data, ',') !== false) {
            $data = explode(',', $data)[1];
        }
        $decoded = base64_decode($data, true);
        if ($decoded === false) {
            echo json_encode(['ok' => false, 'error' => 'Invalid image data']); exit;
        }
        
        // بررسی حجم (حداکثر ۵ مگابایت)
        if (strlen($decoded) > 5 * 1024 * 1024) {
            echo json_encode(['ok' => false, 'error' => 'Drawing too large']); exit;
        }
        
        $filename = bin2hex(random_bytes(8)) . '.png';
        if (file_put_contents($drawDir . '/' . $filename, $decoded) === false) {
            echo json_encode(['ok' => false, 'error' => 'Failed to save']); exit;
        }
        
        $pdo->prepare('INSERT INTO note_drawings (note_id, filename, width, height, size) VALUES (?,?,?,?,?)')
            ->execute([$noteId, $filename, $width, $height, strlen($decoded)]);
        
        echo json_encode(['ok' => true, 'drawing_id' => (int)$pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // به‌روزرسانی یادداشت
    if (($in['action'] ?? '') === 'update') {
        $id = (int)($in['id'] ?? 0);
        $title = trim((string)($in['title'] ?? ''));
        $content = (string)($in['content'] ?? '');
        $color = (string)($in['color'] ?? null);
        
        $sql = 'UPDATE notes SET title = ?, content = ?';
        $params = [$title, $content];
        
        if ($color !== null) {
            $sql .= ', color = ?';
            $params[] = $color;
        }
        
        $sql .= ' WHERE id = ? AND phone_id = ?';
        $params[] = $id;
        $params[] = $phoneId;
        
        $pdo->prepare($sql)->execute($params);
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // پین کردن
    if (($in['action'] ?? '') === 'pin') {
        $id = (int)($in['id'] ?? 0);
        $pinned = $in['pinned'] ? 1 : 0;
        $pdo->prepare('UPDATE notes SET pinned = ? WHERE id = ? AND phone_id = ?')
            ->execute([$pinned, $id, $phoneId]);
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // حذف
    if (($in['action'] ?? '') === 'delete') {
        $id = (int)($in['id'] ?? 0);
        
        // بررسی مالکیت
        $st = $pdo->prepare('SELECT id FROM notes WHERE id = ? AND phone_id = ?');
        $st->execute([$id, $phoneId]);
        if (!$st->fetch()) {
            echo json_encode(['ok' => false, 'error' => 'Note not found']); exit;
        }
        
        // حذف فایل‌های نقاشی
        $dst = $pdo->prepare('SELECT filename FROM note_drawings WHERE note_id = ?');
        $dst->execute([$id]);
        while ($row = $dst->fetch()) {
            @unlink($drawDir . '/' . basename($row['filename']));
        }
        
        $pdo->prepare('DELETE FROM notes WHERE id = ?')->execute([$id]);
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

http_response_code(405);