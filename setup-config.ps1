#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup Configuration for RFID Tapping System
.DESCRIPTION
    Interactive script to help users create and configure their .env file
.NOTES
    Usage: .\setup-config.ps1
#>

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     RFID Tapping System - Configuration Setup                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
$envFile = ".env"
$envExampleFile = ".env.example"

if (Test-Path $envFile) {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
    $editExisting = Read-Host "Do you want to reconfigure? (yes/no)"
    if ($editExisting -ne "yes") {
        Write-Host "Keeping existing .env file. Exiting." -ForegroundColor Yellow
        exit 0
    }
} else {
    if (Test-Path $envExampleFile) {
        Write-Host "ℹ Creating .env from .env.example..." -ForegroundColor Blue
        Copy-Item $envExampleFile $envFile
        Write-Host "✓ .env file created" -ForegroundColor Green
    } else {
        Write-Host "✗ Error: .env.example not found!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "CONFIGURATION QUESTIONNAIRE" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

# Function to update .env file
function Update-EnvValue {
    param(
        [string]$key,
        [string]$value
    )
    $content = Get-Content $envFile -Raw
    $pattern = "$key=.*"
    $replacement = "$key=$value"
    $newContent = $content -replace $pattern, $replacement
    Set-Content $envFile $newContent
}

# 1. Environment Mode
Write-Host "1. Environment Mode:" -ForegroundColor Yellow
Write-Host "   Options: development, staging, production" -ForegroundColor Gray
$env = Read-Host "   Select environment (default: development)" 
if ([string]::IsNullOrEmpty($env)) { $env = "development" }
Update-EnvValue "NODE_ENV" $env
Write-Host "   ✓ Set to: $env" -ForegroundColor Green
Write-Host ""

# 2. PostgreSQL Configuration
Write-Host "2. PostgreSQL Configuration:" -ForegroundColor Yellow
$dbHost = Read-Host "   Database host (default: localhost)"
if ([string]::IsNullOrEmpty($dbHost)) { $dbHost = "localhost" }
Update-EnvValue "DB_HOST" $dbHost
Write-Host "   ✓ Host: $dbHost" -ForegroundColor Green

$dbPort = Read-Host "   Database port (default: 5432)"
if ([string]::IsNullOrEmpty($dbPort)) { $dbPort = "5432" }
Update-EnvValue "DB_PORT" $dbPort
Write-Host "   ✓ Port: $dbPort" -ForegroundColor Green

$dbUser = Read-Host "   Database user (default: postgres)"
if ([string]::IsNullOrEmpty($dbUser)) { $dbUser = "postgres" }
Update-EnvValue "DB_USER" $dbUser
Write-Host "   ✓ User: $dbUser" -ForegroundColor Green

$dbPassword = Read-Host "   ⚠ Database password (IMPORTANT - change from default)" -AsSecureString
$dbPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($dbPassword)
)
if ([string]::IsNullOrEmpty($dbPasswordPlain)) { $dbPasswordPlain = "New1" }
Update-EnvValue "DB_PASSWORD" $dbPasswordPlain
Write-Host "   ✓ Password: ***" -ForegroundColor Green
Write-Host ""

# 3. Network Configuration
Write-Host "3. Network Configuration:" -ForegroundColor Yellow
$networkIp = Read-Host "   Network IP address (default: 192.168.8.2)"
if ([string]::IsNullOrEmpty($networkIp)) { $networkIp = "192.168.8.2" }
Update-EnvValue "NETWORK_IP" $networkIp
Update-EnvValue "BACKEND_HOST" $networkIp
Update-EnvValue "FRONTEND_HOST" $networkIp
Update-EnvValue "MQTT_HOST" $networkIp
Write-Host "   ✓ Network IP set to: $networkIp" -ForegroundColor Green
Write-Host ""

# 4. Backend Configuration
Write-Host "4. Backend Configuration:" -ForegroundColor Yellow
$backendPort = Read-Host "   Backend port (default: 4000)"
if ([string]::IsNullOrEmpty($backendPort)) { $backendPort = "4000" }
Update-EnvValue "BACKEND_PORT" $backendPort
Write-Host "   ✓ Backend port: $backendPort" -ForegroundColor Green
Write-Host ""

# 5. MQTT Configuration
Write-Host "5. MQTT Broker Configuration:" -ForegroundColor Yellow
$mqttPort = Read-Host "   MQTT port (default: 1883)"
if ([string]::IsNullOrEmpty($mqttPort)) { $mqttPort = "1883" }
Update-EnvValue "MQTT_PORT" $mqttPort
Write-Host "   ✓ MQTT port: $mqttPort" -ForegroundColor Green
Write-Host ""

# 6. WiFi Configuration
Write-Host "6. WiFi Configuration (for ESP8266 devices):" -ForegroundColor Yellow
$wifiSsid = Read-Host "   WiFi SSID (default: UoP_Dev)"
if ([string]::IsNullOrEmpty($wifiSsid)) { $wifiSsid = "UoP_Dev" }
Update-EnvValue "WIFI_SSID" $wifiSsid
Write-Host "   ✓ WiFi SSID: $wifiSsid" -ForegroundColor Green

$wifiPassword = Read-Host "   WiFi password (default: s6RBwfAB7H)" -AsSecureString
$wifiPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($wifiPassword)
)
if ([string]::IsNullOrEmpty($wifiPasswordPlain)) { $wifiPasswordPlain = "s6RBwfAB7H" }
Update-EnvValue "WIFI_PASSWORD" $wifiPasswordPlain
Write-Host "   ✓ WiFi password: ***" -ForegroundColor Green
Write-Host ""

# 7. Security Configuration
Write-Host "7. Security Configuration:" -ForegroundColor Yellow
$adminKey = Read-Host "   Game Lite admin key (default: dev-admin-key-2024)"
if ([string]::IsNullOrEmpty($adminKey)) { $adminKey = "dev-admin-key-2024" }
Update-EnvValue "GAMELITE_ADMIN_KEY" $adminKey
Write-Host "   ✓ Admin key set" -ForegroundColor Green

if ($env -eq "production") {
    Write-Host "   ⚠ Production mode detected - setting secure session" -ForegroundColor Yellow
    Update-EnvValue "SESSION_SECURE" "true"
    Update-EnvValue "DB_SSL" "true"
}
Write-Host ""

# Summary
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "CONFIGURATION COMPLETE!" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""
Write-Host "✓ Configuration saved to: .env" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review .env file for any additional customizations" -ForegroundColor Gray
Write-Host "  2. Run: docker-compose -f infra/docker-compose.yml up -d" -ForegroundColor Gray
Write-Host "  3. Monitor logs: docker-compose logs -f" -ForegroundColor Gray
Write-Host ""
Write-Host "For more information, see CONFIG_GUIDE.md" -ForegroundColor Cyan
Write-Host ""

# Display .env file
Write-Host "Current .env configuration:" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray
Get-Content $envFile | Where-Object { $_ -notmatch "^#" -and $_ -notmatch "^$" } | 
    ForEach-Object {
        if ($_ -match "PASSWORD") {
            $_ -replace "=.*", "=***"
        } else {
            $_
        }
    }
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray
