/**
 * ProgressIndicatorManager - Handles background progress indicators
 */
class ProgressIndicatorManager {
    constructor() {
        this.backgroundProgress = {
            total: 4,
            completed: 0,
            steps: ['Assets', 'Systems', 'Game Core', 'Finalization']
        };
    }

    /**
     * Shows the background progress indicator
     * @deprecated Use showIndicator() for API compatibility
     */
    showBackgroundProgressIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'background-progress-indicator';
        indicator.innerHTML = `
            <div class="progress-content">
                <div class="progress-text">Initializing background systems...</div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-step">Step 0 of 4</div>
            </div>
        `;
        
        // Add styles
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            min-width: 280px;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s ease;
        `;
        
        // Style the progress bar
        const progressBar = indicator.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.cssText = `
                width: 100%;
                height: 6px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
                margin: 8px 0 4px 0;
                overflow: hidden;
            `;
        }
        
        const progressFill = indicator.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.cssText = `
                height: 100%;
                background: linear-gradient(90deg, #4CAF50, #8BC34A);
                width: 0%;
                transition: width 0.5s ease;
                border-radius: 3px;
            `;
        }
        
        const progressText = indicator.querySelector('.progress-text');
        if (progressText) {
            progressText.style.cssText = `
                margin-bottom: 4px;
                font-weight: 500;
            `;
        }
        
        const progressStep = indicator.querySelector('.progress-step');
        if (progressStep) {
            progressStep.style.cssText = `
                font-size: 10px;
                opacity: 0.7;
                margin-top: 2px;
            `;
        }
        
        document.body.appendChild(indicator);
        
        // Animate in
        requestAnimationFrame(() => {
            indicator.style.opacity = '1';
            indicator.style.transform = 'translateY(0)';
        });
        
        console.log('[ProgressIndicatorManager] Background progress indicator shown');
    }

    /**
     * Updates the background progress indicator
     * @param {string} message - Progress message to display
     * @param {number} step - Current step number (-1 for error state)
     * @deprecated Use updateProgress() for API compatibility
     */
    updateBackgroundProgress(message, step) {
        const indicator = document.getElementById('background-progress-indicator');
        if (!indicator) return;
        
        const progressText = indicator.querySelector('.progress-text');
        const progressFill = indicator.querySelector('.progress-fill');
        const progressStep = indicator.querySelector('.progress-step');
        
        if (progressText) {
            progressText.textContent = message;
        }
        
        if (progressFill) {
            if (step === -1) {
                // Error state
                progressFill.style.background = 'linear-gradient(90deg, #f44336, #ff5722)';
                progressFill.style.width = '100%';
            } else {
                const percentage = Math.max(0, Math.min(100, (step / this.backgroundProgress.total) * 100));
                progressFill.style.width = `${percentage}%`;
                progressFill.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
            }
        }
        
        if (progressStep) {
            if (step === -1) {
                progressStep.textContent = 'Error occurred';
            } else {
                progressStep.textContent = `Step ${step} of ${this.backgroundProgress.total}`;
            }
        }
        
        console.log(`[ProgressIndicatorManager] Progress updated: ${message} (${step}/${this.backgroundProgress.total})`);
    }

    /**
     * Hides the background progress indicator
     * @deprecated Use hideIndicator() for API compatibility
     */
    hideBackgroundProgressIndicator() {
        const indicator = document.getElementById('background-progress-indicator');
        if (!indicator) return;
        
        console.log('[ProgressIndicatorManager] Starting progress indicator fade-out');
        
        // Use smooth transition
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateY(20px)';
        
        // Get transition duration from CSS or use default
        const duration = this.getTransitionDuration(indicator) || 300;
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
                console.log('[ProgressIndicatorManager] Progress indicator removed after transition');
            }
        }, duration);
    }

    /**
     * Gets the transition duration from CSS
     * @param {HTMLElement} element - The element to check
     * @returns {number|null} Duration in milliseconds or null if not found
     */
    getTransitionDuration(element) {
        try {
            const computedStyle = window.getComputedStyle(element);
            const duration = computedStyle.transitionDuration;
            
            if (duration && duration !== '0s') {
                // Convert from seconds to milliseconds
                const seconds = parseFloat(duration.replace('s', ''));
                return Math.round(seconds * 1000);
            }
        } catch (error) {
            console.warn('[ProgressIndicatorManager] Could not determine transition duration:', error);
        }
        return null;
    }

    // API Compatibility Wrapper Methods
    
    /**
     * Shows the progress indicator (wrapper for API compatibility)
     * @deprecated Use showBackgroundProgressIndicator() directly
     */
    showIndicator() {
        return this.showBackgroundProgressIndicator();
    }

    /**
     * Updates the progress indicator (wrapper for API compatibility)
     * @param {string} message - Progress message to display
     * @param {number} step - Current step number (-1 for error state)
     * @deprecated Use updateBackgroundProgress() directly
     */
    updateProgress(message, step) {
        return this.updateBackgroundProgress(message, step);
    }

    /**
     * Hides the progress indicator (wrapper for API compatibility)
     * @deprecated Use hideBackgroundProgressIndicator() directly
     */
    hideIndicator() {
        return this.hideBackgroundProgressIndicator();
    }
}
