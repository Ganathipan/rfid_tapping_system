/*
 * NodeMCU ESP8266 + RDM6300 RFID (Hardware UART version)
 * Connects to WiFi, reads RFID tags via RX (GPIO3), and uploads IDs to a web server.
 *
 * Wiring:
 *   RDM6300 VCC → NodeMCU 3.3V  (⚠️ NOT 5V, NodeMCU is 3.3V only!)
 *   RDM6300 GND → NodeMCU GND
 *   RDM6300 TX  → NodeMCU RX (GPIO3 / D9)
 */

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <rdm6300.h>

// ===== WiFi Credentials =====
const char* ssid = "Redmi Note 10 Pro";
const char* password = "12349876";

// ===== Server Endpoint =====
const char* serverName = "http://10.57.209.45/rfid/rfid.php";

// ===== Reader Unique ID =====
const char* readerID = "REGISTER";  // change per device (e.g., Reader02, Reader03...)

// ===== LED Config =====
#define READ_LED_PIN LED_BUILTIN

Rdm6300 rdm6300;

void setup() {
  // Start hardware UART (used by RDM6300)
  Serial.begin(9600);   // RDM6300 default baud is 9600
  delay(200);

  pinMode(READ_LED_PIN, OUTPUT);
  digitalWrite(READ_LED_PIN, HIGH);

  // Initialize RDM6300 on hardware Serial
  rdm6300.begin(&Serial);

  // Connect WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void loop() {
  if (rdm6300.get_new_tag_id()) {
    unsigned long tag = rdm6300.get_tag_id();

    // Turn LED ON while sending
    digitalWrite(READ_LED_PIN, LOW);

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      WiFiClient client;

      // Build URL with ReaderID + TagID
      String url = String(serverName) + "?reader=" + readerID + "&tag=" + String(tag, HEX);

      if (http.begin(client, url)) {
        int httpCode = http.GET();

        http.end();
      }
    }

    // LED OFF after sending
    digitalWrite(READ_LED_PIN, HIGH);
  }

  delay(100);
}
