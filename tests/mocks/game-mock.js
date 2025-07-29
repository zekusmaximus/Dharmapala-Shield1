// Mock implementations for testing game components

class MockGame {
    constructor() {
        this.resources = {
            dharma: 1000,
            bandwidth: 500,
            anonymity: 250
        };
        
        this.gameState = {
            lives: 10,
            wave: 1,
            score: 0,
            paused: false,
            gameOver: false
        };
        
        this.callbacks = {
            onResourceChange: [],
            onGameStateChange: [],
            onEnemySpawn: [],
            onEnemyKilled: []
        };
        
        // Mock system managers
        this.systemManager = new MockSystemManager();
        this.defenseManager = new MockDefenseManager();
        this.enemies = [];
        this.projectiles = [];
    }
    
    addResources(resources) {
        if (resources.dharma) this.resources.dharma += resources.dharma;
        if (resources.bandwidth) this.resources.bandwidth += resources.bandwidth;
        if (resources.anonymity) this.resources.anonymity += resources.anonymity;
        
        this.triggerCallbacks('onResourceChange', this.resources);
    }
    
    deductResources(resources) {
        if (resources.dharma) this.resources.dharma -= resources.dharma;
        if (resources.bandwidth) this.resources.bandwidth -= resources.bandwidth;
        if (resources.anonymity) this.resources.anonymity -= resources.anonymity;
        
        this.triggerCallbacks('onResourceChange', this.resources);
    }
    
    canAfford(cost) {
        return (
            this.resources.dharma >= (cost.dharma || 0) &&
            this.resources.bandwidth >= (cost.bandwidth || 0) &&
            this.resources.anonymity >= (cost.anonymity || 0)
        );
    }
    
    spawnEnemy(type, x, y) {
        const enemy = new MockEnemy(type, x, y);
        this.enemies.push(enemy);
        this.triggerCallbacks('onEnemySpawn', enemy);
        return enemy;
    }
    
    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
            this.triggerCallbacks('onEnemyKilled', enemy);
        }
    }
    
    pause() {
        this.gameState.paused = true;
        this.triggerCallbacks('onGameStateChange', this.gameState);
    }
    
    resume() {
        this.gameState.paused = false;
        this.triggerCallbacks('onGameStateChange', this.gameState);
    }
    
    nextWave() {
        this.gameState.wave++;
        this.triggerCallbacks('onGameStateChange', this.gameState);
    }
    
    onCallback(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }
    
    triggerCallbacks(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }
    
    reset() {
        this.resources = { dharma: 1000, bandwidth: 500, anonymity: 250 };
        this.gameState = { lives: 10, wave: 1, score: 0, paused: false, gameOver: false };
        this.enemies = [];
        this.projectiles = [];
    }
}

class MockSystemManager {
    constructor() {
        this.achievementManager = new MockAchievementManager();
        this.audioManager = new MockAudioManager();
        this.levelManager = new MockLevelManager();
    }
    
    getAchievementManager() {
        return this.achievementManager;
    }
    
    getAudioManager() {
        return this.audioManager;
    }
    
    getLevelManager() {
        return this.levelManager;
    }
}

class MockDefenseManager {
    constructor() {
        this.defenses = [];
        this.selectedDefenseType = 'lotus';
    }
    
    placeDefense(x, y, type) {
        const defense = new MockDefense(type, x, y);
        this.defenses.push(defense);
        return defense;
    }
    
    removeDefense(defense) {
        const index = this.defenses.indexOf(defense);
        if (index > -1) {
            this.defenses.splice(index, 1);
        }
    }
    
    getDefenseAt(x, y) {
        return this.defenses.find(defense => {
            const distance = Math.sqrt((defense.x - x) ** 2 + (defense.y - y) ** 2);
            return distance <= defense.size;
        });
    }
}

class MockEnemy {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.health = 100;
        this.maxHealth = 100;
        this.speed = 1.0;
        this.size = 20;
        this.isAlive = true;
        this.reachedEnd = false;
        this.pathIndex = 0;
        this.pathProgress = 0;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.die();
            return true;
        }
        return false;
    }
    
    die() {
        this.isAlive = false;
    }
    
    update(deltaTime) {
        if (!this.isAlive) return;
        
        // Simple movement simulation
        this.x += this.speed * deltaTime * 0.01;
        this.pathProgress = this.x / 800; // Assume screen width of 800
        
        if (this.x > 800) {
            this.reachedEnd = true;
        }
    }
}

class MockDefense {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.level = 1;
        this.damage = 20;
        this.range = 100;
        this.fireRate = 1000;
        this.size = 25;
        this.lastFireTime = 0;
        this.kills = 0;
        this.totalDamageDealt = 0;
    }
    
    canFire() {
        return Date.now() - this.lastFireTime >= this.fireRate;
    }
    
    fire(target) {
        if (!this.canFire()) return null;
        
        this.lastFireTime = Date.now();
        return new MockProjectile(this.x, this.y, target.x, target.y, this.damage);
    }
    
    upgrade() {
        if (this.level >= 5) return false;
        
        this.level++;
        this.damage = Math.floor(this.damage * 1.5);
        return true;
    }
    
    getUpgradeCost() {
        return {
            dharma: this.level * 25,
            bandwidth: this.level * 5,
            anonymity: this.level * 2
        };
    }
}

class MockProjectile {
    constructor(startX, startY, targetX, targetY, damage) {
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.damage = damage;
        this.speed = 5;
        this.active = true;
        
        // Calculate direction
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.velocityX = (dx / distance) * this.speed;
        this.velocityY = (dy / distance) * this.speed;
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        
        // Check if reached target area
        const distanceToTarget = Math.sqrt(
            (this.x - this.targetX) ** 2 + (this.y - this.targetY) ** 2
        );
        
        if (distanceToTarget < 10) {
            this.active = false;
        }
        
        // Check bounds
        if (this.x < 0 || this.x > 800 || this.y < 0 || this.y > 600) {
            this.active = false;
        }
    }
}

class MockAchievementManager {
    constructor() {
        this.achievements = new Map();
        this.unlockedAchievements = new Set();
        this.eventStats = new Map();
    }
    
    trackEvent(eventType, data) {
        const count = this.eventStats.get(eventType) || 0;
        this.eventStats.set(eventType, count + 1);
    }
    
    unlockAchievement(id) {
        this.unlockedAchievements.add(id);
    }
    
    isUnlocked(id) {
        return this.unlockedAchievements.has(id);
    }
    
    getStats() {
        return Object.fromEntries(this.eventStats);
    }
}

class MockAudioManager {
    constructor() {
        this.volume = 1.0;
        this.muted = false;
        this.soundsPlayed = [];
    }
    
    playSound(soundName, volume = 1.0) {
        if (!this.muted) {
            this.soundsPlayed.push({ name: soundName, volume, time: Date.now() });
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
    
    mute() {
        this.muted = true;
    }
    
    unmute() {
        this.muted = false;
    }
}

class MockLevelManager {
    constructor() {
        this.currentLevel = 1;
        this.currentWave = 1;
        this.path = [
            { x: 0, y: 300 },
            { x: 200, y: 300 },
            { x: 400, y: 200 },
            { x: 600, y: 400 },
            { x: 800, y: 300 }
        ];
    }
    
    getCurrentPath() {
        return this.path;
    }
    
    getLevel() {
        return this.currentLevel;
    }
    
    getWave() {
        return this.currentWave;
    }
    
    nextWave() {
        this.currentWave++;
    }
    
    nextLevel() {
        this.currentLevel++;
        this.currentWave = 1;
    }
}

// Mock utility functions
const MockUtils = {
    math: {
        distance: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
        angle: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
        random: (min, max) => Math.random() * (max - min) + min,
        clamp: (value, min, max) => Math.max(min, Math.min(max, value))
    },
    
    performance: {
        now: () => Date.now()
    },
    
    game: {
        generateId: () => Math.random().toString(36).substr(2, 9),
        formatNumber: (num) => num.toLocaleString()
    }
};

// Test assertion helpers
const TestAssertions = {
    assertTrue: (condition, message = 'Assertion failed') => {
        if (!condition) {
            throw new Error(`Assertion Error: ${message}`);
        }
    },
    
    assertFalse: (condition, message = 'Assertion failed') => {
        if (condition) {
            throw new Error(`Assertion Error: ${message}`);
        }
    },
    
    assertEqual: (actual, expected, message = 'Values not equal') => {
        if (actual !== expected) {
            throw new Error(`Assertion Error: ${message}. Expected: ${expected}, Actual: ${actual}`);
        }
    },
    
    assertNotEqual: (actual, expected, message = 'Values should not be equal') => {
        if (actual === expected) {
            throw new Error(`Assertion Error: ${message}. Both values: ${actual}`);
        }
    },
    
    assertGreaterThan: (actual, expected, message = 'Value not greater than expected') => {
        if (actual <= expected) {
            throw new Error(`Assertion Error: ${message}. Expected > ${expected}, Actual: ${actual}`);
        }
    },
    
    assertLessThan: (actual, expected, message = 'Value not less than expected') => {
        if (actual >= expected) {
            throw new Error(`Assertion Error: ${message}. Expected < ${expected}, Actual: ${actual}`);
        }
    },
    
    assertThrows: (fn, message = 'Function should throw an error') => {
        try {
            fn();
            throw new Error(`Assertion Error: ${message}`);
        } catch (error) {
            if (error.message.includes('Assertion Error')) {
                throw error;
            }
            // Expected behavior - function threw an error
        }
    }
};

// Export for use in tests
if (typeof window !== 'undefined') {
    window.MockGame = MockGame;
    window.MockEnemy = MockEnemy;
    window.MockDefense = MockDefense;
    window.MockProjectile = MockProjectile;
    window.MockAchievementManager = MockAchievementManager;
    window.MockAudioManager = MockAudioManager;
    window.MockLevelManager = MockLevelManager;
    window.MockUtils = MockUtils;
    window.TestAssertions = TestAssertions;
}