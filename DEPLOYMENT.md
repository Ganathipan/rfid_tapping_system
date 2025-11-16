# Local Deployment Script

Simple PowerShell script for easy local deployment of the RFID Tapping System with automatic cleanup on exit.

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
