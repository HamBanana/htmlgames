// framework-systems.js - Core system implementations

/**
 * Time System - Manages game time and delta time
 */
class TimeSystem extends System {
    constructor(config = {}) {
        super(config);
        this.deltaTime = 0;
        this.elapsedTime = 0;
        this.timeScale = 1;
        this.lastTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.fpsUpdateTime = 0;
    }
    
    start() {
        this.lastTime = performance.now();
        this.fpsUpdateTime = this.lastTime;
    }
    
    update() {
        const currentTime = performance.now();
        const rawDelta = (currentTime - this.lastTime) / 1000;
        
        this.deltaTime = Math.min(rawDelta * this.timeScale, 0.1); // Cap at 100ms
        this.elapsedTime += this.deltaTime;
        
        // Update FPS
        this.frameCount++;
        if (currentTime - this.fpsUpdateTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsUpdateTime = currentTime;
        }
        
        this.lastTime = currentTime;
    }
    
    getDeltaTime() {
        return this.deltaTime;
    }
    
    getElapsedTime() {
        return this.elapsedTime;
    }
    
    setTimeScale(scale) {
        this.timeScale = Math.max(0, scale);
    }
}

/**
 * Input System - Handles keyboard, mouse, touch, and gamepad input
 */
class InputSystem extends System {
    constructor(config = {}) {
        super(config);
        
        this.keys = new Map();
        this.previousKeys = new Map();
        this.mouse = {
            x: 0,
            y: 0,
            buttons: new Map(),
            previousButtons: new Map()
        };
        this.touches = new Map();
        this.gamepads = [];
        
        // Action mappings
        this.actions = new Map();
        this.setupDefaultActions(config.keyboard || {});
        
        this.setupEventListeners();
    }
    
    setupDefaultActions(keyboardConfig) {
        // Set up action mappings from config
        Object.entries(keyboardConfig).forEach(([action, keys]) => {
            this.registerAction(action, keys);
        });
    }
    
    registerAction(name, inputs) {
        if (!Array.isArray(inputs)) inputs = [inputs];
        this.actions.set(name, inputs);
    }
    
    setupEventListeners() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys.set(e.code, true);
            this.keys.set(e.key.toLowerCase(), true);
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys.set(e.code, false);
            this.keys.set(e.key.toLowerCase(), false);
        });
        
        // Mouse
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        
        window.addEventListener('mousedown', (e) => {
            this.mouse.buttons.set(e.button, true);
        });
        
        window.addEventListener('mouseup', (e) => {
            this.mouse.buttons.set(e.button, false);
        });
        
        // Touch
        window.addEventListener('touchstart', (e) => {
            Array.from(e.touches).forEach(touch => {
                this.touches.set(touch.identifier, {
                    x: touch.clientX,
                    y: touch.clientY,
                    startX: touch.clientX,
                    startY: touch.clientY
                });
            });
        });
        
        window.addEventListener('touchmove', (e) => {
            Array.from(e.touches).forEach(touch => {
                const t = this.touches.get(touch.identifier);
                if (t) {
                    t.x = touch.clientX;
                    t.y = touch.clientY;
                }
            });
        });
        
        window.addEventListener('touchend', (e) => {
            Array.from(e.changedTouches).forEach(touch => {
                this.touches.delete(touch.identifier);
            });
        });
        
        // Prevent context menu
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    update() {
        // Update previous states
        this.previousKeys = new Map(this.keys);
        this.mouse.previousButtons = new Map(this.mouse.buttons);
        
        // Update gamepad state
        this.updateGamepads();
    }
    
    updateGamepads() {
        this.gamepads = Array.from(navigator.getGamepads()).filter(gp => gp);
    }
    
    isKeyPressed(key) {
        return this.keys.get(key) || false;
    }
    
    isKeyJustPressed(key) {
        return this.keys.get(key) && !this.previousKeys.get(key);
    }
    
    isKeyJustReleased(key) {
        return !this.keys.get(key) && this.previousKeys.get(key);
    }
    
    isMouseButtonPressed(button) {
        return this.mouse.buttons.get(button) || false;
    }
    
    isMouseButtonJustPressed(button) {
        return this.mouse.buttons.get(button) && !this.mouse.previousButtons.get(button);
    }
    
    isActionPressed(action) {
        const inputs = this.actions.get(action);
        if (!inputs) return false;
        
        return inputs.some(input => {
            if (input.startsWith('gamepad:')) {
                return this.isGamepadButtonPressed(input.slice(8));
            }
            return this.isKeyPressed(input);
        });
    }
    
    isActionJustPressed(action) {
        const inputs = this.actions.get(action);
        if (!inputs) return false;
        
        return inputs.some(input => {
            if (input.startsWith('gamepad:')) {
                return this.isGamepadButtonJustPressed(input.slice(8));
            }
            return this.isKeyJustPressed(input);
        });
    }
    
    isGamepadButtonPressed(button) {
        if (!this.gamepads[0]) return false;
        const buttonIndex = this.getGamepadButtonIndex(button);
        return this.gamepads[0].buttons[buttonIndex]?.pressed || false;
    }
    
    isGamepadButtonJustPressed(button) {
        // Simplified - would need previous state tracking
        return this.isGamepadButtonPressed(button);
    }
    
    getGamepadButtonIndex(button) {
        const mapping = {
            'a': 0, 'b': 1, 'x': 2, 'y': 3,
            'lb': 4, 'rb': 5, 'lt': 6, 'rt': 7,
            'back': 8, 'start': 9,
            'ls': 10, 'rs': 11,
            'up': 12, 'down': 13, 'left': 14, 'right': 15
        };
        return mapping[button] || 0;
    }
    
    getAxis(axis) {
        if (!this.gamepads[0]) return 0;
        const axisIndex = axis === 'horizontal' ? 0 : 1;
        return this.gamepads[0].axes[axisIndex] || 0;
    }
    
    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }
    
    getMouseWorldPosition(camera) {
        if (!camera) return this.getMousePosition();
        return camera.screenToWorld(this.mouse.x, this.mouse.y);
    }
    
    getTouches() {
        return Array.from(this.touches.values());
    }
}

/**
 * Physics System - 2D physics with collision detection
 */
class PhysicsSystem extends System {
    constructor(config = {}) {
        super(config);
        this.gravity = config.gravity || 0.5;
        this.friction = config.friction || 0.1;
        this.airFriction = config.airFriction || 0.01;
    }
    
    update(deltaTime) {
        const physicsEntities = this.game.getEntitiesWithComponent(PhysicsComponent);
        
        physicsEntities.forEach(entity => {
            const physics = entity.getComponent(PhysicsComponent);
            if (!physics.active) return;
            
            // Apply forces
            this.applyForces(physics, deltaTime);
            
            // Update velocity
            this.updateVelocity(physics, deltaTime);
            
            // Update position
            this.updatePosition(entity, physics, deltaTime);
            
            // Check collisions
            this.checkCollisions(entity, physics);
        });
    }
    
    applyForces(physics, deltaTime) {
        // Apply gravity
        if (physics.useGravity && !physics.grounded) {
            physics.velocity.y += this.gravity * physics.gravityScale * deltaTime * 60;
        }
        
        // Apply custom forces
        physics.forces.forEach(force => {
            physics.velocity.x += force.x * deltaTime;
            physics.velocity.y += force.y * deltaTime;
        });
        
        // Clear forces
        physics.forces = [];
    }
    
    updateVelocity(physics, deltaTime) {
        // Apply friction
        if (physics.grounded) {
            physics.velocity.x *= Math.pow(1 - this.friction, deltaTime * 60);
        } else {
            physics.velocity.x *= Math.pow(1 - this.airFriction, deltaTime * 60);
        }
        
        // Clamp velocity
        const maxVel = physics.maxVelocity;
        physics.velocity.x = Math.max(-maxVel.x, Math.min(maxVel.x, physics.velocity.x));
        physics.velocity.y = Math.max(-maxVel.y, Math.min(maxVel.y, physics.velocity.y));
    }
    
    updatePosition(entity, physics, deltaTime) {
        entity.position.x += physics.velocity.x * deltaTime * 60;
        entity.position.y += physics.velocity.y * deltaTime * 60;
    }
    
    checkCollisions(entity, physics) {
        physics.grounded = false;
        
        // Get collision component
        const collision = entity.getComponent(CollisionComponent);
        if (!collision || !collision.active) return;
        
        // Check against static colliders
        const colliders = this.game.getEntitiesWithComponent(ColliderComponent);
        
        colliders.forEach(other => {
            if (other === entity) return;
            
            const otherCollider = other.getComponent(ColliderComponent);
            if (!otherCollider.active) return;
            
            if (this.checkAABB(entity, other)) {
                this.resolveCollision(entity, physics, other, otherCollider);
            }
        });
    }
    
    checkAABB(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
    
    resolveCollision(entity, physics, other, otherCollider) {
        // Simple AABB collision resolution
        const overlapX = Math.min(
            entity.x + entity.width - other.x,
            other.x + other.width - entity.x
        );
        const overlapY = Math.min(
            entity.y + entity.height - other.y,
            other.y + other.height - entity.y
        );
        
        if (overlapX < overlapY) {
            // Horizontal collision
            if (entity.x < other.x) {
                entity.x = other.x - entity.width;
                if (physics.velocity.x > 0) physics.velocity.x = 0;
            } else {
                entity.x = other.x + other.width;
                if (physics.velocity.x < 0) physics.velocity.x = 0;
            }
        } else {
            // Vertical collision
            if (entity.y < other.y) {
                entity.y = other.y - entity.height;
                if (physics.velocity.y > 0) {
                    physics.velocity.y = 0;
                    physics.grounded = true;
                }
            } else {
                entity.y = other.y + other.height;
                if (physics.velocity.y < 0) physics.velocity.y = 0;
            }
        }
        
        // Emit collision event
        this.game.events.emit('collision', { entity, other });
    }
}

/**
 * Render System - Handles all rendering
 */
class RenderSystem extends System {
    constructor(canvas, context, config = {}) {
        super(config);
        this.canvas = canvas;
        this.context = context;
        this.sprites = new Map();
        this.backgroundColor = config.game?.backgroundColor || '#000000';
    }
    
    clear() {
        this.context.fillStyle = this.backgroundColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    async loadSprite(name, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.sprites.set(name, img);
                resolve(img);
            };
            img.onerror = reject;
            img.src = url;
        });
    }
    
    drawSprite(name, x, y, width, height) {
        const sprite = this.sprites.get(name);
        if (!sprite) return;
        
        this.context.drawImage(sprite, x, y, width, height);
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
 * Audio System - Sound and music management
 */
class AudioSystem extends System {
    constructor(config = {}) {
        super(config);
        this.enabled = config.enabled !== false;
        this.masterVolume = config.masterVolume || 1;
        this.sounds = new Map();
        this.music = null;
        this.musicVolume = config.musicVolume || 0.5;
        this.soundVolume = config.soundVolume || 0.7;
        
        // Create audio context
        if (this.enabled && typeof window !== 'undefined') {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);
            this.masterGain.gain.value = this.masterVolume;
        }
    }
    
    async loadSound(name, url) {
        if (!this.enabled) return;
        
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.sounds.set(name, audioBuffer);
        } catch (error) {
            console.error(`Failed to load sound ${name}:`, error);
        }
    }
    
    playSound(name, options = {}) {
        if (!this.enabled || !this.sounds.has(name)) return;
        
        const buffer = this.sounds.get(name);
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = this.context.createGain();
        gainNode.gain.value = (options.volume || 1) * this.soundVolume;
        
        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        source.start(0);
        
        return source;
    }
    
    playMusic(name, loop = true) {
        if (!this.enabled || !this.sounds.has(name)) return;
        
        this.stopMusic();
        
        const buffer = this.sounds.get(name);
        this.music = this.context.createBufferSource();
        this.music.buffer = buffer;
        this.music.loop = loop;
        
        const gainNode = this.context.createGain();
        gainNode.gain.value = this.musicVolume;
        
        this.music.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        this.music.start(0);
    }
    
    stopMusic() {
        if (this.music) {
            this.music.stop();
            this.music = null;
        }
    }
    
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }
}

/**
 * Particle System
 */
class ParticleSystem extends System {
    constructor(config = {}) {
        super(config);
        this.particles = [];
        this.maxParticles = config.maxParticles || 500;
        this.effects = new Map();
    }
    
    registerEffect(name, config) {
        this.effects.set(name, config);
    }
    
    emit(options) {
        const {
            position,
            count = 10,
            speed = 5,
            lifetime = 60,
            color = '#ffffff',
            size = 4,
            gravity = 0.3,
            spread = Math.PI * 2
        } = options;
        
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) {
                this.particles.shift(); // Remove oldest
            }
            
            const angle = (Math.random() - 0.5) * spread;
            const velocity = speed * (0.5 + Math.random() * 0.5);
            
            this.particles.push({
                x: position.x,
                y: position.y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                size: size * (0.5 + Math.random() * 0.5),
                color,
                lifetime,
                maxLifetime: lifetime,
                gravity
            });
        }
    }
    
    createEffect(effectName, x, y) {
        const effect = this.effects.get(effectName);
        if (!effect) return;
        
        this.emit({
            position: { x, y },
            ...effect
        });
    }
    
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update physics
            particle.x += particle.vx * deltaTime * 60;
            particle.y += particle.vy * deltaTime * 60;
            particle.vy += particle.gravity * deltaTime * 60;
            
            // Update lifetime
            particle.lifetime -= deltaTime * 60;
            
            // Remove dead particles
            if (particle.lifetime <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    render(context) {
        this.particles.forEach(particle => {
            const alpha = particle.lifetime / particle.maxLifetime;
            
            context.save();
            context.globalAlpha = alpha;
            context.fillStyle = particle.color;
            context.fillRect(
                particle.x - particle.size / 2,
                particle.y - particle.size / 2,
                particle.size,
                particle.size
            );
            context.restore();
        });
    }
}

/**
 * Camera System
 */
class CameraSystem extends System {
    constructor(config = {}) {
        super(config);
        this.x = 0;
        this.y = 0;
        this.width = config.width || 800;
        this.height = config.height || 600;
        this.target = null;
        this.smoothing = config.smoothing || 0.1;
        this.bounds = null;
        this.shake = { x: 0, y: 0, intensity: 0, duration: 0 };
    }
    
    follow(target, offsetX = 0, offsetY = 0) {
        this.target = target;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }
    
    update(deltaTime) {
        if (this.target) {
            const targetX = this.target.x + this.target.width / 2 - this.width / 2 + this.offsetX;
            const targetY = this.target.y + this.target.height / 2 - this.height / 2 + this.offsetY;
            
            // Smooth camera movement
            this.x += (targetX - this.x) * this.smoothing;
            this.y += (targetY - this.y) * this.smoothing;
        }
        
        // Update shake
        if (this.shake.duration > 0) {
            this.shake.duration -= deltaTime * 60;
            this.shake.x = (Math.random() - 0.5) * this.shake.intensity;
            this.shake.y = (Math.random() - 0.5) * this.shake.intensity;
            
            if (this.shake.duration <= 0) {
                this.shake.x = 0;
                this.shake.y = 0;
            }
        }
        
        // Apply bounds
        if (this.bounds) {
            this.x = Math.max(this.bounds.x, Math.min(this.bounds.x + this.bounds.width - this.width, this.x));
            this.y = Math.max(this.bounds.y, Math.min(this.bounds.y + this.bounds.height - this.height, this.y));
        }
    }
    
    applyTransform(context) {
        context.translate(
            -Math.floor(this.x + this.shake.x),
            -Math.floor(this.y + this.shake.y)
        );
    }
    
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.x,
            y: screenY + this.y
        };
    }
    
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.x,
            y: worldY - this.y
        };
    }
    
    isInView(x, y, width, height) {
        return x + width > this.x &&
               x < this.x + this.width &&
               y + height > this.y &&
               y < this.y + this.height;
    }
    
    shake(intensity, duration) {
        this.shake.intensity = intensity;
        this.shake.duration = duration;
    }
    
    setBounds(x, y, width, height) {
        this.bounds = { x, y, width, height };
    }
}

/**
 * Collision System
 */
class CollisionSystem extends System {
    constructor(config = {}) {
        super(config);
        this.layers = new Map();
        this.collisionMatrix = new Map();
    }
    
    checkCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
    
    checkCircleCollision(a, b) {
        const dx = (a.x + a.radius) - (b.x + b.radius);
        const dy = (a.y + a.radius) - (b.y + b.radius);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < a.radius + b.radius;
    }
    
    pointInRect(point, rect) {
        return point.x >= rect.x &&
               point.x <= rect.x + rect.width &&
               point.y >= rect.y &&
               point.y <= rect.y + rect.height;
    }
    
    raycast(origin, direction, maxDistance, filter) {
        const entities = this.game.getAllEntities();
        let closestHit = null;
        let closestDistance = maxDistance;
        
        entities.forEach(entity => {
            if (filter && !filter(entity)) return;
            
            const hit = this.raycastAABB(origin, direction, entity);
            if (hit && hit.distance < closestDistance) {
                closestDistance = hit.distance;
                closestHit = { ...hit, entity };
            }
        });
        
        return closestHit;
    }
    
    raycastAABB(origin, direction, box) {
        const invDir = {
            x: 1 / direction.x,
            y: 1 / direction.y
        };
        
        const t1 = (box.x - origin.x) * invDir.x;
        const t2 = ((box.x + box.width) - origin.x) * invDir.x;
        const t3 = (box.y - origin.y) * invDir.y;
        const t4 = ((box.y + box.height) - origin.y) * invDir.y;
        
        const tMin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
        const tMax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
        
        if (tMax < 0 || tMin > tMax) return null;
        
        const t = tMin < 0 ? tMax : tMin;
        
        return {
            point: {
                x: origin.x + direction.x * t,
                y: origin.y + direction.y * t
            },
            distance: t,
            normal: this.calculateNormal(origin, direction, t, box)
        };
    }
    
    calculateNormal(origin, direction, t, box) {
        const hitPoint = {
            x: origin.x + direction.x * t,
            y: origin.y + direction.y * t
        };
        
        const epsilon = 0.0001;
        
        if (Math.abs(hitPoint.x - box.x) < epsilon) return { x: -1, y: 0 };
        if (Math.abs(hitPoint.x - (box.x + box.width)) < epsilon) return { x: 1, y: 0 };
        if (Math.abs(hitPoint.y - box.y) < epsilon) return { x: 0, y: -1 };
        if (Math.abs(hitPoint.y - (box.y + box.height)) < epsilon) return { x: 0, y: 1 };
        
        return { x: 0, y: 0 };
    }
}

/**
 * Performance Monitor
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.frameStart = 0;
        this.fps = 0;
        this.frameTime = 0;
        this.frames = [];
    }
    
    startFrame() {
        this.frameStart = performance.now();
    }
    
    endFrame() {
        const frameTime = performance.now() - this.frameStart;
        this.frames.push(frameTime);
        
        // Keep last 60 frames
        if (this.frames.length > 60) {
            this.frames.shift();
        }
        
        // Calculate average
        const avgFrameTime = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
        this.frameTime = avgFrameTime;
        this.fps = Math.round(1000 / avgFrameTime);
    }
    
    measure(name, fn) {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;
        this.metrics.set(name, duration);
        return result;
    }
    
    getStats() {
        const breakdown = {};
        this.metrics.forEach((time, name) => {
            breakdown[name] = time.toFixed(2);
        });
        
        return {
            fps: this.fps,
            frameTime: this.frameTime.toFixed(2),
            breakdown
        };
    }
}