(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Gentle fade-in on scroll
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    els.forEach(function (el) { io.observe(el); });
  }

  // Mobile menu
  var nav = document.querySelector('nav');
  var menuBtn = document.querySelector('.menu-btn');
  if (nav && menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.focus();
      }
    });
  }

  // Count-up numbers on stat tiles
  var counters = document.querySelectorAll('[data-count]');
  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var start = null;
    var duration = 1200;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased).toLocaleString() + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    // Animation frames pause in background tabs; make sure the final value always lands.
    setTimeout(function () { el.textContent = target.toLocaleString() + suffix; }, duration + 100);
  }
  if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCounter(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  }

  // Hover to open (desktop): resting on a card opens it and closes the others,
  // so moving down the list flips through them. Touch devices keep tap-to-open.
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.querySelectorAll('[data-hover-open]').forEach(function (stack) {
    if (!canHover) return;
    var cards = stack.querySelectorAll('details.expand');
    var timer = null;
    cards.forEach(function (card) {
      var suppressed = false; // set when the visitor clicks a card closed, until the mouse leaves it
      card.querySelector('summary').addEventListener('click', function () {
        if (card.open) suppressed = true;
      });
      // mousemove (not mouseenter) so cards sliding under a still cursor don't trigger a switch
      card.addEventListener('mousemove', function () {
        if (card.open || suppressed || timer) return;
        timer = setTimeout(function () {
          timer = null;
          cards.forEach(function (other) { if (other !== card) other.open = false; });
          card.open = true;
        }, 140);
      });
      card.addEventListener('mouseleave', function () {
        suppressed = false;
        if (timer) { clearTimeout(timer); timer = null; }
      });
    });
  });

  // Honors filter chips
  var chips = document.querySelectorAll('.chip[data-filter]');
  var awards = document.querySelectorAll('.award[data-cat]');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      awards.forEach(function (a) {
        var show = f === 'all' || a.getAttribute('data-cat') === f;
        a.classList.toggle('is-hidden', !show);
        a.classList.remove('pop');
        if (show && !reduceMotion) { void a.offsetWidth; a.classList.add('pop'); }
      });
    });
  });

  // Glow that follows the cursor on award cards
  awards.forEach(function (a) {
    a.addEventListener('mousemove', function (e) {
      var r = a.getBoundingClientRect();
      a.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      a.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // Site-wide soft glow that follows the mouse
  if (canHover && !reduceMotion) {
    var glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);
    var gx = 0, gy = 0, glowQueued = false;
    document.addEventListener('mousemove', function (e) {
      gx = e.clientX; gy = e.clientY;
      glow.classList.add('on');
      if (glowQueued) return;
      glowQueued = true;
      requestAnimationFrame(function () {
        glowQueued = false;
        glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px)';
      });
    });
    document.documentElement.addEventListener('mouseleave', function () { glow.classList.remove('on'); });
  }

  // Home sketch: hiker walks up the trail as the page scrolls; the sun toggles night
  var sketch = document.querySelector('svg.home-sketch');
  if (sketch) {
    var route = sketch.querySelector('#route');
    var hiker = sketch.querySelector('#hiker');
    var routeLen = route.getTotalLength();
    var REST = 0.4;          // where the hiker stops after the intro walk
    var pos = 0.08, started = false, walking = false;

    function scrollProgress() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
    }
    function goal() { return started ? REST + (0.97 - REST) * scrollProgress() : 0.08; }
    function place(p) {
      var at = route.getPointAtLength(p * routeLen);
      var ahead = route.getPointAtLength(Math.min(routeLen, p * routeLen + 3));
      var dir = ahead.x < at.x ? -1 : 1;
      hiker.setAttribute('transform', 'translate(' + at.x.toFixed(1) + ' ' + at.y.toFixed(1) + ') scale(' + dir + ' 1)');
    }
    function tick() {
      var g = goal();
      pos += (g - pos) * 0.045;
      if (Math.abs(g - pos) < 0.0008) pos = g;
      place(pos);
      var moving = pos !== g;
      hiker.classList.toggle('walking', moving);
      walking = moving;
      if (moving) requestAnimationFrame(tick);
    }
    function nudge() { if (!walking) { walking = true; requestAnimationFrame(tick); } }

    place(pos);
    if (reduceMotion) {
      started = true; pos = goal(); place(pos);
      hiker.classList.add('ready');
      window.addEventListener('scroll', function () { pos = goal(); place(pos); }, { passive: true });
    } else {
      setTimeout(function () { started = true; hiker.classList.add('ready'); nudge(); }, 1500);
      window.addEventListener('scroll', function () { if (started) nudge(); }, { passive: true });
    }

    var sun = sketch.querySelector('#sun');
    function toggleNight() {
      sketch.classList.toggle('night');
      sketch.classList.remove('shooting');
      void sketch.getBoundingClientRect();
      if (!reduceMotion) sketch.classList.add('shooting');
    }
    sun.addEventListener('click', toggleNight);
    sun.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleNight(); }
    });
  }

  // Experience timeline: the line fills and dots light up as you scroll past each role
  var timeline = document.querySelector('.timeline');
  if (timeline) {
    var stops = timeline.querySelectorAll('.expand');
    var tlQueued = false;
    function updateTimeline() {
      tlQueued = false;
      var anchor = window.innerHeight * 0.6;
      // At the bottom of the page, light everything (the last roles can't scroll up to the anchor).
      var atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      if (atBottom) anchor = Infinity;
      var r = timeline.getBoundingClientRect();
      var fill = Math.min(Math.max(anchor - r.top, 0), r.height - 20);
      timeline.style.setProperty('--tl-fill', fill + 'px');
      stops.forEach(function (s) {
        s.classList.toggle('lit', s.getBoundingClientRect().top + 40 < anchor);
      });
    }
    function queueTimeline() { if (!tlQueued) { tlQueued = true; requestAnimationFrame(updateTimeline); } }
    window.addEventListener('scroll', queueTimeline, { passive: true });
    window.addEventListener('resize', queueTimeline);
    updateTimeline();
    // Cards animate open and closed, so re-measure for a moment after each toggle.
    stops.forEach(function (s) {
      s.addEventListener('toggle', function () {
        var until = Date.now() + 450;
        (function follow() { updateTimeline(); if (Date.now() < until) requestAnimationFrame(follow); })();
      });
    });
  }

  // Interest flip cards: hover flips on desktop; tap or Enter flips everywhere else
  document.querySelectorAll('.interest').forEach(function (card) {
    if (!canHover) card.addEventListener('click', function () { card.classList.toggle('flipped'); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.classList.toggle('flipped'); }
    });
  });
})();
