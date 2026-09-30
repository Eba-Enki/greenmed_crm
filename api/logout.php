<?php
require __DIR__ . '/_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'Method not allowed']);

start_session();
$_SESSION = [];
$p = session_get_cookie_params();
setcookie(session_name(), '', [
    'expires' => time() - 3600,
    'path' => $p['path'],
    'secure' => $p['secure'],
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_destroy();

respond(200, ['ok' => true]);
