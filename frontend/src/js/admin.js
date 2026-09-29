/**
 * AFTERWORD — ADMIN CONSOLE JAVASCRIPT
 * Desktop-first management controller for Orders, Café, Flowers, Library, Events, Customers & Analytics.
 */

// ---------------------------------------------------------------------------
// Data Stores — Populated from Supabase via backend API
// ---------------------------------------------------------------------------

let adminOrders = [];
let cafeInventory = [];
let flowerInventory = [];
let libraryCatalog = [];
let eventsProgram = [];
let patronCustomers = [];
let activeLoans = [];

// ---------------------------------------------------------------------------
// Image URL Normalizer for Admin Console (frontend/src/pages/admin.html)
// ---------------------------------------------------------------------------

/**
 * Normalizes image paths so they resolve correctly when rendered inside src/pages/admin.html.
 * Converts 'assets/images/...' to '../../assets/images/...' and provides category fallbacks.
 */
function formatAdminImageUrl(url, type = 'cafe') {
  const fallbacks = {
    cafe: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80',
    flowers: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=300&q=80',
    books: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80',
    events: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=300&q=80'
  };

  const defaultImg = fallbacks[type] || fallbacks.cafe;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return defaultImg;
  }

  const clean = url.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
    return clean;
  }
  if (clean.startsWith('../../')) {
    return clean;
  }
  if (clean.startsWith('../')) {
    return '../' + clean;
  }
  if (clean.startsWith('/')) {
    return '../..' + clean;
  }
  if (clean.startsWith('assets/')) {
    return '../../' + clean;
  }
  return '../../assets/images/' + clean;
}

// ---------------------------------------------------------------------------
// API Data Loaders — Fetch real data from Supabase via backend
// ---------------------------------------------------------------------------

async function loadCafeFromBackend() {
  try {
    const products = await window.AfterwordAPI.getProducts('cafe');
    if (Array.isArray(products) && products.length > 0) {
      cafeInventory = products.map(p => ({
        id: String(p.product_id),
        name: p.name,
        category: p.categories?.name || 'Coffee',
        price: Number(p.price),
        stock: p.stock || 0,
        maxStock: (p.stock || 0) * 2 || 50,
        available: p.is_available,
        image: formatAdminImageUrl(p.image_url, 'cafe')
      }));
    }
  } catch (err) {
    console.warn('Could not load café products:', err);
  }
  renderCafeTable();
  renderDynamicDashboard();
}

async function loadFlowersFromBackend() {
  try {
    const products = await window.AfterwordAPI.getProducts('flowers');
    if (Array.isArray(products) && products.length > 0) {
      flowerInventory = products.map(p => ({
        id: String(p.product_id),
        name: p.name,
        category: p.categories?.name || 'Botanicals',
        price: Number(p.price),
        stock: p.stock || 0,
        maxStock: (p.stock || 0) * 2 || 20,
        available: p.is_available,
        image: formatAdminImageUrl(p.image_url, 'flowers')
      }));
    }
  } catch (err) {
    console.warn('Could not load flower products:', err);
  }
  renderFlowersTable();
  renderDynamicDashboard();
}

async function loadLibraryFromBackend() {
  try {
    const books = await window.AfterwordAPI.getBooks();
    if (Array.isArray(books) && books.length > 0) {
      libraryCatalog = books.map(b => ({
        id: String(b.book_id),
        title: b.title,
        author: b.author,
        category: b.categories?.name || 'General',
        shelf: b.shelf_location || 'Shelf A-01',
        totalCopies: b.total_copies || 1,
        borrowedCopies: (b.total_copies || 1) - (b.available_copies || 0),
        cover: formatAdminImageUrl(b.image_url, 'books'),
        reservations: []
      }));
    }
  } catch (err) {
    console.warn('Could not load library books:', err);
  }
  renderLibraryTable();
  renderDynamicDashboard();
}

async function loadEventsFromBackend() {
  try {
    const events = await window.AfterwordAPI.getEvents();
    if (Array.isArray(events) && events.length > 0) {
      eventsProgram = events.map(ev => ({
        id: String(ev.event_id),
        name: ev.title,
        date: new Date(ev.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        time: ev.event_time ? ev.event_time.slice(0, 5) : '',
        category: ev.categories?.name || 'Gathering',
        capacity: ev.capacity,
        registered: 0,
        status: ev.status === 'Scheduled' ? 'open' : ev.status?.toLowerCase(),
        image: formatAdminImageUrl(ev.image_url || '', 'events')
      }));
    }
  } catch (err) {
    console.warn('Could not load events:', err);
  }
  renderEventsTable();
  renderDynamicDashboard();
}

async function loadLoansFromBackend() {
  try {
    const loans = await window.AfterwordAPI.getLoans();
    if (Array.isArray(loans) && loans.length > 0) {
      activeLoans = loans.map(l => ({
        id: String(l.loan_id),
        patronName: l.profiles?.full_name || 'Unknown Patron',
        patronCard: l.profiles?.patron_code || '#MEM-000',
        bookTitle: l.books?.title || 'Unknown Book',
        bookId: String(l.book_id),
        shelf: l.books?.shelf_location || '',
        borrowedDate: new Date(l.borrowed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        dueDate: new Date(l.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: (l.status || 'Borrowed').toLowerCase(),
        notes: l.returned_at ? `Returned ${new Date(l.returned_at).toLocaleDateString()}` : 'Active loan'
      }));
    }
  } catch (err) {
    console.warn('Could not load loans:', err);
  }
  renderLoansTable();
  renderDynamicDashboard();
}

async function loadCustomersFromBackend() {
  try {
    const profiles = await window.AfterwordAPI.getProfiles();
    if (Array.isArray(profiles) && profiles.length > 0) {
      patronCustomers = profiles.map(p => ({
        id: p.id,
        name: p.full_name || 'Patron',
        cardId: p.patron_code || '#MEM-000',
        tier: p.role === 'admin' ? 'Staff Admin' : 'Community Patron',
        activeLoans: 0,
        totalSpent: 0,
        lastVisit: new Date(p.updated_at || p.created_at).toLocaleDateString()
      }));
    }
  } catch (err) {
    console.warn('Could not load profiles:', err);
  }
  renderCustomersTable();
}

// ---------------------------------------------------------------------------
// Main Initialization & Routing
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  initTopbarClock();
  initAdminNavigation();
  initMobileSidebar();
  initDashboardController();
  initOrdersSection();
  initCafeSection();
  initFlowersSection();
  initLibrarySection();
  initDonationsSection();
  initEventsSection();
  initCustomersSection();
  initModalsController();
  initGlobalSearch();
});

/**
 * Updates topbar live timestamp and date every minute.
 */
function initTopbarClock() {
  const timeEl = document.getElementById('admin-live-time');
  if (!timeEl) return;

  const update = () => {
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    timeEl.textContent = now.toLocaleDateString('en-US', options);
  };
  update();
  setInterval(update, 60000);
}

/**
 * Handles sidebar view navigation without full page reloads.
 * Toggles active view panels and updates the topbar title.
 */
function initAdminNavigation() {
  const navBtns = document.querySelectorAll('.admin-nav-btn');
  const viewPanels = document.querySelectorAll('.admin-view');
  const topbarTitle = document.getElementById('topbar-view-title');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      if (!targetView) return;

      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      viewPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `view-${targetView}`) {
          panel.classList.add('active');
        }
      });

      if (topbarTitle) {
        const titleText = btn.querySelector('.nav-label')?.textContent || 'Dashboard';
        topbarTitle.textContent = titleText;
      }

      // Close mobile sidebar if open
      const sidebar = document.querySelector('.admin-sidebar');
      if (sidebar && window.innerWidth <= 992) {
        sidebar.classList.remove('open');
      }
    });
  });
}

/**
 * Configures mobile off-canvas drawer toggle button.
 */
function initMobileSidebar() {
  const toggleBtn = document.querySelector('.mobile-sidebar-toggle');
  const sidebar = document.querySelector('.admin-sidebar');

  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  // Close sidebar on outside click on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 992 && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Real-Time Dynamic Dashboard Subsystem
// ---------------------------------------------------------------------------

let currentDashPeriod = 'all'; // 'today' | 'week' | 'all' | 'custom'
let customDashDate = '';

function initDashboardController() {
  const periodBtns = document.querySelectorAll('.dash-period-btn');
  const dateInput = document.getElementById('dash-custom-date');
  const periodLabel = document.getElementById('dash-period-label');

  periodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      periodBtns.forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline');
      });
      btn.classList.add('active', 'btn-primary');
      btn.classList.remove('btn-outline');

      currentDashPeriod = btn.getAttribute('data-period') || 'all';
      if (dateInput) dateInput.value = '';

      if (periodLabel) {
        if (currentDashPeriod === 'today') periodLabel.textContent = "(Today's Live Sales)";
        else if (currentDashPeriod === 'week') periodLabel.textContent = '(Past 7 Days)';
        else periodLabel.textContent = '(All Time History)';
      }

      renderDynamicDashboard();
    });
  });

  if (dateInput) {
    dateInput.addEventListener('change', (e) => {
      if (!e.target.value) return;
      customDashDate = e.target.value;
      currentDashPeriod = 'custom';

      periodBtns.forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline');
      });

      if (periodLabel) {
        periodLabel.textContent = `(Date: ${customDashDate})`;
      }

      renderDynamicDashboard();
    });
  }
}

function renderDynamicDashboard() {
  const revValEl = document.getElementById('dash-revenue-val');
  if (!revValEl) return;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - (7 * 24 * 60 * 60 * 1000);

  // 1. Filter Orders by Selected Time Period
  const filteredOrders = adminOrders.filter(o => {
    if (o.status === 'cancelled') return false;
    const ts = o.timestamp || (o.created_at ? new Date(o.created_at).getTime() : 0);

    if (currentDashPeriod === 'today') {
      return ts >= startOfToday;
    } else if (currentDashPeriod === 'week') {
      return ts >= startOfWeek;
    } else if (currentDashPeriod === 'custom' && customDashDate) {
      const orderDateStr = new Date(ts).toISOString().split('T')[0];
      return orderDateStr === customDashDate;
    }
    return true; // 'all'
  });

  // Calculate Revenue & Orders Stats
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalOrdersCount = filteredOrders.length;
  const aov = totalOrdersCount > 0 ? (totalRevenue / totalOrdersCount) : 0;

  // Calculate Loans Stats
  const activeLoansCount = activeLoans.filter(l => (l.status || '').toLowerCase() === 'borrowed').length;
  const pendingHoldsCount = activeLoans.filter(l => (l.status || '').toLowerCase() === 'requested').length;
  const overdueLoansCount = activeLoans.filter(l => (l.status || '').toLowerCase() === 'overdue').length;

  // Calculate Events Stats
  const openEventsCount = eventsProgram.filter(e => e.status === 'open').length;
  const totalRSVPs = eventsProgram.reduce((sum, e) => sum + (e.registered || 0), 0);

  // Calculate Seating Status & Map
  const activeSeatedOrders = adminOrders.filter(o => {
    return o.type && o.type.includes('In-Seat') && o.status !== 'completed' && o.status !== 'cancelled';
  });

  const tableStatusMap = {};
  activeSeatedOrders.forEach(o => {
    const match = (o.notes || '').match(/Table\s*#?(\d+)/i) || (o.customerType || '').match(/Table\s*#?(\d+)/i);
    if (match && match[1]) {
      const tNum = parseInt(match[1]);
      tableStatusMap[tNum] = o;
    }
  });

  let occupiedTablesCount = Object.keys(tableStatusMap).length;
  const totalTables = 12;
  const seatingOccupancyPct = Math.round((occupiedTablesCount / totalTables) * 100);

  // Low Stock & Attention Items
  const lowStockProducts = [...cafeInventory, ...flowerInventory].filter(p => p.stock !== undefined && p.stock <= 5);
  const outOfStockBooks = libraryCatalog.filter(b => b.borrowedCopies !== undefined && (b.totalCopies - b.borrowedCopies) <= 0);

  // Update Summary Metric Cards
  document.getElementById('dash-revenue-val').textContent = `₱${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('dash-revenue-sub').textContent = `AOV: ₱${aov.toFixed(2)}`;

  document.getElementById('dash-orders-val').textContent = totalOrdersCount;
  document.getElementById('dash-orders-sub').textContent = `${filteredOrders.filter(o => o.status === 'completed').length} completed`;

  document.getElementById('dash-loans-val').textContent = activeLoansCount;
  document.getElementById('dash-loans-trend').textContent = `${pendingHoldsCount} pending`;
  document.getElementById('dash-loans-sub').textContent = `${overdueLoansCount} overdue`;

  document.getElementById('dash-events-val').textContent = totalRSVPs;
  document.getElementById('dash-events-trend').textContent = `${openEventsCount} open events`;

  document.getElementById('dash-seating-val').textContent = `${seatingOccupancyPct}%`;
  document.getElementById('dash-seating-trend').textContent = `${occupiedTablesCount} / ${totalTables} tables`;
  document.getElementById('dash-seating-sub').textContent = `${lowStockProducts.length} low stock alerts`;

  // Render Seating Widget (T-01 to T-12)
  const seatingWidget = document.getElementById('seating-widget-container');
  if (seatingWidget) {
    let seatingHTML = '';
    for (let i = 1; i <= 12; i++) {
      const activeOrd = tableStatusMap[i];
      const isOccupied = !!activeOrd;
      const tId = `T-${i < 10 ? '0' + i : i}`;

      let label = isOccupied ? `${activeOrd.customer || 'Guest'} · ₱${activeOrd.total.toFixed(2)}` : 'Available';

      seatingHTML += `
        <div class="table-slot ${isOccupied ? 'occupied' : 'available'}" title="${isOccupied ? 'Active order: ' + activeOrd.items : 'Table available'}">
          <span class="table-slot-id">${tId}</span>
          <span class="table-slot-status">${label}</span>
        </div>
      `;
    }
    seatingWidget.innerHTML = seatingHTML;
  }

  // Calculate Revenue by Department Breakdown
  let cafeRev = 0, foodRev = 0, flowerRev = 0, bookRev = 0;
  filteredOrders.forEach(o => {
    const tot = Number(o.total) || 0;
    if (o.dept === 'flowers') flowerRev += tot;
    else if (o.dept === 'library') bookRev += tot;
    else {
      if ((o.items || '').toLowerCase().match(/croissant|focaccia|knot|pastry|food|sandwich|cake/)) {
        foodRev += tot;
      } else {
        cafeRev += tot;
      }
    }
  });

  const grandTotal = (cafeRev + foodRev + flowerRev + bookRev) || 1;
  const cafePct = Math.round((cafeRev / grandTotal) * 100);
  const foodPct = Math.round((foodRev / grandTotal) * 100);
  const flowerPct = Math.round((flowerRev / grandTotal) * 100);
  const bookPct = Math.round((bookRev / grandTotal) * 100);

  const setDeptBar = (idTxt, idBar, val, pct) => {
    const txtEl = document.getElementById(idTxt);
    const barEl = document.getElementById(idBar);
    if (txtEl) txtEl.textContent = `₱${val.toFixed(2)} (${pct}%)`;
    if (barEl) barEl.style.width = `${pct}%`;
  };

  setDeptBar('dash-dept-cafe-txt', 'dash-dept-cafe-bar', cafeRev, cafePct);
  setDeptBar('dash-dept-food-txt', 'dash-dept-food-bar', foodRev, foodPct);
  setDeptBar('dash-dept-flower-txt', 'dash-dept-flower-bar', flowerRev, flowerPct);
  setDeptBar('dash-dept-book-txt', 'dash-dept-book-bar', bookRev, bookPct);

  // Render Operational Attention Items
  const attentionContainer = document.getElementById('dash-attention-container');
  const attentionBadge = document.getElementById('dash-attention-badge');

  if (attentionContainer) {
    const alerts = [];

    lowStockProducts.forEach(p => {
      alerts.push({
        icon: 'inventory_2',
        colorClass: 'text-secondary',
        title: `Low Stock: ${p.name}`,
        sub: `Only ${p.stock} remaining in ${p.category || 'inventory'}.`,
        actionText: 'Inspect',
        view: p.category === 'Botanicals' || p.category === 'Flowers' ? 'flowers' : 'cafe'
      });
    });

    outOfStockBooks.forEach(b => {
      alerts.push({
        icon: 'auto_stories',
        colorClass: 'text-tertiary',
        title: `All Copies Borrowed: ${b.title}`,
        sub: `0 of ${b.totalCopies} copies currently available on shelf.`,
        actionText: 'View Library',
        view: 'library'
      });
    });

    const pendingLoans = activeLoans.filter(l => (l.status || '').toLowerCase() === 'requested');
    pendingLoans.forEach(l => {
      alerts.push({
        icon: 'hourglass_top',
        colorClass: 'text-secondary',
        title: `Pending Borrow: "${l.bookTitle}"`,
        sub: `Requested by ${l.patronName}. Awaiting staff review.`,
        actionText: 'Loans',
        view: 'loans'
      });
    });

    const overdueLoans = activeLoans.filter(l => (l.status || '').toLowerCase() === 'overdue');
    overdueLoans.forEach(l => {
      alerts.push({
        icon: 'warning',
        colorClass: 'text-terracotta',
        title: `OVERDUE: "${l.bookTitle}"`,
        sub: `Borrowed by ${l.patronName}. Due ${l.dueDate}.`,
        actionText: 'Contact',
        view: 'loans'
      });
    });

    if (attentionBadge) {
      attentionBadge.textContent = `${alerts.length} ATTENTION`;
      attentionBadge.className = `chip ${alerts.length > 0 ? 'chip-terracotta' : 'chip-olive'}`;
    }

    if (alerts.length === 0) {
      attentionContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #888;">
          <span class="material-symbols-outlined" style="font-size: 32px; color: #4caf50;">check_circle</span>
          <p style="margin-top: 6px; font-size: 0.85rem;">All operational status clear! No attention items right now.</p>
        </div>
      `;
    } else {
      attentionContainer.innerHTML = alerts.slice(0, 5).map(a => `
        <div class="admin-alert-row" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid rgba(0,0,0,0.05);">
          <div class="flex-row items-center gap-xs">
            <span class="material-symbols-outlined ${a.colorClass}">${a.icon}</span>
            <div>
              <strong class="text-sm text-primary">${a.title}</strong>
              <div class="text-xs text-muted">${a.sub}</div>
            </div>
          </div>
          <button class="btn btn-outline btn-sm dash-nav-alert-btn" data-target-view="${a.view}">${a.actionText}</button>
        </div>
      `).join('');

      attentionContainer.querySelectorAll('.dash-nav-alert-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = btn.getAttribute('data-target-view');
          if (target) {
            const navBtn = document.querySelector(`.admin-nav-btn[data-view="${target}"]`);
            if (navBtn) navBtn.click();
          }
        });
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Orders Management Subsystem
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Orders Management Subsystem & Real-Time Auto-Polling
// ---------------------------------------------------------------------------

let activeOrderFilter = 'all';
let activeDeptFilter = 'all';
let isFirstOrderLoad = true;
let previousOrderIds = new Set();

/**
 * Synthesizes a subtle, pleasant two-tone kitchen chime using Web Audio API.
 * Requires no external audio files.
 */
function playKitchenChimeSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now + 0.12); // E6
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 1.0);
  } catch (e) {
    // Web Audio auto-play may be suppressed prior to user interaction
  }
}

/**
 * Initializes orders table rendering, status pill filters, and auto-polling loops.
 */
function initOrdersSection() {
  loadLiveOrdersFromBackend();
  
  // 1. High-frequency live order polling (every 3 seconds for kitchen dispatch)
  setInterval(loadLiveOrdersFromBackend, 3000);

  // 2. Secondary background polling for stock, holds, and events (every 10 seconds)
  setInterval(() => {
    loadCafeFromBackend();
    loadFlowersFromBackend();
    loadLibraryFromBackend();
    loadLoansFromBackend();
    loadEventsFromBackend();
  }, 10000);

  // Department Filter Pills (Café, Library/Books, Flowers)
  const deptPills = document.querySelectorAll('#orders-dept-pills .pill-tab-btn');
  deptPills.forEach(pill => {
    pill.addEventListener('click', () => {
      deptPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeDeptFilter = pill.getAttribute('data-dept') || 'all';
      renderOrdersTable();
    });
  });

  // Status Filter Pills
  const filterPills = document.querySelectorAll('#orders-status-pills .pill-tab-btn');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeOrderFilter = pill.getAttribute('data-status') || 'all';
      renderOrdersTable();
    });
  });

  // Order Search Input
  const searchInput = document.getElementById('orders-table-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderOrdersTable();
    });
  }

  // Clear Completed Orders Button
  const clearCompletedBtn = document.getElementById('btn-clear-completed-orders');
  if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener('click', async () => {
      if (!confirm('Clear all completed and cancelled orders from database?')) return;
      try {
        if (window.AfterwordAPI && typeof window.AfterwordAPI.clearCompletedOrders === 'function') {
          await window.AfterwordAPI.clearCompletedOrders();
        } else {
          await fetch('/api/orders/completed', { method: 'DELETE' });
        }
        showToast('Cleared completed and cancelled orders from database!', 'delete_outline');
        await loadLiveOrdersFromBackend();
      } catch (err) {
        showToast(`Could not clear orders: ${err.message}`, 'warning');
      }
    });
  }

  // Event delegation on table for "Inspect Order", "Advance Status", and "Delete Order"
  const tableBody = document.getElementById('orders-table-body');
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      const inspectBtn = e.target.closest('[data-order-action="inspect"]');
      if (inspectBtn) {
        const orderId = inspectBtn.getAttribute('data-order-id');
        openOrderModal(orderId);
        return;
      }

      const advanceBtn = e.target.closest('[data-order-action="advance"]');
      if (advanceBtn) {
        const orderId = advanceBtn.getAttribute('data-order-id');
        advanceOrderStatus(orderId);
        return;
      }

      const deleteBtn = e.target.closest('[data-order-action="delete"]');
      if (deleteBtn) {
        const orderId = deleteBtn.getAttribute('data-order-id');
        deleteOrder(orderId);
      }
    });
  }
}

/**
 * Pulls orders from Supabase via backend API, detects new incoming orders, and refreshes UI.
 */
async function loadLiveOrdersFromBackend() {
  try {
    let dbOrders = null;
    if (window.AfterwordAPI && typeof window.AfterwordAPI.getOrders === 'function') {
      dbOrders = await window.AfterwordAPI.getOrders();
    } else {
      const res = await fetch('/api/orders');
      if (res.ok) dbOrders = await res.json();
    }

    // Ensure activeLoans is loaded
    if (!activeLoans || activeLoans.length === 0) {
      try {
        const loans = await window.AfterwordAPI.getLoans();
        if (Array.isArray(loans) && loans.length > 0) {
          activeLoans = loans.map(l => {
            const isPending = (l.status || '').toLowerCase() === 'requested' || (l.notes || '').toLowerCase().includes('pending');
            return {
              id: String(l.loan_id),
              patronName: l.profiles?.full_name || 'Unknown Patron',
              patronCard: l.profiles?.patron_code || '#MEM-000',
              bookTitle: l.books?.title || 'Unknown Book',
              bookId: String(l.book_id),
              shelf: l.books?.shelf_location || '',
              borrowedDate: new Date(l.borrowed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              dueDate: new Date(l.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              status: isPending ? 'requested' : (l.status || 'Borrowed').toLowerCase(),
              notes: l.notes || (l.returned_at ? `Returned ${new Date(l.returned_at).toLocaleDateString()}` : 'Active loan')
            };
          });
        }
      } catch (lErr) {
        console.warn('Loans pre-fetch note:', lErr.message);
      }
    }

    let parsedOrders = [];
    if (Array.isArray(dbOrders)) {
      parsedOrders = dbOrders.map(o => {
        const statusClean = (o.status || 'Pending').toLowerCase();
        const createdDate = new Date(o.created_at);
        const formattedDateStr = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const formattedTimeStr = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const itemsArr = o.order_items || [];
        const itemsStr = itemsArr.map(oi => `${oi.quantity}x ${oi.products ? oi.products.name : 'Item'}`).join(', ');
        const itemsLower = itemsStr.toLowerCase();
        const catTypes = itemsArr.map(oi => (oi.products?.categories?.type || oi.products?.categories?.name || '').toLowerCase()).join(' ');
        const catNames = itemsArr.map(oi => (oi.products?.name || '').toLowerCase()).join(' ');
        const combinedCheck = `${itemsLower} ${catTypes} ${catNames}`;

        let dept = 'cafe';
        if (combinedCheck.includes('books') || combinedCheck.includes('manga') || combinedCheck.includes('novel') || combinedCheck.includes('essay') || combinedCheck.includes('book') || combinedCheck.includes('chainsaw') || combinedCheck.includes('mate') || combinedCheck.includes('tteokbokki') || combinedCheck.includes('alchemist') || combinedCheck.includes('slip')) {
          dept = 'library';
        } else if (combinedCheck.includes('flowers') || combinedCheck.includes('fresh') || combinedCheck.includes('dried') || combinedCheck.includes('botanical') || combinedCheck.includes('flower') || combinedCheck.includes('rose') || combinedCheck.includes('tulip') || combinedCheck.includes('stem') || combinedCheck.includes('bouquet') || combinedCheck.includes('eucalyptus')) {
          dept = 'flowers';
        }

        return {
          id: o.order_number || `ORD-${o.order_id}`,
          dbId: o.order_id,
          dept: dept,
          customer: o.profiles?.full_name || (o.user_id ? `Patron (${o.user_id.slice(0, 8)})` : (o.table_number ? `Table #${o.table_number}` : 'Guest Patron')),
          customerType: o.table_number ? `In-Seat (Table ${o.table_number})` : 'Counter Pickup',
          items: itemsStr || `Order Total $${o.total}`,
          type: o.order_type === 'in_seat' ? 'In-Seat Service' : 'Counter Pickup',
          total: Number(o.total),
          status: statusClean,
          time: `${formattedDateStr}, ${formattedTimeStr}`,
          timestamp: createdDate.getTime(),
          notes: `Placed via Order Tray · Table ${o.table_number || 'Counter'}`
        };
      });
    }

    // Detect new orders on subsequent polling cycles
    const currentOrderIds = new Set(parsedOrders.map(o => o.id));
    if (!isFirstOrderLoad) {
      const newlyArrived = parsedOrders.filter(o => !previousOrderIds.has(o.id));
      if (newlyArrived.length > 0) {
        const newest = newlyArrived[0];
        playKitchenChimeSound();
        if (typeof showToast === 'function') {
          showToast(`🔔 New Order Received: ${newest.id} (${newest.customer})`, 'restaurant');
        }
      }
    } else {
      isFirstOrderLoad = false;
    }

    previousOrderIds = currentOrderIds;
    adminOrders = parsedOrders;
    adminOrders.sort((a, b) => b.timestamp - a.timestamp);
    renderOrdersTable();
    renderDynamicDashboard();
  } catch (err) {
    console.warn('Could not load live orders from backend:', err);
  }
}

/**
 * Renders filtered and searched orders into `#orders-table-body`.
 */
function renderOrdersTable() {
  const tableBody = document.getElementById('orders-table-body');
  const searchInput = document.getElementById('orders-table-search');
  if (!tableBody) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const filtered = adminOrders.filter(ord => {
    const matchesDept = activeDeptFilter === 'all' || ord.dept === activeDeptFilter;
    const matchesFilter = activeOrderFilter === 'all' || ord.status === activeOrderFilter;
    const matchesSearch = !query || 
      ord.id.toLowerCase().includes(query) || 
      ord.customer.toLowerCase().includes(query) || 
      ord.items.toLowerCase().includes(query);
    return matchesDept && matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted" style="padding: 2.5rem 1rem;">
          No matching orders found for "${activeOrderFilter}".
        </td>
      </tr>
    `;
    updateOrderSummaryPills();
    return;
  }

  tableBody.innerHTML = filtered.map(ord => `
    <tr>
      <td><span class="text-mono font-semibold">${ord.id}</span></td>
      <td>
        <div class="table-media-info">
          <span class="table-primary-text">${ord.customer}</span>
          <span class="table-sub-text">${ord.customerType}</span>
        </div>
      </td>
      <td>
        <span class="text-sm font-semibold">${ord.items}</span>
      </td>
      <td><span class="text-xs text-muted text-mono">${ord.type}</span></td>
      <td><span class="text-mono font-semibold">$${ord.total.toFixed(2)}</span></td>
      <td>
        <span class="status-badge status-badge--${ord.status}">${ord.status}</span>
      </td>
      <td><span class="text-xs text-light text-mono">${ord.time}</span></td>
      <td>
        <div class="flex-row items-center gap-2xs">
          <button class="btn btn-outline btn-sm" data-order-action="inspect" data-order-id="${ord.id}" title="Inspect Details">
            Inspect
          </button>
          ${ord.status === 'pending' ? `
            <button class="btn btn-primary btn-sm" data-order-action="advance" data-order-id="${ord.id}" title="Advance to Preparing stage">
              Start Prep ☕
            </button>
          ` : ''}
          ${ord.status === 'preparing' ? `
            <button class="btn btn-primary btn-sm" data-order-action="advance" data-order-id="${ord.id}" style="background-color: var(--secondary); border-color: var(--secondary);" title="Advance to Ready stage">
              Mark Ready 🔔
            </button>
          ` : ''}
          ${ord.status === 'ready' ? `
            <button class="btn btn-secondary btn-sm" data-order-action="advance" data-order-id="${ord.id}" title="Mark order as Completed">
              Complete ✓
            </button>
          ` : ''}
          <button class="btn btn-outline btn-sm text-danger" data-order-action="delete" data-order-id="${ord.id}" title="Delete Order Ticket">
            Delete 🗑️
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  updateOrderSummaryPills();
}

/**
 * Updates count numbers on status filter pills and sidebar badge.
 */
function updateOrderSummaryPills() {
  const pendingCount = adminOrders.filter(o => o.status === 'pending').length;
  const preparingCount = adminOrders.filter(o => o.status === 'preparing').length;
  const readyCount = adminOrders.filter(o => o.status === 'ready').length;
  const completedCount = adminOrders.filter(o => o.status === 'completed').length;
  const cancelledCount = adminOrders.filter(o => o.status === 'cancelled').length;

  const sidebarBadge = document.getElementById('sidebar-orders-badge');
  if (sidebarBadge) {
    sidebarBadge.textContent = pendingCount + preparingCount;
  }

  const setPillCount = (status, count) => {
    const pill = document.querySelector(`#orders-status-pills [data-status="${status}"] .pill-count`);
    if (pill) pill.textContent = count;
  };

  setPillCount('all', adminOrders.length);
  setPillCount('pending', pendingCount);
  setPillCount('preparing', preparingCount);
  setPillCount('ready', readyCount);
  setPillCount('completed', completedCount);
  setPillCount('cancelled', cancelledCount);
}

/**
 * Deletes an order from database and updates UI instantly.
 */
async function deleteOrder(orderId) {
  const ord = adminOrders.find(o => o.id === orderId || o.dbId == orderId);
  if (!ord) return;

  if (!confirm(`Delete ticket "${ord.id}" for ${ord.customer}?`)) return;

  // Optimistic UI update
  adminOrders = adminOrders.filter(o => o.id !== orderId && o.dbId != orderId);
  renderOrdersTable();

  try {
    if (ord.isLoan) {
      if (window.AfterwordAPI) {
        await window.AfterwordAPI.updateLoanStatus(ord.dbId, 'Cancelled');
      }
    } else {
      const targetId = ord.dbId || ord.id;
      if (window.AfterwordAPI && typeof window.AfterwordAPI.deleteOrder === 'function') {
        await window.AfterwordAPI.deleteOrder(targetId);
      } else {
        await fetch(`/api/orders/${targetId}`, { method: 'DELETE' });
      }
    }

    showToast(`Deleted ticket ${ord.id} ✓`, 'delete_outline');
    await loadLiveOrdersFromBackend();
  } catch (err) {
    showToast(`Could not delete order: ${err.message}`, 'warning');
    await loadLiveOrdersFromBackend();
  }
}

/**
 * Automatically transitions order forward along the workflow:
 * pending -> preparing -> ready -> completed.
 * 
 * @param {string} orderId - ID of order to advance.
 */
async function advanceOrderStatus(orderId) {
  const ord = adminOrders.find(o => o.id === orderId || o.dbId == orderId);
  if (!ord) return;

  if (ord.isLoan) {
    if (ord.status === 'pending') {
      await approveLoan(ord.dbId);
    } else {
      await markLoanReturned(ord.dbId);
    }
    await loadLiveOrdersFromBackend();
    return;
  }

  const nextMap = {
    'pending': 'Preparing',
    'preparing': 'Ready',
    'ready': 'Completed'
  };

  const nextStatus = nextMap[ord.status];
  if (!nextStatus) return;

  const targetId = ord.dbId || ord.id;
  ord.status = nextStatus.toLowerCase();
  renderOrdersTable();

  try {
    if (window.AfterwordAPI && typeof window.AfterwordAPI.updateOrderStatus === 'function') {
      await window.AfterwordAPI.updateOrderStatus(targetId, nextStatus);
    } else {
      const res = await fetch(`/api/orders/${targetId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update order status');
      }
    }

    showToast(`Order ${ord.id} advanced to "${nextStatus.toUpperCase()}" ✓`, 'check_circle');
    await loadLiveOrdersFromBackend();
  } catch (err) {
    console.error('Failed to advance order status:', err);
    showToast(`Could not update order status: ${err.message}`, 'warning');
    await loadLiveOrdersFromBackend();
  }
}

/**
 * Opens detailed inspection modal for a given order.
 * 
 * @param {string} orderId - ID of order.
 */
function openOrderModal(orderId) {
  const ord = adminOrders.find(o => o.id === orderId);
  const modal = document.getElementById('order-detail-modal');
  if (!ord || !modal) return;

  document.getElementById('modal-ord-id').textContent = ord.id;
  document.getElementById('modal-ord-customer').textContent = `${ord.customer} (${ord.customerType})`;
  document.getElementById('modal-ord-type').textContent = ord.type;
  document.getElementById('modal-ord-items').textContent = ord.items;

  const notesEl = document.getElementById('modal-ord-notes');
  if (notesEl) {
    if (ord.dept === 'library' || ord.isLoan) {
      notesEl.textContent = 'Library Volume Circulation — Standard hold/pickup. No café prep or temperature options required.';
    } else if (ord.dept === 'flowers') {
      notesEl.textContent = 'Botanical Arrangement — Fresh stem selection. Handle with care.';
    } else {
      notesEl.textContent = ord.notes || 'Standard café preparation.';
    }
  }

  const totalEl = document.getElementById('modal-ord-total');
  if (totalEl) {
    totalEl.textContent = `₱${(Number(ord.total) || 0).toFixed(2)}`;
  }
  
  const statusSelect = document.getElementById('modal-ord-status-select');
  if (statusSelect) {
    statusSelect.value = ord.status;
  }

  modal.setAttribute('data-active-id', orderId);
  modal.classList.add('open');
}

// ---------------------------------------------------------------------------
// Café & Flowers Inventory Subsystems
// ---------------------------------------------------------------------------

function initCafeSection() {
  loadCafeFromBackend();

  const tableBody = document.getElementById('cafe-table-body');
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      const stockBtn = e.target.closest('[data-stock-action]');
      if (stockBtn) {
        const id = stockBtn.getAttribute('data-item-id');
        const action = stockBtn.getAttribute('data-stock-action');
        adjustStock('cafe', id, action === 'inc' ? 1 : -1);
      }
    });

    tableBody.addEventListener('change', (e) => {
      const toggle = e.target.closest('.cafe-availability-toggle');
      if (toggle) {
        const id = toggle.getAttribute('data-item-id');
        toggleAvailability('cafe', id, toggle.checked);
      }
    });
  }
}

function renderCafeTable() {
  const tableBody = document.getElementById('cafe-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = cafeInventory.map(item => `
    <tr>
      <td>
        <div class="table-media-cell">
          <img src="${formatAdminImageUrl(item.image, 'cafe')}" alt="${item.name}" class="table-thumb" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80';">
          <div class="table-media-info">
            <span class="table-primary-text">${item.name}</span>
            <span class="table-sub-text">${item.category}</span>
          </div>
        </div>
      </td>
      <td><span class="chip chip-coffee">${item.category}</span></td>
      <td><span class="text-mono font-semibold">₱${(item.price * 56).toFixed(0)}</span></td>
      <td>
        <div class="stock-counter">
          <button class="stock-btn" data-stock-action="dec" data-item-id="${item.id}" aria-label="Decrease stock">−</button>
          <span class="stock-num ${item.stock <= 5 ? 'low' : ''}">${item.stock}</span>
          <button class="stock-btn" data-stock-action="inc" data-item-id="${item.id}" aria-label="Increase stock">+</button>
        </div>
      </td>
      <td>
        <label class="switch-toggle">
          <input type="checkbox" class="cafe-availability-toggle" data-item-id="${item.id}" ${item.available ? 'checked' : ''}>
          <span class="slider-toggle"></span>
        </label>
      </td>
      <td>
        <span class="status-badge ${item.available && item.stock > 0 ? 'status-badge--completed' : 'status-badge--cancelled'}">
          ${item.available && item.stock > 0 ? 'In Stock' : 'Unavailable'}
        </span>
      </td>
    </tr>
  `).join('');
}

function initFlowersSection() {
  loadFlowersFromBackend();

  const tableBody = document.getElementById('flowers-table-body');
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      const stockBtn = e.target.closest('[data-stock-action]');
      if (stockBtn) {
        const id = stockBtn.getAttribute('data-item-id');
        const action = stockBtn.getAttribute('data-stock-action');
        adjustStock('flowers', id, action === 'inc' ? 1 : -1);
      }
    });

    tableBody.addEventListener('change', (e) => {
      const toggle = e.target.closest('.flowers-availability-toggle');
      if (toggle) {
        const id = toggle.getAttribute('data-item-id');
        toggleAvailability('flowers', id, toggle.checked);
      }
    });
  }
}

function renderFlowersTable() {
  const tableBody = document.getElementById('flowers-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = flowerInventory.map(item => `
    <tr>
      <td>
        <div class="table-media-cell">
          <img src="${formatAdminImageUrl(item.image, 'flowers')}" alt="${item.name}" class="table-thumb" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=300&q=80';">
          <div class="table-media-info">
            <span class="table-primary-text">${item.name}</span>
            <span class="table-sub-text">${item.category}</span>
          </div>
        </div>
      </td>
      <td><span class="chip chip-olive">${item.category}</span></td>
      <td><span class="text-mono font-semibold">₱${(item.price * 56).toFixed(0)}</span></td>
      <td>
        <div class="stock-counter">
          <button class="stock-btn" data-stock-action="dec" data-item-id="${item.id}">−</button>
          <span class="stock-num ${item.stock <= 5 ? 'low' : ''}">${item.stock}</span>
          <button class="stock-btn" data-stock-action="inc" data-item-id="${item.id}">+</button>
        </div>
      </td>
      <td>
        <label class="switch-toggle">
          <input type="checkbox" class="flowers-availability-toggle" data-item-id="${item.id}" ${item.available ? 'checked' : ''}>
          <span class="slider-toggle"></span>
        </label>
      </td>
      <td>
        <span class="status-badge ${item.available && item.stock > 0 ? 'status-badge--completed' : 'status-badge--cancelled'}">
          ${item.available && item.stock > 0 ? 'In Stock' : 'Out of Season'}
        </span>
      </td>
    </tr>
  `).join('');
}

async function adjustStock(type, id, delta) {
  const list = type === 'cafe' ? cafeInventory : flowerInventory;
  const item = list.find(i => i.id === id);
  if (!item) return;

  const newStock = Math.max(0, item.stock + delta);
  const newAvailable = newStock > 0 ? (item.available || delta > 0) : false;

  try {
    if (window.AfterwordAPI && !id.startsWith('cafe-') && !id.startsWith('flw-')) {
      await window.AfterwordAPI.updateProduct(id, { stock: newStock, is_available: newAvailable });
    }

    item.stock = newStock;
    item.available = newAvailable;

    if (type === 'cafe') renderCafeTable();
    else renderFlowersTable();

    showToast(`Updated stock for "${item.name}" to ${item.stock}`, 'inventory_2');
  } catch (err) {
    showToast(`Failed to update stock: ${err.message}`, 'warning');
  }
}

async function toggleAvailability(type, id, isAvailable) {
  const list = type === 'cafe' ? cafeInventory : flowerInventory;
  const item = list.find(i => i.id === id);
  if (!item) return;

  try {
    if (window.AfterwordAPI && !id.startsWith('cafe-') && !id.startsWith('flw-')) {
      await window.AfterwordAPI.updateProduct(id, { is_available: isAvailable });
    }

    item.available = isAvailable;
    if (type === 'cafe') renderCafeTable();
    else renderFlowersTable();

    showToast(`✓ Updated "${item.name}" status to ${isAvailable ? 'Available' : 'Deactivated'}`, 'check_circle');
  } catch (err) {
    showToast(`Could not update availability: ${err.message}`, 'warning');
    if (type === 'cafe') renderCafeTable();
    else renderFlowersTable();
  }
}

// ---------------------------------------------------------------------------
// Library & Circulation Subsystem
// ---------------------------------------------------------------------------

let activeLoanFilter = 'all';

function initLibrarySection() {
  loadLibraryFromBackend();
  loadLoansFromBackend();

  // Loan status filter pills
  const loanPills = document.querySelectorAll('#loans-status-pills .pill-tab-btn');
  loanPills.forEach(pill => {
    pill.addEventListener('click', () => {
      loanPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeLoanFilter = pill.getAttribute('data-loan-filter') || 'all';
      renderLoansTable();
    });
  });

  // Loan actions delegation
  const loansTableBody = document.getElementById('loans-table-body');
  if (loansTableBody) {
    loansTableBody.addEventListener('click', (e) => {
      const approveBtn = e.target.closest('[data-loan-action="approve"]');
      if (approveBtn) {
        const loanId = approveBtn.getAttribute('data-loan-id');
        approveLoan(loanId);
        return;
      }

      const rejectBtn = e.target.closest('[data-loan-action="reject"]');
      if (rejectBtn) {
        const loanId = rejectBtn.getAttribute('data-loan-id');
        rejectLoan(loanId);
        return;
      }

      const returnBtn = e.target.closest('[data-loan-action="return"]');
      if (returnBtn) {
        const loanId = returnBtn.getAttribute('data-loan-id');
        markLoanReturned(loanId);
        return;
      }

      const extendBtn = e.target.closest('[data-loan-action="extend"]');
      if (extendBtn) {
        const loanId = extendBtn.getAttribute('data-loan-id');
        extendLoan(loanId);
        return;
      }

      const missingBtn = e.target.closest('[data-loan-action="missing"]');
      if (missingBtn) {
        const loanId = missingBtn.getAttribute('data-loan-id');
        markLoanMissing(loanId);
        return;
      }

      const recoverBtn = e.target.closest('[data-loan-action="recover"]');
      if (recoverBtn) {
        const loanId = recoverBtn.getAttribute('data-loan-id');
        recoverMissingLoan(loanId);
        return;
      }
    });
  }

  const tableBody = document.getElementById('library-table-body');
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      const resBtn = e.target.closest('[data-lib-action="reservations"]');
      if (resBtn) {
        const id = resBtn.getAttribute('data-book-id');
        openReservationsModal(id);
      }
    });
  }
}

function renderLoansTable() {
  const tableBody = document.getElementById('loans-table-body');
  if (!tableBody) return;

  // Compute counts
  const totalCount = activeLoans.length;
  const requestedCount = activeLoans.filter(l => l.status === 'requested').length;
  const activeCount = activeLoans.filter(l => l.status === 'borrowed' || l.status === 'extended').length;
  const overdueCount = activeLoans.filter(l => l.status === 'overdue').length;
  const missingCount = activeLoans.filter(l => l.status === 'missing').length;
  const returnedCount = activeLoans.filter(l => l.status === 'returned').length;

  const countAll = document.getElementById('loans-count-all');
  const countRequested = document.getElementById('loans-count-requested');
  const countActive = document.getElementById('loans-count-active');
  const countOverdue = document.getElementById('loans-count-overdue');
  const countMissing = document.getElementById('loans-count-missing');
  const countReturned = document.getElementById('loans-count-returned');

  if (countAll) countAll.textContent = totalCount;
  if (countRequested) countRequested.textContent = requestedCount;
  if (countActive) countActive.textContent = activeCount;
  if (countOverdue) countOverdue.textContent = overdueCount;
  if (countMissing) countMissing.textContent = missingCount;
  if (countReturned) countReturned.textContent = returnedCount;

  // Update sidebar badge for Library Stacks
  const sidebarLibBadge = document.getElementById('sidebar-library-badge');
  if (sidebarLibBadge) {
    sidebarLibBadge.textContent = requestedCount;
    sidebarLibBadge.style.display = requestedCount > 0 ? 'inline-flex' : 'none';
  }

  // Filter list
  let filtered = activeLoans;
  if (activeLoanFilter === 'requested') {
    filtered = activeLoans.filter(l => l.status === 'requested');
  } else if (activeLoanFilter === 'active') {
    filtered = activeLoans.filter(l => l.status === 'borrowed' || l.status === 'extended');
  } else if (activeLoanFilter === 'overdue') {
    filtered = activeLoans.filter(l => l.status === 'overdue');
  } else if (activeLoanFilter === 'missing') {
    filtered = activeLoans.filter(l => l.status === 'missing');
  } else if (activeLoanFilter === 'returned') {
    filtered = activeLoans.filter(l => l.status === 'returned');
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-md text-sm">
          No circulation loan records found under "${activeLoanFilter}".
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(loan => {
    let badgeClass = 'status-badge--preparing';
    let label = 'Borrowed';

    if (loan.status === 'requested') {
      badgeClass = 'status-badge--pending';
      label = 'Pending Approval ⏳';
    } else if (loan.status === 'extended') {
      badgeClass = 'status-badge--extended';
      label = 'Extended (+14d)';
    } else if (loan.status === 'overdue') {
      badgeClass = 'status-badge--pending';
      label = 'Overdue';
    } else if (loan.status === 'missing') {
      badgeClass = 'status-badge--missing';
      label = 'Missing ⚠️';
    } else if (loan.status === 'returned') {
      badgeClass = 'status-badge--completed';
      label = 'Returned ✓';
    } else if (loan.status === 'cancelled') {
      badgeClass = 'status-badge--missing';
      label = 'Cancelled';
    }

    return `
      <tr>
        <td>
          <div>
            <strong>${loan.patronName}</strong>
            <div class="text-mono text-xs text-secondary font-semibold">${loan.patronCard} · <span class="text-muted">${loan.id}</span></div>
          </div>
        </td>
        <td>
          <div>
            <span class="table-primary-text">${loan.bookTitle}</span>
            <div class="text-mono text-xs text-light">${loan.shelf}</div>
          </div>
        </td>
        <td><span class="text-mono text-xs">${loan.borrowedDate}</span></td>
        <td>
          <div>
            <strong class="text-sm ${loan.status === 'overdue' ? 'text-danger' : 'text-primary'}">${loan.dueDate}</strong>
            <div class="text-xs text-muted">${loan.notes || ''}</div>
          </div>
        </td>
        <td>
          <span class="status-badge ${badgeClass}">${label}</span>
        </td>
        <td>
          <div class="table-actions-cell">
            ${loan.status === 'requested' ? `
              <button class="btn btn-primary btn-xs" data-loan-action="approve" data-loan-id="${loan.id}" title="Allow patron to borrow volume">
                Allow / Approve Loan ✓
              </button>
              <button class="btn btn-outline btn-xs text-danger" data-loan-action="reject" data-loan-id="${loan.id}" title="Reject borrow request">
                Deny ✕
              </button>
            ` : ''}

            ${loan.status === 'borrowed' || loan.status === 'extended' || loan.status === 'overdue' ? `
              <button class="btn btn-secondary btn-xs" data-loan-action="return" data-loan-id="${loan.id}" title="Mark volume as returned">
                Returned ✓
              </button>
              <button class="btn btn-outline btn-xs" data-loan-action="extend" data-loan-id="${loan.id}" title="Grant +14 days loan extension">
                +14d Ext
              </button>
              <button class="btn btn-outline btn-xs text-danger" data-loan-action="missing" data-loan-id="${loan.id}" title="Flag volume as missing or lost">
                Missing ⚠️
              </button>
            ` : ''}

            ${loan.status === 'returned' ? `<span class="text-xs text-muted italic">Checked In</span>` : ''}
            ${loan.status === 'cancelled' ? `<span class="text-xs text-muted italic">Rejected</span>` : ''}

            ${loan.status === 'missing' ? `
              <button class="btn btn-outline btn-xs text-success" data-loan-action="recover" data-loan-id="${loan.id}" title="Mark as found & checked in">
                Recovered ✓
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function approveLoan(loanId) {
  const loan = activeLoans.find(l => l.id === loanId);
  if (loan) {
    loan.status = 'borrowed';
    renderLoansTable();
  }

  try {
    if (window.AfterwordAPI) {
      await window.AfterwordAPI.updateLoanStatus(loanId, 'Borrowed');
    }
    showToast(`✓ Borrow request approved for "${loan ? loan.bookTitle : 'Book'}"! Loan activated.`, 'check_circle');
    await loadLoansFromBackend();
    await loadLibraryFromBackend();
  } catch (err) {
    showToast(`Could not approve loan: ${err.message}`, 'warning');
    await loadLoansFromBackend();
  }
}

async function rejectLoan(loanId) {
  const loan = activeLoans.find(l => l.id === loanId);
  if (loan) {
    loan.status = 'cancelled';
    renderLoansTable();
  }

  try {
    if (window.AfterwordAPI) {
      await window.AfterwordAPI.updateLoanStatus(loanId, 'Cancelled');
    }
    showToast(`Borrow request for "${loan ? loan.bookTitle : 'Book'}" rejected.`, 'info');
    await loadLoansFromBackend();
    await loadLibraryFromBackend();
  } catch (err) {
    showToast(`Could not reject loan: ${err.message}`, 'warning');
    await loadLoansFromBackend();
  }
}

async function markLoanReturned(loanId) {
  const loan = activeLoans.find(l => l.id === loanId);
  if (loan) {
    loan.status = 'returned';
    renderLoansTable();
  }

  try {
    if (window.AfterwordAPI && !loanId.startsWith('LN-')) {
      await window.AfterwordAPI.returnLoan(loanId);
    }

    showToast(`✓ Volume "${loan ? loan.bookTitle : 'Book'}" marked as RETURNED! Shelf inventory restored.`, 'inventory');
    await loadLoansFromBackend();
    await loadLibraryFromBackend();
  } catch (err) {
    showToast(`Could not return book: ${err.message}`, 'warning');
    await loadLoansFromBackend();
  }
}

async function extendLoan(loanId) {
  const loan = activeLoans.find(l => l.id === loanId);
  if (loan) {
    loan.status = 'extended';
    renderLoansTable();
  }

  try {
    if (window.AfterwordAPI && !loanId.startsWith('LN-')) {
      await window.AfterwordAPI.renewLoan(loanId, 14);
    }

    showToast(`✓ Extended loan for "${loan ? loan.bookTitle : 'Book'}" by +14 days!`, 'update');
    await loadLoansFromBackend();
  } catch (err) {
    showToast(`Could not extend loan: ${err.message}`, 'warning');
    await loadLoansFromBackend();
  }
}

async function markLoanMissing(loanId) {
  const loan = activeLoans.find(l => l.id === loanId);
  if (loan) {
    loan.status = 'missing';
    renderLoansTable();
  }

  try {
    if (window.AfterwordAPI && !loanId.startsWith('LN-')) {
      await window.AfterwordAPI.updateLoanStatus(loanId, 'Overdue', 'Flagged missing volume');
    }

    showToast(`WARNING: "${loan ? loan.bookTitle : 'Book'}" flagged as MISSING.`, 'warning');
    await loadLoansFromBackend();
  } catch (err) {
    showToast(`Could not update loan status: ${err.message}`, 'warning');
    await loadLoansFromBackend();
  }
}

async function recoverMissingLoan(loanId) {
  const loan = activeLoans.find(l => l.id === loanId);
  if (loan) {
    loan.status = 'returned';
    renderLoansTable();
  }

  try {
    if (window.AfterwordAPI && !loanId.startsWith('LN-')) {
      await window.AfterwordAPI.returnLoan(loanId);
    }

    showToast(`✓ Recovered "${loan.bookTitle}" and restored to stacks!`, 'check_circle');
    await loadLoansFromBackend();
    await loadLibraryFromBackend();
  } catch (err) {
    showToast(`Could not recover loan: ${err.message}`, 'warning');
  }
}

function renderLibraryTable() {
  const tableBody = document.getElementById('library-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = libraryCatalog.map(book => {
    const availableCopies = book.totalCopies - book.borrowedCopies;
    const isAvailable = availableCopies > 0;

    return `
      <tr>
        <td>
          <div class="table-media-cell">
            <img src="${formatAdminImageUrl(book.cover, 'books')}" alt="${book.title}" class="table-thumb table-thumb--book" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80';">
            <div class="table-media-info">
              <span class="table-primary-text">${book.title}</span>
              <span class="table-sub-text">${book.author}</span>
            </div>
          </div>
        </td>
        <td><span class="chip chip-coffee">${book.category}</span></td>
        <td><span class="text-mono text-xs text-light">${book.shelf}</span></td>
        <td>
          <div class="capacity-cell">
            <div class="capacity-bar-wrap">
              <div class="capacity-bar-fill ${book.borrowedCopies === book.totalCopies ? 'high' : ''}" 
                   style="width: ${(book.borrowedCopies / book.totalCopies) * 100}%"></div>
            </div>
            <span class="capacity-text">${availableCopies} of ${book.totalCopies} Available</span>
          </div>
        </td>
        <td>
          <span class="status-badge ${isAvailable ? 'status-badge--completed' : 'status-badge--pending'}">
            ${isAvailable ? 'Available' : 'All on Loan'}
          </span>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" data-lib-action="reservations" data-book-id="${book.id}">
            Holds (${book.reservations.length})
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openReservationsModal(bookId) {
  const book = libraryCatalog.find(b => b.id === bookId);
  const modal = document.getElementById('reservations-modal');
  if (!book || !modal) return;

  document.getElementById('modal-res-title').textContent = book.title;
  const listEl = document.getElementById('modal-res-list');
  if (listEl) {
    if (book.reservations.length === 0) {
      listEl.innerHTML = '<li class="text-muted text-sm">No patrons currently queued for this volume.</li>';
    } else {
      listEl.innerHTML = book.reservations.map((p, idx) => `
        <li class="flex-row justify-between items-center text-sm" style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-light);">
          <span><strong>#${idx + 1}</strong> · ${p}</span>
          <span class="chip chip-olive">Active Hold</span>
        </li>
      `).join('');
    }
  }

  modal.classList.add('open');
}

// ---------------------------------------------------------------------------
// Events Subsystem
// ---------------------------------------------------------------------------

function initEventsSection() {
  loadEventsFromBackend();

  const tableBody = document.getElementById('events-table-body');
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      const rosterBtn = e.target.closest('[data-event-action="roster"]');
      if (rosterBtn) {
        const evId = rosterBtn.getAttribute('data-event-id');
        const ev = eventsProgram.find(i => i.id === evId);
        showToast(`Printed attendee roster for "${ev ? ev.name : 'Event'}"`, 'print');
      }
    });
  }
}

function renderEventsTable() {
  const tableBody = document.getElementById('events-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = eventsProgram.map(ev => {
    const pct = Math.round((ev.registered / ev.capacity) * 100);
    const isFull = ev.registered >= ev.capacity;

    return `
      <tr>
        <td>
          <div class="table-media-cell">
            <img src="${ev.image}" alt="${ev.name}" class="table-thumb">
            <div class="table-media-info">
              <span class="table-primary-text">${ev.name}</span>
              <span class="table-sub-text">${ev.date} · ${ev.time}</span>
            </div>
          </div>
        </td>
        <td><span class="chip chip-terracotta">${ev.category}</span></td>
        <td>
          <div class="capacity-cell">
            <div class="capacity-bar-wrap">
              <div class="capacity-bar-fill ${isFull ? 'high' : ''}" style="width: ${pct}%"></div>
            </div>
            <span class="capacity-text">${ev.registered} / ${ev.capacity} (${pct}%)</span>
          </div>
        </td>
        <td>
          <span class="status-badge ${isFull ? 'status-badge--ready' : 'status-badge--completed'}">
            ${isFull ? 'Fully Booked' : 'RSVP Open'}
          </span>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" data-event-action="roster" data-event-id="${ev.id}">
            Roster
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ---------------------------------------------------------------------------
// Patron Customers Directory Subsystem
// ---------------------------------------------------------------------------

function initCustomersSection() {
  loadCustomersFromBackend();
}

function renderCustomersTable() {
  const tableBody = document.getElementById('customers-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = patronCustomers.map(p => {
    let chipClass = 'chip-olive';
    if (p.tier.includes('Founding')) chipClass = 'chip-terracotta';
    else if (p.tier.includes('Scholar')) chipClass = 'chip-coffee';

    return `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td><span class="text-mono text-secondary font-semibold">${p.cardId}</span></td>
        <td><span class="chip ${chipClass}">${p.tier}</span></td>
        <td><span class="text-mono font-bold">${p.activeLoans} ${p.activeLoans === 1 ? 'Book' : 'Books'}</span></td>
        <td><span class="text-mono">₱${(p.totalSpent * 56).toLocaleString()}</span></td>
        <td><span class="text-xs text-muted">${p.lastVisit || 'Recently'}</span></td>
      </tr>
    `;
  }).join('');
}

// ---------------------------------------------------------------------------
// Modal Controllers & Actions
// ---------------------------------------------------------------------------

function initModalsController() {
  // Scrim click dismissal
  document.querySelectorAll('.modal-scrim').forEach(scrim => {
    scrim.addEventListener('click', (e) => {
      if (e.target === scrim) {
        scrim.classList.remove('open');
      }
    });
  });

  // Explicit close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-scrim').forEach(m => m.classList.remove('open'));
    });
  });

  // Escape key listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-scrim').forEach(m => m.classList.remove('open'));
    }
  });

  // Save Order Status Action
  const saveOrderBtn = document.getElementById('modal-save-order-status');
  if (saveOrderBtn) {
    saveOrderBtn.addEventListener('click', async () => {
      const modal = document.getElementById('order-detail-modal');
      const orderId = modal?.getAttribute('data-active-id');
      const newStatus = document.getElementById('modal-ord-status-select')?.value;

      if (orderId && newStatus) {
        try {
          const capitalized = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
          if (window.AfterwordAPI) {
            await window.AfterwordAPI.updateOrderStatus(orderId, capitalized);
          }
          showToast(`✓ Order ${orderId} status set to "${newStatus.toUpperCase()}"`, 'check_circle');
          await loadLiveOrdersFromBackend();
        } catch (err) {
          showToast(`Could not update order status: ${err.message}`, 'warning');
        }
      }
      modal?.classList.remove('open');
    });
  }

  // 1. Add Product Modal (Food & Café)
  const openAddProductBtn = document.getElementById('btn-open-add-product');
  const addProductModal = document.getElementById('add-product-modal');
  if (openAddProductBtn && addProductModal) {
    openAddProductBtn.addEventListener('click', () => {
      addProductModal.classList.add('open');
    });
  }

  const addProductForm = document.getElementById('add-product-form');
  if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('prod-name')?.value || 'New Offering';
      const price = parseFloat(document.getElementById('prod-price')?.value || '5.00');
      const stock = parseInt(document.getElementById('prod-stock')?.value || '20', 10);
      const categoryId = parseInt(document.getElementById('prod-category')?.value || '1', 10);

      try {
        if (window.AfterwordAPI) {
          await window.AfterwordAPI.addProduct({
            name,
            price,
            stock,
            category_id: categoryId,
            description: `Freshly prepared café item.`,
            is_available: true
          });
        }

        await loadCafeFromBackend();
        addProductModal?.classList.remove('open');
        addProductForm.reset();
        showToast(`✓ Added "${name}" to Café offerings!`, 'add_shopping_cart');
      } catch (err) {
        showToast(`Failed to add product: ${err.message}`, 'warning');
      }
    });
  }

  // 2. Add Book Modal (Library Stacks)
  const openAddBookBtn = document.getElementById('btn-open-add-book');
  const addBookModal = document.getElementById('add-book-modal');
  if (openAddBookBtn && addBookModal) {
    openAddBookBtn.addEventListener('click', () => {
      addBookModal.classList.add('open');
    });
  }

  const addBookForm = document.getElementById('add-book-form');
  if (addBookForm) {
    addBookForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('book-title')?.value || 'New Volume';
      const author = document.getElementById('book-author')?.value || 'Author';
      const shelf = document.getElementById('book-shelf')?.value || 'Shelf A-01';
      const copies = parseInt(document.getElementById('book-copies')?.value || '2', 10);
      const description = document.getElementById('book-synopsis')?.value || 'Curated library volume.';
      const categoryId = parseInt(document.getElementById('book-category')?.value || '6', 10);

      try {
        if (window.AfterwordAPI) {
          await window.AfterwordAPI.addBook({
            title,
            author,
            description,
            category_id: categoryId,
            shelf_location: shelf,
            total_copies: copies,
            available_copies: copies
          });
        }

        await loadLibraryFromBackend();
        addBookModal?.classList.remove('open');
        addBookForm.reset();
        showToast(`✓ Added "${title}" to Library Stacks!`, 'library_add');
      } catch (err) {
        showToast(`Failed to add book: ${err.message}`, 'warning');
      }
    });
  }

  // 3. Add Flower Modal (Botanicals)
  const openAddFlowerBtn = document.getElementById('btn-open-add-flower');
  const addFlowerModal = document.getElementById('add-flower-modal');
  if (openAddFlowerBtn && addFlowerModal) {
    openAddFlowerBtn.addEventListener('click', () => {
      addFlowerModal.classList.add('open');
    });
  }

  const addFlowerForm = document.getElementById('add-flower-form');
  if (addFlowerForm) {
    addFlowerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('flower-name')?.value || 'Botanical Stem';
      const price = parseFloat(document.getElementById('flower-price')?.value || '28.00');
      const stock = parseInt(document.getElementById('flower-stock')?.value || '12', 10);
      const categoryId = parseInt(document.getElementById('flower-category')?.value || '4', 10);

      try {
        if (window.AfterwordAPI) {
          await window.AfterwordAPI.addProduct({
            name,
            price,
            stock,
            category_id: categoryId,
            description: 'Fresh botanical arrangement from local growers.',
            is_available: true
          });
        }

        await loadFlowersFromBackend();
        addFlowerModal?.classList.remove('open');
        addFlowerForm.reset();
        showToast(`✓ Received batch "${name}" for Botanical Studio!`, 'local_florist');
      } catch (err) {
        showToast(`Failed to add flower offering: ${err.message}`, 'warning');
      }
    });
  }

  // 4. Add Event Modal (Community Gatherings)
  const openAddEventBtn = document.getElementById('btn-open-add-event');
  const addEventModal = document.getElementById('add-event-modal');
  if (openAddEventBtn && addEventModal) {
    openAddEventBtn.addEventListener('click', () => {
      addEventModal.classList.add('open');
    });
  }

  const addEventForm = document.getElementById('add-event-form');
  if (addEventForm) {
    addEventForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('event-title')?.value || 'Community Gathering';
      const capacity = parseInt(document.getElementById('event-capacity')?.value || '20', 10);
      const date = document.getElementById('event-date')?.value || new Date().toISOString().split('T')[0];
      const time = document.getElementById('event-time')?.value || '18:30:00';

      let parsedDate = date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        parsedDate = new Date().toISOString().split('T')[0];
      }
      let parsedTime = time.includes(':') ? time : '18:30:00';

      try {
        if (window.AfterwordAPI) {
          await window.AfterwordAPI.addEvent({
            title,
            description: `Café event at AFTERWORD.`,
            event_date: parsedDate,
            event_time: parsedTime,
            capacity,
            location: 'Café Main Room'
          });
        }

        await loadEventsFromBackend();
        addEventModal?.classList.remove('open');
        addEventForm.reset();
        showToast(`✓ Scheduled event "${title}"!`, 'event_available');
      } catch (err) {
        showToast(`Failed to schedule event: ${err.message}`, 'warning');
      }
    });
  }

  // 5. Enroll Patron Modal
  const openEnrollPatronBtn = document.getElementById('btn-open-enroll-patron');
  const enrollPatronModal = document.getElementById('enroll-patron-modal');
  if (openEnrollPatronBtn && enrollPatronModal) {
    openEnrollPatronBtn.addEventListener('click', () => {
      const cardInput = document.getElementById('patron-card');
      if (cardInput) {
        cardInput.value = `#MEM-${Math.floor(Math.random() * 800 + 100)}`;
      }
      enrollPatronModal.classList.add('open');
    });
  }

  const enrollPatronForm = document.getElementById('enroll-patron-form');
  if (enrollPatronForm) {
    enrollPatronForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('patron-name')?.value || 'Patron';
      const email = document.getElementById('patron-email')?.value || `patron${Date.now().toString().slice(-4)}@afterword.org`;
      const cardId = document.getElementById('patron-card')?.value || `#MEM-${Date.now().toString().slice(-3)}`;

      try {
        if (window.AfterwordAPI) {
          await window.AfterwordAPI.signup(email, 'PatronPass123!', name);
        }

        await loadCustomersFromBackend();
        enrollPatronModal?.classList.remove('open');
        enrollPatronForm.reset();
        showToast(`✓ Enrolled "${name}" (${cardId}) into Patron Directory!`, 'person_add');
      } catch (err) {
        showToast(`Could not enroll patron: ${err.message}`, 'warning');
      }
    });
  }

  // 6. Lend Book to Patron Modal
  const openLendBtn = document.getElementById('btn-open-lend-modal');
  const lendModal = document.getElementById('lend-book-modal');
  if (openLendBtn && lendModal) {
    openLendBtn.addEventListener('click', () => {
      // Populate patrons
      const patronSelect = document.getElementById('lend-patron-select');
      if (patronSelect) {
        patronSelect.innerHTML = patronCustomers.map(p => `
          <option value="${p.id}" data-name="${p.name}" data-card="${p.cardId}">
            ${p.name} (${p.cardId})
          </option>
        `).join('');
      }

      // Populate books
      const bookSelect = document.getElementById('lend-book-select');
      if (bookSelect) {
        bookSelect.innerHTML = libraryCatalog.map(b => {
          const avail = b.totalCopies - b.borrowedCopies;
          return `
            <option value="${b.id}" data-title="${b.title}" data-shelf="${b.shelf}" ${avail <= 0 ? 'disabled' : ''}>
              ${b.title} [${b.shelf}] · ${avail > 0 ? `${avail} copies available` : 'All checked out'}
            </option>
          `;
        }).join('');
      }

      lendModal.classList.add('open');
    });
  }

  const lendForm = document.getElementById('lend-book-form');
  if (lendForm) {
    lendForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const patronSelect = document.getElementById('lend-patron-select');
      const bookSelect = document.getElementById('lend-book-select');
      if (!patronSelect || !bookSelect || !patronSelect.selectedOptions[0] || !bookSelect.selectedOptions[0]) return;

      const patronOpt = patronSelect.selectedOptions[0];
      const bookOpt = bookSelect.selectedOptions[0];
      const days = parseInt(document.getElementById('lend-days')?.value || '21', 10);

      try {
        if (window.AfterwordAPI) {
          await window.AfterwordAPI.createLoan(bookOpt.value, patronOpt.value, days);
        }

        await loadLoansFromBackend();
        await loadLibraryFromBackend();
        await loadCustomersFromBackend();
        lendModal?.classList.remove('open');
        lendForm.reset();
        showToast(`✓ Issued loan for "${bookOpt.getAttribute('data-title') || 'Book'}" to ${patronOpt.getAttribute('data-name') || 'Patron'}!`, 'bookmark_added');
      } catch (err) {
        showToast(`Failed to issue loan: ${err.message}`, 'warning');
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Global Search Filter across views
// ---------------------------------------------------------------------------

function initGlobalSearch() {
  const globalInput = document.getElementById('admin-global-search');
  if (!globalInput) return;

  globalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && globalInput.value.trim()) {
      const q = globalInput.value.trim().toLowerCase();
      // Auto-switch to Orders view and prefill search
      const ordersNavBtn = document.querySelector('[data-view="orders"]');
      if (ordersNavBtn) ordersNavBtn.click();

      const ordersSearch = document.getElementById('orders-table-search');
      if (ordersSearch) {
        ordersSearch.value = q;
        renderOrdersTable();
      }
      showToast(`Filtered console orders for "${q}"`, 'search');
    }
  });
}

// ---------------------------------------------------------------------------
// Book Donation Requests Management Subsystem
// ---------------------------------------------------------------------------

let adminDonations = [];
let donationFilterStatus = 'all';
let currentRejectDonationId = null;

async function loadDonationsFromBackend() {
  try {
    const res = await fetch('/api/donations');
    if (res.ok) {
      adminDonations = await res.json();
    }
  } catch (err) {
    console.warn('Could not load donations:', err);
  }
  renderDonationsTable();
}

function renderDonationsTable() {
  const tbody = document.getElementById('donations-table-body');
  if (!tbody) return;

  const countBadge = document.getElementById('donations-count-badge');
  const countAll = document.getElementById('donations-count-all');
  const countPending = document.getElementById('donations-count-pending');
  const countApproved = document.getElementById('donations-count-approved');
  const countRejected = document.getElementById('donations-count-rejected');

  const pendingList = adminDonations.filter(d => d.status === 'Pending');
  const approvedList = adminDonations.filter(d => d.status === 'Approved');
  const rejectedList = adminDonations.filter(d => d.status === 'Rejected');

  if (countBadge) countBadge.textContent = `${pendingList.length} Pending`;
  if (countAll) countAll.textContent = adminDonations.length;
  if (countPending) countPending.textContent = pendingList.length;
  if (countApproved) countApproved.textContent = approvedList.length;
  if (countRejected) countRejected.textContent = rejectedList.length;

  let filtered = adminDonations;
  if (donationFilterStatus !== 'all') {
    filtered = adminDonations.filter(d => (d.status || '').toLowerCase() === donationFilterStatus.toLowerCase());
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center p-md text-muted">
          No book donation offers found matching filter "${donationFilterStatus}".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(d => {
    const isPending = d.status === 'Pending';
    const isApproved = d.status === 'Approved';
    const isRejected = d.status === 'Rejected';

    let statusChipClass = 'chip-coffee';
    if (isApproved) statusChipClass = 'chip-olive';
    else if (isRejected) statusChipClass = 'chip-terracotta';

    let emailChipClass = 'chip-coffee';
    let emailIcon = 'mail';
    let emailLabel = d.email_status || 'Not Sent';

    if (d.email_status === 'Sent') {
      emailChipClass = 'chip-olive';
      emailIcon = 'mark_email_read';
      emailLabel = '✓ Email Sent';
    } else if (d.email_status === 'Failed') {
      emailChipClass = 'chip-terracotta';
      emailIcon = 'mark_email_unread';
      emailLabel = '⚠️ Email Failed';
    }

    return `
      <tr>
        <td>
          <div class="font-bold text-primary">${d.book_title || 'Untitled Volume'}</div>
          <span class="text-xs text-muted">By ${d.author || 'Unknown Author'}</span>
        </td>
        <td>
          <div class="font-semibold text-main">${d.donor_name || 'Donor'}</div>
          <a href="mailto:${d.donor_email}" class="text-xs text-secondary text-underline">${d.donor_email || 'N/A'}</a>
        </td>
        <td>
          <span class="chip chip-coffee text-xs mb-2xs d-inline-block">${d.category || 'General'}</span>
          <div class="text-xs text-muted">Condition: ${d.condition || 'Good'}</div>
        </td>
        <td>
          <span class="chip ${statusChipClass} text-xs">${d.status}</span>
        </td>
        <td>
          <span class="chip ${emailChipClass} text-xs" title="${d.email_error ? 'Error: ' + d.email_error : 'Email notification status'}">
            <span class="material-symbols-outlined icon-14" style="vertical-align: middle; margin-right: 2px;">${emailIcon}</span>
            <span>${emailLabel}</span>
          </span>
        </td>
        <td>
          <div class="flex-row gap-xs flex-wrap">
            <button class="btn btn-outline btn-xs" data-action="view-donation" data-donation-id="${d.donation_id}">
              View
            </button>
            ${isPending || isRejected ? `
              <button class="btn btn-primary btn-xs" data-action="approve-donation" data-donation-id="${d.donation_id}" data-book-title="${d.book_title}">
                Approve & Email
              </button>
            ` : ''}
            ${isPending || isApproved ? `
              <button class="btn btn-outline btn-xs text-secondary" data-action="reject-donation" data-donation-id="${d.donation_id}" data-book-title="${d.book_title}" data-donor-name="${d.donor_name}">
                Reject
              </button>
            ` : ''}
            ${d.email_status === 'Failed' ? `
              <button class="btn btn-xs btn-outline text-terracotta" data-action="retry-donation-email" data-donation-id="${d.donation_id}" title="Retry sending notification email via Resend">
                <span class="material-symbols-outlined icon-14">refresh</span> Retry Email
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function initDonationsSection() {
  loadDonationsFromBackend();

  const pills = document.querySelectorAll('#donations-status-pills .pill-tab-btn');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      donationFilterStatus = pill.getAttribute('data-donation-filter') || 'all';
      renderDonationsTable();
    });
  });

  const tbody = document.getElementById('donations-table-body');
  if (tbody) {
    tbody.addEventListener('click', async (e) => {
      const viewBtn = e.target.closest('[data-action="view-donation"]');
      const approveBtn = e.target.closest('[data-action="approve-donation"]');
      const rejectBtn = e.target.closest('[data-action="reject-donation"]');
      const retryBtn = e.target.closest('[data-action="retry-donation-email"]');

      if (viewBtn) {
        const donationId = viewBtn.getAttribute('data-donation-id');
        openViewDonationModal(donationId);
      } else if (approveBtn) {
        const donationId = approveBtn.getAttribute('data-donation-id');
        const bookTitle = approveBtn.getAttribute('data-book-title') || 'this volume';
        if (confirm(`Approve book donation for "${bookTitle}" and send confirmation email to donor?`)) {
          await handleApproveDonation(donationId);
        }
      } else if (rejectBtn) {
        const donationId = rejectBtn.getAttribute('data-donation-id');
        const bookTitle = rejectBtn.getAttribute('data-book-title') || 'this volume';
        const donorName = rejectBtn.getAttribute('data-donor-name') || 'Donor';
        openRejectDonationModal(donationId, bookTitle, donorName);
      } else if (retryBtn) {
        const donationId = retryBtn.getAttribute('data-donation-id');
        await handleRetryDonationEmail(donationId);
      }
    });
  }

  const rejectForm = document.getElementById('reject-donation-form');
  if (rejectForm) {
    rejectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const adminNote = document.getElementById('reject-admin-note')?.value.trim();
      if (currentRejectDonationId) {
        await handleRejectDonation(currentRejectDonationId, adminNote);
        closeAdminModal('reject-donation-modal');
      }
    });
  }
}

async function handleApproveDonation(donationId) {
  try {
    const res = await fetch(`/api/donations/${donationId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Approved' })
    });
    const data = await res.json();
    await loadDonationsFromBackend();

    if (res.ok) {
      if (data.emailStatus === 'Sent') {
        showToast('Donation Approved & Approval Email Sent to donor!', 'check_circle');
      } else {
        showToast('Donation approved, but the email could not be sent.', 'warning');
      }
    } else {
      showToast(`Approval failed: ${data.error}`, 'error');
    }
  } catch (err) {
    console.error('Error approving donation:', err);
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function handleRejectDonation(donationId, adminNote) {
  try {
    const res = await fetch(`/api/donations/${donationId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Rejected', admin_note: adminNote })
    });
    const data = await res.json();
    await loadDonationsFromBackend();

    if (res.ok) {
      if (data.emailStatus === 'Sent') {
        showToast('Donation Rejected & Rejection Email Sent to donor.', 'info');
      } else {
        showToast('Donation rejected, but the email could not be sent.', 'warning');
      }
    } else {
      showToast(`Rejection failed: ${data.error}`, 'error');
    }
  } catch (err) {
    console.error('Error rejecting donation:', err);
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function handleRetryDonationEmail(donationId) {
  try {
    const res = await fetch(`/api/donations/${donationId}/email`, { method: 'POST' });
    const data = await res.json();
    await loadDonationsFromBackend();

    if (res.ok && data.emailStatus === 'Sent') {
      showToast('Notification email resent successfully via Resend!', 'mark_email_read');
    } else {
      showToast(`Email retry failed: ${data.error || 'Check Resend credentials'}`, 'error');
    }
  } catch (err) {
    showToast(`Retry error: ${err.message}`, 'error');
  }
}

function openRejectDonationModal(donationId, bookTitle, donorName) {
  currentRejectDonationId = donationId;
  const modal = document.getElementById('reject-donation-modal');
  const titleEl = document.getElementById('reject-modal-book-title');
  const nameEl = document.getElementById('reject-modal-donor-name');
  const noteEl = document.getElementById('reject-admin-note');

  if (titleEl) titleEl.textContent = bookTitle;
  if (nameEl) nameEl.textContent = donorName;
  if (noteEl) noteEl.value = '';

  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function openViewDonationModal(donationId) {
  const d = adminDonations.find(item => String(item.donation_id) === String(donationId));
  if (!d) return;

  const modal = document.getElementById('view-donation-modal');
  const titleEl = document.getElementById('donation-detail-title');
  const bodyEl = document.getElementById('donation-detail-body');
  const footerEl = document.getElementById('donation-detail-footer');

  if (titleEl) titleEl.textContent = `Donation Request #${d.donation_id}: ${d.book_title}`;

  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="font-size: 0.9rem; line-height: 1.6;">
        <div class="card p-md mb-md" style="background: #faf7f2; border: 1px solid #dfd5c9;">
          <h4 class="font-serif font-bold text-lg text-primary mb-2xs">${d.book_title}</h4>
          <p class="text-sm text-secondary mb-xs">By ${d.author} · ${d.category || 'General'} (${d.condition || 'Good'} Condition)</p>
          ${d.publisher ? `<p class="text-xs text-muted">Publisher: ${d.publisher} ${d.year_published ? '(' + d.year_published + ')' : ''}</p>` : ''}
          ${d.summary ? `<p class="text-xs text-main mt-sm p-xs" style="background: #fff; border-radius: 4px; border: 1px solid #eee;"><strong>Summary:</strong> ${d.summary}</p>` : ''}
        </div>

        <div class="card p-md mb-md">
          <h5 class="font-bold text-sm text-primary mb-xs">Donor Contact Information</h5>
          <p class="text-sm"><strong>Name:</strong> ${d.donor_name}</p>
          <p class="text-sm"><strong>Email:</strong> <a href="mailto:${d.donor_email}" class="text-secondary text-underline">${d.donor_email}</a></p>
          ${d.donor_note ? `<p class="text-xs text-muted mt-xs"><strong>Donor Note:</strong> "${d.donor_note}"</p>` : ''}
        </div>

        <div class="card p-md">
          <h5 class="font-bold text-sm text-primary mb-xs">Request Status & Email Dispatch</h5>
          <p class="text-sm"><strong>Status:</strong> <span class="chip chip-coffee text-xs">${d.status}</span></p>
          <p class="text-sm mt-xs"><strong>Email Delivery:</strong> <span class="chip ${d.email_status === 'Sent' ? 'chip-olive' : (d.email_status === 'Failed' ? 'chip-terracotta' : 'chip-coffee')} text-xs">${d.email_status || 'Not Sent'}</span></p>
          ${d.email_error ? `<p class="text-xs text-terracotta mt-xs p-xs" style="background: #fff0f0; border-radius: 4px;"><strong>Email Error:</strong> ${d.email_error}</p>` : ''}
          ${d.admin_note ? `<p class="text-sm text-main mt-sm"><strong>Staff Note:</strong> ${d.admin_note}</p>` : ''}
        </div>
      </div>
    `;
  }

  if (footerEl) {
    footerEl.innerHTML = `
      <button type="button" class="btn btn-outline btn-sm" onclick="closeAdminModal('view-donation-modal')">Close</button>
      ${d.status === 'Pending' ? `
        <button type="button" class="btn btn-primary btn-sm" onclick="closeAdminModal('view-donation-modal'); handleApproveDonation('${d.donation_id}');">
          Approve & Email
        </button>
      ` : ''}
      ${d.email_status === 'Failed' ? `
        <button type="button" class="btn btn-primary btn-sm" onclick="closeAdminModal('view-donation-modal'); handleRetryDonationEmail('${d.donation_id}');">
          Retry Email
        </button>
      ` : ''}
    `;
  }

  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function closeAdminModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
}

