/**
 * YakMarket.tj - Strapi Authentication Module
 * Модуль авторизации через Strapi
 */

const YakAuth = {
    currentUser: JSON.parse(localStorage.getItem('yak_user')) || null,
    jwt: localStorage.getItem('yak_auth_token') || null,

    /**
     * Инициализация
     */
    async init() {
        console.log('YakAuth: Initialized with Strapi');
        if (this.jwt && window.YakStrapi) {
            window.YakStrapi.setApiToken(this.jwt);
        }
        return true;
    },

    /**
     * Получить текущего пользователя
     */
    getCurrentUser() {
        return this.currentUser;
    },

    /**
     * Получить ID пользователя
     */
    getCurrentUserId() {
        return this.currentUser ? (this.currentUser.id || this.currentUser.ID) : null;
    },

    /**
     * Проверить авторизован ли
     */
    isAuthenticated() {
        return !!this.jwt;
    },

    /**
     * Войти с email/password
     */
    async loginWithEmail(identifier, password) {
        try {
            const data = await window.YakStrapi.request('/auth/local', {
                method: 'POST',
                body: JSON.stringify({ identifier, password })
            });

            if (data.jwt) {
                this.saveSession(data.jwt, data.user);
                return data;
            }
            throw new Error('Invalid login response');
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    /**
     * Update all avatar elements in the UI
     */
    updateAvatarUI(url) {
        const avatarIds = ['userAvatarSettings', 'userAvatarHeader', 'header-user-avatar', 'header-user-avatar-mobile'];
        const iconIds = ['header-user-icon', 'header-user-icon-mobile', 'header-user-icon-desktop'];

        avatarIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.src = url || 'https://via.placeholder.com/150';
                el.classList.remove('hidden');
            }
        });

        // Hide icons if avatar exists
        if (url) {
            iconIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
        }
    },

    /**
     * Зарегистрироваться
     */
    async registerWithEmail(username, email, password) {
        try {
            const data = await window.YakStrapi.request('/auth/local/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password })
            });

            if (data.jwt) {
                this.saveSession(data.jwt, data.user);
                return data;
            }
            throw new Error('Invalid registration response');
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    /**
     * Вход через Google (Strapi Provider)
     */
    loginWithGoogle() {
        const baseUrl = window.YakStrapi.baseUrl.replace('/api', '');
        window.location.href = `${baseUrl}/api/connect/google`;
    },

    /**
     * Phone Auth Stub
     */
    async requestPhoneCode(phoneNumber) {
        console.log(`Phone Auth: Requesting code for ${phoneNumber}`);
        // В будущем здесь будет вызов SMS-шлюза через Strapi Custom Controller
        return { status: 'success', message: 'SMS sent (stub)' };
    },

    async verifyPhoneCode(phoneNumber, code) {
        console.log(`Phone Auth: Verifying code ${code} for ${phoneNumber}`);
        // Заглушка: любой код 123456 считается верным
        if (code === '123456') {
            return { status: 'success' };
        }
        throw new Error('Неверный код подтверждения');
    },

    /**
     * Вход как гость (очистка сессии)
     */
    loginAsGuest() {
        this.logout();
    },

    /**
     * Сохранить сессию
     */
    saveSession(jwt, user) {
        this.jwt = jwt;
        this.currentUser = user;
        localStorage.setItem('yak_auth_token', jwt);
        localStorage.setItem('yak_user', JSON.stringify(user));
        if (window.YakStrapi) {
            window.YakStrapi.setApiToken(jwt);
        }
    },

    /**
     * Выйти
     */
    logout() {
        this.jwt = null;
        this.currentUser = null;
        localStorage.removeItem('yak_auth_token');
        localStorage.removeItem('yak_user');
        if (window.YakStrapi) {
            window.YakStrapi.clearApiToken();
        }
    }
};

// Сделать глобальным
window.YakAuth = YakAuth;
