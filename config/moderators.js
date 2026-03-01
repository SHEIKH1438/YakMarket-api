/**
 * ⚠️ КОНФИДЕНЦИАЛЬНО: База данных персонала YakMarket
 */

const MODERATORS = [
    {
        id: '8012802187',
        name: 'SheikhK2',
        role: 'admin',
        phone: '+992110058686',
        isAvailable: true,
        joinedAt: '2024-01-01',
        stats: { accepted: 0, rejected: 0, warnings: 0, banned: 0 }
    },
    {
        id: '1234567890',
        name: 'Moderator_1',
        role: 'moderator',
        phone: '+992000000001',
        isAvailable: true,
        joinedAt: '2024-03-01',
        stats: { accepted: 0, rejected: 0, warnings: 0, banned: 0 }
    },
    {
        id: '2345678901',
        name: 'Moderator_2',
        role: 'moderator',
        phone: '+992000000002',
        isAvailable: true,
        joinedAt: '2024-03-01',
        stats: { accepted: 0, rejected: 0, warnings: 0, banned: 0 }
    },
    {
        id: '3456789012',
        name: 'Moderator_3',
        role: 'moderator',
        phone: '+992000000003',
        isAvailable: false,
        joinedAt: '2024-03-01',
        stats: { accepted: 0, rejected: 0, warnings: 0, banned: 0 }
    }
];

// Команды для обычных пользователей (никакие)
const USER_COMMANDS = [];

// Команды для модераторов
const MODERATOR_COMMANDS = [
    'start',        // Приветствие
    'pending',      // Список товаров
    'approve',      // Принять товар
    'reject',       // Отклонить товар
    'user',         // Инфо о пользователе
    'stats',        // Личная статистика
    'help'          // Справка
];

// Команды только для админа
const ADMIN_COMMANDS = [
    'ban',          // Забанить пользователя
    'warn',         // Выдать предупреждение
    'admin'         // Панель администратора
];

// Все команды админа
const ALL_ADMIN_COMMANDS = [...MODERATOR_COMMANDS, ...ADMIN_COMMANDS];

module.exports = {
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
        return MODERATORS.some(m => m.id === String(id) && m.role === 'moderator');
    },

    // Проверить является ли админом
    isAdmin(id) {
        return MODERATORS.some(m => m.id === String(id) && m.role === 'admin');
    },

    // Проверить имеет ли пользователь доступ к команде
    canUseCommand(userId, command) {
        // Если админ - может использовать ЛЮБУЮ команду
        if (this.isAdmin(userId)) {
            return true;
        }

        // Если модератор - только модераторские команды
        if (this.isModerator(userId)) {
            return MODERATOR_COMMANDS.includes(command);
        }

        // Обычный пользователь - нет доступа
        return false;
    },

    // Получить список доступных команд для пользователя
    getAvailableCommands(userId) {
        if (this.isAdmin(userId)) {
            return ALL_ADMIN_COMMANDS;
        }
        if (this.isModerator(userId)) {
            return MODERATOR_COMMANDS;
        }
        return USER_COMMANDS;
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
    },

    // Получить общую статистику всех модераторов
    getTotalStats() {
        return MODERATORS.reduce((acc, mod) => {
            acc.accepted += mod.stats.accepted;
            acc.rejected += mod.stats.rejected;
            acc.warnings += mod.stats.warnings;
            acc.banned += mod.stats.banned;
            return acc;
        }, { accepted: 0, rejected: 0, warnings: 0, banned: 0 });
    }
};
