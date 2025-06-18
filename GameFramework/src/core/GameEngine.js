// GameFramework/src/core/GameEngine.js
import { EventEmitter } from './EventEmitter.js';
import { InputManager } from '../systems/InputManager.js';
import { Renderer } from '../systems/Renderer.js';
import { AssetManager } from '../systems/AssetManager.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';

/**
 * GameEngine - Main game engine class
 * @class GameEngine
 */
export class GameEngine extends EventEmitter {
    constructor(canvasId, config = {}) {
        super();
        
        // Get or create canvas
        this.canvas = this._setupCanvas(canvasId, config);
        this.context = this.canvas.getContext('2d');
        
        // Configuration
        this.config = {
            targetFPS: 60,
            fixedTimeStep: 1/60,
            maxDeltaTime: 0.1,
            debug: false,
            backgroundColor: '#000000',
            ...config
        };
        
        // Core systems
        this.systems = new Map();
        this.systemUpdateOrder = [];
        
        // Scene management
        this.scenes = new Map();
        this.activeScene = null;
        this.loadingScene = null;
        
        // Game state
        this.running = false;
        this.paused = false;
        this.time = {
            total: 0,
            delta: 0,
            fixed: 0,
            scale: 1
        };
        
        // Performance
        this.performance = {
            fps: 0,
            frameTime: 0,
            updateTime: 0,
            renderTime: 0,
            frameCount: 0,
            lastFPSUpdate: 0
        };
        
        // Initialize core systems
        this._initializeSystems();
        
        // Bind methods
        this._gameLoop = this._gameLoop.bind(this);
    }
    
    /**
     * Setup canvas element
     * @private
     */
    _setupCanvas(canvasId, config) {
        let canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = canvasId;
            document.body.appendChild(canvas);
        }
        
        canvas.width = config.width || 800;
        canvas.height = config.height || 600;
        
        // Pixel-perfect rendering
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = config.smoothing === true;
        ctx.imageSmoothingQuality = 'high';
        
        return canvas;
    }
    
    /**
     * Initialize core systems
     * @private
     */
    _initializeSystems() {
        // Register core systems
        this.registerSystem('input', new InputManager(this));
        this.registerSystem('renderer', new Renderer(this));
        this.registerSystem('assets', new AssetManager(this));
        this.registerSystem('audio', new AudioSystem(this));
        this.registerSystem('collision', new CollisionSystem(this));
        
        // Set default update order
        this.systemUpdateOrder = ['input', 'collision'];
    }
    
    /**
     * Register a system
     * @param {string} name - System name
     * @param {System} system - System instance
     */
    registerSystem(name, system) {
        if (this.systems.has(name)) {
            console.warn(`System ${name} already registered`);
            return;
        }
        
        this.systems.set(name, system);
        system.engine = this;
        
        if (system.initialize) {
            system.initialize();
        }
        
        this.emit('system:registered', { name, system });
    }
    
    /**
     * Get a system by name
     * @param {string} name - System name
     * @returns {System|null}
     */
    getSystem(name) {
        return this.systems.get(name) || null;
    }
    
    /**
     * Convenience getters for common systems
     */
    get input() { return this.getSystem('input'); }
    get renderer() { return this.getSystem('renderer'); }
    get assets() { return this.getSystem('assets'); }
    get audio() { return this.getSystem('audio'); }
    get collision() { return this.getSystem('collision'); }
    
    /**
     * Add a scene
     * @param {Scene} scene - Scene to add
     */
    addScene(scene) {
        if (this.scenes.has(scene.name)) {
            console.warn(`Scene ${scene.name} already exists`);
            return;
        }
        
        this.scenes.set(scene.name, scene);
        scene.engine = this;
        
        this.emit('scene:added', scene);
    }
    
    /**
     * Remove a scene
     * @param {string} name - Scene name
     */
    removeScene(name) {
        const scene = this.scenes.get(name);
        if (!scene) return;
        
        if (scene === this.activeScene) {
            console.warn('Cannot remove active scene');
            return;
        }
        
        this.scenes.delete(name);
        scene.engine = null;
        
        this.emit('scene:removed', scene);
    }
    
    /**
     * Switch to a scene
     * @param {string} name - Scene name
     * @param {object} data - Data to pass to scene
     */
    async switchScene(name, data = {}) {
        const newScene = this.scenes.get(name);
        if (!newScene) {
            throw new Error(`Scene ${name} not found`);
        }
        
        // Don't switch if already loading this scene
        if (this.loadingScene === newScene) {
            return;
        }
        
        this.loadingScene = newScene;
        
        // Deactivate current scene
        if (this.activeScene) {
            this.activeScene.active = false;
            await this.activeScene.onDeactivate();
            this.emit('scene:deactivated', this.activeScene);
        }
        
        // Load new scene if needed
        if (!newScene.loaded) {
            newScene.loading = true;
            this.emit('scene:loading', newScene);
            
            try {
                await newScene.onLoad(data);
                newScene.loaded = true;
                newScene.loading = false;
            } catch (error) {
                newScene.loading = false;
                this.loadingScene = null;
                console.error(`Failed to load scene ${name}:`, error);
                throw error;
            }
        }
        
        // Activate new scene
        this.activeScene = newScene;
        this.activeScene.active = true;
        await this.activeScene.onActivate(data);
        
        // Start all entities in scene if game is running
        if (this.running) {
            this.activeScene.entities.forEach(entity => {
                if (!entity.started) {
                    entity._start();
                }
            });
        }
        
        this.loadingScene = null;
        
        this.emit('scene:activated', this.activeScene);
    }
    
    /**
     * Start the game engine
     */
    start() {
        if (this.running) return;
        
        this.running = true;
        this.lastFrameTime = performance.now();
        this.accumulator = 0;
        
        // Start all systems
        this.systems.forEach(system => {
            if (system.start) system.start();
        });
        
        // Start active scene entities
        if (this.activeScene) {
            this.activeScene.entities.forEach(entity => {
                if (!entity.started) {
                    entity._start();
                }
            });
        }
        
        this.emit('engine:start');
        
        // Start game loop
        requestAnimationFrame(this._gameLoop);
    }
    
    /**
     * Stop the game engine
     */
    stop() {
        this.running = false;
        
        // Stop all systems
        this.systems.forEach(system => {
            if (system.stop) system.stop();
        });
        
        this.emit('engine:stop');
    }
    
    /**
     * Pause the game
     */
    pause() {
        if (!this.running || this.paused) return;
        this.paused = true;
        this.emit('engine:pause');
    }
    
    /**
     * Resume the game
     */
    resume() {
        if (!this.running || !this.paused) return;
        this.paused = false;
        this.lastFrameTime = performance.now();
        this.emit('engine:resume');
    }
    
    /**
     * Main game loop
     * @private
     */
    _gameLoop(currentTime) {
        if (!this.running) return;
        
        requestAnimationFrame(this._gameLoop);
        
        // Calculate delta time
        const deltaTime = Math.min(
            (currentTime - this.lastFrameTime) / 1000,
            this.config.maxDeltaTime
        );
        this.lastFrameTime = currentTime;
        
        if (this.paused) return;
        
        // Update time
        this.time.delta = deltaTime * this.time.scale;
        this.time.total += this.time.delta;
        
        // Performance tracking
        const frameStart = performance.now();
        
        // Fixed timestep updates
        this.accumulator += this.time.delta;
        while (this.accumulator >= this.config.fixedTimeStep) {
            this._fixedUpdate(this.config.fixedTimeStep);
            this.accumulator -= this.config.fixedTimeStep;
        }
        
        // Variable timestep update
        const updateStart = performance.now();
        this._update(this.time.delta);
        this.performance.updateTime = performance.now() - updateStart;
        
        // Render
        const renderStart = performance.now();
        this._render();
        this.performance.renderTime = performance.now() - renderStart;
        
        // Update performance stats
        this.performance.frameTime = performance.now() - frameStart;
        this.performance.frameCount++;
        
        // Update FPS counter
        if (currentTime - this.performance.lastFPSUpdate >= 1000) {
            this.performance.fps = this.performance.frameCount;
            this.performance.frameCount = 0;
            this.performance.lastFPSUpdate = currentTime;
        }
        
        // Debug rendering
        if (this.config.debug) {
            this._renderDebug();
        }
    }
    
    /**
     * Fixed timestep update
     * @private
     */
    _fixedUpdate(fixedDeltaTime) {
        // Update fixed time
        this.time.fixed += fixedDeltaTime;
        
        // Update physics and fixed-step systems
        const collision = this.getSystem('collision');
        if (collision && collision.fixedUpdate) {
            collision.fixedUpdate(fixedDeltaTime);
        }
        
        // Fixed update scene
        if (this.activeScene) {
            this.activeScene._fixedUpdate(fixedDeltaTime);
        }
    }
    
    /**
     * Variable timestep update
     * @private
     */
    _update(deltaTime) {
        // Update systems in order
        this.systemUpdateOrder.forEach(systemName => {
            const system = this.systems.get(systemName);
            if (system && system.update) {
                system.update(deltaTime);
            }
        });
        
        // Update other systems
        this.systems.forEach((system, name) => {
            if (!this.systemUpdateOrder.includes(name) && system.update) {
                system.update(deltaTime);
            }
        });
        
        // Update active scene
        if (this.activeScene) {
            this.activeScene._update(deltaTime);
        }
        
        this.emit('engine:update', deltaTime);
    }
    
    /**
     * Render
     * @private
     */
    _render() {
        const renderer = this.getSystem('renderer');
        if (!renderer) return;
        
        // Clear canvas
        if (this.config.backgroundColor) {
            this.context.fillStyle = this.config.backgroundColor;
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Render active scene
        if (this.activeScene) {
            this.activeScene._render(this.context);
        }
        
        // Render systems
        this.systems.forEach(system => {
            if (system.render) {
                system.render(this.context);
            }
        });
        
        this.emit('engine:render');
    }
    
    /**
     * Render debug info
     * @private
     */
    _renderDebug() {
        const ctx = this.context;
        ctx.save();
        
        // Debug background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(5, 5, 200, 100);
        
        // Debug text
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px monospace';
        ctx.fillText(`FPS: ${this.performance.fps}`, 10, 20);
        ctx.fillText(`Frame: ${this.performance.frameTime.toFixed(2)}ms`, 10, 35);
        ctx.fillText(`Update: ${this.performance.updateTime.toFixed(2)}ms`, 10, 50);
        ctx.fillText(`Render: ${this.performance.renderTime.toFixed(2)}ms`, 10, 65);
        
        if (this.activeScene) {
            ctx.fillText(`Scene: ${this.activeScene.name}`, 10, 80);
            ctx.fillText(`Entities: ${this.activeScene.entities.size}`, 10, 95);
        }
        
        ctx.restore();
    }
    
    /**
     * Resize canvas
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        
        this.emit('engine:resize', { width, height });
    }
    
    /**
     * Set time scale
     * @param {number} scale - Time scale (1 = normal, 0.5 = half speed, etc)
     */
    setTimeScale(scale) {
        this.time.scale = Math.max(0, scale);
    }
    
    /**
     * Destroy the engine
     */
    destroy() {
        this.stop();
        
        // Destroy all scenes
        this.scenes.forEach(scene => scene.destroy());
        this.scenes.clear();
        
        // Destroy all systems
        this.systems.forEach(system => {
            if (system.destroy) system.destroy();
        });
        this.systems.clear();
        
        this.removeAllListeners();
    }
}