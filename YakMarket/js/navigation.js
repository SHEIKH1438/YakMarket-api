/**
 * YakMarket.tj - Navigation Module
 * Модуль для управления навигацией на всех страницах
 */

const YakNavigation = {
    /**
     * Устанавливает активный пункт меню на основе текущей страницы
     */
    setActiveNavItem() {
        // Получаем текущий путь страницы
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        // Соответствие страниц и href пунктов меню
        const pageToNavMap = {
            'dashboard.html': 'dashboard',
            'favorites.html': 'favorites',
            'categories.html': 'categories',
            'chat.html': 'chat',
            'settings.html': 'settings',
            'search.html': 'search',
            'my-listing.html': 'my-listing',
            'add-listing.html': 'add-listing'
        };

        // Находим соответствующий пункт навигации
        const navId = pageToNavMap[currentPage];
        if (!navId) return;

        // Удаляем класс active у всех пунктов
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Добавляем класс active нужному пункту
        const activeNav = document.querySelector(`.nav-item[href="${currentPage}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }
    },

    /**
     * Обновляет навигацию в зависимости от статуса авторизации
     */
    updateNavigation() {
        const authLinks = document.getElementById('authLinks');
        if (!authLinks) return;

        if (window.YakAuth && YakAuth.isAuthenticated()) {
            const user = YakAuth.getCurrentUser();
            const displayName = user?.displayName || 'Профиль';

            authLinks.innerHTML = `
                <a href="dashboard.html" class="text-blue-600 font-medium">Дашборд</a>
                <a href="settings.html" class="text-gray-600 hover:text-gray-900">Настройки</a>
                <button onclick="YakNavigation.handleLogout()" class="text-red-600 hover:text-red-900">Выйти</button>
            `;
        } else {
            authLinks.innerHTML = `
                <a href="login.html" class="text-gray-600 hover:text-gray-900">Войти</a>
                <a href="register.html" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">Регистрация</a>
            `;
        }
    },

    /**
     * Обработчик выхода из аккаунта
     */
    async handleLogout() {
        try {
            if (window.YakAuth) {
                await YakAuth.logout();
            }
        } catch (error) {
            console.error('Logout error:', error);
            if (window.YakToast) {
                YakToast.error('Ошибка при выходе');
            }
        }
    },

    /**
     * Инициализация навигации
     */
    init() {
        this.setActiveNavItem();
        this.updateNavigation();
    }
};

// Делаем функции доступными глобально
window.YakNavigation = YakNavigation;