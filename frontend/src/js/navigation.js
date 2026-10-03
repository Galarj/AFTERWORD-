/**
 * AFTERWORD — NAVIGATION & ROUTING
 * Manages active navigation states, mobile menu drawer, and global catalog search routing.
 */

/**
 * Initializes all navigation behaviors:
 * - Highlights current page route in navigation bars
 * - Configures mobile hamburger drawer toggle
 * - Hooks global header search routing
 */
function initNavigation() {
  initCleanHeaderNav();
  highlightActiveNavLink();
  setupMobileDrawer();
  setupHeaderSearch();
}

/**
 * Dynamically builds clean category dropdowns (Explore ▾, Community ▾, More ▾)
 * and attaches hover/click toggle handlers.
 */
function initCleanHeaderNav() {
  const navContainer = document.querySelector('.nav-links');
  if (!navContainer) return;

  const path = window.location.pathname.toLowerCase();
  const inSubDir = path.includes('/src/pages/');
  const homeUrl = inSubDir ? '../../index.html' : 'index.html';
  const getUrl = (page) => inSubDir ? page : `src/pages/${page}`;

  let user = null;
  try {
    if (typeof getLoggedInUser === 'function') {
      user = getLoggedInUser();
    } else {
      const raw = localStorage.getItem('afterword_user');
      if (raw) user = JSON.parse(raw);
    }
  } catch (e) {}

  const categories = [
    {
      id: 'explore',
      label: 'Explore',
      items: [
        { title: 'Café & Lounge', icon: 'local_cafe', url: getUrl('cafe.html') },
        { title: 'Library Sanctuary', icon: 'menu_book', url: getUrl('library.html') },
        { title: 'Botanical Flowers', icon: 'local_florist', url: getUrl('flowers.html') }
      ]
    },
    {
      id: 'community',
      label: 'Community',
      items: [
        { title: 'Events & Workshops', icon: 'event', url: getUrl('events.html') },
        { title: 'Table Reservations', icon: 'table_restaurant', url: getUrl('cafe.html#reservation') },
        { title: 'My RSVPs & Bookings', icon: 'confirmation_number', url: user ? getUrl('profile.html#events') : getUrl('events.html') }
      ]
    },
    {
      id: 'more',
      label: 'More',
      items: [
        { title: 'Donate / Propose a Book', icon: 'volunteer_activism', url: getUrl('library.html#proposals') },
        { title: 'Reading Nook Guidelines', icon: 'auto_stories', url: getUrl('library.html#rules') },
        { title: 'About & Contact', icon: 'info', url: `${homeUrl}#about` }
      ]
    }
  ];

  if (user && (user.role === 'admin' || user.role === 'staff')) {
    const moreCat = categories.find(c => c.id === 'more');
    if (moreCat) {
      moreCat.items.push({
        title: 'Staff Operations Console',
        icon: 'admin_panel_settings',
        url: getUrl('admin.html')
      });
    }
  }

  // Render clean dropdowns HTML inside navContainer
  navContainer.innerHTML = categories.map(cat => {
    const isCatActive = cat.items.some(item => {
      const page = item.url.split('/').pop().split('#')[0];
      return page && path.includes(page);
    });

    const activeClass = isCatActive ? 'active' : '';

    const itemsHtml = cat.items.map(item => `
      <a href="${item.url}" class="dropdown-item">
        <span class="material-symbols-outlined icon-18">${item.icon}</span>
        <span>${item.title}</span>
      </a>
    `).join('');

    return `
      <div class="nav-item-dropdown" data-nav-id="${cat.id}">
        <button type="button" class="nav-dropdown-toggle ${activeClass}" aria-expanded="false">
          <span>${cat.label}</span>
          <span class="chevron">▾</span>
        </button>
        <div class="nav-dropdown-menu" role="menu">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join('');

  // Attach click toggle & outside-click handlers
  setupDropdownInteractivity();

  // Populate mobile navigation drawer
  setupMobileDrawerContent(categories, user, homeUrl, getUrl);
}

/**
 * Handles click-to-toggle, hover, outside click, and ESC key handlers for dropdowns.
 */
function setupDropdownInteractivity() {
  const dropdowns = document.querySelectorAll('.nav-item-dropdown');

  dropdowns.forEach(dropdown => {
    const btn = dropdown.querySelector('.nav-dropdown-toggle');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('open');

      // Close other open dropdowns
      dropdowns.forEach(d => {
        if (d !== dropdown) {
          d.classList.remove('open');
          const toggle = d.querySelector('.nav-dropdown-toggle');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
        }
      });

      dropdown.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-item-dropdown')) {
      document.querySelectorAll('.nav-item-dropdown.open').forEach(d => {
        d.classList.remove('open');
        const toggle = d.querySelector('.nav-dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.nav-item-dropdown.open').forEach(d => {
        d.classList.remove('open');
        const toggle = d.querySelector('.nav-dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    }
  });
}

/**
 * Populates mobile navigation drawer with clean category sections.
 */
function setupMobileDrawerContent(categories, user, homeUrl, getUrl) {
  const mobileDrawer = document.querySelector('.mobile-nav-drawer');
  if (!mobileDrawer) return;

  const path = window.location.pathname.toLowerCase();
  const isHomeActive = path.endsWith('index.html') || path.endsWith('/');

  let drawerHtml = `<a href="${homeUrl}" class="nav-link ${isHomeActive ? 'active' : ''}">Home</a>`;

  categories.forEach(cat => {
    drawerHtml += `<div style="margin-top: 10px; padding: 4px 10px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--tertiary); letter-spacing: 0.06em;">${cat.label}</div>`;
    cat.items.forEach(item => {
      const isItemActive = path.includes(item.url.split('/').pop().split('#')[0]);
      drawerHtml += `<a href="${item.url}" class="nav-link ${isItemActive ? 'active' : ''}" style="padding-left: 1rem; font-size: 0.9rem;">${item.title}</a>`;
    });
  });

  if (user) {
    drawerHtml += `<div style="margin-top: 10px; padding: 4px 10px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--tertiary); letter-spacing: 0.06em;">Account</div>`;
    drawerHtml += `<a href="${getUrl('profile.html')}" class="nav-link" style="padding-left: 1rem; font-size: 0.9rem;">My Profile (${user.name})</a>`;
    if (user.role === 'admin' || user.role === 'staff') {
      drawerHtml += `<a href="${getUrl('admin.html')}" class="nav-link" style="padding-left: 1rem; font-size: 0.9rem;">Staff Admin Console</a>`;
    }
  }

  mobileDrawer.innerHTML = drawerHtml;
}

/**
 * Inspects `window.location.pathname` and compares it against all `.nav-link` anchors.
 * Automatically adds the `.active` class to matching links (and removes it from non-matching links).
 * Supports root index, nested page URLs, and relative paths.
 */
function highlightActiveNavLink() {
  const currentPath = window.location.pathname.toLowerCase();
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    const pageName = href.split('/').pop().replace('.html', '');
    const isHome = currentPath.endsWith('/') || currentPath.endsWith('index.html') || currentPath === '';

    if (isHome && (pageName === 'index' || href === 'index.html' || href === '../../index.html')) {
      link.classList.add('active');
    } else if (!isHome && pageName && currentPath.includes(pageName)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Configures the mobile menu button (`.mobile-menu-btn`) and drawer (`.mobile-nav-drawer`).
 * Toggles the `.open` state, synchronizes `aria-expanded` attributes for screen readers,
 * and toggles the icon between 'menu' and 'close'.
 */
function setupMobileDrawer() {
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const mobileDrawer = document.querySelector('.mobile-nav-drawer');

  if (!mobileBtn || !mobileDrawer) return;

  mobileBtn.addEventListener('click', () => {
    const isOpen = mobileDrawer.classList.toggle('open');
    mobileBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    
    const icon = mobileBtn.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.textContent = isOpen ? 'close' : 'menu';
    }
  });
}

/**
 * Configures global header catalog search input (`.header-search input`).
 * Listens for the Enter keypress:
 * - If on the Library page: directly triggers live filtering by updating `#library-search`.
 * - If on any other page: redirects to the Library page with `?q={query}` encoded parameter.
 */
function setupHeaderSearch() {
  const searchInput = document.querySelector('.header-search input');
  if (!searchInput) return;

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim()) {
      const query = encodeURIComponent(searchInput.value.trim());
      const currentPath = window.location.pathname.toLowerCase();
      const isLibraryPage = currentPath.includes('library.html');

      if (isLibraryPage) {
        const libraryFilterInput = document.getElementById('library-search');
        if (libraryFilterInput) {
          libraryFilterInput.value = searchInput.value.trim();
          libraryFilterInput.dispatchEvent(new Event('input'));
        }
      } else {
        const target = currentPath.includes('/src/pages/') ? 'library.html' : 'src/pages/library.html';
        window.location.href = `${target}?q=${query}`;
      }
    }
  });
}

// Auto-initialize navigation when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigation);
} else {
  initNavigation();
}
