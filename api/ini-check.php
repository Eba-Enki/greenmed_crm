<?php
// Temporary: confirms .user.ini is applied on the host. Remove after checking.
header('Content-Type: text/plain');
echo ini_get('session.upload_progress.enabled') ? 'ON' : 'OFF';
