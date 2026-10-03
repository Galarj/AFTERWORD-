/**
 * AFTERWORD — CAFÉ TABLE RESERVATION & INTERACTIVE SEATING MAP
 * Connects floor plan image overlay markers to Supabase database backend endpoints.
 */

let cafeTablesState = [];
let selectedTable = null;
let currentGuestCount = 2;

document.addEventListener('DOMContentLoaded', () => {
  initCafeSeatingSystem();
});

/**
 * Main initialization for café floor plan reservation system
 */

function initCafeSeatingSystem() {
  const dateInput = document.getElementById('res-date-input');
  const timeSelect = document.getElementById('res-time-select');
  const guestMinusBtn = document.getElementById('btn-guests-minus');
  const guestPlusBtn = document.getElementById('btn-guests-plus');
  const guestDisplay = document.getElementById('guests-count-display');
  const reservationForm = document.getElementById('reservation-form');

  // Set default date to today YYYY-MM-DD
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.min = today;

    dateInput.addEventListener('change', () => {
      fetchTableAvailability();
    });
  }

  if (timeSelect) {
    timeSelect.addEventListener('change', () => {
      fetchTableAvailability();
    });
  }

  if (guestMinusBtn && guestPlusBtn && guestDisplay) {
    guestMinusBtn.addEventListener('click', () => {
      if (currentGuestCount > 1) {
        currentGuestCount--;
        guestDisplay.textContent = currentGuestCount;
        fetchTableAvailability();
      }
    });

    guestPlusBtn.addEventListener('click', () => {
      if (currentGuestCount < 12) {
        currentGuestCount++;
        guestDisplay.textContent = currentGuestCount;
        fetchTableAvailability();
      }
    });
  }

  // Pre-fill user profile info if logged in
  prefillPatronInfo();

  // Attach floor plan marker click listeners
  const tableMarkers = document.querySelectorAll('.table-marker');
  tableMarkers.forEach(marker => {
    marker.addEventListener('click', () => {
      const tableNum = marker.getAttribute('data-table');
      const tableData = cafeTablesState.find(t => t.table_number === tableNum);
      if (tableData && (tableData.calculated_status === 'available' || tableData.calculated_status === 'selected')) {
        selectTable(tableData);
      }
    });
  });

  // Handle Reservation Form Submit
  if (reservationForm) {
    reservationForm.addEventListener('submit', handleReservationSubmit);
  }

  // Confirmation screen buttons
  const doneConfBtn = document.getElementById('btn-done-confirmation');
  const viewConfBtn = document.getElementById('btn-view-reservations-from-conf');

  if (doneConfBtn) {
    doneConfBtn.addEventListener('click', () => {
      document.getElementById('reservation-confirmation-card').style.display = 'none';
      selectedTable = null;
      fetchTableAvailability();
    });
  }

  if (viewConfBtn) {
    viewConfBtn.addEventListener('click', () => {
      document.getElementById('reservation-confirmation-card').style.display = 'none';
      openMyReservationsModal();
    });
  }

  // My Reservations Modal Trigger & Handlers
  const openMyResBtn = document.getElementById('btn-open-my-reservations');
  const closeMyResBtn = document.getElementById('btn-close-my-reservations');
  const fetchMyResBtn = document.getElementById('btn-fetch-my-reservations');
  const myResModal = document.getElementById('my-reservations-modal');

  if (openMyResBtn) {
    openMyResBtn.addEventListener('click', openMyReservationsModal);
  }

  if (closeMyResBtn && myResModal) {
    closeMyResBtn.addEventListener('click', () => {
      myResModal.style.display = 'none';
    });
  }

  if (fetchMyResBtn) {
    fetchMyResBtn.addEventListener('click', fetchMyReservations);
  }

  // Initial load
  fetchTableAvailability();
}

/**
 * Auto-populates reservation form inputs if user is logged in
 */
function prefillPatronInfo() {
  try {
    let user = null;
    if (typeof getLoggedInUser === 'function') {
      user = getLoggedInUser();
    }
    if (!user) {
      const raw = localStorage.getItem('afterword_user');
      if (raw) user = JSON.parse(raw);
    }
    if (user) {
      const nameInput = document.getElementById('res-patron-name');
      const emailInput = document.getElementById('res-patron-email');
      const searchEmailInput = document.getElementById('search-my-res-email');

      if (nameInput && !nameInput.value) nameInput.value = user.name || user.full_name || '';
      if (emailInput && !emailInput.value) emailInput.value = user.email || '';
      if (searchEmailInput && !searchEmailInput.value) searchEmailInput.value = user.email || '';
    }
  } catch (e) {}
}

/**
 * Queries /api/tables/availability from the Express / Supabase backend
 */
async function fetchTableAvailability() {
  const dateInput = document.getElementById('res-date-input');
  const timeSelect = document.getElementById('res-time-select');
  const summaryEl = document.getElementById('floorplan-status-summary');

  if (!dateInput || !timeSelect) return;

  const date = dateInput.value;
  const time = timeSelect.value;
  const guests = currentGuestCount;

  if (summaryEl) summaryEl.textContent = 'Loading table availability...';

  try {
    const res = await fetch(`/api/tables/availability?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&guests=${guests}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const responseData = await res.json();
    const tables = Array.isArray(responseData) ? responseData : (responseData.tables || []);
    
    cafeTablesState = tables.map(t => ({
      ...t,
      calculated_status: t.computed_state || t.calculated_status || t.status || 'available'
    }));

    updateFloorPlanMarkers();

    const availableCount = cafeTablesState.filter(t => t.calculated_status === 'available').length;
    if (summaryEl) {
      summaryEl.textContent = `${availableCount} of ${cafeTablesState.length} Tables Available for ${guests} Guest${guests > 1 ? 's' : ''}`;
    }
  } catch (err) {
    console.warn('Could not fetch table availability from backend, fallback to local compute:', err);
    if (summaryEl) summaryEl.textContent = 'Showing cached table layout.';
  }
}

/**
 * Updates visual CSS classes & state of HTML table overlay markers
 */
function updateFloorPlanMarkers() {
  cafeTablesState.forEach(table => {
    const marker = document.querySelector(`.table-marker[data-table="${table.table_number}"]`);
    if (!marker) return;

    // Reset classes
    marker.className = `table-marker table-${table.table_number.toLowerCase()}`;

    let status = table.calculated_status || 'available';

    if (selectedTable && selectedTable.table_number === table.table_number) {
      status = 'selected';
    }

    if (status === 'available') {
      marker.classList.add('state-available');
      marker.disabled = false;
      marker.title = `${table.table_number} — ${table.capacity} seats (${table.location}) — Available`;
    } else if (status === 'selected') {
      marker.classList.add('state-selected');
      marker.disabled = false;
      marker.title = `${table.table_number} — Selected for Reservation`;
    } else if (status === 'reserved') {
      marker.classList.add('state-reserved');
      marker.disabled = true;
      marker.title = `${table.table_number} — Already Reserved for this time`;
    } else if (status === 'occupied') {
      marker.classList.add('state-occupied');
      marker.disabled = true;
      marker.title = `${table.table_number} — Currently Occupied`;
    } else if (status === 'capacity_exceeded') {
      marker.classList.add('state-capacity-exceeded');
      marker.disabled = true;
      marker.title = `${table.table_number} — Capacity Exceeded (${table.capacity} seats max for ${currentGuestCount} guests)`;
    } else {
      marker.classList.add('state-unavailable');
      marker.disabled = true;
      marker.title = `${table.table_number} — Temporarily Unavailable`;
    }
  });
}

/**
 * Selects an available table and opens table detail form card
 */
function selectTable(table) {
  selectedTable = table;
  updateFloorPlanMarkers();

  const detailCard = document.getElementById('table-detail-card');
  const confCard = document.getElementById('reservation-confirmation-card');
  const titleEl = document.getElementById('card-table-title');
  const subtitleEl = document.getElementById('card-table-subtitle');
  const slotEl = document.getElementById('card-reservation-datetime-slot');

  if (confCard) confCard.style.display = 'none';

  if (detailCard) {
    detailCard.style.display = 'block';

    const dateVal = document.getElementById('res-date-input')?.value || '';
    const timeVal = document.getElementById('res-time-select')?.value || '';
    const formattedTime = formatTimeSlot(timeVal);

    if (titleEl) titleEl.textContent = `TABLE ${table.table_number}`;
    if (subtitleEl) subtitleEl.textContent = `${table.capacity} seats · ${table.location}`;
    if (slotEl) slotEl.textContent = `${dateVal} at ${formattedTime}`;

    detailCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Helper to format 24h time to 12h AM/PM
 */
function formatTimeSlot(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  let hour = parseInt(parts[0], 10);
  const min = parts[1] || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${min} ${ampm}`;
}

/**
 * Handles submission of table reservation form to POST /api/reservations
 */
async function handleReservationSubmit(e) {
  e.preventDefault();

  if (!selectedTable) {
    showToast('Please select an available table from the floor plan first.', 'warning');
    return;
  }

  const dateInput = document.getElementById('res-date-input');
  const timeSelect = document.getElementById('res-time-select');
  const nameInput = document.getElementById('res-patron-name');
  const emailInput = document.getElementById('res-patron-email');
  const phoneInput = document.getElementById('res-patron-phone');
  const notesInput = document.getElementById('res-special-requests');
  const submitBtn = document.getElementById('btn-submit-reservation');

  const payload = {
    table_id: selectedTable.table_id,
    table_number: selectedTable.table_number,
    patron_name: nameInput?.value?.trim() || 'Patron',
    patron_email: emailInput?.value?.trim() || '',
    patron_phone: phoneInput?.value?.trim() || '',
    reservation_date: dateInput?.value,
    start_time: timeSelect?.value,
    guest_count: currentGuestCount,
    special_requests: notesInput?.value?.trim() || ''
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="material-symbols-outlined icon-18 spin">sync</span> Processing...';
  }

  try {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.status === 409) {
      showToast(`Double-booking prevented: Table ${selectedTable.table_number} is already reserved for this date and time.`, 'warning');
      fetchTableAvailability();
      return;
    }

    if (!res.ok) {
      throw new Error(data.error || 'Reservation failed.');
    }

    // Success! Show confirmation panel
    showReservationConfirmation(data.reservation || payload, data.reservation?.reservation_id || data.id);
    showToast(`✓ Table ${selectedTable.table_number} reserved successfully!`, 'check_circle');

  } catch (err) {
    console.error('Reservation Error:', err);
    showToast(`Could not place reservation: ${err.message}`, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="material-symbols-outlined icon-18">event_seat</span><span>Reserve This Table</span>';
    }
  }
}

/**
 * Renders confirmation card after successful booking
 */
function showReservationConfirmation(resData, resId) {
  const detailCard = document.getElementById('table-detail-card');
  const confCard = document.getElementById('reservation-confirmation-card');

  if (detailCard) detailCard.style.display = 'none';

  if (confCard) {
    confCard.style.display = 'block';

    const numEl = document.getElementById('conf-table-number');
    const capEl = document.getElementById('conf-table-capacity');
    const dtEl = document.getElementById('conf-datetime');
    const guestEl = document.getElementById('conf-guests');
    const patronEl = document.getElementById('conf-patron');
    const idEl = document.getElementById('conf-res-id');

    const formattedTime = formatTimeSlot(resData.start_time);

    if (numEl) numEl.textContent = `Table ${resData.table_number}`;
    if (capEl) capEl.textContent = `${selectedTable ? selectedTable.capacity : '2-4'} seats · ${selectedTable ? selectedTable.location : 'Café Main Area'}`;
    if (dtEl) dtEl.textContent = `${resData.reservation_date} at ${formattedTime}`;
    if (guestEl) guestEl.textContent = `Guests: ${resData.guest_count}`;
    if (patronEl) patronEl.textContent = `Patron: ${resData.patron_name} (${resData.patron_email})`;
    if (idEl) idEl.textContent = `Ref ID: #RES-${resId || Math.floor(1000 + Math.random() * 9000)}`;

    confCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Opens My Reservations Modal and auto-loads if email is populated
 */
function openMyReservationsModal() {
  const modal = document.getElementById('my-reservations-modal');
  if (modal) {
    modal.style.display = 'flex';
    prefillPatronInfo();
    fetchMyReservations();
  }
}

/**
 * Fetches patron's active reservations by email
 */
async function fetchMyReservations() {
  const emailInput = document.getElementById('search-my-res-email');
  const container = document.getElementById('my-reservations-list-container');
  if (!emailInput || !container) return;

  const email = emailInput.value.trim();
  if (!email) {
    container.innerHTML = '<p class="text-xs text-muted text-center py-md">Please enter your email to view reservations.</p>';
    return;
  }

  container.innerHTML = '<p class="text-xs text-muted text-center py-md">Loading your reservations...</p>';

  try {
    const res = await fetch(`/api/reservations?email=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const reservations = await res.json();

    if (!Array.isArray(reservations) || reservations.length === 0) {
      container.innerHTML = `<p class="text-xs text-muted text-center py-md">No active reservations found for ${email}.</p>`;
      return;
    }

    container.innerHTML = reservations.map(r => {
      const isCancelled = r.status === 'Cancelled';
      const formattedTime = formatTimeSlot(r.start_time);

      return `
        <div class="card p-sm mb-sm" style="background: ${isCancelled ? '#f5f5f5' : '#ffffff'}; border: 1px solid #d8cec0;">
          <div class="flex-row items-center justify-between mb-2xs">
            <strong class="text-sm text-primary">Table ${r.table_number}</strong>
            <span class="chip ${isCancelled ? 'chip-coffee' : 'chip-olive'}" style="font-size: 10px;">${r.status}</span>
          </div>
          <div class="text-xs text-mono font-bold text-secondary mb-2xs">
            ${r.reservation_date} at ${formattedTime} (${r.guest_count} Guests)
          </div>
          ${r.special_requests ? `<div class="text-xs text-muted italic mb-xs">"${r.special_requests}"</div>` : ''}
          ${!isCancelled ? `
            <div class="text-right pt-xs border-t border-light">
              <button type="button" class="btn btn-outline btn-xs" onclick="cancelReservation(${r.reservation_id})">
                Cancel Reservation
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error fetching reservations:', err);
    container.innerHTML = `<p class="text-xs text-terracotta text-center py-md">Error loading reservations: ${err.message}</p>`;
  }
}

/**
 * Cancels a reservation via PATCH /api/reservations/:id/cancel
 */
async function cancelReservation(reservationId) {
  if (!confirm('Are you sure you want to cancel this table reservation?')) return;

  try {
    const res = await fetch(`/api/reservations/${reservationId}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();

    if (res.ok) {
      showToast('✓ Reservation cancelled successfully.', 'info');
      fetchMyReservations();
      fetchTableAvailability();
    } else {
      showToast(`Cancel failed: ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// Attach cancelReservation to window for inline onclick handler
window.cancelReservation = cancelReservation;
