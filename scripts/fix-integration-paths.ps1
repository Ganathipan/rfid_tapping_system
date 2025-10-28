# Script to fix relative paths in reorganized integration tests
$basePath = "d:\UOP_Files\Academics\Semester04\2YP_Project\prototype\rfid_tapping_system\apps\backend\tests\integration"

# Get all test files in subdirectories
$testFiles = Get-ChildItem -Path $basePath -Recurse -Filter "*.test.js"

Write-Host "Fixing relative paths in $($testFiles.Count) test files..."

foreach ($file in $testFiles) {
    $content = Get-Content $file.FullName -Raw
    
    # Fix require paths based on depth
    if ($file.Directory.Name -ne "integration") {
        # Files in subdirectories need one more '../' in their paths
        $newContent = $content -replace "require\('../../src/", "require('../../../src/"
        $newContent = $newContent -replace "jest\.mock\('../../src/", "jest.mock('../../../src/"
        
        # Write back the fixed content
        if ($newContent -ne $content) {
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            Write-Host "Fixed paths in: $($file.Name)"
        }
    }
}

Write-Host "Path fixing complete!"