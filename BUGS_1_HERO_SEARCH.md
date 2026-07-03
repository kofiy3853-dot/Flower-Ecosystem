# Feature 1: Hero Search

## Code Location
marketplace.html lines 158-165 (HTML), lines 584-587 (Handler)

## Bugs

### BUG 1.1: Enter Key Doesn't Update Filter State
**Severity:** HIGH

When user presses Enter in search box:
```javascript
if (e.key === 'Enter') {
    selectedFilters.search = e.target.value.trim();  // ← Updates state here
    applyFilters();
}
```

But when user clicks Search button:
```javascript
selectedFilters.search = document.getElementById('heroSearch').value.trim();
```

**Issue:** If user types in search box but search box loses focus before pressing Enter, the state doesn't update properly. Also, both handlers update different property paths.

**Impact:** Inconsistent search behavior

---

### BUG 1.2: Quick Buttons Use Wrong Parameter Names
**Severity:** HIGH

Quick buttons at lines 173-176:
```html
<a href="marketplace?category=roses" class="shop-quick-btn">Roses</a>
<a href="marketplace?category=bouquets" class="shop-quick-btn">Bouquets</a>
```

But `loadOccasionFromURL()` checks:
```javascript
const category = params.get('category');
// ... later
document.querySelectorAll('input[name="cat"]')  // ← name="cat" not "category"
```

**Issue:** URL param is `category` but filter expects `cat`. They don't sync.

**Actual test:** Click "Roses" → goes to `?category=roses` → no category loads

---

### BUG 1.3: No Validation on Search Input
**Severity:** MEDIUM

Search accepts:
- Empty strings (searches entire catalog)
- Very long strings (no truncation)
- Special characters (no sanitization for display in URL)

Example: `marketplace?q=<script>alert('xss')</script>`

---

## Recommendations

1. Use single source of truth for search state
2. Sync URL params consistently (use `cat` not `category`)
3. Sanitize search input before URL encoding
