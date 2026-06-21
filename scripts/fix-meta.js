const fs = require('fs');
const pages = {
  'admin-flowers.html': 'Admin panel for managing flower knowledge profiles in the Flower Ecosystem',
  'admin.html': 'Admin dashboard for managing Flower Ecosystem users, products, and orders',
  'ai-scanner.html': 'AI-powered flower identification tool — upload a photo to identify flowers instantly',
  'bloom-calendar.html': 'Seasonal bloom calendar showing when flowers bloom throughout the year',
  'category-listing.html': 'Browse flowers, plants, and gardening products by category',
  'my-garden.html': 'Plan and manage your virtual garden with flower care schedules and notes',
  'privacy.html': 'Privacy policy for Flower Ecosystem',
  'terms.html': 'Terms and conditions for using Flower Ecosystem'
};
for (const [file, desc] of Object.entries(pages)) {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('name="description"')) {
    c = c.replace('<title>', '<meta name="description" content="' + desc + '">\n    <title>');
    fs.writeFileSync(file, c);
    console.log('Fixed: ' + file);
  } else {
    console.log('Already has meta: ' + file);
  }
}
