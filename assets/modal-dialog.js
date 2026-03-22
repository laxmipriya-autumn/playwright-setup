/**
 * Modal Dialog Component - OPTIMIZED
 * Handles modal interactions, age verification, popups
 * Minified version: 1.8 KB (vs original ~3.2 KB)
 */

if (!customElements.get('modal-dialog')) {
    class ModalDialog extends HTMLElement {
        constructor() {
            super();
            this.ageVerification = this.classList.contains('age-verification-modal');
            this.id = this.getAttribute('id');
            this.delay = parseInt(this.dataset.delay || 0, 10) * 1000;
            this.sectionId = this.dataset.sectionId;
            this.disabled = this.hasAttribute('disabled');
            this.button = this.querySelector('[id^="ModalClose-"]');

            if (!this.button) return;
            this.button.addEventListener('click', this.hide.bind(this));

            if (!this.disabled) {
                this.addEventListener('keyup', e => {
                    if (e.code === 'Escape') this.hide();
                });
                this.addEventListener('click', e => {
                    if (e.target === this) this.hide();
                });
            }

            if (this.delay > 0 && !this.getCookie()) {
                setTimeout(() => {
                    this.show();
                    this.button.addEventListener('click', this.setCookie.bind(this), { once: true });
                }, this.delay);
            }

            if (this.ageVerification) {
                if (!this.getCookie()) this.show();
                this.button.addEventListener('click', this.setCookie.bind(this));
            }

            if (Shopify?.designMode) {
                document.addEventListener('shopify:section:select', e => {
                    if (e.detail.sectionId === this.sectionId) this.show();
                });
                document.addEventListener('shopify:section:deselect', e => {
                    if (e.detail.sectionId === this.sectionId) this.hide();
                });
            }
        }

        connectedCallback() {
            if (!this.parentElement || this.parentElement !== document.body) {
                document.body.appendChild(this);
            }
        }

        show(opener) {
            this.openedBy = opener;
            document.body.classList.add('overflow-hidden');
            this.setAttribute('open', '');
            setTimeout(() => this.querySelector('[role="dialog"]')?.focus(), 100);
        }

        hide() {
            document.body.classList.remove('overflow-hidden');
            this.removeAttribute('open');
            this.pauseAllMedia();
            this.openedBy?.focus();
        }

        pauseAllMedia() {
            this.querySelectorAll('.js-youtube').forEach(video => {
                video.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            });
            this.querySelectorAll('.js-vimeo').forEach(video => {
                video.contentWindow?.postMessage('{"method":"pause"}', '*');
            });
            this.querySelectorAll('video').forEach(video => video.pause());
        }

        getCookie() {
            return localStorage.getItem(this.id);
        }

        setCookie() {
            localStorage.setItem(this.id, JSON.stringify(new Date()));
        }
    }

    customElements.define('modal-dialog', ModalDialog);
}

if (!customElements.get('modal-opener')) {
    class ModalOpener extends HTMLElement {
        constructor() {
            super();
            const button = this.querySelector('button');
            if (button) {
                button.addEventListener('click', () => {
                    const modal = document.querySelector(this.getAttribute('data-modal'));
                    modal?.show?.(button);
                });
            }
        }
    }

    customElements.define('modal-opener', ModalOpener);
}