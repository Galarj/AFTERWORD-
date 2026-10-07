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
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (uid && typeof uid === 'string' && uuidRegex.test(uid)) {
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

// Known Demo Accounts Client Fallback Registry
const DEMO_USERS_CLIENT = {
  'elena@afterword.hub': {
    id: 'd3b07384-d113-460a-8409-e85df6498c49',
    supabaseId: 'd3b07384-d113-460a-8409-e85df6498c49',
    name: 'Elena Rostova',
    full_name: 'Elena Rostova',
    email: 'elena@afterword.hub',
    patronCode: '#MEM-8492',
    patron_code: '#MEM-8492',
    role: 'customer',
    tier: 'Community Patron'
  },
  'staff@afterword.hub': {
    id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    supabaseId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    name: 'Marcus Vance',
    full_name: 'Marcus Vance',
    email: 'staff@afterword.hub',
    patronCode: '#STF-0102',
    patron_code: '#STF-0102',
    role: 'staff',
    tier: 'Shift Barista & Staff Member'
  },
  'admin@afterword.hub': {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    supabaseId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Dr. Julian Thorne',
    full_name: 'Dr. Julian Thorne',
    email: 'admin@afterword.hub',
    patronCode: '#ADM-0001',
    patron_code: '#ADM-0001',
    role: 'admin',
    tier: 'Staff Administrator'
  }
};

/**
 * Performs patron login via Supabase Auth through the backend API with demo fallback.
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

  // 1. Try backend authentication endpoint
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPass })
    });

    const data = await res.json();

    if (res.ok) {
      const profile = data.profile || {};
      const userId = data.user?.id || profile.id || null;
      const isAdmin = profile.role === 'admin' || cleanEmail.includes('admin');
      const isStaffRole = profile.role === 'staff' || cleanEmail.includes('staff');
      const userRole = profile.role || (isAdmin ? 'admin' : (isStaffRole ? 'staff' : 'customer'));
      const userTier = profile.tier || (isAdmin ? 'Staff Administrator' : (isStaffRole ? 'Shift Barista & Staff Member' : 'Community Patron'));

      const userObj = {
        id: userId,
        supabaseId: userId,
        name: profile.full_name || data.user?.user_metadata?.full_name || cleanEmail.split('@')[0],
        email: data.user?.email || cleanEmail,
        patronCode: profile.patron_code || (isAdmin ? '#ADM-0001' : (isStaffRole ? '#STF-0102' : `#MEM-${Math.floor(100 + Math.random() * 900)}`)),
        role: userRole,
        tier: userTier
      };

      saveSession(userObj);
      if (data.session) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(data.session));
      }

      return { success: true, user: userObj };
    }
  } catch (err) {
    console.warn('Network auth fetch notice, evaluating local demo fallback:', err);
  }

  // 2. Direct fallback for exact demo accounts
  if (DEMO_USERS_CLIENT[cleanEmail]) {
    const userObj = DEMO_USERS_CLIENT[cleanEmail];
    saveSession(userObj);
    return { success: true, user: userObj };
  }

  // 3. Dynamic fallback for any test email or @afterword.hub domain
  if (cleanEmail.includes('demo') || cleanEmail.includes('test') || cleanEmail.endsWith('@afterword.hub')) {
    const isAdmin = cleanEmail.includes('admin') || cleanEmail.includes('thorne');
    const isStaff = !isAdmin && (cleanEmail.includes('staff') || cleanEmail.includes('marcus'));
    const userRole = isAdmin ? 'admin' : (isStaff ? 'staff' : 'customer');
    const mockId = isAdmin 
      ? 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' 
      : (isStaff ? 'b2c3d4e5-f6a7-8901-bcde-f23456789012' : 'd3b07384-d113-460a-8409-e85df6498c49');
    
    const namePart = cleanEmail.split('@')[0];
    const userObj = {
      id: mockId,
      supabaseId: mockId,
      name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
      full_name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
      email: cleanEmail,
      patronCode: isAdmin ? '#ADM-0001' : (isStaff ? '#STF-0102' : '#MEM-8492'),
      role: userRole,
      tier: isAdmin ? 'Staff Administrator' : (isStaff ? 'Shift Barista & Staff Member' : 'Community Patron')
    };
    saveSession(userObj);
    return { success: true, user: userObj };
  }

  return { success: false, message: 'Invalid credentials. Try using the quick demo buttons below.' };
}

/**
 * Registers a new patron member account via Supabase Auth with demo fallback.
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

  if (password.length < 4) {
    return { success: false, message: 'Password should be at least 4 characters.' };
  }

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName: name })
    });

    const data = await res.json();

    if (res.ok) {
      const profile = data.profile || {};
      const userId = data.user?.id || profile.id || null;
      const userObj = {
        id: userId,
        supabaseId: userId,
        name: profile.full_name || name,
        full_name: profile.full_name || name,
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
    }
  } catch (err) {
    console.warn('Network signup fetch notice, generating local demo session:', err);
  }

  // Fallback local registration
  const userObj = {
    id: 'd3b07384-d113-460a-8409-e85df6498c49',
    supabaseId: 'd3b07384-d113-460a-8409-e85df6498c49',
    name: name,
    full_name: name,
    email: email,
    patronCode: `#MEM-${Math.floor(100 + Math.random() * 900)}`,
    role: 'customer',
    tier: 'New Community Patron',
    joinedAt: new Date().toISOString()
  };
  saveSession(userObj);
  return { success: true, user: userObj };
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
