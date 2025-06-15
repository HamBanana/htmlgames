// GameFramework/framework-components.js - Game components

/**
 * Sprite Component - Sprite rendering
 */
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

/**
 * Animation Component - Sprite animation
 */
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

/**
 * Physics Component - Velocity, forces, gravity
 */
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

/**
 * Collision Component - Collision detection
 */
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