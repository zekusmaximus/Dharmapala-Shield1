/**
 * ErrorNotificationManager - Handles error notifications and critical error displays
 */
export default class ErrorNotificationManager {
    showError(error) {
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.innerHTML = `
            <div class="error-content">
                <strong>Initialization Error</strong>
                <p>${(error && error.message) ? error.message : 'An error occurred'}</p>
                <button id="error-reload-btn">Reload</button>
                <button id="error-dismiss-btn">Dismiss</button>
            </div>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(244, 67, 54, 0.9);
            color: white;
            padding: 16px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10001;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        document.body.appendChild(notification);
        const reload = () => window.location.reload();
        const dismiss = () => notification.remove();
        notification.querySelector('#error-reload-btn')?.addEventListener('click', reload);
        notification.querySelector('#error-dismiss-btn')?.addEventListener('click', dismiss);
        setTimeout(() => { if (notification.parentNode) notification.remove(); }, 10000);
    }

    /**
     * Shows a critical error screen that replaces the entire page
     * @param {Error} error - The critical error to display
     */
    showCriticalError(error) {
        console.error('[ErrorNotificationManager] Critical error - cannot show menu:', error);
        
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; 
                        background: linear-gradient(135deg, #1a1a2e, #16213e); color: #00d4ff; 
                        font-family: Arial, sans-serif; text-align: center;">
                <div style="max-width: 600px; padding: 40px;">
                    <h1 style="font-size: 2.5rem; margin-bottom: 20px; text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);">
                        Dharmapala Shield
                    </h1>
                    <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <h2 style="color: #ff6b6b; margin-bottom: 10px;">Critical Startup Error</h2>
                        <p style="font-size: 1.1rem; margin-bottom: 15px;">
                            ${error.message}
                        </p>
                        <p style="font-size: 0.9rem; opacity: 0.8;">
                            The game encountered a critical error during initialization and cannot continue.
                        </p>
                    </div>
                    <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="location.reload()" 
                                style="padding: 12px 24px; margin: 5px; background: #00d4ff; 
                                       color: #1a1a2e; border: none; border-radius: 8px; cursor: pointer;
                                       font-size: 1rem; font-weight: 500; transition: all 0.2s ease;
                                       box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);"
                                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0, 212, 255, 0.4)';"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0, 212, 255, 0.3)';">
                            🔄 Reload Game
                        </button>
                        <button onclick="window.open('https://github.com/zekusmaximus/Dharmapala-Shield1/issues', '_blank')" 
                                style="padding: 12px 24px; margin: 5px; background: rgba(255, 255, 255, 0.1); 
                                       color: #00d4ff; border: 2px solid #00d4ff; border-radius: 8px; cursor: pointer;
                                       font-size: 1rem; font-weight: 500; transition: all 0.2s ease;"
                                onmouseover="this.style.background='rgba(0, 212, 255, 0.1)'"
                                onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
                            🐛 Report Issue
                        </button>
                    </div>
                    <div style="margin-top: 30px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                        <h3 style="margin-bottom: 10px; font-size: 1.1rem;">Troubleshooting Tips:</h3>
                        <ul style="text-align: left; font-size: 0.9rem; opacity: 0.9;">
                            <li>Try refreshing the page (Ctrl+F5 or Cmd+Shift+R)</li>
                            <li>Clear your browser cache and cookies</li>
                            <li>Disable browser extensions temporarily</li>
                            <li>Try using an incognito/private browsing window</li>
                            <li>Check your internet connection</li>
                        </ul>
                    </div>
                    <p style="margin-top: 20px; font-size: 0.8rem; opacity: 0.6;">
                        Error ID: ${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Shows a warning notification (less severe than error)
     * @param {string} message - Warning message to display
     * @param {number} duration - Duration in milliseconds (default: 5000)
     */
    showWarningNotification(message, duration = 5000) {
        const notification = document.createElement('div');
        notification.className = 'warning-notification';
        notification.id = `warning-notification-${++this.notificationCount}`;
        notification.innerHTML = `
            <div class="warning-content">
                <strong>⚠️ Warning</strong>
                <p>${message}</p>
                <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: ${20 + (this.notificationCount - 1) * 80}px;
            right: 20px;
            background: rgba(255, 152, 0, 0.9);
            color: white;
            padding: 16px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: ${10001 + this.notificationCount};
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        // Style the button
        const button = notification.querySelector('button');
        if (button) {
            button.style.cssText = `
                margin-top: 5px;
                padding: 5px 10px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                transition: background 0.2s ease;
            `;
        }
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        
        // Auto-dismiss after specified duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);

        console.log('[ErrorNotificationManager] Warning notification displayed:', message);
    }

    /**
     * Shows a success notification
     * @param {string} message - Success message to display
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    showSuccessNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.id = `success-notification-${++this.notificationCount}`;
        notification.innerHTML = `
            <div class="success-content">
                <strong>✅ Success</strong>
                <p>${message}</p>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: ${20 + (this.notificationCount - 1) * 80}px;
            right: 20px;
            background: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 16px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: ${10001 + this.notificationCount};
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        
        // Auto-dismiss after specified duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);

        console.log('[ErrorNotificationManager] Success notification displayed:', message);
    }

    /**
     * Clears all notifications
     */
    clearAllNotifications() {
        const notifications = document.querySelectorAll('.error-notification, .warning-notification, .success-notification');
        notifications.forEach(notification => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        });
        this.notificationCount = 0;
        console.log('[ErrorNotificationManager] All notifications cleared');
    }
}
