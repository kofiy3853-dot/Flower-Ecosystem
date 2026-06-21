// routes/openrouter.js
// OpenRouter API integration for AI features

const express = require('express');
const router = express.Router();
const { asyncHandler, upload } = require('./middleware');

// Get OpenRouter API key from environment
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
    console.warn('OPENROUTER_API_KEY not set in environment variables. AI features will not work.');
}

/**
 * Analyze flower image using OpenRouter API
 * POST /api/openrouter/analyze-flower
 * Body: FormData with 'image' file or { imageUrl: string }
 */
router.post('/analyze-flower', upload.single('image'), asyncHandler(async (req, res) => {
    if (!OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    let imageUrl = null;

    // Handle file upload
    if (req.file) {
        // Convert uploaded file to base64 for OpenAI API
        try {
            const fs = require('fs');
            const imageData = fs.readFileSync(req.file.path);
            const base64Image = imageData.toString('base64');
            const mimeType = req.file.mimetype || 'image/jpeg';
            imageUrl = `data:${mimeType};base64,${base64Image}`;
            
            // Clean up temp file
            fs.unlinkSync(req.file.path);
        } catch (error) {
            console.error('Error processing uploaded file:', error);
            return res.status(500).json({ error: 'Failed to process image' });
        }
    } 
    // Handle imageUrl from request body
    else if (req.body && req.body.imageUrl) {
        imageUrl = req.body.imageUrl;
    } 
    else {
        return res.status(400).json({ error: 'Image file or imageUrl is required' });
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.CORS_ORIGIN || 'http://localhost:3000',
                'X-Title': 'Flower Ecosystem'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Analyze this flower image and provide the following information in JSON format: flowerName (common name), scientificName, confidence (0-1), category (e.g., "Flowering Plant", "Succulent", etc.), flowerType (e.g., "Natural", "Artificial"), reasons (array of identification reasons), careTips (array of care instructions). Respond ONLY with valid JSON, no additional text.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageUrl
                                }
                            }
                        ]
                    }],
                max_tokens: 500
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const content = data.choices[0].message.content;
        
        // Try to parse JSON response
        let analysis;
        try {
            // Remove any markdown code blocks if present
            const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            analysis = JSON.parse(cleanContent);
        } catch (parseError) {
            console.error('Failed to parse OpenRouter response:', content);
            // If parsing fails, return a fallback response
            analysis = {
                flowerName: 'Unknown Flower',
                scientificName: 'Unknown',
                confidence: 0.5,
                category: 'Unknown',
                flowerType: 'Natural',
                reasons: ['Could not analyze image properly'],
                careTips: ['Consult a florist for care instructions']
            };
        }

        res.json(analysis);
    } catch (error) {
        console.error('OpenRouter API error:', error);
        res.status(500).json({ error: 'Failed to analyze image', details: error.message });
    }
}));

/**
 * Get flower recommendations based on preferences
 * POST /api/openrouter/recommendations
 * Body: { occasion: string, color: string, budget: number }
 */
router.post('/recommendations', asyncHandler(async (req, res) => {
    if (!OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    const { occasion, color, budget } = req.body;

    try {
        const prompt = `Recommend 3-5 flower types for ${occasion || 'general use'}` +
            (color ? ` with ${color} color` : '') +
            (budget ? ` within a $${budget} budget` : '') +
            '. For each recommendation, provide: flower name, why it fits, and estimated price range. Respond in JSON format with a "recommendations" array.';

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.CORS_ORIGIN || 'http://localhost:3000',
                'X-Title': 'Flower Ecosystem'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 500
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const content = data.choices[0].message.content;
        
        let recommendations;
        try {
            recommendations = JSON.parse(content);
        } catch {
            recommendations = { raw: content };
        }

        res.json({ recommendations });
    } catch (error) {
        console.error('OpenRouter API error:', error);
        res.status(500).json({ error: 'Failed to get recommendations', details: error.message });
    }
}));

/**
 * Chat with AI assistant about flowers
 * POST /api/openrouter/chat
 * Body: { message: string, history: array }
 */
router.post('/chat', asyncHandler(async (req, res) => {
    if (!OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    const { message, history = [] } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'message is required' });
    }

    try {
        const messages = [
            {
                role: 'system',
                content: 'You are a helpful flower and gardening assistant. Provide accurate, practical advice about flowers, plants, gardening, and floral arrangements. Be concise and friendly.'
            },
            ...history,
            {
                role: 'user',
                content: message
            }
        ];

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.CORS_ORIGIN || 'http://localhost:3000',
                'X-Title': 'Flower Ecosystem'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4',
                messages,
                max_tokens: 300
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const reply = data.choices[0].message.content;

        res.json({ reply });
    } catch (error) {
        console.error('OpenRouter API error:', error);
        res.status(500).json({ error: 'Failed to get chat response', details: error.message });
    }
}));

module.exports = router;
