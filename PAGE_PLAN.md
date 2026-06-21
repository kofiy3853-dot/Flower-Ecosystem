# Flower Ecosystem - Complete Page Structure Plan

## Page Inventory from index.html Analysis

### Core Navigation Pages (from navbar)
1. **index.html** - Homepage (EXISTS)
2. **marketplace.html** - Buy Flowers / Marketplace (full listing)
3. **learning.html** - Learning Center (articles & videos)
4. **community.html** - Community Forum
5. **contact.html** - Contact/About (footer links)

### Feature Pages (from explore cards)
6. **sell.html** - Sell Flowers / Seller Dashboard
7. **identification.html** - Flower Identification Guide
8. **florists.html** - Find Florists Directory
9. **events.html** - Events & Workshops

### Detail Pages (linked from cards/grids)
10. **product-detail.html** - Individual Product View
11. **florist-profile.html** - Individual Florist Profile
12. **article-detail.html** - Full Article View
13. **video-detail.html** - Full Video View
14. **category.html** - Category Listing (Iris, Hibiscus, Roses, etc.)
15. **event-detail.html** - Event Registration Page

### User Account Pages
16. **account.html** - User Dashboard (orders, favorites, settings)
17. **login.html** - Login Page
18. **register.html** - Registration Page
19. **cart.html** - Shopping Cart
20. **checkout.html** - Checkout Flow
21. **orders.html** - Order History
22. **favorites.html** - Saved Items

### Utility Pages
23. **search.html** - Search Results
24. **seller-dashboard.html** - Seller Management Panel
25. **create-listing.html** - Create New Product Listing
26. **manage-orders.html** - Seller Order Management

### Category Pages (6 from categories section)
27. **category-iris.html**
28. **category-hibiscus.html**
29. **category-roses.html**
30. **category-narcissus.html**
31. **category-tulips.html**
32. **category-sunflower.html**

---

## Shared Components (Partials)
- **components/header.html** - Navbar (with auth state)
- **components/footer.html** - Footer
- **components/auth-modal.html** - Login/Register Modal
- **components/preloader.html** - Page Preloader
- **components/product-card.html** - Reusable Product Card
- **components/florist-card.html** - Reusable Florist Card
- **components/article-card.html** - Reusable Article Card
- **components/video-card.html** - Reusable Video Card
- **components/event-card.html** - Reusable Event Card

---

## JavaScript Modules
- **js/shared/header.js** - Navbar functionality (search, cart, theme, mobile menu)
- **js/shared/auth.js** - Auth modal, login/register forms
- **js/shared/cart.js** - Cart management (add, remove, update, persist)
- **js/shared/theme.js** - Dark mode toggle
- **js/shared/animations.js** - Scroll reveal, counter animations
- **js/shared/api.js** - Mock API layer for data
- **js/marketplace.js** - Filters, sorting, pagination
- **js/product-detail.js** - Image gallery, quantity, reviews
- **js/seller-dashboard.js** - Listing management, order tracking
- **js/learning.js** - Tabs, filters, video player
- **js/florists.js** - Search, filters, map view
- **js/events.js** - Calendar, registration
- **js/community.js** - Forum threads, posts, replies
- **js/account.js** - Dashboard tabs, form handling
- **js/checkout.js** - Multi-step form, payment

---

## Data Structure (Mock Data)
- **data/products.json** - 50+ flower products
- **data/categories.json** - 50+ flower categories
- **data/florists.json** - 20+ florist profiles
- **data/articles.json** - 30+ learning articles
- **data/videos.json** - 20+ video tutorials
- **data/events.json** - 15+ events
- **data/identification.json** - Identification guides
- **data/users.json** - Mock user accounts

---

## Build Order (Dependencies)
1. Shared components & CSS/JS modules
2. Core pages: marketplace.html, learning.html, florists.html, events.html
3. Detail pages: product-detail.html, florist-profile.html, article-detail.html, video-detail.html
4. Category pages (6)
4. User pages: account.html, cart.html, checkout.html, login.html, register.html
6. Seller pages: sell.html, seller-dashboard.html, create-listing.html
4. Identification guide pages
5. Community page
6. Search & utility pages