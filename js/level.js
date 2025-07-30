class LevelManager {
    constructor() {
        this.currentLevel = 1;
        this.currentWave = 1;
        this.maxWaves = 20;
        this.waveInProgress = false;
        this.waveStartTime = 0;
        this.waveEndTime = 0;
        this.nextWaveDelay = 3000;
        
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;
        this.enemiesRemaining = 0;
        
        // Spawn queue system
        this.spawnQueue = [];
        this.nextSpawnTime = 0;
        this.currentWaveData = null;
        
        this.pathGenerator = null;
        this.currentPath = null;
        this.spawnPoints = [];
        this.exitPoints = [];
        
        this.levelConfig = null;
        this.waveConfig = null;
        
        this.callbacks = {
            onWaveStart: null,
            onWaveComplete: null,
            onLevelComplete: null,
            onGameComplete: null,
            onEnemySpawn: null,
            onEnemyKilled: null,
            onEnemySpawnRequest: null
        };
        
        this.loadLevelConfiguration();
    }

    loadLevelConfiguration() {
        this.levelConfig = {
            1: {
                name: "Meditation Garden",
                description: "A peaceful beginning where digital demons first appear",
                difficulty: 1,
                baseEnemyHealth: 100,
                baseEnemySpeed: 1.0,
                baseReward: 10,
                specialRules: [],
                backgroundColor: "#1a1a2e",
                pathStyle: "curved"
            },
            2: {
                name: "Temple Servers",
                description: "The sanctuary's digital infrastructure under siege",
                difficulty: 1.5,
                baseEnemyHealth: 150,
                baseEnemySpeed: 1.1,
                baseReward: 15,
                specialRules: ["faster_enemies"],
                backgroundColor: "#16213e",
                pathStyle: "zigzag"
            },
            3: {
                name: "Cyber Monastery",
                description: "Where ancient wisdom meets quantum processing",
                difficulty: 2.0,
                baseEnemyHealth: 200,
                baseEnemySpeed: 1.2,
                baseReward: 20,
                specialRules: ["armored_enemies"],
                backgroundColor: "#2a1810",
                pathStyle: "spiral"
            }
        };

        this.waveConfig = {
            enemy_types: [
                { type: "basic", count: 10, health_multiplier: 1.0, speed_multiplier: 1.0, reward_multiplier: 1.0 },
                { type: "fast", count: 8, health_multiplier: 0.7, speed_multiplier: 1.5, reward_multiplier: 1.2 },
                { type: "armored", count: 6, health_multiplier: 2.0, speed_multiplier: 0.8, reward_multiplier: 1.5 },
                { type: "elite", count: 3, health_multiplier: 3.0, speed_multiplier: 1.0, reward_multiplier: 2.0 }
            ],
            boss_waves: [5, 10, 15, 20],
            difficulty_progression: {
                health_increase: 0.15,
                speed_increase: 0.05,
                count_increase: 0.1
            }
        };
    }

    initializeLevel(levelNumber) {
        this.currentLevel = levelNumber;
        this.currentWave = 1;
        this.waveInProgress = false;
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;
        this.enemiesRemaining = 0;
        
        this.generateLevelPath();
        this.triggerCallback('onLevelStart', { level: levelNumber });
    }

    generateLevelPath() {
        if (!this.pathGenerator) {
            console.warn('PathGenerator not available, using fallback path');
            this.createFallbackPath();
            return;
        }

        try {
            const levelData = this.getLevelData();
            const pathStyle = levelData.pathStyle || 'curved';
            
            // Map pathStyle values to valid PathGenerator themes
            const mappedTheme = this.mapPathStyleToTheme(pathStyle);
            
            this.currentPath = this.pathGenerator.generateBasePath(this.currentLevel, null, mappedTheme, 'hybrid');
            
            // Extract spawn and exit points from the generated path
            if (this.currentPath && this.currentPath.length > 0) {
                this.spawnPoints = [this.currentPath[0]];
                this.exitPoints = [this.currentPath[this.currentPath.length - 1]];
            } else {
                // Handle empty or invalid path
                this.spawnPoints = [];
                this.exitPoints = [];
            }
        } catch (error) {
            console.warn('Path generation failed, using fallback:', error);
            this.createFallbackPath();
        }
    }

    mapPathStyleToTheme(pathStyle) {
        // Map pathStyle values to valid PathGenerator themes
        const themeMapping = {
            'curved': 'cyber',    // matches cyberpunk aesthetic
            'zigzag': 'urban',    // angular patterns fit urban theme
            'spiral': 'forest'    // organic curves match forest theme
        };
        
        // Return mapped theme or fallback to 'cyber' for unknown styles
        const mappedTheme = themeMapping[pathStyle] || 'cyber';
        
        // Validate that the theme is one of the supported PathGenerator themes
        const validThemes = ['cyber', 'urban', 'forest', 'mountain'];
        if (!validThemes.includes(mappedTheme)) {
            console.warn(`Invalid theme "${mappedTheme}" mapped from pathStyle "${pathStyle}", using fallback 'cyber'`);
            return 'cyber';
        }
        
        return mappedTheme;
    }

    createFallbackPath() {
        this.currentPath = [
            { x: 50, y: 300 },
            { x: 200, y: 250 },
            { x: 350, y: 300 },
            { x: 500, y: 200 },
            { x: 650, y: 300 },
            { x: 750, y: 300 }
        ];
        this.spawnPoints = [{ x: 0, y: 300 }];
        this.exitPoints = [{ x: 800, y: 300 }];
    }

    setPathGenerator(pathGenerator) {
        this.pathGenerator = pathGenerator;
    }

    update(deltaTime) {
        if (!this.waveInProgress) {
            return;
        }
        
        try {
            // Process spawn queue for enemy spawning
            this.processSpawnQueue(deltaTime);
            
            // Check wave progression and completion
            this.checkWaveCompletion();
            
        } catch (error) {
            console.error('[LevelManager] Error during update:', error);
        }
    }

    processSpawnQueue(deltaTime) {
        if (!this.spawnQueue || this.spawnQueue.length === 0) {
            return;
        }
        
        const currentTime = Utils.performance.now();
        
        // Process all spawn events that are ready
        for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
            const spawnEvent = this.spawnQueue[i];
            
            if (currentTime >= spawnEvent.spawnTime) {
                this.executeSpawnEvent(spawnEvent);
                this.spawnQueue.splice(i, 1);
            }
        }
    }

    executeSpawnEvent(spawnEvent) {
        try {
            // Get spawn point (use first available or random)
            const spawnPoint = this.getSpawnPoint();
            if (!spawnPoint) {
                console.warn('[LevelManager] No spawn point available for enemy spawn');
                return;
            }
            
            // Get current path
            const path = this.getCurrentPath();
            if (!path || path.length === 0) {
                console.warn('[LevelManager] No path available for enemy spawn');
                return;
            }
            
            // Trigger enemy spawn request via callback
            if (this.callbacks.onEnemySpawnRequest && typeof this.callbacks.onEnemySpawnRequest === 'function') {
                const success = this.callbacks.onEnemySpawnRequest(spawnEvent.enemyData, spawnPoint, path);
                
                if (success) {
                    console.log(`[LevelManager] Successfully requested spawn for ${spawnEvent.enemyData.type}`);
                } else {
                    console.warn(`[LevelManager] Failed to request spawn for ${spawnEvent.enemyData.type}`);
                }
            } else {
                console.warn('[LevelManager] No onEnemySpawnRequest callback available');
            }
            
        } catch (error) {
            console.error('[LevelManager] Error executing spawn event:', error);
        }
    }

    getSpawnPoint() {
        if (this.spawnPoints && this.spawnPoints.length > 0) {
            // Return first spawn point or randomly select one
            return this.spawnPoints[0];
        }
        
        // Fallback: use start of path
        if (this.currentPath && this.currentPath.length > 0) {
            return this.currentPath[0];
        }
        
        return null;
    }

    checkWaveCompletion() {
        // Wave is complete when all enemies are spawned and all are either killed or escaped
        const allEnemiesSpawned = this.spawnQueue.length === 0;
        const noEnemiesRemaining = this.enemiesRemaining <= 0;
        
        if (allEnemiesSpawned && noEnemiesRemaining && this.waveInProgress) {
            console.log('[LevelManager] Wave completion conditions met');
            this.completeWave();
        }
    }

    startWave() {
        if (this.waveInProgress || this.currentWave > this.maxWaves) {
            return false;
        }

        this.waveInProgress = true;
        this.waveStartTime = Utils.performance.now();
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;
        
        const waveData = this.generateWaveData();
        this.currentWaveData = waveData;
        this.enemiesRemaining = waveData.totalEnemies;
        
        // Populate spawn queue based on wave data
        this.populateSpawnQueue(waveData);
        
        this.triggerCallback('onWaveStart', {
            wave: this.currentWave,
            level: this.currentLevel,
            waveData: waveData
        });

        return true;
    }

    populateSpawnQueue(waveData) {
        this.spawnQueue = [];
        const baseTime = Utils.performance.now();
        let currentSpawnTime = baseTime;
        
        // Convert wave's enemy composition into timed spawn events
        for (const enemyGroup of waveData.enemies) {
            const spawnDelay = enemyGroup.spawnDelay || 1000;
            
            for (let i = 0; i < enemyGroup.count; i++) {
                const spawnEvent = {
                    enemyData: {
                        type: enemyGroup.type,
                        health: enemyGroup.health,
                        speed: enemyGroup.speed,
                        reward: enemyGroup.reward,
                        spawnDelay: spawnDelay
                    },
                    spawnTime: currentSpawnTime,
                    groupIndex: waveData.enemies.indexOf(enemyGroup),
                    enemyIndex: i
                };
                
                this.spawnQueue.push(spawnEvent);
                
                // Stagger spawn times within the group
                currentSpawnTime += spawnDelay + (Math.random() * 200 - 100); // Add some variation
            }
            
            // Add extra delay between different enemy groups
            currentSpawnTime += spawnDelay * 0.5;
        }
        
        // Sort spawn queue by spawn time to ensure proper ordering
        this.spawnQueue.sort((a, b) => a.spawnTime - b.spawnTime);
        
        console.log(`[LevelManager] Populated spawn queue with ${this.spawnQueue.length} spawn events for wave ${this.currentWave}`);
    }

    generateWaveData() {
        const levelData = this.getLevelData();
        const waveMultiplier = 1 + (this.currentWave - 1) * 0.1;
        const levelMultiplier = 1 + (this.currentLevel - 1) * 0.2;
        
        const isBossWave = this.waveConfig.boss_waves.includes(this.currentWave);
        
        let enemies = [];
        let totalEnemies = 0;

        if (isBossWave) {
            enemies.push({
                type: "boss",
                count: 1,
                health: levelData.baseEnemyHealth * 10 * levelMultiplier,
                speed: levelData.baseEnemySpeed * 0.7,
                reward: levelData.baseReward * 10,
                spawnDelay: 2000
            });
            totalEnemies = 1;
        } else {
            for (const enemyType of this.waveConfig.enemy_types) {
                const count = Math.ceil(enemyType.count * waveMultiplier);
                const health = levelData.baseEnemyHealth * 
                              enemyType.health_multiplier * 
                              Math.pow(1 + this.waveConfig.difficulty_progression.health_increase, this.currentWave - 1);
                const speed = levelData.baseEnemySpeed * 
                             enemyType.speed_multiplier * 
                             Math.pow(1 + this.waveConfig.difficulty_progression.speed_increase, this.currentWave - 1);
                const reward = Math.ceil(levelData.baseReward * enemyType.reward_multiplier * levelMultiplier);

                enemies.push({
                    type: enemyType.type,
                    count: count,
                    health: health,
                    speed: speed,
                    reward: reward,
                    spawnDelay: this.calculateSpawnDelay(enemyType.type)
                });
                
                totalEnemies += count;
            }
        }

        return {
            waveNumber: this.currentWave,
            enemies: enemies,
            totalEnemies: totalEnemies,
            isBossWave: isBossWave,
            specialRules: levelData.specialRules || []
        };
    }

    calculateSpawnDelay(enemyType) {
        const baseDelays = {
            basic: 800,
            fast: 600,
            armored: 1200,
            elite: 2000,
            boss: 3000
        };
        
        return baseDelays[enemyType] || 1000;
    }

    onEnemySpawned() {
        this.enemiesSpawned++;
        console.log(`[LevelManager] Enemy spawned. Total: ${this.enemiesSpawned}, Remaining: ${this.enemiesRemaining}`);
    }

    onEnemyKilled() {
        this.enemiesKilled++;
        this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
        
        this.triggerCallback('onEnemyKilled', {
            killed: this.enemiesKilled,
            remaining: this.enemiesRemaining,
            wave: this.currentWave
        });

        console.log(`[LevelManager] Enemy killed. Killed: ${this.enemiesKilled}, Remaining: ${this.enemiesRemaining}`);
        
        // Wave completion will be checked in the update loop
    }

    onEnemyEscaped() {
        this.enemiesRemaining = Math.max(0, this.enemiesRemaining - 1);
        
        console.log(`[LevelManager] Enemy escaped. Remaining: ${this.enemiesRemaining}`);
        
        // Wave completion will be checked in the update loop
    }

    completeWave() {
        this.waveInProgress = false;
        this.waveEndTime = Utils.performance.now();
        
        // Clear any remaining spawn queue entries
        this.spawnQueue = [];
        this.currentWaveData = null;
        
        const waveData = {
            wave: this.currentWave,
            level: this.currentLevel,
            enemiesKilled: this.enemiesKilled,
            enemiesSpawned: this.enemiesSpawned,
            duration: this.waveEndTime - this.waveStartTime,
            perfect: this.enemiesKilled === this.enemiesSpawned
        };
        
        console.log(`[LevelManager] Wave ${this.currentWave} completed:`, waveData);
        
        this.triggerCallback('onWaveComplete', waveData);

        if (this.currentWave >= this.maxWaves) {
            this.completeLevel();
        } else {
            this.currentWave++;
        }
    }

    completeLevel() {
        const levelData = {
            level: this.currentLevel,
            wavesCompleted: this.maxWaves,
            totalTime: this.waveEndTime - this.waveStartTime
        };
        
        this.triggerCallback('onLevelComplete', levelData);
        
        if (this.currentLevel >= Object.keys(this.levelConfig).length) {
            this.triggerCallback('onGameComplete', { finalLevel: this.currentLevel });
        }
    }

    getLevelData() {
        return this.levelConfig[this.currentLevel] || this.levelConfig[1];
    }

    getCurrentPath() {
        return this.currentPath;
    }

    getSpawnPoints() {
        return this.spawnPoints;
    }

    getExitPoints() {
        return this.exitPoints;
    }

    isWaveInProgress() {
        return this.waveInProgress;
    }

    canStartNextWave() {
        return !this.waveInProgress && this.currentWave <= this.maxWaves;
    }

    getWaveProgress() {
        if (!this.waveInProgress) return 1.0;
        
        const totalEnemies = this.enemiesSpawned || 1;
        return this.enemiesKilled / totalEnemies;
    }

    getLevelProgress() {
        return (this.currentWave - 1) / this.maxWaves;
    }

    getNextWavePreview() {
        if (this.currentWave > this.maxWaves) return null;
        
        const nextWave = this.currentWave + (this.waveInProgress ? 0 : 1);
        if (nextWave > this.maxWaves) return null;
        
        const tempWave = this.currentWave;
        this.currentWave = nextWave;
        const preview = this.generateWaveData();
        this.currentWave = tempWave;
        
        return preview;
    }

    restart() {
        this.initializeLevel(this.currentLevel);
    }

    setCallbacks(callbacks) {
        Object.assign(this.callbacks, callbacks);
    }

    triggerCallback(event, data) {
        if (this.callbacks[event] && typeof this.callbacks[event] === 'function') {
            try {
                this.callbacks[event](data);
            } catch (error) {
                console.error(`Error in level callback ${event}:`, error);
            }
        }
    }

    getState() {
        return {
            currentLevel: this.currentLevel,
            currentWave: this.currentWave,
            waveInProgress: this.waveInProgress,
            enemiesSpawned: this.enemiesSpawned,
            enemiesKilled: this.enemiesKilled,
            enemiesRemaining: this.enemiesRemaining,
            waveStartTime: this.waveStartTime,
            spawnQueueLength: this.spawnQueue ? this.spawnQueue.length : 0
        };
    }

    setState(state) {
        this.currentLevel = state.currentLevel || 1;
        this.currentWave = state.currentWave || 1;
        this.waveInProgress = state.waveInProgress || false;
        this.enemiesSpawned = state.enemiesSpawned || 0;
        this.enemiesKilled = state.enemiesKilled || 0;
        this.enemiesRemaining = state.enemiesRemaining || 0;
        this.waveStartTime = state.waveStartTime || 0;
        
        // Reset spawn queue when loading state
        this.spawnQueue = [];
        this.currentWaveData = null;
        this.nextSpawnTime = 0;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelManager;
} else {
    window.LevelManager = LevelManager;
}