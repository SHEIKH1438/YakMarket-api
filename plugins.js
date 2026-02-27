module.exports = ({ env }) => ({
  'users-permissions': {
    config: {
      jwtSecret: env('ADMIN_JWT_SECRET'),
      register: {
        roles: ['Public'],
        default: 'Authenticated',
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
        upload: {},
        delete: {},
      },
    },
  },

  // I18n - ТУТ БЫЛА ОШИБКА, ИСПРАВИЛ
  i18n: {
    enabled: true,
    config: {
      defaultLocale: 'ru',
      locales: ['ru', 'tg', 'en'],
    },
  },
});
