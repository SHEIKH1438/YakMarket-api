'use strict';

/**
 * product controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::product.product', ({ strapi }) => ({
    // 1. Create product: automatically set the owner to the current user
    async create(ctx) {
        const { user } = ctx.state;

        if (!user) {
            return ctx.unauthorized('Вы должны быть авторизованы, чтобы создать товар');
        }

        // Ensure request body has data
        if (!ctx.request.body.data) {
            ctx.request.body.data = {};
        }

        // Automatically assign current user as owner
        ctx.request.body.data.owner = user.id;

        // Call the default core action
        const response = await super.create(ctx);

        return response;
    },

    // 2. Update product: check if the current user is the owner
    async update(ctx) {
        const { id } = ctx.params;
        const { user } = ctx.state;

        if (!user) {
            return ctx.unauthorized('Вы должны быть авторизованы, чтобы редактировать товар');
        }

        // Find the product and its owner
        const product = await strapi.entityService.findOne('api::product.product', id, {
            populate: ['owner'],
        });

        if (!product) {
            return ctx.notFound('Товар не найден');
        }

        // Check ownership (403 Forbidden as requested)
        if (!product.owner || product.owner.id !== user.id) {
            return ctx.forbidden('У вас нет прав на редактирование этого товара');
        }

        // Prevent manual owner change in payload
        if (ctx.request.body.data) {
            delete ctx.request.body.data.owner;
        }

        // Proceed with default update
        return await super.update(ctx);
    },

    // 3. Delete product: check if the current user is the owner
    async delete(ctx) {
        const { id } = ctx.params;
        const { user } = ctx.state;

        if (!user) {
            return ctx.unauthorized('Вы должны быть авторизованы, чтобы удалить товар');
        }

        // Find the product and its owner
        const product = await strapi.entityService.findOne('api::product.product', id, {
            populate: ['owner'],
        });

        if (!product) {
            return ctx.notFound('Товар не найден');
        }

        // Check ownership (403 Forbidden as requested)
        if (!product.owner || product.owner.id !== user.id) {
            return ctx.forbidden('У вас нет прав на удаление этого товара');
        }

        // Proceed with default delete
        return await super.delete(ctx);
    },
}));
