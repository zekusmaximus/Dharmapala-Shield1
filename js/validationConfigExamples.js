// Dharmapala Shield - Flexible Path Validation Configuration Examples
//
// This file contains example configurations for different gameplay scenarios
// demonstrating the flexibility of the path validation system

// Configuration Examples for Different Use Cases

const VALIDATION_CONFIG_EXAMPLES = {
    
    // Example 1: Tournament/Competitive Mode
    // Strict validation for fair competitive play
    tournament_mode: {
        profiles: {
            tournament: {
                name: 'Tournament Validation',
                description: 'Ultra-strict validation for competitive balance',
                failureMode: 'hard',
                constraints: {
                    pathLength: {
                        min: 400,
                        max: 800,
                        warningThreshold: 25
                    },
                    turnAngle: {
                        max: Math.PI * 0.5, // 90 degrees max
                        sharpTurnLimit: 1,
                        consecutiveSharpTurns: 0,
                        warningAngle: Math.PI * 0.4
                    },
                    segment: {
                        minLength: 70,
                        maxLength: 200,
                        consistencyRatio: 0.15,
                        variationTolerance: 0.1
                    },
                    complexity: {
                        maxComplexity: 0.6,
                        balanceThreshold: 0.9,
                        minVariety: 0.4
                    },
                    performance: {
                        maxValidationTime: 3,
                        retryLimit: 1
                    }
                },
                weights: {
                    structure: 0.4,
                    balance: 0.4,
                    performance: 0.15,
                    creativity: 0.05
                }
            }
        },
        levelOverrides: {
            // All levels use strict tournament rules
            1: { pathLength: { min: 350, max: 600 } },
            2: { pathLength: { min: 350, max: 600 } },
            3: { pathLength: { min: 400, max: 700 } },
            // ... continues for all levels
        }
    },
    
    // Example 2: Creative Sandbox Mode
    // Relaxed validation for experimental designs
    creative_sandbox: {
        profiles: {
            sandbox: {
                name: 'Sandbox Validation',
                description: 'Minimal constraints for creative freedom',
                failureMode: 'advisory',
                constraints: {
                    pathLength: {
                        min: 100,
                        max: 2500,
                        warningThreshold: 300
                    },
                    turnAngle: {
                        max: Math.PI * 0.98, // Almost any turn allowed
                        sharpTurnLimit: 15,
                        consecutiveSharpTurns: 8,
                        warningAngle: Math.PI * 0.9
                    },
                    segment: {
                        minLength: 5,
                        maxLength: 800,
                        consistencyRatio: 1.0,
                        variationTolerance: 0.8
                    },
                    complexity: {
                        maxComplexity: 1.0,
                        balanceThreshold: 0.2,
                        minVariety: 0.05
                    },
                    performance: {
                        maxValidationTime: 50,
                        retryLimit: 20
                    }
                },
                weights: {
                    structure: 0.05,
                    balance: 0.1,
                    performance: 0.05,
                    creativity: 0.8
                }
            }
        },
        levelOverrides: {
            // Creative levels have even more freedom
            21: { 
                pathLength: { min: 50, max: 3000 },
                turnAngle: { max: Math.PI * 0.99, sharpTurnLimit: 25 },
                complexity: { maxComplexity: 1.0 }
            },
            22: {
                pathLength: { min: 50, max: 3000 },
                turnAngle: { max: Math.PI * 0.99, sharpTurnLimit: 25 },
                complexity: { maxComplexity: 1.0 }
            }
        }
    },
    
    // Example 3: Accessibility Mode
    // Gentler validation for accessibility needs
    accessibility_mode: {
        profiles: {
            accessible: {
                name: 'Accessible Validation',
                description: 'Forgiving validation for accessibility',
                failureMode: 'guided',
                constraints: {
                    pathLength: {
                        min: 250,
                        max: 1000,
                        warningThreshold: 100
                    },
                    turnAngle: {
                        max: Math.PI * 0.7,
                        sharpTurnLimit: 4,
                        consecutiveSharpTurns: 2,
                        warningAngle: Math.PI * 0.6
                    },
                    segment: {
                        minLength: 50,
                        maxLength: 250,
                        consistencyRatio: 0.4,
                        variationTolerance: 0.3
                    },
                    complexity: {
                        maxComplexity: 0.7,
                        balanceThreshold: 0.6,
                        minVariety: 0.25
                    },
                    performance: {
                        maxValidationTime: 15,
                        retryLimit: 5
                    }
                },
                weights: {
                    structure: 0.3,
                    balance: 0.35,
                    performance: 0.2,
                    creativity: 0.15
                }
            }
        },
        levelOverrides: {
            // Early levels are extra forgiving
            1: { 
                pathLength: { min: 200, max: 600 },
                turnAngle: { max: Math.PI * 0.4, sharpTurnLimit: 1 },
                complexity: { maxComplexity: 0.3 }
            },
            2: {
                pathLength: { min: 200, max: 650 },
                turnAngle: { max: Math.PI * 0.5, sharpTurnLimit: 1 },
                complexity: { maxComplexity: 0.35 }
            }
        }
    },
    
    // Example 4: Speedrun Mode
    // Fast validation for speedrunners
    speedrun_mode: {
        profiles: {
            speedrun: {
                name: 'Speedrun Validation',
                description: 'Quick validation optimized for speed',
                failureMode: 'warning',
                constraints: {
                    pathLength: {
                        min: 200,
                        max: 1500,
                        warningThreshold: 150
                    },
                    turnAngle: {
                        max: Math.PI * 0.85,
                        sharpTurnLimit: 6,
                        consecutiveSharpTurns: 3,
                        warningAngle: Math.PI * 0.75
                    },
                    segment: {
                        minLength: 20,
                        maxLength: 400,
                        consistencyRatio: 0.6,
                        variationTolerance: 0.5
                    },
                    complexity: {
                        maxComplexity: 0.9,
                        balanceThreshold: 0.4,
                        minVariety: 0.15
                    },
                    performance: {
                        maxValidationTime: 2, // Very fast validation
                        retryLimit: 1
                    }
                },
                weights: {
                    structure: 0.2,
                    balance: 0.2,
                    performance: 0.5, // Prioritize speed
                    creativity: 0.1
                }
            }
        }
    },
    
    // Example 5: Theme-Specific Configurations
    // Different validation rules per theme
    theme_specific: {
        themeAdjustments: {
            cyber: {
                constraints: {
                    segment: {
                        consistencyRatio: -0.15, // Very consistent segments
                        minLength: 15 // Longer segments for geometric feel
                    },
                    turnAngle: {
                        max: -0.2, // Sharper turns allowed for digital feel
                        sharpTurnLimit: 2
                    }
                },
                complexity: {
                    preferredRange: [0.2, 0.6],
                    geometricBonus: 0.2
                }
            },
            forest: {
                constraints: {
                    segment: {
                        variationTolerance: 0.2, // Very organic variation
                        consistencyRatio: 0.15
                    },
                    turnAngle: {
                        max: 0.15, // More flowing turns
                        warningAngle: 0.2
                    }
                },
                complexity: {
                    preferredRange: [0.4, 0.9],
                    organicBonus: 0.25
                }
            },
            mountain: {
                constraints: {
                    pathLength: {
                        min: 100, // Longer winding paths
                        warningThreshold: 50
                    },
                    turnAngle: {
                        sharpTurnLimit: 3, // More switchbacks
                        consecutiveSharpTurns: 2
                    }
                },
                complexity: {
                    preferredRange: [0.6, 0.95],
                    elevationBonus: 0.3
                }
            },
            urban: {
                constraints: {
                    segment: {
                        variationTolerance: 0.12, // Street-like variation
                        consistencyRatio: 0.08
                    },
                    turnAngle: {
                        sharpTurnLimit: 2, // Street corners
                        consecutiveSharpTurns: 1
                    }
                },
                complexity: {
                    preferredRange: [0.35, 0.75],
                    streetPatternBonus: 0.18
                }
            }
        }
    },
    
    // Example 6: Progressive Difficulty
    // Validation becomes stricter as levels progress
    progressive_difficulty: {
        levelOverrides: {
            // Tutorial levels (1-3): Very forgiving
            1: {
                pathLength: { min: 250, max: 500 },
                turnAngle: { max: Math.PI * 0.3, sharpTurnLimit: 0 },
                complexity: { maxComplexity: 0.2 }
            },
            2: {
                pathLength: { min: 275, max: 550 },
                turnAngle: { max: Math.PI * 0.4, sharpTurnLimit: 1 },
                complexity: { maxComplexity: 0.25 }
            },
            3: {
                pathLength: { min: 300, max: 600 },
                turnAngle: { max: Math.PI * 0.5, sharpTurnLimit: 1 },
                complexity: { maxComplexity: 0.3 }
            },
            
            // Early game (4-7): Gentle introduction
            4: {
                pathLength: { min: 325, max: 650 },
                turnAngle: { max: Math.PI * 0.6, sharpTurnLimit: 2 },
                complexity: { maxComplexity: 0.4 }
            },
            5: {
                pathLength: { min: 350, max: 700 },
                turnAngle: { max: Math.PI * 0.65, sharpTurnLimit: 2 },
                complexity: { maxComplexity: 0.45 }
            },
            
            // Mid game (8-15): Standard rules
            // (Uses default balanced profile)
            
            // Late game (16-20): More challenging
            16: {
                pathLength: { min: 400, max: 1200 },
                turnAngle: { max: Math.PI * 0.8, sharpTurnLimit: 4 },
                complexity: { maxComplexity: 0.85 }
            },
            17: {
                pathLength: { min: 450, max: 1300 },
                turnAngle: { max: Math.PI * 0.85, sharpTurnLimit: 5 },
                complexity: { maxComplexity: 0.9 }
            },
            
            // Challenge levels (21+): Maximum difficulty
            21: {
                pathLength: { min: 500, max: 1500 },
                turnAngle: { max: Math.PI * 0.9, sharpTurnLimit: 6 },
                complexity: { maxComplexity: 0.95 }
            },
            22: {
                pathLength: { min: 500, max: 1600 },
                turnAngle: { max: Math.PI * 0.95, sharpTurnLimit: 7 },
                complexity: { maxComplexity: 1.0 }
            }
        }
    },
    
    // Example 7: Boss Level Configurations
    // Special validation for boss encounters
    boss_levels: {
        levelOverrides: {
            // Boss levels need careful balance
            10: { // First boss
                pathLength: { min: 400, max: 800, warningThreshold: 50 },
                turnAngle: { max: Math.PI * 0.7, sharpTurnLimit: 3 },
                complexity: { maxComplexity: 0.65, balanceThreshold: 0.85 },
                segment: { minLength: 60, consistencyRatio: 0.2 }
            },
            20: { // Second boss
                pathLength: { min: 500, max: 1000, warningThreshold: 75 },
                turnAngle: { max: Math.PI * 0.75, sharpTurnLimit: 4 },
                complexity: { maxComplexity: 0.8, balanceThreshold: 0.9 },
                segment: { minLength: 50, consistencyRatio: 0.25 }
            },
            25: { // Final boss
                pathLength: { min: 600, max: 1200, warningThreshold: 100 },
                turnAngle: { max: Math.PI * 0.8, sharpTurnLimit: 5 },
                complexity: { maxComplexity: 0.9, balanceThreshold: 0.95 },
                segment: { minLength: 40, consistencyRatio: 0.3 }
            }
        }
    },
    
    // Example 8: Playtesting Mode
    // Detailed validation for development
    playtesting_mode: {
        profiles: {
            playtest: {
                name: 'Playtesting Validation',
                description: 'Comprehensive validation for development',
                failureMode: 'warning',
                constraints: {
                    pathLength: {
                        min: 200,
                        max: 1800,
                        warningThreshold: 200
                    },
                    turnAngle: {
                        max: Math.PI * 0.9,
                        sharpTurnLimit: 8,
                        consecutiveSharpTurns: 4,
                        warningAngle: Math.PI * 0.7
                    },
                    segment: {
                        minLength: 15,
                        maxLength: 500,
                        consistencyRatio: 0.7,
                        variationTolerance: 0.6
                    },
                    complexity: {
                        maxComplexity: 0.95,
                        balanceThreshold: 0.3,
                        minVariety: 0.1
                    },
                    performance: {
                        maxValidationTime: 30, // Allow thorough validation
                        retryLimit: 8
                    }
                },
                weights: {
                    structure: 0.3,
                    balance: 0.3,
                    performance: 0.1,
                    creativity: 0.3
                }
            }
        }
    }
};

// Utility functions for applying configurations

function applyValidationConfiguration(flexibleValidation, configName) {
    const config = VALIDATION_CONFIG_EXAMPLES[configName];
    if (!config) {
        console.warn(`Unknown validation configuration: ${configName}`);
        return false;
    }
    
    flexibleValidation.importConfiguration(config);
    console.log(`Applied validation configuration: ${configName}`);
    return true;
}

function getAvailableConfigurations() {
    return Object.keys(VALIDATION_CONFIG_EXAMPLES);
}

function getConfigurationDescription(configName) {
    const config = VALIDATION_CONFIG_EXAMPLES[configName];
    if (!config) return null;
    
    return {
        name: configName,
        profiles: Object.keys(config.profiles || {}),
        levelOverrides: Object.keys(config.levelOverrides || {}),
        themeAdjustments: Object.keys(config.themeAdjustments || {}),
        description: `Configuration with ${Object.keys(config.profiles || {}).length} profiles, ` +
                    `${Object.keys(config.levelOverrides || {}).length} level overrides, ` +
                    `${Object.keys(config.themeAdjustments || {}).length} theme adjustments`
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VALIDATION_CONFIG_EXAMPLES,
        applyValidationConfiguration,
        getAvailableConfigurations,
        getConfigurationDescription
    };
}
