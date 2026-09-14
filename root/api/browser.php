<?php
declare(strict_types=1);
require_once __DIR__ . '/../core/bootstrap.php';

$pdo = db();
$phoneId = (int)$PHONE['id'];

$proxyPath = $_SERVER['SCRIPT_NAME'];
$proxyBase = $proxyPath . '?url=';

$url = $_GET['url'] ?? '';
if ($url === '') {
    http_response_code(400);
    exit('Missing URL');
}

$url = urldecode($url);

// ✨ FIX: Encode non-ASCII characters for validation
$urlForValidation = preg_replace_callback(
    '/[^\x20-\x7E]/',
    function($m) {
        return rawurlencode($m[0]);
    },
    $url
);

if (!filter_var($urlForValidation, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    exit('Invalid URL');
}

$parsed = parse_url($urlForValidation);
if (!$parsed || !isset($parsed['host']) || !isset($parsed['scheme'])) {
    http_response_code(400);
    exit('Invalid URL structure');
}

$host = strtolower($parsed['host']);
$scheme = strtolower($parsed['scheme']);

if (!in_array($scheme, ['http', 'https'])) {
    http_response_code(400);
    exit('Only http/https');
}

$blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
if (in_array($host, $blocked)) {
    http_response_code(403);
    exit('Blocked');
}

if (preg_match('/^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\.|^169\.254\./', $host)) {
    http_response_code(403);
    exit('Private IP blocked');
}

// cURL fetch - با URL encoded
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $urlForValidation,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 5,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => 0,
    CURLOPT_ENCODING => '',
    CURLOPT_HEADER => false,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: '';
$finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    exit('Failed to fetch');
}

$isHtml = stripos($contentType, 'text/html') !== false;
$isCss = stripos($contentType, 'text/css') !== false;

function proxyUrl(string $relUrl, string $baseUrl): string {
    global $proxyBase;
    $relUrl = trim($relUrl);
    if ($relUrl === '' || strpos($relUrl, 'data:') === 0 || strpos($relUrl, 'blob:') === 0) {
        return '';
    }
    if (preg_match('/^(#|javascript:|mailto:|tel:|sms:)/i', $relUrl)) {
        return '';
    }
    
    if (preg_match('#^https?://#i', $relUrl)) {
        return $proxyBase . urlencode($relUrl);
    }
    
    $base = parse_url($baseUrl);
    if (!$base || !isset($base['host'])) return '';
    
    $scheme = $base['scheme'] ?? 'https';
    $host = $base['host'];
    $port = isset($base['port']) ? ':' . $base['port'] : '';
    
    if (strpos($relUrl, '//') === 0) {
        $abs = $scheme . ':' . $relUrl;
        return $proxyBase . urlencode($abs);
    }
    
    if (strpos($relUrl, '/') === 0) {
        $abs = $scheme . '://' . $host . $port . $relUrl;
        return $proxyBase . urlencode($abs);
    }
    
    if (strpos($relUrl, '?') === 0) {
        $basePath = $base['path'] ?? '/';
        $abs = $scheme . '://' . $host . $port . $basePath . $relUrl;
        return $proxyBase . urlencode($abs);
    }
    
    $basePath = $base['path'] ?? '/';
    $basePath = preg_replace('#/[^/]*$#', '/', $basePath);
    $abs = $scheme . '://' . $host . $port . $basePath . $relUrl;
    return $proxyBase . urlencode($abs);
}

if ($isHtml) {
    $response = preg_replace('/<meta[^>]+http-equiv=["\']x-frame-options["\'][^>]*>/i', '', $response);
    $response = preg_replace('/<meta[^>]+http-equiv=["\']content-security-policy["\'][^>]*>/i', '', $response);
    
    $attrs = ['href', 'src', 'action', 'poster', 'data-src', 'data-href', 'data-url'];
    foreach ($attrs as $attr) {
        $response = preg_replace_callback(
            '/\b' . $attr . '\s*=\s*(["\'])([^"\']*?)\1/i',
            function($m) use ($finalUrl, $attr) {
                $quote = $m[1];
                $val = $m[2];
                $rewritten = proxyUrl($val, $finalUrl);
                if ($rewritten === '') return $m[0];
                return $attr . '=' . $quote . $rewritten . $quote;
            },
            $response
        );
    }
    
    $response = preg_replace_callback(
        '/\bsrcset\s*=\s*(["\'])([^"\']*?)\1/i',
        function($m) use ($finalUrl) {
            $quote = $m[1];
            $val = rewriteSrcset($m[2], $finalUrl);
            return 'srcset=' . $quote . $val . $quote;
        },
        $response
    );
    
    $response = preg_replace_callback(
        '/\bstyle\s*=\s*(["\'])(.*?)\1/i',
        function($m) use ($finalUrl) {
            $quote = $m[1];
            $style = rewriteCss($m[2], $finalUrl);
            return 'style=' . $quote . $style . $quote;
        },
        $response
    );
    
    $response = preg_replace_callback(
        '/<style([^>]*)>(.*?)<\/style>/is',
        function($m) use ($finalUrl) {
            return '<style' . $m[1] . '>' . rewriteCss($m[2], $finalUrl) . '</style>';
        },
        $response
    );
    
    $escapedProxyBase = addslashes($proxyBase);
    $interceptorScript = '<script>
(function(){
    window.__PROXY_BASE__ = "' . $escapedProxyBase . '";
    
    function extractOriginalUrl(proxiedUrl) {
        if (!proxiedUrl) return "";
        var idx = proxiedUrl.indexOf(window.__PROXY_BASE__);
        if (idx === -1) return proxiedUrl;
        var encoded = proxiedUrl.substring(idx + window.__PROXY_BASE__.length);
        var ampIdx = encoded.indexOf("&");
        if (ampIdx !== -1) encoded = encoded.substring(0, ampIdx);
        try {
            return decodeURIComponent(encoded);
        } catch(e) {
            return encoded;
        }
    }
    
    function proxyNavigate(targetUrl) {
        if (!targetUrl) return;
        window.location.href = window.__PROXY_BASE__ + encodeURIComponent(targetUrl);
    }
    
    document.addEventListener("click", function(e) {
        var link = e.target.closest("a");
        if (!link) return;
        
        var rawHref = link.getAttribute("href");
        if (!rawHref) return;
        if (rawHref.indexOf("#") === 0 || rawHref.indexOf("javascript:") === 0) return;
        if (rawHref.indexOf(window.__PROXY_BASE__) === 0) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        var absoluteUrl = link.href;
        if (absoluteUrl.indexOf(window.__PROXY_BASE__) === 0) {
            window.location.href = absoluteUrl;
            return;
        }
        
        proxyNavigate(absoluteUrl);
    }, true);
    
    document.addEventListener("submit", function(e) {
        var form = e.target;
        if (!form) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        var action = form.getAttribute("action") || "";
        var targetUrl = "";
        
        if (action.indexOf(window.__PROXY_BASE__) === 0) {
            targetUrl = extractOriginalUrl(action);
        } else if (action === "" || action.indexOf("#") === 0) {
            targetUrl = extractOriginalUrl(window.location.href);
        } else {
            targetUrl = form.action;
            if (targetUrl.indexOf(window.__PROXY_BASE__) !== -1) {
                targetUrl = extractOriginalUrl(targetUrl);
            }
        }
        
        if (!targetUrl) {
            targetUrl = extractOriginalUrl(window.location.href);
        }
        
        var formData = new FormData(form);
        var params = new URLSearchParams();
        formData.forEach(function(value, key) {
            if (key) params.append(key, value);
        });
        
        var qs = params.toString();
        if (qs) {
            var sep = targetUrl.indexOf("?") !== -1 ? "&" : "?";
            targetUrl = targetUrl + sep + qs;
        }
        
        proxyNavigate(targetUrl);
        return false;
    }, true);
    
    var origOpen = window.open;
    window.open = function(url, name, features) {
        if (url && typeof url === "string" && url.indexOf(window.__PROXY_BASE__) !== 0) {
            url = window.__PROXY_BASE__ + encodeURIComponent(url);
        }
        return origOpen.call(window, url, name, features);
    };
    
    try {
        history.pushState = function(){};
        history.replaceState = function(){};
    } catch(e){}
})();
</script>';
    
    $response = preg_replace(
        '/<head([^>]*)>/i',
        '<head$1>' . $interceptorScript,
        $response,
        1
    );
    
    $banner = '<div id="__proxy_banner__" style="position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,#5856D6,#007AFF);color:#fff;padding:8px 16px;font:13px system-ui;z-index:2147483647;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.2)">' .
        '<span>🔒 Secure Proxy · ' . htmlspecialchars($host) . '</span>' .
        '<button onclick="this.parentElement.style.display=\'none\';document.documentElement.style.paddingTop=\'0\'" style="background:rgba(255,255,255,0.2);border:none;color:#fff;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:12px">✕ Hide</button>' .
        '</div>' .
        '<style>html { padding-top: 36px !important; }</style>';
    
    $response = preg_replace('/<body([^>]*)>/i', '<body$1>' . $banner, $response, 1);
    
    header('Content-Type: text/html; charset=utf-8');
    echo $response;
    exit;
}

if ($isCss) {
    header('Content-Type: text/css; charset=utf-8');
    echo rewriteCss($response, $finalUrl);
    exit;
}

header('Content-Type: ' . $contentType);
header('Cache-Control: private, max-age=3600');
echo $response;
exit;

function rewriteCss(string $css, string $baseUrl): string {
    $css = preg_replace_callback(
        '/url\(\s*(["\']?)([^"\'()]+?)\1\s*\)/i',
        function($m) use ($baseUrl) {
            $url = $m[2];
            if (strpos($url, 'data:') === 0) return $m[0];
            $rewritten = proxyUrl($url, $baseUrl);
            if ($rewritten === '') return $m[0];
            return 'url("' . $rewritten . '")';
        },
        $css
    );
    $css = preg_replace_callback(
        '/@import\s+(["\'])([^"\']+?)\1/i',
        function($m) use ($baseUrl) {
            $rewritten = proxyUrl($m[2], $baseUrl);
            if ($rewritten === '') return $m[0];
            return '@import "' . $rewritten . '"';
        },
        $css
    );
    return $css;
}

function rewriteSrcset(string $srcset, string $baseUrl): string {
    $parts = preg_split('/\s*,\s*/', $srcset);
    $newParts = [];
    foreach ($parts as $part) {
        $tokens = preg_split('/\s+/', trim($part), 2);
        if (empty($tokens[0])) continue;
        $rewritten = proxyUrl($tokens[0], $baseUrl);
        if ($rewritten === '') {
            $newParts[] = $part;
        } else {
            $newParts[] = $rewritten . (isset($tokens[1]) ? ' ' . $tokens[1] : '');
        }
    }
    return implode(', ', $newParts);
}