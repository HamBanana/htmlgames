// GameFramework/src/components/AudioSource.js
import { Component } from '../core/Component.js';

/**
 * AudioSource - Audio playback component
 * @class AudioSource
 */
export class AudioSource extends Component {
    constructor(config = {}) {
        super(config);
        
        // Audio properties
        this.clip = config.clip || null; // Audio asset name
        this.volume = config.volume !== undefined ? config.volume : 1;
        this.pitch = config.pitch || 1;
        this.loop = config.loop || false;
        this.playOnStart = config.playOnStart || false;
        this.category = config.category || 'sfx'; // sfx, music, voice
        
        // 3D audio properties
        this.is3D = config.is3D || false;
        this.minDistance = config.minDistance || 10;
        this.maxDistance = config.maxDistance || 1000;
        this.rolloffFactor = config.rolloffFactor || 1;
        
        // Playback state
        this.isPlaying = false;
        this.isPaused = false;
        this.currentInstance = null;
        
        // Multiple clips support
        this.clips = config.clips || []; // Array of clip names for random selection
        this.lastClipIndex = -1;
        
        // Auto-play settings
        this.autoPlay = {
            enabled: config.autoPlay || false,
            delay: config.autoPlayDelay || 0,
            interval: config.autoPlayInterval || 0,
            variance: config.autoPlayVariance || 0
        };
        
        this.autoPlayTimer = 0;
        this.nextPlayTime = 0;
    }
    
    /**
     * Called when component starts
     */
    start() {
        if (this.playOnStart && this.clip) {
            this.play();
        }
        
        if (this.autoPlay.enabled) {
            this.scheduleNextPlay();
        }
    }
    
    /**
     * Update component
     * @param {number} deltaTime - Delta time
     */
    update(deltaTime) {
        // Handle auto-play
        if (this.autoPlay.enabled && !this.isPlaying) {
            this.autoPlayTimer += deltaTime;
            
            if (this.autoPlayTimer >= this.nextPlayTime) {
                this.play();
                this.scheduleNextPlay();
            }
        }
        
        // Update 3D position if playing
        if (this.is3D && this.isPlaying && this.currentInstance) {
            const audio = this.engine.getSystem('audio');
            if (audio) {
                audio.update3DPosition(this.currentInstance, this.entity.position);
            }
        }
    }
    
    /**
     * Play audio
     * @param {string} [clipName] - Optional clip to play
     * @param {object} [options] - Play options
     */
    play(clipName, options = {}) {
        const audio = this.engine?.getSystem('audio');
        if (!audio) return;
        
        // Stop current playback
        if (this.isPlaying) {
            this.stop();
        }
        
        // Determine which clip to play
        const clip = clipName || this.selectClip();
        if (!clip) {
            console.warn('No audio clip specified');
            return;
        }
        
        // Merge options
        const playOptions = {
            volume: this.volume,
            pitch: this.pitch,
            loop: this.loop,
            category: this.category,
            ...options
        };
        
        // Play 3D or 2D audio
        if (this.is3D) {
            playOptions.maxDistance = this.maxDistance;
            playOptions.rolloff = this.rolloffFactor;
            this.currentInstance = audio.play3D(clip, this.entity.position, playOptions);
        } else {
            this.currentInstance = audio.play(clip, playOptions);
        }
        
        if (this.currentInstance) {
            this.isPlaying = true;
            this.isPaused = false;
            
            // Set up end callback
            const originalOnEnd = playOptions.onEnd;
            this.currentInstance.options.onEnd = (instance) => {
                this.isPlaying = false;
                this.currentInstance = null;
                
                if (originalOnEnd) {
                    originalOnEnd(instance);
                }
                
                if (this.entity) {
                    this.entity.emit('audio:end', { clip });
                }
            };
            
            if (this.entity) {
                this.entity.emit('audio:play', { clip, instance: this.currentInstance });
            }
        }
    }
    
    /**
     * Stop audio
     * @param {number} [fadeTime] - Fade out time in seconds
     */
    stop(fadeTime = 0) {
        if (!this.currentInstance) return;
        
        const audio = this.engine?.getSystem('audio');
        if (audio) {
            audio.stop(this.currentInstance, fadeTime);
        }
        
        this.isPlaying = false;
        this.isPaused = false;
        this.currentInstance = null;
        
        if (this.entity) {
            this.entity.emit('audio:stop');
        }
    }
    
    /**
     * Pause audio
     */
    pause() {
        if (!this.currentInstance || !this.isPlaying || this.isPaused) return;
        
        // Note: HTML5 audio doesn't have a great pause API
        // This is a simplified implementation
        if (this.currentInstance.audio) {
            this.currentInstance.audio.pause();
        }
        
        this.isPaused = true;
        
        if (this.entity) {
            this.entity.emit('audio:pause');
        }
    }
    
    /**
     * Resume audio
     */
    resume() {
        if (!this.currentInstance || !this.isPaused) return;
        
        if (this.currentInstance.audio) {
            this.currentInstance.audio.play();
        }
        
        this.isPaused = false;
        
        if (this.entity) {
            this.entity.emit('audio:resume');
        }
    }
    
    /**
     * Set volume
     * @param {number} volume - Volume (0-1)
     * @param {number} [fadeTime] - Fade time in seconds
     */
    setVolume(volume, fadeTime = 0) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        if (this.currentInstance) {
            if (fadeTime > 0) {
                // Fade volume
                const audio = this.engine?.getSystem('audio');
                if (audio) {
                    const startVolume = this.currentInstance.gainNode
                        ? this.currentInstance.gainNode.gain.value
                        : this.currentInstance.audio.volume;
                    
                    const startTime = Date.now();
                    const update = () => {
                        const elapsed = (Date.now() - startTime) / 1000;
                        const progress = Math.min(elapsed / fadeTime, 1);
                        const currentVolume = startVolume + (this.volume - startVolume) * progress;
                        
                        if (this.currentInstance.gainNode) {
                            this.currentInstance.gainNode.gain.value = currentVolume;
                        } else if (this.currentInstance.audio) {
                            this.currentInstance.audio.volume = currentVolume;
                        }
                        
                        if (progress < 1) {
                            requestAnimationFrame(update);
                        }
                    };
                    update();
                }
            } else {
                // Set volume immediately
                if (this.currentInstance.gainNode) {
                    this.currentInstance.gainNode.gain.value = this.volume;
                } else if (this.currentInstance.audio) {
                    this.currentInstance.audio.volume = this.volume;
                }
            }
        }
    }
    
    /**
     * Set pitch
     * @param {number} pitch - Pitch multiplier
     */
    setPitch(pitch) {
        this.pitch = pitch;
        
        if (this.currentInstance) {
            if (this.currentInstance.source) {
                this.currentInstance.source.playbackRate.value = pitch;
            } else if (this.currentInstance.audio) {
                this.currentInstance.audio.playbackRate = pitch;
            }
        }
    }
    
    /**
     * Select a clip to play
     * @private
     */
    selectClip() {
        if (this.clip) return this.clip;
        
        if (this.clips.length === 0) return null;
        
        if (this.clips.length === 1) return this.clips[0];
        
        // Select random clip (avoiding immediate repeat)
        let index;
        do {
            index = Math.floor(Math.random() * this.clips.length);
        } while (index === this.lastClipIndex && this.clips.length > 1);
        
        this.lastClipIndex = index;
        return this.clips[index];
    }
    
    /**
     * Schedule next auto-play
     * @private
     */
    scheduleNextPlay() {
        this.autoPlayTimer = 0;
        
        let delay = this.autoPlay.delay;
        if (this.isPlaying) {
            delay += this.autoPlay.interval;
        }
        
        // Add variance
        if (this.autoPlay.variance > 0) {
            delay += (Math.random() - 0.5) * this.autoPlay.variance;
        }
        
        this.nextPlayTime = Math.max(0, delay);
    }
    
    /**
     * Play one shot (doesn't affect current playback)
     * @param {string} clipName - Clip to play
     * @param {object} [options] - Play options
     */
    playOneShot(clipName, options = {}) {
        const audio = this.engine?.getSystem('audio');
        if (!audio) return;
        
        const playOptions = {
            volume: this.volume,
            pitch: this.pitch,
            category: this.category,
            ...options
        };
        
        if (this.is3D) {
            audio.play3D(clipName, this.entity.position, playOptions);
        } else {
            audio.play(clipName, playOptions);
        }
    }
    
    /**
     * Fade in
     * @param {number} duration - Fade duration in seconds
     * @param {number} [targetVolume] - Target volume
     */
    fadeIn(duration, targetVolume = this.volume) {
        if (!this.isPlaying) {
            this.volume = 0;
            this.play();
        }
        
        this.setVolume(targetVolume, duration);
    }
    
    /**
     * Fade out
     * @param {number} duration - Fade duration in seconds
     */
    fadeOut(duration) {
        if (!this.isPlaying) return;
        
        const audio = this.engine?.getSystem('audio');
        if (audio && this.currentInstance) {
            audio.fadeOut(this.currentInstance, duration, () => {
                this.stop();
            });
        }
    }
    
    /**
     * Called when component is destroyed
     */
    destroy() {
        this.stop();
        super.destroy();
    }
}