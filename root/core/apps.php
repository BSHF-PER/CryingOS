<?php
declare(strict_types=1);

/**
 * اسکن پوشهٔ apps/ و همگام‌سازی کاتالوگ دیتابیس.
 * هر پوشه باید یک manifest.json داشته باشد. حذف پوشه = حذف اپ از همهٔ گوشی‌ها.
 */
function apps_sync_catalog(): array {
    $manifests = [];
    foreach (glob(APPS_DIR . '/*/manifest.json') as $file) {
        $data = json_decode((string)file_get_contents($file), true);
        if (!is_array($data)) continue;
        $slug = basename(dirname($file));      // نام پوشه = اسلاگ
        $data['slug'] = $slug;
        $manifests[$slug] = $data;
    }

    $pdo = db();
    $sql = "INSERT INTO apps_catalog
              (slug,name,description,icon,icon_type,icon_src,color,version,entry,styles,removable,is_default,sort)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE
              name=VALUES(name), description=VALUES(description), icon=VALUES(icon),
              icon_type=VALUES(icon_type), icon_src=VALUES(icon_src),
              color=VALUES(color), version=VALUES(version), entry=VALUES(entry),
              styles=VALUES(styles), removable=VALUES(removable),
              is_default=VALUES(is_default), sort=VALUES(sort)";
    $st = $pdo->prepare($sql);

    foreach ($manifests as $m) {
        $st->execute([
            $m['slug'],
            $m['name']        ?? $m['slug'],
            $m['description'] ?? null,
            $m['icon']        ?? '📦',
            $m['iconType']    ?? 'emoji',        // emoji یا image
            $m['iconSrc']     ?? '',              // URL عکس (اختیاری)
            $m['color']       ?? '#64748b',
            $m['version']     ?? '1.0.0',
            $m['entry']       ?? ('apps/' . $m['slug'] . '/app.js'),
            json_encode($m['styles'] ?? [], JSON_UNESCAPED_SLASHES),
            (($m['removable'] ?? true) ? 1 : 0),
            (!empty($m['default']) ? 1 : 0),
            (int)($m['sort'] ?? 50),
        ]);
    }

    // اپ‌هایی که پوشه‌شان حذف شده از کاتالوگ (و گوشی‌ها) پاک شوند
    if ($manifests) {
        $in = implode(',', array_fill(0, count($manifests), '?'));
        $pdo->prepare("DELETE FROM apps_catalog WHERE slug NOT IN ($in)")
            ->execute(array_keys($manifests));
    }
    return $manifests;
}
