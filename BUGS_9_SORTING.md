# Feature 9: Sorting

## Code Location
marketplace.html lines 263-270 (HTML), lines 440-446 (Logic)

## HTML
```html
<select class="sort-select" id="sortSelect" onchange="applyFilters()">
    <option value="newest">Newest</option>
    <option value="popular">Most Popular</option>
    <option value="rating">Best Rated</option>
    <option value="price-asc">Price: Low to High</option>
    <option value="price-desc">Price: High to Low</option>
</select>
```

## Bugs

### BUG 9.1: Newest Sort Fails When `created_at` Missing
**Severity:** HIGH

Sort logic:
```javascript
else filteredProducts.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
```

When `created_at` is missing (which it is in JSON products):
- `new Date(0)` = January 1, 1970
- All products without `created_at` are treated as epoch, so sort order becomes random/arbitrary

**Test:** Select "Newest" sort → products appear in undefined order

---

### BUG 9.2: Popular Sort Unreliable
**Severity:** MEDIUM

Sort logic:
```javascript
else if (sort === 'popular') filteredProducts.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
```

Uses `reviews` count (number of reviews) as proxy for "popularity". 

**Issue:** A product with 1 five-star review is "more popular" than a product with 100 one-star reviews. This is backwards.

**Better metric:** Use `views`, `purchases`, or weighted score `(reviews * avg_rating)`

---

### BUG 9.3: Rating Sort Doesn't Break Ties
**Severity:** LOW

Sort logic:
```javascript
else if (sort === 'rating') filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
```

If two products have the same rating (e.g., both 4.5), their order is undefined. Should have a tiebreaker like review count or date.

---

### BUG 9.4: Price Sort Doesn't Account for Currency
**Severity:** HIGH

Products can have different currencies (e.g., `currency: "GHS"` vs `currency: "USD"`).

Sort logic:
```javascript
if (sort === 'price-asc') filteredProducts.sort((a, b) => a.price - b.price);
```

**Test:** Product A: 100 USD, Product B: 50 GHS
- Sorted by price: 50 < 100, so GHS product shows first
- But 50 GHS ≠ 50 USD (different values!)

**Impact:** Price sorting is meaningless when currencies differ.

---

### BUG 9.5: Sort Doesn't Persist
**Severity:** MEDIUM

When user picks "Best Rated" sort and navigates to page 2, the sort preference isn't stored in state or URL. If they refresh, sort resets to "Newest" (default).

---

### BUG 9.6: Sort Dropdown Value Not Validated
**Severity:** LOW

No validation that sort select value is one of the expected options. If malicious code changes select to `value="DROP TABLE users"`, the code would try to access `sort === 'DROP TABLE users'`, which just fails silently.

---

### BUG 9.7: Sort Default is Not Obvious
**Severity:** LOW

When page loads, sort defaults to "Newest", but this isn't indicated to user (no `selected` attribute on first option). User doesn't know what sort is currently active.

---

### BUG 9.8: No Secondary Sort Key
**Severity:** MEDIUM

For most sorts (price, rating), there's no secondary sort key. Products with identical sort values appear in random order, making results inconsistent between page loads.

---

## Recommendations

1. Add `created_at` to JSON fallback products, use product ID as tiebreaker
2. Change "Popular" to use a weighted score: `(reviews * rating) / 10` or use actual view count
3. Add secondary sort keys for all sorts (date, review count, or ID)
4. **For price sort:** Either filter by currency first, or convert to common currency
5. Persist sort preference to URL: `?sort=price-asc`
6. Add `selected` attribute to currently active sort option
7. Add validation for sort values against whitelist
8. Show current sort visually next to dropdown ("Sorted by: Newest ✓")
