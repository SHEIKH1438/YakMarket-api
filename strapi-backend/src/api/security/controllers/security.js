'use strict';

module.exports = {
    /**
     * Получить CSRF токен
     * Использует токен установленный мидлваром csrf.js
     */
    async getCsrfToken(ctx) {
        // Мидлвар csrf.js устанавливает токен в ctx.csrf
        const token = ctx.csrf;

        ctx.body = {
            status: 'success',
            token: token || null
        };
    }
};
