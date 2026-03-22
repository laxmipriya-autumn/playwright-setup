/**
 * header.js — Performance-optimised
 *
 * KEY FIXES vs original:
 * ─────────────────────────────────────────────────────────────────────────────
 * FORCED REFLOW (the PageSpeed "Forced reflow" audit failures):
 *
 *  1. setHeaderOffset() called getBoundingClientRect() on every scroll tick
 *     → Batched: all reads happen together BEFORE any writes in rAF callback.
 *
 *  2. setHeaderHeight() called this.clientHeight on every scroll tick
 *     → Cached via ResizeObserver; only updates when element actually resizes.
 *
 *  3. setStickyClass() called getBoundingClientRect() + classList.toggle on
 *     every scroll tick, mixing reads and writes in the same frame.
 *     → Read (scrollY) is captured before rAF; write (classList) happens inside.
 *
 *  4. setAnnouncementHeight() called clientHeight on every resize event
 *     → Moved to ResizeObserver; fires only on actual size change.
 *
 *  5. FullMenu.resizeSubMenus() read offsetWidth + getBoundingClientRect()
 *     inside a forEach loop — classic "layout thrashing" (read→write→read…).
 *     → All reads are now batched first, then all writes happen together.
 *
 *  6. closeAnimation() created a new rAF loop just to wait 400 ms
 *     → Replaced with a single setTimeout (no layout reads needed).
 *
 *  7. debounce used arrow function capturing outer `this` incorrectly
 *     → Fixed to use standard function with explicit context.
 * ─────────────────────────────────────────────────────────────────────────────
 * ALL original functionality is preserved.
 */

'use strict';

/* ─── Shared debounce utility ──────────────────────────────────────────────── */
if (typeof debounce === 'undefined') {
  // eslint-disable-next-line no-unused-vars
  function debounce(fn, wait) {
    let t;
    return function () {
      const ctx  = this;
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }
}

/* ─── ThemeHeader ──────────────────────────────────────────────────────────── */
if (!customElements.get('theme-header')) {

  class ThemeHeader extends HTMLElement {

    constructor() {
      super();
      // Scroll rAF gate
      this._scrollTicking  = false;
      // Cached measurements — populated by ResizeObserver, never read mid-scroll
      this._headerHeight   = 0;
      this._stickyOffset   = 0;
      // Bound handlers stored so we can removeEventListener if needed
      this._onScroll       = this._onScroll.bind(this);
      this._onKeyUp        = this._onKeyUp.bind(this);
    }

    connectedCallback() {
      this.headerSection = document.querySelector('.header-section');
      this.menu          = this.querySelector('#mobile-menu');
      this.toggle        = document.querySelector('.mobile-toggle-wrapper');

      /* ── Keyboard: close on Escape ───────────────────────────────────────── */
      document.addEventListener('keyup', this._onKeyUp);

      /* ── Mobile toggle ───────────────────────────────────────────────────── */
      const mobileToggleBtn = this.toggle.querySelector('.mobile-toggle');
      if (mobileToggleBtn) {
        mobileToggleBtn.addEventListener('click', this._onMobileToggleClick.bind(this));
      }

      /* ── Scroll: passive + rAF-gated ─────────────────────────────────────── */
      window.addEventListener('scroll', this._onScroll, { passive: true });

      /* ── ResizeObserver: cache header height without triggering reflow ────── */
      //   Instead of calling this.clientHeight on every scroll tick,
      //   we observe size changes and update the cache + CSS var in one place.
      this._headerRO = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this._headerHeight = Math.round(entry.contentRect.height);
          document.documentElement.style.setProperty('--header-height', this._headerHeight + 'px');
        }
      });
      this._headerRO.observe(this);

      /* ── Announcement bar: ResizeObserver instead of resize event ─────────── */
      const announcementBar = document.getElementById('shopify-section-announcement-bar');
      if (announcementBar) {
        this._announcementRO = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const h = Math.round(entry.contentRect.height);
            document.documentElement.style.setProperty('--announcement-height', h + 'px');
          }
        });
        this._announcementRO.observe(announcementBar);
      }

      /* ── Mobile sub-menus ────────────────────────────────────────────────── */
      this.menu.querySelectorAll('summary').forEach((summary) => {
        summary.addEventListener('click', this._onSummaryClick.bind(this));
      });
      this.menu.querySelectorAll('.parent-link-back--button').forEach((button) => {
        button.addEventListener('click', this._onCloseButtonClick.bind(this));
      });

      /* ── Initial paint: run scroll handler once to set sticky state ──────── */
      this._runScrollTasks();
    }

    disconnectedCallback() {
      document.removeEventListener('keyup', this._onKeyUp);
      window.removeEventListener('scroll', this._onScroll);
      if (this._headerRO)      this._headerRO.disconnect();
      if (this._announcementRO) this._announcementRO.disconnect();
    }

    /* ── Scroll handler: single rAF gate ─────────────────────────────────── */
    _onScroll() {
      if (!this._scrollTicking) {
        requestAnimationFrame(this._runScrollTasks.bind(this));
        this._scrollTicking = true;
      }
    }

    /*
     * _runScrollTasks
     * ───────────────
     * ALL layout READS are done first (top of function), then ALL writes.
     * This prevents the browser from being forced to recalculate layout
     * between interleaved read/write operations (the "forced reflow" problem).
     */
    _runScrollTasks() {
      // ── READS ──────────────────────────────────────────────────────────────
      const scrollY         = window.scrollY;
      const isSticky        = this.classList.contains('header-sticky--active');
      const headerSectionTop = this.headerSection
        ? this.headerSection.getBoundingClientRect().top
        : 0;

      // Compute sticky offset once (first time it's needed)
      if (isSticky && !this._stickyOffset) {
        this._stickyOffset = Math.round(this.getBoundingClientRect().top) + scrollY;
      }

      // ── WRITES ─────────────────────────────────────────────────────────────
      if (isSticky) {
        const shouldBeSticky = scrollY >= this._stickyOffset && scrollY > 0;
        // classList.toggle only writes to DOM if the value actually changes
        this.classList.toggle('is-sticky', shouldBeSticky);
      }

      document.documentElement.style.setProperty('--header-offset', Math.round(headerSectionTop) + 'px');

      // --header-height is handled by ResizeObserver above, not here

      this._scrollTicking = false;
    }

    /* ── Event handlers ──────────────────────────────────────────────────── */
    _onKeyUp(e) {
      if (e.code?.toUpperCase() === 'ESCAPE') {
        this.toggle.removeAttribute('open');
        this.toggle.classList.remove('active');
      }
    }

    _onMobileToggleClick(e) {
      if (this.toggle.classList.contains('active')) {
        e.preventDefault();
        document.body.classList.remove('overflow-hidden');
        this.toggle.classList.remove('active');
        this._closeAnimation(this.toggle);
      } else {
        document.body.classList.add('overflow-hidden');
        // Defer adding 'active' so CSS transition fires
        setTimeout(() => this.toggle.classList.add('active'));
      }
      window.dispatchEvent(new Event('resize.resize-select'));
    }

    _onSummaryClick(event) {
      const summaryElement  = event.currentTarget;
      const detailsElement  = summaryElement.parentNode;
      const parentMenuEl    = detailsElement.closest('.link-container');

      if (this.querySelector('.parent-link-back--button')) {
        this.menu.scrollTop = 0;
      }

      // Delay matches original (100 ms) for CSS transition
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        if (parentMenuEl) parentMenuEl.classList.add('submenu-open');
      }, 100);
    }

    _onCloseButtonClick(event) {
      event.preventDefault();
      const detailsElement = event.currentTarget.closest('details');
      this._closeSubmenu(detailsElement);
    }

    _closeSubmenu(detailsElement) {
      detailsElement.classList.remove('menu-opening');
      this._closeAnimation(detailsElement);
    }

    /*
     * _closeAnimation
     * ───────────────
     * Original used a rAF loop purely as a 400 ms timer — no layout reads,
     * no visual updates inside the loop — so a simple setTimeout is identical
     * in behaviour but doesn't occupy the rAF queue.
     */
    _closeAnimation(detailsElement) {
      setTimeout(() => {
        detailsElement.removeAttribute('open');
      }, 400);
    }
  }

  customElements.define('theme-header', ThemeHeader);
}

/* ─── FullMenu ─────────────────────────────────────────────────────────────── */
if (!customElements.get('full-menu')) {

  class FullMenu extends HTMLElement {

    constructor() {
      super();
      this._resizePending = false;
    }

    connectedCallback() {
      this.submenus = this.querySelectorAll(
        '.thb-full-menu > .menu-item-has-children:not(.menu-item-has-megamenu) > .sub-menu'
      );

      if (!this.submenus.length) return;

      /*
       * Debounced resize handler.
       * Wraps _scheduleResize so the actual measurement only fires once
       * after the user stops resizing (100 ms quiet period).
       */
      const debouncedResize = debounce(() => this._scheduleResize(), 100);

      window.addEventListener('resize', debouncedResize, { passive: true });

      // Run once after fonts are ready (avoids measuring before glyphs are loaded)
      document.fonts.ready.then(() => this._scheduleResize());

      // Initial sizing
      this._scheduleResize();
    }

    /*
     * _scheduleResize
     * ───────────────
     * Gates the actual DOM measurement into a rAF so multiple resize events
     * in the same frame are collapsed into one measurement pass.
     */
    _scheduleResize() {
      if (!this._resizePending) {
        this._resizePending = true;
        requestAnimationFrame(() => {
          this._resizeSubMenus();
          this._resizePending = false;
        });
      }
    }

    /*
     * _resizeSubMenus
     * ───────────────
     * FIX: Original code read offsetWidth and getBoundingClientRect() INSIDE
     * a forEach loop, then immediately wrote classList — causing layout
     * thrashing (browser forced to recalculate layout on every iteration).
     *
     * Fix: Collect ALL measurements first into a plain array, then apply
     * ALL class changes in a second pass. Zero interleaving = zero reflow.
     */
    _resizeSubMenus() {
      // ── READS: gather all measurements in one pass ────────────────────────
      const bodyWidth = document.body.clientWidth;

      /**
       * @type {Array<{el: Element, shouldBeLeft: boolean}>}
       */
      const updates = [];

      this.submenus.forEach((submenu) => {
        const subSubmenus = submenu.querySelectorAll(':scope > .menu-item-has-children > .sub-menu');

        subSubmenus.forEach((subSubmenu) => {
          const parentItem = subSubmenu.parentElement;
          const grandParent = parentItem.parentElement;

          // Read phase — no class writes yet
          const subWidth   = subSubmenu.offsetWidth;
          const parentRect = grandParent.getBoundingClientRect();
          const parentLeft = parentRect.left;
          const parentW    = grandParent.clientWidth;

          const rightEdge    = parentLeft + parentW + subWidth + 10;
          const shouldBeLeft = rightEdge > bodyWidth;

          updates.push({ el: parentItem, shouldBeLeft });
        });
      });

      // ── WRITES: apply all class changes in one pass ───────────────────────
      updates.forEach(({ el, shouldBeLeft }) => {
        if (shouldBeLeft && !el.classList.contains('left-submenu')) {
          el.classList.add('left-submenu');
        } else if (!shouldBeLeft && el.classList.contains('left-submenu')) {
          el.classList.remove('left-submenu');
        }
      });
    }
  }

  customElements.define('full-menu', FullMenu);
}