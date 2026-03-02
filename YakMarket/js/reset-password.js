/**
 * Reset Password Module for YakMarket
 * Handles password reset via Strapi
 */

const ResetPassword = {
    _token: null,

    async init() {
        if (typeof lucide !== 'undefined') lucide.createIcons();

        const urlParams = new URLSearchParams(window.location.search);
        this._token = urlParams.get('code'); // Strapi usually uses 'code' in the link

        if (!this._token) {
            window.Toast.showError('Некорректная ссылка для сброса пароля');
            setTimeout(() => window.location.href = 'login.html', 2000);
            return;
        }

        const form = document.getElementById('resetPasswordForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.resetPassword();
            });
        }
    },

    async resetPassword() {
        const passwordInput = document.getElementById('password');
        const confirmInput = document.getElementById('confirmPassword');
        const submitBtn = document.getElementById('submitBtn');

        const password = passwordInput?.value;
        const confirm = confirmInput?.value;

        if (!password || password.length < 8) {
            window.Toast.showError('Пароль должен быть не менее 8 символов');
            return;
        }

        if (password !== confirm) {
            window.Toast.showError('Пароли не совпадают');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Сброс...';

            // Strapi reset password call
            await window.YakStrapi.post('/auth/reset-password', {
                code: this._token,
                password: password,
                passwordConfirmation: confirm
            });

            window.Toast.showSuccess('Пароль успешно изменен');

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } catch (error) {
            console.error('Reset password error:', error);
            window.Toast.showError('Ошибка при сбросе пароля. Ссылка может быть просрочена.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Сбросить пароль';
        }
    }
};

window.ResetPassword = ResetPassword;
document.addEventListener('DOMContentLoaded', () => ResetPassword.init());