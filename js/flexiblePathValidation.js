// Dharmapala Shield - Flexible Path Validation System
//
// This system provides flexible path validation with:
// 1. Configurable validation parameters per level/theme
// 2. Different validation profiles for different gameplay styles
// 3. Override options for creative level designs
// 4. Validation warnings instead of hard failures for borderline cases
//
// Features:
// - Multiple validation profiles (Strict, Balanced, Creative, Experimental)
// - Per-level parameter customization
// - Theme-specific validation rules
// - Warning-based validation with severity levels
// - Override system for creative freedom
// - Fallback mechanisms for edge cases

class FlexiblePathValidation {
    constructor() {
        this.validationProfiles = {};
        this.levelOverrides = new Map();
        this.themeAdjustments = new Map();
        this.validationHistory = [];
        
        // Initialize validation profiles
        this.initializeValidationProfiles();
        this.initializeThemeAdjustments();
        
        // Statistics tracking
        this.validationStats = {
            totalValidations: 0,
            warningsGenerated: 0,
            hardFailures: 0,
            overridesUsed: 0,
            profileUsage: {}
        };
        
        console.log('FlexiblePathValidation system initialized with', Object.keys(this.validationProfiles).length, 'profiles');
    }
    
    // Initialize different validation profiles for various gameplay styles
    initializeValidationProfiles() {
        // STRICT PROFILE - For competitive/balanced gameplay
        this.validationProfiles.strict = {
            name: 'Strict Validation',
            description: 'Rigorous constraints for competitive balance',
            failureMode: 'hard', // hard failures on violations
            constraints: {
                pathLength: {
                    min: 350,
                    max: 1000,
                    warningThreshold: 50
                },
                turnAngle: {
                    max: Math.PI * 0.6, // 108 degrees
                    sharpTurnLimit: 2,
                    consecutiveSharpTurns: 1,
                    warningAngle: Math.PI * 0.5 // 90 degrees
                },
                segment: {
                    minLength: 60,
                    maxLength: 250,
                    consistencyRatio: 0.2,
                    variationTolerance: 0.15
                },
                complexity: {
                    maxComplexity: 0.7,
                    balanceThreshold: 0.85,
                    minVariety: 0.4
                },
                performance: {
                    maxValidationTime: 5, // ms
                    retryLimit: 2
                }
            },
            weights: {
                structure: 0.3,
                balance: 0.4,
                performance: 0.2,
                creativity: 0.1
            }
        };
        
        // BALANCED PROFILE - Default for most gameplay
        this.validationProfiles.balanced = {
            name: 'Balanced Validation',
            description: 'Moderate constraints with flexibility',
            failureMode: 'warning', // warnings instead of hard failures
            constraints: {
                pathLength: {
                    min: 300,
                    max: 1200,
                    warningThreshold: 100
                },
                turnAngle: {
                    max: Math.PI * 0.75, // 135 degrees
                    sharpTurnLimit: 3,
                    consecutiveSharpTurns: 2,
                    warningAngle: Math.PI * 0.6 // 108 degrees
                },
                segment: {
                    minLength: 40,
                    maxLength: 300,
                    consistencyRatio: 0.3,
                    variationTolerance: 0.25
                },
                complexity: {
                    maxComplexity: 0.8,
                    balanceThreshold: 0.7,
                    minVariety: 0.3
                },
                performance: {
                    maxValidationTime: 10, // ms
                    retryLimit: 3
                }
            },
            weights: {
                structure: 0.25,
                balance: 0.3,
                performance: 0.2,
                creativity: 0.25
            }
        };
        
        // CREATIVE PROFILE - For experimental/artistic designs
        this.validationProfiles.creative = {
            name: 'Creative Validation',
            description: 'Relaxed constraints for creative freedom',
            failureMode: 'advisory', // only advisory warnings
            constraints: {
                pathLength: {
                    min: 200,
                    max: 1500,
                    warningThreshold: 150
                },
                turnAngle: {
                    max: Math.PI * 0.9, // 162 degrees
                    sharpTurnLimit: 5,
                    consecutiveSharpTurns: 3,
                    warningAngle: Math.PI * 0.8 // 144 degrees
                },
                segment: {
                    minLength: 20,
                    maxLength: 400,
                    consistencyRatio: 0.5,
                    variationTolerance: 0.4
                },
                complexity: {
                    maxComplexity: 0.95,
                    balanceThreshold: 0.5,
                    minVariety: 0.2
                },
                performance: {
                    maxValidationTime: 15, // ms
                    retryLimit: 5
                }
            },
            weights: {
                structure: 0.15,
                balance: 0.2,
                performance: 0.15,
                creativity: 0.5
            }
        };
        
        // EXPERIMENTAL PROFILE - For testing and prototyping
        this.validationProfiles.experimental = {
            name: 'Experimental Validation',
            description: 'Minimal constraints for testing new concepts',
            failureMode: 'permissive', // only critical safety checks
            constraints: {
                pathLength: {
                    min: 100,
                    max: 2000,
                    warningThreshold: 200
                },
                turnAngle: {
                    max: Math.PI * 0.95, // 171 degrees
                    sharpTurnLimit: 10,
                    consecutiveSharpTurns: 5,
                    warningAngle: Math.PI * 0.9 // 162 degrees
                },
                segment: {
                    minLength: 10,
                    maxLength: 500,
                    consistencyRatio: 0.8,
                    variationTolerance: 0.6
                },
                complexity: {
                    maxComplexity: 1.0,
                    balanceThreshold: 0.3,
                    minVariety: 0.1
                },
                performance: {
                    maxValidationTime: 25, // ms
                    retryLimit: 10
                }
            },
            weights: {
                structure: 0.1,
                balance: 0.1,
                performance: 0.1,
                creativity: 0.7
            }
        };
        
        // TUTORIAL PROFILE - For learning and onboarding
        this.validationProfiles.tutorial = {
            name: 'Tutorial Validation',
            description: 'Simple, predictable constraints for learning',
            failureMode: 'guided', // provides helpful guidance
            constraints: {
                pathLength: {
                    min: 250,
                    max: 800,
                    warningThreshold: 75
                },
                turnAngle: {
                    max: Math.PI * 0.5, // 90 degrees
                    sharpTurnLimit: 1,
                    consecutiveSharpTurns: 0,
                    warningAngle: Math.PI * 0.4 // 72 degrees
                },
                segment: {
                    minLength: 80,
                    maxLength: 200,
                    consistencyRatio: 0.15,
                    variationTolerance: 0.1
                },
                complexity: {
                    maxComplexity: 0.4,
                    balanceThreshold: 0.9,
                    minVariety: 0.2
                },
                performance: {
                    maxValidationTime: 3, // ms
                    retryLimit: 1
                }
            },
            weights: {
                structure: 0.4,
                balance: 0.4,
                performance: 0.15,
                creativity: 0.05
            }
        };
        
        // Initialize usage tracking
        Object.keys(this.validationProfiles).forEach(profile => {
            this.validationStats.profileUsage[profile] = 0;
        });
    }
    
    // Initialize theme-specific validation adjustments
    initializeThemeAdjustments() {
        // Cyber theme - Geometric, precise paths
        this.themeAdjustments.set('cyber', {
            constraints: {
                segment: {
                    consistencyRatio: -0.1, // More consistent segments
                    minLength: 10 // Slightly longer segments
                },
                turnAngle: {
                    max: -0.1, // Slightly sharper turns allowed
                    sharpTurnLimit: 1 // One extra sharp turn
                }
            },
            complexity: {
                preferredRange: [0.3, 0.7], // Moderate complexity
                geometricBonus: 0.1 // Bonus for geometric patterns
            }
        });
        
        // Urban theme - Varied, street-like paths
        this.themeAdjustments.set('urban', {
            constraints: {
                segment: {
                    variationTolerance: 0.1, // More segment variation
                    consistencyRatio: 0.05 // Less consistency required
                },
                turnAngle: {
                    sharpTurnLimit: 1, // Extra sharp turns for streets
                    consecutiveSharpTurns: 1
                }
            },
            complexity: {
                preferredRange: [0.4, 0.8], // Higher complexity
                streetPatternBonus: 0.15 // Bonus for street-like patterns
            }
        });
        
        // Forest theme - Organic, flowing paths
        this.themeAdjustments.set('forest', {
            constraints: {
                segment: {
                    variationTolerance: 0.15, // High variation tolerance
                    consistencyRatio: 0.1 // More organic variation
                },
                turnAngle: {
                    max: 0.1, // More flowing turns
                    warningAngle: 0.15
                }
            },
            complexity: {
                preferredRange: [0.5, 0.9], // High complexity range
                organicBonus: 0.2 // Bonus for organic flow
            }
        });
        
        // Mountain theme - Challenging, winding paths
        this.themeAdjustments.set('mountain', {
            constraints: {
                pathLength: {
                    min: 50, // Longer paths
                    warningThreshold: 25
                },
                turnAngle: {
                    sharpTurnLimit: 2, // More sharp turns for switchbacks
                    consecutiveSharpTurns: 1
                }
            },
            complexity: {
                preferredRange: [0.6, 0.95], // High complexity
                elevationBonus: 0.25 // Bonus for elevation changes
            }
        });
    }
    
    // Get validation profile with level and theme adjustments
    getValidationProfile(profileName, levelId = null, theme = null) {
        const baseProfile = this.validationProfiles[profileName];
        if (!baseProfile) {
            console.warn(`Unknown validation profile: ${profileName}, using balanced`);
            return this.getValidationProfile('balanced', levelId, theme);
        }
        
        // Create a deep copy to avoid modifying the original
        const profile = JSON.parse(JSON.stringify(baseProfile));
        
        // Apply level-specific overrides
        if (levelId && this.levelOverrides.has(levelId)) {
            const overrides = this.levelOverrides.get(levelId);
            this.applyOverrides(profile, overrides);
        }
        
        // Apply theme adjustments
        if (theme && this.themeAdjustments.has(theme)) {
            const adjustments = this.themeAdjustments.get(theme);
            this.applyThemeAdjustments(profile, adjustments);
        }
        
        return profile;
    }
    
    // Apply parameter overrides to a profile
    applyOverrides(profile, overrides) {
        for (const [section, sectionOverrides] of Object.entries(overrides)) {
            if (profile.constraints[section]) {
                for (const [param, value] of Object.entries(sectionOverrides)) {
                    if (typeof value === 'object' && value.operation) {
                        // Handle operations like multiply, add, etc.
                        const current = profile.constraints[section][param];
                        switch (value.operation) {
                            case 'multiply':
                                profile.constraints[section][param] = current * value.value;
                                break;
                            case 'add':
                                profile.constraints[section][param] = current + value.value;
                                break;
                            case 'set':
                                profile.constraints[section][param] = value.value;
                                break;
                        }
                    } else {
                        profile.constraints[section][param] = value;
                    }
                }
            }
        }
    }
    
    // Apply theme-specific adjustments
    applyThemeAdjustments(profile, adjustments) {
        if (adjustments.constraints) {
            for (const [section, sectionAdjustments] of Object.entries(adjustments.constraints)) {
                if (profile.constraints[section]) {
                    for (const [param, adjustment] of Object.entries(sectionAdjustments)) {
                        if (typeof adjustment === 'number') {
                            // Relative adjustment
                            profile.constraints[section][param] += adjustment;
                        }
                    }
                }
            }
        }
    }
    
    // Set level-specific override parameters
    setLevelOverride(levelId, overrides) {
        this.levelOverrides.set(levelId, overrides);
        console.log(`Set validation override for level ${levelId}:`, overrides);
    }
    
    // Remove level override
    removeLevelOverride(levelId) {
        this.levelOverrides.delete(levelId);
        console.log(`Removed validation override for level ${levelId}`);
    }
    
    // Validate path with flexible profile system
    validatePath(path, options = {}) {
        const startTime = performance.now();
        
        // Extract options with defaults
        const {
            profileName = 'balanced',
            levelId = null,
            theme = null,
            allowOverrides = true,
            generateRecommendations = true,
            trackHistory = true
        } = options;
        
        // Get appropriate validation profile
        const profile = this.getValidationProfile(profileName, levelId, theme);
        
        // Initialize validation result
        const result = {
            isValid: true,
            severity: 'none', // none, info, warning, error, critical
            warnings: [],
            errors: [],
            criticalIssues: [],
            recommendations: [],
            metrics: {},
            profile: profileName,
            overridesApplied: allowOverrides && (this.levelOverrides.has(levelId) || theme),
            validationTime: 0
        };
        
        try {
            // Update statistics
            this.validationStats.totalValidations++;
            this.validationStats.profileUsage[profileName]++;
            
            // Perform validation checks
            this.validatePathStructure(path, profile, result);
            this.validatePathLength(path, profile, result);
            this.validateTurnAngles(path, profile, result);
            this.validateSegments(path, profile, result);
            this.validateComplexity(path, profile, result);
            
            // Determine overall validity based on failure mode
            this.determineValidityByFailureMode(profile, result);
            
            // Generate recommendations if requested
            if (generateRecommendations) {
                this.generateValidationRecommendations(path, profile, result);
            }
            
            // Calculate metrics
            this.calculateValidationMetrics(path, profile, result);
            
        } catch (error) {
            result.isValid = false;
            result.severity = 'critical';
            result.criticalIssues.push(`Validation error: ${error.message}`);
        }
        
        // Record timing and history
        result.validationTime = performance.now() - startTime;
        
        if (trackHistory) {
            this.validationHistory.push({
                timestamp: Date.now(),
                levelId,
                theme,
                profile: profileName,
                result: {
                    isValid: result.isValid,
                    severity: result.severity,
                    warningCount: result.warnings.length,
                    errorCount: result.errors.length,
                    validationTime: result.validationTime
                }
            });
        }
        
        return result;
    }
    
    // Validate basic path structure
    validatePathStructure(path, profile, result) {
        if (!path || !Array.isArray(path)) {
            result.criticalIssues.push('Invalid path structure - path must be an array');
            return;
        }
        
        if (path.length < 2) {
            result.criticalIssues.push('Path must contain at least 2 points');
            return;
        }
        
        // Check for valid point structure
        for (let i = 0; i < path.length; i++) {
            const point = path[i];
            if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
                result.errors.push(`Invalid point structure at index ${i}`);
            }
            
            if (isNaN(point.x) || isNaN(point.y)) {
                result.errors.push(`NaN coordinates at point ${i}`);
            }
        }
    }
    
    // Validate path length constraints
    validatePathLength(path, profile, result) {
        const totalLength = this.calculatePathLength(path);
        const constraints = profile.constraints.pathLength;
        
        if (totalLength < constraints.min) {
            const severity = profile.failureMode === 'hard' ? 'error' : 'warning';
            const message = `Path length ${totalLength.toFixed(1)} below minimum ${constraints.min}`;
            
            if (severity === 'error') {
                result.errors.push(message);
            } else {
                result.warnings.push(message);
            }
        }
        
        if (totalLength > constraints.max) {
            const severity = profile.failureMode === 'hard' ? 'error' : 'warning';
            const message = `Path length ${totalLength.toFixed(1)} exceeds maximum ${constraints.max}`;
            
            if (severity === 'error') {
                result.errors.push(message);
            } else {
                result.warnings.push(message);
            }
        }
        
        // Warning threshold checks
        if (Math.abs(totalLength - constraints.min) < constraints.warningThreshold ||
            Math.abs(totalLength - constraints.max) < constraints.warningThreshold) {
            result.warnings.push(`Path length ${totalLength.toFixed(1)} near constraint boundary`);
        }
        
        result.metrics.pathLength = totalLength;
    }
    
    // Validate turn angle constraints
    validateTurnAngles(path, profile, result) {
        const turnAngles = this.calculateTurnAngles(path);
        const constraints = profile.constraints.turnAngle;
        
        let sharpTurnCount = 0;
        let consecutiveSharpTurns = 0;
        let maxConsecutive = 0;
        
        for (let i = 0; i < turnAngles.length; i++) {
            const angle = turnAngles[i];
            
            // Check maximum turn angle
            if (angle > constraints.max) {
                const severity = profile.failureMode === 'hard' ? 'error' : 'warning';
                const message = `Sharp turn ${angle.toFixed(2)} rad at point ${i + 1} exceeds limit ${constraints.max.toFixed(2)}`;
                
                if (severity === 'error') {
                    result.errors.push(message);
                } else {
                    result.warnings.push(message);
                }
            }
            
            // Count sharp turns
            const isSharpTurn = angle > Math.PI / 2;
            if (isSharpTurn) {
                sharpTurnCount++;
                consecutiveSharpTurns++;
                maxConsecutive = Math.max(maxConsecutive, consecutiveSharpTurns);
            } else {
                consecutiveSharpTurns = 0;
            }
            
            // Warning for approaching sharp angles
            if (angle > constraints.warningAngle && angle <= constraints.max) {
                result.warnings.push(`Approaching sharp turn ${angle.toFixed(2)} rad at point ${i + 1}`);
            }
        }
        
        // Check sharp turn limits
        if (sharpTurnCount > constraints.sharpTurnLimit) {
            const severity = profile.failureMode === 'hard' ? 'error' : 'warning';
            const message = `Too many sharp turns: ${sharpTurnCount} (limit: ${constraints.sharpTurnLimit})`;
            
            if (severity === 'error') {
                result.errors.push(message);
            } else {
                result.warnings.push(message);
            }
        }
        
        if (maxConsecutive > constraints.consecutiveSharpTurns) {
            const severity = profile.failureMode === 'hard' ? 'error' : 'warning';
            const message = `Too many consecutive sharp turns: ${maxConsecutive} (limit: ${constraints.consecutiveSharpTurns})`;
            
            if (severity === 'error') {
                result.errors.push(message);
            } else {
                result.warnings.push(message);
            }
        }
        
        result.metrics.maxTurnAngle = Math.max(...turnAngles);
        result.metrics.sharpTurnCount = sharpTurnCount;
        result.metrics.avgTurnAngle = turnAngles.reduce((a, b) => a + b, 0) / turnAngles.length;
    }
    
    // Validate segment constraints
    validateSegments(path, profile, result) {
        const segments = this.calculateSegmentLengths(path);
        const constraints = profile.constraints.segment;
        
        let tooShortCount = 0;
        let tooLongCount = 0;
        
        for (let i = 0; i < segments.length; i++) {
            const length = segments[i];
            
            if (length < constraints.minLength) {
                tooShortCount++;
                if (profile.failureMode === 'hard') {
                    result.errors.push(`Segment ${i} too short: ${length.toFixed(1)} (min: ${constraints.minLength})`);
                } else {
                    result.warnings.push(`Short segment ${i}: ${length.toFixed(1)} (min: ${constraints.minLength})`);
                }
            }
            
            if (length > constraints.maxLength) {
                tooLongCount++;
                if (profile.failureMode === 'hard') {
                    result.errors.push(`Segment ${i} too long: ${length.toFixed(1)} (max: ${constraints.maxLength})`);
                } else {
                    result.warnings.push(`Long segment ${i}: ${length.toFixed(1)} (max: ${constraints.maxLength})`);
                }
            }
        }
        
        // Check segment consistency
        if (segments.length > 1) {
            const minLength = Math.min(...segments);
            const maxLength = Math.max(...segments);
            const ratio = (maxLength - minLength) / minLength;
            
            if (ratio > constraints.consistencyRatio) {
                const severity = profile.failureMode === 'hard' ? 'error' : 'warning';
                const message = `High segment variation ratio: ${ratio.toFixed(2)} (limit: ${constraints.consistencyRatio.toFixed(2)})`;
                
                if (severity === 'error') {
                    result.errors.push(message);
                } else {
                    result.warnings.push(message);
                }
            }
        }
        
        result.metrics.minSegmentLength = Math.min(...segments);
        result.metrics.maxSegmentLength = Math.max(...segments);
        result.metrics.avgSegmentLength = segments.reduce((a, b) => a + b, 0) / segments.length;
        result.metrics.segmentVariation = segments.length > 1 ? 
            Math.sqrt(segments.reduce((sum, len) => {
                const avg = result.metrics.avgSegmentLength;
                return sum + Math.pow(len - avg, 2);
            }, 0) / segments.length) / result.metrics.avgSegmentLength : 0;
    }
    
    // Validate complexity constraints
    validateComplexity(path, profile, result) {
        const complexity = this.calculatePathComplexity(path);
        const constraints = profile.constraints.complexity;
        
        if (complexity > constraints.maxComplexity) {
            const severity = profile.failureMode === 'hard' ? 'error' : 'warning';
            const message = `Path complexity ${complexity.toFixed(2)} exceeds limit ${constraints.maxComplexity.toFixed(2)}`;
            
            if (severity === 'error') {
                result.errors.push(message);
            } else {
                result.warnings.push(message);
            }
        }
        
        if (complexity < constraints.minVariety) {
            result.warnings.push(`Low path variety: ${complexity.toFixed(2)} (suggested minimum: ${constraints.minVariety.toFixed(2)})`);
        }
        
        result.metrics.complexity = complexity;
    }
    
    // Determine overall validity based on failure mode
    determineValidityByFailureMode(profile, result) {
        switch (profile.failureMode) {
            case 'hard':
                result.isValid = result.errors.length === 0 && result.criticalIssues.length === 0;
                if (!result.isValid) {
                    result.severity = result.criticalIssues.length > 0 ? 'critical' : 'error';
                    this.validationStats.hardFailures++;
                }
                break;
                
            case 'warning':
                result.isValid = result.criticalIssues.length === 0;
                if (result.errors.length > 0) {
                    result.severity = 'warning';
                    this.validationStats.warningsGenerated++;
                }
                break;
                
            case 'advisory':
                result.isValid = result.criticalIssues.length === 0;
                result.severity = result.warnings.length > 0 ? 'info' : 'none';
                break;
                
            case 'permissive':
                result.isValid = result.criticalIssues.length === 0;
                result.severity = 'info';
                break;
                
            case 'guided':
                result.isValid = result.criticalIssues.length === 0;
                if (result.errors.length > 0 || result.warnings.length > 0) {
                    result.severity = 'info';
                    // Convert errors to helpful guidance
                    result.guidance = result.errors.map(error => 
                        `Guidance: ${error.replace('error', 'consider improving')}`
                    );
                }
                break;
        }
    }
    
    // Generate context-aware recommendations
    generateValidationRecommendations(path, profile, result) {
        const recommendations = [];
        
        // Path length recommendations
        if (result.metrics.pathLength < profile.constraints.pathLength.min * 1.2) {
            recommendations.push({
                type: 'improvement',
                priority: 'medium',
                message: 'Consider adding more waypoints to increase path length',
                category: 'structure'
            });
        }
        
        // Turn angle recommendations
        if (result.metrics.sharpTurnCount > 0) {
            recommendations.push({
                type: 'balance',
                priority: 'low',
                message: `Path has ${result.metrics.sharpTurnCount} sharp turns - consider smoothing for better flow`,
                category: 'geometry'
            });
        }
        
        // Complexity recommendations
        if (result.metrics.complexity < 0.3) {
            recommendations.push({
                type: 'enhancement',
                priority: 'low',
                message: 'Path may be too simple - consider adding strategic variety',
                category: 'gameplay'
            });
        } else if (result.metrics.complexity > 0.8) {
            recommendations.push({
                type: 'optimization',
                priority: 'medium',
                message: 'High complexity path - ensure it matches intended difficulty',
                category: 'balance'
            });
        }
        
        // Profile-specific recommendations
        if (profile.name === 'Tutorial Validation' && result.warnings.length > 0) {
            recommendations.push({
                type: 'tutorial',
                priority: 'high',
                message: 'Tutorial paths should be simple and predictable',
                category: 'learning'
            });
        }
        
        result.recommendations = recommendations;
    }
    
    // Calculate comprehensive validation metrics
    calculateValidationMetrics(path, profile, result) {
        // Overall score based on profile weights
        const weights = profile.weights;
        let overallScore = 0;
        
        // Structure score (0-1)
        const structureScore = result.criticalIssues.length === 0 ? 1 : 0;
        
        // Balance score (based on complexity and variety)
        const balanceScore = Math.min(1, result.metrics.complexity / 0.7);
        
        // Performance score (based on validation time)
        const performanceScore = Math.min(1, profile.constraints.performance.maxValidationTime / Math.max(1, result.validationTime));
        
        // Creativity score (based on path variety and uniqueness)
        const creativityScore = Math.min(1, result.metrics.complexity * 1.2);
        
        overallScore = (
            structureScore * weights.structure +
            balanceScore * weights.balance +
            performanceScore * weights.performance +
            creativityScore * weights.creativity
        );
        
        result.metrics.overallScore = overallScore;
        result.metrics.structureScore = structureScore;
        result.metrics.balanceScore = balanceScore;
        result.metrics.performanceScore = performanceScore;
        result.metrics.creativityScore = creativityScore;
    }
    
    // Utility method to calculate path length
    calculatePathLength(path) {
        let totalLength = 0;
        for (let i = 0; i < path.length - 1; i++) {
            const dx = path[i + 1].x - path[i].x;
            const dy = path[i + 1].y - path[i].y;
            totalLength += Math.sqrt(dx * dx + dy * dy);
        }
        return totalLength;
    }
    
    // Utility method to calculate turn angles
    calculateTurnAngles(path) {
        const angles = [];
        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i - 1];
            const current = path[i];
            const next = path[i + 1];
            
            const angle1 = Math.atan2(current.y - prev.y, current.x - prev.x);
            const angle2 = Math.atan2(next.y - current.y, next.x - current.x);
            
            let turnAngle = Math.abs(angle2 - angle1);
            if (turnAngle > Math.PI) {
                turnAngle = Math.PI * 2 - turnAngle;
            }
            
            angles.push(turnAngle);
        }
        return angles;
    }
    
    // Utility method to calculate segment lengths
    calculateSegmentLengths(path) {
        const lengths = [];
        for (let i = 0; i < path.length - 1; i++) {
            const dx = path[i + 1].x - path[i].x;
            const dy = path[i + 1].y - path[i].y;
            lengths.push(Math.sqrt(dx * dx + dy * dy));
        }
        return lengths;
    }
    
    // Utility method to calculate path complexity
    calculatePathComplexity(path) {
        if (path.length < 3) return 0;
        
        const turnAngles = this.calculateTurnAngles(path);
        const segments = this.calculateSegmentLengths(path);
        
        // Calculate turn variation
        const avgTurnAngle = turnAngles.reduce((a, b) => a + b, 0) / turnAngles.length;
        const turnVariation = Math.sqrt(
            turnAngles.reduce((sum, angle) => sum + Math.pow(angle - avgTurnAngle, 2), 0) / turnAngles.length
        ) / (Math.PI / 4);
        
        // Calculate segment variation
        const avgSegmentLength = segments.reduce((a, b) => a + b, 0) / segments.length;
        const segmentVariation = Math.sqrt(
            segments.reduce((sum, length) => sum + Math.pow(length - avgSegmentLength, 2), 0) / segments.length
        ) / avgSegmentLength;
        
        // Combine variations for complexity score
        return Math.min(1, (turnVariation * 0.6) + (segmentVariation * 0.4));
    }
    
    // Get validation statistics
    getValidationStats() {
        return {
            ...this.validationStats,
            successRate: this.validationStats.totalValidations > 0 ? 
                1 - (this.validationStats.hardFailures / this.validationStats.totalValidations) : 0,
            warningRate: this.validationStats.totalValidations > 0 ? 
                this.validationStats.warningsGenerated / this.validationStats.totalValidations : 0
        };
    }
    
    // Get validation history
    getValidationHistory(limit = 50) {
        return this.validationHistory.slice(-limit);
    }
    
    // Export validation configuration
    exportConfiguration() {
        return {
            profiles: this.validationProfiles,
            levelOverrides: Object.fromEntries(this.levelOverrides),
            themeAdjustments: Object.fromEntries(this.themeAdjustments),
            stats: this.getValidationStats()
        };
    }
    
    // Import validation configuration
    importConfiguration(config) {
        if (config.profiles) {
            this.validationProfiles = { ...this.validationProfiles, ...config.profiles };
        }
        
        if (config.levelOverrides) {
            this.levelOverrides = new Map(Object.entries(config.levelOverrides));
        }
        
        if (config.themeAdjustments) {
            this.themeAdjustments = new Map(Object.entries(config.themeAdjustments));
        }
        
        console.log('Validation configuration imported successfully');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlexiblePathValidation;
}
