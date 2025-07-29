# 🏗️ Architecture Documentation - Dharmapala Shield

> *A Comprehensive Guide to the Game's Technical Architecture*

This document provides a detailed overview of the Dharmapala Shield game architecture, covering system design, component interactions, data flow, and architectural decisions.

## 🎯 Architecture Overview

### Design Philosophy
The architecture follows these core principles:
- **Simplicity First**: Browser-appropriate patterns over enterprise complexity
- **Modular Design**: Single responsibility, loose coupling
- **Performance-Oriented**: Optimized for browser game loops
- **Event-Driven**: Pub/sub communication between systems
- **Mobile-First**: Touch-friendly and responsive design

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                           Browser Environment                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │   Entry Point   │    │  Asset Loading  │    │  User Input  │ │
│  │   (main.js)     │    │ (loadingManager │    │  (input.js)  │ │
│  │                 │    │  imageOptimizer)│    │              │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                          Core Game Loop                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Game Controller                           │ │
│  │                 (game_simplified.js)                       │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐ │ │
│  │  │ System Manager│  │ Screen Manager │  │  Defense Manager│ │ │
│  │  │               │  │               │  │                 │ │ │
│  │  └───────────────┘  └───────────────┘  └─────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                        Gameplay Systems                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────┐ │
│  │   Entities   │  │   Physics    │  │   Rendering  │  │ UI   │ │
│  │              │  │              │  │              │  │      │ │
│  │ • Defenses   │  │ • Projectiles│  │ • Sprites    │  │ • HUD│ │
│  │ • Enemies    │  │ • Collision  │  │ • Particles  │  │ • UX │ │
│  │ • Bosses     │  │ • Movement   │  │ • Effects    │  │      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────┘ │
├─────────────────────────────────────────────────────────────────┤
│                        Support Systems                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────┐ │
│  │    Audio     │  │     Save     │  │ Achievements │  │Level │ │
│  │   Manager    │  │    System    │  │   Manager    │  │ Mgmt │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────┘ │
├─────────────────────────────────────────────────────────────────┤
│                         Utilities                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────┐ │
│  │    Utils     │  │    Camera    │  │    Mobile    │  │Config│ │
│  │   Library    │  │   Controls   │  │   Support    │  │      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🎮 Core Game Loop Architecture

### Game Loop Structure

```javascript
class Game {
    async gameLoop() {
        const deltaTime = this.calculateDeltaTime();
        
        // 1. Input Processing
        this.inputManager.update();
        
        // 2. Game Logic Update
        this.updateGameSystems(deltaTime);
        
        // 3. Physics & Collision
        this.updatePhysics(deltaTime);
        
        // 4. Rendering
        this.render();
        
        // 5. Schedule Next Frame
        requestAnimationFrame(() => this.gameLoop());
    }
}
```

### System Update Order
1. **Input Processing**: Handle user interactions
2. **Game State Updates**: Update game systems and entities
3. **Physics Simulation**: Movement, collision detection
4. **Audio Processing**: Sound effects and music
5. **Rendering**: Visual updates and effects
6. **UI Updates**: Interface and HUD updates

## 📦 Module Architecture

### Core Modules

#### 1. Game Controller (`game_simplified.js`)
**Purpose**: Main game coordination and loop management
**Responsibilities**:
- Game loop orchestration
- System lifecycle management
- Global state coordination
- Event distribution

**Key Methods**:
```javascript
class Game {
    async initialize()     // Bootstrap game systems
    gameLoop()            // Main update/render loop
    handleInput()         // Process user input
    updateSystems()       // Update all game systems
    render()             // Render game state
    pause()/resume()     // Game state control
}
```

#### 2. System Manager (`GameSystemManager.js`)
**Purpose**: Initialize and manage core game systems
**Responsibilities**:
- System initialization sequencing
- Dependency injection
- System lifecycle management
- Error handling and recovery

**System Initialization Flow**:
```javascript
async initialize() {
    await this.initializeConfig();
    await this.initializePathGenerator();
    await this.initializeAudio();
    await this.initializeSaveSystem();
    await this.initializeLevelManager();
    await this.initializeAchievements();
}
```

#### 3. Defense Manager (`DefenseManager.js`)
**Purpose**: Manage defense placement, upgrades, and behavior
**Responsibilities**:
- Defense placement validation
- Upgrade system management
- Resource cost calculation
- Defense targeting and firing

**Core Operations**:
```javascript
class DefenseManager {
    placeDefense(x, y, type)     // Place new defense
    upgradeDefense(defense)      // Upgrade existing defense
    sellDefense(defense)         // Remove and refund defense
    updateDefenses(deltaTime)    // Update all defenses
    findTargets(defense)         // Target acquisition
}
```

#### 4. Screen Manager (`ScreenManager.js`)
**Purpose**: Handle UI navigation and screen transitions
**Responsibilities**:
- Screen state management
- Transition animations
- Modal dialog handling
- Navigation flow control

#### 5. UI Manager (`UIManager.js`)
**Purpose**: Update user interface and display information
**Responsibilities**:
- HUD updates
- Notification system
- Resource display
- Game state visualization

### Entity Systems

#### Defense System
```javascript
class Defense {
    // Core Properties
    constructor(type, x, y)
    
    // Behavior Methods
    update(deltaTime, enemies)
    findTarget(enemies)
    fire(target)
    upgrade()
    
    // State Management
    canFire()
    isInRange(enemy)
    getUpgradeCost()
}
```

#### Enemy System
```javascript
class Enemy {
    // Core Properties
    constructor(type, x, y)
    
    // Behavior Methods
    update(deltaTime, defenses, enemies)
    updateMovement(deltaTime)
    updateSpecialAbilities(deltaTime, defenses, enemies)
    takeDamage(amount, damageType)
    
    // AI Methods
    followPath(path, deltaTime)
    updateErraticMovement()
    updateStealth()
}
```

#### Boss System
```javascript
class Boss extends Enemy {
    // Boss-Specific Properties
    phase, maxPhases, phaseThresholds
    
    // Phase Management
    initializePhase(newPhase)
    updatePhase()
    
    // Boss Abilities
    triggerAbility(ability, defenses, enemies)
    spawnMinions()
    empBurst()
    dataCorruption()
}
```

### Support Systems

#### Audio System
```javascript
class AudioManager {
    // Audio Control
    playSound(soundName, volume)
    playMusic(trackName)
    setMasterVolume(volume)
    
    // State Management
    mute()/unmute()
    preloadSounds(soundList)
}
```

#### Save System
```javascript
class SaveSystem {
    // Persistence
    save(key, data)
    load(key)
    
    // Validation
    validateSaveData(data)
    migrateOldSaves()
}
```

#### Achievement System
```javascript
class AchievementManager {
    // Event Tracking
    trackEvent(eventType, data)
    
    // Achievement Management
    unlockAchievement(id)
    getProgress(id)
    
    // Statistics
    getStats()
    getCompletionStats()
}
```

## 🎯 Data Flow Architecture

### Event-Driven Communication

#### Event Types
```javascript
const GameEvents = {
    // Game State
    GAME_STARTED: 'game_started',
    GAME_PAUSED: 'game_paused',
    GAME_OVER: 'game_over',
    
    // Entity Events
    ENEMY_SPAWNED: 'enemy_spawned',
    ENEMY_KILLED: 'enemy_killed',
    DEFENSE_PLACED: 'defense_placed',
    DEFENSE_UPGRADED: 'defense_upgraded',
    
    // Achievement Events
    ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
    LEVEL_COMPLETED: 'level_completed',
    
    // UI Events
    SCREEN_CHANGED: 'screen_changed',
    NOTIFICATION_SHOWN: 'notification_shown'
};
```

#### Event Flow Example
```
User Input → Input Manager → Game Controller → System Manager
    ↓
Defense Manager → Defense Entity → Projectile Creation
    ↓
Collision Detection → Enemy Damage → Death Event
    ↓
Achievement Manager → UI Manager → Visual Feedback
```

### State Management

#### Game State Structure
```javascript
const gameState = {
    // Core Game State
    lives: 10,
    wave: 1,
    level: 1,
    score: 0,
    
    // Game Flow State
    paused: false,
    gameOver: false,
    inMenu: false,
    
    // Resources
    resources: {
        dharma: 1000,
        bandwidth: 500,
        anonymity: 250
    },
    
    // Collections
    defenses: [],
    enemies: [],
    projectiles: [],
    particles: []
};
```

#### State Update Pattern
```javascript
// Immutable State Updates
updateGameState(changes) {
    this.gameState = {
        ...this.gameState,
        ...changes
    };
    this.notifyStateChange();
}
```

## 🚀 Performance Architecture

### Optimization Strategies

#### 1. Object Pooling
```javascript
class ProjectilePool {
    constructor(size = 100) {
        this.pool = [];
        this.activeProjectiles = [];
        
        // Pre-allocate objects
        for (let i = 0; i < size; i++) {
            this.pool.push(new Projectile());
        }
    }
    
    acquire() {
        return this.pool.pop() || new Projectile();
    }
    
    release(projectile) {
        projectile.reset();
        this.pool.push(projectile);
    }
}
```

#### 2. Efficient Rendering
```javascript
class Renderer {
    render() {
        // Batch similar operations
        this.ctx.save();
        
        // Render by type for efficiency
        this.renderDefenses();
        this.renderEnemies();
        this.renderProjectiles();
        this.renderParticles();
        this.renderUI();
        
        this.ctx.restore();
    }
}
```

#### 3. Spatial Partitioning
```javascript
class SpatialGrid {
    constructor(width, height, cellSize) {
        this.cells = new Map();
        this.cellSize = cellSize;
    }
    
    insert(entity) {
        const cell = this.getCell(entity.x, entity.y);
        if (!this.cells.has(cell)) {
            this.cells.set(cell, []);
        }
        this.cells.get(cell).push(entity);
    }
    
    query(x, y, radius) {
        // Return only nearby entities
        const cells = this.getCellsInRadius(x, y, radius);
        return cells.flatMap(cell => this.cells.get(cell) || []);
    }
}
```

### Memory Management

#### Garbage Collection Optimization
```javascript
class EntityManager {
    update() {
        // Process entities in place to avoid allocation
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            
            if (entity.shouldRemove) {
                // Return to pool instead of creating garbage
                this.entityPool.release(entity);
                this.entities[i] = this.entities[this.entities.length - 1];
                this.entities.pop();
            } else {
                entity.update();
            }
        }
    }
}
```

## 📱 Mobile Architecture

### Touch Input Handling
```javascript
class MobileManager {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        
        this.setupTouchHandlers();
    }
    
    handleTouchStart(event) {
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();
    }
    
    handleTouchEnd(event) {
        const touch = event.changedTouches[0];
        const duration = Date.now() - this.touchStartTime;
        const distance = this.calculateDistance(touch);
        
        if (duration < 300 && distance < 50) {
            this.handleTap(touch);
        } else if (distance > 50) {
            this.handleSwipe(touch);
        } else {
            this.handleHold(touch);
        }
    }
}
```

### Responsive Design Integration
```javascript
class ResponsiveManager {
    constructor() {
        this.breakpoints = {
            mobile: 768,
            tablet: 1024,
            desktop: 1200
        };
        
        this.setupResizeHandlers();
    }
    
    getCurrentBreakpoint() {
        const width = window.innerWidth;
        if (width < this.breakpoints.mobile) return 'mobile';
        if (width < this.breakpoints.tablet) return 'tablet';
        return 'desktop';
    }
    
    adaptUI() {
        const breakpoint = this.getCurrentBreakpoint();
        this.scaleUI(breakpoint);
        this.adjustTouchTargets(breakpoint);
        this.optimizePerformance(breakpoint);
    }
}
```

## 🔧 Configuration Architecture

### Configuration Management
```javascript
const CONFIG = {
    GAME: {
        targetFPS: 60,
        debugMode: false,
        autoSave: true
    },
    
    GRAPHICS: {
        particleCount: 'normal',
        shadowQuality: 'normal',
        animationSpeed: 1.0
    },
    
    PHYSICS: {
        collisionOptimization: true,
        spatialPartitioning: true,
        maxEntities: 1000
    },
    
    MOBILE: {
        touchSensitivity: 1.0,
        hapticFeedback: true,
        adaptiveQuality: true
    }
};
```

### Dynamic Configuration
```javascript
class ConfigManager {
    static adapt(deviceCapabilities) {
        if (deviceCapabilities.isLowEnd) {
            CONFIG.GRAPHICS.particleCount = 'low';
            CONFIG.GRAPHICS.shadowQuality = 'off';
            CONFIG.PHYSICS.maxEntities = 500;
        }
        
        if (deviceCapabilities.isMobile) {
            CONFIG.MOBILE.adaptiveQuality = true;
            CONFIG.GAME.targetFPS = 30;
        }
    }
}
```

## 🧪 Testing Architecture

### Test Structure
```
tests/
├── unit/           # Individual component tests
├── integration/    # System interaction tests
├── performance/    # Performance benchmarks
├── ui/            # User interface tests
├── fixtures/      # Test data and mocks
└── utils/         # Testing utilities
```

### Mock Architecture
```javascript
class MockGame {
    constructor() {
        this.resources = { dharma: 1000, bandwidth: 500, anonymity: 250 };
        this.gameState = { lives: 10, wave: 1, score: 0 };
        this.defenseManager = new MockDefenseManager();
        this.enemies = [];
    }
    
    // Simplified mock implementations
    addResources(resources) { /* ... */ }
    spawnEnemy(type, x, y) { /* ... */ }
    updateSystems(deltaTime) { /* ... */ }
}
```

### Test Utilities
```javascript
const TestAssertions = {
    assertTrue: (condition, message) => {
        if (!condition) throw new Error(`Assertion Error: ${message}`);
    },
    assertEqual: (actual, expected, message) => {
        if (actual !== expected) {
            throw new Error(`Expected: ${expected}, Actual: ${actual}`);
        }
    }
};
```

## 🔒 Security Architecture

### Input Validation
```javascript
class InputValidator {
    static validateDefensePlacement(x, y, type) {
        // Boundary checking
        if (x < 0 || x > GAME_WIDTH || y < 0 || y > GAME_HEIGHT) {
            return { valid: false, error: 'Out of bounds' };
        }
        
        // Type validation
        if (!DEFENSE_TYPES.includes(type)) {
            return { valid: false, error: 'Invalid defense type' };
        }
        
        return { valid: true };
    }
}
```

### Save Data Integrity
```javascript
class SaveValidator {
    static validateSaveData(data) {
        const schema = {
            resources: { dharma: 'number', bandwidth: 'number' },
            gameState: { lives: 'number', wave: 'number' },
            achievements: 'array'
        };
        
        return this.validateSchema(data, schema);
    }
}
```

## 📊 Monitoring and Analytics

### Performance Monitoring
```javascript
class PerformanceMonitor {
    constructor() {
        this.frameTime = 0;
        this.entityCount = 0;
        this.memoryUsage = 0;
    }
    
    startFrame() {
        this.frameStart = performance.now();
    }
    
    endFrame() {
        this.frameTime = performance.now() - this.frameStart;
        
        if (this.frameTime > 16.67) { // 60 FPS threshold
            console.warn(`Slow frame: ${this.frameTime}ms`);
        }
    }
}
```

### Analytics Events
```javascript
class GameAnalytics {
    trackEvent(eventType, properties) {
        const event = {
            type: eventType,
            properties: properties,
            timestamp: Date.now(),
            sessionId: this.sessionId
        };
        
        this.eventQueue.push(event);
    }
}
```

## 🔮 Extension Architecture

### Plugin System Design
```javascript
class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.hooks = new Map();
    }
    
    registerPlugin(name, plugin) {
        this.plugins.set(name, plugin);
        plugin.initialize();
    }
    
    executeHook(hookName, ...args) {
        const hooks = this.hooks.get(hookName) || [];
        return hooks.reduce((result, hook) => hook(result, ...args), args[0]);
    }
}
```

### Extensibility Points
- **Defense Types**: Add new defense behaviors
- **Enemy Types**: Create custom enemy AI
- **Achievement Types**: Define new achievement categories
- **UI Themes**: Custom visual themes
- **Audio Packs**: Alternative sound effects and music

## 📚 Architectural Decisions

### ADR-001: Event-Driven Architecture
**Status**: Accepted
**Context**: Need for loose coupling between systems
**Decision**: Use event-driven pub/sub pattern
**Consequences**: Better modularity, some performance overhead

### ADR-002: No Framework Dependency
**Status**: Accepted
**Context**: Minimize bundle size and complexity
**Decision**: Vanilla JavaScript with custom utilities
**Consequences**: More development effort, better performance

### ADR-003: Canvas Rendering
**Status**: Accepted
**Context**: Need for high-performance 2D graphics
**Decision**: HTML5 Canvas with manual rendering pipeline
**Consequences**: Better performance, more complex rendering code

### ADR-004: Object Pooling
**Status**: Accepted
**Context**: Frequent allocation/deallocation of game objects
**Decision**: Implement object pools for projectiles and particles
**Consequences**: Better GC performance, more memory usage

## 🔄 Future Architecture Evolution

### Planned Improvements
1. **WebGL Rendering**: Upgrade to WebGL for better performance
2. **Web Workers**: Offload AI computation to background threads
3. **Service Workers**: Implement offline capabilities
4. **WebAssembly**: High-performance pathfinding algorithms

### Scalability Considerations
- **Component-Entity System**: For more complex game objects
- **Networking Layer**: Preparation for multiplayer features
- **Asset Streaming**: Dynamic loading of game content
- **Modding Support**: User-generated content system

---

*This architecture documentation serves as the technical foundation for understanding and extending the Dharmapala Shield game. May your code be as structured as a well-built temple.* 🏛️✨