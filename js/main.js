class GameBootstrap {
    constructor() {
        this.loadingScreen = null;
        this.game = null;
        this.screenManager = null;
        this.initialized = false;
    }

    async init() {
        try {
            this.showLoadingScreen();
            
            // Initialize screen manager early
            if (typeof ScreenManager !== 'undefined') {
                this.screenManager = new ScreenManager();
                console.log('[GameBootstrap] ScreenManager initialized early');
            }
            
            await this.preloadCriticalAssets();
            await this.initializeGame();
            this.hideLoadingScreen();
            this.showMainMenu();
        } catch (error) {
            this.handleCriticalError(error);
        }
    }

    showLoadingScreen() {
        const gameScreen = document.getElementById('game-screen');
        const loadingScreen = document.getElementById('loading-screen');
        
        if (gameScreen) gameScreen.style.display = 'none';
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            this.loadingScreen = loadingScreen;
            console.log('[GameBootstrap] Loading screen shown');
        } else {
            console.warn('[GameBootstrap] Loading screen element not found');
        }
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
    }

    async preloadCriticalAssets() {
        const essentialAssets = [
            'js/game.js',
            'js/config.js',
            'js/utils.js',
            'css/styles.css'
        ];

        for (const asset of essentialAssets) {
            try {
                if (asset.endsWith('.js')) {
                    await this.loadScript(asset);
                } else if (asset.endsWith('.css')) {
                    await this.loadStylesheet(asset);
                }
            } catch (error) {
                console.warn(`Failed to load ${asset}:`, error);
            }
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    loadStylesheet(href) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`link[href="${href}"]`)) {
                resolve();
                return;
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    async initializeGame() {
        if (typeof Game === 'undefined') {
            throw new Error('Game class not loaded');
        }

        try {
            // Get the canvas element
            const canvas = document.getElementById('gameCanvas');
            if (!canvas) {
                throw new Error('Game canvas not found in DOM');
            }
            
            // Set responsive canvas size
            this.setupResponsiveCanvas(canvas);
            
            console.log('[GameBootstrap] Canvas found and configured');
            
            this.game = new Game(canvas);
            
            // Pass the early ScreenManager to the game if available
            if (this.screenManager) {
                this.game.screenManager = this.screenManager;
                console.log('[GameBootstrap] Reusing early ScreenManager in game');
            }
            
            // Add window resize event listener
            this.setupCanvasResizeHandler(canvas);
            
            await this.game.initialize();
            this.initialized = true;
            console.log('[GameBootstrap] Game initialization complete');
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.handleGameInitError(error);
            throw error; // Re-throw to trigger error handler
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
            
            // Set canvas internal resolution (accounting for device pixel ratio)
            canvas.width = Math.floor(canvasWidth * dpr);
            canvas.height = Math.floor(canvasHeight * dpr);
            
            // Set CSS display size
            canvas.style.width = displayWidth + 'px';
            canvas.style.height = displayHeight + 'px';
            
            // Scale context for device pixel ratio
            const ctx = canvas.getContext('2d');
            if (ctx && dpr !== 1) {
                ctx.scale(dpr, dpr);
            }
            
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

    showMainMenu() {
        // Use the early ScreenManager or the game's ScreenManager to show main menu first
        const screenManager = this.screenManager || (this.game && this.game.screenManager);
        
        if (screenManager) {
            // Show main menu screen as the starting point
            screenManager.showScreen('main-menu');
            console.log('[GameBootstrap] Main menu screen shown as starting point');
        } else {
            // Fallback method if ScreenManager not ready
            this.hideAllScreensExcept('main-menu-screen');
            const mainMenuScreen = document.getElementById('main-menu-screen');
            
            if (mainMenuScreen) {
                mainMenuScreen.style.display = 'flex';
                mainMenuScreen.classList.add('active');
                console.log('[GameBootstrap] Main menu screen shown (fallback)');
            }
        }
        
        // Hide loading screen
        this.hideLoadingScreen();
    }

    hideAllScreensExcept(keepScreenId) {
        const allScreens = document.querySelectorAll('.screen');
        allScreens.forEach(screen => {
            if (screen.id !== keepScreenId) {
                screen.style.display = 'none';
                screen.classList.remove('active');
            }
        });
    }

    handleGameInitError(error) {
        const fallbackHTML = `
            <div class="error-screen">
                <h2>Game Initialization Failed</h2>
                <p>The game encountered an error during startup:</p>
                <pre>${error.message}</pre>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
        
        document.body.innerHTML = fallbackHTML;
    }

    handleCriticalError(error) {
        console.error('Critical error during game startup:', error);
        
        const errorScreen = document.createElement('div');
        errorScreen.className = 'critical-error-screen';
        errorScreen.innerHTML = `
            <div class="error-content">
                <h1>Dharmapala Shield - Startup Error</h1>
                <p>The game failed to start properly. Please check your browser console for details.</p>
                <p>Error: ${error.message}</p>
                <button onclick="location.reload()" class="retry-button">Reload Game</button>
            </div>
        `;
        
        errorScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            color: #00d4ff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Orbitron', monospace;
            z-index: 10000;
        `;
        
        document.body.appendChild(errorScreen);
    }

    setupGlobalErrorHandlers() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            if (!this.initialized) {
                this.handleCriticalError(event.error);
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (!this.initialized) {
                this.handleCriticalError(new Error(event.reason));
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const bootstrap = new GameBootstrap();
    bootstrap.setupGlobalErrorHandlers();
    bootstrap.init();
});

window.GameBootstrap = GameBootstrap;