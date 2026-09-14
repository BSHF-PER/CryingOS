<?php
declare(strict_types=1);
require_once __DIR__ . '/../core/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');

$phoneId = (int)$PHONE['id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $info = phone_get_lock_info($phoneId);
    echo json_encode(['ok' => true] + $info, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_decode((string)file_get_contents('php://input'), true) ?: [];
    $action = (string)($in['action'] ?? '');

    if ($action === 'set_password') {
        $password = (string)($in['password'] ?? '');
        echo json_encode(phone_set_password($phoneId, $password), JSON_UNESCAPED_UNICODE);
    } elseif ($action === 'clear_password') {
        echo json_encode(phone_clear_password($phoneId), JSON_UNESCAPED_UNICODE);
    } elseif ($action === 'check_password') {
        $password = (string)($in['password'] ?? '');
        $ok = phone_check_password($phoneId, $password);
        echo json_encode(['ok' => $ok], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['ok' => false, 'error' => 'action نامعتبر'], JSON_UNESCAPED_UNICODE);
    }
    exit;
}
http_response_code(405);