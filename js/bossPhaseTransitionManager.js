// Dharmapala Shield - Boss Phase Transition Synchronization Manager

/**
 * Comprehensive Boss Phase Transition Synchronization System
 * 
 * Features:
 * 1. Phase transition queuing system for proper state management
 * 2. Phase transition validation to prevent skipping phases
 * 3. Synchronization points with UI and achievement systems
 * 4. Rollback mechanisms for failed phase transitions
 */

class BossPhaseTransitionManager {
    constructor(boss, game) {
        this.boss = boss;
        this.game = game;
        
        // Phase transition queue system
        this.transitionQueue = [];
        this.isProcessingTransition = false;
        this.transitionLock = false;
        
        // Validation system
        this.phaseHistory = [];
        this.validPhaseSequence = this.generateValidPhaseSequence();
        this.criticalTransitionPoints = new Set([2, 3, 4]); // Critical phases requiring extra validation
        
        // Synchronization system
        this.synchronizationPoints = {
            ui: [],
            achievements: [],
            audio: [],
            effects: []
        };
        this.pendingSyncOperations = new Map();
        
        // Rollback system
        this.phaseSnapshots = new Map();
        this.rollbackStack = [];
        this.maxRollbackDepth = 5;
        
        // Event tracking
        this.transitionAttempts = 0;
        this.successfulTransitions = 0;
        this.failedTransitions = 0;
        this.rollbacksPerformed = 0;
        
        // Initialize
        this.initializePhaseTransitionSystem();
        
        console.log(`[BossPhaseTransitionManager] Initialized for boss ${this.boss.type}`);
    }
    
    initializePhaseTransitionSystem() {
        // Create initial phase snapshot
        this.createPhaseSnapshot(this.boss.phase || 1, 'initial');
        
        // Set up synchronization points
        this.setupSynchronizationPoints();
        
        // Initialize phase validation
        this.validateInitialPhase();
        
        // Set up transition event listeners
        this.setupTransitionEventListeners();
    }
    
    generateValidPhaseSequence() {
        const bossType = this.boss.type;
        const phaseConfig = CONFIG.BOSS_PHASES?.[bossType];
        
        if (!phaseConfig) {
            console.warn(`[BossPhaseTransitionManager] No phase config for boss type: ${bossType}`);
            return [1, 2, 3]; // Default sequence
        }
        
        const phases = Object.keys(phaseConfig)
            .map(p => parseInt(p))
            .filter(p => !isNaN(p))
            .sort((a, b) => a - b);
            
        console.log(`[BossPhaseTransitionManager] Valid phase sequence for ${bossType}:`, phases);
        return phases;
    }
    
    setupSynchronizationPoints() {
        // UI synchronization points
        this.synchronizationPoints.ui.push({
            name: 'bossHealthBar',
            validator: () => document.getElementById('bossHealthContainer'),
            synchronizer: (phase) => this.synchronizeUIHealthBar(phase)
        });
        
        this.synchronizationPoints.ui.push({
            name: 'phaseIndicator',
            validator: () => document.getElementById('bossPhaseText'),
            synchronizer: (phase) => this.synchronizeUIPhaseIndicator(phase)
        });
        
        // Achievement synchronization points
        this.synchronizationPoints.achievements.push({
            name: 'phaseTransitionAchievement',
            validator: () => this.game && this.game.trackAchievement,
            synchronizer: (phase) => this.synchronizePhaseAchievements(phase)
        });
        
        // Audio synchronization points
        this.synchronizationPoints.audio.push({
            name: 'phaseTransitionSound',
            validator: () => this.game && this.game.playSfx,
            synchronizer: (phase) => this.synchronizePhaseAudio(phase)
        });
        
        // Visual effects synchronization points
        this.synchronizationPoints.effects.push({
            name: 'phaseTransitionEffects',
            validator: () => this.boss.createPhaseTransitionEffect,
            synchronizer: (phase) => this.synchronizePhaseEffects(phase)
        });
    }
    
    validateInitialPhase() {
        const currentPhase = this.boss.phase || 1;
        
        if (!this.validPhaseSequence.includes(currentPhase)) {
            console.error(`[BossPhaseTransitionManager] Invalid initial phase: ${currentPhase}`);
            this.boss.phase = this.validPhaseSequence[0];
            console.log(`[BossPhaseTransitionManager] Corrected initial phase to: ${this.boss.phase}`);
        }
        
        this.phaseHistory.push({
            phase: this.boss.phase,
            timestamp: Date.now(),
            trigger: 'initialization',
            healthPercent: this.boss.health / this.boss.maxHealth
        });
    }
    
    setupTransitionEventListeners() {
        // Listen for phase transition requests
        document.addEventListener('requestPhaseTransition', (event) => {
            const { targetPhase, trigger, priority } = event.detail;
            this.queuePhaseTransition(targetPhase, trigger, priority);
        });
        
        // Listen for synchronization failures
        document.addEventListener('phaseTransitionSyncFailure', (event) => {
            const { syncPoint, error } = event.detail;
            this.handleSynchronizationFailure(syncPoint, error);
        });
    }
    
    // 1. PHASE TRANSITION QUEUING SYSTEM
    
    /**
     * Queue a phase transition with proper priority handling
     */
    queuePhaseTransition(targetPhase, trigger = 'manual', priority = 1) {
        try {
            console.log(`[BossPhaseTransitionManager] Queuing phase transition to ${targetPhase} (trigger: ${trigger})`);
            
            // Validate transition request
            const validation = this.validatePhaseTransition(this.boss.phase, targetPhase);
            if (!validation.valid) {
                console.error(`[BossPhaseTransitionManager] Invalid transition request: ${validation.reason}`);
                return false;
            }
            
            // Create transition request
            const transitionRequest = {
                id: this.generateTransitionId(),
                targetPhase: targetPhase,
                currentPhase: this.boss.phase,
                trigger: trigger,
                priority: priority,
                timestamp: Date.now(),
                attempts: 0,
                maxAttempts: 3,
                status: 'queued'
            };
            
            // Insert into queue based on priority
            this.insertTransitionByPriority(transitionRequest);
            
            // Process queue if not currently processing
            if (!this.isProcessingTransition) {
                this.processTransitionQueue();
            }
            
            return transitionRequest.id;
            
        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Error queuing phase transition:`, error);
            return false;
        }
    }
    
    insertTransitionByPriority(transitionRequest) {
        // Priority 3 = High (emergency), 2 = Normal, 1 = Low
        let insertIndex = this.transitionQueue.length;
        
        for (let i = 0; i < this.transitionQueue.length; i++) {
            if (this.transitionQueue[i].priority < transitionRequest.priority) {
                insertIndex = i;
                break;
            }
        }
        
        this.transitionQueue.splice(insertIndex, 0, transitionRequest);
        console.log(`[BossPhaseTransitionManager] Transition queued at position ${insertIndex}, queue length: ${this.transitionQueue.length}`);
    }
    
    async processTransitionQueue() {
        if (this.isProcessingTransition || this.transitionLock) {
            console.log(`[BossPhaseTransitionManager] Transition processing locked or already in progress`);
            return;
        }
        
        while (this.transitionQueue.length > 0) {
            this.isProcessingTransition = true;
            const transitionRequest = this.transitionQueue.shift();
            
            try {
                console.log(`[BossPhaseTransitionManager] Processing transition: ${transitionRequest.id}`);
                
                const success = await this.executePhaseTransition(transitionRequest);
                
                if (success) {
                    console.log(`[BossPhaseTransitionManager] Transition ${transitionRequest.id} completed successfully`);
                    this.successfulTransitions++;
                } else {
                    console.error(`[BossPhaseTransitionManager] Transition ${transitionRequest.id} failed`);
                    this.handleFailedTransition(transitionRequest);
                }
                
            } catch (error) {
                console.error(`[BossPhaseTransitionManager] Error processing transition ${transitionRequest.id}:`, error);
                this.handleFailedTransition(transitionRequest);
            }
            
            // Small delay between transitions to prevent rapid-fire issues
            await this.delay(100);
        }
        
        this.isProcessingTransition = false;
        console.log(`[BossPhaseTransitionManager] Transition queue processing completed`);
    }
    
    // 2. PHASE TRANSITION VALIDATION
    
    /**
     * Comprehensive phase transition validation
     */
    validatePhaseTransition(currentPhase, targetPhase) {
        const validation = {
            valid: true,
            reason: '',
            warnings: []
        };
        
        try {
            // Basic validation
            if (!this.isValidPhase(targetPhase)) {
                validation.valid = false;
                validation.reason = `Invalid target phase: ${targetPhase}`;
                return validation;
            }
            
            if (currentPhase === targetPhase) {
                validation.valid = false;
                validation.reason = `Already in target phase: ${targetPhase}`;
                return validation;
            }
            
            // Sequence validation - prevent phase skipping
            if (!this.isValidPhaseSequence(currentPhase, targetPhase)) {
                validation.valid = false;
                validation.reason = `Invalid phase sequence: ${currentPhase} -> ${targetPhase}`;
                return validation;
            }
            
            // Health threshold validation
            const healthValidation = this.validateHealthThreshold(targetPhase);
            if (!healthValidation.valid) {
                validation.valid = false;
                validation.reason = healthValidation.reason;
                return validation;
            }
            
            // Cooldown validation
            if (!this.validateTransitionCooldown()) {
                validation.valid = false;
                validation.reason = 'Phase transition cooldown active';
                return validation;
            }
            
            // Boss state validation
            const stateValidation = this.validateBossState();
            if (!stateValidation.valid) {
                validation.valid = false;
                validation.reason = stateValidation.reason;
                return validation;
            }
            
            // Critical phase validation
            if (this.criticalTransitionPoints.has(targetPhase)) {
                const criticalValidation = this.validateCriticalTransition(targetPhase);
                if (!criticalValidation.valid) {
                    validation.valid = false;
                    validation.reason = criticalValidation.reason;
                    return validation;
                }
                validation.warnings.push(...criticalValidation.warnings);
            }
            
            console.log(`[BossPhaseTransitionManager] Phase transition validation passed: ${currentPhase} -> ${targetPhase}`);
            return validation;
            
        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Error during phase validation:`, error);
            validation.valid = false;
            validation.reason = `Validation error: ${error.message}`;
            return validation;
        }
    }
    
    isValidPhase(phase) {
        return this.validPhaseSequence.includes(phase);
    }
    
    isValidPhaseSequence(currentPhase, targetPhase) {
        const currentIndex = this.validPhaseSequence.indexOf(currentPhase);
        const targetIndex = this.validPhaseSequence.indexOf(targetPhase);
        
        if (currentIndex === -1 || targetIndex === -1) {
            return false;
        }
        
        // Allow only sequential progression (no skipping phases)
        return targetIndex === currentIndex + 1;
    }
    
    validateHealthThreshold(targetPhase) {
        const phaseConfig = CONFIG.BOSS_PHASES?.[this.boss.type]?.[targetPhase];
        
        if (!phaseConfig || !phaseConfig.healthThreshold) {
            return { valid: true }; // No threshold requirement
        }
        
        const currentHealthPercent = this.boss.health / this.boss.maxHealth;
        const requiredHealthPercent = phaseConfig.healthThreshold;
        
        if (currentHealthPercent > requiredHealthPercent) {
            return {
                valid: false,
                reason: `Health too high for phase ${targetPhase}: ${(currentHealthPercent * 100).toFixed(1)}% > ${(requiredHealthPercent * 100).toFixed(1)}%`
            };
        }
        
        return { valid: true };
    }
    
    validateTransitionCooldown() {
        const now = Date.now();
        const lastTransition = this.phaseHistory[this.phaseHistory.length - 1];
        
        if (!lastTransition) return true;
        
        const timeSinceLastTransition = now - lastTransition.timestamp;
        const minCooldown = 1000; // 1 second minimum between transitions
        
        return timeSinceLastTransition >= minCooldown;
    }
    
    validateBossState() {
        // Check if boss is in a valid state for phase transition
        if (this.boss.health <= 0) {
            return { valid: false, reason: 'Boss is dead' };
        }
        
        if (this.boss.deathAnimationTime > 0) {
            return { valid: false, reason: 'Boss death animation in progress' };
        }
        
        if (this.boss.stunned && this.boss.stunnedTime > 1000) {
            return { valid: false, reason: 'Boss heavily stunned' };
        }
        
        return { valid: true };
    }
    
    validateCriticalTransition(targetPhase) {
        const validation = { valid: true, warnings: [] };
        
        // Additional validation for critical phases (phases 2, 3, 4)
        if (targetPhase >= 3) {
            // Check for minimum phase duration
            const currentPhaseStart = this.phaseHistory[this.phaseHistory.length - 1]?.timestamp || Date.now();
            const phaseMinDuration = 5000; // 5 seconds minimum
            
            if (Date.now() - currentPhaseStart < phaseMinDuration) {
                validation.warnings.push(`Quick transition to critical phase ${targetPhase}`);
            }
            
            // Check for ability usage requirements
            if (this.boss.abilitiesUsedCount < (targetPhase - 1)) {
                validation.warnings.push(`Few abilities used before phase ${targetPhase}`);
            }
        }
        
        return validation;
    }
    
    // 3. SYNCHRONIZATION SYSTEM
    
    /**
     * Execute phase transition with full synchronization
     */
    async executePhaseTransition(transitionRequest) {
        try {
            this.transitionAttempts++;
            transitionRequest.attempts++;
            transitionRequest.status = 'executing';
            
            console.log(`[BossPhaseTransitionManager] Executing phase transition ${transitionRequest.id}: ${transitionRequest.currentPhase} -> ${transitionRequest.targetPhase}`);
            
            // Create rollback snapshot before transition
            const rollbackId = this.createPhaseSnapshot(transitionRequest.currentPhase, `pre-transition-${transitionRequest.id}`);
            
            // Phase 1: Pre-transition synchronization
            const preSyncSuccess = await this.executePreTransitionSync(transitionRequest);
            if (!preSyncSuccess) {
                console.error(`[BossPhaseTransitionManager] Pre-transition sync failed for ${transitionRequest.id}`);
                await this.rollbackTransition(rollbackId, 'Pre-sync failure');
                return false;
            }
            
            // Phase 2: Core phase transition
            const coreTransitionSuccess = await this.executeCoreTransition(transitionRequest);
            if (!coreTransitionSuccess) {
                console.error(`[BossPhaseTransitionManager] Core transition failed for ${transitionRequest.id}`);
                await this.rollbackTransition(rollbackId, 'Core transition failure');
                return false;
            }
            
            // Phase 3: Post-transition synchronization
            const postSyncSuccess = await this.executePostTransitionSync(transitionRequest);
            if (!postSyncSuccess) {
                console.error(`[BossPhaseTransitionManager] Post-transition sync failed for ${transitionRequest.id}`);
                await this.rollbackTransition(rollbackId, 'Post-sync failure');
                return false;
            }
            
            // Phase 4: Final validation and cleanup
            const finalValidation = this.validateTransitionCompletion(transitionRequest);
            if (!finalValidation.valid) {
                console.error(`[BossPhaseTransitionManager] Final validation failed: ${finalValidation.reason}`);
                await this.rollbackTransition(rollbackId, 'Final validation failure');
                return false;
            }
            
            // Success - record transition and cleanup
            this.recordSuccessfulTransition(transitionRequest);
            this.cleanupTransitionData(transitionRequest.id);
            
            return true;
            
        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Critical error during phase transition:`, error);
            transitionRequest.status = 'failed';
            return false;
        }
    }
    
    async executePreTransitionSync(transitionRequest) {
        console.log(`[BossPhaseTransitionManager] Executing pre-transition sync for ${transitionRequest.id}`);
        
        const syncOperations = [];
        
        // UI pre-sync
        syncOperations.push(this.syncUIPreTransition(transitionRequest));
        
        // Achievement pre-sync
        syncOperations.push(this.syncAchievementsPreTransition(transitionRequest));
        
        // Audio pre-sync
        syncOperations.push(this.syncAudioPreTransition(transitionRequest));
        
        try {
            const results = await Promise.allSettled(syncOperations);
            const failures = results.filter(r => r.status === 'rejected');
            
            if (failures.length > 0) {
                console.error(`[BossPhaseTransitionManager] Pre-sync failures:`, failures);
                return false;
            }
            
            console.log(`[BossPhaseTransitionManager] Pre-transition sync completed successfully`);
            return true;
            
        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Pre-sync error:`, error);
            return false;
        }
    }
    
    async executeCoreTransition(transitionRequest) {
        console.log(`[BossPhaseTransitionManager] Executing core transition for ${transitionRequest.id}`);
        
        try {
            const oldPhase = this.boss.phase;
            const newPhase = transitionRequest.targetPhase;
            
            // Update boss phase
            this.boss.phase = newPhase;
            
            // Apply phase-specific changes
            if (this.boss.applyPhaseChanges) {
                this.boss.applyPhaseChanges(newPhase, this.game?.defenses || [], this.game?.enemies || []);
            }
            
            // Update phase manager if it exists
            if (this.boss.phaseManager) {
                this.boss.phaseManager.phaseStartTime = Date.now();
            }
            
            // Dispatch core transition event
            const transitionEvent = new CustomEvent('bossPhaseTransition', {
                detail: {
                    enemy: this.boss,
                    oldPhase: oldPhase,
                    newPhase: newPhase,
                    bossType: this.boss.type,
                    transitionId: transitionRequest.id,
                    trigger: transitionRequest.trigger
                }
            });
            document.dispatchEvent(transitionEvent);
            
            console.log(`[BossPhaseTransitionManager] Core transition completed: ${oldPhase} -> ${newPhase}`);
            return true;
            
        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Core transition error:`, error);
            return false;
        }
    }
    
    async executePostTransitionSync(transitionRequest) {
        console.log(`[BossPhaseTransitionManager] Executing post-transition sync for ${transitionRequest.id}`);
        
        const syncOperations = [];
        
        // UI synchronization
        for (const uiSync of this.synchronizationPoints.ui) {
            if (uiSync.validator()) {
                syncOperations.push(this.executeSyncOperation(uiSync, transitionRequest.targetPhase));
            }
        }
        
        // Achievement synchronization
        for (const achievementSync of this.synchronizationPoints.achievements) {
            if (achievementSync.validator()) {
                syncOperations.push(this.executeSyncOperation(achievementSync, transitionRequest.targetPhase));
            }
        }
        
        // Audio synchronization
        for (const audioSync of this.synchronizationPoints.audio) {
            if (audioSync.validator()) {
                syncOperations.push(this.executeSyncOperation(audioSync, transitionRequest.targetPhase));
            }
        }
        
        // Effects synchronization
        for (const effectSync of this.synchronizationPoints.effects) {
            if (effectSync.validator()) {
                syncOperations.push(this.executeSyncOperation(effectSync, transitionRequest.targetPhase));
            }
        }
        
        try {
            const results = await Promise.allSettled(syncOperations);
            const failures = results.filter(r => r.status === 'rejected');
            
            if (failures.length > 0) {
                console.warn(`[BossPhaseTransitionManager] Some post-sync operations failed:`, failures);
                // Continue - post-sync failures are not critical
            }
            
            console.log(`[BossPhaseTransitionManager] Post-transition sync completed`);
            return true;
            
        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Post-sync error:`, error);
            return false; // Post-sync failures should trigger rollback
        }
    }
    
    async executeSyncOperation(syncPoint, phase) {
        try {
            console.log(`[BossPhaseTransitionManager] Executing sync operation: ${syncPoint.name}`);
            
            const syncId = `${syncPoint.name}_${Date.now()}`;
            this.pendingSyncOperations.set(syncId, {
                syncPoint: syncPoint.name,
                phase: phase,
                startTime: Date.now()
            });
            
            await syncPoint.synchronizer(phase);
            
            this.pendingSyncOperations.delete(syncId);
            console.log(`[BossPhaseTransitionManager] Sync operation completed: ${syncPoint.name}`);
            
        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Sync operation failed for ${syncPoint.name}:`, error);
            throw error;
        }
    }
    
    // Synchronization implementations
    
    async synchronizeUIHealthBar(phase) {
        if (this.game && this.game.updateBossPhaseIndicator) {
            this.game.updateBossPhaseIndicator(
                this.boss,
                phase,
                this.boss.type,
                this.boss.totalPhases || this.validPhaseSequence.length
            );
        }
    }
    
    async synchronizeUIPhaseIndicator(phase) {
        const phaseText = document.getElementById('bossPhaseText');
        if (phaseText) {
            phaseText.textContent = `${this.boss.type.toUpperCase()} - PHASE ${phase}`;
            phaseText.style.animation = 'phaseTransition 1s ease-out';
            
            setTimeout(() => {
                phaseText.style.animation = 'none';
            }, 1000);
        }
    }
    
    async synchronizePhaseAchievements(phase) {
        if (this.game && this.game.trackAchievement) {
            this.game.trackAchievement('boss_phase_transition', {
                bossType: this.boss.type,
                phase: phase,
                transitionCount: this.successfulTransitions + 1
            });
            
            // Special achievements for higher phases
            if (phase >= 3) {
                this.game.trackAchievement('boss_high_phase_reached', {
                    bossType: this.boss.type,
                    phase: phase
                });
            }
        }
    }
    
    async synchronizePhaseAudio(phase) {
        if (this.game && this.game.playSfx) {
            const intensity = Math.min(1.0, 0.6 + (phase - 1) * 0.1);
            this.game.playSfx('bossPhaseTransition', intensity, 0.8);
        }
    }
    
    async synchronizePhaseEffects(phase) {
        if (this.boss.createPhaseTransitionEffect) {
            this.boss.createPhaseTransitionEffect();
        }
        
        // Screen shake intensity based on phase
        if (this.game && this.game.camera && this.game.camera.shake) {
            const shakeIntensity = 300 + (phase * 100);
            const shakeDuration = 8 + (phase * 2);
            this.game.camera.shake(shakeIntensity, shakeDuration);
        }
    }
    
    // 4. ROLLBACK MECHANISMS
    
    /**
     * Create a snapshot of the current boss state for rollback purposes
     */
    createPhaseSnapshot(phase, trigger) {
        const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const snapshot = {
            id: snapshotId,
            timestamp: Date.now(),
            trigger: trigger,
            bossState: {
                phase: phase,
                health: this.boss.health,
                maxHealth: this.boss.maxHealth,
                speed: this.boss.speed,
                abilities: [...(this.boss.abilities || [])],
                // Deep copy of important properties
                x: this.boss.x,
                y: this.boss.y,
                pathIndex: this.boss.pathIndex,
                abilityTimer: this.boss.abilityTimer || 0,
                abilitiesUsedCount: this.boss.abilitiesUsedCount || 0,
                droneCount: this.boss.droneCount || 0,
                minionsSpawned: this.boss.minionsSpawned || false
            },
            gameState: {
                disabledDefenses: this.getDisabledDefensesSnapshot(),
                takenDefenses: this.getTakenDefensesSnapshot(),
                activeDrones: this.getActiveDronesSnapshot()
            }
        };
        
        this.phaseSnapshots.set(snapshotId, snapshot);
        
        // Maintain rollback stack
        this.rollbackStack.push(snapshotId);
        if (this.rollbackStack.length > this.maxRollbackDepth) {
            const oldSnapshotId = this.rollbackStack.shift();
            this.phaseSnapshots.delete(oldSnapshotId);
        }
        
        console.log(`[BossPhaseTransitionManager] Phase snapshot created: ${snapshotId}`);
        return snapshotId;
    }
    
    /**
     * Rollback to a previous phase state with comprehensive validation and transaction-like coordination
     */
    async rollbackTransition(snapshotId, reason) {
        try {
            console.log(`[BossPhaseTransitionManager] Initiating rollback to ${snapshotId}: ${reason}`);
            const snapshot = this.phaseSnapshots.get(snapshotId);
            if (!snapshot) {
                console.error(`[BossPhaseTransitionManager] Snapshot not found: ${snapshotId}`);
                return false;
            }

            // 1. Validate rollback state compatibility
            if (!this.validateRollbackCompatibility(snapshot)) {
                console.error(`[BossPhaseTransitionManager] Rollback state incompatible for snapshot: ${snapshotId}`);
                return false;
            }

            // 2. Begin transaction-like rollback coordination
            this.transitionLock = true;
            let rollbackResults = {
                boss: false,
                game: false,
                achievements: false,
                ui: false,
                audio: false
            };
            let cascadingFailure = false;

            // Boss state rollback
            try {
                await this.restoreBossState(snapshot.bossState);
                rollbackResults.boss = true;
            } catch (e) {
                cascadingFailure = true;
                console.error('[BossPhaseTransitionManager] Boss state rollback failed:', e);
            }

            // Game state rollback
            try {
                await this.restoreGameState(snapshot.gameState);
                rollbackResults.game = true;
            } catch (e) {
                cascadingFailure = true;
                console.error('[BossPhaseTransitionManager] Game state rollback failed:', e);
            }

            // Achievements rollback (if supported)
            try {
                if (this.game && this.game.achievementManager && typeof this.game.achievementManager.rollbackToState === 'function') {
                    await this.game.achievementManager.rollbackToState(snapshot.achievementState || {});
                    rollbackResults.achievements = true;
                } else {
                    // No-op if not supported
                    rollbackResults.achievements = true;
                }
            } catch (e) {
                cascadingFailure = true;
                console.error('[BossPhaseTransitionManager] Achievement rollback failed:', e);
            }

            // UI rollback
            try {
                await this.synchronizeUIAfterRollback(snapshot.bossState.phase);
                rollbackResults.ui = true;
            } catch (e) {
                cascadingFailure = true;
                console.error('[BossPhaseTransitionManager] UI rollback failed:', e);
            }

            // Audio rollback (if supported)
            try {
                if (this.game && this.game.audioManager && typeof this.game.audioManager.rollbackToState === 'function') {
                    await this.game.audioManager.rollbackToState(snapshot.audioState || {});
                    rollbackResults.audio = true;
                } else {
                    // No-op if not supported
                    rollbackResults.audio = true;
                }
            } catch (e) {
                cascadingFailure = true;
                console.error('[BossPhaseTransitionManager] Audio rollback failed:', e);
            }

            // 3. Cascading failure handling
            if (cascadingFailure || Object.values(rollbackResults).some(v => v === false)) {
                console.error('[BossPhaseTransitionManager] Cascading failure during rollback. Results:', rollbackResults);
                // Optionally: trigger emergency recovery, alert user, or halt further transitions
                this.transitionLock = false;
                return false;
            }

            // 4. Final validation after rollback
            if (!this.validateRollbackState(snapshot)) {
                console.error('[BossPhaseTransitionManager] Rollback state validation failed after rollback.');
                this.transitionLock = false;
                return false;
            }

            // 5. Dispatch rollback event
            const rollbackEvent = new CustomEvent('bossPhaseRollback', {
                detail: {
                    boss: this.boss,
                    snapshotId: snapshotId,
                    reason: reason,
                    rolledBackTo: snapshot.bossState.phase,
                    timestamp: Date.now(),
                    rollbackResults
                }
            });
            document.dispatchEvent(rollbackEvent);

            this.rollbacksPerformed++;
            this.transitionLock = false;
            console.log(`[BossPhaseTransitionManager] Rollback completed successfully to phase ${snapshot.bossState.phase}`);
            return true;
        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Rollback failed:`, error);
            this.transitionLock = false;
            return false;
        }
    }

    /**
     * Validate that the rollback snapshot is compatible with the current game state
     */
    validateRollbackCompatibility(snapshot) {
        // Example: ensure boss type matches, phase is valid, and snapshot is not too old
        if (!snapshot || !snapshot.bossState) return false;
        if (snapshot.bossState.phase < 1 || snapshot.bossState.phase > (this.boss.totalPhases || 10)) return false;
        if (snapshot.bossState.phase !== this.boss.phase && Math.abs(Date.now() - snapshot.timestamp) > 1000 * 60 * 10) return false; // 10 min max age
        if (snapshot.bossState && this.boss.type && snapshot.bossState.type && snapshot.bossState.type !== this.boss.type) return false;
        // Add more checks as needed
        return true;
    }

    /**
     * Validate that the rollback was successful and state is consistent
     */
    validateRollbackState(snapshot) {
        // Example: check boss phase, health, and UI
        if (this.boss.phase !== snapshot.bossState.phase) return false;
        if (this.boss.health !== snapshot.bossState.health) return false;
        // UI validation
        const phaseText = document.getElementById('bossPhaseText');
        if (phaseText && !phaseText.textContent.includes(`PHASE ${snapshot.bossState.phase}`)) return false;
        // Add more checks as needed
        return true;
    }
    
    async restoreBossState(bossState) {
        console.log(`[BossPhaseTransitionManager] Restoring boss state to phase ${bossState.phase}`);
        
        // Restore core properties
        this.boss.phase = bossState.phase;
        this.boss.health = bossState.health;
        this.boss.maxHealth = bossState.maxHealth;
        this.boss.speed = bossState.speed;
        this.boss.abilities = [...bossState.abilities];
        this.boss.x = bossState.x;
        this.boss.y = bossState.y;
        this.boss.pathIndex = bossState.pathIndex;
        this.boss.abilityTimer = bossState.abilityTimer;
        this.boss.abilitiesUsedCount = bossState.abilitiesUsedCount;
        this.boss.droneCount = bossState.droneCount;
        this.boss.minionsSpawned = bossState.minionsSpawned;
        
        // Reset phase manager if it exists
        if (this.boss.phaseManager) {
            this.boss.phaseManager.phaseStartTime = Date.now();
        }
    }
    
    async restoreGameState(gameState) {
        console.log(`[BossPhaseTransitionManager] Restoring game state`);
        
        // Restore disabled defenses
        if (this.game && this.game.defenses) {
            this.game.defenses.forEach(defense => {
                const wasDisabled = gameState.disabledDefenses.some(d => 
                    d.x === defense.x && d.y === defense.y
                );
                defense.disabled = wasDisabled;
                if (!wasDisabled) {
                    defense.disabledTime = 0;
                    defense.stunned = false;
                    defense.stunnedTime = 0;
                }
            });
        }
        
        // Restore taken defenses
        if (this.game && this.game.defenses) {
            this.game.defenses.forEach(defense => {
                const wasTaken = gameState.takenDefenses.some(d => 
                    d.x === defense.x && d.y === defense.y
                );
                if (defense.takenOver && !wasTaken) {
                    // Restore defense from takeover if it shouldn't be taken
                    if (this.boss.restoreDefenseFromTakeover) {
                        this.boss.restoreDefenseFromTakeover(defense);
                    }
                }
            });
        }
        
        // Handle drones (mark excess drones for removal)
        if (this.game && this.game.enemies) {
            const targetDroneCount = gameState.activeDrones;
            let currentDrones = this.game.enemies.filter(e => 
                e.parentBoss === this.boss && e.isDrone
            );
            
            while (currentDrones.length > targetDroneCount && currentDrones.length > 0) {
                const droneToRemove = currentDrones.pop();
                droneToRemove.health = 0; // Mark for removal
            }
        }
    }
    
    async synchronizeUIAfterRollback(phase) {
        // Update UI elements to reflect the rolled-back phase
        await this.synchronizeUIHealthBar(phase);
        await this.synchronizeUIPhaseIndicator(phase);
        
        // Show rollback notification
        if (this.game && this.game.showNotification) {
            this.game.showNotification(
                `Boss phase rolled back to ${phase}`, 
                '#ffaa00', 
                2000
            );
        }
    }
    
    // Helper methods for snapshots
    
    getDisabledDefensesSnapshot() {
        if (!this.game || !this.game.defenses) return [];
        
        return this.game.defenses
            .filter(d => d.disabled)
            .map(d => ({ x: d.x, y: d.y, disabledTime: d.disabledTime }));
    }
    
    getTakenDefensesSnapshot() {
        if (!this.game || !this.game.defenses) return [];
        
        return this.game.defenses
            .filter(d => d.takenOver)
            .map(d => ({ x: d.x, y: d.y, takeOverTime: d.takeOverTime }));
    }
    
    getActiveDronesSnapshot() {
        if (!this.game || !this.game.enemies) return 0;
        
        return this.game.enemies.filter(e => 
            e.parentBoss === this.boss && e.isDrone && e.health > 0
        ).length;
    }
    
    // Utility and management methods
    
    validateTransitionCompletion(transitionRequest) {
        const validation = { valid: true, reason: '' };
        
        // Check if phase actually changed
        if (this.boss.phase !== transitionRequest.targetPhase) {
            validation.valid = false;
            validation.reason = `Phase not updated: expected ${transitionRequest.targetPhase}, got ${this.boss.phase}`;
            return validation;
        }
        
        // Check if UI is synchronized
        const phaseText = document.getElementById('bossPhaseText');
        if (phaseText && !phaseText.textContent.includes(`PHASE ${transitionRequest.targetPhase}`)) {
            validation.valid = false;
            validation.reason = 'UI not synchronized with new phase';
            return validation;
        }
        
        // Check boss state consistency
        if (this.boss.health <= 0) {
            validation.valid = false;
            validation.reason = 'Boss died during transition';
            return validation;
        }
        
        return validation;
    }
    
    recordSuccessfulTransition(transitionRequest) {
        this.phaseHistory.push({
            phase: transitionRequest.targetPhase,
            timestamp: Date.now(),
            trigger: transitionRequest.trigger,
            healthPercent: this.boss.health / this.boss.maxHealth,
            attempts: transitionRequest.attempts,
            transitionId: transitionRequest.id
        });
        
        console.log(`[BossPhaseTransitionManager] Transition recorded: ${transitionRequest.currentPhase} -> ${transitionRequest.targetPhase}`);
    }
    
    handleFailedTransition(transitionRequest) {
        this.failedTransitions++;
        
        // Retry if attempts remaining
        if (transitionRequest.attempts < transitionRequest.maxAttempts) {
            console.log(`[BossPhaseTransitionManager] Retrying failed transition ${transitionRequest.id} (attempt ${transitionRequest.attempts + 1}/${transitionRequest.maxAttempts})`);
            transitionRequest.status = 'retry';
            this.transitionQueue.unshift(transitionRequest); // Put back at front of queue
        } else {
            console.error(`[BossPhaseTransitionManager] Transition ${transitionRequest.id} failed permanently after ${transitionRequest.attempts} attempts`);
            transitionRequest.status = 'failed';
            
            // Dispatch failure event
            const failureEvent = new CustomEvent('bossPhaseTransitionFailed', {
                detail: {
                    boss: this.boss,
                    transitionRequest: transitionRequest,
                    timestamp: Date.now()
                }
            });
            document.dispatchEvent(failureEvent);
        }
    }
    
    handleSynchronizationFailure(syncPoint, error) {
        console.error(`[BossPhaseTransitionManager] Synchronization failure at ${syncPoint}:`, error);
        
        // Attempt to recover sync point
        const recovery = this.attemptSyncRecovery(syncPoint);
        if (!recovery) {
            console.error(`[BossPhaseTransitionManager] Failed to recover sync point: ${syncPoint}`);
        }
    }
    
    attemptSyncRecovery(syncPoint) {
        try {
            // Basic recovery - re-synchronize current phase
            const currentPhase = this.boss.phase;
            
            switch (syncPoint) {
                case 'bossHealthBar':
                    this.synchronizeUIHealthBar(currentPhase);
                    return true;
                case 'phaseIndicator':
                    this.synchronizeUIPhaseIndicator(currentPhase);
                    return true;
                default:
                    return false;
            }
        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Sync recovery failed:`, error);
            return false;
        }
    }
    
    cleanupTransitionData(transitionId) {
        // Remove pending sync operations for this transition
        for (const [syncId, syncData] of this.pendingSyncOperations.entries()) {
            if (syncData.transitionId === transitionId) {
                this.pendingSyncOperations.delete(syncId);
            }
        }
        
        console.log(`[BossPhaseTransitionManager] Cleanup completed for transition ${transitionId}`);
    }
    
    generateTransitionId() {
        return `transition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Public interface methods
    
    /**
     * Request a phase transition (public interface)
     */
    requestPhaseTransition(targetPhase, trigger = 'manual', priority = 1) {
        return this.queuePhaseTransition(targetPhase, trigger, priority);
    }
    
    /**
     * Emergency rollback to last known good state
     */
    emergencyRollback(reason = 'Emergency rollback') {
        if (this.rollbackStack.length === 0) {
            console.error(`[BossPhaseTransitionManager] No snapshots available for emergency rollback`);
            return false;
        }
        
        const lastSnapshotId = this.rollbackStack[this.rollbackStack.length - 1];
        return this.rollbackTransition(lastSnapshotId, reason);
    }
    
    /**
     * Get transition system status
     */
    getStatus() {
        return {
            currentPhase: this.boss.phase,
            queueLength: this.transitionQueue.length,
            isProcessing: this.isProcessingTransition,
            isLocked: this.transitionLock,
            stats: {
                attempts: this.transitionAttempts,
                successful: this.successfulTransitions,
                failed: this.failedTransitions,
                rollbacks: this.rollbacksPerformed
            },
            phaseHistory: [...this.phaseHistory],
            pendingSyncOperations: this.pendingSyncOperations.size,
            availableRollbacks: this.rollbackStack.length
        };
    }
    
    /**
     * Cleanup method for boss defeat/removal
     */
    cleanup() {
        console.log(`[BossPhaseTransitionManager] Cleaning up transition manager for boss ${this.boss.type}`);
        
        // Clear queues and locks
        this.transitionQueue.length = 0;
        this.isProcessingTransition = false;
        this.transitionLock = false;
        
        // Clear snapshots
        this.phaseSnapshots.clear();
        this.rollbackStack.length = 0;
        
        // Clear pending operations
        this.pendingSyncOperations.clear();
        
        // Remove event listeners if needed
        // (Note: Global event listeners should be cleaned up by the game)
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BossPhaseTransitionManager;
}

// Make globally available for browser environments
if (typeof window !== 'undefined') {
    window.BossPhaseTransitionManager = BossPhaseTransitionManager;
}
