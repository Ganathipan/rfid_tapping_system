param(
    [switch]$Deep
)

Write-Host "RFID System Cleanup Script" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

# Change to parent directory since script is now in scripts folder
Set-Location ..
$cleanupItems = @()

# Define cleanup targets (now relative to project root)
$nodePaths = @(
    "node_modules",
    "apps/backend/node_modules",
    "apps/frontend/node_modules"
)

$buildPaths = @(
    "dist",
    "build", 
    "apps/frontend/dist",
    "apps/backend/dist",
    "coverage"
)

$cachePaths = @(
    ".cache",
    ".vite",
    ".next",
    ".nuxt",
    "apps/frontend/.cache",
    "apps/frontend/.vite"
)

$tempPaths = @(
    "tmp",
    "temp", 
    "logs",
    "*.log",
    "*.tmp"
)

$backupPaths = @(
    "*.backup.*",
    "*~",
    "*.bak"
)

$systemPaths = @(
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini"
)

# Function to remove paths
function Remove-CleanupPaths {
    param($paths, $category)
    
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Cleaning $category..." -ForegroundColor Yellow
    $removed = 0
    
    foreach ($pattern in $paths) {
        if ($pattern.Contains("*")) {
            # Handle wildcard patterns
            $items = Get-ChildItem -Path . -Recurse -Filter $pattern -Force -ErrorAction SilentlyContinue
            foreach ($item in $items) {
                try {
                    Remove-Item $item.FullName -Recurse -Force
                    Write-Host "  [OK] Removed: $($item.FullName)" -ForegroundColor Green
                    $script:cleanupItems += $item.FullName
                    $removed++
                } catch {
                    Write-Host "  [ERROR] Failed to remove: $($item.FullName)" -ForegroundColor Red
                }
            }
        } else {
            # Handle direct paths
            if (Test-Path $pattern) {
                try {
                    $size = if (Test-Path $pattern -PathType Container) { 
                        (Get-ChildItem $pattern -Recurse -Force | Measure-Object -Property Length -Sum).Sum 
                    } else { 
                        (Get-Item $pattern).Length 
                    }
                    $sizeStr = if ($size -gt 1MB) { "{0:N1} MB" -f ($size / 1MB) } else { "{0:N0} KB" -f ($size / 1KB) }
                    
                    Remove-Item $pattern -Recurse -Force
                    Write-Host "  [OK] Removed: $pattern ($sizeStr)" -ForegroundColor Green
                    $script:cleanupItems += $pattern
                    $removed++
                } catch {
                    Write-Host "  [ERROR] Failed to remove: $pattern" -ForegroundColor Red
                }
            }
        }
    }
    
    if ($removed -eq 0) {
        Write-Host "  [INFO] No $category found" -ForegroundColor Gray
    } else {
        Write-Host "  [SUMMARY] Removed $removed items" -ForegroundColor Cyan
    }
}

# Perform cleanup
Remove-CleanupPaths $nodePaths "Node Modules"
Remove-CleanupPaths $buildPaths "Build Artifacts" 
Remove-CleanupPaths $backupPaths "Backup Files"

if ($Deep) {
    Remove-CleanupPaths $cachePaths "Cache Files"
    Remove-CleanupPaths $tempPaths "Temporary Files"
    Remove-CleanupPaths $systemPaths "System Files"
}

# Summary
Write-Host ""
Write-Host "Cleanup Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

if ($cleanupItems.Count -gt 0) {
    Write-Host "[SUCCESS] Removed $($cleanupItems.Count) items:" -ForegroundColor Green
    $cleanupItems | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
} else {
    Write-Host "[INFO] No items needed cleanup - project is already clean!" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[COMPLETE] Cleanup finished successfully!" -ForegroundColor Green
Write-Host "Tips to prevent future bloat:" -ForegroundColor Yellow
Write-Host "   - Run npm run clean regularly" -ForegroundColor Gray  
Write-Host "   - Use .gitignore to exclude unwanted files" -ForegroundColor Gray
Write-Host "   - Clear browser cache periodically" -ForegroundColor Gray

# Optional: Show current project size
if ($Deep) {
    Write-Host ""
    Write-Host "Current project size:" -ForegroundColor Cyan
    try {
        $projectSize = (Get-ChildItem -Path . -Recurse -Force | Measure-Object -Property Length -Sum).Sum
        $projectSizeStr = if ($projectSize -gt 1MB) { "{0:N1} MB" -f ($projectSize / 1MB) } else { "{0:N0} KB" -f ($projectSize / 1KB) }
        Write-Host "   Total: $projectSizeStr" -ForegroundColor White
    } catch {
        Write-Host "   Unable to calculate project size" -ForegroundColor Gray
    }
}