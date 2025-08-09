class MobileManager {
    constructor() {
        this.isMobile = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.lastTouchEnd = 0;
        
        // Touch gestures
        this.tapThreshold = 300; // ms for tap vs hold
        this.swipeThreshold = 50; // pixels for swipe detection
        this.doubleTapThreshold = 300; // ms between taps
        
        // Mobile-specific state
        this.isLandscape = false;
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.orientationLocked = false;
        
        // Touch controls
        this.touchControlsEnabled = false;
        this.virtualJoystick = null;
        this.actionButtons = new Map();
        
        // Performance optimization for mobile
        this.isLowPowerMode = false;
        this.reducedQuality = false;

        // Bind handlers so they can be removed properly
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleTouchCancel = this.handleTouchCancel.bind(this);
        this.preventDefaultTouch = this.preventDefaultTouch.bind(this);
        this.preventDoubleClick = this.preventDoubleClick.bind(this);
        this.handleOrientationChange = this.handleOrientationChange.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleWindowBlur = this.handleWindowBlur.bind(this);
        this.handleWindowFocus = this.handleWindowFocus.bind(this);

        this.detectMobile();
        this.initializeEventListeners();
        this.setupOrientationHandling();
        this.createTouchControls();
    }

    detectMobile() {
        // Detect mobile device
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        this.isMobile = (
            /android/i.test(userAgent) ||
            /iPad|iPhone|iPod/.test(userAgent) ||
            /windows phone/i.test(userAgent) ||
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0)
        );
        
        // Check for tablet
        this.isTablet = this.isMobile && (
            window.innerWidth >= 768 ||
            /iPad/.test(userAgent)
        );
        
        // Detect iOS
        this.isIOS = /iPad|iPhone|iPod/.test(userAgent);
        
        // Detect Android
        this.isAndroid = /android/i.test(userAgent);
        
        console.log(`[MobileManager] Device detected: ${this.isMobile ? 'Mobile' : 'Desktop'}`);
        
        if (this.isMobile) {
            document.body.classList.add('mobile-device');
            if (this.isTablet) {
                document.body.classList.add('tablet-device');
            }
        }
    }

    initializeEventListeners() {
        if (!this.isMobile) return;
        
        // Touch events
        document.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        document.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });

        // Prevent default touch behaviors
        document.addEventListener('touchstart', this.preventDefaultTouch, { passive: false });
        document.addEventListener('touchmove', this.preventDefaultTouch, { passive: false });

        // Prevent zoom on double tap
        document.addEventListener('dblclick', this.preventDoubleClick);

        // Handle device orientation changes
        window.addEventListener('orientationchange', this.handleOrientationChange);
        window.addEventListener('resize', this.handleResize);

        // Handle visibility changes (app backgrounding)
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        // Handle focus/blur for pause on background
        window.addEventListener('blur', this.handleWindowBlur);
        window.addEventListener('focus', this.handleWindowFocus);
    }

    preventDefaultTouch(event) {
        // Prevent scrolling, zooming, and other default touch behaviors
        if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
            event.preventDefault();
        }
    }

    preventDoubleClick(e) {
        e.preventDefault();
    }

    handleTouchStart(event) {
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();
        
        // Handle touch controls if enabled
        if (this.touchControlsEnabled) {
            this.handleTouchControlStart(touch);
        }
        
        // Send touch event to game input system
        if (window.inputManager) {
            window.inputManager.handleTouch('start', {
                x: touch.clientX,
                y: touch.clientY,
                identifier: touch.identifier
            });
        }
    }

    handleTouchMove(event) {
        const touch = event.touches[0];
        
        // Handle touch controls if enabled
        if (this.touchControlsEnabled) {
            this.handleTouchControlMove(touch);
        }
        
        // Send touch event to game input system
        if (window.inputManager) {
            window.inputManager.handleTouch('move', {
                x: touch.clientX,
                y: touch.clientY,
                identifier: touch.identifier
            });
        }
    }

    handleTouchEnd(event) {
        const now = Date.now();
        const touchDuration = now - this.touchStartTime;
        const touch = event.changedTouches[0];
        
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Detect gesture type
        if (touchDuration < this.tapThreshold && distance < this.swipeThreshold) {
            // Tap gesture
            this.handleTap(touch, now);
        } else if (distance >= this.swipeThreshold) {
            // Swipe gesture
            this.handleSwipe(deltaX, deltaY, touchDuration);
        } else {
            // Hold gesture
            this.handleHold(touch, touchDuration);
        }
        
        // Handle touch controls if enabled
        if (this.touchControlsEnabled) {
            this.handleTouchControlEnd(touch);
        }
        
        // Send touch event to game input system
        if (window.inputManager) {
            window.inputManager.handleTouch('end', {
                x: touch.clientX,
                y: touch.clientY,
                identifier: touch.identifier
            });
        }
    }

    handleTouchCancel(event) {
        // Handle touch controls if enabled
        if (this.touchControlsEnabled) {
            this.resetTouchControls();
        }
        
        // Send touch event to game input system
        if (window.inputManager) {
            const touch = event.changedTouches[0];
            window.inputManager.handleTouch('cancel', {
                x: touch.clientX,
                y: touch.clientY,
                identifier: touch.identifier
            });
        }
    }

    handleTap(touch, timestamp) {
        // Check for double tap
        const timeSinceLastTap = timestamp - this.lastTouchEnd;
        if (timeSinceLastTap < this.doubleTapThreshold) {
            this.handleDoubleTap(touch);
        } else {
            this.handleSingleTap(touch);
        }
        
        this.lastTouchEnd = timestamp;
    }

    handleSingleTap(touch) {
        console.log('[MobileManager] Single tap detected');
        
        // Convert screen coordinates to game coordinates
        if (window.camera && window.game) {
            const gameCoords = window.camera.screenToWorld(touch.clientX, touch.clientY);
            
            // Send tap event to game
            if (window.game.handleMobileTap) {
                window.game.handleMobileTap(gameCoords.x, gameCoords.y);
            }
        }
    }

    handleDoubleTap(touch) {
        console.log('[MobileManager] Double tap detected');
        
        // Convert screen coordinates to game coordinates
        if (window.camera && window.game) {
            const gameCoords = window.camera.screenToWorld(touch.clientX, touch.clientY);
            
            // Send double tap event to game
            if (window.game.handleMobileDoubleTap) {
                window.game.handleMobileDoubleTap(gameCoords.x, gameCoords.y);
            }
        }
    }

    handleSwipe(deltaX, deltaY, duration) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        let direction;
        if (absX > absY) {
            direction = deltaX > 0 ? 'right' : 'left';
        } else {
            direction = deltaY > 0 ? 'down' : 'up';
        }
        
        console.log(`[MobileManager] Swipe ${direction} detected`);
        
        // Send swipe event to game
        if (window.game && window.game.handleMobileSwipe) {
            window.game.handleMobileSwipe(direction, { deltaX, deltaY, duration });
        }
    }

    handleHold(touch, duration) {
        console.log(`[MobileManager] Hold detected (${duration}ms)`);
        
        // Convert screen coordinates to game coordinates
        if (window.camera && window.game) {
            const gameCoords = window.camera.screenToWorld(touch.clientX, touch.clientY);
            
            // Send hold event to game
            if (window.game.handleMobileHold) {
                window.game.handleMobileHold(gameCoords.x, gameCoords.y, duration);
            }
        }
    }

    setupOrientationHandling() {
        if (!this.isMobile) return;
        
        this.updateOrientation();
        
        // Lock to landscape for better gaming experience
        if (screen.orientation && screen.orientation.lock) {
            this.lockOrientation('landscape');
        }
    }

    updateOrientation() {
        this.isLandscape = window.innerWidth > window.innerHeight;
        
        if (this.isLandscape) {
            document.body.classList.add('landscape');
            document.body.classList.remove('portrait');
        } else {
            document.body.classList.add('portrait');
            document.body.classList.remove('landscape');
        }
        
        console.log(`[MobileManager] Orientation: ${this.isLandscape ? 'Landscape' : 'Portrait'}`);
    }

    lockOrientation(orientation) {
        if (!screen.orientation || !screen.orientation.lock) return;
        
        try {
            screen.orientation.lock(orientation).then(() => {
                this.orientationLocked = true;
                console.log(`[MobileManager] Orientation locked to ${orientation}`);
            }).catch(err => {
                console.warn('[MobileManager] Failed to lock orientation:', err);
            });
        } catch (error) {
            console.warn('[MobileManager] Orientation lock not supported:', error);
        }
    }

    handleOrientationChange() {
        setTimeout(() => {
            this.updateOrientation();
            this.resizeTouchControls();
            
            // Notify game of orientation change
            if (window.game && window.game.handleOrientationChange) {
                window.game.handleOrientationChange(this.isLandscape);
            }
        }, 500); // Delay to ensure dimensions are updated
    }

    handleResize() {
        this.updateOrientation();
        this.resizeTouchControls();
        
        // Update canvas size if needed
        if (window.game && window.game.handleResize) {
            window.game.handleResize();
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // App went to background
            this.handleAppBackground();
        } else {
            // App came to foreground
            this.handleAppForeground();
        }
    }

    handleWindowBlur() {
        this.handleAppBackground();
    }

    handleWindowFocus() {
        this.handleAppForeground();
    }

    handleAppBackground() {
        console.log('[MobileManager] App backgrounded');
        
        // Pause game
        if (window.game && window.game.pause) {
            window.game.pause();
        }
        
        // Reduce frame rate or pause rendering
        this.isLowPowerMode = true;
    }

    handleAppForeground() {
        console.log('[MobileManager] App foregrounded');
        
        // Resume normal operation
        this.isLowPowerMode = false;
        
        // Don't auto-resume game, let user decide
    }

    createTouchControls() {
        if (!this.isMobile) return;
        
        // Create touch controls container
        const controlsContainer = document.createElement('div');
        controlsContainer.id = 'touch-controls';
        controlsContainer.className = 'touch-controls-container';
        document.body.appendChild(controlsContainer);
        
        // Create action buttons
        this.createActionButton('pause', '⏸️', 'top-right');
        this.createActionButton('menu', '☰', 'top-left');
        this.createActionButton('upgrade', '⚡', 'bottom-right');
        this.createActionButton('sell', '🗑️', 'bottom-left');
        
        this.touchControlsEnabled = true;
    }

    createActionButton(id, icon, position) {
        const button = document.createElement('div');
        button.id = `touch-${id}`;
        button.className = `touch-button ${position}`;
        button.innerHTML = icon;
        button.setAttribute('data-action', id);
        
        // Add touch event listeners
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            button.classList.add('pressed');
            this.handleActionButton(id, 'start');
        });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            button.classList.remove('pressed');
            this.handleActionButton(id, 'end');
        });
        
        document.getElementById('touch-controls').appendChild(button);
        this.actionButtons.set(id, button);
    }

    handleActionButton(action, event) {
        if (!window.game) return;
        
        switch (action) {
            case 'pause':
                if (event === 'end') {
                    window.game.togglePause();
                }
                break;
            case 'menu':
                if (event === 'end') {
                    window.game.showMainMenu();
                }
                break;
            case 'upgrade':
                if (event === 'start') {
                    window.game.setMobileMode('upgrade');
                }
                break;
            case 'sell':
                if (event === 'start') {
                    window.game.setMobileMode('sell');
                }
                break;
        }
    }

    handleTouchControlStart(touch) {
        // Check if touch is on virtual joystick or action button
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.classList.contains('touch-button')) {
            return; // Let button handler deal with it
        }
    }

    handleTouchControlMove(touch) {
        // Handle virtual joystick movement if implemented
    }

    handleTouchControlEnd(touch) {
        // Reset any active touch controls
    }

    resetTouchControls() {
        // Reset all touch control states
        this.actionButtons.forEach(button => {
            button.classList.remove('pressed');
        });
    }

    resizeTouchControls() {
        if (!this.touchControlsEnabled) return;
        
        // Adjust touch control sizes based on screen size
        const scale = Math.min(window.innerWidth / 800, window.innerHeight / 600);
        const controlsContainer = document.getElementById('touch-controls');
        
        if (controlsContainer) {
            controlsContainer.style.transform = `scale(${Math.max(0.8, scale)})`;
        }
    }

    showTouchControls() {
        const controlsContainer = document.getElementById('touch-controls');
        if (controlsContainer) {
            controlsContainer.style.display = 'block';
        }
    }

    hideTouchControls() {
        const controlsContainer = document.getElementById('touch-controls');
        if (controlsContainer) {
            controlsContainer.style.display = 'none';
        }
    }

    // Performance optimization methods
    enableLowQualityMode() {
        this.reducedQuality = true;
        document.body.classList.add('low-quality-mode');
        
        // Notify game to reduce visual effects
        if (window.game && window.game.setQualityMode) {
            window.game.setQualityMode('low');
        }
    }

    disableLowQualityMode() {
        this.reducedQuality = false;
        document.body.classList.remove('low-quality-mode');
        
        // Notify game to restore visual effects
        if (window.game && window.game.setQualityMode) {
            window.game.setQualityMode('normal');
        }
    }

    // Haptic feedback (if supported)
    vibrate(pattern = 50) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    // Utility methods
    getScreenSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: this.devicePixelRatio
        };
    }

    isLowEndDevice() {
        // Simple heuristic to detect low-end devices
        return (
            navigator.hardwareConcurrency <= 2 ||
            navigator.deviceMemory <= 2 ||
            this.devicePixelRatio < 2
        );
    }

    getOptimalSettings() {
        const isLowEnd = this.isLowEndDevice();
        
        return {
            particleCount: isLowEnd ? 'low' : 'normal',
            shadowQuality: isLowEnd ? 'off' : 'normal',
            animationFrameRate: isLowEnd ? 30 : 60,
            audioChannels: isLowEnd ? 4 : 8
        };
    }

    destroy() {
        // Remove event listeners
        document.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('touchcancel', this.handleTouchCancel);
        document.removeEventListener('touchstart', this.preventDefaultTouch);
        document.removeEventListener('touchmove', this.preventDefaultTouch);
        document.removeEventListener('dblclick', this.preventDoubleClick);
        window.removeEventListener('orientationchange', this.handleOrientationChange);
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('blur', this.handleWindowBlur);
        window.removeEventListener('focus', this.handleWindowFocus);
        
        // Remove touch controls
        const controlsContainer = document.getElementById('touch-controls');
        if (controlsContainer) {
            controlsContainer.remove();
        }
        
        console.log('[MobileManager] Destroyed');
    }
}

// Auto-initialize if on mobile device
if (typeof window !== 'undefined') {
    window.mobileManager = new MobileManager();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileManager;
} else {
    window.MobileManager = MobileManager;
}