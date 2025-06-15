// game-framework.js - Core game framework implementation

/**
 * Main Game Framework Class
 * Manages all game systems and provides the main game loop
 */
class GameFramework {
    constructor(config = {}) {
        this.config = this.mergeWithDefaults(config);
        this.canvas = null;
        this.context = null;
        this.running = false;
        this.paused = false;
        
        // Core systems
        this.systems = new Map();
        this.entities = new Map();
        this.scenes = new Map();
        this.currentScene = null;
        
        // Event system
        this.events = new EventEmitter();
        
        // Performance monitoring
        this.performanceMonitor = new PerformanceMonitor();
        
        // Initialize core systems
        this.initializeSystems();
    }
    
    mergeWithDefaults(config) {
        const defaults = {
            game: {
                width: 800,
                height: 600,
                fps: 60,
                backgroundColor: '#000000',
                debug: false
            },
            physics: {
                gravity: 0.5,
                friction: 0.1
            },
            rendering: {
                pixelated: true,
                antialias: false
            }
        };
        
        return this.deepMerge(defaults, config);
    }
    
    deepMerge(target, source) {
        const output = Object.assign({}, target);
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target))
                        Object.assign(output, { [key]: source[key] });
                    else
                        output[key] = this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }
    
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
    
    initializeSystems() {
        // Time system
        this.registerSystem('time', new TimeSystem());
        
        // Input system
        this.registerSystem('input', new InputSystem(this.config.input));
        
        // Physics system
        this.registerSystem('physics', new PhysicsSystem(this.config.physics));
        
        // Audio system
        this.registerSystem('audio', new AudioSystem(this.config.audio));
        
        // Particle system
        this.registerSystem('particles', new ParticleSystem(this.config.particles));
        
        // Camera system
        this.registerSystem('camera', new CameraSystem(this.config.game));
        
        // Collision system
        this.registerSystem('collision', new CollisionSystem());
    }
    
    /**
     * Initialize the game canvas and rendering context
     */
    async initialize(canvasId = 'gameCanvas') {
        // Get or create canvas
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = canvasId;
            document.body.appendChild(this.canvas);
        }
        
        // Set canvas properties
        this.canvas.width = this.config.game.width;
        this.canvas.height = this.config.game.height;
        
        // Get rendering context
        this.context = this.canvas.getContext('2d');
        this.context.imageSmoothingEnabled = !this.config.rendering.pixelated;
        
        // Initialize renderer
        this.registerSystem('renderer', new RenderSystem(this.canvas, this.context, this.config));
        
        // Emit initialization event
        this.events.emit('game:initialized');
        
        return this;
    }
    
    /**
     * Register a new system
     */
    registerSystem(name, system) {
        system.game = this;
        this.systems.set(name, system);
        
        if (system.initialize) {
            system.initialize();
        }
        
        this.events.emit('system:registered', { name, system });
    }
    
    /**
     * Get a registered system
     */
    getSystem(name) {
        return this.systems.get(name);
    }
    
    /**
     * Add an entity to the game
     */
    addEntity(entity) {
        if (!entity.id) {
            entity.id = this.generateEntityId();
        }
        
        this.entities.set(entity.id, entity);
        entity.game = this;
        
        if (entity.initialize) {
            entity.initialize();
        }
        
        // Add to current scene if exists
        if (this.currentScene) {
            this.currentScene.addEntity(entity);
        }
        
        this.events.emit('entity:added', entity);
        
        return entity;
    }
    
    /**
     * Remove an entity from the game
     */
    removeEntity(entity) {
        const id = typeof entity === 'string' ? entity : entity.id;
        const removedEntity = this.entities.get(id);
        
        if (removedEntity) {
            if (removedEntity.destroy) {
                removedEntity.destroy();
            }
            
            this.entities.delete(id);
            
            // Remove from current scene
            if (this.currentScene) {
                this.currentScene.removeEntity(removedEntity);
            }
            
            this.events.emit('entity:removed', removedEntity);
        }
        
        return removedEntity;
    }
    
    /**
     * Get all entities
     */
    getAllEntities() {
        return Array.from(this.entities.values());
    }
    
    /**
     * Get entities by type
     */
    getEntitiesByType(type) {
        return this.getAllEntities().filter(e => e.type === type);
    }
    
    /**
     * Get entities with specific component
     */
    getEntitiesWithComponent(ComponentClass) {
        return this.getAllEntities().filter(e => e.hasComponent(ComponentClass));
    }
    
    /**
     * Generate unique entity ID
     */
    generateEntityId() {
        return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Register a scene
     */
    registerScene(name, scene) {
        scene.game = this;
        scene.name = name;
        this.scenes.set(name, scene);
    }
    
    /**
     * Load a scene
     */
    async loadScene(sceneName) {
        const scene = this.scenes.get(sceneName);
        if (!scene) {
            throw new Error(`Scene '${sceneName}' not found`);
        }
        
        // Unload current scene
        if (this.currentScene) {
            await this.unloadCurrentScene();
        }
        
        // Load new scene
        this.currentScene = scene;
        
        if (scene.onLoad) {
            await scene.onLoad();
        }
        
        this.events.emit('scene:loaded', scene);
        
        return scene;
    }
    
    /**
     * Unload current scene
     */
    async unloadCurrentScene() {
        if (!this.currentScene) return;
        
        if (this.currentScene.onUnload) {
            await this.currentScene.onUnload();
        }
        
        // Clear scene entities
        const sceneEntities = this.currentScene.entities || [];
        sceneEntities.forEach(entity => this.removeEntity(entity));
        
        this.events.emit('scene:unloaded', this.currentScene);
        
        this.currentScene = null;
    }
    
    /**
     * Main game loop
     */
    start() {
        if (this.running) return;
        
        this.running = true;
        this.lastTime = performance.now();
        
        // Start all systems
        this.systems.forEach(system => {
            if (system.start) system.start();
        });
        
        this.events.emit('game:start');
        
        this.gameLoop();
    }
    
    /**
     * Stop the game
     */
    stop() {
        this.running = false;
        
        // Stop all systems
        this.systems.forEach(system => {
            if (system.stop) system.stop();
        });
        
        this.events.emit('game:stop');
    }
    
    /**
     * Pause the game
     */
    pause() {
        this.paused = true;
        this.events.emit('game:pause');
    }
    
    /**
     * Resume the game
     */
    resume() {
        this.paused = false;
        this.events.emit('game:resume');
    }
    
    /**
     * Main game loop implementation
     */
    gameLoop(currentTime = performance.now()) {
        if (!this.running) return;
        
        requestAnimationFrame((time) => this.gameLoop(time));
        
        // Calculate delta time
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
        this.lastTime = currentTime;
        
        // Skip update if paused
        if (this.paused) return;
        
        // Performance monitoring
        this.performanceMonitor.startFrame();
        
        // Update phase
        this.performanceMonitor.measure('update', () => {
            this.update(deltaTime);
        });
        
        // Render phase
        this.performanceMonitor.measure('render', () => {
            this.render();
        });
        
        // End frame monitoring
        this.performanceMonitor.endFrame();
        
        // Debug info
        if (this.config.game.debug) {
            this.renderDebugInfo();
        }
    }
    
    /**
     * Update all game systems and entities
     */
    update(deltaTime) {
        // Update systems
        this.systems.forEach((system, name) => {
            if (system.update) {
                this.performanceMonitor.measure(`system:${name}`, () => {
                    system.update(deltaTime);
                });
            }
        });
        
        // Update current scene
        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update(deltaTime);
        }
        
        // Update entities
        this.entities.forEach(entity => {
            if (entity.active && entity.update) {
                entity.update(deltaTime);
            }
        });
        
        // Emit update event
        this.events.emit('game:update', deltaTime);
    }
    
    /**
     * Render the game
     */
    render() {
        const renderer = this.getSystem('renderer');
        if (!renderer) return;
        
        // Clear screen
        renderer.clear();
        
        // Apply camera transform
        const camera = this.getSystem('camera');
        if (camera) {
            this.context.save();
            camera.applyTransform(this.context);
        }
        
        // Render current scene
        if (this.currentScene && this.currentScene.render) {
            this.currentScene.render(this.context);
        }
        
        // Render entities (sorted by z-index)
        const sortedEntities = this.getAllEntities()
            .filter(e => e.active && e.visible)
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        
        sortedEntities.forEach(entity => {
            if (entity.render) {
                entity.render(this.context);
            }
        });
        
        // Render particles
        const particles = this.getSystem('particles');
        if (particles && particles.render) {
            particles.render(this.context);
        }
        
        // Restore camera transform
        if (camera) {
            this.context.restore();
        }
        
        // Render UI (not affected by camera)
        this.renderUI();
        
        // Emit render event
        this.events.emit('game:render');
    }
    
    /**
     * Render UI elements
     */
    renderUI() {
        // Render UI entities
        const uiEntities = this.getEntitiesByType('ui');
        uiEntities.forEach(entity => {
            if (entity.renderUI) {
                entity.renderUI(this.context);
            }
        });
    }
    
    /**
     * Render debug information
     */
    renderDebugInfo() {
        const stats = this.performanceMonitor.getStats();
        
        this.context.save();
        this.context.fillStyle = '#00ff00';
        this.context.font = '12px monospace';
        this.context.fillText(`FPS: ${stats.fps}`, 10, 20);
        this.context.fillText(`Entities: ${this.entities.size}`, 10, 35);
        
        // Show detailed breakdown if very debug
        if (this.config.game.debug === 'verbose') {
            let y = 50;
            Object.entries(stats.breakdown).forEach(([name, time]) => {
                this.context.fillText(`${name}: ${time.toFixed(2)}ms`, 10, y);
                y += 15;
            });
        }
        
        this.context.restore();
    }
    
    /**
     * Use a plugin
     */
    use(plugin) {
        if (plugin.install) {
            plugin.install(this);
        }
        return this;
    }
}

/**
 * Base Entity Class
 */
class BaseEntity {
    constructor(config = {}) {
        this.id = config.id || null;
        this.type = config.type || 'entity';
        this.name = config.name || '';
        
        // Transform
        this.position = new Vector2(config.x || 0, config.y || 0);
        this.size = new Vector2(config.width || 32, config.height || 32);
        this.rotation = config.rotation || 0;
        this.scale = new Vector2(config.scaleX || 1, config.scaleY || 1);
        
        // State
        this.active = config.active !== false;
        this.visible = config.visible !== false;
        this.zIndex = config.zIndex || 0;
        
        // Components
        this.components = new Map();
        
        // Reference to game
        this.game = null;
    }
    
    /**
     * Initialize entity (called when added to game)
     */
    initialize() {
        this.components.forEach(component => {
            if (component.initialize) {
                component.initialize();
            }
        });
    }
    
    /**
     * Add a component
     */
    addComponent(component) {
        const componentType = component.constructor;
        this.components.set(componentType, component);
        component.entity = this;
        
        if (this.game && component.initialize) {
            component.initialize();
        }
        
        return this;
    }
    
    /**
     * Remove a component
     */
    removeComponent(ComponentClass) {
        const component = this.components.get(ComponentClass);
        if (component) {
            if (component.destroy) {
                component.destroy();
            }
            this.components.delete(ComponentClass);
        }
        return this;
    }
    
    /**
     * Get a component
     */
    getComponent(ComponentClass) {
        return this.components.get(ComponentClass);
    }
    
    /**
     * Check if entity has a component
     */
    hasComponent(ComponentClass) {
        return this.components.has(ComponentClass);
    }
    
    /**
     * Update entity and all components
     */
    update(deltaTime) {
        this.components.forEach(component => {
            if (component.active && component.update) {
                component.update(deltaTime);
            }
        });
    }
    
    /**
     * Render entity and all components
     */
    render(context) {
        context.save();
        
        // Apply transform
        context.translate(this.position.x, this.position.y);
        context.rotate(this.rotation);
        context.scale(this.scale.x, this.scale.y);
        
        // Render components
        this.components.forEach(component => {
            if (component.visible && component.render) {
                component.render(context);
            }
        });
        
        context.restore();
    }
    
    /**
     * Destroy entity and all components
     */
    destroy() {
        this.components.forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        this.components.clear();
        
        if (this.game) {
            this.game.removeEntity(this);
        }
    }
    
    // Convenience getters/setters
    get x() { return this.position.x; }
    set x(value) { this.position.x = value; }
    
    get y() { return this.position.y; }
    set y(value) { this.position.y = value; }
    
    get width() { return this.size.x; }
    set width(value) { this.size.x = value; }
    
    get height() { return this.size.y; }
    set height(value) { this.size.y = value; }
}

/**
 * Base Component Class
 */
class Component {
    constructor(config = {}) {
        this.entity = null;
        this.active = config.active !== false;
        this.visible = config.visible !== false;
    }
    
    get game() {
        return this.entity ? this.entity.game : null;
    }
    
    initialize() {}
    update(deltaTime) {}
    render(context) {}
    destroy() {}
}

/**
 * Base Scene Class
 */
class Scene {
    constructor(name) {
        this.name = name;
        this.game = null;
        this.entities = [];
    }
    
    async onLoad() {}
    async onUnload() {}
    
    update(deltaTime) {}
    render(context) {}
    
    addEntity(entity) {
        if (!this.entities.includes(entity)) {
            this.entities.push(entity);
        }
    }
    
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
        }
    }
}

/**
 * Base System Class
 */
class System {
    constructor(config = {}) {
        this.config = config;
        this.game = null;
    }
    
    initialize() {}
    start() {}
    stop() {}
    update(deltaTime) {}
    render(context) {}
}

/**
 * Event Emitter
 */
class EventEmitter {
    constructor() {
        this.events = new Map();
    }
    
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
        return this;
    }
    
    off(event, callback) {
        if (this.events.has(event)) {
            const callbacks = this.events.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
        return this;
    }
    
    emit(event, ...args) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                callback(...args);
            });
        }
        return this;
    }
    
    once(event, callback) {
        const onceCallback = (...args) => {
            this.off(event, onceCallback);
            callback(...args);
        };
        this.on(event, onceCallback);
        return this;
    }
}

/**
 * Vector2 Class
 */
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    
    copy() {
        return new Vector2(this.x, this.y);
    }
    
    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }
    
    subtract(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }
    
    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
    
    divide(scalar) {
        return new Vector2(this.x / scalar, this.y / scalar);
    }
    
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return this.divide(mag);
    }
    
    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    
    angle() {
        return Math.atan2(this.y, this.x);
    }
    
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }
}

// Export the framework
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GameFramework,
        BaseEntity,
        Component,
        Scene,
        System,
        EventEmitter,
        Vector2
    };
}