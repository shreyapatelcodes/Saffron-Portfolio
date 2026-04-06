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

    if (photos && grid) {
      photos.forEach(function (photo, index) {
        var item = document.createElement('div');
        item.className = 'masonry-item';

        var img = document.createElement('img');
        img.src = 'images/' + category + '/thumb/' + photo.file;
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
          openLightbox(index);
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
          lightboxImg.src = 'images/' + category + '/full/' + photo.file;
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
          lightboxImg.src = 'images/' + category + '/full/' + photo.file;
          lightboxCaption.textContent = photo.location + ' | ' + photo.date + (photo.award ? ' | ' + photo.award : '');
        }, 150);

        preloadAdjacent(currentIndex);
      }

      function preloadAdjacent(index) {
        var next = (index + 1) % photos.length;
        var prev = (index - 1 + photos.length) % photos.length;
        new Image().src = 'images/' + category + '/full/' + photos[next].file;
        new Image().src = 'images/' + category + '/full/' + photos[prev].file;
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
    }
  }

})();
