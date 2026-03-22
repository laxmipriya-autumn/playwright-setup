if (!customElements.get('variant-selects')) {

  /**
   *  @class
   *  @function VariantSelects
   */
  class VariantSelects extends HTMLElement {
    constructor() {
      super();
      this.sticky = this.dataset.sticky;
      this.updateUrl = this.dataset.updateUrl === 'true';
      this.isDisabledFeature = this.dataset.isDisabled;
      this.addEventListener('change', this.onVariantChange);
      this.other = Array.from(document.querySelectorAll('variant-selects')).filter((selector) => {
        return selector != this;
      });
      this.productWrapper = this.closest('.thb-product-detail');
      if (this.productWrapper) {
        this.productSlider = this.productWrapper.querySelector('.product-images') ? this.productWrapper.querySelector('.product-images') : this.productWrapper.querySelector('.product-quick-images');
        this.thumbnails = this.productWrapper.querySelector('.product-thumbnail-container');
        this.hideVariants = this.productSlider ? this.productSlider.dataset.hideVariants === 'true' : false;
      }
    }

    // Helper method to safely get variant strings
    getVariantString(key, fallback = '') {
      const strings = window.theme?.variantStrings;
      if (strings && strings[key]) {
        return strings[key];
      }
      // Fallback values
      const fallbacks = {
        soldOut: 'Sold out',
        unavailable: 'Unavailable',
        addToCart: 'Add to cart',
        preOrder: 'Pre-order'
      };
      return fallbacks[key] || fallback;
    }

    connectedCallback() {
      this.updateOptions();
      this.updateMasterId();
      this.setDisabled();
      this.bindUnavailableOptionClick();
      this.syncUnavailableSelectionState();
      this.setImageSet();

      if (!this.onExternalVariantChangeBound) {
        this.onExternalVariantChangeBound = this.onExternalVariantChange.bind(this);
      }
      document.addEventListener('product:variant-change', this.onExternalVariantChangeBound);

      // Initial sync from main selector if this is sticky
      if (this.sticky === 'true' || this.sticky === '1') {
        this.syncFromMainSelector();
      }
    }

    disconnectedCallback() {
      if (this.onExternalVariantChangeBound) {
        document.removeEventListener('product:variant-change', this.onExternalVariantChangeBound);
      }
    }

    // Sync sticky selector from main selector on initial load
    syncFromMainSelector() {
      const mainSelector = document.querySelector(`variant-selects[data-section="${this.dataset.section}"]:not([data-sticky="true"]):not([data-sticky="1"]), variant-radios[data-section="${this.dataset.section}"]:not([data-sticky="true"]):not([data-sticky="1"])`);

      if (mainSelector && mainSelector !== this && mainSelector.currentVariant) {
        const selectedOptions = typeof mainSelector.getSelectedOptionsByIndex === 'function'
          ? mainSelector.getSelectedOptionsByIndex()
          : null;
        this.syncFromVariant(mainSelector.currentVariant, selectedOptions);
      }
    }

    onExternalVariantChange(event) {
      const detail = event?.detail;
      if (!detail) {
        return;
      }

      if (`${detail.sectionId}` !== `${this.dataset.section}`) {
        return;
      }

      if (detail.sourceSelectorId && detail.sourceSelectorId === this.id) {
        return;
      }

      this.syncFromVariant(detail.variant, detail.selectedOptions || null);
    }

    onVariantChange() {
      this.updateOptions();
      this.updateMasterId();

      const strictVariant = this.getStrictSelectedVariant();
      if (strictVariant !== undefined) {
        this.currentVariant = strictVariant;
      }

      this.setDisabled();
      const checkedInput = this.querySelector('fieldset input:checked');
      const hasUnavailableSelection = this.isInputUnavailable(checkedInput);
      const shouldDisable = hasUnavailableSelection || !this.currentVariant || !this.currentVariant.available;
      const unavailableText = shouldDisable ? this.getVariantString('soldOut') : false;

      this.toggleAddButton(shouldDisable, unavailableText, false);
      this.toggleDynamicCheckout(!shouldDisable);
      this.updatePickupAvailability();
      this.removeErrorMessage();
      this.updateVariantText();

      if (!this.currentVariant) {
        this.toggleAddButton(true, this.getVariantString('soldOut'), true);
        this.setUnavailable();
      } else {
        this.updateMedia();
        if (this.updateUrl) {
          this.updateURL();
        }
        this.updateVariantInput();
        this.renderProductInfo();

        if (shouldDisable) {
          this.toggleAddButton(true, this.getVariantString('soldOut'), true);
        }
      }

      // Sync other variant selectors (including sticky)
      this.updateOther();

      // Dispatch custom event for external listeners
      if (typeof dispatchCustomEvent === 'function') {
        dispatchCustomEvent('product:variant-change', {
          variant: this.currentVariant,
          sectionId: this.dataset.section,
          selectedOptions: this.getSelectedOptionsByIndex(),
          sourceSelectorId: this.id || null
        });
      }
    }

    updateOptions() {
      this.fieldsets = Array.from(this.querySelectorAll('fieldset'));
      this.options = [];
      this.option_keys = [];
      this.fieldsets.forEach((fieldset) => {
        const select = fieldset.querySelector('select');
        if (select) {
          this.options.push(select.value);
          this.option_keys.push(select.name);
          return;
        }

        const inputs = fieldset.querySelectorAll('input');
        if (!inputs.length) {
          return;
        }

        const checkedInput = fieldset.querySelector('input:checked');
        if (!checkedInput) {
          return;
        }

        this.options.push(checkedInput.value);
        this.option_keys.push(checkedInput.name);
      });
      this.dataset.options = this.options;
    }

    updateVariantText() {
      const fieldsets = Array.from(this.querySelectorAll('fieldset'));
      fieldsets.forEach((item) => {
        let label = item.querySelector('.form__label__value');
        if (label) {
          let selectedValue = null;
          const select = item.querySelector('select');

          if (select) {
            selectedValue = select.value;
          } else {
            const checkedInput = item.querySelector('input:checked');
            if (checkedInput) {
              selectedValue = checkedInput.value;
            }
          }

          if (selectedValue !== null && selectedValue !== undefined && selectedValue !== '') {
            label.textContent = selectedValue;
          }
        }
      });
    }

    isInputUnavailable(input, explicitLabel = null) {
      if (!input) return false;

      const label = explicitLabel || (input.id ? this.querySelector(`label[for="${input.id}"]`) : null);

      return Boolean(
        input.disabled ||
        input.classList.contains('is-disabled') ||
        input.classList.contains('disabled') ||
        label?.classList.contains('is-disabled') ||
        label?.classList.contains('disabled') ||
        label?.classList.contains('soldout') ||
        label?.classList.contains('unavailable') ||
        label?.classList.contains('out-of-stock')
      );
    }

    bindUnavailableOptionClick() {
      if (this.unavailableOptionClickBound) return;
      this.unavailableOptionClickBound = true;

      this.addEventListener('click', (event) => {
        const label = event.target.closest('label[for]');
        if (!label || !this.contains(label)) {
          return;
        }

        const inputId = label.getAttribute('for');
        if (!inputId) {
          return;
        }

        const input = document.getElementById(inputId);
        if (!input || !this.contains(input)) {
          return;
        }

        // Force radio selection from label click so unavailable sizes can still be selected.
        if (input.type === 'radio') {
          event.preventDefault();
          const shouldDispatchChange = !input.checked;
          input.checked = true;

          const inputFieldset = input.closest('fieldset');
          const valueLabel = inputFieldset ? inputFieldset.querySelector('.form__label__value') : null;
          if (valueLabel) {
            valueLabel.textContent = input.value;
          }

          if (shouldDispatchChange) {
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        setTimeout(() => {
          if (this.isInputUnavailable(input, label)) {
            this.syncUnavailableSelectionState();
          }
        }, 0);
      });
    }

    syncUnavailableSelectionState() {
      const checkedInput = this.querySelector('fieldset input:checked');
      const shouldDisable = this.isInputUnavailable(checkedInput) || !this.currentVariant || !this.currentVariant.available;
      if (!shouldDisable) {
        return;
      }

      this.toggleAddButton(true, this.getVariantString('soldOut'), true);
      this.setUnavailable();
    }

    getStrictSelectedVariant() {
      const selectedOptions = {};
      let hasSelection = false;

      this.fieldsets.forEach((fieldset) => {
        const dataIndex = fieldset.dataset.index;
        if (!dataIndex) {
          return;
        }

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
          hasSelection = true;
        }
      });

      if (!hasSelection) {
        return undefined;
      }

      return this.getVariantData().find((variant) => {
        return Object.entries(selectedOptions).every(([index, value]) => {
          const variantValue = variant[index];
          const normalizedVariantValue = typeof variantValue === 'string' ? variantValue.trim() : variantValue;
          return normalizedVariantValue === value;
        });
      });
    }

    getSelectedOptionsByIndex() {
      const selectedOptions = {};

      this.fieldsets.forEach((fieldset) => {
        const dataIndex = fieldset.dataset.index;
        if (!dataIndex) {
          return;
        }

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
          selectedOptions[dataIndex] = selectedValue;
        }
      });

      return selectedOptions;
    }

    syncFromVariant(sourceVariant, selectedOptions = null) {
      const hasSelectedOptions = selectedOptions && Object.keys(selectedOptions).length > 0;
      if (!sourceVariant && !hasSelectedOptions) {
        return;
      }

      const fieldsets = Array.from(this.querySelectorAll('fieldset[data-index]'));
      fieldsets.forEach((fieldset) => {
        const dataIndex = fieldset.dataset.index;
        if (!dataIndex) return;

        let selectedValue = selectedOptions ? selectedOptions[dataIndex] : null;
        if ((selectedValue === null || selectedValue === undefined || selectedValue === '') && sourceVariant) {
          selectedValue = sourceVariant[dataIndex];
          if ((selectedValue === null || selectedValue === undefined) && Array.isArray(sourceVariant.options)) {
            const optionNumber = parseInt(dataIndex.replace('option', ''), 10) - 1;
            if (!Number.isNaN(optionNumber) && optionNumber >= 0) {
              selectedValue = sourceVariant.options[optionNumber];
            }
          }
        }

        if (selectedValue === null || selectedValue === undefined || selectedValue === '') {
          return;
        }

        const normalizedSelectedValue = typeof selectedValue === 'string' ? selectedValue.trim() : String(selectedValue).trim();
        if (normalizedSelectedValue === '') {
          return;
        }

        const select = fieldset.querySelector('select');
        if (select) {
          const matchingOption = Array.from(select.options).find((option) => String(option.value).trim() === normalizedSelectedValue);
          if (matchingOption) {
            select.value = matchingOption.value;
          }
          return;
        }

        const targetInput = Array.from(fieldset.querySelectorAll('input')).find((input) => {
          const inputValue = typeof input.value === 'string' ? input.value.trim() : String(input.value);
          return inputValue === normalizedSelectedValue;
        });

        if (targetInput) {
          targetInput.checked = true;
        }
      });

      if (sourceVariant) {
        this.currentVariant = sourceVariant;
      }
      this.updateOptions();
      this.updateMasterId();

      if (typeof this.getStrictSelectedVariant === 'function') {
        const strictVariant = this.getStrictSelectedVariant();
        if (strictVariant !== undefined) {
          this.currentVariant = strictVariant;
        }
      }
      if (!this.currentVariant && sourceVariant) {
        this.currentVariant = sourceVariant;
      }

      this.updateVariantText();
      this.setDisabled();

      const checkedInput = this.querySelector('fieldset input:checked');
      const hasUnavailableSelection = this.isInputUnavailable(checkedInput);
      const shouldDisable = hasUnavailableSelection || !this.currentVariant || !this.currentVariant.available;
      const unavailableText = shouldDisable ? this.getVariantString('soldOut') : false;

      this.toggleAddButton(shouldDisable, unavailableText, false);
      this.toggleDynamicCheckout(!shouldDisable);

      if (!shouldDisable) {
        this.updateVariantInput();
        if (this.updateUrl) {
          this.updateURL();
          this.updateShareUrl();
        }
      } else {
        this.syncUnavailableSelectionState();
      }
    }

    updateMasterId() {
      const variantData = this.getVariantData();

      // Get the current variant or first available variant as a base
      const baseVariant = this.currentVariant || variantData.find(v => v.available) || variantData[0];

      // Build the complete options array
      // Start with the base variant's options
      const completeOptions = baseVariant ? [...baseVariant.options] : [];

      // Update only the options that are in fieldsets (user-selectable on this page)
      this.fieldsets.forEach((fieldset, i) => {
        const dataIndex = fieldset.dataset.index; // e.g., "option1", "option2"
        if (dataIndex) {
          const optionNumber = parseInt(dataIndex.replace('option', '')) - 1; // Convert to 0-based index

          let selectedValue = null;
          if (fieldset.querySelector('select')) {
            selectedValue = fieldset.querySelector('select').value;
          } else if (fieldset.querySelectorAll('input').length) {
            const checkedInput = fieldset.querySelector('input:checked');
            if (checkedInput) {
              selectedValue = checkedInput.value;
            }
          }

          if (selectedValue !== null && optionNumber >= 0) {
            completeOptions[optionNumber] = selectedValue;
          }
        }
      });

      // Normalize for matching
      const normalizedOptions = completeOptions.map(opt => opt ? opt.trim() : opt);

      // Find matching variant
      this.currentVariant = variantData.find((variant) => {
        const matches = variant.options.map((option, index) => {
          const variantOption = option ? option.trim() : option;
          const selectedOption = normalizedOptions[index];
          return variantOption === selectedOption;
        });

        return !matches.includes(false) && matches.length === normalizedOptions.length;
      });
    }

    updateOther() {
      const selectedOptions = this.getSelectedOptionsByIndex();
      const sourceVariant = this.currentVariant || this.getStrictSelectedVariant();
      if (!sourceVariant && !Object.keys(selectedOptions).length) {
        return;
      }

      const sectionId = this.dataset.section;

      // Search globally to find ALL variant selectors with the same section ID
      // This includes both main and sticky selectors
      const selector = `variant-selects[data-section="${sectionId}"], variant-radios[data-section="${sectionId}"]`;
      const allSelectors = Array.from(document.querySelectorAll(selector))
        .filter((targetSelector) => targetSelector !== this);

      allSelectors.forEach((targetSelector) => {
        if (typeof targetSelector.syncFromVariant === 'function') {
          targetSelector.syncFromVariant(sourceVariant, selectedOptions);
        }
      });
    }

    // Explicit method to sync sticky selector
    syncStickySelector() {
      const stickySelector = document.querySelector(`variant-selects[data-section="${this.dataset.section}"][data-sticky="true"], variant-selects[data-section="${this.dataset.section}"][data-sticky="1"], variant-radios[data-section="${this.dataset.section}"][data-sticky="true"], variant-radios[data-section="${this.dataset.section}"][data-sticky="1"]`);

      if (stickySelector && stickySelector !== this) {
        const selectedOptions = this.getSelectedOptionsByIndex();
        const sourceVariant = this.currentVariant || this.getStrictSelectedVariant();

        if (typeof stickySelector.syncFromVariant === 'function') {
          stickySelector.syncFromVariant(sourceVariant, selectedOptions);
        }
      }
    }

    // Explicit method to sync main selector (from sticky)
    syncMainSelector() {
      const mainSelector = document.querySelector(`variant-selects[data-section="${this.dataset.section}"]:not([data-sticky="true"]):not([data-sticky="1"]), variant-radios[data-section="${this.dataset.section}"]:not([data-sticky="true"]):not([data-sticky="1"])`);

      if (mainSelector && mainSelector !== this) {
        const selectedOptions = this.getSelectedOptionsByIndex();
        const sourceVariant = this.currentVariant || this.getStrictSelectedVariant();

        if (typeof mainSelector.syncFromVariant === 'function') {
          mainSelector.syncFromVariant(sourceVariant, selectedOptions);
        }
      }
    }

    updateMedia() {
      if (!this.currentVariant) return;
      if (!this.currentVariant.featured_media) return;
      if (!this.productSlider) return;
      let mediaId = `#Slide-${this.dataset.section}-${this.currentVariant.featured_media.id}`;
      let activeMedia = this.productSlider.querySelector(mediaId);

      if (this.thumbnails) {
        this.setActiveMediaSlider(mediaId, `#Thumb-${this.dataset.section}-${this.currentVariant.featured_media.id}`, this.productSlider);
      } else {
        this.setActiveMedia(activeMedia);
      }
    }

    setActiveMedia(activeMedia) {
      if (!activeMedia) return;

      this.productSlider.querySelectorAll('[data-media-id]').forEach((element) => {
        element.classList.remove('is-active');
      });

      this.setImageSetMedia();

      activeMedia.classList.add('is-active');

      activeMedia.parentElement.prepend(activeMedia);

      if (!this.sticky) {
        window.setTimeout(() => {
          if (window.innerWidth > 1068) {
            let header_h = activeMedia.parentElement.offsetTop - parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')),
              scroll_obj = {
                left: 0,
                behavior: 'instant'
              };

            if (header_h > 0) {
              scroll_obj.top = header_h;
            }
            window.scrollTo(scroll_obj);
          }
          activeMedia.parentElement.scrollTo({
            left: 0,
            behavior: 'instant'
          });
        });
      }
    }

    setActiveMediaSlider(mediaId, thumbId, productSlider) {
      let flkty = typeof Flickity !== 'undefined' ? Flickity.data(productSlider) : null,
        activeMedia = productSlider.querySelector(mediaId);

      if (flkty && this.hideVariants) {
        if (productSlider.querySelector('.product-images__slide.is-initial-selected')) {
          productSlider.querySelector('.product-images__slide.is-initial-selected').classList.remove('is-initial-selected');
        }
        [].forEach.call(productSlider.querySelectorAll('.product-images__slide-item--variant'), function (el) {
          el.classList.remove('is-active');
        });
        if (this.thumbnails) {
          if (this.thumbnails.querySelector('.product-thumbnail.is-initial-selected')) {
            this.thumbnails.querySelector('.product-thumbnail.is-initial-selected').classList.remove('is-initial-selected');
          }
          [].forEach.call(this.thumbnails.querySelectorAll('.product-images__slide-item--variant'), function (el) {
            el.classList.remove('is-active');
          });
        }

        if (activeMedia) {
          activeMedia.classList.add('is-active');
          activeMedia.classList.add('is-initial-selected');
        }

        this.setImageSetMedia();

        if (this.thumbnails) {
          let activeThumb = this.thumbnails.querySelector(thumbId);

          if (activeThumb) {
            activeThumb.classList.add('is-active');
            activeThumb.classList.add('is-initial-selected');
          }
        }

        if (productSlider.reInit) {
          productSlider.reInit(this.imageSetIndex);
        }
        if (productSlider.selectCell) {
          productSlider.selectCell(mediaId);
        }

      } else if (flkty) {
        if (productSlider.selectCell) {
          productSlider.selectCell(mediaId);
        }
      }
    }

    updateURL() {
      if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
      window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
    }

    updateShareUrl() {
      const shareButton = document.getElementById(`Share-${this.dataset.section}`);
      if (!shareButton || !shareButton.updateUrl) return;
      shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
    }

    updateVariantInput() {
      if (!this.currentVariant || !this.currentVariant.id) return;

      const selector = `#product-form-${this.dataset.section}, #product-form-installment`;
      const section = this.closest('section');
      const productForms = section ? section.querySelectorAll(selector) : document.querySelectorAll(selector);

      // Also search globally for sticky form
      const globalForms = document.querySelectorAll(selector);
      const allForms = new Set([...productForms, ...globalForms]);

      allForms.forEach((productForm) => {
        const input = productForm.querySelector('input[name="id"]');
        if (!input) return;
        input.disabled = false;
        input.value = this.currentVariant.id;
        input.dispatchEvent(new Event('input', {
          bubbles: true
        }));
        input.dispatchEvent(new Event('change', {
          bubbles: true
        }));
      });
    }

    updatePickupAvailability() {
      const pickUpAvailability = document.querySelector('.pickup-availability-wrapper');

      if (!pickUpAvailability) return;

      if (this.currentVariant && this.currentVariant.available) {
        if (typeof pickUpAvailability.fetchAvailability === 'function') {
          pickUpAvailability.fetchAvailability(this.currentVariant.id);
        }
      } else {
        pickUpAvailability.removeAttribute('available');
        pickUpAvailability.innerHTML = '';
      }
    }

    removeErrorMessage() {
      const section = this.closest('section');
      if (!section) return;

      const productForm = section.querySelector('product-form');
      if (productForm && typeof productForm.handleErrorMessage === 'function') {
        productForm.handleErrorMessage();
      }
    }

    getSectionsToRender() {
      return [`price-${this.dataset.section}`, `price-${this.dataset.section}--sticky`, `product-image-${this.dataset.section}--sticky`, `inventory-${this.dataset.section}`, `sku-${this.dataset.section}`, `quantity-${this.dataset.section}`];
    }

    renderProductInfo() {
      if (!this.currentVariant) return;

      let sections = this.getSectionsToRender();

      fetch(`${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.section}`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          sections.forEach((id) => {
            const destination = document.getElementById(id);
            const source = html.getElementById(id);

            if (source && destination) destination.innerHTML = source.innerHTML;

            const price = document.getElementById(id);
            const price_fixed = document.getElementById(id + '--sticky');

            if (price) price.classList.remove('visibility-hidden');
            if (price_fixed) price_fixed.classList.remove('visibility-hidden');

          });
          this.toggleAddButton(!this.currentVariant.available, this.getVariantString('soldOut'));

        })
        .catch(() => {
          const shouldDisable = !this.currentVariant || !this.currentVariant.available;
          const unavailableText = shouldDisable ? this.getVariantString('soldOut') : false;
          this.toggleAddButton(shouldDisable, unavailableText);
        });
    }

    toggleAddButton(disable = true, text = false, modifyClass = true) {
      const productForm = document.getElementById(`product-form-${this.dataset.section}`);
      if (!productForm) return;

      const productFormWrapper = productForm.closest('.product-form');
      const productTemplate = productFormWrapper ? productFormWrapper.getAttribute('template') : null;
      const submitButtons = document.querySelectorAll('.single-add-to-cart-button');

      if (!submitButtons || !submitButtons.length) return;

      submitButtons.forEach((submitButton) => {
        const submitButtonText = submitButton.querySelector('.single-add-to-cart-button--text');

        if (!submitButtonText) return;

        if (disable) {
          submitButton.setAttribute('disabled', 'disabled');
          if (text) submitButtonText.textContent = text;
        } else {
          submitButton.removeAttribute('disabled');
          submitButton.classList.remove('loading');
          submitButton.classList.remove('sold-out');

          if (productTemplate && productTemplate.includes('pre-order')) {
            submitButtonText.textContent = this.getVariantString('preOrder');
          } else {
            submitButtonText.textContent = this.getVariantString('addToCart');
          }
        }
      });

      if (!modifyClass) return;
    }

    toggleDynamicCheckout(show = true) {
      const productForm = document.getElementById(`product-form-${this.dataset.section}`);
      if (!productForm) return;

      const dynamicCheckout = productForm.querySelector('.shopify-payment-button');
      if (!dynamicCheckout) return;

      dynamicCheckout.style.display = show ? '' : 'none';
      dynamicCheckout.setAttribute('aria-hidden', show ? 'false' : 'true');
    }

    setUnavailable() {
      const submitButtons = document.querySelectorAll('.single-add-to-cart-button');

      submitButtons.forEach((submitButton) => {
        const submitButtonText = submitButton.querySelector('.single-add-to-cart-button--text');
        if (!submitButton || !submitButtonText) return;
        submitButton.setAttribute('disabled', 'disabled');
        submitButtonText.textContent = this.getVariantString('soldOut') || this.getVariantString('unavailable');
        submitButton.classList.add('sold-out');
      });
      this.toggleDynamicCheckout(false);
    }

    setDisabled() {
      if (this.isDisabledFeature != 'true') {
        return;
      }
      const variant_data = this.getVariantData();

      if (variant_data) {
        let selected_options = false;
        if (this.currentVariant) {
          selected_options = this.currentVariant.options.map((value, index) => {
            return {
              value,
              index: `option${index + 1}`
            };
          });
        } else {
          let found_option = variant_data.find(option => {
            return option.option1 === this.options[0];
          });
          if (found_option) {
            selected_options = [
              {
                "value": this.options[0],
                "index": "option1"
              },
              {
                "value": found_option.option2,
                "index": "option2"
              }
            ];
          } else {
            return;
          }
        }

        const available_options = this.createAvailableOptionsTree(variant_data, selected_options);

        this.fieldsets.forEach((fieldset, i) => {
          const fieldset_options = Object.values(available_options)[i];

          if (fieldset_options) {
            if (fieldset.querySelector('select')) {
              fieldset_options.forEach((option, option_i) => {
                const optionEl = fieldset.querySelector('option[value=' + JSON.stringify(option.value) + ']');
                if (optionEl) {
                  optionEl.disabled = option.isUnavailable;
                }
              });
            } else if (fieldset.querySelectorAll('input').length) {
              fieldset.querySelectorAll('input').forEach((input, input_i) => {
                if (fieldset_options[input_i]) {
                  input.classList.toggle('is-disabled', fieldset_options[input_i].isUnavailable);
                }
              });
            }
          }
        });
      }
      return true;
    }

    getImageSetName(variant_name) {
      return variant_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '').replace(/^-/, '');
    }

    setImageSet() {
      if (!this.productSlider) return;

      let dataSetEl = this.productSlider.querySelector('[data-set-name]');
      if (dataSetEl) {
        this.imageSetName = dataSetEl.dataset.setName;
        const imageSetInput = this.querySelector('.product-form__input[data-handle="' + this.imageSetName + '"]');
        if (imageSetInput) {
          this.imageSetIndex = imageSetInput.dataset.index;
          this.dataset.imageSetIndex = this.imageSetIndex;
          this.setImageSetMedia();
        }
      }
    }

    setImageSetMedia() {
      if (!this.imageSetIndex || !this.currentVariant) {
        return;
      }
      let setValue = this.getImageSetName(this.currentVariant[this.imageSetIndex]);
      let group = this.imageSetName + '_' + setValue;
      let selected_set_images = this.productSlider.querySelectorAll(`.product-images__slide[data-set-name="${this.imageSetName}"]`),
        selected_set_thumbs = this.productWrapper ? this.productWrapper.querySelectorAll(`.product-thumbnail[data-set-name="${this.imageSetName}"]`) : [];

      if (this.hideVariants) {
        if (this.thumbnails) {
          // Product images
          if (this.productWrapper) {
            this.productWrapper.querySelectorAll('.product-images__slide').forEach(thumb => {
              if (thumb.dataset.group && thumb.dataset.group !== group) {
                thumb.classList.remove('is-active');
              }
            });
          }
          selected_set_images.forEach(thumb => {
            thumb.classList.toggle('is-active', thumb.dataset.group === group);
          });

          // Product thumbnails
          if (this.productWrapper) {
            this.productWrapper.querySelectorAll('.product-thumbnail').forEach(thumb => {
              if (thumb.dataset.group && thumb.dataset.group !== group) {
                thumb.classList.remove('is-active');
              }
            });
          }
          selected_set_thumbs.forEach(thumb => {
            thumb.classList.toggle('is-active', thumb.dataset.group === group);
          });
        } else {
          // Product images
          if (this.productWrapper) {
            this.productWrapper.querySelectorAll('.product-images__slide').forEach(thumb => {
              if (thumb.dataset.group && thumb.dataset.group !== group) {
                thumb.classList.remove('is-active');
              }
            });
          }
          selected_set_images.forEach(thumb => {
            if (thumb.dataset.group === group) {
              thumb.classList.add('is-active');
            }
          });
        }

      } else {

        if (!this.thumbnails) {
          let set_images = Array.from(selected_set_images).filter(function (element) {
            return element.dataset.group === group;
          });
          set_images.forEach(thumb => {
            thumb.parentElement.prepend(thumb);
          });
        }

      }
      if (!this.thumbnails && this.productSlider.querySelector('product-slider')) {
        setTimeout(() => {
          const slider = this.productSlider.querySelector('product-slider');
          if (slider && typeof slider.onPaginationResize === 'function') {
            slider.onPaginationResize();
          }
        }, 100);
      }
    }

    createAvailableOptionsTree(variants, currentlySelectedValues) {
      // Reduce variant array into option availability tree
      return variants.reduce((options, variant) => {

        // Check each option group (e.g. option1, option2, option3) of the variant
        Object.keys(options).forEach(index => {

          if (variant[index] === null) return;

          let entry = options[index].find(option => option.value === variant[index]);

          if (typeof entry === 'undefined') {
            // If option has yet to be added to the options tree, add it
            entry = { value: variant[index], isUnavailable: true };
            options[index].push(entry);
          }

          const currentOption1 = currentlySelectedValues.find(({ value, index }) => index === 'option1');
          const currentOption2 = currentlySelectedValues.find(({ value, index }) => index === 'option2');

          switch (index) {
            case 'option1':
              // Option1 inputs should always remain enabled based on all available variants
              entry.isUnavailable = entry.isUnavailable && variant.available ? false : entry.isUnavailable;
              break;
            case 'option2':
              // Option2 inputs should remain enabled based on available variants that match first option group
              if (currentOption1 && variant.option1 === currentOption1.value) {
                entry.isUnavailable = entry.isUnavailable && variant.available ? false : entry.isUnavailable;
              }
              break;
            case 'option3':
              // Option 3 inputs should remain enabled based on available variants that match first and second option group
              if (currentOption1 && variant.option1 === currentOption1.value && currentOption2 && variant.option2 === currentOption2.value) {
                entry.isUnavailable = entry.isUnavailable && variant.available ? false : entry.isUnavailable;
              }
          }
        });

        return options;
      }, { option1: [], option2: [], option3: [] });
    }

    getVariantData() {
      this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
      return this.variantData;
    }
  }
  customElements.define('variant-selects', VariantSelects);

  /**
   *  @class
   *  @function VariantRadios
   */
  class VariantRadios extends VariantSelects {
    constructor() {
      super();
    }

    updateOptions() {
      const fieldsets = Array.from(this.querySelectorAll('fieldset'));
      this.options = fieldsets.map((fieldset) => {
        const checkedRadio = Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked);
        return checkedRadio ? checkedRadio.value : '';
      });
    }
  }

  customElements.define('variant-radios', VariantRadios);
}

if (!customElements.get('product-slider')) {
  /**
   *  @class
   *  @function ProductSlider
   */
  class ProductSlider extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.pagination = this.parentElement.querySelector('.product-images-buttons');
      this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
      this.video_containers = this.querySelectorAll('.product-single__media-external-video--play');

      // Start Gallery
      let observer = new MutationObserver(() => {
        this.setupProductGallery();
      });

      observer.observe(this, {
        attributes: true,
        attributeFilter: ['class'],
        childList: true,
        characterData: false
      });

      this.setupProductGallery();

      // Start Pagination
      if (this.pagination) {
        this.setupPagination();
        this.resizeObserver = new ResizeObserver(entries => this.onPaginationResize());
        this.resizeObserver.observe(this);
        this.addEventListener('scroll', this.updatePagination.bind(this));
      }
    }

    setupProductGallery() {
      if (!this.querySelectorAll('.product-single__media-zoom').length) {
        return;
      }

      this.setEventListeners();
    }

    buildItems(activeImages) {
      let images = activeImages.map((item) => {
        let activelink = item.querySelector('.product-single__media-zoom');
        if (!activelink) return null;
        return {
          src: activelink.getAttribute('href'),
          msrc: activelink.dataset.msrc,
          w: activelink.dataset.w,
          h: activelink.dataset.h,
          title: activelink.getAttribute('title')
        };
      }).filter(item => item !== null);
      return images;
    }

    setEventListeners() {
      let activeImages = Array.from(this.querySelectorAll('.product-images__slide--image')).filter(element => element.clientWidth > 0),
        items = this.buildItems(activeImages),
        captionEl = this.dataset.captions,
        pswpElement = document.querySelectorAll('.pswp')[0],
        options = {
          maxSpreadZoom: 2,
          loop: false,
          allowPanToNext: false,
          closeOnScroll: false,
          showHideOpacity: false,
          arrowKeys: true,
          history: false,
          captionEl: captionEl,
          fullscreenEl: false,
          zoomEl: false,
          shareEl: false,
          counterEl: true,
          arrowEl: true,
          preloaderEl: true
        };

      let openPswp = function (e, link, options, pswpElement, items) {
        let parent = link.closest('.product-images__slide');
        let i = activeImages.indexOf(parent);
        options.index = parseInt(i, 10);
        options.getThumbBoundsFn = () => {
          const thumbnail = link.closest('.product-single__media'),
            pageYScroll = window.scrollY || document.documentElement.scrollTop,
            rect = thumbnail.getBoundingClientRect();
          return {
            x: rect.left,
            y: rect.top + pageYScroll,
            w: rect.width
          };
        };
        if (typeof PhotoSwipe !== 'undefined') {
          let pswp = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);

          pswp.listen('firstUpdate', () => {
            pswp.listen('parseVerticalMargin', function (item) {
              item.vGap = {
                top: 50,
                bottom: 50
              };
            });
          });
          pswp.init();
        }
        e.preventDefault();
      };
      this.querySelectorAll('.product-single__media-zoom').forEach(function (link) {
        let thumbnail = link.closest('.product-single__media');
        if (!thumbnail) return;
        let clone = link.cloneNode(true);
        thumbnail.append(clone);
        link.remove();
        clone.addEventListener('click', (e) => openPswp(e, clone, options, pswpElement, items));
      });

      this.video_containers.forEach((container) => {
        const button = container.querySelector('button');
        if (button) {
          button.addEventListener('click', function () {
            container.setAttribute('hidden', '');
          });
        }
      });
    }

    setupPagination() {
      this.sliderItemsToShow = Array.from(this.sliderItems).filter(element => element.clientWidth > 0);
      if (this.sliderItemsToShow.length < 2) return;

      this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;

      this.currentPageElement = this.pagination.querySelector('.slider-counter--current');
      this.pageTotalElement = this.pagination.querySelector('.slider-counter--total');

      this.prevButton = this.pagination.querySelector('button[name="previous"]');
      this.nextButton = this.pagination.querySelector('button[name="next"]');

      if (this.prevButton) {
        this.prevButton.addEventListener('click', this.onPaginationButtonClick.bind(this));
      }
      if (this.nextButton) {
        this.nextButton.addEventListener('click', this.onPaginationButtonClick.bind(this));
      }

      this.updatePagination();
    }

    onPaginationResize() {
      this.sliderItemsToShow = Array.from(this.sliderItems).filter(element => element.clientWidth > 0);

      if (this.sliderItemsToShow.length < 2) return;

      this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
      this.updatePagination();
    }

    onPaginationButtonClick(event) {
      event.preventDefault();
      this.slideScrollPosition = event.currentTarget.name === 'next' ? this.scrollLeft + (1 * this.sliderItemOffset) : this.scrollLeft - (1 * this.sliderItemOffset);
      this.scrollTo({
        left: this.slideScrollPosition
      });
    }

    updatePagination() {
      if (!this.nextButton) return;

      const previousPage = this.currentPage;
      this.currentPage = Math.round(this.scrollLeft / this.sliderItemOffset) + 1;

      if (this.currentPageElement) {
        this.currentPageElement.textContent = this.currentPage;
      }
      if (this.pageTotalElement) {
        this.pageTotalElement.textContent = this.sliderItemsToShow.length;
      }

      if (this.currentPage != previousPage) {
        this.dispatchEvent(new CustomEvent('slideChanged', {
          detail: {
            currentPage: this.currentPage,
            currentElement: this.sliderItemsToShow[this.currentPage - 1]
          }
        }));
      }

      if (this.sliderItemsToShow[0] && this.isSlideVisible(this.sliderItemsToShow[0]) && this.scrollLeft === 0) {
        this.prevButton.setAttribute('disabled', 'disabled');
      } else {
        this.prevButton.removeAttribute('disabled');
      }

      if (this.sliderItemsToShow[this.sliderItemsToShow.length - 1] && this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
        this.nextButton.setAttribute('disabled', 'disabled');
      } else {
        this.nextButton.removeAttribute('disabled');
      }
    }

    isSlideVisible(element, offset = 0) {
      if (!element) return false;
      const lastVisibleSlide = this.clientWidth + this.scrollLeft - offset;
      return (element.offsetLeft + element.clientWidth) <= lastVisibleSlide && element.offsetLeft >= this.scrollLeft;
    }
  }
  customElements.define('product-slider', ProductSlider);
}

/**
 *  @class
 *  @function ProductForm
 */
if (!customElements.get('product-form')) {
  customElements.define('product-form', class ProductForm extends HTMLElement {
    constructor() {
      super();
    }

    getVariantSelectors() {
      const selector = `variant-selects[data-section="${this.dataset.section}"], variant-radios[data-section="${this.dataset.section}"]`;
      const section = this.closest('section');

      if (section) {
        const scopedSelectors = Array.from(section.querySelectorAll(selector));
        if (scopedSelectors.length) {
          return scopedSelectors;
        }
      }

      // Search globally to include sticky variant selectors
      return Array.from(document.querySelectorAll(selector));
    }

    getSelectedVariant() {
      const selectors = this.getVariantSelectors();
      if (!selectors.length) {
        return null;
      }

      for (const selector of selectors) {
        if (typeof selector.updateOptions === 'function') {
          selector.updateOptions();
        }
        if (typeof selector.updateMasterId === 'function') {
          selector.updateMasterId();
        }
      }

      for (const selector of selectors) {
        if (selector.currentVariant && selector.currentVariant.id) {
          return selector.currentVariant;
        }
      }

      return null;
    }

    syncVariantIdInputs(variantId) {
      if (!variantId) return;

      const selector = `#product-form-${this.dataset.section}, #product-form-installment`;
      const section = this.closest('section');
      const productForms = section ? section.querySelectorAll(selector) : document.querySelectorAll(selector);

      // Also search globally for sticky forms
      const globalForms = document.querySelectorAll(selector);
      const allForms = new Set([...productForms, ...globalForms]);

      allForms.forEach((productForm) => {
        const input = productForm.querySelector('input[name="id"]');
        if (!input) return;
        input.disabled = false;
        input.value = variantId;
        input.dispatchEvent(new Event('input', {
          bubbles: true
        }));
        input.dispatchEvent(new Event('change', {
          bubbles: true
        }));
      });
    }

    syncSelectedVariantToInputs(variant = null) {
      const selectedVariant = variant || this.lastKnownVariant || this.getSelectedVariant();
      if (selectedVariant && selectedVariant.id) {
        this.lastKnownVariant = selectedVariant;
        this.syncVariantIdInputs(selectedVariant.id);
      }
      return selectedVariant;
    }

    onProductVariantChange(event) {
      const detail = event?.detail;
      if (!detail) return;
      if (`${detail.sectionId}` !== `${this.dataset.section}`) return;
      this.lastKnownVariant = detail.variant || null;
      this.syncSelectedVariantToInputs(detail.variant);
    }

    bindDynamicCheckoutSync() {
      if (!this.form || this.dynamicCheckoutSyncHandler) return;

      this.dynamicCheckoutSyncHandler = (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (!target.closest('.shopify-payment-button')) return;
        this.syncSelectedVariantToInputs(this.lastKnownVariant || null);
      };

      this.form.addEventListener('pointerdown', this.dynamicCheckoutSyncHandler, true);
      this.form.addEventListener('click', this.dynamicCheckoutSyncHandler, true);
      this.form.addEventListener('touchstart', this.dynamicCheckoutSyncHandler, true);
    }

    unbindDynamicCheckoutSync() {
      if (!this.form || !this.dynamicCheckoutSyncHandler) return;
      this.form.removeEventListener('pointerdown', this.dynamicCheckoutSyncHandler, true);
      this.form.removeEventListener('click', this.dynamicCheckoutSyncHandler, true);
      this.form.removeEventListener('touchstart', this.dynamicCheckoutSyncHandler, true);
      this.dynamicCheckoutSyncHandler = null;
    }

    connectedCallback() {
      this.sticky = this.dataset.sticky;
      this.form = document.getElementById(`product-form-${this.dataset.section}`);
      if (!this.form) return;

      const variantIdInput = this.form.querySelector('[name=id]');
      if (variantIdInput) {
        variantIdInput.disabled = false;
      }
      if (!this.sticky) {
        if (!this.onSubmitHandlerBound) {
          this.onSubmitHandlerBound = this.onSubmitHandler.bind(this);
        }
        this.form.addEventListener('submit', this.onSubmitHandlerBound);

        if (!this.onProductVariantChangeBound) {
          this.onProductVariantChangeBound = this.onProductVariantChange.bind(this);
        }
        document.addEventListener('product:variant-change', this.onProductVariantChangeBound);

        this.bindDynamicCheckoutSync();
        this.syncSelectedVariantToInputs();
      }
      this.cartNotification = document.querySelector('cart-notification');
      this.body = document.body;

      this.hideErrors = this.dataset.hideErrors === 'true';
    }

    disconnectedCallback() {
      if (!this.sticky && this.form && this.onSubmitHandlerBound) {
        this.form.removeEventListener('submit', this.onSubmitHandlerBound);
      }
      if (!this.sticky && this.onProductVariantChangeBound) {
        document.removeEventListener('product:variant-change', this.onProductVariantChangeBound);
      }
      this.unbindDynamicCheckoutSync();
    }

    onSubmitHandler(evt) {
      evt.preventDefault();

      const variantSelectors = this.getVariantSelectors();
      const selectedVariant = this.getSelectedVariant();

      if (variantSelectors.length && (!selectedVariant || !selectedVariant.available)) {
        this.handleErrorMessage(window.theme?.variantStrings?.unavailable || 'This combination is unavailable.');
        return;
      }

      if (selectedVariant && selectedVariant.id) {
        this.syncVariantIdInputs(selectedVariant.id);
      }

      if (!this.form.reportValidity()) {
        return;
      }
      const submitButtons = document.querySelectorAll('.single-add-to-cart-button');

      submitButtons.forEach((submitButton) => {
        if (submitButton.classList.contains('loading')) return;
        submitButton.setAttribute('aria-disabled', true);
        submitButton.classList.add('loading');
      });

      this.handleErrorMessage();

      const config = {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/javascript'
        }
      };
      let formData = new FormData(this.form);
      if (selectedVariant && selectedVariant.id) {
        formData.set('id', selectedVariant.id);
      }

      formData.append('sections', this.getSectionsToRender().map((section) => section.section));
      formData.append('sections_url', window.location.pathname);
      config.body = formData;

      fetch(`${window.theme?.routes?.cart_add_url || '/cart/add'}`, config)
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            if (typeof dispatchCustomEvent === 'function') {
              dispatchCustomEvent('product:variant-error', {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.description,
                message: response.message
              });
            }
            if (response.status === 422) {
              document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', {
                bubbles: true
              }));
            }
            this.handleErrorMessage(response.description);
            return;
          }

          this.renderContents(response);

          if (typeof dispatchCustomEvent === 'function') {
            dispatchCustomEvent('cart:item-added', {
              product: response.hasOwnProperty('items') ? response.items[0] : response
            });
          }
        })
        .catch((e) => {
          // console.error(e);
        })
        .finally(() => {
          submitButtons.forEach((submitButton) => {
            submitButton.classList.remove('loading');
            submitButton.removeAttribute('aria-disabled');
          });
        });
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
          const cartDrawer = document.getElementById('Cart-Drawer');
          if (cartDrawer) {
            if (typeof cartDrawer.notesToggle === 'function') {
              cartDrawer.notesToggle();
            }
            if (typeof cartDrawer.removeProductEvent === 'function') {
              cartDrawer.removeProductEvent();
            }
          }
        }
        if (section.id === 'Cart' && typeof Cart !== 'undefined') {
          new Cart().renderContents(parsedState);
        }
      }));

      let product_drawer = document.getElementById('Product-Drawer');
      if (product_drawer && product_drawer.contains(this)) {
        const quickImagesContainer = product_drawer.querySelector('.product-quick-images--container');
        if (quickImagesContainer) {
          quickImagesContainer.classList.remove('active');
        }
        document.body.classList.remove('open-quick-view');

        if (window.innerWidth < 1069) {
          product_drawer.classList.remove('active');
          if (document.getElementById('Cart-Drawer')) {
            document.getElementById('Cart-Drawer').classList.add('active');
            document.body.classList.add('open-cart');
            const recommendations = document.getElementById('Cart-Drawer').querySelector('.product-recommendations--full');
            if (recommendations) {
              recommendations.classList.add('active');
            }
            if (typeof dispatchCustomEvent === 'function') {
              dispatchCustomEvent('cart-drawer:open');
            }
          }
        } else {
          if (quickImagesContainer) {
            quickImagesContainer.addEventListener('transitionend', function () {
              product_drawer.classList.remove('active');

              if (document.getElementById('Cart-Drawer')) {
                document.getElementById('Cart-Drawer').classList.add('active');
                document.body.classList.add('open-cart');
                const recommendations = document.getElementById('Cart-Drawer').querySelector('.product-recommendations--full');
                if (recommendations) {
                  recommendations.classList.add('active');
                }
                if (typeof dispatchCustomEvent === 'function') {
                  dispatchCustomEvent('cart-drawer:open');
                }
              }
            });
          }
        }

        if (!document.getElementById('Cart-Drawer')) {
          document.body.classList.remove('open-cc');
        }
      } else if (document.getElementById('Cart-Drawer')) {
        document.body.classList.add('open-cc');
        document.body.classList.add('open-cart');
        document.getElementById('Cart-Drawer').classList.add('active');
        if (typeof dispatchCustomEvent === 'function') {
          dispatchCustomEvent('cart-drawer:open');
        }
      }
    }

    getSectionInnerHTML(html, selector = '.shopify-section') {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const element = parsed.querySelector(selector);
      return element ? element.innerHTML : '';
    }

    handleErrorMessage(errorMessage = false) {
      if (this.hideErrors) return;
      this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
      if (!this.errorMessageWrapper) return;

      this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

      if (errorMessage && this.errorMessage) {
        this.errorMessage.textContent = errorMessage;
      }
    }
  });
}

/**
 *  @class
 *  @function ProductAddToCartSticky
 */
if (!customElements.get('product-add-to-cart-sticky')) {
  class ProductAddToCartSticky extends HTMLElement {
    constructor() {
      super();

      this.animations_enabled = document.body.classList.contains('animations-true') && typeof gsap !== 'undefined';
    }

    connectedCallback() {
      this.setupObservers();
      this.setupToggle();
    }

    setupToggle() {
      const button = this.querySelector('.product-add-to-cart-sticky--inner'),
        content = this.querySelector('.product-add-to-cart-sticky--content');

      if (!button || !content) return;

      if (this.animations_enabled) {
        const tl = gsap.timeline({
          reversed: true,
          paused: true,
          onStart: () => {
            button.classList.add('sticky-open');
          },
          onReverseComplete: () => {
            button.classList.remove('sticky-open');
          }
        });

        tl
          .set(content, {
            display: 'block',
            height: 'auto'
          }, 'start')
          .from(content, {
            height: 0,
            duration: 0.25
          }, 'start+=0.001');

        button.addEventListener('click', function () {
          tl.reversed() ? tl.play() : tl.reverse();

          // Sync icon with real state
          setTimeout(() => {
            const isOpen = !tl.reversed();
            button.classList.toggle('sticky-open', isOpen);
          }, 50);

          return false;
        });

      } else {
        button.addEventListener('click', function () {
          content.classList.toggle('active');

          // Sync icon with real state
          setTimeout(() => {
            const isOpen = content.classList.contains('active');
            button.classList.toggle('sticky-open', isOpen);
          }, 50);

          return false;
        });
      }
    }

    setupObservers() {
      let _this = this,
        form = document.getElementById(`product-form-${this.dataset.section}`),
        footer = document.getElementById('footer');

      if (!form) return;

      let observer = new IntersectionObserver(function (entries) {
        entries.forEach((entry) => {
          if (footer && entry.target === footer) {
            if (entry.intersectionRatio > 0) {
              _this.classList.remove('sticky--visible');
            } else if (entry.intersectionRatio == 0 && _this.formPassed) {
              _this.classList.add('sticky--visible');
            }
          }
          if (entry.target === form) {
            let boundingRect = form.getBoundingClientRect();

            if (entry.intersectionRatio === 0 && window.scrollY > (boundingRect.top + boundingRect.height)) {
              _this.formPassed = true;
              _this.classList.add('sticky--visible');
            } else if (entry.intersectionRatio === 1) {
              _this.formPassed = false;
              _this.classList.remove('sticky--visible');
            }
          }
        });
      }, {
        threshold: [0, 1]
      });

      _this.formPassed = false;

      observer.observe(form);
      if (footer) {
        observer.observe(footer);
      }
    }
  }

  customElements.define('product-add-to-cart-sticky', ProductAddToCartSticky);
}

if (typeof addIdToRecentlyViewed !== "undefined") {
  addIdToRecentlyViewed();
}
