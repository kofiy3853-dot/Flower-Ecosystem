# Feature 13: Recently Viewed Section

## Code Location
marketplace.html lines 621-640 (Logic), line 313 (HTML issue)

## Code
```javascript
function saveRecentlyViewed() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) return;
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    let recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    recent = recent.filter(r => r.id !== id);
    recent.unshift({ id: product.id, name: product.name, image: product.image });
    recent = recent.slice(0, 6);
    localStorage.setItem('recentlyViewed', JSON.stringify(recent));
}

function loadRecentlyViewed() {
    const recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    const section = document.getElementById('recentSection');
    const scroll = document.getElementById('recentScroll');
    if (!recent.length || !section) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    scroll.innerHTML = recent.map(r => `
        <a href="product-detail.html?id=${r.id}" class="recent-card">
            <img src="${r.image || ''}" alt="${r.name}" loading="lazy" onerror="...">
            <div class="recent-card-name">${r.name}</div>
        </a>
    `).join('');
}
```

## Bugs

### BUG 13.1: CRITICAL - Duplicate Style Attribute
**Severity:** CRITICAL

Line 313 in HTML:
```html
<section class="section-padding bg-light" style="padding-top:2rem;padding-bottom:2rem;" id="recentSection" style="display:none;">
```

**Issue:** Two `style` attributes. The second one (`display:none`) is ignored by HTML parser.

**Result:** Section always displays, even when empty.

The JavaScript tries to hide it:
```javascript
section.style.display = 'none';
```

This works, but only after JavaScript runs. User sees flickering.

**Fix:** Remove duplicate attribute, keep second one:
```html
<section class="section-padding bg-light" style="padding-top:2rem;padding-bottom:2rem; display:none;" id="recentSection">
```

---

### BUG 13.2: Function Called on Wrong Page
**Severity:** HIGH

`saveRecentlyViewed()` is called in `renderProducts()` every time products render:
```javascript
renderProducts();
saveRecentlyViewed();
```

**But:** This function looks for `?id=` param in URL and tries to save product. It should ONLY run on `product-detail.html`, not `marketplace.html`.

**On marketplace.html:**
- URL is `marketplace.html?occasion=wedding` (no id param)
- Function returns early because `!id`
- Wasteful function call every page/filter change

**Fix:** Only call this on product detail page.

---

### BUG 13.3: Recently Viewed Doesn't Clear When Product Deleted
**Severity:** MEDIUM

If product is deleted from database but exists in localStorage, "Recently Viewed" shows stale product.

**Fix:** When loading recent items, validate they still exist in `allProducts`.

---

### BUG 13.4: localStorage Not Cleared Across Sessions
**Severity:** LOW

Recently viewed persists indefinitely until user clears browser storage. Could grow to 100+ items if not capped.

Code does cap at 6: `recent.slice(0, 6)`, so this is managed.

**But:** If user has been visiting for months, older items are old data.

**Fix:** Add timestamp and remove items older than 30 days.

---

### BUG 13.5: No XSS Protection on Product Name
**Severity:** MEDIUM

```javascript
<div class="recent-card-name">${r.name}</div>
```

Product name is not escaped. If malicious product has name: `<img src=x onerror=alert('xss')>`

The name renders as HTML.

**Fix:** Use `escapeHtml(r.name)`

---

### BUG 13.6: Image onerror Handler Inline
**Severity:** LOW

```javascript
onerror="this.src='data:image/svg+xml,<svg...>'"
```

The onerror attribute contains SVG data URL that's been escaped into the HTML. Complex and hard to maintain.

**Fix:** Use event handler instead.

---

### BUG 13.7: No Fallback If localStorage Unavailable
**Severity:** MEDIUM

Code assumes localStorage is available:
```javascript
let recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
```

If user has disabled localStorage or is in private browsing:
- `localStorage.getItem()` throws error
- Function crashes silently (no try-catch)

**Fix:** Wrap in try-catch.

---

### BUG 13.8: Section Toggles Immediately When Loaded
**Severity:** LOW

When marketplace loads and no recently viewed items exist:
```javascript
section.style.display = 'none';
```

This happens after DOM renders, causing flicker. Section briefly shows then disappears.

**Fix:** Start with `style="display:none"` in HTML, only change to `block` if items exist.

---

### BUG 13.9: Scrollbar Styling Unclear on Mobile
**Severity:** LOW

Recently viewed uses horizontal scroll like sellers section. On mobile, scroll hint is not obvious.

---

## Recommendations

1. **FIX:** Remove duplicate `style` attribute in HTML
2. Move `saveRecentlyViewed()` call to product-detail.html only
3. Validate that products in "Recently Viewed" still exist before displaying
4. Add timestamp to recently viewed items, remove items older than 30 days
5. Escape product names with `escapeHtml()`
6. Add try-catch for localStorage access
7. Use CSS to hide section instead of JavaScript
8. Consider persisting to server-side if user is logged in
9. Add "Clear Recently Viewed" button
10. Add scroll hint on mobile: "← Swipe →"
