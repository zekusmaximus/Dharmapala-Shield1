
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
                console.log(`[SpriteManager] Successfully loaded sprite: ${name} from ${url}`);
                this.sprites.set(name, image);
                this.loadingPromises.delete(name);
                return image;
            })
            .catch(error => {
                console.warn(`[SpriteManager] Failed to load sprite ${name} from ${url}, using fallback:`, error.message);
                const fallback = this.createFallbackSprite(name);
                this.sprites.set(name, fallback);
                this.loadingPromises.delete(name);
                return fallback;
            });

        this.loadingPromises.set(name, promise);
        return promise;
    }

    // Try to load sprites from the expected asset paths
    async loadGameSprites() {
        console.log('[SpriteManager] Loading game sprites...');
        
        const spriteAssets = {
            // Defense sprites
            'defense_firewall_level1': 'assets/images/firewall_fortress.png',
            'defense_encryption_level1': 'assets/images/encryption_monastery.png',
            'defense_decoy_level1': 'assets/images/decoy_temple.png',
            'defense_mirror_level1': 'assets/images/mirror_server.png',
            'defense_anonymity_level1': 'assets/images/anonymity_shroud.png',
            'defense_dharma_level1': 'assets/images/dharma_distributor.png',
            
            // Enemy sprites
            'enemy_scriptKiddie': 'assets/images/enemy_script_kiddie.png',
            'enemy_federalAgent': 'assets/images/enemy_federal_agent.png',
            'enemy_corporateSaboteur': 'assets/images/enemy_corporate_saboteur.png',
            'enemy_aiSurveillance': 'assets/images/enemy_ai_surveillance.png',
            'enemy_quantumHacker': 'assets/images/enemy_quantum_hacker.png',
            'enemy_corruptedMonk': 'assets/images/enemy_corrupted_monk.png',
            'enemy_raidTeam': 'assets/images/enemy_raid_team.png',
            'enemy_megaCorp': 'assets/images/enemy_mega_corp.png',
            
            // Boss sprites
            'boss_raidTeam_phase1': 'assets/images/boss_raid_team_phase1.png',
            'boss_megaCorp_phase1': 'assets/images/boss_mega_corp_phase1.png',
            'boss_corruptedMonk_phase1': 'assets/images/boss_corrupted_monk_phase1.png'
        };
        
        const loadPromises = [];
        for (const [spriteName, assetPath] of Object.entries(spriteAssets)) {
            loadPromises.push(this.loadSprite(spriteName, assetPath));
        }
        
        try {
            await Promise.all(loadPromises);
            console.log('[SpriteManager] Sprite loading complete');
        } catch (error) {
            console.warn('[SpriteManager] Some sprites failed to load, fallbacks will be used:', error);
        }
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

        // Main defense body with gradient
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, '#002244');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Inner core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Defense spikes/details
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const startX = centerX + Math.cos(angle) * (radius * 0.7);
            const startY = centerY + Math.sin(angle) * (radius * 0.7);
            const endX = centerX + Math.cos(angle) * (radius * 1.2);
            const endY = centerY + Math.sin(angle) * (radius * 1.2);
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }

    drawEnemySprite(size, color) {
        const ctx = this.ctx;
        const centerX = size.width / 2;
        const centerY = size.height / 2;
        const width = size.width * 0.8;
        const height = size.height * 0.8;
        const x = (size.width - width) / 2;
        const y = (size.height - height) / 2;

        // Main body with gradient
        const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, '#cc2200');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, height);

        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Enemy "eyes" or targeting system
        ctx.fillStyle = '#ff0000';
        const eyeSize = 4;
        ctx.fillRect(centerX - eyeSize - 2, centerY - eyeSize/2, eyeSize, eyeSize);
        ctx.fillRect(centerX + 2, centerY - eyeSize/2, eyeSize, eyeSize);
        
        // Movement direction indicator
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(centerX, y + 2);
        ctx.lineTo(centerX - 3, y + 8);
        ctx.lineTo(centerX + 3, y + 8);
        ctx.fill();
    }

    drawProjectileSprite(size, color) {
        const ctx = this.ctx;
        const centerX = size.width / 2;
        const centerY = size.height / 2;
        const radius = size.width / 2;

        // Glowing projectile effect
        ctx.shadowBlur = 5;
        ctx.shadowColor = color;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner bright core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawBossSprite(size, color) {
        const ctx = this.ctx;
        const centerX = size.width / 2;
        const centerY = size.height / 2;
        const radius = Math.min(size.width, size.height) / 2.2;

        // Boss background with intimidating design
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.7, '#660033');
        gradient.addColorStop(1, '#000000');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size.width, size.height);

        // Boss main body - menacing circle
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Intimidating border
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Boss "face" - threatening design
        ctx.fillStyle = '#ff0000';
        const eyeRadius = radius * 0.15;
        // Eyes
        ctx.beginPath();
        ctx.arc(centerX - radius * 0.3, centerY - radius * 0.2, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + radius * 0.3, centerY - radius * 0.2, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Mouth/weapon
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY + radius * 0.2, radius * 0.4, 0, Math.PI);
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

// Export for ES module consumers and expose globals
export { SpriteManager, AnimatedSprite, spriteManager };

if (typeof window !== 'undefined') {
    window.SpriteManager = SpriteManager;
    window.AnimatedSprite = AnimatedSprite;
    window.spriteManager = spriteManager;
}