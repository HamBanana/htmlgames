// example-audio-usage.js - How to use GameFramework's Enhanced Audio System

/**
 * This file demonstrates how to use the enhanced audio system in GameFramework
 * Place this in your game's main.js or similar file
 */

// Wait for GameFramework to be ready
window.addEventListener('gameframework:ready', async () => {
    console.log('🎮 GameFramework ready, setting up audio demo...');
    
    // Create a game instance with audio configuration
    const game = await GameFramework.quickStart({
        width: 800,
        height: 600,
        canvasId: 'gameCanvas',
        
        // Audio configuration
        masterVolume: 0.8,
        categoryVolumes: {
            music: 0.6,
            sfx: 0.8,
            voice: 0.9,
            ui: 0.5
        },
        
        // Auto-preload common audio
        preloadAudio: true
    });
    
    // === BASIC AUDIO LOADING ===
    
    // Load audio with built-in presets
    await game.loadAudio('backgroundMusic', 'background-music', { preset: 'music' });
    await game.loadAudio('jumpSound', 'jump', { preset: 'sfx' });
    await game.loadAudio('clickSound', 'click', { preset: 'ui' });
    
    // Load audio with custom configuration
    await game.loadAudio('explosionSound', 'explosion', {
        category: 'sfx',
        volume: 1.0,
        maxInstances: 5,
        loop: false
    });
    
    // Load multiple audio files at once
    const audioAssets = [
        { id: 'menuMusic', filename: 'menu-theme', config: { preset: 'music' } },
        { id: 'hoverSound', filename: 'button-hover', config: { preset: 'ui' } },
        { id: 'collectSound', filename: 'item-collect', config: { preset: 'sfx' } },
        { id: 'ambientWind', filename: 'wind-loop', config: { preset: 'ambient' } }
    ];
    
    await game.loadAudioAssets(audioAssets);
    
    // === BASIC AUDIO PLAYBACK ===
    
    // Play simple sound
    game.playSound('clickSound');
    
    // Play sound with options
    game.playSound('jumpSound', {
        volume: 0.5,
        pitch: 1.2 // If supported
    });
    
    // Play music with crossfade
    game.playMusic('backgroundMusic', {
        fadeIn: 2.0,
        volume: 0.7
    });
    
    // === ADVANCED AUDIO FEATURES ===
    
    // Get audio instance for advanced control
    const explosionInstance = await game.playSound('explosionSound', {
        volume: 0.8
    });
    
    if (explosionInstance) {
        // Fade out after 2 seconds
        setTimeout(() => {
            explosionInstance.fadeOut(1.0);
        }, 2000);
    }
    
    // === VOLUME CONTROLS ===
    
    // Master volume control
    game.setMasterVolume(0.5);
    
    // Category volume controls
    game.setCategoryVolume('music', 0.3);
    game.setCategoryVolume('sfx', 0.9);
    
    // Mute/unmute
    game.setMuted(true);
    setTimeout(() => game.setMuted(false), 1000);
    
    // Toggle mute
    const isMuted = game.toggleMute();
    console.log('Audio muted:', isMuted);
    
    // === MUSIC MANAGEMENT ===
    
    // Play music with automatic stopping of previous track
    game.playMusic('menuMusic');
    
    // Crossfade to new music
    setTimeout(() => {
        game.playMusic('backgroundMusic', {
            crossfade: 2.0,
            fadeIn: 1.5
        });
    }, 5000);
    
    // Stop music with fade out
    setTimeout(() => {
        game.stopMusic(3.0); // 3 second fade out
    }, 10000);
    
    // === CUSTOM AUDIO PRESETS ===
    
    // Create custom preset
    game.createAudioPreset('powerup', {
        category: 'sfx',
        volume: 0.9,
        maxInstances: 2,
        loop: false
    });
    
    // Use custom preset
    await game.loadAudio('powerupSound', 'powerup-sound', { preset: 'powerup' });
    game.playSound('powerupSound');
    
    // === AUDIO COMPONENT USAGE ===
    
    // Create entity with audio component
    class AudioEntity extends BaseEntity {
        constructor(config) {
            super(config);
            
            // Add audio component
            this.addComponent(new AudioComponent({
                sounds: {
                    'idle': 'entity-idle',
                    'action': 'entity-action'
                },
                volume: 0.7,
                category: 'sfx'
            }));
        }
        
        async playIdleSound() {
            const audio = this.getComponent(AudioComponent);
            if (audio) {
                await audio.play('idle');
            }
        }
        
        async playActionSound() {
            const audio = this.getComponent(AudioComponent);
            if (audio) {
                await audio.play('action', { volume: 1.0 });
            }
        }
    }
    
    // === AUDIO EVENTS AND MONITORING ===
    
    // Listen for audio events
    game.events.on('asset:loaded', (event) => {
        if (event.type === 'audio') {
            console.log(`🔊 Audio loaded: ${event.id} (${event.category})`);
        }
    });
    
    // Monitor audio system performance
    setInterval(() => {
        const audioStats = game.getAudioStats();
        if (audioStats) {
            console.log('🎵 Audio Stats:', {
                assetsLoaded: audioStats.assetsLoaded,
                playingInstances: audioStats.playingInstances,
                masterVolume: audioStats.masterVolume,
                muted: audioStats.muted
            });
        }
    }, 10000); // Every 10 seconds
    
    // === ERROR HANDLING ===
    
    try {
        await game.loadAudio('testSound', 'non-existent-file');
    } catch (error) {
        console.warn('Failed to load audio:', error.message);
        // Gracefully continue without the audio
    }
    
    // === EXAMPLE: INTERACTIVE AUDIO DEMO ===
    
    // Create simple interactive demo
    function createAudioDemo() {
        const demoDiv = document.createElement('div');
        demoDiv.style.cssText = `
            position: fixed; top: 20px; left: 20px; 
            background: rgba(0,0,0,0.8); color: white; 
            padding: 20px; border-radius: 8px; 
            font-family: Arial, sans-serif; z-index: 1000;
        `;
        
        demoDiv.innerHTML = `
            <h3>🎵 Audio System Demo</h3>
            <button id="playMusic">Play Music</button>
            <button id="playSound">Play Sound</button>
            <button id="stopAll">Stop All</button><br><br>
            
            <label>Master Volume: <input type="range" id="masterVol" min="0" max="100" value="80"></label><br>
            <label>Music Volume: <input type="range" id="musicVol" min="0" max="100" value="60"></label><br>
            <label>SFX Volume: <input type="range" id="sfxVol" min="0" max="100" value="80"></label><br><br>
            
            <button id="toggleMute">Toggle Mute</button>
        `;
        
        document.body.appendChild(demoDiv);
        
        // Wire up controls
        document.getElementById('playMusic').onclick = () => {
            game.playMusic('backgroundMusic', { fadeIn: 1.0 });
        };
        
        document.getElementById('playSound').onclick = () => {
            game.playSound('jumpSound');
        };
        
        document.getElementById('stopAll').onclick = () => {
            game.stopAllSounds();
        };
        
        document.getElementById('masterVol').oninput = (e) => {
            game.setMasterVolume(e.target.value / 100);
        };
        
        document.getElementById('musicVol').oninput = (e) => {
            game.setCategoryVolume('music', e.target.value / 100);
        };
        
        document.getElementById('sfxVol').oninput = (e) => {
            game.setCategoryVolume('sfx', e.target.value / 100);
        };
        
        document.getElementById('toggleMute').onclick = () => {
            const muted = game.toggleMute();
            document.getElementById('toggleMute').textContent = muted ? 'Unmute' : 'Mute';
        };
    }
    
    // Create the demo (remove this in your actual game)
    createAudioDemo();
    
    console.log('🎵 Audio demo ready! Use the controls to test audio features.');
});

// === AUDIO ASSET NAMING CONVENTIONS ===

/*
Recommended file structure:

/GameAssets/Audio/
├── Music/
│   ├── menu-theme.ogg
│   ├── background-music.ogg
│   └── boss-theme.ogg
├── SFX/
│   ├── jump.ogg
│   ├── hit.ogg
│   ├── explosion.ogg
│   └── powerup-sound.ogg
├── UI/
│   ├── click.ogg
│   ├── hover.ogg
│   └── select.ogg
├── Voice/
│   ├── narrator-intro.ogg
│   └── character-dialogue.ogg
└── Ambient/
    ├── wind-loop.ogg
    └── forest-ambience.ogg

Audio files should be in OGG format for best compatibility,
with MP3/WAV fallbacks if needed.
*/

// === PERFORMANCE TIPS ===

/*
1. Use audio presets for consistent configuration
2. Load common sounds early, music on-demand
3. Limit concurrent instances to prevent audio clipping
4. Use appropriate categories for proper volume mixing
5. Enable user gesture requirement for mobile compatibility
6. Use fadeIn/fadeOut for smooth transitions
7. Monitor audio stats for performance optimization
8. Implement graceful fallbacks for unsupported formats
*/
