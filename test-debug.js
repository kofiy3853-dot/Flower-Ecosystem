require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT) || 5432,
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || ''
});

async function debug() {
    console.log('=== Debugging Flowers Query ===');
    
    // Check if table exists and has data
    const count = await pool.query("SELECT COUNT(*) FROM learning.flowers WHERE status = 'active'");
    console.log('Active flowers in DB:', count.rows[0].count);
    
    // Try the exact query from the route
    try {
        const r = await pool.query(`
            SELECT f.*,
                (SELECT image_url FROM learning.flower_images WHERE flower_id = f.id AND is_primary = true LIMIT 1) AS primary_image,
                (SELECT COUNT(*)::int FROM learning.flower_images WHERE flower_id = f.id) AS image_count
            FROM learning.flowers f
            WHERE f.status = 'active'
            ORDER BY f.common_name LIMIT 3`);
        console.log('Query result rows:', r.rows.length);
        if (r.rows.length > 0) {
            console.log('First flower:', r.rows[0].common_name);
        }
    } catch (e) {
        console.error('Query error:', e.message);
    }
    
    // Check JSON fallback
    const jsonPath = path.join(__dirname, 'data', 'flowers.json');
    if (fs.existsSync(jsonPath)) {
        const fallback = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log('Fallback flowers:', fallback.length);
    } else {
        console.log('flowers.json does not exist');
    }
    
    pool.end();
}

debug();
