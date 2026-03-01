/**
 * ═══════════════════════════════════════════════════════════════════
 * 🤖 YAKMARKET MODERATION SYSTEM v3.1
 * С улучшенным логированием и обработкой ошибок
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

const axios = require('axios');
const ModeratorsDB = require('../config/moderators');

// ═══════════════════════════════════════════════════════════════════
// 🔐 КОНФИГУРАЦИЯ
// ═══════════════════════════════════════════════════════════════════
const CONFIG = {
    BOT_TOKEN: '8662410817:AAEPg37YkiJ6XnfnpmDW_fg1kp0hsz2_Eh0',
    ADMIN_ID: '8012802187',
    STRAPI_URL: process.env.STRAPI_URL || 'https://yakmarket-api-production.up.railway.app',
    API_BASE: 'https://api.telegram.org/bot'
};

const TELEGRAM_API = `${CONFIG.API_BASE}${CONFIG.BOT_TOKEN}`;

// ═══════════════════════════════════════════════════════════════════
// 📦 ХРАНИЛИЩЕ
// ═══════════════════════════════════════════════════════════════════
const SessionStore = {
    pendingProducts: new Map(),
    bannedUsers: new Map(),
    warnedUsers: new Map(),
    allUsers: new Map(),
    processedToday: 0,
    sessionStart: new Date(),
    commandLog: [] // Лог команд
};

// ═══════════════════════════════════════════════════════════════════
// 🧪 ТЕСТОВЫЙ ТОВАР
// ═══════════════════════════════════════════════════════════════════
const TEST_PRODUCT = {
    id: 'TEST_001',
    title: '🧪 iPhone 15 Pro 256GB',
    description: 'Новый iPhone. Гарантия 1 год.',
    price: 15000,
    currency: 'TJS',
    seller: { id: 'USER_12345', name: 'Тест Продавец', phone: '+992900000001' },
    category: 'Электроника',
    location: 'Душанбе',
    status: 'pending'
};

// ═══════════════════════════════════════════════════════════════════
// 📨 TELEGRAM API
// ═══════════════════════════════════════════════════════════════════

async function sendMessage(chatId, text, options = {}) {
    try {
        console.log(`[Telegram] Отправка для ${chatId}: ${text.substring(0, 50)}...`);

        const response = await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            ...options
        });

        console.log(`[Telegram] ✅ Успешно отправлено`);
        return response.data;
    } catch (err) {
        console.error(`[Telegram] ❌ ОШИБКА:`, err.response?.data?.description || err.message);
        return null;
    }
}

async function sendMessageWithButtons(chatId, text, buttons) {
    return sendMessage(chatId, text, { reply_markup: { inline_keyboard: buttons } });
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
    console.log(`[Access] Проверка: user=${userId}, command=${command}`);

    // Админ - всё можно
    if (ModeratorsDB.isAdmin(userId)) {
        console.log(`[Access] ✅ АДМИН доступ`);
        return { allowed: true, role: 'admin' };
    }

    // Модератор - только базовые команды
    if (ModeratorsDB.isModerator(userId)) {
        const allowedCommands = ['start', 'pending', 'approve', 'reject', 'user', 'stats', 'help'];
        if (allowedCommands.includes(command)) {
            console.log(`[Access] ✅ МОДЕРАТОР доступ`);
            return { allowed: true, role: 'moderator' };
        }
        console.log(`[Access] ❌ Команда ${command} запрещена для модератора`);
        return { allowed: false, reason: `⛔ Команда "/${command}" только для АДМИНИСТРАТОРА!` };
    }

    // Обычный пользователь - только start
    if (command === 'start') {
        return { allowed: true, role: 'user' };
    }

    console.log(`[Access] ❌ Доступ запрещён`);
    return { allowed: false, reason: '⛔ У вас нет доступа к этому боту!' };
}

// ═══════════════════════════════════════════════════════════════════
// 👥 РАБОТА С ПОЛЬЗОВАТЕЛЯМИ STRAPI
// ═══════════════════════════════════════════════════════════════════

async function loadUsersFromStrapi(strapi) {
    try {
        console.log('[Strapi] Загрузка пользователей...');

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
                joinedAt: user.createdAt,
                confirmed: user.confirmed,
                blocked: user.blocked,
                type: 'registered'
            });
        });

        console.log(`[Strapi] ✅ Загружено ${users.length} пользователей`);
        return users.length;
    } catch (err) {
        console.error('[Strapi] ❌ ОШИБКА загрузки:', err.message);
        return 0;
    }
}

async function deleteUserFromStrapi(strapi, userId) {
    try {
        console.log(`[Strapi] Удаление пользователя ${userId}...`);
        await strapi.db.query('plugin::users-permissions.user').delete({ where: { id: userId } });
        SessionStore.allUsers.delete(String(userId));
        console.log(`[Strapi] ✅ Пользователь удалён`);
        return true;
    } catch (err) {
        console.error('[Strapi] ❌ Ошибка удаления:', err.message);
        return false;
    }
}

async function blockUserInStrapi(strapi, userId) {
    try {
        console.log(`[Strapi] Блокировка ${userId}...`);
        await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: userId },
            data: { blocked: true }
        });

        const user = SessionStore.allUsers.get(String(userId));
        if (user) user.blocked = true;

        console.log(`[Strapi] ✅ Пользователь заблокирован`);
        return true;
    } catch (err) {
        console.error('[Strapi] ❌ Ошибка блокировки:', err.message);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════
// 📋 ФОРМАТИРОВАНИЕ
// ═══════════════════════════════════════════════════════════════════

function formatUserCard(user, index) {
    const status = user.blocked ? '🚫 ЗАБЛОКИРОВАН' :
        user.confirmed ? '✅ Активен' : '⏳ Ожидает';

    return `👤 #${index}\n🆔 ${user.id}\n📛 ${user.name}\n📧 ${user.email}\n📱 ${user.phone}\n📅 ${new Date(user.joinedAt).toLocaleDateString()}\n📊 ${status}`;
}

function formatProductCard(product, index) {
    return `📦 #${index} ${product.title}\n💰 ${product.price} ${product.currency}\n👤 ${product.seller.name}\n🆔 ${product.id}`;
}

// ═══════════════════════════════════════════════════════════════════
// ⌨️ КНОПКИ
// ═══════════════════════════════════════════════════════════════════

function getProductButtons(productId) {
    return [
        [
            { text: '✅ Принять', callback_data: `approve_${productId}` },
            { text: '❌ Отклонить', callback_data: `reject_${productId}` }
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
            { text: '🗑 Удалить', callback_data: `deluser_${userId}` }
        ]
    ];
}

// ═══════════════════════════════════════════════════════════════════
// 🔄 ОБРАБОТЧИКИ КОМАНД
// ═══════════════════════════════════════════════════════════════════

const CommandHandlers = {

    async start(chatId, userId, args) {
        const access = checkAccess(userId, 'start');

        if (access.role === 'admin') {
            return sendMessage(chatId,
                `👑 <b>АДМИН ПАНЕЛЬ</b>\n\n` +
                `/users - Все пользователи (${SessionStore.allUsers.size})\n` +
                `/userinfo ID - Инфо о пользователе\n` +
                `/ban ID - Забанить\n` +
                `/warn ID - Предупредить\n` +
                `/deleteuser ID - Удалить навсегда\n` +
                `/statsall - Статистика\n` +
                `/pending - Товары (${SessionStore.pendingProducts.size})`
            );
        }

        if (access.role === 'moderator') {
            return sendMessage(chatId,
                `🛡 <b>МОДЕРАТОР</b>\n\n` +
                `/pending - Товары\n` +
                `/approve ID - Принять\n` +
                `/reject ID - Отклонить\n` +
                `/stats - Статистика`
            );
        }

        return sendMessage(chatId, `👋 Привет! Это система модерации YakMarket.`);
    },

    async pending(chatId, userId) {
        const access = checkAccess(userId, 'pending');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        if (SessionStore.pendingProducts.size === 0) {
            return sendMessage(chatId, '📭 Очередь пуста');
        }

        await sendMessage(chatId, `📋 Товаров: ${SessionStore.pendingProducts.size}`);

        let i = 1;
        for (const [id, product] of SessionStore.pendingProducts) {
            await sendMessageWithButtons(chatId, formatProductCard(product, i), getProductButtons(id));
            i++;
        }
    },

    async approve(chatId, userId, args) {
        const access = checkAccess(userId, 'approve');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        if (!args?.length) {
            return sendMessage(chatId, '⚠️ /approve ID_ТОВАРА');
        }

        const product = SessionStore.pendingProducts.get(args[0]);
        if (!product) return sendMessage(chatId, '❌ Товар не найден');

        SessionStore.pendingProducts.delete(args[0]);
        ModeratorsDB.updateStats(userId, 'accept');

        return sendMessage(chatId, `✅ Принят: ${product.title}`);
    },

    async reject(chatId, userId, args) {
        const access = checkAccess(userId, 'reject');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        if (!args?.length) {
            return sendMessage(chatId, '⚠️ /reject ID причина');
        }

        const product = SessionStore.pendingProducts.get(args[0]);
        if (!product) return sendMessage(chatId, '❌ Товар не найден');

        SessionStore.pendingProducts.delete(args[0]);
        ModeratorsDB.updateStats(userId, 'reject');

        return sendMessage(chatId, `❌ Отклонён: ${product.title}`);
    },

    // ═══════════════════════════════════════════════════════════
    // 👑 АДМИН КОМАНДЫ
    // ═══════════════════════════════════════════════════════════

    async users(chatId, userId, args, strapi) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только АДМИН!');
        }

        const count = await loadUsersFromStrapi(strapi);

        if (count === 0) {
            return sendMessage(chatId, '❌ Не удалось загрузить пользователей. Проверьте логи.');
        }

        const users = Array.from(SessionStore.allUsers.values()).slice(0, 5);

        await sendMessage(chatId, `👥 <b>ПОЛЬЗОВАТЕЛИ: ${count}</b>`);

        let i = 1;
        for (const user of users) {
            await sendMessageWithButtons(chatId, formatUserCard(user, i), getUserActionButtons(user.id));
            i++;
        }

        if (count > 5) {
            await sendMessage(chatId, `... и ещё ${count - 5} пользователей`);
        }
    },

    async userinfo(chatId, userId, args, strapi) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только АДМИН!');
        }

        if (!args?.length) {
            return sendMessage(chatId, '⚠️ /userinfo ID');
        }

        if (SessionStore.allUsers.size === 0) {
            await loadUsersFromStrapi(strapi);
        }

        const user = SessionStore.allUsers.get(args[0]);
        if (!user) return sendMessage(chatId, '❌ Пользователь не найден');

        const warns = SessionStore.warnedUsers.get(user.id) || 0;

        return sendMessageWithButtons(chatId,
            formatUserCard(user, 1) + `\n⚠️ Предупреждений: ${warns}`,
            getUserActionButtons(user.id)
        );
    },

    async ban(chatId, userId, args, strapi) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только АДМИН!');
        }

        if (!args?.length) {
            return sendMessage(chatId, '⚠️ /ban ID причина');
        }

        if (args[0] === CONFIG.ADMIN_ID) {
            return sendMessage(chatId, '⛔ Нельзя забанить админа!');
        }

        const blocked = await blockUserInStrapi(strapi, args[0]);
        if (!blocked) return sendMessage(chatId, '❌ Ошибка блокировки');

        SessionStore.bannedUsers.set(args[0], { reason: args.slice(1).join(' '), date: new Date() });
        ModeratorsDB.updateStats(userId, 'ban');

        return sendMessage(chatId, `🚫 Забанен: ${args[0]}`);
    },

    async warn(chatId, userId, args, strapi) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только АДМИН!');
        }

        if (!args?.length) {
            return sendMessage(chatId, '⚠️ /warn ID причина');
        }

        const current = SessionStore.warnedUsers.get(args[0]) || 0;
        const newCount = current + 1;
        SessionStore.warnedUsers.set(args[0], newCount);
        ModeratorsDB.updateStats(userId, 'warn');

        let msg = `⚠️ Предупреждение: ${args[0]}\nВсего: ${newCount}`;

        if (newCount >= 3) {
            msg += '\n\n🚫 АВТОБАН!';
            await this.ban(chatId, userId, [args[0], '3 предупреждения'], strapi);
        }

        return sendMessage(chatId, msg);
    },

    async deleteuser(chatId, userId, args, strapi) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только АДМИН!');
        }

        if (!args?.length) {
            return sendMessage(chatId, '⚠️ /deleteuser ID');
        }

        if (args[0] === CONFIG.ADMIN_ID) {
            return sendMessage(chatId, '⛔ Нельзя удалить админа!');
        }

        const deleted = await deleteUserFromStrapi(strapi, args[0]);
        if (!deleted) return sendMessage(chatId, '❌ Ошибка удаления');

        SessionStore.bannedUsers.delete(args[0]);
        SessionStore.warnedUsers.delete(args[0]);

        return sendMessage(chatId, `🗑 Удалён: ${args[0]}`);
    },

    async statsall(chatId, userId, strapi) {
        if (!ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId, '⛔ Только АДМИН!');
        }

        if (SessionStore.allUsers.size === 0) {
            await loadUsersFromStrapi(strapi);
        }

        const total = ModeratorsDB.getTotalStats();

        return sendMessage(chatId,
            `📊 <b>СТАТИСТИКА</b>\n\n` +
            `👥 Пользователей: ${SessionStore.allUsers.size}\n` +
            `🚫 Забанено: ${SessionStore.bannedUsers.size}\n` +
            `⚠️ С предупреждениями: ${SessionStore.warnedUsers.size}\n\n` +
            `📦 В очереди: ${SessionStore.pendingProducts.size}\n` +
            `✅ Принято: ${total.accepted}\n` +
            `❌ Отклонено: ${total.rejected}`
        );
    },

    async stats(chatId, userId) {
        const access = checkAccess(userId, 'stats');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        const mod = ModeratorsDB.getById(userId);
        return sendMessage(chatId,
            `📊 ${mod.name}\n` +
            `✅ ${mod.stats.accepted}  ❌ ${mod.stats.rejected}\n` +
            `⚠️ ${mod.stats.warnings}  🚫 ${mod.stats.banned}`
        );
    },

    async help(chatId, userId) {
        const access = checkAccess(userId, 'help');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        if (ModeratorsDB.isAdmin(userId)) {
            return sendMessage(chatId,
                `👑 <b>АДМИН:</b>\n` +
                `/users, /userinfo, /ban, /warn, /deleteuser, /statsall\n\n` +
                `🛡 <b>Модерация:</b>\n` +
                `/pending, /approve, /reject, /stats`
            );
        }

        return sendMessage(chatId,
            `🛡 <b>МОДЕРАТОР:</b>\n` +
            `/pending, /approve ID, /reject ID, /stats`
        );
    }
};

// ═══════════════════════════════════════════════════════════════════
// 🔘 CALLBACK ОБРАБОТЧИК
// ═══════════════════════════════════════════════════════════════════

async function handleCallback(callbackQuery, strapi) {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const userId = String(callbackQuery.from.id);

    await answerCallback(callbackQuery.id);

    console.log(`[Callback] ${userId}: ${data}`);

    // Проверка прав
    if (!ModeratorsDB.isModerator(userId) && !ModeratorsDB.isAdmin(userId)) {
        return sendMessage(chatId, '⛔ Нет доступа!');
    }

    // Обработка кнопок
    if (data.startsWith('approve_')) {
        return CommandHandlers.approve(chatId, userId, [data.replace('approve_', '')]);
    }

    if (data.startsWith('reject_')) {
        return CommandHandlers.reject(chatId, userId, [data.replace('reject_', '')]);
    }

    if (data.startsWith('banuser_')) {
        if (!ModeratorsDB.isAdmin(userId)) return sendMessage(chatId, '⛔ Только АДМИН!');
        return CommandHandlers.ban(chatId, userId, [data.replace('banuser_', '')], strapi);
    }

    if (data.startsWith('warnuser_')) {
        if (!ModeratorsDB.isAdmin(userId)) return sendMessage(chatId, '⛔ Только АДМИН!');
        return CommandHandlers.warn(chatId, userId, [data.replace('warnuser_', '')], strapi);
    }

    if (data.startsWith('deluser_')) {
        if (!ModeratorsDB.isAdmin(userId)) return sendMessage(chatId, '⛔ Только АДМИН!');
        return CommandHandlers.deleteuser(chatId, userId, [data.replace('deluser_', '')], strapi);
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

                    if (update.message?.text) {
                        const chatId = update.message.chat.id;
                        const userId = String(update.message.from.id);
                        const username = update.message.from.username || 'no_username';
                        const text = update.message.text.trim();
                        const parts = text.split(' ');
                        const command = parts[0].replace('/', '').split('@')[0];
                        const args = parts.slice(1);

                        // ЛОГИРОВАНИЕ
                        console.log(`[Command] ${username}(${userId}): /${command}`);

                        // Сохраняем в лог
                        SessionStore.commandLog.push({
                            time: new Date(),
                            userId,
                            username,
                            command,
                            args
                        });

                        // Проверяем существование команды
                        if (!CommandHandlers[command]) {
                            console.log(`[Command] ❌ НЕИЗВЕСТНАЯ КОМАНДА: ${command}`);
                            await sendMessage(chatId, `❌ Неизвестная команда "/${command}"\nИспользуйте /help`);
                            continue;
                        }

                        // Выполняем
                        try {
                            await CommandHandlers[command](chatId, userId, args, strapi);
                        } catch (err) {
                            console.error(`[Command] ❌ ОШИБКА:`, err.message);
                            await sendMessage(chatId, `❌ Ошибка: ${err.message}`);
                        }
                    }

                    if (update.callback_query) {
                        await handleCallback(update.callback_query, strapi);
                    }
                }
            }
        } catch (err) {
            console.error('[Polling] ❌ Ошибка:', err.message);
        }
    }

    setInterval(checkUpdates, 2000);
    console.log('🤖 Polling запущен (2 сек)');
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 ГЛАВНЫЙ МОДУЛЬ
// ═══════════════════════════════════════════════════════════════════

module.exports = {
    register() { },

    async bootstrap({ strapi }) {
        console.log('╔════════════════════════════════════════════════════╗');
        console.log('║  🤖 YAKMARKET v3.1 - ЗАПУСК                        ║');
        console.log('╚════════════════════════════════════════════════════╝');

        // Тестовый товар
        SessionStore.pendingProducts.set(TEST_PRODUCT.id, TEST_PRODUCT);
        console.log('[Init] Тестовый товар добавлен');

        // Загрузка пользователей
        await loadUsersFromStrapi(strapi);

        // Приветствие
        const admin = ModeratorsDB.getAdmin();
        if (admin) {
            try {
                await sendMessage(admin.id,
                    `👑 <b>АДМИН ПАНЕЛЬ ЗАПУЩЕНА!</b>\n\n` +
                    `👥 Пользователей: ${SessionStore.allUsers.size}\n` +
                    `📦 В очереди: ${SessionStore.pendingProducts.size}\n\n` +
                    `/users - Список пользователей\n` +
                    `/statsall - Статистика`
                );
                console.log('[Init] Приветствие админу отправлено');
            } catch (err) {
                console.error('[Init] Ошибка отправки:', err.message);
            }
        }

        // Polling
        await startPolling(strapi);

        // API
        strapi.moderation = {
            addProduct: async (product) => {
                SessionStore.pendingProducts.set(product.id, product);
                console.log(`[Moderation] Добавлен: ${product.title}`);

                const available = ModeratorsDB.getAvailable();
                for (const mod of available) {
                    await sendMessageWithButtons(mod.id, formatProductCard(product), getProductButtons(product.id));
                }
            },

            reloadUsers: () => loadUsersFromStrapi(strapi),

            getStats: () => ({
                users: SessionStore.allUsers.size,
                pending: SessionStore.pendingProducts.size,
                processed: SessionStore.processedToday
            })
        };

        console.log('✅ СИСТЕМА ГОТОВА!');
        console.log(`📊 Пользователей: ${SessionStore.allUsers.size}`);
    }
};
