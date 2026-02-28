module.exports = ({ env }) => ({
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
  // ... твои остальные плагины (cloudinary и т.д.)
});
