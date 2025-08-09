
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.particlePool = [];
        this.maxParticles = 500;
        this.poolSize = 100;
        
        this.emitters = new Map();
        
        this.createParticlePool();
    }

    createParticlePool() {
        for (let i = 0; i < this.poolSize; i++) {
            this.particlePool.push(new Particle());
        }
    }

    getParticle() {
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }
        return new Particle();
    }

    returnParticle(particle) {
        particle.reset();
        this.particlePool.push(particle);
    }

    emit(type, x, y, options = {}) {
        const config = this.getParticleConfig(type);
        const count = options.count || config.count;
        
        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            const particle = this.getParticle();
            this.initializeParticle(particle, type, x, y, config, options);
            this.particles.push(particle);
        }
    }

    getParticleConfig(type) {
        const configs = {
            explosion: {
                count: 12,
                life: 800,
                speed: { min: 50, max: 150 },
                size: { min: 3, max: 8 },
                color: ['#ff6b35', '#ffd60a', '#ff0080'],
                gravity: 0.2,
                drag: 0.95,
                fadeOut: true
            },
            muzzleFlash: {
                count: 6,
                life: 200,
                speed: { min: 30, max: 80 },
                size: { min: 2, max: 5 },
                color: ['#00d4ff', '#ffffff'],
                gravity: 0,
                drag: 0.9,
                fadeOut: true
            },
            hit: {
                count: 8,
                life: 400,
                speed: { min: 20, max: 60 },
                size: { min: 1, max: 4 },
                color: ['#ff6b35', '#ffffff'],
                gravity: 0.1,
                drag: 0.92,
                fadeOut: true
            },
            upgrade: {
                count: 15,
                life: 1000,
                speed: { min: 10, max: 40 },
                size: { min: 2, max: 6 },
                color: ['#ffd60a', '#00d4ff', '#9d4edd'],
                gravity: -0.1,
                drag: 0.98,
                fadeOut: true,
                sparkle: true
            },
            death: {
                count: 20,
                life: 1500,
                speed: { min: 30, max: 100 },
                size: { min: 2, max: 6 },
                color: ['#ff0080', '#9d4edd', '#ff6b35'],
                gravity: 0.15,
                drag: 0.96,
                fadeOut: true
            },
            smoke: {
                count: 5,
                life: 2000,
                speed: { min: 5, max: 20 },
                size: { min: 8, max: 15 },
                color: ['#666666', '#999999', '#bbbbbb'],
                gravity: -0.05,
                drag: 0.99,
                fadeOut: true,
                expand: true
            },
            heal: {
                count: 10,
                life: 1200,
                speed: { min: 15, max: 35 },
                size: { min: 3, max: 7 },
                color: ['#00ff88', '#00d4ff'],
                gravity: -0.1,
                drag: 0.97,
                fadeOut: true,
                pulse: true
            }
        };
        
        return configs[type] || configs.explosion;
    }

    initializeParticle(particle, type, x, y, config, options) {
        particle.x = x + (Math.random() - 0.5) * (options.spread || 10);
        particle.y = y + (Math.random() - 0.5) * (options.spread || 10);
        
        const angle = options.angle !== undefined ? options.angle : Math.random() * Math.PI * 2;
        const speed = Utils.math.randomFloat(config.speed.min, config.speed.max);
        
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        
        particle.life = config.life + (Math.random() - 0.5) * config.life * 0.3;
        particle.maxLife = particle.life;
        particle.size = Utils.math.randomFloat(config.size.min, config.size.max);
        particle.initialSize = particle.size;
        
        const colorIndex = Math.floor(Math.random() * config.color.length);
        particle.color = config.color[colorIndex];
        
        particle.gravity = config.gravity || 0;
        particle.drag = config.drag || 1;
        particle.fadeOut = config.fadeOut || false;
        particle.expand = config.expand || false;
        particle.sparkle = config.sparkle || false;
        particle.pulse = config.pulse || false;
        
        particle.alpha = 1.0;
        particle.rotation = Math.random() * Math.PI * 2;
        particle.rotationSpeed = (Math.random() - 0.5) * 0.2;
        
        if (particle.sparkle) {
            particle.sparklePhase = Math.random() * Math.PI * 2;
        }
        
        if (particle.pulse) {
            particle.pulsePhase = Math.random() * Math.PI * 2;
        }
    }

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.life -= deltaTime;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
                this.returnParticle(particle);
                continue;
            }
            
            particle.vx *= particle.drag;
            particle.vy *= particle.drag;
            particle.vy += particle.gravity * deltaTime * 0.1;
            
            particle.x += particle.vx * deltaTime * 0.1;
            particle.y += particle.vy * deltaTime * 0.1;
            
            particle.rotation += particle.rotationSpeed * deltaTime * 0.1;
            
            const lifeRatio = particle.life / particle.maxLife;
            
            if (particle.fadeOut) {
                particle.alpha = lifeRatio;
            }
            
            if (particle.expand) {
                particle.size = particle.initialSize * (2 - lifeRatio);
            }
            
            if (particle.sparkle) {
                particle.sparklePhase += deltaTime * 0.01;
                particle.alpha = 0.5 + 0.5 * Math.sin(particle.sparklePhase);
            }
            
            if (particle.pulse) {
                particle.pulsePhase += deltaTime * 0.005;
                particle.size = particle.initialSize * (1 + 0.3 * Math.sin(particle.pulsePhase));
            }
        }
        
        this.updateEmitters(deltaTime);
    }

    updateEmitters(deltaTime) {
        for (const [name, emitter] of this.emitters) {
            if (emitter.active) {
                emitter.timer += deltaTime;
                
                if (emitter.timer >= emitter.interval) {
                    this.emit(emitter.type, emitter.x, emitter.y, emitter.options);
                    emitter.timer = 0;
                    
                    if (emitter.duration > 0) {
                        emitter.elapsed += emitter.interval;
                        if (emitter.elapsed >= emitter.duration) {
                            emitter.active = false;
                        }
                    }
                }
            }
        }
    }

    render(ctx) {
        for (const particle of this.particles) {
            ctx.save();
            
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            
            const halfSize = particle.size / 2;
            ctx.fillRect(-halfSize, -halfSize, particle.size, particle.size);
            
            ctx.restore();
        }
    }

    createEmitter(name, type, x, y, interval, duration = 0, options = {}) {
        this.emitters.set(name, {
            type,
            x,
            y,
            interval,
            duration,
            options,
            timer: 0,
            elapsed: 0,
            active: true
        });
    }

    moveEmitter(name, x, y) {
        const emitter = this.emitters.get(name);
        if (emitter) {
            emitter.x = x;
            emitter.y = y;
        }
    }

    stopEmitter(name) {
        const emitter = this.emitters.get(name);
        if (emitter) {
            emitter.active = false;
        }
    }

    removeEmitter(name) {
        this.emitters.delete(name);
    }

    clear() {
        for (const particle of this.particles) {
            this.returnParticle(particle);
        }
        this.particles.length = 0;
        this.emitters.clear();
    }

    getParticleCount() {
        return this.particles.length;
    }

    setMaxParticles(max) {
        this.maxParticles = Math.max(0, max);
        
        while (this.particles.length > this.maxParticles) {
            const particle = this.particles.pop();
            this.returnParticle(particle);
        }
    }
}

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.maxLife = 0;
        this.size = 0;
        this.initialSize = 0;
        this.color = '#ffffff';
        this.alpha = 1;
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.gravity = 0;
        this.drag = 1;
        this.fadeOut = false;
        this.expand = false;
        this.sparkle = false;
        this.pulse = false;
        this.sparklePhase = 0;
        this.pulsePhase = 0;
    }
}

const particleSystem = new ParticleSystem();

// Export for ES module consumers and expose globals
export { ParticleSystem, Particle, particleSystem };

if (typeof window !== 'undefined') {
    window.ParticleSystem = ParticleSystem;
    window.Particle = Particle;
    window.particleSystem = particleSystem;
}