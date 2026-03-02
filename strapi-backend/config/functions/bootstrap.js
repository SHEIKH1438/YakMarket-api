'use strict';
const axios = require('axios');
const { Server } = require('socket.io');

module.exports = async ({ strapi }) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
        console.warn('[Telegram] TELEGRAM_BOT_TOKEN not set, skipping notifications');
        return;
    }

    // ═══════════════════════════════════════════════════════════════
    // 🚀 ИНИЦИАЛИЗАЦИЯ SOCKET.IO ДЛЯ REAL-TIME УВЕДОМЛЕНИЙ
    // ═══════════════════════════════════════════════════════════════

    // Получаем HTTP сервер из Strapi
    const httpServer = strapi.server.http;

    // Создаём Socket.io сервер
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Делаем io доступным через strapi
    strapi.io = io;

    // Обработчики Socket.io
    io.on('connection', (socket) => {
        console.log('[Socket.io] Новый клиент подключен:', socket.id);

        // Аутентификация
        socket.on('authenticate', (data) => {
            console.log('[Socket.io] Клиент аутентифицирован:', socket.id);
            socket.emit('authenticated');
        });

        // Вход в комнату чата
        socket.on('joinChat', (data) => {
            if (data.chatId) {
                socket.join(`chat_${data.chatId}`);
                console.log(`[Socket.io] Клиент ${socket.id} присоединился к чату ${data.chatId}`);
            }
        });

        // Выход из комнаты чата
        socket.on('leaveChat', (data) => {
            if (data.chatId) {
                socket.leave(`chat_${data.chatId}`);
                console.log(`[Socket.io] Клиент ${socket.id} покинул чат ${data.chatId}`);
            }
        });

        // Отключение
        socket.on('disconnect', () => {
            console.log('[Socket.io] Клиент отключен:', socket.id);
        });
    });

    console.log('[Socket.io] ✅ Сервер инициализирован и готов к работе');

    // ═══════════════════════════════════════════════════════════════
    // 🤖 ОТПРАВКА УВЕДОМЛЕНИЯ АДМИНУ О ЗАПУСКЕ
    // ═══════════════════════════════════════════════════════════════

    const moderators = [
        { id: '8012802187', name: 'SheikhK2' }
    ];

    for (const mod of moderators) {
        try {
            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: mod.id,
                text: `🚀 <b>YakMarket Bot запущен!</b>\n\nПоздравляем, <b>${mod.name}</b>, система модерации активна 24/7.\n\n🛡 Real-time: АКТИВЕН\n📡 Socket.io: ПОДКЛЮЧЕН\n\nЖду новых объявлений!`,
                parse_mode: 'HTML'
            });
            console.log(`[Telegram] Приветствие отправлено для ${mod.name}`);
        } catch (err) {
            console.error(`[Telegram] Ошибка:`, err.response?.data || err.message);
        }
    }
};
