require('dotenv').config();
const { pool } = require('./routes/middleware');

(async () => {
    // Check events
    const events = await pool.query("SELECT id, title, image_url FROM events.events LIMIT 5");
    console.log('Events:', events.rows.length);
    events.rows.forEach(e => console.log(`  ${e.title}: ${e.image_url || 'NO IMAGE'}`));

    // Check categories
    const cats = await pool.query("SELECT id, name, slug FROM marketplace.categories LIMIT 10");
    console.log('\nCategories:', cats.rows.length);
    cats.rows.forEach(c => console.log(`  ${c.name} (${c.slug})`));

    // Check wildflower category
    const wildflower = await pool.query("SELECT id, name, slug, image_url FROM marketplace.categories WHERE name ILIKE '%wild%' OR slug ILIKE '%wild%'");
    console.log('\nWildflower category:', wildflower.rows.length);
    wildflower.rows.forEach(w => console.log(`  ${w.name}: ${w.image_url || 'NO IMAGE'}`));

    process.exit(0);
})();