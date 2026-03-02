/**
 * Products API - Strapi Based
 * All product operations go through this API via YakStrapi
 */

const ProductsAPI = {
    /**
     * Create new product
     * Creates as draft (pending status) by default
     */
    async createProduct(data) {
        try {
            if (!window.YakStrapi) throw new Error('Strapi client not initialized');

            // Format data for Strapi
            const productData = {
                title: this.sanitize(data.title),
                description: this.sanitize(data.description),
                price: parseFloat(data.price),
                currency: data.currency || 'TJS',
                brand: data.brand || '',
                model: data.model || '',
                condition: data.condition || 'used',
                images: data.images || [],
                location: data.location,
                status: 'pending', // Always pending for new products
                views: 0,
                likes: 0,
                publishedAt: null // Ensure it's created as draft
            };

            // Handle category
            if (data.category) {
                if (typeof data.category === 'string' && isNaN(data.category)) {
                    try {
                        const catRes = await fetch(`${window.YakStrapi.baseUrl}/categories?filters[name][$eq]=${encodeURIComponent(data.category)}`);
                        if (catRes.ok) {
                            const catData = await catRes.json();
                            if (catData.data && catData.data.length > 0) {
                                productData.category = catData.data[0].id;
                            }
                        }
                    } catch (e) {
                        console.error('Category lookup error:', e);
                    }
                } else {
                    productData.category = parseInt(data.category);
                }
            }

            const response = await window.YakStrapi.createProduct(productData);
            return response.data || response;
        } catch (error) {
            console.error('Create product error:', error);
            throw error;
        }
    },

    /**
     * Update product
     */
    async updateProduct(productId, data) {
        try {
            if (!window.YakStrapi) throw new Error('Strapi client not initialized');

            const updateData = {
                title: data.title ? this.sanitize(data.title) : undefined,
                description: data.description ? this.sanitize(data.description) : undefined,
                price: data.price ? parseFloat(data.price) : undefined,
                brand: data.brand,
                model: data.model,
                condition: data.condition,
                images: data.images,
                location: data.location,
                status: data.status
            };

            // Remove undefined values
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined) delete updateData[key];
            });

            if (data.category) {
                if (typeof data.category === 'string' && isNaN(data.category)) {
                    try {
                        const catRes = await fetch(`${window.YakStrapi.baseUrl}/categories?filters[name][$eq]=${encodeURIComponent(data.category)}`);
                        if (catRes.ok) {
                            const catData = await catRes.json();
                            if (catData.data && catData.data.length > 0) {
                                updateData.category = catData.data[0].id;
                            }
                        }
                    } catch (e) {
                        console.error('Category lookup error:', e);
                    }
                } else {
                    updateData.category = parseInt(data.category);
                }
            }

            const response = await window.YakStrapi.updateProduct(productId, updateData);
            return response.data || response;
        } catch (error) {
            console.error('Update product error:', error);
            throw error;
        }
    },

    /**
     * Delete product
     */
    async deleteProduct(productId) {
        try {
            if (!window.YakStrapi) throw new Error('Strapi client not initialized');
            await window.YakStrapi.deleteProduct(productId);
            return true;
        } catch (error) {
            console.error('Delete product error:', error);
            throw error;
        }
    },

    /**
     * Get product by ID
     */
    async getProductById(productId) {
        try {
            if (!window.YakStrapi) throw new Error('Strapi client not initialized');
            const product = await window.YakStrapi.getProduct(productId);
            return product ? { id: product.id, ...product.attributes } : null;
        } catch (error) {
            console.error('Get product error:', error);
            throw error;
        }
    },

    /**
     * Get products with filters
     * By default returns only LIVE (published) products
     */
    async getProducts(filters = {}) {
        try {
            if (!window.YakStrapi) throw new Error('Strapi client not initialized');

            const params = {
                populate: '*',
                publicationState: filters.publicationState || 'live', // 'live' or 'preview'
                ...filters
            };

            // Handle special filters
            if (filters.category) {
                params['filters[category][slug][$eq]'] = filters.category;
                delete params.category;
            }
            if (filters.ownerId) {
                params['filters[owner][id][$eq]'] = filters.ownerId;
                delete params.ownerId;
            }
            if (filters.minPrice !== undefined) {
                params['filters[price][$gte]'] = filters.minPrice;
                delete params.minPrice;
            }
            if (filters.maxPrice !== undefined) {
                params['filters[price][$lte]'] = filters.maxPrice;
                delete params.maxPrice;
            }
            if (filters.location) {
                params['filters[location][$eq]'] = filters.location;
                delete params.location;
            }
            if (filters.status) {
                params['filters[status][$eq]'] = filters.status;
                delete params.status;
            }
            if (filters.limit) {
                params['pagination[limit]'] = filters.limit;
                delete params.limit;
            }

            const products = await window.YakStrapi.getProducts(params);
            return products.map(p => ({
                id: p.id,
                ...p.attributes
            }));
        } catch (error) {
            console.error('Get products error:', error);
            throw error;
        }
    },

    /**
     * Get all published products (for public viewing)
     */
    async getPublishedProducts(filters = {}) {
        return this.getProducts({ ...filters, publicationState: 'live', status: 'published' });
    },

    /**
     * Get user's own products (including drafts)
     */
    async getUserProducts(userId, includeDrafts = true) {
        const filters = { ownerId: userId };
        if (includeDrafts) {
            filters.publicationState = 'preview'; // Include drafts
        }
        return this.getProducts(filters);
    },

    /**
     * Get products by user (alias for getUserProducts)
     */
    async getProductsByUser(userId) {
        return this.getUserProducts(userId);
    },

    /**
     * Search products (only published)
     */
    async searchProducts(query, filters = {}) {
        try {
            if (!window.YakStrapi) throw new Error('Strapi client not initialized');

            const params = {
                populate: '*',
                publicationState: 'live',
                ...filters
            };

            if (query) {
                params['filters[$or][0][title][$containsi]'] = query;
                params['filters[$or][1][description][$containsi]'] = query;
            }

            return await this.getProducts(params);
        } catch (error) {
            console.error('Search products error:', error);
            throw error;
        }
    },

    /**
     * Publish product (change status to published)
     * Note: This requires moderator/admin permissions
     */
    async publishProduct(productId) {
        try {
            if (!window.YakStrapi) throw new Error('Strapi client not initialized');

            // Update status and set publishedAt
            const response = await window.YakStrapi.request(`/products/${productId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    data: {
                        status: 'published',
                        publishedAt: new Date().toISOString()
                    }
                })
            });
            return response.data || response;
        } catch (error) {
            console.error('Publish product error:', error);
            throw error;
        }
    },

    /**
     * Reject product (moderator action)
     */
    async rejectProduct(productId, reason) {
        try {
            if (!window.YakStrapi) throw new Error('Strapi client not initialized');

            const response = await window.YakStrapi.request(`/products/${productId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    data: {
                        status: 'rejected',
                        rejected_reason: reason,
                        publishedAt: null
                    }
                })
            });
            return response.data || response;
        } catch (error) {
            console.error('Reject product error:', error);
            throw error;
        }
    },

    /**
     * Increment views count
     */
    async incrementViews(productId) {
        try {
            // This would typically be done via a custom endpoint
            // For now, we'll just log it
            console.log('Increment views for product:', productId);
        } catch (error) {
            console.error('Increment views error:', error);
        }
    },

    /**
     * Sanitize input
     */
    sanitize(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/[<>]/g, '').trim();
    }
};

// Make available globally
window.ProductsAPI = ProductsAPI;
