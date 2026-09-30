<?php
// User accounts. Passwords are hashed here and never sent back to the browser.
// POST {action: 'save', user: {...}}       → create or update a user (admins only)
// POST {action: 'delete', id}              → delete a user (admins only, not yourself)
// POST {action: 'profile', profile: {...}} → update the signed-in user's own name, email, username, password
// Every action returns {ok, users}: the full list without password hashes.

require __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'Method not allowed']);

$me = require_user();
$body = read_json_body();
$action = is_object($body) ? (string)($body->action ?? '') : '';

const PORTAL_ROLES = ['User', 'Manager', 'Admin'];

function field($obj, string $key): string
{
    return trim((string)($obj->$key ?? ''));
}

function user_index(array $users, string $id): int
{
    foreach ($users as $i => $u) {
        if ((string)($u->id ?? '') === $id) return $i;
    }
    return -1;
}

// Login matches usernames case-insensitively, so they must be unique ignoring case.
function require_free_username(array $users, string $username, string $exceptId): void
{
    foreach ($users as $u) {
        if ((string)($u->id ?? '') !== $exceptId && strtolower((string)($u->username ?? '')) === $username) {
            respond(409, ['error' => "A user named \"$username\" already exists. Usernames must be unique (case doesn't matter)."]);
        }
    }
}

function require_active_admin(array $users): void
{
    foreach ($users as $u) {
        if (!empty($u->active) && is_admin($u)) return;
    }
    respond(400, ['error' => 'At least one active admin is required']);
}

function require_admin($me): void
{
    if (!is_admin($me)) respond(403, ['error' => 'Admins only']);
}

try {
    $users = load_users();
    $myId = (string)$me->id;

    if ($action === 'save') {
        require_admin($me);
        $in = $body->user ?? null;
        if (!is_object($in)) respond(400, ['error' => 'Body must be {action, user}']);

        $id = field($in, 'id');
        $username = strtolower(field($in, 'username'));
        $password = (string)($in->password ?? '');
        if ($username === '') respond(400, ['error' => 'Username is required']);
        require_free_username($users, $username, $id);

        $inPortals = is_object($in->portals ?? null) ? $in->portals : new stdClass();
        $portals = new stdClass();
        foreach (['off', 'ops'] as $p) {
            $role = (string)($inPortals->$p ?? '');
            $portals->$p = in_array($role, PORTAL_ROLES, true) ? $role : null;
        }

        if ($id !== '') {
            $i = user_index($users, $id);
            if ($i < 0) respond(404, ['error' => 'User not found']);
            $u = $users[$i];
        } else {
            if ($password === '') respond(400, ['error' => 'Password is required']);
            $u = (object)['id' => bin2hex(random_bytes(4)), 'createdAt' => date('Y-m-d')];
            $users[] = $u;
        }
        $u->username = $username;
        $u->firstName = field($in, 'firstName');
        $u->lastName = field($in, 'lastName');
        $u->email = strtolower(field($in, 'email'));
        $u->active = !empty($in->active);
        $u->portals = $portals;
        if ($password !== '') $u->password = hash_password($password);

        require_active_admin($users);
    } elseif ($action === 'delete') {
        require_admin($me);
        $id = field($body, 'id');
        if ($id === $myId) respond(400, ['error' => 'You cannot delete your own account']);
        $i = user_index($users, $id);
        if ($i < 0) respond(404, ['error' => 'User not found']);
        array_splice($users, $i, 1);
        require_active_admin($users);
    } elseif ($action === 'profile') {
        $in = $body->profile ?? null;
        if (!is_object($in)) respond(400, ['error' => 'Body must be {action, profile}']);
        $i = user_index($users, $myId);
        if ($i < 0) respond(404, ['error' => 'User not found']);

        $username = strtolower(field($in, 'username'));
        $password = (string)($in->password ?? '');
        if ($username === '') respond(400, ['error' => 'Username is required']);
        require_free_username($users, $username, $myId);

        // Only personal fields — role, portals and status stay admin-controlled.
        $u = $users[$i];
        $u->username = $username;
        $u->firstName = field($in, 'firstName');
        $u->lastName = field($in, 'lastName');
        $u->email = strtolower(field($in, 'email'));
        if ($password !== '') $u->password = hash_password($password);
        $_SESSION['username'] = $username;
    } else {
        respond(400, ['error' => 'Unknown action']);
    }

    $pdo = db();
    $pdo->beginTransaction();
    save_records('gm_users', $users, (string)($me->username ?? ''));
    $pdo->commit();
} catch (PDOException $e) {
    if (db()->inTransaction()) db()->rollBack();
    error_log('GM API users failed: ' . $e->getMessage());
    respond(500, ['error' => 'Database error']);
}

respond(200, ['ok' => true, 'users' => public_users($users)]);
