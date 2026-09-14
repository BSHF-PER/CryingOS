<?php
declare(strict_types=1);
require_once __DIR__ . '/../core/bootstrap.php';

$pdo = db();
$phoneId = (int)$PHONE['id'];
$imgDir = ROOT_PATH . '/uploads/images';
$vidDir = ROOT_PATH . '/uploads/videos';
$thumbDir = ROOT_PATH . '/uploads/thumbnails';
if (!is_dir($imgDir)) mkdir($imgDir, 0775, true);
if (!is_dir($vidDir)) mkdir($vidDir, 0775, true);
if (!is_dir($thumbDir)) mkdir($thumbDir, 0775, true);

/* ---------- نمایش فایل ---------- */
if (isset($_GET['image']) || isset($_GET['video']) || isset($_GET['thumb'])) {
    $isThumb = isset($_GET['thumb']);
    $isVideo = isset($_GET['video']);
    $id = (int)($isThumb ? $_GET['thumb'] : ($isVideo ? $_GET['video'] : $_GET['image']));
    
    if ($isThumb) {
        $st = $pdo->prepare('SELECT thumbnail_filename FROM gallery_images WHERE id = ? AND phone_id = ?');
    } else {
        $st = $pdo->prepare('SELECT filename, media_type FROM gallery_images WHERE id = ? AND phone_id = ?');
    }
    $st->execute([$id, $phoneId]);
    $row = $st->fetch();
    if (!$row) { http_response_code(404); exit('not found'); }
    
    if ($isThumb) {
        if (!$row['thumbnail_filename']) { http_response_code(404); exit('no thumb'); }
        $path = $thumbDir . '/' . basename($row['thumbnail_filename']);
    } else {
        $dir = $row['media_type'] === 'video' ? $vidDir : $imgDir;
        $path = $dir . '/' . basename($row['filename']);
    }
    
    if (!is_file($path)) { http_response_code(410); exit('gone'); }
    
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($path);
    $size = filesize($path);
    
    header('Content-Type: ' . $mime);
    header('Accept-Ranges: bytes');
    header('Cache-Control: private, max-age=3600');
    
    $start = 0;
    $end = $size - 1;
    if (isset($_SERVER['HTTP_RANGE'])) {
        if (preg_match('/bytes=(\d+)-(\d*)/', $_SERVER['HTTP_RANGE'], $m)) {
            $start = (int)$m[1];
            if (!empty($m[2])) $end = (int)$m[2];
        }
        header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
        header('Content-Length: ' . ($end - $start + 1));
        http_response_code(206);
        $fp = fopen($path, 'rb');
        fseek($fp, $start);
        $remaining = $end - $start + 1;
        while ($remaining > 0 && !feof($fp)) {
            $chunk = fread($fp, min(65536, $remaining));
            echo $chunk;
            $remaining -= strlen($chunk);
        }
        fclose($fp);
    } else {
        header('Content-Length: ' . $size);
        readfile($path);
    }
    exit;
}

header('Content-Type: application/json; charset=utf-8');

/* ---------- GET: لیست ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $filter = $_GET['filter'] ?? 'all'; // all, images, videos, favorites
    
    $sql = 'SELECT id, filename, media_type, title, width, height, size, duration_ms, is_favorite, created_at
            FROM gallery_images WHERE phone_id = ?';
    $params = [$phoneId];
    
    if ($filter === 'images') {
        $sql .= ' AND media_type = "image"';
    } elseif ($filter === 'videos') {
        $sql .= ' AND media_type = "video"';
    } elseif ($filter === 'favorites') {
        $sql .= ' AND is_favorite = 1';
    }
    
    $sql .= ' ORDER BY id DESC';
    
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $items = $st->fetchAll();
    
    foreach ($items as &$item) {
        if ($item['media_type'] === 'video') {
            $item['url'] = 'api/gallery.php?video=' . $item['id'];
            $item['thumb_url'] = $item['thumbnail_filename'] ? 'api/gallery.php?thumb=' . $item['id'] : null;
        } else {
            $item['url'] = 'api/gallery.php?image=' . $item['id'];
            $item['thumb_url'] = null;
        }
        $item['id'] = (int)$item['id'];
        $item['width'] = (int)$item['width'];
        $item['height'] = (int)$item['height'];
        $item['size'] = (int)$item['size'];
        $item['is_favorite'] = (int)$item['is_favorite'];
        $item['duration_ms'] = $item['duration_ms'] ? (int)$item['duration_ms'] : null;
    }
    
    // Statistics
    $statsSt = $pdo->prepare(
        'SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN media_type = "image" THEN 1 ELSE 0 END) as images,
            SUM(CASE WHEN media_type = "video" THEN 1 ELSE 0 END) as videos,
            SUM(is_favorite) as favorites
         FROM gallery_images WHERE phone_id = ?'
    );
    $statsSt->execute([$phoneId]);
    $stats = $statsSt->fetch();
    
    echo json_encode([
        'ok' => true, 
        'items' => $items,
        'stats' => [
            'total' => (int)$stats['total'],
            'images' => (int)$stats['images'],
            'videos' => (int)$stats['videos'],
            'favorites' => (int)$stats['favorites']
        ]
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- POST: آپلود ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_FILES['images'])) {
    $results = [];
    $files = $_FILES['images'];
    
    if (!is_array($files['name'])) {
        $files = [
            'name' => [$files['name']],
            'type' => [$files['type']],
            'tmp_name' => [$files['tmp_name']],
            'error' => [$files['error']],
            'size' => [$files['size']],
        ];
    }
    
    for ($i = 0; $i < count($files['name']); $i++) {
        if ($files['error'][$i] !== UPLOAD_ERR_OK) continue;
        if ($files['size'][$i] > 500 * 1024 * 1024) continue;
        
        $tmp = $files['tmp_name'][$i];
        $originalName = $files['name'][$i];
        $size = $files['size'][$i];
        
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($tmp);
        
        $imgTypes = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
        $vidTypes = [
            'video/mp4' => 'mp4', 'video/webm' => 'webm', 'video/quicktime' => 'mov',
            'video/x-matroska' => 'mkv', 'video/x-msvideo' => 'avi'
        ];
        
        $isVideo = false;
        $ext = null;
        $mediaType = 'image';
        $dir = $imgDir;
        
        if (isset($imgTypes[$mime])) {
            $ext = $imgTypes[$mime];
        } elseif (isset($vidTypes[$mime])) {
            $ext = $vidTypes[$mime];
            $mediaType = 'video';
            $dir = $vidDir;
            $isVideo = true;
        } else {
            $pathExt = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            if (in_array($pathExt, array_values($imgTypes))) {
                $ext = $pathExt;
            } elseif (in_array($pathExt, array_values($vidTypes))) {
                $ext = $pathExt;
                $mediaType = 'video';
                $dir = $vidDir;
                $isVideo = true;
            } else {
                continue;
            }
        }
        
        $filename = bin2hex(random_bytes(8)) . '.' . $ext;
        if (!move_uploaded_file($tmp, $dir . '/' . $filename)) continue;
        
        $width = 0;
        $height = 0;
        $duration = null;
        $thumbFilename = null;
        
        // Get image dimensions
        if ($mediaType === 'image' && function_exists('getimagesize')) {
            $imgInfo = @getimagesize($dir . '/' . $filename);
            if ($imgInfo) {
                $width = (int)$imgInfo[0];
                $height = (int)$imgInfo[1];
            }
        }
        
        // Video: duration and thumbnail
        if ($isVideo) {
            $videoPath = $dir . '/' . $filename;
            if (function_exists('exec')) {
                @exec('ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ' .
                    escapeshellarg($videoPath) . ' 2>/dev/null', $output, $returnVar);
                if ($returnVar === 0 && !empty($output[0]) && is_numeric($output[0])) {
                    $duration = (int)((float)$output[0] * 1000);
                }
                
                $thumbFilename = bin2hex(random_bytes(8)) . '.jpg';
                $thumbPath = $thumbDir . '/' . $thumbFilename;
                @exec('ffmpeg -i ' . escapeshellarg($videoPath) . ' -ss 00:00:01 -vframes 1 -q:v 2 ' .
                    escapeshellarg($thumbPath) . ' 2>/dev/null', $out, $ret);
                if ($ret !== 0 || !file_exists($thumbPath)) {
                    $thumbFilename = null;
                }
            }
        }
        
        $pdo->prepare(
            'INSERT INTO gallery_images (phone_id, filename, media_type, title, width, height, size, duration_ms, thumbnail_filename)
             VALUES (?,?,?,?,?,?,?,?,?)'
        )->execute([$phoneId, $filename, $mediaType, null, $width, $height, $size, $duration, $thumbFilename]);
        
        $results[] = [
            'id' => (int)$pdo->lastInsertId(),
            'filename' => $filename,
            'media_type' => $mediaType,
            'size' => $size
        ];
    }
    
    echo json_encode(['ok' => true, 'uploaded' => count($results), 'items' => $results], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- POST actions ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_decode((string)file_get_contents('php://input'), true) ?: [];
    $action = $in['action'] ?? '';
    
    if ($action === 'toggle_favorite') {
        $id = (int)($in['id'] ?? 0);
        $st = $pdo->prepare('SELECT is_favorite FROM gallery_images WHERE id = ? AND phone_id = ?');
        $st->execute([$id, $phoneId]);
        $current = (int)$st->fetchColumn();
        $pdo->prepare('UPDATE gallery_images SET is_favorite = ? WHERE id = ? AND phone_id = ?')
            ->execute([$current ? 0 : 1, $id, $phoneId]);
        echo json_encode(['ok' => true, 'is_favorite' => !$current]);
        exit;
    }
    
    if ($action === 'update_title') {
        $id = (int)($in['id'] ?? 0);
        $title = trim((string)($in['title'] ?? ''));
        $title = mb_substr($title, 0, 150) ?: null;
        $pdo->prepare('UPDATE gallery_images SET title = ? WHERE id = ? AND phone_id = ?')
            ->execute([$title, $id, $phoneId]);
        echo json_encode(['ok' => true, 'title' => $title]);
        exit;
    }
    
    if ($action === 'delete') {
        $id = (int)($in['id'] ?? 0);
        $st = $pdo->prepare('SELECT filename, media_type, thumbnail_filename FROM gallery_images WHERE id = ? AND phone_id = ?');
        $st->execute([$id, $phoneId]);
        if ($row = $st->fetch()) {
            $dir = $row['media_type'] === 'video' ? $vidDir : $imgDir;
            @unlink($dir . '/' . basename($row['filename']));
            if ($row['thumbnail_filename']) {
                @unlink($thumbDir . '/' . basename($row['thumbnail_filename']));
            }
            $pdo->prepare('DELETE FROM gallery_images WHERE id = ? AND phone_id = ?')->execute([$id, $phoneId]);
        }
        echo json_encode(['ok' => true]);
        exit;
    }
    
    if ($action === 'bulk_delete') {
        $ids = array_map('intval', (array)($in['ids'] ?? []));
        if (empty($ids)) { echo json_encode(['ok' => false]); exit; }
        
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $st = $pdo->prepare("SELECT id, filename, media_type, thumbnail_filename FROM gallery_images WHERE id IN ($placeholders) AND phone_id = ?");
        $st->execute(array_merge($ids, [$phoneId]));
        $rows = $st->fetchAll();
        
        foreach ($rows as $row) {
            $dir = $row['media_type'] === 'video' ? $vidDir : $imgDir;
            @unlink($dir . '/' . basename($row['filename']));
            if ($row['thumbnail_filename']) {
                @unlink($thumbDir . '/' . basename($row['thumbnail_filename']));
            }
        }
        
        $pdo->prepare("DELETE FROM gallery_images WHERE id IN ($placeholders) AND phone_id = ?")
            ->execute(array_merge($ids, [$phoneId]));
        
        echo json_encode(['ok' => true, 'deleted' => count($rows)]);
        exit;
    }
}

http_response_code(405);