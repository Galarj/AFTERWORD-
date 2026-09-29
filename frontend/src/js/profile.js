/**
 * AFTERWORD — PATRON PROFILE PAGE CONTROLLER
 * Manages active user identity, borrowed stacks, table orders, workshop RSVPs,
 * and personal preference updates.
 */

document.addEventListener('DOMContentLoaded', () => {
  initUserProfile();
  initProfileTabs();
  initProfileActions();
});

/**
 * Loads logged-in user profile from session or initializes default patron.
 */
/**
 * Loads logged-in user profile from session and fetches live activity from backend API.
 */
async function initUserProfile() {
  let user = typeof getLoggedInUser === 'function' ? getLoggedInUser() : null;

  if (!user) {
    try {
      const raw = localStorage.getItem('afterword_user');
      if (raw) user = JSON.parse(raw);
    } catch (err) {
      console.warn('Session parse notice:', err);
    }
  }

  // Fallback default patron if opened without prior login
  if (!user) {
    user = {
      id: null,
      name: 'Guest Patron',
      email: 'patron@afterword.hub',
      patronCode: '#MEM-GUEST',
      role: 'customer',
      tier: 'Community Reader'
    };
  }

  // Populate Hero Header
  const nameEl = document.getElementById('profile-name-display');
  const emailEl = document.getElementById('profile-email-display');
  const codeEl = document.getElementById('profile-code-display');
  const tierEl = document.getElementById('profile-tier-display');
  const avatarEl = document.getElementById('profile-avatar-display');

  if (nameEl) nameEl.textContent = user.full_name || user.name || 'Patron Member';
  if (emailEl) emailEl.textContent = user.email || 'patron@afterword.hub';
  if (codeEl) codeEl.textContent = user.patronCode || user.patron_code || '#MEM-000';
  if (tierEl) tierEl.textContent = user.tier || (user.role === 'admin' ? 'Staff Administrator' : 'Ceramic Founding Patron');

  if (avatarEl) {
    const displayName = user.full_name || user.name || 'Patron';
    const initials = displayName
      .split(' ')
      .map(n => n.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
    avatarEl.textContent = initials;
  }

  // Populate Settings Form fields
  const inputName = document.getElementById('settings-name');
  const inputEmail = document.getElementById('settings-email');
  const inputTable = document.getElementById('settings-table');
  const inputDrink = document.getElementById('settings-drink');

  if (inputName) inputName.value = user.full_name || user.name || '';
  if (inputEmail) inputEmail.value = user.email || '';
  if (inputTable) inputTable.value = user.preferredTable || '';
  if (inputDrink) inputDrink.value = user.favoriteBeverage || '';

  // Fetch live loans, orders, and RSVPs for user or default patron
  await fetchLiveUserActivity(user && user.id ? user.id : null);
}

/**
 * Fetches active loans, café orders, and event RSVPs for the logged in user from backend API.
 */
async function fetchLiveUserActivity(userId) {
  try {
    const api = window.AfterwordAPI;

    // Fetch user profile from DB to get patron_code
    if (api && typeof api.getUserProfile === 'function') {
      try {
        const dbProfile = await api.getUserProfile(userId);
        if (dbProfile && dbProfile.patron_code) {
          const codeEl = document.getElementById('profile-code-display');
          if (codeEl) codeEl.textContent = dbProfile.patron_code;
        }
      } catch (err) {}
    }

    // 1. Fetch Loans
    let loans = [];
    try {
      const loanUrl = userId ? `/api/loans?user_id=${userId}` : '/api/loans';
      const res = await fetch(loanUrl);
      if (res.ok) loans = await res.json();
    } catch (e) {}

    const activeLoans = loans.filter(l => l.status === 'Borrowed');
    const loansStatEl = document.getElementById('stat-active-loans');
    const loansBadgeEl = document.getElementById('badge-loans');
    if (loansStatEl) loansStatEl.textContent = activeLoans.length;
    if (loansBadgeEl) loansBadgeEl.textContent = activeLoans.length;
    renderUserLoans(loans);

    // 2. Fetch Orders
    let orders = [];
    try {
      const res = await fetch(`/api/orders?user_id=${userId}`);
      if (res.ok) orders = await res.json();
    } catch (e) {}

    const ordersStatEl = document.getElementById('stat-orders');
    const ordersBadgeEl = document.getElementById('badge-orders');
    if (ordersStatEl) ordersStatEl.textContent = orders.length;
    if (ordersBadgeEl) ordersBadgeEl.textContent = orders.length;
    renderUserOrders(orders);

    // 3. Fetch RSVPs
    let rsvps = [];
    try {
      const res = await fetch(`/api/rsvps?user_id=${userId}`);
      if (res.ok) rsvps = await res.json();
    } catch (e) {}

    const activeRsvps = rsvps.filter(r => r.status === 'Confirmed');
    const rsvpsStatEl = document.getElementById('stat-rsvps');
    const rsvpsBadgeEl = document.getElementById('badge-rsvps');
    if (rsvpsStatEl) rsvpsStatEl.textContent = activeRsvps.length;
    if (rsvpsBadgeEl) rsvpsBadgeEl.textContent = activeRsvps.length;
    renderUserRsvps(rsvps);

    // 4. Fetch Wishlist
    let wishlist = [];
    try {
      const res = await fetch(`/api/wishlist?user_id=${userId}`);
      if (res.ok) wishlist = await res.json();
    } catch (e) {}

    renderUserWishlist(wishlist);

  } catch (err) {
    console.error('Error loading live user activity:', err);
  }
}

function renderUserWishlist(wishlist) {
  const container = document.getElementById('profile-wishlist-container');
  if (!container) return;

  if (!wishlist || wishlist.length === 0) {
    container.innerHTML = `
      <span class="text-sm text-muted">No titles saved to your reading wishlist yet. 
        Browse the <a href="library.html" class="text-primary font-semibold">Bookshelf</a> to save titles!
      </span>
    `;
    return;
  }

  const chipsClasses = ['chip-coffee', 'chip-terracotta', 'chip-olive'];

  container.innerHTML = wishlist.map((item, idx) => {
    const book = item.books || {};
    const chipClass = chipsClasses[idx % chipsClasses.length];

    return `
      <div class="chip ${chipClass} flex-row items-center gap-xs" style="padding: 6px 12px; cursor: pointer;">
        <span class="material-symbols-outlined icon-14">bookmark</span>
        <span>${book.title || 'Saved Book'}</span>
        <button type="button" 
                style="background:none; border:none; color:inherit; cursor:pointer; padding:0; margin-left:4px; display:inline-flex; align-items:center;"
                title="Remove from wishlist"
                data-action="remove-wishlist"
                data-wishlist-id="${item.wishlist_id}">
          <span class="material-symbols-outlined icon-14">close</span>
        </button>
      </div>
    `;
  }).join('');

  // Attach event listeners to wishlist delete buttons
  container.querySelectorAll('[data-action="remove-wishlist"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const wishlistId = btn.getAttribute('data-wishlist-id');
      if (!wishlistId) return;

      btn.closest('.chip')?.remove();

      try {
        if (window.AfterwordAPI && typeof window.AfterwordAPI.removeFromWishlist === 'function') {
          await window.AfterwordAPI.removeFromWishlist(wishlistId);
        } else {
          await fetch(`/api/wishlist/${wishlistId}`, { method: 'DELETE' });
        }
        if (typeof showToast === 'function') {
          showToast('Item removed from your reading wishlist.', 'info');
        }
      } catch (err) {
        console.error('Error removing from wishlist:', err);
      }
    });
  });
}

/** Tracks cleared loan records in localStorage */
let _clearedLoanIds = new Set();
try {
  const saved = localStorage.getItem('afterword_cleared_loans');
  if (saved) _clearedLoanIds = new Set(JSON.parse(saved));
} catch (e) {}

function _saveClearedLoans() {
  try {
    localStorage.setItem('afterword_cleared_loans', JSON.stringify([..._clearedLoanIds]));
  } catch (e) {}
}

let _loanSubfilter = 'all';
let _cachedUserLoans = [];

function renderUserLoans(loans) {
  const container = document.getElementById('profile-loans-container');
  if (!container) return;

  if (loans) _cachedUserLoans = loans;
  const rawLoans = _cachedUserLoans || [];

  // Filter out cleared loans
  let visibleLoans = rawLoans.filter(l => {
    const id1 = l.loan_id !== undefined && l.loan_id !== null ? String(l.loan_id) : null;
    const id2 = l.id !== undefined && l.id !== null ? String(l.id) : null;
    return (!id1 || !_clearedLoanIds.has(id1)) && (!id2 || !_clearedLoanIds.has(id2));
  });

  // Filter by subfilter pill
  if (_loanSubfilter === 'active') {
    visibleLoans = visibleLoans.filter(l => l.status === 'Borrowed' || l.status === 'Requested' || l.status === 'Overdue');
  } else if (_loanSubfilter === 'history') {
    visibleLoans = visibleLoans.filter(l => l.status === 'Returned' || l.status === 'Cancelled' || l.status === 'Rejected');
  }

  if (visibleLoans.length === 0) {
    const emptyMsg = _loanSubfilter === 'history' 
      ? 'No returned or past loan history recorded.' 
      : (_loanSubfilter === 'active' ? 'No active book loans currently checked out.' : 'No book loans found under your profile.');

    container.innerHTML = `
      <div class="card p-xl text-center" style="grid-column: 1 / -1;">
        <span class="material-symbols-outlined text-muted" style="font-size: 48px; margin-bottom: 8px;">auto_stories</span>
        <h4 class="font-serif text-lg font-bold mb-xs">No Loans Found</h4>
        <p class="text-sm text-muted mb-md">${emptyMsg}</p>
        <a href="library.html" class="btn btn-primary btn-sm">Explore Bookshelf</a>
      </div>
    `;
    return;
  }

  container.innerHTML = visibleLoans.map(loan => {
    const book = loan.books || {};
    const isOverdue = loan.status === 'Overdue';
    const isReturned = loan.status === 'Returned';
    const isRequested = loan.status === 'Requested';
    const isCancelled = loan.status === 'Cancelled';
    const isBorrowed = loan.status === 'Borrowed';
    const dueDateStr = loan.due_date ? new Date(loan.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';

    // Calculate days remaining
    let daysLeft = null;
    let daysLeftBadge = '';
    if (loan.due_date && (isBorrowed || isOverdue)) {
      const now = new Date();
      const dueDate = new Date(loan.due_date);
      daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      if (daysLeft <= 0) {
        daysLeftBadge = `<span class="days-left-badge danger">OVERDUE ${Math.abs(daysLeft)}d</span>`;
      } else if (daysLeft <= 3) {
        daysLeftBadge = `<span class="days-left-badge warning">${daysLeft} day${daysLeft !== 1 ? 's' : ''} left</span>`;
      } else {
        daysLeftBadge = `<span class="days-left-badge good">${daysLeft} days left</span>`;
      }
    }

    // Status chip styling
    let statusChipClass = 'chip-coffee';
    let statusLabel = loan.status;
    if (isRequested) {
      statusChipClass = 'chip-terracotta';
      statusLabel = '⏳ Pending Approval';
    } else if (isCancelled) {
      statusChipClass = 'chip-terracotta';
      statusLabel = '✕ Borrow Denied';
    } else if (isReturned) {
      statusChipClass = 'chip-olive';
      statusLabel = '✓ Returned';
    } else if (isOverdue) {
      statusChipClass = 'chip-terracotta';
      statusLabel = '⚠️ Overdue';
    } else if (isBorrowed) {
      statusChipClass = 'chip-coffee';
      statusLabel = '📚 Borrowed';
    }

    return `
      <div class="card p-lg flex-row gap-md items-start loan-book-card" style="${isReturned || isCancelled ? 'opacity: 0.75;' : ''}">
        <div class="loan-book-thumb" style="width: 58px; height: 82px; background: #e5dfd5; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.08);">
          <span class="material-symbols-outlined text-primary" style="font-size: 26px;">book</span>
          <span style="font-size: 0.6rem; font-weight: 700; color: #a65f45; text-transform: uppercase;">BOOK</span>
        </div>
        
        <div class="flex-1">
          <div class="flex-row items-center gap-xs mb-xs flex-wrap">
            <span class="chip ${statusChipClass} text-xs">${statusLabel}</span>
            ${daysLeftBadge}
          </div>
          <h4 class="font-serif font-bold text-base text-primary mb-xs">${book.title || 'Selected Book'}</h4>
          <p class="text-xs text-muted mb-xs">By ${book.author || 'Catalog Author'}</p>
          <p class="text-xs font-mono text-secondary mb-sm">
            ${book.shelf_location ? `📍 ${book.shelf_location}` : 'Café Circulation Shelf'}
          </p>

          ${isBorrowed || isOverdue ? `
            <div class="due-indicator ${isOverdue || (daysLeft !== null && daysLeft <= 3) ? 'soon' : 'good'} mb-md">
              <span class="material-symbols-outlined icon-14">schedule</span>
              <span>Due Date: ${dueDateStr}${daysLeft !== null ? ` (${daysLeft <= 0 ? 'OVERDUE' : daysLeft + ' days remaining'})` : ''}</span>
            </div>
          ` : ''}

          ${isRequested ? `
            <div class="due-indicator mb-md" style="color: var(--text-muted);">
              <span class="material-symbols-outlined icon-14">hourglass_top</span>
              <span>Awaiting staff approval. You'll be notified once approved.</span>
            </div>
          ` : ''}

          ${isCancelled ? `
            <div class="due-indicator mb-md" style="color: #e74c3c;">
              <span class="material-symbols-outlined icon-14">block</span>
              <span>This borrow request was denied by staff.</span>
            </div>
          ` : ''}

          ${isBorrowed || isOverdue ? `
            <div class="flex-row gap-xs flex-wrap">
              <button class="btn btn-outline btn-xs" data-action="renew-loan" data-loan-id="${loan.loan_id}" data-book-title="${book.title}">
                Renew (+14 Days)
              </button>
              <button class="btn btn-text btn-xs text-secondary" data-action="return-loan" data-loan-id="${loan.loan_id}" data-book-title="${book.title}">
                Return
              </button>
            </div>
          ` : ''}

          <div class="flex-row items-center gap-xs mt-xs flex-wrap">
            <span class="text-xs text-muted">${isReturned ? 'Returned to circulation shelf' : (isCancelled ? 'Request denied' : (isRequested ? 'Awaiting staff approval' : 'Active loan'))}</span>
            <button class="btn btn-outline btn-xs text-muted" data-action="clear-loan" data-loan-id="${loan.loan_id}" style="padding: 3px 10px; font-size: 0.75rem; border-color: rgba(0,0,0,0.18);" title="Clear from loan profile history">
              Clear ✕
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Re-attach event listeners
  initProfileActions();
}

function renderUserOrders(orders) {
  const tbody = document.getElementById('profile-orders-table-body');
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center p-lg text-muted">
          No table orders recorded yet. Visit the <a href="cafe.html" class="text-primary font-semibold">Café Menu</a> to place your first order!
        </td>
      </tr>
    `;
    return;
  }

  // Insert a ready-order banner at the top of the orders section
  const readyOrders = orders.filter(o => o.status === 'Ready');
  const profileOrdersSection = tbody.closest('.profile-view-pane');
  
  // Remove any existing banners first
  if (profileOrdersSection) {
    profileOrdersSection.querySelectorAll('.order-ready-banner').forEach(b => b.remove());

    for (const readyOrder of readyOrders) {
      const items = (readyOrder.order_items || []).map(oi => oi.products?.name || 'Item').join(', ');
      const catTypes = (readyOrder.order_items || []).map(oi => (oi.products?.categories?.type || '').toLowerCase()).join(' ');
      const isFlower = catTypes.includes('flower') || catTypes.includes('botanical');

      const banner = document.createElement('div');
      banner.className = `order-ready-banner ${isFlower ? 'flower-ready' : ''}`;
      banner.innerHTML = `
        <span class="material-symbols-outlined">${isFlower ? 'local_florist' : 'restaurant'}</span>
        <span>${isFlower ? '🌸 Your flowers are ready!' : '☕ Your order is ready!'} — ${items} (${readyOrder.order_number || '#' + readyOrder.order_id})</span>
      `;
      
      const tableEl = profileOrdersSection.querySelector('table, .profile-orders-table');
      if (tableEl) {
        profileOrdersSection.insertBefore(banner, tableEl);
      }
    }
  }

  tbody.innerHTML = orders.map(order => {
    const itemsText = (order.order_items || [])
      .map(item => `${item.quantity}x ${item.products?.name || 'Item'}`)
      .join(', ') || 'In-Seat Beverage & Food';
    const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    let statusChipClass = 'chip-coffee';
    let statusIcon = '';
    if (order.status === 'Completed') { statusChipClass = 'chip-olive'; statusIcon = '✓ '; }
    if (order.status === 'Preparing') { statusChipClass = 'chip-terracotta'; statusIcon = '🍳 '; }
    if (order.status === 'Ready') { statusChipClass = 'chip-olive'; statusIcon = '🔔 '; }
    if (order.status === 'Pending') { statusIcon = '⏳ '; }
    if (order.status === 'Cancelled') { statusChipClass = 'chip-terracotta'; statusIcon = '✕ '; }

    return `
      <tr${order.status === 'Ready' ? ' style="background: rgba(46, 204, 113, 0.06);"' : ''}>
        <td class="font-mono font-semibold">${order.order_number || `#ORD-${order.order_id}`}</td>
        <td>${itemsText}</td>
        <td>${order.table_number ? `Table #${order.table_number}` : 'Counter Pickup'}</td>
        <td class="text-xs text-muted">${dateStr}</td>
        <td class="font-mono font-bold">$${Number(order.total).toFixed(2)}</td>
        <td><span class="chip ${statusChipClass} text-xs">${statusIcon}${order.status}</span></td>
      </tr>
    `;
  }).join('');
}

function renderUserRsvps(rsvps) {
  const container = document.getElementById('profile-rsvps-container');
  if (!container) return;

  if (!rsvps || rsvps.length === 0) {
    container.innerHTML = `
      <div class="card p-xl text-center" style="grid-column: 1 / -1;">
        <span class="material-symbols-outlined text-muted" style="font-size: 48px; margin-bottom: 8px;">event</span>
        <h4 class="font-serif text-lg font-bold mb-xs">No Upcoming RSVPs</h4>
        <p class="text-sm text-muted mb-md">You haven't registered for any upcoming community salons or events.</p>
        <a href="events.html" class="btn btn-outline btn-sm">Explore Community Events</a>
      </div>
    `;
    return;
  }

  container.innerHTML = rsvps.map(rsvp => {
    const ev = rsvp.events || {};
    const dateStr = ev.event_date ? new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled Event';

    return `
      <div class="card p-lg rsvp-event-card">
        <div class="flex-row justify-between items-start mb-xs">
          <span class="chip chip-olive text-xs">${rsvp.status}</span>
          <span class="text-xs font-mono text-muted">${rsvp.guest_count} Guest(s)</span>
        </div>
        <h4 class="font-serif font-bold text-base text-primary mb-xs">${ev.title || 'Community Event'}</h4>
        <p class="text-xs text-muted mb-sm">🗓️ ${dateStr} at ${ev.event_time || '7:00 PM'} · 📍 ${ev.location || 'North Square'}</p>
        <button class="btn btn-text btn-xs text-secondary" data-action="cancel-rsvp" data-rsvp-id="${rsvp.rsvp_id}">
          Cancel Reservation
        </button>
      </div>
    `;
  }).join('');
}

/**
 * Handles tabbed navigation between Loans, Orders, RSVPs, and Settings.
 */
function initProfileTabs() {
  const tabBtns = document.querySelectorAll('.profile-tab-btn');
  const viewPanes = document.querySelectorAll('.profile-view-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-target-view');
      if (!targetView) return;

      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      viewPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === targetView) {
          pane.classList.add('active');
        }
      });
    });
  });
}

/**
 * Configures interactive actions on the profile dashboard:
 * - Renew book loans
 * - Re-order items
 * - Cancel workshop RSVPs
 * - Save profile settings
 * - Sign out
 */
function initProfileActions() {
  // 1. Sign Out Button
  const logoutBtn = document.getElementById('profile-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof showToast === 'function') {
        showToast('Signed out. Have a wonderful day!', 'waving_hand');
      }
      localStorage.removeItem('afterword_user');
      setTimeout(() => {
        window.location.href = '../../login.html';
      }, 700);
    });
  }

  // Clear single loan from profile history
  document.querySelectorAll('[data-action="clear-loan"]').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const loanId = btn.getAttribute('data-loan-id');
      if (loanId) {
        _clearedLoanIds.add(String(loanId));
        _saveClearedLoans();
        try {
          await fetch(`/api/loans/${loanId}`, { method: 'DELETE' });
        } catch (err) {
          console.warn('Backend clear single loan notice:', err);
        }
        renderUserLoans(_cachedUserLoans);
        if (typeof showToast === 'function') {
          showToast('Cleared record from loan history.', 'delete_outline');
        }
      }
    };
  });

  // Clear history button (Clear all past / returned / cancelled loans)
  const clearHistoryBtn = document.getElementById('btn-clear-returned-loans');
  if (clearHistoryBtn) {
    clearHistoryBtn.onclick = async () => {
      const rawLoans = _cachedUserLoans || [];
      if (rawLoans.length === 0) {
        if (typeof showToast === 'function') showToast('No loan records to clear.', 'info');
        return;
      }

      const pastLoans = rawLoans.filter(l => {
        const st = (l.status || '').toLowerCase();
        return st === 'returned' || st === 'cancelled' || st === 'rejected';
      });

      const targetList = pastLoans.length > 0 ? pastLoans : rawLoans;

      targetList.forEach(l => {
        if (l.loan_id !== undefined && l.loan_id !== null) _clearedLoanIds.add(String(l.loan_id));
        if (l.id !== undefined && l.id !== null) _clearedLoanIds.add(String(l.id));
      });
      _saveClearedLoans();

      try {
        let user = typeof getLoggedInUser === 'function' ? getLoggedInUser() : null;
        if (!user) {
          try {
            const raw = localStorage.getItem('afterword_user');
            if (raw) user = JSON.parse(raw);
          } catch (err) {}
        }
        const uId = user ? user.id : null;
        await fetch(`/api/loans/clear-history${uId ? `?user_id=${uId}` : ''}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Backend clear history notice:', err);
      }

      renderUserLoans(_cachedUserLoans);
      if (typeof showToast === 'function') {
        showToast(`Cleared ${targetList.length} loan record(s) from history.`, 'cleaning_services');
      }
    };
  }

  // Loan sub-filter tabs (All / Active / History)
  const subfilterPills = document.querySelectorAll('#loan-subfilter-pills .pill-tab-btn');
  subfilterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      subfilterPills.forEach(p => {
        p.classList.remove('active');
        p.style.background = 'var(--bg-card, #fff)';
        p.style.color = 'inherit';
      });
      pill.classList.add('active');
      pill.style.background = 'var(--primary, #1c2b26)';
      pill.style.color = '#fff';

      _loanSubfilter = pill.getAttribute('data-subfilter') || 'all';
      renderUserLoans(_cachedUserLoans);
    });
  });

  // 2. Renew Loan Buttons
  document.querySelectorAll('[data-action="renew-loan"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const bookTitle = btn.getAttribute('data-book-title') || 'Book';
      const loanId = btn.getAttribute('data-loan-id');
      const indicator = btn.closest('.loan-book-card')?.querySelector('.due-indicator');
      
      btn.disabled = true;
      btn.textContent = 'Renewed ✓';
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-secondary');

      if (indicator) {
        indicator.innerHTML = '<span class="material-symbols-outlined icon-14">check_circle</span> Renewed (+14 Days)';
        indicator.classList.remove('soon');
        indicator.classList.add('good');
      }

      if (loanId) {
        try {
          await fetch(`/api/loans/${loanId}/renew`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ days: 14 })
          });
        } catch (e) {
          console.log('Renew API fallback:', e.message);
        }
      }

      if (typeof showToast === 'function') {
        showToast(`Loan renewed for "${bookTitle}" (+14 Days)`, 'bookmark_added');
      }
    });
  });

  // 3. Return Book Buttons
  document.querySelectorAll('[data-action="return-loan"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const bookCard = btn.closest('.loan-book-card');
      const bookTitle = btn.getAttribute('data-book-title') || 'Book';
      const loanId = btn.getAttribute('data-loan-id');

      if (bookCard) {
        bookCard.style.opacity = '0.5';
        btn.disabled = true;
        btn.textContent = 'Returned ✓';
      }

      if (loanId) {
        try {
          await fetch(`/api/loans/${loanId}/return`, { method: 'POST' });
        } catch (e) {
          console.log('Return API fallback:', e.message);
        }
      }

      if (typeof showToast === 'function') {
        showToast(`"${bookTitle}" marked as returned! Drop it off at the return cart.`, 'inventory');
      }
    });
  });

  // 4. Re-order Button
  document.querySelectorAll('[data-action="reorder-tray"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemsString = btn.getAttribute('data-items') || 'Americano';
      if (typeof showToast === 'function') {
        showToast(`Re-added ${itemsString} to your tray!`, 'shopping_bag');
      }
      if (typeof openCart === 'function') {
        setTimeout(openCart, 400);
      }
    });
  });

  // 5. Cancel RSVP Button
  document.querySelectorAll('[data-action="cancel-rsvp"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.rsvp-event-card');
      if (card) {
        card.style.opacity = '0.4';
        btn.disabled = true;
        btn.textContent = 'Cancelled';
      }
      if (typeof showToast === 'function') {
        showToast('RSVP reservation cancelled.', 'info');
      }
    });
  });

  // 6. Settings Form Submit
  const settingsForm = document.getElementById('profile-settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const updatedName = document.getElementById('settings-name')?.value.trim();
      const updatedEmail = document.getElementById('settings-email')?.value.trim();
      const updatedTable = document.getElementById('settings-table')?.value.trim();
      const updatedDrink = document.getElementById('settings-drink')?.value.trim();

      if (!updatedName || !updatedEmail) {
        if (typeof showToast === 'function') {
          showToast('Name and email cannot be empty.', 'error');
        }
        return;
      }

      let user = {};
      try {
        const raw = localStorage.getItem('afterword_user');
        if (raw) user = JSON.parse(raw);
      } catch (err) {}

      user.name = updatedName;
      user.email = updatedEmail;
      user.preferredTable = updatedTable;
      user.favoriteBeverage = updatedDrink;

      localStorage.setItem('afterword_user', JSON.stringify(user));
      initUserProfile();

      if (typeof showToast === 'function') {
        showToast('Patron preferences updated successfully!', 'check_circle');
      }
    });
  }
}
