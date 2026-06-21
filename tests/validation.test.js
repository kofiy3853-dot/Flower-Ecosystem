const assert = require('assert');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

function isValidPrice(price) {
  return typeof price === 'number' && price >= 0 && isFinite(price);
}

function isValidRating(rating) {
  return typeof rating === 'number' && rating >= 1 && rating <= 5;
}

function isValidProductName(name) {
  return typeof name === 'string' && name.trim().length > 0;
}

let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    errors.push(`${name}: ${e.message}`);
  }
}

// Email validation
test('valid email passes', () => {
  assert.ok(isValidEmail('user@example.com'));
  assert.ok(isValidEmail('test.user+tag@domain.co.uk'));
});

test('invalid email fails', () => {
  assert.strictEqual(isValidEmail(''), false);
  assert.strictEqual(isValidEmail('notanemail'), false);
  assert.strictEqual(isValidEmail('@domain.com'), false);
  assert.strictEqual(isValidEmail('user@'), false);
});

// Password minimum length (8 chars)
test('password >= 8 chars passes', () => {
  assert.ok(isValidPassword('12345678'));
  assert.ok(isValidPassword('a-very-long-password'));
});

test('password < 8 chars fails', () => {
  assert.strictEqual(isValidPassword('1234567'), false);
  assert.strictEqual(isValidPassword(''), false);
});

// Price >= 0
test('valid price passes', () => {
  assert.ok(isValidPrice(0));
  assert.ok(isValidPrice(10.99));
  assert.ok(isValidPrice(9999.99));
});

test('negative price fails', () => {
  assert.strictEqual(isValidPrice(-1), false);
  assert.strictEqual(isValidPrice(-0.01), false);
});

test('non-numeric price fails', () => {
  assert.strictEqual(isValidPrice('10'), false);
  assert.strictEqual(isValidPrice(null), false);
});

// Rating between 1-5
test('valid rating passes', () => {
  assert.ok(isValidRating(1));
  assert.ok(isValidRating(3));
  assert.ok(isValidRating(5));
});

test('rating out of range fails', () => {
  assert.strictEqual(isValidRating(0), false);
  assert.strictEqual(isValidRating(6), false);
  assert.strictEqual(isValidRating(-1), false);
});

test('non-numeric rating fails', () => {
  assert.strictEqual(isValidRating('3'), false);
});

// Product name required
test('non-empty product name passes', () => {
  assert.ok(isValidProductName('Rose Bouquet'));
  assert.ok(isValidProductName('A'));
});

test('empty product name fails', () => {
  assert.strictEqual(isValidProductName(''), false);
  assert.strictEqual(isValidProductName('   '), false);
});

test('non-string product name fails', () => {
  assert.strictEqual(isValidProductName(null), false);
  assert.strictEqual(isValidProductName(undefined), false);
  assert.strictEqual(isValidProductName(123), false);
});

if (errors.length > 0) {
  errors.forEach(e => console.error(`  ✗ ${e}`));
  throw new Error(`${failed} validation test(s) failed`);
}

console.log(`  ${passed} passed, ${failed} failed`);
