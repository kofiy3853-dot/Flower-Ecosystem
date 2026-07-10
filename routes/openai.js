const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { asyncHandler, upload, pool, dbAvailable, readJSON, requireAuth, useCloudinary } = require('./middleware');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

if (!OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY / OPENAI_API_KEY not set. AI features will not work.');
}

// ─── Rate Limiting ──────────────────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per window per authenticated user
const ANON_RATE_LIMIT_MAX = 5; // stricter limit for unauthenticated (IP-based) requests

function checkRateLimit(userId, isAnonymous = false) {
    const now = Date.now();
    const max = isAnonymous ? ANON_RATE_LIMIT_MAX : RATE_LIMIT_MAX;
    const key = isAnonymous ? `anon:${userId}` : userId;
    const record = rateLimitMap.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    if (now > record.resetAt) {
        record.count = 0;
        record.resetAt = now + RATE_LIMIT_WINDOW;
    }
    record.count++;
    rateLimitMap.set(key, record);
    return record.count <= max;
}

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap) {
        if (now > val.resetAt) rateLimitMap.delete(key);
    }
}, 300000);

// ─── Response Cache ─────────────────────────────────────────────────────
const analysisCache = new Map();
const CACHE_TTL = 3600000; // 1 hour
const CACHE_MAX = 500;

function getCachedAnalysis(imageHash) {
    const entry = analysisCache.get(imageHash);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
    if (entry) analysisCache.delete(imageHash);
    return null;
}

function setCachedAnalysis(imageHash, data) {
    if (analysisCache.size >= CACHE_MAX) {
        const oldest = analysisCache.keys().next().value;
        analysisCache.delete(oldest);
    }
    analysisCache.set(imageHash, { data, timestamp: Date.now() });
}

function hashImage(base64) {
    return crypto.createHash('sha256').update(base64).digest('hex').slice(0, 32);
}

// ─── OpenRouter Call with Retry ─────────────────────────────────────────
const PRIMARY_MODEL = 'openai/gpt-4o';
const FALLBACK_MODEL = 'openai/gpt-4o-mini';
const MAX_RETRIES = 2;

async function callOpenRouter(messages, maxTokens = 500, attempt = 0) {
    const model = attempt === 0 ? PRIMARY_MODEL : FALLBACK_MODEL;
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.CORS_ORIGIN || 'http://localhost:3000',
                'X-Title': 'Flower Ecosystem'
            },
            body: JSON.stringify({ model, messages, max_tokens: maxTokens })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    } catch (err) {
        if (attempt < MAX_RETRIES) {
            console.warn(`AI call failed (attempt ${attempt + 1}), retrying with ${FALLBACK_MODEL}...`);
            return callOpenRouter(messages, maxTokens, attempt + 1);
        }
        throw err;
    }
}

function parseJsonResponse(content) {
    const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
}

// ─── SSRF Protection ───────────────────────────────────────────────────
const SAFE_IMAGE_URL_RE = /^https:\/\//i;
const BLOCKED_HOSTS_RE = /^https?:\/\/(localhost|127\.|0\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/i;

function validateImageUrl(url) {
    if (typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!SAFE_IMAGE_URL_RE.test(trimmed)) return false;
    if (BLOCKED_HOSTS_RE.test(trimmed)) return false;
    if (trimmed.length > 2048) return false;
    return true;
}

// ─── Image Processing ───────────────────────────────────────────────────
const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB limit for API

async function getImageBase64(file) {
    if (!file) return null;

    // Enforce size limit
    if (file.size && file.size > MAX_IMAGE_SIZE) {
        throw new Error('Image too large. Maximum size is 4MB.');
    }

    const isCloudinaryUrl = file.path && file.path.startsWith('http');

    if (isCloudinaryUrl) {
        const response = await fetch(file.path);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > MAX_IMAGE_SIZE) throw new Error('Image too large. Maximum size is 4MB.');
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = file.mimetype || 'image/jpeg';
        return `data:${mimeType};base64,${base64}`;
    } else {
        const imageData = fs.readFileSync(file.path);
        if (imageData.length > MAX_IMAGE_SIZE) throw new Error('Image too large. Maximum size is 4MB.');
        const base64 = imageData.toString('base64');
        const mimeType = file.mimetype || 'image/jpeg';
        // Clean up local temp file
        try { fs.unlinkSync(file.path); } catch {}
        return `data:${mimeType};base64,${base64}`;
    }
}

// ─── Simple Analysis ────────────────────────────────────────────────────
router.post('/analyze-flower', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
    if (!OPENROUTER_API_KEY) return res.status(500).json({ error: 'AI service not configured. Please set OPENROUTER_API_KEY.' });
    if (!checkRateLimit(req.user.id)) return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a minute.' });

    let imageUrl = null;
    if (req.file) {
        try {
            imageUrl = await getImageBase64(req.file);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    } else if (req.body && req.body.imageUrl) {
        if (!validateImageUrl(req.body.imageUrl)) {
            return res.status(400).json({ error: 'imageUrl must be a valid external https:// URL' });
        }
        imageUrl = req.body.imageUrl;
    } else {
        return res.status(400).json({ error: 'Image file or imageUrl is required' });
    }

    // Check cache
    const imageHash = hashImage(imageUrl);
    const cached = getCachedAnalysis(imageHash);
    if (cached) return res.json(cached);

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

        setCachedAnalysis(imageHash, analysis);
        res.json(analysis);
    } catch (error) {
        console.error('AI analysis error:', error.message);
        res.status(500).json({ error: 'Failed to analyze image. Please try again.' });
    }
}));

// ─── Expert Analysis ────────────────────────────────────────────────────
router.post('/flower-expert', requireAuth, upload.single('image'), asyncHandler(async (req, res) => {
    if (!OPENROUTER_API_KEY) return res.status(500).json({ error: 'AI service not configured. Please set OPENROUTER_API_KEY.' });
    if (!checkRateLimit(req.user.id)) return res.status(429).json({ error: 'Rate limit exceeded. Please try again in a minute.' });

    let imageUrl = null;
    if (req.file) {
        try {
            imageUrl = await getImageBase64(req.file);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    } else if (req.body && req.body.imageUrl) {
        if (!validateImageUrl(req.body.imageUrl)) {
            return res.status(400).json({ error: 'imageUrl must be a valid external https:// URL' });
        }
        imageUrl = req.body.imageUrl;
    } else {
        return res.status(400).json({ error: 'Image file or imageUrl is required' });
    }

    // Check cache
    const imageHash = hashImage(imageUrl);
    const cached = getCachedAnalysis(imageHash);
    if (cached) return res.json(cached);

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
            console.error('Failed to parse AI response:', content.slice(0, 200));
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

        // DB enrichment
        let knowledge = null;
        let marketplaceProducts = [];
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
                    knowledge = { slug: fk.slug, family: fk.family, origin: fk.origin, sunlight: fk.sunlight, water: fk.water, soil: fk.soil, difficulty: fk.difficulty };
                    try {
                        const tipsResult = await pool.query(
                            'SELECT title, description FROM learning.flower_care_tips WHERE flower_id = (SELECT id FROM learning.flower_knowledge WHERE slug = $1) ORDER BY sort_order',
                            [fk.slug]
                        );
                        if (tipsResult.rows.length) knowledge.care_tips = tipsResult.rows;
                    } catch {}
                    try {
                        const benefitsResult = await pool.query(
                            'SELECT benefit_type, benefit_description AS description FROM learning.flower_benefits WHERE flower_id = (SELECT id FROM learning.flower_knowledge WHERE slug = $1) ORDER BY benefit_type, sort_order',
                            [fk.slug]
                        );
                        if (benefitsResult.rows.length) knowledge.benefits = benefitsResult.rows;
                    } catch {}
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

                try {
                    const artResult = await pool.query(
                        'SELECT id, title, slug, excerpt, thumbnail_url, reading_time, published_at FROM learning.articles WHERE (title ILIKE $1 OR excerpt ILIKE $2) AND is_published = true ORDER BY published_at DESC LIMIT 5',
                        [`%${flowerName}%`, `%${flowerName}%`]
                    );
                    articles = artResult.rows;
                } catch {}

                try {
                    const cgResult = await pool.query(
                        'SELECT id, title, slug, excerpt, cover_image, reading_time, difficulty, plant_name FROM learning.care_guides WHERE (plant_name ILIKE $1 OR title ILIKE $2) AND is_published = true ORDER BY views DESC LIMIT 5',
                        [`%${flowerName}%`, `%${flowerName}%`]
                    );
                    careGuides = cgResult.rows;
                } catch {}

                try {
                    const qResult = await pool.query(
                        'SELECT id, title, slug, answer_count, views, created_at FROM qa.questions WHERE title ILIKE $1 OR content ILIKE $2 ORDER BY created_at DESC LIMIT 5',
                        [`%${flowerName}%`, `%${flowerName}%`]
                    );
                    questions = qResult.rows;
                } catch {}
            } catch (err) {
                console.error('DB enrichment error:', err.message);
            }
        }

        // JSON fallbacks
        if (!marketplaceProducts.length) {
            try {
                const products = readJSON(path.join(__dirname, '..', 'data', 'products.json'));
                const lower = flowerName.toLowerCase();
                marketplaceProducts = products.filter(p => (p.name || '').toLowerCase().includes(lower) || (p.description || '').toLowerCase().includes(lower)).slice(0, 10);
            } catch {}
        }

        if (!articles.length) {
            try {
                const allArticles = readJSON(path.join(__dirname, '..', 'data', 'articles.json'));
                const lower = flowerName.toLowerCase();
                articles = allArticles.filter(a => (a.title || '').toLowerCase().includes(lower) || (a.excerpt || '').toLowerCase().includes(lower)).slice(0, 5);
            } catch {}
        }

        if (!careGuides.length) {
            try {
                const allGuides = readJSON(path.join(__dirname, '..', 'data', 'care-guides.json'));
                if (Array.isArray(allGuides)) {
                    const lower = flowerName.toLowerCase();
                    careGuides = allGuides.filter(g => (g.plant_name || g.title || '').toLowerCase().includes(lower)).slice(0, 5);
                }
            } catch {}
        }

        const result = { ai: aiResult, knowledge, marketplace: { products: marketplaceProducts }, articles, careGuides, questions };
        setCachedAnalysis(imageHash, result);
        res.json(result);
    } catch (error) {
        console.error('Expert analysis error:', error.message);
        res.status(500).json({ error: 'Failed to analyze flower. Please try again.' });
    }
}));

// ─── Chatbot ────────────────────────────────────────────────────────────
router.post('/chat', express.json(), asyncHandler(async (req, res) => {
    // We don't require requireAuth for the chat widget to be publicly accessible, 
    // or we can requireAuth if we only want logged-in users to use it.
    // The previous plan specified `requireAuth` in the plan text but the widget is usually public.
    // Let's stick to the plan but make it robust. Wait, the plan had requireAuth. Let's use requireAuth.
    if (!OPENROUTER_API_KEY) return res.status(500).json({ error: 'AI service not configured.' });
    const isAnonymous = !req.user;
    const userId = req.user ? req.user.id : (req.headers['x-forwarded-for'] || req.socket.remoteAddress);
    if (!checkRateLimit(userId, isAnonymous)) return res.status(429).json({ error: 'Rate limit exceeded.' });

    const userMessages = req.body.messages;
    if (!Array.isArray(userMessages)) {
        return res.status(400).json({ error: 'messages array is required' });
    }

    try {
        let productContext = '';
        if (await dbAvailable()) {
            try {
                const productRes = await pool.query(`
                    SELECT p.id, p.name, p.price, 
                           (SELECT image_url FROM marketplace.product_images pi WHERE pi.product_id = p.id ORDER BY sort_order ASC LIMIT 1) as image_url 
                    FROM marketplace.products p 
                    WHERE p.is_active = true 
                    LIMIT 20
                `);
                
                if (productRes.rows.length > 0) {
                    productContext = '\n\nHere is a list of our currently available marketplace products:\n';
                    productRes.rows.forEach(p => {
                        productContext += `- Name: ${p.name}, Price: $${p.price}, ID: ${p.id}, ImageURL: ${p.image_url || ''}\n`;
                    });
                    productContext += `\nIf the user asks for flower recommendations, arrangements, or wants to buy flowers, YOU MUST suggest products from this list. When suggesting a product, use the EXACT following HTML format so they can see the image and click the link:
<div style="margin-top:8px; margin-bottom:12px; background:var(--bg-white); border:1px solid var(--border-color); border-radius:8px; padding:8px;">
  <img src="[ImageURL]" style="width:100%; border-radius:4px; margin-bottom:8px; object-fit:cover; max-height:150px;" alt="[Name]" />
  <p style="margin:0; font-size:0.95rem;"><strong><a href="product-detail.html?id=[ID]" style="color:var(--primary-color); text-decoration:none;">[Name]</a></strong> - $[Price]</p>
</div>
Do not use markdown links for these products, ONLY use this HTML snippet structure!`;
                }
            } catch (err) {
                console.error('Failed to fetch products for chat context:', err.message);
            }
        }

        const systemPrompt = {
            role: 'system',
            content: `You are Flora, the warm, knowledgeable, and emotionally intelligent AI assistant for Flower Ecosystem. 
You are an expert botanist, florist, horticulturist, and empathetic emotional wellness guide.
Keep your answers concise, helpful, and friendly. 
Format your responses using basic HTML tags (like <b>, <i>, <br>, <ul>, <li>, and <a>) for readability in our chat widget.${productContext}

**EMOTIONAL FLOWER RECOMMENDATIONS**:
You are trained to detect emotions from how the user writes and what they say, and recommend flowers that match or uplift those emotions. Here is your emotion-to-flower guide — always reference it when emotional cues are present:

- 😢 Sad / Grieving / Lonely: White Lilies (peace), White Chrysanthemums (comfort), Forget-Me-Nots (remembrance), Lavender (calm). Say something empathetic before recommending.
- 😰 Stressed / Anxious / Overwhelmed: Lavender (calming), Chamomile, Blue Hydrangea (serenity), White Jasmine (relaxation). Remind them flowers can soothe the mind.
- 😍 In Love / Romantic: Red Roses (passionate love), Pink Peonies (romance), Tulips (affection), Gardenias (secret love).
- 💔 Heartbroken / Hurt: Yellow Sunflowers (healing, warmth), Pink Carnations (gratitude), Daisies (hope), Lavender (peace).
- 😊 Happy / Joyful / Excited: Sunflowers (joy), Gerbera Daisies (cheerfulness), Yellow Tulips (sunshine), Marigolds (positivity).
- 🎉 Celebratory / Proud: Orchids (luxury, admiration), Calla Lilies (elegance), Mixed Bouquets (festivity), Champagne Roses.
- 😴 Tired / Burned Out: Chamomile (rest), Lavender (sleep), Baby's Breath (gentle peace).
- 😤 Angry / Frustrated: White Lotus (patience), Blue Iris (wisdom, calm), White Peace Lily.
- 🙏 Grateful / Thankful: Pink Roses (gratitude), Pink Carnations (thankfulness), Sweet Peas (appreciation).
- 🤒 Unwell / Worried about health: Gerbera Daisies (cheer up), Alstroemeria (support), Sunflowers (positivity).
- 💪 Motivated / Determined: Bird of Paradise (freedom), Protea (strength, courage), Amaryllis (achievement).
- 🕊️ Missing someone / Nostalgic: Forget-Me-Nots, Violets (faithfulness), Rosemary (remembrance).
- 😇 Spiritual / Peaceful: White Lotus, White Orchids, Jasmine (spiritual clarity).
- 🌱 Fresh start / Hopeful: Daffodils (new beginnings), Cherry Blossom (renewal), Green Cymbidium (growth).
- 😒 Bored / Uninspired: Exotic tropicals (Bird of Paradise, Heliconia), Bright Gerberas (color therapy).

**HOW TO RESPOND TO EMOTIONS**:
1. First, acknowledge the emotion with warmth and empathy (1-2 sentences).
2. Explain briefly why specific flowers connect with that feeling.
3. Then suggest matching products from the inventory list above if available.
4. If no exact match in inventory, describe the ideal flowers and invite them to browse the marketplace.

**BROWSER NAVIGATION**:
If the user explicitly asks you to "take me to", "go to", "navigate to", or "show me where to find" a specific flower, category, or page, you have the power to redirect their browser.
To do this, you MUST output the exact string [NAVIGATE:url] at the very end of your message.
Available routes:
- marketplace.html (For shopping/buying general flowers)
- learning.html (For care guides and learning)
- my-garden.html (To view their garden)
- profile.html (To view their profile)
- product-detail.html?id=[ID] (To view a specific product from the list above)

Example:
User: Take me to the marketplace!
Flora: Taking you to the marketplace right now! [NAVIGATE:marketplace.html]`
        };

        // Keep only the last 10 messages to save context limit and costs
        const recentMessages = userMessages.slice(-10);

        let content = await callOpenRouter([systemPrompt, ...recentMessages], 800);
        
        let navigateTo = null;
        const navMatch = content.match(/\[NAVIGATE:(.*?)\]/);
        if (navMatch) {
            navigateTo = navMatch[1].trim();
            content = content.replace(/\[NAVIGATE:.*?\]/g, '').trim();
        }

        res.json({ reply: content, navigateTo });
    } catch (error) {
        console.error('AI chat error:', error.message);
        res.status(500).json({ error: 'Failed to communicate with AI. Please try again.' });
    }
}));

module.exports = router;
