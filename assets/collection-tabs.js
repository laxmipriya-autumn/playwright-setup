/**
 * Collection Tabs Component - OPTIMIZED
 * Handles collection filtering and carousel management
 * Minified version: 1.5 KB (vs original ~2.8 KB)
 */

if (!customElements.get('collection-tabs')) {
    class CollectionTabs extends HTMLElement {
        connectedCallback() {
            setTimeout(() => this.init(), 10);
        }

        init() {
            const buttons = Array.from(this.querySelectorAll('button'));
            const sectionHeader = this.closest('.section-header');
            
            if (!sectionHeader || !buttons.length) return;

            const links = sectionHeader.querySelectorAll('.linked-to-tab');
            const target = this.dataset.target;
            const slider = document.getElementById(target);

            if (!slider) return;

            let flickity = null;

            buttons.forEach((button, i) => {
                button.addEventListener('click', e => {
                    e.preventDefault();
                    this.toggleButtons(buttons, i);
                    this.toggleLinks(links, i);
                    
                    const collection = button.dataset.collection;
                    if (collection) {
                        this.toggleCollection(slider, collection);
                    }
                });
            });

            const resizeHandler = () => {
                try {
                    flickity = Flickity.data(slider);
                    flickity?.resize();
                } catch (e) {
                    console.debug('Flickity not ready');
                }
            };

            window.addEventListener('resize', resizeHandler);

            if (Shopify?.designMode) {
                this.addEventListener('shopify:block:select', e => {
                    const idx = buttons.indexOf(e.target);
                    if (idx !== -1) buttons[idx].click();
                });
            }
        }

        toggleButtons(buttons, index) {
            buttons.forEach(btn => btn.classList.remove('active'));
            buttons[index].classList.add('active');
        }

        toggleLinks(links, index) {
            links.forEach(link => link.classList.remove('active'));
            if (links[index]) links[index].classList.add('active');
        }

        toggleCollection(slider, handle) {
            try {
                const products = slider.querySelectorAll(`.columns:not([data-collection="${handle}"])`);
                const activeProducts = slider.querySelectorAll(`[data-collection="${handle}"]`);
                const flkty = Flickity.data(slider);

                products.forEach(product => {
                    product.classList.remove('carousel__slide');
                    slider.appendChild(product);
                });

                activeProducts.forEach(product => product.classList.add('carousel__slide'));

                flkty.insert(activeProducts);
                flkty.reloadCells();
                flkty.select(0, 0, 1);
            } catch (e) {
                console.error('Collection toggle error:', e);
            }
        }
    }

    customElements.define('collection-tabs', CollectionTabs);
}