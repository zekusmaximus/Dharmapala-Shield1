class GameBootstrap {
    constructor() {
        this.loadingScreen = null;
        this.game = null;
        this.initialized = false;
    }

    async init() {
        try {
            this.showLoadingScreen();
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
            this.game = new Game();
            await this.game.initialize();
            this.initialized = true;
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.handleGameInitError(error);
        }
    }

    showMainMenu() {
        const mainMenuScreen = document.getElementById('main-menu-screen');
        const gameScreen = document.getElementById('game-screen');
        
        if (mainMenuScreen) {
            mainMenuScreen.style.display = 'flex';
        }
        if (gameScreen) {
            gameScreen.style.display = 'none';
        }
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