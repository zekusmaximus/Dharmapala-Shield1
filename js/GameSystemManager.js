class GameSystemManager {
    constructor() {
        this.systems = new Map();
        this.initializationComplete = false;
        this.initialized = {
            config: false,
            audio: false,
            save: false,
            level: false,
            pathGenerator: false,
            achievements: false
        };
    }

    async initialize() {
        console.log('[GameSystemManager] Starting system initialization...');
        
        try {
            // Initialize core systems in sequence with error handling
            await this.initializeConfig();
            await this.initializePathGenerator();
            await this.initializeAudio();
            await this.initializeSaveSystem();
            await this.initializeLevelManager();
            await this.initializeAchievements();
            
            this.initializationComplete = true;
            console.log('[GameSystemManager] All systems initialized successfully');
            
            return {
                success: true,
                systems: this.systems
            };
            
        } catch (error) {
            console.error('[GameSystemManager] System initialization failed:', error);
            return {
                success: false,
                error: error.message,
                systems: this.systems
            };
        }
    }

    async initializeConfig() {
        try {
            if (typeof CONFIG === 'undefined') {
                throw new Error('CONFIG object not available');
            }
            
            // Validate required CONFIG properties
            const requiredProps = ['CANVAS_WIDTH', 'CANVAS_HEIGHT', 'GRID_SIZE', 
                                 'INITIAL_DHARMA', 'INITIAL_BANDWIDTH', 'INITIAL_ANONYMITY'];
            const missingProps = requiredProps.filter(prop => CONFIG[prop] === undefined);
            
            if (missingProps.length > 0) {
                console.warn(`CONFIG missing properties: ${missingProps.join(', ')}`);
            }
            
            this.systems.set('config', CONFIG);
            this.initialized.config = true;
            console.log('[GameSystemManager] CONFIG initialized');
            
        } catch (error) {
            console.error('[GameSystemManager] CONFIG initialization failed:', error);
            throw error;
        }
    }

    async initializePathGenerator() {
        try {
            if (typeof PathGenerator === 'undefined') {
                console.warn('[GameSystemManager] PathGenerator not available, using fallback');
                this.systems.set('pathGenerator', null);
                return;
            }
            
            const config = this.systems.get('config');
            const pathGenerator = new PathGenerator(
                config?.CANVAS_WIDTH || 800,
                config?.CANVAS_HEIGHT || 600,
                config?.GRID_SIZE || 32
            );
            
            this.systems.set('pathGenerator', pathGenerator);
            this.initialized.pathGenerator = true;
            console.log('[GameSystemManager] PathGenerator initialized');
            
        } catch (error) {
            console.warn('[GameSystemManager] PathGenerator initialization failed:', error);
            this.systems.set('pathGenerator', null);
        }
    }

    async initializeAudio() {
        try {
            let audioManager = window.audioManager;
            
            if (!audioManager) {
                console.warn('[GameSystemManager] AudioManager not available');
                this.systems.set('audio', null);
                return;
            }
            
            // Validate audio manager interface
            if (typeof audioManager.playSound !== 'function') {
                console.warn('[GameSystemManager] AudioManager missing required methods');
                audioManager = null;
            }
            
            this.systems.set('audio', audioManager);
            this.initialized.audio = true;
            console.log('[GameSystemManager] AudioManager initialized');
            
        } catch (error) {
            console.warn('[GameSystemManager] AudioManager initialization failed:', error);
            this.systems.set('audio', null);
        }
    }

    async initializeSaveSystem() {
        try {
            let saveSystem = window.saveSystem;
            
            if (!saveSystem) {
                console.warn('[GameSystemManager] SaveSystem not available');
                this.systems.set('save', null);
                return;
            }
            
            // Validate save system interface
            if (typeof saveSystem.save !== 'function' || typeof saveSystem.load !== 'function') {
                console.warn('[GameSystemManager] SaveSystem missing required methods');
                saveSystem = null;
            } else {
                // Initialize save system settings
                saveSystem.migrateOldSaves();
            }
            
            this.systems.set('save', saveSystem);
            this.initialized.save = true;
            console.log('[GameSystemManager] SaveSystem initialized');
            
        } catch (error) {
            console.warn('[GameSystemManager] SaveSystem initialization failed:', error);
            this.systems.set('save', null);
        }
    }

    async initializeLevelManager() {
        try {
            let levelManager = window.levelManager;
            
            if (!levelManager && window.LevelManager) {
                levelManager = new LevelManager();
            }
            
            if (!levelManager) {
                throw new Error('LevelManager not available');
            }
            
            // Connect path generator to level manager
            const pathGenerator = this.systems.get('pathGenerator');
            if (pathGenerator) {
                levelManager.setPathGenerator(pathGenerator);
            }
            
            this.systems.set('level', levelManager);
            this.initialized.level = true;
            console.log('[GameSystemManager] LevelManager initialized');
            
        } catch (error) {
            console.error('[GameSystemManager] LevelManager initialization failed:', error);
            throw error;
        }
    }

    async initializeAchievements() {
        try {
            if (typeof AchievementManager === 'undefined') {
                console.warn('[GameSystemManager] AchievementManager not available');
                this.systems.set('achievements', null);
                return;
            }
            
            const saveSystem = this.systems.get('save');
            const audioManager = this.systems.get('audio');
            
            const achievementManager = new AchievementManager(saveSystem, audioManager);
            
            this.systems.set('achievements', achievementManager);
            this.initialized.achievements = true;
            console.log('[GameSystemManager] AchievementManager initialized');
            
        } catch (error) {
            console.warn('[GameSystemManager] AchievementManager initialization failed:', error);
            this.systems.set('achievements', null);
        }
    }

    getSystem(name) {
        return this.systems.get(name);
    }

    hasSystem(name) {
        return this.systems.has(name) && this.systems.get(name) !== null;
    }

    isInitialized(systemName = null) {
        if (systemName) {
            return this.initialized[systemName] || false;
        }
        return this.initializationComplete;
    }

    getInitializationStatus() {
        return {
            complete: this.initializationComplete,
            systems: { ...this.initialized },
            availableSystems: Array.from(this.systems.keys())
        };
    }

    // Helper methods for commonly accessed systems
    getConfig() {
        return this.getSystem('config');
    }

    getAudioManager() {
        return this.getSystem('audio');
    }

    getSaveSystem() {
        return this.getSystem('save');
    }

    getLevelManager() {
        return this.getSystem('level');
    }

    getPathGenerator() {
        return this.getSystem('pathGenerator');
    }

    getAchievementManager() {
        return this.getSystem('achievements');
    }

    // Simplified system validation without over-engineering
    validateCriticalSystems() {
        const critical = ['config', 'level'];
        const missing = critical.filter(system => !this.hasSystem(system));
        
        if (missing.length > 0) {
            throw new Error(`Critical systems missing: ${missing.join(', ')}`);
        }
        
        return true;
    }

    // Clean shutdown of all systems
    shutdown() {
        console.log('[GameSystemManager] Shutting down systems...');
        
        try {
            // Shutdown systems in reverse order
            const audioManager = this.getSystem('audio');
            if (audioManager && audioManager.stopAllSounds) {
                audioManager.stopAllSounds();
                audioManager.stopMusic();
            }
            
            // Clear particle system
            if (window.particleSystem) {
                window.particleSystem.clear();
            }
            
            // Clear projectile pool
            if (window.projectilePool) {
                window.projectilePool.clear();
            }
            
            this.systems.clear();
            this.initializationComplete = false;
            
            for (const key in this.initialized) {
                this.initialized[key] = false;
            }
            
            console.log('[GameSystemManager] Systems shutdown complete');
            
        } catch (error) {
            console.error('[GameSystemManager] Error during shutdown:', error);
        }
    }

    // Get system stats for debugging
    getSystemStats() {
        const stats = {
            initialized: this.isInitialized(),
            systemCount: this.systems.size,
            systems: {}
        };
        
        for (const [name, system] of this.systems) {
            stats.systems[name] = {
                available: system !== null,
                type: system ? system.constructor.name : 'null'
            };
        }
        
        return stats;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameSystemManager;
} else {
    window.GameSystemManager = GameSystemManager;
}