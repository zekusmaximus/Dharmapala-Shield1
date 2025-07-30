class SaveSystem {
    constructor() {
        this.saveSlots = 3;
        this.currentSlot = 0;
        this.gameId = 'dharmapala_shield';
        this.version = '1.0.0';
        
        this.defaultSaveData = {
            version: this.version,
            timestamp: 0,
            playerName: 'Player',
            level: 1,
            wave: 1,
            resources: {
                dharma: 100,
                bandwidth: 50,
                anonymity: 75
            },
            unlockedDefenses: ['basic_firewall'],
            achievements: [],
            settings: {
                masterVolume: 1.0,
                musicVolume: 0.7,
                sfxVolume: 0.8,
                audioEnabled: true,
                screenFlash: true,
                reduceMotion: false
            },
            statistics: {
                totalPlayTime: 0,
                enemiesDefeated: 0,
                defensesPurchased: 0,
                wavesCompleted: 0,
                levelsCompleted: 0,
                totalDharmaEarned: 0
            },
            progress: {
                highestLevel: 1,
                highestWave: 1,
                tutorialCompleted: false
            }
        };
        
        this.callbacks = {
            onSaveSuccess: null,
            onSaveError: null,
            onLoadSuccess: null,
            onLoadError: null
        };
        
        this.validateStorage();
    }

    validateStorage() {
        try {
            const testKey = `${this.gameId}_test`;
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('localStorage not available:', error);
            return false;
        }
    }

    generateSaveKey(slot) {
        return `${this.gameId}_save_${slot}`;
    }

    save(data, slot = this.currentSlot) {
        try {
            if (slot < 0 || slot >= this.saveSlots) {
                throw new Error(`Invalid save slot: ${slot}`);
            }

            const saveData = this.prepareSaveData(data);
            const key = this.generateSaveKey(slot);
            
            localStorage.setItem(key, JSON.stringify(saveData));
            
            this.triggerCallback('onSaveSuccess', { slot, data: saveData });
            console.log(`Game saved to slot ${slot}`);
            return true;
            
        } catch (error) {
            console.error('Save failed:', error);
            this.triggerCallback('onSaveError', { slot, error });
            return false;
        }
    }

    load(slot = this.currentSlot) {
        try {
            if (slot < 0 || slot >= this.saveSlots) {
                throw new Error(`Invalid save slot: ${slot}`);
            }

            const key = this.generateSaveKey(slot);
            const savedData = localStorage.getItem(key);
            
            if (!savedData) {
                console.warn(`No save data found in slot ${slot}`);
                return null;
            }

            const parsedData = JSON.parse(savedData);
            const validatedData = this.validateSaveData(parsedData);
            
            this.currentSlot = slot;
            this.triggerCallback('onLoadSuccess', { slot, data: validatedData });
            console.log(`Game loaded from slot ${slot}`);
            return validatedData;
            
        } catch (error) {
            console.error('Load failed:', error);
            this.triggerCallback('onLoadError', { slot, error });
            return null;
        }
    }

    prepareSaveData(data) {
        const saveData = Utils.game.deepClone(this.defaultSaveData);
        
        saveData.timestamp = Date.now();
        saveData.version = this.version;
        
        if (data) {
            Object.assign(saveData, data);
            
            if (data.resources) Object.assign(saveData.resources, data.resources);
            if (data.settings) Object.assign(saveData.settings, data.settings);
            if (data.statistics) Object.assign(saveData.statistics, data.statistics);
            if (data.progress) Object.assign(saveData.progress, data.progress);
        }
        
        return saveData;
    }

    validateSaveData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid save data format');
        }

        const validated = Utils.game.deepClone(this.defaultSaveData);
        
        if (data.version && data.version !== this.version) {
            console.warn(`Save version mismatch: ${data.version} vs ${this.version}`);
            validated.version = this.version;
        }

        if (Utils.validation.isString(data.playerName)) {
            validated.playerName = data.playerName;
        }

        if (Utils.validation.isPositiveNumber(data.level)) {
            validated.level = data.level;
        }

        if (Utils.validation.isPositiveNumber(data.wave)) {
            validated.wave = data.wave;
        }

        if (data.resources && Utils.validation.isObject(data.resources)) {
            Object.assign(validated.resources, data.resources);
        }

        if (Utils.validation.isArray(data.unlockedDefenses)) {
            validated.unlockedDefenses = data.unlockedDefenses.filter(Utils.validation.isString);
        }

        if (Utils.validation.isArray(data.achievements)) {
            validated.achievements = data.achievements.filter(Utils.validation.isString);
        }

        if (data.settings && Utils.validation.isObject(data.settings)) {
            Object.assign(validated.settings, data.settings);
        }

        if (data.statistics && Utils.validation.isObject(data.statistics)) {
            Object.assign(validated.statistics, data.statistics);
        }

        if (data.progress && Utils.validation.isObject(data.progress)) {
            Object.assign(validated.progress, data.progress);
        }

        return validated;
    }

    // Key-value storage methods for AchievementManager compatibility
    get(key, defaultValue = null) {
        try {
            const prefixedKey = `game_data_${key}`;
            const storedData = localStorage.getItem(prefixedKey);
            
            if (storedData === null) {
                return defaultValue;
            }
            
            return JSON.parse(storedData);
        } catch (error) {
            console.warn(`Failed to get key '${key}' from storage:`, error);
            return defaultValue;
        }
    }

    set(key, value) {
        try {
            const prefixedKey = `game_data_${key}`;
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(prefixedKey, serializedValue);
            return true;
        } catch (error) {
            console.error(`Failed to set key '${key}' in storage:`, error);
            return false;
        }
    }

    deleteSave(slot) {
        try {
            if (slot < 0 || slot >= this.saveSlots) {
                throw new Error(`Invalid save slot: ${slot}`);
            }

            const key = this.generateSaveKey(slot);
            localStorage.removeItem(key);
            console.log(`Save slot ${slot} deleted`);
            return true;
            
        } catch (error) {
            console.error('Delete save failed:', error);
            return false;
        }
    }

    getSaveInfo(slot) {
        try {
            const key = this.generateSaveKey(slot);
            const savedData = localStorage.getItem(key);
            
            if (!savedData) {
                return null;
            }

            const data = JSON.parse(savedData);
            return {
                slot: slot,
                playerName: data.playerName || 'Unknown',
                level: data.level || 1,
                wave: data.wave || 1,
                timestamp: data.timestamp || 0,
                version: data.version || 'Unknown',
                playtime: data.statistics?.totalPlayTime || 0
            };
            
        } catch (error) {
            console.error(`Failed to get save info for slot ${slot}:`, error);
            return null;
        }
    }

    getAllSaveInfo() {
        const saves = [];
        
        for (let i = 0; i < this.saveSlots; i++) {
            const info = this.getSaveInfo(i);
            saves.push(info);
        }
        
        return saves;
    }

    hasSave(slot) {
        return this.getSaveInfo(slot) !== null;
    }

    getMostRecentSave() {
        let mostRecent = null;
        let latestTimestamp = 0;
        
        for (let i = 0; i < this.saveSlots; i++) {
            const info = this.getSaveInfo(i);
            if (info && info.timestamp > latestTimestamp) {
                latestTimestamp = info.timestamp;
                mostRecent = i;
            }
        }
        
        return mostRecent;
    }

    quickSave(data) {
        return this.save(data, this.currentSlot);
    }

    quickLoad() {
        return this.load(this.currentSlot);
    }

    autoSave(data) {
        const autoSaveSlot = this.saveSlots - 1;
        return this.save(data, autoSaveSlot);
    }

    exportSave(slot) {
        try {
            const key = this.generateSaveKey(slot);
            const saveData = localStorage.getItem(key);
            
            if (!saveData) {
                throw new Error(`No save data in slot ${slot}`);
            }

            const exportData = {
                gameId: this.gameId,
                exportVersion: this.version,
                exportTimestamp: Date.now(),
                saveData: JSON.parse(saveData)
            };

            return JSON.stringify(exportData, null, 2);
            
        } catch (error) {
            console.error('Export failed:', error);
            return null;
        }
    }

    importSave(importString, slot) {
        try {
            const importData = JSON.parse(importString);
            
            if (importData.gameId !== this.gameId) {
                throw new Error('Save file is for a different game');
            }

            const validatedData = this.validateSaveData(importData.saveData);
            return this.save(validatedData, slot);
            
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }

    clearAllSaves() {
        try {
            for (let i = 0; i < this.saveSlots; i++) {
                this.deleteSave(i);
            }
            console.log('All saves cleared');
            return true;
            
        } catch (error) {
            console.error('Clear all saves failed:', error);
            return false;
        }
    }

    migrateOldSaves() {
        try {
            const oldKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.gameId) && !key.includes('_save_')) {
                    oldKeys.push(key);
                }
            }

            for (const oldKey of oldKeys) {
                const oldData = localStorage.getItem(oldKey);
                if (oldData) {
                    const parsedData = JSON.parse(oldData);
                    const slot = oldKeys.indexOf(oldKey);
                    if (slot < this.saveSlots) {
                        this.save(parsedData, slot);
                    }
                    localStorage.removeItem(oldKey);
                }
            }

            if (oldKeys.length > 0) {
                console.log(`Migrated ${oldKeys.length} old saves`);
            }
            
        } catch (error) {
            console.error('Save migration failed:', error);
        }
    }

    setCallbacks(callbacks) {
        Object.assign(this.callbacks, callbacks);
    }

    triggerCallback(event, data) {
        if (this.callbacks[event] && typeof this.callbacks[event] === 'function') {
            try {
                this.callbacks[event](data);
            } catch (error) {
                console.error(`Error in save system callback ${event}:`, error);
            }
        }
    }

    getCurrentSlot() {
        return this.currentSlot;
    }

    setCurrentSlot(slot) {
        if (slot >= 0 && slot < this.saveSlots) {
            this.currentSlot = slot;
            return true;
        }
        return false;
    }

    getStorageUsage() {
        try {
            let totalSize = 0;
            for (let i = 0; i < this.saveSlots; i++) {
                const key = this.generateSaveKey(i);
                const data = localStorage.getItem(key);
                if (data) {
                    totalSize += data.length;
                }
            }
            return totalSize;
        } catch (error) {
            console.error('Failed to calculate storage usage:', error);
            return 0;
        }
    }
}

const saveSystem = new SaveSystem();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SaveSystem;
} else {
    window.SaveSystem = SaveSystem;
    window.saveSystem = saveSystem;
}