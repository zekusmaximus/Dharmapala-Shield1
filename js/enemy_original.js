// Dharmapala Shield - Advanced Enemy AI System

/**
 * Enhanced Boss Phase State Validator
 * Comprehensive validation system for boss phase transitions
 */
class BossPhaseStateValidator {
    constructor(boss) {
        this.boss = boss;
        this.validationRules = new Map();
        this.criticalErrors = new Set();
        this.warningThreshold = 3;
        this.errorHistory = [];
        
        this.initializeValidationRules();
    }

    initializeValidationRules() {
        // Phase transition validation rules
        this.validationRules.set('health_consistency', {
            priority: 'critical',
            validate: (currentState, targetPhase) => {
                return currentState.health > 0 && currentState.health <= currentState.maxHealth;
            },
            message: 'Boss health state is invalid'
        });

        this.validationRules.set('phase_progression', {
            priority: 'critical',
            validate: (currentState, targetPhase) => {
                // Allow emergency rollbacks or valid progressions
                return targetPhase > 0 && targetPhase <= 4 && 
                       (targetPhase === currentState.phase + 1 || 
                        targetPhase < currentState.phase || // Rollback allowed
                        currentState.emergencyTransition);
            },
            message: 'Invalid phase progression detected'
        });

        this.validationRules.set('ability_state', {
            priority: 'high',
            validate: (currentState, targetPhase) => {
                return Array.isArray(currentState.abilities) && 
                       !currentState.abilityExecuting ||
                       currentState.emergencyTransition;
            },
            message: 'Boss ability system in invalid state'
        });

        this.validationRules.set('animation_state', {
            priority: 'medium',
            validate: (currentState, targetPhase) => {
                return !currentState.criticalAnimationPlaying ||
                       currentState.emergencyTransition;
            },
            message: 'Critical animation in progress'
        });

        this.validationRules.set('cooldown_state', {
            priority: 'medium',
            validate: (currentState, targetPhase) => {
                return currentState.phaseTransitionCooldown <= 0 ||
                       currentState.emergencyTransition;
            },
            message: 'Phase transition still on cooldown'
        });

        this.validationRules.set('minion_state', {
            priority: 'low',
            validate: (currentState, targetPhase) => {
                // Don't block transitions for minion state issues
                return true;
            },
            message: 'Minion spawning state inconsistent'
        });
    }

    /**
     * Comprehensive pre-transition validation
     */
    validateTransition(targetPhase, context = {}) {
        const currentState = this.captureCurrentState();
        const validationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            canProceed: true,
            requiresEmergency: false,
            state: currentState
        };

        // Run all validation rules
        for (const [ruleName, rule] of this.validationRules) {
            try {
                const isValid = rule.validate(currentState, targetPhase);
                
                if (!isValid) {
                    const error = {
                        rule: ruleName,
                        priority: rule.priority,
                        message: rule.message,
                        timestamp: Date.now(),
                        context: context
                    };

                    if (rule.priority === 'critical') {
                        validationResult.errors.push(error);
                        validationResult.isValid = false;
                        this.criticalErrors.add(ruleName);
                    } else if (rule.priority === 'high') {
                        validationResult.warnings.push(error);
                        if (!context.emergencyTransition) {
                            validationResult.canProceed = false;
                        }
                    } else {
                        validationResult.warnings.push(error);
                    }
                }
            } catch (validationError) {
                console.error(`[BossPhaseStateValidator] Validation rule ${ruleName} failed:`, validationError);
                validationResult.warnings.push({
                    rule: ruleName,
                    priority: 'high',
                    message: `Validation rule error: ${validationError.message}`,
                    timestamp: Date.now()
                });
            }
        }

        // Record validation result
        this.errorHistory.push({
            targetPhase,
            result: validationResult,
            timestamp: Date.now()
        });

        // Cleanup old history
        if (this.errorHistory.length > 50) {
            this.errorHistory.shift();
        }

        // Determine if emergency transition is required
        if (validationResult.errors.length > 0 && context.allowEmergency) {
            validationResult.requiresEmergency = true;
            validationResult.canProceed = true;
        }

        console.log(`[BossPhaseStateValidator] Transition validation ${targetPhase}: ${validationResult.isValid ? 'PASSED' : 'FAILED'} (${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings)`);
        
        return validationResult;
    }

    /**
     * Capture current boss state for validation
     */
    captureCurrentState() {
        return {
            phase: this.boss.phase,
            health: this.boss.health,
            maxHealth: this.boss.maxHealth,
            isAlive: this.boss.isAlive,
            abilities: this.boss.abilities ? [...this.boss.abilities] : [],
            abilityExecuting: this.boss.abilityExecuting || false,
            criticalAnimationPlaying: this.boss.criticalAnimationPlaying || false,
            phaseTransitionCooldown: this.boss.phaseManager?.phaseTransitionCooldown || 0,
            minionsSpawned: this.boss.minionsSpawned || false,
            visualEffects: this.boss.visualEffects?.length || 0,
            emergencyTransition: this.boss.emergencyTransition || false,
            x: this.boss.x,
            y: this.boss.y,
            stunned: this.boss.stunned,
            slowEffect: this.boss.slowEffect,
            timestamp: Date.now()
        };
    }

    /**
     * Get validation summary for monitoring
     */
    getValidationSummary() {
        const recentErrors = this.errorHistory.slice(-10);
        const criticalCount = recentErrors.filter(h => h.result.errors.length > 0).length;
        
        return {
            criticalErrors: Array.from(this.criticalErrors),
            recentErrorCount: criticalCount,
            totalValidations: this.errorHistory.length,
            lastValidation: this.errorHistory[this.errorHistory.length - 1]?.timestamp || 0
        };
    }

    /**
     * Reset validation state
     */
    reset() {
        this.criticalErrors.clear();
        this.errorHistory = [];
    }
}

/**
 * Enhanced Boss Phase Transition Manager with comprehensive rollback system
 */
class BossPhaseTransitionManager {
    constructor(boss, game = null) {
        this.boss = boss;
        this.game = game;
        this.validator = new BossPhaseStateValidator(boss);
        
        // Enhanced transaction system
        this.transactionManager = new BossTransactionManager(this);
        this.rollbackValidator = new BossRollbackValidator(this);
        this.systemCoordinator = new BossSystemCoordinator(this, game);
        
        // State management
        this.stateHistory = [];
        this.maxHistorySize = 20; // Increased for better rollback capability
        this.validatedStates = new Map(); // Cache of validated states
        this.criticalStatePoints = new Set(); // Track critical state moments
        
        // Transition management
        this.pendingTransitions = new Map();
        this.transactionQueue = []; // Enhanced transaction queue
        this.isTransitioning = false;
        this.rollbackInProgress = false;
        this.transactionInProgress = false;
        
        // Enhanced rollback system
        this.rollbackPlan = null;
        this.rollbackValidationResults = new Map();
        this.cascadeFailureHandlers = new Map();
        this.systemStates = new Map(); // Track states across multiple systems
        
        // Statistics
        this.stats = {
            successfulTransitions: 0,
            failedTransitions: 0,
            rollbacks: 0,
            emergencyTransitions: 0,
            validationFailures: 0,
            transactionRollbacks: 0,
            cascadingFailures: 0,
            stateValidationChecks: 0
        };

        this.initializeEnhancedRollbackSystem();
        console.log(`[BossPhaseTransitionManager] Enhanced system initialized for boss ${boss.type}`);
    }

    /**
     * Initialize the enhanced rollback system with comprehensive validation
     */
    initializeEnhancedRollbackSystem() {
        // Set up cascade failure handlers
        this.setupCascadeFailureHandlers();
        
        // Initialize system state tracking
        this.initializeSystemStateTracking();
        
        // Set up validation checkpoints
        this.setupValidationCheckpoints();
        
        // Register with system coordinator
        this.systemCoordinator.registerSystem('achievements', this.game?.achievementManager);
        this.systemCoordinator.registerSystem('ui', this.game?.ui);
        this.systemCoordinator.registerSystem('audio', this.game?.audioManager);
        this.systemCoordinator.registerSystem('effects', this.game?.effectsManager);
        
        // Create initial baseline state
        this.createBaselineState();
    }

    /**
     * Setup cascade failure handlers for different system types
     */
    setupCascadeFailureHandlers() {
        // Achievement system failure handler
        this.cascadeFailureHandlers.set('achievements', {
            validate: (state) => this.validateAchievementSystemState(state),
            rollback: (targetState) => this.rollbackAchievementSystem(targetState),
            priority: 2
        });
        
        // UI system failure handler
        this.cascadeFailureHandlers.set('ui', {
            validate: (state) => this.validateUISystemState(state),
            rollback: (targetState) => this.rollbackUISystem(targetState),
            priority: 1
        });
        
        // Audio system failure handler
        this.cascadeFailureHandlers.set('audio', {
            validate: (state) => this.validateAudioSystemState(state),
            rollback: (targetState) => this.rollbackAudioSystem(targetState),
            priority: 3
        });
        
        // Effects system failure handler
        this.cascadeFailureHandlers.set('effects', {
            validate: (state) => this.validateEffectsSystemState(state),
            rollback: (targetState) => this.rollbackEffectsSystem(targetState),
            priority: 3
        });
    }

    /**
     * Initialize system state tracking across multiple game systems
     */
    initializeSystemStateTracking() {
        this.systemStates.set('boss', {
            lastValidState: this.captureBossState(),
            validationHistory: [],
            rollbackCapability: true
        });
        
        this.systemStates.set('achievements', {
            lastValidState: this.captureAchievementState(),
            validationHistory: [],
            rollbackCapability: true
        });
        
        this.systemStates.set('ui', {
            lastValidState: this.captureUIState(),
            validationHistory: [],
            rollbackCapability: true
        });
        
        this.systemStates.set('audio', {
            lastValidState: this.captureAudioState(),
            validationHistory: [],
            rollbackCapability: false // Audio doesn't need rollback
        });
        
        this.systemStates.set('effects', {
            lastValidState: this.captureEffectsState(),
            validationHistory: [],
            rollbackCapability: false // Effects can be regenerated
        });
    }

    /**
     * Enhanced request phase transition with transaction-like behavior
     */
    async requestPhaseTransitionTransaction(targetPhase, reason = 'Unknown', priority = 1, options = {}) {
        if (this.rollbackInProgress || this.transactionInProgress) {
            console.warn(`[BossPhaseTransitionManager] Rejecting transition request - operation in progress`);
            return { success: false, reason: 'Operation in progress' };
        }

        const transactionId = `transaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Start transaction
            const transaction = await this.transactionManager.beginTransaction(transactionId, {
                targetPhase,
                reason,
                priority,
                options
            });

            // Comprehensive pre-transaction validation
            const validationResult = await this.performComprehensiveValidation(targetPhase, transaction);
            
            if (!validationResult.canProceed) {
                await this.transactionManager.rollbackTransaction(transaction, 'Validation failed');
                this.stats.validationFailures++;
                return { success: false, reason: 'Validation failed', errors: validationResult.errors };
            }

            // Prepare rollback plan before execution
            const rollbackPlan = await this.prepareRollbackPlan(transaction);
            
            if (!rollbackPlan.viable) {
                await this.transactionManager.rollbackTransaction(transaction, 'Rollback plan not viable');
                return { success: false, reason: 'Rollback plan not viable' };
            }

            // Execute transaction with coordinated system updates
            const executionResult = await this.executeCoordinatedTransaction(transaction, rollbackPlan);
            
            if (executionResult.success) {
                await this.transactionManager.commitTransaction(transaction);
                this.stats.successfulTransitions++;
                return { success: true, transactionId, result: executionResult };
            } else {
                // Execute coordinated rollback
                await this.executeCoordinatedRollback(transaction, rollbackPlan, executionResult.error);
                return { success: false, reason: 'Transaction execution failed', error: executionResult.error };
            }

        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Transaction ${transactionId} failed:`, error);
            this.stats.failedTransitions++;
            return { success: false, reason: 'Transaction error', error: error.message };
        }
    }

    /**
     * Perform comprehensive validation across all systems
     */
    async performComprehensiveValidation(targetPhase, transaction) {
        this.stats.stateValidationChecks++;
        
        const validationResults = {
            canProceed: true,
            errors: [],
            warnings: [],
            systemValidations: new Map()
        };

        try {
            // Boss state validation
            const bossValidation = await this.validator.validateTransition(targetPhase, transaction);
            validationResults.systemValidations.set('boss', bossValidation);
            
            if (!bossValidation.canProceed) {
                validationResults.canProceed = false;
                validationResults.errors.push(...bossValidation.errors);
            }

            // System compatibility validation
            const systemCompatibility = await this.validateSystemCompatibility(targetPhase, transaction);
            validationResults.systemValidations.set('compatibility', systemCompatibility);
            
            if (!systemCompatibility.compatible) {
                validationResults.canProceed = false;
                validationResults.errors.push(...systemCompatibility.errors);
            }

            // Rollback state validation
            const rollbackValidation = await this.rollbackValidator.validateRollbackCapability();
            validationResults.systemValidations.set('rollback', rollbackValidation);
            
            if (!rollbackValidation.capable) {
                validationResults.warnings.push('Rollback capability limited');
            }

            // Cross-system state validation
            const crossSystemValidation = await this.validateCrossSystemState(targetPhase);
            validationResults.systemValidations.set('crossSystem', crossSystemValidation);
            
            if (!crossSystemValidation.valid) {
                validationResults.canProceed = false;
                validationResults.errors.push(...crossSystemValidation.errors);
            }

            return validationResults;

        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Comprehensive validation failed:`, error);
            return {
                canProceed: false,
                errors: [`Validation system error: ${error.message}`],
                warnings: [],
                systemValidations: validationResults.systemValidations
            };
        }
    }

    /**
     * Prepare comprehensive rollback plan
     */
    async prepareRollbackPlan(transaction) {
        const rollbackPlan = {
            viable: true,
            steps: [],
            systemSnapshots: new Map(),
            validationPoints: [],
            cascadeHandlers: []
        };

        try {
            // Capture current system states
            for (const [systemName, systemState] of this.systemStates) {
                if (systemState.rollbackCapability) {
                    const snapshot = await this.captureSystemSnapshot(systemName);
                    rollbackPlan.systemSnapshots.set(systemName, snapshot);
                }
            }

            // Plan rollback steps in reverse dependency order
            rollbackPlan.steps = [
                { system: 'effects', action: 'cleanup', priority: 1 },
                { system: 'audio', action: 'reset', priority: 2 },
                { system: 'ui', action: 'restore', priority: 3 },
                { system: 'achievements', action: 'rollback', priority: 4 },
                { system: 'boss', action: 'restore', priority: 5 }
            ];

            // Validate rollback plan viability
            const planValidation = await this.validateRollbackPlan(rollbackPlan);
            rollbackPlan.viable = planValidation.viable;

            if (!planValidation.viable) {
                console.warn(`[BossPhaseTransitionManager] Rollback plan not viable:`, planValidation.reasons);
            }

            return rollbackPlan;

        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Failed to prepare rollback plan:`, error);
            return { viable: false, error: error.message };
        }
    }

    /**
     * Execute coordinated transaction across all systems
     */
    async executeCoordinatedTransaction(transaction, rollbackPlan) {
        this.transactionInProgress = true;
        const executionResults = new Map();

        try {
            // Phase 1: Prepare all systems
            const preparationResults = await this.systemCoordinator.prepareAllSystems(transaction);
            if (!preparationResults.success) {
                return { success: false, error: 'System preparation failed', phase: 'preparation' };
            }

            // Phase 2: Execute boss transition
            const bossTransitionResult = await this.executeBossTransition(transaction);
            executionResults.set('boss', bossTransitionResult);

            if (!bossTransitionResult.success) {
                await this.systemCoordinator.abortAllSystems(transaction);
                return { success: false, error: 'Boss transition failed', phase: 'execution' };
            }

            // Phase 3: Coordinate system updates
            const systemUpdateResults = await this.systemCoordinator.executeSystemUpdates(transaction);
            executionResults.set('systems', systemUpdateResults);

            if (!systemUpdateResults.success) {
                // Attempt coordinated rollback
                await this.executeCoordinatedRollback(transaction, rollbackPlan, 'System updates failed');
                return { success: false, error: 'System updates failed', phase: 'coordination' };
            }

            // Phase 4: Validate final state
            const finalValidation = await this.validateFinalTransactionState(transaction);
            if (!finalValidation.valid) {
                await this.executeCoordinatedRollback(transaction, rollbackPlan, 'Final validation failed');
                return { success: false, error: 'Final validation failed', phase: 'validation' };
            }

            this.transactionInProgress = false;
            return { success: true, results: executionResults };

        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Coordinated transaction execution failed:`, error);
            this.transactionInProgress = false;
            return { success: false, error: error.message, phase: 'exception' };
        }
    }

    /**
     * Execute coordinated rollback with cascade failure handling
     */
    async executeCoordinatedRollback(transaction, rollbackPlan, reason) {
        if (this.rollbackInProgress) {
            console.warn(`[BossPhaseTransitionManager] Rollback already in progress`);
            return false;
        }

        console.warn(`[BossPhaseTransitionManager] Executing coordinated rollback: ${reason}`);
        this.rollbackInProgress = true;
        this.stats.transactionRollbacks++;

        try {
            const rollbackResults = new Map();
            let cascadeFailures = [];

            // Execute rollback steps in order of priority
            const sortedSteps = rollbackPlan.steps.sort((a, b) => a.priority - b.priority);

            for (const step of sortedSteps) {
                try {
                    const stepResult = await this.executeRollbackStep(step, rollbackPlan);
                    rollbackResults.set(step.system, stepResult);

                    if (!stepResult.success) {
                        cascadeFailures.push({
                            system: step.system,
                            error: stepResult.error,
                            handled: false
                        });
                    }

                } catch (stepError) {
                    console.error(`[BossPhaseTransitionManager] Rollback step failed for ${step.system}:`, stepError);
                    cascadeFailures.push({
                        system: step.system,
                        error: stepError.message,
                        handled: false
                    });
                }
            }

            // Handle cascade failures
            if (cascadeFailures.length > 0) {
                await this.handleCascadeFailures(cascadeFailures, rollbackPlan);
                this.stats.cascadingFailures += cascadeFailures.length;
            }

            // Validate rollback completion
            const rollbackValidation = await this.validateRollbackCompletion(rollbackPlan);
            
            if (rollbackValidation.valid) {
                console.log(`[BossPhaseTransitionManager] Coordinated rollback completed successfully`);
                this.rollbackInProgress = false;
                return true;
            } else {
                console.error(`[BossPhaseTransitionManager] Rollback validation failed:`, rollbackValidation.errors);
                await this.handleRollbackValidationFailure(rollbackValidation);
                this.rollbackInProgress = false;
                return false;
            }

        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Coordinated rollback failed:`, error);
            this.rollbackInProgress = false;
            
            // Emergency fallback
            await this.executeEmergencyFallback(reason, error);
            return false;
        }
    }

    /**
     * Handle cascade failures during rollback
     */
    async handleCascadeFailures(cascadeFailures, rollbackPlan) {
        console.warn(`[BossPhaseTransitionManager] Handling ${cascadeFailures.length} cascade failures`);

        for (const failure of cascadeFailures) {
            const handler = this.cascadeFailureHandlers.get(failure.system);
            
            if (handler) {
                try {
                    const handlerResult = await handler.rollback(rollbackPlan.systemSnapshots.get(failure.system));
                    
                    if (handlerResult.success) {
                        failure.handled = true;
                        console.log(`[BossPhaseTransitionManager] Cascade failure handled for ${failure.system}`);
                    } else {
                        console.error(`[BossPhaseTransitionManager] Failed to handle cascade failure for ${failure.system}:`, handlerResult.error);
                    }

                } catch (handlerError) {
                    console.error(`[BossPhaseTransitionManager] Cascade failure handler error for ${failure.system}:`, handlerError);
                }
            } else {
                console.warn(`[BossPhaseTransitionManager] No cascade failure handler for ${failure.system}`);
            }
        }

        // Report unhandled failures
        const unhandledFailures = cascadeFailures.filter(f => !f.handled);
        if (unhandledFailures.length > 0) {
            console.error(`[BossPhaseTransitionManager] ${unhandledFailures.length} cascade failures remain unhandled`);
            
            // Dispatch critical failure event
            const event = new CustomEvent('bossCriticalRollbackFailure', {
                detail: {
                    boss: this.boss,
                    unhandledFailures,
                    timestamp: Date.now()
                }
            });
            document.dispatchEvent(event);
        }
    }

    /**
     * Execute emergency fallback when coordinated rollback fails
     */
    async executeEmergencyFallback(originalReason, rollbackError) {
        console.error(`[BossPhaseTransitionManager] Executing emergency fallback - Original: ${originalReason}, Rollback error: ${rollbackError.message}`);

        try {
            // Find the most recent validated baseline state
            const baselineState = this.findValidatedBaselineState();
            
            if (baselineState) {
                // Force restore to baseline
                await this.forceRestoreToBaseline(baselineState);
                
                // Dispatch emergency recovery event
                const event = new CustomEvent('bossEmergencyRecovery', {
                    detail: {
                        boss: this.boss,
                        baselineState,
                        originalReason,
                        rollbackError: rollbackError.message,
                        timestamp: Date.now()
                    }
                });
                document.dispatchEvent(event);

                console.log(`[BossPhaseTransitionManager] Emergency fallback completed - restored to baseline`);
                return true;

            } else {
                // Critical failure - no baseline available
                console.error(`[BossPhaseTransitionManager] CRITICAL: No baseline state available for emergency fallback`);
                
                const event = new CustomEvent('bossCriticalFailure', {
                    detail: {
                        boss: this.boss,
                        originalReason,
                        rollbackError: rollbackError.message,
                        timestamp: Date.now()
                    }
                });
                document.dispatchEvent(event);

                return false;
            }

        } catch (fallbackError) {
            console.error(`[BossPhaseTransitionManager] Emergency fallback failed:`, fallbackError);
            return false;
        }
    }

    /**
     * Validate system compatibility for transition
     */
    async validateSystemCompatibility(targetPhase, transaction) {
        const compatibilityResult = {
            compatible: true,
            errors: [],
            warnings: [],
            systemChecks: new Map()
        };

        try {
            // Check achievement system compatibility
            if (this.game?.achievementManager) {
                const achievementCheck = await this.validateAchievementSystemCompatibility(targetPhase);
                compatibilityResult.systemChecks.set('achievements', achievementCheck);
                
                if (!achievementCheck.compatible) {
                    compatibilityResult.compatible = false;
                    compatibilityResult.errors.push(...achievementCheck.errors);
                }
            }

            // Check UI system compatibility
            const uiCheck = await this.validateUISystemCompatibility(targetPhase);
            compatibilityResult.systemChecks.set('ui', uiCheck);
            
            if (!uiCheck.compatible) {
                compatibilityResult.compatible = false;
                compatibilityResult.errors.push(...uiCheck.errors);
            }

            // Check audio system compatibility
            if (this.game?.audioManager) {
                const audioCheck = await this.validateAudioSystemCompatibility(targetPhase);
                compatibilityResult.systemChecks.set('audio', audioCheck);
                
                if (!audioCheck.compatible) {
                    compatibilityResult.warnings.push(...audioCheck.warnings);
                }
            }

            return compatibilityResult;

        } catch (error) {
            console.error(`[BossPhaseTransitionManager] System compatibility validation failed:`, error);
            return {
                compatible: false,
                errors: [`System compatibility check failed: ${error.message}`],
                warnings: [],
                systemChecks: compatibilityResult.systemChecks
            };
        }
    }

    /**
     * Validate cross-system state consistency
     */
    async validateCrossSystemState(targetPhase) {
        const validationResult = {
            valid: true,
            errors: [],
            warnings: [],
            inconsistencies: []
        };

        try {
            // Check boss-achievement consistency
            if (this.game?.achievementManager) {
                const bossAchievementSync = this.validateBossAchievementSync(targetPhase);
                if (!bossAchievementSync.synced) {
                    validationResult.inconsistencies.push({
                        systems: ['boss', 'achievements'],
                        issue: bossAchievementSync.issue,
                        severity: 'medium'
                    });
                }
            }

            // Check boss-UI consistency
            const bossUISync = this.validateBossUISync(targetPhase);
            if (!bossUISync.synced) {
                validationResult.inconsistencies.push({
                    systems: ['boss', 'ui'],
                    issue: bossUISync.issue,
                    severity: 'high'
                });
            }

            // Evaluate overall consistency
            const highSeverityIssues = validationResult.inconsistencies.filter(i => i.severity === 'high');
            if (highSeverityIssues.length > 0) {
                validationResult.valid = false;
                validationResult.errors = highSeverityIssues.map(i => i.issue);
            }

            const mediumSeverityIssues = validationResult.inconsistencies.filter(i => i.severity === 'medium');
            if (mediumSeverityIssues.length > 0) {
                validationResult.warnings = mediumSeverityIssues.map(i => i.issue);
            }

            return validationResult;

        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Cross-system validation failed:`, error);
            return {
                valid: false,
                errors: [`Cross-system validation error: ${error.message}`],
                warnings: [],
                inconsistencies: []
            };
        }
    }

    /**
     * Capture comprehensive system snapshot
     */
    async captureSystemSnapshot(systemName) {
        const timestamp = Date.now();
        
        try {
            switch (systemName) {
                case 'boss':
                    return {
                        ...this.captureBossState(),
                        timestamp,
                        validated: true
                    };
                
                case 'achievements':
                    return {
                        ...this.captureAchievementState(),
                        timestamp,
                        validated: this.game?.achievementManager ? true : false
                    };
                
                case 'ui':
                    return {
                        ...this.captureUIState(),
                        timestamp,
                        validated: true
                    };
                
                case 'audio':
                    return {
                        ...this.captureAudioState(),
                        timestamp,
                        validated: this.game?.audioManager ? true : false
                    };
                
                case 'effects':
                    return {
                        ...this.captureEffectsState(),
                        timestamp,
                        validated: true
                    };
                
                default:
                    throw new Error(`Unknown system: ${systemName}`);
            }
        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Failed to capture ${systemName} snapshot:`, error);
            return {
                timestamp,
                validated: false,
                error: error.message
            };
        }
    }

    /**
     * Execute individual rollback step
     */
    async executeRollbackStep(step, rollbackPlan) {
        const stepStartTime = Date.now();
        
        try {
            const snapshot = rollbackPlan.systemSnapshots.get(step.system);
            
            if (!snapshot || !snapshot.validated) {
                return {
                    success: false,
                    error: `Invalid snapshot for ${step.system}`,
                    duration: Date.now() - stepStartTime
                };
            }

            switch (step.system) {
                case 'boss':
                    return await this.rollbackBossSystem(snapshot);
                
                case 'achievements':
                    return await this.rollbackAchievementSystem(snapshot);
                
                case 'ui':
                    return await this.rollbackUISystem(snapshot);
                
                case 'audio':
                    return await this.rollbackAudioSystem(snapshot);
                
                case 'effects':
                    return await this.rollbackEffectsSystem(snapshot);
                
                default:
                    return {
                        success: false,
                        error: `Unknown rollback system: ${step.system}`,
                        duration: Date.now() - stepStartTime
                    };
            }

        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Rollback step execution failed for ${step.system}:`, error);
            return {
                success: false,
                error: error.message,
                duration: Date.now() - stepStartTime
            };
        }
    }

    /**
     * System-specific state capture methods
     */
    captureBossState() {
        return {
            phase: this.boss.phase,
            health: this.boss.health,
            maxHealth: this.boss.maxHealth,
            speed: this.boss.speed,
            x: this.boss.x,
            y: this.boss.y,
            abilities: this.boss.abilities ? [...this.boss.abilities] : [],
            minionsSpawned: this.boss.minionsSpawned || false,
            emergencyTransition: this.boss.emergencyTransition || false,
            stable: this.isStateStable()
        };
    }

    captureAchievementState() {
        if (!this.game?.achievementManager) {
            return { unavailable: true };
        }

        try {
            return {
                unlockedAchievements: [...(this.game.achievementManager.unlockedAchievements || [])],
                achievementProgress: new Map(this.game.achievementManager.achievementProgress || []),
                bossPhaseAchievements: this.game.achievementManager.getBossPhaseProgress?.(this.boss.type) || {},
                available: true
            };
        } catch (error) {
            console.warn(`[BossPhaseTransitionManager] Failed to capture achievement state:`, error);
            return { unavailable: true, error: error.message };
        }
    }

    captureUIState() {
        try {
            const bossHealthBar = document.getElementById('bossHealthContainer');
            const phaseIndicator = document.getElementById('bossPhaseText');
            
            return {
                bossHealthVisible: bossHealthBar ? bossHealthBar.style.display !== 'none' : false,
                bossHealthPercent: bossHealthBar ? this.extractHealthPercent(bossHealthBar) : 0,
                phaseText: phaseIndicator ? phaseIndicator.textContent : '',
                phaseIndicatorVisible: phaseIndicator ? phaseIndicator.style.display !== 'none' : false,
                available: true
            };
        } catch (error) {
            console.warn(`[BossPhaseTransitionManager] Failed to capture UI state:`, error);
            return { unavailable: true, error: error.message };
        }
    }

    captureAudioState() {
        if (!this.game?.audioManager) {
            return { unavailable: true };
        }

        try {
            return {
                currentBossTrack: this.game.audioManager.currentBossTrack || null,
                volume: this.game.audioManager.masterVolume || 1.0,
                bossPhaseAudio: this.game.audioManager.getBossPhaseAudio?.(this.boss.type, this.boss.phase) || null,
                available: true
            };
        } catch (error) {
            console.warn(`[BossPhaseTransitionManager] Failed to capture audio state:`, error);
            return { unavailable: true, error: error.message };
        }
    }

    captureEffectsState() {
        try {
            return {
                activeEffects: this.boss.visualEffects ? this.boss.visualEffects.length : 0,
                transitionEffectsActive: this.boss.transitionEffectsActive || false,
                effectsQueue: this.boss.effectsQueue ? [...this.boss.effectsQueue] : [],
                available: true
            };
        } catch (error) {
            console.warn(`[BossPhaseTransitionManager] Failed to capture effects state:`, error);
            return { unavailable: true, error: error.message };
        }
    }

    /**
     * System-specific rollback methods
     */
    async rollbackBossSystem(snapshot) {
        const startTime = Date.now();
        
        try {
            this.boss.phase = snapshot.phase;
            this.boss.health = Math.min(snapshot.health, this.boss.maxHealth);
            this.boss.speed = snapshot.speed;
            this.boss.abilities = snapshot.abilities ? [...snapshot.abilities] : [];
            this.boss.minionsSpawned = snapshot.minionsSpawned;
            this.boss.emergencyTransition = snapshot.emergencyTransition || false;
            
            // Clear any ongoing effects
            this.boss.abilityExecuting = false;
            
            return {
                success: true,
                duration: Date.now() - startTime,
                restoredPhase: snapshot.phase
            };

        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Boss system rollback failed:`, error);
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    async rollbackAchievementSystem(snapshot) {
        const startTime = Date.now();
        
        if (!this.game?.achievementManager || snapshot.unavailable) {
            return {
                success: true, // No-op if not available
                duration: Date.now() - startTime,
                skipped: true
            };
        }

        try {
            // Restore achievement state carefully
            if (this.game.achievementManager.rollbackBossPhaseProgress) {
                await this.game.achievementManager.rollbackBossPhaseProgress(
                    this.boss.type, 
                    snapshot.bossPhaseAchievements
                );
            }

            return {
                success: true,
                duration: Date.now() - startTime,
                restoredAchievements: Object.keys(snapshot.bossPhaseAchievements || {}).length
            };

        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Achievement system rollback failed:`, error);
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    async rollbackUISystem(snapshot) {
        const startTime = Date.now();
        
        if (snapshot.unavailable) {
            return {
                success: true,
                duration: Date.now() - startTime,
                skipped: true
            };
        }

        try {
            // Restore boss health bar
            const bossHealthBar = document.getElementById('bossHealthContainer');
            if (bossHealthBar) {
                bossHealthBar.style.display = snapshot.bossHealthVisible ? 'block' : 'none';
                this.updateHealthBar(bossHealthBar, snapshot.bossHealthPercent);
            }

            // Restore phase indicator
            const phaseIndicator = document.getElementById('bossPhaseText');
            if (phaseIndicator) {
                phaseIndicator.textContent = snapshot.phaseText;
                phaseIndicator.style.display = snapshot.phaseIndicatorVisible ? 'block' : 'none';
            }

            return {
                success: true,
                duration: Date.now() - startTime,
                restoredElements: ['healthBar', 'phaseIndicator']
            };

        } catch (error) {
            console.error(`[BossPhaseTransitionManager] UI system rollback failed:`, error);
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    async rollbackAudioSystem(snapshot) {
        const startTime = Date.now();
        
        if (!this.game?.audioManager || snapshot.unavailable) {
            return {
                success: true,
                duration: Date.now() - startTime,
                skipped: true
            };
        }

        try {
            // Audio rollback is generally not critical
            // Just ensure we're not in an inconsistent state
            if (this.game.audioManager.setBossPhaseAudio) {
                this.game.audioManager.setBossPhaseAudio(this.boss.type, this.boss.phase);
            }

            return {
                success: true,
                duration: Date.now() - startTime,
                note: 'Audio system rollback completed - non-critical'
            };

        } catch (error) {
            console.warn(`[BossPhaseTransitionManager] Audio system rollback warning:`, error);
            return {
                success: true, // Non-critical failure
                warning: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    async rollbackEffectsSystem(snapshot) {
        const startTime = Date.now();
        
        try {
            // Clear current effects
            if (this.boss.visualEffects) {
                this.boss.visualEffects = [];
            }
            
            this.boss.transitionEffectsActive = false;
            
            if (this.boss.effectsQueue) {
                this.boss.effectsQueue = [];
            }

            return {
                success: true,
                duration: Date.now() - startTime,
                clearedEffects: snapshot.activeEffects || 0
            };

        } catch (error) {
            console.warn(`[BossPhaseTransitionManager] Effects system rollback warning:`, error);
            return {
                success: true, // Non-critical failure
                warning: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Create baseline state for emergency fallback
     */
    createBaselineState() {
        const baselineState = {
            timestamp: Date.now(),
            phase: this.boss.phase || 1,
            bossState: this.captureBossState(),
            systemStates: new Map(),
            validated: true,
            isBaseline: true
        };

        // Capture all system states
        for (const [systemName] of this.systemStates) {
            baselineState.systemStates.set(systemName, this.captureSystemSnapshot(systemName));
        }

        this.criticalStatePoints.add(baselineState);
        console.log(`[BossPhaseTransitionManager] Baseline state created for phase ${baselineState.phase}`);
    }

    /**
     * Find validated baseline state for emergency recovery
     */
    findValidatedBaselineState() {
        // Look for the most recent validated baseline
        const sortedBaselines = Array.from(this.criticalStatePoints)
            .filter(state => state.isBaseline && state.validated)
            .sort((a, b) => b.timestamp - a.timestamp);

        return sortedBaselines.length > 0 ? sortedBaselines[0] : null;
    }

    /**
     * Force restore to baseline state
     */
    async forceRestoreToBaseline(baselineState) {
        try {
            console.log(`[BossPhaseTransitionManager] Force restoring to baseline state (phase ${baselineState.phase})`);

            // Restore boss state directly
            const bossSnapshot = baselineState.bossState;
            this.boss.phase = bossSnapshot.phase;
            this.boss.health = bossSnapshot.health;
            this.boss.maxHealth = bossSnapshot.maxHealth;
            this.boss.speed = bossSnapshot.speed;
            this.boss.x = bossSnapshot.x;
            this.boss.y = bossSnapshot.y;
            this.boss.abilities = bossSnapshot.abilities ? [...bossSnapshot.abilities] : [];
            this.boss.minionsSpawned = bossSnapshot.minionsSpawned;

            // Clear all flags
            this.boss.emergencyTransition = false;
            this.boss.abilityExecuting = false;
            this.isTransitioning = false;
            this.transactionInProgress = false;

            // Clear queues
            this.transactionQueue = [];
            this.pendingTransitions.clear();

            // Restore critical UI elements
            await this.forceRestoreUI(baselineState.systemStates.get('ui'));

            console.log(`[BossPhaseTransitionManager] Baseline restoration completed`);
            return true;

        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Force baseline restore failed:`, error);
            return false;
        }
    }

    /**
     * Queue transition with priority handling
     */
    queueTransition(transitionRequest) {
        this.pendingTransitions.set(transitionRequest.id, transitionRequest);
        
        // Insert into queue based on priority
        let inserted = false;
        for (let i = 0; i < this.transitionQueue.length; i++) {
            if (this.transitionQueue[i].priority < transitionRequest.priority) {
                this.transitionQueue.splice(i, 0, transitionRequest);
                inserted = true;
                break;
            }
        }
        
        if (!inserted) {
            this.transitionQueue.push(transitionRequest);
        }

        console.log(`[BossPhaseTransitionManager] Queued transition ${transitionRequest.id} (queue size: ${this.transitionQueue.length})`);
        
        // Process queue if not currently transitioning
        if (!this.isTransitioning) {
            this.processTransitionQueue();
        }
    }

    /**
     * Process pending transitions from queue
     */
    async processTransitionQueue() {
        if (this.isTransitioning || this.transitionQueue.length === 0) return;

        this.isTransitioning = true;
        
        while (this.transitionQueue.length > 0) {
            const request = this.transitionQueue.shift();
            
            try {
                await this.executeTransition(request);
            } catch (error) {
                console.error(`[BossPhaseTransitionManager] Failed to execute transition ${request.id}:`, error);
                this.handleTransitionFailure(request, error);
            }
            
            // Brief pause between transitions
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.isTransitioning = false;
    }

    /**
     * Execute a validated phase transition
     */
    async executeTransition(transitionRequest) {
        const startTime = Date.now();
        
        try {
            // Capture pre-transition state for potential rollback
            const preTransitionState = this.captureState();
            this.addToStateHistory(preTransitionState);
            
            // Re-validate just before execution
            const finalValidation = this.validator.validateTransition(
                transitionRequest.targetPhase, 
                { 
                    ...transitionRequest, 
                    finalValidation: true 
                }
            );

            if (!finalValidation.canProceed && transitionRequest.priority < 3) {
                throw new Error(`Final validation failed: ${finalValidation.errors.map(e => e.message).join(', ')}`);
            }

            // Execute the transition
            const oldPhase = this.boss.phase;
            
            // Apply phase change
            this.boss.phase = transitionRequest.targetPhase;
            
            // Apply phase-specific changes
            this.boss.applyPhaseChanges(
                transitionRequest.targetPhase, 
                this.game?.defenses || [], 
                this.game?.enemies || []
            );

            // Create transition effects
            this.boss.createPhaseTransitionEffect();

            // Update phase manager
            if (this.boss.phaseManager) {
                this.boss.phaseManager.phaseStartTime = Date.now();
                this.boss.phaseManager.phaseTransitionCooldown = 2000; // 2 second cooldown
            }

            // Dispatch success event
            const event = new CustomEvent('bossPhaseTransitionSuccess', {
                detail: {
                    enemy: this.boss,
                    transitionId: transitionRequest.id,
                    oldPhase,
                    newPhase: transitionRequest.targetPhase,
                    reason: transitionRequest.reason,
                    duration: Date.now() - startTime,
                    managed: true
                }
            });
            document.dispatchEvent(event);

            // Update statistics
            this.stats.successfulTransitions++;
            this.pendingTransitions.delete(transitionRequest.id);

            console.log(`[BossPhaseTransitionManager] Successfully transitioned ${this.boss.type} from phase ${oldPhase} to ${transitionRequest.targetPhase} (${Date.now() - startTime}ms)`);
            
            return true;

        } catch (error) {
            this.handleTransitionFailure(transitionRequest, error);
            throw error;
        }
    }

    /**
     * Execute emergency transition with minimal validation
     */
    executeEmergencyTransition(transitionRequest) {
        console.warn(`[BossPhaseTransitionManager] Executing EMERGENCY transition ${transitionRequest.id}`);
        
        try {
            // Capture state for emergency rollback
            const emergencyState = this.captureState();
            emergencyState.isEmergency = true;
            this.addToStateHistory(emergencyState);

            // Set emergency flag
            this.boss.emergencyTransition = true;

            const oldPhase = this.boss.phase;
            
            // Direct phase change
            this.boss.phase = transitionRequest.targetPhase;
            
            // Apply emergency changes (simplified)
            const phaseConfig = CONFIG.BOSS_PHASES?.[this.boss.type]?.[transitionRequest.targetPhase];
            if (phaseConfig) {
                if (phaseConfig.speedMultiplier) {
                    this.boss.speed *= phaseConfig.speedMultiplier;
                }
                if (phaseConfig.healthRegen) {
                    this.boss.health = Math.min(
                        this.boss.health + this.boss.maxHealth * phaseConfig.healthRegen, 
                        this.boss.maxHealth
                    );
                }
            }

            // Emergency effect
            this.createEmergencyTransitionEffect();

            // Dispatch emergency event
            const event = new CustomEvent('bossEmergencyPhaseTransition', {
                detail: {
                    enemy: this.boss,
                    transitionId: transitionRequest.id,
                    oldPhase,
                    newPhase: transitionRequest.targetPhase,
                    reason: transitionRequest.reason,
                    timestamp: Date.now()
                }
            });
            document.dispatchEvent(event);

            // Reset emergency flag
            setTimeout(() => {
                this.boss.emergencyTransition = false;
            }, 1000);

            this.stats.emergencyTransitions++;
            this.pendingTransitions.delete(transitionRequest.id);

            return transitionRequest.id;

        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Emergency transition failed:`, error);
            this.stats.failedTransitions++;
            return null;
        }
    }

    /**
     * Enhanced rollback mechanism for failed transitions
     */
    emergencyRollback(reason = 'System error') {
        if (this.rollbackInProgress) {
            console.warn(`[BossPhaseTransitionManager] Rollback already in progress`);
            return false;
        }

        console.warn(`[BossPhaseTransitionManager] Initiating emergency rollback: ${reason}`);
        
        this.rollbackInProgress = true;

        try {
            // Find the most recent stable state
            const stableState = this.findStableState();
            
            if (!stableState) {
                console.error(`[BossPhaseTransitionManager] No stable state found for rollback`);
                this.rollbackInProgress = false;
                return false;
            }

            // Apply rollback
            const rollbackSuccess = this.applyStateRollback(stableState);
            
            if (rollbackSuccess) {
                // Dispatch rollback event
                const event = new CustomEvent('bossPhaseRollback', {
                    detail: {
                        enemy: this.boss,
                        reason,
                        rolledBackTo: stableState.phase,
                        timestamp: Date.now()
                    }
                });
                document.dispatchEvent(event);

                this.stats.rollbacks++;
                console.log(`[BossPhaseTransitionManager] Emergency rollback successful to phase ${stableState.phase}`);
            }

            this.rollbackInProgress = false;
            return rollbackSuccess;

        } catch (error) {
            console.error(`[BossPhaseTransitionManager] Rollback failed:`, error);
            this.rollbackInProgress = false;
            return false;
        }
    }

    /**
     * Handle transition failures with retry logic
     */
    handleTransitionFailure(transitionRequest, error) {
        console.error(`[BossPhaseTransitionManager] Transition ${transitionRequest.id} failed:`, error);
        
        transitionRequest.attempts++;
        
        if (transitionRequest.attempts < transitionRequest.maxAttempts) {
            // Retry with emergency priority
            transitionRequest.priority = Math.max(transitionRequest.priority, 3);
            setTimeout(() => {
                this.queueTransition(transitionRequest);
            }, 500);
            
            console.log(`[BossPhaseTransitionManager] Retrying transition ${transitionRequest.id} (attempt ${transitionRequest.attempts + 1}/${transitionRequest.maxAttempts})`);
        } else {
            // Attempt rollback after max failures
            this.stats.failedTransitions++;
            this.pendingTransitions.delete(transitionRequest.id);
            
            if (transitionRequest.priority >= 2) {
                this.emergencyRollback(`Max retries exceeded for transition ${transitionRequest.id}`);
            }
        }
    }

    /**
     * Capture current boss state
     */
    captureState() {
        return {
            phase: this.boss.phase,
            health: this.boss.health,
            maxHealth: this.boss.maxHealth,
            speed: this.boss.speed,
            x: this.boss.x,
            y: this.boss.y,
            abilities: this.boss.abilities ? [...this.boss.abilities] : [],
            minionsSpawned: this.boss.minionsSpawned || false,
            timestamp: Date.now(),
            stable: this.isStateStable()
        };
    }

    /**
     * Check if current state is stable for rollback purposes
     */
    isStateStable() {
        return this.boss.isAlive && 
               this.boss.health > 0 &&
               !this.boss.emergencyTransition &&
               !this.isTransitioning &&
               (!this.boss.abilityExecuting || false);
    }

    /**
     * Add state to history with size management
     */
    addToStateHistory(state) {
        this.stateHistory.push(state);
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
        }
    }

    /**
     * Find the most recent stable state for rollback
     */
    findStableState() {
        for (let i = this.stateHistory.length - 1; i >= 0; i--) {
            const state = this.stateHistory[i];
            if (state.stable && !state.isEmergency) {
                return state;
            }
        }
        return null;
    }

    /**
     * Apply state rollback
     */
    applyStateRollback(targetState) {
        try {
            this.boss.phase = targetState.phase;
            this.boss.health = Math.min(targetState.health, this.boss.maxHealth);
            this.boss.speed = targetState.speed;
            this.boss.abilities = targetState.abilities ? [...targetState.abilities] : [];
            this.boss.minionsSpawned = targetState.minionsSpawned;
            
            // Reset any ongoing effects
            this.boss.emergencyTransition = false;
            this.boss.abilityExecuting = false;
            
            // Clear transition queue
            this.transitionQueue = [];
            this.pendingTransitions.clear();
            
            return true;
        } catch (error) {
            console.error(`[BossPhaseTransitionManager] State rollback failed:`, error);
            return false;
        }
    }

    /**
     * Create visual effect for emergency transitions
     */
    createEmergencyTransitionEffect() {
        if (!this.boss.visualEffects) {
            this.boss.visualEffects = [];
        }

        // Red warning effect
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            this.boss.visualEffects.push({
                x: this.boss.x + Math.cos(angle) * 30,
                y: this.boss.y + Math.sin(angle) * 30,
                vx: Math.cos(angle) * 150,
                vy: Math.sin(angle) * 150,
                life: 1000,
                maxLife: 1000,
                color: '#ff0000',
                size: 6,
                type: 'emergency'
            });
        }
    }

    /**
     * Get transition manager statistics
     */
    getStats() {
        return {
            ...this.stats,
            queueSize: this.transitionQueue.length,
            pendingTransitions: this.pendingTransitions.size,
            stateHistorySize: this.stateHistory.length,
            validation: this.validator.getValidationSummary(),
            isTransitioning: this.isTransitioning,
            rollbackInProgress: this.rollbackInProgress
        };
    }

    /**
     * Cleanup method for proper resource disposal
     */
    cleanup() {
        console.log(`[BossPhaseTransitionManager] Cleaning up transition manager for ${this.boss?.type || 'unknown'}`);
        
        // Clear all pending operations
        this.transitionQueue = [];
        this.pendingTransitions.clear();
        
        // Clear state history
        this.stateHistory = [];
        
        // Reset flags
        this.isTransitioning = false;
        this.rollbackInProgress = false;
        
        // Cleanup validator
        if (this.validator) {
            this.validator.reset();
        }
        
        // Clear references
        this.boss = null;
        this.game = null;
        this.validator = null;
    }

}

/**
 * Boss Transaction Manager for coordinated state changes
 */
class BossTransactionManager {
    constructor(phaseManager) {
        this.phaseManager = phaseManager;
        this.activeTransactions = new Map();
        this.transactionLog = [];
        this.maxLogSize = 100;
    }

    async beginTransaction(transactionId, transactionData) {
        const transaction = {
            id: transactionId,
            data: transactionData,
            startTime: Date.now(),
            status: 'active',
            checkpoints: [],
            rollbackData: new Map(),
            systems: new Set()
        };

        this.activeTransactions.set(transactionId, transaction);
        this.logTransaction(transaction, 'begin');

        return transaction;
    }

    async commitTransaction(transaction) {
        transaction.status = 'committed';
        transaction.endTime = Date.now();
        transaction.duration = transaction.endTime - transaction.startTime;

        this.logTransaction(transaction, 'commit');
        this.activeTransactions.delete(transaction.id);

        return { success: true, transaction };
    }

    async rollbackTransaction(transaction, reason) {
        transaction.status = 'rolled_back';
        transaction.rollbackReason = reason;
        transaction.endTime = Date.now();
        transaction.duration = transaction.endTime - transaction.startTime;

        this.logTransaction(transaction, 'rollback');
        this.activeTransactions.delete(transaction.id);

        return { success: true, transaction, reason };
    }

    createCheckpoint(transaction, checkpointData) {
        const checkpoint = {
            timestamp: Date.now(),
            data: checkpointData,
            systemStates: new Map()
        };

        transaction.checkpoints.push(checkpoint);
        return checkpoint;
    }

    logTransaction(transaction, action) {
        const logEntry = {
            transactionId: transaction.id,
            action,
            timestamp: Date.now(),
            data: {
                targetPhase: transaction.data.targetPhase,
                reason: transaction.data.reason,
                priority: transaction.data.priority,
                status: transaction.status,
                duration: transaction.duration
            }
        };

        this.transactionLog.push(logEntry);

        if (this.transactionLog.length > this.maxLogSize) {
            this.transactionLog.shift();
        }
    }

    getTransactionStats() {
        const completedTransactions = this.transactionLog.filter(log => 
            log.action === 'commit' || log.action === 'rollback'
        );

        const commits = completedTransactions.filter(log => log.action === 'commit').length;
        const rollbacks = completedTransactions.filter(log => log.action === 'rollback').length;

        return {
            active: this.activeTransactions.size,
            completed: completedTransactions.length,
            commits,
            rollbacks,
            successRate: completedTransactions.length > 0 ? (commits / completedTransactions.length * 100).toFixed(2) + '%' : '0%'
        };
    }
}

/**
 * Boss Rollback Validator for comprehensive state validation
 */
class BossRollbackValidator {
    constructor(phaseManager) {
        this.phaseManager = phaseManager;
        this.validationCache = new Map();
        this.validationRules = this.initializeValidationRules();
    }

    initializeValidationRules() {
        return {
            stateConsistency: {
                validate: (state) => this.validateStateConsistency(state),
                critical: true
            },
            healthBounds: {
                validate: (state) => this.validateHealthBounds(state),
                critical: true
            },
            phaseProgression: {
                validate: (state) => this.validatePhaseProgression(state),
                critical: false
            },
            systemIntegrity: {
                validate: (state) => this.validateSystemIntegrity(state),
                critical: true
            }
        };
    }

    async validateRollbackCapability() {
        const validationResult = {
            capable: true,
            limitations: [],
            recommendations: []
        };

        try {
            // Check state history availability
            const stateHistory = this.phaseManager.stateHistory;
            if (stateHistory.length === 0) {
                validationResult.capable = false;
                validationResult.limitations.push('No state history available');
            }

            // Check for stable states
            const stableStates = stateHistory.filter(state => state.stable);
            if (stableStates.length === 0) {
                validationResult.limitations.push('No stable states in history');
                validationResult.recommendations.push('Create stable checkpoint before critical operations');
            }

            // Validate system state coherence
            const systemCoherence = await this.validateSystemCoherence();
            if (!systemCoherence.coherent) {
                validationResult.limitations.push('System state incoherence detected');
                validationResult.recommendations.push('Synchronize system states before rollback');
            }

            return validationResult;

        } catch (error) {
            console.error(`[BossRollbackValidator] Rollback capability validation failed:`, error);
            return {
                capable: false,
                limitations: [`Validation error: ${error.message}`],
                recommendations: ['Check system integrity before attempting rollback']
            };
        }
    }

    async validateRollbackState(targetState) {
        const validationResult = {
            valid: true,
            errors: [],
            warnings: [],
            ruleResults: new Map()
        };

        for (const [ruleName, rule] of Object.entries(this.validationRules)) {
            try {
                const ruleResult = await rule.validate(targetState);
                validationResult.ruleResults.set(ruleName, ruleResult);

                if (!ruleResult.valid) {
                    if (rule.critical) {
                        validationResult.valid = false;
                        validationResult.errors.push(...ruleResult.errors);
                    } else {
                        validationResult.warnings.push(...ruleResult.warnings);
                    }
                }

            } catch (ruleError) {
                const errorMessage = `Rule ${ruleName} validation failed: ${ruleError.message}`;
                
                if (rule.critical) {
                    validationResult.valid = false;
                    validationResult.errors.push(errorMessage);
                } else {
                    validationResult.warnings.push(errorMessage);
                }

                validationResult.ruleResults.set(ruleName, {
                    valid: false,
                    error: ruleError.message
                });
            }
        }

        return validationResult;
    }

    validateStateConsistency(state) {
        const result = { valid: true, errors: [], warnings: [] };

        // Check basic state properties
        if (!state.phase || typeof state.phase !== 'number') {
            result.valid = false;
            result.errors.push('Invalid phase in state');
        }

        if (!state.health || state.health <= 0) {
            result.valid = false;
            result.errors.push('Invalid health in state');
        }

        if (state.health > state.maxHealth) {
            result.warnings.push('Health exceeds maximum');
        }

        return result;
    }

    validateHealthBounds(state) {
        const result = { valid: true, errors: [], warnings: [] };

        if (state.health < 0) {
            result.valid = false;
            result.errors.push('Health below zero');
        }

        if (state.health > state.maxHealth * 1.1) { // Allow 10% variance
            result.valid = false;
            result.errors.push('Health significantly exceeds maximum');
        }

        return result;
    }

    validatePhaseProgression(state) {
        const result = { valid: true, errors: [], warnings: [] };

        const validPhases = [1, 2, 3, 4, 5]; // Configurable
        if (!validPhases.includes(state.phase)) {
            result.warnings.push(`Unusual phase: ${state.phase}`);
        }

        return result;
    }

    validateSystemIntegrity(state) {
        const result = { valid: true, errors: [], warnings: [] };

        // Check for required properties
        const requiredProps = ['phase', 'health', 'maxHealth', 'speed'];
        for (const prop of requiredProps) {
            if (state[prop] === undefined || state[prop] === null) {
                result.valid = false;
                result.errors.push(`Missing required property: ${prop}`);
            }
        }

        return result;
    }

    async validateSystemCoherence() {
        try {
            const boss = this.phaseManager.boss;
            const currentPhase = boss.phase;

            // Check UI coherence
            const phaseIndicator = document.getElementById('bossPhaseText');
            const uiPhaseText = phaseIndicator ? phaseIndicator.textContent : '';
            const uiCoherent = uiPhaseText.includes(currentPhase.toString()) || uiPhaseText.includes(`Phase ${currentPhase}`);

            // Check health bar coherence
            const healthBar = document.getElementById('bossHealthContainer');
            const healthCoherent = healthBar ? healthBar.style.display !== 'none' : true;

            const coherenceResult = {
                coherent: uiCoherent && healthCoherent,
                issues: []
            };

            if (!uiCoherent) {
                coherenceResult.issues.push('UI phase indicator out of sync');
            }

            if (!healthCoherent) {
                coherenceResult.issues.push('Health bar state inconsistent');
            }

            return coherenceResult;

        } catch (error) {
            return {
                coherent: false,
                issues: [`System coherence check failed: ${error.message}`]
            };
        }
    }
}

/**
 * Boss System Coordinator for multi-system operations
 */
class BossSystemCoordinator {
    constructor(phaseManager, game) {
        this.phaseManager = phaseManager;
        this.game = game;
        this.registeredSystems = new Map();
        this.coordinationQueue = [];
        this.activeCoordinations = new Map();
    }

    registerSystem(name, systemInstance) {
        if (systemInstance) {
            this.registeredSystems.set(name, {
                instance: systemInstance,
                status: 'available',
                lastSync: Date.now()
            });
            console.log(`[BossSystemCoordinator] Registered system: ${name}`);
        }
    }

    async prepareAllSystems(transaction) {
        const preparationResults = new Map();
        let overallSuccess = true;

        for (const [systemName, systemInfo] of this.registeredSystems) {
            try {
                const prepResult = await this.prepareSystem(systemName, systemInfo, transaction);
                preparationResults.set(systemName, prepResult);

                if (!prepResult.success) {
                    overallSuccess = false;
                }

            } catch (error) {
                console.error(`[BossSystemCoordinator] System preparation failed for ${systemName}:`, error);
                preparationResults.set(systemName, {
                    success: false,
                    error: error.message
                });
                overallSuccess = false;
            }
        }

        return {
            success: overallSuccess,
            results: preparationResults
        };
    }

    async prepareSystem(systemName, systemInfo, transaction) {
        const startTime = Date.now();

        try {
            switch (systemName) {
                case 'achievements':
                    return await this.prepareAchievementSystem(systemInfo.instance, transaction);
                
                case 'ui':
                    return await this.prepareUISystem(systemInfo.instance, transaction);
                
                case 'audio':
                    return await this.prepareAudioSystem(systemInfo.instance, transaction);
                
                case 'effects':
                    return await this.prepareEffectsSystem(systemInfo.instance, transaction);
                
                default:
                    return {
                        success: true,
                        duration: Date.now() - startTime,
                        note: `No specific preparation needed for ${systemName}`
                    };
            }

        } catch (error) {
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    async executeSystemUpdates(transaction) {
        const updateResults = new Map();
        let overallSuccess = true;

        // Execute updates in dependency order
        const updateOrder = ['effects', 'audio', 'ui', 'achievements'];

        for (const systemName of updateOrder) {
            const systemInfo = this.registeredSystems.get(systemName);
            
            if (systemInfo) {
                try {
                    const updateResult = await this.updateSystem(systemName, systemInfo, transaction);
                    updateResults.set(systemName, updateResult);

                    if (!updateResult.success) {
                        overallSuccess = false;
                        // Don't break - continue with other systems
                    }

                } catch (error) {
                    console.error(`[BossSystemCoordinator] System update failed for ${systemName}:`, error);
                    updateResults.set(systemName, {
                        success: false,
                        error: error.message
                    });
                    overallSuccess = false;
                }
            }
        }

        return {
            success: overallSuccess,
            results: updateResults
        };
    }

    async abortAllSystems(transaction) {
        const abortResults = new Map();

        for (const [systemName, systemInfo] of this.registeredSystems) {
            try {
                const abortResult = await this.abortSystem(systemName, systemInfo, transaction);
                abortResults.set(systemName, abortResult);

            } catch (error) {
                console.error(`[BossSystemCoordinator] System abort failed for ${systemName}:`, error);
                abortResults.set(systemName, {
                    success: false,
                    error: error.message
                });
            }
        }

        return abortResults;
    }

    async prepareAchievementSystem(achievementManager, transaction) {
        if (!achievementManager || !achievementManager.prepareBossPhaseTransition) {
            return { success: true, note: 'Achievement system preparation not available' };
        }

        try {
            await achievementManager.prepareBossPhaseTransition(
                this.phaseManager.boss.type,
                transaction.data.targetPhase
            );

            return { success: true, prepared: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async prepareUISystem(uiSystem, transaction) {
        try {
            // Prepare UI elements for phase transition
            const phaseIndicator = document.getElementById('bossPhaseText');
            const healthBar = document.getElementById('bossHealthContainer');

            if (phaseIndicator) {
                phaseIndicator.classList.add('transitioning');
            }

            if (healthBar) {
                healthBar.classList.add('transitioning');
            }

            return { success: true, prepared: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async prepareAudioSystem(audioManager, transaction) {
        if (!audioManager || !audioManager.prepareBossPhaseTransition) {
            return { success: true, note: 'Audio system preparation not available' };
        }

        try {
            await audioManager.prepareBossPhaseTransition(
                this.phaseManager.boss.type,
                transaction.data.targetPhase
            );

            return { success: true, prepared: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async prepareEffectsSystem(effectsManager, transaction) {
        try {
            // Clear any conflicting effects
            if (this.phaseManager.boss.visualEffects) {
                this.phaseManager.boss.visualEffects = this.phaseManager.boss.visualEffects.filter(
                    effect => effect.type !== 'phase_transition'
                );
            }

            return { success: true, prepared: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateSystem(systemName, systemInfo, transaction) {
        const startTime = Date.now();

        try {
            switch (systemName) {
                case 'achievements':
                    return await this.updateAchievementSystem(systemInfo.instance, transaction);
                
                case 'ui':
                    return await this.updateUISystem(systemInfo.instance, transaction);
                
                case 'audio':
                    return await this.updateAudioSystem(systemInfo.instance, transaction);
                
                case 'effects':
                    return await this.updateEffectsSystem(systemInfo.instance, transaction);
                
                default:
                    return {
                        success: true,
                        duration: Date.now() - startTime,
                        note: `No specific update needed for ${systemName}`
                    };
            }

        } catch (error) {
            return {
                success: false,
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    async updateAchievementSystem(achievementManager, transaction) {
        if (!achievementManager) {
            return { success: true, note: 'Achievement system not available' };
        }

        try {
            // Trigger phase transition achievements
            if (achievementManager.checkBossPhaseAchievements) {
                await achievementManager.checkBossPhaseAchievements(
                    this.phaseManager.boss.type,
                    transaction.data.targetPhase
                );
            }

            return { success: true, updated: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateUISystem(uiSystem, transaction) {
        try {
            // Update phase indicator
            const phaseIndicator = document.getElementById('bossPhaseText');
            if (phaseIndicator) {
                phaseIndicator.textContent = `Phase ${transaction.data.targetPhase}`;
                phaseIndicator.classList.remove('transitioning');
            }

            // Update health bar if needed
            const healthBar = document.getElementById('bossHealthContainer');
            if (healthBar) {
                healthBar.classList.remove('transitioning');
                // Update health percentage display
                const healthPercent = (this.phaseManager.boss.health / this.phaseManager.boss.maxHealth) * 100;
                this.phaseManager.updateHealthBar(healthBar, healthPercent);
            }

            return { success: true, updated: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateAudioSystem(audioManager, transaction) {
        if (!audioManager) {
            return { success: true, note: 'Audio system not available' };
        }

        try {
            // Play phase transition sound
            if (audioManager.playBossPhaseTransition) {
                audioManager.playBossPhaseTransition(
                    this.phaseManager.boss.type,
                    transaction.data.targetPhase
                );
            }

            return { success: true, updated: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateEffectsSystem(effectsManager, transaction) {
        try {
            // Create phase transition effect
            if (this.phaseManager.boss.createPhaseTransitionEffect) {
                this.phaseManager.boss.createPhaseTransitionEffect();
            }

            return { success: true, updated: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async abortSystem(systemName, systemInfo, transaction) {
        try {
            // Generic abort - remove transitioning states
            if (systemName === 'ui') {
                const phaseIndicator = document.getElementById('bossPhaseText');
                const healthBar = document.getElementById('bossHealthContainer');

                if (phaseIndicator) {
                    phaseIndicator.classList.remove('transitioning');
                }

                if (healthBar) {
                    healthBar.classList.remove('transitioning');
                }
            }

            return { success: true, aborted: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }
     */
    reset() {
        this.stateHistory = [];
        this.transitionQueue = [];
        this.pendingTransitions.clear();
        this.isTransitioning = false;
        this.rollbackInProgress = false;
        this.validator.reset();
        
        // Reset stats
        Object.keys(this.stats).forEach(key => {
            this.stats[key] = 0;
        });
    }
}

// Boss Phase Manager for enhanced boss mechanics
class BossPhaseManager {
    constructor(boss) {
        this.boss = boss;
        this.phaseTransitionCooldown = 0;
        this.abilityQueue = [];
        this.phaseStartTime = Date.now();
    }
    
    update(deltaTime) {
        this.phaseTransitionCooldown -= deltaTime * 1000;
        
        // Update ability queue
        this.updateAbilityQueue(deltaTime);
        
        // Check for automatic phase transitions based on time
        this.checkTimeBasedTransitions();
    }
    
    updateAbilityQueue(deltaTime) {
        if (this.abilityQueue.length === 0) return;
        
        const nextAbility = this.abilityQueue[0];
        nextAbility.cooldown -= deltaTime * 1000;
        
        if (nextAbility.cooldown <= 0) {
            this.executeQueuedAbility(nextAbility);
            this.abilityQueue.shift();
        }
    }
    
    executeQueuedAbility(ability) {
        // Execute the queued ability
        if (this.boss[ability.method]) {
            this.boss[ability.method](...ability.args);
        }
    }
    
    checkTimeBasedTransitions() {
        const timeInPhase = Date.now() - this.phaseStartTime;
        
        // Force phase transition after extended time in same phase
        if (timeInPhase > 60000 && this.boss.phase < 3) { // 60 seconds
            this.boss.transitionToPhase(this.boss.phase + 1);
            this.phaseStartTime = Date.now();
        }
    }
    
    queueAbility(method, args = [], delay = 0) {
        this.abilityQueue.push({
            method: method,
            args: args,
            cooldown: delay
        });
    }
}

// Base Enemy class with advanced AI
class Enemy {
    constructor(type, x, y, pathfinder = null) {
        this.type = type;
        this.config = CONFIG.ENEMY_TYPES[type];
        this.x = x;
        this.y = y;
        this.health = this.config.health;
        this.maxHealth = this.config.health;
        this.speed = this.config.speed;
        this.size = this.config.size;
        this.color = this.config.color;
        this.reward = this.config.reward;
        
        // AI and pathfinding
        this.pathfinder = pathfinder;
        this.staticPath = CONFIG.PATH_POINTS.slice(); // Fallback static path
        this.dynamicPath = null; // Computed dynamic path
        this.currentPath = null; // Active path being followed
        this.pathIndex = 0;
        this.targetX = this.staticPath[0].x;
        this.targetY = this.staticPath[0].y;
        this.lastPathUpdate = 0;
        this.pathUpdateInterval = this.getPathUpdateInterval(); // Adaptive update interval
        this.pathfindingEnabled = true;
        this.pathGeneration = 0; // Track path versions for performance
        this.lastObstacleHash = ''; // Track when obstacles change
        
        // Movement and physics
        this.velocityX = 0;
        this.velocityY = 0;
        this.acceleration = 0.1;
        this.friction = 0.95;
        
        // State and behavior
        this.isAlive = true;
        this.reachedEnd = false;
        this.stunned = false;
        this.stunnedTime = 0;
        this.slowEffect = 1.0;
        this.slowEffectTime = 0;
        
        // Combat
        this.lastDamageTime = 0;
        this.damageCooldown = 100;
        this.armorReduction = this.config.armor || 0;
        
        // Visual effects
        this.flashTime = 0;
        this.deathAnimationTime = 0;
        this.trailParticles = [];
        
        // Unique behaviors per type
        this.initializeBehavior();
    }
    
    initializeBehavior() {
        switch (this.type) {
            case 'scriptKiddie':
                this.erratic = true;
                this.erraticTimer = 0;
                this.erraticDirection = Utils.random(0, Math.PI * 2);
                break;
            case 'federalAgent':
                this.persistent = true;
                this.detectionRadius = 100;
                break;
            case 'corporateSaboteur':
                this.stealthMode = false;
                this.stealthCooldown = 0;
                this.originalSpeed = this.speed;
                break;
            case 'aiSurveillance':
                this.scanningMode = true;
                this.scanAngle = 0;
                this.targetLocked = null;
                break;
            case 'raidTeam':
                this.isBoss = true;
                this.phase = 1;
                this.abilityTimer = 0;
                this.minionsSpawned = false;
                
                // Enhanced boss tracking variables
                this.spawnTime = Date.now();
                this.abilitiesUsedCount = 0;
                this.totalDamageDealt = 0;
                this.defensesTakenCount = 0;
                this.droneCount = 0;
                this.empSource = this; // Reference for EMP tracking
                break;
            case 'quantumHacker':
                this.phaseShift = false;
                this.phaseTimer = 0;
                this.tunnelCooldown = 0;
                this.originalColor = this.color;
                break;
            case 'corruptedMonk':
                this.healingAura = true;
                this.healingTimer = 0;
                this.corruptionRadius = 80;
                break;
            case 'megaCorp':
                this.isBoss = true;
                this.phase = 1;
                this.abilityTimer = 0;
                this.droneCount = 0;
                this.maxDrones = 5;
                this.shieldRegenTimer = 0;
                
                // Enhanced boss tracking variables
                this.spawnTime = Date.now();
                this.abilitiesUsedCount = 0;
                this.totalDamageDealt = 0;
                this.defensesTakenCount = 0;
                this.empSource = this; // Reference for EMP tracking
                break;
        }
    }
    
    update(deltaTime, defenses = [], enemies = []) {
        if (!this.isAlive) {
            this.updateDeathAnimation(deltaTime);
            return;
        }
        
        // Update status effects
        this.updateStatusEffects(deltaTime);
        
        // Update pathfinding
        this.updatePath(deltaTime, defenses);
        
        // Update movement based on enemy type
        this.updateMovement(deltaTime, defenses, enemies);
        
        // Update special behaviors
        this.updateSpecialBehavior(deltaTime, defenses, enemies);
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
    }
    
    updateStatusEffects(deltaTime) {
        // Update stun effect
        if (this.stunned) {
            this.stunnedTime -= deltaTime;
            if (this.stunnedTime <= 0) {
                this.stunned = false;
            }
        }
        
        // Update slow effect
        if (this.slowEffectTime > 0) {
            this.slowEffectTime -= deltaTime;
            if (this.slowEffectTime <= 0) {
                this.slowEffect = 1.0;
            }
        }
        
        // Update flash effect
        if (this.flashTime > 0) {
            this.flashTime -= deltaTime;
        }
    }
    
    updatePath(deltaTime, defenses) {
        if (!this.pathfinder || !this.pathfindingEnabled) {
            // Use static path as fallback
            this.currentPath = this.staticPath;
            return;
        }
        
        this.lastPathUpdate += deltaTime * 1000; // Convert to milliseconds
        
        // Adaptive path update frequency based on enemy type and situation
        const shouldUpdatePath = this.lastPathUpdate >= this.pathUpdateInterval ||
                               this.isNearObstacle(defenses) ||
                               this.isStuck();
        
        if (shouldUpdatePath) {
            this.lastPathUpdate = 0;
            this.updateDynamicPath(defenses);
        }
    }
    
    updateDynamicPath(defenses) {
        const startTime = performance.now();
        
        try {
            // Create obstacle hash to check if obstacles changed
            const obstacleHash = this.createObstacleHash(defenses);
            
            // Only update pathfinder obstacles if they changed
            if (obstacleHash !== this.lastObstacleHash) {
                this.pathfinder.updateObstacles(defenses);
                this.lastObstacleHash = obstacleHash;
            }
            
            // Calculate path to final destination with intermediate waypoints
            const finalTarget = this.staticPath[this.staticPath.length - 1];
            const cacheKey = `${Math.floor(this.x/20)}_${Math.floor(this.y/20)}_${Math.floor(finalTarget.x/20)}_${Math.floor(finalTarget.y/20)}_${obstacleHash}`;
            
            // Check path cache first
            let newPath = this.pathfinder.getFromCache(cacheKey);
            
            if (!newPath) {
                // Find optimal path using A* with performance monitoring
                newPath = this.pathfinder.findPath(
                    this.x, this.y, 
                    finalTarget.x, finalTarget.y
                );
                
                // Cache the path if valid
                if (newPath && newPath.length > 0) {
                    this.pathfinder.addToCache(cacheKey, newPath.slice());
                }
            }
            
            // Apply path smoothing for more natural movement
            if (newPath && newPath.length > 0) {
                this.dynamicPath = this.pathfinder.smoothingEnabled ? 
                    this.pathfinder.smoothPath(newPath) : newPath;
                this.currentPath = this.dynamicPath;
                this.pathIndex = 0;
                this.pathGeneration++;
            } else {
                // Fallback to static path if pathfinding fails
                this.currentPath = this.staticPath;
                console.warn(`Pathfinding failed for ${this.type}, using static path`);
            }
            
        } catch (error) {
            console.error('Pathfinding error:', error);
            this.currentPath = this.staticPath; // Fallback
        }
        
        // Update performance stats
        const pathfindingTime = performance.now() - startTime;
        this.pathfinder.updateStats(pathfindingTime);
    }
    
    createObstacleHash(defenses) {
        // Create a simple hash of defense positions for change detection
        return defenses.map(d => `${Math.floor(d.x/10)},${Math.floor(d.y/10)}`).join('|');
    }
    
    getPathUpdateInterval() {
        // Adaptive interval based on enemy type
        const baseInterval = 1000;
        switch (this.type) {
            case 'scriptKiddie':
                return baseInterval * 2; // Slower updates for simple enemies
            case 'federalAgent':
                return baseInterval * 0.5; // Faster updates for persistent enemies
            case 'aiSurveillance':
                return baseInterval * 0.3; // Very fast updates for AI
            case 'raidTeam':
            case 'megaCorp':
                return baseInterval * 0.4; // Fast updates for bosses
            default:
                return baseInterval;
        }
    }
    
    isNearObstacle(defenses, threshold = 60) {
        return defenses.some(defense => 
            Utils.distance(this.x, this.y, defense.x, defense.y) < threshold
        );
    }
    
    isStuck() {
        // Check if enemy hasn't moved much recently
        if (!this.lastPosition) {
            this.lastPosition = { x: this.x, y: this.y, time: Date.now() };
            return false;
        }
        
        const timeDiff = Date.now() - this.lastPosition.time;
        const distance = Utils.distance(this.x, this.y, this.lastPosition.x, this.lastPosition.y);
        
        if (timeDiff > 2000) { // Check every 2 seconds
            const wasStuck = distance < 20; // If moved less than 20 pixels in 2 seconds
            this.lastPosition = { x: this.x, y: this.y, time: Date.now() };
            return wasStuck;
        }
        
        return false;
    }
    
    updateMovement(deltaTime) {
        if (this.stunned) return;
        
        const currentSpeed = this.speed * this.slowEffect;
        const pathToUse = this.currentPath || this.staticPath;
        
        if (this.pathIndex >= pathToUse.length) {
            this.reachedEnd = true;
            return;
        }
        
        const target = pathToUse[this.pathIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Waypoint reached threshold - smaller for smoother movement
        const threshold = this.getWaypointThreshold();
        
        if (distance < threshold) {
            // Move to next waypoint
            this.pathIndex++;
            
            // Check if reached end
            if (this.pathIndex >= pathToUse.length) {
                this.reachedEnd = true;
                return;
            }
        } else {
            // Enhanced movement with acceleration and smooth turning
            const targetVelX = (dx / distance) * currentSpeed;
            const targetVelY = (dy / distance) * currentSpeed;
            
            // Apply acceleration for smoother movement
            const accel = this.acceleration * deltaTime;
            this.velocityX += (targetVelX - this.velocityX) * accel;
            this.velocityY += (targetVelY - this.velocityY) * accel;
            
            // Apply friction
            this.velocityX *= this.friction;
            this.velocityY *= this.friction;
            
            // Move enemy
            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;
            
            // Prevent enemies from getting stuck in walls
            this.avoidWallCollision();
        }
        
        // Update target for UI/debug purposes
        if (this.pathIndex < pathToUse.length) {
            this.targetX = pathToUse[this.pathIndex].x;
            this.targetY = pathToUse[this.pathIndex].y;
        }
    }
    
    getWaypointThreshold() {
        // Adaptive threshold based on speed and enemy type
        const baseThreshold = 10;
        const speedFactor = Math.max(0.5, this.speed / 2);
        
        switch (this.type) {
            case 'scriptKiddie':
                return baseThreshold * speedFactor * 0.8; // Tighter threshold for erratic movement
            case 'aiSurveillance':
                return baseThreshold * speedFactor * 1.2; // Looser threshold for scanning
            default:
                return baseThreshold * speedFactor;
        }
    }
    
    avoidWallCollision() {
        // Simple boundary checking and correction
        const margin = this.size;
        
        if (this.x < margin) {
            this.x = margin;
            this.velocityX = Math.abs(this.velocityX);
        } else if (this.x > CONFIG.CANVAS_WIDTH - margin) {
            this.x = CONFIG.CANVAS_WIDTH - margin;
            this.velocityX = -Math.abs(this.velocityX);
        }
        
        if (this.y < margin) {
            this.y = margin;
            this.velocityY = Math.abs(this.velocityY);
        } else if (this.y > CONFIG.CANVAS_HEIGHT - margin) {
            this.y = CONFIG.CANVAS_HEIGHT - margin;
            this.velocityY = -Math.abs(this.velocityY);
        }
    }
    
    updateSpecialBehavior(deltaTime, defenses, enemies) {
        switch (this.type) {
            case 'scriptKiddie':
                this.updateErraticBehavior(deltaTime);
                break;
            case 'federalAgent':
                this.updatePersistentBehavior(deltaTime, defenses);
                break;
            case 'corporateSaboteur':
                this.updateStealthBehavior(deltaTime);
                break;
            case 'aiSurveillance':
                this.updateScanningBehavior(deltaTime, defenses);
                break;
            case 'raidTeam':
                this.updateBossBehavior(deltaTime, defenses, enemies);
                break;
            case 'quantumHacker':
                this.updateQuantumBehavior(deltaTime, defenses);
                break;
            case 'corruptedMonk':
                this.updateCorruptedMonkBehavior(deltaTime, enemies);
                break;
            case 'megaCorp':
                this.updateMegaCorpBehavior(deltaTime, defenses, enemies);
                break;
        }
    }
    
    updateErraticBehavior(deltaTime) {
        this.erraticTimer += deltaTime;
        if (this.erraticTimer > 500) {
            this.erraticTimer = 0;
            this.erraticDirection = Utils.random(0, Math.PI * 2);
            
            // Add some randomness to movement
            const erraticForce = 20;
            this.x += Math.cos(this.erraticDirection) * erraticForce * Math.random();
            this.y += Math.sin(this.erraticDirection) * erraticForce * Math.random();
        }
    }
    
    updatePersistentBehavior(deltaTime, defenses) {
        // Federal agents try to find alternate routes when blocked
        const nearbyDefense = defenses.find(defense => 
            Utils.distance(this.x, this.y, defense.x, defense.y) < this.detectionRadius
        );
        
        if (nearbyDefense && this.pathfinder) {
            // Force path recalculation more frequently when near defenses
            this.lastPathUpdate = this.pathUpdateInterval;
            
            // Federal agents are more aggressive in pathfinding
            this.pathUpdateInterval = Math.min(this.pathUpdateInterval, 300);
        } else {
            // Reset to normal interval when not threatened
            this.pathUpdateInterval = this.getPathUpdateInterval();
        }
    }
    
    updateStealthBehavior(deltaTime) {
        this.stealthCooldown -= deltaTime;
        
        if (this.stealthCooldown <= 0 && !this.stealthMode) {
            this.stealthMode = true;
            this.speed = this.originalSpeed * 1.5;
            this.color = '#636e7260'; // Semi-transparent
            this.stealthCooldown = 3000;
        } else if (this.stealthCooldown <= -2000) {
            this.stealthMode = false;
            this.speed = this.originalSpeed;
            this.color = this.config.color;
            this.stealthCooldown = 5000;
        }
    }
    
    updateScanningBehavior(deltaTime, defenses) {
        this.scanAngle += deltaTime * 0.002;
        
        // AI Surveillance can mark defenses for increased damage
        if (!this.targetLocked) {
            const nearbyDefense = defenses.find(defense =>
                Utils.distance(this.x, this.y, defense.x, defense.y) < 150
            );
            
            if (nearbyDefense) {
                this.targetLocked = nearbyDefense;
                nearbyDefense.markedForDestruction = true;
            }
        }
    }
    
    updateBossBehavior(deltaTime, defenses, enemies) {
        this.abilityTimer += deltaTime;
        
        // Enhanced phase system with boss phase manager
        this.updateBossPhases(deltaTime);
        
        if (this.phase === 1 && this.health < this.maxHealth * 0.7) {
            this.transitionToPhase(2, defenses, enemies);
        } else if (this.phase === 2 && this.health < this.maxHealth * 0.3) {
            this.transitionToPhase(3, defenses, enemies);
        }
        
        // Special abilities based on phase with telegraphing
        if (this.abilityTimer > this.getPhaseAbilityCooldown()) {
            this.abilityTimer = 0;
            this.telegraphAbility(() => {
                this.executeSpecialAbility(defenses, enemies);
            });
        }
        
        // Update vulnerability windows
        this.updateVulnerabilityWindows(deltaTime);
    }
    
    spawnMinions(enemies) {
        // Spawn smaller enemies around the boss
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i;
            const distance = 50;
            const minionX = this.x + Math.cos(angle) * distance;
            const minionY = this.y + Math.sin(angle) * distance;
            
            const minion = new Enemy('scriptKiddie', minionX, minionY, this.pathfinder);
            minion.pathIndex = this.pathIndex;
            enemies.push(minion);
        }
    }
    
    executeSpecialAbility(defenses) {
        switch (this.phase) {
            case 1:
                // EMP burst - stuns nearby defenses
                defenses.forEach(defense => {
                    if (Utils.distance(this.x, this.y, defense.x, defense.y) < 100) {
                        defense.stunned = true;
                        defense.stunnedTime = 2000;
                    }
                });
                break;
            case 2:
                // Shield regeneration
                this.health = Math.min(this.health + this.maxHealth * 0.1, this.maxHealth);
                break;
            case 3:
                // Teleport closer to end
                if (this.pathIndex < this.path.length - 2) {
                    this.pathIndex += 2;
                    const target = this.path[this.pathIndex];
                    this.x = target.x;
                    this.y = target.y;
                }
                break;
        }
    }
    
    updateQuantumBehavior(deltaTime, defenses) {
        // Phase shift ability
        this.phaseTimer += deltaTime * 1000; // Convert to milliseconds
        if (this.phaseTimer > 2000 && !this.phaseShift) {
            this.phaseShift = true;
            this.color = this.originalColor + '60'; // Semi-transparent
            this.phaseTimer = 0;
            
            // When phase shifting, temporarily ignore obstacles
            this.pathfindingEnabled = false;
            this.currentPath = this.staticPath; // Use direct path
        } else if (this.phaseTimer > 1500 && this.phaseShift) {
            this.phaseShift = false;
            this.color = this.originalColor;
            this.phaseTimer = 0;
            
            // Re-enable pathfinding when phase shift ends
            this.pathfindingEnabled = true;
            this.lastPathUpdate = this.pathUpdateInterval; // Force immediate recalculation
        }
        
        // Tunnel cooldown
        this.tunnelCooldown -= deltaTime * 1000;
        if (this.tunnelCooldown <= 0 && Math.random() < 0.001) {
            // Quantum tunnel to a strategic position along the path
            const tunnelTarget = this.calculateTunnelTarget();
            if (tunnelTarget) {
                this.x = tunnelTarget.x;
                this.y = tunnelTarget.y;
                this.pathIndex = tunnelTarget.pathIndex;
                this.tunnelCooldown = 5000;
                
                // Force path recalculation after tunneling
                this.lastPathUpdate = this.pathUpdateInterval;
            }
        }
    }
    
    calculateTunnelTarget() {
        // Find a strategic tunnel destination along the path
        const pathToUse = this.currentPath || this.staticPath;
        const maxJump = Math.min(3, pathToUse.length - this.pathIndex - 1);
        
        if (maxJump > 0) {
            const jumpIndex = this.pathIndex + Math.floor(Math.random() * maxJump) + 1;
            return {
                x: pathToUse[jumpIndex].x + (Math.random() - 0.5) * 40,
                y: pathToUse[jumpIndex].y + (Math.random() - 0.5) * 40,
                pathIndex: jumpIndex
            };
        }
        return null;
    }
    
    updateCorruptedMonkBehavior(deltaTime, enemies) {
        this.healingTimer += deltaTime;
        
        if (this.healingTimer > 3000) {
            this.healingTimer = 0;
            
            // Heal nearby enemies
            enemies.forEach(enemy => {
                if (enemy !== this && Utils.distance(this.x, this.y, enemy.x, enemy.y) < this.corruptionRadius) {
                    enemy.health = Math.min(enemy.health + enemy.maxHealth * 0.1, enemy.maxHealth);
                    
                    // Add corruption effect
                    enemy.color = enemy.config.color + '80'; // Slightly darker
                    enemy.speed *= 1.1; // Slightly faster
                }
            });
        }
    }
    
    updateMegaCorpBehavior(deltaTime, defenses, enemies) {
        this.abilityTimer += deltaTime;
        this.shieldRegenTimer += deltaTime;
        
        // Enhanced phase system
        this.updateBossPhases(deltaTime);
        
        // Phase transitions with enhanced effects
        if (this.phase === 1 && this.health < this.maxHealth * 0.75) {
            this.transitionToPhase(2, defenses, enemies);
        } else if (this.phase === 2 && this.health < this.maxHealth * 0.5) {
            this.transitionToPhase(3, defenses, enemies);
        } else if (this.phase === 3 && this.health < this.maxHealth * 0.25) {
            this.transitionToPhase(4, defenses, enemies);
        }
        
        // Enhanced shield regeneration
        if (this.shieldRegenTimer > this.getShieldRegenCooldown()) {
            this.shieldRegenTimer = 0;
            this.shieldRegeneration();
        }
        
        // Deploy drones with enhanced behavior
        if (this.abilityTimer > 6000 && this.droneCount < this.maxDrones) {
            this.abilityTimer = 0;
            this.deployDrones(enemies);
        }
        
        // Special phase abilities with telegraphing
        if (this.abilityTimer > 10000) {
            this.abilityTimer = 0;
            this.telegraphAbility(() => {
                this.executeMegaCorpAbility(defenses, enemies);
            });
        }
        
        // Update vulnerability windows
        this.updateVulnerabilityWindows(deltaTime);
    }
    
    deployDrone(enemies) {
        // Create a smaller, faster enemy as a drone
        const angle = Utils.random(0, Math.PI * 2);
        const distance = 60;
        const droneX = this.x + Math.cos(angle) * distance;
        const droneY = this.y + Math.sin(angle) * distance;
        
        const drone = new Enemy('scriptKiddie', droneX, droneY, this.pathfinder);
        drone.type = 'corporateDrone';
        drone.speed *= 2;
        drone.size *= 0.7;
        drone.health *= 0.5;
        drone.color = '#fd79a8';
        drone.pathIndex = this.pathIndex;
        
        enemies.push(drone);
        this.droneCount++;
    }
    
    executeMegaCorpAbility(defenses, enemies) {
        switch (this.phase) {
            case 1:
                // Data corruption - reduce defense effectiveness
                defenses.forEach(defense => {
                    if (Utils.distance(this.x, this.y, defense.x, defense.y) < 150) {
                        defense.corrupted = true;
                        defense.corruptedTime = 5000;
                    }
                });
                break;
            case 2:
                // Corporate takeover - convert nearby defenses
                defenses.forEach(defense => {
                    if (Utils.distance(this.x, this.y, defense.x, defense.y) < 100) {
                        defense.takenOver = true;
                        defense.takeOverTime = 3000;
                    }
                });
                break;
            case 3:
                // Mass drone deployment
                for (let i = 0; i < 3; i++) {
                    this.deployDrone(enemies);
                }
                break;
            case 4:
                // Ultimate: System crash
                defenses.forEach(defense => {
                    if (Utils.distance(this.x, this.y, defense.x, defense.y) < 200) {
                        defense.crashed = true;
                        defense.crashedTime = 4000;
                    }
                });
                break;
        }
    }
    
    updateVisualEffects(deltaTime) {
        // Update trail particles for fast enemies
        if (this.speed > 2) {
            this.trailParticles.push({
                x: this.x,
                y: this.y,
                life: 500,
                color: this.color
            });
        }
        
        // Update existing trail particles
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            this.trailParticles[i].life -= deltaTime;
            if (this.trailParticles[i].life <= 0) {
                this.trailParticles.splice(i, 1);
            }
        }
    }
    
    updateDeathAnimation(deltaTime) {
        this.deathAnimationTime += deltaTime * 1000; // Convert deltaTime to ms
        if (this.deathAnimationTime > 1000) {
            this.deathAnimationTime = -1; // Mark for removal
        }
    }
    
    takeDamage(damage, damageType = 'normal') {
        if (!this.isAlive || Date.now() - this.lastDamageTime < this.damageCooldown) {
            return false;
        }
        
        this.lastDamageTime = Date.now();
        
        // Apply armor reduction
        let actualDamage = Math.max(1, damage - this.armorReduction);
        
        // Special damage type modifiers
        switch (damageType) {
            case 'piercing':
                actualDamage = damage; // Ignores armor
                break;
            case 'explosive':
                actualDamage *= 1.5; // Extra damage
                this.stunned = true;
                this.stunnedTime = 500;
                break;
            case 'slow':
                this.slowEffect = 0.5;
                this.slowEffectTime = 2000;
                break;
        }
        
        this.health -= actualDamage;
        this.flashTime = 200;
        
        if (this.health <= 0) {
            this.isAlive = false;
            this.deathAnimationTime = 0;
            return true; // Enemy killed
        }
        
        return false; // Enemy damaged but not killed
    }
    
    render(ctx) {
        if (this.deathAnimationTime > 0) {
            this.renderDeathAnimation(ctx);
            return;
        }
        
        if (!this.isAlive) return;
        
        // Render trail particles
        this.renderTrailParticles(ctx);
        
        // Render main enemy body
        ctx.save();
        
        // Apply flash effect
        if (this.flashTime > 0) {
            ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.flashTime * 0.1);
        }
        
        // Apply stealth effect
        if (this.stealthMode) {
            ctx.globalAlpha = 0.4;
        }
        
        // Render enemy based on type
        this.renderEnemyBody(ctx);
        
        // Render special effects
        this.renderSpecialEffects(ctx);
        
        // Render health bar
        this.renderHealthBar(ctx);
        
        ctx.restore();
    }
    
    renderEnemyBody(ctx) {
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        switch (this.type) {
            case 'scriptKiddie':
                // Render as spiky circle
                this.renderSpikeyCircle(ctx);
                break;
            case 'federalAgent':
                // Render as square with badge
                this.renderSquareWithBadge(ctx);
                break;
            case 'corporateSaboteur':
                // Render as diamond
                this.renderDiamond(ctx);
                break;
            case 'aiSurveillance':
                // Render as circle with scanning beam
                this.renderScanningEye(ctx);
                break;
            case 'raidTeam':
                // Render as large intimidating shape
                this.renderBossShape(ctx);
                break;
            case 'quantumHacker':
                // Render as shifting quantum form
                this.renderQuantumForm(ctx);
                break;
            case 'corruptedMonk':
                // Render as corrupted meditation pose
                this.renderCorruptedMonk(ctx);
                break;
            case 'megaCorp':
                // Render as massive corporate entity
                this.renderMegaCorp(ctx);
                break;
            default:
                // Default circle
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
        }
    }
    
    renderSpikeyCircle(ctx) {
        const spikes = 8;
        const innerRadius = this.size * 0.7;
        const outerRadius = this.size;
        
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const angle = (i * Math.PI) / spikes;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    
    renderSquareWithBadge(ctx) {
        // Main square
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        ctx.strokeRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        
        // Badge (smaller circle)
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    
    renderDiamond(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.size);
        ctx.lineTo(this.x + this.size, this.y);
        ctx.lineTo(this.x, this.y + this.size);
        ctx.lineTo(this.x - this.size, this.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    
    renderScanningEye(ctx) {
        // Main circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Scanning beam
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const beamLength = this.size * 3;
        const beamX = this.x + Math.cos(this.scanAngle) * beamLength;
        const beamY = this.y + Math.sin(this.scanAngle) * beamLength;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(beamX, beamY);
        ctx.stroke();
    }
    
    renderBossShape(ctx) {
        // Large hexagon with inner details
        const vertices = 6;
        ctx.beginPath();
        for (let i = 0; i < vertices; i++) {
            const angle = (i * Math.PI * 2) / vertices;
            const x = this.x + Math.cos(angle) * this.size;
            const y = this.y + Math.sin(angle) * this.size;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Inner circle with phase indicator
        ctx.fillStyle = ['#FF0000', '#FF8000', '#FFD700'][this.phase - 1];
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderQuantumForm(ctx) {
        // Shifting quantum particle effect
        const particleCount = 6;
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2 + time;
            const radius = this.size * (0.5 + 0.3 * Math.sin(time * 2 + i));
            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;
            
            ctx.fillStyle = this.phaseShift ? this.color : this.originalColor;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Central core
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    
    renderCorruptedMonk(ctx) {
        // Meditation pose with corruption effects
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Body (triangle for meditation pose)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(-this.size * 0.8, this.size * 0.5);
        ctx.lineTo(this.size * 0.8, this.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Corruption aura
        if (this.healingAura) {
            ctx.strokeStyle = '#6c5ce7';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.corruptionRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Head
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, -this.size * 0.7, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
    
    renderMegaCorp(ctx) {
        // Large corporate building shape
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Main building body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
        ctx.strokeRect(-this.size, -this.size, this.size * 2, this.size * 2);
        
        // Corporate logo (dollar sign)
        ctx.fillStyle = '#FFD700';
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
        
        // Phase indicators (floors)
        for (let i = 0; i < this.phase; i++) {
            const floorY = -this.size + (i * this.size * 0.4);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(-this.size * 0.8, floorY, this.size * 1.6, 3);
        }
        
        // Shield effect if regenerating
        if (this.shieldRegenTimer > 7000) {
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    renderTrailParticles(ctx) {
        this.trailParticles.forEach(particle => {
            const alpha = particle.life / 500;
            ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 3 * alpha, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    renderSpecialEffects(ctx) {
        // Render type-specific effects
        if (this.stunned) {
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        if (this.slowEffect < 1.0) {
            ctx.strokeStyle = '#0080FF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    renderHealthBar(ctx) {
        if (this.health >= this.maxHealth) return;
        
        const barWidth = this.size * 2;
        const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size - 15;
        
        // Background
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
    
    renderDeathAnimation(ctx) {
        const progress = this.deathAnimationTime / 1000;
        const alpha = 1 - progress;
        const scale = 1 + progress * 2;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);
        ctx.translate(-this.x, -this.y);
        
        this.renderEnemyBody(ctx);
        
        ctx.restore();
        
        // Explosion particles
        if (progress < 0.5) {
            const particleCount = 8;
            for (let i = 0; i < particleCount; i++) {
                const angle = (i / particleCount) * Math.PI * 2;
                const distance = progress * 50;
                const x = this.x + Math.cos(angle) * distance;
                const y = this.y + Math.sin(angle) * distance;
                
                ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, 4 * (1 - progress), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // Utility methods
    getDistanceToEnd() {
        const pathToUse = this.currentPath || this.staticPath;
        if (this.pathIndex >= pathToUse.length) return 0;
        
        let distance = Utils.distance(this.x, this.y, pathToUse[this.pathIndex].x, pathToUse[this.pathIndex].y);
        
        for (let i = this.pathIndex; i < pathToUse.length - 1; i++) {
            distance += Utils.distance(pathToUse[i].x, pathToUse[i].y, pathToUse[i + 1].x, pathToUse[i + 1].y);
        }
        
        return distance;
    }
    
    // Performance monitoring methods
    getPathfindingStats() {
        if (!this.pathfinder) return null;
        
        return {
            pathGeneration: this.pathGeneration,
            pathLength: this.currentPath ? this.currentPath.length : 0,
            isUsingDynamicPath: !!this.dynamicPath,
            pathUpdateInterval: this.pathUpdateInterval,
            lastUpdateTime: Date.now() - (this.lastPathUpdate * 1000),
            pathfinderStats: this.pathfinder.getPerformanceStats()
        };
    }
    
    // Debugging methods
    renderPathDebug(ctx) {
        if (!this.currentPath) return;
        
        ctx.save();
        ctx.strokeStyle = this.color + '80';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // Draw the path
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        
        for (let i = this.pathIndex; i < this.currentPath.length; i++) {
            ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw waypoints
        for (let i = this.pathIndex; i < this.currentPath.length; i++) {
            const waypoint = this.currentPath[i];
            ctx.fillStyle = i === this.pathIndex ? '#ff0000' : this.color + '60';
            ctx.beginPath();
            ctx.arc(waypoint.x, waypoint.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    // Enhanced pathfinding for special enemy types
    requestPriorityPathfinding() {
        // For boss enemies and special types that need immediate pathfinding
        if (this.pathfinder && (this.isBoss || this.type === 'aiSurveillance')) {
            this.lastPathUpdate = this.pathUpdateInterval; // Force immediate update
            this.pathUpdateInterval = Math.min(this.pathUpdateInterval, 200); // High priority
        }
    }
    
    isNearEnd(threshold = 100) {
        return this.getDistanceToEnd() < threshold;
    }
    
    // Check if enemy should be removed
    shouldRemove() {
        return this.deathAnimationTime === -1 || this.reachedEnd;
    }
    
    // Enhanced boss mechanics methods
    updateBossPhases(deltaTime) {
        if (!this.isBoss) return;
        
        // Initialize boss phase manager if not present
        if (!this.phaseManager) {
            this.phaseManager = new BossPhaseManager(this);
        }
        
        // Initialize comprehensive boss phase transition manager
        if (!this.phaseTransitionManager) {
            this.phaseTransitionManager = new BossPhaseTransitionManager(this, window.game || null);
            console.log(`[Enemy] Comprehensive Phase Transition Manager initialized for ${this.type}`);
        }
        
        this.phaseManager.update(deltaTime);
    }
    
    transitionToPhase(newPhase, defenses, enemies) {
        if (this.phase === newPhase) return;
        
        // Use enhanced phase transition manager if available
        if (this.phaseTransitionManager) {
            const transitionId = this.phaseTransitionManager.requestPhaseTransition(
                newPhase, 
                'health_threshold', 
                2 // Normal priority
            );
            
            if (transitionId) {
                console.log(`[Enemy] Phase transition requested via manager: ${this.phase} -> ${newPhase} (ID: ${transitionId})`);
                return;
            } else {
                console.warn(`[Enemy] Phase transition manager rejected transition: ${this.phase} -> ${newPhase}`);
                // Fall back to legacy transition
            }
        }
        
        // Legacy transition method (fallback)
        const oldPhase = this.phase;
        this.phase = newPhase;
        
        // Phase transition effects
        this.createPhaseTransitionEffect();
        
        // Dispatch phase transition event for achievements
        const event = new CustomEvent('bossPhaseTransition', {
            detail: { 
                enemy: this, 
                oldPhase: oldPhase, 
                newPhase: newPhase,
                bossType: this.type,
                fallback: true // Indicate this was a fallback transition
            }
        });
        document.dispatchEvent(event);
        
        // Apply phase-specific changes
        this.applyPhaseChanges(newPhase, defenses, enemies);
        
        console.log(`[Enemy] Boss ${this.type} transitioned to phase ${newPhase} (fallback method)`);
    }
    
    applyPhaseChanges(phase, defenses, enemies) {
        const phaseConfig = CONFIG.BOSS_PHASES[this.type];
        if (!phaseConfig || !phaseConfig[phase]) return;
        
        const config = phaseConfig[phase];
        
        // Apply stat modifications
        if (config.speedMultiplier) {
            this.speed *= config.speedMultiplier;
        }
        
        if (config.healthRegen) {
            this.health = Math.min(this.health + this.maxHealth * config.healthRegen, this.maxHealth);
        }
        
        // Add new abilities
        if (config.newAbilities) {
            config.newAbilities.forEach(ability => {
                if (!this.abilities.includes(ability)) {
                    this.abilities.push(ability);
                }
            });
        }
        
        // Spawn minions if specified
        if (config.spawnMinions && !this.minionsSpawned) {
            this.spawnMinions(enemies, config.spawnMinions);
            this.minionsSpawned = true;
        }
    }
    
    createPhaseTransitionEffect() {
        // Create dramatic visual effect for phase transition
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const distance = 50 + Math.random() * 100;
            
            this.visualEffects.push({
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance,
                vx: Math.cos(angle) * 200,
                vy: Math.sin(angle) * 200,
                life: 1500,
                maxLife: 1500,
                color: '#ff6b6b',
                size: 8,
                type: 'phaseTransition'
            });
        }
        
        // Screen shake effect
        if (window.game && window.game.camera) {
            window.game.camera.shake(500, 10);
        }
    }
    
    /**
     * Emergency phase transition bypass (for critical situations)
     */
    emergencyPhaseTransition(targetPhase, reason = 'Emergency transition') {
        console.warn(`[Enemy] Emergency phase transition initiated: ${this.phase} -> ${targetPhase} (${reason})`);
        
        if (this.phaseTransitionManager) {
            // Use emergency rollback if transitioning backwards
            if (targetPhase < this.phase) {
                return this.phaseTransitionManager.emergencyRollback(`Emergency rollback: ${reason}`);
            }
            
            // Request high-priority transition
            return this.phaseTransitionManager.requestPhaseTransition(targetPhase, reason, 3);
        }
        
        // Fallback to direct transition
        const oldPhase = this.phase;
        this.phase = targetPhase;
        
        // Apply changes immediately
        this.applyPhaseChanges(targetPhase, window.game?.defenses || [], window.game?.enemies || []);
        
        // Dispatch emergency event
        const event = new CustomEvent('bossEmergencyPhaseTransition', {
            detail: {
                enemy: this,
                oldPhase: oldPhase,
                newPhase: targetPhase,
                reason: reason,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
        
        return true;
    }
    
    telegraphAbility(abilityCallback) {
        // Show warning before executing ability
        this.showAbilityWarning();
        
        // Execute ability after telegraph delay
        setTimeout(() => {
            if (this.isAlive) {
                abilityCallback();
            }
        }, this.getTelegraphDelay());
    }
    
    showAbilityWarning() {
        // Create warning indicator
        this.abilityWarning = {
            active: true,
            duration: this.getTelegraphDelay(),
            startTime: Date.now()
        };
        
        // Dispatch warning event for UI
        const event = new CustomEvent('bossAbilityWarning', {
            detail: { 
                enemy: this,
                abilityType: this.getNextAbilityType(),
                duration: this.getTelegraphDelay()
            }
        });
        document.dispatchEvent(event);
    }
    
    getTelegraphDelay() {
        return this.isBoss ? 2000 : 1000; // 2 seconds for bosses, 1 for others
    }
    
    getNextAbilityType() {
        // Return the type of ability that will be executed
        switch (this.type) {
            case 'raidTeam':
                return this.phase === 1 ? 'empBurst' : 
                       this.phase === 2 ? 'shieldRegen' : 'teleport';
            case 'megaCorp':
                return this.phase === 1 ? 'dataCorruption' :
                       this.phase === 2 ? 'corporateTakeover' :
                       this.phase === 3 ? 'massDeployment' : 'systemCrash';
            default:
                return 'unknown';
        }
    }
    
    getPhaseAbilityCooldown() {
        return 4000 - (this.phase * 500); // Faster abilities in later phases
    }
    
    updateVulnerabilityWindows(deltaTime) {
        if (!this.vulnerabilityWindow) return;
        
        this.vulnerabilityWindow.timer -= deltaTime * 1000;
        
        if (this.vulnerabilityWindow.timer <= 0) {
            this.vulnerabilityWindow.active = false;
            this.vulnerabilityWindow = null;
        }
    }
    
    createVulnerabilityWindow(duration = 3000) {
        this.vulnerabilityWindow = {
            active: true,
            timer: duration,
            damageMultiplier: 2.0
        };
        
        // Visual indicator
        this.visualEffects.push({
            x: this.x,
            y: this.y - 40,
            vx: 0,
            vy: -20,
            life: duration,
            maxLife: duration,
            color: '#ffd700',
            size: 16,
            type: 'text',
            text: 'VULNERABLE!',
            followTarget: true
        });
    }
    
    // Enhanced ability methods
    deployDrones(enemies) {
        const droneCount = this.phase >= 3 ? 3 : 2;
        const maxDrones = this.phase >= 4 ? 8 : 5;
        
        // Check if we can deploy more drones
        if (this.droneCount >= maxDrones) {
            console.log(`Maximum drone count (${maxDrones}) reached`);
            return 0;
        }
        
        const actualDroneCount = Math.min(droneCount, maxDrones - this.droneCount);
        let deployedDrones = 0;
        
        for (let i = 0; i < actualDroneCount; i++) {
            const angle = (Math.PI * 2 / actualDroneCount) * i;
            const distance = 60 + (Math.random() * 40);
            const droneX = this.x + Math.cos(angle) * distance;
            const droneY = this.y + Math.sin(angle) * distance;
            
            // Create enhanced drone with better integration
            const drone = this.createEnhancedDrone(droneX, droneY);
            
            // Properly integrate with enemy spawning system
            if (enemies && Array.isArray(enemies)) {
                enemies.push(drone);
                deployedDrones++;
                
                // Dispatch drone spawned event for tracking
                const droneEvent = new CustomEvent('droneSpawned', {
                    detail: {
                        drone: drone,
                        parentBoss: this,
                        spawnX: droneX,
                        spawnY: droneY,
                        phase: this.phase
                    }
                });
                document.dispatchEvent(droneEvent);
            }
        }
        
        this.droneCount += deployedDrones;
        
        // Create deployment visual effects
        this.createDroneDeploymentEffect(actualDroneCount);
        
        // Dispatch mass deployment event for achievement tracking
        const deployEvent = new CustomEvent('bossDroneDeployment', {
            detail: {
                boss: this,
                dronesDeployed: deployedDrones,
                totalDrones: this.droneCount,
                phase: this.phase,
                maxDrones: maxDrones
            }
        });
        document.dispatchEvent(deployEvent);
        
        // Integrate with game's enemy management system
        if (window.game && window.game.trackAchievement) {
            window.game.trackAchievement('boss_ability_used', {
                bossType: this.type,
                abilityType: 'deployDrones',
                dronesDeployed: deployedDrones,
                phase: this.phase
            });
        }
        
        console.log(`Deployed ${deployedDrones} drones (total: ${this.droneCount}/${maxDrones})`);
        return deployedDrones;
    }
    
    createDroneDeploymentEffect(count) {
        // Drone deployment portal effects
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const distance = 60;
            const portalX = this.x + Math.cos(angle) * distance;
            const portalY = this.y + Math.sin(angle) * distance;
            
            // Portal spawn effect
            this.visualEffects.push({
                x: portalX,
                y: portalY,
                radius: 20,
                maxRadius: 0,
                life: 1000,
                maxLife: 1000,
                color: '#fd79a8',
                type: 'contractingRing',
                lineWidth: 3
            });
            
            // Sparks and energy
            for (let j = 0; j < 8; j++) {
                const sparkAngle = Math.random() * Math.PI * 2;
                const sparkDistance = Math.random() * 30;
                
                this.visualEffects.push({
                    x: portalX + Math.cos(sparkAngle) * sparkDistance,
                    y: portalY + Math.sin(sparkAngle) * sparkDistance,
                    vx: Math.cos(sparkAngle) * 150,
                    vy: Math.sin(sparkAngle) * 150,
                    life: 800,
                    maxLife: 800,
                    color: '#fd79a8',
                    size: 3,
                    type: 'spark'
                });
            }
        }
    }
    
    createEnhancedDrone(x, y) {
        const drone = new Enemy('scriptKiddie', x, y, this.pathfinder);
        drone.type = 'corporateDrone';
        drone.speed *= (1.5 + this.phase * 0.3); // Faster based on boss phase
        drone.size *= 0.7;
        drone.health *= (0.4 + this.phase * 0.1); // More health in later phases
        drone.maxHealth = drone.health;
        drone.color = '#fd79a8';
        drone.pathIndex = Math.max(0, this.pathIndex - 2); // Start slightly behind boss
        
        // Enhanced drone abilities and behavior
        drone.abilities = ['fast_attack', 'swarm_behavior', 'boss_spawn'];
        drone.parentBoss = this;
        drone.isDrone = true;
        drone.reward *= 0.5; // Reduced reward for drones
        
        // Enhanced AI behavior for drones
        drone.aggressiveMode = true;
        drone.targetPriority = 'defenses'; // Drones prioritize attacking defenses
        
        // Drone-specific visual effects
        drone.trailColor = '#fd79a8';
        drone.glowEffect = true;
        
        // Integration with enemy management systems
        drone.spawnerType = 'boss';
        drone.spawnSource = this.type;
        drone.spawnPhase = this.phase;
        
        // Enhanced pathfinding for drones
        if (drone.pathfinder) {
            drone.pathUpdateInterval *= 0.5; // Update path more frequently
            drone.requestPriorityPathfinding();
        }
        
        return drone;
    }
    
    empBurst(defenses) {
        const range = 100 + (this.phase * 25);
        let affectedDefenses = 0;
        
        // Enhanced integration with defense array and systems
        defenses.forEach(defense => {
            if (Utils.distance(this.x, this.y, defense.x, defense.y) < range) {
                // Disable defense systems properly
                defense.disabled = true;
                defense.disabledTime = 2000 + (this.phase * 500);
                defense.stunned = true;
                defense.stunnedTime = 2000 + (this.phase * 500);
                defense.empSource = this; // Track EMP source for cleanup
                
                // Clear projectiles from disabled defense
                if (defense.projectiles) {
                    defense.projectiles.forEach(projectile => {
                        projectile.isActive = false;
                    });
                    defense.projectiles = [];
                }
                
                // Reset targeting system
                if (defense.targetEnemy) {
                    defense.targetEnemy = null;
                }
                
                // Visual feedback for disabled defense
                defense.empEffect = {
                    active: true,
                    duration: 2000 + (this.phase * 500),
                    startTime: Date.now()
                };
                
                affectedDefenses++;
            }
        });
        
        // Track ability usage
        this.abilitiesUsedCount = (this.abilitiesUsedCount || 0) + 1;
        
        // Create EMP visual effect
        this.createEmpEffect(range);
        
        // Create vulnerability window after using EMP
        setTimeout(() => {
            this.createVulnerabilityWindow(2000);
        }, 1000);
        
        // Dispatch enhanced EMP event for game systems
        const empEvent = new CustomEvent('bossEmpBurst', {
            detail: {
                boss: this,
                range: range,
                affectedDefenses: affectedDefenses,
                phase: this.phase,
                disableDuration: 2000 + (this.phase * 500)
            }
        });
        document.dispatchEvent(empEvent);
        
        console.log(`EMP Burst disabled ${affectedDefenses} defenses in range ${range}`);
        return affectedDefenses;
    }
    
    createEmpEffect(range) {
        // Expanding ring effect
        this.visualEffects.push({
            x: this.x,
            y: this.y,
            radius: 0,
            maxRadius: range,
            life: 1000,
            maxLife: 1000,
            color: '#74b9ff',
            type: 'expandingRing',
            lineWidth: 3
        });
    }
    
    shieldRegeneration() {
        const regenAmount = this.maxHealth * (0.05 + this.phase * 0.02);
        const oldHealth = this.health;
        
        this.health = Math.min(this.health + regenAmount, this.maxHealth);
        
        // Create healing visual effect
        this.createHealingEffect(this.health - oldHealth);
        
        return this.health - oldHealth;
    }
    
    createHealingEffect(amount) {
        // Healing particles
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 30;
            
            this.visualEffects.push({
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance,
                vx: Math.cos(angle) * 50,
                vy: Math.sin(angle) * 50 - 100,
                life: 2000,
                maxLife: 2000,
                color: '#00b894',
                size: 4,
                type: 'healing'
            });
        }
        
        // Floating text
        this.visualEffects.push({
            x: this.x,
            y: this.y - 30,
            vx: 0,
            vy: -40,
            life: 1500,
            maxLife: 1500,
            color: '#00b894',
            size: 14,
            type: 'text',
            text: `+${Math.floor(amount)}`
        });
    }
    
    corporateTakeover(defenses) {
        const range = 100;
        let takenDefenses = 0;
        
        // Enhanced corporate takeover with actual defense ownership changes
        defenses.forEach(defense => {
            if (Utils.distance(this.x, this.y, defense.x, defense.y) < range) {
                // Store original defense properties
                if (!defense.originalProperties) {
                    defense.originalProperties = {
                        color: defense.color,
                        targeting: defense.targeting || 'enemies',
                        damage: defense.damage,
                        fireRate: defense.fireRate,
                        range: defense.range
                    };
                }
                
                // Apply takeover effects
                defense.takenOver = true;
                defense.takeOverTime = 3000 + (this.phase * 1000);
                defense.color = '#e17055'; // Corporate orange
                defense.parentBoss = this; // Track which boss took over this defense
                
                // Change defense behavior - now targets player's other defenses or reduces effectiveness
                defense.compromised = true;
                defense.targeting = 'corrupted'; // Special targeting mode
                defense.damage *= 0.3; // Reduced damage when compromised
                defense.fireRate *= 1.5; // Fires more frequently but less effectively
                
                // Add corporate branding visual effect
                defense.corporateBranding = {
                    active: true,
                    logoOpacity: 0,
                    pulseTimer: 0
                };
                
                // Clear current target and projectiles
                defense.targetEnemy = null;
                if (defense.projectiles) {
                    defense.projectiles.forEach(projectile => {
                        projectile.color = '#e17055';
                        // Redirect projectiles or reduce their effectiveness
                        projectile.damage *= 0.3;
                    });
                }
                
                takenDefenses++;
            }
        });
        
        // Track ability usage and defenses taken
        this.abilitiesUsedCount = (this.abilitiesUsedCount || 0) + 1;
        this.defensesTakenCount = (this.defensesTakenCount || 0) + takenDefenses;
        
        // Create takeover visual effects
        this.createCorporateTakeoverEffect(range, takenDefenses);
        
        // Dispatch takeover event for achievement tracking and UI updates
        const takeoverEvent = new CustomEvent('bossCorporateTakeover', {
            detail: {
                boss: this,
                range: range,
                takenDefenses: takenDefenses,
                phase: this.phase,
                duration: 3000 + (this.phase * 1000)
            }
        });
        document.dispatchEvent(takeoverEvent);
        
        console.log(`Corporate Takeover compromised ${takenDefenses} defenses`);
        return takenDefenses;
    }
    
    createCorporateTakeoverEffect(range, count) {
        // Corporate takeover visual effects
        for (let i = 0; i < count * 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * range;
            
            this.visualEffects.push({
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100 - 50,
                life: 2000,
                maxLife: 2000,
                color: '#e17055',
                size: 6,
                type: 'corporate',
                text: '$'
            });
        }
        
        // Expanding corporate influence ring
        this.visualEffects.push({
            x: this.x,
            y: this.y,
            radius: 0,
            maxRadius: range,
            life: 1500,
            maxLife: 1500,
            color: '#e17055',
            type: 'expandingRing',
            lineWidth: 4,
            pattern: 'dashed'
        });
    }
    
    getShieldRegenCooldown() {
        return Math.max(4000, 8000 - (this.phase * 1000));
    }
    
    // Death sequence for bosses
    initiateBossDeathSequence() {
        if (!this.isBoss || this.deathSequenceStarted) return;
        
        this.deathSequenceStarted = true;
        this.deathAnimationTime = 3000; // Longer death animation for bosses
        
        // Create dramatic death effects
        this.createBossDeathEffects();
        
        // Enhanced boss defeat event with comprehensive data
        const bossDefeatData = {
            bossType: this.type,
            phase: this.phase,
            reward: this.reward * 2, // Double reward for bosses
            maxPhaseReached: this.phase,
            dronesDeployed: this.droneCount || 0,
            abilitiesUsed: this.abilitiesUsedCount || 0,
            damageDealt: this.totalDamageDealt || 0,
            defensesTaken: this.defensesTakenCount || 0,
            survivalTime: Date.now() - (this.spawnTime || Date.now())
        };
        
        // Dispatch comprehensive boss defeat event for achievement system
        const event = new CustomEvent('bossDefeated', {
            detail: bossDefeatData
        });
        document.dispatchEvent(event);
        
        // Trigger specific achievement checks for boss defeat
        if (window.game && window.game.trackAchievement) {
            // Track basic boss defeat
            window.game.trackAchievement('boss_defeated', {
                bossType: this.type,
                phase: this.phase,
                isBoss: true,
                amount: 1
            });
            
            // Track phase-specific achievements
            if (this.phase >= 3) {
                window.game.trackAchievement('boss_high_phase', {
                    bossType: this.type,
                    phase: this.phase
                });
            }
            
            // Track survival time achievements
            const survivalSeconds = bossDefeatData.survivalTime / 1000;
            if (survivalSeconds < 30) {
                window.game.trackAchievement('boss_quick_defeat', {
                    bossType: this.type,
                    time: survivalSeconds
                });
            }
            
            // Track drone-related achievements
            if (this.droneCount > 0) {
                window.game.trackAchievement('drone_master_defeated', {
                    bossType: this.type,
                    dronesDeployed: this.droneCount
                });
            }
        }
        
        // Update game state for boss defeat
        this.updateGameStateOnDefeat();
        
        // Screen shake
        if (window.game && window.game.camera) {
            window.game.camera.shake(2000, 15);
        }
        
        console.log(`Boss ${this.type} defeated in phase ${this.phase} after ${Math.floor(bossDefeatData.survivalTime / 1000)}s`);
    }
    
    updateGameStateOnDefeat() {
        // Restore any taken defenses when boss is defeated
        if (window.game && window.game.defenses) {
            window.game.defenses.forEach(defense => {
                if (defense.takenOver && defense.parentBoss === this) {
                    this.restoreDefenseFromTakeover(defense);
                }
                
                if (defense.disabled && defense.empSource === this) {
                    defense.disabled = false;
                    defense.disabledTime = 0;
                    defense.stunned = false;
                    defense.stunnedTime = 0;
                }
            });
        }
        
        // Mark drones for cleanup
        if (window.game && window.game.enemies) {
            window.game.enemies.forEach(enemy => {
                if (enemy.parentBoss === this && enemy.isDrone) {
                    enemy.parentDefeated = true;
                    // Drones become confused and slower when parent is defeated
                    enemy.speed *= 0.5;
                    enemy.confused = true;
                }
            });
        }
    }
    
    restoreDefenseFromTakeover(defense) {
        if (defense.originalProperties) {
            defense.color = defense.originalProperties.color;
            defense.targeting = defense.originalProperties.targeting;
            defense.damage = defense.originalProperties.damage;
            defense.fireRate = defense.originalProperties.fireRate;
            defense.range = defense.originalProperties.range;
            
            defense.takenOver = false;
            defense.takeOverTime = 0;
            defense.compromised = false;
            defense.corporateBranding = null;
            defense.originalProperties = null;
            
            console.log(`Defense restored from corporate takeover`);
        }
    }
    
    createBossDeathEffects() {
        // Massive explosion effect
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 150;
            const speed = 100 + Math.random() * 200;
            
            this.visualEffects.push({
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 2000 + Math.random() * 1000,
                maxLife: 3000,
                color: ['#ff6b6b', '#ffd700', '#74b9ff'][Math.floor(Math.random() * 3)],
                size: 6 + Math.random() * 8,
                type: 'explosion'
            });
        }
    }
    
    /**
     * Get comprehensive phase transition statistics for monitoring
     */
    getPhaseTransitionStats() {
        if (!this.phaseTransitionManager) {
            return {
                available: false,
                reason: 'Phase transition manager not initialized'
            };
        }

        return {
            available: true,
            stats: this.phaseTransitionManager.getStats(),
            currentPhase: this.phase,
            isBoss: this.isBoss,
            isAlive: this.isAlive,
            health: this.health,
            maxHealth: this.maxHealth,
            lastUpdate: Date.now()
        };
    }

    /**
     * Manual validation check for debugging
     */
    validateCurrentState(targetPhase = null) {
        if (!this.phaseTransitionManager) {
            return { error: 'Phase transition manager not available' };
        }

        if (targetPhase === null) {
            targetPhase = this.phase + 1; // Test next phase by default
        }

        return this.phaseTransitionManager.validator.validateTransition(targetPhase, {
            manual: true,
            debug: true,
            timestamp: Date.now()
        });
    }

    /**
     * Force emergency rollback (for debugging/recovery)
     */
    forceEmergencyRollback(reason = 'Manual rollback') {
        if (!this.phaseTransitionManager) {
            console.warn(`[Enemy] Cannot perform rollback - transition manager not available`);
            return false;
        }

        console.warn(`[Enemy] Force emergency rollback requested for ${this.type}: ${reason}`);
        return this.phaseTransitionManager.emergencyRollback(reason);
    }

    /**
     * Reset transition system (for debugging/recovery)
     */
    resetTransitionSystem() {
        if (this.phaseTransitionManager) {
            this.phaseTransitionManager.reset();
            console.log(`[Enemy] Phase transition system reset for ${this.type}`);
            return true;
        }
        return false;
    }
    
    // Cleanup method for performance
    cleanup() {
        // Clear references to prevent memory leaks
        this.currentPath = null;
        this.dynamicPath = null;
        this.pathfinder = null;
        this.trailParticles = [];
        this.visualEffects = [];
        this.phaseManager = null;
        
        // Cleanup boss phase transition manager
        if (this.phaseTransitionManager && typeof this.phaseTransitionManager.cleanup === 'function') {
            this.phaseTransitionManager.cleanup();
            this.phaseTransitionManager = null;
            console.log(`[Enemy] Boss Phase Transition Manager cleaned up for ${this.type}`);
        }
        
        if (this.lastPosition) {
            this.lastPosition = null;
        }
        
        console.log(`[Enemy] Cleanup completed for ${this.type}`);
    }
}

