<?php
declare(strict_types=1);
require_once __DIR__ . '/../core/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = db();
$phoneId = (int)$PHONE['id'];

/* ---------- GET: لیست آلارم‌ها ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $st = $pdo->prepare('SELECT id, hour, minute, label, enabled, created_at FROM alarms WHERE phone_id = ? ORDER BY hour, minute');
    $st->execute([$phoneId]);
    echo json_encode(['ok' => true, 'items' => $st->fetchAll()], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- POST ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_decode((string)file_get_contents('php://input'), true) ?: [];

    // ایجاد آلارم جدید
    if (($in['action'] ?? '') === 'create') {
        $hour = (int)($in['hour'] ?? 0);
        $minute = (int)($in['minute'] ?? 0);
        $label = trim((string)($in['label'] ?? 'Alarm'));
        
        if ($hour < 0 || $hour > 23 || $minute < 0 || $minute > 59) {
            echo json_encode(['ok' => false, 'error' => 'Invalid time']); exit;
        }
        
        $pdo->prepare('INSERT INTO alarms (phone_id, hour, minute, label) VALUES (?,?,?,?)')
            ->execute([$phoneId, $hour, $minute, $label]);
        
        echo json_encode(['ok' => true, 'id' => (int)$pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // فعال/غیرفعال کردن
    if (($in['action'] ?? '') === 'toggle') {
        $id = (int)($in['id'] ?? 0);
        $enabled = $in['enabled'] ? 1 : 0;
        $pdo->prepare('UPDATE alarms SET enabled = ? WHERE id = ? AND phone_id = ?')
            ->execute([$enabled, $id, $phoneId]);
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // حذف آلارم
    if (($in['action'] ?? '') === 'delete') {
        $id = (int)($in['id'] ?? 0);
        $pdo->prepare('DELETE FROM alarms WHERE id = ? AND phone_id = ?')
            ->execute([$id, $phoneId]);
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

http_response_code(405);