/* =====================================================
   OPTIMIZED APP.JS - PERFORMANCE ENHANCED
   All functionality preserved, execution optimized
===================================================== */

// Debounce helper (optimized with correct context)
function debounce(fn, wait) {
  let t;
  return function (...args) {
    const ctx = this;
    clearTimeout(t);
    t = setTimeout(() => fn.apply(ctx, args), wait);
  };
}

// Custom event dispatcher
var dispatchCustomEvent = function dispatchCustomEvent(eventName) {
  var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var detail = {
    detail: data
  };
  var event = new CustomEvent(eventName, data ? detail : null);
  document.dispatchEvent(event);
};

window.recentlyViewedIds = [];

// Reserve scrollbar space to avoid layout shift when side panels lock scroll
const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);

/* =====================================================
   QUANTITY SELECTOR
===================================================== */
if (!customElements.get('quantity-selector')) {
  class QuantityInput extends HTMLElement {
    constructor() {
      super();
      this.input = this.querySelector('.qty');
      this.step = this.input.getAttribute('step');
      this.changeEvent = new Event('change', {
        bubbles: true
      });
      this.subtract = this.querySelector('.minus');
      this.add = this.querySelector('.plus');

      this.subtract.addEventListener('click', () => this.change_quantity(-1 * this.step));
      this.add.addEventListener('click', () => this.change_quantity(1 * this.step));
    }

    connectedCallback() {
      this.classList.add('buttons_added');
      this.validateQtyRules();
    }

    change_quantity(change) {
      let quantity = Number(this.input.value);
      if (isNaN(quantity)) quantity = 1;

      if (this.input.getAttribute('min') > (quantity + change)) {
        return;
      }
      if (this.input.getAttribute('max')) {
        if (this.input.getAttribute('max') < (quantity + change)) {
          return;
        }
      }

      quantity += change;
      quantity = Math.max(quantity, 1);
      this.input.value = quantity;
      this.input.dispatchEvent(this.changeEvent);
      this.validateQtyRules();
    }

    validateQtyRules() {
      const value = parseInt(this.input.value);
      if (this.input.min) {
        const min = parseInt(this.input.min);
        this.subtract.classList.toggle('disabled', value <= min);
      }
      if (this.input.max) {
        const max = parseInt(this.input.max);
        this.add.classList.toggle('disabled', value >= max);
      }
    }
  }
  customElements.define('quantity-selector', QuantityInput);
}

/* =====================================================
   ARROW SUBMENU
===================================================== */
class ArrowSubMenu {
  constructor(self) {
    this.submenu = self.parentNode.querySelector('.sub-menu');
    this.arrow = self;
    self.addEventListener('click', (e) => this.toggle_submenu(e));
  }

  toggle_submenu(e) {
    e.preventDefault();
    let submenu = this.submenu;

    if (!submenu.classList.contains('active')) {
      submenu.classList.add('active');
    } else {
      submenu.classList.remove('active');
      this.arrow.blur();
    }
  }
}

// Initialize arrows on DOMContentLoaded (optimized)
let arrowsInitialized = false;
const initArrows = () => {
  if (arrowsInitialized) return;
  arrowsInitialized = true;
  document.querySelectorAll('.thb-arrow').forEach((arrow) => {
    new ArrowSubMenu(arrow);
  });
};

/* =====================================================
   PRODUCT CARD (OPTIMIZED)
===================================================== */
if (!customElements.get('product-card')) {
  class ProductCard extends HTMLElement {
    constructor() {
      super();
      this.swatches = this.querySelector('.product-card-swatches');
      this.image = this.querySelector('.product-card--featured-image-link .product-primary-image');
      this.additional_images = this.querySelectorAll('.product-secondary-image');
      this.additional_images_nav = this.querySelectorAll('.product-secondary-images-nav li');
      this.quick_add = this.querySelector('.product-card--add-to-cart-button-simple');
      this.size_options = this.querySelector('.product-card-sizes');
    }

    connectedCallback() {
      // Use requestAnimationFrame for non-critical initialization
      requestAnimationFrame(() => {
        if (this.swatches) {
          this.enableSwatches(this.swatches, this.image);
        }
        if (this.quick_add) {
          this.enableQuickAdd();
        }
        if (this.size_options) {
          this.enableSizeOptions();
        }
      });
    }

    enableSwatches(swatches, image) {
      const swatch_list = swatches.querySelectorAll('.product-card-swatch');

      // Hide out of stock swatches
      swatch_list.forEach((swatch) => {
        if (swatch.dataset.available === 'false') {
          swatch.style.display = 'none';
          swatch.classList.add('out-of-stock');
        }
      });

      const visible_swatches = Array.from(swatch_list).filter(s => s.dataset.available !== 'false');
      const org_srcset = image ? image.dataset.srcset : '';
      this.color_index = this.swatches.dataset.index;
      const productCard = this.closest('.product-card') || this;

      let activeSwatchData = {
        primarySrcset: org_srcset,
        secondarySrcset: ''
      };

      let isHoveringOverSwatch = false;

      const initialActiveSwatch =
        swatches.querySelector('.product-card-swatch.active:not(.out-of-stock)') ||
        visible_swatches[0];

      if (initialActiveSwatch) {
        activeSwatchData.primarySrcset = initialActiveSwatch.dataset.srcset;
        activeSwatchData.secondarySrcset =
          initialActiveSwatch.dataset.secondarySrcset ||
          initialActiveSwatch.dataset.srcset;

        if (image && activeSwatchData.primarySrcset) {
          image.setAttribute('srcset', activeSwatchData.primarySrcset);
          const firstSrc = activeSwatchData.primarySrcset.split(',')[0].trim().split(' ')[0];
          image.setAttribute('src', firstSrc);
        }
      }

      visible_swatches.forEach((swatch) => {
        // Lazy load images on window load
        window.addEventListener('load', () => {
          if (swatch.dataset.srcset) {
            const img = new Image();
            img.srcset = swatch.dataset.srcset;
            if (typeof lazySizes !== 'undefined') {
              lazySizes.loader.unveil(img);
            }
          }
        }, { once: true });

        swatch.addEventListener('click', (evt) => {
          evt.preventDefault();
          evt.stopPropagation();

          visible_swatches.forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');

          activeSwatchData.primarySrcset = swatch.dataset.srcset;
          activeSwatchData.secondarySrcset =
            swatch.dataset.secondarySrcset || swatch.dataset.srcset;

          if (image && activeSwatchData.primarySrcset) {
            image.setAttribute('srcset', activeSwatchData.primarySrcset);
            const firstSrc = activeSwatchData.primarySrcset.split(',')[0].trim().split(' ')[0];
            image.setAttribute('src', firstSrc);
          }

          const productTitle =
            productCard.querySelector('.product-card-title, .card__title, .product-title');

          const newTitle = swatch.dataset.productTitle || swatch.dataset.colorName;
          if (productTitle && newTitle) {
            productTitle.textContent = newTitle;
          }

          const swatchHref = swatch.dataset.href;
          if (swatchHref) {
            const imageLink = productCard.querySelector('.product-card--featured-image-link, .card__link, a[href*="/products/"]');
            if (imageLink) {
              imageLink.setAttribute('href', swatchHref);
            }

            const titleLink = productCard.querySelector('.product-card-title a, .card__title a, .product-title a');
            if (titleLink) {
              titleLink.setAttribute('href', swatchHref);
            }

            const allProductLinks = productCard.querySelectorAll('a[href*="/products/"]:not(.product-card-swatch)');
            allProductLinks.forEach(link => {
              if (!link.classList.contains('quick-view') &&
                !link.classList.contains('product-card--add-to-cart-button') &&
                !link.hasAttribute('quick-view')) {
                link.setAttribute('href', swatchHref);
              }
            });
          }

          if (this.size_options) {
            this.current_options[this.color_index] =
              swatch.querySelector('span').innerText;
            this.updateMasterId();
          }
        });

        swatch.addEventListener('mouseenter', () => {
          isHoveringOverSwatch = true;
          if (image && swatch.dataset.srcset) {
            image.setAttribute('srcset', swatch.dataset.srcset);
            const firstSrc = swatch.dataset.srcset.split(',')[0].trim().split(' ')[0];
            image.setAttribute('src', firstSrc);
          }
        });

        swatch.addEventListener('mouseleave', () => {
          isHoveringOverSwatch = false;
          if (image && activeSwatchData.primarySrcset) {
            image.setAttribute('srcset', activeSwatchData.primarySrcset);
            const firstSrc = activeSwatchData.primarySrcset.split(',')[0].trim().split(' ')[0];
            image.setAttribute('src', firstSrc);
          }
        });
      });

      if (image) {
        const cardLink = image.closest('.product-card--featured-image-link');
        const setImage = (srcset) => {
          if (!srcset) return;
          image.setAttribute('srcset', srcset);
          const firstSrc = srcset.split(',')[0].trim().split(' ')[0];
          image.setAttribute('src', firstSrc);
        };

        cardLink.addEventListener('mouseenter', () => {
          if (
            !isHoveringOverSwatch &&
            activeSwatchData.secondarySrcset &&
            activeSwatchData.secondarySrcset !== activeSwatchData.primarySrcset
          ) {
            setImage(activeSwatchData.secondarySrcset);
          }
        });

        cardLink.addEventListener('mouseleave', () => {
          if (!isHoveringOverSwatch) {
            setImage(activeSwatchData.primarySrcset);
          }
        });
      }
    }

    enableAdditionalImages() {
      let image_length = this.additional_images.length;
      let images = this.additional_images;
      let nav = this.additional_images_nav;
      let image_container = this.querySelector('.product-card--featured-image-link');

      const mousemove = function (e) {
        let l = e.offsetX;
        let w = this.getBoundingClientRect().width;
        let prc = l / w;
        let sel = Math.floor(prc * image_length);
        let selimg = images[sel];

        images.forEach((image, index) => {
          if (image.classList.contains('hover')) {
            image.classList.remove('hover');
            if (nav.length) {
              nav[index].classList.remove('active');
            }
          }
        });

        if (selimg) {
          if (!selimg.classList.contains('hover')) {
            selimg.classList.add('hover');
            if (nav.length) {
              nav[sel].classList.add('active');
            }
          }
        }
      };

      const mouseleave = function (e) {
        images.forEach((image, index) => {
          image.classList.remove('hover');
          if (nav.length) {
            nav[index].classList.remove('active');
          }
        });
      };

      if (image_container) {
        image_container.addEventListener('touchstart', mousemove, { passive: true });
        image_container.addEventListener('touchmove', mousemove, { passive: true });
        image_container.addEventListener('touchend', mouseleave, { passive: true });
        image_container.addEventListener('mouseenter', mousemove, { passive: true });
        image_container.addEventListener('mousemove', mousemove, { passive: true });
        image_container.addEventListener('mouseleave', mouseleave, { passive: true });
      }

      images.forEach(function (image) {
        window.addEventListener('load', (event) => {
          if (typeof lazySizes !== 'undefined') {
            lazySizes.loader.unveil(image);
          }
        }, { once: true });
      });
    }

    enableQuickAdd() {
      this.quick_add.addEventListener('click', this.quickAdd.bind(this));
    }

    enableSizeOptions() {
      let size_list = this.size_options.querySelectorAll('.product-card-sizes--size'),
        featured_image = this.querySelector('.product-card--featured-image'),
        has_hover = featured_image.classList.contains('thb-hover'),
        size_parent = this.size_options.parentElement;

      this.size_index = this.size_options.dataset.index;
      this.current_options = this.size_options.dataset.options.split(',');
      this.updateMasterId();

      size_parent.addEventListener('mouseenter', () => {
        if (has_hover) {
          featured_image.classList.remove('thb-hover');
        }
      }, {
        passive: true
      });

      size_parent.addEventListener('mouseleave', () => {
        if (has_hover) {
          featured_image.classList.add('thb-hover');
        }
      }, {
        passive: true
      });

      size_list.forEach((size) => {
        size.addEventListener('click', (evt) => {
          evt.preventDefault();

          if (size.classList.contains('is-disabled')) {
            return;
          }
          this.current_options[this.size_index] = size.querySelector('span').innerText;
          this.updateMasterId();

          size.classList.add('loading');
          size.setAttribute('aria-disabled', true);
          const config = {
            method: 'POST',
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
              'Accept': 'application/javascript'
            }
          };
          let formData = new FormData();

          formData.append('id', this.currentVariant.id);
          formData.append('quantity', 1);
          formData.append('sections', this.getSectionsToRender().map((section) => section.section));
          formData.append('sections_url', window.location.pathname);

          config.body = formData;

          fetch(`${theme.routes.cart_add_url}`, config)
            .then((response) => response.json())
            .then((response) => {
              if (response.status) {
                return;
              }
              this.renderContents(response);

              dispatchCustomEvent('cart:item-added', {
                product: response.hasOwnProperty('items') ? response.items[0] : response
              });
            })
            .catch((e) => {
              // console.error(e);
            })
            .finally(() => {
              size.classList.remove('loading');
              size.removeAttribute('aria-disabled');
            });
        });
      });
    }

    updateMasterId() {
      this.currentVariant = this.getVariantData().find((variant) => {
        return !variant.options.map((option, index) => {
          return this.current_options[index] === option;
        }).includes(false);
      });
      setTimeout(() => {
        this.setDisabled();
      }, 100);
    }

    getVariantData() {
      this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
      return this.variantData;
    }

    setDisabled() {
      const variant_data = this.getVariantData();

      if (variant_data) {
        if (this.currentVariant) {
          const selected_options = this.currentVariant.options.map((value, index) => {
            return {
              value,
              index: `option${index + 1}`
            };
          });

          const available_options = this.createAvailableOptionsTree(variant_data, selected_options);
          const fieldset_options = Object.values(available_options)[this.size_index];

          if (fieldset_options) {
            if (this.size_options.querySelectorAll('.product-card-sizes--size').length) {
              this.size_options.querySelectorAll('.product-card-sizes--size').forEach((input, input_i) => {
                input.classList.toggle('is-disabled', fieldset_options[input_i].isUnavailable);
              });
            }
          }
        } else {
          if (this.size_options.querySelectorAll('.product-card-sizes--size').length) {
            this.size_options.querySelectorAll('.product-card-sizes--size').forEach((input, input_i) => {
              input.classList.add('is-disabled');
            });
          }
        }
      }
      return true;
    }

    createAvailableOptionsTree(variant_data, selected_options) {
      return variant_data.reduce((options, variant) => {
        Object.keys(options).forEach(index => {
          if (variant[index] === null) return;

          let entry = options[index].find(option => option.value === variant[index]);

          if (typeof entry === 'undefined') {
            entry = {
              value: variant[index],
              isUnavailable: true
            };
            options[index].push(entry);
          }

          const countVariantOptionsThatMatchCurrent = selected_options.reduce((count, {
            value,
            index
          }) => {
            return variant[index] === value ? count + 1 : count;
          }, 0);

          if (countVariantOptionsThatMatchCurrent >= selected_options.length - 1) {
            entry.isUnavailable = entry.isUnavailable && variant.available ? false : entry.isUnavailable;
          }

          if ((!this.currentVariant || !this.currentVariant.available) && selected_options.find((option) => option.value === entry.value && index === option.index)) {
            entry.isUnavailable = true;
          }

          if (index === 'option1') {
            entry.isUnavailable = entry.isUnavailable && variant.available ? false : entry.isUnavailable;
          }
        });

        return options;
      }, {
        option1: [],
        option2: [],
        option3: []
      });
    }

    quickAdd(evt) {
      evt.preventDefault();
      if (this.quick_add.disabled) {
        return;
      }
      this.quick_add.classList.add('loading');
      this.quick_add.setAttribute('aria-disabled', true);

      const config = {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/javascript'
        }
      };

      let formData = new FormData();

      formData.append('id', this.quick_add.dataset.productId);
      formData.append('quantity', 1);
      formData.append('sections', this.getSectionsToRender().map((section) => section.section));
      formData.append('sections_url', window.location.pathname);

      config.body = formData;

      fetch(`${theme.routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            return;
          }
          this.renderContents(response);

          dispatchCustomEvent('cart:item-added', {
            product: response.hasOwnProperty('items') ? response.items[0] : response
          });
        })
        .catch((e) => {
          // console.error(e);
        })
        .finally(() => {
          this.quick_add.classList.remove('loading');
          this.quick_add.removeAttribute('aria-disabled');
        });

      return false;
    }

    getSectionsToRender() {
      return [{
        id: 'Cart',
        section: 'main-cart',
        selector: '.thb-cart-form'
      },
      {
        id: 'Cart-Drawer',
        section: 'cart-drawer',
        selector: '.cart-drawer'
      },
      {
        id: 'cart-drawer-toggle',
        section: 'cart-bubble',
        selector: '.thb-item-count'
      }];
    }

    renderContents(parsedState) {
      this.getSectionsToRender().forEach((section => {
        if (!document.getElementById(section.id)) {
          return;
        }
        const elementToReplace = document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
        elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);

        if (section.id === 'Cart-Drawer') {
          document.getElementById('Cart-Drawer')?.notesToggle();
          document.getElementById('Cart-Drawer')?.removeProductEvent();
        }

        if (section.id === 'Cart' && typeof Cart !== 'undefined') {
          new Cart().renderContents(parsedState);
        }
      }));

      if (document.getElementById('Cart-Drawer')) {
        document.getElementById('Cart-Drawer').classList.add('active');
        document.body.classList.add('open-cart');
        document.body.classList.add('open-cc');
        if (document.getElementById('Cart-Drawer').querySelector('.product-recommendations--full')) {
          document.getElementById('Cart-Drawer').querySelector('.product-recommendations--full').classList.add('active');
        }
        dispatchCustomEvent('cart-drawer:open');
      }
    }

    getSectionInnerHTML(html, selector = '.shopify-section') {
      return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(selector).innerHTML;
    }
  }
  customElements.define('product-card', ProductCard);
}

/* =====================================================
   PANEL CLOSE
===================================================== */
if (!customElements.get('side-panel-close')) {
  class PanelClose extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
  this.cc = document.querySelector('.click-capture');

  this.onClick = (e) => {
    let panel = document.querySelectorAll('.side-panel.active');
    if (panel.length) {
      this.close_panel(e, panel[0]);
    }
  };

  this.addEventListener('click', this.onClick);
  document.addEventListener('panel:close', this.onClick);

  if (this.cc && !this.cc.hasAttribute('initialized')) {
    this.cc.addEventListener('click', this.onClick);
    this.cc.setAttribute('initialized', '');
  }
}

    close_panel(e, panel) {
      if (e) {
        e.preventDefault();
      }
      if (!panel) {
        panel = e?.target.closest('.side-panel.active');
        if (!panel) {
          return;
        }
      }
      if (panel.classList.contains('product-drawer') || document.body.classList.contains('open-quick-view')) {
        this.close_quick_view();
      } else if (panel.classList.contains('cart-drawer')) {
        if (panel.querySelector('.product-recommendations--full')) {
          if (!document.body.classList.contains('open-quick-view')) {
            panel.querySelector('.product-recommendations--full').classList.remove('active');
          }
        }
        if (window.innerWidth < 1069) {
          if (!document.body.classList.contains('open-quick-view')) {
            panel.classList.remove('active');
            document.body.classList.remove('open-cc');
            document.body.classList.remove('open-cart');
          } else {
            this.close_quick_view();
          }
        } else {
          if (panel.querySelector('.product-recommendations--full')) {
            if (!document.body.classList.contains('open-quick-view')) {
              setTimeout(() => {
                panel.classList.remove('active');
                document.body.classList.remove('open-cc');
                document.body.classList.remove('open-cart');
              }, 500);
            } else {
              this.close_quick_view();
            }
          } else {
            panel.classList.remove('active');
            document.body.classList.remove('open-cc');
            document.body.classList.remove('open-cart');
          }
        }
      } else {
        panel.classList.remove('active');
        document.body.classList.remove('open-cc');
      }
    }

    close_quick_view() {
      let panel = document.getElementById('Product-Drawer');

      if (panel.querySelector('.product-quick-images--container')) {
        panel.querySelector('.product-quick-images--container').classList.remove('active');
      }
      if (window.innerWidth < 1069) {
        panel.classList.remove('active');
        if (!document.body.classList.contains('open-cart') || !document.body.classList.contains('open-quick-view')) {
          document.body.classList.remove('open-cc');
        }
        document.body.classList.remove('open-quick-view');
      } else {
        if (panel.querySelector('.product-quick-images--container')) {
          setTimeout(() => {
            panel.classList.remove('active');
            if (!document.body.classList.contains('open-cart') || !document.body.classList.contains('open-quick-view')) {
              document.body.classList.remove('open-cc');
            }
            document.body.classList.remove('open-quick-view');
            panel.querySelector('#Product-Drawer-Content').innerHTML = '';
          }, 500);
        }
      }
    }
  }
  customElements.define('side-panel-close', PanelClose);

  document.addEventListener('keyup', (e) => {
    if (e.code) {
      if (e.code.toUpperCase() === 'ESCAPE') {
        dispatchCustomEvent('panel:close');
      }
    }
  });
}

/* =====================================================
   CART DRAWER
===================================================== */
if (!customElements.get('cart-drawer')) {
  class CartDrawer extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      let button = document.getElementById('cart-drawer-toggle');

      button.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.add('open-cc');
        document.body.classList.add('open-cart');
        this.classList.add('active');
        this.focus();
        setTimeout(() => {
          this.querySelector('.product-recommendations--full')?.classList.add('active');
        });
        dispatchCustomEvent('cart-drawer:open');
      });

      this.debouncedOnChange = debounce((event) => {
        this.onChange(event);
      }, 300);

      document.addEventListener('cart:refresh', (event) => {
        this.refresh();
      });

      this.addEventListener('change', this.debouncedOnChange.bind(this));

      this.notesToggle();
      this.removeProductEvent();
    }

    onChange(event) {
      if (event.target.classList.contains('qty')) {
        this.updateQuantity(event.target.dataset.index, event.target.value);
      }
    }

    removeProductEvent() {
      let removes = this.querySelectorAll('.remove');

      removes.forEach((remove) => {
        remove.addEventListener('click', (event) => {
          this.updateQuantity(event.target.dataset.index, '0');
          event.preventDefault();
        });
      });
    }

    getSectionsToRender() {
      return [{
        id: 'Cart-Drawer',
        section: 'cart-drawer',
        selector: '.cart-drawer'
      },
      {
        id: 'cart-drawer-toggle',
        section: 'cart-bubble',
        selector: '.thb-item-count'
      }];
    }

    getSectionInnerHTML(html, selector) {
      return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(selector).innerHTML;
    }

    notesToggle() {
      const notes_toggle = document.getElementById('order-note-toggle');

      if (!notes_toggle) {
        return;
      }

      notes_toggle.addEventListener('click', (event) => {
        notes_toggle.nextElementSibling.classList.add('active');
      });

      notes_toggle.nextElementSibling.querySelectorAll('.button, .order-note-toggle__content-overlay').forEach((el) => {
        el.addEventListener('click', (event) => {
          notes_toggle.nextElementSibling.classList.remove('active');
          this.saveNotes();
        });
      });
    }

    saveNotes() {
      fetch(`${theme.routes.cart_update_url}.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': `application/json`
        },
        body: JSON.stringify({
          'note': document.getElementById('mini-cart__notes').value
        })
      });
    }

    updateQuantity(line, quantity) {
      this.querySelector(`#CartDrawerItem-${line}`)?.classList.add('thb-loading');
      const body = JSON.stringify({
        line,
        quantity,
        sections: this.getSectionsToRender().map((section) => section.section),
        sections_url: window.location.pathname
      });

      dispatchCustomEvent('line-item:change:start', {
        quantity: quantity
      });
      this.querySelector('.product-recommendations--full')?.classList.remove('active');

      fetch(`${theme.routes.cart_change_url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': `application/json`
        },
        ...{
          body
        }
      })
        .then((response) => {
          return response.text();
        })
        .then((state) => {
          const parsedState = JSON.parse(state);

          this.getSectionsToRender().forEach((section => {
            const elementToReplace = document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);

            if (parsedState.sections) {
              elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
            }
          }));

          this.removeProductEvent();
          this.notesToggle();
          dispatchCustomEvent('line-item:change:end', {
            quantity: quantity,
            cart: parsedState
          });

          this.querySelector(`#CartDrawerItem-${line}`)?.classList.remove('thb-loading');
        });
    }

    refresh() {
      this.querySelector('.product-recommendations--full')?.classList.remove('active');
      let sections = 'cart-drawer,cart-bubble';
      fetch(`${window.location.pathname}?sections=${sections}`)
        .then((response) => {
          return response.text();
        })
        .then((state) => {
          const parsedState = JSON.parse(state);

          this.getSectionsToRender().forEach((section => {
            const elementToReplace = document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);

            elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState[section.section], section.selector);
          }));

          this.removeProductEvent();
          this.notesToggle();
        });
    }
  }
  customElements.define('cart-drawer', CartDrawer);
}

/* =====================================================
   SELECT WIDTH
===================================================== */
class SelectWidth {
  constructor() {
    let _this = this;

    window.addEventListener('load', () => {
      document.querySelectorAll('.resize-select').forEach(_this.resizeSelect);
    }, { once: true });

    document.body.addEventListener('change', (e) => {
      if (e.target.matches('.resize-select') && e.target.offsetParent !== null) {
        _this.resizeSelect(e.target);
      }
    });

    window.addEventListener('resize', debounce(function () {
      document.querySelectorAll('.resize-select').forEach(_this.resizeSelect);
    }, 200));
  }

  resizeSelect(sel) {
    let tempOption = document.createElement('option');
    tempOption.textContent = sel.selectedOptions[0].textContent;

    let tempSelect = document.createElement('select'),
      offset = 13;
    tempSelect.style.visibility = 'hidden';
    tempSelect.style.position = 'fixed';
    tempSelect.appendChild(tempOption);

    if (sel.classList.contains('thb-language-code') || sel.classList.contains('thb-currency-code') || sel.classList.contains('facet-filters__sort')) {
      offset = 2;
    }
    sel.after(tempSelect);
    if (tempSelect.clientWidth > 0) {
      sel.style.width = `${+tempSelect.clientWidth + offset}px`;
    }
    tempSelect.remove();
  }
}

if (typeof SelectWidth !== 'undefined') {
  new SelectWidth();
}

/* =====================================================
   FOOTER MENU TOGGLE
===================================================== */
class FooterMenuToggle {
  constructor() {
    document.querySelectorAll('.thb-widget-title.collapsible').forEach((button) => {
      button.addEventListener('click', (e) => {
        button.classList.toggle('active');
      });
    });
  }
}

/* =====================================================
   QUICK VIEW (OPTIMIZED)
===================================================== */
if (!customElements.get('quick-view')) {
  class QuickView extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.drawer = document.getElementById('Product-Drawer');
      this.body = document.body;
      this.addEventListener('click', this.setupEventListener.bind(this));
    }

    setupEventListener(e) {
      e.preventDefault();

      const productHandle = this.dataset.productHandle;
      if (!productHandle) return;

      let variantId = null;
      let href = null;

      // Look for the product card container using both the class name (.product-card)
      // AND the custom element tag name (product-card) used by product-card-small.liquid.
      // Do NOT fall back to `document` — that would pick up active swatches from the
      // main PDP and open the completely wrong product in the Quick View drawer.
      const card =
        this.parentElement?.closest('product-card, .product-card, .product-card-item') ||
        this.closest('product-card, .product-card, .product-card-item') ||
        this.parentElement;
      const activeSwatch = card?.querySelector('.product-card-swatch.active, .product-swatch.active, [data-variant-id].active, [data-product-id].active, [data-href].active');

      if (activeSwatch && activeSwatch.dataset && activeSwatch.dataset.href) {
        try {
          const url = new URL(activeSwatch.dataset.href, window.location.origin);
          url.searchParams.set('view', 'quick-view');
          href = url.pathname + url.search;
        } catch (err) {
          href = activeSwatch.dataset.href;
          href += (href.indexOf('?') > -1 ? '&' : '?') + 'view=quick-view';
        }
      }

      if (!href) {
        const productForm = this.closest('form');
        if (productForm) {
          const select = productForm.querySelector('select[name="id"]');
          if (select) variantId = select.value;
        }

        if (!variantId && activeSwatch) {
          if (activeSwatch.dataset.variantId) variantId = activeSwatch.dataset.variantId;
          else if (activeSwatch.dataset.productId) variantId = activeSwatch.dataset.productId;
          else if (activeSwatch.dataset.href) {
            try {
              const url = new URL(activeSwatch.dataset.href, window.location.origin);
              variantId = url.searchParams.get('variant');
            } catch (err) {
              variantId = null;
            }
          }
        }

        href = `${theme.routes.root_url}/products/${productHandle}`;
        if (variantId) href += `?variant=${variantId}&view=quick-view`;
        else href += `?view=quick-view`;

        href = href.replace('//', '/');
      }

      if (this.classList.contains('loading')) return;
      this.classList.add('loading');

      fetch(href)
        .then((response) => {
          this.classList.remove('loading');
          return response.text();
        })
        .then((text) => {
          const section = new DOMParser()
            .parseFromString(text, 'text/html')
            .querySelector('#Product-Drawer-Content');

          if (section) this.renderQuickview(section.innerHTML, href, productHandle);
        })
        .catch((err) => {
          // console.error('Quick View fetch error:', err);
          this.classList.remove('loading');
        });
    }

    renderQuickview(sectionInnerHTML, href, productHandle) {
      if (!sectionInnerHTML) return;

      const drawerContent = this.drawer.querySelector('#Product-Drawer-Content');
      drawerContent.innerHTML = sectionInnerHTML;

      // Remove duplicate images
      try {
        const containers = drawerContent.querySelectorAll('.product-quick-images--container, .product-quick-thumbnails, .product-gallery, .product-quick-images');
        containers.forEach((container) => {
          const imgs = Array.from(container.querySelectorAll('img'));
          const seen = new Set();
          imgs.forEach((img) => {
            const srcFromSrc = img.getAttribute('src');
            const srcFromData = img.getAttribute('data-src') || img.getAttribute('data-srcset');
            const srcset = img.getAttribute('srcset') || srcFromData || '';
            const firstSrc = (srcFromSrc || srcset.split(',')[0] || '').trim().split(' ')[0];
            const key = firstSrc || img.outerHTML;
            if (!key) return;
            if (seen.has(key)) {
              const parent = img.parentElement;
              if (parent && (parent.tagName.toLowerCase() === 'picture' || parent.tagName.toLowerCase() === 'a')) {
                parent.remove();
              } else {
                img.remove();
              }
            } else {
              seen.add(key);
            }
          });
        });
      } catch (e) {
        // console.error('Quickview dedupe error', e);
      }

      // Force load ALL images immediately
      const loadImages = () => {
        const allImages = drawerContent.querySelectorAll('img');

        allImages.forEach((img) => {
          img.removeAttribute('loading');
          img.classList.remove('lazyload', 'lazyloading', 'lazyloaded');

          const picture = img.closest('picture');

          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }

          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
            img.removeAttribute('data-srcset');
          }

          if (picture) {
            const sources = picture.querySelectorAll('source');
            sources.forEach(source => {
              if (source.dataset.srcset) {
                source.srcset = source.dataset.srcset;
                source.removeAttribute('data-srcset');
              }
            });
          }

          if (!img.src && img.srcset) {
            const firstSrc = img.srcset.split(',')[0].trim().split(' ')[0];
            if (firstSrc) img.src = firstSrc;
          }
        });

        if (typeof lazySizes !== 'undefined') {
          allImages.forEach((img) => {
            lazySizes.loader.unveil(img);
          });
          lazySizes.autoSizer.checkElems();
        }
      };

      loadImages();
      setTimeout(loadImages, 50);
      setTimeout(loadImages, 150);

      // Re-run scripts
      const js_files = drawerContent.querySelectorAll('script');
      if (js_files.length > 0) {
        const head = document.getElementsByTagName('head')[0];
        js_files.forEach((js_file) => {
          if (js_file.src) {
            const script = document.createElement('script');
            script.src = js_file.src;
            head.appendChild(script);
          }
        });
      }

      setTimeout(() => {
        if (Shopify && Shopify.PaymentButton) Shopify.PaymentButton.init();
        if (window.ProductModel) window.ProductModel.loadShopifyXR();
      }, 300);

      this.body.classList.add('open-cc', 'open-quick-view');
      this.drawer.classList.add('active');

      const closeBtn = this.drawer.querySelector('.side-panel-close');
      if (closeBtn) closeBtn.focus();

      setTimeout(() => {
        this.activateImageSlider(drawerContent);

        this.fixColorNameDisplay(drawerContent);
        setTimeout(() => this.fixColorNameDisplay(drawerContent), 50);
        setTimeout(() => this.fixColorNameDisplay(drawerContent), 200);

        this.initializeSwatchesNavigation(drawerContent);

        setTimeout(() => this.refreshVariantAvailability(drawerContent), 100);
        setTimeout(() => this.refreshVariantAvailability(drawerContent), 300);
        setTimeout(() => this.refreshVariantAvailability(drawerContent), 500);

        setTimeout(() => this.forceEnableAddToCart(drawerContent), 200);
        setTimeout(() => this.forceEnableAddToCart(drawerContent), 600);

        this.startButtonMonitor(drawerContent);

      }, 100);

      dispatchCustomEvent('quick-view:open', {
        productUrl: href,
        productHandle: productHandle,
      });

      addIdToRecentlyViewed(productHandle);
    }

    activateImageSlider(container) {
      if (!container) return;

      const imgContainer = container.querySelector('.product-quick-images--container');
      if (imgContainer) {
        imgContainer.classList.add('active');
        imgContainer.style.opacity = '1';
        imgContainer.style.visibility = 'visible';
      }

      const allSlides = container.querySelectorAll('.product-quick-images__slide, .product-images__slide, [class*="slide"]');

      if (allSlides.length > 0) {
        allSlides.forEach(slide => {
          slide.classList.remove('is-active', 'active');
          slide.style.display = '';
          slide.style.opacity = '';
        });

        allSlides[0].classList.add('is-active');
        allSlides[0].style.display = 'block';
        allSlides[0].style.opacity = '1';
      }

      const sliderWrappers = container.querySelectorAll('.product-quick-images, .product-images, [class*="image-slider"]');
      sliderWrappers.forEach(wrapper => {
        wrapper.classList.add('active');
        wrapper.style.opacity = '1';
        wrapper.style.visibility = 'visible';
      });
    }

    fixColorNameDisplay(container) {
      if (!container) return;

      const colorLabel = container.querySelector('.js-selected-color');
      if (!colorLabel) return;

      const getValidColor = () => {
        const activeSwatch = container.querySelector('.related-swatches__item.is-active');
        if (activeSwatch) {
          const color = activeSwatch.getAttribute('data-color');
          if (color && color !== 'undefined' && color !== 'null' && color.trim()) {
            return color;
          }
        }

        const swatchContainer = container.querySelector('.related-swatches-container');
        if (swatchContainer) {
          const color = swatchContainer.getAttribute('data-current-color');
          if (color && color !== 'undefined' && color !== 'null' && color.trim()) {
            return color;
          }
        }

        const storedColor = colorLabel.getAttribute('data-color-value');
        if (storedColor && storedColor !== 'undefined' && storedColor !== 'null' && storedColor.trim()) {
          return storedColor;
        }

        const firstSwatch = container.querySelector('.related-swatches__item');
        if (firstSwatch) {
          const color = firstSwatch.getAttribute('data-color');
          if (color && color !== 'undefined' && color !== 'null' && color.trim()) {
            return color;
          }
        }

        const currentText = colorLabel.textContent.trim();
        if (currentText && currentText !== 'undefined' && currentText !== 'null' && currentText !== '') {
          return currentText;
        }

        return null;
      };

      const validColor = getValidColor();

      if (validColor) {
        colorLabel.textContent = validColor;
        colorLabel.setAttribute('data-color-value', validColor);

        const colorFieldset = container.querySelector('.product-form__input--color');
        if (colorFieldset) {
          colorFieldset.style.display = '';
        }
      } else {
        const colorFieldset = container.querySelector('.product-form__input--color');
        if (colorFieldset) {
          colorFieldset.style.display = 'none';
        }
      }

      const updateColor = () => {
        const newColor = getValidColor();
        if (newColor) {
          colorLabel.textContent = newColor;
          colorLabel.setAttribute('data-color-value', newColor);
        }
      };

      const form = container.querySelector('form');
      if (form) {
        form.addEventListener('change', (e) => {
          if (e.target.matches('input[type="radio"]') || e.target.matches('select')) {
            updateColor();
            setTimeout(updateColor, 10);
            setTimeout(updateColor, 50);
          }
        });
      }

      document.addEventListener('variant:change', updateColor);

      const sizeInputs = container.querySelectorAll('input[type="radio"][data-size-value]');
      sizeInputs.forEach(input => {
        input.addEventListener('change', () => {
          updateColor();
          setTimeout(updateColor, 10);
          setTimeout(updateColor, 50);

          setTimeout(() => this.refreshVariantAvailability(container), 10);
        });
      });
    }

    getSelectedVariant(container) {
      if (!container) return null;

      const variantDataScript = container.querySelector('[type="application/json"]');
      if (!variantDataScript) return null;

      let variantData;
      try {
        variantData = JSON.parse(variantDataScript.textContent);
      } catch (e) {
        return null;
      }

      if (!Array.isArray(variantData) || !variantData.length) {
        return null;
      }

      const selectedOptions = {};
      const fieldsets = container.querySelectorAll('fieldset[data-index]');

      fieldsets.forEach((fieldset) => {
        const dataIndex = fieldset.dataset.index;
        if (!dataIndex) return;

        let selectedValue = null;
        const select = fieldset.querySelector('select');

        if (select) {
          selectedValue = select.value;
        } else {
          const checkedInput = fieldset.querySelector('input:checked');
          if (checkedInput) {
            selectedValue = checkedInput.value;
          }
        }

        if (selectedValue !== null && selectedValue !== undefined && selectedValue !== '') {
          selectedOptions[dataIndex] = selectedValue.trim();
        }
      });

      if (!Object.keys(selectedOptions).length) {
        return null;
      }

      return variantData.find((variant) => {
        return Object.entries(selectedOptions).every(([index, value]) => {
          const variantValue = variant[index];
          const normalizedVariantValue = typeof variantValue === 'string' ? variantValue.trim() : variantValue;
          return normalizedVariantValue === value;
        });
      }) || null;
    }

    isUnavailableSizeSelected(container) {
      if (!container) return false;

      const checkedInput = container.querySelector('input[type="radio"][data-size-value]:checked, input[type="radio"][name*="Size"]:checked, .product-form__input--block input[type="radio"]:checked');
      if (!checkedInput) return false;

      if (
        checkedInput.disabled ||
        checkedInput.classList.contains('is-disabled') ||
        checkedInput.classList.contains('disabled')
      ) {
        return true;
      }

      const label = checkedInput.id ? container.querySelector(`label[for="${checkedInput.id}"]`) : null;
      if (!label) return false;

      return (
        label.classList.contains('is-disabled') ||
        label.classList.contains('disabled') ||
        label.classList.contains('soldout') ||
        label.classList.contains('unavailable') ||
        label.classList.contains('out-of-stock')
      );
    }

    forceEnableAddToCart(container) {
      if (!container) return;

      const form = container.querySelector('form[action*="/cart/add"]');
      const addToCartBtn = container.querySelector('button[name="add"], .product-form__submit, button[type="submit"]');
      const unavailableBtn = container.querySelector('.product-form__error-message-wrapper, .product-form__error-message');
      const submitWrapper = container.querySelector('.product-form__submit-wrapper, .product-form__buttons');
      const dynamicCheckout = container.querySelector('.shopify-payment-button');
      const selectedVariant = this.getSelectedVariant(container);
      const unavailableSizeSelected = this.isUnavailableSizeSelected(container);

      if (!selectedVariant && !unavailableSizeSelected) return;

      const isAvailable = Boolean(selectedVariant?.available) && !unavailableSizeSelected;
      const soldOutText = window.theme?.variantStrings?.soldOut || 'SOLD OUT';
      const addToCartText = window.theme?.variantStrings?.addToCart || 'ADD TO CART';

      if (addToCartBtn) {
        const buttonText = addToCartBtn.querySelector('.single-add-to-cart-button--text');

        if (isAvailable) {
          addToCartBtn.disabled = false;
          addToCartBtn.removeAttribute('disabled');
          addToCartBtn.classList.remove('disabled', 'is-disabled', 'sold-out');
          addToCartBtn.style.pointerEvents = 'auto';
          addToCartBtn.style.opacity = '1';
          if (buttonText) {
            buttonText.textContent = addToCartText;
          }
        } else {
          addToCartBtn.disabled = true;
          addToCartBtn.setAttribute('disabled', 'disabled');
          addToCartBtn.classList.add('disabled', 'is-disabled', 'sold-out');
          addToCartBtn.style.pointerEvents = '';
          addToCartBtn.style.opacity = '';
          if (buttonText) {
            buttonText.textContent = soldOutText;
          }
        }

        addToCartBtn.style.display = '';
      }

      if (unavailableBtn && isAvailable) {
        unavailableBtn.style.display = 'none';
        unavailableBtn.classList.add('hidden');
      }

      if (form) {
        form.classList.toggle('is-disabled', !isAvailable);
      }

      if (submitWrapper) {
        submitWrapper.style.display = '';
      }

      if (dynamicCheckout) {
        dynamicCheckout.style.display = isAvailable ? '' : 'none';
      }
    }

    startButtonMonitor(container) {
      if (!container) return;

      let checks = 0;
      const maxChecks = 30;

      const monitorInterval = setInterval(() => {
        checks++;

        const addToCartBtn = container.querySelector('button[name="add"], .product-form__submit');
        const unavailableBtn = container.querySelector('button:not([name="add"])');

        const isDisabled = addToCartBtn?.disabled || addToCartBtn?.hasAttribute('disabled');
        const showingUnavailable = unavailableBtn?.textContent.trim() === 'UNAVAILABLE';

        if (isDisabled || showingUnavailable) {
          this.forceEnableAddToCart(container);
        }

        if (checks >= maxChecks) {
          clearInterval(monitorInterval);
        }
      }, 100);
    }

    refreshVariantAvailability(container) {
      if (!container) return;

      const variantDataScript = container.querySelector('[type="application/json"]');
      if (!variantDataScript) {
        return;
      }

      let variantData;
      try {
        variantData = JSON.parse(variantDataScript.textContent);
      } catch (e) {
        // console.error('Error parsing variant data:', e);
        return;
      }

      const sizeInputs = container.querySelectorAll('input[type="radio"][data-size-value], input[type="radio"][name*="Size"]');

      if (!sizeInputs.length) {
        const altInputs = container.querySelectorAll('.product-form__input--block input[type="radio"]');
        if (altInputs.length) {
          this.processSizeAvailability(altInputs, variantData, container);
        }
        return;
      }

      this.processSizeAvailability(sizeInputs, variantData, container);
    }

    processSizeAvailability(sizeInputs, variantData, container) {
      if (!Array.isArray(variantData)) {
        return;
      }

      const availableSizes = new Set();
      const sizeToVariantMap = new Map();

      variantData.forEach(variant => {
        if (variant.available) {
          if (variant.option1) {
            availableSizes.add(variant.option1);
            sizeToVariantMap.set(variant.option1, variant);
          }
          if (variant.option2) {
            availableSizes.add(variant.option2);
            sizeToVariantMap.set(variant.option2, variant);
          }
          if (variant.option3) {
            availableSizes.add(variant.option3);
            sizeToVariantMap.set(variant.option3, variant);
          }

          if (variant.options && Array.isArray(variant.options)) {
            variant.options.forEach(opt => {
              availableSizes.add(opt);
              sizeToVariantMap.set(opt, variant);
            });
          }
        }
      });

      sizeInputs.forEach((input, index) => {
        const sizeValue = input.getAttribute('data-size-value') ||
          input.value ||
          input.getAttribute('value');

        const label = container.querySelector(`label[for="${input.id}"]`);

        if (!sizeValue) {
          return;
        }

        const isAvailable = availableSizes.has(sizeValue);
        const variant = sizeToVariantMap.get(sizeValue);

        if (isAvailable) {
          if (label) {
            label.classList.remove('is-disabled', 'disabled', 'soldout', 'unavailable', 'out-of-stock');
            label.style.opacity = '';
            label.style.pointerEvents = '';
          }

          input.disabled = false;
          input.removeAttribute('disabled');
          input.classList.remove('disabled', 'is-disabled');

          const fieldset = input.closest('fieldset');
          if (fieldset) {
            input.parentElement?.classList.remove('is-disabled', 'disabled');
          }

          input.addEventListener('change', () => {
            this.forceEnableAddToCart(container);
            setTimeout(() => this.forceEnableAddToCart(container), 50);
            setTimeout(() => this.forceEnableAddToCart(container), 150);
            setTimeout(() => this.forceEnableAddToCart(container), 300);

            this.startButtonMonitor(container);
          });

        } else {
          if (label) {
            label.classList.add('is-disabled');
          }
          input.classList.add('is-disabled', 'disabled');
          input.disabled = false;
          input.removeAttribute('disabled');
        }
      });

      const checkedInput = container.querySelector('input[type="radio"][data-size-value]:checked');
      if (checkedInput) {
        setTimeout(() => {
          this.forceEnableAddToCart(container);
        }, 100);
      } else {
        this.forceEnableAddToCart(container);
      }
    }

    initializeSwatchesNavigation(container) {
      if (!container) return;

      const swatchContainers = container.querySelectorAll('.related-swatches-container');

      swatchContainers.forEach((swatchContainer) => {
        const track = swatchContainer.querySelector('.related-swatches-track');
        const prevBtn = swatchContainer.querySelector('.swatches-nav-prev');
        const nextBtn = swatchContainer.querySelector('.swatches-nav-next');
        const slider = swatchContainer.querySelector('.related-swatches-slider');
        const items = Array.from(track.querySelectorAll('.related-swatches__item'));

        if (!track || !prevBtn || !nextBtn || !slider || items.length === 0) return;

        let currentIndex = 0;
        let itemWidth = 0;
        let visibleCount = 4;
        let maxIndex = 0;

        const calculateDimensions = () => {
          if (items.length === 0) return;

          const firstItem = items[0];
          const itemRect = firstItem.getBoundingClientRect();
          const gap = parseFloat(getComputedStyle(track).gap) || 10;
          itemWidth = itemRect.width + gap;

          const sliderWidth = slider.offsetWidth;
          const calculatedCount = Math.floor(sliderWidth / itemWidth);

          const isMobile = window.innerWidth < 768;
          visibleCount = isMobile ? Math.max(2, Math.min(calculatedCount, 3)) : 4;

          maxIndex = Math.max(0, items.length - visibleCount);
        };

        const checkOverflow = () => {
          calculateDimensions();

          const needsNavigation = items.length > visibleCount;

          if (needsNavigation) {
            prevBtn.style.display = 'flex';
            nextBtn.style.display = 'flex';
            prevBtn.classList.add('visible');
            nextBtn.classList.add('visible');
          } else {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            prevBtn.classList.remove('visible');
            nextBtn.classList.remove('visible');
          }

          updateButtons();
        };

        const updateButtons = () => {
          prevBtn.disabled = currentIndex <= 0;
          nextBtn.disabled = currentIndex >= maxIndex;
          prevBtn.style.opacity = currentIndex <= 0 ? '0.3' : '1';
          nextBtn.style.opacity = currentIndex >= maxIndex ? '0.3' : '1';
        };

        const slide = (direction) => {
          if (direction === 'next') {
            currentIndex = Math.min(currentIndex + 1, maxIndex);
          } else {
            currentIndex = Math.max(currentIndex - 1, 0);
          }

          const translateX = -(currentIndex * itemWidth);
          track.style.transform = `translateX(${translateX}px)`;
          track.style.transition = 'transform 0.3s ease';
          updateButtons();
        };

        prevBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          slide('prev');
        });

        nextBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          slide('next');
        });

        items.forEach((item) => {
          item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const handle = item.getAttribute('data-product-handle');
            const color = item.getAttribute('data-color');

            if (!item.classList.contains('is-active') && handle) {
              items.forEach((i) => i.classList.remove('is-active'));
              item.classList.add('is-active');

              const colorLabel = container.querySelector('.js-selected-color');
              if (colorLabel && color) {
                colorLabel.textContent = color;
                colorLabel.setAttribute('data-color-value', color);
              }

              const quickViewContainer = item.closest('.side-panel');
              if (quickViewContainer && quickViewContainer.id === 'Product-Drawer') {
                const drawerContent = container.closest('#Product-Drawer-Content');
                if (drawerContent) {
                  drawerContent.style.opacity = '0.5';
                  drawerContent.style.pointerEvents = 'none';
                }

                fetch(`/products/${handle}?view=quick-view`)
                  .then((response) => response.text())
                  .then((text) => {
                    const section = new DOMParser()
                      .parseFromString(text, 'text/html')
                      .querySelector('#Product-Drawer-Content');

                    if (section && drawerContent) {
                      drawerContent.innerHTML = section.innerHTML;

                      const loadNewImages = () => {
                        const newImages = drawerContent.querySelectorAll('img');
                        newImages.forEach((img) => {
                          img.removeAttribute('loading');
                          img.classList.remove('lazyload', 'lazyloading', 'lazyloaded');
                          if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                          }
                          if (img.dataset.srcset) {
                            img.srcset = img.dataset.srcset;
                            img.removeAttribute('data-srcset');
                          }
                        });
                      };
                      loadNewImages();
                      setTimeout(loadNewImages, 50);

                      drawerContent.style.opacity = '1';
                      drawerContent.style.pointerEvents = 'auto';

                      setTimeout(() => {
                        this.activateImageSlider(drawerContent);
                        this.fixColorNameDisplay(drawerContent);
                        this.initializeSwatchesNavigation(drawerContent);
                        this.refreshVariantAvailability(drawerContent);
                        this.forceEnableAddToCart(drawerContent);
                        this.startButtonMonitor(drawerContent);
                      }, 100);

                      setTimeout(() => {
                        this.activateImageSlider(drawerContent);
                        this.fixColorNameDisplay(drawerContent);
                      }, 200);

                      setTimeout(() => {
                        this.activateImageSlider(drawerContent);
                      }, 400);

                      const js_files = drawerContent.querySelectorAll('script');
                      if (js_files.length > 0) {
                        const head = document.getElementsByTagName('head')[0];
                        js_files.forEach((js_file) => {
                          if (js_file.src && !document.querySelector(`script[src="${js_file.src}"]`)) {
                            const script = document.createElement('script');
                            script.src = js_file.src;
                            head.appendChild(script);
                          }
                        });
                      }

                      setTimeout(() => {
                        if (Shopify && Shopify.PaymentButton) Shopify.PaymentButton.init();
                        if (window.ProductModel) window.ProductModel.loadShopifyXR();
                      }, 300);

                      addIdToRecentlyViewed(handle);
                    }
                  })
                  .catch((error) => {
                    // console.error('Error loading product:', error);
                    if (drawerContent) {
                      drawerContent.style.opacity = '1';
                      drawerContent.style.pointerEvents = 'auto';
                    }
                  });
              } else {
                window.location.href = '/products/' + handle;
              }
            }
          });
        });

        let resizeTimeout;
        const resizeHandler = () => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            currentIndex = 0;
            track.style.transform = 'translateX(0)';
            checkOverflow();
          }, 200);
        };

        window.addEventListener('resize', resizeHandler);

        const init = () => {
          const images = Array.from(track.querySelectorAll('img'));

          if (images.length > 0) {
            let loadedCount = 0;
            const totalImages = images.length;

            images.forEach((img) => {
              if (img.complete) {
                loadedCount++;
              } else {
                img.addEventListener('load', () => {
                  loadedCount++;
                  if (loadedCount === totalImages) {
                    setTimeout(checkOverflow, 100);
                  }
                });
              }
            });

            if (loadedCount === totalImages) {
              setTimeout(checkOverflow, 100);
            }
          } else {
            setTimeout(checkOverflow, 100);
          }

          setTimeout(checkOverflow, 300);
          setTimeout(checkOverflow, 500);
        };

        init();
      });
    }
  }

  customElements.define('quick-view', QuickView);
}

/* =====================================================
   SIDE PANEL CONTENT TABS
===================================================== */
if (!customElements.get('side-panel-content-tabs')) {
  class SidePanelContentTabs extends HTMLElement {
    constructor() {
      super();
      this.buttons = Array.from(this.querySelectorAll('button'));
      this.panels = Array.from(this.parentElement.querySelectorAll('.side-panel-content--tab-panel'));
      if (this.panels.length > this.buttons.length) {
        this.panels = this.panels.slice(0, this.buttons.length);
      }
    }

    connectedCallback() {
      this.setupButtonObservers();
    }

    setupButtonObservers() {
      this.buttons.forEach((item, i) => {
        item.dataset.tabIndex = i;
        item.addEventListener('click', (e) => {
          const idx = Number(item.dataset.tabIndex);
          this.toggleActiveClass(idx);
        });
      });
    }

    toggleActiveClass(i) {
      this.buttons.forEach((button) => button.classList.remove('tab-active'));
      if (this.buttons[i]) this.buttons[i].classList.add('tab-active');

      this.panels.forEach((panel) => panel.classList.remove('tab-active'));
      if (this.panels[i]) this.panels[i].classList.add('tab-active');
    }
  }

  customElements.define('side-panel-content-tabs', SidePanelContentTabs);
}

/* =====================================================
   COLLAPSIBLE ROW
===================================================== */
if (!customElements.get('collapsible-row')) {
  class CollapsibleRow extends HTMLElement {
    constructor() {
      super();

      this.details = this.querySelector('details');
      this.summary = this.querySelector('summary');
      this.content = this.querySelector('.collapsible__content');

      this.animation = null;
      this.isClosing = false;
      this.isExpanding = false;
    }

    connectedCallback() {
      this.setListeners();
    }

    setListeners() {
      this.querySelector('summary').addEventListener('click', (e) => this.onClick(e));
    }

    onClick(e) {
      e.preventDefault();
      this.details.style.overflow = 'hidden';

      if (this.isClosing || !this.details.open) {
        this.open();
      } else if (this.isExpanding || this.details.open) {
        this.shrink();
      }
    }

    shrink() {
      this.isClosing = true;

      const startHeight = `${this.details.offsetHeight}px`;
      const endHeight = `${this.summary.offsetHeight}px`;

      if (this.animation) {
        this.animation.cancel();
      }

      this.animation = this.details.animate({
        height: [startHeight, endHeight]
      }, {
        duration: 250,
        easing: 'ease'
      });

      this.animation.onfinish = () => this.onAnimationFinish(false);
      this.animation.oncancel = () => this.isClosing = false;
    }

    open() {
      this.details.style.height = `${this.details.offsetHeight}px`;
      this.details.open = true;
      window.requestAnimationFrame(() => this.expand());
    }

    expand() {
      this.isExpanding = true;
      const startHeight = `${this.details.offsetHeight}px`;
      const endHeight = `${this.summary.offsetHeight + this.content.offsetHeight}px`;

      if (this.animation) {
        this.animation.cancel();
      }

      this.animation = this.details.animate({
        height: [startHeight, endHeight]
      }, {
        duration: 400,
        easing: 'ease-out'
      });

      this.animation.onfinish = () => this.onAnimationFinish(true);
      this.animation.oncancel = () => this.isExpanding = false;
    }

    onAnimationFinish(open) {
      this.details.open = open;
      this.animation = null;
      this.isClosing = false;
      this.isExpanding = false;
      this.details.style.height = this.details.style.overflow = '';
    }
  }
  customElements.define('collapsible-row', CollapsibleRow);
}

/* =====================================================
   RECENTLY VIEWED
===================================================== */
function addIdToRecentlyViewed(handle) {
  if (!handle) {
    let product = document.querySelector('.thb-product-detail');
    if (product) {
      handle = product.dataset.handle;
    }
  }
  if (!handle) {
    return;
  }
  if (window.localStorage) {
    let recentIds = window.localStorage.getItem('recently-viewed');
    if (recentIds != 'undefined' && recentIds != null) {
      window.recentlyViewedIds = JSON.parse(recentIds);
    }
  }

  var i = window.recentlyViewedIds.indexOf(handle);

  if (i > -1) {
    window.recentlyViewedIds.splice(i, 1);
  }

  window.recentlyViewedIds.unshift(handle);

  if (window.localStorage) {
    window.localStorage.setItem('recently-viewed', JSON.stringify(window.recentlyViewedIds));
  }
}

/* =====================================================
   DOM CONTENT LOADED
===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize arrows
  initArrows();

  // Initialize footer menus
  if (typeof FooterMenuToggle !== 'undefined') {
    new FooterMenuToggle();
  }

  // Initialize swatches navigation
  setTimeout(() => {
    initializeSwatchesNavigationGlobal();
  }, 200);
});

/* =====================================================
   GLOBAL SWATCHES NAVIGATION
===================================================== */
document.addEventListener('quick-view:open', () => {
  setTimeout(() => {
    const drawer = document.getElementById('Product-Drawer');
    if (drawer) {
      initializeSwatchesNavigationGlobal(drawer);
    }
  }, 300);
});

function initializeSwatchesNavigationGlobal(container) {
  if (!container) {
    container = document;
  }

  const swatchContainers = container.querySelectorAll('.related-swatches-container');

  swatchContainers.forEach((swatchContainer) => {
    if (swatchContainer.hasAttribute('data-swatches-initialized')) {
      return;
    }
    swatchContainer.setAttribute('data-swatches-initialized', 'true');

    const track = swatchContainer.querySelector('.related-swatches-track');
    const prevBtn = swatchContainer.querySelector('.swatches-nav-prev');
    const nextBtn = swatchContainer.querySelector('.swatches-nav-next');
    const slider = swatchContainer.querySelector('.related-swatches-slider');
    const items = Array.from(track.querySelectorAll('.related-swatches__item'));

    if (!track || !prevBtn || !nextBtn || !slider || items.length === 0) return;

    let currentIndex = 0;
    let itemWidth = 0;
    let visibleCount = 0;
    let maxIndex = 0;

    const calculateDimensions = () => {
      if (items.length === 0) return;

      const firstItem = items[0];
      const itemRect = firstItem.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(track).gap) || 10;
      itemWidth = itemRect.width + gap;

      const sliderWidth = slider.offsetWidth;
      visibleCount = Math.floor(sliderWidth / itemWidth);

      const isQuickView = swatchContainer.closest('#Product-Drawer') !== null;

      if (isQuickView && window.innerWidth >= 1024) {
        visibleCount = Math.min(visibleCount, 4);
      }

      maxIndex = Math.max(0, items.length - visibleCount);
    };

    const checkOverflow = () => {
      calculateDimensions();

      const needsNavigation = items.length > visibleCount;

      if (needsNavigation) {
        prevBtn.classList.add('visible');
        nextBtn.classList.add('visible');
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
      } else {
        prevBtn.classList.remove('visible');
        nextBtn.classList.remove('visible');
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
      }

      updateButtons();
    };

    const updateButtons = () => {
      prevBtn.disabled = currentIndex <= 0;
      nextBtn.disabled = currentIndex >= maxIndex;
    };

    const slide = (direction) => {
      if (direction === 'next') {
        currentIndex = Math.min(currentIndex + 1, maxIndex);
      } else {
        currentIndex = Math.max(currentIndex - 1, 0);
      }

      const translateX = -(currentIndex * itemWidth);
      track.style.transform = `translateX(${translateX}px)`;
      updateButtons();
    };

    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      slide('prev');
    });

    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      slide('next');
    });

    items.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const handle = item.getAttribute('data-product-handle');
        const color = item.getAttribute('data-color');

        if (!item.classList.contains('is-active') && handle) {
          items.forEach((i) => i.classList.remove('is-active'));
          item.classList.add('is-active');

          const colorLabel = container.querySelector('.js-selected-color');
          if (colorLabel) colorLabel.textContent = color;

          const quickViewContainer = item.closest('.side-panel');
          if (quickViewContainer && quickViewContainer.id === 'Product-Drawer') {
            const drawerContent = document.querySelector('#Product-Drawer-Content');
            if (drawerContent) {
              drawerContent.style.opacity = '0.5';
              drawerContent.style.pointerEvents = 'none';
            }

            fetch(`/products/${handle}?view=quick-view`)
              .then((response) => response.text())
              .then((text) => {
                const section = new DOMParser()
                  .parseFromString(text, 'text/html')
                  .querySelector('#Product-Drawer-Content');

                if (section && drawerContent) {
                  drawerContent.innerHTML = section.innerHTML;

                  const loadImages = () => {
                    const allImages = drawerContent.querySelectorAll('img');

                    allImages.forEach((img) => {
                      img.removeAttribute('loading');
                      img.classList.remove('lazyload', 'lazyloading', 'lazyloaded');

                      const picture = img.closest('picture');

                      if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                      }

                      if (img.dataset.srcset) {
                        img.srcset = img.dataset.srcset;
                        img.removeAttribute('data-srcset');
                      }

                      if (picture) {
                        const sources = picture.querySelectorAll('source');
                        sources.forEach(source => {
                          if (source.dataset.srcset) {
                            source.srcset = source.dataset.srcset;
                            source.removeAttribute('data-srcset');
                          }
                        });
                      }

                      if (!img.src && img.srcset) {
                        const firstSrc = img.srcset.split(',')[0].trim().split(' ')[0];
                        if (firstSrc) img.src = firstSrc;
                      }

                      img.complete = true;
                    });

                    if (typeof lazySizes !== 'undefined') {
                      allImages.forEach((img) => {
                        lazySizes.loader.unveil(img);
                      });
                      lazySizes.autoSizer.checkElems();
                    }
                  };

                  loadImages();
                  setTimeout(loadImages, 50);
                  setTimeout(loadImages, 150);

                  drawerContent.style.opacity = '1';
                  drawerContent.style.pointerEvents = 'auto';

                  const newContainer = drawerContent.querySelector('.related-swatches-container');
                  if (newContainer) {
                    newContainer.removeAttribute('data-swatches-initialized');
                  }

                  setTimeout(() => {
                    const imgContainer = drawerContent.querySelector('.product-quick-images--container');
                    if (imgContainer) {
                      imgContainer.classList.add('active');
                      imgContainer.style.opacity = '1';
                      imgContainer.style.visibility = 'visible';
                    }
                  }, 10);

                  const allSlides = drawerContent.querySelectorAll('.product-quick-images__slide, .product-images__slide');
                  if (allSlides.length > 0) {
                    allSlides.forEach(slide => slide.classList.remove('is-active'));
                    allSlides[0].classList.add('is-active');
                    allSlides[0].style.display = 'block';
                    allSlides[0].style.opacity = '1';
                  }

                  setTimeout(() => {
                    initializeSwatchesNavigationGlobal(drawerContent);
                  }, 200);

                  const js_files = drawerContent.querySelectorAll('script');
                  if (js_files.length > 0) {
                    const head = document.getElementsByTagName('head')[0];
                    js_files.forEach((js_file) => {
                      if (js_file.src && !document.querySelector(`script[src="${js_file.src}"]`)) {
                        const script = document.createElement('script');
                        script.src = js_file.src;
                        head.appendChild(script);
                      }
                    });
                  }

                  setTimeout(() => {
                    if (typeof Shopify !== 'undefined' && Shopify.PaymentButton) {
                      Shopify.PaymentButton.init();
                    }
                    if (typeof window.ProductModel !== 'undefined') {
                      window.ProductModel.loadShopifyXR();
                    }
                  }, 300);

                  if (typeof addIdToRecentlyViewed === 'function') {
                    addIdToRecentlyViewed(handle);
                  }

                  if (typeof dispatchCustomEvent === 'function') {
                    dispatchCustomEvent('quick-view:variant-changed', {
                      productHandle: handle,
                      color: color
                    });
                  }
                }
              })
              .catch((error) => {
                // console.error('Error loading product:', error);
                if (drawerContent) {
                  drawerContent.style.opacity = '1';
                  drawerContent.style.pointerEvents = 'auto';
                }
              });
          } else {
            window.location.href = '/products/' + handle;
          }
        }
      });
    });

    let resizeTimeout;
    const resizeHandler = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        currentIndex = 0;
        track.style.transform = 'translateX(0)';
        checkOverflow();
      }, 200);
    };

    window.addEventListener('resize', resizeHandler);

    const init = () => {
      setTimeout(() => {
        checkOverflow();
      }, 100);

      const images = Array.from(track.querySelectorAll('img'));

      if (images.length > 0) {
        let loadedCount = 0;
        const totalImages = images.length;

        images.forEach((img) => {
          if (img.complete) {
            loadedCount++;
            if (loadedCount === totalImages) {
              checkOverflow();
            }
          } else {
            img.addEventListener('load', () => {
              loadedCount++;
              if (loadedCount === totalImages) {
                checkOverflow();
              }
            });
          }
        });
      }

      setTimeout(() => {
        checkOverflow();
      }, 300);
    };

    init();
  });
}
