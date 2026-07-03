# Feature 10: Pagination

## Code Location
marketplace.html lines 515-530 (Logic)

## Code
```javascript
function renderPagination() {
    const el = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredProducts.length / perPage);
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    let html = `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&laquo; Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn${i === currentPage ? ' active' : ''}" onclick="goPage(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next &raquo;</button>`;
    el.innerHTML = html;
}

function goPage(page) {
    const totalPages = Math.ceil(filteredProducts.length / perPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderProducts();
    document.getElementById('productGrid').scrollIntoView({ behavior: 'smooth' });
}
```

## Bugs

### BUG 10.1: Disabled Buttons Still Have Click Handlers
**Severity:** MEDIUM

Buttons are marked `disabled` but still have `onclick="goPage(...)"` handlers:
```html
<button class="page-btn" onclick="goPage(${currentPage - 1})" disabled>Prev</button>
```

**Issue:** Disabled buttons shouldn't be keyboard-accessible or have click handlers fire. This is an accessibility (a11y) failure.

**Fix:** Remove `onclick` from disabled buttons or check `disabled` attribute in `goPage()`.

---

### BUG 10.2: Large Number of Pages Causes Horizontal Scroll
**Severity:** MEDIUM

If there are 100+ pages, rendering all page numbers creates a massive button row:
```html
<button>1</button><button>2</button>...<button>100</button>
```

**Expected:** Show ellipsis pattern like: `1 2 3 ... 98 99 100`

**Current:** All buttons rendered

---

### BUG 10.3: Pagination State Not Persisted
**Severity:** HIGH

When user goes to page 2 and applies a filter, pagination resets to page 1. This is correct behavior.

**But:** If user goes to page 3, then refreshes the page, they're back at page 1. No URL persistence.

**Expected:** `?page=3` or `&page=3` in URL

---

### BUG 10.4: No "Jump to Page" Input
**Severity:** LOW

With many pages, users can't jump directly to page 50. They must click through the button sequence.

---

### BUG 10.5: Active Page Button Style Not Obvious
**Severity:** LOW

Active page button has `.active` class, but styling in CSS might not make it visually distinct. Check `styles/main.css` for `.page-btn.active` styling.

---

### BUG 10.6: Scroll Behavior Can Be Jarring
**Severity:** LOW

```javascript
document.getElementById('productGrid').scrollIntoView({ behavior: 'smooth' });
```

This scrolls to the product grid, but on mobile with large filters sidebar, user might scroll to see the sidebar instead of products.

---

### BUG 10.7: No "Page X of Y" Indicator
**Severity:** LOW

Users don't see how many total pages exist. They can infer it from button count, but explicit text like "Page 2 of 47" would help.

---

### BUG 10.8: Clicking Prev/Next Without Bounds Check
**Severity:** MEDIUM

Code has bounds check in `goPage()`:
```javascript
if (page < 1 || page > totalPages) return;
```

But this check happens AFTER clicking is possible. If user rapidly clicks "Next" multiple times, the function is called multiple times even if out of bounds. Not a bug exactly, but inefficient.

---

### BUG 10.9: Dynamic Page Count Not Recalculated
**Severity:** MEDIUM

If user applies a filter and results change from 100 items (9 pages) to 20 items (2 pages), and they're on page 5:
- `currentPage = 5` still
- `renderProducts()` shows page 5 data from filtered set
- But page 5 doesn't exist anymore (only 2 pages)

The bounds check in `goPage()` prevents this, but `currentPage` isn't reset to 1 explicitly.

---

## Recommendations

1. Remove `onclick` from disabled buttons or add `e.preventDefault()` check
2. For many pages, render: `1 2 3 ... 10 11 12 ... 98 99 100`
3. Add URL persistence: Include `&page=X` in query string
4. Add "Jump to page" input: `Go to page: [_____] [Go]`
5. Make active page button visually distinct (bold, background color)
6. Improve scroll target for mobile (scroll to first filter, not grid)
7. Add "Page X of Y" text below pagination buttons
8. Ensure `currentPage = 1` when filters change dramatically
9. Add keyboard navigation: arrow keys to previous/next page
10. Consider "Load More" infinite scroll as alternative UX
