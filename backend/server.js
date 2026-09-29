/**
 * AFTERWORD COMMUNITY HUB — REST API BACKEND
 * Built with Node.js, Express, and Supabase Client
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const { sendEmail, sendDonationApprovedEmail, sendDonationRejectedEmail } = require('./services/emailService');
const { createDonation, getDonations, getDonationById, updateDonation } = require('./donationsStore');



// Initialize Supabase Client (service_role key — bypasses RLS for server operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_KEY must be defined in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
const anonKey = process.env.SUPABASE_ANON_KEY;
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const client = supabaseAuth || supabase;
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Fetch profile
    let profile = null;
    if (data.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      profile = profileData;
    }

    res.json({
      message: 'Signed in successfully!',
      user: data.user,
      session: data.session,
      profile
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

app.get('/api/auth/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
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

    // 2. Insert master order row
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        order_number: orderNumber,
        user_id: userId || null,
        order_type: normalizedOrderType,
        table_number: tableNumber ? parseInt(tableNumber) : null,
        subtotal,
        tax,
        total,
        status: 'Pending'
      }])
      .select()
      .single();

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
// 8. Event RSVPs
// ---------------------------------------------------------------------------
app.post('/api/rsvps', async (req, res) => {
  try {
    const { eventId, userId, guestCount = 1 } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required.' });
    }

    const { data, error } = await supabase
      .from('event_rsvps')
      .insert([{
        event_id: eventId,
        user_id: userId || null,
        guest_count: guestCount,
        status: 'Confirmed'
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Spot reserved successfully!', rsvp: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rsvps', async (req, res) => {
  try {
    const { event_id, user_id } = req.query;
    let query = supabase.from('event_rsvps').select('*, events(title, event_date, event_time, location), profiles(full_name, patron_code)').order('created_at', { ascending: false });
    if (event_id) query = query.eq('event_id', event_id);
    if (user_id) query = query.eq('user_id', user_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pending Loan Approvals Persistence Helper
const fs = require('fs');
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

    let { data, error } = await supabase
      .from('book_loans')
      .insert([{
        book_id: targetBookId,
        user_id: userId || null,
        status: 'Requested',
        due_date: dueDate.toISOString().split('T')[0]
      }])
      .select('*, books(title, shelf_location, author, image_url), profiles(full_name, patron_code)')
      .single();

    if (error && error.message.includes('check constraint')) {
      const fallbackRes = await supabase
        .from('book_loans')
        .insert([{
          book_id: targetBookId,
          user_id: userId || null,
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

    if (user_id) query = query.eq('user_id', user_id);

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

// Start listening
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` AFTERWORD REST API Server listening on port ${PORT}`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Healthcheck: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
