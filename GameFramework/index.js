// GameFramework/index.js - Fixed main entry point for the framework

/**
 * GameFramework - A powerful HTML5 game development framework
 * @version 1.0.2 - Fixed loading issues
 */

// Prevent multiple loading attempts with better state management
if (window.GameFramework?.loaded) {
    console.log('🎮 GameFramework already loaded');
    // Emit ready event immediately if already loaded
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
    
    // Initialize loading state
    if (!window.GameFramework) window.GameFramework = {};
    window.GameFramework.loading = true;
    window.GameFramework.loadStartTime = Date.now();
    
    // Set a maximum loading timeout
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

    // Enhanced script loader with better error handling
    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
            // Check if script already exists and is loaded
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript?.dataset?.loaded === 'true') {
                console.log(`  ♻️  Already loaded: ${src.split('/').pop()}`);
                resolve();
                return;
            }
            
            // If script exists but is loading, wait for it
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
            
            // Create new script
            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Ensure sequential loading
            
            script.onload = () => {
                script.dataset.loaded = 'true';
                console.log(`  ✅ Loaded: ${src.split('/').pop()}`);
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`  ❌ Failed to load: ${src}`);
                reject(new Error(`Failed to load script: ${src}`));
            };
            
            // Add script to head
            document.head.appendChild(script);
        });
    };

    // Load framework modules with better error handling
    const loadFramework = async () => {
        try {
            console.log('📦 Starting framework module loading...');
            
            const basePath = '/GameFramework/';
            
            // Load modules in strict order - reduced delays for faster loading
            const modules = [
                'framework-config.js',
                'game-framework.js',
                'framework-systems.js', 
                'framework-components.js',
                'framework-utils.js',
                'framework-effects.js',
                'framework-prefabs.js',
                'framework-behaviors.js',
                'framework-ui.js'
            ];
            
            // Load modules sequentially
            for (const moduleFile of modules) {
                console.log(`  📥 Loading ${moduleFile}...`);
                
                try {
                    await loadScript(basePath + moduleFile);
                    
                    // Small delay to ensure initialization
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
            
            // Initialize framework
            console.log('🔧 Initializing framework...');
            await initializeFramework();
            
            // Clear timeout
            clearTimeout(loadingTimeout);
            
            // Mark as loaded
            window.GameFramework.loaded = true;
            window.GameFramework.loading = false;
            window.GameFramework.loadTime = Date.now() - window.GameFramework.loadStartTime;
            
            console.log(`🎉 GameFramework loaded successfully in ${window.GameFramework.loadTime}ms!`);
            logFrameworkInfo();
            
            // Emit ready event
            window.dispatchEvent(new CustomEvent('gameframework:ready', {
                detail: { 
                    framework: window.GameFramework,
                    loadTime: window.GameFramework.loadTime
                }
            }));
            
            return window.GameFramework;
            
        } catch (error) {
            console.error('💥 Failed to load GameFramework:', error);
            
            // Clear timeout
            clearTimeout(loadingTimeout);
            
            // Update state
            window.GameFramework.loading = false;
            window.GameFramework.error = error;
            
            // Emit error event
            window.dispatchEvent(new CustomEvent('gameframework:error', {
                detail: { error }
            }));
            
            throw error;
        }
    };

    // Initialize framework after all modules are loaded
    const initializeFramework = async () => {
        // Ensure all core classes are available
        if (!window.GameFramework || !window.BaseEntity || !window.Vector2) {
            throw new Error('Core framework classes not loaded properly');
        }
        
        console.log('🔧 Initializing framework components...');
        
        // Quick game creation helper
        if (!window.GameFramework.Game) {
            class Game extends window.GameFramework {
                constructor(config = {}) {
                    // Apply sensible defaults for quick prototyping
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
                                // Pong-specific controls
                                p1up: ['KeyW'],
                                p1down: ['KeyS'],
                                p2up: ['ArrowUp'],
                                p2down: ['ArrowDown']
                            }
                        }
                    };
                    
                    super(defaults);
                    
                    // Auto-initialize on creation
                    this.ready = this.initialize(config.canvasId || 'gameCanvas');
                }
                
                // Quick particle effect
                createParticleEffect(effectName, x, y, options = {}) {
                    const particles = this.getSystem('particles');
                    if (particles && particles.createEffect) {
                        particles.createEffect(effectName, x, y, options);
                    }
                }
                
                // Quick sound playback
                playSound(soundName, options = {}) {
                    const audio = this.getSystem('audio');
                    if (audio && audio.playSound) {
                        audio.playSound(soundName, options);
                    }
                }
                
                // Camera shake
                shake(intensity = 10, duration = 0.5) {
                    const camera = this.getSystem('camera');
                    if (camera && camera.shake) {
                        camera.shake(intensity, duration);
                    }
                }
            }
            
            // Safely extend the global GameFramework object
            const frameworkExtensions = {
                // Core classes
                Game,
                
                // Quick start function
                quickStart: async (config = {}) => {
                    const game = new Game(config);
                    await game.ready;
                    return game;
                },
                
                // Version info
                version: '1.0.2',
                
                // Wait for framework to be ready
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
                }
            };
            
            // Safely extend GameFramework without overwriting existing properties
            Object.keys(frameworkExtensions).forEach(key => {
                if (!window.GameFramework.hasOwnProperty(key)) {
                    window.GameFramework[key] = frameworkExtensions[key];
                }
            });
        }
        
        console.log('✨ Framework initialization complete');
    };

    // Log framework information
    function logFrameworkInfo() {
        const systems = getAvailableSystems();
        const components = getAvailableComponents();
        
        console.log(`  📊 Available Systems: ${Object.keys(systems).length} loaded`);
        console.log(`  🧩 Available Components: ${Object.keys(components).length} loaded`);
        
        if (window.GameFramework.Prefabs) {
            console.log(`  🎯 Available Prefabs: ${Object.keys(window.GameFramework.Prefabs).join(', ')}`);
        }
    }

    // Helper functions to check what's available
    function getAvailableSystems() {
        const systems = {};
        [
            'TimeSystem', 'InputSystem', 'PhysicsSystem', 'AudioSystem',
            'RenderSystem', 'CameraSystem', 'CollisionSystem', 'ParticleSystem'
        ].forEach(name => {
            if (window[name]) systems[name] = window[name];
        });
        return systems;
    }

    function getAvailableComponents() {
        const components = {};
        [
            'TransformComponent', 'PhysicsComponent', 'CollisionComponent',
            'SpriteComponent', 'AnimationComponent', 'HealthComponent',
            'InputComponent', 'WeaponComponent', 'AIComponent',
            'StateMachineComponent', 'ColliderComponent'
        ].forEach(name => {
            if (window[name]) components[name] = window[name];
        });
        return components;
    }

    // Auto-load framework
    const autoLoad = async () => {
        try {
            await loadFramework();
        } catch (error) {
            console.error('💥 Failed to auto-load GameFramework:', error);
            
            // Show error in page if possible
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
        // Small delay to ensure everything is ready
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
        
        // Reset loading state and try again
        if (window.GameFramework) {
            window.GameFramework.loading = false;
            window.GameFramework.error = null;
        }
        
        // Trigger reload
        const script = document.createElement('script');
        script.src = '/GameFramework/index.js';
        document.head.appendChild(script);
    };
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        version: '1.0.2'
    };
}