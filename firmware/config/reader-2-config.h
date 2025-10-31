/**
 * ESP8266 RFID Reader Configuration
 * Auto-generated from master-config.js
 * Environment: development
 * Reader Index: 2
 * Reader ID: EXITOUT
 * Portal: exitout
 * Generated: 2025-10-31T05:13:09.265Z
 * 
 * Copy these values into your main.ino file or include this file.
 */

// Auto-generated configuration from master-config.js
const char* ssid = "UoP_Dev";
const char* password = "s6RBwfAB7H";
const char* serverBase = "http://localhost:4000";
const char* mqtt_server = "localhost";
const int mqtt_port = 1883;
const int rIndex = 2;
String readerID = "EXITOUT";
String portal = "exitout";

/*
 * Additional Configuration:
 * - LED Pin: 2
 * - Baud Rate: 9600
 * - WiFi Timeout: 20000ms
 */
