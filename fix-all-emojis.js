const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.mimocode') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDir(fullPath));
    } else if (entry.name.endsWith('.html') || entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function fixMojibake(content) {
  let fixed = 0;
  
  // Replace any sequence starting with the mojibake prefix
  // The pattern is: C3 B0 C5 B8 followed by varying bytes
  const regex = /\u00c3\u00b0\u00c5\u00b8[\u0000-\uffff]{0,8}/g;
  
  content = content.replace(regex, (match) => {
    fixed++;
    return '<i class="bi bi-flower1"></i>';
  });
  
  return { content, fixed };
}

const allFiles = scanDir('.');
let totalFixed = 0;

allFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('\u00c3\u00b0\u00c5\u00b8')) return;
    
    const { content: fixed, count } = fixMojibake(content);
    if (count > 0) {
      fs.writeFileSync(file, fixed, 'utf8');
      console.log('Fixed: ' + path.relative('.', file) + ' (' + count + ' icons)');
      totalFixed += count;
    }
  } catch (e) {
    console.log('Error: ' + file + ' - ' + e.message);
  }
});

console.log('\nTotal icons added: ' + totalFixed);
