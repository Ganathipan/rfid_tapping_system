# ============================================================================
# RFID Tapping System - Local Deployment Script
# ============================================================================
# 
# FIRST TIME USERS: Edit the configuration variables below (lines 10-20)
# Then run this script: .\deploy-local.ps1
#
# ============================================================================

# ============================================================================
# CONFIGURATION - EDIT THESE VALUES
# ============================================================================
# Change these values to match your environment
$DbName = 'rfid'                    # Database name
$DbHost = 'localhost'               # Database host  
$DbPort = 5432                      # Database port
$DbUser = 'postgres'                # Database user
$PgPassword = 'Gana11602'           # Database password (CHANGE THIS!)

$NetworkIP = 'localhost'            # Network IP for services
$BackendPort = 4000                 # Backend API port
$FrontendPort = 5173                # Frontend dev server port
$MqttPort = 1883                    # MQTT broker port

# ============================================================================
# ADVANCED OPTIONS (Optional - uncomment to use)
# ============================================================================
# $NoInitDb = $true                 # Skip database initialization
# $NoDropDb = $true                 # Don't drop existing database
# $NoMqtt = $true                   # Skip MQTT broker startup
# $SkipFrontend = $true             # Don't start frontend
# $SkipBackend = $true              # Don't start backend
# $ProdMode = $true                 # Run in production mode
# $NoConfig = $true                 # Skip config file generation

# ============================================================================
# DO NOT EDIT BELOW THIS LINE - Script implementation starts here
# ============================================================================

$env:PGPASSWORD = $PgPassword
$ErrorActionPreference = 'Stop'

# --- Color Output Functions ---
function Write-Header {
  param([string]$Message)
  Write-Host "`n============================================================================" -ForegroundColor Cyan
  Write-Host $Message -ForegroundColor Cyan
  Write-Host "============================================================================`n" -ForegroundColor Cyan
}

function Write-Step {
  param([string]$Message)
  Write-Host "▶ $Message" -ForegroundColor Yellow
}

function Write-Success {
  param([string]$Message)
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warning {
  param([string]$Message)
  Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Error {
  param([string]$Message)
  Write-Host "[ERROR] $Message" -ForegroundColor Red
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
$MosquittoPath = $MosquittoPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

# ============================================================================
# MAIN EXECUTION
# ============================================================================

Write-Header "RFID Tapping System - Local Deployment"

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
      psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS $DbName" 2>&1 | Out-Null
      Write-Success "Database dropped (if existed)"
    }
    catch {
      Write-Warning "Could not drop database: $_"
    }
  }
  
  # Create database
  Write-Step "Creating database '$DbName'..."
  try {
    psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE $DbName" 2>&1 | Out-Null
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

Write-Host "To stop all services:" -ForegroundColor Yellow
Write-Host "  - Close the backend and frontend PowerShell windows" -ForegroundColor Gray
Write-Host "  - Stop Mosquitto (requires admin): taskkill /IM mosquitto.exe /F" -ForegroundColor Gray
Write-Host "    Or run PowerShell as Administrator and use: Get-Process mosquitto | Stop-Process" -ForegroundColor Gray
Write-Host ""
