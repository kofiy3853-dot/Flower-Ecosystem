# Feature 7: Rating Filter

## Code Location
marketplace.html lines 288-294 (HTML), lines 574-579, 443 (Logic)

## HTML
```html
<div class="rating-filter" id="ratingFilter">
    <i class="bi bi-star-fill rating-star" data-rating="5"></i>
    <i class="bi bi-star-fill rating-star" data-rating="4"></i>
    <i class="bi bi-star-fill rating-star" data-rating="3"></i>
    <i class="bi bi-star-fill rating-star" data-rating="2"></i>
    <i class="bi bi-star-fill rating-star" data-rating="1"></i>
</div>
```

## Bugs

### BUG 7.1: Rating Filter Not Synced to URL
**Severity:** HIGH

`loadOccasionFromURL()` loads category, occasion, and search from URL, but NOT rating:
```javascript
const occasion = params.get('occasion');
const category = params.get('category');
const search = params.get('q') || params.get('search');
// NO: const rating = params.get('rating');
```

**Test:** User selects 4-star and above, goes to page 2, refreshes → rating filter is lost

---

### BUG 7.2: Star Selection Logic is Toggle, Not Range
**Severity:** MEDIUM

Code:
```javascript
star.addEventListener('click', () => {
    const rating = parseInt(star.dataset.rating);
    selectedFilters.rating = selectedFilters.rating === rating ? 0 : rating;
    // ... visual update
});
```

**Behavior:** Clicking "4 stars" sets filter to exactly 4. Clicking again clears it.

**User expectation:** Clicking "4 stars" probably means "4 stars and above" (i.e., >= 4), not exactly 4.

**Test:** User expects products with 5-star ratings to appear when they select 4-star, but they don't.

---

### BUG 7.3: Visual Star State Not Restored on Page Load
**Severity:** MEDIUM

When page loads, if URL had `?rating=4` (in future implementation), the stars wouldn't visually update to show "4 and above" selected. Only the filter state would be set.

---

### BUG 7.4: No "Show All Ratings" Option
**Severity:** LOW

If user filters by 5-star, then wants to see all ratings again, they must click the 5-star again to toggle it off. No "Clear" button for just this filter.

---

### BUG 7.5: Filter Logic Uses Strict Equality
**Severity:** HIGH

Filter logic:
```javascript
if (selectedFilters.rating && (p.rating || 0) < selectedFilters.rating) return false;
```

**Translation:** If filtering by rating, EXCLUDE products with rating LESS than selected.

This is actually correct for "4 stars and above" logic, BUT:

**Issue:** If user doesn't understand this, they might expect different results.

**Example:** User selects "3 stars", expects to see 3, 4, 5 stars, but might think only "exactly 3" should show.

---

### BUG 7.6: No Half-Star Support
**Severity:** LOW

Database can store ratings like 4.5, but UI only offers full stars: 1, 2, 3, 4, 5. Can't filter by 4.5+ ratings.

---

### BUG 7.7: Star Click Requires Stop Propagation
**Severity:** LOW

Each star is inside a label/div. If user clicks the star, event might bubble and trigger parent click handlers. No `event.stopPropagation()` in the handler.

---

## Recommendations

1. Add URL persistence: `?rating=4` means "4 stars and above"
2. Change toggle logic to range logic: clicking 4 means >= 4
3. Visually show a "progress" from clicked star to 5, indicating range selected
4. Show "All Ratings" or clear button next to filter
5. Display active rating filter in chip display: "Rating: 4★ & up"
6. In `loadOccasionFromURL()`, also load rating param
7. Add `event.stopPropagation()` to prevent parent handlers from firing
