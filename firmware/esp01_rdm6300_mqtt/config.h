/**
 * Main ESP8266 Configuration Header
 * Auto-generated from master-config.js
 * Environment: development
 * Generated: 2025-10-01T06:39:58.238Z
 * 
 * Include this in your Arduino projects for centralized configuration.
 */

#ifndef RFID_CONFIG_H
#define RFID_CONFIG_H

// Auto-generated configuration from master-config.js
const char* ssid = "UoP_Dev";
const char* password = "s6RBwfAB7H";
const char* serverBase = "http://localhost:4000";
const char* mqtt_server = "localhost";
const int mqtt_port = 1883;
const int rIndex = 8;
String readerID = "REGISTER";
String portal = "portal1";

// Hardware Configuration
#define LED_PIN 2
#define BAUD_RATE 9600
#define WIFI_TIMEOUT_MS 20000

// MQTT Topics
#define MQTT_TOPIC_BASE "rfid"
#define MQTT_TOPIC_HEALTH "health"
#define MQTT_TOPIC_CONFIG "config"

#endif // RFID_CONFIG_H
