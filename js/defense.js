
class Defense {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        
        // Get config from global CONFIG
        this.config = this.getDefenseConfig(type);
        
        // Base stats
        this.baseDamage = this.config.damage;
        this.baseRange = this.config.range;
        this.baseFireRate = this.config.fireRate;
        this.color = this.config.color;
        this.cost = this.config.cost;
        this.size = 20;
        
        // Upgrade system - simplified
        this.level = 1;
        this.maxLevel = 5;
        this.upgradeMultiplier = 1.2;
        
        // Current stats (affected by upgrades)
        this.damage = this.baseDamage;
        this.range = this.baseRange;
        this.fireRate = this.baseFireRate;
        
        // Targeting and combat
        this.target = null;
        this.lastFireTime = 0;
        this.targetingMode = 'closest';
        
        // Special abilities - simplified
        this.abilities = this.config.abilities || [];
        this.abilityTimers = {};
        
        // Visual effects
        this.fireAnimation = 0;
        this.rangeIndicator = false;
        this.rotationAngle = 0;
        
        // State management
        this.isActive = true;
        this.stunned = false;
        this.stunnedTime = 0;
        
        // Statistics
        this.kills = 0;
        this.totalDamageDealt = 0;
        this.shotsFired = 0;
        
        this.initializeAbilities();
    }

    getDefenseConfig(type) {
        // Fallback config if CONFIG is not available
        const fallbackConfigs = {
            firewall: {
                damage: 25,
                range: 80,
                fireRate: 1.0,
                color: '#ff6b6b',
                cost: { dharma: 50, bandwidth: 0, anonymity: 0 },
                abilities: []
            },
            encryption: {
                damage: 40,
                range: 70,
                fireRate: 0.8,
                color: '#4ecdc4',
                cost: { dharma: 75, bandwidth: 25, anonymity: 0 },
                abilities: ['armor_piercing']
            },
            decoy: {
                damage: 15,
                range: 100,
                fireRate: 1.5,
                color: '#45b7d1',
                cost: { dharma: 60, bandwidth: 0, anonymity: 30 },
                abilities: ['distraction']
            },
            mirror: {
                damage: 60,
                range: 60,
                fireRate: 0.6,
                color: '#f9ca24',
                cost: { dharma: 100, bandwidth: 50, anonymity: 25 },
                abilities: ['reflect']
            },
            anonymity: {
                damage: 30,
                range: 90,
                fireRate: 1.2,
                color: '#6c5ce7',
                cost: { dharma: 80, bandwidth: 30, anonymity: 50 },
                abilities: ['stealth']
            },
            distributor: {
                damage: 45,
                range: 120,
                fireRate: 0.9,
                color: '#ffd700',
                cost: { dharma: 150, bandwidth: 75, anonymity: 0 },
                abilities: ['chain_attack']
            }
        };

        if (typeof CONFIG !== 'undefined' && CONFIG.DEFENSE_TYPES && CONFIG.DEFENSE_TYPES[type]) {
            return CONFIG.DEFENSE_TYPES[type];
        }
        
        return fallbackConfigs[type] || fallbackConfigs.firewall;
    }

    initializeAbilities() {
        // Initialize ability-specific properties
        this.abilities.forEach(ability => {
            this.abilityTimers[ability] = 0;
            
            switch (ability) {
                case 'armor_piercing':
                    this.armorPiercing = true;
                    break;
                case 'chain_attack':
                    this.chainTargets = 2;
                    this.chainRange = 60;
                    break;
                case 'stealth':
                    this.stealthed = false;
                    this.stealthDuration = 3000;
                    break;
                case 'reflect':
                    this.reflectChance = 0.3;
                    break;
                case 'distraction':
                    this.distractionRadius = this.range * 1.2;
                    break;
            }
        });
    }

    update(deltaTime, enemies) {
        if (!this.isActive) return;
        
        // Update status effects
        this.updateStatusEffects(deltaTime);
        
        if (this.stunned) return;
        
        // Update targeting
        this.updateTargeting(enemies);
        
        // Update abilities
        this.updateAbilities(deltaTime, enemies);
        
        // Try to fire
        if (this.canFire() && this.target) {
            this.fire();
        }
        
        // Update animations
        this.updateAnimations(deltaTime);
    }

    updateStatusEffects(deltaTime) {
        if (this.stunned) {
            this.stunnedTime -= deltaTime;
            if (this.stunnedTime <= 0) {
                this.stunned = false;
            }
        }
    }

    updateTargeting(enemies) {
        // Clear target if dead or out of range
        if (this.target && (!this.target.isAlive || this.getDistanceToTarget() > this.range)) {
            this.target = null;
        }
        
        // Find new target
        if (!this.target) {
            this.target = this.findTarget(enemies);
        }
        
        // Update rotation
        if (this.target) {
            const targetAngle = Utils.math.angle(this.x, this.y, this.target.x, this.target.y);
            this.rotationAngle = Utils.math.lerp(this.rotationAngle, targetAngle, 0.1);
        }
    }

    updateAbilities(deltaTime, enemies) {
        this.abilities.forEach(ability => {
            this.abilityTimers[ability] += deltaTime;
            
            switch (ability) {
                case 'chain_attack':
                    // Chain attacks happen on normal fire
                    break;
                case 'stealth':
                    if (this.abilityTimers[ability] > 10000) { // Every 10 seconds
                        this.activateStealth();
                        this.abilityTimers[ability] = 0;
                    }
                    break;
                case 'distraction':
                    this.updateDistraction(enemies);
                    break;
            }
        });
    }

    updateDistraction(enemies) {
        // Decoy defenses attract nearby enemies
        enemies.forEach(enemy => {
            const distance = Utils.math.distance(this.x, this.y, enemy.x, enemy.y);
            if (distance <= this.distractionRadius && Math.random() < 0.1) {
                enemy.distractedBy = this;
                enemy.distractedTime = 2000;
            }
        });
    }

    activateStealth() {
        this.stealthed = true;
        setTimeout(() => {
            this.stealthed = false;
        }, this.stealthDuration);
    }

    updateAnimations(deltaTime) {
        // Simple fire animation
        if (this.fireAnimation > 0) {
            this.fireAnimation -= deltaTime;
        }
    }

    findTarget(enemies) {
        const validTargets = enemies.filter(enemy => {
            if (!enemy.isAlive) return false;
            const distance = Utils.math.distance(this.x, this.y, enemy.x, enemy.y);
            return distance <= this.range;
        });
        
        if (validTargets.length === 0) return null;
        
        switch (this.targetingMode) {
            case 'closest':
                return validTargets.reduce((closest, enemy) => {
                    const closestDist = Utils.math.distance(this.x, this.y, closest.x, closest.y);
                    const enemyDist = Utils.math.distance(this.x, this.y, enemy.x, enemy.y);
                    return enemyDist < closestDist ? enemy : closest;
                });
            
            case 'strongest':
                return validTargets.reduce((strongest, enemy) => {
                    return enemy.maxHealth > strongest.maxHealth ? enemy : strongest;
                });
            
            case 'weakest':
                return validTargets.reduce((weakest, enemy) => {
                    return enemy.health < weakest.health ? enemy : weakest;
                });
            
            case 'first':
                return validTargets.reduce((first, enemy) => {
                    return enemy.pathProgress > first.pathProgress ? enemy : first;
                });
            
            case 'last':
                return validTargets.reduce((last, enemy) => {
                    return enemy.pathProgress < last.pathProgress ? enemy : last;
                });
            
            default:
                return validTargets[0];
        }
    }

    canFire() {
        const now = Utils.performance.now();
        const fireInterval = 1000 / this.fireRate;
        return (now - this.lastFireTime) >= fireInterval;
    }

    fire() {
        if (!this.target) return null;
        
        this.lastFireTime = Utils.performance.now();
        this.fireAnimation = 200;
        this.shotsFired++;
        
        // Create projectile
        let projectile = null;
        if (window.projectilePool) {
            projectile = window.projectilePool.getProjectile(
                this.x, this.y, this.target, this.damage, 260, 'normal', this.type
            );
        }
        
        // Handle special abilities
        this.handleSpecialAttacks(this.target);
        
        // Audio feedback
        if (window.audioManager) {
            window.audioManager.playSound('defense_fire', 0.3);
        }
        
        // Visual feedback
        if (window.particleSystem) {
            window.particleSystem.emit('muzzleFlash', this.x, this.y, {
                count: 3,
                color: [this.color]
            });
        }
        
        return projectile;
    }

    handleSpecialAttacks(target) {
        if (this.abilities.includes('chain_attack') && Math.random() < 0.3) {
            this.executeChainAttack(target);
        }
        
        if (this.abilities.includes('reflect') && Math.random() < this.reflectChance) {
            this.executeReflectAttack(target);
        }
    }

    executeChainAttack(primaryTarget) {
        // Find nearby enemies for chain attack
        const enemies = window.game?.enemies || [];
        const chainTargets = enemies.filter(enemy => {
            if (enemy === primaryTarget || !enemy.isAlive) return false;
            const distance = Utils.math.distance(primaryTarget.x, primaryTarget.y, enemy.x, enemy.y);
            return distance <= this.chainRange;
        }).slice(0, this.chainTargets);
        
        chainTargets.forEach((enemy, index) => {
            setTimeout(() => {
                const chainDamage = this.damage * (0.8 - index * 0.1);
                enemy.takeDamage(chainDamage, 'chain');
                
                if (window.particleSystem) {
                    window.particleSystem.emit('hit', enemy.x, enemy.y, {
                        count: 4,
                        color: [this.color, '#ffffff']
                    });
                }
            }, index * 100);
        });
    }

    executeReflectAttack(target) {
        // Reflect some damage back as area effect
        const reflectDamage = this.damage * 0.5;
        const reflectRadius = 50;
        
        const enemies = window.game?.enemies || [];
        enemies.forEach(enemy => {
            const distance = Utils.math.distance(target.x, target.y, enemy.x, enemy.y);
            if (distance <= reflectRadius) {
                enemy.takeDamage(reflectDamage, 'reflect');
            }
        });
        
        if (window.particleSystem) {
            window.particleSystem.emit('explosion', target.x, target.y, {
                count: 8,
                color: ['#f9ca24', '#ffffff']
            });
        }
    }

    upgrade() {
        if (this.level >= this.maxLevel) return false;
        
        this.level++;
        
        // Apply upgrade multipliers
        this.damage = Math.floor(this.baseDamage * Math.pow(this.upgradeMultiplier, this.level - 1));
        this.range = Math.floor(this.baseRange * Math.pow(1.1, this.level - 1));
        this.fireRate = this.baseFireRate * Math.pow(1.1, this.level - 1);
        
        // Visual feedback
        if (window.particleSystem) {
            window.particleSystem.emit('upgrade', this.x, this.y, {
                count: 12,
                color: [this.color, '#ffd60a']
            });
        }
        
        if (window.audioManager) {
            window.audioManager.playSound('defense_upgrade');
        }
        
        console.log(`[Defense] ${this.type} upgraded to level ${this.level}`);
        return true;
    }

    getUpgradeCost() {
        if (this.level >= this.maxLevel) return null;
        
        const multiplier = Math.pow(1.5, this.level - 1);
        return {
            dharma: Math.floor(this.cost.dharma * multiplier),
            bandwidth: Math.floor(this.cost.bandwidth * multiplier),
            anonymity: Math.floor(this.cost.anonymity * multiplier)
        };
    }

    getSellValue() {
        const sellRatio = 0.7;
        const totalLevels = this.level;
        let totalValue = { dharma: 0, bandwidth: 0, anonymity: 0 };
        
        for (let i = 1; i <= totalLevels; i++) {
            const levelMultiplier = Math.pow(1.5, i - 1);
            totalValue.dharma += Math.floor(this.cost.dharma * levelMultiplier);
            totalValue.bandwidth += Math.floor(this.cost.bandwidth * levelMultiplier);
            totalValue.anonymity += Math.floor(this.cost.anonymity * levelMultiplier);
        }
        
        return {
            dharma: Math.floor(totalValue.dharma * sellRatio),
            bandwidth: Math.floor(totalValue.bandwidth * sellRatio),
            anonymity: Math.floor(totalValue.anonymity * sellRatio)
        };
    }

    takeDamage(damage, damageType = 'normal') {
        // Defenses can be damaged by special enemy abilities
        if (damageType === 'stun') {
            this.stunned = true;
            this.stunnedTime = 2000;
        }
        
        // Defenses are generally immune to damage in this game
        return false;
    }

    getDistanceToTarget() {
        if (!this.target) return Infinity;
        return Utils.math.distance(this.x, this.y, this.target.x, this.target.y);
    }

    render(ctx) {
        if (!this.isActive) return;
        
        // Use sprite system if available
        if (window.spriteManager) {
            const spriteName = `defense_${this.type}_level${this.level}`;
            if (window.spriteManager.hasSprite(spriteName)) {
                const scale = this.stealthed ? 0.7 : 1.0;
                const alpha = this.stealthed ? 0.5 : 1.0;
                
                window.spriteManager.drawSpriteScaled(ctx, spriteName, 
                    this.x - this.size/2, this.y - this.size/2, 
                    scale, this.rotationAngle, alpha);
                
                this.renderEffects(ctx);
                return;
            }
        }
        
        // Fallback rendering
        ctx.save();
        
        // Apply stealth effect
        if (this.stealthed) {
            ctx.globalAlpha = 0.5;
        }
        
        // Apply stun effect
        if (this.stunned) {
            ctx.filter = 'brightness(0.5)';
        }
        
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotationAngle);
        
        // Defense body
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        // Adjust size based on level
        const renderSize = this.size + (this.level - 1) * 2;
        
        ctx.fillRect(-renderSize/2, -renderSize/2, renderSize, renderSize);
        ctx.strokeRect(-renderSize/2, -renderSize/2, renderSize, renderSize);
        
        // Level indicator
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(this.level.toString(), 0, 4);
        
        // Fire animation
        if (this.fireAnimation > 0) {
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(renderSize/2, 0, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        this.renderEffects(ctx);
    }

    renderEffects(ctx) {
        // Range indicator when selected
        if (this.rangeIndicator) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        // Special ability indicators
        if (this.abilities.includes('distraction')) {
            ctx.strokeStyle = '#45b7d1';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.distractionRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    showRangeIndicator(show = true) {
        this.rangeIndicator = show;
    }

    setTargetingMode(mode) {
        const validModes = ['closest', 'strongest', 'weakest', 'first', 'last'];
        if (validModes.includes(mode)) {
            this.targetingMode = mode;
        }
    }

    getStats() {
        return {
            type: this.type,
            level: this.level,
            damage: this.damage,
            range: this.range,
            fireRate: this.fireRate,
            kills: this.kills,
            totalDamageDealt: this.totalDamageDealt,
            shotsFired: this.shotsFired,
            abilities: this.abilities,
            cost: this.cost,
            upgradeCost: this.getUpgradeCost(),
            sellValue: this.getSellValue()
        };
    }

    // Simplified validation - no complex caching
    static canUpgrade(defense, resources) {
        if (defense.level >= defense.maxLevel) return false;
        
        const cost = defense.getUpgradeCost();
        return resources.dharma >= cost.dharma &&
               resources.bandwidth >= cost.bandwidth &&
               resources.anonymity >= cost.anonymity;
    }

    static getDefenseTypes() {
        return ['firewall', 'encryption', 'decoy', 'mirror', 'anonymity', 'distributor'];
    }

    destroy() {
        this.isActive = false;
        this.target = null;
    }
}

// Simple upgrade tree validation without caching
class UpgradeValidator {
    static validateUpgrade(defense, upgradeType) {
        if (!defense || defense.level >= defense.maxLevel) {
            return { valid: false, reason: 'Max level reached' };
        }
        
        switch (upgradeType) {
            case 'damage':
                return { valid: true, cost: defense.getUpgradeCost() };
            case 'range':
                return { valid: true, cost: defense.getUpgradeCost() };
            case 'speed':
                return { valid: true, cost: defense.getUpgradeCost() };
            default:
                return { valid: false, reason: 'Unknown upgrade type' };
        }
    }
    
    static getAvailableUpgrades(defense) {
        if (!defense || defense.level >= defense.maxLevel) {
            return [];
        }
        
        return [
            { type: 'damage', name: 'Damage Boost', cost: defense.getUpgradeCost() },
            { type: 'range', name: 'Range Extension', cost: defense.getUpgradeCost() },
            { type: 'speed', name: 'Fire Rate Boost', cost: defense.getUpgradeCost() }
        ];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Defense, UpgradeValidator };
} else {
    window.Defense = Defense;
    window.UpgradeValidator = UpgradeValidator;
}