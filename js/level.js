import Utils from './utils.js';

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
                { type: "scriptKiddie", count: 8, health_multiplier: 1.0, speed_multiplier: 1.0, reward_multiplier: 1.0 },
                { type: "federalAgent", count: 6, health_multiplier: 2.0, speed_multiplier: 0.8, reward_multiplier: 1.5 },
                { type: "corporateSaboteur", count: 4, health_multiplier: 1.5, speed_multiplier: 1.0, reward_multiplier: 1.2 },
                { type: "aiSurveillance", count: 3, health_multiplier: 2.4, speed_multiplier: 0.9, reward_multiplier: 1.8 },
                { type: "quantumHacker", count: 2, health_multiplier: 4.0, speed_multiplier: 0.7, reward_multiplier: 2.5 },
                { type: "corruptedMonk", count: 1, health_multiplier: 3.0, speed_multiplier: 0.6, reward_multiplier: 2.0 }
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
        this.currentWave = 0; // Start at 0 so first wave is wave 1
        this.waveInProgress = false;
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;
        this.enemiesRemaining = 0;
        
        this.generateLevelPath();
        this.triggerCallback('onLevelStart', { level: levelNumber });
        
        console.log(`[LevelManager] Level ${levelNumber} initialized, ready for wave 1`);
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
        console.log('[LevelManager] Creating fallback path due to PathGenerator unavailability');
        
        // Create a very winding path with many waypoints for smooth tower defense gameplay
        this.currentPath = [
            { x: 50, y: 300 },     // Start - left side
            { x: 100, y: 250 },    // Up and right
            { x: 160, y: 200 },    // Continue up-right
            { x: 220, y: 180 },    // Right with slight up
            { x: 280, y: 220 },    // Right and down
            { x: 320, y: 280 },    // Down more
            { x: 360, y: 350 },    // Down and right
            { x: 420, y: 400 },    // Down-right
            { x: 480, y: 420 },    // Right
            { x: 540, y: 380 },    // Right and up
            { x: 580, y: 320 },    // Up more
            { x: 600, y: 260 },    // Up
            { x: 620, y: 200 },    // Up
            { x: 660, y: 150 },    // Up-right
            { x: 700, y: 120 },    // Up-right
            { x: 740, y: 140 },    // Right and slight down
            { x: 770, y: 180 },    // Right-down
            { x: 780, y: 220 },    // Down
            { x: 770, y: 260 },    // Left and down
            { x: 750, y: 300 },    // Left-down
            { x: 720, y: 340 },    // Left-down
            { x: 680, y: 370 },    // Left-down
            { x: 640, y: 380 },    // Left
            { x: 600, y: 370 },    // Left-up
            { x: 570, y: 340 },    // Left-up
            { x: 550, y: 300 },    // Up
            { x: 540, y: 260 },    // Up
            { x: 550, y: 220 },    // Up-right
            { x: 580, y: 190 },    // Right-up
            { x: 620, y: 180 },    // Right
            { x: 660, y: 190 },    // Right-down
            { x: 700, y: 220 },    // Right-down
            { x: 730, y: 260 },    // Right-down
            { x: 750, y: 300 }     // Final position - right side
        ];
        
        // Spawn and exit points
        this.spawnPoints = [{ x: 0, y: 300 }];
        this.exitPoints = [{ x: 800, y: 300 }];
        
        console.log('[LevelManager] Fallback winding path created:', {
            pathPoints: this.currentPath.length,
            spawnPoints: this.spawnPoints.length,
            exitPoints: this.exitPoints.length,
            firstPoint: this.currentPath[0],
            lastPoint: this.currentPath[this.currentPath.length - 1]
        });
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
        if (this.waveInProgress || this.currentWave >= this.maxWaves) {
            return false;
        }

        this.currentWave++; // Increment to the actual wave number being started
        this.waveInProgress = true;
        this.waveStartTime = Utils.performance.now();
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;
        
        const waveData = this.generateWaveData();
        this.currentWaveData = waveData;
        this.enemiesRemaining = waveData.totalEnemies;
        
        // Populate spawn queue based on wave data
        this.populateSpawnQueue(waveData);
        
        console.log(`[LevelManager] Wave ${this.currentWave} started with ${this.spawnQueue.length} spawn events`);
        
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
            // Choose boss type based on wave number
            let bossType = "raidTeam";
            if (this.currentWave >= 15) {
                bossType = "megaCorp";
            } else if (this.currentWave >= 10) {
                bossType = "corruptedMonk";
            }
            
            enemies.push({
                type: bossType,
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
                             Math.pow(1 + this.waveConfig.difficulty_progression.speed_increase * 0.6, this.currentWave - 1);
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
            scriptKiddie: 600,
            federalAgent: 1000,
            corporateSaboteur: 800,
            aiSurveillance: 1200,
            quantumHacker: 1800,
            corruptedMonk: 2000,
            raidTeam: 3000,
            megaCorp: 3000
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
        const canStart = !this.waveInProgress && this.currentWave < this.maxWaves;
        console.log(`[LevelManager] canStartNextWave: waveInProgress=${this.waveInProgress}, currentWave=${this.currentWave}, maxWaves=${this.maxWaves}, canStart=${canStart}`);
        return canStart;
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
        // Calculate the next wave number that would be started
        const nextWave = this.currentWave + 1;
        
        console.log(`[LevelManager] getNextWavePreview: currentWave=${this.currentWave}, waveInProgress=${this.waveInProgress}, nextWave=${nextWave}, maxWaves=${this.maxWaves}`);
        
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