const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: 'postgres',
    password: process.env.PG_PASSWORD || '',
});
async function run() {
    const r1 = await pool.query("UPDATE learning.articles SET thumbnail_url = $1 WHERE title = $2", ['images/1701165.jpg', 'The Ultimate Rose Care Guide']);
    const r2 = await pool.query("UPDATE learning.articles SET thumbnail_url = $1 WHERE title = $2", ['images/Florists_Review_October_2024.1_66fdb9da3ed6c.jpg', 'Seasonal Flower Arrangement Ideas']);
    const r3 = await pool.query("UPDATE learning.articles SET thumbnail_url = $1 WHERE title = $2", ['images/gld0314c_Bouquets-page-002.jpg', "Beginner's Guide to Floristry"]);
    console.log(`Updated: ${r1.rowCount + r2.rowCount + r3.rowCount} articles`);
    await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
