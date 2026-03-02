/**
 * YakMarket.tj - Location Definitions
 * Central source of truth for markets and their specific fields.
 */

const YakLocations = {
    markets: [
        {
            id: 'sakhavat',
            name: 'Саховат',
            fields: [{ id: 'floor', label: 'Местоположение/Этаж', placeholder: 'Например: 1 этаж, у входа' }]
        },
        {
            id: 'korvon',
            name: 'Корвон',
            fields: [
                { id: 'kator', label: 'Катор (Ряд)', placeholder: 'Например: 1' },
                { id: 'sector', label: 'Сектор', placeholder: 'Например: Г' },
                { id: 'shop_number', label: 'Номер магазина/Дверь', placeholder: 'Например: 12' }
            ]
        },
        {
            id: 'tsum',
            name: 'ЦУМ',
            fields: [{ id: 'floor', label: 'Местоположение/Этаж', placeholder: 'Например: 3 этаж, бутик 4' }]
        },
        {
            id: 'sadbarg',
            name: 'Садбарг',
            fields: [{ id: 'floor', label: 'Местоположение/Этаж', placeholder: 'Например: 2 этаж' }]
        },
        {
            id: 'sultoni_kabir',
            name: 'Султони Кабир',
            fields: [
                { id: 'kator', label: 'Катор (Ряд)', placeholder: 'Например: 5' },
                { id: 'sector', label: 'Сектор', placeholder: 'Например: Б' },
                { id: 'shop_number', label: 'Номер магазина', placeholder: 'Например: 45' }
            ]
        },
        {
            id: 'farovon',
            name: 'Фаровон',
            fields: [{ id: 'floor', label: 'Местоположение/Этаж', placeholder: 'Например: Главный проход' }]
        }
    ],

    /**
     * Get fields for a specific market by name
     */
    getFields(marketName) {
        const market = this.markets.find(m => m.name === marketName);
        return market ? market.fields : [];
    },

    /**
     * Get all market names
     */
    getNames() {
        return this.markets.map(m => m.name);
    }
};

window.YakLocations = YakLocations;
