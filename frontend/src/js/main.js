/**
 * AFTERWORD COMMUNITY HUB — CLIENT APPLICATION
 * Lightweight bootstrap entry point coordinating modular frontend subsystems.
 * 
 * Modular Architecture:
 * - toast.js       : Transient notification alerts (showToast)
 * - navigation.js  : Route highlight, drawer, quick search
 * - cart.js        : Order tray calculation, state, rendering
 * - filters.js     : Tabs, catalog live search, events search
 * - modals.js      : Loan hold, proposal dialogues, quick RSVP
 * - cafe.js        : Table service number persistence
 * - notifications  : Real-time loan status + order ready alerts
 */

/**
 * Main application bootstrap listener.
 * Invoked once the initial HTML document has been completely parsed and loaded.
 * Sequentially initializes each frontend subsystem in safe dependency order.
 */
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initCart();
  initFilters();
  initModals();
  initCafeTable();
  initNotificationSystem();
  initDynamicBookAvailability();
});

// ---------------------------------------------------------------------------
// Notification System — Real-time Loan + Order Alerts
// ---------------------------------------------------------------------------

/** Tracks previously shown toast notifications to avoid duplicates */
let _shownNotifKeys = new Set();
/** Tracks the last known notification state to detect new changes */
let _lastNotifHash = '';

/** Tracks read notifications persisted in localStorage */
let _readNotifKeys = new Set();
try {
  const savedRead = localStorage.getItem('afterword_read_notifs');
  if (savedRead) _readNotifKeys = new Set(JSON.parse(savedRead));
} catch (e) {}

function _saveReadNotifs() {
  try {
    localStorage.setItem('afterword_read_notifs', JSON.stringify([..._readNotifKeys]));
  } catch (e) {}
}

/** Tracks deleted/dismissed notifications persisted in localStorage */
let _deletedNotifKeys = new Set();
try {
  const savedDel = localStorage.getItem('afterword_deleted_notifs');
  if (savedDel) _deletedNotifKeys = new Set(JSON.parse(savedDel));
} catch (e) {}

function _saveDeletedNotifs() {
  try {
    localStorage.setItem('afterword_deleted_notifs', JSON.stringify([..._deletedNotifKeys]));
  } catch (e) {}
}

/**
 * Injects notification CSS styles for grayed out read state & clear button.
 */
function _injectNotifStyles() {
  if (document.getElementById('notif-custom-styles')) return;
  const style = document.createElement('style');
  style.id = 'notif-custom-styles';
  style.textContent = `
    .notif-dropdown-header {
      padding: 10px 14px;
      border-bottom: 1px solid rgba(0,0,0,0.08);
      background: #faf7f2;
    }
    .notif-hdr-btn {
      background: #fff;
      border: 1px solid rgba(0, 0, 0, 0.18);
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 0.7rem;
      font-weight: 600;
      color: #444;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .notif-hdr-btn:hover {
      background: #e9e5df;
      color: #111;
      border-color: #888;
    }
    .notif-hdr-btn.danger {
      color: #c0392b;
      border-color: rgba(192, 57, 43, 0.3);
      background: #fdf2e9;
    }
    .notif-hdr-btn.danger:hover {
      background: #fadbd8;
      color: #922b21;
    }
    .notif-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }
    .notif-item:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }
    .notif-item.read {
      background-color: rgba(0, 0, 0, 0.03) !important;
      opacity: 0.6;
    }
    .notif-item.read .notif-title {
      color: var(--color-text-muted, #777) !important;
      font-weight: 500 !important;
    }
    .notif-checkbox {
      width: 15px;
      height: 15px;
      accent-color: #a65f45;
      cursor: pointer;
      flex-shrink: 0;
    }
    .notif-delete-single {
      background: none;
      border: none;
      color: #a09587;
      font-size: 13px;
      width: 24px;
      height: 24px;
      cursor: pointer;
      margin-left: auto;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .notif-delete-single:hover {
      color: #c0392b;
      background: rgba(192, 57, 43, 0.12);
    }
    .notif-category-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(0,0,0,0.08);
      overflow-x: auto;
    }
    .notif-tab-btn {
      padding: 3px 10px;
      font-size: 0.75rem;
      border-radius: 14px;
      border: 1px solid rgba(0,0,0,0.15);
      background: #ffffff;
      color: #3b2922;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .notif-tab-btn:hover {
      background: #f5f0e8;
      border-color: #a65f45;
    }
    .notif-tab-btn.active {
      background: #3b2922 !important;
      color: #faf7f2 !important;
      border-color: #3b2922 !important;
    }
  `;
  document.head.appendChild(style);
}

/** Active notification filter tab: 'all' | 'reservations' | 'orders' | 'library' */
let _activeNotifCategory = 'all';

/**
 * Initializes the notification bell icon in the header and starts
 * background polling for loan status changes, reservations, and order readiness.
 */
function initNotificationSystem() {
  _injectNotifStyles();

  // Inject notification bell into ALL header-right and topbar-right sections
  injectNotificationBell();

  // Initial fetch + periodic polling every 6 seconds
  fetchAndRenderNotifications();
  setInterval(() => fetchAndRenderNotifications(), 6000);
}

/**
 * Safely retrieves the logged-in user object from localStorage.
 * @returns {Object|null} User object or null.
 */
function _getLoggedInUserSafe() {
  try {
    if (typeof getLoggedInUser === 'function') {
      const u = getLoggedInUser();
      if (u) return u;
    }
    const raw = localStorage.getItem('afterword_user');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

/**
 * Injects the notification bell button into site header and admin topbar.
 */
function injectNotificationBell() {
  const containers = document.querySelectorAll('.header-right, .topbar-right');
  containers.forEach(container => {
    if (container.querySelector('.notif-bell-wrap')) return;

    // Prefer inserting before header patron badge, generic avatar, or staff profile card
    const anchor = container.querySelector('.header-patron-badge, .nav-user-avatar, .staff-profile-card, #admin-staff-avatar');

    const bellWrap = document.createElement('div');
    bellWrap.className = 'notif-bell-wrap';
    bellWrap.innerHTML = `
      <button class="notif-bell-btn" aria-label="Notifications" title="Notifications">
        <span class="material-symbols-outlined">notifications</span>
        <span class="notif-badge hidden" id="notif-badge-count">0</span>
      </button>
      <div class="notif-dropdown" id="notif-dropdown">
        <div class="notif-dropdown-header">
          <div class="notif-hdr-row" style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="material-symbols-outlined text-primary" style="font-size: 18px;">notifications</span>
              <span style="font-weight: 700; color: #3b2922; font-size: 0.95rem;">Notifications</span>
            </div>
            <span class="notif-count-label" style="font-size: 0.75rem; color: #68705a; background: #e5dfd5; padding: 2px 8px; border-radius: 12px; font-weight: 700;">0 unread</span>
          </div>

          <!-- Messenger-Style Category Tabs -->
          <div class="notif-category-tabs">
            <button type="button" class="notif-tab-btn active" data-notif-tab="all">All</button>
            <button type="button" class="notif-tab-btn" data-notif-tab="reservations">Reservations</button>
            <button type="button" class="notif-tab-btn" data-notif-tab="orders">Orders</button>
            <button type="button" class="notif-tab-btn" data-notif-tab="library">Library</button>
          </div>

          <div class="notif-hdr-actions" style="display: flex; gap: 6px; align-items: center; width: 100%; flex-wrap: wrap;">
            <button type="button" class="notif-hdr-btn" id="notif-mark-read-btn" title="Mark all notifications as read">Mark All Read</button>
            <button type="button" class="notif-hdr-btn danger" id="notif-clear-all-btn" title="Delete all notifications">Clear All</button>
          </div>
        </div>
        <div id="notif-list"></div>
      </div>
    `;

    if (anchor) {
      container.insertBefore(bellWrap, anchor);
    } else {
      container.appendChild(bellWrap);
    }

    // Toggle dropdown on bell click
    const bellBtn = bellWrap.querySelector('.notif-bell-btn');
    const dropdown = bellWrap.querySelector('.notif-dropdown');

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    // Category Tabs handler
    bellWrap.querySelectorAll('.notif-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        bellWrap.querySelectorAll('.notif-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeNotifCategory = btn.getAttribute('data-notif-tab') || 'all';
        fetchAndRenderNotifications();
      });
    });

    // Mark all read button handler
    const markReadBtn = bellWrap.querySelector('#notif-mark-read-btn');
    if (markReadBtn) {
      markReadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        bellWrap.querySelectorAll('.notif-item').forEach(item => {
          const key = item.getAttribute('data-notif-key');
          if (key) _readNotifKeys.add(key);
        });
        _saveReadNotifs();
        fetchAndRenderNotifications();
        if (typeof showToast === 'function') {
          showToast('All notifications marked as read', 'check_circle');
        }
      });
    }

    // Delete all button handler
    const clearBtn = bellWrap.querySelector('#notif-clear-all-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        bellWrap.querySelectorAll('.notif-item').forEach(item => {
          const key = item.getAttribute('data-notif-key');
          if (key) _deletedNotifKeys.add(key);
        });
        _saveDeletedNotifs();
        fetchAndRenderNotifications();
        if (typeof showToast === 'function') {
          showToast('All notifications cleared!', 'delete');
        }
      });
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!bellWrap.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
  });
}

/**
 * Fetches notifications (reservations, orders, loans) and renders them in dropdown.
 */
async function fetchAndRenderNotifications() {
  try {
    const user = _getLoggedInUserSafe();
    const userId = user?.id || null;
    const userEmail = user?.email || (localStorage.getItem('afterword_user') ? JSON.parse(localStorage.getItem('afterword_user'))?.email : '') || 'patron@afterword.hub';

    let allNotifs = [];

    // 1. Fetch backend notifications if userId exists
    if (userId && window.AfterwordAPI && typeof window.AfterwordAPI.getNotifications === 'function') {
      try {
        const dbNotifs = await window.AfterwordAPI.getNotifications(userId);
        if (Array.isArray(dbNotifs)) {
          dbNotifs.forEach(n => {
            let cat = 'library';
            if (n.type.includes('meal') || n.type.includes('order') || n.type.includes('flower')) cat = 'orders';
            if (n.type.includes('table')) cat = 'reservations';
            allNotifs.push({
              key: `${n.type}:${n.loanId || n.orderId || n.reservationId}`,
              category: cat,
              ...n
            });
          });
        }
      } catch (e) {}
    }

    // 2. Fetch Table Reservations for current patron email
    try {
      const resUrl = userEmail ? `/api/reservations?email=${encodeURIComponent(userEmail)}` : '/api/reservations';
      const rRes = await fetch(resUrl);
      if (rRes.ok) {
        const reservations = await rRes.json();
        if (Array.isArray(reservations)) {
          reservations.forEach(r => {
            const timeStr = r.start_time ? r.start_time.slice(0, 5) : '';
            const key = `table_res:${r.reservation_id}:${r.status}`;

            if (r.status === 'Pending') {
              allNotifs.push({
                key,
                type: 'table_pending',
                category: 'reservations',
                icon: 'hourglass_top',
                title: `Table #${r.table_number} — Pending Approval`,
                message: `Booking for ${r.reservation_date} at ${timeStr} (${r.guest_count} guests) is waiting for staff approval.`,
                urgent: false,
                timestamp: r.created_at
              });
            } else if (r.status === 'Confirmed' || r.status === 'Approved') {
              allNotifs.push({
                key,
                type: 'table_confirmed',
                category: 'reservations',
                icon: 'event_seat',
                title: `Table #${r.table_number} — Reserved & Approved!`,
                message: `Your reservation for Table #${r.table_number} on ${r.reservation_date} at ${timeStr} was APPROVED by staff!`,
                urgent: true,
                timestamp: r.created_at
              });
            } else if (r.status === 'Cancelled' || r.status === 'Rejected') {
              allNotifs.push({
                key,
                type: 'table_cancelled',
                category: 'reservations',
                icon: 'cancel',
                title: `Table #${r.table_number} — Reservation Cancelled`,
                message: `Your reservation for Table #${r.table_number} on ${r.reservation_date} was cancelled.`,
                urgent: false,
                timestamp: r.created_at
              });
            }
          });
        }
      }
    } catch (rErr) {}

    // Deduplicate notifications by key
    const notifMap = new Map();
    allNotifs.forEach(n => {
      if (!n.key) n.key = `${n.type}:${n.timestamp || Date.now()}`;
      if (!notifMap.has(n.key)) notifMap.set(n.key, n);
    });

    const mergedNotifs = Array.from(notifMap.values());

    // Filter out deleted notifications
    const activeNotifications = mergedNotifs.filter(n => !_deletedNotifKeys.has(n.key));

    // Detect new notifications & fire toasts
    const hash = JSON.stringify(activeNotifications.map(n => n.key));
    const isFirstLoad = _lastNotifHash === '';

    if (!isFirstLoad && hash !== _lastNotifHash) {
      for (const notif of activeNotifications) {
        if (!_shownNotifKeys.has(notif.key)) {
          _shownNotifKeys.add(notif.key);
          if (notif.type === 'table_confirmed' || notif.type === 'meal_ready' || notif.type === 'flower_ready') {
            if (typeof showToast === 'function') {
              showToast(`${notif.title} — ${notif.message}`, notif.icon || 'check_circle');
            }
          }
        }
      }
    }
    _lastNotifHash = hash;

    if (isFirstLoad) {
      activeNotifications.forEach(n => _shownNotifKeys.add(n.key));
    }

    // Calculate unread count across ALL active notifications
    const unreadNotifs = activeNotifications.filter(n => !_readNotifKeys.has(n.key));
    const unreadCount = unreadNotifs.length;

    document.querySelectorAll('.notif-badge').forEach(badge => {
      badge.textContent = unreadCount;
      badge.classList.toggle('hidden', unreadCount === 0);
    });

    document.querySelectorAll('.notif-count-label').forEach(lbl => {
      lbl.textContent = `${unreadCount} unread`;
    });

    // Filter by active Category Tab
    let filteredCategoryNotifs = activeNotifications;
    if (_activeNotifCategory !== 'all') {
      filteredCategoryNotifs = activeNotifications.filter(n => n.category === _activeNotifCategory);
    }

    // Render list HTML
    const listEl = document.getElementById('notif-list');
    if (!listEl) return;

    if (filteredCategoryNotifs.length === 0) {
      listEl.innerHTML = `
        <div class="notif-empty" style="padding: 24px; text-align: center; color: #888;">
          <span class="material-symbols-outlined" style="font-size: 36px; color: #ccc;">notifications_off</span>
          <p style="margin-top: 8px; font-size: 0.85rem;">No ${_activeNotifCategory !== 'all' ? _activeNotifCategory : ''} notifications right now.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filteredCategoryNotifs.map(notif => {
      const isRead = _readNotifKeys.has(notif.key);

      let iconClass = 'loan';
      let extraClass = isRead ? 'read' : '';

      if (notif.category === 'orders' || notif.type.includes('meal')) iconClass = 'order';
      if (notif.type.includes('flower')) iconClass = 'flower';
      if (notif.category === 'reservations' || notif.type.includes('table')) iconClass = 'pending';
      if (notif.type === 'table_confirmed') iconClass = 'order';
      if (notif.type.includes('denied') || notif.type.includes('cancelled')) iconClass = 'denied';

      if (notif.urgent && !isRead) extraClass += ' urgent';

      return `
        <div class="notif-item ${extraClass.trim()}" data-notif-key="${notif.key}">
          <div class="notif-icon-wrap ${iconClass}">
            <span class="material-symbols-outlined">${notif.icon || 'info'}</span>
          </div>
          <div class="notif-content" style="flex: 1; min-width: 0;">
            <div class="notif-title" style="font-weight: 700; color: #3b2922; font-size: 0.85rem;">${notif.title}</div>
            <div class="notif-message" style="font-size: 0.78rem; color: #666; margin-top: 2px;">${notif.message}</div>
          </div>
          <button type="button" class="notif-delete-single" data-notif-key="${notif.key}" title="Delete notification">✕</button>
        </div>
      `;
    }).join('');

    // Attach click listeners
    listEl.querySelectorAll('.notif-item').forEach(itemEl => {
      const key = itemEl.getAttribute('data-notif-key');

      // Single delete button
      const delBtn = itemEl.querySelector('.notif-delete-single');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (key) {
            _deletedNotifKeys.add(key);
            _saveDeletedNotifs();
            fetchAndRenderNotifications();
            if (typeof showToast === 'function') {
              showToast('Notification cleared', 'delete');
            }
          }
        });
      }

      // Mark as read click
      itemEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('notif-delete-single')) return;

        if (key) {
          _readNotifKeys.add(key);
          _saveReadNotifs();
          itemEl.classList.add('read');
          itemEl.classList.remove('urgent');

          const remainingUnread = activeNotifications.filter(n => !_readNotifKeys.has(n.key)).length;
          document.querySelectorAll('.notif-badge').forEach(badge => {
            badge.textContent = remainingUnread;
            badge.classList.toggle('hidden', remainingUnread === 0);
          });
          document.querySelectorAll('.notif-count-label').forEach(lbl => {
            lbl.textContent = `${remainingUnread} unread`;
          });
        }
      });
    });

  } catch (err) {
    console.debug('Notification poll notice:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Dynamic Book Availability — Gray out unavailable books on library page
// ---------------------------------------------------------------------------

/**
 * Fetches real-time book availability from the database and grays out
 * book cards on the library page that have 0 available copies.
 * Also updates the book-details quickview modal availability text.
 */
async function initDynamicBookAvailability() {
  // Only run on pages with book cards
  const bookCards = document.querySelectorAll('.book-item-card[data-book-id]');
  if (bookCards.length === 0) return;

  try {
    const api = window.AfterwordAPI;
    if (!api || typeof api.getBooks !== 'function') return;

    const books = await api.getBooks();
    if (!Array.isArray(books)) return;

    // Build a lookup: title-key -> { available_copies, total_copies }
    const availabilityMap = {};
    for (const book of books) {
      const key = (book.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      availabilityMap[key] = {
        available: book.available_copies ?? 1,
        total: book.total_copies ?? 1,
        bookId: book.book_id
      };
      // Also map by book_id
      availabilityMap[`id_${book.book_id}`] = availabilityMap[key];
    }

    // Map book-id attribute slugs to DB title keys
    const slugToKey = {
      'chainsawman': 'chainsawman',
      'checkandmate': 'checkmate',
      'tteokbokki': 'iwanttodiebuti',
      'alchemist': 'thealchemist',
      'sevenyearslip': 'thesevenyearslip'
    };

    bookCards.forEach(card => {
      const bookId = card.getAttribute('data-book-id');
      const title = card.getAttribute('data-title') || '';
      const titleKey = title.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Try multiple lookups
      let info = availabilityMap[titleKey];
      if (!info && bookId) info = availabilityMap[bookId];
      if (!info && slugToKey[bookId]) info = availabilityMap[slugToKey[bookId]];

      // Fuzzy match: find any DB book whose normalized title contains this card's title slug
      if (!info) {
        for (const [key, val] of Object.entries(availabilityMap)) {
          if (key.includes(bookId) || (titleKey && key.includes(titleKey.slice(0, 10)))) {
            info = val;
            break;
          }
        }
      }

      if (info) {
        const availText = card.querySelector('.book-availability .flex-row');
        const statusDot = card.querySelector('.book-availability .status-dot');

        if (info.available <= 0) {
          // Gray out this book card
          card.classList.add('unavailable');

          if (availText) {
            availText.innerHTML = `
              <span class="status-dot"></span> All Copies on Loan (0 of ${info.total})
            `;
          }
        } else {
          // Ensure the card is not grayed out and update with real counts
          card.classList.remove('unavailable');

          if (availText) {
            const copyWord = info.available === 1 ? 'Copy' : 'Copies';
            availText.innerHTML = `
              <span class="status-dot active"></span> Available (${info.available} ${copyWord})
            `;
          }
        }

        // Store the DB book_id on the card for borrow operations
        if (info.bookId) {
          card.setAttribute('data-db-book-id', info.bookId);
        }
      }
    });
  } catch (err) {
    console.debug('Book availability check notice:', err.message);
  }
}
