const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'products.json');
const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const updated = products.map(p => ({
    ...p,
    currency: p.currency || 'GHS'
}));

fs.writeFileSync(filePath, JSON.stringify(updated, null, 4));
console.log(`Updated ${updated.length} products with GHS currency`);
