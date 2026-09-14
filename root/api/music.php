<?php
declare(strict_types=1);
require_once __DIR__ . '/../core/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = db();
$phoneId = (int)$PHONE['id'];
$musicDir = ROOT_PATH . '/uploads/music';
$coverDir = ROOT_PATH . '/uploads/covers';
if (!is_dir($musicDir)) mkdir($musicDir, 0775, true);
if (!is_dir($coverDir)) mkdir($coverDir, 0775, true);

/* ---------- پخش آهنگ ---------- */
if (isset($_GET['audio'])) {
    $trackId = (int)$_GET['audio'];
    $st = $pdo->prepare('SELECT filename FROM music_tracks WHERE id = ? AND phone_id = ?');
    $st->execute([$trackId, $phoneId]);
    $row = $st->fetch();
    if (!$row) { http_response_code(404); exit('not found'); }

    $path = $musicDir . '/' . basename($row['filename']);
    if (!is_file($path)) { http_response_code(410); exit('gone'); }

    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $types = [
        'mp3' => 'audio/mpeg', 'wav' => 'audio/wav', 'ogg' => 'audio/ogg',
        'm4a' => 'audio/mp4', 'aac' => 'audio/aac', 'flac' => 'audio/flac'
    ];
    $contentType = $types[$ext] ?? 'audio/mpeg';

    header('Content-Type: ' . $contentType);
    header('Content-Length: ' . filesize($path));
    header('Accept-Ranges: bytes');
    header('Cache-Control: private, max-age=3600');
    
    $start = 0;
    $end = filesize($path) - 1;
    if (isset($_SERVER['HTTP_RANGE'])) {
        if (preg_match('/bytes=(\d+)-(\d*)/', $_SERVER['HTTP_RANGE'], $m)) {
            $start = (int)$m[1];
            if (!empty($m[2])) $end = (int)$m[2];
        }
        header('Content-Range: bytes ' . $start . '-' . $end . '/' . filesize($path));
        header('Content-Length: ' . ($end - $start + 1));
        http_response_code(206);
        $fp = fopen($path, 'rb');
        fseek($fp, $start);
        $remaining = $end - $start + 1;
        while ($remaining > 0 && !feof($fp)) {
            $chunk = fread($fp, min(8192, $remaining));
            echo $chunk;
            $remaining -= strlen($chunk);
        }
        fclose($fp);
    } else {
        readfile($path);
    }
    exit;
}

/* ---------- نمایش کاور ---------- */
if (isset($_GET['cover'])) {
    $trackId = (int)$_GET['cover'];
    $st = $pdo->prepare('SELECT cover_filename FROM music_tracks WHERE id = ? AND phone_id = ?');
    $st->execute([$trackId, $phoneId]);
    $row = $st->fetch();
    if (!$row || !$row['cover_filename']) { http_response_code(404); exit('not found'); }
    
    $path = $coverDir . '/' . basename($row['cover_filename']);
    if (!is_file($path)) { http_response_code(410); exit('gone'); }
    
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    header('Content-Type: ' . $finfo->file($path));
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: private, max-age=3600');
    readfile($path);
    exit;
}

/* ---------- GET ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $view = $_GET['view'] ?? 'tracks';
    
    if ($view === 'tracks') {
        $st = $pdo->prepare(
            'SELECT id, title, artist, duration_ms, size, is_favorite, cover_filename, created_at 
             FROM music_tracks WHERE phone_id = ? ORDER BY created_at DESC'
        );
        $st->execute([$phoneId]);
        echo json_encode(['ok' => true, 'items' => $st->fetchAll()], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    if ($view === 'playlists') {
        $st = $pdo->prepare(
            'SELECT p.id, p.name, p.created_at,
                    COUNT(pt.track_id) as track_count,
                    (SELECT t.title FROM music_playlist_tracks pt2 
                     JOIN music_tracks t ON t.id = pt2.track_id 
                     WHERE pt2.playlist_id = p.id ORDER BY pt2.position LIMIT 1) as first_track
             FROM music_playlists p
             LEFT JOIN music_playlist_tracks pt ON pt.playlist_id = p.id
             WHERE p.phone_id = ?
             GROUP BY p.id
             ORDER BY p.created_at DESC'
        );
        $st->execute([$phoneId]);
        echo json_encode(['ok' => true, 'items' => $st->fetchAll()], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    if ($view === 'playlist_tracks' && isset($_GET['playlist_id'])) {
        $playlistId = (int)$_GET['playlist_id'];
        $st = $pdo->prepare(
            'SELECT t.id, t.title, t.artist, t.duration_ms, t.is_favorite, t.cover_filename, pt.position
             FROM music_playlist_tracks pt
             JOIN music_tracks t ON t.id = pt.track_id
             WHERE pt.playlist_id = ? AND t.phone_id = ?
             ORDER BY pt.position'
        );
        $st->execute([$playlistId, $phoneId]);
        echo json_encode(['ok' => true, 'items' => $st->fetchAll()], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    if ($view === 'favorites') {
        $st = $pdo->prepare(
            'SELECT id, title, artist, duration_ms, size, is_favorite, cover_filename, created_at 
             FROM music_tracks WHERE phone_id = ? AND is_favorite = 1 ORDER BY created_at DESC'
        );
        $st->execute([$phoneId]);
        echo json_encode(['ok' => true, 'items' => $st->fetchAll()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/* ---------- POST ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // آپلود آهنگ جدید
    if (!empty($_FILES['audio'])) {
        $f = $_FILES['audio'];
        if ($f['error'] !== UPLOAD_ERR_OK) {
            echo json_encode(['ok' => false, 'error' => 'Upload error']); exit;
        }
        
        if ($f['size'] > 50 * 1024 * 1024) {
            echo json_encode(['ok' => false, 'error' => 'File too large (max 50MB)']); exit;
        }
        
        $title = trim((string)($_POST['title'] ?? ''));
        $artist = trim((string)($_POST['artist'] ?? ''));
        $duration = (int)($_POST['duration'] ?? 0);
        
        if ($title === '') {
            $title = pathinfo($f['name'], PATHINFO_FILENAME);
        }
        
        $allowed = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/flac'];
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($f['tmp_name']);
        
        $ext = 'mp3';
        if (in_array($mime, $allowed)) {
            $extMap = [
                'audio/mpeg' => 'mp3', 'audio/wav' => 'wav', 'audio/ogg' => 'ogg',
                'audio/mp4' => 'm4a', 'audio/aac' => 'aac', 'audio/x-m4a' => 'm4a', 'audio/flac' => 'flac'
            ];
            $ext = $extMap[$mime] ?? 'mp3';
        } else {
            $pathExt = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
            if (in_array($pathExt, ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'])) {
                $ext = $pathExt;
            } else {
                echo json_encode(['ok' => false, 'error' => 'Invalid audio format']); exit;
            }
        }
        
        $filename = bin2hex(random_bytes(8)) . '.' . $ext;
        if (!move_uploaded_file($f['tmp_name'], $musicDir . '/' . $filename)) {
            echo json_encode(['ok' => false, 'error' => 'Save failed']); exit;
        }
        
        // ✨ آپلود کاور
        $coverFilename = null;
        if (!empty($_FILES['cover']) && $_FILES['cover']['error'] === UPLOAD_ERR_OK) {
            $coverFile = $_FILES['cover'];
            $coverAllowed = ['image/jpeg', 'image/png', 'image/webp'];
            $coverFinfo = new finfo(FILEINFO_MIME_TYPE);
            $coverMime = $coverFinfo->file($coverFile['tmp_name']);
            
            if (in_array($coverMime, $coverAllowed) && $coverFile['size'] <= 5 * 1024 * 1024) {
                $coverExtMap = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
                $coverExt = $coverExtMap[$coverMime] ?? 'jpg';
                $coverFilename = bin2hex(random_bytes(8)) . '.' . $coverExt;
                
                if (!move_uploaded_file($coverFile['tmp_name'], $coverDir . '/' . $coverFilename)) {
                    $coverFilename = null;
                }
            }
        }
        
        $pdo->prepare(
            'INSERT INTO music_tracks (phone_id, filename, title, artist, duration_ms, size, cover_filename) VALUES (?,?,?,?,?,?,?)'
        )->execute([$phoneId, $filename, $title, $artist, $duration, $f['size'], $coverFilename]);
        
        echo json_encode(['ok' => true, 'id' => (int)$pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    $in = json_decode((string)file_get_contents('php://input'), true) ?: [];
    $action = $in['action'] ?? '';
    
    if ($action === 'toggle_favorite') {
        $trackId = (int)($in['track_id'] ?? 0);
        $st = $pdo->prepare('SELECT is_favorite FROM music_tracks WHERE id = ? AND phone_id = ?');
        $st->execute([$trackId, $phoneId]);
        $current = (int)$st->fetchColumn();
        
        $pdo->prepare('UPDATE music_tracks SET is_favorite = ? WHERE id = ? AND phone_id = ?')
            ->execute([$current ? 0 : 1, $trackId, $phoneId]);
        
        echo json_encode(['ok' => true, 'is_favorite' => !$current], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    if ($action === 'delete_track') {
        $trackId = (int)($in['track_id'] ?? 0);
        $st = $pdo->prepare('SELECT filename, cover_filename FROM music_tracks WHERE id = ? AND phone_id = ?');
        $st->execute([$trackId, $phoneId]);
        if ($row = $st->fetch()) {
            @unlink($musicDir . '/' . basename($row['filename']));
            if ($row['cover_filename']) {
                @unlink($coverDir . '/' . basename($row['cover_filename']));
            }
            $pdo->prepare('DELETE FROM music_tracks WHERE id = ?')->execute([$trackId]);
        }
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    if ($action === 'create_playlist') {
        $name = trim((string)($in['name'] ?? ''));
        if ($name === '') {
            echo json_encode(['ok' => false, 'error' => 'Name required']); exit;
        }
        $pdo->prepare('INSERT INTO music_playlists (phone_id, name) VALUES (?,?)')
            ->execute([$phoneId, $name]);
        echo json_encode(['ok' => true, 'id' => (int)$pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    if ($action === 'delete_playlist') {
        $playlistId = (int)($in['playlist_id'] ?? 0);
        $pdo->prepare('DELETE FROM music_playlists WHERE id = ? AND phone_id = ?')
            ->execute([$playlistId, $phoneId]);
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    if ($action === 'rename_playlist') {
        $playlistId = (int)($in['playlist_id'] ?? 0);
        $name = trim((string)($in['name'] ?? ''));
        if ($name === '') {
            echo json_encode(['ok' => false, 'error' => 'Name required']); exit;
        }
        $pdo->prepare('UPDATE music_playlists SET name = ? WHERE id = ? AND phone_id = ?')
            ->execute([$name, $playlistId, $phoneId]);
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    if ($action === 'add_to_playlist') {
        $playlistId = (int)($in['playlist_id'] ?? 0);
        $trackId = (int)($in['track_id'] ?? 0);
        
        $st = $pdo->prepare('SELECT COUNT(*) FROM music_playlist_tracks WHERE playlist_id = ? AND track_id = ?');
        $st->execute([$playlistId, $trackId]);
        if ((int)$st->fetchColumn() > 0) {
            echo json_encode(['ok' => false, 'error' => 'Already in playlist']); exit;
        }
        
        $st = $pdo->prepare('SELECT COALESCE(MAX(position), 0) + 1 FROM music_playlist_tracks WHERE playlist_id = ?');
        $st->execute([$playlistId]);
        $position = (int)$st->fetchColumn();
        
        $pdo->prepare('INSERT INTO music_playlist_tracks (playlist_id, track_id, position) VALUES (?,?,?)')
            ->execute([$playlistId, $trackId, $position]);
        
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    if ($action === 'remove_from_playlist') {
        $playlistId = (int)($in['playlist_id'] ?? 0);
        $trackId = (int)($in['track_id'] ?? 0);
        $pdo->prepare('DELETE FROM music_playlist_tracks WHERE playlist_id = ? AND track_id = ?')
            ->execute([$playlistId, $trackId]);
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

http_response_code(405);