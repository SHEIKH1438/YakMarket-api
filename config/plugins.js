module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloudinary_url: env('CLOUDINARY_URL'),
      },
    },
  },
});
