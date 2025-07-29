// Dharmapala Shield - Game Configuration

const CONFIG = {
    // Canvas settings - now responsive
    CANVAS_WIDTH: window.innerWidth > 768 ? 1200 : window.innerWidth,
    CANVAS_HEIGHT: window.innerWidth > 768 ? 800 : window.innerHeight * 0.6,
    
    // Grid settings - responsive
    GRID_SIZE: window.innerWidth > 768 ? 40 : 30,
    get GRID_COLS() { return Math.floor(this.CANVAS_WIDTH / this.GRID_SIZE); },
    get GRID_ROWS() { return Math.floor(this.CANVAS_HEIGHT / this.GRID_SIZE); },
    
    // Touch/mobile settings
    IS_MOBILE: window.innerWidth <= 768,
    IS_TOUCH: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    
    // Game settings
    INITIAL_DHARMA: 100,
    INITIAL_BANDWIDTH: 50,
    INITIAL_ANONYMITY: 75,
    
    // Defense types with enhanced abilities
    DEFENSE_TYPES: {
        firewall: {
            name: 'Firewall Fortress',
            cost: 25,
            damage: 15,
            range: 200,
            fireRate: 1500, // ms - slower firing
            color: '#ff6b6b',
            description: 'Basic blocking defense with Buddhist prayer flag aesthetics',
            abilities: ['armor_piercing_upgrade', 'explosive_shots_upgrade']
        },
        encryption: {
            name: 'Encryption Monastery',
            cost: 40,
            damage: 25,
            range: 250,
            fireRate: 1200, // ms - slower firing
            color: '#4ecdc4',
            description: 'Scrambles data packets with rotating cipher algorithms',
            abilities: ['slow_field', 'multi_shot']
        },
        decoy: {
            name: 'Decoy Temple',
            cost: 30,
            damage: 0,
            range: 300,
            fireRate: 0,
            color: '#45b7d1',
            description: 'False targets that misdirect attacks',
            abilities: ['confusion', 'redirect', 'path_manipulation']
        },
        mirror: {
            name: 'Mirror Server',
            cost: 50,
            damage: 30,
            range: 220,
            fireRate: 1800, // ms - slower firing
            color: '#f9ca24',
            description: 'Reflects attacks back to sender using reflection meditation',
            abilities: ['reflection_boost', 'perfect_reflection', 'homing_shots']
        },
        anonymity: {
            name: 'Anonymity Shroud',
            cost: 35,
            damage: 0,
            range: 350,
            fireRate: 0,
            color: '#6c5ce7',
            description: 'Cloaks network traffic from surveillance',
            abilities: ['stealth_field', 'misdirection', 'invisibility_aura']
        },
        distributor: {
            name: 'Dharma Distributor',
            cost: 60,
            damage: 0,
            range: 400,
            fireRate: 0,
            color: '#ffd700',
            description: 'Boosts delivery speed and success rates',
            abilities: ['boost_aura', 'resource_generation', 'network_acceleration']
        }
    },
    
    // Enemy types with enhanced AI configurations
    ENEMY_TYPES: {
        scriptKiddie: {
            name: 'Script Kiddie',
            health: 20,
            speed: 80, // Fast but weak
            reward: 5,
            color: '#ff7675',
            size: 15,
            armor: 0,
            abilities: ['erratic_movement'],
            description: 'Fast but weak attackers with unpredictable movement patterns'
        },
        federalAgent: {
            name: 'Federal Agent',
            health: 80,
            speed: 60, // Moderate speed, heavily armored
            reward: 15,
            color: '#2d3436',
            size: 20,
            armor: 2,
            abilities: ['persistent_pathfinding', 'armor'],
            description: 'Heavily armored agents that find alternate routes when blocked'
        },
        corporateSaboteur: {
            name: 'Corporate Saboteur',
            health: 50,
            speed: 70, // Fast when not in stealth
            reward: 10,
            color: '#636e72',
            size: 18,
            armor: 1,
            abilities: ['stealth_mode'],
            description: 'Can become invisible and move faster temporarily'
        },
        aiSurveillance: {
            name: 'AI Surveillance',
            health: 60,
            speed: 65, // Moderate speed with scanning abilities
            reward: 12,
            color: '#74b9ff',
            size: 16,
            armor: 0,
            abilities: ['scanning_beam', 'mark_targets'],
            description: 'Marks defenses for increased damage and has scanning capabilities'
        },
        raidTeam: {
            name: 'Raid Team',
            health: 200,
            speed: 45, // Slow but powerful boss
            reward: 50,
            color: '#e17055',
            size: 30,
            armor: 5,
            abilities: ['boss_mechanics', 'spawn_minions', 'emp_burst', 'teleport'],
            description: 'Powerful boss enemy with multiple phases and special abilities',
            isBoss: true
        },
        // New advanced enemy types
        quantumHacker: {
            name: 'Quantum Hacker',
            health: 100,
            speed: 90, // Fast and can phase
            reward: 25,
            color: '#00b894',
            size: 18,
            armor: 1,
            abilities: ['phase_shift', 'quantum_tunneling'],
            description: 'Advanced hacker that can phase through defenses temporarily'
        },
        corruptedMonk: {
            name: 'Corrupted Monk',
            health: 120,
            speed: 55, // Moderate speed, support role
            reward: 30,
            color: '#6c5ce7',
            size: 22,
            armor: 3,
            abilities: ['healing_aura', 'corruption_spread'],
            description: 'Corrupted Buddhist monk that heals nearby enemies and spreads corruption'
        },
        megaCorp: {
            name: 'MegaCorp Titan',
            health: 400,
            speed: 35, // Very slow but heavily armored boss
            reward: 100,
            color: '#fd79a8',
            size: 40,
            armor: 10,
            abilities: ['boss_mechanics', 'deploy_drones', 'corporate_takeover', 'shield_regeneration'],
            description: 'Massive corporate entity with drone swarms and regenerative capabilities',
            isBoss: true
        }
    },
    
    // Wave configuration
    WAVES: [
        {
            enemies: [
                { type: 'scriptKiddie', count: 5, interval: 1000 }
            ]
        },
        {
            enemies: [
                { type: 'scriptKiddie', count: 8, interval: 800 },
                { type: 'federalAgent', count: 2, interval: 2000 }
            ]
        },
        {
            enemies: [
                { type: 'scriptKiddie', count: 10, interval: 600 },
                { type: 'corporateSaboteur', count: 3, interval: 1500 }
            ]
        },
        {
            enemies: [
                { type: 'scriptKiddie', count: 12, interval: 500 },
                { type: 'federalAgent', count: 4, interval: 1800 },
                { type: 'aiSurveillance', count: 2, interval: 2500 }
            ]
        },
        {
            enemies: [
                { type: 'scriptKiddie', count: 15, interval: 400 },
                { type: 'corporateSaboteur', count: 5, interval: 1200 },
                { type: 'raidTeam', count: 1, interval: 5000 }
            ]
        },
        {
            enemies: [
                { type: 'scriptKiddie', count: 20, interval: 300 },
                { type: 'federalAgent', count: 6, interval: 1500 },
                { type: 'aiSurveillance', count: 4, interval: 2000 }
            ]
        },
        {
            enemies: [
                { type: 'scriptKiddie', count: 25, interval: 250 },
                { type: 'corporateSaboteur', count: 8, interval: 1000 },
                { type: 'raidTeam', count: 2, interval: 4000 }
            ]
        },
        {
            enemies: [
                { type: 'scriptKiddie', count: 30, interval: 200 },
                { type: 'federalAgent', count: 10, interval: 1200 },
                { type: 'aiSurveillance', count: 6, interval: 1800 },
                { type: 'raidTeam', count: 2, interval: 3500 }
            ]
        },
        {
            enemies: [
                { type: 'scriptKiddie', count: 35, interval: 150 },
                { type: 'corporateSaboteur', count: 12, interval: 800 },
                { type: 'aiSurveillance', count: 8, interval: 1500 },
                { type: 'raidTeam', count: 3, interval: 3000 }
            ]
        },
        {
            enemies: [
                { type: 'scriptKiddie', count: 40, interval: 100 },
                { type: 'federalAgent', count: 15, interval: 1000 },
                { type: 'corporateSaboteur', count: 15, interval: 600 },
                { type: 'aiSurveillance', count: 10, interval: 1200 },
                { type: 'raidTeam', count: 5, interval: 2500 }
            ]
        },
        // Advanced waves with new enemy types
        {
            enemies: [
                { type: 'scriptKiddie', count: 30, interval: 200 },
                { type: 'quantumHacker', count: 5, interval: 2000 },
                { type: 'aiSurveillance', count: 8, interval: 1500 },
                { type: 'raidTeam', count: 2, interval: 4000 }
            ]
        },
        {
            enemies: [
                { type: 'federalAgent', count: 20, interval: 800 },
                { type: 'corporateSaboteur', count: 10, interval: 1200 },
                { type: 'quantumHacker', count: 8, interval: 1800 },
                { type: 'corruptedMonk', count: 3, interval: 3000 }
            ]
        },
        {
            enemies: [
                { type: 'scriptKiddie', count: 50, interval: 150 },
                { type: 'quantumHacker', count: 12, interval: 1000 },
                { type: 'corruptedMonk', count: 5, interval: 2500 },
                { type: 'raidTeam', count: 3, interval: 3500 }
            ]
        },
        {
            enemies: [
                { type: 'federalAgent', count: 25, interval: 600 },
                { type: 'aiSurveillance', count: 15, interval: 1000 },
                { type: 'quantumHacker', count: 10, interval: 1500 },
                { type: 'corruptedMonk', count: 8, interval: 2000 },
                { type: 'megaCorp', count: 1, interval: 10000 }
            ]
        },
        // Final boss wave
        {
            enemies: [
                { type: 'scriptKiddie', count: 100, interval: 100 },
                { type: 'federalAgent', count: 30, interval: 400 },
                { type: 'corporateSaboteur', count: 25, interval: 600 },
                { type: 'quantumHacker', count: 20, interval: 800 },
                { type: 'corruptedMonk', count: 10, interval: 1500 },
                { type: 'raidTeam', count: 5, interval: 2000 },
                { type: 'megaCorp', count: 2, interval: 15000 }
            ]
        }
    ],
    
    // Maximum number of waves
    MAX_WAVES: 10,
    
    // Path points for enemy movement
    PATH_POINTS: [
        { x: 0, y: 400 },      // Entry point (left side)
        { x: 200, y: 400 },
        { x: 200, y: 200 },
        { x: 400, y: 200 },
        { x: 400, y: 600 },
        { x: 600, y: 600 },
        { x: 600, y: 300 },
        { x: 800, y: 300 },
        { x: 800, y: 500 },
        { x: 1000, y: 500 },
        { x: 1000, y: 400 },
        { x: 1200, y: 400 }    // Exit point (right side)
    ],
    
    // Audio settings
    AUDIO: {
        masterVolume: 0.7,
        musicVolume: 0.5,
        sfxVolume: 0.8
    },
    
    // Graphics settings
    GRAPHICS: {
        quality: 'medium',
        particleEffects: true,
        reducedMotion: false
    },
    
    // Accessibility settings
    ACCESSIBILITY: {
        colorblindMode: false,
        subtitles: false,
        highContrast: false,
        reducedMotion: false,
        screenReaderEnabled: false,
        keyboardNavigation: true,
        announceAchievements: true,
        toastDuration: 4000,
        enhancedFocus: true
    },
    
    // CONFIG VALIDATION SYSTEM
    validateUpgradeTreesStructure() {
        console.log('[CONFIG] Validating UPGRADE_TREES structure...');
        
        try {
            if (!this.UPGRADE_TREES || typeof this.UPGRADE_TREES !== 'object') {
                console.error('[CONFIG] UPGRADE_TREES is not a valid object');
                return false;
            }
            
            const defenseTypes = ['firewall', 'encryption', 'decoy', 'mirror', 'anonymity', 'distributor'];
            let validationErrors = [];
            let validationWarnings = [];
            
            // Validate each defense type
            defenseTypes.forEach(defenseType => {
                const tree = this.UPGRADE_TREES[defenseType];
                
                if (!tree) {
                    validationWarnings.push(`Missing upgrade tree for defense type: ${defenseType}`);
                    return;
                }
                
                if (typeof tree !== 'object') {
                    validationErrors.push(`Invalid upgrade tree structure for ${defenseType}`);
                    return;
                }
                
                // Validate levels 2-5 for each defense type
                for (let level = 2; level <= 5; level++) {
                    const upgrade = tree[level];
                    
                    if (!upgrade) {
                        validationWarnings.push(`Missing upgrade for ${defenseType} level ${level}`);
                        continue;
                    }
                    
                    // Validate upgrade structure
                    const upgradeValidation = this.validateSingleUpgrade(upgrade, defenseType, level);
                    validationErrors.push(...upgradeValidation.errors);
                    validationWarnings.push(...upgradeValidation.warnings);
                }
            });
            
            // Report validation results
            if (validationErrors.length > 0) {
                console.error('[CONFIG] UPGRADE_TREES validation errors:', validationErrors);
                return false;
            }
            
            if (validationWarnings.length > 0) {
                console.warn('[CONFIG] UPGRADE_TREES validation warnings:', validationWarnings);
            }
            
            console.log('[CONFIG] UPGRADE_TREES structure validation completed successfully');
            return true;
            
        } catch (error) {
            console.error('[CONFIG] Critical error during UPGRADE_TREES validation:', error);
            return false;
        }
    },
    
    validateSingleUpgrade(upgrade, defenseType, level) {
        const errors = [];
        const warnings = [];
        
        // Validate description
        if (upgrade.description && typeof upgrade.description !== 'string') {
            errors.push(`Invalid description type for ${defenseType} level ${level}`);
        }
        
        // Validate modifiers
        if (upgrade.modifiers) {
            if (typeof upgrade.modifiers !== 'object') {
                errors.push(`Invalid modifiers structure for ${defenseType} level ${level}`);
            } else {
                const validModifiers = ['damage', 'range', 'fireRate', 'size'];
                Object.entries(upgrade.modifiers).forEach(([modifier, value]) => {
                    if (!validModifiers.includes(modifier)) {
                        warnings.push(`Unknown modifier '${modifier}' for ${defenseType} level ${level}`);
                    }
                    if (typeof value !== 'number' || value <= 0) {
                        errors.push(`Invalid modifier value for '${modifier}' in ${defenseType} level ${level}: ${value}`);
                    }
                });
            }
        }
        
        // Validate abilities
        if (upgrade.abilities) {
            if (!Array.isArray(upgrade.abilities)) {
                errors.push(`Abilities must be an array for ${defenseType} level ${level}`);
            } else {
                const validAbilities = [
                    'armor_piercing', 'explosive_rounds', 'improved_targeting', 'rapid_fire',
                    'slow_field', 'multi_shot', 'chain_lightning', 'quantum_bypass', 'viral_spread',
                    'confusion', 'redirect', 'holographic_decoy', 'mass_confusion', 'phantom_army',
                    'reflection_boost', 'omni_reflection', 'perfect_reflection', 'truth_revelation',
                    'stealth_field', 'misdirection', 'invisibility_cloak', 'shadow_network',
                    'boost_aura', 'resource_generation', 'dharma_blessing', 'network_amplification',
                    'fortress_mode', 'wisdom_aura', 'enlightenment_burst'
                ];
                
                upgrade.abilities.forEach(ability => {
                    if (typeof ability !== 'string') {
                        errors.push(`Invalid ability type in ${defenseType} level ${level}: ${typeof ability}`);
                    } else if (!validAbilities.includes(ability)) {
                        warnings.push(`Unknown ability '${ability}' for ${defenseType} level ${level}`);
                    }
                });
            }
        }
        
        // Validate choices
        if (upgrade.choices) {
            if (!Array.isArray(upgrade.choices)) {
                errors.push(`Choices must be an array for ${defenseType} level ${level}`);
            } else {
                upgrade.choices.forEach((choice, index) => {
                    const choiceValidation = this.validateUpgradeChoice(choice, defenseType, level, index);
                    errors.push(...choiceValidation.errors);
                    warnings.push(...choiceValidation.warnings);
                });
            }
        }
        
        return { errors, warnings };
    },
    
    validateUpgradeChoice(choice, defenseType, level, choiceIndex) {
        const errors = [];
        const warnings = [];
        
        if (!choice || typeof choice !== 'object') {
            errors.push(`Invalid choice structure for ${defenseType} level ${level} choice ${choiceIndex}`);
            return { errors, warnings };
        }
        
        // Validate choice name and description
        if (choice.name && typeof choice.name !== 'string') {
            errors.push(`Invalid choice name type for ${defenseType} level ${level} choice ${choiceIndex}`);
        }
        if (choice.description && typeof choice.description !== 'string') {
            errors.push(`Invalid choice description type for ${defenseType} level ${level} choice ${choiceIndex}`);
        }
        
        // Validate choice modifiers
        if (choice.modifiers) {
            if (typeof choice.modifiers !== 'object') {
                errors.push(`Invalid choice modifiers for ${defenseType} level ${level} choice ${choiceIndex}`);
            } else {
                const validModifiers = ['damage', 'range', 'fireRate', 'size'];
                Object.entries(choice.modifiers).forEach(([modifier, value]) => {
                    if (!validModifiers.includes(modifier)) {
                        warnings.push(`Unknown choice modifier '${modifier}' for ${defenseType} level ${level} choice ${choiceIndex}`);
                    }
                    if (typeof value !== 'number' || value <= 0) {
                        errors.push(`Invalid choice modifier value for '${modifier}' in ${defenseType} level ${level} choice ${choiceIndex}: ${value}`);
                    }
                });
            }
        }
        
        // Validate choice abilities
        if (choice.abilities) {
            if (!Array.isArray(choice.abilities)) {
                errors.push(`Choice abilities must be an array for ${defenseType} level ${level} choice ${choiceIndex}`);
            }
        }
        
        return { errors, warnings };
    },
    
    // Phase 2: Upgrade Trees Configuration
    UPGRADE_TREES: {
        firewall: {
            2: {
                description: "Enhanced targeting system",
                modifiers: { damage: 1.2, range: 1.1 },
                abilities: ['improved_targeting']
            },
            3: {
                description: "Armor piercing rounds",
                modifiers: { damage: 1.3 },
                abilities: ['armor_piercing'],
                choices: [
                    {
                        name: "Explosive Rounds",
                        description: "Area damage on impact",
                        abilities: ['explosive_rounds']
                    },
                    {
                        name: "Rapid Fire",
                        description: "Increased fire rate",
                        modifiers: { fireRate: 0.7 }
                    }
                ]
            },
            4: {
                description: "Advanced targeting computer",
                modifiers: { range: 1.3, damage: 1.2 }
            },
            5: {
                description: "Fortress of Dharma",
                modifiers: { damage: 2.0, range: 1.5, size: 1.5 },
                abilities: ['fortress_mode', 'dharma_blessing']
            }
        },
        encryption: {
            2: {
                description: "Slow field projection",
                abilities: ['slow_field'],
                modifiers: { range: 1.2 }
            },
            3: {
                description: "Multi-target encryption",
                abilities: ['multi_shot'],
                modifiers: { damage: 1.1 }
            },
            4: {
                description: "Advanced cipher algorithms",
                modifiers: { damage: 1.4, fireRate: 0.8 },
                choices: [
                    {
                        name: "Quantum Encryption",
                        description: "Chance to bypass all armor",
                        abilities: ['quantum_bypass']
                    },
                    {
                        name: "Viral Encryption",
                        description: "Spreads to nearby enemies",
                        abilities: ['viral_spread']
                    }
                ]
            },
            5: {
                description: "Monastery of Infinite Wisdom",
                modifiers: { damage: 1.8, range: 1.4 },
                abilities: ['wisdom_aura', 'enlightenment_burst']
            }
        },
        decoy: {
            2: {
                description: "Confusion field",
                abilities: ['confusion'],
                modifiers: { range: 1.3 }
            },
            3: {
                description: "Enemy redirection",
                abilities: ['redirect'],
                modifiers: { range: 1.2 }
            },
            4: {
                description: "Advanced holographic projection",
                abilities: ['holographic_decoy'],
                modifiers: { range: 1.5 }
            },
            5: {
                description: "Temple of Illusions",
                abilities: ['mass_confusion', 'phantom_army'],
                modifiers: { range: 2.0 }
            }
        },
        mirror: {
            2: {
                description: "Reflection amplification",
                modifiers: { damage: 1.3 }
            },
            3: {
                description: "Enhanced reflection matrix",
                abilities: ['reflection_boost'],
                modifiers: { damage: 1.2, range: 1.1 }
            },
            4: {
                description: "Multi-directional reflection",
                abilities: ['omni_reflection'],
                modifiers: { damage: 1.3 }
            },
            5: {
                description: "Perfect Mirror of Truth",
                abilities: ['perfect_reflection', 'truth_revelation'],
                modifiers: { damage: 2.2, range: 1.3 }
            }
        },
        anonymity: {
            2: {
                description: "Stealth field projection",
                abilities: ['stealth_field'],
                modifiers: { range: 1.2 }
            },
            3: {
                description: "Misdirection protocols",
                abilities: ['misdirection'],
                modifiers: { range: 1.1 }
            },
            4: {
                description: "Advanced cloaking technology",
                abilities: ['advanced_cloak'],
                modifiers: { range: 1.4 }
            },
            5: {
                description: "Shroud of Perfect Anonymity",
                abilities: ['perfect_anonymity', 'invisibility_cloak'],
                modifiers: { range: 1.8 }
            }
        },
        distributor: {
            2: {
                description: "Boost aura for nearby defenses",
                abilities: ['boost_aura'],
                modifiers: { range: 1.3 }
            },
            3: {
                description: "Resource generation capabilities",
                abilities: ['resource_generation']
            },
            4: {
                description: "Enhanced distribution network",
                abilities: ['network_boost'],
                modifiers: { range: 1.5 }
            },
            5: {
                description: "Dharma Distribution Center",
                abilities: ['mass_boost', 'dharma_fountain'],
                modifiers: { range: 2.0 }
            }
        }
    },
    
    // Phase 2: Boss Phase Configurations
    BOSS_PHASES: {
        raidTeam: {
            1: {
                description: "Initial assault phase",
                healthThreshold: 1.0,
                abilities: ['emp_burst'],
                cooldowns: { emp_burst: 8000 }
            },
            2: {
                description: "Tactical advancement",
                healthThreshold: 0.7,
                speedMultiplier: 1.2,
                abilities: ['emp_burst', 'shield_regen'],
                cooldowns: { emp_burst: 6000, shield_regen: 10000 }
            },
            3: {
                description: "Desperate measures",
                healthThreshold: 0.3,
                speedMultiplier: 1.3,
                spawnMinions: { type: 'scriptKiddie', count: 3 },
                abilities: ['emp_burst', 'shield_regen', 'teleport'],
                cooldowns: { emp_burst: 4000, shield_regen: 8000, teleport: 12000 }
            }
        },
        megaCorp: {
            1: {
                description: "Corporate infiltration",
                healthThreshold: 1.0,
                abilities: ['data_corruption'],
                cooldowns: { data_corruption: 10000 }
            },
            2: {
                description: "Hostile takeover",
                healthThreshold: 0.75,
                speedMultiplier: 1.1,
                abilities: ['data_corruption', 'corporate_takeover'],
                cooldowns: { data_corruption: 8000, corporate_takeover: 12000 }
            },
            3: {
                description: "Market domination",
                healthThreshold: 0.5,
                speedMultiplier: 1.1,
                abilities: ['data_corruption', 'corporate_takeover', 'mass_deployment'],
                cooldowns: { data_corruption: 6000, corporate_takeover: 10000, mass_deployment: 15000 }
            },
            4: {
                description: "System monopoly",
                healthThreshold: 0.25,
                speedMultiplier: 1.2,
                abilities: ['system_crash', 'mass_deployment'],
                cooldowns: { system_crash: 20000, mass_deployment: 10000 }
            }
        }
    },
    
    // Phase 2: Path Generation Parameters
    PATH_GENERATION: {
        complexity: {
            low: 0.3,
            medium: 0.6,
            high: 0.9
        },
        obstacleTypes: {
            urban: ['building', 'intersection', 'roadblock'],
            forest: ['tree', 'rock', 'stream'],
            mountain: ['cliff', 'boulder', 'crevice'],
            cyber: ['firewall', 'node', 'data_stream']
        },
        pathWidths: {
            narrow: 30,
            normal: 40,
            wide: 50
        },
        validation: {
            minPathLength: 300,
            maxPathLength: 1000,
            maxTurnAngle: Math.PI * 0.8,
            minSegmentLength: 40
        }
    },
    
    // Phase 2: Level-Specific Path Configurations
    LEVEL_PATHS: {
        // Level-specific path generation modes and constraints
        // Each level can have custom settings for path generation control
        
        // Tutorial levels - Use static paths for consistency
        level_1: {
            pathMode: 'static',
            theme: 'cyber',
            allowGeneration: false,
            preserveLayout: true,
            staticPath: [
                { x: 50, y: 300 },
                { x: 200, y: 300 },
                { x: 350, y: 300 },
                { x: 500, y: 300 },
                { x: 650, y: 300 },
                { x: 800, y: 300 },
                { x: 950, y: 300 },
                { x: 1150, y: 300 }
            ],
            constraints: {
                maxTurnAngle: 0, // No turns for tutorial
                minSegmentLength: 100,
                maxComplexity: 0.1
            },
            balanceSettings: {
                targetDifficulty: 0.2,
                allowVariations: false,
                maxPathVariations: 0
            },
            designNotes: "Tutorial level - straight path for learning basics"
        },
        
        level_2: {
            pathMode: 'static',
            theme: 'cyber',
            allowGeneration: false,
            preserveLayout: true,
            staticPath: [
                { x: 50, y: 400 },
                { x: 200, y: 400 },
                { x: 200, y: 200 },
                { x: 400, y: 200 },
                { x: 400, y: 400 },
                { x: 600, y: 400 },
                { x: 800, y: 400 },
                { x: 1150, y: 400 }
            ],
            constraints: {
                maxTurnAngle: Math.PI / 2, // 90-degree turns only
                minSegmentLength: 150,
                maxComplexity: 0.3
            },
            balanceSettings: {
                targetDifficulty: 0.3,
                allowVariations: false,
                maxPathVariations: 0
            },
            designNotes: "Basic turns introduction"
        },
        
        // Early game levels - Hybrid mode with controlled variation
        level_3: {
            pathMode: 'hybrid',
            theme: 'cyber',
            allowGeneration: true,
            preserveLayout: false,
            constraints: {
                maxTurnAngle: Math.PI * 0.6, // 108 degrees
                minSegmentLength: 80,
                maxComplexity: 0.4
            },
            balanceSettings: {
                targetDifficulty: 0.38,
                allowVariations: true,
                maxPathVariations: 2
            },
            designNotes: "First level with path variations"
        },
        
        level_4: {
            pathMode: 'hybrid',
            theme: 'cyber',
            allowGeneration: true,
            preserveLayout: false,
            constraints: {
                maxTurnAngle: Math.PI * 0.7,
                minSegmentLength: 70,
                maxComplexity: 0.5
            },
            balanceSettings: {
                targetDifficulty: 0.46,
                allowVariations: true,
                maxPathVariations: 3
            }
        },
        
        level_5: {
            pathMode: 'hybrid',
            theme: 'urban',
            allowGeneration: true,
            preserveLayout: false,
            constraints: {
                maxTurnAngle: Math.PI * 0.75,
                minSegmentLength: 60,
                maxComplexity: 0.6
            },
            balanceSettings: {
                targetDifficulty: 0.54,
                allowVariations: true,
                maxPathVariations: 3
            },
            designNotes: "Introduction to urban theme"
        },
        
        // Mid-game levels - More dynamic generation
        level_6: {
            pathMode: 'dynamic',
            theme: 'urban',
            allowGeneration: true,
            preserveLayout: false,
            constraints: {
                maxTurnAngle: Math.PI * 0.8,
                minSegmentLength: 50,
                maxComplexity: 0.65
            },
            balanceSettings: {
                targetDifficulty: 0.62,
                allowVariations: true,
                maxPathVariations: 4
            }
        },
        
        level_7: {
            pathMode: 'dynamic',
            theme: 'forest',
            allowGeneration: true,
            preserveLayout: false,
            constraints: {
                maxTurnAngle: Math.PI * 0.85,
                minSegmentLength: 45,
                maxComplexity: 0.7
            },
            balanceSettings: {
                targetDifficulty: 0.7,
                allowVariations: true,
                maxPathVariations: 4
            },
            designNotes: "Forest theme with organic paths"
        },
        
        // Boss levels - Specific layout preservation
        level_10: {
            pathMode: 'static',
            theme: 'cyber',
            allowGeneration: false,
            preserveLayout: true,
            staticPath: [
                { x: 50, y: 300 },
                { x: 180, y: 250 },
                { x: 320, y: 200 },
                { x: 450, y: 300 },
                { x: 580, y: 400 },
                { x: 720, y: 350 },
                { x: 860, y: 250 },
                { x: 1000, y: 300 },
                { x: 1150, y: 300 }
            ],
            constraints: {
                maxTurnAngle: Math.PI * 0.6,
                minSegmentLength: 80,
                maxComplexity: 0.6
            },
            balanceSettings: {
                targetDifficulty: 0.78,
                allowVariations: false,
                maxPathVariations: 0
            },
            designNotes: "Boss level - carefully designed path for specific challenge"
        },
        
        // Advanced levels - Full dynamic generation
        level_15: {
            pathMode: 'dynamic',
            theme: 'mountain',
            allowGeneration: true,
            preserveLayout: false,
            constraints: {
                maxTurnAngle: Math.PI * 0.9,
                minSegmentLength: 40,
                maxComplexity: 0.85
            },
            balanceSettings: {
                targetDifficulty: 0.86,
                allowVariations: true,
                maxPathVariations: 5
            },
            specialFeatures: ['elevation_changes', 'narrow_passages']
        },
        
        // Challenge levels - Maximum difficulty with controlled chaos
        level_20: {
            pathMode: 'dynamic',
            theme: 'cyber',
            allowGeneration: true,
            preserveLayout: false,
            constraints: {
                maxTurnAngle: Math.PI * 0.95,
                minSegmentLength: 35,
                maxComplexity: 0.95
            },
            balanceSettings: {
                targetDifficulty: 0.94,
                allowVariations: true,
                maxPathVariations: 6
            },
            specialFeatures: ['portal_networks', 'reality_distortion'],
            designNotes: "Ultimate challenge level"
        },
        
        // Default configuration for levels not explicitly defined
        default: {
            pathMode: 'hybrid',
            theme: 'cyber',
            allowGeneration: true,
            preserveLayout: false,
            constraints: {
                maxTurnAngle: Math.PI * 0.7,
                minSegmentLength: 60,
                maxComplexity: 0.6
            },
            balanceSettings: {
                targetDifficulty: 0.5,
                allowVariations: true,
                maxPathVariations: 3
            }
        }
    },
    
    // Phase 2: Achievement System Configuration
    ACHIEVEMENT_CATEGORIES: {
        first_steps: {
            name: "First Steps",
            color: "#4ecdc4",
            icon: "🚶‍♂️"
        },
        combat: {
            name: "Combat Mastery",
            color: "#ff6b6b",
            icon: "⚔️"
        },
        strategy: {
            name: "Strategic Genius",
            color: "#ffd700",
            icon: "🧠"
        },
        progression: {
            name: "Progression",
            color: "#45b7d1",
            icon: "📈"
        },
        secret: {
            name: "Hidden Secrets",
            color: "#a55eea",
            icon: "🔮"
        }
    },
    
    // Phase 2: Boss Warning System
    BOSS_WARNINGS: {
        telegraphDuration: 2000,
        warningOpacity: 0.3,
        warningColor: "#ff0000",
        soundEffects: {
            warning: 'bossWarning',
            phaseTransition: 'bossPhaseTransition',
            defeated: 'bossDefeated'
        }
    },
    
    // Phase 2: Upgrade Visual Effects
    UPGRADE_EFFECTS: {
        particleCount: {
            base: 20,
            perLevel: 5
        },
        colors: {
            level1: "#4ecdc4",
            level2: "#45b7d1",
            level3: "#ffd700",
            level4: "#ff9ff3",
            level5: "#fd79a8"
        },
        duration: {
            particles: 1500,
            text: 2000,
            glow: 3000
        }
    },
    
    // Phase 2: Performance Settings
    PERFORMANCE: {
        pathfinding: {
            updateInterval: 200,
            maxIterations: 1000,
            cacheSize: 100
        },
        particles: {
            maxCount: 500,
            cullDistance: 1000
        },
        achievements: {
            maxNotificationQueue: 5,
            notificationDuration: 4000
        }
    }
};

// Validate the CONFIG structure on load
setTimeout(() => {
    if (CONFIG && typeof CONFIG.validateUpgradeTreesStructure === 'function') {
        CONFIG.validateUpgradeTreesStructure();
    }
}, 100);

