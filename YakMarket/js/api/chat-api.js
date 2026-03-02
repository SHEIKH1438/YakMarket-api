/**
 * Chat API - Strapi Backend Interface
 */

const ChatAPI = {
    /**
     * Create or get existing chat
     */
    async createChat(sellerId, productId = null) {
        return window.YakStrapi.createChat({
            seller: sellerId,
            product: productId
        });
    },

    /**
     * Send message
     */
    async sendMessage(chatId, content) {
        return window.YakStrapi.sendMessage(chatId, content);
    },

    /**
     * Get user's chats
     */
    async getChats() {
        const result = await window.YakStrapi.getChats();
        return result.data || [];
    },

    /**
     * Get chat messages (via Strapi)
     */
    async getChatMessages(chatId) {
        const result = await window.YakStrapi.request(`/messages?filters[chat][id][$eq]=${chatId}&populate=*`);
        return result.data || [];
    },

    /**
     * Listen to messages (Real-time Socket.io)
     */
    listenToMessages(chatId, callback) {
        window.YakRealtime.joinChat(chatId);

        const unsubscribe = window.YakRealtime.on('message:new', (message) => {
            // Only trigger callback if message belongs to this chat
            if (message.chat && message.chat.id == chatId) {
                // Format message for UI
                const formattedMessage = {
                    id: message.id,
                    text: message.content,
                    senderId: message.sender.id,
                    senderName: message.sender.username,
                    createdAt: message.createdAt
                };
                callback([formattedMessage]);
            }
        });

        return unsubscribe;
    },

    /**
     * Sanitize input
     */
    sanitize(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/[<>]/g, '').trim();
    }
};

// Make available globally
window.ChatAPI = ChatAPI;
