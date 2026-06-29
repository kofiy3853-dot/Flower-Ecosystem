require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

(async () => {
    console.log('=== Set Admin Password ===\n');
    
    const email = 'admin@flower.com';
    const newPassword = await ask('Enter new password (min 8 chars): ');
    
    if (newPassword.length < 8) {
        console.error('Password must be at least 8 characters');
        process.exit(1);
    }
    
    try {
        const hash = await bcrypt.hash(newPassword, 12);
        const result = await pool.query(
            "UPDATE auth.users SET password_hash = $1 WHERE email = $2 AND role = 'ADMIN' RETURNING id, email, role",
            [hash, email]
        );
        
        if (result.rows.length === 0) {
            console.error('Admin user not found or role mismatch');
            process.exit(1);
        }
        
        console.log(`\nPassword updated for ${email}`);
        console.log('You can now login with:');
        console.log(`  Email: ${email}`);
        console.log(`  Password: ${newPassword}`);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
        rl.close();
    }
})();
