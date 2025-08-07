class GameBootstrap {
    constructor() {
        this.loadingScreen = null;
        this.game = null;
        this.screenManager = null;
        this.initialized = false;
        this.isInitializing = false; // Coordination flag for emergency fallback
        this.progressIndicator = null;
        this.backgroundProgress = {
            total: 4,
            completed: 0,
            steps: ['Assets', 'Systems', 'Game Core', 'Finalization']
        };
        
        // Performance-adaptive timeout configuration
        this.timeoutConfig = {
            base: 1500, // Base timeout in ms (1.5 seconds)
            min: 1000,  // Minimum timeout (1 second)
            max: 3000,  // Maximum timeout (3 seconds)
            adaptive: true // Enable adaptive timeout based on device performance
        };
        
        this.devicePerformance = this.assessDevicePerformance();
        this.applyConfigurationOverrides();
        
        // Initialize module managers
        this.loadingScreenManager = new LoadingScreenManager();
        this.progressIndicatorManager = new ProgressIndicatorManager();
        this.assetLoader = new AssetLoader();
        this.errorNotificationManager = new ErrorNotificationManager();
        this.emergencyHandler = new EmergencyHandler(this.devicePerformance, this.timeoutConfig);
    }

    applyConfigurationOverrides() {
        // Apply CONFIG overrides if available
        if (typeof CONFIG !== 'undefined' && CONFIG.BOOTSTRAP_TIMEOUT) {
            this.configureTimeout(CONFIG.BOOTSTRAP_TIMEOUT);
        }
        
        // Apply URL parameter overrides for testing
        const urlParams = new URLSearchParams(window.location.search);
        const timeoutOverrides = {};
        
        if (urlParams.has('bootstrap_timeout')) {
            timeoutOverrides.base = parseInt(urlParams.get('bootstrap_timeout'));
        }
        if (urlParams.has('bootstrap_adaptive')) {
            timeoutOverrides.adaptive = urlParams.get('bootstrap_adaptive') === 'true';
        }
        if (urlParams.has('bootstrap_min')) {
            timeoutOverrides.min = parseInt(urlParams.get('bootstrap_min'));
        }
        if (urlParams.has('bootstrap_max')) {
            timeoutOverrides.max = parseInt(urlParams.get('bootstrap_max'));
        }
        
        if (Object.keys(timeoutOverrides).length > 0) {
            console.log('[GameBootstrap] Applying URL parameter overrides:', timeoutOverrides);
            this.configureTimeout(timeoutOverrides);
        }
    }

    assessDevicePerformance() {
        const performance = {
            score: 1.0, // Base score (1.0 = average)
            factors: {}
        };
        
        try {
            // Check hardware concurrency (CPU cores)
            if (navigator.hardwareConcurrency) {
                const cores = navigator.hardwareConcurrency;
                performance.factors.cores = cores;
                if (cores >= 8) performance.score += 0.3;
                else if (cores >= 4) performance.score += 0.1;
                else if (cores <= 2) performance.score -= 0.2;
            }
            
            // Check memory (if available)
            if (navigator.deviceMemory) {
                const memory = navigator.deviceMemory;
                performance.factors.memory = memory;
                if (memory >= 8) performance.score += 0.2;
                else if (memory >= 4) performance.score += 0.1;
                else if (memory <= 2) performance.score -= 0.3;
            }
            
            // Check connection speed (if available)
            if (navigator.connection) {
                const connection = navigator.connection;
                performance.factors.connection = connection.effectiveType;
                if (connection.effectiveType === '4g') performance.score += 0.1;
                else if (connection.effectiveType === '3g') performance.score -= 0.1;
                else if (connection.effectiveType === '2g') performance.score -= 0.3;
            }
            
            // Simple performance test (DOM manipulation speed)
            const start = performance.now ? performance.now() : Date.now();
            const testDiv = document.createElement('div');
            for (let i = 0; i < 100; i++) {
                testDiv.style.left = i + 'px';
            }
            const domSpeed = (performance.now ? performance.now() : Date.now()) - start;
            performance.factors.domSpeed = domSpeed;
            
            if (domSpeed < 2) performance.score += 0.2;
            else if (domSpeed > 10) performance.score -= 0.2;
            
            // Clamp score between 0.3 and 2.0
            performance.score = Math.max(0.3, Math.min(2.0, performance.score));
            
            console.log('[GameBootstrap] Device performance assessed:', performance);
            return performance;
            
        } catch (error) {
            console.warn('[GameBootstrap] Performance assessment failed, using defaults:', error);
            return { score: 1.0, factors: {} };
        }
    }

    calculateFallbackTimeout() {
        if (!this.timeoutConfig.adaptive) {
            return this.timeoutConfig.base;
        }
        
        // Adaptive timeout based on device performance
        // Lower performance score = longer timeout
        const performanceMultiplier = 2.0 - this.devicePerformance.score; // Range: 0.0 to 1.7
        const adaptiveTimeout = Math.round(this.timeoutConfig.base * performanceMultiplier);
        
        // Clamp to min/max bounds
        const finalTimeout = Math.max(
            this.timeoutConfig.min,
            Math.min(this.timeoutConfig.max, adaptiveTimeout)
        );
        
        console.log(`[GameBootstrap] Calculated fallback timeout: ${finalTimeout}ms (performance score: ${this.devicePerformance.score.toFixed(2)})`);
        return finalTimeout;
    }

    configureTimeout(options = {}) {
        // Allow runtime configuration of timeout settings
        if (typeof options.base === 'number' && options.base > 0) {
            this.timeoutConfig.base = options.base;
        }
        if (typeof options.min === 'number' && options.min > 0) {
            this.timeoutConfig.min = options.min;
        }
        if (typeof options.max === 'number' && options.max > 0) {
            this.timeoutConfig.max = options.max;
        }
        if (typeof options.adaptive === 'boolean') {
            this.timeoutConfig.adaptive = options.adaptive;
        }
        
        console.log('[GameBootstrap] Timeout configuration updated:', this.timeoutConfig);
    }

    async init() {
        console.log('[GameBootstrap] Starting progressive initialization...');
        this.isInitializing = true; // Signal to emergency fallback that we're actively working
        
        this.showLoadingScreen();
        
        // Adaptive timeout for menu fallback based on device performance
        const fallbackTimeout = setTimeout(() => {
            this.triggerEmergencyFallback('Adaptive timeout fallback triggered');
        }, this.calculateFallbackTimeout());
        
        try {
            // Initialize ScreenManager if available
            if (typeof ScreenManager !== 'undefined') {
                this.screenManager = new ScreenManager();
                console.log('[GameBootstrap] ScreenManager initialized');
            }
            
            // Show menu and start background loading
            clearTimeout(fallbackTimeout);
            this.isInitializing = false; // Clear coordination flag when successful
            this.ensureMenuVisible('Normal initialization');
            this.showBackgroundProgressIndicator();
            this.initializeBackgroundSystems();
            
        } catch (error) {
            console.error('[GameBootstrap] Initialization failed:', error);
            clearTimeout(fallbackTimeout);
            this.isInitializing = false; // Clear coordination flag on error
            this.triggerEmergencyFallback('Error fallback');
        }
    }

    async initializeBackgroundSystems() {
        try {
            console.log('[GameBootstrap] Starting background system initialization...');
            this.updateBackgroundProgress('Starting background initialization...', 0);
            
            this.updateBackgroundProgress('Loading critical assets...', 1);
            await this.preloadCriticalAssets();
            
            this.updateBackgroundProgress('Initializing game systems...', 2);
            const initPromise = this.initializeGame();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Background initialization timeout')), 8000);
            });
            
            await Promise.race([initPromise, timeoutPromise]);
            this.updateBackgroundProgress('Finalizing systems...', 3);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            this.updateBackgroundProgress('Background initialization complete!', 4);
            
            console.log('[GameBootstrap] Background systems initialized successfully');
            setTimeout(() => this.hideBackgroundProgressIndicator(), 2000);
            
        } catch (error) {
            console.warn('[GameBootstrap] Background initialization failed:', error);
            this.updateBackgroundProgress(`Failed: ${error.message}`, -1);
            setTimeout(() => this.hideBackgroundProgressIndicator(), 3000);
            
            // Show non-blocking error notification
            this.showErrorNotification(error);
        }
    }

    ensureMenuVisible(reason, error = null) {
        console.log(`[GameBootstrap] Ensuring menu visible: ${reason}`);
        
        this.hideLoadingScreen();
        
        // Try ScreenManager first, fallback to shared direct method
        const screenManager = this.screenManager || (this.game && this.game.screenManager);
        let menuShown = false;
        
        if (screenManager) {
            try {
                screenManager.showScreen('main-menu');
                menuShown = true;
                console.log('[GameBootstrap] Menu shown via ScreenManager');
            } catch (err) {
                console.warn('[GameBootstrap] ScreenManager failed, using direct method');
            }
        }
        
        if (!menuShown) {
            // Use shared utility function instead of duplicate logic
            if (typeof Utils !== 'undefined' && Utils.dom && Utils.dom.showMainMenuDirect) {
                menuShown = Utils.dom.showMainMenuDirect();
                if (menuShown) {
                    console.log('[GameBootstrap] Menu shown via shared utility');
                }
            } else {
                // Final fallback if Utils not available
                const mainMenuScreen = document.getElementById('main-menu-screen');
                if (mainMenuScreen) {
                    const allScreens = document.querySelectorAll('.screen');
                    allScreens.forEach(screen => {
                        screen.style.display = 'none';
                        screen.classList.remove('active');
                    });
                    mainMenuScreen.style.display = 'flex';
                    mainMenuScreen.classList.add('active');
                    
                    // Apply overflow management for emergency fallback menu
                    document.body.style.overflow = 'auto';
                    
                    menuShown = true;
                    console.log('[GameBootstrap] Menu shown via emergency fallback with overflow management');
                }
            }
        }
        
        if (!menuShown) {
            console.error('[GameBootstrap] Failed to show main menu!');
            this.showCriticalError(error || new Error('Menu display failed'));
            return;
        }
        
        // Show error notification if there was an error (but don't block menu)
        if (error && reason.includes('Error')) {
            this.showErrorNotification(error);
        }
    }

    showLoadingScreen() {
        this.loadingScreenManager.showLoadingScreen();
        this.loadingScreen = this.loadingScreenManager.loadingScreen;
    }

    hideLoadingScreen() {
        this.loadingScreenManager.hideLoadingScreen();
    }

    getTransitionDuration(element) {
        return this.loadingScreenManager.getTransitionDuration(element);
    }

    // Generic method for smooth element transitions (delegated to LoadingScreenManager)
    smoothHideElement(element, fadeOutClass = 'fade-out', callback = null) {
        return this.loadingScreenManager.smoothHideElement(element, fadeOutClass, callback);
    }

    smoothShowElement(element, fadeInClass = 'fade-in', displayStyle = 'flex') {
        return this.loadingScreenManager.smoothShowElement(element, fadeInClass, displayStyle);
    }

    triggerEmergencyFallback(reason) {
        this.emergencyHandler.triggerEmergencyFallback(reason, (reason) => this.ensureMenuVisible(reason));
    }

    showEmergencyNotification(reason) {
        this.emergencyHandler.showEmergencyNotification(reason);
    }

    getEmergencyReason(reason) {
        return this.emergencyHandler.getEmergencyReason(reason);
    }

    logEmergencyDetails(reason) {
        this.emergencyHandler.logEmergencyDetails(reason);
    }

    showTroubleshootingInfo() {
        this.emergencyHandler.showTroubleshootingInfo(() => this.calculateFallbackTimeout());
    }

    async preloadCriticalAssets() {
        return this.assetLoader.loadCriticalAssets();
    }

    loadScript(src) {
        return this.assetLoader.loadScript(src);
    }

    loadStylesheet(href) {
        return this.assetLoader.loadCSS(href);
    }

    async initializeGame() {
        console.log('[GameBootstrap] Starting game initialization...');
        
        if (typeof Game === 'undefined') {
            console.error('[GameBootstrap] Game class not loaded');
            throw new Error('Game class not loaded');
        }

        try {
            // Get the canvas element
            const canvas = document.getElementById('gameCanvas');
            if (!canvas) {
                console.error('[GameBootstrap] Game canvas not found in DOM');
                throw new Error('Game canvas not found in DOM');
            }
            
            console.log('[GameBootstrap] Canvas found, setting up responsive canvas...');
            
            // Set responsive canvas size
            this.setupResponsiveCanvas(canvas);
            
            console.log('[GameBootstrap] Canvas configured, creating game instance...');
            
            this.game = new Game(canvas);
            
            // Publish global references used by various systems
            window.game = this.game;
            // Initialize camera cautiously to avoid inconsistent state
            if (!window.camera) {
                if (typeof Camera !== 'undefined') {
                    window.camera = new Camera(canvas);
                } else {
                    console.warn('[GameBootstrap] Camera class not available; proceeding without global camera');
                }
            } else if (typeof window.camera.setCanvas === 'function') {
                window.camera.setCanvas(canvas);
            }
            
            // Pass the early ScreenManager to the game if available
            if (this.screenManager) {
                this.game.screenManager = this.screenManager;
                console.log('[GameBootstrap] Reusing early ScreenManager in game');
            }
            
            // Add window resize event listener
            this.setupCanvasResizeHandler(canvas);
            
            console.log('[GameBootstrap] About to call game.initialize()...');
            const initResult = await this.game.initialize();
            
            if (initResult === false) {
                throw new Error('Game initialization returned false');
            }
            
            this.initialized = true;
            console.log('[GameBootstrap] Game initialization complete');
        } catch (error) {
            console.error('[GameBootstrap] Game initialization failed:', error);
            throw error; // Re-throw to trigger background error handler
        }
    }

    setupResponsiveCanvas(canvas) {
        try {
            // Get CONFIG values with validation and fallbacks
            let canvasWidth = 800; // Fallback
            let canvasHeight = 600; // Fallback
            
            if (typeof CONFIG !== 'undefined' && CONFIG.CANVAS_WIDTH && CONFIG.CANVAS_HEIGHT) {
                // Validate CONFIG values are valid numbers
                if (typeof CONFIG.CANVAS_WIDTH === 'number' && CONFIG.CANVAS_WIDTH > 0 && CONFIG.CANVAS_WIDTH <= 4096) {
                    canvasWidth = CONFIG.CANVAS_WIDTH;
                } else {
                    console.warn('[GameBootstrap] Invalid CONFIG.CANVAS_WIDTH, using fallback:', canvasWidth);
                }
                
                if (typeof CONFIG.CANVAS_HEIGHT === 'number' && CONFIG.CANVAS_HEIGHT > 0 && CONFIG.CANVAS_HEIGHT <= 4096) {
                    canvasHeight = CONFIG.CANVAS_HEIGHT;
                } else {
                    console.warn('[GameBootstrap] Invalid CONFIG.CANVAS_HEIGHT, using fallback:', canvasHeight);
                }
            } else {
                console.warn('[GameBootstrap] CONFIG not available, using fallback canvas dimensions');
            }
            
            // Get canvas container dimensions
            const container = canvas.parentElement;
            if (container) {
                const containerWidth = container.clientWidth;
                const containerHeight = container.clientHeight;
                
                if (containerWidth > 0 && containerHeight > 0) {
                    // Calculate appropriate canvas size based on container
                    const aspectRatio = canvasWidth / canvasHeight;
                    const containerAspectRatio = containerWidth / containerHeight;
                    
                    if (containerAspectRatio > aspectRatio) {
                        // Container is wider, fit to height
                        canvasHeight = Math.min(canvasHeight, containerHeight);
                        canvasWidth = canvasHeight * aspectRatio;
                    } else {
                        // Container is taller, fit to width
                        canvasWidth = Math.min(canvasWidth, containerWidth);
                        canvasHeight = canvasWidth / aspectRatio;
                    }
                    
                    console.log(`[GameBootstrap] Adjusted canvas size for container: ${canvasWidth}x${canvasHeight}`);
                }
            }
            
            // Get device pixel ratio for crisp rendering
            const dpr = window.devicePixelRatio || 1;
            const displayWidth = canvasWidth;
            const displayHeight = canvasHeight;
            
            // Set canvas size (use CSS pixels for simpler rendering)
            canvas.width = Math.floor(canvasWidth);
            canvas.height = Math.floor(canvasHeight);
            
            // Set CSS display size
            canvas.style.width = displayWidth + 'px';
            canvas.style.height = displayHeight + 'px';
            
            // No context scaling needed since we're using CSS pixels
            const ctx = canvas.getContext('2d');
            
            // Store dimensions for later use
            canvas.displayWidth = displayWidth;
            canvas.displayHeight = displayHeight;
            canvas.devicePixelRatio = dpr;
            
            console.log(`[GameBootstrap] Canvas configured: ${canvas.width}x${canvas.height} (internal), ${displayWidth}x${displayHeight} (display), DPR: ${dpr}`);
            
        } catch (error) {
            console.error('[GameBootstrap] Error setting up responsive canvas:', error);
            // Fallback to basic canvas setup
            canvas.width = 800;
            canvas.height = 600;
            canvas.style.width = '800px';
            canvas.style.height = '600px';
            console.log('[GameBootstrap] Fallback canvas setup applied');
        }
    }

    setupCanvasResizeHandler(canvas) {
        // Add window resize event listener with debouncing
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleCanvasResize(canvas);
            }, 250); // Debounce resize events
        };
        
        window.addEventListener('resize', handleResize);
        console.log('[GameBootstrap] Canvas resize handler setup complete');
    }

    handleCanvasResize(canvas) {
        try {
            console.log('[GameBootstrap] Handling canvas resize...');
            
            // Reconfigure canvas for new window size
            this.setupResponsiveCanvas(canvas);
            
            // Notify game of canvas size change
            if (this.game && typeof this.game.handleCanvasResize === 'function') {
                const dimensions = {
                    width: canvas.displayWidth || canvas.width,
                    height: canvas.displayHeight || canvas.height,
                    internalWidth: canvas.width,
                    internalHeight: canvas.height,
                    devicePixelRatio: canvas.devicePixelRatio || 1
                };
                this.game.handleCanvasResize(dimensions);
            }
            
            console.log('[GameBootstrap] Canvas resize handling complete');
            
        } catch (error) {
            console.error('[GameBootstrap] Error during canvas resize:', error);
        }
    }

    showErrorNotification(error) {
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="error-content">
                <strong>Initialization Error</strong>
                <p>${error.message}</p>
                <button onclick="location.reload()">Reload</button>
                <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(244, 67, 54, 0.9);
            color: white;
            padding: 16px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10001;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        document.body.appendChild(notification);
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }
    
    showCriticalError(error) {
        this.errorNotificationManager.showCriticalError(error);
    }

    setupGlobalErrorHandlers() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            if (!this.initialized) {
                this.triggerEmergencyFallback('Global error fallback');
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (!this.initialized) {
                this.triggerEmergencyFallback('Promise rejection fallback');
            }
        });
    }

    showBackgroundProgressIndicator() {
        this.progressIndicatorManager.showIndicator();
    }
    
    updateBackgroundProgress(message, step) {
        this.progressIndicatorManager.updateProgress(message, step);
    }
    
    hideBackgroundProgressIndicator() {
        this.progressIndicatorManager.hideIndicator();
    }

    // Utility methods still needed by the main class
    getTransitionDuration(element) {
        if (!element) return 300;
        
        const computedStyle = window.getComputedStyle(element);
        const transitionDuration = computedStyle.transitionDuration;
        
        if (transitionDuration && transitionDuration !== '0s') {
            // Parse duration (could be in seconds or milliseconds)
            const match = transitionDuration.match(/(\d*\.?\d+)(s|ms)/);
            if (match) {
                const value = parseFloat(match[1]);
                const unit = match[2];
                return unit === 's' ? value * 1000 : value;
            }
        }
        
        return 300; // Default fallback
    }

    smoothHideElement(element, fadeOutClass = 'fade-out', callback = null) {
        if (!element) return Promise.resolve();
        
        return new Promise((resolve) => {
            console.log('[GameBootstrap] Starting smooth hide transition for element:', element.id || element.className);
            
            // Add fade-out class
            element.classList.add(fadeOutClass);
            
            // Get transition duration
            const duration = this.getTransitionDuration(element) || 300;
            
            setTimeout(() => {
                element.style.display = 'none';
                element.classList.remove('active');
                
                if (callback) callback(element);
                
                console.log('[GameBootstrap] Element hidden after transition');
                resolve();
            }, duration);
        });
    }

    smoothShowElement(element, fadeInClass = 'fade-in', displayStyle = 'flex') {
        if (!element) return Promise.resolve();
        
        return new Promise((resolve) => {
            console.log('[GameBootstrap] Starting smooth show transition for element:', element.id || element.className);
            
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
                console.log('[GameBootstrap] Element shown after transition');
                resolve();
            }, duration);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const bootstrap = new GameBootstrap();
    bootstrap.setupGlobalErrorHandlers();
    // expose bootstrap early so emergency-fallback can see the initializing flag
    window.gameBootstrap = bootstrap;
    bootstrap.init();

    // Make troubleshooting function globally accessible
    window.GameBootstrap = {
        showTroubleshootingInfo: () => bootstrap.showTroubleshootingInfo(),
        instance: bootstrap
    };
});

window.GameBootstrap = window.GameBootstrap || {};