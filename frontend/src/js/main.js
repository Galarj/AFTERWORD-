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
  `;
  document.head.appendChild(style);
}

/**
 * Initializes the notification bell icon in the header and starts
 * background polling for loan status changes and order readiness.
 */
function initNotificationSystem() {
  _injectNotifStyles();
  const user = _getLoggedInUserSafe();
  if (!user || !user.id) return;

  // Inject notification bell into ALL header-right sections
  injectNotificationBell();

  // Initial fetch + periodic polling every 8 seconds
  fetchAndRenderNotifications(user.id);
  setInterval(() => fetchAndRenderNotifications(user.id), 8000);
}

/**
 * Safely retrieves the logged-in user object from localStorage.
 * @returns {Object|null} User object or null.
 */
function _getLoggedInUserSafe() {
  try {
    if (typeof getLoggedInUser === 'function') {
      const u = getLoggedInUser();
      if (u && u.id) return u;
    }
    const raw = localStorage.getItem('afterword_user');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

/**
 * Injects the notification bell button into the site header (before the profile icon).
 */
function injectNotificationBell() {
  const headerRights = document.querySelectorAll('.header-right');
  headerRights.forEach(headerRight => {
    // Avoid duplicate injection
    if (headerRight.querySelector('.notif-bell-wrap')) return;

    const profileLink = headerRight.querySelector('.nav-user-avatar');

    const bellWrap = document.createElement('div');
    bellWrap.className = 'notif-bell-wrap';
    bellWrap.innerHTML = `
      <button class="notif-bell-btn" aria-label="Notifications" title="Notifications">
        <span class="material-symbols-outlined">notifications</span>
        <span class="notif-badge hidden" id="notif-badge-count">0</span>
      </button>
      <div class="notif-dropdown" id="notif-dropdown">
        <div class="notif-dropdown-header">
          <div class="notif-hdr-row" style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 6px;">
            <span style="font-weight: 700; color: #1c2b26; font-size: 0.9rem;">Notifications</span>
            <span class="notif-count-label" style="font-size: 0.75rem; color: #777;">0 unread</span>
          </div>
          <div class="notif-hdr-actions" style="display: flex; gap: 6px; align-items: center; width: 100%; flex-wrap: wrap;">
            <button class="notif-hdr-btn" id="notif-select-all-btn" title="Select or deselect all items">Select All</button>
            <button class="notif-hdr-btn danger" id="notif-delete-selected-btn" style="display: none;" title="Delete selected notifications">Delete Selected (<span id="notif-selected-count">0</span>)</button>
            <button class="notif-hdr-btn danger" id="notif-clear-all-btn" title="Delete all notifications">Delete All</button>
          </div>
        </div>
        <div id="notif-list"></div>
      </div>
    `;

    if (profileLink) {
      headerRight.insertBefore(bellWrap, profileLink);
    } else {
      headerRight.appendChild(bellWrap);
    }

    // Toggle dropdown on bell click
    const bellBtn = bellWrap.querySelector('.notif-bell-btn');
    const dropdown = bellWrap.querySelector('.notif-dropdown');

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    // Delete all button handler
    const clearBtn = bellWrap.querySelector('#notif-clear-all-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const user = _getLoggedInUserSafe();
        if (user && user.id) {
          const api = window.AfterwordAPI;
          if (api && typeof api.getNotifications === 'function') {
            api.getNotifications(user.id).then(notifs => {
              if (Array.isArray(notifs)) {
                notifs.forEach(n => {
                  const key = `${n.type}:${n.loanId || n.orderId}`;
                  _deletedNotifKeys.add(key);
                });
                _saveDeletedNotifs();
                fetchAndRenderNotifications(user.id);
                if (typeof showToast === 'function') {
                  showToast('All notifications deleted!', 'delete');
                }
              }
            });
          }
        }
      });
    }

    // Delete selected button handler
    const delSelectedBtn = bellWrap.querySelector('#notif-delete-selected-btn');
    if (delSelectedBtn) {
      delSelectedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const checkedBoxes = bellWrap.querySelectorAll('.notif-checkbox:checked');
        if (checkedBoxes.length === 0) return;

        checkedBoxes.forEach(cb => {
          const key = cb.getAttribute('data-notif-key');
          if (key) _deletedNotifKeys.add(key);
        });
        _saveDeletedNotifs();

        const user = _getLoggedInUserSafe();
        if (user && user.id) fetchAndRenderNotifications(user.id);

        if (typeof showToast === 'function') {
          showToast(`Deleted ${checkedBoxes.length} selected notification(s)!`, 'delete_outline');
        }
      });
    }

    // Select all button handler
    const selectAllBtn = bellWrap.querySelector('#notif-select-all-btn');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const boxes = bellWrap.querySelectorAll('.notif-checkbox');
        if (boxes.length === 0) return;

        const allChecked = Array.from(boxes).every(b => b.checked);
        boxes.forEach(b => b.checked = !allChecked);

        // Update selected button
        _updateSelectedNotifCount(bellWrap);
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
 * Updates the visibility and count of the "Delete Selected" button.
 */
function _updateSelectedNotifCount(container = document) {
  const checkedBoxes = container.querySelectorAll('.notif-checkbox:checked');
  const count = checkedBoxes.length;

  container.querySelectorAll('#notif-delete-selected-btn').forEach(btn => {
    btn.style.display = count > 0 ? 'inline-block' : 'none';
  });
  container.querySelectorAll('#notif-selected-count').forEach(span => {
    span.textContent = count;
  });
}

/**
 * Fetches notifications from the backend and renders them in the dropdown.
 * Also fires toasts for new urgent notifications (order ready, loan denied, etc.)
 * @param {string} userId - The logged-in user's UUID.
 */
async function fetchAndRenderNotifications(userId) {
  try {
    const api = window.AfterwordAPI;
    if (!api || typeof api.getNotifications !== 'function') return;

    const notifications = await api.getNotifications(userId);
    if (!Array.isArray(notifications)) return;

    // Filter out deleted notifications first
    const activeNotifications = notifications.filter(n => {
      const key = `${n.type}:${n.loanId || n.orderId}`;
      return !_deletedNotifKeys.has(key);
    });

    // Build a hash to detect changes
    const hash = JSON.stringify(activeNotifications.map(n => `${n.type}:${n.loanId || n.orderId}:${n.message}`));
    const isFirstLoad = _lastNotifHash === '';

    // Show toasts for NEW notifications only (not on first load)
    if (!isFirstLoad && hash !== _lastNotifHash) {
      for (const notif of activeNotifications) {
        const key = `${notif.type}:${notif.loanId || notif.orderId}`;
        if (!_shownNotifKeys.has(key)) {
          _shownNotifKeys.add(key);

          // Fire toast for important notifications
          if (notif.type === 'meal_ready' || notif.type === 'flower_ready') {
            if (typeof showToast === 'function') {
              showToast(notif.title + ' ' + notif.message, notif.icon || 'restaurant');
            }
          }
          if (notif.type === 'loan_denied') {
            if (typeof showToast === 'function') {
              showToast(notif.title + ' ' + notif.message, 'block');
            }
          }
          if (notif.type === 'loan_active' && notif.daysLeft <= 3 && notif.daysLeft > 0) {
            if (typeof showToast === 'function') {
              showToast(`⚠️ "${notif.title}" — Only ${notif.daysLeft} day(s) left!`, 'schedule');
            }
          }
        }
      }
    }
    _lastNotifHash = hash;

    // Mark first-load keys to avoid spam
    if (isFirstLoad) {
      for (const notif of activeNotifications) {
        const key = `${notif.type}:${notif.loanId || notif.orderId}`;
        _shownNotifKeys.add(key);
      }
    }

    // Filter unread notifications count
    const unreadNotifs = activeNotifications.filter(n => {
      const key = `${n.type}:${n.loanId || n.orderId}`;
      return !_readNotifKeys.has(key);
    });

    const unreadCount = unreadNotifs.length;

    document.querySelectorAll('.notif-badge').forEach(badge => {
      badge.textContent = unreadCount;
      badge.classList.toggle('hidden', unreadCount === 0);
    });

    document.querySelectorAll('.notif-count-label').forEach(lbl => {
      lbl.textContent = `${unreadCount} unread`;
    });

    // Render notification items
    const listEl = document.getElementById('notif-list');
    if (!listEl) return;

    if (activeNotifications.length === 0) {
      listEl.innerHTML = `
        <div class="notif-empty" style="padding: 24px; text-align: center; color: #888;">
          <span class="material-symbols-outlined" style="font-size: 36px; color: #ccc;">notifications_off</span>
          <p style="margin-top: 8px; font-size: 0.85rem;">All clear! No notifications right now.</p>
        </div>
      `;
      _updateSelectedNotifCount();
      return;
    }

    listEl.innerHTML = activeNotifications.map(notif => {
      const key = `${notif.type}:${notif.loanId || notif.orderId}`;
      const isRead = _readNotifKeys.has(key);

      let iconClass = 'loan';
      let extraClass = isRead ? 'read' : '';

      if (notif.type.includes('meal') || notif.type.includes('order')) iconClass = 'order';
      if (notif.type.includes('flower')) iconClass = 'flower';
      if (notif.type.includes('denied')) iconClass = 'denied';
      if (notif.type.includes('overdue')) iconClass = 'overdue';
      if (notif.type.includes('pending')) iconClass = 'pending';

      if (notif.urgent && !isRead) extraClass += ' urgent';
      if (notif.type.includes('ready') && !isRead) extraClass += ' ready';

      let daysLeftBadge = '';
      if (notif.daysLeft !== undefined) {
        const cls = notif.daysLeft <= 0 ? 'danger' : (notif.daysLeft <= 3 ? 'warning' : 'good');
        const label = notif.daysLeft <= 0
          ? `OVERDUE ${Math.abs(notif.daysLeft)}d`
          : `${notif.daysLeft}d left`;
        daysLeftBadge = `<span class="days-left-badge ${cls}">${label}</span>`;
      }

      return `
        <div class="notif-item ${extraClass.trim()}" data-notif-key="${key}">
          <input type="checkbox" class="notif-checkbox" data-notif-key="${key}" title="Select notification">
          <div class="notif-icon-wrap ${iconClass}">
            <span class="material-symbols-outlined">${notif.icon || 'info'}</span>
          </div>
          <div class="notif-content" style="flex: 1; min-width: 0;">
            <div class="notif-title">${notif.title} ${daysLeftBadge}</div>
            <div class="notif-message">${notif.message}</div>
          </div>
          <button class="notif-delete-single" data-notif-key="${key}" title="Delete notification">✕</button>
        </div>
      `;
    }).join('');

    _updateSelectedNotifCount();

    // Attach click listeners to notification items
    listEl.querySelectorAll('.notif-item').forEach(itemEl => {
      const key = itemEl.getAttribute('data-notif-key');

      // Checkbox click
      const cb = itemEl.querySelector('.notif-checkbox');
      if (cb) {
        cb.addEventListener('click', (e) => {
          e.stopPropagation();
          const wrap = itemEl.closest('.notif-bell-wrap') || document;
          _updateSelectedNotifCount(wrap);
        });
      }

      // Single delete button click
      const delBtn = itemEl.querySelector('.notif-delete-single');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (key) {
            _deletedNotifKeys.add(key);
            _saveDeletedNotifs();
            fetchAndRenderNotifications(userId);
            if (typeof showToast === 'function') {
              showToast('Notification deleted', 'delete');
            }
          }
        });
      }

      // Item click (mark as read / gray out)
      itemEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('notif-checkbox') || e.target.classList.contains('notif-delete-single')) return;

        if (key) {
          _readNotifKeys.add(key);
          _saveReadNotifs();
          itemEl.classList.add('read');
          itemEl.classList.remove('urgent', 'ready');

          // Recount unread
          const remainingUnread = activeNotifications.filter(n => !_readNotifKeys.has(`${n.type}:${n.loanId || n.orderId}`)).length;
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
    // Silent fail for notification polling
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
