/**
 * YakMarket.tj - Centralized Error Handler
 * Provides safe, uniform JSON-like error responses.
 */

const YakErrorHandler = {
    /**
     * Human-readable maps
     */
    MESSAGES: {
        'auth/invalid-email': 'Неверный формат электронной почты.',
        'auth/user-not-found': 'Пользователь не найден.',
        'auth/wrong-password': 'Неверный пароль.',
        'auth/email-already-in-use': 'Этот email уже используется другим аккаунтом.',
        'auth/weak-password': 'Пароль слишком слабый.',
        'auth/not-authenticated': 'Пожалуйста, войдите в систему.',
        'auth/permission-denied': 'У вас недостаточно прав для этого действия.',
        'db/save-failed': 'Ошибка сохранения данных. Попробуйте позже.',
        'storage/upload-failed': 'Ошибка загрузки файла.',
        'local/empty-fields': 'Пожалуйста, заполните все обязательные поля.',
        'ACCESS_DENIED_OWNERSHIP': 'Доступ запрещен: вы не являетесь владельцем этого объекта.'
    },

    /**
     * Handle error and show toast
     */
    handle(error, silent = false) {
        console.error('[YakErrorHandler]', error);

        const code = error.code || 'unknown';
        const message = this.MESSAGES[code] || error.message || 'Произошла непредвиденная ошибка.';

        const response = {
            success: false,
            code: code,
            message: message,
            timestamp: Date.now()
        };

        if (!silent && window.YakToast) {
            window.YakToast.error(message);
        } else if (!silent && typeof showToast === 'function') {
            showToast(message, 'error');
        }

        return response;
    },

    /**
     * Success JSON response helper
     */
    success(message, data = {}) {
        if (message && (window.YakToast || typeof showToast === 'function')) {
            const toast = window.YakToast || { success: (m) => showToast(m, 'success') };
            toast.success(message);
        }

        return {
            success: true,
            message: message,
            data: data,
            timestamp: Date.now()
        };
    }
};

window.YakErrorHandler = YakErrorHandler;