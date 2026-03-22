class ProductRelatedSwatches {
  constructor() {
    // Cache DOM elements once
    this.infoSection = document.querySelector('[id^="ProductInfo-"]');
    this.mediaSection = document.querySelector('[id^="MediaGallery-"]');
    this.infoId = this.infoSection?.id?.replace('ProductInfo-', '');
    this.mediaId = this.mediaSection?.id?.replace('MediaGallery-', '');

    // Use event delegation for better performance
    this.bindEvents();
  }

  bindEvents() {
    // Event delegation on parent container
    const container = document.querySelector('.related-swatches');
    if (!container) return;

    container.addEventListener('click', (e) => {
      const swatch = e.target.closest('.related-swatches__item');
      if (!swatch) return;

      e.preventDefault();
      this.swapProduct(swatch.dataset.productHandle);
    });
  }

  async swapProduct(handle) {
    if (!this.infoId || !handle) return;

    try {
      const res = await fetch(`/products/${handle}?section_id=${this.infoId}`, {
        cache: 'force-cache',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });

      if (!res.ok) throw new Error('Fetch failed');
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // Batch DOM updates
      requestAnimationFrame(() => {
        const newInfo = doc.querySelector(`#ProductInfo-${this.infoId}`);
        const currentInfo = document.querySelector(`#ProductInfo-${this.infoId}`);
        if (newInfo && currentInfo) currentInfo.innerHTML = newInfo.innerHTML;

        if (this.mediaId) {
          const newMedia = doc.querySelector(`#MediaGallery-${this.mediaId}`);
          const currentMedia = document.querySelector(`#MediaGallery-${this.mediaId}`);
          if (newMedia && currentMedia) currentMedia.innerHTML = newMedia.innerHTML;
        }

        history.pushState({}, '', `/products/${handle}`);
        document.title = doc.title;
        window.Shopify?.PaymentButton?.init();
        this.updateActiveSwatch(handle);
      });
    } catch (err) {
      // Silent fail
    }
  }

  updateActiveSwatch(handle) {
    const swatches = document.querySelectorAll('.related-swatches__item');
    swatches.forEach(item => {
      item.classList.toggle('is-active', item.dataset.productHandle === handle);
    });
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ProductRelatedSwatches());
} else {
  new ProductRelatedSwatches();
}
