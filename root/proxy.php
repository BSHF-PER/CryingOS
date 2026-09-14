<?php
declare(strict_types=1);
require_once __DIR__ . '/core/bootstrap.php';

session_start();
$cookieJar = $_SESSION['proxy_cookies'] ?? [];

header('Access-Control-Allow-Origin: *');
header_remove('X-Frame-Options');
header_remove('Content-Security-Policy');
header_remove('Content-Security-Policy-Report-Only');
header_remove('Cross-Origin-Opener-Policy');
header_remove('Cross-Origin-Embedder-Policy');
header_remove('Cross-Origin-Resource-Policy');
header("Content-Security-Policy: frame-ancestors *");

$url = (string)($_GET['url'] ?? '');
if (!$url || !preg_match('#^https?://#i', $url)) {
    http_response_code(400);
    exit('bad url');
}

$host = parse_url($url, PHP_URL_HOST);
if (!$host || is_private_host($host)) {
    http_response_code(403);
    exit('blocked');
}

$method = $_SERVER['REQUEST_METHOD'];
$body = $method === 'POST' ? file_get_contents('php://input') : null;

try {
    $result = cp_proxy_fetch($url, $method, $body, $cookieJar);
} catch (Throwable $e) {
    http_response_code(500);
    exit('error: ' . $e->getMessage());
}

if (!$result || !($result['ok'] ?? false)) {
    http_response_code(502);
    exit('failed: ' . ($result['error'] ?? '?'));
}

if (!empty($result['set_cookies'])) {
    foreach ($result['set_cookies'] as $ck) {
        if (preg_match('/^([^=]+)=([^;]*)/', $ck, $m)) {
            $cookieJar[$m[1]] = $m[2];
        }
    }
    $_SESSION['proxy_cookies'] = $cookieJar;
}

$ct = $result['content_type'] ?? 'application/octet-stream';
$data = base64_decode($result['body_b64'] ?? '');

if (preg_match('#^text/html#i', $ct)) {
    $data = rewrite_html($data, $url);
    header('Content-Type: text/html; charset=utf-8');
    echo $data;
    exit;
}

header('Content-Type: ' . $ct);
header('Content-Length: ' . strlen($data));
echo $data;

/* ---------- توابع ---------- */

function is_private_host(string $host): bool {
    if (in_array($host, ['localhost', '127.0.0.1', '0.0.0.0', '::1'])) {
        return true;
    }
    $ip = gethostbyname($host);
    if ($ip === $host) {
        return false;
    }
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        return false;
    }
    return !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
}

function cp_proxy_fetch(string $url, string $method, ?string $body, array $cookies): ?array {
    $proc = proc_open(
        [PYTHON_BIN, PROXY_SCRIPT],
        [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes
    );
    
    if (!is_resource($proc)) {
        throw new RuntimeException('proc failed');
    }
    
    fwrite($pipes[0], json_encode([
        'url' => $url,
        'method' => $method,
        'body' => $body,
        'cookies' => $cookies
    ], JSON_UNESCAPED_SLASHES));
    fclose($pipes[0]);
    
    stream_set_timeout($pipes[1], 45);
    $stdout = stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    proc_close($proc);
    
    $d = json_decode((string)$stdout, true);
    if (!is_array($d)) {
        throw new RuntimeException('bad JSON: ' . substr((string)$stdout, 0, 200));
    }
    return $d;
}

function rewrite_html(string $html, string $baseUrl): string {
    $base = rtrim(preg_replace('#/[^/]*$#', '/', $baseUrl), '/');
    
    // حذف CSP meta
    $html = preg_replace(
        '#<meta[^>]+http-equiv=["\']?(Content-Security-Policy|X-Frame-Options)["\']?[^>]*>#i',
        '',
        $html
    );
    
    // Rewrite href, action, poster
    $html = preg_replace_callback(
        '#((?:href|action|poster)\s*=\s*)(["\'])([^"\']+)\2#i',
        function($m) use ($base) {
            $url = $m[3];
            if (strpos($url, 'proxy.php') === 0) {
                return $m[0];
            }
            $abs = absolutize($url, $base);
            if (!$abs) {
                return $m[0];
            }
            return $m[1] . $m[2] . 'proxy.php?url=' . urlencode($abs) . $m[2];
        },
        $html
    );
    
    // Rewrite src (غیر از script)
    $html = preg_replace_callback(
        '#(<(?!script\b)([a-z]+)[^>]*?\s)src\s*=\s*(["\'])([^"\']+)\3#i',
        function($m) use ($base) {
            $url = $m[4];
            if (strpos($url, 'proxy.php') === 0) {
                return $m[0];
            }
            $abs = absolutize($url, $base);
            if (!$abs) {
                return $m[0];
            }
            return $m[1] . 'src=' . $m[3] . 'proxy.php?url=' . urlencode($abs) . $m[3];
        },
        $html
    );
    
    // تزریق اسکریپت کلیک و فرم
    $inject = '<script>';
    $inject .= '(function(){';
    $inject .= 'document.addEventListener("click", function(e){';
    $inject .= 'var a = e.target && e.target.closest ? e.target.closest("a") : null;';
    $inject .= 'if (a) {';
    $inject .= 'var href = a.getAttribute("href");';
    $inject .= 'if (href && href !== "#" && href.indexOf("javascript:") !== 0 && href.indexOf("proxy.php") === -1) {';
    $inject .= 'e.preventDefault();';
    $inject .= 'parent.postMessage({cpNav: href}, "*");';
    $inject .= '}';
    $inject .= '}';
    $inject .= '}, true);';
    $inject .= 'document.addEventListener("submit", function(e){';
    $inject .= 'e.preventDefault();';
    $inject .= 'var form = e.target;';
    $inject .= 'var action = form.getAttribute("action") || location.href;';
    $inject .= 'if (action.indexOf("proxy.php") === 0) {';
    $inject .= 'var match = action.match(/[?&]url=([^&]+)/);';
    $inject .= 'if (match) { parent.postMessage({cpNav: decodeURIComponent(match[1])}, "*"); return; }';
    $inject .= '}';
    $inject .= 'var method = (form.getAttribute("method") || "GET").toUpperCase();';
    $inject .= 'var fd = new FormData(form);';
    $inject .= 'if (method === "GET") {';
    $inject .= 'var qs = new URLSearchParams(fd).toString();';
    $inject .= 'parent.postMessage({cpNav: action + (action.indexOf("?")>-1?"&":"?") + qs}, "*");';
    $inject .= '} else {';
    $inject .= 'parent.postMessage({cpNav: action}, "*");';
    $inject .= '}';
    $inject .= '}, true);';
    $inject .= 'window.open = function(url){ if(url) parent.postMessage({cpNav: url}, "*"); return null; };';
    $inject .= '})();';
    $inject .= '</script>';
    
    if (stripos($html, '</body>') !== false) {
        $html = str_ireplace('</body>', $inject . '</body>', $html);
    } elseif (stripos($html, '</html>') !== false) {
        $html = str_ireplace('</html>', $inject . '</html>', $html);
    } else {
        $html .= $inject;
    }
    
    return $html;
}

function absolutize(string $url, string $base): ?string {
    $url = trim($url);
    if (!$url) {
        return null;
    }
    if (strpos($url, 'data:') === 0) {
        return null;
    }
    if (strpos($url, 'javascript:') === 0) {
        return null;
    }
    if ($url === '#') {
        return null;
    }
    if (strpos($url, 'blob:') === 0) {
        return null;
    }
    if (preg_match('#^https?://#i', $url)) {
        return $url;
    }
    if (strpos($url, '//') === 0) {
        $scheme = parse_url($base, PHP_URL_SCHEME) ?: 'https';
        return $scheme . ':' . $url;
    }
    if (isset($url[0]) && $url[0] === '/') {
        $scheme = parse_url($base, PHP_URL_SCHEME) ?: 'https';
        $host = parse_url($base, PHP_URL_HOST) ?: '';
        return $scheme . '://' . $host . $url;
    }
    return $base . '/' . ltrim($url, '/');
}
