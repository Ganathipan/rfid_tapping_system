/*
 * NodeMCU ESP8266 + RDM6300 RFID (Hardware UART version)
 * Connects to WiFi, reads RFID tags via RX (GPIO3), and uploads IDs to a Node.js server.
 *
 * Wiring:
 *   RDM6300 VCC → NodeMCU 3.3V
 *   RDM6300 GND → NodeMCU GND
 *   RDM6300 TX  → NodeMCU RX (GPIO3 / D9)
 */

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <rdm6300.h>

// ===== WiFi Credentials =====
const char* ssid = "Gana iPhone";
const char* password = "12345679";

// ===== Server Endpoint =====
// Change to your Node.js server IP:port
const char* serverName = "http://172.20.10.3:4000/api/tags/rfidRead";

// ===== Reader Unique ID =====
const char* readerID = "EXITOUT";   // which device/scanner
const char* portal   = "Desk";   // which portal/location

// ===== LED Config =====
#define READ_LED_PIN LED_BUILTIN

Rdm6300 rdm6300;

void setup() {
  Serial.begin(9600);   // RDM6300 default baud is 9600
  delay(200);

  pinMode(READ_LED_PIN, OUTPUT);
  digitalWrite(READ_LED_PIN, HIGH);

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

      http.begin(client, serverName);
      http.addHeader("Content-Type", "application/json");

      // JSON payload
      String payload = "{\"reader\":\"" + String(readerID) +
                 "\", \"portal\":\"" + String(portal) +
                 "\", \"tag\":\"" + String(tag, HEX) + "\"}";

      int httpCode = http.POST(payload);

      if (httpCode > 0) {
        String response = http.getString();
        Serial.println("Server response: " + response);
      } else {
        Serial.println("Error sending POST: " + String(httpCode));
      }

      http.end();
    }

    // LED OFF after sending
    digitalWrite(READ_LED_PIN, HIGH);
  }

  delay(100);
}