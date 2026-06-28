// js/shared/api.js
const localData = {};
localData['admin'] = {
    "users": [
        { "id": "u1", "name": "Jane Doe", "email": "jane@example.com", "role": "buyer", "joined": "Jan 2026", "status": "active", "orders": 12, "reports": 0 },
        { "id": "u2", "name": "Ofosu Stephen", "email": "stephen@example.com", "role": "seller", "joined": "Feb 2026", "status": "active", "orders": 48, "reports": 1 },
        { "id": "u3", "name": "Rexford Ayisi", "email": "rexford@example.com", "role": "seller", "joined": "Mar 2026", "status": "pending", "orders": 0, "reports": 0 },
        { "id": "u4", "name": "Mary Owusu", "email": "mary@example.com", "role": "buyer", "joined": "Apr 2026", "status": "active", "orders": 5, "reports": 0 },
        { "id": "u5", "name": "Kwame Boateng", "email": "kwame@example.com", "role": "seller", "joined": "May 2026", "status": "suspended", "orders": 3, "reports": 4 },
        { "id": "u6", "name": "Ama Serwaa", "email": "ama@example.com", "role": "buyer", "joined": "May 2026", "status": "active", "orders": 8, "reports": 0 },
        { "id": "u7", "name": "Yaw Asare", "email": "yaw@example.com", "role": "grower", "joined": "Jun 2026", "status": "pending", "orders": 0, "reports": 0 },
        { "id": "u8", "name": "Efia Jackson", "email": "efia@example.com", "role": "buyer", "joined": "Jun 2026", "status": "banned", "orders": 2, "reports": 7 }
    ],
    "sellerVerifications": [
        { "id": "v1", "name": "Rexford Ayisi", "email": "rexford@example.com", "business": "Tropical Blooms Co.", "applied": "10 Jun 2026", "status": "pending", "documents": true, "rating": 0 },
        { "id": "v2", "name": "Nadia Okonkwo", "email": "nadia@example.com", "business": "Luxury Events Floristry", "applied": "8 Jun 2026", "status": "pending", "documents": true, "rating": 0 },
        { "id": "v3", "name": "Akua Nyarko", "email": "akua@example.com", "business": "Corporate Bloom", "applied": "5 Jun 2026", "status": "reviewing", "documents": true, "rating": 0 },
        { "id": "v4", "name": "Esi Amoako", "email": "esi@example.com", "business": "Wildflower Studio", "applied": "1 Jun 2026", "status": "approved", "documents": true, "rating": 4.6 },
        { "id": "v5", "name": "Yaw Boateng", "email": "yaw@example.com", "business": "Orchid Paradise", "applied": "28 May 2026", "status": "approved", "documents": true, "rating": 4.8 }
    ],
    "productApprovals": [
        { "id": "pa1", "name": "Premium Orchids Deluxe", "seller": "Orchid Paradise", "price": 59.99, "submitted": "12 Jun 2026", "status": "pending", "category": "orchids", "image": "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?q=80&w=200&auto=format&fit=crop" },
        { "id": "pa2", "name": "Dried Lavender Wreath", "seller": "Provence Fields", "price": 24.99, "submitted": "11 Jun 2026", "status": "pending", "category": "wildflowers", "image": "https://images.unsplash.com/photo-1499789500731-7f1c040cd617?q=80&w=200&auto=format&fit=crop" },
        { "id": "pa3", "name": "Rose Gift Box", "seller": "Rose Garden Co.", "price": 44.99, "submitted": "10 Jun 2026", "status": "reviewing", "category": "roses", "image": "https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=200&auto=format&fit=crop" },
        { "id": "pa4", "name": "Succulent Wall Art", "seller": "Desert Blooms", "price": 32.50, "submitted": "8 Jun 2026", "status": "approved", "category": "succulents", "image": "https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=200&auto=format&fit=crop" },
        { "id": "pa5", "name": "Wedding Arch Package", "seller": "Floral Dreams Studio", "price": 199.99, "submitted": "5 Jun 2026", "status": "rejected", "category": "bouquets", "image": "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=200&auto=format&fit=crop" }
    ],
    "moderation": [
        { "id": "m1", "type": "review", "author": "Kwame A.", "content": "Great product but shipping was slow. Would buy again.", "reported": "12 Jun 2026", "status": "pending", "flags": 3, "reason": "spam" },
        { "id": "m2", "type": "discussion", "author": "Anonymous", "content": "Check out my shop at flowers-4-u.com â€” best deals!", "reported": "11 Jun 2026", "status": "pending", "flags": 5, "reason": "promotion" },
        { "id": "m3", "type": "review", "author": "FlowerLover99", "content": "These photos are stolen from my Etsy shop.", "reported": "10 Jun 2026", "status": "reviewing", "flags": 2, "reason": "copyright" },
        { "id": "m4", "type": "discussion", "author": "GrowerJane", "content": "Does anyone know where to buy rare orchid seeds?", "reported": "8 Jun 2026", "status": "cleared", "flags": 1, "reason": "none" },
        { "id": "m5", "type": "review", "author": "FakeReviewBot", "content": "Amazing! Best flowers ever!!! Buy now!!! www.fake-flowers.net", "reported": "7 Jun 2026", "status": "pending", "flags": 8, "reason": "spam" }
    ],
    "reports": [
        { "id": "r1", "type": "User Report", "description": "User repeatedly posting spam links in discussions", "reporter": "Moderator", "date": "12 Jun 2026", "priority": "high", "status": "open" },
        { "id": "r2", "type": "Product Report", "description": "Listed product images do not match actual item", "reporter": "Buyer", "date": "11 Jun 2026", "priority": "medium", "status": "open" },
        { "id": "r3", "type": "Seller Report", "description": "Seller not fulfilling orders â€” 4 complaints this week", "reporter": "System", "date": "10 Jun 2026", "priority": "high", "status": "investigating" },
        { "id": "r4", "type": "Content Report", "description": "Review contains offensive language", "reporter": "User", "date": "9 Jun 2026", "priority": "low", "status": "resolved" },
        { "id": "r5", "type": "Technical Issue", "description": "Checkout page not loading on mobile devices", "reporter": "User", "date": "8 Jun 2026", "priority": "high", "status": "resolved" }
    ]
}
;
localData['articles'] = [
    {
        "id": "a1",
        "title": "The Ultimate Rose Care Guide",
        "tag": "Guide",
        "category": "Flower Care",
        "readTime": "8 min read",
        "author": "Flora Williams",
        "description": "Learn the secrets to extending the vase life of your premium cut roses and keeping them fresh for up to 2 weeks.",
        "image": "images/1701165.jpg",
        "content": "Roses are among the most beloved flowers in the world. To keep them fresh, start with a clean vase and fresh water. Cut stems at a 45-degree angle to maximize water uptake. Remove any leaves below the waterline to prevent bacterial growth. Change the water every two days and add a drop of bleach to prevent bacteria."
    },
    {
        "id": "a2",
        "title": "Seasonal Flower Arrangement Ideas",
        "tag": "Seasonal",
        "category": "Arrangement Techniques",
        "readTime": "6 min read",
        "author": "James Bloom",
        "description": "Discover how to create stunning seasonal arrangements using locally available blooms throughout the year.",
        "image": "images/Florists_Review_October_2024.1_66fdb9da3ed6c.jpg",
        "content": "Seasonal flowers not only look beautiful but are also more sustainable and cost-effective. In spring, embrace tulips, daffodils and hyacinths. Summer brings sunflowers, dahlias and zinnias. Autumn offers chrysanthemums and marigolds, while winter is perfect for holly berries and amaryllis."
    },
    {
        "id": "a3",
        "title": "Beginner's Guide to Floristry",
        "tag": "Beginner",
        "category": "Beginner Floristry",
        "readTime": "10 min read",
        "author": "Sarah Chen",
        "description": "Everything you need to know about starting your floristry journey â€” from tools to techniques.",
        "image": "images/gld0314c_Bouquets-page-002.jpg",
        "content": "Starting out in floristry can feel overwhelming, but with the right tools and mindset, anyone can create beautiful arrangements. Begin with a sharp pair of floral scissors, floral foam, and a selection of focal flowers, filler flowers, and greenery. Master the basics of proportion and balance before moving on to complex designs."
    },
    {
        "id": "a4",
        "title": "How to Grow Orchids at Home",
        "tag": "Growing Tips",
        "category": "Flower Care",
        "readTime": "7 min read",
        "author": "Amara Singh",
        "description": "Orchids have a reputation for being difficult, but with these simple tips you'll have them blooming all year.",
        "image": "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?q=80&w=600&auto=format&fit=crop",
        "content": "Orchids thrive in indirect light and need well-draining potting mix. Water sparingly â€” once a week is usually enough. Feed monthly with a balanced orchid fertilizer. After blooming, cut the spike above a node to encourage re-blooming. With patience, your orchid will reward you with another stunning display."
    },
    {
        "id": "a5",
        "title": "Wedding Flower Trends 2026",
        "tag": "Trends",
        "category": "Wedding Floristry",
        "readTime": "5 min read",
        "author": "Emma Laurent",
        "description": "From sustainable blooms to bold color palettes, here are the hottest wedding flower trends for this year.",
        "image": "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=600&auto=format&fit=crop",
        "content": "2026 wedding flowers are all about sustainability and personalization. Dried flower elements are still popular, mixed with fresh blooms for textured bouquets. Bold jewel tones are replacing muted pastels, and foliage-heavy arrangements with minimal flowers are a major trend for eco-conscious couples."
    },
    {
        "id": "a6",
        "title": "Succulents: The Low-Maintenance Choice",
        "tag": "Guide",
        "category": "Flower Care",
        "readTime": "4 min read",
        "author": "Priya Nair",
        "description": "Why succulents are perfect for busy people who love plants but can't always keep up with watering.",
        "image": "https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=600&auto=format&fit=crop",
        "content": "Succulents store water in their leaves, making them perfect for forgetful plant owners. They thrive in bright, indirect light and well-draining soil. Water deeply but infrequently â€” about once every two weeks in summer, and once a month in winter. Avoid overwatering, which is the most common cause of succulent death."
    },
    {
        "id": "a7",
        "title": "Starting Your Floristry Business",
        "tag": "Guide",
        "category": "Business Skills",
        "readTime": "12 min read",
        "author": "David Osei",
        "description": "A step-by-step guide to launching and growing a successful floristry business from the ground up.",
        "image": "https://images.unsplash.com/photo-1664575602276-acd073f104c1?q=80&w=600&auto=format&fit=crop",
        "content": "Starting a floristry business requires careful planning. Begin with a solid business plan covering your target market, pricing strategy, and startup costs. Register your business, secure necessary permits, and set up your workspace. Build relationships with wholesale suppliers and invest in quality tools. Market your services through social media, local partnerships, and a professional website."
    },
    {
        "id": "a8",
        "title": "Event Decoration with Flowers",
        "tag": "Guide",
        "category": "Event Decorations",
        "readTime": "9 min read",
        "author": "Nadia Kwarteng",
        "description": "Transform any event space with stunning floral decorations â€” from intimate gatherings to grand celebrations.",
        "image": "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=600&auto=format&fit=crop",
        "content": "Event floral decoration is about creating an atmosphere. Start by understanding the venue and the event's theme. Use focal points like entrance arches, centerpieces, and stage decorations. Consider lighting to enhance your floral arrangements. For large events, create a plan that balances budget with impact, using high-impact flowers for key areas and filler flowers elsewhere."
    },
    {
        "id": "a9",
        "title": "How to Spot Fake Roses: Real vs Silk",
        "tag": "Identification",
        "category": "Beginner Floristry",
        "readTime": "7 min read",
        "author": "Maya Torres",
        "description": "Learn the definitive methods for distinguishing real roses from high-quality silk replicas using touch, smell, and stem analysis.",
        "image": "https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=600&auto=format&fit=crop",
        "content": "Real roses and high-quality silk replicas can be remarkably difficult to tell apart. This guide will teach you the professional techniques florists use to distinguish them. Start by examining the thorns â€” real rose thorns are woody, sharp, and irregularly spaced. Silk roses have smooth, plastic thorns that feel uniform. Next, test the petals. Natural rose petals have a velvety texture with subtle color gradients from the center outward. Silk petals feel smooth and synthetic, with uniform coloring. The scent test is revealing â€” real roses have a distinct, multi-layered fragrance. Even scented silk roses only produce a surface-level aroma. Finally, examine the stem cut: real stems are fibrous and moist, while silk stems are smooth wire wrapped in tape."
    },
    {
        "id": "a10",
        "title": "Silk vs Fresh Flowers: The Complete Comparison",
        "tag": "Comparison",
        "category": "Arrangement Techniques",
        "readTime": "9 min read",
        "author": "Liam Frost",
        "description": "A comprehensive guide comparing silk and fresh flowers across material quality, longevity, cost, and best use cases.",
        "image": "https://images.unsplash.com/photo-1567691482090-4cc36f5721f6?q=80&w=600&auto=format&fit=crop",
        "content": "Choosing between silk and fresh flowers depends on your specific needs. This comparison covers every important factor. Longevity: Fresh flowers last 5-14 days with proper care. Silk flowers can last years with minimal maintenance. Cost: Fresh flowers are typically purchased per stem and require regular replacement. Quality silk flowers have a higher upfront cost but last much longer, making them more economical for long-term decor. Appearance: Modern silk flowers have become incredibly realistic, but they lack the subtle imperfections and natural fragrance of fresh blooms. Maintenance: Fresh flowers require watering, pruning, and temperature control. Silk flowers simply need occasional dusting. Best uses: Fresh flowers are ideal for weddings, events, and gifts where fragrance and authenticity matter. Silk flowers excel in permanent installations, outdoor spaces, and locations where maintenance is difficult."
    },
    {
        "id": "a11",
        "title": "Preserved Flower Guide: Care and Identification",
        "tag": "Guide",
        "category": "Flower Care",
        "readTime": "10 min read",
        "author": "Iris Nakamura",
        "description": "Everything you need to know about preserved flowers: how they're made, how to identify them, and how to care for them.",
        "image": "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=80&w=600&auto=format&fit=crop",
        "content": "Preserved flowers are fresh flowers that have undergone a treatment process to maintain their appearance for months or years. The most common method is glycerin preservation, where the natural sap in the stem and petals is replaced with a glycerin solution. This keeps the flowers soft and flexible indefinitely. To identify preserved flowers, check the texture: preserved petals feel slightly leathery or rubbery compared to fresh petals. The stem will be dry and may feel greasy from the glycerin. Preserved flowers have no natural fragrance; they may smell faintly of glycerol or have been lightly scented. Unlike dried flowers, preserved blooms remain flexible and won't crumble when touched. Care is minimal: keep them away from direct sunlight to prevent fading, avoid moisture to prevent mold, and dust gently with a soft brush. With proper care, preserved flowers can maintain their beauty for 1-3 years."
    }
]
;
localData['categories'] = [
    {
        "id": "cat-bouquets",
        "name": "Bouquets",
        "tagline": "Curated arrangements for every moment",
        "image": "https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "cat-roses",
        "name": "Roses",
        "tagline": "Timeless romance in every petal",
        "image": "https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "cat-orchids",
        "name": "Orchids",
        "tagline": "Exotic & sophisticated blooms",
        "image": "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "cat-wildflowers",
        "name": "Wildflowers",
        "tagline": "Natural & free-spirited",
        "image": "https://images.unsplash.com/photo-1444021465936-c6ca81d39b84?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "cat-succulents",
        "name": "Succulents",
        "tagline": "Low maintenance, high beauty",
        "image": "https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "cat-plants",
        "name": "Indoor Plants",
        "tagline": "Green your living space",
        "image": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=600&auto=format&fit=crop"
    }
]
;
localData['community'] = {
    "discussions": [
        {
            "id": "d1",
            "title": "Best roses for humid climates?",
            "category": "Flower Care",
            "author": "Maya Torres",
            "avatar": "ðŸŒ¸",
            "replies": 24,
            "views": 412,
            "lastActive": "2 hours ago",
            "pinned": true,
            "excerpt": "I'm setting up a rose garden in Florida and struggling with mildew. Any recommendations for heat-tolerant, disease-resistant varieties?"
        },
        {
            "id": "d2",
            "title": "How do I price wedding arrangements?",
            "category": "Selling Tips",
            "author": "James Bloom",
            "avatar": "ðŸŒ»",
            "replies": 18,
            "views": 289,
            "lastActive": "5 hours ago",
            "pinned": false,
            "excerpt": "Just starting my floristry business and a bride asked for a quote on centerpieces. How do you calculate pricing for weddings?"
        },
        {
            "id": "d3",
            "title": "Silk flowers for outdoor events â€” yay or nay?",
            "category": "Arrangements",
            "author": "Priya Nair",
            "avatar": "ðŸŒ·",
            "replies": 31,
            "views": 523,
            "lastActive": "1 day ago",
            "pinned": false,
            "excerpt": "Client wants an all-silk arrangement for an outdoor garden wedding. Concerned about UV fading and wind damage. Thoughts?"
        },
        {
            "id": "d4",
            "title": "Where to buy bulk peonies in season?",
            "category": "Buying Advice",
            "author": "Liam Frost",
            "avatar": "ðŸŒº",
            "replies": 12,
            "views": 198,
            "lastActive": "2 days ago",
            "pinned": false,
            "excerpt": "Looking for wholesale peony suppliers for spring. Open to local farms or online distributors with good shipping practices."
        },
        {
            "id": "d5",
            "title": "Composting flower waste â€” best practices",
            "category": "Gardening",
            "author": "Amara Singh",
            "avatar": "ðŸŒ¿",
            "replies": 9,
            "views": 156,
            "lastActive": "3 days ago",
            "pinned": false,
            "excerpt": "Running a small flower farm and want to compost all our green waste. Anyone have a system that works well for high-volume composting?"
        }
    ],
    "questions": [
        {
            "id": "q1",
            "title": "Why are my orchid leaves turning yellow?",
            "category": "Flower Care",
            "author": "Chen Wei",
            "answers": 7,
            "votes": 15,
            "timeAgo": "1 day ago"
        },
        {
            "id": "q2",
            "title": "Can I use regular potting soil for succulents?",
            "category": "Gardening",
            "author": "Rosa Martinez",
            "answers": 4,
            "votes": 11,
            "timeAgo": "3 days ago"
        },
        {
            "id": "q3",
            "title": "What's the average markup for retail flower shops?",
            "category": "Selling Tips",
            "author": "David Osei",
            "answers": 9,
            "votes": 23,
            "timeAgo": "1 week ago"
        },
        {
            "id": "q4",
            "title": "Best flowers for a first-date bouquet?",
            "category": "Buying Advice",
            "author": "Nadia Kwarteng",
            "answers": 12,
            "votes": 31,
            "timeAgo": "1 week ago"
        }
    ],
    "successStories": [
        {
            "id": "s1",
            "title": "From Hobby to Full-Time Florist",
            "author": "Sarah Chen",
            "avatar": "ðŸŒ¹",
            "role": "Florist, Portland",
            "story": "Started selling arrangements at a local farmers market. Within two years, I opened my own shop and now employ three part-time assistants. The community here gave me the confidence to take the leap.",
            "image": "https://images.unsplash.com/photo-1567691482090-4cc36f5721f6?q=80&w=600&auto=format&fit=crop",
            "likes": 234,
            "comments": 45
        },
        {
            "id": "s2",
            "title": "Won 'Best Garden Design' at City Show",
            "author": "Emma Laurent",
            "avatar": "ðŸŒ¼",
            "role": "Garden Designer, Austin",
            "story": "Applied the companion planting techniques I learned from this community and won first place at the Austin Garden Show. Thank you to everyone who shared their tips!",
            "image": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=600&auto=format&fit=crop",
            "likes": 189,
            "comments": 32
        },
        {
            "id": "s3",
            "title": "Grew 500 Tulips for Charity Event",
            "author": "Iris Nakamura",
            "avatar": "ðŸŒ¸",
            "role": "Volunteer Grower, Seattle",
            "story": "Organized a neighborhood tulip-growing project and donated all 500 blooms to local nursing homes. The planning advice from this community was invaluable.",
            "image": "https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop",
            "likes": 312,
            "comments": 67
        }
    ],
    "challenges": [
        {
            "id": "c1",
            "name": "Spring Centerpiece Challenge",
            "participants": 342,
            "entries": 89,
            "endsIn": "12 days",
            "prize": "Featured on homepage",
            "description": "Create your best spring-themed centerpiece using at least three seasonal flowers. Share your process and final arrangement."
        },
        {
            "id": "c2",
            "name": "Best Rose Photo",
            "participants": 215,
            "entries": 56,
            "endsIn": "5 days",
            "prize": "$50 gift card",
            "description": "Capture the most stunning rose photograph. Any variety, any setting. Judged on composition, lighting, and creativity."
        },
        {
            "id": "c3",
            "name": "30-Day Flower Journal",
            "participants": 128,
            "entries": 0,
            "endsIn": "Starts in 3 days",
            "prize": "Premium plan upgrade",
            "description": "Document your garden or flower care routine for 30 consecutive days. Share weekly updates and a final recap."
        }
    ]
}
;
localData['events'] = [
    {
        "id": "e1",
        "title": "Advanced Arrangement Techniques Workshop",
        "category": "Workshop",
        "day": "15",
        "month": "Jul",
        "date": "15 Jul 2026",
        "location": "Accra, Ghana",
        "price": "Free",
        "spots": 24,
        "description": "Learn professional arrangement methods from master florists. Hands-on session covering structure, colour theory, and mechanics.",
        "image": "https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "e2",
        "title": "Spring Flower Showcase & Exhibition",
        "category": "Exhibition",
        "day": "22",
        "month": "Jul",
        "date": "22 Jul 2026",
        "location": "Kumasi, Ghana",
        "price": "$10",
        "spots": 200,
        "description": "Celebrate spring with the region's finest floral displays from over 50 growers and florists.",
        "image": "https://images.unsplash.com/photo-1507290439931-a861b5a38200?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "e3",
        "title": "Wedding Flower Planning 101",
        "category": "Webinar",
        "day": "05",
        "month": "Aug",
        "date": "5 Aug 2026",
        "location": "Online (Zoom)",
        "price": "Free",
        "spots": 500,
        "description": "Expert tips for planning and executing stunning wedding flower designs on any budget.",
        "image": "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "e4",
        "title": "Succulent Terrarium Building",
        "category": "Workshop",
        "day": "18",
        "month": "Aug",
        "date": "18 Aug 2026",
        "location": "Takoradi, Ghana",
        "price": "$25",
        "spots": 15,
        "description": "Build your own beautiful succulent terrarium to take home. All materials included.",
        "image": "https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "e5",
        "title": "Floral Photography Masterclass",
        "category": "Webinar",
        "day": "02",
        "month": "Sep",
        "date": "2 Sep 2026",
        "location": "Online (Live)",
        "price": "$15",
        "spots": 100,
        "description": "Capture your floral arrangements beautifully with smartphone or DSLR. Learn lighting, composition and editing.",
        "image": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "e6",
        "title": "Accra International Flower Show",
        "category": "Flower Show",
        "day": "10",
        "month": "Oct",
        "date": "10 Oct 2026",
        "location": "Accra International Conference Centre",
        "price": "$20",
        "spots": 1000,
        "description": "The largest flower show in West Africa featuring international exhibitors, competitive displays, and rare plant auctions.",
        "image": "https://images.unsplash.com/photo-1567691482090-4cc36f5721f6?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "e7",
        "title": "Sustainable Floristry Certification",
        "category": "Training Program",
        "day": "08",
        "month": "Nov",
        "date": "8 Nov 2026",
        "location": "Online + In-Person",
        "price": "$199",
        "spots": 30,
        "description": "A 4-week certified program covering eco-friendly floristry practices, from foam-free mechanics to local sourcing.",
        "image": "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "e8",
        "title": "Cape Coast Floral Exhibition",
        "category": "Exhibition",
        "day": "14",
        "month": "Nov",
        "date": "14 Nov 2026",
        "location": "Cape Coast, Ghana",
        "price": "$8",
        "spots": 150,
        "description": "A coastal exhibition showcasing tropical flower varieties grown in the Central Region with live arrangement demonstrations.",
        "image": "https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "e9",
        "title": "Bridal Bouquet Workshop",
        "category": "Workshop",
        "day": "21",
        "month": "Nov",
        "date": "21 Nov 2026",
        "location": "Kumasi, Ghana",
        "price": "$35",
        "spots": 12,
        "description": "Create your own bridal bouquet under expert guidance. Choose from seasonal blooms and learn wiring, taping, and finishing techniques.",
        "image": "https://images.unsplash.com/photo-1526045612212-70caf35c14df?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "e10",
        "title": "Flower Farming for Beginners",
        "category": "Training Program",
        "day": "05",
        "month": "Dec",
        "date": "5 Dec 2026",
        "location": "Online (Zoom)",
        "price": "$49",
        "spots": 50,
        "description": "A 2-day intensive training on starting your own cut-flower farm. Covers soil prep, planting schedules, pest management, and harvesting.",
        "image": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "e11",
        "title": "Holiday Centerpiece Webinar",
        "category": "Webinar",
        "day": "12",
        "month": "Dec",
        "date": "12 Dec 2026",
        "location": "Online (Live)",
        "price": "Free",
        "spots": 300,
        "description": "Learn to create stunning holiday centerpieces using seasonal greenery, berries, and festive accents. Live Q&A included.",
        "image": "https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=600&auto=format&fit=crop"
    },
    {
        "id": "e12",
        "title": "Rare Blooms Flower Show",
        "category": "Flower Show",
        "day": "18",
        "month": "Jan",
        "date": "18 Jan 2027",
        "location": "Botanical Gardens, Aburi",
        "price": "$15",
        "spots": 500,
        "description": "An exclusive showcase of rare and exotic flower varieties from across Africa, including orchids, proteas, and indigenous wildflowers.",
        "image": "https://images.unsplash.com/photo-1507290439931-a861b5a38200?q=80&w=600&auto=format&fit=crop"
    }
]
;
localData['florists'] = [
    {
        "id": "f1",
        "name": "Ofosu Stephen",
        "location": "Akim Oda, Eastern Region",
        "specialty": "Wedding & Event Floristry",
        "rating": 5.0,
        "reviews": 124,
        "products": 48,
        "phone": "+233 20 555 0101",
        "email": "stephen.ofosu@example.com",
        "description": "Specializing in luxury wedding floristry for over 12 years. Known for dramatic installations and romantic garden-style arrangements.",
        "image": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop",
        "portfolio": [
            "https://images.unsplash.com/photo-1567691482090-4cc36f5721f6?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=400&auto=format&fit=crop"
        ]
    },
    {
        "id": "f2",
        "name": "Rexford Ayisi",
        "location": "Koforidua, Eastern Region",
        "specialty": "Tropical & Exotic Blooms",
        "rating": 4.5,
        "reviews": 89,
        "products": 31,
        "phone": "+233 20 555 0102",
        "email": "rexford.ayisi@example.com",
        "description": "Passionate about rare tropical flowers. Sources directly from local growers and specializes in exotic, colourful arrangements.",
        "image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop",
        "portfolio": [
            "https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1526045612212-70caf35c14df?q=80&w=400&auto=format&fit=crop"
        ]
    },
    {
        "id": "f3",
        "name": "Danquah Isaac",
        "location": "Kasoa, Central Region",
        "specialty": "Organic & Sustainable Flowers",
        "rating": 5.0,
        "reviews": 205,
        "products": 62,
        "phone": "+233 20 555 0103",
        "email": "isaac.danquah@example.com",
        "description": "A pioneer in sustainable floristry. All flowers are organically grown using regenerative farming practices with zero waste.",
        "image": "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400&auto=format&fit=crop",
        "portfolio": [
            "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1471899236350-e3016bf1e69e?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=400&auto=format&fit=crop"
        ]
    },
    {
        "id": "f4",
        "name": "Darko Emmanuel",
        "location": "Swedru, Central Region",
        "specialty": "Dried Flowers & Arrangements",
        "rating": 5.0,
        "reviews": 156,
        "products": 55,
        "phone": "+233 20 555 0104",
        "email": "emmanuel.darko@example.com",
        "description": "Master of dried and preserved floral art. Creates long-lasting arrangements using sustainably sourced dried materials.",
        "image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop",
        "portfolio": [
            "https://images.unsplash.com/photo-1494972308805-463bc619d34d?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1470509037662-253afb3100f9?q=80&w=400&auto=format&fit=crop"
        ]
    },
    {
        "id": "f5",
        "name": "Abena Mensah",
        "location": "Accra, Greater Accra",
        "specialty": "Bouquets & Gift Arrangements",
        "rating": 4.8,
        "reviews": 312,
        "products": 77,
        "phone": "+233 20 555 0105",
        "email": "abena.mensah@example.com",
        "description": "Accra's most sought-after florist for bespoke bouquets and corporate floral gifts. Known for elegant, modern designs.",
        "image": "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?q=80&w=400&auto=format&fit=crop",
        "portfolio": [
            "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?q=80&w=400&auto=format&fit=crop"
        ]
    },
    {
        "id": "f6",
        "name": "Kwame Asante",
        "location": "Kumasi, Ashanti Region",
        "specialty": "Indoor Plants & Succulents",
        "rating": 4.7,
        "reviews": 98,
        "products": 43,
        "phone": "+233 20 555 0106",
        "email": "kwame.asante@example.com",
        "description": "Specialist in indoor plants and succulent arrangements. Offers plant styling consultations and maintenance services.",
        "image": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&auto=format&fit=crop",
        "portfolio": [
            "https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1468327768560-75b778cbb551?q=80&w=400&auto=format&fit=crop"
        ]
    },
    {
        "id": "f7",
        "name": "Nadia Okonkwo",
        "location": "Abuja, Nigeria",
        "specialty": "Luxury Event Floristry",
        "rating": 4.9,
        "reviews": 178,
        "products": 34,
        "phone": "+234 80 555 0201",
        "email": "nadia.okonkwo@example.com",
        "description": "Award-winning luxury event florist serving high-end weddings and corporate galas across West Africa.",
        "image": "https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?q=80&w=400&auto=format&fit=crop",
        "portfolio": [
            "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1567691482090-4cc36f5721f6?q=80&w=400&auto=format&fit=crop"
        ]
    },
    {
        "id": "f8",
        "name": "Esi Amoako",
        "location": "Cape Coast, Central Region",
        "specialty": "Native Wildflower Arrangements",
        "rating": 4.6,
        "reviews": 67,
        "products": 28,
        "phone": "+233 20 555 0108",
        "email": "esi.amoako@example.com",
        "description": "Celebrating Ghana's native wildflowers through rustic, natural arrangements. Forages and grows her own blooms sustainably.",
        "image": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop",
        "portfolio": [
            "https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=400&auto=format&fit=crop"
        ]
    },
    {
        "id": "f9",
        "name": "Yaw Boateng",
        "location": "Sunyani, Bono Region",
        "specialty": "Orchid Specialist",
        "rating": 4.8,
        "reviews": 143,
        "products": 52,
        "phone": "+233 20 555 0109",
        "email": "yaw.boateng@example.com",
        "description": "Dedicated exclusively to orchids. Grows over 200 varieties and creates stunning orchid displays for homes, offices, and events.",
        "image": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop",
        "portfolio": [
            "https://images.unsplash.com/photo-1526045612212-70caf35c14df?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1471899236350-e3016bf1e69e?q=80&w=400&auto=format&fit=crop"
        ]
    },
    {
        "id": "f10",
        "name": "Akua Nyarko",
        "location": "Tema, Greater Accra",
        "specialty": "Corporate & Office Floral Design",
        "rating": 4.4,
        "reviews": 82,
        "products": 36,
        "phone": "+233 20 555 0110",
        "email": "akua.nyarko@example.com",
        "description": "Providing weekly floral maintenance and seasonal rotation for corporate offices, hotels, and luxury residences.",
        "image": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop",
        "portfolio": [
            "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=400&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=400&auto=format&fit=crop"
        ]
    }
]
;
localData['gallery'] = [
    {
        "id": "g1",
        "title": "Rustic Barn Wedding Bouquet",
        "category": "Wedding Flowers",
        "author": "Emma Laurent",
        "image": "https://images.unsplash.com/photo-1567691482090-4cc36f5721f6?q=80&w=600&auto=format&fit=crop",
        "description": "A hand-tied bouquet featuring garden roses, lavender, and eucalyptus wrapped in burlap and lace.",
        "likes": 234,
        "saved": false,
        "featured": true
    },
    {
        "id": "g2",
        "title": "Modern Birthday Centerpiece",
        "category": "Birthday Arrangements",
        "author": "Priya Nair",
        "image": "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=80&w=600&auto=format&fit=crop",
        "description": "Vibrant sunflowers and white daisies in a geometric gold vase â€” perfect for a 30th birthday celebration.",
        "likes": 156,
        "saved": false,
        "featured": false
    },
    {
        "id": "g3",
        "title": "Luxury Red Rose Cascade",
        "category": "Luxury Bouquets",
        "author": "Maya Torres",
        "image": "https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=600&auto=format&fit=crop",
        "description": "A cascading arrangement of 50 premium long-stem red roses wrapped in silk ribbon and pearl pins.",
        "likes": 412,
        "saved": false,
        "featured": true
    },
    {
        "id": "g4",
        "title": "Spring Living Room Vignette",
        "category": "Home Decoration",
        "author": "Amara Singh",
        "image": "https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop",
        "description": "A bright spring arrangement of tulips, hyacinths, and daffodils styled on a wooden coffee table.",
        "likes": 189,
        "saved": false,
        "featured": false
    },
    {
        "id": "g5",
        "title": "Corporate Lobby Statement",
        "category": "Corporate Events",
        "author": "David Osei",
        "image": "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=600&auto=format&fit=crop",
        "description": "A large-scale minimalist arrangement of white orchids and monstera leaves in a tall ceramic vase.",
        "likes": 278,
        "saved": false,
        "featured": true
    },
    {
        "id": "g6",
        "title": "Vintage Tea Party Arrangement",
        "category": "Birthday Arrangements",
        "author": "Sarah Chen",
        "image": "https://images.unsplash.com/photo-1471899236350-e3016bf1e69e?q=80&w=600&auto=format&fit=crop",
        "description": "Delicate pink peonies and sweet peas arranged in a vintage porcelain teapot for an intimate birthday tea.",
        "likes": 203,
        "saved": false,
        "featured": false
    },
    {
        "id": "g7",
        "title": "White Garden Wedding Arch",
        "category": "Wedding Flowers",
        "author": "James Bloom",
        "image": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=600&auto=format&fit=crop",
        "description": "A lush white floral arch featuring hydrangeas, garden roses, and cascading jasmine for an outdoor ceremony.",
        "likes": 345,
        "saved": false,
        "featured": true
    },
    {
        "id": "g8",
        "title": "Executive Desk Orchid Display",
        "category": "Corporate Events",
        "author": "Nadia Kwarteng",
        "image": "https://images.unsplash.com/photo-1526045612212-70caf35c14df?q=80&w=600&auto=format&fit=crop",
        "description": "Sleek black ceramic pots with phalaenopsis orchids arranged in a minimalist row for a modern executive suite.",
        "likes": 167,
        "saved": false,
        "featured": false
    },
    {
        "id": "g9",
        "title": "Golden Luxury Gift Box",
        "category": "Luxury Bouquets",
        "author": "Liam Frost",
        "image": "https://images.unsplash.com/photo-1470509037662-253afb3100f9?q=80&w=600&auto=format&fit=crop",
        "description": "A premium hat-box arrangement of preserved roses in gold and champagne tones with dried pampas grass accents.",
        "likes": 521,
        "saved": false,
        "featured": true
    },
    {
        "id": "g10",
        "title": "Kitchen Herb & Flower Garden",
        "category": "Home Decoration",
        "author": "Rosa Martinez",
        "image": "https://images.unsplash.com/photo-1494972308805-463bc619d34d?q=80&w=600&auto=format&fit=crop",
        "description": "Edible flowers and fresh herbs arranged in rustic terracotta pots along a sunny kitchen windowsill.",
        "likes": 134,
        "saved": false,
        "featured": false
    },
    {
        "id": "g11",
        "title": "Reception Table Runners",
        "category": "Wedding Flowers",
        "author": "Emma Laurent",
        "image": "https://images.unsplash.com/photo-1468327768560-75b778cbb551?q=80&w=600&auto=format&fit=crop",
        "description": "Low-profile table runners of greenery, white roses, and hanging amaranthus along a farm-style reception table.",
        "likes": 298,
        "saved": false,
        "featured": false
    },
    {
        "id": "g12",
        "title": "Conference Stage Floral Wings",
        "category": "Corporate Events",
        "author": "David Osei",
        "image": "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=600&auto=format&fit=crop",
        "description": "Large-scale floral wings framing a conference stage, using tropical leaves, orchids, and anthuriums.",
        "likes": 223,
        "saved": false,
        "featured": false
    },
    {
        "id": "g13",
        "title": "Luxury Valentine's Bouquet",
        "category": "Luxury Bouquets",
        "author": "Maya Torres",
        "image": "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?q=80&w=600&auto=format&fit=crop",
        "description": "An extravagant mix of black velvet roses, deep burgundy dahlias, and silver brunia berries wrapped in velvet.",
        "likes": 487,
        "saved": false,
        "featured": true
    },
    {
        "id": "g14",
        "title": "Bohemian Bedroom Dried Florals",
        "category": "Home Decoration",
        "author": "Iris Nakamura",
        "image": "https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=600&auto=format&fit=crop",
        "description": "Dried eucalyptus, pampas grass, and bunny tail grass in woven baskets for a boho bedroom aesthetic.",
        "likes": 156,
        "saved": false,
        "featured": false
    },
    {
        "id": "g15",
        "title": "Milestone 50th Birthday Cascade",
        "category": "Birthday Arrangements",
        "author": "Priya Nair",
        "image": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=600&auto=format&fit=crop",
        "description": "A dramatic cascade of golden roses, orange lilies, and yellow freesias in a tall gilded vase for a golden milestone.",
        "likes": 189,
        "saved": false,
        "featured": false
    },
    {
        "id": "g16",
        "title": "Midsummer Night's Dream Tablescape",
        "category": "Wedding Flowers",
        "author": "Sarah Chen",
        "image": "https://images.unsplash.com/photo-1567691482090-4cc36f5721f6?q=80&w=600&auto=format&fit=crop",
        "description": "Floating candle centerpieces with lavender, delphinium, and fairy lights scattered across a long banquet table.",
        "likes": 267,
        "saved": false,
        "featured": false
    }
]
;
localData['courses'] = [
    {
        "id": "c1",
        "title": "Flower Arrangement Basics",
        "description": "Learn the fundamentals of flower arrangement from professional florist Maria Chen. This course covers everything from choosing the right flowers to creating stunning centerpiece designs for any occasion.",
        "thumbnail": "images/pexels-ani-coloca-1105433412-29391663.jpg",
        "instructor": "Maria Chen",
        "level": "Beginner",
        "duration": 180,
        "students": 2047,
        "rating": 4.8,
        "reviews": 312,
        "category": "Arrangement Techniques",
        "price": 49.99,
        "hasCertificate": true,
        "lessonCount": 6,
        "featured": true
    },
    {
        "id": "c2",
        "title": "Natural vs Artificial Flowers",
        "description": "Master the art of distinguishing natural, artificial, preserved, and dried flowers. Perfect for florists, buyers, and collectors who need to authenticate and evaluate flower quality.",
        "thumbnail": "images/pexels-marta-nogueira-589022975-34025116.jpg",
        "instructor": "David Okonkwo",
        "level": "Beginner",
        "duration": 90,
        "students": 1532,
        "rating": 4.6,
        "reviews": 178,
        "category": "Flower Identification",
        "price": 29.99,
        "hasCertificate": true,
        "lessonCount": 4,
        "featured": true
    },
    {
        "id": "c3",
        "title": "Wedding Floristry Masterclass",
        "description": "Design breathtaking wedding flowers from engagement to reception. Learn bouquets, boutonnieres, arch installations, table centerpieces, and venue-wide floral decor planning.",
        "thumbnail": "images/pexels-roman-odintsov-8528253.jpg",
        "instructor": "Sophie Laurent",
        "level": "Intermediate",
        "duration": 300,
        "students": 892,
        "rating": 4.9,
        "reviews": 245,
        "category": "Wedding Floristry",
        "price": 89.99,
        "hasCertificate": true,
        "lessonCount": 8,
        "featured": true
    },
    {
        "id": "c4",
        "title": "Flower Care & Preservation",
        "description": "Extend the life of your flowers with professional care techniques. Covers watering, trimming, food recipes, drying methods, pressing, and resin preservation for long-lasting beauty.",
        "thumbnail": "https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop",
        "instructor": "Dr. James Whitfield",
        "level": "All Levels",
        "duration": 120,
        "students": 3105,
        "rating": 4.7,
        "reviews": 420,
        "category": "Flower Care",
        "price": 39.99,
        "hasCertificate": true,
        "lessonCount": 5,
        "featured": false
    },
    {
        "id": "c5",
        "title": "Floristry Business Startup",
        "description": "Turn your passion into profit. Learn business planning, pricing strategies, supplier management, online selling, customer acquisition, and scaling a profitable floral business.",
        "thumbnail": "https://images.unsplash.com/photo-1664575602276-acd073f104c1?q=80&w=600&auto=format&fit=crop",
        "instructor": "Amara Sterling",
        "level": "Advanced",
        "duration": 240,
        "students": 678,
        "rating": 4.5,
        "reviews": 98,
        "category": "Business Skills",
        "price": 69.99,
        "hasCertificate": true,
        "lessonCount": 7,
        "featured": false
    },
    {
        "id": "c6",
        "title": "Growing Roses from Seed to Bloom",
        "description": "A comprehensive guide to growing healthy, vibrant roses. From soil preparation and planting to pruning, pest management, and seasonal care routines for stunning blooms year after year.",
        "thumbnail": "https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=600&auto=format&fit=crop",
        "instructor": "Kenya Rose Farm",
        "level": "Beginner",
        "duration": 150,
        "students": 1234,
        "rating": 4.4,
        "reviews": 156,
        "category": "Growing & Gardening",
        "price": 34.99,
        "hasCertificate": false,
        "lessonCount": 5,
        "featured": false
    }
]
;
localData['lessons'] = [
    { "id": "l1", "course_id": "c1", "title": "Introduction to Flower Arrangement", "content": "Welcome to Flower Arrangement Basics! In this introductory lesson, we'll explore the history and principles of floral design. You'll learn about the essential tools every florist needs, how to set up your workspace, and the core concepts that will guide your arrangements. We'll cover the elements of design — line, form, space, texture, and color — and how they work together to create visual harmony. By the end of this lesson, you'll understand the foundational vocabulary and concepts that professional florists use every day.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 15, "order": 1 },
    { "id": "l2", "course_id": "c1", "title": "Choosing the Right Flowers", "content": "Selecting the perfect blooms is the most important step in any arrangement. This lesson teaches you how to evaluate flower freshness, choose seasonal varieties, match flowers to occasions, and build a color palette. You'll learn what to look for when buying from suppliers — petal condition, stem strength, leaf health, and bud stage. We'll also discuss flower sourcing, seasonality charts, and how to select complementary textures and shapes for dynamic arrangements.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 20, "order": 2 },
    { "id": "l3", "course_id": "c1", "title": "Basic Arrangement Techniques", "content": "Hands-on techniques for building your first arrangement. Learn spiral bouquet construction, vase placement, foliage layering, and balance creation. We'll demonstrate the classic hand-tied bouquet method, proper stem cutting angles, and how to create depth and dimension. You'll practice with different container types and understand how the vessel shape affects your design. Master the fundamentals of anchoring, radial placement, and the golden ratio in floral design.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 30, "order": 3 },
    { "id": "l4", "course_id": "c1", "title": "Color Theory for Florists", "content": "Color is the most powerful tool in a florist's palette. This lesson dives deep into color theory — the color wheel, complementary schemes, analogous palettes, monochromatic designs, and seasonal color trends. Learn how to create mood and emotion through color choices, how to work with challenging colors, and when to break the rules. Real-world examples of award-winning arrangements will illustrate each concept.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 25, "order": 4 },
    { "id": "l5", "course_id": "c1", "title": "Creating Centerpieces", "content": "Centerpieces are the heart of event floral design. This lesson covers low and high centerpiece construction, candle integration, table proportion guidelines, and creating visual impact within budget constraints. You'll learn to design for different table shapes, height requirements, and venue styles. We'll also discuss working with clients to understand their vision and translating that into a stunning centerpiece design.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 35, "order": 5 },
    { "id": "l6", "course_id": "c1", "title": "Final Project — Build Your Own Bouquet", "content": "Apply everything you've learned by creating your own original bouquet. This final project walks you through the complete process — from concept sketch and flower selection to construction and presentation. Submit your final arrangement for peer and instructor feedback. This project is designed to showcase your understanding of all course concepts and produce a portfolio-worthy piece.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 45, "order": 6 },
    { "id": "l7", "course_id": "c2", "title": "Understanding Flower Types", "content": "Learn the four main categories of flowers used in modern floristry: natural fresh-cut, artificial silk/polyester, preserved stabilized, and dried/natural-dried. Each type has unique characteristics, care requirements, and best-use scenarios. We'll examine real samples side-by-side and discuss how to identify each type through visual inspection, touch, and scent.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 20, "order": 1 },
    { "id": "l8", "course_id": "c2", "title": "Visual Identification Guide", "content": "Train your eye to spot the differences between flower types. This lesson covers petal texture analysis, stem construction examination, color uniformity testing, and fragrance evaluation. You'll learn the telltale signs of artificial flowers (wire stems, fabric petals, uniform coloring) versus natural indicators (irregular petal patterns, natural fragrance variations, organic stem textures).", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 25, "order": 2 },
    { "id": "l9", "course_id": "c2", "title": "Authenticity Testing Methods", "content": "Professional methods for authenticating flower quality and type. Learn water tests, burn tests for fabric flowers, touch and feel evaluation, and microscope examination techniques. Understand how to verify preserved flower claims, test dye quality in dried flowers, and distinguish high-end silk from natural blooms. These skills are essential for buyers, collectors, and quality control professionals.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 30, "order": 3 },
    { "id": "l10", "course_id": "c2", "title": "Buyer's Guide & Checklist", "content": "Practical checklist for evaluating flowers before purchase. Covers supplier vetting, sample request procedures, quality scoring systems, and documentation best practices. You'll leave with a downloadable evaluation template you can use for every flower purchase, whether you're buying for personal use, resale, or event production.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 15, "order": 4 },
    { "id": "l11", "course_id": "c3", "title": "Wedding Consultation & Planning", "content": "Learn how to conduct professional wedding consultations, understand client vision, create mood boards, and develop comprehensive wedding flower plans. Covers budget estimation, timeline creation, and vendor coordination.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 35, "order": 1 },
    { "id": "l12", "course_id": "c3", "title": "Bridal Bouquet Construction", "content": "Master the art of the bridal bouquet — from classic round and cascading to modern composite and hand-tied styles. Learn wiring, taping, ribbon wrapping, and handle finishing techniques.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 40, "order": 2 },
    { "id": "l13", "course_id": "c3", "title": "Ceremony & Arch Installations", "content": "Design stunning ceremony backdrops, arch installations, aisle decorations, and altar arrangements. Learn structural engineering for freestanding designs, attachment techniques, and venue-specific considerations.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 50, "order": 3 },
    { "id": "l14", "course_id": "c3", "title": "Reception Table Designs", "content": "Comprehensive guide to reception floral design including head table, guest tables, cake table, and lounge area arrangements. Covers height guidelines, sight-line considerations, and cohesive theme execution.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 45, "order": 4 },
    { "id": "l15", "course_id": "c3", "title": "Boutonnieres & Corsages", "content": "Learn the delicate art of creating boutonnieres, corsages, and personal flowers for the wedding party. Techniques for working with delicate blooms, attaching to different fabrics, and ensuring all-day wearability.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 30, "order": 5 },
    { "id": "l16", "course_id": "c3", "title": "Wedding Day Execution", "content": "How to manage wedding day delivery, setup, and breakdown. Covers logistics planning, team coordination, emergency kits, timing schedules, and handling last-minute changes with grace.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 35, "order": 6 },
    { "id": "l17", "course_id": "c3", "title": "Pricing & Packages", "content": "Develop profitable wedding flower packages. Learn cost calculation, markup strategies, package tiering, contract terms, deposit structures, and how to communicate value to clients effectively.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 30, "order": 7 },
    { "id": "l18", "course_id": "c3", "title": "Portfolio & Marketing", "content": "Build a compelling wedding florist portfolio and market your services. Covers professional photography, social media strategy, vendor networking, bridal show participation, and winning client proposals.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 35, "order": 8 },
    { "id": "l19", "course_id": "c4", "title": "Daily Flower Care Routine", "content": "Essential daily care practices for cut flowers and potted plants. Covers proper watering techniques, stem recutting schedules, leaf management, and environmental factors that affect flower longevity.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 20, "order": 1 },
    { "id": "l20", "course_id": "c4", "title": "Homemade Flower Food Recipes", "content": "Learn professional flower food formulas you can make at home. Covers sugar-acid-bleach ratios, commercial additive comparisons, and species-specific nutrition requirements.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 25, "order": 2 },
    { "id": "l21", "course_id": "c4", "title": "Drying & Pressing Methods", "content": "Comprehensive guide to preserving flowers through air drying, silica gel, pressing, and microwave methods. Each technique is demonstrated with step-by-step instructions for best results.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 30, "order": 3 },
    { "id": "l22", "course_id": "c4", "title": "Resin Preservation Art", "content": "Create stunning jewelry, paperweights, and keepsakes using resin-encased preserved flowers. Learn mold selection, resin mixing, bubble removal, curing, and finishing techniques.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 30, "order": 4 },
    { "id": "l23", "course_id": "c4", "title": "Long-Term Storage Solutions", "content": "Professional techniques for storing dried and preserved flowers long-term. Covers climate control, pest prevention, UV protection, packaging methods, and inventory rotation systems.", "video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "duration": 15, "order": 5 }
]
;
localData['identification'] = [
    {
        "id": "rose-id",
        "title": "Natural vs Artificial Roses",
        "description": "Learn how to identify real roses from high-quality artificial roses using visual inspection, touch tests, scent evaluation, and expert techniques.",
        "slug": "rose-id",
        "category": "Roses",
        "level": "Beginner",
        "duration": "15 min"
    },
    {
        "id": "tulip-id",
        "title": "Natural vs Artificial Tulips",
        "description": "Master the art of identifying real tulips from artificial replicas. Learn to spot the differences in stem structure, petal behavior, and color patterns.",
        "slug": "tulip-id",
        "category": "Tulips",
        "level": "Beginner",
        "duration": "12 min"
    },
    {
        "id": "preserved-vs-fresh",
        "title": "Fresh vs Preserved Flowers",
        "description": "Understand the differences between fresh-cut flowers and preserved blooms. Learn about glycerin treatment, texture changes, and longevity expectations.",
        "slug": "preserved-vs-fresh",
        "category": "Preservation",
        "level": "Intermediate",
        "duration": "10 min"
    },
    {
        "id": "dried-vs-preserved",
        "title": "Dried vs Preserved Flowers",
        "description": "Learn to distinguish dried flowers from preserved ones. While both are long-lasting, their care, feel, and appearance are very different.",
        "slug": "dried-vs-preserved",
        "category": "Preservation",
        "level": "Intermediate",
        "duration": "8 min"
    }
]
;
localData['quizzes'] = [
    {
        "id": "qz1",
        "course_id": "c1",
        "title": "Arrangement Fundamentals Quiz",
        "questions": [
            { "id": "qq1", "question": "Which element of floral design refers to the visual path the eye follows through an arrangement?", "options": ["Line", "Form", "Texture", "Space"], "correct": 0 },
            { "id": "qq2", "question": "What is the recommended stem cutting angle for optimal water absorption?", "options": ["90 degrees", "45 degrees", "30 degrees", "60 degrees"], "correct": 1 },
            { "id": "qq3", "question": "Which flower type is NOT suitable for a hand-tied bouquet?", "options": ["Roses", "Tulips", "Sunflowers", "Broken-stemmed flowers"], "correct": 3 },
            { "id": "qq4", "question": "What does the golden ratio in floral design help achieve?", "options": ["Color harmony", "Visual balance", "Faster arrangement", "Longer vase life"], "correct": 1 },
            { "id": "qq5", "question": "Which tool is essential for removing thorns from rose stems?", "options": ["Floral shears", "Stem stripper", "Ribbon scissors", "Floral tape"], "correct": 1 }
        ]
    },
    {
        "id": "qz2",
        "course_id": "c2",
        "title": "Flower Identification Test",
        "questions": [
            { "id": "qq6", "question": "Which feature usually indicates a natural flower?", "options": ["Plastic Stem", "Natural Fragrance", "Uniform Petals", "Wire Stem"], "correct": 1 },
            { "id": "qq7", "question": "What is the most reliable test for identifying silk flowers?", "options": ["Smell test", "Burn test", "Water test", "Weight test"], "correct": 1 },
            { "id": "qq8", "question": "Preserved flowers are best characterized by:", "options": ["Wire stems", "Natural flexibility", "Firm but pliable texture", "Complete rigidity"], "correct": 2 },
            { "id": "qq9", "question": "Which flower type has the longest lifespan without water?", "options": ["Fresh-cut", "Artificial", "Preserved", "Dried"], "correct": 1 }
        ]
    }
]
;
localData['products'] = [
    {
        "id": "p1",
        "name": "Anemone Bouquet",
        "createdAt": "2026-06-18T10:30:00Z",
        "flowerType": "natural",
        "stemLength": "35 cm",
        "vaseLife": "7 Days",
        "origin": "Netherlands",
        "season": "Spring–Summer",
        "stockQuantity": 30,
        "oldPrice": 38.99,
        "category": "bouquets",
        "badge": "Popular",
        "price": 29.99,
        "seller": "Bloom & Co.",
        "sellerId": "f5",
        "image": "https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop",
        "description": "12 premium anemones with seasonal greenery. These delicate blooms feature papery petals in rich jewel tones â€” perfect for brightening any room. Each stem is hand-selected for peak freshness and arranged by our master florists. Comes wrapped in kraft paper with a satin ribbon.",
        "occasion": "any",
        "color": "pink",
        "fresh": true,
        "rating": 4.5,
        "reviews": 128,
        "featured": true,
        "bestSeller": true,
        "newArrival": false,
        "images": [
            "https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1603893356073-67cba6826eb5?q=80&w=600&auto=format&fit=crop"
        ],
        "reviewList": [
            { "author": "Sarah M.", "rating": 5, "date": "2 weeks ago", "text": "Absolutely stunning bouquet! The colors were even more vibrant than the photos. Lasted over 10 days." },
            { "author": "James K.", "rating": 4, "date": "1 month ago", "text": "Beautiful arrangement, great value for the price. Delivery was prompt and the flowers were well-protected." },
            { "author": "Priya R.", "rating": 5, "date": "2 months ago", "text": "Ordered for my mother's birthday and she was thrilled. Will definitely order again." }
        ]
    },
    {
        "id": "p2",
        "name": "Sunflower Dreams",
        "createdAt": "2026-06-16T14:00:00Z",
        "flowerType": "natural",
        "stemLength": "60 cm",
        "vaseLife": "5 Days",
        "origin": "Ghana",
        "season": "Summer",
        "stockQuantity": 20,
        "category": "wildflowers",
        "badge": "Trending",
        "price": 24.99,
        "seller": "Golden Petals Farm",
        "sellerId": "f3",
        "image": "https://images.unsplash.com/photo-1591994843349-f415893b3a6b?q=80&w=600&auto=format&fit=crop",
        "description": "Bright sunflowers with seasonal greenery. These cheerful sunflowers are grown on our sustainable farm using organic practices. Each stem reaches 4-5 feet tall with heads up to 8 inches across. Arranged with eucalyptus and waxflower for a rustic farmhouse feel.",
        "occasion": "birthday",
        "color": "yellow",
        "fresh": true,
        "rating": 4.8,
        "reviews": 95,
        "featured": true,
        "bestSeller": true,
        "newArrival": false,
        "images": [
            "https://images.unsplash.com/photo-1591994843349-f415893b3a6b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1576013555127-6c4daf5c6f1e?q=80&w=600&auto=format&fit=crop"
        ],
        "reviewList": [
            { "author": "Emma L.", "rating": 5, "date": "1 week ago", "text": "These sunflowers made my whole kitchen brighter! They opened up beautifully over the first few days." },
            { "author": "David O.", "rating": 5, "date": "3 weeks ago", "text": "Biggest, happiest sunflowers I've ever seen. The vase life was impressive too." },
            { "author": "Amara S.", "rating": 4, "date": "1 month ago", "text": "Lovely quality. A few petals dropped during delivery but otherwise perfect." }
        ]
    },
    {
        "id": "p3",
        "name": "Premium Orchids",
        "createdAt": "2026-06-13T09:15:00Z",
        "flowerType": "natural",
        "stemLength": "45 cm",
        "vaseLife": "14 Days",
        "origin": "Thailand",
        "season": "All Year",
        "stockQuantity": 15,
        "oldPrice": 58.50,
        "category": "orchids",
        "badge": "Premium",
        "price": 45.00,
        "seller": "Orchid Paradise",
        "sellerId": "f9",
        "image": "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?q=80&w=600&auto=format&fit=crop",
        "description": "Exotic phalaenopsis orchids in a sleek ceramic pot. Our premium orchids are grown in climate-controlled greenhouses to ensure perfect blooms. Each plant features 3-4 flower spikes with multiple buds. The glossy ceramic pot in matte white complements any interior style.",
        "occasion": "any",
        "color": "white",
        "fresh": true,
        "rating": 4.7,
        "reviews": 210,
        "featured": true,
        "bestSeller": false,
        "newArrival": false,
        "images": [
            "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1526045612212-70caf35c14df?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1471899236350-e3016bf1e69e?q=80&w=600&auto=format&fit=crop"
        ],
        "reviewList": [
            { "author": "Nadia K.", "rating": 5, "date": "5 days ago", "text": "Gorgeous orchid! The blooms are still going strong after 3 weeks. The pot is beautiful too." },
            { "author": "Rosa M.", "rating": 4, "date": "2 weeks ago", "text": "Beautiful plant, arrived in perfect condition. Slightly smaller than expected but still lovely." },
            { "author": "Chen W.", "rating": 5, "date": "1 month ago", "text": "Second time buying from here. Always exceptional quality. The packaging is very thoughtful." }
        ]
    },
    {
        "id": "p4",
        "name": "Wedding Arrangement",
        "createdAt": "2026-06-10T16:45:00Z",
        "flowerType": "natural",
        "stemLength": "40 cm",
        "vaseLife": "7 Days",
        "origin": "Netherlands",
        "season": "All Year",
        "stockQuantity": 10,
        "category": "bouquets",
        "badge": "Special",
        "price": 89.99,
        "seller": "Floral Dreams Studio",
        "sellerId": "f1",
        "image": "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=600&auto=format&fit=crop",
        "description": "Premium wedding arrangement for ceremonies and receptions. This luxurious centerpiece features garden roses, hydrangeas, peonies, and trailing jasmine. Designed by award-winning wedding florists, each arrangement is custom-crafted to match your color palette and theme.",
        "occasion": "wedding",
        "color": "white",
        "fresh": true,
        "rating": 4.9,
        "reviews": 340,
        "featured": true,
        "bestSeller": true,
        "newArrival": false,
        "images": [
            "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1567691482090-4cc36f5721f6?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=600&auto=format&fit=crop"
        ],
        "reviewList": [
            { "author": "Lauren T.", "rating": 5, "date": "1 week ago", "text": "Our wedding flowers were absolutely perfect. Everyone complimented them all night. Thank you!" },
            { "author": "Michael P.", "rating": 5, "date": "3 weeks ago", "text": "Exceeded our expectations. The attention to detail was incredible. Worth every penny." },
            { "author": "Sophia L.", "rating": 5, "date": "2 months ago", "text": "The most beautiful wedding flowers I've ever seen. They matched our theme perfectly." }
        ]
    },
    {
        "id": "p5",
        "name": "Classic Red Roses",
        "createdAt": "2026-06-07T11:00:00Z",
        "flowerType": "natural",
        "stemLength": "55 cm",
        "vaseLife": "10 Days",
        "origin": "Kenya",
        "season": "All Year",
        "stockQuantity": 40,
        "oldPrice": 43.99,
        "category": "roses",
        "badge": "",
        "price": 34.99,
        "seller": "Rose Garden Co.",
        "sellerId": "f5",
        "image": "https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=600&auto=format&fit=crop",
        "description": "Fresh cut red roses direct from the farm. A dozen premium long-stem red roses, hand-cut at peak bloom. Our roses are grown in nutrient-rich soil and shipped within 24 hours of cutting. Each stem is carefully wrapped with protective petals and includes flower food for maximum vase life.",
        "occasion": "romance",
        "color": "red",
        "fresh": true,
        "rating": 4.6,
        "reviews": 512,
        "featured": true,
        "bestSeller": true,
        "newArrival": false,
        "images": [
            "https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1591994843349-f415893b3a6b?q=80&w=600&auto=format&fit=crop"
        ],
        "reviewList": [
            { "author": "James B.", "rating": 5, "date": "3 days ago", "text": "My wife loved them! The roses were huge and smelled incredible. Lasted 8 days." },
            { "author": "Maria G.", "rating": 5, "date": "2 weeks ago", "text": "Best roses I've ever ordered online. They arrived fresh and opened beautifully." },
            { "author": "Kwame A.", "rating": 4, "date": "1 month ago", "text": "Great quality. A couple of stems were slightly bent but the blooms were perfect." },
            { "author": "Lisa C.", "rating": 5, "date": "2 months ago", "text": "Ordered for our anniversary. Absolutely stunning. Will be my go-to from now on." }
        ]
    },
    {
        "id": "p6",
        "name": "Spring Tulips",
        "createdAt": "2026-06-03T08:30:00Z",
        "flowerType": "natural",
        "stemLength": "40 cm",
        "vaseLife": "5 Days",
        "origin": "Netherlands",
        "season": "Spring",
        "stockQuantity": 35,
        "category": "bouquets",
        "badge": "Seasonal",
        "price": 19.99,
        "seller": "Tulip Fields Co.",
        "sellerId": "f8",
        "image": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?q=80&w=600&auto=format&fit=crop",
        "description": "Vibrant assortment of spring tulips in pink, yellow, and white. These Dutch-grown tulips are imported fresh and arranged in a cheerful mixed bouquet. Each stem is at the perfect stage â€” closed enough to travel safely but ready to open and dance in your vase.",
        "occasion": "any",
        "color": "multi",
        "fresh": true,
        "rating": 4.3,
        "reviews": 67,
        "featured": false,
        "bestSeller": false,
        "newArrival": true,
        "images": [
            "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1470509037662-253afb3100f9?q=80&w=600&auto=format&fit=crop"
        ],
        "reviewList": [
            { "author": "Emma L.", "rating": 4, "date": "1 week ago", "text": "Lovely tulips. They kept growing in the vase which was fun to watch. Great value." },
            { "author": "Daniel R.", "rating": 5, "date": "3 weeks ago", "text": "Perfect spring bouquet. The colors are so cheerful and they lasted a full week." }
        ]
    },
    {
        "id": "p7",
        "name": "Succulent Collection",
        "createdAt": "2026-05-29T13:20:00Z",
        "flowerType": "preserved",
        "stemLength": "n/a",
        "vaseLife": "2–3 Years",
        "origin": "South Africa",
        "season": "All Year",
        "stockQuantity": 25,
        "oldPrice": 23.99,
        "category": "succulents",
        "badge": "New",
        "price": 18.50,
        "seller": "Desert Blooms",
        "sellerId": "f6",
        "image": "https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=600&auto=format&fit=crop",
        "description": "Hand-picked succulent trio for your home or office. This curated collection features three complementary succulent varieties planted in a modern geometric planter with drainage. Includes echeveria, jade, and aloe â€” each chosen for their unique texture, color, and easy-care nature.",
        "occasion": "any",
        "color": "green",
        "fresh": false,
        "rating": 4.4,
        "reviews": 180,
        "featured": false,
        "bestSeller": false,
        "newArrival": true,
        "images": [
            "https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1468327768560-75b778cbb551?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1494972308805-463bc619d34d?q=80&w=600&auto=format&fit=crop"
        ],
        "reviewList": [
            { "author": "Priya N.", "rating": 5, "date": "4 days ago", "text": "Perfect little succulents! They look great on my desk and are so easy to care for." },
            { "author": "Tom H.", "rating": 4, "date": "2 weeks ago", "text": "Nice arrangement. The planter is smaller than expected but the succulents are healthy." },
            { "author": "Akua N.", "rating": 5, "date": "1 month ago", "text": "Bought as a gift and my friend loved them. Great packaging and healthy plants." }
        ]
    },
    {
        "id": "p8",
        "name": "Lavender Bunch",
        "createdAt": "2026-05-22T15:10:00Z",
        "flowerType": "dried",
        "stemLength": "30 cm",
        "vaseLife": "1+ Year",
        "origin": "France",
        "season": "All Year",
        "stockQuantity": 45,
        "category": "wildflowers",
        "badge": "",
        "price": 14.99,
        "seller": "Provence Fields",
        "sellerId": "f4",
        "image": "https://images.unsplash.com/photo-1499789500731-7f1c040cd617?q=80&w=600&auto=format&fit=crop",
        "description": "Dried lavender bunches, fragrant and long-lasting. Our lavender is grown in the highlands of Ghana, hand-harvested at peak bloom, and naturally air-dried to preserve its intense fragrance and vibrant purple color. Each bunch contains approximately 50 stems tied with jute twine.",
        "occasion": "any",
        "color": "purple",
        "fresh": false,
        "rating": 4.2,
        "reviews": 44,
        "featured": false,
        "bestSeller": false,
        "newArrival": true,
        "images": [
            "https://images.unsplash.com/photo-1499789500731-7f1c040cd617?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1470509037662-253afb3100f9?q=80&w=600&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=600&auto=format&fit=crop"
        ],
        "reviewList": [
            { "author": "Nadia K.", "rating": 5, "date": "1 week ago", "text": "Smells amazing! The lavender is so fragrant and looks beautiful in my bedroom." },
            { "author": "Yaw B.", "rating": 4, "date": "3 weeks ago", "text": "Good quality dried lavender. The scent is strong and long-lasting. Great for DIY projects." }
        ]
    }
]
;
localData['users'] = [
    {
        "id": "u1",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "buyer",
        "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop"
    },
    {
        "id": "u2",
        "name": "Ofosu Stephen",
        "email": "seller@example.com",
        "role": "seller",
        "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop"
    }
]
;
localData['videos'] = [
    {
        "id": "v1",
        "title": "Modern Arrangement Techniques",
        "tag": "Tutorial",
        "category": "Arrangement Techniques",
        "duration": "12:34 min",
        "description": "Learn contemporary arrangement styles from pro florist Maria Chen.",
        "image": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?q=80&w=600&auto=format&fit=crop",
        "video_url": "https://www.pexels.com/embed/video/5228886/",
        "instructor": "Maria Chen",
        "views": 12453
    },
    {
        "id": "v2",
        "title": "Wedding Flower Design 101",
        "tag": "Course",
        "category": "Wedding Floristry",
        "duration": "28:15 min",
        "description": "Complete guide to planning and executing flawless wedding arrangements.",
        "image": "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=600&auto=format&fit=crop",
        "video_url": "https://www.pexels.com/embed/video/1384777/",
        "instructor": "Sophie Laurent",
        "views": 8932
    },
    {
        "id": "v3",
        "title": "Growing Premium Peonies",
        "tag": "Masterclass",
        "category": "Flower Care",
        "duration": "35:42 min",
        "description": "Expert techniques for cultivating show-quality peony flowers year-round.",
        "image": "https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=600&auto=format&fit=crop",
        "video_url": "https://www.pexels.com/embed/video/37570648/",
        "instructor": "Dr. James Whitfield",
        "views": 15678
    },
    {
        "id": "v4",
        "title": "Floristry Business Startup",
        "tag": "Course",
        "category": "Business Skills",
        "duration": "45:20 min",
        "description": "Learn how to start, market, and scale your floristry business successfully.",
        "image": "https://images.unsplash.com/photo-1664575602276-acd073f104c1?q=80&w=600&auto=format&fit=crop",
        "video_url": "https://www.pexels.com/embed/video/3993446/",
        "instructor": "Amara Sterling",
        "views": 7231
    },
    {
        "id": "v5",
        "title": "Event Floral Design Masterclass",
        "tag": "Masterclass",
        "category": "Event Decorations",
        "duration": "52:10 min",
        "description": "Transform venues with professional-grade event floral arrangements.",
        "image": "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=600&auto=format&fit=crop",
        "video_url": "https://www.pexels.com/embed/video/4327402/",
        "instructor": "Luis Mendez",
        "views": 11420
    },
    {
        "id": "v6",
        "title": "Floristry Essentials for Beginners",
        "tag": "Tutorial",
        "category": "Beginner Floristry",
        "duration": "18:45 min",
        "description": "Master the fundamental tools, techniques, and principles of floristry.",
        "image": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=600&auto=format&fit=crop",
        "video_url": "https://www.pexels.com/embed/video/4327403/",
        "instructor": "Maria Chen",
        "views": 18902
    }
]
;
localData['flower-knowledge-categories'] = [
    { "id": 1, "name": "Medicinal", "slug": "medicinal", "description": "Flowers with healing and therapeutic properties", "icon": "💊" },
    { "id": 2, "name": "Ornamental", "slug": "ornamental", "description": "Flowers grown for decorative and aesthetic purposes", "icon": "🎨" },
    { "id": 3, "name": "Perfume", "slug": "perfume", "description": "Flowers used in fragrances and essential oils", "icon": "🧴" },
    { "id": 4, "name": "Edible", "slug": "edible", "description": "Flowers safe for culinary use", "icon": "🍽️" },
    { "id": 5, "name": "Religious", "slug": "religious", "description": "Flowers with spiritual and ceremonial significance", "icon": "🕯️" },
    { "id": 6, "name": "Landscaping", "slug": "landscaping", "description": "Flowers used in landscape design and gardens", "icon": "🏡" },
    { "id": 7, "name": "Indoor Plants", "slug": "indoor-plants", "description": "Flowers suited for indoor cultivation", "icon": "🪴" },
{ "id": 8, "name": "Palm Trees", "slug": "palm-trees", "description": "Ornamental palm varieties for tropical landscapes", "icon": "🌴" },
    { "id": 9, "name": "Succulents", "slug": "succulents", "description": "Drought-tolerant plants with water-storing leaves", "icon": "🌵" },
    { "id": 10, "name": "Tropical Plants", "slug": "tropical-plants", "description": "Exotic plants from tropical climates", "icon": "🌺" }
];
localData['flower-knowledge'] = [{"id":"rose","slug":"rose","common_name":"Rose","scientific_name":"Rosa spp.","family":"Rosaceae","origin":"Asia","emoji":"🌹","description":"The rose is a woody perennial flowering plant known for its beauty, fragrance, and cultural significance. With over 300 species and thousands of cultivars, roses are one of the most popular and versatile flowers in the world.","image_url":"https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?q=80&w=800&auto=format&fit=crop","sunlight":"Full Sun (6+ hours)","water":"Moderate — water deeply 2-3 times per week","soil":"Well-drained, loamy soil with pH 6.0-6.5","difficulty":"Moderate","growth_rate":"Moderate","height":"1-6 feet (depending on variety)","category_ids":[1,2,3,4,6],"benefits":[{"type":"Medicinal","description":"Rich in antioxidants, particularly vitamin C and polyphenols","sort_order":1},{"type":"Medicinal","description":"Used in herbal teas to aid digestion and reduce inflammation","sort_order":2},{"type":"Medicinal","description":"Rose water helps soothe skin irritation and acts as a natural astringent","sort_order":3},{"type":"Medicinal","description":"May help reduce stress and anxiety through aromatherapy","sort_order":4},{"type":"Health","description":"Aromatherapy with rose oil promotes relaxation and emotional balance","sort_order":1},{"type":"Health","description":"Rose hip tea boosts immune system with high vitamin C content","sort_order":2},{"type":"Health","description":"Natural mood enhancement and stress reduction","sort_order":3},{"type":"Health","description":"Rose-infused skincare products help hydrate and rejuvenate skin","sort_order":4},{"type":"Perfume","description":"Luxury perfumes — rose is the most widely used floral fragrance note","sort_order":1},{"type":"Perfume","description":"Essential oils — rose otto and rose absolute are highly prized","sort_order":2},{"type":"Perfume","description":"Body sprays, lotions, and scented candles","sort_order":3},{"type":"Perfume","description":"Aromatherapy oils for relaxation and mood enhancement","sort_order":4},{"type":"Ornamental","description":"Gardens — a classic choice for formal and cottage gardens","sort_order":1},{"type":"Ornamental","description":"Weddings — the most popular flower for bridal bouquets","sort_order":2},{"type":"Ornamental","description":"Home decoration — cut roses brighten any room","sort_order":3},{"type":"Ornamental","description":"Landscaping — hedges, trellises, and garden borders","sort_order":4},{"type":"Culinary","description":"Rose water used in Middle Eastern and Indian cuisine","sort_order":1},{"type":"Culinary","description":"Rose petals candied for cake decorations and desserts","sort_order":2},{"type":"Culinary","description":"Rose hip jam and jelly are rich in flavor and nutrients","sort_order":3}],"care_tips":[{"title":"Plant in full sun","description":"Roses need at least 6 hours of direct sunlight daily for optimal blooming.","sort_order":1},{"title":"Water at the base","description":"Avoid wetting foliage to prevent fungal diseases. Water deeply at the root zone.","sort_order":2},{"title":"Prune annually","description":"Prune in early spring before new growth. Remove dead, diseased, or crossing branches.","sort_order":3},{"title":"Fertilize regularly","description":"Feed with a balanced rose fertilizer every 4-6 weeks during the growing season.","sort_order":4},{"title":"Mulch to retain moisture","description":"Apply 2-3 inches of organic mulch around the base to conserve water and suppress weeds.","sort_order":5},{"title":"Monitor for pests","description":"Watch for aphids, black spot, and powdery mildew. Treat early with neem oil or insecticidal soap.","sort_order":6}]},{"id":"lavender","slug":"lavender","common_name":"Lavender","scientific_name":"Lavandula angustifolia","family":"Lamiaceae","origin":"Mediterranean","emoji":"💜","description":"Lavender is a fragrant herb prized for its calming aroma, beautiful purple flowers, and versatile uses in medicine, perfumery, and cooking. It thrives in sunny, well-drained conditions.","image_url":"https://images.unsplash.com/photo-1490750967868-88df5691a78b?q=80&w=800&auto=format&fit=crop","sunlight":"Full Sun","water":"Low — drought-tolerant once established","soil":"Well-drained, sandy or gravelly soil, pH 6.5-7.5","difficulty":"Easy","growth_rate":"Moderate","height":"1-3 feet","category_ids":[1,2,3,4,6],"benefits":[{"type":"Medicinal","description":"Promotes relaxation and improves sleep quality","sort_order":1},{"type":"Medicinal","description":"Natural antiseptic and anti-inflammatory properties","sort_order":2},{"type":"Medicinal","description":"Helps relieve headaches and migraines when applied topically","sort_order":3},{"type":"Medicinal","description":"Aids digestion and reduces bloating when consumed as tea","sort_order":4},{"type":"Health","description":"Reduces anxiety and stress through aromatherapy","sort_order":1},{"type":"Health","description":"Improves sleep quality and helps with insomnia","sort_order":2},{"type":"Health","description":"Natural insect repellent","sort_order":3},{"type":"Perfume","description":"Classic fragrance note in soaps, lotions, and perfumes","sort_order":1},{"type":"Perfume","description":"Lavender essential oil is one of the most popular aromatherapy oils","sort_order":2},{"type":"Perfume","description":"Used in sachets, potpourri, and linen sprays","sort_order":3},{"type":"Ornamental","description":"Beautiful purple flower spikes in summer gardens","sort_order":1},{"type":"Ornamental","description":"Excellent for borders, hedges, and container gardens","sort_order":2},{"type":"Ornamental","description":"Dried lavender used in floral arrangements and crafts","sort_order":3},{"type":"Culinary","description":"Lavender honey is a gourmet delicacy","sort_order":1},{"type":"Culinary","description":"Used in baked goods like lavender cookies and cakes","sort_order":2},{"type":"Culinary","description":"Lavender-infused teas and lemonades","sort_order":3}],"care_tips":[{"title":"Plant in full sun","description":"Lavender needs at least 6-8 hours of direct sunlight daily.","sort_order":1},{"title":"Ensure excellent drainage","description":"Lavender hates wet feet. Plant in raised beds or add gravel to heavy soil.","sort_order":2},{"title":"Water sparingly","description":"Allow soil to dry between waterings. Overwatering is the most common cause of death.","sort_order":3},{"title":"Prune after flowering","description":"Cut back stems by one-third after blooming to maintain shape and encourage new growth.","sort_order":4},{"title":"Mulch with gravel","description":"Use gravel or pebble mulch rather than bark to keep moisture away from the crown.","sort_order":5}]},{"id":"jasmine","slug":"jasmine","common_name":"Jasmine","scientific_name":"Jasminum officinale","family":"Oleaceae","origin":"Tropical Asia","emoji":"🤍","description":"Jasmine is celebrated for its intensely fragrant white flowers and twining vines. It is one of the most important flowers in perfumery and has deep cultural significance across Asia.","image_url":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop","sunlight":"Full Sun to Partial Shade","water":"Moderate — keep soil consistently moist","soil":"Rich, well-drained loamy soil","difficulty":"Moderate","growth_rate":"Fast","height":"10-15 feet (climbing)","category_ids":[1,2,3,4,5],"benefits":[{"type":"Medicinal","description":"Used in traditional medicine as an antidepressant and relaxant","sort_order":1},{"type":"Medicinal","description":"Jasmine tea is rich in antioxidants and may boost immunity","sort_order":2},{"type":"Medicinal","description":"Anti-inflammatory properties help with muscle and joint pain","sort_order":3},{"type":"Health","description":"Jasmine aromatherapy reduces anxiety and improves mood","sort_order":1},{"type":"Health","description":"Jasmine tea promotes cardiovascular health","sort_order":2},{"type":"Health","description":"Natural aphrodisiac properties","sort_order":3},{"type":"Perfume","description":"Essential ingredient in luxury perfumes and colognes","sort_order":1},{"type":"Perfume","description":"Jasmine absolute is one of the most expensive fragrance materials","sort_order":2},{"type":"Perfume","description":"Used in scented oils, incense, and body products","sort_order":3},{"type":"Ornamental","description":"Beautiful climbing vine for trellises, walls, and arbors","sort_order":1},{"type":"Ornamental","description":"Fragrant night-blooming flowers ideal for patio and entryway gardens","sort_order":2},{"type":"Religious","description":"Used in Hindu and Buddhist ceremonies and offerings","sort_order":1},{"type":"Religious","description":"Symbol of purity and grace in many Asian cultures","sort_order":2},{"type":"Culinary","description":"Jasmine flowers used to scent tea, particularly green tea","sort_order":1},{"type":"Culinary","description":"Jasmine syrup used in desserts and cocktails","sort_order":2}],"care_tips":[{"title":"Provide support for climbing","description":"Jasmine needs a trellis, arbor, or fence to climb. Train vines gently.","sort_order":1},{"title":"Water consistently","description":"Keep soil moist but not waterlogged. Reduce watering in winter.","sort_order":2},{"title":"Fertilize monthly","description":"Feed with a balanced fertilizer during the growing season for abundant blooms.","sort_order":3},{"title":"Prune after flowering","description":"Cut back spent flowers and wayward vines to maintain shape and encourage reblooming.","sort_order":4},{"title":"Protect from frost","description":"In colder climates, grow in containers and move indoors during winter.","sort_order":5}]},{"id":"hibiscus","slug":"hibiscus","common_name":"Hibiscus","scientific_name":"Hibiscus rosa-sinensis","family":"Malvaceae","origin":"East Asia","emoji":"🌺","description":"Hibiscus produces large, vibrant trumpet-shaped flowers in a stunning array of colors. It is beloved for its tropical aesthetic and multiple practical uses in medicine and cuisine.","image_url":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop","sunlight":"Full Sun","water":"Moderate to High — keep soil moist","soil":"Rich, well-drained, slightly acidic soil","difficulty":"Moderate","growth_rate":"Fast","height":"3-10 feet","category_ids":[1,2,3,4,6,10],"benefits":[{"type":"Medicinal","description":"Hibiscus tea may help lower blood pressure and cholesterol","sort_order":1},{"type":"Medicinal","description":"Rich in vitamin C and antioxidants","sort_order":2},{"type":"Medicinal","description":"Traditional remedy for colds and respiratory issues","sort_order":3},{"type":"Medicinal","description":"Anti-inflammatory properties aid skin health","sort_order":4},{"type":"Health","description":"Supports liver health and aids digestion","sort_order":1},{"type":"Health","description":"Hydrating and refreshing beverage","sort_order":2},{"type":"Perfume","description":"Hibiscus extract used in tropical fragrances","sort_order":1},{"type":"Perfume","description":"Hair oils and skincare products featuring hibiscus","sort_order":2},{"type":"Ornamental","description":"Show-stopping tropical garden centerpiece","sort_order":1},{"type":"Ornamental","description":"Container plant for patios and balconies","sort_order":2},{"type":"Ornamental","description":"Popular in Hawaiian and tropical-themed events","sort_order":3},{"type":"Culinary","description":"Dried hibiscus flowers used in teas (agua de jamaica)","sort_order":1},{"type":"Culinary","description":"Hibiscus syrup for cocktails and desserts","sort_order":2},{"type":"Culinary","description":"Edible flowers used as garnish in salads","sort_order":3}],"care_tips":[{"title":"Provide ample sunlight","description":"Hibiscus needs at least 6 hours of direct sun for best blooming.","sort_order":1},{"title":"Water frequently","description":"Keep soil consistently moist, especially during hot weather. Never let it dry out completely.","sort_order":2},{"title":"Fertilize weekly","description":"Use a high-potassium fertilizer weekly during the growing season for continuous blooms.","sort_order":3},{"title":"Prune to shape","description":"Cut back in early spring to encourage bushier growth and more flowers.","sort_order":4},{"title":"Watch for pests","description":"Aphids, whiteflies, and spider mites can be problematic. Treat with neem oil.","sort_order":5}]},{"id":"chamomile","slug":"chamomile","common_name":"Chamomile","scientific_name":"Matricaria chamomilla","family":"Asteraceae","origin":"Europe and Western Asia","emoji":"🌼","description":"Chamomile is a gentle, daisy-like herb famous for its calming tea and apple-like fragrance. It is one of the oldest documented medicinal plants used by humans.","image_url":"https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=800&auto=format&fit=crop","sunlight":"Full Sun to Partial Shade","water":"Low to Moderate","soil":"Light, well-drained soil","difficulty":"Very Easy","growth_rate":"Fast","height":"8-24 inches","category_ids":[1,2,3,4],"benefits":[{"type":"Medicinal","description":"Promotes relaxation and helps treat insomnia","sort_order":1},{"type":"Medicinal","description":"Anti-inflammatory properties aid digestive issues","sort_order":2},{"type":"Medicinal","description":"Soothes skin irritations and minor wounds","sort_order":3},{"type":"Medicinal","description":"May help reduce menstrual cramps and muscle spasms","sort_order":4},{"type":"Health","description":"Calming tea is ideal for bedtime routines","sort_order":1},{"type":"Health","description":"Supports immune system with mild antibacterial properties","sort_order":2},{"type":"Perfume","description":"Chamomile essential oil used in aromatherapy blends","sort_order":1},{"type":"Perfume","description":"Apple-like scent used in natural hair and skincare products","sort_order":2},{"type":"Ornamental","description":"Delicate daisy-like flowers add charm to herb gardens","sort_order":1},{"type":"Culinary","description":"Most popular herbal tea worldwide","sort_order":1},{"type":"Culinary","description":"Edible flowers used as garnish in salads and desserts","sort_order":2}],"care_tips":[{"title":"Sow seeds directly","description":"Chamomile grows easily from seed scattered directly in the garden after frost.","sort_order":1},{"title":"Water moderately","description":"Water regularly until established, then reduce. Chamomile is somewhat drought-tolerant.","sort_order":2},{"title":"Harvest regularly","description":"Pick flowers when petals begin to fold back for the best tea flavor.","sort_order":3},{"title":"Self-seeds readily","description":"Allow some flowers to go to seed for volunteers next season.","sort_order":4}]},{"id":"areca-palm","slug":"areca-palm","common_name":"Areca Palm","scientific_name":"Dypsis lutescens","family":"Arecaceae","origin":"Madagascar","emoji":"🌴","description":"The Areca Palm, also known as the Butterfly Palm, is one of the most popular indoor palms. Its feathery, arching fronds bring a tropical feel to any space and it is renowned for its air-purifying qualities.","image_url":"https://images.unsplash.com/photo-1596574202648-5a4d45f28976?q=80&w=800&auto=format&fit=crop","sunlight":"Bright Indirect Light","water":"Moderate — keep soil slightly moist","soil":"Well-drained potting mix","difficulty":"Moderate","growth_rate":"Moderate","height":"6-10 feet (indoor), 20+ feet (outdoor)","category_ids":[7,8,10],"benefits":[{"type":"Ornamental","description":"Elegant indoor plant that adds tropical ambiance","sort_order":1},{"type":"Ornamental","description":"Popular in offices, hotels, and commercial spaces","sort_order":2},{"type":"Ornamental","description":"Natural air purifier — removes formaldehyde and benzene","sort_order":3},{"type":"Landscaping","description":"Excellent for tropical-themed garden designs","sort_order":1},{"type":"Landscaping","description":"Works well as a privacy screen or hedge in warm climates","sort_order":2},{"type":"Landscaping","description":"Ideal for poolside and patio container planting","sort_order":3}],"care_tips":[{"title":"Provide bright indirect light","description":"Place near a window with filtered light. Direct sun can scorch the fronds.","sort_order":1},{"title":"Keep soil consistently moist","description":"Water when the top inch of soil feels dry. Reduce watering in winter.","sort_order":2},{"title":"Mist regularly","description":"Areca palms love humidity. Mist the fronds daily or use a humidifier.","sort_order":3},{"title":"Fertilize seasonally","description":"Feed with a balanced liquid fertilizer monthly during spring and summer.","sort_order":4},{"title":"Remove yellow fronds","description":"Trim brown or yellow fronds at the base to keep the plant looking tidy.","sort_order":5}]},{"id":"aloe-vera","slug":"aloe-vera","common_name":"Aloe Vera","scientific_name":"Aloe barbadensis miller","family":"Asphodelaceae","origin":"Arabian Peninsula","emoji":"🌿","description":"Aloe Vera is a succulent plant species renowned for its medicinal gel-filled leaves. It is one of the most widely used medicinal plants in the world, valued for both its healing properties and ornamental appeal.","image_url":"https://images.unsplash.com/photo-1596574202648-5a4d45f28976?q=80&w=800&auto=format&fit=crop","sunlight":"Bright Indirect to Full Sun","water":"Low — water deeply but infrequently","soil":"Well-drained succulent or cactus mix","difficulty":"Very Easy","growth_rate":"Slow to Moderate","height":"1-2 feet","category_ids":[1,7,9],"benefits":[{"type":"Medicinal","description":"Heals burns, cuts, and skin irritations with cooling gel","sort_order":1},{"type":"Medicinal","description":"Anti-inflammatory and antibacterial properties","sort_order":2},{"type":"Medicinal","description":"Aloe juice aids digestion and supports gut health","sort_order":3},{"type":"Medicinal","description":"Rich in vitamins A, C, E, and B12","sort_order":4},{"type":"Health","description":"Hydrates and rejuvenates skin naturally","sort_order":1},{"type":"Health","description":"Boosts immune system with antioxidants","sort_order":2},{"type":"Ornamental","description":"Modern sculptural appearance suits contemporary decor","sort_order":1},{"type":"Ornamental","description":"Low-maintenance indoor plant ideal for beginners","sort_order":2}],"care_tips":[{"title":"Water infrequently","description":"Allow soil to dry completely between waterings. Overwatering causes root rot.","sort_order":1},{"title":"Use well-draining soil","description":"Cactus or succulent mix is essential. Add perlite or sand to improve drainage.","sort_order":2},{"title":"Provide bright light","description":"Aloe needs several hours of bright, indirect light. A south or west-facing window is ideal.","sort_order":3},{"title":"Keep at room temperature","description":"Aloe thrives between 55-80°F. Protect from frost.","sort_order":4},{"title":"Harvest leaves carefully","description":"Cut outer leaves at the base when needed. Leave inner young leaves to grow.","sort_order":5}]}];
function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}


function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatNumber(n) {
    if (n == null) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return dateStr;
    const seconds = Math.floor((now - then) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    if (days < 30) return days + 'd ago';
    const months = Math.floor(days / 30);
    return months + 'mo ago';
}

function renderStars(rating) {
    const full = Math.floor(rating || 0);
    const half = (rating || 0) - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '&#9733;'.repeat(full) + (half ? '&#9734;' : '') + '&#9734;'.repeat(empty);
}

// Expose utilities globally so other scripts can use them safely
window.escapeHtml   = escapeHtml;
window.formatDate   = formatDate;
window.formatNumber = formatNumber;
window.timeAgo      = timeAgo;
window.renderStars  = renderStars;

function getCurrentUserId() {
    try {
        const token = window.getToken ? window.getToken() : null;
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload.sub || null;
    } catch { return null; }
}

function getCurrentUserRole() {
    try {
        const token = window.getToken ? window.getToken() : null;
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return (payload.role || '').toUpperCase();
    } catch { return null; }
}

function authHeaders() {
    const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
    const token = window.getToken ? window.getToken() : null;
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
}

window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.formatNumber = formatNumber;
window.timeAgo = timeAgo;
window.renderStars = renderStars;
window.getCurrentUserId = getCurrentUserId;
window.getCurrentUserRole = getCurrentUserRole;
window.authHeaders = authHeaders;

window.handleError = function(err, context) {
    const msg = err?.message || String(err) || 'Something went wrong';
    if (typeof Toast !== 'undefined') {
        Toast.error(context ? context + ': ' + msg : msg);
    } else if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.handleApiError(err, context);
    } else {
        console.error(context ? context + ': ' + msg : msg);
    }
};

async function apiFetch(url, fallbackKey) {
    try {
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            return data;
        }
    } catch (_) { }
    if (fallbackKey && localData[fallbackKey]) return localData[fallbackKey];
    try {
        const res = await fetch(`data/${fallbackKey}.json`);
        if (res.ok) return await res.json();
    } catch (_) { }
    return [];
}

function apiFetchWithBody(url, method, body) {
    const headers = { 
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    };
    const token = window.getToken ? window.getToken() : null;
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
        .then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');
            return data;
        });
}

const api = {
    fetchProducts(params) {
        let url = '/api/products';
        if (params && typeof params === 'object') {
            const qs = new URLSearchParams(params).toString();
            if (qs) url += '?' + qs;
        }
        return apiFetch(url, 'products');
    },
    fetchProduct(id) { return apiFetch('/api/products/' + encodeURIComponent(id)); },
    fetchRelated(id) { return apiFetch('/api/products/' + encodeURIComponent(id) + '/related'); },
    fetchCategories() { return apiFetch('/api/products/list/categories', 'categories'); },
    fetchFlorists() { return apiFetch('/api/products/list/florists', 'florists'); },
    fetchArticles() { return apiFetch('/api/articles', 'articles'); },
    fetchVideos() { return apiFetch('/api/videos', 'videos'); },
    fetchEvents() { return apiFetch('/api/events', 'events'); },
    fetchCourses() { return apiFetch('/api/courses', 'courses'); },
    fetchLessons() { return apiFetch('/api/lessons', 'lessons'); },
    fetchQuizzes() { return apiFetch('/api/quizzes', 'quizzes'); },
    fetchIdentification() { return apiFetch('/api/identification', 'identification'); },
    fetchJSON(path) {
        const baseName = path.split('/').pop().replace('.json', '');
        return apiFetch(path, baseName);
    },
    createProduct(data) { return apiFetchWithBody('/api/products', 'POST', data); },
    updateProduct(id, data) { return apiFetchWithBody('/api/products/' + id, 'PUT', data); },
    deleteProduct(id) { return apiFetchWithBody('/api/products/' + id, 'DELETE'); },
    addReview(productId, data) { return apiFetchWithBody('/api/products/' + productId + '/reviews', 'POST', data); },
    getCart() { return apiFetch('/api/cart'); },
    addCartItem(data) { return apiFetchWithBody('/api/cart/items', 'POST', data); },
    updateCartItem(id, data) { return apiFetchWithBody('/api/cart/items/' + id, 'PUT', data); },
    removeCartItem(id) { return apiFetchWithBody('/api/cart/items/' + id, 'DELETE'); },
    createOrder() { return apiFetchWithBody('/api/orders', 'POST'); },
    fetchOrders() { return apiFetch('/api/orders'); },
    fetchOrder(id) { return apiFetch('/api/orders/' + id); },
    updateOrderStatus(id, status) { return apiFetchWithBody('/api/orders/' + id + '/status', 'PUT', { status }); },
    createPost(data) { return apiFetchWithBody('/api/posts', 'POST', data); },
    updatePost(id, data) { return apiFetchWithBody('/api/posts/' + id, 'PUT', data); },
    deletePost(id) { return apiFetchWithBody('/api/posts/' + id, 'DELETE'); },
    addComment(postId, data) { return apiFetchWithBody('/api/posts/' + postId + '/comments', 'POST', data); },
    deleteComment(id) { return apiFetchWithBody('/api/comments/' + id, 'DELETE'); },
    registerEvent(id) { return apiFetchWithBody('/api/events/' + id + '/register', 'POST'); },
    cancelRegistration(id) { return apiFetchWithBody('/api/events/' + id + '/register', 'DELETE'); },
    enrollCourse(id) { return apiFetchWithBody('/api/courses/' + id + '/enroll', 'POST'); },
    updateProfile(data) { return apiFetchWithBody('/api/auth/profile', 'PUT', data); },
    changePassword(data) { return apiFetchWithBody('/api/auth/password', 'PUT', data); },
    fetchKnowledgeFlowers(category) { return apiFetch('/api/knowledge/flowers' + (category ? '?category=' + encodeURIComponent(category) : ''), 'flower-knowledge'); },
    fetchKnowledgeFlower(slug) { return apiFetch('/api/knowledge/flowers/' + encodeURIComponent(slug), 'flower-knowledge'); },
    fetchKnowledgeCategories() { return apiFetch('/api/knowledge/categories', 'flower-knowledge-categories'); },
    fetchSellerAnalytics() { return apiFetchWithBody('/api/seller/analytics', 'GET'); },
    fetchSellerOrders() { return apiFetchWithBody('/api/seller/orders', 'GET'); },
    fetchSellerProducts() { return apiFetchWithBody('/api/seller/products', 'GET'); }
};

window.api = api;
