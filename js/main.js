/* ============================================
   SAFFRON PATEL — Portfolio JS
   Gallery rendering, lightbox, scroll-reveal,
   page transitions, header scroll behavior
   ============================================ */

(function () {
  'use strict';

  // --- Page Transitions ---
  document.querySelectorAll('a[href]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (link.hostname === location.hostname && !link.hash && link.getAttribute('href') !== '#') {
        e.preventDefault();
        var href = link.href;
        document.body.classList.add('transitioning');
        setTimeout(function () {
          window.location = href;
        }, 300);
      }
    });
  });

  // --- Header Hide on Scroll Down, Show on Scroll Up ---
  var header = document.querySelector('header');
  var lastScrollY = window.scrollY;
  var scrollThreshold = 80;

  window.addEventListener('scroll', function () {
    var currentScrollY = window.scrollY;
    if (currentScrollY > scrollThreshold && currentScrollY > lastScrollY) {
      header.classList.add('header-hidden');
    } else {
      header.classList.remove('header-hidden');
    }
    lastScrollY = currentScrollY;
  }, { passive: true });

  // --- Gallery Rendering ---
  var galleryMain = document.querySelector('main.gallery');
  if (galleryMain) {
    var category = galleryMain.getAttribute('data-category');
    var photos = window.PHOTOS && window.PHOTOS[category];
    var grid = document.getElementById('masonry-grid');
    var assetVersion = '20260413';

    function galleryImageUrl(size, file) {
      return 'images/' + category + '/' + size + '/' + file + '?v=' + assetVersion;
    }

    if (photos && grid) {
      // Load saved order if present
      var savedOrder = localStorage.getItem('gallery-order-' + category);
      if (savedOrder) {
        try {
          var savedFiles = JSON.parse(savedOrder);
          var photoMap = {};
          photos.forEach(function (p) { photoMap[p.file] = p; });
          var reordered = [];
          var seen = {};
          savedFiles.forEach(function (f) { if (photoMap[f]) { reordered.push(photoMap[f]); seen[f] = true; } });
          // Append any photos not in saved order (newly added images)
          photos.forEach(function (p) { if (!seen[p.file]) reordered.push(p); });
          photos = reordered;
        } catch (e) { /* ignore corrupt data */ }
      }

      photos.forEach(function (photo, index) {
        var item = document.createElement('div');
        item.className = 'masonry-item';

        var img = document.createElement('img');
        img.src = galleryImageUrl('thumb', photo.file);
        img.alt = photo.location;
        img.loading = index < 6 ? 'eager' : 'lazy';
        img.style.aspectRatio = photo.w + ' / ' + photo.h;
        img.setAttribute('data-index', index);

        var caption = document.createElement('p');
        caption.className = 'caption';
        caption.textContent = photo.location + ' | ' + photo.date + (photo.award ? ' | ' + photo.award : '');

        item.appendChild(img);
        item.appendChild(caption);
        grid.appendChild(item);

        // Click to open lightbox
        img.addEventListener('click', function () {
          if (!editMode) openLightbox(index);
        });
      });

      // --- Scroll Reveal ---
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            // Stagger the reveal slightly based on position
            var delay = Math.random() * 120;
            setTimeout(function () {
              entry.target.classList.add('revealed');
            }, delay);
            revealObserver.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.08,
        rootMargin: '40px'
      });

      document.querySelectorAll('.masonry-item').forEach(function (item) {
        revealObserver.observe(item);
      });

      // --- Lightbox ---
      var lightbox = document.getElementById('lightbox');
      var lightboxImg = document.getElementById('lightbox-img');
      var lightboxCaption = document.getElementById('lightbox-caption');
      var currentIndex = 0;

      function openLightbox(index) {
        currentIndex = index;
        var photo = photos[index];

        // Fade out current image
        lightboxImg.style.opacity = '0';

        // Small delay then load new image
        setTimeout(function () {
          lightboxImg.src = galleryImageUrl('full', photo.file);
          lightboxCaption.textContent = photo.location + ' | ' + photo.date + (photo.award ? ' | ' + photo.award : '');
        }, 150);

        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Preload adjacent
        preloadAdjacent(index);
      }

      function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
      }

      function navigate(direction) {
        currentIndex = (currentIndex + direction + photos.length) % photos.length;
        var photo = photos[currentIndex];

        lightboxImg.style.opacity = '0';
        setTimeout(function () {
          lightboxImg.src = galleryImageUrl('full', photo.file);
          lightboxCaption.textContent = photo.location + ' | ' + photo.date + (photo.award ? ' | ' + photo.award : '');
        }, 150);

        preloadAdjacent(currentIndex);
      }

      function preloadAdjacent(index) {
        var next = (index + 1) % photos.length;
        var prev = (index - 1 + photos.length) % photos.length;
        new Image().src = galleryImageUrl('full', photos[next].file);
        new Image().src = galleryImageUrl('full', photos[prev].file);
      }

      // Fade in image once loaded
      lightboxImg.addEventListener('load', function () {
        lightboxImg.style.opacity = '1';
      });

      // Lightbox controls
      document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
      document.querySelector('.lightbox-prev').addEventListener('click', function () {
        navigate(-1);
      });
      document.querySelector('.lightbox-next').addEventListener('click', function () {
        navigate(1);
      });

      // Close on backdrop click
      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox || e.target.classList.contains('lightbox-image-wrapper')) {
          closeLightbox();
        }
      });

      // Keyboard navigation
      document.addEventListener('keydown', function (e) {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigate(-1);
        if (e.key === 'ArrowRight') navigate(1);
      });

      // Touch / swipe support
      var touchStartX = 0;
      var touchStartY = 0;

      lightbox.addEventListener('touchstart', function (e) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true });

      lightbox.addEventListener('touchend', function (e) {
        var deltaX = e.changedTouches[0].screenX - touchStartX;
        var deltaY = e.changedTouches[0].screenY - touchStartY;

        // Only register horizontal swipes (not vertical scrolls)
        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0) {
            navigate(-1); // Swipe right = previous
          } else {
            navigate(1);  // Swipe left = next
          }
        }
      }, { passive: true });

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
        if (item && !item.contains(e.relatedTarget)) {
          item.classList.remove('drag-over');
        }
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
    }
  }

})();
