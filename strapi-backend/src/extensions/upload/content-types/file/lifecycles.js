module.exports = {
    beforeCreate(event) {
        const { data } = event.params;

        // Allowed mime types: images + PDF
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/svg+xml',
            'application/pdf',
        ];

        // Allowed extensions
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.pdf'];

        // Max file size: 5MB
        const maxFileSize = 5 * 1024 * 1024;

        // Validate mime type
        if (data.mime && !allowedMimeTypes.includes(data.mime)) {
            throw new Error(
                `File type "${data.mime}" is not allowed. ` +
                `Allowed types: JPEG, PNG, WebP, SVG, PDF.`
            );
        }

        // Validate extension
        if (data.ext && !allowedExtensions.includes(data.ext.toLowerCase())) {
            throw new Error(
                `File extension "${data.ext}" is not allowed. ` +
                `Allowed extensions: .jpg, .png, .webp, .svg, .pdf`
            );
        }

        // Validate file size
        if (data.size && data.size > maxFileSize) {
            throw new Error(
                `File size exceeds the limit of 5MB. ` +
                `Your file: ${(data.size / 1024 / 1024).toFixed(2)}MB`
            );
        }
    },
};
