# Gallery Drag-and-Drop Reorder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a password-protected drag-and-drop reordering mode to all gallery pages, with save/discard and localStorage persistence.

**Architecture:** All logic lives in `js/main.js` (already loaded by all 4 gallery pages) and `css/style.css`. A fixed lock button in the bottom-left toggles edit mode after a password prompt. In edit mode, masonry items are draggable via HTML5 Drag & Drop — dropping one item over another swaps them in the DOM. Save writes the new filename order to `localStorage['gallery-order-<category>']`; on page load that order is applied before rendering.

**Tech Stack:** Vanilla JS (ES5-style IIFE, matching existing code), HTML5 Drag & Drop API, localStorage, CSS

---

### Task 1: Load saved order from localStorage before rendering

**Files:**
- Modify: `js/main.js` — insert reorder logic just before the `photos.forEach` call (around line 52)

**Step 1: Add the saved-order loader**

Inside the `if (photos && grid)` block, immediately before `photos.forEach(...)`, add:

```js
// Load saved order if present
var savedOrder = localStorage.getItem('gallery-order-' + category);
if (savedOrder) {
  try {
    var savedFiles = JSON.parse(savedOrder);
    var photoMap = {};
    photos.forEach(function (p) { photoMap[p.file] = p; });
    var reordered = [];
    savedFiles.forEach(function (f) { if (photoMap[f]) reordered.push(photoMap[f]); });
    // Append any photos not in saved order (newly added images)
    photos.forEach(function (p) { if (!photoMap[p.file] || reordered.indexOf(photoMap[p.file]) === -1) reordered.push(p); });
    photos = reordered;
  } catch (e) { /* ignore corrupt data */ }
}
```

**Step 2: Note — `photos` must be a `var`, not `const`**

The existing code uses `var photos = window.PHOTOS && window.PHOTOS[category];` so reassignment is fine.

**Step 3: Manual test**

Open any gallery page. Open DevTools console and run:
```js
localStorage.setItem('gallery-order-portraits', JSON.stringify(['portraits-03.jpg','portraits-01.jpg','portraits-02.jpg']));
```
Reload — portraits-03 should appear first. Then clear:
```js
localStorage.removeItem('gallery-order-portraits');
```

**Step 4: Commit**

```bash
git add js/main.js
git commit -m "feat: load saved gallery order from localStorage on page load"
```

---

### Task 2: Add CSS for edit mode UI

**Files:**
- Modify: `css/style.css` — append at bottom

**Step 1: Add styles**

Append to the end of `css/style.css`:

```css
/* --- Gallery Drag Reorder --- */
#gallery-lock-btn {
  position: fixed;
  bottom: 1.2rem;
  left: 1.2rem;
  z-index: 500;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  opacity: 0.35;
  transition: opacity 0.2s ease;
  padding: 4px;
  line-height: 1;
  user-select: none;
}

#gallery-lock-btn:hover {
  opacity: 0.7;
}

#gallery-lock-btn.edit-active {
  opacity: 0.9;
}

.gallery-edit-controls {
  position: fixed;
  bottom: 1.2rem;
  left: 3rem;
  z-index: 500;
  display: none;
  gap: 0.5rem;
}

.gallery-edit-controls.visible {
  display: flex;
}

.gallery-edit-controls button {
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  padding: 0.35rem 0.75rem;
  border: 1.5px solid #1a1a1a;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
  background: #fff;
  color: #1a1a1a;
}

.gallery-edit-controls .btn-save {
  background: #1a1a1a;
  color: #fff;
}

.gallery-edit-controls .btn-save:hover {
  background: #444;
}

.gallery-edit-controls .btn-discard:hover {
  background: #f5f5f5;
}

/* Edit mode item styles */
body.gallery-edit-mode .masonry-item {
  cursor: grab;
  outline: 1.5px dashed rgba(0,0,0,0.15);
  outline-offset: 2px;
}

body.gallery-edit-mode .masonry-item:active {
  cursor: grabbing;
}

.masonry-item.drag-over {
  outline: 2px solid #1a1a1a !important;
  outline-offset: 3px;
}

.masonry-item.dragging {
  opacity: 0.4;
}
```

**Step 2: Manual check**

No visual change expected yet — styles just need to be present.

**Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: add CSS for gallery drag reorder UI"
```

---

### Task 3: Add lock button, password logic, and drag-and-drop

**Files:**
- Modify: `js/main.js` — add after the lightbox/keyboard/touch block (after line 199), still inside `if (photos && grid)`

**Step 1: Add the lock button and all drag-reorder logic**

After the touch swipe block (after the closing `}, { passive: true });` for touchend), and before the closing `}` of `if (photos && grid)`, insert:

```js
// --- Drag Reorder ---
var EDIT_PASSWORD = 'sAfpic$';
var editMode = false;
var hasUnsavedChanges = false;
var originalOrder = photos.map(function (p) { return p.file; });

// Lock button
var lockBtn = document.createElement('button');
lockBtn.id = 'gallery-lock-btn';
lockBtn.title = 'Toggle edit mode';
lockBtn.textContent = '🔒';
document.body.appendChild(lockBtn);

// Save / Discard controls
var editControls = document.createElement('div');
editControls.className = 'gallery-edit-controls';
editControls.innerHTML =
  '<button class="btn-save">Save</button>' +
  '<button class="btn-discard">Discard</button>';
document.body.appendChild(editControls);

function getCurrentOrder() {
  return Array.from(grid.querySelectorAll('.masonry-item img')).map(function (img) {
    return img.getAttribute('src').split('/').pop().split('?')[0];
  });
}

function enableEditMode() {
  editMode = true;
  document.body.classList.add('gallery-edit-mode');
  lockBtn.textContent = '🔓';
  lockBtn.classList.add('edit-active');
  grid.querySelectorAll('.masonry-item').forEach(function (item) {
    item.setAttribute('draggable', 'true');
  });
}

function disableEditMode() {
  editMode = false;
  document.body.classList.remove('gallery-edit-mode');
  lockBtn.textContent = '🔒';
  lockBtn.classList.remove('edit-active');
  editControls.classList.remove('visible');
  hasUnsavedChanges = false;
  grid.querySelectorAll('.masonry-item').forEach(function (item) {
    item.removeAttribute('draggable');
  });
}

lockBtn.addEventListener('click', function () {
  if (editMode) {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Discard them?')) {
        discardChanges();
        disableEditMode();
      }
    } else {
      disableEditMode();
    }
  } else {
    var pw = prompt('Enter password to edit gallery order:');
    if (pw === EDIT_PASSWORD) {
      enableEditMode();
    }
  }
});

// Save
editControls.querySelector('.btn-save').addEventListener('click', function () {
  var order = getCurrentOrder();
  localStorage.setItem('gallery-order-' + category, JSON.stringify(order));
  originalOrder = order;
  hasUnsavedChanges = false;
  editControls.classList.remove('visible');
});

// Discard
function discardChanges() {
  // Re-render items in original order
  var items = Array.from(grid.querySelectorAll('.masonry-item'));
  var itemMap = {};
  items.forEach(function (item) {
    var file = item.querySelector('img').getAttribute('src').split('/').pop().split('?')[0];
    itemMap[file] = item;
  });
  originalOrder.forEach(function (file) {
    if (itemMap[file]) grid.appendChild(itemMap[file]);
  });
  hasUnsavedChanges = false;
  editControls.classList.remove('visible');
}

editControls.querySelector('.btn-discard').addEventListener('click', function () {
  discardChanges();
});

// Drag and Drop
var dragSrcItem = null;

grid.addEventListener('dragstart', function (e) {
  var item = e.target.closest('.masonry-item');
  if (!item || !editMode) return;
  dragSrcItem = item;
  item.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
});

grid.addEventListener('dragend', function (e) {
  var item = e.target.closest('.masonry-item');
  if (item) item.classList.remove('dragging');
  grid.querySelectorAll('.masonry-item').forEach(function (i) {
    i.classList.remove('drag-over');
  });
  dragSrcItem = null;
});

grid.addEventListener('dragover', function (e) {
  e.preventDefault();
  var item = e.target.closest('.masonry-item');
  if (!item || item === dragSrcItem) return;
  grid.querySelectorAll('.masonry-item').forEach(function (i) {
    i.classList.remove('drag-over');
  });
  item.classList.add('drag-over');
});

grid.addEventListener('dragleave', function (e) {
  var item = e.target.closest('.masonry-item');
  if (item) item.classList.remove('drag-over');
});

grid.addEventListener('drop', function (e) {
  e.preventDefault();
  var targetItem = e.target.closest('.masonry-item');
  if (!targetItem || !dragSrcItem || targetItem === dragSrcItem) return;
  targetItem.classList.remove('drag-over');

  // Swap positions in DOM
  var allItems = Array.from(grid.querySelectorAll('.masonry-item'));
  var srcIdx = allItems.indexOf(dragSrcItem);
  var tgtIdx = allItems.indexOf(targetItem);

  if (srcIdx < tgtIdx) {
    grid.insertBefore(dragSrcItem, targetItem.nextSibling);
  } else {
    grid.insertBefore(dragSrcItem, targetItem);
  }

  hasUnsavedChanges = true;
  editControls.classList.add('visible');
});
```

**Step 2: Manual test**

1. Open any gallery page (e.g. portraits.html)
2. Click the 🔒 icon (bottom-left, faint)
3. Enter wrong password — nothing happens
4. Enter `sAfpic$` — icon changes to 🔓, items get dashed outlines
5. Drag an image to a different position — it swaps; Save/Discard buttons appear
6. Click Save — buttons hide, reload the page — order persists
7. Re-enter edit mode, drag something, click Discard — original order restores
8. Click 🔓 with unsaved changes — confirm dialog appears
9. Click 🔓 with no unsaved changes — exits edit mode cleanly

**Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: add password-protected drag-and-drop gallery reorder with save/discard"
```

---

### Task 4: Fix image click conflict in edit mode

**Files:**
- Modify: `js/main.js` — find the `img.addEventListener('click', ...)` block (around line 72)

**Step 1: Guard lightbox open against edit mode**

Change:
```js
img.addEventListener('click', function () {
  openLightbox(index);
});
```

To:
```js
img.addEventListener('click', function () {
  if (!editMode) openLightbox(index);
});
```

> Note: `editMode` is declared in the drag-reorder block added in Task 3, which runs after this code but is in the same closure scope — so hoisting of `var editMode` makes it accessible here.

**Step 2: Manual test**

In edit mode, click an image — lightbox should NOT open. Outside edit mode, click — lightbox should open normally.

**Step 3: Commit**

```bash
git add js/main.js
git commit -m "fix: prevent lightbox from opening when in gallery edit mode"
```

---

### Task 5: Verify all 4 gallery pages work

**Step 1: Test each page**

Open each of these and confirm drag reorder works independently (each has its own localStorage key):
- `portraits.html` → key: `gallery-order-portraits`
- `scenes.html` → key: `gallery-order-scenes`
- `wildlife.html` → key: `gallery-order-wildlife`
- `landscapes.html` → key: `gallery-order-landscapes`

**Step 2: Edge case — reload after save on each page**

Save a reorder on each page, reload, confirm order persists.

**Step 3: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "feat: gallery drag reorder complete across all gallery pages"
```
