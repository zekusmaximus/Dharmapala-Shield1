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
        
        // Canvas resize control
        this.canvasResizeEnabled = false;
        this.resizeRetryCount = 0;
        
        // Event handlers
        this.eventHandlers = new Map();
        
        // Performance monitoring and frame rate control
        this.performanceConfig = {
            targetFPS: 60,
            maxFPS: 120,
            minFPS: 30,
            frameTimeTarget: 1000 / 60, // 16.67ms
            adaptiveFrameRate: true,
            performanceMode: 'auto' // 'auto', 'performance', 'quality'
        };
        
        this.frameStats = {
            lastFrameTime: 0,
            frameCount: 0,
            fpsHistory: [],
            averageFPS: 60,
            frameTimeAccumulator: 0,
            lastFPSUpdate: 0
        };
        
        this.performanceThresholds = {
            lowFPS: 45,
            criticalFPS: 30,
            highFPS: 55
        };
        
        // Debug and logging configuration
        this.debugConfig = {
            enabled: false, // Set to false for production
            logLevel: 'warn', // 'debug', 'info', 'warn', 'error'
            renderLogging: false,
            performanceLogging: false,
            maxLogFrequency: 5000, // Max one log per 5 seconds for performance logs
            logHistory: new Map()
        };
        
        // Background caching system
        this.backgroundCache = {
            canvas: null,
            ctx: null,
            cached: false,
            needsUpdate: false,
            lastCanvasSize: { width: 0, height: 0 }
        };
        
        this.initializeDebugMode();
        this.initializeBackgroundCache();
        this.setupEventListeners();
    }

    // Debug and logging methods
    initializeDebugMode() {
        // Set debug mode based on environment or URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const debugParam = urlParams.get('debug');
        
        if (debugParam === 'true' || debugParam === '1') {
            this.debugConfig.enabled = true;
            this.debugConfig.logLevel = 'debug';
            this.debugConfig.renderLogging = true;
            this.debugConfig.performanceLogging = true;
        }
        
        // Production mode detection
        if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
            this.debugConfig.enabled = false;
            this.debugConfig.renderLogging = false;
            this.debugConfig.performanceLogging = false;
        }
    }

    logDebug(message, data = null, category = 'general') {
        if (!this.debugConfig.enabled) return;
        
        const now = Date.now();
        const lastLog = this.debugConfig.logHistory.get(category) || 0;
        
        // Rate limiting for performance logs
        if (category === 'performance' && (now - lastLog) < this.debugConfig.maxLogFrequency) {
            return;
        }
        
        this.debugConfig.logHistory.set(category, now);
        
        const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
        const currentLevel = logLevels[this.debugConfig.logLevel] || 1;
        const messageLevel = logLevels[category] || 0;
        
        if (messageLevel >= currentLevel) {
            const prefix = `[Game:${category.toUpperCase()}]`;
            if (data) {
                console.log(prefix, message, data);
            } else {
                console.log(prefix, message);
            }
        }
    }

    // Background caching system
    initializeBackgroundCache() {
        this.backgroundCache.canvas = document.createElement('canvas');
        this.backgroundCache.ctx = this.backgroundCache.canvas.getContext('2d');
        this.backgroundCache.cached = false;
        this.backgroundCache.needsUpdate = true;
    }

    updateBackgroundCache() {
        if (!this.backgroundCache.needsUpdate) return;
        
        const canvas = this.backgroundCache.canvas;
        const ctx = this.backgroundCache.ctx;
        
        // Resize cache canvas if needed
        if (canvas.width !== this.canvas.width || canvas.height !== this.canvas.height) {
            canvas.width = this.canvas.width;
            canvas.height = this.canvas.height;
            this.backgroundCache.lastCanvasSize = { width: this.canvas.width, height: this.canvas.height };
        }
        
        // Clear cache canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render background to cache
        this.renderBackgroundToCache(ctx);
        
        this.backgroundCache.cached = true;
        this.backgroundCache.needsUpdate = false;
        
        this.logDebug('Background cache updated', {
            width: canvas.width,
            height: canvas.height
        }, 'performance');
    }

    renderBackgroundToCache(ctx) {
        // Create a more vibrant gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0f1419'); // Dark blue-black
        gradient.addColorStop(0.3, '#1a1a2e'); // Dark purple-blue
        gradient.addColorStop(0.7, '#16213e'); // Lighter blue
        gradient.addColorStop(1, '#0e1b2e'); // Back to darker
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add some visual interest with a subtle pattern
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#ffffff';
        
        // Add some "digital" dot pattern
        const dotSize = 2;
        const spacing = 30;
        for (let x = 0; x < this.canvas.width; x += spacing) {
            for (let y = 0; y < this.canvas.height; y += spacing) {
                ctx.beginPath();
                ctx.arc(x, y, dotSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Reset alpha
        ctx.globalAlpha = 1.0;
    }

    invalidateBackgroundCache() {
        this.backgroundCache.needsUpdate = true;
        this.backgroundCache.cached = false;
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
        // Don't resize canvas here - wait until we're on the game screen
        // Just set fallback dimensions for now
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Initialize sprite system with fallback sprites
        this.initializeSpriteSystem();
        
        // Setup camera with fallback dimensions initially
        if (window.camera) {
            window.camera.setCanvas(this.canvas);
            window.camera.setBounds(0, 0, 800, 600);
            console.log(`[Game] Camera bounds set to fallback: 800x600`);
        }
        
        // Initialize level
        const levelManager = this.systemManager.getLevelManager();
        if (levelManager) {
            levelManager.initializeLevel(this.gameState.level);
        }
        
        // Setup UI
        this.updateUI();
    }

    initializeSpriteSystem() {
        if (!window.spriteManager) {
            console.warn('[Game] SpriteManager not available');
            return;
        }
        
        console.log('[Game] Initializing sprite system...');
        
        // Try to load actual sprite assets first
        window.spriteManager.loadGameSprites().then(() => {
            console.log('[Game] Game sprites loaded (some may be fallbacks)');
        }).catch(error => {
            console.warn('[Game] Error loading game sprites, using all fallbacks:', error);
        });
        
        // Pre-generate common fallback sprites so they're ready when needed
        const commonSprites = [
            'enemy_scriptKiddie',
            'enemy_federalAgent', 
            'enemy_corporateSaboteur',
            'enemy_aiSurveillance',
            'enemy_quantumHacker',
            'enemy_corruptedMonk',
            'defense_firewall_level1',
            'defense_encryption_level1',
            'defense_decoy_level1',
            'defense_quantum_level1',
            'defense_dharma_level1',
            'defense_cybermonk_level1',
            'boss_raidTeam_phase1',
            'boss_megaCorp_phase1',
            'boss_corruptedMonk_phase1'
        ];
        
        // Ensure fallback sprites exist for any that didn't load
        commonSprites.forEach(spriteName => {
            if (!window.spriteManager.hasSprite(spriteName)) {
                window.spriteManager.createFallbackSprite(spriteName);
            }
        });
        
        console.log('[Game] Sprite system initialized with enhanced graphics');
    }

    resizeCanvas() {
        // Check if canvas resizing is enabled
        if (!this.canvasResizeEnabled) {
            console.log('[Game] Canvas resize disabled, skipping');
            return;
        }
        
        // Only resize canvas when game is actually running and visible
        const gameScreen = document.getElementById('game-screen');
        if (!gameScreen || !gameScreen.classList.contains('active')) {
            console.log('[Game] Game screen not active, skipping canvas resize');
            return;
        }
        
        // Get the canvas container dimensions
        const container = this.canvas.parentElement;
        if (container) {
            const rect = container.getBoundingClientRect();
            
            // If container has no size yet, use fallback without retrying
            if (rect.width === 0 || rect.height === 0) {
                console.log('[Game] Container has no size yet, using fallback dimensions');
                this.canvas.width = 800;
                this.canvas.height = 600;
                this.canvas.style.width = '100%';
                this.canvas.style.height = '100%';
                return;
            }
            
            // Set display size (css pixels)
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
            
            // Set actual size in memory (use CSS pixels for simpler rendering)
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            
            // No context scaling needed since we're using CSS pixels
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
        
        // Now that we're starting the game, enable and perform canvas resize
        this.canvasResizeEnabled = true;
        this.resizeRetryCount = 0;
        setTimeout(() => {
            this.resizeCanvas();
            // Update camera bounds after canvas resize
            if (window.camera) {
                window.camera.setBounds(0, 0, this.canvas.width, this.canvas.height);
                console.log(`[Game] Camera bounds updated to: ${this.canvas.width}x${this.canvas.height}`);
            }
        }, 100);
        
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
        
        // Enable and resize canvas when continuing game
        this.canvasResizeEnabled = true;
        this.resizeRetryCount = 0;
        setTimeout(() => {
            this.resizeCanvas();
            // Update camera bounds after canvas resize
            if (window.camera) {
                window.camera.setBounds(0, 0, this.canvas.width, this.canvas.height);
                console.log(`[Game] Camera bounds updated to: ${this.canvas.width}x${this.canvas.height}`);
            }
        }, 100);
        
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
        this.canvasResizeEnabled = false; // Disable canvas resize when returning to menu
        console.log('[Game] Returned to menu');
    }

    // Game Loop
    startGameLoop() {
        this.frameStats.lastFrameTime = Utils.performance.now();
        this.frameStats.lastFPSUpdate = this.frameStats.lastFrameTime;
        this.gameLoop();
    }

    gameLoop(currentTime = Utils.performance.now()) {
        if (!this.gameState.running) return;
        
        // Calculate frame timing
        const deltaTime = currentTime - this.frameStats.lastFrameTime;
        
        // Frame rate limiting with adaptive performance
        if (deltaTime < this.performanceConfig.frameTimeTarget) {
            requestAnimationFrame((time) => this.gameLoop(time));
            return;
        }
        
        // Update frame statistics
        this.updateFrameStats(currentTime, deltaTime);
        
        // Adaptive performance scaling
        this.adaptPerformanceSettings();
        
        // Game update and render
        const scaledDeltaTime = Math.min(deltaTime * this.gameState.gameSpeed, 33.33); // Cap at 30fps equivalent
        
        if (!this.gameState.paused) {
            this.update(scaledDeltaTime);
        }
        
        // Conditional rendering based on performance
        if (this.shouldRender()) {
            this.render();
        }
        
        this.frameStats.lastFrameTime = currentTime;
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    updateFrameStats(currentTime, deltaTime) {
        this.frameStats.frameCount++;
        this.frameStats.frameTimeAccumulator += deltaTime;
        
        // Update FPS every second
        if (currentTime - this.frameStats.lastFPSUpdate >= 1000) {
            const fps = this.frameStats.frameCount;
            this.frameStats.fpsHistory.push(fps);
            
            // Keep only last 10 seconds of FPS data
            if (this.frameStats.fpsHistory.length > 10) {
                this.frameStats.fpsHistory.shift();
            }
            
            // Calculate average FPS
            this.frameStats.averageFPS = this.frameStats.fpsHistory.reduce((a, b) => a + b, 0) / this.frameStats.fpsHistory.length;
            
            // Reset counters
            this.frameStats.frameCount = 0;
            this.frameStats.frameTimeAccumulator = 0;
            this.frameStats.lastFPSUpdate = currentTime;
        }
    }

    adaptPerformanceSettings() {
        if (!this.performanceConfig.adaptiveFrameRate) return;
        
        const avgFPS = this.frameStats.averageFPS;
        
        // Automatic performance scaling
        if (avgFPS < this.performanceThresholds.criticalFPS) {
            this.setPerformanceMode('performance');
        } else if (avgFPS < this.performanceThresholds.lowFPS) {
            this.setPerformanceMode('balanced');
        } else if (avgFPS > this.performanceThresholds.highFPS) {
            this.setPerformanceMode('quality');
        }
    }

    setPerformanceMode(mode) {
        switch (mode) {
            case 'performance':
                this.performanceConfig.targetFPS = 30;
                this.performanceConfig.frameTimeTarget = 1000 / 30;
                // Reduce particle count, disable some effects
                if (window.particleSystem) {
                    window.particleSystem.setMaxParticles(200);
                }
                break;
                
            case 'balanced':
                this.performanceConfig.targetFPS = 45;
                this.performanceConfig.frameTimeTarget = 1000 / 45;
                if (window.particleSystem) {
                    window.particleSystem.setMaxParticles(350);
                }
                break;
                
            case 'quality':
                this.performanceConfig.targetFPS = 60;
                this.performanceConfig.frameTimeTarget = 1000 / 60;
                if (window.particleSystem) {
                    window.particleSystem.setMaxParticles(500);
                }
                break;
        }
        
        this.performanceConfig.performanceMode = mode;
        this.logDebug(`Performance mode set to: ${mode} (Target FPS: ${this.performanceConfig.targetFPS})`, null, 'performance');
    }

    shouldRender() {
        // Skip rendering frames if performance is critical
        if (this.performanceConfig.performanceMode === 'performance') {
            return this.frameStats.frameCount % 2 === 0; // Render every other frame
        }
        return true;
    }

    // Add performance monitoring method
    getPerformanceStats() {
        return {
            currentFPS: this.frameStats.averageFPS,
            targetFPS: this.performanceConfig.targetFPS,
            performanceMode: this.performanceConfig.performanceMode,
            frameTimeAverage: this.frameStats.frameTimeAccumulator / Math.max(1, this.frameStats.frameCount),
            fpsHistory: [...this.frameStats.fpsHistory]
        };
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
        
        // Clear canvas properly
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Debug logging (rate limited)
        this.logDebug('Render frame', {
            canvasSize: { width: this.canvas.width, height: this.canvas.height },
            enemies: this.enemies.length,
            gameRunning: this.gameState.running,
            paused: this.gameState.paused
        }, 'performance');
        
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
        
        // Restore context state
        this.ctx.restore();
    }

    renderBackground() {
        // Check if canvas size changed and invalidate cache if needed
        if (this.backgroundCache.lastCanvasSize.width !== this.canvas.width ||
            this.backgroundCache.lastCanvasSize.height !== this.canvas.height) {
            this.invalidateBackgroundCache();
        }
        
        // Update cache if needed
        this.updateBackgroundCache();
        
        // Use cached background if available
        if (this.backgroundCache.cached) {
            this.ctx.drawImage(this.backgroundCache.canvas, 0, 0);
        } else {
            // Fallback to direct rendering if cache fails
            this.renderBackgroundToCache(this.ctx);
        }
        
        // Debug logging (rate limited)
        this.logDebug('Background rendered', {
            cached: this.backgroundCache.cached,
            canvasSize: { width: this.canvas.width, height: this.canvas.height }
        }, 'performance');
    }

    renderPath() {
        const levelManager = this.systemManager.getLevelManager();
        if (!levelManager) {
            this.logDebug('No level manager available for path rendering', null, 'warn');
            return;
        }
        
        const path = levelManager.getCurrentPath();
        if (!path || path.length < 2) {
            this.logDebug('Invalid path for rendering', { pathLength: path?.length }, 'warn');
            return;
        }
        
        // Debug logging (rate limited)
        this.logDebug('Path rendered', {
            pathLength: path.length,
            firstPoint: path[0],
            lastPoint: path[path.length - 1]
        }, 'performance');
        
        // Save context for path rendering
        this.ctx.save();
        
        // Create a glowing, cyberpunk-style path
        // 1. Draw outer glow/shadow
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = 20;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00d4ff';
        
        this.ctx.beginPath();
        this.ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            this.ctx.lineTo(path[i].x, path[i].y);
        }
        this.ctx.stroke();
        
        // 2. Draw main path body
        this.ctx.globalAlpha = 0.8;
        this.ctx.strokeStyle = '#0088cc';
        this.ctx.lineWidth = 14;
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = '#0088cc';
        
        this.ctx.beginPath();
        this.ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            this.ctx.lineTo(path[i].x, path[i].y);
        }
        this.ctx.stroke();
        
        // 3. Draw bright center line
        this.ctx.globalAlpha = 1.0;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 4;
        this.ctx.shadowBlur = 0;
        
        this.ctx.beginPath();
        this.ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            this.ctx.lineTo(path[i].x, path[i].y);
        }
        this.ctx.stroke();
        
        // 4. Add data flow effect dots (only in quality mode for performance)
        if (this.performanceConfig.performanceMode !== 'performance') {
            this.ctx.globalAlpha = 0.9;
            const time = Date.now() * 0.003;
            for (let i = 0; i < path.length - 1; i++) {
                const segment = i / (path.length - 1);
                const flowOffset = (time + segment * 2) % 1;
                
                const startX = path[i].x;
                const startY = path[i].y;
                const endX = path[i + 1].x;
                const endY = path[i + 1].y;
                
                const dotX = startX + (endX - startX) * flowOffset;
                const dotY = startY + (endY - startY) * flowOffset;
                
                this.ctx.fillStyle = '#ffd60a';
                this.ctx.shadowBlur = 5;
                this.ctx.shadowColor = '#ffd60a';
                this.ctx.beginPath();
                this.ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        // 5. Add path endpoint markers
        this.ctx.shadowBlur = 10;
        
        // Start point (spawn)
        this.ctx.fillStyle = '#00ff88';
        this.ctx.shadowColor = '#00ff88';
        this.ctx.beginPath();
        this.ctx.arc(path[0].x, path[0].y, 12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner glow for start
        this.ctx.globalAlpha = 0.6;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 0;
        this.ctx.beginPath();
        this.ctx.arc(path[0].x, path[0].y, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // End point (exit)
        this.ctx.globalAlpha = 1.0;
        this.ctx.fillStyle = '#ff4444';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ff4444';
        this.ctx.beginPath();
        this.ctx.arc(path[path.length - 1].x, path[path.length - 1].y, 12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner glow for end
        this.ctx.globalAlpha = 0.6;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 0;
        this.ctx.beginPath();
        this.ctx.arc(path[path.length - 1].x, path[path.length - 1].y, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Restore context
        this.ctx.restore();
    }

    renderEnemies() {
        // Debug logging (rate limited)
        this.logDebug('Enemies rendered', { count: this.enemies.length }, 'performance');
        
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (enemy && enemy.render) {
                enemy.render(this.ctx);
            } else {
                this.logDebug(`Enemy ${i} is invalid or missing render method`, { enemy }, 'warn');
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
            
            // Create enemy with correct parameters (type, x, y)
            const enemy = new Enemy(enemyData.type, spawnPoint.x, spawnPoint.y);
            
            // Set the path for the enemy
            if (enemy.setPath && typeof enemy.setPath === 'function') {
                enemy.setPath(path);
            }
            
            // Override with specific spawn data if provided
            if (enemyData.health !== undefined) {
                enemy.health = enemyData.health;
                enemy.maxHealth = enemyData.health;
            }
            if (enemyData.speed !== undefined) {
                enemy.speed = enemyData.speed;
                enemy.baseSpeed = enemyData.speed;
            }
            if (enemyData.reward !== undefined) {
                enemy.reward = enemyData.reward;
            }
            
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