// engine.js - Core game engine

class Engine {
    constructor(config) {
        this.config = config;
        this.systems = new Map();
        this.entities = new Map();
        this.running = false;
    }
    
    registerSystem(name, system) {
        this.systems.set(name, system);
    }
    
    getSystem(name) {
        return this.systems.get(name);
    }
    
    addEntity(entity) {
        if (!entity.id) {
            entity.id = this.generateEntityId();
        }
        this.entities.set(entity.id, entity);
        return entity.id;
    }
    
    removeEntity(id) {
        this.entities.delete(id);
    }
    
    getEntity(id) {
        return this.entities.get(id);
    }
    
    getAllEntities() {
        return Array.from(this.entities.values());
    }
    
    getEntitiesByType(type) {
        return Array.from(this.entities.values()).filter(e => e.type === type);
    }
    
    generateEntityId() {
        return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    start() {
        this.running = true;
        this.systems.forEach(system => {
            if (system.start) system.start();
        });
    }
    
    stop() {
        this.running = false;
        this.systems.forEach(system => {
            if (system.stop) system.stop();
        });
    }
    
    update(deltaTime) {
        if (!this.running) return;
        
        this.systems.forEach(system => {
            if (system.update) system.update(deltaTime);
        });
    }
    
    render(ctx) {
        if (!this.running) return;
        
        this.systems.forEach(system => {
            if (system.render) system.render(ctx);
        });
    }
}