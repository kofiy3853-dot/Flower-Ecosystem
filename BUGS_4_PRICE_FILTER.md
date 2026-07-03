# Feature 4: Price Range Filter

## Code Location
marketplace.html lines 252-257 (HTML), lines 413-414, 442-443 (Logic)

## HTML
```html
<div class="price-range">
    <input type="number" id="priceMin" placeholder="Min" min="0">
    <span>—</span>
    <input type="number" id="priceMax" placeholder="Max" min="0">
</div>
```

## Bugs

### BUG 4.1: No Validation - Min Can Be Greater Than Max
**Severity:** HIGH

Code:
```javascript
selectedFilters.minPrice = ... Number(document.getElementById('priceMin').value) ...
selectedFilters.maxPrice = ... Number(document.getElementById('priceMax').value) ...
```

**Issue:** No check that minPrice < maxPrice

**Test:** User enters Min=100, Max=50 → filters results incorrectly

**Impact:** Results appear empty or wrong when user makes this mistake

---

### BUG 4.2: NaN Handling in Comparisons
**Severity:** MEDIUM

If user enters non-numeric text:
```javascript
if (selectedFilters.minPrice !== null && p.price < selectedFilters.minPrice) return false;
```

When minPrice is `NaN`:
- `p.price < NaN` evaluates to `false` (all comparisons fail against NaN)
- Products mysteriously disappear

**Test:** User types "abc" in Min field → no products shown

---

### BUG 4.3: No Error Feedback to User
**Severity:** MEDIUM

If price filter breaks (NaN, invalid range), no toast/alert warns the user. They just see empty results and don't know why.

---

### BUG 4.4: Decimal Prices Not Properly Handled
**Severity:** LOW

Products may have prices like `29.99` but filter is strict equality:
```javascript
p.price < selectedFilters.minPrice
```

This works, but if two products have identical decimal pricing from different sellers, there's no tie-breaker in sort.

---

### BUG 4.5: No Visual Feedback When Filters Applied
**Severity:** LOW

After applying price filter, no visual indication shows what range is active. Active filters chip display would help.

---

### BUG 4.6: Clear Button Doesn't Validate Inputs
**Severity:** LOW

`clearAllFilters()` clears the price inputs but doesn't validate they're actually cleared:
```javascript
document.getElementById('priceMin').value = '';
document.getElementById('priceMax').value = '';
```

If JavaScript fails here, silent failure.

---

## Recommendations

1. Add validation: if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) show error
2. Use `type="number"` validation with `step="0.01"` 
3. Add toast notification when invalid price entered
4. Show active price range display like "GHS 20 - GHS 50"
5. Disable "Apply Filters" button if price range is invalid
