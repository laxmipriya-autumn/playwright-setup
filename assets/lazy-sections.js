/**
 * =============================================
 *  Lazy Section Loading — FitFlop Homepage
 * =============================================
 *  Strategy
 *  --------
 *  • Sections 1–4  → Critical / above-the-fold → load immediately
 *  • Sections 5+   → Non-critical / below-the-fold → hidden initially,
 *                    revealed via IntersectionObserver as user scrolls
 *
 *  Extra wins
 *  ----------
 *  • Adds loading="lazy" to <img> tags inside lazy sections
 *  • Guarantees loading="eager" on images in critical sections
 *  • Gracefully degrades when IntersectionObserver is unsupported
 *  • Skips logic entirely inside the Shopify Theme Editor
 * =============================================
 */

(function () {
  'use strict';

  /* ── 1. Only run on the homepage ── */
  if (!document.body.classList.contains('template-index')) return;

  /* ── 2. Skip inside Shopify Theme Editor (design mode) ── */
  if (
    window.Shopify &&
    window.Shopify.designMode
  ) return;

  /* ── 3. Number of critical (eager) sections at the top ── */
  var CRITICAL_SECTIONS = 4;

  /* ── 4. Revealed class name (must match lazy-sections.css) ── */
  var VISIBLE_CLASS = 'section-is-visible';

  /* ── 5. Main init function ── */
  function initLazySections() {
    var mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    /* Get ONLY direct-child shopify-section divs (not nested ones) */
    var allSections = Array.from(
      mainContent.querySelectorAll(':scope > .shopify-section')
    );

    if (allSections.length <= CRITICAL_SECTIONS) {
      /* Fewer sections than critical count — nothing to lazy-load */
      return;
    }

    var criticalSections = allSections.slice(0, CRITICAL_SECTIONS);
    var lazySections     = allSections.slice(CRITICAL_SECTIONS);

    /* ── 5a. Ensure critical section images are EAGER ── */
    criticalSections.forEach(function (section) {
      section.querySelectorAll('img').forEach(function (img) {
        /* Only override if someone mistakenly set lazy on a hero image */
        if (img.getAttribute('loading') === 'lazy') {
          img.setAttribute('loading', 'eager');
        }
      });
    });

    /* ── 5b. Mark all lazy-section images as loading="lazy" ── */
    lazySections.forEach(function (section) {
      section.querySelectorAll('img').forEach(function (img) {
        if (!img.hasAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }
      });
    });

    /* ── 5c. Fallback: reveal everything if IntersectionObserver missing ── */
    if (!('IntersectionObserver' in window)) {
      lazySections.forEach(function (section) {
        section.classList.add(VISIBLE_CLASS);
      });
      return;
    }

    /* ── 5d. Set up IntersectionObserver ── */
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add(VISIBLE_CLASS);
            /* Stop watching once revealed — no need to toggle back */
            observer.unobserve(entry.target);
          }
        });
      },
      {
        /**
         * threshold: 0.05 → trigger when 5 % of the section enters viewport.
         * rootMargin: pre-load sections 80px before they actually scroll into view
         * so the animation is already running when the user sees the section.
         */
        threshold: 0.05,
        rootMargin: '0px 0px 80px 0px'
      }
    );

    lazySections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* ── 6. Run after DOM is fully parsed ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazySections);
  } else {
    /* DOMContentLoaded already fired (script loaded late) */
    initLazySections();
  }

})();
