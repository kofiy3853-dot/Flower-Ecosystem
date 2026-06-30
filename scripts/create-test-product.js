require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: 'postgres',
    password: process.env.PG_PASSWORD || '',
});
async function create() {
    const r = await pool.query(
        `INSERT INTO marketplace.products 
            (seller_id, name, description, price, stock_quantity, category_id, flower_cond,
             occasion, color, fresh, currency, size, sunlight, water_frequency, features, fragrance, care_level, bloom_season, origin)
         SELECT 
            (SELECT id FROM auth.users WHERE role = 'SELLER' LIMIT 1),
            'Test Rose with Characteristics',
            'A beautiful test rose with all characteristics set.',
            25.00,
            10,
            (SELECT id FROM marketplace.categories WHERE name = 'Roses' LIMIT 1),
            'NATURAL',
            'romance',
            'pink',
            true,
            'GHS',
            'medium',
            'full-sun',
            'weekly',
            ARRAY['long-lasting', 'pet-safe'],
            'strong',
            'moderate',
            'spring',
            'Local nursery'
         RETURNING id, name, size, sunlight, water_frequency, features, fragrance`
    );
    console.log('Created product:', JSON.stringify(r.rows[0], null, 2));
    await pool.end();
}
create().catch(e => { console.error(e); process.exit(1); });
