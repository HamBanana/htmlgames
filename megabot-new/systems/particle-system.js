// particle-system.js - Particle effects management

class ParticleSystem {
    constructor(config) {
        this.config = config;
        this.particles = [];
        this.maxParticles = config.particleLimit || 200;
        this.effectConfigs = config;
    }
    
    createEffect(effectType, x, y, customConfig = {}) {
        const effectConfig = this.effectConfigs[effectType];
        if (!effectConfig) {
            console.warn(`Unknown particle effect: ${effectType}`);
            return;
        }
        
        const config = { ...effectConfig, ...customConfig };
        
        for (let i = 0; i < config.count; i++) {
            this.createParticle(x, y, config);
        }
    }
    
    createParticle(x, y, config) {
        if (this.particles.length >= this.maxParticles) {
            // Remove oldest particles if at limit
            this.particles.splice(0, config.count);
        }
        
        const sizeMin = config.sizeRange[0];
        const sizeMax = config.sizeRange[1];
        const size = Math.random() * (sizeMax - sizeMin) + sizeMin;
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * config.speed;
        
        const particle = {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: size,
            color: config.color,
            lifetime: config.lifetime,
            maxLifetime: config.lifetime,
            gravity: config.gravity || 0.3,
            fadeOut: config.fadeOut !== false
        };
        
        this.particles.push(particle);
    }
    
    createCustomParticles(x, y, count, color, speed = 8, lifetime = 25) {
        for (let i = 0; i < count; i++) {
            const particle = {
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * speed,
                vy: (Math.random() - 0.5) * speed,
                size: Math.random() * 4 + 2,
                color: color,
                lifetime: lifetime,
                maxLifetime: lifetime,
                gravity: 0.3,
                fadeOut: true
            };
            
            this.particles.push(particle);
        }
    }
    
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position
            particle.x += particle.vx * deltaTime * 60;
            particle.y += particle.vy * deltaTime * 60;
            
            // Apply gravity
            particle.vy += particle.gravity * deltaTime * 60;
            
            // Update lifetime
            particle.lifetime -= deltaTime * 60;
            
            // Remove dead particles
            if (particle.lifetime <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    render(ctx) {
        this.particles.forEach(particle => {
            ctx.save();
            
            // Calculate alpha based on lifetime
            if (particle.fadeOut) {
                ctx.globalAlpha = particle.lifetime / particle.maxLifetime;
            }
            
            // Draw particle
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
        this.particles = [];
    }
    
    getParticleCount() {
        return this.particles.length;
    }
    
    // Predefined effects
    explosion(x, y, size = 'medium') {
        const counts = { small: 20, medium: 30, large: 50 };
        const count = counts[size] || 30;
        
        this.createCustomParticles(x, y, count, '#ff0000', 12, 30);
        this.createCustomParticles(x, y, count / 2, '#ffff00', 8, 25);
        this.createCustomParticles(x, y, count / 3, '#ff6600', 10, 20);
    }
    
    sparkle(x, y, color = '#ffff00') {
        for (let i = 0; i < 10; i++) {
            const particle = {
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 3,
                size: Math.random() * 3 + 1,
                color: color,
                lifetime: 30 + Math.random() * 20,
                maxLifetime: 50,
                gravity: -0.1,
                fadeOut: true
            };
            
            this.particles.push(particle);
        }
    }
    
    trail(x, y, color, direction) {
        for (let i = 0; i < 3; i++) {
            const particle = {
                x: x,
                y: y + (Math.random() - 0.5) * 4,
                vx: -direction * (2 + Math.random() * 2),
                vy: (Math.random() - 0.5) * 1,
                size: Math.random() * 2 + 1,
                color: color,
                lifetime: 10 + Math.random() * 10,
                maxLifetime: 20,
                gravity: 0,
                fadeOut: true
            };
            
            this.particles.push(particle);
        }
    }
}