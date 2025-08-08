class UIManager {
    constructor() {
        this.elements = new Map();
        this.animations = new Map();
        this.notifications = [];
        this.tooltips = new Map();
        
        this.resources = { dharma: 0, bandwidth: 0, anonymity: 0 };
        this.gameState = { level: 1, wave: 1, score: 0 };
        
        this.setupElements();
        this.setupEventHandlers();
    }

    setupElements() {
        // Resource displays
        this.registerElement('dharma-display', 'text');
        this.registerElement('bandwidth-display', 'text');
        this.registerElement('anonymity-display', 'text');
        
        // Game state displays
        this.registerElement('level-display', 'text');
        this.registerElement('wave-display', 'text');
        this.registerElement('score-display', 'text');
        this.registerElement('lives-display', 'text');
        
        // Progress bars
        this.registerElement('wave-progress-bar', 'progress');
        this.registerElement('boss-health-bar', 'progress');
        
        // Action buttons
        this.registerElement('start-wave-btn', 'button');
        this.registerElement('pause-game-btn', 'button');
        this.registerElement('speed-up-btn', 'button');
        this.registerElement('speed-normal-btn', 'button');
        
        // Defense UI
        this.registerElement('defense-info-panel', 'container');
        this.registerElement('defense-selection-panel', 'container');
        this.registerElement('upgrade-tree-panel', 'container');
        
        // Notification area
        this.registerElement('notification-area', 'container');
        this.registerElement('achievement-popup', 'container');
        
        // Settings and menus
        this.registerElement('game-menu', 'container');
        this.registerElement('settings-panel', 'container');
    }

    registerElement(id, type) {
        const element = document.getElementById(id);
        if (element) {
            this.elements.set(id, {
                element: element,
                type: type,
                visible: !element.classList.contains('hidden')
            });
        } else {
            console.warn(`[UIManager] Element not found: ${id}`);
        }
    }

    setupEventHandlers() {
        // Game speed controls
        this.addClickHandler('speed-up-btn', () => this.setGameSpeed(2));
        this.addClickHandler('speed-normal-btn', () => this.setGameSpeed(1));
        
        // Wave controls
        this.addClickHandler('start-wave-btn', () => this.startNextWave());
        
        // Game controls
        this.addClickHandler('pause-game-btn', () => this.togglePause());
        
        // Tooltips
        this.setupTooltips();
        
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Defense selection
        this.setupDefenseSelection();
    }

    addClickHandler(elementId, handler) {
        const elementData = this.elements.get(elementId);
        if (elementData) {
            elementData.element.addEventListener('click', handler);
        }
    }

    setupTooltips() {
        // Defense type tooltips
        const defenseTypes = ['firewall', 'encryption', 'decoy', 'mirror', 'anonymity', 'distributor'];
        
        defenseTypes.forEach(type => {
            const button = document.getElementById(`${type}-defense-btn`);
            if (button) {
                this.setupTooltip(button, this.getDefenseTooltip(type));
            }
        });
        
        // Resource tooltips
        this.setupTooltip('dharma-display', 'Dharma: Primary currency for defenses');
        this.setupTooltip('bandwidth-display', 'Bandwidth: Required for advanced defenses');
        this.setupTooltip('anonymity-display', 'Anonymity: Powers stealth and special abilities');
    }

    setupTooltip(elementOrId, content) {
        const element = typeof elementOrId === 'string' ? 
            document.getElementById(elementOrId) : elementOrId;
        
        if (!element) return;
        
        let tooltip = null;
        
        element.addEventListener('mouseenter', (e) => {
            tooltip = this.createTooltip(content, e.pageX, e.pageY);
        });
        
        element.addEventListener('mouseleave', () => {
            if (tooltip) {
                tooltip.remove();
                tooltip = null;
            }
        });
        
        element.addEventListener('mousemove', (e) => {
            if (tooltip) {
                tooltip.style.left = (e.pageX + 10) + 'px';
                tooltip.style.top = (e.pageY - 30) + 'px';
            }
        });
    }

    createTooltip(content, x, y) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.innerHTML = content;
        tooltip.style.cssText = `
            position: absolute;
            left: ${x + 10}px;
            top: ${y - 30}px;
            background: rgba(26, 26, 46, 0.95);
            color: #00d4ff;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #00d4ff;
            font-size: 12px;
            font-family: 'Orbitron', monospace;
            z-index: 10000;
            pointer-events: none;
            max-width: 200px;
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        `;
        
        document.body.appendChild(tooltip);
        return tooltip;
    }

    getDefenseTooltip(type) {
        const defenseTypes = {
            firewall: '<strong>Firewall</strong><br>Cost: 50 Dharma<br>Basic defense against digital threats',
            encryption: '<strong>Encryption Node</strong><br>Cost: 75 Dharma, 25 Bandwidth<br>High damage encrypted attacks',
            decoy: '<strong>Decoy Server</strong><br>Cost: 60 Dharma, 30 Anonymity<br>Fast firing, attracts enemies',
            mirror: '<strong>Mirror Defense</strong><br>Cost: 100 Dharma, 50 Bandwidth, 25 Anonymity<br>Powerful counterattacks',
            anonymity: '<strong>Anonymity Cloak</strong><br>Cost: 80 Dharma, 30 Bandwidth, 50 Anonymity<br>Stealth attacks',
            distributor: '<strong>Load Distributor</strong><br>Cost: 150 Dharma, 75 Bandwidth<br>Long range, high damage'
        };
        
        return defenseTypes[type] || 'Defense information';
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    this.togglePause();
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                    this.selectDefenseHotkey(parseInt(e.key) - 1);
                    break;
                case 'n':
                    this.startNextWave();
                    break;
                case 'escape':
                    this.showGameMenu();
                    break;
            }
        });
    }
    
    setupDefenseSelection() {
        // Add click handlers for defense items
        const defenseItems = document.querySelectorAll('.defense-item[data-type]');
        defenseItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const defenseType = item.getAttribute('data-type');
                console.log(`[UIManager] Defense type selected: ${defenseType}`);
                
                // Remove active class from all defense items
                defenseItems.forEach(di => di.classList.remove('active'));
                
                // Add active class to clicked item
                item.classList.add('active');
                
                // Dispatch selection event
                const event = new CustomEvent('selectDefenseType', { 
                    detail: { type: defenseType } 
                });
                document.dispatchEvent(event);
            });
        });
        
        console.log(`[UIManager] Set up defense selection for ${defenseItems.length} defense types`);
    }

    selectDefenseHotkey(index) {
        const defenseTypes = ['firewall', 'encryption', 'decoy', 'mirror', 'anonymity', 'distributor'];
        if (index < defenseTypes.length) {
            const event = new CustomEvent('selectDefenseType', { 
                detail: { type: defenseTypes[index] } 
            });
            document.dispatchEvent(event);
        }
    }

    // Resource Management
    updateResources(resources) {
        this.resources = { ...resources };
        
        this.updateText('dharma-display', Utils.game.formatNumber(resources.dharma));
        this.updateText('bandwidth-display', Utils.game.formatNumber(resources.bandwidth));
        this.updateText('anonymity-display', Utils.game.formatNumber(resources.anonymity));
        
        // Animate resource changes
        this.animateResourceChange('dharma-display');
        this.animateResourceChange('bandwidth-display');
        this.animateResourceChange('anonymity-display');
    }

    animateResourceChange(elementId) {
        const elementData = this.elements.get(elementId);
        if (!elementData) return;
        
        const element = elementData.element;
        element.classList.add('resource-change');
        
        setTimeout(() => {
            element.classList.remove('resource-change');
        }, 300);
    }

    // Game State Updates
    updateGameState(state) {
        this.gameState = { ...this.gameState, ...state };
        
        if (state.level !== undefined) {
            this.updateText('level-display', `Level ${state.level}`);
        }
        
        if (state.wave !== undefined) {
            this.updateText('wave-display', `Wave ${state.wave}`);
        }
        
        if (state.score !== undefined) {
            this.updateText('score-display', Utils.game.formatNumber(state.score));
        }
        
        if (state.lives !== undefined) {
            this.updateText('lives-display', state.lives.toString());
            this.animateLivesChange(state.lives);
        }
    }

    animateLivesChange(lives) {
        const element = this.elements.get('lives-display')?.element;
        if (!element) return;
        
        if (lives <= 3) {
            element.classList.add('lives-low');
        } else {
            element.classList.remove('lives-low');
        }
        
        if (lives === 1) {
            element.classList.add('lives-critical');
        } else {
            element.classList.remove('lives-critical');
        }
    }

    // Progress Bars
    updateProgress(barId, value, max = 100) {
        const elementData = this.elements.get(barId);
        if (!elementData || elementData.type !== 'progress') return;
        
        const percentage = Math.max(0, Math.min(100, (value / max) * 100));
        const progressFill = elementData.element.querySelector('.progress-fill');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
            
            // Color coding for health bars
            if (barId.includes('health')) {
                if (percentage < 25) {
                    progressFill.style.background = '#ff0000';
                } else if (percentage < 50) {
                    progressFill.style.background = '#ff6b35';
                } else {
                    progressFill.style.background = '#00ff88';
                }
            }
        }
    }

    updateWaveProgress(current, total) {
        this.updateProgress('wave-progress-bar', current, total);
        
        const progressText = document.querySelector('#wave-progress-bar .progress-text');
        if (progressText) {
            progressText.textContent = `${current}/${total}`;
        }
    }

    updateBossHealth(health, maxHealth) {
        this.updateProgress('boss-health-bar', health, maxHealth);
        this.showElement('boss-health-bar');
        
        if (health <= 0) {
            setTimeout(() => this.hideElement('boss-health-bar'), 2000);
        }
    }

    // Notifications
    showNotification(message, type = 'info', duration = 3000) {
        const notification = {
            id: Utils.game.generateId(),
            message: message,
            type: type,
            timestamp: Utils.performance.now(),
            duration: duration
        };
        
        this.notifications.push(notification);
        this.renderNotification(notification);
        
        setTimeout(() => {
            this.removeNotification(notification.id);
        }, duration);
    }

    renderNotification(notification) {
        const container = this.elements.get('notification-area')?.element;
        if (!container) return;
        
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type}`;
        element.id = `notification-${notification.id}`;
        element.innerHTML = `
            <div class="notification-content">${notification.message}</div>
            <button class="notification-close" onclick="uiManager.removeNotification('${notification.id}')">&times;</button>
        `;
        
        container.appendChild(element);
        
        // Animate in
        setTimeout(() => element.classList.add('notification-show'), 10);
    }

    removeNotification(id) {
        const element = document.getElementById(`notification-${id}`);
        if (element) {
            element.classList.add('notification-hide');
            setTimeout(() => element.remove(), 300);
        }
        
        this.notifications = this.notifications.filter(n => n.id !== id);
    }

    // Achievement System
    showAchievementUnlocked(achievement) {
        const popup = this.elements.get('achievement-popup')?.element;
        if (!popup) return;
        
        popup.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">${achievement.icon || '🏆'}</div>
                <div class="achievement-text">
                    <h3>Achievement Unlocked!</h3>
                    <p>${achievement.name}</p>
                    <small>${achievement.description}</small>
                </div>
            </div>
        `;
        
        popup.classList.add('achievement-show');
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            popup.classList.remove('achievement-show');
        }, 4000);
        
        // Play achievement sound
        if (window.audioManager) {
            window.audioManager.playSound('achievement_unlocked');
        }
    }

    // Game Controls
    setGameSpeed(speed) {
        const speedButtons = ['speed-normal-btn', 'speed-up-btn'];
        speedButtons.forEach(id => {
            const element = this.elements.get(id)?.element;
            if (element) {
                element.classList.remove('active');
            }
        });
        
        const activeButton = speed === 1 ? 'speed-normal-btn' : 'speed-up-btn';
        const element = this.elements.get(activeButton)?.element;
        if (element) {
            element.classList.add('active');
        }
        
        // Dispatch game speed change event
        const event = new CustomEvent('gameSpeedChange', { detail: { speed } });
        document.dispatchEvent(event);
    }

    togglePause() {
        const event = new CustomEvent('togglePause');
        document.dispatchEvent(event);
    }

    startNextWave() {
        const event = new CustomEvent('startNextWave');
        document.dispatchEvent(event);
    }

    showGameMenu() {
        const event = new CustomEvent('showGameMenu');
        document.dispatchEvent(event);
    }

    // Element Utilities
    updateText(elementId, text) {
        const elementData = this.elements.get(elementId);
        if (elementData && elementData.type === 'text') {
            elementData.element.textContent = text;
        }
    }

    showElement(elementId) {
        const elementData = this.elements.get(elementId);
        if (elementData) {
            elementData.element.classList.remove('hidden');
            elementData.element.style.display = '';
            elementData.visible = true;
        }
    }

    hideElement(elementId) {
        const elementData = this.elements.get(elementId);
        if (elementData) {
            elementData.element.classList.add('hidden');
            elementData.visible = false;
        }
    }

    toggleElement(elementId) {
        const elementData = this.elements.get(elementId);
        if (elementData) {
            if (elementData.visible) {
                this.hideElement(elementId);
            } else {
                this.showElement(elementId);
            }
        }
    }

    setElementEnabled(elementId, enabled) {
        const elementData = this.elements.get(elementId);
        if (elementData && elementData.type === 'button') {
            elementData.element.disabled = !enabled;
            elementData.element.classList.toggle('disabled', !enabled);
        }
    }

    // Defense UI
    updateDefenseSelection(selectedType) {
        const defenseTypes = ['firewall', 'encryption', 'decoy', 'mirror', 'anonymity', 'distributor'];
        
        defenseTypes.forEach(type => {
            const button = document.getElementById(`${type}-defense-btn`);
            if (button) {
                button.classList.toggle('selected', type === selectedType);
            }
        });
    }

    updateDefenseInfo(defense) {
        const panel = this.elements.get('defense-info-panel')?.element;
        if (!panel) return;
        
        if (defense) {
            panel.innerHTML = `
                <h3>${defense.type} Defense (Level ${defense.level})</h3>
                <div class="defense-stats">
                    <div class="stat">
                        <span class="stat-label">Damage:</span>
                        <span class="stat-value">${Math.floor(defense.damage)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Range:</span>
                        <span class="stat-value">${Math.floor(defense.range)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Fire Rate:</span>
                        <span class="stat-value">${defense.fireRate.toFixed(1)}/s</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Kills:</span>
                        <span class="stat-value">${defense.kills}</span>
                    </div>
                </div>
                <div class="defense-actions">
                    <button id="upgrade-defense" class="button">Upgrade</button>
                    <button id="sell-defense" class="button button-danger">Sell</button>
                </div>
            `;
            this.showElement('defense-info-panel');
        } else {
            this.hideElement('defense-info-panel');
        }
    }

    // Wave Management UI
    updateWaveButton(canStart, nextWaveInfo) {
        const button = this.elements.get('start-wave-btn')?.element;
        if (!button) return;
        
        if (canStart) {
            button.disabled = false;
            button.textContent = nextWaveInfo ? `Start Wave ${nextWaveInfo.waveNumber}` : 'Start Wave';
            button.classList.remove('disabled');
        } else {
            button.disabled = true;
            button.textContent = 'Wave in Progress';
            button.classList.add('disabled');
        }
    }

    // Screen Flash Effects
    flashScreen(color = '#ff0000', duration = 200) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${color};
            opacity: 0.3;
            z-index: 9999;
            pointer-events: none;
        `;
        
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.style.opacity = '0';
            flash.style.transition = 'opacity 0.2s ease';
            setTimeout(() => flash.remove(), 200);
        }, duration);
    }

    // Clean up
    destroy() {
        // Remove all tooltips
        document.querySelectorAll('.tooltip').forEach(tooltip => tooltip.remove());
        
        // Clear notifications
        this.notifications.length = 0;
        
        // Clear elements
        this.elements.clear();
        this.animations.clear();
    }

    // Debug utilities
    getUIState() {
        return {
            resources: this.resources,
            gameState: this.gameState,
            notificationCount: this.notifications.length,
            elementCount: this.elements.size
        };
    }

    logUIElements() {
        console.log('[UIManager] Registered elements:');
        for (const [id, data] of this.elements) {
            console.log(`  ${id}: ${data.type} (${data.visible ? 'visible' : 'hidden'})`);
        }
    }
}

// Create global instance
const uiManager = new UIManager();

// Export for ES module consumers and expose globals
export { UIManager as default, uiManager };

if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
    window.uiManager = uiManager;
}