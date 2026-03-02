#!/bin/bash

# YakMarket Stop Script
# Скрипт остановки всех сервисов

echo "Остановка YakMarket.tj..."

# Остановка Python сервера
echo "Остановка AI Chat сервера..."
pkill -f "python3 server.py" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "AI Chat сервер остановлен"
else
    echo "Внимание: AI Chat сервер не был запущен"
fi

# Остановка Strapi
echo "Остановка Strapi backend..."
pkill -f "strapi develop" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "Strapi backend остановлен"
else
    echo "Внимание: Strapi backend не был запущен"
fi

# Остановка всех Node.js процессов связанных с проектом
echo "Остановка дополнительных Node.js процессов..."
pkill -f "node.*strapi" 2>/dev/null

# Освобождение портов
echo "Освобождение портов..."
lsof -ti:8081 | xargs kill -9 2>/dev/null
lsof -ti:1337 | xargs kill -9 2>/dev/null

# Очистка временных файлов
echo "Очистка временных файлов..."
rm -f logs/*.pid 2>/dev/null

echo ""
echo "YakMarket полностью остановлен"
echo ""
echo "Статус портов:"
if lsof -i :8081 > /dev/null 2>&1; then
    echo "Внимание: Порт 8081 все еще занят"
else
    echo "Порт 8081 свободен"
fi

if lsof -i :1337 > /dev/null 2>&1; then
    echo "Внимание: Порт 1337 все еще занят"
else
    echo "Порт 1337 свободен"
fi

echo ""
echo "Для перезапуска используйте: ./start.sh"
