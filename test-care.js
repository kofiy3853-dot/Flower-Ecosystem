require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER
});

async function test() {
    // Test 1: detail by slug
    const r1 = await p.query(
        `SELECT g.id, g.title, g.slug, g.category_id, cc.name AS category_name
         FROM learning.care_guides g
         LEFT JOIN learning.care_categories cc ON cc.id = g.category_id
         WHERE g.slug = $1`, ['rose-care-guide']
    );
    console.log('Test 1 - slug lookup:', r1.rows.length ? 'PASS' : 'FAIL', r1.rows[0]?.title);

    // Test 2: detail by UUID
    if (r1.rows.length) {
        const r2 = await p.query(
            `SELECT g.id, g.title FROM learning.care_guides g WHERE g.id = $1`, [r1.rows[0].id]
        );
        console.log('Test 2 - UUID lookup:', r2.rows.length ? 'PASS' : 'FAIL');
    }

    // Test 3: categories
    const r3 = await p.query('SELECT COUNT(*) FROM learning.care_categories');
    console.log('Test 3 - categories:', parseInt(r3.rows[0].count) === 8 ? 'PASS' : 'FAIL', r3.rows[0].count, 'rows');

    // Test 4: list with JOIN
    const r4 = await p.query(
        `SELECT g.title, cc.name AS cat FROM learning.care_guides g
         LEFT JOIN learning.care_categories cc ON cc.id = g.category_id
         ORDER BY g.title`
    );
    console.log('Test 4 - list with join:', r4.rows.length === 4 ? 'PASS' : 'FAIL', r4.rows.length, 'guides');
    r4.rows.forEach(r => console.log('  -', r.title, '|', r.cat));

    await p.end();
}
test().catch(e => { console.error(e); process.exit(1); });
