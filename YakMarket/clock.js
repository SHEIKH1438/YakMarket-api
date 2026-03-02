// YakMarket Clock - Модуль для отображения реального времени

// Форматирование относительного времени (для чатов)
function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);

    if (diffSec < 60) {
        return 'только что';
    } else if (diffMin < 60) {
        return diffMin + ' мин. назад';
    } else if (diffHour < 24) {
        return diffHour + ' ч. назад';
    } else if (diffDay < 7) {
        return diffDay + ' дн. назад';
    } else if (diffWeek < 4) {
        return diffWeek + ' нед. назад';
    } else {
        // Для старых сообщений - показать дату
        const d = new Date(date);
        return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
}

// Форматирование времени сообщения (умное - сегодня/вчера/дата)
function formatMessageTime(date) {
    const now = new Date();
    const msgDate = new Date(date);
    const diffMs = now - msgDate;
    const diffMins = Math.floor(diffMs / 1000 / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Сегодня - показываем время
    if (diffDays === 0) {
        const hours = msgDate.getHours().toString().padStart(2, '0');
        const minutes = msgDate.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    // Вчера
    else if (diffDays === 1) {
        return 'Вчера';
    }
    // Менее недели - показываем день недели
    else if (diffDays < 7) {
        const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        return days[msgDate.getDay()];
    }
    // Старше - показываем дату
    else {
        return msgDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
}

// Форматирование времени
function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// Форматирование даты
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ru-RU', options);
}

// Форматирование даты и времени
function formatDateTime(date) {
    return `${formatDate(date)} ${formatTime(date)}`;
}

// Обновление времени
function updateClock() {
    const now = new Date();
    const timeString = formatTime(now);
    const dateString = formatDate(now);
    const dateTimeString = formatDateTime(now);

    // Обновляем элементы с классом .clock-time
    document.querySelectorAll('.clock-time').forEach(el => {
        el.textContent = timeString;
    });

    // Обновляем элементы с классом .clock-date
    document.querySelectorAll('.clock-date').forEach(el => {
        el.textContent = dateString;
    });

    // Обновляем элементы с классом .clock-datetime
    document.querySelectorAll('.clock-datetime').forEach(el => {
        el.textContent = dateTimeString;
    });
}

// Инициализация часов
function initClock() {
    updateClock();
    setInterval(updateClock, 1000);

    // Обновляем относительное время каждую минуту
    setInterval(updateRelativeTimes, 60000);
    updateRelativeTimes();
}

// Обновление всех относительных времен
function updateRelativeTimes() {
    document.querySelectorAll('[data-relative-time]').forEach(el => {
        const timestamp = el.dataset.relativeTime;
        if (timestamp) {
            el.textContent = formatRelativeTime(timestamp);
        }
    });

    document.querySelectorAll('[data-message-time]').forEach(el => {
        const timestamp = el.dataset.messageTime;
        if (timestamp) {
            el.textContent = formatMessageTime(timestamp);
        }
    });
}

// Экспорт
window.YakClock = {
    formatTime,
    formatDate,
    formatDateTime,
    formatRelativeTime,
    formatMessageTime,
    init: initClock,
    updateRelativeTimes
};

// Автоинициализация
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClock);
} else {
    initClock();
}