/**
 * AFTERWORD — ORDER TRAY & CART SUBSYSTEM
 * Handles local persistence, item calculations, slide-over drawer UI, and checkout.
 */

/**
 * In-memory representation of order tray items.
 * Each item has { name: string, price: number, category: string, quantity: number }.
 * @type {Array<{name: string, price: number, category: string, quantity: number}>}
 */
let cart = [];

/**
 * Loads order tray items from localStorage (`afterword_cart`).
 * Falls back to an empty array if storage is empty or corrupted.
 * Triggers an immediate UI update once loaded.
 */
function loadCart() {
  try {
    const saved = localStorage.getItem('afterword_cart');
    cart = saved ? JSON.parse(saved) : [];
  } catch (err) {
    cart = [];
  }
  updateCartUI();
}

/**
 * Serializes and persists current cart array to localStorage (`afterword_cart`).
 * Refreshes UI badges, totals, and drawer rows after saving.
 */
function saveCart() {
  try {
    localStorage.setItem('afterword_cart', JSON.stringify(cart));
  } catch (err) {
    console.error('Failed to persist cart to localStorage', err);
  }
  updateCartUI();
}

/**
 * Calculates total cumulative quantity of all items in the tray.
 * 
 * @returns {number} Sum of all item quantities.
 */
function getCartCount() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

/**
 * Calculates the pre-tax order subtotal.
 * 
 * @returns {number} Subtotal sum of (price * quantity) for all items.
 */
function getCartTotal() {
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

/**
 * Adds an item to the order tray, or increments its quantity if it already exists.
 * Automatically persists to storage and triggers the badge bounce animation.
 * 
 * @param {Object} item - Item details.
 * @param {string} item.name - Display name of item.
 * @param {number} item.price - Unit price in USD.
 * @param {string} [item.category='General'] - Department/category of item.
 */
function addToCart(item) {
  const existing = cart.find(i => i.name === item.name);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      name: item.name,
      price: item.price,
      category: item.category || 'General',
      quantity: 1
    });
  }
  saveCart();
  bounceBadge();
}

/**
 * Increments or decrements the quantity of an item at a specified cart index.
 * If quantity drops to 0 or below, the item is removed from the array.
 * 
 * @param {number} index - Index of the item in the `cart` array.
 * @param {number} change - Amount to adjust quantity by (+1 or -1).
 */
function updateCartQuantity(index, change) {
  if (!cart[index]) return;
  cart[index].quantity += change;
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }
  saveCart();
}

/**
 * Triggers a playful CSS bounce micro-animation on all visible `.cart-count-badge` elements.
 * Uses `void badge.offsetWidth` to force reflow so the animation re-triggers on consecutive clicks.
 */
function bounceBadge() {
  const badges = document.querySelectorAll('.cart-count-badge');
  badges.forEach(badge => {
    badge.classList.remove('badge-bounce');
    void badge.offsetWidth; // Force CSS reflow to re-trigger animation
    badge.classList.add('badge-bounce');
    setTimeout(() => badge.classList.remove('badge-bounce'), 250);
  });
}

/**
 * Synchronizes cart count indicators across the page:
 * - Updates numerical text inside `.cart-count-badge`
 * - Updates review tray labels (`.tray-item-count`)
 * - Calls `renderCartItems()` to refresh the slide-over drawer DOM
 */
function updateCartUI() {
  const count = getCartCount();
  
  // Update all count badges
  const badges = document.querySelectorAll('.cart-count-badge');
  badges.forEach(badge => {
    badge.textContent = count;
  });

  // Update in-page review tray labels
  const trayReviewLabels = document.querySelectorAll('.tray-item-count');
  trayReviewLabels.forEach(el => {
    el.textContent = `${count} Items`;
  });

  renderCartItems();
}

/**
 * Renders the HTML markup for cart items inside `#cart-items-container`.
 * - If empty: renders an illustrated empty state.
 * - If populated: renders item rows with quantity adjustment buttons (+/-), prices,
 *   and calculates subtotal, 8% sales tax, and final total due.
 */
function renderCartItems() {
  const itemsContainer = document.getElementById('cart-items-container');
  const subtotalEl = document.getElementById('cart-subtotal');
  const taxEl = document.getElementById('cart-tax');
  const totalEl = document.getElementById('cart-total');

  if (!itemsContainer) return;

  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-empty-state">
        <span class="material-symbols-outlined cart-empty-icon">shopping_bag</span>
        <p class="cart-empty-title">Your tray is currently empty.</p>
        <span class="cart-empty-desc">Add fresh pastries, espresso roasts, or botanical stems.</span>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = '₱0.00';
    if (taxEl) taxEl.textContent = '₱0.00';
    if (totalEl) totalEl.textContent = '₱0.00';
    return;
  }

  const subtotal = getCartTotal();
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  itemsContainer.innerHTML = cart.map((item, index) => `
    <div class="cart-item-row">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-meta">${item.category} · ₱${item.price.toFixed(2)} each</div>
      </div>
      <div class="cart-item-qty">
        <button class="cart-qty-btn" data-qty-action="decrease" data-index="${index}" aria-label="Decrease quantity of ${item.name}">−</button>
        <span class="cart-qty-count">${item.quantity}</span>
        <button class="cart-qty-btn" data-qty-action="increase" data-index="${index}" aria-label="Increase quantity of ${item.name}">+</button>
      </div>
      <div class="cart-item-price">₱${(item.price * item.quantity).toFixed(2)}</div>
    </div>
  `).join('');

  if (subtotalEl) subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
  if (taxEl) taxEl.textContent = `₱${tax.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `₱${total.toFixed(2)}`;
}

/**
 * Slides open the cart drawer overlay and panel.
 * Re-renders cart items to ensure latest data is displayed.
 */
function openCart() {
  const cartOverlay = document.getElementById('cart-overlay');
  const cartDrawer = document.getElementById('cart-drawer');
  if (cartOverlay && cartDrawer) {
    cartOverlay.classList.add('open');
    cartDrawer.classList.add('open');
    renderCartItems();
  }
}

/**
 * Closes the cart drawer overlay and panel by removing the `.open` class.
 */
function closeCart() {
  const cartOverlay = document.getElementById('cart-overlay');
  const cartDrawer = document.getElementById('cart-drawer');
  if (cartOverlay && cartDrawer) {
    cartOverlay.classList.remove('open');
    cartDrawer.classList.remove('open');
  }
}

/**
 * Initializes the entire cart subsystem:
 * - Loads items from localStorage
 * - Binds drawer open and close click handlers
 * - Implements event delegation on `#cart-items-container` for quantity buttons
 * - Binds document click handler for `[data-add-to-cart]` buttons
 * - Attaches handlers for "Clear Tray" and "Checkout" actions
 */
function initCart() {
  loadCart();

  // Attach drawer open triggers
  const cartToggleBtns = document.querySelectorAll('.cart-toggle-btn, [data-action="open-cart"]');
  cartToggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openCart();
    });
  });

  // Attach drawer close triggers
  const cartCloseBtn = document.getElementById('cart-close-btn');
  const cartOverlay = document.getElementById('cart-overlay');
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  // Event delegation for cart item quantity buttons (replaces inline onclick)
  const itemsContainer = document.getElementById('cart-items-container');
  if (itemsContainer) {
    itemsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-qty-action]');
      if (!btn) return;
      
      const action = btn.getAttribute('data-qty-action');
      const index = parseInt(btn.getAttribute('data-index'), 10);
      if (isNaN(index)) return;

      if (action === 'increase') {
        updateCartQuantity(index, 1);
      } else if (action === 'decrease') {
        updateCartQuantity(index, -1);
      }
    });
  }

  // Bind global "+ Add to Order" buttons
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-add-to-cart]');
    if (!target) return;

    const name = target.getAttribute('data-name') || 'Item';
    const price = parseFloat(target.getAttribute('data-price') || '0');
    const category = target.getAttribute('data-category') || 'General';

    addToCart({ name, price, category });
    showToast(`Added "${name}" to your tray`, 'shopping_bag');
  });

  // Clear Cart Button
  const clearCartBtn = document.getElementById('clear-cart-btn');
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', () => {
      cart = [];
      saveCart();
      showToast('Tray cleared', 'delete_outline');
    });
  }

  // Checkout Button
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
      if (cart.length === 0) {
        showToast('Your tray is currently empty', 'info');
        return;
      }
      const tableNum = localStorage.getItem('afterword_table_num') || '';
      const destination = tableNum ? `Delivering to Table #${tableNum}` : 'Ready for Counter Pickup';

      const origText = checkoutBtn.textContent;
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Transmitting Order...';

      // Get real Supabase user ID if available
      const userId = (typeof getSupabaseUserId === 'function') ? getSupabaseUserId() : null;

      try {
        const api = window.AfterwordAPI || (typeof AfterwordAPI !== 'undefined' ? AfterwordAPI : null);
        let res;

        const payload = {
          orderType: tableNum ? 'in_seat' : 'counter_pickup',
          tableNumber: tableNum ? parseInt(tableNum, 10) : null,
          userId: userId,
          items: cart
        };

        if (api && typeof api.createOrder === 'function') {
          res = await api.createOrder(payload);
        } else {
          // Direct fallback fetch to backend Express server
          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(errJson.error || 'Failed to submit order to backend.');
          }
          res = await response.json();
        }

        const orderRef = res?.order?.order_number ? ` (${res.order.order_number})` : '';
        showToast(`Order Placed! Total: ₱${getCartTotal().toFixed(2)}${orderRef} — ${destination}`, 'check_circle');

        cart = [];
        saveCart();
        setTimeout(closeCart, 1400);
      } catch (err) {
        console.error('Order failed:', err);
        showToast(`Order failed: ${err.message}`, 'error');
      } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = origText;
      }
    });
  }
}
