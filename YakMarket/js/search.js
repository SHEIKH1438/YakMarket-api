/**
 * YakMarket.tj - Search Module
 * Модуль для поиска товаров
 */

const YakSearch = {
    searchTimeout: null,
    searchDelay: 300, // Задержка перед поиском (мс)

    /**
     * Инициализация модуля
     */
    init() {
        console.log('YakSearch initialized');
        this.initSearchInput();
        this.initSearchButton();
        this.initFilters();

        // Check for URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const cat = urlParams.get('cat') || urlParams.get('category');
        const q = urlParams.get('q') || urlParams.get('query');

        if (cat) {
            const categoryFilter = document.getElementById('categoryFilter');
            if (categoryFilter) {
                categoryFilter.value = cat;
                // If it's a dropdown, ensure the value exists or add it
                if (categoryFilter.selectedIndex === -1) {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    categoryFilter.appendChild(opt);
                    categoryFilter.value = cat;
                }
            }
        }

        if (q) {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = q;
        }

        // Initial search if params exist
        if (cat || q) {
            if (q) this.performSearch(q);
            else this.applyFilters();
        } else {
            this.loadAllProducts();
        }
    },

    /**
     * Инициализация поля поиска
     */
    initSearchInput() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            // Очищаем предыдущий таймер
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }

            // Если запрос пустой, загружаем все товары
            if (query === '') {
                this.searchTimeout = setTimeout(() => {
                    this.loadAllProducts();
                }, this.searchDelay);
                return;
            }

            // Выполняем поиск с задержкой
            this.searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, this.searchDelay);
        });

        // Поиск при нажатии Enter
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query) {
                    this.performSearch(query);
                } else {
                    this.loadAllProducts();
                }
            }
        });
    },

    /**
     * Инициализация кнопки поиска
     */
    initSearchButton() {
        const searchButton = document.getElementById('searchButton');
        if (!searchButton) return;

        searchButton.addEventListener('click', () => {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                const query = searchInput.value.trim();
                if (query) {
                    this.performSearch(query);
                } else {
                    this.loadAllProducts();
                }
            }
        });
    },

    /**
     * Инициализация фильтров
     */
    initFilters() {
        const categoryFilter = document.getElementById('categoryFilter');
        const priceMinFilter = document.getElementById('priceMinFilter');
        const priceMaxFilter = document.getElementById('priceMaxFilter');
        const locationFilter = document.getElementById('locationFilter');

        // Фильтр категории
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        // Фильтр минимальной цены
        if (priceMinFilter) {
            priceMinFilter.addEventListener('input', () => {
                this.applyFilters();
            });
        }

        // Фильтр максимальной цены
        if (priceMaxFilter) {
            priceMaxFilter.addEventListener('input', () => {
                this.applyFilters();
            });
        }

        // Фильтр локации
        if (locationFilter) {
            locationFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }
    },

    /**
     * Выполнить поиск
     */
    async performSearch(query) {
        try {
            if (!window.YakProducts) {
                console.error('YakProducts module not loaded');
                return;
            }

            const filters = this.getFilters();
            const results = await YakProducts.search(query, filters);

            // Отображаем результаты
            YakProducts.display(results);

            // Показываем сообщение если ничего не найдено
            if (results.length === 0) {
                YakToast.info('По вашему запросу ничего не найдено');
            } else {
                YakToast.success(`Найдено ${results.length} товаров`);
            }
        } catch (error) {
            console.error('Search error:', error);
            YakToast.error('Ошибка поиска');
        }
    },

    /**
     * Применить фильтры
     */
    async applyFilters() {
        try {
            const searchInput = document.getElementById('searchInput');
            const query = searchInput ? searchInput.value.trim() : '';
            const filters = this.getFilters();

            // Set loading state
            const grid = document.getElementById('products-grid');
            if (grid) grid.style.opacity = '0.5';

            const results = await YakProducts.search(query, filters);
            YakProducts.display(results);

            if (results.length === 0) {
                const emptyState = document.getElementById('emptyState');
                if (emptyState) {
                    emptyState.classList.remove('hidden');
                    emptyState.classList.add('flex');
                }
            } else {
                const emptyState = document.getElementById('emptyState');
                if (emptyState) emptyState.classList.add('hidden');
            }
        } catch (error) {
            console.error('Apply filters error:', error);
            YakToast.error('Ошибка применения фильтров');
        } finally {
            const grid = document.getElementById('products-grid');
            if (grid) grid.style.opacity = '1';
        }
    },

    /**
     * Получить текущие фильтры
     */
    getFilters() {
        const filters = {};

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter && categoryFilter.value) {
            filters.category = categoryFilter.value;
        }

        const priceMinFilter = document.getElementById('priceMinFilter');
        if (priceMinFilter && priceMinFilter.value) {
            filters.minPrice = parseFloat(priceMinFilter.value);
        }

        const priceMaxFilter = document.getElementById('priceMaxFilter');
        if (priceMaxFilter && priceMaxFilter.value) {
            filters.maxPrice = parseFloat(priceMaxFilter.value);
        }

        const locationFilter = document.getElementById('locationFilter');
        if (locationFilter && locationFilter.value) {
            filters.location = locationFilter.value;
        }

        return filters;
    },

    /**
     * Загрузить все товары
     */
    async loadAllProducts() {
        try {
            if (!window.YakProducts) {
                console.error('YakProducts module not loaded');
                return;
            }

            const products = await YakProducts.loadAll();
            YakProducts.display(products);
        } catch (error) {
            console.error('Load all products error:', error);
            YakToast.error('Ошибка загрузки товаров');
        }
    },

    /**
     * Сбросить поиск
     */
    reset() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.value = '';
        }

        const priceMinFilter = document.getElementById('priceMinFilter');
        if (priceMinFilter) {
            priceMinFilter.value = '';
        }

        const priceMaxFilter = document.getElementById('priceMaxFilter');
        if (priceMaxFilter) {
            priceMaxFilter.value = '';
        }

        const locationFilter = document.getElementById('locationFilter');
        if (locationFilter) {
            locationFilter.value = '';
        }

        this.loadAllProducts();
    }
};