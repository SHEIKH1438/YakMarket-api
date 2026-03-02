/**
 * Favorites Management Module for YakMarket
 * Handles both local and Strapi-synced favorites
 */

const YakFavorites = {
    _favorites: [],
    _storageKey: 'yak_favorites',

    init() {
        console.log('YakFavorites initializing...');
        this.loadLocal();

        // Setup cross-tab sync
        window.addEventListener('storage', (e) => {
            if (e.key === this._storageKey) {
                this.loadLocal();
                this.notify();
            }
        });

        // Sync with Strapi if logged in
        setTimeout(() => this.syncWithStrapi(), 1000);
    },

    loadLocal() {
        try {
            const data = localStorage.getItem(this._storageKey);
            this._favorites = data ? JSON.parse(data) : [];
        } catch (e) {
            this._favorites = [];
        }
    },

    saveLocal() {
        localStorage.setItem(this._storageKey, JSON.stringify(this._favorites));
        this.notify();
    },

    async syncWithStrapi() {
        if (!window.YakAuth?.isAuthenticated()) return;

        try {
            // Get user's favorites from Strapi profile
            const user = await window.YakAuth.getCurrentUser();
            if (user?.favorites) {
                const strapiFavs = Array.isArray(user.favorites) ? user.favorites : [];

                // Merge local with remote
                const merged = [...new Set([...this._favorites, ...strapiFavs])];
                this._favorites = merged;
                this.saveLocal();
            }
        } catch (error) {
            console.error('Error syncing favorites with Strapi:', error);
        }
    },

    isFavorite(productId) {
        if (!productId) return false;
        const id = productId.toString();
        return this._favorites.includes(id);
    },

    async toggle(productId) {
        if (!productId) return false;
        const id = productId.toString();
        const index = this._favorites.indexOf(id);

        if (index === -1) {
            this._favorites.push(id);
            if (window.YakToast) window.YakToast.success('Добавлено в избранное');
        } else {
            this._favorites.splice(index, 1);
            if (window.YakToast) window.YakToast.success('Удалено из избранного');
        }

        this.saveLocal();
        return true;
    },

    get() {
        return this._favorites;
    },

    notify() {
        document.dispatchEvent(new CustomEvent('favoritesUpdated', {
            detail: { favorites: this._favorites }
        }));
    }
};

// Global access
window.YakFavorites = YakFavorites;

// Auto-init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => YakFavorites.init());
} else {
    YakFavorites.init();
}
