# ============================================================================
# RFID Tapping System - Local Deployment Configuration
# ============================================================================
# Edit these variables to configure your local deployment
# Then run: .\start-local.ps1
# ============================================================================

# DATABASE CONFIGURATION
# ============================================================================
$DbName = 'rfid'                    # Database name
$DbHost = 'localhost'               # Database host
$DbPort = 5432                      # Database port
$DbUser = 'postgres'                # Database user
$PgPassword = 'New1'                # Database password (change this!)

# NETWORK CONFIGURATION
# ============================================================================
$NetworkIP = 'localhost'            # Network IP for services
$BackendPort = 4000                 # Backend API port
$FrontendPort = 5173                # Frontend dev server port
$MqttPort = 1883                    # MQTT broker port

# DEPLOYMENT OPTIONS
# ============================================================================
# Uncomment and set these switches to customize deployment behavior

# $NoInitDb = $true                 # Skip database initialization
# $NoDropDb = $true                 # Don't drop existing database
# $NoMqtt = $true                   # Skip MQTT broker startup
# $SkipFrontend = $true             # Don't start frontend
# $SkipBackend = $true              # Don't start backend
# $ProdMode = $true                 # Run in production mode
# $NoConfig = $true                 # Skip config file generation

# ============================================================================
# LAUNCH THE SYSTEM
# ============================================================================
# Execute the main deployment script with configured parameters
# ============================================================================

$params = @{
  DbName = $DbName
  DbHost = $DbHost
  DbPort = $DbPort
  DbUser = $DbUser
  PgPassword = $PgPassword
  NetworkIP = $NetworkIP
  BackendPort = $BackendPort
  FrontendPort = $FrontendPort
  MqttPort = $MqttPort
}

# Add switches if they are set
if ($NoInitDb) { $params.NoInitDb = $true }
if ($NoDropDb) { $params.NoDropDb = $true }
if ($NoMqtt) { $params.NoMqtt = $true }
if ($SkipFrontend) { $params.SkipFrontend = $true }
if ($SkipBackend) { $params.SkipBackend = $true }
if ($ProdMode) { $params.ProdMode = $true }
if ($NoConfig) { $params.NoConfig = $true }

# Get script directory and launch main script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MainScript = Join-Path $ScriptDir 'start-local.ps1'

& $MainScript @params
