class Enemy {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        
        // Get enemy configuration
        this.config = this.getEnemyConfig(type);
        
        // Basic properties
        this.health = this.config.health;
        this.maxHealth = this.config.health;
        this.speed = this.config.speed;
        this.baseSpeed = this.config.speed;
        this.size = this.config.size;
        this.color = this.config.color;
        this.reward = this.config.reward;
        
        // Path following
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.targetX = x;
        this.targetY = y;
        
        // Movement
        this.velocityX = 0;
        this.velocityY = 0;
        
        // State
        this.isAlive = true;
        this.reachedEnd = false;
        
        // Status effects - simplified
        this.stunned = false;
        this.stunnedTime = 0;
        this.slowEffect = 1.0;
        this.slowEffectTime = 0;
        this.distractedBy = null;
        this.distractedTime = 0;
        
        // Combat
        this.lastDamageTime = 0;
        this.armor = this.config.armor || 0;
        
        // Visual effects
        this.flashTime = 0;
        this.deathAnimationTime = 0;
        
        // Special behaviors - simplified
        this.initializeBehavior();
    }

    getEnemyConfig(type) {
        const enemyConfigs = {
            scriptKiddie: {
                health: 50,
                speed: 1.2,
                size: 15,
                color: '#ff4444',
                reward: { dharma: 10, bandwidth: 1, anonymity: 0 },
                armor: 0,
                abilities: ['erratic_movement']
            },
            federalAgent: {
                health: 100,
                speed: 0.8,
                size: 18,
                color: '#4444ff',
                reward: { dharma: 20, bandwidth: 3, anonymity: 2 },
                armor: 2,
                abilities: ['persistent']
            },
            corporateSaboteur: {
                health: 75,
                speed: 1.0,
                size: 16,
                color: '#44ff44',
                reward: { dharma: 15, bandwidth: 2, anonymity: 5 },
                armor: 1,
                abilities: ['stealth']
            },
            aiSurveillance: {
                health: 120,
                speed: 0.9,
                size: 20,
                color: '#ffff44',
                reward: { dharma: 25, bandwidth: 5, anonymity: 3 },
                armor: 3,
                abilities: ['scanning', 'adaptive']
            },
            quantumHacker: {
                health: 200,
                speed: 0.7,
                size: 22,
                color: '#ff44ff',
                reward: { dharma: 40, bandwidth: 8, anonymity: 10 },
                armor: 2,
                abilities: ['phase_shift', 'teleport']
            },
            corruptedMonk: {
                health: 150,
                speed: 0.6,
                size: 25,
                color: '#ff8844',
                reward: { dharma: 35, bandwidth: 4, anonymity: 8 },
                armor: 1,
                abilities: ['healing_aura', 'corruption']
            }
        };

        if (typeof CONFIG !== 'undefined' && CONFIG.ENEMY_TYPES && CONFIG.ENEMY_TYPES[type]) {
            return CONFIG.ENEMY_TYPES[type];
        }
        
        return enemyConfigs[type] || enemyConfigs.scriptKiddie;
    }

    initializeBehavior() {
        this.abilities = this.config.abilities || [];
        this.abilityTimers = {};
        
        // Initialize ability-specific properties
        this.abilities.forEach(ability => {
            this.abilityTimers[ability] = 0;
            
            switch (ability) {
                case 'erratic_movement':
                    this.erraticTimer = 0;
                    this.erraticDirection = Math.random() * Math.PI * 2;
                    break;
                case 'persistent':
                    this.detectionRadius = 100;
                    this.targetLocked = false;
                    break;
                case 'stealth':
                    this.stealthMode = false;
                    this.stealthTimer = 0;
                    this.originalColor = this.color;
                    break;
                case 'scanning':
                    this.scanAngle = 0;
                    this.scanRadius = 80;
                    break;
                case 'phase_shift':
                    this.phaseShifted = false;
                    this.phaseTimer = 0;
                    break;
                case 'teleport':
                    this.teleportCooldown = 0;
                    break;
                case 'healing_aura':
                    this.healingTimer = 0;
                    this.healingRadius = 60;
                    break;
                case 'corruption':
                    this.corruptionRadius = 70;
                    break;
            }
        });
        
        // Store path reference (will be set when spawned)
        this.storedPath = null;
    }
    
    setPath(path) {
        this.storedPath = path;
        console.log(`[Enemy] Path set for ${this.type} with ${path ? path.length : 0} points`);
    }

    update(deltaTime, defenses = [], enemies = []) {
        if (!this.isAlive) {
            this.updateDeathAnimation(deltaTime);
            return;
        }
        
        // Update status effects
        this.updateStatusEffects(deltaTime);
        
        // Update movement (unless stunned)
        if (!this.stunned) {
            this.updateMovement(deltaTime);
            this.updateSpecialAbilities(deltaTime, defenses, enemies);
        }
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Check if reached end
        this.checkReachedEnd();
    }

    updateStatusEffects(deltaTime) {
        // Update stun
        if (this.stunned) {
            this.stunnedTime -= deltaTime;
            if (this.stunnedTime <= 0) {
                this.stunned = false;
            }
        }
        
        // Update slow effect
        if (this.slowEffectTime > 0) {
            this.slowEffectTime -= deltaTime;
            if (this.slowEffectTime <= 0) {
                this.slowEffect = 1.0;
            }
        }
        
        // Update distraction
        if (this.distractedTime > 0) {
            this.distractedTime -= deltaTime;
            if (this.distractedTime <= 0) {
                this.distractedBy = null;
            }
        }
    }

    updateMovement(deltaTime) {
        // Get current path - try multiple access methods
        let path = null;
        
        // Try accessing through game
        if (window.game?.systemManager?.getLevelManager) {
            const levelManager = window.game.systemManager.getLevelManager();
            if (levelManager && typeof levelManager.getCurrentPath === 'function') {
                path = levelManager.getCurrentPath();
            }
        }
        
        // Try direct access to levelManager
        if (!path && window.levelManager) {
            if (typeof window.levelManager.getCurrentPath === 'function') {
                path = window.levelManager.getCurrentPath();
            }
        }
        
        // If still no path, store reference when enemy is spawned
        if (!path && this.storedPath) {
            path = this.storedPath;
        }
        
        if (!path || path.length === 0) {
            console.warn('[Enemy] No path available for movement');
            return;
        }
        
        // Handle distraction (decoy defense effect)
        if (this.distractedBy) {
            this.moveToward(this.distractedBy.x, this.distractedBy.y, deltaTime);
            return;
        }
        
        // Follow path
        this.followPath(path, deltaTime);
    }

    followPath(path, deltaTime) {
        if (this.pathIndex >= path.length) {
            this.reachedEnd = true;
            return;
        }
        
        const target = path[this.pathIndex];
        const distance = Utils.math.distance(this.x, this.y, target.x, target.y);
        
        // Move to next waypoint if close enough
        if (distance < 20) {
            this.pathIndex++;
            this.pathProgress = this.pathIndex / path.length;
            
            if (this.pathIndex >= path.length) {
                this.reachedEnd = true;
                return;
            }
        }
        
        // Move toward current target
        this.moveToward(target.x, target.y, deltaTime);
    }

    moveToward(targetX, targetY, deltaTime) {
        const angle = Utils.math.angle(this.x, this.y, targetX, targetY);
        const currentSpeed = this.speed * this.slowEffect * deltaTime * 0.1;
        
        this.x += Math.cos(angle) * currentSpeed;
        this.y += Math.sin(angle) * currentSpeed;
    }

    updateSpecialAbilities(deltaTime, defenses, enemies) {
        this.abilities.forEach(ability => {
            this.abilityTimers[ability] += deltaTime;
            
            switch (ability) {
                case 'erratic_movement':
                    this.updateErraticMovement(deltaTime);
                    break;
                case 'persistent':
                    this.updatePersistent(defenses);
                    break;
                case 'stealth':
                    this.updateStealth(deltaTime);
                    break;
                case 'scanning':
                    this.updateScanning(deltaTime, defenses);
                    break;
                case 'phase_shift':
                    this.updatePhaseShift(deltaTime);
                    break;
                case 'teleport':
                    this.updateTeleport(deltaTime);
                    break;
                case 'healing_aura':
                    this.updateHealingAura(deltaTime, enemies);
                    break;
                case 'corruption':
                    this.updateCorruption(defenses);
                    break;
            }
        });
    }

    updateErraticMovement(deltaTime) {
        this.erraticTimer += deltaTime;
        
        if (this.erraticTimer > 2000) { // Change direction every 2 seconds
            this.erraticDirection = Math.random() * Math.PI * 2;
            this.erraticTimer = 0;
        }
        
        // Add some random movement
        const erraticSpeed = 0.3;
        this.x += Math.cos(this.erraticDirection) * erraticSpeed;
        this.y += Math.sin(this.erraticDirection) * erraticSpeed;
    }

    updatePersistent(defenses) {
        // Federal agents speed up when near defenses
        let nearDefense = false;
        
        defenses.forEach(defense => {
            const distance = Utils.math.distance(this.x, this.y, defense.x, defense.y);
            if (distance <= this.detectionRadius) {
                nearDefense = true;
            }
        });
        
        this.speed = nearDefense ? this.baseSpeed * 1.3 : this.baseSpeed;
    }

    updateStealth(deltaTime) {
        this.stealthTimer += deltaTime;
        
        if (this.stealthTimer > 5000) { // Toggle stealth every 5 seconds
            this.stealthMode = !this.stealthMode;
            this.color = this.stealthMode ? '#88888888' : this.originalColor;
            this.stealthTimer = 0;
        }
    }

    updateScanning(deltaTime) {
        this.scanAngle += deltaTime * 0.002; // Slow rotation
        
        // AI Surveillance enemies adapt to defense patterns
        if (this.abilityTimers.scanning > 8000) {
            this.speed = Math.min(this.baseSpeed * 1.2, this.speed + 0.1);
            this.abilityTimers.scanning = 0;
        }
    }

    updatePhaseShift(deltaTime) {
        this.phaseTimer += deltaTime;
        
        if (this.phaseTimer > 6000) { // Phase shift every 6 seconds
            this.phaseShifted = !this.phaseShifted;
            this.phaseTimer = 0;
            
            // Visual effect
            if (window.particleSystem) {
                window.particleSystem.emit('upgrade', this.x, this.y, {
                    count: 6,
                    color: [this.color]
                });
            }
        }
    }

    updateTeleport(deltaTime) {
        this.teleportCooldown -= deltaTime;
        
        if (this.teleportCooldown <= 0 && Math.random() < 0.02) { // 2% chance per update
            this.performTeleport();
            this.teleportCooldown = 8000; // 8 second cooldown
        }
    }

    performTeleport() {
        // Teleport forward along the path
        const levelManager = window.game?.systemManager?.getLevelManager();
        if (!levelManager) return;
        
        const path = levelManager.getCurrentPath();
        if (!path || path.length === 0) return;
        
        const teleportDistance = Math.min(3, path.length - this.pathIndex - 1);
        if (teleportDistance > 0) {
            this.pathIndex = Math.min(path.length - 1, this.pathIndex + teleportDistance);
            const newTarget = path[this.pathIndex];
            this.x = newTarget.x;
            this.y = newTarget.y;
            
            // Visual effect
            if (window.particleSystem) {
                window.particleSystem.emit('upgrade', this.x, this.y, {
                    count: 10,
                    color: ['#ff44ff', '#ffffff']
                });
            }
        }
    }

    updateHealingAura(deltaTime, enemies) {
        this.healingTimer += deltaTime;
        
        if (this.healingTimer > 3000) { // Heal every 3 seconds
            enemies.forEach(enemy => {
                if (enemy !== this && enemy.isAlive) {
                    const distance = Utils.math.distance(this.x, this.y, enemy.x, enemy.y);
                    if (distance <= this.healingRadius) {
                        const healAmount = Math.min(10, enemy.maxHealth - enemy.health);
                        enemy.health += healAmount;
                        
                        if (healAmount > 0 && window.particleSystem) {
                            window.particleSystem.emit('heal', enemy.x, enemy.y, {
                                count: 3,
                                color: ['#00ff88']
                            });
                        }
                    }
                }
            });
            
            this.healingTimer = 0;
        }
    }

    updateCorruption(defenses) {
        // Corrupted monks weaken nearby defenses
        defenses.forEach(defense => {
            const distance = Utils.math.distance(this.x, this.y, defense.x, defense.y);
            if (distance <= this.corruptionRadius) {
                // Apply corruption effect (already handled in defense update)
                if (!defense.corruptedBy || defense.corruptedBy === this) {
                    defense.corruptedBy = this;
                    defense.corruptedTime = 1000; // Refresh corruption
                }
            }
        });
    }

    updateVisualEffects(deltaTime) {
        if (this.flashTime > 0) {
            this.flashTime -= deltaTime;
        }
    }

    updateDeathAnimation(deltaTime) {
        this.deathAnimationTime += deltaTime;
        
        // Remove after death animation
        if (this.deathAnimationTime > 1000) {
            // Mark for removal
            this.shouldRemove = true;
        }
    }

    checkReachedEnd() {
        if (this.reachedEnd && window.game) {
            // Enemy reached end, player loses life
            window.game.onEnemyEscaped(this);
        }
    }

    takeDamage(amount, damageType = 'normal') {
        if (!this.isAlive) return false;
        
        // Apply armor reduction
        let actualDamage = Math.max(1, amount - this.armor);
        
        // Handle special damage types
        switch (damageType) {
            case 'armor_piercing':
                actualDamage = amount; // Ignore armor
                break;
            case 'chain':
                actualDamage = amount * 0.8; // Chain lightning does less damage
                break;
            case 'explosive':
                actualDamage = amount * 1.2; // Explosive does more damage
                break;
        }
        
        // Phase-shifted enemies take reduced damage
        if (this.phaseShifted) {
            actualDamage *= 0.5;
        }
        
        // Stealthed enemies take less damage from non-scanning defenses
        if (this.stealthMode && damageType !== 'scanning') {
            actualDamage *= 0.7;
        }
        
        this.health -= actualDamage;
        this.flashTime = 200;
        this.lastDamageTime = Utils.performance.now();
        
        // Visual feedback
        if (window.particleSystem) {
            window.particleSystem.emit('hit', this.x, this.y, {
                count: 4,
                color: ['#ffffff', this.color]
            });
        }
        
        if (this.health <= 0) {
            this.die();
            return true; // Enemy was killed
        }
        
        return false;
    }

    die() {
        this.isAlive = false;
        console.log(`[Enemy] ${this.type} killed`);
        
        // Death effects
        if (window.particleSystem) {
            window.particleSystem.emit('death', this.x, this.y, {
                count: 8,
                color: [this.color, '#ffffff']
            });
        }
        
        if (window.audioManager) {
            window.audioManager.playSound('enemy_death', 0.5);
        }
        
        // Award kill to nearby defense (for statistics)
        if (window.game && window.game.defenseManager) {
            const nearbyDefense = window.game.defenseManager.defenses.find(defense => {
                const distance = Utils.math.distance(this.x, this.y, defense.x, defense.y);
                return distance <= defense.range;
            });
            
            if (nearbyDefense) {
                nearbyDefense.kills++;
                nearbyDefense.totalDamageDealt += this.maxHealth;
            }
        }
    }

    render(ctx) {
        if (!this.isAlive) {
            this.renderDeathAnimation(ctx);
            return;
        }
        
        // Use sprite system if available
        if (window.spriteManager) {
            const spriteName = `enemy_${this.type}`;
            if (window.spriteManager.hasSprite(spriteName)) {
                const flash = this.flashTime > 0 ? 1.3 : 1.0;
                const alpha = this.stealthMode ? 0.5 : (this.phaseShifted ? 0.7 : 1.0);
                
                window.spriteManager.drawSpriteScaled(ctx, spriteName, 
                    this.x - this.size/2, this.y - this.size/2, 
                    flash, 0, alpha);
                
                this.renderEffects(ctx);
                return;
            }
        }
        
        // Fallback rendering
        ctx.save();
        
        // Apply visual effects
        if (this.stealthMode) {
            ctx.globalAlpha = 0.5;
        } else if (this.phaseShifted) {
            ctx.globalAlpha = 0.7;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
        }
        
        if (this.stunned) {
            ctx.filter = 'brightness(0.6)';
        }
        
        // Flash effect
        if (this.flashTime > 0) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = this.color;
        }
        
        // Enemy body
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Enemy outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Health bar (for stronger enemies)
        if (this.maxHealth > 100) {
            this.renderHealthBar(ctx);
        }
        
        ctx.restore();
        
        this.renderEffects(ctx);
    }

    renderHealthBar(ctx) {
        const barWidth = this.size * 2;
        const barHeight = 4;
        const barY = this.y - this.size - 8;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(this.x - barWidth/2, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : (healthPercent > 0.25 ? '#ffff00' : '#ff0000');
        ctx.fillRect(this.x - barWidth/2, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - barWidth/2, barY, barWidth, barHeight);
    }

    renderEffects(ctx) {
        // Render ability-specific effects
        if (this.abilities.includes('scanning')) {
            // Scanner beam
            ctx.save();
            ctx.strokeStyle = '#ffff44';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            
            const beamLength = this.scanRadius;
            const endX = this.x + Math.cos(this.scanAngle) * beamLength;
            const endY = this.y + Math.sin(this.scanAngle) * beamLength;
            
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            ctx.restore();
        }
        
        if (this.abilities.includes('healing_aura')) {
            // Healing aura visualization
            ctx.save();
            ctx.strokeStyle = '#00ff88';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.healingRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        
        if (this.abilities.includes('corruption')) {
            // Corruption aura
            ctx.save();
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.corruptionRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    renderDeathAnimation(ctx) {
        // Simple fade out death animation
        const alpha = Math.max(0, 1 - (this.deathAnimationTime / 1000));
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        
        // Shrinking circle
        const size = this.size * alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    getStats() {
        return {
            type: this.type,
            health: this.health,
            maxHealth: this.maxHealth,
            speed: this.speed,
            pathProgress: this.pathProgress,
            abilities: this.abilities,
            isAlive: this.isAlive
        };
    }

    // Static factory method for creating different enemy types
    static create(type, x, y) {
        if (type === 'raidTeam' || type === 'megaCorp' || type === 'corruptedMonk') {
            // These are bosses, create Boss instance instead
            return new Boss(type, x, y);
        }
        
        return new Enemy(type, x, y);
    }

    // Static method to get available enemy types
    static getEnemyTypes() {
        return ['scriptKiddie', 'federalAgent', 'corporateSaboteur', 'aiSurveillance', 'quantumHacker', 'corruptedMonk'];
    }

    static getBossTypes() {
        return ['raidTeam', 'megaCorp', 'corruptedMonk'];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Enemy;
} else {
    window.Enemy = Enemy;
}