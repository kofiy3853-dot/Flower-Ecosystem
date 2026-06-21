const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
});

async function seed() {
    console.log('Connecting to database...');
    await pool.query('SELECT 1');
    console.log('Connected.');

    const flowers = JSON.parse(fs.readFileSync(
        path.join(__dirname, '..', 'data', 'flower-knowledge.json'), 'utf8'
    ));
    const categories = JSON.parse(fs.readFileSync(
        path.join(__dirname, '..', 'data', 'flower-knowledge-categories.json'), 'utf8'
    ));

    // Seed categories
    console.log(`\nSeeding ${categories.length} categories...`);
    for (const c of categories) {
        await pool.query(
            `INSERT INTO learning.knowledge_categories (id, name, slug, description, icon)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug`,
            [c.id, c.name, c.slug, c.description, c.icon]
        );
    }
    console.log('Categories seeded.');

    // Seed flowers
    console.log(`\nSeeding ${flowers.length} flowers...`);
    let seeded = 0, skipped = 0;
    for (const f of flowers) {
        const exists = await pool.query(
            'SELECT id FROM learning.flower_knowledge WHERE slug = $1', [f.slug]
        );
        let flowerId;
        if (exists.rows.length) {
            flowerId = exists.rows[0].id;
            await pool.query(
                `UPDATE learning.flower_knowledge SET
                 common_name = $1, scientific_name = $2, family = $3, origin = $4,
                 description = $5, image_url = $6, emoji = $7, sunlight = $8,
                 water = $9, soil = $10, difficulty = $11, growth_rate = $12,
                 height = $13, marketplace_tags = $14, bloom_season = $16
                 WHERE id = $15`,
                [f.common_name, f.scientific_name, f.family, f.origin,
                 f.description, f.image_url, f.emoji, f.sunlight,
                 f.water, f.soil, f.difficulty, f.growth_rate,
                 f.height, f.marketplace_tags || [], flowerId, f.bloom_season || 'Year-round']
            );
            skipped++;
        } else {
            const r = await pool.query(
                `INSERT INTO learning.flower_knowledge
                 (slug, common_name, scientific_name, family, origin, description,
                  image_url, emoji, sunlight, water, soil, difficulty, growth_rate,
                  height, marketplace_tags, bloom_season)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
                 RETURNING id`,
                [f.slug, f.common_name, f.scientific_name, f.family, f.origin,
                 f.description, f.image_url, f.emoji, f.sunlight,
                 f.water, f.soil, f.difficulty, f.growth_rate,
                 f.height, f.marketplace_tags || [], f.bloom_season || 'Year-round']
            );
            flowerId = r.rows[0].id;
            seeded++;
        }

        // Category mappings
        await pool.query('DELETE FROM learning.flower_category_mapping WHERE flower_id = $1', [flowerId]);
        for (const catId of (f.category_ids || [])) {
            await pool.query(
                'INSERT INTO learning.flower_category_mapping (flower_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [flowerId, catId]
            );
        }

        // Benefits
        await pool.query('DELETE FROM learning.flower_benefits WHERE flower_id = $1', [flowerId]);
        for (const b of (f.benefits || [])) {
            await pool.query(
                `INSERT INTO learning.flower_benefits (flower_id, benefit_type, benefit_description, sort_order)
                 VALUES ($1, $2, $3, $4)`,
                [flowerId, b.benefit_type, b.description, b.sort_order || 0]
            );
        }

        // Care tips
        await pool.query('DELETE FROM learning.flower_care_tips WHERE flower_id = $1', [flowerId]);
        for (const t of (f.care_tips || [])) {
            await pool.query(
                `INSERT INTO learning.flower_care_tips (flower_id, title, description, sort_order)
                 VALUES ($1, $2, $3, $4)`,
                [flowerId, t.title, t.description, t.sort_order || 0]
            );
        }

        console.log(`  ${f.emoji} ${f.common_name} (${f.slug})`);
    }

    console.log(`\nDone! ${seeded} new, ${skipped} updated.`);
    await pool.end();
}

seed().catch(e => {
    console.error('Seed failed:', e.message);
    process.exit(1);
});