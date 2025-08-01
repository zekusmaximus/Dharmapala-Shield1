class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // High-DPI handling will be done in resizeCanvas method
        
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
            if (!this.screenManager) {
                this.screenManager = new ScreenManager();
            }
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
        console.log('[Game] Setting up screen manager callbacks');
        this.screenManager.on('startNewGame', () => {
            console.log('[Game] startNewGame callback triggered');
            this.startNewGame();
        });
        this.screenManager.on('continueGame', () => {
            console.log('[Game] continueGame callback triggered');
            this.continueGame();
        });
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
                onEnemyKilled: (data) => this.onEnemyKilled(data),
                onEnemySpawnRequest: (enemyData, spawnPoint, path) => this.spawnEnemy(enemyData, spawnPoint, path)
            });
        }
    }

    setupGameSystems() {
        // Ensure canvas has proper dimensions
        this.resizeCanvas();
        
        // Setup camera with dynamic canvas dimensions
        if (window.camera) {
            window.camera.setCanvas(this.canvas);
            const canvasWidth = this.canvas.width;
            const canvasHeight = this.canvas.height;
            window.camera.setBounds(0, 0, canvasWidth, canvasHeight);
            console.log(`[Game] Camera bounds set to: ${canvasWidth}x${canvasHeight}`);
        }
        
        // Initialize level
        const levelManager = this.systemManager.getLevelManager();
        if (levelManager) {
            levelManager.initializeLevel(this.gameState.level);
        }
        
        // Setup UI
        this.updateUI();
    }

    resizeCanvas() {
        // Get the canvas container dimensions
        const container = this.canvas.parentElement;
        if (container) {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            // If container has no size yet, wait and try again
            if (rect.width === 0 || rect.height === 0) {
                console.log('[Game] Container has no size yet, using fallback and will retry');
                this.canvas.width = 800;
                this.canvas.height = 600;
                this.canvas.style.width = '100%';
                this.canvas.style.height = '100%';
                
                // Try again after a short delay
                setTimeout(() => this.resizeCanvas(), 100);
                return;
            }
            
            // Set display size (css pixels)
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
            
            // Set actual size in memory (scaled by device pixel ratio)
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            
            // Scale the context to ensure correct drawing operations
            this.ctx.scale(dpr, dpr);
            
            console.log(`[Game] Canvas resized to ${this.canvas.width}x${this.canvas.height} (${rect.width}x${rect.height} CSS)`);
        } else {
            // Fallback dimensions
            this.canvas.width = 800;
            this.canvas.height = 600;
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            console.log('[Game] Using fallback canvas dimensions: 800x600');
        }
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
            try {
                levelManager.update(deltaTime);
            } catch (error) {
                console.error('[Game] Error updating LevelManager:', error);
            }
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
        // Save context state
        this.ctx.save();
        
        // Clear canvas (account for device pixel ratio)
        const dpr = window.devicePixelRatio || 1;
        this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
        
        // Debug: Log canvas dimensions and rendering info periodically
        this.frameCount = (this.frameCount || 0) + 1;
        if (this.frameCount % 300 === 0) { // Every 5 seconds at 60fps
            console.log(`[Game] Render frame ${this.frameCount}:`, {
                canvasWidth: this.canvas.width,
                canvasHeight: this.canvas.height,
                canvasStyleWidth: this.canvas.style.width,
                canvasStyleHeight: this.canvas.style.height,
                enemies: this.enemies.length,
                gameRunning: this.isRunning,
                contextTransform: this.ctx.getTransform ? this.ctx.getTransform() : 'unavailable'
            });
        }
        
        // Apply camera transform
        let restoreCamera = null;
        if (window.camera) {
            restoreCamera = window.camera.applyTransform(this.ctx);
        }
        
        // Render game world
        this.renderBackground();
        this.renderPath();
        
        // Debug: Draw test circles to verify rendering system
        if (this.frameCount % 60 === 0) { // Every second
            this.ctx.save();
            this.ctx.fillStyle = '#00FF00';
            this.ctx.beginPath();
            this.ctx.arc(100, 100, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#FF0000';
            this.ctx.beginPath();
            this.ctx.arc(400, 300, 15, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
        
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
        
        // Restore context state
        this.ctx.restore();
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
        if (!levelManager) {
            console.warn('[Game] No level manager available for path rendering');
            return;
        }
        
        const path = levelManager.getCurrentPath();
        if (!path || path.length < 2) {
            console.warn('[Game] Invalid path for rendering:', path);
            return;
        }
        
        console.log(`[Game] Rendering path with ${path.length} points:`, path);
        
        // Make the path more visible for debugging
        this.ctx.strokeStyle = '#8B4513'; // Brown color
        this.ctx.lineWidth = 40;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
            this.ctx.lineTo(path[i].x, path[i].y);
        }
        
        this.ctx.stroke();
        
        // Add path endpoint markers for debugging
        this.ctx.fillStyle = '#00FF00'; // Green for start
        this.ctx.beginPath();
        this.ctx.arc(path[0].x, path[0].y, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FF0000'; // Red for end
        this.ctx.beginPath();
        this.ctx.arc(path[path.length - 1].x, path[path.length - 1].y, 15, 0, Math.PI * 2);
        this.ctx.fill();
    }

    renderEnemies() {
        if (this.enemies.length > 0) {
            console.log(`[Game] Rendering ${this.enemies.length} enemies`);
        }
        
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (enemy && enemy.render) {
                console.log(`[Game] Rendering enemy ${i}:`, {
                    type: enemy.type,
                    x: enemy.x,
                    y: enemy.y,
                    isAlive: enemy.isAlive
                });
                enemy.render(this.ctx);
            } else {
                console.warn(`[Game] Enemy ${i} is invalid or missing render method:`, enemy);
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
        
        // Trigger enemy spawning based on wave data
        if (data.waveData && data.waveData.enemies) {
            console.log(`[Game] Starting enemy spawning for wave ${data.wave}`);
        }
        
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

    spawnEnemy(enemyData, spawnPoint, path) {
        try {
            // Create enemy instance using Enemy factory
            if (typeof Enemy === 'undefined') {
                console.error('[Game] Enemy class not available for spawning');
                return false;
            }
            
            // Validate spawn parameters
            if (!enemyData || !spawnPoint || !path) {
                console.error('[Game] Invalid spawn parameters:', { enemyData, spawnPoint, path });
                return false;
            }
            
            // Create enemy with configuration
            const enemy = new Enemy({
                type: enemyData.type,
                x: spawnPoint.x,
                y: spawnPoint.y,
                health: enemyData.health,
                speed: enemyData.speed,
                reward: enemyData.reward,
                path: path,
                spawnDelay: enemyData.spawnDelay || 0
            });
            
            // Add enemy to game
            this.enemies.push(enemy);
            
            console.log(`[Game] Spawned ${enemyData.type} enemy at ${spawnPoint.x}, ${spawnPoint.y}`);
            console.log(`[Game] Enemy details:`, {
                type: enemy.type,
                x: enemy.x,
                y: enemy.y,
                size: enemy.size,
                color: enemy.color,
                hasRenderMethod: typeof enemy.render === 'function',
                isAlive: enemy.isAlive
            });
            console.log(`[Game] Total enemies now:`, this.enemies.length);
            
            // Notify level manager of successful spawn
            const levelManager = this.systemManager.getLevelManager();
            if (levelManager && typeof levelManager.onEnemySpawned === 'function') {
                levelManager.onEnemySpawned();
            }
            
            return true;
            
        } catch (error) {
            console.error('[Game] Error spawning enemy:', error);
            return false;
        }
    }

    handleCanvasResize(dimensions) {
        try {
            console.log('[Game] Handling canvas resize:', dimensions);
            
            // Update camera bounds
            if (window.camera) {
                window.camera.setBounds(0, 0, dimensions.width, dimensions.height);
                console.log(`[Game] Updated camera bounds to: ${dimensions.width}x${dimensions.height}`);
            }
            
            // Update any systems that need to know about canvas size changes
            if (this.uiManager && typeof this.uiManager.handleCanvasResize === 'function') {
                this.uiManager.handleCanvasResize(dimensions);
            }
            
            // Notify defense manager of size changes
            if (this.defenseManager && typeof this.defenseManager.handleCanvasResize === 'function') {
                this.defenseManager.handleCanvasResize(dimensions);
            }
            
            // Update any other systems that depend on canvas dimensions
            const levelManager = this.systemManager.getLevelManager();
            if (levelManager && typeof levelManager.handleCanvasResize === 'function') {
                levelManager.handleCanvasResize(dimensions);
            }
            
            console.log('[Game] Canvas resize handling complete');
            
        } catch (error) {
            console.error('[Game] Error handling canvas resize:', error);
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