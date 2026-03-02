/**
 * File Uploader Component для YakMarket
 * Загрузка файлов в Cloudinary с прогресс баром и превью
 */

import { notifications } from './notifications.js';

// Cloudinary Uploader
const cloudinaryUploader = {
    createPreview: (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    },
    uploadFile: async (file, options = {}) => {
        // Используем конфиг из add-listing.html или дефолтный
        // Use placeholders for security
        const cloudName = 'your-cloud-name';
        const uploadPreset = 'your-upload-preset';

        const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        if (options.folder) {
            formData.append('folder', options.folder);
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                public_id: data.public_id,
                url: data.secure_url,
                size: data.bytes
            };
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            return { success: false, error: error.message };
        }
    },
    getTransformedUrl: (publicId, transformation) => {
        const cloudName = 'your-cloud-name';

        if (!publicId) return '';
        if (publicId.startsWith('http')) return publicId;

        let transformStr = '';
        if (transformation === 'thumbnail') {
            transformStr = 'c_thumb,w_200,h_200,g_face/';
        }

        return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}${publicId}`;
    }
};

class FileUploader {
    constructor(options = {}) {
        this.options = {
            multiple: false,
            maxFiles: 5,
            acceptedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            maxSize: 10 * 1024 * 1024, // 10MB
            folder: 'yakmarket',
            ...options
        };

        this.files = [];
        this.uploadedFiles = [];
        this.container = null;
    }

    // Создать HTML элемент загрузчика
    createUploader(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        this.container = container;

        container.innerHTML = `
            <div class="file-uploader">
                <!-- Drop Zone -->
                <div class="drop-zone border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-all hover:border-blue-400 hover:bg-blue-50/50" 
                     ondrop="handleDrop(event)" 
                     ondragover="handleDragOver(event)" 
                     ondragleave="handleDragLeave(event)">
                    <div class="upload-icon mb-4">
                        <svg class="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" x2="12" y1="3" y2="15"/>
                        </svg>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-700 mb-2">Загрузите изображения</h3>
                    <p class="text-gray-500 mb-4">Перетащите файлы сюда или нажмите для выбора</p>
                    <button type="button" class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors" onclick="triggerFileSelect()">
                        Выбрать файлы
                    </button>
                    <input type="file" class="hidden" id="file-input" ${this.options.multiple ? 'multiple' : ''} accept="${this.options.acceptedTypes.join(',')}">
                    <p class="text-xs text-gray-400 mt-3">
                        Максимум ${this.options.maxFiles} файлов, до ${Math.round(this.options.maxSize / 1024 / 1024)}MB каждый
                    </p>
                </div>

                <!-- Preview Area -->
                <div class="preview-area mt-6 hidden">
                    <h4 class="text-sm font-semibold text-gray-700 mb-3">Выбранные файлы:</h4>
                    <div class="preview-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"></div>
                </div>

                <!-- Upload Button -->
                <div class="upload-actions mt-6 hidden">
                    <div class="flex gap-3">
                        <button type="button" class="flex-1 bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onclick="startUpload()" id="upload-btn">
                            Загрузить файлы
                        </button>
                        <button type="button" class="bg-gray-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-colors" onclick="clearFiles()">
                            Очистить
                        </button>
                    </div>
                </div>

                <!-- Results Area -->
                <div class="results-area mt-6 hidden">
                    <h4 class="text-sm font-semibold text-gray-700 mb-3">Загруженные файлы:</h4>
                    <div class="results-grid space-y-2"></div>
                </div>
            </div>
        `;

        this.setupEventListeners();
        return this;
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        const fileInput = this.container.querySelector('#file-input');
        const dropZone = this.container.querySelector('.drop-zone');

        // Глобальные функции для HTML
        window.handleDrop = (e) => this.handleDrop(e);
        window.handleDragOver = (e) => this.handleDragOver(e);
        window.handleDragLeave = (e) => this.handleDragLeave(e);
        window.triggerFileSelect = () => fileInput.click();
        window.startUpload = () => this.uploadFiles();
        window.clearFiles = () => this.clearFiles();
        window.removeFile = (index) => this.removeFile(index);

        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
    }

    // Обработка drag & drop
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        const dropZone = this.container.querySelector('.drop-zone');
        dropZone.classList.add('border-blue-400', 'bg-blue-50');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        const dropZone = this.container.querySelector('.drop-zone');
        dropZone.classList.remove('border-blue-400', 'bg-blue-50');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        const dropZone = this.container.querySelector('.drop-zone');
        dropZone.classList.remove('border-blue-400', 'bg-blue-50');

        const files = e.dataTransfer.files;
        this.handleFiles(files);
    }

    // Обработка выбранных файлов
    handleFiles(fileList) {
        const files = Array.from(fileList);

        // Проверка количества файлов
        if (this.files.length + files.length > this.options.maxFiles) {
            notifications.warning(`Максимум ${this.options.maxFiles} файлов`);
            return;
        }

        // Валидация и добавление файлов
        files.forEach(file => {
            if (this.validateFile(file)) {
                this.files.push(file);
            }
        });

        this.updatePreview();
    }

    // Валидация файла
    validateFile(file) {
        // Проверка типа
        if (!this.options.acceptedTypes.includes(file.type)) {
            notifications.error(`Неподдерживаемый тип файла: ${file.name}`);
            return false;
        }

        // Проверка размера
        if (file.size > this.options.maxSize) {
            notifications.error(`Файл слишком большой: ${file.name}`);
            return false;
        }

        return true;
    }

    // Обновление превью
    async updatePreview() {
        const previewArea = this.container.querySelector('.preview-area');
        const previewGrid = this.container.querySelector('.preview-grid');
        const uploadActions = this.container.querySelector('.upload-actions');

        if (this.files.length === 0) {
            previewArea.classList.add('hidden');
            uploadActions.classList.add('hidden');
            return;
        }

        previewArea.classList.remove('hidden');
        uploadActions.classList.remove('hidden');

        previewGrid.innerHTML = '';

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            const preview = await this.createFilePreview(file, i);
            previewGrid.appendChild(preview);
        }
    }

    // Создание превью файла
    async createFilePreview(file, index) {
        const div = document.createElement('div');
        div.className = 'relative bg-gray-100 rounded-lg overflow-hidden aspect-square';

        try {
            const previewUrl = await cloudinaryUploader.createPreview(file);

            div.innerHTML = `
                <img src="${previewUrl}" alt="${file.name}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onclick="removeFile(${index})" class="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                            <path d="M18 6 6 18"/>
                            <path d="m6 6 18 12"/>
                        </svg>
                    </button>
                </div>
                <div class="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                    <p class="text-xs truncate">${file.name}</p>
                    <p class="text-xs text-gray-300">${this.formatFileSize(file.size)}</p>
                </div>
            `;
        } catch (error) {
            div.innerHTML = `
                <div class="w-full h-full flex items-center justify-center bg-gray-200">
                    <p class="text-xs text-gray-500 text-center p-2">${file.name}</p>
                </div>
            `;
        }

        return div;
    }

    // Удаление файла
    removeFile(index) {
        this.files.splice(index, 1);
        this.updatePreview();
    }

    // Очистка всех файлов
    clearFiles() {
        this.files = [];
        this.uploadedFiles = [];
        this.updatePreview();

        const resultsArea = this.container.querySelector('.results-area');
        resultsArea.classList.add('hidden');
    }

    // Загрузка файлов
    async uploadFiles() {
        if (this.files.length === 0) {
            notifications.warning('Выберите файлы для загрузки');
            return;
        }

        const uploadBtn = this.container.querySelector('#upload-btn');
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Загрузка...';

        const results = [];

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];

            // Показываем прогресс
            const progressToast = notifications.showUploadProgress(file.name, 0);

            try {
                // Симуляция прогресса (в реальности Cloudinary не дает прогресс)
                const progressInterval = setInterval(() => {
                    const currentProgress = Math.min(90, Math.random() * 80 + 10);
                    notifications.showUploadProgress(file.name, currentProgress);
                }, 200);

                const result = await cloudinaryUploader.uploadFile(file, {
                    folder: this.options.folder
                });

                clearInterval(progressInterval);

                if (result.success) {
                    notifications.completeUpload(file.name, true);
                    results.push(result);
                    this.uploadedFiles.push(result);
                } else {
                    notifications.completeUpload(file.name, false);
                    notifications.error(`Ошибка загрузки ${file.name}: ${result.error}`);
                }

            } catch (error) {
                notifications.completeUpload(file.name, false);
                notifications.error(`Ошибка загрузки ${file.name}`);
            }
        }

        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Загрузить файлы';

        if (results.length > 0) {
            notifications.success(`Загружено ${results.length} из ${this.files.length} файлов`);
            this.showResults(results);

            // Вызываем callback если есть
            if (this.options.onUploadComplete) {
                this.options.onUploadComplete(results);
            }
        }

        return results;
    }

    // Показать результаты загрузки
    showResults(results) {
        const resultsArea = this.container.querySelector('.results-area');
        const resultsGrid = this.container.querySelector('.results-grid');

        resultsArea.classList.remove('hidden');
        resultsGrid.innerHTML = '';

        results.forEach(result => {
            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg';

            div.innerHTML = `
                <img src="${cloudinaryUploader.getTransformedUrl(result.public_id, 'thumbnail')}" 
                     alt="Uploaded" class="w-12 h-12 object-cover rounded">
                <div class="flex-1">
                    <p class="text-sm font-medium text-green-800">${result.public_id}</p>
                    <p class="text-xs text-green-600">${this.formatFileSize(result.size)}</p>
                </div>
                <button onclick="copyToClipboard('${result.url}')" 
                        class="text-green-600 hover:text-green-800 p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                    </svg>
                </button>
            `;

            resultsGrid.appendChild(div);
        });

        // Глобальная функция для копирования
        window.copyToClipboard = (text) => {
            navigator.clipboard.writeText(text).then(() => {
                notifications.success('URL скопирован в буфер обмена');
            });
        };
    }

    // Форматирование размера файла
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Получить загруженные файлы
    getUploadedFiles() {
        return this.uploadedFiles;
    }

    // Получить URLs загруженных файлов
    getUploadedUrls() {
        return this.uploadedFiles.map(file => file.url);
    }
}

// Экспорт
export { FileUploader };

// Глобальный доступ
window.FileUploader = FileUploader;