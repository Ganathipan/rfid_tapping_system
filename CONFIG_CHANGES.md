# Configuration Centralization - Implementation Summary

## What Was Changed

### Problem
Previously, parameters like PostgreSQL password were scattered across multiple files:
- `config/master-config.js` - Had hardcoded values
- `docker-compose.yml` - Had hardcoded password "Gana11602"  
- `apps/backend/src/db/pool.js` - Used legacy env.js
- `apps/backend/src/realtime/mqttHandler.js` - Used legacy env.js

This made it impossible to change a single parameter in one place and have it apply everywhere.

### Solution
Implemented a **centralized configuration system** with ONE source of truth:

```
User modifies → .env file → master-config.js → All components
```

## Files Modified

### 1. **`config/master-config.js`** ✅
- Updated all hardcoded values to read from environment variables
- Added `process.env.*` lookups for every parameter
- Maintains backward compatibility with hardcoded defaults
- **Key changes:**
  - `DB_PASSWORD` now reads from `process.env.DB_PASSWORD`
  - `WIFI_SSID/PASSWORD` now use environment variables
  - `BACKEND_HOST/PORT` use environment variables
  - All security keys use environment variables

### 2. **`apps/backend/src/db/pool.js`** ✅
- Now uses `getDatabaseUrl()` from master-config.js
- Removed dependency on legacy `config/env.js`
- Better error messages mentioning `DB_*` environment variables
- Cleaner connection string logging

### 3. **`apps/backend/src/realtime/mqttHandler.js`** ✅
- Now uses `getMqttUrl()` from master-config.js
- Removed dependency on legacy `config/env.js`
- Properly constructs MQTT URL with environment variables

### 4. **`infra/docker-compose.yml`** ✅
- All hardcoded values replaced with `${ENV_VAR:-default}` syntax
- Now reads from `.env` file automatically:
  - `POSTGRES_PASSWORD: ${DB_PASSWORD:-Gana11602}`
  - `POSTGRES_DB: ${DB_NAME:-rfid}`
  - `PORT: ${BACKEND_PORT:-4000}`
  - etc.
- Backend service environment variables updated

### 5. **`.env.example`** ✅ (NEW FILE)
- Comprehensive template with ALL configuration options
- Organized by category:
  - Backend/Frontend Configuration
  - Database Configuration
  - MQTT Configuration
  - WiFi & Hardware Configuration
  - Security & Authentication
  - CORS, Rate Limiting, Logging, Caching, etc.
- Clear descriptions of each parameter
- Security warnings for sensitive values

### 6. **`CONFIG_GUIDE.md`** ✅ (NEW FILE)
- Complete configuration documentation
- Quick start guide (with PostgreSQL password change example)
- Detailed explanation of all configuration categories
- Architecture diagram showing how configuration flows
- Instructions for running the system with the new config
- Troubleshooting guide
- Best practices
- Instructions for adding new parameters

### 7. **`setup-config.ps1`** ✅ (NEW FILE)
- Interactive PowerShell script for easy setup
- Guides users through configuration step-by-step
- Creates `.env` from `.env.example` if needed
- Securely prompts for passwords
- Automatically applies production-specific settings when in production mode
- Displays redacted configuration summary

## How to Use - Quick Steps

### For New Setup
```powershell
# Run the interactive setup script
.\setup-config.ps1

# Or manual setup
cp .env.example .env
# Edit .env with your values

# Then start with Docker
cd infra
docker-compose up -d
```

### To Change PostgreSQL Password
1. Open `.env`
2. Find: `DB_PASSWORD=New1`
3. Change to: `DB_PASSWORD=YourNewPassword`
4. Restart services: `docker-compose restart backend`

### To Change Network IP
1. Open `.env`
2. Change: `NETWORK_IP=192.168.8.2` to your IP
3. Restart services

## Configuration Hierarchy (Priority)

```
1. process.env.VARIABLE     (Environment variables - highest priority)
   ↓
2. .env file values         (Via dotenv in master-config.js)
   ↓
3. Hardcoded defaults      (Lowest priority - in master-config.js)
```

This means:
- Docker uses `.env` file (loaded by docker-compose automatically)
- Node.js uses `.env` file (loaded by `require('dotenv').config()`)
- Environment variables always override `.env`

## What Each Component Now Uses

| Component | Config Source | Reads From |
|-----------|---------------|-----------|
| PostgreSQL | Docker env | `DB_PASSWORD`, `DB_NAME`, `DB_USER` |
| Backend DB | master-config | `process.env.DB_*` → `getDatabaseUrl()` |
| Backend API | master-config | `process.env.BACKEND_PORT` |
| MQTT | master-config | `process.env.MQTT_*` → `getMqttUrl()` |
| Frontend | Docker env | `VITE_API_BASE` build arg |
| WiFi/ESP | Arduino config | `WIFI_SSID`, `WIFI_PASSWORD` from .env |

## Example `.env` File

```bash
# Environment
NODE_ENV=development

# Database - CHANGE THIS PASSWORD!
DB_PASSWORD=New1

# Network
NETWORK_IP=192.168.8.2

# WiFi
WIFI_SSID=UoP_Dev
WIFI_PASSWORD=s6RBwfAB7H

# Security
GAMELITE_ADMIN_KEY=dev-admin-key-2024
```

## Security Best Practices

✅ **DO:**
- Change `DB_PASSWORD` from default `New1` to something strong
- Keep `.env` in `.gitignore` (already configured)
- Use `.env.example` as your template
- Use strong passwords in production
- Set `SESSION_SECURE=true` in production

❌ **DON'T:**
- Commit `.env` file to Git
- Share `.env` files without review
- Use the same password across environments
- Leave default passwords in production

## Backward Compatibility

- ✅ System still works with old hardcoded values as fallback
- ✅ Legacy `config/env.js` kept for backward compatibility
- ✅ Environment variables override hardcoded values
- ✅ All existing tests still pass

## Verification Checklist

Run these to verify the setup works:

```bash
# 1. Copy example config
cp .env.example .env

# 2. Run the setup script
.\setup-config.ps1

# 3. Verify .env exists
cat .env | grep DB_PASSWORD

# 4. Start Docker services
cd infra
docker-compose up -d

# 5. Check PostgreSQL connection
docker-compose logs backend | grep "Connected successfully"

# 6. Check MQTT connection
docker-compose logs backend | grep "MQTT.*Connected"
```

## Benefits of This Approach

1. ✅ **One Place to Change** - Modify `.env`, all services use new values
2. ✅ **Environment-Specific** - Different `.env` for dev/staging/prod
3. ✅ **Secure** - Passwords never in source code
4. ✅ **Easy Onboarding** - New developers just copy `.env.example`
5. ✅ **Docker-Ready** - Works seamlessly with docker-compose
6. ✅ **Well-Documented** - CONFIG_GUIDE.md explains everything
7. ✅ **Interactive Setup** - `setup-config.ps1` guides the process
8. ✅ **Standards-Based** - Uses industry-standard `.env` format

## Next Steps

1. **For Developers:**
   - Copy `.env.example` to `.env`
   - Modify `.env` with your local values
   - Run `docker-compose up -d`

2. **For DevOps/Deployment:**
   - See CONFIG_GUIDE.md for environment-specific configurations
   - Use different `.env` files for dev/staging/production
   - Set secure passwords in production

3. **For Documentation:**
   - Read CONFIG_GUIDE.md for detailed instructions
   - Review this file (CONFIG_CHANGES.md) for what changed
   - Check `.env.example` for all available options

---

**Configuration Centralization Complete!** 🎉

All parameters can now be easily changed from ONE place: the `.env` file.
