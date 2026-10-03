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
  initMegaMenus();
  highlightActiveNavLink();
  setupMobileDrawer();
  setupHeaderSearch();
}

/**
  * Dynamically populates the navigation bar with categorized hover mega menus.
  * Organizes links into detailed sub-categories with rich icons and promo cards.
  */
function initMegaMenus() {
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

  const menuConfig = [
    {
      id: 'home',
      label: 'Home',
      url: homeUrl,
      isSimple: true
    },
    {
      id: 'cafe',
      label: 'Café',
      url: getUrl('cafe.html'),
      columns: [
        {
          heading: 'Coffee & Beverages',
          items: [
            { title: 'Artisan Espresso & Lattes', desc: 'Handcrafted espresso & cortados', icon: '☕', url: getUrl('cafe.html#menu') },
            { title: 'Pour-Over & Cold Brew', desc: 'Single-origin filter & 18hr drip', icon: '🧪', url: getUrl('cafe.html#menu') },
            { title: 'Loose-Leaf Teas & Matcha', desc: 'Japanese matcha & herbal blends', icon: '🍃', url: getUrl('cafe.html#menu') },
            { title: 'Signature Drinks', desc: 'Cardamom rose & spiced honey', icon: '✨', url: getUrl('cafe.html#menu') }
          ]
        },
        {
          heading: 'Bakery & Savories',
          items: [
            { title: 'Artisanal Pastries', desc: 'Butter croissants & pain au chocolat', icon: '🥐', url: getUrl('cafe.html#menu') },
            { title: 'Gourmet Paninis', desc: 'Warm sourdough & tartines', icon: '🥪', url: getUrl('cafe.html#menu') },
            { title: 'Handcrafted Cakes', desc: 'Earl grey cake & pistachio tarts', icon: '🍰', url: getUrl('cafe.html#menu') }
          ]
        }
      ],
      promo: {
        badge: 'Table Service',
        title: 'Reserve Your Nook',
        desc: 'Book your cozy café seating or enter your service number for direct seat delivery.',
        btnText: 'Reserve Table 🪑',
        btnUrl: getUrl('cafe.html#reservation')
      }
    },
    {
      id: 'library',
      label: 'Library',
      url: getUrl('library.html'),
      columns: [
        {
          heading: 'Book Collection',
          items: [
            { title: 'Literary Fiction', desc: 'Contemporary novels & storytelling', icon: '📖', url: getUrl('library.html?cat=fiction') },
            { title: 'Classics & Philosophy', desc: 'Timeless literature & essays', icon: '🏛️', url: getUrl('library.html?cat=classics') },
            { title: 'Poetry & Local Zines', desc: 'Independent poetry & art zines', icon: '✒️', url: getUrl('library.html?cat=poetry') },
            { title: 'Non-Fiction & Science', desc: 'Biographies & cultural studies', icon: '🔬', url: getUrl('library.html?cat=nonfiction') }
          ]
        },
        {
          heading: 'Patron Services',
          items: [
            { title: 'Search Bookshelf', desc: 'Live filter 5,000+ title catalog', icon: '🔍', url: getUrl('library.html') },
            { title: 'Active Loans & Holds', desc: 'Manage borrowed books & due dates', icon: '🔖', url: user ? getUrl('profile.html#loans') : getUrl('library.html') },
            { title: 'Propose a Book', desc: 'Recommend new titles for acquisition', icon: '💡', url: getUrl('library.html#proposals') }
          ]
        }
      ],
      promo: {
        badge: 'Sanctuary',
        title: 'Silent Study Nook',
        desc: 'Enjoy free book checkout, warm reading ambient lighting, and bookmarks.',
        btnText: 'Explore Shelf 📚',
        btnUrl: getUrl('library.html')
      }
    },
    {
      id: 'flowers',
      label: 'Flowers',
      url: getUrl('flowers.html'),
      columns: [
        {
          heading: 'Floral Studio',
          items: [
            { title: 'Fresh Single Stems', desc: 'Seasonal blooms & eucalyptus greenery', icon: '🌿', url: getUrl('flowers.html?cat=stems') },
            { title: 'Signature Bouquets', desc: 'Hand-tied artisan floral arrangements', icon: '💐', url: getUrl('flowers.html?cat=bouquets') },
            { title: 'Dried & Everlasting', desc: 'Botanical arrangements crafted to last', icon: '🌾', url: getUrl('flowers.html?cat=dried') }
          ]
        },
        {
          heading: 'Botanical Services',
          items: [
            { title: 'Custom Stem Builder', desc: 'Pick & bundle your stem mix', icon: '✂️', url: getUrl('flowers.html#custom-builder') },
            { title: 'Floral Workshops', desc: 'Hands-on flower arranging classes', icon: '🌸', url: getUrl('events.html') },
            { title: 'Gift Packaging', desc: 'Handwritten notes & custom wrap', icon: '🎁', url: getUrl('flowers.html') }
          ]
        }
      ],
      promo: {
        badge: 'Botanical',
        title: 'Fresh Daily Stems',
        desc: 'Sustainably harvested local flowers wrapped in recycled parchment paper.',
        btnText: 'Order Flowers 💐',
        btnUrl: getUrl('flowers.html')
      }
    },
    {
      id: 'events',
      label: 'Events',
      url: getUrl('events.html'),
      columns: [
        {
          heading: 'Gatherings',
          items: [
            { title: 'Weekly Book Club', desc: 'Monthly book reads & open discussion', icon: '📖', url: getUrl('events.html?cat=bookclub') },
            { title: 'Acoustic Lounge', desc: 'Live acoustic music performances', icon: '🎵', url: getUrl('events.html?cat=music') },
            { title: 'Author Readings', desc: 'Book launches & author discussions', icon: '🖋️', url: getUrl('events.html?cat=author') }
          ]
        },
        {
          heading: 'Community',
          items: [
            { title: 'Event Calendar', desc: 'Full monthly schedule of events', icon: '📅', url: getUrl('events.html') },
            { title: 'Private Venue Hire', desc: 'Host celebrations or book launches', icon: '🥂', url: getUrl('events.html#private-booking') },
            { title: 'My RSVPs', desc: 'Manage registered event seats', icon: '🎫', url: user ? getUrl('profile.html') : getUrl('events.html') }
          ]
        }
      ],
      promo: {
        badge: 'Community',
        title: 'Host Your Gathering',
        desc: 'Flexible lounge space with projector, sound system, & complimentary coffee service.',
        btnText: 'View Events 📅',
        btnUrl: getUrl('events.html')
      }
    }
  ];

  if (user) {
    const isAdminStaff = user.role === 'admin' || user.role === 'staff';
    menuConfig.push({
      id: 'profile',
      label: 'Member Hub',
      url: getUrl('profile.html'),
      columns: [
        {
          heading: 'Patron Account',
          items: [
            { title: 'Patron Profile', desc: `Code: ${user.patronCode || '#MEM'}`, icon: '👤', url: getUrl('profile.html') },
            { title: 'Table Reservations', desc: 'View pending & confirmed bookings', icon: '🍽️', url: getUrl('profile.html#reservations') },
            { title: 'Order History', desc: 'Past café & flower order receipts', icon: '🛍️', url: getUrl('profile.html#orders') }
          ]
        },
        {
          heading: 'Library & Alerts',
          items: [
            { title: 'Library Loans', desc: 'Manage borrowed books & due dates', icon: '📚', url: getUrl('profile.html#loans') },
            { title: 'Notifications Inbox', desc: 'Messenger-style real-time alerts', icon: '🔔', url: getUrl('profile.html#notifs') }
          ]
        }
      ],
      promo: {
        badge: isAdminStaff ? 'Staff Admin' : 'Patron Member',
        title: user.name || 'Patron Member',
        desc: isAdminStaff
          ? 'Access staff console & seating approval dashboard.'
          : 'Thank you for being part of AFTERWORD community hub.',
        btnText: isAdminStaff ? 'Admin Console ⚙️' : 'My Profile 👤',
        btnUrl: isAdminStaff ? getUrl('admin.html') : getUrl('profile.html')
      }
    });
  }

  // Render Mega Menu HTML inside navContainer
  navContainer.innerHTML = menuConfig.map(menu => {
    const isCurrentPath = path.includes(menu.id) || 
      (menu.id === 'home' && (path.endsWith('index.html') || path.endsWith('/')));
    const activeClass = isCurrentPath ? 'active' : '';

    if (menu.isSimple) {
      return `<a href="${menu.url}" class="nav-link ${activeClass}">${menu.label}</a>`;
    }

    const columnsHtml = menu.columns.map(col => `
      <div class="mega-menu-column">
        <div class="mega-menu-heading">${col.heading}</div>
        ${col.items.map(item => `
          <a href="${item.url}" class="mega-menu-item">
            <span class="mega-menu-icon">${item.icon}</span>
            <span class="mega-menu-text">
              <span class="mega-menu-title">${item.title}</span>
              <span class="mega-menu-desc">${item.desc}</span>
            </span>
          </a>
        `).join('')}
      </div>
    `).join('');

    const promoHtml = menu.promo ? `
      <div class="mega-menu-card">
        <div>
          <span class="mega-menu-card-badge">${menu.promo.badge}</span>
          <div class="mega-menu-card-title">${menu.promo.title}</div>
          <div class="mega-menu-card-desc">${menu.promo.desc}</div>
        </div>
        <a href="${menu.promo.btnUrl}" class="mega-menu-card-btn">${menu.promo.btnText}</a>
      </div>
    ` : '';

    return `
      <div class="nav-item-dropdown">
        <a href="${menu.url}" class="nav-link ${activeClass}">
          ${menu.label} <span class="nav-link-caret">▾</span>
        </a>
        <div class="mega-menu-panel">
          ${columnsHtml}
          ${promoHtml}
        </div>
      </div>
    `;
  }).join('');

  // Update mobile drawer navigation too for a clean mobile experience
  const mobileDrawer = document.querySelector('.mobile-nav-drawer');
  if (mobileDrawer) {
    let mobileHtml = `<a href="${homeUrl}" class="nav-link ${path.endsWith('index.html') || path.endsWith('/') ? 'active' : ''}">Home</a>`;
    menuConfig.filter(m => !m.isSimple).forEach(m => {
      const active = path.includes(m.id) ? 'active' : '';
      mobileHtml += `<a href="${m.url}" class="nav-link ${active}">${m.label}</a>`;
    });
    if (user && (user.role === 'admin' || user.role === 'staff')) {
      mobileHtml += `<a href="${getUrl('admin.html')}" class="nav-link">Staff Admin Console</a>`;
    }
    mobileDrawer.innerHTML = mobileHtml;
  }
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
