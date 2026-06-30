const http = require('http');

const token = process.argv[2];
if (!token) { console.error('Usage: node test-create-product.js <token>'); process.exit(1); }

const body = JSON.stringify({
    name: "Rose Test via API",
    description: "Test product with characteristics",
    price: 29.99,
    stock_quantity: 10,
    category: "Roses",
    flower_cond: "NATURAL",
    occasion: "romance",
    color: "pink",
    size: "medium",
    fragrance: "strong",
    care_level: "easy",
    sunlight: "full-sun",
    water_frequency: "weekly",
    bloom_season: "spring",
    features: ["long-lasting", "pet-safe"],
    origin: "Test farm",
    fresh: true,
    currency: "GHS"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/products',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Authorization': 'Bearer ' + token,
        'Content-Length': Buffer.byteLength(body)
    }
};

const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        const parsed = JSON.parse(data);
        console.log('Size:', parsed.size);
        console.log('Sunlight:', parsed.sunlight);
        console.log('Water:', parsed.water_frequency);
        console.log('Features:', parsed.features);
        console.log('Fragrance:', parsed.fragrance);
    });
});
req.on('error', e => console.error(e));
req.write(body);
req.end();
