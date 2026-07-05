// Instructor Application Form — Multi-step wizard
(function(){
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const TOTAL_STEPS = 11;
let currentStep = 1;
let portfolioImages = [];
let uploadedFiles = { profilePhoto: null, govId: null, selfie: null, introVideo: null, sampleLesson: null };

const steps = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'Professional' },
    { num: 3, label: 'Bio' },
    { num: 4, label: 'Expertise' },
    { num: 5, label: 'Education' },
    { num: 6, label: 'Portfolio' },
    { num: 7, label: 'Teaching' },
    { num: 8, label: 'Sample Lesson' },
    { num: 9, label: 'Verification' },
    { num: 10, label: 'Links & Payout' },
    { num: 11, label: 'Review' }
];

// ─── Init ──────────────────────────────────────────────
async function init() {
    // Check if user is logged in
    const token = localStorage.getItem('flower-token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    // Pre-fill email from stored user
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const stored = JSON.parse(localStorage.getItem('flower-auth') || '{}');
        if (stored.email) $('#email').value = stored.email;
        if (stored.first_name || stored.last_name) {
            $('#fullName').value = ((stored.first_name || '') + ' ' + (stored.last_name || '')).trim();
        }
    } catch {}

    // Check existing application
    try {
        const res = await fetch('/api/instructor/my-application', {
            headers: { 'Authorization': 'Bearer ' + token, 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (res.ok) {
            const app = await res.json();
            if (app) showExistingApplication(app);
        }
    } catch {}

    renderProgress();
}

function showExistingApplication(app) {
    const banner = $('#statusBanner');
    banner.style.display = 'block';
    const statusMap = {
        pending: { label: 'Application Pending', icon: 'bi-hourglass-split', class: 'pending' },
        under_review: { label: 'Under Review', icon: 'bi-eye', class: 'under_review' },
        approved: { label: 'Approved!', icon: 'bi-check-circle-fill', class: 'approved' },
        rejected: { label: 'Application Rejected', icon: 'bi-x-circle', class: 'rejected' },
        needs_info: { label: 'More Information Needed', icon: 'bi-info-circle', class: 'needs_info' }
    };
    const s = statusMap[app.status] || statusMap.pending;
    let html = `<div class="apply-card" style="margin-bottom:1rem;">
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
            <span class="apply-status-badge ${s.class}"><i class="bi ${s.icon}"></i> ${s.label}</span>
            <span style="font-size:0.85rem;color:var(--text-light);">Applied ${timeAgo(app.created_at)}</span>
        </div>`;
    if (app.rejection_reason) {
        html += `<p style="margin-top:0.75rem;font-size:0.9rem;"><strong>Reason:</strong> ${escapeHtml(app.rejection_reason)}</p>`;
    }
    if (app.status === 'approved') {
        html += `<p style="margin-top:0.75rem;"><a href="instructor-dashboard.html" class="btn btn-primary" style="padding:0.5rem 1.5rem;">Go to Dashboard</a></p>`;
    }
    html += `</div>`;
    banner.innerHTML = html;

    if (app.status === 'approved' || app.status === 'rejected') {
        $('#applyNav').style.display = 'none';
        $$('.apply-step-content').forEach(s => s.style.display = 'none');
        $('#applyProgress').style.display = 'none';
    }
}

// ─── Progress Bar ──────────────────────────────────────
function renderProgress() {
    $('#applyProgress').innerHTML = steps.map(s => {
        let cls = s.num === currentStep ? 'active' : s.num < currentStep ? 'completed' : '';
        return `<div class="apply-step ${cls}" onclick="goToStep(${s.num})"><span class="apply-step-num">${s.num < currentStep ? '<i class="bi bi-check-lg"></i>' : s.num}</span><span class="apply-step-label">${s.label}</span></div>`;
    }).join('');
}

window.goToStep = function(n) {
    if (n < 1 || n > TOTAL_STEPS) return;
    $$('.apply-step-content').forEach(s => s.style.display = 'none');
    $(`#step${n}`).style.display = 'block';
    currentStep = n;
    renderProgress();
    updateNav();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ─── Navigation ────────────────────────────────────────
function updateNav() {
    $('#prevBtn').style.display = currentStep > 1 ? 'inline-flex' : 'none';
    if (currentStep === TOTAL_STEPS) {
        $('#nextBtn').innerHTML = '<i class="bi bi-send"></i> Submit Application';
        $('#nextBtn').onclick = submitApplication;
    } else {
        $('#nextBtn').innerHTML = 'Next <i class="bi bi-arrow-right"></i>';
        $('#nextBtn').onclick = nextStep;
    }
}

window.nextStep = function() {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) {
        currentStep++;
        $$('.apply-step-content').forEach(s => s.style.display = 'none');
        $(`#step${currentStep}`).style.display = 'block';
        renderProgress();
        updateNav();
        if (currentStep === 11) buildReview();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.prevStep = function() {
    if (currentStep > 1) {
        currentStep--;
        $$('.apply-step-content').forEach(s => s.style.display = 'none');
        $(`#step${currentStep}`).style.display = 'block';
        renderProgress();
        updateNav();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// ─── Validation ────────────────────────────────────────
function validateStep(n) {
    switch(n) {
        case 1:
            if (!$('#fullName').value.trim()) { alert('Full name is required'); return false; }
            if (!$('#email').value.trim()) { alert('Email is required'); return false; }
            return true;
        case 2:
            if (!$('#profTitle').value) { alert('Professional title is required'); return false; }
            if (!$('#yearsExp').value) { alert('Years of experience is required'); return false; }
            return true;
        case 3:
            if ($('#bio').value.trim().length < 100) { alert('Bio must be at least 100 characters'); return false; }
            return true;
        case 4: {
            const sel = $$('#expertiseTags .apply-tag.selected');
            if (sel.length === 0) { alert('Select at least one area of expertise'); return false; }
            return true;
        }
        case 6:
            if (portfolioImages.length < 5) { alert('Upload at least 5 portfolio images'); return false; }
            return true;
        case 7:
            if (!uploadedFiles.introVideo) { alert('Introduction video is required'); return false; }
            return true;
        case 8:
            if (!$('#lessonOutline').value.trim()) { alert('Lesson outline is required'); return false; }
            return true;
        case 9:
            if (!uploadedFiles.govId) { alert('Government ID is required'); return false; }
            return true;
        case 11: {
            if (!$('#agreeTerms').checked || !$('#agreeContent').checked || !$('#agreeCommunity').checked || !$('#agreeQuality').checked) {
                alert('Please accept all agreements');
                return false;
            }
            return true;
        }
        default: return true;
    }
}

// ─── Tags ──────────────────────────────────────────────
window.toggleTag = function(el) {
    el.classList.toggle('selected');
};

function getSelectedTags(container) {
    return Array.from($$('#' + container + ' .apply-tag.selected')).map(t => t.dataset.val);
}

// ─── Education & Certifications ────────────────────────
let eduCount = 0, certCount = 0;

window.addEducation = function() {
    eduCount++;
    const html = `<div class="apply-edu-item" id="edu${eduCount}">
        <div class="apply-grid">
            <div class="apply-group"><label class="apply-label">Institution</label><input type="text" class="apply-input" data-field="institution" placeholder="e.g. University of Ghana"></div>
            <div class="apply-group"><label class="apply-label">Qualification</label><input type="text" class="apply-input" data-field="qualification" placeholder="e.g. Diploma in Horticulture"></div>
            <div class="apply-group"><label class="apply-label">Graduation Year</label><input type="number" class="apply-input" data-field="year" min="1950" max="2030" placeholder="e.g. 2015"></div>
            <div class="apply-group" style="align-self:end;"><button type="button" class="apply-remove-btn" onclick="document.getElementById('edu${eduCount}').remove()"><i class="bi bi-trash"></i> Remove</button></div>
        </div>
    </div>`;
    $('#educationList').insertAdjacentHTML('beforeend', html);
};

window.addCertification = function() {
    certCount++;
    const html = `<div class="apply-cert-item" id="cert${certCount}">
        <div class="apply-grid">
            <div class="apply-group"><label class="apply-label">Certification Name</label><input type="text" class="apply-input" data-field="name" placeholder="e.g. Floristry Certification"></div>
            <div class="apply-group"><label class="apply-label">Issuing Organization</label><input type="text" class="apply-input" data-field="issuer" placeholder="e.g. Ghana Florists Association"></div>
            <div class="apply-group"><label class="apply-label">Year Obtained</label><input type="number" class="apply-input" data-field="year" min="1950" max="2030" placeholder="e.g. 2018"></div>
            <div class="apply-group" style="align-self:end;"><button type="button" class="apply-remove-btn" onclick="document.getElementById('cert${certCount}').remove()"><i class="bi bi-trash"></i> Remove</button></div>
        </div>
    </div>`;
    $('#certList').insertAdjacentHTML('beforeend', html);
};

function getEducation() {
    return Array.from($$('.apply-edu-item')).map(el => ({
        institution: el.querySelector('[data-field="institution"]').value,
        qualification: el.querySelector('[data-field="qualification"]').value,
        year: el.querySelector('[data-field="year"]').value
    })).filter(e => e.institution || e.qualification);
}

function getCertifications() {
    return Array.from($$('.apply-cert-item')).map(el => ({
        name: el.querySelector('[data-field="name"]').value,
        issuer: el.querySelector('[data-field="issuer"]').value,
        year: el.querySelector('[data-field="year"]').value
    })).filter(c => c.name);
}

// ─── File Uploads ──────────────────────────────────────
window.previewImg = function(input, previewId) {
    const file = input.files[0];
    if (!file) return;
    const key = input.id;
    uploadedFiles[key] = file;
    const reader = new FileReader();
    reader.onload = e => {
        $(`#${previewId}`).innerHTML = `<img src="${e.target.result}" class="apply-preview" alt="Preview">`;
    };
    reader.readAsDataURL(file);
};

window.handleVideoUpload = function(input, previewId) {
    const file = input.files[0];
    if (!file) return;
    uploadedFiles[input.id] = file;
    $(`#${previewId}`).innerHTML = `<div style="padding:0.75rem;background:var(--bg-light);border-radius:8px;margin-top:0.5rem;display:flex;align-items:center;gap:0.5rem;"><i class="bi bi-film" style="color:var(--primary-color);font-size:1.2rem;"></i><span style="font-size:0.85rem;">${escapeHtml(file.name)} (${(file.size / 1024 / 1024).toFixed(1)}MB)</span><button type="button" class="apply-remove-btn" onclick="this.parentElement.remove();uploadedFiles['${input.id}']=null;"><i class="bi bi-x"></i></button></div>`;
};

window.handlePortfolioUpload = function(input) {
    const files = Array.from(input.files);
    files.forEach(file => {
        if (portfolioImages.length >= 20) return;
        const reader = new FileReader();
        reader.onload = e => {
            const idx = portfolioImages.length;
            portfolioImages.push({ file, url: e.target.result });
            const grid = $('#portfolioGrid');
            grid.insertAdjacentHTML('beforeend', `<div style="position:relative;border-radius:8px;overflow:hidden;aspect-ratio:1;" id="portImg${idx}">
                <img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;" alt="Portfolio">
                <button onclick="removePortfolio(${idx})" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:0.7rem;"><i class="bi bi-x"></i></button>
            </div>`);
            $('#portfolioHint').textContent = `${portfolioImages.length} image${portfolioImages.length !== 1 ? 's' : ''} uploaded (minimum 5 required)`;
        };
        reader.readAsDataURL(file);
    });
    input.value = '';
};

window.removePortfolio = function(idx) {
    portfolioImages[idx] = null;
    const el = $(`#portImg${idx}`);
    if (el) el.remove();
    const count = portfolioImages.filter(Boolean).length;
    $('#portfolioHint').textContent = `${count} image${count !== 1 ? 's' : ''} uploaded (minimum 5 required)`;
};

// ─── Teaching experience toggle ────────────────────────
$('#hasTaught')?.addEventListener('change', function() {
    const show = this.value === 'true';
    $('#teachFormatGroup').style.display = show ? 'block' : 'none';
    $('#studentsTaughtGroup').style.display = show ? 'block' : 'none';
    $('#prevPlatformsGroup').style.display = show ? 'block' : 'none';
});

// ─── Review Summary ────────────────────────────────────
function buildReview() {
    const expertise = getSelectedTags('expertiseTags');
    const edu = getEducation();
    const certs = getCertifications();
    const summary = `
    <div style="display:grid;gap:1rem;">
        <div style="padding:1rem;background:var(--bg-light);border-radius:10px;">
            <h4 style="font-size:0.9rem;margin-bottom:0.5rem;"><i class="bi bi-person"></i> Basic Information</h4>
            <p style="font-size:0.85rem;"><strong>Name:</strong> ${escapeHtml($('#fullName').value)}<br>
            <strong>Email:</strong> ${escapeHtml($('#email').value)}<br>
            <strong>Phone:</strong> ${escapeHtml($('#phone').value || 'Not provided')}<br>
            <strong>Location:</strong> ${escapeHtml(($('#city').value || '') + ($('#country').value ? ', ' + $('#country').value : ''))}</p>
        </div>
        <div style="padding:1rem;background:var(--bg-light);border-radius:10px;">
            <h4 style="font-size:0.9rem;margin-bottom:0.5rem;"><i class="bi bi-briefcase"></i> Professional</h4>
            <p style="font-size:0.85rem;"><strong>Title:</strong> ${escapeHtml($('#profTitle').value)}<br>
            <strong>Experience:</strong> ${$('#yearsExp').value} years<br>
            <strong>Employer:</strong> ${escapeHtml($('#employer').value || 'N/A')}<br>
            <strong>Business:</strong> ${escapeHtml($('#ownBusiness').value || 'N/A')}</p>
        </div>
        <div style="padding:1rem;background:var(--bg-light);border-radius:10px;">
            <h4 style="font-size:0.9rem;margin-bottom:0.5rem;"><i class="bi bi-journal-text"></i> Bio</h4>
            <p style="font-size:0.85rem;">${escapeHtml($('#bio').value).substring(0, 200)}${$('#bio').value.length > 200 ? '...' : ''}</p>
        </div>
        <div style="padding:1rem;background:var(--bg-light);border-radius:10px;">
            <h4 style="font-size:0.9rem;margin-bottom:0.5rem;"><i class="bi bi-tags"></i> Expertise (${expertise.length})</h4>
            <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">${expertise.map(e => `<span style="padding:0.2rem 0.6rem;background:var(--primary-light);color:var(--primary-color);border-radius:4px;font-size:0.8rem;">${escapeHtml(e)}</span>`).join('')}</div>
        </div>
        <div style="padding:1rem;background:var(--bg-light);border-radius:10px;">
            <h4 style="font-size:0.9rem;margin-bottom:0.5rem;"><i class="bi bi-images"></i> Portfolio</h4>
            <p style="font-size:0.85rem;">${portfolioImages.filter(Boolean).length} images uploaded</p>
        </div>
        <div style="padding:1rem;background:var(--bg-light);border-radius:10px;">
            <h4 style="font-size:0.9rem;margin-bottom:0.5rem;"><i class="bi bi-camera-video"></i> Teaching</h4>
            <p style="font-size:0.85rem;"><strong>Introduction Video:</strong> ${uploadedFiles.introVideo ? 'Uploaded' : 'Not uploaded'}<br>
            <strong>Sample Lesson:</strong> ${uploadedFiles.sampleLesson ? 'Uploaded' : 'Outline only'}</p>
        </div>
        ${edu.length ? `<div style="padding:1rem;background:var(--bg-light);border-radius:10px;">
            <h4 style="font-size:0.9rem;margin-bottom:0.5rem;"><i class="bi bi-mortarboard"></i> Education (${edu.length})</h4>
            ${edu.map(e => `<p style="font-size:0.85rem;">${escapeHtml(e.qualification || '')} — ${escapeHtml(e.institution || '')} (${escapeHtml(e.year || '')})</p>`).join('')}
        </div>` : ''}
        ${certs.length ? `<div style="padding:1rem;background:var(--bg-light);border-radius:10px;">
            <h4 style="font-size:0.9rem;margin-bottom:0.5rem;"><i class="bi bi-award"></i> Certifications (${certs.length})</h4>
            ${certs.map(c => `<p style="font-size:0.85rem;">${escapeHtml(c.name)} — ${escapeHtml(c.issuer || '')} (${escapeHtml(c.year || '')})</p>`).join('')}
        </div>` : ''}
    </div>`;
    $('#reviewSummary').innerHTML = summary;
}

// ─── Submit Application ────────────────────────────────
async function submitApplication() {
    if (!validateStep(11)) return;

    const btn = $('#nextBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Submitting...';

    try {
        const token = localStorage.getItem('flower-token');
        const expertise = getSelectedTags('expertiseTags');

        // Upload portfolio images
        const portfolioUrls = [];
        for (const img of portfolioImages.filter(Boolean)) {
            const fd = new FormData();
            fd.append('file', img.file);
            try {
                const res = await fetch('/api/instructor/upload-portfolio', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: fd
                });
                if (res.ok) {
                    const data = await res.json();
                    portfolioUrls.push({ url: data.url, type: 'image' });
                }
            } catch {}
        }

        // Upload gov ID
        let govIdUrl = null;
        if (uploadedFiles.govId) {
            const fd = new FormData();
            fd.append('file', uploadedFiles.govId);
            const res = await fetch('/api/instructor/upload-portfolio', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: fd
            });
            if (res.ok) { const d = await res.json(); govIdUrl = d.url; }
        }

        // Upload selfie
        let selfieUrl = null;
        if (uploadedFiles.selfie) {
            const fd = new FormData();
            fd.append('file', uploadedFiles.selfie);
            const res = await fetch('/api/instructor/upload-portfolio', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: fd
            });
            if (res.ok) { const d = await res.json(); selfieUrl = d.url; }
        }

        // Upload intro video
        let introVideoUrl = null;
        if (uploadedFiles.introVideo) {
            const fd = new FormData();
            fd.append('file', uploadedFiles.introVideo);
            try {
                const res = await fetch('/api/instructor/upload-video', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: fd
                });
                if (res.ok) { const d = await res.json(); introVideoUrl = d.url; }
            } catch {}
        }

        // Upload sample lesson video
        let sampleLessonUrl = null;
        if (uploadedFiles.sampleLesson) {
            const fd = new FormData();
            fd.append('file', uploadedFiles.sampleLesson);
            try {
                const res = await fetch('/api/instructor/upload-video', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: fd
                });
                if (res.ok) { const d = await res.json(); sampleLessonUrl = d.url; }
            } catch {}
        }

        // Upload profile photo
        let profilePhotoUrl = null;
        if (uploadedFiles.profilePhoto) {
            const fd = new FormData();
            fd.append('file', uploadedFiles.profilePhoto);
            try {
                const res = await fetch('/api/instructor/upload-portfolio', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: fd
                });
                if (res.ok) { const d = await res.json(); profilePhotoUrl = d.url; }
            } catch {}
        }

        // Submit application
        const body = {
            full_name: $('#fullName').value.trim(),
            email: $('#email').value.trim(),
            phone: $('#phone').value.trim(),
            country: $('#country').value.trim(),
            city: $('#city').value.trim(),
            languages: $('#languages').value.split(',').map(l => l.trim()).filter(Boolean),
            profile_photo: profilePhotoUrl,
            professional_title: $('#profTitle').value,
            years_experience: parseInt($('#yearsExp').value) || 0,
            current_employer: $('#employer').value.trim(),
            own_business: $('#ownBusiness').value.trim(),
            bio: $('#bio').value.trim(),
            expertise,
            education: getEducation(),
            certifications: getCertifications(),
            portfolio: portfolioUrls,
            has_taught_before: $('#hasTaught').value === 'true',
            teaching_format: $('#teachFormat').value,
            students_taught: parseInt($('#studentsTaught').value) || 0,
            previous_platforms: $('#prevPlatforms').value.trim(),
            intro_video: introVideoUrl,
            sample_lesson_url: sampleLessonUrl,
            sample_lesson_outline: $('#lessonOutline').value.trim(),
            gov_id_url: govIdUrl,
            selfie_url: selfieUrl,
            website: $('#website').value.trim(),
            business_website: $('#businessWebsite').value.trim(),
            portfolio_url: $('#portfolioUrl').value.trim(),
            social_links: {
                instagram: $('#socialIg').value.trim(),
                facebook: $('#socialFb').value.trim(),
                youtube: $('#socialYt').value.trim(),
                twitter: $('#socialTw').value.trim()
            },
            bank_account_name: $('#bankName').value.trim(),
            bank_name: $('#bankInstitution').value.trim(),
            bank_account_number: $('#bankAcct').value.trim(),
            bank_routing: $('#bankRouting').value.trim(),
            mobile_money_number: $('#momoNumber').value.trim(),
            tax_id: $('#taxId').value.trim(),
            payout_method: $('#payoutMethod').value,
            terms_accepted: $('#agreeTerms').checked,
            content_guidelines: $('#agreeContent').checked,
            community_standards: $('#agreeCommunity').checked,
            copyright_policy: $('#agreeQuality').checked
        };

        const res = await fetch('/api/instructor/apply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit');

        // Show success
        $$('.apply-step-content').forEach(s => s.style.display = 'none');
        $('#stepSuccess').style.display = 'block';
        $('#applyNav').style.display = 'none';
        $('#applyProgress').style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
        alert(err.message || 'Failed to submit application. Please try again.');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send"></i> Submit Application';
    }
}

// ─── Expose for nav ────────────────────────────────────
window.uploadedFiles = uploadedFiles;

init();
})();
