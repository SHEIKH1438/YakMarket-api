/**
 * YakMarket.tj - Real-time Updates System (Socket.io)
 * Система обновлений в реальном времени через Strapi
 */

const YakRealtime = (function () {
    'use strict';

    let socket = null;
    let eventHandlers = {};

    /**
     * Инициализация Socket.io
     */
    function init() {
        if (socket) return true;

        // Check if Socket.io is available
        if (typeof io === 'undefined') {
            console.warn('Realtime: Socket.io not loaded, using localStorage fallback');
            return false;
        }

        const token = localStorage.getItem('yak_auth_token');
        const apiUrl = window.YakStrapi ? window.YakStrapi.baseUrl.replace('/api', '') : 'http://localhost:1337';

        // Инициализация Socket.io клиента
        socket = io(apiUrl, {
            query: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5
        });

        socket.on('connect', () => {
            console.log('Realtime: Connected to Strapi');
            if (token) {
                socket.emit('authenticate', { token });
            }
        });

        socket.on('authenticated', () => {
            console.log('Realtime: Authenticated successfully');
            // Trigger any pending logic
        });

        socket.on('error', (err) => {
            console.error('Realtime Error:', err);
        });

        // Listen for generic events
        setupGenericListeners();

        return true;
    }

    function setupGenericListeners() {
        if (!socket) {
            // Socket.io not available, skip realtime features
            return;
        }

        // Product updates
        socket.on('product:create', (data) => trigger('product:create', data));
        socket.on('product:update', (data) => trigger('product:update', data));
        socket.on('product:delete', (data) => trigger('product:delete', data));

        // Chat notifications (when not in chat)
        socket.on('notification:chat', (data) => {
            console.log('Realtime: New chat notification', data);
            if (window.YakToast) {
                window.YakToast.info(`Новое сообщение от ${data.senderName}: ${data.text}`);
            }
            trigger('notification:chat', data);
        });

        // New messages (when inside chat room)
        socket.on('message:new', (data) => {
            console.log('Realtime: New message received', data);
            trigger('message:new', data);
        });
    }

    /**
     * Подписка на события
     */
    function on(event, handler) {
        if (!eventHandlers[event]) eventHandlers[event] = [];
        eventHandlers[event].push(handler);
        return () => off(event, handler);
    }

    function off(event, handler) {
        if (!eventHandlers[event]) return;
        eventHandlers[event] = eventHandlers[event].filter(h => h !== handler);
    }

    function trigger(event, data) {
        if (eventHandlers[event]) {
            eventHandlers[event].forEach(handler => handler(data));
        }
    }

    /**
     * Вход в комнату чата
     */
    function joinChat(chatId) {
        if (socket) {
            socket.emit('joinChat', { chatId });
            console.log(`Realtime: Joined chat room chat_${chatId}`);
        }
    }

    /**
     * Публичный API
     */
    return {
        init,
        on,
        off,
        joinChat,
        socket: () => socket
    };

})();

// Инициализация при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => YakRealtime.init());
} else {
    YakRealtime.init();
}

window.YakRealtime = YakRealtime;