/**
 * YakMarket.tj - Dashboard Page
 * Страница дашборда пользователя
 */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Инициализируем Auth
        if (window.YakAuth) {
            await YakAuth.init();
        }

        // Проверяем авторизацию
        if (!YakAuth.isAuthenticated()) {
            showNotLoggedIn();
            return;
        }

        // Загружаем данные дашборда
        await loadDashboard();

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        hideLoading();
        showNotLoggedIn();
    }
});

// Загрузка данных дашборда
async function loadDashboard() {
    try {
        const user = YakAuth.getCurrentUser();
        const userId = YakAuth.getCurrentUserId();

        // Отображаем имя пользователя
        const displayName = user?.username || 'Пользователь';
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = displayName;
        }

        // Загружаем статистику
        await loadStatistics(userId);

        // Загружаем объявления пользователя
        await loadMyListings(userId);

        hideLoading();
        const dashboardContent = document.getElementById('dashboardContent');
        if (dashboardContent) {
            dashboardContent.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Load dashboard error:', error);
        hideLoading();
        showNotLoggedIn();
    }
}

// Загрузка статистики
async function loadStatistics(userId) {
    try {
        // Количество объявлений пользователя
        const products = await window.ProductsAPI.getProductsByUser(userId);
        const myListingsCountElement = document.getElementById('myListingsCount');
        if (myListingsCountElement) {
            myListingsCountElement.textContent = products.length;
        }

        // Количество избранных
        if (window.YakStrapi) {
            const favorites = await window.YakStrapi.getFavorites();
            const favoritesCountElement = document.getElementById('favoritesCount');
            if (favoritesCountElement) {
                favoritesCountElement.textContent = (favorites.data || favorites).length;
            }
        }

        // Статус аккаунта
        const user = YakAuth.getCurrentUser();
        const accountStatusElement = document.getElementById('accountStatus');
        if (accountStatusElement) {
            if (user?.confirmed) {
                accountStatusElement.textContent = 'Подтвержден';
                accountStatusElement.classList.remove('text-yellow-600');
                accountStatusElement.classList.add('text-green-600');
            } else {
                accountStatusElement.textContent = 'Ожидает';
                accountStatusElement.classList.remove('text-green-600');
                accountStatusElement.classList.add('text-yellow-600');
            }
        }
    } catch (error) {
        console.error('Load statistics error:', error);
    }
}

// Загрузка объявлений пользователя
async function loadMyListings(userId) {
    try {
        const products = await window.ProductsAPI.getProductsByUser(userId);

        const listingsContainer = document.getElementById('myListings');
        const noListings = document.getElementById('noListings');

        if (!listingsContainer || !noListings) return;

        if (products.length === 0) {
            listingsContainer.classList.add('hidden');
            noListings.classList.remove('hidden');
            return;
        }

        noListings.classList.add('hidden');
        listingsContainer.classList.remove('hidden');
        listingsContainer.innerHTML = ''; // Clear previous

        // Показываем только первые 6
        const recentListings = products.slice(0, 6);

        recentListings.forEach(product => {
            const card = createListingCard(product);
            listingsContainer.appendChild(card);
        });
    } catch (error) {
        console.error('Load listings error:', error);
    }
}

// Создание карточки объявления
function createListingCard(product) {
    const card = document.createElement('a');
    card.href = `product-detail.html?id=${product.id}`;
    card.className = 'flex gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10';

    const imageUrl = (product.images && product.images.length > 0) ? product.images[0] : 'https://via.placeholder.com/100x100?text=No+Image';
    const price = product.price ? `${product.price} TJS` : 'Цена по запросу';
    const title = product.title || 'Без названия';

    card.innerHTML = `
        <img src="${imageUrl}" alt="${title}" class="w-20 h-20 object-cover rounded-xl">
        <div class="flex-1 min-w-0">
            <h3 class="font-bold text-gray-900 dark:text-white truncate">${title}</h3>
            <p class="text-blue-600 dark:text-blue-400 font-bold mt-1">${price}</p>
            <p class="text-xs text-gray-500 mt-1">${product.category || 'Общее'}</p>
        </div>
    `;

    return card;
}

// Скрыть загрузку
function hideLoading() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.classList.add('hidden');
    }
}

// Показать "не авторизован"
function showNotLoggedIn() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const notLoggedIn = document.getElementById('notLoggedIn');

    if (loadingSpinner) {
        loadingSpinner.classList.add('hidden');
    }
    if (notLoggedIn) {
        notLoggedIn.classList.remove('hidden');
    }
}
