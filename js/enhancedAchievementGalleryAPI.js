/**
 * Enhanced Achievement Gallery API Examples
 * Demonstrates usage of the enhanced achievement gallery functionality
 */

class EnhancedAchievementGalleryAPI {
    constructor(game) {
        this.game = game;
        this.gallery = game.enhancedAchievementGallery;
    }

    /**
     * Search Examples
     */
    searchExamples() {
        console.log('=== Search Examples ===');
        
        // Basic search
        const combatAchievements = this.gallery.searchAchievements('combat');
        console.log(`Combat achievements: ${combatAchievements.length} found`);
        
        // Multi-word search
        const firstDefense = this.gallery.searchAchievements('first defense');
        console.log(`"First defense" achievements: ${firstDefense.length} found`);
        
        // Description search
        const masterAchievements = this.gallery.searchAchievements('master');
        console.log(`Achievements with "master": ${masterAchievements.length} found`);
        
        // Clear search
        this.gallery.searchAchievements('');
        console.log('Search cleared, showing all achievements');
    }

    /**
     * Filtering Examples
     */
    filteringExamples() {
        console.log('=== Filtering Examples ===');
        
        // Show only completed achievements
        this.gallery.currentFilter.progressStatus = 'completed';
        this.gallery.applyFiltersAndSort();
        console.log(`Completed: ${this.gallery.filteredAchievements.length} achievements`);
        
        // Show achievements in progress
        this.gallery.currentFilter.progressStatus = 'in-progress';
        this.gallery.applyFiltersAndSort();
        console.log(`In progress: ${this.gallery.filteredAchievements.length} achievements`);
        
        // Show locked achievements
        this.gallery.currentFilter.progressStatus = 'locked';
        this.gallery.applyFiltersAndSort();
        console.log(`Locked: ${this.gallery.filteredAchievements.length} achievements`);
        
        // Filter by category
        this.gallery.currentFilter.progressStatus = 'all';
        this.gallery.currentFilter.category = 'combat';
        this.gallery.applyFiltersAndSort();
        console.log(`Combat category: ${this.gallery.filteredAchievements.length} achievements`);
        
        // Reset filters
        this.gallery.resetAllFilters();
        console.log('Filters reset to default state');
    }

    /**
     * Sorting Examples
     */
    sortingExamples() {
        console.log('=== Sorting Examples ===');
        
        // Sort by name (A-Z)
        this.gallery.currentFilter.sortBy = 'name';
        this.gallery.currentFilter.sortOrder = 'asc';
        this.gallery.applyFiltersAndSort();
        console.log('Sorted by name (A-Z)');
        console.log(`First: ${this.gallery.filteredAchievements[0]?.name}`);
        
        // Sort by unlock date (newest first)
        this.gallery.currentFilter.sortBy = 'unlock-date';
        this.gallery.currentFilter.sortOrder = 'desc';
        this.gallery.applyFiltersAndSort();
        console.log('Sorted by unlock date (newest first)');
        
        // Sort by progress (highest first)
        this.gallery.currentFilter.sortBy = 'progress';
        this.gallery.currentFilter.sortOrder = 'desc';
        this.gallery.applyFiltersAndSort();
        console.log('Sorted by progress (highest first)');
        
        // Sort by difficulty (easiest first)
        this.gallery.currentFilter.sortBy = 'difficulty';
        this.gallery.currentFilter.sortOrder = 'asc';
        this.gallery.applyFiltersAndSort();
        console.log('Sorted by difficulty (easiest first)');
    }

    /**
     * Quick Filter Examples
     */
    quickFilterExamples() {
        console.log('=== Quick Filter Examples ===');
        
        // Near completion achievements
        const nearComplete = this.gallery.getNearCompletionAchievements(0.7);
        console.log(`Near completion (70%+): ${nearComplete.length} achievements`);
        nearComplete.forEach(achievement => {
            console.log(`  - ${achievement.name}: ${Math.round(achievement.progress.percentage)}%`);
        });
        
        // Toggle near completion filter
        this.gallery.toggleNearCompletionFilter();
        console.log(`Near completion filter active: ${this.gallery.currentFilter.nearCompletion}`);
        
        // Show recent unlocks
        this.gallery.showRecentUnlocks();
        console.log('Showing recent unlocks (sorted by unlock date)');
        
        // Show secret achievements
        this.gallery.showSecretAchievements();
        console.log('Showing secret achievements');
    }

    /**
     * Advanced Usage Examples
     */
    advancedExamples() {
        console.log('=== Advanced Examples ===');
        
        // Complex filtering: Combat achievements in progress, sorted by progress
        this.gallery.currentFilter.category = 'combat';
        this.gallery.currentFilter.progressStatus = 'in-progress';
        this.gallery.currentFilter.sortBy = 'progress';
        this.gallery.currentFilter.sortOrder = 'desc';
        this.gallery.applyFiltersAndSort();
        console.log('Combat achievements in progress, sorted by progress');
        
        // Search within filtered results
        this.gallery.currentFilter.searchText = 'master';
        this.gallery.applyFiltersAndSort();
        console.log('Combat achievements in progress containing "master"');
        
        // Get achievements by difficulty
        const hardAchievements = this.gallery.allAchievements.filter(a => a.difficulty >= 4);
        console.log(`Hard achievements (4-5 stars): ${hardAchievements.length} found`);
        
        // Get achievements with specific progress
        const almostComplete = this.gallery.allAchievements.filter(a => 
            !a.unlocked && a.progress && a.progress.percentage >= 90
        );
        console.log(`Almost complete (90%+): ${almostComplete.length} achievements`);
    }

    /**
     * Programmatic Achievement Management
     */
    achievementManagementExamples() {
        console.log('=== Achievement Management Examples ===');
        
        // Get achievement statistics
        const stats = this.game.achievementManager.getAchievementStats();
        console.log('Achievement Statistics:', {
            total: stats.total,
            unlocked: stats.unlocked,
            percentage: stats.percentage + '%',
            recentUnlocks: stats.recent.length
        });
        
        // Find specific achievements
        const firstStepsAchievements = this.gallery.allAchievements.filter(a => 
            a.category === 'first_steps'
        );
        console.log(`First steps achievements: ${firstStepsAchievements.length}`);
        
        // Check progress for specific achievement
        const specificAchievement = this.game.achievementManager.achievements['first_defense'];
        if (specificAchievement) {
            const progress = this.game.achievementManager.getAchievementProgress('first_defense');
            console.log(`First Defense progress:`, progress);
        }
        
        // Get near completion with custom threshold
        const customNearComplete = this.gallery.getNearCompletionAchievements(0.8);
        console.log(`Custom near completion (80%+): ${customNearComplete.length} achievements`);
    }

    /**
     * UI Integration Examples
     */
    uiIntegrationExamples() {
        console.log('=== UI Integration Examples ===');
        
        // Programmatically open the enhanced gallery
        this.gallery.openEnhancedGallery();
        console.log('Enhanced gallery opened programmatically');
        
        // Set specific filter state and open
        this.gallery.currentFilter.category = 'progression';
        this.gallery.currentFilter.sortBy = 'progress';
        this.gallery.currentFilter.sortOrder = 'desc';
        this.gallery.openEnhancedGallery();
        console.log('Opened gallery with progression achievements sorted by progress');
        
        // Search for specific term and open
        this.gallery.searchAchievements('level master');
        console.log('Opened gallery with search for "level master"');
    }

    /**
     * Performance and Optimization Examples
     */
    performanceExamples() {
        console.log('=== Performance Examples ===');
        
        const startTime = performance.now();
        
        // Refresh achievement data
        this.gallery.refreshAchievementData();
        
        // Apply complex filtering
        this.gallery.currentFilter.searchText = 'defense';
        this.gallery.currentFilter.category = 'strategy';
        this.gallery.currentFilter.progressStatus = 'in-progress';
        this.gallery.currentFilter.sortBy = 'difficulty';
        this.gallery.applyFiltersAndSort();
        
        const endTime = performance.now();
        console.log(`Complex filtering completed in ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`Filtered results: ${this.gallery.filteredAchievements.length} achievements`);
        
        // Memory usage example
        const memoryUsage = {
            allAchievements: this.gallery.allAchievements.length,
            filteredAchievements: this.gallery.filteredAchievements.length,
            cacheSize: JSON.stringify(this.gallery.currentFilter).length
        };
        console.log('Memory usage:', memoryUsage);
    }

    /**
     * Run all examples
     */
    runAllExamples() {
        console.log('🚀 Running Enhanced Achievement Gallery API Examples...\n');
        
        if (!this.gallery) {
            console.error('❌ Enhanced Achievement Gallery not available');
            return;
        }
        
        try {
            this.searchExamples();
            console.log('');
            
            this.filteringExamples();
            console.log('');
            
            this.sortingExamples();
            console.log('');
            
            this.quickFilterExamples();
            console.log('');
            
            this.advancedExamples();
            console.log('');
            
            this.achievementManagementExamples();
            console.log('');
            
            this.uiIntegrationExamples();
            console.log('');
            
            this.performanceExamples();
            console.log('');
            
            console.log('✅ All examples completed successfully!');
            
        } catch (error) {
            console.error('❌ Error running examples:', error);
        }
    }
}

/**
 * Utility functions for easier API access
 */
window.AchievementGalleryUtils = {
    /**
     * Quick search function
     */
    search: (game, term) => {
        if (game.enhancedAchievementGallery) {
            return game.enhancedAchievementGallery.searchAchievements(term);
        }
        return [];
    },
    
    /**
     * Get achievements near completion
     */
    nearComplete: (game, threshold = 0.7) => {
        if (game.enhancedAchievementGallery) {
            return game.enhancedAchievementGallery.getNearCompletionAchievements(threshold);
        }
        return [];
    },
    
    /**
     * Quick filter by progress status
     */
    filterByProgress: (game, status) => {
        if (game.enhancedAchievementGallery) {
            game.enhancedAchievementGallery.currentFilter.progressStatus = status;
            game.enhancedAchievementGallery.applyFiltersAndSort();
            return game.enhancedAchievementGallery.filteredAchievements;
        }
        return [];
    },
    
    /**
     * Quick sort by criteria
     */
    sortBy: (game, criteria, order = 'asc') => {
        if (game.enhancedAchievementGallery) {
            game.enhancedAchievementGallery.currentFilter.sortBy = criteria;
            game.enhancedAchievementGallery.currentFilter.sortOrder = order;
            game.enhancedAchievementGallery.applyFiltersAndSort();
            return game.enhancedAchievementGallery.filteredAchievements;
        }
        return [];
    },
    
    /**
     * Reset to default state
     */
    reset: (game) => {
        if (game.enhancedAchievementGallery) {
            game.enhancedAchievementGallery.resetAllFilters();
        }
    },
    
    /**
     * Open gallery with specific settings
     */
    openWith: (game, options = {}) => {
        if (game.enhancedAchievementGallery) {
            const gallery = game.enhancedAchievementGallery;
            
            if (options.search) gallery.currentFilter.searchText = options.search;
            if (options.category) gallery.currentFilter.category = options.category;
            if (options.progress) gallery.currentFilter.progressStatus = options.progress;
            if (options.sortBy) gallery.currentFilter.sortBy = options.sortBy;
            if (options.sortOrder) gallery.currentFilter.sortOrder = options.sortOrder;
            if (options.nearCompletion) gallery.currentFilter.nearCompletion = options.nearCompletion;
            
            gallery.openEnhancedGallery();
        }
    }
};

/**
 * Console commands for easy testing
 */
if (typeof window !== 'undefined') {
    window.testEnhancedGallery = (game) => {
        const api = new EnhancedAchievementGalleryAPI(game);
        api.runAllExamples();
    };
    
    // Quick access functions
    window.searchAchievements = (game, term) => window.AchievementGalleryUtils.search(game, term);
    window.nearCompleteAchievements = (game, threshold) => window.AchievementGalleryUtils.nearComplete(game, threshold);
    window.filterAchievements = (game, status) => window.AchievementGalleryUtils.filterByProgress(game, status);
    window.sortAchievements = (game, criteria, order) => window.AchievementGalleryUtils.sortBy(game, criteria, order);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EnhancedAchievementGalleryAPI,
        AchievementGalleryUtils: window.AchievementGalleryUtils
    };
}
