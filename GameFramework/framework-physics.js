// GameFramework/framework-physics.js - Physics and Collision Systems (Audio moved to separate file)

/**
 * Physics System - Handles physics simulation
 */
class PhysicsSystem extends System {
    constructor(config = {}) {
        super(config);
        this.gravity = config.gravity || 0;
        this.globalFriction = config.friction || 0;
    }
    
    update(deltaTime) {
        const entities = this.game.getEntitiesWithComponent(PhysicsComponent);
        
        entities.forEach(entity => {
            const physics = entity.getComponent(PhysicsComponent);
            if (!physics) return;
            
            // Apply gravity
            if (physics.useGravity) {
                physics.velocity.y += this.gravity * physics.gravityScale * deltaTime;
            }
            
            // Apply forces
            physics.forces.forEach(force => {
                physics.acceleration.x += force.x / physics.mass;
                physics.acceleration.y += force.y / physics.mass;
            });
            physics.forces = [];
            
            // Update velocity
            physics.velocity.x += physics.acceleration.x * deltaTime;
            physics.velocity.y += physics.acceleration.y * deltaTime;
            
            // Apply drag
            if (physics.drag > 0) {
                physics.velocity.x *= (1 - physics.drag * deltaTime);
                physics.velocity.y *= (1 - physics.drag * deltaTime);
            }
            
            // Clamp to max velocity
            physics.velocity.x = Math.max(-physics.maxVelocity.x, Math.min(physics.maxVelocity.x, physics.velocity.x));
            physics.velocity.y = Math.max(-physics.maxVelocity.y, Math.min(physics.maxVelocity.y, physics.velocity.y));
            
            // Update position
            entity.x += physics.velocity.x * deltaTime;
            entity.y += physics.velocity.y * deltaTime;
            
            // Reset acceleration
            physics.acceleration.set(0, 0);
            
            // Check grounded state
            physics.grounded = false;
        });
    }
}

/**
 * Collision System - Handles collision detection and resolution
 */
class CollisionSystem extends System {
    constructor(config = {}) {
        super(config);
        this.layers = new Map();
        this.collisionMatrix = config.collisionMatrix || {};
    }
    
    update(deltaTime) {
        const entities = this.game.getEntitiesWithComponent(CollisionComponent);
        
        // Group entities by layer
        this.layers.clear();
        entities.forEach(entity => {
            const collision = entity.getComponent(CollisionComponent);
            const layer = collision.layer;
            
            if (!this.layers.has(layer)) {
                this.layers.set(layer, []);
            }
            this.layers.get(layer).push(entity);
        });
        
        // Check collisions
        entities.forEach(entityA => {
            const collisionA = entityA.getComponent(CollisionComponent);
            const boundsA = collisionA.getBounds();
            
            // Check against other entities
            collisionA.mask.forEach(targetLayer => {
                const targets = this.layers.get(targetLayer) || [];
                
                targets.forEach(entityB => {
                    if (entityA === entityB) return;
                    
                    const collisionB = entityB.getComponent(CollisionComponent);
                    const boundsB = collisionB.getBounds();
                    
                    if (this.checkAABB(boundsA, boundsB)) {
                        // Collision detected
                        this.resolveCollision(entityA, entityB, collisionA, collisionB);
                    }
                });
            });
        });
    }
    
    checkAABB(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
    
    resolveCollision(entityA, entityB, collisionA, collisionB) {
        // Emit collision events
        this.game.events.emit('collision:enter', {
            entityA,
            entityB,
            collisionA,
            collisionB
        });
        
        // Handle triggers
        if (collisionA.isTrigger || collisionB.isTrigger) {
            // Trigger collision - no physics resolution
            if (collisionA.onTriggerEnter) {
                collisionA.onTriggerEnter(entityB);
            }
            if (collisionB.onTriggerEnter) {
                collisionB.onTriggerEnter(entityA);
            }
            return;
        }
        
        // Solid collision - resolve overlap
        const boundsA = collisionA.getBounds();
        const boundsB = collisionB.getBounds();
        
        // Calculate overlap
        const overlapX = Math.min(boundsA.x + boundsA.width - boundsB.x, boundsB.x + boundsB.width - boundsA.x);
        const overlapY = Math.min(boundsA.y + boundsA.height - boundsB.y, boundsB.y + boundsB.height - boundsA.y);
        
        // Resolve the smallest overlap
        if (overlapX < overlapY) {
            // Horizontal collision
            const sign = (boundsA.x + boundsA.width / 2) < (boundsB.x + boundsB.width / 2) ? -1 : 1;
            entityA.x += sign * overlapX / 2;
            entityB.x -= sign * overlapX / 2;
            
            // Update velocities
            const physicsA = entityA.getComponent(PhysicsComponent);
            const physicsB = entityB.getComponent(PhysicsComponent);
            
            if (physicsA && physicsB) {
                const relativeVelocity = physicsA.velocity.x - physicsB.velocity.x;
                const impulse = 2 * relativeVelocity / (physicsA.mass + physicsB.mass);
                
                physicsA.velocity.x -= impulse * physicsB.mass;
                physicsB.velocity.x += impulse * physicsA.mass;
            }
        } else {
            // Vertical collision
            const sign = (boundsA.y + boundsA.height / 2) < (boundsB.y + boundsB.height / 2) ? -1 : 1;
            entityA.y += sign * overlapY / 2;
            entityB.y -= sign * overlapY / 2;
            
            // Update velocities
            const physicsA = entityA.getComponent(PhysicsComponent);
            const physicsB = entityB.getComponent(PhysicsComponent);
            
            if (physicsA && physicsB) {
                const relativeVelocity = physicsA.velocity.y - physicsB.velocity.y;
                const impulse = 2 * relativeVelocity / (physicsA.mass + physicsB.mass);
                
                physicsA.velocity.y -= impulse * physicsB.mass;
                physicsB.velocity.y += impulse * physicsA.mass;
                
                // Check for grounded state
                if (sign > 0) {
                    physicsA.grounded = true;
                }
            }
        }
    }
}

/**
 * Simple Camera System
 */
class CameraSystem extends System {
    constructor(config = {}) {
        super(config);
        this.position = new Vector2(0, 0);
        this.target = null;
        this.smoothing = config.smoothing || 0.1;
        this.bounds = config.bounds;
        this.shake = {
            intensity: 0,
            duration: 0,
            timer: 0
        };
    }
    
    follow(entity) {
        this.target = entity;
    }
    
    update(deltaTime) {
        // Follow target
        if (this.target) {
            const targetX = this.target.x - this.game.canvas.width / 2;
            const targetY = this.target.y - this.game.canvas.height / 2;
            
            this.position.x += (targetX - this.position.x) * this.smoothing;
            this.position.y += (targetY - this.position.y) * this.smoothing;
        }
        
        // Apply bounds
        if (this.bounds) {
            this.position.x = Math.max(this.bounds.x, Math.min(this.bounds.x + this.bounds.width - this.game.canvas.width, this.position.x));
            this.position.y = Math.max(this.bounds.y, Math.min(this.bounds.y + this.bounds.height - this.game.canvas.height, this.position.y));
        }
        
        // Update shake
        if (this.shake.timer > 0) {
            this.shake.timer -= deltaTime;
            if (this.shake.timer <= 0) {
                this.shake.intensity = 0;
            }
        }
    }
    
    applyTransform(context) {
        let x = -this.position.x;
        let y = -this.position.y;
        
        // Apply shake
        if (this.shake.intensity > 0) {
            x += (Math.random() - 0.5) * this.shake.intensity;
            y += (Math.random() - 0.5) * this.shake.intensity;
        }
        
        context.translate(Math.round(x), Math.round(y));
    }
    
    shake(intensity = 10, duration = 0.5) {
        this.shake.intensity = intensity;
        this.shake.duration = duration;
        this.shake.timer = duration;
    }
    
    worldToScreen(worldPos) {
        return new Vector2(
            worldPos.x - this.position.x,
            worldPos.y - this.position.y
        );
    }
    
    screenToWorld(screenPos) {
        return new Vector2(
            screenPos.x + this.position.x,
            screenPos.y + this.position.y
        );
    }
}

// Make systems available globally
window.PhysicsSystem = PhysicsSystem;
window.CollisionSystem = CollisionSystem;
window.CameraSystem = CameraSystem;

console.log('⚙️ Physics and Camera systems loaded');