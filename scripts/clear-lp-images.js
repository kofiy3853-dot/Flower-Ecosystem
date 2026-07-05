const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'flower_ecosystem', user: 'postgres', password: '' });

(async () => {
    const r = await pool.query("UPDATE learning.learning_paths SET image = null WHERE image LIKE '%unsplash%'");
    console.log('Cleared ' + r.rowCount + ' Unsplash images from learning_paths');

    const check = await pool.query('SELECT slug, image FROM learning.learning_paths ORDER BY slug');
    check.rows.forEach(row => {
        console.log('  ' + row.slug + ': image=' + (row.image || 'null'));
    });

    await pool.end();
})();
