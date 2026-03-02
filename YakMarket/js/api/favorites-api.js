/**
 * Favorites API - Strapi Backend Interface
 */

const FavoritesAPI = {
    /**
     * Add to favorites
     */
    async addToFavorites(productId) {
        return window.YakStrapi.request('/favorites', {
            method: 'POST',
            body: JSON.stringify({ data: { product: productId } })
        });
    },

    /**
     * Remove from favorites
     */
    async removeFromFavorites(productId) {
        // In Strapi v4, you usually delete by ID of the favorite entry, not product ID
        // Assuming we need to find it first or use a custom endpoint
        const existing = await window.YakStrapi.request(`/favorites?filters[product][id][$eq]=${productId}`);
        if (existing.data && existing.data.length > 0) {
            return window.YakStrapi.request(`/favorites/${existing.data[0].id}`, {
                method: 'DELETE'
            });
        }
        return true;
    },

    /**
     * Get all favorites
     */
    async getFavorites() {
        const result = await window.YakStrapi.request('/favorites?populate=product');
        return result.data?.map(item => item.product) || [];
    },

    /**
     * Check if product is favorite
     */
    async isFavorite(productId) {
        const existing = await window.YakStrapi.request(`/favorites?filters[product][id][$eq]=${productId}`);
        return existing.data && existing.data.length > 0;
    },

    /**
     * Toggle favorite
     */
    async toggleFavorite(productId) {
        const isFav = await this.isFavorite(productId);
        if (isFav) {
            await this.removeFromFavorites(productId);
            return false;
        } else {
            await this.addToFavorites(productId);
            return true;
        }
    }
};

// Make available globally
window.FavoritesAPI = FavoritesAPI;
