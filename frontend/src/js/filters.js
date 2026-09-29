/**
 * AFTERWORD — FILTER & LIVE SEARCH SUBSYSTEM
 * Handles departmental category tabs, library catalog live search, and community events filtering.
 */

/**
 * Initializes all filtering subsystems across the application.
 * Called during bootstrap on DOMContentLoaded.
 * - Sets up category tab bar interactions
 * - Hooks library catalog search listeners (if on library page)
 * - Hooks event calendar search listeners (if on events page)
 */
function initFilters() {
  setupCategoryTabs();
  setupLibraryFilters();
  setupEventFilters();
}

/**
 * Attaches click event handlers to all tab bars (`.tab-bar .tab-btn`).
 * When a tab is selected:
 * 1. Toggles `.active` class state among sibling buttons.
 * 2. Reads the selected category from `data-category`.
 * 3. Dispatches filtering to specialized handlers (Library / Events) or the generic filterElements.
 * 4. Ensures the tab bar and its buttons NEVER disappear or get hidden.
 */
function setupCategoryTabs() {
  const tabBars = document.querySelectorAll('.tab-bar');

  tabBars.forEach(tabBar => {
    const isLibraryTabs = tabBar.id === 'library-tabs';
    const isEventsTabs = tabBar.id === 'events-tabs';
    const tabBtns = tabBar.querySelectorAll('.tab-btn');
    const targetFilterAttr = tabBar.getAttribute('data-filter-target') || 'data-category';

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const category = btn.getAttribute('data-category');

        if (isLibraryTabs) {
          applyLibraryFilters();
        } else if (isEventsTabs) {
          applyEventFilters();
        } else {
          filterElements(targetFilterAttr, category);
        }
      });
    });
  });
}

/**
 * Utility function to toggle element visibility based on an attribute match.
 * Excludes navigation elements, tab bars, and tab buttons from being filtered or hidden.
 * 
 * @param {string} attrName - The HTML attribute to evaluate (e.g. 'data-category').
 * @param {string|null} category - The category to match, or 'all' / null to display all elements.
 */
function filterElements(attrName, category) {
  // Select cards and catalog items that possess the target attribute
  const items = document.querySelectorAll(`article[${attrName}], .card[${attrName}], .menu-item-card[${attrName}], .flower-item-card[${attrName}]`);
  
  // Fallback to generic attribute query if specific container classes are absent
  const targetItems = items.length > 0 ? items : document.querySelectorAll(`[${attrName}]`);

  targetItems.forEach(item => {
    // CRITICAL: Under no circumstances should tab buttons, tab bars, nav links, or headers be hidden!
    if (
      item.classList.contains('tab-btn') || 
      item.classList.contains('tab-bar') || 
      item.classList.contains('nav-link') ||
      item.closest('.tab-bar') || 
      item.closest('.site-header') || 
      item.closest('.mobile-nav-drawer')
    ) {
      return;
    }

    const itemCat = item.getAttribute(attrName);
    if (!category || category === 'all' || itemCat.toLowerCase() === category.toLowerCase()) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

/**
 * Configures live search and category filtering for the Library catalog page (`library.html`).
 * - Detects incoming URL search queries (e.g. `?q=architecture`) and applies them automatically.
 * - Binds input listeners on the search bar for instant live filtering.
 */
function setupLibraryFilters() {
  const libSearchInput = document.getElementById('library-search');
  if (!libSearchInput) return;

  // Prefill search term from URL query parameter if present
  const urlParams = new URLSearchParams(window.location.search);
  const q = urlParams.get('q');
  if (q) {
    libSearchInput.value = q;
    applyLibraryFilters();
  }

  libSearchInput.addEventListener('input', applyLibraryFilters);
}

/**
 * Evaluates currently displayed book items against the active search term and active category tab.
 * 1. Checks if volume title or author contains the search substring (case-insensitive).
 * 2. Checks if volume matches the selected category (or 'all').
 * 3. Shows/hides `.book-item-card` elements accordingly.
 * 4. Updates `#library-results-count` to display the number of visible books.
 */
function applyLibraryFilters() {
  const searchInput = document.getElementById('library-search');
  const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const activeTab = document.querySelector('#library-tabs .tab-btn.active');
  const activeCat = activeTab ? activeTab.getAttribute('data-category') : 'all';

  const bookCards = document.querySelectorAll('.book-item-card');
  let matchCount = 0;

  bookCards.forEach(card => {
    const title = (card.getAttribute('data-title') || '').toLowerCase();
    const author = (card.getAttribute('data-author') || '').toLowerCase();
    const category = (card.getAttribute('data-category') || '').toLowerCase();

    const matchesSearch = !term || title.includes(term) || author.includes(term);
    const matchesCat = !activeCat || activeCat === 'all' || category === activeCat.toLowerCase();

    if (matchesSearch && matchesCat) {
      card.style.display = '';
      matchCount++;
    } else {
      card.style.display = 'none';
    }
  });

  const countBadge = document.getElementById('library-results-count');
  if (countBadge) {
    countBadge.textContent = `Showing ${matchCount} Books`;
  }
}

/**
 * Configures live search and category filtering for the Events calendar page (`events.html`).
 * - Binds input listeners on `#events-search` for instant filtering.
 */
function setupEventFilters() {
  const eventSearchInput = document.getElementById('events-search');
  if (!eventSearchInput) return;

  eventSearchInput.addEventListener('input', applyEventFilters);
}

/**
 * Evaluates currently displayed event cards against the active search term and active event category.
 * 1. Checks if event title contains the search substring (case-insensitive).
 * 2. Checks if event matches the selected category (or 'all').
 * 3. Shows/hides `.event-card-item` elements accordingly.
 * 4. Updates `#events-results-count` with the total count of visible events.
 */
function applyEventFilters() {
  const searchInput = document.getElementById('events-search');
  const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const activeTab = document.querySelector('#events-tabs .tab-btn.active');
  const activeCat = activeTab ? activeTab.getAttribute('data-category') : 'all';

  const eventCards = document.querySelectorAll('.event-card-item');
  let count = 0;

  eventCards.forEach(card => {
    const title = (card.getAttribute('data-title') || '').toLowerCase();
    const category = (card.getAttribute('data-category') || '').toLowerCase();

    const matchesSearch = !term || title.includes(term);
    const matchesCat = !activeCat || activeCat === 'all' || category === activeCat.toLowerCase();

    if (matchesSearch && matchesCat) {
      card.style.display = '';
      count++;
    } else {
      card.style.display = 'none';
    }
  });

  const counterEl = document.getElementById('events-results-count');
  if (counterEl) {
    counterEl.textContent = `Showing ${count} Events`;
  }
}
