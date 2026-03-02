module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_NAME'),
        api_key: env('CLOUDINARY_KEY'),
        api_secret: env('CLOUDINARY_SECRET'),
      },
      actionOptions: {
        upload: {
          // Лимит размера файла: 5MB
          maxFileSize: 5 * 1024 * 1024,
          // Разрешенные форматы
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
          resource_type: 'auto',
          access_mode: 'public',
          // Генерация адаптивных размеров
          eager: [
            { width: 150, height: 150, crop: 'thumb', fetch_format: 'auto', quality: 'auto' },
            { width: 500, crop: 'scale', fetch_format: 'auto', quality: 'auto' },
            { width: 800, crop: 'scale', fetch_format: 'auto', quality: 'auto' },
            { width: 1200, crop: 'scale', fetch_format: 'auto', quality: 'auto' },
          ],
          eager_async: true,
        },
        delete: {},
      },
    },
  },
  email: {
    config: {
      provider: 'strapi-provider-email-resend',
      providerOptions: {
        apiKey: env('RESEND_API_KEY'),
      },
      settings: {
        defaultFrom: env('EMAIL_FROM'),
        defaultReplyTo: env('EMAIL_FROM'),
      },
    },
  },
  // Google Auth is mostly configured in the Admin Panel (Settings -> Providers),
  // but we can ensure the users-permissions plugin is ready.
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET', 'yakmarket-jwt-secret-2024'),
    },
  },
});
