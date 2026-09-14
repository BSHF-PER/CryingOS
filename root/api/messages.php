<?php
declare(strict_types=1);
require_once __DIR__ . '/../core/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = db();
$phoneId = (int)$PHONE['id'];

/* ---------- GET ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    // حالت ۱: پیام‌های یک مکالمه خاص
    if (isset($_GET['with'])) {
        $otherId = (int)$_GET['with'];
        
        $st = $pdo->prepare(
            'SELECT m.*, t.display_name as sender_name, t.phone_number as sender_phone
             FROM messages m
             JOIN telephones t ON t.id = m.sender_id
             WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
             ORDER BY m.created_at ASC'
        );
        $st->execute([$phoneId, $otherId, $otherId, $phoneId]);
        $messages = $st->fetchAll();
        
        // علامت‌گذاری به عنوان خوانده شده
        $pdo->prepare('UPDATE messages SET read_at = NOW() WHERE receiver_id = ? AND sender_id = ? AND read_at IS NULL')
            ->execute([$phoneId, $otherId]);
        
        echo json_encode(['ok' => true, 'items' => $messages], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // حالت ۲: لیست مکالمات
    $st = $pdo->prepare(
        'SELECT 
            CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_id,
            MAX(created_at) as last_message_time,
            COUNT(*) as message_count,
            SUM(CASE WHEN receiver_id = ? AND read_at IS NULL THEN 1 ELSE 0 END) as unread_count
         FROM messages
         WHERE sender_id = ? OR receiver_id = ?
         GROUP BY CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
         ORDER BY last_message_time DESC'
    );
    $st->execute([$phoneId, $phoneId, $phoneId, $phoneId, $phoneId]);
    $conversations = $st->fetchAll();
    
    // اضافه کردن اطلاعات طرف مقابل
    foreach ($conversations as &$conv) {
        // آخرین پیام
        $lastMsgSt = $pdo->prepare(
            'SELECT content FROM messages 
             WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
             ORDER BY created_at DESC LIMIT 1'
        );
        $lastMsgSt->execute([$phoneId, $conv['other_id'], $conv['other_id'], $phoneId]);
        $conv['last_message'] = $lastMsgSt->fetchColumn() ?: '';
        
        // اطلاعات طرف مقابل
        $otherSt = $pdo->prepare('SELECT id, phone_number, display_name FROM telephones WHERE id = ?');
        $otherSt->execute([$conv['other_id']]);
        $other = $otherSt->fetch();
        
        if ($other) {
            $conv['other_phone'] = $other['phone_number'];
            $conv['other_name'] = $other['display_name'];
            
            $contactSt = $pdo->prepare('SELECT name, is_blocked FROM contacts WHERE phone_id = ? AND phone_number = ?');
            $contactSt->execute([$phoneId, $other['phone_number']]);
            $contact = $contactSt->fetch();
            $conv['contact_name'] = $contact['name'] ?? null;
            $conv['is_blocked'] = (int)($contact['is_blocked'] ?? 0);
        }
    }
    
    echo json_encode(['ok' => true, 'items' => $conversations], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- POST ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_decode((string)file_get_contents('php://input'), true) ?: [];

    // ارسال پیام
    if (($in['action'] ?? '') === 'send') {
        $toNumber = trim((string)($in['to'] ?? ''));
        $content = trim((string)($in['content'] ?? ''));
        
        if ($content === '') {
            echo json_encode(['ok' => false, 'error' => 'Message is empty']); exit;
        }
        if (strlen($content) > 1000) {
            echo json_encode(['ok' => false, 'error' => 'Message too long']); exit;
        }
        
        if (!preg_match('/^01\d{9}$/', $toNumber)) {
            echo json_encode(['ok' => false, 'error' => 'Invalid number format']); exit;
        }
        
        // پیدا کردن گیرنده
        $receiver = phone_find_by_number($toNumber);
        if (!$receiver) {
            echo json_encode(['ok' => false, 'error' => 'Number not found in system']); exit;
        }
        
        // چک کنیم خودمون نباشه
        if ((int)$receiver['id'] === $phoneId) {
            echo json_encode(['ok' => false, 'error' => 'Cannot message yourself']); exit;
        }
        
        // چک بلاک نبودن
        $blockSt = $pdo->prepare('SELECT is_blocked FROM contacts WHERE phone_id = ? AND phone_number = ?');
        $blockSt->execute([(int)$receiver['id'], phone_get_number($phoneId)]);
        if ($blockSt->fetchColumn()) {
            echo json_encode(['ok' => false, 'error' => 'You are blocked by this user']); exit;
        }
        
        $pdo->prepare('INSERT INTO messages (sender_id, receiver_id, content) VALUES (?,?,?)')
            ->execute([$phoneId, (int)$receiver['id'], $content]);
        
        echo json_encode(['ok' => true, 'id' => (int)$pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // چک پیام‌های جدید
    if (($in['action'] ?? '') === 'check_new') {
        $st = $pdo->prepare(
            'SELECT COUNT(*) as count, COUNT(DISTINCT sender_id) as senders
             FROM messages WHERE receiver_id = ? AND read_at IS NULL'
        );
        $st->execute([$phoneId]);
        $result = $st->fetch();
        
        echo json_encode([
            'ok' => true,
            'unread_count' => (int)$result['count'],
            'sender_count' => (int)$result['senders']
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
    // ✨ پاک کردن تاریخچه یک مکالمه
    if (($in['action'] ?? '') === 'clear_history') {
        $otherId = (int)($in['with'] ?? 0);
        if ($otherId <= 0) {
            echo json_encode(['ok' => false, 'error' => 'Invalid conversation']); exit;
        }
        
        $pdo->prepare(
            'DELETE FROM messages 
             WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)'
        )->execute([$phoneId, $otherId, $otherId, $phoneId]);
        
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // ✨ جستجو در پیام‌ها
    if (($in['action'] ?? '') === 'search') {
        $query = trim((string)($in['query'] ?? ''));
        if ($query === '') {
            echo json_encode(['ok' => true, 'items' => []]); exit;
        }
        
        $searchTerm = '%' . $query . '%';
        $st = $pdo->prepare(
            'SELECT m.*, 
                    t.phone_number as sender_phone,
                    t.display_name as sender_name,
                    CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_id
             FROM messages m
             JOIN telephones t ON t.id = m.sender_id
             WHERE (m.sender_id = ? OR m.receiver_id = ?)
               AND m.content LIKE ?
             ORDER BY m.created_at DESC
             LIMIT 50'
        );
        $st->execute([$phoneId, $phoneId, $phoneId, $searchTerm]);
        $results = $st->fetchAll();
        
        // اضافه کردن اطلاعات طرف مقابل
        foreach ($results as &$msg) {
            $otherSt = $pdo->prepare('SELECT phone_number, display_name FROM telephones WHERE id = ?');
            $otherSt->execute([$msg['other_id']]);
            $other = $otherSt->fetch();
            if ($other) {
                $msg['other_phone'] = $other['phone_number'];
                $msg['other_name'] = $other['display_name'];
                
                $contactSt = $pdo->prepare('SELECT name FROM contacts WHERE phone_id = ? AND phone_number = ?');
                $contactSt->execute([$phoneId, $other['phone_number']]);
                $contact = $contactSt->fetch();
                $msg['contact_name'] = $contact['name'] ?? null;
            }
        }
        
        echo json_encode(['ok' => true, 'items' => $results], JSON_UNESCAPED_UNICODE);
        exit;
    }
http_response_code(405);