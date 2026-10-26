document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.menu-toggle');
  var body = document.body;

  if (toggle) {
    toggle.addEventListener('click', function () {
      var isOpen = body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  document.querySelectorAll('.mobile-nav a').forEach(function (link) {
    link.addEventListener('click', function () {
      body.classList.remove('nav-open');
    });
  });

  /* -----------------------------------------------------
     TOPBAR AUTO-HIDE — hide on scroll down, reveal on scroll up
     (mobile/tablet only; the topbar itself is hidden on desktop
     via CSS so this simply does nothing there).
  ----------------------------------------------------- */
  var topbar = document.querySelector('.topbar');
  if (topbar) {
    var lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
    var ticking = false;
    var revealThreshold = 12; // ignore tiny scroll jitters
    var topZone = 40; // always show near the very top of the page

    function handleScroll() {
      var currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

      if (body.classList.contains('nav-open')) {
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }

      var delta = currentScrollY - lastScrollY;

      if (currentScrollY <= topZone) {
        topbar.classList.remove('topbar-hidden');
      } else if (delta > revealThreshold) {
        topbar.classList.add('topbar-hidden');
        lastScrollY = currentScrollY;
      } else if (delta < -revealThreshold) {
        topbar.classList.remove('topbar-hidden');
        lastScrollY = currentScrollY;
      }

      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(handleScroll);
        ticking = true;
      }
    }, { passive: true });
  }

  /* -----------------------------------------------------
     GALLERY SETUP
  ----------------------------------------------------- */
  var gallery = document.querySelector('.gallery');
  if (!gallery) return;

  // `items` stays in the original HTML order, even after we move
  // the elements into columns. The lightbox relies on this.
  var items = Array.prototype.slice.call(gallery.querySelectorAll('.grid-item'));
  if (!items.length) return;

  /* -----------------------------------------------------
     MASONRY — left-to-right ordering, no gaps.
     Each image goes into whichever column is currently shortest,
     so the order reads across rows: 1 2 3 / 4 5 6 / ...
     Aspect ratios come from width/height attributes if present,
     otherwise each thumbnail is measured once before layout.
  ----------------------------------------------------- */
  var ratios = [];      // height / width for each item, same order as `items`
  var currentCols = 0;

  function getColCount() {
    var w = window.innerWidth;
    if (w <= 480) return 1;
    if (w <= 1080) return 2;
    return 3;
  }

  function layoutMasonry() {
    var n = getColCount();
    if (n === currentCols) return;
    currentCols = n;

    var cols = [];
    var heights = [];
    gallery.innerHTML = '';

    for (var i = 0; i < n; i++) {
      var col = document.createElement('div');
      col.className = 'gallery-col';
      gallery.appendChild(col);
      cols.push(col);
      heights.push(0);
    }

    items.forEach(function (item, index) {
      var shortest = heights.indexOf(Math.min.apply(null, heights));
      cols[shortest].appendChild(item);
      heights[shortest] += ratios[index];
    });
  }

  function measureImages(done) {
    var pending = items.length;

    function finishOne() {
      pending--;
      if (pending === 0) done();
    }

    items.forEach(function (item, index) {
      var img = item.querySelector('img');
      var w = parseFloat(img.getAttribute('width'));
      var h = parseFloat(img.getAttribute('height'));

      if (w > 0 && h > 0) {
        ratios[index] = h / w;
        finishOne();
        return;
      }

      var probe = new Image();
      probe.onload = function () {
        ratios[index] = (probe.naturalHeight / probe.naturalWidth) || 1;
        finishOne();
      };
      probe.onerror = function () {
        ratios[index] = 1;
        finishOne();
      };
      probe.src = img.getAttribute('src');
    });
  }

  measureImages(function () {
    layoutMasonry();
    gallery.classList.add('is-ready');
    window.addEventListener('resize', layoutMasonry);
  });

  /* -----------------------------------------------------
     LIGHTBOX — click any gallery image to preview it larger
     with a white frame, dark backdrop, and prev/next arrows.
     Uses the full-size image from each link's href.
  ----------------------------------------------------- */
  var images = items.map(function (item) {
    var img = item.querySelector('img');
    return {
      src: item.getAttribute('href'),
      alt: img.getAttribute('alt') || ''
    };
  });

  var currentIndex = 0;

  var overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Image preview');
  overlay.innerHTML =
    '<button class="lightbox-close" aria-label="Close preview">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></svg>' +
    '</button>' +
    '<button class="lightbox-nav lightbox-prev" aria-label="Previous image">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 4 7 12 15 20"/></svg>' +
    '</button>' +
    '<button class="lightbox-nav lightbox-next" aria-label="Next image">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 4 17 12 9 20"/></svg>' +
    '</button>' +
    '<div class="lightbox-frame"><img alt=""></div>';
  document.body.appendChild(overlay);

  var frameImg = overlay.querySelector('.lightbox-frame img');
  var btnClose = overlay.querySelector('.lightbox-close');
  var btnPrev = overlay.querySelector('.lightbox-prev');
  var btnNext = overlay.querySelector('.lightbox-next');

  function showImage(index) {
    currentIndex = (index + images.length) % images.length;
    frameImg.setAttribute('src', images[currentIndex].src);
    frameImg.setAttribute('alt', images[currentIndex].alt);
  }

  function openLightbox(index) {
    showImage(index);
    overlay.classList.add('is-open');
    body.classList.add('lightbox-open');
  }

  function closeLightbox() {
    overlay.classList.remove('is-open');
    body.classList.remove('lightbox-open');
  }

  items.forEach(function (item, index) {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      openLightbox(index);
    });
  });

  btnClose.addEventListener('click', closeLightbox);
  btnPrev.addEventListener('click', function () { showImage(currentIndex - 1); });
  btnNext.addEventListener('click', function () { showImage(currentIndex + 1); });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
    if (e.key === 'ArrowRight') showImage(currentIndex + 1);
  });

  /* basic swipe support for touch devices */
  var touchStartX = null;
  overlay.addEventListener('touchstart', function (e) {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });
  overlay.addEventListener('touchend', function (e) {
    if (touchStartX === null) return;
    var deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 40) {
      showImage(currentIndex + (deltaX < 0 ? 1 : -1));
    }
    touchStartX = null;
  }, { passive: true });
});
