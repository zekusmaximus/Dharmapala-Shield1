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
        this.addClickListener('credits-btn', () => this.showScreen('credits'));

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
            element.addEventListener('click', handler);
        }
    }

    showScreen(screenName, options = {}) {
        if (!this.screens.has(screenName)) {
            console.warn(`[ScreenManager] Unknown screen: ${screenName}`);
            return false;
        }

        const screen = this.screens.get(screenName);
        
        // Handle modal screens differently
        if (screen.isModal) {
            return this.showModal(screenName, options);
        }

        // Hide ALL screens first
        this.screens.forEach((screenObj, name) => {
            if (!screenObj.isModal && screenObj.element) {
                screenObj.element.style.display = 'none';
                screenObj.element.classList.remove('active');
                console.log(`[ScreenManager] Hiding screen: ${name}`);
            }
        });

        // Initialize screen if needed
        if (!screen.initialized) {
            screen.init();
            screen.initialized = true;
        }

        // Show new screen
        const displayValue = screenName === 'game' ? 'flex' : 'flex';
        screen.element.style.display = displayValue;
        screen.element.classList.add('active');
        console.log(`[ScreenManager] Showing screen: ${screenName}`);
        
        // Update state
        this.previousScreen = this.currentScreen;
        this.currentScreen = screenName;

        // Trigger callbacks
        this.triggerCallback('screenChanged', {
            from: this.previousScreen,
            to: screenName,
            options
        });

        console.log(`[ScreenManager] Switched to screen: ${screenName}`);
        return true;
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

        // Remove from modal stack
        const index = this.modalStack.indexOf(modalName);
        if (index > -1) {
            this.modalStack.splice(index, 1);
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
        // Setup tutorial content
        console.log('[ScreenManager] Tutorial screen initialized');
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

    // Game flow methods
    startNewGame() {
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScreenManager;
} else {
    window.ScreenManager = ScreenManager;
}