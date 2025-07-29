// Dharmapala Shield - Advanced Defense System

/**
 * Enhanced Upgrade Tree Validation Cache System with Content-Based Invalidation
 * Provides comprehensive caching, lazy validation, and automatic invalidation based on configuration changes
 */
class DefenseUpgradeValidationCache {
    constructor() {
        // Tree structure caches
        this.upgradeTreeCache = new Map();
        this.validationResultCache = new Map();
        this.structureValidationCache = new Map();
        this.choiceValidationCache = new Map();
        
        // Content-based cache invalidation
        this.configHash = null;
        this.cacheVersion = 1;
        this.lastConfigCheck = Date.now();
        this.configCheckInterval = 30000; // Check config changes every 30 seconds
        
        // Memory pressure detection
        this.memoryMonitor = {
            enabled: true,
            lastCheck: Date.now(),
            checkInterval: 60000, // Check memory every 60 seconds
            thresholds: {
                warning: 50 * 1024 * 1024,  // 50MB estimated cache size
                critical: 100 * 1024 * 1024, // 100MB estimated cache size
            },
            estimatedSize: 0,
            pressureDetected: false
        };
        
        // Lazy validation tracking
        this.lazyValidationQueue = new Set();
        this.validationInProgress = new Set();
        
        // Performance metrics
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.validationTimeTotal = 0;
        this.validationCount = 0;
        this.invalidationCount = 0;
        this.memoryCleanups = 0;
        
        // Dynamic cache management
        this.lastCleanup = Date.now();
        this.maxCacheAge = 600000; // 10 minutes default
        this.adaptiveCleanup = true;
        
        // Initialize content-based tracking
        this.initializeContentBasedInvalidation();
        
        console.log('[DefenseUpgradeValidationCache] Content-based validation cache system initialized');
    }

    /**
     * Initialize content-based cache invalidation system
     */
    initializeContentBasedInvalidation() {
        try {
            // Generate initial config hash
            this.updateConfigHash();
            
            // Start periodic config monitoring
            this.startConfigMonitoring();
            
            // Initialize memory pressure monitoring
            this.startMemoryMonitoring();
            
            console.log(`[DefenseUpgradeValidationCache] Content-based invalidation initialized with version ${this.cacheVersion}`);
        } catch (error) {
            console.error('[DefenseUpgradeValidationCache] Failed to initialize content-based invalidation:', error);
        }
    }

    /**
     * Generate hash of CONFIG.UPGRADE_TREES for content-based invalidation
     */
    generateConfigHash() {
        try {
            if (!CONFIG || !CONFIG.UPGRADE_TREES) {
                return 'no-config';
            }
            
            // Create stable hash of the upgrade trees configuration
            const configString = this.createStableConfigString(CONFIG.UPGRADE_TREES);
            return this.simpleHash(configString);
        } catch (error) {
            console.error('[DefenseUpgradeValidationCache] Error generating config hash:', error);
            return `error-${Date.now()}`;
        }
    }

    /**
     * Create stable string representation of config for hashing
     */
    createStableConfigString(obj, depth = 0) {
        if (depth > 10) return '[max-depth]'; // Prevent infinite recursion
        
        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        if (typeof obj === 'string') return `"${obj}"`;
        if (typeof obj === 'number') return obj.toString();
        if (typeof obj === 'boolean') return obj.toString();
        if (Array.isArray(obj)) {
            return `[${obj.map(item => this.createStableConfigString(item, depth + 1)).join(',')}]`;
        }
        if (typeof obj === 'object') {
            // Sort keys for consistent hashing
            const sortedKeys = Object.keys(obj).sort();
            const pairs = sortedKeys.map(key => 
                `"${key}":${this.createStableConfigString(obj[key], depth + 1)}`
            );
            return `{${pairs.join(',')}}`;
        }
        return String(obj);
    }

    /**
     * Simple hash function for content-based invalidation
     */
    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash.toString(36);
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return Math.abs(hash).toString(36);
    }

    /**
     * Update config hash and trigger invalidation if changed
     */
    updateConfigHash() {
        const newHash = this.generateConfigHash();
        
        if (this.configHash && this.configHash !== newHash) {
            console.log(`[DefenseUpgradeValidationCache] Configuration change detected (${this.configHash} -> ${newHash})`);
            this.invalidateAllCaches();
            this.cacheVersion++;
        }
        
        this.configHash = newHash;
        this.lastConfigCheck = Date.now();
    }

    /**
     * Start periodic config monitoring
     */
    startConfigMonitoring() {
        setInterval(() => {
            try {
                this.updateConfigHash();
            } catch (error) {
                console.error('[DefenseUpgradeValidationCache] Error during config monitoring:', error);
            }
        }, this.configCheckInterval);
    }

    /**
     * Start memory pressure monitoring
     */
    startMemoryMonitoring() {
        if (!this.memoryMonitor.enabled) return;
        
        setInterval(() => {
            try {
                this.checkMemoryPressure();
            } catch (error) {
                console.error('[DefenseUpgradeValidationCache] Error during memory monitoring:', error);
            }
        }, this.memoryMonitor.checkInterval);
    }

    /**
     * Check for memory pressure and trigger cleanup if needed
     */
    checkMemoryPressure() {
        const currentTime = Date.now();
        this.memoryMonitor.lastCheck = currentTime;
        
        // Estimate current cache memory usage
        const estimatedSize = this.estimateCacheMemoryUsage();
        this.memoryMonitor.estimatedSize = estimatedSize;
        
        // Check for memory pressure
        const wasUnderPressure = this.memoryMonitor.pressureDetected;
        this.memoryMonitor.pressureDetected = estimatedSize > this.memoryMonitor.thresholds.warning;
        
        if (this.memoryMonitor.pressureDetected && !wasUnderPressure) {
            console.warn(`[DefenseUpgradeValidationCache] Memory pressure detected: ${Math.round(estimatedSize / 1024 / 1024)}MB`);
        }
        
        // Trigger aggressive cleanup if critical threshold reached
        if (estimatedSize > this.memoryMonitor.thresholds.critical) {
            console.warn(`[DefenseUpgradeValidationCache] Critical memory pressure: ${Math.round(estimatedSize / 1024 / 1024)}MB - triggering aggressive cleanup`);
            this.performAggressiveCleanup();
        } else if (this.memoryMonitor.pressureDetected) {
            // Adaptive cleanup based on memory pressure
            this.performAdaptiveCleanup();
        }
        
        // Check browser memory API if available
        if (performance.memory) {
            const memInfo = performance.memory;
            const heapRatio = memInfo.usedJSHeapSize / memInfo.totalJSHeapSize;
            
            if (heapRatio > 0.85) {
                console.warn(`[DefenseUpgradeValidationCache] High heap usage detected: ${Math.round(heapRatio * 100)}%`);
                this.performAggressiveCleanup();
            }
        }
    }

    /**
     * Estimate memory usage of all caches
     */
    estimateCacheMemoryUsage() {
        let totalSize = 0;
        
        // Estimate upgrade tree cache size
        for (const [key, value] of this.upgradeTreeCache.entries()) {
            totalSize += key.length * 2; // UTF-16 encoding
            totalSize += JSON.stringify(value).length * 2;
        }
        
        // Estimate validation result cache size
        for (const [key, value] of this.validationResultCache.entries()) {
            totalSize += key.length * 2;
            totalSize += JSON.stringify(value).length * 2;
        }
        
        // Estimate structure validation cache size
        for (const [key, value] of this.structureValidationCache.entries()) {
            totalSize += key.length * 2;
            totalSize += JSON.stringify(value).length * 2;
        }
        
        // Estimate choice validation cache size
        for (const [key, value] of this.choiceValidationCache.entries()) {
            totalSize += key.length * 2;
            totalSize += JSON.stringify(value).length * 2;
        }
        
        // Add overhead for Map structures and metadata
        const cacheCount = this.upgradeTreeCache.size + this.validationResultCache.size + 
                          this.structureValidationCache.size + this.choiceValidationCache.size;
        totalSize += cacheCount * 100; // Estimated overhead per entry
        
        return totalSize;
    }

    /**
     * Perform adaptive cleanup based on memory pressure
     */
    performAdaptiveCleanup() {
        const targetReduction = 0.3; // Aim to reduce cache size by 30%
        let cleanedEntries = 0;
        
        // Prioritize cleanup by age and usage frequency
        const caches = [
            { cache: this.choiceValidationCache, priority: 1 },
            { cache: this.structureValidationCache, priority: 2 },
            { cache: this.validationResultCache, priority: 3 },
            { cache: this.upgradeTreeCache, priority: 4 }
        ];
        
        const currentTime = Date.now();
        const totalEntries = caches.reduce((sum, cacheInfo) => sum + cacheInfo.cache.size, 0);
        const targetCleanCount = Math.floor(totalEntries * targetReduction);
        
        for (const cacheInfo of caches) {
            if (cleanedEntries >= targetCleanCount) break;
            
            const entriesToClean = [];
            
            for (const [key, value] of cacheInfo.cache.entries()) {
                const age = currentTime - value.timestamp;
                const adaptiveMaxAge = this.memoryMonitor.pressureDetected ? 
                    this.maxCacheAge * 0.5 : this.maxCacheAge;
                
                if (age > adaptiveMaxAge) {
                    entriesToClean.push(key);
                }
            }
            
            // Clean oldest entries first
            entriesToClean.forEach(key => {
                cacheInfo.cache.delete(key);
                cleanedEntries++;
            });
        }
        
        this.memoryCleanups++;
        console.log(`[DefenseUpgradeValidationCache] Adaptive cleanup completed: ${cleanedEntries} entries removed`);
    }

    /**
     * Perform aggressive cleanup when critical memory pressure is detected
     */
    performAggressiveCleanup() {
        const beforeSizes = {
            upgradeTrees: this.upgradeTreeCache.size,
            validationResults: this.validationResultCache.size,
            structureValidations: this.structureValidationCache.size,
            choiceValidations: this.choiceValidationCache.size
        };
        
        // Clear all but the most recently used entries (keep 20%)
        this.aggressiveCleanupCache(this.choiceValidationCache, 0.2);
        this.aggressiveCleanupCache(this.structureValidationCache, 0.2);
        this.aggressiveCleanupCache(this.validationResultCache, 0.3);
        this.aggressiveCleanupCache(this.upgradeTreeCache, 0.5); // Keep more upgrade trees
        
        const afterSizes = {
            upgradeTrees: this.upgradeTreeCache.size,
            validationResults: this.validationResultCache.size,
            structureValidations: this.structureValidationCache.size,
            choiceValidations: this.choiceValidationCache.size
        };
        
        const totalRemoved = Object.keys(beforeSizes).reduce((sum, key) => 
            sum + (beforeSizes[key] - afterSizes[key]), 0);
        
        this.memoryCleanups++;
        console.warn(`[DefenseUpgradeValidationCache] Aggressive cleanup completed: ${totalRemoved} entries removed`);
        
        // Reset memory pressure detection
        this.memoryMonitor.pressureDetected = false;
    }

    /**
     * Aggressively clean cache keeping only a percentage of most recent entries
     */
    aggressiveCleanupCache(cache, keepRatio) {
        if (cache.size === 0) return;
        
        const entries = Array.from(cache.entries());
        const keepCount = Math.max(1, Math.floor(entries.length * keepRatio));
        
        // Sort by timestamp (most recent first)
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        
        // Clear cache and add back only the most recent entries
        cache.clear();
        for (let i = 0; i < keepCount; i++) {
            cache.set(entries[i][0], entries[i][1]);
        }
    }

    /**
     * Invalidate all caches due to configuration changes
     */
    invalidateAllCaches() {
        const beforeSize = this.upgradeTreeCache.size + this.validationResultCache.size + 
                          this.structureValidationCache.size + this.choiceValidationCache.size;
        
        this.upgradeTreeCache.clear();
        this.validationResultCache.clear();
        this.structureValidationCache.clear();
        this.choiceValidationCache.clear();
        
        this.invalidationCount++;
        
        console.log(`[DefenseUpgradeValidationCache] All caches invalidated: ${beforeSize} entries cleared (version ${this.cacheVersion})`);
    }

    /**
     * Check if cache entry is valid based on version
     */
    isCacheEntryValid(cacheEntry) {
        if (!cacheEntry) return false;
        
        // Check version compatibility
        if (cacheEntry.version && cacheEntry.version !== this.cacheVersion) {
            return false;
        }
        
        // Check age
        const age = Date.now() - cacheEntry.timestamp;
        const maxAge = this.memoryMonitor.pressureDetected ? 
            this.maxCacheAge * 0.5 : this.maxCacheAge;
        
        return age < maxAge;
    }

    /**
     * Get cached upgrade tree or fetch and cache if not available
     */
    getUpgradeTree(defenseType) {
        // Check for config changes before cache lookup
        if (Date.now() - this.lastConfigCheck > this.configCheckInterval) {
            this.updateConfigHash();
        }
        
        const cacheKey = `tree_${defenseType}`;
        
        // Check cache first with version validation
        if (this.upgradeTreeCache.has(cacheKey)) {
            const cached = this.upgradeTreeCache.get(cacheKey);
            if (this.isCacheEntryValid(cached)) {
                this.cacheHits++;
                return cached.tree;
            } else {
                // Cache expired or invalid version, remove it
                this.upgradeTreeCache.delete(cacheKey);
            }
        }
        
        this.cacheMisses++;
        
        // Fetch and cache the tree
        const tree = this.fetchUpgradeTree(defenseType);
        this.upgradeTreeCache.set(cacheKey, {
            tree: tree,
            timestamp: Date.now(),
            version: this.cacheVersion
        });
        
        return tree;
    }

    /**
     * Fetch upgrade tree from CONFIG with fallback
     */
    fetchUpgradeTree(defenseType) {
        try {
            const upgradeTrees = CONFIG.UPGRADE_TREES || {};
            const defenseTree = upgradeTrees[defenseType];
            
            if (!defenseTree) {
                console.warn(`[DefenseUpgradeValidationCache] No upgrade tree found for defense type: ${defenseType}`);
                return this.generateFallbackTree(defenseType);
            }
            
            return defenseTree;
        } catch (error) {
            console.error(`[DefenseUpgradeValidationCache] Error fetching upgrade tree for ${defenseType}:`, error);
            return this.generateFallbackTree(defenseType);
        }
    }

    /**
     * Lazy validation for upgrade paths - only validates when needed
     */
    validateUpgradePath(defenseType, level, choiceIndex = null) {
        const pathKey = `path_${defenseType}_${level}_${choiceIndex || 'default'}`;
        
        // Check if already validated with version compatibility
        if (this.validationResultCache.has(pathKey)) {
            const cached = this.validationResultCache.get(pathKey);
            if (this.isCacheEntryValid(cached)) {
                this.cacheHits++;
                return cached.result;
            } else {
                this.validationResultCache.delete(pathKey);
            }
        }
        
        this.cacheMisses++;
        
        // Prevent duplicate validation
        if (this.validationInProgress.has(pathKey)) {
            return { valid: false, reason: 'Validation in progress' };
        }
        
        this.validationInProgress.add(pathKey);
        
        try {
            const startTime = performance.now();
            const result = this.performLazyPathValidation(defenseType, level, choiceIndex);
            const validationTime = performance.now() - startTime;
            
            // Update performance metrics
            this.validationTimeTotal += validationTime;
            this.validationCount++;
            
            // Cache the result with version information
            this.validationResultCache.set(pathKey, {
                result: result,
                timestamp: Date.now(),
                version: this.cacheVersion,
                validationTime: validationTime
            });
            
            return result;
        } finally {
            this.validationInProgress.delete(pathKey);
        }
    }

    /**
     * Perform lazy validation - only validate specific path, not entire tree
     */
    performLazyPathValidation(defenseType, level, choiceIndex) {
        try {
            const tree = this.getUpgradeTree(defenseType);
            const upgrade = tree[level];
            
            if (!upgrade) {
                return {
                    valid: false,
                    reason: `No upgrade configuration found for level ${level}`,
                    fallbackAvailable: true
                };
            }
            
            // Validate just this specific upgrade structure
            const structureValid = this.validateSingleUpgradeStructure(upgrade, level, defenseType);
            if (!structureValid.valid) {
                return structureValid;
            }
            
            // If choice specified, validate only that choice
            if (choiceIndex !== null && upgrade.choices) {
                if (choiceIndex < 0 || choiceIndex >= upgrade.choices.length) {
                    return {
                        valid: false,
                        reason: `Choice index ${choiceIndex} out of bounds`,
                        maxChoiceIndex: upgrade.choices.length - 1
                    };
                }
                
                const choiceValid = this.validateSingleChoice(upgrade.choices[choiceIndex], choiceIndex, level);
                if (!choiceValid.valid) {
                    return choiceValid;
                }
            }
            
            return {
                valid: true,
                validated: {
                    level: level,
                    hasChoices: !!(upgrade.choices && upgrade.choices.length > 1),
                    choiceCount: upgrade.choices ? upgrade.choices.length : 0,
                    abilities: upgrade.abilities || [],
                    modifiers: upgrade.modifiers || {}
                }
            };
            
        } catch (error) {
            return {
                valid: false,
                reason: `Validation error: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Validate single upgrade structure with caching
     */
    validateSingleUpgradeStructure(upgrade, level, defenseType) {
        const structureKey = `structure_${defenseType}_${level}`;
        
        // Check structure cache with version validation
        if (this.structureValidationCache.has(structureKey)) {
            const cached = this.structureValidationCache.get(structureKey);
            if (this.isCacheEntryValid(cached)) {
                this.cacheHits++;
                return cached.result;
            } else {
                this.structureValidationCache.delete(structureKey);
            }
        }
        
        this.cacheMisses++;
        
        const result = this.performStructureValidation(upgrade, level);
        
        // Cache structure validation result with version
        this.structureValidationCache.set(structureKey, {
            result: result,
            timestamp: Date.now(),
            version: this.cacheVersion
        });
        
        return result;
    }

    /**
     * Perform actual structure validation
     */
    performStructureValidation(upgrade, level) {
        if (!upgrade || typeof upgrade !== 'object') {
            return {
                valid: false,
                reason: `Upgrade for level ${level} is not a valid object`
            };
        }
        
        // Quick essential checks only
        const essential = ['modifiers', 'abilities', 'choices'];
        const issues = [];
        
        // Validate modifiers efficiently
        if (upgrade.modifiers && typeof upgrade.modifiers !== 'object') {
            issues.push('Invalid modifiers structure');
        } else if (upgrade.modifiers) {
            const validModifiers = new Set(['damage', 'range', 'fireRate', 'size']);
            for (const [modifier, value] of Object.entries(upgrade.modifiers)) {
                if (!validModifiers.has(modifier)) {
                    issues.push(`Unknown modifier: ${modifier}`);
                } else if (typeof value !== 'number' || value <= 0) {
                    issues.push(`Invalid value for ${modifier}: ${value}`);
                }
            }
        }
        
        // Validate abilities efficiently
        if (upgrade.abilities && !Array.isArray(upgrade.abilities)) {
            issues.push('Abilities must be an array');
        }
        
        // Validate choices structure (defer individual choice validation)
        if (upgrade.choices && !Array.isArray(upgrade.choices)) {
            issues.push('Choices must be an array');
        }
        
        return {
            valid: issues.length === 0,
            reason: issues.length > 0 ? issues.join(', ') : null,
            issues: issues
        };
    }

    /**
     * Validate single choice with caching
     */
    validateSingleChoice(choice, choiceIndex, level) {
        const choiceKey = `choice_${level}_${choiceIndex}_${JSON.stringify(choice).substring(0, 50)}`;
        
        // Check choice cache with version validation
        if (this.choiceValidationCache.has(choiceKey)) {
            const cached = this.choiceValidationCache.get(choiceKey);
            if (this.isCacheEntryValid(cached)) {
                this.cacheHits++;
                return cached.result;
            } else {
                this.choiceValidationCache.delete(choiceKey);
            }
        }
        
        this.cacheMisses++;
        
        const result = this.performChoiceValidation(choice, choiceIndex);
        
        // Cache choice validation result with version
        this.choiceValidationCache.set(choiceKey, {
            result: result,
            timestamp: Date.now(),
            version: this.cacheVersion
        });
        
        return result;
    }

    /**
     * Perform actual choice validation
     */
    performChoiceValidation(choice, choiceIndex) {
        if (!choice || typeof choice !== 'object') {
            return {
                valid: false,
                reason: `Choice ${choiceIndex} is not a valid object`
            };
        }
        
        const issues = [];
        
        // Quick validation of essential properties
        if (choice.modifiers && typeof choice.modifiers !== 'object') {
            issues.push('Invalid modifiers in choice');
        }
        
        if (choice.abilities && !Array.isArray(choice.abilities)) {
            issues.push('Abilities must be an array in choice');
        }
        
        return {
            valid: issues.length === 0,
            reason: issues.length > 0 ? issues.join(', ') : null,
            issues: issues
        };
    }

    /**
     * Pre-validate commonly used upgrade paths
     */
    preValidateCommonPaths(defenseTypes) {
        const commonLevels = [2, 3, 4, 5]; // Most frequently upgraded levels
        
        for (const defenseType of defenseTypes) {
            for (const level of commonLevels) {
                // Add to lazy validation queue
                this.lazyValidationQueue.add(`${defenseType}_${level}`);
            }
        }
        
        // Process queue asynchronously
        this.processLazyValidationQueue();
    }

    /**
     * Process lazy validation queue in background
     */
    processLazyValidationQueue() {
        if (this.lazyValidationQueue.size === 0) return;
        
        const batchSize = 5;
        const batch = Array.from(this.lazyValidationQueue).slice(0, batchSize);
        
        for (const pathKey of batch) {
            const [defenseType, level] = pathKey.split('_');
            this.validateUpgradePath(defenseType, parseInt(level));
            this.lazyValidationQueue.delete(pathKey);
        }
        
        // Continue processing if more items exist
        if (this.lazyValidationQueue.size > 0) {
            setTimeout(() => this.processLazyValidationQueue(), 50);
        }
    }

    /**
     * Generate optimized fallback tree
     */
    generateFallbackTree(defenseType) {
        const fallbackKey = `fallback_${defenseType}`;
        
        // Check if fallback is already cached
        if (this.upgradeTreeCache.has(fallbackKey)) {
            const cached = this.upgradeTreeCache.get(fallbackKey);
            if (Date.now() - cached.timestamp < this.maxCacheAge * 2) { // Longer cache for fallbacks
                return cached.tree;
            }
        }
        
        console.warn(`[DefenseUpgradeValidationCache] Generating fallback upgrade tree for ${defenseType}`);
        
        const fallbackTree = {};
        const maxLevel = 10; // Reasonable default
        
        // Generate efficient fallback upgrades
        for (let level = 2; level <= maxLevel; level++) {
            fallbackTree[level] = {
                description: `Basic upgrade to level ${level}`,
                modifiers: {
                    damage: 1.2,
                    range: level > 3 ? 1.1 : 1.0,
                    fireRate: level > 2 ? 0.9 : 1.0
                },
                abilities: this.getFallbackAbilities(level)
            };
        }
        
        // Cache the fallback tree
        this.upgradeTreeCache.set(fallbackKey, {
            tree: fallbackTree,
            timestamp: Date.now()
        });
        
        return fallbackTree;
    }

    /**
     * Get fallback abilities for specific level
     */
    getFallbackAbilities(level) {
        const abilityMap = {
            3: ['improved_targeting'],
            5: ['rapid_fire'],
            7: ['armor_piercing'],
            9: ['explosive_rounds']
        };
        
        return abilityMap[level] || [];
    }

    /**
     * Validate abilities with caching
     */
    validateAbilities(abilities, defenseType = 'generic') {
        if (!abilities || !Array.isArray(abilities)) {
            return [];
        }
        
        const abilitiesKey = `abilities_${abilities.join('_')}_${defenseType}`;
        
        // Check cache with version validation
        if (this.validationResultCache.has(abilitiesKey)) {
            const cached = this.validationResultCache.get(abilitiesKey);
            if (this.isCacheEntryValid(cached)) {
                this.cacheHits++;
                return cached.result;
            } else {
                this.validationResultCache.delete(abilitiesKey);
            }
        }
        
        this.cacheMisses++;
        
        // Perform validation
        const validAbilities = new Set([
            'armor_piercing', 'explosive_rounds', 'improved_targeting', 'rapid_fire',
            'slow_field', 'multi_shot', 'chain_lightning', 'quantum_bypass', 'viral_spread',
            'confusion', 'redirect', 'holographic_decoy', 'mass_confusion', 'phantom_army',
            'reflection_boost', 'omni_reflection', 'perfect_reflection', 'truth_revelation',
            'stealth_field', 'misdirection', 'invisibility_cloak', 'shadow_network',
            'boost_aura', 'resource_generation', 'dharma_blessing', 'network_amplification',
            'fortress_mode', 'wisdom_aura', 'enlightenment_burst'
        ]);
        
        const filteredAbilities = abilities.filter(ability => {
            return typeof ability === 'string' && validAbilities.has(ability);
        });
        
        // Cache the result with version
        this.validationResultCache.set(abilitiesKey, {
            result: filteredAbilities,
            timestamp: Date.now(),
            version: this.cacheVersion
        });
        
        return filteredAbilities;
    }

    /**
     * Cleanup expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        
        if (now - this.lastCleanup < this.cleanupInterval) {
            return;
        }
        
        this.lastCleanup = now;
        
        let cleaned = 0;
        
        // Clean upgrade tree cache
        for (const [key, value] of this.upgradeTreeCache.entries()) {
            if (now - value.timestamp > this.maxCacheAge) {
                this.upgradeTreeCache.delete(key);
                cleaned++;
            }
        }
        
        // Clean validation result cache
        for (const [key, value] of this.validationResultCache.entries()) {
            if (now - value.timestamp > this.maxCacheAge) {
                this.validationResultCache.delete(key);
                cleaned++;
            }
        }
        
        // Clean structure validation cache
        for (const [key, value] of this.structureValidationCache.entries()) {
            if (now - value.timestamp > this.maxCacheAge) {
                this.structureValidationCache.delete(key);
                cleaned++;
            }
        }
        
        // Clean choice validation cache
        for (const [key, value] of this.choiceValidationCache.entries()) {
            if (now - value.timestamp > this.maxCacheAge) {
                this.choiceValidationCache.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`[DefenseUpgradeValidationCache] Cleaned ${cleaned} expired cache entries`);
        }
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        const totalCacheOperations = this.cacheHits + this.cacheMisses;
        const hitRate = totalCacheOperations > 0 ? (this.cacheHits / totalCacheOperations * 100).toFixed(2) : 0;
        const avgValidationTime = this.validationCount > 0 ? (this.validationTimeTotal / this.validationCount).toFixed(2) : 0;
        const memoryUsageKB = (this.estimateCacheMemoryUsage() / 1024).toFixed(2);
        
        return {
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            hitRate: `${hitRate}%`,
            avgValidationTime: `${avgValidationTime}ms`,
            totalValidations: this.validationCount,
            invalidationCount: this.invalidationCount,
            memoryCleanups: this.memoryCleanups,
            currentVersion: this.cacheVersion,
            memoryUsage: `${memoryUsageKB}KB`,
            memoryPressure: this.isMemoryPressureHigh(),
            cacheSize: {
                upgradeTrees: this.upgradeTreeCache.size,
                validationResults: this.validationResultCache.size,
                structureValidations: this.structureValidationCache.size,
                choiceValidations: this.choiceValidationCache.size
            },
            lazyQueueSize: this.lazyValidationQueue.size
        };
    }

    /**
     * Reset all caches
     */
    reset() {
        this.upgradeTreeCache.clear();
        this.validationResultCache.clear();
        this.structureValidationCache.clear();
        this.choiceValidationCache.clear();
        this.lazyValidationQueue.clear();
        this.validationInProgress.clear();
        
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this.validationTimeTotal = 0;
        this.validationCount = 0;
        this.invalidationCount = 0;
        this.memoryCleanups = 0;
        
        // Reset cache version to trigger complete invalidation
        this.updateConfigHash();
        
        console.log('[DefenseUpgradeValidationCache] All caches reset, version updated to', this.cacheVersion);
    }
}

// Global cache instance
const DEFENSE_VALIDATION_CACHE = new DefenseUpgradeValidationCache();

// Projectile class for defense attacks
class Projectile {
    constructor(x, y, target, damage, speed, type = 'normal', defenseType = 'firewall') {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.type = type;
        this.defenseType = defenseType;
        
        // Visual properties
        this.color = this.getProjectileColor();
        this.size = this.getProjectileSize();
        this.trailParticles = [];
        
        // Physics
        this.velocityX = 0;
        this.velocityY = 0;
        this.calculateVelocity();
        
        // State
        this.isActive = true;
        this.lifetime = 5000; // 5 seconds max lifetime
        this.createdTime = Date.now();
        
        // Special effects
        this.hasHitEffect = false;
        this.piercing = type === 'piercing';
        this.explosive = type === 'explosive';
        this.homing = type === 'homing';
    }
    
    calculateVelocity() {
        if (this.target && this.target.isAlive) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                this.velocityX = (dx / distance) * this.speed;
                this.velocityY = (dy / distance) * this.speed;
            }
        }
    }
    
    getProjectileColor() {
        const colors = {
            firewall: '#ff6b6b',
            encryption: '#4ecdc4',
            decoy: '#45b7d1',
            mirror: '#f9ca24',
            anonymity: '#6c5ce7',
            distributor: '#ffd700'
        };
        return colors[this.defenseType] || '#ffffff';
    }
    
    getProjectileSize() {
        const sizes = {
            normal: 4,
            piercing: 6,
            explosive: 8,
            homing: 5
        };
        return sizes[this.type] || 4;
    }
    
    update(deltaTime) {
        if (!this.isActive) return;
        
        // Update homing behavior
        if (this.homing && this.target && this.target.isAlive) {
            this.calculateVelocity();
        }
        
        // Update position
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        
        // Add trail particles
        if (Math.random() < 0.5) {
            this.trailParticles.push({
                x: this.x,
                y: this.y,
                life: 300,
                color: this.color,
                size: this.size * 0.5
            });
        }
        
        // Update trail particles
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            this.trailParticles[i].life -= deltaTime;
            if (this.trailParticles[i].life <= 0) {
                this.trailParticles.splice(i, 1);
            }
        }
        
        // Check lifetime
        if (Date.now() - this.createdTime > this.lifetime) {
            this.isActive = false;
        }
        
        // Check collision with target
        if (this.target && this.target.isAlive) {
            const distance = Utils.distance(this.x, this.y, this.target.x, this.target.y);
            if (distance < this.target.size + this.size) {
                this.hitTarget();
            }
        }
    }
    
    hitTarget() {
        if (!this.hasHitEffect) {
            this.hasHitEffect = true;
            
            // Apply damage
            const killed = this.target.takeDamage(this.damage, this.type);
            
            // Create hit effects
            this.createHitEffect();
            
            // Handle special projectile types
            if (this.explosive) {
                this.createExplosion();
            }
            
            if (!this.piercing) {
                this.isActive = false;
            }
        }
    }
    
    createHitEffect() {
        // Create impact particles
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            const speed = Utils.random(50, 100);
            this.trailParticles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 500,
                color: this.color,
                size: 3
            });
        }
    }
    
    createExplosion() {
        // Explosive projectiles damage nearby enemies
        // This will be handled by the game's area effect system
        return {
            x: this.x,
            y: this.y,
            radius: 60,
            damage: this.damage * 0.5,
            type: 'explosive'
        };
    }
    
    render(ctx) {
        if (!this.isActive) return;
        
        // Render trail particles
        this.trailParticles.forEach(particle => {
            const alpha = particle.life / 300;
            ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Render main projectile
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        
        switch (this.type) {
            case 'piercing':
                this.renderPiercingProjectile(ctx);
                break;
            case 'explosive':
                this.renderExplosiveProjectile(ctx);
                break;
            case 'homing':
                this.renderHomingProjectile(ctx);
                break;
            default:
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
        }
    }
    
    renderPiercingProjectile(ctx) {
        // Render as an arrow
        const angle = Math.atan2(this.velocityY, this.velocityX);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(-this.size, -this.size * 0.5);
        ctx.lineTo(-this.size * 0.5, 0);
        ctx.lineTo(-this.size, this.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
    
    renderExplosiveProjectile(ctx) {
        // Render with pulsing effect
        const pulseScale = 1 + 0.3 * Math.sin(Date.now() * 0.01);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * pulseScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Add inner glow
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderHomingProjectile(ctx) {
        // Render with spiral trail
        const time = Date.now() * 0.01;
        for (let i = 0; i < 3; i++) {
            const angle = time + (i * Math.PI * 2 / 3);
            const spiralRadius = this.size * 0.7;
            const spiralX = this.x + Math.cos(angle) * spiralRadius;
            const spiralY = this.y + Math.sin(angle) * spiralRadius;
            
            ctx.fillStyle = this.color + '80';
            ctx.beginPath();
            ctx.arc(spiralX, spiralY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Main projectile
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}

// Main Defense class with tower mechanics
class Defense {
    constructor(type, x, y) {
        this.type = type;
        this.config = CONFIG.DEFENSE_TYPES[type];
        this.x = x;
        this.y = y;
        
        // Base stats
        this.baseDamage = this.config.damage;
        this.baseRange = this.config.range;
        this.baseFireRate = this.config.fireRate;
        this.color = this.config.color;
        this.cost = this.config.cost;
        this.size = 20;
        
        // Upgrade system with cache integration
        this.level = 1;
        this.maxLevel = 5;
        this.upgradeMultiplier = 1.5;
        
        // Cache system reference and optimization flags
        this.validationCache = DEFENSE_VALIDATION_CACHE;
        this.lastUpgradeValidation = null;
        this.upgradeTreeCached = null;
        this.upgradeTreeCacheTime = 0;
        
        // Current stats (affected by upgrades)
        this.damage = this.baseDamage;
        this.range = this.baseRange;
        this.fireRate = this.baseFireRate;
        
        // Targeting and combat
        this.target = null;
        this.lastFireTime = 0;
        this.projectiles = [];
        this.targetingMode = 'closest'; // closest, strongest, weakest, first, last
        
        // Special abilities
        this.abilities = this.config.abilities || [];
        this.abilityTimers = {};
        this.statusEffects = {};
        
        // Visual effects
        this.fireAnimation = 0;
        this.rangeIndicator = false;
        this.effectParticles = [];
        this.rotationAngle = 0;
        
        // State management
        this.isActive = true;
        this.stunned = false;
        this.stunnedTime = 0;
        this.corrupted = false;
        this.corruptedTime = 0;
        
        // Initialize special behaviors
        this.initializeSpecialBehavior();
        
        // Pre-cache common upgrade validations for this defense type
        this.preValidateUpgrades();
    }
    
    initializeSpecialBehavior() {
        // Initialize ability-specific properties
        this.abilities.forEach(ability => {
            switch (ability) {
                case 'slow_field':
                    this.slowFieldRadius = this.range * 0.8;
                    this.slowAmount = 0.5;
                    break;
                case 'armor_piercing':
                    this.armorPiercing = true;
                    break;
                case 'chain_lightning':
                    this.chainTargets = 3;
                    this.chainRange = 80;
                    break;
                case 'healing':
                    this.healingAmount = 20;
                    this.healingRadius = 100;
                    break;
            }
        });
    }
    
    update(deltaTime, enemies, allDefenses) {
        if (!this.isActive) return;
        
        // Update status effects
        this.updateStatusEffects(deltaTime);
        
        if (this.stunned) return;
        
        // Update targeting
        this.updateTargeting(enemies);
        
        // Update special abilities
        this.updateSpecialAbilities(deltaTime, enemies, allDefenses);
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
        // Try to fire
        if (this.canFire() && this.target) {
            this.fire();
        }
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
    }
    
    updateStatusEffects(deltaTime) {
        // Update stun
        if (this.stunned) {
            this.stunnedTime -= deltaTime;
            if (this.stunnedTime <= 0) {
                this.stunned = false;
            }
        }
        
        // Update corruption
        if (this.corrupted) {
            this.corruptedTime -= deltaTime;
            if (this.corruptedTime <= 0) {
                this.corrupted = false;
            }
        }
    }
    
    updateTargeting(enemies) {
        // Clear target if it's dead or out of range
        if (this.target && (!this.target.isAlive || this.getDistanceToTarget() > this.range)) {
            this.target = null;
        }
        
        // Find new target if needed
        if (!this.target) {
            this.target = this.findTarget(enemies);
        }
        
        // Update rotation to face target
        if (this.target) {
            const targetAngle = Utils.angle(this.x, this.y, this.target.x, this.target.y);
            this.rotationAngle = Utils.lerp(this.rotationAngle, targetAngle, 0.1);
        }
    }
    
    updateSpecialAbilities(deltaTime, enemies, allDefenses) {
        this.abilities.forEach(ability => {
            if (!this.abilityTimers[ability]) {
                this.abilityTimers[ability] = 0;
            }
            this.abilityTimers[ability] += deltaTime;
            
            switch (ability) {
                case 'slow_field':
                    this.updateSlowField(enemies);
                    break;
                case 'chain_lightning':
                    if (this.abilityTimers[ability] > 3000) {
                        this.executeChainLightning(enemies);
                        this.abilityTimers[ability] = 0;
                    }
                    break;
                case 'healing':
                    if (this.abilityTimers[ability] > 5000) {
                        this.executeHealing(allDefenses);
                        this.abilityTimers[ability] = 0;
                    }
                    break;
                case 'boost_aura':
                    this.updateBoostAura(allDefenses);
                    break;
            }
        });
    }
    
    updateSlowField(enemies) {
        enemies.forEach(enemy => {
            const distance = Utils.distance(this.x, this.y, enemy.x, enemy.y);
            if (distance <= this.slowFieldRadius) {
                enemy.slowEffect = Math.min(enemy.slowEffect, this.slowAmount);
                enemy.slowEffectTime = Math.max(enemy.slowEffectTime, 1000);
            }
        });
    }
    
    executeChainLightning(enemies) {
        if (!this.target) return;
        
        let currentTarget = this.target;
        const hitTargets = [currentTarget];
        
        for (let i = 0; i < this.chainTargets && currentTarget; i++) {
            // Damage current target
            currentTarget.takeDamage(this.damage * 0.8, 'chain_lightning');
            
            // Find next target
            let nextTarget = null;
            let minDistance = Infinity;
            
            enemies.forEach(enemy => {
                if (!hitTargets.includes(enemy) && enemy.isAlive) {
                    const distance = Utils.distance(currentTarget.x, currentTarget.y, enemy.x, enemy.y);
                    if (distance <= this.chainRange && distance < minDistance) {
                        minDistance = distance;
                        nextTarget = enemy;
                    }
                }
            });
            
            if (nextTarget) {
                hitTargets.push(nextTarget);
                // Create visual lightning effect
                this.createLightningEffect(currentTarget, nextTarget);
                currentTarget = nextTarget;
            } else {
                break;
            }
        }
    }
    
    executeHealing(allDefenses) {
        allDefenses.forEach(defense => {
            const distance = Utils.distance(this.x, this.y, defense.x, defense.y);
            if (distance <= this.healingRadius && defense !== this) {
                // Heal status effects
                defense.stunned = false;
                defense.corrupted = false;
                defense.stunnedTime = 0;
                defense.corruptedTime = 0;
                
                // Create healing effect
                this.createHealingEffect(defense);
            }
        });
    }
    
    updateBoostAura(allDefenses) {
        allDefenses.forEach(defense => {
            const distance = Utils.distance(this.x, this.y, defense.x, defense.y);
            if (distance <= this.range && defense !== this) {
                defense.boosted = true;
                defense.boostTime = 1000;
            }
        });
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(deltaTime);
            
            if (!projectile.isActive) {
                // Handle explosive projectiles
                if (projectile.explosive && projectile.hasHitEffect) {
                    const explosion = projectile.createExplosion();
                    if (explosion) {
                        // Apply explosion damage (this will be handled by the game)
                        this.explosionQueue = this.explosionQueue || [];
                        this.explosionQueue.push(explosion);
                    }
                }
                
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    updateVisualEffects(deltaTime) {
        // Update fire animation
        if (this.fireAnimation > 0) {
            this.fireAnimation -= deltaTime;
        }
        
        // Update effect particles
        for (let i = this.effectParticles.length - 1; i >= 0; i--) {
            const particle = this.effectParticles[i];
            particle.life -= deltaTime;
            particle.x += particle.vx * deltaTime * 0.01;
            particle.y += particle.vy * deltaTime * 0.01;
            
            if (particle.life <= 0) {
                this.effectParticles.splice(i, 1);
            }
        }
    }
    
    findTarget(enemies) {
        const targetsInRange = enemies.filter(enemy => {
            return enemy.isAlive && Utils.distance(this.x, this.y, enemy.x, enemy.y) <= this.range;
        });
        
        if (targetsInRange.length === 0) return null;
        
        switch (this.targetingMode) {
            case 'closest':
                return targetsInRange.reduce((closest, enemy) => {
                    const closestDist = Utils.distance(this.x, this.y, closest.x, closest.y);
                    const enemyDist = Utils.distance(this.x, this.y, enemy.x, enemy.y);
                    return enemyDist < closestDist ? enemy : closest;
                });
                
            case 'strongest':
                return targetsInRange.reduce((strongest, enemy) => {
                    return enemy.health > strongest.health ? enemy : strongest;
                });
                
            case 'weakest':
                return targetsInRange.reduce((weakest, enemy) => {
                    return enemy.health < weakest.health ? enemy : weakest;
                });
                
            case 'first':
                return targetsInRange.reduce((first, enemy) => {
                    return enemy.getDistanceToEnd() < first.getDistanceToEnd() ? enemy : first;
                });
                
            case 'last':
                return targetsInRange.reduce((last, enemy) => {
                    return enemy.getDistanceToEnd() > last.getDistanceToEnd() ? enemy : last;
                });
                
            default:
                return targetsInRange[0];
        }
    }
    
    canFire() {
        return Date.now() - this.lastFireTime >= this.fireRate && !this.stunned;
    }
    
    fire() {
        if (!this.target || !this.canFire()) return;
        
        this.lastFireTime = Date.now();
        this.fireAnimation = 300;
        
        // Create projectile based on defense type
        const projectileType = this.getProjectileType();
        const projectile = new Projectile(
            this.x, this.y, 
            this.target, 
            this.getDamage(), 
            this.getProjectileSpeed(), 
            projectileType, 
            this.type
        );
        
        this.projectiles.push(projectile);
        
        // Special firing behaviors
        if (this.type === 'encryption' && this.level >= 3) {
            // Multi-shot at higher levels
            setTimeout(() => {
                if (this.target && this.target.isAlive) {
                    const projectile2 = new Projectile(
                        this.x, this.y, this.target, 
                        this.getDamage() * 0.7, 
                        this.getProjectileSpeed(), 
                        projectileType, this.type
                    );
                    this.projectiles.push(projectile2);
                }
            }, 100);
        }
        
        // Create muzzle flash effect
        this.createMuzzleFlash();
    }
    
    getProjectileType() {
        switch (this.type) {
            case 'firewall':
                return this.level >= 4 ? 'explosive' : 'normal';
            case 'encryption':
                return this.level >= 3 ? 'piercing' : 'normal';
            case 'mirror':
                return this.level >= 2 ? 'homing' : 'normal';
            default:
                return 'normal';
        }
    }
    
    getProjectileSpeed() {
        const baseSpeed = 800;
        const levelMultiplier = 1 + (this.level - 1) * 0.1;
        return baseSpeed * levelMultiplier;
    }
    
    getDamage() {
        let damage = this.damage;
        
        // Apply corruption penalty
        if (this.corrupted) {
            damage *= 0.7;
        }
        
        // Apply boost bonus
        if (this.boosted) {
            damage *= 1.3;
            this.boostTime -= 16; // Assuming 60 FPS
            if (this.boostTime <= 0) {
                this.boosted = false;
            }
        }
        
        return damage;
    }
    
    getDistanceToTarget() {
        if (!this.target) return Infinity;
        return Utils.distance(this.x, this.y, this.target.x, this.target.y);
    }
    
    upgrade(choiceIndex = null) {
        // Optimized validation with caching
        try {
            // Basic validation
            if (this.level >= this.maxLevel) {
                console.warn(`[Defense.upgrade] Defense ${this.type} already at max level ${this.maxLevel}`);
                return false;
            }
            
            const nextLevel = this.level + 1;
            
            // Use lazy validation cache instead of full tree validation
            const validationResult = this.validationCache.validateUpgradePath(this.type, nextLevel, choiceIndex);
            
            if (!validationResult.valid) {
                console.error(`[Defense.upgrade] Validation failed for ${this.type} level ${nextLevel}: ${validationResult.reason}`);
                
                // If fallback is available, try using it
                if (validationResult.fallbackAvailable) {
                    console.warn(`[Defense.upgrade] Attempting fallback upgrade for ${this.type}`);
                    return this.attemptFallbackUpgrade();
                }
                
                return false;
            }
            
            // Validate choice bounds if specified
            if (choiceIndex !== null && validationResult.validated.hasChoices) {
                if (choiceIndex < 0 || choiceIndex >= validationResult.validated.choiceCount) {
                    console.error(`[Defense.upgrade] Choice index ${choiceIndex} out of bounds (max: ${validationResult.validated.choiceCount - 1})`);
                    return false;
                }
            }
            
            // Store original values for rollback
            const originalValues = this.storeOriginalUpgradeValues();
            
            try {
                // Calculate upgrade cost
                const upgradeCost = this.getUpgradeCost();
                
                // Apply the upgrade
                this.level++;
                
                // Apply base stat improvements with error handling
                this.applyBaseStatUpgrades(originalValues);
                
                // Apply upgrade tree specific effects (now with cached validation)
                this.applyOptimizedUpgradeEffects(validationResult.validated, choiceIndex);
                
                // Apply special upgrade effects
                this.applyUpgradeEffects();
                
                // Pre-validate next level for future upgrades
                if (this.level < this.maxLevel) {
                    setTimeout(() => {
                        this.validationCache.validateUpgradePath(this.type, this.level + 1);
                    }, 100);
                }
                
                console.log(`[Defense.upgrade] Successfully upgraded ${this.type} to level ${this.level}`);
                return upgradeCost;
                
            } catch (upgradeError) {
                // Rollback changes if upgrade fails
                console.error(`[Defense.upgrade] Error during upgrade, rolling back:`, upgradeError);
                this.rollbackUpgrade(originalValues);
                return false;
            }
            
        } catch (validationError) {
            console.error(`[Defense.upgrade] Validation error for ${this.type} upgrade:`, validationError);
            return false;
        }
    }
    
    /**
     * Attempt fallback upgrade when normal validation fails
     */
    attemptFallbackUpgrade() {
        try {
            const originalValues = this.storeOriginalUpgradeValues();
            
            // Apply basic stat improvements
            this.level++;
            this.applyBaseStatUpgrades(originalValues);
            
            // Add basic abilities based on level
            const fallbackAbilities = this.validationCache.getFallbackAbilities(this.level);
            fallbackAbilities.forEach(ability => {
                if (!this.abilities.includes(ability)) {
                    this.abilities.push(ability);
                }
            });
            
            console.log(`[Defense.attemptFallbackUpgrade] Fallback upgrade applied to ${this.type} level ${this.level}`);
            return this.getUpgradeCost();
            
        } catch (error) {
            console.error(`[Defense.attemptFallbackUpgrade] Fallback upgrade failed:`, error);
            return false;
        }
    }
    
    /**
     * Apply upgrade effects using cached validation data
     */
    applyOptimizedUpgradeEffects(validatedData, choiceIndex) {
        try {
            const upgradeTree = this.getUpgradeTree();
            const upgrade = upgradeTree[this.level];
            
            if (!upgrade) {
                console.warn(`[Defense.applyOptimizedUpgradeEffects] No upgrade data for level ${this.level}, using cached data`);
                
                // Use cached validation data as fallback
                if (validatedData.abilities && validatedData.abilities.length > 0) {
                    const validAbilities = this.validationCache.validateAbilities(validatedData.abilities, this.type);
                    validAbilities.forEach(ability => {
                        if (!this.abilities.includes(ability)) {
                            this.abilities.push(ability);
                        }
                    });
                }
                
                // Apply basic modifiers from cache
                if (validatedData.modifiers) {
                    this.applyUpgradeModifiers(validatedData.modifiers);
                }
                
                return;
            }
            
            // Apply chosen effect if there are choices
            if (upgrade.choices && choiceIndex !== null && choiceIndex !== undefined) {
                const choice = upgrade.choices[choiceIndex];
                if (choice) {
                    // Apply choice-specific abilities (pre-validated)
                    if (choice.abilities && Array.isArray(choice.abilities)) {
                        const validAbilities = this.validationCache.validateAbilities(choice.abilities, this.type);
                        validAbilities.forEach(ability => {
                            if (!this.abilities.includes(ability)) {
                                this.abilities.push(ability);
                            }
                        });
                    }
                    
                    // Apply choice-specific modifiers
                    if (choice.modifiers) {
                        this.applyUpgradeModifiers(choice.modifiers);
                    }
                }
            }
            
            // Apply base upgrade abilities (pre-validated)
            if (upgrade.abilities && Array.isArray(upgrade.abilities)) {
                const validAbilities = this.validationCache.validateAbilities(upgrade.abilities, this.type);
                validAbilities.forEach(ability => {
                    if (!this.abilities.includes(ability)) {
                        this.abilities.push(ability);
                    }
                });
            }
            
            // Apply base upgrade modifiers
            if (upgrade.modifiers) {
                this.applyUpgradeModifiers(upgrade.modifiers);
            }
            
        } catch (error) {
            console.error(`[Defense.applyOptimizedUpgradeEffects] Error applying upgrade effects:`, error);
            throw error;
        }
    }
    
    /**
     * Store original values before upgrade for potential rollback
     */
    storeOriginalUpgradeValues() {
        return {
            level: this.level,
            damage: this.damage,
            range: this.range,
            fireRate: this.fireRate,
            size: this.size,
            abilities: [...this.abilities] // Clone abilities array
        };
    }
    
    /**
     * Apply base stat upgrades with error handling
     */
    applyBaseStatUpgrades(originalValues) {
        try {
            this.damage = Math.floor(this.baseDamage * Math.pow(this.upgradeMultiplier, this.level - 1));
            this.range = Math.floor(this.baseRange * Math.pow(1.2, this.level - 1));
            this.fireRate = Math.max(100, this.baseFireRate * Math.pow(0.9, this.level - 1));
        } catch (error) {
            console.error(`[Defense.applyBaseStatUpgrades] Error applying base upgrades:`, error);
            throw error;
        }
    }
    
    /**
     * Apply upgrade tree specific effects with validation
     */
    applyUpgradeTreeEffects(nextUpgrade, choiceIndex) {
        try {
            // Apply chosen effect if there are choices
            let effectToApply = nextUpgrade;
            
            if (nextUpgrade.choices && choiceIndex !== null && choiceIndex !== undefined) {
                const choice = nextUpgrade.choices[choiceIndex];
                if (!choice) {
                    throw new Error(`Invalid choice index ${choiceIndex}`);
                }
                
                // Apply choice-specific abilities
                if (choice.abilities && Array.isArray(choice.abilities)) {
                    const validAbilities = this.validateAbilities(choice.abilities);
                    validAbilities.forEach(ability => {
                        if (!this.abilities.includes(ability)) {
                            this.abilities.push(ability);
                        }
                    });
                }
                
                // Apply choice-specific modifiers
                if (choice.modifiers) {
                    this.applyUpgradeModifiers(choice.modifiers);
                }
                
                // Also apply base upgrade abilities
                effectToApply = nextUpgrade;
            }
            
            // Apply base upgrade abilities
            if (effectToApply.abilities && Array.isArray(effectToApply.abilities)) {
                const validAbilities = this.validateAbilities(effectToApply.abilities);
                validAbilities.forEach(ability => {
                    if (!this.abilities.includes(ability)) {
                        this.abilities.push(ability);
                    }
                });
            }
            
            // Apply base upgrade modifiers
            if (effectToApply.modifiers) {
                this.applyUpgradeModifiers(effectToApply.modifiers);
            }
            
        } catch (error) {
            console.error(`[Defense.applyUpgradeTreeEffects] Error applying upgrade tree effects:`, error);
            throw error;
        }
    }
    
    /**
     * Apply upgrade modifiers with validation
     */
    applyUpgradeModifiers(modifiers) {
        if (!modifiers || typeof modifiers !== 'object') {
            return;
        }
        
        Object.keys(modifiers).forEach(stat => {
            const modifier = modifiers[stat];
            
            if (typeof modifier !== 'number' || modifier <= 0) {
                console.warn(`[Defense.applyUpgradeModifiers] Invalid modifier value for ${stat}: ${modifier}`);
                return;
            }
            
            try {
                switch (stat) {
                    case 'damage':
                        this.damage = Math.floor(this.damage * modifier);
                        break;
                    case 'range':
                        this.range = Math.floor(this.range * modifier);
                        break;
                    case 'fireRate':
                        this.fireRate = Math.max(50, this.fireRate * modifier);
                        break;
                    case 'size':
                        this.size = Math.floor(this.size * modifier);
                        break;
                    default:
                        console.warn(`[Defense.applyUpgradeModifiers] Unknown modifier: ${stat}`);
                }
            } catch (error) {
                console.error(`[Defense.applyUpgradeModifiers] Error applying modifier ${stat}:`, error);
            }
        });
    }
    
    /**
     * Rollback upgrade changes if something goes wrong
     */
    rollbackUpgrade(originalValues) {
        try {
            this.level = originalValues.level;
            this.damage = originalValues.damage;
            this.range = originalValues.range;
            this.fireRate = originalValues.fireRate;
            this.size = originalValues.size;
            this.abilities = [...originalValues.abilities];
            
            console.log(`[Defense.rollbackUpgrade] Successfully rolled back ${this.type} upgrade`);
        } catch (error) {
            console.error(`[Defense.rollbackUpgrade] Critical error during rollback:`, error);
        }
    }
    
    applyUpgradeEffects() {
        const upgradeTree = this.getUpgradeTree();
        const levelUpgrades = upgradeTree[this.level];
        
        if (levelUpgrades) {
            // Apply automatic upgrades for this level
            if (levelUpgrades.abilities) {
                levelUpgrades.abilities.forEach(ability => {
                    if (!this.abilities.includes(ability)) {
                        this.abilities.push(ability);
                    }
                });
            }
            
            // Apply stat modifiers
            if (levelUpgrades.modifiers) {
                Object.keys(levelUpgrades.modifiers).forEach(stat => {
                    const modifier = levelUpgrades.modifiers[stat];
                    switch (stat) {
                        case 'damage':
                            this.damage = Math.floor(this.damage * modifier);
                            break;
                        case 'range':
                            this.range = Math.floor(this.range * modifier);
                            break;
                        case 'fireRate':
                            this.fireRate = Math.max(50, this.fireRate * modifier);
                            break;
                        case 'size':
                            this.size = Math.floor(this.size * modifier);
                            break;
                    }
                });
            }
        }
        
        // Legacy upgrade effects for backward compatibility
        switch (this.type) {
            case 'firewall':
                if (this.level === 3) {
                    this.abilities.push('armor_piercing');
                }
                if (this.level === 5) {
                    this.abilities.push('explosive_shots');
                }
                break;
                
            case 'encryption':
                if (this.level === 2) {
                    this.abilities.push('slow_field');
                }
                if (this.level === 4) {
                    this.abilities.push('multi_shot');
                }
                break;
                
            case 'decoy':
                if (this.level === 2) {
                    this.abilities.push('confusion');
                }
                if (this.level === 4) {
                    this.abilities.push('redirect');
                }
                break;
                
            case 'mirror':
                if (this.level === 3) {
                    this.abilities.push('reflection_boost');
                }
                if (this.level === 5) {
                    this.abilities.push('perfect_reflection');
                }
                break;
                
            case 'anonymity':
                if (this.level === 2) {
                    this.abilities.push('stealth_field');
                }
                if (this.level === 4) {
                    this.abilities.push('misdirection');
                }
                break;
                
            case 'distributor':
                if (this.level === 2) {
                    this.abilities.push('boost_aura');
                }
                if (this.level === 4) {
                    this.abilities.push('resource_generation');
                }
                break;
        }
        
        // Trigger upgrade visual effects
        this.renderUpgradeEffects();
        this.applyUpgradeVisuals();
    }
    
    getUpgradeCost() {
        return Math.floor(this.cost * Math.pow(1.8, this.level));
    }
    
    canUpgrade() {
        // Basic level check
        if (this.level >= this.maxLevel) {
            return false;
        }
        
        // Use cached validation for performance
        const nextLevel = this.level + 1;
        
        // Quick cache check first
        if (this.lastUpgradeValidation && 
            this.lastUpgradeValidation.level === nextLevel && 
            (Date.now() - this.lastUpgradeValidation.timestamp) < 10000) { // 10 second cache
            return this.lastUpgradeValidation.canUpgrade;
        }
        
        // Use lazy validation cache
        const validationResult = this.validationCache.validateUpgradePath(this.type, nextLevel);
        
        // Cache the result locally for immediate reuse
        this.lastUpgradeValidation = {
            level: nextLevel,
            canUpgrade: validationResult.valid || validationResult.fallbackAvailable,
            timestamp: Date.now(),
            validationResult: validationResult
        };
        
        return this.lastUpgradeValidation.canUpgrade;
    }
    
    setTargetingMode(mode) {
        this.targetingMode = mode;
    }
    
    /**
     * Pre-validate common upgrade paths for this defense type
     */
    preValidateUpgrades() {
        // Trigger background validation for next few levels
        const levelsToPreValidate = Math.min(3, this.maxLevel - this.level);
        for (let i = 1; i <= levelsToPreValidate; i++) {
            const targetLevel = this.level + i;
            if (targetLevel <= this.maxLevel) {
                // Queue validation for next level
                setTimeout(() => {
                    this.validationCache.validateUpgradePath(this.type, targetLevel);
                }, i * 10); // Stagger the validations
            }
        }
    }
    
    // Enhanced Phase 2 upgrade system methods with caching
    getUpgradeTree() {
        // Check local cache first (for very recent access)
        const now = Date.now();
        if (this.upgradeTreeCached && (now - this.upgradeTreeCacheTime) < 30000) { // 30 second local cache
            return this.upgradeTreeCached;
        }
        
        // Use validation cache system
        const tree = this.validationCache.getUpgradeTree(this.type);
        
        // Cache locally for immediate reuse
        this.upgradeTreeCached = tree;
        this.upgradeTreeCacheTime = now;
        
        return tree;
    }
    
    getUpgradePreview() {
        if (!this.canUpgrade()) return null;
        
        const nextLevel = this.level + 1;
        
        // Use cached validation result from canUpgrade if available
        let validationResult = null;
        if (this.lastUpgradeValidation && this.lastUpgradeValidation.level === nextLevel) {
            validationResult = this.lastUpgradeValidation.validationResult;
        } else {
            validationResult = this.validationCache.validateUpgradePath(this.type, nextLevel);
        }
        
        if (!validationResult.valid && !validationResult.fallbackAvailable) {
            console.warn(`[Defense.getUpgradePreview] No valid upgrade preview available for level ${nextLevel}`);
            return null;
        }
        
        try {
            // Create optimized preview using cached validation data
            const preview = {
                level: nextLevel,
                cost: this.getUpgradeCost(),
                statChanges: {},
                newAbilities: [],
                description: `Upgrade to level ${nextLevel}`,
                hasChoice: false,
                usingFallback: !validationResult.valid
            };
            
            // Get upgrade data efficiently
            if (validationResult.valid && validationResult.validated) {
                const validated = validationResult.validated;
                preview.hasChoice = validated.hasChoices;
                preview.newAbilities = this.validationCache.validateAbilities(validated.abilities || [], this.type);
                
                // Use validated modifiers for stat calculation
                if (validated.modifiers) {
                    this.calculateOptimizedStatChanges(preview, validated.modifiers, nextLevel);
                } else {
                    this.calculateBasicStatChanges(preview, nextLevel);
                }
            } else {
                // Use fallback calculations
                this.calculateBasicStatChanges(preview, nextLevel);
                const fallbackAbilities = this.validationCache.getFallbackAbilities(nextLevel);
                preview.newAbilities = this.validationCache.validateAbilities(fallbackAbilities, this.type);
                preview.description += ' (Basic upgrade)';
            }
            
            return preview;
            
        } catch (error) {
            console.error(`[Defense.getUpgradePreview] Error generating preview:`, error);
            return this.generateFallbackPreview(nextLevel);
        }
    }
    
    /**
     * Calculate stat changes using cached modifier data
     */
    calculateOptimizedStatChanges(preview, modifiers, nextLevel) {
        try {
            // Base stat calculations
            const baseDamage = Math.floor(this.baseDamage * Math.pow(this.upgradeMultiplier, nextLevel - 1));
            const baseRange = Math.floor(this.baseRange * Math.pow(1.2, nextLevel - 1));
            const baseFireRate = Math.max(100, this.baseFireRate * Math.pow(0.9, nextLevel - 1));
            
            // Apply modifiers efficiently
            if (modifiers.damage) {
                preview.statChanges.damage = Math.floor(baseDamage * modifiers.damage) - this.damage;
            } else {
                preview.statChanges.damage = baseDamage - this.damage;
            }
            
            if (modifiers.range) {
                preview.statChanges.range = Math.floor(baseRange * modifiers.range) - this.range;
            } else {
                preview.statChanges.range = baseRange - this.range;
            }
            
            if (modifiers.fireRate) {
                const adjustedFireRate = Math.max(50, baseFireRate * modifiers.fireRate);
                preview.statChanges.fireRate = this.fireRate - adjustedFireRate;
            } else {
                preview.statChanges.fireRate = this.fireRate - baseFireRate;
            }
            
        } catch (error) {
            console.warn(`[Defense.calculateOptimizedStatChanges] Error with optimized calculation:`, error);
            this.calculateBasicStatChanges(preview, nextLevel);
        }
    }
    
    /**
     * Calculate basic stat changes without modifiers
     */
    calculateBasicStatChanges(preview, nextLevel) {
        try {
            const baseDamage = Math.floor(this.baseDamage * Math.pow(this.upgradeMultiplier, nextLevel - 1));
            const baseRange = Math.floor(this.baseRange * Math.pow(1.2, nextLevel - 1));
            const baseFireRate = Math.max(100, this.baseFireRate * Math.pow(0.9, nextLevel - 1));
            
            preview.statChanges.damage = baseDamage - this.damage;
            preview.statChanges.range = baseRange - this.range;
            preview.statChanges.fireRate = this.fireRate - baseFireRate;
            
        } catch (error) {
            console.error(`[Defense.calculateBasicStatChanges] Error with basic calculation:`, error);
            preview.statChanges = { damage: 0, range: 0, fireRate: 0 };
        }
    }
    
    /**
     * Generate fallback preview when normal preview fails
     */
    generateFallbackPreview(nextLevel) {
        return {
            level: nextLevel,
            cost: this.getUpgradeCost(),
            statChanges: {
                damage: Math.floor(this.damage * 0.2),
                range: Math.floor(this.range * 0.1),  
                fireRate: Math.floor(this.fireRate * -0.1)
            },
            newAbilities: [],
            description: `Basic upgrade to level ${nextLevel}`,
            hasChoice: false,
            usingFallback: true,
            error: 'Preview generated using fallback method'
        };
    }
    
    hasUpgradeChoice() {
        try {
            const upgradeTree = this.getUpgradeTree();
            const nextLevel = this.level + 1;
            const nextUpgrade = upgradeTree[nextLevel];
            
            if (!nextUpgrade) {
                return false;
            }
            
            // Validate choices exist and are properly structured
            if (!nextUpgrade.choices || !Array.isArray(nextUpgrade.choices)) {
                return false;
            }
            
            // Validate each choice structure
            const validChoices = nextUpgrade.choices.filter(choice => 
                this.validateUpgradeChoice(choice)
            );
            
            return validChoices.length > 1;
        } catch (error) {
            console.error(`[Defense.hasUpgradeChoice] Error checking upgrade choices:`, error);
            return false;
        }
    }
    
    // COMPREHENSIVE VALIDATION METHODS
    
    /**
     * Validates the entire upgrade tree structure for this defense type
     * @param {Object} upgradeTree - The upgrade tree to validate
     * @returns {boolean} - True if valid, false otherwise
     */
    validateUpgradeTreeStructure(upgradeTree) {
        if (!upgradeTree || typeof upgradeTree !== 'object') {
            console.error('[Defense.validateUpgradeTreeStructure] Upgrade tree is not a valid object');
            return false;
        }
        
        // Check that all levels from 2 to maxLevel exist
        for (let level = 2; level <= this.maxLevel; level++) {
            if (!upgradeTree[level]) {
                console.warn(`[Defense.validateUpgradeTreeStructure] Missing upgrade configuration for level ${level}`);
                continue; // Allow missing levels, will use fallback
            }
            
            if (!this.validateUpgradeStructure(upgradeTree[level], level)) {
                console.error(`[Defense.validateUpgradeTreeStructure] Invalid upgrade structure at level ${level}`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Validates a single upgrade structure
     * @param {Object} upgrade - The upgrade configuration to validate
     * @param {number} level - The level this upgrade is for
     * @returns {boolean} - True if valid, false otherwise
     */
    validateUpgradeStructure(upgrade, level) {
        if (!upgrade || typeof upgrade !== 'object') {
            console.error(`[Defense.validateUpgradeStructure] Upgrade for level ${level} is not a valid object`);
            return false;
        }
        
        // Validate description
        if (upgrade.description && typeof upgrade.description !== 'string') {
            console.warn(`[Defense.validateUpgradeStructure] Invalid description type for level ${level}`);
        }
        
        // Validate modifiers structure
        if (upgrade.modifiers) {
            if (typeof upgrade.modifiers !== 'object') {
                console.error(`[Defense.validateUpgradeStructure] Invalid modifiers structure for level ${level}`);
                return false;
            }
            
            // Validate individual modifier values
            const validModifiers = ['damage', 'range', 'fireRate', 'size'];
            for (const [modifier, value] of Object.entries(upgrade.modifiers)) {
                if (!validModifiers.includes(modifier)) {
                    console.warn(`[Defense.validateUpgradeStructure] Unknown modifier '${modifier}' for level ${level}`);
                }
                if (typeof value !== 'number' || value <= 0) {
                    console.error(`[Defense.validateUpgradeStructure] Invalid modifier value for '${modifier}' at level ${level}: ${value}`);
                    return false;
                }
            }
        }
        
        // Validate abilities
        if (upgrade.abilities && !this.validateAbilities(upgrade.abilities)) {
            console.error(`[Defense.validateUpgradeStructure] Invalid abilities structure for level ${level}`);
            return false;
        }
        
        // Validate choices if they exist
        if (upgrade.choices) {
            if (!Array.isArray(upgrade.choices)) {
                console.error(`[Defense.validateUpgradeStructure] Choices must be an array for level ${level}`);
                return false;
            }
            
            for (let i = 0; i < upgrade.choices.length; i++) {
                if (!this.validateUpgradeChoice(upgrade.choices[i], i)) {
                    console.error(`[Defense.validateUpgradeStructure] Invalid choice ${i} for level ${level}`);
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Validates a single upgrade choice
     * @param {Object} choice - The choice to validate
     * @param {number} choiceIndex - Index of the choice for logging
     * @returns {boolean} - True if valid, false otherwise
     */
    validateUpgradeChoice(choice, choiceIndex = null) {
        if (!choice || typeof choice !== 'object') {
            console.error(`[Defense.validateUpgradeChoice] Choice ${choiceIndex} is not a valid object`);
            return false;
        }
        
        // Validate name and description
        if (choice.name && typeof choice.name !== 'string') {
            console.warn(`[Defense.validateUpgradeChoice] Invalid name type for choice ${choiceIndex}`);
        }
        if (choice.description && typeof choice.description !== 'string') {
            console.warn(`[Defense.validateUpgradeChoice] Invalid description type for choice ${choiceIndex}`);
        }
        
        // Validate modifiers if present
        if (choice.modifiers) {
            if (typeof choice.modifiers !== 'object') {
                console.error(`[Defense.validateUpgradeChoice] Invalid modifiers for choice ${choiceIndex}`);
                return false;
            }
            
            const validModifiers = ['damage', 'range', 'fireRate', 'size'];
            for (const [modifier, value] of Object.entries(choice.modifiers)) {
                if (!validModifiers.includes(modifier)) {
                    console.warn(`[Defense.validateUpgradeChoice] Unknown modifier '${modifier}' in choice ${choiceIndex}`);
                }
                if (typeof value !== 'number' || value <= 0) {
                    console.error(`[Defense.validateUpgradeChoice] Invalid modifier value for '${modifier}' in choice ${choiceIndex}: ${value}`);
                    return false;
                }
            }
        }
        
        // Validate abilities if present
        if (choice.abilities && !this.validateAbilities(choice.abilities)) {
            console.error(`[Defense.validateUpgradeChoice] Invalid abilities in choice ${choiceIndex}`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Validates abilities array
     * @param {Array} abilities - Array of ability strings to validate
     * @returns {boolean|Array} - True if valid, or filtered array of valid abilities
     */
    validateAbilities(abilities) {
        if (!abilities) return [];
        
        if (!Array.isArray(abilities)) {
            console.error('[Defense.validateAbilities] Abilities must be an array');
            return false;
        }
        
        const validAbilities = [
            'armor_piercing', 'explosive_rounds', 'improved_targeting', 'rapid_fire',
            'slow_field', 'multi_shot', 'chain_lightning', 'quantum_bypass', 'viral_spread',
            'confusion', 'redirect', 'holographic_decoy', 'mass_confusion', 'phantom_army',
            'reflection_boost', 'omni_reflection', 'perfect_reflection', 'truth_revelation',
            'stealth_field', 'misdirection', 'invisibility_cloak', 'shadow_network',
            'boost_aura', 'resource_generation', 'dharma_blessing', 'network_amplification',
            'fortress_mode', 'wisdom_aura', 'enlightenment_burst'
        ];
        
        const filteredAbilities = abilities.filter(ability => {
            if (typeof ability !== 'string') {
                console.warn(`[Defense.validateAbilities] Invalid ability type: ${typeof ability}`);
                return false;
            }
            
            if (!validAbilities.includes(ability)) {
                console.warn(`[Defense.validateAbilities] Unknown ability: ${ability}`);
                return false; // Remove unknown abilities
            }
            
            return true;
        });
        
        return filteredAbilities;
    }
    
    /**
     * Provides fallback upgrade tree when main tree is corrupted
     * @returns {Object} - Basic fallback upgrade tree
     */
    getFallbackUpgradeTree() {
        console.warn(`[Defense.getFallbackUpgradeTree] Using fallback upgrade tree for ${this.type}`);
        
        const fallbackTree = {};
        
        // Generate basic upgrades for each level
        for (let level = 2; level <= this.maxLevel; level++) {
            fallbackTree[level] = {
                description: `Basic upgrade to level ${level}`,
                modifiers: {
                    damage: 1.2,
                    range: level > 3 ? 1.1 : 1.0,
                    fireRate: level > 2 ? 0.9 : 1.0
                },
                abilities: []
            };
            
            // Add basic abilities at certain levels
            if (level === 3) {
                fallbackTree[level].abilities = ['improved_targeting'];
            } else if (level === 5) {
                fallbackTree[level].abilities = ['enhanced_power'];
            }
        }
        
        return fallbackTree;
    }
    
    /**
     * Validates upgrade choice exists before applying in upgrade methods
     * @param {number} choiceIndex - The choice index to validate
     * @returns {boolean} - True if choice exists and is valid
     */
    validateUpgradeChoiceExists(choiceIndex) {
        try {
            const upgradeTree = this.getUpgradeTree();
            const nextLevel = this.level + 1;
            const nextUpgrade = upgradeTree[nextLevel];
            
            if (!nextUpgrade) {
                console.error(`[Defense.validateUpgradeChoiceExists] No upgrade configuration for level ${nextLevel}`);
                return false;
            }
            
            // If no choices, choiceIndex should be 0 or null
            if (!nextUpgrade.choices) {
                return choiceIndex === 0 || choiceIndex === null;
            }
            
            // Validate choice index bounds
            if (choiceIndex < 0 || choiceIndex >= nextUpgrade.choices.length) {
                console.error(`[Defense.validateUpgradeChoiceExists] Choice index ${choiceIndex} out of bounds (max: ${nextUpgrade.choices.length - 1})`);
                return false;
            }
            
            // Validate the specific choice
            const choice = nextUpgrade.choices[choiceIndex];
            return this.validateUpgradeChoice(choice, choiceIndex);
            
        } catch (error) {
            console.error(`[Defense.validateUpgradeChoiceExists] Error validating choice ${choiceIndex}:`, error);
            return false;
        }
    }
    
    renderUpgradeEffects() {
        // Create upgrade celebration particles
        const particleCount = 20 + (this.level * 5);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const distance = Utils.random(20, 60);
            const speed = Utils.random(100, 200);
            
            this.effectParticles.push({
                x: this.x + Math.cos(angle) * distance,
                y: this.y + Math.sin(angle) * distance,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1000 + Utils.random(0, 500),
                maxLife: 1000 + Utils.random(0, 500),
                color: this.getUpgradeLevelColor(),
                size: Utils.random(3, 8),
                type: 'upgrade',
                fadeOut: true
            });
        }
        
        // Create level-up text effect
        this.effectParticles.push({
            x: this.x,
            y: this.y - 40,
            vx: 0,
            vy: -30,
            life: 2000,
            maxLife: 2000,
            color: '#ffd700',
            size: 16,
            type: 'text',
            text: `LEVEL ${this.level}!`,
            fadeOut: true
        });
        
        // Add stat boost indicators
        const preview = this.getUpgradePreview();
        if (preview && preview.statChanges) {
            let textY = this.y - 60;
            
            Object.keys(preview.statChanges).forEach(stat => {
                const change = preview.statChanges[stat];
                if (change > 0) {
                    this.effectParticles.push({
                        x: this.x + Utils.random(-30, 30),
                        y: textY,
                        vx: Utils.random(-20, 20),
                        vy: -40,
                        life: 1500,
                        maxLife: 1500,
                        color: '#4ecdc4',
                        size: 12,
                        type: 'text',
                        text: `+${Math.floor(change)} ${stat.toUpperCase()}`,
                        fadeOut: true
                    });
                    textY -= 20;
                }
            });
        }
    }
    
    applyUpgradeVisuals() {
        // Update defense appearance based on level
        const baseSize = 20;
        this.size = baseSize + (this.level - 1) * 4; // Grow larger with each level
        
        // Add visual effects for high-level defenses
        if (this.level >= 3) {
            this.glowEffect = true;
            this.glowRadius = this.size + 10;
            this.glowColor = this.getUpgradeLevelColor();
        }
        
        if (this.level >= 5) {
            this.particleAura = true;
            this.auraParticles = [];
        }
        
        // Update color intensity based on level
        this.displayColor = this.getUpgradeLevelColor();
    }
    
    getUpgradeLevelColor() {
        const baseColor = this.color;
        const levelColors = {
            1: baseColor,
            2: this.brightenColor(baseColor, 0.2),
            3: this.brightenColor(baseColor, 0.4),
            4: this.brightenColor(baseColor, 0.6),
            5: '#ffd700' // Gold for max level
        };
        
        return levelColors[this.level] || baseColor;
    }
    
    brightenColor(color, factor) {
        // Simple color brightening (assumes hex color)
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            
            const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
            const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
            const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
            
            return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
        }
        return color;
    }
    
    createMuzzleFlash() {
        // Create particles for muzzle flash
        for (let i = 0; i < 5; i++) {
            const angle = this.rotationAngle + Utils.random(-0.3, 0.3);
            const speed = Utils.random(50, 100);
            
            this.effectParticles.push({
                x: this.x + Math.cos(this.rotationAngle) * this.size,
                y: this.y + Math.sin(this.rotationAngle) * this.size,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 200,
                color: this.color,
                size: 3
            });
        }
    }
    
    createLightningEffect(from, to) {
        // Create lightning particles
        const steps = 8;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = Utils.lerp(from.x, to.x, t) + Utils.random(-10, 10);
            const y = Utils.lerp(from.y, to.y, t) + Utils.random(-10, 10);
            
            this.effectParticles.push({
                x: x,
                y: y,
                vx: 0,
                vy: 0,
                life: 300,
                color: '#00ffff',
                size: 2
            });
        }
    }
    
    createHealingEffect(target) {
        // Create healing particles
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const radius = 30;
            
            this.effectParticles.push({
                x: target.x + Math.cos(angle) * radius,
                y: target.y + Math.sin(angle) * radius,
                vx: -Math.cos(angle) * 20,
                vy: -Math.sin(angle) * 20,
                life: 1000,
                color: '#00ff00',
                size: 4
            });
        }
    }
    
    render(ctx) {
        if (!this.isActive) return;
        
        // Render range indicator if selected
        if (this.rangeIndicator) {
            this.renderRangeIndicator(ctx);
        }
        
        // Render special field effects
        this.renderSpecialEffects(ctx);
        
        // Render main defense body
        this.renderDefenseBody(ctx);
        
        // Render projectiles
        this.projectiles.forEach(projectile => {
            projectile.render(ctx);
        });
        
        // Render effect particles
        this.renderEffectParticles(ctx);
        
        // Render status indicators
        this.renderStatusIndicators(ctx);
        
        // Render upgrade level
        this.renderUpgradeLevel(ctx);
    }
    
    renderRangeIndicator(ctx) {
        ctx.strokeStyle = this.color + '40';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    renderSpecialEffects(ctx) {
        // Render slow field
        if (this.abilities.includes('slow_field')) {
            ctx.strokeStyle = '#4ecdc460';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.slowFieldRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Render boost aura
        if (this.abilities.includes('boost_aura')) {
            const pulseScale = 1 + 0.2 * Math.sin(Date.now() * 0.005);
            ctx.strokeStyle = '#ffd70060';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range * pulseScale, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    renderDefenseBody(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Apply status effect visuals
        if (this.stunned) {
            ctx.globalAlpha = 0.5;
        }
        if (this.corrupted) {
            ctx.filter = 'hue-rotate(180deg)';
        }
        if (this.boosted) {
            ctx.filter = 'brightness(1.3)';
        }
        
        // Fire animation scale
        const fireScale = this.fireAnimation > 0 ? 1.2 : 1.0;
        ctx.scale(fireScale, fireScale);
        
        // Rotate to face target
        if (this.target && this.type !== 'decoy' && this.type !== 'anonymity') {
            ctx.rotate(this.rotationAngle);
        }
        
        // Render based on defense type
        this.renderDefenseTypeSpecific(ctx);
        
        ctx.restore();
    }
    
    renderDefenseTypeSpecific(ctx) {
        const size = this.size;
        
        switch (this.type) {
            case 'firewall':
                // Fortress-like structure
                ctx.fillStyle = this.color;
                ctx.fillRect(-size, -size, size * 2, size * 2);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.strokeRect(-size, -size, size * 2, size * 2);
                
                // Battlements
                for (let i = -1; i <= 1; i++) {
                    ctx.fillRect(i * size * 0.6 - 3, -size - 5, 6, 8);
                }
                
                // Cannon barrel
                ctx.fillStyle = '#333';
                ctx.fillRect(0, -3, size + 5, 6);
                break;
                
            case 'encryption':
                // Monastery with rotating cipher wheel
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Cipher wheel
                const wheelRotation = Date.now() * 0.002;
                ctx.rotate(wheelRotation);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 / 8) * i;
                    const x1 = Math.cos(angle) * size * 0.6;
                    const y1 = Math.sin(angle) * size * 0.6;
                    const x2 = Math.cos(angle) * size * 0.9;
                    const y2 = Math.sin(angle) * size * 0.9;
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
                break;
                
            case 'decoy':
                // Temple with false targeting
                ctx.fillStyle = this.color;
                // Base
                ctx.fillRect(-size, size * 0.5, size * 2, size * 0.5);
                // Pillars
                for (let i = -1; i <= 1; i++) {
                    ctx.fillRect(i * size * 0.6 - 2, -size * 0.5, 4, size);
                }
                // Roof
                ctx.beginPath();
                ctx.moveTo(-size * 1.2, size * 0.5);
                ctx.lineTo(0, -size);
                ctx.lineTo(size * 1.2, size * 0.5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
                
            case 'mirror':
                // Reflective surface
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Mirror surface
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
                gradient.addColorStop(0, '#ffffff80');
                gradient.addColorStop(1, this.color);
                ctx.fillStyle = gradient;
                ctx.fill();
                
                // Reflection lines
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                for (let i = 0; i < 4; i++) {
                    const angle = (Math.PI / 2) * i;
                    const x1 = Math.cos(angle) * size * 0.3;
                    const y1 = Math.sin(angle) * size * 0.3;
                    const x2 = Math.cos(angle) * size * 0.7;
                    const y2 = Math.sin(angle) * size * 0.7;
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
                break;
                
            case 'anonymity':
                // Cloaking device
                ctx.fillStyle = this.color + '80'; // Semi-transparent
                ctx.beginPath();
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Cloaking field
                const pulsePhase = Date.now() * 0.003;
                for (let i = 0; i < 3; i++) {
                    const radius = size * (0.5 + 0.3 * Math.sin(pulsePhase + i));
                    ctx.strokeStyle = this.color + '40';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, radius, 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;
                
            case 'distributor':
                // Distribution hub
                ctx.fillStyle = this.color;
                ctx.fillRect(-size, -size, size * 2, size * 2);
                ctx.stroke();
                
                // Central hub
                ctx.beginPath();
                ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Distribution arms
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 3;
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 / 6) * i;
                    const x = Math.cos(angle) * size;
                    const y = Math.sin(angle) * size;
                    
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
                break;
                
            default:
                // Default defense rendering
                ctx.fillStyle = this.color;
                ctx.fillRect(-size, -size, size * 2, size * 2);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.strokeRect(-size, -size, size * 2, size * 2);
        }
    }
    
    renderEffectParticles(ctx) {
        this.effectParticles.forEach(particle => {
            const alpha = particle.life / 1000;
            ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    renderStatusIndicators(ctx) {
        let yOffset = -this.size - 15;
        
        // Stunned indicator
        if (this.stunned) {
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⚡', this.x, this.y + yOffset);
            yOffset -= 15;
        }
        
        // Corrupted indicator
        if (this.corrupted) {
            ctx.fillStyle = '#800080';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('☠', this.x, this.y + yOffset);
            yOffset -= 15;
        }
        
        // Boosted indicator
        if (this.boosted) {
            ctx.fillStyle = '#00ff00';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('↑', this.x, this.y + yOffset);
        }
    }
    
    renderUpgradeLevel(ctx) {
        if (this.level > 1) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Lv.${this.level}`, this.x, this.y + this.size + 15);
        }
    }
    
    // Utility methods
    getInfo() {
        return {
            type: this.type,
            level: this.level,
            damage: this.damage,
            range: this.range,
            fireRate: this.fireRate,
            upgradeCost: this.getUpgradeCost(),
            canUpgrade: this.canUpgrade(),
            abilities: this.abilities,
            cacheStats: this.getCachePerformanceStats()
        };
    }
    
    /**
     * Get performance statistics for this defense's cache usage
     */
    getCachePerformanceStats() {
        if (!this.validationCache) {
            return { error: 'Cache not available' };
        }
        
        const globalStats = this.validationCache.getPerformanceStats();
        
        return {
            global: globalStats,
            local: {
                hasTreeCache: !!this.upgradeTreeCached,
                treeCacheAge: this.upgradeTreeCacheTime ? Date.now() - this.upgradeTreeCacheTime : null,
                lastValidationLevel: this.lastUpgradeValidation?.level || null,
                lastValidationAge: this.lastUpgradeValidation?.timestamp ? 
                    Date.now() - this.lastUpgradeValidation.timestamp : null
            }
        };
    }
    
    /**
     * Trigger cache cleanup for this defense
     */
    cleanupCache() {
        // Clear local cache
        this.upgradeTreeCached = null;
        this.upgradeTreeCacheTime = 0;
        this.lastUpgradeValidation = null;
        
        // Trigger global cache cleanup
        this.validationCache.cleanupCache();
        
        console.log(`[Defense.cleanupCache] Cache cleaned for ${this.type} defense`);
    }
    
    /**
     * Pre-warm cache for next few upgrade levels
     */
    preWarmCache() {
        const levelsToWarm = Math.min(3, this.maxLevel - this.level);
        for (let i = 1; i <= levelsToWarm; i++) {
            const targetLevel = this.level + i;
            if (targetLevel <= this.maxLevel) {
                // Asynchronously validate upgrades
                setTimeout(() => {
                    this.validationCache.validateUpgradePath(this.type, targetLevel);
                    
                    // Also validate with common choice indices
                    for (let choice = 0; choice < 3; choice++) {
                        setTimeout(() => {
                            this.validationCache.validateUpgradePath(this.type, targetLevel, choice);
                        }, choice * 10);
                    }
                }, i * 50);
            }
        }
    }
    
    /**
     * Reset all cache data for this defense
     */
    resetCache() {
        this.upgradeTreeCached = null;
        this.upgradeTreeCacheTime = 0;
        this.lastUpgradeValidation = null;
        
        console.log(`[Defense.resetCache] Local cache reset for ${this.type} defense`);
    }
    
    setRangeIndicator(show) {
        this.rangeIndicator = show;
    }
}

// Initialize global cache with common defense types on load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof CONFIG !== 'undefined' && CONFIG.DEFENSE_TYPES) {
        const defenseTypes = Object.keys(CONFIG.DEFENSE_TYPES);
        console.log(`[DefenseUpgradeValidationCache] Pre-validating ${defenseTypes.length} defense types`);
        DEFENSE_VALIDATION_CACHE.preValidateCommonPaths(defenseTypes);
    }
});

// Periodic cache cleanup
setInterval(() => {
    DEFENSE_VALIDATION_CACHE.cleanupCache();
}, 300000); // Every 5 minutes

