/**
 *  @class
 *  @function ImageHotspots
 */
if (!customElements.get('image-hotspots')) {
  class ImageHotspots extends HTMLElement {
    constructor() {
      super();

      this.dots = this.querySelectorAll('.image-hotspots--pin');
      this.buttons = this.querySelectorAll('.image-hotspots--pin-button');
      this.animations_enabled = document.body.classList.contains('animations-true') && typeof gsap !== 'undefined';
      this.activeDot = this.buttons.length ? this.buttons[0] : false;

      this.dots.forEach((dot, index) => {
        this.checkCardPosition(dot);
        dot.addEventListener('click', this.onClick.bind(this, dot));
      });
      
      // Add resize listener to recalculate positions on viewport change
      this.resizeTimeout = null;
      window.addEventListener('resize', () => {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          this.dots.forEach((dot) => {
            this.checkCardPosition(dot);
          });
        }, 250);
      });
    }
    connectedCallback() {
      if (this.animations_enabled) {
        this.prepareAnimations();
      }
    }
    onClick(dot) {

      this.dots.forEach((thedot, index) => {
        if (dot == thedot) {
          return;
        }
        thedot.classList.remove('active');
      });
      this.activeDot = dot;
      this.checkCardPosition(dot);
      dot.classList.toggle('active');
      if (!dot.classList.contains('active')) {
        setTimeout(() => {
          dot.classList.remove('bottom-dot');
          dot.classList.remove('content-left');
          dot.classList.remove('content-right');
          dot.style.setProperty('--content-offset', '0px');
        }, 350);
      }

    }
    prepareAnimations() {
      let section = this;

      this.tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 50%"
        }
      });

      this.tl
        .fromTo(this.buttons, {
          scale: 0
        }, {
          duration: 2,
          stagger: {
            each: 0.2,
            onComplete() {
              this.targets()[0].classList.add('hotspot--pinned');
            }
          },
          scale: 1,
          ease: 'elastic.out(1.2, 0.5)',
        });
    }
    checkCardPosition(dot) {
      let dotBounds = dot.querySelector('.image-hotspots--pin-bubble').getBoundingClientRect(),
        imageBounds = this.getBoundingClientRect();

      // Detect if mobile or desktop
      const isMobile = window.innerWidth < 768;
      
      // Get manual position settings from data attributes (mobile or desktop)
      const contentVertical = isMobile 
        ? dot.getAttribute('data-content-vertical-mobile') 
        : dot.getAttribute('data-content-vertical');
      const contentHorizontal = isMobile 
        ? dot.getAttribute('data-content-horizontal-mobile') 
        : dot.getAttribute('data-content-horizontal');
      
      // Handle VERTICAL positioning
      if (contentVertical === 'top') {
        // Manual: Force open upward
        dot.classList.add('bottom-dot');
      } else if (contentVertical === 'bottom') {
        // Manual: Force open downward
        dot.classList.remove('bottom-dot');
      } else {
        // Auto: Smart positioning based on hotspot location
        const dotTop = parseFloat(getComputedStyle(dot).getPropertyValue(isMobile ? '--mobile-top' : '--desktop-top'));
        
        if (dotTop > 50) {
          // Bottom half: open downward
          dot.classList.remove('bottom-dot');
        } else {
          // Top half: open upward
          dot.classList.add('bottom-dot');
        }
      }
      
      // Handle HORIZONTAL positioning
      if (contentHorizontal === 'left') {
        dot.classList.add('content-left');
        dot.classList.remove('content-right');
      } else if (contentHorizontal === 'right') {
        dot.classList.add('content-right');
        dot.classList.remove('content-left');
      } else {
        // Center (default)
        dot.classList.remove('content-left');
        dot.classList.remove('content-right');
      }
      
      // Keep the original edge detection logic for auto positioning
      if (contentHorizontal === 'center') {
        if (dotBounds.right > imageBounds.right) {
          dot.style.setProperty('--content-offset', `${imageBounds.right - dotBounds.right - 30}px`);
        } else if (dotBounds.left < imageBounds.left) {
          dot.style.setProperty('--content-offset', `${imageBounds.left - dotBounds.left + 30}px`);
        } else {
          dot.style.setProperty('--content-offset', '0px');
        }
      }
    }
  }
  customElements.define('image-hotspots', ImageHotspots);
}