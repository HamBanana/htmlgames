// systems/enhanced-audio-system.js - Complete audio implementation
class EnhancedAudioSystem {
    constructor(config) {
        this.config = config;
        this.enabled = config.enabled !== false;
        this.volumes = config.volumes || {};
        
        // Audio contexts
        this.audioContext = null;
        this.sounds = new Map();
        this.music = new Map();
        this.currentMusic = null;
        
        // Sound pools for frequently played sounds
        this.soundPools = new Map();
        this.poolSize = 5;
        
        // Initialize if enabled
        if (this.enabled) {
            this.initialize();
        }
    }
    
    initialize() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.volumes.master || 0.8;
            
            // Create separate gain nodes for SFX and music
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = this.volumes.sfx || 0.7;
            
            this.musicGain = this.audioContext.createGain();
            this.musicGain.connect(this.masterGain);
            this.musicGain.gain.value = this.volumes.music || 0.5;
            
            // Resume audio context on user interaction
            document.addEventListener('click', () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            }, { once: true });
            
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
            this.enabled = false;
        }
    }
    
    async loadSound(name, url, isMusic = false) {
        if (!this.enabled) return;
        
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            if (isMusic) {
                this.music.set(name, audioBuffer);
            } else {
                this.sounds.set(name, audioBuffer);
                // Create sound pool for frequently used sounds
                this.createSoundPool(name, audioBuffer);
            }
            
            console.log(`Loaded ${isMusic ? 'music' : 'sound'}: ${name}`);
        } catch (error) {
            console.error(`Failed to load audio ${name}:`, error);
        }
    }
    
    createSoundPool(name, buffer) {
        const pool = [];
        for (let i = 0; i < this.poolSize; i++) {
            pool.push({
                buffer: buffer,
                source: null,
                playing: false
            });
        }
        this.soundPools.set(name, pool);
    }
    
    playSound(name, options = {}) {
        if (!this.enabled || !this.sounds.has(name)) return;
        
        const {
            volume = 1,
            pitch = 1,
            loop = false,
            pan = 0
        } = options;
        
        // Get available sound from pool
        const pool = this.soundPools.get(name);
        const soundData = pool.find(s => !s.playing);
        
        if (!soundData) {
            console.warn(`All instances of sound '${name}' are playing`);
            return;
        }
        
        // Create source
        const source = this.audioContext.createBufferSource();
        source.buffer = soundData.buffer;
        source.loop = loop;
        source.playbackRate.value = pitch;
        
        // Create gain node for this sound
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;
        
        // Create panner for stereo positioning
        const pannerNode = this.audioContext.createStereoPanner();
        pannerNode.pan.value = Math.max(-1, Math.min(1, pan));
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(pannerNode);
        pannerNode.connect(this.sfxGain);
        
        // Track playing state
        soundData.playing = true;
        soundData.source = source;
        
        source.onended = () => {
            soundData.playing = false;
            soundData.source = null;
        };
        
        // Start playback
        source.start(0);
        
        return source;
    }
    
    playMusic(name, fadeIn = true) {
        if (!this.enabled || !this.music.has(name)) return;
        
        // Stop current music
        this.stopMusic(true);
        
        // Create source for new music
        const source = this.audioContext.createBufferSource();
        source.buffer = this.music.get(name);
        source.loop = true;
        
        // Create gain node for fading
        const gainNode = this.audioContext.createGain();
        
        if (fadeIn) {
            gainNode.gain.value = 0;
            gainNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + 2);
        } else {
            gainNode.gain.value = 1;
        }
        
        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(this.musicGain);
        
        // Start playback
        source.start(0);
        
        this.currentMusic = {
            name: name,
            source: source,
            gainNode: gainNode
        };
    }
    
    stopMusic(fadeOut = true) {
        if (!this.currentMusic) return;
        
        if (fadeOut) {
            this.currentMusic.gainNode.gain.linearRampToValueAtTime(
                0, 
                this.audioContext.currentTime + 1
            );
            
            setTimeout(() => {
                if (this.currentMusic) {
                    this.currentMusic.source.stop();
                    this.currentMusic = null;
                }
            }, 1000);
        } else {
            this.currentMusic.source.stop();
            this.currentMusic = null;
        }
    }
    
    stopSound(name) {
        if (!this.enabled) return;
        
        const pool = this.soundPools.get(name);
        if (pool) {
            pool.forEach(soundData => {
                if (soundData.playing && soundData.source) {
                    soundData.source.stop();
                    soundData.playing = false;
                    soundData.source = null;
                }
            });
        }
    }
    
    // 3D positional audio
    play3DSound(name, position, listenerPosition, options = {}) {
        if (!this.enabled || !this.sounds.has(name)) return;
        
        const distance = Math.sqrt(
            Math.pow(position.x - listenerPosition.x, 2) +
            Math.pow(position.y - listenerPosition.y, 2)
        );
        
        const maxDistance = options.maxDistance || 800;
        if (distance > maxDistance) return;
        
        // Calculate volume based on distance
        const volume = Math.max(0, 1 - (distance / maxDistance));
        
        // Calculate pan based on horizontal position
        const pan = Math.max(-1, Math.min(1, 
            (position.x - listenerPosition.x) / 400
        ));
        
        this.playSound(name, {
            ...options,
            volume: volume * (options.volume || 1),
            pan: pan
        });
    }
    
    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
            this.volumes.master = volume;
        }
    }
    
    setSFXVolume(volume) {
        if (this.sfxGain) {
            this.sfxGain.gain.value = Math.max(0, Math.min(1, volume));
            this.volumes.sfx = volume;
        }
    }
    
    setMusicVolume(volume) {
        if (this.musicGain) {
            this.musicGain.gain.value = Math.max(0, Math.min(1, volume));
            this.volumes.music = volume;
        }
    }
    
    // Preload all configured sounds
    async preloadAll() {
        if (!this.enabled) return;
        
        const loadPromises = [];
        
        // Load sound effects
        if (this.config.sounds) {
            for (const [name, url] of Object.entries(this.config.sounds)) {
                loadPromises.push(this.loadSound(name, url, false));
            }
        }
        
        // Load music
        if (this.config.music) {
            for (const [name, url] of Object.entries(this.config.music)) {
                loadPromises.push(this.loadSound(name, url, true));
            }
        }
        
        await Promise.all(loadPromises);
        console.log('All audio assets loaded');
    }
}

// Sound Manager for game integration
class SoundManager {
    constructor(audioSystem) {
        this.audio = audioSystem;
        this.musicStates = {
            menu: 'menu',
            gameplay: 'stage',
            boss: 'boss',
            victory: 'victory',
            gameOver: 'gameover'
        };
    }
    
    // Game-specific sound methods
    playPlayerShoot(charged = false) {
        if (charged) {
            this.audio.playSound('charged', { volume: 0.8, pitch: 0.8 });
        } else {
            this.audio.playSound('shoot', { volume: 0.6, pitch: 1 + Math.random() * 0.1 });
        }
    }
    
    playEnemyHit(position, listenerPosition) {
        this.audio.play3DSound('hit', position, listenerPosition, { 
            volume: 0.7,
            pitch: 0.9 + Math.random() * 0.2 
        });
    }
    
    playExplosion(position, listenerPosition, size = 'medium') {
        const volumes = { small: 0.6, medium: 0.8, large: 1.0 };
        const pitches = { small: 1.2, medium: 1.0, large: 0.8 };
        
        this.audio.play3DSound('explosion', position, listenerPosition, {
            volume: volumes[size] || 0.8,
            pitch: pitches[size] || 1.0
        });
    }
    
    playJump() {
        this.audio.playSound('jump', { 
            volume: 0.5,
            pitch: 0.95 + Math.random() * 0.1 
        });
    }
    
    playSlide() {
        this.audio.playSound('slide', { volume: 0.6 });
    }
    
    playPickup(type) {
        this.audio.playSound('powerup', { 
            volume: 0.8,
            pitch: type === 'health' ? 1.2 : 1.0 
        });
    }
    
    playPlayerHurt() {
        this.audio.playSound('hurt', { volume: 0.9 });
    }
    
    playBossHit() {
        this.audio.playSound('bosshit', { 
            volume: 0.9,
            pitch: 0.8 + Math.random() * 0.2 
        });
    }
    
    // Music state management
    setMusicState(state) {
        const musicTrack = this.musicStates[state];
        if (musicTrack) {
            this.audio.playMusic(musicTrack, true);
        }
    }
    
    stopAllSounds() {
        // Stop all sound effects
        ['shoot', 'hit', 'explosion', 'jump', 'powerup'].forEach(sound => {
            this.audio.stopSound(sound);
        });
    }
}

// Integration with game manager
class AudioGameIntegration {
    static integrate(gameManager) {
        // Create audio system
        const audioSystem = new EnhancedAudioSystem(gameManager.config.audio || {});
        const soundManager = new SoundManager(audioSystem);
        
        // Store references
        gameManager.audioSystem = audioSystem;
        gameManager.soundManager = soundManager;
        
        // Preload sounds
        audioSystem.preloadAll().then(() => {
            console.log('Audio system ready');
        });
        
        // Hook into game events
        this.setupGameHooks(gameManager, soundManager);
    }
    
    static setupGameHooks(gameManager, soundManager) {
        // Store original methods
        const originalShoot = gameManager.player.shoot.bind(gameManager.player);
        const originalTakeDamage = gameManager.player.takeDamage.bind(gameManager.player);
        
        // Override player shoot
        gameManager.player.shoot = function() {
            const result = originalShoot();
            if (result) {
                soundManager.playPlayerShoot(this.chargeTimer >= this.maxCharge);
            }
            return result;
        };
        
        // Override player take damage
        gameManager.player.takeDamage = function(amount) {
            const hadShield = this.shield > 0;
            const result = originalTakeDamage(amount);
            
            if (!hadShield && this.invulnerable > 0) {
                soundManager.playPlayerHurt();
            }
            
            return result;
        };
        
        // Music transitions
        const originalStartGame = gameManager.startGame.bind(gameManager);
        gameManager.startGame = async function() {
            soundManager.setMusicState('gameplay');
            return originalStartGame();
        };
        
        const originalActivateBoss = gameManager.activateBoss.bind(gameManager);
        gameManager.activateBoss = function() {
            soundManager.setMusicState('boss');
            return originalActivateBoss();
        };
        
        const originalGameWin = gameManager.gameWin.bind(gameManager);
        gameManager.gameWin = function() {
            soundManager.setMusicState('victory');
            return originalGameWin();
        };
        
        const originalGameOver = gameManager.gameOver.bind(gameManager);
        gameManager.gameOver = function() {
            soundManager.setMusicState('gameOver');
            return originalGameOver();
        };
    }
}