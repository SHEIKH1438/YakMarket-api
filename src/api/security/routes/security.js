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
    ],
};
