/**
 * YakMarket.tj - Middleware & Validation Layer
 * OWASP-compliant validation and role-based access control.
 */

const YakMiddleware = {
    /**
     * Ensure user is authenticated
     */
    requireAuth() {
        const user = window.YakAuth?.getCurrentUser();
        if (!user) {
            window.YakErrorHandler.handle({ code: 'auth/not-authenticated' });
            return false;
        }
        return true;
    },

    /**
     * Ensure user has specific role
     */
    requireRole(allowedRoles) {
        if (!this.requireAuth()) return false;

        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        const userRole = window.YakPermissions?.getCurrentRole() || 'USER';

        if (!roles.includes(userRole)) {
            window.YakErrorHandler.handle({ code: 'auth/permission-denied' });
            return false;
        }
        return true;
    },

    /**
     * Clean and validate input data (XSS protection)
     */
    sanitize(data) {
        if (typeof data !== 'object') return data;

        const sanitized = Array.isArray(data) ? [] : {};

        for (const key in data) {
            let value = data[key];
            if (typeof value === 'string') {
                // Remove potential script tags
                value = value.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, '')
                    .replace(/[<>]/g, '');
            } else if (typeof value === 'object' && value !== null) {
                value = this.sanitize(value);
            }
            sanitized[key] = value;
        }

        return sanitized;
    },

    /**
     * Schema validation
     */
    validate(data, schema) {
        const errors = [];
        for (const field in schema) {
            const rules = schema[field];
            const value = data[field];

            if (rules.required && !value) {
                errors.push(`Field ${field} is required`);
            }
            if (rules.type && typeof value !== rules.type) {
                errors.push(`Field ${field} must be of type ${rules.type}`);
            }
            if (rules.min && value < rules.min) {
                errors.push(`Field ${field} must be at least ${rules.min}`);
            }
        }
        return errors.length > 0 ? errors : null;
    }
};

window.YakMiddleware = YakMiddleware;
