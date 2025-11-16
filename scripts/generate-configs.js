#!/usr/bin/env node
/**
 * Configuration Generator Script
 * 
 * This script generates all configuration files from master-config.js:
 * - Backend .env file
 * - Frontend .env file  
 * - Arduino firmware config
 * - Docker Compose environment variables
 * 
 * Usage:
 *   node generate-configs.js [environment]
 *   
 * Examples:
 *   node generate-configs.js development
 *   node generate-configs.js production
 */

const fs = require('fs');
const path = require('path');

// Set environment before requiring config
process.env.NODE_ENV = process.argv[2] || 'development';

const {
  config,
  ENVIRONMENT,
  getBackendEnv,
  getFrontendEnv,
  getDatabaseUrl,
  getMqttUrl,
  generateArduinoConfig,
  NETWORK
} = require('../config/master-config.js');

console.log(`🔧 Generating configuration files for: ${ENVIRONMENT}`);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFileWithBackup(filePath, content) {
  ensureDirectoryExists(filePath);
  
  // Create backup if file exists
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`  📦 Backed up existing file to: ${backupPath}`);
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`  ✅ Generated: ${filePath}`);
}

function generateEnvFile(envObject) {
  return Object.entries(envObject)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n';
}

// =============================================================================
// BACKEND CONFIGURATION
// =============================================================================
function generateBackendConfig() {
  console.log('\n📁 Generating Backend Configuration...');
  
  const backendEnv = getBackendEnv();
  const envContent = generateEnvFile(backendEnv);
  
  writeFileWithBackup('../apps/backend/.env', envContent);
  
  // Also update the centralized config file import
  const configJsContent = `/**
 * Backend Environment Configuration
 * Auto-generated from master-config.js
 * Environment: ${ENVIRONMENT}
 * Generated: ${new Date().toISOString()}
 */

const { getBackendEnv } = require('../../config/master-config.js');

module.exports = getBackendEnv();
`;
  
  writeFileWithBackup('../apps/backend/src/config/env.js', configJsContent);
}

// =============================================================================
// FRONTEND CONFIGURATION  
// =============================================================================
function generateFrontendConfig() {
  console.log('\n🎨 Generating Frontend Configuration...');
  
  const frontendEnv = getFrontendEnv();
  const envContent = generateEnvFile(frontendEnv);
  
  writeFileWithBackup('../apps/frontend/.env', envContent);
  
  // Generate additional config file for build-time access
  const configJsContent = `/**
 * Frontend Build Configuration
 * Auto-generated from master-config.js
 * Environment: ${ENVIRONMENT}
 * Generated: ${new Date().toISOString()}
 */

export const API_BASE = '${frontendEnv.VITE_API_BASE}';
export const BACKEND_HOST = '${frontendEnv.VITE_BACKEND_HOST}';
export const BACKEND_PORT = ${frontendEnv.VITE_BACKEND_PORT};
export const WS_URL = '${frontendEnv.VITE_WS_URL}';
export const GAMELITE_KEY = '${frontendEnv.VITE_GAMELITE_KEY}';

export default {
  API_BASE,
  BACKEND_HOST,
  BACKEND_PORT,
  WS_URL,
  GAMELITE_KEY
};
`;
  
  writeFileWithBackup('../apps/frontend/src/config.js', configJsContent);
}

// =============================================================================
// ARDUINO FIRMWARE CONFIGURATION
// =============================================================================
function generateFirmwareConfigs() {
  console.log('\n🔌 Generating Firmware Configuration...');
  
  // Generate config for each reader
  config.HARDWARE.READERS.forEach(reader => {
    const arduinoConfig = generateArduinoConfig(reader.INDEX);
    
    const firmwareContent = `/**
 * ESP8266 RFID Reader Configuration
 * Auto-generated from master-config.js
 * Environment: ${ENVIRONMENT}
 * Reader Index: ${reader.INDEX}
 * Reader ID: ${reader.ID}
 * Portal: ${reader.PORTAL}
 * Generated: ${new Date().toISOString()}
 * 
 * Copy these values into your main.ino file or include this file.
 */

${arduinoConfig}

/*
 * Additional Configuration:
 * - LED Pin: ${config.HARDWARE.ESP8266.LED_PIN}
 * - Baud Rate: ${config.HARDWARE.ESP8266.BAUD_RATE}
 * - WiFi Timeout: ${config.HARDWARE.WIFI.TIMEOUT_MS}ms
 */
`;
    
    writeFileWithBackup(`./firmware/config/reader-${reader.INDEX}-config.h`, firmwareContent);
  });
  
  // Generate a main config header
  const mainConfigContent = `/**
 * Main ESP8266 Configuration Header
 * Auto-generated from master-config.js
 * Environment: ${ENVIRONMENT}
 * Generated: ${new Date().toISOString()}
 * 
 * Include this in your Arduino projects for centralized configuration.
 */

#ifndef RFID_CONFIG_H
#define RFID_CONFIG_H

${generateArduinoConfig(8)}

// Hardware Configuration
#define LED_PIN ${config.HARDWARE.ESP8266.LED_PIN}
#define BAUD_RATE ${config.HARDWARE.ESP8266.BAUD_RATE}
#define WIFI_TIMEOUT_MS ${config.HARDWARE.WIFI.TIMEOUT_MS}

// MQTT Topics
#define MQTT_TOPIC_BASE "rfid"
#define MQTT_TOPIC_HEALTH "health"
#define MQTT_TOPIC_CONFIG "config"

#endif // RFID_CONFIG_H
`;
  
  writeFileWithBackup('../firmware/esp01_rdm6300_mqtt/config.h', mainConfigContent);
}

// =============================================================================
// DOCUMENTATION GENERATION
// =============================================================================
function generateConfigDocumentation() {
  console.log('\n📚 Generating Configuration Documentation...');
  
  const docContent = `# Configuration Reference

This document describes all configuration options available in the RFID Tapping System.

## Environment: ${ENVIRONMENT}

Generated: ${new Date().toISOString()}

## Network Configuration

### Backend API
- **Host**: ${config.NETWORK.BACKEND.HOST}
- **Port**: ${config.NETWORK.BACKEND.PORT}
- **Protocol**: ${config.NETWORK.BACKEND.PROTOCOL}
- **Full URL**: ${config.NETWORK.BACKEND.PROTOCOL}://${config.NETWORK.BACKEND.HOST}:${config.NETWORK.BACKEND.PORT}

### Frontend
- **Host**: ${config.NETWORK.FRONTEND.HOST}
- **Port**: ${config.NETWORK.FRONTEND.PORT}
- **Protocol**: ${config.NETWORK.FRONTEND.PROTOCOL}

### Database (PostgreSQL)
- **Host**: ${config.NETWORK.DATABASE.HOST}
- **Port**: ${config.NETWORK.DATABASE.PORT}
- **Database**: ${config.NETWORK.DATABASE.NAME}
- **Username**: ${config.NETWORK.DATABASE.USERNAME}
- **SSL Enabled**: ${config.NETWORK.DATABASE.SSL}
- **Connection Pool**: ${config.NETWORK.DATABASE.MAX_CONNECTIONS}

### MQTT Broker
- **Host**: ${config.NETWORK.MQTT.HOST}
- **Port**: ${config.NETWORK.MQTT.PORT}
- **Protocol**: ${config.NETWORK.MQTT.PROTOCOL}

## Hardware Configuration

### WiFi Settings
- **SSID**: ${config.HARDWARE.WIFI.SSID}
- **Timeout**: ${config.HARDWARE.WIFI.TIMEOUT_MS}ms
- **Retry Attempts**: ${config.HARDWARE.WIFI.RETRY_ATTEMPTS}

### RFID Readers
${config.HARDWARE.READERS.map(reader => `
#### Reader ${reader.INDEX}
- **ID**: ${reader.ID}
- **Portal**: ${reader.PORTAL}
- **Description**: ${reader.DESCRIPTION}
`).join('')}

### ESP8266 Settings
- **LED Pin**: ${config.HARDWARE.ESP8266.LED_PIN}
- **Baud Rate**: ${config.HARDWARE.ESP8266.BAUD_RATE}
- **Flash Size**: ${config.HARDWARE.ESP8266.FLASH_SIZE}
- **Filesystem**: ${config.HARDWARE.ESP8266.FILESYSTEM}

## Security Configuration

### API Security
- **Game Lite Admin Key**: ${config.SECURITY.GAME_LITE_ADMIN_KEY}
- **Rate Limit Window**: ${config.SECURITY.API_RATE_LIMIT.WINDOW_MS}ms
- **Max Requests**: ${config.SECURITY.API_RATE_LIMIT.MAX_REQUESTS}

### CORS Policy
- **Allowed Origins**: ${config.SECURITY.CORS.ORIGINS.join(', ')}
- **Credentials**: ${config.SECURITY.CORS.CREDENTIALS}
- **Methods**: ${config.SECURITY.CORS.METHODS.join(', ')}

## Application Configuration

### Logging
- **Level**: ${config.APPLICATION.LOGGING.LEVEL}
- **File Path**: ${config.APPLICATION.LOGGING.FILE_PATH}
- **Max File Size**: ${config.APPLICATION.LOGGING.MAX_FILE_SIZE}
- **Max Files**: ${config.APPLICATION.LOGGING.MAX_FILES}

### Game Settings
- **Max Players Per Team**: ${config.APPLICATION.GAME.MAX_PLAYERS_PER_TEAM}
- **Game Duration**: ${config.APPLICATION.GAME.GAME_DURATION_MINUTES} minutes
- **Leaderboard Refresh**: ${config.APPLICATION.GAME.LEADERBOARD_REFRESH_INTERVAL}ms

## Files Generated

This configuration generates the following files:
- \`apps/backend/.env\` - Backend environment variables
- \`apps/backend/src/config/env.js\` - Backend configuration module
- \`apps/frontend/.env\` - Frontend environment variables
- \`apps/frontend/src/config.js\` - Frontend configuration module
- \`firmware/esp01_rdm6300_mqtt/config.h\` - Arduino configuration header
- \`firmware/config/reader-*-config.h\` - Individual reader configurations

## Usage

To regenerate all configuration files:
\`\`\`bash
node generate-configs.js ${ENVIRONMENT}
\`\`\`

To change configuration:
1. Edit \`master-config.js\`
2. Run the generation script
3. Restart services to apply changes
`;

  // Configuration documentation now integrated into main README.md
  console.log('ℹ️  Configuration documentation is available in README.md');
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================
function main() {
  try {
    console.log('🚀 RFID System Configuration Generator');
    console.log('=====================================');
    console.log(`Environment: ${ENVIRONMENT}`);
    console.log(`Generated: ${new Date().toISOString()}`);
    
    generateBackendConfig();
    generateFrontendConfig();
    generateFirmwareConfigs();
    generateConfigDocumentation();
    
    console.log('\n✅ Configuration generation completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Review generated configuration files');
    console.log('2. Restart your services to apply changes');
    console.log('3. Flash new firmware to ESP8266 devices if needed');
    console.log(`4. Check README.md for complete configuration reference`);
    
  } catch (error) {
    console.error('\n❌ Configuration generation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateBackendConfig,
  generateFrontendConfig,
  generateFirmwareConfigs,
  generateConfigDocumentation
};