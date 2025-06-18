// GameFramework/src/core/Entity.js
import { Vector2 } from './Vector2.js';
import { EventEmitter } from './EventEmitter.js';

/**
 * Entity - Base class for all game objects
 * @class Entity
 */
export class Entity extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.id = config.id || Entity.generateId();
        this.name = config.name || '';
        this.tags = new Set(config.tags || []);
        
        // Transform
        this.position = new Vector2(config.x || 0, config.y || 0);
        this.rotation = config.rotation || 0;
        this.scale = new Vector2(config.scaleX || 1, config.scaleY || 1);
        
        // Hierarchy
        this.parent = null;
        this.children = [];
        
        // Components
        this.components = new Map();
        this.componentsByType = new Map();
        
        // State
        this.active = config.active !== false;
        this.visible = config.visible !== false;
        this.layer = config.layer || 0;
        
        // References
        this.scene = null;
        this.engine = null;
        
        // Lifecycle flags
        this.started = false;
        this.destroyed = false;
    }
    
    /**
     * Static ID generator
     */
    static _nextId = 1;
    static generateId() {
        return `entity_${Entity._nextId++}`;
    }
    
    /**
     * Transform getters/setters
     */
    get x() { return this.position.x; }
    set x(value) { this.position.x = value; }
    
    get y() { return this.position.y; }
    set y(value) { this.position.y = value; }
    
    get scaleX() { return this.scale.x; }
    set scaleX(value) { this.scale.x = value; }
    
    get scaleY() { return this.scale.y; }
    set scaleY(value) { this.scale.y = value; }
    
    /**
     * Get world position (accounting for parent transforms)
     * @returns {Vector2}
     */
    get worldPosition() {
        if (!this.parent) return this.position.copy();
        
        const parentWorld = this.parent.worldPosition;
        const rotated = this.position.rotate(this.parent.worldRotation);
        
        return new Vector2(
            parentWorld.x + rotated.x * this.parent.worldScale.x,
            parentWorld.y + rotated.y * this.parent.worldScale.y
        );
    }
    
    /**
     * Get world rotation (accounting for parent transforms)
     * @returns {number}
     */
    get worldRotation() {
        if (!this.parent) return this.rotation;
        return this.parent.worldRotation + this.rotation;
    }
    
    /**
     * Get world scale (accounting for parent transforms)
     * @returns {Vector2}
     */
    get worldScale() {
        if (!this.parent) return this.scale.copy();
        
        const parentScale = this.parent.worldScale;
        return new Vector2(
            this.scale.x * parentScale.x,
            this.scale.y * parentScale.y
        );
    }
    
    /**
     * Add a component to this entity
     * @param {Component} component - Component instance to add
     * @returns {Component} The added component
     */
    addComponent(component) {
        const ComponentClass = component.constructor;
        
        // Check if component already exists
        if (this.components.has(ComponentClass)) {
            console.warn(`Component ${ComponentClass.name} already exists on entity ${this.name || this.id}`);
            return this.components.get(ComponentClass);
        }
        
        // Add to maps
        this.components.set(ComponentClass, component);
        
        // Add to type map for multiple components of same base type
        const baseType = Object.getPrototypeOf(ComponentClass);
        if (!this.componentsByType.has(baseType)) {
            this.componentsByType.set(baseType, []);
        }
        this.componentsByType.get(baseType).push(component);
        
        // Set references
        component.entity = this;
        
        // Call lifecycle methods
        component.onAdd();
        
        if (this.scene) {
            component.onSceneAdd();
            if (this.started && !component.started) {
                component.started = true;
                component.start();
            }
        }
        
        this.emit('component:added', component);
        
        return component;
    }
    
    /**
     * Remove a component from this entity
     * @param {Function} ComponentClass - Component class to remove
     */
    removeComponent(ComponentClass) {
        const component = this.components.get(ComponentClass);
        if (!component) return;
        
        // Remove from maps
        this.components.delete(ComponentClass);
        
        const baseType = Object.getPrototypeOf(ComponentClass);
        const typeComponents = this.componentsByType.get(baseType);
        if (typeComponents) {
            const index = typeComponents.indexOf(component);
            if (index > -1) {
                typeComponents.splice(index, 1);
            }
        }
        
        // Call lifecycle methods
        if (this.scene) {
            component.onSceneRemove();
        }
        component.onRemove();
        
        // Clear references
        component.entity = null;
        
        this.emit('component:removed', component);
    }
    
    /**
     * Get a component by class
     * @param {Function} ComponentClass - Component class to get
     * @returns {Component|null}
     */
    getComponent(ComponentClass) {
        return this.components.get(ComponentClass) || null;
    }
    
    /**
     * Get all components of a type (including derived types)
     * @param {Function} ComponentClass - Component class to get
     * @returns {Component[]}
     */
    getComponents(ComponentClass) {
        return this.componentsByType.get(ComponentClass) || [];
    }
    
    /**
     * Check if entity has a component
     * @param {Function} ComponentClass - Component class to check
     * @returns {boolean}
     */
    hasComponent(ComponentClass) {
        return this.components.has(ComponentClass);
    }
    
    /**
     * Add child entity
     * @param {Entity} child - Child entity to add
     */
    addChild(child) {
        if (child.parent === this) return;
        
        if (child.parent) {
            child.parent.removeChild(child);
        }
        
        this.children.push(child);
        child.parent = this;
        
        // If we're in a scene, add child to scene too
        if (this.scene && !child.scene) {
            this.scene.addEntity(child);
        }
        
        this.emit('child:added', child);
    }
    
    /**
     * Remove child entity
     * @param {Entity} child - Child entity to remove
     */
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index === -1) return;
        
        this.children.splice(index, 1);
        child.parent = null;
        
        this.emit('child:removed', child);
    }
    
    /**
     * Add tag
     * @param {string} tag - Tag to add
     */
    addTag(tag) {
        this.tags.add(tag);
    }
    
    /**
     * Remove tag
     * @param {string} tag - Tag to remove
     */
    removeTag(tag) {
        this.tags.delete(tag);
    }
    
    /**
     * Check if entity has tag
     * @param {string} tag - Tag to check
     * @returns {boolean}
     */
    hasTag(tag) {
        return this.tags.has(tag);
    }
    
    /**
     * Internal lifecycle methods
     */
    _start() {
        if (this.started) return;
        this.started = true;
        
        // Start all components
        this.components.forEach(component => {
            if (!component.started) {
                component.started = true;
                if (component.enabled) {
                    component.start();
                }
            }
        });
        
        // Start children
        this.children.forEach(child => child._start());
    }
    
    _update(deltaTime) {
        if (!this.active) return;
        
        // Update components
        this.components.forEach(component => {
            if (component.enabled) {
                component.update(deltaTime);
            }
        });
        
        // Update children
        this.children.forEach(child => child._update(deltaTime));
    }
    
    _fixedUpdate(fixedDeltaTime) {
        if (!this.active) return;
        
        // Fixed update components
        this.components.forEach(component => {
            if (component.enabled) {
                component.fixedUpdate(fixedDeltaTime);
            }
        });
        
        // Fixed update children
        this.children.forEach(child => child._fixedUpdate(fixedDeltaTime));
    }
    
    _render(context) {
        if (!this.visible) return;
        
        context.save();
        
        // Apply transform
        const worldPos = this.worldPosition;
        const worldRot = this.worldRotation;
        const worldScale = this.worldScale;
        
        context.translate(worldPos.x, worldPos.y);
        context.rotate(worldRot);
        context.scale(worldScale.x, worldScale.y);
        
        // Render components
        this.components.forEach(component => {
            if (component.enabled) {
                component.render(context);
            }
        });
        
        context.restore();
        
        // Render children (they handle their own transforms)
        this.children.forEach(child => child._render(context));
    }
    
    /**
     * Destroy this entity and all its components
     */
    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        
        // Destroy all children
        [...this.children].forEach(child => child.destroy());
        
        // Destroy all components
        [...this.components.values()].forEach(component => {
            component.destroy();
        });
        
        // Remove from parent
        if (this.parent) {
            this.parent.removeChild(this);
        }
        
        // Remove from scene
        if (this.scene) {
            this.scene.removeEntity(this);
        }
        
        this.emit('destroyed');
        this.removeAllListeners();
    }
    
    /**
     * Find child by name
     * @param {string} name - Name to search for
     * @returns {Entity|null}
     */
    findChild(name) {
        for (const child of this.children) {
            if (child.name === name) return child;
            const found = child.findChild(name);
            if (found) return found;
        }
        return null;
    }
    
    /**
     * Find children by tag
     * @param {string} tag - Tag to search for
     * @returns {Entity[]}
     */
    findChildrenByTag(tag) {
        const results = [];
        
        for (const child of this.children) {
            if (child.hasTag(tag)) {
                results.push(child);
            }
            results.push(...child.findChildrenByTag(tag));
        }
        
        return results;
    }
}