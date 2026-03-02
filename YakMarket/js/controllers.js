/**
 * YakMarket.tj - Strapi Controllers Layer
 * Централизованная бизнес-логика для Auth, Products, and Chats через Strapi.
 */

const YakControllers = {
    /**
     * Auth Controller
     */
    Auth: {
        async loginWithGoogle() {
            try {
                // В Strapi Google Auth обычно происходит через редирект
                window.YakAuth.loginWithGoogle();
                return { success: true, message: 'Redirecting to Google...' };
            } catch (error) {
                return window.YakErrorHandler.handle(error);
            }
        },

        async loginWithEmail(identifier, password) {
            try {
                if (!identifier || !password) throw { code: 'local/empty-fields' };
                const result = await window.YakAuth.loginWithEmail(identifier, password);
                return { success: true, message: 'Вход выполнен', user: result.user };
            } catch (error) {
                return window.YakErrorHandler.handle(error);
            }
        },

        async register(username, email, password) {
            try {
                if (!username || !email || !password) throw { code: 'local/empty-fields' };
                const result = await window.YakAuth.registerWithEmail(username, email, password);
                return { success: true, message: 'Аккаунт успешно создан', user: result.user };
            } catch (error) {
                return window.YakErrorHandler.handle(error);
            }
        }
    },

    /**
     * Product Controller (Strapi via YakStrapi)
     */
    Product: {
        async create(productData) {
            if (!window.YakMiddleware.requireRole(['user', 'admin'])) return;

            try {
                const sanitized = window.YakMiddleware.sanitize(productData);
                const response = await window.YakStrapi.createProduct(sanitized);
                return { success: true, message: 'Объявление добавлено!', data: response.data };
            } catch (error) {
                return window.YakErrorHandler.handle(error);
            }
        },

        async getList(params = {}) {
            try {
                const products = await window.YakStrapi.getProducts(params);
                return products;
            } catch (error) {
                console.error('Error fetching products:', error);
                return [];
            }
        },

        async getById(id) {
            try {
                const product = await window.YakStrapi.getProduct(id);
                return product;
            } catch (error) {
                console.error('Error fetching product:', error);
                return null;
            }
        }
    }
};

window.YakControllers = YakControllers;
