/**
 * YakMarket.tj - Categories Page
 * Страница категорий
 */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (window.YakAuth) {
            await YakAuth.init();
        }

        // Init Realtime
        if (window.YakRealtime) {
            window.YakRealtime.init();
        }

        // Render categories from global APP_CATEGORIES
        renderSidebar();

        // Auto-select first category on desktop
        if (window.innerWidth >= 1024 && window.APP_CATEGORIES && window.APP_CATEGORIES.length > 0) {
            selectCategory(window.APP_CATEGORIES[0].id);
        } else {
            resetView();
        }

    } catch (error) {
        console.error('Categories initialization error:', error);
    }
});

/**
 * Render sidebar categories
 */
function renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav || !window.APP_CATEGORIES) return;

    nav.innerHTML = window.APP_CATEGORIES.map(cat => `
        <button onclick="selectCategory('${cat.id}')" id="btn-${cat.id}" class="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5">
            <i data-lucide="${cat.icon || 'tag'}" class="w-4 h-4"></i>
            <span class="font-semibold flex-1 truncate text-[14px] uppercase tracking-wide">${cat.title}</span>
        </button>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Handle category selection
 */
window.selectCategory = function (id) {
    const cat = window.APP_CATEGORIES.find(c => c.id === id);
    if (!cat) return;

    // Update sidebar UI
    window.APP_CATEGORIES.forEach(c => {
        const btn = document.getElementById(`btn-${c.id}`);
        if (btn) {
            if (c.id === id) {
                btn.className = 'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left bg-black text-white dark:bg-white dark:text-black shadow-md';
            } else {
                btn.className = 'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5';
            }
        }
    });

    const container = document.getElementById('content-container');
    const empty = document.getElementById('empty-state');
    if (!container || !empty) return;

    empty.classList.add('hidden');
    container.classList.remove('hidden');

    container.innerHTML = `
        <div class="mb-12 flex items-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onclick="resetView()" class="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors lg:hidden">
                <i data-lucide="arrow-left" class="w-7 h-7 text-black dark:text-white"></i>
            </button>
            <div class="p-3 bg-gray-100 dark:bg-white/10 rounded-2xl">
                <i data-lucide="${cat.icon || 'tag'}" class="w-8 h-8 text-black dark:text-white"></i>
            </div>
            <h1 class="text-3xl md:text-5xl font-[900] uppercase tracking-tighter leading-none text-black dark:text-white">${cat.title}</h1>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            ${cat.sub.map(s => `
                <div class="category-card group" onclick="window.location.href='search.html?cat=${encodeURIComponent(cat.title)}&q=${encodeURIComponent(s)}'">
                    <img src="https://images.unsplash.com/photo-1557821552-17105176677c?w=800&h=600&fit=crop" alt="${s}">
                    <div class="category-card-content">
                        <h2 class="category-card-title group-hover:scale-105 transition-transform origin-bottom-left">${s}</h2>
                        <div class="mt-4 flex items-center gap-2 text-white/50 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                            <span>Смотреть товары</span>
                            <i data-lucide="arrow-right" class="w-4 h-4"></i>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Reset view to empty state (mobile only)
 */
window.resetView = function () {
    const container = document.getElementById('content-container');
    const empty = document.getElementById('empty-state');
    if (container) container.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');

    // Reset sidebar selection
    if (window.APP_CATEGORIES) {
        window.APP_CATEGORIES.forEach(c => {
            const btn = document.getElementById(`btn-${c.id}`);
            if (btn) btn.className = 'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5';
        });
    }
}
