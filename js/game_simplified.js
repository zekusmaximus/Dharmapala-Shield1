class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Core systems - simplified initialization
        this.systemManager = null;
        this.screenManager = null;
        this.defenseManager = null;
        this.uiManager = null;
        
        // Game state
        this.gameState = {
            running: false,
            paused: false,
            gameSpeed: 1,
            level: 1,
            wave: 1,
            lives: 10,
            score: 0
        };
        
        // Resources
        this.resources = {
            dharma: 100,
            bandwidth: 50,
            anonymity: 75
        };
        
        // Game objects
        this.enemies = [];
        this.projectiles = [];
        this.effects = [];
        
        // Timing
        this.lastUpdate = 0;
        this.deltaTime = 0;
        
        // Event handlers
        this.eventHandlers = new Map();
        
        this.setupEventListeners();
    }

    async initialize() {
        console.log('[Game] Initializing game systems...');
        
        try {
            // Initialize system manager
            this.systemManager = new GameSystemManager();
            const initResult = await this.systemManager.initialize();
            
            if (!initResult.success) {
                throw new Error(`System initialization failed: ${initResult.error}`);
            }
            
            // Initialize managers
            this.screenManager = new ScreenManager();
            this.defenseManager = new DefenseManager();
            this.uiManager = window.uiManager || new UIManager();
            
            // Setup input handling
            this.setupInput();
            
            // Setup manager event handlers
            this.setupManagerCallbacks();
            
            // Initialize game systems
            this.setupGameSystems();
            
            console.log('[Game] Game initialization complete');
            return true;
            
        } catch (error) {
            console.error('[Game] Initialization failed:', error);
            this.handleInitializationError(error);
            return false;
        }
    }

    setupInput() {
        if (window.inputManager) {
            window.inputManager.setCanvas(this.canvas);
            window.inputManager.setCamera(window.camera);
            
            // Handle input events
            window.inputManager.addEventListener('mousedown', (data) => {
                this.handleMouseDown(data);
            });
            
            window.inputManager.addEventListener('mousemove', (data) => {
                this.handleMouseMove(data);
            });
        }
    }

    setupManagerCallbacks() {
        // Screen manager callbacks
        this.screenManager.on('startNewGame', () => this.startNewGame());
        this.screenManager.on('continueGame', () => this.continueGame());
        this.screenManager.on('pauseGame', () => this.pauseGame());
        this.screenManager.on('resumeGame', () => this.resumeGame());
        this.screenManager.on('returnToMenu', () => this.returnToMenu());
        
        // Defense manager callbacks
        this.defenseManager.on('checkResources', (data) => this.checkResources(data.cost));
        this.defenseManager.on('deductResources', (data) => this.deductResources(data.cost));
        this.defenseManager.on('refundResources', (data) => this.refundResources(data.refund));
        this.defenseManager.on('defensePlace', (data) => this.onDefensePlace(data));
        this.defenseManager.on('defenseFireProjectile', (data) => this.onDefenseFireProjectile(data));
        
        // Level manager callbacks
        const levelManager = this.systemManager.getLevelManager();
        if (levelManager) {
            levelManager.setCallbacks({
                onWaveStart: (data) => this.onWaveStart(data),
                onWaveComplete: (data) => this.onWaveComplete(data),
                onLevelComplete: (data) => this.onLevelComplete(data),
                onEnemySpawn: (data) => this.onEnemySpawn(data),
                onEnemyKilled: (data) => this.onEnemyKilled(data)
            });
        }
    }

    setupGameSystems() {
        // Setup camera
        if (window.camera) {
            window.camera.setCanvas(this.canvas);
            window.camera.setBounds(0, 0, 800, 600);
        }
        
        // Initialize level
        const levelManager = this.systemManager.getLevelManager();
        if (levelManager) {
            levelManager.initializeLevel(this.gameState.level);
        }
        
        // Setup UI
        this.updateUI();
    }

    setupEventListeners() {
        // Game control events
        document.addEventListener('gameSpeedChange', (e) => {
            this.gameState.gameSpeed = e.detail.speed;
        });
        
        document.addEventListener('togglePause', () => {
            this.togglePause();
        });
        
        document.addEventListener('startNextWave', () => {
            this.startNextWave();
        });
        
        document.addEventListener('selectDefenseType', (e) => {
            this.defenseManager.selectDefenseType(e.detail.type);
        });
    }

    // Game Flow Methods
    startNewGame() {
        console.log('[Game] Starting new game...');
        
        this.gameState = {
            running: true,
            paused: false,
            gameSpeed: 1,
            level: 1,
            wave: 1,
            lives: 10,
            score: 0
        };
        
        this.resources = {
            dharma: 100,
            bandwidth: 50,
            anonymity: 75
        };
        
        // Clear game objects
        this.enemies.length = 0;
        this.projectiles.length = 0;
        this.effects.length = 0;
        
        // Reset managers
        this.defenseManager.clear();
        if (window.particleSystem) window.particleSystem.clear();
        if (window.projectilePool) window.projectilePool.clear();
        
        // Initialize level
        const levelManager = this.systemManager.getLevelManager();
        if (levelManager) {
            levelManager.initializeLevel(this.gameState.level);
        }
        
        this.updateUI();
        this.startGameLoop();
    }

    continueGame() {
        console.log('[Game] Continuing game...');
        
        const saveSystem = this.systemManager.getSaveSystem();
        if (saveSystem) {
            const saveData = saveSystem.quickLoad();
            if (saveData) {
                this.loadGameState(saveData);
            } else {
                console.warn('[Game] No save data found, starting new game');
                this.startNewGame();
                return;
            }
        }
        
        this.gameState.running = true;
        this.gameState.paused = false;
        this.startGameLoop();
    }

    pauseGame() {
        this.gameState.paused = true;
        console.log('[Game] Game paused');
    }

    resumeGame() {
        this.gameState.paused = false;
        this.lastUpdate = Utils.performance.now();
        console.log('[Game] Game resumed');
    }

    togglePause() {
        if (this.gameState.paused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }

    returnToMenu() {
        this.gameState.running = false;
        console.log('[Game] Returned to menu');
    }

    // Game Loop
    startGameLoop() {
        this.lastUpdate = Utils.performance.now();
        this.gameLoop();
    }

    gameLoop() {
        if (!this.gameState.running) return;
        
        const currentTime = Utils.performance.now();
        this.deltaTime = (currentTime - this.lastUpdate) * this.gameState.gameSpeed;
        this.lastUpdate = currentTime;
        
        if (!this.gameState.paused) {
            this.update(this.deltaTime);
        }
        
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        // Update input
        if (window.inputManager) {
            window.inputManager.processEvents();
            window.inputManager.update();
        }
        
        // Update camera
        if (window.camera) {
            window.camera.update(deltaTime);
        }
        
        // Update enemies
        this.updateEnemies(deltaTime);
        
        // Update defenses
        this.defenseManager.update(deltaTime, this.enemies);
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
        // Update particles
        if (window.particleSystem) {
            window.particleSystem.update(deltaTime);
        }
        
        // Update level/wave system
        const levelManager = this.systemManager.getLevelManager();
        if (levelManager) {
            // Level manager handles its own updates
        }
        
        // Check game over conditions
        this.checkGameOver();
        
        // Update UI
        this.updateUI();
    }

    updateEnemies(deltaTime) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (enemy.update) {
                enemy.update(deltaTime);
            }
            
            // Remove dead enemies
            if (!enemy.isAlive) {
                this.onEnemyDestroyed(enemy);
                this.enemies.splice(i, 1);
            }
            
            // Check if enemy reached the end
            if (enemy.reachedEnd) {
                this.onEnemyEscaped(enemy);
                this.enemies.splice(i, 1);
            }
        }
    }

    updateProjectiles(deltaTime) {
        if (window.projectilePool) {
            window.projectilePool.updateAll(deltaTime);
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply camera transform
        let restoreCamera = null;
        if (window.camera) {
            restoreCamera = window.camera.applyTransform(this.ctx);
        }
        
        // Render game world
        this.renderBackground();
        this.renderPath();
        this.renderEnemies();
        this.defenseManager.render(this.ctx);
        this.renderProjectiles();
        this.renderParticles();
        
        // Restore camera
        if (restoreCamera) {
            restoreCamera();
        }
        
        // Render UI overlay
        this.renderUI();
    }

    renderBackground() {
        // Simple gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderPath() {
        const levelManager = this.systemManager.getLevelManager();
        if (!levelManager) return;
        
        const path = levelManager.getCurrentPath();
        if (!path || path.length < 2) return;
        
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 30;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
            this.ctx.lineTo(path[i].x, path[i].y);
        }
        
        this.ctx.stroke();
    }

    renderEnemies() {
        for (const enemy of this.enemies) {
            if (enemy.render) {
                enemy.render(this.ctx);
            }
        }
    }

    renderProjectiles() {
        if (window.projectilePool) {
            window.projectilePool.renderAll(this.ctx);
        }
    }

    renderParticles() {
        if (window.particleSystem) {
            window.particleSystem.render(this.ctx);
        }
    }

    renderUI() {
        // UI is handled by UIManager, just render any game-specific overlays here
    }

    // Event Handlers
    handleMouseDown(data) {
        if (this.defenseManager.placementMode) {
            const placed = this.defenseManager.placeDefense(data.worldX, data.worldY);
            if (!placed) {
                // Show error feedback
                if (window.audioManager) {
                    window.audioManager.playSound('ui_error');
                }
            }
        } else {
            // Check for defense selection
            const clickedDefense = this.findDefenseAt(data.worldX, data.worldY);
            if (clickedDefense) {
                this.defenseManager.selectDefense(clickedDefense);
            } else {
                this.defenseManager.deselectDefense();
            }
        }
    }

    handleMouseMove(data) {
        // Update hover states, etc.
    }

    findDefenseAt(x, y) {
        for (const defense of this.defenseManager.defenses) {
            const distance = Utils.math.distance(x, y, defense.x, defense.y);
            if (distance <= defense.size) {
                return defense;
            }
        }
        return null;
    }

    // Game Logic
    startNextWave() {
        const levelManager = this.systemManager.getLevelManager();
        if (levelManager && levelManager.canStartNextWave()) {
            levelManager.startWave();
        }
    }

    checkGameOver() {
        if (this.gameState.lives <= 0) {
            this.gameOver(false);
        }
    }

    gameOver(victory) {
        this.gameState.running = false;
        
        console.log(`[Game] Game Over - ${victory ? 'Victory' : 'Defeat'}`);
        
        // Show game over screen
        const event = new CustomEvent('gameOver', {
            detail: { victory, score: this.gameState.score }
        });
        document.dispatchEvent(event);
        
        // Track achievements
        this.trackGameOverAchievements(victory);
    }

    // Resource Management
    checkResources(cost) {
        return this.resources.dharma >= cost.dharma &&
               this.resources.bandwidth >= cost.bandwidth &&
               this.resources.anonymity >= cost.anonymity;
    }

    deductResources(cost) {
        if (this.checkResources(cost)) {
            this.resources.dharma -= cost.dharma;
            this.resources.bandwidth -= cost.bandwidth;
            this.resources.anonymity -= cost.anonymity;
            this.updateUI();
            return true;
        }
        return false;
    }

    refundResources(refund) {
        this.resources.dharma += refund.dharma || 0;
        this.resources.bandwidth += refund.bandwidth || 0;
        this.resources.anonymity += refund.anonymity || 0;
        this.updateUI();
    }

    addResources(amount) {
        this.resources.dharma += amount.dharma || 0;
        this.resources.bandwidth += amount.bandwidth || 0;
        this.resources.anonymity += amount.anonymity || 0;
        this.updateUI();
    }

    // Wave/Level Events
    onWaveStart(data) {
        console.log(`[Game] Wave ${data.wave} started`);
        this.gameState.wave = data.wave;
        this.updateUI();
        
        if (window.audioManager) {
            window.audioManager.playSound('wave_start');
        }
    }

    onWaveComplete(data) {
        console.log(`[Game] Wave ${data.wave} completed`);
        
        // Reward player
        const reward = this.calculateWaveReward(data);
        this.addResources(reward);
        
        // Show completion notification
        this.uiManager.showNotification(`Wave ${data.wave} Complete! +${reward.dharma} Dharma`, 'success');
        
        if (window.audioManager) {
            window.audioManager.playSound('wave_complete');
        }
    }

    onLevelComplete(data) {
        console.log(`[Game] Level ${data.level} completed`);
        this.gameState.level = data.level + 1;
        
        // Big reward for level completion
        const reward = this.calculateLevelReward(data);
        this.addResources(reward);
        
        this.uiManager.showNotification(`Level ${data.level} Complete!`, 'success', 5000);
        
        if (window.audioManager) {
            window.audioManager.playSound('level_complete');
        }
    }

    onEnemySpawn(enemy) {
        this.enemies.push(enemy);
        
        const levelManager = this.systemManager.getLevelManager();
        if (levelManager) {
            levelManager.onEnemySpawned();
        }
    }

    onEnemyKilled(data) {
        // Award resources for kill
        const reward = this.calculateKillReward(data.enemy);
        this.addResources(reward);
        
        // Update score
        this.gameState.score += reward.dharma * 10;
        
        // Create death effect
        if (window.particleSystem) {
            window.particleSystem.emit('death', data.enemy.x, data.enemy.y);
        }
        
        const levelManager = this.systemManager.getLevelManager();
        if (levelManager) {
            levelManager.onEnemyKilled();
        }
        
        // Track achievements
        this.trackKillAchievements(data.enemy);
    }

    onEnemyDestroyed(enemy) {
        // Handle enemy destruction (killed by defenses)
        this.onEnemyKilled({ enemy });
    }

    onEnemyEscaped(enemy) {
        // Enemy reached the end, lose life
        this.gameState.lives--;
        
        if (this.gameState.lives > 0) {
            this.uiManager.showNotification('Enemy escaped! Life lost.', 'warning');
            this.uiManager.flashScreen('#ff0000', 300);
        }
        
        const levelManager = this.systemManager.getLevelManager();
        if (levelManager) {
            levelManager.onEnemyEscaped();
        }
        
        if (window.audioManager) {
            window.audioManager.playSound('life_lost');
        }
    }

    onDefensePlace(data) {
        console.log(`[Game] Placed ${data.defense.type} defense`);
        
        if (window.audioManager) {
            window.audioManager.playSound('defense_place');
        }
        
        if (window.particleSystem) {
            window.particleSystem.emit('upgrade', data.defense.x, data.defense.y);
        }
    }

    onDefenseFireProjectile(data) {
        // Projectile is handled by the projectile pool
        if (window.audioManager) {
            window.audioManager.playSound('defense_fire');
        }
    }

    // Reward Calculations
    calculateKillReward(enemy) {
        const baseReward = enemy.reward || 10;
        return {
            dharma: baseReward,
            bandwidth: Math.floor(baseReward * 0.1),
            anonymity: Math.floor(baseReward * 0.05)
        };
    }

    calculateWaveReward(data) {
        const baseReward = 50 + (data.wave * 10);
        return {
            dharma: baseReward,
            bandwidth: Math.floor(baseReward * 0.2),
            anonymity: Math.floor(baseReward * 0.1)
        };
    }

    calculateLevelReward(data) {
        const baseReward = 200 + (data.level * 50);
        return {
            dharma: baseReward,
            bandwidth: Math.floor(baseReward * 0.3),
            anonymity: Math.floor(baseReward * 0.2)
        };
    }

    // Achievement Tracking (Simplified)
    trackKillAchievements(enemy) {
        const achievementManager = this.systemManager.getAchievementManager();
        if (achievementManager) {
            achievementManager.trackEvent('enemy_killed', { type: enemy.type });
        }
    }

    trackGameOverAchievements(victory) {
        const achievementManager = this.systemManager.getAchievementManager();
        if (achievementManager) {
            achievementManager.trackEvent('game_over', { 
                victory, 
                score: this.gameState.score,
                level: this.gameState.level 
            });
        }
    }

    // UI Updates
    updateUI() {
        this.uiManager.updateResources(this.resources);
        this.uiManager.updateGameState(this.gameState);
        
        const levelManager = this.systemManager.getLevelManager();
        if (levelManager) {
            const canStartWave = levelManager.canStartNextWave();
            const nextWave = levelManager.getNextWavePreview();
            this.uiManager.updateWaveButton(canStartWave, nextWave);
            
            if (levelManager.isWaveInProgress()) {
                const progress = levelManager.getWaveProgress();
                this.uiManager.updateWaveProgress(progress * 100, 100);
            }
        }
    }

    // Save/Load
    loadGameState(saveData) {
        this.gameState.level = saveData.level || 1;
        this.gameState.wave = saveData.wave || 1;
        this.gameState.score = saveData.statistics?.totalScore || 0;
        this.gameState.lives = 10; // Reset lives on load
        
        this.resources = saveData.resources || this.resources;
    }

    saveGame() {
        const saveSystem = this.systemManager.getSaveSystem();
        if (saveSystem) {
            const saveData = {
                level: this.gameState.level,
                wave: this.gameState.wave,
                resources: this.resources,
                statistics: {
                    totalScore: this.gameState.score,
                    totalPlayTime: Date.now() // Simplified
                }
            };
            
            return saveSystem.quickSave(saveData);
        }
        return false;
    }

    // Error Handling
    handleInitializationError(error) {
        console.error('[Game] Critical initialization error:', error);
        
        // Show error to user
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div class="error-screen">
                <h2>Game Initialization Failed</h2>
                <p>Error: ${error.message}</p>
                <button onclick="location.reload()">Reload Game</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }

    // Cleanup
    destroy() {
        this.gameState.running = false;
        
        if (this.defenseManager) this.defenseManager.destroy();
        if (this.screenManager) this.screenManager.destroy();
        if (this.uiManager) this.uiManager.destroy();
        if (this.systemManager) this.systemManager.shutdown();
        
        console.log('[Game] Game destroyed');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
} else {
    window.Game = Game;
}