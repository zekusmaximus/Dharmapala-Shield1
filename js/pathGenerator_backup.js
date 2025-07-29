// Dharmapala Shield - Procedural Path Generation System
// 
// PathGenerator supports multiple path generation modes:
// - 'static': Uses CONFIG.PATH_POINTS or CONFIG.LEVEL_PATHS as-is
// - 'dynamic': Generates completely procedural paths
// - 'hybrid': Uses existing waypoints as foundation, adds procedural variations
//
// The hybrid mode respects existing level designs while adding variety through:
// - Interpolated points between waypoints
// - Themed procedural variations
// - Configurable smoothing intensity

class PathGenerator {
    // Comprehensive input validation for constructor
    validateConstructorInputs(canvasWidth, canvasHeight, gridSize) {
        const errors = [];
        
        // Canvas width validation
        if (typeof canvasWidth !== 'number' || isNaN(canvasWidth)) {
            errors.push('Canvas width must be a valid number');
        } else if (canvasWidth < this.errorHandlingConfig?.minCanvasSize || 200) {
            errors.push(`Canvas width must be at least ${this.errorHandlingConfig?.minCanvasSize || 200}px`);
        } else if (canvasWidth > (this.errorHandlingConfig?.maxCanvasSize || 10000)) {
            errors.push(`Canvas width must not exceed ${this.errorHandlingConfig?.maxCanvasSize || 10000}px`);
        }
        
        // Canvas height validation
        if (typeof canvasHeight !== 'number' || isNaN(canvasHeight)) {
            errors.push('Canvas height must be a valid number');
        } else if (canvasHeight < (this.errorHandlingConfig?.minCanvasSize || 200)) {
            errors.push(`Canvas height must be at least ${this.errorHandlingConfig?.minCanvasSize || 200}px`);
        } else if (canvasHeight > (this.errorHandlingConfig?.maxCanvasSize || 10000)) {
            errors.push(`Canvas height must not exceed ${this.errorHandlingConfig?.maxCanvasSize || 10000}px`);
        }
        
        // Grid size validation
        if (typeof gridSize !== 'number' || isNaN(gridSize)) {
            errors.push('Grid size must be a valid number');
        } else if (gridSize < (this.errorHandlingConfig?.minGridSize || 10)) {
            errors.push(`Grid size must be at least ${this.errorHandlingConfig?.minGridSize || 10}`);
        } else if (gridSize > (this.errorHandlingConfig?.maxGridSize || 200)) {
            errors.push(`Grid size must not exceed ${this.errorHandlingConfig?.maxGridSize || 200}`);
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
    
    constructor(canvasWidth, canvasHeight, gridSize) {
        // Comprehensive input validation
        this.validateConstructorInputs(canvasWidth, canvasHeight, gridSize);
        
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.gridSize = gridSize;
        
        // Error handling configuration
        this.errorHandlingConfig = {
            maxValidationRetries: 5,
            maxPathGenerationRetries: 3,
            enableFallbackGeneration: true,
            logErrors: true,
            throwOnCriticalErrors: true,
            fallbackToSimplePath: true,
            minCanvasSize: 200,
            maxCanvasSize: 10000,
            minGridSize: 10,
            maxGridSize: 200
        };
        
        // Error tracking and statistics
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
        
        // Path generation parameters
        this.minPathLength = 300;
        this.maxPathLength = 800;
        this.minCurveRadius = 50;
        this.maxCurveRadius = 150;
        this.segmentLength = 60;
        
        // Performance optimization parameters
        this.maxIterations = 500; // Maximum iterations for generateRawPath while loop
        this.maxRetries = 3; // Maximum retries for path generation failures
        this.performanceThreshold = 50; // Maximum generation time in ms before fallback
        
        // RNG value caching for frequently used calculations
        this.rngCache = new Map();
        this.cacheSize = 1000;
        this.cacheMissCount = 0;
        this.cacheHitCount = 0;
        
        // Performance monitoring
        this.performanceStats = {
            totalGenerations: 0,
            averageTime: 0,
            maxTime: 0,
            minTime: Infinity,
            failureCount: 0,
            fallbackCount: 0,
            cacheHitRate: 0
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
        
        // Level Path Preservation System Integration
        this.levelPreservation = new LevelPathPreservation(canvasWidth, canvasHeight);
        
        // Initialize flexible validation system
        this.flexibleValidation = new FlexiblePathValidation();
        this.validationProfile = 'balanced'; // Default profile
        
        // Path generation modes and validation
        this.validationEnabled = true;
        this.previewMode = false;
        
        console.log('PathGenerator initialized with Level Preservation System and Flexible Validation');
    }
    
    // =============================================================================
    // ERROR HANDLING & LOGGING METHODS
    // =============================================================================
    
    // Log errors with appropriate level and context
    logError(error, context = '', level = 'error') {
        const errorEntry = {
            timestamp: Date.now(),
            level,
            message: error.message || error,
            context,
            stack: error.stack,
            errorType: error.name || 'Unknown',
            id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        // Add to error history (keep last 50 errors)
        this.errorStats.errorHistory.push(errorEntry);
        if (this.errorStats.errorHistory.length > 50) {
            this.errorStats.errorHistory.shift();
        }
        
        this.errorStats.lastError = errorEntry;
        
        // Update error counters
        if (context.includes('validation')) {
            this.errorStats.validationErrors++;
        } else if (context.includes('generation')) {
            this.errorStats.generationErrors++;
        } else if (context.includes('input')) {
            this.errorStats.inputValidationErrors++;
        } else if (context.includes('reachability')) {
            this.errorStats.reachabilityErrors++;
        }
        
        if (level === 'critical') {
            this.errorStats.criticalErrors++;
        }
        
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
    
    // Validate point coordinates and boundaries
    validatePoint(point, context = 'point validation') {
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
    
    // =============================================================================
    // ENHANCED CORE METHODS WITH ERROR HANDLING
    // =============================================================================
    
    // =============================================================================
    // UTILITY METHODS FOR ENHANCED ERROR HANDLING
    // =============================================================================
    
    // Clear RNG cache for retry attempts
    clearRNGCache() {
        this.rngCache.clear();
        this.cacheHitCount = 0;
        this.cacheMissCount = 0;
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
    
    // Apply validation recommendations to path
    applyValidationRecommendations(path, recommendations, context) {
        try {
            let modifiedPath = [...path];
            
            for (const recommendation of recommendations) {
                switch (recommendation.type) {
                    case 'smooth_sharp_turns':
                        modifiedPath = this.smoothPath(modifiedPath);
                        break;
                    case 'adjust_spacing':
                        modifiedPath = this.adjustPointSpacing(modifiedPath);
                        break;
                    case 'remove_redundant_points':
                        modifiedPath = this.removeRedundantPoints(modifiedPath);
                        break;
                    default:
                        this.logError(
                            new Error(`Unknown recommendation type: ${recommendation.type}`),
                            `${context} - recommendation application`,
                            'warning'
                        );
                }
            }
            
            return modifiedPath;
            
        } catch (recommendationError) {
            this.logError(recommendationError, `${context} - applying recommendations`, 'warning');
            return path; // Return original if recommendations fail
        }
    }
    
    // Adjust point spacing for better path quality
    adjustPointSpacing(path) {
        if (!path || path.length < 3) return path;
        
        const adjustedPath = [path[0]]; // Keep first point
        const targetSpacing = this.segmentLength;
        
        for (let i = 1; i < path.length - 1; i++) {
            const prevPoint = adjustedPath[adjustedPath.length - 1];
            const currentPoint = path[i];
            const distance = Math.sqrt(
                Math.pow(currentPoint.x - prevPoint.x, 2) + 
                Math.pow(currentPoint.y - prevPoint.y, 2)
            );
            
            // Only keep points that are approximately the target spacing apart
            if (distance >= targetSpacing * 0.8) {
                adjustedPath.push(currentPoint);
            }
        }
        
        adjustedPath.push(path[path.length - 1]); // Keep last point
        return adjustedPath;
    }
    
    // Remove redundant points that are too close together
    removeRedundantPoints(path) {
        if (!path || path.length < 3) return path;
        
        const filteredPath = [path[0]]; // Keep first point
        const minDistance = this.segmentLength * 0.3;
        
        for (let i = 1; i < path.length - 1; i++) {
            const lastKept = filteredPath[filteredPath.length - 1];
            const currentPoint = path[i];
            const distance = Math.sqrt(
                Math.pow(currentPoint.x - lastKept.x, 2) + 
                Math.pow(currentPoint.y - lastKept.y, 2)
            );
            
            if (distance >= minDistance) {
                filteredPath.push(currentPoint);
            }
        }
        
        filteredPath.push(path[path.length - 1]); // Keep last point
        return filteredPath;
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
    
    // Import error handling configuration
    importErrorHandlingConfig(configData) {
        if (configData && configData.config) {
            this.setErrorHandlingConfig(configData.config);
            return true;
        }
        return false;
    }
    
    // =============================================================================
    // ENHANCED SEEDED RNG WITH ERROR HANDLING
    // =============================================================================
    
    createSeededRNG(seed) {
        // Simple seeded random number generator with error handling
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
            // Fallback to Math.random
            return Math.random;
        }
    }
    
    setSeed(seed) {
        this.seed = seed;
        this.rng = this.createSeededRNG(seed);
    }
    
    // Cached RNG for frequently used random values
    getCachedRNG(key, generator) {
        if (this.rngCache.has(key)) {
            this.cacheHitCount++;
            return this.rngCache.get(key);
        }
        
        this.cacheMissCount++;
        const value = generator();
        
        // Manage cache size
        if (this.rngCache.size >= this.cacheSize) {
            const firstKey = this.rngCache.keys().next().value;
            this.rngCache.delete(firstKey);
        }
        
        this.rngCache.set(key, value);
        return value;
    }
    
    // Generate cached random values for common calculations
    getRandomFloat(min, max, cacheKey = null) {
        const generator = () => min + this.rng() * (max - min);
        
        if (cacheKey) {
            return this.getCachedRNG(cacheKey, generator);
        }
        
        return generator();
    }
    
    getRandomInt(min, max, cacheKey = null) {
        const generator = () => Math.floor(min + this.rng() * (max - min + 1));
        
        if (cacheKey) {
            return this.getCachedRNG(cacheKey, generator);
        }
        
        return generator();
    }
    
    // Performance monitoring methods
    startPerformanceTimer() {
        return performance.now();
    }
    
    endPerformanceTimer(startTime, operationType = 'generation') {
        const endTime = performance.now();
        const elapsedTime = endTime - startTime;
        
        // Update performance statistics
        this.performanceStats.totalGenerations++;
        
        if (elapsedTime > this.performanceStats.maxTime) {
            this.performanceStats.maxTime = elapsedTime;
        }
        
        if (elapsedTime < this.performanceStats.minTime) {
            this.performanceStats.minTime = elapsedTime;
        }
        
        // Calculate running average
        const prevAvg = this.performanceStats.averageTime;
        const count = this.performanceStats.totalGenerations;
        this.performanceStats.averageTime = (prevAvg * (count - 1) + elapsedTime) / count;
        
        // Update cache hit rate
        const totalCacheRequests = this.cacheHitCount + this.cacheMissCount;
        this.performanceStats.cacheHitRate = totalCacheRequests > 0 ? 
            (this.cacheHitCount / totalCacheRequests) * 100 : 0;
        
        return {
            elapsedTime,
            isSlowGeneration: elapsedTime > this.performanceThreshold,
            stats: { ...this.performanceStats }
        };
    }
    
    // Clear performance statistics
    resetPerformanceStats() {
        this.performanceStats = {
            totalGenerations: 0,
            averageTime: 0,
            maxTime: 0,
            minTime: Infinity,
            failureCount: 0,
            fallbackCount: 0,
            cacheHitRate: 0
        };
        
        this.rngCache.clear();
        this.cacheHitCount = 0;
        this.cacheMissCount = 0;
    }
    
    // Main path generation method with enhanced CONFIG.PATH_POINTS support
    // 
    // Usage examples:
    // - pathGenerator.generateBasePath(1, null, 'cyber', 'static')    // Use CONFIG.PATH_POINTS as-is
    // - pathGenerator.generateBasePath(1, null, 'cyber', 'dynamic')   // Generate new procedural path
    // - pathGenerator.generateBasePath(1, null, 'cyber', 'hybrid')    // Best of both worlds (default)
    //
    // Parameters:
    // - levelId: Level identifier for path lookup
    // - seed: Random seed (null for auto-generation)
    // - theme: Visual theme affecting path characteristics
    // - pathMode: 'static', 'dynamic', or 'hybrid'
    
    generateBasePath(levelId, seed = null, theme = 'cyber', pathMode = 'hybrid') {
        const context = `generateBasePath(levelId: ${levelId}, theme: ${theme}, pathMode: ${pathMode})`;
        const startTime = this.startPerformanceTimer();
        
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
                    
                    // Check if path generation is disabled for this level
                    if (this.isPathGenerationDisabled && this.isPathGenerationDisabled(levelId)) {
                        throw this.createValidationError(
                            `Path generation is disabled for level ${levelId}`,
                            `${context} - level check`
                        );
                    }
                    
                    // Generate path based on mode with error handling
                    let rawPath = this.generatePathByMode(levelId, pathMode, themeConfig, context);
                    
                    // Validate generated path
                    if (!rawPath || !Array.isArray(rawPath) || rawPath.length < 2) {
                        throw this.createValidationError(
                            `Invalid path generated: ${rawPath ? `length ${rawPath.length}` : 'null/undefined'}`,
                            `${context} - path validation`
                        );
                    }
                    
                    // Enhanced validation with flexible system
                    rawPath = this.validateAndEnhancePath(rawPath, levelId, theme, context);
                    
                    // Apply final enhancements
                    const finalPath = this.applyPathEnhancements(rawPath, themeConfig, context);
                    
                    // Add comprehensive metadata
                    this.addPathMetadata(finalPath, {
                        levelId,
                        seed: this.seed,
                        theme,
                        pathMode,
                        retryCount,
                        generationTime: this.endPerformanceTimer(startTime, 'generateBasePath').elapsedTime,
                        context
                    });
                    
                    // Log successful generation
                    this.logError(
                        new Error(`Path generated successfully with ${finalPath.length} points`),
                        `${context} - success`,
                        'info'
                    );
                    
                    return finalPath;
                    
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
                    
                    // Brief delay before retry
                    if (retryCount < maxRetries) {
                        this.clearRNGCache(); // Clear cache to ensure different result
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
    
    // Generate path based on specified mode with error handling
    generatePathByMode(levelId, pathMode, themeConfig, context) {
        try {
            switch (pathMode) {
                case 'static':
                    return this.generateStaticPathSafely(levelId, context);
                    
                case 'dynamic':
                    return this.generateDynamicPathSafely(themeConfig, context);
                    
                case 'hybrid':
                default:
                    return this.generateHybridPathSafely(levelId, themeConfig, context);
            }
        } catch (modeError) {
            this.logError(modeError, `${context} - mode generation failed`, 'warning');
            
            // Fallback to dynamic generation if other modes fail
            if (pathMode !== 'dynamic') {
                this.logError(
                    new Error(`Falling back to dynamic generation from ${pathMode} mode`),
                    `${context} - mode fallback`,
                    'info'
                );
                return this.generateDynamicPathSafely(themeConfig, context);
            } else {
                throw modeError;
            }
        }
    }
    
    // Generate static path with error handling
    generateStaticPathSafely(levelId, context) {
        try {
            const staticPath = this.useStaticPath(levelId);
            if (!staticPath || staticPath.length < 2) {
                throw this.createValidationError(
                    `No valid static path available for level ${levelId}`,
                    `${context} - static path`
                );
            }
            return staticPath;
        } catch (error) {
            this.logError(error, `${context} - static path generation`, 'warning');
            throw error;
        }
    }
    
    // Generate dynamic path with error handling
    generateDynamicPathSafely(themeConfig, context) {
        try {
            const entryPoint = this.generateEntryPoint();
            const exitPoint = this.generateExitPoint(entryPoint);
            
            // Validate entry/exit point reachability
            const reachabilityCheck = this.validatePointReachability(
                entryPoint, 
                exitPoint, 
                `${context} - dynamic path reachability`
            );
            
            if (!reachabilityCheck.isReachable) {
                throw this.createValidationError(
                    `Entry and exit points are not reachable: ${reachabilityCheck.error}`,
                    `${context} - dynamic path`
                );
            }
            
            return this.generateRawPath(entryPoint, exitPoint, themeConfig);
        } catch (error) {
            this.logError(error, `${context} - dynamic path generation`, 'warning');
            throw error;
        }
    }
    
    // Generate hybrid path with error handling
    generateHybridPathSafely(levelId, themeConfig, context) {
        try {
            const hybridPath = this.generateHybridPath(levelId, themeConfig);
            if (!hybridPath || hybridPath.length < 2) {
                // If hybrid fails, try dynamic as fallback
                this.logError(
                    new Error('Hybrid path generation failed, trying dynamic fallback'),
                    `${context} - hybrid fallback`,
                    'warning'
                );
                return this.generateDynamicPathSafely(themeConfig, context);
            }
            return hybridPath;
        } catch (error) {
            this.logError(error, `${context} - hybrid path generation`, 'warning');
            // Try dynamic as final fallback for hybrid mode
            return this.generateDynamicPathSafely(themeConfig, context);
        }
    }
    
    // Validate and enhance path with flexible validation system
    validateAndEnhancePath(rawPath, levelId, theme, context) {
        try {
            // Enhanced Flexible Validation
            if (this.validationEnabled && this.flexibleValidation) {
                const validationOptions = {
                    profileName: this.getValidationProfileForLevel(levelId),
                    levelId: levelId,
                    theme: theme,
                    allowOverrides: true,
                    generateRecommendations: true,
                    trackHistory: true
                };
                
                const validation = this.flexibleValidation.validatePath(rawPath, validationOptions);
                
                // Handle validation results based on severity
                if (!validation.isValid) {
                    const criticalErrors = validation.errors.filter(e => e.severity === 'critical');
                    if (criticalErrors.length > 0) {
                        throw this.createValidationError(
                            `Critical validation errors: ${criticalErrors.map(e => e.message).join(', ')}`,
                            `${context} - flexible validation`
                        );
                    }
                    
                    // Log warnings for non-critical errors
                    validation.errors.forEach(error => {
                        this.logError(
                            new Error(error.message),
                            `${context} - validation ${error.severity}`,
                            error.severity === 'error' ? 'warning' : 'info'
                        );
                    });
                }
                
                // Apply recommendations if available
                if (validation.recommendations && validation.recommendations.length > 0) {
                    rawPath = this.applyValidationRecommendations(rawPath, validation.recommendations, context);
                }
            }
            
            return rawPath;
            
        } catch (validationError) {
            this.logError(validationError, `${context} - path validation`, 'warning');
            
            // If validation fails but path exists, continue with basic validation
            if (rawPath && rawPath.length >= 2) {
                return rawPath;
            } else {
                throw validationError;
            }
        }
    }
    
    // Apply path enhancements with error handling
    applyPathEnhancements(rawPath, themeConfig, context) {
        try {
            let enhancedPath = rawPath;
            
            // Apply path variations
            enhancedPath = this.addPathVariations(enhancedPath, themeConfig.curveComplexity);
            
            // Apply smoothing
            enhancedPath = this.smoothPath(enhancedPath);
            
            return enhancedPath;
            
        } catch (enhancementError) {
            this.logError(enhancementError, `${context} - path enhancement`, 'warning');
            // Return original path if enhancement fails
            return rawPath;
        }
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
    
    // Generate fallback path for specific level
    generateFallbackPathForLevel(levelId, theme, originalError, context) {
        try {
            const entryPoint = this.generateEntryPoint();
            const exitPoint = this.generateExitPoint(entryPoint);
            
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
                        if (validation.severity === 'critical' || validation.severity === 'error') {
                            console.warn(`Path validation failed for level ${levelId} (${validation.severity}):`, validation.errors || validation.criticalIssues);
                            
                            // If validation fails and this isn't the last retry, try again
                            if (retryCount < this.maxRetries - 1) {
                                console.log('Retrying path generation due to validation failure...');
                                retryCount++;
                                continue;
                            } else {
                                console.warn('Using potentially problematic path as no valid alternatives found');
                            }
                        } else if (validation.severity === 'warning') {
                            console.warn(`Path validation warnings for level ${levelId}:`, validation.warnings);
                        }
                        
                        // Store validation results
                        rawPath.validation = validation;
                        
                        // Log recommendations if any
                        if (validation.recommendations && validation.recommendations.length > 0) {
                            console.log(`Path recommendations for level ${levelId}:`, validation.recommendations);
                        }
                        
                        // Fallback to legacy validation if needed
                        if (!validation.isValid && this.levelPreservation) {
                            const legacyValidation = this.levelPreservation.validatePathForLevel(rawPath, levelId, pathMode);
                            if (legacyValidation.isValid) {
                                console.log('Legacy validation passed where flexible validation failed');
                                rawPath.validation.legacyFallback = true;
                            }
                        }
                    } else if (this.validationEnabled && this.levelPreservation) {
                        // Fallback to legacy validation system
                        const validation = this.levelPreservation.validatePathForLevel(rawPath, levelId, pathMode);
                        
                        if (!validation.isValid) {
                            console.warn(`Path validation failed for level ${levelId}:`, validation.errors);
                            
                            // If validation fails and this isn't the last retry, try again
                            if (retryCount < this.maxRetries - 1) {
                                console.log('Retrying path generation due to validation failure...');
                                retryCount++;
                                continue;
                            } else {
                                console.warn('Using invalid path as no valid alternatives found');
                            }
                        }
                        
                        // Store validation results
                        rawPath.validation = validation;
                        
                        // Log recommendations if any
                        if (validation.recommendations && validation.recommendations.length > 0) {
                            console.log(`Path recommendations for level ${levelId}:`, validation.recommendations);
                        }
                    }
                    
                    // Level Path Preservation: Check if generation is disabled
                    if (this.levelPreservation && this.levelPreservation.isPathGenerationDisabled(levelId)) {
                        console.log(`Path generation is disabled for level ${levelId}, using preserved layout`);
                        rawPath.preservedLayout = true;
                        rawPath.generationDisabled = true;
                    }
                    
                    // Add path variations based on theme complexity
                    if (!usedStaticPath && !rawPath.preservedLayout) {
                        rawPath = this.addPathVariations(rawPath, themeConfig.curveComplexity);
                    }
                    
                    // Smooth the path for better visuals
                    rawPath = this.smoothPath(rawPath);
                    
                    // Add metadata
                    rawPath.theme = theme;
                    rawPath.levelId = levelId;
                    rawPath.seed = this.seed;
                    rawPath.pathMode = pathMode;
                    rawPath.usedStaticPath = usedStaticPath;
                    rawPath.generatedAt = Date.now();
                    
                    // Record successful generation
                    const perfResults = this.endPerformanceTimer(startTime, 'generateBasePath');
                    rawPath.performanceInfo = {
                        generationTime: perfResults.elapsedTime,
                        isSlowGeneration: perfResults.isSlowGeneration,
                        retryCount,
                        cacheHitRate: this.performanceStats.cacheHitRate
                    };
                    
                    return rawPath;
                }
                
            } catch (error) {
                console.error(`PathGenerator: Attempt ${retryCount + 1} failed:`, error);
                retryCount++;
                
                if (retryCount >= this.maxRetries) {
                    this.performanceStats.failureCount++;
                    this.endPerformanceTimer(startTime, 'generateBasePath_failed');
                    throw new Error(`Path generation failed after ${this.maxRetries} attempts: ${error.message}`);
                }
                
                // Wait a bit before retry
                const delay = Math.pow(2, retryCount) * 10; // Exponential backoff
                setTimeout(() => {}, delay);
            }
        }
        
        // This should never be reached, but just in case
        this.performanceStats.failureCount++;
        this.endPerformanceTimer(startTime, 'generateBasePath_failed');
        throw new Error('Path generation failed: Maximum retries exceeded');
    }
    
    generateEntryPoint() {
        const side = Math.floor(this.rng() * 4); // 0: top, 1: right, 2: bottom, 3: left
        
        switch (side) {
            case 0: // Top
                return {
                    x: this.rng() * this.canvasWidth * 0.8 + this.canvasWidth * 0.1,
                    y: 50
                };
            case 1: // Right
                return {
                    x: this.canvasWidth - 50,
                    y: this.rng() * this.canvasHeight * 0.8 + this.canvasHeight * 0.1
                };
            case 2: // Bottom
                return {
                    x: this.rng() * this.canvasWidth * 0.8 + this.canvasWidth * 0.1,
                    y: this.canvasHeight - 50
                };
            case 3: // Left
                return {
                    x: 50,
                    y: this.rng() * this.canvasHeight * 0.8 + this.canvasHeight * 0.1
                };
            default:
                return { x: 50, y: this.canvasHeight / 2 };
        }
    }
    
    generateExitPoint(entryPoint) {
        // Exit should be on the opposite side or at least far from entry
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        
        let exitX, exitY;
        
        if (entryPoint.x < centerX) {
            // Entry on left side, exit on right
            exitX = this.canvasWidth - 50;
            exitY = this.rng() * this.canvasHeight * 0.6 + this.canvasHeight * 0.2;
        } else {
            // Entry on right side, exit on left
            exitX = 50;
            exitY = this.rng() * this.canvasHeight * 0.6 + this.canvasHeight * 0.2;
        }
        
        // Ensure minimum distance from entry
        const minDistance = Math.min(this.canvasWidth, this.canvasHeight) * 0.7;
        const distance = Math.sqrt(
            Math.pow(exitX - entryPoint.x, 2) + Math.pow(exitY - entryPoint.y, 2)
        );
        
        if (distance < minDistance) {
            // Adjust exit point to ensure minimum distance
            const angle = Math.atan2(exitY - entryPoint.y, exitX - entryPoint.x);
            exitX = entryPoint.x + Math.cos(angle) * minDistance;
            exitY = entryPoint.y + Math.sin(angle) * minDistance;
            
            // Clamp to canvas bounds
            exitX = Math.max(50, Math.min(this.canvasWidth - 50, exitX));
            exitY = Math.max(50, Math.min(this.canvasHeight - 50, exitY));
        }
        
        return { x: exitX, y: exitY };
    }
    
    generateRawPath(start, end, themeConfig) {
        const startTime = this.startPerformanceTimer();
        const path = [start];
        
        // Calculate base direction
        const totalDistance = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        
        const baseAngle = Math.atan2(end.y - start.y, end.x - start.x);
        
        let currentPoint = { ...start };
        let currentAngle = baseAngle;
        let distanceToEnd = totalDistance;
        let iterations = 0;
        
        // Main path generation loop with iteration limits
        while (distanceToEnd > this.segmentLength * 2 && iterations < this.maxIterations) {
            iterations++;
            
            // Check for performance timeout
            if (iterations % 50 === 0) {
                const currentTime = performance.now();
                if (currentTime - startTime > this.performanceThreshold) {
                    console.warn(`PathGenerator: Generation timeout after ${iterations} iterations, using fallback`);
                    this.performanceStats.fallbackCount++;
                    break;
                }
            }
            
            // Add some randomness to the angle based on theme
            const angleVariationKey = `angle_var_${iterations % 100}`;
            const angleVariation = this.getCachedRNG(angleVariationKey, () => 
                (this.rng() - 0.5) * Math.PI * 0.3 * (1 - themeConfig.straightBias)
            );
            currentAngle += angleVariation;
            
            // Ensure we're still generally heading toward the end
            const directAngle = Math.atan2(end.y - currentPoint.y, end.x - currentPoint.x);
            const angleDiff = directAngle - currentAngle;
            
            // Correct angle if we're deviating too much
            if (Math.abs(angleDiff) > Math.PI / 3) {
                const correctionKey = `angle_corr_${iterations % 100}`;
                const correction = this.getCachedRNG(correctionKey, () => 
                    (this.rng() - 0.5) * Math.PI * 0.2
                );
                currentAngle = directAngle + correction;
            }
            
            // Calculate next point with cached random segment distance
            const segmentDistKey = `seg_dist_${iterations % 100}`;
            const segmentDist = this.segmentLength + this.getCachedRNG(segmentDistKey, () => 
                (this.rng() - 0.5) * 20
            );
            
            const nextPoint = {
                x: currentPoint.x + Math.cos(currentAngle) * segmentDist,
                y: currentPoint.y + Math.sin(currentAngle) * segmentDist
            };
            
            // Ensure point is within bounds
            nextPoint.x = Math.max(50, Math.min(this.canvasWidth - 50, nextPoint.x));
            nextPoint.y = Math.max(50, Math.min(this.canvasHeight - 50, nextPoint.y));
            
            path.push(nextPoint);
            currentPoint = nextPoint;
            
            distanceToEnd = Math.sqrt(
                Math.pow(end.x - currentPoint.x, 2) + Math.pow(end.y - currentPoint.y, 2)
            );
        }
        
        // Add the end point
        path.push(end);
        
        // Log performance metrics
        const perfResults = this.endPerformanceTimer(startTime, 'generateRawPath');
        
        if (iterations >= this.maxIterations) {
            console.warn(`PathGenerator: Hit maximum iterations (${this.maxIterations}) for path generation`);
            this.performanceStats.failureCount++;
        }
        
        // Add metadata for debugging and monitoring
        path.metadata = {
            iterations,
            hitMaxIterations: iterations >= this.maxIterations,
            generationTime: perfResults.elapsedTime,
            isSlowGeneration: perfResults.isSlowGeneration,
            totalPoints: path.length,
            theme: themeConfig,
            cacheHitRate: this.performanceStats.cacheHitRate
        };
        
        return path;
    }
    
    addPathVariations(basePath, complexity) {
        if (complexity < 0.3) return basePath; // Low complexity, keep simple
        
        const enhancedPath = [];
        
        for (let i = 0; i < basePath.length - 1; i++) {
            enhancedPath.push(basePath[i]);
            
            // Add intermediate points for curves
            if (this.rng() < complexity) {
                const current = basePath[i];
                const next = basePath[i + 1];
                
                // Create a curve point
                const midX = (current.x + next.x) / 2;
                const midY = (current.y + next.y) / 2;
                
                // Add perpendicular offset
                const angle = Math.atan2(next.y - current.y, next.x - current.x);
                const perpAngle = angle + Math.PI / 2;
                const offset = (this.rng() - 0.5) * 100;
                
                const curvePoint = {
                    x: midX + Math.cos(perpAngle) * offset,
                    y: midY + Math.sin(perpAngle) * offset
                };
                
                // Ensure curve point is within bounds
                curvePoint.x = Math.max(50, Math.min(this.canvasWidth - 50, curvePoint.x));
                curvePoint.y = Math.max(50, Math.min(this.canvasHeight - 50, curvePoint.y));
                
                enhancedPath.push(curvePoint);
            }
        }
        
        enhancedPath.push(basePath[basePath.length - 1]);
        return enhancedPath;
    }
    
    smoothPath(rawPath, intensity = 1.0) {
        if (rawPath.length < 3) return rawPath;
        
        const smoothed = [rawPath[0]]; // Keep first point
        
        // Apply smoothing using moving average with intensity control
        for (let i = 1; i < rawPath.length - 1; i++) {
            const prev = rawPath[i - 1];
            const current = rawPath[i];
            const next = rawPath[i + 1];
            
            // Calculate smoothed position
            const smoothedX = (prev.x + current.x * 2 + next.x) / 4;
            const smoothedY = (prev.y + current.y * 2 + next.y) / 4;
            
            // Interpolate between original and smoothed based on intensity
            const smoothedPoint = {
                x: current.x + (smoothedX - current.x) * intensity,
                y: current.y + (smoothedY - current.y) * intensity,
                // Preserve additional properties from the original point
                ...((current.isInterpolated !== undefined) && { isInterpolated: current.isInterpolated })
            };
            
            smoothed.push(smoothedPoint);
        }
        
        smoothed.push(rawPath[rawPath.length - 1]); // Keep last point
        return smoothed;
    }
    
    validatePath(path) {
        // Use flexible validation if available, otherwise fall back to legacy
        if (this.flexibleValidation) {
            const validation = this.flexibleValidation.validatePath(path, {
                profileName: this.validationProfile,
                allowOverrides: true,
                generateRecommendations: false,
                trackHistory: false
            });
            
            // Return simple boolean for legacy compatibility
            return validation.isValid;
        }
        
        // Legacy validation logic
        if (path.length < 2) return false;
        
        // Check minimum path length
        let totalLength = 0;
        for (let i = 0; i < path.length - 1; i++) {
            const dist = Math.sqrt(
                Math.pow(path[i + 1].x - path[i].x, 2) + 
                Math.pow(path[i + 1].y - path[i].y, 2)
            );
            totalLength += dist;
        }
        
        if (totalLength < this.minPathLength) return false;
        
        // Check that all points are within bounds
        for (const point of path) {
            if (point.x < 0 || point.x > this.canvasWidth || 
                point.y < 0 || point.y > this.canvasHeight) {
                return false;
            }
        }
        
        // Check for sharp turns that might be problematic
        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i - 1];
            const current = path[i];
            const next = path[i + 1];
            
            const angle1 = Math.atan2(current.y - prev.y, current.x - prev.x);
            const angle2 = Math.atan2(next.y - current.y, next.x - current.x);
            const angleDiff = Math.abs(angle2 - angle1);
            
            // Check for excessively sharp turns
            if (angleDiff > Math.PI * 0.8 && angleDiff < Math.PI * 1.2) {
                return false;
            }
        }
        
        return true;
    }
    
    generatePathObstacles(path, levelId) {
        const obstacles = [];
        const obstacleCount = Math.floor(levelId / 2) + 2; // More obstacles in later levels
        
        for (let i = 0; i < obstacleCount; i++) {
            // Find a position not too close to the path
            let attempts = 0;
            let obstacle = null;
            
            while (attempts < 20) {
                const x = this.rng() * (this.canvasWidth - 100) + 50;
                const y = this.rng() * (this.canvasHeight - 100) + 50;
                
                // Check distance from path
                let minDistanceToPath = Infinity;
                for (const point of path) {
                    const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
                    minDistanceToPath = Math.min(minDistanceToPath, dist);
                }
                
                if (minDistanceToPath > 80) {
                    obstacle = {
                        x: x,
                        y: y,
                        radius: 20 + this.rng() * 20,
                        type: 'rock'
                    };
                    break;
                }
                attempts++;
            }
            
            if (obstacle) {
                obstacles.push(obstacle);
            }
        }
        
        return obstacles;
    }
    
    getPathMetadata(path) {
        let totalLength = 0;
        let totalCurvature = 0;
        let sharpTurns = 0;
        
        // Calculate total length
        for (let i = 0; i < path.length - 1; i++) {
            const dist = Math.sqrt(
                Math.pow(path[i + 1].x - path[i].x, 2) + 
                Math.pow(path[i + 1].y - path[i].y, 2)
            );
            totalLength += dist;
        }
        
        // Calculate curvature and sharp turns
        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i - 1];
            const current = path[i];
            const next = path[i + 1];
            
            const angle1 = Math.atan2(current.y - prev.y, current.x - prev.x);
            const angle2 = Math.atan2(next.y - current.y, next.x - current.x);
            let angleDiff = Math.abs(angle2 - angle1);
            
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
            
            totalCurvature += angleDiff;
            
            if (angleDiff > Math.PI / 3) {
                sharpTurns++;
            }
        }
        
        const averageCurvature = totalCurvature / (path.length - 2);
        
        // Calculate difficulty rating
        let difficulty = 1;
        difficulty += totalLength / 500; // Longer paths are slightly harder
        difficulty += averageCurvature * 2; // Curvy paths are harder
        difficulty += sharpTurns * 0.5; // Sharp turns add difficulty
        
        return {
            totalLength: Math.round(totalLength),
            averageCurvature: Math.round(averageCurvature * 100) / 100,
            sharpTurns: sharpTurns,
            difficulty: Math.round(difficulty * 100) / 100,
            pointCount: path.length,
            estimatedTravelTime: Math.round(totalLength / 30) // Assuming 30 units/second
        };
    }
    
    
    // New helper methods for enhanced path generation
    
    useStaticPath(levelId) {
        // Level Path Preservation: Use new level configuration structure
        if (this.levelPreservation) {
            const levelConfig = this.levelPreservation.getLevelPathConfig(levelId);
            
            // Check if level has specific static path defined
            if (levelConfig.staticPath && levelConfig.staticPath.length >= 2) {
                const path = levelConfig.staticPath.map(point => ({ x: point.x, y: point.y }));
                path.isStatic = true;
                path.levelConfig = levelConfig;
                console.log(`Using static path for level ${levelId} (${levelConfig.designNotes || 'preserved layout'})`);
                return path;
            }
            
            // Check if generation is disabled - should use fallback path
            if (!levelConfig.allowGeneration) {
                console.warn(`Path generation disabled for level ${levelId} but no static path defined`);
            }
        }
        
        // Fallback to legacy CONFIG system
        if (typeof CONFIG !== 'undefined' && CONFIG.PATH_POINTS) {
            // For now, use the default PATH_POINTS as template
            const staticPoints = CONFIG.PATH_POINTS;
            
            if (staticPoints && staticPoints.length >= 2) {
                // Clone the points to avoid modifying the original
                const path = staticPoints.map(point => ({ x: point.x, y: point.y }));
                path.isStatic = true;
                return path;
            }
        }
        
        // Check for level-specific path configuration (legacy)
        if (typeof CONFIG !== 'undefined' && CONFIG.LEVEL_PATHS && CONFIG.LEVEL_PATHS[levelId]) {
            const levelPath = CONFIG.LEVEL_PATHS[levelId];
            if (levelPath && levelPath.length >= 2) {
                const path = levelPath.map(point => ({ x: point.x, y: point.y }));
                path.isStatic = true;
                return path;
            }
        }
        
        return null;
    }
    
    generateHybridPath(levelId, themeConfig) {
        // Try to get static path as foundation
        const staticPath = this.useStaticPath(levelId);
        
        if (staticPath && staticPath.length >= 2) {
            // Use static path as waypoints and add procedural segments between them
            return this.enhanceStaticPathWithVariations(staticPath, themeConfig);
        } else {
            // No static path available, generate dynamic path
            const entryPoint = this.generateEntryPoint();
            const exitPoint = this.generateExitPoint(entryPoint);
            return this.generateRawPath(entryPoint, exitPoint, themeConfig);
        }
    }
    
    enhanceStaticPathWithVariations(staticPath, themeConfig) {
        const enhancedPath = [];
        
        for (let i = 0; i < staticPath.length - 1; i++) {
            const current = staticPath[i];
            const next = staticPath[i + 1];
            
            enhancedPath.push(current);
            
            // Calculate distance between waypoints
            const distance = Math.sqrt(
                Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2)
            );
            
            // Add intermediate points if segment is long enough
            if (distance > this.segmentLength * 2) {
                const numIntermediatePoints = Math.floor(distance / this.segmentLength) - 1;
                
                for (let j = 1; j <= numIntermediatePoints; j++) {
                    const t = j / (numIntermediatePoints + 1);
                    
                    // Linear interpolation between waypoints
                    let interpolatedX = current.x + (next.x - current.x) * t;
                    let interpolatedY = current.y + (next.y - current.y) * t;
                    
                    // Add procedural variation based on theme
                    if (themeConfig.curveComplexity > 0.3) {
                        const perpAngle = Math.atan2(next.y - current.y, next.x - current.x) + Math.PI / 2;
                        const maxOffset = Math.min(50, distance * 0.2) * themeConfig.curveComplexity;
                        const offset = (this.rng() - 0.5) * 2 * maxOffset;
                        
                        interpolatedX += Math.cos(perpAngle) * offset;
                        interpolatedY += Math.sin(perpAngle) * offset;
                        
                        // Ensure points stay within bounds
                        interpolatedX = Math.max(50, Math.min(this.canvasWidth - 50, interpolatedX));
                        interpolatedY = Math.max(50, Math.min(this.canvasHeight - 50, interpolatedY));
                    }
                    
                    enhancedPath.push({
                        x: interpolatedX,
                        y: interpolatedY,
                        isInterpolated: true
                    });
                }
            }
        }
        
        // Add the final waypoint
        enhancedPath.push(staticPath[staticPath.length - 1]);
        
        return enhancedPath;
    }
    
    exportPath(path) {
        return {
            points: path.points,
            metadata: path.metadata,
            theme: path.theme,
            seed: path.seed,
            version: '1.0'
        };
    }
    
    importPath(pathData) {
        if (!pathData || !pathData.points || !pathData.version) {
            throw new Error('Invalid path data format');
        }
        
        // Validate imported path
        if (!this.validatePath(pathData.points)) {
            throw new Error('Imported path failed validation');
        }
        
        return {
            points: pathData.points,
            metadata: pathData.metadata || this.getPathMetadata(pathData.points),
            theme: pathData.theme || 'cyber',
            seed: pathData.seed || 0
        };
    }
    
    // Create branching paths for complex levels
    generateBranchingPath(basePath, branchCount = 1) {
        const branches = [basePath];
        
        for (let b = 0; b < branchCount; b++) {
            const branchStartIndex = Math.floor(basePath.length * 0.3) + 
                                   Math.floor(this.rng() * basePath.length * 0.4);
            const branchEndIndex = Math.min(basePath.length - 1, 
                                          branchStartIndex + Math.floor(basePath.length * 0.4));
            
            const branchStart = basePath[branchStartIndex];
            const branchEnd = basePath[branchEndIndex];
            
            // Create alternate route
            const branch = this.generateAlternatePath(branchStart, branchEnd);
            branches.push(branch);
        }
        
        return branches;
    }
    
    generateAlternatePath(start, end) {
        // Create a path that goes around the main route
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        
        // Calculate perpendicular direction
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const perpAngle = angle + Math.PI / 2;
        
        // Create waypoint away from direct path
        const offset = 100 + this.rng() * 100;
        const waypoint = {
            x: midX + Math.cos(perpAngle) * offset,
            y: midY + Math.sin(perpAngle) * offset
        };
        
        // Ensure waypoint is within bounds
        waypoint.x = Math.max(50, Math.min(this.canvasWidth - 50, waypoint.x));
        waypoint.y = Math.max(50, Math.min(this.canvasHeight - 50, waypoint.y));
        
        return [start, waypoint, end];
    }
    
    // Async path generation with progress callbacks
    async generateBasePathAsync(levelId, seed = null, theme = 'cyber', pathMode = 'hybrid', progressCallback = null) {
        if (this.isGeneratingAsync) {
            throw new Error('PathGenerator: Another async generation is already in progress');
        }
        
        this.isGeneratingAsync = true;
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Report initial progress
            if (progressCallback) {
                progressCallback({
                    taskId,
                    stage: 'initialization',
                    progress: 0,
                    message: 'Initializing path generation...'
                });
            }
            
            // Setup with small delay to allow UI updates
            await this.delay(10);
            
            if (seed !== null) {
                this.setSeed(seed);
            } else {
                this.setSeed(levelId * 1000 + Date.now() % 1000);
            }
            
            const themeConfig = this.themes[theme] || this.themes.cyber;
            
            if (progressCallback) {
                progressCallback({
                    taskId,
                    stage: 'setup',
                    progress: 20,
                    message: `Setting up ${theme} theme...`
                });
            }
            
            await this.delay(10);
            
            let path;
            
            // Handle different path modes
            if (pathMode === 'static' && CONFIG.PATH_POINTS && CONFIG.PATH_POINTS[levelId]) {
                if (progressCallback) {
                    progressCallback({
                        taskId,
                        stage: 'static_generation',
                        progress: 50,
                        message: 'Using predefined path points...'
                    });
                }
                
                await this.delay(10);
                path = this.createPathFromStaticPoints(CONFIG.PATH_POINTS[levelId], themeConfig);
                
            } else if (pathMode === 'hybrid' && CONFIG.PATH_POINTS && CONFIG.PATH_POINTS[levelId]) {
                if (progressCallback) {
                    progressCallback({
                        taskId,
                        stage: 'hybrid_generation',
                        progress: 40,
                        message: 'Enhancing predefined path...'
                    });
                }
                
                await this.delay(10);
                path = this.createPathFromStaticPoints(CONFIG.PATH_POINTS[levelId], themeConfig);
                
                if (progressCallback) {
                    progressCallback({
                        taskId,
                        stage: 'hybrid_enhancement',
                        progress: 70,
                        message: 'Adding procedural enhancements...'
                    });
                }
                
                await this.delay(10);
                path = this.enhanceStaticPath(path, themeConfig);
                
            } else {
                // Dynamic generation
                if (progressCallback) {
                    progressCallback({
                        taskId,
                        stage: 'dynamic_generation',
                        progress: 40,
                        message: 'Generating procedural path...'
                    });
                }
                
                await this.delay(10);
                const entryPoint = this.generateEntryPoint();
                const exitPoint = this.generateExitPoint(entryPoint);
                
                if (progressCallback) {
                    progressCallback({
                        taskId,
                        stage: 'path_calculation',
                        progress: 60,
                        message: 'Calculating path segments...'
                    });
                }
                
                await this.delay(10);
                path = await this.generateRawPathAsync(entryPoint, exitPoint, themeConfig, progressCallback, taskId);
                
                if (progressCallback) {
                    progressCallback({
                        taskId,
                        stage: 'path_enhancement',
                        progress: 80,
                        message: 'Adding path variations...'
                    });
                }
                
                await this.delay(10);
                path = this.addPathVariations(path, themeConfig.curveComplexity);
            }
            
            if (progressCallback) {
                progressCallback({
                    taskId,
                    stage: 'finalization',
                    progress: 90,
                    message: 'Finalizing path...'
                });
            }
            
            await this.delay(10);
            
            // Apply final smoothing
            path = this.smoothPath(path);
            
            // Add metadata
            path.theme = theme;
            path.levelId = levelId;
            path.seed = this.seed;
            path.pathMode = pathMode;
            path.generatedAt = Date.now();
            path.taskId = taskId;
            
            if (progressCallback) {
                progressCallback({
                    taskId,
                    stage: 'complete',
                    progress: 100,
                    message: 'Path generation complete!',
                    result: path
                });
            }
            
            return path;
            
        } catch (error) {
            if (progressCallback) {
                progressCallback({
                    taskId,
                    stage: 'error',
                    progress: -1,
                    message: `Error: ${error.message}`,
                    error
                });
            }
            throw error;
            
        } finally {
            this.isGeneratingAsync = false;
            this.currentAsyncTask = null;
        }
    }
    
    // Async version of generateRawPath with progress updates
    async generateRawPathAsync(start, end, themeConfig, progressCallback = null, taskId = null) {
        const startTime = this.startPerformanceTimer();
        const path = [start];
        
        const totalDistance = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        
        const baseAngle = Math.atan2(end.y - start.y, end.x - start.x);
        const estimatedIterations = Math.ceil(totalDistance / this.segmentLength);
        
        let currentPoint = { ...start };
        let currentAngle = baseAngle;
        let distanceToEnd = totalDistance;
        let iterations = 0;
        
        while (distanceToEnd > this.segmentLength * 2 && iterations < this.maxIterations) {
            iterations++;
            
            // Yield control periodically for UI responsiveness
            if (iterations % 25 === 0) {
                await this.delay(1);
                
                // Report progress
                if (progressCallback && taskId) {
                    const progress = Math.min(95, 60 + (iterations / estimatedIterations) * 20);
                    progressCallback({
                        taskId,
                        stage: 'path_calculation',
                        progress,
                        message: `Calculating path segment ${iterations}/${estimatedIterations}...`,
                        details: {
                            currentIteration: iterations,
                            estimatedTotal: estimatedIterations,
                            pointsGenerated: path.length,
                            distanceRemaining: distanceToEnd
                        }
                    });
                }
            }
            
            // Check for performance timeout
            if (iterations % 50 === 0) {
                const currentTime = performance.now();
                if (currentTime - startTime > this.performanceThreshold) {
                    console.warn(`PathGenerator: Async generation timeout after ${iterations} iterations, using fallback`);
                    this.performanceStats.fallbackCount++;
                    break;
                }
            }
            
            // Use cached RNG values for performance
            const angleVariationKey = `async_angle_var_${iterations % 100}`;
            const angleVariation = this.getCachedRNG(angleVariationKey, () => 
                (this.rng() - 0.5) * Math.PI * 0.3 * (1 - themeConfig.straightBias)
            );
            currentAngle += angleVariation;
            
            const directAngle = Math.atan2(end.y - currentPoint.y, end.x - currentPoint.x);
            const angleDiff = directAngle - currentAngle;
            
            if (Math.abs(angleDiff) > Math.PI / 3) {
                const correctionKey = `async_angle_corr_${iterations % 100}`;
                const correction = this.getCachedRNG(correctionKey, () => 
                    (this.rng() - 0.5) * Math.PI * 0.2
                );
                currentAngle = directAngle + correction;
            }
            
            const segmentDistKey = `async_seg_dist_${iterations % 100}`;
            const segmentDist = this.segmentLength + this.getCachedRNG(segmentDistKey, () => 
                (this.rng() - 0.5) * 20
            );
            
            const nextPoint = {
                x: currentPoint.x + Math.cos(currentAngle) * segmentDist,
                y: currentPoint.y + Math.sin(currentAngle) * segmentDist
            };
            
            nextPoint.x = Math.max(50, Math.min(this.canvasWidth - 50, nextPoint.x));
            nextPoint.y = Math.max(50, Math.min(this.canvasHeight - 50, nextPoint.y));
            
            path.push(nextPoint);
            currentPoint = nextPoint;
            
            distanceToEnd = Math.sqrt(
                Math.pow(end.x - currentPoint.x, 2) + Math.pow(end.y - currentPoint.y, 2)
            );
        }
        
        path.push(end);
        
        const perfResults = this.endPerformanceTimer(startTime, 'generateRawPathAsync');
        
        if (iterations >= this.maxIterations) {
            console.warn(`PathGenerator: Hit maximum iterations (${this.maxIterations}) for async path generation`);
            this.performanceStats.failureCount++;
        }
        
        path.metadata = {
            iterations,
            hitMaxIterations: iterations >= this.maxIterations,
            generationTime: perfResults.elapsedTime,
            isSlowGeneration: perfResults.isSlowGeneration,
            totalPoints: path.length,
            theme: themeConfig,
            cacheHitRate: this.performanceStats.cacheHitRate,
            asyncGeneration: true
        };
        
        return path;
    }
    
    // Utility method for async delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Cancel current async generation
    cancelAsyncGeneration() {
        if (this.isGeneratingAsync && this.currentAsyncTask) {
            this.currentAsyncTask.cancelled = true;
            this.isGeneratingAsync = false;
            this.currentAsyncTask = null;
            return true;
        }
        return false;
    }
    
    // Get performance statistics
    getPerformanceStats() {
        return {
            ...this.performanceStats,
            isGeneratingAsync: this.isGeneratingAsync,
            currentTask: this.currentAsyncTask
        };
    }
    
    // ==== LEVEL DESIGN PRESERVATION API ====
    
    // Generate path previews for testing and validation
    async generatePathPreviews(levelId, options = {}) {
        if (!this.levelPreservation) {
            throw new Error('Level Preservation System not available');
        }
        
        this.previewMode = true;
        try {
            const previews = await this.levelPreservation.generatePathPreviews(levelId, options);
            return previews;
        } finally {
            this.previewMode = false;
        }
    }
    
    // Test path generation for a specific level
    testLevelPathGeneration(levelId, testOptions = {}) {
        if (!this.levelPreservation) {
            throw new Error('Level Preservation System not available');
        }
        
        return this.levelPreservation.testPathGeneration(levelId, testOptions);
    }
    
    // Validate a path for level balance and constraints
    validatePathForLevel(path, levelId, pathMode = 'hybrid') {
        if (!this.levelPreservation) {
            console.warn('Level Preservation System not available - skipping validation');
            return { isValid: true, warnings: [], errors: [] };
        }
        
        return this.levelPreservation.validatePathForLevel(path, levelId, pathMode);
    }
    
    // Get level-specific path configuration
    getLevelPathConfig(levelId) {
        if (!this.levelPreservation) {
            return { pathMode: 'hybrid', theme: 'cyber', allowGeneration: true };
        }
        
        return this.levelPreservation.getLevelPathConfig(levelId);
    }
    
    // Enable/disable path generation for a specific level
    setPathGenerationEnabled(levelId, enabled, preserveLayout = false) {
        if (!this.levelPreservation) {
            console.warn('Level Preservation System not available');
            return;
        }
        
        this.levelPreservation.setPathGenerationEnabled(levelId, enabled, preserveLayout);
    }
    
    // Check if path generation is disabled for a level
    isPathGenerationDisabled(levelId) {
        if (!this.levelPreservation) {
            return false;
        }
        
        return this.levelPreservation.isPathGenerationDisabled(levelId);
    }
    
    // Enhanced Flexible Validation Methods
    
    // Get appropriate validation profile for a level
    getValidationProfileForLevel(levelId) {
        if (!levelId) return this.validationProfile;
        
        // Define level-based profile selection
        if (levelId <= 2) {
            return 'tutorial'; // Tutorial levels need simple, predictable validation
        } else if (levelId <= 5) {
            return 'strict'; // Early game should be well-balanced
        } else if (levelId <= 15) {
            return 'balanced'; // Mid-game with moderate flexibility
        } else if (levelId <= 20) {
            return 'creative'; // Late game allows more creativity
        } else {
            return 'experimental'; // Challenge levels can be experimental
        }
    }
    
    // Set validation profile for current session
    setValidationProfile(profileName) {
        if (this.flexibleValidation && this.flexibleValidation.validationProfiles[profileName]) {
            this.validationProfile = profileName;
            console.log(`Validation profile set to: ${profileName}`);
        } else {
            console.warn(`Unknown validation profile: ${profileName}`);
        }
    }
    
    // Set level-specific validation overrides
    setLevelValidationOverride(levelId, overrides) {
        if (this.flexibleValidation) {
            this.flexibleValidation.setLevelOverride(levelId, overrides);
        }
    }
    
    // Remove level-specific validation overrides
    removeLevelValidationOverride(levelId) {
        if (this.flexibleValidation) {
            this.flexibleValidation.removeLevelOverride(levelId);
        }
    }
    
    // Validate path with flexible system
    validatePathFlexible(path, options = {}) {
        if (!this.flexibleValidation) {
            console.warn('Flexible validation system not available, falling back to legacy');
            return this.validatePath(path);
        }
        
        return this.flexibleValidation.validatePath(path, options);
    }
    
    // Get validation statistics
    getValidationStats() {
        if (this.flexibleValidation) {
            return this.flexibleValidation.getValidationStats();
        }
        return null;
    }
    
    // Get available validation profiles
    getAvailableValidationProfiles() {
        if (this.flexibleValidation) {
            return Object.keys(this.flexibleValidation.validationProfiles);
        }
        return [];
    }
    
    // Export validation configuration
    exportValidationConfiguration() {
        if (this.flexibleValidation) {
            return this.flexibleValidation.exportConfiguration();
        }
        return null;
    }
    
    // Import validation configuration
    importValidationConfiguration(config) {
        if (this.flexibleValidation) {
            this.flexibleValidation.importConfiguration(config);
        }
    }
    
    // Export level configuration for backup
    exportLevelConfiguration(levelId) {
        if (!this.levelPreservation) {
            throw new Error('Level Preservation System not available');
        }
        
        return this.levelPreservation.exportLevelConfiguration(levelId);
    }
    
    // Import level configuration
    importLevelConfiguration(configData) {
        if (!this.levelPreservation) {
            throw new Error('Level Preservation System not available');
        }
        
        return this.levelPreservation.importLevelConfiguration(configData);
    }
    
    // Get comprehensive level design preservation metrics
    getLevelPreservationMetrics() {
        if (!this.levelPreservation) {
            return null;
        }
        
        return {
            performanceMetrics: this.levelPreservation.getPerformanceMetrics(),
            validationEnabled: this.validationEnabled,
            systemInfo: {
                canvasWidth: this.canvasWidth,
                canvasHeight: this.canvasHeight,
                themes: Object.keys(this.themes),
                pathModes: ['static', 'dynamic', 'hybrid']
            }
        };
    }
    
    // Enable/disable path validation system
    setValidationEnabled(enabled) {
        this.validationEnabled = enabled;
        console.log(`Path validation ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PathGenerator;
}
