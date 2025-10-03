# RFID Tapping System

> **Production-ready RFID tracking system with real-time analytics, game mechanics, and IoT integration.**

A comprehensive solution for RFID-based event management, crowd tracking, and interactive gaming experiences. Built with modern technologies including Node.js, React, PostgreSQL, MQTT, and ESP8266 firmware.

## 📋 Table of Contents

- [🎯 Project Overview](#-project-overview)
- [🚀 Quick Start](#-quick-start)
- [📋 Prerequisites](#-prerequisites)
- [🔧 Installation Methods](#-installation-methods)
- [⚙️ Configuration Management](#️-configuration-management)
- [🏗️ Architecture Overview](#️-architecture-overview)
- [🔌 Hardware Setup](#-hardware-setup)
- [🔧 Development Guide](#-development-guide)
- [🚀 Deployment](#-deployment)
- [🛠️ API Reference](#️-api-reference)
- [🚨 Troubleshooting](#-troubleshooting)

---

## 🎯 Project Overview

This system enables real-time tracking of RFID card interactions across multiple reader locations (portals), providing:

- **Real-time Registration**: Instant RFID card registration and member assignment
- **Crowd Analytics**: Live occupancy tracking and venue state management
- **Game Mechanics**: Interactive gaming features with leaderboards and achievements
- **IoT Integration**: ESP8266-based RFID readers with MQTT communication
- **Admin Dashboard**: Web-based administration panel for monitoring and management
- **Kiosk Display**: Public displays showing live cluster occupancy and information

## 🏗️ Architecture Overview

```
┌───────────────────────────────┐         MQTT (rfid/<PORTAL>)           ┌──────────────────────────────┐
│  ESP8266 (ESP-01) + RDM6300   │──────────────────────────────────────▶│           MQTT Broker        │
│  ─ UART 9600 read             │                                        │        Mosquitto :1885       │
│  ─ Minimal JSON payload       │                                        │         Topics: rfid/#       │
│      {"reader","label","tag"} │                                        │       (ACL/TLS optional)     │
│  ─ LittleFS offline queue     │                                        └──────────────┬───────────────┘
│  ─ (optional) GET /reader-cfg │       HTTP (bootstrap cfg)                            │
└──────────────┬────────────────┘───────────────────────────────────────────────────────┘
               │
               │ MQTT SUB (rfid/#)                                                      Socket.IO (push)
               │                                               REST (JSON)             taps:append | occupancy:update
               ▼                                               (GET/POST)               analytics:update
┌──────────────────────────────┐            ┌───────────────────────────────────────────────┐           ┌────────────────────────────────┐
│     Reader Config API        │◀──────────│               Backend API (Node.js)           │──────────▶│      React Frontend (SPA)      │
│  /api/reader-config/:rIndex  │            │  Express REST + Socket.IO + MQTT consumer     │           │  Vite + React Query            │
└──────────────────────────────┘            │  Endpoints:                                   │           │  Pages:                        │
                                            │   • /api/analytics/summary                    │           │   • Live Analytics             │
                                            │   • /api/cluster-occupancy                    │           │   • Crowd Map                  │
                                            │   • /api/analytics/tap-velocity               │           │   • Public Crowd Display       │
                                            │   • /api/analytics/session-funnel             │           │   • Desk: Register / Exit      │
                                            │   • /api/analytics/live-feed                  │           │   • Quick Lookup               │
                                            │   • /api/desk/register, /api/desk/exit        │           │  IndexedDB offline queue (Desk)│
                                            │   • /api/cards/:tag/state                     │           └────────────────┬───────────────┘
                                            └────────────────────────┬──────────────────────┘                            │
                                                                     │                                                   │ REST (poll 5–15s)
                                                                     │ SQL                                               │  + Socket deltas
                                                                     ▼                                                   │
                                          ┌───────────────────────────────────────────────┐                              │
                                          │               PostgreSQL Database             │◀────────────────────────────┘
                                          │  Tables: logs, reader_config, venue_state,    │
                                          │          (members, registration, rfid_cards,  │
                                          │           team_scores_lite, visits_lite …)    │
                                          │  Indexes: log_time, portal, rfid_card_id      │
                                          └───────────────────────────────────────────────┘

```

### 📁 Project Structure

```
rfid_tapping_system/
├── 📁 config/                     # 🔧 Configuration Management
│   └── master-config.js           # Single source of truth for all settings
├── 📁 scripts/                    # 🛠️ Build & Maintenance Scripts  
│   ├── generate-configs.js        # Generates all config files
│   └── cleanup.ps1               # Project cleanup script
├── 📁 apps/                       # 🚀 Application Services
│   ├── 📁 backend/                # Node.js Express API Server
│   │   ├── src/
│   │   │   ├── app.js            # Express app configuration
│   │   │   ├── server.js         # Server startup & health checks
│   │   │   ├── config/           # Environment configuration
│   │   │   ├── db/               # Database connection & queries  
│   │   │   ├── routes/           # API route handlers
│   │   │   ├── services/         # Business logic services
│   │   │   ├── realtime/         # MQTT & real-time handlers
│   │   │   └── utils/            # Utility functions
│   │   ├── .env                  # Backend environment variables (auto-generated)
│   │   └── package.json          # Backend dependencies & scripts
│   └── 📁 frontend/               # React + Vite SPA
│       ├── src/
│       │   ├── components/       # Reusable UI components
│       │   ├── pages/            # Page-level components  
│       │   ├── layouts/          # Layout components
│       │   ├── ui/               # UI component library
│       │   ├── assets/           # Static assets
│       │   ├── api.js            # API client configuration
│       │   └── App.jsx           # Main application component
│       ├── public/               # Public static files
│       ├── data/                 # Static data files (schools, districts)
│       ├── .env                  # Frontend environment variables (auto-generated)
│       └── vite.config.js        # Vite build configuration
├── 📁 firmware/                   # 🔌 IoT Device Firmware
│   ├── esp01_rdm6300_mqtt/       # ESP8266 + RDM6300 RFID Reader
│   │   └── main.ino              # Main firmware file
│   └── config/                   # Auto-generated firmware configs
│       ├── reader-1-config.h     # Reader 1 configuration
│       ├── reader-2-config.h     # Reader 2 configuration  
│       └── config.h              # Main firmware config
├── 📁 infra/                      # 🏗️ Infrastructure & Services
│   ├── docker-compose.yml        # Full stack orchestration (auto-generated)
│   ├── .env                      # Infrastructure environment (auto-generated)
│   ├── db/
│   │   ├── schema.sql            # PostgreSQL database schema
│   │   └── seed.sql              # Initial data seeding
│   └── mosquitto/
│       └── mosquitto.conf        # MQTT broker configuration
├── 📁 deployment/                 # 🚀 Deployment Configurations  
│   ├── vercel.json               # Vercel deployment config (auto-generated)
│   └── railway.json              # Railway deployment config (auto-generated)
├── package.json                  # 📦 Root project configuration & scripts
└── README.md                     # 📖 Complete project documentation & guide
```

### 🔄 Auto-Generated Files

The following files are **automatically generated** by the configuration system:

**Environment Files:**
- `apps/backend/.env` - Backend environment variables
- `apps/frontend/.env` - Frontend environment variables
- `infra/.env` - Infrastructure environment variables

**Configuration Files:**
- `infra/docker-compose.yml` - Docker services configuration
- `firmware/config/*.h` - ESP8266 firmware configurations
- `apps/frontend/src/config.js` - Frontend build-time config
- `apps/backend/src/config/env.js` - Backend config module

**Deployment Files:**
- `deployment/vercel.json` - Vercel platform deployment
- `deployment/railway.json` - Railway platform deployment

⚠️ **Important**: Don't edit auto-generated files directly. Instead, modify `config/master-config.js` and run `npm run config:dev` to regenerate all files.

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd rfid_tapping_system
```

### 2. Choose Installation Method

- **[Method A: Full Docker Setup](#method-a-full-docker-setup)** (Recommended - Easiest)
- **[Method B: Hybrid Setup](#method-b-hybrid-setup)** (Docker for services, local for development)
- **[Method C: Full Local Setup](#method-c-full-local-setup-no-docker)** (No Docker required)

---

## 📋 Prerequisites

### Required for All Methods

- **Node.js 18+** and **npm**
- **Git** for version control
- **Arduino IDE** (for ESP8266 firmware flashing)

### Additional Requirements by Method

| Method         | Docker        | PostgreSQL    | MQTT Broker   |
| -------------- | ------------- | ------------- | ------------- |
| A: Full Docker | ✅ Required   | ❌ (Included) | ❌ (Included) |
| B: Hybrid      | ✅ Required   | ❌ (Included) | ❌ (Included) |
| C: Local Only  | ❌ Not needed | ✅ Required   | ✅ Required   |

---

## 🔧 Installation Methods

## Method A: Full Docker Setup

*Recommended for beginners and quick prototyping*

### 1. Initialize Configuration

```bash
# Generate all configuration files
npm run config:dev
```

### 2. Start All Services

```bash
cd infra
docker compose up -d
```

### 3. Verify Installation

```bash
# Check service status
docker compose ps

# Test API health
curl http://localhost:4000/health

# View logs
docker compose logs -f backend
```

### 4. Access Applications

- **Backend API**: http://localhost:4000
- **Frontend**: http://localhost:5173
- **Admin Panel**: http://localhost:5173/admin
- **Database**: localhost:5432 (postgres/password)
- **MQTT**: localhost:1885

---

## Method B: Hybrid Setup

*Best for development - Docker for services, local for apps*

### 1. Initialize Configuration

```bash
npm run config:dev
```

### 2. Start Infrastructure Services Only

```bash
cd infra
docker compose up -d postgres mosquitto
```

### 3. Start Backend Locally

```bash
cd apps/backend
npm install
npm run dev
```

### 4. Start Frontend Locally (New Terminal)

```bash
cd apps/frontend
npm install
npm run dev
```

### 5. Verify Installation

```bash
# Backend health check
curl http://localhost:4000/health

# Frontend should open automatically at http://localhost:5173
```

---

## Method C: Full Local Setup (No Docker)

*For environments where Docker isn't available*

### 1. Install Prerequisites

**Windows:**

```powershell
# Install PostgreSQL
winget install PostgreSQL.PostgreSQL

# Install MQTT Broker (Mosquitto)
winget install EclipseMosquitto.Mosquitto

# Or download from:
# PostgreSQL: https://www.postgresql.org/download/windows/
# Mosquitto: https://mosquitto.org/download/
```

**macOS:**

```bash
# Using Homebrew
brew install postgresql mosquitto
brew services start postgresql
brew services start mosquitto
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib mosquitto mosquitto-clients
sudo systemctl start postgresql
sudo systemctl start mosquitto
```

### 2. Setup Database

**Create Database:**

```bash
# Login as postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE rfid;
CREATE USER rfiduser WITH PASSWORD 'rfidpass';
GRANT ALL PRIVILEGES ON DATABASE rfid TO rfiduser;
\q
```

**Import Schema:**

```bash
# Import database schema
psql -U rfiduser -d rfid -f infra/db/schema.sql
```

### 3. Configure Environment

**Initialize Configuration System:**

```bash
# Generate configuration files for local setup
npm run config:dev
```

**Manual Configuration (if needed):**

Create `apps/backend/.env`:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://rfiduser:rfidpass@localhost:5432/rfid
MQTT_URL=mqtt://localhost:1883
PG_SSL=false
GAMELITE_ADMIN_KEY=dev-admin-key-2024
JWT_SECRET=your-jwt-secret-key-here
CORS_ORIGIN=http://localhost:5173
```

Create `apps/frontend/.env`:

```env
VITE_API_BASE=http://localhost:4000
VITE_BACKEND_HOST=localhost
VITE_BACKEND_PORT=4000
VITE_WS_URL=ws://localhost:4000
VITE_GAMELITE_KEY=dev-admin-key-2024
```

### 4. Start Applications

**Terminal 1 - Backend:**

```bash
cd apps/backend
npm install
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd apps/frontend  
npm install
npm run dev
```

### 5. Verify Local Installation

**Check Services:**

```bash
# Test PostgreSQL connection
psql -U rfiduser -d rfid -c "SELECT version();"

# Test MQTT broker
mosquitto_pub -h localhost -t test/topic -m "Hello MQTT"
mosquitto_sub -h localhost -t test/topic

# Test backend API
curl http://localhost:4000/health

# Frontend should be accessible at http://localhost:5173
```

---

## ⚙️ Configuration Management

This project uses a **centralized configuration system** that generates all necessary config files from a single source.

### 🎯 Single File Control

**Everything is controlled from**: `config/master-config.js`

To change ANY setting in the entire system:
1. Edit `config/master-config.js` 
2. Run `npm run config:dev`
3. Restart your services

### 🚀 Quick Commands

```bash
# Generate configs for development
npm run config:dev

# Generate configs for staging  
npm run config:staging

# Generate configs for production
npm run config:prod

# Validate configuration
npm run validate

# Start entire system (Docker) with fresh config
npm run start:full

# Start local development with fresh config
npm run start:local
```

### 📡 Network Configuration

All network settings are in the `NETWORK` section of `master-config.js`:

```javascript
const NETWORK = {
  BACKEND: {
    HOST: '10.30.6.239',     // Change this IP
    PORT: 4000,              // Change this port
    PROTOCOL: 'http',        // http or https
  },
  DATABASE: {
    HOST: 'localhost',       // Database server IP
    PORT: 5432,              // PostgreSQL port
    PASSWORD: 'password',    // Database password
    // ... more settings
  },
  MQTT: {
    HOST: '10.30.9.163',     // MQTT broker IP
    PORT: 1885,              // MQTT port
    // ... more settings
  }
}
```

### 📶 WiFi & Hardware Settings

All hardware settings are in the `HARDWARE` section:

```javascript
const HARDWARE = {
  WIFI: {
    SSID: 'WiFi-SSID',         // WiFi network name
    PASSWORD: 'WiFI-Password',  // WiFi password
    TIMEOUT_MS: 20000,       // Connection timeout
  },
  READERS: [
    {
      INDEX: 1,              // Physical reader number
      ID: 'REGISTER',        // Reader type
      PORTAL: 'portal1',     // Location name
    },
    // Add more readers here
  ]
}
```

### Environment-Specific Configuration

The system supports multiple environments with automatic overrides:

**Development** (default):
- Local database and MQTT broker
- Debug logging enabled
- CORS allows localhost origins
- Insecure secrets (for testing)

**Staging**:
- Remote services with SSL
- Reduced logging
- Staging-specific endpoints
- Intermediate security

**Production**:
- Fully secured configuration
- External managed services
- Minimal logging
- Production secrets from environment variables

### 🔧 How to Change Settings

#### Example 1: Change Database Password

1. Edit `config/master-config.js`:
   ```javascript
   DATABASE: {
     PASSWORD: 'your-new-password',  // Change this
   }
   ```

2. Regenerate configs:
   ```bash
   npm run config:dev
   ```

3. Restart backend:
   ```bash
   cd apps/backend && npm run dev
   ```

#### Example 2: Change WiFi Credentials

1. Edit `config/master-config.js`:
   ```javascript
   WIFI: {
     SSID: 'Your-Network-Name',     // Change this
     PASSWORD: 'your-wifi-password', // Change this
   }
   ```

2. Generate firmware config:
   ```bash
   npm run config:dev
   ```

3. Copy new config to Arduino:
   - Open `firmware/esp01_rdm6300_mqtt/config.h`
   - Copy the generated WiFi settings into your `.ino` file
   - Flash to ESP8266

#### Example 3: Add New RFID Reader

1. Edit `config/master-config.js`:
   ```javascript
   READERS: [
     // Existing readers...
     {
       INDEX: 3,              // New reader index
       ID: 'EXITOUT',         // Reader function
       PORTAL: 'portal3',     // Location
       DESCRIPTION: 'Exit Gate',
     }
   ]
   ```

2. Regenerate configs:
   ```bash
   npm run config:dev
   ```

3. New file created: `firmware/config/reader-3-config.h`

---

## 🔌 Hardware Setup

### ESP8266 + RDM6300 RFID Reader Setup

### 1. Hardware Requirements

**Core Components:**
- **ESP8266 Development Board** (NodeMCU v3, Wemos D1 Mini, or similar)
- **RDM6300 125kHz RFID Reader Module**
- **125kHz RFID Cards/Tags** (EM4100 compatible)
- **Jumper Wires** (Male-to-Female)
- **Breadboard** (optional, for prototyping)
- **USB Cable** (for programming ESP8266)

**Optional Components:**
- **LED** + **220Ω Resistor** (for status indication)
- **Buzzer** (for audio feedback)
- **Enclosure** (for protection)

### 2. Wiring Diagram

```
ESP8266 (NodeMCU)     RDM6300 RFID Reader
┌─────────────────┐   ┌──────────────────┐
│              3V3│───│VCC               │
│              GND│───│GND               │
│        D4(GPIO2)│───│TX (Data Out)     │
└─────────────────┘   └──────────────────┘

Optional Status LED:
ESP8266 GPIO2 ──[220Ω]── LED+ ── LED- ── GND
```

### 3. Arduino IDE Setup

**Install Board Package:**
1. Open Arduino IDE
2. Go to **File → Preferences**
3. Add board manager URL: `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
4. Go to **Tools → Board → Boards Manager**
5. Search for "ESP8266" and install

**Install Required Libraries:**
```arduino
// In Arduino IDE: Sketch → Include Library → Manage Libraries
// Search and install:
- WiFi (built-in)
- PubSubClient (by Nick O'Leary)
- SoftwareSerial (built-in)
```

### 4. Firmware Configuration

**Generate Config Files:**
```bash
npm run config:dev
```

**Use Generated Configuration:**
```cpp
// Copy settings from: firmware/esp01_rdm6300_mqtt/config.h
// Into your main .ino file

#define WIFI_SSID "WiFi-SSID"
#define WIFI_PASSWORD "WiFi-Password"
#define MQTT_SERVER "localhost"
#define MQTT_PORT 1883
#define READER_ID "REGISTER"
#define PORTAL_NAME "portal1"
```

### 5. Upload Firmware

1. Connect ESP8266 to computer via USB
2. Select correct board: **Tools → Board → ESP8266 Boards → NodeMCU 1.0**
3. Select correct port: **Tools → Port → COMx (or /dev/ttyUSBx)**
4. Open `firmware/esp01_rdm6300_mqtt/main.ino`
5. Click **Upload** button

### 6. Testing Hardware

**Monitor Serial Output:**
```bash
# In Arduino IDE: Tools → Serial Monitor (115200 baud)
# Expected output:
Connecting to WiFi...
WiFi connected! IP: 192.168.1.100
Connecting to MQTT...
MQTT Connected!
Ready for RFID scanning...
```

**Test RFID Reading:**
```bash
# Place RFID card near reader
# Serial monitor should show:
RFID Card detected: 1234567890
Publishing to MQTT: rfid/portal1/tap
```

---

## 🔧 Development Guide

### Project Commands

```bash
# Configuration Management
npm run config:dev          # Generate dev environment configs
npm run config:staging      # Generate staging configs  
npm run config:prod         # Generate production configs
npm run validate            # Validate configuration

# Development
npm run start:local         # Start backend + frontend locally
npm run start:full          # Start full Docker stack
npm run dev:backend         # Backend development mode
npm run dev:frontend        # Frontend development mode

# Database
npm run db:schema          # Apply database schema
npm run db:seed            # Seed initial data
npm run db:reset           # Reset database completely

# Testing
npm run test               # Run all tests
npm run test:backend       # Backend tests only
npm run test:frontend      # Frontend tests only

# Cleanup
npm run clean              # Clean generated files
npm run clean:all          # Deep clean (node_modules, etc.)
```

### Backend Development

**File Structure:**
```
apps/backend/src/
├── app.js              # Express app setup
├── server.js           # Server startup
├── routes/             # API endpoints
│   ├── tags.js         # RFID tag management
│   ├── gameLite.js     # Game mechanics
│   └── admin.js        # Admin operations
├── services/           # Business logic
├── db/                 # Database layer
├── realtime/           # MQTT handlers
└── utils/              # Helper functions
```

**Key API Endpoints:**
```javascript
// Health check
GET /health

// Game mechanics
GET /api/game-lite/config
GET /api/game-lite/eligible-teams
GET /api/game-lite/leaderboard

// RFID operations
POST /api/tags/register
GET /api/tags/status/:cardId
POST /api/tags/assign

// Admin operations  
GET /api/admin/dashboard
POST /api/admin/reset-game
```

### Frontend Development

**File Structure:**
```
apps/frontend/src/
├── App.jsx             # Main application
├── components/         # Reusable components
├── pages/              # Route components
│   ├── AdminPanel.jsx
│   ├── RegistrationForm.jsx
│   └── GameDashboard.jsx
├── api.js              # API client
└── config.js           # Build-time config
```

**Environment Variables:**
```env
VITE_API_BASE=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
VITE_GAMELITE_KEY=dev-admin-key-2024
```

---

## 🚀 Deployment

### Environment Preparation

**Staging:**
```bash
npm run config:staging
```

**Production:**
```bash
npm run config:prod
```

### Docker Deployment

**Single Command Deploy:**
```bash
cd infra
docker compose up -d --build
```

**Production Docker:**
```bash
# Use production configs
npm run config:prod

# Deploy with production settings
cd infra
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Cloud Platforms

**Vercel (Frontend):**
```bash
# Vercel config auto-generated in deployment/vercel.json
npm run config:prod
vercel --prod
```

**Railway (Full Stack):**
```bash
# Railway config auto-generated in deployment/railway.json  
npm run config:prod
railway deploy
```

**Manual VPS:**
```bash
# Copy project to server
scp -r . user@server:/path/to/app

# On server
npm run config:prod
cd infra && docker compose up -d

# Setup reverse proxy (nginx)
# SSL certificates (certbot)
```

---

## 🛠️ API Reference

### Authentication

Most endpoints require API key authentication:

```bash
# Include in headers
X-Admin-Key: your-admin-key-here
```

### Game Lite API

**Get Configuration:**
```http
GET /api/game-lite/config

Response:
{
  "enabled": true,
  "rules": {
    "eligibleLabelPrefix": "CLUSTER",
    "pointsPerMemberFirstVisit": 1,
    "pointsPerMemberRepeatVisit": 0,
    "minGroupSize": 2,
    "maxGroupSize": 10,
    "minPointsRequired": 3
  }
}
```

**Get Eligible Teams:**
```http
GET /api/game-lite/eligible-teams

Response:
[
  {
    "registration_id": 1,
    "group_size": 4,
    "score": 15,
    "latest_label": "CLUSTER2",
    "latest_time": "2025-10-01T10:30:00Z"
  }
]
```

**Get Leaderboard:**
```http
GET /api/game-lite/leaderboard?limit=10

Response:
[
  {"registration_id": 5, "score": 25},
  {"registration_id": 3, "score": 20},
  {"registration_id": 1, "score": 15}
]
```

### RFID Tag Management

**Register New Tag:**
```http
POST /api/tags/register
Content-Type: application/json

{
  "cardId": "1234567890",
  "memberName": "John Doe",
  "registrationId": 1
}
```

**Get Tag Status:**
```http
GET /api/tags/status/1234567890

Response:
{
  "cardId": "1234567890",
  "isRegistered": true,
  "memberName": "John Doe",
  "lastSeen": "2025-10-01T10:30:00Z",
  "location": "portal1"
}
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. Backend Won't Start

**Problem:** `Error: Cannot find module`
```bash
# Solution: Install dependencies
cd apps/backend
npm install
```

**Problem:** `Database connection failed`
```bash
# Check database is running
docker compose ps postgres

# Check connection details in .env
cat apps/backend/.env | grep DATABASE
```

#### 2. Frontend Build Errors

**Problem:** `Failed to resolve import`
```bash
# Solution: Reinstall dependencies
cd apps/frontend
rm -rf node_modules package-lock.json
npm install
```

**Problem:** `API calls fail with CORS error`
```bash
# Check backend CORS settings
grep CORS_ORIGIN apps/backend/.env

# Regenerate configs
npm run config:dev
```

#### 3. MQTT Connection Issues

**Problem:** ESP8266 can't connect to MQTT
```bash
# Check MQTT broker is running
docker compose logs mosquitto

# Test MQTT manually
mosquitto_pub -h localhost -t test -m "hello"
mosquitto_sub -h localhost -t test
```

**Problem:** Wrong MQTT credentials
```bash
# Regenerate firmware config
npm run config:dev

# Check generated config
cat firmware/esp01_rdm6300_mqtt/config.h
```

#### 4. Database Schema Issues

**Problem:** `relation does not exist`
```bash
# Apply schema
psql -U postgres -d rfid -f infra/db/schema.sql
```

**Problem:** `column does not exist`
```bash
# Check table structure
psql -U postgres -d rfid -c "\d table_name"

# Reset database completely
npm run db:reset
```

#### 5. Configuration Problems

**Problem:** Services use old configuration
```bash
# Regenerate all configs
npm run config:dev

# Restart all services
docker compose down && docker compose up -d
```

**Problem:** Config generation fails
```bash
# Check master config syntax
node -c config/master-config.js

# Check file permissions
ls -la config/master-config.js
```

### Port Usage Reference

| Service       | Port | Protocol | Description          |
| ------------- | ---- | -------- | -------------------- |
| Backend API   | 4000 | HTTP     | REST API server      |
| Frontend      | 5173 | HTTP     | Vite dev server      |
| PostgreSQL    | 5432 | TCP      | Database server      |
| MQTT Broker   | 1883 | TCP      | IoT communication    |
| MQTT WebSocket| 9001 | WS       | Browser MQTT access  |

### Log Locations

```bash
# Application logs
tail -f apps/backend/logs/rfid-system.log

# Docker logs
docker compose logs -f backend
docker compose logs -f frontend  
docker compose logs -f postgres
docker compose logs -f mosquitto

# System logs (Linux)
journalctl -u docker
journalctl -f
```

### Performance Monitoring

```bash
# Check system resources
docker stats

# Database performance
psql -U postgres -d rfid -c "SELECT * FROM pg_stat_activity;"

# MQTT message throughput  
mosquitto_sub -v -t 'rfid/#' | ts '%Y-%m-%d %H:%M:%.S'
```

### 🔍 Viewing Current Configuration

Check what's currently configured:

```bash
# View complete configuration (auto-generated from master-config.js)
npm run config:dev

# Check generated backend config
cat apps/backend/.env

# Check generated frontend config  
cat apps/frontend/.env

# Check Arduino configuration
cat firmware/esp01_rdm6300_mqtt/config.h
```

### 🚨 Important Security Notes

#### ⚠️ Security
- The `config/master-config.js` contains passwords and keys
- Add it to `.gitignore` for production
- Use environment variables for production secrets

#### 🔄 Backup
- Generated files are automatically backed up (`.backup.timestamp`)
- Original files are preserved before overwriting

#### 🔧 Validation
```bash
# Verify configuration syntax
npm run validate
```

### ✅ Benefits of Centralized Configuration

✅ **Single Source of Truth**: All configuration in one file  
✅ **Environment Management**: Easy dev/staging/production switching  
✅ **Automatic Generation**: No manual editing of multiple files  
✅ **Consistent Settings**: Same values across all components  
✅ **Easy Hardware Updates**: WiFi and MQTT settings propagate automatically  
✅ **Documentation**: Auto-generated reference docs  
✅ **Backup Safety**: Original files are preserved  

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---
