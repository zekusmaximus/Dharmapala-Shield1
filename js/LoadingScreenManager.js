/**
 * LoadingScreenManager - Handles loading screen display and transitions for GameBootstrap
 */
class LoadingScreenManager {
    constructor() {
        this.loadingScreen = null;
    }

    /**
     * Shows the loading screen with smooth transition
     */
    showLoadingScreen() {
        const gameScreen = document.getElementById('game-screen');
        const loadingScreen = document.getElementById('loading-screen');
        
        if (gameScreen) gameScreen.style.display = 'none';
        if (loadingScreen) {
            // Ensure clean state for transitions
            loadingScreen.classList.remove('fade-out', 'hidden');
            loadingScreen.classList.add('active');
            loadingScreen.style.display = 'flex';
            
            // Force reflow to ensure display change takes effect
            loadingScreen.offsetHeight;
            
            // Add fade-in for smooth appearance
            loadingScreen.classList.add('fade-in');
            
            this.loadingScreen = loadingScreen;
            console.log('[LoadingScreenManager] Loading screen shown with smooth transition');
        } else {
            console.warn('[LoadingScreenManager] Loading screen element not found');
        }
    }

    /**
     * Hides the loading screen with smooth transition
     */
    hideLoadingScreen() {
        if (!this.loadingScreen) return;
        
        console.log('[LoadingScreenManager] Starting loading screen fade-out transition');
        
        // Remove fade-in class and add fade-out class
        this.loadingScreen.classList.remove('fade-in');
        this.loadingScreen.classList.add('fade-out');
        
        // Get transition duration from CSS or use default
        const transitionDuration = this.getTransitionDuration(this.loadingScreen) || 500;
        
        // Wait for transition to complete before hiding element
        setTimeout(() => {
            if (this.loadingScreen) {
                this.loadingScreen.style.display = 'none';
                this.loadingScreen.classList.remove('active', 'fade-out');
                this.loadingScreen.classList.add('hidden');
                console.log('[LoadingScreenManager] Loading screen hidden after transition');
            }
        }, transitionDuration);
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
            console.warn('[LoadingScreenManager] Could not determine transition duration:', error);
        }
        return null;
    }

    /**
     * Generic method for smooth element transitions
     * @param {HTMLElement} element - Element to hide
     * @param {string} fadeOutClass - CSS class for fade out animation
     * @param {Function} callback - Optional callback after hiding
     * @returns {Promise} Promise that resolves when transition is complete
     */
    smoothHideElement(element, fadeOutClass = 'fade-out', callback = null) {
        if (!element) return Promise.resolve();
        
        return new Promise((resolve) => {
            console.log('[LoadingScreenManager] Starting smooth hide transition for element:', element.id || element.className);
            
            // Add fade-out class
            element.classList.add(fadeOutClass);
            
            // Get transition duration
            const duration = this.getTransitionDuration(element) || 300;
            
            setTimeout(() => {
                element.style.display = 'none';
                element.classList.remove('active');
                
                if (callback) callback(element);
                
                console.log('[LoadingScreenManager] Element hidden after transition');
                resolve();
            }, duration);
        });
    }

    /**
     * Generic method for smooth element show transitions
     * @param {HTMLElement} element - Element to show
     * @param {string} fadeInClass - CSS class for fade in animation
     * @param {string} displayStyle - CSS display style to use
     * @returns {Promise} Promise that resolves when transition is complete
     */
    smoothShowElement(element, fadeInClass = 'fade-in', displayStyle = 'flex') {
        if (!element) return Promise.resolve();
        
        return new Promise((resolve) => {
            console.log('[LoadingScreenManager] Starting smooth show transition for element:', element.id || element.className);
            
            // Reset classes and show element
            element.classList.remove('fade-out', 'hidden');
            element.classList.add('active');
            element.style.display = displayStyle;
            
            // Force reflow
            element.offsetHeight;
            
            // Add fade-in class
            element.classList.add(fadeInClass);
            
            const duration = this.getTransitionDuration(element) || 300;
            setTimeout(() => {
                console.log('[LoadingScreenManager] Element shown after transition');
                resolve();
            }, duration);
        });
    }
}
