class DefenseManager {
    constructor() {
        this.defenses = [];
        this.selectedDefense = null;
        this.selectedDefenseType = 'firewall';
        this.placementMode = false;
        this.hoveredDefense = null;
        
        this.defenseStats = new Map();
        this.defensePool = new Map();
        
        this.callbacks = new Map();
        
        this.initializeDefenseTypes();
        this.setupEventListeners();
    }

    initializeDefenseTypes() {
        // Basic defense configurations
        this.defenseTypes = {
            firewall: {
                name: 'Firewall',
                cost: { dharma: 50, bandwidth: 0, anonymity: 0 },
                damage: 25,
                range: 80,
                fireRate: 1.0,
                color: '#ff6b6b',
                description: 'Basic defense that blocks digital threats'
            },
            encryption: {
                name: 'Encryption Node',
                cost: { dharma: 75, bandwidth: 25, anonymity: 0 },
                damage: 40,
                range: 70,
                fireRate: 0.8,
                color: '#4ecdc4',
                description: 'Encrypts attacks, dealing higher damage'
            },
            decoy: {
                name: 'Decoy Server',
                cost: { dharma: 60, bandwidth: 0, anonymity: 30 },
                damage: 15,
                range: 100,
                fireRate: 1.5,
                color: '#45b7d1',
                description: 'Attracts enemies and fires rapidly'
            },
            mirror: {
                name: 'Mirror Defense',
                cost: { dharma: 100, bandwidth: 50, anonymity: 25 },
                damage: 60,
                range: 60,
                fireRate: 0.6,
                color: '#f9ca24',
                description: 'Reflects attacks with powerful counterstrikes'
            },
            anonymity: {
                name: 'Anonymity Cloak',
                cost: { dharma: 80, bandwidth: 30, anonymity: 50 },
                damage: 30,
                range: 90,
                fireRate: 1.2,
                color: '#6c5ce7',
                description: 'Cloaked defense with stealth attacks'
            },
            distributor: {
                name: 'Load Distributor',
                cost: { dharma: 150, bandwidth: 75, anonymity: 0 },
                damage: 45,
                range: 120,
                fireRate: 0.9,
                color: '#ffd700',
                description: 'Distributes processing load, high range'
            }
        };
    }

    setupEventListeners() {
        console.log('[DefenseManager] Setting up event listeners for defense items');
        
        // Defense selection items using data-type attributes
        const defenseItems = document.querySelectorAll('.defense-item');
        console.log(`[DefenseManager] Found ${defenseItems.length} defense items`);
        
        defenseItems.forEach((item, index) => {
            const defenseType = item.dataset.type;
            console.log(`[DefenseManager] Setting up listener for defense item ${index}: ${defenseType}`);
            
            if (defenseType) {
                item.addEventListener('click', (e) => {
                    console.log(`[DefenseManager] Defense item clicked: ${defenseType}`);
                    this.selectDefenseType(defenseType);
                    e.preventDefault();
                    e.stopPropagation();
                });
                
                // Add visual feedback
                item.addEventListener('mouseenter', () => {
                    item.style.transform = 'scale(1.05)';
                    item.style.cursor = 'pointer';
                });
                
                item.addEventListener('mouseleave', () => {
                    item.style.transform = 'scale(1)';
                });
            } else {
                console.warn(`[DefenseManager] Defense item ${index} missing data-type attribute`);
            }
        });

        // Defense action buttons
        this.setupActionButtons();
    }

    setupActionButtons() {
        const actions = [
            { id: 'sell-defense-btn', handler: () => this.sellSelectedDefense() },
            { id: 'upgrade-defense-btn', handler: () => this.upgradeSelectedDefense() },
            { id: 'show-upgrade-tree-btn', handler: () => this.showUpgradeTree() },
            { id: 'toggle-targeting-btn', handler: () => this.toggleTargeting() }
        ];

        actions.forEach(action => {
            const element = document.getElementById(action.id);
            if (element) {
                element.addEventListener('click', action.handler);
            }
        });
    }

    selectDefenseType(defenseType) {
        if (!this.defenseTypes[defenseType]) {
            console.warn(`[DefenseManager] Unknown defense type: ${defenseType}`);
            return;
        }

        this.selectedDefenseType = defenseType;
        this.placementMode = true;
        this.selectedDefense = null;

        // Update UI
        this.updateDefenseSelection();
        this.triggerCallback('defenseTypeSelected', { type: defenseType });

        console.log(`[DefenseManager] Selected defense type: ${defenseType}`);
    }

    canPlaceDefense(x, y, defenseType) {
        const config = this.defenseTypes[defenseType];
        if (!config) return false;

        // Check if position is valid
        if (!this.isValidPlacement(x, y)) {
            return false;
        }

        // Check if player has enough resources
        if (!this.hasEnoughResources(config.cost)) {
            return false;
        }

        return true;
    }

    placeDefense(x, y, defenseType = this.selectedDefenseType) {
        if (!this.canPlaceDefense(x, y, defenseType)) {
            console.warn(`[DefenseManager] Cannot place defense at (${x}, ${y})`);
            return null;
        }

        const config = this.defenseTypes[defenseType];
        
        // Create defense object
        const defense = this.createDefense(x, y, defenseType, config);
        
        // Add to defense list
        this.defenses.push(defense);
        
        // Deduct resources
        this.deductResources(config.cost);
        
        // Update stats
        this.updateDefenseStats(defenseType, 'placed');
        
        // Trigger callbacks
        this.triggerCallback('defensePlace', { defense, cost: config.cost });
        
        // Exit placement mode
        this.placementMode = false;
        
        console.log(`[DefenseManager] Placed ${defenseType} defense at (${x}, ${y})`);
        return defense;
    }

    createDefense(x, y, type, config) {
        const defense = {
            id: Utils.game.generateId(),
            x: x,
            y: y,
            type: type,
            level: 1,
            damage: config.damage,
            range: config.range,
            fireRate: config.fireRate,
            color: config.color,
            
            // State
            lastFired: 0,
            target: null,
            kills: 0,
            totalDamage: 0,
            
            // Visual
            angle: 0,
            size: 20,
            
            // Methods
            canFire: function() {
                const now = Utils.performance.now();
                return (now - this.lastFired) >= (1000 / this.fireRate);
            },
            
            fire: function(target) {
                if (!this.canFire()) return null;
                
                this.lastFired = Utils.performance.now();
                this.target = target;
                this.angle = Utils.math.angle(this.x, this.y, target.x, target.y);
                
                // Create projectile
                const projectile = window.projectilePool?.getProjectile(
                    this.x, this.y, target, this.damage, 260, 'normal', this.type
                );
                
                return projectile;
            },
            
            upgrade: function() {
                this.level++;
                this.damage *= 1.2;
                this.range *= 1.1;
                this.fireRate *= 1.1;
            },
            
            takeDamage: function(damage) {
                // Defenses can be damaged by special enemy abilities
                return false; // Not destroyed
            }
        };
        
        return defense;
    }

    selectDefense(defense) {
        this.selectedDefense = defense;
        this.placementMode = false;
        
        this.updateDefenseInfo();
        this.triggerCallback('defenseSelected', { defense });
    }

    deselectDefense() {
        this.selectedDefense = null;
        this.updateDefenseInfo();
        this.triggerCallback('defenseDeselected');
    }

    sellSelectedDefense() {
        if (!this.selectedDefense) return;
        
        const defense = this.selectedDefense;
        const sellValue = this.calculateSellValue(defense);
        
        // Remove from defenses array
        const index = this.defenses.indexOf(defense);
        if (index > -1) {
            this.defenses.splice(index, 1);
        }
        
        // Refund resources
        this.refundResources(sellValue);
        
        // Update stats
        this.updateDefenseStats(defense.type, 'sold');
        
        // Trigger callbacks
        this.triggerCallback('defenseSold', { defense, refund: sellValue });
        
        // Deselect
        this.deselectDefense();
        
        console.log(`[DefenseManager] Sold ${defense.type} defense for`, sellValue);
    }

    upgradeSelectedDefense() {
        if (!this.selectedDefense) return;
        
        const defense = this.selectedDefense;
        const upgradeCost = this.calculateUpgradeCost(defense);
        
        if (!this.hasEnoughResources(upgradeCost)) {
            console.warn('[DefenseManager] Not enough resources to upgrade');
            this.triggerCallback('upgradeFailure', { reason: 'insufficient_resources' });
            return;
        }
        
        // Deduct upgrade cost
        this.deductResources(upgradeCost);
        
        // Apply upgrade
        defense.upgrade();
        
        // Update stats
        this.updateDefenseStats(defense.type, 'upgraded');
        
        // Trigger callbacks
        this.triggerCallback('defenseUpgraded', { defense, cost: upgradeCost });
        
        // Update UI
        this.updateDefenseInfo();
        
        console.log(`[DefenseManager] Upgraded ${defense.type} to level ${defense.level}`);
    }

    showUpgradeTree() {
        if (!this.selectedDefense) return;
        
        this.triggerCallback('showUpgradeTree', { defense: this.selectedDefense });
    }

    toggleTargeting() {
        if (!this.selectedDefense) return;
        
        // Cycle through targeting modes
        const modes = ['first', 'last', 'strongest', 'weakest'];
        const currentMode = this.selectedDefense.targetingMode || 'first';
        const currentIndex = modes.indexOf(currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        
        this.selectedDefense.targetingMode = modes[nextIndex];
        
        this.triggerCallback('targetingChanged', { 
            defense: this.selectedDefense, 
            mode: this.selectedDefense.targetingMode 
        });
        
        this.updateDefenseInfo();
    }

    update(deltaTime, enemies) {
        // Update all defenses
        for (const defense of this.defenses) {
            this.updateDefense(defense, deltaTime, enemies);
        }
        
        // Update placement preview
        if (this.placementMode) {
            this.updatePlacementPreview();
        }
    }

    updateDefense(defense, deltaTime, enemies) {
        // Find target
        const target = this.findTarget(defense, enemies);
        
        if (target && defense.canFire()) {
            const projectile = defense.fire(target);
            
            if (projectile) {
                this.triggerCallback('defenseFireProjectile', { defense, projectile, target });
            }
        }
    }

    findTarget(defense, enemies) {
        const validTargets = enemies.filter(enemy => {
            if (!enemy.isAlive) return false;
            
            const distance = Utils.math.distance(defense.x, defense.y, enemy.x, enemy.y);
            return distance <= defense.range;
        });
        
        if (validTargets.length === 0) return null;
        
        // Apply targeting strategy
        const targetingMode = defense.targetingMode || 'first';
        
        // Prefer targets the defense can actually hit (basic lead feasibility)
        validTargets.sort((a, b) => {
            const da = Utils.math.distance(defense.x, defense.y, a.x + (a.velocityX||0)*0.25, a.y + (a.velocityY||0)*0.25);
            const db = Utils.math.distance(defense.x, defense.y, b.x + (b.velocityX||0)*0.25, b.y + (b.velocityY||0)*0.25);
            return da - db;
        });
        
        switch (targetingMode) {
            case 'first':
                return validTargets.reduce((closest, enemy) => {
                    return enemy.pathProgress > closest.pathProgress ? enemy : closest;
                });
            
            case 'last':
                return validTargets.reduce((furthest, enemy) => {
                    return enemy.pathProgress < furthest.pathProgress ? enemy : furthest;
                });
            
            case 'strongest':
                return validTargets.reduce((strongest, enemy) => {
                    return enemy.health > strongest.health ? enemy : strongest;
                });
            
            case 'weakest':
                return validTargets.reduce((weakest, enemy) => {
                    return enemy.health < weakest.health ? enemy : weakest;
                });
            
            default:
                return validTargets[0];
        }
    }

    render(ctx) {
        // Render all defenses
        for (const defense of this.defenses) {
            this.renderDefense(ctx, defense);
        }
        
        // Render selection indicators
        this.renderSelectionIndicators(ctx);
        
        // Render placement preview
        if (this.placementMode) {
            this.renderPlacementPreview(ctx);
        }
    }

    renderDefense(ctx, defense) {
        // Use sprite system if available
        if (window.spriteManager) {
            const spriteName = `defense_${defense.type}_level${defense.level}`;
            if (window.spriteManager.hasSprite(spriteName)) {
                window.spriteManager.drawSprite(ctx, spriteName, 
                    defense.x - defense.size, defense.y - defense.size,
                    defense.size * 2, defense.size * 2, defense.angle);
                return;
            }
        }
        
        // Fallback rendering
        ctx.save();
        ctx.translate(defense.x, defense.y);
        ctx.rotate(defense.angle);
        
        // Defense body
        ctx.fillStyle = defense.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        ctx.fillRect(-defense.size/2, -defense.size/2, defense.size, defense.size);
        ctx.strokeRect(-defense.size/2, -defense.size/2, defense.size, defense.size);
        
        // Level indicator
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(defense.level.toString(), 0, 4);
        
        ctx.restore();
    }

    renderSelectionIndicators(ctx) {
        if (this.selectedDefense) {
            const defense = this.selectedDefense;
            
            // Selection ring
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(defense.x, defense.y, defense.size + 5, 0, Math.PI * 2);
            ctx.stroke();
            
            // Range indicator
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(defense.x, defense.y, defense.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    renderPlacementPreview(ctx) {
        if (!window.inputManager) return;
        
        const mousePos = window.inputManager.getMouseWorldPosition();
        const canPlace = this.canPlaceDefense(mousePos.x, mousePos.y, this.selectedDefenseType);
        
        ctx.save();
        ctx.globalAlpha = 0.7;
        
        // Defense preview
        const config = this.defenseTypes[this.selectedDefenseType];
        ctx.fillStyle = canPlace ? config.color : '#ff0000';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        const size = 20;
        ctx.fillRect(mousePos.x - size/2, mousePos.y - size/2, size, size);
        ctx.strokeRect(mousePos.x - size/2, mousePos.y - size/2, size, size);
        
        // Range preview
        ctx.strokeStyle = canPlace ? config.color : '#ff0000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, config.range, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }

    // Helper methods
    isValidPlacement(x, y) {
        // Check if position is on the path (not allowed)
        if (this.isOnPath(x, y)) return false;
        
        // Check if too close to other defenses
        const minDistance = 40;
        for (const defense of this.defenses) {
            if (Utils.math.distance(x, y, defense.x, defense.y) < minDistance) {
                return false;
            }
        }
        
        return true;
    }

    isOnPath(x, y) {
        // Simple path checking - would integrate with actual path system
        const levelManager = window.gameSystemManager?.getLevelManager();
        if (!levelManager) return false;
        
        const path = levelManager.getCurrentPath();
        if (!path) return false;
        
        // Check if point is too close to path
        const pathWidth = 30;
        for (let i = 0; i < path.length - 1; i++) {
            const distanceToSegment = this.distanceToLineSegment(
                x, y, path[i].x, path[i].y, path[i + 1].x, path[i + 1].y
            );
            if (distanceToSegment < pathWidth) return true;
        }
        
        return false;
    }

    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return Utils.math.distance(px, py, x1, y1);
        
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        
        return Utils.math.distance(px, py, projX, projY);
    }

    hasEnoughResources(cost) {
        // This would integrate with the game's resource system
        return this.triggerCallback('checkResources', { cost }) !== false;
    }

    deductResources(cost) {
        this.triggerCallback('deductResources', { cost });
    }

    refundResources(refund) {
        this.triggerCallback('refundResources', { refund });
    }

    calculateSellValue(defense) {
        const baseConfig = this.defenseTypes[defense.type];
        const sellRatio = 0.7; // 70% refund
        
        return {
            dharma: Math.floor(baseConfig.cost.dharma * sellRatio * defense.level),
            bandwidth: Math.floor(baseConfig.cost.bandwidth * sellRatio * defense.level),
            anonymity: Math.floor(baseConfig.cost.anonymity * sellRatio * defense.level)
        };
    }

    calculateUpgradeCost(defense) {
        const baseConfig = this.defenseTypes[defense.type];
        const multiplier = Math.pow(1.5, defense.level - 1);
        
        return {
            dharma: Math.floor(baseConfig.cost.dharma * multiplier),
            bandwidth: Math.floor(baseConfig.cost.bandwidth * multiplier),
            anonymity: Math.floor(baseConfig.cost.anonymity * multiplier)
        };
    }

    updateDefenseSelection() {
        // Update UI to show selected defense type
        for (const defenseType in this.defenseTypes) {
            const button = document.getElementById(`${defenseType}-defense-btn`);
            if (button) {
                button.classList.toggle('selected', defenseType === this.selectedDefenseType);
            }
        }
    }

    updateDefenseInfo() {
        const infoPanel = document.getElementById('defense-info-panel');
        if (!infoPanel) return;
        
        if (this.selectedDefense) {
            // Show defense details
            this.showDefenseDetails(infoPanel, this.selectedDefense);
        } else {
            // Hide info panel
            infoPanel.style.display = 'none';
        }
    }

    showDefenseDetails(panel, defense) {
        const config = this.defenseTypes[defense.type];
        
        panel.innerHTML = `
            <h3>${config.name} (Level ${defense.level})</h3>
            <p>${config.description}</p>
            <div class="defense-stats">
                <div>Damage: ${Math.floor(defense.damage)}</div>
                <div>Range: ${Math.floor(defense.range)}</div>
                <div>Fire Rate: ${defense.fireRate.toFixed(1)}/s</div>
                <div>Kills: ${defense.kills}</div>
                <div>Total Damage: ${Utils.game.formatNumber(defense.totalDamage)}</div>
            </div>
        `;
        
        panel.style.display = 'block';
    }

    updateDefenseStats(defenseType, action) {
        if (!this.defenseStats.has(defenseType)) {
            this.defenseStats.set(defenseType, {
                placed: 0,
                sold: 0,
                upgraded: 0,
                kills: 0,
                damage: 0
            });
        }
        
        const stats = this.defenseStats.get(defenseType);
        if (stats[action] !== undefined) {
            stats[action]++;
        }
    }

    updatePlacementPreview() {
        // This would be called during the update loop when in placement mode
        // Could show additional UI feedback, update cursor, etc.
    }

    // Callback system
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }

    triggerCallback(event, data = {}) {
        if (this.callbacks.has(event)) {
            const callbacks = this.callbacks.get(event);
            for (const callback of callbacks) {
                try {
                    const result = callback(data);
                    if (result !== undefined) return result;
                } catch (error) {
                    console.error(`[DefenseManager] Error in callback for ${event}:`, error);
                }
            }
        }
    }

    // Utility methods
    getDefenseCount() {
        return this.defenses.length;
    }

    getDefensesByType(type) {
        return this.defenses.filter(defense => defense.type === type);
    }

    getTotalDefenseValue() {
        return this.defenses.reduce((total, defense) => {
            const config = this.defenseTypes[defense.type];
            return total + config.cost.dharma * defense.level;
        }, 0);
    }

    getDefenseStats() {
        const stats = {};
        for (const [type, data] of this.defenseStats) {
            stats[type] = { ...data };
        }
        return stats;
    }

    clear() {
        this.defenses.length = 0;
        this.selectedDefense = null;
        this.placementMode = false;
        this.defenseStats.clear();
    }

    destroy() {
        this.clear();
        this.callbacks.clear();
    }
}

// Export and expose globally
export default DefenseManager;

if (typeof window !== 'undefined') {
    window.DefenseManager = DefenseManager;
}