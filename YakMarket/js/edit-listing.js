/**
 * Edit Listing Module for YakMarket
 * Handles product updates via Strapi
 */

const EditListing = {
    _productId: null,

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        this._productId = urlParams.get('id');

        if (!this._productId) {
            window.location.href = 'dashboard.html';
            return;
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Wait for auth & API
        const checkReady = setInterval(() => {
            if (window.YakAuth && window.ProductsAPI) {
                clearInterval(checkReady);
                this.loadListing();
            }
        }, 100);

        // Bind events
        const updateBtn = document.getElementById('submitBtn'); // Fixed ID from the template
        if (updateBtn) {
            updateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.updateListing();
            });
        }
    },

    async loadListing() {
        try {
            const product = await window.ProductsAPI.getProductById(this._productId);
            if (!product) {
                window.Toast.showError('Объявление не найдено');
                return;
            }

            // Fill form
            const attrs = product.attributes || product;
            const titleInput = document.getElementById('title');
            const priceInput = document.getElementById('price');
            const descInput = document.getElementById('description');

            if (titleInput) titleInput.value = attrs.title || '';
            if (priceInput) priceInput.value = attrs.price || '';
            if (descInput) descInput.value = attrs.description || '';

            // Handle image preview if exists
            const photo = attrs.photos?.data?.[0]?.attributes?.url || attrs.photos?.[0];
            if (photo) {
                const previewImg = document.getElementById('previewImg');
                if (previewImg) {
                    previewImg.src = photo;
                    document.getElementById('imagePreview')?.classList.remove('hidden');
                    document.getElementById('uploadPlaceholder')?.classList.add('hidden');
                }
            }

        } catch (error) {
            console.error('Error loading listing:', error);
            window.Toast.showError('Ошибка загрузки данных');
        }
    },

    async updateListing() {
        const title = document.getElementById('title').value;
        const price = document.getElementById('price').value;
        const description = document.getElementById('description').value;

        if (!title || !price) {
            window.Toast.showError('Заполните обязательные поля');
            return;
        }

        try {
            const updatedData = {
                title,
                price: parseFloat(price),
                description
            };

            const success = await window.ProductsAPI.updateProduct(this._productId, updatedData);
            if (success) {
                window.Toast.showSuccess('Объявление обновлено');
                setTimeout(() => window.location.href = 'my-listing.html', 1000);
            }
        } catch (error) {
            console.error('Update error:', error);
            window.Toast.showError('Ошибка при обновлении');
        }
    }
};

// Global access & Init
window.EditListing = EditListing;
document.addEventListener('DOMContentLoaded', () => EditListing.init());
