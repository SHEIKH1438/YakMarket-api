/**
 * YakMarket.tj - Products Module
 * Модуль для загрузки и управления товарами
 */

const YakProducts = {
    /**
     * Загрузка всех товаров из Strapi
     */
    async loadAll() {
        try {
            const result = await window.YakStrapi.request('/products?populate=*&sort=createdAt:desc');
            return result.data || [];
        } catch (error) {
            console.error('Load products error:', error);
            throw error;
        }
    },

    /**
     * Загрузка товара по ID
     */
    async getById(productId) {
        try {
            const result = await window.YakStrapi.request(`/products/${productId}?populate=*`);
            return result.data;
        } catch (error) {
            console.error('Load product error:', error);
            throw error;
        }
    },

    /**
     * Инициализация Real-time для товаров
     */
    initRealtime() {
        if (!window.YakRealtime) return;

        window.YakRealtime.on('product:create', (newProduct) => {
            console.log('Realtime: New product created', newProduct);
            if (document.getElementById('productsGrid')) {
                const card = this.createCard(newProduct);
                const grid = document.getElementById('productsGrid');
                grid.prepend(card);
            }
        });

        window.YakRealtime.on('product:update', (updatedProduct) => {
            console.log('Realtime: Product updated', updatedProduct);
            const card = document.querySelector(`[data-product-id="${updatedProduct.id}"]`)?.closest('.product-card-wrap');
            if (card) {
                const newCard = this.createCard(updatedProduct);
                card.replaceWith(newCard);
            }
        });

        window.YakRealtime.on('product:delete', (data) => {
            console.log('Realtime: Product deleted', data);
            document.querySelector(`[data-product-id="${data.id}"]`)?.closest('.product-card-wrap')?.remove();
        });
    },

    /**
     * Создание карточки товара
     */
    createCard(product) {
        const wrapper = document.createElement('div');
        wrapper.className = 'product-card-wrap';

        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full';

        const attributes = product.attributes || product; // Strapi v4 response format
        const id = product.id;

        const imageUrl = attributes.images?.[0]?.url || attributes.image || 'https://via.placeholder.com/300x200?text=No+Image';
        const price = attributes.price ? `${attributes.price} TJS` : 'Цена по запросу';
        const title = attributes.title || 'Без названия';
        const location = attributes.location || '';
        const sellerName = attributes.owner?.username || attributes.sellerName || 'Маркетплейс';

        card.innerHTML = `
            <a href="product-detail.html?id=${id}" class="block">
                <div class="relative">
                    <img src="${imageUrl}" alt="${title}" class="w-full h-48 object-cover">
                    <button class="favorite-btn absolute top-2 right-2 p-2 bg-white rounded-full shadow hover:bg-gray-100 transition-colors"
                            data-product-id="${id}">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                        </svg>
                    </button>
                </div>
                <div class="p-4">
                    <h3 class="font-semibold text-gray-800 mb-2 truncate">${title}</h3>
                    <p class="text-lg font-bold text-blue-600 mb-2">${price}</p>
                    <div class="flex justify-between items-center mt-4">
                        <span class="text-xs text-gray-500">${location}</span>
                        <span class="text-xs font-medium text-gray-700">${sellerName}</span>
                    </div>
                </div>
            </a>
        `;

        wrapper.appendChild(card);

        // Handle favorites
        const favoriteBtn = card.querySelector('.favorite-btn');
        if (favoriteBtn && window.FavoritesAPI) {
            favoriteBtn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isFavorite = await window.FavoritesAPI.toggleFavorite(id);
                favoriteBtn.querySelector('svg').classList.toggle('text-red-500', isFavorite);
                favoriteBtn.querySelector('svg').classList.toggle('text-gray-400', !isFavorite);
            };

            window.FavoritesAPI.isFavorite(id).then(isFav => {
                favoriteBtn.querySelector('svg').classList.toggle('text-red-500', isFav);
            });
        }

        return wrapper;
    },

    /**
     * Отображение товаров в контейнере
     */
    display(products, containerId = 'productsGrid') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        container.innerHTML = '';
        container.classList.remove('hidden');

        if (products.length === 0) {
            this.showEmptyState(containerId);
            return;
        }

        products.forEach(product => {
            const card = this.createCard(product);
            container.appendChild(card);
        });
    },

    /**
     * Показать пустое состояние
     */
    showEmptyState(containerId = 'productsGrid') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <svg class="w-24 h-24 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <h3 class="text-xl font-semibold text-gray-600 mb-2">Ничего не найдено</h3>
                <p class="text-gray-500">Попробуйте изменить параметры поиска</p>
            </div>
        `;
    },

    /**
     * Скрыть загрузку
     */
    hideLoading(loadingId = 'loadingSpinner') {
        const loading = document.getElementById(loadingId);
        if (loading) {
            loading.classList.add('hidden');
        }
    }
};