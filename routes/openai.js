const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { asyncHandler, upload, pool, dbAvailable, readJSON } = require('./middleware');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

if (!OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY / OPENAI_API_KEY not set. AI features will not work.');
}

async function callOpenRouter(messages, maxTokens = 500) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': process.env.CORS_ORIGIN || 'http://localhost:3000',
            'X-Title': 'Flower Ecosystem'
        },
        body: JSON.stringify({ model: 'openai/gpt-4o', messages, max_tokens: maxTokens })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
}

function parseJsonResponse(content) {
    const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
}

// ─── Existing endpoints ────────────────────────────────────────────────────

router.post('/analyze-flower', upload.single('image'), asyncHandler(async (req, res) => {
    if (!OPENROUTER_API_KEY) return res.status(500).json({ error: 'OpenRouter API key not configured' });

    let imageUrl = null;
    if (req.file) {
        try {
            const imageData = fs.readFileSync(req.file.path);
            const base64Image = imageData.toString('base64');
            const mimeType = req.file.mimetype || 'image/jpeg';
            imageUrl = `data:${mimeType};base64,${base64Image}`;
            fs.unlinkSync(req.file.path);
        } catch (error) {
            console.error('Error processing uploaded file:', error);
            return res.status(500).json({ error: 'Failed to process image' });
        }
    } else if (req.body && req.body.imageUrl) {
        imageUrl = req.body.imageUrl;
    } else {
        return res.status(400).json({ error: 'Image file or imageUrl is required' });
    }

    try {
        const content = await callOpenRouter([{
            role: 'user',
            content: [
                { type: 'text', text: 'Analyze this flower image and provide the following information in JSON format: flowerName (common name), scientificName, confidence (0-1), category (e.g., "Flowering Plant", "Succulent", etc.), flowerType (e.g., "Natural", "Artificial"), reasons (array of identification reasons), careTips (array of care instructions). Respond ONLY with valid JSON, no additional text.' },
                { type: 'image_url', image_url: { url: imageUrl } }
            ]
        }], 500);

        let analysis;
        try { analysis = parseJsonResponse(content); } catch {
            analysis = { flowerName: 'Unknown Flower', scientificName: 'Unknown', confidence: 0.5, category: 'Unknown', flowerType: 'Natural', reasons: ['Could not analyze image properly'], careTips: ['Consult a florist for care instructions'] };
        }
        res.json(analysis);
    } catch (error) {
        console.error('OpenRouter API error:', error);
        res.status(500).json({ error: 'Failed to analyze image', details: error.message });
    }
}));

router.post('/recommendations', asyncHandler(async (req, res) => {
    if (!OPENROUTER_API_KEY) return res.status(500).json({ error: 'OpenRouter API key not configured' });
    const { occasion, color, budget } = req.body;
    try {
        const prompt = `Recommend 3-5 flower types for ${occasion || 'general use'}` + (color ? ` with ${color} color` : '') + (budget ? ` within a $${budget} budget` : '') + '. For each recommendation, provide: flower name, why it fits, and estimated price range. Respond in JSON format with a "recommendations" array.';
        const content = await callOpenRouter([{ role: 'user', content: prompt }]);
        let recommendations;
        try { recommendations = JSON.parse(content); } catch { recommendations = { raw: content }; }
        res.json({ recommendations });
    } catch (error) {
        console.error('OpenRouter API error:', error);
        res.status(500).json({ error: 'Failed to get recommendations', details: error.message });
    }
}));

router.post('/chat', asyncHandler(async (req, res) => {
    if (!OPENROUTER_API_KEY) return res.status(500).json({ error: 'OpenRouter API key not configured' });
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });
    try {
        const messages = [
            { role: 'system', content: 'You are a helpful flower and gardening assistant. Provide accurate, practical advice about flowers, plants, gardening, and floral arrangements. Be concise and friendly.' },
            ...history,
            { role: 'user', content: message }
        ];
        const reply = await callOpenRouter(messages, 300);
        res.json({ reply });
    } catch (error) {
        console.error('OpenRouter API error:', error);
        res.status(500).json({ error: 'Failed to get chat response', details: error.message });
    }
}));

// ─── NEW: Flower Expert endpoint ──────────────────────────────────────────

router.post('/flower-expert', upload.single('image'), asyncHandler(async (req, res) => {
    if (!OPENROUTER_API_KEY) return res.status(500).json({ error: 'OpenRouter API key not configured' });

    let imageUrl = null;
    if (req.file) {
        try {
            const imageData = fs.readFileSync(req.file.path);
            const base64Image = imageData.toString('base64');
            const mimeType = req.file.mimetype || 'image/jpeg';
            imageUrl = `data:${mimeType};base64,${base64Image}`;
            fs.unlinkSync(req.file.path);
        } catch (error) {
            console.error('Error processing uploaded file:', error);
            return res.status(500).json({ error: 'Failed to process image' });
        }
    } else if (req.body && req.body.imageUrl) {
        imageUrl = req.body.imageUrl;
    } else {
        return res.status(400).json({ error: 'Image file or imageUrl is required' });
    }

    const flowerExpertPrompt = `You are a world-class botanist, florist, and horticulture expert. Analyze this flower image and provide a comprehensive expert analysis.

Return ONLY valid JSON (no markdown, no extra text) with this exact structure:
{
  "flowerName": "common name of the flower",
  "scientificName": "scientific/Latin name",
  "confidence": 0.97,
  "family": "plant family name (e.g., Rosaceae, Asteraceae)",
  "category": "Flowering Plant",
  "flowerType": "Natural",
  "origin": "geographic origin of the species",
  "description": "A detailed 2-3 sentence description of the flower including its appearance, blooming habits, and notable characteristics",
  "ornamentalUses": ["Gardens", "Bouquets", "Landscaping"],
  "perfumeUses": ["Rose Oil", "Perfumes"],
  "medicinalProperties": ["Digestion", "Relaxation"],
  "foodUses": ["Rose Tea", "Rose Water"],
  "healthBenefits": ["Rich in antioxidants", "Supports skin health"],
  "careGuide": {
    "sunlight": "Full Sun or Partial Shade",
    "water": "Moderate",
    "soil": "Well-drained, loamy",
    "temperature": "15C - 28C"
  },
  "isNatural": true,
  "naturalConfidence": 0.95,
  "naturalReasons": ["Natural petal texture", "Natural color variation"],
  "artificialReasons": [],
  "similarFlowers": ["Tulip", "Peony", "Camellia", "Hibiscus"],
  "references": [
    "Royal Horticultural Society",
    "Missouri Botanical Garden",
    "Kew Gardens",
    "USDA Plant Database",
    "World Flora Online"
  ]
}

Guidelines for accuracy:
- Be specific about the species when possible
- Provide realistic confidence scores based on visual clarity
- For natural vs artificial detection, look at: petal texture, color gradients, stem details, leaf patterns, symmetry
- Include culturally and scientifically accurate uses
- Care guide values should be specific to the identified species
- similarFlowers should be 4-6 visually or botanically related species
- References should be real, authoritative botanical databases`;

    try {
        const content = await callOpenRouter([{
            role: 'user',
            content: [
                { type: 'text', text: flowerExpertPrompt },
                { type: 'image_url', image_url: { url: imageUrl } }
            ]
        }], 1500);

        let aiResult;
        try {
            aiResult = parseJsonResponse(content);
        } catch (parseError) {
            console.error('Failed to parse flower expert response:', content);
            aiResult = {
                flowerName: 'Unknown Flower', scientificName: 'Unknown', confidence: 0.5,
                family: 'Unknown', category: 'Unknown', flowerType: 'Natural', origin: 'Unknown',
                description: 'Could not fully analyze the image.',
                ornamentalUses: [], perfumeUses: [], medicinalProperties: [], foodUses: [], healthBenefits: [],
                careGuide: { sunlight: 'Partial Shade', water: 'Moderate', soil: 'Well-drained', temperature: '15C - 25C' },
                isNatural: true, naturalConfidence: 0.5, naturalReasons: [], artificialReasons: [],
                similarFlowers: [], references: []
            };
        }

        const flowerName = aiResult.flowerName || '';

        let knowledge = null;
        let marketplaceProducts = [];
        let marketplaceSellers = [];
        let articles = [];
        let careGuides = [];
        let questions = [];

        if (await dbAvailable()) {
            try {
                const fkResult = await pool.query(
                    'SELECT slug, family, origin, sunlight, water, soil, difficulty, marketplace_tags FROM learning.flower_knowledge WHERE common_name ILIKE $1 LIMIT 1',
                    [`%${flowerName}%`]
                );
                if (fkResult.rows.length) {
                    const fk = fkResult.rows[0];
                    knowledge = { slug: fk.slug, family: fk.family, origin: fk.origin, sunlight: fk.sunlight, water: fk.water, soil: fk.soil, difficulty: fk.difficulty, care_tips: null };
                    const tipsResult = await pool.query(
                        'SELECT title, description FROM learning.flower_care_tips WHERE flower_id = (SELECT id FROM learning.flower_knowledge WHERE slug = $1) ORDER BY sort_order',
                        [fk.slug]
                    );
                    if (tipsResult.rows.length) knowledge.care_tips = tipsResult.rows;

                    const benefitsResult = await pool.query(
                        'SELECT benefit_type, benefit_description AS description FROM learning.flower_benefits WHERE flower_id = (SELECT id FROM learning.flower_knowledge WHERE slug = $1) ORDER BY benefit_type, sort_order',
                        [fk.slug]
                    );
                    if (benefitsResult.rows.length) knowledge.benefits = benefitsResult.rows;
                }

                try {
                    const mpResult = await pool.query(
                        `SELECT p.id, p.name, p.price, p.description,
                                (SELECT image_url FROM marketplace.product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image,
                                u.first_name AS seller_name
                         FROM marketplace.products p
                         LEFT JOIN auth.users u ON u.id = p.seller_id
                         WHERE p.is_active = true AND (p.name ILIKE $1 OR p.description ILIKE $2)
                         LIMIT 10`,
                        [`%${flowerName}%`, `%${flowerName}%`]
                    );
                    marketplaceProducts = mpResult.rows;
                } catch {}

                const artResult = await pool.query(
                    'SELECT id, title, slug, excerpt, thumbnail_url, reading_time, published_at FROM learning.articles WHERE (title ILIKE $1 OR excerpt ILIKE $2) AND is_published = true ORDER BY published_at DESC LIMIT 5',
                    [`%${flowerName}%`, `%${flowerName}%`]
                );
                articles = artResult.rows;

                const cgResult = await pool.query(
                    'SELECT id, title, slug, excerpt, cover_image, reading_time, difficulty, plant_name FROM learning.care_guides WHERE (plant_name ILIKE $1 OR title ILIKE $2) AND is_published = true ORDER BY views DESC LIMIT 5',
                    [`%${flowerName}%`, `%${flowerName}%`]
                );
                careGuides = cgResult.rows;

                const qResult = await pool.query(
                    'SELECT id, title, slug, answer_count, views, created_at FROM qa.questions WHERE title ILIKE $1 OR content ILIKE $2 ORDER BY created_at DESC LIMIT 5',
                    [`%${flowerName}%`, `%${flowerName}%`]
                );
                questions = qResult.rows;
            } catch (err) {
                console.error('Flower expert DB enrichment error:', err.message);
            }
        }

        if (!marketplaceProducts.length) {
            const products = readJSON(path.join(__dirname, '..', 'data', 'products.json'));
            const lowerName = flowerName.toLowerCase();
            marketplaceProducts = products.filter(p => {
                const name = (p.name || '').toLowerCase();
                const desc = (p.description || '').toLowerCase();
                return name.includes(lowerName) || desc.includes(lowerName);
            }).slice(0, 10);
        }

        if (!articles.length) {
            try {
                const allArticles = readJSON(path.join(__dirname, '..', 'data', 'articles.json'));
                const lowerName = flowerName.toLowerCase();
                articles = allArticles.filter(a => {
                    const title = (a.title || '').toLowerCase();
                    const excerpt = (a.excerpt || '').toLowerCase();
                    return title.includes(lowerName) || excerpt.includes(lowerName);
                }).slice(0, 5);
            } catch {}
        }

        if (!careGuides.length) {
            try {
                const allGuides = readJSON(path.join(__dirname, '..', 'data', 'care-guides.json'));
                if (Array.isArray(allGuides)) {
                    const lowerName = flowerName.toLowerCase();
                    careGuides = allGuides.filter(g => {
                        const plant = (g.plant_name || g.title || '').toLowerCase();
                        return plant.includes(lowerName) || lowerName.includes(plant);
                    }).slice(0, 5);
                }
            } catch {}
        }

        res.json({
            ai: aiResult,
            knowledge,
            marketplace: { products: marketplaceProducts, sellers: marketplaceSellers },
            articles,
            careGuides,
            questions
        });
    } catch (error) {
        console.error('Flower expert API error:', error);
        res.status(500).json({ error: 'Failed to analyze flower', details: error.message });
    }
}));

module.exports = router;
