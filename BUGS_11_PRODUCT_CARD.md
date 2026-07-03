# Feature 11: Product Card Rendering

## Code Location
marketplace.html lines 477-502 (Logic)

## Code
```javascript
const img = p.image || (p.images && p.images[0]) || 'data:image/svg+xml,...';
return `
    <div class="shop-card" onclick="viewProduct('${p.id}')">
        <div class="shop-card-img">
            <img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy">
            ${p.badge ? `<div class="shop-card-badge">${escapeHtml(p.badge)}</div>` : ''}
            <button class="shop-card-wishlist" onclick="event.stopPropagation()"><i class="bi bi-heart"></i></button>
            <div class="shop-card-actions">
                <button class="btn-quick-view" onclick="event.stopPropagation();viewProduct('${p.id}')"><i class="bi bi-eye"></i> View</button>
                <button class="btn-add-cart" onclick="event.stopPropagation();addToCart('${p.id}','${escapeHtml(p.name).replace(/'/g,"\\'")}',${p.price},'${img}')"><i class="bi bi-cart-plus"></i> Add</button>
            </div>
        </div>
        <div class="shop-card-body">
            <div class="shop-card-seller">${escapeHtml(p.seller || 'Seller')}</div>
            <div class="shop-card-name">${escapeHtml(p.name)}</div>
            <div class="shop-card-rating">${renderStars(p.rating || 0)} <span>(${p.reviews || 0})</span></div>
            ...
```

## Bugs

### BUG 11.1: XSS Vulnerability in onclick Handlers
**Severity:** HIGH

Image URL is unescaped in onclick:
```javascript
onclick="...addToCart('${p.id}','${escapeHtml(p.name).replace(/'/g,"\\'")}',${p.price},'${img}')"
```

If `img` contains a quote or backslash: `https://example.com/image"onclick="alert('xss')".jpg`

The string breaks and injects JavaScript:
```html
<button onclick="...addToCart('...', '...', ..., 'https://example.com/image"onclick="alert('xss')".jpg')">
```

**Fix:** Use `escapeHtml(img)` or better yet, use `data-*` attributes instead of inline onclick.

---

### BUG 11.2: Product ID Not Escaped in onclick
**Severity:** MEDIUM

```javascript
onclick="viewProduct('${p.id}')"
```

If product ID contains single quote: `'OR'1'='1`

The onclick becomes: `viewProduct(''OR'1'='1')`

While this doesn't execute JavaScript, it might cause unexpected behavior in the function.

**Fix:** Escape or use data attributes.

---

### BUG 11.3: WishList Button Non-Functional
**Severity:** HIGH

```html
<button class="shop-card-wishlist" onclick="event.stopPropagation()"><i class="bi bi-heart"></i></button>
```

No `data-id`, no event handler, no localStorage save. Button is cosmetic only.

**Compare to:** `js/shared/cart.js` has a proper `.wishlist-btn` handler, but this card uses different class name `.shop-card-wishlist`.

**Issue:** Two wishlist implementations that don't match.

---

### BUG 11.4: renderStars Not Consistent Across Codebase
**Severity:** MEDIUM

There are TWO `renderStars()` functions:

1. **api.js:**
```javascript
function renderStars(rating) {
    const full = Math.floor(rating || 0);
    const half = (rating || 0) - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '&#9733;'.repeat(full) + (half ? '&#9734;' : '') + '&#9734;'.repeat(empty);
}
```
Returns HTML entities: `★★★★☆`

2. **marketplace.html:**
```javascript
function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let html = '';
    for (let i = 0; i < full; i++) html += '<i class="bi bi-star-fill"></i>';
    if (half) html += '<i class="bi bi-star-half"></i>';
    ...
    return html;
}
```
Returns HTML with icons: `<i>` tags

**Test:** On marketplace, stars show as icons. On product detail (using api.js), stars might show as entities. Inconsistent UX.

---

### BUG 11.5: Price Formatting Not Localized
**Severity:** LOW

```javascript
<div class="shop-card-price">${p.currency || 'GHS'} ${Number(p.price).toFixed(2)}</div>
```

Always uses `.` for decimal. In locales that use `,` (e.g., German: 29,99), this looks wrong.

**Fix:** Use `toLocaleString()` with locale support.

---

### BUG 11.6: No Stock Status Display
**Severity:** MEDIUM

Product cards don't show if item is in stock. If `stock_quantity` is 0, there's no "Out of Stock" badge.

**Issue:** Users might add out-of-stock items to cart, then face error at checkout.

---

### BUG 11.7: Badge Escaping But Not Sanitizing
**Severity:** LOW

```javascript
${p.badge ? `<div class="shop-card-badge">${escapeHtml(p.badge)}</div>` : ''}
```

Badge is escaped (good), but if badge is empty string, it still renders:
```html
<div class="shop-card-badge"></div>
```

Empty badge div takes up space. Should use:
```javascript
${p.badge ? `<div class="shop-card-badge">${escapeHtml(p.badge)}</div>` : ''}
```

This is already correct, but if `p.badge = ""`, the condition `p.badge` is falsy and it won't render. So this is actually fine.

---

### BUG 11.8: No Lazy Loading Performance Optimization
**Severity:** LOW

Images use `loading="lazy"` which is good, but no `width` and `height` attributes. This causes layout shift as images load.

**Fix:** Add `width="220" height="220"` (or actual dimensions) to img tag.

---

### BUG 11.9: Seller Name Might Be Undefined
**Severity:** MEDIUM

```javascript
<div class="shop-card-seller">${escapeHtml(p.seller || 'Seller')}</div>
```

If `p.seller` is undefined, it falls back to "Seller". But in database response, seller name comes from a JOIN:
```sql
u.first_name || ' ' || u.last_name AS seller
```

If this isn't properly constructed, it could be "null" (string) or null (value).

---

### BUG 11.10: Card Click Navigation Not Accessible
**Severity:** MEDIUM

```html
<div class="shop-card" onclick="viewProduct('${p.id}')">
```

Div is not keyboard-accessible. User can't tab to it and press Enter. Should be:
```html
<a href="product-detail.html?id=${p.id}" class="shop-card">
```

Or add keyboard handler:
```javascript
if (e.key === 'Enter' || e.key === ' ') viewProduct(...)
```

---

## Recommendations

1. **Use data attributes instead of inline onclick:**
   ```html
   <div class="shop-card" data-id="${p.id}">
   ```
   Then use event delegation in JS.

2. Escape all user-provided values (id, image, name)

3. Implement wishlist functionality properly (use `.wishlist-btn` from cart.js pattern)

4. Choose ONE `renderStars()` implementation and export it globally

5. Add stock status display and prevent adding out-of-stock items

6. Add lazy loading dimensions to prevent layout shift

7. Make card keyboard-accessible (use `<a>` tag or add tabindex)

8. Normalize seller data to ensure it always exists

9. Use `toLocaleString()` for price formatting

10. Use data-* attributes for all onclick data to prevent XSS
