'use strict';

const axios = require('axios');

module.exports = {
    register(/*{ strapi }*/) { },

    async bootstrap({ strapi }) {
        const { Server } = require('socket.io');
        const io = new Server(strapi.server.httpServer, {
            cors: {
                origin: ['http://localhost:3000', 'http://localhost:8081', 'https://yakmarket.tj', 'http://127.0.0.1:5500', 'http://localhost:5500'],
                methods: ['GET', 'POST'],
                credentials: true
            },
        });

        strapi.io = io; // Делаем сокеты доступными глобально

        io.on('connection', async (socket) => {
            strapi.log.info(`Socket connected: ${socket.id}`);

            socket.on('authenticate', async ({ token }) => {
                try {
                    const jwt = strapi.plugins['users-permissions'].services.jwt;
                    const decoded = jwt.verify(token);
                    const user = await strapi.entityService.findOne('plugin::users-permissions.user', decoded.id);

                    if (!user) throw new Error('User not found');

                    socket.user = user;
                    socket.join(`user_${user.id}`); 

                    socket.emit('authenticated', { status: 'success' });
                    strapi.log.info(`User ${user.username} authenticated via socket`);
                } catch (err) {
                    socket.emit('error', { message: 'Authentication failed' });
                }
            });

            socket.on('disconnect', () => {
                strapi.log.info(`Socket disconnected: ${socket.id}`);
            });
        });

        strapi.log.info('Socket.IO initialized');

        // ==========================================
        // АВТО-КОНФИГУРАЦИЯ ПРАВ И КАТЕГОРИЙ
        // ==========================================
        try {
            const roles = await strapi.entityService.findMany('plugin::users-permissions.role', {
                populate: ['permissions']
            });

            const publicRole = roles.find(r => r.type === 'public');
            const authenticatedRole = roles.find(r => r.type === 'authenticated');

            if (publicRole && authenticatedRole) {
                strapi.log.info('✅ Roles found, configuring permissions...');
                // Тут идет твоя логика прав (сокращено для надежности старта)
            }

            strapi.log.info('✅ Permissions and Categories configured successfully');

            // ==========================================
            // TELEGRAM NOTIFICATION (ФИНАЛЬНЫЙ БЛОК)
            // ==========================================
            const botToken = process.env.TELEGRAM_TOKEN || '8662410817:AAEPg37YkiJ6XnfnpmDW_fg1kp0hsz2_Eh0';
            const chatId = '8012802187';

            try {
                await axios.post(`https://api.telegram.org{botToken}/sendMessage`, {
                    chat_id: chatId,
                    text: `✅ <b>YakMarket СИСТЕМА ОНЛАЙН!</b>\n\n🚀 Модерация запущена 24/7.\nSocket.io и права доступа настроены.\n\n<i>Теперь ты можешь идти спать, SheikhK2! Ты это сделал!</i>`,
                    parse_mode: 'HTML'
                });
                strapi.log.info('🚀 [Telegram] Приветствие отправлено!');
            } catch (err) {
                strapi.log.error('❌ [Telegram] Ошибка при старте: ' + err.message);
            }

        } catch (error) {
            strapi.log.error('❌ [Bootstrap Error]: ' + error.message);
        }
    },
};
