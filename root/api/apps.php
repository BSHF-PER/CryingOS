<?php
declare(strict_types=1);
require_once __DIR__ . '/../core/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');

$pdo = db();
$phoneId = (int)$PHONE['id'];

function app_row(array $c, ?bool $installed = null): array {
    $row = [
        'slug' => $c['slug'],
        'name' => $c['name'],
        'icon' => $c['icon'],
        'iconType' => $c['icon_type'] ?? 'emoji',
        'iconSrc' => $c['icon_src'] ?? '',
        'color' => $c['color'],
        'version' => $c['version'],
        'description' => $c['description'],
        'removable' => (bool)$c['removable'],
        'entry' => $c['entry'],
        'styles' => json_decode($c['styles'] ?: '[]', true) ?: [],
    ];
    if ($installed !== null) $row['installed'] = $installed;
    return $row;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (($_GET['all'] ?? '') === '1') {
        $st = $pdo->prepare(
            'SELECT c.*, (pa.phone_id IS NOT NULL) AS installed
             FROM apps_catalog c
             LEFT JOIN phone_apps pa ON pa.app_id = c.id AND pa.phone_id = ?
             ORDER BY c.sort, c.name'
        );
        $st->execute([$phoneId]);
        $out = array_map(fn($r) => app_row($r, (bool)$r['installed']), $st->fetchAll());
    } else {
        $out = array_map(fn($r) => app_row($r), phone_installed_apps($phoneId));
    }
    echo json_encode(['ok' => true, 'apps' => $out], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_decode((string)file_get_contents('php://input'), true) ?: [];
    $action = $in['action'] ?? '';
    $slug = (string)($in['slug'] ?? '');

    if ($action === 'install') {
        $r = phone_install_app($phoneId, $slug);
    } elseif ($action === 'remove') {
        $r = phone_remove_app($phoneId, $slug);
    } else {
        $r = ['ok' => false, 'error' => 'اکشن نامعتبر'];
    }
    echo json_encode($r, JSON_UNESCAPED_UNICODE);
    exit;
}
http_response_code(405);
