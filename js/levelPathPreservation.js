// Dharmapala Shield - Level Design Preservation System
//
// This system provides comprehensive level design preservation options:
// 1. Level-specific path generation modes and configurations
// 2. Path variation validation to ensure level balance
// 3. Path generation preview and testing tools
// 4. Granular control over path generation per level
//
// Features:
// - Per-level path generation control
// - Balance validation and constraint checking
// - Preview system for testing path variations
// - Designer-friendly configuration interface
// - Performance monitoring and optimization

class LevelPathPreservation {
    constructor(canvasWidth = 1200, canvasHeight = 600) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Core systems
        this.pathValidator = new PathValidator();
        this.pathPreview = new PathPreview(canvasWidth, canvasHeight);
        this.balanceChecker = new LevelBalanceChecker();
        
        // Performance tracking
        this.performanceMetrics = {
            validationTime: [],
            previewGenerationTime: [],
            balanceCheckTime: [],
            lastUpdate: Date.now()
        };
        
        // Designer preferences
        this.designerSettings = {
            autoValidate: true,
            showConstraintWarnings: true,
            enableBalanceChecking: true,
            previewQuality: 'medium',
            maxPreviewVariations: 5
        };
        
        // Initialize validation rules
        this.initializeValidationRules();
        
        console.log('LevelPathPreservation system initialized');
    }
    
    // Initialize comprehensive validation rules for path generation
    initializeValidationRules() {
        this.validationRules = {
            // Path length constraints
            length: {
                min: 300,
                max: 1200,
                warning: 100 // Warning threshold from limits
            },
            
            // Turn angle constraints
            turnAngle: {
                max: Math.PI * 0.75, // 135 degrees maximum turn
                sharpTurnLimit: 3, // Max number of sharp turns (>90 degrees)
                consecutiveSharpTurns: 2 // Max consecutive sharp turns
            },
            
            // Segment constraints
            segment: {
                minLength: 40,
                maxLength: 300,
                consistencyRatio: 0.3 // Max ratio difference between segments
            },
            
            // Difficulty progression constraints
            difficulty: {
                maxIncrease: 0.5, // Max difficulty jump between levels
                balanceThreshold: 0.8, // Balance score threshold
                complexityLimit: 0.9 // Max complexity for early levels
            },
            
            // Defensive position constraints
            defense: {
                minCoverage: 0.6, // Minimum path coverage for defensive positions
                chokePointRatio: 0.3, // Ratio of path that should be in choke points
                openAreaRatio: 0.4 // Ratio of path that should be in open areas
            }
        };
    }
    
    // Get level-specific path configuration with fallbacks
    getLevelPathConfig(levelId) {
        // Get level-specific configuration from CONFIG.LEVEL_PATHS
        const levelConfig = CONFIG.LEVEL_PATHS?.[`level_${levelId}`] || CONFIG.LEVEL_PATHS?.[levelId];
        
        // Default configuration for levels without specific settings
        const defaultConfig = {
            pathMode: 'hybrid',
            theme: 'cyber',
            allowGeneration: true,
            preserveLayout: false,
            constraints: {
                maxTurnAngle: Math.PI * 0.6,
                minSegmentLength: 50,
                maxComplexity: 0.7
            },
            balanceSettings: {
                targetDifficulty: this.calculateTargetDifficulty(levelId),
                allowVariations: true,
                maxPathVariations: 3
            }
        };
        
        // Merge with level-specific settings
        return {
            ...defaultConfig,
            ...levelConfig
        };
    }
    
    // Calculate target difficulty based on level progression
    calculateTargetDifficulty(levelId) {
        // Progressive difficulty curve
        const baseDifficulty = 0.3;
        const progressionRate = 0.08;
        const maxDifficulty = 0.95;
        
        const calculatedDifficulty = baseDifficulty + (levelId - 1) * progressionRate;
        return Math.min(calculatedDifficulty, maxDifficulty);
    }
    
    // Validate path variations against level balance requirements
    validatePathForLevel(path, levelId, pathMode = 'hybrid') {
        const startTime = performance.now();
        const levelConfig = this.getLevelPathConfig(levelId);
        const validationResult = {
            isValid: true,
            warnings: [],
            errors: [],
            balanceScore: 0,
            constraintViolations: [],
            recommendations: []
        };
        
        try {
            // Skip validation if path generation is disabled for this level
            if (!levelConfig.allowGeneration) {
                validationResult.warnings.push('Path generation disabled for this level - using preserved layout');
                return validationResult;
            }
            
            // Basic path structure validation
            const structureValidation = this.pathValidator.validatePathStructure(path, this.validationRules);
            validationResult.errors.push(...structureValidation.errors);
            validationResult.warnings.push(...structureValidation.warnings);
            
            // Level-specific constraint validation
            const constraintValidation = this.validateLevelConstraints(path, levelConfig);
            validationResult.constraintViolations.push(...constraintValidation.violations);
            validationResult.warnings.push(...constraintValidation.warnings);
            
            // Balance validation
            if (this.designerSettings.enableBalanceChecking) {
                const balanceValidation = this.balanceChecker.validateBalance(path, levelId, levelConfig);
                validationResult.balanceScore = balanceValidation.score;
                validationResult.warnings.push(...balanceValidation.warnings);
                
                if (balanceValidation.score < this.validationRules.difficulty.balanceThreshold) {
                    validationResult.errors.push(`Balance score ${balanceValidation.score.toFixed(2)} below threshold ${this.validationRules.difficulty.balanceThreshold}`);
                }
            }
            
            // Generate recommendations
            validationResult.recommendations = this.generatePathRecommendations(
                path, levelId, levelConfig, validationResult
            );
            
            // Overall validity check
            validationResult.isValid = validationResult.errors.length === 0;
            
        } catch (error) {
            validationResult.isValid = false;
            validationResult.errors.push(`Validation error: ${error.message}`);
        } finally {
            // Track performance
            const elapsedTime = performance.now() - startTime;
            this.performanceMetrics.validationTime.push(elapsedTime);
            this.trimPerformanceMetrics();
        }
        
        return validationResult;
    }
    
    // Validate level-specific constraints
    validateLevelConstraints(path, levelConfig) {
        const result = {
            violations: [],
            warnings: []
        };
        
        if (!path || path.length < 2) {
            result.violations.push('Invalid path structure');
            return result;
        }
        
        // Check path mode constraints
        if (levelConfig.preserveLayout && levelConfig.pathMode !== 'static') {
            result.warnings.push('Level marked for layout preservation but not using static path mode');
        }
        
        // Validate custom constraints
        if (levelConfig.constraints) {
            const constraints = levelConfig.constraints;
            
            // Turn angle constraints
            if (constraints.maxTurnAngle) {
                const maxTurnFound = this.pathValidator.getMaxTurnAngle(path);
                if (maxTurnFound > constraints.maxTurnAngle) {
                    result.violations.push(`Max turn angle ${maxTurnFound.toFixed(2)} exceeds limit ${constraints.maxTurnAngle.toFixed(2)}`);
                }
            }
            
            // Segment length constraints
            if (constraints.minSegmentLength) {
                const minSegmentFound = this.pathValidator.getMinSegmentLength(path);
                if (minSegmentFound < constraints.minSegmentLength) {
                    result.violations.push(`Min segment length ${minSegmentFound.toFixed(2)} below limit ${constraints.minSegmentLength}`);
                }
            }
            
            // Complexity constraints
            if (constraints.maxComplexity) {
                const pathComplexity = this.pathValidator.calculateComplexity(path);
                if (pathComplexity > constraints.maxComplexity) {
                    result.violations.push(`Path complexity ${pathComplexity.toFixed(2)} exceeds limit ${constraints.maxComplexity.toFixed(2)}`);
                }
            }
        }
        
        return result;
    }
    
    // Generate path recommendations based on validation results
    generatePathRecommendations(path, levelId, levelConfig, validationResult) {
        const recommendations = [];
        
        // Performance recommendations
        const pathComplexity = this.pathValidator.calculateComplexity(path);
        if (pathComplexity > 0.8) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: 'Consider reducing path complexity for better performance',
                suggestion: 'Reduce turn frequency or use simpler themes'
            });
        }
        
        // Balance recommendations
        if (validationResult.balanceScore < 0.7) {
            recommendations.push({
                type: 'balance',
                priority: 'high',
                message: 'Path may be too difficult or easy for this level',
                suggestion: 'Adjust path complexity or add/remove challenging sections'
            });
        }
        
        // Constraint violation recommendations
        if (validationResult.constraintViolations.length > 0) {
            recommendations.push({
                type: 'constraint',
                priority: 'high',
                message: 'Path violates level-specific constraints',
                suggestion: 'Review level configuration or regenerate path'
            });
        }
        
        // Mode-specific recommendations
        if (levelConfig.pathMode === 'static' && validationResult.warnings.length > 0) {
            recommendations.push({
                type: 'mode',
                priority: 'low',
                message: 'Consider hybrid mode for more flexibility while preserving key waypoints',
                suggestion: 'Change pathMode to "hybrid" in level configuration'
            });
        }
        
        return recommendations;
    }
    
    // Generate multiple path variations for preview and testing
    async generatePathPreviews(levelId, options = {}) {
        const startTime = performance.now();
        const levelConfig = this.getLevelPathConfig(levelId);
        
        const previewOptions = {
            variationCount: options.variationCount || this.designerSettings.maxPreviewVariations,
            themes: options.themes || [levelConfig.theme, 'cyber', 'urban'],
            pathModes: options.pathModes || [levelConfig.pathMode],
            showValidation: options.showValidation !== false,
            includeMetrics: options.includeMetrics !== false
        };
        
        try {
            const previews = await this.pathPreview.generatePreviews(
                levelId, 
                levelConfig, 
                previewOptions
            );
            
            // Add validation results to each preview if requested
            if (previewOptions.showValidation) {
                for (const preview of previews) {
                    preview.validation = this.validatePathForLevel(
                        preview.path, 
                        levelId, 
                        preview.pathMode
                    );
                }
            }
            
            // Track performance
            const elapsedTime = performance.now() - startTime;
            this.performanceMetrics.previewGenerationTime.push(elapsedTime);
            this.trimPerformanceMetrics();
            
            return {
                success: true,
                previews,
                levelConfig,
                generationTime: elapsedTime,
                previewOptions
            };
            
        } catch (error) {
            console.error('Error generating path previews:', error);
            return {
                success: false,
                error: error.message,
                levelConfig,
                previewOptions
            };
        }
    }
    
    // Test path generation with different settings
    testPathGeneration(levelId, testOptions = {}) {
        const results = {
            levelId,
            testResults: [],
            summary: {
                totalTests: 0,
                passedTests: 0,
                warnings: 0,
                errors: 0
            },
            recommendations: []
        };
        
        const levelConfig = this.getLevelPathConfig(levelId);
        const testConfigs = this.generateTestConfigurations(levelConfig, testOptions);
        
        for (const testConfig of testConfigs) {
            const testResult = this.runSinglePathTest(levelId, testConfig);
            results.testResults.push(testResult);
            
            // Update summary
            results.summary.totalTests++;
            if (testResult.validation.isValid) {
                results.summary.passedTests++;
            }
            results.summary.warnings += testResult.validation.warnings.length;
            results.summary.errors += testResult.validation.errors.length;
        }
        
        // Generate overall recommendations
        results.recommendations = this.generateTestRecommendations(results);
        
        return results;
    }
    
    // Generate test configurations for comprehensive testing
    generateTestConfigurations(levelConfig, testOptions) {
        const configs = [];
        
        // Test different path modes
        const pathModes = testOptions.pathModes || ['static', 'dynamic', 'hybrid'];
        const themes = testOptions.themes || ['cyber', 'urban', 'forest'];
        const complexities = testOptions.complexities || [0.3, 0.6, 0.9];
        
        for (const pathMode of pathModes) {
            for (const theme of themes) {
                for (const complexity of complexities) {
                    configs.push({
                        pathMode,
                        theme,
                        complexity,
                        testName: `${pathMode}_${theme}_${complexity}`
                    });
                }
            }
        }
        
        return configs.slice(0, testOptions.maxTests || 15); // Limit test count
    }
    
    // Run a single path generation test
    runSinglePathTest(levelId, testConfig) {
        const startTime = performance.now();
        
        try {
            // Simulate path generation with test configuration
            const mockPath = this.generateMockPath(levelId, testConfig);
            const validation = this.validatePathForLevel(mockPath, levelId, testConfig.pathMode);
            
            return {
                testConfig,
                success: true,
                path: mockPath,
                validation,
                generationTime: performance.now() - startTime
            };
            
        } catch (error) {
            return {
                testConfig,
                success: false,
                error: error.message,
                generationTime: performance.now() - startTime
            };
        }
    }
    
    // Generate mock path for testing purposes
    generateMockPath(levelId, testConfig) {
        const levelConfig = this.getLevelPathConfig(levelId);
        const pathLength = 8 + Math.floor(testConfig.complexity * 6); // 8-14 points
        const path = [];
        
        // Generate path points based on test configuration
        for (let i = 0; i < pathLength; i++) {
            const progress = i / (pathLength - 1);
            const baseX = progress * this.canvasWidth;
            const baseY = this.canvasHeight / 2;
            
            // Add variation based on complexity and theme
            const variation = testConfig.complexity * 100;
            const x = Math.max(50, Math.min(this.canvasWidth - 50, 
                baseX + (Math.random() - 0.5) * variation));
            const y = Math.max(50, Math.min(this.canvasHeight - 50, 
                baseY + (Math.random() - 0.5) * variation));
            
            path.push({ x, y });
        }
        
        return path;
    }
    
    // Generate recommendations based on test results
    generateTestRecommendations(results) {
        const recommendations = [];
        const { summary } = results;
        
        const successRate = summary.passedTests / summary.totalTests;
        const avgWarnings = summary.warnings / summary.totalTests;
        const avgErrors = summary.errors / summary.totalTests;
        
        if (successRate < 0.8) {
            recommendations.push({
                type: 'critical',
                message: `Low success rate (${(successRate * 100).toFixed(1)}%)`,
                suggestion: 'Review level constraints and path generation settings'
            });
        }
        
        if (avgErrors > 1) {
            recommendations.push({
                type: 'error',
                message: `High error rate (${avgErrors.toFixed(1)} per test)`,
                suggestion: 'Check validation rules and level configuration'
            });
        }
        
        if (avgWarnings > 2) {
            recommendations.push({
                type: 'warning',
                message: `Many warnings (${avgWarnings.toFixed(1)} per test)`,
                suggestion: 'Consider adjusting warning thresholds or constraints'
            });
        }
        
        return recommendations;
    }
    
    // Check if path generation should be disabled for a specific level
    isPathGenerationDisabled(levelId) {
        const levelConfig = this.getLevelPathConfig(levelId);
        return !levelConfig.allowGeneration || levelConfig.preserveLayout;
    }
    
    // Enable/disable path generation for a specific level
    setPathGenerationEnabled(levelId, enabled, preserveLayout = false) {
        if (!CONFIG.LEVEL_PATHS) {
            CONFIG.LEVEL_PATHS = {};
        }
        
        const levelKey = `level_${levelId}`;
        if (!CONFIG.LEVEL_PATHS[levelKey]) {
            CONFIG.LEVEL_PATHS[levelKey] = {};
        }
        
        CONFIG.LEVEL_PATHS[levelKey].allowGeneration = enabled;
        CONFIG.LEVEL_PATHS[levelKey].preserveLayout = preserveLayout;
        
        if (!enabled) {
            CONFIG.LEVEL_PATHS[levelKey].pathMode = 'static';
        }
        
        console.log(`Path generation ${enabled ? 'enabled' : 'disabled'} for level ${levelId}${preserveLayout ? ' (layout preserved)' : ''}`);
    }
    
    // Get performance metrics for the system
    getPerformanceMetrics() {
        const metrics = {};
        
        for (const [key, values] of Object.entries(this.performanceMetrics)) {
            if (Array.isArray(values) && values.length > 0) {
                metrics[key] = {
                    average: values.reduce((a, b) => a + b, 0) / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    count: values.length
                };
            }
        }
        
        return metrics;
    }
    
    // Trim performance metrics to prevent memory leaks
    trimPerformanceMetrics() {
        const maxEntries = 100;
        
        for (const key of Object.keys(this.performanceMetrics)) {
            if (Array.isArray(this.performanceMetrics[key])) {
                if (this.performanceMetrics[key].length > maxEntries) {
                    this.performanceMetrics[key] = this.performanceMetrics[key].slice(-maxEntries);
                }
            }
        }
    }
    
    // Export level configuration for backup or sharing
    exportLevelConfiguration(levelId) {
        const levelConfig = this.getLevelPathConfig(levelId);
        const testResults = this.testPathGeneration(levelId, { maxTests: 5 });
        
        return {
            levelId,
            configuration: levelConfig,
            validationRules: this.validationRules,
            testResults: testResults.summary,
            exportTime: new Date().toISOString(),
            designerSettings: this.designerSettings
        };
    }
    
    // Import level configuration
    importLevelConfiguration(configData) {
        try {
            const { levelId, configuration } = configData;
            
            if (!CONFIG.LEVEL_PATHS) {
                CONFIG.LEVEL_PATHS = {};
            }
            
            CONFIG.LEVEL_PATHS[`level_${levelId}`] = configuration;
            
            console.log(`Imported configuration for level ${levelId}`);
            return { success: true };
            
        } catch (error) {
            console.error('Error importing level configuration:', error);
            return { success: false, error: error.message };
        }
    }
}

// Path Validator - Handles path structure and constraint validation
class PathValidator {
    constructor() {
        this.validationCache = new Map();
    }
    
    // Validate basic path structure
    validatePathStructure(path, rules) {
        const result = {
            errors: [],
            warnings: []
        };
        
        if (!path || !Array.isArray(path)) {
            result.errors.push('Invalid path structure - not an array');
            return result;
        }
        
        if (path.length < 2) {
            result.errors.push('Path must have at least 2 points');
            return result;
        }
        
        // Length validation
        const pathLength = this.calculatePathLength(path);
        if (pathLength < rules.length.min) {
            result.errors.push(`Path length ${pathLength.toFixed(2)} below minimum ${rules.length.min}`);
        } else if (pathLength > rules.length.max) {
            result.errors.push(`Path length ${pathLength.toFixed(2)} exceeds maximum ${rules.length.max}`);
        } else if (pathLength < rules.length.min + rules.length.warning || 
                   pathLength > rules.length.max - rules.length.warning) {
            result.warnings.push(`Path length ${pathLength.toFixed(2)} near limit`);
        }
        
        // Turn angle validation
        const turnAngles = this.calculateTurnAngles(path);
        const sharpTurns = turnAngles.filter(angle => angle > Math.PI / 2).length;
        
        if (turnAngles.some(angle => angle > rules.turnAngle.max)) {
            result.errors.push(`Path contains turns exceeding maximum angle ${rules.turnAngle.max.toFixed(2)}`);
        }
        
        if (sharpTurns > rules.turnAngle.sharpTurnLimit) {
            result.warnings.push(`Path has ${sharpTurns} sharp turns (limit: ${rules.turnAngle.sharpTurnLimit})`);
        }
        
        // Segment validation
        const segments = this.calculateSegmentLengths(path);
        const minSegment = Math.min(...segments);
        const maxSegment = Math.max(...segments);
        
        if (minSegment < rules.segment.minLength) {
            result.errors.push(`Shortest segment ${minSegment.toFixed(2)} below minimum ${rules.segment.minLength}`);
        }
        
        if (maxSegment > rules.segment.maxLength) {
            result.warnings.push(`Longest segment ${maxSegment.toFixed(2)} exceeds recommended maximum ${rules.segment.maxLength}`);
        }
        
        return result;
    }
    
    // Calculate total path length
    calculatePathLength(path) {
        let totalLength = 0;
        
        for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i-1].x;
            const dy = path[i].y - path[i-1].y;
            totalLength += Math.sqrt(dx * dx + dy * dy);
        }
        
        return totalLength;
    }
    
    // Calculate turn angles at each point
    calculateTurnAngles(path) {
        const angles = [];
        
        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i-1];
            const curr = path[i];
            const next = path[i+1];
            
            const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
            
            let turnAngle = Math.abs(angle2 - angle1);
            if (turnAngle > Math.PI) {
                turnAngle = Math.PI * 2 - turnAngle;
            }
            
            angles.push(turnAngle);
        }
        
        return angles;
    }
    
    // Calculate segment lengths
    calculateSegmentLengths(path) {
        const segments = [];
        
        for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i-1].x;
            const dy = path[i].y - path[i-1].y;
            segments.push(Math.sqrt(dx * dx + dy * dy));
        }
        
        return segments;
    }
    
    // Calculate path complexity
    calculateComplexity(path) {
        const turnAngles = this.calculateTurnAngles(path);
        const segments = this.calculateSegmentLengths(path);
        
        // Complexity based on turn frequency and angle variation
        const avgTurnAngle = turnAngles.reduce((a, b) => a + b, 0) / turnAngles.length;
        const turnVariation = Math.sqrt(turnAngles.reduce((sum, angle) => 
            sum + Math.pow(angle - avgTurnAngle, 2), 0) / turnAngles.length);
        
        // Segment length variation
        const avgSegmentLength = segments.reduce((a, b) => a + b, 0) / segments.length;
        const segmentVariation = Math.sqrt(segments.reduce((sum, length) => 
            sum + Math.pow(length - avgSegmentLength, 2), 0) / segments.length);
        
        // Normalize and combine factors
        const normalizedTurnVariation = Math.min(turnVariation / Math.PI, 1);
        const normalizedSegmentVariation = Math.min(segmentVariation / avgSegmentLength, 1);
        
        return (normalizedTurnVariation + normalizedSegmentVariation) / 2;
    }
    
    // Get maximum turn angle in path
    getMaxTurnAngle(path) {
        const turnAngles = this.calculateTurnAngles(path);
        return turnAngles.length > 0 ? Math.max(...turnAngles) : 0;
    }
    
    // Get minimum segment length in path
    getMinSegmentLength(path) {
        const segments = this.calculateSegmentLengths(path);
        return segments.length > 0 ? Math.min(...segments) : 0;
    }
}

// Path Preview - Generates visual previews of path variations
class PathPreview {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.previewCache = new Map();
    }
    
    // Generate multiple path previews for testing
    async generatePreviews(levelId, levelConfig, options) {
        const previews = [];
        
        for (let i = 0; i < options.variationCount; i++) {
            for (const theme of options.themes) {
                for (const pathMode of options.pathModes) {
                    const preview = await this.generateSinglePreview(
                        levelId, levelConfig, theme, pathMode, i
                    );
                    
                    if (preview) {
                        previews.push(preview);
                    }
                }
            }
        }
        
        return previews.slice(0, options.variationCount * options.themes.length);
    }
    
    // Generate a single path preview
    async generateSinglePreview(levelId, levelConfig, theme, pathMode, variation) {
        try {
            // Create mock path generator configuration
            const mockConfig = {
                ...levelConfig,
                theme,
                pathMode,
                seed: levelId * 1000 + variation * 100
            };
            
            // Generate preview path (simplified version)
            const path = this.generatePreviewPath(mockConfig);
            
            const preview = {
                id: `preview_${levelId}_${theme}_${pathMode}_${variation}`,
                levelId,
                theme,
                pathMode,
                variation,
                path,
                metadata: {
                    pathLength: this.calculatePreviewPathLength(path),
                    complexity: this.calculatePreviewComplexity(path),
                    pointCount: path.length
                },
                generatedAt: Date.now()
            };
            
            return preview;
            
        } catch (error) {
            console.warn(`Failed to generate preview for level ${levelId}:`, error);
            return null;
        }
    }
    
    // Generate a preview path using simplified logic
    generatePreviewPath(config) {
        const path = [];
        const pointCount = 6 + Math.floor(Math.random() * 8); // 6-13 points
        
        // Set deterministic random seed
        let seed = config.seed || 12345;
        const seededRandom = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
        
        // Generate path points
        for (let i = 0; i < pointCount; i++) {
            const progress = i / (pointCount - 1);
            
            // Base path follows a general left-to-right progression
            const baseX = progress * (this.canvasWidth - 100) + 50;
            const baseY = this.canvasHeight / 2;
            
            // Add theme-based variation
            const variation = this.getThemeVariation(config.theme);
            const x = baseX + (seededRandom() - 0.5) * variation.xVariation;
            const y = baseY + (seededRandom() - 0.5) * variation.yVariation;
            
            // Ensure points stay within bounds
            path.push({
                x: Math.max(50, Math.min(this.canvasWidth - 50, x)),
                y: Math.max(50, Math.min(this.canvasHeight - 50, y))
            });
        }
        
        return path;
    }
    
    // Get theme-specific variation parameters
    getThemeVariation(theme) {
        const variations = {
            cyber: { xVariation: 100, yVariation: 150 },
            urban: { xVariation: 120, yVariation: 100 },
            forest: { xVariation: 150, yVariation: 200 },
            mountain: { xVariation: 80, yVariation: 120 }
        };
        
        return variations[theme] || variations.cyber;
    }
    
    // Calculate preview path length
    calculatePreviewPathLength(path) {
        let length = 0;
        for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i-1].x;
            const dy = path[i].y - path[i-1].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return Math.round(length);
    }
    
    // Calculate preview path complexity
    calculatePreviewComplexity(path) {
        if (path.length < 3) return 0;
        
        let totalCurvature = 0;
        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i-1];
            const curr = path[i];
            const next = path[i+1];
            
            const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
            
            let angleDiff = Math.abs(angle2 - angle1);
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
            
            totalCurvature += angleDiff;
        }
        
        return Math.round((totalCurvature / (path.length - 2)) * 100) / 100;
    }
}

// Level Balance Checker - Validates path balance for fair gameplay
class LevelBalanceChecker {
    constructor() {
        this.balanceMetrics = {
            defensiveCoverage: 0.6,
            pathVariety: 0.4,
            difficultyProgression: 0.8,
            strategicOptions: 0.5
        };
    }
    
    // Validate overall balance for a path and level
    validateBalance(path, levelId, levelConfig) {
        const balanceResult = {
            score: 0,
            warnings: [],
            details: {}
        };
        
        try {
            // Calculate individual balance factors
            const defensiveCoverage = this.calculateDefensiveCoverage(path);
            const pathVariety = this.calculatePathVariety(path);
            const difficultyScore = this.calculateDifficultyScore(path, levelId);
            const strategicOptions = this.calculateStrategicOptions(path);
            
            // Store detailed scores
            balanceResult.details = {
                defensiveCoverage,
                pathVariety,
                difficultyScore,
                strategicOptions
            };
            
            // Calculate weighted balance score
            balanceResult.score = (
                defensiveCoverage * 0.3 +
                pathVariety * 0.2 +
                difficultyScore * 0.3 +
                strategicOptions * 0.2
            );
            
            // Generate warnings based on individual scores
            if (defensiveCoverage < 0.5) {
                balanceResult.warnings.push('Low defensive coverage - players may struggle to defend path');
            }
            
            if (pathVariety < 0.3) {
                balanceResult.warnings.push('Low path variety - may become repetitive');
            }
            
            if (difficultyScore < 0.4 || difficultyScore > 0.9) {
                balanceResult.warnings.push('Difficulty may not match level progression');
            }
            
            if (strategicOptions < 0.4) {
                balanceResult.warnings.push('Limited strategic options for defense placement');
            }
            
        } catch (error) {
            balanceResult.warnings.push(`Balance calculation error: ${error.message}`);
        }
        
        return balanceResult;
    }
    
    // Calculate how well the path can be defended
    calculateDefensiveCoverage(path) {
        if (path.length < 2) return 0;
        
        let totalCoverage = 0;
        const segmentCount = path.length - 1;
        
        for (let i = 0; i < segmentCount; i++) {
            const segment = {
                start: path[i],
                end: path[i + 1]
            };
            
            // Calculate coverage based on segment properties
            const segmentLength = Math.sqrt(
                Math.pow(segment.end.x - segment.start.x, 2) + 
                Math.pow(segment.end.y - segment.start.y, 2)
            );
            
            // Shorter segments are easier to defend
            const lengthFactor = Math.max(0, 1 - segmentLength / 200);
            
            // Segments closer to edges provide more defense options
            const edgeDistance = Math.min(
                segment.start.x, segment.start.y,
                1200 - segment.start.x, 600 - segment.start.y
            );
            const edgeFactor = Math.max(0, 1 - edgeDistance / 100);
            
            totalCoverage += (lengthFactor + edgeFactor) / 2;
        }
        
        return Math.min(1, totalCoverage / segmentCount);
    }
    
    // Calculate path variety and interest
    calculatePathVariety(path) {
        if (path.length < 3) return 0;
        
        // Calculate turn variation
        const turnAngles = [];
        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i-1];
            const curr = path[i];
            const next = path[i+1];
            
            const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
            
            let turnAngle = Math.abs(angle2 - angle1);
            if (turnAngle > Math.PI) turnAngle = Math.PI * 2 - turnAngle;
            
            turnAngles.push(turnAngle);
        }
        
        // Calculate variety based on turn angle distribution
        const avgTurnAngle = turnAngles.reduce((a, b) => a + b, 0) / turnAngles.length;
        const turnVariation = Math.sqrt(turnAngles.reduce((sum, angle) => 
            sum + Math.pow(angle - avgTurnAngle, 2), 0) / turnAngles.length);
        
        // Normalize variety score
        return Math.min(1, turnVariation / (Math.PI / 4));
    }
    
    // Calculate if difficulty matches level progression
    calculateDifficultyScore(path, levelId) {
        const targetDifficulty = 0.3 + (levelId - 1) * 0.08;
        const pathComplexity = this.calculatePathComplexity(path);
        
        // Score based on how close actual complexity is to target
        const difficultyDifference = Math.abs(pathComplexity - targetDifficulty);
        return Math.max(0, 1 - difficultyDifference * 2);
    }
    
    // Calculate strategic defense options
    calculateStrategicOptions(path) {
        if (path.length < 2) return 0;
        
        let strategicValue = 0;
        
        // Count choke points (narrow areas)
        let chokePoints = 0;
        // Count open areas (wide spacing)
        let openAreas = 0;
        
        for (let i = 0; i < path.length; i++) {
            const point = path[i];
            
            // Check proximity to edges (affects placement options)
            const edgeDistance = Math.min(
                point.x, point.y,
                1200 - point.x, 600 - point.y
            );
            
            if (edgeDistance < 80) {
                chokePoints++;
            } else if (edgeDistance > 150) {
                openAreas++;
            }
        }
        
        // Balance between choke points and open areas
        const chokeRatio = chokePoints / path.length;
        const openRatio = openAreas / path.length;
        
        // Optimal balance is around 30% choke points, 40% open areas
        const chokeScore = 1 - Math.abs(chokeRatio - 0.3) * 2;
        const openScore = 1 - Math.abs(openRatio - 0.4) * 2;
        
        return Math.max(0, (chokeScore + openScore) / 2);
    }
    
    // Calculate path complexity for difficulty assessment
    calculatePathComplexity(path) {
        if (path.length < 3) return 0;
        
        let complexity = 0;
        
        // Factor 1: Path length relative to canvas size
        const pathLength = this.calculateTotalLength(path);
        const maxPossibleLength = Math.sqrt(1200 * 1200 + 600 * 600);
        const lengthComplexity = pathLength / maxPossibleLength;
        
        // Factor 2: Turn frequency and sharpness
        let totalTurnAngle = 0;
        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i-1];
            const curr = path[i];
            const next = path[i+1];
            
            const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
            
            let turnAngle = Math.abs(angle2 - angle1);
            if (turnAngle > Math.PI) turnAngle = Math.PI * 2 - turnAngle;
            
            totalTurnAngle += turnAngle;
        }
        
        const avgTurnAngle = totalTurnAngle / (path.length - 2);
        const turnComplexity = avgTurnAngle / Math.PI;
        
        // Combine factors
        complexity = (lengthComplexity * 0.4 + turnComplexity * 0.6);
        
        return Math.min(1, complexity);
    }
    
    // Calculate total path length
    calculateTotalLength(path) {
        let length = 0;
        for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i-1].x;
            const dy = path[i].y - path[i-1].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }
        return length;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LevelPathPreservation, PathValidator, PathPreview, LevelBalanceChecker };
}
