'use strict';
const axios = require('axios');

module.exports = async ({ strapi }) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '8662410817:AAEPg37YkiJ6XnfnpmDW_fg1kp0hsz2_Eh0';

    // Прямой массив данных, чтобы точно сработало без поиска файлов
    const moderators = [
        { id: '8012802187', name: 'SheikhK2' }
    ];

    for (const mod of moderators) {
        try {
            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: mod.id,
                text: `🚀 <b>YakMarket Bot запущен!</b>\n\nПоздравляем, <b>${mod.name}</b>, система модерации активна 24/7.\n\nЖду новых объявлений!`,
                parse_mode: 'HTML'
            });
            console.log(`[Telegram] Приветствие отправлено для ${mod.name}`);
        } catch (err) {
            console.error(`[Telegram] Ошибка:`, err.response?.data || err.message);
        }
    }
};
