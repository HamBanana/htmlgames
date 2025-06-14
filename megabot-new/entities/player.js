// player.js - Player entity class

class Player {
    constructor(config, weaponSystem, particleSystem) {
        this.config = config;
        this.weaponSystem = weaponSystem;
        this.particleSystem = particleSystem;
        
        // Position and size
        this.x = 100;
        this.y = 400;
        this.width = config.width;
        this.height = config.height;
        
        // Physics
        this.vx = 0;
        this.vy = 0;
        this.speed = config.speed;
        this.jumpPower = config.jumpPower;
        this.grounded = false;
        this.gravityScale = 1;
        
        // State
        this.facing = 1; // 1 = right, -1 = left
        this.health = config.health;
        this.maxHealth = config.maxHealth;
        this.invulnerable = 0;
        this.godMode = false;
        
        // Sliding
        this.sliding = false;
        this.slideTimer = 0;
        this.slideSpeed = config.slideSpeed;
        this.slideHeight = config.slideHeight;
        this.slideDuration = config.slideDuration;
        this.normalHeight = config.height;
        
        // Shooting
        this.shootCooldown = 0;
        this.charging = false;
        this.chargeTimer = 0;
        this.maxCharge = config.maxCharge;
        
        // Weapons
        this.currentWeapon = 'normal';
        this.weaponDamage = config.weapon.damage;
        
        // Power-ups
        this.shield = 0;
        this.speedBoost = 0;
        
        // Animation state
        this.currentAnimation = 'idle';
        this.animationTimer = 0;
    }
    
    update(deltaTime, input, platforms) {
        this.handleInput(input);
        this.updatePhysics(deltaTime);
        this.checkPlatformCollisions(platforms);
        this.updateTimers(deltaTime);
        this.updateAnimation();
    }
    
    handleInput(input) {
        const movement = input.getMovementVector();
        
        // Horizontal movement
        if (!this.sliding) {
            this.vx = movement.x * this.speed * (this.speedBoost > 0 ? 1.5 : 1);
            if (movement.x !== 0) {
                this.facing = movement.x > 0 ? 1 : -1;
            }
        }
        
        // Jumping
        if (input.wasActionJustPressed('jump') && this.grounded && !this.sliding) {
            this.vy = -this.jumpPower;
            this.grounded = false;
            this.particleSystem.createEffect('jump', this.x + this.width/2, this.y + this.height);
        }
        
        // Sliding
        if (input.isActionPressed('slide') && this.grounded && !this.sliding) {
            this.startSlide();
        }
        
        // Shooting
        if (input.isActionPressed('shoot')) {
            if (!this.charging) {
                this.charging = true;
            }
            if (this.chargeTimer < this.maxCharge) {
                this.chargeTimer++;
                if (this.chargeTimer === this.maxCharge) {
                    this.particleSystem.createEffect('charge', this.x + this.width/2, this.y + this.height/2);
                }
            }
        } else if (this.charging) {
            this.shoot();
            this.charging = false;
            this.chargeTimer = 0;
        }
    }
    
    updatePhysics(deltaTime) {
        // Apply gravity
        if (!this.grounded) {
            this.vy += this.config.game?.gravity || 0.5;
        }
        
        // Update position
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;
        
        // Apply friction if sliding
        if (this.sliding) {
            this.vx *= 0.95;
        }
    }
    
    checkPlatformCollisions(platforms) {
        this.grounded = false;
        
        platforms.forEach(platform => {
            if (this.x < platform.x + platform.w && 
                this.x + this.width > platform.x &&
                this.y < platform.y + platform.h && 
                this.y + this.height > platform.y) {
                
                // Top collision
                if (this.vy > 0 && this.y < platform.y) {
                    this.y = platform.y - this.height;
                    this.vy = 0;
                    this.grounded = true;
                }
                // Bottom collision
                else if (this.vy < 0 && this.y > platform.y) {
                    this.y = platform.y + platform.h;
                    this.vy = 0;
                }
                // Side collisions
                else if (this.vx > 0 && this.x < platform.x) {
                    this.x = platform.x - this.width;
                    this.vx = 0;
                } else if (this.vx < 0 && this.x > platform.x) {
                    this.x = platform.x + platform.w;
                    this.vx = 0;
                }
            }
        });
    }
    
    updateTimers(deltaTime) {
        // Shooting cooldown
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime * 60;
        }
        
        // Slide timer
        if (this.sliding) {
            this.slideTimer -= deltaTime * 60;
            if (this.slideTimer <= 0) {
                this.endSlide();
            }
        }
        
        // Invulnerability
        if (this.invulnerable > 0 && !this.godMode) {
            this.invulnerable -= deltaTime * 60;
        }
        
        // Power-up timers
        if (this.shield > 0) {
            this.shield -= deltaTime * 60;
        }
        if (this.speedBoost > 0) {
            this.speedBoost -= deltaTime * 60;
        }
    }
    
    startSlide() {
        this.sliding = true;
        this.slideTimer = this.slideDuration;
        this.height = this.slideHeight;
        this.vx = this.facing * this.slideSpeed;
        this.y += (this.normalHeight - this.slideHeight); // Adjust position
    }
    
    endSlide() {
        this.sliding = false;
        this.height = this.normalHeight;
        this.y -= (this.normalHeight - this.slideHeight); // Restore position
    }
    
    shoot() {
        if (this.shootCooldown > 0) return;
        
        const weapon = this.weaponSystem.createWeapon(
            this.currentWeapon,
            this.x + (this.facing > 0 ? this.width : 0),
            this.y + this.height/2,
            this.facing,
            this.chargeTimer,
            this.maxCharge
        );
        
        if (weapon) {
            this.shootCooldown = weapon.cooldown;
        }
    }
    
    takeDamage(amount) {
        if (this.invulnerable > 0 || this.godMode) return;
        
        if (this.shield > 0) {
            this.shield = 0;
            this.particleSystem.createEffect('shield', this.x + this.width/2, this.y + this.height/2);
            return;
        }
        
        this.health -= amount;
        this.invulnerable = this.config.invulnerabilityTime;
        this.particleSystem.createEffect('damage', this.x + this.width/2, this.y + this.height/2);
        
        if (this.health < 0) {
            this.health = 0;
        }
    }
    
    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }
    
    respawn() {
        this.health = this.maxHealth;
        this.x = 100;
        this.y = 400;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;
        this.invulnerable = this.config.respawnInvulnerability || 120;
        this.sliding = false;
        this.slideTimer = 0;
        this.chargeTimer = 0;
        this.charging = false;
        this.shootCooldown = 0;
    }
    
    collectPickup(pickup) {
        switch (pickup.type) {
            case 'health':
                this.heal(this.config.pickups?.health?.healAmount || 30);
                break;
            case 'shield':
                this.shield = this.config.pickups?.shield?.duration || 300;
                break;
            case 'speed':
                this.speedBoost = this.config.pickups?.speed?.duration || 600;
                break;
            default:
                // Check if it's a weapon pickup
                if (this.config.weapons && this.config.weapons[pickup.type]) {
                    this.currentWeapon = pickup.type;
                }
        }
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    
    isInvulnerable() {
        return this.invulnerable > 0 || this.godMode;
    }
    
    updateAnimation() {
        if (this.sliding) {
            this.currentAnimation = 'slide';
        } else if (!this.grounded) {
            this.currentAnimation = 'jump';
        } else if (Math.abs(this.vx) > 0.1) {
            this.currentAnimation = 'walk';
        } else {
            this.currentAnimation = 'idle';
        }
    }
}