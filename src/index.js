/**
 * ═══════════════════════════════════════════════════════════════════
 * 🤖 YAKMARKET MODERATION SYSTEM v3.2 - SECURITY EDITION
 * Максимальная защита от всех видов атак
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

const axios = require('axios');
const crypto = require('crypto');
const ModeratorsDB = require('../config/moderators');

// ═══════════════════════════════════════════════════════════════════
// 🔐 КОНФИГУРАЦИЯ И БЕЗОПАСНОСТЬ
// ═══════════════════════════════════════════════════════════════════
const CONFIG = {
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '8662410817:AAEPg37YkiJ6XnfnpmDW_fg1kp0hsz2_Eh0',
    ADMIN_ID: process.env.ADMIN_IDS?.split(',')[0] || '8012802187',
    STRAPI_URL: process.env.STRAPI_URL || 'https://yakmarket-api-production.up.railway.app',
    API_BASE: 'https://api.telegram.org/bot',

    // Ограничения безопасности
    MAX_MESSAGE_LENGTH: 4000,
    RATE_LIMIT_WINDOW: 60000, // 1 минута
    RATE_LIMIT_MAX: 30, // макс команд в минуту
    MAX_ARGS_LENGTH: 100,
    ID_SANITIZE_REGEX: /^[a-zA-Z0-9_-]+$/,
    CALLBACK_DATA_MAX_LENGTH: 64
};

const TELEGRAM_API = `${CONFIG.API_BASE}${CONFIG.BOT_TOKEN}`;

// ═══════════════════════════════════════════════════════════════════
// 🛡️ ЗАЩИТНЫЕ МЕХАНИЗМЫ
// ═══════════════════════════════════════════════════════════════════

const Security = {
    // Хранилище rate limiting
    rateLimitMap: new Map(),

    // Проверка rate limit
    checkRateLimit(userId) {
        const now = Date.now();
        const userData = this.rateLimitMap.get(userId) || { count: 0, resetTime: now + CONFIG.RATE_LIMIT_WINDOW };

        if (now > userData.resetTime) {
            userData.count = 0;
            userData.resetTime = now + CONFIG.RATE_LIMIT_WINDOW;
        }

        userData.count++;
        this.rateLimitMap.set(userId, userData);

        if (userData.count > CONFIG.RATE_LIMIT_MAX) {
            return { allowed: false, reason: '⛔ Слишком много запросов! Подождите минуту.' };
        }

        return { allowed: true };
    },

    // Санитизация ID
    sanitizeId(id) {
        if (!id || typeof id !== 'string') return null;
        const sanitized = id.trim().substring(0, 50);
        if (!CONFIG.ID_SANITIZE_REGEX.test(sanitized)) return null;
        return sanitized;
    },

    // Санитизация текста
    sanitizeText(text, maxLength = CONFIG.MAX_MESSAGE_LENGTH) {
        if (!text || typeof text !== 'string') return '';
        return text.trim().substring(0, maxLength).replace(/[<>]/g, '');
    },

    // Проверка callback data
    validateCallbackData(data) {
        if (!data || typeof data !== 'string') return false;
        if (data.length > CONFIG.CALLBACK_DATA_MAX_LENGTH) return false;
        if (!/^[a-zA-Z0-9_-]+$/.test(data)) return false;
        return true;
    },

    // Проверка аргументов
    validateArgs(args) {
        if (!Array.isArray(args)) return [];
        return args.map(arg => this.sanitizeText(arg, CONFIG.MAX_ARGS_LENGTH)).filter(Boolean);
    },

    // Хеширование для логов (защита персональных данных)
    hashUserId(userId) {
        return crypto.createHash('sha256').update(String(userId)).digest('hex').substring(0, 16);
    }
};

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
    commandLog: [],
    blockedCommands: new Set() // Заблокированные из-за ошибок команды
};

// ═══════════════════════════════════════════════════════════════════
// 📨 БЕЗОПАСНАЯ ОТПРАВКА В TELEGRAM
// ═══════════════════════════════════════════════════════════════════

async function sendMessage(chatId, text, options = {}) {
    try {
        // Валидация
        if (!chatId || !text) {
            console.error('[Telegram] ❌ Невалидные параметры');
            return null;
        }

        const safeText = Security.sanitizeText(text);
        if (!safeText) {
            console.error('[Telegram] ❌ Пустое сообщение');
            return null;
        }

        console.log(`[Telegram] ➡️ ${Security.hashUserId(chatId)}: ${safeText.substring(0, 50)}...`);

        const response = await axios.post(`${TELEGRAM_API}/sendMessage`, {
            chat_id: String(chatId),
            text: safeText,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            ...options
        }, {
            timeout: 10000, // Таймаут 10 сек
            headers: { 'Content-Type': 'application/json' }
        });

        console.log(`[Telegram] ✅ Успешно`);
        return response.data;
    } catch (err) {
        console.error(`[Telegram] ❌ Ошибка:`, err.response?.data?.description || err.message);
        return null;
    }
}

async function sendMessageWithButtons(chatId, text, buttons) {
    // Валидация кнопок
    if (!Array.isArray(buttons)) {
        console.error('[Buttons] ❌ Невалидные кнопки');
        return sendMessage(chatId, text);
    }

    // Проверка callback_data
    const safeButtons = buttons.map(row =>
        row.map(btn => ({
            text: Security.sanitizeText(btn.text, 100),
            callback_data: Security.validateCallbackData(btn.callback_data)
                ? btn.callback_data
                : 'invalid'
        }))
    );

    return sendMessage(chatId, text, { reply_markup: { inline_keyboard: safeButtons } });
}

async function answerCallback(callbackId, text = null) {
    try {
        if (!callbackId || !Security.validateCallbackData(callbackId)) {
            console.error('[Callback] ❌ Невалидный callback_id');
            return;
        }

        const payload = { callback_query_id: callbackId };
        if (text) payload.text = Security.sanitizeText(text, 200);

        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, payload, { timeout: 5000 });
    } catch (err) {
        console.error('[Callback] ❌ Ошибка:', err.message);
    }
}

// ═══════════════════════════════════════════════════════════════════
// 🛡️ КОНТРОЛЬ ДОСТУПА
// ═══════════════════════════════════════════════════════════════════

function checkAccess(userId, command) {
    console.log(`[Access] Проверка: user=${Security.hashUserId(userId)}, cmd=${command}`);

    // Rate limiting
    const rateCheck = Security.checkRateLimit(userId);
    if (!rateCheck.allowed) {
        console.log(`[Access] ❌ Rate limit exceeded`);
        return rateCheck;
    }

    // Проверка команды
    const validCommands = ['start', 'pending', 'approve', 'reject', 'ban', 'warn', 'userinfo',
        'deleteuser', 'users', 'stats', 'statsall', 'help', 'user'];
    if (!validCommands.includes(command)) {
        console.log(`[Access] ❌ Недопустимая команда: ${command}`);
        return { allowed: false, reason: `❌ Команда "${command}" не существует` };
    }

    // Админ - всё
    if (ModeratorsDB.isAdmin(userId)) {
        console.log(`[Access] ✅ АДМИН`);
        return { allowed: true, role: 'admin' };
    }

    // Модератор - базовые
    if (ModeratorsDB.isModerator(userId)) {
        const modCommands = ['start', 'pending', 'approve', 'reject', 'user', 'stats', 'help'];
        if (modCommands.includes(command)) {
            console.log(`[Access] ✅ МОДЕРАТОР`);
            return { allowed: true, role: 'moderator' };
        }
        console.log(`[Access] ❌ Команда ${command} запрещена модератору`);
        return { allowed: false, reason: `⛔ "/${command}" только для АДМИНА` };
    }

    // Обычный - только start
    if (command === 'start') {
        return { allowed: true, role: 'user' };
    }

    console.log(`[Access] ❌ Доступ запрещён`);
    return { allowed: false, reason: '⛔ У вас нет доступа' };
}

// ═══════════════════════════════════════════════════════════════════
// 👥 БЕЗОПАСНАЯ РАБОТА С STRAPI
// ═══════════════════════════════════════════════════════════════════

async function loadUsersFromStrapi(strapi) {
    try {
        console.log('[Strapi] Загрузка пользователей...');

        // Используем ORM Strapi (защита от SQL-инъекций)
        const users = await strapi.db.query('plugin::users-permissions.user').findMany({
            select: ['id', 'username', 'email', 'phone', 'createdAt', 'confirmed', 'blocked'],
            limit: 1000 // Ограничение
        });

        SessionStore.allUsers.clear();

        users.forEach(user => {
            const safeId = Security.sanitizeId(String(user.id));
            if (safeId) {
                SessionStore.allUsers.set(safeId, {
                    id: safeId,
                    name: Security.sanitizeText(user.username) || 'Без имени',
                    email: Security.sanitizeText(user.email) || 'Нет email',
                    phone: Security.sanitizeText(user.phone) || 'Нет телефона',
                    joinedAt: user.createdAt,
                    confirmed: user.confirmed,
                    blocked: user.blocked
                });
            }
        });

        console.log(`[Strapi] ✅ Загружено ${SessionStore.allUsers.size} пользователей`);
        return SessionStore.allUsers.size;
    } catch (err) {
        console.error('[Strapi] ❌ Ошибка:', err.message);
        return 0;
    }
}

async function deleteUserFromStrapi(strapi, userId) {
    try {
        const safeId = Security.sanitizeId(userId);
        if (!safeId) {
            console.error('[Delete] ❌ Невалидный ID');
            return false;
        }

        // ЗАЩИТА: нельзя удалить админа
        if (safeId === CONFIG.ADMIN_ID) {
            console.error('[Delete] ❌ Попытка удалить админа!');
            return false;
        }

        console.log(`[Delete] Удаление ${safeId}...`);

        await strapi.db.query('plugin::users-permissions.user').delete({
            where: { id: safeId }
        });

        SessionStore.allUsers.delete(safeId);
        console.log(`[Delete] ✅ Удалён`);
        return true;
    } catch (err) {
        console.error('[Delete] ❌ Ошибка:', err.message);
        return false;
    }
}

async function blockUserInStrapi(strapi, userId) {
    try {
        const safeId = Security.sanitizeId(userId);
        if (!safeId) {
            console.error('[Block] ❌ Невалидный ID');
            return false;
        }

        // ЗАЩИТА: нельзя забанить админа
        if (safeId === CONFIG.ADMIN_ID) {
            console.error('[Block] ❌ Попытка забанить админа!');
            return false;
        }

        console.log(`[Block] Блокировка ${safeId}...`);

        await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: safeId },
            data: { blocked: true }
        });

        const user = SessionStore.allUsers.get(safeId);
        if (user) user.blocked = true;

        console.log(`[Block] ✅ Заблокирован`);
        return true;
    } catch (err) {
        console.error('[Block] ❌ Ошибка:', err.message);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════
// 📋 ФОРМАТИРОВАНИЕ
// ═══════════════════════════════════════════════════════════════════

function formatUserCard(user, index) {
    return `👤 #${index}\n🆔 ${user.id}\n📛 ${user.name}\n📧 ${user.email}\n📱 ${user.phone}\n📊 ${user.blocked ? '🚫' : '✅'}`;
}

function formatProductCard(product, index) {
    return `📦 #${index} ${product.title?.substring(0, 50)}\n💰 ${product.price} ${product.currency}\n👤 ${product.seller?.name}\n🆔 ${product.id}`;
}

// ═══════════════════════════════════════════════════════════════════
// ⌨️ БЕЗОПАСНЫЕ КНОПКИ
// ═══════════════════════════════════════════════════════════════════

function getProductButtons(productId) {
    const safeId = Security.sanitizeId(productId);
    if (!safeId) return [];

    return [[
        { text: '✅ Принять', callback_data: `approve_${safeId}` },
        { text: '❌ Отклонить', callback_data: `reject_${safeId}` }
    ]];
}

function getUserActionButtons(userId) {
    const safeId = Security.sanitizeId(userId);
    if (!safeId) return [];

    return [
        [
            { text: '🚫 Забанить', callback_data: `ban_${safeId}` },
            { text: '⚠️ Предупредить', callback_data: `warn_${safeId}` }
        ],
        [{ text: '🗑 Удалить', callback_data: `del_${safeId}` }]
    ];
}

// ═══════════════════════════════════════════════════════════════════
// 🔄 КОМАНДЫ
// ═══════════════════════════════════════════════════════════════════

const CommandHandlers = {

    async start(chatId, userId) {
        const access = checkAccess(userId, 'start');

        if (access.role === 'admin') {
            return sendMessage(chatId,
                `👑 <b>АДМИН ПАНЕЛЬ</b>\n\n` +
                `/users - Пользователи (${SessionStore.allUsers.size})\n` +
                `/ban ID - Забанить\n` +
                `/warn ID - Предупредить\n` +
                `/deleteuser ID - Удалить\n` +
                `/statsall - Статистика\n` +
                `/pending - Товары (${SessionStore.pendingProducts.size})`
            );
        }

        if (access.role === 'moderator') {
            return sendMessage(chatId,
                `🛡 <b>МОДЕРАТОР</b>\n\n` +
                `/pending - Товары\n/approve ID - Принять\n/reject ID - Отклонить`
            );
        }

        return sendMessage(chatId, `👋 Привет! Это YakMarket.`);
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

        const safeId = Security.sanitizeId(args?.[0]);
        if (!safeId) return sendMessage(chatId, '⚠️ /approve ID');

        const product = SessionStore.pendingProducts.get(safeId);
        if (!product) return sendMessage(chatId, '❌ Товар не найден');

        SessionStore.pendingProducts.delete(safeId);
        ModeratorsDB.updateStats(userId, 'accept');

        return sendMessage(chatId, `✅ Принят: ${product.title?.substring(0, 50)}`);
    },

    async reject(chatId, userId, args) {
        const access = checkAccess(userId, 'reject');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        const safeId = Security.sanitizeId(args?.[0]);
        if (!safeId) return sendMessage(chatId, '⚠️ /reject ID');

        const product = SessionStore.pendingProducts.get(safeId);
        if (!product) return sendMessage(chatId, '❌ Товар не найден');

        SessionStore.pendingProducts.delete(safeId);
        ModeratorsDB.updateStats(userId, 'reject');

        return sendMessage(chatId, `❌ Отклонён`);
    },

    // 👑 АДМИН КОМАНДЫ

    async users(chatId, userId, args, strapi) {
        const access = checkAccess(userId, 'users');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        const count = await loadUsersFromStrapi(strapi);

        if (count === 0) {
            return sendMessage(chatId, '❌ Не удалось загрузить');
        }

        const users = Array.from(SessionStore.allUsers.values()).slice(0, 5);

        await sendMessage(chatId, `👥 <b>ПОЛЬЗОВАТЕЛИ: ${count}</b>`);

        let i = 1;
        for (const user of users) {
            await sendMessageWithButtons(chatId, formatUserCard(user, i), getUserActionButtons(user.id));
            i++;
        }
    },

    async ban(chatId, userId, args, strapi) {
        const access = checkAccess(userId, 'ban');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        const safeId = Security.sanitizeId(args?.[0]);
        if (!safeId) return sendMessage(chatId, '⚠️ /ban ID');

        const blocked = await blockUserInStrapi(strapi, safeId);
        if (!blocked) return sendMessage(chatId, '❌ Ошибка блокировки');

        SessionStore.bannedUsers.set(safeId, { date: new Date() });
        ModeratorsDB.updateStats(userId, 'ban');

        return sendMessage(chatId, `🚫 Забанен: ${safeId}`);
    },

    async warn(chatId, userId, args, strapi) {
        const access = checkAccess(userId, 'warn');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        const safeId = Security.sanitizeId(args?.[0]);
        if (!safeId) return sendMessage(chatId, '⚠️ /warn ID');

        const current = SessionStore.warnedUsers.get(safeId) || 0;
        const newCount = current + 1;
        SessionStore.warnedUsers.set(safeId, newCount);
        ModeratorsDB.updateStats(userId, 'warn');

        let msg = `⚠️ Предупреждение: ${safeId}\nВсего: ${newCount}`;

        if (newCount >= 3) {
            msg += '\n🚫 АВТОБАН!';
            await this.ban(chatId, userId, [safeId], strapi);
        }

        return sendMessage(chatId, msg);
    },

    async deleteuser(chatId, userId, args, strapi) {
        const access = checkAccess(userId, 'deleteuser');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        const safeId = Security.sanitizeId(args?.[0]);
        if (!safeId) return sendMessage(chatId, '⚠️ /deleteuser ID');

        const deleted = await deleteUserFromStrapi(strapi, safeId);
        if (!deleted) return sendMessage(chatId, '❌ Ошибка удаления');

        SessionStore.bannedUsers.delete(safeId);
        SessionStore.warnedUsers.delete(safeId);

        return sendMessage(chatId, `🗑 Удалён: ${safeId}`);
    },

    async statsall(chatId, userId, strapi) {
        const access = checkAccess(userId, 'statsall');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        if (SessionStore.allUsers.size === 0) {
            await loadUsersFromStrapi(strapi);
        }

        const total = ModeratorsDB.getTotalStats();

        return sendMessage(chatId,
            `📊 СТАТИСТИКА\n\n` +
            `👥 Пользователей: ${SessionStore.allUsers.size}\n` +
            `🚫 Забанено: ${SessionStore.bannedUsers.size}\n` +
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
            `📊 ${mod.name}\n✅ ${mod.stats.accepted}  ❌ ${mod.stats.rejected}`
        );
    },

    async help(chatId, userId) {
        const access = checkAccess(userId, 'help');
        if (!access.allowed) return sendMessage(chatId, access.reason);

        return sendMessage(chatId,
            ModeratorsDB.isAdmin(userId)
                ? `👑 /users /ban /warn /deleteuser /statsall /pending`
                : `🛡 /pending /approve ID /reject ID /stats`
        );
    }
};

// ═══════════════════════════════════════════════════════════════════
// 🔘 БЕЗОПАСНЫЙ CALLBACK
// ═══════════════════════════════════════════════════════════════════

async function handleCallback(callbackQuery, strapi) {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const userId = String(callbackQuery.from.id);

    await answerCallback(callbackQuery.id);

    console.log(`[Callback] ${Security.hashUserId(userId)}: ${data}`);

    // Валидация callback data
    if (!Security.validateCallbackData(data)) {
        console.error('[Callback] ❌ Невалидные данные');
        return sendMessage(chatId, '❌ Ошибка данных');
    }

    // Проверка прав
    if (!ModeratorsDB.isModerator(userId) && !ModeratorsDB.isAdmin(userId)) {
        return sendMessage(chatId, '⛔ Нет доступа!');
    }

    // Обработка
    if (data.startsWith('approve_')) {
        return CommandHandlers.approve(chatId, userId, [data.replace('approve_', '')]);
    }

    if (data.startsWith('reject_')) {
        return CommandHandlers.reject(chatId, userId, [data.replace('reject_', '')]);
    }

    if (data.startsWith('ban_')) {
        if (!ModeratorsDB.isAdmin(userId)) return sendMessage(chatId, '⛔ Только АДМИН!');
        return CommandHandlers.ban(chatId, userId, [data.replace('ban_', '')], strapi);
    }

    if (data.startsWith('warn_')) {
        if (!ModeratorsDB.isAdmin(userId)) return sendMessage(chatId, '⛔ Только АДМИН!');
        return CommandHandlers.warn(chatId, userId, [data.replace('warn_', '')], strapi);
    }

    if (data.startsWith('del_')) {
        if (!ModeratorsDB.isAdmin(userId)) return sendMessage(chatId, '⛔ Только АДМИН!');
        return CommandHandlers.deleteuser(chatId, userId, [data.replace('del_', '')], strapi);
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
                params: { offset: lastUpdateId + 1, limit: 10 },
                timeout: 30000
            });

            if (!response.data.ok) {
                console.error('[Polling] ❌ Telegram API error');
                return;
            }

            if (response.data.result.length > 0) {
                for (const update of response.data.result) {
                    lastUpdateId = update.update_id;

                    if (update.message?.text) {
                        const chatId = update.message.chat.id;
                        const userId = String(update.message.from.id);
                        const username = Security.sanitizeText(update.message.from.username);
                        const text = Security.sanitizeText(update.message.text);
                        const parts = text.split(' ');
                        const command = Security.sanitizeId(parts[0].replace('/', '').split('@')[0]);
                        const args = Security.validateArgs(parts.slice(1));

                        console.log(`[Command] ${username}(${Security.hashUserId(userId)}): /${command}`);

                        if (!command) {
                            await sendMessage(chatId, '❌ Невалидная команда');
                            continue;
                        }

                        if (!CommandHandlers[command]) {
                            await sendMessage(chatId, `❌ Команда "/${command}" не найдена\nИспользуйте /help`);
                            continue;
                        }

                        try {
                            await CommandHandlers[command](chatId, userId, args, strapi);
                        } catch (err) {
                            console.error(`[Command] ❌ Ошибка:`, err.message);
                            await sendMessage(chatId, `❌ Ошибка выполнения`);
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
    console.log('🤖 Polling запущен');
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 ИНИЦИАЛИЗАЦИЯ
// ═══════════════════════════════════════════════════════════════════

module.exports = {
    register() { },

    async bootstrap({ strapi }) {
        console.log('╔══════════════════════════════════════════════╗');
        console.log('║  🤖 YAKMARKET v3.2 SECURITY - ЗАПУСК        ║');
        console.log('╚══════════════════════════════════════════════╝');

        SessionStore.pendingProducts.set('TEST_001', {
            id: 'TEST_001',
            title: '🧪 iPhone 15 Pro',
            price: 15000,
            currency: 'TJS',
            seller: { name: 'Тест', phone: '+992...' }
        });

        await loadUsersFromStrapi(strapi);

        // Уведомление админу
        const admin = ModeratorsDB.getAdmin();
        if (admin) {
            await sendMessage(admin.id,
                `👑 <b>АДМИН ПАНЕЛЬ ЗАПУЩЕНА (v3.2)</b>\n\n` +
                `🛡 Безопасность: АКТИВНА\n` +
                `👥 Пользователей: ${SessionStore.allUsers.size}\n` +
                `📦 В очереди: ${SessionStore.pendingProducts.size}\n\n` +
                `/users - Список`
            );
        }

        await startPolling(strapi);

        strapi.moderation = {
            addProduct: async (product) => {
                const safeProduct = {
                    id: Security.sanitizeId(String(product.id)) || `PROD_${Date.now()}`,
                    title: Security.sanitizeText(product.title),
                    price: parseFloat(product.price) || 0,
                    currency: Security.sanitizeText(product.currency) || 'TJS',
                    seller: {
                        name: Security.sanitizeText(product.seller?.name) || 'Неизвестно',
                        phone: Security.sanitizeText(product.seller?.phone) || 'Н/Д'
                    }
                };

                SessionStore.pendingProducts.set(safeProduct.id, safeProduct);

                const available = ModeratorsDB.getAvailable();
                for (const mod of available) {
                    await sendMessageWithButtons(mod.id, formatProductCard(safeProduct), getProductButtons(safeProduct.id));
                }
            },

            getStats: () => ({
                users: SessionStore.allUsers.size,
                pending: SessionStore.pendingProducts.size
            })
        };

        console.log('✅ СИСТЕМА ГОТОВА (Security Edition)');
    }
};
