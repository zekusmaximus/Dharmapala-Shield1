/**
 * AssetLoader - Handles asset loading and preloading for GameBootstrap
 */
class AssetLoader {
    constructor() {
        this.loadedAssets = new Set();
    }

    /**
     * Preloads critical assets needed for game initialization
     * @returns {Promise} Promise that resolves when all assets are loaded
     */
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
                console.warn(`[AssetLoader] Failed to load ${asset}:`, error);
            }
        }
    }

    /**
     * Loads a JavaScript file
     * @param {string} src - Source URL of the script
     * @returns {Promise} Promise that resolves when script is loaded
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`) || this.loadedAssets.has(src)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                this.loadedAssets.add(src);
                console.log(`[AssetLoader] Script loaded: ${src}`);
                resolve();
            };
            script.onerror = () => {
                console.error(`[AssetLoader] Failed to load script: ${src}`);
                reject(new Error(`Failed to load script: ${src}`));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Loads a CSS stylesheet
     * @param {string} href - URL of the stylesheet
     * @returns {Promise} Promise that resolves when stylesheet is loaded
     */
    loadStylesheet(href) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`link[href="${href}"]`) || this.loadedAssets.has(href)) {
                resolve();
                return;
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => {
                this.loadedAssets.add(href);
                console.log(`[AssetLoader] Stylesheet loaded: ${href}`);
                resolve();
            };
            link.onerror = () => {
                console.error(`[AssetLoader] Failed to load stylesheet: ${href}`);
                reject(new Error(`Failed to load stylesheet: ${href}`));
            };
            document.head.appendChild(link);
        });
    }

    /**
     * Loads multiple assets in parallel
     * @param {Array} assets - Array of asset objects with type and src properties
     * @returns {Promise} Promise that resolves when all assets are loaded
     */
    async loadAssets(assets) {
        const loadPromises = assets.map(asset => {
            if (asset.type === 'script') {
                return this.loadScript(asset.src);
            } else if (asset.type === 'stylesheet') {
                return this.loadStylesheet(asset.src);
            } else {
                console.warn(`[AssetLoader] Unknown asset type: ${asset.type}`);
                return Promise.resolve();
            }
        });

        try {
            await Promise.all(loadPromises);
            console.log(`[AssetLoader] All ${assets.length} assets loaded successfully`);
        } catch (error) {
            console.error('[AssetLoader] Some assets failed to load:', error);
            throw error;
        }
    }

    /**
     * Checks if an asset is already loaded
     * @param {string} src - Source URL to check
     * @returns {boolean} True if asset is loaded
     */
    isAssetLoaded(src) {
        return this.loadedAssets.has(src);
    }

    /**
     * Gets the list of loaded assets
     * @returns {Array} Array of loaded asset URLs
     */
    getLoadedAssets() {
        return Array.from(this.loadedAssets);
    }

    /**
     * Preloads an image
     * @param {string} src - Image source URL
     * @returns {Promise} Promise that resolves when image is loaded
     */
    preloadImage(src) {
        return new Promise((resolve, reject) => {
            if (this.loadedAssets.has(src)) {
                resolve();
                return;
            }

            const img = new Image();
            img.onload = () => {
                this.loadedAssets.add(src);
                console.log(`[AssetLoader] Image loaded: ${src}`);
                resolve();
            };
            img.onerror = () => {
                console.error(`[AssetLoader] Failed to load image: ${src}`);
                reject(new Error(`Failed to load image: ${src}`));
            };
            img.src = src;
        });
    }

    /**
     * Preloads multiple images
     * @param {Array} imageSources - Array of image source URLs
     * @returns {Promise} Promise that resolves when all images are loaded
     */
    async preloadImages(imageSources) {
        const loadPromises = imageSources.map(src => this.preloadImage(src));
        
        try {
            await Promise.all(loadPromises);
            console.log(`[AssetLoader] All ${imageSources.length} images loaded successfully`);
        } catch (error) {
            console.error('[AssetLoader] Some images failed to load:', error);
            throw error;
        }
    }
}
