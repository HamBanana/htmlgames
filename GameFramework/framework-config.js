// framework-config.js - Framework configuration and asset paths
const FRAMEWORK_CONFIG = {
    // Asset path configuration (relative to server root)
    // All paths should start with '/' to ensure they're relative to server root
    paths: {
        // Base path for all framework assets
        base: '/GameAssets/',
        
        // Sprite assets - Aseprite JSON format with embedded base64 images
        sprites: '/GameAssets/Sprites/Aseprite/',
        
        // Audio assets
        audio: {
            base: '/GameAssets/Audio/',
            music: '/GameAssets/Audio/Music/',
            sfx: '/GameAssets/Audio/SFX/'
        },
        
        // Shader assets
        shaders: {
            base: '/GameAssets/Shaders/',
            vertex: '/GameAssets/Shaders/vertex/',
            fragment: '/GameAssets/Shaders/fragment/'
        },
        
        // Font assets
        fonts: '/GameAssets/Fonts/',
        
        // Data files (JSON, XML, etc.)
        data: {
            base: '/GameAssets/Data/',
            levels: '/GameAssets/Data/Levels/',
            configs: '/GameAssets/Data/Configs/',
            gamedata: '/GameAssets/Data/GameData/',
            saves: '/GameAssets/Data/Saves/'
        },
        
        // Texture atlases
        atlases: '/GameAssets/Atlases/',
        
        // Video assets
        videos: '/GameAssets/Videos/'
    },
    
    // Asset type configuration
    assetTypes: {
        sprites: {
            defaultFormat: 'aseprite',
            supportedFormats: ['json', 'png', 'jpg', 'webp'],
            defaultExtension: '.json',
            namingConvention: 'lowercase_underscore'
        },
        
        audio: {
            supportedFormats: ['ogg', 'mp3', 'wav', 'm4a'],
            defaultFormat: 'ogg',
            defaultVolumes: {
                music: 0.7,
                sfx: 0.8,
                voice: 0.9
            }
        }
    },
    
    // Asset loading behavior
    loading: {
        showProgress: true,
        retryAttempts: 3,
        retryDelay: 1000,
        maxConcurrentLoads: 6,
        validatePaths: true,
        enableCaching: true
    },
    
    // Aseprite sprite processing
    sprites: {
        defaultAnimation: {
            speed: 1.0,
            loop: true,
            autoPlay: false
        },
        rendering: {
            pixelPerfect: true,
            defaultScale: 1.0,
            maxScale: 8.0,
            smoothing: false
        }
    }
};

// framework-utils.js - Utility classes
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    
    copy() {
        return new Vector2(this.x, this.y);
    }
    
    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }
    
    subtract(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }
    
    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
    
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return this.divide(mag);
    }
    
    divide(scalar) {
        return new Vector2(this.x / scalar, this.y / scalar);
    }
    
    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

class EventEmitter {
    constructor() {
        this.events = new Map();
    }
    
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
        return this;
    }
    
    off(event, callback) {
        if (this.events.has(event)) {
            const callbacks = this.events.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
        return this;
    }
    
    emit(event, ...args) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                callback(...args);
            });
        }
        return this;
    }
}

class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.fps = 0;
        this.lastTime = 0;
        this.frameTime = 0;
        this.measurements = new Map();
    }
    
    startFrame() {
        this.frameStart = performance.now();
    }
    
    endFrame() {
        this.frameTime = performance.now() - this.frameStart;
        this.frameCount++;
        
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
            this.frameCount = 0;
            this.lastTime = now;
        }
    }
    
    measure(name, fn) {
        const start = performance.now();
        const result = fn();
        const time = performance.now() - start;
        this.measurements.set(name, time);
        return result;
    }
    
    getStats() {
        return {
            fps: this.fps,
            frameTime: this.frameTime,
            breakdown: Object.fromEntries(this.measurements)
        };
    }
}

// framework-systems.js - Core game systems
class System {
    constructor(config = {}) {
        this.config = config;
        this.game = null;
    }
    
    initialize() {}
    start() {}
    stop() {}
    update(deltaTime) {}
}

class TimeSystem extends System {
    constructor() {
        super();
        this.timeScale = 1;
        this.totalTime = 0;
        this.deltaTime = 0;
    }
    
    update(deltaTime) {
        this.deltaTime = deltaTime * this.timeScale;
        this.totalTime += this.deltaTime;
    }
    
    getTotalTime() {
        return this.totalTime;
    }
    
    getDeltaTime() {
        return this.deltaTime;
    }
    
    setTimeScale(scale) {
        this.timeScale = scale;
    }
}

class InputSystem extends System {
    constructor(config = {}) {
        super(config);
        this.keys = new Map();
        this.keysJustPressed = new Set();
        this.keysJustReleased = new Set();
        this.mouse = { x: 0, y: 0, buttons: new Map() };
        this.actionMappings = config.keyboard || {};
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
    }
    
    onKeyDown(event) {
        if (!this.keys.get(event.code)) {
            this.keysJustPressed.add(event.code);
        }
        this.keys.set(event.code, true);
    }
    
    onKeyUp(event) {
        this.keys.set(event.code, false);
        this.keysJustReleased.add(event.code);
    }
    
    onMouseMove(event) {
        const rect = this.game.canvas.getBoundingClientRect();
        this.mouse.x = event.clientX - rect.left;
        this.mouse.y = event.clientY - rect.top;
    }
    
    onMouseDown(event) {
        this.mouse.buttons.set(event.button, true);
    }
    
    onMouseUp(event) {
        this.mouse.buttons.set(event.button, false);
    }
    
    update(deltaTime) {
        this.keysJustPressed.clear();
        this.keysJustReleased.clear();
    }
    
    isKeyPressed(key) {
        return this.keys.get(key) || false;
    }
    
    isKeyJustPressed(key) {
        return this.keysJustPressed.has(key);
    }
    
    isActionPressed(action) {
        const keys = this.actionMappings[action];
        if (!keys) return false;
        return keys.some(key => this.isKeyPressed(key));
    }
    
    isActionJustPressed(action) {
        const keys = this.actionMappings[action];
        if (!keys) return false;
        return keys.some(key => this.isKeyJustPressed(key));
    }
    
    getMovementVector() {
        let x = 0;
        let y = 0;
        
        if (this.isActionPressed('left')) x -= 1;
        if (this.isActionPressed('right')) x += 1;
        if (this.isActionPressed('up')) y -= 1;
        if (this.isActionPressed('down')) y += 1;
        
        if (x !== 0 && y !== 0) {
            const length = Math.sqrt(x * x + y * y);
            x /= length;
            y /= length;
        }
        
        return { x, y };
    }
    
    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }
    
    isMouseButtonPressed(button) {
        return this.mouse.buttons.get(button) || false;
    }
}

class PhysicsSystem extends System {
    constructor(config = {}) {
        super(config);
        this.gravity = config.gravity || 0.5;
        this.friction = config.friction || 0.1;
    }
    
    update(deltaTime) {
        const entities = this.game.getEntitiesWithComponent(PhysicsComponent);
        
        entities.forEach(entity => {
            const physics = entity.getComponent(PhysicsComponent);
            
            // Apply gravity
            if (physics.useGravity) {
                physics.acceleration.y += this.gravity * physics.gravityScale;
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
            physics.velocity.x *= (1 - physics.drag);
            physics.velocity.y *= (1 - physics.drag);
            
            // Clamp velocity
            physics.velocity.x = Math.max(-physics.maxVelocity.x, 
                Math.min(physics.maxVelocity.x, physics.velocity.x));
            physics.velocity.y = Math.max(-physics.maxVelocity.y, 
                Math.min(physics.maxVelocity.y, physics.velocity.y));
            
            // Update position
            entity.x += physics.velocity.x * deltaTime;
            entity.y += physics.velocity.y * deltaTime;
            
            // Reset acceleration
            physics.acceleration.set(0, 0);
        });
    }
}

class AudioSystem extends System {
    constructor(config = {}) {
        super(config);
        this.sounds = new Map();
        this.music = null;
        this.masterVolume = config.masterVolume || 1.0;
        this.musicVolume = config.musicVolume || 0.7;
        this.soundVolume = config.soundVolume || 0.8;
    }
    
    async loadSound(name, url) {
        try {
            const audio = new Audio(url);
            audio.preload = 'auto';
            
            return new Promise((resolve, reject) => {
                audio.addEventListener('canplaythrough', () => {
                    this.sounds.set(name, audio);
                    resolve(audio);
                });
                audio.addEventListener('error', reject);
            });
        } catch (error) {
            console.error(`Failed to load sound ${name}:`, error);
            throw error;
        }
    }
    
    playSound(name, options = {}) {
        const sound = this.sounds.get(name);
        if (!sound) {
            console.warn(`Sound ${name} not found`);
            return;
        }
        
        const clone = sound.cloneNode();
        clone.volume = (options.volume || 1) * this.soundVolume * this.masterVolume;
        clone.play();
        return clone;
    }
    
    async playMusic(name, loop = true) {
        const music = this.sounds.get(name);
        if (!music) {
            console.warn(`Music ${name} not found`);
            return;
        }
        
        if (this.music) {
            this.music.pause();
        }
        
        this.music = music;
        this.music.loop = loop;
        this.music.volume = this.musicVolume * this.masterVolume;
        await this.music.play();
    }
    
    stopMusic() {
        if (this.music) {
            this.music.pause();
            this.music.currentTime = 0;
        }
    }
    
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
}

class RenderSystem extends System {
    constructor(canvas, context, config = {}) {
        super(config);
        this.canvas = canvas;
        this.context = context;
        this.sprites = new Map();
        this.spriteData = new Map();
        this.backgroundColor = config.game?.backgroundColor || '#000000';
    }
    
    clear() {
        this.context.fillStyle = this.backgroundColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    async loadAseprite(name, url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load sprite: ${response.statusText}`);
            }
            
            const jsonData = await response.json();
            const spriteData = this.parseAsepriteData(jsonData);
            
            // Load the image
            let image;
            if (spriteData.image) {
                image = await this.loadImageFromBase64(spriteData.image);
            } else {
                throw new Error('No valid image data found in sprite');
            }
            
            this.sprites.set(name, image);
            this.spriteData.set(name, spriteData);
            
            console.log(`Loaded Aseprite sprite: ${name}`);
            return spriteData;
            
        } catch (error) {
            console.error(`Failed to load Aseprite sprite ${name}:`, error);
            throw error;
        }
    }
    
    parseAsepriteData(jsonData) {
        const frames = new Map();
        const animations = new Map();
        
        // Parse frames
        if (jsonData.frames) {
            if (Array.isArray(jsonData.frames)) {
                jsonData.frames.forEach((frame, index) => {
                    frames.set(index.toString(), {
                        x: frame.frame.x,
                        y: frame.frame.y,
                        w: frame.frame.w,
                        h: frame.frame.h,
                        duration: frame.duration || 100
                    });
                });
            } else {
                Object.entries(jsonData.frames).forEach(([name, frame]) => {
                    frames.set(name, {
                        x: frame.frame.x,
                        y: frame.frame.y,
                        w: frame.frame.w,
                        h: frame.frame.h,
                        duration: frame.duration || 100
                    });
                });
            }
        }
        
        // Parse animations (frame tags)
        if (jsonData.meta?.frameTags) {
            jsonData.meta.frameTags.forEach(tag => {
                animations.set(tag.name, {
                    from: tag.from,
                    to: tag.to,
                    direction: tag.direction || 'forward',
                    repeat: tag.repeat !== undefined ? tag.repeat : -1
                });
            });
        }
        
        return {
            frames,
            animations,
            image: jsonData.meta?.image,
            meta: jsonData.meta
        };
    }
    
    async loadImageFromBase64(base64Data) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = base64Data;
        });
    }
    
    drawSprite(name, x, y, width, height, frame = 0) {
        const image = this.sprites.get(name);
        const data = this.spriteData.get(name);
        
        if (!image) {
            console.warn(`Sprite ${name} not found`);
            return;
        }
        
        if (data) {
            // Aseprite sprite with frames
            const frameKey = frame.toString();
            const frameData = data.frames.get(frameKey);
            
            if (frameData) {
                const drawWidth = width !== undefined ? width : frameData.w;
                const drawHeight = height !== undefined ? height : frameData.h;
                
                this.context.drawImage(
                    image,
                    frameData.x, frameData.y, frameData.w, frameData.h,
                    x, y, drawWidth, drawHeight
                );
            }
        } else {
            // Regular image
            this.context.drawImage(image, x, y, width || image.width, height || image.height);
        }
    }
    
    getSpriteData(name) {
        return this.spriteData.get(name);
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
        this.context.fillText(text, x, y);
    }
}

class CameraSystem extends System {
    constructor(config = {}) {
        super(config);
        this.position = new Vector2(0, 0);
        this.target = null;
        this.followSpeed = 0.1;
        this.bounds = null;
        this.shake = { intensity: 0, duration: 0, timer: 0 };
    }
    
    follow(entity) {
        this.target = entity;
    }
    
    setBounds(x, y, width, height) {
        this.bounds = { x, y, width, height };
    }
    
    shake(intensity, duration) {
        this.shake.intensity = intensity;
        this.shake.duration = duration;
        this.shake.timer = duration;
    }
    
    update(deltaTime) {
        // Follow target
        if (this.target) {
            const targetX = this.target.x - this.game.canvas.width / 2;
            const targetY = this.target.y - this.game.canvas.height / 2;
            
            this.position.x += (targetX - this.position.x) * this.followSpeed;
            this.position.y += (targetY - this.position.y) * this.followSpeed;
        }
        
        // Apply bounds
        if (this.bounds) {
            this.position.x = Math.max(this.bounds.x, 
                Math.min(this.bounds.width - this.game.canvas.width, this.position.x));
            this.position.y = Math.max(this.bounds.y, 
                Math.min(this.bounds.height - this.game.canvas.height, this.position.y));
        }
        
        // Update shake
        if (this.shake.timer > 0) {
            this.shake.timer -= deltaTime * 1000;
        }
    }
    
    applyTransform(context) {
        let offsetX = -this.position.x;
        let offsetY = -this.position.y;
        
        // Apply shake
        if (this.shake.timer > 0) {
            const progress = this.shake.timer / this.shake.duration;
            const shakeX = (Math.random() - 0.5) * this.shake.intensity * progress;
            const shakeY = (Math.random() - 0.5) * this.shake.intensity * progress;
            offsetX += shakeX;
            offsetY += shakeY;
        }
        
        context.translate(offsetX, offsetY);
    }
}

class ParticleSystem extends System {
    constructor(config = {}) {
        super(config);
        this.particles = [];
        this.effects = new Map();
    }
    
    registerEffect(name, config) {
        this.effects.set(name, config);
    }
    
    createEffect(name, x, y) {
        const effect = this.effects.get(name);
        if (!effect) return;
        
        for (let i = 0; i < effect.count; i++) {
            this.emit({
                position: { x, y },
                ...effect
            });
        }
    }
    
    emit(config) {
        const angle = Math.random() * (config.spread || Math.PI * 2);
        const speed = config.speed || 5;
        
        this.particles.push({
            x: config.position.x,
            y: config.position.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: config.lifetime || 60,
            maxLife: config.lifetime || 60,
            color: config.color || '#ffffff',
            size: config.size || 4,
            gravity: config.gravity || 0
        });
    }
    
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            particle.vy += particle.gravity * deltaTime;
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    render(context) {
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            context.save();
            context.globalAlpha = alpha;
            context.fillStyle = particle.color;
            context.beginPath();
            context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            context.fill();
            context.restore();
        });
    }
}

class CollisionSystem extends System {
    checkAABB(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
    
    update(deltaTime) {
        const collisionEntities = this.game.getEntitiesWithComponent(CollisionComponent);
        
        for (let i = 0; i < collisionEntities.length; i++) {
            for (let j = i + 1; j < collisionEntities.length; j++) {
                const entityA = collisionEntities[i];
                const entityB = collisionEntities[j];
                
                const collisionA = entityA.getComponent(CollisionComponent);
                const collisionB = entityB.getComponent(CollisionComponent);
                
                if (this.checkAABB(entityA, entityB)) {
                    this.game.events.emit('collision', {
                        entity: entityA,
                        other: entityB
                    });
                }
            }
        }
    }
}

// framework-components.js - Game components
class Component {
    constructor(config = {}) {
        this.entity = null;
        this.active = config.active !== false;
        this.visible = config.visible !== false;
    }
    
    get game() {
        return this.entity ? this.entity.game : null;
    }
    
    initialize() {}
    update(deltaTime) {}
    render(context) {}
    destroy() {}
}

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
    
    render(context) {
        const renderer = this.game?.getSystem('renderer');
        if (!renderer) return;
        
        context.save();
        
        if (this.opacity < 1) {
            context.globalAlpha = this.opacity;
        }
        
        if (this.flipX || this.flipY) {
            const scaleX = this.flipX ? -1 : 1;
            const scaleY = this.flipY ? -1 : 1;
            context.scale(scaleX, scaleY);
            
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
        this.autoLoadAnimations = config.autoLoadAnimations !== false;
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
        
        spriteData.animations.forEach((animData, name) => {
            const frames = [];
            const frameDurations = [];
            
            for (let i = animData.from; i <= animData.to; i++) {
                frames.push(i);
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
            direction: config.direction || 'forward'
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
    
    update(deltaTime) {
        if (!this.playing || !this.currentAnimation) return;
        
        const animation = this.animations.get(this.currentAnimation);
        if (!animation) return;
        
        const frameDurationIndex = Math.min(this.currentFrame, animation.frameDurations.length - 1);
        const frameDuration = animation.frameDurations[frameDurationIndex];
        
        this.frameTime += deltaTime * 1000 * this.speed;
        
        if (this.frameTime >= frameDuration) {
            this.frameTime = 0;
            this.currentFrame++;
            
            if (this.currentFrame >= animation.frames.length) {
                if (animation.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = animation.frames.length - 1;
                    this.playing = false;
                }
            }
            
            this.updateSpriteFrame();
        }
    }
    
    updateSpriteFrame() {
        const sprite = this.entity.getComponent(SpriteComponent);
        if (!sprite) return;
        
        const animation = this.animations.get(this.currentAnimation);
        if (!animation) return;
        
        const frameIndex = animation.frames[this.currentFrame];
        sprite.setFrame(frameIndex);
    }
    
    getCurrentAnimation() {
        return this.currentAnimation;
    }
    
    isPlaying() {
        return this.playing;
    }
}

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

// game-framework.js - Main framework class
class BaseEntity {
    constructor(config = {}) {
        this.id = config.id || null;
        this.type = config.type || 'entity';
        this.name = config.name || '';
        
        this.position = new Vector2(config.x || 0, config.y || 0);
        this.size = new Vector2(config.width || 32, config.height || 32);
        this.rotation = config.rotation || 0;
        this.scale = new Vector2(config.scaleX || 1, config.scaleY || 1);
        
        this.active = config.active !== false;
        this.visible = config.visible !== false;
        this.zIndex = config.zIndex || 0;
        
        this.components = new Map();
        this.game = null;
    }
    
    initialize() {
        this.components.forEach(component => {
            if (component.initialize) {
                component.initialize();
            }
        });
    }
    
    addComponent(component) {
        const componentType = component.constructor;
        this.components.set(componentType, component);
        component.entity = this;
        
        if (this.game && component.initialize) {
            component.initialize();
        }
        
        return this;
    }
    
    removeComponent(ComponentClass) {
        const component = this.components.get(ComponentClass);
        if (component) {
            if (component.destroy) {
                component.destroy();
            }
            this.components.delete(ComponentClass);
        }
        return this;
    }
    
    getComponent(ComponentClass) {
        return this.components.get(ComponentClass);
    }
    
    hasComponent(ComponentClass) {
        return this.components.has(ComponentClass);
    }
    
    update(deltaTime) {
        this.components.forEach(component => {
            if (component.active && component.update) {
                component.update(deltaTime);
            }
        });
    }
    
    render(context) {
        context.save();
        
        context.translate(this.position.x, this.position.y);
        context.rotate(this.rotation);
        context.scale(this.scale.x, this.scale.y);
        
        this.components.forEach(component => {
            if (component.visible && component.render) {
                component.render(context);
            }
        });
        
        context.restore();
    }
    
    destroy() {
        this.components.forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        this.components.clear();
        
        if (this.game) {
            this.game.removeEntity(this);
        }
    }
    
    get x() { return this.position.x; }
    set x(value) { this.position.x = value; }
    
    get y() { return this.position.y; }
    set y(value) { this.position.y = value; }
    
    get width() { return this.size.x; }
    set width(value) { this.size.x = value; }
    
    get height() { return this.size.y; }
    set height(value) { this.size.y = value; }
}

class Scene {
    constructor(name) {
        this.name = name;
        this.game = null;
        this.entities = [];
    }
    
    async onLoad() {}
    async onUnload() {}
    
    update(deltaTime) {}
    render(context) {}
    
    addEntity(entity) {
        if (!this.entities.includes(entity)) {
            this.entities.push(entity);
        }
    }
    
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
        }
    }
}

class AssetLoader {
    constructor(framework) {
        this.framework = framework;
        this.config = FRAMEWORK_CONFIG;
        this.loadedAssets = new Map();
        this.loadingPromises = new Map();
    }
    
    async initialize() {
        console.log('🔧 Framework Asset Loader initialized');
    }
    
    async loadSprite(assetId, filename) {
        const path = this.config.paths.sprites + filename;
        
        if (this.loadedAssets.has(assetId)) {
            return this.loadedAssets.get(assetId);
        }
        
        if (this.loadingPromises.has(assetId)) {
            return this.loadingPromises.get(assetId);
        }
        
        console.log(`📦 Loading sprite: ${assetId} from ${filename}`);
        
        const loadPromise = this.doLoadSprite(assetId, path);
        this.loadingPromises.set(assetId, loadPromise);
        
        try {
            const startTime = performance.now();
            const spriteData = await loadPromise;
            const loadTime = performance.now() - startTime;
            
            this.loadedAssets.set(assetId, spriteData);
            console.log(`  ✅ Loaded in ${loadTime.toFixed(2)}ms`);
            
            this.framework.events.emit('asset:loaded', {
                type: 'sprite',
                id: assetId,
                filename: filename,
                loadTime: loadTime
            });
            
            return spriteData;
        } catch (error) {
            console.error(`❌ Failed to load sprite ${assetId}:`, error);
            this.loadingPromises.delete(assetId);
            throw error;
        }
    }
    
    async doLoadSprite(assetId, path) {
        const renderer = this.framework.getSystem('renderer');
        if (!renderer) {
            throw new Error('Renderer system not available');
        }
        
        const spriteData = await renderer.loadAseprite(assetId, path);
        
        if (spriteData.animations.size > 0) {
            const animNames = Array.from(spriteData.animations.keys());
            console.log(`  📋 Animations: ${animNames.join(', ')}`);
        }
        
        return spriteData;
    }
    
    async loadAudio(assetId, filename, type = 'sfx') {
        const basePath = type === 'music' ? this.config.paths.audio.music : this.config.paths.audio.sfx;
        const path = basePath + filename;
        
        if (this.loadedAssets.has(assetId)) {
            return this.loadedAssets.get(assetId);
        }
        
        console.log(`🔊 Loading audio: ${assetId} from ${filename}`);
        
        try {
            const audio = this.framework.getSystem('audio');
            if (!audio) {
                throw new Error('Audio system not available');
            }
            
            const audioAsset = await audio.loadSound(assetId, path);
            this.loadedAssets.set(assetId, audioAsset);
            
            this.framework.events.emit('asset:loaded', {
                type: 'audio',
                id: assetId,
                filename: filename,
                audioType: type
            });
            
            return audioAsset;
        } catch (error) {
            console.error(`❌ Failed to load audio ${assetId}:`, error);
            throw error;
        }
    }
    
    getAsset(assetId) {
        return this.loadedAssets.get(assetId);
    }
    
    hasAsset(assetId) {
        return this.loadedAssets.has(assetId);
    }
}

class GameFramework {
    constructor(config = {}) {
        this.config = this.mergeWithDefaults(config);
        this.assetLoader = new AssetLoader(this);
        this.canvas = null;
        this.context = null;
        this.running = false;
        this.paused = false;
        
        this.systems = new Map();
        this.entities = new Map();
        this.scenes = new Map();
        this.currentScene = null;
        
        this.events = new EventEmitter();
        this.performanceMonitor = new PerformanceMonitor();
        
        this.initializeSystems();
    }
    
    mergeWithDefaults(config) {
        const defaults = {
            game: {
                width: 800,
                height: 600,
                fps: 60,
                backgroundColor: '#000000',
                debug: false
            },
            physics: {
                gravity: 0.5,
                friction: 0.1
            },
            rendering: {
                pixelated: true,
                antialias: false
            }
        };
        
        return this.deepMerge(defaults, config);
    }
    
    deepMerge(target, source) {
        const output = Object.assign({}, target);
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target))
                        Object.assign(output, { [key]: source[key] });
                    else
                        output[key] = this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }
    
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
    
    initializeSystems() {
        this.registerSystem('time', new TimeSystem());
        this.registerSystem('input', new InputSystem(this.config.input));
        this.registerSystem('physics', new PhysicsSystem(this.config.physics));
        this.registerSystem('audio', new AudioSystem(this.config.audio));
        this.registerSystem('particles', new ParticleSystem(this.config.particles));
        this.registerSystem('camera', new CameraSystem(this.config.game));
        this.registerSystem('collision', new CollisionSystem());
    }
    
    async initialize(canvasId = 'gameCanvas') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = canvasId;
            document.body.appendChild(this.canvas);
        }
        
        this.canvas.width = this.config.game.width;
        this.canvas.height = this.config.game.height;
        
        this.context = this.canvas.getContext('2d');
        this.context.imageSmoothingEnabled = !this.config.rendering.pixelated;
        
        this.registerSystem('renderer', new RenderSystem(this.canvas, this.context, this.config));
        
        await this.assetLoader.initialize();
        
        this.events.emit('game:initialized');
        
        return this;
    }
    
    registerSystem(name, system) {
        system.game = this;
        this.systems.set(name, system);
        
        if (system.initialize) {
            system.initialize();
        }
        
        this.events.emit('system:registered', { name, system });
    }
    
    getSystem(name) {
        return this.systems.get(name);
    }
    
    addEntity(entity) {
        if (!entity.id) {
            entity.id = this.generateEntityId();
        }
        
        this.entities.set(entity.id, entity);
        entity.game = this;
        
        if (entity.initialize) {
            entity.initialize();
        }
        
        if (this.currentScene) {
            this.currentScene.addEntity(entity);
        }
        
        this.events.emit('entity:added', entity);
        
        return entity;
    }
    
    removeEntity(entity) {
        const id = typeof entity === 'string' ? entity : entity.id;
        const removedEntity = this.entities.get(id);
        
        if (removedEntity) {
            if (removedEntity.destroy) {
                removedEntity.destroy();
            }
            
            this.entities.delete(id);
            
            if (this.currentScene) {
                this.currentScene.removeEntity(removedEntity);
            }
            
            this.events.emit('entity:removed', removedEntity);
        }
        
        return removedEntity;
    }
    
    getAllEntities() {
        return Array.from(this.entities.values());
    }
    
    getEntitiesByType(type) {
        return this.getAllEntities().filter(e => e.type === type);
    }
    
    getEntitiesWithComponent(ComponentClass) {
        return this.getAllEntities().filter(e => e.hasComponent(ComponentClass));
    }
    
    generateEntityId() {
        return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    registerScene(name, scene) {
        scene.game = this;
        scene.name = name;
        this.scenes.set(name, scene);
    }
    
    async loadScene(sceneName) {
        const scene = this.scenes.get(sceneName);
        if (!scene) {
            throw new Error(`Scene '${sceneName}' not found`);
        }
        
        if (this.currentScene) {
            await this.unloadCurrentScene();
        }
        
        this.currentScene = scene;
        
        if (scene.onLoad) {
            await scene.onLoad();
        }
        
        this.events.emit('scene:loaded', scene);
        
        return scene;
    }
    
    async unloadCurrentScene() {
        if (!this.currentScene) return;
        
        if (this.currentScene.onUnload) {
            await this.currentScene.onUnload();
        }
        
        const sceneEntities = this.currentScene.entities || [];
        sceneEntities.forEach(entity => this.removeEntity(entity));
        
        this.events.emit('scene:unloaded', this.currentScene);
        
        this.currentScene = null;
    }
    
    async loadSprite(assetId, filename) {
        return this.assetLoader.loadSprite(assetId, filename);
    }
    
    async loadAudio(assetId, filename, type = 'sfx') {
        return this.assetLoader.loadAudio(assetId, filename, type);
    }
    
    getAsset(assetId) {
        return this.assetLoader.getAsset(assetId);
    }
    
    hasAsset(assetId) {
        return this.assetLoader.hasAsset(assetId);
    }
    
    start() {
        if (this.running) return;
        
        this.running = true;
        this.lastTime = performance.now();
        
        this.systems.forEach(system => {
            if (system.start) system.start();
        });
        
        this.events.emit('game:start');
        
        this.gameLoop();
    }
    
    stop() {
        this.running = false;
        
        this.systems.forEach(system => {
            if (system.stop) system.stop();
        });
        
        this.events.emit('game:stop');
    }
    
    pause() {
        this.paused = true;
        this.events.emit('game:pause');
    }
    
    resume() {
        this.paused = false;
        this.events.emit('game:resume');
    }
    
    gameLoop(currentTime = performance.now()) {
        if (!this.running) return;
        
        requestAnimationFrame((time) => this.gameLoop(time));
        
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;
        
        if (this.paused) return;
        
        this.performanceMonitor.startFrame();
        
        this.performanceMonitor.measure('update', () => {
            this.update(deltaTime);
        });
        
        this.performanceMonitor.measure('render', () => {
            this.render();
        });
        
        this.performanceMonitor.endFrame();
        
        if (this.config.game.debug) {
            this.renderDebugInfo();
        }
    }
    
    update(deltaTime) {
        this.systems.forEach((system, name) => {
            if (system.update) {
                this.performanceMonitor.measure(`system:${name}`, () => {
                    system.update(deltaTime);
                });
            }
        });
        
        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update(deltaTime);
        }
        
        this.entities.forEach(entity => {
            if (entity.active && entity.update) {
                entity.update(deltaTime);
            }
        });
        
        this.events.emit('game:update', deltaTime);
    }
    
    render() {
        const renderer = this.getSystem('renderer');
        if (!renderer) return;
        
        renderer.clear();
        
        const camera = this.getSystem('camera');
        if (camera) {
            this.context.save();
            camera.applyTransform(this.context);
        }
        
        if (this.currentScene && this.currentScene.render) {
            this.currentScene.render(this.context);
        }
        
        const sortedEntities = this.getAllEntities()
            .filter(e => e.active && e.visible)
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        
        sortedEntities.forEach(entity => {
            if (entity.render) {
                entity.render(this.context);
            }
        });
        
        const particles = this.getSystem('particles');
        if (particles && particles.render) {
            particles.render(this.context);
        }
        
        if (camera) {
            this.context.restore();
        }
        
        this.events.emit('game:render');
    }
    
    renderDebugInfo() {
        const stats = this.performanceMonitor.getStats();
        
        this.context.save();
        this.context.fillStyle = '#00ff00';
        this.context.font = '12px monospace';
        this.context.fillText(`FPS: ${stats.fps}`, 10, 20);
        this.context.fillText(`Entities: ${this.entities.size}`, 10, 35);
        this.context.restore();
    }
}