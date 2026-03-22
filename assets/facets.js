if (typeof debounce === 'undefined') {
  function debounce(fn, wait) {
    let t;
    return function () {
      const ctx = this;
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait);
    };
  }
}
/**
 *  @class
 *  @function FacetsToggle
 */
class FacetsToggle {

  constructor() {
    this.container = document.getElementById('Facet-Drawer');
    let button = document.getElementById('Facets-Toggle');

    // Add functionality to buttons
    if (button) {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementsByTagName('body')[0].classList.toggle('open-cc');
        this.container.classList.toggle('active');
      });
    }
    setTimeout(function () {
      window.dispatchEvent(new Event('resize.resize-select'));
    }, 10);
  }
}


class FacetFiltersForm extends HTMLElement {
 constructor() {
  super();
  this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

  this.debouncedOnSubmit = debounce((event) => {
    this.onSubmitHandler(event);
  }, 500);

  this.form = this.querySelector('form');

  if (this.form) {
    // Only submit when Apply button or form submit is triggered
    this.form.addEventListener('submit', (event) => this.onSubmitHandler(event));
  }

  // Mobile Apply button
  this.querySelectorAll('.mobile-filters-apply').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();

      if (this.form?.requestSubmit) {
        this.form.requestSubmit();
      } else if (this.form) {
        this.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    });
  });
}

  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    };
    window.addEventListener('popstate', onHistoryChange);
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach((element) => {
      element.classList.toggle('disabled', disable);
    });
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    const container = document.getElementsByClassName('thb-filter-count');
    document.getElementById('ProductGridContainer').querySelector('.collection').classList.add('loading');

    for (var item of container) {
      item.classList.add('loading');
    }

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = element => element.url === url;

      if (FacetFiltersForm.filterData.some(filterDataUrl)) {
        FacetFiltersForm.renderSectionFromCache(filterDataUrl, event);
      } else {
        FacetFiltersForm.renderSectionFromFetch(url, event);
      }
    });
    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);

  }

  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then(response => response.text())
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, {
          html,
          url
        }];
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderProductCount(html);

        new FacetsToggle();
      });
  }

  static renderSectionFromCache(filterDataUrl, event) {
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
    FacetFiltersForm.renderFilters(html, event);
    FacetFiltersForm.renderProductGridContainer(html);
    FacetFiltersForm.renderProductCount(html);

    new FacetsToggle();
  }

  static renderProductGridContainer(html) {
    document.getElementById('ProductGridContainer').innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductGridContainer').innerHTML;

    let top = document.getElementById('ProductGridContainer').getBoundingClientRect().top + document.documentElement.scrollTop - parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) - 30;

    window.scrollTo({
      top: top,
      left: 0,
      behavior: "smooth"
    });
  }

  static renderProductCount(html) {
    const countHtml = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount');
    const container = document.getElementsByClassName('thb-filter-count');

    if (countHtml) {
      for (var item of container) {
        item.innerHTML = countHtml.innerHTML;
        item.classList.remove('loading');
      }
    }

  }

  static renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');

    const facetDetailsElements =
      parsedHTML.querySelectorAll('#FacetFiltersForm collapsible-row, #FacetFiltersFormMobile collapsible-row');
    const matchesIndex = (element) => {
      const jsFilter = event ? event.target.closest('collapsible-row') : undefined;
      return jsFilter ? element.dataset.index === jsFilter.dataset.index : false;
    };
    const facetsToRender = Array.from(facetDetailsElements).filter(element => !matchesIndex(element));
    const countsToRender = Array.from(facetDetailsElements).find(matchesIndex);

    facetsToRender.forEach((element) => {
      document.querySelector(`collapsible-row[data-index="${element.dataset.index}"]`).innerHTML = element.innerHTML;
    });

    FacetFiltersForm.renderActiveFacets(parsedHTML);
    FacetFiltersForm.renderAdditionalElements(parsedHTML);
    new FacetsToggle();

    if (countsToRender) FacetFiltersForm.renderCounts(countsToRender, event.target.closest('collapsible-row'));
  }

 static renderActiveFacets(html) {
  const activeFacets = html.querySelector('.active-facets');
  const target = document.querySelector('.active-facets');

  if (activeFacets && target) {
    target.innerHTML = activeFacets.innerHTML;
  }

  FacetFiltersForm.toggleActiveFacets(false);
}

  static renderAdditionalElements(html) {
    const mobileElementSelectors = ['.mobile-filter-count'];

    mobileElementSelectors.forEach((selector) => {
      if (!html.querySelector(selector)) return;
      document.querySelector(selector).innerHTML = html.querySelector(selector).innerHTML;
    });

  }

  static renderCounts(source, target) {
    const targetElement = target.querySelector('.facets__selected');
    const sourceElement = source.querySelector('.facets__selected');

    if (sourceElement && targetElement) {
      target.querySelector('.facets__selected').outerHTML = source.querySelector('.facets__selected').outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState({
      searchParams
    }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  }

  static getSections() {
    return [
      {
        section: document.getElementById('product-grid').dataset.id,
      }];
  }

  onSubmitHandler(event) {
    if (event) event.preventDefault();

    const formEl = event?.target?.closest('form') || this.form || this.querySelector('form');
    if (!formEl) return;

    const formData = new FormData(formEl);
    const searchParams = new URLSearchParams(formData);

    // Clean up price params if they're still at defaults
    const slider = formEl.querySelector('.price_slider');
    if (slider) {
      const defaultMin = parseFloat(slider.dataset.min) || 0;
      const defaultMax = parseFloat(slider.dataset.max);

      const toNumber = (val) => {
        if (val === null || val === undefined) return null;
        const cleaned = String(val).replace(/,/g, '').trim();
        if (cleaned === '') return null;
        const parsed = parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
      };

      const gteVal = toNumber(searchParams.get('filter.v.price.gte'));
      const lteVal = toNumber(searchParams.get('filter.v.price.lte'));

      // If values match defaults, strip them out
      if ((gteVal === null || gteVal === defaultMin) &&
          (lteVal === null || lteVal === defaultMax)) {
        searchParams.delete('filter.v.price.gte');
        searchParams.delete('filter.v.price.lte');
      }
    }

    FacetFiltersForm.renderPage(searchParams.toString(), event);

    // Close mobile drawer after applying
    const facetDrawer = document.getElementById('Facet-Drawer');
    if (facetDrawer && facetDrawer.classList.contains('active')) {
      facetDrawer.classList.remove('active');
      document.body.classList.remove('open-cc');
    }
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();
    const url = event.currentTarget.href.indexOf('?') == -1 ? '' : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
    FacetFiltersForm.renderPage(url);
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();


class FacetRemove extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('a').forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
        form.onActiveFilterClick(event);
      });
    });
  }
}

customElements.define('facet-remove', FacetRemove);

/**
 *  @class
 *  @function PriceSlider
 */
class PriceSlider extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    let slider = this.querySelector('.price_slider'),
      amounts = this.querySelector('.price_slider_amount'),
      minInput = amounts.querySelector('.field__input_min'),
      maxInput = amounts.querySelector('.field__input_max'),
      args = {
        start: [
          parseFloat(slider.dataset.minValue || 0),
          parseFloat(slider.dataset.maxValue || slider.dataset.max)
        ],
        connect: true,
        step: 10,
        direction: document.dir,
        handleAttributes: [
          { 'aria-label': 'lower' },
          { 'aria-label': 'upper' },
        ],
        range: {
          'min': parseFloat(slider.dataset.min) || 0,
          'max': parseFloat(slider.dataset.max)
        }
      },
      event = new CustomEvent('input'),
      form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');

    // Track whether the user has actually interacted with the slider
    let userHasInteracted = false;

    // Determine if the slider was initialized with non-default values
    // (i.e., price filters already active from URL params)
    const defaultMin = parseFloat(slider.dataset.min) || 0;
    const defaultMax = parseFloat(slider.dataset.max);
    const initialMin = parseFloat(slider.dataset.minValue || 0);
    const initialMax = parseFloat(slider.dataset.maxValue || slider.dataset.max);
    const hasActiveFilter = (initialMin !== defaultMin) || (initialMax !== defaultMax);

    // If there's an active filter from URL, mark as interacted
    if (hasActiveFilter) {
      userHasInteracted = true;
    }

    if (slider.classList.contains('noUi-target')) {
      slider.noUiSlider.destroy();
    }
    noUiSlider.create(slider, args);

    slider.noUiSlider.on('update', function (values) {
      // Always update the displayed values for visual feedback
      minInput.value = values[0];
      maxInput.value = values[1];

      // Only set the name attributes (so they submit) if the user
      // has interacted OR if there's already an active price filter
      if (userHasInteracted) {
        minInput.setAttribute('name', 'filter.v.price.gte');
        maxInput.setAttribute('name', 'filter.v.price.lte');
      } else {
        // Remove name so these inputs don't submit with the form
        minInput.removeAttribute('name');
        maxInput.removeAttribute('name');
      }
    });

    // 'start' fires when user begins dragging
    slider.noUiSlider.on('start', function () {
      userHasInteracted = true;
      minInput.setAttribute('name', 'filter.v.price.gte');
      maxInput.setAttribute('name', 'filter.v.price.lte');
    });

    slider.noUiSlider.on('change', function (values) {
      userHasInteracted = true;
      minInput.setAttribute('name', 'filter.v.price.gte');
      maxInput.setAttribute('name', 'filter.v.price.lte');
      form.querySelector('form').dispatchEvent(event);
    });

    // Also handle manual text input in the price fields
    [minInput, maxInput].forEach((input) => {
      input.addEventListener('input', () => {
        userHasInteracted = true;
        minInput.setAttribute('name', 'filter.v.price.gte');
        maxInput.setAttribute('name', 'filter.v.price.lte');
      });

      input.addEventListener('change', () => {
        userHasInteracted = true;
        minInput.setAttribute('name', 'filter.v.price.gte');
        maxInput.setAttribute('name', 'filter.v.price.lte');
        
        // Update the slider to match the manual input
        const minVal = parseFloat(minInput.value) || defaultMin;
        const maxVal = parseFloat(maxInput.value) || defaultMax;
        slider.noUiSlider.set([minVal, maxVal]);
      });
    });

    // Initially remove name attributes if no active filter
    if (!hasActiveFilter) {
      minInput.removeAttribute('name');
      maxInput.removeAttribute('name');
    }
  }
}
customElements.define('price-slider', PriceSlider);

window.addEventListener('load', () => {
  new FacetsToggle();
});

// Mobile Apply buttons live outside facet-filters-form; submit the mobile form when clicked
document.addEventListener('click', (event) => {
  const applyBtn = event.target.closest('.mobile-filters-apply');
  if (!applyBtn) return;

  event.preventDefault();
  const mobileForm = document.getElementById('FacetFiltersFormMobile');
  if (mobileForm) {
    if (typeof mobileForm.requestSubmit === 'function') {
      mobileForm.requestSubmit();
    } else {
      mobileForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  }

  const facetDrawer = document.getElementById('Facet-Drawer');
  if (facetDrawer && facetDrawer.classList.contains('active')) {
    facetDrawer.classList.remove('active');
    document.body.classList.remove('open-cc');
  }
});