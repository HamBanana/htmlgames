// GameFramework/src/systems/AudioSystem.js

/**
 * AudioSystem - Manages audio playback and sound effects
 * @class AudioSystem
 */
export class AudioSystem {
    constructor(engine) {
        this.engine = engine;
        
        // Audio context
        this.context = null;
        this.masterGain = null;
        
        // Sound management
        this.sounds = new Map();
        this.soundInstances = new Map();
        this.music = null;
        
        // Volume settings
        this.volumes = {
            master: 1.0,
            sfx: 0.8,
            music: 0.7,
            voice: 0.9
        };
        
        // Audio state
        this.muted = false;
        this.initialized = false;
        
        // Pool for sound instances
        this.instancePool = [];
        this.maxInstances = 32;
    }
    
    /**
     * Initialize audio system
     */
    initialize() {
        // Create audio context on first user interaction
        const initAudio = () => {
            if (this.initialized) return;
            
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.context = new AudioContext();
                
                // Create master gain node
                this.masterGain = this.context.createGain();
                this.masterGain.connect(this.context.destination);
                this.masterGain.gain.value = this.volumes.master;
                
                this.initialized = true;
                console.log('Audio system initialized');
                
                // Resume context if suspended
                if (this.context.state === 'suspended') {
                    this.context.resume();
                }
                
                // Remove listener after initialization
                document.removeEventListener('click', initAudio);
                document.removeEventListener('keydown', initAudio);
                document.removeEventListener('touchstart', initAudio);
                
            } catch (error) {
                console.error('Failed to initialize audio context:', error);
            }
        };
        
        // Listen for user interaction
        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('keydown', initAudio, { once: true });
        document.addEventListener('touchstart', initAudio, { once: true });
    }
    
    /**
     * Get or create a sound from loaded asset
     * @param {string} name - Sound name
     * @returns {object|null} Sound data
     */
    getSound(name) {
        // Check if already processed
        if (this.sounds.has(name)) {
            return this.sounds.get(name);
        }
        
        // Get from asset manager
        const asset = this.engine.assets.get(name);
        if (!asset || asset.type !== 'audio') {
            console.warn(`Audio asset '${name}' not found`);
            return null;
        }
        
        // Store sound data
        const sound = {
            name,
            element: asset.data,
            buffer: null,
            duration: asset.data.duration || 0,
            loaded: true
        };
        
        this.sounds.set(name, sound);
        
        // If using Web Audio API, decode audio data
        if (this.initialized && this.context) {
            this._decodeAudioData(sound);
        }
        
        return sound;
    }
    
    /**
     * Decode audio data for Web Audio API
     * @private
     */
    async _decodeAudioData(sound) {
        if (!sound.element.src) return;
        
        try {
            const response = await fetch(sound.element.src);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            
            sound.buffer = audioBuffer;
            sound.duration = audioBuffer.duration;
            
        } catch (error) {
            console.error(`Failed to decode audio ${sound.name}:`, error);
        }
    }
    
    /**
     * Play a sound
     * @param {string} name - Sound name
     * @param {object} options - Playback options
     * @returns {object|null} Sound instance
     */
    play(name, options = {}) {
        if (this.muted && !options.ignoreMute) return null;
        
        const sound = this.getSound(name);
        if (!sound) return null;
        
        // Determine volume category
        const category = options.category || 'sfx';
        const categoryVolume = this.volumes[category] || 1;
        const volume = (options.volume || 1) * categoryVolume * this.volumes.master;
        
        // Use Web Audio API if available
        if (this.initialized && this.context && sound.buffer) {
            return this._playWithWebAudio(sound, { ...options, volume });
        }
        
        // Fallback to HTML5 Audio
        return this._playWithHTML5Audio(sound, { ...options, volume });
    }
    
    /**
     * Play sound using Web Audio API
     * @private
     */
    _playWithWebAudio(sound, options) {
        const source = this.context.createBufferSource();
        source.buffer = sound.buffer;
        
        // Create gain node for this sound
        const gainNode = this.context.createGain();
        gainNode.gain.value = options.volume;
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Apply options
        if (options.loop) {
            source.loop = true;
            source.loopStart = options.loopStart || 0;
            source.loopEnd = options.loopEnd || sound.buffer.duration;
        }
        
        source.playbackRate.value = options.pitch || 1;
        
        // Create instance object
        const instance = {
            id: `${sound.name}_${Date.now()}`,
            sound,
            source,
            gainNode,
            startTime: this.context.currentTime,
            options,
            playing: true
        };
        
        // Handle end event
        source.onended = () => {
            instance.playing = false;
            this.soundInstances.delete(instance.id);
            
            if (options.onEnd) {
                options.onEnd(instance);
            }
        };
        
        // Start playback
        const startTime = options.delay || 0;
        const startOffset = options.offset || 0;
        
        if (options.duration) {
            source.start(startTime, startOffset, options.duration);
        } else {
            source.start(startTime, startOffset);
        }
        
        // Store instance
        this.soundInstances.set(instance.id, instance);
        
        return instance;
    }
    
    /**
     * Play sound using HTML5 Audio
     * @private
     */
    _playWithHTML5Audio(sound, options) {
        // Clone audio element for multiple instances
        const audio = sound.element.cloneNode();
        
        audio.volume = Math.max(0, Math.min(1, options.volume));
        audio.loop = options.loop || false;
        audio.playbackRate = options.pitch || 1;
        
        if (options.offset) {
            audio.currentTime = options.offset;
        }
        
        // Create instance object
        const instance = {
            id: `${sound.name}_${Date.now()}`,
            sound,
            audio,
            startTime: Date.now() / 1000,
            options,
            playing: true
        };
        
        // Handle end event
        audio.onended = () => {
            instance.playing = false;
            this.soundInstances.delete(instance.id);
            
            if (options.onEnd) {
                options.onEnd(instance);
            }
        };
        
        // Start playback
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn(`Failed to play sound ${sound.name}:`, error);
                this.soundInstances.delete(instance.id);
            });
        }
        
        // Store instance
        this.soundInstances.set(instance.id, instance);
        
        return instance;
    }
    
    /**
     * Stop a sound instance
     * @param {object} instance - Sound instance
     * @param {number} fadeTime - Fade out time in seconds
     */
    stop(instance, fadeTime = 0) {
        if (!instance || !instance.playing) return;
        
        if (fadeTime > 0) {
            this.fadeOut(instance, fadeTime, () => {
                this._stopInstance(instance);
            });
        } else {
            this._stopInstance(instance);
        }
    }
    
    /**
     * Stop sound instance immediately
     * @private
     */
    _stopInstance(instance) {
        instance.playing = false;
        
        if (instance.source) {
            instance.source.stop();
        } else if (instance.audio) {
            instance.audio.pause();
            instance.audio.currentTime = 0;
        }
        
        this.soundInstances.delete(instance.id);
    }
    
    /**
     * Stop all sounds
     * @param {string} [category] - Optional category to stop
     */
    stopAll(category) {
        this.soundInstances.forEach(instance => {
            if (!category || instance.options.category === category) {
                this.stop(instance);
            }
        });
    }
    
    /**
     * Play music
     * @param {string} name - Music track name
     * @param {object} options - Playback options
     * @returns {object|null} Music instance
     */
    playMusic(name, options = {}) {
        // Stop current music
        if (this.music) {
            this.stopMusic(options.fadeTime || 1);
        }
        
        // Play new music
        this.music = this.play(name, {
            ...options,
            category: 'music',
            loop: options.loop !== false
        });
        
        return this.music;
    }
    
    /**
     * Stop music
     * @param {number} fadeTime - Fade out time
     */
    stopMusic(fadeTime = 1) {
        if (this.music) {
            this.stop(this.music, fadeTime);
            this.music = null;
        }
    }
    
    /**
     * Set volume for a category
     * @param {string} category - Volume category
     * @param {number} volume - Volume (0-1)
     */
    setVolume(category, volume) {
        this.volumes[category] = Math.max(0, Math.min(1, volume));
        
        // Update master gain if it's the master volume
        if (category === 'master' && this.masterGain) {
            this.masterGain.gain.value = this.volumes.master;
        }
        
        // Update playing instances
        this.soundInstances.forEach(instance => {
            if (instance.options.category === category || category === 'master') {
                this._updateInstanceVolume(instance);
            }
        });
    }
    
    /**
     * Update instance volume
     * @private
     */
    _updateInstanceVolume(instance) {
        const category = instance.options.category || 'sfx';
        const categoryVolume = this.volumes[category] || 1;
        const volume = (instance.options.volume || 1) * categoryVolume * this.volumes.master;
        
        if (instance.gainNode) {
            instance.gainNode.gain.value = volume;
        } else if (instance.audio) {
            instance.audio.volume = volume;
        }
    }
    
    /**
     * Get volume for category
     * @param {string} category - Volume category
     * @returns {number} Volume (0-1)
     */
    getVolume(category) {
        return this.volumes[category] || 1;
    }
    
    /**
     * Mute/unmute audio
     * @param {boolean} muted - Mute state
     */
    setMuted(muted) {
        this.muted = muted;
        
        if (this.masterGain) {
            this.masterGain.gain.value = muted ? 0 : this.volumes.master;
        }
        
        // Update HTML5 audio instances
        this.soundInstances.forEach(instance => {
            if (instance.audio) {
                instance.audio.muted = muted;
            }
        });
    }
    
    /**
     * Fade in sound instance
     * @param {object} instance - Sound instance
     * @param {number} duration - Fade duration in seconds
     * @param {number} targetVolume - Target volume
     */
    fadeIn(instance, duration, targetVolume = 1) {
        if (!instance || !instance.playing) return;
        
        const startVolume = 0;
        const startTime = Date.now();
        
        const update = () => {
            if (!instance.playing) return;
            
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const volume = startVolume + (targetVolume - startVolume) * progress;
            
            if (instance.gainNode) {
                instance.gainNode.gain.value = volume;
            } else if (instance.audio) {
                instance.audio.volume = volume;
            }
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };
        
        update();
    }
    
    /**
     * Fade out sound instance
     * @param {object} instance - Sound instance
     * @param {number} duration - Fade duration in seconds
     * @param {Function} callback - Callback when fade completes
     */
    fadeOut(instance, duration, callback) {
        if (!instance || !instance.playing) return;
        
        const startVolume = instance.gainNode 
            ? instance.gainNode.gain.value 
            : (instance.audio ? instance.audio.volume : 1);
        const startTime = Date.now();
        
        const update = () => {
            if (!instance.playing) return;
            
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const volume = startVolume * (1 - progress);
            
            if (instance.gainNode) {
                instance.gainNode.gain.value = volume;
            } else if (instance.audio) {
                instance.audio.volume = volume;
            }
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else if (callback) {
                callback();
            }
        };
        
        update();
    }
    
    /**
     * Create a sound effect with variations
     * @param {string} baseName - Base sound name
     * @param {object} options - Effect options
     * @returns {object|null} Sound instance
     */
    playSoundEffect(baseName, options = {}) {
        const variations = options.variations || 1;
        const pitchVariation = options.pitchVariation || 0;
        const volumeVariation = options.volumeVariation || 0;
        
        // Select random variation
        const variation = variations > 1 
            ? Math.floor(Math.random() * variations) + 1 
            : '';
        const soundName = variation ? `${baseName}${variation}` : baseName;
        
        // Apply random variations
        const pitch = 1 + (Math.random() - 0.5) * pitchVariation;
        const volumeAdjust = 1 + (Math.random() - 0.5) * volumeVariation;
        
        return this.play(soundName, {
            ...options,
            pitch,
            volume: (options.volume || 1) * volumeAdjust
        });
    }
    
    /**
     * Play 3D positioned sound (simple stereo panning)
     * @param {string} name - Sound name
     * @param {Vector2} position - World position
     * @param {object} options - Sound options
     * @returns {object|null} Sound instance
     */
    play3D(name, position, options = {}) {
        const camera = this.engine.renderer.camera;
        const listener = options.listener || camera.position;
        
        // Calculate distance and panning
        const distance = position.distanceTo(listener);
        const maxDistance = options.maxDistance || 1000;
        const rolloff = options.rolloff || 1;
        
        // Calculate volume based on distance
        const volume = Math.max(0, 1 - Math.pow(distance / maxDistance, rolloff));
        
        // Calculate stereo panning (-1 to 1)
        const dx = position.x - listener.x;
        const pan = Math.max(-1, Math.min(1, dx / maxDistance));
        
        // Play with calculated parameters
        const instance = this.play(name, {
            ...options,
            volume: volume * (options.volume || 1)
        });
        
        // Apply panning if using Web Audio
        if (instance && this.context && instance.source) {
            const panNode = this.context.createStereoPanner();
            panNode.pan.value = pan;
            
            // Reconnect with pan node
            instance.gainNode.disconnect();
            instance.gainNode.connect(panNode);
            panNode.connect(this.masterGain);
            
            instance.panNode = panNode;
        }
        
        return instance;
    }
    
    /**
     * Update 3D sound position
     * @param {object} instance - Sound instance
     * @param {Vector2} position - New position
     */
    update3DPosition(instance, position) {
        if (!instance || !instance.panNode) return;
        
        const camera = this.engine.renderer.camera;
        const listener = camera.position;
        
        // Recalculate panning
        const dx = position.x - listener.x;
        const maxDistance = instance.options.maxDistance || 1000;
        const pan = Math.max(-1, Math.min(1, dx / maxDistance));
        
        instance.panNode.pan.value = pan;
    }
    
    /**
     * Clean up audio system
     */
    destroy() {
        // Stop all sounds
        this.stopAll();
        
        // Close audio context
        if (this.context) {
            this.context.close();
            this.context = null;
        }
        
        // Clear references
        this.sounds.clear();
        this.soundInstances.clear();
        this.music = null;
    }
}