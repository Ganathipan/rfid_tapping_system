/**
 * RFID Tapping System - Master Configuration
 * 
 * This file contains ALL configuration variables for the entire system:
 * - Database settings
 * - Network configuration 
 * - WiFi credentials
 * - MQTT broker settings
 * - API endpoints
 * - Security keys
 * - Hardware settings
 * 
 * SECURITY NOTE: This file contains sensitive information.
 * - Add to .gitignore in production
 * - Create environment-specific copies (dev, staging, prod)
 * - Use proper secrets management in production
 */

// =============================================================================
// ENVIRONMENT SELECTION
// =============================================================================
const ENVIRONMENT = process.env.NODE_ENV || 'development'; // 'development', 'staging', 'production'

// =============================================================================
// NETWORK & INFRASTRUCTURE
// =============================================================================
const NETWORK = {
  // Backend API Configuration
  BACKEND: {
    HOST: process.env.BACKEND_HOST || process.env.NETWORK_IP || '192.168.8.2',
    PORT: parseInt(process.env.BACKEND_PORT) || 4000,
    PROTOCOL: process.env.BACKEND_PROTOCOL || 'http',
  },

  // Frontend Configuration  
  FRONTEND: {
    HOST: process.env.FRONTEND_HOST || process.env.NETWORK_IP || '192.168.8.2',
    PORT: parseInt(process.env.FRONTEND_PORT) || 5173,
    PROTOCOL: process.env.FRONTEND_PROTOCOL || 'http',
  },

  // Database Configuration
  DATABASE: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT) || 5432,
    NAME: process.env.DB_NAME || 'rfid',
    USERNAME: process.env.DB_USER || 'postgres',
    PASSWORD: process.env.DB_PASSWORD || 'New1',
    SSL: process.env.DB_SSL === 'true' || false,
    MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
  },

  // MQTT Broker Configuration
  MQTT: {
    HOST: process.env.MQTT_HOST || process.env.NETWORK_IP || '192.168.8.2',
    PORT: parseInt(process.env.MQTT_PORT) || 1883,
    PROTOCOL: process.env.MQTT_PROTOCOL || 'mqtt',
    CLIENT_ID_PREFIX: process.env.MQTT_CLIENT_ID_PREFIX || 'rfid-system',
    USERNAME: process.env.MQTT_USERNAME || null,
    PASSWORD: process.env.MQTT_PASSWORD || null,
    TOPICS: {
      RFID_BASE: process.env.MQTT_TOPIC_RFID || 'rfid',
      HEALTH: process.env.MQTT_TOPIC_HEALTH || 'health',
      CONFIG: process.env.MQTT_TOPIC_CONFIG || 'config',
    }
  }
};

// =============================================================================
// WIFI & HARDWARE CONFIGURATION
// =============================================================================
const HARDWARE = {
  // WiFi Network Settings (for ESP8266 devices)
  WIFI: {
    SSID: process.env.WIFI_SSID || 'UoP_Dev',
    PASSWORD: process.env.WIFI_PASSWORD || 's6RBwfAB7H',
    TIMEOUT_MS: parseInt(process.env.WIFI_TIMEOUT_MS) || 20000,
    RETRY_ATTEMPTS: parseInt(process.env.WIFI_RETRY_ATTEMPTS) || 3,
  },

  // RFID Reader Configuration
  READERS: [
    {
      INDEX: 1,
      ID: process.env.READER_1_ID || 'REGISTER',
      PORTAL: process.env.READER_1_PORTAL || 'portal1',
      DESCRIPTION: process.env.READER_1_DESC || 'Registration Portal',
      MAC_ADDRESS: process.env.READER_1_MAC || null,
    },
    {
      INDEX: 2,
      ID: process.env.READER_2_ID || 'EXITOUT', 
      PORTAL: process.env.READER_2_PORTAL || 'exitout',
      DESCRIPTION: process.env.READER_2_DESC || 'Entry/Exit Portal',
      MAC_ADDRESS: process.env.READER_2_MAC || null,
    },
    {
      INDEX: 8,
      ID: process.env.READER_8_ID || 'CLUSTER1',
      PORTAL: process.env.READER_8_PORTAL || 'reader1', 
      DESCRIPTION: process.env.READER_8_DESC || 'Main Registration',
      MAC_ADDRESS: process.env.READER_8_MAC || null,
    }
  ],

  // ESP8266 Hardware Settings
  ESP8266: {
    LED_PIN: parseInt(process.env.ESP_LED_PIN) || 2,
    BAUD_RATE: parseInt(process.env.ESP_BAUD_RATE) || 9600,
    FLASH_SIZE: process.env.ESP_FLASH_SIZE || '1M',
    FILESYSTEM: process.env.ESP_FILESYSTEM || 'LittleFS',
  }
};

// =============================================================================
// SECURITY & AUTHENTICATION
// =============================================================================
const SECURITY = {
  // API Keys and Secrets
  GAME_LITE_ADMIN_KEY: process.env.GAMELITE_ADMIN_KEY || 'dev-admin-key-2024',
  JWT_SECRET: process.env.JWT_SECRET || 'your-jwt-secret-key-here',
  API_RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // CORS Configuration
  CORS: {
    ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://10.30.6.239:5173').split(','),
    CREDENTIALS: process.env.CORS_CREDENTIALS !== 'false',
    METHODS: (process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS').split(',')
  },

  // Session Configuration
  SESSION: {
    SECRET: process.env.SESSION_SECRET || 'session-secret-key',
    EXPIRES_IN: process.env.SESSION_EXPIRES_IN || '24h',
    SECURE: process.env.SESSION_SECURE === 'true' || false,
  }
};

// =============================================================================
// APPLICATION CONFIGURATION
// =============================================================================
const APPLICATION = {
  // Logging Configuration
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || (ENVIRONMENT === 'production' ? 'info' : 'debug'),
    FILE_PATH: process.env.LOG_FILE_PATH || './logs/rfid-system.log',
    MAX_FILE_SIZE: process.env.LOG_MAX_FILE_SIZE || '10m',
    MAX_FILES: parseInt(process.env.LOG_MAX_FILES) || 5,
  },

  // Cache Configuration
  CACHE: {
    TTL: parseInt(process.env.CACHE_TTL) || 300,
    MAX_KEYS: parseInt(process.env.CACHE_MAX_KEYS) || 1000,
  },

  // File Upload Configuration
  UPLOADS: {
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '5mb',
    ALLOWED_TYPES: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf').split(','),
    UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  },

  // Game Configuration
  GAME: {
    MAX_PLAYERS_PER_TEAM: parseInt(process.env.MAX_PLAYERS_PER_TEAM) || 6,
    GAME_DURATION_MINUTES: parseInt(process.env.GAME_DURATION_MINUTES) || 30,
    LEADERBOARD_REFRESH_INTERVAL: parseInt(process.env.LEADERBOARD_REFRESH_MS) || 5000,
  }
};

// =============================================================================
// ENVIRONMENT-SPECIFIC OVERRIDES
// =============================================================================
const ENVIRONMENT_OVERRIDES = {
  development: {
    NETWORK: {
      DATABASE: {
        HOST: 'localhost',
        PASSWORD: 'New1',
      },
      MQTT: {
        HOST: 'localhost',
        PORT: 1883,
      }
    },
    SECURITY: {
      CORS: {
        ORIGINS: ['http://localhost:5173', 'http://localhost:3000']
      }
    }
  },

  staging: {
    NETWORK: {
      BACKEND: {
        PROTOCOL: 'https',
      },
      FRONTEND: {
        PROTOCOL: 'https',
      },
      DATABASE: {
        SSL: true,
        HOST: 'staging-db.example.com',
      }
    },
    SECURITY: {
      SESSION: {
        SECURE: true,
      }
    }
  },

  production: {
    NETWORK: {
      BACKEND: {
        PROTOCOL: 'https',
        HOST: 'api.yourproductiondomain.com',
      },
      FRONTEND: {
        PROTOCOL: 'https', 
        HOST: 'yourproductiondomain.com',
      },
      DATABASE: {
        SSL: true,
        HOST: 'production-db.example.com',
        PASSWORD: process.env.DB_PASSWORD || 'secure-production-password',
      }
    },
    SECURITY: {
      GAME_LITE_ADMIN_KEY: process.env.ADMIN_KEY || 'secure-production-key',
      JWT_SECRET: process.env.JWT_SECRET || 'secure-jwt-secret',
      SESSION: {
        SECURE: true,
        SECRET: process.env.SESSION_SECRET || 'secure-session-secret',
      }
    },
    APPLICATION: {
      LOGGING: {
        LEVEL: 'warn',
      }
    }
  }
};

// =============================================================================
// CONFIGURATION MERGER
// =============================================================================
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      target[key] = target[key] || {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Apply environment-specific overrides
const config = deepMerge(
  { NETWORK, HARDWARE, SECURITY, APPLICATION },
  ENVIRONMENT_OVERRIDES[ENVIRONMENT] || {}
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get complete backend URL
 */
function getBackendUrl() {
  const { PROTOCOL, HOST, PORT } = config.NETWORK.BACKEND;
  return `${PROTOCOL}://${HOST}:${PORT}`;
}

/**
 * Get complete frontend URL  
 */
function getFrontendUrl() {
  const { PROTOCOL, HOST, PORT } = config.NETWORK.FRONTEND;
  return `${PROTOCOL}://${HOST}:${PORT}`;
}

/**
 * Get PostgreSQL connection string
 */
function getDatabaseUrl() {
  const { USERNAME, PASSWORD, HOST, PORT, NAME, SSL } = config.NETWORK.DATABASE;
  const sslParam = SSL ? '?sslmode=require' : '';
  return `postgresql://${USERNAME}:${PASSWORD}@${HOST}:${PORT}/${NAME}${sslParam}`;
}

/**
 * Get MQTT broker URL
 */
function getMqttUrl() {
  const { PROTOCOL, HOST, PORT, USERNAME, PASSWORD } = config.NETWORK.MQTT;
  if (USERNAME && PASSWORD) {
    return `${PROTOCOL}://${USERNAME}:${PASSWORD}@${HOST}:${PORT}`;
  }
  return `${PROTOCOL}://${HOST}:${PORT}`;
}

/**
 * Get WiFi configuration for Arduino code generation
 */
function getWifiConfig() {
  return {
    ssid: config.HARDWARE.WIFI.SSID,
    password: config.HARDWARE.WIFI.PASSWORD,
    timeout: config.HARDWARE.WIFI.TIMEOUT_MS
  };
}

/**
 * Get reader configuration by index
 */
function getReaderConfig(index) {
  return config.HARDWARE.READERS.find(r => r.INDEX === index);
}

/**
 * Get environment variables for backend
 */
function getBackendEnv() {
  return {
    NODE_ENV: ENVIRONMENT,
    PORT: config.NETWORK.BACKEND.PORT,
    DATABASE_URL: getDatabaseUrl(),
    PG_SSL: config.NETWORK.DATABASE.SSL,
    MQTT_URL: getMqttUrl(),
    GAMELITE_ADMIN_KEY: config.SECURITY.GAME_LITE_ADMIN_KEY,
    JWT_SECRET: config.SECURITY.JWT_SECRET,
    LOG_LEVEL: config.APPLICATION.LOGGING.LEVEL,
  };
}

/**
 * Get environment variables for frontend
 */
function getFrontendEnv() {
  return {
    VITE_API_BASE: getBackendUrl(),
    VITE_BACKEND_HOST: config.NETWORK.BACKEND.HOST,
    VITE_BACKEND_PORT: config.NETWORK.BACKEND.PORT,
    VITE_GAMELITE_KEY: config.SECURITY.GAME_LITE_ADMIN_KEY,
    VITE_WS_URL: getBackendUrl().replace('http', 'ws'),
  };
}

/**
 * Generate Arduino firmware configuration
 */
function generateArduinoConfig(readerIndex = 8) {
  const reader = getReaderConfig(readerIndex);
  const wifi = getWifiConfig();
  const { HOST: mqttHost, PORT: mqttPort } = config.NETWORK.MQTT;
  const backendHost = config.NETWORK.BACKEND.HOST;
  const backendPort = config.NETWORK.BACKEND.PORT;
  
  return `
// Auto-generated configuration from master-config.js
const char* ssid = "${wifi.ssid}";
const char* password = "${wifi.password}";
const char* serverBase = "http://${backendHost}:${backendPort}";
const char* mqtt_server = "${mqttHost}";
const int mqtt_port = ${mqttPort};
const int rIndex = ${readerIndex};
String readerID = "${reader ? reader.ID : 'REGISTER'}";
String portal = "${reader ? reader.PORTAL : 'portal1'}";
`.trim();
}

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  // Main configuration object
  config,
  
  // Environment info
  ENVIRONMENT,
  
  // Helper functions
  getBackendUrl,
  getFrontendUrl,
  getDatabaseUrl,
  getMqttUrl,
  getWifiConfig,
  getReaderConfig,
  getBackendEnv,
  getFrontendEnv,
  generateArduinoConfig,
  
  // For direct access
  NETWORK: config.NETWORK,
  HARDWARE: config.HARDWARE,
  SECURITY: config.SECURITY,
  APPLICATION: config.APPLICATION,
};