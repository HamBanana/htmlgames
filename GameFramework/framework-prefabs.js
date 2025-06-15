// GameFramework/framework-prefabs.js - Common prefab entities

/**
 * Coin Prefab - Collectible item
 */
class CoinPrefab extends BaseEntity {
    constructor(config = {}) {
        super({
            type: 'coin',
            width: 16,
            height: 16,
            ...config
        });
        
        // Sprite
        this.addComponent(new SpriteComponent(config.sprite || 'coin'));
        
        // Animation
        this.addComponent(new AnimationComponent({
            autoLoadAnimations: true
        }));
        
        // Collision
        this.addComponent(new CollisionComponent({
            isTrigger: true,
            width: 16,
            height: 16
        }));
        
        // Collectible behavior
        this.value = config.value || 1;
        this.collected = false;
        
        // Floating animation
        this.floatOffset = Math.random() * Math.PI * 2;
        this.floatSpeed = config.floatSpeed || 2;
        this.floatAmount = config.floatAmount || 5;
        this.baseY = this.y;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (!this.collected) {
            // Floating animation
            this.floatOffset += deltaTime * this.floatSpeed;
            this.y = this.baseY + Math.sin(this.floatOffset) * this.floatAmount;
        }
    }
    
    collect(collector) {
        if (this.collected) return;
        
        this.collected = true;
        
        // Play collection animation
        const animation = this.getComponent(AnimationComponent);
        if (animation) {
            animation.play('collect');
        }
        
        // Play sound
        this.game.playSound('coin');
        
        // Create particle effect
        this.game.createParticleEffect('sparkle', this.x, this.y);
        
        // Emit event
        this.game.events.emit('coin:collected', {
            coin: this,
            collector: collector,
            value: this.value
        });
        
        // Remove after a delay
        setTimeout(() => this.destroy(), 500);
    }
}

/**
 * Moving Platform Prefab
 */
class MovingPlatformPrefab extends BaseEntity {
    constructor(config = {}) {
        super({
            type: 'platform',
            width: config.width || 96,
            height: config.height || 16,
            ...config
        });
        
        // Sprite or color
        if (config.sprite) {
            this.addComponent(new SpriteComponent(config.sprite));
        }
        
        // Collision
        this.addComponent(new ColliderComponent({
            static: true,
            width: this.width,
            height: this.height
        }));
        
        // Movement pattern
        this.moveType = config.moveType || 'horizontal'; // horizontal, vertical, circular, path
        this.moveSpeed = config.moveSpeed || 50;
        this.moveDistance = config.moveDistance || 100;
        this.startPosition = this.position.copy();
        this.moveTime = 0;
        this.waitTime = config.waitTime || 0;
        this.waiting = false;
        this.waitTimer = 0;
        
        // Path following
        if (config.path) {
            this.path = config.path.map(p => new Vector2(p.x, p.y));
            this.pathIndex = 0;
            this.pathDirection = 1;
        }
        
        // Riders (entities standing on the platform)
        this.riders = new Set();
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.waiting) {
            this.waitTimer -= deltaTime;
            if (this.waitTimer <= 0) {
                this.waiting = false;
            }
            return;
        }
        
        const oldX = this.x;
        const oldY = this.y;
        
        switch (this.moveType) {
            case 'horizontal':
                this.updateHorizontalMovement(deltaTime);
                break;
            case 'vertical':
                this.updateVerticalMovement(deltaTime);
                break;
            case 'circular':
                this.updateCircularMovement(deltaTime);
                break;
            case 'path':
                this.updatePathMovement(deltaTime);
                break;
        }
        
        // Move riders with platform
        const deltaX = this.x - oldX;
        const deltaY = this.y - oldY;
        
        this.riders.forEach(rider => {
            rider.x += deltaX;
            rider.y += deltaY;
        });
    }
    
    updateHorizontalMovement(deltaTime) {
        this.moveTime += deltaTime;
        const progress = Math.sin(this.moveTime * this.moveSpeed * 0.01);
        this.x = this.startPosition.x + progress * this.moveDistance;
        
        // Check for wait at ends
        if (this.waitTime > 0 && Math.abs(progress) > 0.99) {
            this.waiting = true;
            this.waitTimer = this.waitTime;
        }
    }
    
    updateVerticalMovement(deltaTime) {
        this.moveTime += deltaTime;
        const progress = Math.sin(this.moveTime * this.moveSpeed * 0.01);
        this.y = this.startPosition.y + progress * this.moveDistance;
        
        if (this.waitTime > 0 && Math.abs(progress) > 0.99) {
            this.waiting = true;
            this.waitTimer = this.waitTime;
        }
    }
    
    updateCircularMovement(deltaTime) {
        this.moveTime += deltaTime * this.moveSpeed * 0.01;
        this.x = this.startPosition.x + Math.cos(this.moveTime) * this.moveDistance;
        this.y = this.startPosition.y + Math.sin(this.moveTime) * this.moveDistance;
    }
    
    updatePathMovement(deltaTime) {
        if (!this.path || this.path.length < 2) return;
        
        const target = this.path[this.pathIndex];
        const distance = this.position.distanceTo(target);
        
        if (distance < 5) {
            // Reached waypoint
            this.pathIndex += this.pathDirection;
            
            if (this.pathIndex >= this.path.length) {
                this.pathIndex = this.path.length - 2;
                this.pathDirection = -1;
                this.waiting = true;
                this.waitTimer = this.waitTime;
            } else if (this.pathIndex < 0) {
                this.pathIndex = 1;
                this.pathDirection = 1;
                this.waiting = true;
                this.waitTimer = this.waitTime;
            }
        } else {
            // Move towards target
            const direction = target.subtract(this.position).normalize();
            this.x += direction.x * this.moveSpeed * deltaTime;
            this.y += direction.y * this.moveSpeed * deltaTime;
        }
    }
    
    addRider(entity) {
        this.riders.add(entity);
    }
    
    removeRider(entity) {
        this.riders.delete(entity);
    }
}

/**
 * Checkpoint Prefab
 */
class CheckpointPrefab extends BaseEntity {
    constructor(config = {}) {
        super({
            type: 'checkpoint',
            width: 32,
            height: 64,
            ...config
        });
        
        // Sprite
        this.addComponent(new SpriteComponent(config.sprite || 'checkpoint'));
        
        // Animation
        this.addComponent(new AnimationComponent({
            autoLoadAnimations: true
        }));
        
        // Collision
        this.addComponent(new CollisionComponent({
            isTrigger: true,
            width: 32,
            height: 64
        }));
        
        this.activated = false;
        this.respawnOffset = new Vector2(0, -32);
    }
    
    activate(player) {
        if (this.activated) return;
        
        this.activated = true;
        
        // Play activation animation
        const animation = this.getComponent(AnimationComponent);
        if (animation) {
            animation.play('activate');
        }
        
        // Play sound
        this.game.playSound('checkpoint');
        
        // Save checkpoint
        this.game.events.emit('checkpoint:activated', {
            checkpoint: this,
            player: player,
            respawnPosition: this.position.add(this.respawnOffset)
        });
    }
}

/**
 * Projectile Prefab
 */
class ProjectilePrefab extends BaseEntity {
    constructor(config = {}) {
        super({
            type: 'projectile',
            width: config.size?.width || 8,
            height: config.size?.height || 8,
            ...config
        });
        
        // Sprite
        if (config.sprite) {
            this.addComponent(new SpriteComponent(config.sprite));
        }
        
        // Physics
        this.addComponent(new PhysicsComponent({
            vx: config.vx || 0,
            vy: config.vy || 0,
            useGravity: config.useGravity || false,
            drag: 0
        }));
        
        // Collision
        this.addComponent(new CollisionComponent({
            width: this.width,
            height: this.height,
            layer: 'projectile'
        }));
        
        this.damage = config.damage || 10;
        this.owner = config.owner;
        this.lifetime = config.lifetime || 5;
        this.piercing = config.piercing || false;
        this.hitEntities = new Set();
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Lifetime
        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) {
            this.destroy();
        }
        
        // Rotation based on velocity
        const physics = this.getComponent(PhysicsComponent);
        if (physics) {
            this.rotation = Math.atan2(physics.velocity.y, physics.velocity.x);
        }
    }
    
    hit(target) {
        if (this.hitEntities.has(target)) return;
        
        this.hitEntities.add(target);
        
        // Deal damage
        const health = target.getComponent(HealthComponent);
        if (health) {
            health.takeDamage(this.damage);
        }
        
        // Create hit effect
        this.game.createParticleEffect('hit', this.x, this.y);
        
        // Destroy if not piercing
        if (!this.piercing) {
            this.destroy();
        }
    }
}

/**
 * Door Prefab
 */
class DoorPrefab extends BaseEntity {
    constructor(config = {}) {
        super({
            type: 'door',
            width: 32,
            height: 64,
            ...config
        });
        
        // Sprite
        this.addComponent(new SpriteComponent(config.sprite || 'door'));
        
        // Animation
        this.addComponent(new AnimationComponent({
            autoLoadAnimations: true
        }));
        
        // Collision (solid when closed)
        this.addComponent(new ColliderComponent({
            static: true,
            width: 32,
            height: 64
        }));
        
        this.isOpen = config.isOpen || false;
        this.requiresKey = config.requiresKey !== false;
        this.keyType = config.keyType || 'key';
        this.autoClose = config.autoClose || false;
        this.autoCloseDelay = config.autoCloseDelay || 3;
        
        if (this.isOpen) {
            this.open();
        }
    }
    
    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        
        // Play animation
        const animation = this.getComponent(AnimationComponent);
        if (animation) {
            animation.play('open');
        }
        
        // Remove collision
        this.removeComponent(ColliderComponent);
        
        // Play sound
        this.game.playSound('door_open');
        
        // Auto close timer
        if (this.autoClose) {
            setTimeout(() => this.close(), this.autoCloseDelay * 1000);
        }
        
        this.game.events.emit('door:opened', this);
    }
    
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        
        // Play animation
        const animation = this.getComponent(AnimationComponent);
        if (animation) {
            animation.play('close');
        }
        
        // Add collision back
        this.addComponent(new ColliderComponent({
            static: true,
            width: 32,
            height: 64
        }));
        
        // Play sound
        this.game.playSound('door_close');
        
        this.game.events.emit('door:closed', this);
    }
    
    tryOpen(entity) {
        if (this.isOpen) return true;
        
        if (this.requiresKey) {
            // Check if entity has key
            const inventory = entity.getComponent(InventoryComponent);
            if (inventory && inventory.hasItem(this.keyType)) {
                inventory.removeItem(this.keyType);
                this.open();
                return true;
            }
            
            // Show message
            this.game.events.emit('message:show', {
                text: 'You need a key to open this door',
                duration: 2
            });
            
            return false;
        }
        
        this.open();
        return true;
    }
}

/**
 * Spawner Prefab
 */
class SpawnerPrefab extends BaseEntity {
    constructor(config = {}) {
        super({
            type: 'spawner',
            visible: config.visible || false,
            ...config
        });
        
        this.spawnType = config.spawnType || 'enemy';
        this.spawnConfig = config.spawnConfig || {};
        this.spawnInterval = config.spawnInterval || 3;
        this.maxSpawns = config.maxSpawns || -1; // -1 = infinite
        this.spawnRadius = config.spawnRadius || 0;
        this.activeSpawns = new Set();
        this.totalSpawns = 0;
        this.spawnTimer = 0;
        this.active = config.active !== false;
        
        // Optional sprite
        if (config.sprite) {
            this.visible = true;
            this.addComponent(new SpriteComponent(config.sprite));
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (!this.active) return;
        if (this.maxSpawns >= 0 && this.totalSpawns >= this.maxSpawns) return;
        
        // Update spawn timer
        this.spawnTimer += deltaTime;
        
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawn();
        }
        
        // Clean up destroyed spawns
        this.activeSpawns = new Set([...this.activeSpawns].filter(spawn => !spawn.destroyed));
    }
    
    spawn() {
        // Calculate spawn position
        let spawnX = this.x;
        let spawnY = this.y;
        
        if (this.spawnRadius > 0) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.spawnRadius;
            spawnX += Math.cos(angle) * distance;
            spawnY += Math.sin(angle) * distance;
        }
        
        // Create spawn
        const config = {
            ...this.spawnConfig,
            x: spawnX,
            y: spawnY
        };
        
        let spawn;
        switch (this.spawnType) {
            case 'enemy':
                spawn = this.game.createEnemy(
                    config.sprite || 'enemy',
                    spawnX,
                    spawnY,
                    config
                );
                break;
            case 'projectile':
                spawn = new ProjectilePrefab(config);
                this.game.addEntity(spawn);
                break;
            default:
                spawn = this.game.createEntity(this.spawnType, config);
        }
        
        if (spawn) {
            this.activeSpawns.add(spawn);
            this.totalSpawns++;
            
            // Spawn effect
            this.game.createParticleEffect('spawn', spawnX, spawnY);
            
            this.game.events.emit('entity:spawned', {
                spawner: this,
                entity: spawn
            });
        }
    }
    
    activate() {
        this.active = true;
    }
    
    deactivate() {
        this.active = false;
    }
}

// Register prefabs
GameFramework.Prefabs = {
    Coin: CoinPrefab,
    MovingPlatform: MovingPlatformPrefab,
    Checkpoint: CheckpointPrefab,
    Projectile: ProjectilePrefab,
    Door: DoorPrefab,
    Spawner: SpawnerPrefab
};