<?php
// Change history (admins only).
// GET ?collection=ops_sq&id=abc123 → every saved version of that record, newest first, with its data
// GET ?collection=ops_sq           → the latest 200 changes in that collection (without data)
// GET                              → the latest 200 changes overall (without data)

require __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(405, ['error' => 'Method not allowed']);
$user = require_user();
if (!is_admin($user)) respond(403, ['error' => 'Admins only']);

$collection = (string)($_GET['collection'] ?? '');
$id = (string)($_GET['id'] ?? '');

try {
    if ($collection !== '' && $id !== '') {
        $st = db()->prepare('SELECT hid, collection, record_id, version, action, data, changed_by, changed_at
                             FROM record_history WHERE collection = ? AND record_id = ? ORDER BY hid DESC');
        $st->execute([$collection, $id]);
        $rows = array_map(function ($r) {
            $r['data'] = $r['data'] === null ? null : (json_decode($r['data']) ?? $r['data']);
            return $r;
        }, $st->fetchAll());
    } elseif ($collection !== '') {
        $st = db()->prepare('SELECT hid, collection, record_id, version, action, changed_by, changed_at
                             FROM record_history WHERE collection = ? ORDER BY hid DESC LIMIT 200');
        $st->execute([$collection]);
        $rows = $st->fetchAll();
    } else {
        $rows = db()->query('SELECT hid, collection, record_id, version, action, changed_by, changed_at
                             FROM record_history ORDER BY hid DESC LIMIT 200')->fetchAll();
    }
} catch (PDOException $e) {
    error_log('GM API history failed: ' . $e->getMessage());
    respond(500, ['error' => 'Database error']);
}

respond(200, ['history' => $rows]);
