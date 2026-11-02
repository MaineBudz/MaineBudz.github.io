/* ========================================
   Budz Emporium - Interactive JavaScript
   Vanilla JS, no jQuery.
   ======================================== */
(function () {
  'use strict';

  /* Single source of truth for the reduced-motion preference. */
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = () => motionQuery.matches;

  /* ======================================
     NAVIGATION
     ====================================== */
  function initNavigation() {
    const header = document.querySelector('.header');
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!navToggle || !navMenu) return;

    const closeMenu = () => {
      navToggle.classList.remove('active');
      navMenu.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    const openMenu = () => {
      navToggle.classList.add('active');
      navMenu.classList.add('active');
      navToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    };

    navToggle.setAttribute('aria-expanded', 'false');

    navToggle.addEventListener('click', () => {
      if (navMenu.classList.contains('active')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        closeMenu();
        navToggle.focus();
      }
    });

    /* Close when the click lands outside the open menu. */
    document.addEventListener('click', (e) => {
      if (!navMenu.classList.contains('active')) return;
      if (navToggle.contains(e.target) || navMenu.contains(e.target)) return;
      closeMenu();
    });

    /* Reset menu state when we grow past the mobile breakpoint. */
    const desktopQuery = window.matchMedia('(min-width: 769px)');
    const onBreakpoint = (e) => {
      if (e.matches) closeMenu();
    };
    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener('change', onBreakpoint);
    } else if (desktopQuery.addListener) {
      desktopQuery.addListener(onBreakpoint);
    }

    if (header) {
      const onScroll = () => {
        header.classList.toggle('scrolled', window.scrollY > 40);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  /* ======================================
     SCROLL REVEAL
     ====================================== */
  function initScrollReveal() {
    const targets = document.querySelectorAll(
      '.section, .product-card, .location-card, .contact-card, .about-card, .glow-card'
    );
    if (!targets.length) return;

    /* With reduced motion we simply mark everything visible. */
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach((el) => observer.observe(el));

    /* If the observer is slow or throttled, reveal anything already on screen
       so above-the-fold content is never left at opacity 0. */
    window.setTimeout(() => {
      targets.forEach((el) => {
        if (el.classList.contains('revealed')) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add('revealed');
        }
      });
    }, 1200);
  }

  /* ======================================
     HERO PARALLAX (pointer + scroll)
     Stops its rAF loop when nothing moves
     and when the hero leaves the viewport.
     ====================================== */
  function initHeroParallax() {
    const hero = document.querySelector('.hero');
    const layers = Array.from(document.querySelectorAll('.forest-img'));
    if (!hero || !layers.length || prefersReducedMotion()) return;

    const state = {
      pointerX: 0,
      pointerY: 0,
      targetX: 0,
      targetY: 0,
      scroll: 0,
      active: false,
      frame: null
    };

    /* Depth 0 = furthest layer, 1 = nearest. */
    layers.forEach((layer, i) => {
      if (!layer.dataset.depth) {
        layer.dataset.depth = (i / Math.max(1, layers.length - 1)).toFixed(3);
      }
    });

    const render = () => {
      state.frame = null;

      const dx = state.targetX - state.pointerX;
      const dy = state.targetY - state.pointerY;
      state.pointerX += dx * 0.08;
      state.pointerY += dy * 0.08;

      const settled =
        Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05;

      layers.forEach((layer) => {
        const depth = parseFloat(layer.dataset.depth) || 0;
        /* Near layers move more than distant ones. */
        const pointerStrength = 6 + depth * 26;
        const scrollStrength = 8 + depth * 34;
        const tx = state.pointerX * pointerStrength;
        const ty = state.pointerY * pointerStrength + state.scroll * scrollStrength;
        layer.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
      });

      if (!settled) {
        state.frame = requestAnimationFrame(render);
      }
    };

    const kick = () => {
      if (state.frame === null && state.active) {
        state.frame = requestAnimationFrame(render);
      }
    };

    hero.addEventListener('pointermove', (e) => {
      const rect = hero.getBoundingClientRect();
      state.targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      state.targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      kick();
    }, { passive: true });

    hero.addEventListener('pointerleave', () => {
      state.targetX = 0;
      state.targetY = 0;
      kick();
    });

    window.addEventListener('scroll', () => {
      const rect = hero.getBoundingClientRect();
      /* Normalised 0..1 as the hero scrolls past. */
      state.scroll = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
      if (state.active) kick();
    }, { passive: true });

    /* Only animate while the hero is on screen. */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        state.active = entries[0].isIntersecting;
        if (state.active) kick();
      }, { threshold: 0 });
      io.observe(hero);
    } else {
      state.active = true;
    }
  }

  /* ======================================
     GLOWING EDGE CARDS
     Pointer position is written to CSS
     custom properties; the glow itself is
     painted in CSS.
     ====================================== */
  function initGlowCards() {
    const cards = document.querySelectorAll('.glow-card');

    cards.forEach((card) => {
      let frame = null;
      let nextX = 0.5;
      let nextY = 0.5;

      const paint = () => {
        frame = null;
        card.style.setProperty('--pointer-x', nextX * 100 + '%');
        card.style.setProperty('--pointer-y', nextY * 100 + '%');
      };

      /* Pointer tracking is skipped for touch and reduced motion. */
      if (prefersReducedMotion() || !window.matchMedia('(hover: hover)').matches) {
        return;
      }

      card.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const rect = card.getBoundingClientRect();
        nextX = (e.clientX - rect.left) / rect.width;
        nextY = (e.clientY - rect.top) / rect.height;
        card.style.setProperty('--glow-opacity', '1');

        /* Tilt: max ~5deg, subtle. */
        const tiltX = (0.5 - nextY) * 5;
        const tiltY = (nextX - 0.5) * 5;
        card.style.setProperty('--tilt-x', tiltX.toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', tiltY.toFixed(2) + 'deg');

        if (frame === null) frame = requestAnimationFrame(paint);
      }, { passive: true });

      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--glow-opacity', '0');
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
        card.style.setProperty('--pointer-x', '50%');
        card.style.setProperty('--pointer-y', '50%');
      });
    });
  }

  /* ======================================
     SMOOTH SCROLLING ANCHORS
     ====================================== */
  function initSmoothScroll() {
    const header = document.querySelector('.header');

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const id = link.getAttribute('href');
        if (!id || id === '#') return;

        const target = document.querySelector(id);
        if (!target) return;

        e.preventDefault();
        const offset = (header ? header.offsetHeight : 0) + 16;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({
          top: top,
          behavior: prefersReducedMotion() ? 'auto' : 'smooth'
        });

        /* Keep keyboard focus in sync with the visual jump. */
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  }

  /* ======================================
     ACTIVE NAV LINK ON SCROLL
     ====================================== */
  function initActiveNav() {
    const links = Array.from(document.querySelectorAll('.nav-link'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    const sections = links
      .map((link) => {
        const id = link.getAttribute('href');
        return id && id.length > 1 ? document.querySelector(id) : null;
      })
      .filter(Boolean);

    const setActive = (id) => {
      links.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + id);
      });
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach((section) => observer.observe(section));
  }

  /* ======================================
     CONTACT FORM
     Progressive enhancement: without JS the
     form still posts normally.
     ====================================== */
  function initContactForm() {
    const form = document.querySelector('#contact-form form');
    if (!form) return;

    const button = form.querySelector('button[type="submit"]');
    const status = document.getElementById('form-status');

    const say = (message, isError) => {
      if (!status) return;
      status.textContent = message;
      status.classList.toggle('is-error', Boolean(isError));
      status.hidden = false;
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        say('Please fill in the required fields.', true);
        return;
      }

      const original = button ? button.textContent : '';
      if (button) {
        button.textContent = 'Sending…';
        button.disabled = true;
      }

      /* No backend is wired up yet; this is a local confirmation only. */
      window.setTimeout(() => {
        if (button) {
          button.textContent = original;
          button.disabled = false;
        }
        say('Thanks for reaching out — we will get back to you within one business day.', false);
        form.reset();
      }, 600);
    });

    if (status) status.hidden = true;
  }

  /* ======================================
     GSAP SCROLLTRIGGER ENHANCEMENTS
     Only runs when the CDN scripts loaded.
     ====================================== */
  function initGSAP() {
    if (prefersReducedMotion()) return;
    if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') {
      return;
    }

    const { gsap } = window;
    gsap.registerPlugin(window.ScrollTrigger);

    /* The hero intro is a CSS animation, not a GSAP tween. A `from` tween sets
       opacity:0 up front, so if the ticker stalls the CTAs never appear. */

    /* Gentle depth drift on the forest stack as the hero scrolls away. */
    gsap.to('.forest', {
      yPercent: 12,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6
      }
    });
  }

  /* ======================================
     BOOT
     ====================================== */
  function init() {
    window.__budzReady = true;

    /* Each module is isolated: one failure must not blank the page,
       because scroll-reveal starts elements at opacity 0. */
    [
      initNavigation,
      initHeroParallax,
      initGlowCards,
      initScrollReveal,
      initSmoothScroll,
      initActiveNav,
      initContactForm,
      initGSAP
    ].forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.error('[budz] init failed:', fn.name, error);
        /* Never leave content stuck at the reveal start state. */
        document
          .querySelectorAll('.section, .product-card, .location-card, .contact-card, .about-card')
          .forEach((el) => el.classList.add('revealed'));
      }
    });

    /* Re-evaluate when the user changes their motion preference. */
    const onMotionChange = () => {
      document.documentElement.classList.toggle('reduced-motion', motionQuery.matches);
    };
    onMotionChange();
    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', onMotionChange);
    } else if (motionQuery.addListener) {
      motionQuery.addListener(onMotionChange);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
