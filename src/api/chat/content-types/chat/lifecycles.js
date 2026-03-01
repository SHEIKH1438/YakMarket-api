'use strict';

/**
 * Lifecycle hooks for Message collection
 */

module.exports = {
    async afterCreate(event) {
        const { result, params } = event;
        const strapi = event.model.strapi;

        // Populate chat and sender to get IDs
        const message = await strapi.entityService.findOne('api::message.message', result.id, {
            populate: ['chat', 'sender', 'chat.buyer', 'chat.seller'],
        });

        if (strapi.io && message.chat) {
            const chatId = message.chat.id;

            // Emit to the specific chat room
            strapi.io.to(`chat_${chatId}`).emit('message:new', message);

            // Notify the recipient (buyer or seller) via their private user room
            const recipientId = message.sender.id === message.chat.buyer.id
                ? message.chat.seller.id
                : message.chat.buyer.id;

            strapi.io.to(`user_${recipientId}`).emit('notification:chat', {
                type: 'new_message',
                chatId: chatId,
                senderName: message.sender.username,
                text: message.content
            });
        }
    },
};
