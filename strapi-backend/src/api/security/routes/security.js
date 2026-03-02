'use strict';

module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/csrf-token',
            handler: 'security.getCsrfToken',
            config: {
                auth: false, // Allow guests to get a token
                policies: [],
                middlewares: [],
            },
        },
        // Alias route at /api/csrf-token for frontend compatibility
        {
            method: 'GET',
            path: '/api/csrf-token',
            handler: 'security.getCsrfToken',
            config: {
                auth: false,
                policies: [],
                middlewares: [],
            },
        },
    ],
};
