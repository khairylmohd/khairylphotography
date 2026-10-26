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

     ZOOM
       Desktop : mouse wheel / trackpad pinch (zooms toward cursor),
                 double-click, drag to pan, + / - / 0 keys,
                 on-screen +/- buttons.
       Touch   : pinch to zoom, double-tap, one-finger pan when zoomed.
       Swipe left/right to change image only when NOT zoomed.
  ----------------------------------------------------- */
  var images = items.map(function (item) {
    var img = item.querySelector('img');
    return {
      src: item.getAttribute('href'),
      alt: img.getAttribute('alt') || ''
    };
  });

  var currentIndex = 0;

  var MIN_SCALE = 1;
  var MAX_SCALE = 4;
  var DOUBLE_TAP_SCALE = 2.5;
  var BUTTON_STEP = 1.5;

  var overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Image preview');
  overlay.innerHTML =
    '<button class="lightbox-close" aria-label="Close preview">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="4" y1="4" x2="20" y2="20"/><line x1="20" y1="4" x2="4" y2="20"/></svg>' +
    '</button>' +
    '<div class="lightbox-zoom" role="group" aria-label="Zoom controls">' +
      '<button class="lightbox-zoom-out" aria-label="Zoom out">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
      '</button>' +
      '<button class="lightbox-zoom-in" aria-label="Zoom in">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><line x1="12" y1="5" x2="12" y2="19"/></svg>' +
      '</button>' +
    '</div>' +
    '<button class="lightbox-nav lightbox-prev" aria-label="Previous image">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 4 7 12 15 20"/></svg>' +
    '</button>' +
    '<button class="lightbox-nav lightbox-next" aria-label="Next image">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 4 17 12 9 20"/></svg>' +
    '</button>' +
    '<div class="lightbox-frame"><div class="lightbox-stage"><img alt="" draggable="false"></div></div>';
  document.body.appendChild(overlay);

  var frameImg = overlay.querySelector('.lightbox-frame img');
  var stage = overlay.querySelector('.lightbox-stage');
  var btnClose = overlay.querySelector('.lightbox-close');
  var btnPrev = overlay.querySelector('.lightbox-prev');
  var btnNext = overlay.querySelector('.lightbox-next');
  var btnZoomIn = overlay.querySelector('.lightbox-zoom-in');
  var btnZoomOut = overlay.querySelector('.lightbox-zoom-out');

  /* ---------- zoom state + math ---------- */
  var scale = 1, tx = 0, ty = 0;

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  // Apply the current scale/translate, keeping the image inside the stage.
  function applyTransform(animate) {
    var w = stage.clientWidth;
    var h = stage.clientHeight;
    var maxX = Math.max(0, (w * scale - w) / 2);
    var maxY = Math.max(0, (h * scale - h) / 2);
    tx = clamp(tx, -maxX, maxX);
    ty = clamp(ty, -maxY, maxY);
    frameImg.style.transition = animate ? 'transform .25s ease' : 'none';
    frameImg.style.transform =
      'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    overlay.classList.toggle('is-zoomed', scale > 1.001);
  }

  // Zoom to newScale keeping the point (cx, cy) fixed.
  // cx / cy are measured from the CENTRE of the stage.
  function zoomAt(newScale, cx, cy, animate) {
    newScale = clamp(newScale, MIN_SCALE, MAX_SCALE);
    var k = newScale / scale;
    tx = cx - (cx - tx) * k;
    ty = cy - (cy - ty) * k;
    scale = newScale;
    if (scale <= 1.001) { scale = 1; tx = 0; ty = 0; }
    applyTransform(animate);
  }

  function resetZoom() {
    scale = 1; tx = 0; ty = 0;
    applyTransform(false);
  }

  // Pointer position relative to stage centre
  function relToStage(clientX, clientY) {
    var r = stage.getBoundingClientRect();
    return {
      x: clientX - (r.left + r.width / 2),
      y: clientY - (r.top + r.height / 2)
    };
  }

  /* ---------- open / close / navigate ---------- */
  function showImage(index) {
    currentIndex = (index + images.length) % images.length;
    resetZoom();
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
    resetZoom();
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
  btnZoomIn.addEventListener('click', function () { zoomAt(scale * BUTTON_STEP, 0, 0, true); });
  btnZoomOut.addEventListener('click', function () { zoomAt(scale / BUTTON_STEP, 0, 0, true); });

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
    if (e.key === 'ArrowRight') showImage(currentIndex + 1);
    if (e.key === '+' || e.key === '=') zoomAt(scale * BUTTON_STEP, 0, 0, true);
    if (e.key === '-' || e.key === '_') zoomAt(scale / BUTTON_STEP, 0, 0, true);
    if (e.key === '0') zoomAt(1, 0, 0, true);
  });

  /* ---------- mouse wheel / trackpad pinch (ctrl+wheel) ---------- */
  overlay.addEventListener('wheel', function (e) {
    if (!overlay.classList.contains('is-open')) return;
    e.preventDefault();
    var delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
    var factor = Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0025));
    var p = relToStage(e.clientX, e.clientY);
    zoomAt(scale * factor, p.x, p.y, false);
  }, { passive: false });

  /* ---------- pointer gestures (mouse + touch + pen) ---------- */
  var pointers = {};     // pointerId -> {x, y}
  var gesture = null;    // current pan or pinch
  var downInfo = null;   // info about the current single-pointer press
  var lastTap = { time: 0, x: 0, y: 0 };

  function pointerIds() { return Object.keys(pointers); }

  function startPan(x, y) {
    gesture = { type: 'pan', sx: x, sy: y, stx: tx, sty: ty };
  }

  function startPinch() {
    var ids = pointerIds();
    var a = pointers[ids[0]], b = pointers[ids[1]];
    var mid = relToStage((a.x + b.x) / 2, (a.y + b.y) / 2);
    gesture = {
      type: 'pinch',
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      scale0: scale, tx0: tx, ty0: ty,
      mid0: mid
    };
  }

  function toggleZoomAt(clientX, clientY) {
    if (scale > 1.001) {
      zoomAt(1, 0, 0, true);
    } else {
      var p = relToStage(clientX, clientY);
      zoomAt(DOUBLE_TAP_SCALE, p.x, p.y, true);
    }
  }

  overlay.addEventListener('pointerdown', function (e) {
    if (!overlay.classList.contains('is-open')) return;
    if (e.target.closest('button')) return;              // let buttons work normally
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var n = pointerIds().length;

    if (n === 1) {
      downInfo = { x: e.clientX, y: e.clientY, time: Date.now(), target: e.target, moved: false, multi: false };
      startPan(e.clientX, e.clientY);
    } else if (n === 2) {
      if (downInfo) downInfo.multi = true;
      startPinch();
    }
  });

  overlay.addEventListener('pointermove', function (e) {
    var p = pointers[e.pointerId];
    if (!p || !gesture) return;
    p.x = e.clientX;
    p.y = e.clientY;

    if (gesture.type === 'pinch' && pointerIds().length >= 2) {
      var ids = pointerIds();
      var a = pointers[ids[0]], b = pointers[ids[1]];
      var dist = Math.hypot(a.x - b.x, a.y - b.y);
      var mid = relToStage((a.x + b.x) / 2, (a.y + b.y) / 2);
      var s2 = clamp(gesture.scale0 * dist / gesture.dist, MIN_SCALE, MAX_SCALE);
      var k = s2 / gesture.scale0;
      scale = s2;
      tx = mid.x - (gesture.mid0.x - gesture.tx0) * k;
      ty = mid.y - (gesture.mid0.y - gesture.ty0) * k;
      applyTransform(false);
    } else if (gesture.type === 'pan') {
      var dx = e.clientX - gesture.sx;
      var dy = e.clientY - gesture.sy;
      if (downInfo && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) downInfo.moved = true;
      if (scale > 1.001) {
        tx = gesture.stx + dx;
        ty = gesture.sty + dy;
        overlay.classList.add('is-panning');
        applyTransform(false);
      }
    }
  });

  function handleSingle(e, info) {
    var dx = e.clientX - info.x;
    var dy = e.clientY - info.y;
    var dt = Date.now() - info.time;

    // Tap / click
    if (!info.moved && dt < 350) {
      var now = Date.now();
      var inFrame = !!info.target.closest('.lightbox-frame');

      if (inFrame && now - lastTap.time < 300 &&
          Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
        lastTap.time = 0;
        toggleZoomAt(e.clientX, e.clientY);
        return;
      }
      lastTap = { time: now, x: e.clientX, y: e.clientY };

      // Tap on the dark backdrop closes
      if (info.target === overlay) closeLightbox();
      return;
    }

    // Swipe to change image (touch/pen only, and only when not zoomed)
    if (scale <= 1.001 && e.pointerType !== 'mouse' &&
        Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      showImage(currentIndex + (dx < 0 ? 1 : -1));
    }
  }

  function endPointer(e) {
    if (!pointers[e.pointerId]) return;
    delete pointers[e.pointerId];
    var ids = pointerIds();

    if (ids.length === 0) {
      if (e.type === 'pointerup' && downInfo && !downInfo.multi) handleSingle(e, downInfo);
      gesture = null;
      downInfo = null;
      overlay.classList.remove('is-panning');
      if (scale < 1.001) resetZoom();
    } else if (ids.length === 1) {
      // went from pinch back to one finger: carry on panning smoothly
      var rest = pointers[ids[0]];
      startPan(rest.x, rest.y);
      if (downInfo) downInfo.moved = true;
    }
  }

  overlay.addEventListener('pointerup', endPointer);
  overlay.addEventListener('pointercancel', endPointer);

  // keep the image inside its frame if the window changes size / rotates
  window.addEventListener('resize', function () { applyTransform(false); });
});