<?php
$logFile = "rfid_log.txt";

// Track final state
$roomKeys    = ["ROOM1","ROOM2","ROOM3"];
$roomCounts  = array_fill_keys($roomKeys, 0);
$userLoc     = [];   // user => last place (ENTRY/ROOMx), EXIT unsets
$insideTotal = 0;

// Helper to sanitize tokens (strip quotes, CR/LF, NBSP, spaces; uppercase)
function clean($s) {
    // normalize non-breaking space to normal space
    $s = str_replace("\xC2\xA0", ' ', $s);
    // trim spaces + quotes
    $s = trim($s, " \t\n\r\0\x0B\"'");
    return strtoupper($s);
}

// Read the log safely
if (is_readable($logFile) && ($fh = fopen($logFile, 'r'))) {
    if (flock($fh, LOCK_SH)) {
        while (($line = fgets($fh)) !== false) {
            $line = trim($line);
            if ($line === '') continue;

            // split by first two commas to tolerate commas in timestamp if any
            $parts = explode(',', $line);
            if (count($parts) < 3) continue;

            $time = clean($parts[0]);
            $user = clean($parts[1]);
            // join remaining parts (in case of extra commas) and clean
            $loc  = clean(implode(',', array_slice($parts, 2)));

            if ($user === '' || $loc === '') continue;

            if ($loc === 'EXIT') {
                unset($userLoc[$user]);            // user left the building
            } elseif ($loc === 'ENTRY') {
                $userLoc[$user] = 'ENTRY';         // in building but not in a room
            } elseif (in_array($loc, $roomKeys, true)) {
                $userLoc[$user] = $loc;            // in one of the rooms
            } else {
                // Unknown station name; ignore
            }
        }
        flock($fh, LOCK_UN);
    }
    fclose($fh);
}

// Compute counts
foreach ($userLoc as $loc) {
    if (isset($roomCounts[$loc])) {
        $roomCounts[$loc]++;
    }
}
$insideTotal = count($userLoc); // users still inside (ENTRY or any ROOM)
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Crowd Management Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
        .grid { display: inline-grid; grid-template-columns: repeat(4, 180px); gap: 16px; }
        .card { border: 1px solid #ddd; border-radius: 12px; padding: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
        .label { font-size: 14px; color:#555; margin-bottom:6px; }
        .count { font-size: 36px; font-weight: 700; }
        .total { color: #0b6; }
    </style>
    <!-- Auto-refresh every 5 seconds -->
    <script>
        setTimeout(function(){ window.location.reload(); }, 5000);
    </script>
</head>
<body>
    <h1>Crowd Management Dashboard</h1>
    <div class="grid">
        <div class="card">
            <div class="label">Room 1</div>
            <div class="count"><?= $roomCounts['ROOM1'] ?></div>
        </div>
        <div class="card">
            <div class="label">Room 2</div>
            <div class="count"><?= $roomCounts['ROOM2'] ?></div>
        </div>
        <div class="card">
            <div class="label">Room 3</div>
            <div class="count"><?= $roomCounts['ROOM3'] ?></div>
        </div>
        <div class="card">
            <div class="label">Inside Department (total)</div>
            <div class="count total"><?= $insideTotal ?></div>
        </div>
    </div>
</body>
</html>
