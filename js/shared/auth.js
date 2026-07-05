// js/shared/auth.js

const AUTH_KEY = 'flower-auth';
const TOKEN_KEY = 'flower-token';

function isLoggedIn() {
    try { return !!localStorage.getItem(TOKEN_KEY) || !!localStorage.getItem(AUTH_KEY); } catch { return false; }
}

function getCurrentUser() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return { id: payload.id, email: payload.email, role: (payload.role || '').toLowerCase(), name: payload.name || payload.email?.split('@')[0] };
        } catch { }
    }
    const data = localStorage.getItem(AUTH_KEY);
    if (!data) return null;
    const user = JSON.parse(data);
    if (user && user.role) user.role = user.role.toLowerCase();
    return user;
}

function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function setLoggedIn(user, token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

function logout() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'X-Requested-With': 'XMLHttpRequest' }
        }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY);
}

async function apiLogin(email, password) {
    const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
    }
    return await res.json();
}

async function apiRegister(formData) {
    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: formData
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registration failed');
    }
    return await res.json();
}

function openAuthModal(tab) {
    const existing = document.getElementById('auth-modal');
    if (!existing) {
        loadAuthModal();
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.classList.remove('hidden');
            if (tab === 'register') {
                const regTab = document.getElementById('registerTabBtn');
                if (regTab) regTab.click();
            } else {
                const loginTab = document.getElementById('loginTabBtn');
                if (loginTab) loginTab.click();
            }
        }
        return;
    }
    existing.classList.remove('hidden');
    if (tab === 'register') {
        const regTab = document.getElementById('registerTabBtn');
        if (regTab) regTab.click();
    } else {
        const loginTab = document.getElementById('loginTabBtn');
        if (loginTab) loginTab.click();
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
}

function setupPasswordToggle(inputId, toggleId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if (!toggle || !input) return;
    toggle.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        toggle.innerHTML = show ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    });
}

function loadAuthModal() {
    if (document.getElementById('auth-modal')) return;
    const html = `
<div id="auth-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
    <div class="modal-content">
        <button class="modal-close" aria-label="Close modal">&times;</button>
        <h2 id="authModalTitle" class="visually-hidden">Account Access</h2>

        <div class="modal-tabs" role="tablist">
            <button class="modal-tab-btn active" role="tab" aria-selected="true" data-tab="login" id="loginTabBtn">Login</button>
            <button class="modal-tab-btn" role="tab" aria-selected="false" data-tab="register" id="registerTabBtn">Register</button>
        </div>

        <div id="login-tab" class="modal-tab-content active" role="tabpanel" aria-labelledby="loginTabBtn">
            <h2>Welcome Back</h2>
            <p class="modal-subtitle">Sign in to your account</p>

            <form class="auth-form" id="loginForm" novalidate>
                <div class="form-group">
                    <label for="login-email">Email Address</label>
                    <input type="email" id="login-email" name="email" placeholder="your@email.com" required autocomplete="email" aria-describedby="loginEmailError">
                    <span class="error-message" id="loginEmailError" aria-live="polite"></span>
                </div>

                <div class="form-group">
                    <label for="login-password">Password</label>
                    <div style="position:relative">
                        <input type="password" id="login-password" name="password" placeholder="••••••••" required autocomplete="current-password" aria-describedby="loginPasswordError" style="padding-right:2.5rem">
                        <button type="button" id="toggle-login-password" class="password-toggle" aria-label="Toggle password visibility"><i class="bi bi-eye"></i></button>
                    </div>
                    <span class="error-message" id="loginPasswordError" aria-live="polite"></span>
                </div>

                <div class="form-check">
                    <input type="checkbox" id="remember-me" name="remember">
                    <label for="remember-me">Remember me</label>
                </div>

                <button type="submit" class="btn btn-primary w-100">Sign In</button>
                <p id="loginApiError" class="error-message" style="text-align:center; margin-top:0.5rem; display:none;"></p>
            </form>

            <p class="form-link">Forgot password? <a href="forgot-password.html">Reset here</a></p>
            <p style="font-size:0.8rem; text-align:center; margin-top:1rem; color:var(--text-light); border-top:1px solid var(--border-color); padding-top:1rem;"><a href="#" id="switchToRegister" style="color:var(--primary-color);">Don't have an account?</a></p>
        </div>

        <div id="register-tab" class="modal-tab-content" role="tabpanel" aria-labelledby="registerTabBtn">
            <h2>Join the Ecosystem</h2>
            <p class="modal-subtitle">Create your account to get started</p>

            <form class="auth-form" id="registerForm" novalidate>
                <div class="form-group">
                    <label for="register-name">Full Name</label>
                    <input type="text" id="register-name" name="name" placeholder="John Doe" required autocomplete="name" aria-describedby="registerNameError">
                    <span class="error-message" id="registerNameError" aria-live="polite"></span>
                </div>

                <div class="form-group">
                    <label for="register-email">Email Address</label>
                    <input type="email" id="register-email" name="email" placeholder="your@email.com" required autocomplete="email" aria-describedby="registerEmailError">
                    <span class="error-message" id="registerEmailError" aria-live="polite"></span>
                </div>

                <div class="form-group">
                    <label for="register-password">Password</label>
                    <div style="position:relative">
                        <input type="password" id="register-password" name="password" placeholder="••••••••" required minlength="8" autocomplete="new-password" aria-describedby="registerPasswordError registerPasswordHint" style="padding-right:2.5rem">
                        <button type="button" id="toggle-register-password" class="password-toggle" aria-label="Toggle password visibility"><i class="bi bi-eye"></i></button>
                    </div>
                    <span class="error-message" id="registerPasswordError" aria-live="polite"></span>
                    <span class="form-hint" id="registerPasswordHint">At least 8 characters</span>
                </div>

                <div class="form-group">
                    <label for="register-role">I am a:</label>
                    <select id="register-role" name="role" required aria-describedby="registerRoleError" onchange="document.getElementById('sellerFields').style.display = ['seller','grower'].includes(this.value) ? 'block' : 'none'">
                        <option value="">Select your role</option>
                        <option value="buyer">Buyer</option>
                        <option value="seller">Seller/Florist</option>
                        <option value="grower">Grower</option>
                        <option value="instructor">Instructor</option>
                        <option value="student">Student</option>
                    </select>
                    <span class="error-message" id="registerRoleError" aria-live="polite"></span>
                </div>

                <div id="sellerFields" style="display:none;">
                    <div class="form-group">
                        <label for="register-location">Location</label>
                        <input type="text" id="register-location" name="location" placeholder="City, Country" autocomplete="address-level2">
                    </div>

                    <div class="form-group">
                        <label for="register-description">Short Bio / Description</label>
                        <textarea id="register-description" name="description" rows="2" placeholder="Tell us a bit about yourself..." style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:var(--radius-sm); font-family:inherit;"></textarea>
                    </div>

                    <div class="form-group">
                        <label for="register-avatar">Profile Picture</label>
                        <input type="file" id="register-avatar" name="avatar" accept="image/jpeg,image/png,image/webp" style="padding:0.5rem 0;">
                    </div>
                </div>

                <div class="form-check">
                    <input type="checkbox" id="agree-terms" name="terms" required aria-describedby="termsError">
                    <label for="agree-terms">I agree to the <a href="terms.html">Terms of Service</a> and <a href="privacy.html">Privacy Policy</a></label>
                    <span class="error-message" id="termsError" aria-live="polite"></span>
                </div>

                <button type="submit" class="btn btn-primary w-100">Create Account</button>
                <p id="registerApiError" class="error-message" style="text-align:center; margin-top:0.5rem; display:none;"></p>
            </form>
            <p style="font-size:0.8rem; text-align:center; margin-top:1rem; color:var(--text-light); border-top:1px solid var(--border-color); padding-top:1rem;"><a href="#" id="switchToLogin" style="color:var(--primary-color);">Already have an account?</a></p>
        </div>
    </div>
</div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    setupPasswordToggle('login-password', 'toggle-login-password');
    setupPasswordToggle('register-password', 'toggle-register-password');
}

function afterAuth() {
    closeAuthModal();
    if (typeof updateAccountUI === 'function') updateAccountUI();

    // Merge localStorage cart into server cart after login
    (async () => {
        try {
            const localCart = JSON.parse(localStorage.getItem('flower-cart') || '[]');
            if (localCart.length) {
                await Promise.all(localCart.map(item =>
                    fetch('/api/cart/items', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('flower-token'), 'X-Requested-With': 'XMLHttpRequest' },
                        body: JSON.stringify({ product_id: item.id, quantity: item.qty || 1 })
                    }).catch(() => {})
                ));
                localStorage.removeItem('flower-cart');
            }
        } catch (_) {}
        if (typeof syncCartFromServer === 'function') syncCartFromServer();
    })();

    const pendingRedirect = sessionStorage.getItem('pending-redirect');
    if (pendingRedirect) {
        sessionStorage.removeItem('pending-redirect');
        window.location.href = pendingRedirect;
        return;
    }

    const pendingSell = sessionStorage.getItem('pending-sell');
    if (pendingSell) {
        sessionStorage.removeItem('pending-sell');
        window.location.href = 'sell.html';
        return;
    }

    const user = getCurrentUser();
    const role = (user?.role || '').toLowerCase();
    if (['admin', 'superadmin'].includes(role)) {
        window.location.href = 'admin.html';
        return;
    }
    if (['seller', 'florist', 'grower'].includes(role)) {
        window.location.href = 'seller-dashboard.html';
        return;
    }
    window.location.href = 'buyer-dashboard.html';
}

function handleAuthSubmit(formId, apiFn, getData) {
    document.addEventListener('submit', async (e) => {
        const form = e.target.closest(`#${formId}`);
        if (!form) return;
        e.preventDefault();
        const data = getData(form);
        if (!data) return;

        const errorEl = form.querySelector(`#${formId}ApiError`) || form.querySelector('#loginApiError, #registerApiError');
        try {
            const result = await apiFn(data);
            const userEmail = data.get ? data.get('email') : (data.email || '');
            const userName = data.get ? data.get('name') : (data.name || '');
            const userObj = result.user || { email: userEmail, name: userName || userEmail };
            if (result.token) localStorage.setItem(TOKEN_KEY, result.token);
            localStorage.setItem(AUTH_KEY, JSON.stringify(userObj));
            afterAuth();
        } catch (err) {
            if (errorEl) { errorEl.textContent = err.message || 'An error occurred'; errorEl.style.display = 'block'; }
        }
    });
}

function updateAccountUI() {
    const btn = document.getElementById('globalAccountLink');
    const signInLink = document.getElementById('headerSignIn');
    const signInIcon = document.getElementById('headerSignInIcon');
    const signInText = document.getElementById('headerSignInText');
    const user = getCurrentUser();

    if (btn) {
        if (user) {
            btn.innerHTML = `<i class="bi bi-person-check-fill"></i>`;
            btn.title = `Signed in as ${user.name || user.email || 'User'}`;
        } else {
            btn.innerHTML = `<i class="bi bi-person-circle"></i>`;
            btn.title = 'My Account';
        }
    }

    // Update header sign-in link
    if (signInLink && signInIcon && signInText) {
        if (user) {
            signInIcon.className = 'bi bi-person-check-fill';
            signInText.textContent = user.name || user.email || 'Account';
            signInLink.onclick = function(e) {
                e.preventDefault();
                const role = (user.role || '').toLowerCase();
                if (['admin', 'superadmin'].includes(role)) window.location.href = 'admin.html';
                else if (['seller', 'florist', 'grower'].includes(role)) window.location.href = 'seller-dashboard.html';
                else window.location.href = 'buyer-dashboard.html';
            };
        } else {
            signInIcon.className = 'bi bi-person-circle';
            signInText.textContent = 'Sign In';
            signInLink.onclick = function(e) {
                e.preventDefault();
                openAuthModal('login');
            };
        }
    }

    // Update notification badge
    updateNotificationBadge();
    // Show/hide seller-only navigation links based on role
    const sellLink = document.getElementById('navSellLink');
    if (sellLink) {
        const role = (user?.role || '').toLowerCase();
        const isSeller = ['seller', 'florist', 'grower', 'admin', 'superadmin'].includes(role);
        sellLink.style.display = user && isSeller ? '' : 'none';
    }
    const adminLink = document.getElementById('navAdminLink');
    if (adminLink) {
        const role = (user?.role || '').toLowerCase();
        const isAdmin = ['admin', 'superadmin'].includes(role);
        adminLink.style.display = user && isAdmin ? '' : 'none';
    }
}

async function updateNotificationBadge() {
    const badge = document.getElementById('globalNotifBadge');
    if (!badge) return;
    const user = getCurrentUser();
    if (!user) {
        badge.style.display = 'none';
        return;
    }
    try {
        const token = getToken();
        const res = await fetch('/api/notifications/unread-count', {
            headers: { 'Authorization': 'Bearer ' + token, 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (res.ok) {
            const data = await res.json();
            const count = data.count || 0;
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch {}
}

function initAuth() {
    updateAccountUI();
    // Refresh notification badge every 30 seconds
    setInterval(updateNotificationBadge, 30000);

    // Wire password toggles when auth-modal component loads via innerHTML
    document.addEventListener('componentLoaded', (e) => {
        if (e.detail && e.detail.targetId === 'auth-modal-container') {
            setupPasswordToggle('login-password', 'toggle-login-password');
            setupPasswordToggle('register-password', 'toggle-register-password');
        }
        if (e.detail && e.detail.targetId === 'header-container') {
            updateAccountUI();
        }
    });

    handleAuthSubmit('loginForm',
        (d) => apiLogin(d.email, d.password),
        (form) => {
            const email = form.querySelector('#login-email').value.trim();
            const password = form.querySelector('#login-password').value.trim();
            const errorEl = form.querySelector('#loginApiError');
            if (!email || !password) {
                if (errorEl) { errorEl.textContent = 'Email and password are required'; errorEl.style.display = 'block'; }
                return null;
            }
            if (errorEl) errorEl.style.display = 'none';
            return { email, password, name: email.split('@')[0] };
        }
    );

    handleAuthSubmit('registerForm',
        (formData) => apiRegister(formData),
        (form) => {
            const name = form.querySelector('#register-name').value.trim();
            const email = form.querySelector('#register-email').value.trim();
            const password = form.querySelector('#register-password').value.trim();
            const role = form.querySelector('#register-role');
            const errorEl = form.querySelector('#registerApiError') || form.querySelector('.auth-form .error-message:last-of-type');
            function showErr(msg) {
                if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
            }
            if (!name || !email || !password) { showErr('All fields are required'); return null; }
            if (password.length < 8) { showErr('Password must be at least 8 characters'); return null; }
            if (role && !role.value) { showErr('Please select a role'); return null; }
            if (errorEl) errorEl.style.display = 'none';
            return new FormData(form);
        }
    );

    document.addEventListener('click', (e) => {
        const accountBtn = e.target.closest('#globalAccountLink');
        if (accountBtn) {
            e.preventDefault();
            if (isLoggedIn()) {
                const user = getCurrentUser();
                const role = (user?.role || '').toLowerCase();
                if (['admin', 'superadmin'].includes(role)) {
                    window.location.href = 'admin.html';
                } else if (['seller', 'florist', 'grower'].includes(role)) {
                    window.location.href = 'seller-dashboard.html';
                } else {
                    window.location.href = 'buyer-dashboard.html';
                }
            } else {
                openAuthModal('login');
            }
            return;
        }

        const modalClose = e.target.closest('.modal-close');
        if (modalClose) { closeAuthModal(); return; }

        const modal = document.getElementById('auth-modal');
        if (modal && e.target === modal) { closeAuthModal(); return; }

        const tabBtn = e.target.closest('.modal-tab-btn');
        if (tabBtn) {
            const tabName = tabBtn.getAttribute('data-tab');
            const authModal = document.getElementById('auth-modal');
            if (authModal) {
                authModal.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
                authModal.querySelectorAll('.modal-tab-content').forEach(tc => tc.classList.remove('active'));
                tabBtn.classList.add('active');
                const target = document.getElementById(`${tabName}-tab`);
                if (target) target.classList.add('active');
            }
            return;
        }

        const sellLink = e.target.closest('a[href="sell.html"]');
        if (sellLink && !isLoggedIn()) {
            e.preventDefault();
            sessionStorage.setItem('pending-sell', 'true');
            openAuthModal('register');
        }

        // Handle tab switching links
        const switchToRegister = e.target.closest('#switchToRegister');
        if (switchToRegister) {
            e.preventDefault();
            const loginTabBtn = document.getElementById('loginTabBtn');
            const registerTabBtn = document.getElementById('registerTabBtn');
            const loginTab = document.getElementById('login-tab');
            const registerTab = document.getElementById('register-tab');
            if (loginTabBtn && registerTabBtn && loginTab && registerTab) {
                loginTabBtn.classList.remove('active');
                registerTabBtn.classList.add('active');
                loginTab.classList.remove('active');
                registerTab.classList.add('active');
            }
            return;
        }

        const switchToLogin = e.target.closest('#switchToLogin');
        if (switchToLogin) {
            e.preventDefault();
            const loginTabBtn = document.getElementById('loginTabBtn');
            const registerTabBtn = document.getElementById('registerTabBtn');
            const loginTab = document.getElementById('login-tab');
            const registerTab = document.getElementById('register-tab');
            if (loginTabBtn && registerTabBtn && loginTab && registerTab) {
                registerTabBtn.classList.remove('active');
                loginTabBtn.classList.add('active');
                registerTab.classList.remove('active');
                loginTab.classList.add('active');
            }
            return;
        }

        // Handle footer auth links
        const footerSignIn = e.target.closest('#footerSignIn');
        if (footerSignIn) {
            e.preventDefault();
            openAuthModal('login');
            return;
        }

        const footerCreateAccount = e.target.closest('#footerCreateAccount');
        if (footerCreateAccount) {
            e.preventDefault();
            openAuthModal('register');
            return;
        }

        // Handle "Back to Sign In" from forgot password
        const backToSignIn = e.target.closest('#backToSignIn');
        if (backToSignIn) {
            e.preventDefault();
            openAuthModal('login');
            return;
        }
    });

    // Check if redirected from login.html/register.html — open modal after components load
    const pendingAuth = sessionStorage.getItem('pending-auth');
    if (pendingAuth) {
        sessionStorage.removeItem('pending-auth');
        setTimeout(() => {
            if (!isLoggedIn()) {
                openAuthModal(pendingAuth === 'register' ? 'register' : 'login');
            } else {
                afterAuth();
            }
        }, 500);
    }
}

function shouldInitAuth() {
    return true;
}

window.getToken = getToken;
function handleHeaderAccountClick() {
    const user = getCurrentUser();
    if (user) {
        const role = (user.role || '').toLowerCase();
        if (['admin', 'superadmin'].includes(role)) window.location.href = 'admin.html';
        else if (['seller', 'florist', 'grower'].includes(role)) window.location.href = 'seller-dashboard.html';
        else window.location.href = 'buyer-dashboard.html';
    } else {
        openAuthModal('login');
    }
}

window.handleHeaderAccountClick = handleHeaderAccountClick;
window.isLoggedIn = isLoggedIn;
window.getCurrentUser = getCurrentUser;
window.setLoggedIn = setLoggedIn;
window.logout = logout;
window.afterAuth = afterAuth;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.updateAccountUI = updateAccountUI;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { if (shouldInitAuth()) initAuth(); });
} else {
    if (shouldInitAuth()) initAuth();
}