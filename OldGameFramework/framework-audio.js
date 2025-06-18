// GameFramework/framework-audio.js - Enhanced Audio System with Web Audio API support

/**
 * Audio Asset Class - Represents a loaded audio asset
 */
class AudioAsset {
    constructor(id, audioBuffer, config = {}) {
        this.id = id;
        this.audioBuffer = audioBuffer;
        this.config = config;
        this.instances = new Set();
        this.maxInstances = config.maxInstances || 5;
        this.defaultVolume = config.volume || 1;
        this.loop = config.loop || false;
        this.category = config.category || 'sfx'; // 'sfx', 'music', 'voice'
    }
    
    createInstance(audioContext, destination) {
        // Clean up finished instances
        this.cleanupInstances();
        
        // Limit concurrent instances
        if (this.instances.size >= this.maxInstances) {
            const oldestInstance = this.instances.values().next().value;
            if (oldestInstance) {
                oldestInstance.stop();
            }
        }
        
        const instance = new AudioInstance(this, audioContext, destination);
        this.instances.add(instance);
        
        return instance;
    }
    
    cleanupInstances() {
        const toRemove = [];
        this.instances.forEach(instance => {
            if (instance.isFinished()) {
                toRemove.push(instance);
            }
        });
        
        toRemove.forEach(instance => {
            this.instances.delete(instance);
        });
    }
    
    stopAll() {
        this.instances.forEach(instance => instance.stop());
        this.instances.clear();
    }
}

/**
 * Audio Instance Class - Represents a playing audio instance
 */
class AudioInstance {
    constructor(asset, audioContext, destination) {
        this.asset = asset;
        this.audioContext = audioContext;
        this.destination = destination;
        
        // Create audio nodes
        this.source = audioContext.createBufferSource();
        this.gainNode = audioContext.createGain();
        
        // Set up audio graph
        this.source.buffer = asset.audioBuffer;
        this.source.loop = asset.loop;
        this.source.connect(this.gainNode);
        this.gainNode.connect(destination);
        
        // Set initial volume
        this.gainNode.gain.setValueAtTime(asset.defaultVolume, audioContext.currentTime);
        
        // Track state
        this.playing = false;
        this.finished = false;
        this.startTime = 0;
        this.pauseTime = 0;
        
        // Handle completion
        this.source.onended = () => {
            this.finished = true;
            this.playing = false;
            this.asset.instances.delete(this);
        };
    }
    
    play(options = {}) {
        if (this.playing || this.finished) return;
        
        const when = options.when || 0;
        const offset = options.offset || this.pauseTime;
        const duration = options.duration;
        
        // Apply options
        if (options.volume !== undefined) {
            this.setVolume(options.volume);
        }
        
        if (options.loop !== undefined) {
            this.source.loop = options.loop;
        }
        
        // Start playback
        if (duration !== undefined) {
            this.source.start(when, offset, duration);
        } else {
            this.source.start(when, offset);
        }
        
        this.playing = true;
        this.startTime = this.audioContext.currentTime - offset;
        
        return this;
    }
    
    stop() {
        if (!this.playing || this.finished) return;
        
        try {
            this.source.stop();
        } catch (error) {
            // Source might already be stopped
        }
        
        this.playing = false;
        this.finished = true;
        
        return this;
    }
    
    pause() {
        if (!this.playing || this.finished) return;
        
        this.pauseTime = this.audioContext.currentTime - this.startTime;
        this.stop();
        
        // Create new source for resume
        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.asset.audioBuffer;
        this.source.loop = this.asset.loop;
        this.source.connect(this.gainNode);
        
        this.source.onended = () => {
            this.finished = true;
            this.playing = false;
            this.asset.instances.delete(this);
        };
        
        this.finished = false;
        
        return this;
    }
    
    setVolume(volume) {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        this.gainNode.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
        return this;
    }
    
    fadeIn(duration = 1, targetVolume = 1) {
        this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(targetVolume, this.audioContext.currentTime + duration);
        return this;
    }
    
    fadeOut(duration = 1) {
        const currentTime = this.audioContext.currentTime;
        this.gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);
        
        // Stop after fade completes
        setTimeout(() => {
            this.stop();
        }, duration * 1000);
        
        return this;
    }
    
    isPlaying() {
        return this.playing && !this.finished;
    }
    
    isFinished() {
        return this.finished;
    }
    
    getCurrentTime() {
        if (!this.playing) return this.pauseTime;
        return this.audioContext.currentTime - this.startTime;
    }
    
    getDuration() {
        return this.asset.audioBuffer.duration;
    }
}

/**
 * Enhanced Audio System - Web Audio API based audio management
 */
class AudioSystem extends System {
    constructor(config = {}) {
        super(config);
        
        // Audio context
        this.audioContext = null;
        this.masterGain = null;
        this.categoryGains = new Map();
        
        // Asset management
        this.assets = new Map();
        this.loadingPromises = new Map();
        
        // Configuration
        this.masterVolume = config.masterVolume || 1;
        this.categoryVolumes = config.categoryVolumes || {
            music: 0.7,
            sfx: 0.8,
            voice: 0.9
        };
        
        // State
        this.muted = false;
        this.initialized = false;
        this.suspended = false;
        
        // Supported formats (in order of preference)
        this.supportedFormats = ['ogg', 'mp3', 'wav', 'm4a', 'aac'];
        
        // Initialize when user interacts with page
        this.initPromise = this.initializeOnUserGesture();
    }
    
    async initializeOnUserGesture() {
        return new Promise((resolve) => {
            const initAudio = async () => {
                try {
                    await this.initializeAudioContext();
                    document.removeEventListener('click', initAudio);
                    document.removeEventListener('keydown', initAudio);
                    document.removeEventListener('touchstart', initAudio);
                    resolve();
                } catch (error) {
                    console.error('Failed to initialize audio:', error);
                }
            };
            
            // Try to initialize immediately (might work in some browsers)
            initAudio().catch(() => {
                // If immediate initialization fails, wait for user gesture
                document.addEventListener('click', initAudio);
                document.addEventListener('keydown', initAudio);
                document.addEventListener('touchstart', initAudio);
            });
        });
    }
    
    async initializeAudioContext() {
        if (this.initialized) return;
        
        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            throw new Error('Web Audio API not supported');
        }
        
        this.audioContext = new AudioContext();
        
        // Create master gain node
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
        
        // Create category gain nodes
        Object.keys(this.categoryVolumes).forEach(category => {
            const gainNode = this.audioContext.createGain();
            gainNode.connect(this.masterGain);
            gainNode.gain.setValueAtTime(this.categoryVolumes[category], this.audioContext.currentTime);
            this.categoryGains.set(category, gainNode);
        });
        
        // Handle context state changes
        this.audioContext.addEventListener('statechange', () => {
            if (this.audioContext.state === 'suspended') {
                this.suspended = true;
            } else if (this.audioContext.state === 'running') {
                this.suspended = false;
            }
        });
        
        this.initialized = true;
        console.log('🔊 Audio system initialized');
    }
    
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initPromise;
        }
        
        // Resume context if suspended
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
    
    /**
     * Load an audio asset from URL
     */
    async loadSound(id, url, config = {}) {
        // Return cached asset if already loaded
        if (this.assets.has(id)) {
            return this.assets.get(id);
        }
        
        // Return existing loading promise
        if (this.loadingPromises.has(id)) {
            return this.loadingPromises.get(id);
        }
        
        console.log(`🔊 Loading audio: ${id} from ${url}`);
        
        const loadPromise = this.doLoadSound(id, url, config);
        this.loadingPromises.set(id, loadPromise);
        
        try {
            const asset = await loadPromise;
            this.assets.set(id, asset);
            this.loadingPromises.delete(id);
            console.log(`  ✅ Audio loaded: ${id}`);
            return asset;
        } catch (error) {
            this.loadingPromises.delete(id);
            console.error(`❌ Failed to load audio ${id}:`, error);
            throw error;
        }
    }
    
    async doLoadSound(id, url, config) {
        await this.ensureInitialized();
        
        // Try to find the best supported format
        const finalUrl = await this.resolveBestFormat(url);
        
        // Fetch audio data
        const response = await fetch(finalUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Decode audio data
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
        // Create asset
        const asset = new AudioAsset(id, audioBuffer, config);
        
        return asset;
    }
    
    async resolveBestFormat(baseUrl) {
        // If URL already has an extension, use it
        if (this.hasAudioExtension(baseUrl)) {
            return baseUrl;
        }
        
        // Try to find the best supported format
        for (const format of this.supportedFormats) {
            const testUrl = `${baseUrl}.${format}`;
            
            try {
                const response = await fetch(testUrl, { method: 'HEAD' });
                if (response.ok) {
                    return testUrl;
                }
            } catch (error) {
                // Continue to next format
            }
        }
        
        // Default to .ogg if no format found
        return `${baseUrl}.ogg`;
    }
    
    hasAudioExtension(url) {
        const extensions = this.supportedFormats.join('|');
        const regex = new RegExp(`\\.(${extensions})$`, 'i');
        return regex.test(url);
    }
    
    /**
     * Play a sound effect or music
     */
    async play(soundId, options = {}) {
        await this.ensureInitialized();
        
        if (this.muted && !options.ignoreMute) {
            return null;
        }
        
        const asset = this.assets.get(soundId);
        if (!asset) {
            console.warn(`Audio asset '${soundId}' not found`);
            return null;
        }
        
        // Get the appropriate category gain node
        const categoryGain = this.categoryGains.get(asset.category) || this.masterGain;
        
        // Create and configure instance
        const instance = asset.createInstance(this.audioContext, categoryGain);
        
        // Apply options
        const playOptions = {
            volume: options.volume !== undefined ? options.volume : asset.defaultVolume,
            loop: options.loop !== undefined ? options.loop : asset.loop,
            ...options
        };
        
        // Start playback
        instance.play(playOptions);
        
        return instance;
    }
    
    /**
     * Stop all instances of a sound
     */
    stop(soundId) {
        const asset = this.assets.get(soundId);
        if (asset) {
            asset.stopAll();
        }
    }
    
    /**
     * Stop all audio
     */
    stopAll() {
        this.assets.forEach(asset => asset.stopAll());
    }
    
    /**
     * Set master volume (0-1)
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(
                this.muted ? 0 : this.masterVolume,
                this.audioContext.currentTime
            );
        }
    }
    
    /**
     * Set category volume (0-1)
     */
    setCategoryVolume(category, volume) {
        this.categoryVolumes[category] = Math.max(0, Math.min(1, volume));
        
        const gainNode = this.categoryGains.get(category);
        if (gainNode) {
            gainNode.gain.setValueAtTime(
                this.categoryVolumes[category],
                this.audioContext.currentTime
            );
        }
    }
    
    /**
     * Mute/unmute audio
     */
    setMuted(muted) {
        this.muted = muted;
        
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(
                muted ? 0 : this.masterVolume,
                this.audioContext.currentTime
            );
        }
    }
    
    /**
     * Toggle mute
     */
    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }
    
    /**
     * Get audio asset
     */
    getAsset(soundId) {
        return this.assets.get(soundId);
    }
    
    /**
     * Check if audio asset exists
     */
    hasAsset(soundId) {
        return this.assets.has(soundId);
    }
    
    /**
     * Get current master volume
     */
    getMasterVolume() {
        return this.masterVolume;
    }
    
    /**
     * Get category volume
     */
    getCategoryVolume(category) {
        return this.categoryVolumes[category] || 1;
    }
    
    /**
     * Check if muted
     */
    isMuted() {
        return this.muted;
    }
    
    /**
     * Preload multiple audio assets
     */
    async preloadSounds(soundList) {
        const loadPromises = soundList.map(sound => {
            if (typeof sound === 'string') {
                return this.loadSound(sound, sound);
            } else {
                return this.loadSound(sound.id, sound.url, sound.config);
            }
        });
        
        const results = await Promise.allSettled(loadPromises);
        
        const failed = results
            .map((result, index) => ({ result, sound: soundList[index] }))
            .filter(({ result }) => result.status === 'rejected');
        
        if (failed.length > 0) {
            console.warn(`Failed to load ${failed.length} audio assets:`, failed);
        }
        
        return results;
    }
    
    /**
     * Create audio category (for dynamic categories)
     */
    createCategory(name, volume = 1) {
        if (this.categoryGains.has(name)) {
            console.warn(`Audio category '${name}' already exists`);
            return;
        }
        
        this.categoryVolumes[name] = volume;
        
        if (this.masterGain) {
            const gainNode = this.audioContext.createGain();
            gainNode.connect(this.masterGain);
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            this.categoryGains.set(name, gainNode);
        }
    }
    
    /**
     * Get audio system stats
     */
    getStats() {
        let totalInstances = 0;
        let playingInstances = 0;
        
        this.assets.forEach(asset => {
            totalInstances += asset.instances.size;
            asset.instances.forEach(instance => {
                if (instance.isPlaying()) {
                    playingInstances++;
                }
            });
        });
        
        return {
            assetsLoaded: this.assets.size,
            totalInstances,
            playingInstances,
            initialized: this.initialized,
            suspended: this.suspended,
            muted: this.muted,
            masterVolume: this.masterVolume,
            categoryVolumes: { ...this.categoryVolumes }
        };
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.stopAll();
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.assets.clear();
        this.loadingPromises.clear();
        this.categoryGains.clear();
    }
}

// Audio Component for entities that need audio playback
class AudioComponent extends Component {
    constructor(config = {}) {
        super(config);
        this.sounds = config.sounds || {};
        this.currentInstances = new Map();
        this.volume = config.volume || 1;
        this.category = config.category || 'sfx';
    }
    
    async play(soundId, options = {}) {
        const audio = this.game?.getSystem('audio');
        if (!audio) return null;
        
        // Stop previous instance if not allowing overlap
        if (!options.allowOverlap) {
            this.stop(soundId);
        }
        
        const mergedOptions = {
            volume: this.volume,
            category: this.category,
            ...options
        };
        
        const instance = await audio.play(soundId, mergedOptions);
        
        if (instance) {
            this.currentInstances.set(soundId, instance);
        }
        
        return instance;
    }
    
    stop(soundId) {
        const instance = this.currentInstances.get(soundId);
        if (instance) {
            instance.stop();
            this.currentInstances.delete(soundId);
        }
    }
    
    stopAll() {
        this.currentInstances.forEach(instance => instance.stop());
        this.currentInstances.clear();
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        // Update volume of currently playing instances
        this.currentInstances.forEach(instance => {
            instance.setVolume(this.volume);
        });
    }
    
    isPlaying(soundId) {
        const instance = this.currentInstances.get(soundId);
        return instance ? instance.isPlaying() : false;
    }
    
    destroy() {
        this.stopAll();
    }
}

// Replace the existing AudioSystem in the global scope
window.AudioSystem = AudioSystem;
window.AudioAsset = AudioAsset;
window.AudioInstance = AudioInstance;
window.AudioComponent = AudioComponent;

// Update GameFramework namespace
if (typeof window !== 'undefined') {
    if (!window.GameFramework) window.GameFramework = {};
    if (!window.GameFramework.Audio) {
        window.GameFramework.Audio = {
            System: AudioSystem,
            Asset: AudioAsset,
            Instance: AudioInstance,
            Component: AudioComponent
        };
    }
}

console.log('🎵 Enhanced Audio System loaded');

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AudioSystem,
        AudioAsset,
        AudioInstance,
        AudioComponent
    };
}