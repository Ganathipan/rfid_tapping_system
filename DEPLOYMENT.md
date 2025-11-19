# RFID Tapping System - Deployment Guide

Complete guide for deploying the RFID Tapping System on any PC, from fresh installation to production deployment.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [First-Time Setup on New PC](#first-time-setup-on-new-pc)
4. [Configuration](#configuration)
5. [Command-Line Parameters](#command-line-parameters)
6. [Usage Examples](#usage-examples)
7. [Expected File Structure](#expected-file-structure)
8. [Troubleshooting](#troubleshooting)
9. [Automatic Cleanup](#automatic-cleanup)

---

## 📋 Prerequisites

Before running the deployment script, ensure you have installed:

### 1. **PostgreSQL 14+**
- **Download**: https://www.postgresql.org/download/windows/
- During installation, remember your postgres user password
- Ensure PostgreSQL is added to PATH
- **Verify**: Open PowerShell and run:
  ```powershell
  psql --version
  ```
- If not in PATH, add manually:
  ```powershell
  $env:Path += ";C:\Program Files\PostgreSQL\16\bin"  # Adjust version
  ```

### 2. **Node.js 18+ and npm**
- **Download**: https://nodejs.org/ (LTS version recommended)
- **Verify**:
  ```powershell
  node --version
  npm --version
  ```

### 3. **Git** (if cloning from repository)
- **Download**: https://git-scm.com/download/win
- **Verify**:
  ```powershell
  git --version
  ```

### 4. **Mosquitto MQTT Broker** (Optional but recommended)
- **Download**: https://mosquitto.org/download/
- Install to `C:\Program Files\mosquitto\` or `C:\mosquitto\`
- **Verify**: Check if `mosquitto.exe` exists in installation folder
- Alternative: Skip MQTT with `-NoMqtt` flag

---

## 🚀 Quick Start

### For First-Time Users (Recommended)

Simply run the deployment script with your database password:

```powershell
.\deploy-local.ps1 -PgPassword "YourPostgresPassword"
```

**That's it!** The script will automatically:
- ✅ Verify all prerequisites (PostgreSQL, Node.js, npm)
- ✅ Install all npm dependencies (root, backend, frontend)
- ✅ Generate all configuration files (.env files)
- ✅ Create and initialize the PostgreSQL database
- ✅ Start the MQTT broker (Mosquitto)
- ✅ Launch the backend API server
- ✅ Launch the frontend application
- ✅ Wait for all services to be ready

**When done, press ENTER to automatically cleanup:**
- Stop all Node.js processes
- Close spawned PowerShell windows
- Stop Mosquitto MQTT broker
- Drop the database (unless `-NoDropDb` specified)

### For Returning Users

If you already have the database set up:

```powershell
.\deploy-local.ps1 -PgPassword "YourPassword" -NoInitDb -NoDropDb
```

---

## 🎯 First-Time Setup on New PC

### Option 1: Automatic Setup (Recommended)

Run the deployment script - it handles everything:

```powershell
.\deploy-local.ps1 -PgPassword "YourPostgresPassword"
```

The script will automatically:
1. Check if root `node_modules` exists
2. Install root dependencies if missing (for config generator)
3. Generate all configuration files using `npm run config:dev`
4. If config generation fails, create minimal .env templates
5. Verify .env files exist for backend and frontend
6. Install backend dependencies (`apps/backend/node_modules`)
7. Install frontend dependencies (`apps/frontend/node_modules`)
8. Initialize database with schema and seed data
9. Start all services

### Option 2: Manual Step-by-Step Setup

If you prefer to understand each step or troubleshoot issues:

#### Step 1: Install Root Dependencies
```powershell
npm install
```

This installs the configuration generator and its dependencies.

#### Step 2: Generate Configuration Files
```powershell
npm run config:dev
```

Or with custom environment:
```powershell
npm run config:prod
npm run config:staging
```

This creates:
- `apps/backend/.env`
- `apps/backend/src/config/env.js`
- `apps/frontend/.env`
- `apps/frontend/src/config.js`
- `firmware/config/reader-*-config.h`
- `firmware/esp01_rdm6300_mqtt/config.h`

#### Step 3: Install Project Dependencies
```powershell
# Backend
cd apps/backend
npm install
cd ../..

# Frontend
cd apps/frontend
npm install
cd ../..
```

#### Step 4: Initialize Database
```powershell
# Set password environment variable
$env:PGPASSWORD = "YourPostgresPassword"

# Create database
psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE rfid"

# Apply schema
Get-Content infra/db/schema.sql | psql -h localhost -p 5432 -U postgres -d rfid

# Load seed data (optional)
Get-Content infra/db/seed.sql | psql -h localhost -p 5432 -U postgres -d rfid
```

#### Step 5: Start Services Manually
```powershell
# Terminal 1: Backend
cd apps/backend
npm run dev

# Terminal 2: Frontend
cd apps/frontend
npm run dev

# Terminal 3: MQTT Broker (if installed)
mosquitto -p 1883
```

---

## 📁 Expected File Structure

After successful setup, you should have:

```
rfid_tapping_system/
├── node_modules/               # ✅ Root dependencies (config generator)
├── package.json                # Root package with config scripts
├── deploy-local.ps1            # Deployment script
├── apps/
│   ├── backend/
│   │   ├── .env               # ✅ Generated backend config
│   │   ├── node_modules/      # ✅ Backend dependencies
│   │   ├── package.json
│   │   └── src/
│   │       └── config/
│   │           └── env.js     # ✅ Generated config module
│   └── frontend/
│       ├── .env               # ✅ Generated frontend config
│       ├── node_modules/      # ✅ Frontend dependencies
│       ├── package.json
│       └── src/
│           └── config.js      # ✅ Generated config module
├── firmware/
│   ├── config/
│   │   ├── reader-1-config.h  # ✅ Generated firmware config
│   │   ├── reader-2-config.h
│   │   └── reader-8-config.h
│   └── esp01_rdm6300_mqtt/
│       └── config.h           # ✅ Generated main firmware config
├── config/
│   └── master-config.js       # 📝 Edit this for configuration
├── scripts/
│   └── generate-configs.js    # Configuration generator
└── infra/
    └── db/
        ├── schema.sql         # Database schema
        └── seed.sql           # Sample data
```

---

## ⚙️ Configuration

### Understanding master-config.js

All system configuration is centralized in `config/master-config.js`. Edit this file to change:

- **Database**: Connection details, credentials, pool size
- **Network**: Ports and IPs for all services
- **WiFi**: Credentials for ESP8266 devices
- **MQTT**: Broker settings and topics
- **Hardware**: Reader configurations and pin assignments
- **Security**: API keys, CORS settings, rate limits
- **Application**: Logging, game settings, timeouts

After editing `master-config.js`, regenerate all config files:
```powershell
npm run config:dev
```

### Configuration Scenarios

#### 1. Change Database Credentials
Edit `config/master-config.js`:
```javascript
DATABASE: {
  USERNAME: process.env.DB_USER || 'postgres',
  PASSWORD: process.env.DB_PASSWORD || 'YourNewPassword',
  NAME: process.env.DB_NAME || 'rfid'
}
```

Then run:
```powershell
.\deploy-local.ps1 -PgPassword "YourNewPassword"
```

#### 2. Use Different Ports
Via command line (no file editing needed):
```powershell
.\deploy-local.ps1 -BackendPort 3000 -FrontendPort 8080 -MqttPort 1884
```

Or edit `master-config.js`:
```javascript
BACKEND: {
  PORT: process.env.BACKEND_PORT || 3000
}
```

#### 3. Deploy on Network (Not Localhost)
Get your IP address:
```powershell
ipconfig | findstr IPv4
```

Deploy with your IP:
```powershell
.\deploy-local.ps1 -NetworkIP "192.168.1.100" -PgPassword "YourPassword"
```

Now accessible from other devices on your network!

#### 4. Configure WiFi for ESP8266
Edit `config/master-config.js`:
```javascript
WIFI: {
  SSID: 'YourNetworkName',
  PASSWORD: 'YourWiFiPassword'
}
```

Regenerate firmware configs:
```powershell
npm run config:dev
```

Upload new `firmware/config/reader-*-config.h` to your ESP8266 devices.

---

## 📚 Command-Line Parameters

All configuration can be done via command-line parameters (no need to edit the script):

### Core Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-DbName` | string | `rfid` | PostgreSQL database name |
| `-DbHost` | string | `localhost` | Database server host |
| `-DbPort` | int | `5432` | Database server port |
| `-DbUser` | string | `postgres` | Database username |
| `-PgPassword` | string | `ChangeMe` | Database password ⚠️ **REQUIRED** |
| `-NetworkIP` | string | `localhost` | Network IP for services |
| `-BackendPort` | int | `4000` | Backend API port |
| `-FrontendPort` | int | `5173` | Frontend dev server port |
| `-MqttPort` | int | `1883` | MQTT broker port |

### Deployment Switches

| Switch | Description |
|--------|-------------|
| `-NoInitDb` | Skip database initialization (use existing DB) |
| `-NoDropDb` | Don't drop database on cleanup (preserve data) |
| `-NoMqtt` | Skip MQTT broker startup |
| `-SkipBackend` | Don't start backend server |
| `-SkipFrontend` | Don't start frontend application |
| `-ProdMode` | Run in production mode (build & preview) |
| `-NoConfig` | Skip config file generation (use existing) |

---

## 🎯 Usage Examples

### First time setup on new PC:
```powershell
.\deploy-local.ps1 -PgPassword "MyPassword123"
```

### Development with existing database:
```powershell
.\deploy-local.ps1 -PgPassword "MyPassword123" -NoInitDb -NoDropDb
```

### Production build:
```powershell
.\deploy-local.ps1 -PgPassword "MyPassword123" -ProdMode
```

### Network deployment (accessible from other devices):
```powershell
.\deploy-local.ps1 -NetworkIP "192.168.1.100" -PgPassword "MyPassword123"
```

### Custom ports (avoid conflicts):
```powershell
.\deploy-local.ps1 -BackendPort 3000 -FrontendPort 8080 -PgPassword "MyPassword123"
```

### Backend only (for API testing):
```powershell
.\deploy-local.ps1 -SkipFrontend -NoMqtt -PgPassword "MyPassword123"
```

### Skip database init and MQTT:
```powershell
.\deploy-local.ps1 -NoInitDb -NoMqtt -PgPassword "MyPassword123"
```

### Multiple options combined:
```powershell
.\deploy-local.ps1 -DbName my_rfid -PgPassword "Pass123" -BackendPort 8080 -NoDropDb -NetworkIP "192.168.1.50"
```

### Keep everything running for extended development:
```powershell
.\deploy-local.ps1 -NoDropDb -NoInitDb -PgPassword "MyPassword123"
# Press ENTER when done - services stop but database persists
```

---

## 🌐 System URLs

After deployment completes, access:

- **Frontend**: http://localhost:5173 (or your custom port)
- **Backend API**: http://localhost:4000 (or your custom port)
- **Health Check**: http://localhost:4000/health
- **Database**: postgresql://postgres@localhost:5432/rfid
- **MQTT**: mqtt://localhost:1883

If deployed with custom NetworkIP:
- **Frontend**: http://192.168.1.100:5173
- **Backend API**: http://192.168.1.100:4000

---

## 🔧 Troubleshooting

### Issue: "psql command not found"
**Cause**: PostgreSQL not in PATH

**Solutions**:
1. Add to PATH temporarily:
   ```powershell
   $env:Path += ";C:\Program Files\PostgreSQL\16\bin"  # Adjust version
   ```

2. Add permanently (Windows):
   - System Properties → Environment Variables
   - Edit PATH → Add `C:\Program Files\PostgreSQL\16\bin`
   - Restart PowerShell

3. Verify installation:
   ```powershell
   Get-Command psql
   ```

### Issue: "npm install fails"
**Cause**: Network issues, corrupted cache, or permissions

**Solutions**:
1. Clear npm cache:
   ```powershell
   npm cache clean --force
   ```

2. Delete node_modules and reinstall:
   ```powershell
   Remove-Item node_modules -Recurse -Force
   npm install
   ```

3. Check network connection and npm registry:
   ```powershell
   npm config get registry
   npm ping
   ```

4. Try with verbose logging:
   ```powershell
   npm install --verbose
   ```

### Issue: "Configuration generation failed"
**Cause**: Missing root dependencies or config errors

**Solutions**:
1. The script automatically creates minimal .env templates as fallback
2. Manually install root dependencies:
   ```powershell
   npm install
   ```

3. Run config generator directly:
   ```powershell
   npm run config:dev
   ```

4. Verify generated files exist:
   ```powershell
   Test-Path apps/backend/.env
   Test-Path apps/frontend/.env
   ```

5. Check `master-config.js` for syntax errors:
   ```powershell
   node -c config/master-config.js
   ```

### Issue: "Cannot connect to PostgreSQL"
**Cause**: PostgreSQL not running or wrong credentials

**Solutions**:
1. Check if PostgreSQL is running:
   ```powershell
   Get-Service -Name postgresql*
   ```

2. Start PostgreSQL if stopped:
   ```powershell
   Start-Service postgresql-x64-16  # Adjust version number
   ```

3. Test connection manually:
   ```powershell
   psql -h localhost -p 5432 -U postgres -c "SELECT 1"
   ```

4. Check pg_hba.conf allows local connections:
   - Location: `C:\Program Files\PostgreSQL\16\data\pg_hba.conf`
   - Should have: `host all all 127.0.0.1/32 md5`

5. Verify password:
   ```powershell
   $env:PGPASSWORD = "YourPassword"
   psql -U postgres -c "SELECT version()"
   ```

### Issue: "Port already in use"
**Cause**: Another service using the same port

**Solutions**:
1. Find process using port:
   ```powershell
   netstat -ano | findstr :4000  # Change port number
   ```

2. Kill the process (replace PID):
   ```powershell
   Stop-Process -Id <PID> -Force
   ```

3. Or use different ports:
   ```powershell
   .\deploy-local.ps1 -BackendPort 4001 -FrontendPort 5174
   ```

### Issue: "Mosquitto not found"
**Cause**: Mosquitto not installed or not in expected location

**Solutions**:
1. Install from https://mosquitto.org/download/
2. Verify installation path:
   ```powershell
   Test-Path "C:\Program Files\mosquitto\mosquitto.exe"
   ```

3. Or skip MQTT:
   ```powershell
   .\deploy-local.ps1 -NoMqtt
   ```

### Issue: "Access Denied" when stopping Mosquitto
**Cause**: Requires administrator privileges

**Solutions**:
1. Run PowerShell as Administrator
2. Or manually stop:
   ```powershell
   taskkill /IM mosquitto.exe /F
   ```

3. Or ignore warning and continue (other services will cleanup)

### Issue: "Backend/Frontend won't start"
**Cause**: Missing dependencies or wrong directory

**Solutions**:
1. Verify node_modules exists:
   ```powershell
   Test-Path apps/backend/node_modules
   Test-Path apps/frontend/node_modules
   ```

2. Manually install dependencies:
   ```powershell
   cd apps/backend
   npm install
   cd ../frontend
   npm install
   ```

3. Check for errors in spawned windows
4. Verify package.json has correct scripts
5. Check logs in `apps/backend/logs/`

### Issue: "Database schema/seed fails"
**Cause**: Schema files missing or SQL errors

**Solutions**:
1. Verify schema file exists:
   ```powershell
   Test-Path infra/db/schema.sql
   ```

2. Apply manually:
   ```powershell
   Get-Content infra/db/schema.sql | psql -U postgres -d rfid
   ```

3. Check for SQL syntax errors in schema.sql
4. Drop and recreate database:
   ```powershell
   psql -U postgres -c "DROP DATABASE IF EXISTS rfid"
   psql -U postgres -c "CREATE DATABASE rfid"
   ```

---

## 🔄 Automatic Cleanup

When you press ENTER after deployment, the script automatically performs cleanup in this order:

### 1. Stop Node.js Processes
- Finds all `node.exe` processes
- Stops backend and frontend servers
- Shows PID of each stopped process

### 2. Close Spawned PowerShell Windows
- Identifies PowerShell windows created by script
- Closes them gracefully
- Excludes current script window

### 3. Stop MQTT Broker
- Stops Mosquitto processes
- May require admin privileges
- Shows warning if access denied

### 4. Drop Database (Optional)
- Terminates all active connections
- Drops database to clean state
- **Skipped** if `-NoDropDb` specified

### 5. Final Status
- Reports cleanup status
- Shows any warnings or errors
- Confirms all services stopped

**Note:** Stopping Mosquitto may require administrator privileges. If you get "Access Denied":
- The script continues with other cleanup
- Manually stop: Run PowerShell as Administrator → `taskkill /IM mosquitto.exe /F`

---

## ✅ Verification Checklist

After deployment, verify everything works:

### Services Running
- [ ] Backend API responds: http://localhost:4000/health
- [ ] Frontend loads: http://localhost:5173
- [ ] MQTT broker listening: `netstat -ano | findstr :1883`

### Database
- [ ] Database exists: `psql -U postgres -c "\l" | findstr rfid`
- [ ] Tables created: `psql -U postgres -d rfid -c "\dt"`
- [ ] Seed data loaded: `psql -U postgres -d rfid -c "SELECT COUNT(*) FROM users"`

### Configuration Files
- [ ] Backend .env: `Test-Path apps/backend/.env`
- [ ] Frontend .env: `Test-Path apps/frontend/.env`
- [ ] Backend config module: `Test-Path apps/backend/src/config/env.js`
- [ ] Frontend config module: `Test-Path apps/frontend/src/config.js`
- [ ] Firmware configs: `Get-ChildItem firmware/config/*.h`

### Dependencies
- [ ] Root node_modules: `Test-Path node_modules`
- [ ] Backend node_modules: `Test-Path apps/backend/node_modules`
- [ ] Frontend node_modules: `Test-Path apps/frontend/node_modules`

### Quick Test Commands
```powershell
# Test backend health
Invoke-RestMethod http://localhost:4000/health

# Test database connection
psql -U postgres -d rfid -c "SELECT 1"

# Check running Node processes
Get-Process -Name node

# Check MQTT port
netstat -ano | findstr :1883

# Verify frontend build
Test-Path apps/frontend/dist  # If ProdMode was used
```

---

## 📞 Need Help?

- **Project Documentation**: Check main `README.md` for architecture and features
- **Configuration Reference**: See `config/master-config.js` for all settings
- **Logs**: Review `apps/backend/logs/` and `apps/frontend/logs/`
- **Team Contact**: See team member emails in main README.md

---

## 🚀 Ready to Deploy?

**Simple deployment:**
```powershell
.\deploy-local.ps1 -PgPassword "YourPassword"
```

**Press ENTER when done to cleanup everything!**

---

**Made with ❤️ for EngEx 2025**

## Quick Start

### For First-Time Users

1. **Run deployment**:
   ```powershell
   .\deploy-local.ps1
   ```

   Or with custom settings:
   ```powershell
   .\deploy-local.ps1 -PgPassword "YourPassword" -BackendPort 4000
   ```

That's it! The script will:
- Verify all prerequisites (PostgreSQL, Node.js, npm)
- Generate configuration files (.env files)
- Initialize the PostgreSQL database
- Start the MQTT broker (Mosquitto)
- Launch the backend API server
- Launch the frontend application
- Wait for all services to be ready

**When you're done, press ENTER to automatically:**
- Stop all Node.js processes (backend & frontend)
- Close spawned PowerShell windows
- Stop Mosquitto MQTT broker
- Drop the database (unless `-NoDropDb` specified)
- Clean up all resources

## Command-Line Parameters

All configuration is now done via command-line parameters (no need to edit the script):

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-DbName` | string | `rfid` | PostgreSQL database name |
| `-DbHost` | string | `localhost` | Database server host |
| `-DbPort` | int | `5432` | Database server port |
| `-DbUser` | string | `postgres` | Database user |
| `-PgPassword` | string | `Gana11602` | Database password ⚠️ **Change this!** |
| `-NetworkIP` | string | `localhost` | Network IP for services |
| `-BackendPort` | int | `4000` | Backend API port |
| `-FrontendPort` | int | `5173` | Frontend dev server port |
| `-MqttPort` | int | `1883` | MQTT broker port |

## Deployment Switches

Control deployment behavior with these switches:

| Switch | Description |
|--------|-------------|
| `-NoInitDb` | Skip database initialization |
| `-NoDropDb` | Don't drop existing database (keeps data on cleanup) |
| `-NoMqtt` | Skip MQTT broker startup |
| `-SkipFrontend` | Don't start frontend |
| `-SkipBackend` | Don't start backend |
| `-ProdMode` | Run in production mode |
| `-NoConfig` | Skip config file generation |

## Usage Examples

### Basic deployment with default settings:
```powershell
.\deploy-local.ps1
```

### Change database password:
```powershell
.\deploy-local.ps1 -PgPassword "MySecurePassword123"
```

### Skip database initialization (if already set up):
```powershell
.\deploy-local.ps1 -NoInitDb
```

### Keep database when cleaning up:
```powershell
.\deploy-local.ps1 -NoDropDb
```

### Use different ports:
```powershell
.\deploy-local.ps1 -BackendPort 8080 -FrontendPort 3000 -MqttPort 1884
```

### Production mode with custom settings:
```powershell
.\deploy-local.ps1 -ProdMode -PgPassword "ProductionPassword" -NoDropDb
```

### Skip database init and MQTT:
```powershell
.\deploy-local.ps1 -NoInitDb -NoMqtt
```

### Multiple options combined:
```powershell
.\deploy-local.ps1 -DbName my_rfid -PgPassword "Pass123" -BackendPort 8080 -NoDropDb -NoConfig
```

## Prerequisites

Before running the scripts, ensure you have:

1. **PostgreSQL** installed and running
   - Windows: `winget install PostgreSQL.PostgreSQL`
   - Ensure `psql` is in your PATH

2. **Mosquitto** MQTT broker installed
   - Windows: Download from https://mosquitto.org/download/
   - Expected locations:
     - `C:\Program Files\mosquitto\mosquitto.exe`
     - `C:\mosquitto\mosquitto.exe`

3. **Node.js 18+** and npm installed
   - Download from https://nodejs.org/

## System URLs

After deployment completes, access:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health
- **Database**: postgresql://postgres@localhost:5432/rfid
- **MQTT**: mqtt://localhost:1883

## Automatic Cleanup on Exit

When you press ENTER after deployment, the script automatically:

1. **Stops all Node.js processes** - Backend and frontend servers
2. **Closes PowerShell windows** - Any spawned service windows
3. **Stops Mosquitto** - MQTT broker (requires admin rights)
4. **Drops database** - Unless `-NoDropDb` was specified
5. **Terminates connections** - All active database sessions

**Note:** Stopping Mosquitto may require administrator privileges. If you get an "Access Denied" error:
- The script will show a warning but continue with other cleanup
- Manually stop Mosquitto by running PowerShell as Administrator: `taskkill /IM mosquitto.exe /F`

## Troubleshooting

### PostgreSQL connection fails
- Ensure PostgreSQL is running: `Get-Service postgresql*`
- Check credentials in `deploy-local.ps1`
- Verify `psql` is in PATH: `Get-Command psql`

### Mosquitto not found
- Install from https://mosquitto.org/download/
- Or set `$NoMqtt = $true` in `deploy-local.ps1`

### Port already in use
- Change ports in `deploy-local.ps1`
- Or stop the conflicting process

### Dependencies installation fails
- Run manually: `cd apps/backend && npm install`
- Check your internet connection
- Clear npm cache: `npm cache clean --force`

## Files

- `deploy-local.ps1` - Simple configuration and launcher (edit this)
- `DEPLOYMENT.md` - This documentation file
