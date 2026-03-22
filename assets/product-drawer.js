/**
 * Re-initialize SizeChartModal when quick-view drawer content changes.
 */
(function () {
  'use strict';

  var MAX_DRAWER_RETRIES = 20;
  var DRAWER_RETRY_DELAY = 500;

  function reinitSizeChartModal() {
    if (typeof SizeChartModal !== 'function') {
      return false;
    }

    try {
      new SizeChartModal();
      return true;
    } catch (err) {
      return false;
    }
  }

  function observeDrawer(retryCount) {
    var drawerContent = document.querySelector('#Product-Drawer-Content, .product-drawer .side-panel-content');

    if (!drawerContent) {
      if (retryCount < MAX_DRAWER_RETRIES) {
        setTimeout(function () {
          observeDrawer(retryCount + 1);
        }, DRAWER_RETRY_DELAY);
      }
      return;
    }

    var reinitQueued = false;
    var queueReinit = function () {
      if (reinitQueued) return;

      reinitQueued = true;
      requestAnimationFrame(function () {
        reinitQueued = false;
        reinitSizeChartModal();
      });
    };

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i += 1) {
        var mutation = mutations[i];
        if (!mutation.addedNodes.length) continue;

        for (var j = 0; j < mutation.addedNodes.length; j += 1) {
          var node = mutation.addedNodes[j];
          if (!node || node.nodeType !== 1) continue;

          if (
            (node.classList && node.classList.contains('size-chart-trigger')) ||
            (node.matches && node.matches('[data-size-chart-trigger]')) ||
            (node.querySelector && node.querySelector('[data-size-chart-trigger]'))
          ) {
            queueReinit();
            return;
          }
        }
      }
    });

    observer.observe(drawerContent, {
      childList: true,
      subtree: true
    });
  }

  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  ready(function () {
    observeDrawer(0);
    reinitSizeChartModal();
  });
})();
