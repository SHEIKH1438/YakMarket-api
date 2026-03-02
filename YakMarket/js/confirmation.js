/**
 * Confirmation Page Module for YakMarket
 * Handles user email confirmation status via Strapi
 */

const ConfirmationPage = {
    async init() {
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Wait for auth
        const checkAuth = setInterval(() => {
            if (window.YakAuth) {
                clearInterval(checkAuth);
                this.checkStatus();
            }
        }, 100);
    },

    async checkStatus() {
        try {
            const user = await window.YakAuth.getCurrentUser();
            if (!user) {
                // If not logged in, we can't check status unless we have a token in URL
                // Strapi confirmation links usually go to /auth/email-confirmation?confirmation=TOKEN
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('confirmation');

                if (token) {
                    this.confirmEmail(token);
                } else {
                    document.getElementById('loading-state')?.classList.add('hidden');
                    document.getElementById('not-logged-in-state')?.classList.remove('hidden');
                }
                return;
            }

            // In Strapi, confirmed status is on the user object
            if (user.confirmed) {
                this.showConfirmed();
            } else {
                this.showPending();
            }
        } catch (error) {
            console.error('Error checking status:', error);
        }
    },

    async confirmEmail(token) {
        try {
            // Strapi confirmation call
            await window.YakStrapi.get(`/auth/email-confirmation?confirmation=${token}`);
            this.showConfirmed();
        } catch (error) {
            console.error('Confirmation error:', error);
            this.showError('Ошибка при подтверждении. Ссылка может быть недействительной.');
        }
    },

    showConfirmed() {
        const pending = document.getElementById('pending-status');
        const confirmed = document.getElementById('confirmed-status');
        if (pending) pending.classList.add('hidden');
        if (confirmed) confirmed.classList.remove('hidden');
    },

    showPending() {
        const pending = document.getElementById('pending-status');
        const confirmed = document.getElementById('confirmed-status');
        if (pending) pending.classList.remove('hidden');
        if (confirmed) confirmed.classList.add('hidden');
    },

    showError(msg) {
        window.Toast.showError(msg);
    },

    async resendEmail() {
        try {
            const user = window.YakAuth.getCurrentUser();
            if (!user || !user.email) return;

            await window.YakStrapi.post('/auth/send-email-confirmation', {
                email: user.email
            });
            window.Toast.showSuccess('Письмо отправлено повторно');
        } catch (error) {
            console.error('Resend error:', error);
            window.Toast.showError('Ошибка при отправке');
        }
    }
};

window.ConfirmationPage = ConfirmationPage;
document.addEventListener('DOMContentLoaded', () => ConfirmationPage.init());
