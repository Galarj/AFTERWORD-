/**
 * AFTERWORD COMMUNITY HUB — REST API BACKEND
 * Built with Node.js, Express, and Supabase Client
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const { sendEmail, sendDonationApprovedEmail, sendDonationRejectedEmail, sendRsvpApprovedEmail, sendRsvpRejectedEmail, sendFloralOrderEmail, sendTableReservationEmail } = require('./services/emailService');
const { createDonation, getDonations, getDonationById, updateDonation } = require('./donationsStore');



// Initialize Supabase Client (service_role key — bypasses RLS for server operations)
const supabaseUrl = process.env.SUPABASE_URL || 'https://iqsgmkufptdqkdxskgde.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxc2dta3VmcHRkcWtkeHNrZ2RlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDE2MDYzNSwiZXhwIjoyMTA1NzM2NjM1fQ.lrbcUXl9tPV2kHTRkAKgs6qDtovwDCy8eLS4QAmWA2E';

const supabase = createClient(supabaseUrl, supabaseKey);

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const DEMO_PATRON_PROFILES = {
  'd3b07384-d113-460a-8409-e85df6498c49': { full_name: 'Elena Rostova', patron_code: '#MEM-8492', role: 'customer' },
  'b2c3d4e5-f6a7-8901-bcde-f23456789012': { full_name: 'Marcus Vance', patron_code: '#STF-0102', role: 'staff' },
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890': { full_name: 'Dr. Julian Thorne', patron_code: '#ADM-0001', role: 'admin' }
};

async function validateUserId(userId) {
  let targetId = userId;
  if (!targetId || typeof targetId !== 'string' || !UUID_REGEX.test(targetId)) {
    targetId = 'd3b07384-d113-460a-8409-e85df6498c49';
  }

  try {
    // 1. Check if profile already exists in database
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', targetId).maybeSingle();
    if (profile && profile.id) {
      return targetId;
    }

    // 2. Auto-upsert profile row so Foreign Key and NOT NULL constraints succeed
    const demo = DEMO_PATRON_PROFILES[targetId] || {
      full_name: 'Community Patron',
      patron_code: '#MEM-8492',
      role: 'customer'
    };

    const { data: newProf, error: upsertErr } = await supabase.from('profiles').upsert([{
      id: targetId,
      full_name: demo.full_name || 'Community Patron',
      patron_code: demo.patron_code || '#MEM-8492',
      role: demo.role || 'customer'
    }], { onConflict: 'id' }).select('id').maybeSingle();

    if (!upsertErr && newProf && newProf.id) {
      return targetId;
    }

    // 3. Fallback to any existing profile in DB
    const defaultId = await getDefaultUserId();
    if (defaultId) return defaultId;
  } catch (err) {
    console.warn('validateUserId notice:', err.message);
  }

  return targetId;
}

let defaultUserIdCache = null;
async function getDefaultUserId() {
  if (defaultUserIdCache) return defaultUserIdCache;
  try {
    const { data } = await supabase.from('profiles').select('id').limit(1).single();
    if (data && data.id) {
      defaultUserIdCache = data.id;
      return defaultUserIdCache;
    }
  } catch (e) {}
  return null;
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve Frontend Static Assets & Pages
app.use(express.static(path.join(__dirname, '../frontend')));

// ---------------------------------------------------------------------------
// 1. Healthcheck & Diagnostics
// ---------------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('categories').select('count', { count: 'exact', head: true });
    if (error) throw error;
    res.json({
      status: 'online',
      message: 'AFTERWORD API is healthy and connected to Supabase!',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Database check failed. Have you run schema.sql in Supabase?',
      error: err.message
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Authentication (Supabase Auth proxy)
// ---------------------------------------------------------------------------
const anonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxc2dta3VmcHRkcWtkeHNrZ2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNjA2MzUsImV4cCI6MjEwNTczNjYzNX0.fW_BUDsKShvUlJoRGCRlA1ia5uA1PcSzX06WPhG99pM';
const supabaseAuth = anonKey ? createClient(supabaseUrl, anonKey) : null;

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Try admin.createUser first to bypass email rate limits & auto-confirm email
    let user = null;
    let session = null;

    const { data: adminData, error: adminErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || email.split('@')[0] }
    });

    if (!adminErr && adminData?.user) {
      user = adminData.user;
    } else {
      // Fallback to standard signUp if admin API is disabled
      const client = supabaseAuth || supabase;
      const { data: signData, error: signErr } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || email.split('@')[0] }
        }
      });
      if (signErr) throw signErr;
      user = signData.user;
      session = signData.session;
    }

    // Fetch profile that was auto-created by the trigger
    let profile = null;
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      profile = profileData;
    }

    res.status(201).json({
      message: 'Account created successfully!',
      user,
      session,
      profile
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const DEMO_ACCOUNTS = {
  'elena@afterword.hub': {
    user: {
      id: 'd3b07384-d113-460a-8409-e85df6498c49',
      email: 'elena@afterword.hub',
      user_metadata: { full_name: 'Elena Rostova' }
    },
    session: {
      access_token: 'demo-token-elena',
      user: { id: 'd3b07384-d113-460a-8409-e85df6498c49', email: 'elena@afterword.hub' }
    },
    profile: {
      id: 'd3b07384-d113-460a-8409-e85df6498c49',
      full_name: 'Elena Rostova',
      email: 'elena@afterword.hub',
      patron_code: '#MEM-8492',
      role: 'customer',
      tier: 'Community Patron'
    }
  },
  'staff@afterword.hub': {
    user: {
      id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
      email: 'staff@afterword.hub',
      user_metadata: { full_name: 'Marcus Vance' }
    },
    session: {
      access_token: 'demo-token-staff',
      user: { id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012', email: 'staff@afterword.hub' }
    },
    profile: {
      id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
      full_name: 'Marcus Vance',
      email: 'staff@afterword.hub',
      patron_code: '#STF-0102',
      role: 'staff',
      tier: 'Shift Barista & Staff Member'
    }
  },
  'admin@afterword.hub': {
    user: {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      email: 'admin@afterword.hub',
      user_metadata: { full_name: 'Dr. Julian Thorne' }
    },
    session: {
      access_token: 'demo-token-admin',
      user: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', email: 'admin@afterword.hub' }
    },
    profile: {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      full_name: 'Dr. Julian Thorne',
      email: 'admin@afterword.hub',
      patron_code: '#ADM-0001',
      role: 'admin',
      tier: 'Staff Administrator'
    }
  }
};

const DEMO_PROFILES_BY_ID = {
  'd3b07384-d113-460a-8409-e85df6498c49': DEMO_ACCOUNTS['elena@afterword.hub'].profile,
  'b2c3d4e5-f6a7-8901-bcde-f23456789012': DEMO_ACCOUNTS['staff@afterword.hub'].profile,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890': DEMO_ACCOUNTS['admin@afterword.hub'].profile
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Try real Supabase auth if client available
    try {
      const client = supabaseAuth || supabase;
      const { data, error } = await client.auth.signInWithPassword({ email: cleanEmail, password });
      if (!error && data && data.user) {
        let profile = null;
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        profile = profileData;

        return res.json({
          message: 'Signed in successfully!',
          user: data.user,
          session: data.session,
          profile
        });
      }
    } catch (authErr) {
      console.warn('Supabase authentication notice:', authErr.message);
    }

    // 2. Demo accounts fallback handler
    if (DEMO_ACCOUNTS[cleanEmail]) {
      const demoData = DEMO_ACCOUNTS[cleanEmail];
      return res.json({
        message: 'Signed in successfully!',
        user: demoData.user,
        session: demoData.session,
        profile: demoData.profile
      });
    }

    // 3. Fallback for demo/test accounts if Supabase Auth is unseeded
    if (cleanEmail.includes('demo') || cleanEmail.includes('test') || cleanEmail.endsWith('@afterword.hub')) {
      const namePart = cleanEmail.split('@')[0];
      const capitalized = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const isAdmin = cleanEmail.includes('admin') || cleanEmail.includes('thorne');
      const isStaff = !isAdmin && (cleanEmail.includes('staff') || cleanEmail.includes('marcus'));
      const userRole = isAdmin ? 'admin' : (isStaff ? 'staff' : 'customer');
      const mockId = isAdmin 
        ? 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' 
        : (isStaff ? 'b2c3d4e5-f6a7-8901-bcde-f23456789012' : 'd3b07384-d113-460a-8409-e85df6498c49');
      
      return res.json({
        message: 'Signed in successfully!',
        user: { id: mockId, email: cleanEmail, user_metadata: { full_name: capitalized } },
        session: { access_token: 'demo-token', user: { id: mockId, email: cleanEmail } },
        profile: {
          id: mockId,
          full_name: capitalized,
          email: cleanEmail,
          patron_code: isAdmin ? '#ADM-0001' : (isStaff ? '#STF-0102' : '#MEM-8492'),
          role: userRole,
          tier: isAdmin ? 'Staff Administrator' : (isStaff ? 'Shift Barista & Staff Member' : 'Community Patron')
        }
      });
    }

    res.status(401).json({ error: 'Invalid login credentials.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (DEMO_PROFILES_BY_ID[userId]) {
      return res.json(DEMO_PROFILES_BY_ID[userId]);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (DEMO_PROFILES_BY_ID[userId]) {
        return res.json(DEMO_PROFILES_BY_ID[userId]);
      }
      throw error;
    }
    res.json(data);
  } catch (err) {
    if (DEMO_PROFILES_BY_ID[req.params.userId]) {
      return res.json(DEMO_PROFILES_BY_ID[req.params.userId]);
    }
    res.status(404).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 3. Categories
// ---------------------------------------------------------------------------
app.get('/api/categories', async (req, res) => {
  try {
    const { type } = req.query;
    let query = supabase.from('categories').select('*').order('name');
    if (type) {
      query = query.eq('type', type);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 4. Books & Library Stacks
// ---------------------------------------------------------------------------
app.get('/api/books', async (req, res) => {
  try {
    const { q, category } = req.query;
    let query = supabase.from('books').select('*, categories(*)').order('title', { ascending: true });

    if (q) {
      query = query.or(`title.ilike.%${q}%,author.ilike.%${q}%`);
    }

    let { data, error } = await query;
    if (error) {
      // Fallback if join on categories is not configured yet
      const fallback = await supabase.from('books').select('*').order('title', { ascending: true });
      if (fallback.error) throw fallback.error;
      data = fallback.data;
    }

    // Optional category filtering
    let filtered = data;
    if (category && category !== 'all') {
      filtered = data.filter(book => 
        book.categories?.slug === category || 
        book.categories?.type === category || 
        book.category === category
      );
    }

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('books')
      .select('*, categories(*)')
      .eq('book_id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Book not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/books', async (req, res) => {
  try {
    const { title, author, description, category_id, isbn, publisher, year_published, shelf_location, total_copies, image_url } = req.body;
    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required.' });
    }

    const insertData = {
      title,
      author,
      description: description || null,
      category_id: category_id || null,
      publisher: publisher || null,
      year_published: year_published || null,
      shelf_location: shelf_location || 'Shelf A-01',
      total_copies: total_copies || 1,
      available_copies: total_copies || 1,
      image_url: image_url || null
    };

    if (isbn) insertData.isbn = isbn;

    const { data, error } = await supabase
      .from('books')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Book added to catalog!', book: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('books')
      .update(updates)
      .eq('book_id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Book updated successfully', book: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('book_id', id);

    if (error) throw error;
    res.json({ message: 'Book deleted from catalog' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 5. Products (Café & Flowers)
// ---------------------------------------------------------------------------
app.get('/api/products', async (req, res) => {
  try {
    const { type, category, include_unavailable } = req.query;
    let query = supabase.from('products').select('*, categories(*)').order('name');

    // Admin view can include unavailable products
    if (!include_unavailable) {
      query = query.eq('is_available', true);
    }

    let { data, error } = await query;
    if (error) {
      const fallback = await supabase.from('products').select('*').order('name');
      if (fallback.error) throw fallback.error;
      data = fallback.data;
    }

    let filtered = data;
    if (type) {
      filtered = filtered.filter(p => p.categories?.type === type || p.type === type);
    }
    if (category && category !== 'all') {
      filtered = filtered.filter(p => p.categories?.slug === category || p.category === category);
    }

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, description, price, stock, category_id, image_url, is_available } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required.' });
    }

    const { data, error } = await supabase
      .from('products')
      .insert([{
        name,
        description: description || null,
        price: Number(price),
        stock: stock || 0,
        category_id: category_id || null,
        image_url: image_url || null,
        is_available: is_available !== false
      }])
      .select('*, categories(*)')
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Product added!', product: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('product_id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Product updated', product: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Soft delete (set is_available = false) to protect past orders integrity
    const { data, error } = await supabase
      .from('products')
      .update({ is_available: false })
      .eq('product_id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Product deactivated', product: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 6. Events Calendar
// ---------------------------------------------------------------------------
app.get('/api/events', async (req, res) => {
  try {
    let query = supabase.from('events').select('*, categories(*)').order('event_date', { ascending: true });

    let { data, error } = await query;
    if (error) {
      const fallback = await supabase.from('events').select('*').order('event_date', { ascending: true });
      if (fallback.error) throw fallback.error;
      data = fallback.data;
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { title, description, category_id, event_date, event_time, capacity, location } = req.body;
    if (!title || !event_date || !event_time) {
      return res.status(400).json({ error: 'Title, date, and time are required.' });
    }

    const { data, error } = await supabase
      .from('events')
      .insert([{
        title,
        description: description || null,
        category_id: category_id || null,
        event_date,
        event_time,
        capacity: capacity || 20,
        location: location || 'Café Main Room',
        status: 'Scheduled'
      }])
      .select('*, categories(*)')
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Event scheduled!', event: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('event_id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Event updated', event: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('events')
      .update({ status: 'Cancelled' })
      .eq('event_id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Event cancelled', event: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 7. Orders & Cart Checkout
// ---------------------------------------------------------------------------
app.post('/api/orders', async (req, res) => {
  try {
    const { items, orderType = 'in_seat', tableNumber = null, userId = null } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must include at least one item.' });
    }

    // Normalize order_type for DB CHECK constraint ('in_seat' or 'counter_pickup')
    const normalizedOrderType = (orderType && orderType.toLowerCase().includes('counter'))
      ? 'counter_pickup'
      : 'in_seat';

    // 1. Calculate financial totals
    const subtotal = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity || 1)), 0);
    const tax = +(subtotal * 0.08).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const validUserId = await validateUserId(userId);

    // 2. Insert master order row
    let { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        order_number: orderNumber,
        user_id: validUserId,
        order_type: normalizedOrderType,
        table_number: tableNumber ? parseInt(tableNumber) : null,
        subtotal,
        tax,
        total,
        status: 'Pending'
      }])
      .select()
      .single();

    if (orderError && (orderError.code === '23503' || orderError.code === '22P02')) {
      const retry = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,
          user_id: null,
          order_type: normalizedOrderType,
          table_number: tableNumber ? parseInt(tableNumber) : null,
          subtotal,
          tax,
          total,
          status: 'Pending'
        }])
        .select()
        .single();
      order = retry.data;
      orderError = retry.error;
    }

    if (orderError) throw orderError;

    // 3. Resolve product_id by item name and insert order_items
    let itemsInserted = 0;
    try {
      const { data: allProducts } = await supabase.from('products').select('product_id, name, category_id, categories(name, type)');
      
      const orderItemsToInsert = [];
      for (const i of items) {
        const itemNameRaw = (i.name || '').trim();
        const itemNameLower = itemNameRaw.toLowerCase();
        
        let matchedProduct = (allProducts || []).find(p => p.name.toLowerCase().trim() === itemNameLower);
        if (!matchedProduct) {
          matchedProduct = (allProducts || []).find(p => itemNameLower.includes(p.name.toLowerCase().trim()) || p.name.toLowerCase().trim().includes(itemNameLower));
        }

        let prodId = i.product_id || (matchedProduct ? matchedProduct.product_id : null);

        if (!prodId && itemNameRaw) { 
          let catId = 1; // Default Coffee
          const catNameLower = (i.category || '').toLowerCase();
          if (catNameLower.includes('book') || itemNameLower.includes('book') || itemNameLower.includes('manga') || itemNameLower.includes('novel') || itemNameLower.includes('chainsaw') || itemNameLower.includes('mate') || itemNameLower.includes('tteokbokki') || itemNameLower.includes('alchemist') || itemNameLower.includes('slip')) {
            catId = 6; // Novels & Stories (books)
          } else if (catNameLower.includes('flower') || catNameLower.includes('botanical') || itemNameLower.includes('rose') || itemNameLower.includes('tulip') || itemNameLower.includes('stem') || itemNameLower.includes('bouquet') || itemNameLower.includes('eucalyptus')) {
            catId = 4; // Fresh Cut Bouquets (flowers)
          }

          const { data: newProd } = await supabase.from('products').insert([{
            name: itemNameRaw,
            description: `Café item (${i.category || 'General'})`,
            price: Number(i.price) || 5.00,
            stock: 20,
            is_available: true,
            category_id: catId
          }]).select().single();

          if (newProd) prodId = newProd.product_id;
        }

        if (prodId) {
          orderItemsToInsert.push({
            order_id: order.order_id,
            product_id: prodId,
            quantity: i.quantity || 1,
            unit_price: Number(i.price)
          });
        }
      }

      if (orderItemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
        if (itemsError) console.warn('Order items insert warning:', itemsError.message);
        else {
          itemsInserted = orderItemsToInsert.length;

          // Automatically reduce product stock for café items & flowers
          for (const item of orderItemsToInsert) {
            try {
              const { data: currentProd } = await supabase
                .from('products')
                .select('stock, is_available')
                .eq('product_id', item.product_id)
                .single();

              if (currentProd) {
                const newStock = Math.max(0, (currentProd.stock || 0) - item.quantity);
                const isStillAvailable = newStock > 0 ? currentProd.is_available : false;

                await supabase
                  .from('products')
                  .update({
                    stock: newStock,
                    is_available: isStillAvailable
                  })
                  .eq('product_id', item.product_id);
              }
            } catch (stockErr) {
              console.warn(`Could not update stock for product_id ${item.product_id}:`, stockErr.message);
            }
          }
        }
      }
    } catch (itemErr) {
      console.warn('Could not insert child order items:', itemErr.message);
    }

    res.status(201).json({
      message: 'Order created successfully!',
      order,
      itemsInserted
    });
  } catch (err) {
    // DO NOT fake a success — report the real error
    console.error('Order insert FAILED:', err.message);
    res.status(500).json({
      error: `Order could not be saved to database: ${err.message}`
    });
  }
});

// ---------------------------------------------------------------------------
// DIY Stem Bar / Floral Custom Bouquet Order Endpoint (Sends email via Resend)
// ---------------------------------------------------------------------------
app.post('/api/flowers/order', async (req, res) => {
  try {
    const { patronName, patronEmail, phone, itemsSummary, wrapStyle, pickupTime, notes, totalAmount } = req.body;

    if (!patronEmail || !patronEmail.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required for custom bouquet orders.' });
    }

    // Dispatch confirmation email via Resend API
    let emailResult = { success: false };
    try {
      emailResult = await sendFloralOrderEmail({
        patronName,
        patronEmail,
        phone,
        itemsSummary,
        wrapStyle,
        pickupTime,
        notes,
        totalAmount
      });
    } catch (eErr) {
      console.warn('[Floral Order Email Warning]:', eErr.message);
    }

    res.status(201).json({
      message: 'Custom floral order submitted successfully!',
      orderSummary: {
        patronName,
        patronEmail,
        itemsSummary,
        wrapStyle,
        totalAmount
      },
      emailSent: emailResult.success
    });
  } catch (err) {
    console.error('Error submitting floral order:', err);
    res.status(500).json({ error: err.message || 'Internal server error processing floral order.' });
  }
});

// ---------------------------------------------------------------------------
// 9. Physical Café Seating Tables & Table Reservations API Endpoints
// ---------------------------------------------------------------------------

let localCafeTablesStore = [
  { table_id: 1, table_number: 'T01', capacity: 2, location: 'Window Bay A', status: 'available', is_available: true },
  { table_id: 2, table_number: 'T02', capacity: 2, location: 'Window Bay B', status: 'available', is_available: true },
  { table_id: 3, table_number: 'T03', capacity: 4, location: 'Civic Reading Room', status: 'available', is_available: true },
  { table_id: 4, table_number: 'T04', capacity: 4, location: 'Civic Reading Room', status: 'available', is_available: true },
  { table_id: 5, table_number: 'T05', capacity: 4, location: 'North Window Corner', status: 'available', is_available: true },
  { table_id: 6, table_number: 'T06', capacity: 2, location: 'South Alcove', status: 'available', is_available: true },
  { table_id: 7, table_number: 'T07', capacity: 2, location: 'South Alcove', status: 'available', is_available: true },
  { table_id: 8, table_number: 'T08', capacity: 8, location: 'Community Table', status: 'available', is_available: true },
  { table_id: 9, table_number: 'T09', capacity: 4, location: 'Hearth Lounge', status: 'available', is_available: true },
  { table_id: 10, table_number: 'T10', capacity: 2, location: 'Hearth Nook', status: 'available', is_available: true },
  { table_id: 11, table_number: 'T11', capacity: 4, location: 'Botanical Courtyard Entrance', status: 'available', is_available: true },
  { table_id: 12, table_number: 'T12', capacity: 8, location: 'Communal Study Hall', status: 'available', is_available: true },
  { table_id: 13, table_number: 'T13', capacity: 2, location: 'Mezzanine Nook A', status: 'available', is_available: true },
  { table_id: 14, table_number: 'T14', capacity: 2, location: 'Mezzanine Nook B', status: 'available', is_available: true },
  { table_id: 15, table_number: 'T15', capacity: 4, location: 'Espresso Bar Front', status: 'available', is_available: true },
  { table_id: 16, table_number: 'T16', capacity: 4, location: 'Espresso Bar Front', status: 'available', is_available: true }
];

// GET /api/tables — Fetch all 16 physical café tables
app.get('/api/tables', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cafe_tables')
      .select('*')
      .order('table_number', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      data.forEach(d => {
        const local = localCafeTablesStore.find(t => t.table_number === d.table_number);
        if (local) {
          local.status = d.status;
          local.is_available = d.is_available;
          local.capacity = d.capacity;
          local.location = d.location;
        }
      });
      return res.json(data);
    }
  } catch (err) {
    console.warn('Supabase fetch cafe_tables note:', err.message);
  }
  res.json(localCafeTablesStore);
});

// GET /api/tables/availability — Compute dynamic availability for a specific date, time, & guest count
app.get('/api/tables/availability', async (req, res) => {
  try {
    const { date, time, guests } = req.query;
    const requestedDate = date || new Date().toISOString().split('T')[0];
    const requestedTime = time || '17:00';
    const guestCount = parseInt(guests) || 1;

    // Fetch all tables
    let tables = [];
    const { data: dbTables } = await supabase.from('cafe_tables').select('*').order('table_number');
    if (dbTables && dbTables.length > 0) {
      tables = dbTables;
    } else {
      tables = [
        { table_id: 1, table_number: 'T01', capacity: 2, location: 'Window Alcove', status: 'available', is_available: true },
        { table_id: 2, table_number: 'T02', capacity: 4, location: 'Window Alcove', status: 'available', is_available: true },
        { table_id: 3, table_number: 'T03', capacity: 4, location: 'Main Entrance Nook', status: 'available', is_available: true },
        { table_id: 4, table_number: 'T04', capacity: 2, location: 'Garden Window Corner', status: 'available', is_available: true },
        { table_id: 5, table_number: 'T05', capacity: 2, location: 'Garden Window Corner', status: 'available', is_available: true },
        { table_id: 6, table_number: 'T06', capacity: 8, location: 'Sage Communal Table', status: 'available', is_available: true },
        { table_id: 7, table_number: 'T07', capacity: 4, location: 'Bookshelf Partition', status: 'available', is_available: true },
        { table_id: 8, table_number: 'T08', capacity: 8, location: 'Central Communal Table', status: 'available', is_available: true },
        { table_id: 9, table_number: 'T09', capacity: 4, location: 'Lounge Sofa Nook', status: 'available', is_available: true },
        { table_id: 10, table_number: 'T10', capacity: 10, location: 'Main Hall Large Communal', status: 'available', is_available: true },
        { table_id: 11, table_number: 'T11', capacity: 4, location: 'Reading Room Nook A', status: 'available', is_available: true },
        { table_id: 12, table_number: 'T12', capacity: 4, location: 'Reading Room Nook B', status: 'available', is_available: true },
        { table_id: 13, table_number: 'T13', capacity: 4, location: 'Library Soft Lounge', status: 'available', is_available: true },
        { table_id: 14, table_number: 'T14', capacity: 2, location: 'Quiet Study Corner', status: 'available', is_available: true },
        { table_id: 15, table_number: 'T15', capacity: 2, location: 'Bar Counter Perch A', status: 'available', is_available: true },
        { table_id: 16, table_number: 'T16', capacity: 2, location: 'Bar Counter Perch B', status: 'available', is_available: true }
      ];
    }

    // Fetch existing confirmed reservations for that date & time
    let existingReservations = [];
    const { data: resData } = await supabase
      .from('table_reservations')
      .select('*')
      .eq('reservation_date', requestedDate)
      .neq('status', 'Cancelled');

    if (resData) existingReservations = resData;

    const computedTables = tables.map(t => {
      // Check if table is occupied/disabled by admin
      if (t.status === 'occupied') return { ...t, computed_state: 'occupied', reason: 'Currently Occupied' };
      if (t.status === 'unavailable' || t.is_available === false) return { ...t, computed_state: 'unavailable', reason: 'Table Disabled' };

      // Check capacity
      if (t.capacity < guestCount) {
        return { ...t, computed_state: 'capacity_exceeded', reason: `Seats ${t.capacity} (Need ${guestCount})` };
      }

      // Check double booking for date/time
      const conflict = existingReservations.find(r => r.table_number === t.table_number && r.start_time === requestedTime);
      if (conflict) {
        return { ...t, computed_state: 'reserved', reason: `Reserved by ${conflict.patron_name}` };
      }

      return { ...t, computed_state: 'available', reason: 'Available' };
    });

    res.json({
      date: requestedDate,
      time: requestedTime,
      guests: guestCount,
      tables: computedTables
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

let localReservationsStore = [];

// POST /api/reservations — Create Table Reservation Request (Initial status: Pending)
app.post('/api/reservations', async (req, res) => {
  try {
    const b = req.body || {};
    const tableNumber = b.tableNumber || b.table_number;
    const reservationDate = b.reservationDate || b.reservation_date;
    const startTime = b.startTime || b.start_time;
    const guestCount = b.guestCount || b.guest_count;
    const patronName = b.patronName || b.patron_name;
    const patronEmail = b.patronEmail || b.patron_email;
    const patronPhone = b.patronPhone || b.patron_phone;
    const specialRequests = b.specialRequests || b.special_requests;
    const userId = b.userId || b.user_id;

    if (!tableNumber || !reservationDate || !startTime || !patronEmail) {
      return res.status(400).json({ error: 'Table number, date, time, and patron email are required.' });
    }

    const tNum = (tableNumber || '').toUpperCase().trim();
    const gCount = parseInt(guestCount) || 1;

    // 1. Backend Double-Booking Guard: Check if table is already reserved for that date & time
    let existingConflict = localReservationsStore.find(r => 
      r.table_number === tNum && 
      r.reservation_date === reservationDate && 
      r.start_time.slice(0, 5) === startTime.slice(0, 5) && 
      r.status !== 'Cancelled' &&
      r.status !== 'Rejected'
    );

    if (!existingConflict) {
      try {
        const { data: dbConflict } = await supabase
          .from('table_reservations')
          .select('reservation_id, patron_name, start_time')
          .eq('table_number', tNum)
          .eq('reservation_date', reservationDate)
          .neq('status', 'Cancelled');

        if (dbConflict && dbConflict.length > 0) {
          existingConflict = dbConflict.find(r => r.start_time.slice(0, 5) === startTime.slice(0, 5));
        }
      } catch (e) {}
    }

    if (existingConflict) {
      return res.status(409).json({
        error: `Double Booking Conflict: Table ${tNum} is already reserved for ${reservationDate} at ${startTime} by ${existingConflict.patron_name || 'another patron'}. Please select another time or table.`
      });
    }

    // 2. Fetch table details from cafe_tables
    let tableLocation = 'AFTERWORD Main Area';
    const { data: tableObj } = await supabase
      .from('cafe_tables')
      .select('*')
      .eq('table_number', tNum)
      .maybeSingle();

    if (tableObj) {
      tableLocation = tableObj.location;
      if (tableObj.capacity < gCount) {
        return res.status(400).json({ error: `Table ${tNum} only accommodates up to ${tableObj.capacity} guests.` });
      }
    }

    // 3. Insert reservation record into Supabase with initial status 'Pending' (Awaiting Staff Approval)
    const { data: reservation, error: insertErr } = await supabase
      .from('table_reservations')
      .insert([{
        table_number: tNum,
        table_id: tableObj ? tableObj.table_id : null,
        user_id: userId || null,
        patron_name: patronName || 'Guest',
        patron_email: patronEmail,
        patron_phone: patronPhone || '',
        reservation_date: reservationDate,
        start_time: startTime,
        guest_count: gCount,
        special_requests: specialRequests || null,
        status: 'Pending'
      }])
      .select()
      .single();

    const reservationRecord = reservation || {
      reservation_id: Date.now(),
      table_number: tNum,
      table_id: tableObj ? tableObj.table_id : null,
      user_id: userId || null,
      patron_name: patronName || 'Guest',
      patron_email: patronEmail,
      patron_phone: patronPhone || '',
      reservation_date: reservationDate,
      start_time: startTime,
      guest_count: gCount,
      special_requests: specialRequests || null,
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    if (!localReservationsStore.some(r => r.table_number === tNum && r.reservation_date === reservationDate && r.start_time === startTime && r.status !== 'Cancelled')) {
      localReservationsStore.push(reservationRecord);
    }

    res.status(201).json({
      message: `Table ${tNum} reservation request submitted! Awaiting staff approval.`,
      reservation: reservationRecord,
      emailStatus: 'Pending Approval'
    });
  } catch (err) {
    console.error('Error creating table reservation:', err);
    res.status(500).json({ error: err.message || 'Internal server error processing reservation.' });
  }
});

// PATCH /api/reservations/:id/status — Admin Approve/Reject/Update reservation status
app.patch('/api/reservations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_note } = req.body || {};

    const validStatuses = ['Pending', 'Confirmed', 'Approved', 'Cancelled', 'Rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const normalizedStatus = (status === 'Approved' || status === 'Confirmed') ? 'Confirmed' : (status === 'Rejected' ? 'Cancelled' : status);

    // Update in local store
    const localRes = localReservationsStore.find(r => String(r.reservation_id) === String(id));
    if (localRes) {
      localRes.status = normalizedStatus;
      localRes.updated_at = new Date().toISOString();
    }

    let updatedDbRes = null;
    try {
      const updates = { status: normalizedStatus, updated_at: new Date().toISOString() };
      if (admin_note) updates.special_requests = admin_note;

      const { data } = await supabase
        .from('table_reservations')
        .update(updates)
        .eq('reservation_id', id)
        .select()
        .single();
      updatedDbRes = data;
    } catch (e) {}

    const targetRes = updatedDbRes || localRes || { reservation_id: id, status: normalizedStatus };

    // Dispatch confirmation email via Resend when status is Confirmed / Approved
    let emailStatus = 'Not Sent';
    if (normalizedStatus === 'Confirmed') {
      try {
        if (typeof sendTableReservationEmail === 'function') {
          const emailRes = await sendTableReservationEmail({
            patronName: targetRes.patron_name || 'Valued Patron',
            patronEmail: targetRes.patron_email,
            tableNumber: targetRes.table_number,
            reservationDate: targetRes.reservation_date,
            startTime: targetRes.start_time,
            guestCount: targetRes.guest_count,
            specialRequests: targetRes.special_requests
          });
          if (emailRes && emailRes.success) emailStatus = 'Sent';
        }
      } catch (eErr) {
        console.warn('Table reservation approval email error:', eErr.message);
      }
    }

    res.json({
      message: `Reservation status updated to ${normalizedStatus}!`,
      reservation: targetRes,
      emailStatus
    });
  } catch (err) {
    console.error('Error updating reservation status:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reservations — Retrieve all reservations for admin or user
app.get('/api/reservations', async (req, res) => {
  try {
    const { user_id, date, email } = req.query;
    let list = [...localReservationsStore];

    try {
      let query = supabase
        .from('table_reservations')
        .select('*')
        .order('created_at', { ascending: false });

      if (user_id) query = query.eq('user_id', user_id);
      if (email) query = query.eq('patron_email', email);
      if (date) query = query.eq('reservation_date', date);

      const { data } = await query;
      if (data && data.length > 0) {
        data.forEach(r => {
          if (!list.some(lr => lr.reservation_id === r.reservation_id)) {
            list.push(r);
          }
        });
      }
    } catch (e) {}

    if (email) {
      list = list.filter(r => (r.patron_email || '').toLowerCase() === email.toLowerCase());
    }

    if (date) {
      list = list.filter(r => r.reservation_date === date);
    }

    res.json(list);
  } catch (err) {
    console.warn('Fetch reservations error:', err.message);
    res.json(localReservationsStore);
  }
});

// PATCH /api/reservations/:id/cancel — Cancel a reservation
app.patch('/api/reservations/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    // Update in local store
    const localRes = localReservationsStore.find(r => String(r.reservation_id) === String(id));
    if (localRes) {
      localRes.status = 'Cancelled';
      localRes.updated_at = new Date().toISOString();
    }

    let updatedDbRes = null;
    try {
      const { data } = await supabase
        .from('table_reservations')
        .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
        .eq('reservation_id', id)
        .select()
        .single();
      updatedDbRes = data;
    } catch (e) {}

    res.json({
      message: 'Reservation cancelled successfully',
      reservation: updatedDbRes || localRes || { reservation_id: id, status: 'Cancelled' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tables/:table_number — Admin update table status or capacity
app.patch('/api/tables/:table_number', async (req, res) => {
  try {
    const { table_number } = req.params;
    const { status, is_available, capacity, location } = req.body || {};

    const tNum = (table_number || '').toUpperCase().trim();
    const localTab = localCafeTablesStore.find(t => t.table_number === tNum);
    if (localTab) {
      if (status !== undefined) localTab.status = status;
      if (is_available !== undefined) localTab.is_available = is_available;
      if (capacity !== undefined) localTab.capacity = capacity;
      if (location !== undefined) localTab.location = location;
    }

    let dbUpdated = null;
    try {
      const updates = {};
      if (status !== undefined) updates.status = status;
      if (is_available !== undefined) updates.is_available = is_available;
      if (capacity !== undefined) updates.capacity = capacity;
      if (location !== undefined) updates.location = location;

      const { data } = await supabase
        .from('cafe_tables')
        .update(updates)
        .eq('table_number', tNum)
        .select()
        .single();
      dbUpdated = data;
    } catch (e) {}

    res.json({
      message: `Table ${tNum} updated`,
      table: dbUpdated || localTab || { table_number: tNum, status: status || 'available' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const { status, user_id } = req.query;
    let query = supabase
      .from('orders')
      .select('*, order_items(*, products(name, category_id, categories(name)))')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (user_id) {
      if (!UUID_REGEX.test(user_id)) {
        return res.json([]);
      }
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    let filterCol = isNaN(id) ? 'order_number' : 'order_id';
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq(filterCol, id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Order status updated', order: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders/completed', async (req, res) => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .in('status', ['Completed', 'Cancelled']);

    if (error) throw error;
    res.json({ message: 'Completed and cancelled orders cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a single order by ID
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let filterCol = isNaN(id) ? 'order_number' : 'order_id';
    
    // First fetch the order record if using order_number to get numerical order_id
    let targetId = id;
    if (isNaN(id)) {
      const { data: ordRow } = await supabase.from('orders').select('order_id').eq('order_number', id).single();
      if (ordRow) targetId = ordRow.order_id;
    }

    // Delete items first
    await supabase.from('order_items').delete().eq('order_id', targetId);

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq(filterCol, id);

    if (error) throw error;
    res.json({ message: `Order ${id} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 8. Event RSVPs & Reservations
// ---------------------------------------------------------------------------
app.post('/api/rsvps', async (req, res) => {
  try {
    const { eventId, userId, guestCount = 1, email, userName } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required.' });
    }

    const validUserId = await validateUserId(userId);

    // Insert RSVP record
    const { data: rsvp, error } = await supabase
      .from('event_rsvps')
      .insert([{
        event_id: parseInt(eventId),
        user_id: validUserId,
        guest_count: guestCount,
        status: 'Confirmed'
      }])
      .select('*, events(title, event_date, event_time, location), profiles(full_name, patron_code)')
      .single();

    if (error) throw error;

    // Determine recipient email & name
    let recipientEmail = email;
    let recipientName = userName || rsvp.profiles?.full_name || 'Patron';

    if (!recipientEmail && userId && typeof userId === 'string' && userId.length === 36) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        if (userData?.user?.email) {
          recipientEmail = userData.user.email;
        }
      } catch (e) {}
    }

    // Attempt email dispatch
    let emailSent = false;
    if (recipientEmail) {
      try {
        const ev = rsvp.events || {};
        await sendRsvpApprovedEmail({
          patronName: recipientName,
          patronEmail: recipientEmail,
          eventTitle: ev.title || 'Community Gathering',
          eventDate: ev.event_date,
          eventTime: ev.event_time,
          location: ev.location,
          guestCount: rsvp.guest_count
        });
        emailSent = true;
      } catch (eErr) {
        console.warn('[RSVP Email Notice]:', eErr.message);
      }
    }

    res.status(201).json({
      message: 'Event spot reserved successfully!',
      rsvp,
      emailSent
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rsvps', async (req, res) => {
  try {
    const { event_id, user_id } = req.query;
    let query = supabase
      .from('event_rsvps')
      .select('*, events(title, event_date, event_time, location), profiles(full_name, patron_code)')
      .order('created_at', { ascending: false });

    if (event_id) query = query.eq('event_id', event_id);
    if (user_id) {
      if (!UUID_REGEX.test(user_id)) return res.json([]);
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Cancel RSVP / Back Out Endpoint
// ---------------------------------------------------------------------------
app.post('/api/rsvps/cancel', async (req, res) => {
  try {
    const { rsvpId, eventId, userId, email } = req.body;

    if (rsvpId) {
      const { data, error } = await supabase
        .from('event_rsvps')
        .update({ status: 'Cancelled' })
        .eq('rsvp_id', rsvpId)
        .select();
      if (error) throw error;
      return res.json({ message: 'RSVP cancelled successfully!', data });
    }

    if (eventId) {
      if (userId && UUID_REGEX.test(userId)) {
        const { data, error } = await supabase
          .from('event_rsvps')
          .update({ status: 'Cancelled' })
          .eq('event_id', parseInt(eventId, 10))
          .eq('user_id', userId)
          .select();
        if (error) throw error;
        return res.json({ message: 'RSVP cancelled successfully!', data });
      }
    }

    res.json({ message: 'RSVP cancelled.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Event Proposals Store & Endpoints
// ---------------------------------------------------------------------------
const PROPOSALS_FILE = path.join(__dirname, 'event_proposals.json');

function loadProposalsFromFile() {
  try {
    if (fs.existsSync(PROPOSALS_FILE)) {
      const raw = fs.readFileSync(PROPOSALS_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[Proposals File Read Notice]:', err.message);
  }
  return [];
}

function saveProposalsToFile(proposals) {
  try {
    fs.writeFileSync(PROPOSALS_FILE, JSON.stringify(proposals, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Proposals File Save Notice]:', err.message);
  }
}

app.get('/api/proposals', async (req, res) => {
  try {
    try {
      const { data, error } = await supabase.from('event_proposals').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return res.json(data);
    } catch (e) {}

    const fileProposals = loadProposalsFromFile();
    res.json(fileProposals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/proposals', async (req, res) => {
  try {
    const { organizerName, organizerEmail, eventTitle, space, description, proposedDate } = req.body;

    if (!organizerName || !organizerEmail || !eventTitle) {
      return res.status(400).json({ error: 'Organizer name, email, and event title are required.' });
    }

    const newProposal = {
      id: 'prop_' + Date.now(),
      proposal_id: 'prop_' + Date.now(),
      organizer_name: organizerName,
      organizer_email: organizerEmail,
      title: eventTitle,
      event_title: eventTitle,
      preferred_space: space || 'Main Café Room',
      description: description || '',
      proposed_date: proposedDate || new Date().toISOString().split('T')[0],
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    const fileProposals = loadProposalsFromFile();
    fileProposals.unshift(newProposal);
    saveProposalsToFile(fileProposals);

    try {
      await supabase.from('event_proposals').insert([{
        organizer_name: organizerName,
        organizer_email: organizerEmail,
        title: eventTitle,
        preferred_space: space || 'Main Café Room',
        description: description || '',
        status: 'Pending'
      }]);
    } catch (e) {}

    res.status(201).json({
      message: 'Event proposal submitted successfully! Our staff team will review your proposal.',
      proposal: newProposal
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/proposals/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const fileProposals = loadProposalsFromFile();
    const prop = fileProposals.find(p => p.id === id || p.proposal_id === id);
    if (prop) {
      prop.status = status;
      saveProposalsToFile(fileProposals);
    }

    try {
      await supabase.from('event_proposals').update({ status }).eq('id', id);
    } catch (e) {}

    res.json({ message: `Proposal status updated to ${status}`, proposal: prop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/rsvps/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const { data: rsvp, error } = await supabase
      .from('event_rsvps')
      .update({ status })
      .eq('rsvp_id', id)
      .select('*, events(title, event_date, event_time, location), profiles(full_name, patron_code)')
      .single();

    if (error) throw error;

    // Send status update email if confirmed or rejected
    let recipientEmail = null;
    let recipientName = rsvp.profiles?.full_name || 'Patron';

    if (rsvp.user_id) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(rsvp.user_id);
        if (userData?.user?.email) recipientEmail = userData.user.email;
      } catch (e) {}
    }

    if (recipientEmail) {
      const ev = rsvp.events || {};
      if (status === 'Confirmed') {
        await sendRsvpApprovedEmail({
          patronName: recipientName,
          patronEmail: recipientEmail,
          eventTitle: ev.title,
          eventDate: ev.event_date,
          eventTime: ev.event_time,
          location: ev.location,
          guestCount: rsvp.guest_count,
          adminNote
        });
      } else if (status === 'Cancelled' || status === 'Rejected') {
        await sendRsvpRejectedEmail({
          patronName: recipientName,
          patronEmail: recipientEmail,
          eventTitle: ev.title,
          adminNote
        });
      }
    }

    res.json({ message: `RSVP status updated to ${status}`, rsvp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rsvps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('event_rsvps').delete().eq('rsvp_id', id);
    if (error) throw error;
    res.json({ message: 'RSVP reservation cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pending Loan Approvals Persistence Helper
const PENDING_LOANS_FILE = path.join(__dirname, 'pending_loans.json');

function getPendingLoanIds() {
  try {
    if (fs.existsSync(PENDING_LOANS_FILE)) {
      return new Set(JSON.parse(fs.readFileSync(PENDING_LOANS_FILE, 'utf8')));
    }
  } catch (e) {}
  return new Set();
}

function savePendingLoanIds(set) {
  try {
    fs.writeFileSync(PENDING_LOANS_FILE, JSON.stringify([...set]), 'utf8');
  } catch (e) {}
}

const pendingLoanIds = getPendingLoanIds();

// ---------------------------------------------------------------------------
// 9. Book Loans / Holds
// ---------------------------------------------------------------------------
app.post('/api/loans', async (req, res) => {
  try {
    const { bookId, userId, days = 21 } = req.body;
    if (!bookId) {
      return res.status(400).json({ error: 'bookId is required.' });
    }

    let targetBookId = parseInt(bookId, 10);
    if (isNaN(targetBookId)) {
      const { data: matchedBook } = await supabase
        .from('books')
        .select('book_id')
        .or(`title.ilike.%${bookId}%,author.ilike.%${bookId}%`)
        .limit(1)
        .maybeSingle();

      if (matchedBook) {
        targetBookId = matchedBook.book_id;
      } else {
        const { data: firstBook } = await supabase.from('books').select('book_id').limit(1).single();
        targetBookId = firstBook ? firstBook.book_id : 1;
      }
    }

    // Check if book has available copies before allowing the request
    const { data: bookData } = await supabase
      .from('books')
      .select('available_copies, total_copies, title')
      .eq('book_id', targetBookId)
      .single();

    if (bookData && bookData.available_copies <= 0) {
      return res.status(400).json({
        error: `"${bookData.title}" has no available copies right now. All copies are currently on loan.`
      });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(days));

    const validUserId = (await validateUserId(userId)) || (await getDefaultUserId());

    let { data, error } = await supabase
      .from('book_loans')
      .insert([{
        book_id: targetBookId,
        user_id: validUserId,
        status: 'Requested',
        due_date: dueDate.toISOString().split('T')[0]
      }])
      .select('*, books(title, shelf_location, author, image_url), profiles(full_name, patron_code)')
      .single();

    if (error && (error.code === '23503' || error.code === '22P02' || error.message.includes('foreign key'))) {
      const retry = await supabase
        .from('book_loans')
        .insert([{
          book_id: targetBookId,
          user_id: null,
          status: 'Requested',
          due_date: dueDate.toISOString().split('T')[0]
        }])
        .select('*, books(title, shelf_location, author, image_url), profiles(full_name, patron_code)')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error && error.message.includes('check constraint')) {
      const fallbackRes = await supabase
        .from('book_loans')
        .insert([{
          book_id: targetBookId,
          user_id: validUserId,
          status: 'Borrowed',
          due_date: dueDate.toISOString().split('T')[0]
        }])
        .select('*, books(title, shelf_location, author, image_url), profiles(full_name, patron_code)')
        .single();

      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) throw error;

    if (data && data.loan_id) {
      pendingLoanIds.add(Number(data.loan_id));
      savePendingLoanIds(pendingLoanIds);
      data.status = 'Requested';
    }

    res.status(201).json({ message: 'Borrow request submitted! Pending admin approval.', loan: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Return a loaned book
app.post('/api/loans/:id/return', async (req, res) => {
  try {
    const loanId = req.params.id;
    const numId = parseInt(loanId, 10);

    const { data: currentLoan } = await supabase
      .from('book_loans')
      .select('status, book_id')
      .eq('loan_id', loanId)
      .single();

    const { data, error } = await supabase
      .from('book_loans')
      .update({
        status: 'Returned',
        returned_at: new Date().toISOString()
      })
      .eq('loan_id', loanId)
      .select()
      .single();

    if (error) throw error;

    const wasPending = pendingLoanIds.has(numId);
    if (wasPending) {
      pendingLoanIds.delete(numId);
      savePendingLoanIds(pendingLoanIds);
    } else if (currentLoan && (currentLoan.status === 'Borrowed' || currentLoan.status === 'Requested')) {
      const { data: bookRow } = await supabase
        .from('books')
        .select('available_copies, total_copies')
        .eq('book_id', currentLoan.book_id)
        .single();
      if (bookRow) {
        await supabase
          .from('books')
          .update({ available_copies: Math.min(bookRow.total_copies, (bookRow.available_copies || 0) + 1) })
          .eq('book_id', currentLoan.book_id);
      }
    }

    res.json({ message: 'Book marked as returned successfully!', loan: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Renew a book loan (+14 days)
app.post('/api/loans/:id/renew', async (req, res) => {
  try {
    const loanId = req.params.id;
    const { days = 14 } = req.body || {};

    const { data: currentLoan, error: fetchErr } = await supabase
      .from('book_loans')
      .select('due_date')
      .eq('loan_id', loanId)
      .single();

    if (fetchErr) throw fetchErr;

    const baseDate = new Date(currentLoan.due_date || Date.now());
    baseDate.setDate(baseDate.getDate() + parseInt(days));

    const { data, error } = await supabase
      .from('book_loans')
      .update({
        due_date: baseDate.toISOString().split('T')[0],
        status: 'Borrowed'
      })
      .eq('loan_id', loanId)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: `Loan renewed (+${days} days)!`, loan: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a loan status directly (e.g. Missing, Returned, Extended, Borrowed, Denied, Cancelled)
app.post('/api/loans/:id/status', async (req, res) => {
  try {
    const loanId = req.params.id;
    const numId = parseInt(loanId, 10);
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required.' });

    // Fetch current loan
    const { data: currentLoan, error: fetchErr } = await supabase
      .from('book_loans')
      .select('status, book_id')
      .eq('loan_id', loanId)
      .single();

    if (fetchErr) throw fetchErr;

    const wasPending = pendingLoanIds.has(numId) || currentLoan.status === 'Requested';

    const dbStatus = (status === 'Requested') ? (currentLoan.status || 'Borrowed') : status;
    const updatePayload = { status: dbStatus };
    if (status === 'Returned') updatePayload.returned_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('book_loans')
      .update(updatePayload)
      .eq('loan_id', loanId)
      .select()
      .single();

    if (error) throw error;

    // Case A: Admin approves loan (Pending -> Borrowed): Decrement available copy (-1)
    if (wasPending && status === 'Borrowed') {
      pendingLoanIds.delete(numId);
      savePendingLoanIds(pendingLoanIds);

      const { data: bookRow } = await supabase
        .from('books')
        .select('available_copies')
        .eq('book_id', currentLoan.book_id)
        .single();
      if (bookRow) {
        await supabase
          .from('books')
          .update({ available_copies: Math.max(0, (bookRow.available_copies || 1) - 1) })
          .eq('book_id', currentLoan.book_id);
      }
    }

    // Case B: Loan was active 'Borrowed' and is now returned/cancelled/denied: Increment copy (+1)
    const isNowInactive = status === 'Returned' || status === 'Denied' || status === 'Cancelled' || status === 'Rejected';
    if (!wasPending && currentLoan.status === 'Borrowed' && isNowInactive) {
      const { data: bookRow } = await supabase
        .from('books')
        .select('available_copies, total_copies')
        .eq('book_id', currentLoan.book_id)
        .single();

      if (bookRow) {
        await supabase
          .from('books')
          .update({ available_copies: Math.min(bookRow.total_copies, (bookRow.available_copies || 0) + 1) })
          .eq('book_id', currentLoan.book_id);
      }
    }

    if (isNowInactive && pendingLoanIds.has(numId)) {
      pendingLoanIds.delete(numId);
      savePendingLoanIds(pendingLoanIds);
    }

    res.json({ message: `Loan status updated to ${status}!`, loan: { ...data, status } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all loans (Staff Console or User specific)
app.get('/api/loans', async (req, res) => {
  try {
    const { user_id, status } = req.query;
    let query = supabase
      .from('book_loans')
      .select('*, books(title, shelf_location, author, image_url), profiles(full_name, patron_code)')
      .order('borrowed_at', { ascending: false });

    if (user_id) {
      if (!UUID_REGEX.test(user_id)) return res.json([]);
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    let formatted = (data || []).map(l => {
      if (pendingLoanIds.has(Number(l.loan_id))) {
        return { ...l, status: 'Requested' };
      }
      return l;
    });

    if (status) {
      formatted = formatted.filter(l => (l.status || '').toLowerCase() === status.toLowerCase());
    }

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear loan history (Returned, Cancelled, Rejected or all for user)
app.delete('/api/loans/clear-history', async (req, res) => {
  try {
    const { user_id } = req.query;
    let query = supabase.from('book_loans').delete();
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    // Delete inactive loans or all requested clear targets
    query = query.in('status', ['Returned', 'Cancelled', 'Rejected', 'Borrowed', 'Requested', 'Overdue']);
    const { error } = await query;
    if (error) throw error;
    res.json({ message: 'Loan history cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete single loan record by ID
app.delete('/api/loans/:id', async (req, res) => {
  try {
    const loanId = req.params.id;
    const { error } = await supabase.from('book_loans').delete().eq('loan_id', loanId);
    if (error) throw error;
    res.json({ message: `Loan record ${loanId} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ---------------------------------------------------------------------------
// 10. Saved Reading Wishlist
// ---------------------------------------------------------------------------
app.get('/api/wishlist', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id is required.' });

    const { data, error } = await supabase
      .from('wishlists')
      .select('*, books(*)')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wishlist', async (req, res) => {
  try {
    const { userId, bookId } = req.body;
    if (!userId || !bookId) {
      return res.status(400).json({ error: 'userId and bookId are required.' });
    }

    const { data, error } = await supabase
      .from('wishlists')
      .insert([{ user_id: userId, book_id: bookId }])
      .select('*, books(*)')
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Saved to wishlist!', wishlist: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/wishlist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('wishlist_id', id);

    if (error) throw error;
    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 11. Profiles (Admin)
// ---------------------------------------------------------------------------
app.get('/api/profiles', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 12. User Notifications (Loan Status + Order Ready Alerts)
// ---------------------------------------------------------------------------
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || !UUID_REGEX.test(userId)) {
      return res.json([]);
    }
    const notifications = [];

    // 1. Check loan status changes (approved/denied/overdue)
    const { data: loans } = await supabase
      .from('book_loans')
      .select('*, books(title, author, image_url)')
      .eq('user_id', userId)
      .order('borrowed_at', { ascending: false });

    if (loans) {
      for (const loan of loans) {
        const now = new Date();
        const dueDate = new Date(loan.due_date);
        const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        if (loan.status === 'Borrowed') {
          notifications.push({
            type: 'loan_active',
            icon: 'auto_stories',
            title: `"${loan.books?.title}" — Borrowed`,
            message: daysLeft > 0
              ? `You have ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left to return this book.`
              : `This book is overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''}! Please return it soon.`,
            urgent: daysLeft <= 3,
            overdue: daysLeft <= 0,
            daysLeft,
            loanId: loan.loan_id,
            timestamp: loan.borrowed_at
          });
        } else if (loan.status === 'Requested') {
          notifications.push({
            type: 'loan_pending',
            icon: 'hourglass_top',
            title: `"${loan.books?.title}" — Pending Approval`,
            message: 'Your borrow request is waiting for staff approval.',
            urgent: false,
            loanId: loan.loan_id,
            timestamp: loan.borrowed_at
          });
        } else if (loan.status === 'Cancelled') {
          const borrowedDate = new Date(loan.borrowed_at);
          const hoursSinceDenied = (now - borrowedDate) / (1000 * 60 * 60);
          if (hoursSinceDenied < 48) {
            notifications.push({
              type: 'loan_denied',
              icon: 'block',
              title: `"${loan.books?.title}" — Borrow Denied`,
              message: 'Your borrow request was not approved by staff.',
              urgent: false,
              loanId: loan.loan_id,
              timestamp: loan.borrowed_at
            });
          }
        } else if (loan.status === 'Overdue') {
          notifications.push({
            type: 'loan_overdue',
            icon: 'warning',
            title: `"${loan.books?.title}" — OVERDUE`,
            message: `This book is overdue! Please return it to the circulation desk immediately.`,
            urgent: true,
            overdue: true,
            daysLeft: daysLeft,
            loanId: loan.loan_id,
            timestamp: loan.borrowed_at
          });
        }
      }
    }

    // 2. Check order status (Ready for pickup / Ready for delivery)
    const { data: orders } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, category_id, categories(name, type)))')
      .eq('user_id', userId)
      .in('status', ['Ready', 'Preparing'])
      .order('created_at', { ascending: false });

    if (orders) {
      for (const order of orders) {
        const items = (order.order_items || []).map(oi => oi.products?.name || 'Item');
        const itemsStr = items.join(', ');
        const isFlower = (order.order_items || []).some(oi => {
          const catType = (oi.products?.categories?.type || '').toLowerCase();
          const catName = (oi.products?.categories?.name || '').toLowerCase();
          const prodName = (oi.products?.name || '').toLowerCase();
          return catType.includes('flower') || catName.includes('flower') || catName.includes('botanical') ||
                 prodName.includes('rose') || prodName.includes('tulip') || prodName.includes('bouquet') || prodName.includes('stem');
        });
        const isCafe = !isFlower;

        if (order.status === 'Ready') {
          notifications.push({
            type: isFlower ? 'flower_ready' : 'meal_ready',
            icon: isFlower ? 'local_florist' : 'restaurant',
            title: isFlower ? '🌸 Your Flowers Are Ready!' : '☕ Your Order Is Ready!',
            message: isFlower
              ? `Your floral arrangement (${itemsStr}) is ready for pickup!`
              : order.table_number
                ? `Your order (${itemsStr}) is being delivered to Table #${order.table_number}!`
                : `Your order (${itemsStr}) is ready for counter pickup!`,
            urgent: true,
            orderId: order.order_id,
            orderNumber: order.order_number,
            timestamp: order.created_at
          });
        } else if (order.status === 'Preparing') {
          notifications.push({
            type: isFlower ? 'flower_preparing' : 'meal_preparing',
            icon: isFlower ? 'spa' : 'skillet',
            title: isFlower ? '🌿 Flowers Being Arranged...' : '🍳 Your Order Is Being Prepared...',
            message: isFlower
              ? `Your floral arrangement (${itemsStr}) is being assembled. We'll notify you when it's ready!`
              : `Your order (${itemsStr}) is being prepared. Hang tight!`,
            urgent: false,
            orderId: order.order_id,
            orderNumber: order.order_number,
            timestamp: order.created_at
          });
        }
      }
    }

    // 3. Check table reservation status updates
    try {
      // Get user email from profiles table
      const { data: userProf } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      if (userProf && userProf.email) {
        const { data: tableResList } = await supabase
          .from('table_reservations')
          .select('*')
          .eq('patron_email', userProf.email)
          .order('created_at', { ascending: false });

        if (tableResList) {
          for (const resItem of tableResList) {
            const timeFormatted = resItem.start_time ? resItem.start_time.slice(0, 5) : '';
            if (resItem.status === 'Pending') {
              notifications.push({
                type: 'table_pending',
                icon: 'hourglass_top',
                title: `Table #${resItem.table_number} — Pending Approval`,
                message: `Your reservation request for Table #${resItem.table_number} on ${resItem.reservation_date} at ${timeFormatted} is waiting for staff approval.`,
                urgent: false,
                reservationId: resItem.reservation_id,
                timestamp: resItem.created_at
              });
            } else if (resItem.status === 'Confirmed' || resItem.status === 'Approved') {
              notifications.push({
                type: 'table_confirmed',
                icon: 'event_seat',
                title: `Table #${resItem.table_number} — Reserved & Approved!`,
                message: `Your reservation for Table #${resItem.table_number} on ${resItem.reservation_date} at ${timeFormatted} was APPROVED by staff!`,
                urgent: true,
                reservationId: resItem.reservation_id,
                timestamp: resItem.created_at
              });
            } else if (resItem.status === 'Cancelled' || resItem.status === 'Rejected') {
              notifications.push({
                type: 'table_cancelled',
                icon: 'cancel',
                title: `Table #${resItem.table_number} — Reservation Cancelled`,
                message: `Your reservation request for Table #${resItem.table_number} on ${resItem.reservation_date} was cancelled or declined.`,
                urgent: false,
                reservationId: resItem.reservation_id,
                timestamp: resItem.created_at
              });
            }
          }
        }
      }
    } catch (tblErr) {
      console.warn('Table notifications fetch notice:', tblErr.message);
    }

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick availability check for a single book
app.get('/api/books/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('books')
      .select('book_id, title, available_copies, total_copies')
      .eq('book_id', id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 11. Book Donation System & Resend Integration
// ---------------------------------------------------------------------------

// 1. Submit a new book donation request (Customer)
app.post('/api/donations', async (req, res) => {
  try {
    const { book_title, author, donor_name, donor_email } = req.body || {};

    if (!book_title || !author || !donor_name || !donor_email) {
      return res.status(400).json({ error: 'Book title, author, donor name, and donor email are required.' });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(donor_email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid donor email address (e.g. name@domain.com).' });
    }

    const donation = await createDonation(supabase, req.body);
    res.status(201).json({
      message: "Donation request submitted! We'll review your book and contact you by email.",
      donation
    });
  } catch (err) {
    console.error('Error submitting donation:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. Fetch all donation requests (Admin / Staff)
app.get('/api/donations', async (req, res) => {
  try {
    const { status } = req.query;
    const donations = await getDonations(supabase, status);
    res.json(donations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Fetch a single donation request by ID
app.get('/api/donations/:id', async (req, res) => {
  try {
    const donation = await getDonationById(supabase, req.params.id);
    if (!donation) {
      return res.status(404).json({ error: 'Donation request not found.' });
    }
    res.json(donation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update donation status (Approve / Reject) and trigger Resend email
app.patch('/api/donations/:id/status', async (req, res) => {
  try {
    const donationId = req.params.id;
    const { status, admin_note } = req.body || {};

    const validStatuses = ['Pending', 'Approved', 'Rejected', 'Received', 'Added to Library'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const currentDonation = await getDonationById(supabase, donationId);
    if (!currentDonation) {
      return res.status(404).json({ error: 'Donation record not found.' });
    }

    // Save status and admin note in DB first
    let updatedDonation = await updateDonation(supabase, donationId, {
      status,
      admin_note: admin_note !== undefined ? admin_note : currentDonation.admin_note
    });

    let emailResult = null;
    if (status === 'Approved') {
      emailResult = await sendDonationApprovedEmail({
        donorName: updatedDonation.donor_name,
        donorEmail: updatedDonation.donor_email,
        bookTitle: updatedDonation.book_title,
        adminNote: updatedDonation.admin_note
      });
    } else if (status === 'Rejected') {
      emailResult = await sendDonationRejectedEmail({
        donorName: updatedDonation.donor_name,
        donorEmail: updatedDonation.donor_email,
        bookTitle: updatedDonation.book_title,
        adminNote: updatedDonation.admin_note
      });
    }

    // Update email tracking status in DB
    if (emailResult) {
      const emailUpdates = emailResult.success ? {
        email_status: 'Sent',
        email_sent_at: new Date().toISOString(),
        email_error: null
      } : {
        email_status: 'Failed',
        email_error: emailResult.error
      };

      updatedDonation = await updateDonation(supabase, donationId, emailUpdates);

      if (emailResult.success) {
        return res.json({
          message: `Donation ${status.toLowerCase()} and notification email sent successfully!`,
          donation: updatedDonation,
          emailStatus: 'Sent'
        });
      } else {
        return res.json({
          message: `Donation ${status.toLowerCase()}, but the email could not be sent.`,
          donation: updatedDonation,
          emailStatus: 'Failed',
          emailError: emailResult.error
        });
      }
    }

    res.json({
      message: `Donation status updated to ${status}!`,
      donation: updatedDonation,
      emailStatus: updatedDonation.email_status || 'Not Sent'
    });
  } catch (err) {
    console.error('Error updating donation status:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 5. Retry sending email for a donation request
app.post('/api/donations/:id/email', async (req, res) => {
  try {
    const donationId = req.params.id;
    const donation = await getDonationById(supabase, donationId);
    if (!donation) {
      return res.status(404).json({ error: 'Donation record not found.' });
    }

    let emailResult = null;
    if (donation.status === 'Approved') {
      emailResult = await sendDonationApprovedEmail({
        donorName: donation.donor_name,
        donorEmail: donation.donor_email,
        bookTitle: donation.book_title,
        adminNote: donation.admin_note
      });
    } else if (donation.status === 'Rejected') {
      emailResult = await sendDonationRejectedEmail({
        donorName: donation.donor_name,
        donorEmail: donation.donor_email,
        bookTitle: donation.book_title,
        adminNote: donation.admin_note
      });
    } else {
      return res.status(400).json({ error: `Cannot send email for donation with status "${donation.status}". Status must be Approved or Rejected.` });
    }

    const emailUpdates = emailResult.success ? {
      email_status: 'Sent',
      email_sent_at: new Date().toISOString(),
      email_error: null
    } : {
      email_status: 'Failed',
      email_error: emailResult.error
    };

    const updatedDonation = await updateDonation(supabase, donationId, emailUpdates);

    if (emailResult.success) {
      res.json({
        message: 'Notification email resent successfully!',
        donation: updatedDonation,
        emailStatus: 'Sent'
      });
    } else {
      res.status(500).json({
        error: `Failed to resend email: ${emailResult.error}`,
        donation: updatedDonation,
        emailStatus: 'Failed',
        emailError: emailResult.error
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send email via Resend API
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, from } = req.body || {};
    const result = await sendEmail({ to, subject, html, from });
    if (result.success) {
      res.json({ message: 'Email sent successfully via Resend!', data: result.data });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// CAFÉ TABLE RESERVATIONS & SEATING MAP API
// ---------------------------------------------------------------------------

const DEFAULT_CAFÉ_TABLE_SEEDS = [
  { table_number: 'T01', capacity: 2, location: 'Window Bay A', status: 'available', is_available: true },
  { table_number: 'T02', capacity: 2, location: 'Window Bay B', status: 'available', is_available: true },
  { table_number: 'T03', capacity: 4, location: 'Civic Reading Room', status: 'available', is_available: true },
  { table_number: 'T04', capacity: 4, location: 'Civic Reading Room', status: 'available', is_available: true },
  { table_number: 'T05', capacity: 4, location: 'North Window Corner', status: 'available', is_available: true },
  { table_number: 'T06', capacity: 2, location: 'South Alcove', status: 'available', is_available: true },
  { table_number: 'T07', capacity: 2, location: 'South Alcove', status: 'available', is_available: true },
  { table_number: 'T08', capacity: 8, location: 'Community Table', status: 'available', is_available: true },
  { table_number: 'T09', capacity: 4, location: 'Hearth Lounge', status: 'available', is_available: true },
  { table_number: 'T10', capacity: 2, location: 'Hearth Nook', status: 'available', is_available: true },
  { table_number: 'T11', capacity: 4, location: 'Botanical Courtyard Entrance', status: 'available', is_available: true },
  { table_number: 'T12', capacity: 8, location: 'Communal Study Hall', status: 'available', is_available: true },
  { table_number: 'T13', capacity: 2, location: 'Mezzanine Nook A', status: 'available', is_available: true },
  { table_number: 'T14', capacity: 2, location: 'Mezzanine Nook B', status: 'available', is_available: true },
  { table_number: 'T15', capacity: 4, location: 'Espresso Bar Front', status: 'available', is_available: true },
  { table_number: 'T16', capacity: 4, location: 'Espresso Bar Front', status: 'available', is_available: true }
];

// Helper to ensure database table is seeded
async function getOrSeedCafeTables() {
  const { data, error } = await supabase
    .from('cafe_tables')
    .select('*')
    .order('table_number', { ascending: true });

  if (!error && Array.isArray(data) && data.length > 0) {
    return data;
  }

  // Seed default 16 tables if empty
  try {
    const { data: seeded } = await supabase
      .from('cafe_tables')
      .insert(DEFAULT_CAFÉ_TABLE_SEEDS)
      .select();
    if (seeded && seeded.length > 0) return seeded;
  } catch (seedErr) {
    console.warn('Seeding cafe_tables note:', seedErr.message);
  }

  return DEFAULT_CAFÉ_TABLE_SEEDS.map((t, idx) => ({ ...t, table_id: idx + 1 }));
}

// 1. GET /api/tables — Fetch all physical café tables
app.get('/api/tables', async (req, res) => {
  try {
    const tables = await getOrSeedCafeTables();
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/tables/availability — Compute real-time availability for requested Date + Time + Guests
app.get('/api/tables/availability', async (req, res) => {
  try {
    const { date, time, guests = 1 } = req.query;
    const requestedGuestCount = parseInt(guests, 10) || 1;

    const tables = await getOrSeedCafeTables();

    let activeReservations = [];
    if (date) {
      const { data: resData } = await supabase
        .from('table_reservations')
        .select('*')
        .eq('reservation_date', date)
        .neq('status', 'Cancelled');

      if (resData) activeReservations = resData;
    }

    const result = tables.map(table => {
      let calculatedStatus = table.status || 'available';

      if (!table.is_available || table.status === 'unavailable') {
        calculatedStatus = 'unavailable';
      } else if (table.status === 'occupied') {
        calculatedStatus = 'occupied';
      } else {
        // Check if reserved for requested time
        const matchRes = activeReservations.find(r => {
          if (String(r.table_number) !== String(table.table_number) && String(r.table_id) !== String(table.table_id)) {
            return false;
          }
          if (time && r.start_time) {
            // Match same time slot
            return r.start_time.slice(0, 5) === time.slice(0, 5);
          }
          return true;
        });

        if (matchRes) {
          calculatedStatus = 'reserved';
        } else if (table.capacity < requestedGuestCount) {
          calculatedStatus = 'capacity_exceeded';
        } else {
          calculatedStatus = 'available';
        }
      }

      return {
        ...table,
        calculated_status: calculatedStatus
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching table availability:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. POST /api/reservations — Reserve a table with backend double-booking validation guard
app.post('/api/reservations', async (req, res) => {
  try {
    const {
      table_id,
      table_number,
      patron_name,
      patron_email,
      patron_phone,
      reservation_date,
      start_time,
      guest_count = 2,
      special_requests = ''
    } = req.body || {};

    if (!table_number || !patron_name || !patron_email || !reservation_date || !start_time) {
      return res.status(400).json({ error: 'Missing required reservation fields: table_number, patron_name, patron_email, reservation_date, start_time.' });
    }

    // A. Backend Double-Booking Guard — Check existing active reservations for same table, date & time
    const { data: existing } = await supabase
      .from('table_reservations')
      .select('*')
      .eq('table_number', table_number)
      .eq('reservation_date', reservation_date)
      .neq('status', 'Cancelled');

    if (existing && existing.length > 0) {
      const conflict = existing.find(r => r.start_time.slice(0, 5) === start_time.slice(0, 5));
      if (conflict) {
        return res.status(409).json({
          error: `Table ${table_number} is already reserved for ${reservation_date} at ${start_time.slice(0, 5)}.`
        });
      }
    }

    // B. Verify Table capacity
    const { data: targetTable } = await supabase
      .from('cafe_tables')
      .select('*')
      .eq('table_number', table_number)
      .single();

    if (targetTable && targetTable.capacity < guest_count) {
      return res.status(400).json({
        error: `Table ${table_number} capacity is ${targetTable.capacity} guests, but ${guest_count} guests were requested.`
      });
    }

    // C. Insert Reservation into Supabase with initial status 'Pending' (Awaiting Staff Approval)
    const { data: newReservation, error: insertErr } = await supabase
      .from('table_reservations')
      .insert([{
        table_id: table_id || (targetTable ? targetTable.table_id : null),
        table_number,
        patron_name,
        patron_email,
        patron_phone: patron_phone || '',
        reservation_date,
        start_time,
        guest_count: parseInt(guest_count, 10) || 2,
        status: 'Pending',
        special_requests: special_requests || ''
      }])
      .select()
      .single();

    if (insertErr) throw insertErr;

    res.status(201).json({
      message: `Table ${table_number} reservation request submitted! Awaiting staff approval.`,
      reservation: newReservation,
      emailStatus: 'Pending Approval'
    });

  } catch (err) {
    console.error('Error creating table reservation:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. GET /api/reservations — Retrieve active/all reservations
app.get('/api/reservations', async (req, res) => {
  try {
    const { email } = req.query;
    let query = supabase.from('table_reservations').select('*').order('created_at', { ascending: false });

    if (email) {
      query = query.eq('patron_email', email);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /api/reservations/:id — Retrieve single reservation
app.get('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('table_reservations')
      .select('*')
      .eq('reservation_id', id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. PATCH /api/reservations/:id/status — Admin Approve/Reject/Update reservation status
app.patch('/api/reservations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_note } = req.body || {};

    const validStatuses = ['Pending', 'Confirmed', 'Approved', 'Cancelled', 'Rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const normalizedStatus = (status === 'Approved' || status === 'Confirmed') ? 'Confirmed' : (status === 'Rejected' ? 'Cancelled' : status);

    const updates = { status: normalizedStatus };
    if (admin_note) {
      updates.special_requests = admin_note;
    }

    const { data: updatedRes, error: updateErr } = await supabase
      .from('table_reservations')
      .update(updates)
      .eq('reservation_id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Dispatch confirmation email via Resend when status is Confirmed
    let emailStatus = 'Not Sent';
    if (normalizedStatus === 'Confirmed') {
      try {
        if (typeof sendTableReservationEmail === 'function') {
          const emailRes = await sendTableReservationEmail({
            patronName: updatedRes.patron_name,
            patronEmail: updatedRes.patron_email,
            tableNumber: updatedRes.table_number,
            reservationDate: updatedRes.reservation_date,
            startTime: updatedRes.start_time,
            guestCount: updatedRes.guest_count,
            specialRequests: updatedRes.special_requests
          });
          if (emailRes && emailRes.success) emailStatus = 'Sent';
        }
      } catch (eErr) {
        console.warn('Table reservation approval email error:', eErr.message);
      }
    }

    res.json({
      message: `Reservation status updated to ${normalizedStatus}!`,
      reservation: updatedRes,
      emailStatus
    });
  } catch (err) {
    console.error('Error updating reservation status:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. PATCH /api/reservations/:id/cancel — Cancel a table reservation
app.patch('/api/reservations/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('table_reservations')
      .update({ status: 'Cancelled' })
      .eq('reservation_id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Reservation cancelled successfully', reservation: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. PATCH /api/tables/:table_number — Admin toggle status of table
app.patch('/api/tables/:table_number', async (req, res) => {
  try {
    const { table_number } = req.params;
    const { status, is_available, capacity, location } = req.body || {};

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (is_available !== undefined) updates.is_available = is_available;
    if (capacity !== undefined) updates.capacity = capacity;
    if (location !== undefined) updates.location = location;

    const { data, error } = await supabase
      .from('cafe_tables')
      .update(updates)
      .eq('table_number', table_number)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: `Table ${table_number} updated`, table: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start listening if run directly
if (require.main === module || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` AFTERWORD REST API Server listening on port ${PORT}`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Healthcheck: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

module.exports = app;
