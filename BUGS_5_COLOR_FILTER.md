# Feature 5: Color Filter

## Code Location
marketplace.html lines 260-270 (HTML), lines 415-416, 428 (Logic)

## HTML
```html
<div class="color-options">
    <div class="color-circle" style="background:#ef4444;" data-color="red" title="Red"></div>
    <div class="color-circle" style="background:#f59e0b;" data-color="yellow" title="Yellow"></div>
    <div class="color-circle" style="background:#f8f9fa; border-color:#ccc;" data-color="white" title="White"></div>
    <div class="color-circle" style="background:#8b5cf6;" data-color="purple" title="Purple"></div>
    <div class="color-circle" style="background:#ec4899;" data-color="pink" title="Pink"></div>
    <div class="color-circle" style="background:#f97316;" data-color="orange" title="Orange"></div>
</div>
```

## Bugs

### BUG 5.1: Single-Select Only, But Behavior Unclear
**Severity:** MEDIUM

Code:
```javascript
document.querySelectorAll('.color-circle').forEach(c => {
    c.addEventListener('click', () => {
        document.querySelectorAll('.color-circle').forEach(x => x.classList.remove('active'));
        c.classList.toggle('active');
    });
});
```

**Issue:** User can only pick ONE color. The UI doesn't indicate this is single-select. Expectation from visual design (color circles) suggests multi-select.

**Test:** Click red, then blue → only blue stays active. User thinks red should still be active.

---

### BUG 5.2: Color Doesn't Persist When Page Reloads
**Severity:** MEDIUM

When user selects red and goes to page 2, the red circle is still `active` visually but:
1. URL doesn't update with color param
2. On refresh, color selection is lost

---

### BUG 5.3: Product Color Data Doesn't Match Filter Options
**Severity:** HIGH

Data/products.json colors: `pink, yellow, white, red, green, purple, multi`

But sidebar only offers: `red, yellow, white, purple, pink, orange`

Missing: `green, multi` (and `orange` is in UI but no products have it)

**Test:** Product with `color: "multi"` → can't be filtered by color

---

### BUG 5.4: Color Filter Logic is Case-Sensitive
**Severity:** MEDIUM

Filter code:
```javascript
if (selectedFilters.colors.length && !selectedFilters.colors.includes(p.color)) return false;
```

If product has `color: "Red"` (capitalized) and filter is `data-color="red"`, they won't match.

---

### BUG 5.5: No Visual Indication When Color Selected
**Severity:** LOW

The `.active` class is added but the CSS styling might not be obvious to users. Check `styles/main.css` for `.color-circle.active` styling.

---

### BUG 5.6: Color Filter Applies Immediately, Others Don't
**Severity:** MEDIUM

When user clicks a color, there's NO "Apply Filters" button click needed. But other filters (category, occasion) require clicking "Apply Filters" button.

**Issue:** Inconsistent UX - some filters are real-time, others are not

**Test:** 
- Select color → immediately filters (magic)
- Select category → nothing happens (waiting for Apply button)

---

## Recommendations

1. Load colors dynamically from product data
2. Allow multi-select OR add clear indication that it's single-select
3. Persist color to URL query params (`?color=red`)
4. Make color filter apply instantly like category/occasion or require Apply button for all
5. Normalize color data (lowercase comparison)
6. Show visual chip of active color filters like "Color: Red"
