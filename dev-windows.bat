@echo off
REM Windows development script to avoid Replit plugin compatibility issues
REM This script prevents the Replit-specific plugins from loading on Windows

REM Set NODE_ENV to development
set NODE_ENV=development

REM Explicitly unset REPL_ID to prevent Replit plugins from loading
set REPL_ID=

REM Run the development server
npm run dev-windows-base