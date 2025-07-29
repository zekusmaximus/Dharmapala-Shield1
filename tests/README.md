# Test Suite - Dharmapala Shield

This directory contains the complete test suite for the Buddhist cyberpunk tower defense game.

## Directory Structure

```
tests/
├── README.md                 # This file
├── test-runner.html         # Main test runner interface
├── unit/                    # Unit tests for individual components
├── integration/             # Integration tests for system interactions
├── performance/             # Performance and optimization tests
├── ui/                      # UI and accessibility tests
├── fixtures/                # Test data and mock assets
├── mocks/                   # Mock implementations for testing
└── utils/                   # Test utilities and helpers
```

## Test Categories

### Unit Tests (`unit/`)
- Individual class and function testing
- Isolated component behavior verification
- Mock-based testing for dependencies

### Integration Tests (`integration/`)
- System integration testing
- Cross-component interaction verification
- End-to-end workflow testing

### Performance Tests (`performance/`)
- Performance benchmarking
- Memory usage testing
- Optimization validation

### UI Tests (`ui/`)
- User interface testing
- Accessibility compliance
- Visual regression testing

## Running Tests

1. Open `test-runner.html` in a web browser
2. Select test categories to run
3. View results in the console and UI

## Test Conventions

- Test files should be named `*.test.html` or `*.test.js`
- Use descriptive test names that explain the behavior being tested
- Include both positive and negative test cases
- Mock external dependencies appropriately
- Clean up resources after each test

## Mock Data

Test fixtures and mock data are stored in the `fixtures/` directory:
- `enemies.json` - Sample enemy configurations
- `defenses.json` - Defense tower configurations
- `levels.json` - Level and wave data
- `saves.json` - Sample save game data

## Writing New Tests

1. Choose the appropriate category directory
2. Create a new HTML file with the test setup
3. Include necessary dependencies and mocks
4. Write clear, descriptive test cases
5. Add the test to the main test runner

## Test Coverage

The test suite aims to cover:
- ✅ Core game mechanics (enemies, defenses, waves)
- ✅ Achievement system
- ✅ Boss mechanics and phase transitions
- ✅ Path generation and validation
- ✅ Save/load functionality
- ✅ UI components and accessibility
- ✅ Mobile touch controls
- ✅ Performance optimizations

## Dependencies

Tests may require:
- Modern web browser with ES6+ support
- Canvas API support
- Local storage access
- Touch event simulation (for mobile tests)

## Continuous Integration

Tests can be automated using headless browsers:
- Chrome/Chromium headless mode
- Firefox headless mode
- Puppeteer for automated testing

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add integration tests for new systems
4. Update this README if adding new test categories