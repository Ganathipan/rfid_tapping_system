# Quick Reference - Configuration Changes

## 🎯 What Changed?
Before: Configuration scattered across multiple files
Now: **ONE `.env` file** controls everything

## ⚡ Quick Setup (30 seconds)

```powershell
# 1. Copy template
cp .env.example .env

# 2. Edit the file with your values
# (Most important: change DB_PASSWORD from "New1")

# 3. Done! Start the system
cd infra
docker-compose up -d
```

## 🔑 Most Important Parameters to Change

| Parameter | Location | What It Controls | Example |
|-----------|----------|-----------------|---------|
| `DB_PASSWORD` | `.env` line 24 | PostgreSQL password | `YourSecurePassword` |
| `NETWORK_IP` | `.env` line 51 | System network address | `192.168.1.100` |
| `WIFI_SSID` | `.env` line 42 | WiFi network name | `MyNetwork` |
| `WIFI_PASSWORD` | `.env` line 43 | WiFi password | `WifiPass123` |

## 📝 How to Change PostgreSQL Password

### Old Way (Multiple files to change):
- Edit `config/master-config.js`
- Edit `docker-compose.yml`
- Edit `apps/backend/src/config/env.js`
- ❌ Easy to miss one and break things

### New Way (One file):
```bash
# Open .env
# Find: DB_PASSWORD=New1
# Change to: DB_PASSWORD=YourNewSecurePassword
# Save file
# Restart: docker-compose restart backend
# ✅ Done!
```

## 📂 Files You Need to Know

| File | Purpose | Edit? |
|------|---------|-------|
| `.env` | YOUR configuration (create from .env.example) | ✅ Edit this |
| `.env.example` | Template of all options | ❌ Read only |
| `config/master-config.js` | Central config hub | ❌ Don't edit |
| `CONFIG_GUIDE.md` | Complete documentation | ✅ Read for help |
| `setup-config.ps1` | Interactive setup wizard | ✅ Run for easy setup |

## 🚀 Starting the System

### Using Docker (Recommended)
```bash
cd infra
docker-compose up -d
```

### Using npm (Local)
```bash
# Backend
cd apps/backend
npm install
npm start

# Frontend (another terminal)
cd apps/frontend
npm install
npm run dev
```

## 🆘 Common Issues

### "Authentication failed" 
- Check `.env` has correct `DB_PASSWORD`
- Make sure it matches what PostgreSQL is using

### "Cannot connect to backend"
- Verify `BACKEND_HOST` and `BACKEND_PORT` in `.env`
- Check backend is running: `docker ps`

### "MQTT not connecting"
- Verify `MQTT_HOST` and `MQTT_PORT` in `.env`
- Check MQTT service is running: `docker logs mosquitto`

## 📚 Full Documentation

For complete information, see:
- **`CONFIG_GUIDE.md`** - Detailed setup instructions
- **`CONFIG_CHANGES.md`** - What was changed and why
- **`.env.example`** - All available configuration options

## ✅ Verification Steps

Run these commands to verify setup:

```bash
# Check .env exists
ls -la .env

# Check Docker services are running
docker-compose ps

# Check backend is connected to database
docker-compose logs backend | grep "Connected successfully"

# Check MQTT is running
docker-compose logs mosquitto | grep "mosquitto"
```

## 🎓 Key Concepts

```
┌──────────────┐
│   .env       │  Your settings
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│  Docker Compose     │  Builds and runs services
└──────┬──────────────┘
       │
       ├─► PostgreSQL (uses DB_PASSWORD, DB_NAME, etc.)
       ├─► Backend (uses DB_HOST, MQTT_HOST, etc.)
       ├─► MQTT Broker (uses MQTT_PORT)
       └─► Frontend (uses BACKEND_HOST)
```

## 🔐 Security Reminders

- ✅ Change `DB_PASSWORD` from default `New1`
- ✅ Keep `.env` file private (it's in .gitignore)
- ✅ Use strong passwords (uppercase, lowercase, numbers, symbols)
- ✅ Different passwords for dev/staging/production
- ✅ In production: set `SESSION_SECURE=true` with HTTPS

## 💡 Tips & Tricks

**Temporarily override a setting:**
```bash
DB_PASSWORD=different npm start
```

**View current configuration:**
```bash
cat .env | grep -v "^#" | grep -v "^$"
```

**Interactive setup wizard:**
```powershell
.\setup-config.ps1
```

**Restart services with new config:**
```bash
docker-compose down
docker-compose up -d
```

---

**That's it! Configuration is now centralized and easy to manage.** 🎉

For more details: Read `CONFIG_GUIDE.md`
