<?php
declare(strict_types=1);

const UUID_COOKIE = 'crying_phone_uuid';

function phone_set_cookie(string $uuid): void {
    if (($_COOKIE[UUID_COOKIE] ?? '') === $uuid) return;
    setcookie(UUID_COOKIE, $uuid, [
        'expires'  => time() + 86400 * 365 * 10,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    $_COOKIE[UUID_COOKIE] = $uuid;
}

/** گوشی کاربر را پیدا یا ایجاد می‌کند؛ هویت هرگز تغییر نمی‌کند. */
function phone_resolve(): array {
    $pdo  = db();
    $uuid = $_COOKIE[UUID_COOKIE] ?? '';

    if (!uuid16_valid($uuid)) {
        $uuid = uuid16_generate();
    }

    $st = $pdo->prepare('SELECT * FROM telephones WHERE uuid = ?');
    $st->execute([$uuid]);
    $phone = $st->fetch();

    if (!$phone) {
        // ✨ تولید خودکار شماره تلفن هنگام ساخت گوشی جدید
        $newNumber = generate_unique_phone_number($pdo);
        
        $pdo->prepare('INSERT INTO telephones (uuid, phone_number, name) VALUES (?, ?, ?)')
            ->execute([$uuid, $newNumber, 'Crying OS']);
        $id = (int)$pdo->lastInsertId();

        // نصب اپ‌های پیش‌فرض
        $defaults = $pdo->query('SELECT id FROM apps_catalog WHERE is_default = 1')
                        ->fetchAll(PDO::FETCH_COLUMN);
        $ins = $pdo->prepare('INSERT IGNORE INTO phone_apps (phone_id, app_id) VALUES (?, ?)');
        foreach ($defaults as $aid) $ins->execute([$id, (int)$aid]);

        $phone = [
            'id' => $id,
            'uuid' => $uuid,
            'phone_number' => $newNumber,
            'display_name' => null,
            'status_message' => null,
            'name' => 'Crying OS',
            'created_at' => date('Y-m-d H:i:s'),
            'lock_enabled' => 0
        ];
    }

    phone_set_cookie($uuid);
    $pdo->prepare('UPDATE telephones SET last_seen = NOW() WHERE id = ?')
        ->execute([(int)$phone['id']]);
    return $phone;
}

/**
 * تولید شماره تلفن یکتای ۱۱ رقمی با پیش‌شماره 01
 */
function generate_unique_phone_number($pdo): string {
    $maxAttempts = 100;
    $attempt = 0;
    
    do {
        $number = '01' . str_pad((string)random_int(0, 999999999), 9, '0', STR_PAD_LEFT);
        $st = $pdo->prepare('SELECT COUNT(*) FROM telephones WHERE phone_number = ?');
        $st->execute([$number]);
        $exists = (int)$st->fetchColumn();
        $attempt++;
        
        if ($attempt > $maxAttempts) {
            throw new RuntimeException('Could not generate unique phone number after ' . $maxAttempts . ' attempts');
        }
    } while ($exists > 0);
    
    return $number;
}

function phone_installed_apps(int $phoneId): array {
    $st = db()->prepare(
        'SELECT c.id, c.slug, c.name, c.description, c.icon, c.icon_type, c.icon_src,
                c.color, c.version, c.entry, c.styles, c.removable
         FROM phone_apps pa
         JOIN apps_catalog c ON c.id = pa.app_id
         WHERE pa.phone_id = ?
         ORDER BY c.sort, c.name'
    );
    $st->execute([$phoneId]);
    return $st->fetchAll();
}

function phone_install_app(int $phoneId, string $slug): array {
    $pdo = db();
    $st = $pdo->prepare('SELECT id FROM apps_catalog WHERE slug = ?');
    $st->execute([$slug]);
    $app = $st->fetch();
    if (!$app) return ['ok' => false, 'error' => 'برنامه در کاتالوگ نیست'];
    $pdo->prepare('INSERT IGNORE INTO phone_apps (phone_id, app_id) VALUES (?, ?)')
        ->execute([$phoneId, (int)$app['id']]);
    return ['ok' => true];
}

function phone_remove_app(int $phoneId, string $slug): array {
    $pdo = db();
    $st = $pdo->prepare('SELECT id, removable FROM apps_catalog WHERE slug = ?');
    $st->execute([$slug]);
    $app = $st->fetch();
    if (!$app) return ['ok' => false, 'error' => 'برنامه پیدا نشد'];
    if (! (int)$app['removable']) return ['ok' => false, 'error' => 'این برنامه قابل حذف نیست 😉'];
    $pdo->prepare('DELETE FROM phone_apps WHERE phone_id = ? AND app_id = ?')
        ->execute([$phoneId, (int)$app['id']]);
    return ['ok' => true];
}

/* ---------- مدیریت رمز ---------- */

function phone_get_lock_info(int $phoneId): array {
    $st = db()->prepare('SELECT lock_enabled FROM telephones WHERE id = ?');
    $st->execute([$phoneId]);
    $row = $st->fetch();
    return ['lock_enabled' => (bool)($row['lock_enabled'] ?? 0)];
}

function phone_set_password(int $phoneId, string $password): array {
    if (strlen($password) < 4) return ['ok' => false, 'error' => 'رمز باید حداقل ۴ کاراکتر باشد'];
    $hash = password_hash($password, PASSWORD_BCRYPT);
    db()->prepare('UPDATE telephones SET password_hash = ?, lock_enabled = 1 WHERE id = ?')
        ->execute([$hash, $phoneId]);
    return ['ok' => true];
}

function phone_clear_password(int $phoneId): array {
    db()->prepare('UPDATE telephones SET password_hash = NULL, lock_enabled = 0 WHERE id = ?')
        ->execute([$phoneId]);
    return ['ok' => true];
}

function phone_check_password(int $phoneId, string $password): bool {
    $st = db()->prepare('SELECT password_hash FROM telephones WHERE id = ? AND lock_enabled = 1');
    $st->execute([$phoneId]);
    $row = $st->fetch();
    if (!$row || empty($row['password_hash'])) return false;
    return password_verify($password, $row['password_hash']);
}

// اضافه کن به آخر فایل

function phone_get_number(int $phoneId): ?string {
    $st = db()->prepare('SELECT phone_number FROM telephones WHERE id = ?');
    $st->execute([$phoneId]);
    return $st->fetchColumn() ?: null;
}

function phone_set_number(int $phoneId, string $number): bool {
    // بررسی یکتا بودن
    $st = db()->prepare('SELECT COUNT(*) FROM telephones WHERE phone_number = ? AND id != ?');
    $st->execute([$number, $phoneId]);
    if ((int)$st->fetchColumn() > 0) return false;
    
    db()->prepare('UPDATE telephones SET phone_number = ? WHERE id = ?')
        ->execute([$number, $phoneId]);
    return true;
}

function phone_find_by_number(string $number): ?array {
    $st = db()->prepare('SELECT * FROM telephones WHERE phone_number = ?');
    $st->execute([$number]);
    return $st->fetch() ?: null;
}

function phone_get_profile(int $phoneId): array {
    $st = db()->prepare('SELECT phone_number, display_name, status_message FROM telephones WHERE id = ?');
    $st->execute([$phoneId]);
    return $st->fetch() ?: [];
}

function phone_update_profile(int $phoneId, array $data): bool {
    $fields = [];
    $params = [];
    
    if (isset($data['display_name'])) {
        $fields[] = 'display_name = ?';
        $params[] = $data['display_name'];
    }
    if (isset($data['status_message'])) {
        $fields[] = 'status_message = ?';
        $params[] = $data['status_message'];
    }
    
    if (empty($fields)) return false;
    
    $params[] = $phoneId;
    db()->prepare('UPDATE telephones SET ' . implode(', ', $fields) . ' WHERE id = ?')
        ->execute($params);
    return true;
}
