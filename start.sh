#!/bin/bash

# YakMarket Startup Script
# Скрипт запуска всего проекта

echo "Запуск YakMarket.tj..."

# Проверка зависимостей
check_dependencies() {
    echo "Проверка зависимостей..."
    
    # Проверка Node.js
    if ! command -v node &> /dev/null; then
        echo "Ошибка: Node.js не установлен. Пожалуйста, установите Node.js 18+"
        exit 1
    fi
    
    # Проверка Python
    if ! command -v python3 &> /dev/null; then
        echo "Ошибка: Python3 не установлен. Пожалуйста, установите Python 3.8+"
        exit 1
    fi
    
    # Проверка PostgreSQL
    if ! command -v psql &> /dev/null; then
        echo "Внимание: PostgreSQL не найден. Убедитесь что PostgreSQL установлен и запущен"
    fi
    
    echo "Зависимости проверены"
}

# Настройка окружения
setup_environment() {
    echo "Настройка окружения..."
    
    # Создание .env файла для Strapi если не существует
    if [ ! -f "strapi-backend/.env" ]; then
        echo "Создание .env файла для Strapi..."
        cp strapi-backend/.env.example strapi-backend/.env
        echo "Внимание: Пожалуйста, отредактируйте strapi-backend/.env файл с вашими настройками"
    fi
    
    # Установка зависимостей Strapi
    if [ ! -d "strapi-backend/node_modules" ]; then
        echo "Установка зависимостей Strapi..."
        cd strapi-backend && npm install && cd ..
    fi
    
    echo "Окружение настроено"
}

# Запуск сервисов
start_services() {
    echo "Запуск сервисов для Render.com..."
    
    # 1. Запуск Bot (в фоне, polling)
    echo "Запуск Admin Bot..."
    python3 strapi-telegram-bot/main.py > logs/bot.log 2>&1 &
    BOT_PID=$!
    echo "Бот запущен с PID: $BOT_PID"

    # 2. Запуск AI Chat сервера (в ФОРЕГРАУНДЕ для Render)
    echo "Запуск AI Chat сервера на порту $PORT..."
    cd YakMarket
    # Используем exec чтобы процесс заменил шелл и Render видел его как основной
    exec python3 server.py
}

# Остановка сервисов
stop_services() {
    echo "Остановка сервисов..."
    
    # Остановка Python сервера
    if [ ! -f "logs/python.pid" ]; then
        echo "Остановка Python сервера..."
        pkill -f "python3 server.py" 2>/dev/null
    fi
    
    # Остановка Strapi
    if [ ! -f "logs/strapi.pid" ]; then
        echo "Остановка Strapi backend..."
        pkill -f "strapi develop" 2>/dev/null
    fi
    
    echo "Сервисы остановлены"
}

# Показ статуса
show_status() {
    echo "Статус сервисов:"
    echo ""
    
    # Проверка Python сервера
    if pgrep -f "python3 server.py" > /dev/null; then
        echo "AI Chat сервер: запущен"
    else
        echo "AI Chat сервер: остановлен"
    fi
    
    # Проверка Strapi
    if pgrep -f "strapi develop" > /dev/null; then
        echo "Strapi backend: запущен"
    else
        echo "Strapi backend: остановлен"
    fi
    
    echo ""
    echo "Проверка доступности:"
    
    # Проверка портов
    if lsof -i :8081 > /dev/null 2>&1; then
        echo "Порт 8081 (AI Chat): занят"
    else
        echo "Порт 8081 (AI Chat): свободен"
    fi
    
    if lsof -i :1337 > /dev/null 2>&1; then
        echo "Порт 1337 (Strapi): занят"
    else
        echo "Порт 1337 (Strapi): свободен"
    fi
}

# Показ помощи
show_help() {
    echo "YakMarket Startup Script"
    echo ""
    echo "Использование:"
    echo "  ./start.sh [команда]"
    echo ""
    echo "Команды:"
    echo "  start     Запустить все сервисы (по умолчанию)"
    echo "  stop      Остановить все сервисы"
    echo "  restart   Перезапустить все сервисы"
    echo "  status    Показать статус сервисов"
    echo "  logs      Показать логи"
    echo "  help      Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  ./start.sh          # Запустить все сервисы"
    echo "  ./start.sh stop     # Остановить все сервисы"
    echo "  ./start.sh status   # Показать статус"
}

# Показ логов
show_logs() {
    echo "Логи YakMarket:"
    echo ""
    
    if [ -f "logs/python-server.log" ]; then
        echo "AI Chat сервер (последние 20 строк):"
        tail -20 logs/python-server.log
        echo ""
    fi
    
    if [ -f "logs/strapi-backend.log" ]; then
        echo "Strapi backend (последние 20 строк):"
        tail -20 logs/strapi-backend.log
        echo ""
    fi
}

# Основная логика
case "${1:-start}" in
    start)
        check_dependencies
        setup_environment
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 2
        check_dependencies
        setup_environment
        start_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Ошибка: Неизвестная команда: $1"
        echo "Используйте './start.sh help' для справки"
        exit 1
        ;;
esac
