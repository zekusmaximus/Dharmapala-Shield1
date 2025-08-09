import Utils from './utils.js';

class AchievementManager {
    constructor(saveSystem = null, audioManager = null) {
        this.saveSystem = saveSystem;
        this.audioManager = audioManager;
        
        // Achievement storage
        this.achievements = new Map();
        this.unlockedAchievements = new Set();
        this.achievementProgress = new Map();
        
        // Event tracking
        this.eventQueue = [];
        this.eventStats = new Map();
        
        // Simple deduplication
        this.recentEvents = new Map();
        this.deduplicationWindow = 1000; // 1 second
        
        // Notification system
        this.notifications = [];
        this.notificationCallbacks = [];
        
        this.initializeAchievements();
        this.loadProgress();
        this.startEventProcessor();
    }

    initializeAchievements() {
        // Define all achievements
        const achievementList = [
            {
                id: 'first_kill',
                name: 'Digital Guardian',
                description: 'Eliminate your first digital threat',
                category: 'combat',
                requirements: { enemy_killed: 1 },
                reward: { dharma: 25 },
                icon: '🛡️'
            },
            {
                id: 'wave_master',
                name: 'Wave Master',
                description: 'Complete 10 waves without losing a life',
                category: 'survival',
                requirements: { waves_completed: 10, lives_lost: 0 },
                reward: { dharma: 100, bandwidth: 25 },
                icon: '🌊'
            },
            {
                id: 'defense_builder',
                name: 'Cyber Architect',
                description: 'Place 50 defense towers',
                category: 'building',
                requirements: { defenses_placed: 50 },
                reward: { dharma: 75, anonymity: 25 },
                icon: '🏗️'
            },
            {
                id: 'boss_slayer',
                name: 'Boss Vanquisher',
                description: 'Defeat your first boss',
                category: 'combat',
                requirements: { bosses_defeated: 1 },
                reward: { dharma: 200, bandwidth: 50, anonymity: 50 },
                icon: '👑'
            },
            {
                id: 'upgrade_master',
                name: 'Enhancement Expert',
                description: 'Upgrade defenses 25 times',
                category: 'building',
                requirements: { defenses_upgraded: 25 },
                reward: { dharma: 150 },
                icon: '⚡'
            },
            {
                id: 'perfect_wave',
                name: 'Flawless Victory',
                description: 'Complete a wave without taking damage',
                category: 'survival',
                requirements: { perfect_waves: 1 },
                reward: { dharma: 50, bandwidth: 10 },
                icon: '💎'
            },
            {
                id: 'dharma_collector',
                name: 'Dharma Millionaire',
                description: 'Earn 1,000,000 total dharma',
                category: 'resource',
                requirements: { dharma_earned: 1000000 },
                reward: { bandwidth: 100, anonymity: 100 },
                icon: '💰'
            },
            {
                id: 'speed_demon',
                name: 'Lightning Fast',
                description: 'Complete a level in under 5 minutes',
                category: 'speed',
                requirements: { fast_level_completion: 1 },
                reward: { dharma: 75, bandwidth: 25 },
                icon: '⚡'
            },
            {
                id: 'meditation_master',
                name: 'Inner Peace',
                description: 'Reach level 10 without using pause',
                category: 'skill',
                requirements: { level_reached: 10, pause_used: 0 },
                reward: { anonymity: 200 },
                icon: '🧘'
            },
            {
                id: 'diversity_champion',
                name: 'Strategic Diversity',
                description: 'Use all 6 defense types in a single level',
                category: 'strategy',
                requirements: { defense_types_used: 6 },
                reward: { dharma: 100, bandwidth: 50, anonymity: 50 },
                icon: '🎯'
            }
        ];
        
        // Initialize achievements
        achievementList.forEach(achievement => {
            this.achievements.set(achievement.id, achievement);
            this.achievementProgress.set(achievement.id, {});
        });
    }

    loadProgress() {
        if (!this.saveSystem) return;
        
        try {
            const saveData = this.saveSystem.get('achievements', {});
            
            if (saveData.unlocked) {
                this.unlockedAchievements = new Set(saveData.unlocked);
            }
            
            if (saveData.progress) {
                for (const [id, progress] of Object.entries(saveData.progress)) {
                    this.achievementProgress.set(id, progress);
                }
            }
            
            if (saveData.stats) {
                for (const [event, count] of Object.entries(saveData.stats)) {
                    this.eventStats.set(event, count);
                }
            }
            
            console.log(`[AchievementManager] Loaded ${this.unlockedAchievements.size} unlocked achievements`);
            
        } catch (error) {
            console.error('[AchievementManager] Error loading progress:', error);
        }
    }

    saveProgress() {
        if (!this.saveSystem) return;
        
        try {
            const saveData = {
                unlocked: Array.from(this.unlockedAchievements),
                progress: Object.fromEntries(this.achievementProgress),
                stats: Object.fromEntries(this.eventStats),
                lastSaved: Date.now()
            };
            
            this.saveSystem.set('achievements', saveData);
            
        } catch (error) {
            console.error('[AchievementManager] Error saving progress:', error);
        }
    }

    startEventProcessor() {
        // Simple event processing every 100ms
        setInterval(() => {
            this.processEventQueue();
            this.cleanupRecentEvents();
        }, 100);
        
        // Save progress every 30 seconds
        setInterval(() => {
            this.saveProgress();
        }, 30000);
    }

    trackEvent(eventType, data = {}) {
        const timestamp = Utils.performance.now();
        
        // Simple deduplication
        const eventKey = `${eventType}_${JSON.stringify(data)}`;
        const lastEvent = this.recentEvents.get(eventKey);
        
        if (lastEvent && (timestamp - lastEvent) < this.deduplicationWindow) {
            return; // Skip duplicate event
        }
        
        this.recentEvents.set(eventKey, timestamp);
        
        // Add to event queue
        this.eventQueue.push({
            type: eventType,
            data: data,
            timestamp: timestamp
        });
        
        // Update event statistics
        const currentCount = this.eventStats.get(eventType) || 0;
        this.eventStats.set(eventType, currentCount + 1);
    }

    processEventQueue() {
        if (this.eventQueue.length === 0) return;
        
        // Process all queued events
        const eventsToProcess = [...this.eventQueue];
        this.eventQueue.length = 0;
        
        eventsToProcess.forEach(event => {
            this.processEvent(event);
        });
    }

    processEvent(event) {
        // Check all achievements for progress updates
        for (const [achievementId, achievement] of this.achievements) {
            if (this.unlockedAchievements.has(achievementId)) {
                continue; // Already unlocked
            }
            
            this.updateAchievementProgress(achievementId, achievement, event);
        }
    }

    updateAchievementProgress(achievementId, achievement, event) {
        const progress = this.achievementProgress.get(achievementId);
        let updated = false;
        
        // Update progress based on event
        for (const [requirement, targetValue] of Object.entries(achievement.requirements)) {
            if (this.shouldUpdateRequirement(requirement, event)) {
                const currentValue = progress[requirement] || 0;
                const increment = this.calculateIncrement(requirement, event);
                const newValue = currentValue + increment;
                
                progress[requirement] = newValue;
                updated = true;
                
                // Check if requirement is now met
                if (newValue >= targetValue) {
                    console.log(`[Achievement] Requirement ${requirement} completed for ${achievementId}`);
                }
            }
        }
        
        if (updated) {
            this.achievementProgress.set(achievementId, progress);
            this.checkAchievementCompletion(achievementId, achievement);
        }
    }

    shouldUpdateRequirement(requirement, event) {
        const eventMappings = {
            'enemy_killed': ['enemy_killed'],
            'waves_completed': ['wave_completed'],
            'lives_lost': ['life_lost'],
            'defenses_placed': ['defense_placed'],
            'bosses_defeated': ['boss_defeated'],
            'defenses_upgraded': ['defense_upgraded'],
            'perfect_waves': ['perfect_wave'],
            'dharma_earned': ['dharma_earned', 'enemy_killed'],
            'fast_level_completion': ['level_completed'],
            'level_reached': ['level_completed'],
            'pause_used': ['game_paused'],
            'defense_types_used': ['defense_placed']
        };
        
        const relevantEvents = eventMappings[requirement] || [];
        return relevantEvents.includes(event.type);
    }

    calculateIncrement(requirement, event) {
        switch (requirement) {
            case 'dharma_earned':
                if (event.type === 'dharma_earned') {
                    return event.data.amount || 0;
                } else if (event.type === 'enemy_killed') {
                    return event.data.reward?.dharma || 10;
                }
                break;
            
            case 'defense_types_used':
                // Track unique defense types used
                const progress = this.achievementProgress.get('diversity_champion');
                if (!progress.usedTypes) progress.usedTypes = new Set();
                if (event.data.type) {
                    progress.usedTypes.add(event.data.type);
                    return progress.usedTypes.size;
                }
                break;
            
            default:
                return 1; // Most requirements increment by 1
        }
        
        return 1;
    }

    checkAchievementCompletion(achievementId, achievement) {
        const progress = this.achievementProgress.get(achievementId);
        
        // Check if all requirements are met
        let allRequirementsMet = true;
        for (const [requirement, targetValue] of Object.entries(achievement.requirements)) {
            const currentValue = progress[requirement] || 0;
            if (currentValue < targetValue) {
                allRequirementsMet = false;
                break;
            }
        }
        
        if (allRequirementsMet) {
            this.unlockAchievement(achievementId);
        }
    }

    unlockAchievement(achievementId) {
        if (this.unlockedAchievements.has(achievementId)) {
            return; // Already unlocked
        }
        
        const achievement = this.achievements.get(achievementId);
        if (!achievement) return;
        
        this.unlockedAchievements.add(achievementId);
        
        console.log(`[Achievement] Unlocked: ${achievement.name}`);
        
        // Award rewards
        if (achievement.reward && window.game) {
            window.game.addResources(achievement.reward);
        }
        
        // Show notification
        this.showAchievementNotification(achievement);
        
        // Play sound
        if (this.audioManager) {
            this.audioManager.playSound('achievement_unlocked', 0.8);
        }
        
        // Save progress immediately
        this.saveProgress();
        
        // Trigger callbacks
        this.notificationCallbacks.forEach(callback => {
            try {
                callback(achievement);
            } catch (error) {
                console.error('[AchievementManager] Error in notification callback:', error);
            }
        });
    }

    showAchievementNotification(achievement) {
        const notification = {
            id: Utils.game.generateId(),
            achievement: achievement,
            timestamp: Utils.performance.now(),
            duration: 5000
        };
        
        this.notifications.push(notification);
        
        // Show in UI
        if (window.uiManager) {
            window.uiManager.showAchievementUnlocked(achievement);
        }
        
        // Auto-remove after duration
        setTimeout(() => {
            this.removeNotification(notification.id);
        }, notification.duration);
    }

    removeNotification(notificationId) {
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index > -1) {
            this.notifications.splice(index, 1);
        }
    }

    cleanupRecentEvents() {
        const now = Utils.performance.now();
        const cutoff = now - this.deduplicationWindow;
        
        for (const [key, timestamp] of this.recentEvents) {
            if (timestamp < cutoff) {
                this.recentEvents.delete(key);
            }
        }
    }

    // Public API methods
    getAchievement(id) {
        return this.achievements.get(id);
    }

    getAllAchievements() {
        return Array.from(this.achievements.values());
    }

    getUnlockedAchievements() {
        return Array.from(this.unlockedAchievements).map(id => this.achievements.get(id));
    }

    getAchievementsByCategory(category) {
        return this.getAllAchievements().filter(achievement => achievement.category === category);
    }

    getAchievementProgress(id) {
        const achievement = this.achievements.get(id);
        const progress = this.achievementProgress.get(id);
        
        if (!achievement || !progress) return null;
        
        const result = {
            id: id,
            name: achievement.name,
            description: achievement.description,
            category: achievement.category,
            unlocked: this.unlockedAchievements.has(id),
            requirements: {}
        };
        
        // Calculate progress for each requirement
        for (const [requirement, targetValue] of Object.entries(achievement.requirements)) {
            const currentValue = progress[requirement] || 0;
            result.requirements[requirement] = {
                current: currentValue,
                target: targetValue,
                completed: currentValue >= targetValue,
                percentage: Math.min(100, (currentValue / targetValue) * 100)
            };
        }
        
        return result;
    }

    getCompletionStats() {
        const total = this.achievements.size;
        const unlocked = this.unlockedAchievements.size;
        const categories = {};
        
        // Calculate category stats
        for (const achievement of this.achievements.values()) {
            if (!categories[achievement.category]) {
                categories[achievement.category] = { total: 0, unlocked: 0 };
            }
            
            categories[achievement.category].total++;
            if (this.unlockedAchievements.has(achievement.id)) {
                categories[achievement.category].unlocked++;
            }
        }
        
        return {
            total: total,
            unlocked: unlocked,
            percentage: total > 0 ? (unlocked / total) * 100 : 0,
            categories: categories
        };
    }

    getEventStats() {
        return Object.fromEntries(this.eventStats);
    }

    // Event tracking helpers for common game events
    trackKill(enemyType, reward) {
        this.trackEvent('enemy_killed', { type: enemyType, reward });
    }

    trackWaveComplete(waveNumber, perfect = false) {
        this.trackEvent('wave_completed', { wave: waveNumber });
        if (perfect) {
            this.trackEvent('perfect_wave', { wave: waveNumber });
        }
    }

    trackDefensePlaced(defenseType, cost) {
        this.trackEvent('defense_placed', { type: defenseType, cost });
    }

    trackDefenseUpgraded(defenseType, level) {
        this.trackEvent('defense_upgraded', { type: defenseType, level });
    }

    trackBossDefeated(bossType, phase) {
        this.trackEvent('boss_defeated', { type: bossType, phase });
    }

    trackLevelComplete(level, duration) {
        this.trackEvent('level_completed', { level, duration });
        
        // Check for fast completion (under 5 minutes)
        if (duration < 300000) { // 5 minutes in milliseconds
            this.trackEvent('fast_level_completion', { level, duration });
        }
    }

    trackResourceEarned(type, amount) {
        this.trackEvent(`${type}_earned`, { amount });
    }

    trackLifeLost() {
        this.trackEvent('life_lost');
    }

    trackGamePaused() {
        this.trackEvent('game_paused');
    }

    // Callback management
    onAchievementUnlocked(callback) {
        this.notificationCallbacks.push(callback);
    }

    removeCallback(callback) {
        const index = this.notificationCallbacks.indexOf(callback);
        if (index > -1) {
            this.notificationCallbacks.splice(index, 1);
        }
    }

    // Admin/debug methods
    unlockAllAchievements() {
        console.log('[AchievementManager] Unlocking all achievements (debug)');
        
        for (const achievementId of this.achievements.keys()) {
            if (!this.unlockedAchievements.has(achievementId)) {
                this.unlockAchievement(achievementId);
            }
        }
    }

    resetAllProgress() {
        console.log('[AchievementManager] Resetting all progress (debug)');
        
        this.unlockedAchievements.clear();
        this.achievementProgress.clear();
        this.eventStats.clear();
        
        // Reinitialize
        this.initializeAchievements();
        this.saveProgress();
    }

    getDebugInfo() {
        return {
            totalAchievements: this.achievements.size,
            unlockedAchievements: this.unlockedAchievements.size,
            eventQueueSize: this.eventQueue.length,
            recentEventsSize: this.recentEvents.size,
            activeNotifications: this.notifications.length,
            eventStats: Object.fromEntries(this.eventStats)
        };
    }

    destroy() {
        // Save final progress
        this.saveProgress();
        
        // Clear data
        this.eventQueue.length = 0;
        this.notifications.length = 0;
        this.notificationCallbacks.length = 0;
        this.recentEvents.clear();
        
        console.log('[AchievementManager] Destroyed');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AchievementManager;
} else {
    window.AchievementManager = AchievementManager;
}