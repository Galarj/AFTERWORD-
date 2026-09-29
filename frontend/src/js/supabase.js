/**
 * AFTERWORD — CLIENT-SIDE BACKEND & SUPABASE CONNECTOR
 * Provides unified access to the Node.js Express REST API.
 * All Supabase operations go through the backend (which uses service_role key).
 * Auth operations use the backend /api/auth/* endpoints.
 */

const SUPABASE_CONFIG = {
  url: 'https://iqsgmkufptdqkdxskgde.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxc2dta3VmcHRkcWtkeHNrZ2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNjA2MzUsImV4cCI6MjEwNTczNjYzNX0.fW_BUDsKShvUlJoRGCRlA1ia5uA1PcSzX06WPhG99pM',
  apiBaseUrl: '/api'
};

// REST API Fetch Wrapper (Calling backend Express server)
async function apiFetch(endpoint, options = {}) {
  const url = `${SUPABASE_CONFIG.apiBaseUrl}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || `API error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Fetch failed on ${endpoint}:`, err);
    throw err;
  }
}

// Convenience Data Helpers
const AfterwordAPI = {
  // Auth
  async signup(email, password, fullName) {
    return apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName })
    });
  },

  async login(email, password) {
    return apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  // Books / Stacks
  async getBooks(search = '', category = '') {
    const params = new URLSearchParams();
    if (search) params.append('q', search);
    if (category) params.append('category', category);
    return apiFetch(`/books?${params.toString()}`);
  },

  async addBook(bookData) {
    return apiFetch('/books', {
      method: 'POST',
      body: JSON.stringify(bookData)
    });
  },

  async updateBook(bookId, updates) {
    return apiFetch(`/books/${bookId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async deleteBook(bookId) {
    return apiFetch(`/books/${bookId}`, {
      method: 'DELETE'
    });
  },

  // Products (Cafe / Flowers)
  async getProducts(type = '', category = '') {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (category) params.append('category', category);
    return apiFetch(`/products?${params.toString()}`);
  },

  async getAllProducts() {
    return apiFetch('/products?include_unavailable=true');
  },

  async addProduct(productData) {
    return apiFetch('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },

  async updateProduct(productId, updates) {
    return apiFetch(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async deleteProduct(productId) {
    return apiFetch(`/products/${productId}`, {
      method: 'DELETE'
    });
  },

  // Events Calendar
  async getEvents() {
    return apiFetch('/events');
  },

  async addEvent(eventData) {
    return apiFetch('/events', {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
  },

  async updateEvent(eventId, updates) {
    return apiFetch(`/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async deleteEvent(eventId) {
    return apiFetch(`/events/${eventId}`, {
      method: 'DELETE'
    });
  },

  // Create Order from Tray
  async createOrder(orderPayload) {
    return apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    });
  },

  // Get Orders (Admin)
  async getOrders(status = '') {
    const params = status ? `?status=${status}` : '';
    return apiFetch(`/orders${params}`);
  },

  // Update Order Status
  async updateOrderStatus(orderId, status) {
    return apiFetch(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  // Delete Single Order
  async deleteOrder(orderId) {
    return apiFetch(`/orders/${orderId}`, {
      method: 'DELETE'
    });
  },

  // Clear Completed Orders
  async clearCompletedOrders() {
    return apiFetch('/orders/completed', {
      method: 'DELETE'
    });
  },

  // Reserve Event Spot
  async createRSVP(eventId, userId, guestCount = 1) {
    return apiFetch('/rsvps', {
      method: 'POST',
      body: JSON.stringify({ eventId, userId, guestCount })
    });
  },

  // Get RSVPs
  async getRSVPs(eventId = '') {
    const params = eventId ? `?event_id=${eventId}` : '';
    return apiFetch(`/rsvps${params}`);
  },

  // Place Book Hold
  async createLoan(bookId, userId, days = 21) {
    return apiFetch('/loans', {
      method: 'POST',
      body: JSON.stringify({ bookId, userId, days })
    });
  },

  // Get all Loans (Admin)
  async getLoans() {
    return apiFetch('/loans');
  },

  // Return Book Loan
  async returnLoan(loanId) {
    return apiFetch(`/loans/${loanId}/return`, {
      method: 'POST'
    });
  },

  // Renew Book Loan
  async renewLoan(loanId, days = 14) {
    return apiFetch(`/loans/${loanId}/renew`, {
      method: 'POST',
      body: JSON.stringify({ days })
    });
  },

  // Update Loan Status
  async updateLoanStatus(loanId, status, notes = '') {
    return apiFetch(`/loans/${loanId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, notes })
    });
  },

  // Get Profiles (Admin)
  async getProfiles() {
    return apiFetch('/profiles');
  },

  // Get Categories
  async getCategories(type = '') {
    const params = type ? `?type=${type}` : '';
    return apiFetch(`/categories${params}`);
  },

  // Wishlist
  async getWishlist(userId) {
    return apiFetch(`/wishlist?user_id=${userId}`);
  },

  async addToWishlist(userId, bookId) {
    return apiFetch('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ userId, bookId })
    });
  },

  async removeFromWishlist(wishlistId) {
    return apiFetch(`/wishlist/${wishlistId}`, {
      method: 'DELETE'
    });
  },

  // User Profile
  async getUserProfile(userId) {
    return apiFetch(`/auth/profile/${userId}`);
  },

  // Notifications (loan status + order ready alerts)
  async getNotifications(userId) {
    return apiFetch(`/notifications/${userId}`);
  },

  // User-specific loans
  async getUserLoans(userId) {
    return apiFetch(`/loans?user_id=${userId}`);
  },

  // User-specific orders
  async getUserOrders(userId) {
    return apiFetch(`/orders?user_id=${userId}`);
  },

  // Book availability check
  async getBookAvailability(bookId) {
    return apiFetch(`/books/${bookId}/availability`);
  }
};

// Expose globally to window
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.AfterwordAPI = AfterwordAPI;
window.apiFetch = apiFetch;
