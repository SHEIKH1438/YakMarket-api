@echo off
chcp 65001 >nul
title YakMarket Startup

echo ========================================
echo   YakMarket.tj - Запуск приложения
echo ========================================
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не установлен. Пожалуйста, установите Node.js 18+
    pause
    exit /b 1
)
echo [OK] Node.js найден

REM Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Python не установлен. Пожалуйста, установите Python 3.8+
    pause
    exit /b 1
)
echo [OK] Python найден

echo.
echo ========================================
echo   Настройка Strapi Backend
echo ========================================

REM Check if node_modules exists for strapi-backend
if not exist "strapi-backend\node_modules" (
    echo Установка зависимостей Strapi...
    cd strapi-backend
    call npm install
    cd ..
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Не удалось установить зависимости Strapi
        pause
        exit /b 1
    )
)
echo [OK] Зависимости Strapi установлены

echo.
echo ========================================
echo   Запуск сервисов
echo ========================================

REM Start Strapi Backend (in background)
echo Запуск Strapi Backend на порту 1337...
start "Strapi Backend" cmd /k "cd strapi-backend && npm run develop"

REM Wait for Strapi to start
timeout /t 10 /nobreak >nul

REM Start Python server for frontend (in background)
echo Запуск Python сервера на порту 8084...
start "YakMarket Frontend" cmd /k "cd YakMarket && python server.py"

echo.
echo ========================================
echo   Сервисы запущены!
echo ========================================
echo.
echo URLs:
echo   - Strapi Admin: http://localhost:1337/admin
echo   - Frontend: http://localhost:8084
echo.
echo Нажмите любую клавишу чтобы закрыть это окно (сервисы продолжат работу)
pause >nul
