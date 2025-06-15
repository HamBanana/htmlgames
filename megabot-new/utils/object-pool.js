// utils/object-pool.js - Generic object pooling system
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
}

// Enhanced Particle System with Pooling
class PooledParticleSystem extends ParticleSystem {
    constructor(config) {
        super(config);
        
        // Create particle pool
        this.particlePool = new ObjectPool(
            () => ({ x: 0, y: 0, vx: 0, vy: 0, size: 0, color: '', lifetime: 0 }),
            (p) => { p.lifetime = 0; } // Simple reset
        );
        
        this.activeParticles = [];
    }
    
    createParticle(x, y, config) {
        if (this.activeParticles.length >= this.maxParticles) {
            // Recycle oldest particle
            const oldest = this.activeParticles.shift();
            this.particlePool.release(oldest);
        }
        
        const particle = this.particlePool.get();
        
        // Initialize particle
        const sizeMin = config.sizeRange[0];
        const sizeMax = config.sizeRange[1];
        particle.size = Math.random() * (sizeMax - sizeMin) + sizeMin;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * config.speed;
        
        particle.x = x;
        particle.y = y;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        particle.color = config.color;
        particle.lifetime = config.lifetime;
        particle.maxLifetime = config.lifetime;
        particle.gravity = config.gravity || 0.3;
        particle.fadeOut = config.fadeOut !== false;
        
        this.activeParticles.push(particle);
    }
    
    update(deltaTime) {
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const particle = this.activeParticles[i];
            
            // Update particle
            particle.x += particle.vx * deltaTime * 60;
            particle.y += particle.vy * deltaTime * 60;
            particle.vy += particle.gravity * deltaTime * 60;
            particle.lifetime -= deltaTime * 60;
            
            // Remove dead particles
            if (particle.lifetime <= 0) {
                const removed = this.activeParticles.splice(i, 1)[0];
                this.particlePool.release(removed);
            }
        }
    }
    
    render(ctx) {
        this.activeParticles.forEach(particle => {
            ctx.save();
            
            if (particle.fadeOut) {
                ctx.globalAlpha = particle.lifetime / particle.maxLifetime;
            }
            
            ctx.fillStyle = particle.color;
            ctx.fillRect(
                particle.x - particle.size / 2,
                particle.y - particle.size / 2,
                particle.size,
                particle.size
            );
            
            ctx.restore();
        });
    }
    
    clear() {
        this.activeParticles.forEach(p => this.particlePool.release(p));
        this.activeParticles = [];
    }
}

// Enhanced Weapon System with Projectile Pooling
class PooledWeaponSystem extends WeaponSystem {
    constructor(config) {
        super(config);
        
        // Create projectile pools for each type
        this.projectilePools = new Map();
        
        // Define pool for each projectile type
        const projectileTypes = ['normal', 'charged', 'rapid', 'spread', 'laser', 'wave', 'bounce', 'enemy'];
        
        projectileTypes.forEach(type => {
            this.projectilePools.set(type, new ObjectPool(
                () => ({
                    x: 0, y: 0, width: 8, height: 8,
                    vx: 0, vy: 0, damage: 0,
                    fromPlayer: true, type: type,
                    active: false
                }),
                (proj) => {
                    proj.active = false;
                    proj.piercing = false;
                    proj.lifetime = 0;
                    proj.bounceCount = 0;
                }
            ));
        });
    }
    
    getProjectileFromPool(type) {
        const pool = this.projectilePools.get(type) || this.projectilePools.get('normal');
        const proj = pool.get();
        proj.active = true;
        return proj;
    }
    
    createNormalShot(x, y, direction) {
        const config = this.config.weapons.normal;
        const projectile = this.getProjectileFromPool('normal');
        
        // Configure projectile
        projectile.x = x;
        projectile.y = y - config.projectileSize.height / 2;
        projectile.width = config.projectileSize.width;
        projectile.height = config.projectileSize.height;
        projectile.vx = direction * config.speed;
        projectile.vy = 0;
        projectile.damage = config.damage;
        projectile.fromPlayer = true;
        
        this.projectiles.push(projectile);
        return { cooldown: config.cooldown };
    }
    
    updateProjectiles(projectiles, platforms, deltaTime) {
        const allProjectiles = [...this.projectiles, ...projectiles];
        const activeProjectiles = [];
        
        for (const proj of allProjectiles) {
            if (!proj.active) continue;
            
            let shouldRemove = false;
            
            // Update projectile (existing logic)
            // ... (keep existing update logic)
            
            if (shouldRemove) {
                proj.active = false;
                // Return to pool
                const pool = this.projectilePools.get(proj.type);
                if (pool) {
                    pool.release(proj);
                }
            } else {
                activeProjectiles.push(proj);
            }
        }
        
        this.projectiles = activeProjectiles.filter(p => p.active);
        return activeProjectiles;
    }
}

// Sprite Animation Cache
class SpriteAnimationCache {
    constructor(maxCacheSize = 100) {
        this.cache = new Map();
        this.maxSize = maxCacheSize;
        this.accessOrder = [];
    }
    
    getCacheKey(spriteId, animationName, frameIndex, flip, scale) {
        return `${spriteId}_${animationName}_${frameIndex}_${flip}_${scale}`;
    }
    
    get(key) {
        if (this.cache.has(key)) {
            // Update access order
            const index = this.accessOrder.indexOf(key);
            if (index > -1) {
                this.accessOrder.splice(index, 1);
            }
            this.accessOrder.push(key);
            return this.cache.get(key);
        }
        return null;
    }
    
    set(key, canvas) {
        // Check cache size
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            // Remove least recently used
            const lru = this.accessOrder.shift();
            this.cache.delete(lru);
        }
        
        this.cache.set(key, canvas);
        this.accessOrder.push(key);
    }
    
    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }
}

// Performance Monitor with FPS tracking
class EnhancedPerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.fps = 0;
        this.frameTime = 0;
        this.frames = [];
        this.maxFrames = 60;
    }
    
    startFrame() {
        this.frameStartTime = performance.now();
    }
    
    endFrame() {
        const frameTime = performance.now() - this.frameStartTime;
        this.frames.push(frameTime);
        
        if (this.frames.length > this.maxFrames) {
            this.frames.shift();
        }
        
        // Calculate average frame time
        const avgFrameTime = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
        this.frameTime = avgFrameTime;
        this.fps = Math.round(1000 / avgFrameTime);
    }
    
    startMeasure(name) {
        this.metrics.set(name, performance.now());
    }
    
    endMeasure(name) {
        const start = this.metrics.get(name);
        if (start) {
            const duration = performance.now() - start;
            this.metrics.delete(name);
            return duration;
        }
        return 0;
    }
    
    getStats() {
        return {
            fps: this.fps,
            frameTime: this.frameTime.toFixed(2),
            avgFrameTime: (this.frames.reduce((a, b) => a + b, 0) / this.frames.length).toFixed(2)
        };
    }
}