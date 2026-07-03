# Feature 12: Featured Sellers Section

## Code Location
marketplace.html lines 589-620 (Logic)

## Code
```javascript
async function loadSellers() {
    try {
        const data = await fetch('/api/products/list/florists').then(r => r.json());
        const sellers = data.florists || data || [];
        const el = document.getElementById('sellersScroll');
        if (!sellers.length) { el.innerHTML = '<p style="color:var(--text-light);">No sellers yet.</p>'; return; }
        el.innerHTML = sellers.map(s => `
            <a href="florist-profile.html?id=${s.id}" class="seller-card" style="text-decoration:none;color:inherit;">
                <div class="seller-avatar">${(s.name || '?')[0]}</div>
                <div class="seller-name">${s.name}</div>
                <div class="seller-rating">${renderStars(s.rating || 4.5)} (${s.reviews || 0})</div>
                <div class="seller-products">${s.products || 0} products</div>
                <button class="btn btn-primary btn-sm w-100">Visit Store</button>
            </a>
        `).join('');
    } catch {}
}
```

## Bugs

### BUG 12.1: Silent Failure on API Error
**Severity:** MEDIUM

```javascript
catch {}
```

Empty catch block swallows all errors. If API fails, no error message shown to users or console.

**Issue:** Sellers section mysteriously disappears if API is down. No feedback.

**Fix:** Log error and show fallback message.

---

### BUG 12.2: Seller Data Missing from API Response
**Severity:** HIGH

API endpoint `/api/products/list/florists` returns:
```javascript
{ florists: [...] }
```

But seller objects likely contain only: `id, first_name, role`

**Missing fields:** `name`, `rating`, `reviews`, `products`

**Code expects:**
```javascript
<div class="seller-name">${s.name}</div>
<div class="seller-rating">${renderStars(s.rating || 4.5)} (${s.reviews || 0})</div>
<div class="seller-products">${s.products || 0} products</div>
```

**Result:** 
- `s.name` is undefined → renders blank
- `s.rating` is undefined → defaults to 4.5 (hardcoded)
- `s.reviews` is undefined → shows "(0)"
- `s.products` is undefined → shows "0 products"

---

### BUG 12.3: Hardcoded Avatar From First Letter
**Severity:** LOW

```javascript
<div class="seller-avatar">${(s.name || '?')[0]}</div>
```

Takes first letter of seller name for avatar. If name is undefined, shows "?" character.

**Issue:** Not user-friendly. Should show actual avatar image or consistent placeholder.

---

### BUG 12.4: No Seller Profile Data Fetched
**Severity:** HIGH

Link goes to `florist-profile.html?id=${s.id}` but profile page probably needs seller data:
- Profile image
- Bio/description  
- Social links
- Products list
- Rating/reviews

But `loadSellers()` only fetches basic user info, not full seller profile. The profile page would need to make a separate API call.

**Issue:** Two separate API calls (one here, one on profile page) is inefficient.

---

### BUG 12.5: No XSS Protection on Seller Name
**Severity:** MEDIUM

```javascript
<div class="seller-name">${s.name}</div>
```

Seller name is not escaped. If seller name contains HTML: `<img src=x onerror="alert('xss')">`

The name would render as HTML and execute.

**Fix:** Use `escapeHtml(s.name)`

---

### BUG 12.6: No Fallback Image for Seller Avatar
**Severity:** LOW

If seller doesn't have a profile image, code just shows first letter. No colored background or consistent styling.

Compare to product cards which have colored placeholder SVG.

---

### BUG 12.7: "Visit Store" Button Doesn't Navigate
**Severity:** MEDIUM

```html
<a href="florist-profile.html?id=${s.id}" class="seller-card">
    ...
    <button class="btn btn-primary btn-sm w-100">Visit Store</button>
</a>
```

Button is nested inside an `<a>` tag. Click handlers:
- Click on "Visit Store" button → might trigger both link and button handlers
- Click elsewhere on card → triggers link

**Issue:** Nested interactive elements are confusing. Either use just `<a>` or just `<button>`.

---

### BUG 12.8: No Loading State
**Severity:** LOW

Unlike product grid which shows skeleton loading state, sellers section has no loader. It's blank until API returns.

---

### BUG 12.9: No Pagination for Sellers
**Severity:** MEDIUM

If there are 50 sellers, all 50 are loaded and displayed in horizontal scroll. For large lists, this:
- Slows down page load
- Wastes bandwidth
- Creates massive DOM

**Should:** Show only first 6-8 sellers, with "View all sellers" link.

---

### BUG 12.10: Horizontal Scroll on Mobile
**Severity:** LOW

Sellers display in horizontal scroll (`.sellers-scroll`), but on mobile with small screen, scrollbar might not be obvious to users.

**Should:** Show loading indicator or "← swipe to scroll →" hint.

---

## Recommendations

1. Add error logging and user-facing error message
2. Update `/api/products/list/florists` to return full seller data: name, rating, review_count, product_count, profile_image
3. Or fetch seller stats separately: product count from products table, rating from reviews
4. Escape seller name with `escapeHtml()`
5. Add seller profile image with fallback avatar
6. Restructure HTML to use either `<a>` OR `<button>`, not both
7. Add loading skeleton for sellers section
8. Paginate sellers: show 6, "Load more" or carousel
9. Show scroll hint on mobile
10. Cache seller data in localStorage or deduplicate API calls
