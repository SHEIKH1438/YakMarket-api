/**
 * ⚠️ КОНФИДЕНЦИАЛЬНО: База данных модераторов YakMarket
 * Доступ только через проверку ID в системе
 */

const crypto = require('crypto');

// Хеш для проверки целостности (простая защита от случайных изменений)
const MODERATORS_HASH = 'ym_moderators_v1';

const MODERATORS = [
    {
        id: '8012802187',
        name: 'SheikhK2',
        role: 'admin',
        permissions: ['all', 'admin', 'moderate', 'ban', 'warn', 'stats', 'user_info'],
        phone: '+992110058686',
        isAvailable: true,
        joinedAt: '2024-01-01',
        stats: { accepted: 0, rejected: 0, warnings: 0, banned: 0 }
    },
    {
        id: '1234567890',
        name: 'Moderator_1',
        role: 'moderator',
        permissions: ['moderate', 'stats', 'user_info'],
        phone: '+992000000001',
        isAvailable: true,
        joinedAt: '2024-03-01',
        stats: { accepted: 0, rejected: 0, warnings: 0, banned: 0 }
    },
    {
        id: '2345678901',
        name: 'Moderator_2',
        role: 'moderator',
        permissions: ['moderate', 'stats', 'user_info'],
        phone: '+992000000002',
        isAvailable: true,
        joinedAt: '2024-03-01',
        stats: { accepted: 0, rejected: 0, warnings: 0, banned: 0 }
    },
    {
        id: '3456789012',
        name: 'Moderator_3',
        role: 'moderator',
        permissions: ['moderate', 'stats'],
        phone: '+992000000003',
        isAvailable: false,
        joinedAt: '2024-03-01',
        stats: { accepted: 0, rejected: 0, warnings: 0, banned: 0 }
    }
];

// Функции для работы с модераторами
module.exports = {
    _hash: MODERATORS_HASH,

    // Получить всех модераторов
    getAll() {
        return MODERATORS;
    },

    // Получить модератора по ID
    getById(id) {
        return MODERATORS.find(m => m.id === String(id));
    },

    // Проверить является ли пользователь модератором
    isModerator(id) {
        return MODERATORS.some(m => m.id === String(id));
    },

    // Проверить является ли админом
    isAdmin(id) {
        const mod = this.getById(id);
        return mod && mod.role === 'admin';
    },

    // Проверить разрешение
    hasPermission(id, permission) {
        const mod = this.getById(id);
        if (!mod) return false;
        if (mod.role === 'admin') return true;
        return mod.permissions.includes(permission);
    },

    // Получить доступных модераторов
    getAvailable() {
        return MODERATORS.filter(m => m.isAvailable);
    },

    // Получить администратора
    getAdmin() {
        return MODERATORS.find(m => m.role === 'admin');
    },

    // Обновить статистику модератора
    updateStats(id, action) {
        const mod = this.getById(id);
        if (!mod) return false;

        switch (action) {
            case 'accept': mod.stats.accepted++; break;
            case 'reject': mod.stats.rejected++; break;
            case 'warn': mod.stats.warnings++; break;
            case 'ban': mod.stats.banned++; break;
            default: return false;
        }
        return true;
    }
};
