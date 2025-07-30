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
            onEnemyKilled: null
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

    startWave() {
        if (this.waveInProgress || this.currentWave > this.maxWaves) {
            return false;
        }

        this.waveInProgress = true;
        this.waveStartTime = Utils.performance.now();
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;
        
        const waveData = this.generateWaveData();
        this.enemiesRemaining = waveData.totalEnemies;
        
        this.triggerCallback('onWaveStart', {
            wave: this.currentWave,
            level: this.currentLevel,
            waveData: waveData
        });

        return true;
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
    }

    onEnemyKilled() {
        this.enemiesKilled++;
        this.enemiesRemaining--;
        
        this.triggerCallback('onEnemyKilled', {
            killed: this.enemiesKilled,
            remaining: this.enemiesRemaining,
            wave: this.currentWave
        });

        if (this.enemiesRemaining <= 0 && this.waveInProgress) {
            this.completeWave();
        }
    }

    onEnemyEscaped() {
        this.enemiesRemaining--;
        
        if (this.enemiesRemaining <= 0 && this.waveInProgress) {
            this.completeWave();
        }
    }

    completeWave() {
        this.waveInProgress = false;
        this.waveEndTime = Utils.performance.now();
        
        const waveData = {
            wave: this.currentWave,
            level: this.currentLevel,
            enemiesKilled: this.enemiesKilled,
            enemiesSpawned: this.enemiesSpawned,
            duration: this.waveEndTime - this.waveStartTime,
            perfect: this.enemiesKilled === this.enemiesSpawned
        };
        
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
            waveStartTime: this.waveStartTime
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
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelManager;
} else {
    window.LevelManager = LevelManager;
}