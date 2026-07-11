// js/learning.js — Learning Center page (3-column layout)

let currentCategory = '';
let currentSort = 'popular';
let currentFilter = 'all';
let currentTab = 'courses';
let currentPage = 1;
let totalPages = 1;
let savedCourses = new Set(); // Track saved course IDs

const LEARNING_CATEGORIES = [
    { slug: 'floral-design', name: 'Floral Design', icon: 'bi-flower1', color: '#e74c3c', link: 'floral-design.html' },
    { slug: 'flower-farming', name: 'Flower Farming', icon: 'bi-seedling', color: '#27ae60', link: 'flower-farming.html' },
    { slug: 'plant-care', name: 'Plant Care', icon: 'bi-flower3', color: '#10b981', link: 'plant-care.html' },
    { slug: 'business', name: 'Business', icon: 'bi-briefcase', color: '#8b5cf6', link: 'business.html' },
    { slug: 'event-decoration', name: 'Event Decoration', icon: 'bi-ticket', color: '#f59e0b', link: 'events.html?category=workshop' },
    { slug: 'gardening', name: 'Gardening', icon: 'bi-tree', color: '#3b82f6', link: 'gardening.html' },
    { slug: 'photography', name: 'Photography', icon: 'bi-camera', color: '#ec4899', link: 'photography.html' },
    { slug: 'sustainability', name: 'Sustainability', icon: 'bi-globe', color: '#14b8a6', link: 'sustainability.html' }
];

const LEARNING_PATHS = [
    { name: 'Beginner Florist', icon: 'bi-seedling', color: '#27ae60', courses: 6, hours: 12, desc: 'Start your floristry journey with the fundamentals' },
    { name: 'Professional Florist', icon: 'bi-flower1', color: '#e74c3c', courses: 10, hours: 24, desc: 'Master advanced arrangement techniques' },
    { name: 'Wedding Specialist', icon: 'bi-flower2', color: '#ec4899', courses: 8, hours: 18, desc: 'Design stunning wedding florals' },
    { name: 'Flower Farmer', icon: 'bi-tree', color: '#f59e0b', courses: 7, hours: 16, desc: 'Grow and harvest professional flowers' },
    { name: 'Business Master', icon: 'bi-graph-up', color: '#8b5cf6', courses: 5, hours: 10, desc: 'Build and scale your floral business' },
    { name: 'Event Decorator', icon: 'bi-ticket', color: '#14b8a6', courses: 6, hours: 14, desc: 'Transform spaces with floral design' }
];

// ─── Utilities ─────────────────────────────────────────────────────────

function userLoggedIn() {
    try { return typeof window.isLoggedIn === 'function' ? window.isLoggedIn() : !!localStorage.getItem('flower-user'); } catch { return false; }
}

function formatNumber(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
}

function formatDuration(minutes) {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function renderStars(rating) {
    const r = Number(rating) || 0;
    const full = Math.floor(r);
    const half = r % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

// ─── Init ──────────────────────────────────────────────────────────────

function renderSkeletons(count) {
    const container = document.getElementById('learnContainer');
    if (!container) return;
    container.className = 'learn-skeleton';
    container.innerHTML = Array(count).fill(`
        <div class="learn-skeleton-card">
            <div class="sk-img"></div>
            <div class="sk-body">
                <div class="sk-line w50"></div>
                <div class="sk-line w90 h16"></div>
                <div class="sk-line w70"></div>
                <div class="sk-line w50"></div>
            </div>
        </div>`).join('');
    document.getElementById('pagination').innerHTML = '';
}

function renderCourseError(msg) {
    const container = document.getElementById('learnContainer');
    if (!container) return;
    container.className = '';
    container.innerHTML = `
        <div class="empty-state">
            <i class="bi bi-exclamation-triangle"></i>
            <h3>Could not load content</h3>
            <p>${escapeHtml(msg)}</p>
            <button class="btn btn-primary" onclick="retryLoadCourses()"><i class="bi bi-arrow-clockwise"></i> Try Again</button>
        </div>`;
    document.getElementById('pagination').innerHTML = '';
}

async function retryLoadCourses() {
    renderSkeletons(8);
    await loadCourses();
}
window.retryLoadCourses = retryLoadCourses;

async function initLearningPage() {
    // Read tab from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['courses', 'articles', 'videos', 'quizzes'].includes(tabParam)) {
        currentTab = tabParam;
    }

    await loadSavedCourses();
    renderCategoryCards();
    renderSidebarCategories();
    renderLearningPaths();
    setupLeftSidebar();
    setupSortTabs();
    setupFilterChips();
    setupContentTabs();
    await Promise.all([
        loadCourses(),
        loadProgress(),
        loadHeroContinueLearning(),
        loadTopInstructors()
    ]);
}

// ─── Category Cards ────────────────────────────────────────────────────

function renderCategoryCards() {
    const el = document.getElementById('catCards');
    if (!el) return;
    el.innerHTML = LEARNING_CATEGORIES.map(c => `
        <div class="learn-cat-card${currentCategory === c.slug ? ' active' : ''}" data-slug="${c.slug}" onclick="${c.link ? `window.location.href='${c.link}'` : `selectCategory('${c.slug}')`}">
            <div class="learn-cat-card-icon" style="background:${c.color}15;"><i class="bi ${c.icon}"></i></div>
            <div class="learn-cat-card-name">${c.name}</div>
        </div>
    `).join('');

    // Mobile categories
    const mobileEl = document.getElementById('mobileCategories');
    if (mobileEl) {
        mobileEl.innerHTML = LEARNING_CATEGORIES.map(c => `
            <span class="learn-chip${currentCategory === c.slug ? ' active' : ''}" data-slug="${c.slug}" onclick="${c.link ? `window.location.href='${c.link}'` : `selectCategory('${c.slug}');closeMobileFilter();`}">
                <i class="bi ${c.icon}"></i> ${c.name}
            </span>
        `).join('');
    }
}

function renderSidebarCategories() {
    const el = document.getElementById('sidebarCategories');
    if (!el) return;
    el.innerHTML = LEARNING_CATEGORIES.map(c => `
        <div class="learn-cat-item${currentCategory === c.slug ? ' active' : ''}" data-slug="${c.slug}" onclick="selectCategory('${c.slug}')">
            <div class="learn-cat-icon" style="background:${c.color}15;"><i class="bi ${c.icon}"></i></div> ${c.name}
        </div>
    `).join('');
}

function selectCategory(slug) {
    currentCategory = currentCategory === slug ? '' : slug;
    currentPage = 1;
    renderCategoryCards();
    renderSidebarCategories();
    loadCourses();
}

// ─── Learning Paths ────────────────────────────────────────────────────

function renderLearningPaths() {
    const el = document.getElementById('learningPaths');
    if (!el) return;
    el.innerHTML = LEARNING_PATHS.map(p => `
        <div class="learn-path-card" onclick="window.location.href='learning-paths.html'">
            <div class="learn-path-icon" style="background:${p.color}15;"><i class="bi ${p.icon}"></i></div>
            <h3>${p.name}</h3>
            <p>${p.desc}</p>
            <div class="learn-path-meta">
                <span><i class="bi bi-book"></i> ${p.courses} courses</span>
                <span><i class="bi bi-clock"></i> ${p.hours} hours</span>
            </div>
        </div>
    `).join('');
}

// ─── Left Sidebar Navigation ───────────────────────────────────────────

function setupLeftSidebar() {
    document.querySelectorAll('.learn-nav-item[data-filter]').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const filter = item.dataset.filter;
            document.querySelectorAll('.learn-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentFilter = filter;
            currentCategory = '';
            currentPage = 1;
            renderCategoryCards();
            renderSidebarCategories();
            loadCourses();
        });
    });
}

// ─── Sort & Filter ─────────────────────────────────────────────────────

function setupSortTabs() {
    document.getElementById('sortTabs')?.addEventListener('click', e => {
        const tab = e.target.closest('.learn-sort-tab');
        if (!tab) return;
        document.querySelectorAll('.learn-sort-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentSort = tab.dataset.sort;
        currentPage = 1;
        loadCourses();
    });
}

function setupFilterChips() {
    document.getElementById('filterChips')?.addEventListener('click', e => {
        const chip = e.target.closest('.learn-chip');
        if (!chip) return;
        document.querySelectorAll('.learn-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter;
        currentPage = 1;
        loadCourses();
    });
}

function setupContentTabs() {
    // Activate the correct tab based on currentTab
    document.querySelectorAll('.learn-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === currentTab);
    });

    document.getElementById('contentTabs')?.addEventListener('click', e => {
        const tab = e.target.closest('.learn-tab');
        if (!tab) return;
        document.querySelectorAll('.learn-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        currentPage = 1;
        loadCourses();
    });
}

// ─── Search ────────────────────────────────────────────────────────────

function searchFromHero() {
    currentPage = 1;
    loadCourses();
    if (window.innerWidth <= 900) {
        setTimeout(() => {
            document.getElementById('learnContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

function scrollToCourses(e) {
    e.preventDefault();
    document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
}

// ─── Load Courses ──────────────────────────────────────────────────────

async function loadCourses() {
    renderSkeletons(8);
    const searchEl = document.getElementById('heroSearch');
    const search = searchEl ? searchEl.value.trim() : '';
    const params = new URLSearchParams({ sort: currentSort, page: currentPage, limit: 20 });

    if (currentCategory) params.set('category', currentCategory);
    if (search) params.set('search', search);
    if (currentFilter === 'free') params.set('price', 'free');
    if (currentFilter === 'featured') params.set('featured', 'true');
    if (currentFilter === 'beginner') params.set('level', 'beginner');
    if (currentFilter === 'intermediate') params.set('level', 'intermediate');
    if (currentFilter === 'advanced') params.set('level', 'advanced');

    let data;
    let fetchError = false;
    try {
        if (currentTab === 'articles') {
            data = await api.fetchJSON(`/api/articles?${params}`);
            data.courses = data.articles || [];
        } else if (currentTab === 'videos') {
            data = await api.fetchJSON(`/api/videos?${params}`);
            data.courses = data.videos || [];
        } else if (currentTab === 'quizzes') {
            data = await api.fetchJSON(`/api/quizzes?${params}`);
            data.courses = data.quizzes || [];
        } else {
            data = await api.fetchJSON(`/api/courses?${params}`);
            data.courses = data.courses || data || [];
        }
        if (!data) { data = { courses: [], total: 0, pages: 1 }; fetchError = true; }
    } catch {
        data = { courses: [], total: 0, pages: 1 };
        fetchError = true;
    }

    const container = document.getElementById('learnContainer');
    if (!container) return;

    if (fetchError) {
        renderCourseError('Network error. Please check your connection and try again.');
        return;
    }

    totalPages = data.pages || 1;
    const courses = data.courses || [];

    if (!courses.length) {
        container.className = '';
        container.innerHTML = '<div class="empty-state"><i class="bi bi-book"></i><h3>No content found</h3><p>Try a different search or category.</p></div>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    container.className = 'learn-grid';

    container.innerHTML = courses.map(c => {
        const title = c.title || c.name || 'Untitled';
        const instructor = c.instructor || c.author_name || 'Instructor';
        const thumbnail = c.thumbnail_url || c.thumbnail || c.image_url || c.image || '';
        const rating = c.rating || 0;
        const students = c.students_count || c.students || 0;
        const price = c.price || 0;
        const level = c.level || 'All Levels';
        const duration = c.duration_minutes || c.duration || 0;
        const lessons = c.lesson_count || c.lessons || c.modules || 0;
        const progress = c.progress || 0;
        const isSaved = window.savedCourses?.has?.(String(c.id)) || false;

        return `
        <div class="learn-card" onclick="window.location.href='course-detail.html?id=${c.id}'">
            <div class="learn-card-img">
                ${thumbnail ? `<img loading="lazy" src="${escapeHtml(thumbnail)}" alt="${escapeHtml(title)}">` : `<div style="width:100%;height:100%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:2rem;">📚</div>`}
                <div class="learn-card-badges">
                    <span class="learn-badge level">${escapeHtml(level)}</span>
                    ${price == 0 ? '<span class="learn-badge free">Free</span>' : ''}
                    ${c.is_new ? '<span class="learn-badge new">New</span>' : ''}
                    ${c.has_certificate ? '<span class="learn-badge certificate"><i class="bi bi-award"></i></span>' : ''}
                    ${progress > 0 && progress < 100 ? `<span class="learn-badge progress">${progress}%</span>` : ''}
                </div>
                ${duration ? `<div class="learn-card-duration"><i class="bi bi-clock"></i> ${formatDuration(duration)}</div>` : ''}
                <button class="learn-card-save ${isSaved ? 'saved' : ''}" data-id="${c.id}" onclick="event.stopPropagation(); toggleSaveCourse(this, '${c.id}')" aria-label="${isSaved ? 'Remove from saved' : 'Save for later'}">
                    <i class="bi ${isSaved ? 'bi-heart-fill' : 'bi-heart'}"></i>
                </button>
            </div>
            <div class="learn-card-body">
                <span class="learn-card-category">${escapeHtml(currentTab === 'articles' ? 'Article' : currentTab === 'videos' ? 'Video' : currentTab === 'quizzes' ? 'Quiz' : 'Course')}</span>
                <h3>${escapeHtml(title)}</h3>
                <div class="learn-card-instructor">
                    <div class="learn-card-instructor-avatar">${instructor.charAt(0)}</div>
                    ${escapeHtml(instructor)}
                </div>
                <div class="learn-card-rating">
                    ${rating > 0 ? `<span class="stars">${renderStars(rating)}</span><strong>${Number(rating).toFixed(1)}</strong>` : ''}
                    <span class="count">(${formatNumber(students)} students)</span>
                </div>
                <div class="learn-card-meta">
                    ${lessons ? `<span><i class="bi bi-collection-play"></i> ${lessons} lessons</span>` : ''}
                    ${duration ? `<span><i class="bi bi-clock"></i> ${formatDuration(duration)}</span>` : ''}
                </div>
                ${progress > 0 ? `
                <div class="learn-card-progress">
                    <div class="learn-progress-bar"><div class="learn-progress-fill" style="width:${progress}%"></div></div>
                    <div style="font-size:0.72rem;color:var(--primary-color);margin-top:0.2rem;">${progress}% complete</div>
                </div>` : ''}
                <div class="learn-card-footer">
                    <span class="learn-card-price${price == 0 ? ' free' : ''}">${price == 0 ? 'Free' : 'GHS ' + Number(price).toFixed(2)}</span>
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.location.href='course-detail.html?id=${c.id}'">${progress > 0 ? 'Continue' : 'Start'}</button>
                </div>
            </div>
        </div>`;
    }).join('');

    renderPagination();
}

function renderPagination() {
    const el = document.getElementById('pagination');
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    let html = '';
    if (currentPage > 1) html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})"><i class="bi bi-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7 && i > 3 && i < totalPages - 2 && Math.abs(i - currentPage) > 1) {
            if (i === 4 || i === totalPages - 3) html += `<span style="padding:0.4rem 0.3rem;color:var(--text-muted)">...</span>`;
            continue;
        }
        html += `<button class="page-btn${i === currentPage ? ' active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    if (currentPage < totalPages) html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})"><i class="bi bi-chevron-right"></i></button>`;
    el.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadCourses();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Sidebar Data ──────────────────────────────────────────────────────

async function loadProgress() {
    if (!userLoggedIn()) return;
    try {
        const data = await api.fetchJSON('/api/progress/overview');
        if (data) {
            const percent = data.completion_rate || data.percent || 0;
            document.getElementById('progressPercent').textContent = percent + '%';
            document.getElementById('statEnrolled').textContent = data.enrolled || 0;
            document.getElementById('statCompleted').textContent = data.completed || 0;
            document.getElementById('statCerts').textContent = data.certificates || 0;

            // Update ring
            const circumference = 2 * Math.PI * 34;
            const offset = circumference - (percent / 100) * circumference;
            document.getElementById('progressRing').setAttribute('stroke-dashoffset', offset);
        }
    } catch {}
}

async function loadHeroContinueLearning() {
    const card = document.getElementById('continueLearningCard');
    const titleEl = document.getElementById('continueCourseTitle');
    const progressEl = document.getElementById('continueCourseProgress');
    const progressBar = document.getElementById('continueProgressBar');
    const btn = document.getElementById('continueLearningBtn');
    if (!card) return;
    if (!userLoggedIn()) {
        card.style.display = 'none';
        return;
    }
    try {
        const data = await api.fetchJSON('/api/courses/enrolled');
        const courses = data.courses || data || [];
        if (!courses.length) {
            card.style.display = 'none';
            return;
        }
        // Find course with most recent activity (highest progress < 100)
        const inProgress = courses.filter(c => (c.progress || 0) > 0 && (c.progress || 0) < 100);
        const course = inProgress[0] || courses[0];
        if (!course) {
            card.style.display = 'none';
            return;
        }
        const progress = course.progress || 0;
        titleEl.textContent = course.title || course.name || 'Course';
        progressEl.textContent = `${progress}% complete`;
        progressBar.style.width = progress + '%';
        card.style.display = 'block';
        btn.onclick = () => {
            window.location.href = `course-detail.html?id=${course.id}`;
        };
    } catch {
        card.style.display = 'none';
    }
}

async function loadContinueLearning() {
    const el = document.getElementById('continueCourses');
    if (!el) return;
    if (!userLoggedIn()) {
        el.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">Sign in to track progress</p>';
        return;
    }
    try {
        const data = await api.fetchJSON('/api/courses/enrolled');
        const courses = data.courses || data || [];
        if (!courses.length) {
            el.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">No courses yet. Start learning!</p>';
            return;
        }
        el.innerHTML = courses.slice(0, 3).map(c => {
            const progress = c.progress || 0;
            return `
            <div class="my-course-item" onclick="window.location.href='course-detail.html?id=${c.id}'">
                <div class="my-course-thumb">${c.thumbnail_url || c.thumbnail ? `<img src="${escapeHtml(c.thumbnail_url || c.thumbnail)}" alt="">` : '📚'}</div>
                <div class="my-course-info">
                    <h4>${escapeHtml(c.title || c.name || 'Course')}</h4>
                    <p>${escapeHtml(c.instructor || 'Instructor')}</p>
                    <div class="my-course-progress">${progress}% complete</div>
                </div>
            </div>`;
        }).join('');
    } catch {}
}

async function loadTopInstructors() {
    const el = document.getElementById('topInstructors');
    if (!el) return;
    try {
        const data = await api.fetchJSON('/api/products/list/florists');
        const instructors = (data.florists || data || []).slice(0, 4);
        if (!instructors.length) {
            el.innerHTML = '<p style="font-size:0.82rem;color:var(--text-muted);">No instructors yet</p>';
            return;
        }
        el.innerHTML = instructors.map(i => {
            const name = i.name || 'Instructor';
            const role = i.role || 'Master Florist';
            return `
            <div class="instructor-item" onclick="window.location.href='florist-profile.html?id=${i.id}'" style="cursor:pointer;">
                <div class="instructor-avatar">${i.image ? `<img src="${escapeHtml(i.image)}" alt="">` : name.charAt(0)}</div>
                <div class="instructor-info">
                    <div class="instructor-name">${escapeHtml(name)}</div>
                    <div class="instructor-role">${escapeHtml(role)}</div>
                </div>
            </div>`;
        }).join('');
    } catch {}
}

// ─── Saved Courses ─────────────────────────────────────────

async function loadSavedCourses() {
    try {
        const saved = JSON.parse(localStorage.getItem('ml-saved') || '[]');
        savedCourses = new Set(saved);
    } catch {
        savedCourses = new Set();
    }
}

async function toggleSaveCourse(courseId, btn) {
    if (!userLoggedIn()) {
        if (typeof openAuthModal === 'function') openAuthModal('login');
        else window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        return;
    }
    const isSaved = savedCourses.has(courseId);
    try {
        if (isSaved) {
            await api.removeFavorite(courseId);
            savedCourses.delete(courseId);
            btn.innerHTML = '<i class="bi bi-heart"></i>';
            btn.classList.remove('saved');
            btn.setAttribute('aria-label', 'Save for later');
        } else {
            await api.addFavorite(courseId);
            savedCourses.add(courseId);
            btn.innerHTML = '<i class="bi bi-heart-fill"></i>';
            btn.classList.add('saved');
            btn.setAttribute('aria-label', 'Remove from saved');
        }
        localStorage.setItem('ml-saved', JSON.stringify([...savedCourses]));
        if (typeof showToast === 'function') showToast(isSaved ? 'Removed from saved' : 'Saved for later', isSaved ? 'info' : 'success');
    } catch (err) {
        console.error('Save toggle error:', err);
        // Fallback to localStorage only
        if (isSaved) {
            savedCourses.delete(courseId);
            btn.innerHTML = '<i class="bi bi-heart"></i>';
            btn.classList.remove('saved');
        } else {
            savedCourses.add(courseId);
            btn.innerHTML = '<i class="bi bi-heart-fill"></i>';
            btn.classList.add('saved');
        }
        localStorage.setItem('ml-saved', JSON.stringify([...savedCourses]));
    }
}
// ─── Mobile Filter Drawer ──────────────────────────────────────────────

function openMobileFilter() {
    const drawer = document.getElementById('mobileFilterDrawer');
    if (drawer) {
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileFilter() {
    const drawer = document.getElementById('mobileFilterDrawer');
    if (drawer) {
        drawer.classList.remove('open');
        document.body.style.overflow = '';
    }
}

function applyMobileFilters() {
    const activeSort = document.querySelector('#mobileSortTabs .learn-sort-tab.active');
    if (activeSort) currentSort = activeSort.dataset.sort;

    const activeFilter = document.querySelector('#mobileFilterChips .learn-chip.active');
    if (activeFilter) currentFilter = activeFilter.dataset.filter;

    document.querySelectorAll('.learn-sort-tab').forEach(t => t.classList.toggle('active', t.dataset.sort === currentSort));
    document.querySelectorAll('.learn-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === currentFilter));

    currentPage = 1;
    closeMobileFilter();
    loadCourses();
}
