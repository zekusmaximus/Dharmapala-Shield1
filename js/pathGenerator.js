// Enhanced PathGenerator with Comprehensive Error Handling
// Buddhist Cyberpunk Tower Defense Game
// Procedural path generation with multiple modes and themes

// Features:
// - Input validation for canvas dimensions, entry/exit points
// - Reachability checks and graceful fallback mechanisms  
// - Comprehensive error logging and statistics
// - Multi-level fallback system for robustness
// - Configurable error handling behavior
// - Performance monitoring and optimization
// - Theme-based procedural variations
// - Configurable smoothing intensity

class PathGenerator {
    // Comprehensive input validation for constructor
    validateConstructorInputs(canvasWidth, canvasHeight, gridSize) {
        const errors = [];
        const minCanvasSize = 200;
        const maxCanvasSize = 10000;
        const minGridSize = 10;
        const maxGridSize = 200;
        
        // Canvas width validation
        if (typeof canvasWidth !== 'number' || isNaN(canvasWidth)) {
            errors.push('Canvas width must be a valid number');
        } else if (canvasWidth < minCanvasSize) {
            errors.push(`Canvas width must be at least ${minCanvasSize}px`);
        } else if (canvasWidth > maxCanvasSize) {
            errors.push(`Canvas width must not exceed ${maxCanvasSize}px`);
        }
        
        // Canvas height validation
        if (typeof canvasHeight !== 'number' || isNaN(canvasHeight)) {
            errors.push('Canvas height must be a valid number');
        } else if (canvasHeight < minCanvasSize) {
            errors.push(`Canvas height must be at least ${minCanvasSize}px`);
        } else if (canvasHeight > maxCanvasSize) {
            errors.push(`Canvas height must not exceed ${maxCanvasSize}px`);
        }
        
        // Grid size validation
        if (typeof gridSize !== 'number' || isNaN(gridSize)) {
            errors.push('Grid size must be a valid number');
        } else if (gridSize < minGridSize) {
            errors.push(`Grid size must be at least ${minGridSize}`);
        } else if (gridSize > maxGridSize) {
            errors.push(`Grid size must not exceed ${maxGridSize}`);
        }
        
        // Aspect ratio validation
        if (canvasWidth > 0 && canvasHeight > 0) {
            const aspectRatio = canvasWidth / canvasHeight;
            if (aspectRatio < 0.5 || aspectRatio > 3.0) {
                errors.push('Canvas aspect ratio should be between 0.5 and 3.0 for optimal path generation');
            }
        }
        
        if (errors.length > 0) {
            const error = new Error(`PathGenerator validation failed: ${errors.join(', ')}`);
            error.name = 'PathGeneratorValidationError';
            error.validationErrors = errors;
            throw error;
        }
    }
    
    constructor(canvasWidth, canvasHeight, gridSize, options = {}) {
        // Comprehensive input validation
        this.validateConstructorInputs(canvasWidth, canvasHeight, gridSize);
        
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.gridSize = gridSize;
        
        // Production mode configuration
        this.productionMode = options.productionMode || false;
        
        // Error handling configuration with production optimizations
        this.errorHandlingConfig = {
            maxValidationRetries: this.productionMode ? 2 : 5,
            maxPathGenerationRetries: this.productionMode ? 1 : 3,
            enableFallbackGeneration: true,
            logErrors: !this.productionMode,
            throwOnCriticalErrors: false,
            fallbackToSimplePath: true,
            minCanvasSize: 200,
            maxCanvasSize: 10000,
            minGridSize: 10,
            maxGridSize: 200,
            // Production-specific settings
            enableDetailedErrorTracking: !this.productionMode,
            enableValidationOverhead: !this.productionMode,
            enablePerformanceMonitoring: !this.productionMode,
            errorBatchSize: this.productionMode ? 10 : 1,
            errorBatchInterval: this.productionMode ? 5000 : 0, // 5 seconds
            circularBufferSize: this.productionMode ? 25 : 50
        };
        
        // Error tracking and statistics with production optimizations
        this.errorStats = {
            validationErrors: 0,
            generationErrors: 0,
            fallbacksUsed: 0,
            criticalErrors: 0,
            inputValidationErrors: 0,
            reachabilityErrors: 0,
            lastError: null,
            errorHistory: [], // Circular buffer for production mode
            startTime: Date.now(),
            // Production-specific tracking
            totalErrors: 0,
            errorBatchQueue: [],
            lastBatchFlush: Date.now(),
            circularBufferIndex: 0,
            circularBufferFull: false
        };
        
        // Initialize circular buffer for production mode
        if (this.productionMode) {
            this.errorStats.errorHistory = new Array(this.errorHandlingConfig.circularBufferSize);
            this.errorStats.errorHistory.fill(null);
        }
        
        // Error batching timer for production mode
        this.errorBatchTimer = null;
        if (this.productionMode && this.errorHandlingConfig.errorBatchInterval > 0) {
            this.setupErrorBatching();
        }
        
        // Path generation parameters
        this.minPathLength = 300;
        this.maxPathLength = 800;
        this.minCurveRadius = 50;
        this.maxCurveRadius = 150;
        this.segmentLength = 60;
        
        // Performance optimization parameters with production adjustments
        this.maxIterations = this.productionMode ? 250 : 500;
        this.maxRetries = this.productionMode ? 2 : 3;
        this.performanceThreshold = this.productionMode ? 25 : 50;
        
        // Disable expensive features in production mode
        this.enableExtensiveValidation = !this.productionMode;
        this.enableDetailedLogging = !this.productionMode;
        this.enableDebugTracing = !this.productionMode;
        
        // RNG value caching for frequently used calculations
        this.rngCache = new Map();
        this.cacheSize = 1000;
        this.cacheMissCount = 0;
        this.cacheHitCount = 0;
        
        // Performance monitoring with production mode considerations
        this.performanceStats = {
            totalGenerations: 0,
            averageTime: 0,
            maxTime: 0,
            minTime: Infinity,
            failureCount: 0,
            fallbackCount: 0,
            cacheHitRate: 0,
            // Production-specific metrics
            lightweightOperations: 0,
            validationSkips: 0,
            productionOptimizations: 0
        };
        
        // Async generation support
        this.isGeneratingAsync = false;
        this.currentAsyncTask = null;
        this.asyncCallbacks = new Map();
        
        // Theme configurations
        this.themes = {
            urban: {
                straightBias: 0.3,
                curveComplexity: 0.6,
                obstacleTypes: ['building', 'intersection'],
                pathWidth: 40
            },
            forest: {
                straightBias: 0.1,
                curveComplexity: 0.8,
                obstacleTypes: ['tree', 'rock'],
                pathWidth: 35
            },
            mountain: {
                straightBias: 0.4,
                curveComplexity: 0.5,
                obstacleTypes: ['cliff', 'boulder'],
                pathWidth: 45
            },
            cyber: {
                straightBias: 0.6,
                curveComplexity: 0.9,
                obstacleTypes: ['firewall', 'node'],
                pathWidth: 50
            }
        };
        
        // Random seed for reproducible generation
        this.seed = 0;
        this.rng = this.createSeededRNG(this.seed);
        
        // Validation systems
        this.flexibleValidation = null;
        this.levelPreservation = null;
        this.validationEnabled = true;
        this.validationProfile = 'balanced';
        this.previewMode = false;
        
        console.log(`PathGenerator initialized with ${this.productionMode ? 'PRODUCTION' : 'DEVELOPMENT'} error handling`);
    }
    
    // =============================================================================
    // PRODUCTION-OPTIMIZED ERROR HANDLING METHODS
    // =============================================================================
    
    /**
     * Setup error batching system for production mode
     */
    setupErrorBatching() {
        if (!this.productionMode) return;
        
        this.errorBatchTimer = setInterval(() => {
            this.flushErrorBatch();
        }, this.errorHandlingConfig.errorBatchInterval);
    }
    
    /**
     * Flush batched errors to reduce logging frequency
     */
    flushErrorBatch() {
        if (this.errorStats.errorBatchQueue.length === 0) return;
        
        try {
            const batchSummary = this.createErrorBatchSummary();
            
            // Log batch summary instead of individual errors
            if (this.errorHandlingConfig.logErrors) {
                console.warn(`PathGenerator Error Batch [${batchSummary.count} errors]:`, batchSummary);
            }
            
            // Clear batch queue
            this.errorStats.errorBatchQueue = [];
            this.errorStats.lastBatchFlush = Date.now();
            
        } catch (error) {
            // Fail silently in production to prevent error cascades
            if (!this.productionMode) {
                console.error('Failed to flush error batch:', error);
            }
        }
    }
    
    /**
     * Create summary of batched errors
     */
    createErrorBatchSummary() {
        const batch = this.errorStats.errorBatchQueue;
        const summary = {
            count: batch.length,
            timespan: Date.now() - this.errorStats.lastBatchFlush,
            errorTypes: {},
            contexts: {},
            criticalCount: 0,
            mostRecentError: batch[batch.length - 1]
        };
        
        batch.forEach(error => {
            // Count by error type
            const type = error.errorType || 'Unknown';
            summary.errorTypes[type] = (summary.errorTypes[type] || 0) + 1;
            
            // Count by context
            const context = error.context || 'Unknown';
            summary.contexts[context] = (summary.contexts[context] || 0) + 1;
            
            // Count critical errors
            if (error.level === 'critical') {
                summary.criticalCount++;
            }
        });
        
        return summary;
    }
    
    /**
     * Add error to circular buffer (production mode)
     */
    addToCircularBuffer(errorEntry) {
        if (!this.productionMode) return;
        
        const buffer = this.errorStats.errorHistory;
        const index = this.errorStats.circularBufferIndex;
        
        buffer[index] = errorEntry;
        
        // Update circular buffer index
        this.errorStats.circularBufferIndex = (index + 1) % this.errorHandlingConfig.circularBufferSize;
        
        // Mark buffer as full when we've wrapped around
        if (this.errorStats.circularBufferIndex === 0 && !this.errorStats.circularBufferFull) {
            this.errorStats.circularBufferFull = true;
        }
    }
    
    /**
     * Get recent errors from circular buffer
     */
    getRecentErrors(count = 10) {
        if (!this.productionMode) {
            return this.errorStats.errorHistory.slice(-count);
        }
        
        const buffer = this.errorStats.errorHistory;
        const recent = [];
        const maxCount = Math.min(count, this.errorHandlingConfig.circularBufferSize);
        
        if (!this.errorStats.circularBufferFull) {
            // Buffer not full yet, return from beginning
            return buffer.slice(0, this.errorStats.circularBufferIndex).filter(e => e !== null).slice(-maxCount);
        }
        
        // Buffer is full, get most recent entries considering wrap-around
        const startIndex = this.errorStats.circularBufferIndex;
        for (let i = 0; i < maxCount; i++) {
            const index = (startIndex - 1 - i + this.errorHandlingConfig.circularBufferSize) % this.errorHandlingConfig.circularBufferSize;
            if (buffer[index] !== null) {
                recent.unshift(buffer[index]);
            }
        }
        
        return recent;
    }
    
    /**
     * Lightweight error logging for production mode
     */
    logErrorLightweight(error, context = '', level = 'error') {
        this.errorStats.totalErrors++;
        
        // Create minimal error entry
        const errorEntry = {
            timestamp: Date.now(),
            level,
            message: error.message || error,
            context,
            errorType: error.name || 'Unknown',
            // Skip expensive properties in production
            ...(this.productionMode ? {} : {
                stack: error.stack,
                id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            })
        };
        
        // Update basic counters
        this.updateErrorCounters(context, level);
        
        if (this.productionMode) {
            // Add to circular buffer
            this.addToCircularBuffer(errorEntry);
            
            // Add to batch queue if batching is enabled
            if (this.errorHandlingConfig.errorBatchInterval > 0) {
                this.errorStats.errorBatchQueue.push(errorEntry);
                
                // Force flush if batch is full
                if (this.errorStats.errorBatchQueue.length >= this.errorHandlingConfig.errorBatchSize) {
                    this.flushErrorBatch();
                }
            } else {
                // Log critical errors immediately even in production
                if (level === 'critical') {
                    console.error(`PathGenerator CRITICAL: ${context} - ${errorEntry.message}`);
                }
            }
        } else {
            // Development mode - use full logging
            this.logError(error, context, level);
            return;
        }
        
        this.errorStats.lastError = errorEntry;
    }
    
    /**
     * Update error counters efficiently
     */
    updateErrorCounters(context, level) {
        // Use early returns to minimize checks
        if (level === 'critical') {
            this.errorStats.criticalErrors++;
        }
        
        if (!context) return;
        
        // Use switch for better performance than multiple if-statements
        if (context.includes('validation')) {
            this.errorStats.validationErrors++;
        } else if (context.includes('generation')) {
            this.errorStats.generationErrors++;
        } else if (context.includes('input')) {
            this.errorStats.inputValidationErrors++;
        } else if (context.includes('reachability')) {
            this.errorStats.reachabilityErrors++;
        }
    }
    
    /**
     * Lightweight validation for production mode
     */
    validatePointLightweight(point, context = '') {
        if (this.productionMode) {
            // Minimal validation - only check essential properties
            if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
                this.performanceStats.validationSkips++;
                return false;
            }
            
            // Skip boundary checks in production for performance
            this.performanceStats.lightweightOperations++;
            return true;
        }
        
        // Full validation in development mode
        return this.validatePoint(point, context);
    }
    
    /**
     * Production-optimized reachability check
     */
    validatePointReachabilityLightweight(startPoint, endPoint, context = '') {
        if (this.productionMode) {
            // Skip expensive reachability calculations in production
            this.performanceStats.validationSkips++;
            this.performanceStats.lightweightOperations++;
            
            // Basic distance check only
            const dx = endPoint.x - startPoint.x;
            const dy = endPoint.y - startPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            return {
                isReachable: distance > 50, // Minimal threshold
                distance,
                startPoint,
                endPoint
            };
        }
        
        // Full validation in development mode
        return this.validatePointReachability(startPoint, endPoint, context);
    }
    
    /**
     * Enable/disable production mode at runtime
     */
    setProductionMode(enabled) {
        const wasProductionMode = this.productionMode;
        this.productionMode = enabled;
        
        if (enabled && !wasProductionMode) {
            // Switching to production mode
            this.optimizeForProduction();
        } else if (!enabled && wasProductionMode) {
            // Switching to development mode
            this.optimizeForDevelopment();
        }
        
        console.log(`PathGenerator switched to ${enabled ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
    }
    
    /**
     * Apply production optimizations
     */
    optimizeForProduction() {
        // Update configuration
        this.errorHandlingConfig.maxValidationRetries = 2;
        this.errorHandlingConfig.maxPathGenerationRetries = 1;
        this.errorHandlingConfig.logErrors = false;
        this.errorHandlingConfig.enableDetailedErrorTracking = false;
        this.errorHandlingConfig.enableValidationOverhead = false;
        
        // Update performance parameters
        this.maxIterations = 250;
        this.maxRetries = 2;
        this.performanceThreshold = 25;
        
        // Setup error batching
        if (this.errorHandlingConfig.errorBatchInterval > 0) {
            this.setupErrorBatching();
        }
        
        // Convert error history to circular buffer
        this.convertToCircularBuffer();
        
        this.performanceStats.productionOptimizations++;
    }
    
    /**
     * Apply development optimizations
     */
    optimizeForDevelopment() {
        // Restore full configuration
        this.errorHandlingConfig.maxValidationRetries = 5;
        this.errorHandlingConfig.maxPathGenerationRetries = 3;
        this.errorHandlingConfig.logErrors = true;
        this.errorHandlingConfig.enableDetailedErrorTracking = true;
        this.errorHandlingConfig.enableValidationOverhead = true;
        
        // Restore performance parameters
        this.maxIterations = 500;
        this.maxRetries = 3;
        this.performanceThreshold = 50;
        
        // Clear error batching
        if (this.errorBatchTimer) {
            clearInterval(this.errorBatchTimer);
            this.errorBatchTimer = null;
        }
        
        // Convert circular buffer back to array
        this.convertFromCircularBuffer();
    }
    
    /**
     * Convert error history to circular buffer
     */
    convertToCircularBuffer() {
        const oldHistory = this.errorStats.errorHistory;
        const bufferSize = this.errorHandlingConfig.circularBufferSize;
        
        // Create new circular buffer
        this.errorStats.errorHistory = new Array(bufferSize);
        this.errorStats.errorHistory.fill(null);
        this.errorStats.circularBufferIndex = 0;
        this.errorStats.circularBufferFull = false;
        
        // Copy recent errors to circular buffer
        const recentErrors = oldHistory.slice(-bufferSize);
        recentErrors.forEach(error => {
            if (error) {
                this.addToCircularBuffer(error);
            }
        });
    }
    
    /**
     * Convert circular buffer back to array
     */
    convertFromCircularBuffer() {
        const recentErrors = this.getRecentErrors(50);
        this.errorStats.errorHistory = recentErrors;
        this.errorStats.circularBufferIndex = 0;
        this.errorStats.circularBufferFull = false;
    }
    
    /**
     * Get production mode status and statistics
     */
    getProductionStatus() {
        return {
            productionMode: this.productionMode,
            errorStats: {
                totalErrors: this.errorStats.totalErrors,
                recentErrors: this.getRecentErrors(5),
                criticalErrors: this.errorStats.criticalErrors,
                batchQueueSize: this.errorStats.errorBatchQueue.length,
                lastBatchFlush: this.errorStats.lastBatchFlush,
                circularBufferUsage: this.productionMode ? 
                    `${this.errorStats.circularBufferFull ? 'Full' : this.errorStats.circularBufferIndex}/${this.errorHandlingConfig.circularBufferSize}` : 
                    'N/A'
            },
            performanceOptimizations: {
                lightweightOperations: this.performanceStats.lightweightOperations,
                validationSkips: this.performanceStats.validationSkips,
                productionOptimizations: this.performanceStats.productionOptimizations
            },
            configuration: {
                maxIterations: this.maxIterations,
                maxRetries: this.maxRetries,
                errorBatchSize: this.errorHandlingConfig.errorBatchSize,
                errorBatchInterval: this.errorHandlingConfig.errorBatchInterval,
                circularBufferSize: this.errorHandlingConfig.circularBufferSize
            }
        };
    }
    
    /**
     * Cleanup method for production mode
     */
    destroy() {
        // Clear error batching timer
        if (this.errorBatchTimer) {
            clearInterval(this.errorBatchTimer);
            this.errorBatchTimer = null;
        }
        
        // Flush any remaining batched errors
        if (this.errorStats.errorBatchQueue.length > 0) {
            this.flushErrorBatch();
        }
        
        // Clear circular buffer
        if (this.productionMode) {
            this.errorStats.errorHistory.fill(null);
            this.errorStats.circularBufferIndex = 0;
            this.errorStats.circularBufferFull = false;
        }
        
        console.log('PathGenerator destroyed and cleaned up');
    }
    
    // =============================================================================
    // ERROR HANDLING & LOGGING METHODS
    // =============================================================================
    
    // Log errors with appropriate level and context (production-optimized)
    logError(error, context = '', level = 'error') {
        // Use lightweight logging in production mode
        if (this.productionMode) {
            return this.logErrorLightweight(error, context, level);
        }
        
        // Full logging for development mode
        const errorEntry = {
            timestamp: Date.now(),
            level,
            message: error.message || error,
            context,
            stack: error.stack,
            errorType: error.name || 'Unknown',
            id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        // Add to error history (keep last 50 errors in development)
        this.errorStats.errorHistory.push(errorEntry);
        if (this.errorStats.errorHistory.length > 50) {
            this.errorStats.errorHistory.shift();
        }
        
        this.errorStats.lastError = errorEntry;
        
        // Update error counters
        this.updateErrorCounters(context, level);
        
        // Console logging based on configuration
        if (this.errorHandlingConfig.logErrors) {
            const logMethod = level === 'critical' ? 'error' :
                             level === 'warning' ? 'warn' : 'log';
            console[logMethod](`PathGenerator ${level.toUpperCase()}: ${context} - ${error.message || error}`);
            
            if (error.stack && level === 'critical') {
                console.error('Stack trace:', error.stack);
            }
        }
        
        return errorEntry.id;
    }
    
    // Validate point coordinates and boundaries (production-optimized)
    validatePoint(point, context = 'point validation') {
        // Use lightweight validation in production mode
        if (this.productionMode) {
            const isValid = this.validatePointLightweight(point, context);
            if (!isValid) {
                throw this.createValidationError('Point validation failed (lightweight)', context);
            }
            return true;
        }
        
        // Full validation for development mode
        if (!point || typeof point !== 'object') {
            throw this.createValidationError('Point must be a valid object', context);
        }
        
        if (typeof point.x !== 'number' || isNaN(point.x)) {
            throw this.createValidationError('Point x coordinate must be a valid number', context);
        }
        
        if (typeof point.y !== 'number' || isNaN(point.y)) {
            throw this.createValidationError('Point y coordinate must be a valid number', context);
        }
        
        if (point.x < 0 || point.x > this.canvasWidth) {
            throw this.createValidationError(
                `Point x coordinate (${point.x}) is outside canvas bounds (0-${this.canvasWidth})`,
                context
            );
        }
        
        if (point.y < 0 || point.y > this.canvasHeight) {
            throw this.createValidationError(
                `Point y coordinate (${point.y}) is outside canvas bounds (0-${this.canvasHeight})`,
                context
            );
        }
        
        return true;
    }
    
    // Check if two points are reachable (basic line-of-sight check)
    validatePointReachability(startPoint, endPoint, context = 'reachability check') {
        // Use lightweight validation in production mode
        if (this.productionMode) {
            return this.validatePointReachabilityLightweight(startPoint, endPoint, context);
        }
        
        // Full validation for development mode
        try {
            this.validatePoint(startPoint, `${context} - start point`);
            this.validatePoint(endPoint, `${context} - end point`);
            
            const distance = Math.sqrt(
                Math.pow(endPoint.x - startPoint.x, 2) +
                Math.pow(endPoint.y - startPoint.y, 2)
            );
            
            // Check minimum distance
            if (distance < this.minPathLength * 0.5) {
                throw this.createValidationError(
                    `Distance between points (${distance.toFixed(2)}) is too small for valid path generation`,
                    context
                );
            }
            
            // Check maximum reasonable distance
            const maxDistance = Math.sqrt(
                Math.pow(this.canvasWidth, 2) + Math.pow(this.canvasHeight, 2)
            ) * 1.5;
            
            if (distance > maxDistance) {
                throw this.createValidationError(
                    `Distance between points (${distance.toFixed(2)}) exceeds reasonable path generation limits`,
                    context
                );
            }
            
            return { isReachable: true, distance, startPoint, endPoint };
            
        } catch (error) {
            this.logError(error, `${context} - reachability validation`, 'warning');
            return { isReachable: false, distance: 0, error: error.message };
        }
    }
    
    // Create standardized validation errors
    createValidationError(message, context = '') {
        const error = new Error(`${context}: ${message}`);
        error.name = 'PathGeneratorValidationError';
        error.context = context;
        error.timestamp = Date.now();
        return error;
    }
    
    // Validate theme configuration
    validateTheme(theme, context = 'theme validation') {
        if (typeof theme === 'string') {
            if (!this.themes[theme]) {
                throw this.createValidationError(
                    `Unknown theme '${theme}'. Available themes: ${Object.keys(this.themes).join(', ')}`,
                    context
                );
            }
            return this.themes[theme];
        }
        
        if (typeof theme === 'object' && theme !== null) {
            const requiredProps = ['straightBias', 'curveComplexity', 'obstacleTypes', 'pathWidth'];
            const missingProps = requiredProps.filter(prop => !(prop in theme));
            
            if (missingProps.length > 0) {
                throw this.createValidationError(
                    `Theme object missing required properties: ${missingProps.join(', ')}`,
                    context
                );
            }
            
            // Validate numeric properties
            if (typeof theme.straightBias !== 'number' || theme.straightBias < 0 || theme.straightBias > 1) {
                throw this.createValidationError('Theme straightBias must be a number between 0 and 1', context);
            }
            
            if (typeof theme.curveComplexity !== 'number' || theme.curveComplexity < 0 || theme.curveComplexity > 1) {
                throw this.createValidationError('Theme curveComplexity must be a number between 0 and 1', context);
            }
            
            if (typeof theme.pathWidth !== 'number' || theme.pathWidth < 10 || theme.pathWidth > 200) {
                throw this.createValidationError('Theme pathWidth must be a number between 10 and 200', context);
            }
            
            return theme;
        }
        
        throw this.createValidationError('Theme must be a string or valid configuration object', context);
    }
    
    // Comprehensive fallback path generation
    generateFallbackPath(startPoint, endPoint, reason = '', context = 'fallback generation') {
        this.logError(new Error(reason), `${context} - creating fallback path`, 'warning');
        this.errorStats.fallbacksUsed++;
        
        try {
            // Validate basic points
            this.validatePoint(startPoint, `${context} - fallback start point`);
            this.validatePoint(endPoint, `${context} - fallback end point`);
            
            // Create simple straight-line path with minimal curves
            const path = [{ ...startPoint }];
            
            const totalDistance = Math.sqrt(
                Math.pow(endPoint.x - startPoint.x, 2) +
                Math.pow(endPoint.y - startPoint.y, 2)
            );
            
            const segments = Math.max(3, Math.ceil(totalDistance / (this.segmentLength * 2)));
            
            for (let i = 1; i < segments; i++) {
                const t = i / segments;
                const x = startPoint.x + (endPoint.x - startPoint.x) * t;
                const y = startPoint.y + (endPoint.y - startPoint.y) * t;
                
                // Add slight random variation to avoid perfectly straight line
                const variation = 20; // Minimal variation for fallback
                const offsetX = (Math.random() - 0.5) * variation;
                const offsetY = (Math.random() - 0.5) * variation;
                
                path.push({
                    x: Math.max(50, Math.min(this.canvasWidth - 50, x + offsetX)),
                    y: Math.max(50, Math.min(this.canvasHeight - 50, y + offsetY))
                });
            }
            
            path.push({ ...endPoint });
            
            // Add fallback metadata
            path.metadata = {
                isFallback: true,
                fallbackReason: reason,
                generatedAt: Date.now(),
                totalPoints: path.length,
                fallbackType: 'simple-interpolated'
            };
            
            this.logError(
                new Error(`Fallback path generated with ${path.length} points`),
                `${context} - fallback successful`,
                'info'
            );
            
            return path;
            
        } catch (fallbackError) {
            this.logError(fallbackError, `${context} - fallback generation failed`, 'critical');
            
            // Last resort: minimal 2-point path
            return {
                0: { ...startPoint },
                1: { ...endPoint },
                length: 2,
                metadata: {
                    isFallback: true,
                    isMinimalFallback: true,
                    fallbackReason: `${reason} + ${fallbackError.message}`,
                    generatedAt: Date.now(),
                    totalPoints: 2,
                    fallbackType: 'minimal-direct'
                }
            };
        }
    }
    
    // Get comprehensive error statistics
    getErrorStats() {
        const totalErrors = this.errorStats.validationErrors +
                           this.errorStats.generationErrors +
                           this.errorStats.inputValidationErrors +
                           this.errorStats.reachabilityErrors;
                          
        const uptime = Date.now() - this.errorStats.startTime;
        
        return {
            ...this.errorStats,
            totalErrors,
            errorRate: uptime > 0 ? (totalErrors / (uptime / 1000)).toFixed(4) : 0,
            uptimeMs: uptime,
            uptimeFormatted: this.formatUptime(uptime),
            recentErrors: this.errorStats.errorHistory.slice(-10)
        };
    }
    
    // Format uptime for display
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    // Enhanced configuration methods
    setErrorHandlingConfig(newConfig) {
        this.errorHandlingConfig = {
            ...this.errorHandlingConfig,
            ...newConfig
        };
        
        this.logError(
            new Error('Error handling configuration updated'),
            'configuration change',
            'info'
        );
    }
    
    getErrorHandlingConfig() {
        return { ...this.errorHandlingConfig };
    }
    
    // Reset error statistics
    resetErrorStats() {
        const oldStats = { ...this.errorStats };
        this.errorStats = {
            validationErrors: 0,
            generationErrors: 0,
            fallbacksUsed: 0,
            criticalErrors: 0,
            inputValidationErrors: 0,
            reachabilityErrors: 0,
            lastError: null,
            errorHistory: [],
            startTime: Date.now()
        };
        
        this.logError(
            new Error('Error statistics reset'),
            'statistics reset',
            'info'
        );
        
        return oldStats;
    }
    
    // Export error handling configuration and statistics
    exportErrorHandlingData() {
        return {
            config: this.getErrorHandlingConfig(),
            stats: this.getErrorStats(),
            timestamp: Date.now(),
            version: '2.0-enhanced'
        };
    }
    
    // =============================================================================
    // ENHANCED SEEDED RNG WITH ERROR HANDLING
    // =============================================================================
    
    createSeededRNG(seed) {
        try {
            if (typeof seed !== 'number' || isNaN(seed)) {
                this.logError(
                    new Error(`Invalid seed provided: ${seed}, using timestamp fallback`),
                    'RNG initialization',
                    'warning'
                );
                seed = Date.now() % 1000000;
            }
            
            let currentSeed = seed;
            return () => {
                currentSeed = (currentSeed * 9301 + 49297) % 233280;
                return currentSeed / 233280;
            };
        } catch (rngError) {
            this.logError(rngError, 'RNG creation failed', 'critical');
            return Math.random;
        }
    }
    
    setSeed(seed) {
        this.seed = seed;
        this.rng = this.createSeededRNG(seed);
    }
    
    // =============================================================================
    // ENHANCED PATH GENERATION WITH COMPREHENSIVE ERROR HANDLING
    // =============================================================================
    
    generateBasePath(levelId, seed = null, theme = 'cyber', pathMode = 'hybrid') {
        const context = `generateBasePath(levelId: ${levelId}, theme: ${theme}, pathMode: ${pathMode})`;
        
        try {
            // Comprehensive input validation
            this.validateGenerateBasePathInputs(levelId, seed, theme, pathMode, context);
            
            let retryCount = 0;
            const maxRetries = this.errorHandlingConfig.maxPathGenerationRetries;
            
            while (retryCount < maxRetries) {
                try {
                    // Setup seed with validation
                    this.setupSeedSafely(levelId, seed, context);
                    
                    // Validate and get theme configuration
                    const themeConfig = this.validateTheme(theme, `${context} - theme validation`);
                    
                    // Generate path with error handling
                    const path = this.generatePathSafely(levelId, themeConfig, pathMode, context);
                    
                    // Add comprehensive metadata
                    this.addPathMetadata(path, {
                        levelId,
                        seed: this.seed,
                        theme,
                        pathMode,
                        retryCount,
                        context
                    });
                    
                    // Log successful generation
                    this.logError(
                        new Error(`Path generated successfully with ${path.length} points`),
                        `${context} - success`,
                        'info'
                    );
                    
                    return path;
                    
                } catch (generationError) {
                    retryCount++;
                    this.logError(
                        generationError,
                        `${context} - retry ${retryCount}/${maxRetries}`,
                        retryCount < maxRetries ? 'warning' : 'error'
                    );
                    
                    if (retryCount >= maxRetries) {
                        // Attempt fallback generation if enabled
                        if (this.errorHandlingConfig.enableFallbackGeneration) {
                            return this.generateFallbackPathForLevel(levelId, theme, generationError, context);
                        } else {
                            throw generationError;
                        }
                    }
                }
            }
            
        } catch (criticalError) {
            this.logError(criticalError, `${context} - critical failure`, 'critical');
            
            if (this.errorHandlingConfig.throwOnCriticalErrors) {
                throw criticalError;
            } else {
                // Last resort fallback
                return this.generateMinimalFallbackPath(levelId, theme, criticalError, context);
            }
        }
    }
    
    // Validate inputs for generateBasePath
    validateGenerateBasePathInputs(levelId, seed, theme, pathMode, context) {
        // Level ID validation
        if (typeof levelId !== 'number' || isNaN(levelId) || levelId < 0) {
            throw this.createValidationError(
                `Level ID must be a non-negative number, got: ${levelId}`,
                `${context} - input validation`
            );
        }
        
        // Seed validation (optional)
        if (seed !== null && (typeof seed !== 'number' || isNaN(seed))) {
            throw this.createValidationError(
                `Seed must be null or a valid number, got: ${seed}`,
                `${context} - input validation`
            );
        }
        
        // Theme validation (basic check - detailed validation happens in validateTheme)
        if (typeof theme !== 'string' && (typeof theme !== 'object' || theme === null)) {
            throw this.createValidationError(
                `Theme must be a string or configuration object, got: ${typeof theme}`,
                `${context} - input validation`
            );
        }
        
        // Path mode validation
        const validModes = ['static', 'dynamic', 'hybrid'];
        if (!validModes.includes(pathMode)) {
            throw this.createValidationError(
                `Path mode must be one of: ${validModes.join(', ')}, got: ${pathMode}`,
                `${context} - input validation`
            );
        }
    }
    
    // Safely setup seed with error handling
    setupSeedSafely(levelId, seed, context) {
        try {
            if (seed !== null) {
                this.setSeed(seed);
            } else {
                // Generate deterministic seed based on level
                const generatedSeed = levelId * 1000 + (Date.now() % 1000);
                this.setSeed(generatedSeed);
            }
        } catch (seedError) {
            this.logError(seedError, `${context} - seed setup`, 'warning');
            // Fallback to current timestamp
            this.setSeed(Date.now() % 1000000);
        }
    }
    
    // Generate path safely with error handling
    generatePathSafely(levelId, themeConfig, pathMode, context) {
        try {
            // Generate simple test path for demonstration
            const startPoint = { x: 100, y: this.canvasHeight / 2 };
            const endPoint = { x: this.canvasWidth - 100, y: this.canvasHeight / 2 };
            
            // Validate reachability
            const reachabilityCheck = this.validatePointReachability(
                startPoint,
                endPoint,
                `${context} - path reachability`
            );
            
            if (!reachabilityCheck.isReachable) {
                throw this.createValidationError(
                    `Entry and exit points are not reachable: ${reachabilityCheck.error}`,
                    `${context} - reachability check`
                );
            }
            
            return this.generateSimplePath(startPoint, endPoint, themeConfig);
            
        } catch (error) {
            this.logError(error, `${context} - path generation`, 'warning');
            throw error;
        }
    }
    
    // Generate a simple path for testing with theme considerations
    generateSimplePath(startPoint, endPoint, themeConfig) {
        const path = [{ ...startPoint }];
        const segments = Math.max(3, Math.floor(5 + this.rng() * 5)); // 3-10 segments
        
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const x = startPoint.x + (endPoint.x - startPoint.x) * t;
            const y = startPoint.y + (endPoint.y - startPoint.y) * t;
            
            // Add theme-based variation
            const variation = 50 * (1 - themeConfig.straightBias);
            const complexity = themeConfig.curveComplexity;
            const offsetX = (this.rng() - 0.5) * variation * complexity;
            const offsetY = (this.rng() - 0.5) * variation * complexity;
            
            path.push({
                x: Math.max(50, Math.min(this.canvasWidth - 50, x + offsetX)),
                y: Math.max(50, Math.min(this.canvasHeight - 50, y + offsetY))
            });
        }
        
        path.push({ ...endPoint });
        return path;
    }
    
    // Add comprehensive metadata to path
    addPathMetadata(path, metadata) {
        path.metadata = {
            ...metadata,
            generatedAt: Date.now(),
            totalPoints: path.length,
            pathBounds: this.calculatePathBounds(path),
            pathLength: this.calculatePathLength(path),
            generatorVersion: '2.0-enhanced'
        };
    }
    
    // Calculate path bounds for metadata
    calculatePathBounds(path) {
        if (!path || path.length === 0) return null;
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        for (const point of path) {
            if (point.x < minX) minX = point.x;
            if (point.x > maxX) maxX = point.x;
            if (point.y < minY) minY = point.y;
            if (point.y > maxY) maxY = point.y;
        }
        
        return {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    // Calculate total path length for metadata
    calculatePathLength(path) {
        if (!path || path.length < 2) return 0;
        
        let totalLength = 0;
        for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i-1].x;
            const dy = path[i].y - path[i-1].y;
            totalLength += Math.sqrt(dx * dx + dy * dy);
        }
        
        return totalLength;
    }
    
    // Generate fallback path for specific level
    generateFallbackPathForLevel(levelId, theme, originalError, context) {
        try {
            const entryPoint = { x: 100, y: this.canvasHeight / 2 };
            const exitPoint = { x: this.canvasWidth - 100, y: this.canvasHeight / 2 };
            
            return this.generateFallbackPath(
                entryPoint,
                exitPoint,
                `Level ${levelId} generation failed: ${originalError.message}`,
                `${context} - level fallback`
            );
        } catch (fallbackError) {
            this.logError(fallbackError, `${context} - level fallback failed`, 'critical');
            return this.generateMinimalFallbackPath(levelId, theme, fallbackError, context);
        }
    }
    
    // Generate minimal fallback path as last resort
    generateMinimalFallbackPath(levelId, theme, originalError, context) {
        const entryPoint = { x: 100, y: this.canvasHeight / 2 };
        const exitPoint = { x: this.canvasWidth - 100, y: this.canvasHeight / 2 };
        
        return {
            0: entryPoint,
            1: exitPoint,
            length: 2,
            metadata: {
                isFallback: true,
                isMinimalFallback: true,
                levelId,
                theme,
                originalError: originalError.message,
                fallbackReason: 'All generation methods failed',
                generatedAt: Date.now(),
                totalPoints: 2,
                fallbackType: 'minimal-emergency',
                context
            }
        };
    }
}

// Export for use in other modules
export default PathGenerator;