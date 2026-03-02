/**
 * YakMarket.tj - Strapi Client
 * 
 * Клиент для работы с Strapi CMS с поддержкой CSRF и усиленной безопасностью.
 */

// Determine API URL based on environment
const getApiUrl = () => {
    const hostname = window.location.hostname;

    // Local development check
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168.')) {
        console.log('YakStrapi: Using local API (http://localhost:1337/api)');
        return 'http://localhost:1337/api';
    }

    // Production
    return 'https://yakmarket-api-production.up.railway.app/api';
};

const YakStrapi = {
    // Базовый URL API Strapi
    baseUrl: getApiUrl(),

    // API токен (JWT)
    apiToken: localStorage.getItem('yak_auth_token') || '',

    // CSRF токен (Double Submit Cookie)
    csrfToken: null,

    /**
     * Инициализация клиента (получение CSRF токена)
     */
    async init() {
        try {
            // Get CSRF token from security endpoint
            const response = await fetch(`${this.baseUrl}/csrf-token`, {
                credentials: 'include' // Include cookies for CORS
            });

            if (!response.ok) {
                console.warn('CSRF endpoint not available, continuing without CSRF');
                return;
            }

            const data = await response.json();
            if (data.status === 'success' && data.token) {
                this.csrfToken = data.token;
                console.log('YakStrapi: CSRF initialized');
            }
        } catch (error) {
            console.warn('YakStrapi: Failed to initialize CSRF', error);
        }
    },

    /**
     * Выполнение запроса к Strapi API
     */
    async request(endpoint, options = {}) {
        // If it's not a GET request and we don't have CSRF token, try to initialize
        if (!this.csrfToken && options.method && options.method !== 'GET') {
            await this.init();
        }

        try {
            const url = `${this.baseUrl}${endpoint}`;

            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };

            // Add JWT authorization
            if (this.apiToken) {
                headers['Authorization'] = `Bearer ${this.apiToken}`;
            }

            // Add CSRF token to header for state-changing requests
            if (this.csrfToken && options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method)) {
                headers['X-CSRF-Token'] = this.csrfToken;
            }

            const fetchOptions = {
                ...options,
                headers,
                credentials: 'include' // Important for CORS with cookies
            };

            const response = await fetch(url, fetchOptions);

            // For DELETE requests can return empty response
            if (response.status === 204) return { status: 'success' };

            const data = await response.json();

            if (!response.ok) {
                // Handle unified security errors
                if (data.status === 'fail' && window.YakErrorHandler) {
                    window.YakErrorHandler.handle({
                        code: data.code || 'api/error',
                        message: data.message
                    });
                }

                const error = new Error(data.message || `HTTP error! status: ${response.status}`);
                error.response = data;
                error.code = data.code;
                error.status = response.status;
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Strapi API Error:', error);
            throw error;
        }
    },

    /**
     * Методы для работы с данными (Категории, Товары и т.д.)
     */
    async getCategories() {
        try {
            const data = await this.request('/categories?populate=*');
            return data.data || [];
        } catch (error) {
            console.error('getCategories error:', error);
            return [];
        }
    },

    async getProducts(params = {}) {
        try {
            const queryString = new URLSearchParams({ populate: '*', ...params }).toString();
            const data = await this.request(`/products?${queryString}`);
            return data.data || [];
        } catch (error) {
            console.error('getProducts error:', error);
            return [];
        }
    },

    async getProduct(id) {
        try {
            const data = await this.request(`/products/${id}?populate=*`);
            return data.data || null;
        } catch (error) {
            console.error('getProduct error:', error);
            return null;
        }
    },

    async createProduct(productData) {
        return this.request('/products', {
            method: 'POST',
            body: JSON.stringify({ data: productData })
        });
    },

    async updateProduct(id, productData) {
        return this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ data: productData })
        });
    },

    async deleteProduct(id) {
        return this.request(`/products/${id}`, {
            method: 'DELETE'
        });
    },

    async uploadImage(file) {
        const formData = new FormData();
        formData.append('files', file);

        // For file upload, don't set Content-Type manually
        const response = await fetch(`${this.baseUrl}/upload`, {
            method: 'POST',
            headers: this.apiToken ? { 'Authorization': `Bearer ${this.apiToken}` } : {},
            body: formData,
            credentials: 'include'
        });
        return await response.json();
    },

    // Чат и Сообщения
    async getChats() {
        return this.request('/chats?populate=*');
    },

    async createChat(chatData) {
        return this.request('/chats', {
            method: 'POST',
            body: JSON.stringify({ data: chatData })
        });
    },

    async sendMessage(chatId, content) {
        return this.request('/messages', {
            method: 'POST',
            body: JSON.stringify({ data: { chat: chatId, content } })
        });
    },

    // Избранное
    async getFavorites() {
        return this.request('/favorites?populate=*');
    },

    async addFavorite(productId) {
        return this.request('/favorites', {
            method: 'POST',
            body: JSON.stringify({ data: { product: productId } })
        });
    },

    async removeFavorite(id) {
        return this.request(`/favorites/${id}`, {
            method: 'DELETE'
        });
    },

    /**
     * Утилиты
     */
    setBaseUrl(url) {
        this.baseUrl = url;
    },
    setApiToken(token) {
        this.apiToken = token;
        localStorage.setItem('yak_auth_token', token);
    },
    getApiToken() {
        return this.apiToken;
    },
    clearApiToken() {
        this.apiToken = '';
        localStorage.removeItem('yak_auth_token');
    },

    /**
     * Generic PUT request (for updating user data like favorites)
     */
    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
};

// Auto-initialize CSRF when loaded
if (typeof window !== 'undefined') {
    // Delay initialization to ensure page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            YakStrapi.init();
        });
    } else {
        YakStrapi.init();
    }
    window.YakStrapi = YakStrapi;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = YakStrapi;
}
