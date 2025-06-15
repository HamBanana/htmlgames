// GameFramework/framework-systems.js - Game systems (without redeclarations)

/**
 * Time System - Manages game time and time scaling
 */
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

/**
 * Input System - Handles keyboard and mouse input
 */
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

/**
 * Physics System - Handles physics simulation
 */
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

/**
 * Audio System - Handles sound and music playback
 */
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
                repeat: tag.repeat !== undefined ? tag.repeat : -1
            });
        });
        
        return animations;
    }
    
    static parseImage(imageData) {
        if (!imageData) return null;
        
        if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
            return this.createImageFromBase64(imageData);
        }
        
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
 * Render System - Handles all rendering operations
 */
class RenderSystem extends System {
    constructor(canvas, context, config = {}) {
        super(config);
        this.canvas = canvas;
        this.context = context;
        this.sprites = new Map();
        this.spriteData = new Map();
        this.backgroundColor = config.game?.backgroundColor || '#000000';
        this.baseSpritePath = config.sprites?.basePath || '../Sprites/Aseprite/';
    }
    
    clear() {
        this.context.fillStyle = this.backgroundColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    async loadAseprite(name, filename) {
        try {
            const url = filename.startsWith('http') ? filename : this.baseSpritePath + filename;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to load sprite: ${response.statusText}`);
            }
            
            const jsonData = await response.json();
            const spriteData = AsepriteParser.parse(jsonData);
            
            let image;
            if (spriteData.image instanceof Promise) {
                image = await spriteData.image;
            } else if (typeof spriteData.image === 'string') {
                image = await this.loadImageFromUrl(spriteData.image);
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
    
    getSpriteData(name) {
        return this.spriteData.get(name);
    }
    
    getSpriteAnimations(name) {
        const data = this.spriteData.get(name);
        return data ? Array.from(data.animations.keys()) : [];
    }
    
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
        
        const drawWidth = width !== undefined ? width : frame.w;
        const drawHeight = height !== undefined ? height : frame.h;
        
        this.context.drawImage(
            image,
            frame.x, frame.y, frame.w, frame.h,
            x, y, drawWidth, drawHeight
        );
    }
    
    drawSprite(name, x, y, width, height, frame = 0) {
        const image = this.sprites.get(name);
        if (!image) {
            console.warn(`Sprite ${name} not found`);
            return;
        }
        
        const data = this.spriteData.get(name);
        if (data) {
            this.drawSpriteFrame(name, frame, x, y, width, height);
        } else {
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
 * Camera System - Handles viewport and camera controls
 */
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
        if (this.target) {
            const targetX = this.target.x - this.game.canvas.width / 2;
            const targetY = this.target.y - this.game.canvas.height / 2;
            
            this.position.x += (targetX - this.position.x) * this.followSpeed;
            this.position.y += (targetY - this.position.y) * this.followSpeed;
        }
        
        if (this.bounds) {
            this.position.x = Math.max(this.bounds.x, 
                Math.min(this.bounds.width - this.game.canvas.width, this.position.x));
            this.position.y = Math.max(this.bounds.y, 
                Math.min(this.bounds.height - this.game.canvas.height, this.position.y));
        }
        
        if (this.shake.timer > 0) {
            this.shake.timer -= deltaTime * 1000;
        }
    }
    
    applyTransform(context) {
        let offsetX = -this.position.x;
        let offsetY = -this.position.y;
        
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

/**
 * Collision System - Handles collision detection
 */
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

// Register systems globally (only if not already defined)
if (typeof window !== 'undefined') {
    if (!window.TimeSystem) window.TimeSystem = TimeSystem;
    if (!window.InputSystem) window.InputSystem = InputSystem;
    if (!window.PhysicsSystem) window.PhysicsSystem = PhysicsSystem;
    if (!window.AudioSystem) window.AudioSystem = AudioSystem;
    if (!window.RenderSystem) window.RenderSystem = RenderSystem;
    if (!window.CameraSystem) window.CameraSystem = CameraSystem;
    if (!window.CollisionSystem) window.CollisionSystem = CollisionSystem;
    if (!window.AsepriteParser) window.AsepriteParser = AsepriteParser;
}