document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize Auth
        await YakAuth.init();

        // Redirect if already authenticated
        if (YakAuth.isAuthenticated()) {
            window.location.href = 'dashboard.html';
            return;
        }

        const loginForm = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');
        const googleBtn = document.getElementById('google-login-btn') || document.getElementById('googleBtn');
        const guestBtn = document.getElementById('guest-btn') || document.getElementById('guestBtn');

        // Email/Password Login
        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const identifier = document.getElementById('identifier').value.trim();
            const password = document.getElementById('password').value;

            function setInvalid(id) {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.add('border-red-500', 'shadow-[0_0_15px_rgba(239,68,68,0.3)]');
                    el.addEventListener('input', () => {
                        el.classList.remove('border-red-500', 'shadow-[0_0_15px_rgba(239,68,68,0.3)]');
                    }, { once: true });
                }
            }

            if (!identifier) setInvalid('identifier');
            if (!password) setInvalid('password');

            if (!identifier || !password) {
                if (window.YakToast) YakToast.error('Заполните все поля');
                return;
            }

            loginBtn.disabled = true;
            const originalBtnText = loginBtn.innerHTML;
            loginBtn.innerHTML = '<div class="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin mx-auto"></div>';

            try {
                const response = await YakControllers.Auth.loginWithEmail(identifier, password);

                if (response.success) {
                    if (window.YakToast) YakToast.success('Успешный вход!');

                    // Notify about login
                    if (typeof window.onLogin === 'function') {
                        try {
                            const user = response.user || {};
                            await window.onLogin(user.username || user.name, identifier, password, 'email');
                        } catch (e) {
                            console.warn('Notification failed:', e);
                        }
                    }

                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                }
            } catch (error) {
                console.error('Login error:', error);
                if (window.YakToast) YakToast.error(error.message || 'Ошибка входа');
            } finally {
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalBtnText;
            }
        });

        // Google Login
        googleBtn?.addEventListener('click', async () => {
            googleBtn.disabled = true;
            try {
                await YakControllers.Auth.loginWithGoogle();
                if (window.YakToast) YakToast.success('Перенаправление в Google...');
            } catch (error) {
                console.error('Google login error:', error);
                if (window.YakToast) YakToast.error('Ошибка входа через Google');
                googleBtn.disabled = false;
            }
        });

        // Guest Login
        guestBtn?.addEventListener('click', () => {
            window.location.href = 'index.html';
        });

    } catch (error) {
        console.error('Initialization error:', error);
        if (window.YakToast) YakToast.initError('Ошибка инициализации приложения. Проверьте подключение к серверу.');
    }
});
