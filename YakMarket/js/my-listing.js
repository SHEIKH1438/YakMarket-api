/**
 * Модуль для страницы "Мои объявления"
 * Управляет загрузкой и отображением объявлений пользователя
 */

const MyListing = {
    /**
     * Инициализация модуля
     */
    async init() {
        try {
            // Инициализируем только Auth и Strapi
            await YakAuth.init();

            // Обновляем навигацию
            if (window.Navigation) {
                Navigation.update();
            }

            // Проверяем авторизацию
            const user = YakAuth.getCurrentUser();
            if (!user) {
                this.showNotLoggedIn();
                return;
            }

            // Загружаем объявления
            await this.loadListings();

        } catch (error) {
            console.error('Initialization error:', error);
            this.showNotLoggedIn();
        }
    },

    /**
     * Загрузка объявлений пользователя
     */
    async loadListings() {
        try {
            const user = YakAuth.getCurrentUser();
            if (!user) return;

            // Используем ProductsAPI для получения своих товаров
            // В Strapi мы можем фильтровать по owner
            const products = await ProductsAPI.getProducts({
                'filters[owner][id][$eq]': user.id,
                'publicationState': 'live',
                'populate': '*'
            });

            const listingsGrid = document.getElementById('listingsGrid');
            const noListings = document.getElementById('noListings');

            const loadingSpinner = document.getElementById('loadingSpinner');
            if (loadingSpinner) loadingSpinner.classList.add('hidden');

            const listingsContainer = document.getElementById('listingsContainer');
            if (listingsContainer) listingsContainer.classList.remove('hidden');

            if (!products || products.length === 0) {
                if (listingsGrid) listingsGrid.classList.add('hidden');
                if (noListings) noListings.classList.remove('hidden');
                return;
            }

            if (noListings) noListings.classList.add('hidden');
            if (listingsGrid) {
                listingsGrid.classList.remove('hidden');
                listingsGrid.innerHTML = ''; // Очищаем перед рендером
            }

            // Сортируем по дате (новые первые) - Strapi обычно возвращает в порядке создания, но для верности:
            products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            products.forEach(product => {
                const card = this.createListingCard(product);
                if (listingsGrid) listingsGrid.appendChild(card);
            });
        } catch (error) {
            console.error('Load listings error:', error);
            const loadingSpinner = document.getElementById('loadingSpinner');
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            const noListings = document.getElementById('noListings');
            if (noListings) noListings.classList.remove('hidden');
        }
    },

    /**
     * Создание карточки объявления
     */
    createListingCard(product) {
        const card = document.createElement('div');
        // Применяем премиум стили с закруглением 16px
        card.className = 'bg-white dark:bg-[#2d2d2d] rounded-[16px] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-all duration-300';

        const attributes = product.attributes || product;
        const imageUrl = attributes.image || attributes.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image';
        const price = attributes.price ? `${attributes.price} TJS` : 'Цена по запросу';
        const title = attributes.title || 'Без названия';
        const category = attributes.category || '';
        const location = attributes.location || '';

        card.innerHTML = `
            <a href="product-detail.html?id=${product.id}" class="block">
                <div class="relative aspect-[4/3] overflow-hidden">
                    <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500">
                </div>
                <div class="p-4">
                    <h3 class="font-semibold text-gray-800 dark:text-gray-100 truncate">${title}</h3>
                    <p class="text-blue-600 dark:text-blue-400 font-bold text-lg mt-1">${price}</p>
                    <div class="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>${category}</span>
                        ${location ? `<span>• ${location}</span>` : ''}
                    </div>
                </div>
            </a>
            <div class="px-4 pb-4 flex gap-2">
                <a href="edit-listing.html?id=${product.id}" class="flex-1 bg-gray-50 dark:bg-[#3d3d3d] text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-[12px] hover:bg-gray-100 dark:hover:bg-[#4d4d4d] transition-colors text-center text-sm font-medium">
                    Редактировать
                </a>
                <button data-listing-id="${product.id}" class="delete-btn flex-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-[12px] hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-medium">
                    Удалить
                </button>
            </div>
        `;

        // Добавляем обработчик для кнопки удаления
        const deleteBtn = card.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteListing(product));
        }

        return card;
    },

    /**
     * Удаление объявления
     */
    async deleteListing(product) {
        if (!product) {
            YakToast.error('Объявление не найдено');
            return;
        }

        if (!confirm('Вы уверены, что хотите удалить это объявление?')) {
            return;
        }

        try {
            await ProductsAPI.deleteProduct(product.id);
            YakToast.success('Объявление успешно удалено');

            // Перезагружаем список
            await this.loadListings();
        } catch (error) {
            console.error('Delete error:', error);
            YakToast.error(error.message || 'Ошибка удаления объявления');
        }
    },

    /**
     * Показать "не авторизован"
     */
    showNotLoggedIn() {
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) loadingSpinner.classList.add('hidden');
        const notLoggedIn = document.getElementById('notLoggedIn');
        if (notLoggedIn) notLoggedIn.classList.remove('hidden');
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    MyListing.init();
});
