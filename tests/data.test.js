const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DATA_DIR = path.join(__dirname, '..', 'data');

const files = [
  'products.json',
  'categories.json',
  'articles.json',
  'videos.json',
  'courses.json',
  'lessons.json',
  'quizzes.json',
  'events.json',
  'florists.json',
  'identification.json',
  'community.json',
  'gallery.json',
  'users.json',
];

let passed = 0;
let failed = 0;
const errors = [];

for (const file of files) {
  const filePath = path.join(DATA_DIR, file);
  try {
    assert.ok(fs.existsSync(filePath), `${file} does not exist`);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    if (file === 'users.json') {
      assert.ok(Array.isArray(data), `${file} should be an array`);
    } else if (file === 'community.json') {
      assert.ok(typeof data === 'object' && data !== null, `${file} should be an object`);
      assert.ok(Array.isArray(data.discussions), `${file}.discussions should be an array`);
      assert.ok(data.discussions.length > 0, `${file}.discussions should have at least 1 item`);
    } else {
      assert.ok(Array.isArray(data), `${file} should be an array`);
      assert.ok(data.length > 0, `${file} should have at least 1 item`);
    }

    passed++;
  } catch (e) {
    failed++;
    errors.push(`${file}: ${e.message}`);
  }
}

if (errors.length > 0) {
  errors.forEach(e => console.error(`  ✗ ${e}`));
  throw new Error(`${failed} data test(s) failed`);
}

console.log(`  ${passed} passed, ${failed} failed`);
