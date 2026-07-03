* Use event delegation or wait for DOMContentLoaded

**BUG #3: Search Term Not Persisted in URL**
- `loadOccasionFromURL()` checks `params.get('q')` but `applyFilters()` never updates the URL with the search term
- If use all DOM is ready
- Optional chaining `?.` silently fails if button doesn't exist

**FIX:*hop-search-btn')?.addEventListener('click', ...)`
- This runs during page load beforelyFilters()`

**BUG #2: Button Click Handler Has Timing Issue**
- Line 585: `document.querySelector('.sonce, but pagination/other filters may lose the search term

**FIX:** Store search in `selectedFilters.search` before calling `appng state
- This means: Enter key works rch` only in the button click handler
- If user presses Enter, `e.target.value.trim()` is used directly without updati the search text is stored in `selectedFilters.seaEnter in the search box calls `applyFilters()` butbutton class="btn btn-primary shop-search-btn">Search</button>
</div>
```

### Handler
Lines 584-587

### Bugs Found

**BUG #1: Search Input Not Linked to Filter State**
- Pressing h" id="heroSearch" class="shop-search-input" placeholder="Search flowers, bouquets, florists...">
    <arch-icon"></i>
    <input type="searc    <i class="bi bi-search shop-sen
`marketplace.html` lines 158-165

### Code
```html
<div class="shop-search-wrap">


## 1. HERO SEARCH FEATURE

### Locatio# Marketplace Feature Analysis - Bug Report