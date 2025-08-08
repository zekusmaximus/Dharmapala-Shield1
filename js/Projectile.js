class Projectile {
    constructor(x, y, target, damage, speed, type = 'normal', defenseType = 'firewall') {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.type = type;
        this.defenseType = defenseType;
        
        // Visual properties
        this.color = this.getProjectileColor();
        this.size = this.getProjectileSize();
        this.trailParticles = [];
        
        // Physics
        this.velocityX = 0;
        this.velocityY = 0;
        this.calculateVelocity();
        
        // State
        this.isActive = true;
        this.lifetime = 5000; // 5 seconds max lifetime
        this.createdTime = Utils.performance.now();
        
        // Special effects
        this.hasHitEffect = false;
        this.piercing = type === 'piercing';
        this.explosive = type === 'explosive';
        this.homing = type === 'homing';
    }
    
    calculateVelocity() {
        if (this.target && this.target.isAlive) {
            // Predictive aiming: lead target using current velocity
            const targetVX = this.target.velocityX || 0;
            const targetVY = this.target.velocityY || 0;
            const dx0 = this.target.x - this.x;
            const dy0 = this.target.y - this.y;
            
            // Solve for time to intercept t using quadratic: (v_t^2 - v_p^2) t^2 + 2(d·v_t) t + d^2 = 0
            const vtx2 = targetVX * targetVX;
            const vty2 = targetVY * targetVY;
            const vt2 = vtx2 + vty2;
            const vp2 = this.speed * this.speed;
            const dDotVt = dx0 * targetVX + dy0 * targetVY;
            const d2 = dx0 * dx0 + dy0 * dy0;
            
            let interceptX = this.target.x;
            let interceptY = this.target.y;
            
            // Only attempt lead if projectile is faster than target or math permits
            const a = vt2 - vp2;
            const b = 2 * dDotVt;
            const c = d2;
            let t = 0;
            if (Math.abs(a) < 1e-6) {
                // Linear case: vp ~= vt -> t = -c / b if b != 0
                if (Math.abs(b) > 1e-6) {
                    t = Math.max(0, -c / b);
                }
            } else {
                const disc = b * b - 4 * a * c;
                if (disc >= 0) {
                    const sqrtDisc = Math.sqrt(disc);
                    const t1 = (-b - sqrtDisc) / (2 * a);
                    const t2 = (-b + sqrtDisc) / (2 * a);
                    // Choose the smallest positive time
                    const candidates = [t1, t2].filter(val => val > 0);
                    if (candidates.length > 0) {
                        t = Math.min(...candidates);
                    }
                }
            }
            
            if (t > 0 && t < MAX_LEAD_TIME_SECONDS) { // clamp to avoid extreme leads
                interceptX = this.target.x + targetVX * t;
                interceptY = this.target.y + targetVY * t;
            }
            
            const dx = interceptX - this.x;
            const dy = interceptY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                this.velocityX = (dx / distance) * this.speed;
                this.velocityY = (dy / distance) * this.speed;
            }
        }
    }
    
    getProjectileColor() {
        const colors = {
            firewall: '#ff6b6b',
            encryption: '#4ecdc4',
            decoy: '#45b7d1',
            mirror: '#f9ca24',
            anonymity: '#6c5ce7',
            distributor: '#ffd700'
        };
        return colors[this.defenseType] || '#ffffff';
    }
    
    getProjectileSize() {
        const sizes = {
            normal: 4,
            piercing: 6,
            explosive: 8,
            homing: 5
        };
        return sizes[this.type] || 4;
    }
    
    update(deltaTime) {
        if (!this.isActive) return;
        
        // Update homing behavior
        if (this.homing && this.target && this.target.isAlive) {
            this.calculateVelocity();
        }
        
        // Update position
        this.x += this.velocityX * deltaTime * 0.001;
        this.y += this.velocityY * deltaTime * 0.001;
        
        // Add trail particles using the particle system
        if (window.particleSystem && Math.random() < 0.3) {
            window.particleSystem.emit('muzzleFlash', this.x, this.y, {
                count: 1,
                color: [this.color],
                spread: 5
            });
        }
        
        // Check lifetime
        if (Utils.performance.now() - this.createdTime > this.lifetime) {
            this.isActive = false;
        }
        
        // Check collision with target
        if (this.target && this.target.isAlive) {
            const distance = Utils.math.distance(this.x, this.y, this.target.x, this.target.y);
            if (distance < (this.target.size || 15) + this.size) {
                this.hitTarget();
            }
        }
    }
    
    hitTarget() {
        if (!this.hasHitEffect) {
            this.hasHitEffect = true;
            
            // Apply damage
            const killed = this.target.takeDamage(this.damage, this.type);
            
            // Create hit effects
            this.createHitEffect();
            
            // Handle special projectile types
            if (this.explosive) {
                this.createExplosion();
            }
            
            if (!this.piercing) {
                this.isActive = false;
            }
        }
    }
    
    createHitEffect() {
        // Create impact particles using the particle system
        if (window.particleSystem) {
            window.particleSystem.emit('hit', this.x, this.y, {
                count: 6,
                color: [this.color, '#ffffff']
            });
        }
    }
    
    createExplosion() {
        // Create explosion effect using the particle system
        if (window.particleSystem) {
            window.particleSystem.emit('explosion', this.x, this.y, {
                count: 15,
                color: ['#ff6b35', '#ffd60a', '#ff0080']
            });
        }
        
        // Return explosion data for area damage
        return {
            x: this.x,
            y: this.y,
            radius: 60,
            damage: this.damage * 0.5,
            type: 'explosive'
        };
    }
    
    render(ctx) {
        if (!this.isActive) return;
        
        // Use sprite system if available
        if (window.spriteManager) {
            const spriteName = `projectile_${this.defenseType}_${this.type}`;
            if (window.spriteManager.hasSprite(spriteName)) {
                const angle = Math.atan2(this.velocityY, this.velocityX);
                window.spriteManager.drawSprite(ctx, spriteName, 
                    this.x - this.size, this.y - this.size, 
                    this.size * 2, this.size * 2, angle);
                return;
            }
        }
        
        // Fallback rendering
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        
        switch (this.type) {
            case 'piercing':
                this.renderPiercingProjectile(ctx);
                break;
            case 'explosive':
                this.renderExplosiveProjectile(ctx);
                break;
            case 'homing':
                this.renderHomingProjectile(ctx);
                break;
            default:
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
        }
    }
    
    renderPiercingProjectile(ctx) {
        // Render as an arrow
        const angle = Math.atan2(this.velocityY, this.velocityX);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size, -this.size * 0.5);
        ctx.lineTo(-this.size * 0.5, 0);
        ctx.lineTo(-this.size, this.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
    
    renderExplosiveProjectile(ctx) {
        // Render with pulsing effect
        const pulseScale = 1 + 0.3 * Math.sin(Utils.performance.now() * 0.01);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * pulseScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Add inner glow
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderHomingProjectile(ctx) {
        // Render with spiral trail
        const time = Utils.performance.now() * 0.01;
        for (let i = 0; i < 3; i++) {
            const angle = time + (i * Math.PI * 2 / 3);
            const spiralRadius = this.size * 0.7;
            const spiralX = this.x + Math.cos(angle) * spiralRadius;
            const spiralY = this.y + Math.sin(angle) * spiralRadius;
            
            ctx.fillStyle = this.color + '80';
            ctx.beginPath();
            ctx.arc(spiralX, spiralY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Main projectile
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    
    // Check if projectile is off-screen or should be removed
    shouldRemove(canvasWidth, canvasHeight) {
        if (!this.isActive) return true;
        
        const margin = 50;
        return this.x < -margin || 
               this.x > canvasWidth + margin || 
               this.y < -margin || 
               this.y > canvasHeight + margin;
    }
    
    // Get projectile state for saving/loading
    getState() {
        return {
            x: this.x,
            y: this.y,
            velocityX: this.velocityX,
            velocityY: this.velocityY,
            damage: this.damage,
            speed: this.speed,
            type: this.type,
            defenseType: this.defenseType,
            isActive: this.isActive,
            createdTime: this.createdTime,
            hasHitEffect: this.hasHitEffect
        };
    }
    
    // Restore projectile state from saved data
    setState(state) {
        this.x = state.x || this.x;
        this.y = state.y || this.y;
        this.velocityX = state.velocityX || this.velocityX;
        this.velocityY = state.velocityY || this.velocityY;
        this.damage = state.damage || this.damage;
        this.speed = state.speed || this.speed;
        this.type = state.type || this.type;
        this.defenseType = state.defenseType || this.defenseType;
        this.isActive = state.isActive !== undefined ? state.isActive : this.isActive;
        this.createdTime = state.createdTime || this.createdTime;
        this.hasHitEffect = state.hasHitEffect || this.hasHitEffect;
        
        // Recalculate derived properties
        this.color = this.getProjectileColor();
        this.size = this.getProjectileSize();
        this.piercing = this.type === 'piercing';
        this.explosive = this.type === 'explosive';
        this.homing = this.type === 'homing';
    }
}

// Projectile pool for performance optimization
class ProjectilePool {
    constructor(initialSize = 50) {
        this.pool = [];
        this.active = [];
        
        // Pre-create projectiles
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(new Projectile(0, 0, null, 0, 0));
        }
    }
    
    getProjectile(x, y, target, damage, speed, type, defenseType) {
        let projectile;
        
        if (this.pool.length > 0) {
            projectile = this.pool.pop();
            // Reset the projectile
            projectile.x = x;
            projectile.y = y;
            projectile.target = target;
            projectile.damage = damage;
            projectile.speed = speed;
            projectile.type = type || 'normal';
            projectile.defenseType = defenseType || 'firewall';
            projectile.isActive = true;
            projectile.hasHitEffect = false;
            projectile.createdTime = Utils.performance.now();
            projectile.trailParticles = [];
            
            // Recalculate properties
            projectile.color = projectile.getProjectileColor();
            projectile.size = projectile.getProjectileSize();
            projectile.piercing = projectile.type === 'piercing';
            projectile.explosive = projectile.type === 'explosive';
            projectile.homing = projectile.type === 'homing';
            projectile.calculateVelocity();
        } else {
            projectile = new Projectile(x, y, target, damage, speed, type, defenseType);
        }
        
        this.active.push(projectile);
        return projectile;
    }
    
    returnProjectile(projectile) {
        const index = this.active.indexOf(projectile);
        if (index > -1) {
            this.active.splice(index, 1);
            projectile.isActive = false;
            projectile.target = null;
            this.pool.push(projectile);
        }
    }
    
    updateAll(deltaTime) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const projectile = this.active[i];
            projectile.update(deltaTime);
            
            if (!projectile.isActive) {
                this.returnProjectile(projectile);
            }
        }
    }
    
    renderAll(ctx) {
        for (const projectile of this.active) {
            projectile.render(ctx);
        }
    }
    
    clear() {
        for (const projectile of this.active) {
            this.returnProjectile(projectile);
        }
    }
    
    getActiveCount() {
        return this.active.length;
    }
    
    getPoolSize() {
        return this.pool.length;
    }
}

export default Projectile;
export { ProjectilePool };