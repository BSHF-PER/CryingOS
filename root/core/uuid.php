<?php
declare(strict_types=1);

/** UUID شانزده‌کاراکتری: حروف بزرگ + کوچک + اعداد */
function uuid16_generate(): string {
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    $bytes = random_bytes(16);
    $out = '';
    for ($i = 0; $i < 16; $i++) {
        $out .= $alphabet[ord($bytes[$i]) % 62];
    }
    return $out;
}

function uuid16_valid(string $uuid): bool {
    return preg_match('/^[A-Za-z0-9]{16}$/', $uuid) === 1;
}
