# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dharmapala Shield is a Buddhist Cyberpunk Tower Defense game built with vanilla JavaScript (ES modules), HTML5 Canvas, and CSS. The game combines ancient Buddhist philosophy with futuristic cyberpunk aesthetics, where players defend digital realms using mindfulness-based defense systems.

There is no application framework (no React/Vue/etc.). The code is plain ES6+ modules loaded directly in the browser. **Vite** is used as the dev server and bundler, but the source is authored to also run unbundled — every script in `index.html` is loaded as a native `<script type="module">`.

## Development Commands

### Running the Game

The repository now ships a `package.json` with a Vite-based workflow:

```bash
# Install dependencies (first time only)
npm install

# Start the Vite dev server (http://localhost:5173)
npm run dev

# Produce a production bundle in dist/
npm run build

# Preview the production build (http://localhost:5174)
npm run preview
```

Because all scripts are native ES modules, you can also serve the project with any static file server without Vite:

```bash
# Serve locally with Python
python -m http.server 8000
# Navigate to http://localhost:8000

# Alternative with Node.js
npx http-server -p 8000
```

> Note: opening `index.html` directly via `file://` will not work — ES modules require an HTTP origin.

### Testing

Tests are HTML harnesses opened in the browser (no test runner CLI):

```bash
# Open the main test runner in a browser
open tests/test-runner.html

# Run specific test categories
open tests/unit/test-achievement-accessibility.html
open tests/integration/boss-warning-sync-test.html
open tests/performance/pathgenerator-performance-test.html
```

### Code Quality

No linting or type-checking is configured. Vite handles bundling for production but performs no type checking. When making changes, test manually by running the game (`npm run dev`) and using the test harnesses under `tests/`.

## Architecture Overview

### Module System & Entry Points
- The HTML entry is `index.html`, which loads modules in dependency order ending with `js/main.js`.
- `src/main.js` is the Vite entry shim — it imports `GameBootstrap` from `js/main.js` and calls `bootstrap.init()` on `DOMContentLoaded`.
- `js/main.js` (`GameBootstrap` class) wires together the core systems and drives a promise-based, consolidated initialization. The legacy inline "emergency fallback" has been replaced by `js/EmergencyHandler.js`.
- Modules communicate through ES `import`/`export`. Some core singletons are exported as named instances (e.g. `camera`, `inputManager`, `particleSystem`, `projectilePool`, `spriteManager`), while managers are exported as default classes.

### Core Game Loop
- **Bootstrap**: `js/main.js` (`GameBootstrap`) — initialization and system wiring
- **Game Controller**: `js/game.js` — main game loop and coordination
- **System Management**: `js/GameSystemManager.js` — initializes and preserves core system instances

### Key Systems
- **Screen Management**: `js/ScreenManager.js` — UI navigation and screen transitions
- **Defense Management**: `js/DefenseManager.js` — tower placement, upgrades, targeting
- **UI Management**: `js/UIManager.js` — HUD, notifications, resource displays
- **Achievement System**: `js/achievementManager.js` — progress tracking and unlocks
- **Input**: `js/input.js` (`inputManager`) — pointer/touch/keyboard handling (supports synthetic touch events)
- **Camera**: `js/camera.js` (`camera`) — viewport/pan/zoom

### Initialization & Resilience Systems
- **Emergency Handling**: `js/EmergencyHandler.js` — fallback that shows the main menu if init stalls
- **Error Notifications**: `js/ErrorNotificationManager.js` — surfaces runtime errors to the player
- **Loading**: `js/LoadingScreenManager.js`, `js/loadingManager.js`, `js/ProgressIndicatorManager.js`
- **Asset Loading**: `js/AssetLoader.js`, `js/imageOptimizer.js`

### Game Entities
- **Defenses**: `js/defense.js` — 6 defense types (firewall, encryption, decoy, mirror, anonymity, distributor)
- **Enemies**: `js/enemy.js` — AI-driven enemies with multiple types including boss mechanics
- **Bosses**: `js/Boss.js` — multi-phase boss encounters with special abilities
- **Projectiles**: `js/Projectile.js` — projectile physics with object pooling (`projectilePool`)
- **Particles**: `js/particle.js` (`particleSystem`) — visual effects
- **Sprites**: `js/sprite.js` (`spriteManager`) — sprite rendering/animation
- **Levels**: `js/level.js` — level/wave orchestration

### Configuration System
- **Main Config**: `js/config.js` — comprehensive game configuration including:
  - Defense types and upgrade trees
  - Enemy types and AI behaviors
  - Wave progression (`CONFIG.WAVES`, with `MAX_WAVES: 10`)
  - Boss phase configurations
  - Path generation parameters
  - Achievement categories

### Path Generation & Validation
- **Path Generation**: `js/pathGenerator.js` — dynamic path creation with theme-based obstacles
- **Path Preservation**: `js/levelPathPreservation.js` — keeps level paths stable across regeneration
- **Path Validation**: `js/flexiblePathValidation.js` (+ `js/validationConfigExamples.js`)
- > `js/pathGenerator_backup.js` is a large historical backup — do not edit it; treat `js/pathGenerator.js` as the source of truth.

### Boss & Achievement Subsystems
- **Boss Phase Transitions**: `js/bossPhaseTransitionManager.js`
- **Boss Warning Sync**: `js/bossWarningSynchronizer.js`
- **Upgrade Tree Cleanup**: `js/upgradeTreeCleanupManager.js`
- **Achievement Gallery**: `js/enhancedAchievementGallery.js`, `js/enhancedAchievementGalleryAPI.js`
- **Achievement Accessibility**: `js/achievementNotificationAccessibility.js`
- **Achievement Integration Example**: `js/achievementIntegrationExample.js` (reference/usage sample)

### Support Systems
- **Audio**: `js/audioManager.js` — sound effects and music
- **Save System**: `js/saveSystem.js` — local-storage-based persistence
- **Mobile Support**: `js/mobile.js` — touch controls and responsive design
- **Utilities**: `js/utils.js` — shared helpers (imported by most modules)

## Key Features & Mechanics

### Defense Types
1. **Firewall Fortress** - Basic damage dealing
2. **Encryption Monastery** - Multi-target with slow effects
3. **Decoy Temple** - Misdirection and confusion
4. **Mirror Server** - Reflects attacks back to enemies
5. **Anonymity Shroud** - Cloaking and stealth fields
6. **Dharma Distributor** - Boosts other defenses

### Enemy Types
Enemy ids in `CONFIG` (see `js/config.js`):
- **Script Kiddie** (`scriptKiddie`) - Fast, erratic movement
- **Federal Agent** (`federalAgent`) - Armored with persistent pathfinding
- **Corporate Saboteur** (`corporateSaboteur`) - Stealth capabilities
- **AI Surveillance** (`aiSurveillance`) - Marks targets for increased damage
- **Quantum Hacker** (`quantumHacker`) - Phase-shifting abilities
- **Corrupted Monk** (`corruptedMonk`) - Healing aura and corruption spread
- **Raid Team** (`raidTeam`, boss) - Multi-phase with minion spawning
- **MegaCorp Titan** (`megaCorp`, boss) - Heavy armor with drone deployment

### Resource System
- **Dharma** (💎) - Primary currency for defenses
- **Bandwidth** (📡) - Required for advanced abilities
- **Anonymity** (👤) - Needed for elite cyber-monk defenses

## Repository Layout

```
.
├── index.html                 # HTML entry; loads js/*.js as ES modules
├── package.json               # npm scripts (dev/build/preview) — Vite
├── vite.config.js             # Vite config (root '.', outDir 'dist')
├── src/
│   └── main.js                # Vite entry shim → imports js/main.js
├── dist/                      # Vite build output (generated)
├── js/                        # Game source (40+ ES modules)
├── css/                       # Stylesheets
├── assets/images/            # Image assets
├── tests/                    # Browser-based test harnesses
├── docs/                     # Architecture + archived implementation notes
├── README.md                 # Player- and contributor-facing overview
└── CLEANUP_SUMMARY.md        # History of a prior codebase cleanup
```

### JavaScript Structure (`js/`)
```
js/
├── main.js                       # GameBootstrap — initialization & wiring
├── game.js                       # Main game loop
├── GameSystemManager.js          # System coordination
├── ScreenManager.js              # UI navigation
├── DefenseManager.js             # Defense management
├── UIManager.js                  # HUD / interface updates
├── config.js                     # Game configuration
├── utils.js                      # Shared utilities
├── defense.js                    # Defense tower logic
├── enemy.js                      # Enemy AI and behavior
├── Boss.js                       # Boss mechanics
├── Projectile.js                 # Projectile physics (pooled)
├── particle.js                   # Particle effects
├── sprite.js                     # Sprite manager
├── camera.js                     # Camera / viewport
├── input.js                      # Input manager (touch/pointer/keyboard)
├── level.js                      # Level / wave orchestration
├── achievementManager.js         # Achievement system
├── enhancedAchievementGallery.js # Achievement gallery UI
├── enhancedAchievementGalleryAPI.js
├── achievementNotificationAccessibility.js
├── pathGenerator.js              # Dynamic path generation (source of truth)
├── pathGenerator_backup.js       # Historical backup — do not edit
├── levelPathPreservation.js      # Path stability across regeneration
├── flexiblePathValidation.js     # Path validation
├── validationConfigExamples.js   # Validation config samples
├── bossPhaseTransitionManager.js # Boss phase transitions
├── bossWarningSynchronizer.js    # Boss warning sync
├── upgradeTreeCleanupManager.js  # Upgrade tree lifecycle
├── EmergencyHandler.js           # Init fallback
├── ErrorNotificationManager.js   # Runtime error surfacing
├── LoadingScreenManager.js       # Loading screen
├── loadingManager.js             # Loading orchestration
├── ProgressIndicatorManager.js   # Progress indicators
├── AssetLoader.js                # Asset loading
├── imageOptimizer.js             # Image optimization
├── audioManager.js               # Audio
├── saveSystem.js                 # Save/load
├── mobile.js                     # Mobile optimizations
└── achievementIntegrationExample.js
```

### CSS Structure (`css/`)
```
css/
├── styles.css                       # Main game styling
├── ui-screens.css                   # Menu and screen layouts
├── main-menu.css                    # Main menu styles
├── game-header.css                  # In-game header/HUD
├── mobile.css                       # Mobile responsive design
├── loading.css                      # Loading screen animations
├── debug-screens.css                # Debug overlays
├── achievementAccessibility.css     # Accessibility styling
├── enhancedAchievementGallery.css   # Achievement gallery
└── bossWarningSynchronization.css   # Boss warning visuals
```

### Test Structure (`tests/`)
```
tests/
├── test-runner.html          # Main test interface
├── unit/                     # Component-level tests
├── integration/              # System interaction tests
├── performance/              # Performance benchmarks
├── ui/                       # UI and accessibility tests
├── manual/                   # Manual / exploratory test pages
├── setup/                    # Test setup (e.g. gameTestSetup.js)
├── fixtures/                 # Test data
└── mocks/                    # Mock implementations
```

## Development Guidelines

### Code Conventions
- **ES Modules**: Use `import`/`export`. Default-export manager classes; export shared singletons as named instances (mirror `camera`, `inputManager`, `particleSystem`, etc.).
- **Modular Design**: Single responsibility, loose coupling.
- **Event-Driven**: Pub/sub patterns for cross-system communication.
- **Performance-First**: Object pooling (projectiles, particles), efficient canvas rendering.
- **No transpilation needed**: Code runs as authored in modern browsers; Vite only bundles for production.

### Keeping `index.html` In Sync
When adding a new top-level module that must load at startup, add a `<script type="module" src="js/yourModule.js"></script>` entry to `index.html` in the correct dependency order (config/support first, game logic later, `js/main.js` last). Modules imported transitively by another module do **not** need their own `<script>` tag.

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
4. Add accessibility support in `js/achievementNotificationAccessibility.js`
5. Test with the achievement test suite

### Performance Considerations
- **Object Pooling**: Used for projectiles (`projectilePool`) and particles
- **Spatial Partitioning**: For efficient collision detection
- **Canvas Optimization**: Batched rendering operations
- **Mobile Optimization**: Reduced effects on low-end devices

### Testing Strategy
- **Unit Tests**: Individual component functionality
- **Integration Tests**: System interactions and workflows
- **Performance Tests**: Optimization and memory-usage validation
- **UI/Accessibility Tests**: Screen-reader compatibility and visual regression

### Browser Compatibility
- **Primary**: Chrome/Chromium (recommended)
- **Supported**: Firefox, Safari, Edge
- **Requirements**: ES6 modules, Canvas 2D API, Local Storage, Touch Events (mobile)

## Common Development Tasks

### Adding a Boss Phase
1. Define phase in the boss config with health thresholds and abilities
2. Implement phase logic in `js/Boss.js`
3. Add phase-transition handling in `js/bossPhaseTransitionManager.js`
4. Update the boss warning system (`js/bossWarningSynchronizer.js`) if needed

### Path Generation Customization
1. Modify `CONFIG.LEVEL_PATHS` for level-specific path behavior
2. Adjust `CONFIG.PATH_GENERATION` for global parameters
3. Use `js/pathGenerator.js` for custom path algorithms (never `pathGenerator_backup.js`)
4. Validate via `js/flexiblePathValidation.js` and `js/levelPathPreservation.js`

### Mobile Optimization
1. Update responsive breakpoints in `js/mobile.js`
2. Adjust touch-target sizes in CSS
3. Test on various device sizes using browser dev tools
4. Validate touch gesture recognition (including synthetic touch events handled in `js/input.js`)

## Troubleshooting

### Common Issues
- **Game won't start**: Check the browser console for module/load errors; ensure the project is served over HTTP (not `file://`).
- **Touch controls not working**: Verify handlers in `js/input.js` and `js/mobile.js`.
- **Save/load issues**: Check browser local-storage permissions and quota.
- **Performance problems**: Profile with dev tools; verify object pooling and batched rendering.

### Emergency Fallback
Initialization is promise-driven in the ESM entry. `js/EmergencyHandler.js` shows the main menu if initialization stalls, replacing the old inline fallback that previously lived in `index.html`.

## Documentation Map
- `README.md` — player- and contributor-facing overview and how-to-play.
- `docs/ARCHITECTURE.md` — technical architecture deep dive.
- `docs/REFACTORING_GUIDE.md` — refactoring notes.
- `docs/CONSOLE_ERRORS_RESOLVED.md` — record of resolved console errors.
- `docs/archive/` — historical implementation notes for individual features.
- `CLEANUP_SUMMARY.md` — record of a prior cleanup that removed `*_simplified.js`/`*_original.js` duplicates. Always work with the suffix-free files (`game.js`, `enemy.js`, `defense.js`, etc.).

## Buddhist Philosophy Integration

The game integrates Buddhist concepts throughout:
- **Compassionate Protection**: Defenses protect rather than destroy
- **Mindful Strategy**: Thoughtful placement over aggressive tactics
- **Digital Dharma**: Ancient wisdom applied to cyberpunk technology
- **Meditation Elements**: Zen gardens, lotus cannons, mandala shields
- **Non-Violence**: Enemies are "redirected" rather than killed

This philosophical foundation should be preserved when adding new content or features.
