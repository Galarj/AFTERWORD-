# AFTERWORD — Project Context, Architecture & State Log

> **Note**: This file serves as the living source of truth for project architecture, established patterns, component registries, and chronological activity logs. Keep this file updated whenever features are added, modified, or refactored.

---

## 1. Project Overview
* **Project Name**: AFTERWORD Community Hub
* **Concept**: A multi-faceted cultural sanctuary combining a curated lending library, specialty espresso café, botanical stem bar, and community gathering space.
* **Core Technologies**: Pure Semantic HTML5, Vanilla CSS3 (Custom Properties / Design Tokens), Modular Vanilla JavaScript (ES6+, zero build-step requirement, compatible with both local `file:///` and HTTP environments).

---

## 2. Directory & File Structure

```
AFTERWORD-/
├── CONTEXT.md                    # Living context, architecture, and change log
├── frontend/
│   ├── index.html                # Sanctuary Home Portal
│   ├── assets/                   # Images and static media assets
│   ├── styles/                   # Modular CSS Architecture
│   │   ├── main.css              # Master orchestrator (@import manager)
│   │   ├── variables.css         # Design tokens (palette, typography, spacing, shadows)
│   │   ├── base.css              # Reset, typography scale, body defaults
│   │   ├── layout.css            # Header, nav, footer, grid utilities (12/4/3/2 col)
│   │   ├── buttons.css           # Button variants (.btn-primary, .btn-secondary, etc.)
│   │   ├── forms.css             # Form inputs, selects, textareas, search bars
│   │   ├── components.css        # Cards, chips, badges, book covers, drawer, toast
│   │   ├── modal.css             # Scrims, dialogs, modal animations
│   │   └── responsive.css        # Breakpoints (1024px tablet, 768px/480px mobile)
│   └── src/
│       ├── js/                   # Modular Single-Responsibility JavaScript
│       │   ├── main.js           # Lightweight bootstrap orchestrator (DOMContentLoaded)
│       │   ├── toast.js          # Transient feedback notifications (showToast)
│       │   ├── navigation.js     # Route highlight, mobile drawer, catalog search routing
│       │   ├── cart.js           # Order tray state, calculations, drawer, event delegation
│       │   ├── filters.js        # Category tabs, catalog live search, event filtering
│       │   ├── modals.js         # Borrow loan holds, event proposals, quick RSVPs
│       │   └── cafe.js           # Table service number persistence (localStorage)
│       └── pages/                # Distinct sub-experience pages
│           ├── library.html      # Stack catalog, live search, borrowing protocols
│           ├── cafe.html         # Espresso bar, artisanal bakery, in-seat table order tray
│           ├── flowers.html      # Botanical stem bar, arrangements, seasonal flora
│           ├── events.html       # Community calendar, RSVP toggles, proposal modal
│           └── book-details.html # In-depth volume view, hold dialog, reading list
```

---

## 3. Core Frontend Standards & Rules

1. **Semantic HTML**: Prioritize `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`, `<button>`, `<form>`. Avoid arbitrary `<div>` containers.
2. **Zero Inline Styles**: Never use `style="..."` attributes in HTML markup. All styling must reside in `frontend/styles/`.
3. **Separation of Concerns**: No inline event attributes (`onclick`, `onchange`, `onsubmit`). Use JavaScript event listeners and event delegation with `data-*` attributes (`data-action`, `data-qty-action`, `data-category`).
4. **CSS Variables & Tokens**: Colors (`--forest`, --espresso`, `--sand`, `--crema`), typography (`--font-display`, `--font-body`, `--font-mono`), and spacing (`--spacing-xs` to `--spacing-2xl`) must reference tokens defined in `variables.css`.
5. **Accessibility (a11y)**: Proper `<label>` for all inputs, `aria-live="polite"` for dynamic notifications, `role="status"`, `aria-label` for icon-only buttons, and full keyboard escape support for modals.
6. **Zero Build Step**: Native browser-compatible scripts allowing seamless execution via standard web server or direct `file:///` inspection without bundlers or CORS blockers.

---

## 4. Subsystem & Function Registry

### A. Toast Engine (`toast.js`)
* `showToast(message, icon)`: Dynamically generates or updates `#toast-container` with an accessible alert, triggers smooth entrance/exit CSS transitions, and auto-dismisses after 3.2 seconds.

### B. Navigation & Routing (`navigation.js`)
* `initNavigation()`: Bootstraps route link highlight, mobile drawer toggles, and global search routing.
* `highlightActiveNavLink()`: Detects `window.location.pathname` and dynamically applies the `.active` class to matching desktop and mobile navigation links.
* `setupMobileDrawer()`: Binds click handlers to `.mobile-menu-btn` to expand/collapse `.mobile-nav-drawer` with appropriate `aria-expanded` attributes.
* `setupHeaderSearch()`: Captures Enter keypresses on the global search input and redirects users to `library.html?q=...` or immediately dispatches an input event if already on the library page.

### C. Cart & Order Tray (`cart.js`)
* `loadCart()`: Retrieves cart items from `localStorage` (`afterword_cart`) with fallback error handling.
* `saveCart()`: Serializes current cart items to `localStorage` and triggers UI synchronizations.
* `getCartCount()`: Calculates cumulative quantity of items in tray.
* `getCartTotal()`: Calculates pre-tax subtotal.
* `addToCart(item)`: Appends an item or increments its quantity if existing; triggers badge bounce animation.
* `updateCartQuantity(index, change)`: Modifies item quantity and automatically removes items reaching zero.
* `bounceBadge()`: Triggers CSS reflow to re-play bounce animation on cart badges.
* `updateCartUI()`: Synchronizes badge counts, tray summary labels, and re-renders cart drawer list.
* `renderCartItems()`: Generates HTML markup for cart items inside `#cart-items-container` and calculates tax (8%) and final totals.
* `openCart()` / `closeCart()`: Toggles `.open` class on drawer scrim and panel.
* `initCart()`: Attaches drawer toggles, checkout actions, clear actions, and event delegation for `data-qty-action` and `data-add-to-cart`.

### D. Filters & Live Search (`filters.js`)
* `initFilters()`: Initializes category tabs, library catalog filters, and event search.
* `setupCategoryTabs()`: Binds click events on `.tab-bar .tab-btn` elements to toggle active classes and filter targets.
* `filterElements(attrName, category)`: Shows or hides elements based on matching attribute values (`data-category`).
* `setupLibraryFilters()`: Reads `?q=` URL search params and binds live `input` events on `#library-search`.
* `applyLibraryFilters()`: Evaluates search terms against book title, author, and category; updates live count indicator.
* `setupEventFilters()`: Binds live `input` and tab events on `#events-search` and `#events-tabs`.
* `applyEventFilters()`: Evaluates event search terms against titles and categories; updates live count indicator.

### E. Modals & Dialogs (`modals.js`)
* `openModal(modalEl)` / `closeModal(modalEl)`: Toggles `.open` class, updates `aria-hidden`, and controls `body.style.overflow`.
* `closeAllModals()`: Closes all currently visible modals.
* `openBorrowModal(bookTitle)`: Populates the book title and opens the loan hold modal.
* `closeBorrowModal()`: Closes the borrow modal dialog.
* `initBorrowModal()`: Binds triggers for opening the hold modal and handles `#borrow-form` submissions.
* `initEventModal()`: Binds triggers for opening community event proposal dialogs and handles submissions.
* `initQuickRsvpButtons()`: Manages interactive RSVP button states (`Reserve` vs `Spot Reserved`).
* `initModals()`: Attaches scrim click-to-close, close buttons, Escape key listener, and global action delegates (`data-action="enroll-patron"`, `data-action="inquire-floral"`, `data-action="add-reading-list"`).

### F. Café Table Service (`cafe.js`)
* `initCafeTable()`: Manages in-seat table number input (`#table-number-input`), persists value to `localStorage` (`afterword_table_num`), and notifies user of delivery mode via toast.

### G. Client Entry Point (`main.js`)
* Bootstraps all customer storefront subsystems sequentially inside `DOMContentLoaded`.

### H. Staff Operations Console (`admin.js` & `admin.css`)
* `initAdminNavigation()`: Coordinates desktop-first sidebar navigation and view panel switching without reloads (Dashboard, Orders, Café, Flowers, Library, Events, Customers, Analytics, Settings).
* `renderOrdersTable()` / `advanceOrderStatus()` / `openOrderModal()`: Real-time orders dispatch pipeline with status filters (Pending, Preparing, Ready, Completed, Cancelled).
* `renderCafeTable()` / `renderFlowersTable()` / `adjustStock()` / `toggleAvailability()`: Inventory management with stock increments/decrements, low-stock warnings, and availability switches.
* `renderLibraryTable()` / `openReservationsModal()`: Stacks circulation tracking, copy allocation, and patron hold queues.
* `renderEventsTable()`: Community gathering roster tracking and capacity progress bars.
* `initGlobalSearch()`: Global keyboard search input with instant routing to filtered views.

---

## 5. Chronological Change & Action Log

| Date / Timestamp | Action / Change Description | Impacted Files |
| :--- | :--- | :--- |
| **2026-09-12 (Initial)** | Completed major frontend refactoring from monolithic code to clean modular architecture. Eliminated 797+ inline styles, created 9-file CSS architecture, 7-file modular JS structure, refactored 6 HTML pages to semantic HTML, and verified 0 console errors. | `frontend/styles/*`, `frontend/src/js/*`, `frontend/src/pages/*`, `frontend/index.html` |
| **2026-09-12 (Follow-up)** | Created `CONTEXT.md` living documentation file to track architecture, functions, and state changes. Added thorough JSDoc comments to all JavaScript functions across `filters.js`, `cart.js`, `modals.js`, `navigation.js`, `toast.js`, `cafe.js`, and `main.js`. | `CONTEXT.md`, `frontend/src/js/*.js` |
| **2026-09-12 (Bugfix)** | Fixed disappearing category tab bar bug in `filters.js`: `filterElements()` previously ran on all elements with `data-category`, inadvertently hiding the `.tab-btn` buttons in `<nav class="tab-bar">`. Added explicit guards to safeguard tab buttons, navigation bars, and headers from visibility manipulation. Verified with browser subagent. | `frontend/src/js/filters.js`, `CONTEXT.md` |
| **2026-09-12 (Admin UI)** | Built comprehensive desktop-first Admin Dashboard UI for AFTERWORD. Features warm brand design system, interactive sidebar routing across 9 views, live orders dispatch pipeline with status filters, inventory management with stock counters, library circulation with hold queues, event rosters, patron directory, and analytics. Fully verified in browser with 0 console errors and zero inline styles. | `frontend/src/pages/admin.html`, `frontend/styles/admin.css`, `frontend/src/js/admin.js`, `frontend/index.html`, `CONTEXT.md` |
| **2026-09-13 (Homepage Redesign)** | Fully redesigned the AFTERWORD homepage. Completely eliminated pretentious / corporate / luxury literary manifesto copy ("neighborhood sanctuary", "intentional third place", "human pacing", "civic third space"). Implemented warm, casual, human neighborhood café identity: "Coffee. Books. Flowers. Games. Whatever's happening today." and "Come in. Get comfortable. Stay awhile." Added 8 clean sections: Navbar, Hero, Today at AFTERWORD (Open Today, Seating 64%), Four Parts of One Place (Café, Library, Flowers, Community), What's Happening (Board Game Night, Coffee Tasting, Flower Workshop, Movie Night), Personal Bookshelf Library Feature, Fresh Flowers Feature, Final CTA ("GRAB SOMETHING. FIND A SEAT. STAY."), and neighborhood footer. Verified with browser subagent and 0 console errors. | `frontend/index.html`, `frontend/styles/components.css`, `CONTEXT.md` |
| **2026-09-13 (Milestone Docs)** | Created comprehensive term project documentation (`docs/PROJECT_DOCUMENTATION.md`) covering Milestones 1 through 10: Business concept, sitemap, semantic HTML structure, CSS design tokens, function-by-function deep-dive for all client-side JS subsystems, MySQL schema ERD, Express REST API specification, CRUD matrix, input validation, and final presentation guide. | `docs/PROJECT_DOCUMENTATION.md`, `CONTEXT.md` |
| **2026-09-23 (Café Refactor)** | Simplified café categories and refined hero copy on `cafe.html`. Replaced multi-tier specialty tabs (Espresso Bar, Slow Bar, Botanical Drinks, Morning Hearth Bakes, Savory Plates) with 4 clean, straightforward tabs: "All Offerings", "Coffee", "Drinks", and "Food". Updated card attributes and database seed mappings accordingly. | `frontend/src/pages/cafe.html`, `database/seed.sql`, `CONTEXT.md` |