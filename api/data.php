<?php
// GET                → {data: {key: value, ...}, versions: {key: {id: version} | version}}
//                      every synced key (gm_users without password hashes)
// PUT  ?key=off_cust → saves changes to one key (gm_users is read-only here — see users.php):
//                      record collections: body {ops: {upserts: [{id, base, data}], deletes: [{id, base}], order?: [id]}}
//                                          → {ok, versions: {id: version}, deleted: [id], conflicts: [...], renumbered: [...]}
//                      settings:           body {value, base} → {ok, version} or {ok, conflict: {version, value}}
// POST               → body {data: {key: value, ...}} bulk import (admins only, gm_users skipped)

require __DIR__ . '/_bootstrap.php';

$user = require_user();
$by = (string)($user->username ?? '');
$method = $_SERVER['REQUEST_METHOD'];

// Answer to a browser still running the app from before the record-by-record save format.
const RELOAD_MSG = 'The app was updated. Please reload the page (Ctrl+F5) and make this change again.';

try {
    if ($method === 'GET') {
        $out = new stdClass();
        $versions = new stdClass();
        foreach (RECORD_KEYS as $k) $out->$k = null;

        $rows = db()->query('SELECT collection, id, data, version FROM records ORDER BY collection, sort_order')->fetchAll();
        foreach ($rows as $r) {
            $k = $r['collection'];
            if (!in_array($k, RECORD_KEYS, true)) continue;
            if ($out->{$k} === null) { $out->{$k} = []; $versions->{$k} = new stdClass(); }
            $out->{$k}[] = json_decode($r['data']);
            $versions->{$k}->{$r['id']} = (int)$r['version'];
        }
        if (is_array($out->gm_users)) $out->gm_users = public_users($out->gm_users);

        foreach (db()->query('SELECT setting_key, value, is_raw, version FROM settings')->fetchAll() as $r) {
            $k = $r['setting_key'];
            if (!in_array($k, SETTING_KEYS, true) && !in_array($k, RAW_KEYS, true)) continue;
            $out->$k = $r['is_raw'] ? $r['value'] : json_decode($r['value']);
            $versions->$k = (int)$r['version'];
        }

        respond(200, ['data' => $out, 'versions' => $versions]);
    }

    if ($method === 'PUT') {
        $key = (string)($_GET['key'] ?? '');
        if ($key === 'gm_users') respond(403, ['error' => 'Users are managed through users.php']);
        $isRecords = in_array($key, RECORD_KEYS, true);
        if (!$isRecords && !in_array($key, SETTING_KEYS, true) && !in_array($key, RAW_KEYS, true)) {
            respond(400, ['error' => "Unknown key: $key"]);
        }
        $body = read_json_body();
        if (!is_object($body)) respond(400, ['error' => 'Invalid body']);

        if ($isRecords) {
            if (!isset($body->ops) || !is_object($body->ops)) respond(426, ['error' => RELOAD_MSG]);
            $pdo = db();
            $pdo->beginTransaction();
            $res = apply_record_ops($key, $body->ops, $by);
            $pdo->commit();
            respond(200, ['ok' => true] + $res);
        }

        if (!property_exists($body, 'value') || !property_exists($body, 'base')) respond(426, ['error' => RELOAD_MSG]);
        $pdo = db();
        $pdo->beginTransaction();
        $res = save_setting_versioned($key, $body->value, (int)$body->base, $by);
        $pdo->commit();
        respond(200, ['ok' => true] + $res);
    }

    if ($method === 'POST') {
        if (!is_admin($user)) respond(403, ['error' => 'Admins only']);
        $body = read_json_body();
        if (!is_object($body) || !isset($body->data) || !is_object($body->data)) respond(400, ['error' => 'Body must be {data: {...}}']);

        $pdo = db();
        $pdo->beginTransaction();
        $imported = [];
        foreach ($body->data as $key => $value) {
            if (!in_array($key, RECORD_KEYS, true) && !in_array($key, SETTING_KEYS, true) && !in_array($key, RAW_KEYS, true)) continue;
            if ($key === 'gm_users') continue; // users are managed through users.php
            import_key($key, $value, $by);
            $imported[] = $key;
        }
        $pdo->commit();
        respond(200, ['ok' => true, 'imported' => $imported]);
    }

    respond(405, ['error' => 'Method not allowed']);
} catch (PDOException $e) {
    if (db()->inTransaction()) db()->rollBack();
    error_log('GM API data failed: ' . $e->getMessage());
    respond(500, ['error' => 'Database error']);
}
