/**
 * AFTERWORD — CAFÉ TABLE SERVICE & LIVE SEATING MAP
 * Manages in-seat table number selection, live seating floor plan, and localStorage persistence.
 */

// Default 12-table seating layout for AFTERWORD Civic Reading Room & Café
const DEFAULT_CAFÉ_TABLES = [
  { number: 1, status: 'occupied', capacity: 2, occupants: 2, note: 'In-Seat Order #1042' },
  { number: 2, status: 'occupied', capacity: 4, occupants: 3, note: 'In-Seat Order #1045' },
  { number: 3, status: 'available', capacity: 2, occupants: 0, note: 'Clean & Ready' },
  { number: 4, status: 'available', capacity: 4, occupants: 0, note: 'Selected for Order' },
  { number: 5, status: 'reserved', capacity: 6, occupants: 4, note: 'Book Club Gathering' },
  { number: 6, status: 'occupied', capacity: 2, occupants: 1, note: 'Reading Room Patron' },
  { number: 7, status: 'available', capacity: 4, occupants: 0, note: 'Clean & Ready' },
  { number: 8, status: 'occupied', capacity: 2, occupants: 2, note: 'Espresso Bar Guest' },
  { number: 9, status: 'occupied', capacity: 4, occupants: 4, note: 'Study Group' },
  { number: 10, status: 'reserved', capacity: 2, occupants: 2, note: 'Reserved RSVP' },
  { number: 11, status: 'available', capacity: 4, occupants: 0, note: 'Clean & Ready' },
  { number: 12, status: 'occupied', capacity: 2, occupants: 1, note: 'In-Seat Order #1049' }
];

/**
 * Loads current seating state from localStorage or falls back to default layout
 */
function getCafeTablesState() {
  try {
    const raw = localStorage.getItem('afterword_cafe_tables');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_CAFÉ_TABLES;
}

/**
 * Saves seating state to localStorage
 */
function saveCafeTablesState(tables) {
  try {
    localStorage.setItem('afterword_cafe_tables', JSON.stringify(tables));
  } catch (e) {}
}

/**
 * Renders the live floor seating grid on `cafe.html`
 */
function renderSeatingGrid() {
  const gridEl = document.getElementById('seating-floor-grid');
  const summaryEl = document.getElementById('seating-stats-summary');
  const noticeEl = document.getElementById('selected-table-notice');
  if (!gridEl) return;

  const tables = getCafeTablesState();
  const savedTableNum = localStorage.getItem('afterword_table_num') || '4';

  let occupiedCount = 0;
  let availableCount = 0;
  let reservedCount = 0;
  let totalSeatedPatrons = 0;

  gridEl.innerHTML = '';

  tables.forEach(t => {
    if (t.status === 'occupied') {
      occupiedCount++;
      totalSeatedPatrons += (t.occupants || t.capacity);
    } else if (t.status === 'reserved') {
      reservedCount++;
      totalSeatedPatrons += (t.occupants || t.capacity);
    } else {
      availableCount++;
    }

    const isSelected = String(t.number) === String(savedTableNum);

    let statusBadgeClass = 'chip-olive';
    let statusLabel = 'Available';
    let borderStyle = '1px solid rgba(0,0,0,0.08)';
    let bgStyle = '#ffffff';

    if (t.status === 'occupied') {
      statusBadgeClass = 'chip-terracotta';
      statusLabel = 'Occupied';
      bgStyle = '#fdf6f0';
    } else if (t.status === 'reserved') {
      statusBadgeClass = 'chip-coffee';
      statusLabel = 'Reserved';
      bgStyle = '#f9f6f0';
    }

    if (isSelected) {
      borderStyle = '2px solid #a65f45';
      bgStyle = '#fff8f4';
    }

    const card = document.createElement('div');
    card.className = `p-xs rounded-sm transition-all ${t.status === 'available' ? 'cursor-pointer hover:shadow-sm' : ''}`;
    card.style.background = bgStyle;
    card.style.border = borderStyle;
    card.setAttribute('data-table-num', t.number);

    card.innerHTML = `
      <div class="flex-row items-center justify-between mb-2xs">
        <strong class="text-sm text-primary">Table #${t.number}</strong>
        <span class="chip ${statusBadgeClass}" style="font-size: 10px; padding: 2px 6px;">${statusLabel}</span>
      </div>
      <div class="text-xs text-muted font-mono">
        ${t.status === 'available' ? `Cap: ${t.capacity} Seats` : `${t.occupants || t.capacity} Patrons Seated`}
      </div>
      <div class="text-xs text-secondary mt-2xs text-truncate" title="${t.note || ''}">
        ${isSelected ? '⭐ Your In-Seat Choice' : (t.note || 'Clean & Ready')}
      </div>
    `;

    if (t.status === 'available') {
      card.addEventListener('click', () => {
        localStorage.setItem('afterword_table_num', String(t.number));
        const tableInput = document.getElementById('table-number-input');
        if (tableInput) tableInput.value = t.number;
        renderSeatingGrid();
        showToast(`Selected Table #${t.number} for your in-seat café order!`, 'table_restaurant');
      });
    }

    gridEl.appendChild(card);
  });

  if (summaryEl) {
    summaryEl.textContent = `${occupiedCount + reservedCount} / ${tables.length} Tables Occupied (${totalSeatedPatrons} Seated Patrons)`;
  }

  if (noticeEl) {
    noticeEl.innerHTML = savedTableNum 
      ? `Current Selection: <strong>Table #${savedTableNum} (Selected for In-Seat Delivery)</strong>`
      : `Current Selection: <strong>Counter Pickup (No Table Selected)</strong>`;
  }
}

/**
 * Initializes table service selection & seating map on `cafe.html`
 */
function initCafeTable() {
  const tableInput = document.getElementById('table-number-input');

  // Restore saved table number from localStorage
  const savedTable = localStorage.getItem('afterword_table_num') || '4';
  if (tableInput) {
    tableInput.value = savedTable;
    tableInput.addEventListener('change', () => {
      const tableNumber = tableInput.value.trim();
      if (tableNumber) {
        localStorage.setItem('afterword_table_num', tableNumber);
        showToast(`Delivering in-seat orders to Table #${tableNumber}`, 'table_restaurant');
      } else {
        localStorage.removeItem('afterword_table_num');
        showToast('Switched to Counter Pickup', 'storefront');
      }
      renderSeatingGrid();
    });
  }

  renderSeatingGrid();
}
