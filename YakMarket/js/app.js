/**
 * YakMarket.tj - Main Application Script
 * Главный скрипт для управления всем приложением
 */

(function () {
    'use strict';

    // Состояние приложения
    const AppState = {
        initialized: false,
        currentUser: null,
        products: [],
        favorites: [],
        searchResults: []
    };

    /**
     * Инициализация приложения
     */
    async function initApp() {
        if (AppState.initialized) return;

        try {
            console.log('Initializing YakMarket (Strapi Edition)...');

            // Инициализируем Auth
            if (window.YakAuth) {
                await YakAuth.init();
            }

            // Инициализируем Realtime (Socket.io)
            if (window.YakRealtime) {
                YakRealtime.init();
            }

            // Инициализируем поиск
            if (window.YakSearch) {
                YakSearch.init();
            }

            // Устанавливаем активный пункт навигации
            if (window.YakNavigation) {
                YakNavigation.setActiveNavItem();
            }

            // Обновляем навигацию
            updateNavigation();

            // Инициализируем мобильное меню
            initMobileMenu();

            // Загружаем товары если мы на главной странице
            if (document.getElementById('productsGrid')) {
                await loadProducts();
                if (window.YakProducts) {
                    window.YakProducts.initRealtime();
                }
            }

            // Загружаем избранное если мы на странице избранного
            if (document.getElementById('favoritesGrid')) {
                await loadFavorites();
            }

            AppState.initialized = true;

        } catch (error) {
            console.error('App initialization error:', error);
        }
    }

    /**
     * Обновление навигации
     */
    function updateNavigation() {
        const authLinks = document.getElementById('authLinks');
        const mobileAuthLinks = document.getElementById('mobileAuthLinks');

        const isAuthenticated = window.YakAuth && YakAuth.isAuthenticated();

        if (isAuthenticated) {
            const user = YakAuth.getCurrentUser();
            const username = user?.username || 'Профиль';

            const links = `
                <a href="dashboard.html" class="text-gray-600 hover:text-gray-900">Дашборд</a>
                <a href="settings.html" class="text-gray-600 hover:text-gray-900">Настройки</a>
                <a href="favorites.html" class="text-gray-600 hover:text-gray-900">Избранное</a>
                <a href="chat.html" class="text-gray-600 hover:text-gray-900 relative">
                    Чаты
                    <span id="chatBadge" class="hidden absolute -top-1 -right-2 bg-red-500 text-white text-[10px] px-1 rounded-full">!</span>
                </a>
                <button onclick="YakApp.logout()" class="text-red-600 hover:text-red-900">Выйти</button>
            `;

            if (authLinks) authLinks.innerHTML = links;
            if (mobileAuthLinks) mobileAuthLinks.innerHTML = links.replace(/text-gray-600/g, 'block py-2 text-gray-600');

            // Listen for notifications
            if (window.YakRealtime) {
                window.YakRealtime.on('notification:chat', () => {
                    const badge = document.getElementById('chatBadge');
                    if (badge) badge.classList.remove('hidden');
                });
            }

        } else {
            const guestLinks = `
                <a href="login.html" class="text-gray-600 hover:text-gray-900">Войти</a>
                <a href="register.html" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">Регистрация</a>
            `;
            if (authLinks) authLinks.innerHTML = guestLinks;
            if (mobileAuthLinks) mobileAuthLinks.innerHTML = guestLinks.replace(/text-gray-600/g, 'block py-2 text-gray-600');
        }
    }

    /**
     * Инициализация мобильного меню
     */
    function initMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');

        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
    }

    /**
     * Загрузка товаров из Strapi
     */
    async function loadProducts() {
        if (!window.YakProducts) {
            console.error('YakProducts module not loaded');
            return;
        }

        try {
            const products = await YakProducts.loadAll();
            AppState.products = products;
            YakProducts.display(products);
            YakProducts.hideLoading();
        } catch (error) {
            console.error('Load products error:', error);
            YakProducts.hideLoading();
            YakProducts.showEmptyState();
        }
    }

    /**
     * Загрузка избранного
     */
    async function loadFavorites() {
        const favoritesGrid = document.getElementById('favoritesGrid');
        const emptyState = document.getElementById('emptyState');
        const loadingSpinner = document.getElementById('loadingSpinner');

        if (!favoritesGrid) {
            return;
        }

        try {
            if (loadingSpinner) {
                loadingSpinner.classList.remove('hidden');
            }
            if (favoritesGrid) {
                favoritesGrid.classList.add('hidden');
            }
            if (emptyState) {
                emptyState.classList.add('hidden');
            }

            if (!window.YakFavorites) {
                throw new Error('YakFavorites not loaded');
            }

            const favorites = YakFavorites.get();

            if (loadingSpinner) {
                loadingSpinner.classList.add('hidden');
            }

            if (favorites.length === 0) {
                if (emptyState) {
                    emptyState.classList.remove('hidden');
                }
                return;
            }

            favoritesGrid.innerHTML = '';
            favoritesGrid.classList.remove('hidden');

            // Get product details from localStorage
            const products = JSON.parse(localStorage.getItem('products') || '[]');
            favorites.forEach(productId => {
                const product = products.find(p => p.id === productId);
                if (product) {
                    const card = createProductCard(product);
                    favoritesGrid.appendChild(card);
                }
            });

        } catch (error) {
            console.error('Load favorites error:', error);
            if (loadingSpinner) {
                loadingSpinner.classList.add('hidden');
            }
            if (emptyState) {
                emptyState.classList.remove('hidden');
            }
        }
    }

    /**
     * Выход из системы
     */
    async function logout() {
        try {
            if (window.YakAuth) {
                await YakAuth.logout();
            }
        } catch (error) {
            console.error('Logout error:', error);
            if (window.YakToast) {
                YakToast.error('Ошибка выхода из системы');
            }
        }
    }

    /**
     * Экранирование HTML для безопасности
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Получить состояние приложения
     */
    function getState() {
        return AppState;
    }

    /**
     * Проверить авторизацию
     */
    function isAuthenticated() {
        return window.YakAuth && YakAuth.isAuthenticated();
    }

    /**
     * Получить текущего пользователя
     */
    function getCurrentUser() {
        return window.YakAuth ? YakAuth.getCurrentUser() : null;
    }

    // Публичный API
    window.YakApp = {
        init: initApp,
        updateNavigation,
        loadProducts,
        loadFavorites,
        logout,
        getState,
        isAuthenticated,
        getCurrentUser,
        escapeHtml
    };

    // Автоинициализация при загрузке страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

})();