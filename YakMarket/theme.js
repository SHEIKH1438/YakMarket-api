/**
 * YakMarket.tj - Unified Theme & Error Manager
 * Handles Dark/Light mode and global API errors.
 */

(function () {
    'use strict';

    const THEME_KEY = 'theme'; // Use standard key

    /**
     * --- THEME MANAGEMENT ---
     */

    function getStoredTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored) return stored;
        return 'dark'; // Default to dark as requested
    }

    function applyTheme(theme) {
        const isDark = theme === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem(THEME_KEY, theme);

        // Update theme icons globally
        document.querySelectorAll('[data-lucide="sun"]').forEach(el => {
            el.style.display = isDark ? 'none' : 'block';
        });
        document.querySelectorAll('[data-lucide="moon"]').forEach(el => {
            el.style.display = isDark ? 'block' : 'none';
        });

        // Trigger custom event
        window.dispatchEvent(new CustomEvent('yak:themeChanged', { detail: { theme } }));
    }

    window.toggleTheme = function () {
        const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
    };

    /**
     * --- GLOBAL ERROR HANDLING ---
     */

    window.YakErrorHandler = {
        handle(error) {
            console.error('YakMarket API Error:', error);

            let message = 'Произошла ошибка при выполнении запроса';
            let isCritical = false;

            if (!error.status || error.status === 0 || error.message?.includes('Failed to fetch')) {
                message = 'Проблема с подключением к серверу. Мы уже работаем над этим.';
                isCritical = true;
            } else if (error.status === 401 || error.code === 'auth/unauthorized') {
                message = 'Пожалуйста, войдите в систему';
                if (!window.location.pathname.includes('login.html')) {
                    setTimeout(() => window.location.href = 'login.html', 1500);
                }
            } else if (error.status === 403) {
                message = 'У вас недостаточно прав для этого действия';
            } else if (error.status === 404) {
                message = 'Пункт не найден на сервере';
            } else if (error.status >= 500) {
                message = 'Ошибка сервера YakMarket';
            }

            if (isCritical) {
                this.showCriticalStub(message);
            } else {
                if (window.YakToast) {
                    window.YakToast.error(message);
                } else if (window.showToast) {
                    window.showToast(message, 'error');
                } else {
                    alert(message);
                }
            }

            return { success: false, error: message };
        },

        showCriticalStub(message) {
            const stub = document.createElement('div');
            stub.className = 'fixed inset-0 z-[10000] bg-white dark:bg-[#212121] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500';
            stub.innerHTML = `
                <div class="w-16 h-16 bg-red-50 dark:bg-red-900/10 rounded-2xl flex items-center justify-center mb-6 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <h1 class="text-xl font-bold mb-2 dark:text-white">Технические работы</h1>
                <p class="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-8">${message}</p>
                <button onclick="location.reload()" class="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-xl font-bold text-sm transition-transform active:scale-95">
                    Обновить страницу
                </button>
            `;
            document.body.appendChild(stub);
        }
    };

    /**
     * --- INITIALIZATION ---
     */

    function init() {
        const theme = getStoredTheme();
        applyTheme(theme);

        // Устанавливаем активный пункт навигации
        if (window.YakNavigation) {
            YakNavigation.setActiveNavItem();
        }

        // Sync tabs
        window.addEventListener('storage', (e) => {
            if (e.key === THEME_KEY) applyTheme(e.newValue);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();