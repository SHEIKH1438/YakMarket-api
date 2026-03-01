'use strict';

const axios = require('axios');

module.exports = {
    register() { },

    async bootstrap({ strapi }) {
        // Hardcoded credentials для исключения ошибок путей конфигурации
        const botToken = '8662410817:AAEPg37YkiJ6XnfnpmDW_fg1kp0hsz2_Eh0';
        const chatId = '8012802187';

        strapi.log.info('🚀 [Telegram] Попытка отправки сообщения в Telegram...');
        strapi.log.info(`🚀 [Telegram] Chat ID: ${chatId}`);
        strapi.log.info(`🚀 [Telegram] Bot Token (первые 10 символов): ${botToken.substring(0, 10)}...`);

        try {
            const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: '✅ YakMarket СИСТЕМА ОНЛАЙН! Модерация активна 24/7. Если ты видишь это — всё работает!',
                parse_mode: 'HTML'
            });

            if (response.data && response.data.ok) {
                strapi.log.info('✅ [Telegram] Message Sent - сообщение успешно отправлено!');
                strapi.log.info(`✅ [Telegram] Message ID: ${response.data.result.message_id}`);
            } else {
                strapi.log.warn('⚠️ [Telegram] Ответ получен, но статус не ok:', response.data);
            }
        } catch (err) {
            if (err.response) {
                // Ошибка от Telegram API
                strapi.log.error('❌ [Telegram] Error: ' + err.response.status + ' ' + (err.response.data?.description || err.message));
                if (err.response.status === 403) {
                    strapi.log.error('❌ [Telegram] Error: 403 Forbidden — вы не нажали /start в боте!');
                }
            } else if (err.request) {
                // Ошибка сети
                strapi.log.error('❌ [Telegram] Ошибка сети: нет ответа от Telegram API');
            } else {
                // Другая ошибка
                strapi.log.error('❌ [Telegram] Ошибка: ' + err.message);
            }
        }
    },
};
