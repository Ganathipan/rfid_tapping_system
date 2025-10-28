/**
 * ESP8266 RFID Reader Configuration
 * Auto-generated from master-config.js
 * Environment: development
 * Reader Index: 1
 * Reader ID: REGISTER
 * Portal: portal1
 * Generated: 2025-10-28T16:47:54.035Z
 * 
 * Copy these values into your main.ino file or include this file.
 */

// Auto-generated configuration from master-config.js
const char* ssid = "UoP_Dev";
const char* password = "s6RBwfAB7H";
const char* serverBase = "http://192.168.8.2:4000";
const char* mqtt_server = "192.168.8.2";
const int mqtt_port = 1883;
const int rIndex = 1;
String readerID = "REGISTER";
String portal = "portal1";

/*
 * Additional Configuration:
 * - LED Pin: 2
 * - Baud Rate: 9600
 * - WiFi Timeout: 20000ms
 */
