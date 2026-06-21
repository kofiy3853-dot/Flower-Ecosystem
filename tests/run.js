async function runTests() {
  const files = ['api.test.js', 'data.test.js', 'validation.test.js', 'auth.test.js', 'cart.test.js', 'products.test.js'];
  let passed = 0, failed = 0;
  for (const file of files) {
    try {
      require('./' + file);
      console.log(`✓ ${file}`);
      passed++;
    } catch (err) {
      console.log(`✗ ${file}: ${err.message}`);
      failed++;
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
runTests();
