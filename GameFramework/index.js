// GameFramework/index.js - Main entry point for the GameFramework

// Core classes
import { Vector2 } from './src/core/Vector2.js';
import { EventEmitter } from './src/core/EventEmitter.js';
import { Component } from './src/core/Component.js';
import { Entity } from './src/core/Entity.js';
import { Scene } from './src/core/Scene.js';
import { GameEngine } from './src/core/GameEngine.js';

// Systems
import { InputManager } from './src/systems/InputManager.js';
import { Renderer, Camera } from './src/systems/Renderer.js';
import { AssetManager } from './src/systems/AssetManager.js';
import { AudioSystem } from './src/systems/AudioSystem.js';
import { CollisionSystem, CollisionShape, CollisionLayers } from './src/systems/CollisionSystem.js';

// Components
import { AsepriteRenderer } from './src/components/AsepriteRenderer.js';
import { AnimatedSprite } from './src/components/AnimatedSprite.js';
import { PhysicsBody } from './src/components/PhysicsBody.js';
import { Collider } from './src/components/Collider.js';
import { TextRenderer } from './src/components/TextRenderer.js';
import { AudioSource } from './src/components/AudioSource.js';

// Parsers
import { AsepriteParser } from './src/parsers/AsepriteParser.js';
import { AssetConfig } from './src/parsers/AssetConfig.js';

// Utilities
import { MathUtils } from './src/utils/MathUtils.js';
import { DebugUtils } from './src/utils/DebugUtils.js';

/**
 * GameFramework - HTML5 Game Development Framework
 * @namespace GameFramework
 */
const GameFramework = {
    // Version
    VERSION: '1.0.0',
    
    // Core classes
    Vector2,
    EventEmitter,
    Component,
    Entity,
    Scene,
    GameEngine,
    
    // Systems
    Systems: {
        InputManager,
        Renderer,
        Camera,
        AssetManager,
        AudioSystem,
        CollisionSystem
    },
    
    // Components
    Components: {
        AsepriteRenderer,
        AnimatedSprite,
        PhysicsBody,
        Collider,
        TextRenderer,
        AudioSource
    },
    
    // Parsers
    Parsers: {
        AsepriteParser,
        AssetConfig
    },
    
    // Utilities
    Utils: {
        MathUtils,
        DebugUtils
    },
    
    // Constants
    CollisionShape,
    CollisionLayers,
    
    // Ready state
    _ready: false,
    _readyCallbacks: [],
    
    /**
     * Check if framework is ready or register callback
     * @param {Function} [callback] - Optional callback for when ready
     * @returns {boolean|undefined} Ready state if no callback provided
     */
    ready(callback) {
        if (typeof callback === 'function') {
            if (this._ready) {
                // Already ready, call immediately
                setTimeout(() => callback(this), 0);
            } else {
                // Store callback for later
                this._readyCallbacks.push(callback);
            }
        } else {
            return this._ready;
        }
    },
    
    /**
     * Mark framework as ready and call callbacks
     * @private
     */
    _markReady() {
        if (this._ready) return;
        
        this._ready = true;
        
        // Call all waiting callbacks
        this._readyCallbacks.forEach(callback => {
            try {
                callback(this);
            } catch (error) {
                console.error('Error in GameFramework ready callback:', error);
            }
        });
        
        // Clear callbacks
        this._readyCallbacks = [];
        
        // Dispatch global event
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gameframework:ready', {
                detail: { framework: this }
            }));
        }
        
        console.log(`🎮 GameFramework v${this.VERSION} ready`);
    },
    
    /**
     * Create a new game instance
     * @param {string} canvasId - Canvas element ID
     * @param {object} config - Game configuration
     * @returns {GameEngine} Game engine instance
     */
    createGame(canvasId, config = {}) {
        // Initialize debug if enabled
        if (config.debug) {
            DebugUtils.init({
                enabled: true,
                logLevel: config.debugLevel || 'info'
            });
        }
        
        // Create engine
        const engine = new GameEngine(canvasId, config);
        
        // Store globally for debugging
        if (config.debug) {
            window.__gameEngine = engine;
        }
        
        return engine;
    },
    
    /**
     * Quick start helper - creates and starts a game
     * @param {string} canvasId - Canvas element ID
     * @param {object} config - Game configuration
     * @returns {Promise<GameEngine>} Promise that resolves with the game engine
     */
    async quickStart(canvasId, config = {}) {
        const engine = this.createGame(canvasId, config);
        
        // Load essential framework assets
        if (config.loadFrameworkAssets !== false) {
            await engine.assets.preloadFrameworkAssets();
        }
        
        // Start the engine
        engine.start();
        
        return engine;
    },
    
    /**
     * Create an entity with components
     * @param {object} definition - Entity definition
     * @returns {Entity} Created entity
     */
    createEntity(definition = {}) {
        const entity = new Entity({
            name: definition.name,
            x: definition.x || 0,
            y: definition.y || 0,
            ...definition.transform
        });
        
        // Add components
        if (definition.components) {
            Object.entries(definition.components).forEach(([name, config]) => {
                const ComponentClass = this.Components[name];
                if (ComponentClass) {
                    entity.addComponent(new ComponentClass(config));
                } else {
                    console.warn(`Component '${name}' not found`);
                }
            });
        }
        
        return entity;
    },
    
    /**
     * Create a basic scene
     * @param {string} name - Scene name
     * @param {object} config - Scene configuration
     * @returns {Scene} Created scene
     */
    createScene(name, config = {}) {
        return new Scene(name, config);
    },
    
    /**
     * Create default asset configuration
     * @returns {AssetConfig} Asset configuration
     */
    createAssetConfig() {
        return new AssetConfig(AssetConfig.createDefault());
    },
    
    /**
     * Register custom component
     * @param {string} name - Component name
     * @param {Function} ComponentClass - Component class
     */
    registerComponent(name, ComponentClass) {
        this.Components[name] = ComponentClass;
    },
    
    /**
     * Register custom system
     * @param {string} name - System name
     * @param {Function} SystemClass - System class
     */
    registerSystem(name, SystemClass) {
        this.Systems[name] = SystemClass;
    }
};

// Convenience exports
export {
    // Core
    Vector2,
    EventEmitter,
    Component,
    Entity,
    Scene,
    GameEngine,
    
    // Systems
    InputManager,
    Renderer,
    Camera,
    AssetManager,
    AudioSystem,
    CollisionSystem,
    CollisionShape,
    CollisionLayers,
    
    // Components
    AsepriteRenderer,
    AnimatedSprite,
    PhysicsBody,
    Collider,
    TextRenderer,
    AudioSource,
    
    // Parsers
    AsepriteParser,
    AssetConfig,
    
    // Utils
    MathUtils,
    DebugUtils
};

// Default export
export default GameFramework;

// Browser initialization
if (typeof window !== 'undefined') {
    // Make GameFramework globally available
    window.GameFramework = GameFramework;
    
    /**
     * Initialize framework when DOM is ready
     */
    function initializeFramework() {
        // Mark framework as ready
        GameFramework._markReady();
    }
    
    // Check if DOM is already loaded
    if (document.readyState === 'loading') {
        // Wait for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', initializeFramework);
    } else {
        // DOM is already loaded, initialize immediately on next tick
        setTimeout(initializeFramework, 0);
    }
}