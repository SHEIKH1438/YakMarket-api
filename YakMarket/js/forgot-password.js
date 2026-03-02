/**
 * Forgot Password Module for YakMarket
 * Handles password reset requests via Strapi
 */

const ForgotPassword = {
    async init() {
        if (typeof lucide !== 'undefined') lucide.createIcons();

        const form = document.getElementById('forgotPasswordForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendResetLink();
            });
        }
    },

    async sendResetLink() {
        const emailInput = document.getElementById('email');
        const submitBtn = document.getElementById('submitBtn');

        if (!emailInput || !emailInput.value) {
            window.Toast.showError('Введите email');
            return;
        }

        const email = emailInput.value.trim();

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Отправка...';

            // Strapi forgot password call
            await window.YakStrapi.post('/auth/forgot-password', {
                email: email
            });

            window.Toast.showSuccess('Ссылка для сброса пароля отправлена на ваш email');

            if (emailInput) emailInput.value = '';

            // Optionally redirect
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);

        } catch (error) {
            console.error('Forgot password error:', error);
            window.Toast.showError('Ошибка при отправке. Проверьте правильность email.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить ссылку';
        }
    }
};

window.ForgotPassword = ForgotPassword;
document.addEventListener('DOMContentLoaded', () => ForgotPassword.init());