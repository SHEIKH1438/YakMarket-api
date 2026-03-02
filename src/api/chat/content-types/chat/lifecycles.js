/**
 * ═══════════════════════════════════════════════════════════════════
 * 📦 LIFECYCLES: Product Collection
 * Мгновенные уведомления в Telegram при создании объявления
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

const axios = require('axios');

// Конфигурация Telegram
const CONFIG = {
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '8662410817:AAEPg37YkiJ6XnfnpmDW_fg1kp0hsz2_Eh0',
    API_BASE: 'https://api.telegram.org/bot',
    STRAPI_URL: process.env.STRAPI_URL || 'https://yakmarket-api-production.up.railway.app'
};

const TELEGRAM_API = `${CONFIG.API_BASE}${CONFIG.BOT_TOKEN}`;

// Модераторы для уведомлений (из ENV или дефолт)
const modsEnv = process.env.ADMIN_IDS || '8012802187';
const MODERATORS = modsEnv.split(',').map(id => ({ id: id.trim(), name: 'Admin' }));

/**
 * Отправка сообщения в Telegram
 */
async function sendTelegramMessage(chatId, text, buttons = null) {
    try {
        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        };

        if (buttons) {
            payload.reply_markup = { inline_keyboard: buttons };
        }

        const response = await axios.post(`${TELEGRAM_API}/sendMessage`, payload);
        return response.data;
    } catch (err) {
        console.error(`[Telegram] Ошибка для ${chatId}:`, err.response?.data?.description || err.message);
        return null;
    }
}

/**
 * Форматирование карточки товара
 */
function formatProductNotification(product, seller) {
    const adminUrl = `${CONFIG.STRAPI_URL}/admin/content-manager/collectionType/api::product.product/${product.id}`;

    return {
        text: `⚡️ <b>НОВОЕ ОБЪЯВЛЕНИЕ!</b> ⚡️\n\n` +
            `📦 <b>${product.title || 'Без названия'}</b>\n\n` +
            `💰 <b>Цена:</b> ${product.price || 0} ${product.currency || 'TJS'}\n` +
            `📂 <b>Категория:</b> ${product.category?.name || product.category || 'Без категории'}\n` +
            `📍 <b>Локация:</b> ${product.location || product.city || 'Не указано'}\n\n` +
            `👤 <b>Продавец:</b> ${seller?.username || seller?.email || 'Неизвестно'}\n` +
            `📱 <b>Телефон:</b> ${seller?.phone || 'Не указан'}\n` +
            `📧 <b>Email:</b> ${seller?.email || 'Н/Д'}\n\n` +
            `🆔 <code>PROD_${product.id}</code>\n\n` +
            `<a href="${adminUrl}">🔗 Открыть в админке</a>`,

        buttons: [
            [
                { text: '✅ Принять', callback_data: `product_approve_${product.id}` },
                { text: '❌ Отклонить', callback_data: `product_reject_${product.id}` }
            ],
            [
                { text: '👤 Инфо о продавце', callback_data: `user_PROD_${product.id}` },
                { text: '🚫 Забанить', callback_data: `ban_PROD_${product.id}` }
            ]
        ]
    };
}

/**
 * Уведомление о смене статуса
 */
async function notifyStatusChange(product, seller, status, reason = null) {
    console.log(`[Notify] Статус товара ${product.id} изменён на ${status}`);

    // Здесь можно добавить отправку уведомления продавцу
    // если у него есть telegram_id в профиле
}

module.exports = {

    /**
     * ПЕРЕД СОЗДАНИЕМ - установка статуса pending
     */
    async beforeCreate(event) {
        const { data } = event.params;

        // Все новые товары требуют модерации
        data.status = 'pending';
        data.publishedAt = null; // Не публикуем сразу

        console.log(`[Lifecycle] Новый товар отправляется на модерацию`);
    },

    /**
     * ПОСЛЕ СОЗДАНИЯ - мгновенное уведомление в Telegram
     */
    async afterCreate(event) {
        const { result } = event;
        const strapiInstance = event.state?.strapi || global.strapi || strapi;

        console.log(`✅ [Lifecycle] Товар создан: ${result.id} - ${result.title}`);

        // 1. WebSocket уведомление
        if (strapiInstance.io) {
            strapiInstance.io.emit('product:create', {
                id: result.id,
                title: result.title,
                status: 'pending'
            });
        }

        // 2. МГНОВЕННАЯ ОТПРАВКА В TELEGRAM
        try {
            // Получаем полные данные товара с relationships
            let product = result;
            try {
                const productData = await strapiInstance.entityService.findOne('api::product.product', result.id, {
                    populate: ['owner', 'category', 'images']
                });
                if (productData) {
                    product = productData;
                }
            } catch (e) {
                console.log('[Lifecycle] Используем базовые данные result');
            }

            // Получаем данные продавца
            let seller = null;
            if (product.owner) {
                if (typeof product.owner === 'object') {
                    seller = product.owner;
                } else {
                    seller = await strapiInstance.db.query('plugin::users-permissions.user').findOne({
                        where: { id: product.owner }
                    });
                }
            }

            // Формируем уведомление
            const notification = formatProductNotification(product, seller);

            // Отправляем всем модераторам ПАРАЛЛЕЛЬНО (мгновенно)
            const sendPromises = MODERATORS.map(async (mod) => {
                try {
                    await sendTelegramMessage(mod.id, notification.text, notification.buttons);
                    console.log(`✅ [Telegram] Уведомление отправлено: ${mod.name}`);
                } catch (err) {
                    console.error(`❌ [Telegram] Ошибка ${mod.name}:`, err.message);
                }
            });

            // Ждём все отправки
            await Promise.all(sendPromises);
            console.log(`✅ [Lifecycle] Уведомления отправлены в Telegram`);

            // 3. Добавляем в систему модерации (если она запущена)
            if (strapiInstance.moderation?.addProduct) {
                const productForModeration = {
                    id: `PROD_${result.id}`,
                    strapiId: result.id,
                    title: result.title,
                    description: result.description,
                    price: result.price,
                    currency: result.currency || 'TJS',
                    category: result.category?.name || result.category,
                    location: result.location || result.city,
                    images: result.images?.length || 0,
                    createdAt: result.createdAt,
                    status: 'pending',
                    seller: {
                        id: `USER_${seller?.id}`,
                        name: seller?.username || seller?.email || 'Пользователь',
                        phone: seller?.phone || 'Не указан',
                        email: seller?.email
                    }
                };

                await strapiInstance.moderation.addProduct(productForModeration);
            }

        } catch (err) {
            console.error('❌ [Lifecycle] Ошибка отправки:', err.message);
        }
    },

    /**
     * ПОСЛЕ ОБНОВЛЕНИЯ - уведомление о смене статуса
     */
    async afterUpdate(event) {
        const { result, params } = event;
        const strapiInstance = event.state?.strapi || global.strapi || strapi;

        // WebSocket
        if (strapiInstance.io) {
            strapiInstance.io.emit('product:update', result);
        }

        // Проверяем изменение статуса
        const previousStatus = params.data?.status;
        const newStatus = result.status;

        if (previousStatus !== newStatus) {
            console.log(`[Lifecycle] Статус: ${previousStatus} → ${newStatus}`);

            if (newStatus === 'active') {
                // Товар одобрен
                await notifyStatusChange(result, null, 'approved');
            } else if (newStatus === 'rejected') {
                // Товар отклонён
                await notifyStatusChange(result, null, 'rejected', result.rejectReason);
            }
        }
    },

    /**
     * ПОСЛЕ УДАЛЕНИЯ
     */
    async afterDelete(event) {
        const { result } = event;
        const strapiInstance = event.state?.strapi || global.strapi || strapi;

        if (strapiInstance.io) {
            strapiInstance.io.emit('product:delete', result);
        }

        console.log(`[Lifecycle] Товар удалён: ${result?.id}`);
    }
};
