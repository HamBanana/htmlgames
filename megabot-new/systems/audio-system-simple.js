// audio-system-simple.js - Simple audio system implementation
class AudioSystem {
    constructor(config) {
        this.config = config || {};
        this.enabled = config.enabled !== false;
        this.sounds = new Map();
        
        console.log('AudioSystem: Initialized (simple implementation)');
    }
    
    async loadSound(name, url) {
        if (!this.enabled) return;
        
        try {
            const audio = new Audio(url);
            audio.preload = 'auto';
            this.sounds.set(name, audio);
            console.log(`AudioSystem: Loaded sound ${name}`);
        } catch (error) {
            console.warn(`AudioSystem: Failed to load sound ${name}:`, error);
        }
    }
    
    playSound(name, volume = 1) {
        if (!this.enabled) return;
        
        const sound = this.sounds.get(name);
        if (sound) {
            try {
                const clone = sound.cloneNode();
                clone.volume = Math.min(1, Math.max(0, volume));
                clone.play().catch(e => {
                    // Ignore autoplay policy errors
                });
            } catch (error) {
                console.warn(`AudioSystem: Failed to play sound ${name}:`, error);
            }
        }
    }
    
    stopSound(name) {
        if (!this.enabled) return;
        
        const sound = this.sounds.get(name);
        if (sound) {
            try {
                sound.pause();
                sound.currentTime = 0;
            } catch (error) {
                console.warn(`AudioSystem: Failed to stop sound ${name}:`, error);
            }
        }
    }
    
    async preloadAll() {
        // Simple implementation doesn't preload
        return Promise.resolve();
    }
    
    setMasterVolume(volume) {
        // Not implemented in simple version
    }
    
    setSFXVolume(volume) {
        // Not implemented in simple version
    }
    
    setMusicVolume(volume) {
        // Not implemented in simple version
    }
}

// Make AudioSystem available globally
window.AudioSystem = AudioSystem;