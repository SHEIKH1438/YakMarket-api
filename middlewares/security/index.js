const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

module.exports = (strapi) => {
  return {
    initialize() {
      const { max = 100, duration = 15 * 60 * 1000, message = 'Too many requests' } = strapi.config.get('middleware.settings.security.rateLimit', {});
      
      // Rate limiting
      const limiter = rateLimit({
        windowMs: duration,
        max: max,
        message: {
          error: message,
          statusCode: 429,
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
          // Skip rate limiting for health checks
          return req.path === '/health' || req.path === '/_health';
        },
      });

      // Security headers
      const helmetConfig = strapi.config.get('middleware.settings.security.helmet', {
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      });

      strapi.app.use(compression());
      strapi.app.use(helmet(helmetConfig));
      strapi.app.use(limiter);
      
      // Logging
      if (process.env.NODE_ENV !== 'production') {
        strapi.app.use(morgan('dev'));
      } else {
        strapi.app.use(morgan('combined'));
      }

      // Custom security middleware
      strapi.app.use((req, res, next) => {
        // Remove server information
        res.removeHeader('X-Powered-By');
        
        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // API version
        res.setHeader('API-Version', '1.0.0');
        
        next();
      });

      // Request validation
      strapi.app.use((req, res, next) => {
        // Validate content type for POST/PUT requests
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
          const contentType = req.headers['content-type'];
          if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
            return res.status(400).json({
              error: 'Invalid content type',
              statusCode: 400,
            });
          }
        }
        
        // Validate request size
        const contentLength = req.headers['content-length'];
        if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
          return res.status(413).json({
            error: 'Request entity too large',
            statusCode: 413,
          });
        }
        
        next();
      });

      // Error handling
      strapi.app.use((err, req, res, next) => {
        strapi.log.error(err);
        
        // Don't leak error details in production
        const errorResponse = {
          error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
          statusCode: err.status || 500,
        };
        
        if (process.env.NODE_ENV !== 'production') {
          errorResponse.stack = err.stack;
        }
        
        res.status(err.status || 500).json(errorResponse);
      });
    },
  };
};
