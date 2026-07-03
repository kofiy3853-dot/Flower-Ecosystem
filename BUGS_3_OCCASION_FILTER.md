# Feature 3: Occasion Filter

## Code Location
marketplace.html lines 243-250 (HTML), lines 410, 427 (Logic)

## HTML
```html
<label class="filter-option"><input type="checkbox" name="occasion" value="birthday"> Birthday</label>
<label class="filter-option"><input type="checkbox" name="occasion" value="wedding"> Wedding</label>
<label class="filter-option"><input type="checkbox" name="occasion" value="anniversary"> Anniversary</label>
<label class="filter-option"><input type="checkbox" name="occasion" value="sympathy"> Sympathy</label>
<label class="filter-option"><input type="checkbox" name="occasion" value="graduation"> Graduation</label>
```

## Bugs

### BUG 3.1: Mismatch Between Sidebar and "Shop by Occasion" Section
**Severity:** MEDIUM

Sidebar filter has: `birthday, wedding, anniversary, sympathy, graduation`

But line 316-321 "Shop by Occasion" has: `wedding, birthday, anniversary, sympathy, graduation, corporate`

**Issue:** "Corporate" is missing from sidebar filter. User can click "Corporate" in collection but can't filter by it on the same page.

**Test:** Click "Corporate" in collections → goes to `?occasion=corporate` → no products shown because sidebar doesn't have that checkbox

---

### BUG 3.2: Occasion Data in Products is Inconsistent
**Severity:** HIGH

From data/products.json:
- `"occasion": "any"` (generic)
- `"occasion": "birthday"` 
- `"occasion": "wedding"`
- `"occasion": "romance"` ← Not in sidebar!

**Issue:** If product has `occasion: "romance"`, sidebar filter can't select it.

**Impact:** Hidden products that match but can't be accessed via filters

---

### BUG 3.3: "Any Occasion" Products Not Clearly Displayed
**Severity:** MEDIUM

Products with `occasion: "any"` should show for all occasions, but filter logic:
```javascript
if (selectedFilters.occasions.length && !selectedFilters.occasions.includes(p.occasion)) return false;
```

Translation: If user picks "Birthday", only `occasion: "birthday"` products show. Products with `occasion: "any"` are HIDDEN.

**Test:** Select Birthday filter → only "birthday" products show, not "any" products

**Expected:** "Any" products should always be included when an occasion is selected

---

### BUG 3.4: No "Clear Occasion" Option
**Severity:** LOW

Sidebar has a "Clear All" button but no individual "Clear" button for occasions. User must uncheck each box individually, or click "Clear All" which clears everything.

---

## Recommendations

1. Sync sidebar occasions with shop-by-occasion section
2. Load occasions from product data dynamically
3. Handle `occasion: "any"` products specially — always include them
4. Add quick "reset this filter" buttons for each filter group
