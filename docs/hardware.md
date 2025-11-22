---
layout: page
title: Hardware Implementation
permalink: /hardware/
---

<div class="markdown-body" data-aos="fade-up">

# Hardware Implementation

The physical layer of the system relies on cost-effective yet reliable components to ensure widespread deployment capability.

<div class="tech-stack">
  <span class="tech-badge">ESP8266</span>
  <span class="tech-badge">Arduino C++</span>
  <span class="tech-badge">RDM6300</span>
  <span class="tech-badge">MQTT</span>
</div>

## Components

- **ESP8266 (NodeMCU/Wemos)**: The main controller handling WiFi and MQTT communication.
- **RDM6300 125kHz RFID Reader**: A dedicated module for reading EM4100 compatible cards.
- **Antenna**: External coil antenna for better read range.

## Wiring Diagram

The connection between the ESP8266 and the RDM6300 is straightforward, using UART for data transfer.

```
ESP8266 (NodeMCU)     RDM6300 RFID Reader
┌─────────────────┐   ┌──────────────────┐
│              3V3│───│VCC               │
│              GND│───│GND               │
│        D4(GPIO2)│───│TX (Data Out)     │
└─────────────────┘   └──────────────────┘
```

## Firmware Logic

The firmware is written in C++ using the Arduino framework. It handles:

1.  **WiFi Connection**: Auto-reconnects if the network drops.
2.  **MQTT Connection**: Maintains a persistent session with the broker.
3.  **Data Parsing**: Reads the serial stream from the RDM6300, validates the checksum, and extracts the tag ID.
4.  **Publishing**: Sends the tag ID to the specific topic for that reader (e.g., `rfid/portal1/tap`).

### Code Snippet

```cpp
void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  if (rdm6300.update()) {
    String tagId = String(rdm6300.get_tag_id(), HEX);
    tagId.toUpperCase();
    
    // Publish to MQTT
    String topic = "rfid/" + String(PORTAL_NAME) + "/tap";
    String payload = "{\"tag\":\"" + tagId + "\"}";
    client.publish(topic.c_str(), payload.c_str());
    
    delay(1000); // Prevent double reads
  }
}
```

</div>
