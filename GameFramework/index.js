// GameFramework/index.js - Main entry point for the framework (COMPLETELY FIXED)

/**
 * GameFramework - A powerful HTML5 game development framework
 * @version 1.0.1 - Fixed redeclaration issues
 */

// Prevent multiple loading attempts
if (window.GameFramework && window.GameFramework.loaded) {
    console.log('🎮 GameFramework already loaded');
} else if (window.GameFramework && window.GameFramework.loading) {
    console.log('🎮 GameFramework already loading...');
} else {
    console.log('🎮 Loading GameFramework...');
    
    // Initialize loading state
    if (!window.GameFramework) window.GameFramework = {};
    window.GameFramework.loading = true;
    window.GameFramework.loadAttempts = (window.GameFramework.loadAttempts || 0) + 1;
    
    // Prevent infinite loading attempts
    if (window.GameFramework.loadAttempts > 3) {
        console.error('💥 Too many loading attempts, aborting');
        throw new Error('GameFramework loading failed after multiple attempts');
    }
}

// Enhanced script loader with better duplicate prevention
const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        // Check if script already exists and is loaded
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript && existingScript.dataset.loaded === 'true') {
            console.log(`  ♻️  Already loaded: ${src.split('/').pop()}`);
            resolve();
            return;
        }
        
        // If script exists but is loading, wait for it
        if (existingScript) {
            console.log(`  ⏳ Waiting for: ${src.split('/').pop()}`);
            existingScript.addEventListener('load', resolve);
            existingScript.addEventListener('error', reject);
            return;
        }
        
        // Create new script
        const script = document.createElement('script');
        script.src = src;
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

// Clean class checker - prevents redeclaration errors
const checkForClassConflicts = () => {
    const coreClasses = [
        'Vector2', 'EventEmitter', 'Component', 'System', 'BaseEntity', 
        'Scene', 'GameFramework', 'AssetLoader', 'PerformanceMonitor'
    ];
    
    const conflicts = [];
    coreClasses.forEach(className => {
        if (window[className]) {
            conflicts.push(className);
        }
    });
    
    if (conflicts.length > 0) {
        console.log(`🔍 Pre-existing classes detected: ${conflicts.join(', ')}`);
        console.log('  These will be preserved to prevent redeclaration errors');
    }
    
    return conflicts;
};

// Load framework modules with conflict prevention
const loadFramework = async () => {
    // Skip if already loaded
    if (window.GameFramework && window.GameFramework.loaded) {
        console.log('🎮 GameFramework already fully loaded');
        return window.GameFramework;
    }
    
    // Wait if already loading
    if (window.GameFramework && window.GameFramework.loading && window.GameFramework.loadAttempts === 1) {
        console.log('🎮 GameFramework already loading, waiting...');
        return new Promise((resolve) => {
            window.addEventListener('gameframework:ready', () => {
                resolve(window.GameFramework);
            });
        });
    }
    
    try {
        console.log('📦 Starting framework module loading...');
        
        // Check for existing classes before loading
        checkForClassConflicts();
        
        const basePath = '/GameFramework/';
        
        // Load modules in strict order with delays to prevent race conditions
        const modules = [
            { file: 'framework-config.js', delay: 50 },
            { file: 'game-framework.js', delay: 100 },
            { file: 'framework-systems.js', delay: 100 },
            { file: 'framework-components.js', delay: 100 },
            { file: 'framework-utils.js', delay: 50 },
            { file: 'framework-effects.js', delay: 100 },
            { file: 'framework-prefabs.js', delay: 100 },
            { file: 'framework-behaviors.js', delay: 100 },
            { file: 'framework-ui.js', delay: 100 }
        ];
        
        // Load each module with proper delays
        for (const module of modules) {
            console.log(`  📥 Loading ${module.file}...`);
            
            try {
                await loadScript(basePath + module.file);
                
                // Wait between modules to ensure proper initialization
                if (module.delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, module.delay));
                }
                
            } catch (error) {
                console.error(`💥 Failed to load ${module.file}:`, error);
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
        
        // Mark as loaded
        window.GameFramework.loaded = true;
        window.GameFramework.loading = false;
        window.GameFramework.loadTime = Date.now();
        
        console.log('🎉 GameFramework loaded successfully!');
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
        window.GameFramework.loading = false;
        window.GameFramework.error = error;
        
        // Emit error event
        window.dispatchEvent(new CustomEvent('gameframework:error', {
            detail: { error }
        }));
        
        throw error;
    }
};

// Log framework information
function logFrameworkInfo() {
    const systems = getAvailableSystems();
    const components = getAvailableComponents();
    
    console.log(`  📊 Available Systems: ${Object.keys(systems).join(', ')}`);
    console.log(`  🧩 Available Components: ${Object.keys(components).join(', ')}`);
    
    if (window.GameFramework.Prefabs) {
        console.log(`  🎯 Available Prefabs: ${Object.keys(window.GameFramework.Prefabs).join(', ')}`);
    }
    
    if (window.GameFramework.Behaviors) {
        console.log(`  🎭 Available Behaviors: ${Object.keys(window.GameFramework.Behaviors).join(', ')}`);
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

// Initialize framework after all modules are loaded
const initializeFramework = async () => {
    // Ensure all core classes are available
    if (!window.GameFramework || !window.BaseEntity || !window.Vector2) {
        throw new Error('Core framework classes not loaded properly');
    }
    
    console.log('🔧 Initializing framework components...');
    
    // Quick game creation helper - only create if it doesn't exist
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
                            inventory: ['KeyI']
                        }
                    }
                };
                
                super(defaults);
                
                // Auto-initialize on creation
                this.ready = this.initialize(config.canvasId || 'gameCanvas');
            }
            
            // Simplified asset loading
            async loadAssets(assets) {
                const promises = [];
                
                if (assets.sprites) {
                    for (const [name, file] of Object.entries(assets.sprites)) {
                        promises.push(this.loadSprite(name, file));
                    }
                }
                
                if (assets.audio) {
                    for (const [name, file] of Object.entries(assets.audio)) {
                        const type = assets.audioTypes?.[name] || 'sfx';
                        promises.push(this.loadAudio(name, file, type));
                    }
                }
                
                await Promise.all(promises);
                return this;
            }
            
            // Quick entity creation
            createEntity(type, config = {}) {
                const EntityClass = window.GameFramework?.Prefabs?.[type] || window.BaseEntity;
                const entity = new EntityClass(config);
                return this.addEntity(entity);
            }
            
            // Quick sprite entity
            createSprite(spriteName, x, y, config = {}) {
                const entity = new window.BaseEntity({
                    x, y,
                    width: config.width || 32,
                    height: config.height || 32,
                    ...config
                });
                
                if (window.SpriteComponent) {
                    entity.addComponent(new window.SpriteComponent(spriteName, config));
                }
                
                if (config.animated !== false && window.AnimationComponent) {
                    entity.addComponent(new window.AnimationComponent({
                        autoLoadAnimations: true,
                        ...config.animation
                    }));
                }
                
                return this.addEntity(entity);
            }
            
            // Quick physics entity
            createPhysicsSprite(spriteName, x, y, config = {}) {
                const entity = this.createSprite(spriteName, x, y, config);
                
                if (window.PhysicsComponent) {
                    entity.addComponent(new window.PhysicsComponent({
                        mass: config.mass || 1,
                        ...config.physics
                    }));
                }
                
                if (window.CollisionComponent) {
                    entity.addComponent(new window.CollisionComponent({
                        width: config.width || 32,
                        height: config.height || 32,
                        ...config.collision
                    }));
                }
                
                return entity;
            }
            
            // Quick player creation
            createPlayer(spriteName, x, y, config = {}) {
                const player = this.createPhysicsSprite(spriteName, x, y, {
                    type: 'player',
                    ...config
                });
                
                if (window.InputComponent) {
                    player.addComponent(new window.InputComponent());
                }
                
                if (config.health !== false && window.HealthComponent) {
                    player.addComponent(new window.HealthComponent({
                        maxHealth: config.maxHealth || 100,
                        ...config.health
                    }));
                }
                
                // Add default player behavior if available
                if (window.GameFramework?.Behaviors?.PlatformerController) {
                    player.addComponent(new window.GameFramework.Behaviors.PlatformerController({
                        moveSpeed: config.moveSpeed || 5,
                        jumpPower: config.jumpPower || 10,
                        ...config.controller
                    }));
                }
                
                return player;
            }
            
            // Quick enemy creation
            createEnemy(spriteName, x, y, config = {}) {
                const enemy = this.createPhysicsSprite(spriteName, x, y, {
                    type: 'enemy',
                    ...config
                });
                
                if (window.HealthComponent) {
                    enemy.addComponent(new window.HealthComponent({
                        maxHealth: config.maxHealth || 50,
                        ...config.health
                    }));
                }
                
                if (window.AIComponent) {
                    enemy.addComponent(new window.AIComponent({
                        behavior: config.behavior || 'patrol',
                        ...config.ai
                    }));
                }
                
                return enemy;
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
            
            // Quick music playback
            playMusic(musicName, loop = true) {
                const audio = this.getSystem('audio');
                if (audio && audio.playMusic) {
                    audio.playMusic(musicName, loop);
                }
            }
            
            // Screen effects
            screenFlash(color = '#ffffff', duration = 0.2) {
                const particles = this.getSystem('particles');
                if (particles && particles.createEffect) {
                    // Create flash effect using particles
                    particles.createEffect('flash', 0, 0, {
                        count: 1,
                        lifetime: duration,
                        size: Math.max(this.canvas.width, this.canvas.height),
                        color: color,
                        opacity: 0.8,
                        opacityDecay: 0.95
                    });
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
            
            // Get component classes safely
            getComponent: (name) => window[name + 'Component'],
            getSystem: (name) => window[name + 'System'],
            
            // Create a basic game template
            createGameTemplate: (config = {}) => {
                return `<!DOCTYPE html>
<html>
<head>
    <title>${config.title || 'My Game'}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #0a0a0a;
            font-family: 'Courier New', monospace;
            color: #ffffff;
        }
        #gameCanvas {
            border: 2px solid #333;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
        }
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="loading" id="loading">
        <div>🎮 Loading GameFramework...</div>
        <div style="margin-top: 10px; font-size: 12px;">Initializing game systems...</div>
    </div>
    <canvas id="gameCanvas" style="display: none;"></canvas>
    
    <script src="/GameFramework/index.js"></script>
    <script>
        // Wait for framework to load
        window.addEventListener('gameframework:ready', async () => {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('gameCanvas').style.display = 'block';
            
            // Create game
            const game = await GameFramework.quickStart({
                width: ${config.width || 800},
                height: ${config.height || 600},
                backgroundColor: '${config.backgroundColor || '#1a1a2e'}',
                debug: ${config.debug || false}
            });
            
            // Create main scene
            const mainScene = new Scene('main');
            
            mainScene.onLoad = async function() {
                console.log('🎬 Loading main scene...');
                
                // Load assets
                await game.loadAssets({
                    sprites: {
                        // Add your sprites here
                        // player: 'player.json',
                        // enemy: 'enemy.json'
                    },
                    audio: {
                        // Add your audio here
                        // jump: 'jump.ogg',
                        // bgMusic: 'music.ogg'
                    }
                });
                
                // Create game entities
                // Example:
                // const player = game.createPlayer('player', 100, 400);
                // game.getSystem('camera').follow(player);
                
                console.log('✨ Game loaded successfully!');
                console.log('🎮 Available systems:', Object.keys(game.systems).join(', '));
            };
            
            // Register and load scene
            game.registerScene('main', mainScene);
            await game.loadScene('main');
            
            // Start game
            game.start();
            
            console.log('🚀 Game started!');
        });
        
        // Handle loading errors
        window.addEventListener('gameframework:error', (e) => {
            document.getElementById('loading').innerHTML = 
                '<div style="color: #ff4444;">❌ Failed to load game</div>' +
                '<div style="font-size: 12px; margin-top: 10px;">' + e.detail.error.message + '</div>';
        });
    </script>
</body>
</html>`;
            },
            
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
            },
            
            // Version info
            version: '1.0.1',
            
            // Available classes (for debugging)
            debug: {
                getLoadedClasses: () => ({
                    systems: getAvailableSystems(),
                    components: getAvailableComponents(),
                    prefabs: window.GameFramework?.Prefabs || {},
                    behaviors: window.GameFramework?.Behaviors || {},
                    ui: window.GameFramework?.UI || {}
                }),
                checkConflicts: checkForClassConflicts
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

// Auto-load framework with better error handling
const autoLoad = async () => {
    try {
        // Clear any existing loading state
        if (window.GameFramework && window.GameFramework.error) {
            delete window.GameFramework.error;
            window.GameFramework.loading = false;
        }
        
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
    // Ensure DOM is completely ready
    setTimeout(autoLoad, 50);
}

// Make loadFramework available globally for manual loading
window.loadFramework = loadFramework;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        loadFramework,
        version: '1.0.1'
    };
}