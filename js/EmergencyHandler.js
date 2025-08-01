/**
 * EmergencyHandler - Handles emergency fallback scenarios and troubleshooting
 */
class EmergencyHandler {
    constructor(devicePerformance, timeoutConfig) {
        this.devicePerformance = devicePerformance;
        this.timeoutConfig = timeoutConfig;
        this.collectedErrors = [];
    }

    /**
     * Triggers emergency fallback with notification and logging
     * @param {string} reason - Reason for emergency fallback
     * @param {Function} ensureMenuVisibleCallback - Callback to show menu
     */
    triggerEmergencyFallback(reason, ensureMenuVisibleCallback) {
        console.warn(`[EmergencyHandler] Emergency fallback triggered: ${reason}`);
        
        // Show emergency notification first
        this.showEmergencyNotification(reason);
        
        // Then ensure menu is visible
        if (ensureMenuVisibleCallback) {
            ensureMenuVisibleCallback(reason);
        }
        
        // Log detailed information for debugging
        this.logEmergencyDetails(reason);
    }

    /**
     * Shows emergency notification with enhanced visual prominence
     * @param {string} reason - Reason for emergency
     */
    showEmergencyNotification(reason) {
        // Remove any existing emergency notifications
        const existingNotification = document.getElementById('emergency-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'emergency-notification';
        notification.className = 'emergency-notification';
        notification.innerHTML = `
            <div class="emergency-content">
                <div class="emergency-header">
                    <span class="emergency-icon">⚠️</span>
                    <strong>Emergency Mode Activated</strong>
                </div>
                <div class="emergency-message">
                    <p>The game took longer than expected to load. We've activated emergency mode to ensure you can still play.</p>
                    <p class="emergency-reason">Reason: ${this.getEmergencyReason(reason)}</p>
                </div>
                <div class="emergency-actions">
                    <button onclick="location.reload()" class="emergency-btn emergency-btn-primary">
                        🔄 Reload Game
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="emergency-btn emergency-btn-secondary">
                        ✓ Continue Anyway
                    </button>
                    <button onclick="window.GameBootstrap?.showTroubleshootingInfo?.()" class="emergency-btn emergency-btn-info">
                        🔧 Troubleshooting
                    </button>
                </div>
                <div class="emergency-footer">
                    <small>This notification will auto-dismiss in 15 seconds</small>
                </div>
            </div>
        `;

        // Style the notification with enhanced visual prominence
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            padding: 20px;
            border-radius: 12px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10002;
            max-width: 500px;
            min-width: 400px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            border: 2px solid rgba(255, 255, 255, 0.2);
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
            transition: all 0.4s ease;
        `;

        this.styleEmergencyNotificationComponents(notification);
        document.body.appendChild(notification);

        // Animate in with prominence
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
        });

        // Auto-dismiss after 15 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(-50%) translateY(-20px)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 400);
            }
        }, 15000);

        console.log('[EmergencyHandler] Emergency notification displayed');
    }

    /**
     * Styles the emergency notification components
     * @param {HTMLElement} notification - The notification element
     */
    styleEmergencyNotificationComponents(notification) {
        const header = notification.querySelector('.emergency-header');
        if (header) {
            header.style.cssText = `
                display: flex;
                align-items: center;
                margin-bottom: 12px;
                font-size: 16px;
            `;
        }

        const icon = notification.querySelector('.emergency-icon');
        if (icon) {
            icon.style.cssText = `
                font-size: 20px;
                margin-right: 8px;
                animation: pulse 2s infinite;
            `;
        }

        const message = notification.querySelector('.emergency-message');
        if (message) {
            message.style.cssText = `
                margin-bottom: 16px;
                line-height: 1.4;
            `;
        }

        const reason = notification.querySelector('.emergency-reason');
        if (reason) {
            reason.style.cssText = `
                font-style: italic;
                opacity: 0.9;
                margin-top: 8px;
                font-size: 12px;
            `;
        }

        const actions = notification.querySelector('.emergency-actions');
        if (actions) {
            actions.style.cssText = `
                display: flex;
                gap: 10px;
                margin-bottom: 12px;
                flex-wrap: wrap;
            `;
        }

        const buttons = notification.querySelectorAll('.emergency-btn');
        buttons.forEach((btn, index) => {
            btn.style.cssText = `
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.2s ease;
                flex: 1;
                min-width: 120px;
            `;

            if (btn.classList.contains('emergency-btn-primary')) {
                btn.style.cssText += `
                    background: rgba(255, 255, 255, 0.9);
                    color: #333;
                `;
            } else if (btn.classList.contains('emergency-btn-secondary')) {
                btn.style.cssText += `
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                `;
            } else if (btn.classList.contains('emergency-btn-info')) {
                btn.style.cssText += `
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                `;
            }
        });

        const footer = notification.querySelector('.emergency-footer');
        if (footer) {
            footer.style.cssText = `
                text-align: center;
                opacity: 0.7;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                padding-top: 8px;
            `;
        }
    }

    /**
     * Gets human-readable emergency reason
     * @param {string} reason - Technical reason
     * @returns {string} Human-readable reason
     */
    getEmergencyReason(reason) {
        const reasonMap = {
            'Adaptive timeout fallback triggered': 'Initialization took longer than expected for your device',
            'Error fallback': 'An error occurred during startup',
            'Global error fallback': 'A system error was detected',
            'Promise rejection fallback': 'A component failed to load properly'
        };
        
        return reasonMap[reason] || 'Unknown initialization issue';
    }

    /**
     * Logs detailed emergency information
     * @param {string} reason - Reason for emergency
     */
    logEmergencyDetails(reason) {
        const details = {
            timestamp: new Date().toISOString(),
            reason: reason,
            userAgent: navigator.userAgent,
            devicePerformance: this.devicePerformance,
            timeoutConfig: this.timeoutConfig,
            screenSize: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            loadedScripts: Array.from(document.scripts).map(s => s.src).filter(Boolean),
            errors: this.collectedErrors || []
        };

        console.group('[EmergencyHandler] Emergency Fallback Details');
        console.log('Reason:', reason);
        console.log('Device Performance:', this.devicePerformance);
        console.log('Timeout Config:', this.timeoutConfig);
        console.log('Full Details:', details);
        console.groupEnd();

        // Store for potential error reporting
        window.emergencyDetails = details;
    }

    /**
     * Shows troubleshooting information modal
     * @param {Function} calculateFallbackTimeoutCallback - Callback to get timeout value
     */
    showTroubleshootingInfo(calculateFallbackTimeoutCallback) {
        const troubleshootingModal = document.createElement('div');
        troubleshootingModal.id = 'troubleshooting-modal';
        troubleshootingModal.innerHTML = `
            <div class="troubleshooting-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="troubleshooting-content">
                <div class="troubleshooting-header">
                    <h3>🔧 Troubleshooting Guide</h3>
                    <button onclick="this.parentElement.parentElement.remove()" class="close-btn">×</button>
                </div>
                <div class="troubleshooting-body">
                    <div class="troubleshooting-section">
                        <h4>Quick Fixes:</h4>
                        <ul>
                            <li>Refresh the page (Ctrl+F5 or Cmd+Shift+R)</li>
                            <li>Clear browser cache and reload</li>
                            <li>Disable browser extensions temporarily</li>
                            <li>Try an incognito/private browsing window</li>
                        </ul>
                    </div>
                    <div class="troubleshooting-section">
                        <h4>System Information:</h4>
                        <div class="system-info">
                            <p><strong>Performance Score:</strong> ${this.devicePerformance.score.toFixed(2)}/2.0</p>
                            <p><strong>CPU Cores:</strong> ${this.devicePerformance.factors.cores || 'Unknown'}</p>
                            <p><strong>Memory:</strong> ${this.devicePerformance.factors.memory || 'Unknown'} GB</p>
                            <p><strong>Connection:</strong> ${this.devicePerformance.factors.connection || 'Unknown'}</p>
                            <p><strong>Timeout Used:</strong> ${calculateFallbackTimeoutCallback ? calculateFallbackTimeoutCallback() : 'Unknown'}ms</p>
                        </div>
                    </div>
                    <div class="troubleshooting-section">
                        <h4>If problems persist:</h4>
                        <p>The game should still be playable in emergency mode. Some features may load in the background.</p>
                    </div>
                </div>
                <div class="troubleshooting-footer">
                    <button onclick="location.reload()" class="troubleshooting-btn">🔄 Reload Game</button>
                    <button onclick="this.parentElement.parentElement.remove()" class="troubleshooting-btn">✓ Continue Playing</button>
                </div>
            </div>
        `;

        this.styleTroubleshootingModal(troubleshootingModal);
        document.body.appendChild(troubleshootingModal);
    }

    /**
     * Styles the troubleshooting modal
     * @param {HTMLElement} troubleshootingModal - The modal element
     */
    styleTroubleshootingModal(troubleshootingModal) {
        troubleshootingModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10003;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const backdrop = troubleshootingModal.querySelector('.troubleshooting-backdrop');
        if (backdrop) {
            backdrop.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                cursor: pointer;
            `;
        }

        const content = troubleshootingModal.querySelector('.troubleshooting-content');
        if (content) {
            content.style.cssText = `
                background: white;
                border-radius: 12px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                position: relative;
                margin: 20px;
            `;
        }

        const header = troubleshootingModal.querySelector('.troubleshooting-header');
        if (header) {
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 20px 0 20px;
                border-bottom: 1px solid #eee;
            `;
        }

        const closeBtn = troubleshootingModal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
            `;
        }

        const body = troubleshootingModal.querySelector('.troubleshooting-body');
        if (body) {
            body.style.cssText = `
                padding: 20px;
            `;
        }

        const sections = troubleshootingModal.querySelectorAll('.troubleshooting-section');
        sections.forEach(section => {
            section.style.cssText = `
                margin-bottom: 20px;
            `;
        });

        const systemInfo = troubleshootingModal.querySelector('.system-info');
        if (systemInfo) {
            systemInfo.style.cssText = `
                background: #f5f5f5;
                padding: 10px;
                border-radius: 6px;
                font-family: monospace;
                font-size: 12px;
            `;
        }

        const footer = troubleshootingModal.querySelector('.troubleshooting-footer');
        if (footer) {
            footer.style.cssText = `
                padding: 20px;
                border-top: 1px solid #eee;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            `;
        }

        const troubleshootingBtns = troubleshootingModal.querySelectorAll('.troubleshooting-btn');
        troubleshootingBtns.forEach(btn => {
            btn.style.cssText = `
                padding: 10px 20px;
                border: 1px solid #ddd;
                border-radius: 6px;
                cursor: pointer;
                background: #f8f8f8;
                transition: background 0.2s ease;
            `;
        });
    }

    /**
     * Adds an error to the collected errors list
     * @param {Error} error - Error to collect
     */
    collectError(error) {
        this.collectedErrors.push({
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
}
