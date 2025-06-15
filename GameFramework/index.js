// GameFramework/index.js - Main entry point for the framework

/**
 * GameFramework - A powerful HTML5 game development framework
 * @version 1.0.0
 */

// Load all framework modules in correct order
const loadFramework = async () => {
    const scripts = [
        'framework-config.js',
        'framework-utils.js',
        'framework-systems.js',
        'framework-components.js',
        'game-framework.js',
        'framework-prefabs.js',
        'framework-behaviors.js',
        'framework-ui.js',
        'framework-effects.js'
    ];
    
    const basePath = '/GameFramework/';
    
    for (const script of scripts) {
        await loadScript(basePath + script);
    }
};

const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

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
        const EntityClass = GameFramework.Prefabs[type] || BaseEntity;
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
        
        entity.addComponent(new SpriteComponent(spriteName, config));
        
        if (config.animated !== false) {
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
        
        entity.addComponent(new PhysicsComponent({
            mass: config.mass || 1,
            ...config.physics
        }));
        
        entity.addComponent(new CollisionComponent({
            width: config.width || 32,
            height: config.height || 32,
            ...config.collision
        }));
        
        return entity;
    }
    
    // Quick player creation
    createPlayer(spriteName, x, y, config = {}) {
        const player = this.createPhysicsSprite(spriteName, x, y, {
            type: 'player',
            ...config
        });
        
        player.addComponent(new InputComponent());
        
        if (config.health !== false) {
            player.addComponent(new HealthComponent({
                maxHealth: config.maxHealth || 100,
                ...config.health
            }));
        }
        
        // Add default player behavior
        player.addComponent(new PlatformerControllerComponent({
            moveSpeed: config.moveSpeed || 5,
            jumpPower: config.jumpPower || 10,
            ...config.controller
        }));
        
        return player;
    }
    
    // Quick enemy creation
    createEnemy(spriteName, x, y, config = {}) {
        const enemy = this.createPhysicsSprite(spriteName, x, y, {
            type: 'enemy',
            ...config
        });
        
        enemy.addComponent(new HealthComponent({
            maxHealth: config.maxHealth || 50,
            ...config.health
        }));
        
        enemy.addComponent(new AIComponent({
            behavior: config.behavior || 'patrol',
            ...config.ai
        }));
        
        return enemy;
    }
    
    // Quick particle effect
    createParticleEffect(effectName, x, y) {
        const particles = this.getSystem('particles');
        if (particles) {
            particles.createEffect(effectName, x, y);
        }
    }
    
    // Quick sound playback
    playSound(soundName, options = {}) {
        const audio = this.getSystem('audio');
        if (audio) {
            audio.playSound(soundName, options);
        }
    }
    
    // Quick music playback
    playMusic(musicName, loop = true) {
        const audio = this.getSystem('audio');
        if (audio) {
            audio.playMusic(musicName, loop);
        }
    }
}

// Global framework namespace
window.GameFramework = {
    // Core classes
    Game,
    BaseEntity,
    Component,
    Scene,
    System,
    
    // Math utilities
    Vector2,
    Random,
    MathUtils,
    ColorUtils,
    GridUtils,
    
    // Components
    Components: {
        Transform: TransformComponent,
        Physics: PhysicsComponent,
        Collision: CollisionComponent,
        Sprite: SpriteComponent,
        Animation: AnimationComponent,
        Health: HealthComponent,
        Input: InputComponent,
        Weapon: WeaponComponent,
        AI: AIComponent,
        StateMachine: StateMachineComponent
    },
    
    // Systems
    Systems: {
        Time: TimeSystem,
        Input: InputSystem,
        Physics: PhysicsSystem,
        Audio: AudioSystem,
        Render: RenderSystem,
        Camera: CameraSystem,
        Particle: ParticleSystem,
        Collision: CollisionSystem
    },
    
    // Utilities
    Utils: {
        Timer,
        TimerManager,
        Tween,
        TweenManager,
        StateMachine,
        State,
        ObjectPool,
        SpatialHash
    },
    
    // Prefabs (will be populated by framework-prefabs.js)
    Prefabs: {},
    
    // Behaviors (will be populated by framework-behaviors.js)
    Behaviors: {},
    
    // UI (will be populated by framework-ui.js)
    UI: {},
    
    // Effects (will be populated by framework-effects.js)
    Effects: {},
    
    // Quick start function
    quickStart: async (config = {}) => {
        const game = new Game(config);
        await game.ready;
        return game;
    },
    
    // Create a basic game template
    createGame: (config = {}) => {
        return `
<!DOCTYPE html>
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
        window.addEventListener('load', async () => {
            await loadFramework();
            
            // Create game
            const game = await GameFramework.quickStart({
                width: ${config.width || 800},
                height: ${config.height || 600},
                backgroundColor: '${config.backgroundColor || '#1a1a2e'}'
            });
            
            // Create main scene
            const mainScene = new GameFramework.Scene('main');
            
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
    }
};

// Auto-load framework if this script is included
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFramework);
} else {
    loadFramework();
}