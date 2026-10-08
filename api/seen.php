<?php
// "New records" for the sidebar dots, per user and stored on the server, so every browser and device agrees.
// GET               → {new: {collection: [record ids]}} records other users created after this user last opened
//                     that list (and that still exist). A list the user never opened starts tracking now.
// POST {collection} → the user opened that list: everything in it counts as seen from now on.

require __DIR__ . '/_bootstrap.php';

$user = require_user();
$uid = (string)$user->id;
$me = (string)($user->username ?? '');
$tracked = array_values(array_filter(RECORD_KEYS, function ($k) { return $k !== 'gm_users'; }));

try {
    $pdo = db();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $start = $pdo->prepare('INSERT IGNORE INTO user_seen (user_id, collection, seen_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
        foreach ($tracked as $c) $start->execute([$uid, $c]);

        // Created by someone else after the user's last look, and not deleted since
        $st = $pdo->prepare(
            "SELECT DISTINCT h.collection, h.record_id
               FROM record_history h
               JOIN user_seen s ON s.user_id = ? AND s.collection = h.collection
               JOIN records r ON r.collection = h.collection AND r.id = h.record_id
              WHERE h.action = 'create' AND h.changed_at > s.seen_at
                AND (h.changed_by IS NULL OR h.changed_by <> ?)"
        );
        $st->execute([$uid, $me]);
        $new = new stdClass();
        foreach ($st->fetchAll() as $r) {
            $c = $r['collection'];
            if (!isset($new->$c)) $new->$c = [];
            $new->$c[] = $r['record_id'];
        }
        respond(200, ['new' => $new]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = read_json_body();
        $c = is_object($body) ? (string)($body->collection ?? '') : '';
        if (!in_array($c, $tracked, true)) respond(400, ['error' => 'Unknown collection']);
        $pdo->prepare(
            'INSERT INTO user_seen (user_id, collection, seen_at) VALUES (?, ?, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE seen_at = CURRENT_TIMESTAMP'
        )->execute([$uid, $c]);
        respond(200, ['ok' => true]);
    }

    respond(405, ['error' => 'Method not allowed']);
} catch (PDOException $e) {
    error_log('GM API seen failed: ' . $e->getMessage());
    respond(500, ['error' => 'Database error']);
}
