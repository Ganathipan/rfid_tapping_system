# Local Deployment Scripts

This directory contains PowerShell scripts for easy local deployment of the RFID Tapping System.

## Quick Start

### Option 1: Simple Deployment (Recommended)

1. **Edit configuration** (optional):
   ```powershell
   notepad deploy-local.ps1
   ```
   Update database credentials, ports, etc. if needed.

2. **Run deployment**:
   ```powershell
   .\deploy-local.ps1
   ```

That's it! The script will:
- Generate configuration files
- Initialize the PostgreSQL database
- Start the MQTT broker (Mosquitto)
- Launch the backend API server
- Launch the frontend application

### Option 2: Advanced Deployment

Use `start-local.ps1` directly with command-line parameters:

```powershell
.\start-local.ps1 -DbName "rfid" -DbPassword "YourPassword" -BackendPort 4000
```

## Configuration Variables

Edit these in `deploy-local.ps1`:

| Variable | Default | Description |
|----------|---------|-------------|
| `$DbName` | `rfid` | PostgreSQL database name |
| `$DbHost` | `localhost` | Database server host |
| `$DbPort` | `5432` | Database server port |
| `$DbUser` | `postgres` | Database user |
| `$PgPassword` | `New1` | Database password (⚠️ change this!) |
| `$NetworkIP` | `localhost` | Network IP for services |
| `$BackendPort` | `4000` | Backend API port |
| `$FrontendPort` | `5173` | Frontend dev server port |
| `$MqttPort` | `1883` | MQTT broker port |

## Deployment Options

Uncomment these in `deploy-local.ps1` to customize behavior:

| Option | Description |
|--------|-------------|
| `$NoInitDb = $true` | Skip database initialization |
| `$NoDropDb = $true` | Don't drop existing database before creating |
| `$NoMqtt = $true` | Skip MQTT broker startup |
| `$SkipFrontend = $true` | Don't start frontend |
| `$SkipBackend = $true` | Don't start backend |
| `$ProdMode = $true` | Run in production mode |
| `$NoConfig = $true` | Skip config file generation |

## Examples

### Basic deployment with default settings:
```powershell
.\deploy-local.ps1
```

### Change database password:
Edit `deploy-local.ps1` and set:
```powershell
$PgPassword = 'MySecurePassword123'
```

### Skip database initialization (if already set up):
Edit `deploy-local.ps1` and uncomment:
```powershell
$NoInitDb = $true
```

### Use different ports:
Edit `deploy-local.ps1` and set:
```powershell
$BackendPort = 8080
$FrontendPort = 3000
$MqttPort = 1884
```

### Direct command-line usage:
```powershell
# Full deployment with custom settings
.\start-local.ps1 -DbPassword "MyPassword" -BackendPort 8080 -FrontendPort 3000

# Skip database init and MQTT
.\start-local.ps1 -NoInitDb -NoMqtt

# Production mode
.\start-local.ps1 -ProdMode

# Don't drop database before creating
.\start-local.ps1 -NoDropDb
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

## Stopping the System

To stop all services:

1. Close the backend PowerShell window
2. Close the frontend PowerShell window
3. Stop Mosquitto:
   ```powershell
   Get-Process mosquitto | Stop-Process
   ```

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
- `start-local.ps1` - Main deployment script (don't edit)
- `DEPLOYMENT.md` - This documentation file
