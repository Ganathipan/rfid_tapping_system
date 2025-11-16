# Configuration Setup Instructions

## Overview

The RFID Tapping System now uses a **centralized configuration system**. All parameters (database password, network IPs, WiFi credentials, security keys, etc.) can be changed in **ONE PLACE**: the `.env` file.

## Quick Start (Choose One)

### Option 1: Interactive Setup (Easiest)
```powershell
.\setup-config.ps1
```
Guides you through setup step-by-step with prompts.

### Option 2: Manual Setup
```bash
# 1. Create .env from template
cp .env.example .env

# 2. Edit .env with your values
#    (Use any text editor)
#    Most important: change DB_PASSWORD from "New1"

# 3. Start the system
cd infra
docker-compose up -d
```

### Option 3: Using Existing Environment
If you already have configuration in environment variables:
```bash
docker-compose -f infra/docker-compose.yml up -d
```

## Configuration Files

| File | Purpose | Edit? |
|------|---------|-------|
| `.env.example` | Template with all options | ❌ Read-only |
| `.env` | YOUR configuration | ✅ Create & edit this |
| `config/master-config.js` | Central hub (reads from .env) | ❌ Don't edit |
| `CONFIG_GUIDE.md` | Complete documentation | ✅ Read for help |
| `QUICK_REFERENCE.md` | Quick lookup guide | ✅ Read for quick answers |

## Most Important Parameters

These are the parameters you most likely need to change:

```bash
# Database password - CHANGE THIS!
DB_PASSWORD=New1                    # ⚠️ Change to secure password

# Network IP - Set to your actual network IP
NETWORK_IP=192.168.8.2

# WiFi credentials - For ESP8266 devices
WIFI_SSID=UoP_Dev
WIFI_PASSWORD=s6RBwfAB7H

# Environment
NODE_ENV=development                # Or: staging, production
```

## Common Tasks

### Change PostgreSQL Password
1. Open `.env`
2. Find line: `DB_PASSWORD=New1`
3. Change to: `DB_PASSWORD=YourNewSecurePassword`
4. Restart backend: `docker-compose restart backend`

### Change Network IP
1. Open `.env`
2. Find line: `NETWORK_IP=192.168.8.2`
3. Change to: `NETWORK_IP=10.0.0.100` (your IP)
4. Restart services: `docker-compose down` then `docker-compose up -d`

### Change WiFi Settings (ESP8266)
1. Open `.env`
2. Update `WIFI_SSID` and `WIFI_PASSWORD`
3. Re-upload Arduino firmware with new config

### Switch to Production Mode
1. Open `.env`
2. Set `NODE_ENV=production`
3. Change all passwords to secure values
4. Set `SESSION_SECURE=true`
5. Set `DB_SSL=true`
6. Restart: `docker-compose down` then `docker-compose up -d`

## What Configuration Controls

The `.env` file configures:

- ✅ PostgreSQL database (host, port, password, SSL)
- ✅ Backend API (host, port, protocol)
- ✅ Frontend (host, port, protocol)
- ✅ MQTT broker (host, port, authentication)
- ✅ WiFi (SSID, password for ESP8266)
- ✅ RFID readers (IDs, portals, descriptions)
- ✅ Security (API keys, JWT secret, session settings)
- ✅ CORS configuration (allowed origins)
- ✅ Logging (level, file path, max files)
- ✅ Cache settings (TTL, max keys)
- ✅ Game settings (player count, game duration, etc.)

## Docker Integration

The system automatically uses `.env` when starting Docker:

```bash
cd infra
docker-compose up -d      # Reads .env automatically
```

Each service gets its configuration:
- **PostgreSQL**: Uses `DB_PASSWORD`, `DB_NAME`, `DB_USER`
- **Backend**: Uses `DB_HOST`, `MQTT_HOST`, `BACKEND_PORT`, etc.
- **Frontend**: Uses `BACKEND_HOST` to build API base URL
- **MQTT**: Runs on port from `MQTT_PORT`

## Environment Variables

All parameters in `.env` become environment variables used by:
- Node.js backend (`process.env.DB_PASSWORD`, etc.)
- Docker containers (automatically from .env)
- System processes

### Temporary Override
Override a setting for one command:
```bash
DB_PASSWORD=different npm start
```

## Security

✅ **Do:**
- Change `DB_PASSWORD` from default `New1`
- Use strong passwords (mix of uppercase, lowercase, numbers, symbols)
- Keep `.env` private (in .gitignore)
- Different passwords for dev/staging/production
- Set `SESSION_SECURE=true` in production with HTTPS

❌ **Don't:**
- Commit `.env` to git
- Use default passwords in production
- Share `.env` files without review
- Keep same password across environments

## Troubleshooting

### "Authentication failed"
```bash
# Check your .env password
grep DB_PASSWORD .env

# Verify it matches docker setup
cat infra/docker-compose.yml | grep POSTGRES_PASSWORD
```

### "Cannot connect to backend"
```bash
# Verify backend is running
docker ps | grep backend

# Check backend host/port in .env
grep BACKEND_HOST .env
grep BACKEND_PORT .env
```

### "MQTT connection error"
```bash
# Check MQTT service
docker logs mosquitto

# Verify settings in .env
grep MQTT_HOST .env
grep MQTT_PORT .env
```

## For More Information

- **Complete Guide**: See `CONFIG_GUIDE.md`
- **Quick Lookup**: See `QUICK_REFERENCE.md`
- **What Changed**: See `CONFIG_CHANGES.md`
- **All Options**: See `.env.example`

## Examples

### Development Environment
```bash
NODE_ENV=development
DB_PASSWORD=NewPassword123
NETWORK_IP=192.168.1.100
LOG_LEVEL=debug
SESSION_SECURE=false
```

### Staging Environment
```bash
NODE_ENV=staging
DB_PASSWORD=SecurePass@2024
NETWORK_IP=10.50.0.50
LOG_LEVEL=info
SESSION_SECURE=true
DB_SSL=true
```

### Production Environment
```bash
NODE_ENV=production
DB_PASSWORD=VerySecurePassword!@#$%
NETWORK_IP=production.example.com
LOG_LEVEL=warn
SESSION_SECURE=true
DB_SSL=true
BACKEND_PROTOCOL=https
```

## Getting Help

1. **Check `.env.example`** - Shows all available options
2. **Read `CONFIG_GUIDE.md`** - Comprehensive documentation
3. **See `QUICK_REFERENCE.md`** - Quick lookup for common tasks
4. **Review logs** - `docker-compose logs -f` shows detailed info
5. **Check error messages** - They often mention which env var is wrong

---

**Configuration centralization complete!** All your settings are now in one place. 🎉

Start with: `.\setup-config.ps1` or `cp .env.example .env` then edit it.
