// js/shared/api.js v4.0
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
        const token = localStorage.getItem('flower-token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload.sub || null;
    } catch { return null; }
}

function getCurrentUserRole() {
    try {
        const token = localStorage.getItem('flower-token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return (payload.role || '').toUpperCase();
    } catch { return null; }
}

function authHeaders() {
    const headers = { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
    const token = localStorage.getItem('flower-token');
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
}

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
        const headers = {};
        const token = localStorage.getItem('flower-token');
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch(url, { headers });
        if (res.ok) {
            const data = await res.json();
            return data;
        }
    } catch (_) { }
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
    const token = localStorage.getItem('flower-token');
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
    fetchRelated(id) { return apiFetch('/api/products/' + encodeURIComponent(id) + '/related', 'products'); },
    fetchCategories() { return apiFetch('/api/products/list/categories', 'categories'); },
    fetchFlorists() { return apiFetch('/api/products/list/florists', 'florists'); },
    fetchArticles() { return apiFetch('/api/articles', 'articles'); },
    fetchVideos() { return apiFetch('/api/videos', 'videos'); },
    fetchEvents() { return apiFetch('/api/events', 'events'); },
    fetchCourses() { return apiFetch('/api/courses', 'courses').then(d => Array.isArray(d) ? d : (d?.courses || [])); },
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
    fetchSellerProducts() { return apiFetchWithBody('/api/seller/products', 'GET'); },
    fetchWorkshops() { return apiFetch('/api/workshops', 'workshops'); },
    fetchWorkshop(id) { return apiFetch('/api/workshops/' + encodeURIComponent(id), 'workshops'); },
    fetchLiveClasses() { return apiFetch('/api/live-classes', 'live-classes'); },
    fetchLiveClass(id) { return apiFetch('/api/live-classes/' + encodeURIComponent(id), 'live-classes'); },
    fetchAssignments() { return apiFetch('/api/assignments', 'assignments'); },
    submitQuiz(id, data) { return apiFetchWithBody('/api/quizzes/' + id + '/submit', 'POST', data); },
    submitAssignment(id, data) { return apiFetchWithBody('/api/assignments/' + id + '/submit', 'POST', data); },
    gradeAssignment(id, data) { return apiFetchWithBody('/api/assignments/' + id + '/grade', 'PUT', data); },
    fetchLearningPaths() { return apiFetch('/api/learning-paths', 'learning-paths'); },
    fetchLearningPath(id) { return apiFetch('/api/learning-paths/' + encodeURIComponent(id), 'learning-paths'); },
    registerWorkshop(id) { return apiFetchWithBody('/api/workshops/' + id + '/register', 'POST'); },
    registerLiveClass(id) { return apiFetchWithBody('/api/live-classes/' + id + '/register', 'POST'); },
    attendLiveClass(id) { return apiFetchWithBody('/api/live-classes/' + id + '/attend', 'POST'); },
    fetchCertificates() { return apiFetch('/api/certificates', 'certificates'); },
    verifyCertificate(id) { return apiFetch('/api/certificates/' + id + '/verify', 'certificates'); },
    fetchDiscussions() { return apiFetch('/api/discussions', 'discussions'); },
    createDiscussion(data) { return apiFetchWithBody('/api/discussions', 'POST', data); },
    fetchResources() { return apiFetch('/api/resources', 'resources'); },
    fetchProgressOverview() { return apiFetch('/api/progress/overview', 'progress'); },
    fetchFavorites() { return apiFetch('/api/buyer/favorites', 'favorites'); },
    addFavorite(productId) { return apiFetchWithBody('/api/buyer/favorites', 'POST', { product_id: productId }); },
    removeFavorite(productId) { return apiFetchWithBody('/api/buyer/favorites/' + productId, 'DELETE'); },

    // ─── Admin ───────────────────────────────────────────
    fetchAdminUsers() { return fetch('/api/admin/users', { headers: authHeaders() }).then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Failed'); return r.json(); }); },
    updateAdminUserRole(id, role) { return apiFetchWithBody('/api/admin/users/' + id + '/role', 'PUT', { role }); },
    toggleAdminUserStatus(id) { return apiFetchWithBody('/api/admin/users/' + id + '/status', 'PUT'); },
    updateAdminUser(id, data) { return apiFetchWithBody('/api/admin/users/' + id, 'PUT', data); },
    deleteAdminUser(id) { return apiFetchWithBody('/api/admin/users/' + id, 'DELETE'); },
    fetchAdminOrders() { return fetch('/api/admin/orders', { headers: authHeaders() }).then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Failed'); return r.json(); }); },
    updateAdminOrderStatus(id, status) { return apiFetchWithBody('/api/admin/orders/' + id + '/status', 'PUT', { status }); },
    fetchAdminSellers() { return fetch('/api/admin/sellers', { headers: authHeaders() }).then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Failed'); return r.json(); }); },
    fetchAdminBuyers() { return fetch('/api/admin/buyers', { headers: authHeaders() }).then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Failed'); return r.json(); }); },
    fetchAdminAnalytics() { return fetch('/api/admin/analytics', { headers: authHeaders() }).then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Failed'); return r.json(); }); },
    fetchAdminAnnouncements() { return fetch('/api/admin/announcements', { headers: authHeaders() }).then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Failed'); return r.json(); }); },
    createAdminAnnouncement(data) { return apiFetchWithBody('/api/admin/announcements', 'POST', data); },
    approveAdminProduct(id, is_active) { return apiFetchWithBody('/api/admin/products/' + id + '/approve', 'PUT', { is_active }); },

    // ─── Instructor ─────────────────────────────────────────
    fetchInstructorCourses() { return apiFetchWithBody('/api/instructor/courses', 'GET'); },
    fetchInstructorStudents() { return apiFetchWithBody('/api/instructor/students', 'GET'); },
    fetchInstructorAssignments() { return apiFetchWithBody('/api/instructor/assignments', 'GET'); },
    fetchInstructorLiveClasses() { return apiFetchWithBody('/api/instructor/live-classes', 'GET'); },
    fetchInstructorCertificates() { return apiFetchWithBody('/api/instructor/certificates', 'GET'); },
    fetchInstructorAnalytics() { return apiFetchWithBody('/api/instructor/analytics', 'GET'); },

    // ─── Instructor Application ────────────────────────────
    submitInstructorApplication(data) { return apiFetchWithBody('/api/instructor/apply', 'POST', data); },
    fetchMyInstructorApplication() { return apiFetchWithBody('/api/instructor/my-application', 'GET'); },
    fetchMyInstructorLevel() { return apiFetchWithBody('/api/instructor/my-level', 'GET'); },
    fetchInstructorApplications(status) { return apiFetchWithBody('/api/instructor/applications' + (status ? '?status=' + status : ''), 'GET'); },
    fetchInstructorApplicationDetail(id) { return apiFetchWithBody('/api/instructor/applications/' + id, 'GET'); },
    updateInstructorApplication(id, data) { return apiFetchWithBody('/api/instructor/applications/' + id, 'PUT', data); },
    fetchInstructorLevels() { return apiFetchWithBody('/api/instructor/levels', 'GET'); },
    updateInstructorLevel(userId, data) { return apiFetchWithBody('/api/instructor/levels/' + userId, 'PUT', data); },
    fetchInstructorStats() { return apiFetchWithBody('/api/instructor/stats', 'GET'); }
};

window.api = api;