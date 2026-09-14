#!/usr/bin/env python3
"""Crying OS proxy — نسخه بهبود یافته"""
import sys
import json
import base64
import socket
import ipaddress
import gzip
import zlib
from urllib import request as urlreq, error as urlerror
from urllib.parse import urlparse

TIMEOUT   = 30
MAX_BYTES = 15 * 1024 * 1024
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 CryingPhone/1.0")

PRIVATE_RANGES = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

# هدرهایی که باید فیلتر بشن (مشکل‌ساز برای iframe)
BLOCKED_HEADERS = {
    'content-security-policy',
    'content-security-policy-report-only',
    'x-frame-options',
    'cross-origin-opener-policy',
    'cross-origin-embedder-policy',
    'cross-origin-resource-policy',
    'strict-transport-security',
    'x-content-type-options',
    'x-xss-protection',
}

def die(msg, code=400):
    print(json.dumps({"ok": False, "error": str(msg), "status": code}, ensure_ascii=False))
    sys.exit(0)

def is_private(host):
    try:
        infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        return True
    
    for info in infos:
        ip_str = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        for net in PRIVATE_RANGES:
            if ip in net:
                return True
    return False

def decompress_if_needed(body, headers):
    encoding = headers.get('Content-Encoding', '').lower()
    
    if encoding == 'gzip':
        try:
            return gzip.decompress(body)
        except Exception:
            return body
    elif encoding == 'deflate':
        try:
            return zlib.decompress(body)
        except Exception:
            try:
                return zlib.decompress(body, -zlib.MAX_WBITS)
            except Exception:
                return body
    elif encoding == 'br':
        try:
            import brotli
            return brotli.decompress(body)
        except Exception:
            return body
    
    return body

def filter_headers(headers):
    """حذف هدرهای مشکل‌ساز"""
    return {k: v for k, v in headers.items() if k.lower() not in BLOCKED_HEADERS}

def main():
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except Exception as e:
        die(f"JSON parse error: {e}")

    url    = (payload.get("url") or "").strip()
    method = (payload.get("method") or "GET").upper()
    cookies = payload.get("cookies", {})
    
    if method not in ("GET", "POST", "HEAD", "PUT", "DELETE"):
        die("method not allowed")
    
    p = urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname:
        die("only http/https allowed")
    
    if is_private(p.hostname):
        die("private host blocked", 403)

    data = payload.get("body")
    if isinstance(data, str):
        data = data.encode()

    req = urlreq.Request(url, data=data, method=method)
    req.add_header("User-Agent", UA)
    req.add_header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
    req.add_header("Accept-Language", "fa,en;q=0.8")
    req.add_header("Accept-Encoding", "gzip, deflate")
    
    if cookies:
        cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
        req.add_header("Cookie", cookie_str)

    try:
        with urlreq.urlopen(req, timeout=TIMEOUT) as r:
            raw_body = r.read(MAX_BYTES)
            status   = r.status
            headers  = dict(r.headers)
            
            body = decompress_if_needed(raw_body, headers)
            ctype = headers.get("Content-Type", "application/octet-stream")
            
            set_cookies = []
            for k, v in r.headers.items():
                if k.lower() == 'set-cookie':
                    set_cookies.append(v)
                    
    except urlerror.HTTPError as e:
        raw_body = e.read(MAX_BYTES)
        status   = e.code
        headers  = dict(e.headers)
        body     = decompress_if_needed(raw_body, headers)
        ctype    = headers.get("Content-Type", "text/plain")
        set_cookies = [v for k, v in e.headers.items() if k.lower() == 'set-cookie']
    except urlerror.URLError as e:
        die(f"URL Error: {e.reason}", 502)
    except socket.timeout:
        die("Connection timeout", 504)
    except Exception as e:
        die(f"Error: {type(e).__name__}: {e}", 502)

    # فیلتر کردن هدرهای مشکل‌ساز
    filtered_headers = filter_headers(headers)

    print(json.dumps({
        "ok": True,
        "status": status,
        "content_type": ctype,
        "headers": filtered_headers,
        "body_b64": base64.b64encode(body).decode(),
        "set_cookies": set_cookies,
    }, ensure_ascii=False))

if __name__ == "__main__":
    main()
