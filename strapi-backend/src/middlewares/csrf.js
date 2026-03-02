'use strict';

/**
 * CSRF Protection Middleware for Strapi 4 (Koa)
 * Implements Double Submit Cookie pattern for simplicity and security.
 */

const crypto = require('crypto');

module.exports = (config, { strapi }) => {
    return async (ctx, next) => {
        // 1. Generate token if not exists in cookie
        let csrfToken = ctx.cookies.get('yak_csrf_token');

        // Generate new token for each request if not exists
        if (!csrfToken) {
            csrfToken = crypto.randomBytes(32).toString('hex');
            ctx.cookies.set('yak_csrf_token', csrfToken, {
                httpOnly: false, // Must be readable by frontend to send in header
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
        }

        // Attach to context for the controller to return
        ctx.csrf = csrfToken;

        // 2. Verify token for state-changing requests
        const insecureMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
        if (insecureMethods.includes(ctx.method)) {
            // Skip for public routes that don't need auth
            const publicRoutes = ['/csrf-token', '/auth/local', '/auth/register', '/auth/forgot-password'];
            const isPublicRoute = publicRoutes.some(route => ctx.path.startsWith(route));

            if (!isPublicRoute) {
                const headerToken = ctx.get('x-csrf-token');

                if (!headerToken) {
                    strapi.log.warn(`CSRF validation failed: No token provided for ${ctx.path}`);
                    ctx.status = 403;
                    ctx.body = {
                        status: 'fail',
                        error_type: 'UI_TOAST',
                        message: 'Безопасность: CSRF токен обязателен. Пожалуйста, обновите страницу.',
                        code: 'CSRF_TOKEN_MISSING',
                    };
                    return;
                }

                if (headerToken !== csrfToken) {
                    strapi.log.warn(`CSRF validation failed for ${ctx.path}`);
                    ctx.status = 403;
                    ctx.body = {
                        status: 'fail',
                        error_type: 'UI_TOAST',
                        message: 'Безопасность: Недействительный CSRF токен. Пожалуйста, обновите страницу.',
                        code: 'INVALID_CSRF_TOKEN',
                    };
                    return;
                }
            }
        }

        await next();
    };
};
