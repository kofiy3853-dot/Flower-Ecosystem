# Feature 8: Delivery Filter

## Code Location
marketplace.html lines 301-306 (HTML), lines 412, 429-433 (Logic)

## HTML
```html
<label class="filter-option"><input type="checkbox" name="delivery" value="sameday"> Same-Day Delivery</label>
<label class="filter-option"><input type="checkbox" name="delivery" value="free"> Free Delivery</label>
<label class="filter-option"><input type="checkbox" name="delivery" value="pickup"> Pickup Available</label>
```

## Bugs

### BUG 8.1: CRITICAL - Product Data Has No Delivery Field
**Severity:** CRITICAL

Filter logic:
```javascript
if (selectedFilters.delivery.length) {
    const del = (p.delivery || '').toLowerCase();
    if (selectedFilters.delivery.includes('sameday') && !del.includes('same-day') && !del.includes('sameday')) return false;
    if (selectedFilters.delivery.includes('free') && !del.includes('free')) return false;
    if (selectedFilters.delivery.includes('pickup') && !del.includes('pickup')) return false;
}
```

**Problem:** Tries to filter by `p.delivery`, but products don't have this field.

**Test:**
- User selects "Same-Day Delivery"
- Filter logic checks `(p.delivery || '').toLowerCase()` → empty string
- No products match because no product has a `delivery` field

**Result:** Delivery filter is completely broken. Always returns empty results when selected.

---

### BUG 8.2: Database Schema Has Delivery Info But Not Mapped
**Severity:** HIGH

From `sql/schema.sql`, products table has:
```sql
delivery_areas VARCHAR(100),
delivery_time VARCHAR(100),
shipping_fee NUMERIC(10,2),
pickup_available BOOLEAN
```

But the API response doesn't include these fields in the product object. The `/api/products` endpoint doesn't return them.

**Issue:** Data exists in DB but isn't exposed to frontend.

---

### BUG 8.3: No Fallback for JSON Products
**Severity:** HIGH

When DB is down, fallback is JSON products with NO delivery information at all. The filter completely fails on JSON fallback.

---

### BUG 8.4: Delivery Filter Doesn't Support Multiple Selections Clearly
**Severity:** MEDIUM

If user selects both "Same-Day Delivery" AND "Free Delivery", the logic is:
```javascript
if (selectedFilters.delivery.includes('sameday') && !del.includes('same-day')) return false;
if (selectedFilters.delivery.includes('free') && !del.includes('free')) return false;
```

**Translation:** Show products that have BOTH same-day AND free delivery.

**But:** User might expect products that have EITHER same-day OR free delivery. UX is ambiguous.

---

### BUG 8.5: Case-Sensitive String Matching
**Severity:** MEDIUM

Filter looks for `'same-day'` (hyphenated) in lowercase:
```javascript
if (selectedFilters.delivery.includes('sameday') && !del.includes('same-day') && !del.includes('sameday'))
```

If database has `delivery_areas: "Same-day delivery available"`, after `.toLowerCase()` it becomes "same-day delivery available", which DOES include "same-day", so this would actually work.

**But:** If database has `delivery_areas: "SAME_DAY"` (different format), it won't match.

---

### BUG 8.6: Checkbox Value Doesn't Match Expected String
**Severity:** MEDIUM

Checkbox: `value="sameday"` (single word)
Filter looks for: `'same-day'` (hyphenated)

So checkbox value is `sameday` but filter is looking for `same-day` in the product data. They're different.

---

### BUG 8.7: No URL Persistence for Delivery Filter
**Severity:** MEDIUM

Like rating, delivery filter selection isn't saved to URL. If user selects "Same-Day" and refreshes, filter is lost.

---

## Recommendations

1. **URGENT:** Add delivery fields to API response in `/api/products`
2. Add delivery data to JSON fallback for products
3. Create a normalized `delivery_info` object with flags: `{sameDay: boolean, free: boolean, pickup: boolean}`
4. Change filter from AND to OR logic (or clarify UX)
5. Standardize delivery data format in database
6. Add URL persistence: `?delivery=sameday,free`
7. Show delivery options as chips/badges on product cards (like the "Fresh" badge)
8. Add delivery filter to product cards so users understand what it means
