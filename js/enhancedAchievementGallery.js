/**
 * Enhanced Achievement Gallery with Advanced Search, Filtering, and Sorting
 * 
 * Features:
 * 1. Text search for achievement names and descriptions
 * 2. Progress-based filtering (completed, in-progress, locked)
 * 3. Sorting options (unlock date, progress, difficulty)
 * 4. 'Achievements near completion' quick filter
 */

class EnhancedAchievementGallery {
    constructor(game, achievementManager) {
        this.game = game;
        this.achievementManager = achievementManager;
        
        // State management
        this.currentFilter = {
            category: 'all',
            progressStatus: 'all', // all, completed, in-progress, locked
            searchText: '',
            sortBy: 'category', // category, unlock-date, progress, difficulty, name
            sortOrder: 'asc', // asc, desc
            nearCompletion: false
        };
        
        // Cache for performance
        this.filteredAchievements = [];
        this.allAchievements = [];
        
        // Initialize enhanced gallery
        this.initializeEnhancedGallery();
    }
    
    /**
     * Initialize the enhanced achievement gallery UI
     */
    initializeEnhancedGallery() {
        try {
            this.createEnhancedGalleryUI();
            this.setupEventListeners();
            this.refreshAchievementData();
            console.log('[EnhancedAchievementGallery] Initialized successfully');
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Failed to initialize:', error);
        }
    }
    
    /**
     * Create the enhanced gallery UI elements
     */
    createEnhancedGalleryUI() {
        const achievementScreen = document.getElementById('achievementScreen');
        if (!achievementScreen) {
            console.error('[EnhancedAchievementGallery] Achievement screen not found');
            return;
        }
        
        // Find the existing achievement categories section
        const existingCategories = achievementScreen.querySelector('.achievement-categories');
        if (!existingCategories) {
            console.error('[EnhancedAchievementGallery] Existing categories section not found');
            return;
        }
        
        // Create enhanced controls container
        const enhancedControls = document.createElement('div');
        enhancedControls.className = 'enhanced-achievement-controls';
        enhancedControls.innerHTML = this.getEnhancedControlsHTML();
        
        // Insert enhanced controls after existing categories
        existingCategories.parentNode.insertBefore(enhancedControls, existingCategories.nextSibling);
        
        // Create results summary section
        const resultsSummary = document.createElement('div');
        resultsSummary.className = 'achievement-results-summary';
        resultsSummary.id = 'achievementResultsSummary';
        
        const achievementGrid = document.getElementById('achievementGrid');
        if (achievementGrid) {
            achievementGrid.parentNode.insertBefore(resultsSummary, achievementGrid);
        }
    }
    
    /**
     * Generate enhanced controls HTML
     */
    getEnhancedControlsHTML() {
        return `
            <div class="enhanced-controls-section">
                <!-- Search Bar -->
                <div class="search-section">
                    <div class="search-container">
                        <input type="text" id="achievementSearchInput" 
                               placeholder="Search achievements by name or description..."
                               class="achievement-search-input">
                        <button id="clearSearchBtn" class="clear-search-btn" title="Clear search">✕</button>
                    </div>
                </div>
                
                <!-- Filter and Sort Controls -->
                <div class="filter-sort-section">
                    <div class="filter-controls">
                        <div class="filter-group">
                            <label for="progressStatusFilter">Progress Status:</label>
                            <select id="progressStatusFilter" class="filter-select">
                                <option value="all">All Achievements</option>
                                <option value="completed">Completed</option>
                                <option value="in-progress">In Progress</option>
                                <option value="locked">Locked</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="sortBySelect">Sort By:</label>
                            <select id="sortBySelect" class="filter-select">
                                <option value="category">Category</option>
                                <option value="name">Name</option>
                                <option value="unlock-date">Unlock Date</option>
                                <option value="progress">Progress</option>
                                <option value="difficulty">Difficulty</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label for="sortOrderSelect">Order:</label>
                            <select id="sortOrderSelect" class="filter-select">
                                <option value="asc">Ascending</option>
                                <option value="desc">Descending</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Quick Filter Buttons -->
                    <div class="quick-filters">
                        <button id="nearCompletionBtn" class="quick-filter-btn" title="Show achievements that are close to completion">
                            🎯 Near Completion
                        </button>
                        <button id="recentUnlocksBtn" class="quick-filter-btn" title="Show recently unlocked achievements">
                            🆕 Recent Unlocks
                        </button>
                        <button id="secretAchievementsBtn" class="quick-filter-btn" title="Show secret achievements">
                            🔍 Secrets
                        </button>
                        <button id="resetFiltersBtn" class="quick-filter-btn reset-btn" title="Reset all filters">
                            🔄 Reset All
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event listeners for enhanced controls
     */
    setupEventListeners() {
        try {
            // Search input
            const searchInput = document.getElementById('achievementSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.currentFilter.searchText = e.target.value.toLowerCase();
                    this.applyFiltersAndSort();
                });
                
                // Enter key to trigger search
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.applyFiltersAndSort();
                    }
                });
            }
            
            // Clear search button
            const clearSearchBtn = document.getElementById('clearSearchBtn');
            if (clearSearchBtn) {
                clearSearchBtn.addEventListener('click', () => {
                    const searchInput = document.getElementById('achievementSearchInput');
                    if (searchInput) {
                        searchInput.value = '';
                        this.currentFilter.searchText = '';
                        this.applyFiltersAndSort();
                    }
                });
            }
            
            // Progress status filter
            const progressStatusFilter = document.getElementById('progressStatusFilter');
            if (progressStatusFilter) {
                progressStatusFilter.addEventListener('change', (e) => {
                    this.currentFilter.progressStatus = e.target.value;
                    this.applyFiltersAndSort();
                });
            }
            
            // Sort controls
            const sortBySelect = document.getElementById('sortBySelect');
            if (sortBySelect) {
                sortBySelect.addEventListener('change', (e) => {
                    this.currentFilter.sortBy = e.target.value;
                    this.applyFiltersAndSort();
                });
            }
            
            const sortOrderSelect = document.getElementById('sortOrderSelect');
            if (sortOrderSelect) {
                sortOrderSelect.addEventListener('change', (e) => {
                    this.currentFilter.sortOrder = e.target.value;
                    this.applyFiltersAndSort();
                });
            }
            
            // Quick filter buttons
            const nearCompletionBtn = document.getElementById('nearCompletionBtn');
            if (nearCompletionBtn) {
                nearCompletionBtn.addEventListener('click', () => {
                    this.toggleNearCompletionFilter();
                });
            }
            
            const recentUnlocksBtn = document.getElementById('recentUnlocksBtn');
            if (recentUnlocksBtn) {
                recentUnlocksBtn.addEventListener('click', () => {
                    this.showRecentUnlocks();
                });
            }
            
            const secretAchievementsBtn = document.getElementById('secretAchievementsBtn');
            if (secretAchievementsBtn) {
                secretAchievementsBtn.addEventListener('click', () => {
                    this.showSecretAchievements();
                });
            }
            
            const resetFiltersBtn = document.getElementById('resetFiltersBtn');
            if (resetFiltersBtn) {
                resetFiltersBtn.addEventListener('click', () => {
                    this.resetAllFilters();
                });
            }
            
            // Also listen to existing category buttons
            this.setupCategoryListeners();
            
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Error setting up event listeners:', error);
        }
    }
    
    /**
     * Setup listeners for existing category buttons
     */
    setupCategoryListeners() {
        const categoryButtons = document.querySelectorAll('.achievement-categories .category-btn');
        categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.currentFilter.category = button.dataset.category;
                this.applyFiltersAndSort();
            });
        });
    }
    
    /**
     * Refresh achievement data from the achievement manager
     */
    refreshAchievementData() {
        try {
            if (!this.achievementManager) {
                console.warn('[EnhancedAchievementGallery] Achievement manager not available');
                this.allAchievements = [];
                return;
            }
            
            // Get all achievements with enhanced data
            this.allAchievements = this.getAllAchievementsWithEnhancedData();
            this.applyFiltersAndSort();
            
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Error refreshing achievement data:', error);
            this.allAchievements = [];
        }
    }
    
    /**
     * Get all achievements with enhanced metadata
     */
    getAllAchievementsWithEnhancedData() {
        try {
            const achievements = this.achievementManager.getAllAchievements();
            
            return achievements.map(achievement => {
                const progress = this.achievementManager.getAchievementProgress(achievement.id) || { current: 0, target: 1, percentage: 0 };
                const isUnlocked = this.achievementManager.unlockedAchievements.has(achievement.id);
                const unlockTimestamp = this.getUnlockTimestamp(achievement.id);
                
                return {
                    ...achievement,
                    unlocked: isUnlocked,
                    progress: progress,
                    unlockTimestamp: unlockTimestamp,
                    difficulty: this.calculateDifficulty(achievement),
                    searchableText: `${achievement.name} ${achievement.description}`.toLowerCase(),
                    isNearCompletion: this.isNearCompletion(progress, isUnlocked),
                    progressStatus: this.getProgressStatus(progress, isUnlocked)
                };
            });
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Error getting enhanced achievement data:', error);
            return [];
        }
    }
    
    /**
     * Get unlock timestamp for an achievement
     */
    getUnlockTimestamp(achievementId) {
        try {
            // Check recent unlocks first
            const recentUnlock = this.achievementManager.recentUnlocks.find(unlock => unlock.id === achievementId);
            if (recentUnlock) {
                return recentUnlock.timestamp;
            }
            
            // Fall back to a default timestamp (start of day for unlocked achievements)
            if (this.achievementManager.unlockedAchievements.has(achievementId)) {
                return Date.now() - (Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time within last week
            }
            
            return 0;
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Error getting unlock timestamp:', error);
            return 0;
        }
    }
    
    /**
     * Calculate difficulty score for an achievement
     */
    calculateDifficulty(achievement) {
        try {
            let difficulty = 1;
            
            // Base difficulty on achievement type and target
            if (achievement.condition) {
                switch (achievement.condition.type) {
                    case 'single_event':
                        difficulty = 1;
                        break;
                    case 'cumulative':
                        const target = achievement.condition.target || 1;
                        if (target >= 1000) difficulty = 5;
                        else if (target >= 100) difficulty = 4;
                        else if (target >= 50) difficulty = 3;
                        else if (target >= 10) difficulty = 2;
                        else difficulty = 1;
                        break;
                    case 'streak':
                        const streakTarget = achievement.condition.target || 1;
                        if (streakTarget >= 10) difficulty = 5;
                        else if (streakTarget >= 5) difficulty = 4;
                        else if (streakTarget >= 3) difficulty = 3;
                        else difficulty = 2;
                        break;
                    default:
                        difficulty = 2;
                }
            }
            
            // Adjust for category
            switch (achievement.category) {
                case 'first_steps':
                    difficulty = Math.max(1, difficulty - 1);
                    break;
                case 'secret':
                    difficulty = Math.min(5, difficulty + 2);
                    break;
                case 'progression':
                    difficulty = Math.min(5, difficulty + 1);
                    break;
            }
            
            // Hidden achievements are generally harder
            if (achievement.hidden) {
                difficulty = Math.min(5, difficulty + 1);
            }
            
            return Math.max(1, Math.min(5, difficulty));
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Error calculating difficulty:', error);
            return 3; // Default medium difficulty
        }
    }
    
    /**
     * Check if achievement is near completion
     */
    isNearCompletion(progress, isUnlocked) {
        if (isUnlocked || !progress) return false;
        return progress.percentage >= 70; // 70% or more is "near completion"
    }
    
    /**
     * Get progress status for an achievement
     */
    getProgressStatus(progress, isUnlocked) {
        if (isUnlocked) return 'completed';
        if (!progress || progress.percentage === 0) return 'locked';
        return 'in-progress';
    }
    
    /**
     * Apply all filters and sorting to achievements
     */
    applyFiltersAndSort() {
        try {
            let filtered = [...this.allAchievements];
            
            // Apply category filter
            if (this.currentFilter.category !== 'all') {
                filtered = filtered.filter(achievement => achievement.category === this.currentFilter.category);
            }
            
            // Apply progress status filter
            if (this.currentFilter.progressStatus !== 'all') {
                filtered = filtered.filter(achievement => achievement.progressStatus === this.currentFilter.progressStatus);
            }
            
            // Apply search text filter
            if (this.currentFilter.searchText) {
                const searchTerms = this.currentFilter.searchText.split(' ').filter(term => term.length > 0);
                filtered = filtered.filter(achievement => {
                    return searchTerms.every(term => achievement.searchableText.includes(term));
                });
            }
            
            // Apply near completion filter
            if (this.currentFilter.nearCompletion) {
                filtered = filtered.filter(achievement => achievement.isNearCompletion);
            }
            
            // Sort the filtered results
            filtered = this.sortAchievements(filtered);
            
            // Update the display
            this.filteredAchievements = filtered;
            this.updateGalleryDisplay();
            this.updateResultsSummary();
            
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Error applying filters and sort:', error);
        }
    }
    
    /**
     * Sort achievements based on current sort settings
     */
    sortAchievements(achievements) {
        try {
            const sortBy = this.currentFilter.sortBy;
            const sortOrder = this.currentFilter.sortOrder;
            
            const sorted = achievements.sort((a, b) => {
                let comparison = 0;
                
                switch (sortBy) {
                    case 'name':
                        comparison = a.name.localeCompare(b.name);
                        break;
                    case 'unlock-date':
                        comparison = b.unlockTimestamp - a.unlockTimestamp; // Most recent first by default
                        break;
                    case 'progress':
                        comparison = (b.progress?.percentage || 0) - (a.progress?.percentage || 0);
                        break;
                    case 'difficulty':
                        comparison = a.difficulty - b.difficulty;
                        break;
                    case 'category':
                    default:
                        comparison = a.category.localeCompare(b.category);
                        if (comparison === 0) {
                            comparison = a.name.localeCompare(b.name);
                        }
                        break;
                }
                
                return sortOrder === 'desc' ? -comparison : comparison;
            });
            
            return sorted;
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Error sorting achievements:', error);
            return achievements;
        }
    }
    
    /**
     * Update the gallery display with filtered and sorted achievements
     */
    updateGalleryDisplay() {
        try {
            const achievementGrid = document.getElementById('achievementGrid');
            if (!achievementGrid) {
                console.error('[EnhancedAchievementGallery] Achievement grid not found');
                return;
            }
            
            // Clear existing content
            achievementGrid.innerHTML = '';
            
            // Add filtered achievements
            this.filteredAchievements.forEach(achievement => {
                const achievementElement = this.createEnhancedAchievementElement(achievement);
                achievementGrid.appendChild(achievementElement);
            });
            
            // Show/hide empty state
            if (this.filteredAchievements.length === 0) {
                this.showEmptyState(achievementGrid);
            }
            
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Error updating gallery display:', error);
        }
    }
    
    /**
     * Create enhanced achievement element with additional metadata
     */
    createEnhancedAchievementElement(achievement) {
        try {
            const element = document.createElement('div');
            element.className = 'achievement-item enhanced-achievement-item';
            element.dataset.achievementId = achievement.id;
            element.dataset.category = achievement.category;
            element.dataset.difficulty = achievement.difficulty;
            
            // Apply styling based on status
            if (achievement.unlocked) {
                element.classList.add('unlocked');
            } else if (achievement.isNearCompletion) {
                element.classList.add('near-completion');
            } else {
                element.classList.add('locked');
            }
            
            // Create achievement content with enhanced information
            element.innerHTML = `
                <div class="achievement-icon">
                    ${this.getAchievementIcon(achievement)}
                </div>
                <div class="achievement-info">
                    <div class="achievement-header">
                        <div class="achievement-title">
                            ${achievement.unlocked ? achievement.name : (achievement.hidden ? '???' : achievement.name)}
                        </div>
                        <div class="achievement-meta">
                            ${this.getDifficultyStars(achievement.difficulty)}
                            ${achievement.isNearCompletion ? '<span class="near-completion-badge">🎯</span>' : ''}
                        </div>
                    </div>
                    <div class="achievement-description">
                        ${achievement.unlocked ? achievement.description : (achievement.hidden ? 'Hidden achievement' : achievement.description)}
                    </div>
                    <div class="achievement-progress">
                        ${this.getEnhancedProgressDisplay(achievement)}
                    </div>
                    <div class="achievement-reward">
                        ${this.getRewardText(achievement)}
                    </div>
                    ${achievement.unlocked ? `<div class="achievement-unlock-date">
                        Unlocked: ${this.formatUnlockDate(achievement.unlockTimestamp)}
                    </div>` : ''}
                </div>
                <div class="achievement-status">
                    ${this.getStatusBadge(achievement)}
                </div>
            `;
            
            // Add click handler for details
            element.addEventListener('click', () => {
                this.showEnhancedAchievementDetails(achievement);
            });
            
            return element;
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Error creating achievement element:', error);
            return document.createElement('div');
        }
    }
    
    /**
     * Get achievement icon with enhanced styling
     */
    getAchievementIcon(achievement) {
        if (!achievement.unlocked && achievement.hidden) {
            return '<span class="locked-icon mystery">❓</span>';
        }
        
        if (!achievement.unlocked) {
            return '<span class="locked-icon">🔒</span>';
        }
        
        const icon = achievement.icon || this.getCategoryDefaultIcon(achievement.category);
        return `<span class="achievement-icon-emoji unlocked">${icon}</span>`;
    }
    
    /**
     * Get default icon for category
     */
    getCategoryDefaultIcon(category) {
        const iconMap = {
            'first_steps': '🏁',
            'combat': '⚔️',
            'strategy': '🧠',
            'progression': '📈',
            'secret': '🔍'
        };
        return iconMap[category] || '🏆';
    }
    
    /**
     * Get difficulty stars display
     */
    getDifficultyStars(difficulty) {
        const stars = '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
        return `<span class="difficulty-stars" title="Difficulty: ${difficulty}/5">${stars}</span>`;
    }
    
    /**
     * Get enhanced progress display
     */
    getEnhancedProgressDisplay(achievement) {
        const progress = achievement.progress;
        
        if (achievement.unlocked) {
            return '<div class="progress-complete">✓ Complete</div>';
        }
        
        if (!progress || progress.percentage === 0) {
            return '<div class="progress-locked">Not started</div>';
        }
        
        const percentage = Math.min(100, Math.max(0, progress.percentage));
        return `
            <div class="enhanced-progress-bar">
                <div class="progress-text">${progress.current || 0}/${progress.target || 1} (${Math.round(percentage)}%)</div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }
    
    /**
     * Get reward text
     */
    getRewardText(achievement) {
        if (!achievement.reward || (!achievement.unlocked && achievement.hidden)) {
            return '';
        }
        
        const reward = achievement.reward;
        const parts = [];
        
        if (reward.dharma) parts.push(`${reward.dharma} Dharma`);
        if (reward.bandwidth) parts.push(`${reward.bandwidth} Bandwidth`);
        if (reward.anonymity) parts.push(`${reward.anonymity} Anonymity`);
        if (reward.special_items) parts.push(`${reward.special_items} Special Item${reward.special_items > 1 ? 's' : ''}`);
        if (reward.title) parts.push(`Title: "${reward.title}"`);
        
        return parts.length > 0 ? `<div class="reward-text">Rewards: ${parts.join(', ')}</div>` : '';
    }
    
    /**
     * Format unlock date
     */
    formatUnlockDate(timestamp) {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    
    /**
     * Get status badge
     */
    getStatusBadge(achievement) {
        if (achievement.unlocked) {
            return '<span class="status-badge unlocked">✓</span>';
        } else if (achievement.isNearCompletion) {
            return '<span class="status-badge near-completion">🎯</span>';
        } else if (achievement.progress && achievement.progress.percentage > 0) {
            return '<span class="status-badge in-progress">⏳</span>';
        } else {
            return '<span class="status-badge locked">🔒</span>';
        }
    }
    
    /**
     * Show empty state when no achievements match filters
     */
    showEmptyState(container) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">No achievements found</div>
            <div class="empty-state-description">
                Try adjusting your search or filter settings to find achievements.
            </div>
            <button class="empty-state-button" onclick="this.closest('.enhanced-achievement-gallery').querySelector('#resetFiltersBtn').click()">
                Reset Filters
            </button>
        `;
        container.appendChild(emptyState);
    }
    
    /**
     * Update results summary
     */
    updateResultsSummary() {
        try {
            const summaryElement = document.getElementById('achievementResultsSummary');
            if (!summaryElement) return;
            
            const totalFiltered = this.filteredAchievements.length;
            const totalAll = this.allAchievements.length;
            const unlockedFiltered = this.filteredAchievements.filter(a => a.unlocked).length;
            const nearCompletion = this.filteredAchievements.filter(a => a.isNearCompletion).length;
            
            summaryElement.innerHTML = `
                <div class="results-summary">
                    <span class="summary-item">
                        <strong>${totalFiltered}</strong> of <strong>${totalAll}</strong> achievements shown
                    </span>
                    <span class="summary-item">
                        <strong>${unlockedFiltered}</strong> unlocked
                    </span>
                    ${nearCompletion > 0 ? `<span class="summary-item near-completion">
                        <strong>${nearCompletion}</strong> near completion 🎯
                    </span>` : ''}
                </div>
            `;
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Error updating results summary:', error);
        }
    }
    
    /**
     * Toggle near completion filter
     */
    toggleNearCompletionFilter() {
        this.currentFilter.nearCompletion = !this.currentFilter.nearCompletion;
        
        const button = document.getElementById('nearCompletionBtn');
        if (button) {
            button.classList.toggle('active', this.currentFilter.nearCompletion);
        }
        
        this.applyFiltersAndSort();
    }
    
    /**
     * Show recent unlocks
     */
    showRecentUnlocks() {
        this.currentFilter.sortBy = 'unlock-date';
        this.currentFilter.sortOrder = 'desc';
        this.currentFilter.progressStatus = 'completed';
        
        // Update UI controls
        const sortBySelect = document.getElementById('sortBySelect');
        const sortOrderSelect = document.getElementById('sortOrderSelect');
        const progressStatusFilter = document.getElementById('progressStatusFilter');
        
        if (sortBySelect) sortBySelect.value = 'unlock-date';
        if (sortOrderSelect) sortOrderSelect.value = 'desc';
        if (progressStatusFilter) progressStatusFilter.value = 'completed';
        
        this.applyFiltersAndSort();
    }
    
    /**
     * Show secret achievements
     */
    showSecretAchievements() {
        this.currentFilter.category = 'secret';
        
        // Update category button
        const secretButton = document.querySelector('[data-category="secret"]');
        if (secretButton) {
            // Remove active from all category buttons
            const categoryButtons = document.querySelectorAll('.achievement-categories .category-btn');
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active to secret button
            secretButton.classList.add('active');
        }
        
        this.applyFiltersAndSort();
    }
    
    /**
     * Reset all filters to default
     */
    resetAllFilters() {
        this.currentFilter = {
            category: 'all',
            progressStatus: 'all',
            searchText: '',
            sortBy: 'category',
            sortOrder: 'asc',
            nearCompletion: false
        };
        
        // Reset UI controls
        const searchInput = document.getElementById('achievementSearchInput');
        const progressStatusFilter = document.getElementById('progressStatusFilter');
        const sortBySelect = document.getElementById('sortBySelect');
        const sortOrderSelect = document.getElementById('sortOrderSelect');
        const nearCompletionBtn = document.getElementById('nearCompletionBtn');
        
        if (searchInput) searchInput.value = '';
        if (progressStatusFilter) progressStatusFilter.value = 'all';
        if (sortBySelect) sortBySelect.value = 'category';
        if (sortOrderSelect) sortOrderSelect.value = 'asc';
        if (nearCompletionBtn) nearCompletionBtn.classList.remove('active');
        
        // Reset category buttons
        const categoryButtons = document.querySelectorAll('.achievement-categories .category-btn');
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        const allButton = document.querySelector('[data-category="all"]');
        if (allButton) allButton.classList.add('active');
        
        this.applyFiltersAndSort();
    }
    
    /**
     * Show enhanced achievement details modal
     */
    showEnhancedAchievementDetails(achievement) {
        try {
            // Create enhanced modal
            const modal = document.createElement('div');
            modal.className = 'enhanced-achievement-modal';
            modal.innerHTML = `
                <div class="enhanced-modal-overlay"></div>
                <div class="enhanced-modal-content">
                    <div class="modal-header">
                        <div class="achievement-icon-large">
                            ${this.getAchievementIcon(achievement)}
                        </div>
                        <div class="achievement-title-section">
                            <h2 class="achievement-title">${achievement.unlocked ? achievement.name : (achievement.hidden ? 'Hidden Achievement' : achievement.name)}</h2>
                            <div class="achievement-meta">
                                ${this.getDifficultyStars(achievement.difficulty)}
                                <span class="category-badge">${achievement.category}</span>
                            </div>
                        </div>
                        <button class="modal-close-btn">✕</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="achievement-description-section">
                            <h3>Description</h3>
                            <p>${achievement.unlocked ? achievement.description : (achievement.hidden ? 'Complete the requirements to unlock this achievement.' : achievement.description)}</p>
                        </div>
                        
                        <div class="achievement-progress-section">
                            <h3>Progress</h3>
                            ${this.getDetailedProgressDisplay(achievement)}
                        </div>
                        
                        ${achievement.reward ? `<div class="achievement-reward-section">
                            <h3>Rewards</h3>
                            ${this.getDetailedRewardDisplay(achievement.reward)}
                        </div>` : ''}
                        
                        ${achievement.unlocked ? `<div class="achievement-unlock-section">
                            <h3>Achievement Unlocked</h3>
                            <p>Unlocked on: ${this.formatUnlockDate(achievement.unlockTimestamp)}</p>
                        </div>` : ''}
                        
                        ${this.getAchievementTips(achievement)}
                    </div>
                </div>
            `;
            
            // Add event listeners
            const closeBtn = modal.querySelector('.modal-close-btn');
            const overlay = modal.querySelector('.enhanced-modal-overlay');
            
            const closeModal = () => document.body.removeChild(modal);
            
            closeBtn.addEventListener('click', closeModal);
            overlay.addEventListener('click', closeModal);
            
            // Escape key to close
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
            
            document.body.appendChild(modal);
            
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Error showing achievement details:', error);
        }
    }
    
    /**
     * Get detailed progress display for modal
     */
    getDetailedProgressDisplay(achievement) {
        const progress = achievement.progress;
        
        if (achievement.unlocked) {
            return `<div class="detailed-progress completed">
                <div class="progress-status">✅ Achievement Completed!</div>
            </div>`;
        }
        
        if (!progress || progress.percentage === 0) {
            return `<div class="detailed-progress not-started">
                <div class="progress-status">🔒 Not Started</div>
                <div class="progress-hint">Complete the required actions to begin progress on this achievement.</div>
            </div>`;
        }
        
        const percentage = Math.min(100, Math.max(0, progress.percentage));
        const isNearCompletion = percentage >= 70;
        
        return `<div class="detailed-progress in-progress ${isNearCompletion ? 'near-completion' : ''}">
            <div class="progress-status">
                ${isNearCompletion ? '🎯 Near Completion!' : '⏳ In Progress'}
            </div>
            <div class="detailed-progress-bar">
                <div class="progress-text">${progress.current || 0}/${progress.target || 1}</div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${percentage}%">
                        <span class="progress-percentage">${Math.round(percentage)}%</span>
                    </div>
                </div>
            </div>
            ${isNearCompletion ? '<div class="progress-encouragement">You\'re almost there! Keep going!</div>' : ''}
        </div>`;
    }
    
    /**
     * Get detailed reward display for modal
     */
    getDetailedRewardDisplay(reward) {
        const rewards = [];
        
        if (reward.dharma) {
            rewards.push(`<div class="reward-item">
                <span class="reward-icon">💎</span>
                <span class="reward-text">${reward.dharma} Dharma</span>
            </div>`);
        }
        
        if (reward.bandwidth) {
            rewards.push(`<div class="reward-item">
                <span class="reward-icon">📡</span>
                <span class="reward-text">${reward.bandwidth} Bandwidth</span>
            </div>`);
        }
        
        if (reward.anonymity) {
            rewards.push(`<div class="reward-item">
                <span class="reward-icon">🕶️</span>
                <span class="reward-text">${reward.anonymity} Anonymity</span>
            </div>`);
        }
        
        if (reward.special_items) {
            rewards.push(`<div class="reward-item">
                <span class="reward-icon">🎁</span>
                <span class="reward-text">${reward.special_items} Special Item${reward.special_items > 1 ? 's' : ''}</span>
            </div>`);
        }
        
        if (reward.title) {
            rewards.push(`<div class="reward-item special">
                <span class="reward-icon">👑</span>
                <span class="reward-text">Title: "${reward.title}"</span>
            </div>`);
        }
        
        return `<div class="detailed-rewards">${rewards.join('')}</div>`;
    }
    
    /**
     * Get achievement tips and hints
     */
    getAchievementTips(achievement) {
        if (achievement.unlocked) return '';
        
        const tips = this.getAchievementHints(achievement);
        if (!tips || tips.length === 0) return '';
        
        return `<div class="achievement-tips-section">
            <h3>💡 Tips</h3>
            <ul class="tips-list">
                ${tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
        </div>`;
    }
    
    /**
     * Get specific hints for achievements
     */
    getAchievementHints(achievement) {
        const hints = [];
        
        if (achievement.condition) {
            switch (achievement.condition.type) {
                case 'cumulative':
                    hints.push(`You need to achieve a total of ${achievement.condition.target} ${achievement.condition.event.replace('_', ' ')} actions.`);
                    if (achievement.progress && achievement.progress.current > 0) {
                        const remaining = achievement.condition.target - achievement.progress.current;
                        hints.push(`Only ${remaining} more to go!`);
                    }
                    break;
                case 'streak':
                    hints.push(`Achieve ${achievement.condition.target} consecutive successes without failure.`);
                    break;
                case 'single_event':
                    hints.push(`Complete the specific action: ${achievement.condition.event.replace('_', ' ')}.`);
                    break;
            }
        }
        
        // Category-specific hints
        switch (achievement.category) {
            case 'combat':
                hints.push('Focus on enemy elimination and perfect wave completion.');
                break;
            case 'strategy':
                hints.push('Experiment with different defense combinations and placement strategies.');
                break;
            case 'progression':
                hints.push('Continue playing through levels and improving your skills.');
                break;
            case 'secret':
                hints.push('Look for hidden interactions and easter eggs in the game.');
                break;
        }
        
        return hints;
    }
    
    /**
     * Public method to open the enhanced gallery
     */
    openEnhancedGallery() {
        try {
            this.refreshAchievementData();
            
            // Show the achievement screen (use existing game method)
            if (this.game && typeof this.game.showAchievementScreen === 'function') {
                this.game.showAchievementScreen();
            }
            
            console.log('[EnhancedAchievementGallery] Opened enhanced gallery');
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Error opening enhanced gallery:', error);
        }
    }
    
    /**
     * Get achievements near completion (public method for quick access)
     */
    getNearCompletionAchievements(threshold = 0.7) {
        try {
            return this.allAchievements.filter(achievement => {
                return !achievement.unlocked && 
                       achievement.progress && 
                       achievement.progress.percentage >= (threshold * 100);
            });
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Error getting near completion achievements:', error);
            return [];
        }
    }
    
    /**
     * Search achievements by text (public method)
     */
    searchAchievements(searchText) {
        try {
            this.currentFilter.searchText = searchText.toLowerCase();
            
            const searchInput = document.getElementById('achievementSearchInput');
            if (searchInput) {
                searchInput.value = searchText;
            }
            
            this.applyFiltersAndSort();
            return this.filteredAchievements;
        } catch (error) {
            console.error('[EnhancedAchievementGallery] Error searching achievements:', error);
            return [];
        }
    }
}

// Export for use in other modules and expose globally
export default EnhancedAchievementGallery;

if (typeof window !== 'undefined') {
    window.EnhancedAchievementGallery = EnhancedAchievementGallery;
}
