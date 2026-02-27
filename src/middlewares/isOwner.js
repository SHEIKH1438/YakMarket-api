module.exports = (config, { strapi }) => {
    return async (ctx, next) => {
        const handler = ctx.request.route?.handler;
        if (!handler) return await next();

        // Define actions that require ownership or authentication
        const isWriteAction = handler.endsWith('.update') ||
            handler.endsWith('.delete') ||
            handler.endsWith('.destroy') ||
            handler.endsWith('.create');

        // Actions that are absolutely forbidden for guests
        // Guests can only READ (find, findOne)
        const isRestrictedForGuests = isWriteAction ||
            handler.includes('chat') ||
            handler.includes('message') ||
            handler.includes('favorite');

        const userId = ctx.state.user?.id;

        // RULE 1: Guests cannot perform restricted actions
        if (!userId && isRestrictedForGuests) {
            ctx.status = 403;
            ctx.body = {
                status: 'fail',
                error_type: 'UI_TOAST',
                message: 'Для этого действия необходимо войти в аккаунт',
                code: 'AUTH_REQUIRED',
            };
            return;
        }

        // If it's not a write action, we can proceed (e.g., viewing lists, search)
        if (!isWriteAction) return await next();

        // If it's a create action, we just need the user to be authenticated (already checked above)
        if (handler.endsWith('.create')) return await next();

        // RULE 2: For Update/Delete, check ownership
        const { id } = ctx.params;
        if (!id) return await next();

        // Extract UID: api::[api-name].[content-type]
        const parts = handler.split('.');
        if (parts.length < 2) return await next();
        const uid = parts.slice(0, 2).join('.');

        try {
            const entity = await strapi.entityService.findOne(uid, id, {
                populate: ['owner', 'seller', 'user', 'buyer'],
            });

            if (!entity) return ctx.notFound('Resource not found');

            const ownerFields = ['owner_id', 'sender_id', 'buyer_id', 'seller_id', 'owner', 'seller', 'user', 'buyer'];
            const isOwner = ownerFields.some(field => {
                const val = entity[field];
                if (!val) return false;
                const entityOwnerId = (typeof val === 'object') ? (val.id || val.documentId) : val;
                return entityOwnerId === userId;
            });

            if (!isOwner) {
                ctx.status = 403;
                ctx.body = {
                    status: 'fail',
                    error_type: 'UI_TOAST',
                    message: 'Доступ запрещен: вы не являетесь владельцем',
                    code: 'ACCESS_DENIED_OWNERSHIP',
                };
                return;
            }
        } catch (err) {
            strapi.log.error('isOwner middleware error:', err);
            return await next();
        }

        await next();
    };
};
