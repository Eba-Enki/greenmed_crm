<?php
// POST {username, password} → starts a server session. Verifies against gm_users in the database.

require __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'Method not allowed']);

$body = read_json_body();
$username = strtolower(trim((string)($body->username ?? '')));
$password = (string)($body->password ?? '');
if ($username === '' || $password === '') respond(400, ['error' => 'Username and password required']);

$hash = hash('sha256', $password . PASSWORD_SALT);

try {
    $users = load_users();

    // Empty database: the bootstrap admin from config.php creates the first account.
    if (!$users) {
        $c = config();
        $bootUser = strtolower((string)($c['bootstrap_admin_user'] ?? ''));
        $bootPass = (string)($c['bootstrap_admin_pass'] ?? '');
        if ($bootUser === '' || $bootPass === '' || $bootPass === 'CHANGE_ME_TOO'
            || !hash_equals($bootUser, $username) || !hash_equals($bootPass, $password)) {
            sleep(1);
            respond(401, ['error' => 'Incorrect username or password']);
        }
        $admin = (object)[
            'id' => bin2hex(random_bytes(4)),
            'username' => $username,
            'password' => $hash,
            'firstName' => 'Admin',
            'lastName' => 'User',
            'email' => '',
            'active' => true,
            'createdAt' => date('Y-m-d'),
            'portals' => (object)['off' => 'Admin', 'ops' => 'Admin'],
        ];
        save_records('gm_users', [$admin], $username);
        $users = [$admin];
    }

    $match = null;
    foreach ($users as $u) {
        if (strtolower((string)($u->username ?? '')) !== $username || empty($u->active)) continue;
        $stored = (string)($u->password ?? '');
        // Legacy accounts may still hold a plain-text password; the app re-hashes it after login.
        if (hash_equals($stored, $hash) || hash_equals($stored, $password)) { $match = $u; break; }
    }
} catch (PDOException $e) {
    error_log('GM API login failed: ' . $e->getMessage());
    respond(500, ['error' => 'Database error']);
}

if (!$match) {
    sleep(1);
    respond(401, ['error' => 'Incorrect username or password']);
}

start_session();
session_regenerate_id(true);
$_SESSION['uid'] = (string)$match->id;
$_SESSION['username'] = (string)$match->username;

respond(200, ['ok' => true]);
