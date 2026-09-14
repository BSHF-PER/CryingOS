<?php
declare(strict_types=1);
require_once __DIR__ . '/../core/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

// Error handling
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    if (!isset($PHONE) || !isset($PHONE['id'])) {
        throw new Exception('Phone not resolved');
    }
    
    $phoneId = (int)$PHONE['id'];
    $pdo = db();

    /* ---------- GET: دریافت پروفایل ---------- */
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $st = $pdo->prepare('SELECT id, phone_number, display_name, status_message, uuid, created_at FROM telephones WHERE id = ?');
        $st->execute([$phoneId]);
        $row = $st->fetch();
        
        if (!$row) {
            echo json_encode(['ok' => false, 'error' => 'Phone not found']);
            exit;
        }
        
        echo json_encode([
            'ok' => true,
            'id' => (int)$row['id'],
            'phone_number' => $row['phone_number'] ?? null,
            'display_name' => $row['display_name'] ?? null,
            'status_message' => $row['status_message'] ?? null,
            'uuid' => $row['uuid'] ?? null,
            'created_at' => $row['created_at'] ?? null,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    /* ---------- POST: آپدیت پروفایل ---------- */
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $in = json_decode((string)file_get_contents('php://input'), true) ?: [];
        
        if (($in['action'] ?? '') === 'update') {
            $name = trim((string)($in['display_name'] ?? ''));
            $status = trim((string)($in['status_message'] ?? ''));
            
            $name = mb_substr($name, 0, 50);
            $status = mb_substr($status, 0, 100);
            
            $pdo->prepare('UPDATE telephones SET display_name = ?, status_message = ? WHERE id = ?')
                ->execute([$name, $status, $phoneId]);
            
            echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        echo json_encode(['ok' => false, 'error' => 'Invalid action']);
        exit;
    }

    http_response_code(405);
    
} catch (Throwable $e) {
    error_log('Profile API Error: ' . $e->getMessage());
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'phone_id' => $PHONE['id'] ?? null,
            'has_phone' => isset($PHONE) ? 'yes' : 'no'
        ]
    ], JSON_UNESCAPED_UNICODE);
}