class ImageOptimizer {
    constructor() {
        this.cache = new Map();
        this.loadingQueue = new Map();
        this.optimizedCache = new Map();
        
        // Configuration
        this.maxCacheSize = 50; // Maximum number of cached images
        this.compressionQuality = 0.8;
        this.maxTextureSize = 1024;
        this.supportedFormats = ['webp', 'jpg', 'png'];
        
        // Performance settings
        this.isLowMemoryDevice = this.detectLowMemoryDevice();
        this.useCompression = true;
        this.enableMipmaps = !this.isLowMemoryDevice;
        
        // Statistics
        this.stats = {
            imagesLoaded: 0,
            totalOriginalSize: 0,
            totalOptimizedSize: 0,
            cacheMisses: 0,
            cacheHits: 0
        };
        
        this.initializeOptimizer();
    }

    detectLowMemoryDevice() {
        // Detect if device has limited memory
        const memory = navigator.deviceMemory || 4; // Default to 4GB if unknown
        const isLowEnd = memory <= 2;
        
        console.log(`[ImageOptimizer] Device memory: ${memory}GB, Low-end: ${isLowEnd}`);
        return isLowEnd;
    }

    initializeOptimizer() {
        // Adjust settings based on device capabilities
        if (this.isLowMemoryDevice) {
            this.maxCacheSize = 25;
            this.maxTextureSize = 512;
            this.compressionQuality = 0.6;
            this.enableMipmaps = false;
        }
        
        // Check for WebP support
        this.supportsWebP = this.checkWebPSupport();
        
        console.log(`[ImageOptimizer] Initialized - Cache size: ${this.maxCacheSize}, WebP: ${this.supportsWebP}`);
    }

    checkWebPSupport() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        
        try {
            return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        } catch (e) {
            return false;
        }
    }

    async loadImage(src, options = {}) {
        const cacheKey = this.generateCacheKey(src, options);
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.cache.get(cacheKey);
        }
        
        // Check if already loading
        if (this.loadingQueue.has(cacheKey)) {
            return this.loadingQueue.get(cacheKey);
        }
        
        // Start loading
        const loadPromise = this.loadAndOptimizeImage(src, options);
        this.loadingQueue.set(cacheKey, loadPromise);
        
        try {
            const result = await loadPromise;
            this.cache.set(cacheKey, result);
            this.loadingQueue.delete(cacheKey);
            
            // Manage cache size
            this.manageCacheSize();
            
            this.stats.cacheMisses++;
            this.stats.imagesLoaded++;
            
            return result;
        } catch (error) {
            this.loadingQueue.delete(cacheKey);
            throw error;
        }
    }

    async loadAndOptimizeImage(src, options = {}) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = async () => {
                try {
                    this.stats.totalOriginalSize += this.estimateImageSize(img);
                    
                    const optimizedImage = await this.optimizeImage(img, options);
                    this.stats.totalOptimizedSize += this.estimateImageSize(optimizedImage);
                    
                    resolve(optimizedImage);
                } catch (error) {
                    console.error('[ImageOptimizer] Failed to optimize image:', error);
                    resolve(img); // Return original on optimization failure
                }
            };
            
            img.onerror = () => {
                console.error(`[ImageOptimizer] Failed to load image: ${src}`);
                reject(new Error(`Failed to load image: ${src}`));
            };
            
            // Handle cross-origin images
            if (options.crossOrigin) {
                img.crossOrigin = options.crossOrigin;
            }
            
            img.src = src;
        });
    }

    async optimizeImage(img, options = {}) {
        const {
            maxWidth = this.maxTextureSize,
            maxHeight = this.maxTextureSize,
            quality = this.compressionQuality,
            format = 'auto'
        } = options;
        
        // Check if optimization is needed
        if (!this.needsOptimization(img, maxWidth, maxHeight)) {
            return img;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate optimal dimensions
        const { width, height } = this.calculateOptimalSize(img, maxWidth, maxHeight);
        
        canvas.width = width;
        canvas.height = height;
        
        // Configure canvas for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to optimized format
        const optimizedFormat = this.selectOptimalFormat(format);
        const dataUrl = canvas.toDataURL(optimizedFormat, quality);
        
        // Create optimized image
        return this.createImageFromDataUrl(dataUrl);
    }

    needsOptimization(img, maxWidth, maxHeight) {
        return (
            img.width > maxWidth ||
            img.height > maxHeight ||
            this.useCompression
        );
    }

    calculateOptimalSize(img, maxWidth, maxHeight) {
        let { width, height } = img;
        
        // Calculate scale factor to fit within max dimensions
        const scaleX = width > maxWidth ? maxWidth / width : 1;
        const scaleY = height > maxHeight ? maxHeight / height : 1;
        const scale = Math.min(scaleX, scaleY);
        
        return {
            width: Math.floor(width * scale),
            height: Math.floor(height * scale)
        };
    }

    selectOptimalFormat(format) {
        if (format === 'auto') {
            return this.supportsWebP ? 'image/webp' : 'image/jpeg';
        }
        
        return format;
    }

    createImageFromDataUrl(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    generateCacheKey(src, options) {
        const optionsStr = JSON.stringify(options);
        return `${src}_${optionsStr}`;
    }

    manageCacheSize() {
        if (this.cache.size <= this.maxCacheSize) return;
        
        // Remove oldest entries (simple LRU approximation)
        const entries = Array.from(this.cache.entries());
        const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
        
        toRemove.forEach(([key]) => {
            this.cache.delete(key);
        });
        
        console.log(`[ImageOptimizer] Cache cleaned, removed ${toRemove.length} entries`);
    }

    estimateImageSize(img) {
        // Rough estimation of image size in bytes
        return img.width * img.height * 4; // Assuming RGBA
    }

    // Sprite sheet optimization
    async createSpriteAtlas(images, options = {}) {
        const {
            maxWidth = 2048,
            maxHeight = 2048,
            padding = 2
        } = options;
        
        console.log(`[ImageOptimizer] Creating sprite atlas from ${images.length} images`);
        
        // Load all images
        const loadedImages = await Promise.all(
            images.map(img => typeof img === 'string' ? this.loadImage(img) : img)
        );
        
        // Sort by size for better packing
        const sortedImages = loadedImages
            .map((img, index) => ({ img, index, area: img.width * img.height }))
            .sort((a, b) => b.area - a.area);
        
        // Simple bin packing algorithm
        const atlas = this.packImages(sortedImages, maxWidth, maxHeight, padding);
        
        if (!atlas) {
            throw new Error('Failed to pack images into atlas');
        }
        
        return atlas;
    }

    packImages(images, maxWidth, maxHeight, padding) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Start with minimum size and grow as needed
        let atlasWidth = 256;
        let atlasHeight = 256;
        
        while (atlasWidth <= maxWidth && atlasHeight <= maxHeight) {
            const positions = this.tryPackImages(images, atlasWidth, atlasHeight, padding);
            
            if (positions) {
                // Successful packing
                canvas.width = atlasWidth;
                canvas.height = atlasHeight;
                
                const spriteMap = new Map();
                
                // Draw images to atlas
                positions.forEach((pos, index) => {
                    const { img, index: originalIndex } = images[index];
                    ctx.drawImage(img, pos.x, pos.y);
                    
                    spriteMap.set(originalIndex, {
                        x: pos.x,
                        y: pos.y,
                        width: img.width,
                        height: img.height
                    });
                });
                
                return {
                    canvas,
                    spriteMap,
                    width: atlasWidth,
                    height: atlasHeight
                };
            }
            
            // Try larger size
            if (atlasWidth === atlasHeight) {
                atlasWidth *= 2;
            } else {
                atlasHeight *= 2;
            }
        }
        
        return null;
    }

    tryPackImages(images, atlasWidth, atlasHeight, padding) {
        // Simple shelf packing algorithm
        const shelves = [];
        const positions = [];
        
        for (const { img } of images) {
            const imgWidth = img.width + padding;
            const imgHeight = img.height + padding;
            
            let placed = false;
            
            // Try to place on existing shelves
            for (const shelf of shelves) {
                if (shelf.remainingWidth >= imgWidth && shelf.height >= imgHeight) {
                    positions.push({ x: shelf.x, y: shelf.y });
                    shelf.x += imgWidth;
                    shelf.remainingWidth -= imgWidth;
                    placed = true;
                    break;
                }
            }
            
            // Create new shelf if needed
            if (!placed) {
                const shelfY = shelves.reduce((maxY, shelf) => Math.max(maxY, shelf.y + shelf.height), 0);
                
                if (shelfY + imgHeight > atlasHeight) {
                    return null; // Doesn't fit
                }
                
                const newShelf = {
                    x: imgWidth,
                    y: shelfY,
                    height: imgHeight,
                    remainingWidth: atlasWidth - imgWidth
                };
                
                shelves.push(newShelf);
                positions.push({ x: 0, y: shelfY });
            }
        }
        
        return positions;
    }

    // Preload and optimize common game assets
    async preloadGameAssets(assetManifest) {
        console.log(`[ImageOptimizer] Preloading ${assetManifest.length} game assets`);
        
        const loadPromises = assetManifest.map(async (asset) => {
            try {
                const optimizedImage = await this.loadImage(asset.src, asset.options);
                return { id: asset.id, image: optimizedImage };
            } catch (error) {
                console.error(`[ImageOptimizer] Failed to preload asset ${asset.id}:`, error);
                return { id: asset.id, image: null, error };
            }
        });
        
        const results = await Promise.all(loadPromises);
        const successful = results.filter(r => r.image !== null);
        
        console.log(`[ImageOptimizer] Preloaded ${successful.length}/${assetManifest.length} assets`);
        
        return results;
    }

    // Generate mipmaps for better scaling
    generateMipmaps(img) {
        if (!this.enableMipmaps) return [img];
        
        const mipmaps = [img];
        let currentImg = img;
        
        while (currentImg.width > 1 && currentImg.height > 1) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = Math.max(1, Math.floor(currentImg.width / 2));
            canvas.height = Math.max(1, Math.floor(currentImg.height / 2));
            
            ctx.drawImage(currentImg, 0, 0, canvas.width, canvas.height);
            
            const mipmap = new Image();
            mipmap.src = canvas.toDataURL();
            mipmaps.push(mipmap);
            
            currentImg = mipmap;
        }
        
        return mipmaps;
    }

    // Utility methods
    clearCache() {
        this.cache.clear();
        this.optimizedCache.clear();
        console.log('[ImageOptimizer] Cache cleared');
    }

    getStats() {
        const compressionRatio = this.stats.totalOriginalSize > 0 
            ? (this.stats.totalOptimizedSize / this.stats.totalOriginalSize) 
            : 1;
        
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            compressionRatio: compressionRatio.toFixed(2),
            memorySaved: this.stats.totalOriginalSize - this.stats.totalOptimizedSize
        };
    }

    // Memory management
    dispose() {
        this.clearCache();
        
        // Cancel any pending loads
        this.loadingQueue.clear();
        
        console.log('[ImageOptimizer] Disposed');
    }

    // Configuration methods
    setQualityMode(mode) {
        switch (mode) {
            case 'low':
                this.compressionQuality = 0.5;
                this.maxTextureSize = 512;
                this.useCompression = true;
                break;
            case 'medium':
                this.compressionQuality = 0.7;
                this.maxTextureSize = 1024;
                this.useCompression = true;
                break;
            case 'high':
                this.compressionQuality = 0.9;
                this.maxTextureSize = 2048;
                this.useCompression = false;
                break;
        }
        
        console.log(`[ImageOptimizer] Quality mode set to: ${mode}`);
    }
}

// Utility functions
const ImageUtils = {
    // Convert image to different format
    convertFormat: async (img, format, quality = 0.8) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0);
        
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const newImg = new Image();
                    newImg.onload = () => {
                        URL.revokeObjectURL(url);
                        resolve(newImg);
                    };
                    newImg.onerror = reject;
                    newImg.src = url;
                } else {
                    reject(new Error('Failed to convert image format'));
                }
            }, format, quality);
        });
    },
    
    // Resize image
    resize: (img, width, height) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        const resizedImg = new Image();
        resizedImg.src = canvas.toDataURL();
        return resizedImg;
    },
    
    // Apply filters
    applyFilter: (img, filter) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.filter = filter;
        ctx.drawImage(img, 0, 0);
        
        const filteredImg = new Image();
        filteredImg.src = canvas.toDataURL();
        return filteredImg;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ImageOptimizer, ImageUtils };
} else {
    window.ImageOptimizer = ImageOptimizer;
    window.ImageUtils = ImageUtils;
}