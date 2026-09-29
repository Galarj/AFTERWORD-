-- ============================================================================
-- AFTERWORD COMMUNITY HUB — DATABASE SEED DATA (PostgreSQL / Supabase)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. INSERT CATEGORIES
-- ----------------------------------------------------------------------------
INSERT INTO public.categories (name, slug, type) VALUES
-- Cafe Categories
('Coffee', 'coffee', 'cafe'),
('Drinks', 'drinks', 'cafe'),
('Food', 'food', 'cafe'),
-- Flower Categories
('Fresh Cut Bouquets', 'fresh', 'flowers'),
('Botanical & Dried', 'dried', 'flowers'),
-- Library Categories
('Novels & Stories', 'novels', 'books'),
('Manga', 'manga', 'books'),
('Essays & Memoir', 'essays', 'books'),
-- Event Categories
('Tabletop Games', 'games', 'events'),
('Book Reviews & Salons', 'salon', 'events'),
('Quiz & Trivia', 'quiz', 'events'),
('Gaming & Esports', 'gaming', 'events');

-- ----------------------------------------------------------------------------
-- 2. INSERT BOOKS (Matches library.html catalog)
-- ----------------------------------------------------------------------------
INSERT INTO public.books (isbn, title, author, description, category_id, publisher, year_published, shelf_location, total_copies, available_copies, image_url) VALUES
(
    '978-1974709939',
    'Chainsaw Man',
    'Tatsuki Fujimoto',
    'Denji''s life of poverty is turned upside down when he merges with his pet devil Pochita to become Chainsaw Man.',
    (SELECT category_id FROM public.categories WHERE slug = 'manga'),
    'VIZ Media',
    2020,
    'Shelf A-01',
    2,
    1,
    'assets/images/books/chainsawman.jpg'
),
(
    '978-0593638866',
    'Check & Mate',
    'Ali Hazelwood',
    'A witty, heartwarming rivals-to-lovers story set in the competitive world of high-stakes tournament chess.',
    (SELECT category_id FROM public.categories WHERE slug = 'novels'),
    'G.P. Putnam''s Sons',
    2023,
    'Shelf B-04',
    2,
    1,
    'assets/images/books/check and mate.jpg'
),
(
    '978-1635579383',
    'I Want to Die but I Want to Eat Tteokbokki',
    'Baek Se-hee',
    'An intimate, honest dialogue between author and therapist exploring persistent mild depression and finding joy in life''s small comforts.',
    (SELECT category_id FROM public.categories WHERE slug = 'essays'),
    'Bloomsbury Publishing',
    2022,
    'Shelf B-02',
    2,
    2,
    'assets/images/books/I want to die But I want to eat Tteokbokki.jpg'
),
(
    '978-0062315007',
    'The Alchemist',
    'Paulo Coelho',
    'The inspiring journey of Santiago, a shepherd boy who embarks on a quest to follow his dreams and discover his Personal Legend.',
    (SELECT category_id FROM public.categories WHERE slug = 'novels'),
    'HarperOne',
    1988,
    'Shelf A-05',
    2,
    1,
    'assets/images/books/the alchemist.jpg'
),
(
    '978-0593438466',
    'The Seven Year Slip',
    'Ashley Poston',
    'An overworked book publicist inherits an apartment that slips seven years into the past—and meets an aspiring chef from another time.',
    (SELECT category_id FROM public.categories WHERE slug = 'novels'),
    'Berkley',
    2023,
    'Shelf C-01',
    2,
    1,
    'assets/images/books/the seven year slip.jpg'
);

-- ----------------------------------------------------------------------------
-- 3. INSERT PRODUCTS (Café Menu & Botanical Stems)
-- ----------------------------------------------------------------------------
INSERT INTO public.products (name, description, price, stock, is_available, category_id, image_url) VALUES
-- Cafe Items
(
    'Americano',
    'Rich double shot of house espresso lengthened with hot water or poured over ice for a clean, bold coffee flavor.',
    110.00,
    100,
    TRUE,
    (SELECT category_id FROM public.categories WHERE slug = 'coffee'),
    'assets/images/coffee/americano.jpg'
),
(
    'Cappuccino',
    'Classic equal parts espresso, silky steamed milk, and a generous layer of dense, velvety microfoam.',
    125.00,
    80,
    TRUE,
    (SELECT category_id FROM public.categories WHERE slug = 'coffee'),
    'assets/images/coffee/cappuccino.jpg'
),
(
    'Caffè Latte',
    'Smooth, balanced espresso blended with gently textured whole or oat milk and finished with pouring latte art.',
    135.00,
    90,
    TRUE,
    (SELECT category_id FROM public.categories WHERE slug = 'coffee'),
    'assets/images/coffee/latte.jpg'
),
(
    'Dark Chocolate Mocha',
    'Full-bodied espresso stirred with melted bittersweet dark chocolate sauce, steamed milk, and dusted with cacao.',
    145.00,
    70,
    TRUE,
    (SELECT category_id FROM public.categories WHERE slug = 'coffee'),
    'assets/images/coffee/mocha.jpg'
),
(
    'Stone-Ground Uji Matcha',
    'Vibrant jade ceremonial matcha froth balanced with warm oat milk. Rich umami with sweet toasted nori notes.',
    150.00,
    35,
    TRUE,
    (SELECT category_id FROM public.categories WHERE slug = 'drinks'),
    'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80'
),
(
    'Sparkling Cascara Tonic',
    'Organic coffee cherry husk tisane steeped cold, lightly carbonated with fresh lemon verbena and mountain spring water.',
    130.00,
    40,
    TRUE,
    (SELECT category_id FROM public.categories WHERE slug = 'drinks'),
    'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80'
),
(
    'Cardamom Morning Knot',
    'Swedish-style braided butter brioche infused with freshly crushed green cardamom pods and raw pearl sugar crust.',
    120.00,
    20,
    TRUE,
    (SELECT category_id FROM public.categories WHERE slug = 'food'),
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'
),
(
    'Classic 72-Layer Croissant',
    'Shatteringly crisp honeycomb exterior giving way to an ethereal, buttery and lightly cultured sourdough interior.',
    115.00,
    25,
    TRUE,
    (SELECT category_id FROM public.categories WHERE slug = 'food'),
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80'
),
(
    'Hearth Rosemary & Olive Focaccia',
    'Stone-baked in cast iron with garden rosemary needles, flaked Maldon sea salt, and cold-pressed Sicilian olive oil.',
    140.00,
    15,
    TRUE,
    (SELECT category_id FROM public.categories WHERE slug = 'food'),
    'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=600&q=80'
),
-- Floral Studio Items
(
    'The Morning Mist Bunch',
    'An airy, romantic gathering of garden roses, feathery white astilbe, silver dollar eucalyptus, and sea lavender.',
    450.00,
    15,
    TRUE,
    (SELECT category_id FROM public.categories WHERE slug = 'fresh'),
    'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80'
),
(
    'Terracotta Ranunculus',
    'Warm autumnal bunch featuring apricot ranunculus, copper chrysanthemum, dried bunny tails, and golden wheat.',
    380.00,
    12,
    TRUE,
    (SELECT category_id FROM public.categories WHERE slug = 'fresh'),
    'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=600&q=80'
),
(
    'The Archival Dried Cloche',
    'Everlasting botanical arrangement enclosed under handblown bell jar glass with preserved pampas and lunaria.',
    550.00,
    8,
    TRUE,
    (SELECT category_id FROM public.categories WHERE slug = 'dried'),
    'https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=600&q=80'
);

-- ----------------------------------------------------------------------------
-- 4. INSERT EVENTS (Matches events.html calendar)
-- ----------------------------------------------------------------------------
INSERT INTO public.events (title, description, category_id, event_date, event_time, capacity, location, status) VALUES
(
    'Monthly Book Review & Cozy Reading Circle',
    'Bring your current favorite read or join us to review and discuss our monthly community pick! Warm drinks, cozy vibes, and great conversations.',
    (SELECT category_id FROM public.categories WHERE slug = 'salon'),
    '2026-10-17',
    '18:30:00',
    20,
    'Café Reading Corner',
    'Scheduled'
),
(
    'AFTERWORD Quiz Night: Pop Culture & Trivia',
    'Test your knowledge on movies, music, anime, pop culture, and random fun facts! Form a team or join one at the door. Prizes for top 3 teams!',
    (SELECT category_id FROM public.categories WHERE slug = 'quiz'),
    '2026-10-22',
    '19:00:00',
    40,
    'Café Main Room',
    'Scheduled'
),
(
    'Valorant 5v5 Community Tournament & Watch Party',
    '5v5 Swiftplay & Custom Lobby tournament! Bring your 5-stack or sign up solo to get matched. High-speed Wi-Fi, big screen stream, and free iced drinks for players.',
    (SELECT category_id FROM public.categories WHERE slug = 'gaming'),
    '2026-10-25',
    '14:00:00',
    32,
    'Main Room & Gaming Lounge',
    'Scheduled'
),
(
    'Friday Board Game & Chill Night',
    'Casual games night! Play Catan, Secret Hitler, Uno, Monopoly, Codenames, or bring your own tabletop games. Free snacks and tea provided!',
    (SELECT category_id FROM public.categories WHERE slug = 'games'),
    '2026-10-31',
    '18:00:00',
    35,
    'Café Main Room',
    'Scheduled'
);

