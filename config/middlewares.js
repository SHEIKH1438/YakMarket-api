module.exports = [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:', 'http:', 'wss:', 'ws:'],
          'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:', 'http:'],
          'style-src': ["'self'", "'unsafe-inline'", 'https:', 'http:'],
          'img-src': ["'self'", 'data:', 'blob:', 'res.cloudinary.com', 'https:', 'http:'],
          'media-src': ["'self'", 'res.cloudinary.com', 'https:', 'http:'],
          'upgrade-insecure-requests': null,
        },
      },
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:8081', 'https://yakmarket.tj', 'https://api.yakmarket.tj'],
        credentials: true,
        headers: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Accept'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  'global::csrf',
  'global::isOwner',
];
