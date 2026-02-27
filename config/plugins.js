module.exports = ({ env }) => ({
  // Users & Permissions
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production'),
      register: {
        roles: ['Public'],
        default: 'Authenticated',
      },
      confirmVerification: true,
      emailConfirmation: env.bool('EMAIL_CONFIRMATION', true),
      resetPassword: {
        from: env('RESET_PASSWORD_FROM', 'noreply@yakmarket.tj'),
        replyTo: env('RESET_PASSWORD_REPLY_TO', 'support@yakmarket.tj'),
        object: 'Reset password',
        text: `
          <p>Здравствуйте!</p>
          <p>Мы получили запрос на сброс пароля для вашего аккаунта YakMarket.</p>
          <p>Нажмите на ссылку ниже, чтобы сбросить пароль:</p>
          <p><a href="<%= URL %>?resetToken=<%= TOKEN %>">Сбросить пароль</a></p>
          <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
          <p>С уважением,<br>Команда YakMarket</p>
        `,
      },
      registerVerification: {
        from: env('REGISTER_VERIFICATION_FROM', 'noreply@yakmarket.tj'),
        replyTo: env('REGISTER_VERIFICATION_REPLY_TO', 'support@yakmarket.tj'),
        object: 'Подтверждение регистрации',
        text: `
          <p>Добро пожаловать в YakMarket!</p>
          <p>Спасибо за регистрацию. Пожалуйста, подтвердите ваш email:</p>
          <p><a href="<%= URL %>?confirmation=<%= CODE %>">Подтвердить email</a></p>
          <p>С уважением,<br>Команда YakMarket</p>
        `,
      },
    },
  },

  // Email
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'smtp.gmail.com'),
        port: env.int('SMTP_PORT', 587),
        auth: {
          user: env('SMTP_USERNAME'),
          pass: env('SMTP_PASSWORD'),
        },
      },
      settings: {
        defaultFrom: env('DEFAULT_FROM', 'noreply@yakmarket.tj'),
        defaultReplyTo: env('DEFAULT_REPLY_TO', 'support@yakmarket.tj'),
      },
    },
  },

  // Cloudinary
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloudinary_url: env('CLOUDINARY_URL'),
      },
      actionOptions: {
        upload: {
          async: true,
          folder: 'yakmarket',
          tags: ['yakmarket', 'user-upload'],
          resource_type: 'auto',
          allowed_formats: ['jpg', 'png', 'gif', 'webp', 'pdf'],
          max_file_size: 10000000, // 10MB
          transformation: [
            { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' },
            { fetch_format: 'auto' }
          ],
        },
        delete: {},
      },
    },
  },

  // Documentation
  documentation: {
    config: {
      openapi: {
        info: {
          version: '1.0.0',
          title: 'YakMarket API',
          description: 'API для маркетплейса YakMarket.tj',
          contact: {
            name: 'YakMarket Support',
            email: 'support@yakmarket.tj',
          },
        },
        servers: [
          {
            url: env('PUBLIC_API_URL', 'http://localhost:1337'),
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
    },
  },

  // I18n
  i18n: {
    config: {
      defaultLocale: 'ru',
      locales: ['ru', 'tg', 'en'],
    },
  },
});
