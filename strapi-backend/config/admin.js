module.exports = ({ env }) => ({
    auth: {
        secret: env('ADMIN_JWT_SECRET', 'yakmarket-admin-jwt-secret-2024'),
    },
    apiToken: {
        salt: env('API_TOKEN_SALT', 'yakmarket-api-token-salt-2024'),
    },
    transfer: {
        token: {
            salt: env('TRANSFER_TOKEN_SALT', 'yakmarket-transfer-token-salt-2024'),
        },
    },
});
