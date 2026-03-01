'use strict';

const axios = require('axios');
const moderators = require('../config/moderators');

// Hardcoded credentials
const BOT_TOKEN = '8662410817:AAEPg37YkiJ6XnfnpmDW_fg1kp0hsz2_Eh0';
const ADMIN_ID = '8012802187';

// Telegram API URL
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Функция отправки сообщения
async function sendMessage(chatId, text, parseMode = 'HTML') {
    try {
        const response = await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: parseMode
        });
        return response.data;
    } catch (err) {
        throw err;
    }
}

module.exports = {
    register() { },

    async bootstrap({ strapi }) {
        strapi.log.info('🚀 [YakMarket] Запуск системы модерации...');

        // ═══════════════════════════════════════════════════════════════
        // ГЛОБАЛЬНАЯ СТАТИСТИКА СЕССИИ
        // ═══════════════════════════════════════════════════════════════
        strapi.moderationStats = {
            sessionStart: new Date(),
            pendingCount: 0,
            acceptedToday: 0,
            rejectedToday: 0,
            totalModerators: moderators.length,
            onlineModerators: moderators.filter(m => m.isAvailable).length
        };

        strapi.log.info(`📊 [Stats] Модераторов в базе: ${strapi.moderationStats.totalModerators}`);
        strapi.log.info(`📊 [Stats] Онлайн модераторов: ${strapi.moderationStats.onlineModerators}`);

        // ═══════════════════════════════════════════════════════════════
        // РАССЫЛКА ПРИВЕТСТВИЙ ВСЕМ МОДЕРАТОРАМ
        // ═══════════════════════════════════════════════════════════════
        strapi.log.info('📨 [Broadcast] Начинаю рассылку приветствий...');

        for (const mod of moderators) {
            try {
                const welcomeText = `👋 <b>Привет, ${mod.name}!</b>\n\n` +
                    `✅ <b>YakMarket СИСТЕМА ОНЛАЙН!</b>\n` +
                    `🛡 Модерация активна 24/7\n` +
                    `👤 Ваша роль: <b>${mod.role === 'admin' ? 'Администратор' : 'Модератор'}</b>\n\n` +
                    `📊 Ваша статистика:\n` +
                    `✅ Принято: ${mod.stats.accepted}\n` +
                    `❌ Отклонено: ${mod.stats.rejected}\n\n` +
                    `<i>Если ты видишь это — всё работает!</i>`;

                await sendMessage(mod.id, welcomeText);
                strapi.log.info(`✅ [Broadcast] Приветствие отправлено: ${mod.name} (${mod.id})`);
            } catch (err) {
                if (err.response?.status === 403) {
                    strapi.log.error(`❌ [Broadcast] ${mod.name} (${mod.id}) — не нажал /start в боте!`);
                } else {
                    strapi.log.error(`❌ [Broadcast] Ошибка отправки ${mod.name}: ${err.message}`);
                }
            }
        }

        strapi.log.info('📨 [Broadcast] Рассылка завершена!');

        // ═══════════════════════════════════════════════════════════════
        // POLLING ДЛЯ ОБРАБОТКИ КОМАНД
        // ═══════════════════════════════════════════════════════════════
        let lastUpdateId = 0;

        async function checkUpdates() {
            try {
                const response = await axios.get(`${TELEGRAM_API}/getUpdates`, {
                    params: {
                        offset: lastUpdateId + 1,
                        limit: 10
                    }
                });

                if (response.data.ok && response.data.result.length > 0) {
                    for (const update of response.data.result) {
                        lastUpdateId = update.update_id;

                        // Обрабатываем только текстовые сообщения
                        if (update.message && update.message.text) {
                            const chatId = update.message.chat.id.toString();
                            const text = update.message.text.trim();
                            const username = update.message.from.username || 'Unknown';

                            strapi.log.info(`💬 [Command] ${username} (${chatId}): ${text}`);

                            // Команда /admin
                            if (text === '/admin') {
                                // Проверка прав доступа
                                if (chatId === ADMIN_ID) {
                                    const stats = strapi.moderationStats;
                                    const sessionTime = Math.floor((new Date() - stats.sessionStart) / 1000 / 60);

                                    const adminText = `📊 <b>СТАТИСТИКА СИСТЕМЫ</b>\n\n` +
                                        `⏱ Время работы: ${sessionTime} мин\n\n` +
                                        `👥 <b>Всего модераторов:</b> ${stats.totalModerators}\n` +
                                        `🟢 В сети: ${stats.onlineModerators}\n` +
                                        `🔴 Оффлайн: ${stats.totalModerators - stats.onlineModerators}\n\n` +
                                        `📝 <b>Объявлений в очереди:</b> ${stats.pendingCount}\n\n` +
                                        `📈 <b>Действия за сессию:</b>\n` +
                                        `✅ Принято: ${stats.acceptedToday}\n` +
                                        `❌ Отклонено: ${stats.rejectedToday}\n\n` +
                                        `<i>Обновлено: ${new Date().toLocaleTimeString()}</i>`;

                                    await sendMessage(chatId, adminText);
                                    strapi.log.info(`✅ [Admin] Статистика отправлена админу`);
                                } else {
                                    await sendMessage(chatId, '⛔ <b>Доступ запрещён!</b>\n\nЭта команда только для администратора.');
                                    strapi.log.warn(`⛔ [Security] ${username} (${chatId}) пытался использовать /admin`);
                                }
                            }

                            // Команда /help
                            else if (text === '/help') {
                                const helpText = `🤖 <b>Доступные команды:</b>\n\n` +
                                    `/admin — Статистика системы (только админ)\n` +
                                    `/help — Показать это сообщение\n\n` +
                                    `<i>YakMarket Moderation Bot v1.0</i>`;
                                await sendMessage(chatId, helpText);
                            }
                        }
                    }
                }
            } catch (err) {
                strapi.log.error(`❌ [Polling] Ошибка: ${err.message}`);
            }
        }

        // Запускаем polling каждые 3 секунды
        setInterval(checkUpdates, 3000);
        strapi.log.info('🤖 [Bot] Polling запущен (интервал: 3 сек)');

        // ═══════════════════════════════════════════════════════════════
        // ФУНКЦИИ ДЛЯ ИЗМЕНЕНИЯ СТАТИСТИКИ (вызываются из других частей)
        // ═══════════════════════════════════════════════════════════════
        strapi.moderation = {
            // Увеличить счётчик объявлений в очереди
            incrementPending: () => {
                strapi.moderationStats.pendingCount++;
                strapi.log.info(`📊 [Stats] Новое объявление в очереди. Всего: ${strapi.moderationStats.pendingCount}`);
            },

            // Уменьшить счётчик объявлений в очереди
            decrementPending: () => {
                if (strapi.moderationStats.pendingCount > 0) {
                    strapi.moderationStats.pendingCount--;
                }
            },

            // Записать принятое объявление
            recordAccepted: (moderatorId) => {
                strapi.moderationStats.acceptedToday++;
                strapi.moderationStats.pendingCount = Math.max(0, strapi.moderationStats.pendingCount - 1);

                // Обновляем статистику модератора
                const mod = moderators.find(m => m.id === moderatorId);
                if (mod) {
                    mod.stats.accepted++;
                }

                strapi.log.info(`✅ [Stats] Объявление принято. Всего: ${strapi.moderationStats.acceptedToday}`);
            },

            // Записать отклонённое объявление
            recordRejected: (moderatorId) => {
                strapi.moderationStats.rejectedToday++;
                strapi.moderationStats.pendingCount = Math.max(0, strapi.moderationStats.pendingCount - 1);

                // Обновляем статистику модератора
                const mod = moderators.find(m => m.id === moderatorId);
                if (mod) {
                    mod.stats.rejected++;
                }

                strapi.log.info(`❌ [Stats] Объявление отклонено. Всего: ${strapi.moderationStats.rejectedToday}`);
            },

            // Получить всех доступных модераторов
            getAvailableModerators: () => {
                return moderators.filter(m => m.isAvailable);
            },

            // Получить админа
            getAdmin: () => {
                return moderators.find(m => m.role === 'admin');
            }
        };

        strapi.log.info('✅ [YakMarket] Система модерации полностью запущена!');
    },
};
