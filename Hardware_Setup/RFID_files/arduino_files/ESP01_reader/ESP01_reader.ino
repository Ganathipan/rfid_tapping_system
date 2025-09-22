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
#include <ArduinoJson.h>

// ===== WiFi Credentials =====
const char* ssid = "Gana Dialog 4G";
const char* password = "ROOM1492";

// ===== Server Base =====
const char* serverBase = "http://192.168.8.2:4000";  // change IP/port if needed

// ===== Reader Index (unique per device) =====
const int rIndex = 1;   // <-- set a unique number per physical reader

// ===== Runtime-configured IDs (populated from server) =====
String readerID = "REGISTER";   // fallback default
String portal   = "portal1";    // fallback default

// ===== LED Config =====
#define READ_LED_PIN LED_BUILTIN

Rdm6300 rdm6300;

bool fetchConfigOnce() {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClient client;
  HTTPClient http;
  String url = String(serverBase) + "/api/reader-config/" + String(rIndex);
  if (!http.begin(client, url)) return false;

  int code = http.GET();
  if (code <= 0) { http.end(); return false; }

  if (code == 200) {
    String payload = http.getString();
    // Parse JSON: { "readerID":"...", "portal":"..." }
    StaticJsonDocument<256> doc;
    auto err = deserializeJson(doc, payload);
    if (!err) {
      if (doc.containsKey("readerID")) readerID = String((const char*)doc["readerID"]);
      if (doc.containsKey("portal"))   portal   = String((const char*)doc["portal"]);
    }
  }
  http.end();
  return true;
}

void setup() {
  Serial.begin(9600);   // RDM6300 default baud is 9600
  delay(200);

  pinMode(READ_LED_PIN, OUTPUT);
  digitalWrite(READ_LED_PIN, HIGH);

  rdm6300.begin(&Serial);

  // Connect WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }

  // Fetch server config using rIndex (non-fatal if it fails)
  fetchConfigOnce();
}

void loop() {
  if (rdm6300.get_new_tag_id()) {
    unsigned long tag = rdm6300.get_tag_id();

    // Turn LED ON while sending
    digitalWrite(READ_LED_PIN, LOW);

    if (WiFi.status() == WL_CONNECTED) {
      WiFiClient client;
      HTTPClient http;

      String url = String(serverBase) + "/api/tags/rfidRead";
      if (http.begin(client, url)) {
        http.addHeader("Content-Type", "application/json");

        // JSON payload uses dynamic readerID + portal
        String payload = "{\"reader\":\"" + readerID +
                         "\", \"portal\":\"" + portal +
                         "\", \"tag\":\"" + String(tag, HEX) + "\"}";

        int httpCode = http.POST(payload);
        if (httpCode > 0) {
          String response = http.getString();
          Serial.println("Server response: " + response);
        } else {
          Serial.println("Error POST: " + String(httpCode));
        }
        http.end();
      }
    }

    // LED OFF after sending
    digitalWrite(READ_LED_PIN, HIGH);
  }

  delay(100);
}