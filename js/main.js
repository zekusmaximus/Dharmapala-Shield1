import LoadingScreenManager from './LoadingScreenManager.js';
import ProgressIndicatorManager from './ProgressIndicatorManager.js';
import AssetLoader from './AssetLoader.js';
import ErrorNotificationManager from './ErrorNotificationManager.js';
import Camera from './camera.js';

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

        this.devicePerformance = this.assessDevicePerformance();

        this.loadingScreenManager = new LoadingScreenManager();
        this.progressIndicatorManager = new ProgressIndicatorManager();
        this.assetLoader = new AssetLoader();
        this.errorNotificationManager = new ErrorNotificationManager();
    }

    applyConfigurationOverrides() {}

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
            if (typeof window.ScreenManager !== 'undefined') {
                this.screenManager = new window.ScreenManager();
            }
            this.ensureMenuVisible('Normal initialization');
            this.showBackgroundProgressIndicator();
            await this.initializeBackgroundSystems();
            this.hideBackgroundProgressIndicator();
        } catch (error) {
            console.error('[GameBootstrap] Initialization failed:', error);
            this.showErrorNotification(error);
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
            this.showErrorNotification(error);
            throw error;
        }
    }

    ensureMenuVisible(reason, error = null) {
        this.hideLoadingScreen();
        const screenManager = this.screenManager || (this.game && this.game.screenManager);
        if (screenManager && typeof screenManager.showScreen === 'function') {
            try { screenManager.showScreen('main-menu'); return; } catch {}
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

    showLoadingScreen() { this.loadingScreenManager.show?.(); }
    hideLoadingScreen() { this.loadingScreenManager.hide?.(); }
    showBackgroundProgressIndicator() { this.progressIndicatorManager.show?.(); }
    hideBackgroundProgressIndicator() { this.progressIndicatorManager.hide?.(); }
    updateBackgroundProgress(message, stepIndex) { this.progressIndicatorManager.update?.(message, stepIndex, this.backgroundProgress.total); }
    showErrorNotification(error) { this.errorNotificationManager.showError?.(error); }

    async preloadCriticalAssets() { return this.assetLoader.loadCriticalAssets(); }
    loadScript(src) { return this.assetLoader.loadScript(src); }
    loadStylesheet(href) { return this.assetLoader.loadCSS(href); }

    async initializeGame() {
        const { default: Game } = await import('./game.js');
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) throw new Error('Game canvas not found in DOM');
        this.setupResponsiveCanvas(canvas);
        this.game = new Game(canvas);
        // Initialize camera via ESM
        if (!window.camera) {
            window.camera = new Camera(canvas);
        } else if (window.camera && typeof window.camera.setCanvas === 'function') {
            window.camera.setCanvas(canvas);
        }
        if (this.screenManager) this.game.screenManager = this.screenManager;
        this.setupCanvasResizeHandler(canvas);
        const initResult = await this.game.initialize();
        if (initResult === false) throw new Error('Game initialization returned false');
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
        } catch {}
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