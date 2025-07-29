// Dharmapala Shield - Achievement System

/**
 * Enhanced Atomic Operation Manager for thread-safe operations
 * Replaces simple boolean flags with proper semaphore-style locking
 */
class AtomicOperationManager {
    constructor() {
        this.locks = new Map(); // Named locks for different resources
        this.lockQueue = new Map(); // Queue of pending lock requests
        this.lockMetrics = {
            acquisitions: 0,
            timeouts: 0,
            averageWaitTime: 0,
            maxWaitTime: 0
        };
    }

    /**
     * Acquire a named lock with timeout and priority support
     */
    async acquireLock(lockName, timeout = 5000, priority = 0) {
        const startTime = Date.now();
        const lockId = `${lockName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Initialize lock tracking if not exists
            if (!this.locks.has(lockName)) {
                this.locks.set(lockName, { held: false, holder: null, queue: [] });
            }
            
            const lockInfo = this.locks.get(lockName);
            
            // If lock is available, acquire immediately
            if (!lockInfo.held) {
                return this._acquireImmediate(lockName, lockId, startTime);
            }
            
            // Add to queue with priority
            return this._queueLockRequest(lockName, lockId, timeout, priority, startTime);
            
        } catch (error) {
            console.error(`[AtomicOperationManager] Error acquiring lock ${lockName}:`, error);
            this.lockMetrics.timeouts++;
            return { acquired: false, lockId: null, error: error.message };
        }
    }

    /**
     * Release a named lock and process queue
     */
    async releaseLock(lockName, lockId) {
        try {
            const lockInfo = this.locks.get(lockName);
            if (!lockInfo || !lockInfo.held || lockInfo.holder !== lockId) {
                console.warn(`[AtomicOperationManager] Attempted to release lock ${lockName} with invalid ID ${lockId}`);
                return false;
            }

            lockInfo.held = false;
            lockInfo.holder = null;

            // Process next queued request
            await this._processLockQueue(lockName);
            
            return true;
        } catch (error) {
            console.error(`[AtomicOperationManager] Error releasing lock ${lockName}:`, error);
            return false;
        }
    }

    /**
     * Execute a function with automatic lock management
     */
    async withLock(lockName, asyncFunction, timeout = 5000) {
        const lockResult = await this.acquireLock(lockName, timeout);
        
        if (!lockResult.acquired) {
            throw new Error(`Failed to acquire lock ${lockName}: ${lockResult.error || 'timeout'}`);
        }

        try {
            const result = await asyncFunction();
            return result;
        } finally {
            await this.releaseLock(lockName, lockResult.lockId);
        }
    }

    _acquireImmediate(lockName, lockId, startTime) {
        const lockInfo = this.locks.get(lockName);
        lockInfo.held = true;
        lockInfo.holder = lockId;
        
        this.lockMetrics.acquisitions++;
        const waitTime = Date.now() - startTime;
        this._updateWaitTimeMetrics(waitTime);
        
        return { acquired: true, lockId, waitTime };
    }

    async _queueLockRequest(lockName, lockId, timeout, priority, startTime) {
        const lockInfo = this.locks.get(lockName);
        
        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                this._removeLockRequest(lockName, lockId);
                this.lockMetrics.timeouts++;
                resolve({ acquired: false, lockId: null, error: 'timeout' });
            }, timeout);

            const request = {
                lockId,
                priority,
                startTime,
                resolve: (result) => {
                    clearTimeout(timeoutId);
                    resolve(result);
                }
            };

            // Insert into queue based on priority
            lockInfo.queue.push(request);
            lockInfo.queue.sort((a, b) => b.priority - a.priority);
        });
    }

    async _processLockQueue(lockName) {
        const lockInfo = this.locks.get(lockName);
        if (!lockInfo || lockInfo.queue.length === 0) return;

        const nextRequest = lockInfo.queue.shift();
        lockInfo.held = true;
        lockInfo.holder = nextRequest.lockId;

        const waitTime = Date.now() - nextRequest.startTime;
        this._updateWaitTimeMetrics(waitTime);
        this.lockMetrics.acquisitions++;

        nextRequest.resolve({ acquired: true, lockId: nextRequest.lockId, waitTime });
    }

    _removeLockRequest(lockName, lockId) {
        const lockInfo = this.locks.get(lockName);
        if (lockInfo) {
            lockInfo.queue = lockInfo.queue.filter(req => req.lockId !== lockId);
        }
    }

    _updateWaitTimeMetrics(waitTime) {
        this.lockMetrics.maxWaitTime = Math.max(this.lockMetrics.maxWaitTime, waitTime);
        this.lockMetrics.averageWaitTime = 
            (this.lockMetrics.averageWaitTime * (this.lockMetrics.acquisitions - 1) + waitTime) / 
            this.lockMetrics.acquisitions;
    }

    getMetrics() {
        return { ...this.lockMetrics };
    }
}

/**
 * Enhanced Concurrency Manager for complex synchronization patterns
 */
class ConcurrencyManager {
    constructor() {
        this.semaphores = new Map();
        this.readWriteLocks = new Map();
        this.barriers = new Map();
    }

    /**
     * Create or get a semaphore with specified permit count
     */
    getSemaphore(name, permits = 1) {
        if (!this.semaphores.has(name)) {
            this.semaphores.set(name, new Semaphore(permits));
        }
        return this.semaphores.get(name);
    }

    /**
     * Create or get a read-write lock
     */
    getReadWriteLock(name) {
        if (!this.readWriteLocks.has(name)) {
            this.readWriteLocks.set(name, new ReadWriteLock());
        }
        return this.readWriteLocks.get(name);
    }

    /**
     * Create a barrier for coordinating multiple async operations
     */
    createBarrier(name, parties) {
        const barrier = new CyclicBarrier(parties);
        this.barriers.set(name, barrier);
        return barrier;
    }
}

/**
 * Semaphore implementation for controlling resource access
 */
class Semaphore {
    constructor(permits) {
        this.permits = permits;
        this.available = permits;
        this.queue = [];
    }

    async acquire(timeout = 5000) {
        if (this.available > 0) {
            this.available--;
            return { acquired: true };
        }

        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                const index = this.queue.findIndex(item => item.resolve === resolve);
                if (index !== -1) {
                    this.queue.splice(index, 1);
                }
                resolve({ acquired: false, error: 'timeout' });
            }, timeout);

            this.queue.push({
                resolve: (result) => {
                    clearTimeout(timeoutId);
                    resolve(result);
                }
            });
        });
    }

    release() {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            next.resolve({ acquired: true });
        } else {
            this.available = Math.min(this.available + 1, this.permits);
        }
    }

    async withPermit(asyncFunction, timeout = 5000) {
        const result = await this.acquire(timeout);
        if (!result.acquired) {
            throw new Error('Failed to acquire semaphore permit');
        }

        try {
            return await asyncFunction();
        } finally {
            this.release();
        }
    }
}

/**
 * Read-Write Lock for reader-writer synchronization
 */
class ReadWriteLock {
    constructor() {
        this.readers = 0;
        this.writer = false;
        this.readerQueue = [];
        this.writerQueue = [];
    }

    async acquireRead(timeout = 5000) {
        if (!this.writer && this.writerQueue.length === 0) {
            this.readers++;
            return { acquired: true };
        }

        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                const index = this.readerQueue.findIndex(item => item.resolve === resolve);
                if (index !== -1) {
                    this.readerQueue.splice(index, 1);
                }
                resolve({ acquired: false, error: 'timeout' });
            }, timeout);

            this.readerQueue.push({
                resolve: (result) => {
                    clearTimeout(timeoutId);
                    resolve(result);
                }
            });
        });
    }

    async acquireWrite(timeout = 5000) {
        if (!this.writer && this.readers === 0) {
            this.writer = true;
            return { acquired: true };
        }

        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                const index = this.writerQueue.findIndex(item => item.resolve === resolve);
                if (index !== -1) {
                    this.writerQueue.splice(index, 1);
                }
                resolve({ acquired: false, error: 'timeout' });
            }, timeout);

            this.writerQueue.push({
                resolve: (result) => {
                    clearTimeout(timeoutId);
                    resolve(result);
                }
            });
        });
    }

    releaseRead() {
        if (this.readers > 0) {
            this.readers--;
            if (this.readers === 0 && this.writerQueue.length > 0) {
                const next = this.writerQueue.shift();
                this.writer = true;
                next.resolve({ acquired: true });
            }
        }
    }

    releaseWrite() {
        if (this.writer) {
            this.writer = false;
            
            // Prioritize readers
            if (this.readerQueue.length > 0) {
                while (this.readerQueue.length > 0 && !this.writer) {
                    const next = this.readerQueue.shift();
                    this.readers++;
                    next.resolve({ acquired: true });
                }
            } else if (this.writerQueue.length > 0) {
                const next = this.writerQueue.shift();
                this.writer = true;
                next.resolve({ acquired: true });
            }
        }
    }
}

/**
 * Enhanced Event Deduplicator with improved edge case handling
 */
class EnhancedEventDeduplicator {
    constructor() {
        this.eventHistory = new Map(); // Track events by type
        this.deduplicationWindows = new Map(); // Custom windows per event type
        this.hashCache = new Map(); // Cache event hashes for performance
        this.metrics = {
            totalEvents: 0,
            duplicatesFiltered: 0,
            uniqueEvents: 0,
            hashCollisions: 0
        };
        
        // Default deduplication windows (ms)
        this.defaultWindows = {
            'enemy_killed': 50,      // Fast combat events
            'defense_placed': 100,   // Building events
            'level_completed': 1000, // Major events
            'resource_gained': 200,  // Resource events
            'default': 100
        };
    }

    /**
     * Enhanced deduplication with multiple strategies for edge cases
     */
    deduplicateEvents(eventType, events) {
        const startTime = Date.now();
        const window = this.deduplicationWindows.get(eventType) || this.defaultWindows[eventType] || this.defaultWindows.default;
        
        // Clean old entries first
        this._cleanOldEntries(eventType, startTime, window * 10);
        
        const uniqueEvents = [];
        const seenHashes = new Set();
        
        // Sort events by timestamp for consistent processing
        const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
        
        for (const event of sortedEvents) {
            this.metrics.totalEvents++;
            
            // Generate multiple hash strategies for robust deduplication
            const hashes = this._generateEventHashes(event);
            const isDuplicate = this._checkForDuplicates(eventType, event, hashes, window, seenHashes);
            
            if (!isDuplicate) {
                uniqueEvents.push(event);
                this.metrics.uniqueEvents++;
                
                // Store event signatures for future deduplication
                this._storeEventSignature(eventType, event, hashes, startTime);
                hashes.forEach(hash => seenHashes.add(hash));
            } else {
                this.metrics.duplicatesFiltered++;
            }
        }
        
        console.log(`[EnhancedEventDeduplicator] Processed ${events.length} events, kept ${uniqueEvents.length} unique events for ${eventType}`);
        return uniqueEvents;
    }

    /**
     * Generate multiple hash strategies for robust duplicate detection
     */
    _generateEventHashes(event) {
        const hashes = [];
        
        try {
            // Strategy 1: Timestamp + data hash (exact duplicates)
            const exactHash = this._hashEventExact(event);
            hashes.push({ type: 'exact', hash: exactHash, weight: 1.0 });
            
            // Strategy 2: Timestamp window + semantic data (near duplicates)
            const semanticHash = this._hashEventSemantic(event);
            hashes.push({ type: 'semantic', hash: semanticHash, weight: 0.8 });
            
            // Strategy 3: Data-only hash (ignoring minor timestamp differences)
            const dataHash = this._hashEventDataOnly(event);
            hashes.push({ type: 'data_only', hash: dataHash, weight: 0.6 });
            
            // Strategy 4: Lossy hash for very similar events
            const lossyHash = this._hashEventLossy(event);
            hashes.push({ type: 'lossy', hash: lossyHash, weight: 0.4 });
            
        } catch (error) {
            console.error('[EnhancedEventDeduplicator] Error generating hashes:', error);
            // Fallback to simple hash
            hashes.push({ type: 'fallback', hash: JSON.stringify(event).replace(/\s/g, ''), weight: 0.5 });
        }
        
        return hashes;
    }

    _hashEventExact(event) {
        return this._simpleHash(`${event.timestamp}_${JSON.stringify(event.eventData)}_${event.eventType}`);
    }

    _hashEventSemantic(event) {
        // Round timestamp to 10ms intervals for semantic similarity
        const roundedTimestamp = Math.floor(event.timestamp / 10) * 10;
        const semanticData = this._extractSemanticData(event.eventData);
        return this._simpleHash(`${roundedTimestamp}_${JSON.stringify(semanticData)}_${event.eventType}`);
    }

    _hashEventDataOnly(event) {
        return this._simpleHash(`${JSON.stringify(event.eventData)}_${event.eventType}`);
    }

    _hashEventLossy(event) {
        // Create lossy representation focusing on key fields
        const lossyData = {
            type: event.eventType,
            amount: Math.floor((event.eventData?.amount || 1) / 10) * 10, // Round to nearest 10
            success: event.eventData?.success,
            value: event.eventData?.value ? Math.floor(event.eventData.value / 100) * 100 : undefined
        };
        
        return this._simpleHash(JSON.stringify(lossyData));
    }

    _extractSemanticData(eventData) {
        if (!eventData) return {};
        
        // Extract semantically important fields
        return {
            amount: eventData.amount,
            success: eventData.success,
            type: eventData.type,
            level: eventData.level,
            score: eventData.score
        };
    }

    _checkForDuplicates(eventType, event, hashes, window, seenHashes) {
        const eventHistory = this.eventHistory.get(eventType) || [];
        const currentTime = event.timestamp;
        
        // Check against current batch first (exact duplicates)
        for (const hashInfo of hashes) {
            if (seenHashes.has(hashInfo.hash)) {
                return true;
            }
        }
        
        // Check against historical events within time window
        for (const historicalEvent of eventHistory) {
            const timeDiff = Math.abs(currentTime - historicalEvent.timestamp);
            if (timeDiff > window) continue;
            
            // Compare with different strategies and thresholds
            for (const hashInfo of hashes) {
                for (const historicalHash of historicalEvent.hashes) {
                    if (hashInfo.hash === historicalHash.hash) {
                        // Apply confidence scoring based on hash type and time proximity
                        const timeScore = Math.max(0, 1 - (timeDiff / window));
                        const confidence = hashInfo.weight * historicalHash.weight * timeScore;
                        
                        if (confidence > 0.7) { // Configurable threshold
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }

    _storeEventSignature(eventType, event, hashes, currentTime) {
        if (!this.eventHistory.has(eventType)) {
            this.eventHistory.set(eventType, []);
        }
        
        const history = this.eventHistory.get(eventType);
        history.push({
            timestamp: event.timestamp,
            hashes: hashes,
            storedAt: currentTime
        });
        
        // Limit history size to prevent memory bloat
        if (history.length > 1000) {
            history.splice(0, history.length - 500); // Keep last 500 entries
        }
    }

    _cleanOldEntries(eventType, currentTime, maxAge) {
        const history = this.eventHistory.get(eventType);
        if (!history) return;
        
        const cutoffTime = currentTime - maxAge;
        const filteredHistory = history.filter(entry => entry.storedAt > cutoffTime);
        
        if (filteredHistory.length !== history.length) {
            this.eventHistory.set(eventType, filteredHistory);
        }
    }

    _simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return hash.toString(36);
    }

    /**
     * Set custom deduplication window for specific event types
     */
    setDeduplicationWindow(eventType, windowMs) {
        this.deduplicationWindows.set(eventType, windowMs);
    }

    /**
     * Get deduplication metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            filterRate: this.metrics.totalEvents > 0 ? 
                (this.metrics.duplicatesFiltered / this.metrics.totalEvents) : 0
        };
    }

    /**
     * Reset metrics and clear caches
     */
    reset() {
        this.eventHistory.clear();
        this.hashCache.clear();
        this.metrics = {
            totalEvents: 0,
            duplicatesFiltered: 0,
            uniqueEvents: 0,
            hashCollisions: 0
        };
    }
}

class AchievementManager {
    constructor(saveSystem, audioManager) {
        try {
            this.saveSystem = saveSystem;
            this.audioManager = audioManager;
            
            // Achievement tracking
            this.achievements = {};
            this.unlockedAchievements = new Set();
            this.progressTracking = {};
            this.recentUnlocks = [];
            this.sessionStats = {};
            
            // Notification system
            this.notificationQueue = [];
            this.isShowingNotification = false;
            
            // ===== LIGHTWEIGHT MODE CONFIGURATION =====
            this.lightweightMode = true; // Enable by default for real-time games
            
            if (this.lightweightMode) {
                // Lightweight mode: Simple immediate processing
                this.realtimeProcessing = true;
                this.asyncNotifications = false; // Optional async notifications
                
                // Lightweight deduplication (simple hash-based)
                this.simpleDeduplication = new Map(); // eventType -> Set<hash>
                this.deduplicationWindow = 100; // 100ms window
                
                // Performance monitoring
                this.performanceMonitor = {
                    enabled: true,
                    processingTimes: [],
                    maxFrameImpact: 2, // Max 2ms per frame
                    warnings: 0,
                    avgProcessingTime: 0
                };
                
                console.log('[AchievementManager] Initialized in LIGHTWEIGHT MODE for real-time games');
            } else {
                // Legacy complex mode (preserved for backwards compatibility)
                this.eventQueue = [];
                this.processingEvents = false;
                this.batchSize = 10;
                this.batchInterval = 50;
                
                this.atomicOperations = new AtomicOperationManager();
                this.concurrencyManager = new ConcurrencyManager();
                this.eventDeduplication = new EnhancedEventDeduplicator();
                this.progressUpdateBuffer = new Map();
                this.lastProcessedEvents = new Map();
                
                this.atomicMetrics = {
                    lockAcquisitions: 0,
                    lockTimeouts: 0,
                    lockContentions: 0,
                    averageLockHoldTime: 0,
                    duplicateEventsFiltered: 0,
                    lastResetTime: Date.now()
                };
                
                this.startEventProcessing();
                console.log('[AchievementManager] Initialized in COMPLEX MODE with concurrency controls');
            }
            
            // Initialize achievements and load progress
            this.initializeAchievements();
            this.loadProgress();
            
            console.log('[AchievementManager] Initialized with', Object.keys(this.achievements).length, 'achievements');
        } catch (error) {
            console.error('[AchievementManager] Constructor failed:', error);
            // Initialize minimal fallback state
            this.achievements = {};
            this.unlockedAchievements = new Set();
            this.progressTracking = {};
            this.recentUnlocks = [];
            this.sessionStats = {};
            this.notificationQueue = [];
            this.isShowingNotification = false;
            this.lightweightMode = true;
            this.realtimeProcessing = true;
            this.simpleDeduplication = new Map();
            this.performanceMonitor = {
                enabled: true,
                processingTimes: [],
                maxFrameImpact: 2,
                warnings: 0,
                avgProcessingTime: 0
            };
        }
    }
    
    // General error logging method
    logError(method, error, context = null) {
        const errorMessage = `[AchievementManager.${method}] Error: ${error.message}`;
        console.error(errorMessage, error);
        
        if (context) {
            console.error(`[AchievementManager.${method}] Context:`, context);
        }
        
        // Could send to error tracking service here in the future
        // errorTracker.report(errorMessage, { method, context, stack: error.stack });
    }

    // ============================================================================
    // LIGHTWEIGHT EVENT PROCESSING SYSTEM
    // ============================================================================

    /**
     * Process event immediately (synchronous) for lightweight mode
     */
    processEventImmediate(eventType, eventData = {}) {
        if (!this.lightweightMode) {
            // Fallback to complex mode
            return this.queueEventForProcessing(eventType, eventData);
        }

        const startTime = performance.now();
        
        try {
            // Simple validation
            if (!eventType || typeof eventType !== 'string') {
                console.warn('[AchievementManager] Invalid eventType:', eventType);
                return;
            }

            // Simple deduplication check
            if (!this.isDuplicateEventSimple(eventType, eventData)) {
                // Process achievements synchronously
                this.processAchievementsSync(eventType, eventData);
            }

            // Performance monitoring
            const processingTime = performance.now() - startTime;
            this.updatePerformanceMonitor(processingTime);

        } catch (error) {
            console.error('[AchievementManager] Error in immediate processing:', error);
        }
    }

    /**
     * Simple duplicate detection for lightweight mode (no complex hashing)
     */
    isDuplicateEventSimple(eventType, eventData) {
        if (!this.simpleDeduplication.has(eventType)) {
            this.simpleDeduplication.set(eventType, new Set());
        }

        const eventSet = this.simpleDeduplication.get(eventType);
        const eventHash = this.createSimpleEventHash(eventType, eventData);
        
        if (eventSet.has(eventHash)) {
            return true; // Duplicate
        }

        // Add to tracking with size limit
        eventSet.add(eventHash);
        if (eventSet.size > 100) {
            // Keep only latest 50 events for memory efficiency
            const eventArray = Array.from(eventSet);
            eventSet.clear();
            eventArray.slice(-50).forEach(hash => eventSet.add(hash));
        }

        return false;
    }

    /**
     * Create simple hash for event deduplication
     */
    createSimpleEventHash(eventType, eventData) {
        const timestamp = Math.floor(Date.now() / this.deduplicationWindow) * this.deduplicationWindow;
        const dataStr = JSON.stringify(eventData);
        return `${eventType}_${timestamp}_${dataStr}`;
    }

    /**
     * Process achievements synchronously for real-time performance
     */
    processAchievementsSync(eventType, eventData) {
        let processedCount = 0;
        let unlockedCount = 0;

        // Process all matching achievements immediately
        Object.values(this.achievements).forEach(achievement => {
            try {
                // Skip already unlocked
                if (this.unlockedAchievements.has(achievement.id)) return;
                
                // Skip non-matching events
                if (achievement.condition.event !== eventType) return;
                
                processedCount++;
                const shouldUnlock = this.checkAchievementConditionSync(achievement, eventData);
                
                if (shouldUnlock) {
                    this.unlockAchievement(achievement.id);
                    unlockedCount++;
                }
                
            } catch (error) {
                console.error(`[AchievementManager] Error processing ${achievement.id}:`, error);
            }
        });

        if (processedCount > 0) {
            console.log(`[AchievementManager] Processed ${processedCount} achievements for ${eventType}, unlocked ${unlockedCount}`);
        }
    }

    /**
     * Check achievement condition synchronously
     */
    checkAchievementConditionSync(achievement, eventData) {
        try {
            switch (achievement.condition.type) {
                case 'single_event':
                    return this.checkSingleEventSync(achievement, eventData);
                    
                case 'cumulative':
                    return this.checkCumulativeSync(achievement, eventData);
                    
                case 'streak':
                    return this.checkStreakSync(achievement, eventData);
                    
                default:
                    console.warn(`[AchievementManager] Unknown condition type: ${achievement.condition.type}`);
                    return false;
            }
        } catch (error) {
            console.error(`[AchievementManager] Error checking condition for ${achievement.id}:`, error);
            return false;
        }
    }

    /**
     * Check single event achievement (synchronous)
     */
    checkSingleEventSync(achievement, eventData) {
        if (achievement.condition.target !== undefined) {
            const value = eventData.value || eventData.amount || 1;
            return value >= achievement.condition.target;
        }
        return true; // Simple trigger
    }

    /**
     * Check cumulative achievement (synchronous)
     */
    checkCumulativeSync(achievement, eventData) {
        if (typeof achievement.condition.target !== 'number') {
            return false;
        }

        const amount = eventData.amount || 1;
        const currentProgress = this.progressTracking[achievement.id] || 0;
        const newProgress = currentProgress + amount;
        
        // Update progress immediately
        this.progressTracking[achievement.id] = newProgress;
        
        return newProgress >= achievement.condition.target;
    }

    /**
     * Check streak achievement (synchronous)
     */
    checkStreakSync(achievement, eventData) {
        const streakKey = `${achievement.id}_streak`;
        let currentStreak = this.progressTracking[streakKey] || 0;
        
        if (eventData.success === true) {
            currentStreak++;
        } else if (eventData.success === false) {
            currentStreak = 0;
        }
        
        // Update streak immediately
        this.progressTracking[streakKey] = currentStreak;
        
        return currentStreak >= achievement.condition.target;
    }

    /**
     * Update performance monitoring
     */
    updatePerformanceMonitor(processingTime) {
        if (!this.performanceMonitor.enabled) return;

        this.performanceMonitor.processingTimes.push(processingTime);
        
        // Keep only last 100 measurements
        if (this.performanceMonitor.processingTimes.length > 100) {
            this.performanceMonitor.processingTimes.shift();
        }

        // Calculate average
        const times = this.performanceMonitor.processingTimes;
        this.performanceMonitor.avgProcessingTime = 
            times.reduce((sum, time) => sum + time, 0) / times.length;

        // Check for frame rate impact
        if (processingTime > this.performanceMonitor.maxFrameImpact) {
            this.performanceMonitor.warnings++;
            console.warn(`[AchievementManager] Processing took ${processingTime.toFixed(2)}ms (>${this.performanceMonitor.maxFrameImpact}ms threshold)`);
        }
    }

    /**
     * Get performance metrics for monitoring
     */
    getPerformanceMetrics() {
        if (!this.performanceMonitor.enabled) {
            return { enabled: false };
        }

        const times = this.performanceMonitor.processingTimes;
        return {
            enabled: true,
            avgProcessingTime: this.performanceMonitor.avgProcessingTime,
            maxProcessingTime: Math.max(...times),
            minProcessingTime: Math.min(...times),
            totalWarnings: this.performanceMonitor.warnings,
            sampleCount: times.length,
            frameImpactThreshold: this.performanceMonitor.maxFrameImpact
        };
    }

    /**
     * Reset performance monitoring
     */
    resetPerformanceMonitor() {
        this.performanceMonitor.processingTimes = [];
        this.performanceMonitor.warnings = 0;
        this.performanceMonitor.avgProcessingTime = 0;
    }

    /**
     * Enable/disable lightweight mode for real-time performance
     */
    setLightweightMode(enabled = true) {
        const wasLightweight = this.lightweightMode;
        this.lightweightMode = enabled;
        
        if (enabled && !wasLightweight) {
            // Switching TO lightweight mode
            console.log('[AchievementManager] Switched to LIGHTWEIGHT MODE - real-time synchronous processing');
            
            // Stop complex processing if it was running
            if (this.processingEvents) {
                this.stopEventProcessing();
            }
            
            // Initialize lightweight structures if needed
            if (!this.simpleDeduplication) {
                this.simpleDeduplication = new Map();
            }
            if (!this.performanceMonitor) {
                this.performanceMonitor = {
                    enabled: true,
                    processingTimes: [],
                    maxFrameImpact: 2,
                    warnings: 0,
                    avgProcessingTime: 0
                };
            }
            
        } else if (!enabled && wasLightweight) {
            // Switching TO complex mode
            console.log('[AchievementManager] Switched to COMPLEX MODE - concurrent batch processing');
            
            // Initialize complex structures if needed
            if (!this.eventQueue) {
                this.eventQueue = [];
                this.processingEvents = false;
                this.batchSize = 10;
                this.batchInterval = 50;
                
                this.atomicOperations = new AtomicOperationManager();
                this.concurrencyManager = new ConcurrencyManager();
                this.eventDeduplication = new EnhancedEventDeduplicator();
                this.progressUpdateBuffer = new Map();
                this.lastProcessedEvents = new Map();
                
                this.atomicMetrics = {
                    lockAcquisitions: 0,
                    lockTimeouts: 0,
                    lockContentions: 0,
                    averageLockHoldTime: 0,
                    duplicateEventsFiltered: 0,
                    lastResetTime: Date.now()
                };
            }
            
            // Start complex processing
            this.startEventProcessing();
        }
        
        return this.lightweightMode;
    }

    /**
     * Enable/disable async notifications (for lightweight mode)
     */
    setAsyncNotifications(enabled = false) {
        this.asyncNotifications = enabled;
        console.log(`[AchievementManager] Async notifications ${enabled ? 'ENABLED' : 'DISABLED'}`);
        return this.asyncNotifications;
    }

    /**
     * Get current processing mode information
     */
    getProcessingMode() {
        return {
            lightweightMode: this.lightweightMode,
            realtimeProcessing: this.realtimeProcessing,
            asyncNotifications: this.asyncNotifications,
            performanceMonitoring: this.performanceMonitor?.enabled || false,
            activeFeatures: this.lightweightMode ? 
                ['immediate_processing', 'simple_deduplication', 'performance_monitoring'] :
                ['concurrent_processing', 'atomic_operations', 'enhanced_deduplication', 'batch_processing']
        };
    }

    /**
     * Get simplified metrics for lightweight mode
     */
    getSimplifiedMetrics() {
        if (this.lightweightMode) {
            return {
                mode: 'lightweight',
                performance: this.getPerformanceMetrics(),
                achievements: {
                    total: Object.keys(this.achievements).length,
                    unlocked: this.unlockedAchievements.size,
                    progress: Object.keys(this.progressTracking).length
                },
                deduplication: {
                    trackedEventTypes: this.simpleDeduplication.size,
                    totalTrackedEvents: Array.from(this.simpleDeduplication.values())
                        .reduce((sum, set) => sum + set.size, 0)
                }
            };
        } else {
            // Return complex metrics if available
            return this.getAtomicOperationMetrics && this.getAtomicOperationMetrics() || { mode: 'complex', available: false };
        }
    }

    // ============================================================================
    // COMPLEX MODE COMPATIBILITY METHODS
    // ============================================================================

    /**
     * Start the event processing loop for handling batched events (complex mode only)
     */
    startEventProcessing() {
        if (this.lightweightMode) {
            console.log('[AchievementManager] Event processing not needed in lightweight mode');
            return;
        }

        try {
            if (this.processingEvents) {
                console.warn('[AchievementManager] Event processing already started');
                return;
            }

            this.processingEvents = true;
            this.processEventBatch();
            console.log('[AchievementManager] Event processing loop started');
        } catch (error) {
            this.logError('startEventProcessing', error);
        }
    }

    /**
     * Stop the event processing loop (complex mode only)
     */
    stopEventProcessing() {
        if (this.lightweightMode) {
            console.log('[AchievementManager] Event processing not active in lightweight mode');
            return;
        }

        try {
            this.processingEvents = false;
            console.log('[AchievementManager] Event processing loop stopped');
        } catch (error) {
            this.logError('stopEventProcessing', error);
        }
    }

    /**
     * Process a batch of events from the queue (complex mode only)
     */
    async processEventBatch() {
        if (!this.processingEvents || this.lightweightMode) return;

        try {
            if (this.eventQueue && this.eventQueue.length > 0) {
                console.log(`[AchievementManager] Processing batch of ${Math.min(this.batchSize, this.eventQueue.length)} events`);
                // Complex batch processing logic would go here
                // For now, just clear the queue to prevent buildup
                this.eventQueue = [];
            }
        } catch (error) {
            this.logError('processEventBatch', error);
        } finally {
            // Schedule next batch processing regardless of errors
            if (this.processingEvents) {
                setTimeout(() => this.processEventBatch(), this.batchInterval);
            }
        }
    }

    /**
     * Queue an event for batched processing with enhanced deduplication and validation
     */
    queueEventForProcessing(eventType, eventData = {}) {
        try {
            // Validate input
            if (!eventType || typeof eventType !== 'string') {
                console.error('[AchievementManager] Invalid eventType for queueing:', eventType);
                return false;
            }

            // Enhanced double-counting prevention with content-aware hashing
            const currentTime = Date.now();
            const contentHash = this._generateQuickEventHash(eventType, eventData, currentTime);
            const lastProcessed = this.lastProcessedEvents.get(contentHash);
            
            if (lastProcessed && (currentTime - lastProcessed) < 50) {
                console.log(`[AchievementManager] Preventing double-counting for ${eventType} (duplicate within ${currentTime - lastProcessed}ms)`);
                return false;
            }

            // Create enhanced event object with unique identifier
            const event = {
                eventType,
                eventData: this._normalizeEventData(eventData),
                timestamp: currentTime,
                id: `${eventType}_${currentTime}_${Math.random().toString(36).substr(2, 9)}`,
                queuedAt: currentTime,
                contentHash: contentHash,
                priority: this._calculateEventPriority(eventType, eventData)
            };

            // Add to queue with priority-based insertion
            this._insertEventByPriority(event);
            
            // Update tracking
            this.lastProcessedEvents.set(contentHash, currentTime);

            // Cleanup old processed events with improved strategy
            this._cleanupProcessedEventTracking(currentTime);

            console.log(`[AchievementManager] Queued ${eventType} event (queue size: ${this.eventQueue.length}, priority: ${event.priority})`);
            return true;
            
        } catch (error) {
            this.logError('queueEventForProcessing', error, { eventType, eventData });
            return false;
        }
    }

    /**
     * Generate quick hash for immediate duplicate detection
     */
    _generateQuickEventHash(eventType, eventData, timestamp) {
        // Create hash based on event type, key data fields, and rounded timestamp
        const roundedTime = Math.floor(timestamp / 25) * 25; // 25ms precision
        const keyData = {
            type: eventType,
            amount: eventData?.amount,
            success: eventData?.success,
            level: eventData?.level,
            value: eventData?.value
        };
        
        const hashInput = `${roundedTime}_${JSON.stringify(keyData)}`;
        return this._simpleHash(hashInput);
    }

    /**
     * Normalize event data to prevent minor variations from being treated as different events
     */
    _normalizeEventData(eventData) {
        if (!eventData || typeof eventData !== 'object') {
            return {};
        }

        const normalized = {};
        
        // Normalize numeric values
        if (typeof eventData.amount === 'number') {
            normalized.amount = Math.round(eventData.amount * 100) / 100; // Round to 2 decimal places
        }
        
        if (typeof eventData.value === 'number') {
            normalized.value = Math.round(eventData.value * 100) / 100;
        }

        // Copy other relevant fields
        ['success', 'level', 'type', 'target', 'difficulty'].forEach(field => {
            if (eventData[field] !== undefined) {
                normalized[field] = eventData[field];
            }
        });

        return normalized;
    }

    /**
     * Calculate event priority for queue ordering
     */
    _calculateEventPriority(eventType, eventData) {
        // Higher priority for critical events
        const priorities = {
            'level_completed': 10,
            'boss_defeated': 9,
            'achievement_unlocked': 8,
            'perfect_wave': 7,
            'defense_placed': 5,
            'enemy_killed': 3,
            'resource_gained': 2,
            'default': 1
        };

        let basePriority = priorities[eventType] || priorities.default;
        
        // Boost priority for high-value events
        if (eventData?.value && eventData.value > 1000) {
            basePriority += 2;
        }
        
        if (eventData?.success === true) {
            basePriority += 1;
        }

        return basePriority;
    }

    /**
     * Insert event into queue based on priority
     */
    _insertEventByPriority(event) {
        // For now, just append - could implement priority queue later if needed
        // Priority is mainly used for processing order within batches
        this.eventQueue.push(event);
        
        // If queue is getting large, sort by priority
        if (this.eventQueue.length > 50) {
            this.eventQueue.sort((a, b) => (b.priority || 1) - (a.priority || 1));
        }
    }

    /**
     * Enhanced cleanup of processed event tracking
     */
    _cleanupProcessedEventTracking(currentTime) {
        if (this.lastProcessedEvents.size <= 500) return; // Only cleanup when needed

        const cutoffTime = currentTime - 30000; // 30 second window
        const toDelete = [];
        
        for (const [hash, timestamp] of this.lastProcessedEvents) {
            if (timestamp < cutoffTime) {
                toDelete.push(hash);
            }
        }
        
        toDelete.forEach(hash => this.lastProcessedEvents.delete(hash));
        
        if (toDelete.length > 0) {
            console.log(`[AchievementManager] Cleaned up ${toDelete.length} old event tracking entries`);
        }
    }

    /**
     * Simple hash function for event content hashing
     */
    _simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash.toString(36);
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return hash.toString(36);
    }
    
    initializeAchievements() {
        try {
            // Define all achievements
            this.achievements = {
            // First Steps Category
            'first_defense': {
                id: 'first_defense',
                name: 'Digital Monk',
                description: 'Place your first defense',
                category: 'first_steps',
                icon: '🛡️',
                condition: { type: 'single_event', event: 'defense_placed' },
                reward: { dharma: 10 },
                hidden: false
            },
            
            'tutorial_complete': {
                id: 'tutorial_complete',
                name: 'Enlightened Initiate',
                description: 'Complete the tutorial',
                category: 'first_steps',
                icon: '📚',
                condition: { type: 'single_event', event: 'tutorial_completed' },
                reward: { dharma: 25 },
                hidden: false
            },
            
            'first_level': {
                id: 'first_level',
                name: 'Path Walker',
                description: 'Complete your first level',
                category: 'first_steps',
                icon: '🚶‍♂️',
                condition: { type: 'single_event', event: 'level_completed' },
                reward: { dharma: 50 },
                hidden: false
            },
            
            // Combat Mastery Category
            'enemy_hunter_10': {
                id: 'enemy_hunter_10',
                name: 'Script Slayer',
                description: 'Eliminate 10 enemies',
                category: 'combat',
                icon: '⚔️',
                condition: { type: 'cumulative', event: 'enemy_killed', target: 10 },
                reward: { dharma: 20 },
                hidden: false
            },
            
            'enemy_hunter_100': {
                id: 'enemy_hunter_100',
                name: 'Code Crusher',
                description: 'Eliminate 100 enemies',
                category: 'combat',
                icon: '🗡️',
                condition: { type: 'cumulative', event: 'enemy_killed', target: 100 },
                reward: { dharma: 100 },
                hidden: false
            },
            
            'perfect_wave': {
                id: 'perfect_wave',
                name: 'Digital Perfection',
                description: 'Complete a wave without losing any resources',
                category: 'combat',
                icon: '⭐',
                condition: { type: 'single_event', event: 'perfect_wave' },
                reward: { dharma: 30 },
                hidden: false
            },
            
            'boss_slayer': {
                id: 'boss_slayer',
                name: 'Corporate Nemesis',
                description: 'Defeat your first boss',
                category: 'combat',
                icon: '👑',
                condition: { type: 'single_event', event: 'boss_defeated' },
                reward: { dharma: 75, bandwidth: 10 },
                hidden: false
            },
            
            'multi_boss': {
                id: 'multi_boss',
                name: 'Titan Slayer',
                description: 'Defeat 5 bosses',
                category: 'combat',
                icon: '🏆',
                condition: { type: 'cumulative', event: 'boss_defeated', target: 5 },
                reward: { dharma: 200, bandwidth: 25, anonymity: 5 },
                hidden: false
            },
            
            // Strategic Genius Category
            'efficient_spender': {
                id: 'efficient_spender',
                name: 'Resource Sage',
                description: 'Complete a level spending less than 200 Dharma',
                category: 'strategy',
                icon: '💎',
                condition: { type: 'single_event', event: 'efficient_completion' },
                reward: { dharma: 40, bandwidth: 15 },
                hidden: false
            },
            
            'upgrade_master': {
                id: 'upgrade_master',
                name: 'Enhancement Expert',
                description: 'Upgrade a defense to maximum level',
                category: 'strategy',
                icon: '⬆️',
                condition: { type: 'single_event', event: 'max_level_upgrade' },
                reward: { dharma: 60, special_items: 1 },
                hidden: false
            },
            
            'defense_collector': {
                id: 'defense_collector',
                name: 'Arsenal Master',
                description: 'Build all 6 types of defenses in a single level',
                category: 'strategy',
                icon: '🏭',
                condition: { type: 'single_event', event: 'all_defense_types' },
                reward: { 
                    dharma: 80, 
                    bandwidth: 20, 
                    anonymity: 10,
                    temporary_bonuses: { damage_multiplier: 1.15, duration: 600000 }
                },
                hidden: false
            },
            
            'synergy_master': {
                id: 'synergy_master',
                name: 'Harmonious Builder',
                description: 'Have 3 support defenses boosting the same defense',
                category: 'strategy',
                icon: '🔗',
                condition: { type: 'single_event', event: 'synergy_achieved' },
                reward: { dharma: 50 },
                hidden: false
            },
            
            // Progression Category
            'level_master_5': {
                id: 'level_master_5',
                name: 'Seasoned Guardian',
                description: 'Complete 5 levels',
                category: 'progression',
                icon: '🏅',
                condition: { type: 'cumulative', event: 'level_completed', target: 5 },
                reward: { dharma: 100, bandwidth: 30 },
                hidden: false
            },
            
            'level_master_10': {
                id: 'level_master_10',
                name: 'Veteran Protector',
                description: 'Complete 10 levels',
                category: 'progression',
                icon: '🎖️',
                condition: { type: 'cumulative', event: 'level_completed', target: 10 },
                reward: { 
                    dharma: 250, 
                    bandwidth: 50, 
                    anonymity: 25,
                    special_items: 2
                },
                hidden: false
            },
            
            'perfect_levels': {
                id: 'perfect_levels',
                name: 'Flawless Guardian',
                description: 'Complete 3 levels with perfect scores',
                category: 'progression',
                icon: '💯',
                condition: { type: 'cumulative', event: 'perfect_level', target: 3 },
                reward: { 
                    dharma: 150, 
                    anonymity: 20,
                    temporary_bonuses: { resource_efficiency: 1.25, duration: 900000 }
                },
                hidden: false
            },
            
            'resource_hoarder': {
                id: 'resource_hoarder',
                name: 'Digital Tycoon',
                description: 'Accumulate 1000 Dharma',
                category: 'progression',
                icon: '💰',
                condition: { type: 'single_event', event: 'resource_milestone', target: 1000 },
                reward: { dharma: 100 },
                hidden: false
            },
            
            // Hidden Secrets Category
            'speed_demon': {
                id: 'speed_demon',
                name: 'Lightning Monk',
                description: 'Complete a level in under 2 minutes',
                category: 'secret',
                icon: '⚡',
                condition: { type: 'single_event', event: 'speed_completion' },
                reward: { dharma: 75 },
                hidden: true
            },
            
            'pacifist': {
                id: 'pacifist',
                name: 'Peaceful Guardian',
                description: 'Complete a level using only support defenses',
                category: 'secret',
                icon: '☮️',
                condition: { type: 'single_event', event: 'pacifist_completion' },
                reward: { dharma: 100 },
                hidden: true
            },
            
            'minimalist': {
                id: 'minimalist',
                name: 'Zen Master',
                description: 'Complete a level with only 3 defenses',
                category: 'secret',
                icon: '🧘‍♂️',
                condition: { type: 'single_event', event: 'minimalist_completion' },
                reward: { dharma: 90 },
                hidden: true
            },
            
            'easter_egg': {
                id: 'easter_egg',
                name: 'Digital Archaeologist',
                description: 'Discover the hidden message',
                category: 'secret',
                icon: '🥚',
                condition: { type: 'single_event', event: 'easter_egg_found' },
                reward: { dharma: 200 },
                hidden: true
            }
        };
        
        // Initialize progress tracking for cumulative achievements
        Object.values(this.achievements).forEach(achievement => {
            if (achievement.condition.type === 'cumulative') {
                this.progressTracking[achievement.id] = 0;
            }
        });
        
        // Initialize session stats
        this.resetSessionStats();
        
        console.log('[AchievementManager] Achievements initialized successfully');
        } catch (error) {
            this.logError('initializeAchievements', error);
            // Initialize minimal achievements to prevent crashes
            this.achievements = {};
            this.progressTracking = {};
        }
    }
    
    loadProgress() {
        try {
            console.log('[AchievementManager] Loading achievement progress...');
            
            if (!this.saveSystem) {
                console.warn('[AchievementManager] SaveSystem not available, using default progress');
                return;
            }
            
            const saveData = this.saveSystem.loadGame();
            
            // Validate save data structure
            if (!saveData) {
                console.log('[AchievementManager] No save data found, starting with fresh progress');
                return;
            }
            
            if (!saveData.achievements) {
                console.log('[AchievementManager] No achievement data in save file, starting fresh');
                return;
            }
            
            const achievementData = saveData.achievements;
            
            // Validate and load unlocked achievements
            if (achievementData.unlocked) {
                if (Array.isArray(achievementData.unlocked)) {
                    // Filter out any invalid achievement IDs
                    const validUnlocked = achievementData.unlocked.filter(id => {
                        if (typeof id === 'string' && this.achievements[id]) {
                            return true;
                        } else {
                            console.warn(`[AchievementManager] Invalid achievement ID in save data: ${id}`);
                            return false;
                        }
                    });
                    
                    this.unlockedAchievements = new Set(validUnlocked);
                    console.log(`[AchievementManager] Loaded ${validUnlocked.length} unlocked achievements`);
                } else {
                    console.error('[AchievementManager] Invalid unlocked achievements format in save data');
                }
            }
            
            // Validate and load progress tracking
            if (achievementData.progress) {
                if (typeof achievementData.progress === 'object' && achievementData.progress !== null) {
                    // Validate progress data
                    const validProgress = {};
                    for (const [achievementId, progress] of Object.entries(achievementData.progress)) {
                        if (typeof achievementId === 'string' && this.achievements[achievementId] && typeof progress === 'number' && progress >= 0) {
                            validProgress[achievementId] = progress;
                        } else {
                            console.warn(`[AchievementManager] Invalid progress data for achievement: ${achievementId}, progress: ${progress}`);
                        }
                    }
                    
                    this.progressTracking = { ...this.progressTracking, ...validProgress };
                    console.log(`[AchievementManager] Loaded progress for ${Object.keys(validProgress).length} achievements`);
                } else {
                    console.error('[AchievementManager] Invalid progress tracking format in save data');
                }
            }
            
            // Validate and load recent unlocks
            if (achievementData.recent) {
                if (Array.isArray(achievementData.recent)) {
                    const validRecent = achievementData.recent.filter(unlock => {
                        if (unlock && 
                            typeof unlock.id === 'string' && 
                            this.achievements[unlock.id] && 
                            typeof unlock.timestamp === 'number' && 
                            unlock.timestamp > 0) {
                            return true;
                        } else {
                            console.warn(`[AchievementManager] Invalid recent unlock data:`, unlock);
                            return false;
                        }
                    });
                    
                    this.recentUnlocks = validRecent;
                    console.log(`[AchievementManager] Loaded ${validRecent.length} recent unlocks`);
                } else {
                    console.error('[AchievementManager] Invalid recent unlocks format in save data');
                }
            }
            
            console.log(`[AchievementManager] Successfully loaded achievement progress: ${this.unlockedAchievements.size} unlocked, ${Object.keys(this.progressTracking).length} in progress`);
            
        } catch (error) {
            console.error('[AchievementManager] Error loading achievement progress:', error);
            console.log('[AchievementManager] Continuing with default progress...');
            
            // Reset to safe defaults
            this.unlockedAchievements = new Set();
            this.progressTracking = {};
            this.recentUnlocks = [];
        }
    }
    
    saveProgress() {
        try {
            console.log('[AchievementManager] Saving achievement progress...');
            
            if (!this.saveSystem) {
                console.warn('[AchievementManager] SaveSystem not available, cannot save progress');
                return false;
            }
            
            if (typeof this.saveSystem.saveAchievements !== 'function') {
                console.error('[AchievementManager] SaveSystem does not have saveAchievements method');
                return false;
            }
            
            // Validate data before saving
            const unlockedArray = Array.from(this.unlockedAchievements);
            const validUnlocked = unlockedArray.filter(id => {
                if (typeof id === 'string' && this.achievements[id]) {
                    return true;
                } else {
                    console.warn(`[AchievementManager] Invalid unlocked achievement ID: ${id}`);
                    return false;
                }
            });
            
            // Validate progress tracking
            const validProgress = {};
            for (const [achievementId, progress] of Object.entries(this.progressTracking)) {
                if (typeof achievementId === 'string' && 
                    typeof progress === 'number' && 
                    progress >= 0 && 
                    this.achievements[achievementId]) {
                    validProgress[achievementId] = progress;
                } else {
                    console.warn(`[AchievementManager] Invalid progress data: ${achievementId} = ${progress}`);
                }
            }
            
            // Validate recent unlocks
            const validRecent = this.recentUnlocks
                .filter(unlock => {
                    if (unlock && 
                        typeof unlock.id === 'string' && 
                        typeof unlock.timestamp === 'number' && 
                        this.achievements[unlock.id]) {
                        return true;
                    } else {
                        console.warn('[AchievementManager] Invalid recent unlock data:', unlock);
                        return false;
                    }
                })
                .slice(-10); // Keep only last 10 recent unlocks
            
            const achievementData = {
                unlocked: validUnlocked,
                progress: validProgress,
                recent: validRecent,
                version: '1.0.0', // Add version for future compatibility
                timestamp: Date.now()
            };
            
            // Attempt to save
            this.saveSystem.saveAchievements(achievementData);
            
            console.log(`[AchievementManager] Successfully saved ${validUnlocked.length} unlocked achievements, ${Object.keys(validProgress).length} progress entries`);
            return true;
            
        } catch (error) {
            console.error('[AchievementManager] Error saving achievement progress:', error);
            return false;
        }
    }
    
    checkAchievements(eventType, eventData = {}) {
        try {
            console.log(`[AchievementManager] Checking achievements for event: ${eventType}`, eventData);
            
            if (this.lightweightMode) {
                // Use immediate synchronous processing for real-time games
                this.processEventImmediate(eventType, eventData);
                
                // Update session stats immediately 
                try {
                    this.updateSessionStats(eventType, eventData);
                } catch (statsError) {
                    console.error('[AchievementManager] Error updating session stats:', statsError);
                }
                
                return 0; // Return 0 as unlocks happen synchronously but this is legacy return format
            } else {
                // Complex mode: Queue event for batched processing
                if (this.queueEventForProcessing(eventType, eventData)) {
                    // Update session stats immediately for responsiveness
                    try {
                        this.updateSessionStats(eventType, eventData);
                    } catch (statsError) {
                        console.error('[AchievementManager] Error updating session stats:', statsError);
                    }
                    
                    console.log(`[AchievementManager] Event ${eventType} queued for batch processing`);
                    return 0; // Return 0 as unlocks will happen asynchronously
                }
                
                // Fallback to immediate processing if queueing fails
                return this.checkAchievementsImmediate(eventType, eventData);
            }
            
        } catch (error) {
            console.error('[AchievementManager] Critical error in checkAchievements:', error);
            return 0;
        }
    }

    /**
     * Immediate achievement processing (fallback/legacy method)
     */
    checkAchievementsImmediate(eventType, eventData = {}) {
        try {
            console.log(`[AchievementManager] Immediate processing for event: ${eventType}`, eventData);
            
            // Validate input parameters
            if (!eventType || typeof eventType !== 'string') {
                console.error('[AchievementManager] Invalid eventType provided:', eventType);
                return 0;
            }
            
            if (eventData && typeof eventData !== 'object') {
                console.error('[AchievementManager] Invalid eventData provided:', eventData);
                eventData = {};
            }
            
            let unlockedCount = 0;
            let processedCount = 0;
            
            Object.values(this.achievements).forEach(achievement => {
                try {
                    // Skip already unlocked achievements
                    if (this.unlockedAchievements.has(achievement.id)) return;
                    
                    // Validate achievement structure
                    if (!achievement.condition || !achievement.condition.type) {
                        console.warn(`[AchievementManager] Invalid achievement condition for ${achievement.id}`);
                        return;
                    }
                    
                    let shouldUnlock = false;
                    processedCount++;
                    
                    switch (achievement.condition.type) {
                        case 'single_event':
                            if (achievement.condition.event === eventType) {
                                if (achievement.condition.target !== undefined) {
                                    // Validate target value exists in eventData
                                    if (eventData.value !== undefined && typeof eventData.value === 'number') {
                                        shouldUnlock = eventData.value >= achievement.condition.target;
                                        console.log(`[AchievementManager] Single event ${achievement.id}: ${eventData.value} >= ${achievement.condition.target} = ${shouldUnlock}`);
                                    } else {
                                        console.warn(`[AchievementManager] Missing or invalid value for achievement ${achievement.id}, expected number, got:`, eventData.value);
                                    }
                                } else {
                                    shouldUnlock = true;
                                    console.log(`[AchievementManager] Single event ${achievement.id}: triggered by ${eventType}`);
                                }
                            }
                            break;
                            
                        case 'cumulative':
                            if (achievement.condition.event === eventType) {
                                // Validate cumulative target
                                if (typeof achievement.condition.target !== 'number' || achievement.condition.target <= 0) {
                                    console.warn(`[AchievementManager] Invalid cumulative target for ${achievement.id}:`, achievement.condition.target);
                                    return;
                                }
                                
                                const amount = (eventData.amount && typeof eventData.amount === 'number') ? eventData.amount : 1;
                                const currentProgress = this.progressTracking[achievement.id] || 0;
                                
                                // Ensure progress doesn't go negative
                                const newProgress = Math.max(0, currentProgress + amount);
                                this.progressTracking[achievement.id] = newProgress;
                                
                                if (newProgress >= achievement.condition.target) {
                                    shouldUnlock = true;
                                    console.log(`[AchievementManager] Cumulative ${achievement.id}: ${newProgress} >= ${achievement.condition.target}`);
                                } else {
                                    console.log(`[AchievementManager] Cumulative ${achievement.id}: ${newProgress}/${achievement.condition.target}`);
                                }
                            }
                            break;
                            
                        case 'streak':
                            // Handle streak-based achievements
                            if (achievement.condition.event === eventType) {
                                const streakKey = `${achievement.id}_streak`;
                                const currentStreak = this.progressTracking[streakKey] || 0;
                                
                                if (eventData.success === true) {
                                    this.progressTracking[streakKey] = currentStreak + 1;
                                } else if (eventData.success === false) {
                                    this.progressTracking[streakKey] = 0;
                                }
                                
                                if (this.progressTracking[streakKey] >= achievement.condition.target) {
                                    shouldUnlock = true;
                                    console.log(`[AchievementManager] Streak ${achievement.id}: achieved ${this.progressTracking[streakKey]} streak`);
                                }
                            }
                            break;
                            
                        default:
                            console.warn(`[AchievementManager] Unknown achievement condition type: ${achievement.condition.type} for ${achievement.id}`);
                    }
                    
                    if (shouldUnlock) {
                        this.unlockAchievement(achievement.id);
                        unlockedCount++;
                    }
                    
                } catch (achievementError) {
                    console.error(`[AchievementManager] Error processing achievement ${achievement.id}:`, achievementError);
                }
            });
            
            // Update session stats
            try {
                this.updateSessionStats(eventType, eventData);
            } catch (statsError) {
                console.error('[AchievementManager] Error updating session stats:', statsError);
            }
            
            console.log(`[AchievementManager] Processed ${processedCount} achievements, unlocked ${unlockedCount} new ones`);
            return unlockedCount;
            
        } catch (error) {
            console.error('[AchievementManager] Critical error in checkAchievementsImmediate:', error);
            return 0;
        }
    }
    
    unlockAchievement(achievementId) {
        try {
            console.log(`[AchievementManager] Attempting to unlock achievement: ${achievementId}`);
            
            // Validate achievement ID
            if (!achievementId || typeof achievementId !== 'string') {
                console.error('[AchievementManager] Invalid achievement ID provided:', achievementId);
                return false;
            }
            
            // Verify achievement exists
            const achievement = this.achievements[achievementId];
            if (!achievement) {
                console.error(`[AchievementManager] Achievement not found: ${achievementId}`);
                console.log('[AchievementManager] Available achievements:', Object.keys(this.achievements));
                return false;
            }
            
            // Check if already unlocked
            if (this.unlockedAchievements.has(achievementId)) {
                console.log(`[AchievementManager] Achievement ${achievementId} already unlocked`);
                return false;
            }
            
            // Validate achievement structure
            if (!achievement.name || !achievement.description) {
                console.error(`[AchievementManager] Invalid achievement structure for ${achievementId}:`, achievement);
                return false;
            }
            
            console.log(`[AchievementManager] Achievement unlocked: ${achievement.name}`);
            
            // Add to unlocked set
            this.unlockedAchievements.add(achievementId);
            
            // Add to recent unlocks with validation
            try {
                this.recentUnlocks.push({
                    id: achievementId,
                    timestamp: Date.now()
                });
                
                // Keep only the last 20 recent unlocks to prevent memory bloat
                if (this.recentUnlocks.length > 20) {
                    this.recentUnlocks = this.recentUnlocks.slice(-20);
                }
            } catch (recentError) {
                console.error('[AchievementManager] Error updating recent unlocks:', recentError);
            }
            
            // Queue notification
            try {
                this.queueNotification(achievement);
            } catch (notificationError) {
                console.error('[AchievementManager] Error queueing notification:', notificationError);
            }
            
            // Play achievement sound
            try {
                if (this.audioManager && typeof this.audioManager.playSfx === 'function') {
                    this.audioManager.playSfx('achievementUnlock', 0.8);
                } else if (this.audioManager) {
                    console.warn('[AchievementManager] AudioManager available but playSfx method not found');
                }
            } catch (audioError) {
                console.error('[AchievementManager] Error playing achievement sound:', audioError);
            }
            
            // Apply reward
            if (achievement.reward) {
                try {
                    this.applyReward(achievement.reward);
                } catch (rewardError) {
                    console.error(`[AchievementManager] Error applying reward for ${achievementId}:`, rewardError);
                }
            }
            
            // Save progress
            try {
                this.saveProgress();
            } catch (saveError) {
                console.error('[AchievementManager] Error saving progress after achievement unlock:', saveError);
            }
            
            // Dispatch achievement unlock event
            try {
                document.dispatchEvent(new CustomEvent('achievementUnlocked', {
                    detail: {
                        achievementId: achievementId,
                        achievement: achievement,
                        timestamp: Date.now()
                    }
                }));
            } catch (eventError) {
                console.error('[AchievementManager] Error dispatching achievement event:', eventError);
            }
            
            console.log(`[AchievementManager] Successfully unlocked achievement: ${achievementId}`);
            return true;
            
        } catch (error) {
            console.error(`[AchievementManager] Critical error unlocking achievement ${achievementId}:`, error);
            return false;
        }
    }
    
    queueNotification(achievement) {
        try {
            console.log(`[AchievementManager] Queueing notification for: ${achievement?.name || 'unknown'}`);
            
            // Validate achievement
            if (!achievement || !achievement.name || !achievement.description) {
                console.error('[AchievementManager] Invalid achievement for notification:', achievement);
                return false;
            }
            
            if (this.lightweightMode && !this.asyncNotifications) {
                // Lightweight mode: Show notification immediately (synchronous)
                console.log('[AchievementManager] Showing notification immediately (lightweight mode)');
                this.displayAchievementToast(achievement);
                return true;
            }
            
            // Complex mode or async notifications: Queue for later display
            if (!Array.isArray(this.notificationQueue)) {
                console.warn('[AchievementManager] Notification queue not initialized, creating new one');
                this.notificationQueue = [];
            }
            
            // Prevent duplicate notifications
            const isDuplicate = this.notificationQueue.some(notification => 
                notification.achievement && notification.achievement.id === achievement.id
            );
            
            if (isDuplicate) {
                console.log(`[AchievementManager] Notification for ${achievement.id} already queued, skipping duplicate`);
                return false;
            }
            
            const notification = {
                achievement: achievement,
                timestamp: Date.now(),
                duration: 4000
            };
            
            this.notificationQueue.push(notification);
            console.log(`[AchievementManager] Notification queued, queue length: ${this.notificationQueue.length}`);
            
            // Start showing notifications if not already
            if (!this.isShowingNotification) {
                this.showNextNotification();
            }
            
            return true;
            
        } catch (error) {
            console.error('[AchievementManager] Error queueing notification:', error);
            return false;
        }
    }
    
    showNextNotification() {
        try {
            console.log(`[AchievementManager] Showing next notification, queue length: ${this.notificationQueue.length}`);
            
            // Check if queue is empty
            if (!Array.isArray(this.notificationQueue) || this.notificationQueue.length === 0) {
                this.isShowingNotification = false;
                console.log('[AchievementManager] No more notifications to show');
                return;
            }
            
            this.isShowingNotification = true;
            const notification = this.notificationQueue.shift();
            
            // Validate notification
            if (!notification || !notification.achievement) {
                console.error('[AchievementManager] Invalid notification from queue:', notification);
                // Try next notification
                this.showNextNotification();
                return;
            }
            
            // Display the toast
            try {
                this.displayAchievementToast(notification.achievement);
            } catch (toastError) {
                console.error('[AchievementManager] Error displaying achievement toast:', toastError);
            }
            
            // Schedule next notification with error handling
            try {
                const duration = (notification.duration && typeof notification.duration === 'number') ? 
                    notification.duration : 4000;
                
                setTimeout(() => {
                    try {
                        this.showNextNotification();
                    } catch (nextError) {
                        console.error('[AchievementManager] Error in next notification:', nextError);
                        this.isShowingNotification = false;
                    }
                }, duration);
                
            } catch (timerError) {
                console.error('[AchievementManager] Error setting up next notification timer:', timerError);
                this.isShowingNotification = false;
            }
            
        } catch (error) {
            console.error('[AchievementManager] Critical error in showNextNotification:', error);
            this.isShowingNotification = false;
        }
    }
    
    displayAchievementToast(achievement) {
        try {
            console.log(`[AchievementManager] Displaying achievement toast for: ${achievement?.name || 'unknown'}`);
            
            // Validate achievement object
            if (!achievement) {
                console.error('[AchievementManager] No achievement provided to displayAchievementToast');
                return false;
            }
            
            if (!achievement.name || !achievement.description) {
                console.error('[AchievementManager] Invalid achievement object for toast:', achievement);
                return false;
            }
            
            // Check if DOM is available
            if (typeof document === 'undefined') {
                console.warn('[AchievementManager] Document not available, cannot display toast');
                return false;
            }
            
            // Remove any existing achievement toast safely
            try {
                const existingToast = document.getElementById('achievementToast');
                if (existingToast && existingToast.parentNode) {
                    existingToast.parentNode.removeChild(existingToast);
                    console.log('[AchievementManager] Removed existing achievement toast');
                }
            } catch (removeError) {
                console.warn('[AchievementManager] Error removing existing toast:', removeError);
            }
            
            // Create toast element with error handling
            let toast;
            try {
                toast = document.createElement('div');
                if (!toast) {
                    throw new Error('Failed to create div element');
                }
                
                toast.id = 'achievementToast';
                toast.className = 'achievement-toast';
                
                // Safely set innerHTML with escaped content
                const escapedName = this.escapeHtml(achievement.name);
                const escapedDescription = this.escapeHtml(achievement.description);
                const safeIcon = achievement.icon || '🏆'; // Fallback icon
                
                toast.innerHTML = `
                    <div class="achievement-icon">${safeIcon}</div>
                    <div class="achievement-content">
                        <div class="achievement-title">Achievement Unlocked!</div>
                        <div class="achievement-name">${escapedName}</div>
                        <div class="achievement-description">${escapedDescription}</div>
                    </div>
                `;
                
            } catch (createError) {
                console.error('[AchievementManager] Error creating toast element:', createError);
                return false;
            }
            
            // Apply styles safely
            try {
                const styles = {
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    background: 'linear-gradient(135deg, #2c3e50, #3498db)',
                    color: 'white',
                    padding: '15px',
                    borderRadius: '10px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    minWidth: '300px',
                    zIndex: '10000',
                    animation: 'slideInRight 0.5s ease-out, fadeOut 0.5s ease-in 3.5s',
                    border: '2px solid #ffd700',
                    fontFamily: 'Arial, sans-serif',
                    pointerEvents: 'none' // Prevent interference with game
                };
                
                // Apply styles individually for better error handling
                for (const [property, value] of Object.entries(styles)) {
                    try {
                        toast.style[property] = value;
                    } catch (styleError) {
                        console.warn(`[AchievementManager] Error setting style ${property}:`, styleError);
                    }
                }
                
            } catch (styleError) {
                console.error('[AchievementManager] Error applying toast styles:', styleError);
                // Continue without styles rather than failing completely
            }
            
            // Append to document body safely
            try {
                if (!document.body) {
                    throw new Error('Document body not available');
                }
                
                document.body.appendChild(toast);
                console.log('[AchievementManager] Achievement toast displayed successfully');
                
            } catch (appendError) {
                console.error('[AchievementManager] Error appending toast to document:', appendError);
                return false;
            }
            
            // Set up removal timer with error handling
            try {
                const removalTimer = setTimeout(() => {
                    try {
                        if (toast && toast.parentNode) {
                            toast.parentNode.removeChild(toast);
                            console.log('[AchievementManager] Achievement toast removed after timeout');
                        }
                    } catch (removalError) {
                        console.warn('[AchievementManager] Error removing toast after timeout:', removalError);
                    }
                }, 4000);
                
                // Store timer reference for potential cleanup
                toast._removalTimer = removalTimer;
                
            } catch (timerError) {
                console.error('[AchievementManager] Error setting up removal timer:', timerError);
                // Toast will remain visible, but that's better than crashing
            }
            
            return true;
            
        } catch (error) {
            console.error('[AchievementManager] Critical error in displayAchievementToast:', error);
            return false;
        }
    }
    
    // Helper method to escape HTML content
    escapeHtml(text) {
        if (typeof text !== 'string') {
            return String(text || '');
        }
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    applyReward(reward) {
        // Enhanced reward application with detailed feedback
        const rewardDetails = {
            originalReward: { ...reward },
            appliedAmounts: {},
            notifications: [],
            totalValue: 0
        };
        
        // Process each reward type
        Object.keys(reward).forEach(resourceType => {
            const amount = reward[resourceType];
            if (amount > 0) {
                rewardDetails.appliedAmounts[resourceType] = amount;
                rewardDetails.totalValue += this.getResourceValue(resourceType, amount);
                
                // Create resource-specific notification message
                const notification = this.createRewardNotification(resourceType, amount);
                rewardDetails.notifications.push(notification);
                
                console.log(`Achievement reward: +${amount} ${resourceType}`);
            }
        });
        
        // Dispatch enhanced event with detailed reward information
        const event = new CustomEvent('achievementReward', {
            detail: { 
                reward: reward,
                rewardDetails: rewardDetails,
                timestamp: Date.now()
            }
        });
        
        document.dispatchEvent(event);
        
        // Play reward sound effect if available
        if (this.audioManager && this.audioManager.playSfx) {
            this.audioManager.playSfx('achievementReward', 0.7, 1.0);
        }
        
        // Create visual feedback particles or effects
        this.createRewardFeedback(rewardDetails);
    }
    
    getResourceValue(resourceType, amount) {
        // Assign relative values to different resource types for total calculation
        const resourceValues = {
            dharma: 1,
            bandwidth: 1.5,
            anonymity: 2,
            special_items: 5
        };
        
        return (resourceValues[resourceType] || 1) * amount;
    }
    
    createRewardNotification(resourceType, amount) {
        const resourceDisplayNames = {
            dharma: 'Dharma',
            bandwidth: 'Bandwidth',
            anonymity: 'Anonymity',
            special_items: 'Special Items'
        };
        
        const resourceIcons = {
            dharma: '☸️',
            bandwidth: '📡',
            anonymity: '🔒',
            special_items: '🎁'
        };
        
        const resourceColors = {
            dharma: '#ffd700',
            bandwidth: '#4ecdc4',
            anonymity: '#6c5ce7',
            special_items: '#fd79a8'
        };
        
        return {
            message: `+${amount} ${resourceDisplayNames[resourceType] || resourceType}`,
            icon: resourceIcons[resourceType] || '💎',
            color: resourceColors[resourceType] || '#ffffff',
            amount: amount,
            type: resourceType
        };
    }
    
    createRewardFeedback(rewardDetails) {
        // Create visual feedback for the reward application
        // This could trigger particle effects or UI animations
        const feedback = {
            type: 'achievement_reward',
            notifications: rewardDetails.notifications,
            totalValue: rewardDetails.totalValue,
            timestamp: Date.now(),
            duration: 3000
        };
        
        // Dispatch feedback event for UI systems to handle
        const feedbackEvent = new CustomEvent('achievementRewardFeedback', {
            detail: feedback
        });
        
        document.dispatchEvent(feedbackEvent);
    }
    
    getAchievementProgress(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement) return null;
        
        if (achievement.condition.type === 'single_event') {
            return {
                current: this.unlockedAchievements.has(achievementId) ? 1 : 0,
                target: 1,
                percentage: this.unlockedAchievements.has(achievementId) ? 100 : 0
            };
        } else if (achievement.condition.type === 'cumulative') {
            const current = this.progressTracking[achievementId] || 0;
            const target = achievement.condition.target;
            return {
                current: Math.min(current, target),
                target: target,
                percentage: Math.min(100, (current / target) * 100)
            };
        }
        
        return null;
    }
    
    getAchievementStats() {
        const total = Object.keys(this.achievements).length;
        const unlocked = this.unlockedAchievements.size;
        const categories = {};
        
        // Calculate category completion
        Object.values(this.achievements).forEach(achievement => {
            if (!categories[achievement.category]) {
                categories[achievement.category] = { total: 0, unlocked: 0 };
            }
            categories[achievement.category].total++;
            if (this.unlockedAchievements.has(achievement.id)) {
                categories[achievement.category].unlocked++;
            }
        });
        
        return {
            total: total,
            unlocked: unlocked,
            percentage: Math.round((unlocked / total) * 100),
            categories: categories,
            recent: this.recentUnlocks.slice(-5) // Last 5 unlocks
        };
    }
    
    getAchievementsByCategory(category) {
        return Object.values(this.achievements)
            .filter(achievement => achievement.category === category)
            .map(achievement => ({
                ...achievement,
                unlocked: this.unlockedAchievements.has(achievement.id),
                progress: this.getAchievementProgress(achievement.id)
            }));
    }
    
    getAllAchievements() {
        return Object.values(this.achievements)
            .filter(achievement => !achievement.hidden || this.unlockedAchievements.has(achievement.id))
            .map(achievement => ({
                ...achievement,
                unlocked: this.unlockedAchievements.has(achievement.id),
                progress: this.getAchievementProgress(achievement.id)
            }));
    }
    
    updateSessionStats(eventType, eventData) {
        try {
            if (!eventType || typeof eventType !== 'string') {
                console.warn('[AchievementManager.updateSessionStats] Invalid eventType:', eventType);
                return;
            }
            
            if (!eventData || typeof eventData !== 'object') {
                eventData = {};
            }
            
            if (!this.sessionStats[eventType]) {
                this.sessionStats[eventType] = 0;
            }
            
            const amount = (typeof eventData.amount === 'number' && eventData.amount > 0) ? eventData.amount : 1;
            this.sessionStats[eventType] += amount;
            
            console.log(`[AchievementManager.updateSessionStats] Updated ${eventType}: +${amount} (total: ${this.sessionStats[eventType]})`);
        } catch (error) {
            this.logError('updateSessionStats', error, { eventType, eventData });
        }
    }
    
    resetSessionStats() {
        try {
            this.sessionStats = {
                enemy_killed: 0,
                defense_placed: 0,
                defense_upgraded: 0,
                level_completed: 0,
                dharma_spent: 0,
                perfect_waves: 0
            };
            console.log('[AchievementManager.resetSessionStats] Session stats reset');
        } catch (error) {
            this.logError('resetSessionStats', error);
            // Ensure sessionStats exists even if reset fails
            this.sessionStats = {};
        }
    }
    
    getSessionStats() {
        try {
            return { ...this.sessionStats };
        } catch (error) {
            this.logError('getSessionStats', error);
            return {};
        }
    }
    
    // Debug methods
    debugUnlockAchievement(achievementId) {
        try {
            if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
                console.log('[AchievementManager.debugUnlockAchievement] Force unlocking:', achievementId);
                this.unlockAchievement(achievementId);
            } else {
                console.warn('[AchievementManager.debugUnlockAchievement] Debug methods only available in development');
            }
        } catch (error) {
            this.logError('debugUnlockAchievement', error, { achievementId });
        }
    }
    
    debugUnlockAllAchievements() {
        try {
            if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
                console.log('[AchievementManager.debugUnlockAllAchievements] Unlocking all achievements');
                Object.keys(this.achievements).forEach(id => {
                    this.unlockAchievement(id);
                });
            } else {
                console.warn('[AchievementManager.debugUnlockAllAchievements] Debug methods only available in development');
            }
        } catch (error) {
            this.logError('debugUnlockAllAchievements', error);
        }
    }
    
    debugResetAchievements() {
        try {
            if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
                console.log('[AchievementManager.debugResetAchievements] Resetting all achievements');
                this.unlockedAchievements.clear();
                this.progressTracking = {};
                Object.values(this.achievements).forEach(achievement => {
                    if (achievement.condition.type === 'cumulative') {
                        this.progressTracking[achievement.id] = 0;
                    }
                });
                this.recentUnlocks = [];
                this.saveProgress();
            } else {
                console.warn('[AchievementManager.debugResetAchievements] Debug methods only available in development');
            }
        } catch (error) {
            this.logError('debugResetAchievements', error);
        }
    }
    
    // Method to check for achievements that are close to completion
    getNearCompletionAchievements(threshold = 0.8) {
        try {
            if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
                console.warn('[AchievementManager.getNearCompletionAchievements] Invalid threshold:', threshold, 'using default 0.8');
                threshold = 0.8;
            }
            
            return Object.values(this.achievements)
                .filter(achievement => !this.unlockedAchievements.has(achievement.id))
                .map(achievement => ({
                    ...achievement,
                    progress: this.getAchievementProgress(achievement.id)
                }))
                .filter(achievement => {
                    const progress = achievement.progress;
                    return progress && progress.percentage >= threshold * 100;
                });
        } catch (error) {
            this.logError('getNearCompletionAchievements', error, { threshold });
            return [];
        }
    }
    
    // Export achievement data for sharing
    exportAchievements() {
        try {
            const exportData = {
                unlocked: Array.from(this.unlockedAchievements),
                progress: { ...this.progressTracking },
                stats: this.getAchievementStats(),
                timestamp: Date.now()
            };
            
            console.log('[AchievementManager.exportAchievements] Exported achievement data');
            return exportData;
        } catch (error) {
            this.logError('exportAchievements', error);
            return {
                unlocked: [],
                progress: {},
                stats: {},
                timestamp: Date.now()
            };
        }
    }

    // ============================================================================
    // CONCURRENT EVENT HANDLING MONITORING & DEBUG METHODS
    // ============================================================================

    /**
     * Get statistics about the concurrent event handling system
     */
    getConcurrentSystemStats() {
        try {
            return {
                eventQueueSize: this.eventQueue.length,
                processingEvents: this.processingEvents,
                atomicUpdateLocked: this.atomicUpdateLock,
                progressBufferSize: this.progressUpdateBuffer.size,
                deduplicationEntriesCount: this.eventDeduplication.size,
                lastProcessedEventsCount: this.lastProcessedEvents.size,
                batchSize: this.batchSize,
                batchInterval: this.batchInterval,
                memoryUsage: {
                    eventQueue: this.eventQueue.length,
                    progressBuffer: this.progressUpdateBuffer.size,
                    deduplicationMap: this.eventDeduplication.size,
                    lastProcessedMap: this.lastProcessedEvents.size
                }
            };
        } catch (error) {
            this.logError('getConcurrentSystemStats', error);
            return {
                eventQueueSize: 0,
                processingEvents: false,
                atomicUpdateLocked: false,
                progressBufferSize: 0,
                deduplicationEntriesCount: 0,
                lastProcessedEventsCount: 0,
                batchSize: this.batchSize || 10,
                batchInterval: this.batchInterval || 50,
                memoryUsage: { eventQueue: 0, progressBuffer: 0, deduplicationMap: 0, lastProcessedMap: 0 }
            };
        }
    }

    /**
     * Force process all queued events immediately (debug method)
     */
    debugForceProcessQueue() {
        try {
            if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
                console.log('[AchievementManager.debugForceProcessQueue] Force processing all queued events');
                
                const queueSnapshot = [...this.eventQueue];
                this.eventQueue = [];
                
                return this.processBatchedEvents(queueSnapshot);
            } else {
                console.warn('[AchievementManager.debugForceProcessQueue] Debug methods only available in development');
            }
        } catch (error) {
            this.logError('debugForceProcessQueue', error);
        }
    }

    /**
     * Clear all concurrent system buffers and queues (debug method)
     */
    debugClearConcurrentBuffers() {
        try {
            if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
                console.log('[AchievementManager.debugClearConcurrentBuffers] Clearing all concurrent system buffers');
                
                this.eventQueue = [];
                this.progressUpdateBuffer.clear();
                this.eventDeduplication.clear();
                this.lastProcessedEvents.clear();
                this.atomicUpdateLock = false;
                
                console.log('[AchievementManager.debugClearConcurrentBuffers] All buffers cleared');
            } else {
                console.warn('[AchievementManager.debugClearConcurrentBuffers] Debug methods only available in development');
            }
        } catch (error) {
            this.logError('debugClearConcurrentBuffers', error);
        }
    }

    /**
     * Simulate high-frequency events for testing (debug method)
     */
    debugSimulateHighFrequencyEvents(eventType = 'enemy_killed', eventCount = 100, intervalMs = 10) {
        try {
            if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
                console.log(`[AchievementManager.debugSimulateHighFrequencyEvents] Simulating ${eventCount} ${eventType} events`);
                
                let count = 0;
                const interval = setInterval(() => {
                    this.checkAchievements(eventType, { amount: 1 });
                    count++;
                    
                    if (count >= eventCount) {
                        clearInterval(interval);
                        console.log(`[AchievementManager.debugSimulateHighFrequencyEvents] Completed simulation of ${eventCount} events`);
                    }
                }, intervalMs);
                
                return interval;
            } else {
                console.warn('[AchievementManager.debugSimulateHighFrequencyEvents] Debug methods only available in development');
            }
        } catch (error) {
            this.logError('debugSimulateHighFrequencyEvents', error);
        }
    }

    /**
     * Configure concurrent system parameters (debug method)
     */
    debugConfigureConcurrentSystem(config = {}) {
        try {
            if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
                console.log('[AchievementManager.debugConfigureConcurrentSystem] Configuring concurrent system', config);
                
                if (typeof config.batchSize === 'number' && config.batchSize > 0) {
                    this.batchSize = config.batchSize;
                }
                
                if (typeof config.batchInterval === 'number' && config.batchInterval > 0) {
                    this.batchInterval = config.batchInterval;
                }
                
                console.log('[AchievementManager.debugConfigureConcurrentSystem] Configuration updated:', {
                    batchSize: this.batchSize,
                    batchInterval: this.batchInterval
                });
            } else {
                console.warn('[AchievementManager.debugConfigureConcurrentSystem] Debug methods only available in development');
            }
        } catch (error) {
            this.logError('debugConfigureConcurrentSystem', error);
        }
    }

    /**
     * Enable/disable immediate processing fallback
     */
    setImmediateProcessingMode(enabled = false) {
        try {
            this.immediateProcessingMode = enabled;
            console.log(`[AchievementManager] Immediate processing mode: ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            this.logError('setImmediateProcessingMode', error);
        }
    }

    /**
     * Get detailed event processing metrics
     */
    getEventProcessingMetrics() {
        try {
            const deduplicationMetrics = {};
            for (const [eventType, events] of this.eventDeduplication) {
                deduplicationMetrics[eventType] = {
                    eventCount: events.length,
                    oldestTimestamp: events.length > 0 ? Math.min(...events.map(e => e.timestamp)) : null,
                    newestTimestamp: events.length > 0 ? Math.max(...events.map(e => e.timestamp)) : null
                };
            }
            
            const progressBufferMetrics = {};
            for (const [achievementId, amount] of this.progressUpdateBuffer) {
                progressBufferMetrics[achievementId] = amount;
            }
            
            return {
                currentTime: Date.now(),
                queuedEvents: this.eventQueue.map(e => ({
                    type: e.eventType,
                    timestamp: e.timestamp,
                    age: Date.now() - e.timestamp
                })),
                deduplicationMetrics,
                progressBufferMetrics,
                systemHealth: {
                    isProcessing: this.processingEvents,
                    isLocked: this.atomicUpdateLock,
                    memoryPressure: {
                        queue: this.eventQueue.length > 100,
                        deduplication: this.eventDeduplication.size > 50,
                        lastProcessed: this.lastProcessedEvents.size > 1000
                    }
                }
            };
        } catch (error) {
            this.logError('getEventProcessingMetrics', error);
            return {
                currentTime: Date.now(),
                queuedEvents: [],
                deduplicationMetrics: {},
                progressBufferMetrics: {},
                systemHealth: { isProcessing: false, isLocked: false, memoryPressure: {} }
            };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AchievementManager;
}
