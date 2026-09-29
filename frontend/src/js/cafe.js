/**
 * AFTERWORD — CAFÉ TABLE SERVICE
 * Manages in-seat table number selection and localStorage persistence.
 */

/**
 * Initializes table service selection on the Café menu page (`cafe.html`):
 * - Checks `localStorage` for any previously saved table number (`afterword_table_num`).
 * - Restores saved value into `#table-number-input` if found.
 * - Listens for `change` events on `#table-number-input`:
 *   - If table number provided: persists to `localStorage` and alerts user of table delivery.
 *   - If cleared: removes from `localStorage` and alerts user that order defaults to counter pickup.
 */
function initCafeTable() {
  const tableInput = document.getElementById('table-number-input');
  if (!tableInput) return;

  // Restore saved table number from localStorage
  const savedTable = localStorage.getItem('afterword_table_num');
  if (savedTable) {
    tableInput.value = savedTable;
  }

  tableInput.addEventListener('change', () => {
    const tableNumber = tableInput.value.trim();
    if (tableNumber) {
      localStorage.setItem('afterword_table_num', tableNumber);
      showToast(`Delivering in-seat orders to Table #${tableNumber}`, 'table_restaurant');
    } else {
      localStorage.removeItem('afterword_table_num');
      showToast('Switched to Counter Pickup', 'storefront');
    }
  });
}
