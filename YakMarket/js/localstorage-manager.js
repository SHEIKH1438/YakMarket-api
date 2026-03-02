/**
 * YakMarket LocalStorage Manager
 * Управление локальным хранением данных с синхронизацией
 */

class YakLocalStorage {
    constructor() {
        this.prefix = 'yakmarket_';
        this.version = '1.0.0';
        this.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 дней
        this.compressionEnabled = true;
        this.encryptionEnabled = false;
        this.init();
    }

    init() {
        this.cleanup();
        this.setupAutoSave();
        this.migrateOldData();
    }

    // Установка значения
    set(key, value, options = {}) {
        const item = {
            data: value,
            timestamp: Date.now(),
            version: this.version,
            expires: options.expires || Date.now() + this.maxAge,
            encrypted: options.encrypted || this.encryptionEnabled,
            compressed: options.compressed !== false && this.compressionEnabled
        };

        try {
            let serialized = JSON.stringify(item);
            
            if (item.compressed) {
                serialized = this.compress(serialized);
            }
            
            if (item.encrypted) {
                serialized = this.encrypt(serialized);
            }

            localStorage.setItem(this.prefix + key, serialized);
            
            // Триггер события сохранения
            this.dispatchEvent('storage:changed', { key, value, action: 'set' });
            
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            this.handleStorageError(error);
            return false;
        }
    }

    // Получение значения
    get(key, defaultValue = null) {
        try {
            let serialized = localStorage.getItem(this.prefix + key);
            
            if (!serialized) {
                return defaultValue;
            }

            // Проверяем на шифрование
            if (this.isEncrypted(serialized)) {
                serialized = this.decrypt(serialized);
            }

            // Проверяем на компрессию
            if (this.isCompressed(serialized)) {
                serialized = this.decompress(serialized);
            }

            const item = JSON.parse(serialized);

            // Проверяем срок действия
            if (item.expires && Date.now() > item.expires) {
                this.remove(key);
                return defaultValue;
            }

            // Проверяем версию
            if (item.version !== this.version) {
                this.migrateItem(key, item);
            }

            return item.data;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    }

    // Удаление значения
    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            this.dispatchEvent('storage:changed', { key, action: 'remove' });
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    // Проверка наличия ключа
    has(key) {
        return localStorage.getItem(this.prefix + key) !== null;
    }

    // Очистка всех данных
    clear() {
        try {
            const keys = this.getAllKeys();
            keys.forEach(key => this.remove(key));
            this.dispatchEvent('storage:cleared');
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }

    // Получение всех ключей
    getAllKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                keys.push(key.substring(this.prefix.length));
            }
        }
        return keys;
    }

    // Получение размера хранилища
    getStorageSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    }

    // Очистка устаревших данных
    cleanup() {
        const keys = this.getAllKeys();
        let cleaned = 0;

        keys.forEach(key => {
            try {
                let serialized = localStorage.getItem(this.prefix + key);
                if (!serialized) return;

                if (this.isEncrypted(serialized)) {
                    serialized = this.decrypt(serialized);
                }

                if (this.isCompressed(serialized)) {
                    serialized = this.decompress(serialized);
                }

                const item = JSON.parse(serialized);

                if (item.expires && Date.now() > item.expires) {
                    this.remove(key);
                    cleaned++;
                }
            } catch (error) {
                // Удаляем поврежденные данные
                this.remove(key);
                cleaned++;
            }
        });

        if (cleaned > 0) {
            console.log(`Cleaned up ${cleaned} expired items from localStorage`);
        }
    }

    // Компрессия данных
    compress(data) {
        try {
            // Простая компрессия - заменяем повторяющиеся строки
            return data.replace(/\s+/g, ' ').trim();
        } catch (error) {
            return data;
        }
    }

    // Декомпрессия данных
    decompress(data) {
        return data;
    }

    // Шифрование данных (простое)
    encrypt(data) {
        if (!this.encryptionEnabled) return data;
        try {
            return btoa(unescape(encodeURIComponent(data)));
        } catch (error) {
            return data;
        }
    }

    // Расшифровка данных
    decrypt(data) {
        if (!this.encryptionEnabled) return data;
        try {
            return decodeURIComponent(escape(atob(data)));
        } catch (error) {
            return data;
        }
    }

    // Проверка на шифрование
    isEncrypted(data) {
        return this.encryptionEnabled && data.indexOf('YAK_ENC_') === 0;
    }

    // Проверка на компрессию
    isCompressed(data) {
        return data.indexOf('YAK_COMP_') === 0;
    }

    // Обработка ошибок хранилища
    handleStorageError(error) {
        if (error.name === 'QuotaExceededError') {
            yakNotifications.error('Недостаточно места в хранилище. Очистите старые данные.', {
                title: 'Ошибка хранилища',
                actions: [
                    {
                        text: 'Очистить',
                        onclick: 'yakStorage.cleanup()',
                        primary: true
                    }
                ]
            });
        } else {
            yakNotifications.error('Ошибка сохранения данных', {
                title: 'Ошибка хранилища'
            });
        }
    }

    // Автосохранение
    setupAutoSave() {
        // Сохраняем данные перед закрытием страницы
        window.addEventListener('beforeunload', () => {
            this.saveCurrentSession();
        });

        // Сохраняем при потере фокуса
        window.addEventListener('blur', () => {
            this.saveCurrentSession();
        });

        // Периодическое сохранение
        setInterval(() => {
            this.saveCurrentSession();
        }, 60000); // Каждую минуту
    }

    // Сохранение текущей сессии
    saveCurrentSession() {
        const session = {
            url: window.location.href,
            timestamp: Date.now(),
            scrollPosition: {
                x: window.scrollX,
                y: window.scrollY
            },
            formData: this.captureFormData()
        };

        this.set('current_session', session, { expires: Date.now() + 24 * 60 * 60 * 1000 }); // 24 часа
    }

    // Восстановление сессии
    restoreSession() {
        const session = this.get('current_session');
        if (session && session.url === window.location.href) {
            // Восстанавливаем позицию прокрутки
            if (session.scrollPosition) {
                window.scrollTo(session.scrollPosition.x, session.scrollPosition.y);
            }

            // Восстанавливаем формы
            if (session.formData) {
                this.restoreFormData(session.formData);
            }

            return true;
        }
        return false;
    }

    // Захват данных форм
    captureFormData() {
        const formData = {};
        const forms = document.querySelectorAll('form[data-persist="true"]');
        
        forms.forEach(form => {
            const formId = form.id || form.className || 'form-' + Math.random().toString(36).substr(2, 9);
            formData[formId] = new FormData(form);
        });

        return formData;
    }

    // Восстановление данных форм
    restoreFormData(formData) {
        Object.entries(formData).forEach(([formId, data]) => {
            const form = document.querySelector(`#${formId}, .${formId}`);
            if (form) {
                const formData = new FormData(form);
                data.forEach((value, key) => {
                    formData.set(key, value);
                });
                
                // Заполняем поля формы
                Array.from(formData.entries()).forEach(([key, value]) => {
                    const field = form.querySelector(`[name="${key}"]`);
                    if (field) {
                        field.value = value;
                    }
                });
            }
        });
    }

    // Миграция старых данных
    migrateOldData() {
        const oldVersion = this.get('storage_version');
        if (oldVersion && oldVersion !== this.version) {
            console.log('Migrating localStorage data...');
            // Здесь можно добавить логику миграции
            this.set('storage_version', this.version);
        }
    }

    // Миграция отдельного элемента
    migrateItem(key, item) {
        // Логика миграции для конкретного элемента
        console.log(`Migrating item: ${key}`);
        item.version = this.version;
        this.set(key, item.data);
    }

    // Отправка событий
    dispatchEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        window.dispatchEvent(event);
    }

    // Специфичные методы для YakMarket

    // Сохранение товаров
    saveProducts(products) {
        return this.set('products_cache', products, { expires: Date.now() + 30 * 60 * 1000 }); // 30 минут
    }

    // Получение товаров
    getProducts() {
        return this.get('products_cache', []);
    }

    // Сохранение избранного
    saveFavorites(favorites) {
        return this.set('favorites', favorites);
    }

    // Получение избранного
    getFavorites() {
        return this.get('favorites', []);
    }

    // Сохранение поисковых запросов
    saveSearchQuery(query) {
        const searches = this.get('search_history', []);
        const filtered = searches.filter(s => s !== query);
        filtered.unshift(query);
        return this.set('search_history', filtered.slice(0, 50)); // Максимум 50 запросов
    }

    // Получение поисковых запросов
    getSearchHistory() {
        return this.get('search_history', []);
    }

    // Сохранение настроек пользователя
    saveSettings(settings) {
        return this.set('user_settings', settings);
    }

    // Получение настроек пользователя
    getSettings() {
        return this.get('user_settings', {
            theme: 'light',
            language: 'ru',
            notifications: {
                email: true,
                push: true,
                sms: false
            }
        });
    }

    // Сохранение корзины
    saveCart(cart) {
        return this.set('cart', cart);
    }

    // Получение корзины
    getCart() {
        return this.get('cart', []);
    }

    // Сохранение черновиков
    saveDraft(type, data) {
        const drafts = this.get('drafts', {});
        drafts[type] = {
            data,
            timestamp: Date.now()
        };
        return this.set('drafts', drafts);
    }

    // Получение черновиков
    getDraft(type) {
        const drafts = this.get('drafts', {});
        return drafts[type] || null;
    }

    // Очистка черновиков
    clearDrafts() {
        return this.remove('drafts');
    }

    // Статистика использования
    getUsageStats() {
        return {
            totalItems: this.getAllKeys().length,
            storageSize: this.getStorageSize(),
            lastCleanup: this.get('last_cleanup'),
            version: this.version
        };
    }
}

// Глобальный экземпляр
const yakStorage = new YakLocalStorage();

// Экспорт
window.YakStorage = yakStorage;
window.yakStorage = yakStorage;

// Автоматическое восстановление сессии при загрузке
document.addEventListener('DOMContentLoaded', () => {
    yakStorage.restoreSession();
});

// Обработка событий хранилища
window.addEventListener('storage:changed', (event) => {
    console.log('Storage changed:', event.detail);
});

// Периодическая очистка
setInterval(() => {
    yakStorage.cleanup();
    yakStorage.set('last_cleanup', Date.now());
}, 24 * 60 * 60 * 1000); // Раз в день
