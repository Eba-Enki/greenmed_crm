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

const PASSWORD_SALT = 'gm_salt_2025'; // must match hashPassword() in js/utils.js

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
    }
    return $pdo;
}

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

// Replaces a whole record collection (the app always saves the full array).
function save_records(string $key, $list, string $by): void
{
    $pdo = db();
    $pdo->prepare('DELETE FROM records WHERE collection = ?')->execute([$key]);
    if (!is_array($list)) return;
    $ins = $pdo->prepare('INSERT INTO records (collection, id, data, sort_order, updated_by) VALUES (?, ?, ?, ?, ?)');
    $seen = [];
    foreach ($list as $i => $rec) {
        $id = (is_object($rec) && isset($rec->id) && $rec->id !== '') ? (string)$rec->id : '';
        if ($id === '' || isset($seen[$id])) $id = '__row' . $i; // missing/duplicate id: keep the row anyway
        $seen[$id] = true;
        $ins->execute([$key, $id, json_encode($rec, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $i, $by]);
    }
}

function save_setting(string $key, $value, string $by): void
{
    $pdo = db();
    if ($value === null) {
        $pdo->prepare('DELETE FROM settings WHERE setting_key = ?')->execute([$key]);
        return;
    }
    $raw = in_array($key, RAW_KEYS, true);
    $stored = $raw ? (string)$value : json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $pdo->prepare(
        'INSERT INTO settings (setting_key, value, is_raw, updated_by) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value), is_raw = VALUES(is_raw), updated_by = VALUES(updated_by)'
    )->execute([$key, $stored, $raw ? 1 : 0, $by]);
}

function save_key(string $key, $value, string $by): void
{
    if (in_array($key, RECORD_KEYS, true)) {
        if ($value !== null && !is_array($value)) respond(400, ['error' => "$key must be an array"]);
        save_records($key, $value, $by);
    } elseif (in_array($key, SETTING_KEYS, true) || in_array($key, RAW_KEYS, true)) {
        save_setting($key, $value, $by);
    } else {
        respond(400, ['error' => "Unknown key: $key"]);
    }
}
