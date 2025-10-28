# Project Cleanup Script - RFID Tapping System
Write-Host "RFID Tapping System - Project Cleanup" -ForegroundColor Cyan

$projectRoot = "d:\UOP_Files\Academics\Semester04\2YP_Project\prototype\rfid_tapping_system"
Set-Location $projectRoot

Write-Host "Analyzing current project structure..." -ForegroundColor Yellow

# Count current files and folders
$fileCount = (Get-ChildItem -Recurse -File | Measure-Object).Count
$folderCount = (Get-ChildItem -Recurse -Directory | Measure-Object).Count
Write-Host "Current: $fileCount files, $folderCount folders" -ForegroundColor Gray

Write-Host "Removing unwanted files and folders..." -ForegroundColor Yellow

# Remove coverage directories (generated files)
if (Test-Path "apps\backend\coverage") {
    Remove-Item "apps\backend\coverage" -Recurse -Force
    Write-Host "Removed backend coverage folder" -ForegroundColor Green
}

if (Test-Path "apps\frontend\coverage") {
    Remove-Item "apps\frontend\coverage" -Recurse -Force
    Write-Host "Removed frontend coverage folder" -ForegroundColor Green
}

# Remove duplicate test package.json files
$testPackageFiles = @(
    "apps\backend\tests\package.json",
    "apps\frontend\tests\package.json"
)

foreach ($file in $testPackageFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Removed duplicate test package.json: $file" -ForegroundColor Green
    }
}

# Remove editor temp files
Get-ChildItem -Recurse -Filter "*.tmp" | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Recurse -Filter "*~" | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Recurse -Filter ".DS_Store" | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "Organizing documentation..." -ForegroundColor Yellow

# Ensure proper doc structure exists
$docsStructure = @(
    "docs\api",
    "docs\deployment", 
    "docs\development",
    "docs\hardware"
)

foreach ($dir in $docsStructure) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created docs folder: $dir" -ForegroundColor Green
    }
}

# Move architecture docs to proper location
if (Test-Path "docs\architecture") {
    Get-ChildItem "docs\architecture\*" | Move-Item -Destination "docs\development\" -Force -ErrorAction SilentlyContinue
    Remove-Item "docs\architecture" -Force -ErrorAction SilentlyContinue
    Write-Host "Moved architecture docs to development folder" -ForegroundColor Green
}

# Move testing docs to development
if (Test-Path "docs\testing") {
    Get-ChildItem "docs\testing\*" | Move-Item -Destination "docs\development\" -Force -ErrorAction SilentlyContinue
    Remove-Item "docs\testing" -Force -ErrorAction SilentlyContinue
    Write-Host "Moved testing docs to development folder" -ForegroundColor Green
}

Write-Host "Organizing firmware..." -ForegroundColor Yellow

# Clean up firmware structure
if (Test-Path "firmware\config\reader-1-config.h" -and Test-Path "firmware\config\reader-2-config.h") {
    New-Item -ItemType Directory -Path "firmware\examples" -Force | Out-Null
    Move-Item "firmware\config\reader-1-config.h" "firmware\examples\" -Force -ErrorAction SilentlyContinue
    Move-Item "firmware\config\reader-2-config.h" "firmware\examples\" -Force -ErrorAction SilentlyContinue
    Write-Host "Moved sample configs to examples folder" -ForegroundColor Green
}

# Count final files and folders
$finalFileCount = (Get-ChildItem -Recurse -File | Measure-Object).Count
$finalFolderCount = (Get-ChildItem -Recurse -Directory | Measure-Object).Count

$filesRemoved = $fileCount - $finalFileCount
$foldersRemoved = $folderCount - $finalFolderCount

Write-Host ""
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "Files removed: $filesRemoved" -ForegroundColor Cyan
Write-Host "Folders removed: $foldersRemoved" -ForegroundColor Cyan
Write-Host "Final: $finalFileCount files, $finalFolderCount folders" -ForegroundColor Cyan

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow  
Write-Host "1. Run npm run install:all" -ForegroundColor Gray
Write-Host "2. Run tests to verify" -ForegroundColor Gray
Write-Host "3. Commit changes" -ForegroundColor Gray