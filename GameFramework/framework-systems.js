// Enhanced framework-systems.js - Updated RenderSystem with Aseprite support

/**
 * Aseprite Sprite Data Parser
 */
class AsepriteParser {
    static parse(jsonData) {
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        
        return {
            frames: this.parseFrames(data.frames),
            animations: this.parseAnimations(data.meta?.frameTags || []),
            image: this.parseImage(data.meta?.image),
            meta: data.meta
        };
    }
    
    static parseFrames(framesData) {
        const frames = new Map();
        
        if (Array.isArray(framesData)) {
            // Array format
            framesData.forEach((frame, index) => {
                frames.set(index.toString(), {
                    x: frame.frame.x,
                    y: frame.frame.y,
                    w: frame.frame.w,
                    h: frame.frame.h,
                    duration: frame.duration || 100,
                    sourceSize: frame.sourceSize,
                    spriteSourceSize: frame.spriteSourceSize
                });
            });
        } else {
            // Object format
            Object.entries(framesData).forEach(([name, frame]) => {
                frames.set(name, {
                    x: frame.frame.x,
                    y: frame.frame.y,
                    w: frame.frame.w,
                    h: frame.frame.h,
                    duration: frame.duration || 100,
                    sourceSize: frame.sourceSize,
                    spriteSourceSize: frame.spriteSourceSize
                });
            });
        }
        
        return frames;
    }
    
    static parseAnimations(frameTags) {
        const animations = new Map();
        
        frameTags.forEach(tag => {
            animations.set(tag.name, {
                from: tag.from,
                to: tag.to,
                direction: tag.direction || 'forward',
                repeat: tag.repeat !== undefined ? tag.repeat : -1 // -1 = infinite
            });
        });
        
        return animations;
    }
    
    static parseImage(imageData) {
        if (!imageData) return null;
        
        // If image data is embedded as base64
        if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
            return this.createImageFromBase64(imageData);
        }
        
        // If it's a filename, we'll need to load it separately
        return imageData;
    }
    
    static createImageFromBase64(base64Data) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = base64Data;
        });
    }
}

/**
 * Enhanced Render System with Aseprite Support
 */
class RenderSystem extends System {
    constructor(canvas, context, config = {}) {
        super(config);
        this.canvas = canvas;
        this.context = context;
        this.sprites = new Map(); // Image objects
        this.spriteData = new Map(); // Parsed sprite data
        this.backgroundColor = config.game?.backgroundColor || '#000000';
        this.baseSpritePath = config.sprites?.basePath || '../Sprites/Aseprite/';
    }
    
    clear() {
        this.context.fillStyle = this.backgroundColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Load Aseprite sprite from JSON file
     */
    async loadAseprite(name, filename) {
        try {
            const url = filename.startsWith('http') ? filename : this.baseSpritePath + filename;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to load sprite: ${response.statusText}`);
            }
            
            const jsonData = await response.json();
            const spriteData = AsepriteParser.parse(jsonData);
            
            // Load the image
            let image;
            if (spriteData.image instanceof Promise) {
                image = await spriteData.image;
            } else if (typeof spriteData.image === 'string') {
                // Load external image file
                image = await this.loadImageFromUrl(spriteData.image);
            } else {
                throw new Error('No valid image data found in sprite');
            }
            
            // Store sprite data and image
            this.sprites.set(name, image);
            this.spriteData.set(name, spriteData);
            
            console.log(`Loaded Aseprite sprite: ${name}`);
            return spriteData;
            
        } catch (error) {
            console.error(`Failed to load Aseprite sprite ${name}:`, error);
            throw error;
        }
    }
    
    /**
     * Load regular sprite image
     */
    async loadSprite(name, url) {
        const image = await this.loadImageFromUrl(url);
        this.sprites.set(name, image);
        return image;
    }
    
    async loadImageFromUrl(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    }
    
    /**
     * Get sprite data (frames, animations, etc.)
     */
    getSpriteData(name) {
        return this.spriteData.get(name);
    }
    
    /**
     * Get available animations for a sprite
     */
    getSpriteAnimations(name) {
        const data = this.spriteData.get(name);
        return data ? Array.from(data.animations.keys()) : [];
    }
    
    /**
     * Draw a specific frame from an Aseprite sprite
     */
    drawSpriteFrame(name, frameIndex, x, y, width, height) {
        const image = this.sprites.get(name);
        const data = this.spriteData.get(name);
        
        if (!image || !data) {
            console.warn(`Sprite ${name} not found`);
            return;
        }
        
        const frameKey = frameIndex.toString();
        const frame = data.frames.get(frameKey);
        
        if (!frame) {
            console.warn(`Frame ${frameIndex} not found for sprite ${name}`);
            return;
        }
        
        // Use provided dimensions or frame dimensions
        const drawWidth = width !== undefined ? width : frame.w;
        const drawHeight = height !== undefined ? height : frame.h;
        
        this.context.drawImage(
            image,
            frame.x, frame.y, frame.w, frame.h,  // Source
            x, y, drawWidth, drawHeight           // Destination
        );
    }
    
    /**
     * Draw a sprite (backwards compatibility)
     */
    drawSprite(name, x, y, width, height, frame = 0) {
        const image = this.sprites.get(name);
        if (!image) {
            console.warn(`Sprite ${name} not found`);
            return;
        }
        
        // Check if it's an Aseprite sprite
        const data = this.spriteData.get(name);
        if (data) {
            this.drawSpriteFrame(name, frame, x, y, width, height);
        } else {
            // Regular sprite
            this.context.drawImage(image, x, y, width || image.width, height || image.height);
        }
    }
    
    drawRect(x, y, width, height, color) {
        this.context.fillStyle = color;
        this.context.fillRect(x, y, width, height);
    }
    
    drawCircle(x, y, radius, color) {
        this.context.fillStyle = color;
        this.context.beginPath();
        this.context.arc(x, y, radius, 0, Math.PI * 2);
        this.context.fill();
    }
    
    drawText(text, x, y, options = {}) {
        this.context.fillStyle = options.color || '#ffffff';
        this.context.font = options.font || '16px Arial';
        this.context.textAlign = options.align || 'left';
        this.context.textBaseline = options.baseline || 'top';
        this.context.fillText(text, x, y);
    }
}

/**
 * Enhanced Sprite Component with Aseprite Support
 */
class SpriteComponent extends Component {
    constructor(spriteName, config = {}) {
        super(config);
        this.spriteName = spriteName;
        this.currentFrame = config.frame || 0;
        this.flipX = config.flipX || false;
        this.flipY = config.flipY || false;
        this.tint = config.tint || null;
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

/**
 * Enhanced Animation Component with Aseprite Support
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
        this.speed = config.speed || 1; // Animation speed multiplier
        this.onAnimationComplete = config.onAnimationComplete;
        
        // Auto-load animations from sprite data
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
        
        // Update sprite frame
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
        
        // Get current frame duration
        const frameDurationIndex = Math.min(this.currentFrame, animation.frameDurations.length - 1);
        const frameDuration = animation.frameDurations[frameDurationIndex];
        
        // Update frame time
        this.frameTime += deltaTime * 1000 * this.speed;
        
        // Check if should advance frame
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
            // Forward or ping-pong
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

/**
 * Sprite Manager - Helper class for managing sprite loading
 */
class SpriteManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.loadingPromises = new Map();
    }
    
    async loadSprites(spriteList) {
        const promises = spriteList.map(async (sprite) => {
            if (sprite.type === 'aseprite') {
                return this.renderer.loadAseprite(sprite.name, sprite.file);
            } else {
                return this.renderer.loadSprite(sprite.name, sprite.file);
            }
        });
        
        return Promise.all(promises);
    }
    
    async preloadSprite(name, file, type = 'aseprite') {
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }
        
        const promise = type === 'aseprite' 
            ? this.renderer.loadAseprite(name, file)
            : this.renderer.loadSprite(name, file);
            
        this.loadingPromises.set(name, promise);
        return promise;
    }
}

// Example usage for loading Aseprite sprites:

/*
// In your game initialization:
const game = new GameFramework({
    sprites: {
        basePath: '../Sprites/Aseprite/'
    }
});

await game.initialize('gameCanvas');
const renderer = game.getSystem('renderer');
const spriteManager = new SpriteManager(renderer);

// Load multiple sprites at once
await spriteManager.loadSprites([
    { name: 'player', file: 'player.json', type: 'aseprite' },
    { name: 'enemy', file: 'enemy.json', type: 'aseprite' },
    { name: 'background', file: 'bg.png', type: 'image' }
]);

// Create entity with animated sprite
class AnimatedPlayer extends BaseEntity {
    constructor(x, y) {
        super({ x, y, width: 32, height: 32, type: 'player' });
        
        // Add sprite component
        this.addComponent(new SpriteComponent('player'));
        
        // Add animation component (will auto-load animations from sprite)
        this.addComponent(new AnimationComponent({
            autoLoadAnimations: true,
            speed: 1.0,
            onAnimationComplete: (animName) => {
                console.log(`Animation ${animName} completed`);
            }
        }));
        
        this.moveSpeed = 100;
        this.facingRight = true;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        const animation = this.getComponent(AnimationComponent);
        const sprite = this.getComponent(SpriteComponent);
        const input = this.game.getSystem('input');
        
        let moving = false;
        
        // Handle movement
        if (input.isActionPressed('left')) {
            this.x -= this.moveSpeed * deltaTime;
            if (this.facingRight) {
                this.facingRight = false;
                sprite.flipX = true;
            }
            moving = true;
        }
        
        if (input.isActionPressed('right')) {
            this.x += this.moveSpeed * deltaTime;
            if (!this.facingRight) {
                this.facingRight = true;
                sprite.flipX = false;
            }
            moving = true;
        }
        
        if (input.isActionJustPressed('jump')) {
            animation.play('jump');
        } else if (moving) {
            animation.play('walk');
        } else if (animation.getCurrentAnimation() !== 'jump' || !animation.isPlaying()) {
            animation.play('idle');
        }
    }
}

// Advanced example with custom animation events
class EnemyWithAI extends BaseEntity {
    constructor(x, y) {
        super({ x, y, width: 32, height: 32, type: 'enemy' });
        
        this.addComponent(new SpriteComponent('enemy'));
        this.addComponent(new AnimationComponent({
            autoLoadAnimations: true,
            onAnimationComplete: (animName) => {
                if (animName === 'attack') {
                    this.onAttackComplete();
                }
            }
        }));
        
        this.state = 'idle';
        this.stateTimer = 0;
        this.attackCooldown = 0;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        const animation = this.getComponent(AnimationComponent);
        this.stateTimer += deltaTime;
        this.attackCooldown -= deltaTime;
        
        switch (this.state) {
            case 'idle':
                animation.play('idle');
                if (this.stateTimer > 2) {
                    this.state = 'patrol';
                    this.stateTimer = 0;
                }
                break;
                
            case 'patrol':
                animation.play('walk');
                if (this.stateTimer > 3) {
                    this.state = 'idle';
                    this.stateTimer = 0;
                }
                break;
                
            case 'attacking':
                if (!animation.isPlaying()) {
                    this.state = 'idle';
                    this.stateTimer = 0;
                }
                break;
        }
        
        // Check for player nearby and attack
        const players = this.game.getEntitiesByType('player');
        const nearbyPlayer = players.find(p => 
            Math.abs(p.x - this.x) < 50 && this.attackCooldown <= 0
        );
        
        if (nearbyPlayer && this.state !== 'attacking') {
            this.attack();
        }
    }
    
    attack() {
        this.state = 'attacking';
        this.attackCooldown = 2; // 2 second cooldown
        const animation = this.getComponent(AnimationComponent);
        animation.play('attack');
    }
    
    onAttackComplete() {
        // Damage nearby players
        const players = this.game.getEntitiesByType('player');
        players.forEach(player => {
            if (Math.abs(player.x - this.x) < 50) {
                const health = player.getComponent(HealthComponent);
                if (health) {
                    health.takeDamage(10);
                }
            }
        });
    }
}

// Usage in game scene
class GameScene extends Scene {
    async onLoad() {
        const renderer = this.game.getSystem('renderer');
        const spriteManager = new SpriteManager(renderer);
        
        // Load all game sprites
        await spriteManager.loadSprites([
            { name: 'player', file: 'player.json', type: 'aseprite' },
            { name: 'enemy', file: 'enemy.json', type: 'aseprite' },
            { name: 'coin', file: 'coin.json', type: 'aseprite' }
        ]);
        
        // Create entities
        const player = new AnimatedPlayer(100, 400);
        this.game.addEntity(player);
        
        const enemy = new EnemyWithAI(300, 400);
        this.game.addEntity(enemy);
        
        // Setup camera to follow player
        const camera = this.game.getSystem('camera');
        camera.follow(player);
    }
}
*/