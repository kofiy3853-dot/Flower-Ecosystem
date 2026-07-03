# Feature 6: Freshness/Type Filter

## Code Location
marketplace.html lines 276-282 (HTML), lines 411, 434-440 (Logic)

## HTML
```html
<label class="filter-option"><input type="checkbox" name="type" value="fresh"> Fresh Cut</label>
<label class="filter-option"><input type="checkbox" name="type" value="potted"> Potted</label>
<label class="filter-option"><input type="checkbox" name="type" value="artificial"> Artificial</label>
<label class="filter-option"><input type="checkbox" name="type" value="dried"> Dried</label>
```

## Bugs

### BUG 6.1: CRITICAL - Data Source Mismatch
**Severity:** CRITICAL

Filter logic tries to match against `p.flower_cond`:
```javascript
const type = (p.flower_cond || '').toLowerCase();
if (selectedFilters.types.includes('fresh') && !['fresh cut', 'natural'].includes(type)) return false;
```

But product data sources:
1. **Database:** `flower_cond` enum = `NATURAL, ARTIFICIAL, PRESERVED, DRIED`
2. **JSON fallback:** `fresh: boolean` (true/false) - NO `flower_cond` field at all!

**Test:** 
- Database products: Might work
- JSON fallback products: `flower_cond` is undefined, all type filters fail

**Impact:** When DB is down, freshness filter is completely broken

---

### BUG 6.2: Checkbox Value Doesn't Match Database Enum
**Severity:** HIGH

Checkbox value: `"fresh"`
Database enum: `"NATURAL"`

Filter converts: `if (selectedFilters.types.includes('fresh') && !['fresh cut', 'natural'].includes(type))`

Translation attempt: `fresh` → check for `fresh cut` or `natural`

**Problem:** Why does `fresh` become `fresh cut` OR `natural`? Logic is unclear and fragile.

---

### BUG 6.3: No "Preserved" Option in UI
**Severity:** MEDIUM

Database supports `PRESERVED` flowers but sidebar doesn't offer it as a filter option. Users can't explicitly search for preserved flowers.

---

### BUG 6.4: Freshness Flag vs Condition Confusion
**Severity:** HIGH

Two separate concepts conflated:
- `fresh: boolean` in JSON (is it fresh-cut right now?)
- `flower_cond: enum` in DB (what type of flower is it?)

**Example:** A dried flower has `fresh: false` in JSON, but database has `flower_cond: "DRIED"`. Filter logic can't reconcile these.

---

### BUG 6.5: Multiple Types Uses OR Logic But Not Obvious
**Severity:** MEDIUM

If user selects both "Potted" and "Dried":
```javascript
if (selectedFilters.types.includes('potted') && !type.includes('potted')) return false;
if (selectedFilters.types.includes('dried') && !type.includes('dried')) return false;
```

Logic: Return false if (potted selected AND type is NOT potted) OR (dried selected AND type is NOT dried)

**Translation:** Shows products that are EITHER potted OR dried (correct OR logic)

**But:** Not obvious to users from UI

---

### BUG 6.6: Fresh Filter Shown on Cards But Not Filterable
**Severity:** MEDIUM

Product cards display:
```javascript
${p.fresh ? '<div class="shop-card-delivery"><i class="bi bi-lightning"></i> Fresh</div>' : ''}
```

So user sees "⚡ Fresh" badge on products. But if they want to FILTER by fresh, they must:
1. Know to look in "Freshness" filter section
2. Click "Fresh Cut" checkbox
3. Click "Apply Filters"

**Issue:** Two different ways to interact with same concept (fresh status) is confusing

---

### BUG 6.7: No Validation of Type Filter Data
**Severity:** LOW

If product has `flower_cond: "INVALID_VALUE"`, the filter silently treats it as not matching any type.

---

## Recommendations

1. **Normalize data:** Convert all flowers to use `flower_cond` enum in both DB and JSON
2. Add `PRESERVED` option to sidebar
3. Make "Fresh" a separate boolean filter, not part of type filter
4. For JSON fallback, calculate `flower_cond` from `fresh` and `category`
5. Show active freshness filters in chip display
6. Sync checkbox state with URL params for persistence
