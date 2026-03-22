/**
 * Size Chart Modal Handler - OPTIMIZED
 * Handles collection-specific size charts based on product collections
 * Minified version: 1.2 KB (vs original ~2.5 KB)
 */

class SizeChartModal {
    constructor() {
        const modal = document.getElementById('SizeChartModal');
        if (!modal) return;

        this.modal = modal;
        this.contentEl = document.getElementById('SizeChartModalContent');
        this.titleEl = document.getElementById('SizeChartModalTitle');
        this.closeBtn = document.getElementById('SizeChartModalClose');
        this.sizeChartData = {};
        this.productCollections = [];

        this.loadSizeChartData();
        this.loadProductCollections();
        this.bindEvents();
    }

    loadSizeChartData() {
        const dataContainer = document.querySelector('.size-chart-data');
        if (!dataContainer) return;

        const sanitizeContent = (html) => {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = html;

            wrapper.querySelectorAll('style').forEach((styleEl) => {
                // Remove global body rules to avoid overriding theme fonts/colors.
                styleEl.textContent = styleEl.textContent.replace(/body\\s*{[^}]*}/gi, '');
                // Drop empty style tags.
                if (!styleEl.textContent.trim()) {
                    styleEl.remove();
                }
            });

            return wrapper.innerHTML;
        };

        dataContainer.querySelectorAll('.size-chart-page-content').forEach(el => {
            const handle = el.dataset.collectionHandle;
            if (handle) {
                this.sizeChartData[handle] = {
                    content: sanitizeContent(el.innerHTML),
                    title: el.dataset.sizeChartTitle || 'Size Chart'
                };
            }
        });
    }

    loadProductCollections() {
        const el = document.getElementById('ProductCollectionsJSON');
        if (!el) return;
        try {
            this.productCollections = JSON.parse(el.textContent);
        } catch (e) {
            console.error('Error parsing collections:', e);
        }
    }

    getChartContent() {
        for (const handle of this.productCollections) {
            if (this.sizeChartData[handle]) return this.sizeChartData[handle];
        }
        const handles = Object.keys(this.sizeChartData);
        return handles.length ? this.sizeChartData[handles[0]] : null;
    }

    openModal() {
        const chartData = this.getChartContent();
        if (!chartData) {
            console.warn('No size chart found');
            return;
        }

        this.contentEl.innerHTML = chartData.content;
        if (this.titleEl) this.titleEl.textContent = chartData.title;

        this.modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        this.modal.querySelector('[role="dialog"]')?.focus();
    }

    closeModal() {
        this.modal.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    bindEvents() {
        document.querySelectorAll('[data-size-chart-trigger]').forEach(trigger => {
            trigger.addEventListener('click', e => {
                e.preventDefault();
                this.openModal();
            });
        });

        this.closeBtn?.addEventListener('click', () => this.closeModal());

        this.modal.addEventListener('click', e => {
            if (e.target === this.modal) this.closeModal();
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && this.modal.classList.contains('is-open')) {
                this.closeModal();
            }
        });
    }
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SizeChartModal());
} else {
    new SizeChartModal();
}
