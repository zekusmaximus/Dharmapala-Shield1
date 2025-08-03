# 🛡️ Dharmapala Shield

> *A Buddhist Cyberpunk Tower Defense Game*

Defend the digital realm with ancient wisdom and cutting-edge technology. Place mystical defense towers, battle corrupted entities, and protect the sacred servers from digital defilement.

## 🌸 Overview

Dharmapala Shield is a unique tower defense game that blends Buddhist philosophy with cyberpunk aesthetics. Players use mindfulness-based defenses to protect against waves of digital threats, earning dharma, bandwidth, and anonymity resources while progressing through increasingly challenging levels.

### Key Features

- **🧘 Buddhist-Cyberpunk Fusion**: Unique aesthetic combining ancient wisdom with futuristic technology
- **🏗️ Strategic Defense Placement**: Six unique defense types with distinct abilities and upgrade paths
- **👾 Diverse Enemy Types**: From script kiddies to quantum hackers, each with unique behaviors
- **👑 Epic Boss Battles**: Multi-phase boss encounters with dynamic abilities
- **🏆 Achievement System**: Track progress and unlock rewards across multiple categories
- **📱 Mobile-First Design**: Touch controls and responsive design for all devices
- **💾 Progressive Saves**: Automatic save system preserves your meditation journey

## 🚀 Quick Start

### Prerequisites

- Modern web browser with ES6+ support
- Canvas API support
- Local storage enabled
- Touch events (for mobile play)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/dharmapala-shield.git
   cd dharmapala-shield
   ```

2. **Open the Game**
   - Open `index.html` in your web browser
   - Or serve with a local web server:
     ```bash
     python -m http.server 8000
     # Navigate to http://localhost:8000
     ```

3. **Start Playing**
   - Click "New Game" to begin your meditation journey
   - Place defenses by clicking/tapping on the game field
   - Survive waves of digital corruption
   - Earn resources and upgrade your defenses

## 🎮 How to Play

### Resources

- **🧘 Dharma**: Primary currency for placing and upgrading defenses
- **📡 Bandwidth**: Required for advanced defenses and special abilities
- **🔒 Anonymity**: Rare resource needed for elite cyber-monk defenses

### Defense Types

1. **🪷 Lotus Cannon** - Basic energy defense, cost-effective and reliable
2. **🌀 Mandala Shield** - Protective barrier that slows enemies
3. **🌸 Zen Garden** - Meditative tower that grows stronger over time  
4. **⚛️ Quantum Pagoda** - Advanced tower effective against phase-shifted enemies
5. **☸️ Dharma Wheel** - Spinning wheel of justice that pierces armor
6. **🤖 Cyber Monk** - Elite defensive unit with multiple attack modes

### Enemy Types

- **Script Kiddie**: Fast, erratic movement patterns
- **Federal Agent**: Persistent, speeds up near defenses
- **Corporate Saboteur**: Stealth capabilities, periodically invisible
- **AI Surveillance**: Adaptive scanning, learns from defense patterns
- **Quantum Hacker**: Phase-shifting and teleportation abilities
- **Corrupted Monk**: Healing aura, corrupts nearby defenses

### Boss Encounters

- **Raid Team**: Spawns minions and uses EMP bursts
- **Mega Corp**: Shield regeneration and market manipulation
- **Corrupted Monk**: Corruption fields and meditation storms

### Controls

#### Desktop
- **Left Click**: Place defense / Select UI elements
- **Right Click**: Cancel placement / Context menu
- **Mouse Wheel**: Zoom in/out
- **Space**: Pause/Resume game
- **ESC**: Open main menu

#### Mobile
- **Tap**: Place defense / Select
- **Hold**: Show defense info / Context menu
- **Pinch**: Zoom in/out
- **Swipe**: Pan camera
- **Touch Controls**: Access pause, menu, upgrade modes

## 🏗️ Architecture

The game follows a modular architecture designed for maintainability and extensibility:

### Core Systems

```
js/
├── main.js                    # Game bootstrap and initialization
├── game.js                    # Main game loop and coordination
├── GameSystemManager.js       # System initialization and management
├── ScreenManager.js           # Screen navigation and UI flow
├── DefenseManager.js          # Defense placement and management
├── UIManager.js              # User interface updates and notifications
├── utils.js                  # Shared utility functions
└── config.js                 # Game configuration and constants
```

### Gameplay Components

```
js/
├── defense.js                # Defense tower logic and behavior
├── enemy.js                  # Enemy AI and movement
├── Boss.js                   # Boss mechanics and phase transitions
├── Projectile.js             # Projectile physics and collision
├── level.js                  # Level progression and wave management
└── pathGenerator.js          # Dynamic path generation
```

### Support Systems

```
js/
├── achievementManager.js             # Achievement tracking and rewards
├── audioManager.js                   # Sound effects and music
├── saveSystem.js                     # Save/load game state
├── particle.js                       # Visual effects system
├── sprite.js                         # Sprite rendering and animation
├── camera.js                         # Viewport and camera controls
├── input.js                          # Input handling and mapping
├── mobile.js                         # Mobile-specific functionality
├── imageOptimizer.js                 # Asset optimization
└── loadingManager.js                 # Asset loading and progress
```

### Styling

```
css/
├── styles.css          # Main game styling and theming
├── ui-screens.css      # Menu and screen layouts
├── mobile.css          # Mobile-responsive design
└── loading.css         # Loading screen animations
```

## 🔧 Development

### Project Structure

```
dharmapala-shield/
├── index.html              # Main game entry point
├── README.md              # This documentation
├── js/                    # JavaScript game logic
├── css/                   # Stylesheets and theming
├── assets/                # Game assets (images, sounds)
├── tests/                 # Test suite and fixtures
└── docs/                  # Additional documentation
```

### Code Style

- **ES6+ JavaScript**: Modern syntax with classes and modules
- **Modular Design**: Single responsibility principle, loose coupling
- **Event-Driven**: Pub/sub pattern for system communication
- **Performance-First**: Object pooling, efficient rendering
- **Mobile-Friendly**: Touch controls, responsive design

### Key Design Patterns

1. **Module Pattern**: Each system is self-contained with clear interfaces
2. **Observer Pattern**: Event-driven communication between systems
3. **State Machine**: Boss phases and game states
4. **Object Pool**: Reuse projectiles and particles for performance
5. **Factory Pattern**: Dynamic enemy and defense creation

### Adding New Content

#### New Defense Type

1. Add configuration to `defense.js`
2. Implement special abilities in defense update loop
3. Add sprite assets and UI icons
4. Update cost balancing and upgrade paths

#### New Enemy Type

1. Define enemy config in `enemy.js`
2. Implement unique abilities and behaviors
3. Add AI patterns and movement logic
4. Create visual assets and animations

#### New Achievement

1. Add achievement definition to `achievementManager.js`
2. Define tracking events and requirements
3. Implement reward logic
4. Test progression and unlock conditions

## 🧪 Testing

The game includes a comprehensive test suite covering:

- **Unit Tests**: Individual component functionality
- **Integration Tests**: System interactions and workflows  
- **Performance Tests**: Optimization and memory usage
- **UI Tests**: Accessibility and visual regression

### Running Tests

1. Open `tests/test-runner.html` in your browser
2. Select test categories to run
3. View results and coverage reports

### Test Structure

```
tests/
├── unit/           # Component-level tests
├── integration/    # System integration tests
├── performance/    # Performance benchmarks
├── ui/            # UI and accessibility tests
├── fixtures/      # Test data and configurations
├── mocks/         # Mock implementations
└── utils/         # Test utilities and helpers
```

## 📱 Mobile Support

The game is designed mobile-first with:

- **Touch Controls**: Intuitive tap, hold, and swipe gestures
- **Responsive Design**: Adapts to all screen sizes and orientations
- **Performance Optimization**: Reduced effects on low-end devices
- **Accessibility**: High contrast mode and reduced motion support
- **Progressive Enhancement**: Graceful degradation for older devices

### Mobile-Specific Features

- Virtual action buttons for common commands
- Automatic orientation locking to landscape
- Low-power mode detection and optimization
- Touch gesture recognition (tap, hold, swipe, pinch)
- Haptic feedback support where available

## 🌐 Browser Compatibility

- **Chrome/Chromium**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support (iOS/macOS)
- **Edge**: Full support
- **Older Browsers**: Graceful degradation with feature detection

### Required Browser Features

- ES6 Classes and Modules
- Canvas 2D API
- Local Storage
- Touch Events (mobile)
- Web Audio API (optional)
- Vibration API (optional)

## 🔧 Configuration

Game settings can be customized in `js/config.js`:

```javascript
const CONFIG = {
    GAME: {
        targetFPS: 60,
        debugMode: false,
        autoSave: true,
        difficulty: 'normal'
    },
    
    GRAPHICS: {
        particleCount: 'normal',
        shadowQuality: 'normal',
        animationSpeed: 1.0
    },
    
    AUDIO: {
        masterVolume: 1.0,
        sfxVolume: 0.8,
        musicVolume: 0.6
    }
};
```

## 🚀 Performance Optimization

The game includes several performance optimizations:

- **Object Pooling**: Reuse projectiles and particles
- **Efficient Rendering**: Canvas optimization and batching
- **Asset Optimization**: Image compression and sprite atlases
- **Memory Management**: Proper cleanup and garbage collection
- **Mobile Optimization**: Reduced effects and quality settings

### Performance Monitoring

Use the browser's developer tools to monitor:
- Frame rate and rendering performance
- Memory usage and garbage collection
- Network requests and asset loading
- Touch event handling latency

## 🎯 Accessibility

The game supports accessibility features:

- **Keyboard Navigation**: Full keyboard support for menu navigation
- **High Contrast Mode**: Enhanced visibility for visual impairments
- **Reduced Motion**: Disable animations for motion sensitivity
- **Screen Reader**: Semantic HTML and ARIA labels
- **Touch Accessibility**: Large touch targets and clear feedback

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the Repository**
2. **Create a Feature Branch**
3. **Write Tests First** (TDD approach)
4. **Implement Changes**
5. **Ensure All Tests Pass**
6. **Submit Pull Request**

### Development Workflow

1. Set up local development environment
2. Run existing tests to ensure baseline
3. Write tests for new functionality
4. Implement features following code style
5. Test across different devices and browsers
6. Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Buddhist Philosophy**: Inspiration for game themes and mechanics
- **Cyberpunk Aesthetics**: Visual design and atmospheric elements
- **Open Source Community**: Libraries, tools, and inspiration
- **Beta Testers**: Feedback and bug reports during development

## 📞 Support

For support, questions, or feedback:

- **Issues**: [GitHub Issues](https://github.com/yourusername/dharmapala-shield/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/dharmapala-shield/discussions)
- **Email**: support@dharmapalashield.com
- **Discord**: [Game Community Server](https://discord.gg/dharmapalashield)

## 🔮 Roadmap

### Upcoming Features

- **🌍 Multiplayer**: Cooperative defense modes
- **🎨 Level Editor**: Create and share custom levels
- **🎵 Dynamic Music**: Adaptive soundtrack system
- **🏪 Shop System**: Permanent upgrades and cosmetics
- **📊 Statistics**: Detailed gameplay analytics
- **🌐 Localization**: Multiple language support

### Long-term Vision

- **VR Support**: Immersive virtual reality mode
- **AI Enhancement**: Machine learning enemy behaviors
- **Community Features**: Leaderboards and tournaments
- **Educational Mode**: Buddhist philosophy integration
- **Accessibility Plus**: Advanced accessibility features

---

*May your defenses be strong and your meditation deep.* 🧘‍♂️✨

*Built with mindfulness, powered by code.* 💻🙏