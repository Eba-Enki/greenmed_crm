<?php
// GET                → {data: {key: value, ...}} every synced key
// PUT  ?key=off_cust → body {value: ...} replaces that key
// POST               → body {data: {key: value, ...}} bulk import (admins only)

require __DIR__ . '/_bootstrap.php';

$user = require_user();
$by = (string)($user->username ?? '');
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $out = new stdClass();
        foreach (RECORD_KEYS as $k) $out->$k = null;

        $rows = db()->query('SELECT collection, data FROM records ORDER BY collection, sort_order')->fetchAll();
        foreach ($rows as $r) {
            $k = $r['collection'];
            if (!in_array($k, RECORD_KEYS, true)) continue;
            if ($out->{$k} === null) $out->{$k} = [];
            $out->{$k}[] = json_decode($r['data']);
        }

        foreach (db()->query('SELECT setting_key, value, is_raw FROM settings')->fetchAll() as $r) {
            $k = $r['setting_key'];
            if (!in_array($k, SETTING_KEYS, true) && !in_array($k, RAW_KEYS, true)) continue;
            $out->$k = $r['is_raw'] ? $r['value'] : json_decode($r['value']);
        }

        respond(200, ['data' => $out]);
    }

    if ($method === 'PUT') {
        $key = (string)($_GET['key'] ?? '');
        $body = read_json_body();
        if (!is_object($body) || !property_exists($body, 'value')) respond(400, ['error' => 'Body must be {value: ...}']);

        $pdo = db();
        $pdo->beginTransaction();
        save_key($key, $body->value, $by);
        $pdo->commit();
        respond(200, ['ok' => true]);
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
            save_key($key, $value, $by);
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
