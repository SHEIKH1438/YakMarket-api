const fetch = require('node-fetch');

// --- Configuration ---
const API_URL = process.env.STRAPI_URL || 'https://yakmarket-api-production.up.railway.app';
const ADMIN_EMAIL = 'muhajeodinaeva7@gmail.com';
const ADMIN_PASS = 'Nastrulo1'; // User provided: Nastrulo1 (fallback: nILUFAR1)

async function run() {
    try {
        console.log(`🚀 Connecting to ${API_URL}...`);

        let token = process.env.STRAPI_TOKEN;

        if (!token) {
            console.log('🔑 No token provided, attempting admin login...');
            // 1. Login to get Admin Token
            const loginResp = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS })
            });

            const loginData = await loginResp.json();
            token = loginData.data?.token;

            if (!token) {
                console.error('❌ Login failed. Check credentials.', loginData);
                process.exit(1);
            }
            console.log('✅ Admin login successful.');
        } else {
            console.log('✅ Using provided JWT token.');
        }

        // 2. Fetch Roles
        const rolesResp = await fetch(`${API_URL}/users-permissions/roles`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const rolesData = await rolesResp.json();
        const publicRole = rolesData.roles.find(r => r.type === 'public');
        const authRole = rolesData.roles.find(r => r.type === 'authenticated');

        if (!publicRole || !authRole) {
            console.error('❌ Roles not found.');
            process.exit(1);
        }

        // 3. Update Public Role
        console.log('🔄 Configuring Public Role...');
        await updateRole(token, publicRole.id, {
            'api::product': ['find', 'findOne', 'create'],
            'api::category': ['find', 'findOne'],
            'plugin::upload': ['upload'],
            'plugin::users-permissions': ['callback', 'register']
        });

        // 4. Update Authenticated Role
        console.log('🔄 Configuring Authenticated Role...');
        await updateRole(token, authRole.id, {
            'api::product': ['find', 'findOne', 'create', 'update'],
            'api::category': ['find', 'findOne'],
            'plugin::upload': ['upload'],
            'plugin::users-permissions': ['me']
        });

        console.log('\n✨ ALL PERMISSIONS RECONFIGURED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

async function updateRole(adminToken, roleId, permissionMap) {
    // Fetch full role details first to get the existing permission structure
    const resp = await fetch(`${API_URL}/users-permissions/roles/${roleId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await resp.json();
    const permissions = data.role.permissions;

    // Update permissions based on map
    for (const [subject, actions] of Object.entries(permissionMap)) {
        if (!permissions[subject]) {
            console.log(`   ⚠️ Subject ${subject} missing, forcing creation...`);
            permissions[subject] = { controllers: {} };
        }

        const controllerName = subject.includes('::') ? subject.split('::')[1] : subject;

        let controllerRef = permissions[subject].controllers?.[controllerName];

        if (!controllerRef) {
            // Fallback for special plugins
            if (subject === 'plugin::upload') {
                controllerRef = permissions[subject].controllers?.['content-api'];
            } else if (subject === 'plugin::users-permissions') {
                controllerRef = permissions[subject].controllers?.auth;
            }
        }

        if (!controllerRef) {
            console.log(`   ⚠️ Controller ${controllerName} missing for ${subject}, forcing...`);
            permissions[subject].controllers[controllerName] = {};
            controllerRef = permissions[subject].controllers[controllerName];
        }

        actions.forEach(action => {
            if (!controllerRef[action]) {
                controllerRef[action] = { enabled: true };
            } else {
                controllerRef[action].enabled = true;
            }
            console.log(`   🚀 FORCED: ${subject} -> ${action}`);
        });
    }

    // Save back
    const updateResp = await fetch(`${API_URL}/users-permissions/roles/${roleId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ permissions })
    });

    if (!updateResp.ok) {
        console.error(`   ❌ Failed to update role ${roleId}:`, await updateResp.text());
    }
}

run();
