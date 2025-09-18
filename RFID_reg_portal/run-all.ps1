param(
  [string] $DbName      = "rfidn",
  [string] $DbHost      = "localhost",
  [int]    $DbPort      = 5432,
  [string] $DbUser      = "postgres",
  [string] $PGPASSWORD  = 'Gana11602',
  [switch] $NoInitDb,            # skip running schema.sql
  [switch] $NoDropDb,            # keep database on exit
  [switch] $BackendOnly,         # only start backend
  [switch] $FrontendOnly,        # only start frontend
  [int]    $BackendPortOverride  # optional override for backend PORT env
)

$ErrorActionPreference = "Stop"

# --- Paths ---------------------------------------------------------------
$Root         = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir   = Join-Path $Root "Backend"
$FrontendDir  = Join-Path $Root "frontend"
$LogDir       = Join-Path $Root "logs"
$null = New-Item -ItemType Directory -Force -Path $LogDir -ErrorAction SilentlyContinue

# Prefer Database/schema.sql; fallback to legacy migration if needed
$SchemaCandidates = @(
  (Join-Path $Root         "Database\schema.sql"),
  (Join-Path $BackendDir   "server\db\migrations\2025-09-18_game_lite.sql")
)
$SchemaFile = $SchemaCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

# --- Helpers -------------------------------------------------------------
function Invoke-PSql {
  param([string]$Command, [string]$Database = "")
  $args = @("-h", $DbHost, "-p", $DbPort, "-U", $DbUser)
  if ($Database) { $args += @("-d", $Database) }
  $args += @("-v", "ON_ERROR_STOP=1", "-c", $Command)
  & psql @args
}

function Run-File {
  param([string]$File, [string]$Database = "")
  $args = @("-h", $DbHost, "-p", $DbPort, "-U", $DbUser)
  if ($Database) { $args += @("-d", $Database) }
  $args += @("-v", "ON_ERROR_STOP=1", "-f", $File)
  & psql @args
}

function Ensure-PSql {
  if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw "psql not found on PATH. Install PostgreSQL client tools or add psql to PATH."
  }
}

function Ensure-Database {
  Write-Host "> Ensuring database '$DbName' exists..." -ForegroundColor Cyan
  $exists = (& psql -h $DbHost -p $DbPort -U $DbUser -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'") -eq "1"
  if (-not $exists) {
    Invoke-PSql "CREATE DATABASE $DbName;"
    Write-Host "  created." -ForegroundColor Green
  } else {
    Write-Host "  already exists." -ForegroundColor DarkGray
  }
}

function Init-Database {
  if ($NoInitDb) { Write-Host "> Skipping DB init (-NoInitDb)" -ForegroundColor Yellow; return }
  if (-not $SchemaFile) { throw "No schema file found. Looked for: $($SchemaCandidates -join ', ')" }
  Write-Host "> Applying schema from '$SchemaFile' to '$DbName'..." -ForegroundColor Cyan
  Run-File -File $SchemaFile -Database $DbName
  Write-Host "  schema applied." -ForegroundColor Green
}

function Drop-Database {
  Write-Host "> Dropping database '$DbName'..." -ForegroundColor Magenta
  Invoke-PSql "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DbName' AND pid <> pg_backend_pid();"
  Invoke-PSql "DROP DATABASE IF EXISTS $DbName;"
  Write-Host "  dropped." -ForegroundColor Green
}

function Start-Proc {
  param([string]$WorkDir, [string[]]$Args, [string]$LogFile)
  $npmCmd = (Get-Command npm -ErrorAction SilentlyContinue)
  if (-not $npmCmd) { throw "npm not found on PATH. Install Node.js or open a Node-enabled shell." }
  $npmPath = $npmCmd.Path
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName               = $npmPath
  $psi.Arguments              = ($Args -join " ")
  $psi.WorkingDirectory       = $WorkDir
  $psi.UseShellExecute        = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError  = $true
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  [void]$p.Start()
  # async log piping
  $stdOutWriter = [System.IO.StreamWriter]::new($LogFile, $true)
  $p.BeginOutputReadLine()
  $p.BeginErrorReadLine()
  $p.add_OutputDataReceived({ param($s,$e) if ($e.Data) { $stdOutWriter.WriteLine($e.Data) } })
  $p.add_ErrorDataReceived({ param($s,$e) if ($e.Data) { $stdOutWriter.WriteLine($e.Data) } })
  return @{ Proc = $p; Log = $LogFile }
}

# --- Preflight -----------------------------------------------------------
Ensure-PSql
if ($env:PGPASSWORD) { Write-Host "> Using PGPASSWORD from env." -ForegroundColor DarkGray }

# --- DB lifecycle --------------------------------------------------------
Ensure-Database
Init-Database

# --- Processes -----------------------------------------------------------
$backend = $null
$frontend = $null

# backend
if (-not $FrontendOnly) {
  $backendLog = Join-Path $LogDir "backend.log"
  if ($BackendPortOverride) {
    Write-Host "> Starting backend on PORT=$BackendPortOverride ..." -ForegroundColor Cyan
    $env:PORT = $BackendPortOverride
  } else {
    Write-Host "> Starting backend (PORT from .env)..." -ForegroundColor Cyan
  }
  $backend = Start-Proc -WorkDir $BackendDir -Args @("run","start") -LogFile $backendLog
  Write-Host "  backend pid: $($backend.Proc.Id) (logs -> $backendLog)" -ForegroundColor DarkGray
}

# frontend
if (-not $BackendOnly) {
  $frontendLog = Join-Path $LogDir "frontend.log"
  Write-Host "> Starting frontend (Vite dev server)..." -ForegroundColor Cyan
  $frontend = Start-Proc -WorkDir $FrontendDir -Args @("run","dev") -LogFile $frontendLog
  Write-Host "  frontend pid: $($frontend.Proc.Id) (logs -> $frontendLog)" -ForegroundColor DarkGray
}

Write-Host "" 
Write-Host "[OK] Stack is running." -ForegroundColor Green
$apiPort = if ($BackendPortOverride) { $BackendPortOverride } elseif ($env:PORT) { $env:PORT } else { 4000 }
if ($backend -ne $null)  { Write-Host ("  API:      http://localhost:{0}/api" -f $apiPort) }
if ($frontend -ne $null) { Write-Host "  Frontend: http://localhost:5173" }
Write-Host "Press Ctrl+C to stop..." -ForegroundColor Yellow
Write-Host ""

try {
  $ids = @()
  if ($backend -ne $null)  { $ids += $backend.Proc.Id }
  if ($frontend -ne $null) { $ids += $frontend.Proc.Id }
  if ($ids.Count -gt 0) { Wait-Process -Id $ids }
}
finally {
  Write-Host "`n[STOP] Stopping..." -ForegroundColor Yellow
  foreach ($p in @($backend.Proc, $frontend.Proc)) {
    if ($p -and -not $p.HasExited) {
      try { $p.Kill() } catch {}
    }
  }

  if (-not $NoDropDb) {
    try { Drop-Database } catch { Write-Warning ("Drop failed: {0}" -f $_.Exception.Message) }
  } else {
    Write-Host "> Keeping database '$DbName' (-NoDropDb specified)." -ForegroundColor Cyan
  }

  Write-Host "Done." -ForegroundColor Green
}