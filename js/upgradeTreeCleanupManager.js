/**
 * Upgrade Tree Modal Cleanup System
 * Provides comprehensive cleanup for upgrade tree modal operations with:
 * 1) Comprehensive event listener removal in modal close methods
 * 2) DOM element pooling for frequently created/destroyed elements
 * 3) Memory usage monitoring for upgrade tree operations
 * 4) Cleanup validation to ensure no dangling references remain
 */

class UpgradeTreeCleanupManager {
    constructor(game) {
        this.game = game;
        
        // Event listener tracking
        this.activeEventListeners = new Map(); // Maps element -> {event, handler}
        this.globalEventListeners = new Set(); // Global document/window listeners
        
        // DOM element pooling system
        this.elementPools = {
            upgradeChoice: [], // Pooled upgrade choice elements
            statChange: [], // Pooled stat change elements
            abilityTag: [], // Pooled ability tag elements
            previewSection: [] // Pooled preview section elements
        };
        this.poolSizes = {
            upgradeChoice: 10,
            statChange: 20,
            abilityTag: 15,
            previewSection: 5
        };
        
        // Memory usage monitoring
        this.memoryMetrics = {
            modalOpenCount: 0,
            modalCloseCount: 0,
            elementsCreated: 0,
            elementsPooled: 0,
            elementsDestroyed: 0,
            peakListenerCount: 0,
            currentListenerCount: 0,
            memorySnapshots: [],
            lastCleanupTime: Date.now(),
            cleanupOperations: 0
        };
        
        // Cleanup validation tracking
        this.danglingReferences = new WeakMap(); // Track objects for reference validation
        this.expectedCleanupItems = new Set(); // Items that should be cleaned up
        this.cleanupValidationEnabled = true;
        
        // Performance monitoring
        this.performanceObserver = null;
        this.memoryUsageHistory = [];
        this.cleanupPerformanceMetrics = {
            averageCleanupTime: 0,
            maxCleanupTime: 0,
            totalCleanupOperations: 0,
            failedCleanupOperations: 0
        };
        
        // Initialize cleanup system
        this.initializeCleanupSystem();
        
        console.log('[UpgradeTreeCleanupManager] Initialized comprehensive cleanup system');
    }

    /**
     * Feature 1: Comprehensive event listener removal in modal close methods
     */
    trackEventListener(element, eventType, handler, options = {}) {
        try {
            if (!element || typeof handler !== 'function') {
                console.warn('[UpgradeTreeCleanupManager] Invalid event listener parameters');
                return;
            }

            // Generate unique identifier for this listener
            const listenerId = `${eventType}_${Date.now()}_${Math.random()}`;
            
            // Store listener details for cleanup
            const listenerData = {
                element,
                eventType,
                handler,
                options,
                listenerId,
                timestamp: Date.now(),
                stackTrace: new Error().stack // For debugging
            };
            
            // Track in active listeners
            if (!this.activeEventListeners.has(element)) {
                this.activeEventListeners.set(element, []);
            }
            this.activeEventListeners.get(element).push(listenerData);
            
            // Track global listeners separately
            if (element === document || element === window) {
                this.globalEventListeners.add(listenerData);
            }
            
            // Add the actual event listener
            element.addEventListener(eventType, handler, options);
            
            // Update metrics
            this.memoryMetrics.currentListenerCount++;
            this.memoryMetrics.peakListenerCount = Math.max(
                this.memoryMetrics.peakListenerCount,
                this.memoryMetrics.currentListenerCount
            );
            
            console.log(`[UpgradeTreeCleanupManager] Tracked event listener: ${eventType} on`, element);
            return listenerId;
            
        } catch (error) {
            console.error('[UpgradeTreeCleanupManager] Error tracking event listener:', error);
            return null;
        }
    }

    removeAllEventListeners() {
        try {
            let removedCount = 0;
            const startTime = performance.now();
            
            // Remove element-specific listeners
            for (const [element, listeners] of this.activeEventListeners) {
                if (listeners && Array.isArray(listeners)) {
                    listeners.forEach(listenerData => {
                        try {
                            element.removeEventListener(
                                listenerData.eventType,
                                listenerData.handler,
                                listenerData.options
                            );
                            removedCount++;
                        } catch (error) {
                            console.warn('[UpgradeTreeCleanupManager] Failed to remove listener:', error);
                        }
                    });
                }
            }
            
            // Clear tracking maps
            this.activeEventListeners.clear();
            this.globalEventListeners.clear();
            
            // Update metrics
            this.memoryMetrics.currentListenerCount = 0;
            const cleanupTime = performance.now() - startTime;
            this.updateCleanupMetrics(cleanupTime);
            
            console.log(`[UpgradeTreeCleanupManager] Removed ${removedCount} event listeners in ${cleanupTime.toFixed(2)}ms`);
            return removedCount;
            
        } catch (error) {
            console.error('[UpgradeTreeCleanupManager] Error removing event listeners:', error);
            return 0;
        }
    }

    /**
     * Feature 2: DOM element pooling for frequently created/destroyed elements
     */
    createPooledElement(poolType, createElement) {
        try {
            // Check if we have a pooled element available
            if (this.elementPools[poolType] && this.elementPools[poolType].length > 0) {
                const pooledElement = this.elementPools[poolType].pop();
                this.memoryMetrics.elementsPooled++;
                
                // Reset element state
                this.resetPooledElement(pooledElement, poolType);
                
                console.log(`[UpgradeTreeCleanupManager] Reused pooled ${poolType} element`);
                return pooledElement;
            }
            
            // Create new element if pool is empty
            const newElement = createElement();
            if (newElement) {
                // Mark element as poolable
                newElement.setAttribute('data-pool-type', poolType);
                newElement.setAttribute('data-created-time', Date.now().toString());
                
                this.memoryMetrics.elementsCreated++;
                console.log(`[UpgradeTreeCleanupManager] Created new ${poolType} element (pool empty)`);
            }
            
            return newElement;
            
        } catch (error) {
            console.error('[UpgradeTreeCleanupManager] Error creating pooled element:', error);
            return null;
        }
    }

    returnElementToPool(element) {
        try {
            if (!element || !element.getAttribute) {
                return false;
            }
            
            const poolType = element.getAttribute('data-pool-type');
            if (!poolType || !this.elementPools[poolType]) {
                return false;
            }
            
            // Check pool size limits
            if (this.elementPools[poolType].length >= this.poolSizes[poolType]) {
                // Pool is full, destroy element
                this.destroyElement(element);
                return false;
            }
            
            // Clean element for reuse
            this.cleanElementForPooling(element);
            
            // Return to pool
            this.elementPools[poolType].push(element);
            
            console.log(`[UpgradeTreeCleanupManager] Returned ${poolType} element to pool`);
            return true;
            
        } catch (error) {
            console.error('[UpgradeTreeCleanupManager] Error returning element to pool:', error);
            return false;
        }
    }

    resetPooledElement(element, poolType) {
        if (!element) return;
        
        try {
            // Reset common properties
            element.className = '';
            element.innerHTML = '';
            element.style.cssText = '';
            element.removeAttribute('id');
            
            // Reset type-specific properties
            switch (poolType) {
                case 'upgradeChoice':
                    element.classList.add('upgrade-choice');
                    break;
                case 'statChange':
                    element.classList.add('stat-change');
                    break;
                case 'abilityTag':
                    element.classList.add('ability-tag');
                    break;
                case 'previewSection':
                    element.classList.add('preview-section');
                    break;
            }
            
        } catch (error) {
            console.warn('[UpgradeTreeCleanupManager] Error resetting pooled element:', error);
        }
    }

    cleanElementForPooling(element) {
        if (!element) return;
        
        try {
            // Remove all event listeners from element
            const listeners = this.activeEventListeners.get(element);
            if (listeners) {
                listeners.forEach(listenerData => {
                    element.removeEventListener(
                        listenerData.eventType,
                        listenerData.handler,
                        listenerData.options
                    );
                });
                this.activeEventListeners.delete(element);
            }
            
            // Remove from DOM if attached
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            
            // Clear references
            element.onclick = null;
            element.onmouseover = null;
            element.onmouseout = null;
            
        } catch (error) {
            console.warn('[UpgradeTreeCleanupManager] Error cleaning element for pooling:', error);
        }
    }

    destroyElement(element) {
        if (!element) return;
        
        try {
            // Clean for pooling first (removes listeners, etc.)
            this.cleanElementForPooling(element);
            
            // Remove all attributes
            if (element.attributes) {
                const attributes = Array.from(element.attributes);
                attributes.forEach(attr => {
                    element.removeAttribute(attr.name);
                });
            }
            
            this.memoryMetrics.elementsDestroyed++;
            console.log('[UpgradeTreeCleanupManager] Destroyed element');
            
        } catch (error) {
            console.warn('[UpgradeTreeCleanupManager] Error destroying element:', error);
        }
    }

    /**
     * Feature 3: Memory usage monitoring for upgrade tree operations
     */
    startMemoryMonitoring() {
        try {
            // Take initial memory snapshot
            this.takeMemorySnapshot('monitoring_start');
            
            // Set up periodic monitoring
            this.memoryMonitoringInterval = setInterval(() => {
                this.monitorMemoryUsage();
            }, 5000); // Check every 5 seconds
            
            // Use Performance Observer if available
            if ('PerformanceObserver' in window) {
                this.performanceObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (entry.entryType === 'measure' && entry.name.includes('upgrade-tree')) {
                            this.recordPerformanceMetric(entry);
                        }
                    });
                });
                
                this.performanceObserver.observe({ entryTypes: ['measure'] });
            }
            
            console.log('[UpgradeTreeCleanupManager] Started memory monitoring');
            
        } catch (error) {
            console.error('[UpgradeTreeCleanupManager] Error starting memory monitoring:', error);
        }
    }

    takeMemorySnapshot(label = 'snapshot') {
        try {
            const snapshot = {
                timestamp: Date.now(),
                label,
                metrics: { ...this.memoryMetrics },
                elementPools: Object.keys(this.elementPools).reduce((acc, key) => {
                    acc[key] = this.elementPools[key].length;
                    return acc;
                }, {}),
                activeListeners: this.memoryMetrics.currentListenerCount,
                domElementCount: document.getElementsByTagName('*').length
            };
            
            // Add heap information if available
            if (performance.memory) {
                snapshot.heapUsed = performance.memory.usedJSHeapSize;
                snapshot.heapTotal = performance.memory.totalJSHeapSize;
                snapshot.heapLimit = performance.memory.jsHeapSizeLimit;
            }
            
            this.memoryMetrics.memorySnapshots.push(snapshot);
            
            // Keep only last 20 snapshots to prevent memory leak
            if (this.memoryMetrics.memorySnapshots.length > 20) {
                this.memoryMetrics.memorySnapshots.shift();
            }
            
            return snapshot;
            
        } catch (error) {
            console.error('[UpgradeTreeCleanupManager] Error taking memory snapshot:', error);
            return null;
        }
    }

    monitorMemoryUsage() {
        try {
            const snapshot = this.takeMemorySnapshot('periodic_monitoring');
            
            // Check for memory leaks
            this.detectMemoryLeaks(snapshot);
            
            // Check pool health
            this.checkPoolHealth();
            
            // Log warnings if thresholds exceeded
            this.checkMemoryThresholds(snapshot);
            
        } catch (error) {
            console.error('[UpgradeTreeCleanupManager] Error in memory monitoring:', error);
        }
    }

    detectMemoryLeaks(currentSnapshot) {
        if (this.memoryMetrics.memorySnapshots.length < 2) return;
        
        const previousSnapshot = this.memoryMetrics.memorySnapshots[this.memoryMetrics.memorySnapshots.length - 2];
        
        // Check for increasing listener count
        if (currentSnapshot.activeListeners > previousSnapshot.activeListeners + 10) {
            console.warn('[UpgradeTreeCleanupManager] Potential event listener leak detected:', {
                previous: previousSnapshot.activeListeners,
                current: currentSnapshot.activeListeners
            });
        }
        
        // Check for DOM element growth
        const domGrowth = currentSnapshot.domElementCount - previousSnapshot.domElementCount;
        if (domGrowth > 50) {
            console.warn('[UpgradeTreeCleanupManager] Rapid DOM element growth detected:', {
                growth: domGrowth,
                total: currentSnapshot.domElementCount
            });
        }
        
        // Check heap usage if available
        if (currentSnapshot.heapUsed && previousSnapshot.heapUsed) {
            const heapGrowth = currentSnapshot.heapUsed - previousSnapshot.heapUsed;
            const growthPercentage = (heapGrowth / previousSnapshot.heapUsed) * 100;
            
            if (growthPercentage > 20) {
                console.warn('[UpgradeTreeCleanupManager] Significant heap growth detected:', {
                    growthMB: (heapGrowth / 1024 / 1024).toFixed(2),
                    growthPercentage: growthPercentage.toFixed(2)
                });
            }
        }
    }

    checkPoolHealth() {
        for (const [poolType, pool] of Object.entries(this.elementPools)) {
            const poolSize = pool.length;
            const maxSize = this.poolSizes[poolType];
            const utilizationRate = (maxSize - poolSize) / maxSize;
            
            if (utilizationRate > 0.8) {
                console.info(`[UpgradeTreeCleanupManager] High utilization for ${poolType} pool: ${(utilizationRate * 100).toFixed(1)}%`);
            }
        }
    }

    checkMemoryThresholds(snapshot) {
        // Check listener count threshold
        if (snapshot.activeListeners > 100) {
            console.warn('[UpgradeTreeCleanupManager] High event listener count:', snapshot.activeListeners);
        }
        
        // Check heap usage threshold (if available)
        if (snapshot.heapUsed) {
            const heapUsageMB = snapshot.heapUsed / 1024 / 1024;
            if (heapUsageMB > 100) {
                console.warn('[UpgradeTreeCleanupManager] High heap usage:', heapUsageMB.toFixed(2) + 'MB');
            }
        }
    }

    /**
     * Feature 4: Cleanup validation to ensure no dangling references remain
     */
    validateCleanupCompletion() {
        const startTime = performance.now();
        const validationResults = {
            passed: true,
            issues: [],
            warnings: [],
            metrics: {}
        };
        
        try {
            // Validate event listeners cleanup
            this.validateEventListenerCleanup(validationResults);
            
            // Validate DOM element cleanup
            this.validateDOMCleanup(validationResults);
            
            // Validate reference cleanup
            this.validateReferenceCleanup(validationResults);
            
            // Validate pool state
            this.validatePoolState(validationResults);
            
            // Record validation metrics
            validationResults.metrics = {
                validationTime: performance.now() - startTime,
                activeListeners: this.memoryMetrics.currentListenerCount,
                pooledElements: Object.values(this.elementPools).reduce((sum, pool) => sum + pool.length, 0),
                expectedCleanupItems: this.expectedCleanupItems.size
            };
            
            // Log results
            if (validationResults.passed) {
                console.log('[UpgradeTreeCleanupManager] Cleanup validation PASSED:', validationResults);
            } else {
                console.error('[UpgradeTreeCleanupManager] Cleanup validation FAILED:', validationResults);
            }
            
            return validationResults;
            
        } catch (error) {
            console.error('[UpgradeTreeCleanupManager] Error during cleanup validation:', error);
            validationResults.passed = false;
            validationResults.issues.push(`Validation error: ${error.message}`);
            return validationResults;
        }
    }

    validateEventListenerCleanup(results) {
        // Check for remaining tracked listeners
        if (this.activeEventListeners.size > 0) {
            results.passed = false;
            results.issues.push(`${this.activeEventListeners.size} event listeners not cleaned up`);
            
            // Log details for debugging
            for (const [element, listeners] of this.activeEventListeners) {
                console.warn('[UpgradeTreeCleanupManager] Uncleaned listeners on element:', element, listeners);
            }
        }
        
        // Check for remaining global listeners
        if (this.globalEventListeners.size > 0) {
            results.passed = false;
            results.issues.push(`${this.globalEventListeners.size} global event listeners not cleaned up`);
        }
    }

    validateDOMCleanup(results) {
        // Check for upgrade tree modal elements still in DOM
        const modalElements = document.querySelectorAll('[data-upgrade-tree-element]');
        if (modalElements.length > 0) {
            results.warnings.push(`${modalElements.length} upgrade tree elements still in DOM`);
            modalElements.forEach(element => {
                console.warn('[UpgradeTreeCleanupManager] Remaining DOM element:', element);
            });
        }
        
        // Check for elements with pool markers still attached to DOM
        const poolElements = document.querySelectorAll('[data-pool-type]');
        const attachedPoolElements = Array.from(poolElements).filter(el => el.parentNode);
        if (attachedPoolElements.length > 0) {
            results.warnings.push(`${attachedPoolElements.length} pooled elements still attached to DOM`);
        }
    }

    validateReferenceCleanup(results) {
        // Check game object references
        if (this.game.currentUpgradeDefense !== null) {
            results.issues.push('currentUpgradeDefense reference not cleared');
            results.passed = false;
        }
        
        if (this.game.selectedUpgradeChoice !== null) {
            results.issues.push('selectedUpgradeChoice reference not cleared');
            results.passed = false;
        }
        
        // Check expected cleanup items
        if (this.expectedCleanupItems.size > 0) {
            results.warnings.push(`${this.expectedCleanupItems.size} expected cleanup items not processed`);
        }
    }

    validatePoolState(results) {
        for (const [poolType, pool] of Object.entries(this.elementPools)) {
            // Check for null/undefined elements in pools
            const invalidElements = pool.filter(el => !el || !el.nodeType);
            if (invalidElements.length > 0) {
                results.issues.push(`${invalidElements.length} invalid elements in ${poolType} pool`);
                results.passed = false;
            }
            
            // Check for elements with remaining event listeners
            const elementsWithListeners = pool.filter(el => this.activeEventListeners.has(el));
            if (elementsWithListeners.length > 0) {
                results.issues.push(`${elementsWithListeners.length} pooled elements still have event listeners`);
                results.passed = false;
            }
        }
    }

    // Comprehensive cleanup method that uses all features
    performComprehensiveCleanup() {
        const startTime = performance.now();
        console.log('[UpgradeTreeCleanupManager] Starting comprehensive cleanup...');
        
        try {
            // Take pre-cleanup snapshot
            const preCleanupSnapshot = this.takeMemorySnapshot('pre_cleanup');
            
            // 1. Remove all event listeners
            const removedListeners = this.removeAllEventListeners();
            
            // 2. Clean up DOM elements and return to pools
            this.cleanupDOMElements();
            
            // 3. Clear game references
            this.clearGameReferences();
            
            // 4. Clear internal state
            this.clearInternalState();
            
            // Take post-cleanup snapshot
            const postCleanupSnapshot = this.takeMemorySnapshot('post_cleanup');
            
            // 5. Validate cleanup completion
            const validationResults = this.validateCleanupCompletion();
            
            // Update metrics
            const cleanupTime = performance.now() - startTime;
            this.updateCleanupMetrics(cleanupTime, validationResults.passed);
            
            console.log(`[UpgradeTreeCleanupManager] Comprehensive cleanup completed in ${cleanupTime.toFixed(2)}ms:`, {
                removedListeners,
                validationPassed: validationResults.passed,
                preCleanup: preCleanupSnapshot,
                postCleanup: postCleanupSnapshot
            });
            
            return {
                success: validationResults.passed,
                cleanupTime,
                removedListeners,
                validation: validationResults
            };
            
        } catch (error) {
            console.error('[UpgradeTreeCleanupManager] Error during comprehensive cleanup:', error);
            this.cleanupPerformanceMetrics.failedCleanupOperations++;
            return {
                success: false,
                error: error.message,
                cleanupTime: performance.now() - startTime
            };
        }
    }

    cleanupDOMElements() {
        // Find all upgrade tree related elements
        const upgradeElements = document.querySelectorAll('[data-upgrade-tree-element], [data-pool-type]');
        let returnedToPool = 0;
        let destroyed = 0;
        
        upgradeElements.forEach(element => {
            if (this.returnElementToPool(element)) {
                returnedToPool++;
            } else {
                this.destroyElement(element);
                destroyed++;
            }
        });
        
        console.log(`[UpgradeTreeCleanupManager] DOM cleanup: ${returnedToPool} returned to pool, ${destroyed} destroyed`);
    }

    clearGameReferences() {
        if (this.game) {
            this.game.currentUpgradeDefense = null;
            this.game.selectedUpgradeChoice = null;
            
            // Clear any other upgrade-related references
            if (this.game.upgradeTreeModalListeners) {
                delete this.game.upgradeTreeModalListeners;
            }
        }
    }

    clearInternalState() {
        // Clear expected cleanup items
        this.expectedCleanupItems.clear();
        
        // Clear dangling references map
        // Note: WeakMap clears itself when references are removed
        
        // Reset metrics counters (but keep history)
        this.memoryMetrics.modalCloseCount++;
        this.memoryMetrics.lastCleanupTime = Date.now();
        this.memoryMetrics.cleanupOperations++;
    }

    updateCleanupMetrics(cleanupTime, success = true) {
        this.cleanupPerformanceMetrics.totalCleanupOperations++;
        
        if (success) {
            // Update average cleanup time
            const totalOps = this.cleanupPerformanceMetrics.totalCleanupOperations;
            const currentAvg = this.cleanupPerformanceMetrics.averageCleanupTime;
            this.cleanupPerformanceMetrics.averageCleanupTime = 
                (currentAvg * (totalOps - 1) + cleanupTime) / totalOps;
            
            // Update max cleanup time
            this.cleanupPerformanceMetrics.maxCleanupTime = Math.max(
                this.cleanupPerformanceMetrics.maxCleanupTime,
                cleanupTime
            );
        } else {
            this.cleanupPerformanceMetrics.failedCleanupOperations++;
        }
    }

    // Helper methods
    initializeCleanupSystem() {
        // Initialize element pools
        for (const poolType of Object.keys(this.elementPools)) {
            this.elementPools[poolType] = [];
        }
        
        // Start memory monitoring
        this.startMemoryMonitoring();
        
        // Set up cleanup validation
        this.cleanupValidationEnabled = true;
    }

    recordPerformanceMetric(entry) {
        if (entry.duration > 16) { // Longer than one frame
            console.warn('[UpgradeTreeCleanupManager] Slow operation detected:', {
                name: entry.name,
                duration: entry.duration.toFixed(2) + 'ms'
            });
        }
    }

    // Public API methods
    getMemoryMetrics() {
        return {
            ...this.memoryMetrics,
            cleanupPerformance: this.cleanupPerformanceMetrics,
            poolStatus: Object.keys(this.elementPools).reduce((acc, key) => {
                acc[key] = {
                    size: this.elementPools[key].length,
                    maxSize: this.poolSizes[key],
                    utilization: ((this.poolSizes[key] - this.elementPools[key].length) / this.poolSizes[key] * 100).toFixed(1) + '%'
                };
                return acc;
            }, {})
        };
    }

    getLatestMemorySnapshot() {
        return this.memoryMetrics.memorySnapshots[this.memoryMetrics.memorySnapshots.length - 1] || null;
    }

    // Cleanup the cleanup manager itself
    destroy() {
        try {
            // Stop memory monitoring
            if (this.memoryMonitoringInterval) {
                clearInterval(this.memoryMonitoringInterval);
            }
            
            if (this.performanceObserver) {
                this.performanceObserver.disconnect();
            }
            
            // Perform final comprehensive cleanup
            this.performComprehensiveCleanup();
            
            // Clear all pools
            for (const poolType of Object.keys(this.elementPools)) {
                this.elementPools[poolType].forEach(element => this.destroyElement(element));
                this.elementPools[poolType] = [];
            }
            
            console.log('[UpgradeTreeCleanupManager] Cleanup manager destroyed');
            
        } catch (error) {
            console.error('[UpgradeTreeCleanupManager] Error destroying cleanup manager:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UpgradeTreeCleanupManager;
}
