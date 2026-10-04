/**
 * AFTERWORD — DYNAMIC COMMUNITY EVENTS SUBSYSTEM
 * Connects client-side events page to Supabase database for live capacity & real RSVP counts.
 */

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('events-list')) {
    initDynamicEventsPage();
  }
});

/**
 * Initializes and populates events list from backend database with live capacity & RSVP counts.
 */
async function initDynamicEventsPage() {
  const container = document.getElementById('events-list');
  if (!container) return;

  try {
    const [eventsRes, rsvpsRes] = await Promise.all([
      fetch('/api/events'),
      fetch('/api/rsvps')
    ]);

    if (!eventsRes.ok) throw new Error('Failed to fetch events from backend');

    const events = await eventsRes.json();
    const rsvps = rsvpsRes.ok ? await rsvpsRes.json() : [];

    renderDynamicEvents(events, rsvps);
  } catch (err) {
    console.error('Failed to load live events:', err);
  }
}

/**
 * Renders database event items into DOM cards with actual capacity & RSVP counts.
 * @param {Array} events 
 * @param {Array} rsvps 
 */
function renderDynamicEvents(events, rsvps) {
  const container = document.getElementById('events-list');
  if (!container) return;

  if (!Array.isArray(events) || events.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #888;">
        <p>No community events currently scheduled. Check back soon!</p>
      </div>
    `;
    return;
  }

  // Filter out cancelled events for public catalog
  const activeEvents = events.filter(e => (e.status || '').toLowerCase() !== 'cancelled');

  let currentUser = null;
  if (typeof getLoggedInUser === 'function') currentUser = getLoggedInUser();
  const currentUserId = (typeof getSupabaseUserId === 'function') ? getSupabaseUserId() : (currentUser?.id || null);
  const currentUserEmail = currentUser?.email || '';

  const cardsHtml = activeEvents.map(event => {
    // Calculate total RSVPs for this event
    const eventRsvps = (rsvps || []).filter(r => Number(r.event_id) === Number(event.event_id) && r.status !== 'Cancelled' && r.status !== 'Rejected');
    const spotsFilled = eventRsvps.reduce((acc, r) => acc + (Number(r.guest_count) || 1), 0);
    const capacity = Number(event.capacity) || 20;
    const spotsRemaining = Math.max(0, capacity - spotsFilled);

    // Check if user has already RSVP'd to this event
    const userRsvp = eventRsvps.find(r => 
      (currentUserId && r.user_id === currentUserId) || 
      (currentUserEmail && r.patron_email?.toLowerCase() === currentUserEmail.toLowerCase())
    );
    const isReserved = Boolean(userRsvp);

    // Date formatting (e.g. "2026-10-18")
    const dateStr = event.event_date || '2026-10-18';
    const dateParts = dateStr.split('-');
    let dayName = 'EVENT';
    let dayNum = '18';
    let monthName = 'OCTOBER';

    if (dateParts.length === 3) {
      const d = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
      if (!isNaN(d)) {
        dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
        dayNum = String(d.getDate());
        monthName = d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
      }
    }

    // Category chip label
    const catName = (event.categories?.name || 'Community').toUpperCase();

    // Time string formatting
    const timeStr = event.event_time ? event.event_time.slice(0, 5) : '19:00';

    const categorySlug = (event.categories?.name || '').toLowerCase().includes('game') ? 'gaming'
      : (event.categories?.name || '').toLowerCase().includes('trivia') ? 'quiz'
      : (event.categories?.name || '').toLowerCase().includes('workshop') ? 'craft'
      : 'salon';

    return `
      <article class="card card-hover event-card-item" data-category="${categorySlug}" data-title="${escapeHtml((event.title || '') + ' ' + (event.description || ''))}">
        <div class="grid-12 items-center gap-md">

          <!-- Date Ribbon Column -->
          <div class="col-span-2 event-date-col">
            <span class="text-mono text-sm text-tertiary font-bold text-uppercase">${dayName}</span>
            <span class="event-date-day">${dayNum}</span>
            <span class="text-mono text-xs text-muted">${monthName}</span>
          </div>

          <!-- Main Event Details -->
          <div class="col-span-7">
            <div class="flex-row items-center gap-xs mb-xs">
              <span class="chip chip-olive">${escapeHtml(catName)}</span>
              <span class="chip">FREE ENTRY</span>
            </div>
            <h3 class="card-title text-primary">
              ${escapeHtml(event.title)}
            </h3>
            <div class="flex-row gap-sm text-mono text-xs text-muted mb-xs flex-wrap">
              <span><strong class="text-main">Time:</strong> ${timeStr}</span>
              <span>·</span>
              <span><strong class="text-main">Space:</strong> ${escapeHtml(event.location || 'Café Main Room')}</span>
              <span>·</span>
              <span><strong class="text-secondary">Host:</strong> AFTERWORD Community</span>
            </div>
            <p class="card-desc">
              ${escapeHtml(event.description || 'Join us for coffee, conversation, and community at AFTERWORD.')}
            </p>
          </div>

          <!-- RSVP / Capacity Column -->
          <div class="col-span-3 event-rsvp-col">
            <div class="text-right mb-xs">
              <span class="text-sm font-semibold text-tertiary d-block">${spotsFilled} of ${capacity} Spots Filled</span>
              <span class="text-mono text-xs text-light">${spotsRemaining > 0 ? `Only ${spotsRemaining} seat${spotsRemaining !== 1 ? 's' : ''} remaining` : 'Fully Booked (Walk-ins welcome)'}</span>
            </div>

            ${isReserved ? `
              <div class="flex-col gap-xs">
                <button class="btn btn-secondary btn-sm btn-full" disabled style="opacity: 0.95; cursor: default;">
                  <span class="material-symbols-outlined icon-16" style="color: #2e7d32;">check_circle</span>
                  <span>Spot Reserved</span>
                </button>
                <button class="btn btn-outline btn-xs btn-full live-cancel-rsvp-btn" 
                  style="color: #c53030; border-color: #feb2b2; margin-top: 4px;"
                  data-event-id="${event.event_id}"
                  data-rsvp-id="${userRsvp ? userRsvp.rsvp_id : ''}"
                  data-event-title="${escapeHtml(event.title)}">
                  <span class="material-symbols-outlined icon-14">cancel</span>
                  <span>Unregister / Back Out</span>
                </button>
              </div>
            ` : `
              <button class="btn btn-primary btn-sm btn-full live-rsvp-btn" 
                data-event-id="${event.event_id}"
                data-event-title="${escapeHtml(event.title)}"
                data-is-reserved="false">
                <span>RSVP / Reserve</span>
              </button>
            `}
          </div>

        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = cardsHtml;

  // Attach RSVP button listeners
  container.querySelectorAll('.live-rsvp-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const eventId = btn.getAttribute('data-event-id');
      const eventTitle = btn.getAttribute('data-event-title');

      const user = (typeof getLoggedInUser === 'function') ? getLoggedInUser() : null;
      const userId = (typeof getSupabaseUserId === 'function') ? getSupabaseUserId() : null;
      const userEmail = user?.email || null;
      const userName = user?.name || null;

      btn.disabled = true;

      try {
        const res = await fetch('/api/rsvps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: parseInt(eventId, 10),
            userId: userId,
            email: userEmail,
            userName: userName,
            guestCount: 1
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit RSVP.');

        if (typeof showToast === 'function') {
          showToast(`✓ Spot reserved for "${eventTitle}"!`, 'check_circle');
        }

        initDynamicEventsPage();
      } catch (err) {
        console.error('RSVP Error:', err);
        if (typeof showToast === 'function') {
          showToast(`RSVP notice: ${err.message}`, 'warning');
        }
      } finally {
        btn.disabled = false;
      }
    });
  });

  // Attach Unregister / Back Out button listeners
  container.querySelectorAll('.live-cancel-rsvp-btn').forEach(cancelBtn => {
    cancelBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const eventId = cancelBtn.getAttribute('data-event-id');
      const rsvpId = cancelBtn.getAttribute('data-rsvp-id');
      const eventTitle = cancelBtn.getAttribute('data-event-title');

      const user = (typeof getLoggedInUser === 'function') ? getLoggedInUser() : null;
      const userId = (typeof getSupabaseUserId === 'function') ? getSupabaseUserId() : null;
      const userEmail = user?.email || null;

      if (!confirm(`Are you sure you want to unregister and back out from "${eventTitle}"? Your reserved spot will be freed.`)) {
        return;
      }

      cancelBtn.disabled = true;
      cancelBtn.textContent = 'Unregistering...';

      try {
        const res = await fetch('/api/rsvps/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rsvpId: rsvpId ? parseInt(rsvpId, 10) : null,
            eventId: parseInt(eventId, 10),
            userId: userId,
            email: userEmail
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to cancel RSVP.');

        if (typeof showToast === 'function') {
          showToast(`✓ Unregistered from "${eventTitle}". Spot freed!`, 'info');
        }

        initDynamicEventsPage();
      } catch (err) {
        console.error('Cancel RSVP Error:', err);
        if (typeof showToast === 'function') {
          showToast(`Notice: ${err.message}`, 'warning');
        }
      } finally {
        cancelBtn.disabled = false;
      }
    });
  });

  // Re-apply filters if available
  if (typeof applyEventFilters === 'function') {
    applyEventFilters();
  }
}

// ---------------------------------------------------------------------------
// Proposal Form Submission Handler
// ---------------------------------------------------------------------------
function initProposalForms() {
  const attachFormHandler = (form) => {
    if (!form || form.getAttribute('data-proposal-initialized') === 'true') return;
    form.setAttribute('data-proposal-initialized', 'true');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');

      const orgNameInput = form.querySelector('#inline-org-name') || form.querySelector('#organizer-name');
      const orgEmailInput = form.querySelector('#inline-org-email') || form.querySelector('#organizer-email');
      const titleInput = form.querySelector('#inline-event-title') || form.querySelector('#event-topic');
      const spaceInput = form.querySelector('#inline-event-space') || form.querySelector('#event-space');
      const dateInput = form.querySelector('#inline-event-date');
      const descInput = form.querySelector('#inline-event-desc') || form.querySelector('#event-description');

      const organizerName = orgNameInput ? orgNameInput.value.trim() : '';
      const organizerEmail = orgEmailInput ? orgEmailInput.value.trim() : '';
      const eventTitle = titleInput ? titleInput.value.trim() : '';
      const space = spaceInput ? spaceInput.value : 'Main Café Room';
      const proposedDate = dateInput ? dateInput.value : '';
      const description = descInput ? descInput.value.trim() : '';

      if (!organizerName || !organizerEmail || !eventTitle) {
        if (typeof showToast === 'function') showToast('Please fill in organizer name, email, and event title.', 'warning');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Submitting Proposal...</span>';
      }

      try {
        const res = await fetch('/api/proposals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizerName,
            organizerEmail,
            eventTitle,
            space,
            proposedDate,
            description
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to submit proposal.');

        if (typeof showToast === 'function') {
          showToast('✓ Event proposal submitted! Sent to Staff Admin Console.', 'check_circle');
        }

        form.reset();

        const modal = document.getElementById('event-proposal-modal');
        if (modal) modal.classList.remove('open');
      } catch (err) {
        console.error('Proposal submission error:', err);
        if (typeof showToast === 'function') {
          showToast(`Proposal notice: ${err.message}`, 'warning');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span class="material-symbols-outlined icon-18">send</span><span>Submit Proposal to Admin</span>';
        }
      }
    });
  };

  attachFormHandler(document.getElementById('inline-proposal-form'));
  attachFormHandler(document.getElementById('event-proposal-form'));
}

document.addEventListener('DOMContentLoaded', initProposalForms);

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.initDynamicEventsPage = initDynamicEventsPage;
