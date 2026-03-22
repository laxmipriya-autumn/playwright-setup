
document.addEventListener('DOMContentLoaded', function () {
    (function () {
        const container = document.querySelector('.related-swatches-container:not([data-init])');
        if (container) container.setAttribute('data-init', 'true');

        if (!container) return;

        const track = container.querySelector('.related-swatches-track');
        const prevBtn = container.querySelector('.swatches-nav-prev');
        const nextBtn = container.querySelector('.swatches-nav-next');
        const slider = container.querySelector('.related-swatches-slider');
        const items = Array.from(track.querySelectorAll('.related-swatches__item'));
        const colorLabel = document.querySelector('.js-selected-color');

        let currentIndex = 0;
        let itemWidth = 0;
        let visibleCount = 0;
        let maxIndex = 0;

        // Get the stored color value to prevent undefined
        const getValidColorName = function () {
            // Priority 1: Get from active swatch
            const activeSwatch = document.querySelector('.related-swatches__item.is-active');
            if (activeSwatch) {
                const colorName = activeSwatch.getAttribute('data-color');
                if (colorName && colorName !== 'undefined' && colorName !== 'null' && colorName.trim() !== '') {
                    return colorName;
                }
            }

            // Priority 2: Get from data attribute on label
            if (colorLabel) {
                const storedColor = colorLabel.getAttribute('data-color-value');
                if (storedColor && storedColor !== 'undefined' && storedColor !== 'null' && storedColor.trim() !== '') {
                    return storedColor;
                }
            }

            // Priority 3: Get from container
            const containerColor = container.getAttribute('data-current-color');
            if (
                containerColor &&
                containerColor !== 'undefined' &&
                containerColor !== 'null' &&
                containerColor.trim() !== ''
            ) {
                return containerColor;
            }

            // Priority 4: Keep existing text content if valid
            if (colorLabel) {
                const currentText = colorLabel.textContent.trim();
                if (currentText && currentText !== 'undefined' && currentText !== 'null' && currentText !== '') {
                    return currentText;
                }
            }

            return null;
        };

        // Update color name safely
        const updateColorNameSafe = function () {
            if (!colorLabel) return;

            const validColor = getValidColorName();
            if (validColor) {
                colorLabel.textContent = validColor;
            }
        };

        // Calculate dimensions
        function calculateDimensions() {
            if (items.length === 0) return;

            const firstItem = items[0];
            const itemRect = firstItem.getBoundingClientRect();
            const gap = parseFloat(getComputedStyle(track).gap) || 10;
            itemWidth = itemRect.width + gap;

            // Use the actual slider width (limited by CSS max-width)
            const sliderWidth = slider.offsetWidth;
            visibleCount = Math.floor(sliderWidth / itemWidth);

            // Ensure at least 1 item is visible
            visibleCount = Math.max(1, visibleCount);

            maxIndex = Math.max(0, items.length - visibleCount);
        }

        // Check if navigation is needed
        function checkOverflow() {
            calculateDimensions();

            const needsNavigation = items.length > visibleCount;

            if (needsNavigation) {
                prevBtn.classList.add('visible');
                nextBtn.classList.add('visible');
            } else {
                prevBtn.classList.remove('visible');
                nextBtn.classList.remove('visible');
            }

            updateButtons();
        }

        // Update button states
        function updateButtons() {
            prevBtn.disabled = currentIndex <= 0;
            nextBtn.disabled = currentIndex >= maxIndex;
        }

        // Slide function
        function slide(direction) {
            if (direction === 'next') {
                currentIndex = Math.min(currentIndex + 1, maxIndex);
            } else {
                currentIndex = Math.max(currentIndex - 1, 0);
            }

            const translateX = -(currentIndex * itemWidth);
            track.style.transform = `translateX(${translateX}px)`;
            updateButtons();
        }

        // Event listeners
        prevBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            slide('prev');
        });

        nextBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            slide('next');
        });

        // Swatch click handlers
        items.forEach(function (item) {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const handle = this.getAttribute('data-product-handle');
                const color = this.getAttribute('data-color');

                if (!this.classList.contains('is-active') && handle) {
                    items.forEach(function (i) {
                        i.classList.remove('is-active');
                    });
                    this.classList.add('is-active');

                    if (colorLabel && color) {
                        colorLabel.textContent = color;
                        colorLabel.setAttribute('data-color-value', color);
                    }

                    window.location.href = '/products/' + handle;
                }
            });
        });

        // Listen for any form changes (size selection)
        document.addEventListener('change', function (e) {
            if (e.target.matches('input[type="radio"]') || e.target.matches('select')) {
                updateColorNameSafe();
            }
        });

        // Listen for variant changes
        document.addEventListener('variant:change', updateColorNameSafe);

        // Resize handler with debounce
        let resizeTimeout;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function () {
                currentIndex = 0;
                track.style.transform = 'translateX(0)';
                checkOverflow();
            }, 200);
        });

        // Initialize after DOM is ready
        function init() {
            // Set initial color immediately
            updateColorNameSafe();

            const images = Array.from(track.querySelectorAll('img'));

            if (images.length > 0) {
                let loadedCount = 0;
                const totalImages = images.length;

                images.forEach(function (img) {
                    if (img.complete) {
                        loadedCount++;
                    } else {
                        img.addEventListener('load', function () {
                            loadedCount++;
                            if (loadedCount === totalImages) {
                                checkOverflow();
                            }
                        });
                    }
                });

                if (loadedCount === totalImages) {
                    checkOverflow();
                }
            } else {
                checkOverflow();
            }
        }

        // Start initialization
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            setTimeout(init, 100);
        }
    })();
});

