/**
 * ============================================================================
 * AFTERWORD — BOOK DETAILS DYNAMIC CONTROLLER
 * ============================================================================
 * Handles dynamic book loading on `book-details.html` via `?book=<id>`.
 * Features the 5 real books from the owner's personal collection.
 */

(function () {
  'use strict';

  const BOOKS_DATABASE = {
    chainsawman: {
      id: 'chainsawman',
      title: 'Chainsaw Man',
      subtitle: 'Vol. 1: Dog & Chainsaw',
      author: 'Tatsuki Fujimoto',
      category: 'Manga',
      categorySlug: 'manga',
      image: '../../assets/images/books/chainsawman.jpg',
      badge: 'MANGA',
      shelf: 'Shelf A-01',
      availableCopies: 'Available (1 Copy)',
      loadStatus: '1 of 2 Available',
      loadPercent: '50%',
      isbn: '978-1974709939',
      publisher: 'VIZ Media',
      pages: '192 Pages · Shonen Jump',
      price: '$12.00',
      buyPrice: '12.00',
      cartName: 'Book: Chainsaw Man Vol. 1',
      synopsis: 'Denji is a young man trapped in poverty, paying off his deceased father\'s astronomical debt to the yakuza by working as a devil hunter alongside Pochita, his chainsaw-dog demon companion. When a betrayal leaves him for dead, Pochita merges with Denji\'s heart, resurrecting him as Chainsaw Man.',
      ownerNote: 'One of the most kinetic, unpredictable shonen manga ever drawn. Tatsuki Fujimoto\'s cinematic paneling and darkly comedic storytelling make it impossible to put down. Grab an iced coffee and binge this in an afternoon.',
      tags: ['Shonen', 'Dark Fantasy', 'Action', 'Horror-Comedy', 'Manga'],
      reviews: [
        { author: 'Patron Marco', time: '2 days ago', note: 'Read the first four chapters while having an Americano. The pacing is relentless. Finished it before my ice melted.' },
        { author: 'Patron Mia', time: 'Last week', note: 'Fujimoto\'s art style is legendary. So happy to see real manga on the café shelves!' }
      ]
    },
    checkandmate: {
      id: 'checkandmate',
      title: 'Check & Mate',
      subtitle: 'A Chess Romance Novel',
      author: 'Ali Hazelwood',
      category: 'Novels & Stories',
      categorySlug: 'novels',
      image: '../../assets/images/books/check%20and%20mate.jpg',
      badge: 'ROMANCE',
      shelf: 'Shelf B-04',
      availableCopies: 'Available (1 Copy)',
      loadStatus: '1 of 2 Available',
      loadPercent: '50%',
      isbn: '978-0593638866',
      publisher: 'G.P. Putnam\'s Sons',
      pages: '368 Pages · Hardcover',
      price: '$18.50',
      buyPrice: '18.50',
      cartName: 'Book: Check & Mate',
      synopsis: 'Mallory Greenleaf is done with chess. Every love, every dream she had died when chess destroyed her family four years ago. Until she agrees to play in one last charity tournament and accidentally topples the reigning world champion, Nolan Sawyer—the bad boy of chess.',
      ownerNote: 'The banter in this book is elite. Hazelwood creates a charming, cozy, rivals-to-lovers dynamic in a competitive chess setting that feels fresh and uplifting. Perfect company for a warm latte.',
      tags: ['Romance', 'Contemporary', 'Rivals to Lovers', 'Young Adult', 'Chess'],
      reviews: [
        { author: 'Patron Sam', time: '3 days ago', note: 'The tension between Mallory and Nolan had me kicking my feet in the café booth.' },
        { author: 'Patron Claire', time: '2 weeks ago', note: 'Such a comforting, sweet read. If you like Queen\'s Gambit with rom-com energy, this is it.' }
      ]
    },
    tteokbokki: {
      id: 'tteokbokki',
      title: 'I Want to Die but I Want to Eat Tteokbokki',
      subtitle: 'Conversations with My Psychiatrist',
      author: 'Baek Se-hee',
      category: 'Essays & Memoir',
      categorySlug: 'essays',
      image: '../../assets/images/books/I%20want%20to%20die%20But%20I%20want%20to%20eat%20Tteokbokki.jpg',
      badge: 'MEMOIR',
      shelf: 'Shelf B-02',
      availableCopies: 'Available (2 Copies)',
      loadStatus: '2 of 2 Available',
      loadPercent: '100%',
      isbn: '978-1635579383',
      publisher: 'Bloomsbury Publishing',
      pages: '224 Pages · Paperback',
      price: '$16.00',
      buyPrice: '16.00',
      cartName: 'Book: I Want to Die but I Want to Eat Tteokbokki',
      synopsis: 'A recording of dialogues between the author and her psychiatrist over a twelve-week period, exploring dysthymia (persistent mild depression), self-doubt, and the little food cravings and daily rituals that keep us tethered to life.',
      ownerNote: 'Deeply comforting for anyone who feels functional on the outside but exhausted underneath. It reminds you that wanting to give up and still wanting a bowl of spicy rice cakes can exist in the exact same afternoon.',
      tags: ['Memoir', 'Mental Health', 'Essays', 'Korean Literature', 'Solace'],
      reviews: [
        { author: 'Patron Lea', time: 'Yesterday', note: 'Felt like a gentle hug. Sitting in the quiet corner with this and a hot tea was deeply healing.' },
        { author: 'Patron Eric', time: '5 days ago', note: 'Raw, vulnerable, and completely without pretense. Everyone should read this at least once.' }
      ]
    },
    alchemist: {
      id: 'alchemist',
      title: 'The Alchemist',
      subtitle: 'A Fable About Following Your Dream',
      author: 'Paulo Coelho',
      category: 'Novels & Stories',
      categorySlug: 'novels',
      image: '../../assets/images/books/the%20alchemist.jpg',
      badge: 'CLASSIC',
      shelf: 'Shelf A-05',
      availableCopies: 'Available (1 Copy)',
      loadStatus: '1 of 2 Available',
      loadPercent: '50%',
      isbn: '978-0062315007',
      publisher: 'HarperOne',
      pages: '208 Pages · Special Edition',
      price: '$14.50',
      buyPrice: '14.50',
      cartName: 'Book: The Alchemist',
      synopsis: 'The timeless tale of Santiago, an Andalusian shepherd boy who yearns to travel in search of a worldly treasure as extravagant as any ever found. The story of the treasures Santiago finds along the way teaches us about the essential wisdom of listening to our hearts and following our dreams.',
      ownerNote: 'A classic fable I\'ve re-read across different seasons of life. Every time I open it, a different sentence stands out. It\'s the kind of book you want to share with someone embarking on a new path.',
      tags: ['Fiction', 'Philosophy', 'Classics', 'Inspirational', 'Adventure'],
      reviews: [
        { author: 'Patron David', time: '1 week ago', note: '"When you want something, all the universe conspires in helping you to achieve it." Simple and timeless.' },
        { author: 'Patron Bea', time: '3 weeks ago', note: 'Read it here in one sitting with two cups of cappuccino. Wonderful afternoon.' }
      ]
    },
    sevenyearslip: {
      id: 'sevenyearslip',
      title: 'The Seven Year Slip',
      subtitle: 'A Novel of Time and Second Chances',
      author: 'Ashley Poston',
      category: 'Novels & Stories',
      categorySlug: 'novels',
      image: '../../assets/images/books/the%20seven%20year%20slip.jpg',
      badge: 'ROMANCE',
      shelf: 'Shelf C-01',
      availableCopies: 'Available (1 Copy)',
      loadStatus: '1 of 2 Available',
      loadPercent: '50%',
      isbn: '978-0593438466',
      publisher: 'Berkley',
      pages: '352 Pages · Paperback',
      price: '$17.00',
      buyPrice: '17.00',
      cartName: 'Book: The Seven Year Slip',
      synopsis: 'Clementine is an overworked book publicist with a five-year plan. When she inherits her beloved late aunt\'s Manhattan apartment, she discovers a magical secret: the apartment slips seven years into the past—and brings a charming aspiring chef into her kitchen.',
      ownerNote: 'A tender, magical romance that explores grief, timing, good food, and what it truly means to live your life instead of just managing it. Pair this with a fresh morning croissant.',
      tags: ['Romance', 'Magical Realism', 'Time Travel', 'Contemporary', 'Comfort'],
      reviews: [
        { author: 'Patron Nicole', time: '4 days ago', note: 'Made me cry happy tears. The romance is gorgeous and the food descriptions are incredible.' },
        { author: 'Patron Jordan', time: '2 weeks ago', note: 'I couldn\'t stop reading. Highly recommend borrowing this one!' }
      ]
    }
  };

  function initBookDetails() {
    const params = new URLSearchParams(window.location.search);
    const bookKey = params.get('book') || 'chainsawman';
    const book = BOOKS_DATABASE[bookKey] || BOOKS_DATABASE.chainsawman;

    // Document metadata
    document.title = `${book.title} — The Bookshelf — AFTERWORD`;

    // Breadcrumb
    const breadcrumbCategory = document.getElementById('breadcrumb-category');
    if (breadcrumbCategory) breadcrumbCategory.textContent = book.category;
    const breadcrumbTitle = document.getElementById('breadcrumb-title');
    if (breadcrumbTitle) breadcrumbTitle.textContent = book.title;

    // Cover Image & Badges with Fallback Handler
    const coverImg = document.getElementById('detail-book-img');
    if (coverImg) {
      coverImg.src = book.image;
      coverImg.alt = book.title;
      coverImg.onerror = function() {
        this.style.display = 'none';
        let fallback = this.parentNode.querySelector('.book-fallback-cover');
        if (!fallback) {
          fallback = document.createElement('div');
          fallback.className = 'book-fallback-cover';
          fallback.style.cssText = 'width: 100%; min-height: 280px; background: linear-gradient(135deg, #1c2b26 0%, #2d4038 100%); border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem; text-align: center; color: #faf7f2;';
          fallback.innerHTML = `<span class="material-symbols-outlined mb-xs" style="font-size: 44px; color: #d4a373;">auto_stories</span><h3 class="font-serif font-bold text-md mb-2xs" style="color: #faf7f2;">${book.title}</h3><span class="text-xs text-muted" style="color: #d4a373;">${book.author}</span>`;
          this.parentNode.appendChild(fallback);
        }
        fallback.style.display = 'flex';
      };
    }
    const badgeEl = document.getElementById('detail-book-badge');
    if (badgeEl) badgeEl.textContent = book.badge;

    // Text details
    const titleEl = document.getElementById('detail-book-title');
    if (titleEl) titleEl.textContent = book.title;
    const subtitleEl = document.getElementById('detail-book-subtitle');
    if (subtitleEl) subtitleEl.textContent = book.subtitle;
    const authorEl = document.getElementById('detail-book-author');
    if (authorEl) authorEl.textContent = book.author;
    const authorHeaderEl = document.getElementById('detail-author-header');
    if (authorHeaderEl) authorHeaderEl.textContent = book.author;

    // Publisher & Pages
    const publisherEl = document.getElementById('detail-book-publisher');
    if (publisherEl) publisherEl.textContent = book.publisher;
    const pagesEl = document.getElementById('detail-book-pages');
    if (pagesEl) pagesEl.textContent = book.pages;

    // Shelf & Availability
    const shelfEl = document.getElementById('detail-shelf-badge');
    if (shelfEl) shelfEl.textContent = book.shelf;
    const availEl = document.getElementById('detail-avail-text');
    if (availEl) availEl.textContent = book.loadStatus;
    const progressFill = document.getElementById('detail-progress-fill');
    if (progressFill) progressFill.style.width = book.loadPercent;

    // ISBN & Synopsis
    const isbnEl = document.getElementById('detail-book-isbn');
    if (isbnEl) isbnEl.textContent = `ISBN ${book.isbn}`;
    const synopsisEl = document.getElementById('detail-book-synopsis');
    if (synopsisEl) synopsisEl.textContent = book.synopsis;
    const ownerNoteEl = document.getElementById('detail-owner-note');
    if (ownerNoteEl) ownerNoteEl.textContent = book.ownerNote;

    // Tags
    const tagsContainer = document.getElementById('detail-tags-container');
    if (tagsContainer) {
      tagsContainer.innerHTML = '';
      book.tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'chip chip-coffee';
        span.textContent = tag;
        tagsContainer.appendChild(span);
      });
    }

    // Buttons
    const borrowBtn = document.getElementById('detail-borrow-btn');
    if (borrowBtn) {
      borrowBtn.setAttribute('data-book-title', book.title);
    }
    const buyBtn = document.getElementById('detail-buy-btn');
    if (buyBtn) {
      buyBtn.setAttribute('data-name', book.cartName);
      buyBtn.setAttribute('data-price', book.buyPrice);
      buyBtn.setAttribute('data-category', 'Books');
      buyBtn.innerHTML = `
        <span class="material-symbols-outlined icon-20">shopping_bag</span>
        <span>Buy New Copy · ${book.price}</span>
      `;
    }

    // Marginalia / Reader Notes
    const notesContainer = document.getElementById('detail-marginalia-container');
    if (notesContainer) {
      notesContainer.innerHTML = '';
      book.reviews.forEach((rev, idx) => {
        const div = document.createElement('div');
        div.className = (idx % 2 === 0 ? 'border-l-secondary' : 'border-l-tertiary') + ' marginalia-entry';
        div.innerHTML = `
          <div class="flex-row justify-between text-xs text-muted mb-xs">
            <strong>Note from ${rev.author}</strong>
            <span class="text-mono">${rev.time}</span>
          </div>
          <p class="text-base text-main italic">"${rev.note}"</p>
        `;
        notesContainer.appendChild(div);
      });
    }

    // Render Companion Books (the other books from the shelf)
    const relatedContainer = document.getElementById('related-books-grid');
    if (relatedContainer) {
      relatedContainer.innerHTML = '';
      const otherKeys = Object.keys(BOOKS_DATABASE).filter(k => k !== book.id).slice(0, 3);
      otherKeys.forEach(k => {
        const other = BOOKS_DATABASE[k];
        const card = document.createElement('article');
        card.className = 'card card-hover';
        card.setAttribute('data-book-id', other.id);
        card.innerHTML = `
          <span class="chip chip-coffee mb-xs align-self-start">${other.shelf}</span>
          <h3 class="card-title"><a href="book-details.html?book=${other.id}" class="book-link" data-book-id="${other.id}">${other.title}</a></h3>
          <p class="text-mono text-xs text-secondary mb-xs">${other.author}</p>
          <p class="card-desc text-xs text-muted mb-sm">${other.synopsis.slice(0, 110)}...</p>
          <div class="card-footer card-footer--bordered">
            <span class="text-xs text-secondary font-semibold">${other.availableCopies}</span>
            <a href="book-details.html?book=${other.id}" class="btn btn-outline btn-sm" data-action="open-book-quickview" data-book-id="${other.id}">Quick View</a>
          </div>
        `;
        relatedContainer.appendChild(card);
      });
    }
  }

  // -------------------------------------------------------------------------
  // Interactive Book Quickview Modal (Universal across Library, Home, Profile)
  // -------------------------------------------------------------------------
  window.BOOKS_DATABASE = BOOKS_DATABASE;

  function ensureQuickviewModal() {
    let modal = document.getElementById('book-quickview-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'book-quickview-modal';
      modal.className = 'modal-scrim';
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML = `
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <div class="flex-row items-center gap-xs">
              <span class="chip chip-coffee" id="modal-qv-badge">COLLECTION</span>
              <span class="text-mono text-xs text-secondary font-bold" id="modal-qv-shelf">Shelf A-01</span>
            </div>
            <button class="modal-close-btn" data-close-modal aria-label="Close dialog">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="modal-body">
            <div class="book-quickview-header">
              <img id="modal-qv-img" src="" alt="Book Cover" class="book-quickview-cover">
              <div class="book-quickview-meta">
                <h3 class="book-quickview-title" id="modal-qv-title">Book Title</h3>
                <p class="book-quickview-subtitle" id="modal-qv-subtitle">Subtitle</p>
                <p class="book-quickview-author" id="modal-qv-author">Author Name</p>
                <div class="flex-row items-center gap-xs text-xs text-secondary font-semibold mt-xs">
                  <span class="status-dot active"></span>
                  <span id="modal-qv-avail">Available</span>
                  <span>·</span>
                  <span id="modal-qv-pages">Hardcover</span>
                </div>
                <div class="flex-row gap-2xs flex-wrap mt-xs" id="modal-qv-tags"></div>
              </div>
            </div>

            <div class="mt-sm">
              <h4 class="font-serif text-md font-bold text-primary mb-2xs">Story Synopsis</h4>
              <p class="text-sm text-muted leading-relaxed" id="modal-qv-synopsis" style="margin: 0;"></p>
            </div>

            <div class="mt-sm">
              <h4 class="font-serif text-md font-bold text-primary mb-2xs">Why It's on the Shelf</h4>
              <div class="book-quickview-callout">
                <p class="italic mb-0" id="modal-qv-note" style="margin: 0;"></p>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <div class="book-quickview-actions">
              <a href="#" id="modal-qv-page-link" class="btn btn-text btn-sm text-secondary">
                <span>View Full Page Details</span>
                <span class="material-symbols-outlined icon-16">arrow_forward</span>
              </a>
              <div class="flex-row items-center gap-xs">
                <button class="btn btn-outline btn-sm" id="modal-qv-wishlist-btn">
                  <span class="material-symbols-outlined icon-16">bookmark</span>
                  <span>Save Wishlist</span>
                </button>
                <button class="btn btn-primary btn-sm" id="modal-qv-borrow-btn" data-action="open-borrow-modal">
                  <span class="material-symbols-outlined icon-16">bookmark_add</span>
                  <span>Borrow Book</span>
                </button>
                <button class="btn btn-outline btn-sm" id="modal-qv-buy-btn" data-add-to-cart>
                  Buy Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('open');
          modal.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = '';
        }
      });
      modal.querySelectorAll('[data-close-modal]').forEach(b => {
        b.addEventListener('click', () => {
          modal.classList.remove('open');
          modal.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = '';
        });
      });
    }
    return modal;
  }

  window.openBookQuickviewModal = function(bookId) {
    const book = BOOKS_DATABASE[bookId] || BOOKS_DATABASE.chainsawman;
    const modal = ensureQuickviewModal();

    const badge = document.getElementById('modal-qv-badge');
    const shelf = document.getElementById('modal-qv-shelf');
    const img = document.getElementById('modal-qv-img');
    const title = document.getElementById('modal-qv-title');
    const subtitle = document.getElementById('modal-qv-subtitle');
    const author = document.getElementById('modal-qv-author');
    const avail = document.getElementById('modal-qv-avail');
    const pages = document.getElementById('modal-qv-pages');
    const tagsContainer = document.getElementById('modal-qv-tags');
    const synopsis = document.getElementById('modal-qv-synopsis');
    const note = document.getElementById('modal-qv-note');
    const pageLink = document.getElementById('modal-qv-page-link');
    const wishlistBtn = document.getElementById('modal-qv-wishlist-btn');
    const borrowBtn = document.getElementById('modal-qv-borrow-btn');
    const buyBtn = document.getElementById('modal-qv-buy-btn');

    if (wishlistBtn) {
      wishlistBtn.onclick = async () => {
        const user = typeof getLoggedInUser === 'function' ? getLoggedInUser() : null;
        if (!user || !user.id) {
          if (typeof showToast === 'function') {
            showToast('Please sign in to save books to your reading wishlist!', 'info');
          }
          return;
        }

        try {
          // Find book_id from DB or search by title
          const books = await window.AfterwordAPI.getBooks(book.title);
          const matchedBook = books[0] || null;
          const targetBookId = matchedBook ? matchedBook.book_id : 1;

          await window.AfterwordAPI.addToWishlist(user.id, targetBookId);
          if (typeof showToast === 'function') {
            showToast(`Saved "${book.title}" to your reading wishlist!`, 'bookmark');
          }
        } catch (err) {
          if (typeof showToast === 'function') {
            showToast(`Already saved or error: ${err.message}`, 'info');
          }
        }
      };
    }

    if (badge) badge.textContent = book.badge;
    if (shelf) shelf.textContent = book.shelf;
    if (img) {
      const isSrcPages = window.location.pathname.includes('/src/pages/');
      let imageSrc = book.image;
      if (!isSrcPages && imageSrc.startsWith('../../')) {
        imageSrc = imageSrc.replace('../../', '');
      } else if (isSrcPages && !imageSrc.startsWith('../../')) {
        imageSrc = '../../' + imageSrc;
      }
      img.src = imageSrc;
      img.alt = book.title;
    }
    if (title) title.textContent = book.title;
    if (subtitle) subtitle.textContent = book.subtitle;
    if (author) author.textContent = book.author;
    if (avail) avail.textContent = book.availableCopies;
    if (pages) pages.textContent = book.pages;
    if (synopsis) synopsis.textContent = book.synopsis;
    if (note) note.textContent = `"${book.ownerNote}"`;

    if (tagsContainer) {
      tagsContainer.innerHTML = book.tags.map(t => `<span class="chip chip-olive text-2xs">${t}</span>`).join('');
    }

    if (pageLink) {
      const isSrcPages = window.location.pathname.includes('/src/pages/');
      pageLink.href = isSrcPages ? `book-details.html?book=${book.id}` : `src/pages/book-details.html?book=${book.id}`;
    }

    if (borrowBtn) {
      borrowBtn.setAttribute('data-book-title', book.title);
      borrowBtn.onclick = () => {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (typeof openBorrowModal === 'function') {
          openBorrowModal(book.title);
        }
      };
    }

    if (buyBtn) {
      buyBtn.textContent = `Buy Copy · $${book.buyPrice}`;
      buyBtn.setAttribute('data-name', book.cartName);
      buyBtn.setAttribute('data-price', book.buyPrice);
      buyBtn.setAttribute('data-category', 'Books');
      buyBtn.onclick = () => {
        if (typeof addToCart === 'function') {
          addToCart({ name: book.cartName, price: parseFloat(book.buyPrice), category: 'Books' });
          if (typeof showToast === 'function') {
            showToast(`Added "${book.title}" to tray`, 'shopping_bag');
          }
        }
      };
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  // Global delegation for clicking any book card or cover
  document.addEventListener('click', (e) => {
    // Exclude buy buttons, borrow buttons, or cart buttons from opening modal
    if (e.target.closest('[data-add-to-cart]') || e.target.closest('[data-action="open-borrow-modal"]') || e.target.closest('.cart-toggle-btn') || e.target.closest('.modal-close-btn') || e.target.closest('[data-close-modal]')) {
      return;
    }

    // Check if clicking a quickview trigger or book card
    const quickviewTrigger = e.target.closest('[data-action="open-book-quickview"]');
    if (quickviewTrigger) {
      e.preventDefault();
      const card = quickviewTrigger.closest('[data-book-id]');
      const bookId = quickviewTrigger.getAttribute('data-book-id') || card?.getAttribute('data-book-id');
      if (bookId && window.openBookQuickviewModal) {
        window.openBookQuickviewModal(bookId);
      }
      return;
    }

    const card = e.target.closest('.book-item-card, [data-book-id]');
    if (card) {
      // Do not intercept if clicked on a direct external link or non-book button
      if (e.target.closest('button') && !e.target.closest('[data-action="open-book-quickview"]')) {
        return;
      }

      e.preventDefault();
      const bookId = card.getAttribute('data-book-id') || 
        card.querySelector('[data-book-id]')?.getAttribute('data-book-id') ||
        card.getAttribute('data-title')?.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Resolve bookId key
      let matchedKey = null;
      if (bookId) {
        if (BOOKS_DATABASE[bookId]) matchedKey = bookId;
        else if (bookId.includes('chainsaw')) matchedKey = 'chainsawman';
        else if (bookId.includes('check')) matchedKey = 'checkandmate';
        else if (bookId.includes('tteokbokki') || bookId.includes('die')) matchedKey = 'tteokbokki';
        else if (bookId.includes('alchemist')) matchedKey = 'alchemist';
        else if (bookId.includes('seven') || bookId.includes('slip')) matchedKey = 'sevenyearslip';
      }

      if (matchedKey && window.openBookQuickviewModal) {
        window.openBookQuickviewModal(matchedKey);
      }
    }
  });

  // If on book-details.html page, initialize full details view
  if (document.getElementById('detail-book-title')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initBookDetails);
    } else {
      initBookDetails();
    }
  }
})();
