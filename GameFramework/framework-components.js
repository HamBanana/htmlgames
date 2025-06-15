// GameFramework/framework-components.js - Game components (clean, no redeclarations)

/**
 * Transform Component - Position, rotation, scale
 */
if (typeof window !== 'undefined' && !window.TransformComponent) {
    class TransformComponent extends Component {
        constructor(config = {}) {
            super(config);
            this.localPosition = new Vector2(config.x || 0, config.y || 0);
            this.localRotation = config.rotation || 0;
            this.localScale = new Vector2(config.scaleX || 1, config.scaleY || 1);
            this.parent = null;
        }
        
        get worldPosition() {
            if (!this.parent) return this.localPosition.copy();
            // Calculate world position based on parent
            return this.parent.worldPosition.add(this.localPosition);
        }
        
        get worldRotation() {
            if (!this.parent) return this.localRotation;
            return this.parent.worldRotation + this.localRotation;
        }
    }
    
    window.TransformComponent = TransformComponent;
}

/**
 * Physics Component - Velocity, forces, gravity
 */
if (typeof window !== 'undefined' && !window.PhysicsComponent) {
    class PhysicsComponent extends Component {
        constructor(config = {}) {
            super(config);
            this.velocity = new Vector2(config.vx || 0, config.vy || 0);
            this.acceleration = new Vector2(0, 0);
            this.forces = [];
            this.mass = config.mass || 1;
            this.drag = config.drag || 0;
            this.useGravity = config.useGravity !== false;
            this.gravityScale = config.gravityScale || 1;
            this.grounded = false;
            this.maxVelocity = new Vector2(
                config.maxVelocityX || 20,
                config.maxVelocityY || 20
            );
        }
        
        addForce(force) {
            this.forces.push(force);
        }
        
        setVelocity(x, y) {
            this.velocity.set(x, y);
        }
    }
    
    window.PhysicsComponent = PhysicsComponent;
}

/**
 * Collision Component - Collision detection
 */
if (typeof window !== 'undefined' && !window.CollisionComponent) {
    class CollisionComponent extends Component {
        constructor(config = {}) {
            super(config);
            this.bounds = {
                offset: new Vector2(config.offsetX || 0, config.offsetY || 0),
                size: new Vector2(config.width || 32, config.height || 32)
            };
            this.isTrigger = config.isTrigger || false;
            this.layer = config.layer || 'default';
            this.mask = config.mask || ['default'];
        }
        
        getBounds() {
            return {
                x: this.entity.x + this.bounds.offset.x,
                y: this.entity.y + this.bounds.offset.y,
                width: this.bounds.size.x,
                height: this.bounds.size.y
            };
        }
    }
    
    window.CollisionComponent = CollisionComponent;
}

/**
 * Sprite Component - Sprite rendering
 */
if (typeof window !== 'undefined' && !window.SpriteComponent) {
    class SpriteComponent extends Component {
        constructor(spriteName, config = {}) {
            super(config);
            this.spriteName = spriteName;
            this.currentFrame = config.frame || 0;
            this.flipX = config.flipX || false;
            this.flipY = config.flipY || false;
            this.opacity = config.opacity !== undefined ? config.opacity : 1;
            this.offset = new Vector2(config.offsetX || 0, config.offsetY || 0);
        }
        
        setFrame(frameIndex) {
            this.currentFrame = frameIndex;
        }
        
        getFrameCount() {
            const renderer = this.game?.getSystem('renderer');
            if (!renderer) return 1;
            
            const spriteData = renderer.getSpriteData(this.spriteName);
            return spriteData ? spriteData.frames.size : 1;
        }
        
        render(context) {
            const renderer = this.game?.getSystem('renderer');
            if (!renderer) return;
            
            context.save();
            
            // Apply opacity
            if (this.opacity < 1) {
                context.globalAlpha = this.opacity;
            }
            
            // Apply flipping
            if (this.flipX || this.flipY) {
                const scaleX = this.flipX ? -1 : 1;
                const scaleY = this.flipY ? -1 : 1;
                context.scale(scaleX, scaleY);
                
                // Adjust position for flipping
                const x = this.flipX ? -this.entity.width - this.offset.x : this.offset.x;
                const y = this.flipY ? -this.entity.height - this.offset.y : this.offset.y;
                
                renderer.drawSprite(
                    this.spriteName,
                    x, y,
                    this.entity.width,
                    this.entity.height,
                    this.currentFrame
                );
            } else {
                renderer.drawSprite(
                    this.spriteName,
                    this.offset.x, this.offset.y,
                    this.entity.width,
                    this.entity.height,
                    this.currentFrame
                );
            }
            
            context.restore();
        }
    }
    
    window.SpriteComponent = SpriteComponent;
}

/**
 * Animation Component - Sprite animation
 */
if (typeof window !== 'undefined' && !window.AnimationComponent) {
    class AnimationComponent extends Component {
        constructor(config = {}) {
            super(config);
            this.animations = new Map();
            this.currentAnimation = null;
            this.currentFrame = 0;
            this.frameTime = 0;
            this.playing = false;
            this.loop = true;
            this.speed = config.speed || 1;
            this.onAnimationComplete = config.onAnimationComplete;
            this.autoLoadAnimations = config.autoLoadAnimations !== false;
            
            // Register manual animations from config
            if (config.animations) {
                Object.entries(config.animations).forEach(([name, anim]) => {
                    this.addAnimation(name, anim);
                });
            }
        }
        
        initialize() {
            if (this.autoLoadAnimations) {
                this.loadAnimationsFromSprite();
            }
        }
        
        loadAnimationsFromSprite() {
            const sprite = this.entity.getComponent(SpriteComponent);
            if (!sprite) return;
            
            const renderer = this.game?.getSystem('renderer');
            if (!renderer) return;
            
            const spriteData = renderer.getSpriteData(sprite.spriteName);
            if (!spriteData) return;
            
            // Load animations from Aseprite data
            spriteData.animations.forEach((animData, name) => {
                const frames = [];
                const frameDurations = [];
                
                for (let i = animData.from; i <= animData.to; i++) {
                    frames.push(i);
                    
                    // Get frame duration from sprite data
                    const frameData = spriteData.frames.get(i.toString());
                    frameDurations.push(frameData ? frameData.duration : 100);
                }
                
                this.addAnimation(name, {
                    frames: frames,
                    frameDurations: frameDurations,
                    loop: animData.repeat !== 0,
                    direction: animData.direction
                });
            });
            
            console.log(`Loaded ${spriteData.animations.size} animations for sprite ${sprite.spriteName}`);
        }
        
        addAnimation(name, config) {
            this.animations.set(name, {
                frames: config.frames || [0],
                frameDurations: config.frameDurations || [config.frameDuration || 100],
                loop: config.loop !== false,
                direction: config.direction || 'forward',
                onComplete: config.onComplete
            });
        }
        
        play(name, restart = false) {
            if (this.currentAnimation === name && !restart && this.playing) return;
            
            const animation = this.animations.get(name);
            if (!animation) {
                console.warn(`Animation '${name}' not found`);
                return;
            }
            
            this.currentAnimation = name;
            this.currentFrame = 0;
            this.frameTime = 0;
            this.playing = true;
            this.loop = animation.loop;
            
            this.updateSpriteFrame();
        }
        
        stop() {
            this.playing = false;
        }
        
        pause() {
            this.playing = false;
        }
        
        resume() {
            this.playing = true;
        }
        
        update(deltaTime) {
            if (!this.playing || !this.currentAnimation) return;
            
            const animation = this.animations.get(this.currentAnimation);
            if (!animation) return;
            
            const frameDurationIndex = Math.min(this.currentFrame, animation.frameDurations.length - 1);
            const frameDuration = animation.frameDurations[frameDurationIndex];
            
            this.frameTime += deltaTime * 1000 * this.speed;
            
            if (this.frameTime >= frameDuration) {
                this.frameTime = 0;
                this.advanceFrame(animation);
            }
        }
        
        advanceFrame(animation) {
            if (animation.direction === 'reverse') {
                this.currentFrame--;
                if (this.currentFrame < 0) {
                    if (animation.loop) {
                        this.currentFrame = animation.frames.length - 1;
                    } else {
                        this.currentFrame = 0;
                        this.playing = false;
                        this.onAnimationEnd(animation);
                    }
                }
            } else {
                this.currentFrame++;
                if (this.currentFrame >= animation.frames.length) {
                    if (animation.loop) {
                        this.currentFrame = 0;
                    } else {
                        this.currentFrame = animation.frames.length - 1;
                        this.playing = false;
                        this.onAnimationEnd(animation);
                    }
                }
            }
            
            this.updateSpriteFrame();
        }
        
        updateSpriteFrame() {
            const sprite = this.entity.getComponent(SpriteComponent);
            if (!sprite) return;
            
            const animation = this.animations.get(this.currentAnimation);
            if (!animation) return;
            
            const frameIndex = animation.frames[this.currentFrame];
            sprite.setFrame(frameIndex);
        }
        
        onAnimationEnd(animation) {
            if (animation.onComplete) {
                animation.onComplete();
            }
            
            if (this.onAnimationComplete) {
                this.onAnimationComplete(this.currentAnimation);
            }
            
            this.game?.events.emit('animation:complete', {
                entity: this.entity,
                animation: this.currentAnimation
            });
        }
        
        getCurrentAnimation() {
            return this.currentAnimation;
        }
        
        isPlaying() {
            return this.playing;
        }
        
        getCurrentFrame() {
            const animation = this.animations.get(this.currentAnimation);
            if (!animation) return null;
            return animation.frames[this.currentFrame];
        }
        
        getAvailableAnimations() {
            return Array.from(this.animations.keys());
        }
    }
    
    window.AnimationComponent = AnimationComponent;
}

/**
 * Health Component - Health management
 */
if (typeof window !== 'undefined' && !window.HealthComponent) {
    class HealthComponent extends Component {
        constructor(config = {}) {
            super(config);
            this.maxHealth = config.maxHealth || 100;
            this.health = config.health || this.maxHealth;
            this.invulnerable = false;
            this.invulnerabilityTime = config.invulnerabilityTime || 1000;
            this.invulnerabilityTimer = 0;
            
            this.onDamage = config.onDamage;
            this.onHeal = config.onHeal;
            this.onDeath = config.onDeath;
        }
        
        takeDamage(amount) {
            if (this.invulnerable || this.health <= 0) return;
            
            this.health = Math.max(0, this.health - amount);
            this.invulnerable = true;
            this.invulnerabilityTimer = this.invulnerabilityTime;
            
            if (this.onDamage) {
                this.onDamage(amount);
            }
            
            if (this.health <= 0 && this.onDeath) {
                this.onDeath();
            }
            
            this.game.events.emit('entity:damage', {
                entity: this.entity,
                amount,
                health: this.health
            });
        }
        
        heal(amount) {
            const oldHealth = this.health;
            this.health = Math.min(this.maxHealth, this.health + amount);
            const healed = this.health - oldHealth;
            
            if (healed > 0 && this.onHeal) {
                this.onHeal(healed);
            }
            
            this.game.events.emit('entity:heal', {
                entity: this.entity,
                amount: healed,
                health: this.health
            });
        }
        
        update(deltaTime) {
            if (this.invulnerable && this.invulnerabilityTimer > 0) {
                this.invulnerabilityTimer -= deltaTime * 1000;
                if (this.invulnerabilityTimer <= 0) {
                    this.invulnerable = false;
                }
            }
        }
        
        isDead() {
            return this.health <= 0;
        }
        
        getHealthPercent() {
            return this.health / this.maxHealth;
        }
    }
    
    window.HealthComponent = HealthComponent;
}

/**
 * Input Component - Player input handling
 */
if (typeof window !== 'undefined' && !window.InputComponent) {
    class InputComponent extends Component {
        constructor(config = {}) {
            super(config);
            this.inputEnabled = true;
        }
        
        isActionPressed(action) {
            const input = this.game.getSystem('input');
            return input && input.isActionPressed(action);
        }
        
        isActionJustPressed(action) {
            const input = this.game.getSystem('input');
            return input && input.isActionJustPressed(action);
        }
        
        getMovementVector() {
            const input = this.game.getSystem('input');
            return input ? input.getMovementVector() : { x: 0, y: 0 };
        }
    }
    
    window.InputComponent = InputComponent;
}

/**
 * Weapon Component - Weapon management
 */
if (typeof window !== 'undefined' && !window.WeaponComponent) {
    class WeaponComponent extends Component {
        constructor(config = {}) {
            super(config);
            this.weapons = new Map();
            this.currentWeapon = null;
            this.cooldown = 0;
            
            // Add default weapon
            if (config.defaultWeapon) {
                this.addWeapon('default', config.defaultWeapon);
                this.currentWeapon = 'default';
            }
        }
        
        addWeapon(name, config) {
            this.weapons.set(name, {
                damage: config.damage || 10,
                fireRate: config.fireRate || 0.5,
                projectileSpeed: config.projectileSpeed || 10,
                projectileSize: config.projectileSize || { width: 8, height: 8 },
                spread: config.spread || 0,
                projectileCount: config.projectileCount || 1,
                onFire: config.onFire
            });
        }
        
        switchWeapon(name) {
            if (this.weapons.has(name)) {
                this.currentWeapon = name;
                this.cooldown = 0;
            }
        }
        
        fire(direction) {
            if (this.cooldown > 0 || !this.currentWeapon) return false;
            
            const weapon = this.weapons.get(this.currentWeapon);
            if (!weapon) return false;
            
            this.cooldown = 1 / weapon.fireRate;
            
            for (let i = 0; i < weapon.projectileCount; i++) {
                const spread = (Math.random() - 0.5) * weapon.spread;
                const angle = Math.atan2(direction.y, direction.x) + spread;
                
                const projectile = {
                    x: this.entity.x + this.entity.width / 2,
                    y: this.entity.y + this.entity.height / 2,
                    vx: Math.cos(angle) * weapon.projectileSpeed,
                    vy: Math.sin(angle) * weapon.projectileSpeed,
                    damage: weapon.damage,
                    size: weapon.projectileSize,
                    owner: this.entity
                };
                
                this.game.events.emit('projectile:created', projectile);
                
                if (weapon.onFire) {
                    weapon.onFire(projectile);
                }
            }
            
            return true;
        }
        
        update(deltaTime) {
            if (this.cooldown > 0) {
                this.cooldown -= deltaTime;
            }
        }
    }
    
    window.WeaponComponent = WeaponComponent;
}

/**
 * AI Component - Basic AI behaviors
 */
if (typeof window !== 'undefined' && !window.AIComponent) {
    class AIComponent extends Component {
        constructor(config = {}) {
            super(config);
            this.behavior = config.behavior || 'idle';
            this.target = null;
            this.detectionRange = config.detectionRange || 200;
            this.attackRange = config.attackRange || 100;
            this.moveSpeed = config.moveSpeed || 2;
            this.state = 'idle';
            this.stateTimer = 0;
        }
        
        update(deltaTime) {
            if (!this.target) {
                this.findTarget();
            }
            
            switch (this.behavior) {
                case 'patrol':
                    this.updatePatrol(deltaTime);
                    break;
                case 'aggressive':
                    this.updateAggressive(deltaTime);
                    break;
                case 'defensive':
                    this.updateDefensive(deltaTime);
                    break;
                default:
                    this.updateIdle(deltaTime);
            }
        }
        
        findTarget() {
            const players = this.game.getEntitiesByType('player');
            let nearestPlayer = null;
            let nearestDistance = this.detectionRange;
            
            players.forEach(player => {
                const distance = this.entity.position.distanceTo(player.position);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestPlayer = player;
                }
            });
            
            this.target = nearestPlayer;
        }
        
        updateIdle(deltaTime) {
            // Do nothing
        }
        
        updatePatrol(deltaTime) {
            this.stateTimer += deltaTime;
            
            const physics = this.entity.getComponent(PhysicsComponent);
            if (!physics) return;
            
            if (this.stateTimer > 2) {
                this.moveSpeed *= -1;
                this.stateTimer = 0;
            }
            
            physics.velocity.x = this.moveSpeed;
            
            if (this.target) {
                const distance = this.entity.position.distanceTo(this.target.position);
                if (distance < this.attackRange) {
                    this.attack();
                }
            }
        }
        
        updateAggressive(deltaTime) {
            if (!this.target) return;
            
            const physics = this.entity.getComponent(PhysicsComponent);
            if (!physics) return;
            
            const direction = this.target.position.subtract(this.entity.position).normalize();
            physics.velocity.x = direction.x * this.moveSpeed;
            
            const distance = this.entity.position.distanceTo(this.target.position);
            if (distance < this.attackRange) {
                this.attack();
            }
        }
        
        updateDefensive(deltaTime) {
            if (!this.target) return;
            
            const distance = this.entity.position.distanceTo(this.target.position);
            
            if (distance < this.attackRange) {
                this.attack();
                
                const physics = this.entity.getComponent(PhysicsComponent);
                if (physics) {
                    const direction = this.entity.position.subtract(this.target.position).normalize();
                    physics.velocity.x = direction.x * this.moveSpeed;
                }
            }
        }
        
        attack() {
            const weapon = this.entity.getComponent(WeaponComponent);
            if (weapon && this.target) {
                const direction = this.target.position.subtract(this.entity.position).normalize();
                weapon.fire(direction);
            }
        }
    }
    
    window.AIComponent = AIComponent;
}

/**
 * State Machine Component
 */
if (typeof window !== 'undefined' && !window.StateMachineComponent) {
    class StateMachineComponent extends Component {
        constructor(config = {}) {
            super(config);
            this.states = new Map();
            this.currentState = null;
            this.previousState = null;
            
            if (config.states) {
                Object.entries(config.states).forEach(([name, state]) => {
                    this.addState(name, state);
                });
            }
            
            if (config.initialState) {
                this.changeState(config.initialState);
            }
        }
        
        addState(name, state) {
            state.name = name;
            state.component = this;
            this.states.set(name, state);
        }
        
        changeState(name) {
            const newState = this.states.get(name);
            if (!newState) return;
            
            if (this.currentState && this.currentState.exit) {
                this.currentState.exit();
            }
            
            this.previousState = this.currentState;
            this.currentState = newState;
            
            if (this.currentState.enter) {
                this.currentState.enter();
            }
            
            this.game.events.emit('state:changed', {
                entity: this.entity,
                from: this.previousState?.name,
                to: name
            });
        }
        
        update(deltaTime) {
            if (this.currentState && this.currentState.update) {
                this.currentState.update(deltaTime);
            }
        }
        
        getCurrentState() {
            return this.currentState?.name;
        }
    }
    
    window.StateMachineComponent = StateMachineComponent;
}

/**
 * Collider Component - Static collider
 */
if (typeof window !== 'undefined' && !window.ColliderComponent) {
    class ColliderComponent extends Component {
        constructor(config = {}) {
            super(config);
            this.static = config.static !== false;
            this.bounds = {
                offset: new Vector2(config.offsetX || 0, config.offsetY || 0),
                size: new Vector2(config.width || 32, config.height || 32)
            };
        }
        
        getBounds() {
            return {
                x: this.entity.x + this.bounds.offset.x,
                y: this.entity.y + this.bounds.offset.y,
                width: this.bounds.size.x,
                height: this.bounds.size.y
            };
        }
    }
    
    window.ColliderComponent = ColliderComponent;
}