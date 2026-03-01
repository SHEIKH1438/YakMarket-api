/**
 * ═══════════════════════════════════════════════════════════════════
 * 🤖 YAKMARKET MODERATION SYSTEM v2.0
 * Полная система модерации с защитой и контролем доступа
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

const axios = require('axios');
const ModeratorsDB = require('../config/moderators');

// ═══════════════════════════════════════════════════════════════════
// 🔐 КОНФИДЕНЦИАЛЬНЫЕ ДАННЫЕ
// ═══════════════════════════════════════════════════════════════════
const CONFIG = {
    BOT_TOKEN: '8662410817:AAEPg37YkiJ6XnfnpmDW_fg1kp0hsz2_Eh0',
    ADMIN_ID: '8012802187',
    STRAPI_URL: process.env.STRAPI_URL || 'https://yakmarket-api-production.up.railway.app',
    API_BASE: 'https://api.telegram.org/bot'
};

const TELEGRAM_API = `${CONFIG.API_BASE}${CONFIG.BOT_TOKEN}`;

// ═══════════════════════════════════════════════════════════════════
// 📦 ХРАНИЛИЩЕ ДАННЫХ СЕССИИ
// ═══════════════════════════════════════════════════════════════════
const SessionStore = {
    pendingProducts: new Map(), // Товары на проверке
    bannedUsers: new Set(),     // Забаненные пользователи
    warnedUsers: new Map(),     // Предупреждённые пользователи
    processedToday: 0,          // Обработано за сегодня
    sessionStart: new Date(),
    lastActivity: new Date()
};

// ═══════════════════════════════════════════════════════════════════
// 🧪 ТЕСТОВЫЙ ТОВАР (для демонстрации)
// ═══════════════════════════════════════════════════════════════════
const TEST_PRODUCT = {
    id: 'TEST_001',
    title: '🧪 Тестовый товар - iPhone 15 Pro',
    description: 'Продаю новый iPhone 15 Pro, 256GB, цвет Natural Titanium. Гарантия 1 год. Полный комплект.',
    price: 15000,
    currency: 'TJS',
    seller: {
        id: 'USER_12345',
        name: 'Тестовый Продавец',
        phone: '+992900000001',
        telegram: '@test_seller',
        rating: 4.5,
        joinedAt: '2024-01-15'
    },
    category: 'Электроника > Телефоны',
    images: 3,
    location: 'Душанбе, центр',
    createdAt: new Date().toISOString(),
    status: 'pending'
};

// ═══════════════════════════════════════════════════════════════════
// 📨 ФУНКЦИИ TELEGRAM API
// ═══════════════════════════════════════════════════════════════════

/**
 * Отправка сообщения
 */
async function sendMessage(chatId, text, options = {}) {
    try {
        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            ...options
        };

        const response = await axios.post(`${TELEGRAM_API}/sendMessage`, payload);
        return response.data;
    } catch (err) {
        console.error(`[Telegram] Ошибка отправки:`, err.response?.data?.description || err.message);
        throw err;
    }
}

/**
 * Отправка сообщения с inline кнопками
 */
async function sendMessageWithButtons(chatId, text, buttons) {
    return sendMessage(chatId, text, {
        reply_markup: {
            inline_keyboard: buttons
        }
    });
}

/**
 * Отправка фото с caption
 */
async function sendPhoto(chatId, photoUrl, caption, buttons = null) {
    try {
        const payload = {
            chat_id: chatId,
            photo: photoUrl,
            caption: caption,
            parse_mode: 'HTML'
        };

        if (buttons) {
            payload.reply_markup = { inline_keyboard: buttons };
        }

        const response = await axios.post(`${TELEGRAM_API}/sendPhoto`, payload);
        return response.data;
    } catch (err) {
        // Если фото не отправилось, отправляем текст
        return sendMessage(chatId, caption, buttons ? { reply_markup: { inline_keyboard: buttons } } : {});
    }
}

/**
 * Ответ на callback query (нажатие кнопки)
 */
async function answerCallback(callbackId, text = null) {
    try {
        const payload = { callback_query_id: callbackId };
        if (text) payload.text = text;
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, payload);
    } catch (err) {
        console.error('[Callback] Ошибка:', err.message);
    }
}

// ═══════════════════════════════════════════════════════════════════
// 🛡️ ФУНКЦИИ БЕЗОПАСНОСТИ
// ═══════════════════════════════════════════════════════════════════

/**
 * Проверка доступа к команде
 * - Обычный пользователь: только /start
 * - Модератор: команды модерации
 * - Админ: все команды
 */
function checkAccess(userId, command) {
    // Админ может всё
    if (ModeratorsDB.isAdmin(userId)) {
        return { allowed: true, role: 'admin' };
    }

    // Модератор - только разрешённые команды
    if (ModeratorsDB.isModerator(userId)) {
        if (ModeratorsDB.canUseCommand(userId, command)) {
            return { allowed: true, role: 'moderator' };
        }
        return { allowed: false, reason: '⛔ Эта команда только для администратора!' };
    }

    // Обычный пользователь - только start
    if (command === 'start') {
        return { allowed: true, role: 'user' };
    }

    return { allowed: false, reason: '⛔ У вас нет доступа к этому боту!' };
}

// ═══════════════════════════════════════════════════════════════════
// 📋 ФОРМАТИРОВАНИЕ СООБЩЕНИЙ
// ═══════════════════════════════════════════════════════════════════

function formatProductCard(product, index = null) {
    const num = index ? `#${index} ` : '';
    return `
📦 <b>${num}${product.title}</b>

💰 <b>Цена:</b> ${product.price} ${product.currency}
📂 <b>Категория:</b> ${product.category}
📍 <b>Локация:</b> ${product.location}
📸 <b>Фото:</b> ${product.images} шт.

👤 <b>Продавец:</b> ${product.seller.name}
⭐ <b>Рейтинг:</b> ${product.seller.rating}/5
📱 <b>Телефон:</b> ${product.seller.phone}
📧 <b>Telegram:</b> ${product.seller.telegram || 'Не указан'}

📝 <b>Описание:</b>
<i>${product.description.substring(0, 200)}${product.description.length > 200 ? '...' : ''}</i>

🆔 <code>${product.id}</code>
    `.trim();
}

function formatUserInfo(user) {
    const warnings = SessionStore.warnedUsers.get(user.id) || 0;
    const isBanned = SessionStore.bannedUsers.has(user.id);

    return `
👤 <b>ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ</b>

🆔 ID: <code>${user.id}</code>
📛 Имя: ${user.name}
📱 Телефон: ${user.phone}
📧 Telegram: ${user.telegram || 'Н/Д'}
⭐ Рейтинг: ${user.rating}/5
📅 Регистрация: ${user.joinedAt}

⚠️ Предупреждений: ${warnings}
🚫 Статус: ${isBanned ? 'ЗАБАНЕН' : 'Активен'}
    `.trim();
}

// ═══════════════════════════════════════════════════════════════════
// ⌨️ INLINE КНОПКИ
// ═══════════════════════════════════════════════════════════════════

function getProductButtons(productId) {
    return [
        [
            { text: '✅ Принять', callback_data: `approve_${productId}` },
            { text: '❌ Отклонить', callback_data: `reject_${productId}` }
        ],
        [
            { text: '👤 Продавец', callback_data: `user_${productId}` },
            { text: '📋 Подробнее', callback_data: `details_${productId}` }
        ],
        [
            { text: '🚫 Забанить', callback_data: `ban_${productId}` },
            { text: '⚠️ Предупредить', callback_data: `warn_${productId}` }
        ]
    ];
}

function getRejectReasonButtons(productId) {
    return [
        [
            { text: '📸 Плохие фото', callback_data: `reject_${productId}_bad_photo` },
            { text: '📝 Плохое описание', callback_data: `reject_${productId}_bad_desc` }
        ],
        [
            { text: '💰 Неверная цена', callback_data: `reject_${productId}_bad_price` },
            { text: '🚫 Запрещённый товар', callback_data: `reject_${productId}_banned` }
        ],
        [
            { text: '🔙 Назад', callback_data: `back_${productId}` }
        ]
    ];
}

// ═══════════════════════════════════════════════════════════════════
// 🔄 ОБРАБОТЧИКИ КОМАНД
// ═══════════════════════════════════════════════════════════════════

const CommandHandlers = {

    /**
     * /start - Приветствие и deep link обработка
     */
    async start(chatId, userId, args) {
        const access = checkAccess(userId, 'start');

        // Обработка deep links (start=approve_123)
        if (args && args.length > 0) {
            const param = args[0];

            // Обработка approve_ID
            if (param.startsWith('approve_')) {
                const productId = param.replace('approve_', '');
                return this.handleApprove(chatId, userId, productId);
            }

            // Обработка reject_ID
            if (param.startsWith('reject_')) {
                const productId = param.replace('reject_', '');
                return sendMessage(chatId, '❌ Введите причину отклонения:\n/reject ' + productId + ' [причина]');
            }

            // Обработка user_ID
            if (param.startsWith('user_')) {
                const productId = param.replace('user_', '');
                return this.handleUserInfo(chatId, userId, productId);
            }
        }

        // Обычное приветствие для модераторов
        if (access.allowed) {
            const mod = ModeratorsDB.getById(userId);
            return sendMessage(chatId,
                `👋 <b>Привет, ${mod.name}!</b>\n\n` +
                `✅ <b>YakMarket MODERATION SYSTEM</b> активна!\n` +
                `🛡 Ваша роль: <b>${mod.role === 'admin' ? 'Администратор' : 'Модератор'}</b>\n\n` +
                `📊 Ваша статистика:\n` +
                `✅ Принято: ${mod.stats.accepted}\n` +
                `❌ Отклонено: ${mod.stats.rejected}\n` +
                `⚠️ Предупреждений: ${mod.stats.warnings}\n` +
                `🚫 Банов: ${mod.stats.banned}\n\n` +
                `<b>Доступные команды:</b>\n` +
                `/pending — Товары на проверке\n` +
                `/stats — Статистика системы\n` +
                `/help — Справка по командам`
            );
        }

        // Для обычных пользователей
        return sendMessage(chatId,
            `👋 <b>Добро пожаловать в YakMarket Bot!</b>\n\n` +
            `🛍 Это система модерации объявлений.\n` +
            `⛔ У вас нет доступа к модерации.`
        );
    },

    /**
     * /pending - Список товаров на проверке
     */
    async pending(chatId, userId) {
        const access = checkAccess(userId, 'pending');
        if (!access.allowed) {
            return sendMessage(chatId, access.reason);
        }

        if (SessionStore.pendingProducts.size === 0) {
            return sendMessage(chatId,
                `📭 <b>Очередь пуста!</b>\n\n` +
                `Нет товаров на модерации.\n` +
                `Все объявления обработаны ✅`
            );
        }

        await sendMessage(chatId, `📋 <b>СПИСОК ТОВАРОВ НА ПРОВЕРКЕ</b>\n\nВсего: ${SessionStore.pendingProducts.size}`);

        let index = 1;
        for (const [id, product] of SessionStore.pendingProducts) {
            const text = formatProductCard(product, index);
            const buttons = getProductButtons(id);

            await sendMessageWithButtons(chatId, text, buttons);
            index++;

            // Задержка чтобы не спамить
            await new Promise(r => setTimeout(r, 300));
        }
    },

    /**
     * /approve [id] - Принять товар
     */
    async approve(chatId, userId, args) {
        const access = checkAccess(userId, 'approve');
        if (!access.allowed) {
            return sendMessage(chatId, access.reason);
        }

        if (!args || args.length === 0) {
            return sendMessage(chatId,
                `⚠️ <b>Использование:</b>\n` +
                `/approve ID_ТОВАРА\n\n` +
                `Пример: <code>/approve TEST_001</code>`
            );
        }

        const productId = args[0];
        return this.handleApprove(chatId, userId, productId);
    },

    async handleApprove(chatId, userId, productId) {
        const product = SessionStore.pendingProducts.get(productId);

        if (!product) {
            return sendMessage(chatId, `❌ Товар <code>${productId}</code> не найден в очереди!`);
        }

        // Обновляем статус
        product.status = 'active';
        SessionStore.pendingProducts.delete(productId);
        SessionStore.processedToday++;

        // Обновляем статистику модератора
        ModeratorsDB.updateStats(userId, 'accept');

        // Уведомляем продавца
        await this.notifySeller(product, 'approved');

        return sendMessage(chatId,
            `✅ <b>ТОВАР ПРИНЯТ!</b>\n\n` +
            `📦 ${product.title}\n` +
            `👤 Продавец уведомлён\n\n` +
            `Осталось в очереди: ${SessionStore.pendingProducts.size}`
        );
    },

    /**
     * /reject [id] [причина] - Отклонить товар
     */
    async reject(chatId, userId, args) {
        const access = checkAccess(userId, 'reject');
        if (!access.allowed) {
            return sendMessage(chatId, access.reason);
        }

        if (!args || args.length < 1) {
            return sendMessage(chatId,
                `⚠️ <b>Использование:</b>\n` +
                `/reject ID_ТОВАРА [причина]\n\n` +
                `Пример: <code>/reject TEST_001 Плохие фото</code>`
            );
        }

        const productId = args[0];
        const reason = args.slice(1).join(' ') || 'Не указана';

        return this.handleReject(chatId, userId, productId, reason);
    },

    async handleReject(chatId, userId, productId, reason) {
        const product = SessionStore.pendingProducts.get(productId);

        if (!product) {
            return sendMessage(chatId, `❌ Товар <code>${productId}</code> не найден в очереди!`);
        }

        // Обновляем статус
        product.status = 'rejected';
        product.rejectReason = reason;
        SessionStore.pendingProducts.delete(productId);
        SessionStore.processedToday++;

        // Обновляем статистику модератора
        ModeratorsDB.updateStats(userId, 'reject');

        // Уведомляем продавца
        await this.notifySeller(product, 'rejected', reason);

        return sendMessage(chatId,
            `❌ <b>ТОВАР ОТКЛОНЁН!</b>\n\n` +
            `📦 ${product.title}\n` +
            `📝 Причина: ${reason}\n` +
            `👤 Продавец уведомлён\n\n` +
            `Осталось в очереди: ${SessionStore.pendingProducts.size}`
        );
    },

    /**
     * /ban [user_id] - Забанить продавца
     */
    async ban(chatId, userId, args) {
        const access = checkAccess(userId, 'ban');
        if (!access.allowed) {
            return sendMessage(chatId, access.reason);
        }

        if (!args || args.length === 0) {
            return sendMessage(chatId,
                `⚠️ <b>Использование:</b>\n` +
                `/ban ID_ПОЛЬЗОВАТЕЛЯ\n\n` +
                `Пример: <code>/ban USER_12345</code>`
            );
        }

        const userIdToBan = args[0];
        const reason = args.slice(1).join(' ') || 'Нарушение правил';

        SessionStore.bannedUsers.add(userIdToBan);
        ModeratorsDB.updateStats(userId, 'ban');

        return sendMessage(chatId,
            `🚫 <b>ПОЛЬЗОВАТЕЛЬ ЗАБАНЕН!</b>\n\n` +
            `🆔 ID: <code>${userIdToBan}</code>\n` +
            `📝 Причина: ${reason}\n\n` +
            `Всего забанено: ${SessionStore.bannedUsers.size}`
        );
    },

    /**
     * /warn [user_id] - Выдать предупреждение
     */
    async warn(chatId, userId, args) {
        const access = checkAccess(userId, 'warn');
        if (!access.allowed) {
            return sendMessage(chatId, access.reason);
        }

        if (!args || args.length === 0) {
            return sendMessage(chatId,
                `⚠️ <b>Использование:</b>\n` +
                `/warn ID_ПОЛЬЗОВАТЕЛЯ [причина]\n\n` +
                `Пример: <code>/warn USER_12345 Спам</code>`
            );
        }

        const userIdToWarn = args[0];
        const reason = args.slice(1).join(' ') || 'Нарушение правил';

        const currentWarnings = SessionStore.warnedUsers.get(userIdToWarn) || 0;
        SessionStore.warnedUsers.set(userIdToWarn, currentWarnings + 1);
        ModeratorsDB.updateStats(userId, 'warn');

        return sendMessage(chatId,
            `⚠️ <b>ПРЕДУПРЕЖДЕНИЕ ВЫДАНО!</b>\n\n` +
            `🆔 ID: <code>${userIdToWarn}</code>\n` +
            `📝 Причина: ${reason}\n` +
            `📊 Всего предупреждений: ${currentWarnings + 1}\n\n` +
            `При 3 предупреждениях пользователь будет забанен автоматически.`
        );
    },

    /**
     * /user [id] - Информация о пользователе
     */
    async user(chatId, userId, args) {
        const access = checkAccess(userId, 'user');
        if (!access.allowed) {
            return sendMessage(chatId, access.reason);
        }

        // Если не указан ID, показываем информацию по товару
        if (!args || args.length === 0) {
            return sendMessage(chatId,
                `⚠️ <b>Использование:</b>\n` +
                `/user ID_ТОВАРА или /user ID_ПОЛЬЗОВАТЕЛЯ\n\n` +
                `Пример: <code>/user TEST_001</code>`
            );
        }

        const searchId = args[0];

        // Ищем товар
        const product = SessionStore.pendingProducts.get(searchId);
        if (product) {
            return this.handleUserInfo(chatId, userId, searchId);
        }

        // Если не нашли товар, ищем по ID пользователя (упрощённо)
        return sendMessage(chatId, `🔍 Информация о пользователе <code>${searchId}</code> будет доступна из БД.`);
    },

    async handleUserInfo(chatId, userId, productId) {
        const product = SessionStore.pendingProducts.get(productId);

        if (!product) {
            return sendMessage(chatId, `❌ Товар <code>${productId}</code> не найден!`);
        }

        const userInfo = formatUserInfo(product.seller);

        return sendMessage(chatId, userInfo);
    },

    /**
     * /stats - Статистика модератора
     */
    async stats(chatId, userId) {
        const access = checkAccess(userId, 'stats');
        if (!access.allowed) {
            return sendMessage(chatId, access.reason);
        }

        const mod = ModeratorsDB.getById(userId);
        const isAdmin = ModeratorsDB.isAdmin(userId);

        let text = `
📊 <b>ВАША СТАТИСТИКА</b>

👤 <b>${mod.name}</b>
🛡 Роль: ${mod.role === 'admin' ? 'Администратор' : 'Модератор'}

📈 <b>Действия:</b>
✅ Принято: ${mod.stats.accepted}
❌ Отклонено: ${mod.stats.rejected}
⚠️ Предупреждений выдано: ${mod.stats.warnings}
🚫 Банов: ${mod.stats.banned}
        `.trim();

        // Если админ - показываем общую статистику
        if (isAdmin) {
            const sessionTime = Math.floor((new Date() - SessionStore.sessionStart) / 1000 / 60);

            text += `\n\n📊 <b>ОБЩАЯ СТАТИСТИКА СИСТЕМЫ</b>\n\n`;
            text += `⏱ Время работы: ${sessionTime} мин\n`;
            text += `👥 Всего модераторов: ${ModeratorsDB.getAll().length}\n`;
            text += `🟢 Онлайн: ${ModeratorsDB.getAvailable().length}\n`;
            text += `📝 В очереди: ${SessionStore.pendingProducts.size}\n`;
            text += `📦 Обработано сегодня: ${SessionStore.processedToday}\n`;
            text += `🚫 Забанено: ${SessionStore.bannedUsers.size}`;
        }

        return sendMessage(chatId, text);
    },

    /**
     * /admin - Админ-панель
     */
    async admin(chatId, userId) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ <b>Доступ запрещён!</b>\n\nЭта команда только для администратора.');
        }

        const sessionTime = Math.floor((new Date() - SessionStore.sessionStart) / 1000 / 60);

        return sendMessage(chatId,
            `👑 <b>АДМИН-ПАНЕЛЬ</b>\n\n` +
            `⏱ Время работы: ${sessionTime} мин\n\n` +
            `📊 <b>Статистика:</b>\n` +
            `👥 Модераторов: ${ModeratorsDB.getAll().length}\n` +
            `🟢 Онлайн: ${ModeratorsDB.getAvailable().length}\n` +
            `📝 В очереди: ${SessionStore.pendingProducts.size}\n` +
            `📦 Обработано: ${SessionStore.processedToday}\n` +
            `🚫 Забанено: ${SessionStore.bannedUsers.size}\n\n` +
            `📝 <b>Журнал:</b>\n` +
            `Последняя активность: ${SessionStore.lastActivity.toLocaleTimeString()}`
        );
    },

    /**
     * /help - Справка
     */
    async help(chatId, userId) {
        const access = checkAccess(userId, 'help');

        if (!access.allowed) {
            return sendMessage(chatId,
                `🤖 <b>YakMarket Bot</b>\n\n` +
                `Это система модерации.\n` +
                `Доступ ограничен.`
            );
        }

        const isAdmin = ModeratorsDB.isAdmin(userId);

        let text = `
🤖 <b>КОМАНДЫ МОДЕРАТОРА</b>

📋 <b>Основные:</b>
/pending — Список товаров на проверке
/stats — Ваша статистика
/help — Эта справка

⚡️ <b>Действия с товарами:</b>
/approve ID — Принять товар
/reject ID [причина] — Отклонить товар
/user ID — Информация о продавце
        `.trim();

        if (isAdmin) {
            text += `\n\n👑 <b>Команды администратора:</b>\n`;
            text += `/admin — Панель управления\n`;
            text += `/ban ID — Забанить пользователя\n`;
            text += `/warn ID — Выдать предупреждение`;
        }

        text += `\n\n💡 <b>Подсказка:</b> Используйте кнопки под товарами для быстрых действий.`;

        return sendMessage(chatId, text);
    },

    /**
     * Уведомление продавца о решении
     */
    async notifySeller(product, status, reason = null) {
        // В реальной системе здесь отправка сообщения продавцу
        // Пока просто логируем
        console.log(`[Notify] Seller ${product.seller.id}: product ${status}${reason ? ', reason: ' + reason : ''}`);
    }
};

// ═══════════════════════════════════════════════════════════════════
// 🔘 ОБРАБОТЧИК INLINE КНОПОК
// ═══════════════════════════════════════════════════════════════════

async function handleCallback(callbackQuery, strapi) {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const userId = String(callbackQuery.from.id);
    const messageId = callbackQuery.message.message_id;

    // Подтверждаем нажатие
    await answerCallback(callbackQuery.id);

    // Разбираем callback_data
    const [action, productId, ...extra] = data.split('_');

    switch (action) {
        case 'approve':
            await CommandHandlers.handleApprove(chatId, userId, productId);
            break;

        case 'reject':
            if (extra.length > 0) {
                // Если есть причина в callback (reject_ID_reason)
                const reason = extra.join('_');
                await CommandHandlers.handleReject(chatId, userId, productId, reason);
            } else {
                // Показываем кнопки с причинами
                const buttons = getRejectReasonButtons(productId);
                await sendMessage(chatId, '❌ Выберите причину отклонения:', { reply_markup: { inline_keyboard: buttons } });
            }
            break;

        case 'user':
            await CommandHandlers.handleUserInfo(chatId, userId, productId);
            break;

        case 'ban':
            // Получаем товар и баним продавца
            const product = SessionStore.pendingProducts.get(productId);
            if (product) {
                await CommandHandlers.ban(chatId, userId, [product.seller.id, 'Нарушение через кнопку']);
            }
            break;

        case 'warn':
            const prod = SessionStore.pendingProducts.get(productId);
            if (prod) {
                await CommandHandlers.warn(chatId, userId, [prod.seller.id, 'Предупреждение через кнопку']);
            }
            break;

        case 'details':
            const p = SessionStore.pendingProducts.get(productId);
            if (p) {
                await sendMessage(chatId, `
📋 <b>ПОДРОБНАЯ ИНФОРМАЦИЯ</b>

🆔 ID товара: <code>${p.id}</code>
📅 Создан: ${p.createdAt}
🔄 Статус: ${p.status}

Действия доступны через кнопки выше.
                `.trim());
            }
            break;

        case 'back':
            // Возврат к карточке товара
            const backProduct = SessionStore.pendingProducts.get(productId);
            if (backProduct) {
                await sendMessageWithButtons(chatId, formatProductCard(backProduct), getProductButtons(productId));
            }
            break;
    }
}

// ═══════════════════════════════════════════════════════════════════
// 📡 POLLING МЕХАНИЗМ
// ═══════════════════════════════════════════════════════════════════

async function startPolling(strapi) {
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
                    SessionStore.lastActivity = new Date();

                    // Обработка сообщений
                    if (update.message && update.message.text) {
                        const chatId = update.message.chat.id;
                        const userId = String(update.message.from.id);
                        const text = update.message.text.trim();
                        const username = update.message.from.username || 'Unknown';

                        // Разбираем команду
                        const parts = text.split(' ');
                        const command = parts[0].replace('/', '').split('@')[0]; // Убираем @botname
                        const args = parts.slice(1);

                        strapi.log.info(`💬 [Command] ${username} (${userId}): ${command}`);

                        // Выполняем команду
                        if (CommandHandlers[command]) {
                            try {
                                await CommandHandlers[command](chatId, userId, args);
                            } catch (err) {
                                strapi.log.error(`[Command Error] ${command}: ${err.message}`);
                                await sendMessage(chatId, '❌ Произошла ошибка при выполнении команды.');
                            }
                        } else {
                            // Неизвестная команда
                            await sendMessage(chatId,
                                `🤖 Неизвестная команда.\n` +
                                `Используйте /help для списка команд.`
                            );
                        }
                    }

                    // Обработка нажатий кнопок
                    if (update.callback_query) {
                        await handleCallback(update.callback_query, strapi);
                    }
                }
            }
        } catch (err) {
            strapi.log.error(`❌ [Polling] Ошибка: ${err.message}`);
        }
    }

    // Запускаем polling каждые 2 секунды
    setInterval(checkUpdates, 2000);
    strapi.log.info('🤖 [Bot] Polling запущен (интервал: 2 сек)');
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 ГЛАВНЫЙ МОДУЛЬ STRAPI
// ═══════════════════════════════════════════════════════════════════

module.exports = {
    register() { },

    async bootstrap({ strapi }) {
        strapi.log.info('╔════════════════════════════════════════════════════════╗');
        strapi.log.info('║    🤖 YAKMARKET MODERATION SYSTEM v2.0 ЗАПУСК...      ║');
        strapi.log.info('╚════════════════════════════════════════════════════════╝');

        // ═══════════════════════════════════════════════════════════
        // 1. Инициализация тестового товара
        // ═══════════════════════════════════════════════════════════
        SessionStore.pendingProducts.set(TEST_PRODUCT.id, TEST_PRODUCT);
        strapi.log.info(`🧪 [Test] Тестовый товар добавлен: ${TEST_PRODUCT.title}`);

        // ═══════════════════════════════════════════════════════════
        // 2. Приветствие всем модераторам
        // ═══════════════════════════════════════════════════════════
        const moderators = ModeratorsDB.getAll();
        strapi.log.info(`👥 [Moderators] Загружено: ${moderators.length} модераторов`);

        for (const mod of moderators) {
            try {
                const welcomeText = `
👋 <b>Привет, ${mod.name}!</b>

✅ <b>YakMarket MODERATION SYSTEM</b> запущена!
🛡 Ваша роль: <b>${mod.role === 'admin' ? 'Администратор ⭐' : 'Модератор'}</b>

📊 <b>Ваша статистика:</b>
✅ Принято: ${mod.stats.accepted}
❌ Отклонено: ${mod.stats.rejected}
⚠️ Предупреждений: ${mod.stats.warnings}
🚫 Банов: ${mod.stats.banned}

📝 <b>На проверке:</b> ${SessionStore.pendingProducts.size} товаров

<i>Используйте /help для списка команд</i>
                `.trim();

                await sendMessage(mod.id, welcomeText);
                strapi.log.info(`✅ [Welcome] Отправлено: ${mod.name} (${mod.id})`);
            } catch (err) {
                if (err.response?.status === 403) {
                    strapi.log.error(`❌ [Welcome] ${mod.name} — не нажал /start в боте!`);
                } else {
                    strapi.log.error(`❌ [Welcome] Ошибка ${mod.name}: ${err.message}`);
                }
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 3. Запуск polling
        // ═══════════════════════════════════════════════════════════
        await startPolling(strapi);

        // ═══════════════════════════════════════════════════════════
        // 4. Экспорт функций для внешнего использования
        // ═══════════════════════════════════════════════════════════
        strapi.moderation = {
            // Добавить товар в очередь (вызывается из lifecycles)
            addProduct: async (product) => {
                SessionStore.pendingProducts.set(product.id, product);
                strapi.log.info(`📦 [Queue] Новый товар: ${product.title} (${product.id})`);

                // Уведомляем всех доступных модераторов
                const available = ModeratorsDB.getAvailable();
                for (const mod of available) {
                    try {
                        const text = formatProductCard(product);
                        const buttons = getProductButtons(product.id);
                        await sendMessageWithButtons(mod.id, text, buttons);
                    } catch (err) {
                        strapi.log.error(`[Notify] Ошибка отправки ${mod.name}: ${err.message}`);
                    }
                }
            },

            // Получить статистику
            getStats: () => ({
                pending: SessionStore.pendingProducts.size,
                processed: SessionStore.processedToday,
                banned: SessionStore.bannedUsers.size,
                moderators: moderators.length
            }),

            // Проверить является ли пользователь модератором
            isModerator: (id) => ModeratorsDB.isModerator(id),

            // Получить админа
            getAdmin: () => ModeratorsDB.getAdmin()
        };

        strapi.log.info('✅ [YakMarket] Система модерации полностью запущена!');
        strapi.log.info(`📊 [Status] Товаров в очереди: ${SessionStore.pendingProducts.size}`);
    },
};
