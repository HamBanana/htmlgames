// GameFramework/game-framework.js - Core game framework implementation

/**
 * Vector2 Class - Must be defined first as it's used by many other classes
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

// Make Vector2 globally available immediately
window.Vector2 = Vector2;

/**
 * Event Emitter - Core communication system
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
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event handler for '${event}':`, error);
                }
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

window.EventEmitter = EventEmitter;

/**
 * Performance Monitor
 */
class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.fps = 0;
        this.lastTime = 0;
        this.frameTime = 0;
        this.measurements = new Map();
    }
    
    startFrame() {
        this.frameStart = performance.now();
    }
    
    endFrame() {
        this.frameTime = performance.now() - this.frameStart;
        this.frameCount++;
        
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
            this.frameCount = 0;
            this.lastTime = now;
        }
    }
    
    measure(name, fn) {
        const start = performance.now();
        const result = fn();
        const time = performance.now() - start;
        this.measurements.set(name, time);
        return result;
    }
    
    getStats() {
        return {
            fps: this.fps,
            frameTime: this.frameTime,
            breakdown: Object.fromEntries(this.measurements)
        };
    }
}

window.PerformanceMonitor = PerformanceMonitor;

/**
 * Base Component Class - Foundation for all components
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

window.Component = Component;

/**
 * Base System Class - Foundation for all systems
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

window.System = System;

/**
 * Base Entity Class - Foundation for all game objects
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

window.BaseEntity = BaseEntity;

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

window.Scene = Scene;

/**
 * Asset Loader - Handles loading of game assets
 */
class AssetLoader {
    constructor(framework) {
        this.framework = framework;
        this.config = window.FRAMEWORK_CONFIG || {};
        this.loadedAssets = new Map();
        this.loadingPromises = new Map();
    }
    
    async initialize() {
        console.log('🔧 Framework Asset Loader initialized');
    }
    
    async loadSprite(assetId, filename) {
        // Construct the full path using the configured sprites path
        // Note: filename should be just the filename, not a full path
        const basePath = this.config.paths?.sprites || '/GameAssets/Sprites/Aseprite/';
        const path = basePath + filename;
        
        if (this.loadedAssets.has(assetId)) {
            return this.loadedAssets.get(assetId);
        }
        
        if (this.loadingPromises.has(assetId)) {
            return this.loadingPromises.get(assetId);
        }
        
        console.log(`📦 Loading sprite: ${assetId} from ${filename}`);
        
        const loadPromise = this.doLoadSprite(assetId, path);
        this.loadingPromises.set(assetId, loadPromise);
        
        try {
            const startTime = performance.now();
            const spriteData = await loadPromise;
            const loadTime = performance.now() - startTime;
            
            this.loadedAssets.set(assetId, spriteData);
            console.log(`  ✅ Loaded in ${loadTime.toFixed(2)}ms`);
            
            this.framework.events.emit('asset:loaded', {
                type: 'sprite',
                id: assetId,
                filename: filename,
                loadTime: loadTime
            });
            
            return spriteData;
        } catch (error) {
            console.error(`❌ Failed to load sprite ${assetId}:`, error);
            this.loadingPromises.delete(assetId);
            throw error;
        }
    }
    
    async doLoadSprite(assetId, path) {
        const renderer = this.framework.getSystem('renderer');
        if (!renderer) {
            throw new Error('Renderer system not available');
        }
        
        // Pass the full path to loadAseprite since we've already constructed it
        const spriteData = await renderer.loadAseprite(assetId, path);
        
        if (spriteData.animations && spriteData.animations.size > 0) {
            const animNames = Array.from(spriteData.animations.keys());
            console.log(`  📋 Animations: ${animNames.join(', ')}`);
        }
        
        return spriteData;
    }
    
    async loadAudio(assetId, filename, type = 'sfx') {
        const basePath = type === 'music' 
            ? (this.config.paths?.audio?.music || '/GameAssets/Audio/Music/')
            : (this.config.paths?.audio?.sfx || '/GameAssets/Audio/SFX/');
        const path = basePath + filename;
        
        if (this.loadedAssets.has(assetId)) {
            return this.loadedAssets.get(assetId);
        }
        
        console.log(`🔊 Loading audio: ${assetId} from ${filename}`);
        
        try {
            const audio = this.framework.getSystem('audio');
            if (!audio) {
                throw new Error('Audio system not available');
            }
            
            const audioAsset = await audio.loadSound(assetId, path);
            this.loadedAssets.set(assetId, audioAsset);
            
            this.framework.events.emit('asset:loaded', {
                type: 'audio',
                id: assetId,
                filename: filename,
                audioType: type
            });
            
            return audioAsset;
        } catch (error) {
            console.error(`❌ Failed to load audio ${assetId}:`, error);
            throw error;
        }
    }
    
    getAsset(assetId) {
        return this.loadedAssets.get(assetId);
    }
    
    hasAsset(assetId) {
        return this.loadedAssets.has(assetId);
    }
}

window.AssetLoader = AssetLoader;

/**
 * Basic Time System
 */
class TimeSystem extends System {
    constructor() {
        super();
        this.timeScale = 1;
        this.totalTime = 0;
        this.deltaTime = 0;
    }
    
    update(deltaTime) {
        this.deltaTime = deltaTime * this.timeScale;
        this.totalTime += this.deltaTime;
    }
    
    getTotalTime() {
        return this.totalTime;
    }
    
    getDeltaTime() {
        return this.deltaTime;
    }
    
    setTimeScale(scale) {
        this.timeScale = scale;
    }
}

window.TimeSystem = TimeSystem;

/**
 * Main Game Framework Class
 * Manages all game systems and provides the main game loop
 */
class GameFramework {
    constructor(config = {}) {
        this.config = this.mergeWithDefaults(config);
        this.assetLoader = new AssetLoader(this);
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
        
        // Initialize core systems (but not render system yet)
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
        // Only initialize basic time system here
        // Other systems will be initialized later when canvas is available
        this.registerSystem('time', new TimeSystem());
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
        
        // Now we can initialize systems that need canvas/context
        await this.initializeCanvasSystems();
        
        // Initialize asset loader
        await this.assetLoader.initialize();
        
        // Emit initialization event
        this.events.emit('game:initialized');
        
        return this;
    }
    
    async initializeCanvasSystems() {
        // These will be properly defined when framework-systems.js loads
        if (window.RenderSystem) {
            this.registerSystem('renderer', new window.RenderSystem(this.canvas, this.context, this.config));
        }
        
        if (window.InputSystem) {
            this.registerSystem('input', new window.InputSystem(this.config.input));
        }
        
        if (window.PhysicsSystem) {
            this.registerSystem('physics', new window.PhysicsSystem(this.config.physics));
        }
        
        if (window.AudioSystem) {
            this.registerSystem('audio', new window.AudioSystem(this.config.audio));
        }
        
        if (window.ParticleSystem) {
            this.registerSystem('particles', new window.ParticleSystem(this.config.particles));
        }
        
        if (window.CameraSystem) {
            this.registerSystem('camera', new window.CameraSystem(this.config.game));
        }
        
        if (window.CollisionSystem) {
            this.registerSystem('collision', new window.CollisionSystem());
        }
        
        if (window.GameFramework && window.GameFramework.UI && window.GameFramework.UI.System) {
            this.registerSystem('ui', new window.GameFramework.UI.System());
        }
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
     * Load sprite asset
     * @param {string} assetId - Unique identifier for the sprite
     * @param {string} filename - Just the filename (e.g., 'player.json'), not a full path
     */
    async loadSprite(assetId, filename) {
        return this.assetLoader.loadSprite(assetId, filename);
    }
    
    /**
     * Load audio asset
     */
    async loadAudio(assetId, filename, type = 'sfx') {
        return this.assetLoader.loadAudio(assetId, filename, type);
    }
    
    /**
     * Get loaded asset
     */
    getAsset(assetId) {
        return this.assetLoader.getAsset(assetId);
    }
    
    /**
     * Check if asset is loaded
     */
    hasAsset(assetId) {
        return this.assetLoader.hasAsset(assetId);
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
        // Render UI system if available
        const ui = this.getSystem('ui');
        if (ui && ui.render) {
            ui.render(this.context);
        }
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
    
    // Helper methods for Pong game
    createParticleEffect(effectName, x, y, options = {}) {
        const particles = this.getSystem('particles');
        if (particles && particles.createEffect) {
            particles.createEffect(effectName, x, y, options);
        }
    }
    
    playSound(soundName, options = {}) {
        // For now, just log since we don't have actual audio files
        console.log(`🔊 Playing sound: ${soundName}`);
    }
    
    shake(intensity = 10, duration = 0.5) {
        const camera = this.getSystem('camera');
        if (camera && camera.shake) {
            camera.shake(intensity, duration);
        }
    }
}

window.GameFramework = GameFramework;

// Ensure all essential classes are globally available immediately
if (typeof window !== 'undefined') {
    window.Vector2 = Vector2;
    window.EventEmitter = EventEmitter;
    window.PerformanceMonitor = PerformanceMonitor;
    window.Component = Component;
    window.System = System;
    window.BaseEntity = BaseEntity;
    window.Scene = Scene;
    window.AssetLoader = AssetLoader;
    window.TimeSystem = TimeSystem;
    window.GameFramework = GameFramework;
    
    // Verify the class is a constructor
    console.log('🔧 GameFramework class loaded:', typeof GameFramework);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GameFramework: window.GameFramework,
        BaseEntity: window.BaseEntity,
        Component: window.Component,
        Scene: window.Scene,
        System: window.System,
        EventEmitter: window.EventEmitter,
        Vector2: window.Vector2,
        PerformanceMonitor: window.PerformanceMonitor,
        AssetLoader: window.AssetLoader
    };
}