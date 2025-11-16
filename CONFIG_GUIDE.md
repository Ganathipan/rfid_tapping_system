# RFID Tapping System - Configuration Guide

## Overview

This project uses a **centralized configuration system** where all parameters can be changed in **ONE PLACE**. This makes it easy for anyone to customize the system without digging through multiple files.

## Configuration Files

### 1. **Primary Configuration File** (Recommended)
- **Location:** `.env` (in the root directory)
- **Purpose:** Store all environment-specific variables
- **How to use:** Copy `.env.example` to `.env` and modify values as needed

### 2. **Master Configuration** (Internal)
- **Location:** `config/master-config.js`
- **Purpose:** Centralized configuration management that reads from environment variables
- **Used by:** Backend, Frontend, Docker, and Arduino/ESP8266 firmware generation
- **Note:** Don't edit this directly - use `.env` instead

### 3. **Environment Example**
- **Location:** `.env.example`
- **Purpose:** Template showing all available configuration options
- **How to use:** Reference for available configuration parameters

## Quick Start - Changing Parameters

### Example: Change PostgreSQL Password

1. **Open `.env` file** (create from `.env.example` if it doesn't exist):
   ```bash
   cp .env.example .env
   ```

2. **Find the password setting:**
   ```bash
   DB_PASSWORD=New1
   ```

3. **Change it to your secure password:**
   ```bash
   DB_PASSWORD=YourNewSecurePassword123
   ```

4. **Done!** The system will now use your new password in:
   - PostgreSQL container
   - Backend database connections
   - Connection string generation
   - Docker Compose services

### Example: Change Network IP Address

1. **Open `.env` file**
2. **Find the network setting:**
   ```bash
   NETWORK_IP=192.168.8.2
   ```
3. **Change it to your network:**
   ```bash
   NETWORK_IP=10.0.0.100
   ```

## Available Configuration Categories

### Network Configuration

```bash
# Backend API
BACKEND_HOST=192.168.8.2
BACKEND_PORT=4000
BACKEND_PROTOCOL=http

# Frontend
FRONTEND_HOST=192.168.8.2
FRONTEND_PORT=5173
FRONTEND_PROTOCOL=http

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rfid
DB_USER=postgres
DB_PASSWORD=New1                    # <-- Change this!
DB_SSL=false
DB_MAX_CONNECTIONS=20

# MQTT Broker
MQTT_HOST=192.168.8.2
MQTT_PORT=1883
MQTT_PROTOCOL=mqtt
MQTT_USERNAME=
MQTT_PASSWORD=
```

### Security Configuration

```bash
# API Keys & Secrets
GAMELITE_ADMIN_KEY=dev-admin-key-2024
JWT_SECRET=your-jwt-secret-key-here
SESSION_SECRET=session-secret-key
SESSION_EXPIRES_IN=24h
SESSION_SECURE=false

# CORS (Cross-Origin Resource Sharing)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
```

### WiFi & Hardware Configuration

```bash
# WiFi (for ESP8266 devices)
WIFI_SSID=UoP_Dev
WIFI_PASSWORD=s6RBwfAB7H
WIFI_TIMEOUT_MS=20000
WIFI_RETRY_ATTEMPTS=3

# RFID Reader Configuration
READER_1_ID=REGISTER
READER_1_PORTAL=portal1
READER_1_DESC=Registration Portal

READER_2_ID=EXITOUT
READER_2_PORTAL=exitout
READER_2_DESC=Entry/Exit Portal

READER_8_ID=CLUSTER1
READER_8_PORTAL=reader1
READER_8_DESC=Main Registration

# ESP8266 Hardware
ESP_LED_PIN=2
ESP_BAUD_RATE=9600
ESP_FLASH_SIZE=1M
ESP_FILESYSTEM=LittleFS
```

### Application Configuration

```bash
# Logging
LOG_LEVEL=debug                     # debug, info, warn, error
LOG_FILE_PATH=./logs/rfid-system.log
LOG_MAX_FILE_SIZE=10m
LOG_MAX_FILES=5

# Caching
CACHE_TTL=300
CACHE_MAX_KEYS=1000

# File Upload
MAX_FILE_SIZE=5mb
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf
UPLOAD_PATH=./uploads

# Game Settings
MAX_PLAYERS_PER_TEAM=6
GAME_DURATION_MINUTES=30
LEADERBOARD_REFRESH_MS=5000
```

## How It Works - Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    .env File                             │
│         (Your configuration - DO NOT commit)             │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│            Environment Variables                         │
│         (process.env.DB_PASSWORD, etc.)                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│        config/master-config.js                          │
│  (Central config hub - reads from env vars)             │
│  Exports: getDatabaseUrl(), getMqttUrl(), etc.          │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   Backend          Frontend         Docker Compose
 src/db/pool.js   environment     infra/docker-compose.yml
 src/server.js    variables       Builds and runs services
```

## Where Each Component Uses Configuration

### Backend
- **Database:** `src/db/pool.js` - Uses `getDatabaseUrl()` from master-config
- **MQTT:** `src/realtime/mqttHandler.js` - Uses `getMqttUrl()` from master-config
- **API Server:** `src/server.js` - Uses `config.NETWORK.BACKEND.PORT`

### Frontend
- **API Connection:** `src/api.js` - Uses `VITE_API_BASE` environment variable
- **WebSocket:** Automatically derived from API base URL

### Docker
- **PostgreSQL:** Uses `DB_PASSWORD`, `DB_USER`, `DB_NAME` from `.env`
- **Backend Service:** Passes all `DB_*`, `MQTT_*`, and security env vars
- **Frontend Build:** Uses `VITE_API_BASE` to connect to backend

### Arduino/ESP8266
- **WiFi:** Uses `WIFI_SSID` and `WIFI_PASSWORD`
- **MQTT Broker:** Uses `MQTT_HOST` and `MQTT_PORT`
- **Backend API:** Uses `BACKEND_HOST` and `BACKEND_PORT`

## Environment Modes

### Development
```bash
NODE_ENV=development
DB_PASSWORD=New1
BACKEND_PROTOCOL=http
SESSION_SECURE=false
LOG_LEVEL=debug
```

### Staging
```bash
NODE_ENV=staging
DB_PASSWORD=SecurePassword123
BACKEND_PROTOCOL=https
DB_SSL=true
SESSION_SECURE=true
LOG_LEVEL=info
```

### Production
```bash
NODE_ENV=production
DB_PASSWORD=VerySecurePassword!@#$%
BACKEND_PROTOCOL=https
DB_SSL=true
SESSION_SECURE=true
LOG_LEVEL=warn
```

## Running the System

### With Docker Compose (Using .env)
```bash
cd infra
docker-compose up -d
```
✅ All services automatically use values from `.env`

### Local Development
```bash
# Backend
cd apps/backend
npm install
npm start              # Uses .env in root directory

# Frontend (in another terminal)
cd apps/frontend
npm install
npm run dev            # Uses .env in root directory
```

### With Custom Environment Variables
```bash
# Temporarily override specific variables
DB_PASSWORD=custom npm start

# Or set them in a terminal session
export DB_PASSWORD=custom
npm start
```

## Troubleshooting

### "Authentication failed: verify DB_PASSWORD"

1. **Check if `.env` file exists:**
   ```bash
   ls -la .env
   ```

2. **Verify password in `.env` matches Docker password:**
   ```bash
   grep DB_PASSWORD .env
   ```

3. **Verify PostgreSQL container is using same password:**
   ```bash
   docker logs <postgres-container-id>
   ```

### "Cannot connect to MQTT"

1. **Check MQTT_HOST is correct:**
   ```bash
   grep MQTT_HOST .env
   ```

2. **Check MQTT_PORT is accessible:**
   ```bash
   telnet 192.168.8.2 1883
   ```

### "Backend not accessible from Frontend"

1. **Verify BACKEND_HOST is correct:**
   ```bash
   grep BACKEND_HOST .env
   ```

2. **Check Backend is running on correct port:**
   ```bash
   grep BACKEND_PORT .env
   ```

3. **Verify network/firewall allows connection**

## Best Practices

### ✅ DO
- ✅ Copy `.env.example` to `.env` to get started
- ✅ Modify `.env` for your environment
- ✅ Use `.env.example` as documentation
- ✅ Keep `.env` in `.gitignore`
- ✅ Use strong passwords for production
- ✅ Set `SESSION_SECURE=true` in production with HTTPS
- ✅ Use environment-specific values for staging/production

### ❌ DON'T
- ❌ Commit `.env` file to git (use `.env.example` instead)
- ❌ Hardcode passwords in source files
- ❌ Edit `master-config.js` for temporary changes (use `.env` instead)
- ❌ Use default passwords in production
- ❌ Enable `LOG_LEVEL=debug` in production

## Adding New Configuration Parameters

### Step 1: Update `.env.example`
Add the new parameter with comments explaining its purpose

### Step 2: Update `config/master-config.js`
Add the new parameter to the appropriate section, using environment variables:
```javascript
const NEW_PARAM = process.env.NEW_PARAM || 'default-value';
```

### Step 3: Export the parameter
Add to the exports at the bottom of `master-config.js`

### Step 4: Use in your code
```javascript
const { NEW_PARAM } = require('../../config/master-config.js');
```

## Example: Adding a New Database Parameter

1. **Add to `.env.example`:**
   ```bash
   DB_POOL_IDLE_TIMEOUT=30000
   ```

2. **Add to `config/master-config.js`:**
   ```javascript
   DATABASE: {
     // ... existing params
     POOL_IDLE_TIMEOUT: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
   }
   ```

3. **Use in `src/db/pool.js`:**
   ```javascript
   const pool = new Pool({
     connectionString: resolvedConnectionString,
     idleTimeoutMillis: config.NETWORK.DATABASE.POOL_IDLE_TIMEOUT,
   });
   ```

## Support & Questions

For issues with configuration:
1. Check `.env` vs `.env.example` for required parameters
2. Review logs for specific error messages
3. Verify all required environment variables are set
4. Check `CONFIG_GUIDE.md` (this file) for your scenario

---

**Last Updated:** November 2025
**Version:** 1.0
