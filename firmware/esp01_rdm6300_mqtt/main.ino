/*
 * ESP-01 (ESP8266) + RDM6300 (125 kHz)  ——  MQTT with offline queue (LittleFS)
 *
 * Wiring (ESP-01):
 *   RDM6300 VCC  -> 3.3V
 *   RDM6300 GND  -> GND
 *   RDM6300 TX   -> ESP-01 RX (GPIO3)
 *   (Do NOT use Serial prints; UART is dedicated to RDM6300.)
 *
 * Build:
 *   - Board: "Generic ESP8266 Module" (ESP-01)
 *   - Flash size must include FS (e.g., 1M (256K FS) or larger)
 *   - Core: ESP8266 >= 3.x
 *   - LittleFS selected (this sketch uses <LittleFS.h>)
 */

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <PubSubClient.h>
#include <rdm6300.h>
#include <ArduinoJson.h>
#include <LittleFS.h>

// ================== USER CONFIG ==================
const char* ssid        = "UoP_Dev";
const char* password    = "s6RBwfAB7H";

// Optional boot-time config server (non-fatal if unavailable)
const char* serverBase  = "http://10.30.9.163:4000";

// MQTT broker
const char* mqtt_server = "10.30.9.163";
const int   mqtt_port   = 1885;

// Unique per device
const int   rIndex      = 8;           // physical reader index

// Fallback runtime config (overridden by fetch)
String readerID = "REGISTER";
String portal   = "portal1";

// LED on most ESP-01 modules is GPIO2
#define LED_PIN 2
// Active LOW LED
inline void led_on()  { pinMode(LED_PIN, OUTPUT); digitalWrite(LED_PIN, LOW); }
inline void led_off() { pinMode(LED_PIN, OUTPUT); digitalWrite(LED_PIN, HIGH); }

// Queue file (NDJSON: one JSON object per line)
const char* QUEUE_PATH = "/queue.ndjson";

// ================== GLOBALS ==================
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
Rdm6300 rdm6300;

// ---------------- LED blink ----------------
void blink(int times, int onMs = 120, int offMs = 120) {
  for (int i = 0; i < times; i++) {
    led_on();
    delay(onMs);
    led_off();
    delay(offMs);
  }
}

// ---------------- Utils ----------------
String chipIdHex() {
  uint32_t id = ESP.getChipId();
  char buf[9];
  snprintf(buf, sizeof(buf), "%08X", id);
  return String(buf);
}

String makeMsgId() {
  // Not strictly unique globally, but good enough (chip + millis)
  return chipIdHex() + "-" + String(millis());
}

// ---------------- WiFi connect with timeout ----------------
bool connectWiFiWithTimeout(uint32_t timeoutMs = 20000) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < timeoutMs) {
    delay(250);
    yield();
  }
  return (WiFi.status() == WL_CONNECTED);
}

// ---------------- Boot-time config fetch ----------------
void fetchConfigOnce() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClient client;
  HTTPClient http;
  String url = String(serverBase) + "/api/reader-config/" + String(rIndex);
  if (!http.begin(client, url)) return;

  int code = http.GET();
  if (code == 200) {
    String payload = http.getString();
    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, payload) == DeserializationError::Ok) {
      if (doc.containsKey("readerID")) readerID = String((const char*)doc["readerID"]);
      if (doc.containsKey("portal"))   portal   = String((const char*)doc["portal"]);
      // blink fast to indicate config OK
      blink(3, 60, 60);
    }
  }
  http.end();
}

// ---------------- MQTT connect/reconnect ----------------
void connectToMqtt() {
  mqttClient.setServer(mqtt_server, mqtt_port);

  while (!mqttClient.connected()) {
    String clientId = "ESP8266-RFID-" + String(rIndex) + "-" + chipIdHex();
    if (mqttClient.connect(clientId.c_str())) {
      // short confirmation blink
      blink(2, 80, 80);
    } else {
      // slow retry
      blink(1, 40, 160);
      delay(2500);
    }
    yield();
  }
}

void ensureMqtt() {
  if (!mqttClient.connected()) connectToMqtt();
  mqttClient.loop();
}

// ---------------- Queue (LittleFS) ----------------
// Append one JSON line to queue file.
bool queue_appendLine(const String& line) {
  File f = LittleFS.open(QUEUE_PATH, "a");
  if (!f) return false;
  size_t w = f.print(line);
  w += f.print("\n");
  f.close();
  return (w > 0);
}

// Pop the first line from the queue into outLine.
// Returns true if a line was read; also rewrites the file without that first line.
bool queue_popFront(String& outLine) {
  File f = LittleFS.open(QUEUE_PATH, "r");
  if (!f) return false;

  // read first line
  outLine = f.readStringUntil('\n');

  // if no data, we're done
  if (outLine.length() == 0) {
    f.close();
    // truncate file just in case
    LittleFS.remove(QUEUE_PATH);
    File nf = LittleFS.open(QUEUE_PATH, "w"); nf.close();
    return false;
  }

  // copy remainder to temp file
  File temp = LittleFS.open("/queue.tmp", "w");
  if (!temp) { f.close(); return false; }

  while (f.available()) {
    String rest = f.readStringUntil('\n');
    if (rest.length()) {
      temp.print(rest); temp.print("\n");
    }
  }
  f.close(); temp.close();

  // replace original
  LittleFS.remove(QUEUE_PATH);
  LittleFS.rename("/queue.tmp", QUEUE_PATH);
  return true;
}

// Attempt to flush many queued lines while connected
void queue_tryFlush(size_t maxFlush = 50) {
  if (WiFi.status() != WL_CONNECTED || !mqttClient.connected()) return;

  String line;
  size_t sent = 0;
  while (sent < maxFlush && queue_popFront(line)) {
    line.trim();
    if (line.isEmpty()) continue;

    // Topic derived from (possibly updated) portal
    String topic = "rfid/" + portal;

    // publish; if fail, push back to front (best-effort)
    bool ok = mqttClient.publish(topic.c_str(), line.c_str());
    if (!ok) {
      // Prepend back (simple: create tmp with this line + old file)
      File oldQ = LittleFS.open(QUEUE_PATH, "r");
      File tmp  = LittleFS.open("/queue.tmp", "w");
      if (tmp) {
        tmp.print(line); tmp.print("\n");
        if (oldQ) {
          while (oldQ.available()) {
            String rest = oldQ.readStringUntil('\n');
            if (rest.length()) { tmp.print(rest); tmp.print("\n"); }
          }
          oldQ.close();
        }
        tmp.close();
        LittleFS.remove(QUEUE_PATH);
        LittleFS.rename("/queue.tmp", QUEUE_PATH);
      }
      // stop flushing for now
      break;
    }
    sent++;
    yield();
  }
}

// Build a JSON doc for a tap and return serialized string
// Build a *minimal* JSON doc for a tap and return serialized string
String buildTapJson(const String& tagHex) {
  StaticJsonDocument<160> doc;
  doc["reader"] = portal;     // logical channel (e.g., "portal1")
  doc["label"]  = readerID;   // human-readable (e.g., "REGISTER")
  doc["tag_id"] = tagHex;     // uppercase HEX
  String out;
  serializeJson(doc, out);
  return out;
}

// Publish now if connected; otherwise append to queue
void publishOrEnqueueTap(const String& payload) {
  if (WiFi.status() == WL_CONNECTED && mqttClient.connected()) {
    String topic = "rfid/" + portal;
    if (mqttClient.publish(topic.c_str(), payload.c_str())) {
      // good — also try to flush backlog if any
      queue_tryFlush(50);
      return;
    }
  }
  // enqueue for later
  queue_appendLine(payload);
  // short blink to signal buffered
  blink(1, 30, 70);
}

// ================== SETUP/LOOP ==================
void setup() {
  // LED idle state
  led_off();

  // Filesystem
  LittleFS.begin();
  // ensure queue exists
  if (!LittleFS.exists(QUEUE_PATH)) { File f = LittleFS.open(QUEUE_PATH, "w"); if (f) f.close(); }

  // RDM6300 on hardware UART (Serial) @ 9600
  Serial.begin(9600);
  delay(200);
  rdm6300.begin(&Serial);

  // WiFi + optional config fetch
  if (connectWiFiWithTimeout(20000)) {
    fetchConfigOnce();       // non-fatal
  } else {
    // will keep retrying in loop()
  }

  // MQTT (best effort; loop() ensures reconnects)
  connectToMqtt();

  // On boot, try flushing any backlog
  queue_tryFlush(100);
}

void loop() {
  // keep WiFi/MQTT healthy
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFiWithTimeout(20000);
    // optional: re-fetch config after WiFi returns
    fetchConfigOnce();
  }
  ensureMqtt();

  // read tag (non-blocking)
  if (rdm6300.get_new_tag_id()) {
    unsigned long raw = rdm6300.get_tag_id();
    // LED on during capture
    led_on();

    // hex (uppercase, no 0x)
    String tagHex = String(raw, HEX); tagHex.toUpperCase();

    // build payload and send/queue
    String payload = buildTapJson(tagHex);
    publishOrEnqueueTap(payload);

    // LED off after handling
    led_off();
  }

  // opportunistically flush a few queued lines each pass
  if (WiFi.status() == WL_CONNECTED && mqttClient.connected()) {
    queue_tryFlush(10);
  }

  delay(50);
  yield();
}