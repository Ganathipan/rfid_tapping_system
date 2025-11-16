# 🎯 Configuration Centralization - Getting Started

## What Changed?

Your RFID Tapping System now has **centralized configuration**. Instead of changing the same parameter in multiple files, you now change it **in ONE PLACE**: the `.env` file.

### Quick Example
**Before:** To change PostgreSQL password from `New1` to `MyPassword`
- Edit `config/master-config.js` 
- Edit `docker-compose.yml`
- Edit `apps/backend/src/config/env.js`
- Risk: Easy to miss one and break things ❌

**After:** To change PostgreSQL password
- Edit `.env` file: `DB_PASSWORD=MyPassword`
- Done! ✅

---

## 🚀 Get Started in 3 Steps

### Step 1: Create Configuration File
Choose ONE of these options:

**Option A - Interactive Setup (Recommended)**
```powershell
.\setup-config.ps1
```

**Option B - Manual Setup**
```bash
cp .env.example .env
# Then edit .env with your values in any text editor
```

**Option C - Use Existing Environment**
```bash
docker-compose -f infra/docker-compose.yml up -d
```

### Step 2: Customize for Your Environment
Edit `.env` file and change at minimum:
- `DB_PASSWORD` - **MUST change from `New1` to something secure**
- `NETWORK_IP` - Change to your network IP if different
- `WIFI_SSID` - WiFi network name (if using ESP8266 devices)
- `WIFI_PASSWORD` - WiFi password

### Step 3: Start the System
```bash
cd infra
docker-compose up -d
```

**Done!** Your system is now running with your custom configuration.

---

## 📚 Documentation Files

Read these in order based on your needs:

### 🟢 **START HERE**
- **`CONFIGURATION_README.md`** - Setup & common tasks
  - Quick start (3 options)
  - Most important parameters
  - Common tasks (change password, change IP, etc.)
  - Troubleshooting

### 🔵 **NEED QUICK ANSWERS?**
- **`QUICK_REFERENCE.md`** - One-page reference
  - Essential parameters table
  - Common issues & solutions
  - File quick reference
  - Security reminders

### 🟣 **WANT FULL DETAILS?**
- **`CONFIG_GUIDE.md`** - Complete guide
  - All 100+ configuration options
  - Architecture explanation
  - How configuration flows through system
  - Best practices
  - How to add new parameters

### 🟠 **TECHNICAL DETAILS**
- **`CONFIG_CHANGES.md`** - What changed & why
  - Files modified
  - Configuration hierarchy
  - Verification checklist
  - Benefits explained

### 🟡 **IMPLEMENTATION INFO**
- **`IMPLEMENTATION_SUMMARY.md`** - Complete overview
  - What was done
  - Files modified and created
  - Configuration flow diagram
  - Verification steps

---

## 🔧 Key Files

| File | Purpose | Edit? |
|------|---------|-------|
| `.env` | Your configuration (create from .env.example) | ✅ **Edit this** |
| `.env.example` | Template of all options | ❌ Read only |
| `config/master-config.js` | Central hub (reads from .env) | ❌ Don't edit |
| `setup-config.ps1` | Interactive setup wizard | ✅ Run this |

---

## ⚡ Most Important Parameters

These parameters control critical system settings:

```bash
# DATABASE - CHANGE THIS!
DB_PASSWORD=New1                    # ⚠️ Change to secure password

# NETWORK - Set to your actual IP
NETWORK_IP=192.168.8.2

# WiFi (for ESP8266 devices)
WIFI_SSID=UoP_Dev                  # Your WiFi network name
WIFI_PASSWORD=s6RBwfAB7H           # Your WiFi password

# ENVIRONMENT
NODE_ENV=development                # Or: staging, production
```

---

## 🆘 Common Tasks

### Change PostgreSQL Password
```bash
# 1. Open .env file
# 2. Find: DB_PASSWORD=New1
# 3. Change to: DB_PASSWORD=YourNewSecurePassword
# 4. Save file
# 5. Restart: docker-compose restart backend
```

### Change Network IP
```bash
# 1. Open .env file
# 2. Find: NETWORK_IP=192.168.8.2
# 3. Change to: NETWORK_IP=YOUR_IP_ADDRESS
# 4. Save file
# 5. Restart: docker-compose down; docker-compose up -d
```

### Switch to Production Mode
```bash
# 1. Open .env file
# 2. Change: NODE_ENV=production
# 3. Change: DB_PASSWORD to secure password
# 4. Change: SESSION_SECURE=true
# 5. Change: DB_SSL=true
# 6. Save file
# 7. Restart services
```

### Change WiFi for ESP8266
```bash
# 1. Open .env file
# 2. Update: WIFI_SSID=YourNetworkName
# 3. Update: WIFI_PASSWORD=YourPassword
# 4. Save file
# 5. Re-upload Arduino firmware with new config
```

---

## ✅ Verification Checklist

After setup, run these to verify everything works:

```bash
# ✓ Check .env exists
cat .env | head -5

# ✓ Check backend started
docker-compose ps | grep backend

# ✓ Check database connected
docker-compose logs backend | grep "Connected successfully"

# ✓ Check MQTT connected
docker-compose logs backend | grep "MQTT.*Connected"

# ✓ Check frontend running
docker-compose ps | grep frontend
```

---

## 🔐 Security

✅ **What's Protected:**
- `.env` file is in `.gitignore` - won't be committed to git
- Default passwords provided only as examples
- Environment-specific configurations available
- SSL and secure session options in `.env`

✅ **What You Should Do:**
- Change `DB_PASSWORD` from `New1` to a strong password
- Use different passwords for dev/staging/production
- Set `SESSION_SECURE=true` and `DB_SSL=true` in production
- Keep `.env` file private (don't share or commit)

---

## 📖 Documentation Roadmap

```
START HERE
    ↓
CONFIGURATION_README.md (setup & tasks)
    ↓
QUICK_REFERENCE.md (if you need quick lookup)
    ↓
CONFIG_GUIDE.md (if you need all details)
    ↓
CONFIG_CHANGES.md (if you want to understand changes)
    ↓
IMPLEMENTATION_SUMMARY.md (if you want full technical overview)
```

---

## 🎓 How It Works

### Configuration Flow
```
1. You edit .env file
        ↓
2. Docker reads .env when starting
        ↓
3. master-config.js reads environment variables from .env
        ↓
4. All components use centralized configuration
        ↓
5. Changes automatically apply everywhere
```

### Example: Database Password
```
.env (your file)
  DB_PASSWORD=NewPassword
        ↓
Docker container receives DB_PASSWORD as env var
        ↓
master-config.js reads process.env.DB_PASSWORD
        ↓
pool.js gets password from master-config
        ↓
✅ PostgreSQL connects with new password
```

---

## 🚀 Next Steps

### For First-Time Users
1. Read `CONFIGURATION_README.md`
2. Run `.\setup-config.ps1` for interactive setup
3. Start system: `docker-compose up -d`

### For System Administrators
1. Copy `.env.example` to `.env`
2. Customize all parameters for your environment
3. Use `CONFIG_GUIDE.md` for reference
4. Keep `.env` backed up and secure

### For Developers
1. Run `.\setup-config.ps1` or create `.env` from `.env.example`
2. Edit `.env` with your local development values
3. Start: `docker-compose up -d`
4. Reference `CONFIG_GUIDE.md` if needed

### For DevOps/CI-CD
1. Create `.env` file for each environment (dev, staging, prod)
2. Store environment-specific values in each `.env`
3. Use `CONFIG_GUIDE.md` for security settings
4. Never commit `.env` - use `.env.example` in git

---

## 📊 What Can Be Configured

**50+ parameters** covering:
- ✅ Database (host, port, user, password, SSL, connection pooling)
- ✅ Backend API (host, port, protocol)
- ✅ Frontend (host, port, protocol)
- ✅ MQTT Broker (host, port, authentication, topics)
- ✅ WiFi (SSID, password for ESP8266)
- ✅ RFID Readers (IDs, portals, descriptions)
- ✅ Security (API keys, JWT secrets, CORS, session settings)
- ✅ Logging (level, file path, max files)
- ✅ Caching (TTL, max keys)
- ✅ Game Settings (player count, duration, refresh rate)
- ✅ Hardware (ESP pins, baud rate, flash size)

---

## ❓ Frequently Asked Questions

**Q: Where do I create the `.env` file?**
A: In the root directory (same level as `package.json`)

**Q: Do I need to commit `.env` to git?**
A: No! It's already in `.gitignore`. Commit `.env.example` instead.

**Q: What if I forget to change the password?**
A: The system will still work with default `New1`, but it's not secure.

**Q: Can I use environment variables instead of `.env` file?**
A: Yes! The system checks environment variables first, then `.env`, then defaults.

**Q: How do I know if my configuration is correct?**
A: Check logs: `docker-compose logs backend | grep "Connected successfully"`

**Q: What if configuration isn't loading?**
A: Verify `.env` file exists: `cat .env | head -5`

---

## 🔗 Quick Links

- **Setup Instructions:** `CONFIGURATION_README.md`
- **Quick Reference:** `QUICK_REFERENCE.md`
- **Complete Guide:** `CONFIG_GUIDE.md`
- **Implementation Details:** `CONFIG_CHANGES.md`
- **Technical Overview:** `IMPLEMENTATION_SUMMARY.md`
- **Configuration Template:** `.env.example`
- **Setup Wizard:** `setup-config.ps1`

---

## 💡 Pro Tips

1. **Use the setup wizard** - It walks you through everything:
   ```powershell
   .\setup-config.ps1
   ```

2. **Keep multiple .env files** - One for each environment:
   - `.env.development` - Local development
   - `.env.staging` - Staging server
   - `.env.production` - Production server
   - Quickly switch between them

3. **Document your changes** - Add comments to `.env`:
   ```bash
   # Custom values for our deployment
   NETWORK_IP=192.168.100.50
   DB_PASSWORD=MySecurePassword123
   ```

4. **Check logs when stuck** - They usually explain the issue:
   ```bash
   docker-compose logs -f backend
   ```

---

## ✨ What You Get

After setup:
- ✅ Easy configuration management
- ✅ Secure password handling
- ✅ Environment-specific settings
- ✅ Clear documentation
- ✅ Interactive setup wizard
- ✅ One place to change parameters
- ✅ Better team collaboration
- ✅ Production-ready security options

---

## 🎉 You're All Set!

Configuration centralization is complete. Your system is ready to be customized by anyone, anywhere, without touching code.

**Start with:** Read `CONFIGURATION_README.md` or run `.\setup-config.ps1`

Questions? Check the documentation files above!
