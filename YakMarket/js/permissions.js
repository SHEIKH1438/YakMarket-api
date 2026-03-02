/**
 * YakMarket.tj - Security & Permissions Module
 * Модуль безопасности и прав доступа
 */

const YakPermissions = {
    ROLES: {
        GUEST: 'guest',
        USER: 'user',
        MODERATOR: 'moderator',
        ADMIN: 'admin'
    },

    getCurrentRole() {
        const user = window.YakAuth?.getCurrentUser();
        if (!user) return this.ROLES.GUEST;
        return user.role || this.ROLES.USER;
    },

    isLoggedIn() {
        return !!localStorage.getItem('yak_auth_token');
    },

    /**
     * Поделиться правами: Гости НЕ могут создавать объявления
     */
    canCreateListing() {
        return this.isLoggedIn();
    },

    /**
     * Гости НЕ могут писать в чаты
     */
    canUseChat() {
        return this.isLoggedIn();
    },

    /**
     * Проверка владения товаром
     */
    canEditProduct(product) {
        if (!this.isLoggedIn()) return false;

        const role = this.getCurrentRole();
        const userId = window.YakAuth?.getCurrentUserId();

        if (role === this.ROLES.ADMIN || role === this.ROLES.MODERATOR) return true;

        // Проверка по ID владельца (owner_id из Strapi или sellerId для совместимости)
        const ownerId = product?.owner?.id || product?.owner_id || product?.sellerId;
        return ownerId === userId;
    },

    canDeleteProduct(product) {
        return this.canEditProduct(product);
    },

    /**
     * Навигация: если гость нажал «создать», отправляем на логин
     */
    checkAccessAndRedirect(action, redirectUrl = 'login.html') {
        if (!this.isLoggedIn()) {
            this.showAccessDenied(action);
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 2000);
            return false;
        }
        return true;
    },

    getAccessDeniedMessage(action) {
        if (!this.isLoggedIn()) {
            return `Для ${action || 'этого действия'} необходимо войти в аккаунт`;
        }
        return `У вас нет прав доступа к этой функции`;
    },

    showAccessDenied(action) {
        if (window.YakToast) {
            window.YakToast.error(this.getAccessDeniedMessage(action));
        }
    }
};

window.YakPermissions = YakPermissions;
