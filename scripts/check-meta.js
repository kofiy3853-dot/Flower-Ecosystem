const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
let missing = [];
files.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  if (!c.includes('name="description"')) missing.push(f);
});
if (missing.length) {
  console.log('Still missing meta:', missing.join(', '));
} else {
  console.log('All pages have meta descriptions!');
}
