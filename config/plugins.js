module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_NAME', 'dgdpxe2fq'),
        api_key: env('CLOUDINARY_KEY', 'axJ_0xQcmr4kPrXinuVJ2REhs3o'),
        api_secret: env('CLOUDINARY_SECRET', '437375988755669'),
      },
      actionOptions: {
        upload: {
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
          resource_type: 'image',
          access_mode: 'public',
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
