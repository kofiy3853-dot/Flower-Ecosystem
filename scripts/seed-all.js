const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function parseTimeAgo(str) {
    if (!str) return new Date();
    const parts = str.match(/(\d+)\s+(\w+)\s+ago/);
    if (!parts) return new Date();
    const num = parseInt(parts[1]);
    const unit = parts[2].toLowerCase();
    const msMap = { second: 1000, minute: 60000, hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 };
    for (const [k, v] of Object.entries(msMap)) {
        if (unit.startsWith(k)) return new Date(Date.now() - num * v);
    }
    return new Date();
}

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || 'flower_ecosystem',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
});

function readJSON(name) {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', name + '.json'), 'utf8'));
}

async function seedUsers() {
    const users = readJSON('users');
    for (const u of users) {
        const hash = await bcrypt.hash('password123', 10);
        const nameParts = (u.name || 'User User').split(' ');
        const roleMap = { buyer: 'CUSTOMER', seller: 'SELLER', grower: 'CUSTOMER', admin: 'ADMIN' };
        const role = roleMap[u.role] || 'CUSTOMER';
        await pool.query(`
            INSERT INTO auth.users (first_name, last_name, email, password_hash, role, is_active)
            VALUES ($1, $2, $3, $4, $5, true)
            ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name
        `, [nameParts[0] || 'User', nameParts.slice(1).join(' ') || 'User', u.email, hash, role]);
    }
    console.log(`  Seeded ${users.length} users`);
}

async function seedCategories() {
    const cats = readJSON('categories');
    for (const c of cats) {
        const exists = await pool.query('SELECT id FROM marketplace.categories WHERE name = $1', [c.name]);
        if (exists.rows.length) continue;
        await pool.query(`
            INSERT INTO marketplace.categories (name, description, image_url)
            VALUES ($1, $2, $3)
        `, [c.name, c.tagline || '', c.image || '']);
    }
    console.log(`  Seeded ${cats.length} categories`);
}

async function seedProducts() {
    const products = readJSON('products');
    const users = await pool.query('SELECT id, email FROM auth.users');
    const userMap = {};
    for (const r of users.rows) userMap[r.email] = r.id;
    const catMap = {};
    const cats = await pool.query('SELECT id, name FROM marketplace.categories');
    for (const r of cats.rows) catMap[r.name.toLowerCase()] = r.id;

    for (const p of products) {
        const sellerEmail = p.seller === 'Bloom & Co.' ? 'seller1@example.com'
            : p.seller === 'Golden Petals Farm' ? 'seller2@example.com'
            : p.seller === 'Orchid Paradise' ? 'seller3@example.com'
            : 'seller@example.com';
        const sellerId = userMap[sellerEmail];
        if (!sellerId) continue;

        const catId = catMap[p.category] || 1;


        const imagesArr = p.images || [];
        const r = await pool.query(`
            INSERT INTO marketplace.products (seller_id, category_id, name, description, price, stock_quantity, is_active, badge, occasion, color, fresh, featured, best_seller, new_arrival, image_url, images, harvest_date, shelf_life_days)
            VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id
        `, [sellerId, catId, p.name, p.description || '', p.price, 50,
            p.badge || null, p.occasion || null, p.color || null,
            p.fresh || false, p.featured || false, p.bestSeller || false, p.newArrival || false,
            p.image || null, imagesArr,
            p.fresh ? new Date(Date.now() - Math.floor(Math.random() * 5) * 86400000) : null,
            p.fresh ? 10 : null
        ]);
        const productId = r.rows[0].id;

        if (p.image) {
            await pool.query(
                'INSERT INTO marketplace.product_images (product_id, image_url, sort_order) VALUES ($1, $2, 0)',
                [productId, p.image]
            );
        }
        for (let i = 0; i < (p.images || []).length; i++) {
            await pool.query(
                'INSERT INTO marketplace.product_images (product_id, image_url, sort_order) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                [productId, p.images[i], i]
            );
        }
    }
    console.log(`  Seeded ${products.length} products with images`);
}

async function seedFlowerKnowledge() {
    const flowers = readJSON('flower-knowledge');
    const cats = readJSON('flower-knowledge-categories');
    for (const c of cats) {
        await pool.query(`
            INSERT INTO learning.knowledge_categories (id, name, slug, description, icon)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
        `, [c.id, c.name, c.slug, c.description, c.icon]);
    }
    for (const f of flowers) {
        const exists = await pool.query('SELECT id FROM learning.flower_knowledge WHERE slug = $1', [f.slug]);
        let flowerId;
        if (exists.rows.length) {
            flowerId = exists.rows[0].id;
            await pool.query(`UPDATE learning.flower_knowledge SET common_name=$1, description=$2 WHERE id=$3`,
                [f.common_name, f.description, flowerId]);
        } else {
            const r = await pool.query(`
                INSERT INTO learning.flower_knowledge (slug, common_name, scientific_name, family, origin, description, image_url, emoji, sunlight, water, soil, difficulty, growth_rate, height)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id
            `, [f.slug, f.common_name, f.scientific_name, f.family, f.origin, f.description, f.image_url, f.emoji, f.sunlight, f.water, f.soil, f.difficulty, f.growth_rate, f.height]);
            flowerId = r.rows[0].id;
        }
        for (const catId of (f.category_ids || [])) {
            await pool.query('INSERT INTO learning.flower_category_mapping (flower_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [flowerId, catId]);
        }
        for (const b of (f.benefits || [])) {
            await pool.query('INSERT INTO learning.flower_benefits (flower_id, benefit_type, benefit_description, sort_order) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
                [flowerId, b.type || b.benefit_type, b.description, b.sort_order || 0]);
        }
        for (const t of (f.care_tips || [])) {
            await pool.query('INSERT INTO learning.flower_care_tips (flower_id, title, description, sort_order) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
                [flowerId, t.title, t.description, t.sort_order || 0]);
        }
    }
    console.log(`  Seeded ${flowers.length} flower knowledge entries`);
}

async function seedEvents() {
    const events = readJSON('events');
    for (const e of events) {
        const exists = await pool.query('SELECT id FROM events.events WHERE title = $1', [e.title]);
        if (exists.rows.length) continue;
        const dateStr = e.date || (e.day && e.month ? `2026-${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(e.month)+1}-${e.day.padStart(2,'0')}` : null);
        const typeMap = { workshop: 'WORKSHOP', webinar: 'WEBINAR', exhibition: 'EXHIBITION', 'flower show': 'FLOWER_SHOW', 'training program': 'TRAINING' };
        const eventType = typeMap[(e.category || 'workshop').toLowerCase()] || 'WORKSHOP';
        await pool.query(`
            INSERT INTO events.events (title, description, location, event_date, event_type, image_url, max_participants)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            e.title, e.description || '', e.location || '',
            dateStr ? new Date(dateStr) : new Date(),
            eventType,
            e.image || '', e.spots || 100
        ]);
    }
    console.log(`  Seeded ${events.length} events`);
}

async function seedCourses() {
    const courses = readJSON('courses');
    let inserted = 0, updated = 0;
    for (const c of courses) {
        const exists = await pool.query('SELECT id FROM learning.courses WHERE title = $1', [c.title]);
        if (exists.rows.length) {
            await pool.query('UPDATE learning.courses SET thumbnail_url = $1 WHERE id = $2', [c.thumbnail, exists.rows[0].id]);
            updated++;
            continue;
        }
        await pool.query(`
            INSERT INTO learning.courses (title, description, thumbnail_url, level, instructor, duration_minutes, price, rating, students_count, category, is_published)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
        `, [c.title, c.description, c.thumbnail, c.level || 'BEGINNER', c.instructor, c.duration || 0, c.price || 0, c.rating || 0, c.students || 0, c.category || '']);
        inserted++;
    }
    console.log(`  Courses: ${inserted} inserted, ${updated} updated`);
}

async function seedReviews() {
    const products = readJSON('products');
    const dbProducts = await pool.query('SELECT id, name FROM marketplace.products');
    const productMap = {};
    for (const r of dbProducts.rows) productMap[r.name] = r.id;
    const users = await pool.query('SELECT id FROM auth.users ORDER BY created_at');
    const userIds = users.rows.map(r => r.id);

    let total = 0;
    let userIdx = 0;
    for (const p of products) {
        const productId = productMap[p.name];
        if (!productId || !p.reviewList || !p.reviewList.length) continue;
        for (const r of p.reviewList) {
            if (userIdx >= userIds.length) userIdx = 0;
            const userId = userIds[userIdx++];
            try {
                await pool.query(`
                    INSERT INTO marketplace.product_reviews (product_id, user_id, rating, review, created_at)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (product_id, user_id) DO UPDATE SET rating = EXCLUDED.rating, review = EXCLUDED.review
                `, [productId, userId, r.rating, r.text || '', parseTimeAgo(r.date)]);
                total++;
            } catch (e) {
                console.error('  Review insert error:', e.message);
            }
        }
    }
    console.log(`  Seeded ${total} reviews`);
}

async function seedAdmin() {
    const adminHash = await bcrypt.hash('Admin@123', 12);
    await pool.query(`
        INSERT INTO auth.users (first_name, last_name, email, password_hash, role, is_active)
        VALUES ('Admin', 'User', 'admin@flower.com', $1, 'ADMIN', true)
        ON CONFLICT (email) DO UPDATE SET role = 'ADMIN'
    `, [adminHash]);
    console.log('  Admin user: admin@flower.com / Admin@123');
}

async function main() {
    console.log('Seeding database...\n');
    await pool.query('SELECT 1');
    console.log('Connected.\n');

    console.log('1. Users...');
    await seedUsers();
    console.log('2. Admin...');
    await seedAdmin();
    console.log('3. Categories...');
    await seedCategories();
    console.log('4. Products...');
    await seedProducts();
    console.log('5. Flower Knowledge...');
    await seedFlowerKnowledge();
    console.log('6. Events...');
    await seedEvents();
    console.log('7. Courses...');
    await seedCourses();
    console.log('8. Reviews...');
    await seedReviews();

    console.log('\nDone! All data seeded.');
    await pool.end();
}

main().catch(e => { console.error('Seed failed:', e); process.exit(1); });