/**
 * AFTERWORD — BOOK DONATIONS STORAGE & SUPABASE DATA PROVIDER
 * Seamlessly manages book donations via Supabase PostgreSQL table 'book_donations'
 * with automatic persistent local JSON fallback if DB table is uninitialized.
 */

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, 'donations_store.json');

function loadLocalStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Local donations store parse notice:', e.message);
  }
  return [];
}

function saveLocalStore(items) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(items, null, 2), 'utf8');
  } catch (e) {
    console.error('Local donations store save error:', e.message);
  }
}

/**
 * Creates a new donation record
 */
async function createDonation(supabase, payload) {
  const record = {
    book_title: payload.book_title,
    author: payload.author,
    summary: payload.summary || null,
    publisher: payload.publisher || null,
    year_published: payload.year_published ? parseInt(payload.year_published) : null,
    category: payload.category || 'General',
    condition: payload.condition || 'Good',
    donor_note: payload.donor_note || null,
    donor_name: payload.donor_name,
    donor_email: payload.donor_email,
    user_id: payload.user_id || null,
    status: 'Pending',
    admin_note: null,
    email_status: 'Not Sent',
    email_sent_at: null,
    email_error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('book_donations')
      .insert([record])
      .select()
      .single();

    if (!error && data) {
      return data;
    }
    console.warn('Supabase book_donations insert warning, fallback to local store:', error?.message);
  } catch (err) {
    console.warn('Supabase book_donations exception, fallback to local store:', err.message);
  }

  // Fallback Local Store
  const localItems = loadLocalStore();
  const nextId = localItems.length > 0 ? Math.max(...localItems.map(i => Number(i.donation_id) || 0)) + 1 : 1;
  const newRecord = { ...record, donation_id: nextId };
  localItems.unshift(newRecord);
  saveLocalStore(localItems);
  return newRecord;
}

/**
 * Fetches all donation records
 */
async function getDonations(supabase, filterStatus = null) {
  let dbItems = null;
  try {
    let query = supabase.from('book_donations').select('*').order('created_at', { ascending: false });
    if (filterStatus) query = query.eq('status', filterStatus);
    const { data, error } = await query;
    if (!error && data) {
      dbItems = data;
    }
  } catch (err) {}

  if (dbItems) return dbItems;

  // Fallback Local Store
  let items = loadLocalStore();
  if (filterStatus) {
    items = items.filter(i => (i.status || '').toLowerCase() === filterStatus.toLowerCase());
  }
  return items;
}

/**
 * Fetches a single donation record by ID
 */
async function getDonationById(supabase, donationId) {
  try {
    const { data, error } = await supabase
      .from('book_donations')
      .select('*')
      .eq('donation_id', donationId)
      .single();

    if (!error && data) return data;
  } catch (err) {}

  const localItems = loadLocalStore();
  return localItems.find(i => String(i.donation_id) === String(donationId)) || null;
}

/**
 * Updates a donation record by ID
 */
async function updateDonation(supabase, donationId, updates) {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  let updatedRow = null;
  try {
    const { data, error } = await supabase
      .from('book_donations')
      .update(payload)
      .eq('donation_id', donationId)
      .select()
      .single();

    if (!error && data) {
      updatedRow = data;
    }
  } catch (err) {}

  // Always sync local store for fallback safety
  const localItems = loadLocalStore();
  const idx = localItems.findIndex(i => String(i.donation_id) === String(donationId));
  if (idx !== -1) {
    localItems[idx] = { ...localItems[idx], ...payload };
    saveLocalStore(localItems);
    if (!updatedRow) updatedRow = localItems[idx];
  } else if (!updatedRow) {
    const newEntry = { donation_id: Number(donationId), ...payload };
    localItems.unshift(newEntry);
    saveLocalStore(localItems);
    updatedRow = newEntry;
  }

  return updatedRow;
}

module.exports = {
  createDonation,
  getDonations,
  getDonationById,
  updateDonation
};
