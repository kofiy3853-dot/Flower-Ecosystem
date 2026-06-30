const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const hash = bcrypt.hashSync('admin123', 12);
const pool = new Pool({
    host: 'localhost', port: 5432,
    database: 'flower_ecosystem', user: 'postgres', password: ''
});

pool.query("UPDATE auth.users SET password_hash=$1 WHERE email='admin@flower.com'", [hash])
    .then(r => { console.log('Admin password set to admin123'); pool.end(); })
    .catch(e => { console.error(e.message); pool.end(); });
