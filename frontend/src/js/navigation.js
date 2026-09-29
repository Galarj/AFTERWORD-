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
  highlightActiveNavLink();
  setupMobileDrawer();
  setupHeaderSearch();
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
