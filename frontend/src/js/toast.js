/**
 * AFTERWORD — TOAST NOTIFICATION SYSTEM
 * Handles transient feedback alerts with smooth entrance/exit transitions.
 */

/**
 * Creates and displays an accessible, self-dismissing toast notification alert.
 * - Ensures `#toast-container` exists in the DOM with `aria-live="polite"`.
 * - Appends a new toast item with an icon and message.
 * - Triggers entrance animation via CSS `.show` class using `requestAnimationFrame`.
 * - Automatically fades out and removes the element after 3.2 seconds.
 * 
 * @param {string} message - Feedback message string displayed to the user.
 * @param {string} [icon='info'] - Material Symbols icon identifier (e.g. 'shopping_bag', 'check_circle').
 */
function showToast(message, icon = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <span class="material-symbols-outlined toast__icon" aria-hidden="true">${icon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Trigger entrance transition on next paint
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Automatically dismiss after 3.2 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 3200);
}
