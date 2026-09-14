<?php
declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_NAME = 'crying_phone';
const DB_USER = 'root';
const DB_PASS = '';                      // ← رمز دیتابیس خودت
const DB_CHARSET = 'utf8mb4';

define('ROOT_PATH', dirname(__DIR__));
define('APPS_DIR', ROOT_PATH . '/apps');
define('UPLOAD_DIR', ROOT_PATH . '/uploads/gallery');
define('PYTHON_BIN', 'python3');         // در ویندوز: 'python'
define('PROXY_SCRIPT', ROOT_PATH . '/python/proxy.py');

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET,
            DB_USER, DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    }
    return $pdo;
}
