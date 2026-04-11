// ── Auth Modal ────────────────────────────────────────────────────────────────
// Injects and manages the login / create-account modal.
// API calls are placeholders — replace with real endpoints when backend is ready.

// ── Placeholder API calls ─────────────────────────────────────────────────────

async function apiLogin(email, _password) {
    // TODO: replace with real login endpoint
    // return await fetch('/api/auth/login', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email, password })
    // }).then(r => r.json());
    return new Promise(resolve =>
        setTimeout(() => resolve({ success: true, user: { email } }), 400)
    );
}

async function apiCreateAccount(username, email, _password) {
    // TODO: replace with real register endpoint
    // return await fetch('/api/auth/register', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ username, email, password })
    // }).then(r => r.json());
    return new Promise(resolve =>
        setTimeout(() => resolve({ success: true, user: { username, email } }), 400)
    );
}

async function apiLogout() {
    // TODO: replace with real logout endpoint
    // return await fetch('/api/auth/logout', { method: 'POST' });
    return new Promise(resolve => setTimeout(resolve, 200));
}

// ── Modal HTML ────────────────────────────────────────────────────────────────

function injectModal() {
    const modal = document.createElement('div');
    modal.id = 'auth-modal-overlay';
    modal.className = 'auth-modal-overlay';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
        <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
            <button class="auth-modal-close" id="auth-modal-close" aria-label="Close">&times;</button>

            <div class="auth-tabs" role="tablist">
                <button class="auth-tab active" id="tab-login" role="tab" aria-selected="true" aria-controls="panel-login">Login</button>
                <button class="auth-tab" id="tab-signup" role="tab" aria-selected="false" aria-controls="panel-signup">Create Account</button>
            </div>

            <!-- Login panel -->
            <div class="auth-panel" id="panel-login" role="tabpanel" aria-labelledby="tab-login">
                <form id="form-login" novalidate>
                    <div class="auth-field">
                        <label for="login-email">Email</label>
                        <input type="email" id="login-email" placeholder="you@example.com" autocomplete="email" required>
                    </div>
                    <div class="auth-field">
                        <label for="login-password">Password</label>
                        <input type="password" id="login-password" placeholder="Password" autocomplete="current-password" required>
                    </div>
                    <div class="auth-error" id="login-error"></div>
                    <button type="submit" class="auth-submit" id="login-submit">Login</button>
                </form>
            </div>

            <!-- Create account panel -->
            <div class="auth-panel hidden" id="panel-signup" role="tabpanel" aria-labelledby="tab-signup">
                <form id="form-signup" novalidate>
                    <div class="auth-field">
                        <label for="signup-username">Username</label>
                        <input type="text" id="signup-username" placeholder="Username" autocomplete="username" required>
                    </div>
                    <div class="auth-field">
                        <label for="signup-email">Email</label>
                        <input type="email" id="signup-email" placeholder="you@example.com" autocomplete="email" required>
                    </div>
                    <div class="auth-field">
                        <label for="signup-password">Password</label>
                        <input type="password" id="signup-password" placeholder="Password" autocomplete="new-password" required>
                    </div>
                    <div class="auth-field">
                        <label for="signup-confirm">Confirm Password</label>
                        <input type="password" id="signup-confirm" placeholder="Confirm Password" autocomplete="new-password" required>
                    </div>
                    <div class="auth-error" id="signup-error"></div>
                    <button type="submit" class="auth-submit" id="signup-submit">Create Account</button>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ── State ─────────────────────────────────────────────────────────────────────

function getLoginBtn() { return document.getElementById('login-btn'); }

function setLoggedIn(identifier) {
    sessionStorage.setItem('auth_user', identifier);
    const btn = getLoginBtn();
    if (btn) {
        btn.textContent = identifier;
        btn.classList.add('logged-in');
    }
}

function setLoggedOut() {
    sessionStorage.removeItem('auth_user');
    const btn = getLoginBtn();
    if (btn) {
        btn.textContent = 'Login';
        btn.classList.remove('logged-in');
    }
}

function restoreSession() {
    const user = sessionStorage.getItem('auth_user');
    if (user) setLoggedIn(user);
}

// ── Modal open / close ────────────────────────────────────────────────────────

function openModal() {
    const overlay = document.getElementById('auth-modal-overlay');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.getElementById('login-email').focus();
}

function closeModal() {
    // Move focus out of the modal before marking it aria-hidden, otherwise
    // browsers flag a violation when a focused descendant becomes hidden from
    // assistive technology.
    const loginBtn = getLoginBtn();
    if (loginBtn) loginBtn.focus();

    const overlay = document.getElementById('auth-modal-overlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    clearErrors();
}

function clearErrors() {
    document.getElementById('login-error').textContent = '';
    document.getElementById('signup-error').textContent = '';
}

// ── Tab switching ─────────────────────────────────────────────────────────────

function switchTab(active) {
    const tabs = { login: 'tab-login', signup: 'tab-signup' };
    const panels = { login: 'panel-login', signup: 'panel-signup' };
    clearErrors();

    Object.entries(tabs).forEach(([key, id]) => {
        const isActive = key === active;
        document.getElementById(id).classList.toggle('active', isActive);
        document.getElementById(id).setAttribute('aria-selected', isActive);
        document.getElementById(panels[key]).classList.toggle('hidden', !isActive);
    });
}

// ── Form submission ───────────────────────────────────────────────────────────

function setSubmitting(btnId, loading) {
    const btn = document.getElementById(btnId);
    btn.disabled = loading;
    btn.textContent = loading ? 'Please wait…' : btn.dataset.label;
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!email || !password) {
        errorEl.textContent = 'Please fill in all fields.';
        return;
    }

    setSubmitting('login-submit', true);
    try {
        const result = await apiLogin(email, password);
        if (result.success) {
            setLoggedIn(result.user.email);
            closeModal();
        } else {
            errorEl.textContent = result.message || 'Login failed. Please try again.';
        }
    } catch {
        errorEl.textContent = 'An error occurred. Please try again.';
    } finally {
        setSubmitting('login-submit', false);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const errorEl = document.getElementById('signup-error');

    if (!username || !email || !password || !confirm) {
        errorEl.textContent = 'Please fill in all fields.';
        return;
    }
    if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match.';
        return;
    }

    setSubmitting('signup-submit', true);
    try {
        const result = await apiCreateAccount(username, email, password);
        if (result.success) {
            setLoggedIn(result.user.username);
            closeModal();
        } else {
            errorEl.textContent = result.message || 'Registration failed. Please try again.';
        }
    } catch {
        errorEl.textContent = 'An error occurred. Please try again.';
    } finally {
        setSubmitting('signup-submit', false);
    }
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    injectModal();

    // Store button labels for restore after loading state
    document.getElementById('login-submit').dataset.label = 'Login';
    document.getElementById('signup-submit').dataset.label = 'Create Account';

    // Login button in nav opens modal (or logs out if already logged in)
    const loginBtn = getLoginBtn();
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (sessionStorage.getItem('auth_user')) {
                apiLogout().then(() => setLoggedOut());
            } else {
                openModal();
            }
        });
    }

    // Close button
    document.getElementById('auth-modal-close').addEventListener('click', closeModal);

    // Click outside modal to close
    document.getElementById('auth-modal-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Tab switching
    document.getElementById('tab-login').addEventListener('click', () => switchTab('login'));
    document.getElementById('tab-signup').addEventListener('click', () => switchTab('signup'));

    // Form submissions
    document.getElementById('form-login').addEventListener('submit', handleLogin);
    document.getElementById('form-signup').addEventListener('submit', handleSignup);

    // Restore session on page load
    restoreSession();
});
