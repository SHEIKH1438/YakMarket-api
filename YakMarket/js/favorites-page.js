/**
 * YakMarket.tj - Favorites Page Module
 * Модуль для страницы избранного
 */

const YakFavoritesPage = {
    /**
     * Инициализация страницы избранного
     */
    async init() {
        console.log('YakFavoritesPage initialized');

        try {
            // Инициализируем только Auth
            await YakAuth.init();

            // Инициализируем навигацию
            if (window.YakNavigation) {
                YakNavigation.init();
            }

            // Проверяем авторизацию
            if (!YakAuth.isAuthenticated()) {
                this.showNotLoggedIn();
                return;
            }

            // Загружаем избранное
            await this.loadFavorites();

        } catch (error) {
            console.error('Initialization error:', error);
            this.hideLoading();
            this.showEmptyState();
        }
    },

    /**
     * Загрузка избранного
     */
    async loadFavorites() {
        try {
            const favorites = await YakFavorites.getAll();

            this.hideLoading();

            if (!favorites || favorites.length === 0) {
                this.showEmptyState();
                return;
            }

            // Загружаем данные товаров через ProductsAPI
            const products = [];
            for (const productId of favorites) {
                try {
                    const product = await ProductsAPI.getProductById(productId);
                    if (product) {
                        products.push(product);
                    }
                } catch (err) {
                    console.warn(`Product ${productId} not found or error loading:`, err);
                }
            }

            if (products.length === 0) {
                this.showEmptyState();
                return;
            }

            this.displayProducts(products);
        } catch (error) {
            console.error('Load favorites error:', error);
            this.hideLoading();
            this.showEmptyState();
        }
    },

    /**
     * Отображение товаров
     */
    displayProducts(products) {
        const grid = document.getElementById('favoritesGrid');
        if (!grid) return;

        grid.innerHTML = '';
        grid.classList.remove('hidden');

        products.forEach(product => {
            const card = this.createProductCard(product);
            grid.appendChild(card);
        });
    },

    /**
     * Создание карточки товара
     */
    createProductCard(product) {
        const card = document.createElement('div');
        // Премиум стили с закруглением 16px
        card.className = 'bg-white dark:bg-[#2d2d2d] rounded-[16px] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-all duration-300';

        const attributes = product.attributes || product;
        const imageUrl = attributes.image || attributes.images?.[0] || 'https://via.placeholder.com/300x200?text=No+Image';
        const price = attributes.price ? `${attributes.price} TJS` : 'Цена по запросу';
        const title = attributes.title || 'Без названия';
        const location = attributes.location || '';
        const category = attributes.category?.[0] || attributes.category || '';
        const sellerName = attributes.seller?.name || 'Маркетплейс';

        card.innerHTML = `
            <a href="product-detail.html?id=${product.id}" class="block">
                <div class="relative aspect-[4/3] overflow-hidden">
                    <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500">
                    <button class="favorite-btn absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow hover:bg-white transition-all transform hover:scale-110 active:scale-90"
                            data-product-id="${product.id}">
                        <svg class="w-5 h-5 text-red-500" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                        </svg>
                    </button>
                </div>
                <div class="p-4">
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-[#3d3d3d] text-gray-500 dark:text-gray-400 rounded-full">${category}</span>
                    </div>
                    <h3 class="font-semibold text-gray-800 dark:text-gray-100 mb-1 truncate">${title}</h3>
                    <p class="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">${price}</p>
                    <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <span>${location}</span>
                    </div>
                </div>
            </a>
        `;

        // Обработчик избранного
        const favoriteBtn = card.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const productId = favoriteBtn.dataset.productId;

                try {
                    await YakFavorites.toggle(productId);
                    YakToast.success('Удалено из избранного');

                    // Удаляем карточку из DOM
                    card.classList.add('opacity-0', 'scale-95');
                    setTimeout(() => {
                        card.remove();
                        // Проверяем, остались ли товары
                        const remainingCards = document.querySelectorAll('#favoritesGrid > div');
                        if (remainingCards.length === 0) {
                            this.showEmptyState();
                        }
                    }, 300);

                } catch (error) {
                    console.error('Remove favorite error:', error);
                    YakToast.error('Ошибка при удалении из избранного');
                }
            });
        }

        return card;
    },

    /**
     * Скрыть загрузку
     */
    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.classList.add('hidden');
    },

    /**
     * Показать пустое состояние
     */
    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.classList.remove('hidden');
        const grid = document.getElementById('favoritesGrid');
        if (grid) grid.classList.add('hidden');
    },

    /**
     * Показать "не авторизован"
     */
    showNotLoggedIn() {
        this.hideLoading();
        const notLoggedIn = document.getElementById('notLoggedIn');
        if (notLoggedIn) notLoggedIn.classList.remove('hidden');
    },

};