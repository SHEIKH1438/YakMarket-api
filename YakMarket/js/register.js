/**
 * YakMarket.tj - Register Page Module
 * Модуль для обработки регистрации пользователей через Strapi
 */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize Auth
        await YakAuth.init();

        // If already authenticated, redirect to dashboard
        if (YakAuth.isAuthenticated()) {
            window.location.href = 'dashboard.html';
            return;
        }

        const registerForm = document.getElementById('register-form');
        const submitBtn = document.getElementById('submit-btn');
        const termsCheckbox = document.getElementById('terms-checkbox');
        const googleBtn = document.getElementById('google-btn');

        // Terms handling
        if (termsCheckbox && submitBtn) {
            termsCheckbox.addEventListener('change', () => {
                submitBtn.disabled = !termsCheckbox.checked;
            });
        }

        // Registration handling
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('identifier').value.trim();
            const password = document.getElementById('password').value;

            if (!termsCheckbox || !termsCheckbox.checked) {
                if (window.YakToast) {
                    YakToast.error('Примите условия использования');
                }
                return;
            }

            function setInvalid(id) {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.add('border-red-500', 'shadow-[0_0_15px_rgba(239,68,68,0.3)]');
                    el.addEventListener('input', () => {
                        el.classList.remove('border-red-500', 'shadow-[0_0_15px_rgba(239,68,68,0.3)]');
                    }, { once: true });
                }
            }

            if (!name) setInvalid('name');
            if (!email) setInvalid('identifier');
            if (!password) setInvalid('password');

            if (!name || !email || !password) {
                if (window.YakToast) {
                    YakToast.error('Заполните все поля');
                }
                return;
            }

            if (password.length < 6) {
                if (window.YakToast) {
                    YakToast.error('Пароль должен быть не менее 6 символов');
                }
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin mx-auto"></div>';

            try {
                // Strapi requires username, email, password. We use name as username and email as email.
                const response = await YakControllers.Auth.register(name, email, password);

                if (response.success) {
                    if (window.YakToast) YakToast.success('Регистрация успешна!');

                    // Notify about new registration
                    if (typeof window.onRegistration === 'function') {
                        try {
                            await window.onRegistration(name, email, password);
                        } catch (e) {
                            console.warn('Notification failed:', e);
                        }
                    }

                    setTimeout(() => {
                        window.location.href = 'confirmation.html';
                    }, 1500);
                }
            } catch (error) {
                console.error('Registration error:', error);
                if (window.YakToast) {
                    YakToast.error(error.message || 'Ошибка регистрации');
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Зарегистрироваться';
            }
        });

        // Google Registration
        googleBtn?.addEventListener('click', async () => {
            googleBtn.disabled = true;
            googleBtn.innerHTML = '<div class="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>';

            try {
                await YakControllers.Auth.loginWithGoogle();
                if (window.YakToast) YakToast.success('Перенаправление в Google...');
            } catch (error) {
                console.error('Google login error:', error);
                if (window.YakToast) YakToast.error('Ошибка входа через Google');
                googleBtn.disabled = false;
                googleBtn.innerHTML = `
                    <svg class="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                `;
            }
        });

    } catch (error) {
        console.error('Initialization error:', error);
        if (window.YakToast) YakToast.initError('Ошибка инициализации приложения. Проверьте подключение к серверу.');
    }
});
