require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: 'postgres',
    password: process.env.PG_PASSWORD || '',
});
async function run() {
    await pool.query(`CREATE TABLE IF NOT EXISTS auth.email_verifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_email_verify_token ON auth.email_verifications(token)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_email_verify_user ON auth.email_verifications(user_id)');
    await pool.query('ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE');
    console.log('Created email_verifications table and email_verified column');
    await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
