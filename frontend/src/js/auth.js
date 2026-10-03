/**
 * AFTERWORD — CLIENT AUTHENTICATION & GATEKEEPING SUBSYSTEM
 * Uses Supabase Auth through the backend API for real user accounts.
 * Stores session in localStorage for UI state, but auth is real.
 */

// ---------------------------------------------------------------------------
// 1. Session Storage Keys
// ---------------------------------------------------------------------------

const AUTH_STORAGE_KEY = 'afterword_user';
const AUTH_SESSION_KEY = 'afterword_session';

// ---------------------------------------------------------------------------
// 2. Core Session Helpers
// ---------------------------------------------------------------------------

/**
 * Retrieves the currently active user session from localStorage.
 * @returns {Object|null} The parsed user object, or null if not authenticated.
 */
function getLoggedInUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (user && !user.id && user.supabaseId) {
      user.id = user.supabaseId;
    }
    return user;
  } catch (err) {
    console.error('Failed to parse user session:', err);
    return null;
  }
}

/**
 * Gets the Supabase user ID (UUID) if available.
 * @returns {string|null}
 */
function getSupabaseUserId() {
  const user = getLoggedInUser();
  if (!user) return null;
  const uid = user.id || user.supabaseId;
  if (uid && typeof uid === 'string' && uid.length === 36) {
    return uid;
  }
  return null;
}

/**
 * Determines if the current window location is the login / authentication page.
 * @returns {boolean} True if viewing login.html.
 */
function isAuthPage() {
  const path = window.location.pathname.toLowerCase();
  return path.endsWith('login.html') || path.endsWith('/login');
}

/**
 * Calculates the relative path to login.html depending on current directory nesting.
 * @returns {string} Relative path to login.html.
 */
function getLoginUrl() {
  const path = window.location.pathname;
  if (path.includes('/src/pages/')) {
    return '../../login.html';
  }
  return 'login.html';
}

/**
 * Calculates the relative path to index.html depending on current directory nesting.
 * @returns {string} Relative path to index.html.
 */
function getHomeUrl() {
  const path = window.location.pathname;
  if (path.includes('/src/pages/')) {
    return '../../index.html';
  }
  return 'index.html';
}

// ---------------------------------------------------------------------------
// 3. Site-Wide Gatekeeping Guard
// ---------------------------------------------------------------------------

/**
 * Guards protected pages. If no active user session exists, redirects to login.html.
 */
function checkAuthGuard() {
  const currentUser = getLoggedInUser();
  const onLoginPage = isAuthPage();

  if (!currentUser && !onLoginPage) {
    const currentHref = window.location.href;
    const loginTarget = getLoginUrl();
    const returnParam = encodeURIComponent(currentHref);
    window.location.replace(`${loginTarget}?redirect=${returnParam}`);
  }
}

// Execute guard immediately upon script load
checkAuthGuard();

// ---------------------------------------------------------------------------
// 4. Authentication Actions (Login, Signup, Logout)
// ---------------------------------------------------------------------------

/**
 * Performs patron login via Supabase Auth through the backend API.
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{success: boolean, message?: string, user?: Object}>}
 */
async function login(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, message: 'Please enter both email and password.' };
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPass })
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, message: data.error || 'Login failed. Please check your credentials.' };
    }

    // Build local session object from Supabase response
    const profile = data.profile || {};
    const userId = data.user?.id || profile.id || null;
    const userObj = {
      id: userId,
      supabaseId: userId,
      name: profile.full_name || data.user?.user_metadata?.full_name || cleanEmail.split('@')[0],
      email: data.user?.email || cleanEmail,
      patronCode: profile.patron_code || `#MEM-${Math.floor(100 + Math.random() * 900)}`,
      role: profile.role || 'customer',
      tier: profile.role === 'admin' ? 'Staff Admin' : 'Community Patron'
    };

    saveSession(userObj);
    if (data.session) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(data.session));
    }

    return { success: true, user: userObj };
  } catch (err) {
    console.error('Login error:', err);
    return { success: false, message: 'Could not connect to server. Please try again.' };
  }
}

/**
 * Registers a new patron member account via Supabase Auth.
 * @param {Object} patronData - { name, email, password }
 * @returns {Promise<{success: boolean, message?: string, user?: Object}>}
 */
async function signup(patronData) {
  const name = (patronData.name || '').trim();
  const email = (patronData.email || '').trim().toLowerCase();
  const password = (patronData.password || '').trim();

  if (!name || !email || !password) {
    return { success: false, message: 'Please fill in all required fields.' };
  }

  if (password.length < 6) {
    return { success: false, message: 'Password should be at least 6 characters.' };
  }

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName: name })
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, message: data.error || 'Registration failed.' };
    }

    const profile = data.profile || {};
    const userId = data.user?.id || profile.id || null;
    const userObj = {
      id: userId,
      supabaseId: userId,
      name: profile.full_name || name,
      email: data.user?.email || email,
      patronCode: profile.patron_code || `#MEM-${Math.floor(100 + Math.random() * 900)}`,
      role: profile.role || 'customer',
      tier: 'New Community Patron',
      joinedAt: new Date().toISOString()
    };

    saveSession(userObj);
    if (data.session) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(data.session));
    }

    return { success: true, user: userObj };
  } catch (err) {
    console.error('Signup error:', err);
    return { success: false, message: 'Could not connect to server. Please try again.' };
  }
}

/**
 * Saves user object to localStorage session.
 * @param {Object} user 
 */
function saveSession(user) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

/**
 * Logs out the active user, clears session, and redirects to login.html.
 */
function logout() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_SESSION_KEY);
  const target = getLoginUrl();
  window.location.href = target;
}

// ---------------------------------------------------------------------------
// 5. Header Patron Badge & Logout Button Integration
// ---------------------------------------------------------------------------

function getProfileUrl() {
  const path = window.location.pathname;
  if (path.includes('/src/pages/')) {
    return 'profile.html';
  }
  return 'src/pages/profile.html';
}

function getAdminUrl() {
  const path = window.location.pathname;
  if (path.includes('/src/pages/')) {
    return 'admin.html';
  }
  return 'src/pages/admin.html';
}

/**
 * Injects logged-in patron information and an accessible Sign Out action into the site header.
 * Also injects an 'Admin' navbar tab for admin/staff users.
 */
function initHeaderAuth() {
  const user = getLoggedInUser();
  if (!user || isAuthPage()) return;

  const headerRight = document.querySelector('.site-header .header-right');
  if (!headerRight) return;

  // Check if patron badge already rendered
  if (headerRight.querySelector('.header-patron-badge')) return;

  // Create patron badge element
  const patronBadge = document.createElement('div');
  patronBadge.className = 'header-patron-badge';
  patronBadge.title = `${user.name} (${user.patronCode || user.role})`;

  const firstName = (user.name || 'Patron').split(' ')[0];
  const initial = (user.name || 'P').charAt(0).toUpperCase();
  const profileUrl = getProfileUrl();

  patronBadge.innerHTML = `
    <a href="${profileUrl}" class="patron-badge-chip" title="View Patron Profile" style="text-decoration: none; cursor: pointer;">
      <span class="patron-avatar-initial">${initial}</span>
      <span class="patron-badge-name">${firstName}</span>
      <span class="patron-code-tag">${user.patronCode || '#MEM'}</span>
    </a>
    <button class="nav-logout-btn" id="header-logout-btn" aria-label="Sign Out" title="Sign Out (${user.name})">
      <span class="material-symbols-outlined icon-18">logout</span>
    </button>
  `;

  // Replace generic avatar with patron badge
  const existingAvatar = headerRight.querySelector('.nav-user-avatar');
  if (existingAvatar) {
    existingAvatar.replaceWith(patronBadge);
  } else {
    headerRight.appendChild(patronBadge);
  }

  // Attach logout listener
  const logoutBtn = patronBadge.querySelector('#header-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof showToast === 'function') {
        showToast('Signed out. Have a wonderful day!', 'waving_hand');
        setTimeout(logout, 800);
      } else {
        logout();
      }
    });
  }

  // Ensure notification bell is injected next to patron badge
  if (typeof injectNotificationBell === 'function') {
    injectNotificationBell();
  }
}

// Initialize header badge when DOM is ready
document.addEventListener('DOMContentLoaded', initHeaderAuth);
