// GameFramework/framework-effects.js - Visual effects and particle presets (clean, no redeclarations)

/**
 * Enhanced Particle System - Only define if not already defined
 */
if (typeof window !== 'undefined' && !window.ParticleSystem) {
    class ParticleSystem extends System {
        constructor(config = {}) {
            super(config);
            this.particles = [];
            this.emitters = new Map();
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
            
            // Blood effect
            this.registerEffect('blood', {
                count: 20,
                lifetime: 1,
                speed: { min: 100, max: 300 },
                spread: Math.PI,
                angle: -Math.PI / 2,
                size: { min: 2, max: 8 },
                color: ['#ff0000', '#cc0000', '#990000'],
                gravity: 500,
                bounce: 0.5,
                friction: 0.9
            });
            
            // Smoke effect
            this.registerEffect('smoke', {
                count: 15,
                lifetime: 2,
                speed: { min: 20, max: 50 },
                spread: Math.PI / 3,
                angle: -Math.PI / 2,
                size: { min: 10, max: 30 },
                sizeGrowth: 1.02,
                color: ['#666666', '#999999', '#cccccc'],
                opacity: { min: 0.3, max: 0.6 },
                opacityDecay: 0.98,
                gravity: -50
            });
            
            // Fire effect
            this.registerEffect('fire', {
                count: 30,
                lifetime: 0.8,
                speed: { min: 50, max: 150 },
                spread: Math.PI / 4,
                angle: -Math.PI / 2,
                size: { min: 5, max: 15 },
                sizeDecay: 0.95,
                color: ['#ff0000', '#ff6600', '#ffff00'],
                gravity: -200,
                turbulence: 50
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
            
            // Dust effect
            this.registerEffect('dust', {
                count: 8,
                lifetime: 0.6,
                speed: { min: 20, max: 60 },
                spread: Math.PI / 3,
                angle: -Math.PI / 2,
                size: { min: 4, max: 8 },
                color: ['#c8b88b', '#a0895c', '#7a6a4f'],
                opacity: 0.6,
                opacityDecay: 0.95,
                gravity: 50
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
            
            // Coin collect effect
            this.registerEffect('coin', {
                count: 20,
                lifetime: 0.8,
                speed: { min: 50, max: 200 },
                spread: Math.PI * 2,
                size: { min: 3, max: 6 },
                color: ['#ffff00', '#ffcc00', '#ff9900'],
                gravity: 200,
                spin: { min: -10, max: 10 },
                sparkle: true
            });
            
            // Magic effect
            this.registerEffect('magic', {
                count: 25,
                lifetime: 1.5,
                speed: { min: 30, max: 100 },
                spread: Math.PI * 2,
                size: { min: 2, max: 8 },
                color: ['#ff00ff', '#00ffff', '#ffff00', '#00ff00'],
                gravity: -100,
                orbit: true,
                orbitRadius: 30,
                sparkle: true
            });
            
            // Dash effect
            this.registerEffect('dash', {
                count: 15,
                lifetime: 0.4,
                speed: { min: 80, max: 120 },
                spread: Math.PI / 6,
                size: { min: 3, max: 7 },
                color: '#00aaff',
                gravity: 0,
                friction: 0.95,
                stretch: 2
            });
            
            // Jump effect
            this.registerEffect('jump', {
                count: 8,
                lifetime: 0.5,
                speed: { min: 30, max: 80 },
                spread: Math.PI / 4,
                angle: -Math.PI / 2,
                size: { min: 3, max: 6 },
                color: ['#ffffff', '#cccccc'],
                gravity: 200,
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
            
            if (config.continuous) {
                return this.createEmitter(name, x, y, config);
            } else {
                this.burst(x, y, config);
            }
        }
        
        createEmitter(name, x, y, config) {
            const emitter = {
                name,
                x,
                y,
                config,
                active: true,
                timer: 0
            };
            
            const id = `${name}_${Date.now()}`;
            this.emitters.set(id, emitter);
            
            return {
                stop: () => {
                    emitter.active = false;
                },
                destroy: () => {
                    this.emitters.delete(id);
                },
                setPosition: (newX, newY) => {
                    emitter.x = newX;
                    emitter.y = newY;
                }
            };
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
            
            let px = x;
            let py = y;
            if (config.area) {
                px += (Math.random() - 0.5) * config.area.width;
                py += (Math.random() - 0.5) * config.area.height;
            }
            
            const particle = {
                x: px,
                y: py,
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
                bounce: config.bounce || 0,
                sizeDecay: config.sizeDecay || 1,
                sizeGrowth: config.sizeGrowth || 1,
                opacityDecay: config.opacityDecay || 1,
                sparkle: config.sparkle || false,
                stretch: config.stretch || 0,
                turbulence: config.turbulence || 0,
                orbit: config.orbit || false,
                orbitRadius: config.orbitRadius || 0,
                orbitAngle: Math.random() * Math.PI * 2,
                sway: config.sway || false,
                swayAmount: config.swayAmount || 0,
                swaySpeed: config.swaySpeed || 1,
                swayOffset: Math.random() * Math.PI * 2
            };
            
            return particle;
        }
        
        update(deltaTime) {
            // Update emitters
            this.emitters.forEach((emitter, id) => {
                if (!emitter.active) return;
                
                emitter.timer += deltaTime;
                
                const particlesPerFrame = emitter.config.rate * deltaTime;
                const particlesToCreate = Math.floor(emitter.timer * emitter.config.rate);
                
                if (particlesToCreate > 0) {
                    for (let i = 0; i < particlesToCreate; i++) {
                        if (this.particles.length < this.maxParticles) {
                            const particle = this.createParticle(emitter.x, emitter.y, emitter.config);
                            this.particles.push(particle);
                        }
                    }
                    emitter.timer = 0;
                }
            });
            
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
                
                // Apply turbulence
                if (particle.turbulence) {
                    particle.vx += (Math.random() - 0.5) * particle.turbulence * deltaTime;
                    particle.vy += (Math.random() - 0.5) * particle.turbulence * deltaTime;
                }
                
                // Update position
                particle.x += particle.vx * deltaTime;
                particle.y += particle.vy * deltaTime;
                
                // Update rotation
                particle.rotation += particle.spin * deltaTime;
                
                // Update size
                if (particle.sizeDecay !== 1) {
                    particle.size *= particle.sizeDecay;
                }
                if (particle.sizeGrowth !== 1) {
                    particle.size *= particle.sizeGrowth;
                }
                
                // Update opacity
                if (particle.opacityDecay !== 1) {
                    particle.opacity *= particle.opacityDecay;
                }
                
                // Bounce
                if (particle.bounce && particle.y > this.game.canvas.height - 10) {
                    particle.y = this.game.canvas.height - 10;
                    particle.vy *= -particle.bounce;
                }
            }
        }
        
        render(context) {
            this.particles.forEach(particle => {
                context.save();
                
                const lifePercent = particle.life / particle.maxLife;
                
                context.globalAlpha = particle.opacity;
                
                if (particle.sparkle && Math.random() < 0.1) {
                    context.globalAlpha *= 0.3;
                }
                
                context.fillStyle = particle.color;
                
                if (particle.rotation !== 0 || particle.stretch > 0) {
                    context.translate(particle.x, particle.y);
                    
                    if (particle.stretch > 0) {
                        const angle = Math.atan2(particle.vy, particle.vx);
                        context.rotate(angle);
                        context.scale(particle.stretch, 1);
                    } else {
                        context.rotate(particle.rotation);
                    }
                    
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
            this.emitters.clear();
        }
    }
    
    window.ParticleSystem = ParticleSystem;
}

/**
 * Screen Effects
 */
if (typeof window !== 'undefined' && !window.ScreenEffects) {
    class ScreenEffects {
        constructor(game) {
            this.game = game;
            this.effects = [];
        }
        
        shake(intensity = 10, duration = 0.5) {
            const camera = this.game.getSystem('camera');
            if (camera) {
                camera.shake(intensity, duration);
            }
        }
        
        flash(color = '#ffffff', duration = 0.2) {
            this.effects.push({
                type: 'flash',
                color,
                duration,
                timer: 0
            });
        }
        
        fade(fadeIn = true, duration = 1, color = '#000000') {
            this.effects.push({
                type: 'fade',
                fadeIn,
                duration,
                timer: 0,
                color
            });
        }
        
        overlay(color, opacity = 0.5, duration = -1) {
            this.effects.push({
                type: 'overlay',
                color,
                opacity,
                duration,
                timer: 0
            });
        }
        
        vignette(intensity = 0.5, color = '#000000') {
            this.effects.push({
                type: 'vignette',
                intensity,
                color,
                permanent: true
            });
        }
        
        update(deltaTime) {
            for (let i = this.effects.length - 1; i >= 0; i--) {
                const effect = this.effects[i];
                
                if (!effect.permanent) {
                    effect.timer += deltaTime;
                    
                    if (effect.duration > 0 && effect.timer >= effect.duration) {
                        this.effects.splice(i, 1);
                    }
                }
            }
        }
        
        render(context) {
            this.effects.forEach(effect => {
                switch (effect.type) {
                    case 'flash':
                        this.renderFlash(context, effect);
                        break;
                    case 'fade':
                        this.renderFade(context, effect);
                        break;
                    case 'overlay':
                        this.renderOverlay(context, effect);
                        break;
                    case 'vignette':
                        this.renderVignette(context, effect);
                        break;
                }
            });
        }
        
        renderFlash(context, effect) {
            const progress = effect.timer / effect.duration;
            const opacity = 1 - progress;
            
            context.save();
            context.globalAlpha = opacity;
            context.fillStyle = effect.color;
            context.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
            context.restore();
        }
        
        renderFade(context, effect) {
            const progress = effect.timer / effect.duration;
            const opacity = effect.fadeIn ? (1 - progress) : progress;
            
            context.save();
            context.globalAlpha = opacity;
            context.fillStyle = effect.color;
            context.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
            context.restore();
        }
        
        renderOverlay(context, effect) {
            context.save();
            context.globalAlpha = effect.opacity;
            context.fillStyle = effect.color;
            context.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
            context.restore();
        }
        
        renderVignette(context, effect) {
            const centerX = this.game.canvas.width / 2;
            const centerY = this.game.canvas.height / 2;
            const radius = Math.max(centerX, centerY) * 1.5;
            
            const gradient = context.createRadialGradient(
                centerX, centerY, radius * (1 - effect.intensity),
                centerX, centerY, radius
            );
            
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(1, effect.color);
            
            context.fillStyle = gradient;
            context.fillRect(0, 0, this.game.canvas.width, this.game.canvas.height);
        }
    }
    
    window.ScreenEffects = ScreenEffects;
}

// Register effects globally in GameFramework namespace
if (typeof window !== 'undefined') {
    if (!window.GameFramework) window.GameFramework = {};
    if (!window.GameFramework.Effects) {
        window.GameFramework.Effects = {
            ParticleSystem: window.ParticleSystem,
            ScreenEffects: window.ScreenEffects
        };
    }
}