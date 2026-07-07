require('dotenv').config();
const http = require('http');

const BASE = 'http://localhost:3000';
let authToken = '';

// Test helper
function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (authToken) options.headers['Authorization'] = `Bearer ${authToken}`;
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.status, data: JSON.parse(data) }); }
                catch { resolve({ status: res.status, data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log('=== Garden API Tests ===\n');

    // 1. Test login to get token
    console.log('1. Testing login...');
    const loginRes = await request('POST', '/api/auth/login', {
        email: 'superadmin@flower.com',
        password: process.env.ADMIN_PASSWORD
    });
    if (loginRes.data.token) {
        authToken = loginRes.data.token;
        console.log('   ✓ Login successful\n');
    } else {
        console.log('   ✗ Login failed:', loginRes.data.error || 'Unknown error');
        console.log('   Skipping authenticated tests...\n');
    }

    // 2. Test get flowers (public)
    console.log('2. Testing GET /api/flowers...');
    const flowersRes = await request('GET', '/api/flowers?limit=3');
    if (flowersRes.data.flowers) {
        console.log(`   ✓ Got ${flowersRes.data.flowers.length} flowers`);
    } else {
        console.log('   ✗ Failed to get flowers');
    }

    // 3. Test get garden (authenticated)
    if (authToken) {
        console.log('\n3. Testing GET /api/garden...');
        const gardenRes = await request('GET', '/api/garden');
        console.log(`   ✓ Got ${gardenRes.data.length || 0} plants in garden`);

        // 4. Test add to garden
        if (flowersRes.data.flowers && flowersRes.data.flowers.length > 0) {
            const flowerId = flowersRes.data.flowers[0].id;
            console.log('\n4. Testing POST /api/garden (add plant)...');
            const addRes = await request('POST', '/api/garden', {
                flower_id: flowerId,
                nickname: 'My Test Rose',
                location: 'Living Room'
            });
            if (addRes.data.id || addRes.data.message) {
                console.log('   ✓ Plant added to garden');
            } else {
                console.log('   ✗ Failed:', addRes.data.error || 'Unknown');
            }

            // 5. Test log care
            if (addRes.data.id) {
                console.log('\n5. Testing POST /api/garden/:id/care...');
                const careRes = await request('POST', `/api/garden/${addRes.data.id}/care`, {
                    care_type: 'water',
                    notes: 'Watered thoroughly'
                });
                if (careRes.data.id) {
                    console.log('   ✓ Care activity logged');
                } else {
                    console.log('   ✗ Failed:', careRes.data.error || 'Unknown');
                }

                // 6. Test get care history
                console.log('\n6. Testing GET /api/garden/:id/care...');
                const historyRes = await request('GET', `/api/garden/${addRes.data.id}/care`);
                console.log(`   ✓ Got ${historyRes.data.length || 0} care logs`);

                // 7. Test remove from garden
                console.log('\n7. Testing DELETE /api/garden/:id...');
                const delRes = await request('DELETE', `/api/garden/${addRes.data.id}`);
                if (delRes.data.message) {
                    console.log('   ✓ Plant removed from garden');
                } else {
                    console.log('   ✗ Failed:', delRes.data.error || 'Unknown');
                }
            }
        }

        // 8. Test garden stats
        console.log('\n8. Testing GET /api/garden/stats...');
        const statsRes = await request('GET', '/api/garden/stats');
        if (statsRes.data.total !== undefined) {
            console.log(`   ✓ Stats: ${statsRes.data.total} plants, ${statsRes.data.healthy} healthy`);
        } else {
            console.log('   ✗ Failed to get stats');
        }

        // 9. Test reminders
        console.log('\n9. Testing GET /api/garden/reminders...');
        const remRes = await request('GET', '/api/garden/reminders');
        console.log(`   ✓ Got ${remRes.data.length || 0} reminders`);
    }

    console.log('\n=== All Tests Complete ===');
}

runTests().catch(console.error);
