/**
 * Модуль для страницы "Чат"
 * Управляет загрузкой и отображением чатов пользователя
 */

const Chat = {
    /**
     * Инициализация модуля
     */
    async init() {
        try {
            if (!window.YakAuth) {
                console.error('Auth not initialized');
                return;
            }

            // Проверяем авторизацию
            if (!window.YakAuth.isAuthenticated()) {
                this.showNotLoggedIn();
                return;
            }

            // Загружаем чаты
            await this.loadChats();

        } catch (error) {
            console.error('Initialization error:', error);
            this.showNotLoggedIn();
        }
    },

    /**
     * Загрузка чатов пользователя (через Strapi)
     */
    async loadChats() {
        try {
            const chats = await window.ChatAPI.getChats();
            const chatsList = document.getElementById('chatsList');
            const noChats = document.getElementById('noChats');

            if (document.getElementById('loadingSpinner')) {
                document.getElementById('loadingSpinner').classList.add('hidden');
            }
            if (document.getElementById('chatContainer')) {
                document.getElementById('chatContainer').classList.remove('hidden');
            }

            if (!chats || chats.length === 0) {
                chatsList.classList.add('hidden');
                noChats.classList.remove('hidden');
                return;
            }

            noChats.classList.add('hidden');
            chatsList.classList.remove('hidden');
            chatsList.innerHTML = ''; // Clear previous

            chats.forEach(chat => {
                const chatItem = this.createChatItem(chat);
                chatsList.appendChild(chatItem);
            });
        } catch (error) {
            console.error('Load chats error:', error);
            // Ensure UI elements are handled even on error
            if (document.getElementById('loadingSpinner')) {
                document.getElementById('loadingSpinner').classList.add('hidden');
            }
            if (document.getElementById('chatContainer')) {
                document.getElementById('chatContainer').classList.remove('hidden');
            }
            if (document.getElementById('noChats')) {
                document.getElementById('noChats').classList.remove('hidden');
            }
        }
    },

    /**
     * Создание элемента чата
     */
    createChatItem(chat) {
        const item = document.createElement('div');
        item.className = 'p-4 hover:bg-gray-50 cursor-pointer transition-colors border-b';

        // В Strapi v4 chat.seller и chat.buyer - это объекты
        const currentUser = window.YakAuth.getCurrentUser();
        const otherUser = chat.seller?.id === currentUser.id ? chat.buyer : chat.seller;
        const otherUserName = otherUser?.username || 'Пользователь';
        const lastMessage = chat.lastMessage || 'Нет сообщений';
        const lastMessageTime = chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

        item.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span class="text-blue-600 font-semibold">${otherUserName.charAt(0).toUpperCase()}</span>
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-start">
                        <h3 class="font-semibold text-gray-800">${otherUserName}</h3>
                        ${lastMessageTime ? `<span class="text-gray-400 text-xs">${lastMessageTime}</span>` : ''}
                    </div>
                    <p class="text-gray-500 text-sm truncate">${lastMessage}</p>
                </div>
            </div>
        `;

        item.onclick = () => {
            window.location.href = `chat-detail.html?id=${chat.id}`;
        };

        return item;
    },

    /**
     * Показать "не авторизован"
     */
    showNotLoggedIn() {
        document.getElementById('loadingSpinner').classList.add('hidden');
        document.getElementById('notLoggedIn').classList.remove('hidden');
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    Chat.init();
});