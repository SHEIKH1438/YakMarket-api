/**
 * YakMarket.tj - Settings Page Initialization
 * Инициализация страницы настроек
 */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Инициализируем Firebase
        if (window.YakFirebase) {
            await YakFirebase.init();
        }

        // Инициализируем Auth
        if (window.YakAuth) {
            await YakAuth.init();
        }

        // Проверяем авторизацию
        if (!YakAuth.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        // Инициализируем настройки
        if (window.YakSettings) {
            await YakSettings.init();
        }

        // Обработчик выхода
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await YakAuth.logout();
                } catch (error) {
                    console.error('Logout error:', error);
                    if (window.YakToast) {
                        YakToast.error('Ошибка выхода');
                    }
                }
            });
        }

        console.log('Settings page initialized successfully');
    } catch (error) {
        console.error('Settings page initialization error:', error);
        if (window.YakToast) {
            YakToast.error('Ошибка инициализации страницы');
        }
    }
});