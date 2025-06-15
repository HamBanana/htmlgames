// GameFramework/index.js - Main entry point for the framework

/**
 * GameFramework - A powerful HTML5 game development framework
 * @version 1.0.0
 */

// Check if framework is already loaded
if (window.GameFramework) {
    console.log('🎮 GameFramework already loaded');
} else {
    console.log('🎮 Loading GameFramework...');
    
    // Initialize framework namespace
    window.GameFramework = {
        loaded: false,
        loading: false
    };
}

// Script loader utility - improved to handle duplicates
const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        // Check if script already exists and is loaded
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            // If script exists and is already loaded, resolve immediately
            if (existingScript.dataset.loaded === 'true') {
                console.log(`  ♻️  Already loaded: ${src.split('/').pop()}`);
                resolve();
                return;
            }
            // If script exists but is still loading, wait for it
            existingScript.addEventListener('load', resolve);
            existingScript.addEventListener('error', reject);
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            script.dataset.loaded = 'true';
            console.log(`  ✅ Loaded: ${src.split('/').pop()}`);
            resolve();
        };
        script.onerror = (error) => {
            console.error(`  ❌ Failed to load: ${src}`);
            reject(error);
        };
        document.head.appendChild(script);
    });
};

// Load framework modules in correct dependency order
const loadFramework = async () => {
    if (window.GameFramework && window.GameFramework.loaded) {
        console.log('🎮 GameFramework already loaded');
        return window.GameFramework;
    }
    
    if (window.GameFramework && window.GameFramework.loading) {
        console.log('🎮 GameFramework already loading...');
        return new Promise((resolve) => {
            window.addEventListener('gameframework:ready', () => {
                resolve(window.GameFramework);
            });
        });
    }
    
    // Initialize loading state
    if (!window.GameFramework) window.GameFramework = {};
    window.GameFramework.loading = true;
    
    try {
        console.log('📦 Loading framework modules...');
        
        const basePath = '/GameFramework/';
        
        // Load modules in dependency order
        const modules = [
            // 1. Configuration and utilities first
            'framework-config.js',
            
            // 2. Core framework classes (Vector2, EventEmitter, etc.)
            'game-framework.js',
            
            // 3. Systems that don't depend on components (cleaned versions)
            'framework-systems.js',
            
            // 4. Components that depend on base classes (cleaned version)
            'framework-components.js',
            
            // 5. Utilities that might use components
            'framework-utils.js',
            
            // 6. Advanced systems and features (cleaned versions)
            'framework-prefabs.js',
            'framework-behaviors.js',
            'framework-ui.js',
            'framework-effects.js'
        ];
        
        // Check for script conflicts before loading
        modules.forEach(module => {
            const existingScript = document.querySelector(`script[src="${basePath}${module}"]`);
            if (existingScript) {
                console.log(`  ♻️  Script already loaded: ${module}`);
            }
        });
        
        // Load each module sequentially
        for (const module of modules) {
            await loadScript(basePath + module);
        }
        
        // Initialize framework after all modules are loaded
        initializeFramework();
        
        window.GameFramework.loaded = true;
        window.GameFramework.loading = false;
        
        console.log('🎉 GameFramework loaded successfully!');
        
        // Emit ready event
        window.dispatchEvent(new CustomEvent('gameframework:ready'));
        
        return window.GameFramework;
        
    } catch (error) {
        console.error('💥 Failed to load GameFramework:', error);
        window.GameFramework.loading = false;
        throw error;
    }
};

// Initialize framework after all modules are loaded
const initializeFramework = () => {
    // Ensure all core classes are available
    if (typeof GameFramework === 'undefined' || typeof BaseEntity === 'undefined') {
        console.error('Core framework classes not loaded properly');
        return;
    }
    
    console.log('🔧 Initializing framework...');
    
    // Quick game creation helper
    class Game extends GameFramework {
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
                        pause: ['Escape']
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
            const EntityClass = window.GameFramework.Prefabs?.[type] || BaseEntity;
            const entity = new EntityClass(config);
            return this.addEntity(entity);
        }
        
        // Quick sprite entity
        createSprite(spriteName, x, y, config = {}) {
            const entity = new BaseEntity({
                x, y,
                width: config.width || 32,
                height: config.height || 32,
                ...config
            });
            
            if (window.SpriteComponent) {
                entity.addComponent(new SpriteComponent(spriteName, config));
            }
            
            if (config.animated !== false && window.AnimationComponent) {
                entity.addComponent(new AnimationComponent({
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
                entity.addComponent(new PhysicsComponent({
                    mass: config.mass || 1,
                    ...config.physics
                }));
            }
            
            if (window.CollisionComponent) {
                entity.addComponent(new CollisionComponent({
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
                player.addComponent(new InputComponent());
            }
            
            if (config.health !== false && window.HealthComponent) {
                player.addComponent(new HealthComponent({
                    maxHealth: config.maxHealth || 100,
                    ...config.health
                }));
            }
            
            // Add default player behavior if available
            if (window.GameFramework.Behaviors?.PlatformerController) {
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
                enemy.addComponent(new HealthComponent({
                    maxHealth: config.maxHealth || 50,
                    ...config.health
                }));
            }
            
            if (window.AIComponent) {
                enemy.addComponent(new AIComponent({
                    behavior: config.behavior || 'patrol',
                    ...config.ai
                }));
            }
            
            return enemy;
        }
        
        // Quick particle effect
        createParticleEffect(effectName, x, y) {
            const particles = this.getSystem('particles');
            if (particles && particles.createEffect) {
                particles.createEffect(effectName, x, y);
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
    }
    
    // Extend the global GameFramework object safely
    const frameworkExtensions = {
        // Core classes
        Game,
        
        // Quick start function
        quickStart: async (config = {}) => {
            const game = new Game(config);
            await game.ready;
            return game;
        },
        
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
        }
        #gameCanvas {
            border: 2px solid #333;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
        }
    </style>
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    <script src="/GameFramework/index.js"></script>
    <script>
        // Wait for framework to load
        window.addEventListener('gameframework:ready', async () => {
            // Create game
            const game = await GameFramework.quickStart({
                width: ${config.width || 800},
                height: ${config.height || 600},
                backgroundColor: '${config.backgroundColor || '#1a1a2e'}'
            });
            
            // Create main scene
            const mainScene = new Scene('main');
            
            mainScene.onLoad = async function() {
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
                // const player = game.createPlayer('player', 100, 400);
                // game.getSystem('camera').follow(player);
                
                // Your game logic here
            };
            
            // Register and load scene
            game.registerScene('main', mainScene);
            await game.loadScene('main');
            
            // Start game
            game.start();
        });
    </script>
</body>
</html>`;
        },
        
        // Wait for framework to be ready
        ready: () => {
            return new Promise((resolve) => {
                if (window.GameFramework.loaded) {
                    resolve(window.GameFramework);
                } else {
                    window.addEventListener('gameframework:ready', () => {
                        resolve(window.GameFramework);
                    });
                }
            });
        }
    };
    
    // Safely extend GameFramework without overwriting existing properties
    Object.keys(frameworkExtensions).forEach(key => {
        if (!window.GameFramework[key]) {
            window.GameFramework[key] = frameworkExtensions[key];
        }
    });
    
    console.log('✨ Framework initialization complete');
};

// Auto-load framework
const autoLoad = async () => {
    try {
        await loadFramework();
    } catch (error) {
        console.error('Failed to auto-load GameFramework:', error);
    }
};

// Load immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoLoad);
} else {
    autoLoad();
}

// Also need to update the game-framework.js to fix class definition issues
// The issue is that some classes are being referenced before they're defined

// Make loadFramework available globally
window.loadFramework = loadFramework;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadFramework };
}