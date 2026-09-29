/**
 * AFTERWORD — MODAL DIALOGS & RSVP CONTROLS
 * Manages loan hold dialogs, community event proposals, and quick RSVP state toggles.
 */

/**
 * Displays a modal element by adding the `.open` class.
 * Updates accessibility attributes and prevents page background scrolling.
 * 
 * @param {HTMLElement} modalEl - The `.modal-scrim` container element to display.
 */
function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('open');
  modalEl.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

/**
 * Dismisses a modal element by removing the `.open` class.
 * Restores accessibility attributes and restores page scrolling.
 * 
 * @param {HTMLElement} modalEl - The `.modal-scrim` container element to hide.
 */
function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('open');
  modalEl.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/**
 * Closes all currently open modals across the entire page.
 * Restores default body overflow scrolling.
 */
function closeAllModals() {
  document.querySelectorAll('.modal-scrim').forEach(modal => {
    closeModal(modal);
  });
}

/**
 * Opens the borrowing hold dialog and populates the book title.
 * 
 * @param {string} [bookTitle='A Pattern Language'] - The title of the book being requested.
 */
function openBorrowModal(bookTitle = 'A Pattern Language', bookId = null) {
  const borrowModal = document.getElementById('borrow-modal');
  if (!borrowModal) return;

  const titleEl = document.getElementById('modal-book-title');
  if (titleEl) {
    titleEl.textContent = bookTitle;
  }
  if (bookId) {
    borrowModal.setAttribute('data-book-id', bookId);
  } else {
    borrowModal.removeAttribute('data-book-id');
  }
  borrowModal.setAttribute('data-book-title', bookTitle);
  openModal(borrowModal);
}

/**
 * Closes the borrowing hold modal dialog.
 */
function closeBorrowModal() {
  const borrowModal = document.getElementById('borrow-modal');
  if (borrowModal) {
    closeModal(borrowModal);
  }
}

/**
 * Configures event listeners for the Borrow / Hold dialog (`#borrow-modal`).
 * - Attaches click listeners to `[data-action="open-borrow-modal"]` buttons to retrieve
 *   the `data-book-title` and launch the dialog.
 * - Handles `#borrow-form` submissions: prevents default submit, reads duration and patron ID,
 *   closes dialog, and shows a confirmation toast.
 */
function initBorrowModal() {
  const borrowModal = document.getElementById('borrow-modal');
  if (!borrowModal) return;

  const openBorrowBtns = document.querySelectorAll('[data-action="open-borrow-modal"]');
  openBorrowBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const bookTitle = btn.getAttribute('data-book-title') || 'A Pattern Language';
      const bookId = btn.getAttribute('data-book-id') || null;
      openBorrowModal(bookTitle, bookId);
    });
  });

  const borrowForm = document.getElementById('borrow-form');
  if (borrowForm) {
    borrowForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const borrowModalEl = document.getElementById('borrow-modal');
      const bookTitle = borrowModalEl?.getAttribute('data-book-title') || document.getElementById('modal-book-title')?.textContent || 'Selected Volume';
      const duration = document.getElementById('borrow-duration')?.value || '21';
      const days = parseInt(duration) || 21;
      
      const bookId = borrowModalEl?.getAttribute('data-book-id') || bookTitle;
      const user = (typeof getLoggedInUser === 'function') ? getLoggedInUser() : null;
      const userId = user?.id || ((typeof getSupabaseUserId === 'function') ? getSupabaseUserId() : null);

      if (!userId) {
        closeBorrowModal();
        showToast('Please sign in to borrow books from the library!', 'info');
        return;
      }
      
      closeBorrowModal();

      if (window.AfterwordAPI && typeof window.AfterwordAPI.createLoan === 'function') {
        try {
          await window.AfterwordAPI.createLoan(bookId, userId, days);
          showToast(`Hold Request Submitted! "${bookTitle}" for ${days} days (Awaiting Admin Approval)`, 'hourglass_top');
          
          // Refresh book availability on the library page
          if (typeof initDynamicBookAvailability === 'function') {
            setTimeout(initDynamicBookAvailability, 1000);
          }
        } catch (err) {
          console.error('Loan creation failed:', err);
          // Check if this is an availability error
          if (err.message && err.message.includes('no available copies')) {
            showToast(`Cannot borrow "${bookTitle}" — all copies are currently on loan. Try again later!`, 'block');
          } else {
            showToast(`Could not place hold: ${err.message}`, 'error');
          }
        }
      } else {
        showToast(`Hold Request Submitted! "${bookTitle}" for ${days} days (Awaiting Admin Approval)`, 'hourglass_top');
      }
    });
  }
}

/**
 * Configures event listeners for the Community Event Proposal modal (`#event-proposal-modal`).
 * - Attaches click listeners to `[data-action="open-event-modal"]` triggers.
 * - Handles form submission (`#event-proposal-form`), confirms proposal reception,
 *   and notifies the user via toast.
 */
function initEventModal() {
  const eventModal = document.getElementById('event-proposal-modal');
  if (!eventModal) return;

  const openEventBtns = document.querySelectorAll('[data-action="open-event-modal"]');
  openEventBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      openModal(eventModal);
    });
  });

  const eventForm = document.getElementById('event-proposal-form');
  if (eventForm) {
    eventForm.addEventListener('submit', (e) => {
      e.preventDefault();
      closeModal(eventModal);
      showToast('Community event proposal received! We will respond within 48 hours.', 'event_available');
    });
  }
}

/**
 * Configures interactive toggle state for event RSVP buttons (`[data-action="quick-rsvp"]`).
 * Switches between 'RSVP / Reserve' (Primary) and 'Spot Reserved' (Secondary with checkmark icon)
 * while issuing status feedback toasts.
 */
function initQuickRsvpButtons() {
  const rsvpButtons = document.querySelectorAll('[data-action="quick-rsvp"]');
  rsvpButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const eventName = btn.getAttribute('data-event-name') || 'Upcoming Gathering';
      const eventId = btn.getAttribute('data-event-id') || null;
      const isReserved = btn.classList.contains('btn-secondary');
      const userId = (typeof getSupabaseUserId === 'function') ? getSupabaseUserId() : null;

      if (!isReserved) {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        btn.innerHTML = '<span class="material-symbols-outlined icon-16">check</span> Spot Reserved';
        
        if (window.AfterwordAPI && typeof window.AfterwordAPI.createRSVP === 'function' && eventId) {
          try {
            await window.AfterwordAPI.createRSVP(parseInt(eventId), userId, 1);
          } catch (err) {
            console.error('RSVP failed:', err);
            showToast(`RSVP failed: ${err.message}`, 'error');
            // Revert button state
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
            btn.textContent = 'RSVP / Reserve';
            return;
          }
        }
        showToast(`Spot reserved for "${eventName}"!`, 'check_circle');
      } else {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
        btn.textContent = 'RSVP / Reserve';
        showToast(`Reservation cancelled for "${eventName}".`, 'info');
      }
    });
  });
}

/**
 * Initializes all modal dialogs and interactive action delegates:
 * - Scrim click dismissal (clicking backdrop closes active dialog)
 * - Close buttons (`[data-close-modal]`)
 * - Keyboard Escape key dismissal
 * - Action delegation for patron enrollment, floral inquiries, and reading list additions
 * - Sub-initialization of borrow modal, event modal, and RSVP buttons
 */
function initModals() {
  // Scrim click to dismiss modal
  document.querySelectorAll('.modal-scrim').forEach(scrim => {
    scrim.addEventListener('click', (e) => {
      if (e.target === scrim) {
        closeAllModals();
      }
    });
  });

  // Explicit close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  // Escape key to dismiss active modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Action delegates
  document.addEventListener('click', (e) => {
    const patronBtn = e.target.closest('[data-action="enroll-patron"]');
    if (patronBtn) {
      showToast('Member Card: Visit the front counter to get your member card.', 'badge');
    }

    const floralBtn = e.target.closest('[data-action="inquire-floral"]');
    if (floralBtn) {
      showToast('Visit the floral counter to select fresh flowers with our staff.', 'eco');
    }

    const readingListBtn = e.target.closest('[data-action="add-reading-list"]');
    if (readingListBtn) {
      const bookTitle = readingListBtn.getAttribute('data-book-title') || 'This book';
      const bookId = readingListBtn.getAttribute('data-book-id') || 1;
      const user = (typeof getLoggedInUser === 'function') ? getLoggedInUser() : null;

      if (!user || !user.id) {
        showToast('Please sign in to save books to your reading wishlist!', 'info');
        return;
      }

      if (window.AfterwordAPI && typeof window.AfterwordAPI.addToWishlist === 'function') {
        window.AfterwordAPI.addToWishlist(user.id, parseInt(bookId))
          .then(() => {
            showToast(`Saved "${bookTitle}" to your reading wishlist!`, 'bookmark');
          })
          .catch((err) => {
            showToast(`Already saved or notice: ${err.message}`, 'info');
          });
      } else {
        showToast(`Saved "${bookTitle}" to your reading wishlist!`, 'bookmark');
      }
    }
  });

  initBorrowModal();
  initEventModal();
  initDonationModal();
  initQuickRsvpButtons();
}

/**
 * Configures event listeners for the Book Donation modal (`#donation-modal`).
 */
function initDonationModal() {
  const donationModal = document.getElementById('donation-modal');
  if (!donationModal) return;

  document.querySelectorAll('[data-action="open-donation-modal"]').forEach(btn => {
    btn.addEventListener('click', () => {
      openModal(donationModal);
    });
  });

  const donationForm = document.getElementById('donation-form');
  if (donationForm) {
    donationForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('donation-book-title')?.value.trim();
      const author = document.getElementById('donation-author')?.value.trim();
      const category = document.getElementById('donation-category')?.value || 'Novels & Stories';
      const condition = document.getElementById('donation-condition')?.value || 'Very Good';
      const year = document.getElementById('donation-year')?.value;
      const publisher = document.getElementById('donation-publisher')?.value.trim();
      const summary = document.getElementById('donation-summary')?.value.trim();
      const donorName = document.getElementById('donation-donor-name')?.value.trim();
      const donorEmail = document.getElementById('donation-donor-email')?.value.trim();
      const donorNote = document.getElementById('donation-donor-note')?.value.trim();

      if (!title || !author || !donorName || !donorEmail) {
        if (typeof showToast === 'function') showToast('Please fill out all required fields (*)', 'error');
        return;
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(donorEmail)) {
        if (typeof showToast === 'function') showToast('Please enter a valid donor email address.', 'error');
        return;
      }

      const submitBtn = donationForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      try {
        const user = (typeof getLoggedInUser === 'function') ? getLoggedInUser() : null;
        const payload = {
          book_title: title,
          author,
          category,
          condition,
          year_published: year ? parseInt(year) : null,
          publisher,
          summary,
          donor_name: donorName,
          donor_email: donorEmail,
          donor_note: donorNote,
          user_id: user?.id || null
        };

        const res = await fetch('/api/donations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        closeModal(donationModal);
        donationForm.reset();

        if (res.ok) {
          if (typeof showToast === 'function') {
            showToast("Donation request submitted! We'll review your book and contact you by email.", 'volunteer_activism');
          }
        } else {
          if (typeof showToast === 'function') {
            showToast(`Could not submit donation: ${data.error || 'Server error'}`, 'error');
          }
        }
      } catch (err) {
        console.error('Error submitting donation:', err);
        closeModal(donationModal);
        if (typeof showToast === 'function') {
          showToast(`Error submitting donation offer: ${err.message}`, 'error');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span class="material-symbols-outlined icon-16">send</span><span>Submit Book Offer</span>';
        }
      }
    });
  }
}

