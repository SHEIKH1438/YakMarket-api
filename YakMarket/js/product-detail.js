/**
 * YakProductDetail Module
 * Controls the product detail page logic
 */
const YakProductDetail = (function () {
    let currentProductId = null;
    let currentProduct = null;
    let currentIndex = 0;

    /**
     * Initialize page
     */
    async function init() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            currentProductId = urlParams.get('id');

            if (!currentProductId) {
                showNotFound();
                return;
            }

            // Load product data
            await loadProduct(currentProductId);

            // Initialize icons
            if (typeof lucide !== 'undefined') lucide.createIcons();

        } catch (error) {
            console.error('Initialization error:', error);
            showNotFound();
        }
    }

    /**
     * Load product from Strapi
     */
    async function loadProduct(productId) {
        try {
            if (!window.ProductsAPI) throw new Error('ProductsAPI not loaded');

            const product = await window.ProductsAPI.getProductById(productId);
            if (!product) {
                showNotFound();
                return;
            }

            currentProduct = product;
            displayProduct(product);
            renderSimilar(product.category, product.id);
            updateFavoriteStatus(product.id);

            // Increment views in localStorage
            const viewsMap = JSON.parse(localStorage.getItem('product_views') || '{}');
            viewsMap[productId] = (viewsMap[productId] || 0) + 1;
            localStorage.setItem('product_views', JSON.stringify(viewsMap));

            // Update views counter in UI if element exists
            const viewsEl = document.getElementById('pViews');
            if (viewsEl) viewsEl.innerText = viewsMap[productId];

            // Also attempt API call (non-blocking)
            if (window.ProductsAPI && window.ProductsAPI.incrementViews) {
                window.ProductsAPI.incrementViews(productId).catch(() => { });
            }

        } catch (error) {
            console.error('Load product error:', error);
            showNotFound();
        }
    }

    /**
     * Render product details to DOM
     */
    function displayProduct(product) {
        // Basic Info
        const titleEl = document.getElementById('pTitle');
        const priceEl = document.getElementById('pPrice');
        const descEl = document.getElementById('pDesc');
        const locEl = document.getElementById('pLocation');
        const catEl = document.getElementById('pCategory');
        const sellerEl = document.getElementById('pSeller');
        const dateEl = document.getElementById('pDate');

        if (titleEl) titleEl.innerText = product.title || 'Без названия';
        if (priceEl) priceEl.innerText = `${(product.price || 0).toLocaleString()} ${product.currency || 'TJS'}`;
        if (descEl) descEl.innerText = product.description || 'Нет описания';
        if (catEl) catEl.innerText = product.category || 'Общее';
        if (locEl) {
            let locText = product.location || 'YakMarket';
            if (product.locationDetails) {
                const details = [];
                if (product.locationDetails.sector) details.push(`сектор ${product.locationDetails.sector}`);
                if (product.locationDetails.row) details.push(`ряд ${product.locationDetails.row}`);
                if (product.locationDetails.shop) details.push(`№${product.locationDetails.shop}`);
                if (details.length > 0) locText += ` • ${details.join(', ')}`;
            }
            locEl.innerText = locText;
        }
        if (sellerEl) sellerEl.innerText = product.owner?.username || product.attributes?.owner?.data?.attributes?.username || 'YakMarket Seller';

        if (dateEl && product.createdAt) {
            const date = new Date(product.createdAt);
            dateEl.innerText = `Опубликовано: ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        // Images
        const images = product.images || [];
        if (images.length === 0) {
            images.push('https://via.placeholder.com/800?text=No+Image');
        }
        currentProduct.allImages = images;
        updateMainImage();
        renderThumbnails();
    }

    /**
     * Image Nav
     */
    function updateMainImage() {
        const img = document.getElementById('mainImage');
        if (img && currentProduct.allImages) {
            img.src = currentProduct.allImages[currentIndex];
        }
    }

    function renderThumbnails() {
        const container = document.getElementById('thumbnails');
        if (!container || !currentProduct.allImages || currentProduct.allImages.length <= 1) {
            if (container) container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = currentProduct.allImages.map((src, idx) => `
            <button onclick="YakProductDetail.setImage(${idx})" class="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${idx === currentIndex ? 'border-black dark:border-white' : 'border-transparent opacity-70 hover:opacity-100'}">
                <img src="${src}" class="w-full h-full object-cover" alt="" />
            </button>
        `).join('');
    }

    function setImage(idx) {
        currentIndex = idx;
        updateMainImage();
        renderThumbnails();
    }

    function nextImage() {
        if (!currentProduct.allImages) return;
        currentIndex = (currentIndex + 1) % currentProduct.allImages.length;
        setImage(currentIndex);
    }

    function prevImage() {
        if (!currentProduct.allImages) return;
        currentIndex = (currentIndex - 1 + currentProduct.allImages.length) % currentProduct.allImages.length;
        setImage(currentIndex);
    }

    /**
     * Similar Products
     */
    async function renderSimilar(category, excludeId) {
        const container = document.getElementById('similarGrid');
        if (!container) return;

        try {
            const similar = await window.ProductsAPI.getAllProducts({ category, limit: 4 });
            const filtered = similar.filter(p => p.id !== excludeId);

            if (filtered.length === 0) {
                container.closest('.mt-8')?.classList.add('hidden');
                return;
            }

            container.innerHTML = filtered.map(p => `
                <a href="product-detail.html?id=${p.id}" class="block h-full group">
                    <div class="bg-white dark:bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 flex flex-col h-full relative hover:shadow-md transition-all">
                        <div class="relative aspect-square bg-gray-100 dark:bg-black/20 overflow-hidden">
                            <img src="${(p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/300'}" class="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
                        </div>
                        <div class="p-3 flex flex-col flex-grow justify-between">
                            <div>
                                <h3 class="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 mb-1">${p.title}</h3>
                                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">${p.location || 'YakMarket'}</p>
                            </div>
                            <p class="text-sm font-black text-black dark:text-white mt-1">${(p.price || 0).toLocaleString()} c.</p>
                        </div>
                    </div>
                </a>
            `).join('');

            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (err) {
            console.error('Similar products error:', err);
        }
    }

    /**
     * Favorites
     */
    async function updateFavoriteStatus(productId) {
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        const isFav = favs.includes(productId);

        const dBtn = document.getElementById('desktopFav');
        const mBtn = document.getElementById('mobileFav');

        const heartIcon = isFav ? '<i data-lucide="heart" class="text-red-500 fill-red-500"></i>' : '<i data-lucide="heart" class=""></i>';

        if (dBtn) dBtn.innerHTML = heartIcon;
        if (mBtn) mBtn.innerHTML = heartIcon;

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function toggleFav() {
        if (!currentProductId) return;

        let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        if (favs.includes(currentProductId)) {
            favs = favs.filter(id => id !== currentProductId);
            if (window.YakToast) window.YakToast.info('Удалено из избранного');
        } else {
            favs.push(currentProductId);
            if (window.YakToast) window.YakToast.success('Добавлено в избранное');
        }

        localStorage.setItem('favorites', JSON.stringify(favs));
        updateFavoriteStatus(currentProductId);
    }

    /**
     * Interaction
     */
    function revealPhone() {
        const text = document.getElementById('phoneText');
        if (text && currentProduct) {
            text.innerText = currentProduct.phone || '900 00 00 00';
        }
    }

    function showNotFound() {
        const state = document.getElementById('empty-state');
        const content = document.getElementById('content-container');
        if (state) state.classList.remove('hidden');
        if (content) content.classList.add('hidden');
    }

    return {
        init,
        setImage,
        nextImage,
        prevImage,
        toggleFav,
        revealPhone
    };
})();

// Initialize
document.addEventListener('DOMContentLoaded', YakProductDetail.init);

// Global aliases for HTML
window.setImage = YakProductDetail.setImage;
window.nextImage = YakProductDetail.nextImage;
window.prevImage = YakProductDetail.prevImage;
window.toggleFav = YakProductDetail.toggleFav;
window.revealPhone = YakProductDetail.revealPhone;
