/**
 *  @class
 *  @function PredictiveSearch
 */
class PredictiveSearch {
  constructor() {
    this.container = document.getElementById('Search-Drawer');
    if (!this.container) return;

    this.form = this.container.querySelector('form.searchform');
    this.button = document.querySelectorAll('.thb-quick-search');
    this.input = this.container.querySelector('input[type="search"]');
    this.defaultTab = this.container.querySelector('.side-panel-content--initial');
    this.predictiveSearchResults = this.container.querySelector('.side-panel-content--has-tabs');
    this.abortController = null;
    this.submitButtonClickHandler = this.handleSubmitButtonClick.bind(this);

    if (!this.form || !this.input) return;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.form.addEventListener('submit', this.onFormSubmit.bind(this));

    this.input.addEventListener('input', debounce((event) => {
      this.onChange(event);
    }, 300).bind(this));

    this.button.forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        document.body.classList.toggle('open-cc');
        this.container.classList.toggle('active');
        if (this.container.classList.contains('active')) {
          setTimeout(() => {
            this.input.focus({
              preventScroll: true
            });
          }, 100);
          dispatchCustomEvent('search:open');
        }

        return false;
      });
    });
  }

  getQuery() {
    return this.input.value.trim();
  }

  onChange() {
    if (!this.predictiveSearchResults) return;

    const searchTerm = this.getQuery();

    if (!searchTerm.length) {
      this.predictiveSearchResults.classList.remove('active');
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      return;
    }
    this.predictiveSearchResults.classList.add('active');
    this.getSearchResults(searchTerm);
  }

  onFormSubmit(event) {
    if (!this.getQuery().length) {
      event.preventDefault();
    }
  }

  onFocus() {
    if (!this.predictiveSearchResults) return;

    const searchTerm = this.getQuery();

    if (!searchTerm.length) {
      return;
    }

    this.getSearchResults(searchTerm);
  }

  getSearchResults(searchTerm) {
    if (!this.predictiveSearchResults) return;

    const queryKey = searchTerm.replace(/\s+/g, '-').toLowerCase();

    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();
    this.currentQueryKey = queryKey;

    this.predictiveSearchResults.classList.add('loading');

    fetch(`${theme.routes.predictive_search_url}?q=${encodeURIComponent(searchTerm)}&${encodeURIComponent('resources[type]')}=product,article,query&${encodeURIComponent('resources[limit]')}=10&resources[options][fields]=title,product_type,vendor,variants.title,variants.sku&section_id=predictive-search`, {
      signal: this.abortController.signal
    })
      .then((response) => {
        this.predictiveSearchResults.classList.remove('loading');
        if (!response.ok) {
          throw new Error(response.status);
        }

        return response.text();
      })
      .then((text) => {
        if (this.currentQueryKey !== queryKey) return;

        const parsedDocument = new DOMParser().parseFromString(text, 'text/html');
        const predictiveSection = parsedDocument.querySelector('#shopify-section-predictive-search');
        if (!predictiveSection) return;

        const resultsMarkup = predictiveSection.innerHTML;

        this.renderSearchResults(resultsMarkup);
      })
      .catch((error) => {
        this.predictiveSearchResults.classList.remove('loading');
        if (error.name === 'AbortError') return;
      });
  }

  handleSubmitButtonClick(event) {
    event.preventDefault();
    if (typeof this.form.requestSubmit === 'function') {
      this.form.requestSubmit();
      return;
    }
    this.form.submit();
  }

  renderSearchResults(resultsMarkup) {
    if (!this.predictiveSearchResults) return;

    this.predictiveSearchResults.innerHTML = resultsMarkup;

    const submitButton = this.container.querySelector('#search-results-submit');
    if (!submitButton) return;

    submitButton.removeEventListener('click', this.submitButtonClickHandler);
    submitButton.addEventListener('click', this.submitButtonClickHandler);
  }

  close() {
    if (!this.container) return;
    this.container.classList.remove('active');
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof PredictiveSearch !== 'undefined') {
      new PredictiveSearch();
    }
  });
} else {
  if (typeof PredictiveSearch !== 'undefined') {
    new PredictiveSearch();
  }
}
