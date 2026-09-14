<?php
declare(strict_types=1);
require_once __DIR__ . '/../core/bootstrap.php';

$pdo = db();
$phoneId = (int)$PHONE['id'];
$voiceDir = ROOT_PATH . '/uploads/voice';
if (!is_dir($voiceDir)) mkdir($voiceDir, 0775, true);

/* ---------- پخش فایل (فقط مالک) ---------- */
if (isset($_GET['audio'])) {
    $st = $pdo->prepare('SELECT filename FROM voice_recordings WHERE id = ? AND phone_id = ?');
    $st->execute([(int)$_GET['audio'], $phoneId]);
    $row = $st->fetch();
    if (!$row) { http_response_code(404); exit('not found'); }

    $path = $voiceDir . '/' . basename($row['filename']);
    if (!is_file($path)) { http_response_code(410); exit('gone'); }

    header('Content-Type: audio/webm');
    header('Content-Length: ' . filesize($path));
    header('Accept-Ranges: bytes');
    header('Cache-Control: private, max-age=3600');
    readfile($path);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

/* ---------- آپلود recording جدید ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_FILES['audio'])) {
    $f = $_FILES['audio'];
    if ($f['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['ok' => false, 'error' => 'Upload error']); exit;
    }
    $max = 25 * 1024 * 1024; // 25MB
    if ($f['size'] > $max) {
        echo json_encode(['ok' => false, 'error' => 'File too large']); exit;
    }

    $duration = (int)($_POST['duration'] ?? 0);
    $title = trim((string)($_POST['title'] ?? ''));
    if ($title === '') {
        $title = 'Recording ' . date('Y-m-d H:i');
    }
    $title = mb_substr($title, 0, 100);

    $name = bin2hex(random_bytes(8)) . '.webm';
    if (!move_uploaded_file($f['tmp_name'], $voiceDir . '/' . $name)) {
        echo json_encode(['ok' => false, 'error' => 'Save failed']); exit;
    }

    $pdo->prepare('INSERT INTO voice_recordings (phone_id, filename, title, duration_ms, size) VALUES (?,?,?,?,?)')
        ->execute([$phoneId, $name, $title, $duration, (int)$f['size']]);

    echo json_encode([
        'ok' => true,
        'id' => (int)$pdo->lastInsertId(),
        'title' => $title,
        'duration_ms' => $duration,
        'filename' => $name,
        'size' => (int)$f['size'],
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- حذف ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_decode((string)file_get_contents('php://input'), true) ?: [];
    if (($in['action'] ?? '') === 'delete') {
        $id = (int)($in['id'] ?? 0);
        $st = $pdo->prepare('SELECT filename FROM voice_recordings WHERE id = ? AND phone_id = ?');
        $st->execute([$id, $phoneId]);
        if ($row = $st->fetch()) {
            @unlink($voiceDir . '/' . basename($row['filename']));
            $pdo->prepare('DELETE FROM voice_recordings WHERE id = ?')->execute([$id]);
            echo json_encode(['ok' => true]); exit;
        }
        echo json_encode(['ok' => false, 'error' => 'Not found']); exit;
    }
    
    if (($in['action'] ?? '') === 'rename') {
        $id = (int)($in['id'] ?? 0);
        $title = trim((string)($in['title'] ?? ''));
        if ($title === '') {
            echo json_encode(['ok' => false, 'error' => 'Empty title']); exit;
        }
        $title = mb_substr($title, 0, 100);
        $pdo->prepare('UPDATE voice_recordings SET title = ? WHERE id = ? AND phone_id = ?')
            ->execute([$title, $id, $phoneId]);
        echo json_encode(['ok' => true, 'title' => $title]); exit;
    }
}

/* ---------- لیست ---------- */
$st = $pdo->prepare('SELECT id, title, duration_ms, size, created_at FROM voice_recordings WHERE phone_id = ? ORDER BY id DESC');
$st->execute([$phoneId]);
$items = array_map(function($r) {
    $r['url'] = 'api/voice.php?audio=' . $r['id'];
    return $r;
}, $st->fetchAll());
echo json_encode(['ok' => true, 'items' => $items], JSON_UNESCAPED_UNICODE);