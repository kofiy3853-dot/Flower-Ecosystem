const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost', port: 5432,
    database: 'flower_ecosystem', user: 'postgres', password: ''
});

pool.query("SELECT password_hash FROM auth.users WHERE email='admin@flower.com'")
    .then(r => {
        const hash = r.rows[0].password_hash;
        console.log('Hash:', hash);
        console.log('Matches admin123:', bcrypt.compareSync('admin123', hash));
        
        // Force re-set the password
        const newHash = bcrypt.hashSync('admin123', 12);
        return pool.query("UPDATE auth.users SET password_hash=$1 WHERE email='admin@flower.com'", [newHash]);
    })
    .then(() => {
        console.log('Password forcefully re-set');
        return pool.query("SELECT password_hash FROM auth.users WHERE email='admin@flower.com'");
    })
    .then(r => {
        console.log('New hash matches admin123:', bcrypt.compareSync('admin123', r.rows[0].password_hash));
        pool.end();
    })
    .catch(e => { console.error(e.message); pool.end(); });
