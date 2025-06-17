// GameFramework/src/core/Scene.js
import { EventEmitter } from './EventEmitter.js';

/**
 * Scene - Container for entities and scene-specific logic
 * @class Scene
 */
export class Scene extends EventEmitter {
    constructor(name, config = {}) {
        super();
        
        this.name = name;
        this.engine = null;
        this.active = false;
        
        // Entity management
        this.entities = new Map();
        this.entitiesByTag = new Map();
        this.entitiesByLayer = new Map();
        this.rootEntities = [];
        
        // Scene configuration
        this.config = {
            backgroundColor: '#000000',
            gravity: { x: 0, y: 0 },
            ...config
        };
        
        // Loading state
        this.loaded = false;
        this.loading = false;
    }
    
    /**
     * Called when scene is loaded
     * Override this to load scene resources
     */
    async onLoad() {
        // Override in derived classes
    }
    
    /**
     * Called when scene is activated
     */
    async onActivate() {
        // Override in derived classes
    }
    
    /**
     * Called when scene is deactivated
     */
    async onDeactivate() {
        // Override in derived classes
    }
    
    /**
     * Called when scene is unloaded
     */
    async onUnload() {
        // Override in derived classes
    }
    
    /**
     * Add entity to scene
     * @param {Entity} entity - Entity to add
     * @returns {Entity} The added entity
     */
    addEntity(entity) {
        if (this.entities.has(entity.id)) {
            console.warn(`Entity ${entity.id} already in scene`);
            return entity;
        }
        
        // Add to main map
        this.entities.set(entity.id, entity);
        
        // Add to tag map
        entity.tags.forEach(tag => {
            if (!this.entitiesByTag.has(tag)) {
                this.entitiesByTag.set(tag, new Set());
            }
            this.entitiesByTag.get(tag).add(entity);
        });
        
        // Add to layer map
        if (!this.entitiesByLayer.has(entity.layer)) {
            this.entitiesByLayer.set(entity.layer, new Set());
        }
        this.entitiesByLayer.get(entity.layer).add(entity);
        
        // Add to root entities if no parent
        if (!entity.parent) {
            this.rootEntities.push(entity);
        }
        
        // Set references
        entity.scene = this;
        entity.engine = this.engine;
        
        // Notify components
        entity.components.forEach(component => {
            component.onSceneAdd();
        });
        
        // Start entity if scene is active
        if (this.active && !entity.started) {
            entity._start();
        }
        
        this.emit('entity:added', entity);
        
        return entity;
    }
    
    /**
     * Remove entity from scene
     * @param {Entity} entity - Entity to remove
     */
    removeEntity(entity) {
        if (!this.entities.has(entity.id)) return;
        
        // Remove from maps
        this.entities.delete(entity.id);
        
        // Remove from tag map
        entity.tags.forEach(tag => {
            const tagSet = this.entitiesByTag.get(tag);
            if (tagSet) {
                tagSet.delete(entity);
                if (tagSet.size === 0) {
                    this.entitiesByTag.delete(tag);
                }
            }
        });
        
        // Remove from layer map
        const layerSet = this.entitiesByLayer.get(entity.layer);
        if (layerSet) {
            layerSet.delete(entity);
            if (layerSet.size === 0) {
                this.entitiesByLayer.delete(entity.layer);
            }
        }
        
        // Remove from root entities
        const rootIndex = this.rootEntities.indexOf(entity);
        if (rootIndex > -1) {
            this.rootEntities.splice(rootIndex, 1);
        }
        
        // Notify components
        entity.components.forEach(component => {
            component.onSceneRemove();
        });
        
        // Clear references
        entity.scene = null;
        entity.engine = null;
        
        this.emit('entity:removed', entity);
    }
    
    /**
     * Find entity by ID
     * @param {string} id - Entity ID
     * @returns {Entity|null}
     */
    findEntity(id) {
        return this.entities.get(id) || null;
    }
    
    /**
     * Find entity by name
     * @param {string} name - Entity name
     * @returns {Entity|null}
     */
    findEntityByName(name) {
        for (const entity of this.entities.values()) {
            if (entity.name === name) return entity;
        }
        return null;
    }
    
    /**
     * Find entities by tag
     * @param {string} tag - Tag to search for
     * @returns {Entity[]}
     */
    findEntitiesByTag(tag) {
        const tagSet = this.entitiesByTag.get(tag);
        return tagSet ? Array.from(tagSet) : [];
    }
    
    /**
     * Get all entities in layer
     * @param {number} layer - Layer number
     * @returns {Entity[]}
     */
    getEntitiesInLayer(layer) {
        const layerSet = this.entitiesByLayer.get(layer);
        return layerSet ? Array.from(layerSet) : [];
    }
    
    /**
     * Get all entities
     * @returns {Entity[]}
     */
    getAllEntities() {
        return Array.from(this.entities.values());
    }
    
    /**
     * Get entities with component
     * @param {Function} ComponentClass - Component class to search for
     * @returns {Entity[]}
     */
    getEntitiesWithComponent(ComponentClass) {
        const results = [];
        for (const entity of this.entities.values()) {
            if (entity.hasComponent(ComponentClass)) {
                results.push(entity);
            }
        }
        return results;
    }
    
    /**
     * Internal update method
     * @param {number} deltaTime - Time since last frame
     */
    _update(deltaTime) {
        // Update root entities (they update their children)
        this.rootEntities.forEach(entity => {
            entity._update(deltaTime);
        });
    }
    
    /**
     * Internal fixed update method
     * @param {number} fixedDeltaTime - Fixed time step
     */
    _fixedUpdate(fixedDeltaTime) {
        // Fixed update root entities (they update their children)
        this.rootEntities.forEach(entity => {
            entity._fixedUpdate(fixedDeltaTime);
        });
    }
    
    /**
     * Internal render method
     * @param {CanvasRenderingContext2D} context - Canvas context
     */
    _render(context) {
        // Clear with background color
        if (this.config.backgroundColor) {
            context.fillStyle = this.config.backgroundColor;
            context.fillRect(0, 0, context.canvas.width, context.canvas.height);
        }
        
        // Get sorted layers
        const layers = Array.from(this.entitiesByLayer.keys()).sort((a, b) => a - b);
        
        // Render each layer
        layers.forEach(layer => {
            const entities = this.getEntitiesInLayer(layer);
            entities.forEach(entity => {
                // Only render root entities (they render their children)
                if (!entity.parent) {
                    entity._render(context);
                }
            });
        });
    }
    
    /**
     * Clear all entities from scene
     */
    clear() {
        // Destroy all entities
        [...this.entities.values()].forEach(entity => {
            entity.destroy();
        });
        
        // Clear maps
        this.entities.clear();
        this.entitiesByTag.clear();
        this.entitiesByLayer.clear();
        this.rootEntities = [];
    }
    
    /**
     * Destroy the scene
     */
    destroy() {
        this.clear();
        this.removeAllListeners();
    }
}