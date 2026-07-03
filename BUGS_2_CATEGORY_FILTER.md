# Feature 2: Category Filter

## Code Location
marketplace.html lines 233-241 (HTML), lines 409, 426 (Logic)

## HTML
```html
<label class="filter-option"><input type="checkbox" name="cat" value="bouquets"> Bouquets</label>
<label class="filter-option"><input type="checkbox" name="cat" value="roses"> Roses</label>
<label class="filter-option"><input type="checkbox" name="cat" value="tulips"> Tulips</label>
<label class="filter-option"><input type="checkbox" name="cat" value="orchids"> Orchids</label>
<label class="filter-option"><input type="checkbox" name="cat" value="lilies"> Lilies</label>
<label class="filter-option"><input type="checkbox" name="cat" value="sunflowers"> Sunflowers</label>
<label class="filter-option"><input type="checkbox" name="cat" value="plants"> Indoor Plants</label>
```

## Bugs

### BUG 2.1: Hardcoded Categories Don't Match Database
**Severity:** CRITICAL

Sidebar hardcodes: `bouquets, roses, tulips, orchids, lilies, sunflowers, plants`

But data/products.json has: `bouquets, wildflowers, orchids, succulents`

**Issue:** If database returns `category: "wildflowers"`, it won't match `value="wildflowers"` in the sidebar.

**Test:** Product with `category: "wildflowers"` → Can't be filtered by category

---

### BUG 2.2: Filter UI Checkbox Not Cleared When Applied
**Severity:** MEDIUM

When `applySidebarFilters()` runs:
```javascript
selectedFilters.categories = [...document.querySelectorAll('input[name="cat"]:checked')].map(c => c.value);
```

But if user unchecks all boxes, then clicks "Apply Filters", the function still reads previously checked boxes if DOM isn't updated.

**Issue:** Race condition between checkbox state and JS state

---

### BUG 2.3: Multiple Categories Use AND Logic Instead of OR
**Severity:** HIGH

Filter logic:
```javascript
if (selectedFilters.categories.length && !selectedFilters.categories.includes(p.category)) return false;
```

Translation: Product category MUST be in the selectedFilters array

**Example:** If user selects both "Roses" AND "Tulips":
- Shows only products with `category === "roses"` OR `category === "tulips"`
- This is actually correct OR logic

**But:** Checkbox filter label says "Categories" implying multiple filters, but UX is unclear. User might expect different behavior.

---

### BUG 2.4: Category Doesn't Persist Across Pages
**Severity:** MEDIUM

When user picks a category and goes to page 2, then page 3, the URL doesn't update with the category filter. When they refresh, they lose the category filter.

---

## Recommendations

1. Load categories dynamically from `/api/products/list/categories`
2. Change AND to OR if selecting multiple categories
3. Update URL query params when filters change
4. Sync sidebar checkboxes with filter state on render
