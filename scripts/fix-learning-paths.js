const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, database: 'flower_ecosystem', user: 'postgres', password: '' });

(async () => {
    // Reset student_count to 0 (real counts come from enrollments)
    const resetResult = await pool.query('UPDATE learning.learning_paths SET student_count = 0');
    console.log(`Reset student_count to 0 for ${resetResult.rowCount} paths`);

    // Update images from seed data
    const images = {
        'beginner-florist': 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?q=600&auto=format&fit=crop',
        'professional-florist': 'https://images.unsplash.com/photo-1519741497674-611481863552?q=600&auto=format&fit=crop',
        'flower-farmer': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=600&auto=format&fit=crop',
        'flower-business': 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=600&auto=format&fit=crop',
        'event-decorator': 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=600&auto=format&fit=crop'
    };
    for (const [slug, url] of Object.entries(images)) {
        await pool.query('UPDATE learning.learning_paths SET image = $1 WHERE slug = $2', [url, slug]);
    }
    console.log('Updated images for all paths');

    // Verify
    const r = await pool.query('SELECT slug, student_count, image FROM learning.learning_paths ORDER BY slug');
    console.log('\nFinal state:');
    r.rows.forEach(row => {
        console.log(`  ${row.slug}: students=${row.student_count}, image=${row.image ? 'set' : 'null'}`);
    });

    await pool.end();
})();
