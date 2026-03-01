'use strict';

const axios = require('axios');

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    // Вшиваем токен и ID прямо в код, чтобы исключить ошибки переменных
    const botToken = '8662410817:AAEPg37YkiJ6XnfnpmDW_fg1kp0hsz2_Eh0';
    const chatId = '8012802187';

    strapi.log.info('🚀 [Telegram] Пытаюсь отправить сообщение...');

    try {
      await axios.post(`https://api.telegram.org{botToken}/sendMessage`, {
        chat_id: chatId,
        text: '✅ <b>YakMarket В СЕТИ!</b>\n\nЕсли ты видишь это, значит код в index.js работает.\n\nИди спать!',
        parse_mode: 'HTML'
      });
      strapi.log.info('✅ [Telegram] Сообщение ушло!');
    } catch (err) {
      strapi.log.error('❌ [Telegram] Ошибка: ' + (err.response?.data?.description || err.message));
    }
  },
};
