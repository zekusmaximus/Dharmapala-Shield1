/**
 * Boss Warning Synchronization System
 * Synchronizes boss warning timers directly with boss ability cooldowns,
 * with pause/resume handling, game speed adjustments, and fallback mechanisms.
 */

class BossWarningSynchronizer {
    constructor(game) {
        this.game = game;
        this.syncedWarnings = new Map(); // Map of warning ID to sync data
        this.warningIntervals = new Map(); // Map of warning ID to interval handles
        this.pausedWarnings = new Map(); // Store paused warning states
        this.lastUpdateTime = Date.now();
        this.desyncDetectionThreshold = 500; // 500ms tolerance for desync
        this.fallbackMechanisms = new Map(); // Fallback handlers for each warning
        
        // Initialize event listeners
        this.setupEventListeners();
        
        // Performance tracking
        this.syncStats = {
            totalWarnings: 0,
            synchronizedWarnings: 0,
            desyncEvents: 0,
            fallbackActivations: 0,
            averageAccuracy: 100
        };
        
        console.log('[BossWarningSynchronizer] Initialized with enhanced synchronization');
    }

    /**
     * Feature 1: Link warning timers directly to boss ability cooldowns
     */
    synchronizeWarningToCooldown(boss, abilityType, warningDuration = 3000) {
        try {
            if (!boss || !boss.abilityTimer === undefined) {
                console.warn('[BossWarningSynchronizer] Invalid boss or missing abilityTimer');
                return null;
            }

            const warningId = `${boss.type}_${abilityType}_${Date.now()}`;
            const currentCooldown = this.getBossAbilityCooldown(boss);
            const remainingCooldown = Math.max(0, currentCooldown - boss.abilityTimer);
            
            // Calculate synchronized timing
            const warningStartTime = Math.max(0, remainingCooldown - warningDuration);
            const actualWarningDuration = Math.min(warningDuration, remainingCooldown);
            
            // Create synchronization data
            const syncData = {
                warningId,
                boss,
                abilityType,
                targetCooldown: currentCooldown,
                warningDuration: actualWarningDuration,
                startTime: Date.now() + warningStartTime,
                endTime: Date.now() + remainingCooldown,
                bossAbilityTimer: boss.abilityTimer,
                gameSpeed: this.game.gameSpeed || 1,
                isPaused: false,
                pausedAt: null,
                pausedDuration: 0,
                syncAccuracy: 100,
                fallbackActive: false
            };

            this.syncedWarnings.set(warningId, syncData);
            this.syncStats.totalWarnings++;

            // Schedule warning display
            if (warningStartTime <= 0) {
                // Start warning immediately
                this.displaySynchronizedWarning(syncData);
            } else {
                // Schedule warning for later
                const timeoutId = setTimeout(() => {
                    this.displaySynchronizedWarning(syncData);
                }, warningStartTime / (this.game.gameSpeed || 1));
                
                this.warningIntervals.set(warningId, { type: 'timeout', id: timeoutId });
            }

            console.log(`[BossWarningSynchronizer] Synchronized warning ${warningId} - Start in: ${warningStartTime}ms, Duration: ${actualWarningDuration}ms`);
            return warningId;

        } catch (error) {
            console.error('[BossWarningSynchronizer] Error synchronizing warning:', error);
            this.activateFallback(boss, abilityType, warningDuration);
            return null;
        }
    }

    /**
     * Feature 2: Add pause/resume handling for warning timers
     */
    pauseWarnings() {
        try {
            const currentTime = Date.now();
            
            for (const [warningId, syncData] of this.syncedWarnings) {
                if (!syncData.isPaused && syncData.startTime > currentTime) {
                    // Warning hasn't started yet - pause the start timer
                    syncData.isPaused = true;
                    syncData.pausedAt = currentTime;
                    
                    // Clear existing timeout/interval
                    const interval = this.warningIntervals.get(warningId);
                    if (interval) {
                        if (interval.type === 'timeout') {
                            clearTimeout(interval.id);
                        } else if (interval.type === 'interval') {
                            clearInterval(interval.id);
                        }
                        this.warningIntervals.delete(warningId);
                    }
                    
                    console.log(`[BossWarningSynchronizer] Paused warning ${warningId}`);
                } else if (!syncData.isPaused && this.isWarningActive(syncData)) {
                    // Warning is currently active - pause its updates
                    syncData.isPaused = true;
                    syncData.pausedAt = currentTime;
                    
                    this.pauseActiveWarningDisplay(warningId);
                    console.log(`[BossWarningSynchronizer] Paused active warning ${warningId}`);
                }
            }

            console.log(`[BossWarningSynchronizer] Paused ${this.syncedWarnings.size} warnings`);

        } catch (error) {
            console.error('[BossWarningSynchronizer] Error pausing warnings:', error);
        }
    }

    resumeWarnings() {
        try {
            const currentTime = Date.now();
            
            for (const [warningId, syncData] of this.syncedWarnings) {
                if (syncData.isPaused) {
                    const pauseDuration = currentTime - syncData.pausedAt;
                    syncData.pausedDuration += pauseDuration;
                    syncData.isPaused = false;
                    syncData.pausedAt = null;
                    
                    // Adjust timing based on pause duration
                    syncData.startTime += pauseDuration;
                    syncData.endTime += pauseDuration;
                    
                    if (syncData.startTime > currentTime) {
                        // Reschedule warning start
                        const delay = syncData.startTime - currentTime;
                        const timeoutId = setTimeout(() => {
                            this.displaySynchronizedWarning(syncData);
                        }, delay / (this.game.gameSpeed || 1));
                        
                        this.warningIntervals.set(warningId, { type: 'timeout', id: timeoutId });
                    } else if (this.isWarningActive(syncData)) {
                        // Resume active warning
                        this.resumeActiveWarningDisplay(warningId);
                    }
                    
                    console.log(`[BossWarningSynchronizer] Resumed warning ${warningId} (paused for ${pauseDuration}ms)`);
                }
            }

            console.log(`[BossWarningSynchronizer] Resumed ${this.syncedWarnings.size} warnings`);

        } catch (error) {
            console.error('[BossWarningSynchronizer] Error resuming warnings:', error);
        }
    }

    /**
     * Feature 3: Implement game speed adjustment for warning displays
     */
    adjustWarningSpeedMultiplier(speedMultiplier) {
        try {
            const currentTime = Date.now();
            
            for (const [warningId, syncData] of this.syncedWarnings) {
                if (syncData.gameSpeed !== speedMultiplier) {
                    const oldSpeed = syncData.gameSpeed;
                    syncData.gameSpeed = speedMultiplier;
                    
                    // Recalculate timing based on new speed
                    if (!syncData.isPaused) {
                        if (syncData.startTime > currentTime) {
                            // Adjust start time for unstarted warnings
                            const remainingDelay = syncData.startTime - currentTime;
                            const adjustedDelay = remainingDelay * (oldSpeed / speedMultiplier);
                            syncData.startTime = currentTime + adjustedDelay;
                            
                            // Update timeout
                            const interval = this.warningIntervals.get(warningId);
                            if (interval && interval.type === 'timeout') {
                                clearTimeout(interval.id);
                                const timeoutId = setTimeout(() => {
                                    this.displaySynchronizedWarning(syncData);
                                }, adjustedDelay);
                                this.warningIntervals.set(warningId, { type: 'timeout', id: timeoutId });
                            }
                        } else if (this.isWarningActive(syncData)) {
                            // Adjust active warning timing
                            this.adjustActiveWarningSpeed(warningId, speedMultiplier);
                        }
                    }
                    
                    console.log(`[BossWarningSynchronizer] Adjusted warning ${warningId} speed: ${oldSpeed}x → ${speedMultiplier}x`);
                }
            }

        } catch (error) {
            console.error('[BossWarningSynchronizer] Error adjusting warning speed:', error);
        }
    }

    /**
     * Feature 4: Add fallback mechanisms for timing desynchronization
     */
    detectAndHandleDesynchronization() {
        try {
            const currentTime = Date.now();
            let desyncCount = 0;
            
            for (const [warningId, syncData] of this.syncedWarnings) {
                if (this.isWarningActive(syncData)) {
                    // Check synchronization with boss ability timer
                    const expectedBossTimer = this.calculateExpectedBossTimer(syncData, currentTime);
                    const actualBossTimer = syncData.boss.abilityTimer || 0;
                    const timeDifference = Math.abs(expectedBossTimer - actualBossTimer);
                    
                    if (timeDifference > this.desyncDetectionThreshold) {
                        desyncCount++;
                        this.handleDesynchronization(warningId, syncData, timeDifference);
                    } else {
                        // Update sync accuracy
                        const accuracy = Math.max(0, 100 - (timeDifference / this.desyncDetectionThreshold) * 100);
                        syncData.syncAccuracy = accuracy;
                    }
                }
            }

            if (desyncCount > 0) {
                this.syncStats.desyncEvents++;
                console.warn(`[BossWarningSynchronizer] Detected ${desyncCount} desynchronized warnings`);
            }

            // Update performance stats
            this.updateSyncStats();

        } catch (error) {
            console.error('[BossWarningSynchronizer] Error in desync detection:', error);
        }
    }

    /**
     * Handle desynchronization with fallback mechanisms
     */
    handleDesynchronization(warningId, syncData, timeDifference) {
        try {
            console.warn(`[BossWarningSynchronizer] Desync detected for ${warningId}: ${timeDifference}ms difference`);
            
            // Fallback Strategy 1: Recalibration
            if (timeDifference < this.desyncDetectionThreshold * 2) {
                this.recalibrateWarning(warningId, syncData);
                return;
            }
            
            // Fallback Strategy 2: Reset to boss timer
            if (timeDifference < this.desyncDetectionThreshold * 4) {
                this.resetWarningToBossTimer(warningId, syncData);
                return;
            }
            
            // Fallback Strategy 3: Emergency fallback
            this.activateEmergencyFallback(warningId, syncData);
            
        } catch (error) {
            console.error('[BossWarningSynchronizer] Error handling desynchronization:', error);
            this.activateEmergencyFallback(warningId, syncData);
        }
    }

    /**
     * Recalibrate warning timing to match boss ability timer
     */
    recalibrateWarning(warningId, syncData) {
        try {
            const currentTime = Date.now();
            const currentBossTimer = syncData.boss.abilityTimer || 0;
            const targetCooldown = this.getBossAbilityCooldown(syncData.boss);
            const remainingCooldown = Math.max(0, targetCooldown - currentBossTimer);
            
            // Adjust warning end time
            const newEndTime = currentTime + remainingCooldown;
            const timingAdjustment = newEndTime - syncData.endTime;
            
            syncData.endTime = newEndTime;
            syncData.syncAccuracy = 90; // Reduced accuracy due to recalibration
            
            // Update active warning display if needed
            if (this.isWarningActive(syncData)) {
                this.updateActiveWarningTiming(warningId, timingAdjustment);
            }
            
            console.log(`[BossWarningSynchronizer] Recalibrated warning ${warningId} by ${timingAdjustment}ms`);
            
        } catch (error) {
            console.error('[BossWarningSynchronizer] Error recalibrating warning:', error);
            this.activateEmergencyFallback(warningId, syncData);
        }
    }

    /**
     * Reset warning to match current boss timer state
     */
    resetWarningToBossTimer(warningId, syncData) {
        try {
            const currentTime = Date.now();
            const currentBossTimer = syncData.boss.abilityTimer || 0;
            const targetCooldown = this.getBossAbilityCooldown(syncData.boss);
            const remainingCooldown = Math.max(0, targetCooldown - currentBossTimer);
            
            // Reset synchronization data
            syncData.bossAbilityTimer = currentBossTimer;
            syncData.endTime = currentTime + remainingCooldown;
            syncData.syncAccuracy = 75; // Further reduced accuracy
            
            // If warning should end soon, prepare for cleanup
            if (remainingCooldown < 1000) {
                this.scheduleWarningCleanup(warningId, remainingCooldown);
            }
            
            console.log(`[BossWarningSynchronizer] Reset warning ${warningId} to boss timer state`);
            
        } catch (error) {
            console.error('[BossWarningSynchronizer] Error resetting warning:', error);
            this.activateEmergencyFallback(warningId, syncData);
        }
    }

    /**
     * Activate emergency fallback mechanism
     */
    activateEmergencyFallback(warningId, syncData) {
        try {
            syncData.fallbackActive = true;
            syncData.syncAccuracy = 50; // Minimum accuracy
            this.syncStats.fallbackActivations++;
            
            // Use simple timer-based warning
            const fallbackDuration = 2000; // 2 second fallback warning
            const fallbackHandler = () => {
                this.displayFallbackWarning(syncData.boss, syncData.abilityType, fallbackDuration);
                this.cleanupWarning(warningId);
            };
            
            this.fallbackMechanisms.set(warningId, fallbackHandler);
            
            // Execute fallback immediately or after short delay
            const delay = Math.random() * 500; // 0-500ms random delay to avoid conflicts
            setTimeout(fallbackHandler, delay);
            
            console.warn(`[BossWarningSynchronizer] Activated emergency fallback for ${warningId}`);
            
        } catch (error) {
            console.error('[BossWarningSynchronizer] Emergency fallback failed:', error);
            // Last resort - cleanup the broken warning
            this.cleanupWarning(warningId);
        }
    }

    /**
     * Display synchronized warning with enhanced UI
     */
    displaySynchronizedWarning(syncData) {
        try {
            if (syncData.isPaused) return;
            
            const remainingTime = syncData.endTime - Date.now();
            if (remainingTime <= 0) {
                this.cleanupWarning(syncData.warningId);
                return;
            }
            
            // Show warning with synchronized timing
            this.game.showBossWarning(
                syncData.boss, 
                syncData.abilityType, 
                Math.min(syncData.warningDuration, remainingTime)
            );
            
            // Create update interval for real-time synchronization
            const updateInterval = setInterval(() => {
                this.updateSynchronizedWarning(syncData);
            }, 100); // Update every 100ms
            
            this.warningIntervals.set(syncData.warningId, { 
                type: 'interval', 
                id: updateInterval 
            });
            
            this.syncStats.synchronizedWarnings++;
            console.log(`[BossWarningSynchronizer] Displayed synchronized warning ${syncData.warningId}`);
            
        } catch (error) {
            console.error('[BossWarningSynchronizer] Error displaying synchronized warning:', error);
            this.activateFallback(syncData.boss, syncData.abilityType, syncData.warningDuration);
        }
    }

    /**
     * Update synchronized warning in real-time
     */
    updateSynchronizedWarning(syncData) {
        try {
            if (syncData.isPaused) return;
            
            const currentTime = Date.now();
            const remainingTime = syncData.endTime - currentTime;
            
            if (remainingTime <= 0) {
                this.cleanupWarning(syncData.warningId);
                return;
            }
            
            // Update warning timer display
            const timerElement = document.querySelector('#bossWarningTimer');
            if (timerElement) {
                const seconds = Math.ceil(remainingTime / 1000);
                timerElement.textContent = seconds;
                
                // Add synchronization indicator
                const accuracyClass = syncData.syncAccuracy > 90 ? 'high-sync' : 
                                    syncData.syncAccuracy > 70 ? 'medium-sync' : 'low-sync';
                timerElement.className = `boss-warning-timer ${accuracyClass}`;
            }
            
            // Check for desynchronization
            if (Math.random() < 0.1) { // 10% chance per update
                this.detectAndHandleDesynchronization();
            }
            
        } catch (error) {
            console.error('[BossWarningSynchronizer] Error updating synchronized warning:', error);
        }
    }

    /**
     * Utility methods
     */
    getBossAbilityCooldown(boss) {
        if (boss.getPhaseAbilityCooldown) {
            return boss.getPhaseAbilityCooldown();
        }
        // Fallback cooldown calculation
        return 4000 - ((boss.phase || 1) * 500);
    }

    calculateExpectedBossTimer(syncData, currentTime) {
        const elapsedTime = currentTime - (syncData.startTime - syncData.warningDuration);
        const adjustedElapsed = elapsedTime * syncData.gameSpeed - syncData.pausedDuration;
        return syncData.bossAbilityTimer + adjustedElapsed;
    }

    isWarningActive(syncData) {
        const currentTime = Date.now();
        return currentTime >= syncData.startTime && currentTime < syncData.endTime;
    }

    pauseActiveWarningDisplay(warningId) {
        const overlay = document.getElementById('bossWarningOverlay');
        if (overlay) {
            overlay.style.animationPlayState = 'paused';
        }
    }

    resumeActiveWarningDisplay(warningId) {
        const overlay = document.getElementById('bossWarningOverlay');
        if (overlay) {
            overlay.style.animationPlayState = 'running';
        }
    }

    adjustActiveWarningSpeed(warningId, speedMultiplier) {
        const overlay = document.getElementById('bossWarningOverlay');
        if (overlay) {
            overlay.style.animationDuration = `${0.5 / speedMultiplier}s`;
        }
    }

    updateActiveWarningTiming(warningId, timingAdjustment) {
        // Adjust any ongoing animations or timers
        const syncData = this.syncedWarnings.get(warningId);
        if (syncData && this.isWarningActive(syncData)) {
            // Smoothly adjust timing without jarring visual changes
            console.log(`[BossWarningSynchronizer] Adjusted active warning timing by ${timingAdjustment}ms`);
        }
    }

    scheduleWarningCleanup(warningId, delay) {
        setTimeout(() => {
            this.cleanupWarning(warningId);
        }, delay);
    }

    displayFallbackWarning(boss, abilityType, duration) {
        // Use the original warning system as fallback
        if (this.game.showBossWarning) {
            this.game.showBossWarning(boss, abilityType, duration);
        }
    }

    activateFallback(boss, abilityType, duration) {
        this.syncStats.fallbackActivations++;
        this.displayFallbackWarning(boss, abilityType, duration);
    }

    cleanupWarning(warningId) {
        try {
            // Clear intervals/timeouts
            const interval = this.warningIntervals.get(warningId);
            if (interval) {
                if (interval.type === 'timeout') {
                    clearTimeout(interval.id);
                } else if (interval.type === 'interval') {
                    clearInterval(interval.id);
                }
                this.warningIntervals.delete(warningId);
            }
            
            // Remove sync data
            this.syncedWarnings.delete(warningId);
            this.fallbackMechanisms.delete(warningId);
            
            console.log(`[BossWarningSynchronizer] Cleaned up warning ${warningId}`);
            
        } catch (error) {
            console.error('[BossWarningSynchronizer] Error cleaning up warning:', error);
        }
    }

    setupEventListeners() {
        // Listen for game pause/resume events
        document.addEventListener('gamePaused', () => {
            this.pauseWarnings();
        });
        
        document.addEventListener('gameResumed', () => {
            this.resumeWarnings();
        });
        
        // Listen for game speed changes
        document.addEventListener('gameSpeedChanged', (event) => {
            this.adjustWarningSpeedMultiplier(event.detail.speed || 1);
        });
        
        // Listen for boss ability events
        document.addEventListener('bossAbilityWarning', (event) => {
            const { enemy, abilityType, duration } = event.detail;
            this.synchronizeWarningToCooldown(enemy, abilityType, duration);
        });
    }

    updateSyncStats() {
        const totalWarnings = this.syncStats.totalWarnings;
        const synchronizedWarnings = this.syncStats.synchronizedWarnings;
        
        if (totalWarnings > 0) {
            this.syncStats.averageAccuracy = (synchronizedWarnings / totalWarnings) * 100;
        }
    }

    getSynchronizationStats() {
        return {
            ...this.syncStats,
            activeWarnings: this.syncedWarnings.size,
            pausedWarnings: this.pausedWarnings.size,
            activeFallbacks: this.fallbackMechanisms.size
        };
    }

    // Public interface methods
    getActiveWarnings() {
        return Array.from(this.syncedWarnings.values()).filter(syncData => 
            this.isWarningActive(syncData)
        );
    }

    clearAllWarnings() {
        for (const warningId of this.syncedWarnings.keys()) {
            this.cleanupWarning(warningId);
        }
    }

    // Debug methods
    debugLogSyncData() {
        console.log('[BossWarningSynchronizer] Current sync data:', {
            syncedWarnings: Array.from(this.syncedWarnings.entries()),
            stats: this.getSynchronizationStats()
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BossWarningSynchronizer;
}
