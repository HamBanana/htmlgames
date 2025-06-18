// framework-utils.js - Utility classes and helpers

/**
 * Object Pool - For performance optimization
 */
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.available = [];
        this.active = new Set();
        
        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this.available.push(this.createFn());
        }
    }
    
    get() {
        let obj;
        if (this.available.length > 0) {
            obj = this.available.pop();
        } else {
            obj = this.createFn();
        }
        
        this.active.add(obj);
        return obj;
    }
    
    release(obj) {
        if (this.active.has(obj)) {
            this.active.delete(obj);
            this.resetFn(obj);
            this.available.push(obj);
        }
    }
    
    releaseAll() {
        this.active.forEach(obj => {
            this.resetFn(obj);
            this.available.push(obj);
        });
        this.active.clear();
    }
    
    getActiveCount() {
        return this.active.size;
    }
    
    getAvailableCount() {
        return this.available.length;
    }
}

/**
 * Spatial Hash - For efficient collision detection
 */
class SpatialHash {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.buckets = new Map();
    }
    
    clear() {
        this.buckets.clear();
    }
    
    getHash(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }
    
    insert(entity) {
        const bounds = this.getEntityBounds(entity);
        const hashes = this.getHashesForBounds(bounds);
        
        hashes.forEach(hash => {
            if (!this.buckets.has(hash)) {
                this.buckets.set(hash, new Set());
            }
            this.buckets.get(hash).add(entity);
        });
    }
    
    remove(entity) {
        this.buckets.forEach(bucket => {
            bucket.delete(entity);
        });
    }
    
    update(entity) {
        this.remove(entity);
        this.insert(entity);
    }
    
    getNearby(entity) {
        const bounds = this.getEntityBounds(entity);
        const hashes = this.getHashesForBounds(bounds);
        const nearby = new Set();
        
        hashes.forEach(hash => {
            const bucket = this.buckets.get(hash);
            if (bucket) {
                bucket.forEach(other => {
                    if (other !== entity) {
                        nearby.add(other);
                    }
                });
            }
        });
        
        return Array.from(nearby);
    }
    
    getEntityBounds(entity) {
        return {
            x: entity.x,
            y: entity.y,
            width: entity.width || 32,
            height: entity.height || 32
        };
    }
    
    getHashesForBounds(bounds) {
        const hashes = new Set();
        
        const startX = Math.floor(bounds.x / this.cellSize);
        const endX = Math.floor((bounds.x + bounds.width) / this.cellSize);
        const startY = Math.floor(bounds.y / this.cellSize);
        const endY = Math.floor((bounds.y + bounds.height) / this.cellSize);
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                hashes.add(`${x},${y}`);
            }
        }
        
        return hashes;
    }
}

/**
 * Timer - For delayed actions
 */
class Timer {
    constructor(duration, callback, loop = false) {
        this.duration = duration;
        this.callback = callback;
        this.loop = loop;
        this.elapsed = 0;
        this.active = true;
        this.paused = false;
    }
    
    update(deltaTime) {
        if (!this.active || this.paused) return;
        
        this.elapsed += deltaTime;
        
        if (this.elapsed >= this.duration) {
            this.callback();
            
            if (this.loop) {
                this.elapsed = 0;
            } else {
                this.active = false;
            }
        }
    }
    
    pause() {
        this.paused = true;
    }
    
    resume() {
        this.paused = false;
    }
    
    stop() {
        this.active = false;
    }
    
    reset() {
        this.elapsed = 0;
        this.active = true;
    }
    
    getProgress() {
        return Math.min(this.elapsed / this.duration, 1);
    }
}

/**
 * Timer Manager - Manages multiple timers
 */
class TimerManager {
    constructor() {
        this.timers = new Set();
    }
    
    addTimer(duration, callback, loop = false) {
        const timer = new Timer(duration, callback, loop);
        this.timers.add(timer);
        return timer;
    }
    
    removeTimer(timer) {
        this.timers.delete(timer);
    }
    
    update(deltaTime) {
        const toRemove = [];
        
        this.timers.forEach(timer => {
            timer.update(deltaTime);
            if (!timer.active) {
                toRemove.push(timer);
            }
        });
        
        toRemove.forEach(timer => this.timers.delete(timer));
    }
    
    clear() {
        this.timers.clear();
    }
}

/**
 * Tween - For smooth animations
 */
class Tween {
    constructor(target, properties, duration, options = {}) {
        this.target = target;
        this.properties = properties;
        this.duration = duration;
        this.elapsed = 0;
        this.active = true;
        
        this.easing = options.easing || Tween.Easing.Linear;
        this.onComplete = options.onComplete;
        this.onUpdate = options.onUpdate;
        this.loop = options.loop || false;
        this.yoyo = options.yoyo || false;
        this.delay = options.delay || 0;
        
        // Store initial values
        this.startValues = {};
        this.endValues = {};
        
        Object.keys(properties).forEach(key => {
            this.startValues[key] = target[key];
            this.endValues[key] = properties[key];
        });
        
        this.direction = 1;
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        // Handle delay
        if (this.delay > 0) {
            this.delay -= deltaTime;
            return;
        }
        
        this.elapsed += deltaTime * this.direction;
        
        const progress = Math.max(0, Math.min(1, this.elapsed / this.duration));
        const easedProgress = this.easing(progress);
        
        // Update properties
        Object.keys(this.properties).forEach(key => {
            const start = this.startValues[key];
            const end = this.endValues[key];
            this.target[key] = start + (end - start) * easedProgress;
        });
        
        if (this.onUpdate) {
            this.onUpdate(progress);
        }
        
        // Check completion
        if (progress >= 1) {
            if (this.yoyo) {
                this.direction *= -1;
                this.elapsed = this.duration;
            } else if (this.loop) {
                this.elapsed = 0;
            } else {
                this.active = false;
                if (this.onComplete) {
                    this.onComplete();
                }
            }
        } else if (progress <= 0 && this.direction < 0) {
            this.direction = 1;
            this.elapsed = 0;
        }
    }
    
    stop() {
        this.active = false;
    }
    
    pause() {
        this.paused = true;
    }
    
    resume() {
        this.paused = false;
    }
}

// Easing functions
Tween.Easing = {
    Linear: t => t,
    QuadIn: t => t * t,
    QuadOut: t => t * (2 - t),
    QuadInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    CubicIn: t => t * t * t,
    CubicOut: t => (--t) * t * t + 1,
    CubicInOut: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    SineIn: t => 1 - Math.cos(t * Math.PI / 2),
    SineOut: t => Math.sin(t * Math.PI / 2),
    SineInOut: t => -(Math.cos(Math.PI * t) - 1) / 2,
    ElasticOut: t => Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1,
    BounceOut: t => {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    }
};

/**
 * Tween Manager
 */
class TweenManager {
    constructor() {
        this.tweens = new Set();
    }
    
    createTween(target, properties, duration, options) {
        const tween = new Tween(target, properties, duration, options);
        this.tweens.add(tween);
        return tween;
    }
    
    removeTween(tween) {
        this.tweens.delete(tween);
    }
    
    update(deltaTime) {
        const toRemove = [];
        
        this.tweens.forEach(tween => {
            tween.update(deltaTime);
            if (!tween.active) {
                toRemove.push(tween);
            }
        });
        
        toRemove.forEach(tween => this.tweens.delete(tween));
    }
    
    clear() {
        this.tweens.clear();
    }
}

/**
 * State Machine
 */
class StateMachine {
    constructor() {
        this.states = new Map();
        this.currentState = null;
        this.previousState = null;
        this.globalState = null;
    }
    
    addState(name, state) {
        state.name = name;
        state.stateMachine = this;
        this.states.set(name, state);
    }
    
    setGlobalState(state) {
        this.globalState = state;
        state.stateMachine = this;
    }
    
    changeState(name) {
        const newState = this.states.get(name);
        if (!newState) {
            console.warn(`State '${name}' not found`);
            return;
        }
        
        // Exit current state
        if (this.currentState && this.currentState.exit) {
            this.currentState.exit();
        }
        
        this.previousState = this.currentState;
        this.currentState = newState;
        
        // Enter new state
        if (this.currentState.enter) {
            this.currentState.enter();
        }
    }
    
    update(deltaTime) {
        // Update global state
        if (this.globalState && this.globalState.update) {
            this.globalState.update(deltaTime);
        }
        
        // Update current state
        if (this.currentState && this.currentState.update) {
            this.currentState.update(deltaTime);
        }
    }
    
    revertToPreviousState() {
        if (this.previousState) {
            this.changeState(this.previousState.name);
        }
    }
    
    isInState(name) {
        return this.currentState && this.currentState.name === name;
    }
}

/**
 * Base State class
 */
class State {
    constructor() {
        this.name = '';
        this.stateMachine = null;
    }
    
    enter() {}
    update(deltaTime) {}
    exit() {}
}

/**
 * Random utilities
 */
const Random = {
    // Random float between min and max
    range: (min, max) => Math.random() * (max - min) + min,
    
    // Random integer between min and max (inclusive)
    rangeInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    // Random element from array
    element: (array) => array[Math.floor(Math.random() * array.length)],
    
    // Random boolean with probability (0-1)
    chance: (probability = 0.5) => Math.random() < probability,
    
    // Weighted random selection
    weighted: (weights) => {
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * total;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) return i;
        }
        
        return weights.length - 1;
    },
    
    // Gaussian (normal) distribution
    gaussian: (mean = 0, stdDev = 1) => {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
};

/**
 * Math utilities
 */
const MathUtils = {
    // Clamp value between min and max
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    
    // Linear interpolation
    lerp: (start, end, t) => start + (end - start) * t,
    
    // Map value from one range to another
    map: (value, inMin, inMax, outMin, outMax) => {
        return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
    },
    
    // Smooth step
    smoothStep: (edge0, edge1, x) => {
        const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
    },
    
    // Distance between two points
    distance: (x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    // Angle between two points
    angle: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    
    // Normalize angle to [-PI, PI]
    normalizeAngle: (angle) => {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    },
    
    // Degrees to radians
    degToRad: (degrees) => degrees * Math.PI / 180,
    
    // Radians to degrees
    radToDeg: (radians) => radians * 180 / Math.PI
};

/**
 * Color utilities
 */
const ColorUtils = {
    // RGB to hex
    rgbToHex: (r, g, b) => {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },
    
    // Hex to RGB
    hexToRgb: (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },
    
    // Interpolate between colors
    lerpColor: (color1, color2, t) => {
        const c1 = ColorUtils.hexToRgb(color1);
        const c2 = ColorUtils.hexToRgb(color2);
        
        const r = Math.round(MathUtils.lerp(c1.r, c2.r, t));
        const g = Math.round(MathUtils.lerp(c1.g, c2.g, t));
        const b = Math.round(MathUtils.lerp(c1.b, c2.b, t));
        
        return ColorUtils.rgbToHex(r, g, b);
    },
    
    // HSL to RGB
    hslToRgb: (h, s, l) => {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h / 360 + 1/3);
            g = hue2rgb(p, q, h / 360);
            b = hue2rgb(p, q, h / 360 - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
};

/**
 * Grid utilities
 */
const GridUtils = {
    // Convert world position to grid position
    worldToGrid: (x, y, cellSize) => ({
        x: Math.floor(x / cellSize),
        y: Math.floor(y / cellSize)
    }),
    
    // Convert grid position to world position
    gridToWorld: (gridX, gridY, cellSize) => ({
        x: gridX * cellSize,
        y: gridY * cellSize
    }),
    
    // Get neighbors of a grid cell
    getNeighbors: (x, y, diagonal = false) => {
        const neighbors = [
            { x: x - 1, y: y },     // left
            { x: x + 1, y: y },     // right
            { x: x, y: y - 1 },     // up
            { x: x, y: y + 1 }      // down
        ];
        
        if (diagonal) {
            neighbors.push(
                { x: x - 1, y: y - 1 }, // top-left
                { x: x + 1, y: y - 1 }, // top-right
                { x: x - 1, y: y + 1 }, // bottom-left
                { x: x + 1, y: y + 1 }  // bottom-right
            );
        }
        
        return neighbors;
    }
};