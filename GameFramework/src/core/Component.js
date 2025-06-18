// GameFramework/src/core/Component.js
/**
 * Component - Base class for all entity components
 * @class Component
 */
export class Component {
    constructor(config = {}) {
        this.entity = null;
        this.enabled = config.enabled !== false;
        this.started = false;
        
        // Store configuration
        Object.assign(this, config);
    }
    
    /**
     * Get the game engine instance
     * @returns {GameEngine|null}
     */
    get engine() {
        return this.entity ? this.entity.engine : null;
    }
    
    /**
     * Get the scene this component belongs to
     * @returns {Scene|null}
     */
    get scene() {
        return this.entity ? this.entity.scene : null;
    }
    
    /**
     * Called when component is added to entity
     */
    onAdd() {}
    
    /**
     * Called when component is removed from entity
     */
    onRemove() {}
    
    /**
     * Called when entity is added to scene
     */
    onSceneAdd() {}
    
    /**
     * Called when entity is removed from scene
     */
    onSceneRemove() {}
    
    /**
     * Called once on first frame
     */
    start() {}
    
    /**
     * Called every frame
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {}
    
    /**
     * Called every frame for rendering
     * @param {CanvasRenderingContext2D} context - Canvas context
     */
    render(context) {}
    
    /**
     * Called for fixed timestep physics updates
     * @param {number} fixedDeltaTime - Fixed time step
     */
    fixedUpdate(fixedDeltaTime) {}
    
    /**
     * Called when component is destroyed
     */
    destroy() {
        if (this.entity) {
            this.entity.removeComponent(this.constructor);
        }
    }
    
    /**
     * Enable the component
     */
    enable() {
        this.enabled = true;
    }
    
    /**
     * Disable the component
     */
    disable() {
        this.enabled = false;
    }
    
    /**
     * Get another component from the same entity
     * @param {Function} ComponentClass - Component class to get
     * @returns {Component|null}
     */
    getComponent(ComponentClass) {
        return this.entity ? this.entity.getComponent(ComponentClass) : null;
    }
    
    /**
     * Get all components of a type from the same entity
     * @param {Function} ComponentClass - Component class to get
     * @returns {Component[]}
     */
    getComponents(ComponentClass) {
        return this.entity ? this.entity.getComponents(ComponentClass) : [];
    }
    
    /**
     * Require a component (throws if not found)
     * @param {Function} ComponentClass - Component class to require
     * @returns {Component}
     */
    requireComponent(ComponentClass) {
        const component = this.getComponent(ComponentClass);
        if (!component) {
            throw new Error(`Required component ${ComponentClass.name} not found on entity`);
        }
        return component;
    }
}