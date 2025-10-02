# Windows PowerShell development script to avoid Replit plugin compatibility issues
# This script prevents the Replit-specific plugins from loading on Windows

Write-Host "Starting development server for Windows..." -ForegroundColor Green

# Set NODE_ENV to development
$env:NODE_ENV = "development"

# Explicitly unset REPL_ID to prevent Replit plugins from loading
$env:REPL_ID = $null
Remove-Item Env:REPL_ID -ErrorAction SilentlyContinue

# Set WINDOWS_DEV flag to identify Windows development environment
$env:WINDOWS_DEV = "true"

Write-Host "Environment configured for Windows development" -ForegroundColor Yellow
Write-Host "NODE_ENV: $env:NODE_ENV" -ForegroundColor Cyan
Write-Host "REPL_ID: $env:REPL_ID" -ForegroundColor Cyan
Write-Host "WINDOWS_DEV: $env:WINDOWS_DEV" -ForegroundColor Cyan

# Run the development server
npm run dev