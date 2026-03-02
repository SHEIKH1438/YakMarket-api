/**
 * YakMarket Toast Notification System
 * Smart notifications with animations, auto-dismiss, and chat integration
 * 
 * Features:
 * - Large error toast (6cm x 4cm size for initialization errors)
 * - White background with proper styling
 * - 5 second auto-dismiss with slide right animation
 * - Close button (X)
 * - Positioned at top-right with barrier
 * - Chat notifications with "YakMarket Administration" header
 * - Generic error messages (no Firebase reminders)
 */

// Toast container - check if already exists to avoid redeclaration
let toastContainer = typeof window.toastContainer !== 'undefined' ? window.toastContainer : null;
let notificationTimeout = null;
const MAX_TOASTS = 3; // Barrier - max 3 toasts at once
const TOAST_BARRIER_TOP = 100; // px from top - prevents going to bottom
const TOAST_CONTAINER_ID = 'toast-container'; // ID for container reference

// Initialize toast container
function initToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        // Fixed positioning at top right with barrier
        toastContainer.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none max-h-[calc(100vh-120px)] overflow-hidden';
        document.body.appendChild(toastContainer);
    }
}

// Toast types
const ToastType = {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info',
    WARNING: 'warning',
    CHAT: 'chat',
    FAVORITES: 'favorites'
};

// Toast icons with large icons
const ToastIcons = {
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    warning: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    chat: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    favorites: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
};

// Toast colors - white background option added
const ToastColors = {
    success: { bg: 'bg-green-500', text: 'text-white', iconBg: 'bg-green-600' },
    error: { bg: 'bg-white dark:bg-[#2a2a2a]', text: 'text-gray-900 dark:text-white', iconBg: 'bg-red-500', border: 'border border-gray-200 dark:border-gray-700' },
    info: { bg: 'bg-blue-500', text: 'text-white', iconBg: 'bg-blue-600' },
    warning: { bg: 'bg-yellow-500', text: 'text-white', iconBg: 'bg-yellow-600' },
    chat: { bg: 'bg-black dark:bg-white', text: 'text-white dark:text-black', iconBg: 'bg-gray-800 dark:bg-gray-200' },
    favorites: { bg: 'bg-pink-500', text: 'text-white', iconBg: 'bg-pink-600' }
};

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Toast type (success, error, info, warning, chat, favorites)
 * @param {number} duration - Duration in milliseconds (default: 5000)
 * @param {string} title - Optional title for the toast
 * @param {boolean} isLarge - If true, shows larger toast for error messages
 */
function showToast(message, type = ToastType.INFO, duration = 5000, title = null, isLarge = false) {
    initToastContainer();

    const colors = ToastColors[type] || ToastColors.info;
    const icon = ToastIcons[type] || ToastIcons.info;

    // Truncate message
    const maxChars = isLarge ? 80 : 60;
    const truncatedMessage = message && message.length > maxChars ? message.substring(0, maxChars) + '...' : (message || '');

    const toast = document.createElement('div');
    // Reduced size (1.5x smaller than previous ~300px)
    const width = isLarge ? '210px' : '190px';
    const minHeight = isLarge ? '80px' : '60px';

    toast.className = `toast-notification pointer-events-auto flex items-start gap-2.5 ${colors.bg} ${colors.text} px-3 py-2.5 rounded-xl shadow-xl transform translate-x-full opacity-0 transition-all duration-300 ease-out ${colors.border || ''} relative overflow-hidden`;
    toast.style.width = width;
    toast.style.minHeight = minHeight;

    const titleHtml = title ? `<div class="font-bold text-sm mb-0.5">${title}</div>` : '';

    toast.innerHTML = `
        <!-- Progress bar - Right to Left -->
        <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div class="toast-progress h-full bg-white dark:bg-gray-300 absolute right-0" style="width: 100%; transition: width ${duration}ms linear;"></div>
        </div>
        <div class="flex-shrink-0 ${colors.iconBg} rounded-lg p-1 text-white">${icon}</div>
        <div class="flex-1 min-w-0 pt-0">
            ${titleHtml}
            <div class="text-[10px] leading-tight break-words opacity-90">${truncatedMessage}</div>
        </div>
        <button class="flex-shrink-0 hover:opacity-70 transition-opacity p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5" onclick="dismissToast(this)" title="Закрыть">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;

    // Clear any existing notification timeout
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
        // Start progress bar animation (RTL)
        setTimeout(() => {
            const progressBar = toast.querySelector('.toast-progress');
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        }, 50);
    });

    // Limit barrier: max 3 notifications
    const container = document.getElementById(TOAST_CONTAINER_ID);
    const activeToasts = container.querySelectorAll('.toast-notification');
    if (activeToasts.length > 3) {
        // Force remove oldest toasts immediately without animation
        for (let i = 0; i < activeToasts.length - 3; i++) {
            const oldest = activeToasts[i];
            if (oldest.dataset.timeoutId) clearTimeout(parseInt(oldest.dataset.timeoutId));
            oldest.remove();
        }
    }

    // Auto dismiss each toast independently
    const timeoutId = setTimeout(() => {
        dismissToast(toast.querySelector('button'));
    }, duration);

    // Store timeout ID for manual dismissal cleanup
    toast.dataset.timeoutId = timeoutId;
}

/**
 * Dismiss a toast notification with slide right animation
 * @param {HTMLElement} button - The close button element
 */
function dismissToast(button) {
    const toast = button ? button.closest('.toast-notification') : null;
    if (!toast) return;

    // Clear timeout if exists
    if (toast.dataset.timeoutId) {
        clearTimeout(parseInt(toast.dataset.timeoutId));
    }

    // Animate out - slide right
    toast.classList.add('translate-x-full', 'opacity-0');

    // Remove from DOM after animation
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 300);
}

/**
 * Show success toast
 */
function showSuccessToast(message, duration = 5000) {
    showToast(message, ToastType.SUCCESS, duration, 'Успешно');
}

/**
 * Show error toast with generic message (no Firebase specifics)
 * Uses large white toast (6cm x 4cm) for important errors like initialization
 */
function showErrorToast(message, duration = 5000) {
    let displayMessage = message;
    if (message === 'Failed to fetch') {
        displayMessage = 'Сервер недоступен. Проверьте подключение или запустите локальный бэкенд.';
    }
    showToast(displayMessage, ToastType.ERROR, duration, 'Ошибка', true);
}

/**
 * Show initialization error toast - extra large and persistent
 * Specifically for "Ошибка инициализации приложения"
 */
function showInitErrorToast(message = 'Ошибка инициализации приложения', duration = 6000) {
    initToastContainer();

    const colors = ToastColors.error;
    const icon = ToastIcons.error;

    // Large 6cm x 4cm size (approximately 227px x 151px at 96 DPI)
    const width = '6cm';
    const minHeight = '4cm';

    const toast = document.createElement('div');
    toast.className = `toast-notification pointer-events-auto flex items-start gap-3 ${colors.bg} ${colors.text} px-5 py-4 rounded-2xl shadow-2xl transform translate-x-full opacity-0 transition-all duration-500 ease-out ${colors.border || ''} relative overflow-hidden border-2 border-gray-200 dark:border-gray-700`;
    toast.style.width = width;
    toast.style.minHeight = minHeight;
    toast.style.maxWidth = '6cm';

    toast.innerHTML = `
        <!-- Progress bar - Right to Left -->
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div class="toast-progress h-full bg-red-500 absolute right-0" style="width: 100%; transition: width ${duration}ms linear;"></div>
        </div>
        <div class="flex-shrink-0 ${colors.iconBg} rounded-xl p-2 text-white">${icon}</div>
        <div class="flex-1 min-w-0 pt-1">
            <div class="font-bold text-base mb-2">Ошибка инициализации</div>
            <div class="text-sm leading-relaxed break-words opacity-90">${message}</div>
        </div>
        <button class="flex-shrink-0 hover:opacity-70 transition-opacity p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10" onclick="dismissToast(this)" title="Закрыть">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;

    // Clear any existing notification timeout
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    toastContainer.appendChild(toast);

    // Animate in with smooth slide
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
        // Start progress bar animation (RTL)
        setTimeout(() => {
            const progressBar = toast.querySelector('.toast-progress');
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        }, 100);
    });

    // Auto dismiss after duration
    const timeoutId = setTimeout(() => {
        dismissToast(toast.querySelector('button'));
    }, duration);

    toast.dataset.timeoutId = timeoutId;

    return toast;
}

/**
 * Show info toast
 */
function showInfoToast(message, duration = 5000) {
    showToast(message, ToastType.INFO, duration);
}

/**
 * Show warning toast
 */
function showWarningToast(message, duration = 5000) {
    showToast(message, ToastType.WARNING, duration, 'Внимание');
}

/**
 * Show chat notification toast
 * @param {string} sender - Sender name (shows "YakMarket Administration")
 * @param {string} message - Message content
 * @param {number} duration - Duration in milliseconds (default: 5000)
 */
function showChatNotification(sender, message, duration = 5000) {
    initToastContainer();

    const colors = ToastColors.chat;
    const icon = ToastIcons.chat;

    // Truncate message to fit in toast area
    const truncatedMessage = message && message.length > 80 ? message.substring(0, 80) + '...' : (message || '');

    const toast = document.createElement('div');
    toast.className = `toast-notification pointer-events-auto flex items-center gap-4 ${colors.bg} ${colors.text} px-5 py-4 rounded-2xl shadow-2xl transform translate-x-full opacity-0 transition-all duration-300 ease-out cursor-pointer hover:scale-[1.02] transition-transform relative overflow-hidden`;
    toast.style.minWidth = '302px';
    toast.style.maxWidth = '340px';
    toast.style.minHeight = '80px';

    toast.innerHTML = `
        <!-- Progress bar -->
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div class="toast-progress h-full bg-white" style="width: 100%; transition: width ${duration}ms linear;"></div>
        </div>
        <div class="flex-shrink-0 ${colors.iconBg} rounded-xl p-2.5">${icon}</div>
        <div class="flex-1 min-w-0">
            <div class="font-bold text-base mb-1">${sender}</div>
            <div class="text-sm leading-relaxed break-words">${truncatedMessage}</div>
        </div>
        <button class="flex-shrink-0 hover:opacity-70 transition-opacity p-1.5 rounded-lg hover:bg-white/20" onclick="event.stopPropagation(); dismissToast(this)" title="Закрыть">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;

    // Clear any existing notification timeout
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
        // Start progress bar animation
        setTimeout(() => {
            const progressBar = toast.querySelector('.toast-progress');
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        }, 50);
    });

    // Auto dismiss after duration
    notificationTimeout = setTimeout(() => {
        dismissToast(toast.querySelector('button'));
    }, duration);

    toast.dataset.timeoutId = notificationTimeout;

    // Click to navigate to chat
    toast.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
            window.location.href = 'chat.html';
        }
    });
}

/**
 * Show favorites notification toast
 * @param {string} message - Message content
 * @param {boolean} isAdded - true if added, false if removed
 */
function showFavoritesNotification(message, isAdded = true) {
    initToastContainer();

    const colors = ToastColors.favorites;
    const icon = isAdded ?
        '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' :
        '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

    const truncatedMessage = message && message.length > 80 ? message.substring(0, 80) + '...' : (message || '');

    const toast = document.createElement('div');
    toast.className = `toast-notification pointer-events-auto flex items-center gap-4 ${colors.bg} ${colors.text} px-5 py-4 rounded-2xl shadow-2xl transform translate-x-full opacity-0 transition-all duration-300 ease-out relative overflow-hidden`;
    toast.style.minWidth = '302px';
    toast.style.maxWidth = '340px';
    toast.style.minHeight = '80px';

    const title = isAdded ? 'Добавлено в избранное' : 'Удалено из избранного';

    toast.innerHTML = `
        <!-- Progress bar -->
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div class="toast-progress h-full bg-white" style="width: 100%; transition: width 5000ms linear;"></div>
        </div>
        <div class="flex-shrink-0 ${colors.iconBg} rounded-xl p-2.5">${icon}</div>
        <div class="flex-1 min-w-0">
            <div class="font-bold text-base mb-1">${title}</div>
            <div class="text-sm leading-relaxed break-words">${truncatedMessage}</div>
        </div>
        <button class="flex-shrink-0 hover:opacity-70 transition-opacity p-1.5 rounded-lg hover:bg-white/20" onclick="dismissToast(this)" title="Закрыть">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;

    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
        // Start progress bar animation
        setTimeout(() => {
            const progressBar = toast.querySelector('.toast-progress');
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        }, 50);
    });

    notificationTimeout = setTimeout(() => {
        dismissToast(toast.querySelector('button'));
    }, 5000);

    toast.dataset.timeoutId = notificationTimeout;
}

/**
 * Clear all toasts
 */
function clearAllToasts() {
    if (toastContainer) {
        const toasts = toastContainer.querySelectorAll('.toast-notification');
        toasts.forEach(toast => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        });
    }
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
}

// Global function for onclick handlers
window.dismissToast = dismissToast;

// Make available globally
window.YakToast = {
    success: showSuccessToast,
    error: showErrorToast,
    initError: showInitErrorToast,
    info: showInfoToast,
    warning: showWarningToast,
    show: showToast,
    chat: showChatNotification,
    favorites: showFavoritesNotification,
    dismiss: dismissToast,
    clear: clearAllToasts
};

console.log('toast-notifications.js loaded');
