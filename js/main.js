export default class GameBootstrap {
    constructor() {
        this.loadingScreen = null;
        this.game = null;
        this.screenManager = null;
        this.initialized = false;
        this.progressIndicator = null;
        this.backgroundProgress = {
            total: 4,
            completed: 0,
            steps: ['Assets', 'Systems', 'Game Core', 'Finalization']
        };

        // Simple device performance snapshot (non-critical)
        this.devicePerformance = this.assessDevicePerformance();

        // Fallback stub classes for missing dependencies
        class FallbackLoadingScreenManager {
            constructor() {
                console.warn('[GameBootstrap] LoadingScreenManager dependency missing. Using fallback.');
            }
            show() {
                console.warn('[GameBootstrap] FallbackLoadingScreenManager.show() called.');
            }
            hide() {
                console.warn('[GameBootstrap] FallbackLoadingScreenManager.hide() called.');
            }
        }
        class FallbackProgressIndicatorManager {
            constructor() {
                console.warn('[GameBootstrap] ProgressIndicatorManager dependency missing. Using fallback.');
            }
            show() {
                console.warn('[GameBootstrap] FallbackProgressIndicatorManager.show() called.');
            }
            hide() {
                console.warn('[GameBootstrap] FallbackProgressIndicatorManager.hide() called.');
            }
            update(progress, message) {
                console.warn('[GameBootstrap] FallbackProgressIndicatorManager.update() called.', { progress, message });
            }
        }
        class FallbackAssetLoader {
            constructor() {
                console.warn('[GameBootstrap] AssetLoader dependency missing. Using fallback.');
            }
            loadCriticalAssets() {
                console.warn('[GameBootstrap] FallbackAssetLoader.loadCriticalAssets() called.');
                return Promise.resolve();
            }
            loadScript() {
                console.warn('[GameBootstrap] FallbackAssetLoader.loadScript() called.');
                return Promise.resolve();
            }
            loadCSS() {
                console.warn('[GameBootstrap] FallbackAssetLoader.loadCSS() called.');
                return Promise.resolve();
            }
        }
        class FallbackErrorNotificationManager {
            constructor() {
                console.warn('[GameBootstrap] ErrorNotificationManager dependency missing. Using fallback.');
            }
            showError(error) {
                console.warn('[GameBootstrap] FallbackErrorNotificationManager.showError() called.', error);
            }
        }

        // Initialize module managers (resolved from window for compatibility)
        this.loadingScreenManager = new (window.LoadingScreenManager || FallbackLoadingScreenManager)();
        this.progressIndicatorManager = new (window.ProgressIndicatorManager || FallbackProgressIndicatorManager)();
        this.assetLoader = new (window.AssetLoader || FallbackAssetLoader)();
        this.errorNotificationManager = new (window.ErrorNotificationManager || FallbackErrorNotificationManager)();
    }

    applyConfigurationOverrides() {
        // No-op for now; kept for API compatibility if CONFIG is used elsewhere
    }

    assessDevicePerformance() {
        const performanceSummary = { score: 1.0, factors: {} };
        try {
            if (navigator.hardwareConcurrency) {
                const cores = navigator.hardwareConcurrency;
                performanceSummary.factors.cores = cores;
                if (cores >= 8) performanceSummary.score += 0.3;
                else if (cores >= 4) performanceSummary.score += 0.1;
                else if (cores <= 2) performanceSummary.score -= 0.2;
            }
            if (navigator.deviceMemory) {
                const memory = navigator.deviceMemory;
                performanceSummary.factors.memory = memory;
                if (memory >= 8) performanceSummary.score += 0.2;
                else if (memory >= 4) performanceSummary.score += 0.1;
                else if (memory <= 2) performanceSummary.score -= 0.3;
            }
            return performanceSummary;
        } catch {
            return performanceSummary;
        }
    }

    async init() {
        this.showLoadingScreen();
        try {
            // Initialize ScreenManager if available (non-blocking for menu)
            if (typeof window.ScreenManager !== 'undefined') {
                this.screenManager = new window.ScreenManager();
            }

            // Immediately show menu; continue background initialization
            this.ensureMenuVisible('Normal initialization');
            this.showBackgroundProgressIndicator();

            try {
                await this.initializeBackgroundSystems();
            } catch (error) {
                console.error('[GameBootstrap] Background systems initialization failed:', error);
                this.showErrorNotification(error);
                // Optionally, update the UI or progress indicator here if needed
                // Ensure menu remains visible even on error in background systems
                this.ensureMenuVisible('Background systems error', error);
            }
            this.hideBackgroundProgressIndicator();
        } catch (error) {
            console.error('[GameBootstrap] Initialization failed:', error);
            this.showErrorNotification(error);
            // Ensure menu remains visible even on error
            this.ensureMenuVisible('Error initialization path', error);
        } finally {
            this.hideLoadingScreen();
        }
    }

    async initializeBackgroundSystems() {
        try {
            this.updateBackgroundProgress('Loading critical assets...', 1);
            await this.preloadCriticalAssets();

            this.updateBackgroundProgress('Initializing game systems...', 2);
            await this.initializeGame();

            this.updateBackgroundProgress('Finalizing systems...', 3);
            await new Promise(resolve => setTimeout(resolve, 200));
            this.updateBackgroundProgress('Ready!', 4);
        } catch (error) {
            this.updateBackgroundProgress(`Failed: ${error.message}`, -1);
            throw error;
        }
    }

    ensureMenuVisible(reason, error = null) {
        // Hide loading screen
        this.hideLoadingScreen();

        // Prefer ScreenManager, fallback to direct DOM manipulation
        const screenManager = this.screenManager || (this.game && this.game.screenManager);
        if (screenManager && typeof screenManager.showScreen === 'function') {
            try {
                screenManager.showScreen('main-menu');
                return;
            } catch (error) {
                console.error('Failed to show main menu screen via screenManager:', error);
            }
        }
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
            loadingScreen.classList.remove('active');
        }
        const mainMenuScreen = document.getElementById('main-menu-screen');
        if (mainMenuScreen) {
            mainMenuScreen.style.display = 'flex';
            mainMenuScreen.classList.add('active');
        }
    }

    showLoadingScreen() {
        if (this.loadingScreenManager && this.loadingScreenManager.show) {
            this.loadingScreenManager.show();
        } else {
            const loading = document.getElementById('loading-screen');
            if (loading) {
                loading.style.display = 'flex';
                loading.classList.add('active');
            }
        }
    }

    hideLoadingScreen() {
        if (this.loadingScreenManager && this.loadingScreenManager.hide) {
            this.loadingScreenManager.hide();
        } else {
            const loading = document.getElementById('loading-screen');
            if (loading) {
                loading.style.display = 'none';
                loading.classList.remove('active');
            }
        }
    }

    showBackgroundProgressIndicator() {
        if (this.progressIndicatorManager && this.progressIndicatorManager.show) {
            this.progressIndicatorManager.show();
        }
    }

    hideBackgroundProgressIndicator() {
        if (this.progressIndicatorManager && this.progressIndicatorManager.hide) {
            this.progressIndicatorManager.hide();
        }
    }

    updateBackgroundProgress(message, stepIndex) {
        if (this.progressIndicatorManager && this.progressIndicatorManager.update) {
            this.progressIndicatorManager.update(message, stepIndex, this.backgroundProgress.total);
        }
    }

    showErrorNotification(error) {
        if (this.errorNotificationManager && this.errorNotificationManager.showError) {
            this.errorNotificationManager.showError(error);
        }
    }

    async preloadCriticalAssets() {
        return this.assetLoader.loadCriticalAssets();
    }

    loadScript(src) { return this.assetLoader.loadScript(src); }
    loadStylesheet(href) { return this.assetLoader.loadCSS(href); }

    async initializeGame() {
        if (typeof window.Game === 'undefined') {
            throw new Error('Game class not loaded');
        }
        // Get the canvas element
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            throw new Error('Game canvas not found in DOM');
        }
        this.setupResponsiveCanvas(canvas);
        this.game = new window.Game(canvas);

        // For backward compatibility with existing systems still using window.game
        window.game = this.game;

        // Initialize camera if available
        if (!window.camera && typeof window.Camera !== 'undefined') {
            window.camera = new window.Camera(canvas);
        } else if (window.camera && typeof window.camera.setCanvas === 'function') {
            window.camera.setCanvas(canvas);
        }

        // Pass ScreenManager if we created one early
        if (this.screenManager) {
            this.game.screenManager = this.screenManager;
        }

        this.setupCanvasResizeHandler(canvas);
        const initResult = await this.game.initialize();
        if (initResult === false) {
            throw new Error('Game initialization returned false');
        }
        this.initialized = true;
    }

    setupResponsiveCanvas(canvas) {
        try {
            let canvasWidth = 800;
            let canvasHeight = 600;
            if (typeof window.CONFIG !== 'undefined' && window.CONFIG.CANVAS_WIDTH && window.CONFIG.CANVAS_HEIGHT) {
                if (typeof window.CONFIG.CANVAS_WIDTH === 'number' && window.CONFIG.CANVAS_WIDTH > 0 && window.CONFIG.CANVAS_WIDTH <= 4096) {
                    canvasWidth = window.CONFIG.CANVAS_WIDTH;
                }
                if (typeof window.CONFIG.CANVAS_HEIGHT === 'number' && window.CONFIG.CANVAS_HEIGHT > 0 && window.CONFIG.CANVAS_HEIGHT <= 4096) {
                    canvasHeight = window.CONFIG.CANVAS_HEIGHT;
                }
            }
            const container = canvas.parentElement;
            if (container) {
                const containerWidth = container.clientWidth;
                const containerHeight = container.clientHeight;
                const aspectRatio = canvasWidth / canvasHeight;
                const containerAspectRatio = containerWidth / containerHeight;
                if (containerWidth > 0 && containerHeight > 0) {
                    if (containerAspectRatio > aspectRatio) {
                        canvasHeight = Math.min(canvasHeight, containerHeight);
                        canvasWidth = canvasHeight * aspectRatio;
                    } else {
                        canvasWidth = Math.min(canvasWidth, containerWidth);
                        canvasHeight = canvasWidth / aspectRatio;
                    }
                }
            }
            canvas.width = Math.floor(canvasWidth);
            canvas.height = Math.floor(canvasHeight);
            canvas.style.width = canvasWidth + 'px';
            canvas.style.height = canvasHeight + 'px';
        } catch (err) {
            console.error('Error in setupResponsiveCanvas:', err);
        }
    }

    setupCanvasResizeHandler(canvas) {
        window.addEventListener('resize', () => {
            this.setupResponsiveCanvas(canvas);
            if (this.game && typeof this.game.handleResize === 'function') {
                this.game.handleResize();
            }
        });
    }
}