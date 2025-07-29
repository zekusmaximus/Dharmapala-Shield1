class SpriteManager {
    constructor() {
        this.sprites = new Map();
        this.loadingPromises = new Map();
        this.fallbackSprites = new Map();
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    async loadSprite(name, url) {
        if (this.sprites.has(name)) {
            return this.sprites.get(name);
        }

        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        const promise = this.loadImage(url)
            .then(image => {
                this.sprites.set(name, image);
                this.loadingPromises.delete(name);
                return image;
            })
            .catch(error => {
                console.warn(`Failed to load sprite ${name} from ${url}:`, error);
                const fallback = this.createFallbackSprite(name);
                this.sprites.set(name, fallback);
                this.loadingPromises.delete(name);
                return fallback;
            });

        this.loadingPromises.set(name, promise);
        return promise;
    }

    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    }

    createFallbackSprite(name) {
        const size = this.getFallbackSize(name);
        const color = this.getFallbackColor(name);
        
        this.canvas.width = size.width;
        this.canvas.height = size.height;
        
        this.ctx.clearRect(0, 0, size.width, size.height);
        
        if (name.includes('defense') || name.includes('tower')) {
            this.drawDefenseSprite(size, color);
        } else if (name.includes('enemy')) {
            this.drawEnemySprite(size, color);
        } else if (name.includes('projectile') || name.includes('bullet')) {
            this.drawProjectileSprite(size, color);
        } else if (name.includes('boss')) {
            this.drawBossSprite(size, color);
        } else {
            this.drawGenericSprite(size, color);
        }

        const fallbackImage = new Image();
        fallbackImage.src = this.canvas.toDataURL();
        return fallbackImage;
    }

    getFallbackSize(name) {
        if (name.includes('boss')) return { width: 80, height: 80 };
        if (name.includes('defense') || name.includes('tower')) return { width: 40, height: 40 };
        if (name.includes('enemy')) return { width: 30, height: 30 };
        if (name.includes('projectile') || name.includes('bullet')) return { width: 8, height: 8 };
        return { width: 32, height: 32 };
    }

    getFallbackColor(name) {
        if (name.includes('boss')) return '#ff0080';
        if (name.includes('defense') || name.includes('tower')) return '#00d4ff';
        if (name.includes('enemy')) return '#ff6b35';
        if (name.includes('projectile') || name.includes('bullet')) return '#ffd60a';
        return '#9d4edd';
    }

    drawDefenseSprite(size, color) {
        const ctx = this.ctx;
        const centerX = size.width / 2;
        const centerY = size.height / 2;
        const radius = Math.min(size.width, size.height) / 3;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius / 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawEnemySprite(size, color) {
        const ctx = this.ctx;
        const centerX = size.width / 2;
        const centerY = size.height / 2;

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, size.width, size.height);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, size.width, size.height);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(centerX - 2, centerY - 2, 4, 4);
    }

    drawProjectileSprite(size, color) {
        const ctx = this.ctx;
        const centerX = size.width / 2;
        const centerY = size.height / 2;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawBossSprite(size, color) {
        const ctx = this.ctx;
        const centerX = size.width / 2;
        const centerY = size.height / 2;
        const radius = Math.min(size.width, size.height) / 2.5;

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, size.width, size.height);

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    drawGenericSprite(size, color) {
        const ctx = this.ctx;
        
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, size.width, size.height);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, size.width, size.height);
    }

    getSprite(name) {
        return this.sprites.get(name) || null;
    }

    hasSprite(name) {
        return this.sprites.has(name);
    }

    drawSprite(ctx, spriteName, x, y, width = null, height = null, rotation = 0, alpha = 1) {
        const sprite = this.getSprite(spriteName);
        if (!sprite) return false;

        ctx.save();
        ctx.globalAlpha = alpha;

        if (rotation !== 0) {
            ctx.translate(x + (width || sprite.width) / 2, y + (height || sprite.height) / 2);
            ctx.rotate(rotation);
            ctx.translate(-(width || sprite.width) / 2, -(height || sprite.height) / 2);
            x = 0;
            y = 0;
        }

        if (width !== null && height !== null) {
            ctx.drawImage(sprite, x, y, width, height);
        } else {
            ctx.drawImage(sprite, x, y);
        }

        ctx.restore();
        return true;
    }

    drawSpriteScaled(ctx, spriteName, x, y, scale, rotation = 0, alpha = 1) {
        const sprite = this.getSprite(spriteName);
        if (!sprite) return false;

        const scaledWidth = sprite.width * scale;
        const scaledHeight = sprite.height * scale;

        return this.drawSprite(ctx, spriteName, x, y, scaledWidth, scaledHeight, rotation, alpha);
    }

    preloadSprites(spriteList) {
        const promises = spriteList.map(({name, url}) => this.loadSprite(name, url));
        return Promise.all(promises);
    }

    clear() {
        this.sprites.clear();
        this.loadingPromises.clear();
        this.fallbackSprites.clear();
    }

    createAnimatedSprite(frames, frameRate = 10) {
        return new AnimatedSprite(frames, frameRate);
    }
}

class AnimatedSprite {
    constructor(frames, frameRate = 10) {
        this.frames = frames;
        this.frameRate = frameRate;
        this.currentFrame = 0;
        this.lastFrameTime = 0;
        this.playing = false;
        this.loop = true;
    }

    play() {
        this.playing = true;
        this.lastFrameTime = Utils.performance.now();
    }

    pause() {
        this.playing = false;
    }

    stop() {
        this.playing = false;
        this.currentFrame = 0;
    }

    update() {
        if (!this.playing || this.frames.length === 0) return;

        const now = Utils.performance.now();
        const frameDuration = 1000 / this.frameRate;

        if (now - this.lastFrameTime >= frameDuration) {
            this.currentFrame++;
            
            if (this.currentFrame >= this.frames.length) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = this.frames.length - 1;
                    this.playing = false;
                }
            }
            
            this.lastFrameTime = now;
        }
    }

    getCurrentFrame() {
        return this.frames[this.currentFrame] || null;
    }

    draw(ctx, x, y, width = null, height = null, rotation = 0, alpha = 1) {
        const currentSprite = this.getCurrentFrame();
        if (!currentSprite) return false;

        return window.spriteManager.drawSprite(ctx, currentSprite, x, y, width, height, rotation, alpha);
    }
}

const spriteManager = new SpriteManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpriteManager, AnimatedSprite };
} else {
    window.SpriteManager = SpriteManager;
    window.AnimatedSprite = AnimatedSprite;
    window.spriteManager = spriteManager;
}