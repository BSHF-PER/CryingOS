<?php
declare(strict_types=1);
require_once __DIR__ . '/../core/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = db();
$phoneId = (int)$PHONE['id'];

/* ---------- GET: لیست مخاطبین ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $st = $pdo->prepare(
        'SELECT c.*, t.display_name, t.status_message,
                (SELECT COUNT(*) FROM messages WHERE sender_id = (SELECT id FROM telephones WHERE phone_number = c.phone_number) AND receiver_id = ? AND read_at IS NULL) as unread_count
         FROM contacts c
         LEFT JOIN telephones t ON t.phone_number = c.phone_number
         WHERE c.phone_id = ?
         ORDER BY c.name'
    );
    $st->execute([$phoneId, $phoneId]);
    echo json_encode(['ok' => true, 'items' => $st->fetchAll()], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- POST ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_decode((string)file_get_contents('php://input'), true) ?: [];

    // افزودن مخاطب
    if (($in['action'] ?? '') === 'add') {
        $name = trim((string)($in['name'] ?? ''));
        $number = trim((string)($in['phone_number'] ?? ''));
        $note = trim((string)($in['note'] ?? ''));
        
        if ($name === '' || $number === '') {
            echo json_encode(['ok' => false, 'error' => 'Name and number required']); exit;
        }
        
        // بررسی فرمت شماره
        if (!preg_match('/^01\d{9}$/', $number)) {
            echo json_encode(['ok' => false, 'error' => 'Number must be 11 digits starting with 01']); exit;
        }
        
        // بررسی وجود شماره در سیستم
        $exists = phone_find_by_number($number);
        $existsInSystem = $exists ? true : false;
        
        // بررسی تکراری نبودن
        $st = $pdo->prepare('SELECT COUNT(*) FROM contacts WHERE phone_id = ? AND phone_number = ?');
        $st->execute([$phoneId, $number]);
        if ((int)$st->fetchColumn() > 0) {
            echo json_encode(['ok' => false, 'error' => 'Contact already exists']); exit;
        }
        
        $pdo->prepare('INSERT INTO contacts (phone_id, name, phone_number, note) VALUES (?,?,?,?)')
            ->execute([$phoneId, $name, $number, $note]);
        
        echo json_encode([
            'ok' => true,
            'id' => (int)$pdo->lastInsertId(),
            'in_system' => $existsInSystem
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ویرایش مخاطب
    if (($in['action'] ?? '') === 'update') {
        $id = (int)($in['id'] ?? 0);
        $name = trim((string)($in['name'] ?? ''));
        $note = trim((string)($in['note'] ?? ''));
        
        if ($name === '') {
            echo json_encode(['ok' => false, 'error' => 'Name required']); exit;
        }
        
        $pdo->prepare('UPDATE contacts SET name = ?, note = ? WHERE id = ? AND phone_id = ?')
            ->execute([$name, $note, $id, $phoneId]);
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // بلاک کردن
    if (($in['action'] ?? '') === 'toggle_block') {
        $id = (int)($in['id'] ?? 0);
        $blocked = $in['blocked'] ? 1 : 0;
        $pdo->prepare('UPDATE contacts SET is_blocked = ? WHERE id = ? AND phone_id = ?')
            ->execute([$blocked, $id, $phoneId]);
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // حذف مخاطب
    if (($in['action'] ?? '') === 'delete') {
        $id = (int)($in['id'] ?? 0);
        $pdo->prepare('DELETE FROM contacts WHERE id = ? AND phone_id = ?')
            ->execute([$id, $phoneId]);
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

http_response_code(405);