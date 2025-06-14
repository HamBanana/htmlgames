// weapon-system.js - Weapon creation and projectile management

class WeaponSystem {
    constructor(config) {
        this.config = config;
        this.projectiles = [];
        this.maxProjectiles = config.game?.maxProjectiles || 50;
    }
    
    createWeapon(weaponType, x, y, direction, chargeTimer = 0, maxCharge = 60) {
        const weaponConfig = this.config.weapons[weaponType];
        if (!weaponConfig) {
            console.warn(`Unknown weapon type: ${weaponType}`);
            return null;
        }
        
        // Handle charged shots for normal weapon
        if (weaponType === 'normal' && chargeTimer > 0) {
            if (chargeTimer >= maxCharge) {
                return this.createChargedShot(x, y, direction);
            } else if (chargeTimer > 10) {
                return this.createMediumShot(x, y, direction);
            }
        }
        
        // Create projectiles based on weapon type
        switch (weaponType) {
            case 'normal':
                return this.createNormalShot(x, y, direction);
            case 'rapid':
                return this.createRapidFire(x, y, direction);
            case 'spread':
                return this.createSpreadShot(x, y, direction);
            case 'laser':
                return this.createLaser(x, y, direction);
            case 'wave':
                return this.createWaveBeam(x, y, direction);
            case 'bounce':
                return this.createBounceShot(x, y, direction);
            default:
                return this.createNormalShot(x, y, direction);
        }
    }
    
    createNormalShot(x, y, direction) {
        const config = this.config.weapons.normal;
        const projectile = {
            x: x,
            y: y - config.projectileSize.height / 2,
            width: config.projectileSize.width,
            height: config.projectileSize.height,
            vx: direction * config.speed,
            vy: 0,
            damage: config.damage,
            fromPlayer: true,
            type: 'normal'
        };
        
        this.projectiles.push(projectile);
        return { cooldown: config.cooldown };
    }
    
    createMediumShot(x, y, direction) {
        const config = this.config.weapons.normal;
        const projectile = {
            x: x,
            y: y - 4,
            width: 12,
            height: 8,
            vx: direction * config.speed * 1.2,
            vy: 0,
            damage: config.damage * 2,
            fromPlayer: true,
            charged: 'medium',
            type: 'charged'
        };
        
        this.projectiles.push(projectile);
        return { cooldown: config.cooldown };
    }
    
    createChargedShot(x, y, direction) {
        const config = this.config.weapons.normal;
        const projectile = {
            x: x,
            y: y - 8,
            width: 20,
            height: 16,
            vx: direction * config.speed * 1.5,
            vy: 0,
            damage: config.damage * config.chargedDamageMultiplier,
            fromPlayer: true,
            charged: 'full',
            piercing: true,
            type: 'charged'
        };
        
        this.projectiles.push(projectile);
        return { cooldown: config.cooldown };
    }
    
    createRapidFire(x, y, direction) {
        const config = this.config.weapons.rapid;
        
        // Create burst of projectiles
        for (let i = 0; i < config.burstCount; i++) {
            setTimeout(() => {
                const projectile = {
                    x: x,
                    y: y - config.projectileSize.height / 2,
                    width: config.projectileSize.width,
                    height: config.projectileSize.height,
                    vx: direction * config.speed,
                    vy: (Math.random() - 0.5) * 2,
                    damage: config.damage,
                    fromPlayer: true,
                    type: 'rapid'
                };
                this.projectiles.push(projectile);
            }, i * 50);
        }
        
        return { cooldown: config.cooldown };
    }
    
    createSpreadShot(x, y, direction) {
        const config = this.config.weapons.spread;
        
        for (let i = -2; i <= 2; i++) {
            const angle = (direction > 0 ? 0 : Math.PI) + (i * config.spreadAngle);
            const projectile = {
                x: x,
                y: y - config.projectileSize.height / 2,
                width: config.projectileSize.width,
                height: config.projectileSize.height,
                vx: Math.cos(angle) * config.speed,
                vy: Math.sin(angle) * config.speed,
                damage: config.damage,
                fromPlayer: true,
                type: 'spread'
            };
            this.projectiles.push(projectile);
        }
        
        return { cooldown: config.cooldown };
    }
    
    createLaser(x, y, direction) {
        const config = this.config.weapons.laser;
        const laser = {
            x: direction > 0 ? x : x - config.width,
            y: y - 1,
            width: config.width,
            height: config.projectileSize.height,
            vx: 0,
            vy: 0,
            damage: config.damage,
            fromPlayer: true,
            laser: true,
            lifetime: config.duration,
            type: 'laser'
        };
        
        this.projectiles.push(laser);
        return { cooldown: config.cooldown };
    }
    
    createWaveBeam(x, y, direction) {
        const config = this.config.weapons.wave;
        const wave = {
            x: x,
            y: y - config.projectileSize.height / 2,
            width: config.projectileSize.width,
            height: config.projectileSize.height,
            vx: direction * config.speed,
            vy: 0,
            damage: config.damage,
            fromPlayer: true,
            wave: true,
            wavePhase: 0,
            waveAmplitude: config.waveAmplitude,
            waveFrequency: config.waveFrequency,
            type: 'wave'
        };
        
        this.projectiles.push(wave);
        return { cooldown: config.cooldown };
    }
    
    createBounceShot(x, y, direction) {
        const config = this.config.weapons.bounce;
        const bounce = {
            x: x,
            y: y - config.projectileSize.height / 2,
            width: config.projectileSize.width,
            height: config.projectileSize.height,
            vx: direction * config.speed,
            vy: -5,
            damage: config.damage,
            fromPlayer: true,
            bounce: true,
            bounceCount: config.bounceCount,
            gravity: config.gravity,
            type: 'bounce'
        };
        
        this.projectiles.push(bounce);
        return { cooldown: config.cooldown };
    }
    
    createEnemyProjectile(x, y, targetX, targetY, damage = 10, speed = 1.5) {
        // MUCH SLOWER enemy projectiles (reduced from 2.5 to 1.5)
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const projectile = {
            x: x,
            y: y,
            width: 6,
            height: 6,
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed,
            damage: damage,
            fromPlayer: false,
            type: 'enemy'
        };
        
        this.projectiles.push(projectile);
        return projectile;
    }
    
    updateProjectiles(projectiles, platforms, deltaTime) {
        // Combine system projectiles with passed projectiles
        const allProjectiles = [...this.projectiles, ...projectiles];
        const activeProjectiles = [];
        
        for (const proj of allProjectiles) {
            let shouldRemove = false;
            
            // Update laser lifetime
            if (proj.laser) {
                proj.lifetime -= deltaTime * 60;
                if (proj.lifetime <= 0) {
                    shouldRemove = true;
                }
            } else {
                // Update position
                proj.x += proj.vx * deltaTime * 60;
                proj.y += proj.vy * deltaTime * 60;
                
                // Wave motion
                if (proj.wave) {
                    proj.wavePhase += proj.waveFrequency;
                    proj.y += Math.sin(proj.wavePhase) * proj.waveAmplitude;
                }
                
                // Bounce physics
                if (proj.bounce) {
                    proj.vy += proj.gravity;
                    
                    // Check platform collision for bouncing
                    for (const platform of platforms) {
                        if (this.checkCollision(proj, platform)) {
                            if (proj.bounceCount > 0) {
                                proj.vy = -Math.abs(proj.vy) * 0.8;
                                proj.y = platform.y - proj.height;
                                proj.bounceCount--;
                            } else {
                                shouldRemove = true;
                                break;
                            }
                        }
                    }
                }
                
                // Check bounds
                const bounds = this.config.game || { levelWidth: 3200, levelHeight: 600 };
                if (proj.x < -50 || proj.x > bounds.levelWidth + 50 || 
                    proj.y < -50 || proj.y > bounds.levelHeight + 50) {
                    shouldRemove = true;
                }
            }
            
            if (!shouldRemove) {
                activeProjectiles.push(proj);
            }
        }
        
        // Limit projectiles
        if (activeProjectiles.length > this.maxProjectiles) {
            activeProjectiles.splice(0, activeProjectiles.length - this.maxProjectiles);
        }
        
        // Update system projectiles
        this.projectiles = activeProjectiles.filter(p => 
            allProjectiles.indexOf(p) < this.projectiles.length
        );
        
        return activeProjectiles;
    }
    
    checkCollision(a, b) {
        return a.x < b.x + b.w &&
               a.x + a.width > b.x &&
               a.y < b.y + b.h &&
               a.y + a.height > b.y;
    }
    
    clearProjectiles() {
        this.projectiles = [];
    }
}