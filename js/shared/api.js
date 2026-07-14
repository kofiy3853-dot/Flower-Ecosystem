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
        const user = JSON.parse(localStorage.getItem('flower-user') || 'null');
        return user?.id || null;
    } catch { return null; }
}

function getCurrentUserRole() {
    try {
        const user = JSON.parse(localStorage.getItem('flower-user') || 'null');
        return (user?.role || '').toUpperCase();
    } catch { return null; }
}

function authHeaders() {
    return { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
}

function getCsrfToken() {
    const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

function authHeadersWithCsrf() {
    const csrf = getCsrfToken();
    return {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrf && { 'X-CSRF-Token': csrf })
    };
}

// ─── Auto-refresh wrapper ─────────────────────────────────────────────
// Intercepts 401 responses, refreshes the access token cookie, then retries.
let _refreshPromise = null;

async function fetchWithAuth(url, options = {}) {
    // Ensure cookies are always sent
    const opts = { credentials: 'include', ...options };
    // Never send a bogus Authorization header — auth is via HttpOnly cookie
    if (opts.headers) {
        const h = { ...opts.headers };
        delete h['Authorization'];
        delete h['authorization'];
        opts.headers = h;
    }

    let res = await fetch(url, opts);

    // If 401, try to refresh the access token once, then retry
    if (res.status === 401) {
        try {
            // Deduplicate concurrent refresh attempts
            if (!_refreshPromise) {
                _refreshPromise = fetch('/api/auth/refresh', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                }).finally(() => { _refreshPromise = null; });
            }
            const refreshRes = await _refreshPromise;
            if (refreshRes.ok) {
                // Retry the original request with fresh cookie
                res = await fetch(url, opts);
            }
        } catch (_) {
            // Refresh failed — fall through to original 401
        }
    }

    return res;
}

async function fetchWithCsrf(url, options = {}) {
    const opts = { credentials: 'include', ...options };
    if (opts.headers) {
        const h = { ...opts.headers };
        delete h['Authorization'];
        delete h['authorization'];
        opts.headers = h;
    }
    const csrf = getCsrfToken();
    if (csrf) {
        opts.headers = { ...opts.headers, 'X-CSRF-Token': csrf };
    }
    return fetchWithAuth(url, opts);
}

window.getCurrentUserId = getCurrentUserId;
window.getCurrentUserRole = getCurrentUserRole;
window.authHeaders = authHeaders;
window.authHeadersWithCsrf = authHeadersWithCsrf;
window.fetchWithAuth = fetchWithAuth;
window.fetchWithCsrf = fetchWithCsrf;
window.getCsrfToken = getCsrfToken;

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
        const res = await fetchWithAuth(url);
        if (res.ok) {
            const data = await res.json();
            return data;
        }
        if (res.status === 404) return null;
        console.warn('API fallback:', url, res.status);
    } catch (_) { }
    try {
        const res = await fetch(`data/${fallbackKey}.json`);
        if (res.ok) return await res.json();
    } catch (_) { }
    return [];
}

function apiFetchWithBody(url, method, body) {
    const headers = {
        'X-Requested-With': 'XMLHttpRequest'
    };
    if (body && method !== 'GET') headers['Content-Type'] = 'application/json';
    return fetchWithAuth(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
        .then(async res => {
            let data;
            try {
                data = await res.json();
            } catch {
                const text = await res.text().catch(() => '');
                throw new Error(text.slice(0, 200) || `Request failed (${res.status})`);
            }
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

    // ─── Learning Center ───────────────────────────────────
    fetchCourse(id) { return apiFetch('/api/learning/courses/' + id); },
    fetchCourses(params) { return apiFetch('/api/learning/courses?' + new URLSearchParams(params).toString()); },
    fetchEnrolledCourses() { return apiFetch('/api/learning/enrolled'); },
    fetchEnrolledCourses() { return apiFetch('/api/courses/enrolled'); },
    fetchCertificates() { return apiFetch('/api/certificates'); },
    fetchLearningPaths() { return apiFetch('/api/learning/paths'); },
    fetchLearningPath(slug) { return apiFetch('/api/learning/paths/' + encodeURIComponent(slug)); },
    updateProgress(courseId, lessonId, progress) {
        return apiFetchWithBody('/api/learning/courses/' + courseId + '/progress', 'PUT', { lesson_id: lessonId, progress });
    },
    fetchLearningPathCourses(pathId) { return apiFetch('/api/learning/paths/' + pathId + '/courses'); },
    fetchQuiz(courseId) { return apiFetch('/api/learning/courses/' + courseId + '/quiz'); },
    submitQuizAnswers(courseId, answers) { return apiFetchWithBody('/api/learning/courses/' + courseId + '/quiz/attempt', 'POST', { answers }); },
    fetchDiscussions(courseId) { return apiFetch('/api/learning/courses/' + courseId + '/discussions'); },
    createDiscussion(courseId, data) { return apiFetchWithBody('/api/learning/courses/' + courseId + '/discussions', 'POST', data); },
    fetchResources(courseId) { return apiFetch('/api/learning/courses/' + courseId + '/resources'); },
    fetchRelatedCourses(courseId) { return apiFetch('/api/learning/courses/' + courseId + '/related'); },
    fetchCourseEnrollments(courseId) { return apiFetch('/api/learning/courses/' + courseId + '/enrollments'); },

    // ─── Video Streaming ───────────────────────────────────
    fetchVideoSignedUrl(videoId) { return apiFetch('/api/videos/' + encodeURIComponent(videoId) + '/signed-url'); },

    // ─── Search ─────────────────────────────────────────────
    search(q, filters) {
        const params = new URLSearchParams({ q });
        if (filters) {
            Object.entries(filters).forEach(([k, v]) => {
                if (v != null) params.set(k, v);
            });
        }
        return apiFetch('/api/search?' + params.toString());
    },

    // ─── Certificate ───────────────────────────────────────
    generateCertificate(courseId) {
        return apiFetchWithBody('/api/certificates/generate', 'POST', { course_id: courseId });
    },
    verifyCertificate(code) {
        return apiFetch('/api/certificates/verify/' + encodeURIComponent(code));
    },

    // ─── Admin ───────────────────────────────────────────
    fetchAdminUsers() { return fetch('/api/admin/users', { headers: authHeaders() }).then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Failed'); return r.json(); }); },
    updateAdminUserRole(id, role) { return apiFetchWithBody('/api/admin/users/' + id + '/role', 'PUT', { role }); },
    toggleAdminUserStatus(id) { return apiFetchWithBody('/api/admin/users/' + id + '/status', 'PUT'); },
    updateAdminUser(id, data) { return apiFetchWithBody('/api/admin/users/' + id, 'PUT', data); },
    deleteAdminUser(id) { return apiFetchWithBody('/api/admin/users/' + id, 'DELETE'); },
    bulkDeleteUsers(ids) { return fetch('/api/admin/users/bulk-delete', { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }).then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Failed'); return r.json(); }); },
    fetchAdminOrders() { return fetch('/api/admin/orders', { headers: authHeaders() }).then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Failed'); return r.json(); }); },
    updateAdminOrderStatus(id, status) { return apiFetchWithBody('/api/admin/orders/' + id + '/status', 'PUT', { status }); },
    deleteAdminOrder(id) { return fetch('/api/admin/orders/' + id, { method: 'DELETE', headers: authHeaders() }).then(async r => { if (!r.ok) throw new Error((await r.json()).error || 'Failed'); return r.json(); }); },
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

    // ─── Instructor Resources ────────────────────────────────
    fetchInstructorResources() { return apiFetchWithBody('/api/instructor/resources', 'GET'); },
    uploadInstructorResource(data) { return apiFetchWithBody('/api/instructor/resources', 'POST', data); },
    deleteInstructorResource(id) { return apiFetchWithBody('/api/instructor/resources/' + id, 'DELETE'); },

    // ─── Instructor Discussions ──────────────────────────────
    fetchInstructorDiscussions() { return apiFetchWithBody('/api/instructor/discussions', 'GET'); },
    createInstructorDiscussion(data) { return apiFetchWithBody('/api/instructor/discussions', 'POST', data); },
    replyInstructorDiscussion(discussionId, content) { return apiFetchWithBody('/api/instructor/discussions/' + discussionId + '/reply', 'POST', { content }); },

    // ─── Instructor Recordings ────────────────────────────────
    fetchInstructorRecordings() { return apiFetchWithBody('/api/instructor/recordings', 'GET'); },
    deleteInstructorRecording(id) { return apiFetchWithBody('/api/instructor/recordings/' + id, 'DELETE'); },

    // ─── Instructor Certificates ─────────────────────────────
    fetchInstructorCertificates() { return apiFetchWithBody('/api/instructor/certificates', 'GET'); },
    issueCertificate(data) { return apiFetchWithBody('/api/instructor/certificates/issue', 'POST', data); },

    // ─── Instructor Analytics ────────────────────────────────
    fetchInstructorAnalytics() { return apiFetchWithBody('/api/instructor/analytics', 'GET'); },

    // ─── Notifications ────────────────────────────────────
    fetchNotifications() { return apiFetchWithBody('/api/notifications', 'GET'); },
    fetchUnreadCount() { return apiFetchWithBody('/api/notifications/unread-count', 'GET'); },
    markAllRead() { return apiFetchWithBody('/api/notifications/read', 'PUT'); },
    markRead(id) { return apiFetchWithBody('/api/notifications/' + id + '/read', 'PUT'); },

    // ─── Messages ──────────────────────────────────────────
    fetchConversations() { return apiFetchWithBody('/api/notifications/conversations', 'GET'); },
    createConversation(userId) { return apiFetchWithBody('/api/notifications/conversations', 'POST', { user_id: userId }); },
    fetchMessages(conversationId) { return apiFetchWithBody('/api/notifications/' + conversationId, 'GET'); },
    sendMessage(conversationId, content) { return apiFetchWithBody('/api/notifications/' + conversationId, 'POST', { content }); },

    // ─── Profile ──────────────────────────────────────────
    updateProfile(data) { return apiFetchWithBody('/api/auth/profile', 'PUT', data); },
    changePassword(data) { return apiFetchWithBody('/api/auth/password', 'PUT', data); },
    fetchProfile() { return apiFetchWithBody('/api/auth/profile', 'GET'); },

    // ─── Search ─────────────────────────────────────────────
    search(q, filters) {
        const params = new URLSearchParams({ q });
        if (filters) {
            Object.entries(filters).forEach(([k, v]) => {
                if (v != null) params.set(k, v);
            });
        }
        return apiFetch('/api/search?' + params.toString());
    },

    // ─── Certificate ───────────────────────────────────────
    generateCertificate(courseId) {
        return apiFetchWithBody('/api/certificates/generate', 'POST', { course_id: courseId });
    },
    verifyCertificate(code) {
        return apiFetch('/api/certificates/verify/' + encodeURIComponent(code));
    },

    // ─── Admin ───────────────────────────────────────────

};

window.api = api;