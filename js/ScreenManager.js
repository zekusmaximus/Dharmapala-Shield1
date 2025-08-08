class ScreenManager {
    constructor() {
        this.currentScreen = 'loading';
        this.previousScreen = null;
        this.screens = new Map();
        this.modalStack = [];
        this.callbacks = new Map();
        
        this.setupScreens();
        this.setupEventListeners();
        this.hideAllScreens(); // Hide all screens initially
    }

    hideAllScreens() {
        // Hide all non-loading screens initially
        const allScreens = document.querySelectorAll('.screen');
        allScreens.forEach(screen => {
            if (screen.id !== 'loading-screen') {
                screen.style.display = 'none';
                screen.classList.remove('active');
                console.log(`[ScreenManager] Hiding screen: ${screen.id}`);
            }
        });
        console.log('[ScreenManager] All screens hidden initially');
    }

    setupScreens() {
        // Map screen names to their DOM elements and initialization functions
        const screenDefinitions = {
            'loading': {
                element: 'loading-screen',
                init: () => this.initLoadingScreen()
            },
            'main-menu': {
                element: 'main-menu-screen',
                init: () => this.initMainMenuScreen()
            },
            'game': {
                element: 'game-screen',
                init: () => this.initGameScreen()
            },
            'achievements': {
                element: 'achievement-gallery-screen',
                init: () => this.initAchievementScreen()
            },
            'settings': {
                element: 'settings-screen',
                init: () => this.initSettingsScreen()
            },
            'save-load': {
                element: 'save-load-screen',
                init: () => this.initSaveLoadScreen()
            },
            'tutorial': {
                element: 'tutorialScreen',
                init: () => this.initTutorialScreen()
            },
            'credits': {
                element: 'creditsScreen',
                init: () => this.initCreditsScreen()
            },
            'level-select': {
                element: 'levelSelectScreen',
                init: () => this.initLevelSelectScreen()
            },
            'victory': {
                element: 'victoryScreen',
                init: () => this.initVictoryScreen()
            },
            'defeat': {
                element: 'defeatScreen',
                init: () => this.initDefeatScreen()
            },
            'upgrade-tree': {
                element: 'upgrade-tree-modal',
                init: () => this.initUpgradeTreeScreen(),
                isModal: true
            },
            'boss-warning': {
                element: 'boss-warning-modal',
                init: () => this.initBossWarningScreen(),
                isModal: true
            },
            'pause-menu': {
                element: 'pause-menu-overlay',
                init: () => this.initPauseMenuScreen(),
                isModal: true
            }
        };

        for (const [name, config] of Object.entries(screenDefinitions)) {
            const element = document.getElementById(config.element);
            if (element) {
                this.screens.set(name, {
                    element: element,
                    init: config.init,
                    isModal: config.isModal || false,
                    initialized: false
                });
            } else {
                console.warn(`[ScreenManager] Screen element not found: ${config.element}`);
            }
        }
    }

    setupEventListeners() {
        // Main menu navigation
        this.addClickListener('start-game-btn', () => this.startNewGame());
        this.addClickListener('continue-game-btn', () => this.continueGame());
        this.addClickListener('levelSelectBtn', () => this.showScreen('level-select'));
        this.addClickListener('save-load-btn', () => this.showScreen('save-load'));
        this.addClickListener('tutorialBtn', () => this.showScreen('tutorial'));
        this.addClickListener('achievements-btn', () => this.showScreen('achievements'));
        this.addClickListener('settings-btn', () => this.showScreen('settings'));
        this.addClickListener('creditsBtn', () => this.showScreen('credits'));

        // Game screen navigation buttons
        this.addClickListener('main-menu-btn', () => this.showScreen('main-menu'));
        this.addClickListener('tutorial-btn', () => this.showScreen('tutorial'));
        this.addClickListener('achievements-btn-header', () => this.showScreen('achievements'));
        this.addClickListener('settings-btn-header', () => this.showScreen('settings'));
        this.addClickListener('credits-btn-header', () => this.showScreen('credits'));

        // Back buttons - game screen utilities go back to game, others go to main menu
        this.addClickListener('back-to-menu-btn', () => this.showScreen('main-menu'));
        this.addClickListener('back-from-achievements', () => this.showScreen('main-menu'));
        this.addClickListener('back-from-settings', () => this.showScreen('main-menu'));
        this.addClickListener('back-from-save-load', () => this.showScreen('main-menu'));
        this.addClickListener('backFromTutorialBtn', () => this.showScreen('main-menu'));
        this.addClickListener('backFromCreditsBtn', () => this.showScreen('main-menu'));
        this.addClickListener('backFromLevelSelectBtn', () => this.showScreen('main-menu'));

        // Game screen controls
        this.addClickListener('pause-game-btn', () => this.pauseGame());
        this.addClickListener('resume-game-btn', () => this.resumeGame());
        this.addClickListener('return-to-menu-btn', () => this.returnToMenu());

        // Modal close buttons
        this.addClickListener('close-upgrade-tree', () => this.closeModal('upgrade-tree'));
        this.addClickListener('close-boss-warning', () => this.closeModal('boss-warning'));

        // Generic modal overlay clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeTopModal();
            }
        });

        // Escape key handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
        });
    }

    addClickListener(elementId, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            console.log(`[ScreenManager] Adding click listener for: ${elementId}`);
            element.addEventListener('click', (e) => {
                console.log(`[ScreenManager] Button clicked: ${elementId}`);
                handler(e);
            });
        } else {
            console.warn(`[ScreenManager] Element not found for click listener: ${elementId}`);
        }
    }

    showScreen(screenName, options = {}) {
        console.log(`[ScreenManager] Attempting to show screen: ${screenName}`);
        
        if (!this.screens.has(screenName)) {
            console.warn(`[ScreenManager] Unknown screen: ${screenName}`);
            return false;
        }

        const screen = this.screens.get(screenName);
        
        // Handle modal screens differently
        if (screen.isModal) {
            return this.showModal(screenName, options);
        }

        try {
            // Hide ALL screens first with error handling
            this.screens.forEach((screenObj, name) => {
                if (!screenObj.isModal && screenObj.element) {
                    try {
                        screenObj.element.style.display = 'none';
                        screenObj.element.classList.remove('active');
                        console.log(`[ScreenManager] Hiding screen: ${name}`);
                    } catch (error) {
                        console.warn(`[ScreenManager] Error hiding screen ${name}:`, error);
                    }
                }
            });

            // Also hide loading screen explicitly
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
                loadingScreen.classList.remove('active');
                console.log('[ScreenManager] Loading screen hidden');
            }

            // Initialize screen if needed
            if (!screen.initialized) {
                try {
                    screen.init();
                    screen.initialized = true;
                } catch (error) {
                    console.warn(`[ScreenManager] Error initializing screen ${screenName}:`, error);
                    // Continue anyway - screen might still be functional
                }
            }

            // Show new screen with proper display value
            const displayValue = screenName === 'game' ? 'flex' : 'flex';
            screen.element.style.display = displayValue;
            screen.element.classList.add('active');
            console.log(`[ScreenManager] Showing screen: ${screenName}`);
            
            // Dynamic overflow management
            this.manageBodyOverflow(screenName);
            
            // Update state
            this.previousScreen = this.currentScreen;
            this.currentScreen = screenName;

            // Trigger callbacks
            this.triggerCallback('screenChanged', { 
                from: this.previousScreen, 
                to: screenName 
            });

            return true;
            
        } catch (error) {
            console.error(`[ScreenManager] Error showing screen ${screenName}:`, error);
            return false;
        }
    }

    manageBodyOverflow(screenName) {
        try {
            // Set overflow based on screen type
            if (screenName === 'game') {
                // Hide body overflow for game screen to prevent scrolling during gameplay
                document.body.style.overflow = 'hidden';
                console.log('[ScreenManager] Body overflow set to hidden for game screen');
            } else {
                // Allow scrolling for menu screens (settings, achievements, etc. might need scrolling)
                document.body.style.overflow = 'auto';
                console.log(`[ScreenManager] Body overflow set to auto for screen: ${screenName}`);
            }
        } catch (error) {
            console.warn('[ScreenManager] Error managing body overflow:', error);
            // Fallback to safe default
            document.body.style.overflow = 'auto';
        }
    }

    showMainMenuDirect() {
        console.log('[ScreenManager] Using shared main menu display');
        
        const success = Utils.dom.showMainMenuDirect();
        if (success) {
            this.currentScreen = 'main-menu';
            // Apply overflow management for main menu
            this.manageBodyOverflow('main-menu');
        }
        return success;
    }

    showModal(modalName, options = {}) {
        if (!this.screens.has(modalName)) {
            console.warn(`[ScreenManager] Unknown modal: ${modalName}`);
            return false;
        }

        const modal = this.screens.get(modalName);
        
        if (!modal.isModal) {
            console.warn(`[ScreenManager] ${modalName} is not a modal screen`);
            return false;
        }

        // Initialize modal if needed
        if (!modal.initialized) {
            modal.init();
            modal.initialized = true;
        }

        // Show modal
        modal.element.style.display = options.display || 'flex';
        modal.element.classList.remove('hidden');
        modal.element.style.zIndex = 1000 + this.modalStack.length;

        // Add to modal stack
        this.modalStack.push(modalName);

        // Trigger callbacks
        this.triggerCallback('modalOpened', { modal: modalName, options });

        console.log(`[ScreenManager] Opened modal: ${modalName}`);
        return true;
    }

    closeModal(modalName) {
        if (!modalName) {
            return this.closeTopModal();
        }

        const modal = this.screens.get(modalName);
        if (!modal || !modal.isModal) {
            console.warn(`[ScreenManager] Invalid modal: ${modalName}`);
            return false;
        }

        // Hide modal
        modal.element.style.display = 'none';
        modal.element.classList.add('hidden');

        // Remove from modal stack
        const index = this.modalStack.indexOf(modalName);
        if (index > -1) {
            this.modalStack.splice(index, 1);
        }

        // Restore overflow state based on current underlying screen
        // (only if no more modals are open)
        if (this.modalStack.length === 0) {
            this.manageBodyOverflow(this.currentScreen);
        }

        // Trigger callbacks
        this.triggerCallback('modalClosed', { modal: modalName });

        console.log(`[ScreenManager] Closed modal: ${modalName}`);
        return true;
    }

    closeTopModal() {
        if (this.modalStack.length === 0) return false;
        
        const topModal = this.modalStack[this.modalStack.length - 1];
        return this.closeModal(topModal);
    }

    closeAllModals() {
        while (this.modalStack.length > 0) {
            this.closeTopModal();
        }
    }

    handleEscapeKey() {
        if (this.modalStack.length > 0) {
            this.closeTopModal();
        } else if (this.currentScreen === 'game') {
            this.pauseGame();
        }
    }

    // Screen initialization methods
    initLoadingScreen() {
        console.log('[ScreenManager] Loading screen initialized');
    }

    initMainMenuScreen() {
        // Update continue button state based on save data
        this.updateContinueButton();
        console.log('[ScreenManager] Main menu screen initialized');
    }

    initGameScreen() {
        // Setup game-specific UI elements
        this.setupGameHUD();
        console.log('[ScreenManager] Game screen initialized');
    }

    initAchievementScreen() {
        // Load and display achievements
        this.loadAchievements();
        console.log('[ScreenManager] Achievement screen initialized');
    }

    initSettingsScreen() {
        // Setup settings controls
        this.setupSettingsControls();
        console.log('[ScreenManager] Settings screen initialized');
    }

    initSaveLoadScreen() {
        // Load save slot information
        this.loadSaveSlotInfo();
        console.log('[ScreenManager] Save/Load screen initialized');
    }

    initTutorialScreen() {
        // Setup tutorial content and navigation
        this.currentTutorialStep = 1;
        this.totalTutorialSteps = 8;
        
        // Get tutorial elements
        this.tutorialStepsContainer = document.querySelector('.tutorial-steps');
        this.tutorialProgress = document.getElementById('tutorialProgress');
        this.prevBtn = document.getElementById('prevTutorialBtn');
        this.nextBtn = document.getElementById('nextTutorialBtn');
        
        // Generate tutorial content
        this.generateTutorialSteps();
        
        // Setup navigation event listeners
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.previousTutorialStep());
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextTutorialStep());
        }
        
        // Initialize first step
        this.updateTutorialDisplay();
        
        console.log('[ScreenManager] Tutorial screen initialized with', this.totalTutorialSteps, 'steps');
    }

    generateTutorialSteps() {
        const steps = [
            {
                title: "🙏 Welcome to the Digital Monastery",
                content: `
                    <p>Greetings, aspiring cyber-monk! You have entered the sacred digital realm where ancient Buddhist wisdom meets cutting-edge technology. Your mission is to protect the network servers from waves of digital corruption using mindful defense strategies.</p>
                    <div class="tutorial-highlight">
                        <p><strong>Philosophy:</strong> In Dharmapala Shield, we practice compassionate protection - defenses redirect and purify threats rather than destroying them.</p>
                    </div>
                `
            },
            {
                title: "💎 Understanding Resources",
                content: `
                    <p>As a digital monk, you manage three sacred resources that power your defenses:</p>
                    <div class="tutorial-resources-grid">
                        <div class="resource-item">
                            <span class="resource-icon">💎</span>
                            <div class="resource-name">Dharma</div>
                            <div class="resource-description">Primary currency for placing and upgrading defenses. Earned by purifying digital threats.</div>
                        </div>
                        <div class="resource-item">
                            <span class="resource-icon">📡</span>
                            <div class="resource-name">Bandwidth</div>
                            <div class="resource-description">Required for advanced defenses and special abilities. Manages network capacity.</div>
                        </div>
                        <div class="resource-item">
                            <span class="resource-icon">👤</span>
                            <div class="resource-name">Anonymity</div>
                            <div class="resource-description">Rare resource needed for elite cyber-monk defenses. Protects your network identity.</div>
                        </div>
                    </div>
                    <div class="tutorial-highlight">
                        <p><strong>Tip:</strong> Resources regenerate over time. Balance spending with patience for optimal monastery management.</p>
                    </div>
                `
            },
            {
                title: "🏯 Defense Types - Your Digital Arsenal",
                content: `
                    <p>Each defense type embodies different aspects of Buddhist wisdom:</p>
                    <div class="defense-grid">
                        <div class="defense-preview">
                            <span class="defense-icon">🏯</span>
                            <div class="defense-name">Firewall</div>
                            <div class="defense-cost">25 💎</div>
                        </div>
                        <div class="defense-preview">
                            <span class="defense-icon">🏛️</span>
                            <div class="defense-name">Encryption</div>
                            <div class="defense-cost">40 💎</div>
                        </div>
                        <div class="defense-preview">
                            <span class="defense-icon">🕌</span>
                            <div class="defense-name">Decoy</div>
                            <div class="defense-cost">30 💎</div>
                        </div>
                        <div class="defense-preview">
                            <span class="defense-icon">🏢</span>
                            <div class="defense-name">Mirror</div>
                            <div class="defense-cost">35 💎</div>
                        </div>
                        <div class="defense-preview">
                            <span class="defense-icon">👻</span>
                            <div class="defense-name">Anonymity</div>
                            <div class="defense-cost">45 💎</div>
                        </div>
                        <div class="defense-preview">
                            <span class="defense-icon">⚖️</span>
                            <div class="defense-name">Distributor</div>
                            <div class="defense-cost">50 💎</div>
                        </div>
                    </div>
                    <div class="tutorial-highlight">
                        <p><strong>Strategy:</strong> Combine different defense types for maximum effectiveness. Each serves a unique purpose in your digital defense mandala.</p>
                    </div>
                `
            },
            {
                title: "👾 Digital Threats - Know Your Adversaries",
                content: `
                    <p>The digital realm faces various forms of corruption, each requiring different approaches:</p>
                    <ul style="font-size: 1.1rem; line-height: 1.8;">
                        <li><strong>Script Kiddies</strong> - Fast, erratic attackers with unpredictable movement patterns</li>
                        <li><strong>Federal Agents</strong> - Heavily armored, persistent, and find alternate routes when blocked</li>
                        <li><strong>Corporate Saboteurs</strong> - Can become invisible and move faster temporarily</li>
                        <li><strong>AI Surveillance</strong> - Marks defenses for increased damage with scanning capabilities</li>
                        <li><strong>Quantum Hackers</strong> - Advanced enemies that can phase through defenses</li>
                        <li><strong>Corrupted Monks</strong> - Heal nearby enemies and spread digital corruption</li>
                    </ul>
                    <div class="tutorial-highlight">
                        <p><strong>Wisdom:</strong> Understanding your opponent is the first step to compassionate resolution. Each enemy type requires different defensive strategies.</p>
                    </div>
                `
            },
            {
                title: "🎮 Controls - Mastering the Interface",
                content: `
                    <p>Learn the sacred gestures to command your digital monastery:</p>
                    <div class="control-keys">
                        <div class="key-binding">
                            <span class="key">Left Click</span>
                            <span class="key-action">Place defense / Select UI</span>
                        </div>
                        <div class="key-binding">
                            <span class="key">Right Click</span>
                            <span class="key-action">Cancel placement</span>
                        </div>
                        <div class="key-binding">
                            <span class="key">Space</span>
                            <span class="key-action">Pause/Resume game</span>
                        </div>
                        <div class="key-binding">
                            <span class="key">ESC</span>
                            <span class="key-action">Open main menu</span>
                        </div>
                        <div class="key-binding">
                            <span class="key">Mouse Wheel</span>
                            <span class="key-action">Zoom in/out</span>
                        </div>
                    </div>
                    <p><strong>Mobile Controls:</strong> Tap to place, hold for info, pinch to zoom, swipe to pan.</p>
                    <div class="tutorial-highlight">
                        <p><strong>Meditation:</strong> Smooth, deliberate actions lead to better strategic outcomes than frantic clicking.</p>
                    </div>
                `
            },
            {
                title: "⚡ Boss Encounters - Ultimate Challenges",
                content: `
                    <p>Powerful entities threaten the digital realm with devastating abilities:</p>
                    <ul style="font-size: 1.1rem; line-height: 1.8;">
                        <li><strong>Raid Team</strong> - Multi-phase boss that spawns minions and uses EMP bursts to disable defenses</li>
                        <li><strong>MegaCorp Titan</strong> - Massive entity with shield regeneration and drone swarm deployment</li>
                        <li><strong>Corrupted Monk</strong> - Fallen digital monk with corruption fields and meditation storms</li>
                    </ul>
                    <p>Boss encounters feature multiple phases with increasing difficulty and new abilities as their health decreases.</p>
                    <div class="tutorial-highlight">
                        <p><strong>Warning System:</strong> Bosses telegraph their powerful abilities with visual warnings. Use this time to prepare your defenses!</p>
                    </div>
                `
            },
            {
                title: "🏆 Achievements - Path of Progress",
                content: `
                    <p>Your journey as a cyber-monk is measured through achievements across five categories:</p>
                    <ul style="font-size: 1.1rem; line-height: 1.8;">
                        <li><strong>First Steps</strong> - Beginning your digital meditation journey</li>
                        <li><strong>Combat Mastery</strong> - Perfecting defensive techniques</li>
                        <li><strong>Strategic Genius</strong> - Advanced tactical achievements</li>
                        <li><strong>Progression</strong> - Advancing through levels and waves</li>
                        <li><strong>Hidden Secrets</strong> - Discovering hidden aspects of the digital realm</li>
                    </ul>
                    <p>Achievements provide long-term goals and unlock special recognition for your accomplishments.</p>
                    <div class="tutorial-highlight">
                        <p><strong>Mindfulness:</strong> Focus on the present moment rather than chasing achievements. They will come naturally through dedicated practice.</p>
                    </div>
                `
            },
            {
                title: "🌟 Begin Your Journey",
                content: `
                    <p>You are now ready to begin your path as a digital guardian. Remember these core principles:</p>
                    <ul style="font-size: 1.1rem; line-height: 1.8;">
                        <li><strong>Compassionate Protection</strong> - Defend without aggression</li>
                        <li><strong>Mindful Strategy</strong> - Think before you place each defense</li>
                        <li><strong>Resource Wisdom</strong> - Balance spending with patience</li>
                        <li><strong>Adaptive Learning</strong> - Each enemy teaches you something new</li>
                        <li><strong>Present Awareness</strong> - Stay focused on the current wave</li>
                    </ul>
                    <div class="tutorial-highlight">
                        <p><strong>Final Wisdom:</strong> "In the digital realm, as in life, compassionate protection guards against suffering. May your defenses be strong and your meditation deep." 🧘‍♂️✨</p>
                    </div>
                    <p style="text-align: center; margin-top: 30px;">
                        <strong>Click "Start Campaign" from the main menu to begin your first level!</strong>
                    </p>
                `
            }
        ];

        // Clear existing content and populate with steps
        if (this.tutorialStepsContainer) {
            this.tutorialStepsContainer.innerHTML = '';
            
            steps.forEach((step, index) => {
                const stepElement = document.createElement('div');
                stepElement.className = 'tutorial-step';
                stepElement.setAttribute('data-step', index + 1);
                if (index === 0) stepElement.classList.add('active');
                
                stepElement.innerHTML = `
                    <div class="step-content">
                        <h3>${step.title}</h3>
                        ${step.content}
                    </div>
                `;
                
                this.tutorialStepsContainer.appendChild(stepElement);
            });
        }
    }

    nextTutorialStep() {
        if (this.currentTutorialStep < this.totalTutorialSteps) {
            this.currentTutorialStep++;
            this.updateTutorialDisplay();
        }
    }

    previousTutorialStep() {
        if (this.currentTutorialStep > 1) {
            this.currentTutorialStep--;
            this.updateTutorialDisplay();
        }
    }

    updateTutorialDisplay() {
        // Update progress text
        if (this.tutorialProgress) {
            this.tutorialProgress.textContent = `${this.currentTutorialStep} / ${this.totalTutorialSteps}`;
        }
        
        // Update navigation buttons
        if (this.prevBtn) {
            this.prevBtn.disabled = this.currentTutorialStep === 1;
        }
        if (this.nextBtn) {
            this.nextBtn.disabled = this.currentTutorialStep === this.totalTutorialSteps;
        }
        
        // Show current step, hide others
        const steps = document.querySelectorAll('.tutorial-step');
        steps.forEach((step, index) => {
            if (index + 1 === this.currentTutorialStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
        
        console.log(`[ScreenManager] Tutorial step ${this.currentTutorialStep} displayed`);
    }

    initCreditsScreen() {
        // Setup credits content
        console.log('[ScreenManager] Credits screen initialized');
    }

    initLevelSelectScreen() {
        // Setup level selection
        this.loadLevelInfo();
        console.log('[ScreenManager] Level select screen initialized');
    }

    initVictoryScreen() {
        // Setup victory screen
        console.log('[ScreenManager] Victory screen initialized');
    }

    initDefeatScreen() {
        // Setup defeat screen
        console.log('[ScreenManager] Defeat screen initialized');
    }

    initUpgradeTreeScreen() {
        console.log('[ScreenManager] Upgrade tree modal initialized');
    }

    initBossWarningScreen() {
        console.log('[ScreenManager] Boss warning modal initialized');
    }

    initPauseMenuScreen() {
        console.log('[ScreenManager] Pause menu modal initialized');
    }

    // Game flow methods
    startNewGame() {
        console.log('[ScreenManager] startNewGame() called');
        this.triggerCallback('startNewGame');
        this.showScreen('game');
        console.log('[ScreenManager] Starting new game, switching to game screen');
    }

    continueGame() {
        this.triggerCallback('continueGame');
        this.showScreen('game');
        console.log('[ScreenManager] Continuing game, switching to game screen');
    }

    pauseGame() {
        this.triggerCallback('pauseGame');
        this.showModal('pause-menu');
    }

    resumeGame() {
        this.triggerCallback('resumeGame');
        this.closeModal('pause-menu');
    }

    returnToMenu() {
        this.triggerCallback('returnToMenu');
        this.closeAllModals();
        this.showScreen('main-menu');
    }

    // Helper methods
    updateContinueButton() {
        const continueBtn = document.getElementById('continue-game-btn');
        if (continueBtn && window.saveSystem) {
            const hasSave = window.saveSystem.getMostRecentSave() !== null;
            continueBtn.disabled = !hasSave;
            continueBtn.style.opacity = hasSave ? '1' : '0.5';
        }
    }

    setupGameHUD() {
        // Initialize game HUD elements
        const hudElements = [
            'dharma-display',
            'bandwidth-display', 
            'anonymity-display',
            'wave-display',
            'level-display'
        ];

        hudElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`[ScreenManager] HUD element not found: ${id}`);
            }
        });
    }

    loadAchievements() {
        const achievementManager = window.gameSystemManager?.getAchievementManager();
        if (achievementManager) {
            // Load achievement data and update display
            this.triggerCallback('loadAchievements', { achievementManager });
        }
    }

    setupSettingsControls() {
        // Setup audio volume sliders
        this.setupVolumeControls();
        
        // Setup other game settings
        this.setupGameplaySettings();
    }

    setupVolumeControls() {
        const sliders = [
            { id: 'master-volume', callback: 'setMasterVolume' },
            { id: 'music-volume', callback: 'setMusicVolume' },
            { id: 'sfx-volume', callback: 'setSfxVolume' }
        ];

        sliders.forEach(slider => {
            const element = document.getElementById(slider.id);
            if (element) {
                element.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    this.triggerCallback(slider.callback, { value });
                });
            }
        });
    }

    setupGameplaySettings() {
        const checkboxes = [
            { id: 'screen-flash-toggle', callback: 'setScreenFlash' },
            { id: 'reduce-motion-toggle', callback: 'setReduceMotion' }
        ];

        checkboxes.forEach(checkbox => {
            const element = document.getElementById(checkbox.id);
            if (element) {
                element.addEventListener('change', (e) => {
                    this.triggerCallback(checkbox.callback, { value: e.target.checked });
                });
            }
        });
    }

    loadSaveSlotInfo() {
        if (window.saveSystem) {
            const saveInfo = window.saveSystem.getAllSaveInfo();
            this.triggerCallback('loadSaveSlots', { saveInfo });
        }
    }

    loadLevelInfo() {
        // Load level selection data
        this.triggerCallback('loadLevelInfo');
    }

    // Callback system
    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, []);
        }
        this.callbacks.get(event).push(callback);
    }

    off(event, callback) {
        if (this.callbacks.has(event)) {
            const callbacks = this.callbacks.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    triggerCallback(event, data = {}) {
        if (this.callbacks.has(event)) {
            const callbacks = this.callbacks.get(event);
            for (const callback of callbacks) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[ScreenManager] Error in callback for ${event}:`, error);
                }
            }
        }
    }

    // Utility methods
    getCurrentScreen() {
        return this.currentScreen;
    }

    getPreviousScreen() {
        return this.previousScreen;
    }

    isModalOpen(modalName = null) {
        if (modalName) {
            return this.modalStack.includes(modalName);
        }
        return this.modalStack.length > 0;
    }

    getOpenModals() {
        return [...this.modalStack];
    }

    updateResourceDisplay(resources) {
        const displays = {
            dharma: 'dharma-display',
            bandwidth: 'bandwidth-display',
            anonymity: 'anonymity-display'
        };

        for (const [resource, elementId] of Object.entries(displays)) {
            const element = document.getElementById(elementId);
            if (element && resources[resource] !== undefined) {
                element.textContent = Utils.game.formatNumber(resources[resource]);
            }
        }
    }

    updateWaveDisplay(wave, totalWaves) {
        const element = document.getElementById('wave-display');
        if (element) {
            element.textContent = `Wave ${wave}/${totalWaves}`;
        }
    }

    updateLevelDisplay(level) {
        const element = document.getElementById('level-display');
        if (element) {
            element.textContent = `Level ${level}`;
        }
    }

    showBossWarning(bossData) {
        const modal = this.screens.get('boss-warning');
        if (modal) {
            // Update boss warning content
            const titleElement = modal.element.querySelector('.boss-title');
            const descElement = modal.element.querySelector('.boss-description');
            
            if (titleElement) titleElement.textContent = bossData.name || 'Boss Approaching';
            if (descElement) descElement.textContent = bossData.description || 'Prepare for battle!';
            
            this.showModal('boss-warning');
            
            // Auto-close after 3 seconds
            setTimeout(() => {
                this.closeModal('boss-warning');
            }, 3000);
        }
    }

    destroy() {
        // Clean up event listeners and references
        this.callbacks.clear();
        this.modalStack.length = 0;
        this.screens.clear();
    }
}

export default ScreenManager;