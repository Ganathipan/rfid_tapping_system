<?php
// rfid.php - handle RFID tag + reader logging

// Get parameters and sanitize
$reader = isset($_GET['reader']) ? preg_replace('/[^A-Za-z0-9_-]/', '', $_GET['reader']) : '';
$tag    = isset($_GET['tag']) ? preg_replace('/[^A-Fa-f0-9]/', '', $_GET['tag']) : '';

// Log file path (can be in a 'logs' folder)
$logFile = __DIR__ . '/rfid_log.txt';

if ($reader && $tag) {
    // Format: [Timestamp] ReaderID - TagID
    $logEntry = date("Y-m-d H:i:s") . "," . strtoupper($tag) . ", " . $reader . "\n";

    // Append to log file safely
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);

    echo "Entry saved: Reader=$reader, Tag=" . strtoupper($tag);
} else {
    // Show log contents (newest first)
    echo "<!DOCTYPE html><html><head><title>RFID Log</title></head><body>";

    // Auto-refresh with JavaScript every 5 seconds
    echo "<script>
        setTimeout(function(){
            window.location.reload();
        }, 1000); // refresh every second
    </script>";

    echo "<h2>RFID Log</h2>";

    if (file_exists($logFile)) {
        $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        echo '<table border="1" cellpadding="6" style="border-collapse:collapse;margin:20px auto;min-width:400px;">';
        echo '<tr style="background:#007bff;color:#fff;"><th>Timestamp</th><th>Tag ID</th><th>Location/Reader</th></tr>';
        foreach ($lines as $line) {
            $parts = array_map('trim', explode(',', $line));
            if (count($parts) >= 3) {
                echo '<tr>';
                echo '<td>' . htmlspecialchars($parts[0]) . '</td>';
                echo '<td>' . htmlspecialchars($parts[1]) . '</td>';
                echo '<td>' . htmlspecialchars($parts[2]) . '</td>';
                echo '</tr>';
            }
        }
        echo '</table>';
    } else {
        echo "No entries yet.";
    }

    echo "</body></html>";
}
?>
