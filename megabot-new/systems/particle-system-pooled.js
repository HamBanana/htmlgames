class ParticleSystemPooled extends ParticleSystem {
    constructor(config) {
        super(config);
        
        // Create particle pool
        this.particlePool = new ObjectPool(
            () => ({
                x: 0, y: 0, vx: 0, vy: 0, 
                size: 0, color: '', lifetime: 0,
                active: false
            }),
            (p) => { 
                p.active = false;
                p.lifetime = 0;
            }
        );
        
        // Replace array with active particles tracking
        this.particles = [];
    }
    
    createParticle(x, y, config) {
        if (this.particles.length >= this.maxParticles) {
            // Recycle oldest particle
            const oldest = this.particles.shift();
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
        particle.active = true;
        
        this.particles.push(particle);
    }
    
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            if (!particle.active) continue;
            
            // Update particle
            particle.x += particle.vx * deltaTime * 60;
            particle.y += particle.vy * deltaTime * 60;
            particle.vy += particle.gravity * deltaTime * 60;
            particle.lifetime -= deltaTime * 60;
            
            // Remove dead particles
            if (particle.lifetime <= 0) {
                particle.active = false;
                const removed = this.particles.splice(i, 1)[0];
                this.particlePool.release(removed);
            }
        }
    }
}