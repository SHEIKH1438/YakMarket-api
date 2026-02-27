module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloudinary_url: env('CLOUDINARY_URL'),
      },
    },
  },
  // Мы полностью убрали i18n, чтобы он не вешал сервер
});
