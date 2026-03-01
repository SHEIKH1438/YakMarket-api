'use strict';
const axios = require('axios');
const path = require('path');
const fs = require('fs');

module.exports = async ({ strapi }) => {
    const botToken = process.env.TELEGRAM_TOKEN;
    const moderatorsPath = path.join(process.cwd(), 'config', 'moderators.js');

    if (fs.existsSync(moderatorsPath)) {
        const moderators = require(moderatorsPath);
        for (const mod of moderators) {
            try {
                await axios.post(`https://api.telegram.org{botToken}/sendMessage`, {
                    chat_id: mod.id,
                    text: `🥳 <b>Поздравляем, ${mod.name}!</b>\n\nВы приняты на модерацию <b>YakMarket.tj</b>!\n\n🚀 Бот @yakadf_bot запущен 24/7. Все новые объявления будут приходить сюда.`,
                    parse_mode: 'HTML'
                });
                console.log(`[Telegram] Сообщение отправлено: ${mod.name}`);
            } catch (err) {
                console.error(`[Telegram] Ошибка:`, err.message);
            }
        }
    }
};
