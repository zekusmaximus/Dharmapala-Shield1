/**
 * Emergency Fallback System for Dharmapala Shield
 * Provides basic menu functionality when main initialization fails
 */

class EmergencyFallback {
    constructor() {
        this.initialized = false;
        this.menuButtons = new Map();
        this.currentScreen = 'loading';
    }

    init() {
        if (this.initialized) return;
        
        console.log('[EmergencyFallback] Initializing emergency fallback system');
        
        // Check if main system has failed - standardized 2s timeout
        setTimeout(() => {
            this.checkSystemStatus();
        }, 2000);
        
        this.setupBasicNavigation();
        this.initialized = true;
    }

    checkSystemStatus() {
        // Check if main system is handling initialization
        if (window.gameBootstrap && window.gameBootstrap.isInitializing) {
            console.log('[EmergencyFallback] Main system is actively initializing, skipping emergency check');
            return;
        }
        
        const loadingScreen = document.getElementById('loading-screen');
        const isStillLoading = loadingScreen && 
            (loadingScreen.style.display !== 'none' || loadingScreen.classList.contains('active'));
        
        if (isStillLoading) {
            console.log('[EmergencyFallback] Main system appears to have failed, activating fallback');
            this.activateEmergencyMode();
        }
    }

    activateEmergencyMode() {
        // Force show main menu
        this.forceShowMainMenu();
        
        // Setup basic button functionality
        this.setupBasicButtonHandlers();
        
        // Show status message
        this.showEmergencyStatus();
    }

    forceShowMainMenu() {
        console.log('[EmergencyFallback] Forcing main menu display');
        
        // Hide all screens
        const allScreens = document.querySelectorAll('.screen');
        allScreens.forEach(screen => {
            screen.style.display = 'none';
            screen.classList.remove('active');
        });
        
        // Hide loading screen specifically
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
            loadingScreen.classList.remove('active');
        }
        
        // Show main menu
        const mainMenuScreen = document.getElementById('main-menu-screen');
        if (mainMenuScreen) {
            mainMenuScreen.style.display = 'flex';
            mainMenuScreen.classList.add('active');
            this.currentScreen = 'main-menu';
            
            // Apply overflow management for emergency menu
            document.body.style.overflow = 'auto';
            
            console.log('[EmergencyFallback] Main menu displayed with overflow management');
        } else {
            console.error('[EmergencyFallback] Main menu screen not found!');
        }
    }

    setupBasicNavigation() {
        // Setup basic screen navigation without complex systems
        this.menuButtons.set('start-game-btn', () => this.showNotAvailable('Game'));
        this.menuButtons.set('continue-game-btn', () => this.showNotAvailable('Continue'));
        this.menuButtons.set('levelSelectBtn', () => this.showBasicScreen('levelSelectScreen'));
        this.menuButtons.set('save-load-btn', () => this.showBasicScreen('save-load-screen'));
        this.menuButtons.set('tutorialBtn', () => this.showBasicScreen('tutorialScreen'));
        this.menuButtons.set('achievements-btn', () => this.showBasicScreen('achievement-gallery-screen'));
        this.menuButtons.set('settings-btn', () => this.showBasicScreen('settings-screen'));
        this.menuButtons.set('creditsBtn', () => this.showBasicScreen('creditsScreen'));
    }

    setupBasicButtonHandlers() {
        this.menuButtons.forEach((handler, buttonId) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', handler);
                console.log(`[EmergencyFallback] Handler attached for ${buttonId}`);
            }
        });

        // Setup back buttons
        this.setupBackButtons();
    }

    setupBackButtons() {
        const backButtons = [
            'back-from-achievements',
            'back-from-settings', 
            'back-from-save-load',
            'backFromTutorialBtn',
            'backFromCreditsBtn',
            'backFromLevelSelectBtn'
        ];

        backButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => this.showMainMenu());
            }
        });
    }

    showBasicScreen(screenId) {
        console.log(`[EmergencyFallback] Showing basic screen: ${screenId}`);
        
        // Hide all screens
        const allScreens = document.querySelectorAll('.screen');
        allScreens.forEach(screen => {
            screen.style.display = 'none';
            screen.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.style.display = 'flex';
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
        } else {
            console.warn(`[EmergencyFallback] Screen ${screenId} not found`);
            this.showMainMenu();
        }
    }

    showMainMenu() {
        this.forceShowMainMenu();
    }

    showNotAvailable(feature) {
        alert(`${feature} is not available in emergency mode. Please reload the page to try again.`);
    }

    showEmergencyStatus() {
        // Create emergency status indicator
        const statusDiv = document.createElement('div');
        statusDiv.id = 'emergency-status';
        statusDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(255, 165, 0, 0.9);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            cursor: pointer;
        `;
        statusDiv.innerHTML = `
            ⚠️ Emergency Mode<br>
            <small>Click to reload</small>
        `;
        
        statusDiv.addEventListener('click', () => {
            if (confirm('Reload the page to try normal initialization?')) {
                window.location.reload();
            }
        });
        
        document.body.appendChild(statusDiv);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.style.opacity = '0.3';
            }
        }, 10000);
    }
}

// Auto-initialize emergency fallback
document.addEventListener('DOMContentLoaded', () => {
    window.emergencyFallback = new EmergencyFallback();
    window.emergencyFallback.init();
});

// Export for global access
window.EmergencyFallback = EmergencyFallback;
