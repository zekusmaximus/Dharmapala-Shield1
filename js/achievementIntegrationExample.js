// Enhanced Game Integration Example for Concurrent Achievement Handling
// This file demonstrates how to integrate concurrent achievement monitoring into the main game

/**
 * Integration Example: Adding Concurrent Achievement Monitoring to the Game Class
 * 
 * This example shows how to enhance the existing game with real-time monitoring
 * of the concurrent achievement system for debugging and performance optimization.
 */

class GameWithConcurrentAchievementMonitoring extends Game {
    constructor(canvas, saveSystem, audioManager) {
        super(canvas, saveSystem, audioManager);
        
        // Initialize concurrent monitoring
        this.achievementMonitoring = {
            enabled: false,
            stats: {},
            intervals: {},
            performanceHistory: []
        };
        
        // Start monitoring if in development mode
        if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
            this.enableAchievementMonitoring();
        }
    }

    /**
     * Enable real-time achievement system monitoring
     */
    enableAchievementMonitoring() {
        if (this.achievementMonitoring.enabled) return;
        
        this.achievementMonitoring.enabled = true;
        console.log('[Game] Concurrent achievement monitoring enabled');
        
        // Monitor system stats every 5 seconds
        this.achievementMonitoring.intervals.stats = setInterval(() => {
            this.updateAchievementStats();
        }, 5000);
        
        // Monitor performance every 30 seconds
        this.achievementMonitoring.intervals.performance = setInterval(() => {
            this.logPerformanceMetrics();
        }, 30000);
        
        // Monitor for memory pressure every 10 seconds
        this.achievementMonitoring.intervals.memory = setInterval(() => {
            this.checkMemoryPressure();
        }, 10000);
    }

    /**
     * Disable achievement monitoring
     */
    disableAchievementMonitoring() {
        if (!this.achievementMonitoring.enabled) return;
        
        this.achievementMonitoring.enabled = false;
        
        // Clear all monitoring intervals
        Object.values(this.achievementMonitoring.intervals).forEach(interval => {
            if (interval) clearInterval(interval);
        });
        
        this.achievementMonitoring.intervals = {};
        console.log('[Game] Concurrent achievement monitoring disabled');
    }

    /**
     * Update achievement system statistics
     */
    updateAchievementStats() {
        if (!this.achievementManager) return;
        
        try {
            const stats = this.achievementManager.getConcurrentSystemStats();
            const metrics = this.achievementManager.getEventProcessingMetrics();
            
            this.achievementMonitoring.stats = {
                ...stats,
                timestamp: Date.now(),
                queuedEventTypes: this.getQueuedEventTypes(metrics),
                systemHealth: this.evaluateSystemHealth(stats, metrics)
            };
            
            // Log significant changes
            if (stats.eventQueueSize > 50) {
                console.warn('[Game] High achievement event queue size:', stats.eventQueueSize);
            }
            
            if (stats.memoryUsage.queue > 100) {
                console.warn('[Game] High memory usage in achievement queue:', stats.memoryUsage);
            }
            
        } catch (error) {
            console.error('[Game] Error updating achievement stats:', error);
        }
    }

    /**
     * Get types of events currently queued
     */
    getQueuedEventTypes(metrics) {
        const eventTypes = new Set();
        
        if (metrics.queuedEvents) {
            metrics.queuedEvents.forEach(event => {
                eventTypes.add(event.type);
            });
        }
        
        return Array.from(eventTypes);
    }

    /**
     * Evaluate overall system health
     */
    evaluateSystemHealth(stats, metrics) {
        const health = {
            status: 'healthy',
            issues: [],
            recommendations: []
        };
        
        // Check queue size
        if (stats.eventQueueSize > 100) {
            health.status = 'warning';
            health.issues.push('High queue size');
            health.recommendations.push('Consider increasing batch size or decreasing batch interval');
        }
        
        // Check memory pressure
        if (stats.memoryUsage.queue > 200 || stats.memoryUsage.deduplicationMap > 50) {
            health.status = 'warning';
            health.issues.push('High memory usage');
            health.recommendations.push('Enable more aggressive cleanup or reduce deduplication window');
        }
        
        // Check processing delays
        if (metrics.queuedEvents && metrics.queuedEvents.some(e => e.age > 1000)) {
            health.status = 'critical';
            health.issues.push('High processing delays');
            health.recommendations.push('Increase processing frequency or batch size');
        }
        
        return health;
    }

    /**
     * Log performance metrics
     */
    logPerformanceMetrics() {
        if (!this.achievementManager) return;
        
        try {
            const stats = this.achievementMonitoring.stats;
            const runtime = (Date.now() - this.gameStartTime) / 1000;
            
            const performance = {
                timestamp: Date.now(),
                runtime: runtime,
                queueSize: stats.eventQueueSize || 0,
                processingRate: stats.processingRate || 0,
                memoryUsage: stats.memoryUsage || {},
                systemHealth: stats.systemHealth || { status: 'unknown' }
            };
            
            this.achievementMonitoring.performanceHistory.push(performance);
            
            // Keep only last 100 entries
            if (this.achievementMonitoring.performanceHistory.length > 100) {
                this.achievementMonitoring.performanceHistory = 
                    this.achievementMonitoring.performanceHistory.slice(-100);
            }
            
            console.log('[Game] Achievement Performance Metrics:', {
                queueSize: performance.queueSize,
                health: performance.systemHealth.status,
                memoryMB: Math.round((performance.memoryUsage.queue || 0) * 100 / 1024) / 100
            });
            
        } catch (error) {
            console.error('[Game] Error logging performance metrics:', error);
        }
    }

    /**
     * Check for memory pressure and take corrective action
     */
    checkMemoryPressure() {
        if (!this.achievementManager) return;
        
        try {
            const stats = this.achievementManager.getConcurrentSystemStats();
            
            // High memory pressure indicators
            const highQueueSize = stats.eventQueueSize > 500;
            const highDeduplicationSize = stats.deduplicationEntriesCount > 100;
            const highLastProcessedSize = stats.lastProcessedEventsCount > 2000;
            
            if (highQueueSize || highDeduplicationSize || highLastProcessedSize) {
                console.warn('[Game] Memory pressure detected, triggering cleanup');
                
                // Force process queue to reduce size
                if (highQueueSize) {
                    this.achievementManager.debugForceProcessQueue();
                }
                
                // Clear old entries if needed
                if (highDeduplicationSize || highLastProcessedSize) {
                    // This would typically trigger internal cleanup
                    console.log('[Game] Recommending achievement system cleanup');
                }
            }
            
        } catch (error) {
            console.error('[Game] Error checking memory pressure:', error);
        }
    }

    /**
     * Enhanced enemy killed tracking with burst detection
     */
    handleEnemyKilled(enemy) {
        // Call the original method
        super.handleEnemyKilled && super.handleEnemyKilled(enemy);
        
        // Track achievement with additional context
        this.trackAchievement('enemy_killed', {
            amount: 1,
            enemyType: enemy.type,
            level: this.currentLevel,
            wave: this.currentWave,
            timestamp: Date.now(),
            // Add burst detection
            burstContext: this.detectEnemyKillBurst()
        });
    }

    /**
     * Detect if we're in a high-frequency enemy kill burst
     */
    detectEnemyKillBurst() {
        const now = Date.now();
        
        if (!this.enemyKillHistory) {
            this.enemyKillHistory = [];
        }
        
        // Add current kill
        this.enemyKillHistory.push(now);
        
        // Keep only last 10 seconds of kills
        this.enemyKillHistory = this.enemyKillHistory.filter(time => (now - time) < 10000);
        
        // Detect burst (more than 10 kills in 2 seconds)
        const recentKills = this.enemyKillHistory.filter(time => (now - time) < 2000);
        const isBurst = recentKills.length > 10;
        
        return {
            isBurst,
            recentKillCount: recentKills.length,
            totalRecentKills: this.enemyKillHistory.length
        };
    }

    /**
     * Enhanced defense placement with concurrent optimization
     */
    placeDefense(x, y, defenseType) {
        const result = super.placeDefense(x, y, defenseType);
        
        if (result.success) {
            // Use optimized tracking for rapid building scenarios
            this.trackAchievementOptimized('defense_placed', {
                amount: 1,
                defenseType: defenseType,
                position: { x, y },
                totalDefenses: this.defenses.length,
                timestamp: Date.now()
            });
        }
        
        return result;
    }

    /**
     * Optimized achievement tracking for high-frequency events
     */
    trackAchievementOptimized(eventType, eventData = {}) {
        if (!this.achievementManager) return;
        
        // Add optimization flags for high-frequency events
        const optimizedEventData = {
            ...eventData,
            optimized: true,
            gameState: {
                level: this.currentLevel,
                wave: this.currentWave,
                score: this.score
            }
        };
        
        return this.achievementManager.checkAchievements(eventType, optimizedEventData);
    }

    /**
     * Get current achievement monitoring status
     */
    getAchievementMonitoringStatus() {
        return {
            enabled: this.achievementMonitoring.enabled,
            stats: this.achievementMonitoring.stats,
            performanceHistory: this.achievementMonitoring.performanceHistory.slice(-10), // Last 10 entries
            systemRecommendations: this.getSystemRecommendations()
        };
    }

    /**
     * Get system optimization recommendations
     */
    getSystemRecommendations() {
        const stats = this.achievementMonitoring.stats;
        const recommendations = [];
        
        if (!stats) return recommendations;
        
        // Queue size recommendations
        if (stats.eventQueueSize > 50) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: 'Consider increasing batch processing frequency for better responsiveness',
                action: 'Reduce batch interval from 50ms to 25ms'
            });
        }
        
        // Memory recommendations
        if (stats.memoryUsage && stats.memoryUsage.queue > 100) {
            recommendations.push({
                type: 'memory',
                priority: 'high',
                message: 'High memory usage detected in event queue',
                action: 'Increase batch size or enable more aggressive cleanup'
            });
        }
        
        // Health recommendations
        if (stats.systemHealth && stats.systemHealth.status !== 'healthy') {
            recommendations.push({
                type: 'health',
                priority: 'high',
                message: `System health: ${stats.systemHealth.status}`,
                action: stats.systemHealth.recommendations?.[0] || 'Monitor system closely'
            });
        }
        
        return recommendations;
    }

    /**
     * Cleanup monitoring on game shutdown
     */
    cleanup() {
        this.disableAchievementMonitoring();
        super.cleanup && super.cleanup();
    }
}

/**
 * Console Commands for Runtime Achievement System Control
 * 
 * These functions can be called from the browser console for runtime debugging
 */
window.achievementDebug = {
    /**
     * Get current system stats
     */
    getStats() {
        if (window.game && window.game.achievementManager) {
            return window.game.achievementManager.getConcurrentSystemStats();
        }
        return null;
    },

    /**
     * Get detailed metrics
     */
    getMetrics() {
        if (window.game && window.game.achievementManager) {
            return window.game.achievementManager.getEventProcessingMetrics();
        }
        return null;
    },

    /**
     * Force process queue
     */
    forceProcess() {
        if (window.game && window.game.achievementManager) {
            window.game.achievementManager.debugForceProcessQueue();
            console.log('Forced queue processing');
        }
    },

    /**
     * Clear all buffers
     */
    clearBuffers() {
        if (window.game && window.game.achievementManager) {
            window.game.achievementManager.debugClearConcurrentBuffers();
            console.log('Cleared all concurrent buffers');
        }
    },

    /**
     * Simulate high frequency events
     */
    simulate(eventType = 'enemy_killed', count = 100) {
        if (window.game && window.game.achievementManager) {
            return window.game.achievementManager.debugSimulateHighFrequencyEvents(eventType, count, 10);
        }
    },

    /**
     * Configure system
     */
    configure(config) {
        if (window.game && window.game.achievementManager) {
            window.game.achievementManager.debugConfigureConcurrentSystem(config);
            console.log('Configuration updated:', config);
        }
    },

    /**
     * Monitor system for specified duration
     */
    monitor(durationSeconds = 30) {
        console.log(`Starting ${durationSeconds}s monitoring session...`);
        
        const startStats = this.getStats();
        console.log('Starting stats:', startStats);
        
        setTimeout(() => {
            const endStats = this.getStats();
            console.log('Ending stats:', endStats);
            
            const comparison = {
                queueSizeChange: (endStats?.eventQueueSize || 0) - (startStats?.eventQueueSize || 0),
                memoryChange: (endStats?.memoryUsage?.queue || 0) - (startStats?.memoryUsage?.queue || 0),
                processingActive: endStats?.processingEvents || false
            };
            
            console.log('Monitoring results:', comparison);
        }, durationSeconds * 1000);
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameWithConcurrentAchievementMonitoring };
}
