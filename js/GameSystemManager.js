import PathGenerator from './pathGenerator.js';

export default class GameSystemManager {
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
        try {
            await this.initializeConfig();
            await this.initializePathGenerator();
            await this.initializeAudio();
            await this.initializeSaveSystem();
            await this.initializeLevelManager();
            await this.initializeAchievements();
            this.initializationComplete = true;
            return { success: true, systems: this.systems };
        } catch (error) {
            return { success: false, error: error.message, systems: this.systems };
        }
    }

    async initializeConfig() {
        if (typeof window.CONFIG === 'undefined') throw new Error('CONFIG object not available');
        this.systems.set('config', window.CONFIG);
        this.initialized.config = true;
    }

    async initializePathGenerator() {
        const config = this.systems.get('config') || {};
        const pathGenerator = new PathGenerator(
            config.CANVAS_WIDTH || 800,
            config.CANVAS_HEIGHT || 600,
            config.GRID_SIZE || 32
        );
        this.systems.set('pathGenerator', pathGenerator);
        this.initialized.pathGenerator = true;
    }

    async initializeAudio() {
        const audioManager = window.audioManager || null;
        this.systems.set('audio', audioManager);
        this.initialized.audio = !!audioManager;
    }

    async initializeSaveSystem() {
        const saveSystem = window.saveSystem || null;
        this.systems.set('save', saveSystem);
        this.initialized.save = !!saveSystem;
    }

    async initializeLevelManager() {
        const levelManager = window.levelManager || (window.LevelManager ? new window.LevelManager() : null);
        if (!levelManager) throw new Error('LevelManager not available');
        const pathGenerator = this.systems.get('pathGenerator');
        if (pathGenerator && levelManager.setPathGenerator) levelManager.setPathGenerator(pathGenerator);
        this.systems.set('level', levelManager);
        this.initialized.level = true;
    }

    async initializeAchievements() {
        const achievementManager = window.achievementManager || (window.AchievementManager ? new window.AchievementManager() : null);
        this.systems.set('achievements', achievementManager);
        this.initialized.achievements = !!achievementManager;
    }

    getLevelManager() { return this.systems.get('level') || null; }
    getAchievementManager() { return this.systems.get('achievements') || null; }
}