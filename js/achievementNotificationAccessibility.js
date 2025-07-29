/**
 * Achievement Notification Accessibility Manager
 * Provides comprehensive accessibility features for achievement notifications
 * 
 * Features:
 * 1) ARIA labels and roles for toast notifications
 * 2) Screen reader announcements for achievement unlocks
 * 3) Keyboard navigation support for interactive toast elements
 * 4) Respect for user preferences (reduced motion, high contrast)
 */

class AchievementNotificationAccessibility {
    constructor(game, achievementManager) {
        this.game = game;
        this.achievementManager = achievementManager;
        this.screenReaderAnnouncer = null;
        this.toastQueue = [];
        this.activeToasts = new Map();
        this.focusableToasts = [];
        this.currentToastIndex = -1;
        
        // User preferences
        this.userPreferences = {
            reducedMotion: false,
            highContrast: false,
            screenReaderEnabled: false,
            keyboardNavigation: true,
            announceAchievements: true
        };
        
        this.initialize();
    }
    
    initialize() {
        console.log('[AchievementNotificationAccessibility] Initializing accessibility system...');
        
        try {
            // Create screen reader announcer
            this.createScreenReaderAnnouncer();
            
            // Detect user preferences
            this.detectUserPreferences();
            
            // Set up keyboard navigation
            this.setupKeyboardNavigation();
            
            // Listen for achievement events
            this.setupAchievementListeners();
            
            // Monitor preference changes
            this.monitorPreferenceChanges();
            
            // Create toast container with accessibility attributes
            this.createAccessibleToastContainer();
            
            console.log('[AchievementNotificationAccessibility] Accessibility system initialized successfully');
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to initialize:', error);
        }
    }
    
    createScreenReaderAnnouncer() {
        try {
            // Create primary live region for urgent announcements
            this.screenReaderAnnouncer = document.createElement('div');
            this.screenReaderAnnouncer.id = 'achievement-announcer';
            this.screenReaderAnnouncer.setAttribute('aria-live', 'assertive');
            this.screenReaderAnnouncer.setAttribute('aria-atomic', 'true');
            this.screenReaderAnnouncer.setAttribute('role', 'status');
            this.screenReaderAnnouncer.setAttribute('aria-label', 'Achievement notifications');
            this.screenReaderAnnouncer.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
            `;
            
            // Create secondary live region for detailed information
            this.detailedAnnouncer = document.createElement('div');
            this.detailedAnnouncer.id = 'achievement-detailed-announcer';
            this.detailedAnnouncer.setAttribute('aria-live', 'polite');
            this.detailedAnnouncer.setAttribute('aria-atomic', 'false');
            this.detailedAnnouncer.setAttribute('role', 'log');
            this.detailedAnnouncer.setAttribute('aria-label', 'Achievement details and rewards');
            this.detailedAnnouncer.style.cssText = this.screenReaderAnnouncer.style.cssText;
            
            // Create status live region for system messages
            this.statusAnnouncer = document.createElement('div');
            this.statusAnnouncer.id = 'achievement-status-announcer';
            this.statusAnnouncer.setAttribute('aria-live', 'polite');
            this.statusAnnouncer.setAttribute('aria-atomic', 'true');
            this.statusAnnouncer.setAttribute('role', 'status');
            this.statusAnnouncer.setAttribute('aria-label', 'Achievement system status');
            this.statusAnnouncer.style.cssText = this.screenReaderAnnouncer.style.cssText;
            
            document.body.appendChild(this.screenReaderAnnouncer);
            document.body.appendChild(this.detailedAnnouncer);
            document.body.appendChild(this.statusAnnouncer);
            
            console.log('[AchievementNotificationAccessibility] Enhanced screen reader announcers created');
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to create screen reader announcer:', error);
        }
    }
    
    detectUserPreferences() {
        try {
            // Detect prefers-reduced-motion
            if (window.matchMedia) {
                const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
                this.userPreferences.reducedMotion = reducedMotionQuery.matches;
                
                reducedMotionQuery.addEventListener('change', (e) => {
                    this.userPreferences.reducedMotion = e.matches;
                    this.updateAccessibilityStyles();
                });
            }
            
            // Detect prefers-color-scheme and high contrast
            if (window.matchMedia) {
                const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
                this.userPreferences.highContrast = highContrastQuery.matches;
                
                highContrastQuery.addEventListener('change', (e) => {
                    this.userPreferences.highContrast = e.matches;
                    this.updateAccessibilityStyles();
                });
            }
            
            // Check if screen reader is likely active
            this.detectScreenReader();
            
            // Apply game-specific settings
            this.applyGameSettings();
            
            console.log('[AchievementNotificationAccessibility] User preferences detected:', this.userPreferences);
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to detect user preferences:', error);
        }
    }
    
    detectScreenReader() {
        try {
            // Various methods to detect screen reader usage
            const indicators = [
                // Check for common screen reader APIs
                typeof window.speechSynthesis !== 'undefined',
                // Check for NVDA indicator
                document.querySelector('[data-nvda-test]') !== null,
                // Check for JAWS indicator
                typeof window.JAWS !== 'undefined',
                // Check for reduced motion preference (common with screen readers)
                this.userPreferences.reducedMotion
            ];
            
            this.userPreferences.screenReaderEnabled = indicators.some(indicator => indicator);
            
        } catch (error) {
            console.warn('[AchievementNotificationAccessibility] Could not detect screen reader:', error);
        }
    }
    
    applyGameSettings() {
        try {
            // Apply settings from CONFIG if available
            if (typeof CONFIG !== 'undefined' && CONFIG.ACCESSIBILITY) {
                this.userPreferences.highContrast = CONFIG.ACCESSIBILITY.highContrast || this.userPreferences.highContrast;
                
                // Check if subtitles are enabled (indicates accessibility awareness)
                if (CONFIG.ACCESSIBILITY.subtitles) {
                    this.userPreferences.announceAchievements = true;
                }
            }
            
        } catch (error) {
            console.warn('[AchievementNotificationAccessibility] Could not apply game settings:', error);
        }
    }
    
    setupKeyboardNavigation() {
        try {
            document.addEventListener('keydown', (event) => {
                if (!this.userPreferences.keyboardNavigation) return;
                
                // Alt + A to cycle through achievement toasts
                if (event.altKey && event.key === 'a') {
                    event.preventDefault();
                    this.cycleToastFocus();
                }
                
                // Escape to dismiss focused toast
                if (event.key === 'Escape' && this.currentToastIndex >= 0) {
                    event.preventDefault();
                    this.dismissFocusedToast();
                }
                
                // Enter/Space to interact with focused toast
                if ((event.key === 'Enter' || event.key === ' ') && this.currentToastIndex >= 0) {
                    event.preventDefault();
                    this.interactWithFocusedToast();
                }
            });
            
            console.log('[AchievementNotificationAccessibility] Keyboard navigation set up');
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to set up keyboard navigation:', error);
        }
    }
    
    setupAchievementListeners() {
        try {
            // Listen for achievement unlock events
            document.addEventListener('achievementUnlocked', (event) => {
                this.handleAchievementUnlock(event.detail);
            });
            
            // Listen for custom achievement events if the manager dispatches them
            if (this.achievementManager) {
                // Override the original displayAchievementToast method
                const originalDisplayToast = this.achievementManager.displayAchievementToast.bind(this.achievementManager);
                this.achievementManager.displayAchievementToast = (achievement) => {
                    this.displayAccessibleAchievementToast(achievement);
                };
            }
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to set up achievement listeners:', error);
        }
    }
    
    monitorPreferenceChanges() {
        try {
            // Monitor game config changes
            if (typeof CONFIG !== 'undefined') {
                const configObserver = new Proxy(CONFIG.ACCESSIBILITY || {}, {
                    set: (target, property, value) => {
                        target[property] = value;
                        this.onPreferenceChange(property, value);
                        return true;
                    }
                });
            }
            
        } catch (error) {
            console.warn('[AchievementNotificationAccessibility] Could not set up preference monitoring:', error);
        }
    }
    
    onPreferenceChange(property, value) {
        try {
            switch (property) {
                case 'highContrast':
                    this.userPreferences.highContrast = value;
                    this.updateAccessibilityStyles();
                    break;
                case 'subtitles':
                    this.userPreferences.announceAchievements = value;
                    break;
            }
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Error handling preference change:', error);
        }
    }
    
    createAccessibleToastContainer() {
        try {
            // Create or enhance existing toast container
            let container = document.getElementById('achievementToastContainer');
            
            if (!container) {
                container = document.createElement('div');
                container.id = 'achievementToastContainer';
                document.body.appendChild(container);
            }
            
            // Enhanced accessibility attributes
            container.setAttribute('aria-label', 'Achievement notifications');
            container.setAttribute('role', 'region');
            container.setAttribute('aria-describedby', 'achievement-container-help');
            container.setAttribute('data-testid', 'achievement-toast-container');
            container.className = 'achievement-toast-container accessible';
            
            // Add invisible help text for screen readers
            let helpText = document.getElementById('achievement-container-help');
            if (!helpText) {
                helpText = document.createElement('div');
                helpText.id = 'achievement-container-help';
                helpText.className = 'sr-only';
                helpText.textContent = 'Achievement notification area. Use Tab to navigate achievements, Enter to view details, Escape to dismiss.';
                container.appendChild(helpText);
            }
            
            // Ensure proper focus management
            container.setAttribute('tabindex', '-1');
            
            // Store reference for later use
            this.toastContainer = container;
            
            // Apply accessibility styles
            this.updateAccessibilityStyles();
            
            console.log('[AchievementNotificationAccessibility] Enhanced accessible toast container created');
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to create accessible toast container:', error);
        }
    }
    
    supportsSharing(achievement) {
        try {
            // Check if Web Share API is available and achievement is shareable
            return navigator.share && achievement.shareable !== false;
        } catch (error) {
            return false;
        }
    }
    
    shareAchievement(achievement) {
        try {
            if (navigator.share) {
                const shareData = {
                    title: `Achievement Unlocked: ${achievement.name}`,
                    text: achievement.description || `I just unlocked the "${achievement.name}" achievement!`,
                    url: window.location.href
                };
                
                navigator.share(shareData);
                this.announceAction('Sharing achievement');
            } else {
                // Fallback: copy to clipboard
                const shareText = `Achievement Unlocked: ${achievement.name}${achievement.description ? ' - ' + achievement.description : ''}`;
                navigator.clipboard.writeText(shareText).then(() => {
                    this.announceAction('Achievement details copied to clipboard');
                });
            }
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to share achievement:', error);
            this.announceAction('Unable to share achievement');
        }
    }
    
    navigateToasts(direction) {
        try {
            if (this.focusableToasts.length === 0) return;
            
            this.currentToastIndex += direction;
            
            if (this.currentToastIndex < 0) {
                this.currentToastIndex = this.focusableToasts.length - 1;
            } else if (this.currentToastIndex >= this.focusableToasts.length) {
                this.currentToastIndex = 0;
            }
            
            const toastId = this.focusableToasts[this.currentToastIndex];
            const toastData = this.activeToasts.get(toastId);
            
            if (toastData && toastData.element) {
                toastData.element.focus();
                this.announceAction(`Navigated to toast ${this.currentToastIndex + 1} of ${this.focusableToasts.length}`);
            }
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to navigate toasts:', error);
        }
    }
    
    dismissToast(toastId) {
        try {
            const toastData = this.activeToasts.get(toastId);
            if (!toastData) return;
            
            const toast = toastData.element;
            
            // Announce dismissal for screen readers
            this.announceAction('Achievement notification dismissed');
            
            // Remove from DOM with animation if motion is allowed
            if (toast && toast.parentNode) {
                if (!this.userPreferences.reducedMotion) {
                    toast.style.animation = 'slideOut 0.3s ease-in';
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(100%)';
                    
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.parentNode.removeChild(toast);
                        }
                    }, 300);
                } else {
                    toast.parentNode.removeChild(toast);
                }
            }
            
            // Clean up tracking
            this.activeToasts.delete(toastId);
            this.focusableToasts = this.focusableToasts.filter(id => id !== toastId);
            
            // Update focus management
            if (this.currentToastIndex >= this.focusableToasts.length) {
                this.currentToastIndex = Math.max(0, this.focusableToasts.length - 1);
            }
            
            // Focus next toast if available
            if (this.focusableToasts.length > 0) {
                const nextToastId = this.focusableToasts[this.currentToastIndex];
                const nextToastData = this.activeToasts.get(nextToastId);
                if (nextToastData && nextToastData.element) {
                    setTimeout(() => {
                        nextToastData.element.focus();
                    }, 100);
                }
            }
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to dismiss toast:', error);
        }
    }
    
    handleAchievementUnlock(achievementData) {
        try {
            console.log('[AchievementNotificationAccessibility] Handling achievement unlock:', achievementData);
            
            // Announce to screen reader
            if (this.userPreferences.announceAchievements) {
                this.announceAchievement(achievementData);
            }
            
            // Display accessible toast
            this.displayAccessibleAchievementToast(achievementData);
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to handle achievement unlock:', error);
        }
    }
    
    announceAchievement(achievement) {
        try {
            if (!this.screenReaderAnnouncer || !achievement) return;
            
            // Create comprehensive announcement with structured information
            const announcement = this.createEnhancedAnnouncementText(achievement);
            const detailedInfo = this.createDetailedAnnouncementText(achievement);
            
            // Clear previous announcements
            this.screenReaderAnnouncer.textContent = '';
            if (this.detailedAnnouncer) this.detailedAnnouncer.textContent = '';
            
            // Primary urgent announcement
            setTimeout(() => {
                this.screenReaderAnnouncer.textContent = announcement;
                console.log('[AchievementNotificationAccessibility] Primary announcement:', announcement);
            }, 100);
            
            // Detailed information announcement (delayed to avoid overlap)
            if (this.detailedAnnouncer && detailedInfo) {
                setTimeout(() => {
                    this.detailedAnnouncer.textContent = detailedInfo;
                    console.log('[AchievementNotificationAccessibility] Detailed announcement:', detailedInfo);
                }, 1500);
            }
            
            // Announce toast interaction instructions if keyboard navigation is enabled
            if (this.userPreferences.keyboardNavigation) {
                setTimeout(() => {
                    if (this.statusAnnouncer) {
                        this.statusAnnouncer.textContent = 'Press Tab to navigate to the achievement notification, Enter to view details, or Escape to dismiss.';
                    }
                }, 3000);
            }
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to announce achievement:', error);
        }
    }
    
    createEnhancedAnnouncementText(achievement) {
        try {
            const parts = [];
            
            // Priority announcement
            parts.push('Achievement unlocked');
            
            // Achievement name with proper formatting
            const achievementName = achievement.name || achievement.title || 'Unknown Achievement';
            parts.push(achievementName);
            
            // Achievement category for context
            if (achievement.category) {
                parts.push(`Category: ${achievement.category}`);
            }
            
            // Rarity or difficulty level
            if (achievement.rarity) {
                parts.push(`Rarity: ${achievement.rarity}`);
            } else if (achievement.difficulty) {
                parts.push(`Difficulty: ${achievement.difficulty}`);
            }
            
            return parts.join('. ') + '.';
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to create enhanced announcement text:', error);
            return 'Achievement unlocked.';
        }
    }
    
    createDetailedAnnouncementText(achievement) {
        try {
            const parts = [];
            
            // Description
            if (achievement.description) {
                parts.push(`Description: ${achievement.description}`);
            }
            
            // Progress information
            if (achievement.progress && achievement.maxProgress) {
                parts.push(`Completed: ${achievement.progress} of ${achievement.maxProgress}`);
            }
            
            // Reward information with detailed breakdown
            if (achievement.reward) {
                const rewardText = this.formatEnhancedRewardText(achievement.reward);
                if (rewardText) {
                    parts.push(`Rewards earned: ${rewardText}`);
                }
            }
            
            // Unlock date/time
            const unlockTime = new Date().toLocaleString();
            parts.push(`Unlocked on ${unlockTime}`);
            
            // Total achievement count update
            if (achievement.totalAchievements && achievement.achievementNumber) {
                parts.push(`This is achievement ${achievement.achievementNumber} of ${achievement.totalAchievements}`);
            }
            
            return parts.length > 0 ? parts.join('. ') + '.' : null;
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to create detailed announcement text:', error);
            return null;
        }
    }
    
    createAnnouncementText(achievement) {
        try {
            const parts = [
                'Achievement unlocked!',
                achievement.name || achievement.title || 'Unknown Achievement'
            ];
            
            if (achievement.description) {
                parts.push(achievement.description);
            }
            
            if (achievement.reward) {
                const rewardText = this.formatRewardText(achievement.reward);
                if (rewardText) {
                    parts.push(`Reward: ${rewardText}`);
                }
            }
            
            return parts.join('. ') + '.';
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to create announcement text:', error);
            return 'Achievement unlocked!';
        }
    }
    
    formatEnhancedRewardText(reward) {
        try {
            const parts = [];
            
            // Resource rewards with proper number formatting
            if (reward.dharma) {
                const dharmaText = reward.dharma === 1 ? '1 Dharma point' : `${reward.dharma} Dharma points`;
                parts.push(dharmaText);
            }
            if (reward.bandwidth) {
                const bandwidthText = reward.bandwidth === 1 ? '1 Bandwidth unit' : `${reward.bandwidth} Bandwidth units`;
                parts.push(bandwidthText);
            }
            if (reward.anonymity) {
                const anonymityText = reward.anonymity === 1 ? '1 Anonymity point' : `${reward.anonymity} Anonymity points`;
                parts.push(anonymityText);
            }
            
            // Special rewards
            if (reward.title) {
                parts.push(`New title: ${reward.title}`);
            }
            if (reward.badge) {
                parts.push(`New badge: ${reward.badge}`);
            }
            if (reward.unlock) {
                parts.push(`Unlocked: ${reward.unlock}`);
            }
            
            // Experience or level rewards
            if (reward.experience) {
                const expText = reward.experience === 1 ? '1 experience point' : `${reward.experience} experience points`;
                parts.push(expText);
            }
            
            // Multiplier bonuses
            if (reward.multiplier) {
                parts.push(`${reward.multiplier}x multiplier bonus`);
            }
            
            // Special items
            if (reward.items && Array.isArray(reward.items)) {
                const itemText = reward.items.map(item => 
                    typeof item === 'string' ? item : item.name || 'Unknown item'
                ).join(', ');
                parts.push(`Items: ${itemText}`);
            }
            
            return parts.join(', ');
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to format enhanced reward text:', error);
            return '';
        }
    }
    
    displayAccessibleAchievementToast(achievement) {
        try {
            console.log('[AchievementNotificationAccessibility] Displaying accessible achievement toast');
            
            if (!achievement) {
                console.error('[AchievementNotificationAccessibility] No achievement provided');
                return false;
            }
            
            // Create accessible toast element
            const toast = this.createAccessibleToast(achievement);
            if (!toast) return false;
            
            // Add to container
            const container = document.getElementById('achievementToastContainer');
            if (!container) {
                console.error('[AchievementNotificationAccessibility] Toast container not found');
                return false;
            }
            
            container.appendChild(toast);
            
            // Track active toast
            const toastId = `toast-${Date.now()}`;
            toast.id = toastId;
            this.activeToasts.set(toastId, {
                element: toast,
                achievement: achievement,
                timestamp: Date.now()
            });
            
            // Add to focusable toasts if keyboard navigation is enabled
            if (this.userPreferences.keyboardNavigation) {
                this.focusableToasts.push(toastId);
            }
            
            // Set up auto-removal
            this.scheduleToastRemoval(toastId);
            
            return true;
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to display accessible toast:', error);
            return false;
        }
    }
    
    createAccessibleToast(achievement) {
        try {
            const toastId = `achievement-toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const toast = document.createElement('article');
            toast.id = toastId;
            toast.className = 'achievement-toast accessible';
            
            // Enhanced ARIA attributes for comprehensive accessibility
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            toast.setAttribute('aria-atomic', 'true');
            toast.setAttribute('aria-labelledby', `${toastId}-title`);
            toast.setAttribute('aria-describedby', `${toastId}-description`);
            toast.setAttribute('data-achievement-id', achievement.id || 'unknown');
            toast.setAttribute('data-testid', 'achievement-toast');
            
            // Keyboard navigation support with enhanced attributes
            if (this.userPreferences.keyboardNavigation) {
                toast.setAttribute('tabindex', '0');
                toast.setAttribute('aria-keyshortcuts', 'Enter Space Escape');
                toast.setAttribute('aria-roledescription', 'Achievement notification');
            }
            
            // Create structured content with proper semantic markup
            const content = this.createEnhancedToastContent(achievement, toastId);
            toast.appendChild(content);
            
            // Apply accessibility styles
            this.applyToastAccessibilityStyles(toast);
            
            // Add comprehensive interaction handlers
            this.addEnhancedToastInteractionHandlers(toast, achievement);
            
            // Add toast to tracking system
            this.activeToasts.set(toastId, {
                element: toast,
                achievement: achievement,
                timestamp: Date.now()
            });
            
            return toast;
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to create accessible toast:', error);
            return null;
        }
    }
    
    createEnhancedToastContent(achievement, toastId) {
        try {
            const content = document.createElement('div');
            content.className = 'achievement-content accessible';
            content.setAttribute('role', 'group');
            content.setAttribute('aria-labelledby', `${toastId}-title`);
            
            // Achievement icon with comprehensive accessibility
            const iconContainer = document.createElement('div');
            iconContainer.className = 'achievement-icon';
            iconContainer.setAttribute('role', 'img');
            iconContainer.setAttribute('aria-label', this.createIconAriaLabel(achievement));
            iconContainer.textContent = achievement.icon || '🏆';
            
            // Main content container with semantic structure
            const textContainer = document.createElement('div');
            textContainer.className = 'achievement-text';
            textContainer.setAttribute('role', 'group');
            
            // Achievement title with proper heading structure
            const title = document.createElement('h3');
            title.id = `${toastId}-title`;
            title.className = 'achievement-title';
            title.setAttribute('aria-level', '3');
            title.textContent = 'Achievement Unlocked!';
            
            // Achievement name with semantic emphasis
            const name = document.createElement('div');
            name.className = 'achievement-name';
            name.setAttribute('role', 'text');
            name.setAttribute('aria-label', `Achievement name: ${achievement.name || achievement.title || 'Unknown Achievement'}`);
            
            const nameStrong = document.createElement('strong');
            nameStrong.textContent = achievement.name || achievement.title || 'Unknown Achievement';
            name.appendChild(nameStrong);
            
            // Achievement description with proper labeling
            const description = document.createElement('div');
            description.id = `${toastId}-description`;
            description.className = 'achievement-description';
            description.setAttribute('role', 'text');
            description.textContent = achievement.description || '';
            
            // Category and rarity information
            const metaInfo = this.createMetaInfoSection(achievement, toastId);
            
            // Reward information with detailed structure
            const rewardContainer = this.createEnhancedRewardContent(achievement.reward, toastId);
            
            // Progress information if available
            const progressContainer = this.createProgressContent(achievement, toastId);
            
            // Assembly
            textContainer.appendChild(title);
            textContainer.appendChild(name);
            if (achievement.description) textContainer.appendChild(description);
            if (metaInfo) textContainer.appendChild(metaInfo);
            if (rewardContainer) textContainer.appendChild(rewardContainer);
            if (progressContainer) textContainer.appendChild(progressContainer);
            
            content.appendChild(iconContainer);
            content.appendChild(textContainer);
            
            // Interactive elements for keyboard navigation
            if (this.userPreferences.keyboardNavigation) {
                const actionsContainer = this.createEnhancedToastActions(achievement, toastId);
                content.appendChild(actionsContainer);
            }
            
            return content;
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to create enhanced toast content:', error);
            return document.createElement('div');
        }
    }
    
    createIconAriaLabel(achievement) {
        try {
            const parts = ['Achievement icon'];
            
            if (achievement.category) {
                parts.push(`Category: ${achievement.category}`);
            }
            
            if (achievement.rarity) {
                parts.push(`Rarity: ${achievement.rarity}`);
            }
            
            return parts.join(', ');
            
        } catch (error) {
            return 'Achievement icon';
        }
    }
    
    createMetaInfoSection(achievement, toastId) {
        try {
            if (!achievement.category && !achievement.rarity && !achievement.difficulty) {
                return null;
            }
            
            const metaContainer = document.createElement('div');
            metaContainer.className = 'achievement-meta';
            metaContainer.setAttribute('role', 'group');
            metaContainer.setAttribute('aria-label', 'Achievement details');
            
            const metaParts = [];
            
            if (achievement.category) {
                metaParts.push(`Category: ${achievement.category}`);
            }
            
            if (achievement.rarity) {
                metaParts.push(`Rarity: ${achievement.rarity}`);
            }
            
            if (achievement.difficulty) {
                metaParts.push(`Difficulty: ${achievement.difficulty}`);
            }
            
            metaContainer.textContent = metaParts.join(' • ');
            
            return metaContainer;
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to create meta info section:', error);
            return null;
        }
    }
    
    createEnhancedRewardContent(reward, toastId) {
        try {
            if (!reward) return null;
            
            const rewardContainer = document.createElement('div');
            rewardContainer.className = 'achievement-reward';
            rewardContainer.setAttribute('role', 'group');
            rewardContainer.setAttribute('aria-labelledby', `${toastId}-reward-title`);
            
            const rewardTitle = document.createElement('div');
            rewardTitle.id = `${toastId}-reward-title`;
            rewardTitle.className = 'reward-title';
            rewardTitle.textContent = 'Rewards:';
            
            const rewardList = document.createElement('ul');
            rewardList.className = 'reward-list';
            rewardList.setAttribute('aria-label', 'Achievement rewards');
            
            // Add individual reward items
            const rewardItems = this.parseRewardItems(reward);
            rewardItems.forEach(item => {
                const listItem = document.createElement('li');
                listItem.textContent = item;
                rewardList.appendChild(listItem);
            });
            
            rewardContainer.appendChild(rewardTitle);
            rewardContainer.appendChild(rewardList);
            
            return rewardContainer;
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to create enhanced reward content:', error);
            return null;
        }
    }
    
    createProgressContent(achievement, toastId) {
        try {
            if (!achievement.progress && !achievement.maxProgress) return null;
            
            const progressContainer = document.createElement('div');
            progressContainer.className = 'achievement-progress';
            progressContainer.setAttribute('role', 'group');
            progressContainer.setAttribute('aria-labelledby', `${toastId}-progress-title`);
            
            const progressTitle = document.createElement('div');
            progressTitle.id = `${toastId}-progress-title`;
            progressTitle.className = 'progress-title';
            progressTitle.textContent = 'Progress:';
            
            const progressText = document.createElement('div');
            progressText.className = 'progress-text';
            progressText.setAttribute('role', 'text');
            
            if (achievement.progress && achievement.maxProgress) {
                const percentage = Math.round((achievement.progress / achievement.maxProgress) * 100);
                progressText.textContent = `${achievement.progress} of ${achievement.maxProgress} (${percentage}%)`;
                progressText.setAttribute('aria-label', `Progress: ${achievement.progress} of ${achievement.maxProgress}, ${percentage} percent complete`);
            } else {
                progressText.textContent = 'Completed';
                progressText.setAttribute('aria-label', 'Achievement completed');
            }
            
            progressContainer.appendChild(progressTitle);
            progressContainer.appendChild(progressText);
            
            return progressContainer;
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to create progress content:', error);
            return null;
        }
    }
    
    parseRewardItems(reward) {
        try {
            const items = [];
            
            if (reward.dharma) items.push(`${reward.dharma} Dharma`);
            if (reward.bandwidth) items.push(`${reward.bandwidth} Bandwidth`);
            if (reward.anonymity) items.push(`${reward.anonymity} Anonymity`);
            if (reward.experience) items.push(`${reward.experience} Experience`);
            if (reward.title) items.push(`Title: ${reward.title}`);
            if (reward.badge) items.push(`Badge: ${reward.badge}`);
            if (reward.unlock) items.push(`Unlocked: ${reward.unlock}`);
            if (reward.multiplier) items.push(`${reward.multiplier}x Multiplier`);
            
            if (reward.items && Array.isArray(reward.items)) {
                reward.items.forEach(item => {
                    const itemName = typeof item === 'string' ? item : item.name || 'Unknown item';
                    items.push(itemName);
                });
            }
            
            return items.length > 0 ? items : ['Achievement completion bonus'];
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to parse reward items:', error);
            return ['Achievement completion bonus'];
        }
    }
    
    createRewardContent(reward) {
        try {
            const rewardContainer = document.createElement('div');
            rewardContainer.className = 'achievement-reward';
            rewardContainer.setAttribute('aria-label', 'Achievement reward');
            
            const rewardText = this.formatRewardText(reward);
            if (rewardText) {
                rewardContainer.textContent = `Reward: ${rewardText}`;
            }
            
            return rewardContainer;
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to create reward content:', error);
            return document.createElement('div');
        }
    }
    
    createToastActions(achievement) {
        try {
            const actionContainer = document.createElement('div');
            actionContainer.className = 'achievement-actions';
            actionContainer.setAttribute('role', 'group');
            actionContainer.setAttribute('aria-label', 'Achievement actions');
            
            // View details button
            const detailsButton = document.createElement('button');
            detailsButton.className = 'toast-action view-details';
            detailsButton.textContent = 'View Details';
            detailsButton.setAttribute('aria-label', `View details for ${achievement.name}`);
            detailsButton.addEventListener('click', () => {
                this.viewAchievementDetails(achievement);
            });
            
            // Dismiss button
            const dismissButton = document.createElement('button');
            dismissButton.className = 'toast-action dismiss';
            dismissButton.textContent = '×';
            dismissButton.setAttribute('aria-label', 'Dismiss notification');
            dismissButton.addEventListener('click', (event) => {
                this.dismissToast(event.target.closest('.achievement-toast'));
            });
            
            actionContainer.appendChild(detailsButton);
            actionContainer.appendChild(dismissButton);
            
            return actionContainer;
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to create toast actions:', error);
            return document.createElement('div');
        }
    }
    
    applyToastAccessibilityStyles(toast) {
        try {
            const styles = {
                // Base styles
                position: 'relative',
                marginBottom: '10px',
                padding: '15px',
                borderRadius: '10px',
                border: '2px solid #ffd700',
                backgroundColor: '#2c3e50',
                color: 'white',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '15px',
                minWidth: '320px',
                maxWidth: '400px',
                zIndex: '10000'
            };
            
            // High contrast adjustments
            if (this.userPreferences.highContrast) {
                styles.border = '3px solid #ffffff';
                styles.backgroundColor = '#000000';
                styles.color = '#ffffff';
                styles.boxShadow = '0 0 0 1px #ffffff';
            }
            
            // Reduced motion adjustments
            if (this.userPreferences.reducedMotion) {
                styles.animation = 'none';
                styles.transition = 'none';
            } else {
                styles.animation = 'slideInRight 0.3s ease-out';
                styles.transition = 'all 0.2s ease';
            }
            
            // Focus styles for keyboard navigation
            if (this.userPreferences.keyboardNavigation) {
                toast.addEventListener('focus', () => {
                    toast.style.outline = '3px solid #4ecdc4';
                    toast.style.outlineOffset = '2px';
                });
                
                toast.addEventListener('blur', () => {
                    toast.style.outline = 'none';
                });
            }
            
            // Apply styles
            Object.assign(toast.style, styles);
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to apply toast accessibility styles:', error);
        }
    }
    
    createEnhancedToastActions(achievement, toastId) {
        try {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'achievement-actions';
            actionsContainer.setAttribute('role', 'group');
            actionsContainer.setAttribute('aria-label', 'Achievement actions');
            
            // View Details button
            const viewButton = document.createElement('button');
            viewButton.className = 'action-button view-details';
            viewButton.setAttribute('type', 'button');
            viewButton.setAttribute('aria-describedby', `${toastId}-description`);
            viewButton.setAttribute('aria-keyshortcuts', 'Enter');
            viewButton.textContent = 'View Details';
            
            viewButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewAchievementDetails(achievement);
            });
            
            // Dismiss button  
            const dismissButton = document.createElement('button');
            dismissButton.className = 'action-button dismiss';
            dismissButton.setAttribute('type', 'button');
            dismissButton.setAttribute('aria-label', 'Dismiss achievement notification');
            dismissButton.setAttribute('aria-keyshortcuts', 'Escape');
            dismissButton.textContent = 'Dismiss';
            
            dismissButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dismissToast(toastId);
            });
            
            // Share button (if sharing is supported)
            if (this.supportsSharing(achievement)) {
                const shareButton = document.createElement('button');
                shareButton.className = 'action-button share';
                shareButton.setAttribute('type', 'button');
                shareButton.setAttribute('aria-label', 'Share achievement');
                shareButton.textContent = 'Share';
                
                shareButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.shareAchievement(achievement);
                });
                
                actionsContainer.appendChild(shareButton);
            }
            
            actionsContainer.appendChild(viewButton);
            actionsContainer.appendChild(dismissButton);
            
            return actionsContainer;
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to create enhanced toast actions:', error);
            return document.createElement('div');
        }
    }
    
    addEnhancedToastInteractionHandlers(toast, achievement) {
        try {
            const toastId = toast.id;
            
            // Enhanced keyboard navigation
            toast.addEventListener('keydown', (event) => {
                switch (event.key) {
                    case 'Enter':
                    case ' ':
                        event.preventDefault();
                        this.viewAchievementDetails(achievement);
                        this.announceAction('Opening achievement details');
                        break;
                    case 'Escape':
                        event.preventDefault();
                        this.dismissToast(toastId);
                        this.announceAction('Achievement notification dismissed');
                        break;
                    case 'Tab':
                        // Allow natural tab navigation within toast
                        break;
                    case 'ArrowUp':
                    case 'ArrowDown':
                        event.preventDefault();
                        this.navigateToasts(event.key === 'ArrowUp' ? -1 : 1);
                        break;
                    default:
                        // Announce available keyboard shortcuts
                        if (event.ctrlKey && event.key === '/') {
                            event.preventDefault();
                            this.announceKeyboardHelp();
                        }
                        break;
                }
            });
            
            // Focus management
            toast.addEventListener('focus', () => {
                toast.setAttribute('aria-selected', 'true');
                this.announceToastFocus(achievement);
            });
            
            toast.addEventListener('blur', () => {
                toast.setAttribute('aria-selected', 'false');
            });
            
            // Mouse interactions with accessibility considerations
            toast.addEventListener('click', (event) => {
                // Only handle if not clicking on action buttons
                if (!event.target.classList.contains('action-button')) {
                    this.viewAchievementDetails(achievement);
                }
            });
            
            // Hover effects that respect motion preferences
            toast.addEventListener('mouseenter', () => {
                if (!this.userPreferences.reducedMotion) {
                    toast.style.transform = 'translateY(-2px) scale(1.02)';
                    toast.style.boxShadow = '0 8px 30px rgba(244, 208, 63, 0.4)';
                    toast.style.transition = 'all 0.2s ease-out';
                }
                toast.setAttribute('aria-expanded', 'true');
            });
            
            toast.addEventListener('mouseleave', () => {
                if (!this.userPreferences.reducedMotion) {
                    toast.style.transform = 'none';
                    toast.style.boxShadow = 'none';
                }
                toast.setAttribute('aria-expanded', 'false');
            });
            
            // Touch support for mobile accessibility
            toast.addEventListener('touchstart', (e) => {
                toast.classList.add('touched');
            });
            
            toast.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    toast.classList.remove('touched');
                }, 100);
            });
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to add enhanced toast interaction handlers:', error);
        }
    }
    
    announceAction(actionText) {
        try {
            if (this.statusAnnouncer) {
                this.statusAnnouncer.textContent = actionText;
            }
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to announce action:', error);
        }
    }
    
    announceToastFocus(achievement) {
        try {
            if (this.statusAnnouncer) {
                const focusText = `Focused on achievement: ${achievement.name || achievement.title}. Press Enter to view details, Escape to dismiss, or Tab to navigate within.`;
                this.statusAnnouncer.textContent = focusText;
            }
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to announce toast focus:', error);
        }
    }
    
    announceKeyboardHelp() {
        try {
            if (this.statusAnnouncer) {
                const helpText = 'Achievement toast keyboard shortcuts: Enter or Space to view details, Escape to dismiss, Arrow keys to navigate between toasts, Tab to navigate within toast.';
                this.statusAnnouncer.textContent = helpText;
            }
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to announce keyboard help:', error);
        }
    }
    
    scheduleToastRemoval(toastId) {
        try {
            const duration = this.userPreferences.screenReaderEnabled ? 8000 : 4000; // Longer for screen readers
            
            setTimeout(() => {
                this.removeToast(toastId);
            }, duration);
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to schedule toast removal:', error);
        }
    }
    
    removeToast(toastId) {
        try {
            const toastData = this.activeToasts.get(toastId);
            if (!toastData) return;
            
            const toast = toastData.element;
            
            // Remove from DOM
            if (toast && toast.parentNode) {
                // Fade out animation (if motion is allowed)
                if (!this.userPreferences.reducedMotion) {
                    toast.style.animation = 'fadeOut 0.3s ease-out';
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.parentNode.removeChild(toast);
                        }
                    }, 300);
                } else {
                    toast.parentNode.removeChild(toast);
                }
            }
            
            // Clean up tracking
            this.activeToasts.delete(toastId);
            this.focusableToasts = this.focusableToasts.filter(id => id !== toastId);
            
            // Update focus index if needed
            if (this.currentToastIndex >= this.focusableToasts.length) {
                this.currentToastIndex = this.focusableToasts.length - 1;
            }
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to remove toast:', error);
        }
    }
    
    cycleToastFocus() {
        try {
            if (this.focusableToasts.length === 0) return;
            
            this.currentToastIndex = (this.currentToastIndex + 1) % this.focusableToasts.length;
            const toastId = this.focusableToasts[this.currentToastIndex];
            const toastData = this.activeToasts.get(toastId);
            
            if (toastData && toastData.element) {
                toastData.element.focus();
                
                // Announce focus change to screen reader
                if (this.userPreferences.announceAchievements) {
                    this.announceToastFocus(toastData.achievement);
                }
            }
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to cycle toast focus:', error);
        }
    }
    
    announceToastFocus(achievement) {
        try {
            const announcement = `Focused on achievement: ${achievement.name || achievement.title}`;
            this.screenReaderAnnouncer.textContent = announcement;
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to announce toast focus:', error);
        }
    }
    
    dismissFocusedToast() {
        try {
            if (this.currentToastIndex < 0 || this.currentToastIndex >= this.focusableToasts.length) return;
            
            const toastId = this.focusableToasts[this.currentToastIndex];
            this.removeToast(toastId);
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to dismiss focused toast:', error);
        }
    }
    
    interactWithFocusedToast() {
        try {
            if (this.currentToastIndex < 0 || this.currentToastIndex >= this.focusableToasts.length) return;
            
            const toastId = this.focusableToasts[this.currentToastIndex];
            const toastData = this.activeToasts.get(toastId);
            
            if (toastData) {
                this.viewAchievementDetails(toastData.achievement);
            }
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to interact with focused toast:', error);
        }
    }
    
    dismissToast(toast) {
        try {
            if (!toast) return;
            
            const toastId = toast.id;
            if (toastId) {
                this.removeToast(toastId);
            }
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to dismiss toast:', error);
        }
    }
    
    viewAchievementDetails(achievement) {
        try {
            console.log('[AchievementNotificationAccessibility] Viewing achievement details:', achievement);
            
            // Use existing game method if available
            if (this.game && typeof this.game.showAchievementDetails === 'function') {
                this.game.showAchievementDetails(achievement.id, achievement, true);
            } else {
                // Fallback to simple alert for accessibility
                const details = this.createAnnouncementText(achievement);
                alert(details);
            }
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to view achievement details:', error);
        }
    }
    
    updateAccessibilityStyles() {
        try {
            console.log('[AchievementNotificationAccessibility] Updating accessibility styles');
            
            // Update CSS custom properties for global accessibility
            const root = document.documentElement;
            
            if (this.userPreferences.highContrast) {
                root.style.setProperty('--toast-bg-color', '#000000');
                root.style.setProperty('--toast-text-color', '#ffffff');
                root.style.setProperty('--toast-border-color', '#ffffff');
                root.style.setProperty('--toast-border-width', '3px');
            } else {
                root.style.setProperty('--toast-bg-color', '#2c3e50');
                root.style.setProperty('--toast-text-color', '#ffffff');
                root.style.setProperty('--toast-border-color', '#ffd700');
                root.style.setProperty('--toast-border-width', '2px');
            }
            
            if (this.userPreferences.reducedMotion) {
                root.style.setProperty('--toast-animation', 'none');
                root.style.setProperty('--toast-transition', 'none');
            } else {
                root.style.setProperty('--toast-animation', 'slideInRight 0.3s ease-out');
                root.style.setProperty('--toast-transition', 'all 0.2s ease');
            }
            
            // Update existing toasts
            this.activeToasts.forEach((toastData) => {
                this.applyToastAccessibilityStyles(toastData.element);
            });
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to update accessibility styles:', error);
        }
    }
    
    // Public API methods
    
    /**
     * Enable or disable screen reader announcements
     */
    setScreenReaderAnnouncements(enabled) {
        this.userPreferences.announceAchievements = enabled;
        console.log('[AchievementNotificationAccessibility] Screen reader announcements:', enabled ? 'enabled' : 'disabled');
    }
    
    /**
     * Enable or disable keyboard navigation
     */
    setKeyboardNavigation(enabled) {
        this.userPreferences.keyboardNavigation = enabled;
        console.log('[AchievementNotificationAccessibility] Keyboard navigation:', enabled ? 'enabled' : 'disabled');
    }
    
    /**
     * Set high contrast mode
     */
    setHighContrast(enabled) {
        this.userPreferences.highContrast = enabled;
        this.updateAccessibilityStyles();
        console.log('[AchievementNotificationAccessibility] High contrast mode:', enabled ? 'enabled' : 'disabled');
    }
    
    /**
     * Set reduced motion preference
     */
    setReducedMotion(enabled) {
        this.userPreferences.reducedMotion = enabled;
        this.updateAccessibilityStyles();
        console.log('[AchievementNotificationAccessibility] Reduced motion:', enabled ? 'enabled' : 'disabled');
    }
    
    /**
     * Get current accessibility preferences
     */
    getPreferences() {
        return { ...this.userPreferences };
    }
    
    /**
     * Clear all active toasts
     */
    clearAllToasts() {
        try {
            this.activeToasts.forEach((toastData, toastId) => {
                this.removeToast(toastId);
            });
            
            this.focusableToasts = [];
            this.currentToastIndex = -1;
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to clear all toasts:', error);
        }
    }
    
    /**
     * Test accessibility features
     */
    testAccessibilityFeatures() {
        console.log('[AchievementNotificationAccessibility] Testing accessibility features...');
        
        const testAchievement = {
            id: 'test_accessibility',
            name: 'Accessibility Test',
            title: 'Accessibility Test',
            description: 'This is a test achievement for accessibility features',
            icon: '🧪',
            category: 'test',
            reward: { dharma: 10 }
        };
        
        this.handleAchievementUnlock(testAchievement);
    }
    
    /**
     * Announce action for screen readers
     */
    announceAction(message) {
        try {
            if (this.screenReaderAnnouncers && this.screenReaderAnnouncers.status) {
                this.screenReaderAnnouncers.status.textContent = message;
            }
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to announce action:', error);
        }
    }
    
    /**
     * Show keyboard help dialog
     */
    showKeyboardHelp() {
        try {
            const helpMessage = [
                'Achievement Notification Keyboard Shortcuts:',
                'Arrow Keys: Navigate between toasts',
                'Enter or Space: Activate focused button',
                'Escape: Dismiss current toast',
                'S: Share achievement (if supported)',
                'V: View achievement details',
                'D: Dismiss achievement',
                'Ctrl+/: Show this help'
            ].join('\n');
            
            // Create accessible help dialog
            const helpDialog = document.createElement('div');
            helpDialog.setAttribute('role', 'dialog');
            helpDialog.setAttribute('aria-modal', 'true');
            helpDialog.setAttribute('aria-labelledby', 'help-title');
            helpDialog.setAttribute('aria-describedby', 'help-content');
            helpDialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--modal-bg, #2a2a2a);
                color: var(--modal-text, #ffffff);
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                z-index: 10000;
                max-width: 400px;
                border: 2px solid var(--modal-border, #555);
            `;
            
            helpDialog.innerHTML = `
                <h2 id="help-title" style="margin: 0 0 15px 0; font-size: 1.2em;">
                    Keyboard Shortcuts
                </h2>
                <div id="help-content" style="white-space: pre-line; line-height: 1.5;">
                    ${helpMessage}
                </div>
                <button id="help-close" style="
                    margin-top: 15px;
                    padding: 8px 16px;
                    background: var(--button-bg, #4CAF50);
                    color: var(--button-text, white);
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                " aria-label="Close help dialog">
                    Close (Escape)
                </button>
            `;
            
            document.body.appendChild(helpDialog);
            
            // Focus the close button
            const closeButton = helpDialog.querySelector('#help-close');
            closeButton.focus();
            
            // Handle close events
            const closeHelp = () => {
                if (helpDialog.parentNode) {
                    helpDialog.parentNode.removeChild(helpDialog);
                }
                this.announceAction('Help dialog closed');
            };
            
            closeButton.addEventListener('click', closeHelp);
            helpDialog.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    closeHelp();
                }
            });
            
            this.announceAction('Keyboard shortcuts help opened');
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to show keyboard help:', error);
        }
    }
    
    /**
     * Update user accessibility preferences
     */
    updateUserPreferences() {
        try {
            // Check for user preferences that affect accessibility
            this.userPreferences = {
                reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                highContrast: window.matchMedia('(prefers-contrast: high)').matches,
                reduceTransparency: window.matchMedia('(prefers-reduced-transparency: reduce)').matches,
                screenReader: this.detectScreenReader()
            };
            
            console.log('[AchievementNotificationAccessibility] User preferences updated:', this.userPreferences);
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to update user preferences:', error);
            // Set safe defaults
            this.userPreferences = {
                reducedMotion: false,
                highContrast: false,
                reduceTransparency: false,
                screenReader: false
            };
        }
    }
    
    /**
     * Detect if screen reader is likely being used
     */
    detectScreenReader() {
        try {
            // Multiple detection methods for screen readers
            const indicators = [
                // Check for NVDA
                navigator.userAgent.includes('NVDA'),
                // Check for JAWS
                navigator.userAgent.includes('JAWS'),  
                // Check for VoiceOver (more indirect)
                /Mac OS X/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent),
                // Check for high contrast (often used by screen reader users)
                window.matchMedia('(prefers-contrast: high)').matches,
                // Check for reduced motion (often used by assistive technology users)
                window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                // Check for narrator on Windows
                navigator.userAgent.includes('Windows NT') && 'speechSynthesis' in window
            ];
            
            return indicators.some(indicator => indicator);
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to detect screen reader:', error);
            return false;
        }
    }
    
    /**
     * Cleanup method
     */
    destroy() {
        try {
            // Remove event listeners
            document.removeEventListener('keydown', this.keydownHandler);
            
            // Clean up all toasts
            this.activeToasts.forEach((toastData, toastId) => {
                this.dismissToast(toastId);
            });
            this.clearAllToasts();
            
            // Remove screen reader announcers
            if (this.screenReaderAnnouncers) {
                Object.values(this.screenReaderAnnouncers).forEach(announcer => {
                    if (announcer && announcer.parentNode) {
                        announcer.parentNode.removeChild(announcer);
                    }
                });
            }
            
            // Legacy support - remove old announcer if it exists
            if (this.screenReaderAnnouncer && this.screenReaderAnnouncer.parentNode) {
                this.screenReaderAnnouncer.parentNode.removeChild(this.screenReaderAnnouncer);
            }
            
            // Remove toast container
            if (this.toastContainer && this.toastContainer.parentNode) {
                this.toastContainer.parentNode.removeChild(this.toastContainer);
            }
            
            // Clear references
            this.activeToasts.clear();
            this.focusableToasts = [];
            this.screenReaderAnnouncers = null;
            this.screenReaderAnnouncer = null; // Legacy cleanup
            this.toastContainer = null;
            this.game = null;
            
            console.log('[AchievementNotificationAccessibility] Accessibility system destroyed and cleaned up');
            
        } catch (error) {
            console.error('[AchievementNotificationAccessibility] Failed to destroy accessibility system:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AchievementNotificationAccessibility;
}
