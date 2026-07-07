require('dotenv').config();
const http = require('http');

function testEndpoint(path) {
    return new Promise((resolve) => {
        const req = http.request({hostname:'localhost', port:3000, path:path, method:'GET'}, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({status: res.statusCode, data: data.substring(0, 500)}));
        });
        req.on('error', e => resolve({error: e.message}));
        req.end();
    });
}

async function run() {
    console.log('Testing /api/flowers...');
    const r = await testEndpoint('/api/flowers?limit=3');
    console.log('Status:', r.status);
    console.log('Response:', r.data);
}

run();
