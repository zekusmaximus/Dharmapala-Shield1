class AudioManager {
    constructor() {
        this.context = null;
        this.sounds = new Map();
        this.music = new Map();
        this.soundPool = new Map();
        
        this.masterVolume = 1.0;
        this.musicVolume = 0.7;
        this.sfxVolume = 0.8;
        this.enabled = true;
        
        this.currentMusic = null;
        this.musicFadeTimeout = null;
        
        this.poolSize = 5;
        this.maxSounds = 20;
        this.activeSounds = [];
        
        this.loadSettings();
        this.initializeAudioContext();
    }

    initializeAudioContext() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            
            if (this.context.state === 'suspended') {
                document.addEventListener('click', () => this.resumeContext(), { once: true });
                document.addEventListener('keydown', () => this.resumeContext(), { once: true });
            }
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
            this.context = null;
        }
    }

    resumeContext() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume().catch(e => console.warn('Failed to resume audio context:', e));
        }
    }

    loadSettings() {
        const settings = Utils.storage.get('audioSettings', {});
        this.masterVolume = settings.masterVolume !== undefined ? settings.masterVolume : 1.0;
        this.musicVolume = settings.musicVolume !== undefined ? settings.musicVolume : 0.7;
        this.sfxVolume = settings.sfxVolume !== undefined ? settings.sfxVolume : 0.8;
        this.enabled = settings.enabled !== undefined ? settings.enabled : true;
    }

    saveSettings() {
        Utils.storage.set('audioSettings', {
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            enabled: this.enabled
        });
    }

    async loadSound(name, url, isMusic = false) {
        if (!this.enabled) return null;

        try {
            const audio = await this.createAudio(url);
            
            if (isMusic) {
                this.music.set(name, audio);
            } else {
                this.sounds.set(name, audio);
                this.createSoundPool(name, audio);
            }
            
            return audio;
        } catch (error) {
            console.warn(`Failed to load ${isMusic ? 'music' : 'sound'} ${name}:`, error);
            return null;
        }
    }

    createAudio(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => resolve(audio);
            audio.onerror = reject;
            audio.src = url;
        });
    }

    createSoundPool(name, originalAudio) {
        const pool = [];
        for (let i = 0; i < this.poolSize; i++) {
            const audio = originalAudio.cloneNode();
            pool.push({
                audio: audio,
                playing: false,
                lastPlayed: 0
            });
        }
        this.soundPool.set(name, pool);
    }

    playSound(name, volume = 1.0, loop = false, fadeIn = false) {
        if (!this.enabled) return null;

        const pool = this.soundPool.get(name);
        if (!pool) {
            console.warn(`Sound ${name} not found`);
            return null;
        }

        let soundInstance = pool.find(instance => !instance.playing);
        
        if (!soundInstance) {
            soundInstance = pool.reduce((oldest, current) => 
                current.lastPlayed < oldest.lastPlayed ? current : oldest
            );
        }

        const audio = soundInstance.audio;
        const finalVolume = this.masterVolume * this.sfxVolume * volume;

        audio.volume = fadeIn ? 0 : Utils.math.clamp(finalVolume, 0, 1);
        audio.loop = loop;
        audio.currentTime = 0;

        const playPromise = audio.play();
        if (playPromise) {
            playPromise.catch(e => console.warn('Audio play failed:', e));
        }

        soundInstance.playing = true;
        soundInstance.lastPlayed = Utils.performance.now();

        audio.onended = () => {
            soundInstance.playing = false;
            this.removeSoundFromActive(audio);
        };

        this.activeSounds.push(audio);
        if (this.activeSounds.length > this.maxSounds) {
            const oldestSound = this.activeSounds.shift();
            this.stopAudio(oldestSound);
        }

        if (fadeIn) {
            this.fadeInAudio(audio, finalVolume, 500);
        }

        return audio;
    }

    playMusic(name, volume = 1.0, fadeIn = true, loop = true) {
        if (!this.enabled) return null;

        const music = this.music.get(name);
        if (!music) {
            console.warn(`Music ${name} not found`);
            return null;
        }

        if (this.currentMusic && this.currentMusic !== music) {
            this.stopMusic(true);
        }

        const finalVolume = this.masterVolume * this.musicVolume * volume;
        
        music.volume = fadeIn ? 0 : Utils.math.clamp(finalVolume, 0, 1);
        music.loop = loop;
        music.currentTime = 0;

        const playPromise = music.play();
        if (playPromise) {
            playPromise.catch(e => console.warn('Music play failed:', e));
        }

        this.currentMusic = music;

        if (fadeIn) {
            this.fadeInAudio(music, finalVolume, 1000);
        }

        return music;
    }

    stopSound(name) {
        const pool = this.soundPool.get(name);
        if (pool) {
            pool.forEach(instance => {
                if (instance.playing) {
                    this.stopAudio(instance.audio);
                    instance.playing = false;
                }
            });
        }
    }

    stopMusic(fadeOut = false) {
        if (!this.currentMusic) return;

        if (fadeOut) {
            this.fadeOutAudio(this.currentMusic, 1000, () => {
                this.stopAudio(this.currentMusic);
                this.currentMusic = null;
            });
        } else {
            this.stopAudio(this.currentMusic);
            this.currentMusic = null;
        }
    }

    stopAudio(audio) {
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            this.removeSoundFromActive(audio);
        }
    }

    removeSoundFromActive(audio) {
        const index = this.activeSounds.indexOf(audio);
        if (index > -1) {
            this.activeSounds.splice(index, 1);
        }
    }

    fadeInAudio(audio, targetVolume, duration) {
        const startTime = Utils.performance.now();
        const startVolume = 0;

        const fade = () => {
            const elapsed = Utils.performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            audio.volume = Utils.math.lerp(startVolume, targetVolume, progress);
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            }
        };

        requestAnimationFrame(fade);
    }

    fadeOutAudio(audio, duration, callback) {
        const startTime = Utils.performance.now();
        const startVolume = audio.volume;

        const fade = () => {
            const elapsed = Utils.performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            audio.volume = Utils.math.lerp(startVolume, 0, progress);
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            } else if (callback) {
                callback();
            }
        };

        requestAnimationFrame(fade);
    }

    setMasterVolume(volume) {
        this.masterVolume = Utils.math.clamp(volume, 0, 1);
        this.updateAllVolumes();
        this.saveSettings();
    }

    setMusicVolume(volume) {
        this.musicVolume = Utils.math.clamp(volume, 0, 1);
        if (this.currentMusic) {
            this.currentMusic.volume = this.masterVolume * this.musicVolume;
        }
        this.saveSettings();
    }

    setSfxVolume(volume) {
        this.sfxVolume = Utils.math.clamp(volume, 0, 1);
        this.saveSettings();
    }

    updateAllVolumes() {
        if (this.currentMusic) {
            this.currentMusic.volume = this.masterVolume * this.musicVolume;
        }

        this.activeSounds.forEach(audio => {
            const baseVolume = audio.dataset?.baseVolume || 1.0;
            audio.volume = this.masterVolume * this.sfxVolume * parseFloat(baseVolume);
        });
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        
        if (!enabled) {
            this.stopAllSounds();
            this.stopMusic();
        }
        
        this.saveSettings();
    }

    stopAllSounds() {
        this.activeSounds.forEach(audio => this.stopAudio(audio));
        this.activeSounds.length = 0;

        this.soundPool.forEach(pool => {
            pool.forEach(instance => {
                if (instance.playing) {
                    this.stopAudio(instance.audio);
                    instance.playing = false;
                }
            });
        });
    }

    preloadAudioAssets(audioList) {
        const promises = audioList.map(({name, url, isMusic}) => 
            this.loadSound(name, url, isMusic)
        );
        return Promise.all(promises);
    }

    createFallbackSounds() {
        if (!this.context) return;

        try {
            this.createBeepSound('ui_click', 800, 0.1);
            this.createBeepSound('ui_hover', 600, 0.05);
            this.createBeepSound('defense_place', 400, 0.2);
            this.createBeepSound('enemy_hit', 200, 0.15);
            this.createBeepSound('wave_start', 1000, 0.3);
        } catch (error) {
            console.warn('Failed to create fallback sounds:', error);
        }
    }

    createBeepSound(name, frequency, duration) {
        const sampleRate = this.context.sampleRate;
        const frames = sampleRate * duration;
        const buffer = this.context.createBuffer(1, frames, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < frames; i++) {
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
        }

        const audio = {
            buffer: buffer,
            play: () => {
                if (this.context) {
                    const source = this.context.createBufferSource();
                    const gainNode = this.context.createGain();
                    
                    source.buffer = buffer;
                    source.connect(gainNode);
                    gainNode.connect(this.context.destination);
                    gainNode.gain.value = this.masterVolume * this.sfxVolume;
                    
                    source.start();
                }
            }
        };

        this.sounds.set(name, audio);
    }

    getMasterVolume() { return this.masterVolume; }
    getMusicVolume() { return this.musicVolume; }
    getSfxVolume() { return this.sfxVolume; }
    isEnabled() { return this.enabled; }

    destroy() {
        this.stopAllSounds();
        this.stopMusic();
        
        if (this.context) {
            this.context.close().catch(e => console.warn('Error closing audio context:', e));
        }
        
        this.sounds.clear();
        this.music.clear();
        this.soundPool.clear();
    }
}

const audioManager = new AudioManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
} else {
    window.AudioManager = AudioManager;
    window.audioManager = audioManager;
}