const fetch = require('node-fetch');

const API_URL = 'https://yakmarket-api-production.up.railway.app';
const EMAIL = 'muhajeodinaeva7@gmail.com';
const PASSWORD = 'nILUFAR1';

async function setup() {
    try {
        console.log('1. Logging in to admin panel...');
        let res = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });

        let data = await res.json();
        const token = data.data?.token;

        if (!token) throw new Error('Login failed: ' + JSON.stringify(data));
        console.log('Login successful! Token acquired.');

        console.log('\n2. Fetching Roles...');
        res = await fetch(`${API_URL}/users-permissions/roles`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        data = await res.json();
        const roles = data.roles; 
        
        if(!roles) {
            console.error("Failed to fetch roles array. Got:", data);
            return;
        }

        const publicRole = roles.find(r => r.type === 'public');
        const authRole = roles.find(r => r.type === 'authenticated');

        console.log(`Found Public Role ID: ${publicRole?.id}, Auth Role ID: ${authRole?.id}`);

        if (publicRole) {
            console.log('\n3. Fetching Public Role details...');
            res = await fetch(`${API_URL}/users-permissions/roles/${publicRole.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const roleData = (await res.json()).role;

            if (roleData.permissions['api::category']) {
                roleData.permissions['api::category'].controllers.category.find.enabled = true;
                roleData.permissions['api::category'].controllers.category.findOne.enabled = true;
            }
            if (roleData.permissions['api::product']) {
                roleData.permissions['api::product'].controllers.product.find.enabled = true;
                roleData.permissions['api::product'].controllers.product.findOne.enabled = true;
                roleData.permissions['api::product'].controllers.product.create.enabled = true;
            }
            if (roleData.permissions['plugin::upload']) {
                roleData.permissions['plugin::upload'].controllers['content-api'].upload.enabled = true;
            }
            if (roleData.permissions['plugin::users-permissions']) {
                roleData.permissions['plugin::users-permissions'].controllers.auth.callback.enabled = true;
                roleData.permissions['plugin::users-permissions'].controllers.auth.register.enabled = true;
            }

            console.log('Updating Public Role...');
            res = await fetch(`${API_URL}/users-permissions/roles/${publicRole.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ permissions: roleData.permissions })
            });
            if (res.ok) console.log('✅ Public Role updated successfully!');
            else console.log('❌ Failed to update Public Role:', await res.text());
        }

        if (authRole) {
            console.log('\n4. Fetching Authenticated Role details...');
            res = await fetch(`${API_URL}/users-permissions/roles/${authRole.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const roleData = (await res.json()).role;

            if (roleData.permissions['api::category']) {
                roleData.permissions['api::category'].controllers.category.find.enabled = true;
                roleData.permissions['api::category'].controllers.category.findOne.enabled = true;
            }
            if (roleData.permissions['api::product']) {
                roleData.permissions['api::product'].controllers.product.find.enabled = true;
                roleData.permissions['api::product'].controllers.product.findOne.enabled = true;
                roleData.permissions['api::product'].controllers.product.create.enabled = true;
                roleData.permissions['api::product'].controllers.product.update.enabled = true;
            }
            if (roleData.permissions['plugin::upload']) {
                roleData.permissions['plugin::upload'].controllers['content-api'].upload.enabled = true;
            }
            if (roleData.permissions['plugin::users-permissions']) {
                roleData.permissions['plugin::users-permissions'].controllers.user.me.enabled = true;
            }

            console.log('Updating Authenticated Role...');
            res = await fetch(`${API_URL}/users-permissions/roles/${authRole.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ permissions: roleData.permissions, name: roleData.name, description: roleData.description })
            });
            if (res.ok) console.log('✅ Authenticated Role updated successfully!');
            else console.log('❌ Failed to update Auth Role:', await res.text());
        }

        console.log('\n🎉 Permissions setup fully successful!');

    } catch (e) {
        console.error('SCRIPT ERROR:', e);
    }
}

setup();
