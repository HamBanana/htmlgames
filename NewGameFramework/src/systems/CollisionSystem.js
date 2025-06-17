// GameFramework/src/systems/CollisionSystem.js
import { Vector2 } from '../core/Vector2.js';

/**
 * Collision shape types
 * @enum
 */
export const CollisionShape = {
    RECTANGLE: 'rectangle',
    CIRCLE: 'circle',
    POLYGON: 'polygon'
};

/**
 * Collision layers
 * @enum
 */
export const CollisionLayers = {
    DEFAULT: 1,
    PLAYER: 2,
    ENEMY: 4,
    PROJECTILE: 8,
    PICKUP: 16,
    WALL: 32,
    TRIGGER: 64
};

/**
 * Collision data structure
 * @class
 */
export class CollisionData {
    constructor(entityA, entityB, overlap, normal) {
        this.entityA = entityA;
        this.entityB = entityB;
        this.colliderA = entityA.getComponent('Collider');
        this.colliderB = entityB.getComponent('Collider');
        this.overlap = overlap;
        this.normal = normal;
        this.contacts = [];
    }
}

/**
 * Spatial hash for broad phase collision detection
 * @class
 */
class SpatialHash {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.buckets = new Map();
    }
    
    clear() {
        this.buckets.clear();
    }
    
    getHash(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }
    
    insert(entity, bounds) {
        const hashes = this.getHashesForBounds(bounds);
        
        hashes.forEach(hash => {
            if (!this.buckets.has(hash)) {
                this.buckets.set(hash, new Set());
            }
            this.buckets.get(hash).add(entity);
        });
    }
    
    getHashesForBounds(bounds) {
        const hashes = new Set();
        
        const startX = Math.floor(bounds.x / this.cellSize);
        const endX = Math.floor((bounds.x + bounds.width) / this.cellSize);
        const startY = Math.floor(bounds.y / this.cellSize);
        const endY = Math.floor((bounds.y + bounds.height) / this.cellSize);
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                hashes.add(`${x},${y}`);
            }
        }
        
        return hashes;
    }
    
    getNearby(bounds) {
        const nearby = new Set();
        const hashes = this.getHashesForBounds(bounds);
        
        hashes.forEach(hash => {
            const bucket = this.buckets.get(hash);
            if (bucket) {
                bucket.forEach(entity => nearby.add(entity));
            }
        });
        
        return Array.from(nearby);
    }
}

/**
 * CollisionSystem - Handles collision detection and resolution
 * @class CollisionSystem
 */
export class CollisionSystem {
    constructor(engine) {
        this.engine = engine;
        
        // Collision detection settings
        this.spatialHash = new SpatialHash(100);
        this.collisionPairs = new Set();
        this.previousCollisions = new Set();
        
        // Physics settings
        this.gravity = new Vector2(0, 980); // Default gravity (pixels/s²)
        this.fixedTimeStep = 1/60;
        
        // Collision callbacks
        this.collisionCallbacks = new Map();
    }
    
    /**
     * Initialize collision system
     */
    initialize() {
        // Register default collision callbacks if needed
    }
    
    /**
     * Update collision system (variable timestep)
     * @param {number} deltaTime - Delta time
     */
    update(deltaTime) {
        // Clear spatial hash
        this.spatialHash.clear();
        
        // Get all entities with colliders
        const entities = this.getEntitiesWithColliders();
        
        // Insert entities into spatial hash
        entities.forEach(entity => {
            const collider = entity.getComponent('Collider');
            if (collider && collider.enabled) {
                const bounds = collider.getBounds();
                this.spatialHash.insert(entity, bounds);
            }
        });
    }
    
    /**
     * Fixed update for physics
     * @param {number} fixedDeltaTime - Fixed time step
     */
    fixedUpdate(fixedDeltaTime) {
        // Update physics bodies
        this.updatePhysics(fixedDeltaTime);
        
        // Detect collisions
        this.detectCollisions();
        
        // Resolve collisions
        this.resolveCollisions();
        
        // Send collision events
        this.sendCollisionEvents();
    }
    
    /**
     * Update physics for all physics bodies
     * @private
     */
    updatePhysics(deltaTime) {
        const entities = this.getEntitiesWithPhysics();
        
        entities.forEach(entity => {
            const physics = entity.getComponent('PhysicsBody');
            if (!physics || !physics.enabled) return;
            
            // Skip static bodies
            if (physics.isStatic) return;
            
            // Apply gravity
            if (physics.useGravity) {
                physics.velocity.x += this.gravity.x * physics.gravityScale * deltaTime;
                physics.velocity.y += this.gravity.y * physics.gravityScale * deltaTime;
            }
            
            // Apply drag
            if (physics.linearDrag > 0) {
                physics.velocity.x *= Math.pow(1 - physics.linearDrag, deltaTime);
                physics.velocity.y *= Math.pow(1 - physics.linearDrag, deltaTime);
            }
            
            // Apply velocity limits
            const speed = physics.velocity.magnitude();
            if (speed > physics.maxSpeed) {
                physics.velocity = physics.velocity.normalize().multiply(physics.maxSpeed);
            }
            
            // Update position
            entity.position.x += physics.velocity.x * deltaTime;
            entity.position.y += physics.velocity.y * deltaTime;
            
            // Update rotation
            entity.rotation += physics.angularVelocity * deltaTime;
            
            // Apply angular drag
            if (physics.angularDrag > 0) {
                physics.angularVelocity *= Math.pow(1 - physics.angularDrag, deltaTime);
            }
        });
    }
    
    /**
     * Detect collisions using spatial hash
     * @private
     */
    detectCollisions() {
        this.collisionPairs.clear();
        const entities = this.getEntitiesWithColliders();
        const checked = new Set();
        
        entities.forEach(entity => {
            const collider = entity.getComponent('Collider');
            if (!collider || !collider.enabled) return;
            
            const bounds = collider.getBounds();
            const nearby = this.spatialHash.getNearby(bounds);
            
            nearby.forEach(other => {
                if (entity === other) return;
                
                // Avoid checking the same pair twice
                const pairKey = this.getPairKey(entity, other);
                if (checked.has(pairKey)) return;
                checked.add(pairKey);
                
                const otherCollider = other.getComponent('Collider');
                if (!otherCollider || !otherCollider.enabled) return;
                
                // Check layer compatibility
                if (!this.shouldCollide(collider, otherCollider)) return;
                
                // Perform collision test
                const collision = this.testCollision(entity, other);
                if (collision) {
                    this.collisionPairs.add(collision);
                }
            });
        });
    }
    
    /**
     * Test collision between two entities
     * @private
     */
    testCollision(entityA, entityB) {
        const colliderA = entityA.getComponent('Collider');
        const colliderB = entityB.getComponent('Collider');
        
        // Get collision test function based on shapes
        const testFunc = this.getCollisionTest(colliderA.shape, colliderB.shape);
        if (!testFunc) return null;
        
        const result = testFunc(
            colliderA.getBounds(),
            colliderB.getBounds(),
            colliderA,
            colliderB
        );
        
        if (result) {
            return new CollisionData(entityA, entityB, result.overlap, result.normal);
        }
        
        return null;
    }
    
    /**
     * Get collision test function for shape combination
     * @private
     */
    getCollisionTest(shapeA, shapeB) {
        // For now, only support rectangle-rectangle collisions
        if (shapeA === CollisionShape.RECTANGLE && shapeB === CollisionShape.RECTANGLE) {
            return this.testRectangleRectangle.bind(this);
        }
        
        if (shapeA === CollisionShape.CIRCLE && shapeB === CollisionShape.CIRCLE) {
            return this.testCircleCircle.bind(this);
        }
        
        if ((shapeA === CollisionShape.CIRCLE && shapeB === CollisionShape.RECTANGLE) ||
            (shapeA === CollisionShape.RECTANGLE && shapeB === CollisionShape.CIRCLE)) {
            return this.testCircleRectangle.bind(this);
        }
        
        return null;
    }
    
    /**
     * Test rectangle-rectangle collision
     * @private
     */
    testRectangleRectangle(boundsA, boundsB) {
        // Check for overlap
        if (boundsA.x >= boundsB.x + boundsB.width ||
            boundsB.x >= boundsA.x + boundsA.width ||
            boundsA.y >= boundsB.y + boundsB.height ||
            boundsB.y >= boundsA.y + boundsA.height) {
            return null;
        }
        
        // Calculate overlap
        const overlapX = Math.min(
            boundsA.x + boundsA.width - boundsB.x,
            boundsB.x + boundsB.width - boundsA.x
        );
        
        const overlapY = Math.min(
            boundsA.y + boundsA.height - boundsB.y,
            boundsB.y + boundsB.height - boundsA.y
        );
        
        // Determine separation normal
        let normal;
        let overlap;
        
        if (overlapX < overlapY) {
            overlap = overlapX;
            normal = new Vector2(
                boundsA.x < boundsB.x ? -1 : 1,
                0
            );
        } else {
            overlap = overlapY;
            normal = new Vector2(
                0,
                boundsA.y < boundsB.y ? -1 : 1
            );
        }
        
        return { overlap, normal };
    }
    
    /**
     * Test circle-circle collision
     * @private
     */
    testCircleCircle(boundsA, boundsB, colliderA, colliderB) {
        const centerA = new Vector2(
            boundsA.x + boundsA.width / 2,
            boundsA.y + boundsA.height / 2
        );
        
        const centerB = new Vector2(
            boundsB.x + boundsB.width / 2,
            boundsB.y + boundsB.height / 2
        );
        
        const radiusA = Math.min(boundsA.width, boundsA.height) / 2;
        const radiusB = Math.min(boundsB.width, boundsB.height) / 2;
        
        const distance = centerA.distanceTo(centerB);
        const overlap = radiusA + radiusB - distance;
        
        if (overlap <= 0) return null;
        
        const normal = centerB.subtract(centerA).normalize();
        
        return { overlap, normal };
    }
    
    /**
     * Test circle-rectangle collision
     * @private
     */
    testCircleRectangle(boundsA, boundsB, colliderA, colliderB) {
        // Determine which is circle and which is rectangle
        let circleBounds, rectBounds;
        
        if (colliderA.shape === CollisionShape.CIRCLE) {
            circleBounds = boundsA;
            rectBounds = boundsB;
        } else {
            circleBounds = boundsB;
            rectBounds = boundsA;
        }
        
        const circleCenter = new Vector2(
            circleBounds.x + circleBounds.width / 2,
            circleBounds.y + circleBounds.height / 2
        );
        
        const circleRadius = Math.min(circleBounds.width, circleBounds.height) / 2;
        
        // Find closest point on rectangle to circle center
        const closestX = Math.max(rectBounds.x, 
            Math.min(circleCenter.x, rectBounds.x + rectBounds.width));
        const closestY = Math.max(rectBounds.y, 
            Math.min(circleCenter.y, rectBounds.y + rectBounds.height));
        
        const closest = new Vector2(closestX, closestY);
        const distance = circleCenter.distanceTo(closest);
        
        if (distance >= circleRadius) return null;
        
        const overlap = circleRadius - distance;
        const normal = circleCenter.subtract(closest).normalize();
        
        // Flip normal if needed
        if (colliderA.shape === CollisionShape.RECTANGLE) {
            normal.x *= -1;
            normal.y *= -1;
        }
        
        return { overlap, normal };
    }
    
    /**
     * Resolve collisions
     * @private
     */
    resolveCollisions() {
        this.collisionPairs.forEach(collision => {
            const { entityA, entityB, colliderA, colliderB, overlap, normal } = collision;
            
            // Skip if either is a trigger
            if (colliderA.isTrigger || colliderB.isTrigger) return;
            
            const physicsA = entityA.getComponent('PhysicsBody');
            const physicsB = entityB.getComponent('PhysicsBody');
            
            // At least one entity needs physics
            if (!physicsA && !physicsB) return;
            
            // Calculate masses (infinite mass for static bodies)
            const massA = (physicsA && !physicsA.isStatic) ? physicsA.mass : Infinity;
            const massB = (physicsB && !physicsB.isStatic) ? physicsB.mass : Infinity;
            
            // Can't resolve if both are static
            if (massA === Infinity && massB === Infinity) return;
            
            // Calculate separation
            const totalMass = massA + massB;
            const separationA = (massB / totalMass) * overlap;
            const separationB = (massA / totalMass) * overlap;
            
            // Separate entities
            if (massA !== Infinity) {
                entityA.position.x -= normal.x * separationA;
                entityA.position.y -= normal.y * separationA;
            }
            
            if (massB !== Infinity) {
                entityB.position.x += normal.x * separationB;
                entityB.position.y += normal.y * separationB;
            }
            
            // Calculate relative velocity
            const velA = physicsA ? physicsA.velocity : new Vector2();
            const velB = physicsB ? physicsB.velocity : new Vector2();
            const relativeVelocity = velA.subtract(velB);
            const velocityAlongNormal = relativeVelocity.dot(normal);
            
            // Don't resolve if velocities are separating
            if (velocityAlongNormal > 0) return;
            
            // Calculate restitution (bounciness)
            const restitution = Math.min(
                colliderA.restitution || 0,
                colliderB.restitution || 0
            );
            
            // Calculate impulse scalar
            const impulseScalar = -(1 + restitution) * velocityAlongNormal / 
                (1 / massA + 1 / massB);
            
            // Apply impulse
            const impulse = normal.multiply(impulseScalar);
            
            if (physicsA && massA !== Infinity) {
                physicsA.velocity.x += impulse.x / massA;
                physicsA.velocity.y += impulse.y / massA;
            }
            
            if (physicsB && massB !== Infinity) {
                physicsB.velocity.x -= impulse.x / massB;
                physicsB.velocity.y -= impulse.y / massB;
            }
            
            // Apply friction
            this.applyFriction(collision);
        });
    }
    
    /**
     * Apply friction to collision
     * @private
     */
    applyFriction(collision) {
        const { entityA, entityB, colliderA, colliderB, normal } = collision;
        const physicsA = entityA.getComponent('PhysicsBody');
        const physicsB = entityB.getComponent('PhysicsBody');
        
        if (!physicsA || !physicsB) return;
        if (physicsA.isStatic && physicsB.isStatic) return;
        
        // Calculate relative velocity
        const relativeVelocity = physicsA.velocity.subtract(physicsB.velocity);
        
        // Calculate tangent vector
        const velocityAlongNormal = relativeVelocity.dot(normal);
        const tangentVelocity = relativeVelocity.subtract(
            normal.multiply(velocityAlongNormal)
        );
        
        if (tangentVelocity.magnitude() < 0.01) return;
        
        const tangent = tangentVelocity.normalize();
        
        // Calculate friction
        const friction = Math.sqrt(
            (colliderA.friction || 0.5) * (colliderB.friction || 0.5)
        );
        
        const massA = physicsA.isStatic ? Infinity : physicsA.mass;
        const massB = physicsB.isStatic ? Infinity : physicsB.mass;
        
        const frictionImpulse = tangent.multiply(
            -tangentVelocity.magnitude() * friction
        );
        
        // Apply friction impulse
        if (!physicsA.isStatic) {
            physicsA.velocity.x += frictionImpulse.x / massA;
            physicsA.velocity.y += frictionImpulse.y / massA;
        }
        
        if (!physicsB.isStatic) {
            physicsB.velocity.x -= frictionImpulse.x / massB;
            physicsB.velocity.y -= frictionImpulse.y / massB;
        }
    }
    
    /**
     * Send collision events
     * @private
     */
    sendCollisionEvents() {
        const currentPairs = new Set();
        
        // Check each collision
        this.collisionPairs.forEach(collision => {
            const pairKey = this.getPairKey(collision.entityA, collision.entityB);
            currentPairs.add(pairKey);
            
            // Check if this is a new collision
            if (!this.previousCollisions.has(pairKey)) {
                // Collision enter
                this.sendCollisionEvent('enter', collision);
            } else {
                // Collision stay
                this.sendCollisionEvent('stay', collision);
            }
        });
        
        // Check for collision exits
        this.previousCollisions.forEach(pairKey => {
            if (!currentPairs.has(pairKey)) {
                // Parse entities from key
                const [idA, idB] = pairKey.split(':');
                const entityA = this.engine.activeScene?.findEntity(idA);
                const entityB = this.engine.activeScene?.findEntity(idB);
                
                if (entityA && entityB) {
                    const collision = new CollisionData(
                        entityA, entityB, 0, new Vector2()
                    );
                    this.sendCollisionEvent('exit', collision);
                }
            }
        });
        
        // Update previous collisions
        this.previousCollisions = currentPairs;
    }
    
    /**
     * Send collision event
     * @private
     */
    sendCollisionEvent(type, collision) {
        const { entityA, entityB, colliderA, colliderB } = collision;
        
        // Entity events
        entityA.emit(`collision:${type}`, {
            other: entityB,
            collision
        });
        
        entityB.emit(`collision:${type}`, {
            other: entityA,
            collision
        });
        
        // Component callbacks
        if (colliderA[`onCollision${type.charAt(0).toUpperCase() + type.slice(1)}`]) {
            colliderA[`onCollision${type.charAt(0).toUpperCase() + type.slice(1)}`](
                entityB, collision
            );
        }
        
        if (colliderB[`onCollision${type.charAt(0).toUpperCase() + type.slice(1)}`]) {
            colliderB[`onCollision${type.charAt(0).toUpperCase() + type.slice(1)}`](
                entityA, collision
            );
        }
        
        // Global event
        this.engine.emit(`collision:${type}`, collision);
    }
    
    /**
     * Check if two colliders should collide based on layers
     * @private
     */
    shouldCollide(colliderA, colliderB) {
        return (colliderA.layer & colliderB.mask) !== 0 &&
               (colliderB.layer & colliderA.mask) !== 0;
    }
    
    /**
     * Get unique key for entity pair
     * @private
     */
    getPairKey(entityA, entityB) {
        return entityA.id < entityB.id
            ? `${entityA.id}:${entityB.id}`
            : `${entityB.id}:${entityA.id}`;
    }
    
    /**
     * Get entities with colliders
     * @private
     */
    getEntitiesWithColliders() {
        if (!this.engine.activeScene) return [];
        return this.engine.activeScene.getEntitiesWithComponent('Collider');
    }
    
    /**
     * Get entities with physics
     * @private
     */
    getEntitiesWithPhysics() {
        if (!this.engine.activeScene) return [];
        return this.engine.activeScene.getEntitiesWithComponent('PhysicsBody');
    }
    
    /**
     * Set gravity
     * @param {number} x - X gravity
     * @param {number} y - Y gravity
     */
    setGravity(x, y) {
        this.gravity.set(x, y);
    }
    
    /**
     * Raycast through the world
     * @param {Vector2} origin - Ray origin
     * @param {Vector2} direction - Ray direction (normalized)
     * @param {number} distance - Maximum distance
     * @param {number} [layer] - Layer mask to check
     * @returns {object|null} Hit result
     */
    raycast(origin, direction, distance, layer = -1) {
        const entities = this.getEntitiesWithColliders();
        let closestHit = null;
        let closestDistance = distance;
        
        entities.forEach(entity => {
            const collider = entity.getComponent('Collider');
            if (!collider || !collider.enabled) return;
            
            // Check layer
            if (layer !== -1 && (collider.layer & layer) === 0) return;
            
            const hit = this.raycastCollider(origin, direction, distance, collider);
            if (hit && hit.distance < closestDistance) {
                closestHit = {
                    entity,
                    collider,
                    point: hit.point,
                    normal: hit.normal,
                    distance: hit.distance
                };
                closestDistance = hit.distance;
            }
        });
        
        return closestHit;
    }
    
    /**
     * Raycast against a collider
     * @private
     */
    raycastCollider(origin, direction, maxDistance, collider) {
        const bounds = collider.getBounds();
        
        if (collider.shape === CollisionShape.RECTANGLE) {
            return this.raycastRectangle(origin, direction, maxDistance, bounds);
        }
        
        // TODO: Implement other shapes
        return null;
    }
    
    /**
     * Raycast against rectangle
     * @private
     */
    raycastRectangle(origin, direction, maxDistance, bounds) {
        // Calculate ray-box intersection
        const invDir = new Vector2(1 / direction.x, 1 / direction.y);
        
        const t1 = (bounds.x - origin.x) * invDir.x;
        const t2 = (bounds.x + bounds.width - origin.x) * invDir.x;
        const t3 = (bounds.y - origin.y) * invDir.y;
        const t4 = (bounds.y + bounds.height - origin.y) * invDir.y;
        
        const tMin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
        const tMax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
        
        if (tMax < 0 || tMin > tMax || tMin > maxDistance) {
            return null;
        }
        
        const t = tMin < 0 ? tMax : tMin;
        if (t > maxDistance) return null;
        
        const point = origin.add(direction.multiply(t));
        
        // Calculate normal
        let normal;
        const epsilon = 0.001;
        
        if (Math.abs(point.x - bounds.x) < epsilon) {
            normal = new Vector2(-1, 0);
        } else if (Math.abs(point.x - (bounds.x + bounds.width)) < epsilon) {
            normal = new Vector2(1, 0);
        } else if (Math.abs(point.y - bounds.y) < epsilon) {
            normal = new Vector2(0, -1);
        } else {
            normal = new Vector2(0, 1);
        }
        
        return {
            point,
            normal,
            distance: t
        };
    }
}