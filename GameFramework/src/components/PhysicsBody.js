// GameFramework/src/components/PhysicsBody.js
import { Component } from '../core/Component.js';
import { Vector2 } from '../core/Vector2.js';

/**
 * PhysicsBody - Physics simulation component
 * @class PhysicsBody
 */
export class PhysicsBody extends Component {
    constructor(config = {}) {
        super(config);
        
        // Physics properties
        this.velocity = new Vector2(config.vx || 0, config.vy || 0);
        this.acceleration = new Vector2();
        this.force = new Vector2();
        
        // Physical properties
        this.mass = config.mass || 1;
        this.inverseMass = this.mass > 0 ? 1 / this.mass : 0;
        this.isStatic = config.isStatic || false;
        this.isTrigger = config.isTrigger || false;
        
        // Movement constraints
        this.maxSpeed = config.maxSpeed || Infinity;
        this.linearDrag = config.linearDrag || 0;
        this.angularVelocity = config.angularVelocity || 0;
        this.angularDrag = config.angularDrag || 0;
        this.maxAngularSpeed = config.maxAngularSpeed || Infinity;
        
        // Gravity
        this.useGravity = config.useGravity !== false;
        this.gravityScale = config.gravityScale || 1;
        
        // Collision response
        this.restitution = config.restitution || 0; // Bounciness (0-1)
        this.friction = config.friction || 0.5; // Friction coefficient
        
        // State tracking
        this.isGrounded = false;
        this.isTouchingLeft = false;
        this.isTouchingRight = false;
        this.isTouchingCeiling = false;
        this.wasGrounded = false;
        
        // Movement flags
        this.freezePositionX = config.freezePositionX || false;
        this.freezePositionY = config.freezePositionY || false;
        this.freezeRotation = config.freezeRotation || false;
        
        // Collision filtering
        this.collisionGroup = config.collisionGroup || 0;
        this.collisionMask = config.collisionMask || -1;
    }
    
    /**
     * Apply a force to the body
     * @param {Vector2|number} forceX - Force vector or X component
     * @param {number} [forceY] - Y component if forceX is a number
     */
    addForce(forceX, forceY) {
        if (this.isStatic) return;
        
        if (forceX instanceof Vector2) {
            this.force.x += forceX.x;
            this.force.y += forceX.y;
        } else {
            this.force.x += forceX;
            this.force.y += forceY || 0;
        }
    }
    
    /**
     * Apply an impulse (instant velocity change)
     * @param {Vector2|number} impulseX - Impulse vector or X component
     * @param {number} [impulseY] - Y component if impulseX is a number
     */
    addImpulse(impulseX, impulseY) {
        if (this.isStatic) return;
        
        if (impulseX instanceof Vector2) {
            this.velocity.x += impulseX.x * this.inverseMass;
            this.velocity.y += impulseX.y * this.inverseMass;
        } else {
            this.velocity.x += impulseX * this.inverseMass;
            this.velocity.y += (impulseY || 0) * this.inverseMass;
        }
    }
    
    /**
     * Set velocity directly
     * @param {number} x - X velocity
     * @param {number} y - Y velocity
     */
    setVelocity(x, y) {
        if (this.isStatic) return;
        
        this.velocity.x = x;
        this.velocity.y = y;
    }
    
    /**
     * Add torque (rotational force)
     * @param {number} torque - Torque amount
     */
    addTorque(torque) {
        if (this.isStatic || this.freezeRotation) return;
        
        // Simplified - assumes unit moment of inertia
        this.angularVelocity += torque * this.inverseMass;
    }
    
    /**
     * Get kinetic energy
     * @returns {number}
     */
    getKineticEnergy() {
        const speed = this.velocity.magnitude();
        return 0.5 * this.mass * speed * speed;
    }
    
    /**
     * Get momentum
     * @returns {Vector2}
     */
    getMomentum() {
        return this.velocity.multiply(this.mass);
    }
    
    /**
     * Check if body is moving
     * @param {number} threshold - Speed threshold
     * @returns {boolean}
     */
    isMoving(threshold = 0.01) {
        return this.velocity.magnitude() > threshold;
    }
    
    /**
     * Make body static
     */
    makeStatic() {
        this.isStatic = true;
        this.inverseMass = 0;
        this.velocity.set(0, 0);
        this.angularVelocity = 0;
    }
    
    /**
     * Make body dynamic
     * @param {number} mass - Body mass
     */
    makeDynamic(mass = 1) {
        this.isStatic = false;
        this.mass = mass;
        this.inverseMass = mass > 0 ? 1 / mass : 0;
    }
    
    /**
     * Called before physics update
     */
    prePhysicsUpdate() {
        // Store previous grounded state
        this.wasGrounded = this.isGrounded;
        
        // Reset collision flags (will be set by collision system)
        this.isGrounded = false;
        this.isTouchingLeft = false;
        this.isTouchingRight = false;
        this.isTouchingCeiling = false;
    }
    
    /**
     * Called after physics update
     */
    postPhysicsUpdate() {
        // Clear forces
        this.force.set(0, 0);
        this.acceleration.set(0, 0);
        
        // Emit state change events
        if (this.isGrounded && !this.wasGrounded) {
            this.entity.emit('physics:landed', {
                velocity: this.velocity.copy()
            });
        } else if (!this.isGrounded && this.wasGrounded) {
            this.entity.emit('physics:airborne', {
                velocity: this.velocity.copy()
            });
        }
    }
    
    /**
     * Handle collision with another body
     * @param {PhysicsBody} other - Other physics body
     * @param {Vector2} normal - Collision normal
     * @param {number} depth - Penetration depth
     */
    resolveCollision(other, normal, depth) {
        // Update collision flags based on normal
        if (normal.y < -0.7) {
            this.isGrounded = true;
        } else if (normal.y > 0.7) {
            this.isTouchingCeiling = true;
        } else if (normal.x < -0.7) {
            this.isTouchingRight = true;
        } else if (normal.x > 0.7) {
            this.isTouchingLeft = true;
        }
    }
    
    /**
     * Debug render
     * @param {CanvasRenderingContext2D} context - Canvas context
     */
    debugRender(context) {
        const pos = this.entity.position;
        
        // Velocity vector
        if (this.velocity.magnitude() > 0) {
            context.strokeStyle = '#00ff00';
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(this.velocity.x, this.velocity.y);
            context.stroke();
        }
        
        // Force vector
        if (this.force.magnitude() > 0) {
            context.strokeStyle = '#ff0000';
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(this.force.x * 0.1, this.force.y * 0.1);
            context.stroke();
        }
        
        // Grounded indicator
        if (this.isGrounded) {
            context.fillStyle = '#00ff00';
            context.fillRect(-5, 20, 10, 3);
        }
        
        // Mass text
        context.fillStyle = '#ffffff';
        context.font = '10px Arial';
        context.textAlign = 'center';
        context.fillText(`m: ${this.mass.toFixed(1)}`, 0, -25);
    }
}