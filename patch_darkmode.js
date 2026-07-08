const fs = require('fs');

// Fix main.css — replace hardcoded white values and remove garbled UTF-16 block at end
let mainCss = fs.readFileSync('styles/main.css', 'utf8');

// Remove any null-byte (UTF-16 garbage) block appended at the end
mainCss = mainCss.replace(/[\u0000].*/s, '').trimEnd();

// Fix hardcoded whites in source rules
mainCss = mainCss
  .replace('.shop-card { background: white;', '.shop-card { background: var(--bg-white);')
  .replace('.shop-card-wishlist { position: absolute; top: 0.75rem; right: 0.75rem; background: white;', 
           '.shop-card-wishlist { position: absolute; top: 0.75rem; right: 0.75rem; background: var(--bg-white);')
  .replace('.btn-quick-view { background: white; color: var(--text-main); }',
           '.btn-quick-view { background: var(--bg-white); color: var(--text-main); }');

// Append clean dark mode overrides (UTF-8)
const darkOverrides = `

/* ═══════════════════════════════════════════════
   DARK MODE — Global card & container overrides
   ═══════════════════════════════════════════════ */
:root.dark-mode .shop-card,
:root.dark-mode .product-card,
:root.dark-mode .card,
:root.dark-mode .modal-content,
:root.dark-mode .dash-sidebar,
:root.dark-mode .stat-card,
:root.dark-mode .section-card,
:root.dark-mode .feature-card,
:root.dark-mode .info-card,
:root.dark-mode .review-card,
:root.dark-mode .grower-card,
:root.dark-mode .seller-card,
:root.dark-mode .instructor-card,
:root.dark-mode .course-card,
:root.dark-mode .event-card,
:root.dark-mode .service-card,
:root.dark-mode .arrangement-card,
:root.dark-mode .learning-card,
:root.dark-mode .path-card,
:root.dark-mode .quiz-card,
:root.dark-mode .resource-card,
:root.dark-mode .discussion-card,
:root.dark-mode .article-card,
:root.dark-mode .member-card,
:root.dark-mode .showcase-card,
:root.dark-mode .deal-card,
:root.dark-mode .collection-card,
:root.dark-mode .flower-card,
:root.dark-mode .workshop-card,
:root.dark-mode .community-card,
:root.dark-mode .tip-card,
:root.dark-mode .step-card,
:root.dark-mode .benefit-card,
:root.dark-mode .summary-card,
:root.dark-mode .faq-item,
:root.dark-mode .builder-summary,
:root.dark-mode .ai-care-result,
:root.dark-mode [class*="-card"],
:root.dark-mode [class*="card-"],
:root.dark-mode [class*="-panel"],
:root.dark-mode [class*="-box"],
:root.dark-mode [class*="-widget"] {
    background: var(--bg-white) !important;
    border-color: var(--border-color) !important;
    color: var(--text-main) !important;
}

/* Wishlist button & quick-view — stay readable in dark mode */
:root.dark-mode .shop-card-wishlist,
:root.dark-mode .btn-quick-view {
    background: var(--bg-light) !important;
    color: var(--text-main) !important;
}

/* Product card inner glassmorphism — darken */
:root.dark-mode .product-card {
    background: rgba(22, 18, 31, 0.9) !important;
    border-color: rgba(255,255,255,0.08) !important;
}

/* Inline containers rendered by JS (faq-items, etc.) */
:root.dark-mode [style*="background:var(--bg-white)"],
:root.dark-mode [style*="background: var(--bg-white)"] {
    background: var(--bg-white) !important;
}
`;

mainCss += '\n' + darkOverrides;
fs.writeFileSync('styles/main.css', mainCss, 'utf8');
console.log('Fixed main.css — removed garbled block, replaced whites, appended clean dark overrides');

// Fix dashboard.css — toggle slider dot stays white (intentional for contrast)
// But also fix general card whites
let dashCss = fs.readFileSync('styles/dashboard.css', 'utf8');
// Line 578: toggle slider knob — this is actually fine (white dot on colored track), leave it.
fs.writeFileSync('styles/dashboard.css', dashCss, 'utf8');
console.log('dashboard.css — slider knob kept white (intentional contrast element)');

// Fix student-dashboard.css & instructor-dashboard.css calendar dot (#fff)
['styles/student-dashboard.css', 'styles/instructor-dashboard.css'].forEach(f => {
    let c = fs.readFileSync(f, 'utf8');
    // The ::after calendar dot is a small indicator on colored background — keep white; no change needed.
    console.log(f + ' — calendar dot kept white (on colored background, intentional)');
});

console.log('Done!');
