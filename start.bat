@echo off
title United Securities - Invoice System
color 0A
cd /d "%~dp0"
set DATABASE_URL=file:./dev.db
set NEXTAUTH_SECRET=customer-mgmt-super-secret-key-2026
set NEXTAUTH_URL=http://localhost:3000
echo.
echo  ============================================
echo    شركة متحدة للأوراق المالية
echo    United Securities - Invoice System
echo  ============================================
echo.
echo  Starting server on http://localhost:3000
echo  Press Ctrl+C to stop
echo.
npx next dev --port 3000
pause
