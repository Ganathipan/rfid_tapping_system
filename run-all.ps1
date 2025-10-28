param(
  [string] $DbName = 'rfid',
  [string] $DbHost = 'localhost',
  [int]    $DbPort = 5432,
  [string] $DbUser = 'postgres',
  [string] $PgPassword = 'Gana11602',
  [string] $NetworkIP = '192.168.8.2',
  [int]    $BackendPort = 4000,
  [int]    $FrontendPort = 5173,
  [int]    $MqttPort = 1883,
  [switch] $NoInitDb,
  [switch] $NoDropDb,
  [switch] $NoMqtt,
  [switch] $SkipFrontend,
  [switch] $SkipBackend,
  [switch] $ProdMode
)

# ============================================================================
# RFID Tapping System - Complete Launcher
# ============================================================================
# This script launches all components of the RFID system:
# - PostgreSQL Database initialization
# - MQTT Broker (Mosquitto)
# - Backend API Server (Node.js/Express)
# - Frontend Web Application (React/Vite)
# - Real-time monitoring dashboard
# ============================================================================

$env:PGPASSWORD = $PgPassword
$ErrorActionPreference = 'Stop'

# --- Path Configuration ---
$Root        = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir  = Join-Path $Root 'apps\backend'
$FrontendDir = Join-Path $Root 'apps\frontend'
$InfraDir    = Join-Path $Root 'infra'
$ConfigDir   = Join-Path $Root 'config'

# --- Database Schema Discovery ---
$SchemaCandidates = @(
  (Join-Path $InfraDir 'db\schema.sql'),
  (Join-Path $Root 'schema.sql'),
  (Join-Path $BackendDir 'db\schema.sql')
)
$SchemaFile = $SchemaCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

# --- Seed Data Discovery ---
$SeedCandidates = @(
  (Join-Path $InfraDir 'db\seed.sql'),
  (Join-Path $Root 'seed.sql'),
  (Join-Path $BackendDir 'db\seed.sql')
)
$SeedFile = $SeedCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

# --- MQTT Configuration ---
$MosquittoPaths = @(
  "C:\Program Files\mosquitto\mosquitto.exe",
  "C:\mosquitto\mosquitto.exe",
  "mosquitto.exe"
)
$MosquittoPath = $MosquittoPaths | Where-Object { 
  if ($_ -eq "mosquitto.exe") { Get-Command $_ -ErrorAction SilentlyContinue }
  else { Test-Path $_ }
} | Select-Object -First 1

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Header($Message, $Color = 'Cyan') {
  Write-Host ""
  Write-Host "=" * 60 -ForegroundColor $Color
  Write-Host " $Message" -ForegroundColor $Color
  Write-Host "=" * 60 -ForegroundColor $Color
}

function Write-Step($Message, $Color = 'Yellow') {
  Write-Host "> $Message" -ForegroundColor $Color
}

function Write-Success($Message) {
  Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning($Message) {
  Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error($Message) {
  Write-Host "❌ $Message" -ForegroundColor Red
}

function Ensure-Command($CommandName) {
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "$CommandName not found on PATH. Please install $CommandName first."
  }
}

function Test-Port($Port, $HostName = 'localhost') {
  try {
    $tcpConnection = Test-NetConnection -ComputerName $HostName -Port $Port -WarningAction SilentlyContinue
    return $tcpConnection.TcpTestSucceeded
  } catch {
    return $false
  }
}

function Wait-ForPort($Port, $HostName = 'localhost', $TimeoutSeconds = 30) {
  $elapsed = 0
  Write-Step "Waiting for $HostName`:$Port to be available..."
  
  while ($elapsed -lt $TimeoutSeconds) {
    if (Test-Port -Port $Port -HostName $HostName) {
      Write-Success "Service available on $HostName`:$Port"
      return $true
    }
    Start-Sleep -Seconds 1
    $elapsed++
    Write-Host "." -NoNewline -ForegroundColor DarkGray
  }
  
  Write-Host ""
  Write-Error "Timeout waiting for $HostName`:$Port"
  return $false
}

function Invoke-PSqlCmd([string]$Sql, [string]$Database = '') {
  $args = @('-h', $DbHost, '-p', $DbPort, '-U', $DbUser, '-v', 'ON_ERROR_STOP=1', '-c', $Sql)
  if ($Database) { $args += @('-d', $Database) }
  & psql @args
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL command failed: $Sql" }
}

function Invoke-PSqlFile([string]$File, [string]$Database = '') {
  $args = @('-h', $DbHost, '-p', $DbPort, '-U', $DbUser, '-v', 'ON_ERROR_STOP=1', '-f', $File)
  if ($Database) { $args += @('-d', $Database) }
  & psql @args
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL file execution failed: $File" }
}

# ============================================================================
# DATABASE MANAGEMENT
# ============================================================================

function Ensure-Database {
  Write-Step "Checking if database '$DbName' exists..."
  
  try {
    $exists = (& psql -h $DbHost -p $DbPort -U $DbUser -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'" postgres 2>$null) -eq '1'
    
    if (-not $exists) {
      Write-Step "Creating database '$DbName'..."
      Invoke-PSqlCmd "CREATE DATABASE `"$DbName`";" 'postgres'
      Write-Success "Database '$DbName' created successfully"
    } else {
      Write-Success "Database '$DbName' already exists"
    }
  } catch {
    Write-Error "Failed to ensure database: $($_.Exception.Message)"
    throw
  }
}

function Initialize-Database {
  if ($NoInitDb) { 
    Write-Warning "Skipping database initialization (-NoInitDb)"
    return 
  }
  
  if (-not $SchemaFile) { 
    Write-Warning "No schema file found. Looked for: $($SchemaCandidates -join ', ')"
    return
  }
  
  Write-Step "Applying schema from '$SchemaFile'..."
  try {
    Invoke-PSqlFile $SchemaFile $DbName
    Write-Success "Database schema applied successfully"
    
    # Apply seed data if available
    if ($SeedFile) {
      Write-Step "Applying seed data from '$SeedFile'..."
      Invoke-PSqlFile $SeedFile $DbName
      Write-Success "Seed data applied successfully"
    }
  } catch {
    Write-Error "Failed to initialize database: $($_.Exception.Message)"
    throw
  }
}

function Remove-Database {
  if ($NoDropDb) {
    Write-Warning "Keeping database '$DbName' (-NoDropDb specified)"
    return
  }
  
  Write-Step "Removing database '$DbName'..."
  try {
    # Terminate active connections
    Invoke-PSqlCmd "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DbName' AND pid <> pg_backend_pid();" 'postgres'
    # Drop database
    Invoke-PSqlCmd "DROP DATABASE IF EXISTS `"$DbName`";" 'postgres'
    Write-Success "Database '$DbName' removed successfully"
  } catch {
    Write-Warning "Failed to remove database: $($_.Exception.Message)"
  }
}

# ============================================================================
# CONFIGURATION MANAGEMENT
# ============================================================================

function Update-Configuration {
  Write-Step "Updating system configuration for network IP: $NetworkIP"
  
  try {
    $configScript = Join-Path $Root 'scripts\generate-configs.js'
    if (Test-Path $configScript) {
      # Set environment variables for config generation
      $env:NETWORK_IP = $NetworkIP
      $env:BACKEND_PORT = $BackendPort
      $env:FRONTEND_PORT = $FrontendPort
      $env:MQTT_PORT = $MqttPort
      
      Push-Location $Root
      & node $configScript
      Pop-Location
      
      Write-Success "Configuration files updated"
    } else {
      Write-Warning "Configuration generator not found at: $configScript"
    }
  } catch {
    Write-Warning "Failed to update configuration: $($_.Exception.Message)"
  }
}

# ============================================================================
# SERVICE MANAGEMENT
# ============================================================================

function Stop-ExistingMqttProcesses {
  Write-Step "Checking for existing MQTT processes and services..."
  
  # Try to stop mosquitto service first
  try {
    $service = Get-Service -Name "mosquitto" -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
      Write-Step "Attempting to stop mosquitto Windows service..."
      try {
        Stop-Service -Name "mosquitto" -Force -ErrorAction Stop
        Write-Success "Mosquitto service stopped"
        Start-Sleep -Seconds 3
      } catch {
        Write-Warning "Could not stop mosquitto service (requires admin): $($_.Exception.Message)"
        Write-Warning "You may need to run PowerShell as Administrator or manually stop the service"
      }
    }
  } catch {
    # Service might not exist, continue
  }
  
  # Try to stop any mosquitto processes
  try {
    $mqttProcesses = Get-Process -Name "mosquitto" -ErrorAction SilentlyContinue
    if ($mqttProcesses) {
      Write-Step "Found $($mqttProcesses.Count) existing MQTT process(es), attempting to stop them..."
      foreach ($proc in $mqttProcesses) {
        try {
          Stop-Process -Id $proc.Id -Force -ErrorAction Stop
          Write-Success "Stopped mosquitto process PID: $($proc.Id)"
        } catch {
          Write-Warning "Could not stop mosquitto process PID $($proc.Id): $($_.Exception.Message)"
        }
      }
      Start-Sleep -Seconds 3
    }
  } catch {
    Write-Warning "Could not check for existing MQTT processes: $($_.Exception.Message)"
  }
}

function Start-MqttBroker {
  if ($NoMqtt) {
    Write-Warning "Skipping MQTT broker (-NoMqtt)"
    return $null
  }
  
  if (-not $MosquittoPath) {
    Write-Error "Mosquitto not found. Please install Mosquitto MQTT broker."
    Write-Host "Download from: https://mosquitto.org/download/" -ForegroundColor Blue
    return $null
  }
  
  # Use the specific config file as requested - always start with this config
  $mqttConfigFile = "D:\UOP_Files\Academics\Semester04\2YP_Project\prototype\rfid_tapping_system\infra\mosquitto\mosquitto.conf"
  
  if (-not (Test-Path $mqttConfigFile)) {
    Write-Error "MQTT config file not found at: $mqttConfigFile"
    return $null
  }
  
  Write-Step "Starting MQTT broker with config: $mqttConfigFile"
  try {
    $mqttArgs = @('-c', $mqttConfigFile)
    $mqttProc = Start-Process -FilePath $MosquittoPath -ArgumentList $mqttArgs -WindowStyle Normal -PassThru
    
    # Wait for MQTT to start
    Start-Sleep -Seconds 4
    if (Wait-ForPort -Port $MqttPort -HostName $NetworkIP -TimeoutSeconds 15) {
      Write-Success "MQTT broker started on $NetworkIP`:$MqttPort (PID: $($mqttProc.Id))"
      return $mqttProc
    } else {
      Write-Error "MQTT broker failed to start properly on port $MqttPort"
      return $null
    }
  } catch {
    Write-Error "Failed to start MQTT broker: $($_.Exception.Message)"
    return $null
  }
}

function Start-Backend {
  if ($SkipBackend) {
    Write-Warning "Skipping backend (-SkipBackend)"
    return $null
  }
  
  Write-Step "Starting backend server..."
  try {
    Push-Location $BackendDir
    
    # Install dependencies if needed
    if (-not (Test-Path 'node_modules')) {
      Write-Step "Installing backend dependencies..."
      & npm install
    }
    
    # Set environment variables
    $env:PORT = $BackendPort
    $env:NODE_ENV = if ($ProdMode) { 'production' } else { 'development' }
    
    # Start backend with proper title and directory
    $backendScript = if ($ProdMode) { 'start' } else { 'dev' }
    $backendCmd = "title RFID Backend Server && cd /d `"$BackendDir`" && npm run $backendScript"
    $backendProc = Start-Process -FilePath 'cmd.exe' -ArgumentList "/k", $backendCmd -WindowStyle Normal -PassThru
    
    Pop-Location
    
    # Wait for backend to start
    if (Wait-ForPort -Port $BackendPort -HostName $NetworkIP -TimeoutSeconds 30) {
      Write-Success "Backend server started (PID: $($backendProc.Id))"
      return $backendProc
    } else {
      Write-Error "Backend server failed to start properly"
      return $null
    }
  } catch {
    Write-Error "Failed to start backend: $($_.Exception.Message)"
    Pop-Location
    return $null
  }
}

function Start-Frontend {
  if ($SkipFrontend) {
    Write-Warning "Skipping frontend (-SkipFrontend)"
    return $null
  }
  
  Write-Step "Starting frontend server..."
  try {
    Push-Location $FrontendDir
    
    # Install dependencies if needed
    if (-not (Test-Path 'node_modules')) {
      Write-Step "Installing frontend dependencies..."
      & npm install
    }
    
    # Handle production vs development mode
    if ($ProdMode) {
      # For production, build first if dist doesn't exist
      if (-not (Test-Path 'dist')) {
        Write-Step "Building frontend for production..."
        & npm run build
        if ($LASTEXITCODE -ne 0) {
          Write-Warning "Frontend build failed, falling back to development mode..."
          $frontendScript = 'dev'
        } else {
          $frontendScript = 'preview'
        }
      } else {
        $frontendScript = 'preview'
      }
    } else {
      $frontendScript = 'dev'
    }
    
    Write-Step "Starting frontend with '$frontendScript' script..."
    $frontendCmd = "title RFID Frontend Server && cd /d `"$FrontendDir`" && npm run $frontendScript"
    $frontendProc = Start-Process -FilePath 'cmd.exe' -ArgumentList "/k", $frontendCmd -WindowStyle Normal -PassThru
    
    Pop-Location
    
    # Wait for frontend to start
    if (Wait-ForPort -Port $FrontendPort -HostName $NetworkIP -TimeoutSeconds 30) {
      Write-Success "Frontend server started (PID: $($frontendProc.Id))"
      return $frontendProc
    } else {
      Write-Error "Frontend server failed to start properly"
      return $null
    }
  } catch {
    Write-Error "Failed to start frontend: $($_.Exception.Message)"
    Pop-Location
    return $null
  }
}

function Start-MqttMonitor {
  if ($NoMqtt) { return $null }
  
  Write-Step "Starting MQTT monitor..."
  try {
    $monitorCmd = "mosquitto_sub -h $NetworkIP -p $MqttPort -t `"rfid/#`" -v"
    $monitorProc = Start-Process -FilePath 'cmd.exe' -ArgumentList "/k", "title MQTT Monitor && $monitorCmd" -WindowStyle Normal -PassThru
    Write-Success "MQTT monitor started on port $MqttPort (PID: $($monitorProc.Id))"
    return $monitorProc
  } catch {
    Write-Warning "Failed to start MQTT monitor: $($_.Exception.Message)"
    return $null
  }
}

function Start-DatabaseConsole {
  Write-Step "Starting database console..."
  try {
    $dbCmd = "psql -h `"$DbHost`" -p $DbPort -U `"$DbUser`" -d `"$DbName`""
    $dbProc = Start-Process -FilePath 'cmd.exe' -ArgumentList "/k", "title Database Console && $dbCmd" -WindowStyle Normal -PassThru
    Write-Success "Database console started (PID: $($dbProc.Id))"
    return $dbProc
  } catch {
    Write-Warning "Failed to start database console: $($_.Exception.Message)"
    return $null
  }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Header "RFID Tapping System Launcher" 'Green'
Write-Host "Network IP: $NetworkIP" -ForegroundColor White
Write-Host "Database: $DbHost`:$DbPort/$DbName" -ForegroundColor White
Write-Host "Mode: $(if ($ProdMode) { 'Production' } else { 'Development' })" -ForegroundColor White

# Preflight checks
Write-Header "Preflight Checks"
try {
  Ensure-Command 'psql'
  Ensure-Command 'npm'
  Ensure-Command 'node'
  
  if (-not (Test-Path $BackendDir))  { throw "Backend directory not found: $BackendDir" }
  if (-not (Test-Path $FrontendDir)) { throw "Frontend directory not found: $FrontendDir" }
  
  Write-Success "All dependencies verified"
} catch {
  Write-Error "Preflight check failed: $($_.Exception.Message)"
  exit 1
}

# Configuration update
Write-Header "Configuration"
Update-Configuration

# Service startup
Write-Header "Starting Services"
$processes = @()

# 1. Clean up any existing MQTT processes first
Stop-ExistingMqttProcesses

# 2. Start MQTT broker with your specific config file
Write-Step "Step 1: Starting MQTT Broker..."
$mqttProc = Start-MqttBroker
if ($mqttProc) { 
  $processes += $mqttProc
  Write-Success "MQTT Broker ready - proceeding to database initialization"
} else {
  Write-Error "MQTT Broker failed to start - cannot proceed"
  exit 1
}

# 3. Initialize database after MQTT is running
Write-Header "Database Initialization"
try {
  Write-Step "Step 2: Initializing Database..."
  if (-not $NoInitDb) {
    Ensure-Database
    Initialize-Database
  } else {
    Ensure-Database
  }
  Write-Success "Database ready - proceeding to backend"
} catch {
  Write-Error "Database initialization failed: $($_.Exception.Message)"
  exit 1
}

# 4. Start backend server
Write-Step "Step 3: Starting Backend Server..."
$backendProc = Start-Backend  
if ($backendProc) { 
  $processes += $backendProc
  Write-Success "Backend ready - proceeding to frontend"
} else {
  Write-Error "Backend failed to start"
}

# 5. Start frontend server
Write-Step "Step 4: Starting Frontend Server..."
$frontendProc = Start-Frontend
if ($frontendProc) { 
  $processes += $frontendProc
  Write-Success "Frontend ready - all core services started"
} else {
  Write-Error "Frontend failed to start"
}

$dbProc = Start-DatabaseConsole
if ($dbProc) { $processes += $dbProc }

# ============================================================================
# STATUS SUMMARY
# ============================================================================

Write-Header "RFID System Status" 'Green'

# Service status
$services = @(
  @{ Name = "Database"; Status = "✅ Connected"; Details = "$DbHost`:$DbPort/$DbName" }
  @{ Name = "MQTT Broker"; Status = if ($mqttProc -or (Test-Port -Port $MqttPort -HostName $NetworkIP)) { "✅" } else { "❌" }; Details = "$NetworkIP`:$MqttPort" }
  @{ Name = "Backend API"; Status = if ($backendProc -or (Test-Port -Port $BackendPort -HostName $NetworkIP)) { "✅" } else { "❌" }; Details = "$NetworkIP`:$BackendPort" }
  @{ Name = "Frontend UI"; Status = if ($frontendProc -or (Test-Port -Port $FrontendPort -HostName $NetworkIP)) { "✅" } else { "❌" }; Details = "$NetworkIP`:$FrontendPort" }
  @{ Name = "MQTT Monitor"; Status = if ($monitorProc) { "✅" } else { "⚠️" }; Details = "Real-time console" }
  @{ Name = "DB Console"; Status = if ($dbProc) { "✅" } else { "⚠️" }; Details = "SQL query interface" }
)

foreach ($service in $services) {
  $status = if ($service.Status -match "✅") { "Running" } elseif ($service.Status -match "❌") { "Failed" } else { "Optional" }
  Write-Host ("{0} {1}: {2} ({3})" -f $service.Status, $service.Name, $status, $service.Details) -ForegroundColor $(
    if ($status -eq "Running") { "Green" } 
    elseif ($status -eq "Failed") { "Red" } 
    else { "Yellow" }
  )
}

Write-Host ""
Write-Header "Access URLs" 'Cyan'
Write-Host "🌐 Frontend Web App: http://$NetworkIP`:$FrontendPort" -ForegroundColor White
Write-Host "🔧 Backend API: http://$NetworkIP`:$BackendPort" -ForegroundColor White
Write-Host "📊 Health Check: http://$NetworkIP`:$BackendPort/health" -ForegroundColor White
Write-Host "📈 Analytics: http://$NetworkIP`:$FrontendPort/analytics" -ForegroundColor White
Write-Host "⚙️  Admin Panel: http://$NetworkIP`:$FrontendPort/admin" -ForegroundColor White

Write-Host ""
Write-Header "MQTT Testing" 'Cyan'
Write-Host "📡 Publish test message:" -ForegroundColor White
Write-Host "   mosquitto_pub -h $NetworkIP -p $MqttPort -t `"rfid/test`" -m `"{\\`"test\\`":\\`"message\\`"}`"" -ForegroundColor Gray
Write-Host "📨 Subscribe to messages:" -ForegroundColor White  
Write-Host "   mosquitto_sub -h $NetworkIP -p $MqttPort -t `"rfid/#`" -v" -ForegroundColor Gray

Write-Host ""
Write-Host "🚀 RFID System is ready! All services are running." -ForegroundColor Green
Write-Host "📱 Connect your ESP8266 devices to: $NetworkIP" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press ENTER to stop all services and cleanup..." -ForegroundColor Yellow
[void](Read-Host)

# ============================================================================
# CLEANUP
# ============================================================================

Write-Header "Shutting Down Services" 'Magenta'

# Stop all processes
foreach ($proc in $processes) {
  if ($proc -and -not $proc.HasExited) {
    try { 
      Write-Step "Stopping process PID: $($proc.Id)"
      Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
      Write-Success "Process $($proc.Id) stopped"
    } catch {
      Write-Warning "Failed to stop process $($proc.Id): $($_.Exception.Message)"
    }
  }
}

# Clean up any remaining mosquitto processes
Write-Step "Cleaning up any remaining MQTT processes..."
try {
  Get-Process -Name "mosquitto" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
} catch {
  # Ignore errors - processes may already be stopped
}

# Database cleanup
Remove-Database

Write-Header "Cleanup Complete" 'Green'
Write-Host "All services stopped. Thank you for using RFID Tapping System! 🎯" -ForegroundColor Green