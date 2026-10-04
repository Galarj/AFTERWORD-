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

            <button class="btn ${isReserved ? 'btn-secondary' : 'btn-primary'} btn-sm btn-full live-rsvp-btn" 
              data-event-id="${event.event_id}"
              data-event-title="${escapeHtml(event.title)}"
              data-is-reserved="${isReserved}">
              <span>${isReserved ? '<span class="material-symbols-outlined icon-16">check</span> Spot Reserved' : 'RSVP / Reserve'}</span>
            </button>
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
      const isReserved = btn.getAttribute('data-is-reserved') === 'true';

      const user = (typeof getLoggedInUser === 'function') ? getLoggedInUser() : null;
      const userId = (typeof getSupabaseUserId === 'function') ? getSupabaseUserId() : null;
      const userEmail = user?.email || null;
      const userName = user?.name || null;

      btn.disabled = true;

      try {
        if (!isReserved) {
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
        } else {
          if (typeof showToast === 'function') {
            showToast(`You have already reserved a spot for "${eventTitle}".`, 'info');
          }
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

  // Re-apply filters if available
  if (typeof applyEventFilters === 'function') {
    applyEventFilters();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.initDynamicEventsPage = initDynamicEventsPage;
