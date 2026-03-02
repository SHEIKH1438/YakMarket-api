/**
 * YakMarket - Add Listing Module
 * Handles product creation and image uploads via Strapi
 */

const AddListingPage = (function () {
    let uploadedPhotos = [];
    let currentLevel = 'root';
    let selection = { category: null, sub: null };

    /**
     * Initialize page
     */
    async function init() {
        try {
            // Check auth
            if (window.YakAuth && !window.YakAuth.isAuthenticated()) {
                console.warn('User not authenticated');
            }

            // Initialize counters
            initCounters();

            // Initialize Lucide
            if (typeof lucide !== 'undefined') lucide.createIcons();

            console.log('Add Listing initialized');
        } catch (error) {
            console.error('Init error:', error);
        }
    }

    function initCounters() {
        // Title counter
        const titleInput = document.getElementById('title-input');
        const titleCount = document.getElementById('title-count');
        if (titleInput && titleCount) {
            titleInput.addEventListener('input', () => {
                titleCount.textContent = `${titleInput.value.length} / 80`;
            });
        }

        // Description counter
        const descInput = document.getElementById('desc-input');
        const descCount = document.getElementById('desc-count');
        if (descInput && descCount) {
            descInput.addEventListener('input', () => {
                descCount.textContent = `${descInput.value.length} / 1000`;
            });
        }
    }

    /**
     * Handle Image Upload via Strapi
     */
    async function handlePhotoUpload(input) {
        const files = Array.from(input.files);
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

        if (uploadedPhotos.length + files.length > 15) {
            if (window.YakToast) window.YakToast.warning('Максимум 15 фотографий');
            return;
        }

        for (const file of files) {
            // Frontend validation
            if (!allowedTypes.includes(file.type)) {
                if (window.YakToast) window.YakToast.warning(`Файл ${file.name} не поддерживается. Используйте JPG, PNG или WebP.`);
                continue;
            }

            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                if (window.YakToast) window.YakToast.warning(`Файл ${file.name} слишком большой (макс. 5MB)`);
                continue;
            }

            try {
                // Show local preview immediately
                const tempId = Date.now() + Math.random();
                const reader = new FileReader();
                reader.onload = (e) => {
                    addPhotoToGrid(e.target.result, tempId, false);
                };
                reader.readAsDataURL(file);

                // Upload to Strapi
                const response = await window.YakStrapi.uploadImage(file);
                if (response && response[0]) {
                    const photoData = {
                        id: response[0].id,
                        url: response[0].url,
                        tempId: tempId
                    };
                    uploadedPhotos.push(photoData);
                    updatePhotoStatus(tempId, true, response[0].url);
                } else if (response.error) {
                    throw new Error(response.error.message || 'Ошибка сервера при загрузке');
                }
            } catch (error) {
                console.error('Photo upload error:', error);
                if (window.YakToast) window.YakToast.error(error.message || 'Ошибка загрузки фото');
                removePhoto(tempId);
            }
        }
        input.value = '';
    }

    function addPhotoToGrid(url, tempId, isUploaded) {
        const grid = document.getElementById('photo-grid');
        const uploadBtn = grid?.querySelector('label');
        if (!grid || !uploadBtn) return;

        const div = document.createElement('div');
        div.id = `photo-${tempId}`;
        div.className = 'relative aspect-square rounded-xl overflow-hidden group';
        div.innerHTML = `
            <img src="${url}" class="w-full h-full object-cover ${isUploaded ? '' : 'opacity-50'}">
            ${!isUploaded ? `
            <div class="absolute inset-0 flex items-center justify-center loading-spinner">
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
            ` : ''}
            <button type="button" onclick="AddListingPage.removePhoto('${tempId}')" class="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        `;

        // Insert before the upload button
        grid.insertBefore(div, uploadBtn);

        if (typeof lucide !== 'undefined') lucide.createIcons();
        updatePhotoCount();
    }

    function updatePhotoStatus(tempId, success, finalUrl) {
        const div = document.getElementById(`photo-${tempId}`);
        if (!div) return;

        if (success) {
            const img = div.querySelector('img');
            const spinner = div.querySelector('.loading-spinner');
            if (img) {
                img.src = finalUrl;
                img.classList.remove('opacity-50');
            }
            if (spinner) spinner.remove();

            // Add success check
            const check = document.createElement('div');
            check.className = 'absolute top-1 left-1 bg-green-500 text-white p-1 rounded-full';
            check.innerHTML = '<i data-lucide="check" class="w-2 h-2"></i>';
            div.appendChild(check);
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } else {
            div.remove();
        }
    }

    function removePhoto(tempId) {
        uploadedPhotos = uploadedPhotos.filter(p => p.tempId.toString() !== tempId.toString());
        const div = document.getElementById(`photo-${tempId}`);
        if (div) div.remove();
        updatePhotoCount();
    }

    function updatePhotoCount() {
        const countEl = document.getElementById('photo-count');
        if (countEl) countEl.innerText = `${uploadedPhotos.length} / 15`;
    }

    /**
     * Categories Modal
     */
    function openCategoryModal() {
        const modal = document.getElementById('categoryModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
        renderCategories('root');
    }

    function closeCategoryModal() {
        const modal = document.getElementById('categoryModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    function resetCategoryView() {
        if (currentLevel === 'sub') renderCategories('root');
    }

    function renderCategories(level, parentData = null) {
        const list = document.getElementById('category-list');
        const backBtn = document.getElementById('modal-back');
        const title = document.getElementById('modal-title');
        if (!list) return;

        list.innerHTML = '';
        currentLevel = level;

        if (level === 'root') {
            if (backBtn) backBtn.classList.add('hidden');
            if (title) title.innerText = 'Выберите категорию';

            // Default categories
            const categories = [
                { title: 'Электроника', icon: 'smartphone', subs: ['Телефоны', 'Ноутбуки', 'Аксессуары'] },
                { title: 'Транспорт', icon: 'car', subs: ['Автомобили', 'Мотоциклы', 'Запчасти'] },
                { title: 'Недвижимость', icon: 'home', subs: ['Квартиры', 'Дома', 'Земельные участки'] },
                { title: 'Личные вещи', icon: 'shirt', subs: ['Одежда', 'Обувь', 'Аксессуары'] },
                { title: 'Для дома', icon: 'sofa', subs: ['Мебель', 'Бытовая техника', 'Интерьер'] },
                { title: 'Услуги', icon: 'briefcase', subs: ['Ремонт', 'Обучение', 'Перевозки'] }
            ];

            categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'w-full text-left p-4 rounded-xl bg-gray-50 dark:bg-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#333] flex items-center justify-between font-medium transition-colors';
                btn.innerHTML = `
                    <div class="flex items-center gap-3">
                        <i data-lucide="${cat.icon}" class="w-5 h-5 text-gray-400"></i>
                        <span>${cat.title}</span>
                    </div>
                    <i data-lucide="chevron-right" class="w-4 h-4 text-gray-400"></i>
                `;
                btn.onclick = () => {
                    selection.category = cat.title;
                    if (cat.subs && cat.subs.length > 0) {
                        renderCategories('sub', cat.subs);
                    } else {
                        finishSelection();
                    }
                };
                list.appendChild(btn);
            });
        } else if (level === 'sub') {
            if (backBtn) backBtn.classList.remove('hidden');
            if (title) title.innerText = selection.category;

            parentData.forEach(sub => {
                const btn = document.createElement('button');
                btn.className = 'w-full text-left p-4 rounded-xl bg-gray-50 dark:bg-[#2a2a2a] hover:bg-gray-100 dark:hover:bg-[#333] font-medium transition-colors';
                btn.innerHTML = `<span>${sub}</span>`;
                btn.onclick = () => {
                    selection.sub = sub;
                    finishSelection();
                };
                list.appendChild(btn);
            });
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function finishSelection() {
        const text = [selection.category, selection.sub].filter(Boolean).join(' / ');
        const el = document.getElementById('category-text');
        if (el) {
            el.innerText = text;
            el.classList.remove('text-gray-500', 'dark:text-gray-400');
            el.classList.add('text-gray-900', 'dark:text-white');
        }
        closeCategoryModal();
    }

    /**
     * Submit Logic
     */
    async function publish() {
        const title = document.getElementById('title-input')?.value.trim();
        const price = document.getElementById('price-input')?.value.trim();
        const desc = document.getElementById('desc-input')?.value.trim();
        const location = document.getElementById('location-input')?.value;
        const categoryText = document.getElementById('category-text')?.innerText;
        const condition = document.getElementById('condition-input')?.value || 'good';
        const phone = document.getElementById('phone-input')?.value.trim();

        // Validation
        if (!title) {
            if (window.YakToast) window.YakToast.warning('Введите название товара');
            return;
        }
        if (!price || parseFloat(price) <= 0) {
            if (window.YakToast) window.YakToast.warning('Введите цену');
            return;
        }
        if (!desc || desc.length < 10) {
            if (window.YakToast) window.YakToast.warning('Введите описание (минимум 10 символов)');
            return;
        }
        if (!location) {
            if (window.YakToast) window.YakToast.warning('Выберите локацию');
            return;
        }
        if (categoryText === 'Выберите категорию' || !selection.category) {
            if (window.YakToast) window.YakToast.warning('Выберите категорию');
            return;
        }

        const publishBtn = document.getElementById('publish-btn');
        if (publishBtn) {
            publishBtn.disabled = true;
            publishBtn.innerHTML = `
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Публикация...</span>
            `;
        }

        try {
            const productData = {
                title,
                price: parseFloat(price),
                description: desc,
                location: location,
                category: selection.category,
                condition: condition,
                phone: phone || undefined,
                images: uploadedPhotos.map(p => p.id),
                status: 'pending' // Will be reviewed by moderator
            };

            const result = await window.ProductsAPI.createProduct(productData);

            if (window.YakToast) {
                window.YakToast.success('Объявление создано! Оно будет опубликовано после проверки модератором.');
            }

            // Redirect to my listings after short delay
            setTimeout(() => window.location.href = 'my-listing.html', 2000);

        } catch (error) {
            console.error('Publish error:', error);
            if (window.YakToast) {
                window.YakToast.error(error.message || 'Ошибка при публикации. Проверьте данные и попробуйте снова.');
            }
            if (publishBtn) {
                publishBtn.disabled = false;
                publishBtn.innerHTML = `
                    <span>Опубликовать</span>
                    <i data-lucide="arrow-right" class="w-5 h-5"></i>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }
    }

    return {
        init,
        handlePhotoUpload,
        removePhoto,
        openCategoryModal,
        closeCategoryModal,
        resetCategoryView,
        publish
    };
})();

// Initialize
document.addEventListener('DOMContentLoaded', AddListingPage.init);

// Global aliases for HTML
window.openCategoryModal = AddListingPage.openCategoryModal;
window.closeCategoryModal = AddListingPage.closeCategoryModal;
window.resetCategoryView = AddListingPage.resetCategoryView;
window.handlePhotoUpload = AddListingPage.handlePhotoUpload;
window.publish = AddListingPage.publish;
