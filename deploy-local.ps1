param(
  [string] $DbName = 'rfid',
  [string] $DbHost = 'localhost',       # Change this to your actual database host
  [int]    $DbPort = 5432,              # Port for PostgreSQL database
  [string] $DbUser = 'rfidDatabase',    # Change this to your actual rfid database user
  [string] $PgPassword = 'ChangeMe',    # Change this to your actual rfid database password
  [string] $NetworkIP = 'localhost',    # Change this to your machine's network IP if needed
  [int]    $BackendPort = 4000,         # Port for backend server
  [int]    $FrontendPort = 5173,        # Port for frontend server
  [int]    $MqttPort = 1883,            # Port for MQTT broker
  [switch] $NoInitDb,
  [switch] $NoDropDb,
  [switch] $NoMqtt,
  [switch] $SkipFrontend,
  [switch] $SkipBackend,
  [switch] $ProdMode,
  [switch] $NoConfig
)

# ============================================================================
# RFID Tapping System - Local Deployment Script
# ============================================================================
# This script launches all components of the RFID system:
# - PostgreSQL Database initialization
# - MQTT Broker (Mosquitto)
# - Backend API Server (Node.js/Express)
# - Frontend Web Application (React/Vite)
# 
# Usage: .\deploy-local.ps1 [-NoInitDb] [-NoDropDb] [-NoMqtt] [-SkipBackend] [-SkipFrontend] [-ProdMode] [-NoConfig]
# ============================================================================

$env:PGPASSWORD = $PgPassword
$ErrorActionPreference = 'Stop'

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Header($Message, $Color = 'Cyan') {
  Write-Host ""
  Write-Host ("=" * 76) -ForegroundColor $Color
  Write-Host " $Message" -ForegroundColor $Color
  Write-Host ("=" * 76) -ForegroundColor $Color
}

function Write-Step($Message, $Color = 'Yellow') {
  Write-Host ""
  Write-Host "> $Message" -ForegroundColor $Color
}

function Write-Success($Message) {
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warning($Message) {
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error($Message) {
  Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Ensure-Command($CommandName) {
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "$CommandName not found on PATH. Please install $CommandName first."
  }
}

function Test-Port($Port, $HostName = 'localhost') {
  try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.ReceiveTimeout = 3000
    $tcpClient.SendTimeout = 3000
    
    $connectTask = $tcpClient.ConnectAsync($HostName, $Port)
    $completed = $connectTask.Wait(3000)
    
    if ($completed -and $tcpClient.Connected) {
      $tcpClient.Close()
      return $true
    } else {
      $tcpClient.Close()
      return $false
    }
  } catch {
    return $false
  }
}

function Wait-ForPort($Port, $HostName = 'localhost', $TimeoutSeconds = 30) {
  $elapsed = 0
  Write-Step "Waiting for $HostName`:$Port to be available..."
  
  while ($elapsed -lt $TimeoutSeconds) {
    if (Test-Port -Port $Port -HostName $HostName) {
      Write-Host ""
      Write-Success "Service available on $HostName`:$Port"
      return $true
    }
    Start-Sleep -Milliseconds 500
    $elapsed += 0.5
    Write-Host "." -NoNewline -ForegroundColor DarkGray
    
    if (($elapsed % 5) -eq 0) {
      Write-Host " ($elapsed/$TimeoutSeconds)s" -NoNewline -ForegroundColor DarkGray
    }
  }
  
  Write-Host ""
  Write-Error "Timeout waiting for $HostName`:$Port after $TimeoutSeconds seconds"
  return $false
}

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
# MAIN EXECUTION
# ============================================================================

Write-Header "RFID Tapping System - Local Deployment" 'Green'
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

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Database:  ${DbHost}:${DbPort}/${DbName} (user: $DbUser)" -ForegroundColor Gray
Write-Host "  Backend:   http://$NetworkIP`:$BackendPort" -ForegroundColor Gray
Write-Host "  Frontend:  http://$NetworkIP`:$FrontendPort" -ForegroundColor Gray
Write-Host "  MQTT:      mqtt://$NetworkIP`:$MqttPort" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# STEP 1: Generate Configuration Files
# ============================================================================

if (-not $NoConfig) {
  Write-Header "Step 1: Generating Configuration Files"
  
  Write-Step "Running configuration generator..."
  
  # Set environment variables for config generation
  $env:DB_HOST = $DbHost
  $env:DB_PORT = $DbPort
  $env:DB_NAME = $DbName
  $env:DB_USER = $DbUser
  $env:DB_PASSWORD = $PgPassword
  $env:BACKEND_HOST = $NetworkIP
  $env:BACKEND_PORT = $BackendPort
  $env:FRONTEND_HOST = $NetworkIP
  $env:FRONTEND_PORT = $FrontendPort
  $env:MQTT_HOST = $NetworkIP
  $env:MQTT_PORT = $MqttPort
  
  try {
    Push-Location $Root
    npm run config:dev
    Write-Success "Configuration files generated"
  }
  catch {
    Write-Warning "Config generation failed (continuing anyway): $_"
  }
  finally {
    Pop-Location
  }
}
else {
  Write-Warning 'Skipping configuration generation (--NoConfig)'
}

# ============================================================================
# STEP 2: Initialize PostgreSQL Database
# ============================================================================

if (-not $NoInitDb) {
  Write-Header "Step 2: Initializing PostgreSQL Database"
  
  # Check if psql is available
  $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
  if (-not $psqlPath) {
    Write-Error "PostgreSQL 'psql' not found in PATH"
    Write-Host "Please install PostgreSQL and ensure 'psql' is in your PATH" -ForegroundColor Red
    exit 1
  }
  
  Write-Step "Checking PostgreSQL connection..."
  try {
    $null = psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "SELECT 1" 2>&1
    Write-Success "PostgreSQL is accessible"
  }
  catch {
    Write-Error "Cannot connect to PostgreSQL at ${DbHost}:${DbPort}"
    Write-Host "Ensure PostgreSQL is running and credentials are correct" -ForegroundColor Red
    exit 1
  }
  
  # Drop database if requested
  if (-not $NoDropDb) {
    Write-Step "Dropping existing database '$DbName' (if exists)..."
    try {
      # Terminate active connections first
      $null = psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DbName' AND pid <> pg_backend_pid();" 2>&1
      # Drop database
      psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS `"$DbName`"" 2>&1 | Out-Null
      Write-Success "Database dropped (if existed)"
    }
    catch {
      Write-Warning "Could not drop database: $_"
    }
  }
  
  # Create database
  Write-Step "Creating database '$DbName'..."
  try {
    psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE `"$DbName`"" 2>&1 | Out-Null
    Write-Success "Database '$DbName' created"
  }
  catch {
    Write-Warning "Database may already exist or creation failed: $_"
  }
  
  # Apply schema
  if ($SchemaFile) {
    Write-Step "Applying database schema from: $SchemaFile"
    try {
      Get-Content $SchemaFile | psql -h $DbHost -p $DbPort -U $DbUser -d $DbName 2>&1 | Out-Null
      Write-Success "Database schema applied"
    }
    catch {
      Write-Error "Failed to apply schema: $_"
      exit 1
    }
  }
  else {
    Write-Warning "No schema file found - skipping schema initialization"
  }
  
  # Apply seed data
  if ($SeedFile) {
    Write-Step "Loading seed data from: $SeedFile"
    try {
      Get-Content $SeedFile | psql -h $DbHost -p $DbPort -U $DbUser -d $DbName 2>&1 | Out-Null
      Write-Success "Seed data loaded"
    }
    catch {
      Write-Warning "Seed data loading failed: $_"
    }
  }
}
else {
  Write-Warning 'Skipping database initialization (--NoInitDb)'
}

# ============================================================================
# STEP 3: Start MQTT Broker (Mosquitto)
# ============================================================================

if (-not $NoMqtt) {
  Write-Header "Step 3: Starting MQTT Broker (Mosquitto)"
  
  if ($MosquittoPath) {
    Write-Step "Starting Mosquitto on port $MqttPort..."
    
    # Check if already running
    $existingMosquitto = Get-Process -Name mosquitto -ErrorAction SilentlyContinue
    if ($existingMosquitto) {
      Write-Warning "Mosquitto is already running (PID: $($existingMosquitto.Id))"
    }
    else {
      try {
        $mosquittoConf = Join-Path $InfraDir 'mosquitto\mosquitto.conf'
        if (Test-Path $mosquittoConf) {
          Start-Process -FilePath $MosquittoPath -ArgumentList "-c", $mosquittoConf, "-p", $MqttPort -WindowStyle Minimized
        }
        else {
          Start-Process -FilePath $MosquittoPath -ArgumentList "-p", $MqttPort -WindowStyle Minimized
        }
        Start-Sleep -Seconds 2
        Write-Success "Mosquitto started on port $MqttPort"
      }
      catch {
        Write-Error "Failed to start Mosquitto: $_"
        exit 1
      }
    }
  }
  else {
    Write-Warning "Mosquitto not found - please install from: https://mosquitto.org/download/"
    Write-Host "Expected locations:" -ForegroundColor Yellow
    $MosquittoPaths | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
  }
}
else {
  Write-Warning 'Skipping MQTT broker startup (--NoMqtt)'
}

# ============================================================================
# STEP 4: Start Backend API Server
# ============================================================================

if (-not $SkipBackend) {
  Write-Header "Step 4: Starting Backend API Server"
  
  if (-not (Test-Path $BackendDir)) {
    Write-Error "Backend directory not found: $BackendDir"
    exit 1
  }
  
  Write-Step "Installing backend dependencies..."
  Push-Location $BackendDir
  try {
    npm install 2>&1 | Out-Null
    Write-Success "Backend dependencies installed"
  }
  catch {
    Write-Warning "Backend npm install had issues: $_"
  }
  
  Write-Step "Starting backend server on port $BackendPort..."
  
  if ($ProdMode) {
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd $BackendDir; npm start" -WindowStyle Normal
  }
  else {
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd $BackendDir; npm run dev" -WindowStyle Normal
  }
  
  Pop-Location
  Write-Success "Backend server starting in new window"
  Write-Host "  URL: http://$NetworkIP`:$BackendPort" -ForegroundColor Gray
  
  # Wait for backend to start
  if (Wait-ForPort -Port $BackendPort -HostName $NetworkIP -TimeoutSeconds 30) {
    Write-Success "Backend server is responding"
  } else {
    Write-Warning "Backend server may not have started properly"
  }
}
else {
  Write-Warning 'Skipping backend startup (--SkipBackend)'
}

# ============================================================================
# STEP 5: Start Frontend Application
# ============================================================================

if (-not $SkipFrontend) {
  Write-Header "Step 5: Starting Frontend Application"
  
  if (-not (Test-Path $FrontendDir)) {
    Write-Error "Frontend directory not found: $FrontendDir"
    exit 1
  }
  
  Write-Step "Installing frontend dependencies..."
  Push-Location $FrontendDir
  try {
    npm install 2>&1 | Out-Null
    Write-Success "Frontend dependencies installed"
  }
  catch {
    Write-Warning "Frontend npm install had issues: $_"
  }
  
  Write-Step "Starting frontend dev server on port $FrontendPort..."
  
  if ($ProdMode) {
    Write-Step "Building frontend for production..."
    npm run build 2>&1 | Out-Null
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd $FrontendDir; npm run preview" -WindowStyle Normal
  }
  else {
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd $FrontendDir; npm run dev" -WindowStyle Normal
  }
  
  Pop-Location
  Write-Success "Frontend server starting in new window"
  Write-Host "  URL: http://$NetworkIP`:$FrontendPort" -ForegroundColor Gray
  
  # Wait for frontend to start
  if (Wait-ForPort -Port $FrontendPort -HostName $NetworkIP -TimeoutSeconds 30) {
    Write-Success "Frontend server is responding"
  } else {
    Write-Warning "Frontend server may not have started properly"
  }
}
else {
  Write-Warning 'Skipping frontend startup (--SkipFrontend)'
}

# ============================================================================
# COMPLETION
# ============================================================================

Write-Header "Deployment Complete!"

Write-Host "System URLs:" -ForegroundColor Cyan
Write-Host "  Frontend:  http://$NetworkIP`:$FrontendPort" -ForegroundColor Green
Write-Host "  Backend:   http://$NetworkIP`:$BackendPort" -ForegroundColor Green
Write-Host "  Database:  postgresql://$DbUser@${DbHost}:${DbPort}/${DbName}" -ForegroundColor Green
Write-Host "  MQTT:      mqtt://$NetworkIP`:$MqttPort" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Wait for backend and frontend to finish starting" -ForegroundColor Gray
Write-Host "  2. Open http://$NetworkIP`:$FrontendPort in your browser" -ForegroundColor Gray
Write-Host "  3. Check backend health at http://$NetworkIP`:$BackendPort/health" -ForegroundColor Gray
Write-Host ""

Write-Host "Press ENTER to stop all services and cleanup..." -ForegroundColor Yellow
[void](Read-Host)

# ============================================================================
# CLEANUP
# ============================================================================

Write-Header "Shutting Down Services" 'Magenta'

# Stop backend and frontend PowerShell windows
Write-Step "Stopping backend and frontend servers..."
try {
  $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
  if ($nodeProcesses) {
    Write-Step "Found $($nodeProcesses.Count) Node.js process(es), stopping them..."
    foreach ($nodeProc in $nodeProcesses) {
      try {
        Stop-Process -Id $nodeProc.Id -Force -ErrorAction Stop
        Write-Success "Stopped Node.js process PID: $($nodeProc.Id)"
      } catch {
        Write-Warning "Could not stop Node.js process PID $($nodeProc.Id): $($_.Exception.Message)"
      }
    }
  } else {
    Write-Success "No Node.js processes found"
  }
} catch {
  Write-Warning "Error checking Node.js processes: $($_.Exception.Message)"
}

# Stop PowerShell windows that were spawned
Write-Step "Closing spawned PowerShell windows..."
try {
  $currentPid = $PID
  $powershellProcesses = Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $currentPid }
  if ($powershellProcesses) {
    foreach ($psProc in $powershellProcesses) {
      try {
        Stop-Process -Id $psProc.Id -Force -ErrorAction Stop
        Write-Success "Stopped PowerShell process PID: $($psProc.Id)"
      } catch {
        Write-Warning "Could not stop PowerShell process PID $($psProc.Id): $($_.Exception.Message)"
      }
    }
  }
} catch {
  Write-Warning "Error checking PowerShell processes: $($_.Exception.Message)"
}

# Stop MQTT Broker (Mosquitto)
if (-not $NoMqtt) {
  Write-Step "Stopping MQTT broker..."
  try {
    $mqttProcesses = Get-Process -Name "mosquitto" -ErrorAction SilentlyContinue
    if ($mqttProcesses) {
      foreach ($mqttProc in $mqttProcesses) {
        try {
          Stop-Process -Id $mqttProc.Id -Force -ErrorAction Stop
          Write-Success "Stopped Mosquitto process PID: $($mqttProc.Id)"
        } catch {
          Write-Warning "Could not stop Mosquitto process PID $($mqttProc.Id): $($_.Exception.Message)"
          Write-Host "  Try running as Administrator or use: taskkill /IM mosquitto.exe /F" -ForegroundColor Yellow
        }
      }
    } else {
      Write-Success "No Mosquitto processes found"
    }
  } catch {
    Write-Warning "Error checking Mosquitto processes: $($_.Exception.Message)"
  }
}

# Drop database if requested
if (-not $NoDropDb) {
  Write-Step "Dropping database '$DbName'..."
  try {
    # Terminate active connections first
    $null = psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DbName' AND pid <> pg_backend_pid();" 2>&1
    # Drop database
    psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS `"$DbName`"" 2>&1 | Out-Null
    Write-Success "Database '$DbName' dropped successfully"
  } catch {
    Write-Warning "Could not drop database: $($_.Exception.Message)"
  }
} else {
  Write-Warning "Keeping database '$DbName' (-NoDropDb specified)"
}

Write-Host ""
Write-Header "Cleanup Complete" 'Green'
Write-Host "All services stopped. Thank you for using RFID Tapping System!" -ForegroundColor Green
Write-Host ""
