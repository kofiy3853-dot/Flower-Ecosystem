// js/product-detail.js
// Product Detail Page — gallery, tabs, reviews, cart, wishlist, recently viewed

let currentProduct = null;
let lightboxImages = [];
let lightboxIndex = 0;

function openLightbox(images, index) {
    lightboxImages = images;
    lightboxIndex = index;
    document.getElementById('lightboxImg').src = images[index];
    updateLightboxCounter();
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
}

function lightboxNav(dir) {
    lightboxIndex = (lightboxIndex + dir + lightboxImages.length) % lightboxImages.length;
    document.getElementById('lightboxImg').src = lightboxImages[lightboxIndex];
    updateLightboxCounter();
}

function updateLightboxCounter() {
    document.getElementById('lightboxCounter').textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
}

document.addEventListener('keydown', (e) => {
    if (!document.getElementById('lightbox').classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lightboxNav(-1);
    if (e.key === 'ArrowRight') lightboxNav(1);
});

function setMainImg(src, el) {
    document.getElementById('pdMainImg').src = src;
    document.querySelectorAll('.pd-thumb').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
}

function updateQty(delta) {
    const inp = document.getElementById('pdQty');
    let v = parseInt(inp.value) + delta;
    if (v < 1) v = 1;
    inp.value = v;
}

function renderStars(rating) {
    const r = Number(rating) || 0;
    const f = Math.floor(r);
    const h = r - f >= 0.5;
    let s = '';
    for (let i = 0; i < f; i++) s += '<i class="bi bi-star-fill"></i>';
    if (h) s += '<i class="bi bi-star-half"></i>';
    for (let i = f + (h ? 1 : 0); i < 5; i++) s += '<i class="bi bi-star"></i>';
    return s;
}

function getVideoEmbedUrl(url) {
    if (!url) return null;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) return 'https://www.youtube.com/embed/' + yt[1];
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return 'https://player.vimeo.com/video/' + vm[1];
    if (url.includes('/embed/')) return url;
    return null;
}

function renderReviews(list) {
    const container = document.getElementById('pdReviewList');
    document.getElementById('pdReviewCount').textContent = list.length;
    if (!list.length) {
        container.innerHTML = '<p style="color:var(--text-light);padding:1rem 0;">No reviews yet. Be the first to review this product!</p>';
        return;
    }
    container.innerHTML = list.map(r => `
        <div class="pd-review-card">
            <div class="rv-header">
                <div>
                    <span class="rv-author">${escapeHtml(r.author || r.reviewer_name || 'Anonymous')}</span>
                    <span class="rv-date"> · ${r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString() : '')}</span>
                </div>
                <div class="rv-stars">${renderStars(r.rating)}</div>
            </div>
            <div class="rv-text">${escapeHtml(r.text || r.review || '')}</div>
        </div>
    `).join('');
}

let reviewRating = 0;
function setReviewRating(r) {
    reviewRating = r;
    const stars = document.querySelectorAll('#reviewStars span');
    stars.forEach((s, i) => { s.style.color = i < r ? '#f59e0b' : '#ddd'; });
}

async function submitReview() {
    const text = document.getElementById('reviewText').value.trim();
    if (!reviewRating) { alert('Please select a rating.'); return; }
    if (!text) { alert('Please write a review.'); return; }
    if (!currentProduct) return;

    try {
        const res = await fetch(`/api/products/${currentProduct.id}/reviews`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ rating: reviewRating, review: text })
        });
        if (res.ok) {
            document.getElementById('reviewText').value = '';
            setReviewRating(0);
            // Reload product to get updated reviews
            const updated = await api.fetchProduct(currentProduct.id);
            if (updated) {
                currentProduct = updated;
                renderReviews(updated.reviewList || updated.reviews || []);
            }
            alert('Review submitted!');
        } else {
            const err = await res.json().catch(() => ({}));
            alert(err.error || 'Failed to submit review');
        }
    } catch (e) {
        alert('Please sign in to submit a review.');
    }
}

// Tabs
document.querySelectorAll('.pd-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.pd-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.pd-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
});

// ========================================================================
// Load Product
// ========================================================================

(async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) { window.location.href = 'marketplace.html'; return; }

    let p;
    try {
        p = await api.fetchProduct(id);
        if (!p || p.error || (Array.isArray(p) && p.length === 0)) throw new Error('Product not found');
    } catch (e) {
        document.getElementById('pdTitle').textContent = 'Product Not Found';
        document.getElementById('pdDesc').textContent = "The product you're looking for doesn't exist or has been removed.";
        return;
    }

    currentProduct = p;
    const price = Number(p.price) || 0;
    const oldPrice = Number(p.oldPrice) || 0;
    const rating = Number(p.rating) || 0;
    const reviewCount = Number(p.reviews) || 0;
    const categoryName = p.category_name || p.category || '';
    const sellerName = p.seller || 'Seller';
    const sellerId = p.seller_id || '';
    const videoUrl = p.video_url || p.videoUrl || null;
    const images = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : []);
    const discount = oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
    const currency = p.currency || 'GHS';

    document.title = `${p.name} – Flower Ecosystem`;
    document.getElementById('pdBreadcrumb').textContent = p.name;

    // Gallery
    if (images.length) {
        lightboxImages = images;
        const mainImg = document.getElementById('pdMainImg');
        mainImg.src = images[0];
        mainImg.onerror = function() {
            this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="%23f3f4f6" width="400" height="300"/><text x="200" y="160" text-anchor="middle" fill="%239ca3af" font-size="16">Image not available</text></svg>';
        };
        document.getElementById('pdThumbs').innerHTML = images.map((url, i) =>
            `<img src="${escapeHtml(url)}" alt="Thumbnail" class="pd-thumb ${i === 0 ? 'active' : ''}" onclick="setMainImg('${escapeHtml(url)}', this); lightboxIndex = ${i};" onerror="this.style.display='none'">`
        ).join('');
    } else if (p.image) {
        const mainImg = document.getElementById('pdMainImg');
        mainImg.src = p.image;
        mainImg.onerror = function() {
            this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect fill="%23f3f4f6" width="400" height="300"/><text x="200" y="160" text-anchor="middle" fill="%239ca3af" font-size="16">Image not available</text></svg>';
        };
    }

    // Video
    if (videoUrl) {
        const embed = getVideoEmbedUrl(videoUrl);
        const wrap = document.getElementById('pdVideoWrap');
        if (embed) {
            document.getElementById('pdVideoIframe').src = embed;
            wrap.style.display = 'block';
        } else {
            const vf = document.getElementById('pdVideoFile');
            vf.src = videoUrl;
            vf.style.display = 'block';
            wrap.style.display = 'block';
        }
    }

    // Info
    document.getElementById('pdTitle').textContent = p.name;
    document.getElementById('pdPrice').innerHTML = `${currency} ${price.toFixed(2)}${oldPrice > price ? `<span class="old">${currency} ${oldPrice.toFixed(2)}</span><span class="discount">-${discount}%</span>` : ''}`;
    document.getElementById('mobilePrice').textContent = `${currency} ${price.toFixed(2)}`;
    document.getElementById('pdDesc').textContent = p.description || '';
    document.getElementById('pdFullDesc').textContent = p.description || 'No detailed description available.';
    document.getElementById('pdCategory').textContent = categoryName;
    document.getElementById('pdSeller').textContent = sellerName;
    document.getElementById('pdSellerLink').href = sellerId ? `florist-profile.html?id=${sellerId}` : 'florists.html';

    // Badge
    if (p.badge) {
        document.getElementById('pdBadge').textContent = p.badge;
        document.getElementById('pdBadge').style.display = 'inline';
    }

    // Rating
    if (rating > 0) {
        document.getElementById('pdRating').innerHTML = `<span class="stars">${renderStars(rating)}</span> <span>${rating.toFixed(1)}</span> <span>(${reviewCount} reviews)</span>`;
    }

    // Reviews
    renderReviews(p.reviewList || p.reviews || []);

    // Stock
    const stockEl = document.getElementById('pdStock');
    if (p.stock_quantity <= 0) {
        stockEl.innerHTML = '<i class="bi bi-x-circle-fill"></i> Out of Stock';
        stockEl.classList.add('out');
        document.getElementById('pdAddBtn').disabled = true;
    } else if (p.stock_quantity <= 5) {
        stockEl.innerHTML = `<i class="bi bi-exclamation-circle-fill"></i> Only ${p.stock_quantity} left — order soon!`;
        stockEl.classList.add('low');
    } else if (p.fresh) {
        stockEl.innerHTML = `<i class="bi bi-check-circle-fill"></i> Fresh — In Stock (${p.stock_quantity} available)`;
    } else {
        stockEl.innerHTML = `<i class="bi bi-check-circle-fill"></i> In Stock (${p.stock_quantity} available)`;
    }

    // Specifications
    const specs = [
        { label: 'Category', value: categoryName },
        { label: 'Color', value: p.color || 'Assorted' },
        { label: 'Condition', value: p.flower_cond || 'Fresh Cut' },
        { label: 'Occasion', value: p.occasion || 'Any' },
        { label: 'Shelf Life', value: (p.shelf_life_days || 7) + ' days' },
        { label: 'Size', value: p.size || 'Standard' },
        { label: 'Fragrance', value: p.fragrance || 'Natural' },
        { label: 'Origin', value: p.origin || 'Local' }
    ].filter(s => s.value && s.value !== 'null' && s.value !== 'undefined');
    document.getElementById('pdSpecs').innerHTML = specs.map(s =>
        `<tr><td>${s.label}</td><td>${s.value}</td></tr>`
    ).join('');

    // Care Guide
    const careItems = [
        { icon: '☀️', title: 'Light', value: p.sunlight || p.light || 'Bright indirect light' },
        { icon: '💧', title: 'Water', value: p.watering || 'Keep soil moist' },
        { icon: '🌡', title: 'Temperature', value: p.temperature || '18-24°C' },
        { icon: '🌱', title: 'Soil', value: p.soil_type || 'Well-draining soil' },
        { icon: '🧪', title: 'Fertilizer', value: p.fertilizer || 'Monthly feed' },
        { icon: '✂️', title: 'Pruning', value: p.care_tips || 'Remove dead blooms' }
    ];
    document.getElementById('pdCareGuide').innerHTML = careItems.map(c => `
        <div style="background:var(--bg-light);border-radius:10px;padding:1rem;text-align:center;">
            <div style="font-size:1.5rem;margin-bottom:0.5rem;">${c.icon}</div>
            <div style="font-weight:600;font-size:0.85rem;margin-bottom:0.25rem;">${c.title}</div>
            <div style="font-size:0.8rem;color:var(--text-light);">${c.value}</div>
        </div>
    `).join('');

    // Guarantee
    if (p.guarantee) {
        document.getElementById('pdGuarantee').style.display = 'block';
        document.getElementById('pdGuaranteeText').textContent = p.guarantee + (p.guarantee_details ? ' — ' + p.guarantee_details : '');
    }

    // FAQ
    const faqs = [
        { q: 'How long do these flowers stay fresh?', a: 'Most flowers last 5-7 days with proper care. We include care instructions with every order.' },
        { q: 'Do you offer same-day delivery?', a: 'Yes, same-day delivery is available for orders placed before 2 PM in major cities.' },
        { q: 'Can I customize this arrangement?', a: 'Yes! Contact the seller to discuss customization options.' },
        { q: 'What is your return policy?', a: 'We accept returns within 7 days of delivery. If flowers arrive damaged, we offer a full refund or replacement.' }
    ];
    document.getElementById('pdFaqList').innerHTML = faqs.map((f, i) => `
        <div style="border:1px solid var(--border-color);border-radius:8px;margin-bottom:0.5rem;overflow:hidden;">
            <div onclick="this.parentElement.classList.toggle('open')" style="padding:0.75rem 1rem;font-weight:500;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
                ${f.q} <i class="bi bi-chevron-down" style="transition:transform 0.2s;"></i>
            </div>
            <div style="padding:0 1rem 0.75rem;font-size:0.9rem;color:var(--text-light);display:none;">${f.a}</div>
        </div>
    `).join('');

    // About Seller
    const sellerInitial = (sellerName || 'S')[0].toUpperCase();
    document.getElementById('pdSellerAvatar').textContent = sellerInitial;
    document.getElementById('pdSellerAbout').textContent = `Trusted seller offering quality flowers and arrangements. Verified member of Flower Ecosystem.`;
    document.getElementById('pdSellerRating').innerHTML = `<i class="bi bi-star-fill" style="color:#f59e0b;"></i> ${rating.toFixed(1)} rating`;
    document.getElementById('pdSellerProducts').innerHTML = `<i class="bi bi-box"></i> ${reviewCount + 10}+ products`;
    document.getElementById('pdSellerLink').href = sellerId ? `florist-profile.html?id=${sellerId}` : 'florists.html';

    // Add to cart
    document.getElementById('pdAddBtn').addEventListener('click', async () => {
        const qty = parseInt(document.getElementById('pdQty').value);
        const btn = document.getElementById('pdAddBtn');
        btn.disabled = true;
        try {
            if (typeof isLoggedIn === 'function' && isLoggedIn()) {
                await serverAddToCart(p.id, qty);
                await syncCartFromServer();
            } else {
                const cartData = JSON.parse(localStorage.getItem('flower-cart') || '[]');
                const existing = cartData.find(i => i.id === p.id);
                if (existing) existing.qty += qty;
                else cartData.push({ id: p.id, name: p.name, price, image: images[0] || '', qty });
                localStorage.setItem('flower-cart', JSON.stringify(cartData));
                if (typeof updateAllBadges === 'function') updateAllBadges();
            }
            const msg = document.getElementById('pdCartMsg');
            msg.style.display = 'block';
            clearTimeout(msg._t);
            msg._t = setTimeout(() => msg.style.display = 'none', 3000);
        } catch (err) {
            alert(err.message || 'Failed to add to cart');
        } finally {
            btn.disabled = false;
        }
    });

    // Wishlist
    document.getElementById('pdWishlistBtn').addEventListener('click', function() {
        this.classList.toggle('active');
        const icon = this.querySelector('i');
        icon.classList.toggle('bi-heart');
        icon.classList.toggle('bi-heart-fill');
    });

    // Related
    try {
        const related = await api.fetchRelated(p.id);
        const grid = document.getElementById('pdRelated');
        if (related.length) {
            grid.innerHTML = related.map(r => {
                const rPrice = Number(r.price) || 0;
                const rImg = r.image || (r.images && r.images[0]) || '';
                return `
                    <a href="product-detail.html?id=${r.id}" class="pd-related-item">
                        <img loading="lazy" src="${escapeHtml(rImg)}" alt="${escapeHtml(r.name)}">
                        <div class="r-body">
                            <h4>${escapeHtml(r.name)}</h4>
                            <div class="r-price">${r.currency || 'GHS'} ${rPrice.toFixed(2)}</div>
                        </div>
                    </a>`;
            }).join('');
        }
    } catch (_) {}

    // Recently Viewed
    saveRecent(p);
    loadRecent();
})();

// ========================================================================
// Recently Viewed
// ========================================================================

function saveRecent(product) {
    try {
        let recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        recent = recent.filter(r => r.id !== product.id);
        const img = product.image || (Array.isArray(product.images) && product.images[0]) || '';
        recent.unshift({ id: product.id, name: product.name, image: img, ts: Date.now() });
        recent = recent.slice(0, 6);
        localStorage.setItem('recentlyViewed', JSON.stringify(recent));
    } catch {}
}

function loadRecent() {
    try {
        const recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        if (recent.length < 2) return;
        document.getElementById('recentSection').style.display = 'block';
        document.getElementById('recentScroll').innerHTML = recent.map(r => `
            <a href="product-detail.html?id=${escapeHtml(r.id)}" class="recent-card">
                <img src="${escapeHtml(r.image || '')}" alt="${escapeHtml(r.name)}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 140 140%22><rect fill=%22%23fce7f0%22 width=%22140%22 height=%22140%22/><text x=%2270%22 y=%2280%22 text-anchor=%22middle%22 fill=%22%23d8447c%22 font-size=%2236%22>✿</text></svg>'">
                <div class="recent-card-name">${escapeHtml(r.name)}</div>
            </a>
        `).join('');
    } catch {}
}