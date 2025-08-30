<?php
// ---------------------------------------------
// RFID Visitor Registration & Mapping (Combined)
// ---------------------------------------------

// File paths
$register_file   = 'rfid_register.txt';
$rfid_log_file   = 'rfid_log.txt';
$mapping_file    = 'rfid_visitor_map.txt';

// Render the HTML form and messages
function get_latest_tap($type = 'REGISTER') {
    $log_file = 'rfid_log.txt';
    $latest_tag = '';
    if (file_exists($log_file)) {
        $lines = file($log_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach (array_reverse($lines) as $line) {
            $parts = array_map('trim', explode(',', $line));
            if (count($parts) >= 3 && strtoupper($parts[2]) === strtoupper($type)) {
                $latest_tag = $parts[1];
                break;
            }
        }
    }
    return $latest_tag;
}

function hex_to_dec($hex) {
    $hex = preg_replace('/[^A-Fa-f0-9]/', '', $hex);
    return hexdec($hex);
}

function show_form($message = '', $confirmation = '') {
    echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>RFID Visitor Registration</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; }
        .container { max-width: 400px; margin: 50px auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h2 { text-align: center; }
        label { display: block; margin-top: 10px; }
        input[type="text"] { width: 100%; padding: 8px; margin-top: 5px; border-radius: 4px; border: 1px solid #ccc; }
        button { margin-top: 15px; width: 100%; padding: 10px; background: #007bff; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .message { margin-top: 15px; text-align: center; }
        .confirm { margin-top: 20px; background: #e6ffe6; border: 1px solid #b6e6b6; padding: 10px; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Visitor Registration</h2>
        <form method="POST">
            <label for="name">Name:</label>
            <input type="text" id="name" name="name" required>

            <label for="place">Place of Living:</label>
            <input type="text" id="place" name="place" required>

            <button type="submit" name="register">Register</button>
        </form>
        <form method="POST" style="margin-top:20px;">
            <button type="submit" name="map">Tap Card & Confirm</button>
        </form>
        <div class="message">$message</div>
        $confirmation
    </div>
</body>
</html>
HTML;
}

// State variables
$message = '';
$confirmation = '';

// Step 1: Registration
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['register'])) {
    $name   = isset($_POST['name']) ? trim($_POST['name']) : '';
    $place  = isset($_POST['place']) ? trim($_POST['place']) : '';
    if ($name && $place) {
        // Wait for tap
        $message = "Details saved. Please tap your RFID card and click 'Tap Card & Confirm'.";
        // Save details in session for mapping
        session_start();
        $_SESSION['visitor_name'] = $name;
        $_SESSION['visitor_place'] = $place;
    } else {
        $message = "<span style='color:red'>Error: All fields are required.</span>";
    }
}

// Step 2: Tap and Confirm
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['map'])) {
    session_start();
    $name = isset($_SESSION['visitor_name']) ? $_SESSION['visitor_name'] : '';
    $place = isset($_SESSION['visitor_place']) ? $_SESSION['visitor_place'] : '';
    $latest_tag_hex = get_latest_tap('REGISTER');
    $latest_tag_dec = $latest_tag_hex ? hex_to_dec($latest_tag_hex) : '';
    if ($name && $place && $latest_tag_hex) {
        $username = $name . ' (' . $place . ')';
        $entry = "$username,$latest_tag_dec," . date('Y-m-d H:i:s') . ",REGISTER\n";
        file_put_contents($register_file, $entry, FILE_APPEND | LOCK_EX);
        $confirmation = "<div class='confirm'><b>Registration & Mapping Successful!</b><br>Name: $name<br>Place: $place<br>RFID Tag ID (Hex): $latest_tag_hex<br>RFID Tag ID (Decimal): $latest_tag_dec</div>";
        // Optionally clear session
        unset($_SESSION['visitor_name']);
        unset($_SESSION['visitor_place']);
    } else {
        $message = "<span style='color:red'>Error: Please enter details and tap your card.";
    }
}

show_form($message, $confirmation);
?>
