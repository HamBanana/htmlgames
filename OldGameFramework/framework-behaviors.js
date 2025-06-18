// GameFramework/framework-behaviors.js - Common gameplay behaviors

/**
 * Platformer Controller Component
 */
class PlatformerControllerComponent extends Component {
    constructor(config = {}) {
        super(config);
        this.moveSpeed = config.moveSpeed || 5;
        this.jumpPower = config.jumpPower || 10;
        this.maxJumps = config.maxJumps || 1;
        this.coyoteTime = config.coyoteTime || 0.1;
        this.jumpBufferTime = config.jumpBufferTime || 0.1;
        
        this.jumpsRemaining = this.maxJumps;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.wasGrounded = false;
        this.facingRight = true;
    }
    
    update(deltaTime) {
        const input = this.entity.getComponent(InputComponent);
        const physics = this.entity.getComponent(PhysicsComponent);
        const sprite = this.entity.getComponent(SpriteComponent);
        const animation = this.entity.getComponent(AnimationComponent);
        
        if (!input || !physics) return;
        
        // Check if grounded
        const grounded = physics.grounded;
        
        // Coyote time
        if (this.wasGrounded && !grounded) {
            this.coyoteTimer = this.coyoteTime;
        } else if (grounded) {
            this.coyoteTimer = 0;
            this.jumpsRemaining = this.maxJumps;
        }
        
        if (this.coyoteTimer > 0) {
            this.coyoteTimer -= deltaTime;
        }
        
        // Jump buffer
        if (input.isActionJustPressed('jump')) {
            this.jumpBufferTimer = this.jumpBufferTime;
        }
        
        if (this.jumpBufferTimer > 0) {
            this.jumpBufferTimer -= deltaTime;
        }
        
        // Horizontal movement
        const moveVector = input.getMovementVector();
        physics.velocity.x = moveVector.x * this.moveSpeed;
        
        // Update facing direction
        if (moveVector.x > 0) {
            this.facingRight = true;
            if (sprite) sprite.flipX = false;
        } else if (moveVector.x < 0) {
            this.facingRight = false;
            if (sprite) sprite.flipX = true;
        }
        
        // Jump
        const canJump = grounded || this.coyoteTimer > 0 || this.jumpsRemaining > 0;
        
        if (this.jumpBufferTimer > 0 && canJump) {
            this.jump(physics);
            this.jumpBufferTimer = 0;
        }
        
        // Variable jump height
        if (!input.isActionPressed('jump') && physics.velocity.y < 0) {
            physics.velocity.y *= 0.5;
        }
        
        // Update animation
        if (animation) {
            if (!grounded) {
                if (physics.velocity.y < 0) {
                    animation.play('jump');
                } else {
                    animation.play('fall');
                }
            } else if (Math.abs(moveVector.x) > 0) {
                animation.play('run');
            } else {
                animation.play('idle');
            }
        }
        
        this.wasGrounded = grounded;
    }
    
    jump(physics) {
        physics.velocity.y = -this.jumpPower;
        this.jumpsRemaining--;
        
        if (!physics.grounded && this.coyoteTimer <= 0) {
            this.jumpsRemaining--;
        }
        
        // Play jump sound
        this.game.playSound('jump');
        
        // Create jump effect
        this.game.createParticleEffect('dust', this.entity.x, this.entity.y + this.entity.height);
    }
}

/**
 * Top-Down Controller Component
 */
class TopDownControllerComponent extends Component {
    constructor(config = {}) {
        super(config);
        this.moveSpeed = config.moveSpeed || 100;
        this.dashSpeed = config.dashSpeed || 300;
        this.dashDuration = config.dashDuration || 0.2;
        this.dashCooldown = config.dashCooldown || 1;
        
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.dashDirection = new Vector2();
    }
    
    update(deltaTime) {
        const input = this.entity.getComponent(InputComponent);
        const physics = this.entity.getComponent(PhysicsComponent);
        const sprite = this.entity.getComponent(SpriteComponent);
        
        if (!input || !physics) return;
        
        // Update dash cooldown
        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= deltaTime;
        }
        
        // Handle dashing
        if (this.isDashing) {
            this.dashTimer -= deltaTime;
            
            if (this.dashTimer <= 0) {
                this.isDashing = false;
            } else {
                // Apply dash velocity
                physics.velocity = this.dashDirection.multiply(this.dashSpeed);
                return;
            }
        }
        
        // Normal movement
        const moveVector = input.getMovementVector();
        physics.velocity.x = moveVector.x * this.moveSpeed;
        physics.velocity.y = moveVector.y * this.moveSpeed;
        
        // Dash
        if (input.isActionJustPressed('action') && this.dashCooldownTimer <= 0 && 
            (moveVector.x !== 0 || moveVector.y !== 0)) {
            this.startDash(moveVector);
        }
        
        // Update sprite facing
        if (sprite && moveVector.x !== 0) {
            sprite.flipX = moveVector.x < 0;
        }
    }
    
    startDash(direction) {
        this.isDashing = true;
        this.dashTimer = this.dashDuration;
        this.dashCooldownTimer = this.dashCooldown;
        this.dashDirection = new Vector2(direction.x, direction.y).normalize();
        
        // Dash effect
        this.game.playSound('dash');
        this.game.createParticleEffect('dash', this.entity.x, this.entity.y);
    }
}

/**
 * Patrol Behavior Component
 */
class PatrolBehaviorComponent extends Component {
    constructor(config = {}) {
        super(config);
        this.patrolDistance = config.patrolDistance || 100;
        this.patrolSpeed = config.patrolSpeed || 50;
        this.waitTime = config.waitTime || 1;
        this.turnAtLedges = config.turnAtLedges !== false;
        
        this.startX = 0;
        this.direction = 1;
        this.waiting = false;
        this.waitTimer = 0;
    }
    
    initialize() {
        this.startX = this.entity.x;
    }
    
    update(deltaTime) {
        const physics = this.entity.getComponent(PhysicsComponent);
        const sprite = this.entity.getComponent(SpriteComponent);
        
        if (!physics) return;
        
        // Wait state
        if (this.waiting) {
            this.waitTimer -= deltaTime;
            physics.velocity.x = 0;
            
            if (this.waitTimer <= 0) {
                this.waiting = false;
                this.direction *= -1;
            }
            return;
        }
        
        // Move
        physics.velocity.x = this.direction * this.patrolSpeed;
        
        // Update sprite facing
        if (sprite) {
            sprite.flipX = this.direction < 0;
        }
        
        // Check patrol bounds
        const distanceFromStart = Math.abs(this.entity.x - this.startX);
        if (distanceFromStart >= this.patrolDistance) {
            this.waiting = true;
            this.waitTimer = this.waitTime;
        }
        
        // Check for ledges
        if (this.turnAtLedges && physics.grounded) {
            const checkX = this.entity.x + (this.direction * this.entity.width);
            const checkY = this.entity.y + this.entity.height + 5;
            
            // Simple ledge detection (would need proper collision system integration)
            const hasGround = this.checkGroundAt(checkX, checkY);
            if (!hasGround) {
                this.waiting = true;
                this.waitTimer = this.waitTime;
            }
        }
    }
    
    checkGroundAt(x, y) {
        // This would check collision system for ground
        // For now, just return true
        return true;
    }
}

/**
 * Follow Behavior Component
 */
class FollowBehaviorComponent extends Component {
    constructor(config = {}) {
        super(config);
        this.target = config.target;
        this.followDistance = config.followDistance || 200;
        this.minDistance = config.minDistance || 50;
        this.followSpeed = config.followSpeed || 80;
        this.smoothing = config.smoothing || 0.1;
    }
    
    update(deltaTime) {
        if (!this.target) {
            // Find player if no target
            const players = this.game.getEntitiesByType('player');
            if (players.length > 0) {
                this.target = players[0];
            }
            return;
        }
        
        const physics = this.entity.getComponent(PhysicsComponent);
        const sprite = this.entity.getComponent(SpriteComponent);
        
        if (!physics) return;
        
        // Calculate distance to target
        const distance = this.entity.position.distanceTo(this.target.position);
        
        if (distance > this.minDistance && distance < this.followDistance) {
            // Move towards target
            const direction = this.target.position.subtract(this.entity.position).normalize();
            
            // Smooth movement
            const targetVelocity = direction.multiply(this.followSpeed);
            physics.velocity.x += (targetVelocity.x - physics.velocity.x) * this.smoothing;
            physics.velocity.y += (targetVelocity.y - physics.velocity.y) * this.smoothing;
            
            // Update sprite facing
            if (sprite && direction.x !== 0) {
                sprite.flipX = direction.x < 0;
            }
        } else {
            // Stop when close enough
            physics.velocity.x *= 0.9;
            physics.velocity.y *= 0.9;
        }
    }
}

/**
 * Shooter Behavior Component
 */
class ShooterBehaviorComponent extends Component {
    constructor(config = {}) {
        super(config);
        this.fireRate = config.fireRate || 1; // shots per second
        this.projectileSpeed = config.projectileSpeed || 200;
        this.projectileDamage = config.projectileDamage || 10;
        this.projectileSprite = config.projectileSprite || 'bullet';
        this.shootRange = config.shootRange || 300;
        this.predictiveAiming = config.predictiveAiming || false;
        
        this.shootCooldown = 0;
    }
    
    update(deltaTime) {
        this.shootCooldown -= deltaTime;
        
        // Find target
        const target = this.findTarget();
        if (!target) return;
        
        const distance = this.entity.position.distanceTo(target.position);
        if (distance > this.shootRange) return;
        
        // Shoot if cooldown is ready
        if (this.shootCooldown <= 0) {
            this.shoot(target);
            this.shootCooldown = 1 / this.fireRate;
        }
    }
    
    findTarget() {
        // Find nearest player
        const players = this.game.getEntitiesByType('player');
        let nearest = null;
        let nearestDistance = this.shootRange;
        
        players.forEach(player => {
            const distance = this.entity.position.distanceTo(player.position);
            if (distance < nearestDistance) {
                nearest = player;
                nearestDistance = distance;
            }
        });
        
        return nearest;
    }
    
    shoot(target) {
        let aimPosition = target.position.copy();
        
        // Predictive aiming
        if (this.predictiveAiming) {
            const targetPhysics = target.getComponent(PhysicsComponent);
            if (targetPhysics) {
                const timeToHit = this.entity.position.distanceTo(target.position) / this.projectileSpeed;
                aimPosition.x += targetPhysics.velocity.x * timeToHit;
                aimPosition.y += targetPhysics.velocity.y * timeToHit;
            }
        }
        
        // Calculate direction
        const direction = aimPosition.subtract(this.entity.position).normalize();
        
        // Create projectile
        const projectile = new ProjectilePrefab({
            x: this.entity.x + this.entity.width / 2,
            y: this.entity.y + this.entity.height / 2,
            vx: direction.x * this.projectileSpeed,
            vy: direction.y * this.projectileSpeed,
            damage: this.projectileDamage,
            sprite: this.projectileSprite,
            owner: this.entity
        });
        
        this.game.addEntity(projectile);
        
        // Play shoot sound
        this.game.playSound('shoot');
    }
}

/**
 * Inventory Component
 */
class InventoryComponent extends Component {
    constructor(config = {}) {
        super(config);
        this.maxSlots = config.maxSlots || 20;
        this.items = new Map();
    }
    
    addItem(itemId, quantity = 1) {
        const current = this.items.get(itemId) || 0;
        const newQuantity = current + quantity;
        
        if (this.items.size < this.maxSlots || this.items.has(itemId)) {
            this.items.set(itemId, newQuantity);
            
            this.game.events.emit('inventory:item-added', {
                entity: this.entity,
                itemId,
                quantity,
                total: newQuantity
            });
            
            return true;
        }
        
        return false; // Inventory full
    }
    
    removeItem(itemId, quantity = 1) {
        const current = this.items.get(itemId) || 0;
        
        if (current >= quantity) {
            const newQuantity = current - quantity;
            
            if (newQuantity === 0) {
                this.items.delete(itemId);
            } else {
                this.items.set(itemId, newQuantity);
            }
            
            this.game.events.emit('inventory:item-removed', {
                entity: this.entity,
                itemId,
                quantity,
                remaining: newQuantity
            });
            
            return true;
        }
        
        return false; // Not enough items
    }
    
    hasItem(itemId, quantity = 1) {
        return (this.items.get(itemId) || 0) >= quantity;
    }
    
    getItemCount(itemId) {
        return this.items.get(itemId) || 0;
    }
    
    getAllItems() {
        return Array.from(this.items.entries());
    }
    
    clear() {
        this.items.clear();
    }
}

/**
 * Interactable Component
 */
class InteractableComponent extends Component {
    constructor(config = {}) {
        super(config);
        this.interactionRange = config.interactionRange || 50;
        this.interactionKey = config.interactionKey || 'action';
        this.onInteract = config.onInteract;
        this.cooldown = config.cooldown || 0;
        this.requiresFacing = config.requiresFacing || false;
        
        this.cooldownTimer = 0;
        this.inRange = false;
        this.canInteract = false;
    }
    
    update(deltaTime) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= deltaTime;
        }
        
        // Find nearby players
        const players = this.game.getEntitiesByType('player');
        let nearestPlayer = null;
        let nearestDistance = this.interactionRange;
        
        players.forEach(player => {
            const distance = this.entity.position.distanceTo(player.position);
            if (distance < nearestDistance) {
                nearestPlayer = player;
                nearestDistance = distance;
            }
        });
        
        this.inRange = nearestPlayer !== null;
        this.canInteract = this.inRange && this.cooldownTimer <= 0;
        
        if (this.canInteract && nearestPlayer) {
            const input = nearestPlayer.getComponent(InputComponent);
            
            if (input && input.isActionJustPressed(this.interactionKey)) {
                this.interact(nearestPlayer);
            }
        }
    }
    
    interact(interactor) {
        if (this.cooldownTimer > 0) return;
        
        this.cooldownTimer = this.cooldown;
        
        if (this.onInteract) {
            this.onInteract(this.entity, interactor);
        }
        
        this.game.events.emit('entity:interacted', {
            entity: this.entity,
            interactor: interactor
        });
    }
    
    render(context) {
        // Show interaction prompt when in range
        if (this.canInteract) {
            context.save();
            context.fillStyle = 'white';
            context.font = '12px Arial';
            context.textAlign = 'center';
            context.fillText('E', 0, -this.entity.height / 2 - 10);
            context.restore();
        }
    }
}

// Register behaviors
GameFramework.Behaviors = {
    PlatformerController: PlatformerControllerComponent,
    TopDownController: TopDownControllerComponent,
    PatrolBehavior: PatrolBehaviorComponent,
    FollowBehavior: FollowBehaviorComponent,
    ShooterBehavior: ShooterBehaviorComponent,
    Inventory: InventoryComponent,
    Interactable: InteractableComponent
};