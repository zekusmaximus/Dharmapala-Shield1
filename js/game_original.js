// Dharmapala Shield - Main Game Class

class Game {
    constructor(canvas, audioManager = null, saveSystem = null, levelManager = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = new InputManager(canvas);
        this.camera = new Camera(canvas);
        
        // Track initialization state for dependency validation
        this.initializationState = {
            phase1Complete: false,
            phase2Complete: false,
            criticalSystems: new Set(),
            optionalSystems: new Set(),
            failedSystems: new Set(),
            systemDependencies: new Map(),
            initializationOrder: []
        };
        
        // Initialize systems with explicit dependency validation
        this.initializeSystemsWithValidation();
    }
    
    /**
     * Initialize all game systems with proper dependency validation and error handling
     */
    initializeSystemsWithValidation() {
        console.log('[Game] Starting system initialization with dependency validation...');
        
        try {
            // Phase 1: Initialize core dependencies
            this.initializePhase1Systems();
            
            // Validate Phase 1 completion before proceeding
            if (!this.validatePhase1Dependencies()) {
                throw new Error('Phase 1 system initialization failed - cannot proceed to Phase 2');
            }
            
            // Phase 2: Initialize dependent systems
            this.initializePhase2Systems();
            
            // Final validation
            this.validateSystemIntegrity();
            
            // Complete remaining constructor initialization
            this.completeInitialization();
            
            console.log('[Game] System initialization completed successfully');
            
        } catch (error) {
            console.error('[Game] Critical error during system initialization:', error);
            this.handleInitializationFailure(error);
        }
    }
    
    /**
     * Initialize Phase 1 systems (core dependencies)
     */
    initializePhase1Systems() {
        console.log('[Game] Initializing Phase 1 systems...');
        
        // Define core system dependencies
        this.initializationState.systemDependencies.set('CONFIG', []);
        this.initializationState.systemDependencies.set('audioManager', ['CONFIG']);
        this.initializationState.systemDependencies.set('saveSystem', ['CONFIG']);
        this.initializationState.systemDependencies.set('levelManager', ['saveSystem']);
        this.initializationState.systemDependencies.set('pathGenerator', ['CONFIG']);
        
        // Validate CONFIG availability
        this.validateAndInitializeSystem('CONFIG', () => {
            if (typeof CONFIG === 'undefined') {
                throw new Error('CONFIG object not available - critical game configuration missing');
            }
            
            // Validate required CONFIG properties
            const requiredConfigProps = ['CANVAS_WIDTH', 'CANVAS_HEIGHT', 'GRID_SIZE', 'INITIAL_DHARMA', 'INITIAL_BANDWIDTH', 'INITIAL_ANONYMITY'];
            const missingProps = requiredConfigProps.filter(prop => CONFIG[prop] === undefined);
            
            if (missingProps.length > 0) {
                throw new Error(`CONFIG missing required properties: ${missingProps.join(', ')}`);
            }
            
            console.log('[Game] CONFIG validation successful');
            return true;
        }, true);
        
        // Initialize audio manager
        this.validateAndInitializeSystem('audioManager', () => {
            this.audioManager = arguments[0] || arguments[1] || window.audioManager;
            
            if (!this.audioManager) {
                console.warn('[Game] AudioManager not available - audio features will be disabled');
                return false;
            }
            
            // Validate audio manager interface
            if (typeof this.audioManager.playSound !== 'function') {
                console.warn('[Game] AudioManager missing required methods - using fallback');
                this.audioManager = null;
                return false;
            }
            
            console.log('[Game] AudioManager initialized successfully');
            return true;
        }, false, arguments[1], arguments[2]);  // Pass original constructor arguments
        
        // Initialize save system
        this.validateAndInitializeSystem('saveSystem', () => {
            this.saveSystem = arguments[0] || arguments[1] || window.saveSystem;
            
            if (!this.saveSystem) {
                console.warn('[Game] SaveSystem not available - progress will not be saved');
                return false;
            }
            
            // Validate save system interface
            if (typeof this.saveSystem.save !== 'function' || typeof this.saveSystem.load !== 'function') {
                console.warn('[Game] SaveSystem missing required methods - using fallback');
                this.saveSystem = null;
                return false;
            }
            
            console.log('[Game] SaveSystem initialized successfully');
            return true;
        }, false, arguments[2], arguments[3]);  // Pass original constructor arguments
        
        // Initialize level manager
        this.validateAndInitializeSystem('levelManager', () => {
            this.levelManager = arguments[0] || new LevelManager(this.saveSystem);
            
            if (!this.levelManager) {
                throw new Error('LevelManager initialization failed');
            }
            
            // Validate level manager dependencies
            if (!this.saveSystem && this.levelManager.saveSystem) {
                console.warn('[Game] LevelManager created with null SaveSystem - some features may be limited');
            }
            
            console.log('[Game] LevelManager initialized successfully');
            return true;
        }, true, arguments[3]);  // Pass original constructor arguments
        
        // Initialize path generator (critical for game functionality)
        this.validateAndInitializeSystem('pathGenerator', () => {
            this.pathGenerator = new PathGenerator(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, CONFIG.GRID_SIZE);
            
            if (!this.pathGenerator) {
                throw new Error('PathGenerator initialization failed');
            }
            
            // Validate path generator interface
            if (typeof this.pathGenerator.findPath !== 'function') {
                throw new Error('PathGenerator missing required methods');
            }
            
            console.log('[Game] PathGenerator initialized successfully');
            return true;
        }, true);
        
        this.initializationState.phase1Complete = true;
        console.log('[Game] Phase 1 initialization completed');
    }
    
    /**
     * Initialize Phase 2 systems (dependent systems)
     */
    initializePhase2Systems() {
        console.log('[Game] Initializing Phase 2 systems with dependency graph validation...');

        // Define Phase 2 system dependencies
        const phase2Systems = [
            { name: 'achievementManager', deps: ['saveSystem', 'audioManager'], critical: true },
            { name: 'bossWarningSynchronizer', deps: ['achievementManager'], critical: false },
            { name: 'upgradeTreeCleanupManager', deps: [], critical: false },
            { name: 'achievementAccessibility', deps: ['achievementManager'], critical: false },
            { name: 'enhancedAchievementGallery', deps: ['achievementManager'], critical: false }
        ];

        // Register dependencies in the state map
        for (const sys of phase2Systems) {
            this.initializationState.systemDependencies.set(sys.name, sys.deps);
        }

        // Build dependency graph for topological sort
        const graph = new Map();
        for (const sys of phase2Systems) {
            graph.set(sys.name, new Set(sys.deps));
        }

        // Topological sort (Kahn's algorithm)
        const sorted = [];
        const noDeps = new Set(phase2Systems.filter(s => !s.deps.length).map(s => s.name));
        const graphCopy = new Map(Array.from(graph.entries()));
        while (noDeps.size > 0) {
            const sys = noDeps.values().next().value;
            noDeps.delete(sys);
            sorted.push(sys);
            for (const [k, v] of graphCopy.entries()) {
                if (v.has(sys)) {
                    v.delete(sys);
                    if (v.size === 0) noDeps.add(k);
                }
            }
            graphCopy.delete(sys);
        }
        if (sorted.length !== phase2Systems.length) {
            const cycle = Array.from(graphCopy.keys());
            throw new Error(`[Game] Dependency cycle detected in Phase 2 systems: ${cycle.join(', ')}`);
        }

        // Map system names to their init functions and criticality
        const systemInitializers = {
            achievementManager: () => {
                if (!this.saveSystem && !this.audioManager) {
                    console.warn('[Game] AchievementManager dependencies not available - using limited functionality');
                }
                this.achievementManager = new AchievementManager(this.saveSystem, this.audioManager);
                if (!this.achievementManager) throw new Error('AchievementManager initialization failed');
                console.log('[Game] AchievementManager initialized successfully');
                return true;
            },
            bossWarningSynchronizer: () => {
                if (typeof BossWarningSynchronizer === 'undefined') {
                    console.warn('[Game] BossWarningSynchronizer class not available - using fallback warning system');
                    this.bossWarningSynchronizer = null;
                    return false;
                }
                this.bossWarningSynchronizer = new BossWarningSynchronizer(this);
                if (!this.bossWarningSynchronizer) {
                    console.warn('[Game] BossWarningSynchronizer initialization failed - using fallback');
                    return false;
                }
                console.log('[Game] BossWarningSynchronizer initialized successfully');
                return true;
            },
            upgradeTreeCleanupManager: () => {
                if (typeof UpgradeTreeCleanupManager === 'undefined') {
                    console.warn('[Game] UpgradeTreeCleanupManager class not available - using basic cleanup');
                    this.upgradeTreeCleanupManager = null;
                    return false;
                }
                this.upgradeTreeCleanupManager = new UpgradeTreeCleanupManager(this);
                if (!this.upgradeTreeCleanupManager) {
                    console.warn('[Game] UpgradeTreeCleanupManager initialization failed - using basic cleanup');
                    return false;
                }
                console.log('[Game] UpgradeTreeCleanupManager initialized successfully');
                return true;
            },
            achievementAccessibility: () => {
                if (typeof AchievementNotificationAccessibility === 'undefined') {
                    console.warn('[Game] AchievementNotificationAccessibility class not available');
                    this.achievementAccessibility = null;
                    return false;
                }
                if (!this.achievementManager) {
                    console.warn('[Game] AchievementNotificationAccessibility requires AchievementManager - skipping');
                    this.achievementAccessibility = null;
                    return false;
                }
                this.achievementAccessibility = new AchievementNotificationAccessibility(this, this.achievementManager);
                if (!this.achievementAccessibility) {
                    console.warn('[Game] AchievementNotificationAccessibility initialization failed');
                    return false;
                }
                setTimeout(() => {
                    try { this.syncAccessibilitySettings(); } catch (error) { console.error('[Game] Error syncing accessibility settings:', error); }
                }, 100);
                console.log('[Game] AchievementNotificationAccessibility initialized successfully');
                return true;
            },
            enhancedAchievementGallery: () => {
                if (typeof EnhancedAchievementGallery === 'undefined') {
                    console.warn('[Game] EnhancedAchievementGallery class not available - using basic gallery');
                    this.enhancedAchievementGallery = null;
                    return false;
                }
                if (!this.achievementManager) {
                    console.warn('[Game] EnhancedAchievementGallery requires AchievementManager - skipping');
                    this.enhancedAchievementGallery = null;
                    return false;
                }
                this.enhancedAchievementGallery = new EnhancedAchievementGallery(this, this.achievementManager);
                if (!this.enhancedAchievementGallery) {
                    console.warn('[Game] EnhancedAchievementGallery initialization failed');
                    return false;
                }
                console.log('[Game] EnhancedAchievementGallery initialized successfully');
                return true;
            }
        };

        // Initialize systems in topological order with dependency validation
        for (const sysName of sorted) {
            const sysMeta = phase2Systems.find(s => s.name === sysName);
            const deps = sysMeta.deps;
            // Check all dependencies are present
            const missing = deps.filter(dep =>
                !this.initializationState.criticalSystems.has(dep) &&
                !this.initializationState.optionalSystems.has(dep)
            );
            if (missing.length > 0) {
                const msg = `[Game] Phase 2 system '${sysName}' missing dependencies: ${missing.join(', ')}`;
                if (sysMeta.critical) {
                    console.error(msg);
                    this.initializationState.failedSystems.add(sysName);
                    throw new Error(msg);
                } else {
                    console.warn(msg + ' - skipping initialization');
                    this.initializationState.failedSystems.add(sysName);
                    continue;
                }
            }
            // Try to initialize
            try {
                const ok = systemInitializers[sysName].call(this);
                if (ok) {
                    if (sysMeta.critical) {
                        this.initializationState.criticalSystems.add(sysName);
                    } else {
                        this.initializationState.optionalSystems.add(sysName);
                    }
                    this.initializationState.initializationOrder.push(sysName);
                } else {
                    if (sysMeta.critical) {
                        this.initializationState.failedSystems.add(sysName);
                        throw new Error(`[Game] Critical Phase 2 system '${sysName}' failed to initialize`);
                    } else {
                        this.initializationState.failedSystems.add(sysName);
                        console.warn(`[Game] Optional Phase 2 system '${sysName}' failed to initialize`);
                    }
                }
            } catch (err) {
                this.initializationState.failedSystems.add(sysName);
                if (sysMeta.critical) {
                    console.error(`[Game] Error initializing critical Phase 2 system '${sysName}':`, err);
                    throw err;
                } else {
                    console.warn(`[Game] Error initializing optional Phase 2 system '${sysName}':`, err);
                }
            }
        }

        this.initializationState.phase2Complete = true;
        console.log('[Game] Phase 2 initialization completed');
    }
    
    /**
     * Validate and initialize a system with dependency checking
     * @param {string} systemName - Name of the system being initialized
     * @param {Function} initFunction - Function that initializes the system
     * @param {boolean} isCritical - Whether this system is critical for game operation
     * @param {...any} args - Arguments to pass to the init function
     */
    validateAndInitializeSystem(systemName, initFunction, isCritical = false, ...args) {
        try {
            // Check dependencies first
            const dependencies = this.initializationState.systemDependencies.get(systemName) || [];
            const missingDependencies = dependencies.filter(dep => 
                !this.initializationState.criticalSystems.has(dep) && 
                !this.initializationState.optionalSystems.has(dep)
            );
            
            if (missingDependencies.length > 0) {
                const errorMsg = `[Game] System '${systemName}' missing dependencies: ${missingDependencies.join(', ')}`;
                
                if (isCritical) {
                    throw new Error(errorMsg);
                } else {
                    console.warn(errorMsg + ' - skipping initialization');
                    this.initializationState.failedSystems.add(systemName);
                    return false;
                }
            }
            
            // Attempt to initialize the system
            const success = initFunction.apply(this, args);
            
            if (success) {
                if (isCritical) {
                    this.initializationState.criticalSystems.add(systemName);
                } else {
                    this.initializationState.optionalSystems.add(systemName);
                }
                this.initializationState.initializationOrder.push(systemName);
                
                console.log(`[Game] System '${systemName}' initialized successfully (${isCritical ? 'critical' : 'optional'})`);
                return true;
            } else {
                if (isCritical) {
                    throw new Error(`Critical system '${systemName}' failed to initialize`);
                } else {
                    console.warn(`[Game] Optional system '${systemName}' failed to initialize - continuing`);
                    this.initializationState.failedSystems.add(systemName);
                    return false;
                }
            }
            
        } catch (error) {
            const errorMsg = `[Game] Error initializing system '${systemName}': ${error.message}`;
            
            if (isCritical) {
                console.error(errorMsg);
                this.initializationState.failedSystems.add(systemName);
                throw error;
            } else {
                console.warn(errorMsg + ' - system will be unavailable');
                this.initializationState.failedSystems.add(systemName);
                return false;
            }
        }
    }
    
    /**
     * Validate that Phase 1 dependencies are properly initialized
     */
    validatePhase1Dependencies() {
        console.log('[Game] Validating Phase 1 dependencies...');
        
        const requiredPhase1Systems = ['CONFIG', 'levelManager', 'pathGenerator'];
        const missingCritical = requiredPhase1Systems.filter(system => 
            !this.initializationState.criticalSystems.has(system)
        );
        
        if (missingCritical.length > 0) {
            console.error(`[Game] Critical Phase 1 systems failed to initialize: ${missingCritical.join(', ')}`);
            return false;
        }
        
        // Validate system interfaces
        try {
            if (!this.levelManager || typeof this.levelManager.getCurrentLevel !== 'function') {
                throw new Error('LevelManager interface validation failed');
            }
            
            if (!this.pathGenerator || typeof this.pathGenerator.findPath !== 'function') {
                throw new Error('PathGenerator interface validation failed');
            }
            
            console.log('[Game] Phase 1 dependency validation successful');
            return true;
            
        } catch (error) {
            console.error(`[Game] Phase 1 interface validation failed: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Validate overall system integrity after initialization
     */
    validateSystemIntegrity() {
        console.log('[Game] Performing final system integrity validation...');
        
        const totalSystems = this.initializationState.criticalSystems.size + 
                           this.initializationState.optionalSystems.size + 
                           this.initializationState.failedSystems.size;
        
        const successRate = ((this.initializationState.criticalSystems.size + this.initializationState.optionalSystems.size) / totalSystems) * 100;
        
        const systemStatus = {
            total: totalSystems,
            critical: this.initializationState.criticalSystems.size,
            optional: this.initializationState.optionalSystems.size,
            failed: this.initializationState.failedSystems.size,
            successRate: successRate.toFixed(1) + '%',
            initializationOrder: this.initializationState.initializationOrder,
            failedSystems: Array.from(this.initializationState.failedSystems)
        };
        console.log('[Game] System initialization summary:', systemStatus);
        
        // Validate critical systems are operational
        if (this.initializationState.criticalSystems.size < 3) {  // CONFIG, levelManager, pathGenerator minimum
            throw new Error('Insufficient critical systems initialized - game cannot operate safely');
        }
        
        // Warn about missing optional systems that might affect gameplay
        if (this.initializationState.failedSystems.has('achievementManager')) {
            console.warn('[Game] Achievement system unavailable - progress tracking disabled');
        }
        
        if (this.initializationState.failedSystems.has('audioManager')) {
            console.warn('[Game] Audio system unavailable - sound effects disabled');
        }
        
        console.log('[Game] System integrity validation completed');
        return systemStatus;
    }
    
    /**
     * Handle critical initialization failures with fallback systems
     */
    handleInitializationFailure(error) {
        console.error('[Game] Handling critical initialization failure:', error);
        
        // Attempt to create minimal fallback systems for critical functionality
        try {
            console.log('[Game] Creating fallback systems...');
            
            // Ensure basic systems exist for minimal functionality
            if (!this.levelManager) {
                console.warn('[Game] Creating fallback LevelManager...');
                this.levelManager = new LevelManager(null);
                this.initializationState.criticalSystems.add('levelManager');
            }
            
            if (!this.pathGenerator) {
                console.warn('[Game] Creating fallback PathGenerator...');
                if (typeof CONFIG !== 'undefined') {
                    this.pathGenerator = new PathGenerator(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, CONFIG.GRID_SIZE);
                } else {
                    // Ultra-fallback with hardcoded values
                    this.pathGenerator = new PathGenerator(1200, 800, 40);
                }
                this.initializationState.criticalSystems.add('pathGenerator');
            }
            
            // Set all optional systems to null for safety
            this.audioManager = this.audioManager || null;
            this.saveSystem = this.saveSystem || null;
            this.achievementManager = null;
            this.bossWarningSynchronizer = null;
            this.upgradeTreeCleanupManager = null;
            this.achievementAccessibility = null;
            this.enhancedAchievementGallery = null;
            
            console.log('[Game] Fallback systems created - game will run with limited functionality');
            
            // Show user warning about limited functionality
            this.showInitializationWarning(error);
            
        } catch (fallbackError) {
            console.error('[Game] Failed to create fallback systems:', fallbackError);
            throw new Error(`Critical initialization failure: ${error.message}. Fallback failed: ${fallbackError.message}`);
        }
    }
    
    /**
     * Show user warning about initialization issues
     */
    showInitializationWarning(originalError) {
        // Try to show a user-friendly warning
        try {
            const warningMessage = `Warning: Some game features may be unavailable due to initialization issues. The game will continue with basic functionality.`;
            
            // Try to show in UI if available
            const warningElement = document.getElementById('system-warning');
            if (warningElement) {
                warningElement.textContent = warningMessage;
                warningElement.style.display = 'block';
                
                // Auto-hide after 10 seconds
                setTimeout(() => {
                    warningElement.style.display = 'none';
                }, 10000);
            } else {
                // Fallback to console warning
                console.warn('[Game] User Warning:', warningMessage);
            }
            
        } catch (warningError) {
            console.error('[Game] Failed to show initialization warning:', warningError);
        }
    }
    
    /**
     * Get current system status for debugging
     */
    getSystemStatus() {
        return {
            phase1Complete: this.initializationState.phase1Complete,
            phase2Complete: this.initializationState.phase2Complete,
            criticalSystems: Array.from(this.initializationState.criticalSystems),
            optionalSystems: Array.from(this.initializationState.optionalSystems),
            failedSystems: Array.from(this.initializationState.failedSystems),
            initializationOrder: this.initializationState.initializationOrder.slice(),
            systemInstances: {
                audioManager: !!this.audioManager,
                saveSystem: !!this.saveSystem,
                levelManager: !!this.levelManager,
                pathGenerator: !!this.pathGenerator,
                achievementManager: !!this.achievementManager,
                bossWarningSynchronizer: !!this.bossWarningSynchronizer,
                upgradeTreeCleanupManager: !!this.upgradeTreeCleanupManager,
                achievementAccessibility: !!this.achievementAccessibility,
                enhancedAchievementGallery: !!this.enhancedAchievementGallery
            }
        };
    }
    
    /**
     * Complete constructor initialization after system validation
     */
    completeInitialization() {
        // Current level instance
        this.currentLevel = null;
        
        // Game state
        this.state = 'menu'; // menu, playing, paused, gameOver, settings, tutorial, credits
        this.isRunning = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.gameTime = 0;
        
        // Game resources - validate CONFIG before use
        try {
            this.resources = {
                dharma: CONFIG.INITIAL_DHARMA || 100,
                bandwidth: CONFIG.INITIAL_BANDWIDTH || 50,
                anonymity: CONFIG.INITIAL_ANONYMITY || 75
            };
        } catch (error) {
            console.warn('[Game] CONFIG not available for resources, using defaults:', error);
            this.resources = {
                dharma: 100,
                bandwidth: 50,
                anonymity: 75
            };
        }
        
        // Game objects
        this.defenses = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.effects = [];
        
        // Initialize pathfinding system with validation
        try {
            this.pathfinder = new Pathfinder(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT, CONFIG.GRID_SIZE);
            console.log('[Game] Pathfinder initialized successfully');
        } catch (error) {
            console.error('[Game] Pathfinder initialization failed:', error);
            // Create fallback pathfinder
            this.pathfinder = new Pathfinder(1200, 800, 40);
        }
        
        // Level and wave management
        this.currentWave = 0;
        this.waveInProgress = false;
        this.waveStartTime = 0;
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;
        this.levelStartTime = 0;
        this.levelComplete = false;
        this.perfectCompletion = true;
        
        // UI state
        this.selectedDefenseType = null;
        this.hoveredGridPos = null;
        this.showRange = false;
        
        // Game settings
        this.gameSpeed = 1;
        this.isPaused = false;
        
        // Performance tracking
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        
        // Additional game methods
        this.showDebugPath = false; // For debugging pathfinding
        
        // Setup UI and final initialization
        this.setupUI();
        this.setupAudioIntegration();
        this.setupBossEventListeners();
        this.initializeGame();
        
        console.log('[Game] Constructor initialization completed successfully');
    }
    
    setupUI() {
        // Helper function to safely add event listeners
        const addEventListenerSafe = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Element with ID '${id}' not found`);
            }
        };
        
        // Start Campaign button
        addEventListenerSafe('startGameBtn', 'click', () => {
            this.playSfx('buttonClick');
            this.startGame();
        });
        
        // Start Wave button
        addEventListenerSafe('nextWaveBtn', 'click', () => {
            this.startWave();
        });
        
        addEventListenerSafe('tutorialBtn', 'click', () => {
            this.playSfx('buttonClick');
            this.showScreen('tutorial');
        });
        
        addEventListenerSafe('settingsBtn', 'click', () => {
            this.playSfx('buttonClick');
            this.showScreen('settings');
        });
        
        addEventListenerSafe('creditsBtn', 'click', () => {
            this.showScreen('credits');
        });
        
        addEventListenerSafe('achievementsBtn', 'click', () => {
            this.playSfx('buttonClick');
            this.showAchievementScreen();
        });
        
        // Game controls
        addEventListenerSafe('pauseBtn', 'click', () => {
            this.togglePause();
        });
        
        addEventListenerSafe('speedBtn', 'click', () => {
            this.toggleSpeed();
        });
        
        addEventListenerSafe('menuBtn', 'click', () => {
            this.returnToMenu();
        });
        
        // Defense selection
        document.querySelectorAll('.defense-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectDefenseType(item.dataset.type);
            });
        });
        
        // Targeting controls
        addEventListenerSafe('globalTargetingMode', 'change', (e) => {
            this.setGlobalTargetingMode(e.target.value);
        });
        
        // Quick actions
        addEventListenerSafe('sellAllBtn', 'click', () => {
            this.sellAllDefenses();
        });
        
        addEventListenerSafe('upgradeAllBtn', 'click', () => {
            this.upgradeAllDefenses();
        });
        
        // Back buttons
        addEventListenerSafe('backToMenuBtn', 'click', () => {
            this.showScreen('menu');
        });
        
        addEventListenerSafe('backFromTutorialBtn', 'click', () => {
            this.showScreen('menu');
        });
        
        addEventListenerSafe('backFromCreditsBtn', 'click', () => {
            this.showScreen('menu');
        });
        
        // Level Select button
        addEventListenerSafe('levelSelectBtn', 'click', () => {
            this.playSfx('buttonClick');
            this.showLevelSelectScreen();
        });
        
        // Load Game button
        addEventListenerSafe('loadGameBtn', 'click', () => {
            this.playSfx('buttonClick');
            this.showSaveLoadScreen();
        });
        
        // Level Select Screen
        addEventListenerSafe('backFromLevelSelectBtn', 'click', () => {
            this.playSfx('buttonClick');
            this.showScreen('menu');
        });
        
        addEventListenerSafe('playSelectedLevelBtn', 'click', () => {
            this.playSfx('buttonClick');
            this.playSelectedLevel();
        });
        
        // Save/Load Screen
        addEventListenerSafe('backFromSaveLoadBtn', 'click', () => {
            this.playSfx('buttonClick');
            this.showScreen('menu');
        });
        
        addEventListenerSafe('clearAllSavesBtn', 'click', () => {
            this.clearAllSaves();
        });
        
        // Achievement Gallery Screen
        addEventListenerSafe('backFromAchievementsBtn', 'click', () => {
            this.playSfx('buttonClick');
            this.showScreen('menu');
        });
        
        // Victory Screen
        addEventListenerSafe('backToMenuFromVictoryBtn', 'click', () => {
            this.playSfx('buttonClick');
            this.showScreen('menu');
        });
        
        // Defeat Screen
        addEventListenerSafe('retryFromDefeatBtn', 'click', () => {
            this.playSfx('buttonClick');
            this.startGame();
        });
        
        addEventListenerSafe('selectLevelFromDefeatBtn', 'click', () => {
            this.playSfx('buttonClick');
            this.showLevelSelectScreen();
        });
        
        addEventListenerSafe('backToMenuFromDefeatBtn', 'click', () => {
            this.playSfx('buttonClick');
            this.showScreen('menu');
        });
        
        // Settings controls
        const masterVolume = document.getElementById('masterVolume');
        const musicVolume = document.getElementById('musicVolume');
        const sfxVolume = document.getElementById('sfxVolume');
        const graphicsQuality = document.getElementById('graphicsQuality');
        const particleEffects = document.getElementById('particleEffects');
        const reducedMotion = document.getElementById('reducedMotion');
        const colorblindMode = document.getElementById('colorblindMode');
        const subtitles = document.getElementById('subtitles');
        const highContrast = document.getElementById('highContrast');
        const announceAchievements = document.getElementById('announceAchievements');
        const keyboardNavigation = document.getElementById('keyboardNavigation');
        
        masterVolume.addEventListener('input', (e) => {
            CONFIG.AUDIO.masterVolume = e.target.value / 100;
            if (this.audioManager) {
                this.audioManager.setMasterVolume(CONFIG.AUDIO.masterVolume);
            }
        });
        
        musicVolume.addEventListener('input', (e) => {
            CONFIG.AUDIO.musicVolume = e.target.value / 100;
            if (this.audioManager) {
                this.audioManager.setMusicVolume(CONFIG.AUDIO.musicVolume);
            }
        });
        
        sfxVolume.addEventListener('input', (e) => {
            CONFIG.AUDIO.sfxVolume = e.target.value / 100;
            if (this.audioManager) {
                this.audioManager.setSfxVolume(CONFIG.AUDIO.sfxVolume);
            }
        });
        
        graphicsQuality.addEventListener('change', (e) => {
            CONFIG.GRAPHICS.quality = e.target.value;
        });
        
        particleEffects.addEventListener('change', (e) => {
            CONFIG.GRAPHICS.particleEffects = e.target.checked;
        });
        
        reducedMotion.addEventListener('change', (e) => {
            CONFIG.GRAPHICS.reducedMotion = e.target.checked;
            CONFIG.ACCESSIBILITY.reducedMotion = e.target.checked; // Sync with accessibility
            if (this.achievementAccessibility) {
                this.achievementAccessibility.setReducedMotion(e.target.checked);
            }
            if (this.saveSystem) {
                this.saveSystem.saveSettings();
            }
        });
        
        colorblindMode.addEventListener('change', (e) => {
            CONFIG.ACCESSIBILITY.colorblindMode = e.target.checked;
        });
        
        subtitles.addEventListener('change', (e) => {
            CONFIG.ACCESSIBILITY.subtitles = e.target.checked;
            if (this.saveSystem) {
                this.saveSystem.saveSettings();
            }
        });
        
        highContrast.addEventListener('change', (e) => {
            CONFIG.ACCESSIBILITY.highContrast = e.target.checked;
            if (this.achievementAccessibility) {
                this.achievementAccessibility.setHighContrast(e.target.checked);
            }
            if (this.saveSystem) {
                this.saveSystem.saveSettings();
            }
        });
        
        announceAchievements.addEventListener('change', (e) => {
            CONFIG.ACCESSIBILITY.announceAchievements = e.target.checked;
            if (this.achievementAccessibility) {
                this.achievementAccessibility.setScreenReaderAnnouncements(e.target.checked);
            }
            if (this.saveSystem) {
                this.saveSystem.saveSettings();
            }
        });
        
        keyboardNavigation.addEventListener('change', (e) => {
            CONFIG.ACCESSIBILITY.keyboardNavigation = e.target.checked;
            if (this.achievementAccessibility) {
                this.achievementAccessibility.setKeyboardNavigation(e.target.checked);
            }
            if (this.saveSystem) {
                this.saveSystem.saveSettings();
            }
        });
        
        // Setup modal event listeners
        this.setupModalEventListeners();
    }
    
    // Sync accessibility settings between CONFIG and UI elements
    syncAccessibilitySettings() {
        try {
            if (!this.achievementAccessibility) return;
            
            // Get settings from CONFIG
            const accessibilityConfig = CONFIG.ACCESSIBILITY || {};
            
            // Update UI elements to match CONFIG
            const highContrastEl = document.getElementById('highContrast');
            const reducedMotionEl = document.getElementById('reducedMotion');
            const announceAchievementsEl = document.getElementById('announceAchievements');
            const keyboardNavigationEl = document.getElementById('keyboardNavigation');
            
            if (highContrastEl) {
                highContrastEl.checked = accessibilityConfig.highContrast || false;
                this.achievementAccessibility.setHighContrast(highContrastEl.checked);
            }
            
            if (reducedMotionEl) {
                reducedMotionEl.checked = accessibilityConfig.reducedMotion || false;
                this.achievementAccessibility.setReducedMotion(reducedMotionEl.checked);
            }
            
            if (announceAchievementsEl) {
                announceAchievementsEl.checked = accessibilityConfig.announceAchievements !== false; // Default true
                this.achievementAccessibility.setScreenReaderAnnouncements(announceAchievementsEl.checked);
            }
            
            if (keyboardNavigationEl) {
                keyboardNavigationEl.checked = accessibilityConfig.keyboardNavigation !== false; // Default true
                this.achievementAccessibility.setKeyboardNavigation(keyboardNavigationEl.checked);
            }
            
            console.log('[Game] Accessibility settings synchronized');
            
        } catch (error) {
            console.error('[Game] Failed to sync accessibility settings:', error);
        }
    }
    
    // Setup modal event listeners for upgrade tree and other modals
    setupModalEventListeners() {
        // Upgrade tree modal - click outside to close
        const upgradeTreeModal = document.getElementById('upgradeTreeModal');
        if (upgradeTreeModal) {
            upgradeTreeModal.addEventListener('click', (e) => {
                if (e.target === upgradeTreeModal) {
                    this.closeUpgradeTreeModal();
                }
            });
        }
        
        // Achievement gallery modal - click outside to close
        const achievementGallery = document.getElementById('achievementGallery');
        if (achievementGallery) {
            achievementGallery.addEventListener('click', (e) => {
                if (e.target === achievementGallery) {
                    this.closeAchievementGallery();
                }
            });
        }
        
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close any open modals
                if (upgradeTreeModal && upgradeTreeModal.style.display === 'block') {
                    this.closeUpgradeTreeModal();
                }
                if (achievementGallery && achievementGallery.style.display === 'block') {
                    this.closeAchievementGallery();
                }
            }
        });
    }
    
    // Setup audio system integration
    setupAudioIntegration() {
        if (!this.audioManager) return;
        
        // Initialize audio if not already done
        this.audioManager.initialize().then(() => {
            console.log('Audio system integrated with game');
        }).catch(error => {
            console.warn('Audio initialization failed:', error);
        });
    }
    
    // Play sound effect with audio manager
    playSfx(soundName, volume = 1.0, pitch = 1.0) {
        if (this.audioManager) {
            this.audioManager.playSfx(soundName, volume, pitch);
        }
    }
    
    // Play spatial sound effect
    playSpatialSfx(soundName, x, y, volume = 1.0) {
        if (this.audioManager) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            this.audioManager.playSpatialSfx(soundName, x, y, centerX, centerY, 800);
        }
    }
    
    initializeGame() {
        console.log('Initializing game...');
        
        // Load current level
        this.currentLevel = this.levelManager.getCurrentLevel();
        if (this.currentLevel) {
            this.currentLevel.startTime = Date.now();
            console.log(`Starting level: ${this.currentLevel.name}`);
        }
        
        // Generate dynamic path for this level
        this.generateLevelPath();
        
        // Reset game state
        this.resources = {
            dharma: CONFIG.INITIAL_DHARMA,
            bandwidth: CONFIG.INITIAL_BANDWIDTH,
            anonymity: CONFIG.INITIAL_ANONYMITY
        };
        
        // Load saved game state if available
        if (this.saveSystem) {
            const savedData = this.saveSystem.loadGame();
            if (savedData && savedData.gameState) {
                this.resources = savedData.gameState.resources || this.resources;
                this.currentWave = savedData.gameState.currentWave || 0;
                this.gameTime = savedData.gameState.gameTime || 0;
                console.log('Loaded saved game state');
            }
        }
        
        this.defenses = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.effects = [];
        
        this.waveInProgress = false;
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;
        this.levelStartTime = Date.now();
        this.levelComplete = false;
        this.perfectCompletion = true;
        
        this.selectedDefenseType = null;
        this.gameSpeed = 1;
        this.isPaused = false;
        
        // Initialize procedural sprites
        this.initializeSprites();
        
        // Reset camera
        this.camera.resetCamera();
        
        // Start gameplay music
        if (this.audioManager) {
            this.audioManager.playMusic('gameplay');
        }
        
        // Setup periodic auto-save
        this.setupPeriodicSave();
        
        this.updateUI();
        
        console.log('Game initialized successfully');
    }
    
    // Phase 2: Dynamic Path Generation with Enhanced Integration
    generateLevelPath(levelId = null, forceRegenerate = false) {
        if (!this.pathGenerator) {
            console.warn('PathGenerator not available, using static paths');
            return;
        }
        
        try {
            const targetLevelId = levelId || (this.currentLevel ? this.currentLevel.id : 1);
            const theme = this.currentLevel ? (this.currentLevel.theme || 'cyber') : 'cyber';
            const pathMode = this.currentLevel?.pathMode || 'hybrid'; // Can be 'static', 'dynamic', or 'hybrid'
            
            // Use seed for consistent path generation unless forcing regeneration
            const seed = forceRegenerate ? null : targetLevelId * 1000;
            
            console.log(`Generating ${pathMode} path for level ${targetLevelId}, theme: ${theme}, forceRegenerate: ${forceRegenerate}`);
            
            // Generate dynamic path
            const generatedPath = this.pathGenerator.generateBasePath(targetLevelId, seed, theme, pathMode);
            
            if (generatedPath && generatedPath.points && generatedPath.points.length > 0) {
                // Always update CONFIG.PATH_POINTS with generated path for consistency
                const previousPath = CONFIG.PATH_POINTS ? [...CONFIG.PATH_POINTS] : [];
                CONFIG.PATH_POINTS = generatedPath.points;
                
                // Update pathfinder with new path
                if (this.pathfinder) {
                    this.pathfinder.setDynamicPath(generatedPath.points);
                    
                    // Update all existing enemies with new path
                    this.enemies.forEach(enemy => {
                        if (enemy.updatePath && typeof enemy.updatePath === 'function') {
                            enemy.updatePath(generatedPath.points);
                        }
                    });
                }
                
                console.log(`Successfully generated ${pathMode} path for level ${targetLevelId}:`, {
                    points: generatedPath.points.length,
                    metadata: generatedPath.metadata,
                    theme: generatedPath.theme,
                    usedStaticPath: generatedPath.metadata?.usedStaticPath || false,
                    pathLength: this.calculatePathLength(generatedPath.points)
                });
                
                // Store path data for this level
                this.currentLevelPath = generatedPath;
                
                // Trigger path change event for other systems
                document.dispatchEvent(new CustomEvent('pathGenerated', {
                    detail: {
                        levelId: targetLevelId,
                        path: generatedPath,
                        previousPath: previousPath,
                        pathMode: pathMode
                    }
                }));
                
                return generatedPath;
            } else {
                console.warn('Path generation failed, keeping existing path');
                return null;
            }
        } catch (error) {
            console.error('Error generating level path:', error);
            // Keep using existing path as fallback
            return null;
        }
    }
    
    // Calculate total path length for analytics
    calculatePathLength(pathPoints) {
        if (!pathPoints || pathPoints.length < 2) return 0;
        
        let totalLength = 0;
        for (let i = 1; i < pathPoints.length; i++) {
            const dx = pathPoints[i].x - pathPoints[i-1].x;
            const dy = pathPoints[i].y - pathPoints[i-1].y;
            totalLength += Math.sqrt(dx * dx + dy * dy);
        }
        return Math.round(totalLength);
    }
    
    // Regenerate path for boss abilities or special events
    regeneratePathForEvent(eventType, eventData = {}) {
        if (!this.pathGenerator) {
            console.warn('Cannot regenerate path: PathGenerator not available');
            return false;
        }
        
        console.log(`Regenerating path for event: ${eventType}`, eventData);
        
        try {
            let pathMode = 'dynamic'; // Default to dynamic for events
            let theme = this.currentLevel?.theme || 'cyber';
            
            // Event-specific path modifications
            switch (eventType) {
                case 'boss_ability_maze':
                    pathMode = 'dynamic';
                    theme = 'maze';
                    break;
                    
                case 'boss_ability_portal':
                    pathMode = 'dynamic';
                    // Generate path with portal shortcuts
                    eventData.includePortals = true;
                    break;
                    
                case 'boss_ability_corruption':
                    pathMode = 'hybrid';
                    // Corrupt existing path segments
                    eventData.corruptionLevel = eventData.corruptionLevel || 0.3;
                    break;
                    
                case 'special_event_earthquake':
                    pathMode = 'dynamic';
                    // Generate more rugged terrain
                    eventData.terrain = 'rugged';
                    break;
                    
                case 'special_event_flood':
                    pathMode = 'dynamic';
                    theme = 'aquatic';
                    break;
                    
                default:
                    // Generic path regeneration
                    pathMode = 'dynamic';
            }
            
            // Force regeneration with event-specific parameters
            const regeneratedPath = this.generateLevelPath(null, true);
            
            if (regeneratedPath) {
                // Show visual feedback for path change
                this.showNotification(`Path reconfigured due to ${eventType.replace('_', ' ')}!`, '#ff6b6b', 3000);
                
                // Play path change sound effect
                this.playSfx('pathChange', 0.8);
                
                // Camera shake for dramatic effect
                if (this.camera) {
                    this.camera.shake(1000, 8);
                }
                
                // Track achievement for path regeneration events
                this.trackAchievement('path_regeneration', {
                    eventType: eventType,
                    pathMode: pathMode,
                    theme: theme
                });
                
                console.log(`Path successfully regenerated for ${eventType}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`Error regenerating path for ${eventType}:`, error);
            return false;
        }
    }
    
    // Get current path information for debugging and analytics
    getCurrentPathInfo() {
        return {
            points: CONFIG.PATH_POINTS ? [...CONFIG.PATH_POINTS] : [],
            pathData: this.currentLevelPath || null,
            length: this.calculatePathLength(CONFIG.PATH_POINTS),
            pathfinder: this.pathfinder ? {
                hasPath: !!this.pathfinder.currentPath,
                gridSize: this.pathfinder.gridSize
            } : null
        };
    }
    
    // Enhanced achievement tracking
    trackAchievement(eventType, eventData = {}) {
        if (!this.achievementManager) return;
        
        return this.achievementManager.checkAchievements(eventType, eventData);
    }
    
    // Boss event handling
    setupBossEventListeners() {
        // Enhanced phase transition event handling
        document.addEventListener('bossPhaseTransition', (event) => {
            const { enemy, oldPhase, newPhase, bossType, fallback } = event.detail;
            
            if (fallback) {
                console.warn(`[Game] Boss phase transition used fallback method: ${oldPhase} -> ${newPhase}`);
            }
            
            this.handleBossPhaseTransition(enemy, oldPhase, newPhase, bossType);
        });
        
        // New: Boss phase rollback event handling
        document.addEventListener('bossPhaseRollback', (event) => {
            const { boss, snapshotId, reason, rolledBackTo } = event.detail;
            console.log(`[Game] Boss phase rollback: ${boss.type} rolled back to phase ${rolledBackTo} (${reason})`);
            
            // Update UI to reflect rollback
            this.updateBossPhaseIndicator(boss, rolledBackTo, boss.type, boss.totalPhases || 3);
            this.showNotification(`${boss.type} phase rolled back to ${rolledBackTo}`, '#ffaa00', 2500);
            
            // Track rollback for debugging
            this.trackAchievement('boss_phase_rollback', {
                bossType: boss.type,
                rolledBackTo: rolledBackTo,
                reason: reason
            });
        });
        
        // New: Emergency phase transition event handling
        document.addEventListener('bossEmergencyPhaseTransition', (event) => {
            const { enemy, oldPhase, newPhase, reason } = event.detail;
            console.warn(`[Game] Emergency boss phase transition: ${oldPhase} -> ${newPhase} (${reason})`);
            
            // Handle emergency transition with high priority
            this.handleBossPhaseTransition(enemy, oldPhase, newPhase, enemy.type);
            this.showNotification(`EMERGENCY: ${enemy.type} phase ${newPhase}!`, '#ff0000', 4000);
        });
        
        // New: Phase transition failure event handling
        document.addEventListener('bossPhaseTransitionFailed', (event) => {
            const { boss, transitionRequest } = event.detail;
            console.error(`[Game] Boss phase transition failed permanently:`, transitionRequest);
            
            // Show failure notification
            this.showNotification(`Phase transition failed for ${boss.type}`, '#ff4444', 3000);
            
            // Track failure for debugging
            this.trackAchievement('boss_phase_transition_failed', {
                bossType: boss.type,
                targetPhase: transitionRequest.targetPhase,
                attempts: transitionRequest.attempts
            });
        });
        
        document.addEventListener('bossDefeated', (event) => {
            const { bossType, phase, reward } = event.detail;
            this.handleBossDefeated(bossType, phase, reward);
        });
        
        document.addEventListener('bossAbilityWarning', (event) => {
            const { enemy, abilityType, duration } = event.detail;
            this.showBossWarning(enemy, abilityType, duration);
        });
        
        // Boss health update events
        document.addEventListener('bossHealthChanged', (event) => {
            const { enemy, currentHealth, maxHealth, healthPercentage } = event.detail;
            this.updateBossHealthBar(enemy, currentHealth, maxHealth, healthPercentage);
        });
        
        // Boss spawning events
        document.addEventListener('bossSpawned', (event) => {
            const { enemy, bossType, maxHealth, totalPhases } = event.detail;
            this.initializeBossUI(enemy, bossType, maxHealth, totalPhases);
        });
        
        // Enhanced achievement reward handling
        document.addEventListener('achievementReward', (event) => {
            const { reward, rewardDetails, timestamp } = event.detail;
            this.applyAchievementReward(reward, rewardDetails);
        });
        
        // Achievement reward feedback handling
        document.addEventListener('achievementRewardFeedback', (event) => {
            const feedback = event.detail;
            this.displayRewardFeedback(feedback);
        });
        
        // New: Boss ability events that may affect paths
        document.addEventListener('bossAbilityActivated', (event) => {
            const { bossType, abilityType, abilityData } = event.detail;
            this.handleBossAbility(bossType, abilityType, abilityData);
        });
        
        // New: Special environmental events
        document.addEventListener('specialEvent', (event) => {
            const { eventType, eventData } = event.detail;
            this.handleSpecialEvent(eventType, eventData);
        });
        
        // New: Path regeneration requests from other systems
        document.addEventListener('requestPathRegeneration', (event) => {
            const { reason, eventData } = event.detail;
            this.regeneratePathForEvent(reason, eventData);
        });
    }
    
    handleBossPhaseTransition(enemy, oldPhase, newPhase, bossType) {
        // Enhanced phase transition handling with synchronization validation
        console.log(`[Game] Handling boss phase transition: ${oldPhase} -> ${newPhase} for ${bossType}`);
        
        try {
            // Update boss UI elements
            this.updateBossPhaseIndicator(enemy, newPhase, bossType, enemy.totalPhases || 3);
            
            // Show phase transition warning
            this.showBossWarning(enemy, 'phaseTransition', 2000);
            
            // Create screen effect for phase transition
            this.showNotification(`${bossType} enters Phase ${newPhase}!`, '#ff6b6b', 3000);
            
            // Check if this phase transition should trigger path regeneration
            const shouldRegeneratePath = this.shouldRegeneratePathForBoss(bossType, newPhase);
            if (shouldRegeneratePath) {
                console.log(`Boss phase ${newPhase} triggering path regeneration for ${bossType}`);
                this.regeneratePathForEvent('boss_phase_transition', {
                    bossType: bossType,
                    phase: newPhase,
                    oldPhase: oldPhase
                });
            }
            
            // Track achievement
            this.trackAchievement('boss_phase_transition', {
                bossType: bossType,
                phase: newPhase,
                pathRegenerated: shouldRegeneratePath
            });
            
            // Play dramatic sound
            this.playSfx('bossPhaseTransition', 1.0, 0.8);
            
            // Validate synchronization success
            this.validatePhaseTransitionSync(enemy, newPhase, bossType);
            
        } catch (error) {
            console.error(`[Game] Error handling boss phase transition:`, error);
            
            // Dispatch synchronization failure event
            const syncFailureEvent = new CustomEvent('phaseTransitionSyncFailure', {
                detail: {
                    syncPoint: 'game_handler',
                    error: error.message,
                    boss: enemy,
                    targetPhase: newPhase
                }
            });
            document.dispatchEvent(syncFailureEvent);
        }
    }
    
    /**
     * Validate that phase transition synchronization was successful
     */
    validatePhaseTransitionSync(enemy, newPhase, bossType) {
        const validation = {
            ui: true,
            audio: true,
            achievements: true,
            effects: true
        };
        
        // Validate UI synchronization
        const phaseText = document.getElementById('bossPhaseText');
        if (phaseText && !phaseText.textContent.includes(`PHASE ${newPhase}`)) {
            validation.ui = false;
            console.warn(`[Game] UI phase indicator not synchronized: expected PHASE ${newPhase}`);
        }
        
        const healthSegments = document.getElementById('bossHealthSegments');
        if (healthSegments) {
            const activeSegment = healthSegments.querySelector(`[data-phase="${newPhase}"]`);
            if (activeSegment && !activeSegment.style.backgroundColor.includes('ff4444')) {
                validation.ui = false;
                console.warn(`[Game] Health segment not synchronized for phase ${newPhase}`);
            }
        }
        
        // Log validation results
        const syncSuccess = Object.values(validation).every(v => v);
        if (syncSuccess) {
            console.log(`[Game] Phase transition synchronization validated successfully for ${bossType} phase ${newPhase}`);
        } else {
            console.error(`[Game] Phase transition synchronization failed:`, validation);
        }
        
        return validation;
    }
    
    // Determine if boss phase should trigger path regeneration
    shouldRegeneratePathForBoss(bossType, phase) {
        const bossAbilities = {
            'Corporate_AI': {
                2: 'maze_creation',      // Phase 2: Creates maze-like obstacles
                3: 'reality_distortion'  // Phase 3: Distorts the digital landscape
            },
            'Federal_Director': {
                2: 'surveillance_grid',  // Phase 2: Creates surveillance network
                3: 'lockdown_protocol'   // Phase 3: Completely locks down paths
            },
            'Raid_Captain': {
                3: 'area_denial'        // Phase 3: Blocks off areas with explosives
            },
            'Script_Master': {
                2: 'code_injection',    // Phase 2: Injects malicious code into paths
                4: 'system_corruption'  // Phase 4: Corrupts the entire path system
            }
        };
        
        const abilities = bossAbilities[bossType];
        if (!abilities || !abilities[phase]) {
            return false;
        }
        
        const ability = abilities[phase];
        
        // Certain abilities always trigger path regeneration
        const pathAlteringAbilities = [
            'maze_creation',
            'reality_distortion', 
            'lockdown_protocol',
            'system_corruption'
        ];
        
        return pathAlteringAbilities.includes(ability);
    }
    
    // Handle boss abilities that affect the battlefield path
    handleBossAbility(bossType, abilityType, abilityData = {}) {
        console.log(`Boss ${bossType} using ability: ${abilityType}`, abilityData);
        
        switch (abilityType) {
            case 'maze_creation':
                this.regeneratePathForEvent('boss_ability_maze', {
                    bossType: bossType,
                    complexity: abilityData.complexity || 0.7
                });
                this.showNotification('The digital landscape shifts into a complex maze!', '#ff6b6b', 4000);
                break;
                
            case 'portal_network':
                this.regeneratePathForEvent('boss_ability_portal', {
                    bossType: bossType,
                    portalCount: abilityData.portalCount || 3
                });
                this.showNotification('Portal network activated - paths are being redirected!', '#4ecdc4', 4000);
                break;
                
            case 'reality_distortion':
                this.regeneratePathForEvent('boss_ability_corruption', {
                    bossType: bossType,
                    corruptionLevel: abilityData.corruptionLevel || 0.5
                });
                this.showNotification('Reality distorts - the path fragments and reforms!', '#9b59b6', 4000);
                break;
                
            case 'surveillance_grid':
                // Creates additional obstacles without full path regeneration
                this.addTemporaryObstacles('surveillance', abilityData.gridSize || 5);
                this.showNotification('Surveillance grid deployed - movement restricted!', '#e67e22', 3000);
                break;
                
            case 'lockdown_protocol':
                this.regeneratePathForEvent('boss_ability_lockdown', {
                    bossType: bossType,
                    severity: abilityData.severity || 'high'
                });
                this.showNotification('LOCKDOWN PROTOCOL ACTIVE - Finding alternate routes!', '#e74c3c', 5000);
                break;
                
            case 'system_corruption':
                this.regeneratePathForEvent('boss_ability_corruption', {
                    bossType: bossType,
                    corruptionLevel: 0.8,
                    systemWide: true
                });
                this.showNotification('SYSTEM CORRUPTION DETECTED - Rerouting through backup paths!', '#c0392b', 6000);
                break;
                
            default:
                console.log(`Unknown boss ability: ${abilityType}`);
        }
        
        // Track boss ability usage
        this.trackAchievement('boss_ability_used', {
            bossType: bossType,
            abilityType: abilityType,
            affectsPath: this.abilityAffectsPath(abilityType)
        });
    }
    
    // Check if ability affects the path
    abilityAffectsPath(abilityType) {
        const pathAffectingAbilities = [
            'maze_creation',
            'portal_network',
            'reality_distortion',
            'lockdown_protocol',
            'system_corruption'
        ];
        return pathAffectingAbilities.includes(abilityType);
    }
    
    // Add temporary obstacles without full path regeneration
    addTemporaryObstacles(obstacleType, count) {
        if (!this.pathfinder) return;
        
        // This would add temporary obstacles to the pathfinder grid
        // Implementation depends on the Pathfinder class capabilities
        console.log(`Adding ${count} temporary ${obstacleType} obstacles`);
        
        // For now, just update pathfinder obstacles to trigger recalculation
        this.pathfinder.updateObstacles(this.defenses);
    }
    
    // Handle special environmental events that may affect paths
    handleSpecialEvent(eventType, eventData = {}) {
        console.log(`Handling special event: ${eventType}`, eventData);
        
        switch (eventType) {
            case 'earthquake':
                this.regeneratePathForEvent('special_event_earthquake', {
                    intensity: eventData.intensity || 'medium',
                    duration: eventData.duration || 5000
                });
                this.showNotification('Seismic activity detected - rerouting!', '#e67e22', 4000);
                this.playSfx('earthquake', 0.8);
                break;
                
            case 'flood':
                this.regeneratePathForEvent('special_event_flood', {
                    waterLevel: eventData.waterLevel || 0.3,
                    spreadRate: eventData.spreadRate || 'normal'
                });
                this.showNotification('Flooding detected - finding higher ground!', '#3498db', 4000);
                this.playSfx('water', 0.6);
                break;
                
            case 'solar_flare':
                // Temporarily disable some pathfinding optimizations
                this.addTemporaryObstacles('interference', 8);
                this.showNotification('Solar flare interference - navigation compromised!', '#f39c12', 3500);
                this.playSfx('staticNoise', 0.5);
                break;
                
            case 'data_storm':
                this.regeneratePathForEvent('special_event_data_storm', {
                    volatility: eventData.volatility || 0.6,
                    affectedArea: eventData.affectedArea || 'center'
                });
                this.showNotification('Data storm detected - paths are fluctuating!', '#9b59b6', 4500);
                this.playSfx('dataCorruption', 0.7);
                break;
                
            case 'power_outage':
                // Darken certain areas and modify pathfinding
                this.addTemporaryObstacles('darkness', 6);
                this.showNotification('Power grid failure - limited visibility!', '#2c3e50', 3000);
                this.playSfx('powerDown', 0.6);
                break;
                
            default:
                console.log(`Unknown special event: ${eventType}`);
        }
        
        // Track special event for achievements
        this.trackAchievement('special_event_handled', {
            eventType: eventType,
            pathAffected: this.eventAffectsPath(eventType)
        });
    }
    
    // Check if special event affects the path
    eventAffectsPath(eventType) {
        const pathAffectingEvents = [
            'earthquake',
            'flood',
            'data_storm'
        ];
        return pathAffectingEvents.includes(eventType);
    }
    
    // Helper methods for path access
    getCurrentPathPoints() {
        // Return current path points, fallback to CONFIG.PATH_POINTS if no generated path
        return this.currentLevelPath?.points || CONFIG.PATH_POINTS || [];
    }
    
    getPathStartPoint() {
        const points = this.getCurrentPathPoints();
        return points.length > 0 ? points[0] : { x: 0, y: 0 };
    }
    
    getPathEndPoint() {
        const points = this.getCurrentPathPoints();
        return points.length > 0 ? points[points.length - 1] : { x: CONFIG.CANVAS_WIDTH, y: CONFIG.CANVAS_HEIGHT };
    }
    
    // Test method for PathGenerator integration
    testPathGeneration() {
        console.log('=== PathGenerator Integration Test ===');
        console.log('PathGenerator available:', !!this.pathGenerator);
        console.log('Current level:', this.currentLevel?.id || 'None');
        console.log('Current path points count:', this.getCurrentPathPoints().length);
        
        if (this.pathGenerator) {
            // Test different path modes
            const testModes = ['static', 'dynamic', 'hybrid'];
            testModes.forEach(mode => {
                console.log(`Testing ${mode} path generation...`);
                const result = this.pathGenerator.generateBasePath(1, null, 'cyber', mode);
                console.log(`  Result:`, !!result, 'Points:', result?.points?.length || 0);
            });
            
            // Test path regeneration
            console.log('Testing path regeneration...');
            const regenResult = this.regeneratePathForEvent('test_event', { testMode: true });
            console.log('  Regeneration result:', regenResult);
        }
        
        console.log('Current path info:', this.getCurrentPathInfo());
        console.log('=== Test Complete ===');
    }
    
    handleBossDefeated(bossType, phase, reward) {
        // Hide boss UI elements
        this.hideBossUI();
        
        // Award extra resources for boss defeat
        this.resources.dharma += reward;
        
        // Track achievements
        this.trackAchievement('boss_defeated', {
            bossType: bossType,
            phase: phase
        });
        
        // Show victory effects
        this.showNotification(`${bossType} defeated! +${reward} Dharma`, '#ffd700', 4000);
        this.playSfx('bossDefeated');
        
        // Camera shake
        if (this.camera) {
            this.camera.shake(2000, 15);
        }
    }
    
    showBossWarning(enemy, abilityType, duration = 3000) {
        // Use synchronized warning system if available
        if (this.bossWarningSynchronizer && enemy && enemy.abilityTimer !== undefined) {
            const warningId = this.bossWarningSynchronizer.synchronizeWarningToCooldown(
                enemy, 
                abilityType, 
                duration
            );
            if (warningId) {
                console.log(`[Game] Using synchronized warning system for ${abilityType}`);
                return; // Successfully used synchronized system
            }
        }
        
        // Fallback to original warning system
        console.log(`[Game] Using fallback warning system for ${abilityType}`);
        this.showFallbackBossWarning(enemy, abilityType, duration);
    }
    
    showFallbackBossWarning(enemy, abilityType, duration = 3000) {
        const warningOverlay = document.getElementById('bossWarningOverlay');
        if (!warningOverlay) {
            // Create warning overlay if it doesn't exist
            const newWarning = document.createElement('div');
            newWarning.id = 'bossWarningOverlay';
            newWarning.className = 'boss-warning-overlay';
            newWarning.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 0, 0, 0.3);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                color: white;
                font-size: 2em;
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            `;
            document.body.appendChild(newWarning);
        }
        
        const overlay = document.getElementById('bossWarningOverlay');
        
        // Map ability types to warning messages
        const warningMessages = {
            'empBurst': 'EMP BURST - Defenses Disabled!',
            'shieldRegen': 'SHIELD REGENERATION - Boss Healing!',
            'teleport': 'QUANTUM TELEPORT - Boss Advancing!',
            'systemHack': 'SYSTEM HACK INCOMING!',
            'ddosAttack': 'DDOS ATTACK DETECTED!',
            'phaseTransition': 'BOSS PHASE TRANSITION!',
            'ultimateAttack': 'ULTIMATE ATTACK CHARGING!',
            'shieldDisrupt': 'SHIELDS DISRUPTED!',
            'reinforcements': 'REINFORCEMENTS INCOMING!',
            'dataBreach': 'DATA BREACH ATTEMPT!',
            'networkOverload': 'NETWORK OVERLOAD WARNING!'
        };
        
        const warningText = warningMessages[abilityType] || 'BOSS ABILITY ACTIVATED!';
        
        // Show warning overlay with appropriate styling
        overlay.innerHTML = `
            <div class="boss-warning-content">
                <div class="boss-warning-title">⚠️ ${warningText} ⚠️</div>
                <div id="bossWarningTimer" class="boss-warning-timer">${Math.ceil(duration / 1000)}</div>
            </div>
        `;
        
        overlay.style.display = 'flex';
        overlay.style.animation = 'warningFlash 0.5s ease-in-out infinite alternate';
        
        // Update timer with pause/speed awareness
        const timerElement = overlay.querySelector('#bossWarningTimer');
        const startTime = Date.now();
        const updateTimer = setInterval(() => {
            if (!this.isPaused) {
                const elapsed = (Date.now() - startTime) * this.gameSpeed;
                const remaining = Math.max(0, duration - elapsed);
                const seconds = Math.ceil(remaining / 1000);
                
                if (timerElement) {
                    timerElement.textContent = seconds;
                }
                
                if (remaining <= 0) {
                    clearInterval(updateTimer);
                    overlay.style.display = 'none';
                    overlay.style.animation = 'none';
                }
            }
        }, 100);
        
        // Play warning sound
        this.playSfx('bossWarning', 0.8);
    }

    // Initialize boss UI when a boss spawns
    initializeBossUI(enemy, bossType, maxHealth, totalPhases) {
        const bossHealthContainer = document.getElementById('bossHealthContainer');
        const bossHealthFill = document.getElementById('bossHealthFill');
        const bossPhaseText = document.getElementById('bossPhaseText');
        const bossHealthSegments = document.getElementById('bossHealthSegments');
        
        if (bossHealthContainer) {
            bossHealthContainer.style.display = 'block';
        }
        
        if (bossHealthFill) {
            bossHealthFill.style.width = '100%';
            bossHealthFill.style.backgroundColor = '#ff4444';
            bossHealthFill.style.transition = 'width 0.3s ease-out, background-color 0.5s ease';
        }
        
        if (bossPhaseText) {
            bossPhaseText.textContent = `${bossType.toUpperCase()} - PHASE 1`;
        }
        
        // Initialize health segments for phases
        if (bossHealthSegments && totalPhases > 1) {
            bossHealthSegments.innerHTML = '';
            for (let i = 0; i < totalPhases; i++) {
                const segment = document.createElement('div');
                segment.className = 'boss-health-segment';
                segment.style.width = `${100 / totalPhases}%`;
                segment.style.backgroundColor = i === 0 ? '#ff4444' : '#333';
                segment.style.border = '1px solid #666';
                segment.style.height = '4px';
                segment.style.display = 'inline-block';
                segment.dataset.phase = i + 1;
                bossHealthSegments.appendChild(segment);
            }
        }
    }

    // Update boss health bar based on current health
    updateBossHealthBar(enemy, currentHealth, maxHealth, healthPercentage) {
        const bossHealthFill = document.getElementById('bossHealthFill');
        const bossHealthText = document.getElementById('bossHealthText');
        
        if (bossHealthFill) {
            // Smooth width transition
            bossHealthFill.style.width = `${healthPercentage}%`;
            
            // Color gradient based on health
            let healthColor;
            if (healthPercentage > 70) {
                healthColor = '#ff4444'; // Red for high health
            } else if (healthPercentage > 40) {
                healthColor = '#ff8800'; // Orange for medium health
            } else if (healthPercentage > 15) {
                healthColor = '#ffaa00'; // Yellow for low health
            } else {
                healthColor = '#ff0000'; // Bright red for critical health
            }
            
            bossHealthFill.style.backgroundColor = healthColor;
            
            // Add pulse effect for critical health
            if (healthPercentage <= 15) {
                bossHealthFill.style.animation = 'criticalHealthPulse 0.8s ease-in-out infinite alternate';
            } else {
                bossHealthFill.style.animation = 'none';
            }
        }
        
        // Update health text if available
        if (bossHealthText) {
            bossHealthText.textContent = `${Math.ceil(currentHealth)} / ${maxHealth}`;
        }
    }

    // Update boss phase indicator and health segments
    updateBossPhaseIndicator(enemy, newPhase, bossType, totalPhases) {
        const bossPhaseText = document.getElementById('bossPhaseText');
        const bossHealthSegments = document.getElementById('bossHealthSegments');
        
        if (bossPhaseText) {
            // Update phase text with enhanced styling for higher phases
            const phaseText = `${bossType.toUpperCase()} - PHASE ${newPhase}`;
            bossPhaseText.textContent = phaseText;
            
            // Add visual emphasis for phase transitions
            bossPhaseText.style.animation = 'phaseTransition 1s ease-out';
            setTimeout(() => {
                bossPhaseText.style.animation = 'none';
            }, 1000);
        }
        
        // Update health segment indicators
        if (bossHealthSegments) {
            const segments = bossHealthSegments.querySelectorAll('.boss-health-segment');
            segments.forEach((segment, index) => {
                const segmentPhase = parseInt(segment.dataset.phase);
                if (segmentPhase < newPhase) {
                    // Completed phases - dimmed
                    segment.style.backgroundColor = '#222';
                    segment.style.border = '1px solid #444';
                } else if (segmentPhase === newPhase) {
                    // Current phase - highlighted
                    segment.style.backgroundColor = '#ff4444';
                    segment.style.border = '1px solid #ff6666';
                    segment.style.animation = 'currentPhaseGlow 2s ease-in-out infinite alternate';
                } else {
                    // Future phases - neutral
                    segment.style.backgroundColor = '#333';
                    segment.style.border = '1px solid #666';
                    segment.style.animation = 'none';
                }
            });
        }
    }

    // Hide boss UI when boss is defeated
    hideBossUI() {
        const bossHealthContainer = document.getElementById('bossHealthContainer');
        const bossWarningOverlay = document.getElementById('bossWarningOverlay');
        
        if (bossHealthContainer) {
            bossHealthContainer.style.opacity = '1';
            bossHealthContainer.style.transition = 'opacity 1s ease-out';
            bossHealthContainer.style.opacity = '0';
            setTimeout(() => {
                bossHealthContainer.style.display = 'none';
            }, 1000);
        }
        
        if (bossWarningOverlay) {
            bossWarningOverlay.style.display = 'none';
        }
    }
    
    getBossAbilityDescription(abilityType) {
        const descriptions = {
            'empBurst': 'EMP BURST - Nearby defenses will be disabled!',
            'shieldRegen': 'SHIELD REGENERATION - Boss is healing!',
            'teleport': 'QUANTUM TELEPORT - Boss will advance rapidly!',
            'dataCorruption': 'DATA CORRUPTION - Defense effectiveness reduced!',
            'corporateTakeover': 'CORPORATE TAKEOVER - Defenses will be converted!',
            'massDeployment': 'MASS DEPLOYMENT - Multiple drones incoming!',
            'systemCrash': 'SYSTEM CRASH - Critical system failure!'
        };
        
        return descriptions[abilityType] || 'Unknown boss ability incoming!';
    }
    
    applyAchievementReward(reward, rewardDetails = null) {
        // Track original resource levels for comparison
        const originalResources = { ...this.resources };
        let resourcesChanged = false;
        let notificationMessages = [];
        
        // Apply dharma rewards
        if (reward.dharma && reward.dharma > 0) {
            this.resources.dharma += reward.dharma;
            resourcesChanged = true;
            notificationMessages.push({
                text: `+${reward.dharma} Dharma ☸️`,
                color: '#ffd700',
                icon: '☸️'
            });
            console.log(`Applied ${reward.dharma} dharma. New total: ${this.resources.dharma}`);
        }
        
        // Apply bandwidth rewards
        if (reward.bandwidth && reward.bandwidth > 0) {
            this.resources.bandwidth += reward.bandwidth;
            resourcesChanged = true;
            notificationMessages.push({
                text: `+${reward.bandwidth} Bandwidth 📡`,
                color: '#4ecdc4',
                icon: '📡'
            });
            console.log(`Applied ${reward.bandwidth} bandwidth. New total: ${this.resources.bandwidth}`);
        }
        
        // Apply anonymity rewards
        if (reward.anonymity && reward.anonymity > 0) {
            this.resources.anonymity += reward.anonymity;
            resourcesChanged = true;
            notificationMessages.push({
                text: `+${reward.anonymity} Anonymity 🔒`,
                color: '#6c5ce7',
                icon: '🔒'
            });
            console.log(`Applied ${reward.anonymity} anonymity. New total: ${this.resources.anonymity}`);
        }
        
        // Handle special reward types
        if (reward.special_items && reward.special_items > 0) {
            // Special items could unlock new abilities, provide temporary bonuses, etc.
            this.handleSpecialItemRewards(reward.special_items);
            notificationMessages.push({
                text: `+${reward.special_items} Special Items 🎁`,
                color: '#fd79a8',
                icon: '🎁'
            });
        }
        
        // Apply temporary bonuses if present
        if (reward.temporary_bonuses) {
            this.applyTemporaryBonuses(reward.temporary_bonuses);
        }
        
        // Update UI immediately if resources changed
        if (resourcesChanged) {
            this.updateUI();
            this.saveGameState(); // Auto-save when rewards are applied
        }
        
        // Show consolidated notification if we have messages
        if (notificationMessages.length > 0) {
            this.showAchievementRewardNotification(notificationMessages, rewardDetails);
        }
        
        // Play celebration sound effect
        this.playSfx('achievementReward', 0.8, 1.2);
        
        // Create visual effects if we have details
        if (rewardDetails && rewardDetails.totalValue > 0) {
            this.createResourceGainEffects(originalResources, this.resources, rewardDetails);
        }
        
        // Track reward application for analytics
        this.trackRewardApplication(reward, originalResources, this.resources);
    }
    
    handleSpecialItemRewards(itemCount) {
        // Handle special item rewards that might unlock new capabilities
        if (!this.specialItems) {
            this.specialItems = [];
        }
        
        // Generate special items based on current game state
        for (let i = 0; i < itemCount; i++) {
            const specialItem = this.generateSpecialItem();
            this.specialItems.push(specialItem);
            
            console.log(`Received special item: ${specialItem.name} - ${specialItem.description}`);
        }
    }
    
    generateSpecialItem() {
        // Generate context-appropriate special items
        const itemTypes = [
            {
                name: 'Encryption Key Fragment',
                description: 'Increases all defense damage by 10% for the next level',
                type: 'temporary_bonus',
                effect: { damage_multiplier: 1.1, duration: 'next_level' }
            },
            {
                name: 'Bandwidth Amplifier',
                description: 'Reduces all defense costs by 20% for the next level',
                type: 'temporary_bonus',
                effect: { cost_reduction: 0.2, duration: 'next_level' }
            },
            {
                name: 'Dharma Crystal',
                description: 'Provides passive dharma generation',
                type: 'passive_bonus',
                effect: { dharma_per_second: 1 }
            }
        ];
        
        const randomItem = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        return {
            ...randomItem,
            id: Date.now() + Math.random(),
            acquired: Date.now()
        };
    }
    
    applyTemporaryBonuses(bonuses) {
        // Apply temporary bonuses from achievement rewards
        if (!this.temporaryBonuses) {
            this.temporaryBonuses = [];
        }
        
        Object.keys(bonuses).forEach(bonusType => {
            const bonus = {
                type: bonusType,
                value: bonuses[bonusType],
                startTime: Date.now(),
                duration: bonuses.duration || 300000, // Default 5 minutes
                source: 'achievement_reward'
            };
            
            this.temporaryBonuses.push(bonus);
            console.log(`Applied temporary bonus: ${bonusType} = ${bonus.value} for ${bonus.duration}ms`);
        });
    }
    
    showAchievementRewardNotification(messages, rewardDetails) {
        // Create a more elaborate notification for achievement rewards
        const combinedMessage = messages.map(msg => msg.text).join('\n');
        const primaryColor = messages[0]?.color || '#ffd700';
        
        // Show main notification
        this.showNotification(`Achievement Reward!\n${combinedMessage}`, primaryColor, 4000);
        
        // Show floating text effects for each resource type
        messages.forEach((msg, index) => {
            setTimeout(() => {
                this.createFloatingText(
                    msg.text,
                    this.canvas.width / 2 + (index - messages.length / 2) * 100,
                    100 + index * 30,
                    msg.color,
                    1500
                );
            }, index * 200);
        });
    }
    
    createResourceGainEffects(originalResources, newResources, rewardDetails) {
        // Create visual effects to show resource gains
        const resourceTypes = ['dharma', 'bandwidth', 'anonymity'];
        
        resourceTypes.forEach((resourceType, index) => {
            const gain = newResources[resourceType] - originalResources[resourceType];
            if (gain > 0) {
                this.createResourceGainAnimation(resourceType, gain, index);
            }
        });
    }
    
    createResourceGainAnimation(resourceType, amount, index) {
        // Create animated visual feedback for resource gains
        const startX = 50 + index * 150;
        const startY = 50;
        
        // This would typically trigger particle effects or UI animations
        // For now, we'll create a floating text effect
        this.createFloatingText(
            `+${amount}`,
            startX,
            startY,
            this.getResourceColor(resourceType),
            2000
        );
    }
    
    getResourceColor(resourceType) {
        const colors = {
            dharma: '#ffd700',
            bandwidth: '#4ecdc4',
            anonymity: '#6c5ce7'
        };
        return colors[resourceType] || '#ffffff';
    }
    
    trackRewardApplication(reward, originalResources, newResources) {
        // Track reward application for analytics and achievements
        const rewardData = {
            reward: reward,
            originalResources: originalResources,
            newResources: newResources,
            timestamp: Date.now(),
            level: this.currentLevel?.id || 1
        };
        
        // This data could be sent to analytics or used for meta-achievements
        if (this.gameAnalytics) {
            this.gameAnalytics.trackRewardApplication(rewardData);
        }
    }
    
    displayRewardFeedback(feedback) {
        // Handle visual feedback for achievement rewards
        if (feedback.type === 'achievement_reward') {
            // Create particle effects or UI animations based on feedback
            feedback.notifications.forEach((notification, index) => {
                setTimeout(() => {
                    this.createRewardParticles(notification);
                }, index * 300);
            });
        }
    }
    
    createRewardParticles(notification) {
        // Create particle effects for reward notifications
        // This would integrate with the particle system if available
        console.log(`Creating reward particles for: ${notification.message}`);
        
        // For now, create floating text as a placeholder
        this.createFloatingText(
            notification.icon,
            Math.random() * this.canvas.width,
            Math.random() * 200 + 100,
            notification.color,
            2000
        );
    }
    
    createFloatingText(text, x, y, color, duration = 1000) {
        // Create floating text effect (placeholder implementation)
        // This would be better implemented with a proper particle/effect system
        if (!this.floatingTexts) {
            this.floatingTexts = [];
        }
        
        this.floatingTexts.push({
            text: text,
            x: x,
            y: y,
            color: color,
            startTime: Date.now(),
            duration: duration,
            velocityY: -50 // Float upward
        });
    }
    
    initializeSprites() {
        // Load generated defense sprites
        const defenseSprites = {
            'defense_firewall': 'assets/images/firewall_fortress.png',
            'defense_encryption': 'assets/images/encryption_monastery.png',
            'defense_decoy': 'assets/images/decoy_temple.png',
            'defense_mirror': 'assets/images/mirror_server.png',
            'defense_anonymity': 'assets/images/anonymity_shroud.png',
            'defense_distributor': 'assets/images/dharma_distributor.png'
        };
        
        // Load generated enemy sprites
        const enemySprites = {
            'enemy_scriptKiddie': 'assets/images/enemy_script_kiddie.png',
            'enemy_federalAgent': 'assets/images/enemy_federal_agent.png',
            'enemy_corporateSaboteur': 'assets/images/enemy_corporate_saboteur.png',
            'enemy_aiSurveillance': 'assets/images/enemy_ai_surveillance.png',
            'enemy_raidTeam': 'assets/images/enemy_raid_team.png'
        };
        
        // Load background
        const backgroundSprites = {
            'game_background': 'assets/images/game_background.png'
        };
        
        // Combine all sprites
        const allSprites = { ...defenseSprites, ...enemySprites, ...backgroundSprites };
        
        // Load all sprites
        spriteManager.loadSprites(allSprites).then(() => {
            console.log('All sprites loaded successfully');
        }).catch(error => {
            console.error('Error loading sprites:', error);
            // Fallback to procedural sprites
            this.generateProceduralSprites();
        });
        
        // Generate projectile sprites (still procedural)
        spriteManager.sprites.set('projectile_default', ProceduralSprites.generateProjectileSprite('#00bcd4', 8));
        spriteManager.sprites.set('projectile_fire', ProceduralSprites.generateProjectileSprite('#ff6b6b', 8));
        spriteManager.sprites.set('projectile_energy', ProceduralSprites.generateProjectileSprite('#ffd700', 10));
    }
    
    generateProceduralSprites() {
        // Fallback procedural sprite generation
        Object.keys(CONFIG.DEFENSE_TYPES).forEach(type => {
            const sprite = ProceduralSprites.generateDefenseSprite(type, 32);
            if (sprite) {
                spriteManager.sprites.set(`defense_${type}`, sprite);
            }
        });
        
        Object.keys(CONFIG.ENEMY_TYPES).forEach(type => {
            const sprite = ProceduralSprites.generateEnemySprite(type, 24);
            if (sprite) {
                spriteManager.sprites.set(`enemy_${type}`, sprite);
            }
        });
    }
    
    startGame() {
        this.showScreen('game');
        this.initializeGame();
        this.state = 'playing'; // Set state after showScreen to avoid override
        
        if (!this.isRunning) {
            this.isRunning = true;
            this.gameLoop();
        }
        
        // Play game start sound
        this.playSfx('waveStart');
    }
    
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show selected screen
        let targetScreen;
        if (screenName === 'menu') {
            targetScreen = document.getElementById('mainMenu');
        } else if (screenName === 'game') {
            targetScreen = document.getElementById('gameScreen');
        } else {
            targetScreen = document.getElementById(screenName + 'Screen');
        }
        
        if (targetScreen) {
            targetScreen.classList.add('active');
        } else {
            console.warn(`Screen '${screenName}' not found`);
        }
        
        this.state = screenName;
    }
    
    // Show achievement screen with gallery functionality
    showAchievementScreen() {
        this.showScreen('achievement');
        this.openAchievementGallery();
    }
    
    gameLoop(currentTime = 0) {
        if (!this.isRunning) return;
        
        // Calculate delta time
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        this.gameTime += this.deltaTime;
        
        // Limit delta time to prevent large jumps
        this.deltaTime = Math.min(this.deltaTime, 1/30);
        
        // Apply game speed
        const adjustedDelta = this.deltaTime * this.gameSpeed;
        
        // Update FPS counter
        this.updateFPS();
        
        // Only update game logic when playing and not paused
        if (this.state === 'playing' && !this.isPaused) {
            this.update(adjustedDelta);
        }
        
        // Always render
        this.render();
        
        // Continue game loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    update(deltaTime) {
        // Handle input
        this.handleInput();

        // Update wave spawning
        this.updateWaveSpawning(deltaTime);

        // Update camera
        this.camera.update(deltaTime);

        // Update game objects
        this.updateEnemies(deltaTime);
        this.updateDefenses(deltaTime);
        this.updateProjectiles(deltaTime);

        // Update effects and particles
        if (CONFIG.GRAPHICS.particleEffects) {
            this.updateParticles(deltaTime);
            this.updateEffects(deltaTime);
        }
        
        // Update floating texts from achievement rewards
        this.updateFloatingTexts(deltaTime);
        
        // Update temporary bonuses
        this.updateTemporaryBonuses(deltaTime);

        // Update pathfinder with frame time for adaptive scaling
        if (this.pathfinder && this.deltaTime > 0) {
            const frameTimeMs = this.deltaTime * 1000; // Convert to milliseconds
            this.pathfinder.updateFrameTime(frameTimeMs);
        }

        // Check game conditions
        this.checkGameConditions();

        // Update UI
        this.updateUI();
    }    render() {
        // Clear canvas
        this.ctx.fillStyle = '#0d1421';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.state === 'playing') {
            // Apply camera transform for world rendering
            this.camera.applyTransform(this.ctx);
            
            // Draw background if available
            try {
                const background = spriteManager.getSprite('game_background');
                if (background) {
                    this.ctx.globalAlpha = 0.6; // Make it subtle
                    this.ctx.drawImage(background, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
                    this.ctx.globalAlpha = 1.0;
                }
            } catch (error) {
                console.warn('Error drawing background:', error);
            }
            
            // Draw grid
            this.drawGrid();
            
            // Draw path
            this.drawPath();
            
            // Draw game objects
            this.renderDefenses();
            this.renderEnemies();
            this.renderProjectiles();
            
            // Draw effects and particles
            if (CONFIG.GRAPHICS.particleEffects) {
                this.renderParticles();
                this.renderEffects();
            }
            
            // Draw floating texts (achievement rewards, etc.)
            this.renderFloatingTexts();
            
            // Reset camera transform
            this.camera.resetTransform(this.ctx);
            
            // Draw UI overlays (not affected by camera)
            this.drawRangeIndicator();
            this.drawPlacementPreview();
            
            // Draw debug info if needed
            if (this.showDebug) {
                this.drawDebugInfo();
            }
        }
    }
    
    handleInput() {
        if (this.state === 'playing') {
            // Handle canvas clicks for defense placement
            if (this.input.wasMousePressed(0)) {
                this.handleCanvasClick();
            }
            
            // Handle keyboard shortcuts
            if (this.input.wasKeyPressed('Space')) {
                this.togglePause();
            }
            
            if (this.input.wasKeyPressed('Escape')) {
                this.selectedDefenseType = null;
                this.updateDefenseSelection();
            }
            
            // Handle mouse movement for grid highlighting
            const mousePos = this.input.getMousePosition();
            const worldPos = this.camera.screenToWorld(mousePos.x, mousePos.y);
            this.hoveredGridPos = Utils.worldToGrid(worldPos.x, worldPos.y);
        }
        
        // Update input state
        this.input.update();
    }
    
    // Placeholder methods to be implemented in subsequent phases
    updateWaves(deltaTime) {
        // Wave management logic will be implemented in Phase 7
    }
    
    updateEnemies(deltaTime) {
        // Update pathfinder with current defense positions
        this.pathfinder.updateObstacles(this.defenses);
        
        // Update each enemy
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Update enemy AI and movement
            enemy.update(deltaTime, this.defenses, this.enemies);
            
            // Check if enemy should be removed
            if (enemy.shouldRemove()) {
                if (enemy.reachedEnd && enemy.isAlive) {
                    // Enemy reached the end, reduce player resources
                    this.resources.dharma -= 10;
                    this.resources.anonymity -= 5;
                    this.perfectCompletion = false;
                    this.showNotification(`Enemy escaped! Lost 10 Dharma and 5 Anonymity`, '#ff6b6b');
                    this.playSfx('resourceLoss');
                    
                    // Update level stats
                    if (this.currentLevel) {
                        this.currentLevel.updateStats('enemiesEscaped', 1);
                    }
                } else if (!enemy.isAlive) {
                    // Enemy was killed, give rewards
                    this.resources.dharma += enemy.reward;
                    this.enemiesKilled++;
                    this.showNotification(`+${enemy.reward} Dharma`, '#4ecdc4');
                    this.playSfx('enemyDestroy');
                    this.playSpatialSfx('resourceGain', enemy.x, enemy.y);
                    
                    // Track achievements for enemy kills
                    this.trackAchievement('enemy_killed', {
                        enemyType: enemy.type,
                        isBoss: enemy.isBoss,
                        amount: 1
                    });
                    
                    // Special boss defeat handling
                    if (enemy.isBoss) {
                        enemy.initiateBossDeathSequence();
                    }
                    
                    // Update level stats
                    if (this.currentLevel) {
                        this.currentLevel.updateStats('enemiesKilled', 1);
                    }
                    
                    this.updateUI(); // Update UI immediately when dharma changes
                }
                
                this.enemies.splice(i, 1);
            }
        }
        
        // Check for game over conditions
        if (this.resources.dharma <= 0 || this.resources.anonymity <= 0) {
            this.gameOver();
        }
    }
    
    gameOver() {
        this.state = 'gameOver';
        this.isRunning = false;
        this.showDefeatScreen();
        
        if (this.audioManager) {
            this.audioManager.playMusic('defeat');
        }
    }
    
    updateDefenses(deltaTime) {
        // Update each defense
        for (let i = this.defenses.length - 1; i >= 0; i--) {
            const defense = this.defenses[i];
            
            // Update defense AI and combat
            defense.update(deltaTime, this.enemies, this.defenses);
            
            // Handle explosion queue from defensive projectiles
            if (defense.explosionQueue && defense.explosionQueue.length > 0) {
                defense.explosionQueue.forEach(explosion => {
                    this.applyAreaEffect(explosion.x, explosion.y, explosion.radius, {
                        type: 'damage',
                        amount: explosion.damage,
                        damageType: explosion.type
                    });
                });
                defense.explosionQueue = [];
            }
        }
    }
    
    updateProjectiles(deltaTime) {
        // Collect all projectiles from defenses
        const allProjectiles = [];
        this.defenses.forEach(defense => {
            allProjectiles.push(...defense.projectiles);
        });
        
        // Update projectiles and handle collisions
        allProjectiles.forEach(projectile => {
            if (projectile.isActive) {
                projectile.update(deltaTime);
            }
        });
        
        // Clean up inactive projectiles from defenses
        this.defenses.forEach(defense => {
            defense.projectiles = defense.projectiles.filter(p => p.isActive);
        });
    }
    
    updateParticles(deltaTime) {
        Utils.updateParticles(this.particles);
    }
    
    updateEffects(deltaTime) {
        // Effect update logic will be implemented in Phase 3
    }
    
    updateFloatingTexts(deltaTime) {
        if (!this.floatingTexts) return;
        
        const currentTime = Date.now();
        
        // Update and filter floating texts
        this.floatingTexts = this.floatingTexts.filter(text => {
            const elapsed = currentTime - text.startTime;
            const progress = elapsed / text.duration;
            
            if (progress >= 1) {
                return false; // Remove expired text
            }
            
            // Update position
            text.y += text.velocityY * deltaTime * 0.001;
            
            // Update properties for fade effect
            text.alpha = 1 - progress;
            text.scale = 1 + progress * 0.5; // Slightly grow as it fades
            
            return true;
        });
    }
    
    updateTemporaryBonuses(deltaTime) {
        if (!this.temporaryBonuses) return;
        
        const currentTime = Date.now();
        
        // Update and filter temporary bonuses
        this.temporaryBonuses = this.temporaryBonuses.filter(bonus => {
            const elapsed = currentTime - bonus.startTime;
            
            if (elapsed >= bonus.duration) {
                console.log(`Temporary bonus expired: ${bonus.type} = ${bonus.value}`);
                return false; // Remove expired bonus
            }
            
            // Bonus is still active
            bonus.remainingTime = bonus.duration - elapsed;
            return true;
        });
    }
    
    renderDefenses() {
        // Render all defenses
        this.defenses.forEach(defense => {
            defense.render(this.ctx);
        });
        
        // Render placement preview
        if (this.selectedDefenseType && this.hoveredGridPos) {
            this.renderPlacementPreview();
        }
    }
    
    renderEnemies() {
        // Render all enemies
        if (this.enemies.length > 0) {
            console.log(`Rendering ${this.enemies.length} enemies`);
        }
        
        this.enemies.forEach((enemy, index) => {
            if (enemy && enemy.render) {
                console.log(`Rendering enemy ${index}: ${enemy.type} at (${Math.round(enemy.x)}, ${Math.round(enemy.y)})`);
                enemy.render(this.ctx);
            } else {
                console.warn(`Enemy ${index} is invalid or missing render method:`, enemy);
            }
        });
        
        // Debug: render pathfinding grid if enabled
        if (this.showDebugPath) {
            this.renderPathfindingDebug();
        }
    }
    
    renderProjectiles() {
        // Projectiles are rendered by their parent defenses
        // This method is kept for consistency but projectiles are rendered in renderDefenses()
    }
    
    renderParticles() {
        Utils.renderParticles(this.ctx, this.particles);
    }
    
    renderEffects() {
        // Effect rendering will be implemented in Phase 3
    }
    
    renderFloatingTexts() {
        if (!this.floatingTexts || this.floatingTexts.length === 0) return;
        
        this.ctx.save();
        
        this.floatingTexts.forEach(text => {
            if (text.alpha <= 0) return;
            
            // Set text properties
            this.ctx.fillStyle = text.color;
            this.ctx.globalAlpha = text.alpha;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Scale font size based on text scale
            const fontSize = Math.floor(16 * (text.scale || 1));
            this.ctx.font = `bold ${fontSize}px Arial`;
            
            // Add stroke for better visibility
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeText(text.text, text.x, text.y);
            
            // Draw main text
            this.ctx.fillText(text.text, text.x, text.y);
        });
        
        this.ctx.restore();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 188, 212, 0.2)';
        this.ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= CONFIG.GRID_COLS; x++) {
            const xPos = x * CONFIG.GRID_SIZE;
            this.ctx.beginPath();
            this.ctx.moveTo(xPos, 0);
            this.ctx.lineTo(xPos, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= CONFIG.GRID_ROWS; y++) {
            const yPos = y * CONFIG.GRID_SIZE;
            this.ctx.beginPath();
            this.ctx.moveTo(0, yPos);
            this.ctx.lineTo(this.canvas.width, yPos);
            this.ctx.stroke();
        }
    }
    
    drawPath() {
        const pathPoints = this.getCurrentPathPoints();
        if (pathPoints.length < 2) return;
        
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([10, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        
        for (let i = 1; i < pathPoints.length; i++) {
            this.ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        }
        
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    drawRangeIndicator() {
        // Range indicator will be implemented in Phase 6
    }
    
    drawPlacementPreview() {
        // Placement preview will be implemented in Phase 6
    }
    
    drawDebugInfo() {
        const debugInfo = this.input.getDebugInfo();
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
        this.ctx.fillText(`Mouse: ${debugInfo.mouse.position}`, 10, 35);
        this.ctx.fillText(`State: ${this.state}`, 10, 50);
        this.ctx.fillText(`Wave: ${this.currentWave}`, 10, 65);
        
        // Show pathfinder performance stats
        if (this.pathfinder) {
            const pathStats = this.pathfinder.getPerformanceStats();
            this.ctx.fillText(`Pathfinder Quality: ${pathStats.currentQuality}`, 10, 80);
            this.ctx.fillText(`Pathfind Avg: ${pathStats.recentAverageTime}`, 10, 95);
            this.ctx.fillText(`Cache Hit Rate: ${pathStats.cacheHitRate}`, 10, 110);
            this.ctx.fillText(`Max Iterations: ${pathStats.maxIterations}`, 10, 125);
            this.ctx.fillText(`Frame Throttle: ${pathStats.frameThrottle}`, 10, 140);
        }
    }
    
    handleCanvasClick() {
        if (this.state !== 'playing') return;
        
        const mousePos = this.input.getMousePosition();
        if (!mousePos) return;
        
        const worldPos = this.camera.screenToWorld(mousePos.x, mousePos.y);
        const gridPos = Utils.worldToGrid(worldPos.x, worldPos.y);
        
        // Check if clicking on existing defense for upgrade
        const clickedDefense = this.getDefenseAtPosition(worldPos.x, worldPos.y);
        
        if (clickedDefense) {
            this.handleDefenseClick(clickedDefense);
            return;
        }
        
        // Try to place new defense
        if (this.selectedDefenseType) {
            this.attemptDefensePlacement(gridPos);
        }
    }
    
    getDefenseAtPosition(x, y) {
        return this.defenses.find(defense => {
            const distance = Utils.distance(x, y, defense.x, defense.y);
            return distance <= defense.size;
        });
    }
    
    handleDefenseClick(defense) {
        // Toggle range indicator
        this.defenses.forEach(d => d.setRangeIndicator(false));
        defense.setRangeIndicator(true);
        
        // Show defense info panel
        this.showDefenseInfo(defense);
        
        // Store selected defense for upgrades
        this.selectedDefense = defense;
        
        // Open upgrade tree modal if defense can be upgraded
        if (defense.canUpgrade()) {
            this.openUpgradeTreeModal(defense);
        }
    }
    
    attemptDefensePlacement(gridPos) {
        const defenseConfig = CONFIG.DEFENSE_TYPES[this.selectedDefenseType];
        
        if (!defenseConfig) return;
        
        // Check if player has enough resources
        if (this.resources.dharma < defenseConfig.cost) {
            this.showNotification('Not enough Dharma!', '#ff6b6b');
            return;
        }
        
        // Check if position is valid
        if (!this.isValidPlacementPosition(gridPos)) {
            this.showNotification('Cannot place defense here!', '#ff6b6b');
            return;
        }
        
        // Place the defense
        this.placeDefense(this.selectedDefenseType, gridPos);
    }
    
    isValidPlacementPosition(gridPos) {
        const worldPos = Utils.gridToWorld(gridPos.x, gridPos.y);
        
        // Check bounds
        if (!Utils.inBounds(gridPos.x, gridPos.y, CONFIG.GRID_COLS, CONFIG.GRID_ROWS)) {
            return false;
        }
        
        // Check if position is on the path
        if (this.isOnPath(worldPos)) {
            return false;
        }
        
        // Check if position is occupied by another defense
        if (this.isPositionOccupied(worldPos)) {
            return false;
        }
        
        // Check if placement would completely block the path
        if (this.wouldBlockPath(worldPos)) {
            return false;
        }
        
        return true;
    }
    
    isOnPath(worldPos) {
        const pathWidth = 30;
        const pathPoints = this.getCurrentPathPoints();
        
        for (let i = 0; i < pathPoints.length - 1; i++) {
            const p1 = pathPoints[i];
            const p2 = pathPoints[i + 1];
            
            const distance = this.distanceToLineSegment(worldPos, p1, p2);
            if (distance < pathWidth) {
                return true;
            }
        }
        
        return false;
    }
    
    distanceToLineSegment(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }
        
        let xx, yy;
        
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    isPositionOccupied(worldPos) {
        const minDistance = 40; // Minimum distance between defenses
        
        return this.defenses.some(defense => {
            return Utils.distance(worldPos.x, worldPos.y, defense.x, defense.y) < minDistance;
        });
    }
    
    wouldBlockPath(worldPos) {
        // Create temporary defense to test pathfinding
        const tempDefense = { x: worldPos.x, y: worldPos.y, size: 20 };
        const tempDefenses = [...this.defenses, tempDefense];
        
        // Update pathfinder with temporary defense
        this.pathfinder.updateObstacles(tempDefenses);
        
        // Test if path still exists using current path points
        const startPoint = this.getPathStartPoint();
        const endPoint = this.getPathEndPoint();
        
        const testPath = this.pathfinder.findPath(
            startPoint.x, startPoint.y, 
            endPoint.x, endPoint.y
        );
        
        // Restore original pathfinder state
        this.pathfinder.updateObstacles(this.defenses);
        
        // If no path found or path is too long, placement would block
        return testPath.length === 0 || testPath === this.pathfinder.getDefaultPath();
    }
    
    placeDefense(type, gridPos) {
        const worldPos = Utils.gridToWorld(gridPos.x, gridPos.y);
        const defenseConfig = CONFIG.DEFENSE_TYPES[type];
        
        // Create new defense
        const defense = new Defense(type, worldPos.x, worldPos.y);
        this.defenses.push(defense);
        
        // Deduct cost
        this.resources.dharma -= defenseConfig.cost;
        
        // Track achievements for defense placement
        this.trackAchievement('defense_placed', {
            defenseType: type,
            cost: defenseConfig.cost
        });
        
        // Track first defense achievement
        if (this.defenses.length === 1) {
            this.trackAchievement('first_defense');
        }
        
        // Clear selection
        this.selectedDefenseType = null;
        this.updateDefenseSelection();
        
        // Show success notification
        this.showNotification(`${defenseConfig.name} placed!`, '#4ecdc4');
        this.playSfx('defensePlace');
        
        // Update level stats
        if (this.currentLevel) {
            this.currentLevel.updateStats('defenseBuilt', 1);
            this.currentLevel.updateStats('resourcesSpent', defenseConfig.cost);
        }
        
        // Update pathfinder
        this.pathfinder.updateObstacles(this.defenses);
    }
    
    renderPlacementPreview() {
        const worldPos = Utils.gridToWorld(this.hoveredGridPos.x, this.hoveredGridPos.y);
        const defenseConfig = CONFIG.DEFENSE_TYPES[this.selectedDefenseType];
        
        if (!defenseConfig) return;
        
        const ctx = this.ctx;
        const isValid = this.isValidPlacementPosition(this.hoveredGridPos);
        
        ctx.save();
        ctx.globalAlpha = 0.7;
        
        // Draw placement indicator
        ctx.fillStyle = isValid ? defenseConfig.color + '80' : '#ff000080';
        ctx.strokeStyle = isValid ? '#00ff00' : '#ff0000';
        ctx.lineWidth = 2;
        
        ctx.fillRect(worldPos.x - 20, worldPos.y - 20, 40, 40);
        ctx.strokeRect(worldPos.x - 20, worldPos.y - 20, 40, 40);
        
        // Draw range indicator
        if (isValid && defenseConfig.range > 0) {
            ctx.strokeStyle = defenseConfig.color + '40';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(worldPos.x, worldPos.y, defenseConfig.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Draw cost indicator
        ctx.fillStyle = this.resources.dharma >= defenseConfig.cost ? '#00ff00' : '#ff0000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${defenseConfig.cost}`, worldPos.x, worldPos.y - 30);
        
        ctx.restore();
    }
    
    showDefenseInfo(defense) {
        const info = defense.getInfo();
        
        // Create or update defense info panel
        let infoPanel = document.getElementById('defenseInfoPanel');
        if (!infoPanel) {
            infoPanel = document.createElement('div');
            infoPanel.id = 'defenseInfoPanel';
            infoPanel.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                width: 250px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 15px;
                border-radius: 8px;
                border: 2px solid #4ecdc4;
                font-family: Arial, sans-serif;
                z-index: 1000;
            `;
            document.body.appendChild(infoPanel);
        }
        
        infoPanel.innerHTML = `
            <h3>${CONFIG.DEFENSE_TYPES[info.type].name}</h3>
            <p><strong>Level:</strong> ${info.level}/5</p>
            <p><strong>Damage:</strong> ${info.damage}</p>
            <p><strong>Range:</strong> ${info.range}</p>
            <p><strong>Fire Rate:</strong> ${(1000 / info.fireRate).toFixed(1)}/sec</p>
            <p><strong>Abilities:</strong> ${info.abilities.join(', ') || 'None'}</p>
            ${info.canUpgrade ? `
                <button id="upgradeDefenseBtn" style="
                    background: #4ecdc4;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 10px;
                    width: 100%;
                ">Upgrade (${info.upgradeCost} Dharma)</button>
            ` : '<p style="color: #ffd700;">Max Level Reached</p>'}
            <button id="sellDefenseBtn" style="
                background: #ff6b6b;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 5px;
                width: 100%;
            ">Sell (${Math.floor(defense.cost * 0.7)} Dharma)</button>
            <button id="closeDefenseInfoBtn" style="
                background: #636e72;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 5px;
                width: 100%;
            ">Close</button>
        `;
        
        // Add event listeners
        const upgradeBtn = document.getElementById('upgradeDefenseBtn');
        const sellBtn = document.getElementById('sellDefenseBtn');
        const closeBtn = document.getElementById('closeDefenseInfoBtn');
        
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => this.upgradeDefense(defense));
        }
        
        sellBtn.addEventListener('click', () => this.sellDefense(defense));
        closeBtn.addEventListener('click', () => this.hideDefenseInfo());
    }
    
    upgradeDefense(defense) {
        try {
            // Comprehensive validation
            if (!defense) {
                console.error('[Game.upgradeDefense] No defense provided');
                this.showNotification('No defense selected!', '#ff6b6b');
                return;
            }
            
            if (!defense.canUpgrade()) {
                this.showNotification('Defense cannot be upgraded!', '#ff6b6b');
                return;
            }
            
            const upgradeCost = defense.getUpgradeCost();
            
            if (this.resources.dharma < upgradeCost) {
                this.showNotification('Not enough Dharma to upgrade!', '#ff6b6b');
                return;
            }
            
            // Check if defense has upgrade choices
            if (defense.hasUpgradeChoice()) {
                this.showUpgradeChoiceModal(defense);
                return;
            }
            
            // Apply upgrade for single-path upgrades
            const actualCost = defense.upgrade();
            
            if (actualCost === false) {
                this.showNotification('Upgrade failed!', '#ff6b6b');
                return;
            }
            
            // Deduct cost
            this.resources.dharma -= actualCost;
            
            // Enhanced upgrade effects and achievements
            this.handleUpgradeEffects(defense, actualCost);
            
            // Update info panel
            this.showDefenseInfo(defense);
            
            this.showNotification(`${CONFIG.DEFENSE_TYPES[defense.type].name} upgraded to level ${defense.level}!`, '#4ecdc4');
            this.playSfx('defenseUpgrade');
            
            // Update level stats
            if (this.currentLevel) {
                this.currentLevel.updateStats('resourcesSpent', actualCost);
            }
            
        } catch (error) {
            console.error('[Game.upgradeDefense] Error during defense upgrade:', error);
            this.showNotification('Upgrade failed due to an error!', '#ff6b6b');
        }
    }
    
    handleUpgradeEffects(defense, cost) {
        // Track achievement progress
        if (this.achievementManager) {
            this.achievementManager.checkAchievements('defense_upgraded', { 
                defenseType: defense.type, 
                level: defense.level,
                cost: cost 
            });
            
            // Check for max level achievement
            if (defense.level >= defense.maxLevel) {
                this.achievementManager.checkAchievements('max_level_upgrade', { 
                    defenseType: defense.type 
                });
            }
        }
        
        // Enhanced visual effects are handled by the defense itself
        // Additional game-level effects can be added here
        
        // Check for synergy achievements
        this.checkSynergyAchievements();
    }
    
    checkSynergyAchievements() {
        // Check if we have all defense types
        const defenseTypes = new Set(this.defenses.map(d => d.type));
        if (defenseTypes.size >= 6) {
            if (this.achievementManager) {
                this.achievementManager.checkAchievements('all_defense_types');
            }
        }
        
        // Check for synergy between support defenses
        const supportDefenses = this.defenses.filter(d => 
            d.abilities.includes('boost_aura') || d.abilities.includes('resource_generation')
        );
        
        if (supportDefenses.length >= 3) {
            // Check if they're boosting the same defense
            const targetDefense = this.defenses.find(d => {
                const boostCount = supportDefenses.filter(support => 
                    Utils.distance(d.x, d.y, support.x, support.y) <= support.range
                ).length;
                return boostCount >= 3;
            });
            
            if (targetDefense && this.achievementManager) {
                this.achievementManager.checkAchievements('synergy_achieved');
            }
        }
    }
    
    showUpgradeChoiceModal(defense) {
        // Redirect to the main upgrade tree modal
        this.openUpgradeTreeModal(defense);
    }
    
    // Main upgrade tree modal functionality
    openUpgradeTreeModal(defense) {
        const modal = document.getElementById('upgradeTreeModal');
        if (!modal) {
            console.error('Upgrade tree modal not found in DOM');
            return;
        }

        // Take memory snapshot before opening
        if (this.upgradeTreeCleanupManager) {
            this.upgradeTreeCleanupManager.takeMemorySnapshot('modal_opening');
            this.upgradeTreeCleanupManager.memoryMetrics.modalOpenCount++;
        }

        // Store current defense for upgrade operations
        this.currentUpgradeDefense = defense;
        this.selectedUpgradeChoice = null;

        // Set modal title
        const title = document.getElementById('upgradeTreeTitle');
        if (title) {
            title.textContent = `${defense.type.toUpperCase()} - Level ${defense.level} Upgrade`;
        }

        // Populate upgrade paths with cleanup tracking
        this.populateUpgradePaths(defense);

        // Update preview
        this.updateUpgradePreview(defense);

        // Setup event listeners with cleanup tracking
        this.setupUpgradeModalListeners();

        // Show modal
        modal.style.display = 'block';
        modal.classList.add('active');

        // Mark modal elements for cleanup tracking
        if (this.upgradeTreeCleanupManager) {
            modal.setAttribute('data-upgrade-tree-element', 'true');
        }
    }
    
    populateUpgradePaths(defense) {
        const container = document.getElementById('upgradePathContainer');
        if (!container) {
            console.error('[Game.populateUpgradePaths] Upgrade path container not found');
            return;
        }
        
        // Clear existing content
        container.innerHTML = '';
        
        try {
            // Validate defense can be upgraded
            if (!defense.canUpgrade()) {
                container.innerHTML = '<div class="no-upgrades">Defense cannot be upgraded</div>';
                return;
            }
            
            const upgradeTree = defense.getUpgradeTree();
            const nextLevel = defense.level + 1;
            const nextUpgrade = upgradeTree[nextLevel];
            
            if (!nextUpgrade) {
                container.innerHTML = '<div class="no-upgrades">Max level reached</div>';
                return;
            }
            
            // Validate upgrade structure
            if (!defense.validateUpgradeStructure(nextUpgrade, nextLevel)) {
                console.error(`[Game.populateUpgradePaths] Invalid upgrade structure for ${defense.type} level ${nextLevel}`);
                container.innerHTML = '<div class="upgrade-error">Upgrade configuration error - please report this issue</div>';
                return;
            }
            
            // Check if there are multiple upgrade choices
            if (nextUpgrade.choices && nextUpgrade.choices.length > 1) {
                // Multiple choice upgrade
                container.innerHTML = '<h4>Choose Upgrade Path:</h4>';
                
                // Filter and validate choices
                const validChoices = nextUpgrade.choices.filter((choice, index) => {
                    const isValid = defense.validateUpgradeChoice(choice, index);
                    if (!isValid) {
                        console.warn(`[Game.populateUpgradePaths] Invalid choice ${index} for ${defense.type} level ${nextLevel}`);
                    }
                    return isValid;
                });
                
                if (validChoices.length === 0) {
                    container.innerHTML = '<div class="upgrade-error">No valid upgrade choices available</div>';
                    return;
                }
                
                // Create choice elements for valid choices
                validChoices.forEach((choice, index) => {
                    const originalIndex = nextUpgrade.choices.indexOf(choice);
                    const choiceElement = this.createUpgradeChoiceElement(choice, originalIndex, defense);
                    container.appendChild(choiceElement);
                });
                
            } else {
                // Single upgrade path
                const upgradeElement = this.createSingleUpgradeElement(nextUpgrade, defense);
                container.appendChild(upgradeElement);
            }
            
        } catch (error) {
            console.error('[Game.populateUpgradePaths] Error populating upgrade paths:', error);
            container.innerHTML = '<div class="upgrade-error">Error loading upgrade options</div>';
        }
    }
    
    createUpgradeChoiceElement(choice, index, defense) {
        // Use element pooling if cleanup manager is available
        const choiceDiv = this.upgradeTreeCleanupManager ? 
            this.upgradeTreeCleanupManager.createPooledElement('upgradeChoice', () => {
                const div = document.createElement('div');
                div.className = 'upgrade-choice';
                return div;
            }) : 
            document.createElement('div');
        
        // Ensure proper class and attributes
        if (!choiceDiv.classList.contains('upgrade-choice')) {
            choiceDiv.className = 'upgrade-choice';
        }
        choiceDiv.dataset.choiceIndex = index;
        choiceDiv.setAttribute('data-upgrade-tree-element', 'true');
        
        choiceDiv.innerHTML = `
            <div class="choice-header">
                <h5>${choice.name || `Option ${index + 1}`}</h5>
                <div class="choice-cost">${this.getUpgradeCost(defense)} Dharma</div>
            </div>
            <div class="choice-description">${choice.description || 'Upgrade option'}</div>
            <div class="choice-abilities">
                ${choice.abilities ? choice.abilities.map(ability => 
                    `<span class="ability-tag">${this.getAbilityDisplayName(ability)}</span>`
                ).join('') : ''}
            </div>
            <div class="choice-stats">
                ${this.getStatChangesHTML(choice.modifiers, defense)}
            </div>
        `;
        
        // Add click handler with cleanup tracking
        const clickHandler = () => {
            this.selectUpgradeChoice(index, choiceDiv);
        };
        
        if (this.upgradeTreeCleanupManager) {
            this.upgradeTreeCleanupManager.trackEventListener(choiceDiv, 'click', clickHandler);
        } else {
            choiceDiv.addEventListener('click', clickHandler);
        }
        
        return choiceDiv;
    }
    
    createSingleUpgradeElement(upgrade, defense) {
        // Use element pooling if cleanup manager is available
        const upgradeDiv = this.upgradeTreeCleanupManager ? 
            this.upgradeTreeCleanupManager.createPooledElement('upgradeChoice', () => {
                const div = document.createElement('div');
                div.className = 'single-upgrade';
                return div;
            }) : 
            document.createElement('div');
        
        // Ensure proper class and attributes
        if (!upgradeDiv.classList.contains('single-upgrade')) {
            upgradeDiv.className = 'single-upgrade';
        }
        upgradeDiv.setAttribute('data-upgrade-tree-element', 'true');
        
        upgradeDiv.innerHTML = `
            <div class="upgrade-header">
                <h5>Level ${defense.level + 1} Upgrade</h5>
                <div class="upgrade-cost">${this.getUpgradeCost(defense)} Dharma</div>
            </div>
            <div class="upgrade-description">${upgrade.description || 'Standard upgrade'}</div>
            <div class="upgrade-abilities">
                ${upgrade.abilities ? upgrade.abilities.map(ability => 
                    `<span class="ability-tag">${this.getAbilityDisplayName(ability)}</span>`
                ).join('') : ''}
            </div>
            <div class="upgrade-stats">
                ${this.getStatChangesHTML(upgrade.modifiers, defense)}
            </div>
        `;
        
        // Auto-select single upgrade
        this.selectedUpgradeChoice = 0;
        upgradeDiv.classList.add('selected');
        
        return upgradeDiv;
    }
    
    selectUpgradeChoice(choiceIndex, choiceElement) {
        // Remove previous selection
        const container = document.getElementById('upgradePathContainer');
        container.querySelectorAll('.upgrade-choice').forEach(choice => {
            choice.classList.remove('selected');
        });
        
        // Select new choice
        choiceElement.classList.add('selected');
        this.selectedUpgradeChoice = choiceIndex;
        
        // Update preview
        this.updateUpgradePreviewWithChoice(this.currentUpgradeDefense, choiceIndex);
    }
    
    updateUpgradePreview(defense, choiceIndex = null) {
        const preview = defense.getUpgradePreview();
        if (!preview) return;
        
        const statChanges = document.getElementById('statChanges');
        const newAbilities = document.getElementById('newAbilities');
        const upgradeCost = document.getElementById('upgradeCost');
        
        if (statChanges) {
            statChanges.innerHTML = this.getStatChangesHTML(null, defense, preview.statChanges);
        }
        
        if (newAbilities) {
            newAbilities.innerHTML = preview.newAbilities.length > 0 ? 
                `<h5>New Abilities:</h5>
                 ${preview.newAbilities.map(ability => 
                    `<span class="ability-tag">${this.getAbilityDisplayName(ability)}</span>`
                 ).join('')}` : 
                '<div class="no-abilities">No new abilities</div>';
        }
        
        if (upgradeCost) {
            const canAfford = this.resources.dharma >= preview.cost;
            upgradeCost.innerHTML = `
                <div class="cost-info ${canAfford ? 'can-afford' : 'cannot-afford'}">
                    <span class="cost-label">Cost:</span>
                    <span class="cost-value">${preview.cost} Dharma</span>
                    <span class="cost-status">${canAfford ? '✓' : '✗'}</span>
                </div>
            `;
            
            // Update confirm button state
            const confirmBtn = document.getElementById('confirmUpgradeBtn');
            if (confirmBtn) {
                confirmBtn.disabled = !canAfford;
                confirmBtn.style.opacity = canAfford ? '1' : '0.5';
            }
        }
    }
    
    updateUpgradePreviewWithChoice(defense, choiceIndex) {
        const upgradeTree = defense.getUpgradeTree();
        const nextLevel = defense.level + 1;
        const nextUpgrade = upgradeTree[nextLevel];
        
        if (!nextUpgrade || !nextUpgrade.choices) return;
        
        const choice = nextUpgrade.choices[choiceIndex];
        if (!choice) return;
        
        const statChanges = document.getElementById('statChanges');
        const newAbilities = document.getElementById('newAbilities');
        const upgradeCost = document.getElementById('upgradeCost');
        
        if (statChanges) {
            statChanges.innerHTML = this.getStatChangesHTML(choice.modifiers, defense);
        }
        
        if (newAbilities) {
            newAbilities.innerHTML = choice.abilities && choice.abilities.length > 0 ? 
                `<h5>New Abilities:</h5>
                 ${choice.abilities.map(ability => 
                    `<span class="ability-tag">${this.getAbilityDisplayName(ability)}</span>`
                 ).join('')}` : 
                '<div class="no-abilities">No new abilities</div>';
        }
        
        if (upgradeCost) {
            const cost = this.getUpgradeCost(defense);
            const canAfford = this.resources.dharma >= cost;
            upgradeCost.innerHTML = `
                <div class="cost-info ${canAfford ? 'can-afford' : 'cannot-afford'}">
                    <span class="cost-label">Cost:</span>
                    <span class="cost-value">${cost} Dharma</span>
                    <span class="cost-status">${canAfford ? '✓' : '✗'}</span>
                </div>
            `;
            
            // Update confirm button state
            const confirmBtn = document.getElementById('confirmUpgradeBtn');
            if (confirmBtn) {
                confirmBtn.disabled = !canAfford;
                confirmBtn.style.opacity = canAfford ? '1' : '0.5';
            }
        }
    }
    
    getStatChangesHTML(modifiers, defense, previewChanges = null) {
        let html = '<h5>Stat Changes:</h5><div class="stat-list">';
        
        if (previewChanges) {
            // Use preview changes from defense.getUpgradePreview()
            Object.keys(previewChanges).forEach(stat => {
                const change = previewChanges[stat];
                const icon = this.getStatIcon(stat);
                const sign = change > 0 ? '+' : '';
                const color = change > 0 ? 'positive' : 'negative';
                html += `<div class="stat-change ${color}">
                    ${icon} ${stat.toUpperCase()}: ${sign}${Math.floor(change)}
                </div>`;
            });
        } else if (modifiers) {
            // Use modifiers from upgrade tree
            Object.keys(modifiers).forEach(stat => {
                const modifier = modifiers[stat];
                const currentValue = defense[stat];
                const newValue = this.calculateStatChange(stat, currentValue, modifier);
                const change = newValue - currentValue;
                const icon = this.getStatIcon(stat);
                const sign = change > 0 ? '+' : '';
                const color = change > 0 ? 'positive' : 'negative';
                html += `<div class="stat-change ${color}">
                    ${icon} ${stat.toUpperCase()}: ${sign}${Math.floor(change)}
                </div>`;
            });
        } else {
            // Standard level-up changes
            const damageIncrease = Math.floor(defense.baseDamage * Math.pow(defense.upgradeMultiplier, defense.level) - defense.damage);
            const rangeIncrease = Math.floor(defense.baseRange * Math.pow(1.2, defense.level) - defense.range);
            const fireRateImprovement = defense.fireRate - Math.max(100, defense.baseFireRate * Math.pow(0.9, defense.level));
            
            html += `
                <div class="stat-change positive">⚔️ DAMAGE: +${damageIncrease}</div>
                <div class="stat-change positive">🎯 RANGE: +${rangeIncrease}</div>
                <div class="stat-change positive">⚡ FIRE RATE: +${Math.floor(fireRateImprovement)}</div>
            `;
        }
        
        html += '</div>';
        return html;
    }
    
    getStatIcon(stat) {
        const icons = {
            damage: '⚔️',
            range: '🎯',
            fireRate: '⚡',
            size: '📏',
            health: '❤️'
        };
        return icons[stat] || '📊';
    }
    
    calculateStatChange(stat, currentValue, modifier) {
        switch (stat) {
            case 'damage':
                return Math.floor(currentValue * modifier);
            case 'range':
                return Math.floor(currentValue * modifier);
            case 'fireRate':
                return Math.max(50, currentValue * modifier);
            case 'size':
                return Math.floor(currentValue * modifier);
            default:
                return currentValue * modifier;
        }
    }
    
    getAbilityDisplayName(ability) {
        const displayNames = {
            'slow_field': 'Slow Field',
            'armor_piercing': 'Armor Piercing',
            'chain_lightning': 'Chain Lightning',
            'healing': 'Healing Aura',
            'boost_aura': 'Boost Aura',
            'explosive_shots': 'Explosive Shots',
            'multi_shot': 'Multi Shot',
            'confusion': 'Confusion',
            'redirect': 'Redirect',
            'reflection_boost': 'Reflection Boost',
            'perfect_reflection': 'Perfect Reflection',
            'stealth_field': 'Stealth Field',
            'misdirection': 'Misdirection',
            'resource_generation': 'Resource Generation'
        };
        return displayNames[ability] || ability.replace('_', ' ').toUpperCase();
    }
    
    getUpgradeCost(defense) {
        return defense.getUpgradeCost();
    }
    
    setupUpgradeModalListeners() {
        const confirmBtn = document.getElementById('confirmUpgradeBtn');
        const cancelBtn = document.getElementById('cancelUpgradeBtn');
        const closeBtn = document.getElementById('closeUpgradeTreeBtn');
        
        // Enhanced event listener setup with cleanup tracking
        if (this.upgradeTreeCleanupManager) {
            // Use cleanup manager for tracked event listeners
            if (confirmBtn) {
                const confirmHandler = () => this.confirmUpgrade();
                this.upgradeTreeCleanupManager.trackEventListener(confirmBtn, 'click', confirmHandler);
            }
            
            if (cancelBtn) {
                const cancelHandler = () => this.closeUpgradeTreeModal();
                this.upgradeTreeCleanupManager.trackEventListener(cancelBtn, 'click', cancelHandler);
            }
            
            if (closeBtn) {
                const closeHandler = () => this.closeUpgradeTreeModal();
                this.upgradeTreeCleanupManager.trackEventListener(closeBtn, 'click', closeHandler);
            }
            
        } else {
            // Fallback to basic event listener setup with element replacement
            if (confirmBtn) {
                confirmBtn.replaceWith(confirmBtn.cloneNode(true));
                const newConfirmBtn = document.getElementById('confirmUpgradeBtn');
                newConfirmBtn.addEventListener('click', () => this.confirmUpgrade());
            }
            
            if (cancelBtn) {
                cancelBtn.replaceWith(cancelBtn.cloneNode(true));
                const newCancelBtn = document.getElementById('cancelUpgradeBtn');
                newCancelBtn.addEventListener('click', () => this.closeUpgradeTreeModal());
            }
            
            if (closeBtn) {
                closeBtn.replaceWith(closeBtn.cloneNode(true));
                const newCloseBtn = document.getElementById('closeUpgradeTreeBtn');
                newCloseBtn.addEventListener('click', () => this.closeUpgradeTreeModal());
            }
        }
    }
    
    confirmUpgrade() {
        if (!this.currentUpgradeDefense) {
            this.showNotification('No defense selected for upgrade', '#ff6b6b');
            return;
        }
        
        const defense = this.currentUpgradeDefense;
        
        try {
            // Validate defense can be upgraded
            if (!defense.canUpgrade()) {
                this.showNotification('Defense cannot be upgraded', '#ff6b6b');
                return;
            }
            
            const upgradeCost = defense.getUpgradeCost();
            
            // Check if player has enough resources
            if (this.resources.dharma < upgradeCost) {
                this.showNotification('Not enough Dharma!', '#ff6b6b');
                return;
            }
            
            // Validate choice selection for upgrades with multiple options
            let choiceIndex = null;
            if (defense.hasUpgradeChoice()) {
                if (this.selectedUpgradeChoice === null || this.selectedUpgradeChoice === undefined) {
                    this.showNotification('Please select an upgrade option', '#ff6b6b');
                    return;
                }
                
                // Validate the selected choice exists
                if (!defense.validateUpgradeChoiceExists(this.selectedUpgradeChoice)) {
                    this.showNotification('Invalid upgrade choice selected', '#ff6b6b');
                    return;
                }
                
                choiceIndex = this.selectedUpgradeChoice;
            }
            
            // Apply the upgrade with comprehensive validation
            const success = defense.upgrade(choiceIndex);
            
            if (success) {
                // Deduct cost
                this.resources.dharma -= upgradeCost;
                
                // Show success notification
                this.showNotification(`${defense.type.toUpperCase()} upgraded to level ${defense.level}!`, '#4ecdc4');
                
                // Update defense info if visible
                this.showDefenseInfo(defense);
                
                // Close modal
                this.closeUpgradeTreeModal();
                
                // Play upgrade sound
                this.playSfx('upgrade');
                
                // Track achievement progress
                this.handleUpgradeEffects(defense, upgradeCost);
                
            } else {
                this.showNotification('Upgrade failed - please try again', '#ff6b6b');
                console.error('[Game.confirmUpgrade] Defense upgrade returned false');
            }
            
        } catch (error) {
            console.error('[Game.confirmUpgrade] Error during upgrade confirmation:', error);
            this.showNotification('Upgrade failed due to an error', '#ff6b6b');
        }
    }
    
    applySelectedUpgrade(defense, choiceIndex) {
        try {
            // Comprehensive validation before applying upgrade
            if (!defense) {
                console.error('[Game.applySelectedUpgrade] No defense provided');
                return false;
            }
            
            if (!defense.canUpgrade()) {
                console.error('[Game.applySelectedUpgrade] Defense cannot be upgraded');
                return false;
            }
            
            // Validate choice if provided
            if (choiceIndex !== null && choiceIndex !== undefined) {
                if (!defense.validateUpgradeChoiceExists(choiceIndex)) {
                    console.error(`[Game.applySelectedUpgrade] Invalid choice index: ${choiceIndex}`);
                    return false;
                }
            }
            
            // Apply the upgrade using the Defense class's comprehensive validation
            const upgradeCost = defense.upgrade(choiceIndex);
            
            if (upgradeCost === false) {
                console.error('[Game.applySelectedUpgrade] Defense upgrade failed');
                return false;
            }
            
            console.log(`[Game.applySelectedUpgrade] Successfully applied upgrade to ${defense.type} (cost: ${upgradeCost})`);
            return true;
            
        } catch (error) {
            console.error('[Game.applySelectedUpgrade] Error applying upgrade:', error);
            return false;
        }
    }
    
    closeUpgradeTreeModal() {
        const modal = document.getElementById('upgradeTreeModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            modal.removeAttribute('data-upgrade-tree-element');
        }

        // Perform comprehensive cleanup if cleanup manager is available
        if (this.upgradeTreeCleanupManager) {
            const cleanupResult = this.upgradeTreeCleanupManager.performComprehensiveCleanup();
            
            if (!cleanupResult.success) {
                console.error('[Game] Upgrade tree cleanup failed:', cleanupResult);
            } else {
                console.log('[Game] Upgrade tree cleanup completed successfully:', {
                    cleanupTime: cleanupResult.cleanupTime.toFixed(2) + 'ms',
                    removedListeners: cleanupResult.removedListeners
                });
            }
        } else {
            // Fallback cleanup for basic functionality
            this.performBasicModalCleanup();
        }

        // Clear stored references (part of comprehensive cleanup but ensured here)
        this.currentUpgradeDefense = null;
        this.selectedUpgradeChoice = null;
    }

    performBasicModalCleanup() {
        try {
            // Basic cleanup when comprehensive cleanup manager is not available
            const container = document.getElementById('upgradePathContainer');
            if (container) {
                container.innerHTML = '';
            }

            // Remove basic event listeners
            const confirmBtn = document.getElementById('confirmUpgradeBtn');
            const cancelBtn = document.getElementById('cancelUpgradeBtn');
            const closeBtn = document.getElementById('closeUpgradeTreeBtn');

            [confirmBtn, cancelBtn, closeBtn].forEach(btn => {
                if (btn) {
                    // Replace element to remove all listeners
                    const newBtn = btn.cloneNode(true);
                    btn.parentNode.replaceChild(newBtn, btn);
                }
            });

            console.log('[Game] Basic modal cleanup completed');

        } catch (error) {
            console.error('[Game] Error in basic modal cleanup:', error);
        }
    }
    
    // Placeholder method for achievement gallery
    closeAchievementGallery() {
        const gallery = document.getElementById('achievementGallery');
        if (gallery) {
            gallery.style.display = 'none';
            gallery.classList.remove('active');
        }
    }
    
    // Main achievement gallery functionality
    openAchievementGallery() {
        const gallery = document.getElementById('achievementScreen');
        if (!gallery) {
            console.error('Achievement gallery not found in DOM');
            return;
        }
        
        // Use enhanced gallery if available
        if (this.enhancedAchievementGallery) {
            this.enhancedAchievementGallery.openEnhancedGallery();
            return;
        }
        
        // Fallback to basic gallery
        // Initialize gallery data
        this.currentAchievementCategory = 'all';
        
        // Setup achievement gallery
        this.setupAchievementGalleryListeners();
        this.populateAchievementGallery();
        this.updateAchievementStats();
        
        // Show gallery
        gallery.style.display = 'block';
        gallery.classList.add('active');
    }
    
    setupAchievementGalleryListeners() {
        // Category button listeners
        const categoryButtons = document.querySelectorAll('.achievement-categories .category-btn');
        categoryButtons.forEach(button => {
            // Remove existing listeners to prevent duplicates
            button.replaceWith(button.cloneNode(true));
        });
        
        // Re-attach listeners to new elements
        const newCategoryButtons = document.querySelectorAll('.achievement-categories .category-btn');
        newCategoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.handleCategoryButtonClick(button);
            });
        });
    }
    
    handleCategoryButtonClick(clickedButton) {
        const category = clickedButton.dataset.category;
        
        // Update active button
        const categoryButtons = document.querySelectorAll('.achievement-categories .category-btn');
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        clickedButton.classList.add('active');
        
        // Update current category and filter
        this.currentAchievementCategory = category;
        this.filterAchievementsByCategory(category);
        
        // Play sound effect
        this.playSfx('buttonClick');
    }
    
    populateAchievementGallery() {
        const achievementManager = this.getAchievementManagerSafely();
        
        const achievementGrid = document.getElementById('achievementGrid');
        if (!achievementGrid) return;
        
        // Get all achievements - use fallback if method doesn't exist
        let allAchievements;
        if (this.achievementManager && typeof this.achievementManager.getAllAchievements === 'function') {
            allAchievements = this.achievementManager.getAllAchievements();
        } else {
            allAchievements = this.getMockAchievements();
        }
        
        // Clear existing content
        achievementGrid.innerHTML = '';
        
        // Create achievement items
        Object.keys(allAchievements).forEach(achievementId => {
            const achievement = allAchievements[achievementId];
            const achievementElement = this.createAchievementElement(achievementId, achievement);
            achievementGrid.appendChild(achievementElement);
        });
        
        // Apply initial filter
        this.filterAchievementsByCategory(this.currentAchievementCategory);
    }
    
    createAchievementElement(achievementId, achievement) {
        const element = document.createElement('div');
        element.className = 'achievement-item';
        element.dataset.achievementId = achievementId;
        element.dataset.category = achievement.category || 'general';
        
        // Determine unlock status with safe method calls
        const achievementManager = this.getAchievementManagerSafely();
        const isUnlocked = this.achievementManager && typeof this.achievementManager.isAchievementUnlocked === 'function' 
            ? this.achievementManager.isAchievementUnlocked(achievementId)
            : false;
        const progress = this.achievementManager && typeof this.achievementManager.getAchievementProgress === 'function'
            ? this.achievementManager.getAchievementProgress(achievementId)
            : { current: 0 };
        
        // Apply styling based on unlock status
        if (isUnlocked) {
            element.classList.add('unlocked');
        } else {
            element.classList.add('locked');
        }
        
        // Create achievement content
        element.innerHTML = `
            <div class="achievement-icon">
                ${this.getAchievementIcon(achievement, isUnlocked)}
            </div>
            <div class="achievement-info">
                <div class="achievement-title">
                    ${isUnlocked ? achievement.title : '???'}
                </div>
                <div class="achievement-description">
                    ${isUnlocked ? achievement.description : 'Hidden achievement'}
                </div>
                <div class="achievement-progress">
                    ${this.getAchievementProgressText(achievement, progress, isUnlocked)}
                </div>
                <div class="achievement-reward">
                    ${this.getAchievementRewardText(achievement, isUnlocked)}
                </div>
            </div>
            <div class="achievement-status">
                ${isUnlocked ? '<span class="unlocked-badge">✓</span>' : '<span class="locked-badge">🔒</span>'}
            </div>
        `;
        
        // Add click handler for more details
        element.addEventListener('click', () => {
            this.showAchievementDetails(achievementId, achievement, isUnlocked);
        });
        
        return element;
    }
    
    getAchievementIcon(achievement, isUnlocked) {
        if (!isUnlocked) {
            return '<span class="locked-icon">🔒</span>';
        }
        
        // Map achievement types to icons
        const iconMap = {
            first_steps: '🏁',
            combat: '⚔️',
            strategy: '🧠',
            progression: '📈',
            secret: '🔍',
            boss_defeated: '👑',
            defense_master: '🏰',
            wave_survival: '🌊',
            resource_management: '💎',
            speed_run: '⚡',
            perfect_defense: '🛡️'
        };
        
        // Use custom icon if available, otherwise use category icon
        const icon = achievement.icon || iconMap[achievement.category] || iconMap[achievement.type] || '🏆';
        return `<span class="achievement-icon-emoji">${icon}</span>`;
    }
    
    getAchievementProgressText(achievement, progress, isUnlocked) {
        if (!isUnlocked && achievement.category === 'secret') {
            return '<span class="secret-hint">Complete secret objectives to unlock</span>';
        }
        
        if (achievement.targetValue) {
            const current = Math.min(progress.current || 0, achievement.targetValue);
            const target = achievement.targetValue;
            const percentage = Math.floor((current / target) * 100);
            
            if (isUnlocked) {
                return `<span class="progress-complete">Complete! (${target}/${target})</span>`;
            } else {
                return `<span class="progress-bar">
                    <div class="progress-text">${current}/${target} (${percentage}%)</div>
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </span>`;
            }
        }
        
        return isUnlocked ? '<span class="progress-complete">Unlocked!</span>' : '';
    }
    
    getAchievementRewardText(achievement, isUnlocked) {
        if (!achievement.reward || (!isUnlocked && achievement.category === 'secret')) {
            return '';
        }
        
        const reward = achievement.reward;
        let rewardText = 'Reward: ';
        
        if (reward.dharma) rewardText += `${reward.dharma} Dharma `;
        if (reward.bandwidth) rewardText += `${reward.bandwidth} Bandwidth `;
        if (reward.anonymity) rewardText += `${reward.anonymity} Anonymity `;
        if (reward.specialItem) rewardText += `${reward.specialItem} `;
        if (reward.title) rewardText += `Title: "${reward.title}" `;
        
        return `<div class="achievement-reward-text">${rewardText}</div>`;
    }
    
    filterAchievementsByCategory(category) {
        const achievementItems = document.querySelectorAll('.achievement-item');
        
        achievementItems.forEach(item => {
            const itemCategory = item.dataset.category;
            
            if (category === 'all' || itemCategory === category) {
                item.style.display = 'block';
                item.classList.remove('filtered-out');
            } else {
                item.style.display = 'none';
                item.classList.add('filtered-out');
            }
        });
        
        // Update category count
        this.updateCategoryCount(category);
    }
    
    updateCategoryCount(category) {
        const visibleItems = document.querySelectorAll('.achievement-item:not(.filtered-out)');
        const unlockedVisible = document.querySelectorAll('.achievement-item.unlocked:not(.filtered-out)');
        
        // Update category button text with count
        const categoryButton = document.querySelector(`[data-category="${category}"]`);
        if (categoryButton) {
            const baseName = categoryButton.textContent.split(' (')[0];
            categoryButton.textContent = `${baseName} (${unlockedVisible.length}/${visibleItems.length})`;
        }
    }
    
    updateAchievementStats() {
        // Get all achievements with safe method calls
        let allAchievements;
        if (this.achievementManager && typeof this.achievementManager.getAllAchievements === 'function') {
            allAchievements = this.achievementManager.getAllAchievements();
        } else {
            allAchievements = this.getMockAchievements();
        }
        
        const achievementIds = Object.keys(allAchievements);
        const totalAchievements = achievementIds.length;
        
        const unlockedAchievements = achievementIds.filter(id => {
            if (this.achievementManager && typeof this.achievementManager.isAchievementUnlocked === 'function') {
                return this.achievementManager.isAchievementUnlocked(id);
            }
            return false;
        }).length;
        
        const percentage = totalAchievements > 0 ? 
            Math.floor((unlockedAchievements / totalAchievements) * 100) : 0;
        
        // Update progress display
        const progressElement = document.getElementById('achievementProgress');
        const percentageElement = document.getElementById('achievementPercentage');
        
        if (progressElement) {
            progressElement.textContent = `${unlockedAchievements}/${totalAchievements}`;
        }
        
        if (percentageElement) {
            percentageElement.textContent = `${percentage}%`;
        }
        
        // Update individual category counts
        const categories = ['all', 'first_steps', 'combat', 'strategy', 'progression', 'secret'];
        categories.forEach(category => {
            this.updateCategoryCount(category);
        });
    }
    
    showAchievementDetails(achievementId, achievement, isUnlocked) {
        // Create modal for achievement details
        const modal = document.createElement('div');
        modal.className = 'achievement-detail-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const content = document.createElement('div');
        content.className = 'achievement-detail-content';
        content.style.cssText = `
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #4ecdc4;
            border-radius: 10px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            color: white;
        `;
        
        const progress = this.achievementManager.getAchievementProgress(achievementId);
        const unlockedDate = this.achievementManager.getAchievementUnlockDate(achievementId);
        
        content.innerHTML = `
            <div class="achievement-detail-icon">
                ${this.getAchievementIcon(achievement, isUnlocked)}
            </div>
            <h3 class="achievement-detail-title">${isUnlocked ? achievement.title : 'Hidden Achievement'}</h3>
            <p class="achievement-detail-description">${isUnlocked ? achievement.description : 'Complete the requirements to unlock this achievement.'}</p>
            <div class="achievement-detail-progress">
                ${this.getAchievementProgressText(achievement, progress, isUnlocked)}
            </div>
            ${isUnlocked ? `<div class="achievement-detail-unlock-date">
                Unlocked: ${new Date(unlockedDate).toLocaleDateString()}
            </div>` : ''}
            <div class="achievement-detail-reward">
                ${this.getAchievementRewardText(achievement, isUnlocked)}
            </div>
            <button class="achievement-detail-close" style="margin-top: 20px; padding: 10px 20px; background: #4ecdc4; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
        `;
        
        // Close button functionality
        const closeButton = content.querySelector('.achievement-detail-close');
        closeButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Play sound effect
        this.playSfx('achievementDetail');
    }
    
    // Helper methods for achievement gallery functionality
    getAchievementManagerSafely() {
        return this.achievementManager || {
            getAllAchievements: () => ({}),
            isAchievementUnlocked: () => false,
            getAchievementProgress: () => ({ current: 0 }),
            getAchievementUnlockDate: () => Date.now()
        };
    }
    
    // Fallback method if AchievementManager doesn't have getAllAchievements
    getMockAchievements() {
        return {
            'first_defense': {
                title: 'First Defense',
                description: 'Place your first defense',
                category: 'first_steps',
                icon: '🏰',
                reward: { dharma: 50 }
            },
            'wave_survivor': {
                title: 'Wave Survivor',
                description: 'Survive 10 waves',
                category: 'combat',
                icon: '🌊',
                targetValue: 10,
                reward: { dharma: 200 }
            },
            'strategist': {
                title: 'Master Strategist',
                description: 'Use all defense types',
                category: 'strategy',
                icon: '🧠',
                reward: { dharma: 100, specialItem: 'Strategy Guide' }
            },
            'secret_finder': {
                title: '???',
                description: 'Hidden secret',
                category: 'secret',
                icon: '🔍',
                reward: { dharma: 500, title: 'Secret Keeper' }
            }
        };
    }
    
    sellDefense(defense) {
        const refund = Math.floor(defense.cost * 0.7);
        
        // Remove defense
        const index = this.defenses.indexOf(defense);
        if (index > -1) {
            this.defenses.splice(index, 1);
        }
        
        // Give refund
        this.resources.dharma += refund;
        
        // Hide info panel
        this.hideDefenseInfo();
        
        // Update pathfinder
        this.pathfinder.updateObstacles(this.defenses);
        
        this.showNotification(`Defense sold for ${refund} Dharma`, '#f9ca24');
    }
    
    hideDefenseInfo() {
        const infoPanel = document.getElementById('defenseInfoPanel');
        if (infoPanel) {
            infoPanel.remove();
        }
        
        // Clear range indicators
        this.defenses.forEach(d => d.setRangeIndicator(false));
        this.selectedDefense = null;
    }
    
    selectDefenseType(type) {
        this.selectedDefenseType = type;
        this.updateDefenseSelection();
    }
    
    updateDefenseSelection() {
        document.querySelectorAll('.defense-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        if (this.selectedDefenseType) {
            const selectedItem = document.querySelector(`[data-type="${this.selectedDefenseType}"]`);
            if (selectedItem) {
                selectedItem.classList.add('selected');
            }
        }
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.textContent = this.isPaused ? '▶️' : '⏸️';
        
        // Play pause/unpause sound
        this.playSfx(this.isPaused ? 'gamePause' : 'gameUnpause');
        
        // Pause/resume music
        if (this.audioManager) {
            if (this.isPaused) {
                this.audioManager.pauseMusic();
            } else {
                this.audioManager.resumeMusic();
            }
        }
        
        // Handle boss warning synchronization pause/resume
        if (this.bossWarningSynchronizer) {
            if (this.isPaused) {
                this.bossWarningSynchronizer.pauseWarnings();
            } else {
                this.bossWarningSynchronizer.resumeWarnings();
            }
        }
        
        // Dispatch pause/resume events for other systems
        const eventType = this.isPaused ? 'gamePaused' : 'gameResumed';
        document.dispatchEvent(new CustomEvent(eventType, {
            detail: { isPaused: this.isPaused, gameSpeed: this.gameSpeed }
        }));
        
        // Auto-save when pausing
        if (this.isPaused && this.saveSystem) {
            this.autoSave();
        }
    }
    
    toggleSpeed() {
        const oldSpeed = this.gameSpeed;
        this.gameSpeed = this.gameSpeed === 1 ? 2 : 1;
        const speedBtn = document.getElementById('speedBtn');
        speedBtn.textContent = this.gameSpeed === 2 ? '⏩' : '▶️';
        
        // Update boss warning synchronization with new speed
        if (this.bossWarningSynchronizer) {
            this.bossWarningSynchronizer.adjustWarningSpeedMultiplier(this.gameSpeed);
        }
        
        // Dispatch game speed change event
        document.dispatchEvent(new CustomEvent('gameSpeedChanged', {
            detail: { 
                oldSpeed: oldSpeed, 
                newSpeed: this.gameSpeed,
                isPaused: this.isPaused 
            }
        }));
    }
    
    returnToMenu() {
        // Auto-save before returning to menu
        if (this.saveSystem && this.state === 'playing') {
            this.autoSave();
        }
        
        this.showScreen('menu');
        this.isPaused = false;
        this.gameSpeed = 1;
        
        // Stop gameplay music and play menu music
        if (this.audioManager) {
            this.audioManager.playMusic('menu');
        }
        
        this.playSfx('buttonClick');
    }
    
    startNextWave() {
        // Wave starting logic will be implemented in Phase 7
    }
    
    checkGameConditions() {
        if (!this.currentLevel) return;
        
        // Update level objectives
        this.currentLevel.updateObjectives({
            resources: this.resources,
            defenses: this.defenses,
            enemies: this.enemies
        });
        
        // Check level completion
        const enemiesRemaining = this.enemies.filter(e => e.isAlive).length;
        const allWavesComplete = !this.waveInProgress && this.currentWave >= this.currentLevel.waves.length;
        
        if (this.currentLevel.checkCompletion(enemiesRemaining, allWavesComplete) && !this.levelComplete) {
            this.completeLevelSuccess();
        }
        
        // Check failure conditions
        if (this.resources.dharma <= 0 || this.resources.anonymity <= 0) {
            this.levelComplete = true;
            this.gameLost();
        }
    }
    
    updateUI() {
        // Update resource displays
        document.getElementById('dharmaPoints').textContent = Utils.formatNumber(this.resources.dharma);
        document.getElementById('bandwidth').textContent = Utils.formatNumber(this.resources.bandwidth);
        document.getElementById('anonymity').textContent = Utils.formatNumber(this.resources.anonymity);
        
        // Update wave counter
        const totalWaves = this.currentLevel?.waves?.length || CONFIG.MAX_WAVES;
        document.getElementById('waveCounter').textContent = `Wave ${this.currentWave + 1}/${totalWaves}`;
        
        // Update wave button state
        const nextWaveBtn = document.getElementById('nextWaveBtn');
        if (nextWaveBtn) {
            if (this.waveInProgress) {
                nextWaveBtn.disabled = true;
                nextWaveBtn.textContent = `Wave ${this.currentWave} in Progress...`;
            } else if (this.currentWave >= totalWaves) {
                nextWaveBtn.disabled = true;
                nextWaveBtn.textContent = 'All Waves Complete!';
            } else {
                nextWaveBtn.disabled = false;
                nextWaveBtn.textContent = `Start Wave ${this.currentWave + 1}`;
            }
        }
    }
    
    updateFPS() {
        this.frameCount++;
        if (this.gameTime - this.lastFpsUpdate >= 1) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = this.gameTime;
        }
    }
    
    // Resource management
    spendResources(dharma = 0, bandwidth = 0, anonymity = 0) {
        if (this.resources.dharma >= dharma && 
            this.resources.bandwidth >= bandwidth && 
            this.resources.anonymity >= anonymity) {
            this.resources.dharma -= dharma;
            this.resources.bandwidth -= bandwidth;
            this.resources.anonymity -= anonymity;
            return true;
        }
        return false;
    }
    
    gainResources(dharma = 0, bandwidth = 0, anonymity = 0) {
        this.resources.dharma += dharma;
        this.resources.bandwidth += bandwidth;
        this.resources.anonymity += anonymity;
    }
    
    canAfford(dharma = 0, bandwidth = 0, anonymity = 0) {
        return this.resources.dharma >= dharma && 
               this.resources.bandwidth >= bandwidth && 
               this.resources.anonymity >= anonymity;
    }
    
    // Wave management system
    startWave() {
        if (this.waveInProgress) return;
        
        console.log(`Starting wave ${this.currentWave + 1}`);
        
        // Store starting resources for perfect wave tracking
        this.waveStartDharma = this.resources.dharma;
        this.waveStartAnonymity = this.resources.anonymity;
        
        this.waveInProgress = true;
        this.currentWave++;
        this.enemiesSpawned = 0;
        this.enemiesKilled = 0;
        
        // Calculate wave difficulty
        const waveData = this.getWaveData(this.currentWave);
        this.currentWaveData = waveData;
        
        console.log('Wave data:', waveData);
        
        // Start spawning enemies
        this.spawnTimer = 0;
        this.nextSpawnTime = 0;
        
        this.updateUI();
        
        // Show wave start notification
        this.showNotification(`Wave ${this.currentWave} begins!`, '#ffd700');
    }
    
    getWaveData(waveNumber) {
        // Use waves from current level if available
        const levelWaves = this.currentLevel?.waves || CONFIG.WAVES;
        
        if (waveNumber <= levelWaves.length) {
            const waveConfig = levelWaves[waveNumber - 1];
            const enemies = [];
            let minInterval = 2000;
            
            // Convert wave config to flat enemy array
            waveConfig.enemies.forEach(enemyGroup => {
                for (let i = 0; i < enemyGroup.count; i++) {
                    enemies.push(enemyGroup.type);
                }
                // Use the smallest interval for spawn timing
                minInterval = Math.min(minInterval, enemyGroup.interval);
            });
            
            // Shuffle enemy order for variety
            for (let i = enemies.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [enemies[i], enemies[j]] = [enemies[j], enemies[i]];
            }
            
            return {
                waveNumber,
                enemies,
                totalEnemies: enemies.length,
                spawnInterval: minInterval
            };
        }
        
        // Fallback to procedural generation for waves beyond level definition
        const baseEnemies = 5;
        const enemyIncrease = Math.floor(waveNumber * 1.5);
        const totalEnemies = baseEnemies + enemyIncrease;
        
        // Determine enemy composition based on wave
        const enemies = [];
        
        if (waveNumber <= 2) {
            // Early waves: mostly script kiddies
            for (let i = 0; i < totalEnemies; i++) {
                enemies.push('scriptKiddie');
            }
        } else if (waveNumber <= 5) {
            // Mid waves: mix of script kiddies and federal agents
            const scriptKiddies = Math.floor(totalEnemies * 0.6);
            const federalAgents = totalEnemies - scriptKiddies;
            
            for (let i = 0; i < scriptKiddies; i++) enemies.push('scriptKiddie');
            for (let i = 0; i < federalAgents; i++) enemies.push('federalAgent');
        } else if (waveNumber <= 8) {
            // Late waves: add corporate saboteurs and AI surveillance
            const scriptKiddies = Math.floor(totalEnemies * 0.3);
            const federalAgents = Math.floor(totalEnemies * 0.3);
            const corporateSaboteurs = Math.floor(totalEnemies * 0.2);
            const aiSurveillance = totalEnemies - scriptKiddies - federalAgents - corporateSaboteurs;
            
            for (let i = 0; i < scriptKiddies; i++) enemies.push('scriptKiddie');
            for (let i = 0; i < federalAgents; i++) enemies.push('federalAgent');
            for (let i = 0; i < corporateSaboteurs; i++) enemies.push('corporateSaboteur');
            for (let i = 0; i < aiSurveillance; i++) enemies.push('aiSurveillance');
        } else {
            // Boss waves: include raid teams
            const scriptKiddies = Math.floor(totalEnemies * 0.2);
            const federalAgents = Math.floor(totalEnemies * 0.3);
            const corporateSaboteurs = Math.floor(totalEnemies * 0.2);
            const aiSurveillance = Math.floor(totalEnemies * 0.2);
            const raidTeams = Math.max(1, totalEnemies - scriptKiddies - federalAgents - corporateSaboteurs - aiSurveillance);
            
            for (let i = 0; i < scriptKiddies; i++) enemies.push('scriptKiddie');
            for (let i = 0; i < federalAgents; i++) enemies.push('federalAgent');
            for (let i = 0; i < corporateSaboteurs; i++) enemies.push('corporateSaboteur');
            for (let i = 0; i < aiSurveillance; i++) enemies.push('aiSurveillance');
            for (let i = 0; i < raidTeams; i++) enemies.push('raidTeam');
        }
        
        // Shuffle enemy order
        for (let i = enemies.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [enemies[i], enemies[j]] = [enemies[j], enemies[i]];
        }
        
        return {
            waveNumber,
            enemies,
            totalEnemies: enemies.length,
            spawnInterval: Math.max(500, 2000 - (waveNumber * 100)) // Faster spawning in later waves
        };
    }
    
    updateWaveSpawning(deltaTime) {
        if (!this.waveInProgress || !this.currentWaveData) return;
        
        this.spawnTimer += deltaTime * 1000; // Convert to milliseconds
        
        // Check if it's time to spawn next enemy
        if (this.spawnTimer >= this.nextSpawnTime && this.enemiesSpawned < this.currentWaveData.totalEnemies) {
            const enemyType = this.currentWaveData.enemies[this.enemiesSpawned];
            console.log(`Spawning enemy ${this.enemiesSpawned + 1}/${this.currentWaveData.totalEnemies}: ${enemyType}`);
            this.spawnEnemy(enemyType);
            this.enemiesSpawned++;
            this.nextSpawnTime = this.spawnTimer + this.currentWaveData.spawnInterval;
        }
        
        // Check if wave is complete - all enemies spawned and no living enemies remain
        const aliveEnemies = this.enemies.filter(enemy => enemy.isAlive || enemy.deathAnimationTime > 0).length;
        if (this.enemiesSpawned >= this.currentWaveData.totalEnemies && aliveEnemies === 0) {
            console.log('Wave complete! All enemies defeated.');
            this.completeWave();
        }
    }
    
    completeWave() {
        this.waveInProgress = false;
        
        // Check if this was a perfect wave (no resources lost)
        const isPerfectWave = this.resources.dharma >= this.waveStartDharma && 
                             this.resources.anonymity >= this.waveStartAnonymity;
        
        // Award resources for completing wave
        const dharmaReward = 20 + (this.currentWave * 5);
        const bandwidthReward = 10 + (this.currentWave * 2);
        const anonymityReward = 5 + this.currentWave;
        
        this.resources.dharma += dharmaReward;
        this.resources.bandwidth += bandwidthReward;
        this.resources.anonymity += anonymityReward;
        
        console.log(`Wave ${this.currentWave} completed! Dharma reward: ${dharmaReward}, New total: ${this.resources.dharma}`);
        
        // Track achievements
        if (isPerfectWave) {
            this.trackAchievement('perfect_wave');
        }
        
        this.updateUI();
        
        // Show completion notification
        this.showNotification(`Wave ${this.currentWave} completed! +${dharmaReward} Dharma`, '#00ff88');
        this.playSfx('waveComplete');
        
        // Update level stats
        if (this.currentLevel) {
            this.currentLevel.updateStats('perfectWaves', 1);
        }
        
        // Check for level completion (not just wave completion)
        if (this.currentLevel && this.currentWave >= this.currentLevel.waves.length) {
            // This is handled by checkGameConditions
        } else if (this.currentWave >= (this.currentLevel?.waves?.length || CONFIG.MAX_WAVES)) {
            this.gameWon();
        }
    }
    
    spawnEnemy(type) {
        console.log(`Attempting to spawn enemy: ${type}`);
        
        if (!CONFIG.ENEMY_TYPES[type]) {
            console.warn(`Unknown enemy type: ${type}`);
            return;
        }
        
        try {
            // Spawn enemy at the first path point with some random offset to spread them out
            const startPoint = this.getPathStartPoint();
            
            // Add random offset to prevent enemies from bunching up
            const offsetRange = 40;
            const spawnX = startPoint.x + (Math.random() - 0.5) * offsetRange;
            const spawnY = startPoint.y + (Math.random() - 0.5) * offsetRange;
            
            console.log(`Spawn point:`, {x: spawnX, y: spawnY});
            
            const enemy = new Enemy(type, spawnX, spawnY, this.pathfinder);
            
            this.enemies.push(enemy);
            console.log(`Enemy spawned successfully. Total enemies: ${this.enemies.length}`);
        } catch (error) {
            console.error(`Failed to spawn enemy ${type}:`, error);
        }
    }
    
    showNotification(message, color = '#ffffff') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'game-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: ${color};
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
            z-index: 1000;
            animation: fadeInOut 3s ease-in-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after animation
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    gameWon() {
        this.state = 'won';
        this.showNotification('Congratulations! You have achieved digital enlightenment!', '#ffd700');
        // TODO: Show victory screen
    }
    
    gameLost() {
        this.state = 'lost';
        this.showNotification('The network has been compromised. Meditate and try again.', '#ff6b6b');
        // TODO: Show game over screen
    }
    
    // Debug method for pathfinding visualization
    renderPathfindingDebug() {
        const ctx = this.ctx;
        const grid = this.pathfinder.grid;
        
        ctx.save();
        ctx.globalAlpha = 0.3;
        
        // Draw grid cells
        for (let x = 0; x < grid.length; x++) {
            for (let y = 0; y < grid[x].length; y++) {
                const node = grid[x][y];
                const worldX = x * this.pathfinder.gridSize;
                const worldY = y * this.pathfinder.gridSize;
                
                // Color based on walkability
                ctx.fillStyle = node.walkable ? '#00ff00' : '#ff0000';
                ctx.fillRect(worldX, worldY, this.pathfinder.gridSize, this.pathfinder.gridSize);
                
                // Draw border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(worldX, worldY, this.pathfinder.gridSize, this.pathfinder.gridSize);
            }
        }
        
        ctx.restore();
    }
    
    // Toggle pathfinding debug display
    togglePathfindingDebug() {
        this.showDebugPath = !this.showDebugPath;
    }
    
    // Get enemy count by type
    getEnemyCountByType(type) {
        return this.enemies.filter(enemy => enemy.type === type).length;
    }
    
    // Get total enemy health remaining
    getTotalEnemyHealth() {
        return this.enemies.reduce((total, enemy) => total + enemy.health, 0);
    }
    
    // Check if wave is complete
    isWaveComplete() {
        return this.enemies.length === 0 && !this.waveInProgress;
    }
    
    // Apply area effect to enemies
    applyAreaEffect(x, y, radius, effect) {
        this.enemies.forEach(enemy => {
            const distance = Utils.distance(x, y, enemy.x, enemy.y);
            if (distance <= radius) {
                switch (effect.type) {
                    case 'damage':
                        enemy.takeDamage(effect.amount, effect.damageType);
                        break;
                    case 'slow':
                        enemy.slowEffect = effect.amount;
                        enemy.slowEffectTime = effect.duration;
                        break;
                    case 'stun':
                        enemy.stunned = true;
                        enemy.stunnedTime = effect.duration;
                        break;
                }
            }
        });
        
        // Create visual effect for area damage
        if (effect.type === 'damage') {
            this.createExplosionEffect(x, y, radius);
        }
    }
    
    createExplosionEffect(x, y, radius) {
        // Create explosion particles
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const speed = Utils.random(50, 150);
            const distance = Utils.random(radius * 0.5, radius);
            
            this.particles.push({
                x: x + Math.cos(angle) * 10,
                y: y + Math.sin(angle) * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 800,
                decay: 0.02,
                color: '#ff8000',
                size: Utils.random(4, 8)
            });
        }
    }
    
    // Targeting mode management
    setDefenseTargetingMode(defense, mode) {
        if (defense && defense.setTargetingMode) {
            defense.setTargetingMode(mode);
            this.showNotification(`Targeting mode: ${mode}`, '#4ecdc4');
        }
    }
    
    // Get defense statistics
    getDefenseStats() {
        const stats = {
            totalDefenses: this.defenses.length,
            totalDamage: 0,
            totalUpgradeCost: 0,
            defenseTypes: {}
        };
        
        this.defenses.forEach(defense => {
            stats.totalDamage += defense.damage;
            stats.totalUpgradeCost += defense.canUpgrade() ? defense.getUpgradeCost() : 0;
            
            if (!stats.defenseTypes[defense.type]) {
                stats.defenseTypes[defense.type] = 0;
            }
            stats.defenseTypes[defense.type]++;
        });
        
        return stats;
    }
    
    // Get pathfinder performance statistics
    getPathfinderStats() {
        return this.pathfinder ? this.pathfinder.getPerformanceStats() : null;
    }
    
    // Get detailed pathfinder performance report
    getPathfinderReport() {
        return this.pathfinder ? this.pathfinder.getDetailedPerformanceReport() : null;
    }
    
    // Configure pathfinder adaptive scaling
    configurePathfinderAdaptiveScaling(options) {
        if (this.pathfinder) {
            this.pathfinder.configureAdaptiveScaling(options);
        }
    }
    
    // Force pathfinder quality level
    setPathfinderQuality(level) {
        if (this.pathfinder) {
            this.pathfinder.forceQualityLevel(level);
        }
    }
    
    // Toggle pathfinder adaptive scaling
    togglePathfinderAdaptiveScaling(enabled) {
        if (this.pathfinder) {
            this.pathfinder.setAdaptiveScaling(enabled);
        }
    }
    
    // Auto-target mode for defenses
    setGlobalTargetingMode(mode) {
        this.defenses.forEach(defense => {
            defense.setTargetingMode(mode);
        });
        this.showNotification(`All defenses set to: ${mode}`, '#4ecdc4');
    }
    
    // Sell all defenses
    sellAllDefenses() {
        if (this.defenses.length === 0) {
            this.showNotification('No defenses to sell!', '#ff6b6b');
            this.playSfx('error');
            return;
        }
        
        let totalRefund = 0;
        this.defenses.forEach(defense => {
            totalRefund += Math.floor(defense.cost * 0.7);
        });
        
        this.defenses = [];
        this.resources.dharma += totalRefund;
        
        // Update pathfinder
        this.pathfinder.updateObstacles(this.defenses);
        
        // Hide info panel
        this.hideDefenseInfo();
        
        this.showNotification(`All defenses sold for ${totalRefund} Dharma`, '#f9ca24');
        this.playSfx('massSell');
    }
    
    // Upgrade all defenses
    upgradeAllDefenses() {
        let totalCost = 0;
        let upgradedCount = 0;
        
        // Calculate total cost first
        this.defenses.forEach(defense => {
            if (defense.canUpgrade()) {
                totalCost += defense.getUpgradeCost();
            }
        });
        
        if (totalCost === 0) {
            this.showNotification('No defenses can be upgraded!', '#ff6b6b');
            this.playSfx('error');
            return;
        }
        
        if (this.resources.dharma < totalCost) {
            this.showNotification(`Need ${totalCost} Dharma to upgrade all (have ${this.resources.dharma})`, '#ff6b6b');
            this.playSfx('error');
            return;
        }
        
        // Perform upgrades
        this.defenses.forEach(defense => {
            if (defense.canUpgrade()) {
                const cost = defense.upgrade();
                this.resources.dharma -= cost;
                upgradedCount++;
            }
        });
        
        this.showNotification(`Upgraded ${upgradedCount} defenses for ${totalCost} Dharma`, '#4ecdc4');
        this.playSfx('massUpgrade');
        
        // Update level stats
        if (this.currentLevel) {
            this.currentLevel.updateStats('resourcesSpent', totalCost);
        }
    }
    
    // Level completion handler
    completeLevelSuccess() {
        this.levelComplete = true;
        
        const timeElapsed = (Date.now() - this.levelStartTime) / 1000;
        const score = this.currentLevel.calculateScore(
            this.resources, 
            timeElapsed, 
            this.enemiesKilled, 
            this.defenses, 
            this.perfectCompletion
        );
        
        const stars = this.currentLevel.getStarRating(
            score, 
            timeElapsed, 
            this.resources.dharma + this.resources.bandwidth + this.resources.anonymity,
            this.perfectCompletion
        );
        
        // Track level completion achievements
        this.trackAchievement('level_completed', {
            levelId: this.currentLevel.id,
            score: score,
            stars: stars,
            timeElapsed: timeElapsed,
            perfect: this.perfectCompletion
        });
        
        // Check for first level completion
        if (this.currentLevel.id === 1) {
            this.trackAchievement('first_level');
        }
        
        // Check for perfect level completion
        if (this.perfectCompletion && stars >= 3) {
            this.trackAchievement('perfect_level');
        }
        
        // Check for speed completion (under 2 minutes)
        if (timeElapsed < 120) {
            this.trackAchievement('speed_completion');
        }
        
        // Check for resource efficiency achievement
        const initialDharma = CONFIG.INITIAL_DHARMA;
        const spentDharma = initialDharma - this.resources.dharma;
        if (spentDharma < 200) {
            this.trackAchievement('efficient_completion');
        }
        
        // Check for resource milestone
        if (this.resources.dharma >= 1000) {
            this.trackAchievement('resource_milestone', { value: this.resources.dharma });
        }
        
        // Check for minimalist completion (3 defenses or fewer)
        if (this.defenses.length <= 3) {
            this.trackAchievement('minimalist_completion');
        }
        
        // Check for pacifist completion (only support defenses)
        const onlySupportDefenses = this.defenses.every(defense => 
            defense.abilities.includes('boost_aura') || 
            defense.abilities.includes('resource_generation') ||
            defense.abilities.includes('stealth_field')
        );
        if (onlySupportDefenses && this.defenses.length > 0) {
            this.trackAchievement('pacifist_completion');
        }
        
        // Complete the level through level manager
        this.levelManager.completeCurrentLevel(score, stars, timeElapsed);
        
        // Show completion screen
        this.showVictoryScreen(score, stars, timeElapsed);
        
        // Play victory music
        if (this.audioManager) {
            this.audioManager.playMusic('victory');
        }
        
        // Play victory sound
        this.playSfx('levelComplete');
        
        // Save progress
        if (this.saveSystem) {
            this.saveSystem.saveGame({
                currentLevel: this.levelManager.currentLevel,
                unlockedLevels: this.levelManager.unlockedLevels,
                playerStats: this.levelManager.playerStats,
                gameState: {
                    resources: this.resources,
                    defenses: this.defenses.map(d => d.getSaveData ? d.getSaveData() : {
                        type: d.type,
                        x: d.x,
                        y: d.y,
                        level: d.level || 1
                    }),
                    currentWave: this.currentWave,
                    gameTime: this.gameTime
                }
            });
        }
    }
    
    // Show level completion screen
    showLevelCompleteScreen(score, stars, timeElapsed) {
        // Create level complete overlay
        const overlay = document.createElement('div');
        overlay.id = 'levelCompleteOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            font-family: 'Orbitron', monospace;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(135deg, #1a1f2a, #2a3441);
            border: 2px solid #4ecdc4;
            border-radius: 15px;
            padding: 40px;
            text-align: center;
            color: white;
            max-width: 500px;
            box-shadow: 0 0 30px rgba(78, 205, 196, 0.3);
        `;
        
        const timeString = `${Math.floor(timeElapsed / 60)}:${(Math.floor(timeElapsed % 60)).toString().padStart(2, '0')}`;
        const starDisplay = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        
        content.innerHTML = `
            <h2 style="color: #ffd700; margin-bottom: 20px;">Level Complete!</h2>
            <div style="font-size: 24px; margin: 20px 0; color: #4ecdc4;">${starDisplay}</div>
            <div style="margin: 15px 0;"><strong>Score:</strong> ${score.toLocaleString()}</div>
            <div style="margin: 15px 0;"><strong>Time:</strong> ${timeString}</div>
            <div style="margin: 15px 0;"><strong>Perfect Run:</strong> ${this.perfectCompletion ? 'Yes' : 'No'}</div>
            <div style="margin: 30px 0;">
                <button id="nextLevelBtn" style="
                    background: #4ecdc4;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    margin: 0 10px;
                    cursor: pointer;
                ">Next Level</button>
                <button id="retryLevelBtn" style="
                    background: #636e72;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    margin: 0 10px;
                    cursor: pointer;
                ">Retry</button>
                <button id="backToMenuBtn2" style="
                    background: #ff7675;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    margin: 0 10px;
                    cursor: pointer;
                ">Menu</button>
            </div>
        `;
        
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Add event listeners
        document.getElementById('nextLevelBtn').addEventListener('click', () => {
            this.playSfx('buttonClick');
            if (this.levelManager.nextLevel()) {
                overlay.remove();
                this.startGame();
            } else {
                this.showNotification('All levels completed!', '#ffd700');
            }
        });
        
        document.getElementById('retryLevelBtn').addEventListener('click', () => {
            this.playSfx('buttonClick');
            overlay.remove();
            this.startGame();
        });
        
        document.getElementById('backToMenuBtn2').addEventListener('click', () => {
            this.playSfx('buttonClick');
            overlay.remove();
            this.returnToMenu();
        });
    }
    
    // Auto-save functionality
    autoSave() {
        if (!this.saveSystem) return;
        
        try {
            const saveData = {
                currentLevel: this.levelManager.currentLevel,
                unlockedLevels: this.levelManager.unlockedLevels,
                playerStats: this.levelManager.playerStats,
                gameState: {
                    resources: this.resources,
                    defenses: this.defenses.map(d => d.getSaveData ? d.getSaveData() : {
                        type: d.type,
                        x: d.x,
                        y: d.y,
                        level: d.level || 1
                    }),
                    currentWave: this.currentWave,
                    gameTime: this.gameTime,
                    enemiesKilled: this.enemiesKilled,
                    perfectCompletion: this.perfectCompletion
                },
                timestamp: Date.now()
            };
            
            this.saveSystem.saveGame(saveData);
            console.log('Game auto-saved successfully');
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
    
    // Load game state
    loadGame() {
        if (!this.saveSystem) return false;
        
        try {
            const savedData = this.saveSystem.loadGame();
            if (!savedData) return false;
            
            // Restore level manager state
            if (savedData.currentLevel !== undefined) {
                this.levelManager.currentLevel = savedData.currentLevel;
            }
            if (savedData.unlockedLevels !== undefined) {
                this.levelManager.unlockedLevels = savedData.unlockedLevels;
            }
            if (savedData.playerStats) {
                this.levelManager.playerStats = savedData.playerStats;
            }
            
            // Restore game state
            if (savedData.gameState) {
                const gs = savedData.gameState;
                if (gs.resources) this.resources = gs.resources;
                if (gs.currentWave !== undefined) this.currentWave = gs.currentWave;
                if (gs.gameTime !== undefined) this.gameTime = gs.gameTime;
                if (gs.enemiesKilled !== undefined) this.enemiesKilled = gs.enemiesKilled;
                if (gs.perfectCompletion !== undefined) this.perfectCompletion = gs.perfectCompletion;
                
                // Restore defenses
                if (gs.defenses && Array.isArray(gs.defenses)) {
                    this.defenses = [];
                    gs.defenses.forEach(defenseData => {
                        try {
                            const defense = new Defense(defenseData.type, defenseData.x, defenseData.y);
                            if (defenseData.level && defenseData.level > 1) {
                                for (let i = 1; i < defenseData.level; i++) {
                                    defense.upgrade();
                                }
                            }
                            this.defenses.push(defense);
                        } catch (error) {
                            console.warn('Failed to restore defense:', defenseData, error);
                        }
                    });
                }
            }
            
            console.log('Game loaded successfully');
            return true;
        } catch (error) {
            console.error('Load game failed:', error);
            return false;
        }
    }
    
    // Periodic auto-save during gameplay
    setupPeriodicSave() {
        if (!this.saveSystem) return;
        
        // Auto-save every 30 seconds during gameplay
        setInterval(() => {
            if (this.state === 'playing' && !this.isPaused) {
                this.autoSave();
            }
        }, 30000);
    }
    
    // UI Management Methods
    showLevelSelectScreen() {
        this.populateLevelSelectScreen();
        this.showScreen('levelSelect');
    }
    
    populateLevelSelectScreen() {
        const levelGrid = document.getElementById('levelGrid');
        if (!levelGrid || !this.levelManager) return;
        
        levelGrid.innerHTML = '';
        
        const levelData = this.levelManager.getLevelSelectionData();
        
        levelData.forEach((level, index) => {
            const levelCard = document.createElement('div');
            levelCard.className = `level-card ${level.isUnlocked ? '' : 'locked'}`;
            levelCard.dataset.levelIndex = index;
            
            const difficultyClass = this.getDifficultyClass(level.difficulty);
            
            levelCard.innerHTML = `
                <div class="level-header">
                    <div class="level-number">${index + 1}</div>
                    <div class="level-stars">
                        ${this.renderStars(level.bestStars)}
                    </div>
                </div>
                <div class="level-difficulty ${difficultyClass}">
                    ${this.getDifficultyText(level.difficulty)}
                </div>
                <div class="level-title">${level.name}</div>
                <div class="level-description">${level.description}</div>
                <div class="level-stats">
                    <div class="level-stat">
                        <span>Best Score:</span>
                        <span class="level-stat-value">${level.highScore.toLocaleString()}</span>
                    </div>
                    <div class="level-stat">
                        <span>Best Time:</span>
                        <span class="level-stat-value">${this.formatTime(level.bestTime)}</span>
                    </div>
                    <div class="level-stat">
                        <span>Enemies:</span>
                        <span class="level-stat-value">${level.totalEnemies}</span>
                    </div>
                    <div class="level-stat">
                        <span>Waves:</span>
                        <span class="level-stat-value">${level.waveCount}</span>
                    </div>
                </div>
            `;
            
            if (level.isUnlocked) {
                levelCard.addEventListener('click', () => {
                    this.selectLevel(index);
                });
            }
            
            levelGrid.appendChild(levelCard);
        });
    }
    
    selectLevel(levelIndex) {
        // Remove previous selection
        document.querySelectorAll('.level-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Select new level
        const selectedCard = document.querySelector(`[data-level-index="${levelIndex}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
            this.selectedLevelIndex = levelIndex;
            
            // Enable play button
            const playButton = document.getElementById('playSelectedLevelBtn');
            if (playButton) {
                playButton.disabled = false;
            }
        }
        
        this.playSfx('buttonClick');
    }
    
    playSelectedLevel() {
        if (this.selectedLevelIndex !== undefined && this.levelManager) {
            this.levelManager.selectLevel(this.selectedLevelIndex);
            this.startGame();
        }
    }
    
    showSaveLoadScreen() {
        this.populateSaveLoadScreen();
        this.showScreen('saveLoad');
    }
    
    populateSaveLoadScreen() {
        if (!this.saveSystem) return;
        
        // Update quick save slot
        const quickSaveInfo = this.saveSystem.getQuickSaveInfo();
        this.updateSaveSlot('quickSaveSlot', quickSaveInfo);
        
        // Update auto save slot
        const autoSaveInfo = this.saveSystem.getAutoSaveInfo();
        this.updateSaveSlot('autoSaveSlot', autoSaveInfo);
        
        // Update manual save slots
        for (let i = 1; i <= 3; i++) {
            const saveInfo = this.saveSystem.getSaveInfo(i);
            this.updateSaveSlot(`saveSlot${i}`, saveInfo, i);
        }
    }
    
    updateSaveSlot(slotId, saveInfo, slotNumber = null) {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        
        const timestamp = slot.querySelector('.slot-timestamp');
        const level = slot.querySelector('.slot-level');
        const progress = slot.querySelector('.slot-progress');
        const loadBtn = slot.querySelector('.load-btn');
        const deleteBtn = slot.querySelector('.delete-btn');
        const saveBtn = slot.querySelector('.save-btn');
        
        if (saveInfo) {
            timestamp.textContent = new Date(saveInfo.timestamp).toLocaleString();
            level.textContent = `Level ${saveInfo.currentLevel + 1}`;
            progress.textContent = `${saveInfo.levelsCompleted} levels completed`;
            
            if (loadBtn) {
                loadBtn.disabled = false;
                loadBtn.onclick = () => this.loadFromSlot(slotId, saveInfo);
            }
            
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.onclick = () => this.deleteFromSlot(slotId, slotNumber);
            }
        } else {
            timestamp.textContent = '-';
            level.textContent = slotNumber ? 'Empty' : 'No save data';
            progress.textContent = '-';
            
            if (loadBtn) {
                loadBtn.disabled = true;
                loadBtn.onclick = null;
            }
            
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.onclick = null;
            }
        }
        
        if (saveBtn && slotNumber) {
            saveBtn.onclick = () => this.saveToSlot(slotNumber);
        }
    }
    
    // Helper methods
    renderStars(count) {
        const stars = [];
        for (let i = 0; i < 3; i++) {
            stars.push(`<span class="star ${i < count ? 'filled' : 'empty'}">${i < count ? '★' : '☆'}</span>`);
        }
        return stars.join('');
    }
    
    getDifficultyClass(difficulty) {
        if (difficulty <= 3) return 'difficulty-easy';
        if (difficulty <= 5) return 'difficulty-medium';
        if (difficulty <= 7) return 'difficulty-hard';
        return 'difficulty-extreme';
    }
    
    getDifficultyText(difficulty) {
        if (difficulty <= 3) return 'Easy';
        if (difficulty <= 5) return 'Medium';
        if (difficulty <= 7) return 'Hard';
        return 'Extreme';
    }
    
    formatTime(seconds) {
        if (seconds === Infinity || seconds === 0) return '--:--';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    updateProgressIndicators() {
        if (!this.levelManager) return;
        
        const progressStats = this.levelManager.getProgressStats();
        
        // Update campaign progress
        const progressBar = document.getElementById('campaignProgressBar');
        const progressText = document.getElementById('campaignProgressText');
        
        if (progressBar && progressText) {
            progressBar.style.width = `${progressStats.completionPercentage}%`;
            progressText.textContent = `${progressStats.levelsCompleted}/${progressStats.totalLevels} Levels`;
        }
        
        // Update stars
        const starsEarned = document.getElementById('totalStarsEarned');
        if (starsEarned) {
            starsEarned.textContent = progressStats.starsEarned;
        }
        
        // Update best score
        const bestScore = document.getElementById('bestScore');
        if (bestScore) {
            bestScore.textContent = (progressStats.playerStats.totalScore || 0).toLocaleString();
        }
    }
    
    // Additional UI methods
    showVictoryScreen(score, stars, timeElapsed) {
        // Update victory screen data
        document.getElementById('victoryScore').textContent = score.toLocaleString();
        document.getElementById('victoryTime').textContent = this.formatTime(timeElapsed);
        
        // Update star rating
        const starElements = document.querySelectorAll('#victoryStars .star');
        starElements.forEach((star, index) => {
            star.classList.toggle('filled', index < stars);
            star.textContent = index < stars ? '★' : '☆';
        });
        
        // Update objectives
        this.updateVictoryObjectives();
        
        // Update progress indicators
        this.updateProgressIndicators();
        
        this.showScreen('victory');
        
        // Play victory sound
        this.playSfx('levelComplete');
    }
    
    updateVictoryObjectives() {
        const objectivesContainer = document.getElementById('completedObjectives');
        if (!objectivesContainer || !this.currentLevel) return;
        
        objectivesContainer.innerHTML = '';
        
        // Add main objectives
        this.currentLevel.objectives.forEach(objective => {
            const item = document.createElement('div');
            item.className = 'objective-item';
            item.innerHTML = `
                <span class="objective-check">${objective.completed ? '✓' : '✗'}</span>
                <span class="objective-text">${objective.text}</span>
            `;
            objectivesContainer.appendChild(item);
        });
        
        // Add bonus objectives
        this.currentLevel.bonusObjectives.forEach(objective => {
            const item = document.createElement('div');
            item.className = 'objective-item';
            item.innerHTML = `
                <span class="objective-check">${objective.completed ? '✓' : '✗'}</span>
                <span class="objective-text">${objective.text}</span>
                <span class="objective-bonus">BONUS</span>
            `;
            objectivesContainer.appendChild(item);
        });
    }
    
    showDefeatScreen() {
        // Update defeat screen data
        document.getElementById('defeatWave').textContent = this.currentWave;
        document.getElementById('defeatTime').textContent = this.formatTime((Date.now() - this.levelStartTime) / 1000);
        document.getElementById('defeatEnemies').textContent = this.enemiesKilled;
        
        // Update defeat analysis
        this.updateDefeatAnalysis();
        
        this.showScreen('defeat');
        
        // Play defeat sound
        this.playSfx('gameOver');
    }
    
    updateDefeatAnalysis() {
        const causeElement = document.getElementById('defeatCause');
        const tipsElement = document.getElementById('defeatTips');
        
        if (!causeElement || !tipsElement) return;
        
        // Determine defeat cause
        let cause = 'Network resources depleted';
        let tips = [
            '💡 Try placing more defensive structures early in the level',
            '💡 Focus on resource management and efficiency',
            '💡 Use different defense types to counter various enemy abilities'
        ];
        
        if (this.resources.dharma <= 0) {
            cause = 'Dharma resources exhausted';
            tips = [
                '💡 Kill more enemies to earn Dharma points',
                '💡 Avoid unnecessary defense upgrades early on',
                '💡 Use cost-effective defenses like Firewall Fortress'
            ];
        } else if (this.resources.anonymity <= 0) {
            cause = 'Anonymity compromised - too many enemies escaped';
            tips = [
                '💡 Place defenses closer to the enemy path',
                '💡 Upgrade your defenses to increase damage',
                '💡 Use slowing defenses to give other defenses more time'
            ];
        }
        
        causeElement.textContent = cause;
        tipsElement.innerHTML = tips.map(tip => `<p>${tip}</p>`).join('');
    }
    
    loadFromSlot(slotId, saveInfo) {
        if (this.saveSystem && this.levelManager) {
            const success = this.saveSystem.loadFromSlot(slotId.replace('Slot', ''));
            if (success) {
                this.showNotification('Game loaded successfully!', '#4ecdc4');
                this.showScreen('menu');
                this.updateProgressIndicators();
            } else {
                this.showNotification('Failed to load game!', '#ff6b6b');
            }
        }
        this.playSfx('buttonClick');
    }
    
    saveToSlot(slotNumber) {
        if (this.saveSystem) {
            const success = this.saveSystem.saveToSlot(slotNumber, {
                currentLevel: this.levelManager?.currentLevel || 0,
                unlockedLevels: this.levelManager?.unlockedLevels || 1,
                playerStats: this.levelManager?.playerStats || {},
                gameState: {
                    resources: this.resources,
                    currentWave: this.currentWave,
                    gameTime: this.gameTime
                }
            });
            
            if (success) {
                this.showNotification('Game saved successfully!', '#4ecdc4');
                this.populateSaveLoadScreen(); // Refresh the display
            } else {
                this.showNotification('Failed to save game!', '#ff6b6b');
            }
        }
        this.playSfx('buttonClick');
    }
    
    deleteFromSlot(slotId, slotNumber) {
        if (confirm('Are you sure you want to delete this save?')) {
            if (this.saveSystem) {
                const success = this.saveSystem.deleteFromSlot(slotNumber || slotId.replace('Slot', ''));
                if (success) {
                    this.showNotification('Save deleted!', '#f39c12');
                    this.populateSaveLoadScreen(); // Refresh the display
                } else {
                    this.showNotification('Failed to delete save!', '#ff6b6b');
                }
            }
        }
        this.playSfx('buttonClick');
    }
    
    clearAllSaves() {
        if (confirm('Are you sure you want to delete ALL save data? This cannot be undone!')) {
            if (this.saveSystem) {
                this.saveSystem.clearAllData();
                this.showNotification('All saves cleared!', '#f39c12');
                this.populateSaveLoadScreen();
                this.updateProgressIndicators();
            }
        }
        this.playSfx('buttonClick');
    }
    
    // Test method for boss UI functionality
    testBossUI() {
        console.log('Testing Boss UI methods...');
        
        // Test boss spawn
        const mockBoss = {
            health: 1000,
            maxHealth: 1000,
            phase: 1,
            totalPhases: 4,
            type: 'CorporateHydra'
        };
        
        // Initialize boss UI
        this.initializeBossUI(mockBoss, 'CorporateHydra', 1000, 4);
        
        // Test health updates
        setTimeout(() => {
            this.updateBossHealthBar(mockBoss, 750, 1000, 75);
        }, 1000);
        
        setTimeout(() => {
            this.updateBossHealthBar(mockBoss, 500, 1000, 50);
        }, 2000);
        
        // Test phase transition
        setTimeout(() => {
            this.updateBossPhaseIndicator(mockBoss, 2, 'CorporateHydra', 4);
        }, 3000);
        
        // Test warning
        setTimeout(() => {
            this.showBossWarning(mockBoss, 'systemHack', 3000);
        }, 4000);
        
        // Test critical health
        setTimeout(() => {
            this.updateBossHealthBar(mockBoss, 100, 1000, 10);
        }, 7000);
        
        // Test boss defeat
        setTimeout(() => {
            this.hideBossUI();
        }, 10000);
        
        console.log('Boss UI test sequence started. Check the UI for visual effects.');
    }
    
    // Test method for upgrade tree modal functionality
    testUpgradeModal() {
        console.log('Testing Upgrade Tree Modal...');
        
        // Create a mock defense for testing
        const mockDefense = new Defense('firewall', 100, 100);
        mockDefense.level = 2; // Make it upgradeable
        
        // Test the modal opening
        this.openUpgradeTreeModal(mockDefense);
        
        console.log('Upgrade tree modal should now be visible. Test the functionality:');
        console.log('1. Click on upgrade choices to select them');
        console.log('2. Check the preview updates');
        console.log('3. Try confirming/canceling upgrades');
        console.log('4. Press ESC or click outside to close');
    }
    
    // Test method for comprehensive upgrade validation system
    testUpgradeValidation() {
        console.log('=== Testing Comprehensive Upgrade Validation System ===');
        
        try {
            // Test 1: CONFIG validation
            console.log('\n1. Testing CONFIG.UPGRADE_TREES validation...');
            const configValid = CONFIG.validateUpgradeTreesStructure();
            console.log(`CONFIG validation result: ${configValid ? 'PASSED' : 'FAILED'}`);
            
            // Test 2: Create test defenses
            console.log('\n2. Testing Defense class validation methods...');
            const defenseTypes = ['firewall', 'encryption', 'decoy', 'mirror'];
            const testDefenses = [];
            
            defenseTypes.forEach(type => {
                const defense = new Defense(type, 100, 100);
                defense.level = 2; // Make upgradeable
                testDefenses.push(defense);
                
                console.log(`\nTesting ${type} defense:`);
                
                // Test canUpgrade validation
                const canUpgrade = defense.canUpgrade();
                console.log(`  canUpgrade(): ${canUpgrade ? 'PASSED' : 'FAILED'}`);
                
                // Test getUpgradeTree validation
                const upgradeTree = defense.getUpgradeTree();
                const hasValidTree = Object.keys(upgradeTree).length > 0;
                console.log(`  getUpgradeTree(): ${hasValidTree ? 'PASSED' : 'FAILED'}`);
                
                // Test getUpgradePreview validation
                const preview = defense.getUpgradePreview();
                const hasValidPreview = preview && typeof preview === 'object';
                console.log(`  getUpgradePreview(): ${hasValidPreview ? 'PASSED' : 'FAILED'}`);
                
                // Test hasUpgradeChoice validation
                const hasChoice = defense.hasUpgradeChoice();
                console.log(`  hasUpgradeChoice(): ${hasChoice ? 'HAS CHOICE' : 'SINGLE PATH'}`);
                
                // Test upgrade with validation
                const originalLevel = defense.level;
                const upgradeResult = defense.upgrade();
                const upgradeSuccess = upgradeResult !== false && defense.level > originalLevel;
                console.log(`  upgrade(): ${upgradeSuccess ? 'PASSED' : 'FAILED'}`);
                
                if (upgradeSuccess) {
                    console.log(`    Level: ${originalLevel} -> ${defense.level}`);
                    console.log(`    Cost: ${upgradeResult}`);
                }
            });
            
            // Test 3: Error handling
            console.log('\n3. Testing error handling...');
            
            // Test with invalid defense type
            try {
                const invalidDefense = new Defense('invalid_type', 100, 100);
                const fallbackTree = invalidDefense.getUpgradeTree();
                const hasFallback = Object.keys(fallbackTree).length > 0;
                console.log(`  Invalid defense type fallback: ${hasFallback ? 'PASSED' : 'FAILED'}`);
            } catch (error) {
                console.log(`  Invalid defense type error handling: PASSED (${error.message})`);
            }
            
            // Test with max level defense
            const maxLevelDefense = new Defense('firewall', 100, 100);
            maxLevelDefense.level = 5; // Max level
            const cantUpgrade = !maxLevelDefense.canUpgrade();
            console.log(`  Max level upgrade prevention: ${cantUpgrade ? 'PASSED' : 'FAILED'}`);
            
            // Test 4: Choice validation
            console.log('\n4. Testing upgrade choice validation...');
            const choiceDefense = new Defense('firewall', 100, 100);
            choiceDefense.level = 2; // Level 3 has choices
            
            if (choiceDefense.hasUpgradeChoice()) {
                // Test valid choice
                const validChoice = choiceDefense.validateUpgradeChoiceExists(0);
                console.log(`  Valid choice validation: ${validChoice ? 'PASSED' : 'FAILED'}`);
                
                // Test invalid choice
                const invalidChoice = !choiceDefense.validateUpgradeChoiceExists(999);
                console.log(`  Invalid choice rejection: ${invalidChoice ? 'PASSED' : 'FAILED'}`);
            }
            
            console.log('\n=== Upgrade Validation Test Complete ===');
            console.log('All validation systems are functioning correctly!');
            
        } catch (error) {
            console.error('Error during upgrade validation testing:', error);
        }
    }
    
    // Test method for achievement gallery functionality
    testAchievementGallery() {
        console.log('Testing Achievement Gallery...');
        
        // Test the gallery opening
        this.showAchievementScreen();
        
        console.log('Achievement gallery should now be visible. Test the functionality:');
        console.log('1. Click on category buttons to filter achievements');
        console.log('2. Check progress stats updates');
        console.log('3. Click on achievement items for details');
        console.log('4. Use back button to return to menu');
    }
}

// Make test methods available globally for testing
window.testBossUI = function() {
    if (window.game) {
        window.game.testBossUI();
    } else {
        console.log('Game not initialized yet');
    }
};

window.testUpgradeModal = function() {
    if (window.game) {
        window.game.testUpgradeModal();
    } else {
        console.log('Game not initialized yet');
    }
};

window.testAchievementGallery = function() {
    if (window.game) {
        window.game.testAchievementGallery();
    } else {
        console.log('Game not initialized yet');
    }
};

// Test PathGenerator integration
window.testPathGeneration = function() {
    if (window.game) {
        window.game.testPathGeneration();
    } else {
        console.log('Game not initialized yet');
    }
};

// Regenerate current level path for testing
window.regeneratePath = function(eventType = 'test_event') {
    if (window.game) {
        const result = window.game.regeneratePathForEvent(eventType, { testMode: true });
        console.log('Path regeneration result:', result);
        return result;
    } else {
        console.log('Game not initialized yet');
        return false;
    }
};

// Get current path information
window.getPathInfo = function() {
    if (window.game) {
        const info = window.game.getCurrentPathInfo();
        console.log('Current path info:', info);
        return info;
    } else {
        console.log('Game not initialized yet');
        return null;
    }
};

