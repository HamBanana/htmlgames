// GameFramework/framework-systems.js - Game systems

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
        this.actionMappings = config.keyboard || {
            left: ['ArrowLeft', 'KeyA'],
            right: ['ArrowRight', 'KeyD'],
            up: ['ArrowUp', 'KeyW'],
            down: ['ArrowDown', 'KeyS'],
            jump: ['Space'],
            action: ['KeyE', 'Enter'],
            pause: ['Escape'],
            // Pong-specific controls
            p1up: ['KeyW'],
            p1down: ['KeyS'],
            p2up: ['ArrowUp'],
            p2down: ['ArrowDown']
        };
        
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

window.InputSystem = InputSystem;

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

window.AsepriteParser = AsepriteParser;

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

window.RenderSystem = RenderSystem;

/**
 * Particle System - For visual effects
 */
class ParticleSystem extends System {
    constructor(config = {}) {
        super(config);
        this.particles = [];
        this.effects = new Map();
        this.maxParticles = config.maxParticles || 1000;
        
        // Register default effects
        this.registerDefaultEffects();
    }
    
    registerDefaultEffects() {
        // Sparkle effect
        this.registerEffect('sparkle', {
            count: 10,
            lifetime: 0.5,
            speed: { min: 50, max: 150 },
            spread: Math.PI * 2,
            size: { min: 2, max: 6 },
            sizeDecay: 0.9,
            color: ['#ffffff', '#ffff00', '#00ffff'],
            gravity: -50,
            spin: { min: -5, max: 5 }
        });
        
        // Hit effect
        this.registerEffect('hit', {
            count: 12,
            lifetime: 0.3,
            speed: { min: 100, max: 200 },
            spread: Math.PI / 2,
            size: { min: 2, max: 4 },
            color: '#ffffff',
            gravity: 0,
            friction: 0.8
        });
        
        // Explosion effect
        this.registerEffect('explosion', {
            count: 50,
            lifetime: 0.5,
            speed: { min: 100, max: 400 },
            spread: Math.PI * 2,
            size: { min: 3, max: 12 },
            sizeDecay: 0.9,
            color: ['#ffff00', '#ff6600', '#ff0000'],
            gravity: 0,
            friction: 0.9
        });
    }
    
    registerEffect(name, config) {
        this.effects.set(name, config);
    }
    
    createEffect(name, x, y, options = {}) {
        const effect = this.effects.get(name);
        if (!effect) {
            console.warn(`Effect '${name}' not found`);
            return;
        }
        
        const config = { ...effect, ...options };
        this.burst(x, y, config);
    }
    
    burst(x, y, config) {
        const count = this.randomRange(config.count);
        
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) break;
            
            const particle = this.createParticle(x, y, config);
            this.particles.push(particle);
        }
    }
    
    createParticle(x, y, config) {
        const speed = this.randomRange(config.speed || 100);
        const size = this.randomRange(config.size || 4);
        const lifetime = this.randomRange(config.lifetime || 1);
        const color = this.randomFromArray(config.color || '#ffffff');
        const opacity = this.randomRange(config.opacity || 1);
        
        let angle = config.angle || 0;
        if (config.spread) {
            angle += (Math.random() - 0.5) * config.spread;
        }
        
        const particle = {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: size,
            originalSize: size,
            color: color,
            opacity: opacity,
            life: lifetime,
            maxLife: lifetime,
            rotation: 0,
            spin: this.randomRange(config.spin || 0),
            gravity: config.gravity || 0,
            friction: config.friction || 1,
            sizeDecay: config.sizeDecay || 1
        };
        
        return particle;
    }
    
    update(deltaTime) {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.life -= deltaTime;
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            // Apply physics
            particle.vy += particle.gravity * deltaTime;
            particle.vx *= particle.friction;
            particle.vy *= particle.friction;
            
            // Update position
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            
            // Update rotation
            particle.rotation += particle.spin * deltaTime;
            
            // Update size
            if (particle.sizeDecay !== 1) {
                particle.size *= particle.sizeDecay;
            }
        }
    }
    
    render(context) {
        this.particles.forEach(particle => {
            context.save();
            
            const lifePercent = particle.life / particle.maxLife;
            context.globalAlpha = particle.opacity * lifePercent;
            context.fillStyle = particle.color;
            
            if (particle.rotation !== 0) {
                context.translate(particle.x, particle.y);
                context.rotate(particle.rotation);
                context.beginPath();
                context.arc(0, 0, particle.size, 0, Math.PI * 2);
                context.fill();
            } else {
                context.beginPath();
                context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                context.fill();
            }
            
            context.restore();
        });
    }
    
    randomRange(value) {
        if (typeof value === 'object') {
            return value.min + Math.random() * (value.max - value.min);
        }
        return value;
    }
    
    randomFromArray(array) {
        if (Array.isArray(array)) {
            return array[Math.floor(Math.random() * array.length)];
        }
        return array;
    }
    
    clear() {
        this.particles = [];
    }
}

window.ParticleSystem = ParticleSystem;