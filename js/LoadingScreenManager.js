/**
 * LoadingScreenManager - Handles loading screen display and transitions for GameBootstrap
 */
export default class LoadingScreenManager {
    constructor() {
        this.loadingScreen = null;
    }

    show() {
        const gameScreen = document.getElementById('game-screen');
        const loadingScreen = document.getElementById('loading-screen');
        if (gameScreen) gameScreen.style.display = 'none';
        if (loadingScreen) {
            loadingScreen.classList.remove('fade-out', 'hidden');
            loadingScreen.classList.add('active');
            loadingScreen.style.display = 'flex';
            loadingScreen.offsetHeight;
            loadingScreen.classList.add('fade-in');
            this.loadingScreen = loadingScreen;
        }
    }

    hide() {
        if (!this.loadingScreen) return;
        this.loadingScreen.classList.remove('fade-in');
        this.loadingScreen.classList.add('fade-out');
        const transitionDuration = this.getTransitionDuration(this.loadingScreen) || 500;
        setTimeout(() => {
            if (this.loadingScreen) {
                this.loadingScreen.style.display = 'none';
                this.loadingScreen.classList.remove('active', 'fade-out');
                this.loadingScreen.classList.add('hidden');
            }
        }, transitionDuration);
    }

    getTransitionDuration(element) {
        try {
            const computedStyle = window.getComputedStyle(element);
            const duration = computedStyle.transitionDuration;
            if (duration && duration !== '0s') {
                const seconds = parseFloat(duration.replace('s', ''));
                return Math.round(seconds * 1000);
            }
        } catch {}
        return null;
    }
}
