<?php
// Daily database backup. Run from a cPanel cron job (never over the web):
//   php /home/cromtest/crm.greenmed.uk/cron/backup.php
// Writes a gzipped SQL dump of every table to the backup folder (default: crm_backups next to the
// site folder, outside the web root — override with 'backup_dir' in api/config.php) and keeps the
// newest 'backup_keep' files (default 30).

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../api/_bootstrap.php';

$cfg = config();
$dir = rtrim((string)($cfg['backup_dir'] ?? dirname(__DIR__, 2) . '/crm_backups'), '/\\');
$keep = max(1, (int)($cfg['backup_keep'] ?? 30));

if (!is_dir($dir) && !mkdir($dir, 0700, true)) {
    fwrite(STDERR, "Cannot create backup folder $dir\n");
    exit(1);
}

$pdo = db();
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
// Stream rows instead of loading whole tables (stored documents can be large)
$pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, false);

$file = $dir . '/greenmed-crm-' . date('Y-m-d-His') . '.sql.gz';
$gz = gzopen($file, 'wb6');
if (!$gz) {
    fwrite(STDERR, "Cannot write $file\n");
    exit(1);
}

gzwrite($gz, "-- Green Med CRM backup " . date('c') . "\n-- Restore: phpMyAdmin → Import (unzip first if needed)\n\n");
gzwrite($gz, "SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n");
foreach ($tables as $table) {
    $create = $pdo->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_NUM)[1];
    gzwrite($gz, "DROP TABLE IF EXISTS `$table`;\n$create;\n\n");

    $rows = $pdo->query("SELECT * FROM `$table`", PDO::FETCH_ASSOC);
    foreach ($rows as $row) {
        $vals = array_map(function ($v) use ($pdo) { return $v === null ? 'NULL' : $pdo->quote((string)$v); }, array_values($row));
        gzwrite($gz, "INSERT INTO `$table` (`" . implode('`, `', array_keys($row)) . '`) VALUES (' . implode(', ', $vals) . ");\n");
    }
    gzwrite($gz, "\n");
}
gzwrite($gz, "SET FOREIGN_KEY_CHECKS = 1;\n");
gzclose($gz);

// Rotate: keep the newest $keep backups.
$all = glob($dir . '/greenmed-crm-*.sql.gz') ?: [];
rsort($all);
foreach (array_slice($all, $keep) as $old) @unlink($old);

echo 'Backup written: ' . $file . ' (' . round(filesize($file) / 1024) . " KB)\n";
