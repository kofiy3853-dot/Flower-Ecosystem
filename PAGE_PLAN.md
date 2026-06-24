# Flower Ecosystem - Complete Page Structure Plan

## Page Inventory (77 Total Pages)

### Core Navigation Pages (5)
1. **index.html** - Homepage
2. **marketplace.html** - Buy Flowers / Marketplace (full listing)
3. **learning.html** - Learning Center (articles & videos)
4. **community.html** - Community Forum
5. **contact.html** - Contact/About

### Feature Pages (15)
6. **sell.html** - Sell Flowers / Seller Dashboard
7. **identification.html** - Flower Identification Guide
8. **ai-scanner.html** - AI Flower Scanner
9. **florists.html** - Find Florists Directory
10. **events.html** - Events & Workshops
11. **flower-knowledge.html** - Flower Knowledge Base
12. **flower-knowledge-hub.html** - Knowledge Hub Landing
13. **care-guides.html** - Care Guides Listing
14. **gardening.html** - Gardening Tips
15. **bloom-calendar.html** - Bloom Calendar
16. **arrangements.html** - Flower Arrangements
17. **composting.html** - Composting Guide
18. **planting-calendar.html** - Planting Calendar
19. **plant-database.html** - Plant Database
20. **gallery.html** - Photo Gallery

### Detail Pages (16)
21. **product-detail.html** - Individual Product View
22. **florist-profile.html** - Individual Florist Profile
23. **article-detail.html** - Full Article View
24. **video-detail.html** - Full Video View
25. **tutorial-detail.html** - Tutorial Detail
26. **category-listing.html** - Category Listing (generic)
27. **category-iris.html** - Iris Category
28. **category-hibiscus.html** - Hibiscus Category
29. **category-roses.html** - Roses Category
30. **category-narcissus.html** - Narcissus Category
31. **category-tulips.html** - Tulips Category
32. **category-sunflower.html** - Sunflower Category
33. **event-detail.html** - Event Registration Page
34. **care-guide-detail.html** - Care Guide Detail
35. **flower-detail.html** - Flower Detail
36. **identification-detail.html** - Identification Detail

### User Account Pages (11)
37. **account.html** - User Dashboard
38. **buyer-dashboard.html** - Buyer Dashboard
39. **grower-dashboard.html** - Grower Dashboard
40. **login.html** - Login Page
41. **register.html** - Registration Page
42. **forgot-password.html** - Forgot Password
43. **cart.html** - Shopping Cart
44. **checkout.html** - Checkout Flow
45. **orders.html** - Order History
46. **favorites.html** - Saved Items
47. **notifications.html** - Notifications
48. **messages.html** - Messages

### Seller/Admin Pages (8)
49. **seller-dashboard.html** - Seller Management Panel
50. **create-listing.html** - Create New Product Listing
51. **manage-orders.html** - Seller Order Management
52. **admin.html** - Admin Dashboard
53. **admin-flowers.html** - Admin Flowers Management
54. **create-discussion.html** - Create Discussion
55. **create-story.html** - Create Success Story
56. **create-journal-entry.html** - Create Garden Journal Entry

### Community Pages (14)
57. **discussions.html** - Discussions Listing
58. **discussion-detail.html** - Discussion Detail
59. **questions.html** - Questions Listing
60. **question-detail.html** - Question Detail
61. **ask-question.html** - Ask Question
62. **success-stories.html** - Success Stories
63. **success-story-detail.html** - Success Story Detail
64. **reviews.html** - Reviews
65. **my-learning.html** - My Learning Progress
66. **my-garden.html** - My Garden
67. **garden-journal.html** - Garden Journal
68. **flower-quiz.html** - Flower Quiz
69. **quiz-detail.html** - Quiz Detail
70. **articles.html** - Articles Listing

### Utility Pages (4)
71. **search.html** - Search Results
72. **404.html** - Not Found
73. **500.html** - Server Error
74. **privacy.html** - Privacy Policy
75. **terms.html** - Terms of Service
76. **about.html** - About Us

### Course/Learning Extended (1)
77. **course-detail.html** - Course Detail

---

## Shared Components (Partials) - 10/10 Complete
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

## JavaScript Modules (13 Required)
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
- **js/identification.js** - Scanner, identification logic
- **js/garden.js** - Garden journal, planting calendar
- **js/admin.js** - Admin panel functionality

---

## Data Structure (Mock Data) - 8 Required
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
1. **Shared components & CSS/JS modules** - header, footer, auth-modal, preloader, all shared JS
2. **Core pages** - marketplace.html, learning.html, florists.html, events.html, flower-knowledge.html, care-guides.html, gardening.html
3. **Detail pages** - product-detail.html, florist-profile.html, article-detail.html, video-detail.html, category-listing.html
4. **Category pages (6)** - category-iris.html, category-hibiscus.html, category-roses.html, category-narcissus.html, category-tulips.html, category-sunflower.html
5. **User pages** - account.html, buyer-dashboard.html, grower-dashboard.html, cart.html, checkout.html, login.html, register.html, forgot-password.html, orders.html, favorites.html, notifications.html, messages.html
6. **Seller pages** - sell.html, seller-dashboard.html, create-listing.html, manage-orders.html
6. **Admin pages** - admin.html, admin-flowers.html
7. **Identification pages** - identification.html, ai-scanner.html, identification-detail.html
8. **Community pages** - community.html, discussions.html, discussion-detail.html, questions.html, question-detail.html, ask-question.html, success-stories.html, success-story-detail.html, create-discussion.html, create-story.html, reviews.html
9. **Garden/Journal pages** - my-garden.html, garden-journal.html, create-journal-entry.html, bloom-calendar.html, planting-calendar.html, plant-database.html
10. **Learning extended** - articles.html, flower-knowledge-hub.html, care-guide-detail.html, course-detail.html, tutorial-detail.html, flower-quiz.html, quiz-detail.html, my-learning.html
11. **Utility pages** - search.html, 404.html, 500.html, privacy.html, terms.html, about.html, gallery.html, arrangements.html, composting.html
12. **Course detail** - course-detail.html