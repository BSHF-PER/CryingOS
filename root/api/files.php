<?php
declare(strict_types=1);
require_once __DIR__ . '/../core/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = db();
$phoneId = (int)$PHONE['id'];

/* ---------- GET: لیست همه فایل‌ها ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $files = [];
    $totalSize = 0;
    $stats = [
        'images' => 0,
        'videos' => 0,
        'audio' => 0,
        'drawings' => 0,
        'total_count' => 0,
        'total_size' => 0
    ];
    
    // ۱) تصاویر از gallery_images
    $st = $pdo->prepare(
        'SELECT id, filename, media_type, title, size, created_at
         FROM gallery_images WHERE phone_id = ? ORDER BY created_at DESC'
    );
    $st->execute([$phoneId]);
    $galleryItems = $st->fetchAll();
    
    foreach ($galleryItems as $item) {
        $type = $item['media_type'] === 'video' ? 'video' : 'image';
        $files[] = [
            'id' => 'gallery_' . $item['id'],
            'type' => $type,
            'name' => $item['title'] ?: $item['filename'],
            'filename' => $item['filename'],
            'size' => (int)$item['size'],
            'created_at' => $item['created_at'],
            'source' => 'gallery',
            'source_id' => $item['id'],
            'url' => 'api/gallery.php?' . ($type === 'video' ? 'video' : 'image') . '=' . $item['id']
        ];
        $totalSize += (int)$item['size'];
        $stats[$type === 'video' ? 'videos' : 'images']++;
    }
    
    // ۲) آهنگ‌ها از music_tracks
    $st = $pdo->prepare(
        'SELECT id, filename, title, size, created_at
         FROM music_tracks WHERE phone_id = ? ORDER BY created_at DESC'
    );
    $st->execute([$phoneId]);
    $musicItems = $st->fetchAll();
    
    foreach ($musicItems as $item) {
        $files[] = [
            'id' => 'music_' . $item['id'],
            'type' => 'audio',
            'name' => $item['title'] ?: $item['filename'],
            'filename' => $item['filename'],
            'size' => (int)$item['size'],
            'created_at' => $item['created_at'],
            'source' => 'music',
            'source_id' => $item['id'],
            'url' => 'api/music.php?audio=' . $item['id']
        ];
        $totalSize += (int)$item['size'];
        $stats['audio']++;
    }
    
    // ۳) ویس رکوردینگ‌ها
    $st = $pdo->prepare(
        'SELECT id, filename, title, size, created_at
         FROM voice_recordings WHERE phone_id = ? ORDER BY created_at DESC'
    );
    $st->execute([$phoneId]);
    $voiceItems = $st->fetchAll();
    
    foreach ($voiceItems as $item) {
        $files[] = [
            'id' => 'voice_' . $item['id'],
            'type' => 'audio',
            'name' => $item['title'] ?: $item['filename'],
            'filename' => $item['filename'],
            'size' => (int)$item['size'],
            'created_at' => $item['created_at'],
            'source' => 'voice',
            'source_id' => $item['id'],
            'url' => 'api/voice.php?audio=' . $item['id']
        ];
        $totalSize += (int)$item['size'];
        $stats['audio']++;
    }
    
    // ۴) نقاشی‌های Notes
    $st = $pdo->prepare(
        'SELECT nd.id, nd.filename, nd.size, nd.created_at, n.title as note_title
         FROM note_drawings nd
         JOIN notes n ON n.id = nd.note_id
         WHERE n.phone_id = ? ORDER BY nd.created_at DESC'
    );
    $st->execute([$phoneId]);
    $drawingItems = $st->fetchAll();
    
    foreach ($drawingItems as $item) {
        $files[] = [
            'id' => 'drawing_' . $item['id'],
            'type' => 'drawing',
            'name' => $item['note_title'] ?: 'Drawing ' . $item['id'],
            'filename' => $item['filename'],
            'size' => (int)$item['size'],
            'created_at' => $item['created_at'],
            'source' => 'notes',
            'source_id' => $item['id'],
            'url' => 'api/notes.php?drawing=' . $item['id']
        ];
        $totalSize += (int)$item['size'];
        $stats['drawings']++;
    }
    
    // مرتب‌سازی بر اساس تاریخ
    usort($files, function($a, $b) {
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });
    
    $stats['total_count'] = count($files);
    $stats['total_size'] = $totalSize;
    
    echo json_encode([
        'ok' => true,
        'files' => $files,
        'stats' => $stats
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- POST: حذف فایل ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_decode((string)file_get_contents('php://input'), true) ?: [];
    $action = $in['action'] ?? '';
    
    if ($action === 'delete') {
        $fileId = (string)($in['file_id'] ?? '');
        
        // Parse file ID (source_id)
        if (!preg_match('/^(gallery|music|voice|drawing)_(\d+)$/', $fileId, $m)) {
            echo json_encode(['ok' => false, 'error' => 'Invalid file ID']);
            exit;
        }
        
        $source = $m[1];
        $sourceId = (int)$m[2];
        
        $deleted = false;
        
        if ($source === 'gallery') {
            // حذف از gallery_images
            $st = $pdo->prepare('SELECT filename, media_type, thumbnail_filename FROM gallery_images WHERE id = ? AND phone_id = ?');
            $st->execute([$sourceId, $phoneId]);
            if ($row = $st->fetch()) {
                $dir = ROOT_PATH . '/uploads/' . ($row['media_type'] === 'video' ? 'videos' : 'images');
                @unlink($dir . '/' . basename($row['filename']));
                if ($row['thumbnail_filename']) {
                    @unlink(ROOT_PATH . '/uploads/thumbnails/' . basename($row['thumbnail_filename']));
                }
                $pdo->prepare('DELETE FROM gallery_images WHERE id = ?')->execute([$sourceId]);
                $deleted = true;
            }
        } elseif ($source === 'music') {
            // حذف از music_tracks
            $st = $pdo->prepare('SELECT filename, cover_filename FROM music_tracks WHERE id = ? AND phone_id = ?');
            $st->execute([$sourceId, $phoneId]);
            if ($row = $st->fetch()) {
                @unlink(ROOT_PATH . '/uploads/music/' . basename($row['filename']));
                if ($row['cover_filename']) {
                    @unlink(ROOT_PATH . '/uploads/covers/' . basename($row['cover_filename']));
                }
                $pdo->prepare('DELETE FROM music_tracks WHERE id = ?')->execute([$sourceId]);
                $deleted = true;
            }
        } elseif ($source === 'voice') {
            // حذف از voice_recordings
            $st = $pdo->prepare('SELECT filename FROM voice_recordings WHERE id = ? AND phone_id = ?');
            $st->execute([$sourceId, $phoneId]);
            if ($row = $st->fetch()) {
                @unlink(ROOT_PATH . '/uploads/voice/' . basename($row['filename']));
                $pdo->prepare('DELETE FROM voice_recordings WHERE id = ?')->execute([$sourceId]);
                $deleted = true;
            }
        } elseif ($source === 'drawing') {
            // حذف از note_drawings
            $st = $pdo->prepare(
                'SELECT nd.filename FROM note_drawings nd
                 JOIN notes n ON n.id = nd.note_id
                 WHERE nd.id = ? AND n.phone_id = ?'
            );
            $st->execute([$sourceId, $phoneId]);
            if ($row = $st->fetch()) {
                @unlink(ROOT_PATH . '/uploads/notes/' . basename($row['filename']));
                $pdo->prepare('DELETE FROM note_drawings WHERE id = ?')->execute([$sourceId]);
                $deleted = true;
            }
        }
        
        if ($deleted) {
            echo json_encode(['ok' => true]);
        } else {
            echo json_encode(['ok' => false, 'error' => 'File not found']);
        }
        exit;
    }
    
    if ($action === 'bulk_delete') {
        $fileIds = (array)($in['file_ids'] ?? []);
        $deletedCount = 0;
        
        foreach ($fileIds as $fileId) {
            if (!preg_match('/^(gallery|music|voice|drawing)_(\d+)$/', $fileId, $m)) continue;
            
            $source = $m[1];
            $sourceId = (int)$m[2];
            
            if ($source === 'gallery') {
                $st = $pdo->prepare('SELECT filename, media_type, thumbnail_filename FROM gallery_images WHERE id = ? AND phone_id = ?');
                $st->execute([$sourceId, $phoneId]);
                if ($row = $st->fetch()) {
                    $dir = ROOT_PATH . '/uploads/' . ($row['media_type'] === 'video' ? 'videos' : 'images');
                    @unlink($dir . '/' . basename($row['filename']));
                    if ($row['thumbnail_filename']) {
                        @unlink(ROOT_PATH . '/uploads/thumbnails/' . basename($row['thumbnail_filename']));
                    }
                    $pdo->prepare('DELETE FROM gallery_images WHERE id = ?')->execute([$sourceId]);
                    $deletedCount++;
                }
            } elseif ($source === 'music') {
                $st = $pdo->prepare('SELECT filename, cover_filename FROM music_tracks WHERE id = ? AND phone_id = ?');
                $st->execute([$sourceId, $phoneId]);
                if ($row = $st->fetch()) {
                    @unlink(ROOT_PATH . '/uploads/music/' . basename($row['filename']));
                    if ($row['cover_filename']) {
                        @unlink(ROOT_PATH . '/uploads/covers/' . basename($row['cover_filename']));
                    }
                    $pdo->prepare('DELETE FROM music_tracks WHERE id = ?')->execute([$sourceId]);
                    $deletedCount++;
                }
            } elseif ($source === 'voice') {
                $st = $pdo->prepare('SELECT filename FROM voice_recordings WHERE id = ? AND phone_id = ?');
                $st->execute([$sourceId, $phoneId]);
                if ($row = $st->fetch()) {
                    @unlink(ROOT_PATH . '/uploads/voice/' . basename($row['filename']));
                    $pdo->prepare('DELETE FROM voice_recordings WHERE id = ?')->execute([$sourceId]);
                    $deletedCount++;
                }
            } elseif ($source === 'drawing') {
                $st = $pdo->prepare(
                    'SELECT nd.filename FROM note_drawings nd
                     JOIN notes n ON n.id = nd.note_id
                     WHERE nd.id = ? AND n.phone_id = ?'
                );
                $st->execute([$sourceId, $phoneId]);
                if ($row = $st->fetch()) {
                    @unlink(ROOT_PATH . '/uploads/notes/' . basename($row['filename']));
                    $pdo->prepare('DELETE FROM note_drawings WHERE id = ?')->execute([$sourceId]);
                    $deletedCount++;
                }
            }
        }
        
        echo json_encode(['ok' => true, 'deleted' => $deletedCount]);
        exit;
    }
}

http_response_code(405);