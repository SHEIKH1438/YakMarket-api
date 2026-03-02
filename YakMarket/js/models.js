/**
 * YakMarket.tj - Models Layer
 * Defines data structures for Products, Users, and Chats.
 */

const YakModels = {
    /**
     * Product Model
     */
    Product: (data) => ({
        id: data.id || null,
        title: data.title || '',
        description: data.description || '',
        price: Number(data.price) || 0,
        currency: data.currency || 'TJS',
        category: data.category || '',
        location: data.location || '',
        images: Array.isArray(data.images) ? data.images : [],
        ownerId: data.ownerId || '',
        ownerName: data.ownerName || '',
        status: data.status || 'ACTIVE', // ACTIVE, PENDING, SOLD, REJECTED
        viewsCount: data.viewsCount || 0,
        likesCount: data.likesCount || 0,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now()
    }),

    /**
     * User Model
     */
    User: (data) => ({
        uid: data.uid || '',
        email: data.email || '',
        name: data.name || 'Anonymous',
        role: data.role || 'USER', // USER, SELLER, MODERATOR, ADMIN
        status: data.status || 'ACTIVE',
        avatar: data.avatar || '',
        phoneNumber: data.phoneNumber || '',
        location: data.location || '',
        lastLogin: data.lastLogin || Date.now(),
        createdAt: data.createdAt || Date.now()
    }),

    /**
     * Message Model
     */
    Message: (data) => ({
        id: data.id || null,
        chatId: data.chatId || '',
        senderId: data.senderId || '',
        text: data.text || '',
        timestamp: data.timestamp || Date.now(),
        isRead: data.isRead || false
    }),

    /**
     * Conversation Model
     */
    Conversation: (data) => ({
        id: data.id || null,
        participants: Array.isArray(data.participants) ? data.participants : [],
        lastMessage: data.lastMessage || '',
        lastUpdate: data.lastUpdate || Date.now(),
        productId: data.productId || ''
    })
};

window.YakModels = YakModels;
