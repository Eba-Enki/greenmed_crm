<?php
// Shared setup for every API endpoint: config, PDO connection, session, JSON helpers.

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// Storage keys the app syncs. Record collections are arrays of {id,...}; settings are single values.
const RECORD_KEYS = [
    'gm_users',
    'off_i', 'off_q', 'off_p', 'off_r', 'off_pr', 'off_cust', 'off_banktx', 'off_expcat', 'off_incomecat',
    'ops_cust', 'ops_proj', 'ops_sq', 'ops_si', 'ops_pq', 'ops_po', 'ops_ri', 'ops_exp', 'ops_expcat', 'ops_docs',
];
const SETTING_KEYS = ['off_co', 'off_cnt', 'ops_co', 'ops_cnt', 'ops_pp'];
const RAW_KEYS = ['gm_logo', 'gm_signature'];
// Counter settings only ever grow, so concurrent saves are merged (highest value wins) instead of conflicting.
const COUNTER_KEYS = ['off_cnt', 'ops_cnt'];
// Collections whose `number` must be unique (case-insensitive). A new record whose number is already
// taken (two users creating a document at the same moment) gets the next free number instead.
const NUMBERED_KEYS = ['off_i', 'off_q', 'off_p', 'ops_sq', 'ops_si', 'ops_po', 'ops_proj'];

const SCHEMA_VERSION = 2;

const PASSWORD_SALT = 'gm_salt_2025'; // legacy SHA-256 hashes only; new hashes use password_hash()

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function config(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $file = __DIR__ . '/config.php';
        if (!is_file($file)) {
            respond(500, ['error' => 'Server not configured (api/config.php missing)']);
        }
        $cfg = require $file;
    }
    return $cfg;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = config();
        try {
            $pdo = new PDO(
                "mysql:host={$c['db_host']};dbname={$c['db_name']};charset=utf8mb4",
                $c['db_user'],
                $c['db_pass'],
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
        } catch (PDOException $e) {
            error_log('GM API DB connect failed: ' . $e->getMessage());
            respond(500, ['error' => 'Database connection failed']);
        }
        ensure_schema($pdo);
    }
    return $pdo;
}

// Upgrades an older database in place, so a deploy never has to wait for a manual phpMyAdmin import.
// v2: per-record versions (conflict detection) and the change history table.
function ensure_schema(PDO $pdo): void
{
    try {
        $v = $pdo->query("SELECT value FROM settings WHERE setting_key = '__schema'")->fetchColumn();
        if ((int)$v >= SCHEMA_VERSION) return;

        $hasColumn = function (string $table, string $column) use ($pdo): bool {
            $st = $pdo->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
            $st->execute([$table, $column]);
            return (int)$st->fetchColumn() > 0;
        };
        if (!$hasColumn('records', 'version')) {
            $pdo->exec('ALTER TABLE `records` ADD COLUMN `version` INT NOT NULL DEFAULT 1 AFTER `sort_order`');
        }
        if (!$hasColumn('settings', 'version')) {
            $pdo->exec('ALTER TABLE `settings` ADD COLUMN `version` INT NOT NULL DEFAULT 1 AFTER `is_raw`');
        }
        $pdo->exec(HISTORY_TABLE_SQL);
        $pdo->prepare(
            "INSERT INTO settings (setting_key, value, is_raw, updated_by) VALUES ('__schema', ?, 1, 'system')
             ON DUPLICATE KEY UPDATE value = VALUES(value)"
        )->execute([(string)SCHEMA_VERSION]);
    } catch (PDOException $e) {
        // Two requests migrating at once: the loser's ALTER fails, the winner's result stands.
        error_log('GM API schema upgrade: ' . $e->getMessage());
    }
}

const HISTORY_TABLE_SQL = 'CREATE TABLE IF NOT EXISTS `record_history` (
  `hid`         BIGINT       NOT NULL AUTO_INCREMENT,
  `collection`  VARCHAR(32)  NOT NULL,
  `record_id`   VARCHAR(64)  NOT NULL,
  `version`     INT          NOT NULL,
  `action`      VARCHAR(8)   NOT NULL,
  `data`        LONGTEXT     NULL,
  `changed_by`  VARCHAR(64)  NULL,
  `changed_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`hid`),
  KEY `idx_record` (`collection`, `record_id`),
  KEY `idx_changed_at` (`changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_name('GMSESSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// Write requests must be JSON — blocks cross-site form posts.
function read_json_body()
{
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($ct, 'application/json') !== 0) {
        respond(415, ['error' => 'Content-Type must be application/json']);
    }
    $raw = file_get_contents('php://input');
    $data = json_decode($raw === false ? '' : $raw);
    if (json_last_error() !== JSON_ERROR_NONE) {
        respond(400, ['error' => 'Invalid JSON']);
    }
    return $data;
}

function load_users(): array
{
    $rows = db()->query("SELECT data FROM records WHERE collection = 'gm_users' ORDER BY sort_order")->fetchAll();
    return array_map(function ($r) { return json_decode($r['data']); }, $rows);
}

function hash_password(string $password): string
{
    return password_hash($password, PASSWORD_DEFAULT);
}

// Accepts bcrypt hashes and the legacy salted SHA-256 hashes the old client produced.
// The stored value itself is never accepted as a password.
function verify_password(string $password, string $stored): bool
{
    if ($stored === '') return false;
    if ($stored[0] === '$') return password_verify($password, $stored);
    return strlen($stored) === 64 && hash_equals($stored, hash('sha256', $password . PASSWORD_SALT));
}

function password_needs_upgrade(string $stored): bool
{
    return $stored === '' || $stored[0] !== '$' || password_needs_rehash($stored, PASSWORD_DEFAULT);
}

// User record as sent to the browser — the password hash never leaves the server.
function public_user($user)
{
    $u = clone $user;
    unset($u->password);
    return $u;
}

function public_users(array $users): array
{
    return array_map('public_user', $users);
}

function find_user_by_id(string $id)
{
    foreach (load_users() as $u) {
        if (isset($u->id) && (string)$u->id === $id) return $u;
    }
    return null;
}

function is_admin($user): bool
{
    $p = $user->portals ?? null;
    return $p && (($p->off ?? null) === 'Admin' || ($p->ops ?? null) === 'Admin');
}

// Returns the logged-in, still-active user or ends the request with 401.
function require_user()
{
    start_session();
    $uid = $_SESSION['uid'] ?? null;
    $user = $uid ? find_user_by_id((string)$uid) : null;
    if (!$user || empty($user->active)) {
        $_SESSION = [];
        respond(401, ['error' => 'Not authenticated']);
    }
    return $user;
}

function enc($value): string
{
    return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

// Every change to app data is kept in record_history: the new data for creates/updates,
// the last data for deletes. User accounts are never logged (they carry password hashes).
function log_history(string $collection, string $id, int $version, string $action, ?string $data, string $by): void
{
    if ($collection === 'gm_users') return;
    db()->prepare('INSERT INTO record_history (collection, record_id, version, action, data, changed_by) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$collection, $id, $version, $action, $data, $by]);
}

// Replaces a whole record collection. Only for user accounts and the admin bulk import —
// the app itself saves record by record through apply_record_ops().
function save_records(string $key, $list, string $by, bool $logged = false): void
{
    $pdo = db();
    $old = [];
    $st = $pdo->prepare('SELECT id, version FROM records WHERE collection = ?');
    $st->execute([$key]);
    foreach ($st->fetchAll() as $r) $old[$r['id']] = (int)$r['version'];

    $pdo->prepare('DELETE FROM records WHERE collection = ?')->execute([$key]);
    if (!is_array($list)) $list = [];
    $ins = $pdo->prepare('INSERT INTO records (collection, id, data, sort_order, version, updated_by) VALUES (?, ?, ?, ?, ?, ?)');
    $seen = [];
    foreach ($list as $i => $rec) {
        $id = (is_object($rec) && isset($rec->id) && $rec->id !== '') ? (string)$rec->id : '';
        if ($id === '' || isset($seen[$id])) $id = '__row' . $i; // missing/duplicate id: keep the row anyway
        $seen[$id] = true;
        $version = ($old[$id] ?? 0) + 1;
        $json = enc($rec);
        $ins->execute([$key, $id, $json, $i, $version, $by]);
        if ($logged) log_history($key, $id, $version, 'import', $json, $by);
    }
}

// The number a record is listed under, lower-cased for case-insensitive comparison.
function number_key($rec): string
{
    return is_object($rec) ? strtolower(trim((string)($rec->number ?? ''))) : '';
}

// Makes sure $rec's number is not used by another record of the collection.
// A brand-new record whose number was taken in the meantime moves to the next free number
// (SQ0011 → SQ0012); an existing record, a quote revision or a number without trailing
// digits cannot be moved and is reported as a conflict instead.
// Returns [record, renumbered-info or null, error message or null].
function claim_number(string $key, string $id, $rec, bool $isNew, array &$numbers, array &$numberOf, array &$bases): array
{
    $num = trim((string)($rec->number ?? ''));
    $lc = strtolower($num);
    $owner = $lc === '' ? null : ($numbers[$lc] ?? null);
    $renumbered = null;
    // Older data may already hold duplicates; a record that keeps its own number can always be saved.
    if (($numberOf[$id] ?? null) === $lc) $owner = null;

    if ($owner !== null && $owner !== $id) {
        $isQuote = $key === 'ops_sq';
        if (!$isNew) return [$rec, null, "Number $num is already used by another document."];
        if ($isQuote && (int)($rec->rev ?? 0) !== 0) return [$rec, null, "Revision $num was already created by another user."];
        $src = $isQuote ? (string)($rec->base ?? $num) : $num;
        if (!preg_match('/^(.*?)(\d+)$/', $src, $m)) return [$rec, null, "Number $num is already used by another document."];
        $width = strlen($m[2]);
        $n = (int)$m[2];
        do {
            $n++;
            $cand = $m[1] . str_pad((string)$n, $width, '0', STR_PAD_LEFT);
            $cl = strtolower($cand);
        } while (isset($numbers[$cl]) || ($isQuote && isset($bases[$cl])));
        $rec->number = $cand;
        if ($isQuote) $rec->base = $cand;
        $renumbered = ['id' => $id, 'from' => $num, 'to' => $cand];
        $lc = $cl;
    }

    if (isset($numberOf[$id])) unset($numbers[$numberOf[$id]]);
    if ($lc !== '') {
        $numbers[$lc] = $id;
        $numberOf[$id] = $lc;
    }
    if ($key === 'ops_sq' && isset($rec->base) && $rec->base !== '') $bases[strtolower((string)$rec->base)] = true;
    return [$rec, $renumbered, null];
}

// Applies one client save of a record collection:
//   {upserts: [{id, base, data}], deletes: [{id, base}], order: [id, ...] (optional)}
// `base` is the version the client last saw (0 = new record). A record changed or deleted by someone
// else since then is not overwritten — it comes back in `conflicts` with the server's current data.
// Re-sending a change that was already applied (e.g. a retry after a lost response) is a no-op.
function apply_record_ops(string $key, $ops, string $by): array
{
    $pdo = db();
    $upserts = is_array($ops->upserts ?? null) ? $ops->upserts : [];
    $deletes = is_array($ops->deletes ?? null) ? $ops->deletes : [];
    $numbered = in_array($key, NUMBERED_KEYS, true);

    // Locks the collection, so two saves of the same collection run one after the other.
    $st = $pdo->prepare('SELECT id, version, sort_order' . ($numbered ? ', data' : '') . ' FROM records WHERE collection = ? FOR UPDATE');
    $st->execute([$key]);
    $cur = [];
    $maxOrder = -1;
    $numbers = $numberOf = $bases = [];
    foreach ($st->fetchAll() as $r) {
        $cur[$r['id']] = (int)$r['version'];
        $maxOrder = max($maxOrder, (int)$r['sort_order']);
        if ($numbered) {
            $rec = json_decode($r['data']);
            $lc = number_key($rec);
            if ($lc !== '') { $numbers[$lc] = $r['id']; $numberOf[$r['id']] = $lc; }
            if ($key === 'ops_sq' && is_object($rec) && !empty($rec->base)) $bases[strtolower((string)$rec->base)] = true;
        }
    }

    $getData = $pdo->prepare('SELECT data FROM records WHERE collection = ? AND id = ?');
    $stored = function (string $id) use ($getData, $key): ?string {
        $getData->execute([$key, $id]);
        $v = $getData->fetchColumn();
        return $v === false ? null : $v;
    };
    $upd = $pdo->prepare('UPDATE records SET data = ?, version = ?, updated_by = ? WHERE collection = ? AND id = ?');
    $ins = $pdo->prepare('INSERT INTO records (collection, id, data, sort_order, version, updated_by) VALUES (?, ?, ?, ?, ?, ?)');
    $del = $pdo->prepare('DELETE FROM records WHERE collection = ? AND id = ?');

    $versions = $conflicts = $renumbered = $deleted = [];
    $conflict = function (string $id, string $reason) use (&$conflicts, &$cur, $stored) {
        $data = isset($cur[$id]) ? $stored($id) : null;
        $conflicts[] = ['id' => $id, 'reason' => $reason, 'version' => $cur[$id] ?? 0, 'data' => $data === null ? null : json_decode($data)];
    };

    foreach ($upserts as $u) {
        $id = is_object($u) ? trim((string)($u->id ?? '')) : '';
        $rec = is_object($u) ? ($u->data ?? null) : null;
        if ($id === '' || strlen($id) > 64 || !is_object($rec)) respond(400, ['error' => 'Each upsert needs {id, base, data}']);
        $base = (int)($u->base ?? 0);
        $exists = isset($cur[$id]);
        if (!isset($rec->id) || $rec->id === '') $rec->id = $id;

        if (($exists && $cur[$id] !== $base) || (!$exists && $base > 0)) {
            if ($exists && $stored($id) === enc($rec)) { $versions[$id] = $cur[$id]; continue; } // already saved
            $conflict($id, $exists ? 'changed' : 'deleted');
            continue;
        }

        if ($numbered) {
            [$rec, $moved, $err] = claim_number($key, $id, $rec, !$exists, $numbers, $numberOf, $bases);
            if ($err !== null) { $conflict($id, $err); continue; }
            if ($moved) $renumbered[] = $moved;
        }

        $json = enc($rec);
        $version = ($cur[$id] ?? 0) + 1;
        if ($exists) $upd->execute([$json, $version, $by, $key, $id]);
        else $ins->execute([$key, $id, $json, ++$maxOrder, $version, $by]);
        $cur[$id] = $version;
        $versions[$id] = $version;
        log_history($key, $id, $version, $exists ? 'update' : 'create', $json, $by);
    }

    foreach ($deletes as $d) {
        $id = is_object($d) ? trim((string)($d->id ?? '')) : '';
        if ($id === '') continue;
        if (!isset($cur[$id])) { $deleted[] = $id; continue; } // already gone
        if ($cur[$id] !== (int)($d->base ?? 0)) { $conflict($id, 'changed'); continue; }
        $last = $stored($id);
        $del->execute([$key, $id]);
        log_history($key, $id, $cur[$id] + 1, 'delete', $last, $by);
        unset($cur[$id]);
        if (isset($numberOf[$id])) { unset($numbers[$numberOf[$id]], $numberOf[$id]); }
        $deleted[] = $id;
    }

    // The client sends the full id order only when it moved records around.
    if (isset($ops->order) && is_array($ops->order)) {
        $ord = $pdo->prepare('UPDATE records SET sort_order = ? WHERE collection = ? AND id = ?');
        foreach ($ops->order as $i => $id) {
            if (isset($cur[(string)$id])) $ord->execute([$i, $key, (string)$id]);
        }
    }

    return ['versions' => (object)$versions, 'deleted' => $deleted, 'conflicts' => $conflicts, 'renumbered' => $renumbered];
}

// Saves one setting if the client saw its current version (`base`); otherwise returns the
// server's value as a conflict. Counters are merged (highest value per field) and never conflict.
function save_setting_versioned(string $key, $value, int $base, string $by): array
{
    $pdo = db();
    $raw = in_array($key, RAW_KEYS, true);
    $st = $pdo->prepare('SELECT value, version FROM settings WHERE setting_key = ? FOR UPDATE');
    $st->execute([$key]);
    $row = $st->fetch() ?: null;
    $curV = $row ? (int)$row['version'] : 0;
    $decode = function (?array $r) use ($raw) { return $r === null ? null : ($raw ? $r['value'] : json_decode($r['value'])); };

    if (in_array($key, COUNTER_KEYS, true) && is_object($value) && $row) {
        $merged = json_decode($row['value']);
        if (!is_object($merged)) $merged = new stdClass();
        foreach ($value as $k => $v) {
            $merged->$k = (is_numeric($v) && isset($merged->$k) && is_numeric($merged->$k)) ? max(+$v, +$merged->$k) : $v;
        }
        $value = $merged;
        $base = $curV;
    }

    $new = $value === null ? null : ($raw ? (string)$value : enc($value));
    if ($curV !== $base) {
        if ($row && $new === $row['value']) return ['version' => $curV]; // already saved
        if (!$row && $new === null) return ['version' => 0];
        return ['conflict' => ['version' => $curV, 'value' => $decode($row)]];
    }

    if ($new === null) {
        if ($row) {
            $pdo->prepare('DELETE FROM settings WHERE setting_key = ?')->execute([$key]);
            log_history($key, '', $curV + 1, 'delete', $row['value'], $by);
        }
        return ['version' => 0];
    }
    $version = $curV + 1;
    $pdo->prepare(
        'INSERT INTO settings (setting_key, value, is_raw, version, updated_by) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value), is_raw = VALUES(is_raw), version = VALUES(version), updated_by = VALUES(updated_by)'
    )->execute([$key, $new, $raw ? 1 : 0, $version, $by]);
    log_history($key, '', $version, $row ? 'update' : 'create', $new, $by);
    $out = ['version' => $version];
    if (in_array($key, COUNTER_KEYS, true)) $out['value'] = $value; // the merged counters
    return $out;
}

// Bulk import (admins): overwrites keys without version checks.
function import_key(string $key, $value, string $by): void
{
    if (in_array($key, RECORD_KEYS, true)) {
        if ($value !== null && !is_array($value)) respond(400, ['error' => "$key must be an array"]);
        save_records($key, $value, $by, true);
        return;
    }
    $st = db()->prepare('SELECT version FROM settings WHERE setting_key = ? FOR UPDATE');
    $st->execute([$key]);
    $res = save_setting_versioned($key, $value, (int)($st->fetchColumn() ?: 0), $by);
    if (isset($res['conflict'])) respond(500, ['error' => "Import of $key failed"]);
}
