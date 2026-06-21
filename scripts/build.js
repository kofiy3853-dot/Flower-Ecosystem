const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');
const DIST = path.join(SRC, 'dist');
const CSS_FILE = path.join(SRC, 'styles', 'main.css');
const JS_DIR = path.join(SRC, 'js');

function minifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s*([{}:;,])\s*/g, '$1')
        .replace(/;}/g, '}')
        .replace(/\s{2,}/g, ' ')
        .replace(/\n\s*/g, '')
        .trim();
}

function minifyJS(js) {
    return js
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\n\s*/g, '')
        .replace(/\s*([{}:=,;()+\-*/])\s*/g, '$1')
        .trim();
}

function walk(dir, base) {
    const entries = [];
    try {
        fs.readdirSync(dir, { withFileTypes: true }).forEach(d => {
            const p = path.join(dir, d.name);
            if (d.isDirectory()) entries.push(...walk(p, base));
            else if (d.isFile() && d.name.endsWith('.js')) entries.push(p);
        });
    } catch {}
    return entries;
}

console.log('Building Flower Ecosystem...\n');

if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

// Minify CSS
if (fs.existsSync(CSS_FILE)) {
    const css = fs.readFileSync(CSS_FILE, 'utf-8');
    const minified = minifyCSS(css);
    fs.mkdirSync(path.join(DIST, 'styles'), { recursive: true });
    fs.writeFileSync(path.join(DIST, 'styles', 'main.css'), minified);
    console.log(`✓ CSS: ${css.length} → ${minified.length} bytes (${(100 * minified.length / css.length).toFixed(1)}%)`);
}

// Minify JS files
const jsFiles = walk(JS_DIR, JS_DIR);
let totalSrc = 0, totalMin = 0;
jsFiles.forEach(file => {
    const js = fs.readFileSync(file, 'utf-8');
    const minified = minifyJS(js);
    const rel = path.relative(SRC, file);
    const dest = path.join(DIST, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, minified);
    totalSrc += js.length;
    totalMin += minified.length;
    console.log(`✓ ${rel}: ${js.length} → ${minified.length} bytes (${(100 * minified.length / js.length).toFixed(1)}%)`);
});

console.log(`\nTotal: ${totalSrc} → ${totalMin} bytes (${(100 * totalMin / totalSrc).toFixed(1)}%)`);
console.log(`Output: ${DIST}`);
