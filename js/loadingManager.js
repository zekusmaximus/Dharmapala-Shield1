import Utils from './utils.js';

class LoadingManager {
    constructor() {
        this.loadingScreen = null;
        this.progressBar = null;
        this.progressText = null;
        this.loadingMessage = null;
        
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.currentProgress = 0;
        this.targetProgress = 0;
        
        this.loadingQueue = [];
        this.loadedResources = new Map();
        this.failedResources = new Set();
        
        this.isLoading = false;
        this.loadingComplete = false;
        
        this.messages = [
            "Initializing digital dharma...",
            "Connecting to cyber monastery...",
            "Loading Buddhist algorithms...",
            "Synchronizing meditation protocols...",
            "Preparing defense systems...",
            "Calibrating enlightenment matrix...",
            "Loading tower specifications...",
            "Initializing enemy patterns...",
            "Setting up path algorithms...",
            "Finalizing game systems..."
        ];
        
        this.currentMessageIndex = 0;
        this.messageChangeInterval = 2000;
        this.lastMessageChange = 0;
        
        this.animationFrame = null;
        this.setupLoadingScreen();
    }

    setupLoadingScreen() {
        this.loadingScreen = document.getElementById('loading-screen');
        if (!this.loadingScreen) {
            console.warn('Loading screen element not found');
            return;
        }

        this.progressBar = this.loadingScreen.querySelector('.loading-progress');
        this.progressText = this.loadingScreen.querySelector('.loading-text');
        this.loadingMessage = this.loadingScreen.querySelector('.loading-message');
        
        if (!this.progressBar || !this.progressText) {
            console.warn('Loading screen elements incomplete');
        }
        
        if (!this.loadingMessage) {
            console.warn('Loading message element not found - using progress text for messages');
        }
    }

    show() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'flex';
            this.isLoading = true;
            this.loadingComplete = false;
            this.startAnimation();
        }
    }

    hide() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
            this.isLoading = false;
            this.stopAnimation();
        }
    }

    startAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.animate();
    }

    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    animate() {
        if (!this.isLoading) return;
        
        this.updateProgress();
        this.updateMessage();
        this.updateVisuals();
        
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    updateProgress() {
        if (this.totalAssets > 0) {
            this.targetProgress = (this.loadedAssets / this.totalAssets) * 100;
        }
        
        const diff = this.targetProgress - this.currentProgress;
        this.currentProgress += diff * 0.1;
        
        if (Math.abs(diff) < 0.1) {
            this.currentProgress = this.targetProgress;
        }
    }

    updateMessage() {
        const now = Utils.performance.now();
        
        if (now - this.lastMessageChange > this.messageChangeInterval) {
            this.currentMessageIndex = (this.currentMessageIndex + 1) % this.messages.length;
            this.lastMessageChange = now;
            
            if (this.loadingMessage) {
                this.loadingMessage.textContent = this.messages[this.currentMessageIndex];
            } else if (this.progressText) {
                // Fallback to progress text when loading message element is missing
                this.progressText.textContent = this.messages[this.currentMessageIndex];
            }
        }
    }

    updateVisuals() {
        if (this.progressBar) {
            this.progressBar.style.width = `${this.currentProgress}%`;
        }
        
        if (this.progressText) {
            this.progressText.textContent = `${Math.round(this.currentProgress)}%`;
        }
    }

    addToQueue(resources) {
        if (!Array.isArray(resources)) {
            resources = [resources];
        }
        
        for (const resource of resources) {
            if (typeof resource === 'string') {
                this.loadingQueue.push({
                    type: 'script',
                    url: resource,
                    name: resource
                });
            } else if (resource && resource.url) {
                this.loadingQueue.push({
                    type: resource.type || 'script',
                    url: resource.url,
                    name: resource.name || resource.url,
                    optional: resource.optional || false
                });
            }
        }
        
        this.totalAssets = this.loadingQueue.length;
    }

    async loadAll() {
        this.show();
        this.loadedAssets = 0;
        this.currentProgress = 0;
        this.targetProgress = 0;
        
        const promises = this.loadingQueue.map(resource => this.loadResource(resource));
        
        try {
            await Promise.allSettled(promises);
            this.loadingComplete = true;
            
            await this.finishLoading();
            
        } catch (error) {
            console.error('Loading failed:', error);
            this.handleLoadingError(error);
        }
    }

    async loadResource(resource) {
        try {
            let result;
            
            switch (resource.type) {
                case 'script':
                    result = await this.loadScript(resource.url);
                    break;
                case 'css':
                    result = await this.loadStylesheet(resource.url);
                    break;
                case 'image':
                    result = await this.loadImage(resource.url);
                    break;
                case 'audio':
                    result = await this.loadAudio(resource.url);
                    break;
                default:
                    throw new Error(`Unknown resource type: ${resource.type}`);
            }
            
            this.loadedResources.set(resource.name, result);
            this.loadedAssets++;
            
            console.log(`Loaded: ${resource.name}`);
            
        } catch (error) {
            if (!resource.optional) {
                console.error(`Failed to load required resource: ${resource.name}`, error);
                throw error;
            } else {
                console.warn(`Failed to load optional resource: ${resource.name}`, error);
                this.failedResources.add(resource.name);
                this.loadedAssets++;
            }
        }
    }

    loadScript(url) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${url}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve(script);
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });
    }

    loadStylesheet(url) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`link[href="${url}"]`)) {
                resolve();
                return;
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = () => resolve(link);
            link.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));
            document.head.appendChild(link);
        });
    }

    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    }

    loadAudio(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => resolve(audio);
            audio.onerror = () => reject(new Error(`Failed to load audio: ${url}`));
            audio.src = url;
        });
    }

    async finishLoading() {
        this.currentProgress = 100;
        this.targetProgress = 100;
        
        if (this.loadingMessage) {
            this.loadingMessage.textContent = "Loading complete!";
        } else if (this.progressText) {
            this.progressText.textContent = "Loading complete!";
        }
        
        await this.delay(500);
        
        this.hide();
    }

    handleLoadingError(error) {
        console.error('Critical loading error:', error);
        
        if (this.loadingMessage) {
            this.loadingMessage.textContent = "Loading failed. Please refresh the page.";
        } else if (this.progressText) {
            this.progressText.textContent = "Loading failed. Please refresh the page.";
        }
        
        if (this.progressBar) {
            this.progressBar.style.backgroundColor = '#ff0000';
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    preloadGameAssets() {
        const gameAssets = [
            { type: 'script', url: 'js/config.js', name: 'config' },
            { type: 'script', url: 'js/utils.js', name: 'utils' },
            { type: 'script', url: 'js/sprite.js', name: 'sprite' },
            { type: 'script', url: 'js/input.js', name: 'input' },
            { type: 'script', url: 'js/camera.js', name: 'camera' },
            { type: 'script', url: 'js/level.js', name: 'level' },
            { type: 'script', url: 'js/audioManager.js', name: 'audio' },
            { type: 'script', url: 'js/saveSystem.js', name: 'save' },
            { type: 'script', url: 'js/particle.js', name: 'particle' },
            { type: 'script', url: 'js/pathGenerator.js', name: 'pathGen', optional: true },
            { type: 'script', url: 'js/defense.js', name: 'defense' },
            { type: 'script', url: 'js/enemy.js', name: 'enemy' },
            { type: 'script', url: 'js/achievementManager.js', name: 'achievements' },
            { type: 'script', url: 'js/game.js', name: 'game' },
            { type: 'css', url: 'css/ui-screens.css', name: 'ui-styles', optional: true },
            { type: 'css', url: 'css/mobile.css', name: 'mobile-styles', optional: true }
        ];
        
        this.addToQueue(gameAssets);
        return this.loadAll();
    }

    getLoadedResource(name) {
        return this.loadedResources.get(name);
    }

    isResourceLoaded(name) {
        return this.loadedResources.has(name);
    }

    hasFailedResource(name) {
        return this.failedResources.has(name);
    }

    getProgress() {
        return {
            current: this.currentProgress,
            target: this.targetProgress,
            loaded: this.loadedAssets,
            total: this.totalAssets,
            complete: this.loadingComplete
        };
    }

    reset() {
        this.loadingQueue.length = 0;
        this.loadedResources.clear();
        this.failedResources.clear();
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.currentProgress = 0;
        this.targetProgress = 0;
        this.loadingComplete = false;
        this.currentMessageIndex = 0;
    }

    setCustomMessages(messages) {
        if (Array.isArray(messages) && messages.length > 0) {
            this.messages = messages;
            this.currentMessageIndex = 0;
        }
    }

    setMessageChangeInterval(interval) {
        this.messageChangeInterval = Math.max(500, interval);
    }
}

const loadingManager = new LoadingManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingManager;
} else {
    window.LoadingManager = LoadingManager;
    window.loadingManager = loadingManager;
}