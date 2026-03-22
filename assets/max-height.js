/**
 *  @class
 *  @function MaxHeight - Truncate at first full stop with INLINE button
 */
if (!customElements.get('max-height')) {
  class MaxHeight extends HTMLElement {
    constructor() {
      super();
      this.content = this.querySelector('.max-height--inner-content');
      this.toggle = this.querySelector('.max-height--toggle');
      this.originalHTML = '';
      this.truncatedHTML = '';
    }
    
    connectedCallback() {
      // Store original content
      this.originalHTML = this.content.innerHTML;
      
      // Truncate at first full stop
      this.truncateAtFirstPeriod();
      
      // Add click event
      if (this.toggle) {
        this.toggle.addEventListener('click', this.onClick.bind(this));
      }
    }
    
    truncateAtFirstPeriod() {
      const textContent = this.content.textContent || this.content.innerText;
      
      // Find first period followed by space or end of string
      const periodMatch = textContent.match(/\.\s/);
      
      if (periodMatch && periodMatch.index !== undefined) {
        const periodIndex = periodMatch.index + 1; // Include the period
        
        // Check if there's more content after the period
        const remainingText = textContent.substring(periodIndex).trim();
        
        if (remainingText.length > 0) {
          // There's content after first period, so we need to truncate
          const truncatedText = textContent.substring(0, periodIndex).trim();
          
          // Store truncated version (just text, no HTML wrapper)
          this.truncatedText = truncatedText;
          
          // Set truncated text with inline button
          this.showTruncated();
          
          // Show the component as having overflow
          this.classList.add('has-overflow');
        } else {
          // No content after first period, hide toggle
          this.hideToggle();
        }
      } else {
        // No period found, hide toggle
        this.hideToggle();
      }
    }
    
    showTruncated() {
      // Get the parent element structure
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.originalHTML;
      const firstElement = tempDiv.firstElementChild;
      
      if (firstElement) {
        // Preserve the tag and class
        const tagName = firstElement.tagName.toLowerCase();
        const className = firstElement.className || '';
        
        // Set content with text + inline button placeholder
        this.content.innerHTML = `<${tagName} class="${className}">${this.truncatedText} <span class="inline-toggle-wrapper"></span></${tagName}>`;
        
        // Move button inside the inline wrapper
        const wrapper = this.content.querySelector('.inline-toggle-wrapper');
        if (wrapper && this.toggle) {
          wrapper.appendChild(this.toggle);
          this.toggle.style.display = 'inline';
        }
      } else {
        // No wrapper element, just add text
        this.content.innerHTML = `${this.truncatedText} <span class="inline-toggle-wrapper"></span>`;
        const wrapper = this.content.querySelector('.inline-toggle-wrapper');
        if (wrapper && this.toggle) {
          wrapper.appendChild(this.toggle);
          this.toggle.style.display = 'inline';
        }
      }
    }
    
    showExpanded() {
      // Restore original content
      this.content.innerHTML = this.originalHTML;
      
      // Add button at the end inline
      const lastElement = this.content.lastElementChild || this.content;
      
      if (lastElement && this.toggle) {
        // Create inline wrapper
        const wrapper = document.createElement('span');
        wrapper.className = 'inline-toggle-wrapper';
        wrapper.appendChild(this.toggle);
        
        // Append to last element
        if (lastElement.nodeType === Node.ELEMENT_NODE) {
          lastElement.appendChild(document.createTextNode(' '));
          lastElement.appendChild(wrapper);
        } else {
          this.content.appendChild(document.createTextNode(' '));
          this.content.appendChild(wrapper);
        }
        
        this.toggle.style.display = 'inline';
      }
    }
    
    hideToggle() {
      this.classList.remove('has-overflow');
      if (this.toggle) {
        this.toggle.style.display = 'none';
      }
    }
    
    onClick() {
      const isExpanded = this.classList.toggle('is-expanded');
      
      if (isExpanded) {
        // Show full content with inline button
        this.showExpanded();
      } else {
        // Show truncated content with inline button
        this.showTruncated();
      }
    }
  }
  customElements.define('max-height', MaxHeight);
}