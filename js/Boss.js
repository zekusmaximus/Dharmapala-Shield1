import Utils from './utils.js';

class Boss {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        
        // Get boss configuration
        this.config = this.getBossConfig(type);
        
        // Basic properties
        this.health = this.config.maxHealth;
        this.maxHealth = this.config.maxHealth;
        this.speed = this.config.speed;
        this.size = this.config.size;
        this.color = this.config.color;
        this.reward = this.config.reward;
        
        // Boss phases - simple state machine
        this.phase = 1;
        this.maxPhases = this.config.phases || 3;
        this.phaseThresholds = this.calculatePhaseThresholds();
        
        // State
        this.isAlive = true;
        this.isBoss = true;
        this.reachedEnd = false;
        
        // Movement
        this.pathIndex = 0;
        this.targetX = x;
        this.targetY = y;
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Abilities
        this.abilities = this.config.abilities || [];
        this.abilityTimers = new Map();
        this.abilityStates = new Map();
        
        // Visual effects
        this.flashTime = 0;
        this.phaseTransitionTime = 0;
        this.warningShown = false;
        
        // Statistics
        this.spawnTime = Utils.performance.now();
        this.damageDealt = 0;
        this.abilitiesUsed = 0;
        
        this.initializeAbilities();
        this.initializePhase(1);
    }

    getBossConfig(type) {
        const bossConfigs = {
            raidTeam: {
                maxHealth: 1000,
                speed: 0.5,
                size: 40,
                color: '#ff0080',
                reward: { dharma: 200, bandwidth: 100, anonymity: 50 },
                phases: 3,
                abilities: ['spawn_minions', 'emp_burst', 'data_corruption']
            },
            megaCorp: {
                maxHealth: 1500,
                speed: 0.3,
                size: 50,
                color: '#800080',
                reward: { dharma: 300, bandwidth: 150, anonymity: 100 },
                phases: 4,
                abilities: ['drone_swarm', 'shield_regen', 'market_crash', 'hostile_takeover']
            },
            corruptedMonk: {
                maxHealth: 800,
                speed: 0.7,
                size: 35,
                color: '#ff6600',
                reward: { dharma: 250, bandwidth: 50, anonymity: 150 },
                phases: 3,
                abilities: ['healing_aura', 'corruption_field', 'meditation_storm']
            }
        };

        if (typeof CONFIG !== 'undefined' && CONFIG.BOSS_TYPES && CONFIG.BOSS_TYPES[type]) {
            return CONFIG.BOSS_TYPES[type];
        }
        
        return bossConfigs[type] || bossConfigs.raidTeam;
    }

    calculatePhaseThresholds() {
        const thresholds = [];
        for (let i = 1; i < this.maxPhases; i++) {
            thresholds.push(this.maxHealth * (1 - i / this.maxPhases));
        }
        return thresholds;
    }

    initializeAbilities() {
        this.abilities.forEach(ability => {
            this.abilityTimers.set(ability, 0);
            this.abilityStates.set(ability, { active: false, cooldown: 0 });
        });
    }

    initializePhase(newPhase) {
        if (newPhase === this.phase) return;
        
        console.log(`[Boss] ${this.type} entering phase ${newPhase}`);
        
        const oldPhase = this.phase;
        this.phase = Math.max(1, Math.min(newPhase, this.maxPhases));
        
        // Phase-specific initialization
        switch (this.phase) {
            case 1:
                this.speed = this.config.speed;
                break;
            case 2:
                this.speed = this.config.speed * 1.2;
                this.color = this.lightenColor(this.config.color);
                break;
            case 3:
                this.speed = this.config.speed * 1.5;
                this.color = this.lightenColor(this.color);
                break;
            case 4:
                this.speed = this.config.speed * 2;
                this.color = '#ffffff';
                break;
        }
        
        // Show phase transition effect
        this.phaseTransitionTime = 1000;
        
        // Trigger events
        this.onPhaseChange(oldPhase, this.phase);
        
        // Visual and audio feedback
        if (window.particleSystem) {
            window.particleSystem.emit('upgrade', this.x, this.y, {
                count: 20,
                color: [this.color, '#ffffff']
            });
        }
        
        if (window.audioManager) {
            window.audioManager.playSound('boss_phase_change');
        }
        
        // Show warning to player
        if (window.uiManager && !this.warningShown) {
            window.uiManager.showBossWarning({
                name: `${this.type} - Phase ${this.phase}`,
                description: this.getPhaseDescription(this.phase)
            });
            this.warningShown = true;
        }
    }

    getPhaseDescription(phase) {
        const descriptions = {
            1: "The battle begins...",
            2: "Growing more aggressive!",
            3: "Unleashing full power!",
            4: "Final desperate assault!"
        };
        return descriptions[phase] || "Unknown phase";
    }

    lightenColor(color) {
        // Simple color lightening for phase transitions
        const colors = {
            '#ff0080': '#ff40a0',
            '#800080': '#a040a0',
            '#ff6600': '#ff8833'
        };
        return colors[color] || color;
    }

    update(deltaTime, defenses = [], enemies = []) {
        if (!this.isAlive) return;
        
        // Check for phase transitions
        this.updatePhase();
        
        // Update abilities
        this.updateAbilities(deltaTime, defenses, enemies);
        
        // Update movement
        this.updateMovement(deltaTime);
        
        // Update visual effects
        this.updateEffects(deltaTime);
        
        // Check victory condition
        this.checkReachedEnd();
    }

    updatePhase() {
        const healthPercent = this.health / this.maxHealth;
        
        for (let i = 0; i < this.phaseThresholds.length; i++) {
            if (this.health <= this.phaseThresholds[i] && this.phase <= i + 1) {
                this.initializePhase(i + 2);
                break;
            }
        }
    }

    updateAbilities(deltaTime, defenses, enemies) {
        this.abilities.forEach(ability => {
            const timer = this.abilityTimers.get(ability) + deltaTime;
            this.abilityTimers.set(ability, timer);
            
            const state = this.abilityStates.get(ability);
            if (state.cooldown > 0) {
                state.cooldown -= deltaTime;
            }
            
            // Trigger abilities based on phase and timing
            if (this.shouldTriggerAbility(ability, timer)) {
                this.triggerAbility(ability, defenses, enemies);
            }
        });
    }

    shouldTriggerAbility(ability, timer) {
        const intervals = {
            spawn_minions: 8000,
            emp_burst: 12000,
            data_corruption: 15000,
            drone_swarm: 10000,
            shield_regen: 20000,
            market_crash: 25000,
            hostile_takeover: 30000,
            healing_aura: 6000,
            corruption_field: 18000,
            meditation_storm: 22000
        };
        
        const interval = intervals[ability] || 10000;
        const phaseMultiplier = Math.max(0.5, 2 - this.phase * 0.3);
        const adjustedInterval = interval * phaseMultiplier;
        
        const state = this.abilityStates.get(ability);
        return timer >= adjustedInterval && state.cooldown <= 0;
    }

    triggerAbility(ability, defenses, enemies) {
        console.log(`[Boss] ${this.type} using ability: ${ability}`);
        
        this.abilityTimers.set(ability, 0);
        this.abilitiesUsed++;
        
        const state = this.abilityStates.get(ability);
        state.cooldown = 2000; // 2 second cooldown
        
        switch (ability) {
            case 'spawn_minions':
                this.spawnMinions(enemies);
                break;
            case 'emp_burst':
                this.empBurst(defenses);
                break;
            case 'data_corruption':
                this.dataCorruption(defenses);
                break;
            case 'drone_swarm':
                this.droneSwarm(enemies);
                break;
            case 'shield_regen':
                this.shieldRegen();
                break;
            case 'market_crash':
                this.marketCrash();
                break;
            case 'hostile_takeover':
                this.hostileTakeover(defenses);
                break;
            case 'healing_aura':
                this.healingAura(enemies);
                break;
            case 'corruption_field':
                this.corruptionField(defenses);
                break;
            case 'meditation_storm':
                this.meditationStorm();
                break;
        }
        
        // Visual feedback
        if (window.particleSystem) {
            window.particleSystem.emit('upgrade', this.x, this.y, {
                count: 8,
                color: [this.color]
            });
        }
        
        if (window.audioManager) {
            window.audioManager.playSound('boss_ability');
        }
    }

    // Boss Abilities (Simplified)
    spawnMinions(enemies) {
        const minionCount = this.phase + 1;
        for (let i = 0; i < minionCount; i++) {
            // Spawn enemies near the boss
            const angle = (Math.PI * 2 / minionCount) * i;
            const distance = 80;
            const minionX = this.x + Math.cos(angle) * distance;
            const minionY = this.y + Math.sin(angle) * distance;
            
            // Create minion (simplified)
            const minion = {
                type: 'minion',
                x: minionX,
                y: minionY,
                health: 50,
                maxHealth: 50,
                speed: 1.5,
                size: 15,
                color: '#ff8080',
                isAlive: true,
                isBossMinion: true
            };
            
            enemies.push(minion);
        }
    }

    empBurst(defenses) {
        // Stun nearby defenses
        defenses.forEach(defense => {
            const distance = Utils.math.distance(this.x, this.y, defense.x, defense.y);
            if (distance <= 150) {
                defense.stunned = true;
                defense.stunnedTime = 3000;
            }
        });
        
        // Screen flash effect
        if (window.uiManager) {
            window.uiManager.flashScreen('#0080ff', 300);
        }
    }

    dataCorruption(defenses) {
        // Reduce defense effectiveness temporarily
        defenses.forEach(defense => {
            const distance = Utils.math.distance(this.x, this.y, defense.x, defense.y);
            if (distance <= 200) {
                defense.corruptedTime = 5000;
                defense.damage *= 0.5;
            }
        });
    }

    droneSwarm(enemies) {
        // Similar to spawn minions but with different properties
        this.spawnMinions(enemies);
    }

    shieldRegen() {
        // Regenerate health
        const healAmount = Math.min(this.maxHealth * 0.1, this.maxHealth - this.health);
        this.health += healAmount;
        
        if (window.particleSystem) {
            window.particleSystem.emit('heal', this.x, this.y, {
                count: 10,
                color: ['#00ff88']
            });
        }
    }

    marketCrash() {
        // Drain player resources
        if (window.game) {
            const drain = { dharma: 50, bandwidth: 25, anonymity: 25 };
            window.game.resources.dharma = Math.max(0, window.game.resources.dharma - drain.dharma);
            window.game.resources.bandwidth = Math.max(0, window.game.resources.bandwidth - drain.bandwidth);
            window.game.resources.anonymity = Math.max(0, window.game.resources.anonymity - drain.anonymity);
            window.game.updateUI();
        }
        
        if (window.uiManager) {
            window.uiManager.showNotification('Market Crash! Resources drained!', 'warning');
        }
    }

    hostileTakeover(defenses) {
        // Temporarily take control of a defense
        const nearbyDefenses = defenses.filter(defense => {
            const distance = Utils.math.distance(this.x, this.y, defense.x, defense.y);
            return distance <= 100;
        });
        
        if (nearbyDefenses.length > 0) {
            const targetDefense = nearbyDefenses[0];
            targetDefense.hostile = true;
            targetDefense.hostileTime = 8000;
        }
    }

    healingAura(enemies) {
        // Heal nearby enemies
        enemies.forEach(enemy => {
            if (enemy !== this && enemy.isAlive) {
                const distance = Utils.math.distance(this.x, this.y, enemy.x, enemy.y);
                if (distance <= 120) {
                    const healAmount = Math.min(enemy.maxHealth * 0.2, enemy.maxHealth - enemy.health);
                    enemy.health += healAmount;
                }
            }
        });
    }

    corruptionField(defenses) {
        // Similar to data corruption but wider area
        this.dataCorruption(defenses);
    }

    meditationStorm() {
        // Area attack that damages defenses
        if (window.game && window.game.defenseManager) {
            window.game.defenseManager.defenses.forEach(defense => {
                const distance = Utils.math.distance(this.x, this.y, defense.x, defense.y);
                if (distance <= 180) {
                    // Defenses don't usually take damage, but this is a special boss ability
                    defense.stunned = true;
                    defense.stunnedTime = 4000;
                }
            });
        }
        
        if (window.particleSystem) {
            window.particleSystem.emit('explosion', this.x, this.y, {
                count: 25,
                color: ['#ff6600', '#ffaa33']
            });
        }
    }

    updateMovement(deltaTime) {
        // Simple path following
        if (window.game && window.game.systemManager) {
            const levelManager = window.game.systemManager.getLevelManager();
            if (levelManager) {
                const path = levelManager.getCurrentPath();
                if (path && path.length > 0) {
                    this.followPath(path, deltaTime);
                }
            }
        }
    }

    followPath(path, deltaTime) {
        if (this.pathIndex >= path.length) {
            this.reachedEnd = true;
            return;
        }
        
        const target = path[this.pathIndex];
        const distance = Utils.math.distance(this.x, this.y, target.x, target.y);
        
        if (distance < 20) {
            this.pathIndex++;
            if (this.pathIndex >= path.length) {
                this.reachedEnd = true;
                return;
            }
        }
        
        // Move toward target
        const angle = Utils.math.angle(this.x, this.y, target.x, target.y);
        const moveSpeed = this.speed * deltaTime * 0.1;
        
        this.x += Math.cos(angle) * moveSpeed;
        this.y += Math.sin(angle) * moveSpeed;
    }

    updateEffects(deltaTime) {
        if (this.flashTime > 0) {
            this.flashTime -= deltaTime;
        }
        
        if (this.phaseTransitionTime > 0) {
            this.phaseTransitionTime -= deltaTime;
        }
    }

    checkReachedEnd() {
        // Check if boss reached the end of the path
        if (this.reachedEnd && window.game) {
            // Boss reaching end causes significant damage
            window.game.gameState.lives -= 5;
            window.uiManager.showNotification('Boss breached defenses! Critical damage!', 'error');
        }
    }

    takeDamage(amount, damageType = 'normal') {
        if (!this.isAlive) return false;
        
        // Apply damage reduction based on phase
        const damageReduction = Math.max(0, (this.phase - 1) * 0.1);
        const actualDamage = Math.max(1, amount * (1 - damageReduction));
        
        this.health -= actualDamage;
        this.flashTime = 200;
        
        // Visual feedback
        if (window.particleSystem) {
            window.particleSystem.emit('hit', this.x, this.y, {
                count: 6,
                color: ['#ffffff', '#ff0000']
            });
        }
        
        // Update boss health bar
        if (window.uiManager) {
            window.uiManager.updateBossHealth(this.health, this.maxHealth);
        }
        
        if (this.health <= 0) {
            this.die();
            return true;
        }
        
        return false;
    }

    die() {
        this.isAlive = false;
        console.log(`[Boss] ${this.type} defeated!`);
        
        // Epic death effect
        if (window.particleSystem) {
            window.particleSystem.emit('explosion', this.x, this.y, {
                count: 30,
                color: [this.color, '#ffffff', '#ffd60a']
            });
        }
        
        // Screen shake
        if (window.camera) {
            window.camera.shake(20, 1000);
        }
        
        // Achievement tracking
        if (window.game && window.game.systemManager) {
            const achievementManager = window.game.systemManager.getAchievementManager();
            if (achievementManager) {
                achievementManager.trackEvent('boss_defeated', {
                    type: this.type,
                    phase: this.phase,
                    timeAlive: Utils.performance.now() - this.spawnTime
                });
            }
        }
        
        // Big reward
        if (window.game) {
            window.game.addResources(this.reward);
            window.game.gameState.score += this.reward.dharma * 100;
        }
        
        if (window.audioManager) {
            window.audioManager.playSound('boss_death');
        }
        
        if (window.uiManager) {
            window.uiManager.showNotification(`${this.type} defeated! Epic rewards!`, 'success', 5000);
        }
    }

    onPhaseChange(oldPhase, newPhase) {
        // Override in specific boss types for custom behavior
        console.log(`[Boss] Phase transition: ${oldPhase} -> ${newPhase}`);
    }

    render(ctx) {
        if (!this.isAlive) return;
        
        // Use sprite system if available
        if (window.spriteManager) {
            const spriteName = `boss_${this.type}_phase${this.phase}`;
            if (window.spriteManager.hasSprite(spriteName)) {
                const flash = this.flashTime > 0 ? 1.5 : 1.0;
                const alpha = this.phaseTransitionTime > 0 ? 0.8 : 1.0;
                
                window.spriteManager.drawSpriteScaled(ctx, spriteName, 
                    this.x - this.size/2, this.y - this.size/2, 
                    flash, 0, alpha);
                
                this.renderEffects(ctx);
                return;
            }
        }
        
        // Fallback rendering
        ctx.save();
        
        // Phase transition effect
        if (this.phaseTransitionTime > 0) {
            ctx.globalAlpha = 0.8;
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
        }
        
        // Flash effect
        if (this.flashTime > 0) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = this.color;
        }
        
        // Boss body (larger than normal enemies)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Boss outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Phase indicator
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(`P${this.phase}`, this.x, this.y + 5);
        
        ctx.restore();
        
        this.renderEffects(ctx);
    }

    renderEffects(ctx) {
        // Render phase-specific effects
        if (this.phase >= 2) {
            // Energy aura
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 10 + Math.sin(Utils.performance.now() * 0.01) * 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        
        if (this.phase >= 3) {
            // Additional energy rings
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 20 + Math.cos(Utils.performance.now() * 0.008) * 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    getStats() {
        return {
            type: this.type,
            phase: this.phase,
            health: this.health,
            maxHealth: this.maxHealth,
            timeAlive: Utils.performance.now() - this.spawnTime,
            abilitiesUsed: this.abilitiesUsed,
            damageDealt: this.damageDealt
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Boss;
} else {
    window.Boss = Boss;
}