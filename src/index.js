'use strict';

module.exports = {
    register(/*{ strapi }*/) { },

    async bootstrap({ strapi }) {
        const { Server } = require('socket.io');
        const io = new Server(strapi.server.httpServer, {
            cors: {
                origin: ['http://localhost:3000', 'http://localhost:8081', 'https://yakmarket.tj'],
                methods: ['GET', 'POST'],
                credentials: true
            },
        });

        io.on('connection', async (socket) => {
            strapi.log.info(`Socket connected: ${socket.id}`);

            // 1. Authentication via JWT
            socket.on('authenticate', async ({ token }) => {
                try {
                    // Verify JWT token properly
                    const jwt = strapi.plugins['users-permissions'].services.jwt;
                    const decoded = jwt.verify(token);

                    const user = await strapi.entityService.findOne('plugin::users-permissions.user', decoded.id);

                    if (!user) throw new Error('User not found');

                    socket.user = user;
                    socket.emit('authenticated', {
                        status: 'success',
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email
                        }
                    });
                    socket.join(`room_user_${user.id}`);
                    strapi.log.info(`User authenticated via socket: ${user.username}`);
                } catch (err) {
                    strapi.log.warn(`Socket authentication failed: ${err.message}`);
                    socket.emit('error', {
                        status: 'fail',
                        error_type: 'UI_TOAST',
                        message: 'Ошибка авторизации. Войдите снова.',
                        code: 'AUTH_FAILED'
                    });
                    socket.disconnect();
                }
            });

            // 2. Joining Chat Room (Participation Check)
            socket.on('joinChat', async ({ chatId }) => {
                if (!socket.user) {
                    return socket.emit('error', { message: 'Сначала авторизуйтесь' });
                }

                try {
                    const chatUid = 'api::chat.chat';
                    if (!strapi.contentTypes[chatUid]) {
                        return socket.emit('error', { message: 'Система чата не готова' });
                    }

                    const chat = await strapi.db.query(chatUid).findOne({
                        where: { id: chatId },
                        populate: ['buyer', 'seller'],
                    });

                    // Strong Ownership Check: Only buyer or seller can join
                    const isParticipant = chat && (chat.buyer?.id === socket.user.id || chat.seller?.id === socket.user.id);

                    if (isParticipant) {
                        socket.join(`chat_${chatId}`);
                        socket.emit('joined', { chatId });
                        strapi.log.info(`User ${socket.user.username} joined chat ${chatId}`);
                    } else {
                        socket.emit('error', {
                            status: 'fail',
                            error_type: 'UI_TOAST',
                            message: 'У вас нет доступа к этому чату',
                            code: 'ACCESS_DENIED_OWNERSHIP'
                        });
                    }
                } catch (err) {
                    strapi.log.error('Socket joinChat error:', err);
                    socket.emit('error', { message: 'Ошибка сервера при входе в чат' });
                }
            });

            // 3. Sending Message (Security Check on EVERY message)
            socket.on('sendMessage', async ({ chatId, content }) => {
                if (!socket.user) {
                    return socket.emit('error', { message: 'Сначала авторизуйтесь' });
                }

                try {
                    // Re-verify participation before saving message
                    const chat = await strapi.db.query('api::chat.chat').findOne({
                        where: { id: chatId },
                        populate: ['buyer', 'seller'],
                    });

                    if (!chat || (chat.buyer?.id !== socket.user.id && chat.seller?.id !== socket.user.id)) {
                        return socket.emit('error', { message: 'Вы не являетесь участником чата' });
                    }

                    // Validate content
                    if (!content || content.trim().length === 0) {
                        return socket.emit('error', { message: 'Сообщение не может быть пустым' });
                    }

                    if (content.length > 500) {
                        return socket.emit('error', { message: 'Сообщение слишком длинное (макс. 500 символов)' });
                    }

                    // Save message to database via Strapi Entity Service for safety & audit
                    const message = await strapi.entityService.create('api::message.message', {
                        data: {
                            content: content.trim(),
                            chat: chatId,
                            sender: socket.user.id,
                            publishedAt: new Date(),
                        },
                        populate: ['sender']
                    });

                    // Broadcast to the chat room
                    io.to(`chat_${chatId}`).emit('message', {
                        id: message.id,
                        content: message.content,
                        sender: {
                            id: socket.user.id,
                            username: socket.user.username
                        },
                        createdAt: message.createdAt
                    });

                    strapi.log.info(`Message sent by ${socket.user.username} in chat ${chatId}`);

                } catch (err) {
                    strapi.log.error('Socket sendMessage error:', err);
                    socket.emit('error', { message: 'Не удалось отправить сообщение' });
                }
            });

            // 4. Typing indicator
            socket.on('typing', ({ chatId }) => {
                if (!socket.user) return;
                socket.to(`chat_${chatId}`).emit('userTyping', {
                    userId: socket.user.id,
                    username: socket.user.username
                });
            });

            socket.on('stopTyping', ({ chatId }) => {
                if (!socket.user) return;
                socket.to(`chat_${chatId}`).emit('userStoppedTyping', {
                    userId: socket.user.id
                });
            });

            socket.on('disconnect', () => {
                strapi.log.info(`Socket disconnected: ${socket.id}`);
            });
        });

        strapi.io = io;
        strapi.log.info('Socket.IO initialized successfully');
    },
};
