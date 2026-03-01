/**
 * ═══════════════════════════════════════════════════════════════════
 * 📦 LIFECYCLES: Product Collection
 * Интеграция с YakMarket Moderation System
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

const axios = require('axios');
const ModeratorsDB = require('../../../../config/moderators');

// Конфигурация
const CONFIG = {
    BOT_TOKEN: '8662410817:AAEPg37YkiJ6XnfnpmDW_fg1kp0hsz2_Eh0',
    API_BASE: 'https://api.telegram.org/bot',
    STRAPI_URL: process.env.STRAPI_URL || 'https://yakmarket-api-production.up.railway.app'
};

const TELEGRAM_API = `${CONFIG.API_BASE}${CONFIG.BOT_TOKEN}`;

/**
 * Форматирование данных товара для модерации
 */
function formatProductForModeration(product, seller) {
    return {
        id: `PROD_${product.id}`,
        strapiId: product.id,
        title: product.title || 'Без названия',
        description: product.description || 'Нет описания',
        price: product.price || 0,
        currency: product.currency || 'TJS',
        category: product.category?.name || product.category || 'Без категории',
        location: product.location || product.city || 'Не указано',
        images: product.images?.length || 0,
        createdAt: product.createdAt || new Date().toISOString(),
        status: 'pending',
        seller: {
            id: `USER_${seller?.id || 'unknown'}`,
            strapiId: seller?.id,
            name: seller?.username || seller?.fullName || seller?.email || 'Пользователь',
            phone: seller?.phone || 'Не указан',
            telegram: seller?.telegramUsername || null,
            rating: seller?.rating || 0,
            joinedAt: seller?.createdAt || 'Неизвестно'
        }
    };
}

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
        console.error(`[Telegram] Ошибка отправки для ${chatId}:`, err.response?.data?.description || err.message);
        return null;
    }
}

/**
 * Форматирование карточки товара
 */
function formatProductCard(product) {
    return `
⚡️ <b>НОВОЕ ОБЪЯВЛЕНИЕ</b> ⚡️

📦 <b>${product.title}</b>

💰 <b>Цена:</b> ${product.price} ${product.currency}
📂 <b>Категория:</b> ${product.category}
📍 <b>Локация:</b> ${product.location}
📸 <b>Фото:</b> ${product.images} шт.

👤 <b>Продавец:</b> ${product.seller.name}
📱 <b>Телефон:</b> ${product.seller.phone}
📧 <b>Telegram:</b> ${product.seller.telegram || 'Н/Д'}
⭐ <b>Рейтинг:</b> ${product.seller.rating}/5

🔗 <a href="${CONFIG.STRAPI_URL}/admin/content-manager/collectionType/api::product.product/${product.strapiId}">ОТКРЫТЬ В АДМИНКЕ</a>

🆔 <code>${product.id}</code>
    `.trim();
}

/**
 * Inline кнопки для модерации
 */
function getModerationButtons(productId) {
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

/**
 * Уведомление продавца о статусе
 */
async function notifySeller(product, status, reason = null) {
    // В реальной системе здесь отправка уведомления продавцу
    // Для этого нужно иметь telegram_id в профиле пользователя
    console.log(`[NotifySeller] Product ${product.id} ${status}${reason ? ', reason: ' + reason : ''}`);

    // Если у продавца есть telegram ID - отправляем уведомление
    if (product.seller.telegram) {
        let message = '';

        if (status === 'approved') {
            message = `
✅ <b>Ваше объявление одобрено!</b>

📦 ${product.title}
💰 ${product.price} ${product.currency}

Теперь оно видно всем пользователям.
            `.trim();
        } else if (status === 'rejected') {
            message = `
❌ <b>Ваше объявление отклонено</b>

📦 ${product.title}
📝 Причина: ${reason || 'Нарушение правил'}

Вы можете отредактировать и отправить снова.
            `.trim();
        }

        // Здесь должен быть реальный ID продавца в Telegram
        // Пока просто логируем
        if (message) {
            console.log(`[NotifySeller] Message ready for ${product.seller.telegram}`);
        }
    }
}

module.exports = {

    /**
     * После создания товара - отправка на модерацию
     */
    async afterCreate(event) {
        const { result } = event;
        const strapiInstance = event.state?.strapi || global.strapi || strapi;

        // 1. Отправка в WebSocket (для реалтайм обновлений)
        if (strapiInstance.io) {
            strapiInstance.io.emit('product:create', result);
        }

        try {
            // 2. Получаем данные продавца
            let seller = null;
            if (result.owner) {
                if (typeof result.owner === 'object') {
                    seller = result.owner;
                } else {
                    // Загружаем из БД если только ID
                    seller = await strapiInstance.db.query('plugin::users-permissions.user').findOne({
                        where: { id: result.owner }
                    });
                }
            }

            // 3. Форматируем товар для модерации
            const productForModeration = formatProductForModeration(result, seller);

            // 4. Добавляем в систему модерации (если она запущена)
            if (strapiInstance.moderation && strapiInstance.moderation.addProduct) {
                await strapiInstance.moderation.addProduct(productForModeration);
                console.log(`✅ [Lifecycle] Товар ${result.id} отправлен в систему модерации`);
            } else {
                // Fallback: отправляем напрямую модераторам
                console.log(`⚠️ [Lifecycle] Система модерации не запущена, отправка вручную...`);

                const moderators = ModeratorsDB.getAvailable();
                const cardText = formatProductCard(productForModeration);
                const buttons = getModerationButtons(productForModeration.id);

                for (const mod of moderators) {
                    await sendTelegramMessage(mod.id, cardText, buttons);
                    await new Promise(r => setTimeout(r, 200));
                }
            }

        } catch (err) {
            console.error('❌ [Lifecycle] Ошибка отправки на модерацию:', err.message);
        }
    },

    /**
     * После обновления товара - уведомление о статусе
     */
    async afterUpdate(event) {
        const { result, params } = event;
        const strapiInstance = event.state?.strapi || global.strapi || strapi;

        // Отправка в WebSocket
        if (strapiInstance.io) {
            strapiInstance.io.emit('product:update', result);
        }

        // Проверяем изменение статуса
        const oldStatus = params.data?.status || result.status;
        const newStatus = result.status;

        if (oldStatus !== newStatus) {
            console.log(`[Lifecycle] Статус товара ${result.id} изменён: ${oldStatus} → ${newStatus}`);

            // Если статус изменился на 'active' - уведомляем продавца
            if (newStatus === 'active') {
                try {
                    let seller = null;
                    if (result.owner) {
                        seller = typeof result.owner === 'object' ? result.owner :
                            await strapiInstance.db.query('plugin::users-permissions.user').findOne({
                                where: { id: result.owner }
                            });
                    }

                    const product = formatProductForModeration(result, seller);
                    await notifySeller(product, 'approved');

                    console.log(`✅ [Lifecycle] Продавец уведомлён об одобрении товара ${result.id}`);
                } catch (err) {
                    console.error('❌ [Lifecycle] Ошибка уведомления продавца:', err.message);
                }
            }

            // Если статус 'rejected' - уведомляем с причиной
            if (newStatus === 'rejected') {
                try {
                    let seller = null;
                    if (result.owner) {
                        seller = typeof result.owner === 'object' ? result.owner :
                            await strapiInstance.db.query('plugin::users-permissions.user').findOne({
                                where: { id: result.owner }
                            });
                    }

                    const product = formatProductForModeration(result, seller);
                    const reason = result.rejectReason || 'Не соответствует правилам';
                    await notifySeller(product, 'rejected', reason);

                    console.log(`✅ [Lifecycle] Продавец уведомлён об отклонении товара ${result.id}`);
                } catch (err) {
                    console.error('❌ [Lifecycle] Ошибка уведомления продавца:', err.message);
                }
            }
        }
    },

    /**
     * Перед удалением - можно добавить логику
     */
    async beforeDelete(event) {
        const { params } = event;
        console.log(`[Lifecycle] Удаление товара: ${params.where?.id}`);
    },

    /**
     * После удаления - очистка
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
