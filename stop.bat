@echo off
chcp 65001 >nul
title YakMarket Stop

echo ========================================
echo   YakMarket.tj - Остановка сервисов
echo ========================================
echo.

echo Остановка Python сервера...
taskkill /F /FI "WINDOWTITLE eq YakMarket Frontend*" 2>nul
taskkill /F /IM python.exe 2>nul

echo Остановка Node.js процессов Strapi...
taskkill /F /FI "WINDOWTITLE eq Strapi Backend*" 2>nul
taskkill /F /IM node.exe 2>nul

echo.
echo ========================================
echo   Все сервисы остановлены
echo ========================================
echo.
echo Нажмите любую клавишу для выхода
pause >nul
