/**
 * YakMarket.tj - Cloudinary Configuration
 * Конфигурация для загрузки изображений в Cloudinary
 */

/**
 * Cloudinary Configuration
 * ВАЖНО: Эти значения должны соответствовать настройкам в Strapi Backend
 * Фактическая загрузка происходит через Strapi API (/upload)
 */
const CLOUDINARY_CONFIG = {
  // Замените на ваш Cloud Name из настроек Cloudinary
  cloudName: window.CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
  // Upload Preset должен быть создан в Cloudinary Dashboard
  uploadPreset: window.CLOUDINARY_UPLOAD_PRESET || 'your-upload-preset',
  folder: 'yakmarket/products'
};

// Allowed file types
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Проверка типа файла
 */
function isValidFileType(file) {
  return ALLOWED_FILE_TYPES.includes(file.type);
}

/**
 * Проверка размера файла
 */
function isValidFileSize(file) {
  return file.size <= MAX_FILE_SIZE;
}

/**
 * Загрузка изображения в Cloudinary
 */
async function uploadImage(file, options = {}) {
  try {
    // Валидация
    if (!file) {
      throw new Error('Файл не выбран');
    }

    if (!isValidFileType(file)) {
      throw new Error('Неверный формат файла. Разрешены: JPG, PNG, WEBP, GIF');
    }

    if (!isValidFileSize(file)) {
      throw new Error('Файл слишком большой. Максимальный размер: 5MB');
    }

    // Создание FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', options.folder || CLOUDINARY_CONFIG.folder);

    // Опциональные трансформации
    if (options.transformations) {
      formData.append('transformation', options.transformations);
    }

    // Загрузка
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Ошибка загрузки изображения');
    }

    const data = await response.json();

    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

/**
 * Удаление изображения из Cloudinary
 */
async function deleteImage(publicId) {
  try {
    if (!publicId) {
      throw new Error('Public ID не указан');
    }

    // Для удаления нужен API Secret, поэтому это должно быть на сервере
    // Здесь мы возвращаем URL для удаления на сервере
    const deleteUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/destroy`;

    // В реальном приложении это должно быть на сервере
    console.warn('Удаление изображений должно выполняться на сервере для безопасности');
    return { success: false, message: 'Удаление должно выполняться на сервере' };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
}

/**
 * Получение URL изображения с трансформациями
 */
function getImageUrl(publicId, options = {}) {
  const {
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto'
  } = options;

  let transformations = [];

  if (width || height) {
    transformations.push(`c_${crop}`);
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
  }

  transformations.push(`q_${quality}`);
  transformations.push(`f_${format}`);

  const transformationString = transformations.join(',');

  return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload/${transformationString}/${publicId}`;
}

/**
 * Предпросмотр изображения
 */
function previewImage(file, callback) {
  try {
    if (!file) {
      throw new Error('Файл не выбран');
    }

    if (!isValidFileType(file)) {
      throw new Error('Неверный формат файла');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      callback(e.target.result);
    };
    reader.onerror = () => {
      throw new Error('Ошибка чтения файла');
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('Image preview error:', error);
    throw error;
  }
}

/**
 * Сжатие изображения перед загрузкой
 */
async function compressImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Расчет новых размеров
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Рисование изображения
        ctx.drawImage(img, 0, 0, width, height);

        // Конвертация в Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Ошибка сжатия изображения'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Ошибка загрузки изображения'));
      };

      img.src = URL.createObjectURL(file);
    } catch (error) {
      reject(error);
    }
  });
}

// Export functions
const YakCloudinary = {
  uploadImage,
  deleteImage,
  getImageUrl,
  previewImage,
  compressImage,
  isValidFileType,
  isValidFileSize,
  config: CLOUDINARY_CONFIG
};

// Make available globally
window.YakCloudinary = YakCloudinary;
