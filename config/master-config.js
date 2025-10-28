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
    HOST: 'localhost',           // Backend server IP
    PORT: 4000,                    // Backend server port
    PROTOCOL: 'http',              // http or https
  },

  // Frontend Configuration  
  FRONTEND: {
    HOST: 'localhost',             // Frontend host for development
    PORT: 5173,                    // Frontend port (Vite default)
    PROTOCOL: 'http',              // http or https
  },

  // Database Configuration
  DATABASE: {
    HOST: 'localhost',             // Database server IP
    PORT: 5432,                    // PostgreSQL port
    NAME: 'rfid',                  // Database name
    USERNAME: 'postgres',          // Database username
    PASSWORD: 'Gana11602',          // Database password
    SSL: false,                    // Enable SSL connection
    MAX_CONNECTIONS: 20,           // Connection pool size
  },

  // MQTT Broker Configuration
  MQTT: {
    HOST: 'localhost',          // MQTT broker IP
    PORT: 1883,                    // MQTT broker port
    PROTOCOL: 'mqtt',              // mqtt or mqtts
    CLIENT_ID_PREFIX: 'rfid-system', // Client ID prefix
    USERNAME: null,                // MQTT username (null for no auth)
    PASSWORD: null,                // MQTT password (null for no auth)
    TOPICS: {
      RFID_BASE: 'rfid',          // Base topic for RFID events
      HEALTH: 'health',            // Health check topic
      CONFIG: 'config',            // Configuration topic
    }
  }
};

// =============================================================================
// WIFI & HARDWARE CONFIGURATION
// =============================================================================
const HARDWARE = {
  // WiFi Network Settings (for ESP8266 devices)
  WIFI: {
    SSID: 'UoP_Dev',              // WiFi network name
    PASSWORD: 's6RBwfAB7H',       // WiFi password
    TIMEOUT_MS: 20000,            // Connection timeout
    RETRY_ATTEMPTS: 3,            // Number of retry attempts
  },

  // RFID Reader Configuration
  READERS: [
    {
      INDEX: 1,                   // Physical reader index
      ID: 'REGISTER',             // Reader identifier
      PORTAL: 'portal1',          // Portal/location name
      DESCRIPTION: 'Registration Portal',
      MAC_ADDRESS: null,          // Optional: specific device MAC
    },
    {
      INDEX: 2,
      ID: 'ENTEROUT', 
      PORTAL: 'portal2',
      DESCRIPTION: 'Entry/Exit Portal',
      MAC_ADDRESS: null,
    },
    {
      INDEX: 8,
      ID: 'REGISTER',
      PORTAL: 'portal1', 
      DESCRIPTION: 'Main Registration',
      MAC_ADDRESS: null,
    }
  ],

  // ESP8266 Hardware Settings
  ESP8266: {
    LED_PIN: 2,                   // LED pin number
    BAUD_RATE: 9600,             // Serial communication speed
    FLASH_SIZE: '1M',            // Flash memory size
    FILESYSTEM: 'LittleFS',       // Filesystem type
  }
};

// =============================================================================
// SECURITY & AUTHENTICATION
// =============================================================================
const SECURITY = {
  // API Keys and Secrets
  GAME_LITE_ADMIN_KEY: 'dev-admin-key-2024',
  JWT_SECRET: 'your-jwt-secret-key-here',
  API_RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000,   // 15 minutes
    MAX_REQUESTS: 100,            // Max requests per window
  },

  // CORS Configuration
  CORS: {
    ORIGINS: [
      'http://localhost:5173',     // Vite dev server
      'http://localhost:3000',     // Alternative dev port
      'http://10.30.6.239:5173',  // Network dev server
      'https://your-production-domain.com'
    ],
    CREDENTIALS: true,
    METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  },

  // Session Configuration
  SESSION: {
    SECRET: 'session-secret-key',
    EXPIRES_IN: '24h',
    SECURE: false,                // Set to true in production with HTTPS
  }
};

// =============================================================================
// APPLICATION CONFIGURATION
// =============================================================================
const APPLICATION = {
  // Logging Configuration
  LOGGING: {
    LEVEL: ENVIRONMENT === 'production' ? 'info' : 'debug',
    FILE_PATH: './logs/rfid-system.log',
    MAX_FILE_SIZE: '10m',
    MAX_FILES: 5,
  },

  // Cache Configuration
  CACHE: {
    TTL: 300,                     // Time to live in seconds
    MAX_KEYS: 1000,              // Maximum number of cached keys
  },

  // File Upload Configuration
  UPLOADS: {
    MAX_FILE_SIZE: '5mb',        // Maximum file size
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
    UPLOAD_PATH: './uploads',
  },

  // Game Configuration
  GAME: {
    MAX_PLAYERS_PER_TEAM: 6,
    GAME_DURATION_MINUTES: 30,
    LEADERBOARD_REFRESH_INTERVAL: 5000, // milliseconds
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
        PASSWORD: 'Gana11602',
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