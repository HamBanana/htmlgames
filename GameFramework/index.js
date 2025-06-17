// GameFramework/index.js - Framework entry point (UPDATED FOR AUDIO)

/**
 * GameFramework - A powerful HTML5 game development framework
 * @version 1.0.4 - Complete standalone version with enhanced audio
 */

// Prevent multiple loading
if (window.GameFramework?.loaded) {
    console.log('🎮 GameFramework already loaded');
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('gameframework:ready', {
            detail: { 
                framework: window.GameFramework,
                loadTime: window.GameFramework.loadTime || Date.now()
            }
        }));
    }, 10);
} else if (window.GameFramework?.loading) {
    console.log('🎮 GameFramework already loading, waiting...');
} else {
    console.log('🎮 Starting GameFramework loading...');
    
    if (!window.GameFramework) window.GameFramework = {};
    window.GameFramework.loading = true;
    window.GameFramework.loadStartTime = Date.now();
    
    // Set loading timeout
    const loadingTimeout = setTimeout(() => {
        if (window.GameFramework?.loading) {
            console.error('💥 GameFramework loading timeout after 15 seconds');
            window.GameFramework.loading = false;
            window.GameFramework.error = new Error('Loading timeout');
            
            window.dispatchEvent(new CustomEvent('gameframework:error', {
                detail: { error: new Error('Loading timeout - framework took too long to load') }
            }));
        }
    }, 15000);

    // Enhanced script loader
    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript?.dataset?.loaded === 'true') {
                console.log(`  ♻️  Already loaded: ${src.split('/').pop()}`);
                resolve();
                return;
            }
            
            if (existingScript && !existingScript.dataset.loaded) {
                console.log(`  ⏳ Waiting for: ${src.split('/').pop()}`);
                const onLoad = () => {
                    existingScript.removeEventListener('load', onLoad);
                    existingScript.removeEventListener('error', onError);
                    resolve();
                };
                const onError = (error) => {
                    existingScript.removeEventListener('load', onLoad);
                    existingScript.removeEventListener('error', onError);
                    reject(error);
                };
                existingScript.addEventListener('load', onLoad);
                existingScript.addEventListener('error', onError);
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            
            script.onload = () => {
                script.dataset.loaded = 'true';
                console.log(`  ✅ Loaded: ${src.split('/').pop()}`);
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`  ❌ Failed to load: ${src}`);
                reject(new Error(`Failed to load script: ${src}`));
            };
            
            document.head.appendChild(script);
        });
    };

    // Load framework modules
    const loadFramework = async () => {
        try {
            console.log('📦 Starting framework module loading...');
            
            const basePath = '/GameFramework/';
            
            // Load modules in order - core first, then dependencies
            const modules = [
                'game-framework.js',        // Core classes (System, Component, etc.)
                'framework-components.js',  // Components that use Component base class
                'framework-systems.js',     // Systems that use System base class
                'framework-audio.js',       // Enhanced audio system (NEW)
                'framework-physics.js',     // Physics system that extends System
                'framework-ui.js',          // UI system
                'framework-effects.js',     // Effects
                'framework-behaviors.js',   // Behaviors
                'framework-prefabs.js',     // Prefabs
                'framework-utils.js',       // Utilities
                'framework-config.js'       // Configuration
            ];
            
            for (const moduleFile of modules) {
                console.log(`  📥 Loading ${moduleFile}...`);
                
                try {
                    await loadScript(basePath + moduleFile);
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                    console.error(`💥 Failed to load ${moduleFile}:`, error);
                    throw error;
                }
            }
            
            // Verify core classes are available
            const requiredClasses = ['Vector2', 'GameFramework', 'BaseEntity', 'Component', 'System'];
            const missing = requiredClasses.filter(cls => !window[cls]);
            
            if (missing.length > 0) {
                throw new Error(`Missing required classes: ${missing.join(', ')}`);
            }
            
            // Verify GameFramework is a constructor
            if (typeof window.GameFramework !== 'function') {
                throw new Error(`GameFramework is not a constructor (type: ${typeof window.GameFramework})`);
            }
            
            console.log('✅ All required classes verified:', requiredClasses.map(cls => `${cls}: ${typeof window[cls]}`));
            
            // Initialize framework
            console.log('🔧 Initializing framework...');
            await initializeFramework();
            
            clearTimeout(loadingTimeout);
            
            window.GameFramework.loaded = true;
            window.GameFramework.loading = false;
            window.GameFramework.loadTime = Date.now() - window.GameFramework.loadStartTime;
            
            console.log(`🎉 GameFramework loaded successfully in ${window.GameFramework.loadTime}ms!`);
            console.log('🎵 Enhanced audio system ready');
            
            window.dispatchEvent(new CustomEvent('gameframework:ready', {
                detail: { 
                    framework: window.GameFramework,
                    loadTime: window.GameFramework.loadTime
                }
            }));
            
            return window.GameFramework;
            
        } catch (error) {
            console.error('💥 Failed to load GameFramework:', error);
            
            clearTimeout(loadingTimeout);
            
            window.GameFramework.loading = false;
            window.GameFramework.error = error;
            
            window.dispatchEvent(new CustomEvent('gameframework:error', {
                detail: { error }
            }));
            
            throw error;
        }
    };

    // Initialize framework after all modules are loaded
    const initializeFramework = async () => {
        // Verify that GameFramework class is available
        if (!window.GameFramework || typeof window.GameFramework !== 'function') {
            throw new Error('GameFramework class not loaded properly');
        }
        
        if (!window.BaseEntity || !window.Vector2) {
            throw new Error('Core framework classes not loaded properly');
        }
        
        console.log('🔧 Initializing framework components...');
        
        // Quick game creation helper - extend the existing GameFramework class
        class Game extends window.GameFramework {
            constructor(config = {}) {
                const defaults = {
                    game: {
                        width: config.width || 800,
                        height: config.height || 600,
                        backgroundColor: config.backgroundColor || '#1a1a2e',
                        pixelPerfect: config.pixelPerfect !== false,
                        debug: config.debug || false
                    },
                    physics: {
                        gravity: config.gravity !== undefined ? config.gravity : 0.5,
                        friction: config.friction || 0.1
                    },
                    rendering: {
                        pixelated: config.pixelated !== false,
                        antialias: !config.pixelated
                    },
                    audio: {
                        masterVolume: config.masterVolume || 1,
                        categoryVolumes: config.categoryVolumes || {
                            music: 0.7,
                            sfx: 0.8,
                            voice: 0.9
                        }
                    },
                    input: {
                        keyboard: config.controls || {
                            left: ['ArrowLeft', 'KeyA'],
                            right: ['ArrowRight', 'KeyD'],
                            up: ['ArrowUp', 'KeyW'],
                            down: ['ArrowDown', 'KeyS'],
                            jump: ['Space'],
                            action: ['KeyE', 'Enter'],
                            pause: ['Escape'],
                            inventory: ['KeyI'],
                            p1up: ['KeyW'],
                            p1down: ['KeyS'],
                            p2up: ['ArrowUp'],
                            p2down: ['ArrowDown']
                        }
                    }
                };
                
                super(defaults);
                this.ready = this.initialize(config.canvasId || 'gameCanvas');
                this.currentMusic = null; // Track current music for crossfading
            }
            
            // Enhanced audio methods
            async loadAudioAssets(assetList) {
                console.log('🔊 Loading audio assets...');
                const results = await Promise.allSettled(
                    assetList.map(asset => this.loadAudio(asset.id, asset.filename, asset.config))
                );
                
                const loaded = results.filter(r => r.status === 'fulfilled').length;
                console.log(`🎵 Loaded ${loaded}/${assetList.length} audio assets`);
                
                return results;
            }
            
            async preloadGameAudio() {
                // Common game audio assets
                const audioAssets = [
                    { id: 'click', filename: 'click', config: { preset: 'ui' } },
                    { id: 'hover', filename: 'hover', config: { preset: 'ui' } },
                    { id: 'success', filename: 'success', config: { preset: 'sfx' } },
                    { id: 'error', filename: 'error', config: { preset: 'sfx' } }
                ];
                
                try {
                    await this.loadAudioAssets(audioAssets);
                } catch (error) {
                    console.warn('Some audio assets failed to load:', error);
                }
            }
        }
        
        // Add extensions to the existing GameFramework object
        const frameworkExtensions = {
            Game,
            
            quickStart: async (config = {}) => {
                const game = new Game(config);
                await game.ready;
                
                // Auto-preload common audio if requested
                if (config.preloadAudio !== false) {
                    try {
                        await game.preloadGameAudio();
                    } catch (error) {
                        console.warn('Failed to preload audio:', error);
                    }
                }
                
                return game;
            },
            
            version: '1.0.4',
            
            ready: () => {
                return new Promise((resolve) => {
                    if (window.GameFramework && window.GameFramework.loaded) {
                        resolve(window.GameFramework);
                    } else {
                        window.addEventListener('gameframework:ready', (e) => {
                            resolve(e.detail.framework);
                        });
                    }
                });
            },
            
            // Audio utility methods
            createAudioPreset: (name, config) => {
                console.log(`🎵 Creating global audio preset: ${name}`);
                // This will be available to all game instances
                if (!window.GameFramework.globalAudioPresets) {
                    window.GameFramework.globalAudioPresets = new Map();
                }
                window.GameFramework.globalAudioPresets.set(name, config);
            },
            
            getAudioPresets: () => {
                return window.GameFramework.globalAudioPresets ? 
                    Array.from(window.GameFramework.globalAudioPresets.keys()) : [];
            }
        };
        
        // Safely extend GameFramework without overwriting the constructor
        Object.keys(frameworkExtensions).forEach(key => {
            if (!window.GameFramework.hasOwnProperty(key)) {
                window.GameFramework[key] = frameworkExtensions[key];
            }
        });
        
        console.log('✨ Framework initialization complete');
        console.log('🎵 Audio presets available:', ['music', 'ambient', 'sfx', 'ui', 'voice']);
    };

    // Auto-load framework
    const autoLoad = async () => {
        try {
            await loadFramework();
        } catch (error) {
            console.error('💥 Failed to auto-load GameFramework:', error);
            
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed; top: 20px; right: 20px; 
                background: #ff4444; color: white; padding: 15px; 
                border-radius: 5px; font-family: monospace;
                max-width: 300px; z-index: 10000;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            `;
            errorDiv.innerHTML = `
                <div style="font-weight: bold;">⚠️ GameFramework Error</div>
                <div style="margin: 5px 0; font-size: 12px;">${error.message}</div>
                <div style="font-size: 10px; opacity: 0.8;">Check console for details</div>
            `;
            
            if (document.body) {
                document.body.appendChild(errorDiv);
                setTimeout(() => errorDiv.remove(), 15000);
            }
        }
    };

    // Load with proper timing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoLoad);
    } else {
        setTimeout(autoLoad, 10);
    }
}

// Make loadFramework available globally for debugging
if (typeof window !== 'undefined') {
    window.loadGameFramework = () => {
        if (window.GameFramework?.loaded) {
            console.log('Framework already loaded');
            return Promise.resolve(window.GameFramework);
        }
        
        if (window.GameFramework) {
            window.GameFramework.loading = false;
            window.GameFramework.error = null;
        }
        
        const script = document.createElement('script');
        script.src = '/GameFramework/index.js';
        document.head.appendChild(script);
    };
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        version: '1.0.4'
    };
}