# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dharmapala Shield is a Buddhist Cyberpunk Tower Defense game built with vanilla JavaScript, HTML5 Canvas, and CSS. The game combines ancient Buddhist philosophy with futuristic cyberpunk aesthetics, where players defend digital realms using mindfulness-based defense systems.

## Development Commands

### Running the Game
```bash
# Serve locally with Python
python -m http.server 8000
# Navigate to http://localhost:8000

# Alternative with Node.js
npx http-server -p 8000
```

### Testing
```bash
# Open main test runner in browser
open tests/test-runner.html

# Run specific test categories
open tests/unit/test-achievement-accessibility.html
open tests/integration/boss-warning-sync-test.html
open tests/performance/pathgenerator-performance-test.html
```

### Code Quality
This project uses no build tools - all code runs directly in the browser. No linting or type checking commands are configured. When making changes, test manually by running the game and using the comprehensive test suite.

## Architecture Overview

### Core Game Loop
- **Entry Point**: `js/main.js` (GameBootstrap class)
- **Game Controller**: `js/game.js` (main game loop and coordination)
- **System Management**: `js/GameSystemManager.js` (initializes core systems)

### Key Systems
- **Screen Management**: `js/ScreenManager.js` - handles UI navigation and screen transitions
- **Defense Management**: `js/DefenseManager.js` - manages tower placement, upgrades, targeting
- **UI Management**: `js/UIManager.js` - updates HUD, notifications, resource displays
- **Achievement System**: `js/achievementManager.js` - tracks progress and unlocks

### Game Entities
- **Defenses**: `js/defense.js` - tower defense logic with 6 unique types (firewall, encryption, decoy, mirror, anonymity, distributor)
- **Enemies**: `js/enemy.js` - AI-driven enemies with 8 types including boss mechanics
- **Bosses**: `js/Boss.js` - multi-phase boss encounters with special abilities
- **Projectiles**: `js/Projectile.js` - weapon projectiles with collision detection

### Configuration System
- **Main Config**: `js/config.js` - comprehensive game configuration including:
  - Defense types and upgrade trees
  - Enemy types and AI behaviors
  - Wave progression (15 waves total)
  - Boss phase configurations
  - Path generation parameters
  - Achievement categories

### Support Systems
- **Path Generation**: `js/pathGenerator.js` - dynamic path creation with theme-based obstacles
- **Audio**: `js/audioManager.js` - sound effects and music management
- **Save System**: `js/saveSystem.js` - local storage-based game persistence
- **Mobile Support**: `js/mobile.js` - touch controls and responsive design

## Key Features & Mechanics

### Defense Types
1. **Firewall Fortress** - Basic damage dealing
2. **Encryption Monastery** - Multi-target with slow effects
3. **Decoy Temple** - Misdirection and confusion
4. **Mirror Server** - Reflects attacks back to enemies
5. **Anonymity Shroud** - Cloaking and stealth fields
6. **Dharma Distributor** - Boosts other defenses

### Enemy Types
- **Script Kiddie** - Fast, erratic movement
- **Federal Agent** - Armored with persistent pathfinding
- **Corporate Saboteur** - Stealth capabilities
- **AI Surveillance** - Marks targets for increased damage
- **Quantum Hacker** - Phase-shifting abilities
- **Corrupted Monk** - Healing aura and corruption spread
- **Raid Team** (Boss) - Multi-phase with minion spawning
- **MegaCorp Titan** (Boss) - Heavy armor with drone deployment

### Resource System
- **Dharma** (💎) - Primary currency for defenses
- **Bandwidth** (📡) - Required for advanced abilities
- **Anonymity** (👤) - Needed for elite cyber-monk defenses

## File Organization

### JavaScript Structure
```
js/
├── main.js                    # Game bootstrap and initialization
├── game.js                    # Main game loop
├── GameSystemManager.js       # System coordination
├── ScreenManager.js           # UI navigation
├── DefenseManager.js          # Defense management
├── UIManager.js              # User interface updates
├── config.js                 # Game configuration
├── utils.js                  # Shared utilities
├── defense.js                # Defense tower logic
├── enemy.js                  # Enemy AI and behavior
├── Boss.js                   # Boss mechanics
├── Projectile.js             # Projectile physics
├── achievementManager.js     # Achievement system
├── pathGenerator.js          # Dynamic path generation
├── audioManager.js           # Audio management
├── saveSystem.js             # Save/load functionality
├── mobile.js                 # Mobile optimizations
└── [support modules...]      # Additional systems
```

### CSS Structure
```
css/
├── styles.css                # Main game styling
├── ui-screens.css            # Menu and screen layouts
├── main-menu.css             # Main menu specific styles
├── mobile.css                # Mobile responsive design
├── loading.css               # Loading screen animations
└── [feature-specific.css]    # Achievement gallery, boss warnings, etc.
```

### Test Structure
```
tests/
├── test-runner.html          # Main test interface
├── unit/                     # Component-level tests
├── integration/              # System interaction tests
├── performance/              # Performance benchmarks
├── ui/                       # UI and accessibility tests
├── fixtures/                 # Test data
└── mocks/                    # Mock implementations
```

## Development Guidelines

### Code Conventions
- **ES6+ JavaScript**: Modern syntax with classes and modules
- **Modular Design**: Single responsibility principle, loose coupling
- **Event-Driven**: Pub/sub pattern for system communication
- **Performance-First**: Object pooling, efficient rendering
- **No Build Tools**: Direct browser execution, no transpilation

### Adding New Features

#### New Defense Type
1. Add configuration to `CONFIG.DEFENSE_TYPES` in `js/config.js`
2. Implement behavior in `js/defense.js`
3. Add upgrade tree to `CONFIG.UPGRADE_TREES`
4. Update UI elements in `index.html` defense panel
5. Add visual assets and CSS styling

#### New Enemy Type
1. Define enemy config in `CONFIG.ENEMY_TYPES` in `js/config.js`
2. Implement AI behavior in `js/enemy.js`
3. Add to wave configurations in `CONFIG.WAVES`
4. Create visual representation and animations

#### New Achievement
1. Add to achievement system in `js/achievementManager.js`
2. Define category in `CONFIG.ACHIEVEMENT_CATEGORIES`
3. Implement tracking events and unlock conditions
4. Test with achievement test suite

### Performance Considerations
- **Object Pooling**: Used for projectiles and particles
- **Spatial Partitioning**: For efficient collision detection
- **Canvas Optimization**: Batched rendering operations
- **Mobile Optimization**: Reduced effects on low-end devices

### Testing Strategy
- **Unit Tests**: Individual component functionality
- **Integration Tests**: System interactions and workflows
- **Performance Tests**: Optimization and memory usage validation
- **UI/Accessibility Tests**: Screen reader compatibility and visual regression

### Browser Compatibility
- **Primary**: Chrome/Chromium (recommended)
- **Supported**: Firefox, Safari, Edge
- **Requirements**: ES6 classes, Canvas 2D API, Local Storage, Touch Events (mobile)

## Common Development Tasks

### Adding a Boss Phase
1. Define phase in `CONFIG.BOSS_PHASES` with health thresholds and abilities
2. Implement phase logic in `js/Boss.js`
3. Add phase transition handling in `js/bossPhaseTransitionManager.js`
4. Update boss warning system if needed

### Path Generation Customization
1. Modify `CONFIG.LEVEL_PATHS` for level-specific path behavior
2. Adjust `CONFIG.PATH_GENERATION` for global parameters
3. Use `js/pathGenerator.js` for custom path algorithms
4. Test with path validation system

### Mobile Optimization
1. Update responsive breakpoints in `js/mobile.js`
2. Adjust touch target sizes in CSS
3. Test on various device sizes using browser dev tools
4. Validate touch gesture recognition

### Achievement System Extension
1. Define new achievement categories in config
2. Implement tracking in `js/achievementManager.js`
3. Add accessibility support in `js/achievementNotificationAccessibility.js`
4. Test with screen readers and keyboard navigation

## Troubleshooting

### Common Issues
- **Game won't start**: Check browser console for JavaScript errors, ensure all files are served over HTTP
- **Touch controls not working**: Verify touch event handlers in `js/mobile.js`
- **Save/load issues**: Check browser local storage permissions and quota
- **Performance problems**: Monitor with browser dev tools, check object pooling and rendering optimizations

### Emergency Fallback
The game includes emergency fallback systems in `js/main.js` that automatically show the main menu if initialization fails within 2 seconds.

## Buddhist Philosophy Integration

The game integrates Buddhist concepts throughout:
- **Compassionate Protection**: Defenses protect rather than destroy
- **Mindful Strategy**: Thoughtful placement over aggressive tactics  
- **Digital Dharma**: Ancient wisdom applied to cyberpunk technology
- **Meditation Elements**: Zen gardens, lotus cannons, mandala shields
- **Non-Violence**: Enemies are "redirected" rather than killed

This philosophical foundation should be preserved when adding new content or features.