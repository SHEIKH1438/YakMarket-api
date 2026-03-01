/**
 * ═══════════════════════════════════════════════════════════════════
 * 🤖 YAKMARKET MODERATION SYSTEM v3.0
 * Полная система с управлением пользователями
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
    pendingProducts: new Map(),
    bannedUsers: new Map(),      // Забаненные пользователи (с причиной)
    warnedUsers: new Map(),      // Предупреждённые (счётчик)
    allUsers: new Map(),         // Все пользователи из Strapi
    guestSessions: new Set(),    // Гостевые сессии
    processedToday: 0,
    sessionStart: new Date(),
    lastActivity: new Date(),

    // Для постраничного просмотра
    currentPage: 0,
    itemsPerPage: 5
};

// ═══════════════════════════════════════════════════════════════════
// 🧪 ТЕСТОВЫЙ ТОВАР
// ═══════════════════════════════════════════════════════════════════
const TEST_PRODUCT = {
    id: 'TEST_001',
    title: '🧪 iPhone 15 Pro 256GB',
    description: 'Новый iPhone 15 Pro, Natural Titanium. Гарантия 1 год. Полный комплект.',
    price: 15000,
    currency: 'TJS',
    seller: {
        id: 'USER_12345',
        name: 'Тестовый Продавец',
        phone: '+992900000001',
        telegram: '@test_seller',
        email: 'test@yakmarket.tj',
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
// 📨 TELEGRAM API ФУНКЦИИ
// ═══════════════════════════════════════════════════════════════════

async function sendMessage(chatId, text, options = {}) {
    try {
        const response = await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            ...options
        });
        return response.data;
    } catch (err) {
        console.error(`[Telegram] Ошибка:`, err.response?.data?.description || err.message);
        return null;
    }
}

async function sendMessageWithButtons(chatId, text, buttons) {
    return sendMessage(chatId, text, {
        reply_markup: { inline_keyboard: buttons }
    });
}

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
// 🛡️ БЕЗОПАСНОСТЬ
// ═══════════════════════════════════════════════════════════════════

function checkAccess(userId, command) {
    // Только админ имеет доступ ко ВСЕМУ
    if (ModeratorsDB.isAdmin(userId)) {
        return { allowed: true, role: 'admin' };
    }

    // Модератор - только базовые команды модерации
    if (ModeratorsDB.isModerator(userId)) {
        const modCommands = ['start', 'pending', 'approve', 'reject', 'user', 'stats', 'help'];
        if (modCommands.includes(command)) {
            return { allowed: true, role: 'moderator' };
        }
        return { allowed: false, reason: '⛔ Эта команда только для АДМИНИСТРАТОРА!' };
    }

    // Обычный пользователь - только start
    if (command === 'start') {
        return { allowed: true, role: 'user' };
    }

    return { allowed: false, reason: '⛔ У вас нет доступа к этому боту!' };
}

// ═══════════════════════════════════════════════════════════════════
// 👥 УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ИЗ STRAPI
// ═══════════════════════════════════════════════════════════════════

async function loadUsersFromStrapi(strapi) {
    try {
        // Загружаем пользователей из Strapi
        const users = await strapi.db.query('plugin::users-permissions.user').findMany({
            select: ['id', 'username', 'email', 'phone', 'createdAt', 'confirmed', 'blocked']
        });

        SessionStore.allUsers.clear();

        users.forEach(user => {
            SessionStore.allUsers.set(String(user.id), {
                id: String(user.id),
                name: user.username || 'Без имени',
                email: user.email || 'Нет email',
                phone: user.phone || 'Нет телефона',
                telegram: null, // Можно добавить поле telegram в Strapi
                joinedAt: user.createdAt,
                confirmed: user.confirmed,
                blocked: user.blocked,
                type: 'registered'
            });
        });

        console.log(`👥 [Users] Загружено ${users.length} пользователей из Strapi`);
        return users.length;
    } catch (err) {
        console.error('❌ [Users] Ошибка загрузки:', err.message);
        return 0;
    }
}

async function deleteUserFromStrapi(strapi, userId) {
    try {
        await strapi.db.query('plugin::users-permissions.user').delete({
            where: { id: userId }
        });

        // Удаляем из локального кэша
        SessionStore.allUsers.delete(String(userId));

        return true;
    } catch (err) {
        console.error('❌ [Users] Ошибка удаления:', err.message);
        return false;
    }
}

async function blockUserInStrapi(strapi, userId) {
    try {
        await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: userId },
            data: { blocked: true }
        });

        // Обновляем в кэше
        const user = SessionStore.allUsers.get(String(userId));
        if (user) user.blocked = true;

        return true;
    } catch (err) {
        console.error('❌ [Users] Ошибка блокировки:', err.message);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════
// 📋 ФОРМАТИРОВАНИЕ
// ═══════════════════════════════════════════════════════════════════

function formatUserCard(user, index) {
    const status = user.blocked ? '🚫 ЗАБЛОКИРОВАН' :
        user.confirmed ? '✅ Подтверждён' : '⏳ Ожидает подтверждения';

    return `
👤 <b>ПОЛЬЗОВАТЕЛЬ #${index}</b>

🆔 ID: <code>${user.id}</code>
📛 Имя: ${user.name}
📧 Email: ${user.email}
📱 Телефон: ${user.phone}
📅 Регистрация: ${new Date(user.joinedAt).toLocaleDateString()}
📊 Статус: ${status}
    `.trim();
}

function formatProductCard(product, index = null) {
    const num = index ? `#${index} ` : '';
    return `
📦 <b>${num}${product.title}</b>

💰 <b>Цена:</b> ${product.price} ${product.currency}
📂 <b>Категория:</b> ${product.category}
📍 <b>Локация:</b> ${product.location}

👤 <b>Продавец:</b> ${product.seller.name}
📱 <b>Телефон:</b> ${product.seller.phone}
🆔 <code>${product.id}</code>
    `.trim();
}

// ═══════════════════════════════════════════════════════════════════
// ⌨️ КНОПКИ
// ═══════════════════════════════════════════════════════════════════

function getProductButtons(productId) {
    return [
        [
            { text: '✅ Принять', callback_data: `approve_${productId}` },
            { text: '❌ Отклонить', callback_data: `reject_${productId}` }
        ],
        [
            { text: '👤 Продавец', callback_data: `user_${productId}` },
            { text: '📋 Детали', callback_data: `details_${productId}` }
        ]
    ];
}

function getUserActionButtons(userId) {
    return [
        [
            { text: '🚫 Забанить', callback_data: `banuser_${userId}` },
            { text: '⚠️ Предупредить', callback_data: `warnuser_${userId}` }
        ],
        [
            { text: '🗑 Удалить', callback_data: `deluser_${userId}` },
            { text: '🔙 Назад', callback_data: 'back_to_users' }
        ]
    ];
}

function getPaginationButtons(currentPage, totalPages) {
    const buttons = [];

    if (currentPage > 0) {
        buttons.push({ text: '⬅️ Назад', callback_data: `page_${currentPage - 1}` });
    }

    buttons.push({ text: `📄 ${currentPage + 1}/${totalPages}`, callback_data: 'noop' });

    if (currentPage < totalPages - 1) {
        buttons.push({ text: 'Вперёд ➡️', callback_data: `page_${currentPage + 1}` });
    }

    return [buttons];
}

// ═══════════════════════════════════════════════════════════════════
// 🔄 ОБРАБОТЧИКИ КОМАНД
// ═══════════════════════════════════════════════════════════════════

const CommandHandlers = {

    async start(chatId, userId, args) {
        const access = checkAccess(userId, 'start');

        if (!access.allowed) {
            return sendMessage(chatId, access.reason);
        }

        // Обработка deep links
        if (args && args.length > 0) {
            const param = args[0];
            if (param.startsWith('approve_')) {
                return this.handleApprove(chatId, userId, param.replace('approve_', ''));
            }
            if (param.startsWith('reject_')) {
                return sendMessage(chatId, '❌ Введите причину:\n/reject ' + param.replace('reject_', '') + ' причина');
            }
        }

        if (access.role === 'admin') {
            const mod = ModeratorsDB.getById(userId);
            return sendMessage(chatId,
                `👑 <b>Привет, АДМИН ${mod.name}!</b>\n\n` +
                `🤖 <b>YakMarket ADMIN PANEL</b>\n\n` +
                `<b>Админ команды:</b>\n` +
                `/users - Список всех пользователей\n` +
                `/userinfo ID - Информация о пользователе\n` +
                `/ban ID - Забанить пользователя\n` +
                `/warn ID - Предупредить пользователя\n` +
                `/deleteuser ID - Удалить пользователя\n` +
                `/statsall - Общая статистика\n\n` +
                `<b>Модераторские:</b>\n` +
                `/pending - Товары на проверке\n` +
                `/approve /reject /stats /help`
            );
        }

        if (access.role === 'moderator') {
            const mod = ModeratorsDB.getById(userId);
            return sendMessage(chatId,
                `👋 <b>Привет, ${mod.name}!</b>\n\n` +
                `🛡 <b>Модератор YakMarket</b>\n\n` +
                `Доступные команды:\n` +
                `/pending - Товары на проверке\n` +
                `/approve ID - Принять товар\n` +
                `/reject ID - Отклонить товар\n` +
                `/user ID - Инфо о продавце\n` +
                `/stats - Ваша статистика\n` +
                `/help - Справка`
            );
        }

        return sendMessage(chatId,
            `👋 <b>Добро пожаловать!</b>\n\n` +
            `🛍 Это система модерации YakMarket.\n` +
            `⛔ У вас нет доступа к модерации.`
        );
    },

    async pending(chatId, userId) {
        const access = checkAccess(userId, 'pending');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        if (SessionStore.pendingProducts.size === 0) {
            return sendMessage(chatId, `📭 Очередь пуста!`);
        }

        await sendMessage(chatId, `📋 <b>ТОВАРЫ НА ПРОВЕРКЕ:</b> ${SessionStore.pendingProducts.size}`);

        let index = 1;
        for (const [id, product] of SessionStore.pendingProducts) {
            await sendMessageWithButtons(chatId, formatProductCard(product, index), getProductButtons(id));
            index++;
            await new Promise(r => setTimeout(r, 300));
        }
    },

    async approve(chatId, userId, args) {
        const access = checkAccess(userId, 'approve');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        if (!args?.length) {
            return sendMessage(chatId, '⚠️ Использование: /approve ID_ТОВАРА');
        }

        return this.handleApprove(chatId, userId, args[0]);
    },

    async handleApprove(chatId, userId, productId) {
        const product = SessionStore.pendingProducts.get(productId);
        if (!product) {
            return sendMessage(chatId, `❌ Товар ${productId} не найден!`);
        }

        SessionStore.pendingProducts.delete(productId);
        SessionStore.processedToday++;
        ModeratorsDB.updateStats(userId, 'accept');

        return sendMessage(chatId,
            `✅ <b>ТОВАР ПРИНЯТ!</b>\n\n` +
            `📦 ${product.title}\n` +
            `👤 ${product.seller.name}\n\n` +
            `Осталось: ${SessionStore.pendingProducts.size}`
        );
    },

    async reject(chatId, userId, args) {
        const access = checkAccess(userId, 'reject');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        if (!args?.length) {
            return sendMessage(chatId, '⚠️ Использование: /reject ID_ТОВАРА причина');
        }

        const productId = args[0];
        const reason = args.slice(1).join(' ') || 'Не указана';

        const product = SessionStore.pendingProducts.get(productId);
        if (!product) {
            return sendMessage(chatId, `❌ Товар ${productId} не найден!`);
        }

        SessionStore.pendingProducts.delete(productId);
        SessionStore.processedToday++;
        ModeratorsDB.updateStats(userId, 'reject');

        return sendMessage(chatId,
            `❌ <b>ТОВАР ОТКЛОНЁН!</b>\n\n` +
            `📦 ${product.title}\n` +
            `📝 Причина: ${reason}\n\n` +
            `Осталось: ${SessionStore.pendingProducts.size}`
        );
    },

    // ═══════════════════════════════════════════════════════════════
    // 👥 КОМАНДЫ УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ (ТОЛЬКО АДМИН)
    // ═══════════════════════════════════════════════════════════════

    async users(chatId, userId, args, strapi) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только для АДМИНИСТРАТОРА!');
        }

        // Загружаем пользователей
        await loadUsersFromStrapi(strapi);

        const users = Array.from(SessionStore.allUsers.values());
        const totalPages = Math.ceil(users.length / SessionStore.itemsPerPage) || 1;

        SessionStore.currentPage = 0;

        await sendMessage(chatId,
            `👥 <b>СПИСОК ПОЛЬЗОВАТЕЛЕЙ</b>\n\n` +
            `📊 Всего: ${users.length}\n` +
            `📄 Страница 1/${totalPages}`
        );

        // Показываем первую страницу
        await this.showUsersPage(chatId, 0);
    },

    async showUsersPage(chatId, page) {
        const users = Array.from(SessionStore.allUsers.values());
        const totalPages = Math.ceil(users.length / SessionStore.itemsPerPage) || 1;

        const start = page * SessionStore.itemsPerPage;
        const end = start + SessionStore.itemsPerPage;
        const pageUsers = users.slice(start, end);

        let index = start + 1;
        for (const user of pageUsers) {
            const text = formatUserCard(user, index);
            const buttons = getUserActionButtons(user.id);
            await sendMessageWithButtons(chatId, text, buttons);
            index++;
            await new Promise(r => setTimeout(r, 200));
        }

        // Кнопки пагинации
        if (totalPages > 1) {
            await sendMessageWithButtons(chatId, '📄 Навигация:', getPaginationButtons(page, totalPages));
        }
    },

    async userinfo(chatId, userId, args, strapi) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только для АДМИНИСТРАТОРА!');
        }

        if (!args?.length) {
            return sendMessage(chatId, '⚠️ Использование: /userinfo ID_ПОЛЬЗОВАТЕЛЯ');
        }

        const searchId = args[0];

        // Если пользователи не загружены - загружаем
        if (SessionStore.allUsers.size === 0) {
            await loadUsersFromStrapi(strapi);
        }

        const user = SessionStore.allUsers.get(searchId);

        if (!user) {
            return sendMessage(chatId, `❌ Пользователь ${searchId} не найден!`);
        }

        const warnings = SessionStore.warnedUsers.get(user.id) || 0;
        const isBanned = SessionStore.bannedUsers.has(user.id);

        return sendMessageWithButtons(chatId,
            formatUserCard(user, 1) + `\n\n` +
            `⚠️ Предупреждений: ${warnings}\n` +
            `🚫 В бане: ${isBanned ? 'ДА' : 'Нет'}`,
            getUserActionButtons(user.id)
        );
    },

    async ban(chatId, userId, args, strapi) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только для АДМИНИСТРАТОРА!');
        }

        if (!args?.length) {
            // Показываем список для выбора
            if (SessionStore.allUsers.size === 0) {
                await loadUsersFromStrapi(strapi);
            }

            return sendMessage(chatId,
                `🚫 <b>ЗАБАНИТЬ ПОЛЬЗОВАТЕЛЯ</b>\n\n` +
                `Использование: /ban ID_ПОЛЬЗОВАТЕЛЯ причина\n\n` +
                `Для просмотра списка: /users\n\n` +
                `Всего пользователей: ${SessionStore.allUsers.size}`
            );
        }

        const userIdToBan = args[0];
        const reason = args.slice(1).join(' ') || 'Нарушение правил';

        // Блокируем в Strapi
        const blocked = await blockUserInStrapi(strapi, userIdToBan);

        if (!blocked) {
            return sendMessage(chatId, `❌ Не удалось забанить пользователя ${userIdToBan}`);
        }

        SessionStore.bannedUsers.set(userIdToBan, {
            reason,
            bannedAt: new Date(),
            bannedBy: userId
        });

        ModeratorsDB.updateStats(userId, 'ban');

        return sendMessage(chatId,
            `🚫 <b>ПОЛЬЗОВАТЕЛЬ ЗАБАНЕН!</b>\n\n` +
            `🆔 ID: <code>${userIdToBan}</code>\n` +
            `📝 Причина: ${reason}\n` +
            `✅ Также заблокирован в Strapi\n\n` +
            `Всего банов: ${SessionStore.bannedUsers.size}`
        );
    },

    async warn(chatId, userId, args, strapi) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только для АДМИНИСТРАТОРА!');
        }

        if (!args?.length) {
            return sendMessage(chatId,
                `⚠️ <b>ПРЕДУПРЕДИТЬ ПОЛЬЗОВАТЕЛЯ</b>\n\n` +
                `Использование: /warn ID_ПОЛЬЗОВАТЕЛЯ причина`
            );
        }

        const userIdToWarn = args[0];
        const reason = args.slice(1).join(' ') || 'Нарушение правил';

        const currentWarnings = SessionStore.warnedUsers.get(userIdToWarn) || 0;
        const newWarnings = currentWarnings + 1;

        SessionStore.warnedUsers.set(userIdToWarn, newWarnings);
        ModeratorsDB.updateStats(userId, 'warn');

        let message = `⚠️ <b>ПРЕДУПРЕЖДЕНИЕ ВЫДАНО!</b>\n\n` +
            `🆔 ID: <code>${userIdToWarn}</code>\n` +
            `📝 Причина: ${reason}\n` +
            `📊 Всего предупреждений: ${newWarnings}\n\n`;

        if (newWarnings >= 3) {
            message += `🚫 <b>АВТОМАТИЧЕСКИЙ БАН!</b>\n` +
                `Пользователь получил 3 предупреждения и будет забанен.`;

            // Автобан
            await this.ban(chatId, userId, [userIdToWarn, '3 предупреждения'], strapi);
        } else {
            message += `При 3 предупреждениях - автоматический бан.`;
        }

        return sendMessage(chatId, message);
    },

    async deleteuser(chatId, userId, args, strapi) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только для АДМИНИСТРАТОРА!');
        }

        if (!args?.length) {
            return sendMessage(chatId,
                `🗑 <b>УДАЛИТЬ ПОЛЬЗОВАТЕЛЯ</b>\n\n` +
                `⚠️ <b>ВНИМАНИЕ!</b> Это необратимое действие!\n\n` +
                `Использование: /deleteuser ID_ПОЛЬЗОВАТЕЛЯ\n\n` +
                `Пользователь будет полностью удалён из:\n` +
                `• Базы данных YakMarket\n` +
                `• Strapi CMS\n` +
                `• Всех связанных данных`
            );
        }

        const userIdToDelete = args[0];

        // Дополнительная проверка безопасности
        if (userIdToDelete === CONFIG.ADMIN_ID) {
            return sendMessage(chatId, '⛔ Нельзя удалить администратора!');
        }

        const deleted = await deleteUserFromStrapi(strapi, userIdToDelete);

        if (!deleted) {
            return sendMessage(chatId, `❌ Не удалось удалить пользователя ${userIdToDelete}`);
        }

        // Удаляем из списков
        SessionStore.bannedUsers.delete(userIdToDelete);
        SessionStore.warnedUsers.delete(userIdToDelete);

        return sendMessage(chatId,
            `🗑 <b>ПОЛЬЗОВАТЕЛЬ УДАЛЁН!</b>\n\n` +
            `🆔 ID: <code>${userIdToDelete}</code>\n` +
            `✅ Удалён из Strapi\n` +
            `✅ Удалён из всех систем\n\n` +
            `Осталось пользователей: ${SessionStore.allUsers.size}`
        );
    },

    async statsall(chatId, userId, strapi) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только для АДМИНИСТРАТОРА!');
        }

        // Загружаем актуальные данные
        if (SessionStore.allUsers.size === 0) {
            await loadUsersFromStrapi(strapi);
        }

        const totalStats = ModeratorsDB.getTotalStats();
        const sessionTime = Math.floor((new Date() - SessionStore.sessionStart) / 1000 / 60);

        return sendMessage(chatId,
            `📊 <b>ОБЩАЯ СТАТИСТИКА СИСТЕМЫ</b>\n\n` +
            `⏱ Время работы: ${sessionTime} мин\n\n` +
            `👥 <b>Пользователи:</b>\n` +
            `• Всего зарегистрировано: ${SessionStore.allUsers.size}\n` +
            `• Забанено: ${SessionStore.bannedUsers.size}\n` +
            `• С предупреждениями: ${SessionStore.warnedUsers.size}\n\n` +
            `📦 <b>Товары:</b>\n` +
            `• На проверке: ${SessionStore.pendingProducts.size}\n` +
            `• Обработано сегодня: ${SessionStore.processedToday}\n\n` +
            `📈 <b>Действия модераторов:</b>\n` +
            `• Принято: ${totalStats.accepted}\n` +
            `• Отклонено: ${totalStats.rejected}\n` +
            `• Предупреждений: ${totalStats.warnings}\n` +
            `• Банов: ${totalStats.banned}`
        );
    },

    async stats(chatId, userId) {
        const access = checkAccess(userId, 'stats');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        const mod = ModeratorsDB.getById(userId);

        return sendMessage(chatId,
            `📊 <b>ВАША СТАТИСТИКА</b>\n\n` +
            `👤 ${mod.name}\n` +
            `🛡 ${mod.role === 'admin' ? 'Администратор' : 'Модератор'}\n\n` +
            `✅ Принято: ${mod.stats.accepted}\n` +
            `❌ Отклонено: ${mod.stats.rejected}\n` +
            `⚠️ Предупреждений: ${mod.stats.warnings}\n` +
            `🚫 Банов: ${mod.stats.banned}`
        );
    },

    async help(chatId, userId) {
        const access = checkAccess(userId, 'help');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        if (ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId,
                `👑 <b>АДМИН КОМАНДЫ:</b>\n\n` +
                `/users - Список всех пользователей\n` +
                `/userinfo ID - Инфо о пользователе\n` +
                `/ban ID причина - Забанить\n` +
                `/warn ID причина - Предупредить\n` +
                `/deleteuser ID - Удалить навсегда\n` +
                `/statsall - Общая статистика\n\n` +
                `📋 <b>Модерация:</b>\n` +
                `/pending, /approve, /reject, /stats`
            );
        }

        return sendMessage(chatId,
            `🛡 <b>КОМАНДЫ МОДЕРАТОРА:</b>\n\n` +
            `/pending - Товары на проверке\n` +
            `/approve ID - Принять товар\n` +
            `/reject ID причина - Отклонить\n` +
            `/user ID - Инфо о продавце\n` +
            `/stats - Ваша статистика`
        );
    },

    async notifySeller(product, status) {
        console.log(`[Notify] ${product.seller.id}: ${status}`);
    }
};

// ═══════════════════════════════════════════════════════════════════
// 🔘 ОБРАБОТЧИК CALLBACK КНОПОК
// ═══════════════════════════════════════════════════════════════════

async function handleCallback(callbackQuery, strapi) {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const userId = String(callbackQuery.from.id);

    await answerCallback(callbackQuery.id);

    // Проверяем права
    if (!ModeratorsDB.isModerator(userId) && !ModeratorsDB.isAdmin(userId)) {
        return sendMessage(chatId, '⛔ Нет доступа!');
    }

    // Обработка кнопок товаров
    if (data.startsWith('approve_')) {
        const productId = data.replace('approve_', '');
        return CommandHandlers.handleApprove(chatId, userId, productId);
    }

    if (data.startsWith('reject_')) {
        const productId = data.replace('reject_', '');
        return sendMessage(chatId, `Введите причину отклонения:\n/reject ${productId} причина`);
    }

    // Обработка кнопок пользователей (только админ)
    if (data.startsWith('banuser_')) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только админ!');
        }
        const uid = data.replace('banuser_', '');
        return CommandHandlers.ban(chatId, userId, [uid], strapi);
    }

    if (data.startsWith('warnuser_')) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только админ!');
        }
        const uid = data.replace('warnuser_', '');
        return CommandHandlers.warn(chatId, userId, [uid], strapi);
    }

    if (data.startsWith('deluser_')) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только админ!');
        }
        const uid = data.replace('deluser_', '');
        return CommandHandlers.deleteuser(chatId, userId, [uid], strapi);
    }

    // Пагинация
    if (data.startsWith('page_')) {
        if (!ModeratorsDB.isAdmin(userId)) return;
        const page = parseInt(data.replace('page_', ''));
        SessionStore.currentPage = page;
        return CommandHandlers.showUsersPage(chatId, page);
    }

    if (data === 'back_to_users') {
        if (!ModeratorsDB.isAdmin(userId)) return;
        return CommandHandlers.showUsersPage(chatId, SessionStore.currentPage);
    }
}

// ═══════════════════════════════════════════════════════════════════
// 📡 POLLING
// ═══════════════════════════════════════════════════════════════════

async function startPolling(strapi) {
    let lastUpdateId = 0;

    async function checkUpdates() {
        try {
            const response = await axios.get(`${TELEGRAM_API}/getUpdates`, {
                params: { offset: lastUpdateId + 1, limit: 10 }
            });

            if (response.data.ok && response.data.result.length > 0) {
                for (const update of response.data.result) {
                    lastUpdateId = update.update_id;
                    SessionStore.lastActivity = new Date();

                    // Текстовые сообщения
                    if (update.message?.text) {
                        const chatId = update.message.chat.id;
                        const userId = String(update.message.from.id);
                        const text = update.message.text.trim();
                        const parts = text.split(' ');
                        const command = parts[0].replace('/', '').split('@')[0];
                        const args = parts.slice(1);

                        console.log(`💬 [${userId}] ${command}`);

                        if (CommandHandlers[command]) {
                            try {
                                await CommandHandlers[command](chatId, userId, args, strapi);
                            } catch (err) {
                                console.error(`[Error] ${command}:`, err.message);
                                await sendMessage(chatId, '❌ Ошибка выполнения команды');
                            }
                        } else {
                            await sendMessage(chatId, 'Неизвестная команда. Используйте /help');
                        }
                    }

                    // Callback кнопки
                    if (update.callback_query) {
                        await handleCallback(update.callback_query, strapi);
                    }
                }
            }
        } catch (err) {
            console.error('❌ [Polling]:', err.message);
        }
    }

    setInterval(checkUpdates, 2000);
    console.log('🤖 Polling запущен');
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 ГЛАВНЫЙ МОДУЛЬ
// ═══════════════════════════════════════════════════════════════════

module.exports = {
    register() { },

    async bootstrap({ strapi }) {
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║    🤖 YAKMARKET MODERATION SYSTEM v3.0 ЗАПУСК          ║');
        console.log('╚════════════════════════════════════════════════════════╝');

        // 1. Инициализация тестового товара
        SessionStore.pendingProducts.set(TEST_PRODUCT.id, TEST_PRODUCT);
        console.log(`🧪 [Test] Тестовый товар добавлен`);

        // 2. Загрузка пользователей
        await loadUsersFromStrapi(strapi);

        // 3. Приветствие модераторам
        const moderators = ModeratorsDB.getAll();
        for (const mod of moderators) {
            try {
                const isAdmin = mod.role === 'admin';
                const text = isAdmin
                    ? `👑 <b>АДМИН-ПАНЕЛЬ АКТИВНА!</b>\n\nПривет, ${mod.name}!\n\nКоманды:\n/users - Пользователи\n/ban /warn /deleteuser\n/statsall - Статистика`
                    : `🛡 <b>МОДЕРАЦИЯ АКТИВНА!</b>\n\nПривет, ${mod.name}!\n\n/pending - Товары на проверке`;

                await sendMessage(mod.id, text);
                console.log(`✅ [Welcome] ${mod.name}`);
            } catch (err) {
                console.error(`❌ [Welcome] ${mod.name}:`, err.message);
            }
        }

        // 4. Запуск polling
        await startPolling(strapi);

        // 5. API для внешнего использования
        strapi.moderation = {
            addProduct: async (product) => {
                SessionStore.pendingProducts.set(product.id, product);
                console.log(`📦 [Queue] ${product.title}`);

                // Уведомляем модераторов
                const available = ModeratorsDB.getAvailable();
                for (const mod of available) {
                    try {
                        const text = formatProductCard(product);
                        const buttons = getProductButtons(product.id);
                        await sendMessageWithButtons(mod.id, text, buttons);
                    } catch (err) {
                        console.error(`[Notify] ${mod.name}:`, err.message);
                    }
                }
            },

            reloadUsers: () => loadUsersFromStrapi(strapi),

            getStats: () => ({
                users: SessionStore.allUsers.size,
                banned: SessionStore.bannedUsers.size,
                warned: SessionStore.warnedUsers.size,
                pending: SessionStore.pendingProducts.size,
                processed: SessionStore.processedToday
            })
        };

        console.log('✅ [YakMarket] Система запущена!');
        console.log(`📊 Пользователей: ${SessionStore.allUsers.size}`);
        console.log(`📦 В очереди: ${SessionStore.pendingProducts.size}`);
    }
};
