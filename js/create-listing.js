// js/create-listing.js
// Create Listing Wizard - products, services, flowers, plants, arrangements

var editingListingId = null;
var pendingImages = [];
var pendingVideo = null;
var pendingTags = [];
var allCategories = [];

function initCreateListing() {
    const urlParams = new URLSearchParams(window.location.search);
    editingListingId = urlParams.get('id');

    if (!localStorage.getItem('flower-token')) {
        sessionStorage.setItem('pending-redirect', 'create-listing.html' + (editingListingId ? '?id=' + editingListingId : ''));
        sessionStorage.setItem('pending-auth', 'login');
        if (typeof openAuthModal === 'function') openAuthModal('login');
        return;
    }

    loadCategories();
    initImageUpload();
    initVideoUpload();
    initTagsInput();
    renderProgress();

    if (editingListingId) {
        document.getElementById('formTitle').textContent = 'Edit Listing';
        document.getElementById('clNext').innerHTML = '<i class="bi bi-save"></i> Update Listing';
        loadListingForEdit(editingListingId);
    }
}

async function loadCategories() {
    try {
        const data = await fetch('/api/products/list/categories').then(r => r.json());
        if (Array.isArray(data) && data.length) {
            allCategories = data;
            const datalist = document.getElementById('categoryList');
            if (datalist) {
                datalist.innerHTML = data.map(c => `<option value="${escapeHtml(c.name)}">`).join('');
            }
        }
    } catch (e) {
        console.warn('Failed to load categories:', e);
    }
}

async function loadListingForEdit(id) {
    try {
        const res = await fetch(`/api/products/${id}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Failed to load listing');
        const p = await res.json();

        document.getElementById('listingTitle').value = p.name || '';
        document.getElementById('listingDesc').value = p.description || '';
        document.getElementById('listingCategory').value = p.category_name || p.category || '';
        document.getElementById('listingPrice').value = p.price || '';
        document.getElementById('listingLocation').value = p.location || '';

        const typeMap = { flower: 'flower', arrangement: 'arrangement', plant: 'plant', service: 'service' };
        const listingType = typeMap[p.type] || 'flower';
        selectType(listingType);

        if (listingType === 'flower') {
            setVal(p.flower_type, 'flowerVariety');
            setVal(p.color, 'flowerColor');
            setVal(p.flower_cond || p.condition, 'flowerFresh');
            setVal(p.height, 'stemLength');
            setVal(p.grade, 'flowerGrade');
            setVal(p.stock_quantity, 'flowerQty');
        } else if (listingType === 'arrangement') {
            setVal(p.arrangement_type, 'arrType');
            setVal(p.occasion, 'arrOccasion');
            setVal(p.flowers_included, 'arrFlowers');
            setVal(p.wrapping, 'arrWrapping');
            setVal(p.message_card ? 'yes' : 'no', 'arrMessage');
        } else if (listingType === 'plant') {
            setVal(p.plant_type, 'plantType');
            setVal(p.size, 'plantSize');
            setVal(p.pot_included ? 'yes' : 'no', 'plantPot');
            setVal(p.care_level, 'plantCare');
        } else if (listingType === 'service') {
            setVal(p.service_category, 'svcCategory');
            setVal(p.pricing_model, 'svcPricing');
            setVal(p.coverage_areas, 'svcAreas');
            setVal(p.experience, 'svcExperience');
        }

        document.getElementById('prodStock').value = p.stock_quantity || 10;
        document.getElementById('prodSku').value = p.sku || '';
        document.getElementById('prodLowStock').value = p.low_stock_alert || 10;
        document.getElementById('prodDeliveryAreas').value = Array.isArray(p.delivery_areas) ? p.delivery_areas.join(', ') : '';
        setSel(p.delivery_time, 'prodDeliveryTime');
        document.getElementById('prodShippingFee').value = p.shipping_fee || 0;
        document.getElementById('prodPickup').checked = p.pickup_available !== false;

        pendingTags = Array.isArray(p.tags) ? [...p.tags] : [];
        renderTags();

        document.getElementById('prodSeoSlug').value = p.seo_slug || '';
        document.getElementById('prodMetaDesc').value = p.meta_description || '';

        document.getElementById('prodFeatured').checked = p.featured === true;
        document.getElementById('prodBestSeller').checked = p.best_seller === true;
        document.getElementById('prodNewArrival').checked = p.new_arrival === true;

        if (p.images && p.images.length) {
            const previews = document.getElementById('imagePreviews');
            p.images.forEach(url => {
                if (!url) return;
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'position:relative;display:inline-block;';
                const img = document.createElement('img');
                img.src = url;
                img.style.cssText = 'width:100%;height:80px;object-fit:cover;border-radius:8px;';
                const btn = document.createElement('button');
                btn.className = 'cl-upload-remove';
                btn.textContent = '\u00D7';
                btn.onclick = () => removeExistingImage(url, wrapper);
                wrapper.appendChild(img);
                wrapper.appendChild(btn);
                previews.appendChild(wrapper);
            });
        }

        if (p.video_url) {
            const vp = document.getElementById('videoPreview');
            const vt = document.getElementById('videoPromptText');
            if (vp) { vp.src = p.video_url; vp.style.display = 'block'; }
            if (vt) vt.textContent = 'Current video attached';
            pendingVideo = { url: p.video_url, existing: true };
        }

        updatePreview();
    } catch (err) {
        handleError(err, 'Failed to load listing');
    }
}

function setVal(v, id) { const e = document.getElementById(id); if (e) e.value = v || ''; }
function setSel(v, id) { const e = document.getElementById(id); if (e && v) { const o = Array.from(e.options).find(x => x.value === v || x.textContent === v); if (o) e.value = o.value; } }

function selectType(type) {
    document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.cl-section#step3 .cl-card').forEach(c => c.classList.add('section-hidden'));

    const card = document.querySelector(`.type-card[onclick*="${type}"]`);
    if (card) card.classList.add('selected');

    const idMap = { flower: 'flowerFields', arrangement: 'arrangementFields', plant: 'plantFields', service: 'serviceFields' };
    const target = document.getElementById(idMap[type]);
    if (target) target.classList.remove('section-hidden');

    listingType = type;
}

var listingType = '';

function clRenderProgress() {
    document.getElementById('clProgress').innerHTML = steps.map(s => {
        let cls = 'cl-step';
        if (s.num < clStep) cls += ' done';
        else if (s.num === clStep) cls += ' active';
        return `<div class="${cls}"><span class="cl-step-num">${s.num < clStep ? '\u2713' : s.num}</span> ${s.label}</div>`;
    }).join('');
}

function clShowSection(step) {
    document.querySelectorAll('.cl-section').forEach(s => s.classList.add('section-hidden'));
    document.getElementById('step' + step).classList.remove('section-hidden');
    document.getElementById('clNav').style.display = 'flex';
    document.getElementById('clPrev').style.display = step > 1 ? 'block' : 'none';
    document.getElementById('clNext').textContent = step === totalSteps ? (editingListingId ? 'Update Listing' : 'Publish Listing') : 'Next Step';
    clRenderProgress();
}

function clNextStep() {
    if (clStep === totalSteps) { clPublish(); return; }
    if (!clValidate(clStep)) return;
    clStep++;
    clShowSection(clStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clPrevStep() {
    if (clStep <= 1) return;
    clStep--;
    clShowSection(clStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clValidate(step) {
    if (step === 1) {
        if (!listingType) { alert('Please select a listing type.'); return false; }
        return true;
    }
    if (step === 2) {
        const title = document.getElementById('listingTitle').value.trim();
        const desc = document.getElementById('listingDesc').value.trim();
        const price = document.getElementById('listingPrice').value;
        if (!title || !desc || !price) { alert('Please fill in all required fields.'); return false; }
        return true;
    }
    if (step === 5) {
        const stock = document.getElementById('prodStock').value;
        if (!stock) { alert('Please enter stock quantity.'); return false; }
        return true;
    }
    if (step === 7) {
        if (!document.getElementById('termsAgree').checked) { alert('Please agree to the terms.'); return false; }
        return true;
    }
    if (step === 6) {
        buildReview();
        return true;
    }
    return true;
}

const steps = [
    { num: 1, label: 'Type' },
    { num: 2, label: 'Info' },
    { num: 3, label: 'Details' },
    { num: 4, label: 'Media' },
    { num: 5, label: 'Inventory' },
    { num: 6, label: 'Delivery' },
    { num: 7, label: 'Publish' }
];
const totalSteps = steps.length;
let clStep = 1;

function initImageUpload() {
    const input = document.getElementById('prodImageInput');
    const zone = document.getElementById('imageUploadZone');
    if (!input || !zone) return;

    ['dragenter', 'dragover'].forEach(e => zone.addEventListener(e, ev => { ev.preventDefault(); zone.classList.add('drag-over'); }));
    ['dragleave', 'drop'].forEach(e => zone.addEventListener(e, ev => { ev.preventDefault(); zone.classList.remove('drag-over'); }));

    zone.addEventListener('drop', ev => {
        const files = ev.dataTransfer.files;
        if (files.length) handleImageFiles(files);
    });

    input.addEventListener('change', ev => {
        if (ev.target.files.length) handleImageFiles(ev.target.files);
        ev.target.value = '';
    });

    zone.addEventListener('click', () => input.click());
}

function handleImageFiles(files) {
    const previews = document.getElementById('imagePreviews');
    for (const file of files) {
        if (pendingImages.length >= 8) { alert('Maximum 8 images allowed.'); break; }
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 5 * 1024 * 1024) { alert('Each image must be under 5MB.'); continue; }

        pendingImages.push(file);
        const reader = new FileReader();
        reader.onload = e => {
            const wrapper = document.createElement('div');
            wrapper.className = 'cl-upload-thumb';
            wrapper.style.cssText = 'position:relative;';
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.cssText = 'width:100%;height:80px;object-fit:cover;border-radius:8px;';
            const btn = document.createElement('button');
            btn.className = 'cl-upload-remove';
            btn.textContent = '\u00D7';
            btn.onclick = () => { pendingImages.splice(pendingImages.indexOf(file), 1); wrapper.remove(); updatePreview(); };
            wrapper.appendChild(img);
            wrapper.appendChild(btn);
            previews.appendChild(wrapper);
            updatePreview();
        };
        reader.readAsDataURL(file);
    }
    updateUploadPrompt();
}

function initVideoUpload() {
    const input = document.getElementById('prodVideoInput');
    const zone = document.getElementById('videoUploadZone');
    if (!input || !zone) return;

    input.addEventListener('change', ev => {
        const file = ev.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('video/')) { alert('Please select a video file.'); return; }
        if (file.size > 50 * 1024 * 1024) { alert('Video must be under 50MB.'); return; }

        pendingVideo = file;
        const vp = document.getElementById('videoPreview');
        const vt = document.getElementById('videoPromptText');
        if (vp) { vp.src = URL.createObjectURL(file); vp.style.display = 'block'; }
        if (vt) vt.textContent = file.name;
        updatePreview();
    });

    zone.addEventListener('click', () => input.click());
}

function removeExistingImage(url, wrapper) {
    wrapper.remove();
}

function updateUploadPrompt() {
    const icon = document.getElementById('uploadIcon');
    const text = document.getElementById('uploadPromptText');
    if (icon) icon.style.display = pendingImages.length ? 'none' : '';
    if (text) text.textContent = pendingImages.length ? `${pendingImages.length} image(s) selected` : 'Drag & drop images here';
}

function updatePreview() {
    const preview = document.getElementById('previewImage');
    const livePreview = document.getElementById('livePreview');
    if (pendingImages.length > 0 && preview) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
        };
        reader.readAsDataURL(pendingImages[0]);
    } else if (preview) {
        preview.innerHTML = '<i class="bi bi-image" style="font-size:2rem;"></i>';
    }
    if (livePreview) livePreview.style.display = pendingImages.length ? 'block' : 'none';
}

function initTagsInput() {
    const input = document.getElementById('prodTagInput');
    const container = document.getElementById('tagsContainer');
    if (!input || !container) return;

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = input.value.trim();
            if (val && !pendingTags.includes(val) && pendingTags.length < 10) {
                pendingTags.push(val);
                renderTags();
                input.value = '';
            }
        }
    });

    renderTags();
}

function renderTags() {
    const container = document.getElementById('tagsContainer');
    if (!container) return;
    container.innerHTML = pendingTags.map((tag, i) =>
        `<span class="tag-chip" style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.3rem 0.6rem;background:rgba(139,92,246,0.1);color:var(--primary-color);border-radius:20px;font-size:0.8rem;">
            ${escapeHtml(tag)}
            <button onclick="removeTag(${i})" style="background:none;border:none;color:var(--primary-color);cursor:pointer;font-size:1rem;line-height:1;padding:0;">\u00D7</button>
        </span>`
    ).join('');
}

function removeTag(index) {
    pendingTags.splice(index, 1);
    renderTags();
}

function buildReview() {
    const typeNames = { flower: '\u{1F339} Fresh Flower', arrangement: '\u{1F490} Floral Arrangement', plant: '\u{1FAB4} Plant', service: '\u{1F4BC} Service' };
    const location = document.getElementById('listingLocation').value;
    const reviewEl = document.getElementById('reviewContent');
    if (!reviewEl) return;

    const title = document.getElementById('listingTitle').value;
    const price = document.getElementById('listingPrice').value;
    const stock = document.getElementById('prodStock').value;

    reviewEl.innerHTML = `
        <div style="background:var(--bg-light);border-radius:10px;padding:1.25rem;">
            <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;"><span style="color:var(--text-light);">Type:</span><strong>${typeNames[listingType] || listingType}</strong></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;"><span style="color:var(--text-light);">Title:</span><strong>${escapeHtml(title)}</strong></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;"><span style="color:var(--text-light);">Price:</span><strong>GHS ${Number(price).toFixed(2)}</strong></div>
            ${location ? `<div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;"><span style="color:var(--text-light);">Location:</span><strong>${escapeHtml(location)}</strong></div>` : ''}
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-light);">Stock:</span><strong>${stock} units</strong></div>
            ${pendingImages.length ? `<div style="margin-top:0.75rem;"><span style="color:var(--text-light);">Images:</span><strong> ${pendingImages.length} uploaded</strong></div>` : ''}
            ${pendingVideo ? `<div style="display:flex;justify-content:space-between;"><span style="color:var(--text-light);">Video:</span><strong> ${pendingVideo.name || pendingVideo.existing ? 'Attached' : 'Ready'}</strong></div>` : ''}
        </div>
    `;
}

async function clPublish() {
    if (!clValidate(7)) return;

    const btn = document.getElementById('clNext');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Publishing...';

    try {
        let imageUrls = [];
        let videoUrl = null;

        if (pendingImages.length > 0) {
            const fd = new FormData();
            pendingImages.forEach(f => fd.append('images', f));
            const res = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + getToken() }, body: fd });
            if (!res.ok) throw new Error('Image upload failed');
            const data = await res.json();
            imageUrls = data.images || [];
        }

        if (pendingVideo && !pendingVideo.existing) {
            const fd = new FormData();
            fd.append('video', pendingVideo);
            const res = await fetch('/api/upload/video', { method: 'POST', headers: { 'Authorization': 'Bearer ' + getToken() }, body: fd });
            if (!res.ok) throw new Error('Video upload failed');
            const data = await res.json();
            videoUrl = data.url || null;
        } else if (pendingVideo && pendingVideo.existing) {
            videoUrl = pendingVideo.url;
        }

        const deliveryAreas = document.getElementById('prodDeliveryAreas').value.split(',').map(s => s.trim()).filter(Boolean);

        const body = {
            name: document.getElementById('listingTitle').value.trim(),
            price: parseFloat(document.getElementById('listingPrice').value),
            description: document.getElementById('listingDesc').value.trim(),
            category: document.getElementById('listingCategory').value.trim(),
            stock_quantity: parseInt(document.getElementById('prodStock').value) || 0,
            currency: 'GHS',
            unit: 'Piece',
            sku: document.getElementById('prodSku').value.trim() || null,
            low_stock_alert: parseInt(document.getElementById('prodLowStock').value) || 10,
            delivery_areas: deliveryAreas,
            delivery_time: document.getElementById('prodDeliveryTime').value || null,
            shipping_fee: parseFloat(document.getElementById('prodShippingFee').value) || 0,
            pickup_available: document.getElementById('prodPickup').checked,
            tags: pendingTags,
            seo_slug: document.getElementById('prodSeoSlug').value.trim() || null,
            meta_description: document.getElementById('prodMetaDesc').value.trim() || null,
            featured: document.getElementById('prodFeatured').checked,
            best_seller: document.getElementById('prodBestSeller').checked,
            new_arrival: document.getElementById('prodNewArrival').checked,
            status: 'published',
            is_active: true
        };

        if (listingType === 'flower') {
            body.flower_type = document.getElementById('flowerVariety').value || null;
            body.color = document.getElementById('flowerColor').value || null;
            body.flower_cond = document.getElementById('flowerFresh').value || null;
            body.height = document.getElementById('stemLength').value.trim() || null;
            body.care_level = document.getElementById('flowerGrade').value || null;
            body.shelf_life_days = parseInt(document.getElementById('flowerQty').value) || 7;
        } else if (listingType === 'arrangement') {
            body.arrangement_type = document.getElementById('arrType').value || null;
            body.occasion = document.getElementById('arrOccasion').value || null;
            body.flowers_included = document.getElementById('arrFlowers').value.trim() || null;
            body.wrapping = document.getElementById('arrWrapping').value.trim() || null;
            body.message_card = document.getElementById('arrMessage').value === 'yes';
        } else if (listingType === 'plant') {
            body.plant_type = document.getElementById('plantType').value || null;
            body.size = document.getElementById('plantSize').value || null;
            body.pot_included = document.getElementById('plantPot').value === 'yes';
            body.care_level = document.getElementById('plantCare').value || null;
        } else if (listingType === 'service') {
            body.service_category = document.getElementById('svcCategory').value || null;
            body.pricing_model = document.getElementById('svcPricing').value || null;
            body.coverage_areas = document.getElementById('svcAreas').value.split(',').map(s => s.trim()).filter(Boolean);
            body.experience = document.getElementById('svcExperience').value || null;
        }

        if (imageUrls.length > 0) { body.images = imageUrls; body.image_url = imageUrls[0]; }
        if (videoUrl) body.video_url = videoUrl;

        const method = editingListingId ? 'PUT' : 'POST';
        const url = editingListingId ? `/api/products/${editingListingId}` : '/api/products';
        const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
        if (!res.ok) { const err = await res.json().catch(() => {}); throw new Error(err?.error || 'Failed to save listing'); }

        showSuccessStep();
    } catch (err) {
        handleError(err, 'Failed to publish listing');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-chevron-right"></i> Next';
    }
}

async function saveDraft() {
    if (!clValidate(2)) return;

    const btn = document.getElementById('clSaveDraft');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving...';

    try {
        const body = buildDraftBody();
        body.status = 'draft';
        body.is_active = false;

        const method = editingListingId ? 'PUT' : 'POST';
        const url = editingListingId ? `/api/products/${editingListingId}` : '/api/products';
        const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
        if (!res.ok) { const err = await res.json().catch(() => {}); throw new Error(err?.error || 'Failed to save draft'); }

        if (typeof showToast === 'function') showToast('Draft saved successfully', 'success');
        else alert('Draft saved!');
    } catch (err) {
        handleError(err, 'Failed to save draft');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

function buildDraftBody() {
    return {
        name: document.getElementById('listingTitle').value.trim(),
        price: parseFloat(document.getElementById('listingPrice').value) || 0,
        description: document.getElementById('listingDesc').value.trim(),
        category: document.getElementById('listingCategory').value.trim(),
        stock_quantity: parseInt(document.getElementById('prodStock').value) || 0,
        currency: 'GHS',
        unit: 'Piece',
        sku: document.getElementById('prodSku').value.trim() || null,
        low_stock_alert: parseInt(document.getElementById('prodLowStock').value) || 10,
        delivery_areas: document.getElementById('prodDeliveryAreas').value.split(',').map(s => s.trim()).filter(Boolean),
        delivery_time: document.getElementById('prodDeliveryTime').value || null,
        shipping_fee: parseFloat(document.getElementById('prodShippingFee').value) || 0,
        pickup_available: document.getElementById('prodPickup').checked,
        tags: pendingTags,
        seo_slug: document.getElementById('prodSeoSlug').value.trim() || null,
        meta_description: document.getElementById('prodMetaDesc').value.trim() || null,
        featured: document.getElementById('prodFeatured').checked,
        best_seller: document.getElementById('prodBestSeller').checked,
        new_arrival: document.getElementById('prodNewArrival').checked
    };
}

function showSuccessStep() {
    document.querySelectorAll('.cl-section').forEach(s => s.classList.add('section-hidden'));
    document.getElementById('stepSuccess').classList.remove('section-hidden');
    document.getElementById('clNav').style.display = 'none';
    document.getElementById('clProgress').innerHTML = steps.map(s => `<div class="cl-step done"><span class="cl-step-num">\u2713</span> ${s.label}</div>`).join('');
}

function resetForm() {
    editingListingId = null;
    pendingImages = [];
    pendingVideo = null;
    pendingTags = [];
    listingType = '';
    clStep = 1;

    document.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], textarea, select').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else el.value = '';
    });

    document.getElementById('prodStock').value = '10';
    document.getElementById('prodLowStock').value = '10';
    document.getElementById('prodShippingFee').value = '0';
    document.getElementById('prodPickup').checked = true;

    document.getElementById('imagePreviews').innerHTML = '';
    document.getElementById('videoPreview').style.display = 'none';
    document.getElementById('videoPreview').src = '';
    document.getElementById('videoPromptText').textContent = 'Add a short video (max 30 sec)';
    updateUploadPrompt();
    updatePreview();
    renderTags();

    document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.cl-section#step3 .cl-card').forEach(c => c.classList.add('section-hidden'));

    document.getElementById('formTitle').textContent = 'Create New Listing';
    document.getElementById('clNext').innerHTML = '<i class="bi bi-chevron-right"></i> Next';
    clShowSection(1);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '\'' }[c]));
}

function getToken() { return localStorage.getItem('flower-token'); }

function authHeaders() {
    const token = getToken();
    return token ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token } : { 'Content-Type': 'application/json' };
}

function handleError(err, msg) {
    console.error(msg, err);
    if (typeof showToast === 'function') showToast(msg, 'error');
    else alert(msg + ': ' + (err?.message || err));
}

if (typeof window !== 'undefined') {
    window.selectType = selectType;
    window.clNextStep = clNextStep;
    window.clPrevStep = clPrevStep;
    window.clPublish = clPublish;
    window.saveDraft = saveDraft;
    window.removeTag = removeTag;
    window.initCreateListing = initCreateListing;
}