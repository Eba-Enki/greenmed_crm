<?php
// TCMB (Central Bank of the Republic of Türkiye) exchange rates, for the "TCMB rate" buttons of the Sales &
// Procurement portal. The browser cannot read tcmb.gov.tr itself (no CORS), so the server fetches the bulletin.
// GET ?date=YYYY-MM-DD → {requested, date, rates: {USD: {unit, banknoteBuying, forexBuying}, ...}}
//   `date` is the bulletin used: the one of that day, or the latest one before it when that day has none
//   (weekend, public holiday, or today before TCMB publishes at 15:30). Rates are Turkish lira per `unit`.
// A published bulletin never changes, so each one is fetched once and kept in `settings` as tcmb:YYYY-MM-DD
// (a past day without a bulletin is kept as "none"); these keys are not part of the synced app data.

require __DIR__ . '/_bootstrap.php';

require_user();

const TCMB_LOOKBACK_DAYS = 10;

$tz = new DateTimeZone('Europe/Istanbul');
$today = new DateTimeImmutable('today', $tz);
$req = (string)($_GET['date'] ?? '');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $req) || !($day = DateTimeImmutable::createFromFormat('!Y-m-d', $req, $tz))) {
    respond(400, ['error' => 'date must be YYYY-MM-DD']);
}
if ($day > $today) $day = $today; // no bulletin for a future day yet: use the latest one

// Body of the TCMB file for one day, null when TCMB has none for it (404); throws when TCMB cannot be reached.
function tcmb_fetch(DateTimeImmutable $d): ?string
{
    $url = 'https://www.tcmb.gov.tr/kurlar/' . $d->format('Ym') . '/' . $d->format('dmY') . '.xml';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_TIMEOUT => 12, CURLOPT_USERAGENT => 'GreenMedCRM/1.0',
        ]);
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($body === false) throw new RuntimeException('TCMB not reachable: ' . $err);
    } else {
        $ctx = stream_context_create(['http' => ['timeout' => 12, 'ignore_errors' => true, 'header' => "User-Agent: GreenMedCRM/1.0\r\n"]]);
        $body = @file_get_contents($url, false, $ctx);
        if ($body === false) throw new RuntimeException('TCMB not reachable');
        $code = preg_match('#^HTTP/\S+\s+(\d+)#', $http_response_header[0] ?? '', $m) ? (int)$m[1] : 0;
    }
    if ($code === 404) return null;
    if ($code !== 200) throw new RuntimeException('TCMB answered HTTP ' . $code);
    return $body;
}

// {USD: {unit, banknoteBuying, forexBuying}, ...} from a bulletin; a rate TCMB leaves empty is null
function tcmb_parse(string $xml): array
{
    $doc = @simplexml_load_string($xml);
    if ($doc === false) throw new RuntimeException('TCMB sent an unreadable bulletin');
    $num = function ($v) { $s = trim((string)$v); return $s === '' ? null : (float)$s; };
    $rates = [];
    foreach ($doc->Currency as $c) {
        $code = (string)$c['CurrencyCode'];
        if ($code === '') continue;
        $rates[$code] = [
            'unit' => max(1, (int)(string)$c->Unit),
            'banknoteBuying' => $num($c->BanknoteBuying),
            'forexBuying' => $num($c->ForexBuying),
        ];
    }
    if (!$rates) throw new RuntimeException('TCMB bulletin has no rates');
    return $rates;
}

try {
    $pdo = db();
    $get = $pdo->prepare('SELECT value FROM settings WHERE setting_key = ?');
    $put = $pdo->prepare(
        "INSERT INTO settings (setting_key, value, is_raw, updated_by) VALUES (?, ?, 1, 'tcmb')
         ON DUPLICATE KEY UPDATE value = VALUES(value)"
    );
    for ($i = 0; $i <= TCMB_LOOKBACK_DAYS; $i++) {
        $d = $day->modify("-$i day");
        $key = 'tcmb:' . $d->format('Y-m-d');
        $get->execute([$key]);
        $cached = $get->fetchColumn();
        if ($cached === 'none') continue;
        if ($cached !== false) {
            respond(200, ['requested' => $req, 'date' => $d->format('Y-m-d'), 'rates' => json_decode($cached, true)]);
        }
        $xml = tcmb_fetch($d);
        if ($xml === null) {
            // Today's bulletin may still come out later today, so only a past day is remembered as having none
            if ($d < $today) $put->execute([$key, 'none']);
            continue;
        }
        $rates = tcmb_parse($xml);
        $put->execute([$key, json_encode($rates)]);
        respond(200, ['requested' => $req, 'date' => $d->format('Y-m-d'), 'rates' => $rates]);
    }
    respond(404, ['error' => 'No TCMB bulletin in the ' . TCMB_LOOKBACK_DAYS . ' days before ' . $req]);
} catch (RuntimeException $e) {
    respond(502, ['error' => $e->getMessage()]);
} catch (PDOException $e) {
    error_log('GM API rates: ' . $e->getMessage());
    respond(500, ['error' => 'Database error']);
}
